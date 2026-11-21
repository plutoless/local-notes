import test from 'node:test';
import assert from 'node:assert/strict';
import {CollectionContexts} from '../web/react/browse-context.ts';
const defaults={order:'current',archives:'include',offset:0,directory:'*',topic:'',search:'',selectedPath:null,browseScroll:0,browseListScroll:0};
test('collections preserve independent bounded browsing state across other pages',()=>{
  const contexts=new CollectionContexts();
  assert.deepEqual(contexts.switch('notes',defaults),defaults);
  const library={...defaults,search:'资料',directory:'研究',offset:50,selectedPath:'研究/a.md',browseListScroll:180};
  assert.deepEqual(contexts.switch('favorites',library),defaults);
  const favorites={...defaults,topic:'topic-1',order:'title',selectedPath:'b.md',browseScroll:95};
  assert.equal(contexts.switch('focus',favorites),null);
  const outside={...favorites,browseScroll:0,browseListScroll:0};
  assert.equal(contexts.switch('actions',outside),null);
  assert.deepEqual(contexts.switch('notes',outside),library);
  assert.deepEqual(contexts.switch('favorites',library),favorites);
});
test('returned snapshots cannot overwrite saved context and workspace reset starts empty',()=>{
  const contexts=new CollectionContexts();contexts.switch('favorites',defaults);
  const saved={...defaults,search:'合成',offset:50};contexts.switch('notes',saved);
  saved.search='changed';
  const restored=contexts.switch('favorites',defaults);assert.equal(restored.search,'合成');
  assert.equal(new CollectionContexts().switch('favorites',saved).search,'');
});
