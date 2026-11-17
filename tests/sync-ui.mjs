import {readFile, writeFile, readdir, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
const fixture = await storageFixture();
const otherFixture = await storageFixture();
let activeFixture = fixture;
let holdActionQuery = false, releaseHeldQuery, heldQueryStartedResolve;
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
await mkdir('build', {recursive: true});
try {
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const bridgeCalls = [];
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const sourcePath = join(fixture.root, 'reference.md');
  const original = await readFile(sourcePath, 'utf8');
  await page.exposeFunction('bridge', async request => {
    try {
      bridgeCalls.push(request.cmd);
      if (request.cmd === 'choose') { activeFixture = activeFixture === fixture ? otherFixture : fixture; return {}; }
      if (request.cmd === 'workspace' || request.cmd === 'metadata' || (request.cmd.startsWith('action') || request.cmd.startsWith('reference'))) {
        const result = await activeFixture.adapter(request.cmd, request);
        if (request.cmd === 'actionQuery' && holdActionQuery) { heldQueryStartedResolve(); await new Promise(resolve => { releaseHeldQuery = resolve; }); }
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
        case 'create': await writeFile(path, request.text, {flag: 'wx'}); return {};
        default: throw Error('Unhandled bridge command');
      }
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => { window.NotesNative = {request: async message => { const request = JSON.parse(message); window.nativeReply(request.id, await window.bridge(request)); if (request.cmd === 'actionQuery' && request.search === 'Only in workspace B') window.__heldQueryDelivered = true; }}; });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!['index.html', 'style.css', 'app.js', 'presentation.js', 'core.js', 'bridge.js', 'actions.js', 'action-screen.js', 'initiatives.js', 'initiative-screen.js', 'library.js', 'library-screen.js', 'focus-screen.js', 'revision-graph.js', 'sync-screen.js', 'organization.js', 'organize-screen.js'].includes(name)) return route.abort();
    await route.fulfill({body: await readFile(new URL('../web/' + name, import.meta.url)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.getByRole('heading', {name: '当前重点', exact: true, level: 2}).waitFor();
  const {ActionRepository} = await import('../web/actions.js');
  const {randomUUID} = await import('node:crypto');
  const repo = new ActionRepository(fixture.adapter); await repo.open();
  const base = (await repo.save({description: 'Review both versions', focusPosition: 1})).record;
  const local = (await repo.save({...base, description: 'Local description'}, base)).record;
  const remote = {...base, revision: randomUUID(), parents: [base.revision], description: 'Remote description', status: 'completed', focusPosition: null};
  await fixture.adapter('actionWrite', {workspaceId: repo.workspaceId, path: `revisions/${base.entityId}/${remote.revision}.json`, text: JSON.stringify(remote)});
  await page.getByRole('button', {name: '同步检查'}).click();
  const panel = page.getByRole('dialog', {name: '同步检查'});
  await panel.waitFor();
  await panel.getByText('发现冲突版本，请比较后选择或合并。').waitFor();
  const editor = panel.getByLabel('合并版本 JSON');
  await panel.getByRole('button', {name: '选择版本 1', exact: true}).click();
  await panel.getByRole('button', {name: '关闭检查', exact: true}).click();
  await panel.getByText('还有解决内容未保存。请继续编辑并保存，或明确放弃编辑。').waitFor();
  await page.keyboard.press('Escape'); assert.equal(await panel.isVisible(), true);
  await panel.getByText('高级：完整 JSON 与版本诊断', {exact:true}).click();
  await editor.fill('{bad json');
  await panel.getByRole('button', {name: '3. 保存解决结果到本地'}).click();
  await panel.getByText('解决结果未保存。请核对内容和目录后重试；编辑仍保留。若版本已变化，请放弃编辑并重新检查。').waitFor();
  assert.equal(await editor.inputValue(), '{bad json');
  await editor.fill(JSON.stringify({...local, description: 'Merged explicitly'}));
  await panel.getByRole('button', {name: '3. 保存解决结果到本地'}).click();
  await panel.getByText('现有版本中未发现待处理冲突。').waitFor();
  await repo.recover();
  const result = (await repo.query()).actions[0];
  assert.equal(result.description, 'Merged explicitly'); assert.deepEqual(new Set(result.parents), new Set([local.revision, remote.revision]));
  assert.equal((await repo.history(base.entityId)).length, 4);
  await panel.getByRole('button', {name:'关闭检查',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'同步检查',exact:true}).evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'同步检查',exact:true}).click();
  await panel.getByText('现有版本中未发现待处理冲突。').waitFor();
  const missing = {...local, entityId:randomUUID(), revision:randomUUID(), parents:[randomUUID()], description:'缺少父版本的测试记录'};
  const cycleA = {...local, entityId:randomUUID(), revision:randomUUID(), description:'循环历史的测试记录'};
  const cycleB = {...cycleA,revision:randomUUID(),parents:[cycleA.revision]}; cycleA.parents=[cycleB.revision];
  for(const record of [missing,cycleA,cycleB]) await fixture.adapter('actionWrite',{workspaceId:repo.workspaceId,path:`revisions/${record.entityId}/${record.revision}.json`,text:JSON.stringify(record)});
  await panel.getByRole('button',{name:'重新检查',exact:true}).click();
  await panel.getByText('缺少前序版本，暂不能保存。请等待文件到达后重新检查。').waitFor();
  await panel.getByText('版本历史形成循环，暂不能保存。请从保留的副本恢复历史，再重新检查。').waitFor();
  for(const save of await panel.getByRole('button',{name:'3. 保存解决结果到本地'}).all()) assert.equal(await save.isDisabled(),true);
  await page.setViewportSize({width:393,height:852});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
  await page.screenshot({path:'docs/validation/issue21/web-393px.png',fullPage:true});
  assert.equal(await readFile(sourcePath,'utf8'),original);
  assert.deepEqual(errors, []);
  console.log('PASS: shared synchronization UI compares forked revisions and saves explicit multi-parent resolution through production Mac storage.');
} finally { await browser.close(); await fixture.close(); await otherFixture.close(); }
