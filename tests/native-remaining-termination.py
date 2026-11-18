#!/usr/bin/env python3
"""Exercise production window-close and OS-menu quit without native test hooks."""
import argparse, hashlib, json, os, re, shutil, subprocess, time
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
args = parser.parse_args()
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=False)
evidence = out
window_probe = out/'owned-windows'
subprocess.run(['swiftc','-module-cache-path','build/swift-cache','tests/native-owned-windows.swift','-o',str(window_probe)],check=True)
app = out / 'Forms48Production.app'
shutil.copytree('dist/LocalNotes.app', app, dirs_exist_ok=True)
subprocess.run(['/usr/libexec/PlistBuddy', '-c', 'Set :CFBundleIdentifier dev.localnotes.validation.issue48productionfinal', str(app/'Contents/Info.plist')], check=True)
subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(app)], check=True)
hashes = {str(path.relative_to('web')): hashlib.sha256(path.read_bytes()).hexdigest() for path in Path('web').rglob('*') if path.is_file()}
assert all(hashlib.sha256((app/'Contents/Resources/web'/name).read_bytes()).hexdigest() == digest for name,digest in hashes.items())
(out/'source-hashes.json').write_text(json.dumps(hashes, indent=2)+'\n')
for folder in ['Sync', 'Private']: (out/folder).mkdir(exist_ok=True)
p = subprocess.Popen([str(app/'Contents/MacOS/LocalNotes')], env={**os.environ, 'LOCAL_NOTES_TEST_ROOT': str(out/'Sync'), 'LOCAL_NOTES_TEST_PRIVATE': str(out/'Private')}, stdout=open(out/'app.log', 'w'), stderr=subprocess.STDOUT)
(out/'pid').write_text(str(p.pid))
def ax(script, wait=True):
    args=['osascript', '-e', f'tell application "System Events" to tell (first application process whose unix id is {p.pid})', '-e', script, '-e', 'end tell']
    return subprocess.run(args, capture_output=True, text=True, check=True).stdout if wait else subprocess.Popen(args, stdout=open(out/'action.log','a'), stderr=subprocess.STDOUT)
def state(name=None):
    command=['orca','computer','get-app-state','--app',f'pid:{p.pid}','--json']
    response=subprocess.run(command,capture_output=True,text=True)
    result=json.loads(response.stdout)
    (out/'last-state-command.json').write_text(json.dumps(command)+'\n')
    (out/'last-state.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    if not result.get('ok'):
        if result.get('error',{}).get('code') in ['app_not_found','window_not_found']: raise LookupError(json.dumps(result,ensure_ascii=False))
        raise RuntimeError(json.dumps(result,ensure_ascii=False))
    if name: (evidence/name).write_text(json.dumps(result,ensure_ascii=False,indent=2))
    return result['result']['snapshot']['treeText']
def click(label):
    tree=state(); match=re.search(r'^\s*(\d+) button '+re.escape(label)+r'$',tree,re.M);assert match,tree
    subprocess.run(['orca','computer','click','--app',f'pid:{p.pid}','--element-index',match[1],'--json'],capture_output=True,check=True)
def alert(expected, filename):
    for _ in range(50):
        text=ax('get value of every static text of window 1')
        if expected in text: break
        time.sleep(.1)
    assert expected in text,text
    (evidence/filename).write_text(text)
    ax('set frontmost to true\nperform action "AXRaise" of window 1')
    target=None
    for _ in range(3):
        windows=json.loads(subprocess.run(['orca','computer','list-windows','--app',f'pid:{p.pid}','--json'],capture_output=True,text=True,check=True).stdout)['result']['windows']
        target=next((window for window in windows if window['title']==''),None)
        if target: break
        time.sleep(.1)
    destination=evidence/(Path(filename).stem+'.png')
    if target:
        capture=json.loads(subprocess.run(['orca','computer','get-app-state','--app',f'pid:{p.pid}','--window-id',str(target['id']),'--json'],capture_output=True,text=True,check=True).stdout)
        assert capture['ok'] and expected in capture['result']['snapshot']['treeText']
        shutil.copy(capture['result']['screenshot']['path'],destination)
    else:
        # AppKit may place this real modal panel at layer 8. Orca only lists
        # layer-zero windows; discover this PID's exact observed alert frame.
        frame=[int(value.strip()) for value in ax('get {position, size} of window 1').strip().split(',')]
        owned=json.loads(subprocess.run([str(window_probe),str(p.pid)],capture_output=True,text=True,check=True).stdout)
        target=next((window for window in owned if window.get('kCGWindowIsOnscreen') and [window['kCGWindowBounds'][key] for key in ['X','Y','Width','Height']]==frame),None)
        assert target,owned
        subprocess.run(['screencapture','-x','-o','-l'+str(target['kCGWindowNumber']),str(destination)],check=True)
        assert destination.stat().st_size>0
        capture={'engine':'macOS screencapture','ownedWindow':target,'assertedAlertText':text,'reason':'Orca omitted the modal panel from its layer-zero enumeration'}
    (evidence/(Path(filename).stem+'.json')).write_text(json.dumps(capture,ensure_ascii=False,indent=2)+'\n')
    ax('click button "确定" of window 1')
    time.sleep(.4)
try:
    for _ in range(50):
        try:
            if 'button 事项' in state(): break
        except (KeyError, LookupError, subprocess.CalledProcessError): pass
        time.sleep(.1)
    click('随手记')
    subprocess.run(['orca','computer','type-text','--app',f'pid:{p.pid}','--text','最终生产路径守卫','--json'],capture_output=True,check=True)
    ax('set frontmost to true')
    close=ax('click (first button of window 1 whose subrole is "AXCloseButton")',False)
    alert('还有内容未保存','final-production-close-alert.txt');close.wait(timeout=10)
    assert '最终生产路径守卫' in state('final-production-after-close.json')
    quit_action=ax('set frontmost to true\nclick menu bar item "LocalNotes" of menu bar 1\nclick menu item "退出拾记" of menu 1 of menu bar item "LocalNotes" of menu bar 1',False)
    alert('还有内容未保存，请先处理保存提示。','final-production-quit-alert.txt');quit_action.wait(timeout=10)
    assert '最终生产路径守卫' in state('final-production-after-quit.json')
    click('创建笔记')
    records=list((out/'Sync/Notes').glob('*.md'));assert len(records)==1
    assert '最终生产路径守卫' in records[0].read_text()
    ax('set frontmost to true\nclick menu bar item "LocalNotes" of menu bar 1\nclick menu item "退出拾记" of menu 1 of menu bar item "LocalNotes" of menu bar 1')
    assert p.wait(timeout=10)==0
    (evidence/'final-production-result.json').write_text(json.dumps({'windowCloseAlert':True,'osMenuQuitAlert':True,'continuedDraft':True,'realPersistedRecord':True,'cleanOSMenuExitCode':0},indent=2))
    print('PASS production native window close, OS-menu quit, continued draft, real save and clean exit 0')
finally:
    if p.poll() is None: p.terminate();p.wait(timeout=10)
