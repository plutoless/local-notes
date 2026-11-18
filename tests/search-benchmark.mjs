import {NoteSearch} from '../web/global-search.js';
import {storageFixture} from './action-adapter.js';
import {writeFile, readFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const fixture = await storageFixture();
try {
  const count = Number(process.env.SEARCH_CORPUS_NOTES || 10000);
  const text = '# Controlled 中文 reference\n\n' + 'Context and reference content.\n'.repeat(150) + '\n- latency 延迟 p99\n| metric | value |\n| p99 | 20 |\n';
  for (let i=0;i<count;i++) await writeFile(join(fixture.root, `${String(i).padStart(5,'0')}.md`),text);
  let reads=0;
  const service = new NoteSearch(async(cmd,args)=>{ if(cmd==='read'){reads++;return {text:await readFile(join(fixture.root,args.path),'utf8')};}return fixture.adapter(cmd,args); });
  await service.open(); const start=performance.now(); const indexing=service.sync();
  let ticks=0,maxTick=0,last=performance.now(); const timer=setInterval(()=>{const now=performance.now();maxTick=Math.max(maxTick,now-last);last=now;ticks++;},10);
  await indexing; const cold=performance.now()-start; clearInterval(timer);
  const coldReads=reads; const queries=[];
  for(let i=0;i<6;i++){const begin=performance.now();const result=await service.query('latency');queries.push(performance.now()-begin);assert.equal(result.notes.length,20);assert.equal(result.hasMore,true);}
  const warmStart=performance.now();await service.sync();const warm=performance.now()-warmStart;
  assert.equal(reads,coldReads);
  const result={head:process.env.REVIEW_HEAD||'working tree',hardware:os.cpus()[0].model,memoryGiB:os.totalmem()/2**30,platform:os.platform(),count:count+1,bytes:count*Buffer.byteLength(text),index:'fresh private SQLite then cached; actual isolated files; no private notes inspected',coldIndexMs:cold,warmReconcileMs:warm,queryMs:queries,coldReads,warmReads:reads-coldReads,eventLoopTicks:ticks,maxTickMs:maxTick};
  await mkdir('build/issue58',{recursive:true});await writeFile('build/issue58/benchmark.json',JSON.stringify(result,null,2));console.log(result);
} finally { await fixture.close(); }
