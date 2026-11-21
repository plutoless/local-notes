import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'build/issue66-browser';
const fixture = await storageFixture();
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
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
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../build/web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  const text = '# 表格阅读 Synthetic reader\r\n\r\n## 中文和 English\r\n\r\n| 项目 | Code | 说明 | 更多 | 最后 |\r\n| --- | --- | --- | --- | --- |\r\n| A\\|B | `x|y` | 长中文'.replace('A\\\\|B','A\\|B') + '阅读'.repeat(70) + ' | C | D |\r\n\r\n- [ ] 原文任务\r\n\r\n[安全链接](https://example.com)\r\n\r\n~~~md\r\n| 假 | 表格 |\r\n| --- | --- |\r\n~~~\r\n\r\n' + ('长中文和 English 阅读段落。\r\n\r\n'.repeat(100));
  await writeFile(sourcePath,text);
  await page.goto('https://notes.test/');
  await page.locator('[data-view=notes]').click();
  await page.locator('#items .card').click();
  await page.locator('#reading').waitFor({state:'visible'});
  assert.equal(await page.locator('#title').evaluate(n=>n.readOnly),true);
  assert.equal(await page.locator('#note-save').isVisible(),false);
  assert.equal(await page.locator('#save-state').isVisible(),false);
  assert.equal(await page.locator('#reading table').count(),1);
  assert.equal(await page.locator('#reading input').isDisabled(),true);
  for(const viewport of [{width:1180,height:800},{width:393,height:852},{width:800,height:400}]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await page.locator('.markdown-table').evaluate(n=>n.scrollWidth>n.clientWidth),true);
    await page.locator('.markdown-table').evaluate(n=>n.scrollLeft=100);
    await page.screenshot({path:join(evidence,`reader-${viewport.width}-${viewport.height}.png`)});
  }
  await page.locator('#reading h2').evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(r);});
  assert.equal(await page.evaluate(()=>getSelection().toString()),'中文和 English');
  assert.equal(await readFile(sourcePath,'utf8'),text);
  await page.setViewportSize({width:1180,height:800});
  await page.locator('#mode').click();
  assert.equal(await page.locator('#body').evaluate(n=>n===document.activeElement),true);
  await page.locator('#body').fill('Deliberate saved edit'); await page.locator('#mode').click();
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到本地');
  assert.match(await readFile(sourcePath,'utf8'),/Deliberate saved edit/);
  assert.equal(await page.locator('#note-save').isVisible(),false);
  assert.equal(await page.locator('#save-state').isVisible(),false);
  await page.locator('#back').click();
  await page.locator('#items .card').click(); await page.locator('#reading').waitFor({state:'visible'});
  const disk=await readFile(sourcePath,'utf8'), workspace=(await fixture.adapter('workspace')).workspaceId;
  await page.evaluate(({workspace,disk})=>localStorage.setItem(`draft:${workspace}:reference.md`,JSON.stringify({text:'# Recovery\n\nPrivate recovered edit',base:disk})),{workspace,disk});
  await page.reload(); await page.locator('[data-view=notes]').click();await page.locator('#items .card').click();
  await page.locator('#body').waitFor({state:'visible'});
  assert.match(await page.locator('#body').inputValue(),/Private recovered edit/);
  assert.equal(await readFile(sourcePath,'utf8'),disk);
  await page.locator('#back').click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  assert.equal(await readFile(sourcePath,'utf8'),disk);
  assert.deepEqual(errors,[]);
  console.log('PASS issue66 reading/table/source preservation, explicit edit persistence, recovered-draft discard');
} finally { await browser.close(); await fixture.close(); }
