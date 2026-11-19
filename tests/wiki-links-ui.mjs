import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'build/issue67-browser';
const fixture = await storageFixture();
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
let delayPath, releaseRead, readBegan;
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'read' && request.path === delayPath) { delayPath = null; readBegan(); await new Promise(resolve => releaseRead = resolve); }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await fixture.adapter(request.cmd, request);
        return result;
      }
      const workspace = await fixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(fixture.root, request.path || '');
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
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  const originals = new Map([
    ['reference.md', '# Original\n\n[[folder/Second|别名第二份]] [[folder/Third|直接第三份]] [[missing|缺失]] [[../../outside|不安全]]\n\n' + '阅读段落。\n\n'.repeat(100)],
    ['folder/Second.md', '# Second\n\n[[Third.md|第三份]] [[reference|返回根目录]]'],
    ['folder/Third.md', '# Third\n\nNested destination'],
    ['other/Third.md', '# Wrong duplicate'],
  ]);
  for (const [name, text] of originals) { await mkdir(join(fixture.root,name,'..'),{recursive:true}); await writeFile(join(fixture.root,name),text); }
  await page.goto('https://notes.test/');
  await page.locator('[data-view=notes]').click();
  await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#reading').waitFor({state:'visible'});
  for (const viewport of [{width:1180,height:800},{width:393,height:852}]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button',{name:'打开本地笔记：缺失',exact:true}).click();
    await page.getByRole('button',{name:'关闭提示'}).waitFor();
    assert.equal(await page.locator('#file-path').textContent(),'reference.md');
    await page.getByRole('button',{name:'关闭提示'}).click();
    await page.getByRole('button',{name:'打开本地笔记：不安全',exact:true}).click();
    await page.getByRole('button',{name:'关闭提示'}).waitFor();
    assert.equal(await page.locator('#file-path').textContent(),'reference.md');
    await page.getByRole('button',{name:'关闭提示'}).click();
    await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
    await page.getByRole('button',{name:'打开本地笔记：第三份',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Third.md');
    await page.locator('#back').click();
    await page.waitForFunction(()=>document.activeElement.dataset.wikiTarget==='Third.md');
    assert.equal(await page.locator('#file-path').textContent(),'folder/Second.md');
    await page.locator('#back').click();
    await page.waitForFunction(()=>document.activeElement.dataset.wikiTarget==='folder/Second');
    assert.equal(await page.locator('#file-path').textContent(),'reference.md');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(evidence,`wiki-${viewport.width}.png`)});
  }
  // Competing reads: the last intent wins and only the committed hop enters history.
  const begun = new Promise(resolve => readBegan = resolve); delayPath = 'folder/Second.md';
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click(); await begun;
  await page.getByRole('button',{name:'打开本地笔记：直接第三份',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Third.md');
  releaseRead();
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
  // A moved prior target must not open the duplicate basename, and explicit skip recovers.
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click();
  await page.getByRole('button',{name:'打开本地笔记：第三份',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Third.md');
  await rename(join(fixture.root,'folder/Second.md'),join(fixture.root,'folder/Moved.md'));
  await page.locator('#back').click(); await page.getByRole('button',{name:'跳过不可用笔记',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
  await rename(join(fixture.root,'folder/Moved.md'),join(fixture.root,'folder/Second.md'));
  // Changed prior content is shown explicitly, without applying old selection offsets.
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await writeFile(sourcePath, originals.get('reference.md') + '\nExternal change');
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('原文已更改'));
  await page.getByRole('button',{name:'关闭提示'}).click();
  await writeFile(sourcePath, originals.get('reference.md'));
  // A page switch fences a delayed response and drops its uncommitted history.
  const awayBegun = new Promise(resolve => readBegan = resolve); delayPath = 'folder/Second.md';
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click(); await awayBegun;
  await page.locator('[data-view=focus]').click(); releaseRead();
  await page.locator('.home-tools').waitFor();
  assert.equal(await page.locator('#editor').isVisible(),false);
  await page.locator('[data-view=notes]').click();
  await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#editor').hidden);
  assert.equal(await page.locator('#items .selected').getAttribute('data-path'),'reference.md');
  for (const [name,text] of originals) assert.equal(await readFile(join(fixture.root,name),'utf8'),text);
  assert.deepEqual(errors,[]);
  console.log('PASS wiki aliases, nested exact resolution, unsafe/missing recovery, keyboard and nested Back, Library selected source, source preservation');

} finally { await browser.close(); await fixture.close(); }
