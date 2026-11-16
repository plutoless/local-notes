import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
const fixture=await storageFixture(),calls=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try {
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
 await page.locator('#ai-send').click();await page.waitForFunction(()=>document.querySelector('#ai-status').textContent.startsWith('Complete:'));
 await page.getByText('action: Inspect evidence',{exact:true}).waitFor();assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,1);
 await page.reload();await page.locator('[data-view=organize]').click();await page.getByText('action: Inspect evidence',{exact:true}).waitFor();
 await page.locator('#ai-results button').first().click();await page.locator('#editor').waitFor();assert.equal(await page.locator('#file-path').textContent(),'reference.md');
 assert.deepEqual(errors,[]);console.log('Organization UI passed: settings cleared, explicit preview/send, persisted suggestions after reload, evidence opening.');
}finally{await browser.close();await fixture.close();}
