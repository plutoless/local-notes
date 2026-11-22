#!/usr/bin/env python3
"""Issue 86 uses the verified issue81 native route with an isolated conflict journey.

Run only under an exclusive coordinator GUI lease. DOM commands seed fixtures,
inspect state and scroll targets; pointer and keyboard actions use the external
OS sender and require receiver-side trusted events and Quartz/Cocoa receipts.
"""
from pathlib import Path
import os
os.environ['EXTERNAL_INPUT'] = '1'
# Reuse the maintained route diagnosis/bootstrap without running its browse journey.
route_path = Path(__file__).with_name('native-browse-focus.py')
route_source = route_path.read_text()
boundary = '\ntry:\n process=subprocess.Popen'
assert route_source.count(boundary) == 1, 'Native route bootstrap boundary changed'
bootstrap = route_source.split(boundary)[0].replace('issue81', 'issue86').replace('Browse81', 'Sync86')
exec(compile(bootstrap, str(route_path), 'exec'), globals())
try:
 process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(m.OUT/'app.log','w'),stderr=subprocess.STDOUT)
 w("!!document.querySelector('.home-tools')");c('__focus');time.sleep(1)
 host=c('__host');owned_window=host['windowNumber']
 log.append({'preflight':host,'pid':process.pid,'routeBootstrapSHA256':hashlib.sha256(route_path.read_bytes()).hexdigest()})
 assert host['active'] and host['key'] and host['visible'] and not host['occluded']
 c('__route')
 c("window.inputEvents=[];for(const type of ['pointerdown','keydown','click'])document.addEventListener(type,e=>inputEvents.push({type,key:e.key,shift:e.shiftKey,meta:e.metaKey,ctrl:e.ctrlKey,alt:e.altKey,trusted:e.isTrusted,matchesExpectedTarget:!!window.nativeInputTargetSelector&&!!document.querySelector(window.nativeInputTargetSelector)?.contains(e.target),matchesExpectedKeyTarget:e.target===window.nativeKeyTarget}),true)")
 # Actual repositories and native bridge persist immutable synthetic fork files.
 c("const {native}=await import('./bridge.js');const {ActionRepository}=await import('./actions.js');window.syncRepo=new ActionRepository(native);await syncRepo.open();window.syncBase=(await syncRepo.save({description:'核对同步冲突与来源保留的长中文行动'.repeat(5)})).record;window.syncLeft=(await syncRepo.save({...syncBase,description:'人工核对的本地版本'},syncBase)).record;window.syncRight={...syncBase,revision:crypto.randomUUID(),parents:[syncBase.revision],description:'另一设备的保留版本'};await native('actionWrite',{workspaceId:syncRepo.workspaceId,path:`revisions/${syncBase.entityId}/${syncRight.revision}.json`,text:JSON.stringify(syncRight)});window.sourceEvidence=await native('read',{workspaceId:syncRepo.workspaceId,path:'note-00.md'})")
 source_hash=hashlib.sha256((m.OUT/'Sync/note-00.md').read_bytes()).hexdigest()
 c("[...document.querySelectorAll('nav button')].find(n=>n.textContent.includes('同步检查')).id='native-sync-open'")
 click('#native-sync-open');w("!!document.querySelector('.sync-panel article') && document.querySelector('.sync-panel').getAttribute('aria-busy')==='false'")
 c("document.querySelector('.sync-version button').id='native-version'")
 click('#native-version');state('pointer-selected')
 assert c("return document.querySelector('#native-version').getAttribute('aria-pressed')==='true'")
 # DOM focus is setup only; actual Shift+Tab/Tab establishes keyboard modality.
 c("document.querySelector('#native-version').focus()")
 key('Shift+Tab');key('Tab');state('selected-keyboard')
 assert c("return document.activeElement.id==='native-version' && document.activeElement.matches(':focus-visible')")
 key('Tab');state('resolution-field')
 c("const n=document.querySelector('.sync-panel [aria-label=\"合并版本 JSON\"]');n.closest('details').open=true;n.value='{bad json';n.dispatchEvent(new Event('input',{bubbles:true}));n.id='native-json'")
 click('#native-json');key('Tab');key('Shift+Tab');state('invalid-focused')
 assert c("return document.activeElement.id==='native-json' && document.activeElement.getAttribute('aria-invalid')==='true' && document.activeElement.matches(':focus-visible')")
 # Discard returns to the exact selected version control; immutable forks remain.
 c("[...document.querySelectorAll('.sync-panel button')].find(n=>n.textContent==='放弃编辑').id='native-discard'")
 click('#native-discard');state('discard-return')
 assert c("return document.activeElement.dataset.revision===syncLeft.revision || document.activeElement.dataset.revision===syncRight.revision || document.activeElement.dataset.revision===syncBase.revision")
 c("document.querySelector('.sync-version button').id='native-version'")
 key('Return')
 c("const n=document.querySelector('.sync-editor textarea');n.value='人工合并并保留来源';n.dispatchEvent(new Event('input',{bubbles:true}));[...document.querySelectorAll('.sync-panel button')].find(n=>n.textContent==='3. 保存解决结果到本地').id='native-save'")
 click('#native-save');w("document.querySelector('.sync-panel').textContent.includes('现有版本中未发现待处理冲突。')")
 outcome=c("await syncRepo.recover();const history=await syncRepo.history(syncBase.entityId);return {history,record:(await syncRepo.query()).actions.find(n=>n.entityId===syncBase.entityId),expected:[syncLeft.revision,syncRight.revision]}")
 assert len(outcome['history'])==4 and set(outcome['record']['parents'])==set(outcome['expected']) and outcome['record']['description']=='人工合并并保留来源'
 log.append({'storageReadback':outcome})
 c("document.querySelector('.sync-panel button').focus()")
 key('Shift+Tab');state('modal-last');key('Tab');state('modal-first')
 assert c("return document.activeElement===document.querySelector('.sync-panel button')")
 key('Escape');w("!document.querySelector('.sync-panel').open");state('keyboard-opener-return')
 assert c("return document.activeElement.id==='native-sync-open' && document.activeElement.matches(':focus-visible')")
 assert hashlib.sha256((m.OUT/'Sync/note-00.md').read_bytes()).hexdigest()==source_hash
 log.append({'sourcePreservedSHA256':source_hash,'input':'External OS-injected pointer/keyboard; DOM setup/inspection explicitly separated; physical input unrun'})
 print('PASS native sync selected/invalid/discard/save/containment/return and immutable storage readback')
finally:
 log.append({'provenance':{'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'pid':process.pid if process else None,'applicationPath':str(m.APP),'executableSHA256':hashlib.sha256((m.APP/'Contents/MacOS/LocalNotes').read_bytes()).hexdigest(),'probeSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'hostSHA256':hashlib.sha256((m.OUT/'main.swift').read_bytes()).hexdigest(),'senderSourceSHA256':hashlib.sha256(Path(__file__).with_name('native-browse-input.swift').read_bytes()).hexdigest(),'senderSHA256':hashlib.sha256(sender.read_bytes()).hexdigest(),'sourcePackage':{p.name:{'source':hashlib.sha256(p.read_bytes()).hexdigest(),'package':hashlib.sha256((m.APP/'Contents/Resources/web'/p.name).read_bytes()).hexdigest()} for p in Path('web').glob('*') if p.is_file()},'clipboard':'untouched','inputSource':'untouched'}})
 if process:
  process.terminate();process.wait(timeout=10)
  log.append({'ownedPID':process.pid,'waitExit':process.returncode,'absent':subprocess.run(['kill','-0',str(process.pid)],capture_output=True).returncode!=0})
 (out/'transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
