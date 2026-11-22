import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = process.env.ISSUE123_EVIDENCE || 'build/validation/123/after';
const before=process.env.ISSUE123_PHASE==='before';
let failSave=false;
let failRead=false;
let holdMetadata;
const io=[];
const fixture = await storageFixture();
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const screenshot = async name => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.screenshot({path:join(evidence,name),animations:'disabled'});
  };
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    io.push({cmd:request.cmd,path:request.path,at:performance.now()});
    try {
      if(request.cmd==='save' && failSave) throw Error('Controlled issue123 failed save');
      if(request.cmd==='read' && failRead) throw Error('Controlled unavailable disk version');
      if(request.cmd==='leaveResult') return {};
      if(request.cmd==='metadata' && holdMetadata) {
        const hold = holdMetadata;
        holdMetadata = undefined;
        await hold();
      }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await fixture.adapter(request.cmd, request);
        return result;
      }
      const workspace = await fixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(fixture.root, request.path || '');
      switch (request.cmd) {
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive:true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => {
    const request = JSON.parse(message);
    window.nativeReply(request.id, await window.bridge(request));
    if (request.cmd === 'leaveResult') window.conflictLeaveFinished = true;
  }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation-labels.js', 'directory-label.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../build/web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  await mkdir(evidence,{recursive:true});
  const text='# 同名中文资料与研究记录\n\n## 可读的标题\n\n> 逐字保留的引文\n\n| 项目 | 说明 |\n| --- | --- |\n| 原文 | 完整保留 |\n\n```js\nconst source = "保留原文";\n```\n\n- [ ] 只读任务标记\n\n[[folder/Second|第二份]]\n\n'+ '中文 English 阅读段落。\n\n'.repeat(30);
  await writeFile(sourcePath,text);await mkdir(join(fixture.root,'folder'),{recursive:true});
  await writeFile(join(fixture.root,'folder/Second.md'),'# 同名中文资料与研究记录\n\n第二份来源');
  const started=performance.now();await page.goto('https://notes.test/');
  await page.locator('[data-view=notes]').click();await page.locator('#items .card').first().waitFor();
  const listed=performance.now();
  await screenshot('library.png');
  const readsBefore=io.filter(c=>c.cmd==='read').length;
  const opening=performance.now();
  await page.locator('#items [data-path="reference.md"]').click();await page.locator('#reading').waitFor({state:'visible'});
  const opened=performance.now();
  assert.equal(io.filter(c=>c.cmd==='read').length-readsBefore,1,'opening reads only the selected Markdown');
  assert.equal(await page.locator('#reading table').count(),1);assert.equal(await page.locator('#reading input').isDisabled(),true);
  assert.equal(await readFile(sourcePath,'utf8'),text,'reading preserves bytes');
  if(!before) {
    assert.equal(await page.locator('.collection').isVisible(),false,'page-first reading hides middle list');
    assert.equal(await page.locator('#note-reference').isVisible(),false);
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const selector of ['#global-search-open','#mode']) assert.equal(await page.locator(selector).evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
    await page.emulateMedia({reducedMotion:'no-preference'});
  }
  for(const viewport of [{width:1180,height:800},{width:393,height:852},{width:800,height:400}]) {
    await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await screenshot(`reader-${viewport.width}.png`);
    if(!before) {
      await page.locator('#note-reference-open').click();await page.locator('#note-reference').waitFor({state:'visible'});
      assert.equal(await page.locator('#note-reference dd').textContent(),'reference.md');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await screenshot(`reference-${viewport.width}.png`);
      await page.locator('#note-reference').getByRole('button',{name:'收起',exact:true}).click();
      assert.equal(await page.locator('#note-reference-open').evaluate(n=>n===document.activeElement),true);
    }
  }
  await page.setViewportSize({width:1180,height:800});
  const infoReceiver=await page.locator('#note-info-open').elementHandle();
  await page.getByRole('button',{name:'打开本地笔记：第二份',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='folder/Second.md');
  assert.equal(await infoReceiver.evaluate(n=>n===document.querySelector('#note-info-open')),true,'note navigation preserves the controller-owned opener receiver');
  await page.locator('#note-info-open').click();await page.locator('#note-info-drawer .ui-drawer-header button').click();
  assert.equal(await page.locator('#note-info-open').evaluate(n=>n===document.activeElement),true,'information drawer restores its live opener');
  await page.locator('#back').click();await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
  await page.locator('#mode').click();const body=page.locator('#body');
  await body.focus();await body.evaluate(n=>{window.originalReceiver=n;n.setSelectionRange(2,6);});
  await page.keyboard.type('saved');assert.equal(await body.evaluate(n=>n===window.originalReceiver),true);
  await page.locator('#note-save').click();await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到本地');
  const saved=await readFile(sourcePath,'utf8');assert.match(saved,/saved/);
  await page.reload();await page.locator('[data-view=notes]').click();await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#reading').waitFor({state:'visible'});assert.match(await page.locator('#reading').textContent(),/saved/);
  failSave=true;await page.locator('#mode').click();await body.fill('不得写入的失败草稿');
  await page.locator('#back').click();await page.getByRole('button',{name:'保存并离开',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'保存尚未完成'}).waitFor();
  assert.equal(await body.inputValue(),'不得写入的失败草稿');assert.equal(await readFile(sourcePath,'utf8'),saved);
  await screenshot('failed-save.png');
  await page.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await body.inputValue(),'不得写入的失败草稿');
  await page.locator('#back').click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();failSave=false;
  assert.equal(await readFile(sourcePath,'utf8'),saved);
  if (!before) {
    await page.locator('#items [data-path="reference.md"]').click();
    await page.locator('#mode').click();
    const external = '# 外部版本\n\n磁盘上的原文。';
    await writeFile(sourcePath,external);
    await body.fill('需要保留的本机编辑');
    const conflict=page.locator('#conflict');
    await conflict.waitFor();
    await page.setViewportSize({width:393,height:480});
    const reload=conflict.getByRole('button',{name:'载入磁盘版本（放弃当前编辑）'});
    await reload.focus();
    const contained=await conflict.evaluate(node=>{
      document.querySelector('#global-search-open').focus();
      return node.contains(document.activeElement);
    });
    assert.equal(contained,true,'note file conflict makes global search inert');
    await page.keyboard.press('Tab');
    assert.equal(await conflict.evaluate(node=>node.contains(document.activeElement)),true);
    await page.keyboard.press('Escape');
    assert.equal(await conflict.isVisible(),true);
    failRead=true;
    await reload.click();
    await conflict.getByText('未能载入磁盘版本。请检查目录后重试；编辑仍保留。',{exact:true}).waitFor();
    assert.equal(await body.inputValue(),'需要保留的本机编辑');
    assert.equal(await readFile(sourcePath,'utf8'),external);
    assert.equal(await conflict.evaluate(node=>node.scrollWidth<=node.clientWidth),true);
    assert.ok(await reload.evaluate(node=>node.getBoundingClientRect().height>=44));
    await screenshot('file-conflict-failure-393-short.png');
    failRead=false;
    await reload.click();
    await conflict.waitFor({state:'hidden'});
    await page.locator('#reading').getByText('磁盘上的原文。',{exact:true}).waitFor();
    assert.equal(await page.locator('#mode').evaluate(node=>node===document.activeElement),true);
    assert.equal(await readFile(sourcePath,'utf8'),external);

    await page.locator('#mode').click();
    const newerDisk = '# 更新的外部版本\n\n磁盘上的新原文。';
    await writeFile(sourcePath,newerDisk);
    await body.fill('已另存为副本的本机编辑');
    await conflict.waitFor();
    let releaseMetadata;
    const metadataHeld = new Promise(resolve => {
      holdMetadata = () => new Promise(release => { releaseMetadata = release; resolve(); });
    });
    await conflict.getByRole('button',{name:'将我的编辑另存为副本'}).click();
    await metadataHeld;
    await conflict.waitFor({state:'hidden'});
    await body.fill('另存后开始的编辑');
    await page.evaluate(() => window.requestNativeLeave('copy-return-check'));
    releaseMetadata();
    await page.waitForFunction(() => window.conflictLeaveFinished || document.querySelector('#task-leave-decision'));
    assert.equal(await page.locator('#file-path').textContent(),'reference.md');
    assert.equal(await body.inputValue(),'另存后开始的编辑');
    await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
    const copies=(await readdir(fixture.root)).filter(name=>name.startsWith('reference-conflict-'));
    assert.equal(copies.length,1);
    assert.match(await readFile(join(fixture.root,copies[0]),'utf8'),/已另存为副本的本机编辑/);
    assert.equal(await readFile(sourcePath,'utf8'),newerDisk);
    console.log('PASS file conflict containment, failed read and retry, copy readback, and newer edit ownership');
  }
  assert.deepEqual(errors,[]);
  await writeFile(join(evidence,'measurements.json'),JSON.stringify({phase:before?'before':'after',startupAndListMs:listed-started,openMs:opened-opening,io,adapterCalls:fixture.calls,sourcePreserved:true,persistedReadback:true,failedSaveDiscard:true},null,2));
  console.log('PASS issue123 same-state Library/Markdown/reference, wiki return, stable editor receiver, real save/reload and failed-save/continue/discard');
} finally {await browser.close();await fixture.close();}
