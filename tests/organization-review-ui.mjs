import {readFile, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
import {InitiativeRepository} from '../web/initiatives.js';
const fixture = await storageFixture();
const text = '历史计划需要确认。核对来源证据。'.repeat(450);
await writeFile(fixture.root + '/reference.md', text);
const initiatives = new InitiativeRepository(fixture.adapter); await initiatives.open();
const initiative = (await initiatives.save({title:'合成事项', goal:'验证关联', progress:'', status:'active', sources:[]})).record;
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
let mode = 'partial', requests = 0, pending, failTarget = false, delayRead = false, releaseRead;
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
 await page.route('https://notes.test/**', async route => { const name = new URL(route.request().url()).pathname.slice(1) || 'index.html'; await route.fulfill({body:await readFile(new URL('../web/' + name, import.meta.url)), contentType:name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'}); });
 const organize = async () => { await page.locator('[data-view=organize]').click(); await page.locator('#ai-selection input').waitFor(); };
 const preview = async () => { await page.locator('#ai-selection input').check(); await page.locator('#ai-preview').click(); await page.waitForFunction(() => !document.querySelector('#ai-send').disabled); };
 const status = async pattern => { await page.waitForFunction(pattern => new RegExp(pattern).test(document.querySelector('#ai-status').textContent), pattern); };
 const card = i => page.locator('.suggestion-card').filter({has:page.getByRole('heading', {name:`行动：合成建议 ${i} · 0`, exact:true})});
 await page.goto('https://notes.test/'); await organize();
 assert.equal(await page.locator('#ai-cancel').isDisabled(), true);
 delayRead = true; await page.locator('#ai-selection input').check(); await page.locator('#ai-preview').click();
 await page.waitForFunction(() => document.querySelector('#ai-selection').inert);
 assert.equal(await page.locator('#ai-directory').isDisabled(), true);
 assert.equal(await page.locator('#ai-preview').isDisabled(), true);
 while (!releaseRead) await new Promise(resolve => setTimeout(resolve, 1)); delayRead = false; releaseRead();
 await page.waitForFunction(() => !document.querySelector('#ai-send').disabled); assert.equal(requests, 0);
 assert.equal(await page.locator('#ai-readable pre').allTextContents().then(x => x.join('')), text);
 await page.locator('#ai-selection input').uncheck(); assert.equal(await page.locator('#ai-send').isDisabled(), true);
 assert.equal(await page.locator('#ai-input').textContent(), '');
 await preview(); await page.locator('#ai-send').click(); await status('服务暂时');
 await page.waitForFunction(() => document.querySelectorAll('.suggestion-card').length === 6); assert.equal(await page.locator('.suggestion-card').count(), 6); assert.match(await page.locator('#ai-status').textContent(), /已完成 1\/2/);
 mode = 'ok'; await page.locator('#ai-send').click(); await status('已完成 2 / 2'); await page.waitForFunction(() => document.querySelectorAll('.suggestion-card').length === 12); assert.equal(await page.locator('.suggestion-card').count(), 12);
 await card(0).getByText('确认前编辑建议', {exact:true}).click(); await card(0).getByLabel('编辑建议', {exact:true}).fill('已编辑的合成建议');
 await card(0).getByRole('button', {name:'确认此建议', exact:true}).click(); await card(0).getByText('处理决定：确认，已保存').waitFor(); await card(0).getByText('保存的建议：已编辑的合成建议').waitFor();
 await card(1).getByRole('button', {name:'留待以后', exact:true}).click(); await card(1).getByText('处理决定：留待以后，已保存').waitFor();
 await card(2).getByLabel('已有事项', {exact:true}).selectOption(initiative.entityId); await card(2).getByRole('button', {name:'关联到事项', exact:true}).click(); await card(2).getByText('处理决定：关联事项，已保存').waitFor();
 await card(3).getByRole('button', {name:'作为参考资料', exact:true}).click(); await status('请先选择一个已有事项');
 await card(3).getByLabel('已有事项', {exact:true}).selectOption(initiative.entityId); await card(3).getByRole('button', {name:'作为参考资料', exact:true}).click(); await card(3).getByText('处理决定：作为参考，已保存').waitFor();
 await card(4).getByRole('button', {name:'忽略', exact:true}).click(); await card(4).getByText('处理决定：忽略，已保存').waitFor();
 failTarget = true; await card(5).getByRole('button', {name:'确认此建议', exact:true}).click(); await card(5).getByRole('button', {name:'恢复已确认的决定'}).waitFor();
 await writeFile(fixture.root + '/reference.md', '来源已被外部修改');
 await page.reload(); await organize(); await status('来源已变化');
 await writeFile(fixture.root + '/reference.md', text);
 await card(5).getByRole('button', {name:'恢复已确认的决定'}).click(); await card(5).getByText('处理决定：确认，已保存').waitFor();
 await page.reload(); await organize(); await card(0).getByText('保存的建议：已编辑的合成建议').waitFor();
 const actions = await fixture.adapter('actionQuery', {workspaceId:initiative.workspaceId, entityType:'action'}); assert.equal(actions.actions.length, 3); assert.equal(actions.actions.filter(a => a.initiativeId === initiative.entityId).length, 1);
 await writeFile(fixture.root + '/reference.md', '来源已被外部修改');
 await card(1).getByRole('button', {name:'确认此建议', exact:true}).click(); await status('来源已变化');
 await writeFile(fixture.root + '/reference.md', text);
 mode = 'hold'; await preview(); await page.locator('#ai-send').click(); await status('正在分析');
 assert.equal(await page.locator('#ai-preview').isDisabled(), true); await page.locator('#ai-cancel').click(); await status('已取消');
 mode = 'invalid'; await page.locator('#ai-send').click(); await status('返回的建议无法核验');
 mode = 'offline'; await page.locator('#ai-send').click(); await status('连接失败');
 assert.equal(await page.locator('.suggestion-card').count(), 12);
 await page.setViewportSize({width:393,height:852});
 await page.locator('#organize-tools').evaluate(e => e.scrollTop = 0);
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
 await page.locator('#ai-preview').focus(); await page.keyboard.press('Tab');
 const focus = await page.evaluate(() => ({tag:document.activeElement.tagName, outline:getComputedStyle(document.activeElement).outlineWidth, name:document.activeElement.textContent}));
 assert.equal(focus.tag, 'SUMMARY'); assert.equal(focus.outline, '3px'); assert.match(focus.name, /请求详情/);
 await page.screenshot({path:'docs/validation/issue20/web-393px.png'});
 const colors = await page.evaluate(() => ['--text','--muted','--green','--line','--focus'].map(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()));
 const lum = hex => { const rgb = hex.match(/[\da-f]{2}/gi).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
 const ratios = colors.map(c => (1.05)/(lum(c)+.05)); assert.ok(ratios[0]>=4.5 && ratios[1]>=4.5 && ratios[2]>=4.5 && ratios[3]>=3 && ratios[4]>=3);
 assert.deepEqual(errors, []);
 console.log('Organization review UI passed: exact preview, invalidation, partial retry, edited confirmation, later, attachment, reference, ignore, pending recovery, persistence, source-change rejection, cancellation, invalid response, offline retention, 393px, keyboard focus; contrast ratios on white:', ratios);
} finally { await browser.close(); await fixture.close(); }
