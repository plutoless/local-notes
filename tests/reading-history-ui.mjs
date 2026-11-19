import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'build/issue68-browser';
const fixture = await storageFixture();
const secondFixture = await storageFixture();
let activeFixture = fixture;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
let delayPath, releaseRead, readBegan, failSave = false, failTopics = false;
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'choose') { activeFixture = activeFixture === fixture ? secondFixture : fixture; return {}; }
      if (request.cmd === 'save' && failSave) throw Error('Controlled failed save');
      if (request.cmd === 'referenceQuery' && request.exactPath === 'folder/Second.md' && failTopics) throw Error('Controlled secondary query failure');
      if (request.cmd === 'read' && request.path === delayPath) { delayPath = null; const text = await readFile(join(activeFixture.root,request.path),'utf8'); readBegan(); await new Promise(resolve => releaseRead = resolve); return {text}; }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        return result;
      }
      const workspace = await activeFixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(activeFixture.root, request.path || '');
      switch (request.cmd) {
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
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  const text = '# Long synthetic note\n\n' + 'Readable paragraph for continuation.\n\n'.repeat(200);
  await writeFile(sourcePath,text);
  await page.goto('https://notes.test/');
  assert.equal(await page.locator('.recent-reading').count(),0);
  await page.locator('[data-view=notes]').click();
  await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#reading').waitFor({state:'visible'});
  await page.evaluate(()=>document.querySelector('main').scrollTop=700);
  await page.waitForTimeout(100);
  const scroll = await page.locator('main').evaluate(n=>n.scrollTop);
  assert.ok(scroll>0);
  await page.locator('[data-view=focus]').click();
  await page.getByRole('button',{name:'继续阅读：Long synthetic note',exact:true}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'继续阅读：Long synthetic note',exact:true}).click();
  await page.waitForFunction(()=>document.activeElement.id==='mode');
  assert.equal(await page.locator('main').evaluate(n=>n.scrollTop),scroll);
  assert.equal(await page.locator('#reading').isVisible(),true);
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.activeElement.dataset.readingPath==='reference.md');
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.readingPath),'reference.md');
  await writeFile(sourcePath,text+'\nChanged externally');
  await page.getByRole('button',{name:'继续阅读：Long synthetic note',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('原文已更改'));
  assert.equal(await page.locator('main').evaluate(n=>n.scrollTop),0);
  await page.locator('#back').click();
  await rename(sourcePath,join(fixture.root,'moved.md'));
  await page.getByRole('button',{name:'继续阅读：Long synthetic note',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('暂不可用'));
  assert.equal(await page.locator('#editor').isVisible(),false);
  await page.locator('.recent-reading summary').click();
  await page.getByRole('button',{name:'移除此阅读入口',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.recent-reading'));
  await rename(join(fixture.root,'moved.md'),sourcePath);
  await page.locator('[data-view=notes]').click();
  await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#reading').waitFor({state:'visible'});
  await page.locator('[data-view=focus]').click();
  const begun = new Promise(resolve => readBegan = resolve); delayPath='reference.md';
  await page.getByRole('button',{name:'继续阅读：Long synthetic note',exact:true}).click(); await begun;
  await page.locator('[data-view=notes]').click(); releaseRead();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#editor').isVisible(),false);
  await page.locator('[data-view=focus]').click();
  await page.locator('.directory-details summary').click(); await page.locator('#choose').click();
  await page.waitForFunction(()=>document.querySelector('.home-tools') && !document.querySelector('.recent-reading'));
  assert.equal(await page.locator('.recent-reading').count(),0);
  assert.equal(await readFile(sourcePath,'utf8'),text+'\nChanged externally');
  await fixture.removeIndex();

  // Home remains usable while the existing Library indexer awaits one source body.
  const indexingStarted = new Promise(resolve => readBegan = resolve); delayPath='reference.md';
  await page.locator('[data-view=notes]').click(); await indexingStarted;
  await page.locator('[data-view=focus]').click();
  await page.locator('.home-tools').waitFor();
  assert.equal(await page.locator('#editor').isVisible(),false);
  assert.equal(await page.locator('.recent-reading').count(),0);
  await page.locator('#choose').click();
  await page.getByRole('button',{name:'继续阅读：Long synthetic note',exact:true}).waitFor();
  releaseRead();
  await page.getByRole('button',{name:'继续阅读：Long synthetic note',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#reading').hidden && document.querySelector('#file-path').textContent==='reference.md');
  await page.locator('#note-info-open').click();
  await page.getByRole('button',{name:'新建并关联主题',exact:true}).waitFor();
  await page.locator('#note-info-drawer').getByRole('button',{name:'完成',exact:true}).click();
  assert.deepEqual(errors,[]);
  console.log('PASS private continuation reload, scroll/focus, changed/missing recovery, remove, late-read fence and workspace isolation');
} finally { await browser.close(); await fixture.close(); await secondFixture.close(); }
