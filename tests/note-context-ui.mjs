// Real app + isolated production Swift record/index adapter. HTTP transport only.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,rename} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const fixture=await storageFixture();
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const output='build/issue94-observations';await mkdir(output,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');const results=[];
try {
  const paths=[];
  for(let i=0;i<65;i++){const path=`synthetic-${String(i).padStart(2,'0')}.md`;paths.push(path);await writeFile(join(fixture.root,path),`# 合成资料 ${i}\n\n保留中文原文与只读任务 - [ ] 待确认\n`);}
  const hashes={};for(const name of await readdir(fixture.root))if(name.endsWith('.md'))hashes[name]=hash(await readFile(join(fixture.root,name)));
  for(const [variant,assets] of [['baseline','build/issue94-baseline'],['migrated','build/web']]) {
    const context=await browser.newContext({viewport:{width:1180,height:800},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let calls=[];
    await page.exposeFunction('bridge',async request=>{calls.push(request.cmd);try {
      if(request.cmd==='read')return {text:await readFile(join(fixture.root,request.path),'utf8')};
      if(request.cmd==='create'){const p=join(fixture.root,request.path);await mkdir(dirname(p),{recursive:true});await writeFile(p,request.text,{flag:'wx'});return {};}
      if(request.cmd==='move'){const p=join(fixture.root,request.path);assert.equal(await readFile(p,'utf8'),request.expected);const target=join(fixture.root,request.target);await mkdir(dirname(target),{recursive:true});await rename(p,target);return {};}
      return await fixture.adapter(request.cmd,request);
    }catch(e){return {error:e.message};}});
    await page.addInitScript(stars=>{if(!localStorage.getItem('stars'))localStorage.setItem('stars',JSON.stringify(stars));window.NotesNative={request:async message=>{const r=JSON.parse(message);window.nativeReply(r.id,await window.bridge(r));}};},paths);
    await page.route('https://notes.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';if(name.includes('..'))return route.abort();await route.fulfill({body:await readFile(join(resolve(assets),name)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
    await page.goto('https://notes.test/');await page.getByRole('heading',{name:'优先处理',exact:true}).waitFor();
    await page.locator('[data-view=favorites]').click();await page.locator('#items [data-path]').first().waitFor();await page.waitForFunction(()=>!document.querySelector('#library-progress').textContent.includes('正在'));
    const warm=[];for(let i=0;i<3;i++){const start=performance.now();await page.locator('#library-refresh').click();await page.waitForFunction(()=>!document.querySelector('#library-progress').textContent.includes('正在'));warm.push(Math.round(performance.now()-start));}
    await page.locator('#new').click();await page.locator('#capture-title').fill('用于检查很长的中文捕获标题和光标选择保留');await page.locator('#capture-body').fill('不发送私密内容。'.repeat(25));
    await page.locator('#capture-title').evaluate(n=>{n.focus();n.setSelectionRange(2,7);});
    assert.deepEqual(await page.locator('#capture-title').evaluate(n=>[n.selectionStart,n.selectionEnd]),[2,7]);
    for(const [name,size] of [['desktop',{width:1180,height:800}],['mobile',{width:393,height:800}],['short',{width:393,height:340}]]) {await page.setViewportSize(size);await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.waitForTimeout(180);assert.equal(await page.locator('#note-task-drawer .ui-drawer-footer').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true);await page.screenshot({path:join(output,`${variant}-${name}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
    await page.locator('#note-task-drawer .ui-drawer-footer button').first().click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
    await page.setViewportSize({width:1180,height:800});
    if(variant==='migrated') {
      await page.locator('#library-order').selectOption('path');await page.locator('#library-next').click();await page.locator('#items [data-path="synthetic-50.md"]').waitFor();
      await page.locator('#items').evaluate(n=>n.scrollTop=120);
      await page.locator('#items [data-path="synthetic-52.md"]').click();await page.locator('#reading').waitFor({state:'visible'});await page.locator('#back').click();
      assert.equal(await page.locator('#library-order').inputValue(),'path');assert.match(await page.locator('#library-page').textContent(),/51–65/);assert.equal(await page.locator('#items .selected').getAttribute('data-path'),'synthetic-52.md');
      await page.locator('[data-view=notes]').click();await page.waitForFunction(()=>document.querySelector('#view-title').textContent==='笔记库');assert.equal(await page.locator('#library-order').inputValue(),'current');
      await page.locator('[data-view=favorites]').click();await page.waitForFunction(()=>document.querySelector('#view-title').textContent==='收藏');assert.equal(await page.locator('#library-order').inputValue(),'path');assert.match(await page.locator('#library-page').textContent(),/51–65/);
      await page.setViewportSize({width:393,height:340});
      await page.locator('.collection').evaluate(n=>n.scrollTop=120);
      const savedScroll=await page.locator('.collection').evaluate(n=>n.scrollTop);assert.ok(savedScroll>0);
      await page.locator('[data-view=focus]').click();await page.getByRole('heading',{name:'优先处理',exact:true}).waitFor();
      await page.getByRole('button',{name:'全部行动',exact:true}).click();await page.locator('#action-new').waitFor();
      await page.locator('[data-view=favorites]').click();await page.waitForFunction(()=>document.querySelector('#view-title').textContent==='收藏');
      assert.equal(await page.locator('.collection').evaluate(n=>n.scrollTop),savedScroll);await page.setViewportSize({width:1180,height:800});
      await page.locator('#new').click();await page.locator('#capture-title').fill('真实收藏上下文捕获');await page.locator('#capture-body').fill('合成持久正文');await page.getByRole('button',{name:'创建笔记',exact:true}).click();await page.locator('#capture-return').waitFor({state:'visible'});
      const captured=await page.locator('#file-path').textContent();assert.match(await readFile(join(fixture.root,captured),'utf8'),/合成持久正文/);
      await page.locator('#capture-return').click();await page.waitForFunction(()=>document.querySelector('#view-title').textContent==='收藏' && document.querySelector('#library-page').textContent.includes('51–65'));assert.equal(await page.locator('nav [aria-current=page]').getAttribute('data-view'),'favorites');assert.match(await page.locator('#library-page').textContent(),/51–65/);
      await page.reload();await page.locator('[data-view=notes]').click();await page.locator('#search').fill('真实收藏上下文捕获');await page.locator('#items [data-path]').filter({hasText:'真实收藏上下文捕获'}).click();await page.locator('#reading').waitFor({state:'visible'});assert.equal(await page.locator('#file-path').textContent(),captured);assert.match(await page.locator('#reading').textContent(),/合成持久正文/);
    }
    assert.deepEqual(errors,[]);results.push({variant,warmRefreshMs:warm,readCommands:calls.filter(c=>c==='read').length,jsBytes:(await readFile(join(assets,'assets/react-host.js'))).length,cssBytes:(await readFile(join(assets,'assets/react-host.css'))).length});await context.close();
  }
  for(const [name,value] of Object.entries(hashes))assert.equal(hash(await readFile(join(fixture.root,name))),value);
  await writeFile(join(output,'results.json'),JSON.stringify({sourceHashes:hashes,sourcePreserved:true,results,limitations:'Browser automation latency, warm indexes; not native transport, cold startup, OS input or process memory.'},null,2));
  console.log('PASS paired C form layout/caret, Favorites paging/selection/return and independent context, capture saved readback/reload, original source hashes preserved',JSON.stringify(results));
}finally{await browser.close();await fixture.close();}
