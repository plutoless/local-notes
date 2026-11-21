import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, rename, unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository, allRecords, endInitiative, fingerprint, sourceState, moveReferences} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
test('initiative assignments, multiple links, explicit ending and index/restart recovery', async () => {
  const fixture = await storageFixture();
  try {
    const actions = new ActionRepository(fixture.adapter), initiatives = new InitiativeRepository(fixture.adapter);
    await actions.open(); await initiatives.open();
    const original = await readFile(join(fixture.root, 'reference.md'), 'utf8');
    const source = {path: 'reference.md', quote: 'Run the sample command', fingerprint: fingerprint(original), role: 'reference'};
    let a = (await initiatives.save({title: 'First', goal: 'A goal', progress: 'User maintained', status: 'active', sources: [source]})).record;
    a = (await initiatives.save({...a, title: 'Updated initiative'}, a)).record;
    assert.equal((await initiatives.query({search: 'Updated'})).actions[0].entityId, a.entityId);
    assert.equal((await initiatives.query({search: 'First'})).actions.length, 0);
    const b = (await initiatives.save({title: 'Second', goal: '', progress: '', status: 'later', sources: [{...source, role: 'working-note'}]})).record;
    let action = (await actions.save({description: 'Independent'})).record;
    action = (await actions.save({...action, initiativeId: a.entityId}, action)).record;
    assert.equal((await allRecords(actions)).length, 1);
    await assert.rejects(endInitiative(initiatives, actions, a, {}), /every unfinished/);
    assert.equal((await allRecords(initiatives)).find(i => i.entityId === a.entityId).status, 'active');
    await assert.rejects(endInitiative(initiatives, actions, a, {[action.entityId]: {kind: 'move', target: a.entityId}}), /destination/);
    a = (await endInitiative(initiatives, actions, a, {[action.entityId]: {kind: 'move', target: b.entityId}})).record;
    action = (await allRecords(actions))[0]; assert.equal(action.initiativeId, b.entityId);
    a = (await initiatives.save({...a, status: 'active'}, a)).record;
    action = (await actions.save({...action, initiativeId: a.entityId}, action)).record;
    a = (await endInitiative(initiatives, actions, a, {[action.entityId]: {kind: 'independent'}})).record;
    assert.equal((await allRecords(actions))[0].initiativeId, null);
    for (const kind of ['completed', 'canceled']) {
      a = (await initiatives.save({...a, status: 'active'}, a)).record;
      action = (await actions.save({...action, initiativeId: a.entityId, status: 'todo'}, (await allRecords(actions))[0])).record;
      a = (await endInitiative(initiatives, actions, a, {[action.entityId]: {kind}})).record;
      assert.equal((await allRecords(actions))[0].status, kind);
    }
    await fixture.removeIndex();
    assert.equal((await allRecords(initiatives)).length, 2);
    const reopened = new InitiativeRepository(fixture.adapter); assert.deepEqual((await reopened.open()).warnings, []);
    assert.equal((await allRecords(reopened)).find(i => i.entityId === a.entityId).progress, 'User maintained');
    await rename(join(fixture.root, 'reference.md'), join(fixture.root, 'moved.md'));
    fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('initiatives/'), 2);
    await assert.rejects(moveReferences([actions, initiatives], 'reference.md', 'moved.md'), /recovery pending/);
    await moveReferences([actions, initiatives], 'reference.md', 'moved.md');
    await initiatives.open();
    assert.ok((await allRecords(initiatives)).every(i => i.sources[0].path === 'moved.md'));
    assert.equal(await readFile(join(fixture.root, 'moved.md'), 'utf8'), original);
  } finally { await fixture.close(); }
});
test('source state preserves changed, missing and ambiguous references; only unique fingerprint recovers moves', async () => {
  const text = '# Reference\n\nEvidence', source = {path: 'old.md', quote: 'Evidence', fingerprint: fingerprint(text)};
  const missing = async () => { throw Error('missing'); };
  assert.equal((await sourceState(source, async () => ({text}), async () => [])).state, 'available');
  assert.equal((await sourceState(source, async () => ({text: 'Changed'}), async () => [])).state, 'changed');
  assert.equal((await sourceState(source, missing, async () => [])).state, 'unavailable');
  assert.equal((await sourceState(source, missing, async () => [{path: 'new.md', text}])).path, 'new.md');
  assert.equal((await sourceState(source, missing, async () => [{path: 'a.md', text}, {path: 'b.md', text}])).state, 'ambiguous');
});
test('initiative revision survives interrupted current write and index removal', async () => {
  const fixture = await storageFixture();
  try {
    const repo = new InitiativeRepository(fixture.adapter); await repo.open();
    fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('initiatives/'));
    const result = await repo.save({title: 'Recover me', goal: '', progress: 'Private edit', status: 'active'});
    assert.equal(result.recovered, true);
    await fixture.removeIndex(); assert.equal((await allRecords(repo))[0].title, 'Recover me');
    assert.equal((await repo.history(result.record.entityId)).length, 1);
  } finally { await fixture.close(); }
});
test('ending preserves independently committed actions across a later failure, restart and retry', async () => {
  const fixture = await storageFixture();
  try {
    const actions = new ActionRepository(fixture.adapter), initiatives = new InitiativeRepository(fixture.adapter);
    await actions.open(); await initiatives.open();
    const initiative = (await initiatives.save({title:'Partial ending',status:'active',goal:'',progress:'Keep progress',sources:[]})).record;
    const first = (await actions.save({description:'First',initiativeId:initiative.entityId})).record;
    const second = (await actions.save({description:'Second',initiativeId:initiative.entityId})).record;
    // Fail a revision write only after one action has really committed; ordering is supplied by the real index.
    const ordered = (await allRecords(actions)).filter(item=>item.initiativeId===initiative.entityId);
    const survivor = ordered[0], failing = ordered[1];
    fixture.fail((cmd,args)=>cmd==='actionWrite' && args.path.startsWith(`revisions/${failing.entityId}/`));
    const choices = {[first.entityId]:{kind:'completed'},[second.entityId]:{kind:'independent'}};
    await assert.rejects(endInitiative(initiatives,actions,initiative,choices), /Not saved/);
    const history = await actions.history(survivor.entityId);
    assert.equal(history.length,2);
    const committedRevision = (await allRecords(actions)).find(item=>item.entityId===survivor.entityId).revision;
    await fixture.removeIndex();
    const reopenedActions = new ActionRepository(fixture.adapter), reopenedInitiatives = new InitiativeRepository(fixture.adapter);
    await reopenedActions.open(); await reopenedInitiatives.open();
    assert.equal((await allRecords(reopenedInitiatives))[0].status,'active');
    assert.equal((await allRecords(reopenedActions)).find(item=>item.entityId===survivor.entityId).revision,committedRevision);
    await endInitiative(reopenedInitiatives,reopenedActions,initiative,choices);
    assert.equal((await allRecords(reopenedInitiatives))[0].status,'ended');
    assert.equal((await reopenedActions.history(survivor.entityId)).length,2,'Retry must not revise an already handled action');
    assert.equal((await allRecords(reopenedInitiatives))[0].progress,'Keep progress');
  } finally { await fixture.close(); }
});
