import {readFile, writeFile, readdir, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository, fingerprint} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
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
  const actions = new ActionRepository(fixture.adapter); await actions.open();
  await page.exposeFunction('bridge', async request => {
    try {
      bridgeCalls.push(request.cmd);
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await fixture.adapter(request.cmd, request);
        return result;
      }
      const workspace = await fixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(fixture.root, request.path || '');
      switch (request.cmd) {
        case 'metadata':
        case 'list': {
          const notes = [];
          for (const name of await readdir(fixture.root)) if (name.endsWith('.md')) notes.push({path: name, size: (await stat(join(fixture.root, name))).size, modified: (await stat(join(fixture.root, name))).mtimeMs / 1000});
          return {notes, root: fixture.root};
        }
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive: true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  const assets = process.env.HOME_ASSETS_DIR || 'build/web';
  const manifest = JSON.parse(await readFile(join(assets, 'asset-manifest.json'), 'utf8'));
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!Object.hasOwn(manifest, name)) return route.abort();
    await route.fulfill({path:join(assets, name), contentType:manifest[name]});
  });
  const evidence = process.env.HOME_EVIDENCE || 'build/validation/124/home';
  await mkdir(evidence, {recursive: true});
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: '当前重点', exact: true, level: 2}).waitFor();
  assert.equal(await page.getByRole('heading', {name: '当前重点', exact: true}).count(), 1);
  const cue = page.getByText('下一步', {exact:true});
  const widths = [1180, 393];
  for (const width of widths) {
    await page.setViewportSize({width, height:852});
    for (const empty of ['暂无重点行动。', '没有等待中的行动。', '暂无进行中的事项。']) {
      assert.equal(await page.getByText(empty, {exact:true}).isVisible(), true);
    }
    assert.equal(await cue.count(), 0);
    assert.equal(await page.getByRole('heading', {name:'继续阅读'}).count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:join(evidence, `empty-${width}.png`)});
  }
  const first = (await initiatives.save({title: '整理工作资料', goal: '让常用资料有清晰的入口', progress: '资料目录已整理，正在确定本周行动。', status: 'active', sources: [{path: 'reference.md', quote: '保留原文，只整理入口。', fingerprint: fingerprint(original), role: 'reference'}]})).record;
  const second = (await initiatives.save({title: '准备下次评审', goal: '确认需要讨论的问题', progress: '等待评审时间确认。', status: 'active', sources: []})).record;
  const descriptions = ['确定本周最重要的两件事', '把阅读摘录整理成一页笔记', '补充资料目录的使用说明'];
  for (const [i, description] of descriptions.entries()) await actions.save({description, initiativeId: first.entityId, focusPosition: i + 1, status: i === 1 ? 'in-progress' : 'todo', dueDate: i === 0 ? '2001-01-01' : null});
  await actions.save({description: '确认评审时间', waitingOn: '等待对方回复可用时间', status: 'waiting', initiativeId: second.entityId});
  await page.reload();
  const firstPriority = page.getByRole('button', {name: '打开行动：确定本周最重要的两件事', exact: true});
  await firstPriority.waitFor();
  assert.equal(await firstPriority.getByText('下一步', {exact: true}).count(), 1);
  assert.equal(await firstPriority.getByText('2001-01-01 · 已逾期', {exact:true}).isVisible(), true);
  assert.ok(!bridgeCalls.includes('read'),'Home never reads corpus bodies');
  assert.equal(await page.getByRole('button', {name: '移出重点', exact: true}).isVisible(), false);
  await page.locator('[data-view=notes]').click();
  await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#reading').getByText('保留原文，只整理入口。', {exact:true}).waitFor();
  await page.locator('[data-view=focus]').click();
  const reading = page.getByRole('button', {name:'继续阅读：资料整理约定', exact:true});
  await reading.waitFor();
  assert.equal(await reading.getByText('reference.md', {exact:true}).isVisible(), true);
  const newAction = page.getByRole('button', {name:'新建行动', exact:true});
  for (const width of widths) {
    await page.setViewportSize({width,height:852});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const headings = await page.locator('#items section > h2').evaluateAll(nodes => nodes.map(node => {
      const bounds = node.getBoundingClientRect();
      return {text:node.textContent, x:bounds.x, y:bounds.y};
    }));
    assert.deepEqual(headings.map(heading => heading.text), ['优先处理', '等待与跟进', '继续推进', '继续阅读']);
    assert.ok(headings.every((heading, i) => heading.x === headings[0].x && (!i || heading.y > headings[i - 1].y)));
    const column = await page.locator('#items').evaluate(node => {
      const bounds = node.getBoundingClientRect();
      const surface = node.parentElement.getBoundingClientRect();
      return {width:Math.round(bounds.width), centerOffset:Math.abs(bounds.left + bounds.right - surface.left - surface.right)};
    });
    assert.equal(column.width, Math.min(675, width));
    assert.ok(column.centerOffset < 2, 'Content column is centered on the workspace surface');
    const statusLeft = await page.locator('.focus-priorities .action-status').evaluateAll(nodes =>
      nodes.map(node => Math.round(node.getBoundingClientRect().left)));
    assert.equal(statusLeft.length, descriptions.length);
    assert.equal(new Set(statusLeft).size, 1, 'Priority statuses align even when only one row has a due date');
    const targets = await page.locator('.home button:visible, .home summary:visible').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,height:n.getBoundingClientRect().height})));
    for (const t of targets) assert.ok(t.height>=44, JSON.stringify(t));
    assert.equal(await newAction.evaluate(n=>getComputedStyle(n,'::before').top),'6px');
    assert.equal(await newAction.evaluate(n=>getComputedStyle(n,'::before').backgroundColor),'rgba(0, 0, 0, 0)');
    await newAction.focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'全部行动');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'新建行动');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineWidth),'3px');
    await page.screenshot({path:join(evidence, `populated-${width}.png`)});
    await reading.scrollIntoViewIfNeeded();
    await page.screenshot({path:join(evidence, `continuation-${width}.png`)});
    const toolbarButton = page.locator('.home-tools .focus-new-action');
    await toolbarButton.evaluate(n=>n.textContent='新建需要核对资料来源与当前上下文的行动，并保留所有相关事项、原始引用和后续跟进说明，确认保存后继续处理下一步');
    if (width === 393) {
      const geometry = await toolbarButton.evaluate(n=>({height:n.getBoundingClientRect().height,surface:parseFloat(getComputedStyle(n,'::before').height),scroll:n.scrollHeight,client:n.clientHeight}));
      assert.ok(geometry.height>44 && geometry.surface>32,JSON.stringify(geometry));
      assert.ok(geometry.scroll<=geometry.client,'Wrapped label clipped');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const rects = await page.locator('.home-tools > button, .home-tools > details').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
    for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
      const a=rects[i],b=rects[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,'Toolbar targets overlap');
    }
    await toolbarButton.evaluate(n=>n.textContent='新建行动');
  }
  const homeTab = page.locator('[data-view=focus]');
  const actionsTab = page.locator('[data-view=actions]');
  assert.equal(await actionsTab.getAttribute('aria-current'), 'false');
  assert.equal(await homeTab.getAttribute('aria-current'), 'page');
  await page.mouse.move(0, 0);
  const fill = button => button.evaluate(node => getComputedStyle(node).getPropertyValue('--control-fill').trim());
  const selectedFill = await fill(homeTab);
  assert.notEqual(selectedFill, await fill(actionsTab));
  await homeTab.hover();
  assert.notEqual(await fill(homeTab), selectedFill);
  await page.mouse.move(0, 0);
  await actionsTab.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  assert.equal(await actionsTab.evaluate(node => document.activeElement === node && getComputedStyle(node).outlineWidth === '3px'), true);
  assert.equal(await homeTab.getAttribute('aria-current'), 'page');
  await newAction.focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'更多操作');
  for(const width of widths) {
    await page.setViewportSize({width,height:420});
    await page.locator('#root-name').evaluate(n=>n.textContent='用于核对工作区身份与长中文目录换行的名称'.repeat(4));
    await page.locator('.directory-details summary').click();
    await page.locator('#choose').focus();
    assert.ok(await page.locator('#choose').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=52 && r.bottom<=innerHeight;}),'Directory entry reachable in short layout');
    await page.locator('.directory-details summary').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:join(evidence, `short-${width}.png`)});
  }
  assert.ok(await page.locator('#global-search-open').isVisible());
  await page.setViewportSize({width:1180,height:852});
  await page.locator('.row-menu summary').first().focus(); await page.keyboard.press('Enter');
  assert.ok(await page.locator('.row-menu').first().evaluate(n=>n.open));
  await page.locator('.row-menu').first().getByRole('button',{name:'下移',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.focus-row-open h3').textContent==='把阅读摘录整理成一页笔记');
  await page.locator('.row-menu summary').first().click();
  await page.locator('.row-menu').first().getByRole('button',{name:'移出重点',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.focus-priorities .row-menu').length===2);
  const storedFirst = (await actions.query({focus:true, limit:1})).actions[0];
  assert.equal(storedFirst.description, descriptions[0]);
  const longTitle = '确认交付前的数据与来源并核对每一条引用。'.repeat(5) + 'A'.repeat(90);
  await actions.save({...storedFirst, description:longTitle}, storedFirst);
  await page.reload();
  const longPriority = page.getByRole('button', {name:'打开行动：' + longTitle, exact:true});
  await longPriority.waitFor();
  for (const width of widths) {
    await page.setViewportSize({width,height:852});
    assert.equal(await longPriority.getByText('下一步', {exact:true}).count(), 1);
    assert.ok(await longPriority.evaluate(node => {
      const title = node.querySelector('h3');
      return title.getClientRects().length > 1 && node.scrollWidth <= node.clientWidth &&
        document.querySelector('#items').scrollWidth <= document.querySelector('#items').clientWidth;
    }), 'Long priority title wraps within its row');
    await page.screenshot({path:join(evidence, `long-title-${width}.png`)});
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original);
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS empty, populated and long-title Current Focus at 1180/393px, centered section flow, continuation, quiet toolbar, keyboard and existing management.');
} finally {await browser.close();await fixture.close();}
