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
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation-labels.js', 'directory-label.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../build/web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  const original = '# Original\n\n[[folder/Second|第二份]]\n\n- **确认** next\n\n| 名称 | 值 |\n| --- | --- |\n| 合成 | `a` |\n\n- [ ] 历史待核对事项\n';
  await writeFile(sourcePath, original);
  await mkdir(join(fixture.root,'folder'),{recursive:true});
  await writeFile(join(fixture.root,'folder/Second.md'),'# Second\n\nNested source');
  await page.goto('https://notes.test/');
  await page.locator('[data-view=notes]').click();
  await page.locator('#items [data-path="reference.md"]').click();
  const count = async () => (await activeFixture.adapter('actionQuery',{limit:100, workspaceId:(await activeFixture.adapter('workspace')).workspaceId})).actions;
  const open = async () => { await page.locator('#note-create-action').click(); await page.locator('#action-drawer[open]').waitFor(); };
  await open(); assert.equal((await count()).length,0);
  await page.setViewportSize({width:393,height:550});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.setViewportSize({width:1180,height:800});
  await page.locator('#action-back').click();
  assert.equal((await count()).length,0);
  await open();
  await page.locator('#action-description').fill('');
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-description').getAttribute('aria-invalid')==='true');
  await page.locator('#action-description').fill('Confirmed note action');
  await page.evaluate(()=>{document.querySelector('#action-form').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('#action-form').dispatchEvent(new Event('submit',{cancelable:true}));});
  await page.locator('#action-drawer').waitFor({state:'hidden'});
  assert.equal((await count()).length,1);
  assert.equal((await count())[0].sources[0].path,'reference.md');
  // Formatted list evidence is original Markdown, with selection retained on return.
  await page.evaluate(()=>{const r=document.createRange();r.selectNodeContents(document.querySelector('#reading li'));getSelection().removeAllRanges();getSelection().addRange(r);});
  await page.locator('#passage-create-action').click(); await page.locator('#action-drawer[open]').waitFor();
  assert.match(await page.locator('.source-quote').inputValue(),/\*\*确认\*\*/);
  await page.locator('#action-description').fill('Confirmed list action');
  await page.locator('#action-save').click(); await page.locator('#action-drawer').waitFor({state:'hidden'});
  assert.equal((await count()).length,2);
  assert.equal(await page.evaluate(()=>getSelection().toString()),'确认 next');
  await page.evaluate(()=>{const r=document.createRange();r.selectNodeContents(document.querySelector('#reading table'));getSelection().removeAllRanges();getSelection().addRange(r);});
  await page.locator('#passage-create-action').click(); await page.locator('#action-drawer[open]').waitFor();
  assert.match(await page.locator('.source-quote').inputValue(),/\| 合成 \| `a` \|/);
  await page.locator('#action-description').fill('Table source action');
  // Changed source rejects confirmation without losing user input.
  await writeFile(sourcePath,original+'Changed');
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').textContent.includes('来源已更改'));
  assert.equal(await page.locator('#action-description').inputValue(),'Table source action');
  assert.equal((await count()).length,2);
  await rename(sourcePath,sourcePath+'.moved');
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').textContent.includes('ENOENT'));
  assert.equal((await count()).length,2);
  await rename(sourcePath+'.moved',sourcePath);
  await writeFile(sourcePath,original);
  await page.locator('#action-save').click(); await page.locator('#action-drawer').waitFor({state:'hidden'});
  assert.equal((await count()).length,3);
  console.log('PASS confirmation, source fidelity and changed/moved guards');
  // Revision and repair failures retain the same input/commit for explicit retry.
  await open(); await page.locator('#action-description').fill('Retry revision');
  fixture.fail((cmd,args)=>cmd==='actionWrite' && args.path.startsWith('revisions/'));
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').dataset.state==='failed');
  assert.equal((await count()).length,3);
  assert.equal(await page.locator('#action-description').inputValue(),'Retry revision');
  await page.locator('#action-back').click();
  await page.getByRole('dialog',{name:'离开行动',exact:true}).waitFor();
  assert.equal(await page.locator('dialog[open]').last().textContent().then(t=>t.includes('版本已保存')),false);
  await page.getByRole('button',{name:'继续编辑',exact:true}).click();
  await page.locator('#action-save').click(); await page.locator('#action-drawer').waitFor({state:'hidden'});
  assert.equal((await count()).length,4);
  await open(); await page.locator('#action-description').fill('Repair committed revision');
  fixture.fail((cmd,args)=>cmd==='actionWrite' && args.path.startsWith('actions/'),2);
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').textContent.includes('恢复尚未完成'));
  await page.locator('#action-save').click(); await page.locator('#action-drawer').waitFor({state:'hidden'});
  assert.equal((await count()).length,5);
  await open(); await page.locator('#action-description').fill('Ambiguous durable write');
  loseRevisionReply=true;
  await page.locator('#action-save').click();
  await page.waitForFunction(()=>document.querySelector('#action-save-state').dataset.state==='failed');
  // Reload simulates termination after a durable write but before its receipt.
  await page.reload();
  await page.locator('[data-view=notes]').click();
  await page.locator('#items [data-path="reference.md"]').click();
  await open();
  assert.equal(await page.locator('#action-description').inputValue(),'Ambiguous durable write');
  await page.locator('#action-save').click(); await page.locator('#action-drawer').waitFor({state:'hidden'});
  assert.equal((await count()).length,6);
  console.log('PASS failed writes and lost-reply restart identity');
  // Nested route survives contextual commit.
  await page.locator('#reading .wiki-link').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  await open(); await page.locator('#action-save').click(); await page.locator('#action-drawer').waitFor({state:'hidden'});
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
  assert.equal(await readFile(sourcePath,'utf8'),original);
  await page.locator('#mode').click(); await page.locator('#mode').click();
  await page.locator('#passage-create-action').click();
  assert.equal(await page.locator('#action-drawer').evaluate(n=>n.open),false);
  await page.locator('[data-view=focus]').click(); await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#items [data-entity-id]').length===7);
  console.log('PASS nested return and action management');
  await page.getByRole('button',{name:'关闭提示',exact:true}).click();
  const selected = (await count()).find(record => record.description === 'Confirmed list action');
  await page.locator('#search').fill('Confirmed list');
  await page.locator('#action-filter').selectOption('todo');
  await page.locator(`#items [data-entity-id="${selected.entityId}"]`).click();
  const openSource = page.getByRole('button',{name:'打开来源：reference.md',exact:true});
  await page.locator('#action-description').fill('Confirmed list action edited before opening source');
  await openSource.click();
  await page.getByRole('button',{name:'保存并离开',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md' && document.querySelector('#reading').getClientRects().length);
  const updated = (await count()).find(record => record.entityId === selected.entityId);
  assert.notEqual(updated.revision,selected.revision);
  assert.deepEqual(updated.sources,selected.sources);
  await page.locator('#back').click();
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='打开来源：reference.md');
  assert.equal(await page.locator('#action-description').inputValue(),updated.description);
  assert.equal(await page.locator('#search').inputValue(),'Confirmed list');
  assert.equal(await page.locator('#action-filter').inputValue(),'todo');
  assert.equal(await page.locator(`#items [data-entity-id="${selected.entityId}"]`).getAttribute('aria-current'),'true');
  await page.locator('#action-back').click();
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.entityId),selected.entityId);
  assert.equal(await readFile(sourcePath,'utf8'),original);
  console.log('PASS saved source detour, real identity and return focus');
  // Late source reads may not reopen a drawer after workspace switching.
  await page.locator('[data-view=notes]').click();
  if (await page.locator('#notice').isVisible()) await page.getByRole('button',{name:'关闭提示',exact:true}).click();
  await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#reading').waitFor({state:'visible'});
  let readStarted;
  const started = new Promise(resolve=>readStarted=resolve);
  delayPath='reference.md'; readBegan=readStarted;
  await page.evaluate(()=>document.querySelector('#note-create-action').click());
  await Promise.race([started,new Promise((_,reject)=>setTimeout(()=>reject(Error('Delayed source read did not begin')),5000))]);
  await page.evaluate(()=>document.querySelector('#choose').click());
  await page.waitForFunction(()=>document.querySelector('#editor').hidden);
  releaseRead();
  await page.waitForFunction(()=>!document.querySelector('#note-create-action').disabled);
  assert.equal(await page.locator('#action-drawer').evaluate(n=>n.open),false);
  activeFixture=fixture;
  assert.deepEqual(errors,[]);
  console.log('PASS issue69 note/list/table confirmation, cancel, double submission, validation/source-change retry and nested return through isolated storage');
} finally { await browser.close(); await fixture.close(); await secondFixture.close(); }
