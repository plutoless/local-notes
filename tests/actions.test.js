import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ActionRepository, isOverdue} from '../web/actions.js';
import {storageFixture} from './action-adapter.js';

test('confirmed actions start empty despite reference checkboxes, and survive native index removal', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const original = await readFile(join(fixture.root, 'reference.md'), 'utf8');
    assert.deepEqual((await repo.query()).actions, []);
    const {record} = await repo.save({description: 'Ask the reviewer', sources: [{path: 'reference.md', quote: 'Run the sample command', fingerprint: 'fixture-v1'}]});
    assert.equal(record.status, 'todo'); assert.equal(isOverdue(record, '2099-01-01'), false);
    await fixture.removeIndex();
    const restarted = new ActionRepository(fixture.adapter); await restarted.open();
    assert.deepEqual((await restarted.query()).actions, [record]);
    assert.equal(await readFile(join(fixture.root, 'reference.md'), 'utf8'), original);
    assert.ok(!fixture.calls.some(call => call.cmd === 'list' || call.cmd === 'save'));
  } finally { await fixture.close(); }
});

test('every state can be reopened while complete immutable history and optional fields survive restart', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    let {record} = await repo.save({description: 'Confirm the plan', initiativeId: 'initiative-1', dueDate: '2026-01-01', waitingOn: 'A decision', sources: []});
    const id = record.entityId, revisions = [record];
    for (const status of ['in-progress', 'waiting', 'completed', 'todo', 'canceled', 'todo']) {
      ({record} = await repo.save({...record, status}, record)); revisions.push(record);
      assert.equal(record.entityId, id); assert.equal(record.parents[0], revisions.at(-2).revision);
      assert.equal((await repo.query({status})).actions[0].status, status);
    }
    assert.equal((await repo.history(id)).length, 7);
    const restarted = new ActionRepository(fixture.adapter); await restarted.open();
    assert.deepEqual((await restarted.query()).actions, [record]);
    for (const revision of revisions) assert.deepEqual(JSON.parse(await readFile(join(fixture.root, `LocalNotesData/revisions/${id}/${revision.revision}.json`), 'utf8')), revision);
    await assert.rejects(repo.save({...record, description: 'A stale edit'}, revisions[0]), /changed/);
  } finally { await fixture.close(); }
});

for (const stage of ['revision', 'current', 'index']) test(`interrupted ${stage} writes retain the edit and restart recovers only committed revisions`, async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const initial = (await repo.save({description: 'Original action'})).record;
    const matcher = stage === 'index' ? cmd => cmd === 'actionIndex' : (cmd, args) => cmd === 'actionWrite' && args.path.startsWith(stage === 'revision' ? 'revisions/' : 'actions/');
    fixture.fail(matcher, 2);
    let failure;
    try { await repo.save({...initial, status: 'waiting', waitingOn: 'Reviewer'}, initial); } catch (error) { failure = error; }
    assert.ok(failure); assert.equal(failure.revisionSaved, stage !== 'revision');
    assert.equal(failure.record.waitingOn, 'Reviewer');
    // Consume the second failed revision attempt so the restart can retry normally.
    if (stage === 'revision') await assert.rejects(repo.save({...initial, status: 'waiting'}, initial, failure.record));
    const restarted = new ActionRepository(fixture.adapter); await restarted.open();
    const restored = (await restarted.query()).actions[0];
    assert.equal(restored.status, stage === 'revision' ? 'todo' : 'waiting');
    if (stage !== 'revision') assert.equal(restored.revision, failure.record.revision);
    const retry = await restarted.save({...initial, status: 'waiting'}, initial, failure.record);
    assert.equal(retry.record.revision, failure.record.revision);
    assert.equal((await restarted.history(initial.entityId)).length, 2);
  } finally { await fixture.close(); }
});

test('transient current-record and index failures report recovered saves after repair', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('actions/'));
    const result = await repo.save({description: 'Recovered action'});
    assert.equal(result.recovered, true);
    fixture.fail(cmd => cmd === 'actionIndex');
    const updated = await repo.save({...result.record, status: 'completed'}, result.record);
    assert.equal(updated.recovered, true);
    assert.equal((await repo.query({status: 'completed'})).actions.length, 1);
    assert.deepEqual(fixture.calls.filter(call => call.cmd === 'actionWrite').slice(0, 2).map(call => call.path.split('/')[0]), ['revisions', 'actions']);
  } finally { await fixture.close(); }
});

test('queries paginate and workspace IDs reject writes from another root', async () => {
  const a = await storageFixture(), b = await storageFixture();
  try {
    const repo = new ActionRepository(a.adapter); await repo.open();
    for (let i = 0; i < 5; i++) await repo.save({description: `Action ${i}`});
    const first = await repo.query({limit: 2}), second = await repo.query({limit: 2, offset: 2}), third = await repo.query({limit: 2, offset: 4});
    assert.equal(first.actions.length, 2); assert.equal(first.hasMore, true); assert.equal(third.actions.length, 1); assert.equal(third.hasMore, false);
    assert.equal(new Set([...first.actions, ...second.actions, ...third.actions].map(record => record.entityId)).size, 5);
    const other = new ActionRepository(b.adapter); await other.open();
    assert.notEqual(repo.workspaceId, other.workspaceId); assert.deepEqual((await other.query()).actions, []);
    await assert.rejects(b.adapter('actionIndex', {workspaceId: repo.workspaceId, record: first.actions[0]}), /Workspace changed/);
  } finally { await a.close(); await b.close(); }
});

test('a missing live SQLite index is rebuilt before returning query results', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const {record} = await repo.save({description: 'Recover during this session'});
    await fixture.removeIndex();
    assert.deepEqual((await repo.query()).actions, [record]);
  } finally { await fixture.close(); }
});

test('editing after a recoverable commit extends the committed revision without branching or duplicating the action', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const original = (await repo.save({description: 'Before failure'})).record;
    fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('actions/'), 2);
    let committed;
    try { await repo.save({...original, description: 'Committed during failure'}, original); } catch (error) { assert.equal(error.revisionSaved, true); committed = error.record; }
    assert.ok(committed);
    const latest = (await repo.save({...committed, description: 'Edited after failure'}, committed)).record;
    assert.equal(latest.entityId, original.entityId); assert.deepEqual(latest.parents, [committed.revision]);
    const restarted = new ActionRepository(fixture.adapter); assert.deepEqual((await restarted.open()).warnings, []);
    assert.deepEqual((await restarted.query()).actions, [latest]); assert.equal((await restarted.history(latest.entityId)).length, 3);
  } finally { await fixture.close(); }
});
