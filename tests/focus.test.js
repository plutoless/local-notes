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
