#!/usr/bin/env python3
"""Measure fresh Cocoa/WKWebView process startup with test-only instrumentation."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / 'build/native-startup'
APP = OUT / 'NativeStartup.app'
SYNC = OUT / 'Sync'
PRIVATE = OUT / 'Private'
WORKSPACE = '00000000-0000-4000-8000-000000099999'

def run(*args, **kwargs):
    return subprocess.run(args, cwd=REPO, check=True, **kwargs)


def seed():
    if OUT.exists():
        raise SystemExit('build/native-startup already exists; move it aside to preserve prior evidence before rerunning')
    SYNC.mkdir(parents=True)
    PRIVATE.mkdir()
    data = SYNC / 'LocalNotesData'
    (data / 'actions').mkdir(parents=True)
    (data / 'workspace.json').write_text(json.dumps({'formatVersion': 1, 'workspaceId': WORKSPACE}))
    uid = lambda value: f'00000000-0000-4000-8000-{value:012d}'
    for i in range(500):
        (SYNC / f'note-{i}.md').write_text(f'# Reference {i}\n\n- [ ] Historical checklist {i}\n')
    for i in range(2000):
        record = dict(formatVersion=1, entityType='action', workspaceId=WORKSPACE,
                      entityId=uid(i + 1), revision=uid(i + 10001), parents=[],
                      description=f'Synthetic action {i}', status='todo' if i < 10 or i % 5 else 'waiting',
                      focusPosition=i if i < 10 else None, initiativeId=None, sources=[], dueDate=None,
                      waitingOn='Explicit approval' if i % 5 == 0 else None, modifiedAt='2026-11-16T00:00:00Z')
        text = json.dumps(record)
        (data / 'actions' / f'{record["entityId"]}.json').write_text(text)
        history = data / 'revisions' / record['entityId']
        history.mkdir(parents=True)
        (history / f'{record["revision"]}.json').write_text(text)
    return hashlib.sha256(''.join(
        str(path.relative_to(SYNC)) + ':' + hashlib.sha256(path.read_bytes()).hexdigest() + '\n'
        for path in sorted(SYNC.rglob('*')) if path.is_file()).encode()).hexdigest()


JS = r'''
(() => {
  const started = performance.now();
  const sent = new Set();
  const emit = event => { if (sent.has(event)) return; sent.add(event);
    requestAnimationFrame(() => requestAnimationFrame(() => window.webkit.messageHandlers.startupBenchmark.postMessage(event)));
  };
  window.addEventListener('error', event => window.webkit.messageHandlers.startupBenchmark.postMessage('error:' + event.message));
  let readyAt = null;
  window.__startupDiagnostics = () => ({sent: [...sent], readyAt, now: performance.now(), index: document.querySelector('#index-state')?.textContent});
  const timer = setInterval(() => {
    const sections = document.querySelectorAll('#items section');
    const organize = [...document.querySelectorAll('#items > button')].find(b => b.textContent.startsWith('Organize'));
    if (!sent.has('interactive') && sections.length === 3 && organize && !organize.disabled && organize.getBoundingClientRect().height > 0) {
      organize.click();
      if (document.querySelector('#notice').textContent.includes('AI organization is not connected yet')) emit('interactive');
    }
    const focused = [...(sections[0]?.querySelectorAll('h3') || [])].map(h => h.textContent);
    const waiting = sections[1]?.querySelectorAll('.card').length || 0;
    if (focused.length === 7 && focused.every((text, i) => text === `Synthetic action ${i}`) && waiting === 50) emit('populated');
    if (document.querySelector('#index-state')?.textContent === 'initiatives index ready') readyAt ??= performance.now();
    // Count background work after both collection recoveries; retain a minimum six-second observation window.
    if (sent.has('interactive') && sent.has('populated') && readyAt !== null && performance.now() - readyAt >= 2000 && performance.now() - started >= 6000) {
      clearInterval(timer); emit('finished');
    }
  }, 10);
})();
'''

PROBE = r'''
final class StartupProbe: NSObject, WKScriptMessageHandler {
    let epoch = UInt64(ProcessInfo.processInfo.environment["NATIVE_STARTUP_EPOCH"]!)!
    let output = ProcessInfo.processInfo.environment["NATIVE_STARTUP_OUTPUT"]!
    let lock = NSLock()
    var counts: [String: Int] = ["markdownBodiesRead": 0]
    var milestones: [String: Double] = [:]
    func count(_ key: String) { lock.lock(); counts[key, default: 0] += 1; lock.unlock() }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let event = message.body as? String else { return }
        let elapsed = Double(DispatchTime.now().uptimeNanoseconds - epoch) / 1_000_000
        lock.lock(); milestones[event] = elapsed
        let result: [String: Any] = ["milliseconds": milestones, "counts": counts]
        lock.unlock()
        do { try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]).write(to: URL(fileURLWithPath: output)) }
            catch { fputs("Benchmark output failed: \(error)\n", stderr); exit(2) }
        if event == "finished" { exit(0) }
    }
}
let startupProbe = StartupProbe()
'''


def instrument():
    run('bash', 'scripts/build-mac.sh', stdout=subprocess.DEVNULL)
    shutil.copytree(REPO / 'dist/LocalNotes.app', APP)
    run('/usr/libexec/PlistBuddy', '-c', 'Set :CFBundleIdentifier dev.localnotes.validation.native-startup', str(APP / 'Contents/Info.plist'))
    source = (REPO / 'mac/main.swift').read_text()
    instrumented = source.replace('final class Assets:', PROBE + '\nfinal class Assets:', 1)
    anchor = 'let config = WKWebViewConfiguration(); config.userContentController.add(self,name:"notes")'
    assert source.count(anchor) == 1
    instrumented = instrumented.replace(anchor, anchor + '\n' +
        '        config.userContentController.add(startupProbe, name: "startupBenchmark")\n' +
        '        config.userContentController.addUserScript(WKUserScript(source: ' + json.dumps(JS) + ', injectionTime: .atDocumentStart, forMainFrameOnly: true))')
    instrumented = instrumented.replace('let cmd=req["cmd"] as? String ?? "";let path=',
        'let cmd=req["cmd"] as? String ?? "";startupProbe.count("command:" + cmd);let path=', 1)
    # Count successful full Markdown body reads at the actual native I/O sites, not merely bridge requests.
    instrumented = instrumented.replace('let text=try String(contentsOf:url,encoding:.utf8)\n                notes.append',
        'let text=try String(contentsOf:url,encoding:.utf8)\n                startupProbe.count("markdownBodiesRead")\n                notes.append', 1)
    anchor = 'case "read":return ["text":try String(contentsOf:resolved(path),encoding:.utf8)]'
    assert source.count(anchor) == 1
    instrumented = instrumented.replace(anchor, 'case "read":let text=try String(contentsOf:resolved(path),encoding:.utf8);startupProbe.count("markdownBodiesRead");return ["text":text]')
    instrumented = instrumented.replace('guard allowed.contains(name), let data', r'if !allowed.contains(name) { fputs("Denied native asset: \(name)\n", stderr) }; guard allowed.contains(name), let data')
    instrumented = instrumented.replace('web.load(URLRequest(url:URL(string:"notes://local/index.html")!))', 'web.load(URLRequest(url:URL(string:"notes://local/index.html")!)); DispatchQueue.main.asyncAfter(deadline: .now() + 10) { self.web.evaluateJavaScript("JSON.stringify(window.__startupDiagnostics?.())") { value, error in fputs("Startup diagnostic: " + String(describing: value) + " error: " + String(describing: error) + "\\n", stderr) } }')
    generated = OUT / 'main.swift'
    generated.write_text(instrumented)
    run('swiftc', '-module-cache-path', str(REPO / 'build/swift-cache'), str(generated),
        'mac/ActionStorage.swift', 'mac/ActionIndex.swift', 'mac/ReferenceIndex.swift', 'mac/ReferenceScan.swift', '-lsqlite3', '-o',
        str(APP / 'Contents/MacOS/LocalNotes'), '-framework', 'Cocoa', '-framework', 'WebKit')
    run('codesign', '--force', '--deep', '--sign', '-', str(APP))
    # Native launcher and app use the same DispatchTime monotonic clock. Timestamp precedes Process.run().
    launcher = OUT / 'launcher.swift'
    launcher.write_text('''import Foundation
let args = CommandLine.arguments
let process = Process()
process.executableURL = URL(fileURLWithPath: args[1])
var environment = ProcessInfo.processInfo.environment
let epoch = DispatchTime.now().uptimeNanoseconds
 environment["NATIVE_STARTUP_EPOCH"] = String(epoch)
process.environment = environment
try process.run()
try String(process.processIdentifier).write(toFile: environment["NATIVE_STARTUP_OUTPUT"]! + ".pid", atomically: true, encoding: .utf8)
process.waitUntilExit()
exit(process.terminationStatus)
''')
    run('swiftc', str(launcher), '-o', str(OUT / 'launcher'))
    return hashlib.sha256(source.encode()).hexdigest()


def main():
    corpus_hash = seed()
    source_hash = instrument()
    results = []
    for mode in ['cold', 'warm', 'warm', 'warm']:
        output = OUT / f'{len(results)}-{mode}.json'
        env = dict(os.environ, LOCAL_NOTES_TEST_ROOT=str(SYNC), LOCAL_NOTES_TEST_PRIVATE=str(PRIVATE), NATIVE_STARTUP_OUTPUT=str(output))
        with (OUT / f'{len(results)}-{mode}.log').open('w') as log:
            process = subprocess.Popen([str(OUT / 'launcher'), str(APP / 'Contents/MacOS/LocalNotes')],
                                       cwd=REPO, env=env, stdout=log, stderr=log, start_new_session=True)
            try:
                if process.wait(timeout=60) != 0:
                    raise RuntimeError(f'Native app failed; inspect {log.name}')
            except subprocess.TimeoutExpired:
                # Foundation Process creates a separate child group; launcher-group signals alone leak the app.
                child_pid = int(Path(str(output) + '.pid').read_text())
                try:
                    os.kill(child_pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                # Only terminate this invocation's launcher, never another checkout's app.
                try:
                    os.killpg(process.pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                raise
        result = json.loads(output.read_text())
        assert result['counts'].get('markdownBodiesRead', 0) == 0, result
        assert result['counts'].get('command:actionFiles', 0) == 2, result
        assert result['milliseconds']['populated'] >= result['milliseconds']['interactive'] - 50, result
        results.append(dict(mode=mode, **result))
    report = dict(head=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
                  device=[line.strip() for line in subprocess.check_output(['system_profiler', 'SPHardwareDataType'], text=True).splitlines()
                          if any(field in line for field in ['Model Name:', 'Model Identifier:', 'Chip:', 'Memory:'])],
                  macOS=subprocess.check_output(['sw_vers', '-productVersion'], text=True).strip(),
                  productionFiles={str(path.relative_to(REPO)): hashlib.sha256(path.read_bytes()).hexdigest()
                                   for directory in ['mac', 'web'] for path in sorted((REPO / directory).glob('*')) if path.is_file()},
                  corpusSha256=corpus_hash, productionMainSha256=source_hash,
                  boundary='DispatchTime immediately before Process.run through native receipt after two requestAnimationFrame callbacks; new Cocoa/WKWebView process every run',
                  results=results)
    (OUT / 'results.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
