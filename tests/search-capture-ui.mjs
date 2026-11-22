import assert from 'node:assert/strict';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {chromium} from 'playwright';
import {safePath} from '../web/core.js';
import {storageFixture} from './action-adapter.js';

const assets = resolve(process.env.LIBRARY_ASSETS_DIR || 'build/web');
const manifest = JSON.parse(await readFile(join(assets, 'asset-manifest.json'), 'utf8'));
const fixture = await storageFixture();
const workspace = await fixture.adapter('workspace');
const source = '# 合成工作笔记\n\nQuartz 样机测量记录。\n';
let rejectCreate = false;
let holdSearch;
let browser;
try {
  await writeFile(join(fixture.root, 'quartz.md'), source);
  await writeFile(join(fixture.root, 'second.md'), source.replace('测量', '复核'));
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH});
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'referenceSearch' && holdSearch) await holdSearch;
      if (request.cmd === 'read' || request.cmd === 'create') {
        assert.equal(request.workspaceId, workspace.workspaceId);
        assert.ok(safePath(request.path));
        const path = join(fixture.root, request.path);
        if (request.cmd === 'read') return {text: await readFile(path, 'utf8')};
        if (rejectCreate) throw Error('Controlled create failure');
        await mkdir(dirname(path), {recursive: true});
        await writeFile(path, request.text, {flag: 'wx'});
        return {};
      }
      return await fixture.adapter(request.cmd, request);
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => {
    window.NotesNative = {request: async message => {
      const request = JSON.parse(message);
      window.nativeReply(request.id, await window.bridge(request));
    }};
  });
  await page.route('https://notes.test/**', async route => {
    const path = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!Object.hasOwn(manifest, path)) return route.abort();
    await route.fulfill({body: await readFile(join(assets, path)), contentType: manifest[path]});
  });
  await page.goto('https://notes.test/');
  await page.locator('.home-tools').waitFor();

  const search = page.locator('#global-search');
  const input = search.getByRole('searchbox');
  const status = search.locator('.search-status');
  const results = search.locator('.search-results');
  const opener = page.locator('#global-search-open');
  const focused = locator => locator.evaluate(node => node === document.activeElement);
  await opener.click();
  await input.waitFor();
  assert.equal(await focused(input), true);
  await page.keyboard.press('Tab');
  assert.equal(await focused(search.getByRole('button', {name: '关闭搜索'})), true);
  await page.keyboard.press('Escape');
  assert.equal(await focused(opener), true);

  await page.keyboard.press('ControlOrMeta+k');
  await input.waitFor();
  assert.equal(await focused(input), true);
  const scope = search.getByRole('button', {name: '笔记', exact: true});
  await scope.click();
  let releaseSearch;
  holdSearch = new Promise(resolve => { releaseSearch = resolve; });
  await input.fill('Quartz');
  await status.filter({hasText: '正在搜索'}).waitFor();
  assert.equal(await results.getAttribute('aria-busy'), 'true');
  releaseSearch();
  holdSearch = null;
  await status.filter({hasText: '本页 2 条结果'}).waitFor();
  await input.press('ArrowDown');
  const selected = results.locator('[data-selected=true]');
  const selectedSource = await selected.locator('.search-source').textContent();
  assert.match(selectedSource, /second\.md/);
  const title = selected.locator('.search-select');
  const selectedFill = await title.evaluate(node => getComputedStyle(node).backgroundColor);
  await title.hover();
  await page.waitForFunction(fill => getComputedStyle(document.querySelector('.search-result[data-selected=true] .search-select')).backgroundColor !== fill, selectedFill);

  await page.setViewportSize({width: 393, height: 480});
  await page.emulateMedia({reducedMotion: 'reduce'});
  assert.equal(await title.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  assert.equal(await search.evaluate(node => node.clientWidth === node.scrollWidth && node.getBoundingClientRect().bottom <= innerHeight), true);
  const openSource = selected.getByRole('button', {name: '打开原文'});
  await openSource.scrollIntoViewIfNeeded();
  const scroll = await results.evaluate(node => node.scrollTop);
  await openSource.click();
  await page.locator('#reading [aria-label="搜索匹配原文"] mark').waitFor();
  await page.locator('.search-return:visible').click();
  await input.waitFor();
  assert.equal(await input.inputValue(), 'Quartz');
  assert.equal(await scope.getAttribute('aria-pressed'), 'true');
  assert.equal(await selected.locator('.search-source').textContent(), selectedSource);
  assert.equal(await results.evaluate(node => node.scrollTop), scroll);
  assert.equal(await focused(openSource), true);
  await input.fill('No matching synthetic text');
  await status.filter({hasText: '没有匹配的内容'}).waitFor();
  assert.equal(await results.locator('.search-result').count(), 0);
  await page.keyboard.press('Escape');

  const capture = page.locator('#note-task-drawer');
  const newNote = page.locator('#new');
  const captureTitle = page.locator('#capture-title');
  const captureBody = page.locator('#capture-body');
  const create = capture.getByRole('button', {name: '创建笔记'});
  const readCaptures = async () => (await readdir(join(fixture.root, 'Notes')).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  })).filter(name => name.endsWith('.md'));
  await newNote.click();
  await captureTitle.waitFor();
  assert.equal(await focused(captureTitle), true);
  await create.click();
  await capture.locator('[role=alert]').filter({hasText: '请填写标题或正文'}).waitFor();
  assert.equal(await focused(captureTitle), true);
  assert.deepEqual(await readCaptures(), []);
  await captureBody.fill('不应写入磁盘');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: '放弃更改并离开'}).click();
  await capture.waitFor({state: 'hidden'});
  assert.equal(await focused(newNote), true);
  assert.deepEqual(await readCaptures(), []);

  await newNote.click();
  await captureTitle.fill('合成随手记');
  await captureBody.fill('Quartz 补充记录。');
  assert.equal(await capture.evaluate(node => {
    const footer = node.querySelector('footer').getBoundingClientRect();
    return node.clientWidth === node.scrollWidth && footer.bottom <= innerHeight && footer.height >= 44;
  }), true);
  rejectCreate = true;
  await create.click();
  await capture.locator('[data-state=failed]').waitFor();
  assert.equal(await captureTitle.inputValue(), '合成随手记');
  assert.equal(await captureBody.inputValue(), 'Quartz 补充记录。');
  assert.deepEqual(await readCaptures(), []);
  rejectCreate = false;
  await create.click();
  await page.locator('#capture-return:visible').waitFor();
  const files = await readCaptures();
  assert.equal(files.length, 1);
  assert.equal(await readFile(join(fixture.root, 'Notes', files[0]), 'utf8'), '# 合成随手记\n\nQuartz 补充记录。');
  assert.equal(await readFile(join(fixture.root, 'quartz.md'), 'utf8'), source);
  await page.reload();
  await page.locator('.home-tools').waitFor();
  await opener.click();
  await input.fill('补充记录');
  await search.getByRole('button', {name: '合成随手记', exact: true}).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS browser search and capture focus, selection, short layout, cancel, failed save, retry and indexed readback');
} finally {
  await browser?.close();
  await fixture.close();
}
