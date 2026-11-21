import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'build/issue69-browser';
const fixture = await storageFixture();
const secondFixture = await storageFixture();
let activeFixture = fixture;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
let delayPath, releaseRead, readBegan, loseRevisionReply = false;
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'choose') { activeFixture = secondFixture; return {}; }
      if (request.cmd === 'read' && request.path === delayPath) { delayPath = null; const text = await readFile(join(activeFixture.root,request.path),'utf8'); readBegan(); await new Promise(resolve => releaseRead = resolve); return {text}; }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        if (loseRevisionReply && request.cmd==='actionWrite' && request.path.startsWith('revisions/')) { loseRevisionReply=false; throw Error('Controlled lost reply after durable revision'); }
        return result;
      }
      const workspace = await activeFixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(activeFixture.root, request.path || '');
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

  const original=await readFile(sourcePath,'utf8');
  const start=performance.now();
  await page.goto('https://notes.test/');
  await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.locator('#action-new').click();
  await page.locator('#action-description').fill('用于检查来源身份与不可变版本的很长中文行动描述'.repeat(4));
  await page.locator('#action-options').evaluate(n=>n.open=true);
  await page.locator('#action-due').fill('2020-01-01');
  await page.locator('#action-waiting').fill('等待对方确认');
  await page.locator('#action-status').selectOption('waiting');
  const prefix=process.env.ACTION_BASELINE?'before':'after';
  await mkdir('build/issue95-browser',{recursive:true});
  for(const [width,height] of [[1180,800],[393,800],[393,340]]) {
    await page.setViewportSize({width,height});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:`build/issue95-browser/${prefix}-${width}-${height}.png`});
  }
  await page.setViewportSize({width:1180,height:800});
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').dataset.state==='saved');
  const workspace=(await fixture.adapter('workspace')).workspaceId;
  let records=(await fixture.adapter('actionQuery',{workspaceId:workspace,limit:30})).actions;
  assert.equal(records.length,1);const id=records[0].entityId, revision=records[0].revision;
  await page.locator('#action-status').selectOption('completed');
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').dataset.state==='saved');
  await page.locator('#action-history').evaluate(n=>{n.closest('details').open=true;});
  await page.locator('#action-history').click();
  await page.waitForFunction(()=>document.querySelectorAll('.action-revision').length===2);
  assert.match(await page.locator('#action-revisions').textContent(),/已完成/);
  await page.locator('#action-back').click();
  await page.locator('#action-filter').selectOption('completed');
  await page.locator('#items [data-entity-id]').waitFor();
  assert.equal(await page.locator('#items [data-entity-id]').count(),1);
  await page.reload();await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.locator(`#items [data-entity-id="${id}"]`).click();
  await page.locator('#action-drawer[open]').waitFor();
  assert.equal(await page.locator('#action-status').inputValue(),'completed');
  await page.locator('#action-history').evaluate(n=>{n.closest('details').open=true;});
  await page.locator('#action-history').click();
  await page.waitForFunction(()=>document.querySelectorAll('.action-revision').length===2);
  assert.match(await page.locator('#action-revisions').textContent(),new RegExp(revision));
  await page.locator('#action-status').selectOption('todo');
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').dataset.state==='saved');
  fixture.fail((cmd,args)=>cmd==='actionWrite' && args.path.startsWith('actions/'),2);
  await page.locator('#action-focus').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').textContent.includes('版本已保存'));
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').dataset.state==='saved');
  await page.waitForFunction(()=>document.querySelector('#action-focus').textContent==='移出当前重点');
  await page.locator('#action-history').click();
  await page.waitForFunction(()=>document.querySelectorAll('.action-revision').length===4);
  assert.ok((await fixture.adapter('actionQuery',{workspaceId:workspace,limit:30})).actions[0].focusPosition!==null);
  await page.locator('#action-description').focus();
  await page.locator('#action-description').evaluate(n=>n.setSelectionRange(2,5));
  await page.keyboard.type('中文');
  assert.equal(await page.locator('#action-description').evaluate(n=>n.selectionStart),4);
  assert.equal(await readFile(sourcePath,'utf8'),original);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS Action create/status/filter/history/persisted reload/caret/source preservation',elapsedMs:Math.round(performance.now()-start),reads:fixture.calls.filter(c=>c.cmd==='referenceBody').length,queries:fixture.calls.filter(c=>c.cmd==='actionQuery').length}));
} finally { await browser.close(); await fixture.close(); await secondFixture.close(); }
