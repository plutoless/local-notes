import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile, symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {NoteSearch} from '../web/global-search.js';
import {storageFixture} from './action-adapter.js';

test('real isolated search index: bilingual grounding, boundaries, incremental reads, stale context', async () => {
  const fixture = await storageFixture();
  try {
    const text = '---\ncategory: metadata\n---\n# 重复标题\n\n' + 'intro\n'.repeat(400) + '- 延迟 latency 混合词\n| metric | value |\n| p99 | 20 |\n[link](https://example.com)';
    for (const dir of ['Archive', 'Current', '.hidden', 'Credentials']) { await mkdir(join(fixture.root, dir)); await writeFile(join(fixture.root, dir, 'note.md'), text); }
    await symlink(join(fixture.root, 'Current'), join(fixture.root, 'linked'));
    let reads = 0;
    const service = new NoteSearch(async (cmd, args) => {
      if (cmd === 'read') { reads++; return {text: await readFile(join(fixture.root, args.path), 'utf8')}; }
      return fixture.adapter(cmd, args);
    });
    await service.open(); await service.sync(); assert.equal(reads, 3);
    for (const query of ['延迟', 'LATENCY', 'latency 混合词', '重复标题']) {
      const page = await service.query(query); assert.equal(page.notes.length, 2); assert.equal(page.hasMore, false);
      assert.ok(page.notes.every(note => note.passage.includes(query === 'LATENCY' ? 'latency' : query)));
    }
    assert.equal((await service.query('not present')).notes.length, 0);
    const note = (await service.query('latency')).notes[0];
    assert.ok(note.passage.length <= 900); assert.ok(!note.passage.includes('category:'));
    const context = await service.context(note, 'latency'); assert.ok(text.includes(context)); assert.ok(context.includes('| p99 | 20 |'));
    const before = reads; await service.sync(); await service.query('latency'); assert.equal(reads, before);
    await writeFile(join(fixture.root, note.path), '# Changed'); await assert.rejects(service.context(note, 'latency'), /改变/);
    assert.ok(!fixture.calls.some(call => ['actionWrite', 'save', 'create'].includes(call.cmd)));
    const alternate = await storageFixture();
    try { const workspace = await alternate.adapter('workspace'); await assert.rejects(fixture.adapter('referenceSearch', {workspaceId: workspace.workspaceId, search: 'latency'}), /Workspace/); } finally { await alternate.close(); }
  } finally { await fixture.close(); }
});
