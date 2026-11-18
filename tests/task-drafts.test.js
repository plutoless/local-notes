import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverTaskDraft} from '../web/task-drafts.js';

function storage(values) {
  const data = {...values};
  Object.defineProperties(data, {
    getItem: {value: key => data[key] ?? null},
    setItem: {value: (key, value) => { data[key] = value; }},
    removeItem: {value: key => { delete data[key]; }}
  });
  globalThis.localStorage = data;
  return data;
}
const legacy = 'action-draft:workspace';
const draft = JSON.stringify({fields:{description:'Uncommitted input'},previous:{entityId:'record-a'}});
test('legacy draft migrates into its workspace and record identity', () => {
  const data = storage({[legacy]:draft});
  const recovered = recoverTaskDraft('action','workspace');
  assert.equal(recovered.key, legacy+':record-a');
  assert.equal(data.getItem(legacy),null);
  assert.equal(data.getItem(recovered.key),draft);
});
test('different legacy and task drafts both survive migration', () => {
  const other = JSON.stringify({fields:{description:'Another uncommitted value'},previous:{entityId:'record-a'}});
  const data = storage({[legacy]:draft,[legacy+':record-a']:other});
  assert.equal(recoverTaskDraft('action','workspace').key,legacy);
  assert.equal(data.getItem(legacy),draft);
  assert.equal(data.getItem(legacy+':record-a'),other);
});
test('a corrupt task draft cannot erase a valid legacy recovery candidate', () => {
  const data = storage({[legacy]:draft,[legacy+':record-a']:'corrupt'});
  assert.equal(recoverTaskDraft('action','workspace').value.fields.description,'Uncommitted input');
  assert.equal(data.getItem(legacy),draft);
  assert.equal(data.getItem(legacy+':record-a'),'corrupt');
});
test('other workspaces and malformed private drafts remain untouched', () => {
  const data = storage({[legacy+':record-a']:'corrupt','action-draft:other:record-a':draft});
  assert.equal(recoverTaskDraft('action','workspace'),null);
  assert.equal(data.getItem('action-draft:other:record-a'),draft);
  assert.equal(data.getItem(legacy+':record-a'),'corrupt');
});
