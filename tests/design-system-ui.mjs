import {enterNoteEditing} from './form-journeys.js';
import {closeSavedAction, closeNoteInfo, captureNote, moveNote} from './form-journeys.js';
import {readFile, writeFile, readdir, stat, mkdir, rename, rm} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
let activeFixture = fixture;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const bridgeCalls = [];
  let writeGate = null, queryGate = null, failNoteSave = false;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  const original = '# 资料整理约定\n\n保留原文，只整理入口。\n\n先确认本周需要推进的内容，再补充关联资料。\n';
  await writeFile(sourcePath, original);
  const initiatives = new InitiativeRepository(fixture.adapter); await initiatives.open();
  const first = (await initiatives.save({title: '整理工作资料', goal: '让常用资料有清晰的入口', progress: '资料目录已整理，正在确定本周行动。', status: 'active', sources: [{path: 'reference.md', quote: '保留原文，只整理入口。', fingerprint: (await import('../web/initiatives.js')).fingerprint(original), role: 'reference'}]})).record;
  const second = (await initiatives.save({title: '准备下次评审', goal: '确认需要讨论的问题', progress: '等待评审时间确认。', status: 'active', sources: []})).record;
  const actions = new ActionRepository(fixture.adapter); await actions.open();
  for (const [i, description] of ['确定本周最重要的两件事', '把阅读摘录整理成一页笔记', '补充资料目录的使用说明'].entries()) await actions.save({description, initiativeId: first.entityId, focusPosition: i + 1, status: i === 1 ? 'in-progress' : 'todo'});
  await actions.save({description: '确认评审时间', waitingOn: '等待对方回复可用时间', status: 'waiting', initiativeId: second.entityId});
  await page.exposeFunction('bridge', async request => {
    try {
      bridgeCalls.push(request.cmd);
      if (request.cmd === 'actionWrite' && writeGate) { const gate = writeGate; writeGate = null; await gate; }
      if (request.cmd === 'actionQuery' && request.entityType === 'initiative' && queryGate) { const gate = queryGate; queryGate = null; await gate; }
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
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (failNoteSave) throw Error('Injected note save failure'); if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive: true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); if (request.cmd === 'actionQuery' && request.search === 'Only in workspace B') window.__heldQueryDelivered = true; }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await mkdir('docs/validation/issue31', {recursive: true});
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: '当前重点', exact: true, level: 2}).waitFor();
  assert.equal(await page.getByRole('heading', {name: '当前重点', exact: true}).count(), 1);
  assert.equal(await page.getByRole('button', {name: '打开行动：确定本周最重要的两件事', exact: true}).count(), 1);
  assert.equal(await page.getByRole('button', {name: '打开行动：确定本周最重要的两件事', exact: true}).count(), 1);
  assert.equal(await page.getByRole('button', {name: '移出重点', exact: true}).isVisible(), false);
  await page.screenshot({path: 'docs/validation/issue31/home-after.png'});

  await page.locator('nav [data-view=focus]').click(); await page.getByRole('button', {name: '全部行动', exact: true}).click();
  await page.locator('#items .card').first().click();
  const pagingFailure = await page.evaluate(async () => {
    const {FocusScreen} = await import('/focus-screen.js');
    const screen = Object.create(FocusScreen.prototype);
    screen.focusOffset = 99; screen.show = async () => {throw Error('Controlled page failure');};
    screen.notice = message => {screen.failure = message;};
    await screen.pageFocus(198);
    return {offset:screen.focusOffset, failure:screen.failure};
  });
  assert.deepEqual(pagingFailure,{offset:99,failure:'Controlled page failure'});
  const prior = await page.locator('#action-description').inputValue();
  await closeSavedAction(page); await captureNote(page);
  await page.locator('#title').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.activeElement.id==='title');
  await enterNoteEditing(page); await page.locator('#title').fill('随手记：很长的中文标题'.repeat(10));
  await closeNoteInfo(page); await enterNoteEditing(page); await page.locator('#body').fill('保留原来的任务，上下文不会丢失。'.repeat(25));
  failNoteSave = true;
  await page.locator('#note-save').click();
  await page.locator('#save-state').filter({hasText:'未保存'}).waitFor();
  await page.locator('#capture-return').click();
  await page.locator('#task-leave-decision').getByRole('button',{name:'继续编辑',exact:true}).click();
  assert.equal(await page.locator('#editor').isVisible(),true);
  assert.match(await page.locator('#body').inputValue(),/上下文/);
  await page.screenshot({path:'docs/validation/issue31/capture-failed.png'});
  await page.getByRole('button',{name:'关闭提示'}).click();
  failNoteSave = false;
  await page.locator('#note-save').click();
  await page.locator('#save-state').filter({hasText:'已保存到本地'}).waitFor();
  const capturedPath = await page.locator('#file-path').textContent();
  await page.setViewportSize({width:393,height:852});
  await page.screenshot({path:'docs/validation/issue31/capture-393.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const id of ['note-save','capture-return']) assert.ok(await page.locator('#'+id).evaluate(n=>n.getBoundingClientRect().height>=44));
  await page.locator('#capture-return').click();
  await page.locator('#action-drawer').waitFor({state:'visible'});
  assert.equal(await page.locator('#action-description').inputValue(),prior);
  await closeSavedAction(page); await page.locator('[data-view=notes]').click();
  await page.locator('#search').fill('随手记');
  await page.locator('#items .card').first().click();
  assert.equal(await page.locator('#file-path').textContent(),capturedPath);
  assert.match(await page.locator('#body').inputValue(),/上下文/);
  await closeNoteInfo(page); await enterNoteEditing(page); await page.locator('#body').fill('重新打开后恢复的草稿');
  failNoteSave=true;
  await page.locator('#note-save').click();
  await page.locator('#save-state').filter({hasText:'未保存'}).waitFor();
  await page.reload();
  await closeSavedAction(page); await page.locator('[data-view=notes]').click();
  await page.locator('#search').fill('随手记');
  await page.locator('#items .card').first().click();
  await page.waitForFunction(()=>document.querySelector('#body').value==='重新打开后恢复的草稿');
  assert.equal(await page.locator('#body').inputValue(),'重新打开后恢复的草稿');
  assert.match(await page.locator('#save-state').textContent(),/恢复/);
  assert.equal(await page.locator('#save-state').getAttribute('data-state'),'recovered');
  failNoteSave=false;
  await page.locator('#note-save').click();
  await page.locator('#save-state').filter({hasText:'已保存到本地'}).waitFor();
  await page.locator('#mode').click();
  await page.locator('#reading').waitFor({state:'visible'});
  await captureNote(page);
  await page.locator('#capture-return').waitFor({state:'visible'});
  assert.equal(await page.locator('#body').isVisible(),true);
  assert.equal(await page.locator('nav [data-view=notes]').getAttribute('aria-current'),'page');
  await page.locator('#capture-return').click();
  await page.locator('#reading').waitFor({state:'visible'});
  assert.equal(await page.locator('#file-path').textContent(),capturedPath);
  await page.locator('.directory-details summary').click();
  assert.equal(await page.locator('#choose').isVisible(),true);
  await page.locator('#choose').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Capture: typing, failed-save guard, retry, prior action return, reopen, reload draft recovery, 393px, directory and keyboard passed');
} finally {await browser.close();await fixture.close();}
