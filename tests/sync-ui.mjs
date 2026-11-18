import {closeSavedAction, closeNoteInfo, captureNote, moveNote} from './form-journeys.js';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, readdir, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const otherFixture = await storageFixture();
let activeFixture = fixture;
let delayFiles = false, failFiles = false;
let holdActionQuery = false, releaseHeldQuery, heldQueryStartedResolve;
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
      if (request.cmd === 'actionFiles' && failFiles) throw Error('Injected refresh failure');
      if (request.cmd === 'actionFiles' && delayFiles) await new Promise(resolve=>setTimeout(resolve,250));
      if (request.cmd === 'choose') { activeFixture = activeFixture === fixture ? otherFixture : fixture; return {}; }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        if (request.cmd === 'actionQuery' && holdActionQuery) { heldQueryStartedResolve(); await new Promise(resolve => { releaseHeldQuery = resolve; }); }
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
        case 'create': await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); if (request.cmd === 'actionQuery' && request.search === 'Only in workspace B') window.__heldQueryDelivered = true; }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: process.env.PHASE === 'before' ? execFileSync('git', ['show', 'e8a869b:web/' + name]) : await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: '当前重点', exact: true, level: 2}).waitFor();
  const {ActionRepository} = await import('../web/actions.js');
  const {randomUUID} = await import('node:crypto');
  const repo = new ActionRepository(fixture.adapter); await repo.open();
  const base = (await repo.save({description: '核对长期事项中需要保留的来源、下一步行动和人工解决记录'.repeat(5), focusPosition: 1})).record;
  const local = (await repo.save({...base, description: 'Local description'}, base)).record;
  const remote = {...base, revision: randomUUID(), parents: [base.revision], description: 'Remote description', status: 'completed', focusPosition: null};
  await fixture.adapter('actionWrite', {workspaceId: repo.workspaceId, path: `revisions/${base.entityId}/${remote.revision}.json`, text: JSON.stringify(remote)});
  await closeSavedAction(page); await page.getByRole('button', {name: '同步检查'}).click();
  const panel = page.getByRole('dialog', {name: '同步检查'});
  await panel.waitFor();
  await panel.getByText('发现冲突版本，请比较后选择或合并。').waitFor();
  await page.screenshot({path:`docs/validation/issue36/${process.env.PHASE || 'after'}-web-desktop.png`,fullPage:true});
  await page.setViewportSize({width:393,height:852});
  assert.equal(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`docs/validation/issue36/${process.env.PHASE || 'after'}-web-393px-long.png`,fullPage:true});
  await page.setViewportSize({width:1180,height:800});
  const editor = panel.getByLabel('合并版本 JSON');
  delayFiles = true;
  await panel.getByRole('button',{name:'重新检查',exact:true}).click();
  await panel.getByText('正在检查本地版本…').waitFor();
  assert.equal(await panel.locator('article').first().evaluate(el=>el.inert),true);
  await page.waitForFunction(()=>document.querySelector('.sync-panel').getAttribute('aria-busy')==='false'); delayFiles=false;
  if (process.env.PHASE !== 'before') {
    failFiles=true;
    await panel.getByRole('button',{name:'重新检查',exact:true}).click();
    await panel.getByText('检查未完成。请确认目录可用，然后点击「重新检查」；原文件仍保留。').waitFor();
    assert.equal(await panel.locator('article').first().evaluate(el=>el.inert),false);
    failFiles=false;
    await panel.getByRole('button',{name:'重新检查',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.sync-panel').getAttribute('aria-busy')==='false');
    assert.equal(await panel.getByLabel('内容',{exact:true}).isDisabled(),true);
    await panel.getByRole('navigation',{name:'冲突记录'}).getByRole('button').first().click();
    assert.equal(await panel.locator('h3').first().evaluate(el=>el===document.activeElement),true);
  }
  await panel.getByRole('button', {name: /选择版本 /}).first().click();
  await panel.getByRole('button', {name: '关闭检查', exact: true}).click();
  await page.locator('#task-leave-decision').getByRole('button',{name:'继续编辑',exact:true}).click();
  await page.waitForFunction(async()=>!(await import('/presentation.js')).taskLeavePending());
  await page.keyboard.press('Escape'); await page.locator('#task-leave-decision').getByRole('button',{name:'继续编辑',exact:true}).click(); assert.equal(await panel.isVisible(), true);
  await panel.getByText('高级：完整 JSON 与版本诊断', {exact:true}).click();
  await editor.fill('{bad json');
  await panel.getByRole('button', {name: '3. 保存解决结果到本地'}).click();
  await panel.getByText('解决结果未保存。请核对内容和目录后重试；编辑仍保留。若版本已变化，请放弃编辑并重新检查。').waitFor();
  assert.equal(await editor.inputValue(), '{bad json');
  await editor.fill(JSON.stringify({...local, description: 'Merged explicitly'}));
  await editor.fill(JSON.stringify({...local,description:'Advanced description',waitingOn:'保留高级编辑'}));
  await panel.getByLabel('内容',{exact:true}).fill('Merged explicitly');
  const edited = await editor.inputValue();
  for (let index=0;index<3;index++) await page.evaluate(()=>window.dispatchEvent(new Event('reference-change')));
  assert.equal(await editor.inputValue(),edited);

  assert.equal(JSON.parse(await editor.inputValue()).waitingOn,'保留高级编辑');
  fixture.fail((cmd,args)=>cmd==='actionWrite' && args.path.startsWith('revisions/'));
  await panel.getByRole('button',{name:'3. 保存解决结果到本地'}).click();
  await panel.getByText('解决结果未保存。请核对内容和目录后重试；编辑仍保留。若版本已变化，请放弃编辑并重新检查。').waitFor();
  assert.match(await editor.inputValue(),/Merged explicitly/);
  await panel.getByRole('button', {name: '3. 保存解决结果到本地'}).click();
  await panel.getByText('现有版本中未发现待处理冲突。').waitFor();
  await repo.recover();
  const result = (await repo.query()).actions[0];
  assert.equal(result.description, 'Merged explicitly'); assert.deepEqual(new Set(result.parents), new Set([local.revision, remote.revision]));
  assert.equal((await repo.history(base.entityId)).length, 4);
  await panel.getByRole('button', {name:'关闭检查',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'同步检查',exact:true}).evaluate(el=>el===document.activeElement),true);
  await closeSavedAction(page); await page.getByRole('button',{name:'同步检查',exact:true}).click();
  await panel.getByText('现有版本中未发现待处理冲突。').waitFor();
  const {InitiativeRepository} = await import('../web/initiatives.js');
  const {TopicRepository} = await import('../web/library.js');
  const {CandidateRepository} = await import('../web/organization.js');
  for(const [Type, input, field] of [
    [InitiativeRepository,{title:'中文事项',goal:'交付目标',progress:'已核对',status:'active'},'名称'],
    [TopicRepository,{description:'中文主题'},'内容'],
    [CandidateRepository,{description:'中文建议',status:'suggested',candidateType:'action',placement:'独立行动',reasoning:'原文有据',relevance:'当前待办',inputFingerprint:'synthetic',sources:[{path:'reference.md',quote:'测试引用',fingerprint:'synthetic',fragmentId:'test',start:0,end:4}]},'内容']
  ]) {
    const typed = new Type(fixture.adapter);await typed.open();
    const original=(await typed.save(input)).record;
    const left=(await typed.save({...original,description:original.description+'左',...(original.title?{title:original.title+'左'}:{})},original)).record;
    const right={...original,revision:randomUUID(),parents:[original.revision],description:original.description+'右'};
    await fixture.adapter('actionWrite',{workspaceId:typed.workspaceId,path:`revisions/${original.entityId}/${right.revision}.json`,text:JSON.stringify(right)});
    await panel.getByRole('button',{name:'重新检查',exact:true}).click();
    const article=panel.locator('article').filter({hasText:original.title||original.description});
    await article.getByRole('heading',{level:3}).waitFor();
    await article.getByRole('button',{name:/选择版本/}).first().click();
    await article.getByLabel(field,{exact:true}).fill('已人工核对的中文内容');
    await article.getByRole('button',{name:'3. 保存解决结果到本地'}).click();
    await panel.getByText('现有版本中未发现待处理冲突。').waitFor();
    await typed.recover();const resolved=(await typed.query()).actions[0];
    assert.deepEqual(new Set(resolved.parents),new Set([left.revision,right.revision]));
    assert.equal((await typed.history(original.entityId)).length,4);
  }
  if (process.env.PHASE !== 'before') {
    const extra=(await repo.save({description:'部分失败恢复样本'})).record;
    const right={...extra,revision:randomUUID(),parents:[],description:'部分失败另一个分支'};
    await fixture.adapter('actionWrite',{workspaceId:repo.workspaceId,path:`revisions/${extra.entityId}/${right.revision}.json`,text:JSON.stringify(right)});
    await panel.getByRole('button',{name:'重新检查',exact:true}).click();
    await panel.getByRole('button',{name:/选择版本/}).first().click();
    fixture.fail((cmd,args)=>cmd==='actionIndex' && args.record.entityId===extra.entityId,2);
    await panel.getByRole('button',{name:'3. 保存解决结果到本地'}).click();
    await panel.getByText('版本已保留，恢复尚未完成。请点击保存重试恢复；已保留的内容暂不能编辑。').waitFor();
    assert.equal(await panel.getByLabel('内容',{exact:true}).isDisabled(),true);
    await panel.getByRole('button',{name:'3. 保存解决结果到本地'}).click();
    await panel.getByText('现有版本中未发现待处理冲突。').waitFor();
    assert.equal((await repo.history(extra.entityId)).length,3);
    await fixture.adapter('actionWrite',{workspaceId:repo.workspaceId,path:`actions/${randomUUID()}.json`,text:'{broken json'});
  }
  const missing = {...local, entityId:randomUUID(), revision:randomUUID(), parents:[randomUUID()], description:'缺少父版本的测试记录'};
  const cycleA = {...local, entityId:randomUUID(), revision:randomUUID(), description:'循环历史的测试记录'};
  const cycleB = {...cycleA,revision:randomUUID(),parents:[cycleA.revision]}; cycleA.parents=[cycleB.revision];
  for(const record of [missing,cycleA,cycleB]) await fixture.adapter('actionWrite',{workspaceId:repo.workspaceId,path:`revisions/${record.entityId}/${record.revision}.json`,text:JSON.stringify(record)});
  await panel.getByRole('button',{name:'重新检查',exact:true}).click();
  await panel.getByText('缺少前序版本，暂不能保存。请等待文件到达后重新检查。').waitFor();
  await panel.getByText('版本历史形成循环，暂不能保存。请从保留的副本恢复历史，再重新检查。').waitFor();
  for(const save of await panel.getByRole('button',{name:'3. 保存解决结果到本地'}).all()) assert.equal(await save.isDisabled(),true);
  if(process.env.PHASE !== 'before') {
    const blocked=panel.locator('article').last();
    await blocked.getByText('高级：完整 JSON 与版本诊断',{exact:true}).click();
    const lastEnabled=blocked.locator('summary').last();
    await lastEnabled.focus(); await page.keyboard.press('Tab');
    assert.equal(await panel.getByRole('button',{name:'关闭检查',exact:true}).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await lastEnabled.evaluate(el=>el===document.activeElement),true);
  }

  for (let index=0;index<2;index++) {
    const extra=(await repo.save({description:'多冲突键盘检查'+index})).record;
    const fork={...extra,revision:randomUUID(),parents:[]};
    await fixture.adapter('actionWrite',{workspaceId:repo.workspaceId,path:`revisions/${extra.entityId}/${fork.revision}.json`,text:JSON.stringify(fork)});
  }
  await panel.getByRole('button',{name:'重新检查',exact:true}).click();
  const first=panel.locator('article').filter({hasText:'多冲突键盘检查0'});
  await first.getByRole('button',{name:/选择版本/}).first().click();
  await panel.getByRole('button',{name:'关闭检查',exact:true}).click();
  await page.getByRole('button',{name:'继续编辑',exact:true}).waitFor();
  assert.match(await page.locator('#task-leave-decision').innerText(),/当前编辑尚未保存/);
  assert.doesNotMatch(await page.locator('#task-leave-decision').innerText(),/版本已保存，恢复尚未完成/);
  await page.getByRole('button',{name:'继续编辑',exact:true}).click();
  await first.getByRole('button',{name:'3. 保存解决结果到本地'}).focus(); await page.keyboard.press('Tab');
  assert.equal(await panel.getByRole('button',{name:'关闭检查',exact:true}).evaluate(el=>el===document.activeElement),true);
  await first.getByRole('button',{name:'放弃编辑',exact:true}).click();
  await page.setViewportSize({width:393,height:852});
  if (process.env.PHASE !== 'before') {
    await panel.getByText('部分版本需要核对；原文件和历史均保留。缺失历史请等待文件到达后重新检查；损坏文件请从保留的副本恢复。').waitFor();
    for(const control of await panel.getByRole('button').all()) if(await control.isVisible()) assert.ok((await control.boundingBox()).height>=44);
    assert.equal(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  await panel.getByRole('button',{name:'关闭检查',exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await panel.evaluate(el=>el.contains(document.activeElement)),true);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
  console.log('Focus outline:',await page.evaluate(()=>getComputedStyle(document.activeElement).outline));
  const colors=await page.evaluate(()=>({text:getComputedStyle(document.querySelector('.sync-panel')).color,background:getComputedStyle(document.querySelector('.sync-panel')).backgroundColor}));
  console.log('Rendered contrast inputs:',JSON.stringify(colors));
  await page.screenshot({path:`docs/validation/issue36/${process.env.PHASE || 'after'}-web-393px.png`,fullPage:true});
  if(process.env.PHASE !== 'before') {
    // A background failure notice must not cover or intercept modal controls.
    const close=panel.getByRole('button',{name:'关闭检查',exact:true});
    await close.scrollIntoViewIfNeeded();
    const box=await close.boundingBox();
    assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.textContent,{x:box.x+box.width/2,y:box.y+box.height/2}),'关闭检查');
    await page.screenshot({path:'docs/validation/issue36/after-web-393px-top.png',fullPage:true});
  }
  await panel.getByRole('button',{name:'关闭检查',exact:true}).click();
  delayFiles=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await closeSavedAction(page); await page.getByRole('button',{name:'同步检查',exact:true}).click();
  assert.equal(await panel.isVisible(),true);await panel.getByText('正在检查本地版本…').waitFor();
  await page.waitForFunction(()=>document.querySelector('.sync-panel').getAttribute('aria-busy')==='false');delayFiles=false;
  assert.equal(await readFile(sourcePath,'utf8'),original);
  await panel.getByRole('button',{name:'关闭检查',exact:true}).click();
  await page.locator('nav [data-view=focus]').click(); await page.getByRole('button', {name: '全部行动', exact: true}).click();
  await page.locator('#action-new').click();
  await page.locator('#action-description').fill('保留原任务的中文草稿');
  const mainScroll=await page.locator('main').evaluate(el=>{el.scrollTop=120;return el.scrollTop;});
  await page.getByRole('button',{name:'同步检查',exact:true}).evaluate(el=>el.focus());
  assert.equal(await panel.isVisible(),false,'Action tasks cannot stack background review');
  assert.equal(await page.locator('#action-description').inputValue(),'保留原任务的中文草稿');
  await page.locator('#action-save').click(); await page.locator('#action-save-state').filter({hasText:/^已保存到本地$/}).waitFor();
  await closeSavedAction(page); await page.getByRole('button',{name:'同步检查',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.sync-panel').getAttribute('aria-busy')==='false');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('main').evaluate(el=>el.scrollTop),mainScroll);
  assert.equal(await page.getByRole('button',{name:'同步检查',exact:true}).evaluate(el=>el===document.activeElement),true);
  // The initiative task is itself modal: background review cannot stack on it.
  await page.locator('nav [data-view=initiatives]').click();
  await page.locator('#initiative-new').click();
  await page.locator('#initiative-title').fill('冲突检查返回事项草稿');
  await page.getByRole('button',{name:'同步检查',exact:true}).evaluate(el=>el.focus());
  assert.equal(await page.getByRole('button',{name:'同步检查',exact:true}).evaluate(el=>el===document.activeElement),false);
  assert.equal(await panel.isVisible(),false);
  await page.locator('#initiative-save').click();
  await page.waitForFunction(()=>!document.querySelector('#initiative-drawer').open);
  await page.locator('#items [data-initiative-id]').filter({hasText:'冲突检查返回事项草稿'}).click();
  await page.locator('#workspace-overview').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#workspace-overview').disabled);
  await closeSavedAction(page); await page.getByRole('button',{name:'同步检查',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.sync-panel').getAttribute('aria-busy')==='false');
  await panel.getByRole('button',{name:'关闭检查',exact:true}).click();
  if (!await page.locator('#workspace-overview').isVisible()) await page.locator('#initiative-back').click();
  await page.locator('#workspace-overview').click();
  await page.locator('#initiative-drawer').waitFor({state:'visible'});
  assert.equal(await page.locator('#initiative-title').inputValue(),'冲突检查返回事项草稿');
  await page.locator('#initiative-discard').click();
  await page.locator('nav [data-view=notes]').click();
  if (await page.locator('#notice').isVisible()) await page.getByRole('button',{name:'关闭提示',exact:true}).click();
  await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#editor').waitFor({state:'visible'});
  if (await page.locator('#body').evaluate(node=>node.hidden)) await page.locator('#mode').click();
  await closeNoteInfo(page); await page.locator('#body').fill('冲突检查返回笔记编辑');
  await closeSavedAction(page); await page.getByRole('button',{name:'同步检查',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.sync-panel').getAttribute('aria-busy')==='false');
  await panel.getByRole('button',{name:'关闭检查',exact:true}).click();
  assert.equal(await page.locator('#body').inputValue(),'冲突检查返回笔记编辑');
  assert.deepEqual(errors, []);
  console.log('PASS: shared synchronization UI compares forked revisions and saves explicit multi-parent resolution through production Mac storage.');
} finally { await browser.close(); await fixture.close(); await otherFixture.close(); }
