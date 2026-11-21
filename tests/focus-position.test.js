import test from 'node:test';
import assert from 'node:assert/strict';
import {focusPosition} from '../web/react/focus-model.ts';

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
