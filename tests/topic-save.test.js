import test from 'node:test';
import assert from 'node:assert/strict';
import {Library} from '../web/library.js';
import {storageFixture} from './action-adapter.js';

test('topic list failure after commit retries the same revision without duplicate topics', async () => {
  const fixture = await storageFixture();
  try {
    const library = new Library(fixture.adapter); await library.open();
    fixture.fail(cmd => cmd === 'actionQuery');
    let failure;
    try { await library.saveTopic('保留已提交主题'); } catch (error) { failure = error; }
    assert.equal(failure?.revisionSaved, true);
    assert.ok(failure.record.entityId);
    await library.saveTopic('保留已提交主题', null, failure.record);
    assert.equal(library.records.length, 1);
    assert.equal(library.records[0].entityId, failure.record.entityId);
    assert.equal(library.records[0].revision, failure.record.revision);
  } finally { await fixture.close(); }
});
