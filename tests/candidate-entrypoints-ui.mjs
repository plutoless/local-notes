import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
import {CandidateRepository,batchesFor,validateResponse} from '../web/organization.js';
const fixture=await storageFixture();
const text='# 合成来源\n\n- [ ] 历史计划，需要逐条确认。';
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
  if(request.cmd==='read')return {text:await readFile(fixture.root+'/'+request.path,'utf8')};
  if(request.cmd.startsWith('ai'))throw Error('No analysis consent in this journey');
  return await fixture.adapter(request.cmd,request);
 }catch(e){return {error:e.message};}});
 await page.addInitScript(()=>{window.NotesNative={request:async message=>{const r=JSON.parse(message);window.nativeReply(r.id,await window.bridge(r));}};});
 await page.route('https://notes.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';await route.fulfill({body:await readFile(new URL('../build/web/'+name,import.meta.url)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 await page.goto('https://notes.test/');await page.locator('[data-view=organize]').click();
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
 await card('关联：确认的来源关联').getByLabel('已有事项',{exact:true}).selectOption(initiatives.actions[0].entityId);
 await card('关联：确认的来源关联').getByRole('button',{name:/^确认此建议：/}).click();await card('关联：确认的来源关联').getByText('处理决定：确认，已保存',{exact:true}).waitFor();
 await card('行动：明确拒绝的行动').getByRole('button',{name:/^忽略：/}).click();await card('行动：明确拒绝的行动').getByText('处理决定：忽略，已保存',{exact:true}).waitFor();
 const persistedActions = (await fixture.adapter('actionQuery',{workspaceId:repo.workspaceId,entityType:'action'})).actions;
 const confirmedAction = persistedActions.find(action => action.description === '确认的行动');
 assert.ok(confirmedAction);
 await page.reload();
 await page.getByRole('button',{name:'全部行动',exact:true}).click();
 const actionRow = page.locator(`button[data-entity-id=${JSON.stringify(confirmedAction.entityId)}]`);
 assert.equal(await actionRow.locator('.action-list-title').textContent(), '确认的行动');
 await actionRow.click();
 await page.waitForFunction(()=>document.querySelector('#action-description').value==='确认的行动');
 await page.locator('#action-drawer').getByRole('button',{name:/^关闭/}).click();
 await page.locator('[data-view=initiatives]').click();await page.getByRole('button').filter({has:page.getByRole('heading',{name:'确认的事项',exact:true})}).click();
 await page.getByRole('button',{name:/source.md/}).first().waitFor();
 await page.locator('[data-view=notes]').click();await page.locator('#library-topic').selectOption({label:'确认的主题'});await page.getByRole('button').filter({has:page.getByRole('heading',{name:'合成来源',exact:true})}).click();await page.locator('#reading').getByText('历史计划，需要逐条确认。',{exact:false}).waitFor();
 const records={};for(const entityType of ['action','initiative','topic','candidate'])records[entityType]=(await fixture.adapter('actionQuery',{workspaceId:repo.workspaceId,entityType})).actions;
 assert.equal(records.action.length,1);assert.equal(records.topic.length,1);assert.equal(records.initiative[0].sources[0].path,'source.md');assert.equal(records.candidate.filter(r=>r.review?.state==='done').length,5);
 assert.equal(await readFile(fixture.root+'/source.md','utf8'),text);assert.deepEqual(errors,[]);
 await mkdir('build/issue99',{recursive:true});await writeFile('build/issue99/entrypoints-readback.json',JSON.stringify({records,sourceSHA256:createHash('sha256').update(text).digest('hex'),sourceUnchanged:true,transport:'Browser NotesNative -> real isolated Swift storage/SQLite; no WKWebView or OS input'},null,2));
 console.log('PASS candidate decisions: real persisted Action/Initiative/Topic/link readback, reload and delivered entrypoints, explicit rejection, no analysis, unchanged source');
} finally {await browser.close();await fixture.close();}
