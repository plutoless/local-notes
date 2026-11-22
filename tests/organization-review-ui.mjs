import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {storageFixture} from './action-adapter.js';
import {InitiativeRepository} from '../web/initiatives.js';
await mkdir('build/issue98-review', {recursive:true});
const fixture = await storageFixture();
const outbound = [];
const text = '历史计划需要确认。核对来源证据。'.repeat(450);
await writeFile(fixture.root + '/reference.md', text);
const initiatives = new InitiativeRepository(fixture.adapter); await initiatives.open();
const initiative = (await initiatives.save({title:'合成事项', goal:'验证关联', progress:'', status:'active', sources:[]})).record;
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
const responseFor = batch => ({text:JSON.stringify({candidates:Array.from({length:6}, (_, i) => ({
 type:'action', content:`合成建议 ${i} · ${batch.start}`, placement:'独立行动', reasoning:'来源明确提及核对证据',
 relevance:'历史计划，当前适用性待确认', sources:[{fragmentId:batch.fragmentId, quote:batch.text.slice(0,16)}]
}))})});
let mode = 'partial', requests = 0, pending, failTarget = false, delayRead = false, releaseRead, releaseCancel;
try {
 const page = await browser.newPage({viewport:{width:1180,height:800}});
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.exposeFunction('bridge', async request => {
  try {
   if (request.cmd === 'aiSettings') return {address:'http://127.0.0.1/controlled', model:'controlled', configured:true};
   if (request.cmd === 'aiCancel') {
    pending?.({error:'Canceled'}); pending = null;
    await new Promise(resolve => releaseCancel = resolve);
    return {};
   }
   if (request.cmd === 'aiAnalyze') {
    requests++;
    outbound.push(request.messages);
    if (mode === 'hold') return await new Promise(resolve => pending = resolve);
    if (mode === 'offline') return {error:'Offline or connection failed; retry explicitly'};
    if (mode === 'invalid') return {text:'{invalid'};
    if (mode === 'partial' && requests === 2) return {error:'Rate limited; retry explicitly'};
    const batch = JSON.parse(request.messages[1].content);
    return responseFor(batch);
   }
   if (request.cmd === 'read') {
    assert.equal(request.workspaceId, initiative.workspaceId);
    assert.equal(request.path, 'reference.md');
    if (delayRead) await new Promise(resolve => releaseRead = resolve);
    return {text:await readFile(fixture.root + '/reference.md', 'utf8')};
   }
   if (failTarget && request.cmd === 'actionWrite' && request.path.startsWith('revisions/') && JSON.parse(request.text).entityType === 'action') { failTarget = false; return {error:'Synthetic target write failure'}; }
   return await fixture.adapter(request.cmd, request);
  } catch (error) { return {error:error.message}; }
 });
 await page.addInitScript(() => { window.NotesNative = {request:async message => { const r = JSON.parse(message); window.nativeReply(r.id, await window.bridge(r)); }}; });
 await page.route('https://notes.test/**', async route => { const name = new URL(route.request().url()).pathname.slice(1) || 'index.html'; await route.fulfill({body:await readFile(new URL('../build/web/' + name, import.meta.url)), contentType:name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'}); });
 const organize = async () => { await page.locator('[data-view=organize]').click(); await page.locator('#ai-selection input').waitFor(); };
 const preview = async () => { await page.locator('#ai-selection input').check(); await page.locator('#ai-preview').click(); await page.waitForFunction(() => !document.querySelector('#ai-send').disabled); };
 const status = async pattern => { await page.waitForFunction(pattern => new RegExp(pattern).test(document.querySelector('#ai-status').textContent), pattern); };
 const card = i => page.locator('.suggestion-card').filter({has:page.getByRole('heading', {name:`行动：合成建议 ${i} · 0`, exact:true})});
 await page.goto('https://notes.test/'); await organize();
 assert.equal(await page.locator('#ai-cancel').isDisabled(), true);
 assert.equal(await page.locator('#ai-send').isDisabled(), true);
 await page.locator('#ai-review-jump').press('Enter');
 assert.equal(await page.locator('#ai-review-title').evaluate(node => node === document.activeElement), true);
 await page.locator('#ai-configure').press('Enter');
 await page.locator('#ai-settings-drawer[open]').waitFor();
 assert.equal(await page.locator('#ai-address').evaluate(node => node === document.activeElement), true);
 await page.keyboard.press('Escape');
 await page.locator('#ai-settings-drawer[open]').waitFor({state:'hidden'});
 assert.equal(await page.locator('#ai-configure').evaluate(node => node === document.activeElement), true);
 delayRead = true; await page.locator('#ai-selection input').check(); await page.locator('#ai-preview').click();
 await page.waitForFunction(() => document.querySelector('#ai-selection').inert);
 assert.equal(await page.locator('#ai-directory').isDisabled(), true);
 assert.equal(await page.locator('#ai-cancel').isDisabled(), true);
 assert.equal(await page.locator('#ai-preview').isDisabled(), true);
 const deadline = Date.now() + 5000;
 while (!releaseRead && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 1));
 assert.equal(typeof releaseRead, 'function', 'Explicit preview must reach its held source read');
 delayRead = false; releaseRead();
 await page.waitForFunction(() => !document.querySelector('#ai-send').disabled); assert.equal(requests, 0);
 assert.equal(await page.locator('#ai-readable pre').allTextContents().then(x => x.join('')), text);
 await page.locator('#ai-selection input').uncheck(); assert.equal(await page.locator('#ai-send').isDisabled(), true);
 assert.equal(await page.locator('#ai-input').textContent(), '');
 await preview();
 await page.locator('#ai-request-details summary').click();
 const exactPreview = await page.locator('#ai-input').textContent();
 await page.keyboard.press('Tab');
 assert.equal(await page.locator('#ai-input').evaluate(node => node === document.activeElement), true);
 assert.equal(requests, 0, 'Opening and focusing the full outbound preview must not analyze');
 await page.locator('#ai-send').click(); await status('服务暂时');
 assert.equal(exactPreview, '服务地址：http://127.0.0.1/controlled\n模型：controlled\nstream: false\n\n系统消息：\n'
  + outbound[0][0].content + '\n\n用户消息（每个片段一次请求）：\n'
  + outbound.map(messages => messages[1].content).join('\n\n'));
 await page.waitForFunction(() => document.querySelectorAll('.suggestion-card').length === 6); assert.equal(await page.locator('.suggestion-card').count(), 6); assert.match(await page.locator('#ai-status').textContent(), /已完成 1\/2/);
 assert.match(await page.locator('#ai-help').textContent(), /只会向所设服务发送剩余 1 个片段/);
 assert.equal(await page.locator('#ai-input').textContent(), '服务地址：http://127.0.0.1/controlled\n模型：controlled\nstream: false\n\n系统消息：\n'
  + outbound[1][0].content + '\n\n用户消息（每个片段一次请求）：\n' + outbound[1][1].content);
 assert.deepEqual(await page.locator('#ai-readable article p').allTextContents(), ['已完成', '待完成']);
 mode = 'hold'; await page.locator('#ai-send').click(); await status('正在分析');
 await page.locator('#ai-input').focus();
 pending(responseFor(JSON.parse(outbound[1][1].content))); pending = null;
 await status('已完成 2 / 2');
 assert.equal(requests, 3);
 assert.deepEqual(outbound[2], outbound[1], 'Continuing sends only the unfinished request');
 assert.equal(await page.locator('#ai-input').evaluate(node => node === document.activeElement), true);
 assert.equal(await page.locator('#ai-input').getAttribute('aria-label'), '本次已发送的请求');
 await page.waitForFunction(() => document.querySelectorAll('.suggestion-card').length === 12);
 assert.equal(await page.locator('.suggestion-card').count(), 12);
 await card(0).getByText('确认前编辑建议', {exact:true}).click();
 await card(0).getByLabel('编辑建议', {exact:true}).fill('');
 await card(0).getByRole('button', {name:/^确认此建议：/}).click(); await status('建议内容不能为空');
 assert.equal(await card(0).getByLabel('编辑建议', {exact:true}).getAttribute('aria-invalid'), 'true');
 assert.equal(await card(0).getByLabel('编辑建议', {exact:true}).inputValue(), '');
 await card(0).getByLabel('编辑建议', {exact:true}).fill('已编辑的合成建议');
 await card(0).getByRole('button', {name:/^确认此建议：/}).click(); await card(0).getByText('处理决定：确认，已保存').waitFor(); await card(0).getByText('保存的建议：已编辑的合成建议').waitFor();
 await card(1).getByRole('button', {name:/^留待以后：/}).click(); await card(1).getByText('处理决定：留待以后，已保存').waitFor();
 await card(2).getByLabel('已有事项', {exact:true}).selectOption(initiative.entityId); await card(2).getByRole('button', {name:/^关联到事项：/}).click(); await card(2).getByText('处理决定：关联事项，已保存').waitFor();
 await card(3).getByRole('button', {name:/^作为参考资料：/}).click(); await status('请先选择一个已有事项');
 await card(3).getByText('请先选择一个已有事项，再保存这个决定。', {exact:true}).waitFor();
 await card(3).getByLabel('已有事项', {exact:true}).selectOption(initiative.entityId); await card(3).getByRole('button', {name:/^作为参考资料：/}).click(); await card(3).getByText('处理决定：作为参考，已保存').waitFor();
 await card(4).getByRole('button', {name:/^忽略：/}).click(); await card(4).getByText('处理决定：忽略，已保存').waitFor();
 failTarget = true; await card(5).getByRole('button', {name:/^确认此建议：/}).click(); await card(5).getByRole('button', {name:/^恢复已确认的决定/}).waitFor();
 await writeFile(fixture.root + '/reference.md', '来源已被外部修改');
 await page.reload(); await organize(); await status('来源已变化');
 await card(5).getByRole('button', {name:/^恢复已确认的决定/}).focus(); await page.keyboard.press('Enter'); await status('来源已变化');
 await page.waitForFunction(() => /来源已变化/.test(document.querySelector('#ai-review-feedback').textContent));
 await page.waitForFunction(() => document.activeElement.getAttribute('aria-label')?.startsWith('恢复已确认的决定'));
 await writeFile(fixture.root + '/reference.md', text);
 await card(5).getByRole('button', {name:/^恢复已确认的决定/}).focus(); await page.keyboard.press('Enter'); await card(5).getByText('处理决定：确认，已保存').waitFor();
 await page.waitForFunction(() => document.activeElement.matches('.suggestion-card'));
 assert.equal(await card(5).evaluate(node => node === document.activeElement), true);
 await page.reload(); await organize(); await card(0).getByText('保存的建议：已编辑的合成建议').waitFor();
 const actions = await fixture.adapter('actionQuery', {workspaceId:initiative.workspaceId, entityType:'action'}); assert.equal(actions.actions.length, 3); assert.equal(actions.actions.filter(a => a.initiativeId === initiative.entityId).length, 1);
 await writeFile(fixture.root + '/reference.md', '来源已被外部修改');
 await card(1).getByRole('button', {name:/^确认此建议：/}).click(); await status('来源已变化');
 await writeFile(fixture.root + '/reference.md', text);
 mode = 'hold'; await preview(); await page.locator('#ai-send').click(); await status('正在分析');
 assert.equal(await page.locator('#ai-preview').isDisabled(), true); await page.locator('#ai-cancel').click();
 await status('已取消');
 assert.equal(await page.locator('#ai-send').isDisabled(), true, 'Send stays disabled until cancellation settles');
 releaseCancel();
 await page.waitForFunction(() => !document.querySelector('#ai-send').disabled);
 mode = 'invalid'; await page.locator('#ai-send').click(); await status('返回的建议无法核验');
 mode = 'offline'; await page.locator('#ai-send').click(); await status('连接失败');
 assert.equal(await page.locator('.suggestion-card').count(), 12);
 await page.setViewportSize({width:393,height:852});
 await page.locator('#organize-tools').evaluate(e => e.scrollTop = 0);
 assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
 await page.locator('#ai-preview').focus(); await page.keyboard.press('Tab');
 const focus = await page.evaluate(() => ({tag:document.activeElement.tagName, outline:getComputedStyle(document.activeElement).outlineWidth, name:document.activeElement.textContent}));
 assert.equal(focus.tag, 'BUTTON'); assert.equal(focus.outline, '3px'); assert.match(focus.name, /设置 AI 服务/);
 await page.keyboard.press('Tab');
 assert.equal(await page.locator('#ai-readable').evaluate(node => node === document.activeElement), true);
 await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');
 assert.equal(await card(1).evaluate(node => {
  const evidence = node.querySelector('blockquote').getBoundingClientRect();
  const decision = node.querySelector('.candidate-decisions').getBoundingClientRect();
  return evidence.bottom < decision.top && node.scrollWidth <= node.clientWidth;
 }), true, 'Narrow Candidate review keeps evidence above the decision controls without overflow');
 await page.screenshot({path:'build/issue98-review/after-web-393px.png'});
 const primaryTargets = await page.locator('#organize-tools button.primary').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().height));
 assert.ok(primaryTargets.every(height => height >= 44));
 await page.locator('#ai-results').scrollIntoViewIfNeeded();
 await page.screenshot({path:'build/issue98-review/after-candidates-393px.png'});
 await page.setViewportSize({width:1180,height:800});
 await page.locator('#organize-tools').evaluate(n => n.scrollTop = 0);
 await page.screenshot({path:'build/issue98-review/after-desktop.png'});
 const colors = await page.evaluate(() => ['--text','--muted','--accent','--line','--focus'].map(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()));
 const lum = hex => { const rgb = hex.match(/[\da-f]{2}/gi).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
 const ratios = colors.map(c => (1.05)/(lum(c)+.05)); assert.ok(ratios[0]>=4.5 && ratios[1]>=4.5 && ratios[2]>=4.5 && ratios[3]>=3 && ratios[4]>=3);
 // Open the confirmed record through the ordinary Action route after reload.
 const confirmed = actions.actions.find(action => action.description === '已编辑的合成建议');
 assert.ok(confirmed);
 assert.equal(confirmed.sources[0].path, 'reference.md');
 assert.equal(confirmed.sources[0].quote, text.slice(0, 16));
 await page.reload();
 await page.getByRole('button', {name:'全部行动', exact:true}).click();
 const result = page.locator(`button[data-entity-id=${JSON.stringify(confirmed.entityId)}]`);
 assert.equal(await result.locator('.action-list-title').textContent(), confirmed.description);
 await result.click();
 await page.locator('#action-drawer[open]').waitFor();
 assert.equal(await page.locator('#action-description').inputValue(), confirmed.description);
 assert.equal(await readFile(fixture.root + '/reference.md', 'utf8'), text);
 assert.deepEqual(errors, []);
 console.log('Organization review UI passed: exact preview, invalidation, partial retry, edited confirmation, later, attachment, reference, ignore, pending recovery, persistence, source-change rejection, cancellation, invalid response, offline retention, 393px, keyboard focus; contrast ratios on white:', ratios);
} catch (error) { console.error('Organization review failure before cleanup:', error); throw error;
} finally { delayRead = false; releaseRead?.(); releaseCancel?.(); pending?.({error:'Canceled'}); await browser.close(); await fixture.close(); }
