import {readFile, writeFile, readdir, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const otherFixture = await storageFixture();
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
      if (request.cmd === 'choose') { activeFixture = otherFixture; return {}; }
      if (request.cmd === 'workspace' || request.cmd.startsWith('action')) return await activeFixture.adapter(request.cmd, request);
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
        case 'create': await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByText('No confirmed actions.', {exact: false}).waitFor();
  assert.equal(bridgeCalls.filter(command => command === 'list').length, 0);
  await page.locator('#action-new').click();
  await page.locator('#action-description').fill('Follow up with the reviewer');
  await page.locator('#action-status').selectOption('waiting');
  await page.locator('#action-waiting').fill('Reviewer feedback');
  await page.locator('#action-initiative').fill('initiative-example');
  await page.locator('#action-add-source').click();
  await page.locator('.source-path').fill('reference.md');
  await page.locator('.source-quote').fill('Run the sample command');
  await page.locator('#action-save').click();
  await page.getByText('Saved locally', {exact: true}).waitFor();
  assert.equal(await readFile(sourcePath, 'utf8'), original);
  assert.equal(bridgeCalls.filter(command => command === 'list').length, 0);
  await page.reload();
  await page.getByRole('heading', {name: 'Follow up with the reviewer', exact: true}).click();
  assert.equal(await page.locator('#action-status').inputValue(), 'waiting');
  assert.equal(await page.locator('#action-waiting').inputValue(), 'Reviewer feedback');
  await page.locator('#action-status').selectOption('completed'); await page.locator('#action-save').click();
  await page.getByText('Saved locally', {exact: true}).waitFor();
  await page.locator('#action-filter').selectOption('todo'); await page.getByText('No confirmed actions.', {exact: false}).waitFor(); assert.equal(await page.locator('.card').count(), 0);
  await page.locator('#action-filter').selectOption('completed');
  await page.getByRole('heading', {name: 'Follow up with the reviewer', exact: true}).click();
  await page.locator('#action-status').selectOption('todo'); await page.locator('#action-save').click();
  await page.getByText('Saved locally', {exact: true}).waitFor();
  await page.locator('#action-history').click(); await page.waitForFunction(() => document.querySelectorAll('#action-revisions p').length === 3);
  await page.locator('[data-view="notes"]').click();
  await page.locator('.card').filter({has: page.locator('small').filter({hasText: /^reference\.md ·/})}).click();
  await page.locator('#mode').click(); await page.locator('#reading input').first().check();
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === '已保存到本地');
  await page.locator('[data-view="actions"]').click(); await page.locator('#action-filter').selectOption('todo');
  await page.getByRole('heading', {name: 'Follow up with the reviewer', exact: true}).click();
  assert.equal(await page.locator('#action-status').inputValue(), 'todo');
  assert.equal(await page.locator('.source-quote').inputValue(), 'Run the sample command');
  await page.locator('#action-description').fill('Draft retained after a failed save');
  fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('revisions/'));
  await page.locator('#action-save').click(); await page.getByText(/Your edit is retained/).waitFor();
  await page.reload(); await page.getByText(/Recovered unsaved action/).waitFor();
  assert.equal(await page.locator('#action-description').inputValue(), 'Draft retained after a failed save');
  await page.locator('#action-save').click(); await page.getByText('Saved locally', {exact: true}).waitFor();
  // A committed but unrecovered edit remains the parent of subsequent user edits.
  fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('actions/'), 2);
  await page.locator('#action-description').fill('Committed during a current-record failure');
  await page.locator('#action-save').click(); await page.getByText(/Your edit is retained/).waitFor();
  await page.locator('#action-description').fill('Draft retained after a failed save');
  await page.locator('#action-save').click(); await page.getByText('Saved locally', {exact: true}).waitFor();
  const actionWorkspace = await fixture.adapter('workspace');
  const actionPage = await fixture.adapter('actionQuery', {workspaceId: actionWorkspace.workspaceId});
  assert.equal(actionPage.actions.length, 1);
  await page.locator('[data-view="notes"]').click(); await page.locator('.card').filter({has: page.locator('small').filter({hasText: /^reference\.md ·/})}).click();
  await page.locator('#editor').waitFor({state: 'visible'}); if (!await page.locator('#body').isVisible()) await page.locator('#mode').click(); await page.locator('#body').fill('Unsaved local edit');
  await writeFile(sourcePath, '# Synthetic reference material\n\nExternal edit');
  await page.locator('#conflict').waitFor({state: 'visible'});
  assert.equal(await page.locator('#body').inputValue(), 'Unsaved local edit');
  assert.equal(await readFile(sourcePath, 'utf8'), '# Synthetic reference material\n\nExternal edit');
  await page.locator('#copy').click(); await page.waitForFunction(() => document.querySelector('#conflict').hidden);
  await page.locator('[data-view="actions"]').click(); await page.locator('#action-filter').selectOption('');
  await page.screenshot({path: 'build/actions-desktop.png'});
  await page.setViewportSize({width: 393, height: 852});
  await page.getByRole('heading', {name: 'Draft retained after a failed save', exact: true}).click();
  await page.screenshot({path: 'build/actions-mobile.png'});
  assert.equal(await page.locator('#action-description').isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Failed initialization of B must hide A's editors before any further edit can be made.
  await page.setViewportSize({width: 1180, height: 800});
  await page.locator('[data-view="notes"]').click();
  await page.locator('.card').filter({has: page.locator('small').filter({hasText: /^reference\.md ·/})}).click();
  await page.locator('#editor').waitFor({state: 'visible'});
  const oldWorkspace = (await fixture.adapter('workspace')).workspaceId;
  const oldSource = await readFile(sourcePath, 'utf8');
  const otherSource = join(otherFixture.root, 'reference.md'); await writeFile(otherSource, oldSource);
  otherFixture.fail(cmd => cmd === 'actionFiles');
  await page.locator('#choose').click(); await page.getByText('Injected storage failure', {exact: true}).waitFor();
  assert.equal(await page.locator('#editor').isVisible(), false);
  assert.equal(await page.locator('#action-editor').isVisible(), false);
  assert.equal(await page.locator('#root-label').textContent(), 'Opening workspace…');
  const stale = await page.evaluate(async args => window.bridge(args), {cmd: 'save', workspaceId: oldWorkspace, path: 'reference.md', expected: oldSource, text: 'Wrong workspace'});
  assert.match(stale.error, /Workspace changed/);
  assert.equal(await readFile(otherSource, 'utf8'), oldSource);
  await page.locator('[data-view="notes"]').click();
  await page.locator('.card').filter({has: page.locator('small').filter({hasText: /^reference\.md ·/})}).click();
  await page.locator('#editor').waitFor({state: 'visible'});
  if (!await page.locator('#body').isVisible()) await page.locator('#mode').click();
  await page.locator('#body').fill('An intentional edit in the new workspace');
  await page.waitForFunction(() => document.querySelector('#save-state').textContent === '已保存到本地');
  assert.match(await readFile(otherSource, 'utf8'), /An intentional edit/);
  assert.equal(await readFile(sourcePath, 'utf8'), oldSource);
  assert.deepEqual(errors, []);
  console.log('PASS: empty actions, offline create/edit/restart, state filters/reopen/history, source independence, draft recovery, note conflict preservation, mobile layout (Chromium UI + native Mac file/SQLite adapter; not WKWebView or Android SAF).');
} finally { await browser.close(); await fixture.close(); await otherFixture.close(); }
