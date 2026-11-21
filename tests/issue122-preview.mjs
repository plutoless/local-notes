import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.PREVIEW_EVIDENCE || 'build/validation/122/current/round1';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const receipts=[];
try {
for(const direction of ['a','b','c']){
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8122/'))external.push(r.url());});
 await page.goto(`http://127.0.0.1:8122/docs/design/issue122/?direction=${direction}`);
 await page.getByRole('button',{name:'新建行动',exact:true}).waitFor();
 const shot=async name=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return page.screenshot({animations:'disabled',path:`${out}/${direction}-${name}.png`,fullPage:false});};
 const fits=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await fits();await shot('desktop');
 await page.locator('pre').scrollIntoViewIfNeeded();await shot('markdown-table-code');await page.evaluate(()=>scrollTo(0,0));
 await page.getByRole('button',{name:'新建行动',exact:true}).click();
 await page.locator('#action-title').waitFor();
 assert.equal(await page.locator('#action-title').getAttribute('aria-invalid'),'true');
 await shot('form-error');
 await page.getByRole('button',{name:'预览确认',exact:true}).click();
 assert.equal(await page.locator('#action-title').evaluate(n=>n===document.activeElement),true);
 await page.locator('#action-title').fill('整理阅读提纲');
 await page.getByRole('button',{name:'预览确认',exact:true}).click();
 assert.match(await page.getByRole('status').innerText(),/未保存到工作区/);
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('button',{name:'新建行动',exact:true}).evaluate(n=>n===document.activeElement),true);
 await page.getByRole('button',{name:'搜索',exact:true}).click();
 await page.locator('#scope').selectOption('note');
 assert.match(await page.getByRole('status').innerText(),/2 条结果/);
 await page.locator('.stage').getByRole('button',{name:/离线阅读：表格/}).click();
 assert.equal(await page.locator('.stage').getByRole('button',{name:/离线阅读：表格/}).getAttribute('aria-pressed'),'true');
 await shot('search');
 await page.locator('#scope').selectOption('initiative');assert.match(await page.getByRole('status').innerText(),/1 条结果/);
 await page.locator('#scope').selectOption('action');assert.match(await page.getByRole('status').innerText(),/1 条结果/);
 await page.locator('#scope').selectOption('all');assert.match(await page.getByRole('status').innerText(),/4 条结果/);
 await page.locator('#query').fill('不存在的示例');
 assert.match(await page.getByRole('status').innerText(),/0 条结果/);
 await page.keyboard.press('Escape');
 for(const viewport of [{width:393,height:852},{width:1280,height:480}]){
  await page.setViewportSize(viewport);await fits();
  if(viewport.width===393){await shot('393-list');await page.locator('.row').first().click();await shot('393-reader');await page.getByRole('button',{name:'返回列表',exact:true}).click();await page.locator('.row').first().click();}
  else await shot('short');
  await page.getByRole('button',{name:'新建行动',exact:true}).click();
  await page.locator('#action-title').fill('');
  assert.equal(await page.getByRole('status').innerText(),'');
  await fits();await page.getByRole('button',{name:'预览确认',exact:true}).scrollIntoViewIfNeeded();
  const box=await page.getByRole('button',{name:'预览确认',exact:true}).boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height);
  await shot(viewport.width===393?'393-form':'short-form');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'搜索',exact:true}).click();await page.locator('#query').fill('阅读');await page.locator('#scope').selectOption('note');await fits();await shot(viewport.width===393?'393-search':'short-search');await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1280,height:900});
 await page.getByRole('button',{name:'搜索',exact:true}).focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 const focus=await page.getByRole('button',{name:'搜索',exact:true}).evaluate(n=>({outline:getComputedStyle(n).outlineStyle,color:getComputedStyle(n).outlineColor}));assert.equal(focus.outline,'solid');
 await shot('keyboard');await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.ui-action').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await shot('reduced-motion');await page.getByRole('button',{name:'搜索',exact:true}).click();await shot('reduced-motion-search');await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 receipts.push({direction,viewports:['1280x900','393x852','1280x480'],focus,errors,external,checked:['form-invalid-correction-retention','scope-query-empty','opener-return','narrow-list-reader-back','reachable-footer','horizontal-fit','keyboard-focus','reduced-motion']});
 await page.close();
}
await writeFile(`${out}/dom-results.json`,JSON.stringify(receipts,null,2));
console.log('Preview-only DOM/layout checks passed for A/B/C; not persistence/native acceptance.');
}finally{await browser.close();}
