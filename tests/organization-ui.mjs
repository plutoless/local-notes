import {showReaderDetails} from './form-journeys.js';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
const fixture=await storageFixture(),calls=[];
const originalSource=await readFile(fixture.root+'/reference.md','utf8');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try {
 // Wheel input must expose controls without Playwright's automatic click scrolling.
 async function wheelReach(selector) {
  const target = page.locator(selector).first();
  const panel = page.locator('#organize-tools');
  const bounds = await panel.boundingBox();
  assert.ok(bounds && bounds.height > 100, 'Organization panel needs a bounded visible viewport: '+JSON.stringify(bounds));
  await page.mouse.move(bounds.x + bounds.width - 12, bounds.y + bounds.height / 2);
  for (let attempt = 0; attempt < 160; attempt++) {
   const visible = await target.evaluate(element => {
    const rect = element.getBoundingClientRect(), panel = document.querySelector('#organize-tools').getBoundingClientRect();
    const x = rect.x + Math.min(rect.width / 2, 40), y = rect.y + Math.min(rect.height / 2, 12);
    const hit = document.elementFromPoint(x, y);
    return rect.top >= panel.top && rect.bottom <= panel.bottom && Boolean(hit && (element.contains(hit) || hit.contains(element)));
   });
   if (visible) return target.boundingBox();
   const above = await target.evaluate(element => element.getBoundingClientRect().top < document.querySelector('#organize-tools').getBoundingClientRect().top);
   await page.mouse.wheel(0, above ? -35 : 35);
   await page.waitForTimeout(20);
  }
  const geometry = await target.evaluate(element => ({target:element.getBoundingClientRect().toJSON(), panel:document.querySelector('#organize-tools').getBoundingClientRect().toJSON(), scroll:document.querySelector('#organize-tools').scrollTop}));
  assert.fail(`${selector} is not visually reachable by ordinary wheel scrolling: ${JSON.stringify(geometry)}`);
 }
 const page=await browser.newPage({viewport:{width:1180,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('bridge',async request=>{
  calls.push(request);
  try{
   if(request.cmd==='aiSettings')return {address:'https://controlled.example/v1/chat/completions',model:'controlled',configured:true};
   if(request.cmd==='aiConfigure')return {};
   if(request.cmd==='aiAnalyze'){
    const batch=JSON.parse(request.messages[1].content);
    return {text:JSON.stringify({candidates:[{type:'action',content:'Inspect evidence',placement:'Independent suggestion',reasoning:'Explicit selected evidence',relevance:'Unknown current relevance',sources:[{fragmentId:batch.fragmentId,quote:batch.text.slice(0,20)}]}]})};
   }
   if(request.cmd==='read')return {text:await readFile(fixture.root+'/'+request.path,'utf8')};
   return await fixture.adapter(request.cmd,request);
  }catch(error){return {error:error.message};}
 });
 await page.addInitScript(()=>{window.NotesNative={request:async message=>{const r=JSON.parse(message);window.nativeReply(r.id,await window.bridge(r));}};});
 await page.route('https://notes.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';await route.fulfill({body:await readFile(new URL('../build/web/'+name,import.meta.url)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 await page.goto('https://notes.test/');await page.locator('[data-view=organize]').click();
 await page.locator('#ai-selection input').waitFor();assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,0);
 await page.locator('#ai-configure').click();
 const address = page.locator('#ai-address'), model = page.locator('#ai-model');
 const saveSettings = page.getByRole('button',{name:'保存设备设置',exact:true});
 await address.fill('http://controlled.example/v1/chat/completions');
 await model.fill('');
 await page.locator('#ai-token').fill('entered-test-token');
 await saveSettings.click();
 assert.equal(await address.getAttribute('aria-describedby'), 'ai-address-error');
 assert.match(await page.locator('#ai-address-error').textContent(), /HTTPS/);
 assert.equal(await model.getAttribute('aria-describedby'), 'ai-model-error');
 assert.equal(await address.inputValue(), 'http://controlled.example/v1/chat/completions');
 assert.equal(await page.locator('#ai-token').inputValue(), 'entered-test-token');
 await page.getByRole('button',{name:'取消设置',exact:true}).click();
 await page.getByRole('button',{name:'保存并离开',exact:true}).click();
 await page.getByText('保存尚未完成：请修正服务地址或模型后再保存。',{exact:true}).waitFor();
 await page.getByRole('button',{name:'继续编辑',exact:true}).click();
 assert.equal(await address.inputValue(), 'http://controlled.example/v1/chat/completions');
 assert.equal(await model.inputValue(), '');
 assert.equal(calls.filter(c => c.cmd === 'aiConfigure' || c.cmd === 'aiAnalyze').length, 0);
 await address.fill('https://controlled.example/v1/chat/completions');
 await model.fill('controlled');
 await saveSettings.click();
 await page.waitForFunction(()=>document.querySelector('#ai-token').value==='');
 assert.equal(await page.locator('#index-state').textContent(), '');
 await page.locator('#ai-selection input').check();await page.locator('#ai-preview').click();await page.waitForFunction(()=>!document.querySelector('#ai-send').disabled);
 await page.evaluate(() => window.dispatchEvent(new Event('focus')));
 await page.waitForTimeout(200);
 assert.equal(await page.locator('#ai-selection input').isChecked(), true, 'Revision refresh must preserve explicit selection');
 assert.ok((await page.locator('#ai-input').textContent()).includes('reference.md'));assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,0);
 for (const viewport of [{width:1180,height:800}, {width:800,height:600}, {width:380,height:548}]) {
  await page.setViewportSize(viewport);
  await page.locator('#organize-tools').evaluate(element => { element.scrollTop = 0; });
  const summary = await wheelReach('#ai-request-details summary');
  if (!await page.locator('#ai-request-details').evaluate(element => element.open)) {
   await page.mouse.click(summary.x + 30, summary.y + summary.height / 2);
  }
  await wheelReach('#ai-input');
  await wheelReach('#ai-send');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
 }
 const send = await wheelReach('#ai-send');
 await page.mouse.click(send.x + send.width / 2, send.y + send.height / 2);await page.waitForFunction(()=>document.querySelector('#ai-status').textContent.startsWith('已完成 '));
 await page.getByText('行动：Inspect evidence',{exact:true}).waitFor();assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,1);
 await page.reload();await page.locator('[data-view=organize]').click();await page.getByText('行动：Inspect evidence',{exact:true}).waitFor();
 for (const viewport of [{width:1180,height:800}, {width:800,height:600}, {width:380,height:548}]) {
  await page.setViewportSize(viewport);
  await page.locator('#organize-tools').evaluate(element => { element.scrollTop = 0; });
  await wheelReach('#ai-results p');
  await wheelReach('#ai-results button');
  await wheelReach('#ai-results-next');
 }
 await page.locator('#ai-selection input').check();
 const evidence = await wheelReach('#ai-results button');
 await page.mouse.click(evidence.x + evidence.width / 2, evidence.y + evidence.height / 2);await page.locator('#editor').waitFor();assert.equal(await page.locator('#file-path').textContent(),'reference.md');
 // Favorite the explicitly opened evidence through the delivered metadata owner.
 await showReaderDetails(page); await page.locator('#note-info-open').click(); await page.locator('#star').click();
 assert.equal(await page.locator('#star').getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'关闭笔记信息与整理',exact:true}).click();
 await page.locator('#back').click(); await page.locator('#ai-results').waitFor();
 await page.waitForFunction(() => document.activeElement.getAttribute('aria-label') === '打开来源：reference.md，建议：Inspect evidence');
 assert.equal(await page.locator('#ai-selection input').isChecked(), true);
 // Preserve Favorites origin through capture cancellation and explicit reader-to-Action save.
 await page.setViewportSize({width:1180,height:800});
 await page.locator('[data-view=favorites]').click();
 await page.locator('#items [data-path="reference.md"]').waitFor();
 await page.locator('#library-order').selectOption('title');
 await page.locator('#new').click(); await page.locator('#capture-title').fill('合成未保存捕获');
 await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
 await page.locator('#items [data-path="reference.md"]').click();
 await showReaderDetails(page); await page.locator('#note-create-action').click();
 await page.locator('#action-drawer[open]').waitFor();
 await page.locator('#action-description').fill('合成收藏来源行动');
 await page.locator('#action-save').click(); await page.locator('#action-drawer').waitFor({state:'hidden'});
 const workspaceId=(await fixture.adapter('workspace')).workspaceId;
 const persisted=(await fixture.adapter('actionQuery',{workspaceId,entityType:'action'})).actions;
 assert.equal(persisted.length,1); assert.equal(persisted[0].description,'合成收藏来源行动');
 assert.equal(persisted[0].sources[0].path,'reference.md');
 assert.equal(await page.locator('#file-path').textContent(),'reference.md');
 await page.locator('#back').click();
 await page.locator('#items [data-path="reference.md"]').waitFor();
 assert.equal(await page.locator('#library-order').inputValue(),'title');
 assert.equal(await page.locator('#items .selected').getAttribute('data-path'),'reference.md');
 await page.locator('[data-view=organize]').click(); await page.locator('#ai-selection input').waitFor();
 assert.equal(await page.locator('#ai-selection input').isChecked(),true);
 await page.getByText('行动：Inspect evidence',{exact:true}).waitFor();
 assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,1,'Favorite/capture/Action returns never send implicitly');
 assert.equal(await readFile(fixture.root+'/reference.md','utf8'),originalSource);
 await page.reload(); await page.locator('[data-view=favorites]').click();
 await page.locator('#items [data-path="reference.md"]').waitFor();
 assert.equal((await fixture.adapter('actionQuery',{workspaceId,entityType:'action'})).actions[0].entityId,persisted[0].entityId);
 assert.deepEqual(errors,[]);console.log('Organization UI passed: settings cleared, explicit preview/send, persisted suggestions after reload, evidence opening, Favorites/capture cancellation/Action save and return with persisted readback/source preservation, and wheel-only reachability at default, smaller desktop and minimum supported content sizes.');
}finally{await browser.close();await fixture.close();}
