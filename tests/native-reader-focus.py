#!/usr/bin/env python3
"""Issue 82 isolated native reader journey, with external OS input receipts.

Reuse the issue81 host diagnostics as literal test instrumentation without
executing its unrelated browse journey. DOM setup is always separate from input.
"""
import ast, hashlib, importlib.util, inspect, json, os, shutil, subprocess, time, uuid
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = Path('build/issue82-native').resolve(); m.APP = m.OUT/'Reader82.app'
m.OUT.mkdir(parents=True, exist_ok=True)
for name in ['Sync','Private']:
    if (m.OUT/name).exists(): shutil.rmtree(m.OUT/name)
    (m.OUT/name).mkdir()
original = '# 原文 Chinese English\n\n## 可以复制的中文 English\n\n[[second|阅读另一份很长的中文资料与 English]]\n\n- [ ] 保留复选框\n\n' + '阅读长段落 Chinese English。\n\n'*100
(m.OUT/'Sync/reference.md').write_text(original)
(m.OUT/'Sync/second.md').write_text('# 第二份资料\n\n[[reference|返回原文]]')
# Literal-only loading avoids running the issue81 probe or launching another host.
constants = {}
for node in ast.parse(Path('tests/native-browse-focus.py').read_text()).body:
    if isinstance(node, ast.Assign) and isinstance(node.targets[0],ast.Name) and node.targets[0].id in ['EXTRA','ROUTE_RECORDER']:
        constants[node.targets[0].id] = ast.literal_eval(node.value)
# Preserve every original pasteboard item/type in host memory; never export it.
constants['ROUTE_RECORDER'] += "\nvar readerClipboard:[[String:Data]] = []\n"
constants['EXTRA'] = constants['EXTRA'].replace('"CmdOrCtrl+A":0', '"CmdOrCtrl+A":0,"CmdOrCtrl+C":8').replace('"CmdOrCtrl+A":"a"', '"CmdOrCtrl+A":"a","CmdOrCtrl+C":"c"').replace('key == "CmdOrCtrl+A" ? .command', 'key.hasPrefix("CmdOrCtrl+") ? .command')
constants['EXTRA'] = r'''if script == "__clipboardSave" {
 readerClipboard = (NSPasteboard.general.pasteboardItems ?? []).map { item in Dictionary(uniqueKeysWithValues:item.types.compactMap { type in item.data(forType:type).map { (type.rawValue,$0) } }) }
 try? JSONSerialization.data(withJSONObject:["ok":true]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return
}
if script == "__clipboardRestore" {
 let items = readerClipboard.map { saved -> NSPasteboardItem in let item=NSPasteboardItem();for (type,data) in saved { item.setData(data,forType:NSPasteboard.PasteboardType(type)) };return item }
 NSPasteboard.general.clearContents();NSPasteboard.general.writeObjects(items)
 let restored = (NSPasteboard.general.pasteboardItems ?? []).map { item in Dictionary(uniqueKeysWithValues:item.types.compactMap { type in item.data(forType:type).map { (type.rawValue,$0) } }) }
 try? JSONSerialization.data(withJSONObject:["ok":true,"value":restored == readerClipboard]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return
}
if script == "__clipboardText" { try? JSONSerialization.data(withJSONObject:["ok":true,"value":NSPasteboard.general.string(forType:.string) ?? ""]).write(to:reviewProbe.directory.appendingPathComponent("response.json"));return }
''' + constants['EXTRA']
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7','dev.localnotes.validation.issue82'+uuid.uuid4().hex[:8])
source = source.replace("generated=OUT/'main.swift';generated.write_text(source)", "generated=OUT/'main.swift';generated.write_text(source.replace('let wrapped =', EXTRA+'let wrapped =').replace('let reviewProbe = ReviewProbe()', ROUTE_RECORDER+'\\nlet reviewProbe = ReviewProbe()'))")
m.__dict__.update(constants); exec(source,m.__dict__); m.build()
sender = m.OUT/'native-input'
subprocess.run(['swiftc','tests/native-browse-input.swift','-o',str(sender)],check=True)
assets = {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').iterdir() if p.is_file()}
for name,digest in assets.items(): assert hashlib.sha256((m.APP/'Contents/Resources/web'/name).read_bytes()).hexdigest()==digest
if os.environ.get('NATIVE_BUILD_ONLY'): print('PASS build only; no GUI host or input'); raise SystemExit(0)
out=Path(os.environ.get('NATIVE_EVIDENCE_DIR','docs/validation/issue82/native'));out.mkdir(parents=True,exist_ok=True)
c,w=m.command,m.wait
log=[]
clipboardSaved=False
clipboardRestored=False
process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','w'),stderr=subprocess.STDOUT)
def key(value):
    host=c('__host'); assert host['active'] and host['key'] and host['visible'] and host['firstResponderIsWeb']
    before=c('__route');start=c('return inputEvents.length')
    c('window.expectedKeyTarget=document.activeElement')
    payload=c('__events:'+json.dumps({'key':value}))
    result=subprocess.run([str(sender),str(process.pid),str(host['windowNumber']),'post'],input=json.dumps(payload),capture_output=True,text=True)
    time.sleep(.25); events=c('return inputEvents.slice('+str(start)+')');after=c('__route')
    log.append({'key':value,'host':host,'sender':result.stdout,'events':events,'route':after})
    assert result.returncode==0 and any(e['trusted'] and e['type']=='keydown' and e['expected'] for e in events)
    receipt=json.loads(result.stdout)
    assert after['tapEnabled'] and all(any(e['type']==kind and e['marker']==810053 and e['sourcePID']==receipt['senderPID'] for e in after['quartz'][len(before['quartz']):]) for kind in [10,11])
    assert all(e['window']==host['windowNumber'] for e in after['cocoa'][len(before['cocoa']):])
def click(selector):
    c('window.target=document.querySelector('+json.dumps(selector)+');target.scrollIntoView({block:"nearest"})')
    point=c('const r=target.getBoundingClientRect();if(!target.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)))throw Error("Occluded");return {x:r.x+r.width/2,y:r.y+r.height/2}')
    host=c('__host');assert host['active'] and host['key'] and host['firstResponderIsWeb']
    before=c('__route');start=c('return inputEvents.length')
    mapping=c('__point:'+str(point['x'])+','+str(point['y']))
    payload=c('__events:'+json.dumps({'action':'click','x':mapping['windowX'],'y':mapping['windowY']}))
    assert all(e['window']==host['windowNumber'] and e['resolvedWindow'] and abs(e['x']-mapping['windowX'])<=1 and abs(e['y']-mapping['windowY'])<=1 for e in payload['roundtrip'])
    result=subprocess.run([str(sender),str(process.pid),str(host['windowNumber']),'post'],input=json.dumps(payload),capture_output=True,text=True)
    time.sleep(.3);events=c('return inputEvents.slice('+str(start)+')');after=c('__route')
    log.append({'click':selector,'host':host,'sender':result.stdout,'events':events,'route':after})
    assert result.returncode==0 and all(any(e['trusted'] and e['type']==kind and e['expected'] for e in events) for kind in ['pointerdown','click'])
    receipt=json.loads(result.stdout)
    assert after['tapEnabled'] and all(any(e['type']==kind and e['marker']==810053 and e['sourcePID']==receipt['senderPID'] for e in after['quartz'][len(before['quartz']):]) for kind in [1,2])
    assert all(e['window']==host['windowNumber'] for e in after['cocoa'][len(before['cocoa']):])
def snapshot(name):
    c('__snapshot');shutil.copy(m.OUT/'native.png',out/(name+'.png'))
    log.append({'state':name,'focus':c('const n=document.activeElement;return {id:n.id,tag:n.tagName,outline:getComputedStyle(n).outline,visible:n.matches(":focus-visible"),selection:getSelection().toString(),documentFocus:document.hasFocus()}')})
try:
    w("!!document.querySelector('.home-tools')");c('__focus');time.sleep(.5)
    c('__clipboardSave');clipboardSaved=True
    c("window.inputEvents=[];for(const type of ['pointerdown','click','keydown'])document.addEventListener(type,e=>inputEvents.push({type,key:e.key,trusted:e.isTrusted,expected:type==='keydown'?e.target===window.expectedKeyTarget:!!window.target?.contains(e.target),target:e.target.id||e.target.tagName}),true)")
    click('[data-view=notes]');w("!!document.querySelector('[data-path=\"reference.md\"]')")
    click('[data-path="reference.md"]');w("!document.querySelector('#reading').hidden")
    click('.wiki-link');w("document.querySelector('#file-path').textContent==='second.md'")
    click('#back');w("document.querySelector('#file-path').textContent==='reference.md'")
    assert c('return document.activeElement.matches(".wiki-link") && !document.activeElement.matches(":focus-visible")');snapshot('pointer-return')
    key('Tab');key('Shift+Tab');assert c('return document.activeElement.matches(".wiki-link:focus-visible")');snapshot('keyboard-link')
    key('Return');w("document.querySelector('#file-path').textContent==='second.md'")
    # Positioning Back is setup; genuine Tab/Shift+Tab precedes keyboard activation.
    c("document.querySelector('#back').focus()");key('Tab');key('Shift+Tab');key('Return');w("document.querySelector('#file-path').textContent==='reference.md'")
    assert c('return document.activeElement.matches(".wiki-link:focus-visible")')
    c("const n=document.querySelector('#reading h2');n.tabIndex=-1;n.focus();const r=document.createRange();r.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(r)")
    assert c('return getComputedStyle(document.activeElement).outlineStyle')=='none';snapshot('selected-location')
    key('CmdOrCtrl+C');assert c('__clipboardText')=='可以复制的中文 English'
    clipboardRestored=c('__clipboardRestore');assert clipboardRestored
    assert (m.OUT/'Sync/reference.md').read_text()==original
    click('#mode');assert c('return document.activeElement.id')=='body';snapshot('editing-field')
    key('CmdOrCtrl+A');assert c("return document.querySelector('#body').selectionEnd > document.querySelector('#body').selectionStart")
    snapshot('selected-editor');click('#mode');assert (m.OUT/'Sync/reference.md').read_text()==original
    click('#back');w("document.activeElement.dataset.path==='reference.md'")
    snapshot('library-return')
    report={'workingTreeDirty':bool(subprocess.check_output(['git','status','--porcelain'],text=True).strip()),'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'pid':process.pid,'assets':assets,'harnessSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'sourceSHA256':hashlib.sha256(original.encode()).hexdigest(),'readOnlyUnchanged':True,'input':'External CGEvent.postToPid; DOM setup and Range selection identified separately','unrun':['physical keyboard','native IME composition'], 'events':log}
    (out/'report.json').write_text(json.dumps(report,indent=2));print('PASS native reader pointer/keyboard/wiki/return/selection; source preserved')
finally:
    if clipboardSaved and not clipboardRestored: clipboardRestored=c('__clipboardRestore')
    process.terminate();process.wait(timeout=10)
    (out/'cleanup.json').write_text(json.dumps({'pid':process.pid,'exited':process.poll() is not None,'sourcePreserved':(m.OUT/'Sync/reference.md').read_text()==original,'clipboardRestoredExactItemBytes':clipboardRestored,'inputSource':'untouched','events':log},indent=2))
