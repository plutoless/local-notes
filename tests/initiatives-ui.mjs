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
      if (request.cmd === 'workspace' || request.cmd.startsWith('action')) {
        const result = await activeFixture.adapter(request.cmd, request);
        if (request.cmd === 'actionQuery' && holdActionQuery) { heldQueryStartedResolve(); await new Promise(resolve => { releaseHeldQuery = resolve; }); }
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
    if (!['index.html', 'style.css', 'app.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByText('No confirmed actions.', {exact: false}).waitFor();
  await page.locator('[data-view="initiatives"]').click();
  await page.locator('#initiative-new').click();
  await page.locator('#initiative-title').fill('Release planning');
  await page.locator('#initiative-goal').fill('Ship the next version');
  await page.locator('#initiative-progress').fill('Validation in progress');
  await page.locator('#initiative-add-link').click();
  await page.locator('.initiative-source input').fill('reference.md');
  await page.locator('.initiative-source textarea').fill('Run the sample command');
  await page.locator('#initiative-form [type=submit]').click();
  await page.locator('#initiative-save-state').filter({hasText: /^Saved locally$/}).waitFor();
  assert.equal(await readFile(sourcePath, 'utf8'), original);
  await page.locator('#initiative-new-action').click();
  await page.locator('#action-description').fill('Verify the release');
  await page.locator('#action-save').click();
  await page.locator('#action-save-state').filter({hasText: /^Saved locally$/}).waitFor();
  await page.locator('[data-view="initiatives"]').click();
  await page.getByRole('heading', {name: 'Release planning', exact: true}).click();
  await page.locator('#initiative-actions button').filter({hasText: 'Verify the release'}).waitFor();
  await page.locator('#initiative-status').selectOption('ended');
  await page.locator('#initiative-form [type=submit]').click();
  await page.getByText(/Choose how to handle every unfinished action/).waitFor();
  await page.locator('summary').filter({hasText: 'Handle unfinished actions'}).click();
  await page.locator('[data-action]').selectOption('independent');
  await page.locator('#initiative-form [type=submit]').click();
  await page.locator('#initiative-save-state').filter({hasText: /^Saved locally$/}).waitFor();
  assert.equal(await page.locator('#initiative-actions button').count(), 0);
  await page.locator('#initiative-status').selectOption('active');
  await page.locator('#initiative-form [type=submit]').click();
  await page.locator('#initiative-save-state').filter({hasText: /^Saved locally$/}).waitFor();
  await page.locator('#initiative-new-note').click();
  await page.locator('#editor').waitFor({state: 'visible'});
  await page.locator('#title').fill('Working log');
  await page.locator('#body').fill('Manual research update');
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === '已保存到本地');
  await page.locator('#note-initiatives button').click();
  await page.locator('.initiative-source').filter({has: page.locator('input[value]')}).count();
  assert.equal(await page.locator('.initiative-source').count(), 2);
  await page.reload();
  await page.locator('[data-view="initiatives"]').click();
  await page.getByRole('heading', {name: 'Release planning', exact: true}).click();
  assert.equal(await page.locator('#initiative-progress').inputValue(), 'Validation in progress');
  await page.setViewportSize({width: 393, height: 852});
  await page.screenshot({path: 'build/initiatives-mobile.png'});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: initiatives create/edit/restart, source links, action creation/assignment, explicit ending/reopening, linked note creation/autosave/backlinks, mobile viewport (Chromium + production Mac storage, not native app or SAF).');
} finally { await browser.close(); await fixture.close(); await otherFixture.close(); }
