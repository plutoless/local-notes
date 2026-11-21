import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.PREVIEW_EVIDENCE||'build/validation/122/current/selected';
const origin=process.env.PREVIEW_ORIGIN||'http://127.0.0.1:8122';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try {
for(const viewport of [{width:1280,height:900},{width:393,height:852},{width:1280,height:480}]) {
 const page=await browser.newPage({viewport}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin))external.push(r.url());});
 const view=`${viewport.width}x${viewport.height}`;
 const shot=async state=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:`${out}/${view}-${state}.png`,animations:'disabled'});};
 const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page horizontal fit');
 await page.goto(`${origin}/docs/design/issue122/`);
 const info=page.getByRole('button',{name:'笔记信息',exact:true});await info.waitFor();
 assert.equal(await info.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#reference-context').count(),0);
 assert.equal(await page.locator('.reading-layout').evaluate(n=>n.children.length),1);
 await fits();await shot('reader-collapsed');
 await info.click();assert.equal(await info.getAttribute('aria-expanded'),'true');await fits();
 if(viewport.width>700){const a=await page.locator('article').boundingBox(),b=await page.locator('#reference-context').boundingBox();assert.ok(b.x>=a.x+a.width);}
 await page.locator('#reference-context').scrollIntoViewIfNeeded();await shot('context-expanded');
 await page.getByRole('button',{name:'收起',exact:true}).click();assert.equal(await info.evaluate(n=>n===document.activeElement),true);
 await page.locator('pre').scrollIntoViewIfNeeded();await shot('markdown-table-code');
 await page.evaluate(()=>scrollTo(0,0));
 const newAction=page.getByRole('button',{name:'新建行动',exact:true});await newAction.click();
 const dialog=page.getByRole('dialog');await dialog.waitFor();
 assert.equal(await page.locator('#selected-title').evaluate(n=>n===document.activeElement),true);
 await page.getByRole('button',{name:'预览确认',exact:true}).click();
 assert.equal(await page.locator('#selected-title').getAttribute('aria-invalid'),'true');
 assert.equal(await page.locator('#selected-description').inputValue(),'保留出处，再决定下一步。');
 const footer=await page.getByRole('button',{name:'预览确认',exact:true}).boundingBox();assert.ok(footer.y>=0&&footer.y+footer.height<=viewport.height);
 await shot('form-error');
 await page.locator('#selected-title').fill('整理阅读提纲');await page.getByRole('button',{name:'预览确认',exact:true}).click();
 assert.match(await page.getByRole('status').innerText(),/未保存到工作区/);
 await page.locator('#selected-title').fill('');assert.equal(await page.getByRole('status').innerText(),'');
 // A protected form keeps ownership when global search is invoked.
 await page.keyboard.press('Meta+k');assert.equal(await page.locator('#selected-query').count(),0);
 await page.keyboard.press('Escape');assert.equal(await newAction.evaluate(n=>n===document.activeElement),true);
 const searchButton=page.getByRole('button',{name:'搜索 ⌘K',exact:true});await searchButton.focus();await page.keyboard.press('Meta+k');
 const query=page.locator('#selected-query');await query.waitFor();assert.equal(await query.evaluate(n=>n===document.activeElement),true);
 // Existing shared drawer controls containment, not a new preview trap.
 await page.locator('.ui-drawer-footer').getByRole('button',{name:'关闭搜索',exact:true}).focus();await page.keyboard.press('Tab');
 assert.equal(await page.locator('.selected-task .ui-drawer-header button').evaluate(n=>n===document.activeElement),true);
 for(const [scope,count] of [['all',4],['note',2],['initiative',1],['action',1]]){
  await page.locator('#selected-scope').selectOption(scope);assert.match(await page.getByRole('status').innerText(),new RegExp(`${count} 条结果`));
 }
 await page.locator('#selected-scope').selectOption('note');await page.locator('.passage').nth(1).click();assert.equal(await page.locator('.passage').nth(1).getAttribute('aria-pressed'),'true');
 await page.keyboard.press('Meta+k');assert.equal(await query.evaluate(n=>n===document.activeElement),true);
 await shot('search-selected');
 await page.locator('.search-result').nth(1).getByRole('button',{name:'打开来源笔记',exact:true}).click();
 assert.match(await page.locator('article h1').innerText(),/离线阅读/);
 await page.getByRole('button',{name:'返回搜索结果',exact:true}).click();
 assert.equal(await query.inputValue(),'阅读');assert.equal(await page.locator('#selected-scope').inputValue(),'note');assert.equal(await page.locator('.passage').nth(1).getAttribute('aria-pressed'),'true');
 await query.fill('没有此示例');assert.match(await page.getByRole('status').innerText(),/0 条结果/);await page.keyboard.press('Escape');
 assert.match(await page.locator('article h1').innerText(),/把零散信息/);
 // Preview navigation demonstrates independent entities without writing records.
 await page.getByRole('navigation',{name:'常用入口'}).getByRole('button',{name:'行动',exact:true}).click();assert.equal(await page.locator('.entity-page h1').innerText(),'行动');
 await page.getByRole('navigation',{name:'常用入口'}).getByRole('button',{name:'事项',exact:true}).click();assert.equal(await page.locator('.entity-page h1').innerText(),'事项');
 await page.getByRole('navigation',{name:'常用入口'}).getByRole('button',{name:'资料库',exact:true}).click();assert.equal(await page.locator('.library-row').count(),5);await fits();await shot('library');
 await page.locator('.library-row').nth(2).click();assert.match(await page.locator('.source-path').innerText(),/写作\/会议记录/);
 await page.reload();await info.waitFor();assert.equal(await info.getAttribute('aria-expanded'),'false');
 await searchButton.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 assert.equal(await searchButton.evaluate(n=>getComputedStyle(n).outlineStyle),'solid');await shot('keyboard');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await searchButton.evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await shot('reduced-motion');
 await searchButton.click();await shot('reduced-motion-search');await page.keyboard.press('Escape');
 await fits();assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 results.push({viewport,errors,external,passed:['default-collapsed-right-context','reader-markdown','form-invalid-retained-corrected','protected-task','command-k-focus-containment-return','scope-selection-empty','source-return-context','independent-entity-entries','full-library','keyboard','reduced-motion','footer-fit']});
 await page.close();
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log('Selected preview DOM/state/layout checks passed (preview only).');
}finally{await browser.close();}
