import {readFile, writeFile, readdir, stat, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = process.env.FORM_EVIDENCE || 'build/issue83-after';
await mkdir(evidence, {recursive:true});
const fixture = await storageFixture();
let holdCreate = false, releaseCreate;
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
      if (request.cmd === 'create' && holdCreate) { holdCreate = false; await new Promise(resolve => { releaseCreate = resolve; }); }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await fixture.adapter(request.cmd, request);
        return result;
      }
      if (request.cmd === 'choose') return {};
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
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation-labels.js', 'directory-label.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../build/web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('[data-view=notes]').click();
  await page.locator('#items .card').first().waitFor();

  const report = [];
  const active = () => page.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim());
  async function cycle(panel) {
    const ids = await page.locator(panel).evaluate(n => [...n.querySelectorAll('button,input,textarea,select,summary,[tabindex]')].filter(x=>!x.matches(':disabled') && x.tabIndex>=0 && x.checkVisibility({checkVisibilityCSS:true}) && !x.closest('[inert]')).map(x=>x.id || x.textContent.trim()));
    const start = await active(); const visited = [];
    for (let i=0;i<ids.length;i++) { visited.push(await active()); await page.keyboard.press('Tab'); assert.equal(await page.locator(panel).evaluate(n=>n.contains(document.activeElement)),true); }
    if (process.env.FORM_BASELINE) { report.push({panel,expected:ids,visited,returned:await active()}); return; }
    assert.equal(await active(), start, 'complete forward cycle returns to start: '+JSON.stringify({ids,visited}));
    assert.deepEqual([...visited].sort(), [...ids].sort());
    for (let i=0;i<ids.length;i++) await page.keyboard.press('Shift+Tab');
    assert.equal(await active(), start, 'complete reverse cycle returns to start');
    report.push({panel,cycle:ids});
  }
  async function capture(name, field) {
    for (const [width,height] of [[1180,800],[393,800],[393,340]]) {
      await page.setViewportSize({width,height});
      if (field) await page.locator(field).scrollIntoViewIfNeeded();
      await screenshot(join(evidence,`${name}-${width}-${height}.png`));
      const state = await page.evaluate(() => { const n=document.activeElement,s=getComputedStyle(n); return {active:n.id,outline:s.outline,shadow:s.boxShadow,border:s.borderColor,invalid:n.getAttribute('aria-invalid'),focusVisible:n.matches(':focus-visible'),slot:n.dataset.slot}; });
      report.push({name,width,height,...state});
      if (field) assert.equal(await page.locator(field).evaluate(n=>n===document.activeElement),true,'expected editable receiver owns focus');
      if (!process.env.FORM_BASELINE && field) {
        if (['input','textarea'].includes(state.slot) && state.focusVisible) {
          assert.match(state.outline,/solid/,'official field has one solid focus outline');
          assert.equal(state.shadow,'none','official field has no competing ring');
        } else {
          assert.equal(state.outline.includes('none'),true,'editable field has one boundary, no outer outline');
          assert.match(state.shadow,/36, 92, 172/,'active boundary uses shared focus token');
        }
        if (state.invalid==='true') assert.equal(state.border,'rgb(161, 38, 37)');
      }
      assert.equal(await page.locator('dialog[open]').last().evaluate(n=>n.getBoundingClientRect().width<=innerWidth),true);
    }
    await page.setViewportSize({width:1180,height:800});
  }
  async function keyboardOpen(selector, key='Enter') {
    for(let i=0;i<100;i++) { if(await page.locator(selector).evaluate(n=>n===document.activeElement)) { await page.keyboard.press(key); return; } await page.keyboard.press('Tab'); }
    throw Error('Keyboard opener unreachable: '+selector);
  }
  // Capture: pointer and keyboard open, invalid, complete cycles, retained selection and recovery.
  await page.locator('#new').click(); assert.equal(await active(),'capture-title');
  await capture('capture-pointer','#capture-title'); await cycle('#note-task-drawer');
  await page.getByRole('button',{name:'创建笔记',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#capture-title').getAttribute('aria-invalid')==='true');
  await capture('capture-invalid','#capture-title');
  await page.locator('#capture-title').fill('长中文标签与草稿保留验证'.repeat(8));
  await page.locator('#capture-title').evaluate(n=>n.setSelectionRange(2,6));
  await page.keyboard.press('Escape'); await cycle('#task-leave-decision'); await capture('leave-keyboard');
  await page.keyboard.press('Escape');
  assert.equal(await active(),'capture-title');
  assert.deepEqual(await page.locator('#capture-title').evaluate(n=>[n.selectionStart,n.selectionEnd]),[2,6]);
  await page.reload(); await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await keyboardOpen('#new','Space'); await page.locator('#capture-title').waitFor();
  assert.match(await page.locator('#capture-title').inputValue(),/长中文/);
  await capture('capture-recovered','#capture-title');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  await keyboardOpen('#new'); assert.equal(await active(),'capture-title');
  await page.keyboard.press('Escape'); assert.equal(await active(),'new');
  if (!process.env.FORM_BASELINE) {
    await page.locator('#new').click(); await page.locator('#capture-title').fill('提交中的合成笔记');
    holdCreate = true; await page.getByRole('button',{name:'创建笔记',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#note-task-form').inert);
    // DOM positions the start; real browser key events test every enabled stop.
    await page.locator('#note-task-drawer .ui-drawer-header button').focus();
    await cycle('#note-task-drawer');
    releaseCreate(); await page.locator('#note-task-drawer').waitFor({state:'hidden'});
  }
  await page.locator('[data-view=notes]').click(); await page.locator('#library-create-topic').click();
  assert.equal(await active(),'topic-name'); await capture('topic-pointer','#topic-name'); await cycle('#topic-drawer');
  await page.locator('#topic-drawer button[type=submit]').click(); assert.equal(await active(),'topic-name');
  await capture('topic-invalid','#topic-name'); await page.keyboard.press('Escape');
  assert.equal(await active(),'library-create-topic');
  await keyboardOpen('#library-create-topic'); assert.equal(await active(),'topic-name');
  await page.locator('#topic-name').fill('长中文主题名称'.repeat(15));
  await page.reload(); await page.locator('[data-view=notes]').click(); await page.locator('#library-create-topic').click();
  await capture('topic-recovered','#topic-name');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  await page.locator('[data-view=initiatives]').click(); await page.locator('#initiative-new').click();
  assert.equal(await active(),'initiative-title'); await capture('initiative-pointer','#initiative-title'); await cycle('#initiative-drawer');
  await page.locator('#initiative-save').click(); await capture('initiative-invalid','#initiative-title');
  await page.keyboard.press('Escape'); await keyboardOpen('#initiative-new');
  await page.locator('#initiative-title').fill('事项草稿恢复与完整键盘路径');
  await page.reload(); await page.locator('[data-view=initiatives]').click(); await page.getByRole('button',{name:'恢复事项草稿',exact:true}).click();
  assert.equal(await page.locator('#initiative-title').inputValue(),'事项草稿恢复与完整键盘路径');
  await capture('initiative-recovered','#initiative-title');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  await page.locator('[data-view=focus]').click(); await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.locator('#action-new').click(); assert.equal(await active(),'action-description');
  await capture('action-pointer','#action-description'); await cycle('#action-drawer');
  await page.locator('#action-save').click(); await capture('action-invalid','#action-description');
  await page.keyboard.press('Escape'); await keyboardOpen('#action-new');
  await page.locator('#action-description').fill('长中文行动描述'.repeat(30));
  await page.reload(); await page.locator('[data-view=focus]').click(); await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.getByRole('button',{name:'恢复行动草稿',exact:true}).click();
  assert.equal(await page.locator('#action-description').inputValue(),'长中文行动描述'.repeat(30)); await capture('action-recovered','#action-description');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  await page.locator('[data-view=notes]').click(); await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#note-info-open').click(); await page.waitForFunction(()=>document.activeElement.id==='star'); await cycle('#note-info-drawer');
  await page.getByLabel('专项验证主题',{exact:true}).check(); await page.waitForFunction(()=>!document.querySelector('#note-topics').inert);
  await keyboardOpen('#note-info-drawer input[type=checkbox]','Space');
  await page.keyboard.press('Space'); await page.waitForFunction(()=>!document.querySelector('#note-topics').inert);
  await capture('metadata-selected-focused');
  await page.locator('#rename').click(); assert.equal(await active(),'note-location');
  assert.equal(await page.locator('dialog[open]').count(),1,'location replaces metadata task');
  await capture('location-pointer','#note-location'); await cycle('#note-task-drawer');
  await page.locator('#note-location').fill('../invalid.md'); await page.locator('#note-task-drawer .primary').click();
  await capture('location-invalid','#note-location');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'继续编辑',exact:true}).click();
  assert.equal(await page.locator('#note-location').inputValue(),'../invalid.md');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  await keyboardOpen('#note-info-open'); await page.waitForFunction(()=>document.activeElement.id==='star');
  await keyboardOpen('#rename'); assert.equal(await active(),'note-location');
  await page.keyboard.press('Escape');
  assert.equal(await active(),'note-info-open','location returns to the surviving note-information opener');
  await keyboardOpen('#note-info-open','Space'); await page.waitForFunction(()=>document.activeElement.id==='star');
  await page.keyboard.press('Escape'); assert.equal(await active(),'note-info-open');
  assert.equal(await readFile(join(fixture.root,'reference.md'),'utf8') !== '',true);
  assert.deepEqual(errors,[]); await writeFile(join(evidence,'transcript.json'),JSON.stringify(report,null,2));
  console.log((process.env.FORM_BASELINE ? 'CAPTURE baseline (cycles recorded, not passed)' : 'PASS')+' contextual form focus: real-storage bridge, modality, cycles, invalid, recovery, selection, return and responsive states');
} finally { await browser.close(); await fixture.close(); }
