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
    if (!['index.html', 'style.css', 'app.js', 'presentation.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await mkdir('docs/validation/workspace-design', {recursive: true});
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: '当前重点', exact: true, level: 2}).waitFor();
  assert.equal(await page.getByRole('heading', {name: '当前重点', exact: true}).count(), 1);
  assert.equal(await page.getByRole('button', {name: '打开行动：确定本周最重要的两件事', exact: true}).count(), 1);
  assert.equal(await page.getByRole('button', {name: '打开行动：确定本周最重要的两件事', exact: true}).count(), 1);
  assert.equal(await page.getByRole('button', {name: '移出重点', exact: true}).isVisible(), false);
  await page.screenshot({path: 'docs/validation/issue33/workspace-home.png'});
  await page.locator('[data-view=initiatives]').click();
  await page.locator('#items .card', {hasText: '整理工作资料'}).click();
  await page.locator('#workspace-context').waitFor({state: 'visible'});
  assert.equal(await page.locator('#initiative-title').inputValue(), '整理工作资料');
  await page.screenshot({path: 'docs/validation/issue33/workspace-initiative.png'});
  await page.locator('#initiative-actions button', {hasText: '确定本周最重要'}).click();
  await page.locator('#action-editor').waitFor({state: 'visible'});
  assert.equal(await page.locator('#workspace-context').isVisible(), true);
  assert.equal(await page.locator(`#items [data-initiative-id="${first.entityId}"]`).getAttribute('aria-current'), 'true');
  await page.locator('#action-description').fill('确定本周最重要的两件事，并安排时间');
  fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('revisions/'));
  await page.locator('#items .card', {hasText: '准备下次评审'}).click();
  await page.locator('#action-save-state').filter({hasText: /操作未完成/}).waitFor();
  assert.equal(await page.locator('#workspace-title').textContent(), '整理工作资料');
  assert.match(await page.locator('#action-description').inputValue(), /安排时间/);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(() => document.querySelector('#index-state').textContent === '');
  assert.equal(await page.locator('#action-editor').isVisible(), true, 'Background refresh must preserve action detail and draft');
  assert.match(await page.locator('#action-description').inputValue(), /安排时间/);
  await page.locator('#action-initiative').selectOption(second.entityId);
  fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith('revisions/'));
  await page.locator('#initiative-new-action').click();
  await page.locator('#action-save-state').filter({hasText: /操作未完成/}).waitFor();
  assert.equal(await page.locator('#action-initiative').inputValue(), second.entityId, 'Failed save must preserve assignment when New action is requested');
  await page.locator('#action-initiative').selectOption(first.entityId);
  await page.locator('#action-save').click();
  await page.locator('#action-save-state').filter({hasText: /^已保存到本地$/}).waitFor();
  await page.locator('#workspace-detail').evaluate(node => node.scrollTop = 0);
  await page.screenshot({path: 'docs/validation/issue33/workspace-action.png'});
  await page.locator('#workspace-references button').click();
  await page.locator('#reading').waitFor({state: 'visible'});
  assert.equal(await page.locator('#workspace-context').isVisible(), true);
  assert.equal(await page.locator('#search').getAttribute('aria-label'), '搜索事项');
  assert.equal(await page.locator('#reading > h1:first-child').isVisible(), false);
  await page.screenshot({path: 'docs/validation/issue33/workspace-note.png'});
  await page.locator('#mode').click();
  await page.locator('#body').fill('保留原文，只整理入口。\n\n已补充本周资料说明。');
  failNoteSave = true;
  await page.locator('#initiative-new-action').click();
  await page.locator('#notice').filter({hasText: /操作未完成/}).waitFor();
  assert.equal(await page.locator('#editor').isVisible(), true, 'Failed note save must keep the note visible');
  assert.match(await page.locator('#body').inputValue(), /已补充本周资料说明/);
  failNoteSave = false; await page.getByRole('button', {name: '关闭提示'}).click();
  await page.locator('#workspace-overview').click();
  await page.locator('#initiative-editor').waitFor({state: 'visible'});
  assert.match(await readFile(sourcePath, 'utf8'), /已补充本周资料说明/);
  assert.equal(await page.locator('#initiative-title').inputValue(), '整理工作资料');
  await page.setViewportSize({width: 393, height: 852});
  await page.locator('#initiative-back').click();
  await page.locator('#workspace-context').waitFor({state: 'visible'});
  await page.screenshot({path: 'docs/validation/issue33/workspace-mobile-context.png'});
  await rm(sourcePath);
  await page.locator('#workspace-references button').click();
  await page.locator('#notice').filter({hasText: /操作未完成/}).waitFor();
  assert.equal(await page.locator('#workspace-context').isVisible(), true, 'Missing note must retain the context and its back control');
  await page.getByRole('button', {name: '关闭提示'}).click();
  await writeFile(sourcePath, original);
  await page.locator('#initiative-actions button').first().click();
  await page.locator('#action-editor').waitFor({state: 'visible'});
  await page.screenshot({path: 'docs/validation/issue33/workspace-mobile-detail.png'});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#action-back').click();
  await page.locator('#workspace-context').waitFor({state: 'visible'});
  await page.locator('#workspace-back').click();
  await page.locator('#items .card', {hasText: '准备下次评审'}).click();
  await page.locator('#initiative-title').waitFor({state: 'visible'});
  assert.equal(await page.locator('#initiative-title').inputValue(), '准备下次评审');
  assert.deepEqual(errors, []);
  console.log('PASS: single home title, collapsed row utilities, context-preserving action/note edits, failed saves block initiative/New-action navigation, background refresh preserves drafts, missing notes preserve narrow-screen context, source save, selection, accessible action names, and narrow-pane navigation.');
} finally { await browser.close(); await fixture.close(); }
