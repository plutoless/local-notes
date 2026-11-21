import {readFile, writeFile, readdir, stat, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'docs/validation/issue46';
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
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation-labels.js', 'directory-label.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../build/web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('[data-view=notes]').click();
  await page.locator('#items .card').first().waitFor();
  for (const width of [1180,393]) {
    await page.setViewportSize({width,height:800});
    await page.screenshot({path:join(evidence,`${process.env.LIBRARY_ASSETS_DIR?'before':'after'}-${width}.png`)});
  }
  if (process.env.LIBRARY_ASSETS_DIR) {
    await page.locator('#library-create-topic').click();
    await page.screenshot({path:join(evidence,'before-form-393.png')});
  } else {
    await page.setViewportSize({width:1180,height:800});
    const before = await readFile(sourcePath,'utf8');
    const open = async()=>{await page.locator('#library-create-topic').click(); await page.locator('#topic-name').waitFor();};
    const submit = page.locator('#topic-drawer button[type=submit]');
    await open();
    assert.ok(await page.locator('#topic-name').evaluate(n=>document.activeElement===n));
    await submit.click();
    await page.getByText('请填写主题名称。',{exact:true}).waitFor();
    await page.screenshot({path:join(evidence,'after-invalid.png')});
    await page.locator('#topic-name').fill('   '); await submit.click();
    assert.equal(await page.locator('#topic-name').inputValue(),'   ');
    await page.locator('#topic-name').fill('长期研究主题与资料整理'.repeat(8));
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    assert.ok(await page.locator('#topic-drawer').evaluate(n=>n.open));
    await page.locator('#topic-cancel').click();
    await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    await page.getByRole('button',{name:'关闭新建主题',exact:true}).click();
    await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    // Native top-layer modal rejects focus and activation of background controls.
    await page.locator('#search').evaluate(n=>n.focus());
    assert.equal(await page.locator('#search').evaluate(n=>n===document.activeElement),false);
    for(const key of ['Tab','Shift+Tab']) for(let i=0;i<16;i++){await page.keyboard.press(key);assert.ok(await page.evaluate(()=>document.querySelector('#topic-drawer').contains(document.activeElement)));}
    await page.screenshot({path:join(evidence,'after-drawer-1180.png')});
    await page.setViewportSize({width:393,height:340});
    assert.equal(await page.locator('#topic-drawer').evaluate(n=>Math.round(n.getBoundingClientRect().width)),393);
    await page.screenshot({path:join(evidence,'after-drawer-393-short.png')});
    const footer=await submit.boundingBox();assert.ok(footer.y+footer.height<=340);
    assert.ok((await submit.boundingBox()).height>=44);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    fixture.fail(cmd=>cmd==='actionWrite');
    await submit.click();
    await page.waitForFunction(()=>document.querySelector('#topic-error').textContent.length>0);
    assert.ok((await page.locator('#topic-name').inputValue()).length>40);
    await page.screenshot({path:join(evidence,'after-failed-393.png')});
    await submit.click();
    await page.waitForFunction(()=>!document.querySelector('#topic-drawer').open);
    await page.waitForFunction(()=>document.querySelector('#library-topic').options.length===3);
    assert.equal(await page.locator('#library-topic option').count(),3);
    assert.ok(await page.locator('#library-create-topic').evaluate(n=>n===document.activeElement));
    const topic=await page.locator('#library-topic option').last().getAttribute('value');
    await page.locator('#library-topic').selectOption(topic);await page.locator('#library-rename-topic').click();
    assert.ok((await page.locator('#topic-name').inputValue()).length>40);
    await page.locator('#topic-name').fill('已保存的主题'); await submit.click();
    await page.waitForFunction(()=>!document.querySelector('#topic-drawer').open);
    await page.locator('#library-rename-topic').click(); assert.equal(await page.locator('#topic-name').inputValue(),'已保存的主题');await page.locator('#topic-cancel').click();
    await open();await page.locator('#topic-cancel').click();assert.equal(await page.locator('#library-topic option').count(),3);
    await open(); await page.locator('#topic-name').fill('保存中防重复'); delayTopic=true; await submit.click();
    await page.getByText('正在保存…',{exact:true}).waitFor();
    assert.equal(await submit.isDisabled(),true); assert.equal(await page.locator('#topic-name').isDisabled(),true);
    assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),true);
    await page.screenshot({path:join(evidence,'after-saving.png')});
    await page.locator('#topic-form').evaluate(n=>{n.dispatchEvent(new Event('submit',{cancelable:true}));n.dispatchEvent(new Event('submit',{cancelable:true}));});
    await page.keyboard.press('Escape'); assert.ok(await page.locator('#topic-drawer').evaluate(n=>n.open));
    releaseTopic(); await page.waitForFunction(()=>!document.querySelector('#topic-drawer').open);
    await page.waitForFunction(()=>document.querySelectorAll('#library-topic option').length===4);
    assert.equal(await page.locator('#library-topic option').count(),4);
    await page.locator('#search').fill('Synthetic');
    await page.getByText('没有找到匹配的笔记。请换个关键词或清除搜索。',{exact:true}).waitFor();
    const context=await page.locator('#items').innerText();
    await open();await page.locator('#topic-name').fill('导航保护');
    await page.locator('#choose').evaluate(n=>n.click());
    await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    assert.equal(await page.locator('#search').inputValue(),'Synthetic');
    await page.locator('#topic-cancel').click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
    assert.equal(await page.locator('#items').innerText(),context);
    await page.locator('#search').fill('');
    await page.setViewportSize({width:1180,height:800});
    await page.locator('#library-topic').selectOption('');
    for(let i=0;i<65;i++) await writeFile(join(fixture.root,`page-${i}.md`),`# 上下文笔记 ${i}\n\n分页与滚动`);
    await page.locator('#library-refresh').click();
    await page.waitForFunction(()=>!document.querySelector('#library-refresh').disabled && !document.querySelector('#library-progress').textContent);
    await page.waitForFunction(()=>!document.querySelector('#library-next').disabled);
    await page.locator('#library-next').click(); await page.waitForFunction(()=>!document.querySelector('#library-previous').disabled);
    await page.locator('#items .card').last().focus();
    const browsing=await page.evaluate(()=>({scroll:document.querySelector('.collection').scrollTop,text:document.querySelector('#items').innerText,filter:document.querySelector('#library-topic').value}));
    await page.locator('#library-create-topic').evaluate(n=>{n.focus({preventScroll:true});n.click();}); await page.locator('#topic-name').fill('保持分页位置'); await submit.click(); await page.waitForFunction(()=>!document.querySelector('#topic-drawer').open);
    assert.deepEqual(await page.evaluate(()=>({scroll:document.querySelector('.collection').scrollTop,text:document.querySelector('#items').innerText,filter:document.querySelector('#library-topic').value})),browsing);
    assert.equal(await page.locator('#library-previous').isDisabled(),false);
    await open();await page.locator('#topic-name').fill('恢复的主题草稿');await page.reload();
    await page.locator('[data-view=notes]').click();await open(); assert.equal(await page.locator('#topic-name').inputValue(),'恢复的主题草稿');
    await page.locator('#topic-cancel').click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
    const countBeforeRecovery=await page.locator('#library-topic option').count();
    await open(); await page.locator('#topic-name').fill('已提交待恢复'); let recoveryQueries=0; fixture.fail(cmd=>cmd==='actionQuery' && ++recoveryQueries===2); await submit.click();
    await page.getByText('主题版本已保存，恢复尚未完成。名称暂时锁定，请重试恢复。',{exact:true}).waitFor();
    assert.equal(await page.locator('#topic-name').isDisabled(),true);
    assert.equal(await submit.textContent(),'重试恢复');
    await page.screenshot({path:join(evidence,'after-recovery-pending.png')});
    await page.reload(); await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor(); await page.locator('[data-view=notes]').click(); await open();
    assert.equal(await page.locator('#topic-name').inputValue(),'已提交待恢复'); assert.equal(await submit.textContent(),'重试恢复');
    await submit.click(); await page.waitForFunction(()=>!document.querySelector('#topic-drawer').open);
    assert.equal(await page.locator('#library-topic option').count(),countBeforeRecovery+1);
    assert.equal(await readFile(sourcePath,'utf8'),before);
    alternateFixture=await storageFixture();
    await page.locator('#choose').evaluate(n=>n.click());
    await page.waitForFunction(()=>document.querySelector('#library-topic').options.length===2);
    await open(); assert.equal(await page.locator('#topic-name').inputValue(),''); await page.locator('#topic-cancel').click();


  }
  assert.deepEqual(errors,[]);
  console.log('PASS topic drawer layout, invalid input, dirty guards, focus, failed write/retry, real persistence, rename/reopen, clean cancel, recovery and unchanged Markdown');
} finally { await browser.close(); await fixture.close(); if(alternateFixture)await alternateFixture.close(); }
