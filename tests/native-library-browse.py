#!/usr/bin/env python3
"""Issue 65: real packaged assets and storage in an isolated Cocoa/WKWebView host."""
import hashlib, importlib.util, inspect, json, os, platform, shutil, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
evidence = Path(os.environ.get('LIBRARY_EVIDENCE_DIR', 'docs/validation/issue65')); evidence.mkdir(parents=True, exist_ok=True)
m.OUT = Path.cwd() / 'build/native-issue65'; m.APP = m.OUT / 'Library65.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True)
root = m.OUT / 'Sync'; root.mkdir(); (m.OUT / 'Private').mkdir()
cases = json.loads(Path('tests/fixtures/library-summaries.json').read_text())
for i in range(500 - len(cases)):
    cases.append(dict(path=f'{"Archive" if i < 170 else "Bulk"}/{i:04}.md', text=f'# Synthetic reference {i}\n\nUseful reference text {i}'))
for note in cases:
    path = root / note['path']; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(note['text']); os.utime(path, (1000, 1000))
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue65')
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
    c("window.coldStart=performance.now();document.querySelector('nav [data-view=notes]').click()")
    w("document.querySelectorAll('#items .card').length===50 && !document.querySelector('#library-progress').textContent")
    cold = c("return {ms:performance.now()-coldStart}")
    cold['reads'] = c('__reads')
    assert cold['reads'] == 500, cold
    report = dict(head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(), hardware=platform.platform(), cpu=subprocess.check_output(['sysctl','-n','machdep.cpu.brand_string'],text=True).strip(), corpus=500, cold=cold, assets=assets)
    c('__snapshot'); shutil.copy(m.OUT/'snapshot.png',evidence/'native-browse.png')
    assert c("return [...document.querySelectorAll('#items .card')].every(n=>!n.dataset.path.startsWith('Archive/'))")
    c("document.querySelector('#library-order').value='title';document.querySelector('#library-order').dispatchEvent(new Event('change'));document.querySelector('#library-archives').value='only';document.querySelector('#library-archives').dispatchEvent(new Event('change'))")
    w("document.querySelector('#note-count').textContent.includes('171') && document.querySelectorAll('#items .card').length===50")
    pages = []
    while True:
        paths = c("return [...document.querySelectorAll('#items .card')].map(n=>n.dataset.path)")
        pages.extend(paths)
        if c("return document.querySelector('#library-next').disabled"): break
        c("document.querySelector('#library-next').click()")
        w(f"document.querySelector('#items .card').dataset.path!=={json.dumps(paths[0])}")
    assert len(pages)==171 and len(set(pages))==171
    c("document.querySelector('#library-previous').click()")
    w("document.querySelectorAll('#items .card').length===50")
    target=c("return document.querySelector('#items .card').dataset.path")
    c("document.querySelector('.collection').scrollTop=210;window.savedScroll=document.querySelector('.collection').scrollTop;document.querySelector('#items .card').focus();document.querySelector('#items .card').click()")
    w("!document.querySelector('#editor').hidden")
    c("document.querySelector('#back').click()")
    w(f"document.activeElement.dataset.path==={json.dumps(target)}")
    assert c("return document.querySelector('#library-order').value==='title' && document.querySelector('#library-archives').value==='only' && !document.querySelector('#library-previous').disabled && Math.abs(document.querySelector('.collection').scrollTop-savedScroll)<2")
    report['archivePages'] = dict(count=len(pages), unique=len(set(pages)), browseReturn=True)
    assert c('__reads') == 501
    c("document.querySelector('#library-order').value='current';document.querySelector('#library-order').dispatchEvent(new Event('change'));document.querySelector('#library-archives').value='include';document.querySelector('#library-archives').dispatchEvent(new Event('change'))")

    c("document.querySelector('#search').value='长中文';document.querySelector('#search').dispatchEvent(new Event('input'))")
    w("document.querySelectorAll('#items .card').length===1")
    for width,height in [(1180,800),(760,600),(393,852),(800,400)]:
        c(f'__size:{width}:{height}'); time.sleep(.3)
        assert c("return [...document.querySelectorAll('#items .card')].every(row=>{const r=row.getBoundingClientRect();const parts=[...row.children].map(n=>n.getBoundingClientRect());return parts.every((p,i)=>p.left>=r.left && p.right<=r.right+1 && p.bottom<=r.bottom+1 && (!i || p.top>=parts[i-1].bottom))})")
        assert c('return document.documentElement.scrollWidth<=innerWidth')
        c("document.querySelector('#items .card').scrollIntoView({block:'start'})"); time.sleep(.2)
        c('__snapshot'); shutil.copy(m.OUT/'snapshot.png',evidence/f'native-{width}-{height}.png')
    c('__size:1180:800')
    c("window.warmStart=performance.now();document.querySelector('#library-refresh').click()")
    w("!document.querySelector('#library-refresh').disabled && !document.querySelector('#library-progress').textContent")
    report['warm'] = c('return {ms:performance.now()-warmStart}')
    report['warm']['reads'] = c('__reads') - 501
    assert report['warm']['reads'] == 0
    c("document.querySelector('#search').value='不同来源';document.querySelector('#search').dispatchEvent(new Event('input'))")
    w("document.querySelectorAll('#items .card').length===1")
    c("window.openStart=performance.now();document.querySelector('#items .card').focus();document.querySelector('#items .card').click()")
    w("!document.querySelector('#editor').hidden && document.querySelector('#file-path').textContent==='Archive/repeated.md'")
    report['open'] = c('return {ms:performance.now()-openStart}')
    c("document.querySelector('#back').click()")
    w("document.activeElement.dataset.path==='Archive/repeated.md' && document.querySelector('#search').value==='不同来源'")
    report['open']['reads'] = c('__reads') - 501
    assert report['open']['reads'] == 1
    for note in cases: assert (root/note['path']).read_text() == note['text']
    assert not list(root.glob('LocalNotesData/revisions/*/*.json'))
    report['input'] = 'DOM-driven Cocoa/WKWebView; no physical or OS-injected input'
    report['timingScope'] = 'UI automation wall-clock including polling; cold waits for full indexing; warm is manual refresh; open one selected source'
    (evidence/'native-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
finally:
    process.terminate(); process.wait(timeout=10)
