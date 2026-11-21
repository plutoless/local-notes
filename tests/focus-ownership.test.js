import test from 'node:test';
import assert from 'node:assert/strict';
// Exercise the shipped controller, including its generated presentation import.
import {FocusScreen} from '../build/web/focus-screen.js';

test('a released or replaced home cannot reclaim the visible legacy list after a delayed query', async()=>{
  const previous=globalThis.document;
  const nodes=new Map();
  const node=()=>({hidden:false,textContent:'legacy page',classList:{add(){},remove(){}},dataset:{}});
  globalThis.document={activeElement:node(),querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}};
  try {
    for(const transition of ['release','workspace']) {
      let resolve; const pending=new Promise(r=>resolve=r);
      const actions={repository:{query:()=>pending}};
      const screen=new FocusScreen(actions,{repository:{query:()=>pending}},()=>{},()=>{});
      screen.active=true;
      const result=screen.show();
      if(transition==='release')screen.release(); else actions.repository={query:()=>pending};
      const list=globalThis.document.querySelector('#items');list.textContent='legacy page';
      resolve({actions:[],hasMore:false});
      await result;
      assert.equal(list.textContent,'legacy page');
    }
  }finally{globalThis.document=previous;}
});

test('a rejected submitted home operation settles without notifying its replacement owner',async()=>{
  for(const transition of ['release','workspace','current']) {
    const notices=[];const actions={repository:{}};
    const screen=new FocusScreen(actions,{},()=>{},message=>notices.push(message));
    let reject;const pending=new Promise((_,fail)=>reject=fail);
    const result=screen.run(()=>pending);
    if(transition==='release')screen.release();
    if(transition==='workspace')actions.repository={};
    reject(Error('Controlled submitted write failure'));await result;
    assert.deepEqual(notices,transition==='current'?['Controlled submitted write failure']:[]);
  }
});

test('a home refresh cannot authorize focus after release while its query is pending',async()=>{
  const previous=globalThis.document;const nodes=new Map();
  globalThis.document={activeElement:{dataset:{}},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{hidden:false,classList:{add(){},remove(){}}});return nodes.get(selector);}};
  try {
    let resolve;const pending=new Promise(r=>resolve=r);
    const repository={query:()=>pending};const screen=new FocusScreen({repository},{repository},()=>{},()=>{});screen.active=true;
    const result=screen.refreshOwned(repository);screen.release();resolve({actions:[],hasMore:false});
    assert.equal(Boolean(await result),false);
  }finally{globalThis.document=previous;}
});

test('an intentional navigation handoff reports its failure only in the originating workspace',async()=>{
  for(const replaced of [false,true]) {
    const notices=[];const actions={repository:{}};
    const screen=new FocusScreen(actions,{},()=>{},message=>notices.push(message));
    let reject;const pending=new Promise((_,fail)=>reject=fail);
    const result=screen.run(()=>pending,true);screen.release();if(replaced)actions.repository={};
    reject(Error('Controlled destination failure'));await result;
    assert.deepEqual(notices,replaced?[]:['Controlled destination failure']);
  }
});
