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
    if (!['index.html', 'style.css', 'app.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'focus-screen.js', 'library.js', 'library-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: 'Current Focus', exact: true, level: 2}).waitFor();
  assert.equal(bridgeCalls.filter(c => ['list', 'read'].includes(c)).length, 0);
  await page.getByRole('button', {name: 'Organize — AI not connected'}).click();
  await page.getByText(/AI organization is not connected yet/).waitFor();
  await page.getByRole('button', {name: 'New action', exact: true}).click();
  await page.locator('#action-description').fill('Chosen next step');
  await page.locator('#action-save').click();
  await page.locator('#action-save-state').filter({hasText: /^Saved locally$/}).waitFor();
  await page.locator('#action-focus').click();
  await page.getByRole('button', {name: 'Remove from Current Focus'}).waitFor();
  await page.locator('[data-view=focus]').click();
  await page.getByRole('heading', {name: 'Chosen next step'}).waitFor();
  await page.reload();
  await page.getByRole('heading', {name: 'Chosen next step'}).waitFor();
  await page.getByRole('button', {name: 'Open action', exact: true}).click();
  await page.locator('#action-status').selectOption('waiting');
  await page.locator('#action-waiting').fill('Approval from Sam');
  await page.locator('#action-save').click();
  await page.locator('#action-save-state').filter({hasText: /^Saved locally$/}).waitFor();
  await page.locator('[data-view=focus]').click();
  await page.getByText('Approval from Sam', {exact: true}).waitFor();
  assert.equal(await page.getByText('Overdue', {exact: false}).count(), 0);
  await page.getByRole('button', {name: 'Open action', exact: true}).click();
  await page.locator('#action-status').selectOption('todo'); await page.locator('#action-save').click();
  await page.locator('#action-save-state').filter({hasText: /^Saved locally$/}).waitFor();
  await page.locator('[data-view=focus]').click();
  await page.getByText('No focused actions.', {exact: false}).waitFor();
  // Seed nine explicit focused actions through the same production adapter.
  const {ActionRepository} = await import('../web/actions.js');
  const repository = new ActionRepository(fixture.adapter); await repository.open();
  for (let i = 0; i < 9; i++) await repository.save({description: `Focus item ${i}`, focusPosition: i});
  await page.reload();
  await page.getByRole('heading', {name: 'Focus item 0', exact: true}).waitFor();
  assert.equal(await page.locator('#items section').first().locator('h3').count(), 7);
  await page.getByRole('button', {name: 'Show more focused actions'}).click();
  await page.getByRole('heading', {name: 'Focus item 8', exact: true}).waitFor();
  assert.equal(await page.locator('#items section').first().locator('h3').count(), 9);
  await page.locator('#items section').first().locator('.card').nth(1).getByRole('button', {name: 'Move up'}).click();
  await page.waitForFunction(() => document.querySelector('#items section h3').textContent === 'Focus item 1');
  await page.locator('#items section').first().locator('.card').first().getByRole('button', {name: 'Remove', exact: true}).click();
  await page.getByRole('heading', {name: 'Focus item 1', exact: true}).waitFor({state: 'detached'});
  await page.reload();
  await page.getByRole('heading', {name: 'Focus item 0', exact: true}).waitFor();
  assert.equal(await page.getByRole('heading', {name: 'Focus item 1', exact: true}).count(), 0);
  const {InitiativeRepository} = await import('../web/initiatives.js');
  const initiativeRepository = new InitiativeRepository(fixture.adapter); await initiativeRepository.open();
  const initiative = (await initiativeRepository.save({title: 'Ongoing work', goal: 'Recover context', progress: 'Saved user progress', status: 'active', sources: []})).record;
  for (let i = 0; i < 51; i++) await repository.save({description: `Waiting item ${i}`, status: 'waiting', waitingOn: `Explicit condition ${i}`});
  // A recovered draft must survive navigation while rebuilt confirmed summaries appear.
  await page.evaluate(workspaceId => localStorage.setItem(`action-draft:${workspaceId}`, JSON.stringify({fields: {description: 'Unreviewed recovered draft', status: 'todo', sources: []}, previous: null, retry: null})), repository.workspaceId);
  await fixture.removeIndex(); await page.reload();
  await page.getByRole('heading', {name: 'Focus item 0', exact: true}).waitFor();
  await page.getByText('Saved user progress', {exact: true}).waitFor();
  assert.equal(await page.locator('#action-description').inputValue(), 'Unreviewed recovered draft');
  assert.equal((await repository.query({search: 'Unreviewed recovered draft'})).actions.length, 0);
  await page.getByRole('button', {name: 'Open initiative', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('#initiative-progress').value === 'Saved user progress');
  await page.locator('[data-view=actions]').click();
  await page.locator('#action-discard').click();
  await page.locator('#search').fill('No matching action');
  await page.locator('#action-initiative-filter').selectOption(initiative.entityId);
  await page.locator('[data-view=focus]').click();
  await page.getByRole('button', {name: 'More waiting actions'}).click();
  await page.waitForFunction(() => document.querySelector('#items h3')?.textContent.startsWith('Waiting item'));
  assert.equal(await page.locator('#search').inputValue(), '');
  assert.equal(await page.locator('#action-initiative-filter').inputValue(), '');
  assert.equal(await page.locator('#action-filter').inputValue(), 'waiting');
  await page.locator('[data-view=focus]').click();
  await writeFile(join(fixture.root, 'LocalNotesData/actions/broken.json'), '{');
  await page.getByRole('button', {name: 'Refresh confirmed data'}).click();
  await page.locator('#notice').filter({hasText: /broken.json/}).waitFor();
  await page.setViewportSize({width: 393, height: 852});
  await page.screenshot({path: 'build/focus-mobile.png'});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  assert.equal(bridgeCalls.filter(c => ['list', 'read'].includes(c)).length, 0);
  console.log('PASS: default focus, empty creation/organization, same-action focus selection, restart, waiting condition/no false overdue, reopening clears selection, seven/expand, reorder/remove, mobile viewport; zero note-body reads.');
} finally { await browser.close(); await fixture.close(); }
