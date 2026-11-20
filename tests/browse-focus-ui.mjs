import {enterNoteEditing} from './form-journeys.js';
import {closeSavedAction, closeNoteInfo, captureNote, moveNote} from './form-journeys.js';
import {readFile, writeFile, readdir, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const activeFixture = fixture;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
let page;
try {
  page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const bridgeCalls = [];
  let queryGate = null, queryBegan, referenceGate, referenceBegan, assignmentGate, assignmentBegan;
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  const original = '# 资料整理约定\n\n保留原文，只整理入口。\n\n先确认本周需要推进的内容，再补充关联资料。\n';
  await writeFile(sourcePath, original);
  for(let n=0;n<54;n++) await writeFile(join(fixture.root,`browse-${n}.md`), '# 很长的中文资料标题与保留的浏览上下文 '+n+'\n\n保留原文。');
  const initiatives = new InitiativeRepository(fixture.adapter); await initiatives.open();
  const first = (await initiatives.save({title: '整理工作资料', goal: '让常用资料有清晰的入口', progress: '资料目录已整理，正在确定本周行动。', status: 'active', sources: [{path: 'reference.md', quote: '保留原文，只整理入口。', fingerprint: (await import('../web/initiatives.js')).fingerprint(original), role: 'reference'}]})).record;
  const second = (await initiatives.save({title: '准备下次评审', goal: '确认需要讨论的问题', progress: '等待评审时间确认。', status: 'active', sources: []})).record;
  const actions = new ActionRepository(fixture.adapter); await actions.open();
  for (const [i, description] of ['确定本周最重要的两件事', '把阅读摘录整理成一页笔记', '补充资料目录的使用说明'].entries()) await actions.save({description, initiativeId: first.entityId, focusPosition: i + 1, status: i === 1 ? 'in-progress' : 'todo'});
  await actions.save({description: '确认评审时间', waitingOn: '等待对方回复可用时间', status: 'waiting', initiativeId: second.entityId});
  for(let n=0;n<51;n++) await initiatives.save({title:'分页事项 '+n,goal:'保留上下文',progress:'待核对',status:'later'});
  for(let n=0;n<32;n++) await actions.save({description:'分页行动 '+n,status:'todo'});
  await page.exposeFunction('bridge', async request => {
    try {
      bridgeCalls.push(request.cmd);
      if (assignmentGate && request.cmd==='actionQuery' && request.entityType==='initiative' && !request.entityId && await page.locator('#action-drawer').evaluate(n=>n.open)) { const gate=assignmentGate;assignmentGate=null;assignmentBegan();await gate; }
      if (request.cmd === 'referenceQuery' && referenceGate) { const gate=referenceGate;referenceGate=null;referenceBegan();await gate; }
      if (request.cmd === 'actionQuery' && queryGate) { const gate = queryGate; queryGate = null; queryBegan?.(); await gate; }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        return result;
      }
      const workspace = await activeFixture.adapter('workspace');
      if (request.workspaceId !== workspace.workspaceId) throw Error('Workspace changed; reopen the note');
      const path = join(activeFixture.root, request.path || '');
      switch (request.cmd) {
        case 'metadata':
        case 'list': {
          const notes = [];
          for (const name of await readdir(activeFixture.root)) if (name.endsWith('.md')) notes.push({path: name, size: (await stat(join(activeFixture.root, name))).size, modified: (await stat(join(activeFixture.root, name))).mtimeMs / 1000});
          return {notes, root: activeFixture.root};
        }
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive: true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { localStorage.setItem('stars',JSON.stringify(['reference.md'])); window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  const evidence = 'docs/validation/issue81/browser'; await mkdir(evidence, {recursive:true});
  await page.goto('https://notes.test/');
  await page.locator('.focus-row-open').first().waitFor();
  const outline = async node => { await page.waitForTimeout(100); return node.evaluate(n=>getComputedStyle(n).outlineStyle); };
  const row = page.locator('.focus-row-open').first();
  await row.click(); await page.locator('#action-drawer').waitFor({state:'visible'});
  await page.locator('#action-back').click(); await page.locator('#action-drawer').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.activeElement.matches('.focus-row-open'));
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle), 'none', 'pointer return must not inherit field keyboard frames');
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle), 'solid');
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter');
  await page.locator('#action-drawer').waitFor({state:'visible'}); await page.keyboard.press('Escape');
  await page.locator('#action-drawer').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.activeElement.matches('.focus-row-open'));
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle), 'solid', 'keyboard return stays visible');
  for (const viewport of [{width:1180,height:800},{width:393,height:852},{width:800,height:400}]) {
    await page.setViewportSize(viewport); await page.locator('[data-view=focus]').click();
    const menu=page.locator('.row-menu summary').first();await menu.click();
    await page.screenshot({path:`${evidence}/pointer-${viewport.width}.png`});
    assert.equal(await outline(menu),'none'); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
    await page.screenshot({path:`${evidence}/keyboard-${viewport.width}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.setViewportSize({width:1180,height:800});
  await page.locator('[data-view=notes]').click();await page.waitForFunction(()=>!document.querySelector('#library-progress').textContent && !document.querySelector('#library-next').disabled);
  await page.locator('#library-next').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#library-next').disabled && document.activeElement.id==='library-previous');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
  await page.locator('#library-previous').click();await page.waitForFunction(()=>!document.querySelector('#library-next').disabled);
  let releaseReference;const referenceStarted=new Promise(resolve=>{referenceBegan=resolve;});referenceGate=new Promise(resolve=>{releaseReference=resolve;});
  await page.locator('#search').fill('资料整理约定');await referenceStarted;await page.locator('#library-next').focus();releaseReference();
  await page.waitForFunction(()=>document.querySelectorAll('#items [data-path]').length===1 && document.activeElement.dataset.path==='reference.md');
  assert.equal(await page.locator('#library-next').isDisabled(),true);assert.equal(await page.locator('#library-previous').isDisabled(),true);
  await page.setViewportSize({width:393,height:852});await page.locator('#items [data-path="reference.md"]').click(); await page.locator('#editor').waitFor({state:'visible'});
  await page.setViewportSize({width:393,height:852}); await page.locator('#back').click();
  await page.waitForFunction(()=>document.activeElement.dataset.path==='reference.md');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none');
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
  assert.equal(await page.locator(':focus').getAttribute('aria-current'),'true');
  await page.screenshot({path:`${evidence}/selected-focused-393.png`});
  await page.waitForFunction(()=>document.activeElement.matches('#items .ui-row') && getComputedStyle(document.activeElement).outlineOffset==='-3px');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineOffset),'-3px','row focus stays inside its scroll boundary');
  await page.locator('[data-view=favorites]').click();await page.locator('#items [data-path="reference.md"]').waitFor();assert.equal(await page.locator('#items [data-path]').count(),1);await page.locator('#items [data-path]').click();await page.locator('#back').click();await page.waitForFunction(()=>document.activeElement.dataset.path==='reference.md');
  await page.setViewportSize({width:1180,height:800});
  await page.locator('[data-view=initiatives]').click();await page.locator('#items [data-initiative-id]').first().click();
  await page.locator('#workspace-context').waitFor({state:'visible'});
  assert.equal(await page.locator('#items [aria-current=true]').count(),1);
  await page.locator('[data-view=focus]').click();await page.getByRole('button',{name:'全部行动',exact:true}).click();await page.locator('#items [data-entity-id]').first().click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#items [data-entity-id]')].every(n=>!n.disabled));
  await page.locator('#action-back').click();await page.locator('#action-drawer').waitFor({state:'hidden'});
  await page.waitForFunction(()=>Boolean(document.activeElement.dataset.entityId));
  assert.equal(await page.evaluate(()=>Boolean(document.activeElement.dataset.entityId)),true);
  let release; const started = new Promise(resolve=>{queryBegan=resolve;});
  queryGate = new Promise(resolve=>{release=resolve;});
  await page.locator('#search').fill('分页');await started;
  const retainedRow=page.locator('#items [data-entity-id]').filter({hasText:'分页行动'}).first();
  const retainedId = await retainedRow.getAttribute('data-entity-id');
  await retainedRow.focus();
  await page.locator('#items').evaluate(n=>n.scrollTop=160);release();
  await page.waitForFunction(()=>document.querySelector('#index-state').textContent==='');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.entityId),retainedId);
  assert.equal(await page.locator('#items').evaluate(n=>n.scrollTop),160,'delayed query preserves the latest list scroll');
  await page.locator('#action-next').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#action-next').disabled && document.activeElement.id==='action-previous');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');

  const duplicateA=(await actions.save({description:'重复但独立的行动',status:'todo',focusPosition:-2})).record;
  const duplicateB=(await actions.save({description:'重复但独立的行动',status:'todo',focusPosition:-1})).record;
  await page.locator('[data-view=focus]').click();
  const menuA=page.locator(`summary[data-focus-key="action:${duplicateA.entityId}"]`);
  const menuB=page.locator(`summary[data-focus-key="action:${duplicateB.entityId}"]`);
  await menuA.click();
  const duplicateStarted=new Promise(resolve=>{queryBegan=resolve;});queryGate=new Promise(resolve=>{release=resolve;});
  await page.locator('[data-view=focus]').click();await duplicateStarted;await menuA.focus();release();
  await page.waitForFunction(()=>document.querySelector('#index-state').textContent==='');
  assert.equal(await menuA.evaluate(n=>n.parentElement.open),true);
  assert.equal(await menuB.evaluate(n=>n.parentElement.open),false);
  assert.equal(await menuA.evaluate(n=>document.activeElement===n),true,'duplicate labels cannot redirect return focus');
  // Initiative boundary focus, and an obsolete response after navigating away.
  await page.locator('[data-view=initiatives]').click();await page.locator('#initiative-next').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#index-state').textContent==='' && !document.querySelector('#initiative-next').disabled);
  await page.locator('#initiative-next').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#initiative-next').disabled && document.activeElement.id==='initiative-previous');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
  await page.locator('#initiative-previous').click();await page.waitForFunction(()=>!document.querySelector('#initiative-next').disabled);
  let releaseInactive;const inactiveStarted=new Promise(resolve=>{queryBegan=resolve;});queryGate=new Promise(resolve=>{releaseInactive=resolve;});
  await page.locator('#search').fill('分页事项');await inactiveStarted;
  await page.locator('[data-view=favorites]').click();await page.locator('#items [data-path="reference.md"]').waitFor();
  await page.locator('#search').focus();releaseInactive();await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'search');assert.equal(await page.locator('#items [data-initiative-id]').count(),0);
  // Cancel a clean Action while assignment options are still loading.
  await page.locator('[data-view=focus]').click();await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.locator('#action-tools').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#view-title').textContent==='行动' && document.querySelector('#index-state').textContent==='' && document.querySelectorAll('#items [data-entity-id]').length>0);
  let releaseAssignment;const assignmentStarted=new Promise(resolve=>{assignmentBegan=resolve;});assignmentGate=new Promise(resolve=>{releaseAssignment=resolve;});
  const earlyRow=page.locator('#items [data-entity-id]').first();const earlyId=await earlyRow.getAttribute('data-entity-id');
  await earlyRow.click();await assignmentStarted;await page.locator('#action-back').click();
  await page.waitForFunction(id=>!document.querySelector('#action-drawer').open && document.activeElement.dataset.entityId===id,earlyId);
  releaseAssignment();await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.entityId),earlyId,'late opening cannot take return focus');
  // A late assignment response must preserve an actively edited draft, selection and caret.
  const draftStarted=new Promise(resolve=>{assignmentBegan=resolve;});assignmentGate=new Promise(resolve=>{releaseAssignment=resolve;});
  await earlyRow.click();await draftStarted;
  await page.locator('#action-description').fill('尚未保存的行动草稿');
  await page.locator('#action-description').evaluate(n=>n.setSelectionRange(2,6));
  await page.locator('#action-status').focus();releaseAssignment();await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'action-status');
  assert.equal(await page.locator('#action-description').inputValue(),'尚未保存的行动草稿');
  assert.deepEqual(await page.locator('#action-description').evaluate(n=>[n.selectionStart,n.selectionEnd]),[2,6]);
  await page.locator('#action-back').click();await page.getByRole('button',{name:'继续编辑',exact:true}).click();
  assert.equal(await page.locator('#action-description').inputValue(),'尚未保存的行动草稿');
  await page.locator('#action-back').click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  // Distinct Focus openings own their returns even if their option requests overlap.
  await page.locator('[data-view=focus]').click();await page.locator('.focus-row-open').nth(1).waitFor();
  const focusA=page.locator('.focus-row-open').nth(0), focusB=page.locator('.focus-row-open').nth(1);
  const focusAId=await focusA.getAttribute('data-entity-id'), focusBId=await focusB.getAttribute('data-entity-id');
  const openAStarted=new Promise(resolve=>{assignmentBegan=resolve;});let releaseA;assignmentGate=new Promise(resolve=>{releaseA=resolve;});
  await focusA.click();await openAStarted;await page.locator('#action-back').click();
  await page.waitForFunction(id=>document.activeElement.dataset.entityId===id,focusAId);
  const openBStarted=new Promise(resolve=>{assignmentBegan=resolve;});let releaseB;assignmentGate=new Promise(resolve=>{releaseB=resolve;});
  await focusB.click();await openBStarted;releaseA();await page.waitForTimeout(300);
  await page.locator('#action-back').click();await page.waitForFunction(id=>document.activeElement.dataset.entityId===id,focusBId);
  releaseB();await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.entityId),focusBId,'obsolete A cannot install its return onto B');
  assert.equal(await readFile(sourcePath,'utf8'),original);assert.deepEqual(errors,[]);
  console.log('PASS browse focus modality, Focus/disclosure, Library selected-return, Initiative and Action consumers');
} catch(error) { console.error(await page.evaluate(()=>({active:document.activeElement.outerHTML,style:getComputedStyle(document.activeElement).cssText,offset:getComputedStyle(document.activeElement).outlineOffset}))); throw error; } finally {await browser.close();await fixture.close();}
