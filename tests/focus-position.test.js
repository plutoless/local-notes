import test from 'node:test';
import assert from 'node:assert/strict';
import {focusDirections, focusPosition, focusReturnIndex} from '../web/react/focus-model.ts';

test('priority operations follow the full ordering across visible page boundaries', () => {
  assert.deepEqual(focusDirections(0, 1, false, false), []);
  assert.deepEqual(focusDirections(0, 7, false, true), [1]);
  assert.deepEqual(focusDirections(6, 7, false, true), [-1, 1]);
  assert.deepEqual(focusDirections(0, 1, true, false), [-1]);
  assert.deepEqual(focusDirections(0, 1, true, true), [-1, 1]);
});

test('row return follows identity after reordering and uses the nearest slot after removal', () => {
  assert.equal(focusReturnIndex(['b', 'a', 'c'], 'a', 0), 1);
  assert.equal(focusReturnIndex(['a', 'c'], 'b', 1), 1);
  assert.equal(focusReturnIndex(['a', 'b'], 'c', 2), 1);
  assert.equal(focusReturnIndex([], 'a', 0), -1);
});

test('focus reordering preserves neighbor positions and chooses the requested bounded slot',()=>{
  const actions=[{focusPosition:1},{focusPosition:3},{focusPosition:8},{focusPosition:10}];
  assert.equal(focusPosition(actions,2,-1),2);
  assert.equal(focusPosition(actions,1,1),9);
  assert.equal(focusPosition(actions,1,-1),0);
  assert.equal(focusPosition(actions,2,1),11);
  assert.deepEqual(actions.map(a=>a.focusPosition),[1,3,8,10]);
});

test('focus reordering rejects unavailable or unrepresentable slots before persistence',()=>{
  assert.throws(()=>focusPosition([{focusPosition:0}],0,1));
  assert.throws(()=>focusPosition([{focusPosition:0}],0,0));
  assert.throws(()=>focusPosition([{focusPosition:1},{focusPosition:1+Number.EPSILON},{focusPosition:3}],2,-1));
  assert.throws(()=>focusPosition([{focusPosition:Number.MAX_VALUE},{focusPosition:1}],1,-1));
});
