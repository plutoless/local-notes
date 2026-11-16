import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ActionRepository} from '../web/actions.js';
import {TopicRepository} from '../web/library.js';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';

for (const Repository of [ActionRepository, InitiativeRepository, TopicRepository]) test(`${Repository.name}: forks, conflict copies, delayed parents, tombstones and rebuild`, async () => {
  const fixture = await storageFixture();
  try {
    const repo = new Repository(fixture.adapter); await repo.open();
    const base = (await repo.save({description: 'Original', title: 'Original', goal: '', progress: '', status: Repository === InitiativeRepository ? 'active' : 'todo'})).record;
    const first = (await repo.save({...base, description: 'First', title: 'First'}, base)).record;
    const fork = {...base, revision: randomUUID(), parents: [base.revision], description: 'Offline branch', status: repo.entityType === 'initiative' ? 'ended' : 'completed'};
    const directory = join(fixture.root, 'LocalNotesData', repo.collection);
    await writeFile(join(directory, `${base.entityId}.sync-conflict-20261116-device.json`), JSON.stringify(fork));
    await repo.recover();
    assert.equal(repo.conflicts.get(base.entityId).tips.length, 2);
    const visible = (await repo.query()).actions[0]; assert.equal(visible.syncState, 'conflict'); assert.ok(!['completed', 'ended'].includes(visible.status));
    await assert.rejects(repo.save({...first, description: 'Unsafe'}, first), /Resolve synchronization/);
    await fixture.removeIndex(); await repo.open(); assert.equal(repo.conflicts.get(base.entityId).tips.length, 2);
    const resolved = (await repo.resolve(base.entityId, {...first, description: 'Merged', title: 'Merged'})).record;
    assert.deepEqual(new Set(resolved.parents), new Set([first.revision, fork.revision]));
    await repo.recover(); assert.equal(repo.conflicts.size, 0);
    const deleted = (await repo.remove(resolved)).record; assert.equal(deleted.deleted, true);
    await writeFile(join(directory, `${base.entityId}.json`), JSON.stringify(base));
    await fixture.removeIndex(); await repo.open(); assert.equal((await repo.query()).actions.length, 0);
    const missing = randomUUID(), delayed = {...deleted, revision: randomUUID(), parents: [missing], deleted: false};
    await fixture.adapter('actionWrite', {workspaceId: repo.workspaceId, path: `revisions/${base.entityId}/${delayed.revision}.json`, text: JSON.stringify(delayed)});
    await repo.recover(); assert.equal(repo.conflicts.get(base.entityId).incomplete, true);
    await assert.rejects(repo.resolve(base.entityId, delayed), /Wait for complete/);
    const parent = {...deleted, revision: missing, parents: [deleted.revision]};
    await fixture.adapter('actionWrite', {workspaceId: repo.workspaceId, path: `revisions/${base.entityId}/${missing}.json`, text: JSON.stringify(parent)});
    await repo.recover(); assert.equal(repo.conflicts.size, 0); assert.equal((await repo.query()).actions[0].revision, delayed.revision);
    // Duplicate canonical arrivals and conflict copies never create extra entities.
    await repo.recover(); assert.equal((await repo.query()).actions.length, 1);
  } finally { await fixture.close(); }
});

test('reviewed heads cannot silently resolve a newly arrived branch; focused conflicts remain visible', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const base = (await repo.save({description: 'Focused', focusPosition: 1})).record;
    const first = (await repo.save({...base, description: 'Local'}, base)).record;
    const add = async description => {
      const record = {...base, revision: randomUUID(), parents: [base.revision], description};
      await fixture.adapter('actionWrite', {workspaceId: repo.workspaceId, path: `revisions/${base.entityId}/${record.revision}.json`, text: JSON.stringify(record)}); return record;
    };
    await add('Remote'); await repo.recover();
    assert.equal((await repo.query({focus: true})).actions[0].syncState, 'conflict');
    const reviewed = repo.conflicts.get(base.entityId).tips.map(r => r.revision);
    await add('Unseen'); await assert.rejects(repo.resolve(base.entityId, first, reviewed), /Conflict changed/);
  } finally { await fixture.close(); }
});

test('corrupt Mac SQLite is rebuilt from synchronized revisions', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const {record} = await repo.save({description: 'Recover corruption'});
    await writeFile(join(fixture.privateRoot, 'Workspaces', repo.workspaceId, 'actions.sqlite'), 'Not a SQLite database');
    assert.deepEqual((await repo.query()).actions, [record]);
  } finally { await fixture.close(); }
});

test('an incoming current-file import failure does not block unrelated records', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const good = (await repo.save({description: 'Unrelated'})).record;
    const incoming = {...good, entityId: randomUUID(), revision: randomUUID(), parents: []};
    await fixture.adapter('actionWrite', {workspaceId: repo.workspaceId, path: `actions/${incoming.entityId}.json`, text: JSON.stringify(incoming)});
    fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.includes(incoming.revision));
    const result = await repo.recover(); assert.ok(result.warnings.some(warning => warning.includes('Injected')));
    assert.equal((await repo.query()).actions[0].entityId, good.entityId);
    await repo.recover(); assert.equal((await repo.query()).actions.length, 2);
  } finally { await fixture.close(); }
});

test('a transient incoming read failure retries even when file metadata is unchanged', async () => {
  const fixture = await storageFixture();
  try {
    let unreadable = null;
    const adapter = async (cmd, args) => {
      const result = await fixture.adapter(cmd, args);
      if (cmd === 'actionFiles' && unreadable) {
        delete result.files[unreadable];
        result.warnings.push({path: unreadable, message: 'Temporarily inaccessible'});
        unreadable = null;
      }
      return result;
    };
    const repo = new ActionRepository(adapter); await repo.open();
    const base = (await repo.save({description: 'Before delivery'})).record;
    await repo.recover();
    const incoming = {...base, revision: randomUUID(), parents: [base.revision], description: 'Delivered'};
    unreadable = `actions/${base.entityId}.json`;
    await fixture.adapter('actionWrite', {workspaceId: repo.workspaceId, path: unreadable, text: JSON.stringify(incoming)});
    assert.ok((await repo.recover()).warnings.length);
    assert.equal((await repo.recover()).warnings.length, 0);
    assert.equal((await repo.query()).actions[0].description, 'Delivered');
    assert.ok((await repo.history(base.entityId)).some(record => record.revision === incoming.revision));
  } finally { await fixture.close(); }
});

test('an unavailable topic collection does not prevent action commits', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const first = (await repo.save({description: 'Unrelated action'})).record;
    const {rm} = await import('node:fs/promises');
    await rm(join(fixture.root, 'LocalNotesData/topics'), {recursive: true});
    await writeFile(join(fixture.root, 'LocalNotesData/topics'), 'Unavailable directory fixture');
    const result = await repo.save({...first, description: 'Still editable'}, first);
    assert.equal(result.record.description, 'Still editable');
  } finally { await fixture.close(); }
});
