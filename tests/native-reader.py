#!/usr/bin/env python3
"""Issue 66: real packaged assets and storage in an isolated Cocoa/WKWebView host."""
import hashlib, importlib.util, inspect, json, os, platform, shutil, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
evidence = Path(os.environ.get('LIBRARY_EVIDENCE_DIR', 'docs/validation/issue66')); evidence.mkdir(parents=True, exist_ok=True)
m.OUT = Path.cwd() / 'build/native-issue66'; m.APP = m.OUT / 'Reader66.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True)
root = m.OUT / 'Sync'; root.mkdir(); (m.OUT / 'Private').mkdir()
cases = [dict(path='reader.md',text='# 合成阅读 Reader\r\n\r\n## 可复制原文 English\r\n\r\n| 名称 | Code | 三 | 四 | 五 |\r\n| --- | --- | --- | --- | --- |\r\n| 长中文 | `a|b` | 资料 | 资料 | 资料 |\r\n\r\n- [ ] 原文复选框\r\n\r\n' + ('中文 English 长段落。'*50+'\r\n\r\n')*40)]
for note in cases:
    path = root / note['path']; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(note['text']); os.utime(path, (1000, 1000))
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue66')
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
c,w = m.command,m.wait
process = subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')], env={**os.environ, 'LOCAL_NOTES_TEST_ROOT':str(root), 'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'), 'REVIEW_PROBE':str(m.OUT)}, stdout=open(m.OUT/'app.log','a'), stderr=subprocess.STDOUT)
try:
    w("!!document.querySelector('#items .home-tools')")
    c("document.querySelector('nav [data-view=notes]').click()")
    w("document.querySelectorAll('#items .card').length===1")
    c("document.querySelector('#items .card').click()")
    w("!document.querySelector('#reading').hidden && document.activeElement.id==='mode'")
    assert c("return document.querySelector('#note-save').hidden && document.querySelector('#title').readOnly && document.querySelectorAll('#reading table').length===1 && document.querySelector('#reading input').disabled")
    original = hashlib.sha256((root/'reader.md').read_bytes()).hexdigest()
    for width,height in [(1180,800),(393,852),(800,400)]:
        c(f'__size:{width}:{height}'); time.sleep(.3)
        assert c('return document.documentElement.scrollWidth<=innerWidth')
        c("document.querySelector('.markdown-table').scrollLeft=100;document.querySelector('#workspace-detail').scrollTop=180")
        c('__snapshot'); shutil.copy(m.OUT/'snapshot.png',evidence/f'native-reader-{width}-{height}.png')
    c('__size:1180:800')
    c("document.querySelector('#reading').tabIndex=-1;document.querySelector('#reading').focus();const n=document.querySelector('#reading h2'),r=document.createRange();r.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(r)")
    assert c('return getSelection().toString()') == '可复制原文 English'
    # Use the real AppKit Copy action with the WKWebView selection.
    subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to set frontmost to true'],check=True)
    subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to keystroke "c" using command down'],check=True)
    time.sleep(.5)
    clipboard = subprocess.check_output(['pbpaste'],text=True)
    assert clipboard == '可复制原文 English',repr(clipboard)
    assert hashlib.sha256((root/'reader.md').read_bytes()).hexdigest()==original
    c("document.querySelector('#mode').click()")
    assert c("return document.activeElement.id==='body' && !document.querySelector('#body').hidden")
    c("document.querySelector('#body').value='Explicit native persisted edit';document.querySelector('#body').dispatchEvent(new Event('input'));document.querySelector('#note-save').click()")
    w("document.querySelector('#save-state').textContent==='已保存到本地'")
    assert 'Explicit native persisted edit' in (root/'reader.md').read_text()
    disk=(root/'reader.md').read_text()
    c("document.querySelector('#body').value='Discard this native edit';document.querySelector('#body').dispatchEvent(new Event('input'));document.querySelector('#back').click()")
    w("!!document.querySelector('#task-leave-decision')")
    c("[...document.querySelectorAll('#task-leave-decision button')].find(n=>n.textContent==='放弃更改并离开').click()")
    w("document.querySelector('#editor').hidden")
    assert (root/'reader.md').read_text()==disk
    report=dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),assets=assets,sourceHashBeforeReading=original,readingUnchanged=True,nativeSelection=True,osCopy=clipboard,focus=True,explicitEditPersisted=True,discardUnchanged=True,input='DOM-driven Cocoa/WKWebView plus OS-injected Command+C; no physical keyboard')
    (evidence/'native-report.json').write_text(json.dumps(report,indent=2))
    print('PASS native reader tables, source hash, focus, OS clipboard, save and discard')
finally:
    process.terminate();process.wait(timeout=10)
