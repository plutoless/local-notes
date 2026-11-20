import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReadingHistory} from '../web/reading-history.js';

test('private reading hints are bounded, ordered by reading, isolated and index independent', () => {
  const values = new Map();
  const storage = {getItem: key => values.get(key), setItem: (key,value) => values.set(key,value)};
  const history = new ReadingHistory(storage);
  const entry = path => ({path,title:path,fingerprint:'a',scroll:{main:100}});
  for (const path of ['a','b','c','d']) history.remember('one',entry(path));
  assert.deepEqual(history.list('one').map(item=>item.path), ['d','c','b']);
  history.remember('two',entry('a'));
  history.remember('one',entry('b'));
  history.moved('one','b','folder/b');
  const restarted = new ReadingHistory(storage);
  assert.deepEqual(restarted.list('one').map(item=>item.path), ['folder/b','d','c']);
  assert.deepEqual(restarted.list('two').map(item=>item.path), ['a']);
  restarted.remove('one','d');
  assert.deepEqual(restarted.list('one').map(item=>item.path), ['folder/b','c']);
  assert.equal([...values.keys()].some(key=>key.includes('index')),false);
});
test('invalid private hints recover without treating them as records', () => {
  const history = new ReadingHistory({getItem:()=>'{broken'});
  assert.deepEqual(history.list('one'),[]);
  assert.deepEqual(new ReadingHistory({getItem:()=>'{"path":"a"}'}).list('one'),[]);
});
