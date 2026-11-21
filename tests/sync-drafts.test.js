import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncDraftKey,readSyncDraft,editSyncValue} from '../web/sync-drafts.js';
test('resolution input preserves invalid raw JSON and the last full source value',()=>{
  const source={revision:'source',description:'原文',sources:[{path:'研究.md',quote:'逐字引用'}],deleted:false};
  const invalid=editSyncValue(source,'json','{未完成');
  assert.equal(invalid.json,'{未完成');assert.equal(invalid.invalid,true);assert.deepEqual(invalid.value,source);
  for(const input of ['null','[]','2'])assert.equal(editSyncValue(source,'json',input).invalid,true);
  const edited=editSyncValue(source,'description','人工解决');assert.equal(edited.value.description,'人工解决');assert.deepEqual(edited.value.sources,source.sources);assert.equal(source.description,'原文');
  assert.equal(editSyncValue(source,'focusPosition','').value.focusPosition,null);
});
test('private recovery candidates retain task/workspace identity, raw input and reviewed heads',()=>{
  const key=syncDraftKey('workspace-A','action','record');assert.notEqual(key,syncDraftKey('workspace-B','action','record'));assert.notEqual(key,syncDraftKey('workspace-A','topic','record'));
  const data=new Map([[key,JSON.stringify({json:'{未完成',selected:'left',tips:['left','right']})]]);const storage={getItem:key=>data.get(key)};
  assert.equal(readSyncDraft(storage,key).json,'{未完成');assert.equal(readSyncDraft(storage,syncDraftKey('workspace-B','action','record')),null);
  for(const invalid of ['{bad','null',JSON.stringify({json:4,selected:'left',tips:[]}),JSON.stringify({json:'{}',selected:'left',tips:[1]})]){data.set(key,invalid);assert.equal(readSyncDraft(storage,key),null);}
});
