import assert from 'node:assert/strict';
import {mkdir, readFile, unlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';

const assets = process.env.READER_ASSETS_DIR || 'build/web';
const evidence = process.env.READER_EVIDENCE_DIR || 'build/validation/145/current';
const baseline = process.env.READER_BASELINE === '1';
const source = 'Notes/welcome.md';
const original = await readFile(join('sample', source), 'utf8');
const manifest = JSON.parse(await readFile(join(assets, 'asset-manifest.json'), 'utf8'));
const viewports = [{width:1180,height:800}, {width:393,height:852}];
await mkdir(evidence, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
try {
  const fixture = await storageFixture();
  try {
    await unlink(join(fixture.root, 'reference.md'));
    await mkdir(join(fixture.root, 'Notes'));
    const file = join(fixture.root, source);
    await writeFile(file, original);
    let failSave = false;
    const page = await browser.newPage({viewport:viewports[0]});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.exposeFunction('bridge', async request => {
      try {
        if (['read', 'save'].includes(request.cmd)) {
          const workspace = await fixture.adapter('workspace');
          assert.equal(request.workspaceId, workspace.workspaceId);
          assert.equal(request.path, source);
          if (request.cmd === 'read') return {text:await readFile(file, 'utf8')};
          if (failSave) throw Error('Controlled save failure');
          const disk = await readFile(file, 'utf8');
          if (disk !== request.expected) throw Error('CONFLICT');
          await writeFile(file, request.text);
          return {};
        }
        return await fixture.adapter(request.cmd, request);
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
    const library = page.locator('[data-view=notes]');
    const row = page.locator('#items [data-path="Notes/welcome.md"]');
    const edit = page.locator('#mode');
    const body = page.locator('#body');
    const details = page.locator('#note-reference-open');
    const panel = page.locator('#note-reference');
    const read = page.locator('#reading');
    const focused = locator => locator.evaluate(node => node === document.activeElement);
    const ring = locator => locator.evaluate(node => getComputedStyle(node).outlineStyle);
    const shot = (state, {width,height}) => page.screenshot({path:join(evidence, `${state}-${width}x${height}.png`)});
    const open = async (withKeyboard = false) => {
      await library.click();
      await row.waitFor();
      if (withKeyboard) {
        for (let i = 0; i < 35 && !await focused(row); i++) await page.keyboard.press('Tab');
        assert.equal(await focused(row), true);
        await page.keyboard.press('Enter');
      } else {
        await row.click();
      }
      await read.waitFor();
      await page.waitForFunction(() => document.activeElement.id === 'mode');
    };

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('https://notes.test/');
      await open();
      if (!baseline) assert.equal(await ring(edit), 'none', 'Pointer opening keeps the edit entry quiet');
      assert.equal(await panel.isVisible(), false);
      assert.equal(await read.getByRole('checkbox').count(), 3);
      assert.equal(await read.getByRole('checkbox').first().isDisabled(), true);
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      await shot('reader', viewport);
      await details.click();
      assert.equal(await details.getAttribute('aria-expanded'), 'true');
      assert.equal(await panel.locator('dd').textContent(), source);
      if (!baseline) {
        for (const control of [edit, details, panel.getByRole('button', {name:'收起', exact:true})]) {
          const {width,height} = await control.boundingBox();
          assert.ok(width >= 44 && height >= 44, 'Reader controls reserve a 44px target');
        }
      }
      await panel.scrollIntoViewIfNeeded();
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      await shot('details', viewport);
      await panel.getByRole('button', {name:'收起', exact:true}).click();
      assert.equal(await focused(details), true);
      assert.equal(await panel.isVisible(), false);
      assert.equal(await readFile(file, 'utf8'), original);
      if (baseline) continue;

      assert.equal(await page.locator('#shell #global-search-open').count(), 1);
      assert.deepEqual(await page.locator('#shell nav button').allInnerTexts(),
        ['当前重点','笔记库','收藏','行动','事项','整理','同步检查']);
      assert.equal(await library.getAttribute('aria-current'), 'page');
      assert.equal(await page.getByRole('heading', {name:'Leave some room for ideas', exact:true}).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('#note-create-action').isVisible(), false);
      const fill = locator => locator.evaluate(node => getComputedStyle(node, '::before').backgroundColor);
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      const selected = await fill(library);
      assert.equal(selected, 'rgb(232, 237, 231)');
      await library.hover();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-view=notes]'), '::before').backgroundColor === 'rgb(223, 231, 223)');
      await page.mouse.down();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-view=notes]'), '::before').backgroundColor === 'rgb(214, 224, 214)');
      await page.mouse.move(viewport.width - 1, viewport.height - 1);
      await page.mouse.up();
      assert.equal(await library.getAttribute('aria-current'), 'page');

      await page.locator('#back').click();
      await open(true);
      assert.equal(await ring(edit), 'solid', 'Keyboard opening keeps the edit entry visible');
      await shot('keyboard', viewport);
      await page.keyboard.press('Tab');
      assert.equal(await focused(details), true);
      await page.keyboard.press('Space');
      await page.keyboard.press('Tab');
      assert.equal(await focused(panel.getByRole('button', {name:'收起', exact:true})), true);
      await page.keyboard.press('Escape');
      assert.equal(await panel.isVisible(), false);
      assert.equal(await focused(details), true);
      await shot('closed', viewport);
      await details.click();
      await library.focus();
      await page.keyboard.press('Escape');
      assert.equal(await panel.isVisible(), false, 'Escape closes Details after focus leaves the reader');
      assert.equal(await focused(details), true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await focused(edit), true);
      await page.keyboard.press('Enter');
      assert.equal(await focused(body), true);
      assert.equal(await ring(body), 'solid');
      await details.click();
      for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
      assert.equal(await focused(page.locator('#note-save')), true);
      assert.equal(await panel.isVisible(), false, 'The focused edit controls are clear of the details overlay');
      await edit.click();
      assert.equal(await read.isVisible(), true);
      assert.equal(await readFile(file, 'utf8'), original);
    }

    if (!baseline) {
      await page.setViewportSize(viewports[0]);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await edit.evaluate(node => getComputedStyle(node, '::before').transitionDuration), '0s');
      await details.click();
      const organize = panel.getByRole('button', {name:'笔记信息与整理', exact:true});
      await organize.click();
      await page.locator('#note-info-drawer[open]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('#note-info-drawer').waitFor({state:'hidden'});
      assert.equal(await focused(organize), true);
      assert.equal(await panel.isVisible(), true, 'The active drawer owns its own Escape');
      await details.click();
      await edit.click();
      const longTitle = '这是一份需要完整显示的中文资料标题与原文。'.repeat(3);
      await page.locator('#title').fill(longTitle);
      const editedBody = '中文试读与 English save\n\n123456789012345678901234567890 [[Notes/welcome|原文链接]]';
      await body.fill(editedBody);
      await page.locator('#note-save').click();
      await page.locator('#save-state').getByText('已保存到本地', {exact:true}).waitFor();
      const saved = `# ${longTitle}\n\n${editedBody}`;
      assert.equal(await readFile(file, 'utf8'), saved);

      failSave = true;
      await body.fill('应保留的未保存草稿');
      await page.locator('#note-save').click();
      await page.locator('#save-state').getByText('未保存 · 编辑仍保留', {exact:true}).waitFor();
      await page.reload();
      await library.click();
      await row.click();
      await body.waitFor();
      assert.equal(await body.inputValue(), '应保留的未保存草稿');
      await page.locator('#back').click();
      const leave = page.locator('#task-leave-decision');
      await leave.getByRole('button', {name:'继续编辑', exact:true}).click();
      assert.equal(await body.inputValue(), '应保留的未保存草稿');
      await page.locator('#back').click();
      await leave.getByRole('button', {name:'放弃更改并离开', exact:true}).click();
      assert.equal(await readFile(file, 'utf8'), saved);
      await page.reload();
      await open();
      assert.equal(await read.getByText('中文试读与 English save', {exact:true}).isVisible(), true);
      await page.setViewportSize(viewports[1]);
      const title = page.getByRole('heading', {name:longTitle, exact:true});
      assert.equal(await title.evaluate(node => node.scrollWidth <= node.clientWidth), true);
      assert.ok((await title.boundingBox()).height >= 50);
      await shot('long-title', viewports[1]);
      await page.setViewportSize({width:800,height:700});
      await details.click();
      const link = read.getByRole('button', {name:'打开本地笔记：原文链接', exact:true});
      for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
      assert.equal(await focused(link), true, 'Leaving Details keeps the destination link focused');
      assert.equal(await panel.isVisible(), false, 'The focused document is clear of the details overlay');
    }
    assert.deepEqual(errors, []);
    console.log(baseline ? 'Captured desktop and narrow baseline reader and details.' :
      'PASS matched reader previews, disclosure and drawer focus, keyboard editing, isolated save, recovery and discard readback.');
  } finally {
    await fixture.close();
  }
} finally {
  await browser.close();
}
