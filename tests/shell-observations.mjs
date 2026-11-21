// Actual application observations through real synthetic Swift storage. No native UI.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
import {ActionRepository} from '../web/actions.js';
const fixture=await storageFixture();
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const output='build/issue93-observations'; await mkdir(output,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const results=[];
try {
  for(let i=0;i<320;i++) await writeFile(join(fixture.root,`synthetic-${i}.md`),'# 合成来源 '+i+'\n\n'+('保留逐字来源与只读任务标记 - [ ] 无写入\n'.repeat(60)));
  const repo=new ActionRepository(fixture.adapter);await repo.open();
  await repo.save({description:'这是用于检查当前重点的中文长描述与来源身份保持不变',focusPosition:1});
  const sourceHashes={};for(const name of await readdir(fixture.root))if(name.endsWith('.md'))sourceHashes[name]=hash(await readFile(join(fixture.root,name)));
  for(const [variant,assets] of [['baseline','build/issue93-baseline-source/build/web'],['migrated','build/web']]) {
    const context=await browser.newContext({viewport:{width:1180,height:800},reducedMotion:'reduce'});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let calls=[];
    await page.exposeFunction('bridge',async request=>{
      calls.push(request.cmd);
      try {
        if(request.cmd==='read')return {text:await readFile(join(fixture.root,request.path),'utf8')};
        return await fixture.adapter(request.cmd,request);
      }catch(e){return {error:e.message};}
    });
    await page.addInitScript(()=>{window.NotesNative={request:async message=>{const r=JSON.parse(message);window.nativeReply(r.id,await window.bridge(r));}};});
    await page.route('https://notes.test/**',async route=>{
      const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
      if(name.includes('..'))return route.abort();
      await route.fulfill({body:await readFile(join(resolve(assets),name)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});
    });
    const startup=[];
    for(let i=0;i<5;i++){
      calls=[];const start=performance.now();await page.goto('https://notes.test/');
      await page.getByRole('heading',{name:'优先处理',exact:true}).waitFor();startup.push(Math.round((performance.now()-start)*10)/10);
      assert.equal(calls.filter(c=>['read','list'].includes(c)).length,0);
      assert.equal(await page.locator('nav .active').getAttribute('data-view'),'focus');
      if(variant==='migrated') assert.equal(await page.locator('nav [aria-current=page]').getAttribute('data-view'),'focus');
    }
    await page.waitForTimeout(1100);
    assert.equal(calls.filter(c=>['read','list'].includes(c)).length,0);
    await page.screenshot({path:join(output,variant+'-desktop.png')});
    await page.locator('[data-view=notes]').click();await page.locator('#items [data-path]').first().waitFor();await page.waitForFunction(()=>!document.querySelector('#library-progress').textContent.includes('正在'));
    const warm=[];
    for(let i=0;i<3;i++){
      calls=[];const start=performance.now();await page.locator('[data-view=focus]').click();await page.getByRole('heading',{name:'优先处理',exact:true}).waitFor();warm.push(Math.round((performance.now()-start)*10)/10);
      assert.equal(calls.filter(c=>['read','list'].includes(c)).length,0);
      if(i<2){await page.locator('[data-view=notes]').click();await page.locator('#items [data-path]').first().waitFor();await page.waitForFunction(()=>!document.querySelector('#library-progress').textContent.includes('正在'));}
    }
    await page.locator('[data-view=focus]').focus();await page.keyboard.press('Tab');
    const keyboardOutline=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);
    assert.equal(keyboardOutline,'solid');
    for(const [label,size] of [['mobile',{width:393,height:852}],['short',{width:1180,height:430}]]) {
      await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:join(output,`${variant}-${label}.png`)});
    }
    assert.deepEqual(errors,[]);
    results.push({variant,startupMs:startup,warmHomeMs:warm,homeBodyReads:0,keyboardOutline,assets:{js:(await readFile(join(assets,'assets/react-host.js'))).length,css:(await readFile(join(assets,'assets/react-host.css'))).length}});
    await context.close();
  }
  for(const [name,expected] of Object.entries(sourceHashes))assert.equal(hash(await readFile(join(fixture.root,name))),expected);
  await writeFile(join(output,'results.json'),JSON.stringify({noteCount:Object.keys(sourceHashes).length,sourcePreserved:true,results,limitations:'Browser navigation includes harness/automation latency; not native cold startup, process memory or minimum engine coverage. Indexes warm after first run. Reduced-motion screenshots; native transport/OS not exercised.'},null,2));
  console.log('PASS: paired shell observations, zero home source reads, selected navigation, keyboard focus, responsive layouts and all synthetic source hashes preserved',JSON.stringify(results));
}finally{await browser.close();await fixture.close();}
