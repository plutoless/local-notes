import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const evidence = 'build/issue70-browser';
const fixture = await storageFixture();
const alternate = await storageFixture(); let activeFixture = fixture;
let releaseWrite, writeStarted, delayWrite = false;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd==='choose') { activeFixture=alternate; return {}; }
      if (delayWrite && request.cmd==='actionWrite') { delayWrite=false; writeStarted?.(); await new Promise(resolve=>{releaseWrite=resolve;}); }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        return result;
      }
      const workspace = await activeFixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(activeFixture.root, request.path || '');
      switch (request.cmd) {
        case 'create': await mkdir(dirname(path),{recursive:true}); await writeFile(path,request.text,{flag:'wx'}); return {};
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
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  const text = '# 表格阅读 Synthetic reader\r\n\r\n## 中文和 English\r\n\r\n| 项目 | Code | 说明 | 更多 | 最后 |\r\n| --- | --- | --- | --- | --- |\r\n| A\\|B | `x|y` | 长中文'.replace('A\\\\|B','A\\|B') + '阅读'.repeat(70) + ' | C | D |\r\n\r\n- [ ] 原文任务\r\n\r\n[安全链接](https://example.com)\r\n\r\n~~~md\r\n| 假 | 表格 |\r\n| --- | --- |\r\n~~~\r\n\r\n' + ('长中文和 English 阅读段落。\r\n\r\n'.repeat(100));
  await writeFile(sourcePath,text);
  await page.goto('https://notes.test/');
  await page.locator('[data-view=notes]').click();
  await page.locator('#items .card').filter({has:page.locator('small').filter({hasText:/^reference\.md$/})}).click();
  await page.locator('#reading').waitFor({state:'visible'});
  const repository = new InitiativeRepository(fixture.adapter); await repository.open();
  for (const title of ['合成目标甲', '合成目标乙']) await repository.save({title, goal:'离线目标', progress:'', status:'active'});
  await page.locator('#note-info-open').click();
  await page.locator('#note-create-topic').click();
  assert.equal(await page.locator('dialog[open]').count(), 1);
  await page.locator('#topic-name').fill('合成主题甲');
  await page.locator('#topic-form').evaluate(n=>n.requestSubmit());
  await page.locator('#note-info-drawer[open]').waitFor();
  assert.equal(await page.getByRole('checkbox', {name:'合成主题甲',exact:true}).isChecked(),true);
  await page.getByRole('checkbox',{name:'合成目标甲',exact:true}).check();
  await page.waitForFunction(()=>document.activeElement.closest('label')?.textContent==='合成目标甲');
  await page.waitForFunction(()=>!window.hasUnsavedChanges());
  const started=new Promise(resolve=>{writeStarted=resolve;}); delayWrite=true;
  await page.getByRole('checkbox',{name:'合成目标乙',exact:true}).evaluate(n=>n.click()); await started;
  await page.locator('#note-create-topic').click();
  assert.equal(await page.locator('#topic-drawer').evaluate(n=>n.open),false);
  releaseWrite(); await page.locator('#topic-drawer[open]').waitFor();
  await page.locator('#topic-cancel').click(); await page.locator('#note-info-drawer[open]').waitFor();
  await page.locator('#note-create-topic').click();
  await page.locator('#topic-name').fill('合成主题甲');
  await page.locator('#topic-form').evaluate(n=>n.requestSubmit());
  await page.getByRole('alert').filter({hasText:'同名主题'}).waitFor();
  await page.locator('#topic-name').fill('合成主题乙');
  await page.locator('#topic-form').evaluate(n=>n.requestSubmit());
  await page.locator('#note-info-drawer[open]').waitFor();
  await page.locator('#note-create-topic').click();
  await page.locator('#topic-name').fill('提交后读取失败');
  fixture.fail((cmd,args)=>cmd==='referenceQuery' && args.exactPath==='reference.md');
  await page.locator('#topic-form').evaluate(n=>n.requestSubmit());
  await page.getByText('主题已保存到本地，关联列表暂未更新。请重新打开笔记信息重试。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'关闭提示'}).click();
  await page.locator('#note-info-open').click();
  assert.equal(await page.getByRole('checkbox',{name:'提交后读取失败',exact:true}).isChecked(),true);
  await page.getByRole('checkbox',{name:'合成主题甲',exact:true}).uncheck();
  for(const viewport of [{width:1180,height:800},{width:393,height:852},{width:800,height:400}]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(evidence,`classification-${viewport.width}-${viewport.height}.png`)});
  }
  await page.setViewportSize({width:1180,height:800});
  await page.getByRole('button',{name:'完成',exact:true}).click();
  await page.locator('#back').click();
  await page.locator('#library-topic').selectOption({label:'合成主题乙'});
  await page.locator('#items .card').click(); await page.locator('#reading').waitFor({state:'visible'});
  await page.locator('#note-info-open').click();
  for (const name of ['合成主题乙','合成目标甲','合成目标乙']) assert.equal(await page.getByRole('checkbox',{name,exact:true}).isChecked(),true);
  assert.equal(await page.getByRole('checkbox',{name:'合成主题甲',exact:true}).isChecked(),false);
  assert.equal(await readFile(sourcePath,'utf8'),text);
  await page.getByRole('button',{name:'打开事项：合成目标甲',exact:true}).click();
  await page.locator('#workspace-references button').waitFor();
  await page.locator('#workspace-references button').click();
  await page.locator('#reading').waitFor({state:'visible'});
  await page.locator('#note-info-open').click();
  await page.getByRole('checkbox',{name:'合成目标甲',exact:true}).uncheck();
  await page.waitForFunction(()=>!document.querySelector('#note-initiatives').inert);
  await page.getByRole('button',{name:'完成',exact:true}).click();
  await page.locator('#back').click();
  await page.getByText('尚未关联参考资料。',{exact:true}).waitFor();
  await page.locator('[data-view=notes]').click();
  await page.locator('#items .card').filter({has:page.locator('small').filter({hasText:/^reference\.md$/})}).click();
  await page.locator('#note-info-open').click();

  const owners=(await repository.query()).actions;
  assert.equal(owners.find(r=>r.title==='合成目标甲').sources.length,0);
  assert.equal(owners.find(r=>r.title==='合成目标乙').sources[0].path,'reference.md');
  await page.getByRole('button',{name:'完成',exact:true}).click();
  await page.locator('#new').click();
  await page.locator('#capture-title').fill('未分类合成捕获');
  await page.locator('#capture-body').fill('离线正文，不需要 AI 设置');
  await page.getByRole('button',{name:'创建笔记',exact:true}).click();
  await page.locator('#capture-return').waitFor({state:'visible'});
  const captured = await page.locator('#file-path').textContent();
  assert.match(await readFile(join(fixture.root,captured),'utf8'), /离线正文/);
  for (const owner of (await repository.query()).actions) assert.ok(owner.sources.every(s=>s.path!==captured));
  const topics = await fixture.adapter('actionQuery',{workspaceId:(await fixture.adapter('workspace')).workspaceId,entityType:'topic'});
  for (const owner of topics.actions) assert.ok(owner.sources.every(s=>s.path!==captured));
  await page.locator('#mode').click();
  await page.locator('#note-info-open').click(); await page.locator('#note-create-topic').click();
  await page.locator('#topic-name').fill('捕获后归类'); await page.locator('#topic-form').evaluate(n=>n.requestSubmit());
  await page.locator('#note-info-drawer[open]').waitFor();
  await page.getByRole('checkbox',{name:'合成目标乙',exact:true}).check();
  await page.getByRole('button',{name:'完成',exact:true}).click();
  await page.locator('#back').click(); await page.locator('#library-topic').selectOption({label:'捕获后归类'});
  await page.locator('#items .card').filter({hasText:'未分类合成捕获'}).click();
  assert.equal(await page.locator('#file-path').textContent(),captured);
  const bRepo=new InitiativeRepository(alternate.adapter); await bRepo.open();
  await bRepo.save({title:'合成目标乙',goal:'独立工作区',progress:'',status:'active'});
  await page.locator('.directory-details').evaluate(n=>n.open=true); await page.locator('#choose').click();
  await page.locator('[data-view=notes]').click();
  await page.locator('#items .card').filter({has:page.locator('small').filter({hasText:/^reference\.md$/})}).click();
  await page.locator('#note-info-open').click();
  assert.equal(await page.getByRole('checkbox',{name:'合成目标乙',exact:true}).isChecked(),false);
  assert.equal(await page.locator('#note-topics input').count(),0);
  await page.getByRole('checkbox',{name:'合成目标乙',exact:true}).check();
  await page.locator('#note-create-topic').click(); await page.locator('#topic-name').fill('捕获后归类');
  await page.locator('#topic-form').evaluate(n=>n.requestSubmit()); await page.locator('#note-info-drawer[open]').waitFor();
  assert.equal((await bRepo.query()).actions[0].sources[0].path,'reference.md');
  assert.ok((await repository.query()).actions.find(r=>r.title==='合成目标乙').sources.some(s=>s.path===captured));
  assert.deepEqual(errors,[]);
  console.log('PASS issue70 contextual topic creation, duplicate validation, multiple associations, unlink, filter/reopen and unchanged source');
} finally { await browser.close(); await fixture.close(); await alternate.close(); }
