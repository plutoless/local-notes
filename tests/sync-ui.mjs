import {readFile, writeFile, readdir, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const otherFixture = await storageFixture();
let activeFixture = fixture;
let holdActionQuery = false, releaseHeldQuery, heldQueryStartedResolve;
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
      if (request.cmd === 'choose') { activeFixture = activeFixture === fixture ? otherFixture : fixture; return {}; }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        if (request.cmd === 'actionQuery' && holdActionQuery) { heldQueryStartedResolve(); await new Promise(resolve => { releaseHeldQuery = resolve; }); }
        return result;
      }
      const workspace = await activeFixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(activeFixture.root, request.path || '');
      switch (request.cmd) {
        case 'metadata':
        case 'list': {
          const notes = [];
          for (const name of await readdir(activeFixture.root)) if (name.endsWith('.md')) notes.push({path: name, size: (await stat(join(activeFixture.root, name))).size, modified: (await stat(join(activeFixture.root, name))).mtimeMs / 1000});
          return {notes, root: activeFixture.root};
        }
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); if (request.cmd === 'actionQuery' && request.search === 'Only in workspace B') window.__heldQueryDelivered = true; }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: 'Current Focus', exact: true, level: 2}).waitFor();
  const {ActionRepository} = await import('../web/actions.js');
  const {randomUUID} = await import('node:crypto');
  const repo = new ActionRepository(fixture.adapter); await repo.open();
  const base = (await repo.save({description: 'Review both versions', focusPosition: 1})).record;
  const local = (await repo.save({...base, description: 'Local description'}, base)).record;
  const remote = {...base, revision: randomUUID(), parents: [base.revision], description: 'Remote description', status: 'completed', focusPosition: null};
  await fixture.adapter('actionWrite', {workspaceId: repo.workspaceId, path: `revisions/${base.entityId}/${remote.revision}.json`, text: JSON.stringify(remote)});
  await page.getByRole('button', {name: 'Sync review / Refresh'}).click();
  const panel = page.getByRole('region', {name: 'Synchronization review'});
  await panel.waitFor();
  await panel.getByText('Conflicting versions: compare, select or merge below.').waitFor();
  const editor = panel.getByLabel('Merged version JSON');
  await editor.fill(JSON.stringify({...local, description: 'Merged explicitly'}));
  await panel.getByRole('button', {name: 'Save selected / merged resolution locally'}).click();
  await panel.getByText('No unresolved conflicts found in the available revisions.').waitFor();
  await repo.recover();
  const result = (await repo.query()).actions[0];
  assert.equal(result.description, 'Merged explicitly'); assert.deepEqual(new Set(result.parents), new Set([local.revision, remote.revision]));
  assert.deepEqual(errors, []);
  console.log('PASS: shared synchronization UI compares forked revisions and saves explicit multi-parent resolution through production Mac storage.');
} finally { await browser.close(); await fixture.close(); await otherFixture.close(); }
