#!/usr/bin/env python3
"""Issue 46 isolated Cocoa/WKWebView topic drawer and persistence."""
import hashlib, importlib.util, inspect, json, os, shutil, subprocess
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
phase = os.environ.get('PHASE', 'after')
m.OUT = Path.cwd() / ('build/native-issue47-' + phase); m.APP = m.OUT / 'Initiative47.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True, exist_ok=True)
for folder in ['Sync','Private']: (m.OUT/folder).mkdir(exist_ok=True)
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue47'+phase)
exec(source, m.__dict__)
exec(inspect.getsource(m.launch).replace("!!document.querySelector('#items > button')", "document.querySelector('#index-state')?.textContent === ''"),m.__dict__)
m.build()
generated=m.OUT/'main.swift'
generated.write_text(generated.read_text().replace('let wrapped =', '''if script == "__snapshot" {
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
 shutil.copytree(Path('build/issue47-base/web'),m.APP/'Contents/Resources/web',dirs_exist_ok=True)
 subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)],check=True)
for asset in ['style.css','presentation.js','initiative-screen.js','app.js','index.html']:
 expected=Path('build/issue47-base/web' if phase=='before' else 'web')/asset
 assert expected.read_bytes()==(m.APP/'Contents/Resources/web'/asset).read_bytes(),asset+' native asset stale'
c,w=m.command,m.wait
process=m.launch()
try:
 c("document.querySelector('[data-view=initiatives]').click()")
 w("!document.querySelector('#initiative-tools').hidden")
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue47')/(phase+'-native-desktop.png'))
 state=subprocess.run(['orca','computer','get-app-state','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
 (Path('docs/validation/issue47')/(phase+'-native-ax.json')).write_text(state.stdout)
 tree=json.loads(state.stdout)['result']['snapshot']['treeText']
 index=next(line.strip().split()[0] for line in tree.splitlines() if 'button 新建事项' in line)
 result=subprocess.run(['orca','computer','click','--element-index',index,'--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
 (Path('docs/validation/issue47')/(phase+'-native-pointer.json')).write_text(result.stdout)
 assert json.loads(result.stdout)['ok'],result.stdout
 w("document.activeElement.id==='initiative-title'")
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue47')/(phase+'-native-form-desktop.png'))
 c('__narrow');w("innerWidth===393")
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue47')/(phase+'-native-form-393.png'))
 if phase=='after':
  c("const f=(id,value)=>{const n=document.querySelector(id);n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}))};f('#initiative-title','真实原生事项');f('#initiative-goal','原生保存与恢复');f('#initiative-progress','验证中')")
  result=subprocess.run(['orca','computer','press-key','--key','Escape','--restore-window','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
  (Path('docs/validation/issue47')/'after-native-escape.json').write_text(result.stdout)
  w("!document.querySelector('#initiative-drawer .draft-guard').hidden")
  c("document.querySelector('#initiative-drawer .draft-guard button').click();document.querySelector('#initiative-form').requestSubmit()")
  w("!document.querySelector('#initiative-drawer').open")
  assert len(list((m.OUT/'Sync/LocalNotesData/initiatives').glob('*.json')))==1
  c("document.querySelector('[data-initiative-id]').click()")
  w("document.querySelector('#workspace-title').textContent==='真实原生事项'")
  c("document.querySelector('#workspace-overview').click()")
  w("document.querySelector('#initiative-drawer').open")
  assert c("return document.querySelector('#initiative-title').value==='真实原生事项'")
  c("const n=document.querySelector('#initiative-progress');n.value='原生编辑保存';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#initiative-form').requestSubmit()")
  w("!document.querySelector('#initiative-drawer').open")
  c("document.querySelector('#workspace-overview').click()")
  w("document.querySelector('#initiative-drawer').open")
  assert c("return document.querySelector('#initiative-progress').value==='原生编辑保存'")
  c("document.querySelector('#initiative-discard').click();document.querySelector('#initiative-new').click()")
  w("document.querySelector('#initiative-drawer').open")
  c("document.querySelector('#initiative-discard').click()")
  assert len(list((m.OUT/'Sync/LocalNotesData/initiatives').glob('*.json')))==1
 (Path('docs/validation/issue47')/(phase+'-native.json')).write_text(json.dumps({'engine':'Cocoa/WKWebView','phase':phase,'pointerOpen':True,'trustedEscapeGuard':phase=='after','createEditReopenCleanCancel':phase=='after','width':393},indent=2))
 print('PASS native '+phase+' pointer, layouts and real persistence assertions')
finally:
 process.terminate();process.wait(timeout=10)
