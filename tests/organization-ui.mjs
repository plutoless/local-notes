import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
const fixture=await storageFixture(),calls=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try {
 // Wheel input must expose controls without Playwright's automatic click scrolling.
 async function wheelReach(selector) {
  const target = page.locator(selector).first();
  const panel = page.locator('#organize-tools');
  const bounds = await panel.boundingBox();
  assert.ok(bounds && bounds.height > 100, 'Organization panel needs a bounded visible viewport');
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
 await page.route('https://notes.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';await route.fulfill({body:await readFile(new URL('../web/'+name,import.meta.url)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 await page.goto('https://notes.test/');await page.locator('[data-view=organize]').click();
 await page.locator('#ai-selection input').waitFor();assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,0);
 await page.locator('#ai-token').fill('entered-test-token');await page.locator('#ai-settings button').click();await page.waitForFunction(()=>document.querySelector('#ai-token').value==='');
 await page.locator('#ai-selection input').check();await page.locator('#ai-preview').click();await page.waitForFunction(()=>!document.querySelector('#ai-send').disabled);
 assert.ok((await page.locator('#ai-input').textContent()).includes('reference.md'));assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,0);
 for (const viewport of [{width:1180,height:800}, {width:800,height:600}, {width:380,height:548}]) {
  await page.setViewportSize(viewport);
  await page.locator('#organize-tools').evaluate(element => { element.scrollTop = 0; });
  const summary = await wheelReach('#organize-tools summary');
  if (!await page.locator('#organize-tools details').evaluate(element => element.open)) {
   await page.mouse.click(summary.x + 30, summary.y + summary.height / 2);
  }
  await wheelReach('#ai-input');
  await wheelReach('#ai-send');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
 }
 const send = await wheelReach('#ai-send');
 await page.mouse.click(send.x + send.width / 2, send.y + send.height / 2);await page.waitForFunction(()=>document.querySelector('#ai-status').textContent.startsWith('Complete:'));
 await page.getByText('action: Inspect evidence',{exact:true}).waitFor();assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,1);
 await page.reload();await page.locator('[data-view=organize]').click();await page.getByText('action: Inspect evidence',{exact:true}).waitFor();
 for (const viewport of [{width:1180,height:800}, {width:800,height:600}, {width:380,height:548}]) {
  await page.setViewportSize(viewport);
  await page.locator('#organize-tools').evaluate(element => { element.scrollTop = 0; });
  await wheelReach('#ai-results p');
  await wheelReach('#ai-results button');
  await wheelReach('#ai-results-next');
 }
 const evidence = await wheelReach('#ai-results button');
 await page.mouse.click(evidence.x + evidence.width / 2, evidence.y + evidence.height / 2);await page.locator('#editor').waitFor();assert.equal(await page.locator('#file-path').textContent(),'reference.md');
 assert.deepEqual(errors,[]);console.log('Organization UI passed: settings cleared, explicit preview/send, persisted suggestions after reload, evidence opening, and wheel-only reachability at default, smaller desktop and minimum supported content sizes.');
}finally{await browser.close();await fixture.close();}
