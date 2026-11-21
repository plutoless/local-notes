import {execFileSync} from 'node:child_process';
import {readFile, writeFile, readdir, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const activeFixture = fixture;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const bridgeCalls = [];
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
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive: true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation-labels.js', 'directory-label.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: process.env.PHASE === 'before' ? execFileSync('git', ['show', 'eeabc7ea6ef7e386caa944ffcd156ee8a49c55b3:web/'+name]) : await readFile(new URL('../build/web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await mkdir('docs/validation/issue45', {recursive: true});
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: '当前重点', exact: true, level: 2}).waitFor();
  assert.equal(await page.getByRole('heading', {name: '当前重点', exact: true}).count(), 1);
  assert.equal(await page.getByRole('button', {name: '打开行动：确定本周最重要的两件事', exact: true}).count(), 1);
  assert.equal(await page.getByRole('button', {name: '移出重点', exact: true}).isVisible(), false);
  const phase = process.env.PHASE || 'after';
  for (const width of [1180,393]) {
    await page.setViewportSize({width,height:852});
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if (phase !== 'before') {
      const targets = await page.locator('.home button:visible, .home summary:visible').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,height:n.getBoundingClientRect().height})));
      for (const t of targets) assert.ok(t.height>=44, JSON.stringify(t));
      const primary = page.locator('.home-tools > .primary');
      assert.equal(await primary.evaluate(n=>getComputedStyle(n,'::before').top),'6px');
      await primary.focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.textContent),'全部行动');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.textContent),'新建行动');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineWidth),'3px');
    }
    await page.screenshot({path:`docs/validation/issue45/${phase}-${width}.png`});
    const primary = page.locator('.home-tools > .primary');
    await primary.evaluate(n=>n.textContent='新建需要核对资料来源与当前上下文的行动，并保留所有相关事项、原始引用和后续跟进说明，确认保存后继续处理下一步');
    await page.screenshot({path:`docs/validation/issue45/${phase}-long-${width}.png`});
    if (width === 393 && phase !== 'before') {
      const geometry = await primary.evaluate(n=>({height:n.getBoundingClientRect().height,surface:parseFloat(getComputedStyle(n,'::before').height),scroll:n.scrollHeight,client:n.clientHeight}));
      assert.ok(geometry.height>44 && geometry.surface>32,JSON.stringify(geometry));
      assert.ok(geometry.scroll<=geometry.client,'Wrapped label clipped');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if (phase !== 'before') {
      const rects = await page.locator('.home-tools > button, .home-tools > details').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
      for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
        const a=rects[i],b=rects[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'Toolbar targets overlap');
      }
    }
    await primary.evaluate(n=>n.textContent='新建行动');
  }
  await page.setViewportSize({width:1180,height:852});
  await page.locator('.row-menu summary').first().focus(); await page.keyboard.press('Enter');
  assert.ok(await page.locator('.row-menu').first().evaluate(n=>n.open));
  await page.locator('.row-menu').first().getByRole('button',{name:'下移',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.focus-row-open h3').textContent==='把阅读摘录整理成一页笔记');
  await page.locator('.row-menu summary').first().click();
  await page.locator('.row-menu').first().getByRole('button',{name:'移出重点',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.row-menu').length===2);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS home desktop/393px, wrapped labels, keyboard, targets, reorder and remove; phase='+phase);
} finally {await browser.close();await fixture.close();}
