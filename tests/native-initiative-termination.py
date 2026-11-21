#!/usr/bin/env python3
"""Exercise production window-close and OS-menu quit without native test hooks."""
import json, os, re, shutil, subprocess, time
from pathlib import Path
out = Path('build/issue47-production-final').resolve()
if out.exists(): shutil.rmtree(out)
out.mkdir(exist_ok=True)
evidence = Path('docs/validation/issue47')
evidence.mkdir(parents=True, exist_ok=True)
app = out / 'Initiative47Production.app'
shutil.copytree('dist/LocalNotes.app', app, dirs_exist_ok=True)
subprocess.run(['/usr/libexec/PlistBuddy', '-c', 'Set :CFBundleIdentifier dev.localnotes.validation.issue47productionfinal', str(app/'Contents/Info.plist')], check=True)
subprocess.run(['codesign', '--force', '--deep', '--sign', '-', str(app)], check=True)
for folder in ['Sync', 'Private']: (out/folder).mkdir(exist_ok=True)
p = subprocess.Popen([str(app/'Contents/MacOS/LocalNotes')], env={**os.environ, 'LOCAL_NOTES_TEST_ROOT': str(out/'Sync'), 'LOCAL_NOTES_TEST_PRIVATE': str(out/'Private')}, stdout=open(out/'app.log', 'w'), stderr=subprocess.STDOUT)
def ax(script, wait=True):
    args=['osascript', '-e', f'tell application "System Events" to tell (first application process whose unix id is {p.pid})', '-e', script, '-e', 'end tell']
    return subprocess.run(args, capture_output=True, text=True, check=True).stdout if wait else subprocess.Popen(args, stdout=open(out/'action.log','a'), stderr=subprocess.STDOUT)
def state(name=None):
    result=json.loads(subprocess.run(['orca','computer','get-app-state','--app',f'pid:{p.pid}','--json'],capture_output=True,text=True,check=True).stdout)
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
    ax('click button "确定" of window 1')
    time.sleep(.4)
try:
    for _ in range(50):
        try:
            if 'button 事项' in state(): break
        except (KeyError, subprocess.CalledProcessError): pass
        time.sleep(.1)
    click('事项');click('新建事项')
    subprocess.run(['orca','computer','type-text','--app',f'pid:{p.pid}','--text','最终生产路径守卫','--json'],capture_output=True,check=True)
    close=ax('click (first button of window 1 whose subrole is "AXCloseButton")',False)
    alert('还有内容未保存','final-production-close-alert.txt');close.wait(timeout=10)
    assert '最终生产路径守卫' in state('final-production-after-close.json')
    quit_action=ax('set frontmost to true\nclick menu bar item "LocalNotes" of menu bar 1\nclick menu item "退出拾记" of menu 1 of menu bar item "LocalNotes" of menu bar 1',False)
    alert('还有内容未保存，请先处理保存提示。','final-production-quit-alert.txt');quit_action.wait(timeout=10)
    assert '最终生产路径守卫' in state('final-production-after-quit.json')
    click('创建事项')
    records=list((out/'Sync/LocalNotesData/initiatives').glob('*.json'));assert len(records)==1
    assert json.loads(records[0].read_text())['title']=='最终生产路径守卫'
    ax('set frontmost to true\nclick menu bar item "LocalNotes" of menu bar 1\nclick menu item "退出拾记" of menu 1 of menu bar item "LocalNotes" of menu bar 1')
    assert p.wait(timeout=10)==0
    (evidence/'final-production-result.json').write_text(json.dumps({'windowCloseAlert':True,'osMenuQuitAlert':True,'continuedDraft':True,'realPersistedRecord':True,'cleanOSMenuExitCode':0},indent=2))
    print('PASS production native window close, OS-menu quit, continued draft, real save and clean exit 0')
finally:
    if p.poll() is None: p.terminate();p.wait(timeout=10)
