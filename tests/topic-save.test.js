import test from 'node:test';
import assert from 'node:assert/strict';
import {Library} from '../web/library.js';
import {storageFixture} from './action-adapter.js';

test('topic list failure after commit retries the same revision without duplicate topics', async () => {
  const fixture = await storageFixture();
  try {
    const library = new Library(fixture.adapter); await library.open();
    let queries = 0; fixture.fail(cmd => cmd === 'actionQuery' && ++queries === 2);
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


test('contextual topic creation commits its source with the topic and rejects duplicate names', async () => {
  const fixture = await storageFixture();
  try {
    const library = new Library(fixture.adapter); await library.open();
    const note = {path: 'reference.md', fingerprint: 'fnv1a32:12345678'};
    const record = await library.saveTopic('合成主题', null, null, note);
    assert.deepEqual(record.sources, [{...note, quote: ''}]);
    await assert.rejects(library.saveTopic(' 合成主题 ', null, null, note), /同名主题/);
    assert.equal(library.records.length, 1);
    assert.equal((await library.topics.query({entityId: record.entityId})).actions[0].sources[0].path, note.path);
  } finally { await fixture.close(); }
});

test('contextual topic index failure retries the same linked immutable revision', async () => {
  const fixture = await storageFixture();
  try {
    const library = new Library(fixture.adapter); await library.open();
    const note = {path: 'reference.md', fingerprint: 'fnv1a32:12345678'};
    fixture.fail(cmd => cmd === 'referenceTags');
    let failure;
    try { await library.saveTopic('恢复关联', null, null, note); } catch (error) { failure = error; }
    assert.equal(failure?.revisionSaved, true);
    const recovered = await library.saveTopic('恢复关联', null, failure.record, note);
    assert.equal(recovered.revision, failure.record.revision);
    assert.equal(library.records.length, 1);
    assert.equal(recovered.sources.length, 1);
  } finally { await fixture.close(); }
});
