import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionRepository, validateAction, isOverdue} from '../web/actions.js';
import {storageFixture} from './action-adapter.js';

test('focus uses the same actions, preserves explicit order and rebuilds; retirement clears selection', async () => {
  const fixture = await storageFixture();
  try {
    const repository = new ActionRepository(fixture.adapter); await repository.open();
    const a = (await repository.save({description: 'First', focusPosition: 2})).record;
    const b = (await repository.save({description: 'Second', focusPosition: 1, initiativeId: 'initiative-a'})).record;
    assert.deepEqual((await repository.query({focus: true})).actions.map(a => a.entityId), [b.entityId, a.entityId]);
    assert.equal((await repository.query({initiativeId: 'initiative-a'})).actions[0].entityId, b.entityId);
    assert.equal((await repository.query({entityId: a.entityId})).actions.length, 1);
    const moved = (await repository.save({...a, focusPosition: 0}, a)).record;
    assert.equal((await repository.query({focus: true})).actions[0].entityId, a.entityId);
    for (const status of ['waiting', 'completed', 'canceled']) {
      const focused = (await repository.save({...moved, focusPosition: 0}, repository.heads.get(a.entityId) === moved.revision ? moved : (await repository.query({entityId: a.entityId})).actions[0])).record;
      const retired = (await repository.save({...focused, status}, focused)).record;
      assert.equal(retired.focusPosition, null);
      const reopened = (await repository.save({...retired, status: 'todo'}, retired)).record;
      assert.equal(reopened.focusPosition, null);
    }
    await fixture.removeIndex();
    const reopened = new ActionRepository(fixture.adapter); await reopened.open();
    assert.deepEqual((await reopened.query({focus: true})).actions.map(a => a.entityId), [b.entityId]);
    assert.equal(isOverdue({...b, dueDate: null}), false);
    assert.throws(() => validateAction({...b, focusPosition: Infinity}));
    const warm = new ActionRepository(fixture.adapter); const before = fixture.calls.length;
    await warm.open({cached: true}); await warm.query({focus: true, limit: 7});
    assert.ok(fixture.calls.slice(before).every(c => !['actionFiles', 'read', 'list'].includes(c.cmd)));
    await warm.save({...b, focusPosition: null}, b);
    assert.equal((await warm.query({focus: true})).actions.length, 0);
  } finally { await fixture.close(); }
});

test('failed cached recovery prevents stale revision writes and remains retryable', async () => {
  const fixture = await storageFixture();
  try {
    const first = new ActionRepository(fixture.adapter); await first.open();
    const original = (await first.save({description: 'Original', focusPosition: 1})).record;
    const cached = new ActionRepository(fixture.adapter); await cached.open({cached: true});
    await cached.query({focus: true});
    await first.save({...original, description: 'New committed description'}, original);
    fixture.fail(cmd => cmd === 'actionFiles');
    const before = fixture.calls.filter(c => c.cmd === 'actionWrite').length;
    await assert.rejects(cached.save({...original, focusPosition: null}, original), /Injected storage failure/);
    assert.equal(cached.needsRefresh, true);
    assert.equal(fixture.calls.filter(c => c.cmd === 'actionWrite').length, before);
    await assert.rejects(cached.save({...original, focusPosition: null}, original), /Action changed/);
    const latest = (await cached.query({entityId: original.entityId})).actions[0];
    await cached.save({...latest, focusPosition: null}, latest);
  } finally { await fixture.close(); }
});

test('Mac index upgrades legacy and partially migrated query columns from confirmed JSON', async () => {
  const fixture = await storageFixture();
  try {
    const {execFileSync} = await import('node:child_process');
    const {join} = await import('node:path');
    const repository = new ActionRepository(fixture.adapter); await repository.open();
    const action = (await repository.save({description: 'Preserve selection', focusPosition: 1, initiativeId: 'initiative-a'})).record;
    const path = join(fixture.privateRoot, 'Workspaces', repository.workspaceId, 'actions.sqlite');
    for (const sql of [
      'DROP INDEX focus_order; DROP INDEX initiative_filter; ALTER TABLE actions DROP COLUMN focus; ALTER TABLE actions DROP COLUMN initiative;',
      'DROP INDEX focus_order; ALTER TABLE actions DROP COLUMN focus;'
    ]) {
      execFileSync('/usr/bin/sqlite3', [path, sql]);
      const reopened = new ActionRepository(fixture.adapter); await reopened.open({cached: true});
      assert.equal((await reopened.query({focus: true, initiativeId: 'initiative-a'})).actions[0].entityId, action.entityId);
    }
  } finally { await fixture.close(); }
});
