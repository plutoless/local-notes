#!/usr/bin/env python3
"""Isolated real Cocoa/WKWebView review validation with a controlled native service.

Generated test-only Swift adds a file command channel; production sources/assets
are copied unchanged. Pointer/wheel checks are recorded separately with Orca.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / 'build/native-issue7'
APP = OUT / 'Review.app'
class Service(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        fragment = json.loads(body['messages'][1]['content'])
        candidates = [dict(type=kind, content=label, placement='User chooses', reasoning='Selected evidence', relevance='Unknown current relevance', sources=[dict(fragmentId=fragment['fragmentId'], quote=fragment['text'])]) for kind, label in [('initiative','New undertaking'),('action','Confirm edited step'),('action','Ignore this step'),('initiative','Later undertaking'),('action','Reference only'),('action','Attach this step'),('progress','Approved progress'),('topic','New topic')]]
        (OUT / 'request.json').write_text(json.dumps({'body':body,'authValid':self.headers.get('Authorization') == 'Bearer synthetic-review-key'}))
        payload = json.dumps({'choices':[{'message':{'content':json.dumps({'candidates':candidates})}}]}).encode()
        self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(payload)
    def log_message(self, *args): pass

def command(script):
    response = OUT / 'response.json'
    response.unlink(missing_ok=True)
    pending = OUT / 'next.tmp';pending.write_text(script);pending.rename(OUT / 'command.js')
    for _ in range(300):
        if response.exists():
            result=json.loads(response.read_text()); assert result['ok'], result
            return result.get('value')
        time.sleep(.05)
    raise AssertionError('Native command timed out: '+script)
def wait(expression):
    for _ in range(100):
        if command('return '+expression): return
        time.sleep(.1)
    raise AssertionError('Native UI timed out: '+expression)
def launch():
    env={**os.environ,'LOCAL_NOTES_TEST_ROOT':str(OUT/'Sync'),'LOCAL_NOTES_TEST_PRIVATE':str(OUT/'Private'),'REVIEW_PROBE':str(OUT)}
    process=subprocess.Popen([str(APP/'Contents/MacOS/LocalNotes')],env=env,stdout=open(OUT/'app.log','a'),stderr=subprocess.STDOUT)
    wait("!!document.querySelector('#items > button')")
    return process

def build():
    APP.parent.mkdir(parents=True,exist_ok=True)
    if APP.exists():shutil.rmtree(APP)
    shutil.copytree(REPO/'dist/LocalNotes.app',APP)
    source=(REPO/'mac/main.swift').read_text()
    probe='''
final class ReviewProbe: NSObject, WKScriptMessageHandler {
 let directory = URL(fileURLWithPath: ProcessInfo.processInfo.environment["REVIEW_PROBE"]!)
 func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
  let data = try! JSONSerialization.data(withJSONObject: message.body)
  try! data.write(to: directory.appendingPathComponent("response.json"), options: .atomic)
 }
}
let reviewProbe = ReviewProbe()
'''
    source=source.replace('final class Assets:',probe+'\nfinal class Assets:')
    source=source.replace('config.userContentController.add(self,name:"notes")','config.userContentController.add(self,name:"notes"); config.userContentController.add(reviewProbe,name:"reviewProbe")')
    source=source.replace('web.load(URLRequest(url:URL(string:"notes://local/index.html")!))','''web.load(URLRequest(url:URL(string:"notes://local/index.html")!))
        Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            let path = reviewProbe.directory.appendingPathComponent("command.js")
            if let script = try? String(contentsOf: path, encoding: .utf8) {
                try? FileManager.default.removeItem(at: path)
                let wrapped = "(async()=>{" + script + "})().then(value=>window.webkit.messageHandlers.reviewProbe.postMessage({ok:true,value:value??null})).catch(e=>window.webkit.messageHandlers.reviewProbe.postMessage({ok:false,error:String(e)}))"
                self?.web.evaluateJavaScript(wrapped, completionHandler: nil)
            }
        }''')
    generated=OUT/'main.swift';generated.write_text(source)
    subprocess.run(['swiftc','-module-cache-path','build/swift-cache',str(generated),'mac/AIService.swift','mac/ActionStorage.swift','mac/ActionIndex.swift','mac/ReferenceIndex.swift','mac/ReferenceScan.swift','-lsqlite3','-framework','Cocoa','-framework','WebKit','-o',str(APP/'Contents/MacOS/LocalNotes')],cwd=REPO,check=True)
    subprocess.run(['/usr/libexec/PlistBuddy','-c','Set :CFBundleIdentifier dev.localnotes.validation.issue7',str(APP/'Contents/Info.plist')],check=True)
    subprocess.run(['codesign','--force','--deep','--sign','-',str(APP)],check=True)

if __name__ == '__main__':
    OUT.mkdir(parents=True,exist_ok=True); (OUT/'Sync').mkdir(exist_ok=True);(OUT/'Private').mkdir(exist_ok=True)
    (OUT/'Sync/evidence.md').write_text('Explicit selected evidence for review.')
    build()
    server=HTTPServer(('127.0.0.1',0),Service); threading.Thread(target=server.serve_forever,daemon=True).start()
    process=launch()
    try:
        command("document.querySelector('nav [data-view=organize]').click()")
        wait("!!document.querySelector('#ai-selection input')")
        command(f"document.querySelector('#ai-address').value='http://127.0.0.1:{server.server_port}';document.querySelector('#ai-model').value='controlled';document.querySelector('#ai-token').value='synthetic-review-key';document.querySelector('#ai-settings').requestSubmit()")
        wait("document.querySelector('#ai-status').textContent.includes('Settings saved')")
        command("document.querySelector('#ai-selection input').click();document.querySelector('#ai-preview').click()")
        wait("!document.querySelector('#ai-send').disabled")
        assert not (OUT/'request.json').exists(), 'Preview must not send'
        command("document.querySelector('#ai-send').click()")
        wait("document.querySelectorAll('#ai-results article').length===8")
        command("window.reviewCards=()=>[...document.querySelectorAll('#ai-results article')];window.chooseReview=(label,choice,edit)=>{const card=reviewCards().find(c=>c.textContent.includes(label));if(edit){card.querySelector('textarea').value=edit;card.querySelector('textarea').dispatchEvent(new Event('input'));}const select=card.querySelector('select');if(select.options.length>1)select.selectedIndex=1;[...card.querySelectorAll('button')].find(b=>b.textContent===choice).click()}")
        for label,choice,edit in [('New undertaking','Confirm','Edited undertaking'),('Confirm edited step','Confirm','Edited confirmed step'),('Ignore this step','Ignore',None),('Later undertaking','Keep for later',None),('Reference only','Treat as reference',None),('Attach this step','Attach to initiative',None),('Approved progress','Confirm',None),('New topic','Confirm',None)]:
            command('chooseReview('+','.join(json.dumps(x) for x in (label,choice,edit))+')')
            wait("document.querySelectorAll('#ai-results textarea').length==="+str(7-[x[0] for x in [('New undertaking',),('Confirm edited step',),('Ignore this step',),('Later undertaking',),('Reference only',),('Attach this step',),('Approved progress',),('New topic',)]].index(label)))
        records=command("const {native}=await import('./bridge.js');const {CandidateRepository}=await import('./organization.js');const r=new CandidateRepository(native);await r.open();return (await r.query()).actions")
        assert len(records)==8 and all(r['review']['state']=='done' for r in records)
        (OUT/'decisions.json').write_text(json.dumps(records,indent=2))
        command("document.querySelector('nav [data-view=focus]').click()")
        wait("!!document.querySelector('.home-tools')")
        command("[...document.querySelectorAll('.home-tools button')].find(b=>b.textContent==='全部行动').click()")
        wait("document.querySelector('#items').textContent.includes('Edited confirmed step')")
        command("document.querySelector('nav [data-view=initiatives]').click()")
        wait("document.querySelector('#items').textContent.includes('Edited undertaking')")
        process.terminate();process.wait(timeout=10)
        shutil.rmtree(OUT/'Private/Workspaces')
        build();process=launch()
        command("document.querySelector('nav [data-view=organize]').click()")
        wait("document.querySelectorAll('#ai-results article').length===8")
        assert command("return document.querySelectorAll('#ai-results textarea').length") == 0
        assert command("return [...document.querySelectorAll('#ai-results article')].every(c=>c.textContent.includes('(done)'))")
        (OUT/'report.json').write_text(json.dumps({'nativeDecisions':8,'restartRebuildRecovered':True,'editedActionVisible':True,'initiativeVisible':True,'pointerWheel':'separate Orca evidence required'},indent=2))
        print('Native review and rebuild recovery passed; app retained for pointer/wheel validation',process.pid)
    except BaseException:
        process.terminate();raise
