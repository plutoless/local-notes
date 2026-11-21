import {readFile, writeFile, readdir, stat, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'docs/validation/issue55';
const integrated = process.argv.includes('--integrated');
const fixture = await storageFixture();
let activeFixture = fixture, alternateFixture;
let delayTopic = false, releaseTopic;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'actionWrite' && delayTopic) { delayTopic = false; await new Promise(resolve=>{releaseTopic=resolve;}); }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        return result;
      }
      if (request.cmd === 'choose') { activeFixture = alternateFixture || fixture; return {}; }
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
        case 'move': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await mkdir(join(activeFixture.root, request.target, '..'), {recursive:true}); await rename(path, join(activeFixture.root, request.target)); return {};
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive:true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.INITIATIVE_ASSETS_DIR ? join(process.env.INITIATIVE_ASSETS_DIR, name) : new URL('../build/web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  const workspace = await fixture.adapter('workspace');
  const key = `action-draft:${workspace.workspaceId}`;
  const privateDraft = {fields: {description: '', status: 'todo', sources: []}, previous: null, retry: null};
  await page.addInitScript(({key, privateDraft}) => localStorage.setItem(key, JSON.stringify(privateDraft)), {key, privateDraft});
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name:'当前重点', exact:true, level:2}).waitFor();
  await page.locator('[data-view=notes]').click();
  await page.waitForFunction(()=>document.querySelector('#view-title').textContent==='笔记库');
  const before = await readFile(sourcePath, 'utf8');
  const result = {baseline: integrated ? '0e2c8e7' : 'ed75811', hiddenAction: await page.locator('#action-editor').isHidden(), unsavedOnCleanLibrary: await page.evaluate(()=>window.hasUnsavedChanges())};
  assert.equal(result.hiddenAction, true);
  assert.equal(result.unsavedOnCleanLibrary, true);
  await page.getByRole('button', {name:/reference/}).first().click();
  if (integrated) await page.locator('#editor').waitFor({state:'visible'});
  else await page.waitForFunction(()=>document.querySelector('#action-description').getAttribute('aria-invalid')==='true');
  result.noteBlockedByHiddenAction = await page.locator('#editor').isHidden();
  result.hiddenError = await page.locator('#action-save-state').textContent();
  result.privateDraftByteUnchanged = await page.evaluate(({key,privateDraft})=>localStorage.getItem(key)===JSON.stringify(privateDraft), {key,privateDraft});
  result.noteUnchanged = before===await readFile(sourcePath,'utf8');
  assert.equal(result.noteBlockedByHiddenAction, !integrated);
  result.retainedDraft = await page.evaluate(key=>JSON.parse(localStorage.getItem(key)), key);
  assert.equal(result.retainedDraft.fields.description, privateDraft.fields.description);
  assert.equal(result.retainedDraft.previous, null);
  assert.equal(result.noteUnchanged, true);
  assert.equal(fixture.calls.filter(call=>call.cmd==='actionWrite').length, 0);
  for (const width of [1180,393]) {
    await page.setViewportSize({width,height:800});
    await page.screenshot({path:join(evidence,`${integrated ? 'integrated' : 'baseline'}-hidden-action-${width}.png`)});
  }
  await writeFile(join(evidence,`${integrated ? 'integrated' : 'baseline'}-hidden-action.json`),JSON.stringify(result,null,2)+'\n');
  assert.deepEqual(errors, []);
  console.log(integrated ? 'INTEGRATED: hidden recovered action no longer blocks note opening; global unsaved remains true on clean library; draft retained and note unchanged' : 'REPRODUCED: clean library reports unsaved; opening note validates unrelated hidden recovered blank action and remains blocked; draft retained; note unchanged');
} finally { await browser.close(); await fixture.close(); }
