import {readFile, writeFile, readdir, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
let activeFixture = fixture;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const bridgeCalls = [];
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  const original = await readFile(sourcePath, 'utf8');
  await page.exposeFunction('bridge', async request => {
    try {
      bridgeCalls.push(request.cmd);
      if (request.cmd === 'workspace' || request.cmd.startsWith('action')) {
        const result = await activeFixture.adapter(request.cmd, request);
        return result;
      }
      const workspace = await activeFixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(activeFixture.root, request.path || '');
      switch (request.cmd) {
        case 'list': {
          const notes = [];
          for (const name of await readdir(activeFixture.root)) if (name.endsWith('.md')) notes.push({path: name, text: await readFile(join(activeFixture.root, name), 'utf8'), modified: (await stat(join(activeFixture.root, name))).mtimeMs / 1000});
          return {notes, root: activeFixture.root};
        }
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive: true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); if (request.cmd === 'actionQuery' && request.search === 'Only in workspace B') window.__heldQueryDelivered = true; }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'presentation.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'focus-screen.js', 'library.js', 'library-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  const {performance} = await import('node:perf_hooks');
  const {execFileSync} = await import('node:child_process');
  const {mkdir, writeFile} = await import('node:fs/promises');
  const {ActionRepository} = await import('../web/actions.js');
  const {InitiativeRepository} = await import('../web/initiatives.js');
  const workspaceId = (await fixture.adapter('workspace')).workspaceId;
  const id = value => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
  await mkdir(join(fixture.root, 'LocalNotesData/actions'), {recursive: true});
  await (await import('node:fs/promises')).unlink(join(fixture.root, 'reference.md'));
  for (let i = 0; i < 500; i++) await writeFile(join(fixture.root, `note-${i}.md`), `# Reference ${i}\n\n- [ ] Historical checklist ${i}\n`);
  for (let i = 0; i < 2000; i++) {
    const record = {formatVersion: 1, entityType: 'action', workspaceId, entityId: id(i + 1), revision: id(i + 10001), parents: [], description: `Synthetic action ${i}`, status: i < 10 ? 'todo' : i % 5 === 0 ? 'waiting' : 'todo', focusPosition: i < 10 ? i : null, initiativeId: null, sources: [], dueDate: null, waitingOn: i % 5 === 0 ? 'Explicit approval' : null, modifiedAt: '2026-11-16T00:00:00Z'};
    await mkdir(join(fixture.root, `LocalNotesData/revisions/${record.entityId}`), {recursive: true});
    await writeFile(join(fixture.root, `LocalNotesData/actions/${record.entityId}.json`), JSON.stringify(record));
    await writeFile(join(fixture.root, `LocalNotesData/revisions/${record.entityId}/${record.revision}.json`), JSON.stringify(record));
  }
  await new InitiativeRepository(fixture.adapter).open();
  const times = [];
  for (const mode of ['cold', 'warm', 'warm', 'warm']) {
    const before = fixture.calls.length, bodyBefore = bridgeCalls.filter(c => ['read', 'list'].includes(c)).length;
    const start = performance.now(); await page.goto('https://notes.test/');
    await page.getByRole('heading', {name: 'Current Focus', level: 2, exact: true}).waitFor();
    const interactiveMs = performance.now() - start;
    await page.getByRole('heading', {name: 'Synthetic action 0', exact: true}).waitFor();
    const populatedMs = performance.now() - start;
    await page.waitForFunction(() => document.querySelector('#index-state').textContent === 'initiatives index ready' || document.querySelector('#index-state').textContent === 'actions index ready');
    // Include the delayed background refresh and its record-file reads in counts.
    await page.waitForTimeout(1500);
    times.push({mode, interactiveMs: Math.round(interactiveMs), populatedMs: Math.round(populatedMs), noteBodyReadsIncludingBackground: bridgeCalls.filter(c => ['read', 'list'].includes(c)).length - bodyBefore, jsonRecoveryScans: fixture.calls.slice(before).filter(c => c.cmd === 'actionFiles').length});
  }
  const result = {device: execFileSync('system_profiler', ['SPHardwareDataType'], {encoding: 'utf8'}).split('\n').filter(line => /Model Name:|Model Identifier:|Chip:|Memory:/.test(line)).map(line => line.trim()), runtime: 'Headless Chrome shared home UI + production Swift filesystem/SQLite adapter, not native WKWebView startup', notes: 500, actions: 2000, times};
  await writeFile('build/focus-benchmark.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); await fixture.close(); }
