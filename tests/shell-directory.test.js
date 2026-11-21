import test from 'node:test';
import assert from 'node:assert/strict';
import {bindDirectoryLabel,directoryLabel} from '../web/directory-label.js';

test('directory presentation delegates to the current shell owner and a stale disposer cannot detach its replacement',()=>{
  const first=[], second=[];
  const releaseFirst=bindDirectoryLabel(root=>first.push(root));
  directoryLabel('目录一');
  const releaseSecond=bindDirectoryLabel(root=>second.push(root));
  releaseFirst(); directoryLabel('目录二');
  assert.deepEqual(first,['目录一']); assert.deepEqual(second,['目录二']);
  releaseSecond();
});
