import {closeSavedAction} from './form-journeys.js';
import {readFile, writeFile, readdir, stat, mkdir, rename, rm} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {InitiativeRepository, allRecords} from '../web/initiatives.js';
import {ActionRepository} from '../web/actions.js';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const evidence='validation/issue127'; await mkdir(evidence,{recursive:true});
const assetRoot='build/web';
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const bridgeCalls = [];
  let pauseActionQuery;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  const original = await readFile(sourcePath, 'utf8');
  await page.exposeFunction('bridge', async request => {
    try {
      bridgeCalls.push(request.cmd);
      if (request.cmd.startsWith('ai')) throw Error('Unexpected AI request');
      if (request.cmd === 'actionQuery' && request.entityType === 'action' && request.initiativeId && pauseActionQuery) {
        const pause = pauseActionQuery;
        pauseActionQuery = null;
        await pause(request.id);
      }
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
  await page.addInitScript(() => {
    window.NotesNative = {request: async message => {
      const request = JSON.parse(message);
      window.nativeReply(request.id, await window.bridge(request));
      if (request.cmd === 'actionQuery' && request.initiativeId) window.lastInitiativeActionReply = request.id;
    }};
  });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation-labels.js', 'directory-label.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(join(assetRoot,name)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  const repository=new InitiativeRepository(fixture.adapter); await repository.open();
  const record=(await repository.save({title:'长期中文事项与资料核对'.repeat(6),goal:'逐字保留原文与任务标记'.repeat(12),progress:'核对中'.repeat(18),status:'active',sources:[
    {path:'reference.md',quote:'Run the sample command',fingerprint:'',role:'working-note'},
    {path:'reference.md',quote:'Run the sample command',fingerprint:'',role:'reference'}
  ]})).record;
  const started=performance.now();
  await page.goto('https://notes.test/');
  await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('[data-view=initiatives]').click();
  await page.locator('#items [data-initiative-id]').click();
  const ready=performance.now()-started;
  for(const [width,height] of [[1180,800],[393,852],[1180,480]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path:`${evidence}/context-${width}-${height}.png`});
    await page.locator('#workspace-overview').click();
    await page.locator('#initiative-drawer').waitFor({state:'visible'});
    await page.locator('#initiative-title').focus();
    await page.locator('#initiative-title').evaluate(node=>node.setSelectionRange(2,6));
    assert.deepEqual(await page.locator('#initiative-title').evaluate(node=>[node.selectionStart,node.selectionEnd]),[2,6]);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#initiative-goal').evaluate(node=>node===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const footer = await page.locator('#initiative-save').boundingBox();
    assert.ok(footer && footer.height >= 44 && footer.y + footer.height <= height);
    await page.screenshot({path:`${evidence}/form-${width}-${height}.png`});
    await page.locator('#initiative-discard').click();
    await page.waitForFunction(() => document.activeElement.id === 'workspace-overview');
  }
  console.log(JSON.stringify({readyMs:Math.round(ready),bridgeCommands:bridgeCalls.length,reads:bridgeCalls.filter(cmd=>cmd==='read').length,queries:bridgeCalls.filter(cmd=>cmd==='actionQuery').length}));
    await page.setViewportSize({width:1180,height:800});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#workspace-overview').click();
    await page.locator('#initiative-title').fill('');
    await page.locator('#initiative-save').click();
    await page.waitForFunction(() => document.activeElement.id === 'initiative-title' && document.activeElement.getAttribute('aria-invalid') === 'true');
    await page.locator('#initiative-title').fill('保存后重启核对');
    await page.locator('#initiative-progress').fill('已保存的进展');
    await page.locator('#initiative-save').click();
    await page.locator('#initiative-drawer').waitFor({state:'hidden'});
    await page.reload();
    await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
    await page.locator('[data-view=initiatives]').click();
    await page.getByRole('heading',{name:'保存后重启核对',exact:true}).click();
    await page.locator('#workspace-progress').filter({hasText:'已保存的进展'}).waitFor({state:'attached'});
    await page.locator('#workspace-overview').waitFor({state:'visible'});
    await rename(sourcePath, join(fixture.root,'moved-reference.md'));
    const {workspaceId}=await fixture.adapter('workspace');
    await rm(join(fixture.privateRoot,'Workspaces',workspaceId,'references.sqlite'),{force:true});
    await page.reload();
    await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
    await page.locator('[data-view=initiatives]').click();
    await page.getByRole('heading',{name:'保存后重启核对',exact:true}).click();
    const moved=page.locator('#workspace-references [data-path="moved-reference.md"]');
    await page.setViewportSize({width:393,height:852});
    fixture.fail((cmd, args) => cmd === 'actionQuery' && args.entityType === 'action' && args.initiativeId === record.entityId);
    await page.locator('#workspace-overview').click();
    await page.locator('#notice').waitFor({state:'visible'});
    await page.waitForFunction(() => document.activeElement.id === 'workspace-overview');
    await page.getByRole('button', {name:'关闭提示'}).click();
    await moved.scrollIntoViewIfNeeded();
    const contextScroll = await page.locator('main').evaluate(node => node.scrollTop);
    await moved.click();
    await page.waitForFunction(() => document.activeElement.id === 'mode');
    await page.locator('#editor').waitFor({state:'visible'});
    await page.locator('#workspace-references [data-path="moved-reference.md"][aria-current="true"]').waitFor({state:'attached'});
    assert.equal(await moved.getAttribute('aria-current'),'true');
    assert.equal(await page.locator('#workspace-notes [data-path="moved-reference.md"]').getAttribute('aria-current'), 'false');
    fixture.fail((cmd, args) => cmd === 'actionQuery' && args.entityType === 'action' && args.initiativeId === record.entityId);
    await page.locator('#reader-edit-initiative').click();
    await page.locator('#notice').waitFor({state:'visible'});
    assert.equal(await page.locator('#editor').isVisible(), true);
    assert.equal(await page.locator('#initiative-drawer').isHidden(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'reader-edit-initiative');
    await page.getByRole('button', {name:'关闭提示'}).click();
    // Shared reader back is the production control, not a simulated navigation callback.
    await page.locator('#back').click();
    await page.locator('#editor').waitFor({state:'hidden'});
    await page.locator('#workspace-references [data-path="moved-reference.md"][aria-current="true"]').waitFor({state:'attached'});
    assert.equal(await moved.getAttribute('aria-current'),'true');
    assert.equal(await moved.evaluate(node=>node===document.activeElement),true);
    assert.equal(await page.locator('main').evaluate(node => node.scrollTop),contextScroll);
    await page.locator('#workspace-back').click();
    const initiativeRow = page.locator(`#items [data-initiative-id="${record.entityId}"]`);
    await initiativeRow.evaluate(node => {
      if (node !== document.activeElement) throw Error('The original Initiative row must regain focus');
    });
    await page.keyboard.press('Enter');
    await page.locator('#initiative-new-note').click();
    await page.locator('#capture-title').fill('事项工作记录');
    await page.locator('#capture-body').fill('原样保留\n\n- [ ] 合成检查项');
    fixture.fail((cmd, args) => cmd === 'actionWrite' && args.entityType === 'initiative' && args.path.startsWith('revisions/'));
    await page.locator('#note-task-drawer button[type=submit]').click();
    await page.locator('#note-task-status').getByText('笔记已创建。请重试关联。').waitFor();
    assert.equal(await page.locator('#capture-title').inputValue(), '事项工作记录');
    assert.equal(await page.locator('#capture-title').evaluate(node => node.readOnly), true);
    await page.locator('#capture-title').press('X');
    assert.equal(await page.locator('#capture-title').inputValue(), '事项工作记录');
    assert.equal((await readdir(join(fixture.root, 'Notes'))).length, 1);
    await page.locator('#note-task-drawer button[type=submit]').click();
    await page.locator('#editor').waitFor({state:'visible'});
    const workingNote = (await allRecords(repository)).find(item => item.entityId === record.entityId).sources.find(source => source.role === 'working-note' && source.path.startsWith('Notes/'));
    assert.ok(workingNote?.path.startsWith('Notes/'));
    assert.deepEqual(await readdir(join(fixture.root, 'Notes')), [workingNote.path.split('/').pop()]);
    assert.equal(await readFile(join(fixture.root, workingNote.path), 'utf8'), '# 事项工作记录\n\n原样保留\n\n- [ ] 合成检查项');
    await page.locator('#back').click();
    await page.waitForFunction(() => document.activeElement.id === 'initiative-new-note');
    await page.locator('#initiative-new-action').click();
    assert.equal(await page.locator('#action-initiative').inputValue(), record.entityId);
    await page.locator('#action-description').fill('必须明确处理的行动');
    await page.locator('#action-save').click();
    await closeSavedAction(page);
    await page.waitForFunction(() => document.activeElement.id === 'initiative-new-action');
    const actions = new ActionRepository(fixture.adapter); await actions.open();
    const [created] = await allRecords(actions);
    assert.equal(created.initiativeId, record.entityId);
    const actionRow = page.locator(`#initiative-actions [data-action-id="${created.entityId}"]`);
    await actionRow.click();
    await page.locator('#action-description').fill('已编辑的关联行动');
    await page.locator('#action-save').click();
    await closeSavedAction(page);
    await page.waitForFunction(id => document.activeElement.dataset.actionId === id, created.entityId);
    const [edited] = await allRecords(actions);
    assert.equal(edited.entityId, created.entityId);
    assert.equal(edited.initiativeId, record.entityId);
    assert.equal(edited.description, '已编辑的关联行动');
    await page.locator('#workspace-overview').click();
    await page.locator('#initiative-status').selectOption('ended');
    await page.locator('#initiative-save').click();
    await page.locator('#initiative-save-state').filter({hasText:'尚未结束事项'}).waitFor();
    await page.locator('#initiative-decisions select').selectOption('completed');
    // A failure after the Action commit must retain that revision and allow retry.
    fixture.fail((cmd,args)=>cmd==='actionWrite'&&args.path.startsWith(`revisions/${record.entityId}/`));
    await page.locator('#initiative-save').click();
    await page.locator('#initiative-save-state details').waitFor();
    assert.match(await page.locator('#initiative-save-state').textContent(), /已保存的行动处理仍然有效/);
    assert.equal((await allRecords(actions))[0].status, 'completed');
    const afterFailure=await allRecords(repository);
    assert.equal(afterFailure.find(item=>item.entityId===record.entityId).status,'active');
    await page.locator('#initiative-discard').click();
    const leave = page.locator('#task-leave-decision');
    await leave.getByText(/已保存版本仍保留/).waitFor();
    await leave.getByRole('button', {name:'继续编辑'}).click();
    fixture.fail((cmd, args) => cmd === 'actionWrite' && args.path.startsWith(`revisions/${record.entityId}/`));
    await page.locator('#initiative-save').click();
    await page.locator('#initiative-save-state details').waitFor();
    assert.match(await page.locator('#initiative-save-state').textContent(), /已保存的行动处理仍然有效/);
    await page.reload();
    await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
    await page.locator('[data-view=initiatives]').click();
    await page.locator('#initiative-recover').click();
    await page.locator('#initiative-save-state').getByText(/已恢复事项草稿。已保存的行动处理仍然有效/).waitFor();
    await page.locator('#initiative-committed-actions').getByText(/已保存 1 项行动处理/).waitFor();
    await page.locator('#initiative-save').click();
    await page.locator('#initiative-drawer').waitFor({state:'hidden'});
    assert.equal((await allRecords(repository)).find(item=>item.entityId===record.entityId).status,'ended');
    assert.equal(await readFile(join(fixture.root,'moved-reference.md'),'utf8'),original);
    await page.reload();
    await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
    await page.locator('[data-view=initiatives]').click();
    await page.getByRole('heading',{name:'保存后重启核对',exact:true}).click();
    await page.locator('#workspace-state').filter({hasText:'已结束'}).waitFor({state:'attached'});
    assert.equal((await repository.history(record.entityId)).length,4);
    await moved.click();
    await page.locator('#reader-new-initiative-action').waitFor({state:'visible'});
    assert.equal(await page.locator('#reader-new-initiative-action').isDisabled(), true);
    await page.locator('#back').click();
    await page.waitForFunction(() => document.activeElement.dataset.path === 'moved-reference.md');
    await page.locator('#workspace-overview').click();
    await page.locator('#initiative-status').selectOption('active');
    await page.locator('#initiative-reopening').waitFor({state:'visible'});
    await page.locator('#initiative-save').click();
    await page.waitForFunction(() => document.activeElement.id === 'workspace-overview');
    assert.equal((await allRecords(repository)).find(item=>item.entityId===record.entityId).status, 'active');
    assert.equal((await allRecords(actions))[0].status, 'completed');
    assert.equal((await actions.history(created.entityId)).length, 3);
    const captureThen = async (title, next) => {
      let releaseQuery;
      const held = new Promise(started => {
        pauseActionQuery = id => new Promise(resolve => { releaseQuery = resolve; started(id); });
      });
      await page.locator('#initiative-new-note').click();
      await page.locator('#capture-title').fill(title);
      await page.locator('#note-task-drawer button[type=submit]').click();
      const heldId = await held;
      await next();
      releaseQuery();
      await page.waitForFunction(id => window.lastInitiativeActionReply === id, heldId);
      assert.equal(await page.locator('#editor').isHidden(), true);
      assert.ok((await allRecords(repository)).find(item => item.entityId === record.entityId).sources.some(source => source.quote === '# ' + title));
    };
    await captureThen('返回列表时保存的工作笔记', async () => {
      await page.locator('#workspace-back').click();
      await page.waitForFunction(id => document.activeElement.dataset.initiativeId === id, record.entityId);
    });
    await initiativeRow.click();
    await captureThen('打开行动时保存的工作笔记', async () => {
      await page.locator('#initiative-new-action').click();
      await page.locator('#action-description').fill('保留新任务的编辑');
    });
    assert.equal(await page.locator('#action-description').inputValue(), '保留新任务的编辑');
    assert.equal(await page.locator('#task-leave-decision').count(), 0);
    assert.deepEqual(errors,[]);
    console.log('PASS actual application: real storage reload, note return, shared Action and explicit ending retry with immutable partial commit; source bytes preserved.');
} finally { await browser.close(); await fixture.close(); }
