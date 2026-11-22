import assert from 'node:assert/strict';
import test from 'node:test';
import {meaningNoteChunks} from '../web/meaning-search.js';
import {fingerprint} from '../web/initiatives.js';

test('semantic indexing sends a supported long note with one path and exact scalar offsets', () => {
  const body = '# Synthetic\n\n' + ('🐾 原文引用 text '.repeat(47) + '\n').repeat(1800);
  assert.ok(Buffer.byteLength(body) < 2_000_000);
  const path = 'nested/'.repeat(37) + 'source.md';
  const request = meaningNoteChunks({path,title:'文'.repeat(200_000),fingerprint:fingerprint(body)},body,'fixture');
  assert.equal(request.source.path,path);
  assert.equal(request.source.title.length,512);
  assert.ok(request.source.title.endsWith('…'));
  const points = Array.from(body);
  for (const {start,passage} of request.chunks) {
    assert.equal(points.slice(start-1, start-1 + Array.from(passage).length).join(''),passage);
  }
  assert.ok(Buffer.byteLength(JSON.stringify(request)) < 4 * 1024 * 1024);
});
