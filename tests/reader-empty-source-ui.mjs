import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const fixture=await storageFixture();
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try {
  await writeFile(join(fixture.root,'Needle.md'),'');
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.exposeFunction('bridge',async request=>{
    try {
      if(request.cmd==='read')return {text:await readFile(join(fixture.root,request.path),'utf8')};
      return await fixture.adapter(request.cmd,request);
    }catch(error){return {error:error.message};}
  });
  await page.addInitScript(()=>{window.NotesNative={request:async message=>{const r=JSON.parse(message);window.nativeReply(r.id,await window.bridge(r));}};});
  const manifest=JSON.parse(await readFile('build/web/asset-manifest.json','utf8'));
  await page.route('https://notes.test/**',async route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
    if(!manifest[name])return route.abort();
    await route.fulfill({body:await readFile(join('build/web',name)),contentType:manifest[name]});
  });
  await page.goto('https://notes.test/');await page.locator('.home-tools').waitFor();
  await page.locator('#global-search-open').click();
  await page.locator('#global-search-input').fill('Needle');
  await page.locator('.search-result').getByRole('button',{name:'打开原文',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='Needle.md' && !document.querySelector('#reading').hidden);
  assert.equal(await page.locator('#reading').evaluate(node=>node===document.activeElement),true,'empty matched source receives actual DOM focus');
  assert.equal(await page.locator('#reading').getAttribute('aria-label'),'搜索匹配原文');
  assert.equal(await readFile(join(fixture.root,'Needle.md'),'utf8'),'','opening an empty source never synthesizes Markdown');
  assert.deepEqual(errors,[]);
  console.log('PASS real-storage empty Markdown filename search opens focusable labelled source without changing bytes');
} finally {await browser.close();await fixture.close();}
