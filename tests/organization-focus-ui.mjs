import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
import {InitiativeRepository} from '../web/initiatives.js';
const fixture = await storageFixture();
const phase = process.env.PHASE || 'after';
await mkdir(`build/issue85-${phase}`, {recursive:true});
const text = '历史计划需要确认。核对来源证据。'.repeat(450);
await writeFile(fixture.root + '/reference.md', text);
const initiatives = new InitiativeRepository(fixture.adapter); await initiatives.open();
const initiative = (await initiatives.save({title:'合成事项', goal:'验证关联', progress:'', status:'active', sources:[]})).record;
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
let mode = 'ok', requests = 0, pending, failTarget = false, delayRead = false, releaseRead;
try {
 const page = await browser.newPage({viewport:{width:1180,height:800}});
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.exposeFunction('bridge', async request => {
  try {
   if (request.cmd === 'aiSettings') return {address:'http://127.0.0.1/controlled', model:'controlled', configured:true};
   if (request.cmd === 'aiCancel') { pending?.({error:'Canceled'}); pending = null; return {}; }
   if (request.cmd === 'aiAnalyze') {
    requests++;
    if (mode === 'hold') return await new Promise(resolve => pending = resolve);
    if (mode === 'offline') return {error:'Offline or connection failed; retry explicitly'};
    if (mode === 'invalid') return {text:'{invalid'};
    if (mode === 'partial' && requests === 2) return {error:'Rate limited; retry explicitly'};
    const batch = JSON.parse(request.messages[1].content);
    return {text:JSON.stringify({candidates:Array.from({length:6}, (_, i) => ({type:'action', content:`合成建议 ${i} · ${batch.start}`, placement:'独立行动', reasoning:'来源明确提及核对证据', relevance:'历史计划，当前适用性待确认', sources:[{fragmentId:batch.fragmentId, quote:batch.text.slice(0,16)}]}))})};
   }
   if (request.cmd === 'read' && delayRead) await new Promise(resolve => releaseRead = resolve);
   if (request.cmd === 'read') return {text:await readFile(fixture.root + '/' + request.path, 'utf8')};
   if (failTarget && request.cmd === 'actionWrite' && request.path.startsWith('revisions/') && JSON.parse(request.text).entityType === 'action') { failTarget = false; return {error:'Synthetic target write failure'}; }
   return await fixture.adapter(request.cmd, request);
  } catch (error) { return {error:error.message}; }
 });
 await page.addInitScript(() => { window.NotesNative = {request:async message => { const r = JSON.parse(message); window.nativeReply(r.id, await window.bridge(r)); }}; });
 await page.route('https://notes.test/**', async route => { const name = new URL(route.request().url()).pathname.slice(1) || 'index.html'; await route.fulfill({body:await readFile(phase === 'before' && ['organize-screen.js','app.js'].includes(name) ? new URL('../build/issue85-before-'+name, import.meta.url) : new URL('../web/' + name, import.meta.url)), contentType:name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'}); });
 const organize = async () => { await page.locator('[data-view=organize]').click(); await page.locator('#ai-selection input').waitFor(); };
 const preview = async () => { await page.locator('#ai-selection input').check(); await page.locator('#ai-preview').click(); await page.waitForFunction(() => !document.querySelector('#ai-send').disabled); };
 const status = async pattern => { await page.waitForFunction(pattern => new RegExp(pattern).test(document.querySelector('#ai-status').textContent), pattern); };
 const card = i => page.locator('.suggestion-card').filter({has:page.getByRole('heading', {name:`行动：合成建议 ${i} · 0`, exact:true})});
 await page.goto('https://notes.test/'); await organize();
 const checkbox = page.locator('#ai-selection input');
 await checkbox.check();
 await page.screenshot({path:`build/issue85-${phase}/checked-pointer.png`});
 assert.equal(await checkbox.evaluate(n=>n.matches(':focus-visible')),false);
 await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
 await page.keyboard.press('Space'); assert.equal(await checkbox.isChecked(),false);
 await page.keyboard.press('Space'); assert.equal(await checkbox.isChecked(),true);
 assert.equal(await checkbox.evaluate(n=>getComputedStyle(n).outlineStyle),'none');
 assert.equal(await checkbox.evaluate(n=>getComputedStyle(n.parentElement).outlineWidth),'3px');
 for (const size of [{width:1180,height:800},{width:393,height:650},{width:1180,height:480}]) {
  await page.setViewportSize(size); await checkbox.scrollIntoViewIfNeeded();
  await page.screenshot({path:`build/issue85-${phase}/checked-keyboard-${size.width}-${size.height}.png`});
  assert.ok(await checkbox.evaluate(n=>n.parentElement.getBoundingClientRect().height>=44));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.setViewportSize({width:1180,height:800});
 await page.locator('#ai-preview').click(); await status('预览已就绪');
 assert.equal(requests,0); assert.equal(await page.locator('#ai-readable pre').allTextContents().then(x=>x.join('')),text);
 await page.locator('#ai-send').click(); await status('已完成 2 / 2');
 await page.waitForFunction(()=>document.querySelectorAll('.suggestion-card').length===12);
 await card(0).getByText('确认前编辑建议',{exact:true}).click();
 const edit = card(0).getByLabel('编辑建议',{exact:true});
 await edit.fill(''); await edit.press('Tab');
 const confirm = card(0).getByRole('button',{name:/^确认此建议：/});
 await confirm.focus(); await page.keyboard.press('Enter'); await status('建议内容不能为空');
 if(phase==='after' || process.env.ASSERT_FOCUS) assert.equal(await confirm.evaluate(n=>n===document.activeElement),true,'invalid review restores its action');
 await edit.fill('合成长中文建议：逐条核对当前适用性、保留来源与用户决定'.repeat(5));
 await card(0).getByLabel('已有事项',{exact:true}).selectOption(initiative.entityId);
 await edit.evaluate(n=>n.setSelectionRange(2,8));
 const source = card(0).getByRole('button',{name:/^打开来源：/});
 await source.click(); await page.locator('#back').click();
 await card(0).getByLabel('已有事项',{exact:true}).waitFor();
 if(phase==='after' || process.env.ASSERT_FOCUS) {
  assert.equal(await card(0).getByLabel('已有事项',{exact:true}).inputValue(),initiative.entityId);
  assert.deepEqual(await edit.evaluate(n=>[n.selectionStart,n.selectionEnd]),[2,8]);
  await page.waitForFunction(()=>document.activeElement.getAttribute('aria-label')?.startsWith('打开来源：'));
  assert.equal(await source.evaluate(n=>n===document.activeElement),true);
 }
 for(const size of [{width:1180,height:800},{width:393,height:650},{width:1180,height:480}]) {
  await page.setViewportSize(size);
  await source.scrollIntoViewIfNeeded();
  await page.screenshot({path:`build/issue85-${phase}/candidate-pointer-${size.width}-${size.height}.png`});
  await confirm.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await page.screenshot({path:`build/issue85-${phase}/candidate-keyboard-${size.width}-${size.height}.png`});
  assert.equal(await confirm.evaluate(n=>getComputedStyle(n).outlineWidth),'3px');
  assert.ok(await confirm.evaluate(n=>n.getBoundingClientRect().height>=44));
  await edit.fill('');
  await page.screenshot({path:`build/issue85-${phase}/invalid-field-${size.width}-${size.height}.png`});
  assert.equal(await edit.getAttribute('aria-invalid'),'true');
  await edit.fill('合成长中文建议：逐条核对当前适用性、保留来源与用户决定'.repeat(5));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await confirm.focus(); await page.keyboard.press('Enter'); await status('决定已保存');
 if(phase==='after' || process.env.ASSERT_FOCUS) {
  await page.waitForFunction(()=>document.activeElement.matches('[data-candidate]'));
  assert.equal(await card(0).evaluate(n=>n===document.activeElement),true,'confirmed candidate remains the meaningful return target');
 }
 await page.screenshot({path:`build/issue85-${phase}/confirmed-keyboard.png`});
 assert.equal((await fixture.adapter('actionQuery',{workspaceId:initiative.workspaceId,entityType:'action'})).actions.length,1);
 assert.equal(await readFile(fixture.root+'/reference.md','utf8'),text);
 assert.deepEqual(errors,[]);
 console.log(`PASS issue85 ${phase}: checkbox pointer/Space/Tab, geometry, exact preview, controlled send, invalid action, source detour context, explicit individual confirmation and source preservation`);
} finally {await browser.close();await fixture.close();}
