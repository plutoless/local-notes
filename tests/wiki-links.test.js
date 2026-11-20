import test from 'node:test';
import assert from 'node:assert/strict';
import {renderMarkdown, resolveWikiTarget} from '../web/core.js';
test('wiki rendering escapes aliases and targets and preserves code', () => {
  const html = renderMarkdown('[[folder/Note.md|<img onerror=x>]] `[[literal]]`\n~~~\n[[literal]]\n~~~');
  assert.equal((html.match(/data-wiki-target=/g) || []).length, 1);
  assert.match(html, /&lt;img onerror=x&gt;/);
  assert.doesNotMatch(html, /<img/);
});
test('resolution uses relative then workspace exact paths, never basename guessing', () => {
  const paths = ['a/Note.md', 'Note.md', 'b/Other.md', 'case.md', 'case.MD'];
  assert.equal(resolveWikiTarget('Note', 'a/start.md', paths), 'a/Note.md');
  assert.equal(resolveWikiTarget('../Note.md', 'a/start.md', paths), 'Note.md');
  assert.equal(resolveWikiTarget('b/Other', 'a/start.md', paths), 'b/Other.md');
  for (const target of ['Other', '../../Note', '/Note', 'LocalNotesData/x', '.hidden/x', 'https://x', 'x%2fy', 'x\\y', 'case']) assert.throws(() => resolveWikiTarget(target, 'a/start.md', paths));
});
