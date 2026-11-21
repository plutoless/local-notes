import test from 'node:test';
import assert from 'node:assert/strict';
const previousWindow=globalThis.window;globalThis.window={};
const {LibraryScreen}=await import('../build/web/library-screen.js');
globalThis.window=previousWindow;

test('changing collection invalidates a pending query before the next route render starts',async()=>{
  const previous=globalThis.document;
  const nodes=new Map();
  const node=()=>({textContent:'destination',scrollTop:0,getClientRects:()=>[],closest:()=>null,querySelectorAll:()=>[],dataset:{}});
  globalThis.document={activeElement:node(),querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}};
  try {
    for(const rejected of [false,true]) {
      let favorites=false;
      let resolve,reject;const response=new Promise((yes,no)=>{resolve=yes;reject=no;});
      const screen=Object.create(LibraryScreen.prototype),published=[];
      Object.assign(screen,{library:{generation:1,revision:0,query:()=>response},sequence:0,offset:0,order:'path',archives:'include',directory:'*',search:'',topic:'',isActive:()=>true,favoritePaths:()=>favorites?[]:undefined,controls:()=>published.push('controls'),ui:{rows:()=>published.push('rows')}});
      const older=screen.render();
      screen.switchCollection('favorites');favorites=true;
      if(rejected)reject(Error('old Library failure'));else resolve({notes:[],total:66,hasMore:false});
      await older;
      assert.deepEqual(published,[],'a late Library result/failure cannot publish in Favorites');
      assert.notEqual(screen.failed,true);
    }
  }finally{globalThis.document=previous;}
});
