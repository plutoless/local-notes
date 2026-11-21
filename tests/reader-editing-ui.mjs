import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const phase = process.env.PHASE || 'after';
const evidence = process.env.READER_EDITING_EVIDENCE_DIR || 'build/issue82-browser-first';
const fixture = await storageFixture();
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await fixture.adapter(request.cmd, request);
        return result;
      }
      const workspace = await fixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(fixture.root, request.path || '');
      switch (request.cmd) {
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive:true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: phase==='before' && name==='style.css' ? execFileSync('git',['show','a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3:web/style.css']) : await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  await mkdir(evidence, {recursive:true});
  const original='# 浏览器编辑验收 Chinese English\n\n## 保留原文\n\n- [ ] 原文复选框\n\n'+'中文 English 长段落。\n\n'.repeat(70);
  await writeFile(sourcePath,original);
  const open=async()=>{await page.locator('[data-view=notes]').click();await page.locator('#items [data-path="reference.md"]').click();await page.locator('#reading').waitFor({state:'visible'});};
  await page.goto('https://notes.test/');await open();
  await page.setViewportSize({width:393,height:852});
  await page.locator('#mode').click();const body=page.locator('#body');await body.waitFor();
  const initial=await body.inputValue();
  await body.evaluate(n=>{window.browserKeys=[];document.addEventListener('keydown',e=>browserKeys.push({key:e.key,isTrusted:e.isTrusted,target:e.target.id}),true);window.compositionReceipt=[];for(const type of ['compositionstart','compositionupdate','compositionend','beforeinput','input'])n.addEventListener(type,e=>compositionReceipt.push({type,data:e.data,inputType:e.inputType,isComposing:e.isComposing,isTrusted:e.isTrusted,value:n.value,selection:[n.selectionStart,n.selectionEnd]}));n.setSelectionRange(0,0);});
  const cdp=await page.context().newCDPSession(page);
  // Browser-engine composition via DevTools; this is not an OS input method.
  await cdp.send('Input.imeSetComposition',{text:'中文候选',selectionStart:4,selectionEnd:4});
  assert.equal(await body.evaluate(n=>n===document.activeElement),true);
  assert.equal(await body.evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
  await page.screenshot({path:`${evidence}/browser-composition-393.png`});
  await cdp.send('Input.imeSetComposition',{text:'',selectionStart:0,selectionEnd:0});
  assert.equal(await body.inputValue(),initial,'browser cancellation retains the original editor text');
  assert.equal(await readFile(sourcePath,'utf8'),original,'cancelled browser composition does not persist text');
  await cdp.send('Input.imeSetComposition',{text:'中文确认',selectionStart:4,selectionEnd:4});
  await cdp.send('Input.insertText',{text:'中文已确认'});
  assert.ok((await body.inputValue()).includes('中文已确认'));
  const events=await page.evaluate(()=>compositionReceipt);
  await writeFile(`${evidence}/composition-events.json`,JSON.stringify(events,null,2));
  assert.ok(events.some(e=>e.type==='compositionstart'&&e.isTrusted));
  assert.ok(events.some(e=>e.type==='compositionupdate'&&e.isTrusted));
  // Chromium CDP emits untrusted compositionend; record that limit explicitly.
  assert.ok(events.some(e=>e.type==='compositionend'&&e.data==='中文已确认'));
  assert.ok(events.some(e=>e.type==='input'&&e.isTrusted&&e.isComposing&&e.data==='中文已确认'));
  await page.keyboard.press('Shift+ArrowLeft');
  assert.equal(await body.evaluate(n=>n.selectionEnd-n.selectionStart),1,'browser keyboard selection remains usable after composition');
  const range=await body.evaluate(n=>[n.selectionStart,n.selectionEnd]);
  await page.locator('#global-search-open').click();await page.getByRole('button',{name:'关闭搜索',exact:true}).click();
  assert.deepEqual(await body.evaluate(n=>[n.selectionStart,n.selectionEnd]),range,'search close retains editor selection');
  await page.locator('#note-save').click();await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到本地');
  const saved=await readFile(sourcePath,'utf8');assert.ok(saved.includes('中文已确认'));
  await page.locator('#mode').click();await page.locator('#mode').click();
  assert.deepEqual(await body.evaluate(n=>[n.selectionStart,n.selectionEnd]),range,'Read/Edit retains source selection');
  await page.reload();await open();await page.locator('#mode').click();
  assert.ok((await body.inputValue()).includes('中文已确认'),'reload reads the persisted real Markdown');
  // Hold only the shared deferred leave-focus fallback; a trusted Tab is newer intent.
  await page.evaluate(()=>{window.heldLeave=[];window.originalTimeout=window.setTimeout;window.setTimeout=(fn,delay,...args)=>{if(delay===0&&typeof fn==='function'&&String(fn).includes('task-leave-decision')&&String(fn).includes('origin.focus')){heldLeave.push(()=>fn(...args));return -820;}return originalTimeout(fn,delay,...args);};});
  await body.fill('保留的未保存草稿 Browser draft');await page.locator('#back').click();
  await page.getByRole('button',{name:'继续编辑',exact:true}).click();
  assert.equal(await body.inputValue(),'保留的未保存草稿 Browser draft');
  assert.equal(await page.evaluate(()=>heldLeave.length),1,'real note Continue uses the shared deferred restoration');
  await page.keyboard.press('Tab');
  const destination=await page.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName,text:document.activeElement.textContent}));
  assert.notEqual(destination.id,'back');
  await page.evaluate(()=>{for(const run of heldLeave.splice(0))run();});
  const after=await page.evaluate(()=>({id:document.activeElement.id,tag:document.activeElement.tagName,text:document.activeElement.textContent}));
  await writeFile(`${evidence}/receipt.json`,JSON.stringify({input:'Chromium DevTools engine composition; not actual OS IME; CDP compositionend is untrusted',events,browserKeys:await page.evaluate(()=>browserKeys),cancelSourceUnchanged:true,saveReadback:true,reload:true,searchSelection:true,readEditSelection:true,continueDestination:destination,afterHeldFallback:after,shared105Pass:JSON.stringify(destination)===JSON.stringify(after)},null,2));
  assert.deepEqual(after,destination,'shared105: newer browser Tab must survive the prior Continue fallback');
  await page.evaluate(()=>window.setTimeout=originalTimeout);
  await page.locator('#back').click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  assert.equal(await readFile(sourcePath,'utf8'),saved,'discard never writes the retained draft');
  await page.reload();await open();await page.locator('#mode').click();assert.ok((await body.inputValue()).includes('中文已确认'));
  const receipt=JSON.parse(await readFile(`${evidence}/receipt.json`,'utf8'));Object.assign(receipt,{discardReadback:true,reloadAfterDiscard:true,noFormalRecordWrites:!fixture.calls.some(call=>call.cmd==='actionWrite'),savedSHA256:createHash('sha256').update(saved).digest('hex'),finalDiskSHA256:createHash('sha256').update(await readFile(sourcePath)).digest('hex')});assert.equal(receipt.noFormalRecordWrites,true);await writeFile(`${evidence}/receipt.json`,JSON.stringify(receipt,null,2));
  assert.deepEqual(errors,[]);
  console.log('PASS browser-engine composition/cancel/commit, keyboard caret/selection, Read/Edit/search return, real Markdown save/reload/continue/discard and newer Tab');
} finally { await browser.close(); await fixture.close(); }
