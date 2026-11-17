#!/usr/bin/env python3
"""Issue 45 isolated Cocoa/WKWebView home, persisted actions and snapshots."""
import hashlib, importlib.util, inspect, json, os, shutil, subprocess
from pathlib import Path
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
phase = os.environ.get('PHASE', 'after')
m.OUT = Path.cwd() / ('build/native-issue45-' + phase); m.APP = m.OUT / 'Home45.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True, exist_ok=True)
for folder in ['Sync','Private']: (m.OUT/folder).mkdir(exist_ok=True)
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue45'+phase)
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
for asset in ['style.css','presentation.js','focus-screen.js']:
 assert (Path('web')/asset).read_bytes()==(m.APP/'Contents/Resources/web'/asset).read_bytes(), asset+' native asset is stale'
c,w=m.command,m.wait
process=m.launch()
try:
 c("const {native}=await import('./bridge.js'); const {ActionRepository}=await import('./actions.js'); window.r=new ActionRepository(native); await r.open(); if(!(await r.query()).actions.length) for(const [i,description] of ['确定本周最重要的两件事','核对长中文行动标题与资料路径，保留上下文并确认下一步'].entries()) await r.save({description,status:'todo',focusPosition:i+1}); document.querySelector('[data-view=focus]').click()")
 w("document.querySelectorAll('.focus-row').length===2")
 state=subprocess.run(['orca','computer','get-app-state','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
 (Path('docs/validation/issue45')/(phase+'-native-ax.json')).write_text(state.stdout)
 c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue45')/(phase+'-native-desktop.png'))
 rect=c("const r=document.querySelector('.row-menu summary').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2+32}")
 result=subprocess.run(['orca','computer','click','--x',str(rect['x']),'--y',str(rect['y']),'--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
 (Path('docs/validation/issue45')/(phase+'-native-pointer.json')).write_text(result.stdout)
 assert json.loads(result.stdout)['ok'],result.stdout
 w("document.querySelector('.row-menu').open")
 c("document.querySelector('.row-menu summary').focus()")
 result=subprocess.run(['orca','computer','press-key','--key','Space','--restore-window','--app','pid:'+str(process.pid),'--json'],capture_output=True,text=True)
 (Path('docs/validation/issue45')/(phase+'-native-keyboard-space.json')).write_text(result.stdout)
 w("!document.querySelector('.row-menu').open")
 c("document.querySelector('.row-menu summary').click()")
 c("[...document.querySelectorAll('.row-menu button')].find(b=>b.textContent==='下移').click()")
 w("document.querySelector('.focus-row-open h3').textContent.startsWith('核对')")
 c("document.querySelector('.row-menu summary').click();document.querySelector('.row-menu button').click()")
 w("document.querySelectorAll('.focus-row').length===1")
 c("document.querySelector('.focus-row-open').click()")
 w("!document.querySelector('#action-editor').hidden")
 c("document.querySelector('[data-view=focus]').click()")
 w("document.querySelectorAll('.focus-row').length===1")
 c('__narrow'); c('__snapshot');shutil.copy(m.OUT/'snapshot.png',Path('docs/validation/issue45')/(phase+'-native-393.png'))
 assert c("return document.documentElement.scrollWidth<=innerWidth")
 (Path('docs/validation/issue45')/(phase+'-native.json')).write_text(json.dumps({'engine':'Cocoa/WKWebView','createPersistedActions':True,'reorder':True,'remove':True,'open':True,'narrow':393,'pid':process.pid,'assets':{a:hashlib.sha256((Path('web')/a).read_bytes()).hexdigest() for a in ['style.css','presentation.js','focus-screen.js']}},indent=2))
 print('PASS native persistence, home open/reorder/remove and 393px')
finally:
 process.terminate();process.wait(timeout=10)
