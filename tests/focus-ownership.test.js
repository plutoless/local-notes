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
