import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryPage} from '../web/react/library-model.ts';
test('Library boundary retains optional totals and source text while rejecting invalid or unsafe replies', () => {
  const page={notes:[{path:'目录/a.md',title:'原文 <script>',excerpt:'逐字摘要',modified:1000}],hasMore:true};
  assert.deepEqual(libraryPage(page),page);
  assert.deepEqual(libraryPage({notes:[],hasMore:false,total:0}).notes,[]);
  for(const invalid of [null,{}, {...page,hasMore:1},{...page,total:-1},{...page,total:1.5},{...page,notes:[{path:'../a.md',title:'x'}]},{...page,notes:[{path:'a.md',title:3}]},{...page,notes:[{path:'a.md',title:'x',excerpt:{}}]}]) assert.throws(()=>libraryPage(invalid));
});

test('note reply rejects malformed bridge content and preserves empty and exact Unicode source', async()=>{
  const {noteReply}=await import('../web/react/library-model.ts');
  for(const text of ['', '\uFEFF# 原文\r\n\r\n- [ ] 不改写\r\n']) assert.equal(noteReply({text}).text,text);
  for(const value of [null,{},[],{text:12},{text:null}])assert.throws(()=>noteReply(value));
});
