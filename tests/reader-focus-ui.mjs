import {execFileSync} from 'node:child_process';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const phase = process.env.PHASE || 'after';
const evidence = process.env.READER_FOCUS_EVIDENCE_DIR || `docs/validation/issue82/browser/${phase}`;
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
    if (!['assets/react-host.js', 'assets/react-host.css', 'index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'reading-history.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: phase==='before' && name==='style.css' ? execFileSync('git',['show','a3a5e2943537480a6efe7780fa8e4ba8f86e9ca3:web/style.css']) : await readFile(process.env.LIBRARY_ASSETS_DIR ? join(process.env.LIBRARY_ASSETS_DIR, name) : new URL('../build/web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });

  await mkdir(evidence, {recursive:true});
  const text = '# 长中文阅读标题与 English source\n\n## 匹配原文 English selection\n\n[[second|阅读下一份很长的中文资料与 English alias]]\n\n| 一 | 二 | 三 | 四 | 五 |\n| --- | --- | --- | --- | --- |\n| 内容 | 内容 | 内容 | 内容 | 内容 |\n\n- [ ] 不应改变的任务\n\n' + '长中文 English 阅读段落。\n\n'.repeat(100);
  await writeFile(sourcePath,text);
  await writeFile(join(fixture.root,'second.md'),'# 第二份资料\n\n[[reference|返回原文]]');
  await page.goto('https://notes.test/');
  await page.locator('[data-view=notes]').click();
  await page.locator('#items [data-path="reference.md"]').click();
  await page.locator('#reading').waitFor({state:'visible'});
  const receipts=[];
  const inspect=async selector=>page.locator(selector).evaluate(n=>({outline:getComputedStyle(n).outlineStyle, color:getComputedStyle(n).outlineColor, width:getComputedStyle(n).outlineWidth, height:n.getBoundingClientRect().height, focused:n===document.activeElement}));
  for (const viewport of [{width:1180,height:800},{width:393,height:852},{width:800,height:400}]) {
    await page.setViewportSize(viewport);
    const shot=async state=>page.screenshot({path:`${evidence}/${state}-${viewport.width}.png`});
    const link=page.locator('.wiki-link').first();
    assert.ok((await inspect('.wiki-link')).height>=44,'inline link retains the existing accessible target');
    await link.click();await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='second.md');
    await page.locator('#back').click();await page.waitForFunction(()=>document.querySelector('#file-path').textContent==='reference.md');
    assert.equal(await link.evaluate(n=>n===document.activeElement),true);
    assert.equal((await inspect('.wiki-link')).outline,'none');await shot('pointer-return');
    await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    assert.equal((await inspect('.wiki-link')).outline,'solid');await shot('keyboard-link');
    // Matched-passage focus is navigation setup; Tab above supplies keyboard modality.
    await page.locator('#reading h2').evaluate(n=>{n.tabIndex=-1;n.focus();const r=document.createRange();r.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(r);});
    const target=await inspect('#reading h2');receipts.push({viewport,target});
    if(phase==='after') assert.equal(target.outline,'none','read-only location must not become a decorated control');
    assert.equal(await page.evaluate(()=>getSelection().toString()),'匹配原文 English selection');await shot('selected-target');
    await page.locator('.markdown-table').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
    if(phase==='after') assert.equal((await inspect('.markdown-table')).width,'3px');
    await shot('keyboard-table');
    await page.locator('#mode').click();
    assert.equal(await page.locator('#body').evaluate(n=>n===document.activeElement),true);
    assert.equal((await inspect('#body')).outline,'solid');
    await page.locator('#body').evaluate(n=>n.setSelectionRange(0,10));await shot('selected-editor');
    // No note-editor validation state exists; do not invent an invalid fixture.
    await page.locator('#mode').click();
    assert.equal(await readFile(sourcePath,'utf8'),text);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  // Open a grounded source through real search controls, not a fabricated focus target.
  await page.locator('#global-search-open').click();await page.locator('#global-search-input').fill('English selection');
  await page.locator('#global-search').getByRole('button',{name:'打开原文',exact:true}).first().click();
  await page.waitForFunction(()=>document.activeElement.getAttribute('aria-label')==='搜索匹配原文');
  assert.equal(await page.locator(':focus').getAttribute('data-source-line'),'2');
  if(phase==='after') assert.equal(await page.locator(':focus').evaluate(n=>getComputedStyle(n).outlineStyle),'none');
  for(const viewport of [{width:1180,height:800},{width:393,height:852},{width:800,height:400}]) {
    await page.setViewportSize(viewport);await page.screenshot({path:`${evidence}/matched-source-${viewport.width}.png`});
  }
  assert.equal(await readFile(sourcePath,'utf8'),text);
  assert.equal(fixture.calls.some(call=>call.cmd==='actionWrite'),false,'reading never writes formal records');
  await page.locator('.search-return:visible').click();await page.locator('#global-search').waitFor({state:'visible'});await page.getByRole('button',{name:'关闭搜索',exact:true}).click();await page.locator('#global-search').waitFor({state:'hidden'});
  await page.setViewportSize({width:1180,height:800});
  await page.locator('#mode').click();await page.locator('#body').fill('明确保存的中文与 English edit');
  await page.locator('#note-save').click();await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='已保存到本地');
  const saved=await readFile(sourcePath,'utf8');assert.match(saved,/明确保存/);
  await page.locator('#body').fill('继续编辑保留');await page.locator('#back').click();
  await page.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await page.locator('#body').inputValue(),'继续编辑保留');
  await page.locator('#back').click();await page.getByRole('button',{name:'放弃更改并离开',exact:true}).click();
  assert.equal(await readFile(sourcePath,'utf8'),saved);
  assert.deepEqual(errors,[]);
  await writeFile(`${evidence}/receipt.json`,JSON.stringify({phase,receipts,readOnlySourceUnchanged:true,explicitSave:true,continueAndDiscard:true,invalid:'Not applicable: note source editor has no invalid-field state'},null,2));
  console.log('PASS reader focus, navigation, selection, source preservation, explicit save, continue and discard');
} finally { await browser.close(); await fixture.close(); }
