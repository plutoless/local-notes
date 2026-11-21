import {readFile, writeFile, readdir, utimes, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'docs/validation/issue65/layered';
const fixture = await storageFixture();
const activeFixture = fixture;

const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        return result;
      }
      if (request.cmd === 'choose') return {};
      const workspace = await activeFixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(activeFixture.root, request.path || '');
      if (request.cmd === 'read') return {text: await readFile(path, 'utf8')};
      throw Error('Unhandled bridge command');
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  // Real Markdown and equal dates: one representative multi-page journey, not a UI sort matrix.
  const sources = new Map();
  for (let i = 0; i < 121; i++) {
    const path = `${i < 61 ? 'Archive' : 'Current'}/${String(i).padStart(3, '0')}.md`;
    const text = '# Repeated\n\nSynthetic keyword source ' + i;
    sources.set(path, text);
    await mkdir(join(fixture.root, path, '..'), {recursive:true});
    await writeFile(join(fixture.root, path), text); await utimes(join(fixture.root, path), 1000, 1000);
  }
  sources.set('reference.md', await readFile(sourcePath, 'utf8'));
  await page.goto('https://notes.test/');
  await page.locator('[data-view=notes]').click();
  const settled = () => page.waitForFunction(() => !document.querySelector('#library-progress').textContent && !document.querySelector('#library-refresh').disabled);
  await page.waitForFunction(()=>document.querySelector('#library-page').textContent.includes('122') && !document.querySelector('#library-progress').textContent);
  await settled();
  assert.match(await page.locator('#items .card').first().getAttribute('data-path'), /^Current\//);
  await page.getByLabel('排序', {exact:true}).selectOption('title');
  await page.getByLabel('归档范围', {exact:true}).selectOption('only');
  await page.waitForFunction(() => document.querySelector('#library-page').textContent.includes('61；本页 1–50') && document.querySelectorAll('#items .card').length === 50);
  const firstPage = await page.locator('#items .card').evaluateAll(nodes => nodes.map(n=>n.dataset.path));
  await page.locator('#library-next').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#library-next').disabled && document.querySelectorAll('#items .card').length === 11);
  assert.equal(await page.evaluate(()=>document.activeElement.id), 'library-previous', 'disabled next hands focus to previous');
  const lastPage = await page.locator('#items .card').evaluateAll(nodes => nodes.map(n=>n.dataset.path));
  assert.equal(new Set([...firstPage,...lastPage]).size,61);
  assert.deepEqual([...firstPage,...lastPage], [...sources.keys()].filter(p=>p.startsWith('Archive/')).sort());
  const returns=[];
  for (const viewport of [{width:1180,height:800},{width:393,height:650}]) {
    await page.setViewportSize(viewport);
    const row=page.locator('#items .card').nth(8); await row.focus();
    const path=await row.getAttribute('data-path');
    const scroll=await page.evaluate(()=>({collection:document.querySelector('.collection').scrollTop,list:document.querySelector('#items').scrollTop}));
    await page.keyboard.press('Enter');
    await page.locator('#reading').waitFor({state:'visible'});
    assert.equal(await page.locator('#file-path').innerText(),path);
    await page.locator('#back').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(path=>document.activeElement.dataset.path===path,path);
    assert.equal(await page.getByLabel('排序',{exact:true}).inputValue(),'title');
    assert.equal(await page.getByLabel('归档范围',{exact:true}).inputValue(),'only');
    assert.match(await page.locator('#library-page').innerText(),/51–61/);
    assert.deepEqual(await page.evaluate(()=>({collection:document.querySelector('.collection').scrollTop,list:document.querySelector('#items').scrollTop})),scroll);
    assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    returns.push({viewport,path,scroll,keyboardReturn:true});
  }
  await page.reload(); await page.locator('[data-view=notes]').click(); await settled();
  await page.getByLabel('归档范围',{exact:true}).selectOption('only');
  await page.waitForFunction(()=>document.querySelectorAll('#items .card').length===50 && document.querySelector('#library-page').textContent.includes('61'));
  assert.match(await page.locator('#library-page').innerText(),/61/);
  const indexed=await fixture.adapter('referenceQuery',{workspaceId:(await fixture.adapter('workspace')).workspaceId,archives:'only',limit:50,offset:50});
  assert.equal(indexed.notes.length,11);
  for (const [path,text] of sources) assert.equal(await readFile(join(fixture.root,path),'utf8'),text);
  for (const directory of ['actions','initiatives','topics','candidates','revisions']) assert.deepEqual(await readdir(join(fixture.root,'LocalNotesData',directory)),[]);
  assert.deepEqual(errors,[]);
  await writeFile(join(evidence,'browser-receipt.json'),JSON.stringify({surface:'headless Chromium actual app + Swift real storage/SQLite via browser bridge shim',nativeTransport:false,archivePaths:61,duplicateFree:true,reloadIndexReadback:true,sourceBytesPreserved:sources.size,noFormalRecordsCreated:true,returns},null,2));
  console.log('PASS Library real-storage ordering/archive/paging, keyboard disabled handoff/open/return, scroll/focus, narrow layout, reload/index readback and source preservation');
} finally { await browser.close(); await fixture.close(); }
