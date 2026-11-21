import {closeSavedAction} from './form-journeys.js';
import {readFile, writeFile, readdir, stat, mkdir, rename, rm} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {InitiativeRepository, allRecords} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const evidence='docs/validation/issue96'; await mkdir(evidence,{recursive:true});
const baseline=Boolean(process.env.INITIATIVE_BASELINE);
const assetRoot=baseline?'build/issue96-baseline':'build/web';
let activeFixture = fixture;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const bridgeCalls = [];
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  const original = await readFile(sourcePath, 'utf8');
  await page.exposeFunction('bridge', async request => {
    try {
      bridgeCalls.push(request.cmd);
      if (request.cmd.startsWith('ai')) throw Error('Unexpected AI request');
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
    await route.fulfill({body: await readFile(join(assetRoot,name)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  const repository=new InitiativeRepository(fixture.adapter); await repository.open();
  const record=(await repository.save({title:'长期中文事项与资料核对'.repeat(6),goal:'逐字保留原文与任务标记'.repeat(12),progress:'核对中'.repeat(18),status:'active',sources:[{path:'reference.md',quote:'Run the sample command',fingerprint:'',role:'reference'}]})).record;
  const started=performance.now();
  await page.goto('https://notes.test/');
  await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('[data-view=initiatives]').click();
  await page.locator('#items [data-initiative-id]').click();
  const ready=performance.now()-started;
  for(const [width,height] of [[1180,800],[393,852],[1180,480]]) {
    await page.setViewportSize({width,height});
    await page.screenshot({path:`${evidence}/${baseline?'before':'after'}-context-${width}-${height}.png`});
    await page.locator('#workspace-overview').click();
    await page.locator('#initiative-drawer').waitFor({state:'visible'});
    await page.locator('#initiative-title').focus();
    await page.locator('#initiative-title').evaluate(node=>node.setSelectionRange(2,6));
    assert.deepEqual(await page.locator('#initiative-title').evaluate(node=>[node.selectionStart,node.selectionEnd]),[2,6]);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#initiative-goal').evaluate(node=>node===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:`${evidence}/${baseline?'before':'after'}-form-${width}-${height}.png`});
    await page.locator('#initiative-discard').click();
  }
  console.log(JSON.stringify({surface:baseline?'baseline':'migrated',readyMs:Math.round(ready),bridgeCommands:bridgeCalls.length,reads:bridgeCalls.filter(cmd=>cmd==='read').length,queries:bridgeCalls.filter(cmd=>cmd==='actionQuery').length}));
  if(!baseline) {
    await page.setViewportSize({width:1180,height:800});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#workspace-overview').click();
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
    await moved.click();
    await page.locator('#editor').waitFor({state:'visible'});
    await page.locator('#workspace-references [data-path="moved-reference.md"][aria-current="true"]').waitFor({state:'attached'});
    assert.equal(await moved.getAttribute('aria-current'),'true');
    await page.locator('#editor').waitFor({state:'visible'});
    // Shared reader back is the production control, not a simulated navigation callback.
    await page.locator('#back').click();
    await page.locator('#editor').waitFor({state:'hidden'});
    await page.locator('#workspace-references [data-path="moved-reference.md"][aria-current="true"]').waitFor({state:'attached'});
    assert.equal(await moved.getAttribute('aria-current'),'true');
    assert.equal(await moved.evaluate(node=>node===document.activeElement),true);
    await page.locator('#initiative-new-action').click();
    await page.locator('#action-description').fill('必须明确处理的行动');
    await page.locator('#action-save').click();
    await closeSavedAction(page);
    await page.locator('[data-action-id]').filter({hasText:'必须明确处理的行动'}).waitFor();
    await page.locator('#workspace-overview').click();
    await page.locator('#initiative-status').selectOption('ended');
    await page.locator('#initiative-save').click();
    await page.locator('#initiative-save-state').filter({hasText:'尚未结束事项'}).waitFor();
    await page.locator('#initiative-decisions select').selectOption('completed');
    // A failure after the Action commit must retain that revision and allow retry.
    fixture.fail((cmd,args)=>cmd==='actionWrite'&&args.path.startsWith(`revisions/${record.entityId}/`));
    await page.locator('#initiative-save').click();
    await page.locator('#initiative-save-state details').waitFor();
    const afterFailure=await allRecords(repository);
    assert.equal(afterFailure.find(item=>item.entityId===record.entityId).status,'active');
    await page.locator('#initiative-save').click();
    await page.locator('#initiative-drawer').waitFor({state:'hidden'});
    assert.equal((await allRecords(repository)).find(item=>item.entityId===record.entityId).status,'ended');
    assert.equal(await readFile(join(fixture.root,'moved-reference.md'),'utf8'),original);
    await page.reload();
    await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
    await page.locator('[data-view=initiatives]').click();
    await page.getByRole('heading',{name:'保存后重启核对',exact:true}).click();
    await page.locator('#workspace-state').filter({hasText:'已结束'}).waitFor({state:'attached'});
    assert.equal((await repository.history(record.entityId)).length,3);
    assert.deepEqual(errors,[]);
    console.log('PASS actual application: real storage reload, note return, shared Action and explicit ending retry with immutable partial commit; source bytes preserved.');
  }
} finally { await browser.close(); await fixture.close(); }
