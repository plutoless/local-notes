#!/usr/bin/env python3
"""Issue 85: reuse issue81's owned-window input recorder with isolated Organization storage.

Requires an explicit coordinator GUI lease. DOM commands establish fixtures and
inspect state; only external sender receipts establish OS input coverage.
"""
import os
from pathlib import Path
if not os.environ.get('GUI_LEASE') and not os.environ.get('NATIVE_BUILD_ONLY'):
    raise SystemExit('Explicit coordinator GUI_LEASE required; no host launched')
os.environ['EXTERNAL_INPUT'] = '1'
os.environ['NATIVE_EVIDENCE_DIR'] = 'build/issue85-native'
# Reuse the maintained route diagnosis, builder, event recorder and sender helpers.
# Stop before its browse-specific runner; this file owns the Organization journey.
browse = Path(__file__).with_name('native-browse-focus.py')
shared = browse.read_text().split('\ntry:\n process=subprocess.Popen', 1)
assert len(shared) == 2
prefix = shared[0].replace('issue81', 'issue85')
prefix = prefix.replace('"Tab":CGKeyCode(48)', '"Space":CGKeyCode(49),"Tab":CGKeyCode(48)')
prefix = prefix.replace('"Tab":"\\\\t"', '"Space":" ","Tab":"\\\\t"')
prefix = prefix.replace("'Tab':('Tab',False,False)", "'Space':(' ',False,False),'Tab':('Tab',False,False)")
exec(compile(prefix, str(browse), 'exec'), globals())
import threading
from http.server import HTTPServer
server = HTTPServer(('127.0.0.1', 0), m.Service)
threading.Thread(target=server.serve_forever, daemon=True).start()
# Synthetic configuration exists only in this run's isolated private root.
(m.OUT/'Private/ai-service.json').write_text(json.dumps(dict(address=f'http://127.0.0.1:{server.server_port}',model='synthetic-controlled',token='synthetic-review-key')))
source_hashes = {str(p.relative_to(m.OUT/'Sync')):hashlib.sha256(p.read_bytes()).hexdigest() for p in (m.OUT/'Sync').glob('*.md')}
try:
 process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','w'),stderr=subprocess.STDOUT)
 w("!!document.querySelector('.home-tools')");c('__focus');time.sleep(1)
 host=c('__host');owned_window=host['windowNumber']
 log.append({'preflight':host,'pid':process.pid,'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()})
 assert host['active'] and host['key'] and host['visible'] and not host['occluded']
 c("window.inputEvents=[];for(const type of ['pointerdown','keydown','click'])document.addEventListener(type,e=>inputEvents.push({type,key:e.key,shift:e.shiftKey,meta:e.metaKey,ctrl:e.ctrlKey,alt:e.altKey,trusted:e.isTrusted,matchesExpectedTarget:!!window.nativeInputTargetSelector&&!!document.querySelector(window.nativeInputTargetSelector)?.contains(e.target),matchesExpectedKeyTarget:e.target===window.nativeKeyTarget}),true)")
 click('[data-view=organize]');w("document.querySelectorAll('#ai-selection input').length===50")
 click('#ai-selection input');assert c("return document.querySelector('#ai-selection input').checked")
 assert not c("return document.querySelector('#ai-selection input').matches(':focus-visible')")
 state('checked-pointer');key('Tab');key('Shift+Tab')
 assert c("return document.querySelector('#ai-selection input')===document.activeElement && document.activeElement.matches(':focus-visible')")
 state('checked-keyboard');key('Space');assert not c("return document.querySelector('#ai-selection input').checked")
 key('Space');click('#ai-preview');w("document.querySelector('#ai-status').textContent.includes('预览已就绪')")
 assert not (m.OUT/'request.json').exists()
 click('#ai-send');w("document.querySelectorAll('.suggestion-card').length===8")
 # Review source detour: real control activation, source read, back and focus restoration.
 source_selector='.suggestion-card:first-child > button'
 click(source_selector);w("!document.querySelector('#editor').hidden")
 click('#back');w("!document.querySelector('#organize-tools').hidden && document.activeElement.getAttribute('aria-label')?.startsWith('打开来源：')")
 state('source-return-pointer');key('Tab');state('review-keyboard')
 # Confirm one candidate only through its actual focused action.
 confirm='.suggestion-card:first-child .organization-actions button'
 c('document.querySelector('+json.dumps(confirm)+').focus()')
 key('Tab');key('Shift+Tab');key('Return')
 w("document.querySelector('.suggestion-card').textContent.includes('处理决定：确认，已保存')")
 w("document.activeElement.matches('.suggestion-card')")
 state('confirmed-keyboard')
 for width,height in [(1180,800),(393,650),(1180,480)]:
  c(f'__size:{width},{height}');assert c('return document.documentElement.scrollWidth<=innerWidth');state(f'confirmed-{width}-{height}')
 assert json.loads((m.OUT/'request.json').read_text())['authValid']
 assert source_hashes == {str(p.relative_to(m.OUT/'Sync')):hashlib.sha256(p.read_bytes()).hexdigest() for p in (m.OUT/'Sync').glob('*.md')}
 log.append({'result':'PASS native Organization pointer/keyboard/Space/preview/send/source-return/individual confirmation','sourceHashes':source_hashes,'clipboard':'untouched','inputSource':'untouched','physicalInput':'unrun','setup':'DOM focus only before real Tab/Shift+Tab/Return; fixture service at loopback only'})
 print(log[-1]['result'])
finally:
 server.shutdown();server.server_close()
 if process:process.terminate();process.wait(timeout=10)
 absent=process is None or subprocess.run(['kill','-0',str(process.pid)],capture_output=True).returncode!=0
 log.append({'cleanup':{'pid':process.pid if process else None,'exit':process.returncode if process else None,'waited':True,'absent':absent,'clipboard':'untouched','inputSource':'untouched'},'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'probeHashes':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__),browse,Path(__file__).with_name('native-browse-input.swift'),m.OUT/'main.swift']},'sourcePackage':{p.name:{'source':hashlib.sha256(p.read_bytes()).hexdigest(),'package':hashlib.sha256((m.APP/'Contents/Resources/web'/p.name).read_bytes()).hexdigest()} for p in Path('web').glob('*') if p.is_file()}})
 (out/'transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
 assert absent
