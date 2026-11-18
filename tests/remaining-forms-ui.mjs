import {readFile, writeFile, readdir, stat, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'docs/validation/issue48';
const fixture = await storageFixture();
let failCreate = false, holdCreate = false, releaseCreate, holdAction = false, releaseAction;
let createCalls = 0;
const {TopicRepository} = await import('../web/library.js');
const topics = new TopicRepository(fixture.adapter); await topics.open();
await topics.save({description:'专项验证主题',sources:[]});
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const screenshot = async path => { await page.evaluate(()=>document.fonts.ready); await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); await page.waitForTimeout(180); await page.screenshot({path,animations:'disabled'}); };
  const errors = []; page.on('pageerror', error => errors.push(error.message));

  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'actionWrite' && holdAction) { holdAction = false; await new Promise(resolve=>{releaseAction=resolve;}); }
      if (request.cmd === 'create') { createCalls++; if (holdCreate) { holdCreate = false; await new Promise(resolve=>{releaseCreate=resolve;}); } }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await fixture.adapter(request.cmd, request);
        return result;
      }
      if (request.cmd === 'choose') return {};
      const workspace = await fixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      if (request.cmd === 'create' && failCreate) { failCreate = false; throw Error('Injected create failure'); }
      const path = join(fixture.root, request.path || '');
      switch (request.cmd) {
        case 'metadata':
        case 'list': {
          const notes = [];
          for (const name of await readdir(fixture.root)) if (name.endsWith('.md')) notes.push({path: name, size: (await stat(join(fixture.root, name))).size, modified: (await stat(join(fixture.root, name))).mtimeMs / 1000});
          return {notes, root: fixture.root};
        }
        case 'move': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await mkdir(join(fixture.root, request.target, '..'), {recursive:true}); await rename(path, join(fixture.root, request.target)); return {};
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
    if (!['index.html', 'style.css', 'app.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('[data-view=notes]').click();
  await page.locator('#items .card').first().waitFor();
  if (process.env.FORM_BASELINE) {
    await page.locator('#new').click();
    for (const width of [1180,393]) { await page.setViewportSize({width,height:800}); await screenshot(join(evidence,`before-capture-${width}.png`)); }
    await page.locator('[data-view=focus]').click(); await page.getByRole('button',{name:'全部行动',exact:true}).click();
    await page.locator('#action-new').click();
    for (const width of [1180,393]) { await page.setViewportSize({width,height:800}); await screenshot(join(evidence,`before-action-${width}.png`)); }
    await page.getByText('放弃编辑',{exact:true}).click(); await page.locator('#action-discard').click();
    await page.locator('[data-view=notes]').click(); await page.locator('#items [data-path="reference.md"]').click();
    await page.locator('#note-details').evaluate(node=>node.open=true);
    for (const width of [1180,393]) { await page.setViewportSize({width,height:800}); await screenshot(join(evidence,`before-note-info-${width}.png`)); }
    console.log('PASS baseline real-storage browser captures at starting SHA');
  } else {
  assert.equal(await page.locator('#library-rename-topic').isDisabled(),true);
  await page.locator('#new').click(); await page.locator('#note-task-drawer .ui-drawer-footer button').first().click();
  assert.equal(createCalls,0,'Clean cancellation must not create a file');
  await page.locator('#new').click();
  await page.getByRole('button', {name: '创建笔记', exact: true}).click();
  await page.locator('#note-task-drawer [role=status]').filter({hasText: '内容需要核对'}).waitFor();
  await page.locator('#capture-title').fill('短表单真实存储');
  await page.locator('#capture-body').fill('保留正文与草稿。'.repeat(80));
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: '继续编辑', exact: true}).click();
  assert.equal(await page.locator('#capture-title').inputValue(), '短表单真实存储');
  assert.equal(await page.locator('#capture-body').evaluate(node=>node===document.activeElement),true);
  for (const dismiss of [()=>page.locator('#note-task-drawer .ui-drawer-header button').click(),()=>page.locator('#note-task-drawer .ui-drawer-footer button').first().click(),()=>page.mouse.click(20,200),()=>page.locator('[data-view=notes]').evaluate(node=>node.click())]) {
    await dismiss(); await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    assert.equal(await page.locator('#capture-title').inputValue(),'短表单真实存储');
  }
  await page.getByRole('button',{name:'创建笔记',exact:true}).focus(); await page.keyboard.press('Tab');
  assert.equal(await page.locator('#note-task-drawer .ui-drawer-header button').evaluate(node=>node===document.activeElement),true);
  await page.keyboard.press('Shift+Tab'); assert.equal(await page.getByRole('button',{name:'创建笔记',exact:true}).evaluate(node=>node===document.activeElement),true);
  for (const [width,height] of [[1180,800],[393,800],[393,340]]) {
    await page.setViewportSize({width,height});
    const footer = page.locator('#note-task-drawer .ui-drawer-footer');
    assert.ok(await footer.evaluate(node => node.getBoundingClientRect().bottom <= innerHeight));
    await page.locator('#note-task-drawer .ui-drawer-body').evaluate(node => node.scrollTop = node.scrollHeight);
    await screenshot(join(evidence,`capture-${width}-${height}.png`));
  }
  failCreate = true;
  await page.getByRole('button', {name: '创建笔记', exact: true}).click();
  await page.locator('#note-task-drawer [role=status]').filter({hasText: '未保存的编辑仍保留'}).waitFor();
  assert.equal(await page.locator('#capture-title').inputValue(), '短表单真实存储');
  holdCreate = true; const callsBefore = createCalls;
  await page.getByRole('button', {name: '创建笔记', exact: true}).click();
  await page.waitForFunction(()=>document.querySelector('#note-task-form').inert);
  assert.equal(await page.getByRole('button',{name:'创建笔记',exact:true}).isDisabled(),true);
  await page.locator('#note-task-form').evaluate(node=>{node.dispatchEvent(new Event('submit',{cancelable:true}));node.dispatchEvent(new Event('submit',{cancelable:true}));});
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#note-task-drawer').evaluate(n=>n.open),true);
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),true);
  assert.equal(createCalls,callsBefore+1); releaseCreate();
  await page.locator('#note-task-drawer').waitFor({state:'hidden'});
  const files = await readdir(join(fixture.root,'Notes'));
  assert.equal(files.length,1);
  assert.match(await readFile(join(fixture.root,'Notes',files[0]),'utf8'), /短表单真实存储/);
  const workspaceId=(await fixture.adapter('workspace')).workspaceId;
  await page.evaluate(({workspaceId,path})=>localStorage.setItem(`capture-draft:${workspaceId}`,JSON.stringify({'capture-title':'短表单真实存储','capture-body':'保留正文与草稿。'.repeat(80),'capture-path':path})),{workspaceId,path:'Notes/'+files[0]});
  await page.locator('#new').click(); await page.getByRole('button',{name:'创建笔记',exact:true}).click(); await page.locator('#note-task-drawer').waitFor({state:'hidden'});
  assert.equal((await readdir(join(fixture.root,'Notes'))).length,1,'Recovered already-committed capture must not duplicate');
  await page.locator('#new').click(); await page.locator('#capture-title').fill('恢复的输入');
  await page.reload(); await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('#new').click(); assert.equal(await page.locator('#capture-title').inputValue(),'恢复的输入');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  assert.equal((await readdir(join(fixture.root,'Notes'))).length,1);
  await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.locator('#action-new').click(); await page.locator('#action-save').click();
  await page.locator('#action-save-state').filter({hasText:'内容需要核对'}).waitFor();
  await page.locator('#action-description').fill('抽屉行动真实保存');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'继续编辑',exact:true}).click();
  holdAction = true;
  await page.locator('#action-save').click(); await page.waitForFunction(()=>document.querySelector('#action-form').inert);
  await page.locator('#action-form').evaluate(node=>{node.dispatchEvent(new Event('submit',{cancelable:true}));node.dispatchEvent(new Event('submit',{cancelable:true}));});
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#action-drawer').evaluate(n=>n.open),true);
  releaseAction(); await page.locator('#action-drawer').waitFor({state:'hidden'});
  await page.getByRole('heading',{name:'抽屉行动真实保存',exact:true}).click();
  await page.locator('#action-save-state').filter({hasText:/^已保存到本地$/}).waitFor();
  for (const [width,height] of [[1180,800],[393,800],[393,340]]) {
    await page.setViewportSize({width,height});
    await page.locator('#action-drawer .ui-drawer-body').evaluate(node => node.scrollTop = 0);
    await screenshot(join(evidence,`action-top-${width}-${height}.png`));
    await page.locator('#action-drawer .ui-drawer-body').evaluate(node => node.scrollTop = node.scrollHeight);
    await screenshot(join(evidence,`action-${width}-${height}.png`));
  }
  await page.keyboard.press('Escape');
  await page.locator('#action-new').click(); await page.locator('#action-back').click();
  assert.equal(await page.locator('#action-new').evaluate(node=>node===document.activeElement),true,'Clean cancel restores the New action opener, not the prior selection');
  await page.getByRole('heading',{name:'抽屉行动真实保存',exact:true}).click();
  await page.locator('#action-drawer').waitFor({state:'visible'});
  assert.equal(await page.locator('#action-description').inputValue(),'抽屉行动真实保存');
  await page.keyboard.press('Escape');
  await page.locator('[data-view=notes]').click(); await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#note-info-open').click();
  fixture.fail((cmd,args)=>cmd==='actionWrite'&&args.entityType==='topic'&&args.path.startsWith('revisions/'));
  await page.getByLabel('专项验证主题',{exact:true}).check();
  await page.locator('#note-topics [role=alert]').filter({hasText:'未保存的编辑仍保留'}).waitFor();
  assert.equal(await page.getByLabel('专项验证主题',{exact:true}).isChecked(),false);
  await page.getByLabel('专项验证主题',{exact:true}).check(); await page.waitForFunction(()=>!document.querySelector('#note-topics').inert);
  assert.ok(await page.locator('#note-info-drawer input[type=checkbox]').evaluate(node=>node.getBoundingClientRect().width===20));
  await topics.recover(); const linkedTopic=(await topics.query()).actions[0]; assert.equal(linkedTopic.sources[0].path,'reference.md');
  fixture.fail((cmd,args)=>cmd==='referenceTags'&&args.path==='reference.md');
  await page.getByLabel('专项验证主题',{exact:true}).uncheck();
  await page.getByText('主题关联已保存，但列表尚未更新。请重试更新。',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('专项验证主题',{exact:true}).isChecked(),false);
  assert.equal(await page.getByLabel('专项验证主题',{exact:true}).isDisabled(),true);
  await topics.recover(); const historyCount=(await topics.history(linkedTopic.entityId)).length;
  fixture.fail(cmd=>cmd==='metadata'); await page.getByRole('button',{name:'重试更新关联',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#note-topics').inert);
  assert.equal(await page.getByLabel('专项验证主题',{exact:true}).isDisabled(),true);
  await page.getByText('主题关联已保存，但列表尚未更新。请重试更新。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'重试更新关联',exact:true}).click(); await page.waitForFunction(()=>!document.querySelector('#note-topics').inert);
  assert.equal(await page.getByLabel('专项验证主题',{exact:true}).isDisabled(),false);
  assert.equal(await page.getByLabel('专项验证主题',{exact:true}).isChecked(),false);
  await topics.recover(); assert.equal((await topics.history(linkedTopic.entityId)).length,historyCount,'Post-commit index retry must not create another revision');
  await page.getByLabel('专项验证主题',{exact:true}).check(); await page.waitForFunction(()=>!document.querySelector('#note-topics').inert);
  for (const [width,height] of [[1180,800],[393,800],[393,340]]) {
    await page.setViewportSize({width,height});
    await screenshot(join(evidence,`note-info-${width}-${height}.png`));
  }
  await page.locator('#note-info-drawer .ui-drawer-footer button').click();
  assert.equal(await page.locator('#note-info-open').evaluate(node=>node===document.activeElement),true);
  // WKWebView blurs a focused opener while the async button helper disables it.
  await page.locator('#note-info-open').evaluate(node=>{node.blur();node.click();});
  await page.locator('#note-info-drawer').waitFor({state:'visible'});
  await page.locator('#note-info-drawer .ui-drawer-footer button').click();
  assert.equal(await page.locator('#note-info-open').evaluate(node=>node===document.activeElement),true);
  await page.locator('#note-info-open').click();
  await page.locator('#rename').click();
  for (const [width,height] of [[1180,800],[393,800],[393,340]]) { await page.setViewportSize({width,height}); await screenshot(join(evidence,`location-${width}-${height}.png`)); }
  await page.locator('#note-location').fill('../invalid.md');
  await page.locator('#note-task-drawer .primary').click();
  await page.locator('#note-task-drawer [role=status]').filter({hasText:'路径无效'}).waitFor();
  assert.equal(await readFile(join(fixture.root,'reference.md'),'utf8') !== '',true);
  await page.locator('#note-location').fill('moved.md'); await page.locator('#note-task-drawer .primary').click();
  await page.locator('#note-task-drawer').waitFor({state:'hidden'});
  assert.equal(await readFile(join(fixture.root,'moved.md'),'utf8') !== '',true);
  assert.deepEqual(errors,[]);
  }
  console.log('PASS remaining forms: real persistence, invalid, dirty close, retry, recovery, desktop/393/reduced height');
} finally { await browser.close(); await fixture.close(); }
