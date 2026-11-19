#!/usr/bin/env python3
"""Issue 71: real packaged assets and storage in an isolated Cocoa/WKWebView host."""
import hashlib, importlib.util, inspect, json, os, platform, re, shutil, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
evidence = Path(os.environ.get('LIBRARY_EVIDENCE_DIR', 'docs/validation/issue71/integration/organization-selection')); evidence.mkdir(parents=True, exist_ok=True)
m.OUT = Path.cwd() / 'build/native-issue71'; m.APP = m.OUT / 'Organization71.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True)
root = m.OUT / 'Sync'; root.mkdir(); (m.OUT / 'Private').mkdir()
cases = [dict(path=f'{directory}/{i:02}.md',text=f'# 合成标题 {i}\n\n{directory} needle{i} 历史计划 - [ ] 不导入\n') for directory in ['archive','current'] for i in range(55)]
for note in cases:
    path = root / note['path']; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(note['text']); os.utime(path, (1000, 1000))
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue71')
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
headBefore = subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
sourceHashes = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('mac').glob('*.swift')}
(evidence/'preflight.json').write_text(json.dumps(dict(head=headBefore,initialInputSource=initial,assets=assets,nativeSourceHashes=sourceHashes,probeHash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()),indent=2))
c,w = m.command,m.wait
process = subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')], env={**os.environ, 'LOCAL_NOTES_TEST_ROOT':str(root), 'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'), 'REVIEW_PROBE':str(m.OUT)}, stdout=open(m.OUT/'app.log','a'), stderr=subprocess.STDOUT)

def key(code, shift=False, command=False):
    subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to set frontmost to true','-e',f'tell application "System Events" to key code {code}'+(' using command down' if command else ' using shift down' if shift else '')],check=True)
    time.sleep(.15)
try:
    w("!!document.querySelector('#items .home-tools')")
    c("document.querySelector('nav [data-view=organize]').click()")
    w("document.querySelectorAll('#ai-selection input').length===50")
    assert c("return !document.querySelector('#ai-settings-drawer').open")
    reads = c('__reads')
    c("document.querySelector('#ai-selection input').click();document.querySelector('#ai-notes-next').click()")
    w("!document.querySelector('#ai-notes-previous').disabled")
    c("document.querySelector('#ai-directory').value='current';document.querySelector('#ai-directory').dispatchEvent(new Event('change'));document.querySelector('#ai-search').value='needle54';document.querySelector('#ai-search').dispatchEvent(new Event('input'))")
    w("document.querySelectorAll('#ai-selection input').length===1")
    assert c("return document.querySelector('#ai-selection input').value") == 'current/54.md'
    assert c('__reads') == reads
    c("document.querySelector('#ai-selection input').click();document.querySelector('#ai-preview').click()")
    w("document.querySelector('#ai-status').textContent.includes('预览已就绪')")
    assert c('__reads') == reads + 2
    assert c("return document.querySelector('#ai-send').disabled")
    c("document.querySelector('#ai-configure').focus();document.querySelector('#ai-configure').click()")
    w("document.querySelector('#ai-settings-drawer').open")
    assert c("return document.activeElement.id") == 'ai-address'
    c("document.querySelector('#ai-token').value='synthetic-unsaved';window.nativeKeys=[];document.addEventListener('keydown',e=>window.nativeKeys.push({key:e.key,trusted:e.isTrusted}))")
    key(53)
    w("!!document.querySelector('#task-leave-decision')")
    c("[...document.querySelectorAll('#task-leave-decision button')].find(b=>b.textContent==='放弃更改并离开').click()")
    w("!document.querySelector('#ai-settings-drawer').open")
    assert c("return document.activeElement.id") == 'ai-configure'
    assert c("return document.querySelector('#ai-token').value") == ''
    assert c("return window.nativeKeys.some(e=>e.key==='Escape'&&e.trusted)")
    assert c("return document.querySelector('#ai-selection-state').textContent.includes('2 / 20')")
    assert c("return document.querySelector('#ai-input').textContent.includes('current/54.md')")
    for width in [1180,393]:
        c(f'__size:{width}:700')
        assert c("return document.documentElement.scrollWidth<=innerWidth")
        c('__snapshot'); shutil.copy(m.OUT/'snapshot.png', evidence/f'native-{width}.png')
    assert not list((root/'LocalNotesData/candidates').glob('*.json'))
    for note in cases: assert (root/note['path']).read_text() == note['text']
    result = dict(head=headBefore,assets=assets,nativeSourceHashes=sourceHashes,probeHash=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),initialInputSource=initial,bodyReadsBeforePreview=reads,bodyReadsAfterPreview=c('__reads'),nativeKeys=c('return window.nativeKeys'),result='PASS real UI/bridge/SQLite/isolated Markdown, selection/search/filter/page/preview/setup-cancel; OS-injected trusted Escape and focus restoration; no AI sends; unchanged source bytes')
    (evidence/'result.json').write_text(json.dumps(result,indent=2))
    print(result['result'])
finally:
    process.terminate(); process.wait(timeout=10)
    final = subprocess.check_output([str(helper)],text=True).splitlines()[0]
    if final != initial:
        subprocess.run([str(helper),initial],check=True)
        final = subprocess.check_output([str(helper)],text=True).splitlines()[0]
    assert final == initial
    (evidence/'cleanup.json').write_text(json.dumps(dict(pid=process.pid,exit=process.returncode,initialInputSource=initial,finalInputSource=final)))
