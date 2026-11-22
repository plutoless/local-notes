import {searchFocusJourney} from './search-focus-journey.js';
import {execFileSync} from 'node:child_process';
import {enterNoteEditing} from './form-journeys.js';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
let bodyReads = 0, indexedQueries = 0; const queryMs = [];
let clipboard = '', deny = false, delay = null, failQuery = false, workspaceDelay = null, saves = 0;
try {
  await mkdir(join(fixture.root, 'Archive'));
  const original = '# 重复标题\n\n- latency 延迟 alpha\n| 指标 | 数值 |\n| p99 | 20 |\n[链接](https://example.com)';
  await writeFile(join(fixture.root, 'a.md'), original);
  await writeFile(join(fixture.root, 'Archive/a.md'), original);
  const actions = new ActionRepository(fixture.adapter), initiatives = new InitiativeRepository(fixture.adapter);
  await actions.open(); await initiatives.open();
  await actions.save({description:'latency 行动', waitingOn:'latency 等待答复'});
  await initiatives.save({status:'active', description:'Stored initiative', title:'latency 事项', goal:'latency 目标', progress:'latency 进展'});
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.exposeFunction('bridge', async r => {
    try {
      if (r.cmd === 'workspace' && workspaceDelay) await workspaceDelay;
      if (r.cmd === 'save') { saves++; throw Error('Controlled failed save'); }
      if (r.cmd === 'clipboardWrite') { if (deny) throw Error('denied'); clipboard = r.text; return {}; }
      if (r.cmd === 'read') bodyReads++;
      if (r.cmd === 'referenceSearch' || (r.cmd === 'actionQuery' && r.globalSearch)) indexedQueries++;
      if (r.cmd === 'read') return {text: await readFile(join(fixture.root, r.path), 'utf8')};
      if (r.cmd === 'referenceSearch') { if (delay) await delay; if (failQuery) throw Error('query unavailable'); }
      return await fixture.adapter(r.cmd, r);
    } catch (e) { return {error:e.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async text => { const r = JSON.parse(text); window.nativeReply(r.id, await window.bridge(r)); }}; });
  await page.route('https://notes.test/**', async route => { const name = new URL(route.request().url()).pathname.slice(1) || 'index.html'; await route.fulfill({body: process.env.SEARCH_REACT_BASELINE && name === 'search-screen.js' ? execFileSync('git',['show','8ae4622f4a23033ec149038d9a370c9985a138e8:web/search-screen.js']) : process.env.SEARCH_FOCUS_PHASE === 'before' && ['style.css','search-screen.js'].includes(name) ? execFileSync('git',['show','a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3:web/'+name]) : await readFile(new URL('../build/web/'+name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'}); });
  await page.goto('https://notes.test/'); await page.locator('.home-tools').waitFor();
  let releaseWorkspace; workspaceDelay = new Promise(resolve=>releaseWorkspace=resolve);
  await page.locator('#global-search-open').focus(); await page.keyboard.press('Meta+k');
  assert.equal(await page.locator('[data-scope=all]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-scope=note]').click();
  const input = page.locator('#global-search-input'); await input.fill('latency'); await page.keyboard.press('Escape'); await page.keyboard.press('Meta+k'); releaseWorkspace(); workspaceDelay = null;
  await page.waitForFunction(() => document.querySelectorAll('.search-result').length === 2 && !document.querySelector('#global-search [role=status]').textContent.includes('更新'));
  // A settled warm index must serve typing from bounded queries, with no body reads.
  const readsBeforeTyping = bodyReads, queriesBeforeTyping = indexedQueries;
  for (const text of Array.from({length:3},()=>['alpha','latency','alpha','latency']).flat()) {
    const started = performance.now(); await input.fill(text);
    await page.waitForFunction(()=>document.querySelector('#global-search [role=status]').textContent.startsWith('本页'));
    queryMs.push(performance.now()-started);
  }
  assert.equal(bodyReads, readsBeforeTyping, 'Warm typing must not read Markdown bodies');
  console.log(JSON.stringify({phase:process.env.SEARCH_REACT_BASELINE?'baseline':'migrated',warmTypingMs:queryMs,bodyReads:bodyReads-readsBeforeTyping,indexedQueries:indexedQueries-queriesBeforeTyping}));
  // Ordinary result updates preserve the same input, caret and selection.
  await input.evaluate(n=>{window.searchInputIdentity=n; n.setSelectionRange(1,4);});
  await input.dispatchEvent('input');
  await page.waitForFunction(()=>document.querySelector('#global-search [role=status]').textContent.startsWith('本页'));
  assert.equal(await input.evaluate(n=>n===window.searchInputIdentity),true);
  assert.deepEqual(await input.evaluate(n=>[n.selectionStart,n.selectionEnd]),[1,4]);
  await searchFocusJourney(page);
  if (process.env.SEARCH_FOCUS_PHASE !== 'before') {
    await page.locator('.search-result').first().getByRole('button',{name:'复制片段',exact:true}).focus();
    let releaseFocus; delay = new Promise(resolve=>releaseFocus=resolve);
    await input.dispatchEvent('input');
    await page.waitForFunction(()=>document.querySelector('.search-results').inert);
    await input.click(); releaseFocus(); delay = null;
    await page.waitForFunction(()=>!document.querySelector('.search-results').inert);
    assert.equal(await input.evaluate(n=>n===document.activeElement),true,'Refresh must not steal focus from search input');
  }
  // Deterministic event-order regression; actual IME evidence is native-search-ime.py.
  for (const route of ['keyboard', 'cancel']) {
    assert.equal(await page.evaluate(route => {
      const input = document.querySelector('#global-search-input'), panel = document.querySelector('#global-search');
      input.dispatchEvent(new CompositionEvent('compositionstart', {bubbles:true}));
      input.dispatchEvent(new CompositionEvent('compositionend', {bubbles:true, data:''}));
      if (route === 'keyboard') input.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true, cancelable:true}));
      else panel.dispatchEvent(new Event('cancel', {cancelable:true}));
      return panel.open;
    }, route), true);
    await page.waitForTimeout(20);
  }
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#global-search').evaluate(n=>n.open),false);
  await page.keyboard.press('Meta+k'); await input.waitFor();
  await page.waitForFunction(()=>document.querySelector('#global-search [role=status]').textContent.startsWith('本页'));
  await page.keyboard.press('Meta+k'); assert.equal(await input.inputValue(), 'latency'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await page.keyboard.press('Meta+Enter'); await page.getByText('已复制片段', {exact:true}).waitFor();
  assert.equal(clipboard, await page.locator('.search-select[aria-current=true]').locator('..').locator('pre').textContent()); assert.ok(original.includes(clipboard));
  await page.getByText('附带来源', {exact:true}).click(); await page.keyboard.press('Meta+Enter'); await page.waitForTimeout(100); assert.ok(clipboard.endsWith('a.md'));
  deny = true; await page.keyboard.press('Meta+Enter'); await page.getByText('未能复制，请刷新重试或手动选择文字复制', {exact:true}).waitFor(); deny = false;
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#global-search-open').evaluate(n => n === document.activeElement), true);
  for (const view of ['notes','initiatives']) { await page.locator(`nav [data-view=${view}]`).click(); await page.locator('#global-search-open').click(); await input.waitFor(); assert.equal(await input.inputValue(),'latency'); await page.keyboard.press('Escape'); }
  await page.locator('nav [data-view=notes]').click(); await page.locator('#items button').filter({hasText:'重复标题'}).first().click();
  await enterNoteEditing(page); await page.locator('#body').fill('Dirty unrelated note'); await page.waitForTimeout(800); const beforeSearchSaves = saves;
  await page.locator('#global-search-open').click(); await input.waitFor(); await page.waitForFunction(()=>document.querySelector('#global-search [role=status]').textContent.startsWith('本页')); await page.keyboard.press('Meta+Enter'); await page.getByText('已复制片段',{exact:true}).waitFor(); await page.keyboard.press('Escape');
  assert.equal(await page.locator('#body').inputValue(),'Dirty unrelated note'); assert.equal(saves,beforeSearchSaves);
  // Restore the fixture draft without emitting a new edit; leave guard may now retry successfully only in separate maintained journeys.
  await page.reload(); await page.locator('.home-tools').waitFor();
  await page.locator('nav [data-view=focus]').click(); await page.getByRole('button',{name:'全部行动',exact:true}).click(); await page.locator('#global-search-open').click(); await input.waitFor(); await page.keyboard.press('Escape');
  await page.setViewportSize({width:393,height:760}); await page.locator('#global-search-open').click(); await input.waitFor();
  assert.equal(await page.locator('#global-search').evaluate(n=>n.getBoundingClientRect().width <= innerWidth),true);
  await page.locator('#global-search button').last().focus(); await page.keyboard.press('Tab'); assert.equal(await input.evaluate(n=>n===document.activeElement),true); await page.keyboard.press('Shift+Tab'); assert.equal(await page.locator('#global-search button').last().evaluate(n=>n===document.activeElement),true);
  await mkdir('build/issue58', {recursive:true}); await page.screenshot({path:'build/issue58/narrow.png'});
  await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.keyboard.press('Control+k');
  await input.waitFor();
  assert.equal(await input.evaluate(node=>document.activeElement===node),true);
  assert.equal(await page.locator('[data-scope=note]').evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('[data-scope=note]').click();
  failQuery = true; await input.fill('alpha'); await page.getByText('搜索失败，请刷新重试',{exact:true}).waitFor(); failQuery = false; await input.fill('latency'); await page.locator('.search-result').first().waitFor();
  let release; delay = new Promise(resolve=>release=resolve); await input.fill('alpha'); await page.keyboard.press('Escape'); release(); delay = null; await page.waitForTimeout(150); assert.equal(await page.locator('#global-search').evaluate(n=>n.open),false);
  await page.keyboard.press('Meta+k'); await input.fill('latency');
  await page.locator('.search-attribution input').uncheck();
  for (const [scope, count, type] of [['all',7,null], ['initiative',3,'事项'], ['action',2,'行动'], ['note',2,'笔记']]) {
    await page.locator(`[data-scope=${scope}]`).click();
    await page.waitForFunction(count => document.querySelectorAll('.search-result').length === count && document.querySelector('#global-search [role=status]').textContent.startsWith('本页'), count);
    if (type) assert.ok((await page.locator('.search-result p').allTextContents()).every(text=>text.startsWith(type)));
    await input.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Meta+Enter'); await page.getByText('已复制片段',{exact:true}).waitFor();
    const selected = page.locator('.search-select[aria-current=true]').locator('..').locator('pre'); assert.equal(clipboard, await selected.textContent());
  }
  let releaseScope; delay = new Promise(resolve=>releaseScope=resolve);
  await input.fill('alpha'); await page.locator('[data-scope=action]').click();
  await page.waitForFunction(()=>document.querySelector('#global-search [role=status]').textContent === '没有匹配的内容');
  releaseScope(); delay = null; await page.waitForTimeout(100); assert.equal(await page.locator('.search-result').count(),0);
  await input.fill('latency'); await page.locator('.search-result').first().waitFor(); await page.keyboard.press('Escape'); await page.keyboard.press('Meta+k');
  assert.equal(await input.inputValue(),'latency'); assert.equal(await page.locator('[data-scope=action]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-scope=note]').click();
  for(let i=0;i<25;i++) await writeFile(join(fixture.root,`paging-${i}.md`),'# 分页等待样本 '+i+'\n\n分页等待样本');
  await input.fill('分页等待样本'); await page.getByRole('button',{name:'刷新索引',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.search-result').length===20 && document.querySelector('#global-search [role=status]').textContent==='本页 20 条结果');
  let releasePaging; delay=new Promise(resolve=>releasePaging=resolve);
  const next=page.locator('#global-search').getByRole('button',{name:'下一页',exact:true}); await next.click();
  assert.equal(await next.isDisabled(),true,'Pending paging cannot be submitted twice');
  releasePaging(); delay=null;
  await page.waitForFunction(()=>document.querySelector('#global-search [role=status]').textContent==='本页 5 条结果');
  await page.locator('#global-search').getByRole('button',{name:'上一页',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.search-result').length===20);
  let releaseScopeBusy; delay=new Promise(resolve=>releaseScopeBusy=resolve);
  const noteScope=page.locator('[data-scope=note]'); await noteScope.click();
  assert.equal(await noteScope.isDisabled(),true,'Pending scope refresh cannot be submitted twice');
  releaseScopeBusy(); delay=null;
  await page.waitForFunction(()=>!document.querySelector('[data-scope=note]').disabled);
  assert.deepEqual(errors, []); console.log('PASS: real UI/bridge/Swift SQLite search, grounding/copy, optional attribution/failure, pages, repeated shortcut, dismissal fencing, narrow focus cycle.');
} finally { await browser.close(); await fixture.close(); }
