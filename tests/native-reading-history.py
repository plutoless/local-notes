#!/usr/bin/env python3
"""Issue 68: real packaged assets and storage in an isolated Cocoa/WKWebView host."""
import hashlib, importlib.util, inspect, json, os, platform, shutil, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
evidence = Path(os.environ.get('LIBRARY_EVIDENCE_DIR', 'docs/validation/issue68')); evidence.mkdir(parents=True, exist_ok=True)
m.OUT = Path.cwd() / 'build/native-issue68'; m.APP = m.OUT / 'Reading68.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True)
root = m.OUT / 'Sync'; root.mkdir(); (m.OUT / 'Private').mkdir()
cases = [dict(path='reader.md',text='# Original\n\n[[folder/Second|第二份]]\n\n' + 'Synthetic long reading.\n\n'*400),dict(path='folder/Second.md',text='# Second\n\n[[Third.md|第三份]]'),dict(path='folder/Third.md',text='# Third\n\nFinal destination')]

for i in range(2000):
    (root / f'corpus-{i:04d}.md').write_text(f'# Synthetic corpus {i}\n\n' + 'Bounded synthetic reference.\n' * 40)
second = m.OUT / 'Second'; second.mkdir(); (second/'reader.md').write_text('# Different workspace\n\n' + 'Independent position in second workspace.\n\n'*200)
for note in cases:
    path = root / note['path']; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(note['text']); os.utime(path, (1000, 1000))
os.utime(root/'reader.md', None)
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue68')
exec(source, m.__dict__); m.build()
p = m.OUT / 'main.swift'
p.write_text(p.read_text().replace('import Cocoa', 'import Cocoa\nvar libraryBodyReads = 0', 1).replace('case "read":return', 'case "read":libraryBodyReads += 1;return').replace('case "choose":', 'case "choose": return [:]\n case "__unusedChoose":').replace('let wrapped =', '''if script.hasPrefix("__root:") {
 self?.root = URL(fileURLWithPath: String(script.dropFirst(7))); self?.observeRoot()
 try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json")); return
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
c = m.command
def w(expression):
    print('WAIT '+expression,flush=True)
    for _ in range(800):
        if c('return '+expression): return
        time.sleep(.1)
    raise AssertionError('Native UI timed out: '+expression+'; '+str(c("return {notice:document.querySelector('#notice').textContent, progress:document.querySelector('#library-progress').textContent, items:document.querySelector('#items').innerText.slice(0,400)}")))
helper=m.OUT/'input-source'
subprocess.run(['swiftc','-module-cache-path','build/swift-cache','tests/InputSourceHarness.swift','-o',str(helper)],check=True)
def input_source(): return subprocess.check_output([str(helper)],text=True).splitlines()[0]
initial_input=input_source()
# Freeze identities before launching any owned native process.
preflight_paths=[Path('mac/main.swift'),Path(__file__),p,m.APP/'Contents/MacOS/LocalNotes',Path('dist/LocalNotes.app/Contents/MacOS/LocalNotes'),Path('dist/LocalNotes-debug.apk')]
(evidence/'preflight.json').write_text(json.dumps(dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),assets=assets,sha256={str(path.relative_to(Path.cwd())) if path.is_absolute() and path.is_relative_to(Path.cwd()) else str(path):hashlib.sha256(path.read_bytes()).hexdigest() for path in preflight_paths},inputSource=initial_input),indent=2))
process=None; processes=[]; measurements=[]; journeys=[]
report=dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),assets=assets,hardware=platform.platform(),corpusNotes=2003,initialInputSource=initial_input)
def launch(active_root=root):
    global process
    for name in ['command.js','response.json']: (m.OUT/name).unlink(missing_ok=True)
    start=time.perf_counter()
    process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(active_root),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','a'),stderr=subprocess.STDOUT)
    processes.append(process)
    w("!!document.querySelector('.home-tools')")
    reads=c('__reads');assert reads==0,reads
    measurements.append(dict(journey='cold Home',ms=round((time.perf_counter()-start)*1000,1),bodyReads=reads))
def os_key(code, modifiers=''):
    subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to set frontmost to true'],check=True)
    subprocess.run(['osascript','-e',f'tell application "System Events" to key code {code}'+modifiers],check=True)
def quit_app():
    os_key(12,' using command down')
    process.wait(timeout=15)
    assert process.returncode==0,process.returncode
    journeys.append('actual native Cmd+Q termination and waited process exit')
def resume(label='resume'):
    before=c('__reads'); start=time.perf_counter()
    c("document.querySelector('[data-reading-path]').focus({preventScroll:true})")
    os_key(36)
    w("!document.querySelector('#editor').hidden && document.activeElement.id==='mode'")
    delta=c('__reads')-before;assert delta==1,(label,delta)
    measurements.append(dict(journey=label,ms=round((time.perf_counter()-start)*1000,1),bodyReadDelta=delta))
def home(existing_indexing=False):
    before=c('__reads'); start=time.perf_counter()
    c("document.querySelector('nav [data-view=focus]').click()")
    w("!!document.querySelector('.home-tools') && document.querySelector('#editor').hidden")
    delta=c('__reads')-before
    if not existing_indexing: assert delta==0,delta
    measurements.append(dict(journey='warm Home',ms=round((time.perf_counter()-start)*1000,1),bodyReadDelta=delta,existingIndexingMayOverlap=existing_indexing))
try:
    launch()
    assert c("return !document.querySelector('.recent-reading')")
    c("document.querySelector('nav [data-view=notes]').click()")
    w("!document.querySelector('#library-tools').hidden")
    c("const search=document.querySelector('#search');search.value='Original';search.dispatchEvent(new Event('input',{bubbles:true}))")
    w("!!document.querySelector('#items [data-path=\"reader.md\"]')")
    w("document.querySelector('#library-progress').textContent===''")
    c("document.querySelector('#items [data-path=\"reader.md\"]').click()")
    w("!document.querySelector('#reading').hidden && document.activeElement.id==='mode'")
    originals={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*.md')}
    c("document.querySelector('main').scrollTop=850")
    time.sleep(.2)
    saved=c("return document.querySelector('main').scrollTop")
    assert saved>0
    state=c("return Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('reading-history:')).map(k=>[k,JSON.parse(localStorage.getItem(k))]))")
    workspace=json.loads((root/'LocalNotesData/workspace.json').read_text())['workspaceId']
    assert state['reading-history:v1:'+workspace][0]['scroll']['main']==saved,state
    report['persistedPrivateStateBeforeQuit']={k:v for k,v in state.items() if k.endswith(workspace)}
    records_before={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'LocalNotesData').rglob('*.json')}
    quit_app(); launch()
    assert c("return document.querySelector('[data-reading-path]').dataset.readingPath")=='reader.md'
    resume('cold restart resume')
    assert c("return document.querySelector('main').scrollTop")==saved
    assert c("return document.querySelector('#body').hidden")
    home(); resume('warm resume')
    assert c("return document.querySelector('main').scrollTop")==saved
    journeys.append('private persisted position restored after actual native process restart; cold/warm Home zero bodies and resume one source')
    c("document.querySelector('#back').focus()")
    os_key(36)
    w("document.activeElement.dataset.readingPath==='reader.md' && !!document.querySelector('.home-tools')")
    journeys.append('OS-injected Enter resumed reader and Back restored Home entry focus')
    # Narrow/reduced-height layouts retain a reachable document return and scroll surface.
    for width,height in [(393,852),(800,400)]:
        c(f'__size:{width}:{height}');time.sleep(.2);resume(f'resume {width}x{height}')
        assert c("return document.documentElement.scrollWidth<=innerWidth")
        c("document.querySelector('main').scrollTop=600");time.sleep(.2)
        assert c("return document.querySelector('main').scrollTop")>0
        c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/f'reading-{width}.png')
        home()
    c('__size:1180:800')
    # Revalidate exact paths: external move with a duplicate basename never substitutes.
    (root/'reader.md').rename(root/'moved.md')
    (root/'other').mkdir(exist_ok=True);(root/'other/reader.md').write_text('# Wrong same name')
    c("document.querySelector('[data-reading-path]').click()")
    w("document.querySelector('#notice').textContent.includes('暂不可用')")
    assert c("return document.querySelector('#editor').hidden")
    (root/'moved.md').rename(root/'reader.md');(root/'other/reader.md').unlink()
    c("document.querySelector('#notice button').click()")
    (root/'reader.md').write_text(cases[0]['text']+'\nExternal changed version')
    resume('changed source')
    assert c("return document.querySelector('main').scrollTop")==0
    assert c("return document.querySelector('#notice').textContent.includes('原文已更改')")
    journeys.append('external move/missing exact path did not substitute duplicate basename; changed source reset position with notice')
    (root/'reader.md').write_text(cases[0]['text'])
    # Preserve both actual roots with app UI workspace transition and the native storage adapter.
    home();c('__root:'+str(second))
    c("document.querySelector('#choose').click()")
    # A controlled chooser seam selects the already-set synthetic root; no real directory panel.
    w("!!document.querySelector('.home-tools') && !document.querySelector('.recent-reading')")
    c("document.querySelector('nav [data-view=notes]').click()")
    w("!document.querySelector('#library-tools').hidden")
    c("const search=document.querySelector('#search');search.value='';search.dispatchEvent(new Event('input',{bubbles:true}))")
    w("!!document.querySelector('#items [data-path=\"reader.md\"]')")
    c("document.querySelector('#items [data-path=\"reader.md\"]').click()")
    w("!document.querySelector('#reading').hidden")
    c("document.querySelector('main').scrollTop=333");time.sleep(.2)
    second_scroll=c("return document.querySelector('main').scrollTop");assert second_scroll>0
    home();quit_app();launch(second);resume('second workspace restart resume')
    assert c("return document.querySelector('main').scrollTop")==second_scroll
    assert c("return document.querySelector('#title').value")=='Different workspace'
    quit_app();launch(root)
    resume('resume after workspace round trip')
    assert c("return document.querySelector('#title').value")=='Original'
    journeys.append('two synthetic roots each retained independent private entries and nonzero positions across process restart')
    # Known application move uses its real contextual form and native move repository.
    c("document.querySelector('#note-info-open').click()")
    w("!!document.querySelector('#rename') && !document.querySelector('#rename').disabled")
    c("document.querySelector('#rename').click()")
    w("!!document.querySelector('#note-location')")
    c("const input=document.querySelector('#note-location');input.value='folder/Renamed.md';input.dispatchEvent(new Event('input',{bubbles:true}));input.closest('form').requestSubmit()")
    w("document.querySelector('#file-path').textContent==='folder/Renamed.md'")
    home(existing_indexing=True)
    assert c("return document.querySelector('[data-reading-path]').dataset.readingPath")=='folder/Renamed.md'
    journeys.append('known application move migrated private exact path through actual contextual form/storage')
    quit_app()
    removed=[]
    for path in (m.OUT/'Private').rglob('*.sqlite*'): removed.append(str(path.relative_to(m.OUT)));path.unlink()
    assert removed
    launch(root);resume('resume after disposable index removal')
    assert c("return document.querySelector('#file-path').textContent")=='folder/Renamed.md'
    c("document.querySelector('#note-info-open').click()")
    w("document.querySelector('#note-info-drawer').open && !!document.querySelector('#note-create-topic')")
    c("[...document.querySelectorAll('#note-info-drawer button')].find(n=>n.textContent==='完成').click()")
    w("!document.querySelector('#note-info-drawer').open")
    journeys.append('delivered topic classification controls remain available on direct resume after index removal, without opening Library')
    journeys.append('private continuation survived deleting all isolated disposable SQLite indexes and native restart')
    # Source modifications in this test are explicit controlled fixture changes only.
    (root/'folder/Renamed.md').rename(root/'reader.md')
    after={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*.md')}
    assert originals==after
    records_after={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'LocalNotesData').rglob('*.json')}
    assert records_before==records_after
    report.update(formalRecordHashesBefore=records_before,formalRecordHashesAfter=records_after,sourceHashesBefore=originals,sourceHashesAfter=after,sourceIntegrity=True,indexFilesRemoved=removed,measurements=measurements,journeys=journeys,
      privateStateFiles=[str(p) for p in (Path.home()/'Library/WebKit/dev.localnotes.validation.issue68').rglob('*') if p.is_file()] if (Path.home()/'Library/WebKit/dev.localnotes.validation.issue68').exists() else [],
      inputCoverage='DOM setup/focus plus OS-injected Enter and Cmd+Q; no physical keyboard',limitations=['Android runtime and standalone Syncthing deferred','Synthetic 2003-note corpus; no real nas2/private material','Read counts count native source read commands, not filesystem reads internal to SQLite or assets'])
    print('PASS native restart/resume, exact position/focus, recovery, two roots, known move and disposable index removal')
finally:
    for owned in processes:
        if owned.poll() is None: owned.terminate();owned.wait(timeout=15)
    actual=input_source()
    if actual!=initial_input:
        subprocess.run([str(helper),initial_input],check=True);actual=input_source()
    report.update(inputSourceAfter=actual,inputSourceRestored=actual==initial_input,ownedProcessesExited=all(p.poll() is not None for p in processes))
    (evidence/'native-report.json').write_text(json.dumps(report,indent=2))
    assert actual==initial_input
