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
test('recovery rejects another task and verifies retained immutable bytes before retry',async()=>{
  const {verifiedSyncRetry}=await import('../web/sync-drafts.js');
  const identity={workspaceId:'A',entityType:'action',entityId:'one'};
  const record={...identity,revision:'saved',description:'已保存'};
  const repository={history:async()=>[record]};
  assert.deepEqual(await verifiedSyncRetry(repository,structuredClone(record),identity),record);
  await assert.rejects(verifiedSyncRetry(repository,{...record,entityId:'two'},identity),/belong/);
  await assert.rejects(verifiedSyncRetry(repository,{...record,description:'替换内容'},identity),/changed/);
  const storage={getItem:()=>JSON.stringify({json:'{}',selected:'left',tips:[],retryRecord:{...record,entityId:'two'}})};
  assert.equal(readSyncDraft(storage,'key',identity),null);
});
test('private-cache quota or removal failure never throws away the live resolution',async()=>{
  const {updateSyncDraft}=await import('../web/sync-drafts.js');
  const live={json:'{未完成',selected:'left',tips:['left','right']};
  const storage={setItem(){throw Error('Quota exceeded');},removeItem(){throw Error('Unavailable');}};
  assert.equal(updateSyncDraft(storage,'key',live),false);assert.equal(live.json,'{未完成');
  assert.equal(updateSyncDraft(storage,'key',null),false);
});
