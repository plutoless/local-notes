import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[];
const out=process.env.PREVIEW_EVIDENCE || 'build/validation/122/current/selected';
await mkdir(out,{recursive:true});
try{for(const width of [1280,393]){
 const page=await browser.newPage({viewport:{width,height:852}});
 await page.goto(`http://127.0.0.1:8122/docs/design/issue122/`);
 await page.getByRole('button',{name:'笔记信息',exact:true}).waitFor();
 for(const stage of ['reading','context','form','search']){
  if(stage==='context')await page.getByRole('button',{name:'笔记信息',exact:true}).click();
  if(stage==='form'){await page.getByRole('button',{name:'新建行动',exact:true}).click();await page.getByRole('dialog').waitFor();}
  if(stage==='search'){await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByRole('button',{name:'搜索 ⌘K',exact:true}).click();}

  const audit=await page.evaluate(()=>{
   const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number),lum=c=>{const v=c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];},ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const modal=document.querySelector('dialog[open]');
   const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&(!modal||modal.contains(n));
   const background=n=>{for(let p=n;p;p=p.parentElement){const c=rgb(getComputedStyle(p).backgroundColor);if(c.length===3||c[3]===1)return c;}return [255,255,255];};
   const text=[...document.querySelectorAll('*')].filter(visible).filter(n=>[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())).map(n=>({tag:n.tagName,text:n.textContent.slice(0,24),ratio:ratio(rgb(getComputedStyle(n).color),background(n))}));
   const targets=[...document.querySelectorAll('button,a,input,textarea,select')].filter(visible);
   const overlaps=[];for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
    const a=targets[i].getBoundingClientRect(),b=targets[j].getBoundingClientRect();
    if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([targets[i].textContent,targets[j].textContent]);
   }
   return {minimumText:Math.min(...text.map(t=>t.ratio)),lowText:text.filter(t=>t.ratio<4.5),focusOnSurfaces:Math.min(...['#ffffff','#f7f7f5','#eeeee9','#e8e8e3','#e7edf5'].map(s=>ratio([36,92,172],s.slice(1).match(/../g).map(x=>parseInt(x,16))))),overlaps,smallTargets:targets.filter(n=>n.getBoundingClientRect().height<44).map(n=>n.tagName)};
  });
  assert.deepEqual(audit.lowText,[]);assert.ok(audit.focusOnSurfaces>=3);assert.deepEqual(audit.overlaps,[]);assert.deepEqual(audit.smallTargets,[]);
  results.push({width,stage,...audit});
 }
 await page.close();
}await writeFile(`${out}/a11y-results.json`,JSON.stringify(results,null,2));console.log('Selected preview computed text/focus contrast, nonoverlapping targets, minimum height passed.');}finally{await browser.close();}
