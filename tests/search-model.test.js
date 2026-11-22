import test from 'node:test';
import assert from 'node:assert/strict';
import {searchRows} from '../web/react/search-model.ts';
const note = {type:'note',identity:'[workspace,note,a.md,body:1]',workspaceId:'workspace',entityId:'a.md',path:'a.md',passageStart:1,fingerprint:'original',title:'标题',contextLabel:'a.md · 1',passage:'原始片段',locator:'a.md'};
test('expanded search context survives refresh only for the same typed identity, source version and query',()=>{
  const pending = Promise.resolve('待展开片段');
  const previous=[{note,query:'原始',text:'展开的完整来源',expanded:true,expanding:pending}];
  const [same]=searchRows([{...note}], '原始', previous);
  assert.equal(same.text,'展开的完整来源');
  assert.equal(same.expanded,true);
  assert.equal(same,previous[0]);
  assert.equal(same.expanding,pending);
  for(const changed of [{...note,fingerprint:'changed'},{...note,identity:'[other,note,a.md,body:1]',workspaceId:'other'},{...note,identity:'[workspace,note,a.md,body:99]',passageStart:99}])
    assert.equal(searchRows([changed], '原始', previous)[0].text,note.passage);
  const [newQuery]=searchRows([note], '另一查询', previous);
  assert.equal(newQuery.text,note.passage);
  assert.ok(!newQuery.expanded);
  assert.equal(previous[0].text,'展开的完整来源');
});
test('record revisions invalidate expansion and preserve delivered order and identity',()=>{
  const action={...note,type:'action',identity:'[workspace,action,a,description]',entityId:'a',fingerprint:undefined,revision:'r1'};
  const previous=[{note:action,query:'原始',text:'展开行动'}];
  const rows=searchRows([{...action,revision:'r2'},note], '原始', previous);
  assert.deepEqual(rows.map(row=>row.note.identity),[action.identity,note.identity]);
  assert.equal(rows[0].text,action.passage);
  assert.equal(searchRows([action],'原始',previous)[0].text,'展开行动');
  assert.deepEqual(searchRows([],'原始',previous),[]);
});
