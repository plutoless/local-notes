#!/usr/bin/env python3
"""Issue 70: real packaged assets and storage in an isolated Cocoa/WKWebView host."""
import hashlib, importlib.util, inspect, json, os, platform, shutil, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
evidence = Path(os.environ.get('LIBRARY_EVIDENCE_DIR', 'docs/validation/issue70')); evidence.mkdir(parents=True, exist_ok=True)
m.OUT = Path.cwd() / 'build/native-issue70'; m.APP = m.OUT / 'Classification70.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True)
root = m.OUT / 'Sync'; root.mkdir(); (m.OUT / 'Private').mkdir()
cases = [dict(path='reader.md',text='# 合成阅读 Reader\r\n\r\n## 可复制原文 English\r\n\r\n| 名称 | Code | 三 | 四 | 五 |\r\n| --- | --- | --- | --- | --- |\r\n| 长中文 | `a|b` | 资料 | 资料 | 资料 |\r\n\r\n- [ ] 原文复选框\r\n\r\n' + ('中文 English 长段落。'*50+'\r\n\r\n')*40)]
for note in cases:
    path = root / note['path']; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(note['text']); os.utime(path, (1000, 1000))
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue70')
exec(source, m.__dict__); m.build()
p = m.OUT / 'main.swift'
p.write_text(p.read_text().replace('import Cocoa', 'import Cocoa\nvar libraryBodyReads = 0', 1).replace('case "read":return', 'case "read":libraryBodyReads += 1;return').replace('let wrapped =', '''if script == "__reads" {
 try? JSONSerialization.data(withJSONObject: ["ok": true, "value": libraryBodyReads]).write(to: reviewProbe.directory.appendingPathComponent("response.json")); return
}
if script.hasPrefix("__size:") {
 let parts = script.components(separatedBy: ":")
 self?.window.minSize = NSSize(width: 1, height: 1)
 self?.window.setContentSize(NSSize(width: Double(parts[1])!, height: Double(parts[2])!))
 try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json")); return
}
if script == "__snapshot" {
 self?.web.takeSnapshot(with: nil) { image, error in
  if let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) { try? png.write(to: reviewProbe.directory.appendingPathComponent("snapshot.png")) }
  try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
 }; return
}
let wrapped ='''))
subprocess.run(['swiftc','-module-cache-path','build/swift-cache',str(p),'mac/AIService.swift','mac/ActionStorage.swift','mac/ActionIndex.swift','mac/ReferenceIndex.swift','mac/ReferenceScan.swift','-lsqlite3','-framework','Cocoa','-framework','WebKit','-o',str(m.APP/'Contents/MacOS/LocalNotes')],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)],check=True)
assets = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').iterdir() if p.is_file()}
for name, digest in assets.items():
    assert hashlib.sha256((m.APP/'Contents/Resources/web'/name).read_bytes()).hexdigest() == digest
helper = m.OUT / 'input-source'
subprocess.run(['swiftc','-module-cache-path','build/swift-cache','tests/InputSourceHarness.swift','-o',str(helper)],check=True)
initial = subprocess.check_output([str(helper)],text=True).splitlines()[0]
c,w = m.command,m.wait
process = subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')], env={**os.environ, 'LOCAL_NOTES_TEST_ROOT':str(root), 'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'), 'REVIEW_PROBE':str(m.OUT)}, stdout=open(m.OUT/'app.log','a'), stderr=subprocess.STDOUT)

def key(code, shift=False):
    subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to set frontmost to true','-e',f'tell application "System Events" to key code {code}'+(' using shift down' if shift else '')],check=True)
    time.sleep(.15)
try:
    w("!!document.querySelector('#items .home-tools')")
    c("document.querySelector('nav [data-view=notes]').click()")
    w("document.querySelectorAll('#items .card').length===1")
    c("document.querySelector('#items .card').click()")
    w("!document.querySelector('#reading').hidden")
    c("document.querySelector('#new').click()")
    w("!!document.querySelector('#capture-title')")
    c("document.querySelector('#capture-title').value='合成捕获';document.querySelector('#capture-body').value='离线捕获正文\\n\\n'+('长段落。'.repeat(100)+'\\n\\n').repeat(30);document.querySelector('#capture-title').dispatchEvent(new Event('input'));document.querySelector('#capture-body').dispatchEvent(new Event('input'));document.querySelector('#note-task-drawer .primary').click()")
    w("!document.querySelector('#capture-return').hidden")
    target=c("return document.querySelector('#file-path').textContent")
    assert (root/target).exists()
    assert not list((root/'LocalNotesData/topics').glob('*.json'))
    c("document.querySelector('#mode').click()")
    w("!document.querySelector('#reading').hidden")
    original = hashlib.sha256((root/target).read_bytes()).hexdigest()
    c("const {native}=await import('./bridge.js');const {InitiativeRepository}=await import('./initiatives.js');const r=new InitiativeRepository(native);await r.open();for(const title of ['合成目标甲','合成目标乙']) await r.save({title,goal:'离线目标',progress:'',status:'active'})")
    c("document.querySelector('#workspace-detail').scrollTop=220;window.beforeScroll=document.querySelector('#workspace-detail').scrollTop;document.querySelector('#note-info-open').click()")
    w("document.querySelector('#note-info-drawer').open")
    c("document.querySelector('#note-create-topic').click()")
    w("document.activeElement.id==='topic-name'")
    assert c("return document.querySelectorAll('dialog[open]').length") == 1
    # Trusted native Tab cycles stay inside the one short task.
    c("window.trustedKeys=[];document.addEventListener('keydown',e=>{if(e.isTrusted)trustedKeys.push({key:e.key,target:e.target.id})},true)")
    for _ in range(5):
        key(48)
        assert c("return document.querySelector('#topic-drawer').contains(document.activeElement)")
    for _ in range(5):
        key(48,True)
        assert c("return document.querySelector('#topic-drawer').contains(document.activeElement)")
    c("document.querySelector('#topic-name').value='原生合成主题';document.querySelector('#topic-name').dispatchEvent(new Event('input'));document.querySelector('#topic-form').requestSubmit()")
    w("document.querySelector('#note-info-drawer').open")
    assert c("return [...document.querySelectorAll('#note-topics input')].every(n=>n.checked)")
    for index in [0,1]:
        c(f"document.querySelectorAll('#note-initiatives input')[{index}].click()")
        w("!document.querySelector('#note-initiatives').inert")
        assert c("return document.activeElement.parentElement.textContent") == ['合成目标甲','合成目标乙'][index]
    assert c("return [...document.querySelectorAll('#note-initiatives input')].every(n=>n.checked)")
    for width,height in [(1180,800),(393,852),(800,400)]:
        c(f'__size:{width}:{height}');time.sleep(.2)
        assert c('return document.documentElement.scrollWidth<=innerWidth')
        c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/f'native-classification-{width}-{height}.png')
    c('__size:1180:800')
    key(53)
    w("!document.querySelector('#note-info-drawer').open")
    assert c("return document.activeElement.id") == 'note-info-open'
    assert c("return document.querySelector('#workspace-detail').scrollTop===window.beforeScroll")
    assert hashlib.sha256((root/target).read_bytes()).hexdigest()==original
    records = list((root/'LocalNotesData/topics').glob('*.json'))
    assert len(records)==1
    topic=json.loads(records[0].read_text());assert topic['sources'][0]['path']==target
    owners=[json.loads(p.read_text()) for p in (root/'LocalNotesData/initiatives').glob('*.json')]
    assert len(owners)==2 and all(o['sources'][0]['path']==target for o in owners)
    keys=c('return window.trustedKeys');assert len(keys)>=11
    # OS window close on the clean note; this is not a dirty-close claim.
    subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to click button 1 of window 1'],check=True)
    time.sleep(.5)
    report=dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),assets=assets,sourceHash=original,unchanged=True,associationsReadback=True,trustedKeys=keys,cleanWindowClose=True,input='DOM-driven Cocoa/WKWebView plus OS-injected Tab, Shift+Tab, Escape and native window close; no physical keyboard')
finally:
    if process.poll() is None: process.terminate();process.wait(timeout=10)
    subprocess.run([str(helper),initial],check=True)
    actual=subprocess.check_output([str(helper)],text=True).splitlines()[0]
    assert actual==initial
    if 'report' in globals():
        report.update(initialInputSource=initial,restoredInputSource=actual,ownedAppStopped=process.poll() is not None)
        (evidence/'native-report.json').write_text(json.dumps(report,indent=2))
print('PASS native classification, immutable readback, trusted focus containment/restoration, narrow layouts and clean close')
