import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://notes.test/**',async route=>{
    const path=new URL(route.request().url()).pathname.slice(1);
    if(!path)return route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><main></main>'});
    await route.fulfill({body:await readFile('build/web/'+path),contentType:path.endsWith('.js')?'text/javascript':'text/css'});
  });
  await page.goto('https://notes.test/');
  const result=await page.evaluate(async()=>{
    const {actionControl,noteFieldsView}=await import('/assets/react-host.js');
    const {drawer,feedback}=await import('/presentation.js');
    let finish;const submitted=new Promise(resolve=>{finish=resolve;});
    const action=actionControl('等待提交',()=>submitted);document.querySelector('main').append(action.host);
    action.control.click();const disabledDuringSubmission=action.control.disabled;
    finish();await submitted;await Promise.resolve();
    const enabledAtSettlement=!action.control.disabled;action.control.focus();
    const receiverAvailable=document.activeElement===action.control;
    const panel=drawer({id:'ports-drawer',title:'原任务',onDismiss:()=>panel.hide()});
    const fields=noteFieldsView(panel.body);fields.show([{id:'ports-input',label:'原文',value:'保留原文与选择范围'}]);
    const input=panel.body.querySelector('input');panel.open(input,action.control);input.setSelectionRange(2,6);
    panel.setTitle('修改任务标题');
    const preservedReceiver=panel.body.querySelector('input')===input&&document.activeElement===input&&input.selectionStart===2&&input.selectionEnd===6;
    panel.hide();const restored=document.activeElement===action.control;
    const receipt=document.createElement('div');document.querySelector('main').append(receipt);
    feedback(receipt,'<script>原文不是代码</script>','<img src=x onerror=alert(1)>');
    const escaped=receipt.querySelectorAll('script,img').length===0&&receipt.textContent.includes('<script>');
    receipt.replaceChildren();feedback(receipt,'重试后保存');
    const replaced=receipt.textContent==='重试后保存';
    action.dispose();
    return {disabledDuringSubmission,enabledAtSettlement,receiverAvailable,preservedReceiver,restored,escaped,replaced};
  });
  assert.deepEqual(result,{disabledDuringSubmission:true,enabledAtSettlement:true,receiverAvailable:true,preservedReceiver:true,restored:true,escaped:true,replaced:true});
  assert.deepEqual(errors,[]);console.log('PASS presentation ports: synchronous pending settlement, stable drawer field/caret across titles, opener restoration, escaped/replaced receipts');
} finally {await browser.close();}
