#!/usr/bin/env python3
"""Real WeType IME and OS editing shortcuts against the isolated packaged app.

Run build:mac then tests/native-search.py first to package the unchanged native
code with its existing test-only inspection channel. No DOM composition or
keyboard events are synthesized. The original input source is always restored.
For issue60, set SEARCH_NATIVE_DIR=build/issue60-native,
SEARCH_NATIVE_APP=Search60.app, SEARCH_IME_SOURCE_RETURN=1 and SEARCH_IME_OUT.
"""
import sys
sys.dont_write_bytecode=True
import importlib.util,json,os,subprocess,time,hashlib,shutil
from pathlib import Path
spec=importlib.util.spec_from_file_location('probe',Path('tests/native-candidate-review.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.OUT=Path(os.environ.get('SEARCH_NATIVE_DIR','build/issue58-native')).resolve();app=m.OUT/os.environ.get('SEARCH_NATIVE_APP','Search58.app');out=Path(os.environ.get('SEARCH_IME_OUT','build/issue58-ime')).resolve();out.mkdir(parents=True,exist_ok=True)
source_return=os.environ.get('SEARCH_IME_SOURCE_RETURN')=='1'
helper=out/'input-source'
subprocess.run(['swiftc','-module-cache-path','build/swift-cache','tests/InputSourceHarness.swift','-o',str(helper)],check=True)
inventory=subprocess.check_output([str(helper)]).decode();initial=inventory.splitlines()[0]
(out/'initial-input-sources.txt').write_text(inventory)
ime_source=os.environ.get('SEARCH_IME_SOURCE','com.tencent.inputmethod.wetype.pinyin')
assert any(line.startswith(ime_source+' | ') for line in inventory.splitlines()[1:]), 'Requested IME is not installed'
if source_return:
 (m.OUT/'Sync/ime-origin.md').write_text('# IME draft origin\n\nSaved baseline',encoding='utf8')
head=subprocess.check_output(['git','rev-parse','HEAD']).decode().strip()
assets=app/'Contents/Resources/web'
hashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('web').glob('*') if p.is_file()}
assert all(hashlib.sha256((assets/Path(name).name).read_bytes()).hexdigest()==digest for name,digest in hashes.items())
process=subprocess.Popen([str(app/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(m.OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(m.OUT/'Private'),'REVIEW_PROBE':str(m.OUT)},stdout=open(out/'app.log','w'),stderr=subprocess.STDOUT)
log=[];passed=False;restored=False
def c(script):
 value=m.command(script);log.append({'script':script,'value':value});(out/'ime-transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2));return value
def w(expression):
 deadline=time.monotonic()+20
 while time.monotonic()<deadline:
  if m.command('return '+expression): log.append({'assertion':expression,'passed':True});return
  time.sleep(.1)
 raise AssertionError('Native IME timed out: '+expression+'; state='+json.dumps(c("return {focused:document.hasFocus(),active:document.activeElement.id,open:document.querySelector(\"#global-search\").open,value:document.querySelector(\"#global-search-input\").value,events:window.imeEvents}"),ensure_ascii=False))
def key(code,mods=''):
 subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid}) to set frontmost to true','-e','delay 0.1','-e',f'tell application "System Events" to key code {code}'+mods],check=True)
 log.append({'OSKeyCode':code,'modifiers':mods,'targetPid':process.pid});time.sleep(.1)
try:
 w("!!document.querySelector('.home-tools')")
 if source_return:
  c("document.querySelector('nav [data-view=notes]').click()")
  w("!document.querySelector('#library-tools').hidden")
  c("const input=document.querySelector('#search');input.value='IME draft origin';input.dispatchEvent(new Event('input'))")
  w("!!document.querySelector('#items [data-path=\"ime-origin.md\"]')")
  c("document.querySelector('#items [data-path=\"ime-origin.md\"]').click()")
  w("document.querySelector('#file-path').textContent==='ime-origin.md'")
  c("const body=document.querySelector('#body');body.value='Uncommitted IME origin draft';body.dispatchEvent(new Event('input',{bubbles:true}));body.setSelectionRange(3,9,'backward');document.querySelector('#global-search-open').click()")
  w("document.querySelector('#global-search').open && document.activeElement.id==='global-search-input'")
 key(40,' using command down');w("document.activeElement.id==='global-search-input'")
 c("window.imeEvents=[];for(const type of ['compositionstart','compositionupdate','compositionend','beforeinput','input','keydown'])document.querySelector('#global-search-input').addEventListener(type,e=>imeEvents.push({type:e.type,key:e.key,data:e.data,inputType:e.inputType,isComposing:e.isComposing,isTrusted:e.isTrusted,value:e.target.value}))")
 log.append({'selectIME':subprocess.check_output([str(helper),ime_source]).decode()})
 for code in [6,4,31,45,5,13,14,45]: key(code)
 c("return {value:document.querySelector('#global-search-input').value,events:imeEvents,dialog:document.querySelector('#global-search').open}")
 key(49)
 w("/[\u3400-\u9fff]/.test(document.querySelector('#global-search-input').value) && imeEvents.some(e=>e.type==='compositionend'&&e.data===document.querySelector('#global-search-input').value&&e.isTrusted)")
 c("return {value:document.querySelector('#global-search-input').value,events:imeEvents,dialog:document.querySelector('#global-search').open}")
 # Candidate handling and Escape must remain owned by the actual input method.
 key(0,' using command down');key(51)
 for code in [45,34,4,0,31]:key(code)
 w("imeEvents.filter(e=>e.type==='compositionstart'&&e.isTrusted).length>=2")
 key(53)
 escapeKeptOpen=c("return document.querySelector('#global-search').open");log.append({'imeEscapeKeptDialogOpen':escapeKeptOpen})
 assert escapeKeptOpen, 'IME cancellation Escape dismissed search'
 key(53);w("!document.querySelector('#global-search').open");key(40,' using command down');w("document.activeElement.id==='global-search-input'")
 c("return {afterCompositionEscape:document.querySelector('#global-search-input').value,events:imeEvents}")

 key(0,' using command down');key(51)
 for code in [6,4,31,45,5,13,14,45]:key(code)
 key(125);key(36)
 w("document.querySelector('#global-search').open && imeEvents.filter(e=>e.type==='compositionend'&&e.isTrusted).length>=3")
 c("return {afterCandidateDownEnter:document.querySelector('#global-search-input').value,events:imeEvents}")
 log.append({'restoreABCForEditing':subprocess.check_output([str(helper),'com.apple.keylayout.ABC']).decode()})
 key(0,' using command down');key(51)
 for code in [37,0,17,14,45,8,16]:key(code)
 w("document.querySelector('#global-search-input').value==='latency'")
 if source_return:
  c("document.querySelector('[data-scope=note]').click()")
  w("document.querySelectorAll('.search-result').length===1 && !document.querySelector('.search-results').inert")
  c("[...document.querySelectorAll('#global-search button')].find(n=>n.textContent==='打开原文').focus()")
  key(36);w("!!document.querySelector('#task-leave-decision')")
  c("[...document.querySelectorAll('#task-leave-decision button')].find(n=>n.textContent==='继续编辑').focus()")
  key(36);w("document.querySelector('#global-search').open && !document.querySelector('#task-leave-decision')")
  assert c("return document.querySelector('#body').value")=='Uncommitted IME origin draft'
  assert 'Uncommitted' not in (m.OUT/'Sync/ime-origin.md').read_text()
  w("document.querySelector('#global-search-input').value==='latency'")
  c("[...document.querySelectorAll('#global-search button')].find(n=>n.textContent==='打开原文').focus()")
  key(36);w("!!document.querySelector('#task-leave-decision')")
  c("[...document.querySelectorAll('#task-leave-decision button')].find(n=>n.textContent==='保存并离开').focus()")
  key(36);w("document.querySelector('#file-path').textContent==='source.md' && !document.querySelector('#reading').hidden")
  assert 'Uncommitted IME origin draft' in (m.OUT/'Sync/ime-origin.md').read_text()
  c("[...document.querySelectorAll('.search-return')].find(n=>!n.hidden&&n.getClientRects().length).focus()")
  key(36);w("document.querySelector('#global-search').open && document.querySelector('#global-search-input').value==='latency'")
  assert c("return document.querySelector('#body').value")=='Uncommitted IME origin draft'
  assert c("return [document.querySelector('#body').selectionStart,document.querySelector('#body').selectionEnd,document.querySelector('#body').selectionDirection]")==[3,9,'backward']
  log.append({'sourceReturnDraftAndSelectionPreserved':True})
  c("document.querySelector('#global-search-input').focus()")
  key(0,' using command down');key(51)
  log.append({'IMEAfterSourceReturn':subprocess.check_output([str(helper),ime_source]).decode()})
  c("window.afterReturnIMEStart=imeEvents.filter(e=>e.type==='compositionstart'&&e.isTrusted).length;window.afterReturnIMEEnd=imeEvents.filter(e=>e.type==='compositionend'&&e.isTrusted).length")
  for code in [6,4,31,45,5,13,14,45]:key(code)
  key(49)
  w("imeEvents.filter(e=>e.type==='compositionend'&&e.isTrusted).length>afterReturnIMEEnd && /[\u3400-\u9fff]/.test(document.querySelector('#global-search-input').value)")
  key(0,' using command down');key(51)
  for code in [45,34,4,0,31]:key(code)
  w("imeEvents.filter(e=>e.type==='compositionstart'&&e.isTrusted).length>=afterReturnIMEStart+2")
  key(53);w("document.querySelector('#global-search').open && document.activeElement.id==='global-search-input'")
  log.append({'actualIMECancelAfterSourceReturnKeptSearch':True})
  c('__snapshot');shutil.copyfile(m.OUT/'native.png',out/'after-return-ime-cancel.png')
  c("return {afterSourceReturnComposition:imeEvents,query:document.querySelector('#global-search-input').value,draft:document.querySelector('#body').value}")
  key(53);w("!document.querySelector('#global-search').open")
  assert c("return document.querySelector('#body').value")=='Uncommitted IME origin draft'
  key(40,' using command down');w("document.activeElement.id==='global-search-input'")
  log.append({'ABCForPostReturnEditing':subprocess.check_output([str(helper),'com.apple.keylayout.ABC']).decode()})
  key(0,' using command down');key(51)
  for code in [37,0,17,14,45,8,16]:key(code)
  w("document.querySelector('#global-search-input').value==='latency'")
 key(0,' using command down');key(8,' using command down')
 assert subprocess.check_output(['pbpaste']).decode()=='latency'
 log.append({'nativeSelectAllCopyReadback':'latency'})
 key(7,' using command down');w("document.querySelector('#global-search-input').value===''")
 key(9,' using command down');w("document.querySelector('#global-search-input').value==='latency'")
 key(6,' using command down');w("document.querySelector('#global-search-input').value===''")
 key(9,' using command down');w("document.querySelector('#global-search-input').value==='latency'")
 key(123,' using command down');w("document.querySelector('#global-search-input').selectionStart===0")
 key(124,' using {command down, shift down}');key(8,' using command down')
 assert subprocess.check_output(['pbpaste']).decode()=='latency'
 log.append({'nativeLineSelectionCopyReadback':'latency'})
 key(124);key(51,' using option down');w("document.querySelector('#global-search-input').value===''")
 w("document.querySelector('#global-search').open && document.activeElement.id==='global-search-input'")
 c("return {finalEvents:imeEvents,focused:document.activeElement.id,open:document.querySelector('#global-search').open}")
 key(53);w("!document.querySelector('#global-search').open")
 passed=escapeKeptOpen
except BaseException as error:
 log.append({'failure':str(error),'type':type(error).__name__})
 raise
finally:
 try:
  restore=subprocess.check_output([str(helper),initial]).decode()
  current=subprocess.check_output([str(helper)]).decode().splitlines()[0]
  restored=current==initial
  log.append({'restoreInitialInputSource':restore,'initial':initial,'actual':current,'verified':restored})
  assert restored, 'Original input source was not restored'
 finally:
  process.terminate();process.wait(timeout=10)
  (out/'ime-transcript.json').write_text(json.dumps(log,ensure_ascii=False,indent=2))
  (out/'native-ime-result.json').write_text(json.dumps({'passed':passed and restored,'head':head,'inputMethod':ime_source,'initialInputSource':initial,'restored':restored,'sourceReturn':source_return,'sourceHashes':hashes,'probeHash':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'log':log},ensure_ascii=False,indent=2))

if passed and restored: print('PASS actual IME composition/commit/cancel and native editing shortcuts'+('; source return, draft/selection and post-return IME Escape' if source_return else '')+'; original input source restored')
