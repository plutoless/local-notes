import {readFile, writeFile, readdir, stat, mkdir, rename, rm} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
let activeFixture = fixture;
let releaseMetadata, delayMetadata = false;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'metadata' && delayMetadata) await new Promise(resolve=>{releaseMetadata=resolve;});
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        return result;
      }
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
        case 'create': await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'presentation.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: '当前重点', exact: true, level: 2}).waitFor();
  await mkdir('docs/validation/issue19', {recursive:true});
  await page.locator('[data-view=notes]').click();
  await page.getByRole('heading', {name:'Synthetic reference material', exact:true}).click();
  await page.locator('#editor').waitFor({state:'visible'});
  await page.screenshot({path:'docs/validation/issue19/after-editor.png'});
  await page.locator('#editor').waitFor({state:'visible'});
  await page.locator('#note-details').evaluate(node=>node.open=true);
  await page.locator('#star').click();
  assert.equal(await page.locator('#star').getAttribute('aria-label'), '取消收藏笔记');
  await page.locator('#back').click();
  await page.locator('[data-view=favorites]').click();
  await page.getByRole('heading',{name:'Synthetic reference material',exact:true}).waitFor();
  await page.locator('#search').fill('不存在的关键词');
  await page.getByText('没有找到匹配的笔记。请换个关键词或清除搜索。',{exact:true}).waitFor();
  await page.screenshot({path:'docs/validation/issue19/after-no-results.png'});
  await page.locator('#search').fill('');
  await page.getByRole('heading',{name:'Synthetic reference material',exact:true}).click();
  await page.locator('#editor').waitFor({state:'visible'});
  await page.locator('#note-details').evaluate(node=>node.open=true);
  await page.locator('#star').click();
  await page.locator('#back').click();
  await page.getByText('还没有收藏的笔记。打开笔记，在「笔记信息与整理」中收藏。',{exact:true}).waitFor();
  await page.locator('[data-view=notes]').click();
  await page.locator('#library-create-topic').click(); await page.locator('#topic-name').fill('长中文主题：研究资料与工作记录'); await page.locator('#topic-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#library-topic').options.length===3);
  const topic=await page.locator('#library-topic option').last().getAttribute('value');
  await page.locator('#library-topic').selectOption(topic); await page.getByText('这个主题下还没有笔记。打开笔记后可在「笔记信息与整理」中关联主题。',{exact:true}).waitFor();
  await page.locator('#library-rename-topic').click(); await page.locator('#topic-name').fill('已重命名主题'); await page.locator('#topic-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#library-topic').selectedOptions[0].textContent==='已重命名主题');
  await page.locator('#library-topic').selectOption('');
  await page.getByRole('heading',{name:'Synthetic reference material',exact:true}).click();
  await page.locator('#editor').waitFor({state:'visible'});
  await page.locator('#note-details').evaluate(node=>node.open=true); await page.getByLabel('已重命名主题',{exact:true}).check();
  await page.locator('#body').fill('中文正文，保留原文与路径。\n\n- 列表项目\n\n> 引用原文\n\n- [ ] 原文复选框');
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到本地');
  await page.locator('#mode').click(); assert.equal(await page.locator('#reading ul').count(),1); assert.equal(await page.locator('#reading blockquote').count(),1);
  await page.getByLabel('原文复选框',{exact:true}).check();
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到本地');
  assert.match(await readFile(sourcePath,'utf8'), /- \[x\] 原文复选框/);
  await page.screenshot({path:'docs/validation/issue19/after-reading.png'});
  page.once('dialog',dialog=>dialog.accept('工作资料/中文长路径笔记.md')); await page.locator('#rename').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='工作资料/中文长路径笔记.md');
  await page.getByText('笔记已移动，关联已更新。',{exact:true}).waitFor(); await page.getByRole('button',{name:'关闭提示'}).click();
  await page.locator('#back').click(); await page.locator('#library-topic').selectOption(topic);
  await page.getByRole('heading',{name:'Synthetic reference material',exact:true}).click();
  await page.locator('#mode').click(); await page.locator('#body').fill('我的编辑仍保留');
  const movedPath=join(fixture.root,'工作资料/中文长路径笔记.md'); await writeFile(movedPath,'# 外部版本\n\n外部修改');
  await page.locator('#conflict').waitFor({state:'visible'}); await page.screenshot({path:'docs/validation/issue19/after-conflict.png'});
  await page.locator('#copy').click(); await page.waitForFunction(()=>document.querySelector('#conflict').hidden && document.querySelector('#file-path').textContent.includes('-conflict-'));
  assert.equal(await readFile(movedPath,'utf8'),'# 外部版本\n\n外部修改');
  const copied=await page.locator('#file-path').textContent();
  // Explicitly seed a recoverable draft to model process loss before autosave.
  const workspace=(await fixture.adapter('workspace')).workspaceId;
  const disk=await readFile(join(fixture.root,copied),'utf8');
  await page.evaluate(({workspace,copied,disk})=>localStorage.setItem(`draft:${workspace}:${copied}`,JSON.stringify({text:'# 恢复的中文草稿\n\n未保存正文',base:disk})),{workspace,copied,disk});
  await page.reload(); await page.locator('[data-view=notes]').click();
  await page.locator('#library-refresh').click();
  await page.locator('.card').filter({has:page.locator('small').filter({hasText:copied})}).click();
  await page.waitForFunction(()=>document.querySelector('#title').value==='恢复的中文草稿' && document.querySelector('#save-state').textContent==='已保存到本地');
  await page.setViewportSize({width:393,height:852});
  await page.screenshot({path:'docs/validation/issue19/after-393-editor.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#back').click(); await page.locator('#library-topic').selectOption('uncategorized');
  await page.screenshot({path:'docs/validation/issue19/after-393-library.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#search').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
  await page.locator('#library-topic').selectOption('');
  await page.setViewportSize({width:1180,height:800});
  for(let i=0;i<52;i++) await writeFile(join(fixture.root,`page-${i}.md`),`# 分页笔记 ${i}\n\n中文内容`);
  await page.locator('#library-refresh').click();
  await page.waitForFunction(()=>!document.querySelector('#library-next').disabled);
  await page.locator('#library-next').click(); await page.waitForFunction(()=>!document.querySelector('#library-previous').disabled);
  await page.locator('#library-previous').click();
  delayMetadata=true; await page.locator('#library-refresh').click();
  await page.getByText('正在更新笔记列表…',{exact:true}).waitFor();
  assert.equal(await page.locator('#library-refresh').isDisabled(),true);
  await page.screenshot({path:'docs/validation/issue19/after-loading.png'});
  delayMetadata=false; releaseMetadata(); await page.waitForFunction(()=>!document.querySelector('#library-refresh').disabled);
  fixture.fail(cmd=>cmd==='metadata'); await page.locator('#library-refresh').click();
  await page.getByText('目录暂不可用，请检查目录权限后刷新，或重新选择目录。',{exact:true}).waitFor();
  await page.screenshot({path:'docs/validation/issue19/after-error.png'});
  await page.getByRole('button',{name:'关闭提示'}).click(); await page.locator('#library-refresh').click();
  await page.getByRole('button',{name:'浏览目录',exact:true}).click();
  await page.getByRole('button',{name:'目录：工作资料',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#library-location').textContent==='工作资料');
  await page.locator('#library-back').click(); await page.locator('#library-back').click();
  for (const name of await readdir(fixture.root)) if(name.endsWith('.md') || name==='工作资料') await rm(join(fixture.root,name),{recursive:true});
  await page.locator('#library-refresh').click();
  await page.getByText('笔记库为空。使用「随手记」创建第一篇笔记，或选择已有笔记目录。',{exact:true}).waitFor();
  await page.screenshot({path:'docs/validation/issue19/after-empty-library.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: browse/search/favorites, topic create/rename/link/filter, Chinese reading/checkbox writeback, autosave, successful move and topic link repair, external conflict/copy, draft recovery after reload, 393px library/editor overflow, keyboard focus. Chromium + real Swift storage/SQLite adapter.');
} catch(error) { console.log(error); throw error; } finally { await browser.close(); await fixture.close(); }
