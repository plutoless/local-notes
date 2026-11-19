#!/usr/bin/env python3
"""Issue 67: real packaged assets and storage in an isolated Cocoa/WKWebView host."""
import hashlib, importlib.util, inspect, json, os, platform, shutil, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
evidence = Path(os.environ.get('LIBRARY_EVIDENCE_DIR', 'docs/validation/issue67')); evidence.mkdir(parents=True, exist_ok=True)
m.OUT = Path.cwd() / 'build/native-issue67'; m.APP = m.OUT / 'Wiki67.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True)
root = m.OUT / 'Sync'; root.mkdir(); (m.OUT / 'Private').mkdir()
cases = [dict(path='reader.md',text='# Original\n\n[[folder/Second|第二份]]\n\n' + 'Synthetic long reading.\n\n'*100),dict(path='folder/Second.md',text='# Second\n\n[[Third.md|第三份]]'),dict(path='folder/Third.md',text='# Third\n\nFinal destination')]

for note in cases:
    path = root / note['path']; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(note['text']); os.utime(path, (1000, 1000))
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue67')
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
    w("document.querySelectorAll('#items .card').length===3")
    c("document.querySelector('#items [data-path=\"reader.md\"]').click()")
    w("!document.querySelector('#reading').hidden && document.activeElement.id==='mode'")
    originals = {note['path']: hashlib.sha256((root/note['path']).read_bytes()).hexdigest() for note in cases}
    journeys=[]
    for width,height in [(1180,800),(393,852)]:
        c(f'__size:{width}:{height}'); time.sleep(.3)
        c("document.querySelector('#reading .wiki-link').focus({preventScroll:true})")
        c("const p=document.querySelectorAll('#reading p')[1];const r=document.createRange();r.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(r);for(const sel of ['main','#workspace-detail','#reading'])document.querySelector(sel).scrollTop=140")
        saved_scroll=c("return ['main','#workspace-detail','#reading'].map(sel=>document.querySelector(sel).scrollTop)")
        assert max(saved_scroll)>0, saved_scroll
        saved_selection=c('return getSelection().toString()')
        c("document.querySelector('#reading .wiki-link').focus({preventScroll:true})")
        subprocess.run(['osascript','-e',f'tell application \"System Events\" to tell (first application process whose unix id is {process.pid}) to set frontmost to true'],check=True)
        # Real OS keyboard delivery to the native WKWebView, not a DOM click.
        subprocess.run(['osascript','-e','tell application "System Events" to key code 36'],check=True)
        w("document.querySelector('#file-path').textContent==='folder/Second.md' && document.activeElement.id==='mode'")
        c("document.querySelector('#reading .wiki-link').focus({preventScroll:true})")
        subprocess.run(['osascript','-e','tell application "System Events" to key code 36'],check=True)
        w("document.querySelector('#file-path').textContent==='folder/Third.md' && document.activeElement.id==='mode'")
        c("document.querySelector('#back').focus()")
        subprocess.run(['osascript','-e','tell application "System Events" to key code 36'],check=True)
        w("document.querySelector('#file-path').textContent==='folder/Second.md' && document.activeElement.dataset.wikiTarget==='Third.md'")
        c("document.querySelector('#back').focus()")
        subprocess.run(['osascript','-e','tell application "System Events" to key code 36'],check=True)
        w("document.querySelector('#file-path').textContent==='reader.md' && document.activeElement.dataset.wikiTarget==='folder/Second'")
        assert c("return ['main','#workspace-detail','#reading'].map(sel=>document.querySelector(sel).scrollTop)")==saved_scroll
        assert c('return getSelection().toString()')==saved_selection, (saved_selection,c('return getSelection().toString()'))
        assert c('return document.documentElement.scrollWidth<=innerWidth')
        c('__snapshot'); shutil.copy(m.OUT/'snapshot.png', evidence/f'wiki-{width}.png')
        journeys.append(dict(width=width,nestedReturn=True,osEnter=True,focus=True,scroll=saved_scroll,selection=saved_selection))
    c("document.querySelector('#back').click()")
    w("document.querySelector('#editor').hidden && document.activeElement.dataset.path==='reader.md'")
    for name,digest in originals.items(): assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest
    report=dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),assets=assets,sourceHashes=originals,sourceUnchanged=True,journeys=journeys,libraryReturn=True,input='DOM focus setup plus OS-injected Enter in Cocoa/WKWebView; no physical keyboard',limitations=['Android runtime and standalone Syncthing deferred','Full real search panel state owned by issue60'])
    (evidence/'native-report.json').write_text(json.dumps(report,indent=2))
    print('PASS native wiki nested keyboard/focus returns and unchanged source hashes')

finally:
    process.terminate();process.wait(timeout=10)
