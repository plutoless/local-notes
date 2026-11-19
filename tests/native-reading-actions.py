#!/usr/bin/env python3
"""Issue 69: real packaged assets and storage in an isolated Cocoa/WKWebView host."""
import hashlib, importlib.util, inspect, json, os, platform, shutil, signal, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
evidence = Path(os.environ.get('LIBRARY_EVIDENCE_DIR', 'docs/validation/issue69')); evidence.mkdir(parents=True, exist_ok=True)
m.OUT = Path.cwd() / 'build/native-issue69'; m.APP = m.OUT / 'ReadingAction69.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True)
root = m.OUT / 'Sync'; root.mkdir(); (m.OUT / 'Private').mkdir()
cases = [dict(path='reader.md',text='# Original\n\n[[folder/Second|第二份]]\n\n- **确认** next\n\n| 名称 | 值 |\n| --- | --- |\n| 合成 | `a` |\n'),dict(path='folder/Second.md',text='# Second\n\nNested source')]

for note in cases:
    path = root / note['path']; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(note['text']); os.utime(path, (1000, 1000))
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue69')
exec(source, m.__dict__); m.build()
p = m.OUT / 'main.swift'
p.write_text(p.read_text().replace('import Cocoa', 'import Cocoa\nvar libraryBodyReads = 0\ntry! String(ProcessInfo.processInfo.processIdentifier).write(toFile: ProcessInfo.processInfo.environment["REVIEW_PROBE"]! + "/host.pid", atomically:true, encoding:.utf8)', 1).replace('case "read":return', 'case "read":libraryBodyReads += 1;return').replace('let wrapped =', '''if script == "__frame" {
 if let window=self?.window, let web=self?.web {
 window.makeKeyAndOrderFront(nil); window.makeFirstResponder(web); NSApp.activate(ignoringOtherApps:true)
 let rect=window.convertToScreen(web.convert(web.bounds,to:nil))
 let result:[String:Any] = ["ok":true,"value":[rect.minX,NSScreen.screens[0].frame.maxY-rect.maxY,window.windowNumber]]
 try? JSONSerialization.data(withJSONObject:result).write(to:reviewProbe.directory.appendingPathComponent("response.json")); return
 }
}
if script == "__reads" {
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
head = subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
probe_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
package_hash = hashlib.sha256((m.APP/'Contents/MacOS/LocalNotes').read_bytes()).hexdigest()
input_script = 'import Carbon\nlet s = TISCopyCurrentKeyboardInputSource().takeRetainedValue()\nprint(Unmanaged<CFString>.fromOpaque(TISGetInputSourceProperty(s,kTISPropertyInputSourceID)).takeUnretainedValue())'
def input_source(): return subprocess.check_output(['swift','-e',input_script],text=True).strip()
native_source_hashes = {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('mac').glob('*.swift')}
production_hash = hashlib.sha256(Path('dist/LocalNotes.app/Contents/MacOS/LocalNotes').read_bytes()).hexdigest()
initial_input = input_source()
(evidence/'preflight.json').write_text(json.dumps(dict(head=head,probe=probe_hash,package=package_hash,assets=assets,nativeSources=native_source_hashes,productionExecutable=production_hash,inputSource=initial_input),indent=2))
launcher = subprocess.Popen(['open','-n','-W','--env','LOCAL_NOTES_TEST_ROOT='+str(root),'--env','LOCAL_NOTES_TEST_PRIVATE='+str(m.OUT/'Private'),'--env','REVIEW_PROBE='+str(m.OUT),str(m.APP)], stdout=open(m.OUT/'app.log','a'), stderr=subprocess.STDOUT)
class OwnedHost:
    @property
    def pid(self): return int((m.OUT/'host.pid').read_text())
    def terminate(self): os.kill(self.pid, signal.SIGTERM)
    def kill(self): os.kill(self.pid, signal.SIGKILL)
    def wait(self,timeout): return launcher.wait(timeout=timeout)
process = OwnedHost()

try:
    w("!!document.querySelector('#items .home-tools')")
    c("document.querySelector('nav [data-view=notes]').click()")
    w("document.querySelectorAll('#items .card').length===2")
    c("document.querySelector('#items [data-path=\"reader.md\"]').click()")
    w("!document.querySelector('#reading').hidden && document.activeElement.id==='mode'")
    def records(): return [json.loads(p.read_text()) for p in (root/'LocalNotesData/actions').glob('*.json')]
    def key(code, modifier=''):
        flags='.maskShift' if modifier else '[]'
        subprocess.run(['swift','-e',f'import Cocoa; import CoreGraphics; let down=CGEvent(keyboardEventSource:nil,virtualKey:{code},keyDown:true)!; down.flags = {flags}; down.postToPid({process.pid}); usleep(100000); let up=CGEvent(keyboardEventSource:nil,virtualKey:{code},keyDown:false)!;up.flags = {flags};up.postToPid({process.pid})'],check=True)
    original = hashlib.sha256((root/'reader.md').read_bytes()).hexdigest()
    c("document.querySelector('#note-create-action').focus()")
    key(36)
    w("document.querySelector('#action-drawer').open && document.activeElement.id==='action-description'")
    assert len(records())==0
    for width,height in [(393,550),(1180,800)]:
        c(f'__size:{width}:{height}')
        assert c('return document.documentElement.scrollWidth<=innerWidth')
        c('__snapshot'); shutil.copy(m.OUT/'snapshot.png',evidence/f'drawer-{width}-{height}.png')
    c("document.querySelector('#action-save').focus()")
    key(36)
    w("!document.querySelector('#action-drawer').open && document.activeElement.id==='note-create-action'")
    assert len(records())==1 and records()[0]['sources'][0]['path']=='reader.md'
    # Coordinator-approved setup only: a real WKWebView Range, not OS selection input.
    c("const reader=document.querySelector('#reading');const r=document.createRange();r.selectNodeContents(reader.querySelector('li strong'));getSelection().removeAllRanges();getSelection().addRange(r)")
    selected_text=c('return getSelection().toString()')
    assert selected_text=='确认'
    c("document.querySelector('#passage-create-action').focus()")
    key(36)
    w("document.querySelector('#action-drawer').open")
    assert c("return document.querySelector('#action-description').value")==selected_text
    assert c("return document.querySelector('.source-quote').value").strip()=='- **确认** next'
    c("document.querySelector('#action-save').focus()")
    key(48)
    assert c("return !!document.activeElement.closest('#action-drawer')")
    c("document.querySelector('#action-save').focus()")
    key(36)
    w("!document.querySelector('#action-drawer').open && document.activeElement.id==='passage-create-action'")
    assert len(records())==2 and c('return getSelection().toString()')==selected_text
    passage_record=next(r for r in records() if r['description']==selected_text)
    assert passage_record['sources'][0]['quote'].strip()=='- **确认** next'
    assert passage_record['sources'][0]['quote'] in (root/'reader.md').read_text()
    expected_fingerprint=c("const {fingerprint}=await import('./initiatives.js');const {native}=await import('./bridge.js');const workspace=await native('workspace');const loaded=await native('read',{path:'reader.md',workspaceId:workspace.workspaceId});return fingerprint(loaded.text)")
    assert passage_record['sources'][0]['fingerprint']==expected_fingerprint
    # Whole-table Range setup must preserve original Markdown delimiters/body rows.
    c("const r=document.createRange();r.selectNodeContents(document.querySelector('#reading table'));getSelection().removeAllRanges();getSelection().addRange(r)")
    table_selection=c('return getSelection().toString()')
    assert '合成' in table_selection
    c("document.querySelector('#passage-create-action').focus()")
    key(36)
    w("document.querySelector('#action-drawer').open")
    assert '| 合成 | `a` |' in c("return document.querySelector('.source-quote').value")
    c("document.querySelector('#action-back').focus()")
    key(36)
    w("!document.querySelector('#action-drawer').open && document.activeElement.id==='passage-create-action'")
    assert len(records())==2 and c('return getSelection().toString()')==table_selection
    c("document.querySelector('#note-create-action').click()")
    w("document.querySelector('#action-drawer').open")
    c("document.querySelector('#action-description').value='Discard native draft';document.querySelector('#action-description').dispatchEvent(new Event('input',{bubbles:true}))")
    key(53)
    w("!!document.querySelector('.leave-dialog[open], dialog[open]:not(#action-drawer)')")
    c("[...document.querySelectorAll('dialog[open] button')].find(n=>n.textContent==='放弃更改并离开').focus()")
    key(36)
    w("!document.querySelector('#action-drawer').open && document.activeElement.id==='note-create-action'")
    assert len(records())==2
    c("document.querySelector('#reading .wiki-link').click()")
    w("document.querySelector('#file-path').textContent==='folder/Second.md'")
    c("document.querySelector('#note-create-action').click()")
    w("document.querySelector('#action-drawer').open")
    c("document.querySelector('#action-save').click()")
    w("!document.querySelector('#action-drawer').open")
    c("document.querySelector('#back').focus()")
    key(36)
    w("document.querySelector('#file-path').textContent==='reader.md'")
    assert len(records())==3
    assert hashlib.sha256((root/'reader.md').read_bytes()).hexdigest()==original
    for r in records():
        assert (root/f"LocalNotesData/revisions/{r['entityId']}/{r['revision']}.json").exists()
    c("document.querySelector('nav [data-view=focus]').click()")
    w("!!document.querySelector('.home-tools')")
    c("[...document.querySelectorAll('.home-tools button')].find(n=>n.textContent==='全部行动').click()")
    w("document.querySelectorAll('#items [data-entity-id]').length===3")
    (evidence/'native-report.json').write_text(json.dumps(dict(head=head,assets=assets,nativeSources=native_source_hashes,productionExecutable=production_hash,probeHash=probe_hash,packageHash=package_hash,sourceHash=original,records=records(),noteCreation=True,passageCreation=True,cancelDiscard=True,nestedReturn=True,keyboardFocus=True,inputSource=initial_input,selectionSetup='DOM Range in real WKWebView; exact list/table selected text and source mapping verified; no OS-generated selection claim',input='DOM focus setup plus process-targeted Quartz Return, Tab, Escape; no physical input',deferred=['Android runtime','standalone Syncthing']),indent=2))
    print('PASS native reading Action confirmation, DOM Range consumption/source mapping, Quartz keyboard/focus, Escape/discard, nested return and persisted revisions/index')
finally:
    try:
        print('FINAL_UI',c("return {focus:document.activeElement.id,selection:getSelection().toString(),dialogs:[...document.querySelectorAll('dialog[open]')].map(n=>n.id),notice:document.querySelector('#notice').textContent,buttonDisabled:document.querySelector('#note-create-action').disabled,path:document.querySelector('#file-path').textContent}"))
        print('FRONTMOST',subprocess.check_output(['osascript','-e','tell application "System Events" to get name of first application process whose frontmost is true'],text=True))
    except Exception as error: print('Diagnostic failed',error)
    process.terminate()
    try: process.wait(timeout=10)
    except subprocess.TimeoutExpired: process.kill(); process.wait(timeout=10)
    try: os.kill(process.pid,0)
    except ProcessLookupError: pass
    else: raise AssertionError('Owned host still running after launcher wait')
    final_input=input_source()
    (evidence/'cleanup.json').write_text(json.dumps(dict(hostPID=process.pid,hostExited=launcher.poll() is not None,inputSourceInitial=initial_input,inputSourceFinal=final_input,temporarilySelectedInputSource=False,inputSourceUnchanged=final_input==initial_input),indent=2))
