import assert from 'node:assert/strict';
import {readFile, unlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {storageFixture} from './action-adapter.js';

const assets = 'build/web';
const manifest = JSON.parse(await readFile(join(assets, 'asset-manifest.json'), 'utf8'));
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
const fixture = await storageFixture();
const other = await storageFixture();
try {
  let active = fixture, cancel = true, failInspection = false;
  const repo = new ActionRepository(fixture.adapter);
  await repo.open();
  const ancestor = (await repo.save({description:'核对同步样本', status:'todo'})).record;
  const local = (await repo.save({...ancestor, description:'本机：保留本周资料'}, ancestor)).record;
  const remote = {...ancestor, revision:randomUUID(), parents:[ancestor.revision], description:'另一分支：删除过时的行动', deleted:true};
  const revisionPath = revision => `revisions/${ancestor.entityId}/${revision}.json`;
  await fixture.adapter('actionWrite', {workspaceId:repo.workspaceId, path:revisionPath(remote.revision), text:JSON.stringify(remote)});
  const oldBytes = () => Promise.all([ancestor, local, remote].map(record =>
    readFile(join(fixture.root, 'LocalNotesData', revisionPath(record.revision)))));
  const originalRevisions = await oldBytes();
  const source = join(fixture.root, 'reference.md');
  const originalSource = await readFile(source);
  const otherRepo = new ActionRepository(other.adapter);
  await otherRepo.open();
  await otherRepo.save({description:'仅在另一个目录的行动', focusPosition:1});
  const page = await browser.newPage({viewport:{width:1180, height:800}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'choose') {
        if (cancel) return {cancelled:true};
        active = other;
        return {};
      }
      if (request.cmd === 'actionFiles' && failInspection) throw Error('Controlled inspection failure');
      return await active.adapter(request.cmd, request);
    } catch (error) {
      return {error:error.message};
    }
  });
  await page.addInitScript(() => {
    window.NotesNative = {request:async message => {
      const request = JSON.parse(message);
      window.nativeReply(request.id, await window.bridge(request));
    }};
  });
  await page.route('https://notes.test/**', async route => {
    const asset = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!Object.hasOwn(manifest, asset)) return route.abort();
    await route.fulfill({path:join(assets, asset), contentType:manifest[asset]});
  });
  await page.goto('https://notes.test/');

  const directory = page.locator('.directory-details > summary');
  const choose = page.getByRole('button', {name:'选择本地目录', exact:true});
  const focused = control => control.evaluate(node => node === document.activeElement);
  const testGeometry = async control => {
    const rect = await control.boundingBox();
    assert.ok(rect.width >= 44 && rect.height >= 44, 'Target is at least 44 by 44');
  };
  await directory.focus();
  await page.keyboard.press('Space');
  await choose.waitFor();
  await page.keyboard.press('Tab');
  assert.equal(await focused(choose), true);
  assert.equal(await choose.evaluate(node => node.matches(':focus-visible')), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#root-label').textContent(), fixture.root);
  await page.keyboard.press('Escape');
  assert.equal(await focused(directory), true);
  assert.equal(await choose.isVisible(), false);
  await page.mouse.move(900, 700);
  const waitForDirectoryFill = color => page.waitForFunction(expected =>
    getComputedStyle(document.querySelector('.directory-details summary')).backgroundColor === expected, color);
  await waitForDirectoryFill('rgba(0, 0, 0, 0)');
  await directory.hover();
  await waitForDirectoryFill('rgb(238, 238, 233)');
  await page.mouse.down();
  await waitForDirectoryFill('rgb(226, 226, 220)');
  await page.mouse.up();
  await page.mouse.move(900, 700);
  await waitForDirectoryFill('rgb(232, 237, 231)');
  await testGeometry(directory);
  await testGeometry(choose);
  await choose.press('Escape');

  const opener = page.getByRole('button', {name:'同步检查', exact:true});
  const sync = page.getByRole('dialog', {name:'同步检查', exact:true});
  const refresh = sync.getByRole('button', {name:'重新检查'});
  const close = sync.getByRole('button', {name:'关闭检查'});
  const inspection = sync.locator('[data-sync-status]');
  await opener.press('Enter');
  await sync.waitFor();
  await page.waitForFunction(() => document.querySelector('.sync-panel').getAttribute('aria-busy') === 'false');
  assert.match(await inspection.innerText(), /有待解决的冲突 · 1 条/);
  await testGeometry(close);
  await testGeometry(refresh);
  await sync.locator('.sync-branches').getByText(local.description, {exact:true}).waitFor();
  await sync.locator('.sync-branches').getByText(remote.description, {exact:true}).waitFor();

  failInspection = true;
  await refresh.click();
  await inspection.getByText('检查未完成', {exact:true}).waitFor();
  assert.equal(await inspection.getByText('无待处理冲突', {exact:true}).count(), 0);
  failInspection = false;
  await refresh.click();
  await inspection.getByText('有待解决的冲突 · 1 条').waitFor();

  const history = sync.locator('.sync-history summary');
  await history.focus();
  assert.equal(await history.evaluate(node => node.closest('details').open), false);
  await page.keyboard.press('Space');
  assert.equal(await history.evaluate(node => node.closest('details').open), true);
  await page.keyboard.press('Space');
  const branchFor = description => sync.locator('.sync-branches details').filter({hasText:description})
    .getByRole('button', {name:/选择版本/});
  const deleted = branchFor(remote.description);
  await deleted.press('Enter');
  await sync.getByText('保存后，此记录将标记为已删除。原始版本仍保留。').waitFor();
  await sync.getByRole('button', {name:'放弃编辑', exact:true}).click();
  assert.equal(await focused(deleted), true);
  const branch = branchFor(local.description);
  await branch.press('Enter');
  assert.equal(await branch.getAttribute('aria-pressed'), 'true');
  const content = sync.getByRole('textbox', {name:'内容', exact:true});
  assert.equal(await focused(content), true);
  await content.fill('合并：保留资料，补齐缺项');
  await content.evaluate(node => node.setSelectionRange(1, 3));
  await page.keyboard.press('Escape');
  const guard = page.locator('#task-leave-decision');
  const keep = guard.getByRole('button', {name:'继续编辑', exact:true});
  assert.equal(await focused(keep), true);
  const discard = guard.getByRole('button', {name:'放弃更改并离开'});
  assert.equal(await discard.evaluate(node => getComputedStyle(node).borderColor), 'rgb(161, 38, 37)');
  await keep.press('Enter');
  await guard.waitFor({state:'hidden'});
  assert.equal(await focused(content), true);
  assert.deepEqual(await content.evaluate(node => [node.selectionStart, node.selectionEnd]), [1, 3]);
  assert.deepEqual(await oldBytes(), originalRevisions);
  assert.equal((await repo.history(ancestor.entityId)).length, 3);

  for (const viewport of [{width:393,height:852}, {width:1180,height:480}]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await sync.locator('.sync-body').evaluate(node => node.scrollWidth <= node.clientWidth), true);
    assert.equal(await sync.evaluate(node => node.scrollWidth <= node.clientWidth), true);
    assert.equal(await history.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
    await sync.getByRole('button', {name:'保存解决结果到本地'}).scrollIntoViewIfNeeded();
  }
  await close.click();
  await guard.getByRole('button', {name:'保存并离开', exact:true}).click();
  await sync.waitFor({state:'hidden'});
  assert.equal(await focused(opener), true);
  const reopened = new ActionRepository(fixture.adapter);
  await reopened.open();
  const [result] = (await reopened.query({entityId:ancestor.entityId})).actions;
  assert.equal(result.description, '合并：保留资料，补齐缺项');
  assert.deepEqual(new Set(result.parents), new Set([local.revision, remote.revision]));
  assert.equal((await reopened.history(ancestor.entityId)).length, 4);
  assert.deepEqual(await oldBytes(), originalRevisions);
  assert.deepEqual(await readFile(source), originalSource);

  await page.reload();
  await opener.click();
  await inspection.getByText('无待处理冲突', {exact:true}).waitFor();
  const broken = join(fixture.root, 'LocalNotesData', 'actions', 'broken.json');
  await writeFile(broken, '{invalid');
  await refresh.click();
  await inspection.getByText('部分版本需要核对', {exact:true}).waitFor();
  assert.equal(await readFile(broken, 'utf8'), '{invalid');
  await unlink(broken);
  await close.click();
  await page.setViewportSize({width:393,height:852});
  await directory.click();
  assert.equal(await directory.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  assert.equal(await page.locator('.shell').evaluate(node => node.scrollWidth <= node.clientWidth), true);
  cancel = false;
  await choose.click();
  await page.getByText('仅在另一个目录的行动', {exact:true}).waitFor();
  assert.equal(await page.locator('#root-label').textContent(), other.root);
  assert.deepEqual(errors, []);
  console.log('Directory disclosure and chooser cancel/switch, Sync status, keyboard guarded cancel/confirm, and real adapter readback passed.');
} finally {
  await browser.close();
  await Promise.all([fixture.close(), other.close()]);
}
