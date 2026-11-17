import {readFile, writeFile, readdir, stat, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'docs/validation/issue47';
const fixture = await storageFixture();
let activeFixture = fixture, alternateFixture;
let delayTopic = false, releaseTopic;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'actionWrite' && delayTopic) { delayTopic = false; await new Promise(resolve=>{releaseTopic=resolve;}); }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        return result;
      }
      if (request.cmd === 'choose') { activeFixture = alternateFixture || fixture; return {}; }
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
        case 'create': await mkdir(join(path, '..'), {recursive:true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'presentation.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.INITIATIVE_ASSETS_DIR ? join(process.env.INITIATIVE_ASSETS_DIR, name) : new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('[data-view=initiatives]').click();
  await page.locator('#initiative-new').click();
  await page.locator('#initiative-title').waitFor();
  const shot = async name => page.screenshot({path:join(evidence,name+'.png')});
  for (const width of [1180,393]) { await page.setViewportSize({width,height:800}); await shot(`${process.env.INITIATIVE_ASSETS_DIR?'before':'after'}-form-${width}`); }
  if (!process.env.INITIATIVE_ASSETS_DIR) {
    await page.setViewportSize({width:1180,height:800});
    const submit=page.locator('#initiative-save'), panel=page.locator('#initiative-drawer');
    const closed=()=>page.waitForFunction(()=>!document.querySelector('#initiative-drawer').open);
    const open=async()=>{await page.locator('#initiative-new').click();await panel.waitFor({state:'visible'});};
    const edit=async()=>{await page.locator('#workspace-overview').click();await panel.waitFor({state:'visible'});};
    await page.locator('#initiative-discard').click(); await closed();
    assert.equal(await page.locator('#items [data-initiative-id]').count(),0);
    await open(); await submit.click(); assert.equal(await page.locator('#initiative-title').getAttribute('aria-invalid'),'true');
    await page.locator('#initiative-title').fill('长期中文事项与资料整理'.repeat(8));
    await page.locator('#initiative-goal').fill('保持现有上下文'.repeat(40));
    await page.locator('#initiative-progress').fill('保存后继续推进'.repeat(40));
    for(const selector of ['#initiative-discard','#initiative-drawer .ui-drawer-header button']){
      await page.locator(selector).click();await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    }
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    await page.locator('#choose').evaluate(n=>n.click());await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    await page.locator('#back').evaluate(n=>n.click());await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    await page.locator('#search').evaluate(n=>n.focus());assert.equal(await page.locator('#search').evaluate(n=>n===document.activeElement),false);
    for(let i=0;i<25;i++){await page.keyboard.press('Tab');assert.ok(await panel.evaluate(n=>n.contains(document.activeElement)));}
    await shot('after-long-desktop');await page.setViewportSize({width:393,height:340});
    assert.equal(await panel.evaluate(n=>Math.round(n.getBoundingClientRect().width)),393);
    const footer=await submit.boundingBox();assert.ok(footer.y+footer.height<=340);assert.ok(footer.height>=44);
    await shot('after-short-393');
    fixture.fail(cmd=>cmd==='actionWrite');await submit.click();
    await page.getByText(/未保存的编辑仍保留/).waitFor();assert.ok((await page.locator('#initiative-title').inputValue()).length>40);await shot('after-failure');
    await submit.click();await closed();
    assert.equal(await page.locator('#items [data-initiative-id]').count(),1);
    await page.setViewportSize({width:1180,height:800});await page.locator('#items [data-initiative-id]').click();
    await edit();assert.ok((await page.locator('#initiative-title').inputValue()).length>40);
    await page.locator('#initiative-title').fill('已保存事项');await submit.click();await closed();
    await edit();assert.equal(await page.locator('#initiative-title').inputValue(),'已保存事项');await page.locator('#initiative-discard').click();await closed();
    await edit();await page.locator('#initiative-progress').fill('恢复的真实草稿');await page.reload();
    await page.getByRole('heading',{name:'当前重点',level:2,exact:true}).waitFor();await page.locator('[data-view=initiatives]').click();
    await panel.waitFor({state:'visible'});assert.equal(await page.locator('#initiative-progress').inputValue(),'恢复的真实草稿');await submit.click();await closed();
    await page.locator('#items [data-initiative-id]').click();await edit();
    await page.locator('#initiative-status').selectOption('ended');await submit.click();await closed();
    await edit();assert.equal(await page.locator('#initiative-status').inputValue(),'ended');
    await page.locator('#initiative-status').selectOption('active');await submit.click();await closed();
    await edit();assert.equal(await page.locator('#initiative-status').inputValue(),'active');await page.locator('#initiative-discard').click();await closed();
    const before=await readFile(sourcePath,'utf8');
    await open();await page.locator('#initiative-title').fill('重复提交保护');delayTopic=true;await submit.click();
    await page.waitForFunction(()=>document.querySelector('#initiative-form').inert);
    await page.locator('#initiative-form').evaluate(n=>{n.dispatchEvent(new Event('submit',{cancelable:true}));n.dispatchEvent(new Event('submit',{cancelable:true}));});
    await page.keyboard.press('Escape');assert.ok(await panel.evaluate(n=>n.open));releaseTopic();await closed();
    assert.equal(await page.locator('#items [data-initiative-id]').count(),2);assert.equal(await readFile(sourcePath,'utf8'),before);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS initiative drawer: real persistence, create/edit/reopen, clean cancel, dirty close/cancel/Escape, focus containment, failure/retry, recovery, end/reopen, duplicate submission, desktop/393px/short layout');
} finally { await browser.close(); await fixture.close(); if(alternateFixture)await alternateFixture.close(); }
