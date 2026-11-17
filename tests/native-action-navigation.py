#!/usr/bin/env python3
"""Issue 51 isolated Cocoa/WKWebView navigation and production native guards."""
import hashlib, importlib.util, inspect, json, os, shutil, subprocess, time
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
phase = os.environ.get('PHASE', 'after')
m.OUT = Path.cwd() / ('build/native-issue51-' + phase); m.APP = m.OUT / 'Actions51.app'
if m.OUT.exists(): raise RuntimeError('Preserve prior evidence; use a fresh PHASE')
m.OUT.mkdir(parents=True, exist_ok=True)
for folder in ['Sync','Private']: (m.OUT/folder).mkdir(exist_ok=True)
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue51'+phase)
exec(source, m.__dict__)
exec(inspect.getsource(m.launch).replace("!!document.querySelector('#items > button')", "document.querySelector('#index-state')?.textContent === ''"),m.__dict__)
m.build()
generated=m.OUT/'main.swift'
generated.write_text(generated.read_text().replace('let wrapped =', '''if script == "__attemptClose" || script == "__attemptQuit" {
 try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
 DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
  func texts(_ view: NSView) -> [String] { (view as? NSTextField).map { [$0.stringValue] } ?? view.subviews.flatMap { texts($0) } }
  let modal = NSApp.modalWindow
  let result: [String: Any] = ["visible": modal?.isVisible ?? false, "text": modal?.contentView.map { texts($0) } ?? []]
  try? JSONSerialization.data(withJSONObject: result).write(to: reviewProbe.directory.appendingPathComponent(script + ".json"))
  NSApp.stopModal(); modal?.orderOut(nil)
 }
 if script == "__attemptClose" { self?.window.performClose(nil) } else { NSApp.terminate(nil) }
 return
}
if script == "__snapshot" {
 self?.web.takeSnapshot(with: nil) { image, error in
  if let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) { try? png.write(to: reviewProbe.directory.appendingPathComponent("snapshot.png")) }
  try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
 }; return
}
if script == "__wide" { self?.window.setContentSize(NSSize(width:1180,height:800)); try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json")); return }
if script == "__narrow" { self?.window.setContentSize(NSSize(width:393,height:800)); try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json")); return }
let wrapped ='''))
subprocess.run(['swiftc','-module-cache-path','build/swift-cache',str(generated),'mac/AIService.swift','mac/ActionStorage.swift','mac/ActionIndex.swift','mac/ReferenceIndex.swift','mac/ReferenceScan.swift','-lsqlite3','-framework','Cocoa','-framework','WebKit','-o',str(m.APP/'Contents/MacOS/LocalNotes')],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)],check=True)
c,w=m.command,m.wait
process=m.launch()
evidence=Path('docs/validation/issue51'); evidence.mkdir(parents=True,exist_ok=True)
try:
 w("!!document.querySelector('.home-tools')")
 hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').iterdir() if p.is_file()}
 for name,digest in hashes.items(): assert hashlib.sha256((m.APP/'Contents/Resources/web'/name).read_bytes()).hexdigest()==digest
 (evidence/(phase+'-assets.json')).write_text(json.dumps(hashes,indent=2))
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/(phase+'-native-desktop.png'))
 c('__narrow');c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/(phase+'-native-393.png'))
 state=subprocess.run(['orca','computer','get-app-state','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
 (evidence/(phase+'-native-ax.json')).write_text(state.stdout)
 if phase != 'before':
  c('__wide')
  c('await new Promise(resolve=>setTimeout(resolve,1500))')
  def record(name):
   value=c("return {title:document.querySelector('#view-title').textContent,nav:[...document.querySelectorAll('nav button')].map(n=>({text:n.textContent,current:n.getAttribute('aria-current')})),description:document.querySelector('#action-description').value,save:document.querySelector('#action-save-state').textContent,focused:document.activeElement.id}")
   (evidence/(phase+'-'+name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2))
   return value
  def click(label):
   text=label.removeprefix('button ')
   c("const b=[...document.querySelectorAll('button')].find(b=>b.getClientRects().length && b.textContent.trim().startsWith("+json.dumps(text)+"));if(!b)throw Error('Missing visible button');b.focus();b.click()")
  click('button 新建行动')
  w("!document.querySelector('#action-editor').hidden")
  c("let n=document.querySelector('#action-description');n.value='原生行动导航验证';n.dispatchEvent(new Event('input',{bubbles:true}))")
  click('button 保存行动')
  w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
  click('button ‹ 行动')
  click('button 当前重点')
  w("!!document.querySelector('.home-tools')")
  click('button 全部行动')
  w("document.querySelector('#view-title').textContent==='行动'")
  c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/(phase+'-management-desktop.png'))
  c('__narrow');c('__snapshot');shutil.copy(m.OUT/'snapshot.png',evidence/(phase+'-management-393.png'));c('__wide')
  assert not c("return !!document.querySelector('nav [aria-current=page],nav [data-view=actions]')")
  click('button 原生行动导航验证')
  c("let n=document.querySelector('#action-description');n.value='原生编辑保存后返回';n.dispatchEvent(new Event('input',{bubbles:true}))")
  click('button 保存行动')
  w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
  click('button ‹ 行动')
  record('saved-return')
  click('button 原生编辑保存后返回')
  c("let n=document.querySelector('#action-description');n.value='关闭与退出保护草稿';n.dispatchEvent(new Event('input',{bubbles:true}))")
  # Enter production close/quit dispatch; the probe observes and dismisses the actual modal.
  # No delegate method is called directly, and no unsaved predicate is replaced.
  for attempt in ['__attemptClose','__attemptQuit']:
   c(attempt)
   for _ in range(60):
    if (m.OUT/(attempt+'.json')).exists(): break
    time.sleep(.1)
   modal=json.loads((m.OUT/(attempt+'.json')).read_text())
   assert modal['visible'] and any('还有内容未保存' in text for text in modal['text']),modal
   (evidence/(phase+'-'+attempt+'.json')).write_text(json.dumps(modal,ensure_ascii=False,indent=2))
   assert c("return document.querySelector('#action-description').value==='关闭与退出保护草稿' && window.hasUnsavedChanges()")
  record('guarded-draft')
  assert process.poll() is None
  click('button 保存行动')
  w("document.querySelector('#action-save-state').textContent==='已保存到本地'")
  click('button ‹ 行动')
  record('final')
 print('PASS native captures and navigation '+phase)
finally:
 process.terminate();process.wait(timeout=10)
