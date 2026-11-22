import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile, mkdir, rename, unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ActionRepository} from '../web/actions.js';
import {TopicRepository} from '../web/library.js';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';

test('a reopened Topics repository only uses recovery data from its current workspace', async () => {
  const first = await storageFixture();
  const second = await storageFixture();
  try {
    let active = first;
    let delayed;
    const topics = new TopicRepository(async (cmd, args) => {
      const result = await active.adapter(cmd, args);
      if (active === first && delayed?.commands.has(cmd)) {
        const gate = delayed;
        gate.arrived.get(cmd).resolve();
        await gate.release.promise;
      }
      return result;
    });
    await topics.open();
    const previous = (await topics.save({description:'First workspace topic'})).record;
    await topics.recover();
    const unavailable = async fixture => {
      const directory = join(fixture.root, 'LocalNotesData', 'topics');
      await rename(directory, directory + '-held');
      await writeFile(directory, 'Fixture makes the record directory unavailable');
      return async () => {
        await unlink(directory);
        await rename(directory + '-held', directory);
      };
    };
    const restoreFirst = await unavailable(first);
    const sameWorkspace = await topics.open();
    assert.ok(sameWorkspace.warnings.some(warning => warning.startsWith('topics/:')));
    assert.equal((await topics.query()).actions[0].entityId, previous.entityId);
    await restoreFirst();

    const otherTopics = new TopicRepository(second.adapter);
    await otherTopics.open();
    const current = (await otherTopics.save({description:'Second workspace topic'})).record;
    const restoreSecond = await unavailable(second);
    const commands = new Set(['actionFiles', 'actionQuery']);
    delayed = {
      commands,
      arrived: new Map([...commands].map(cmd => [cmd, Promise.withResolvers()])),
      release: Promise.withResolvers(),
    };
    const previousInspection = assert.rejects(topics.recover(), /Workspace changed during record recovery/);
    const previousQuery = assert.rejects(topics.query(), /Workspace changed during record query/);
    await Promise.all([...delayed.arrived.values()].map(gate => gate.promise));
    active = second;
    let reopened;
    try { reopened = await topics.open(); }
    finally { delayed.release.resolve(); }
    await Promise.all([previousInspection, previousQuery]);
    assert.equal(reopened.workspaceId, current.workspaceId);
    assert.ok(reopened.warnings.some(warning => warning.startsWith('topics/:')));
    assert.ok(!reopened.warnings.join('\n').includes(previous.entityId), reopened.warnings);
    assert.deepEqual((await topics.query()).actions.map(record => record.entityId), [current.entityId]);
    await restoreSecond();
    assert.deepEqual((await topics.open()).warnings, []);
    assert.deepEqual((await topics.query()).actions, [current]);
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});

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

test('unsupported current types are reported without overwriting source JSON; renamed copies deduplicate by ID', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new ActionRepository(fixture.adapter); await repo.open();
    const {record} = await repo.save({description: 'Keep history'});
    const path = join(fixture.root, 'LocalNotesData/actions', `${record.entityId}.json`);
    const unsupported = JSON.stringify({formatVersion: 99, entityType: 'future-action', entityId: record.entityId});
    await writeFile(path, unsupported);
    const recovery = await repo.recover(); assert.ok(recovery.warnings.some(w => w.includes('Unsupported')));
    const {readFile} = await import('node:fs/promises'); assert.equal(await readFile(path, 'utf8'), unsupported);
    await writeFile(path, JSON.stringify(record));
    await writeFile(join(fixture.root, 'LocalNotesData/actions/renamed-copy.json'), JSON.stringify(record));
    await repo.recover(); assert.equal((await repo.query()).actions.length, 1);
  } finally { await fixture.close(); }
});
