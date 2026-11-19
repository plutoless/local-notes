import {enterNoteEditing} from './form-journeys.js';
import {readFile, writeFile, readdir, stat, mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const evidence = 'docs/validation/issue55';

const fixture = await storageFixture();
let activeFixture = fixture, alternateFixture;
let delayTopic = false, releaseTopic, holdQuery = false, releaseQuery, startQuery;
const queryStarted = new Promise(resolve=>{startQuery=resolve;});
let holdNote = false, releaseNote, failNote = false, holdRead = false, releaseRead, startRead;
let readStarted = new Promise(resolve => {startRead=resolve;});
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  await page.exposeFunction('bridge', async request => {
    try {
      const delayedQuery = request.cmd === 'actionQuery' && holdQuery;
      if (delayedQuery) {holdQuery=false;startQuery();await new Promise(resolve=>{releaseQuery=resolve;});}
      if (request.cmd === 'read' && request.path === 'slow.md' && holdRead) { holdRead=false; startRead(); await new Promise(resolve=>{releaseRead=resolve;}); }
      if (request.cmd === 'save' && failNote) throw Error('Injected note write failure');
      if (request.cmd === 'save' && holdNote) { holdNote = false; await new Promise(resolve => { releaseNote = resolve; }); }
      if (request.cmd === 'actionWrite' && delayTopic) { delayTopic = false; await new Promise(resolve=>{releaseTopic=resolve;}); }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        if(delayedQuery) await page.evaluate(()=>window.delayedQueryReturned=true);
        return result;
      }
      if (request.cmd === 'choose') { activeFixture = alternateFixture || fixture; return {}; }
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
        case 'move': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await mkdir(join(activeFixture.root, request.target, '..'), {recursive:true}); await rename(path, join(activeFixture.root, request.target)); return {};
        case 'read': return {text: await readFile(path, 'utf8')};
        case 'save': if (await readFile(path, 'utf8') !== request.expected) throw Error('CONFLICT'); await writeFile(path, request.text); return {};
        case 'create': await mkdir(join(path, '..'), {recursive:true}); await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request));if(request.cmd==='read'){window.readCompletions ||= {};window.readCompletions[request.path]=(window.readCompletions[request.path]||0)+1;}if(request.path==='slow.md')window.slowReadReturned=true; }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'global-search.js', 'search-screen.js', 'presentation.js', 'task-drafts.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(process.env.INITIATIVE_ASSETS_DIR ? join(process.env.INITIATIVE_ASSETS_DIR, name) : new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  const workspace = await fixture.adapter('workspace');
  const {ActionRepository} = await import('../web/actions.js');
  const repository = new ActionRepository(fixture.adapter); await repository.open();
  const recordA = (await repository.save({description:'已保存的行动A',status:'todo',sources:[]})).record;
  const unrelatedKey = `action-draft:${workspace.workspaceId}:${recordA.entityId}`;
  const unrelated = JSON.stringify({fields: {...recordA,description:'保留的其他行动草稿'},previous:recordA});
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:unrelatedKey,value:unrelated});
  const openReference = async () => {
    const before=await page.evaluate(()=>window.readCompletions?.['reference.md'] || 0);
    await page.locator('#items [data-path="reference.md"]').click();
    await page.waitForFunction(before=>(window.readCompletions?.['reference.md']||0)>before,before);
  };
  await page.goto('https://notes.test/');
  await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('[data-view=notes]').click();
  await openReference();
  await page.locator('#editor').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),false);
  const decision = page.locator('#task-leave-decision');
  const choose = async name => { await decision.getByRole('button',{name,exact:true}).click(); await page.waitForFunction(async()=>!(await import('/presentation.js')).taskLeavePending() || Boolean(document.querySelector('#task-leave-decision [role=alert]')?.textContent)); };
  const retained = async()=>assert.equal(await page.evaluate(key=>localStorage.getItem(key),unrelatedKey),unrelated);
  const original = await readFile(sourcePath,'utf8');
  // Cancel autosave by opening the leave decision in the same task as input.
  await page.locator('#body').evaluate(n=>{n.value+='未提交笔记';n.dispatchEvent(new Event('input'));document.querySelector('[data-view=focus]').click();});
  await decision.waitFor();
  await decision.getByRole('button',{name:'继续编辑',exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await decision.getByRole('button',{name:'保存并离开',exact:true}).evaluate(n=>n===document.activeElement),true);
  await page.keyboard.press('Tab');
  assert.equal(await decision.getByRole('button',{name:'继续编辑',exact:true}).evaluate(n=>n===document.activeElement),true);
  for(const width of [1180,393]) { await page.setViewportSize({width,height:800}); await page.screenshot({path:join(evidence,`decision-${width}.png`)}); }
  await choose('继续编辑'); assert.match(await page.locator('#body').inputValue(),/未提交笔记/);
  assert.equal(await readFile(sourcePath,'utf8'),original);
  await page.locator('[data-view=focus]').click();await choose('放弃更改并离开');
  await page.locator('[data-view=notes]').click();await openReference();
  assert.doesNotMatch(await page.locator('#body').inputValue(),/未提交笔记/);await retained();
  // Reverting to the input baseline is clean, with no stale private recovery.
  const initial = await page.locator('#body').inputValue();
  await page.locator('#body').evaluate((n,initial)=>{n.value=initial+'x';n.dispatchEvent(new Event('input'));n.value=initial;n.dispatchEvent(new Event('input'));},initial);
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),false);
  await page.locator('#body').evaluate(n=>{n.value+='保存并离开笔记';n.dispatchEvent(new Event('input'));document.querySelector('[data-view=focus]').click();});
  await choose('保存并离开');assert.match(await readFile(sourcePath,'utf8'),/保存并离开笔记/);await retained();
  // A submitted autosave must settle before the first leave intent proceeds.
  await page.locator('[data-view=notes]').click();await openReference();
  holdNote=true;await enterNoteEditing(page); await page.locator('#body').fill('延迟提交的笔记');
  await page.waitForFunction(()=>document.querySelector('#save-state').textContent==='正在保存…');
  await page.locator('[data-view=focus]').click();
  await page.locator('[data-view=notes]').evaluate(n=>n.click());
  assert.equal(await page.locator('#editor').isVisible(),true);
  releaseNote();await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  assert.match(await readFile(sourcePath,'utf8'),/延迟提交的笔记/);await retained();
  await page.locator('[data-view=notes]').click();await openReference();
  failNote=true;await page.locator('#body').evaluate(n=>{n.value='失败笔记';n.dispatchEvent(new Event('input'));document.querySelector('[data-view=focus]').click();});
  await choose('保存并离开');await choose('继续编辑');assert.equal(await page.locator('#body').inputValue(),'失败笔记');
  await page.locator('[data-view=focus]').click();await choose('放弃更改并离开');failNote=false;
  if(await page.locator('#notice button').isVisible()) await page.locator('#notice button').click();
  await page.locator('[data-view=notes]').click();await openReference();
  await writeFile(sourcePath,'# 外部保存版本\n\n外部内容');
  await page.locator('#body').evaluate(n=>{n.value='冲突笔记';n.dispatchEvent(new Event('input'));document.querySelector('[data-view=focus]').click();});
  await choose('保存并离开');await choose('放弃更改并离开');
  assert.equal(await readFile(sourcePath,'utf8'),'# 外部保存版本\n\n外部内容');await retained();
  if(await page.locator('#notice button').isVisible()) await page.locator('#notice button').click();
  // Capture invalid/failing input can always be discarded, and never returns on reload.
  await page.locator('#new').click();await page.locator('#capture-title').fill('放弃的随手记');
  await page.keyboard.press('Escape');await choose('放弃更改并离开');
  await page.reload();await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await page.locator('#new').click();assert.equal(await page.locator('#capture-title').inputValue(),'');
  await page.locator('#capture-title').fill('保存后离开的随手记');await page.keyboard.press('Escape');await choose('保存并离开');
  assert.equal(await page.locator('#note-task-drawer').evaluate(n=>n.open),false);
  assert.equal((await readdir(join(fixture.root,'Notes'))).length,1);await retained();
  // Topic invalid, failed, and delayed saves use the same decision.
  await page.locator('[data-view=notes]').click();await page.locator('#library-create-topic').click();
  await page.locator('#topic-name').fill('待放弃主题');await page.locator('#topic-name').fill('');
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),false);
  await page.locator('#topic-name').fill('主题失败后放弃');fixture.fail(cmd=>cmd==='actionWrite');
  await page.keyboard.press('Escape');await choose('保存并离开');
  await decision.waitFor();await choose('放弃更改并离开');
  await page.locator('#library-create-topic').click();assert.equal(await page.locator('#topic-name').inputValue(),'');
  await page.locator('#topic-name').fill('主题延迟写入');delayTopic=true;
  await page.locator('#topic-drawer .primary').click();await page.waitForFunction(()=>document.querySelector('#topic-name').disabled);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#topic-drawer').evaluate(n=>n.open),true);
  releaseTopic();await page.locator('#topic-drawer').waitFor({state:'hidden'});await retained();
  if(await page.locator('#notice button').isVisible()) await page.locator('#notice button').click();
  // Explicitly opening another action must retain an unrelated recovered draft.
  await page.locator('[data-view=focus]').click();await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.locator('#action-new').click();await page.locator('#action-save').click();assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),false);
  await page.locator('#action-description').fill('要放弃的行动');await page.keyboard.press('Escape');await choose('放弃更改并离开');
  await page.locator('#action-new').click();assert.equal(await page.locator('#action-description').inputValue(),'');
  await page.locator('#action-description').fill('保存并离开的行动');await page.keyboard.press('Escape');await choose('保存并离开');
  await page.getByRole('heading',{name:'保存并离开的行动',exact:true}).click();
  await page.locator('#action-drawer').waitFor({state:'visible'});
  const description=await page.locator('#action-description').inputValue();
  await page.locator('#action-description').fill('');await page.keyboard.press('Escape');await choose('保存并离开');await decision.waitFor();await choose('放弃更改并离开');
  await page.getByRole('heading',{name:description,exact:true}).click();await page.locator('#action-drawer').waitFor({state:'visible'});assert.equal(await page.locator('#action-description').inputValue(),description);await page.keyboard.press('Escape');
  await page.getByRole('heading',{name:description,exact:true}).click();await page.locator('#action-drawer').waitFor({state:'visible'});
  await page.locator('#action-description').fill('延迟提交的行动');delayTopic=true;
  await page.locator('#action-save').click();await page.waitForFunction(()=>document.querySelector('#action-form').inert);
  await page.locator('[data-view=focus]').evaluate(n=>n.click());
  await page.locator('[data-view=notes]').evaluate(n=>n.click());
  assert.equal(await page.locator('#action-drawer').evaluate(n=>n.open),true);
  releaseTopic();await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();
  await repository.recover();assert.equal((await repository.query({search:'延迟提交的行动'})).actions.length,1);
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),false);
  await retained();
  // Initiative metadata: discarded invalid fields do not remove the saved record.
  await page.locator('[data-view=initiatives]').click();await page.locator('#initiative-new').click();
  await page.locator('#initiative-title').fill('事项三向离开');await page.keyboard.press('Escape');await choose('保存并离开');
  await page.getByRole('heading',{name:'事项三向离开',exact:true}).click();await page.locator('#workspace-overview').click();
  await page.locator('#initiative-title').fill('');await page.keyboard.press('Escape');await choose('放弃更改并离开');
  await page.locator('#workspace-overview').click();await page.locator('#initiative-drawer').waitFor({state:'visible'});assert.equal(await page.locator('#initiative-title').inputValue(),'事项三向离开');await page.keyboard.press('Escape');
  holdQuery=true;await page.locator('#workspace-overview').click();await queryStarted;
  await page.locator('[data-view=notes]').click();await page.locator('#library-tools').waitFor({state:'visible'});
  await page.locator('[data-view=initiatives]').click();await page.locator('.app.workspace').waitFor();releaseQuery();
  await page.waitForFunction(()=>window.delayedQueryReturned);
  await page.waitForFunction(()=>!document.querySelector('#workspace-overview').disabled);
  assert.equal(await page.locator('#initiative-drawer').evaluate(n=>n.open),false);
  assert.equal(await page.locator('.app').evaluate(n=>n.classList.contains('workspace')),true);
  await page.locator('[data-view=focus]').click();await page.getByRole('button',{name:'全部行动',exact:true}).click();
  await page.locator('#action-new').click();await page.locator('#action-description').fill('创建后继续编辑');await page.locator('#action-save').click();
  await page.locator('#action-save-state').filter({hasText:/^已保存到本地$/}).waitFor();await page.locator('#action-description').fill('创建后未提交的后续编辑');
  await page.reload();await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();await page.getByRole('button',{name:'全部行动',exact:true}).click();
  // Recovery is explicit; record A may be offered first, and stays uncommitted.
  const draftEntries=await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.startsWith('action-draft:')));
  const followup=draftEntries.find(([,value])=>value.includes('创建后未提交的后续编辑'));assert.ok(followup);assert.ok(!followup[0].endsWith(':new'));
  const created=(await repository.query({search:'创建后继续编辑'})).actions[0];
  await page.getByRole('heading',{name:'创建后继续编辑',exact:true}).click();await page.locator('#action-drawer').waitFor({state:'visible'});assert.equal(await page.locator('#action-description').inputValue(),'创建后未提交的后续编辑');
  await page.keyboard.press('Escape');await choose('放弃更改并离开');await retained();
  await page.locator('#action-new').click();await page.keyboard.press('Escape');
  await page.locator('#new').click();await page.locator('#capture-title').fill('x');await page.locator('#capture-title').fill('');
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),false);await page.reload();await page.getByRole('heading',{name:'当前重点',exact:true,level:2}).waitFor();await page.locator('#new').click();
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),false);await page.keyboard.press('Escape');
  await writeFile(join(fixture.root,'slow.md'),'# 延迟读取\n\n旧读取');
  await page.locator('[data-view=notes]').click();await page.locator('#library-refresh').click();
  holdRead=true;await page.locator('#items [data-path="slow.md"]').evaluate(n=>n.click());await readStarted;
  await openReference();await page.locator('#editor').waitFor({state:'visible'});
  await enterNoteEditing(page); await page.locator('#body').fill('后打开笔记的当前草稿');releaseRead();
  await page.waitForFunction(()=>window.slowReadReturned);
  assert.equal(await page.locator('#file-path').textContent(),'reference.md');assert.equal(await page.locator('#body').inputValue(),'后打开笔记的当前草稿');
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),true);
  await page.locator('[data-view=focus]').click();await choose('放弃更改并离开');await retained();
  await page.locator('[data-view=notes]').click();await openReference();
  await page.locator('#editor').waitFor({state:'visible'});
  await page.evaluate(()=>window.slowReadReturned=false);readStarted=new Promise(resolve=>{startRead=resolve;});
  holdRead=true;await page.locator('#items [data-path="slow.md"]').evaluate(n=>n.click());await readStarted;
  await enterNoteEditing(page); await page.locator('#body').fill('读取期间继续编辑的当前草稿');releaseRead();
  await page.waitForFunction(()=>window.slowReadReturned);
  assert.equal(await page.locator('#file-path').textContent(),'reference.md');
  assert.equal(await page.locator('#body').inputValue(),'读取期间继续编辑的当前草稿');
  assert.equal(await page.evaluate(()=>window.hasUnsavedChanges()),true);
  await page.locator('[data-view=focus]').click();await choose('放弃更改并离开');await retained();
  assert.deepEqual(errors,[]);
  console.log('PASS issue55 task decisions, clean/reverted input, invalid/failed/delayed saves, private drafts, saved record retention, reload and desktop/393px');
} finally { await browser.close(); await fixture.close(); }
