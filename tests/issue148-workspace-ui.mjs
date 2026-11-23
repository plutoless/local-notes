import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {storageFixture} from './action-adapter.js';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository, fingerprint} from '../web/initiatives.js';

const assets = 'build/web';
const evidence = process.env.ISSUE148_EVIDENCE_DIR || 'build/validation/148/browser';
const source = 'reference.md';
const original = '# 样本发布记录\n\n- [ ] 核对更新说明\n';
const title = '发布准备';
const description = '核对更新说明';
await mkdir(evidence, {recursive:true});
const manifest = JSON.parse(await readFile(join(assets, 'asset-manifest.json'), 'utf8'));
const fixture = await storageFixture();
try {
  await writeFile(join(fixture.root, source), original);
  const actions = new ActionRepository(fixture.adapter);
  const initiatives = new InitiativeRepository(fixture.adapter);
  await actions.open();
  await initiatives.open();
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH});
  try {
    const page = await browser.newPage({viewport:{width:1180,height:800}, reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.exposeFunction('bridge', async request => {
      try {
        if (request.cmd === 'read') {
          assert.equal(request.workspaceId, actions.workspaceId);
          assert.equal(request.path, source);
          return {text:await readFile(join(fixture.root, source), 'utf8')};
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

    await page.goto('https://notes.test/');
    await page.getByText('暂无重点行动。', {exact:true}).waitFor();
    assert.equal(await page.locator('#items').getByRole('button', {name:'新建行动', exact:true}).count(), 1);
    await page.screenshot({path:join(evidence, 'focus-empty.png')});

    const initiative = (await initiatives.save({title, goal:'发布可复现的样本', progress:'已整理来源笔记。', status:'active',
      sources:[{path:source, quote:'', fingerprint:fingerprint(original), role:'working-note'}]})).record;
    const action = (await actions.save({description, status:'todo', initiativeId:initiative.entityId, focusPosition:1,
      sources:[{path:source, quote:'', fingerprint:fingerprint(original)}]})).record;

    await page.reload();
    const focusRow = page.getByRole('button', {name:'打开行动：' + description});
    await focusRow.waitFor();
    const summary = page.locator('.focus-row summary');
    const normal = await summary.evaluate(node => getComputedStyle(node, '::before').backgroundColor);
    await summary.hover();
    const hovered = await summary.evaluate(node => getComputedStyle(node, '::before').backgroundColor);
    assert.notEqual(hovered, normal);
    await page.mouse.down();
    assert.notEqual(await summary.evaluate(node => getComputedStyle(node, '::before').backgroundColor), hovered);
    await page.mouse.up();
    const overflow = page.locator('.focus-row details');
    assert.equal(await overflow.evaluate(node => node.open), true);
    await page.keyboard.press('Tab');
    assert.equal(await overflow.evaluate(node => node.contains(document.activeElement)), true);
    await page.keyboard.press('Escape');
    assert.equal(await overflow.evaluate(node => node.open), false);
    assert.equal(await summary.evaluate(node => node === document.activeElement), true);
    assert.equal(await summary.evaluate(node => getComputedStyle(node).outlineWidth), '3px');

    await focusRow.click();
    await page.waitForFunction(() => document.activeElement.id === 'action-description');
    await page.locator('#action-status').selectOption('in-progress');
    await page.locator('#action-save').click();
    await page.locator('#action-save-state').getByText('已保存到本地', {exact:true}).waitFor();
    const saved = (await actions.query({entityId:action.entityId})).actions[0];
    assert.equal(saved.status, 'in-progress');
    const persisted = JSON.parse(await readFile(join(fixture.root, 'LocalNotesData', 'actions', action.entityId + '.json'), 'utf8'));
    assert.equal(persisted.revision, saved.revision);
    assert.equal(persisted.status, saved.status);

    await page.getByRole('button', {name:'打开来源：' + source}).click();
    await page.locator('#reading').getByText(description, {exact:true}).waitFor();
    await page.locator('#back').click();
    await page.waitForFunction(() => document.activeElement.dataset.actionSourcePath === 'reference.md');
    await page.locator('#action-open-initiative').click();
    await page.getByRole('heading', {name:title, exact:true}).waitFor();
    await page.locator('#initiative-actions [data-action-id]').getByText(description, {exact:true}).waitFor();
    await page.locator('#workspace-notes [data-path="reference.md"]').waitFor();
    await page.screenshot({path:join(evidence, 'initiative.png')});
    await page.locator('#workspace-return-action').click();
    await page.waitForFunction(() => document.activeElement.id === 'action-open-initiative');

    await page.locator('#action-back').click();
    await page.locator('#action-drawer').waitFor({state:'hidden'});
    await page.locator('[data-view=actions]').click();
    const actionRow = page.locator('#items [data-entity-id]');
    await actionRow.waitFor();
    assert.equal(await page.locator('main').isVisible(), false);
    await actionRow.click();
    await page.locator('#action-drawer').waitFor();
    await page.locator('#action-back').click();
    await page.locator('#action-drawer').waitFor({state:'hidden'});
    assert.equal(await actionRow.getAttribute('aria-current'), 'true');
    const selected = await actionRow.evaluate(node => [getComputedStyle(node).backgroundColor, getComputedStyle(node).getPropertyValue('--workspace-current').trim()]);
    assert.deepEqual(selected, ['rgb(232, 237, 231)', '#e8ede7']);
    await page.screenshot({path:join(evidence, 'actions.png')});

    await page.setViewportSize({width:393,height:600});
    await actionRow.click();
    const drawer = page.locator('#action-drawer');
    assert.equal(Math.round((await drawer.boundingBox()).width), 393);
    assert.equal(await page.locator('#action-save').evaluate(node => {
      const bounds = node.getBoundingClientRect();
      return bounds.height >= 44 && bounds.top >= 0 && bounds.bottom <= innerHeight;
    }), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({path:join(evidence, 'narrow-action-drawer.png')});
    await page.locator('#action-back').click();
    await page.waitForFunction(() => document.activeElement.matches('#items [data-entity-id]'));
    assert.equal(await readFile(join(fixture.root, source), 'utf8'), original);
    assert.deepEqual(errors, []);

    // Reload uses the same isolated index and Markdown through the app's message contract.
    await page.reload();
    await focusRow.getByText('进行中', {exact:true}).waitFor();
    console.log('PASS Focus states, Action save/readback, source and Initiative return, narrow drawer and reload.');
    console.log('Chromium replaces WKWebView message transport and reads the guarded fixture path through Node; production Swift record storage and SQLite index are used.');
  } finally {
    await browser.close();
  }
} finally {
  await fixture.close();
}
