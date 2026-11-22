import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'build/issue67-browser';
const assets = process.env.LIBRARY_ASSETS_DIR || fileURLToPath(new URL('../build/web/', import.meta.url));
const manifest = JSON.parse(await readFile(join(assets, 'asset-manifest.json'), 'utf8'));
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
      if (request.cmd === 'choose') { activeFixture = secondFixture; return {}; }
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
    if (!Object.hasOwn(manifest, name)) return route.abort();
    await route.fulfill({path:join(assets, name), contentType:manifest[name]});
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
  // Reading selection survives keyboard activation, including nonzero document scroll.
  await page.locator('#reading p').nth(1).evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(r);});
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).evaluate(n=>n.focus({preventScroll:true}));
  const selected = await page.evaluate(()=>getSelection().toString());
  await page.evaluate(()=>document.querySelector('main').scrollTop=140);
  const scroll = await page.locator('main').evaluate(n=>n.scrollTop);
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.activeElement.dataset.wikiTarget==='folder/Second');
  assert.equal(await page.locator('main').evaluate(n=>n.scrollTop),scroll);
  assert.equal(await page.evaluate(()=>getSelection().toString()),selected);
  // A secondary topic query failure cannot remove history after visible commit.
  failTopics = true;
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
  failTopics = false;
  // Dirty reading deliberately uses the delivered task-scoped leave decision.
  const edit = async () => { await page.locator('#mode').click(); await page.locator('#body').fill('[[folder/Second|别名第二份]]\nPrivate dirty edit'); await page.locator('#mode').click(); };
  await edit();
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click();
  await page.getByRole('button',{name:'继续编辑',exact:true}).click();
  assert.equal(await page.locator('#file-path').textContent(),'reference.md');
  assert.match(await page.locator('#body').inputValue(),/Private dirty edit/);
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click();
  await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
  failSave = true; await edit();
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click();
  await page.getByRole('button',{name:'保存并离开',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#task-leave-decision')?.textContent.includes('保存'));
  assert.equal(await page.locator('#file-path').textContent(),'reference.md');
  assert.match(await page.locator('#body').inputValue(),/Private dirty edit/);
  await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click(); failSave = false;
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
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
  // Caller-owned global-search return survives wiki detours; retrieval remains #60's seam.
  await page.locator('#global-search-open').click();
  await page.locator('#global-search-input').fill('Original');
  await page.locator('[data-scope=note]').click();
  await page.waitForFunction(()=>document.querySelector('#global-search [role=status]').textContent.startsWith('本页'));
  await page.locator('#global-search').getByRole('button',{name:'打开原文',exact:true}).first().click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md' && !document.querySelector('#global-search').open);
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await page.locator('.search-return:visible').click();
  await page.waitForFunction(()=>document.querySelector('#global-search').open);
  assert.equal(await page.locator('#global-search-input').inputValue(),'Original');
  assert.equal(await page.locator('[data-scope=note]').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'关闭搜索',exact:true}).click();
  // Restoring a search invocation must restore its reader breadcrumb as well.
  await page.locator('#items [data-path="reference.md"]').click();
  await page.getByRole('button',{name:'打开本地笔记：别名第二份',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await page.locator('#global-search-open').click();
  await page.getByRole('button',{name:'打开原文',exact:true}).first().click();
  await page.locator('.search-return:visible').click();
  await page.getByRole('button',{name:'关闭搜索',exact:true}).click();
  assert.equal(await page.locator('#file-path').textContent(),'folder/Second.md');
  assert.equal(await page.locator('#back').getAttribute('aria-label'),'返回：上一篇笔记');
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
  // A bounded second Library page retains its query, topic filter, selection and scroll.
  for(let i=0;i<55;i++) await writeFile(join(fixture.root,`page-${String(i).padStart(2,'0')}.md`),`# Pageable ${i}\n\n[[folder/Second|第二份]]`);
  await page.locator('[data-view=notes]').click();
  await page.locator('#library-refresh').click();
  await page.locator('#search').fill('Pageable');
  await page.locator('#library-topic').selectOption('uncategorized');
  await page.locator('#library-next').click();
  await page.waitForFunction(()=>document.querySelectorAll('#items .card').length===5);
  const pageText = await page.locator('#note-count').textContent();
  const chosen = await page.locator('#items .card').first().getAttribute('data-path');
  await page.locator('#items .card').first().click();
  await page.getByRole('button',{name:'打开本地笔记：第二份',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await page.locator('#back').click();
  await page.waitForFunction(path=>document.querySelector('#file-path').textContent===path,chosen);
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#editor').hidden);
  assert.equal(await page.locator('#search').inputValue(),'Pageable');
  assert.equal(await page.locator('#library-topic').inputValue(),'uncategorized');
  assert.equal(await page.locator('#note-count').textContent(),pageText);
  assert.equal(await page.locator('#items .selected').getAttribute('data-path'),chosen);
  await page.setViewportSize({width:1180,height:800});
  // Switching actual isolated workspace roots fences an old successful source read.
  await page.locator('#items .selected').click();
  const workspaceBegun = new Promise(resolve => readBegan = resolve); delayPath = 'folder/Second.md';
  await page.getByRole('button',{name:'打开本地笔记：第二份',exact:true}).click(); await workspaceBegun;
  await page.locator('.directory-details summary').click();
  await page.locator('#choose').click();
  await page.waitForFunction(()=>document.querySelector('#editor').hidden);
  releaseRead();
  await page.locator('#library-refresh').click();
  assert.equal(await page.locator('#editor').isVisible(),false);
  for (const [name,text] of originals) assert.equal(await readFile(join(fixture.root,name),'utf8'),text);
  assert.deepEqual(errors,[]);
  console.log('PASS wiki aliases, nested exact resolution, unsafe/missing recovery, keyboard and nested Back, Library selected source, source preservation');

} finally { await browser.close(); await fixture.close(); await secondFixture.close(); }
