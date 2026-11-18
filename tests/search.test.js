import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile, symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {NoteSearch} from '../web/global-search.js';
import {storageFixture} from './action-adapter.js';

test('real isolated search index: bilingual grounding, boundaries, incremental reads, stale context', async () => {
  const fixture = await storageFixture();
  try {
    const text = '---\n' + 'category: metadata\n'.repeat(150) + '---\n# 重复标题\n\n' + 'intro\n'.repeat(400) + '- 延迟 latency 混合词\n| metric | value |\n| p99 | 20 |\n[link](https://example.com)';
    for (const dir of ['Archive', 'Current', '.hidden', 'Credentials']) { await mkdir(join(fixture.root, dir)); await writeFile(join(fixture.root, dir, 'note.md'), text); }
    await symlink(join(fixture.root, 'Current'), join(fixture.root, 'linked'));
    let reads = 0;
    const service = new NoteSearch(async (cmd, args) => {
      if (cmd === 'read') { reads++; return {text: await readFile(join(fixture.root, args.path), 'utf8')}; }
      return fixture.adapter(cmd, args);
    });
    await service.open(); await service.sync(); assert.equal(reads, 3);
    for (const query of ['延迟', 'LATENCY', 'latency 混合词', '重复标题']) {
      const page = await service.query(query); assert.equal(page.notes.length, 2); assert.equal(page.hasMore, false);
      assert.ok(page.notes.every(note => note.passage.includes(query === 'LATENCY' ? 'latency' : query)));
    }
    assert.equal((await service.query('not present')).notes.length, 0);
    const note = (await service.query('latency')).notes[0];
    assert.ok(note.passage.length <= 900); assert.ok(!note.passage.includes('category:'));
    const context = await service.context(note, 'latency'); assert.ok(text.includes(context)); assert.ok(context.includes('| p99 | 20 |'));
    const before = reads; await service.sync(); await service.query('latency'); assert.equal(reads, before);
    await writeFile(join(fixture.root, note.path), '# Changed'); await assert.rejects(service.context(note, 'latency'), /改变/);
    assert.ok(!fixture.calls.some(call => ['actionWrite', 'save', 'create'].includes(call.cmd)));
    const alternate = await storageFixture();
    try { const workspace = await alternate.adapter('workspace'); await assert.rejects(fixture.adapter('referenceSearch', {workspaceId: workspace.workspaceId, search: 'latency'}), /Workspace/); } finally { await alternate.close(); }
  } finally { await fixture.close(); }
});

test('scoped real formal indexes: stored fields, typed identities, bounded pages and read-only refresh', async () => {
  const {WorkspaceSearch} = await import('../web/global-search.js');
  const {ActionRepository} = await import('../web/actions.js');
  const {InitiativeRepository} = await import('../web/initiatives.js');
  const fixture = await storageFixture(), second = await storageFixture();
  try {
    const actions = new ActionRepository(fixture.adapter), initiatives = new InitiativeRepository(fixture.adapter);
    await actions.open(); await initiatives.open();
    const initiative = (await initiatives.save({status:'active', description:'Stored initiative', title: 'latency 同名', goal: 'latency 目标', progress: 'latency 已记录进展'})).record;
    const action = (await actions.save({description: 'latency 同名', waitingOn: 'latency 等待答复', initiativeId: initiative.entityId})).record;
    await actions.save({description: 'unrelated', waitingOn: 'secret waiting'});
    for (let i = 0; i < 24; i++) await actions.save({description: `latency ${i}`});
    await mkdir(join(fixture.root, 'Archive'));
    await writeFile(join(fixture.root, 'Archive/history.md'), '# latency 同名\n\nHistorical latency text\n- [ ] checkbox latency');
    const service = new WorkspaceSearch(async (cmd, args) => cmd === 'read' ? {text: await readFile(join(fixture.root, args.path), 'utf8')} : fixture.adapter(cmd, args));
    await service.open();
    const start = fixture.calls.length; await service.sync();
    const notes = await service.query('latency', 0, 'note'); assert.equal(notes.notes.length, 1); assert.equal(notes.notes[0].type, 'note');
    const initiativePage = await service.query('latency', 0, 'initiative'); assert.equal(initiativePage.notes.length, 3); assert.ok(initiativePage.notes.every(r=>r.entityId === initiative.entityId));
    const actionPage = await service.query('latency', 0, 'action'); assert.equal(actionPage.notes.length, 20); assert.equal(actionPage.hasMore, true);
    const all = [...(await service.query('latency')).notes, ...(await service.query('latency', 20)).notes];
    assert.equal(all.length, 30); assert.equal(new Set(all.map(r=>r.identity)).size, all.length);
    assert.deepEqual(new Set(all.map(r=>r.type)), new Set(['note','action','initiative']));
    for (const result of all.filter(r=>r.entityId === action.entityId || r.entityId === initiative.entityId)) {
      const context = await service.context(result, 'latency'); assert.ok(context.includes(result.passage)); assert.ok(!context.includes('entityId'));
    }
    assert.ok(!fixture.calls.slice(start).some(c=>['actionWrite','save','create'].includes(c.cmd)));
    await actions.save({...action, description: 'Changed'}, action);
    await assert.rejects(service.context(all.find(r=>r.entityId===action.entityId), 'latency'), /changed/i);
    const foreign = await second.adapter('workspace'); await assert.rejects(service.context({...notes.notes[0], workspaceId:foreign.workspaceId}, 'latency'), /Workspace/);
    await fixture.removeIndex(); await service.sync();
    assert.ok((await service.query('latency',0,'initiative')).notes.length);
    service.reset(); assert.equal(service.repositories, null);
  } finally { await fixture.close(); await second.close(); }
});

test('bounded prefix merge uses native ordering across more than fifty mixed-case note paths', async () => {
  const {WorkspaceSearch} = await import('../web/global-search.js');
  const fixture = await storageFixture();
  try {
    const paths = Array.from({length: 80}, (_, i) => `${i % 2 ? 'a' : 'Z'}-${i}.md`);
    for (const path of paths) await writeFile(join(fixture.root, path), '# pagination overlap\n\nOriginal passage');
    const service = new WorkspaceSearch(async (cmd, args) => cmd === 'read' ? {text:await readFile(join(fixture.root,args.path),'utf8')} : fixture.adapter(cmd,args));
    await service.open(); await service.sync();
    const returned = [];
    for (let offset=0; offset<80; offset+=20) returned.push(...(await service.query('pagination', offset, 'note')).notes.map(row=>row.path));
    assert.deepEqual(returned, paths.sort()); assert.equal(new Set(returned).size, 80);
    for (const [i,path] of paths.entries()) await writeFile(join(fixture.root,path), i < 50 ? '# é title\n\noriginal' : '# É title\n\né original');
    await service.sync(); const accented=[];
    for(let offset=0;offset<80;offset+=20) accented.push(...(await service.query('é',offset,'note')).notes.map(row=>row.identity));
    assert.equal(new Set(accented).size,80);
  } finally { await fixture.close(); }
});

test('distant note passages stay independently selectable and formal title expansion includes stored context', async () => {
  const {WorkspaceSearch} = await import('../web/global-search.js');
  const {InitiativeRepository} = await import('../web/initiatives.js');
  const fixture = await storageFixture();
  try {
    const text = '# Two passages\n\nlatency first passage\n' + 'unrelated filler\n'.repeat(150) + '\nlatency second passage';
    await writeFile(join(fixture.root,'long.md'),text);
    const initiatives = new InitiativeRepository(fixture.adapter); await initiatives.open();
    await initiatives.save({status:'active',description:'Stored initiative',title:'latency title',goal:'Original goal',progress:'Original progress'});
    const service = new WorkspaceSearch(async(cmd,args)=>cmd==='read'?{text:await readFile(join(fixture.root,args.path),'utf8')}:fixture.adapter(cmd,args));
    await service.open();await service.sync();
    const notes=(await service.query('latency',0,'note')).notes;
    assert.equal(notes.length,2);assert.notEqual(notes[0].identity,notes[1].identity);
    assert.ok((await service.context(notes[1],'latency')).includes('second passage'));
    const record=(await service.query('latency',0,'initiative')).notes[0];
    assert.equal(await service.context(record,'latency'),'latency title\n\nOriginal goal\n\nOriginal progress');
  } finally {await fixture.close();}
});

test('cached summary upgrade keeps typed passage offsets and expanded context aligned', async () => {
  const {WorkspaceSearch} = await import('../web/global-search.js');
  const {referenceRecord} = await import('../web/library.js');
  const fixture = await storageFixture();
  try {
    const bodies = [
      '\uFEFF---\n' + 'category: metadata\n'.repeat(150) + '---\n',
      '---\r\n' + 'category: metadata\r\n'.repeat(150) + '...\r\n',
      '---\n---\n',
    ].map(header => header + '# Source\n\n' + 'intro\n'.repeat(300) + 'needle first source passage\n' + 'intervening prose\n'.repeat(150) + 'needle second source passage\n');
    for (const [i, text] of bodies.entries()) await writeFile(join(fixture.root, `source-${i}.md`), text);
    let reads = 0;
    const service = new WorkspaceSearch(async (cmd, args) => {
      if (cmd === 'read') { reads++; return {text: await readFile(join(fixture.root, args.path), 'utf8')}; }
      return fixture.adapter(cmd, args);
    });
    await service.open();
    // Simulate cached records from main before the summary normalization upgrade.
    const metadata = await fixture.adapter('metadata', {workspaceId:service.workspaceId});
    for (const note of metadata.notes) {
      const text = await readFile(join(fixture.root, note.path), 'utf8');
      const record = referenceRecord(note, text); delete record.summaryVersion;
      await service.call('referencePut', {record, search: `${record.title}\n${text}`});
    }
    await service.sync(); assert.equal(reads, metadata.notes.length);
    assert.ok((await service.call('referenceInventory')).notes.every(n=>n.summaryVersion===1 && n.searchVersion===1));
    const results = (await service.query('needle', 0, 'note')).notes;
    assert.equal(results.length, 6); assert.equal(new Set(results.map(n=>n.identity)).size, 6);
    for (const result of results) {
      assert.equal(result.type, 'note');
      const context = await service.context(result, 'needle');
      const selected = result.passage.includes('needle second source passage') ? 'needle second source passage' : 'needle first source passage';
      assert.ok(context.includes(selected), 'expanded context must contain the selected source occurrence');
      assert.ok(context.includes('needle')); assert.ok(!context.includes('category: metadata'));
      assert.equal(await readFile(join(fixture.root, result.path), 'utf8'), bodies[Number(result.path.match(/source-(\d)/)[1])]);
    }
    const before = reads; await service.sync(); await service.query('needle', 0, 'note'); assert.equal(reads, before);
    assert.ok(!fixture.calls.some(call=>['actionWrite','save','create'].includes(call.cmd)));
  } finally { await fixture.close(); }
});
