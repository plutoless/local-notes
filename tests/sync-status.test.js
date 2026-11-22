import test from 'node:test';
import assert from 'node:assert/strict';
import {syncInspectionStatus} from '../web/react/sync-status.ts';

test('Sync Check distinguishes an incomplete inspection from a clean one even when old results are visible', () => {
  assert.equal(syncInspectionStatus({running:true, checked:true, records:[{}], warnings:[]}), 'checking');
  assert.equal(syncInspectionStatus({checkFailed:true, checked:true, records:[{}], warnings:[]}), 'failed');
  assert.equal(syncInspectionStatus({checked:true, records:[], warnings:['Missing revision']}), 'partial');
  assert.equal(syncInspectionStatus({checked:true, records:[], warnings:[]}), 'clear');
});

test('Sync Check keeps known conflicts visible even when the repository also reports warnings', () => {
  assert.equal(syncInspectionStatus({checked:false, records:[], warnings:[]}), 'unchecked');
  assert.equal(syncInspectionStatus({checked:true, records:[{}], warnings:[]}), 'conflicts');
  assert.equal(syncInspectionStatus({checked:true, records:[{}], warnings:['Divergent revisions retained']}), 'conflicts');
});
