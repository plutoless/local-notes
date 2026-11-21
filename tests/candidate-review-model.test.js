import test from 'node:test';
import assert from 'node:assert/strict';
import {readCandidateDraft, candidateEditable} from '../web/candidate-review-model.js';

test('private edit recovery preserves empty/Chinese text and rejects stale or malformed drafts', () => {
  for (const description of ['', '逐字保留编辑\n历史任务 - [ ] 核对']) {
    const saved = JSON.stringify({revision:'current',description});
    assert.equal(readCandidateDraft(saved,'current'),description);
    assert.equal(readCandidateDraft(saved,'newer'),null);
  }
  for (const value of [null,'bad','{}','{"revision":"current","description":42}']) assert.equal(readCandidateDraft(value,'current'),null);
});
test('only undecided or targetless deferred candidates remain editable', () => {
  assert.equal(candidateEditable({}),true);
  assert.equal(candidateEditable({review:{decision:'later',state:'done',target:null}}),true);
  for (const decision of ['confirm','ignore','attach','reference','later']) {
    assert.equal(candidateEditable({review:{decision,state:'pending'}}),false);
    assert.equal(candidateEditable({review:{decision,state:'done',target:{entityId:'persisted'}}}),false);
    assert.equal(candidateEditable({syncState:'conflict',review:{decision,state:'done'}}),false);
  }
});
