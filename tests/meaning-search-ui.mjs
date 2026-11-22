import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {chromium} from 'playwright';
import {ActionRepository} from '../web/actions.js';
import {InitiativeRepository} from '../web/initiatives.js';
import {storageFixture} from './action-adapter.js';

const corpus = JSON.parse(await readFile(new URL('./fixtures/meaning-search.json', import.meta.url)));
const query = id => corpus.queries.find(entry => entry.id === id).query;
const model = process.env.LOCAL_NOTES_MEANING_MODEL_DIR;
if (!model) throw Error('Set LOCAL_NOTES_MEANING_MODEL_DIR to the verified local model directory');
const cache = await mkdtemp(join(tmpdir(), 'ln-e5-ui-'));
const runtime = process.env.LOCAL_NOTES_MEANING_PYTHON || 'python3';
const endpoint = process.env.LOCAL_NOTES_MEANING_SOCKET = join(cache, 'service.sock');
const server = spawn(runtime, ['scripts/meaning-search-server.py', '--model-dir', model, '--cache-dir', cache, '--socket', endpoint],
  {stdio:['ignore','pipe','inherit'],env:{...process.env,TOKENIZERS_PARALLELISM:'false',HF_HUB_OFFLINE:'1'}});
let fixture, browser;
try {
  const start = await Promise.race([
    once(server.stdout, 'data', {signal: AbortSignal.timeout(15000)}),
    once(server, 'exit').then(([code]) => { throw Error(`Local model service exited: ${code}`); }),
  ]);
  assert.match(String(start[0]), /ready on a private socket/);
  assert.equal((await stat(endpoint)).mode & 0o077, 0);
  fixture = await storageFixture();
  for (const note of corpus.notes.filter(note=>note.workspace==='primary')) {
    const target = join(fixture.root,note.path);
    await mkdir(dirname(target),{recursive:true});
    await writeFile(target,note.body);
  }
  const original = corpus.notes.find(note=>note.path==='Current/ops.md').body;
  await assert.rejects(fixture.adapter('meaningSearch',
    {operation:'preference', workspaceId:'00000000-0000-0000-0000-000000000000'}), /Workspace changed/);
  const actions = new ActionRepository(fixture.adapter);
  const initiatives = new InitiativeRepository(fixture.adapter);
  await actions.open(); await initiatives.open();
  for (const record of corpus.records) {
    const {id,type,...fields} = record;
    if (type==='action') await actions.save(fields);
    else await initiatives.save({...fields,status:'active',description:'Synthetic meaning-search fixture'});
  }
  browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  const page = await browser.newPage({viewport: {width: 1180, height: 800}});
  const errors = [];
  const operations = [];
  let clipboard = '', delayedMeaning;
  page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('bridge', async request => {
    try {
      if (request.cmd === 'clipboardWrite') { clipboard = request.text; return {}; }
      if (request.cmd === 'read') return {text: await readFile(join(fixture.root, request.path), 'utf8')};
      if (request.cmd === 'meaningSearch') {
        operations.push(request.operation);
        if (request.operation === 'query' && delayedMeaning) {
          const previous = delayedMeaning;
          delayedMeaning = null;
          previous.entered();
          await previous.release;
        }
      }
      return await fixture.adapter(request.cmd, request);
    } catch (error) { return {error: error.message}; }
  });
  await page.addInitScript(() => {
    window.NotesNative = {request: async text => {
      const request = JSON.parse(text);
      window.nativeReply(request.id, await window.bridge(request));
    }};
  });
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    await route.fulfill({body: await readFile(new URL('../build/web/'+name, import.meta.url)),
      contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html'});
  });
  await page.goto('https://notes.test/');
  await page.locator('#global-search-open').click();
  const input = page.locator('#global-search-input');
  const checkbox = page.getByRole('checkbox', {name: '本机语义检索'});
  await checkbox.waitFor();
  assert.equal(await checkbox.isChecked(), false);
  await input.fill(query('meaning-zh'));
  await page.waitForFunction(() => document.querySelector('.search-status')?.textContent === '没有匹配的内容');
  assert.equal(operations.some(operation => ['status','put','query'].includes(operation)), false);

  await checkbox.check();
  const result = page.locator('.search-result').filter({hasText: '语义相关'});
  await result.filter({hasText:'备用负责人'}).waitFor();
  const row = result.filter({hasText:'备用负责人'});
  await row.getByRole('button',{name:'展开片段'}).click();
  const passage = row.locator('.search-passage');
  await page.waitForFunction(() => document.querySelector('.search-passage-label')?.textContent.includes('展开片段'));
  assert.match(await passage.textContent(), /由备用负责人接手告警/);
  await row.getByRole('button',{name:'复制片段'}).click();
  await page.waitForFunction(() => document.querySelector('.search-status')?.textContent === '已复制片段');
  assert.equal(clipboard, await passage.textContent());
  await row.getByRole('button',{name:'打开原文'}).click();
  await page.locator('#global-search').waitFor({state:'hidden'});
  await page.locator('.search-return:visible').first().click();
  await row.waitFor();
  assert.match(await row.locator('.search-passage-label').textContent(), /展开片段/);
  await input.fill(query('meaning-en'));
  await result.filter({hasText:'shipping.md'}).waitFor();

  await input.fill(query('archive'));
  await page.locator('.search-result').filter({hasText:'Archive/ops.md'}).waitFor();
  await page.locator('[data-scope=initiative]').click();
  await input.fill(query('meaning-initiative'));
  await result.filter({hasText:'Improve original paragraph recall'}).waitFor();
  await page.locator('[data-scope=action]').click();
  await input.fill(query('meaning-action'));
  await result.filter({hasText:"supplier's signed acknowledgement"}).waitFor();

  await input.fill('signed acknowledgement');
  await page.locator('.search-result').filter({hasText:"signed acknowledgement"}).waitFor();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.search-result').count(), 1, 'literal match is not duplicated');
  assert.equal(await result.count(), 0, 'literal result remains primary');

  const workspaceId = actions.workspaceId;
  await chmod(cache,0o755);
  try {
    await assert.rejects(fixture.adapter('meaningSearch', {workspaceId, operation:'status'}), /unavailable/);
  } finally {
    await chmod(cache,0o700);
  }

  await page.locator('[data-scope=all]').click();
  let release;
  const held = new Promise(resolve=>{release=resolve;});
  const entered = new Promise(resolve=>{delayedMeaning={entered:resolve, release:held};});
  await input.fill(query('meaning-en'));
  await entered;
  await page.keyboard.press('Escape');
  await page.locator('#global-search-open').click();
  await input.fill('备用负责人');
  release();
  await page.waitForFunction(() => document.querySelector('.search-status')?.textContent.startsWith('本页'));
  assert.equal(await page.locator('.search-result').filter({hasText:'shipping.md'}).count(),0);

  const puts = operations.filter(operation=>operation==='put').length;
  await page.reload();
  await page.locator('#global-search-open').click();
  await checkbox.waitFor();
  assert.equal(await checkbox.isChecked(), true);
  await input.fill(query('meaning-zh'));
  await result.filter({hasText:'备用负责人'}).waitFor();
  assert.equal(operations.filter(operation=>operation==='put').length, puts, 'unchanged persisted sources are reused');

  // External edits invalidate only the changed passage index entries.
  await writeFile(join(fixture.root,'Current','ops.md'), original + '\n\n交接记录只填写负责人姓名。');
  await page.getByRole('button',{name:'刷新索引'}).click();
  await page.waitForFunction(() => !document.querySelector('.search-meaning [role=status]'));
  await result.filter({hasText:'备用负责人'}).waitFor();
  assert.equal(operations.filter(operation=>operation==='put').length, puts + 1);
  await row.getByRole('button',{name:'展开片段'}).click();
  await page.waitForFunction(() => document.querySelector('.search-passage')?.textContent.includes('交接记录只填写负责人姓名'));


  await checkbox.uncheck();
  const providerQueries = operations.filter(operation=>operation==='query').length;
  await input.fill('备用负责人');
  await page.waitForFunction(() => [...document.querySelectorAll('.search-result')].some(
    row => row.textContent.includes('备用负责人') && !row.textContent.includes('语义相关')));
  assert.equal(await result.count(), 0);
  assert.equal(operations.filter(operation=>operation==='query').length, providerQueries);

  server.kill('SIGTERM');
  await once(server,'exit');
  await checkbox.check();
  await page.getByText('本机语义模型不可用，可使用关键词搜索。启动服务后刷新索引。').waitFor();
  assert.equal(await page.locator('.search-result').filter({hasText:'备用负责人'}).count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS: opt-in E5 retrieval, source grounding, exact copy, scopes, deduplication, incremental cache, and keyword fallback.');
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    server.kill('SIGTERM');
    await once(server,'exit').catch(() => {});
  }
  await browser?.close();
  await fixture?.close();
  await rm(cache,{recursive:true,force:true});
}
