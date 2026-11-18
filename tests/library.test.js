import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {Library} from '../web/library.js';
import {ActionRepository} from '../web/actions.js';
import {storageFixture} from './action-adapter.js';

test('500-note incremental SQLite library with 2,000 confirmed actions', async () => {
  const fixture = await storageFixture();
  try {
    const notes = new Map(Array.from({length: 500}, (_, i) => [`Research/${String(i).padStart(4, '0')}.md`, {text: `# ${i % 2 ? '中文标题' : 'English title'} ${i}\n\n${i % 2 ? '中文正文' : 'English body'} ${i}`, modified: 1, size: 100}]));
    let warnings = [], unavailable = false, readCount = 0;
    const adapter = async (cmd, args) => {
      if (cmd === 'metadata') { if (unavailable) throw Error('Directory unavailable'); return {notes: [...notes].map(([path, note]) => ({path, modified: note.modified, size: note.size})), root: fixture.root, warnings}; }
      if (cmd === 'read') { readCount++; if (!notes.has(args.path)) throw Error('Missing'); return {text: notes.get(args.path).text}; }
      return fixture.adapter(cmd, args);
    };
    const actions = new ActionRepository(adapter); await actions.open();
    // Fixture records go through the production immutable-revision/current/index contract.
    for (let i = 0; i < 2000; i++) await actions.save({description: `Confirmed ${i}`});
    const library = new Library(adapter); await library.open();
    const start = performance.now(); await library.sync(); const cold = performance.now() - start;
    assert.equal(readCount, 500);
    const paths = [];
    for (let offset = 0;; offset += 50) { const page = await library.query({offset}); assert.ok(page.notes.length <= 50); paths.push(...page.notes.map(n => n.path)); assert.ok(page.notes.every(n => !('text' in n) && n.excerpt.length <= 180)); if (!page.hasMore) break; }
    assert.equal(paths.length, 500); assert.equal(new Set(paths).size, 500);
    for (const search of ['中文标题', '中文正文', 'english title', 'english body']) { const page = await library.query({search}); assert.equal(page.notes.length, 50); assert.equal(page.hasMore, true); }
    assert.equal((await library.query({directory: ''})).notes.length, 0);
    assert.equal((await library.query({directory: 'Research'})).notes.length, 50);
    const warmStart = performance.now(); await library.sync(); const warm = performance.now() - warmStart;
    assert.equal(readCount, 500);
    await library.saveTopic('Research topic'); await library.saveTopic('Second topic');
    const note = (await library.query()).notes[0];
    await library.link(library.records[0], note, true); await library.link(library.records[1], note, true);
    assert.equal((await library.query({topic: library.records[0].entityId})).notes.length, 1);
    const topic = library.records[0]; await library.saveTopic('Renamed', topic);
    await library.link(library.records[0], note, false); assert.equal(notes.size, 500);
    notes.get(note.path).text += '\nUnique edited phrase'; notes.get(note.path).modified++;
    notes.set('Moved.md', notes.get('Research/0001.md')); notes.delete('Research/0001.md'); notes.delete('Research/0002.md');
    await library.sync(); assert.equal(library.lastReads, 2);
    assert.equal((await library.query({search: 'Unique edited phrase'})).notes.length, 1);
    assert.equal((await library.inventory()).length, 499);
    const beforeOpen = readCount; const openStart = performance.now(); await adapter('read', {path: note.path}); const opening = performance.now() - openStart; assert.equal(readCount, beforeOpen + 1);
    warnings = ['Research: permission denied']; notes.clear(); await library.sync(); assert.equal((await library.inventory()).length, 499);
    unavailable = true; await assert.rejects(library.sync(), /Directory unavailable/); assert.equal((await library.inventory()).length, 499);
    await fixture.removeIndex(); const recovered = new Library(adapter); await recovered.open(); assert.equal(recovered.records.length, 2); assert.equal(recovered.records[0].description, 'Renamed'); assert.equal(recovered.records[1].sources.length + recovered.records[0].sources.length, 1);
    await actions.open(); let actionCount = 0; for (let offset = 0;; offset += 50) { const page = await actions.query({offset, limit: 50}); actionCount += page.actions.length; if (!page.hasMore) break; } assert.equal(actionCount, 2000);
    console.log(JSON.stringify({fixture: '500 notes / 2000 actions', coldMs: cold, warmMs: warm, openingMs: opening, coldReads: 500, warmReads: 0, editMoveReads: 2}));
  } finally { await fixture.close(); }
});

test('production Mac traversal excludes protected ranges and returns only metadata', async () => {
  const {mkdir, writeFile, symlink, rm} = await import('node:fs/promises');
  const {join} = await import('node:path');
  const fixture = await storageFixture();
  try {
    for (const directory of ['Credentials', '.hidden', 'LocalNotesData', 'Research/Sub']) { await mkdir(join(fixture.root, directory), {recursive: true}); await writeFile(join(fixture.root, directory, 'note.md'), '# Secret or note'); }
    await symlink(join(fixture.root, 'Research'), join(fixture.root, 'linked'));
    const result = await fixture.adapter('metadata');
    assert.deepEqual(result.notes.map(n => n.path).sort(), ['Research/Sub/note.md', 'reference.md']);
    assert.ok(result.notes.every(n => !('text' in n) && typeof n.size === 'number'));
    await rm(fixture.root, {recursive: true}); await assert.rejects(fixture.adapter('metadata'), /unavailable/);
  } finally { await fixture.close(); }
});

test('source-faithful summaries survive cached upgrade and index rebuild without source writes', async () => {
  const {referenceRecord} = await import('../web/library.js');
  const cases = [
    ['one/repeated.md', '---\ntitle: Hidden metadata\ntags: [private]\n---\n# Repeated\n\n- [ ] **Useful** [source](local.md) and `code`.'],
    ['two/repeated.md', '\uFEFF---\r\ncreated: 2000-01-01\r\n...\r\n# Repeated\r\n\r\n> 中文原文'],
    ['metadata.md', '---\ntags: [only]\n---\n'],
    ['blank.md', '  \n'],
    ['plain.md', 'Plain <script>alert(1)</script> & source a_b_c'],
    ['malformed.md', '---\nUnclosed metadata retains useful text'],
  ];
  const expected = ['Useful source and code.', '中文原文', '', '', 'Plain <script>alert(1)</script> & source a_b_c', '--- Unclosed metadata retains useful text'];
  const fixture = await storageFixture();
  let reads = 0;
  try {
    const notes = cases.map(([path, text]) => ({path, text, size: text.length, modified: 1}));
    const adapter = (cmd, args) => {
      if (cmd === 'metadata') return {root: fixture.root, notes: notes.map(({text, ...note}) => note)};
      if (cmd === 'read') { reads++; return {text: notes.find(n => n.path === args.path).text}; }
      assert.ok(!['save', 'create', 'actionWrite'].includes(cmd), 'summary operations cannot write sources or formal records');
      return fixture.adapter(cmd, args);
    };
    const library = new Library(adapter); await library.open();
    // An old cached summary with identical file metadata must be replaced once.
    for (const {text, ...note} of notes) await library.request('referencePut', {record: {...referenceRecord(note, text), summaryVersion: undefined, excerpt: 'stale frontmatter'}, search: text});
    await library.sync(); assert.equal(reads, cases.length);
    async function check() {
      for (let i = 0; i < cases.length; i++) {
        const [note] = (await library.query({exactPath: cases[i][0]})).notes;
        assert.equal(note.excerpt, expected[i]);
        assert.equal(note.title, i < 2 ? 'Repeated' : cases[i][0].replace('.md', ''));
        assert.equal(note.modified, 1);
      }
      assert.equal((await library.query({search: 'Hidden metadata'})).notes.length, 0);
    }
    await check(); await library.sync(); await check(); assert.equal(reads, cases.length);
    await fixture.removeIndex(); await library.sync(); await check(); assert.equal(reads, cases.length * 2);
  } finally { await fixture.close(); }
});


test('summary cleanup preserves literal operators and code syntax', async () => {
  const {referenceRecord} = await import('../web/library.js');
  assert.equal(referenceRecord({path:'code-first.md'}, '```sh\n# Back up the source before deleting it\nrm source.md\n```').excerpt, '# Back up the source before deleting it rm source.md');
  assert.equal(referenceRecord({path:'empty-frontmatter.md'}, '---\n---\n').excerpt, '');
  const source = '# Calculation\n\n2*3*4 = 24; prefix__identifier__suffix\nUse `a*b*c` and `__init__`.\n```js\nconst value = a*b*c; // **literal**\n```\n**Useful** prose';
  assert.equal(referenceRecord({path:'code.md'}, source).excerpt, '2*3*4 = 24; prefix__identifier__suffix Use a*b*c and __init__. const value = a*b*c; // **literal** Useful prose');
});
