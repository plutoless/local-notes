import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture(), calls = [];
for (const dir of ['current', 'archive']) {
 await mkdir(`${fixture.root}/${dir}`);
 for (let i=0;i<55;i++) await writeFile(`${fixture.root}/${dir}/${String(i).padStart(2,'0')}.md`, `# 可辨认的重复标题 ${i}\n\n${dir} 合成正文 needle${i} - [ ] 历史计划`);
}
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
try {
 const page = await browser.newPage({viewport:{width:1180,height:800}});
 let failQuery = false, delay = null, reached;
 const heldQuery = new Promise(resolve => reached = resolve);
 await page.exposeFunction('bridge', async request => {
  calls.push(request);
  try {
   if(request.cmd==='aiSettings') return {address:'',model:'',configured:false};
   if(request.cmd==='aiConfigure') throw Error('configuration failure');
   if(request.cmd==='read') return {text:await readFile(`${fixture.root}/${request.path}`,'utf8')};
   if(request.cmd==='referenceQuery' && failQuery) {failQuery=false; throw Error('query failed');}
   const result = await fixture.adapter(request.cmd,request);
   if(request.cmd==='referenceQuery' && request.search==='needle1') await new Promise(resolve=>{delay=resolve; reached();});
   return result;
  } catch(error) {return {error:error.message};}
 });
 await page.addInitScript(()=>{window.NotesNative={request:async message=>{const r=JSON.parse(message);window.nativeReply(r.id,await window.bridge(r));}};});
 await page.route('https://notes.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';await route.fulfill({body:await readFile(new URL('../web/'+name,import.meta.url)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 await page.goto('https://notes.test/'); await page.locator('[data-view=organize]').click();
 await page.waitForFunction(()=>document.querySelectorAll('#ai-selection input').length===50);
 assert.equal(await page.locator('#ai-settings-drawer').isVisible(),false);
 assert.ok((await page.locator('#ai-selection').textContent()).includes('可辨认的重复标题'));
 const reads = calls.filter(c=>c.cmd==='read').length;
 await page.locator('#ai-selection input').first().check();
 await page.locator('#ai-notes-next').click();
 await page.waitForFunction(()=>document.querySelector('#ai-notes-previous').disabled===false);
 await page.locator('#ai-directory').selectOption('current');
 await page.locator('#ai-search').fill('needle1');
 await heldQuery;
 await page.locator('#ai-search').fill('needle54');
 await page.waitForFunction(()=>document.querySelectorAll('#ai-selection input').length===1);
 assert.equal(typeof delay,'function'); delay();
 await page.waitForTimeout(100);
 assert.equal(await page.locator('#ai-selection input').inputValue(),'current/54.md');
 await page.locator('#ai-selection input').check();
 assert.equal(calls.filter(c=>c.cmd==='read').length,reads,'Search/filter/page must query index without body reads');
 await page.locator('#ai-preview').click();
 await page.waitForFunction(()=>document.querySelector('#ai-status').textContent.includes('预览已就绪'));
 assert.equal(calls.filter(c=>c.cmd==='read').length,reads+2);
 assert.equal(await page.locator('#ai-send').isDisabled(),true);
 await page.locator('#ai-configure').click(); await page.locator('#ai-token').fill('synthetic');
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'继续编辑',exact:true}).click(); assert.equal(await page.locator('#ai-token').inputValue(),'synthetic');
 await page.keyboard.press('Escape'); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
 assert.equal(await page.locator('#ai-configure').evaluate(el=>el===document.activeElement),true);
 assert.ok((await page.locator('#ai-selection-state').textContent()).includes('2 / 20'));
 assert.ok((await page.locator('#ai-input').textContent()).includes('current/54.md'));
 await page.locator('#ai-configure').click(); assert.equal(await page.locator('#ai-token').inputValue(),'');
 await page.locator('#ai-address').fill('https://controlled.example'); await page.locator('#ai-model').fill('synthetic');
 await page.getByRole('button',{name:'保存设备设置',exact:true}).click(); await page.locator('#ai-settings-error').getByText('服务尚不可用', {exact:false}).waitFor();
 await page.getByRole('button',{name:'取消设置',exact:true}).click(); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
 failQuery=true; await page.locator('#ai-search').fill('retry'); await page.locator('#ai-notes-retry').waitFor();
 await page.locator('#ai-notes-retry').click(); await page.getByText('没有匹配的笔记。请更改搜索或目录。',{exact:true}).waitFor();
 await page.locator('#ai-search').fill(''); await page.waitForFunction(()=>document.querySelectorAll('#ai-selection input').length===50);
 for(let i=0;i<21;i++) await page.locator('#ai-selection input').nth(i).check().catch(()=>{});
 assert.ok((await page.locator('#ai-selection-state').textContent()).includes('20 / 20'));
 assert.equal(await page.locator('#ai-readable').textContent(),'');
 for(const viewport of [{width:1180,height:800},{width:393,height:650}]) {
  await page.setViewportSize(viewport); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`build/issue71-selection-${viewport.width}.png`});
 }
 assert.ok(calls.filter(c=>c.cmd==='referenceQuery').every(c=>c.limit===50));
 assert.equal(calls.filter(c=>c.cmd==='aiAnalyze').length,0);
 console.log('PASS organization selection: real Swift SQLite index, bounded title/body search/filter/page, stale responses, retained selections/limit, explicit preview, setup failure/cancel, empty/retry, desktop/393px, zero sends.');
} finally {await browser.close(); await fixture.close();}
