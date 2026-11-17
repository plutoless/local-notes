#!/usr/bin/env python3
"""Issue 46 isolated Cocoa/WKWebView topic drawer and persistence."""
import hashlib, importlib.util, inspect, json, os, shutil, subprocess
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
phase = os.environ.get('PHASE', 'after')
m.OUT = Path.cwd() / ('build/native-issue46-' + phase); m.APP = m.OUT / 'Library46.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True, exist_ok=True)
for folder in ['Sync','Private']: (m.OUT/folder).mkdir(exist_ok=True)
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue46'+phase)
exec(source, m.__dict__)
exec(inspect.getsource(m.launch).replace("!!document.querySelector('#items > button')", "document.querySelector('#index-state')?.textContent === ''"),m.__dict__)
m.build()
generated=m.OUT/'main.swift'
generated.write_text(generated.read_text().replace('let unsaved = value as? Bool ?? true', 'let unsaved = value as? Bool ?? true; try? JSONSerialization.data(withJSONObject: ["unsaved": unsaved]).write(to: reviewProbe.directory.appendingPathComponent("close-guard.json"))').replace('let wrapped =', '''if script == "__attemptClose" {
 try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
 DispatchQueue.main.asyncAfter(deadline: .now() + 1) { NSApp.stopModal(); NSApp.modalWindow?.orderOut(nil) }
 self?.window.performClose(nil); return
}
if script == "__snapshot" {
 self?.web.takeSnapshot(with: nil) { image, error in
  if let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) { try? png.write(to: reviewProbe.directory.appendingPathComponent("snapshot.png")) }
  try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
 }; return
}
if script == "__narrow" { self?.window.setContentSize(NSSize(width:393,height:800)); try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json")); return }
let wrapped ='''))
subprocess.run(['swiftc','-module-cache-path','build/swift-cache',str(generated),'mac/AIService.swift','mac/ActionStorage.swift','mac/ActionIndex.swift','mac/ReferenceIndex.swift','mac/ReferenceScan.swift','-lsqlite3','-framework','Cocoa','-framework','WebKit','-o',str(m.APP/'Contents/MacOS/LocalNotes')],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)],check=True)
if phase == 'before':
 shutil.copytree(Path('build/issue46-base/web'),m.APP/'Contents/Resources/web',dirs_exist_ok=True)
 subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)],check=True)
for asset in ['style.css','presentation.js','library-screen.js','app.js','index.html']:
 expected=Path('build/issue46-base/web' if phase=='before' else 'web')/asset
 assert expected.read_bytes()==(m.APP/'Contents/Resources/web'/asset).read_bytes(),asset+' native asset stale'
c,w=m.command,m.wait
process=m.launch()
try:
 (m.OUT/'Sync/reference.md').write_text('# Native reference\n\nKeep this source unchanged.\n')
 c("document.querySelector('[data-view=notes]').click()")
 w("!!document.querySelector('#items .card')")
 source=(m.OUT/'Sync/reference.md').read_bytes()
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue46')/(phase+'-native-desktop.png'))
 state=subprocess.run(['orca','computer','get-app-state','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
 (Path('docs/validation/issue46')/(phase+'-native-ax.json')).write_text(state.stdout)
 tree=json.loads(state.stdout)['result']['snapshot']['treeText']
 index=next(line.strip().split()[0] for line in tree.splitlines() if 'button 新建主题' in line)
 result=subprocess.run(['orca','computer','click','--element-index',index,'--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
 (Path('docs/validation/issue46')/(phase+'-native-pointer.json')).write_text(result.stdout)
 assert json.loads(result.stdout)['ok'],result.stdout
 w("document.activeElement.id==='topic-name'")
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue46')/(phase+'-native-form-desktop.png'))
 c('__narrow');w("innerWidth===393")
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue46')/(phase+'-native-form-393.png'))
 if phase=='after':
  # Foreground trusted key, then native readback: Escape must guard the dirty draft.
  c("document.querySelector('#topic-name').value='真实原生主题';document.querySelector('#topic-name').dispatchEvent(new Event('input'))")
  result=subprocess.run(['orca','computer','press-key','--key','Escape','--restore-window','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
  (Path('docs/validation/issue46')/'after-native-escape.json').write_text(result.stdout)
  w("!document.querySelector('.draft-guard').hidden")
  c('__attemptClose')
  import time
  time.sleep(.4)
  state=subprocess.run(['orca','computer','get-app-state','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
  (Path('docs/validation/issue46')/'after-native-close-alert.json').write_text(state.stdout)
  guard=m.OUT/'close-guard.json'
  for _ in range(50):
   if guard.exists(): break
   time.sleep(.1)
  assert json.loads(guard.read_text())['unsaved']
  shutil.copy(guard,Path('docs/validation/issue46')/'after-native-close-guard.json')
  subprocess.run(['orca','computer','press-key','--key','Return','--restore-window','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
  assert process.poll() is None
  c("[...document.querySelectorAll('.draft-guard button')].find(n=>n.textContent==='继续编辑').click();document.querySelector('#topic-drawer button[type=submit]').click()")
  w("!document.querySelector('#topic-drawer').open")
  assert len(list((m.OUT/'Sync/LocalNotesData/topics').glob('*.json')))==1
  c("document.querySelector('#library-topic').value=document.querySelector('#library-topic option:last-child').value;document.querySelector('#library-topic').dispatchEvent(new Event('change'))")
  w("!document.querySelector('#library-rename-topic').disabled")
  c("document.querySelector('#library-rename-topic').click()")
  assert c("return document.querySelector('#topic-name').value==='真实原生主题'")
  c("document.querySelector('#topic-name').value='原生重命名';document.querySelector('#topic-name').dispatchEvent(new Event('input'));document.querySelector('#topic-drawer button[type=submit]').click()")
  w("!document.querySelector('#topic-drawer').open")
  c("document.querySelector('#library-rename-topic').click()")
  assert c("return document.querySelector('#topic-name').value==='原生重命名'")
  c("document.querySelector('#topic-cancel').click();document.querySelector('#library-create-topic').click();document.querySelector('#topic-cancel').click()")
  assert len(list((m.OUT/'Sync/LocalNotesData/topics').glob('*.json')))==1
 assert (m.OUT/'Sync/reference.md').read_bytes()==source
 (Path('docs/validation/issue46')/(phase+'-native.json')).write_text(json.dumps({'engine':'Cocoa/WKWebView','phase':phase,'pointerOpen':True,'trustedEscapeGuard':phase=='after','nativeCloseGuard':phase=='after','createRenameReopenAndCleanCancel':phase=='after','unchangedMarkdown':True,'width':393,'assets':{a:hashlib.sha256((m.APP/'Contents/Resources/web'/a).read_bytes()).hexdigest() for a in ['style.css','presentation.js','library-screen.js','app.js','index.html']}},indent=2))
 print('PASS native '+phase+' pointer, layouts and source/persistence assertions')
finally:
 process.terminate();process.wait(timeout=10)
