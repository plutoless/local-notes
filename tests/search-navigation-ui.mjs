import {readFile, writeFile, mkdir, rename, unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const evidence = {head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), checks:[], clipboardBoundary:'Trusted browser Copy event with default prevented, plus controlled clipboardWrite bridge receipt; no OS clipboard readback or native integration claim.'};
const digest = text => createHash('sha256').update(text).digest('hex');
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
let clipboard = '', deny = false, delay = null, failQuery = false, workspaceDelay = null, saves = 0, failSave = false, readDelay = null, readStarted, readCounter = 0, readDelayAt = 1, armReturn = false, returnRead = false, delayReturn = false, releaseReturn, returnStarted;
const readBegun = () => new Promise(resolve => { readStarted = resolve; });
try {
  await mkdir(join(fixture.root, 'Archive'));
  const original = '# 重复标题\n\n- latency 延迟 alpha\n| 指标 | 数值 |\n| p99 | 20 |\n[链接](https://example.com)';
  await writeFile(join(fixture.root, 'a.md'), original);
  await writeFile(join(fixture.root, 'Archive/a.md'), original);
  const actions = new ActionRepository(fixture.adapter), initiatives = new InitiativeRepository(fixture.adapter);
  await actions.open(); await initiatives.open();
  await actions.save({description:'latency 行动', waitingOn:'latency 等待答复'});
  await initiatives.save({status:'active', description:'Stored initiative', title:'latency 事项', goal:'latency 目标', progress:'latency 进展',sources:[{path:'a.md',quote:'latency',fingerprint:(await import('../web/initiatives.js')).fingerprint(original),role:'working-note'}]});
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.exposeFunction('bridge', async r => {
    try {
      if (r.cmd === 'read' && armReturn && r.path === 'a.md') { armReturn = false; returnRead = true; }
      if (r.cmd === 'referenceQuery' && returnRead && r.exactPath) { returnRead = false; delayReturn = true; }
      else if (r.cmd === 'referenceQuery' && delayReturn && !r.exactPath) { delayReturn = false; returnStarted(); await new Promise(resolve=>releaseReturn=resolve); }
      if (r.cmd === 'workspace' && workspaceDelay) await workspaceDelay;
      if (r.cmd === 'save') { saves++; if (failSave) throw Error('Controlled failed save'); await writeFile(join(fixture.root, r.path), r.text); return {}; }
      if (r.cmd === 'clipboardWrite') { if (deny) throw Error('denied'); clipboard = r.text; return {}; }
      if (r.cmd === 'read' && readDelay && ++readCounter === readDelayAt) { const pending = readDelay; readStarted?.(); await pending; }
      if (r.cmd === 'read') return {text: await readFile(join(fixture.root, r.path), 'utf8')};
      if (r.cmd === 'referenceSearch') { if (delay) await delay; if (failQuery) throw Error('query unavailable'); }
      return await fixture.adapter(r.cmd, r);
    } catch (e) { return {error:e.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async text => { const r = JSON.parse(text); window.nativeReply(r.id, await window.bridge(r)); }}; });
  await page.route('https://notes.test/**', async route => { const name = new URL(route.request().url()).pathname.slice(1) || 'index.html'; await route.fulfill({body: await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR,name) : new URL('../build/web/'+name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'}); });
  await page.goto('https://notes.test/'); await page.locator('.home-tools').waitFor();
  const input = page.locator('#global-search-input');
  const ready = async () => page.waitForFunction(() => document.querySelector('#global-search [role=status]').textContent.startsWith('本页'));
  const lookup = async scope => {
    await page.locator('#global-search-open').click(); await input.fill('latency');
    await page.locator(`[data-scope=${scope}]`).click(); await ready();
  };
  const open = label => page.locator('#global-search').getByRole('button', {name:label, exact:true}).first().click();
  const back = async () => {
    await page.locator('.search-return:visible').click();
    await page.waitForFunction(() => document.querySelector('#global-search').open);
    assert.equal(await input.inputValue(), 'latency');
  };
  for (const width of [1180,393]) {
    await page.setViewportSize({width,height:800});
    for (const origin of ['focus','notes','initiatives','actions']) {
      if (origin === 'actions') { await page.locator('nav [data-view=focus]').click(); await page.getByRole('button',{name:'全部行动',exact:true}).click(); }
      else await page.locator(`nav [data-view=${origin}]`).click();
      for (const [scope,label] of [['note','打开原文'],['initiative','打开事项'],['action','打开行动']]) {
        await lookup(scope); await input.focus(); await page.keyboard.press('Enter');
        await page.waitForTimeout(150);
        const expanded = await page.locator('.search-result pre').first().textContent();
        if (width === 1180 && origin === 'focus' && scope === 'note') {
          // Range placement is setup; Copy itself is a trusted browser shortcut.
          await page.locator('.search-result pre').first().evaluate(node => {
            const range = document.createRange(); range.selectNodeContents(node);
            getSelection().removeAllRanges(); getSelection().addRange(range);
            window.searchCopyEvents = [];
            document.addEventListener('copy', event => {
              event.preventDefault(); // Observe the browser event without exporting to a system clipboard.
              searchCopyEvents.push({trusted:event.isTrusted, selection:getSelection().toString(),defaultPrevented:event.defaultPrevented});
            },{once:true});
          });
          await page.keyboard.press('ControlOrMeta+c');
          await page.waitForFunction(() => window.searchCopyEvents.length === 1);
          assert.deepEqual(await page.evaluate(() => searchCopyEvents),[{trusted:true,selection:expanded,defaultPrevented:true}]);
          await page.evaluate(() => getSelection().removeAllRanges());
          await open('复制片段');
          await page.getByText('已复制片段',{exact:true}).waitFor();
          assert.equal(clipboard,expanded); assert.ok(original.includes(clipboard));
          evidence.checks.push({journey:'search expand, browser selection/Copy and bridge Copy',browserCopy:await page.evaluate(() => searchCopyEvents),bridgeTextSHA256:digest(clipboard),sourceSHA256:digest(original)});
        }
        await input.focus(); await page.keyboard.press('ArrowDown');
        const selectedSource = page.locator('.search-result[data-selected=true] .search-source');
        const selection = await selectedSource.textContent();
        assert.notEqual(selection,await page.locator('.search-source').first().textContent(),'The journey selects a result beyond the first');
        await page.locator('.search-results').evaluate(n => n.scrollTop = 25);
        const scroll = await page.locator('.search-results').evaluate(n=>n.scrollTop);
        await open(label);
        await page.waitForFunction(() => !document.querySelector('#global-search').open);
        await page.locator('.search-return:visible').waitFor();
        if (scope === 'note') {
          assert.equal(await page.locator('#reading').isVisible(), true);
          assert.ok(await page.locator('#reading [aria-label="搜索匹配原文"] mark').count());
          assert.equal(await page.locator('#reading [aria-label="搜索匹配原文"]').evaluate(n=>n===document.activeElement),true,'Source opening retains the exact highlighted reader destination');
          assert.ok((await page.locator('#reading').textContent()).includes('p99'));
        }
        if (scope === 'initiative') assert.equal(await page.locator('#workspace-title').textContent(),'latency 事项');
        if (scope === 'action') assert.equal(await page.locator('#action-description').inputValue(),'latency 行动');
        await back();
        assert.equal(await page.evaluate(()=>document.activeElement.textContent),label,'Source return restores the activated source control');
        assert.equal(await page.locator(`[data-scope=${scope}]`).getAttribute('aria-pressed'),'true');
        assert.equal(await selectedSource.textContent(),selection,'Source return retains the selected passage');
        assert.equal(await page.locator('.search-result pre').first().textContent(),expanded);
        assert.equal(await page.locator('.search-results').evaluate(n=>n.scrollTop),scroll);
        if (origin === 'actions') assert.equal(await page.locator('#view-title').textContent(),'行动');
        else assert.equal(await page.locator(`nav [data-view=${origin}]`).getAttribute('aria-current'),'page');
        await page.keyboard.press('Escape');
      }
    }
  }
  // A selected initiative can remain remembered while the narrow list is visible.
  await page.locator('nav [data-view=initiatives]').click();
  await page.locator('#items button').filter({hasText:'latency 事项'}).first().click();
  await page.locator('#workspace-back').click();
  const classes = await page.locator('.app').getAttribute('class');
  await lookup('note'); await open('打开原文'); await page.locator('.search-return:visible').waitFor(); await back();
  assert.equal(await page.locator('.app').getAttribute('class'),classes); await page.keyboard.press('Escape');
  // Unavailable initiative-linked invocation note keeps return ownership for retry.
  await page.locator('nav [data-view=initiatives]').click();
  await page.locator('#items button').filter({hasText:'latency 事项'}).first().click();
  await page.locator('#workspace-notes button[data-path="a.md"]').click();
  await lookup('action'); await open('打开行动'); await page.locator('.search-return:visible').waitFor();
  await rename(join(fixture.root,'a.md'),join(fixture.root,'unavailable.md'));
  await page.locator('.search-return:visible').click();
  await page.locator('#notice').filter({hasText:'ENOENT'}).waitFor();
  assert.equal(await page.locator('#global-search').evaluate(n=>n.open),false);
  await rename(join(fixture.root,'unavailable.md'),join(fixture.root,'a.md'));
  await back(); assert.equal(await page.locator('#file-path').textContent(),'a.md');
  await page.keyboard.press('Escape');
  // Dirty active note: continue, failed save, discard and successful save all keep search reachable.
  await page.locator('nav [data-view=notes]').click();
  await page.locator('#items [data-path="a.md"]').click();
  if (await page.locator('#body').isHidden()) await page.locator('#mode').click();
  await page.locator('#body').fill('dirty origin');
  await page.locator('#body').evaluate(n=>n.setSelectionRange(2,8,'backward'));
  const dirtySelection = await page.locator('#body').evaluate(n=>[n.selectionStart,n.selectionEnd,n.selectionDirection]);
  await lookup('note');
  await open('打开原文'); await page.locator('#task-leave-decision').waitFor();
  await page.getByRole('button',{name:'继续编辑',exact:true}).click(); await input.waitFor();
  assert.equal(await page.locator('#body').inputValue(),'dirty origin');
  assert.deepEqual(await page.locator('#body').evaluate(n=>[n.selectionStart,n.selectionEnd,n.selectionDirection]),dirtySelection);
  assert.equal(await readFile(join(fixture.root,'a.md'),'utf8'),original,'Continue never writes the dirty source');
  assert.equal(await page.locator('#global-search').evaluate(n=>n.open && n.contains(document.activeElement) && !document.activeElement.disabled),true,'Continue restores a usable search receiver');
  // A newer search input/caret and subsequent Tab own focus after Continue.
  await input.click(); await input.evaluate(n=>n.setSelectionRange(1,4));
  await page.keyboard.press('Tab');
  const nextFocus = await page.evaluate(() => document.activeElement.textContent);
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => document.activeElement.textContent),nextFocus);
  assert.equal(nextFocus,'关闭搜索');
  assert.deepEqual(await input.evaluate(n=>[n.selectionStart,n.selectionEnd]),[1,4]);
  evidence.checks.push({journey:'dirty-source Continue, newer input selection and Tab',sourceSHA256:digest(await readFile(join(fixture.root,'a.md'),'utf8')),dirtySelection,nextFocus});
  failSave = true; await open('打开原文'); await page.getByRole('button',{name:'保存并离开',exact:true}).click();
  await page.locator('#task-leave-decision [role=alert]').filter({hasText:'保存尚未完成'}).waitFor();
  await page.getByRole('button',{name:'继续编辑',exact:true}).click(); await input.waitFor();
  assert.equal(await page.locator('#body').inputValue(),'dirty origin');
  await open('打开原文'); await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  await page.locator('.search-return:visible').waitFor(); await back(); await page.keyboard.press('Escape');
  failSave = false;
  if (await page.locator('#body').isHidden()) await page.locator('#mode').click();
  await page.locator('#body').fill('saved origin latency');
  await page.locator('#body').evaluate(n=>n.setSelectionRange(3,9,'backward'));
  await lookup('action');
  await open('打开行动'); await page.getByRole('button',{name:'保存并离开',exact:true}).click();
  await page.locator('#action-drawer[open]').waitFor(); await back(); await page.keyboard.press('Escape');
  const savedOrigin = await readFile(join(fixture.root,'a.md'),'utf8');
  assert.ok(savedOrigin.includes('saved origin latency'));
  assert.equal(await readFile(join(fixture.root,'Archive/a.md'),'utf8'),original,'Untouched duplicate source is byte-preserved');
  evidence.checks.push({journey:'explicit Save and source-return',savedSourceSHA256:digest(savedOrigin),untouchedSourceSHA256:digest(original)});
  assert.deepEqual(await page.locator('#body').evaluate(n=>[n.selectionStart,n.selectionEnd,n.selectionDirection]),[3,9,'backward']);
  // Exact-path stale sources fail, without silently choosing the duplicate title.
  await lookup('note');
  const stalePath = await page.locator('.search-result p').first().textContent();
  const path = stalePath.includes('Archive/a.md') ? 'Archive/a.md' : 'a.md';
  const saved = await readFile(join(fixture.root,path),'utf8'); await writeFile(join(fixture.root,path),'# changed source');
  await open('打开原文'); await page.getByText('来源已移动、改变或不可读取，请刷新后重试；搜索与原页面仍可返回',{exact:true}).waitFor();
  assert.equal(await page.locator('#global-search').evaluate(n=>n.open),true);
  await writeFile(join(fixture.root,path),saved);
  await rename(join(fixture.root,path),join(fixture.root,'moved.md'));
  await open('打开原文'); await page.getByText('来源已移动、改变或不可读取，请刷新后重试；搜索与原页面仍可返回',{exact:true}).waitFor();
  await rename(join(fixture.root,'moved.md'),join(fixture.root,path));
  await unlink(join(fixture.root,path));
  await open('打开原文'); await page.getByText('来源已移动、改变或不可读取，请刷新后重试；搜索与原页面仍可返回',{exact:true}).waitFor();
  await writeFile(join(fixture.root,path),saved);
  // Dismiss a delayed source read: a late reply must never navigate or reopen search.
  readCounter = 0; readDelayAt = 1; let release; const begun = readBegun(); readDelay = new Promise(resolve => release=resolve);
  await open('打开原文'); await begun; await page.keyboard.press('Escape'); release(); readDelay=null;
  await page.waitForTimeout(200); assert.equal(await page.locator('#global-search').evaluate(n=>n.open),false);
  assert.equal(await page.locator('.search-return:visible').count(),0);
  await page.setViewportSize({width:1180,height:800});
  // Returning also yields to a newer same-page selection during context refresh.
  await lookup('note'); await open('打开原文'); await page.locator('.search-return:visible').waitFor();
  const returnBegun = new Promise(resolve=>returnStarted=resolve); armReturn = true;
  await page.locator('.search-return:visible').click();
  await Promise.race([returnBegun,new Promise((_,reject)=>setTimeout(()=>reject(Error('Return refresh not reached')),10000))]);
  // Page-first reading requires an explicit list return before another selection.
  if (await page.locator('#global-search').evaluate(n=>n.open)) await page.keyboard.press('Escape');
  if (!await page.locator('.collection').isVisible()) await page.locator('#back').click();
  if (await page.locator('#notice').isVisible()) await page.getByRole('button',{name:'关闭提示',exact:true}).click();
  await page.locator('#items [data-path="Archive/a.md"]').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='Archive/a.md');
  if (await page.locator('#body').isHidden()) await page.locator('#mode').click();
  await page.locator('#body').fill('newer return draft'); releaseReturn();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#global-search').evaluate(n=>n.open),false);
  assert.equal(await page.locator('#body').inputValue(),'newer return draft');
  await page.locator('nav [data-view=focus]').click();
  await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  // Hold the final source validation after navigation, then select a competing note.
  await lookup('note'); readCounter = 0; readDelayAt = 3;
  const finalReadBegun = readBegun(); readDelay = new Promise(resolve=>release=resolve);
  await open('打开原文'); await Promise.race([finalReadBegun, new Promise((_, reject)=>setTimeout(()=>reject(Error('Final read not reached: '+readCounter)),10000))]); readDelay = null;
  await page.locator('#items [data-path="a.md"]').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='a.md');
  if (await page.locator('#body').isHidden()) await page.locator('#mode').click();
  await page.locator('#body').fill('newer competing draft');
  release(); await page.waitForTimeout(150);
  assert.equal(await page.locator('#body').inputValue(),'newer competing draft');
  assert.equal(await page.locator('#file-path').textContent(),'a.md');
  assert.deepEqual(errors, []);
  // The competing-read case intentionally leaves a newer private draft. Discard
  // it through the application before checking persisted readback after reload.
  await page.locator('nav [data-view=focus]').click();
  await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  await page.locator('.home-tools').waitFor();
  // Reload and re-enter the real source: saved text must survive the UI session.
  await page.reload(); await page.locator('.home-tools').waitFor();
  await page.locator('nav [data-view=notes]').click();
  await page.locator('#items [data-path="a.md"]').click();
  await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='a.md');
  if (await page.locator('#body').isHidden()) await page.locator('#mode').click();
  assert.equal(await page.locator('#body').inputValue(),'saved origin latency');
  assert.equal(await readFile(join(fixture.root,'a.md'),'utf8'),savedOrigin);
  assert.equal(await readFile(join(fixture.root,'Archive/a.md'),'utf8'),original);
  assert.deepEqual(errors, []);
  evidence.checks.push({journey:'reload and real UI persisted readback',savedSourceSHA256:digest(savedOrigin),untouchedSourceSHA256:digest(original)});
  await mkdir('build/issue84-repair',{recursive:true});
  await writeFile('build/issue84-repair/search-navigation.json',JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS issue60 real UI/bridge/storage/index: all origin/destination types, desktop/393px, expansion/scroll return, dirty continue/discard/save/failure, stale and dismissed delayed reads.');
} finally { await browser.close(); await fixture.close(); }
