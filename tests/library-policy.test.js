import test from 'node:test';
import assert from 'node:assert/strict';
import {archivedPath, referenceRecord} from '../web/library.js';

test('archive recognition uses complete directory components only', () => {
  for (const path of ['Archive/note.md','work/ARCHIVES/note.md','archived/note.md','归档/note.md']) assert.equal(archivedPath(path),true,path);
  for (const path of ['archive.md','archive-plans/note.md','work/not-archived/note.md','Current/archive.md']) assert.equal(archivedPath(path),false,path);
});

test('frontmatter and prose cannot promote a current path into an archive', () => {
  const note = {path:'Current/note.md', modified:1000};
  const text = '---\narchived: true\n---\n# Historical archive\n\nOld material';
  const record = referenceRecord(note,text);
  assert.equal(archivedPath(record.path),false);
  assert.equal(record.title,'Historical archive');
  assert.equal(record.excerpt,'Old material');
  assert.equal(record.modified,1000);
});
