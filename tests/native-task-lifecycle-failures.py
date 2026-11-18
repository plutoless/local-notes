#!/usr/bin/env python3
"""Cocoa/WKWebView bridge replay and injected content-loss delegate coverage.

This is a test-only command channel and accepted-token log. Native menu/window
requests use real AppKit paths. Content-process loss is a delegate simulation,
not evidence that an actual WebKit crash was induced.
"""
import argparse, importlib.util, inspect, json, os, subprocess, sys, time
sys.dont_write_bytecode = True
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=False)
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('native-candidate-review.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);m.OUT=out;m.APP=out/'Task55Recovery.app'
for folder in ['Sync','Private']:(out/folder).mkdir()
exec(inspect.getsource(m.build).replace('dev.localnotes.validation.issue7','dev.localnotes.validation.issue55recovery'),m.__dict__);m.build()
p=out/'main.swift';source=p.read_text()
source=source.replace('let wrapped =', '''if script == "__contentLoss" {
 try? Data("{\\"ok\\":true}".utf8).write(to:reviewProbe.directory.appendingPathComponent("response.json"))
 DispatchQueue.main.async { if let owner = self { owner.webViewWebContentProcessDidTerminate(owner.web) } }; return
}
let wrapped =''')
source=source.replace('''        leaveToken = nil
        if terminationPending''','''        let event: [String: Any] = ["token":token,"allowed":allowed,"terminationPending":terminationPending]
        let destination = reviewProbe.directory.appendingPathComponent("accepted.json")
        var events = ((try? Data(contentsOf:destination)).flatMap { try? JSONSerialization.jsonObject(with:$0) } as? [[String:Any]]) ?? []
        events.append(event); try? JSONSerialization.data(withJSONObject:events).write(to:destination,options:.atomic)
        leaveToken = nil
        if terminationPending''')
source=source.replace('Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true)', 'let commandTimer = Timer(timeInterval: 0.05, repeats: true)')
source=source.replace('self?.web.evaluateJavaScript(wrapped, completionHandler: nil)\n            }\n        }', 'self?.web.evaluateJavaScript(wrapped, completionHandler: nil)\n            }\n        }\n        RunLoop.main.add(commandTimer, forMode: .common)\n        RunLoop.main.add(commandTimer, forMode: .modalPanel)')
p.write_text(source)
subprocess.run(['swiftc','-module-cache-path','build/swift-cache',str(p),'mac/AIService.swift','mac/ActionStorage.swift','mac/ActionIndex.swift','mac/ReferenceIndex.swift','mac/ReferenceScan.swift','-lsqlite3','-framework','Cocoa','-framework','WebKit','-o',str(m.APP/'Contents/MacOS/LocalNotes')],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(m.APP)],check=True)
process=subprocess.Popen([str(m.APP/'Contents/MacOS/LocalNotes')],env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(out/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(out/'Private'),'REVIEW_PROBE':str(out)},stdout=open(out/'app.log','w'),stderr=subprocess.STDOUT)
def ax(script):
 return subprocess.run(['osascript','-e',f'tell application "System Events" to tell (first application process whose unix id is {process.pid})','-e',script,'-e','end tell'],capture_output=True,text=True,check=True).stdout
def quit_menu():ax(chr(10).join(['set frontmost to true','click menu bar item "LocalNotes" of menu bar 1','click menu item "退出拾记" of menu 1 of menu bar item "LocalNotes" of menu bar 1']))
def capture_token():m.command('const original=window.requestNativeLeave;window.requestNativeLeave=token=>{window.probeToken=token;original(token)}')
def choose(label):m.command('document.querySelectorAll("#task-leave-decision button").forEach(b=>{if(b.textContent==='+json.dumps(label)+')b.click()})')
try:
 m.wait('document.querySelector("#view-title")?.textContent==="当前重点"');capture_token()
 m.command('document.querySelector("#new").click()');m.wait('document.querySelector("#note-task-drawer").open')
 m.command('const input=document.querySelector("#capture-title");input.value="恢复与过期回复";input.dispatchEvent(new Event("input",{bubbles:true}))')
 quit_menu();m.wait('!!document.querySelector("#task-leave-decision")');token=m.command('return window.probeToken')
 m.command('__contentLoss')
 for _ in range(60):
  text=ax('get value of every static text of window 1')
  if '编辑页面已停止响应' in text:break
  time.sleep(.1)
 assert '编辑页面已停止响应' in text,text
 (out/'content-loss-alert.txt').write_text(text)
 ax('click button "重新载入" of window 1');m.wait('document.querySelector("#view-title")?.textContent==="当前重点"')
 m.command('return (await import("/bridge.js")).native("leaveResult",'+json.dumps({'token':token,'allowed':True})+')');assert process.poll() is None
 capture_token();m.command('document.querySelector("#new").click()');m.wait('document.querySelector("#note-task-drawer").open')
 assert m.command('return document.querySelector("#capture-title").value')=='恢复与过期回复'
 ax('click (first button of window 1 whose subrole is "AXCloseButton")');m.wait('!!document.querySelector("#task-leave-decision")')
 token2=m.command('return window.probeToken');assert token2!=token
 m.command('return (await import("/bridge.js")).native("leaveResult",'+json.dumps({'token':token,'allowed':True})+')')
 assert m.command('return !!document.querySelector("#task-leave-decision")')
 choose('继续编辑');m.wait('!document.querySelector("#task-leave-decision")');assert process.poll() is None
 quit_menu();m.wait('!!document.querySelector("#task-leave-decision")');choose('放弃更改并离开');assert process.wait(timeout=15)==0
 events=json.loads((out/'accepted.json').read_text());assert len(events)==3,events
 assert [event['allowed'] for event in events]==[False,False,True]
 assert [event['terminationPending'] for event in events]==[True,False,True]
 assert len({event['token'] for event in events})==3
 (out/'result.json').write_text(json.dumps({'passed':True,'contentLoss':'injected native delegate callback','staleBridgeRepliesIgnored':2,'acceptedLeaveTokens':3,'terminationReplies':2,'draftRecoveredAfterReload':True,'exitCode':0},indent=2)+'\n')
 print('PASS native injected content-loss callback, reload recovery, stale bridge replies, exactly one reply per pending termination')
finally:
 if process.poll() is None:process.terminate();process.wait(timeout=10)
