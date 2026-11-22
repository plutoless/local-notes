import {readFile, writeFile, readdir, utimes, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = process.env.LIBRARY_EVIDENCE_DIR || 'build/library-browse';
await mkdir(evidence,{recursive:true});
const fixture = await storageFixture();
const activeFixture = fixture;
const assets = process.env.LIBRARY_ASSETS_DIR || 'build/web';

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
  await page.addInitScript(() => {
    if (localStorage.getItem('stars') === null) {
      localStorage.setItem('stars', JSON.stringify(['Archive/000.md', 'Current/061.md']));
    }
    window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }};
  });
  const manifest = JSON.parse(await readFile(join(assets, 'asset-manifest.json'), 'utf8'));
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!Object.hasOwn(manifest, name)) return route.abort();
    await route.fulfill({body: await readFile(join(assets, name)), contentType: manifest[name]});
  });
  // Real Markdown and equal dates: one representative multi-page journey, not a UI sort matrix.
  const sources = new Map();
  for (let i = 0; i < 121; i++) {
    const path = `${i < 61 ? 'Archive' : 'Current'}/${String(i).padStart(3, '0')}.md`;
    const text = '# 重复标题：用于验证长中文标题换行和区分不同目录中的同名笔记\n\nSynthetic keyword source ' + i;
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
  await page.getByRole('button', {name:'浏览目录', exact:true}).click();
  await page.getByRole('button', {name:'目录：Current', exact:true}).click();
  await page.waitForFunction(() => document.querySelector('#library-location').textContent === 'Current');
  await page.locator('#library-back').click();
  await page.getByRole('button', {name:'目录：Archive', exact:true}).waitFor();
  await page.locator('#library-back').click();
  await page.getByRole('button', {name:'浏览目录', exact:true}).waitFor();
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
    const row=page.locator('#items .card').nth(8);
    const layout = await row.evaluate(node => {
      const rowBounds = node.getBoundingClientRect();
      const parts = [...node.children].map(child => child.getBoundingClientRect());
      return parts.every((part, i) => part.left >= rowBounds.left && part.right <= rowBounds.right
        && part.bottom <= rowBounds.bottom && (!i || part.top >= parts[i - 1].bottom));
    });
    assert.equal(layout, true, 'title, excerpt and metadata fit without overlap');
    await row.focus();
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
    assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineWidth),'3px');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).backgroundColor),'rgb(232, 237, 231)');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    returns.push({viewport,path,scroll,keyboardReturn:true});
  }
  await page.reload(); await page.locator('[data-view=notes]').click(); await settled();
  await page.getByLabel('归档范围',{exact:true}).selectOption('only');
  await page.waitForFunction(()=>document.querySelectorAll('#items .card').length===50 && document.querySelector('#library-page').textContent.includes('61'));
  assert.match(await page.locator('#library-page').innerText(),/61/);
  await page.locator('[data-view=favorites]').click();
  const favoriteRows = page.locator('#items .card');
  await page.waitForFunction(() => document.querySelectorAll('#items .card').length === 2);
  for (const path of ['Archive/000.md', 'Current/061.md']) {
    const row = favoriteRows.filter({hasText:path});
    await row.waitFor();
    assert.match(await row.innerText(),/重复标题/);
  }
  await page.locator('#search').fill('source 61');
  const favorite = favoriteRows.filter({hasText:'Current/061.md'});
  await favorite.waitFor();
  await page.waitForFunction(() => document.querySelectorAll('#items .card').length === 1);
  await page.emulateMedia({reducedMotion:'reduce'});
  const background = () => favorite.evaluate(node => getComputedStyle(node).backgroundColor);
  assert.equal(await background(), 'rgba(0, 0, 0, 0)');
  await favorite.hover();
  assert.equal(await background(), 'rgb(238, 238, 233)');
  await page.mouse.down();
  assert.equal(await background(), 'rgb(226, 226, 220)');
  await page.locator('#view-title').hover();
  await page.mouse.up();
  assert.equal(await favorite.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  await favorite.focus();
  await page.keyboard.press('Enter');
  await page.locator('#reading').waitFor({state:'visible'});
  assert.match(await page.locator('#reading').innerText(), /Synthetic keyword source 61/);
  await page.locator('#back').click();
  await page.waitForFunction(() => document.activeElement.dataset.path === 'Current/061.md');
  assert.equal(await page.locator('#search').inputValue(), 'source 61');
  assert.equal(await favorite.getAttribute('aria-current'), 'true');
  await favorite.hover();
  assert.equal(await background(), 'rgb(223, 231, 223)');
  await page.mouse.down();
  assert.equal(await background(), 'rgb(214, 224, 214)');
  assert.equal(await favorite.locator('small').first().evaluate(node=>getComputedStyle(node).color), 'rgb(85, 85, 80)');
  await page.locator('#view-title').hover();
  await page.mouse.up();
  await page.locator('#search').fill('no matching fixture');
  await page.getByText('没有找到匹配的笔记。请换个关键词或清除搜索。',{exact:true}).waitFor();
  await page.locator('#search').clear();
  await page.waitForFunction(() => document.querySelectorAll('#items .card').length === 2);
  const offlineRoot = fixture.root + '-offline';
  await rename(fixture.root, offlineRoot);
  try {
    await page.locator('#library-refresh').click();
    await page.getByText('笔记列表暂不可用，请刷新重试或重新选择目录。',{exact:true}).waitFor();
    await page.locator('#library-progress summary').click();
    assert.match(await page.locator('#library-progress pre').innerText(),/Workspace directory unavailable/);
    assert.equal(await favoriteRows.count(), 2, 'recoverable failure retains the indexed rows');
  } finally { await rename(offlineRoot, fixture.root); }
  await page.getByRole('button', {name:'关闭提示'}).click();
  await page.locator('#library-refresh').click();
  await settled();
  const indexed=await fixture.adapter('referenceQuery',{workspaceId:(await fixture.adapter('workspace')).workspaceId,archives:'only',limit:50,offset:50});
  assert.equal(indexed.notes.length,11);
  for (const [path,text] of sources) assert.equal(await readFile(join(fixture.root,path),'utf8'),text);
  for (const directory of ['actions','initiatives','topics','candidates','revisions']) assert.deepEqual(await readdir(join(fixture.root,'LocalNotesData',directory)),[]);
  assert.deepEqual(errors,[]);
  await writeFile(join(evidence,'browser-receipt.json'),JSON.stringify({
    surface:'headless Chromium actual app + Swift real storage/SQLite via browser bridge shim',
    nativeTransport:false, archivePaths:61, duplicateFree:true, reloadIndexReadback:true,
    sourceBytesPreserved:sources.size, noFormalRecordsCreated:true, directoryNavigation:true,
    favoritesQueryReturn:true, hoverAndPress:true, reducedMotion:true, emptyAndOfflineRecovery:true, returns
  },null,2));
  console.log('PASS Library/Favorites directory navigation, real-storage ordering/archive/paging, keyboard disabled handoff/open/return, scroll/focus, narrow layout, empty/offline recovery, reload/index readback and source preservation');
} finally { await browser.close(); await fixture.close(); }
