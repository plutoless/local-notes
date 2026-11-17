#!/usr/bin/env python3
"""Issue 35 actual WKWebView, isolated storage, loopback-only synthetic service."""
import importlib.util, inspect, json, os, shutil, subprocess, threading
from pathlib import Path
from http.server import HTTPServer
spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('native-candidate-review.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
phase = os.environ.get('PHASE', 'after')
m.OUT = Path.cwd() / ('build/native-issue35-' + phase); m.APP = m.OUT / 'Organization35.app'
if m.OUT.exists(): shutil.rmtree(m.OUT)
m.OUT.mkdir(parents=True, exist_ok=True)
for folder in ['Sync', 'Private']: (m.OUT / folder).mkdir(exist_ok=True)
(m.OUT / 'Sync/evidence.md').write_text('# 隔离样本\n\n历史计划需要核对当前适用性。')
source = inspect.getsource(m.build).replace('dev.localnotes.validation.issue7', 'dev.localnotes.validation.issue35' + phase)
exec(source, m.__dict__)
launch_source = inspect.getsource(m.launch).replace("!!document.querySelector('#items > button')", "document.querySelector('#index-state')?.textContent === ''")
exec(launch_source, m.__dict__); m.build()
generated = m.OUT / 'main.swift'
generated.write_text(generated.read_text().replace('let wrapped =', '''if script == "__snapshot" {
 self?.web.takeSnapshot(with: nil) { image, error in
  if let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) { try? png.write(to: reviewProbe.directory.appendingPathComponent("snapshot.png")) }
  try? JSONSerialization.data(withJSONObject: ["ok": true]).write(to: reviewProbe.directory.appendingPathComponent("response.json"))
 }; return
}
let wrapped ='''))
subprocess.run(['swiftc','-module-cache-path','build/swift-cache',str(generated),'mac/AIService.swift','mac/ActionStorage.swift','mac/ActionIndex.swift','mac/ReferenceIndex.swift','mac/ReferenceScan.swift','-lsqlite3','-framework','Cocoa','-framework','WebKit','-o',str(m.APP/'Contents/MacOS/LocalNotes')], check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)], check=True)
server = HTTPServer(('127.0.0.1', 0), m.Service); threading.Thread(target=server.serve_forever, daemon=True).start()
c, w = m.command, m.wait
process = m.launch()
try:
 c("document.querySelector('[data-view=organize]').click()")
 w("!!document.querySelector('#ai-selection input')")
 c(f"document.querySelector('#ai-address').value='http://127.0.0.1:{server.server_port}';document.querySelector('#ai-model').value='controlled';document.querySelector('#ai-token').value='synthetic-review-key';document.querySelector('#ai-settings').requestSubmit()")
 w("document.querySelector('#ai-status').textContent.includes('设置已保存')")
 c("document.querySelector('#ai-selection input').click();document.querySelector('#ai-preview').click()")
 w("!document.querySelector('#ai-send').disabled")
 assert not (m.OUT/'request.json').exists(), 'Preview must not send'
 c('__snapshot'); shutil.copy(m.OUT/'snapshot.png', Path('docs/validation/issue35')/(phase+'-native.png'))
 c("document.querySelector('#ai-send').click()")
 w("document.querySelectorAll('.suggestion-card').length===8")
 c("window.card=()=>document.querySelectorAll('.suggestion-card')[1];card().querySelector('details').open=true;card().querySelector('textarea').value='原生编辑后的行动';card().querySelector('textarea').dispatchEvent(new Event('input'))")
 if phase != 'before':
  revisions = m.OUT / 'Sync/LocalNotesData/revisions'
  revisions.chmod(0o555)
 c("[...card().querySelectorAll('button')].find(b=>b.textContent==='确认此建议').click()")
 if phase != 'before':
  w("document.querySelector('#ai-status').dataset.state==='failed'")
  assert c("return card().textContent.includes('保存的建议：原生编辑后的行动')")
  revisions.chmod(0o755)
  c("[...card().querySelectorAll('button')].find(b=>b.textContent==='恢复已确认的决定').click()")
 w("card().textContent.includes('处理决定：确认，已保存')")
 process.terminate(); process.wait(timeout=10); process = m.launch()
 c("document.querySelector('[data-view=organize]').click()")
 w("document.querySelector('#ai-results').textContent.includes('保存的建议：原生编辑后的行动')")
 c('__snapshot'); shutil.copy(m.OUT/'snapshot.png', Path('docs/validation/issue35')/(phase+'-native-readback.png'))
 print('PASS actual Cocoa/WKWebView: settings, select/preview without transmission, loopback send, edit/confirm, restart/readback; phase='+phase)
finally:
 if phase != 'before' and 'revisions' in locals(): revisions.chmod(0o755)
 process.terminate(); process.wait(timeout=10); server.shutdown()
