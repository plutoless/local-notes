import assert from 'node:assert/strict';
import {readFile, unlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {TopicRepository} from '../web/library.js';
import {storageFixture} from './action-adapter.js';

const assets = 'build/web';
const manifest = JSON.parse(await readFile(join(assets, 'asset-manifest.json'), 'utf8'));
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
const fixture = await storageFixture();
const other = await storageFixture();
try {
  let active = fixture, cancel = true, failInspection = false, failFocusRefresh = false, failTopicsReopen = false;
  let pendingTopics;
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
  const topics = new TopicRepository(fixture.adapter);
  await topics.open();
  const previousTopic = (await topics.save({description:'仅在原目录的主题'})).record;
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
      if (request.cmd === 'actionFiles' && request.entityType === 'topic' && active === other && failTopicsReopen) {
        assert.equal(request.workspaceId, otherRepo.workspaceId);
        throw Error('Controlled Topics reopen failure');
      }
      if (request.cmd === 'actionQuery' && request.focus && failFocusRefresh) throw Error('Controlled page refresh failure');
      const backend = active;
      const result = await backend.adapter(request.cmd, request);
      if (request.cmd === 'actionFiles' && request.entityType === 'topic' && backend === fixture && pendingTopics) {
        const pending = pendingTopics;
        pendingTopics = undefined;
        pending.started.resolve();
        await pending.release.promise;
      }
      return result;
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
  assert.equal(await directory.evaluate(node => getComputedStyle(node, '::before').content), 'none');
  await directory.hover();
  await waitForDirectoryFill('rgb(223, 231, 223)');
  await page.mouse.down();
  await waitForDirectoryFill('rgb(214, 224, 214)');
  await page.mouse.move(900, 700);
  await page.mouse.up();
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
  await inspection.getByText('下方为上次检查的结果。请重新检查后再选择版本。').waitFor();
  assert.equal(await sync.locator('.sync-branches').getByRole('button', {name:/选择版本/}).first().isDisabled(), true);
  failInspection = false;
  failFocusRefresh = true;
  await refresh.click();
  await inspection.getByText('有待解决的冲突 · 1 条').waitFor();
  assert.equal(await sync.locator('.sync-branches').getByRole('button', {name:/选择版本/}).first().isEnabled(), true);
  assert.match(await page.locator('#notice').textContent(), /Controlled page refresh failure/);
  failFocusRefresh = false;

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
  const deleteSave = sync.getByRole('button', {name:'标记删除并保存到本地', exact:true});
  assert.equal(await deleteSave.evaluate(node => getComputedStyle(node).borderColor), 'rgb(161, 38, 37)');
  const guard = page.locator('#task-leave-decision');
  await close.click();
  await guard.getByRole('heading', {name:'离开冲突解决（标记删除）'}).waitFor();
  const guardedDelete = guard.getByRole('button', {name:'保存并离开', exact:true});
  assert.equal(await guardedDelete.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(161, 38, 37)');
  await guard.getByRole('button', {name:'继续编辑', exact:true}).click();
  await sync.getByRole('button', {name:'放弃编辑', exact:true}).click();
  assert.equal(await focused(deleted), true);
  const branch = branchFor(local.description);
  await branch.press('Enter');
  assert.equal(await branch.getAttribute('aria-pressed'), 'true');
  const content = sync.getByRole('textbox', {name:'内容', exact:true});
  assert.equal(await focused(content), true);
  const waitForSelectedFill = color => page.waitForFunction(expected =>
    getComputedStyle(document.querySelector('.sync-branches button[aria-pressed="true"]')).backgroundColor === expected, color);
  await page.mouse.move(0, 0);
  await waitForSelectedFill('rgb(232, 237, 231)');
  await branch.hover();
  await waitForSelectedFill('rgb(223, 231, 223)');
  await page.mouse.down();
  await waitForSelectedFill('rgb(214, 224, 214)');
  await page.mouse.up();
  const selectedSummary = sync.locator('.sync-version[data-selected] > summary');
  await selectedSummary.hover();
  await page.mouse.down();
  try {
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.sync-version[data-selected] > summary')).backgroundColor === 'rgb(214, 224, 214)');
    assert.equal(await selectedSummary.locator('.sync-version-kind').evaluate(label => getComputedStyle(label).color), 'rgb(45, 69, 57)');
  } finally {
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
  await content.fill('合并：保留资料，补齐缺项');
  await content.evaluate(node => node.setSelectionRange(1, 3));
  await page.keyboard.press('Escape');
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
  const save = sync.getByRole('button', {name:'保存解决结果到本地'});
  assert.equal(await save.evaluate(node => getComputedStyle(node, '::before').backgroundColor), 'rgb(36, 92, 172)');

  for (const viewport of [{width:393,height:852}, {width:1180,height:480}]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await sync.locator('.sync-body').evaluate(node => node.scrollWidth <= node.clientWidth), true);
    assert.equal(await sync.evaluate(node => node.scrollWidth <= node.clientWidth), true);
    assert.equal(await history.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
    await save.scrollIntoViewIfNeeded();
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
  const pending = {started:Promise.withResolvers(), release:Promise.withResolvers()};
  pendingTopics = pending;
  await refresh.click();
  await pending.started.promise;
  await close.click();
  await page.setViewportSize({width:393,height:852});
  await directory.click();
  assert.equal(await directory.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  assert.equal(await page.locator('.shell').evaluate(node => node.scrollWidth <= node.clientWidth), true);
  cancel = false;
  await choose.click();
  await page.getByText('仅在另一个目录的行动', {exact:true}).waitFor();
  assert.equal(await page.locator('#root-label').textContent(), other.root);
  failTopicsReopen = true;
  await opener.click();
  pending.release.resolve();
  await inspection.getByText('检查未完成', {exact:true}).waitFor({timeout:5000});
  assert.match(await inspection.textContent(), /Controlled Topics reopen failure/);
  assert.equal(await sync.getByText(/部分版本需要核对/).count(), 0);
  assert.ok(!(await sync.textContent()).includes(previousTopic.entityId));
  assert.equal(await refresh.isEnabled(), true);
  failTopicsReopen = false;
  await refresh.click();
  await page.waitForFunction(() => document.querySelector('.sync-panel').getAttribute('aria-busy') === 'false');
  assert.match(await inspection.textContent(), /无待处理冲突/);
  assert.equal(await page.locator('#root-label').textContent(), other.root);
  assert.ok(!(await sync.textContent()).includes(previousTopic.entityId));
  assert.deepEqual(errors, []);
  console.log('Directory disclosure and chooser cancel/switch, Sync status, keyboard guarded cancel/confirm, and real adapter readback passed.');
} finally {
  await browser.close();
  await Promise.all([fixture.close(), other.close()]);
}
