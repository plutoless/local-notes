import {readFile, mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
const receipts = [];
await mkdir('build/issue105', {recursive:true});
try {
  const page = await browser.newPage();
  await page.route('https://notes.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1);
    if (['presentation.js','core.js','style.css'].includes(name)) return route.fulfill({body:await readFile(new URL('../web/'+name,import.meta.url)),contentType:name.endsWith('.js')?'text/javascript':'text/css'});
    return route.fulfill({contentType:'text/html',body:`<meta charset="utf-8"><link rel="stylesheet" href="/style.css"><button id="open">编辑</button><script type="module">
      import {drawer,field,button,requestTaskLeave,taskLeavePending} from '/presentation.js';
      window.returnCallbacks=[];
      const timeout=window.setTimeout;
      window.setTimeout=(run,delay,...args)=>{
        if(run.toString().includes('origin.focus')&&run.toString().includes('task-leave-decision')){returnCallbacks.push(()=>run(...args));return 0;}
        return timeout(run,delay,...args);
      };
      const input=document.createElement('textarea');input.id='draft';input.value='保留原文与选择范围';
      const other=document.createElement('input');other.id='other';
      const editor=drawer({id:'editor',title:'编辑测试',onDismiss:()=>requestTaskLeave({label:'编辑测试',dirty:()=>true,focusOrigin:()=>editor.close.disabled?editor.close:document.activeElement})});
      editor.body.append(field('正文',input),field('其他输入',other));editor.footer.append(button('下一步',()=>{}));
      document.querySelector('#open').onclick=()=>editor.open(input);
      window.fixture={editor,pending:taskLeavePending};
    </script>`});
  });
  await page.goto('https://notes.test/');
  await page.waitForFunction(()=>Boolean(window.fixture));
  const start = async disabled => {
    await page.locator('#open').click();
    await page.locator('#draft').focus();await page.locator('#draft').evaluate(n=>n.setSelectionRange(2,6));
    if (disabled) await page.getByRole('button',{name:'关闭编辑测试',exact:true}).click();
    else await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'继续编辑',exact:true}).click();
    await page.waitForFunction(()=>!fixture.pending());
    assert.equal(await page.evaluate(()=>returnCallbacks.length),1);
  };
  const release = () => page.evaluate(()=>returnCallbacks.splice(0).forEach(run=>run()));
  const close = () => page.evaluate(()=>fixture.editor.hide());
  await start(false); await release();
  assert.deepEqual(await page.locator('#draft').evaluate(n=>[n===document.activeElement,n.selectionStart,n.selectionEnd,n.value]),[true,2,6,'保留原文与选择范围']);
  receipts.push('normal Continue preserves field and selection'); await close();
  await start(true);
  assert.equal(await page.getByRole('button',{name:'关闭编辑测试',exact:true}).isDisabled(),false);
  await release();assert.equal(await page.getByRole('button',{name:'关闭编辑测试',exact:true}).evaluate(n=>n===document.activeElement),true);
  receipts.push('async disabled dismissal returns after re-enable');await close();
  for (const intent of ['Tab','pointer','focus']) {
    await start(false);
    if(intent==='Tab')await page.keyboard.press('Tab');
    else if(intent==='pointer')await page.locator('#other').click();
    else await page.locator('#other').focus();
    assert.equal(await page.locator('#other').evaluate(n=>n===document.activeElement),true);
    await release();
    assert.equal(await page.locator('#other').evaluate(n=>n===document.activeElement),true,`stale return must not override newer ${intent}`);
    for(let i=0;i<8;i++){await page.keyboard.press(i<4?'Tab':'Shift+Tab');assert.equal(await page.locator('#editor').evaluate(n=>n.contains(document.activeElement)),true);}
    receipts.push(`newer ${intent} survives old return and both Tab directions stay contained`);await close();
  }
  console.log('PASS deferred leave focus: '+receipts.join('; '));
} finally {
  await writeFile('build/issue105/leave-focus-receipts.json',JSON.stringify(receipts,null,2));
  await browser.close();
}
