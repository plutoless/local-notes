import {captureNote,closeNoteInfo,closeSavedAction} from './form-journeys.js';
import {ActionRepository} from '../web/actions.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
import {CandidateRepository,batchesFor,validateResponse} from '../web/organization.js';
const fixture=await storageFixture();
const text='# 合成来源\n\n- [ ] 历史计划，需要逐条确认。\n\n[[reference|下一份原文]]';
await writeFile(fixture.root+'/source.md',text);
const repo=new CandidateRepository(fixture.adapter);await repo.open();
const batch=batchesFor([{path:'source.md',text}])[0];
for(const [type,content] of [['action','确认的行动'],['initiative','确认的事项'],['topic','确认的主题'],['relationship','确认的来源关联'],['action','明确拒绝的行动']]) {
 const [fields]=validateResponse(JSON.stringify({candidates:[{type,content,placement:'由用户决定',reasoning:'逐字证据',relevance:'当前适用性待确认',sources:[{fragmentId:batch.fragmentId,quote:'历史计划，需要逐条确认。'}]}]}),batch);
 await repo.save({...fields,status:'suggested'});
}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try {
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('bridge',async request=>{try{
  if(request.cmd==='aiSettings')return {configured:false,address:'',model:''};
  if(request.cmd==='create'){await mkdir(fixture.root+'/'+request.path.split('/').slice(0,-1).join('/'),{recursive:true});await writeFile(fixture.root+'/'+request.path,request.text,{flag:'wx'});return {};}
  if(request.cmd==='save'){assert.equal(await readFile(fixture.root+'/'+request.path,'utf8'),request.expected);await writeFile(fixture.root+'/'+request.path,request.text);return {};}
  if(request.cmd==='read')return {text:await readFile(fixture.root+'/'+request.path,'utf8')};
  if(request.cmd.startsWith('ai'))throw Error('No analysis consent in this journey');
  return await fixture.adapter(request.cmd,request);
 }catch(e){return {error:e.message};}});
 await page.addInitScript(()=>{window.NotesNative={request:async message=>{const r=JSON.parse(message);window.nativeReply(r.id,await window.bridge(r));}};});
 await page.route('https://notes.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';await route.fulfill({body:await readFile(new URL('../build/web/'+name,import.meta.url)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 await page.goto('https://notes.test/');await page.locator('.home-tools').waitFor();
 const started=performance.now();
 await captureNote(page,'汇合捕获','- [ ] 历史计划，需要逐条确认。\n\n[[source|核对来源]]');
 await page.locator('#note-info-open').click();await page.locator('#note-create-topic').click();
 await page.locator('#topic-name').fill('汇合分类');await page.locator('#topic-form').evaluate(n=>n.requestSubmit());
 await page.locator('#note-info-drawer[open]').waitFor();
 assert.equal(await page.getByRole('checkbox',{name:'汇合分类',exact:true}).isChecked(),true);await closeNoteInfo(page);
 const capturedPath=await page.locator('#file-path').textContent();
 const capturedText=await readFile(fixture.root+'/'+capturedPath,'utf8');
 await page.locator('[data-view=notes]').click();await page.locator('#library-topic').selectOption({label:'汇合分类'});
 await page.waitForFunction(()=>document.querySelectorAll('#items [data-path]').length===1);
 await page.locator('#items [data-path]').click();await page.locator('#reading').waitFor({state:'visible'});
 await page.getByRole('button',{name:'打开本地笔记：核对来源',exact:true}).click();await page.locator('#reading').getByRole('button',{name:'打开本地笔记：下一份原文',exact:true}).click();
 await page.locator('#back').click();await page.locator('#reading').getByRole('button',{name:'打开本地笔记：下一份原文',exact:true}).waitFor();
 await page.locator('#back').click();await page.locator('#reading').getByRole('button',{name:'打开本地笔记：核对来源',exact:true}).waitFor();
 assert.equal(await page.locator('#file-path').textContent(),capturedPath);
 await page.locator('#note-create-action').click();await page.locator('#action-description').fill('汇合行动');await page.locator('#action-save').click();await page.locator('#action-drawer').waitFor({state:'hidden'});
 assert.equal(await page.locator('#file-path').textContent(),capturedPath);
 await page.locator('[data-view=initiatives]').click();await page.locator('#initiative-new').click();await page.locator('#initiative-title').fill('汇合事项');await page.locator('#initiative-goal').fill('核对跨页来源与明确决定');await page.locator('#initiative-save').click();await page.locator('#initiative-drawer').waitFor({state:'hidden'});
 await page.locator('#global-search-open').click();await page.locator('#global-search-input').fill('汇合捕获');await page.locator('[data-scope=note]').click();
 await page.locator('#global-search').getByRole('button',{name:'打开原文',exact:true}).first().click();
 await page.locator('#reading').waitFor({state:'visible'});assert.equal(await page.locator('#file-path').textContent(),capturedPath);
 await page.locator('.search-return:visible').click();await page.waitForFunction(()=>document.querySelector('#global-search').open);
 assert.equal(await page.locator('#global-search-input').inputValue(),'汇合捕获');await page.locator('#global-search').getByRole('button',{name:'关闭搜索',exact:true}).click();
 await page.locator('[data-view=organize]').click();
 const card=name=>page.locator('[data-candidate]').filter({has:page.getByRole('heading',{name,exact:true})});
 const first=card('行动：确认的行动');
 await first.getByText('确认前编辑建议',{exact:true}).click();await first.getByLabel('编辑建议',{exact:true}).fill('本机草稿');
 const other=card('行动：明确拒绝的行动');await other.getByText('确认前编辑建议',{exact:true}).click();await other.getByLabel('编辑建议',{exact:true}).fill('另一个私有草稿');
 await first.getByLabel('编辑建议',{exact:true}).focus();await page.locator('[data-view=notes]').click();await page.getByRole('button',{name:'继续编辑',exact:true}).click();
 assert.equal(await first.getByLabel('编辑建议',{exact:true}).inputValue(),'本机草稿');
 await page.locator('[data-view=notes]').click();await page.getByRole('button',{name:'保存并离开',exact:true}).click();await page.locator('#library-topic').waitFor();
 await page.reload();await page.locator('[data-view=organize]').click();await first.getByText('已恢复本机编辑草稿，尚未确认。',{exact:true}).waitFor();
 assert.equal(await first.getByLabel('编辑建议',{exact:true}).inputValue(),'本机草稿');
 await first.getByLabel('编辑建议',{exact:true}).focus();await page.locator('[data-view=notes]').click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();await page.locator('#library-topic').waitFor();
 await page.locator('[data-view=organize]').click();assert.equal(await first.getByLabel('编辑建议',{exact:true}).inputValue(),'确认的行动');
 for(const name of ['行动：确认的行动','事项：确认的事项','主题：确认的主题']){
  await card(name).getByRole('button',{name:/^确认此建议：/}).click();await card(name).getByText('处理决定：确认，已保存',{exact:true}).waitFor();
 }
 const initiatives=await fixture.adapter('actionQuery',{workspaceId:repo.workspaceId,entityType:'initiative'});
 await card('关联：确认的来源关联').getByLabel('已有事项',{exact:true}).selectOption(initiatives.actions.find(record=>record.title==='确认的事项').entityId);
 await card('关联：确认的来源关联').getByRole('button',{name:/^确认此建议：/}).click();await card('关联：确认的来源关联').getByText('处理决定：确认，已保存',{exact:true}).waitFor();
 await card('行动：明确拒绝的行动').getByRole('button',{name:/^忽略：/}).click();await card('行动：明确拒绝的行动').getByText('处理决定：忽略，已保存',{exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'全部行动',exact:true}).click();await page.getByRole('button').filter({has:page.getByRole('heading',{name:'确认的行动',exact:true})}).click();await page.waitForFunction(()=>document.querySelector('#action-description').value==='确认的行动');
 await page.locator('#action-drawer').getByRole('button',{name:/^关闭/}).click();
 await page.locator('[data-view=initiatives]').click();await page.getByRole('button').filter({has:page.getByRole('heading',{name:'确认的事项',exact:true})}).click();
 await page.getByRole('button',{name:/source.md/}).first().waitFor();
 await page.locator('[data-view=notes]').click();await page.locator('#library-topic').selectOption({label:'确认的主题'});await page.getByRole('button').filter({has:page.getByRole('heading',{name:'合成来源',exact:true})}).click();await page.locator('#reading').getByText('历史计划，需要逐条确认。',{exact:false}).waitFor();
 const records={};for(const entityType of ['action','initiative','topic','candidate'])records[entityType]=(await fixture.adapter('actionQuery',{workspaceId:repo.workspaceId,entityType})).actions;
 assert.equal(records.action.length,2);assert.equal(records.topic.length,2);assert.equal(records.initiative.find(record=>record.title==='确认的事项').sources[0].path,'source.md');assert.equal(records.candidate.filter(r=>r.review?.state==='done').length,5);
 assert.equal(await readFile(fixture.root+'/source.md','utf8'),text);assert.deepEqual(errors,[]);
 // Conflict review uses the exact same isolated repositories and document.
 const actions=new ActionRepository(fixture.adapter);await actions.open();
 const base=records.action.find(record=>record.description==='汇合行动');assert.ok(base);
 const left=(await actions.save({...base,description:'汇合行动左侧'},base)).record;
 const right={...base,revision:randomUUID(),parents:[base.revision],description:'汇合行动右侧'};
 await fixture.adapter('actionWrite',{workspaceId:actions.workspaceId,path:`revisions/${base.entityId}/${right.revision}.json`,text:JSON.stringify(right)});
 await page.getByRole('button',{name:'同步检查',exact:true}).click();const panel=page.getByRole('dialog',{name:'同步检查',exact:true});
 await panel.getByRole('button',{name:/选择版本 /}).first().click();await panel.getByLabel('内容',{exact:true}).fill('汇合行动人工解决');
 fixture.fail((cmd,args)=>cmd==='actionWrite'&&args.path.startsWith('revisions/'));
 await panel.getByRole('button',{name:'3. 保存解决结果到本地',exact:true}).click();await panel.getByText('解决结果未保存。请核对内容和目录后重试；编辑仍保留。若版本已变化，请放弃编辑并重新检查。',{exact:true}).waitFor();
 assert.equal(await panel.getByLabel('内容',{exact:true}).inputValue(),'汇合行动人工解决');
 await panel.getByRole('button',{name:'3. 保存解决结果到本地',exact:true}).click();await panel.getByText('现有版本中未发现待处理冲突。',{exact:true}).waitFor();
 await actions.recover();const resolved=(await actions.query()).actions.find(record=>record.entityId===base.entityId);
 assert.equal(resolved.description,'汇合行动人工解决');assert.deepEqual(new Set(resolved.parents),new Set([left.revision,right.revision]));
 await page.reload();await page.locator('.home-tools').waitFor();
 const restarted=new ActionRepository(fixture.adapter);await restarted.open();assert.equal((await restarted.query()).actions.find(record=>record.entityId===base.entityId).revision,resolved.revision);
 assert.equal(await readFile(fixture.root+'/'+capturedPath,'utf8'),capturedText);assert.equal(await readFile(fixture.root+'/source.md','utf8'),text);assert.deepEqual(errors,[]);
 await mkdir('build/issue102',{recursive:true});await writeFile('build/issue102/convergence-readback.json',JSON.stringify({records,resolved,capturedPath,capturedSHA256:createHash('sha256').update(capturedText).digest('hex'),sourceSHA256:createHash('sha256').update(text).digest('hex'),sourceUnchanged:true,elapsedMs:performance.now()-started,calls:fixture.calls.map(({cmd})=>cmd),transport:'Browser NotesNative -> real isolated Swift storage/SQLite; no WKWebView or OS input'},null,2));
 console.log('PASS coherent capture/classification/Library/wiki/Action/Initiative/search-return/candidate/conflict/reload journey: real persisted Action/Initiative/Topic/link readback, reload and delivered entrypoints, explicit rejection, no analysis, unchanged source');
} finally {await browser.close();await fixture.close();}
