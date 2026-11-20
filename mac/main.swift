import Cocoa
import WebKit

final class Assets: NSObject, WKURLSchemeHandler {
    let root: URL
    init(_ root: URL) { self.root = root }
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        let name = task.request.url!.lastPathComponent
        let allowed = ["index.html", "style.css", "app.js", "global-search.js", "search-screen.js", "presentation.js", "task-drafts.js", "core.js", "bridge.js", "actions.js", "action-screen.js", "initiatives.js", "initiative-screen.js", "library.js", "library-screen.js", "focus-screen.js", "reading-history.js", "revision-graph.js", "sync-screen.js", "organization.js", "organize-screen.js"]
        guard allowed.contains(name), let data = try? Data(contentsOf: root.appendingPathComponent(name)) else { task.didFailWithError(NSError(domain:"assets",code:404)); return }
        let mime = name.hasSuffix(".js") ? "text/javascript" : name.hasSuffix(".css") ? "text/css" : "text/html"
        task.didReceive(URLResponse(url:task.request.url!, mimeType:mime, expectedContentLength:data.count, textEncodingName:"utf-8")); task.didReceive(data); task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
func failure(_ message: String) -> NSError { NSError(domain: "LocalNotes", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
final class App: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, NSWindowDelegate {
    var window: NSWindow!; var web: WKWebView!; var root: URL!; var support: URL!
    let fm = FileManager.default
    var watch: DispatchSourceFileSystemObject?
    func observeRoot() {
        watch?.cancel()
        let descriptor = open(root.path, O_EVTONLY)
        guard descriptor >= 0 else { return }
        let source = DispatchSource.makeFileSystemObjectSource(fileDescriptor: descriptor, eventMask: [.write, .rename, .delete], queue: .main)
        source.setEventHandler { [weak self] in self?.web.evaluateJavaScript("window.dispatchEvent(new Event('reference-change'))", completionHandler: nil) }
        source.setCancelHandler { close(descriptor) }; watch = source; source.resume()
    }
    lazy var ai = AIService(support)
    let worker = DispatchQueue(label: "dev.localnotes.storage", qos: .userInitiated)
    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            support = try fm.url(for:.applicationSupportDirectory,in:.userDomainMask,appropriateFor:nil,create:true).appendingPathComponent("LocalNotes")
            try fm.createDirectory(at:support,withIntermediateDirectories:true)
            let sample = support.appendingPathComponent("Sample")
            if !fm.fileExists(atPath:sample.path) { try fm.copyItem(at:Bundle.main.resourceURL!.appendingPathComponent("sample"),to:sample) }
            root = UserDefaults.standard.string(forKey:"root").map { URL(fileURLWithPath:$0) } ?? sample
            // Explicit test roots keep interaction checks away from the user's notes and preferences.
            if let testRoot = ProcessInfo.processInfo.environment["LOCAL_NOTES_TEST_ROOT"],
               let testPrivate = ProcessInfo.processInfo.environment["LOCAL_NOTES_TEST_PRIVATE"] {
                root = URL(fileURLWithPath: testRoot); support = URL(fileURLWithPath: testPrivate)
                try fm.createDirectory(at: support, withIntermediateDirectories: true)
            }
        } catch { fatalError(error.localizedDescription) }
        // Browse controls participate in Tab navigation independently of Safari preferences.
        let config = WKWebViewConfiguration(); config.preferences.tabFocusesLinks = true; config.userContentController.add(self,name:"notes")
        config.setURLSchemeHandler(Assets(Bundle.main.resourceURL!.appendingPathComponent("web")),forURLScheme:"notes")
        web = WKWebView(frame:.zero,configuration:config); web.navigationDelegate=self; web.uiDelegate=self
        window = NSWindow(contentRect:NSRect(x:0,y:0,width:1180,height:800),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
        window.title="拾记 · Local Notes"; window.minSize=NSSize(width:380,height:580); window.contentView=web; window.delegate=self; window.center(); window.makeKeyAndOrderFront(nil)
        let menu = NSMenu(); let item=NSMenuItem(); menu.addItem(item); let submenu=NSMenu(); submenu.addItem(withTitle:"退出拾记", action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q"); item.submenu=submenu
        let edit=NSMenuItem();menu.addItem(edit);let em=NSMenu(title:"编辑");edit.submenu=em
        for (title,action,key) in [("撤销","undo:","z"),("剪切","cut:","x"),("复制","copy:","c"),("粘贴","paste:","v"),("全选","selectAll:","a")] { em.addItem(withTitle:title,action:Selector(action),keyEquivalent:key) }
        NSApp.mainMenu=menu; NSApp.activate(ignoringOtherApps:true)
        observeRoot()
        web.load(URLRequest(url:URL(string:"notes://local/index.html")!))
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool {true}
    var leaveToken: String?
    var terminationPending = false
    var allowTermination = false
    func requestLeave() {
        guard leaveToken == nil else { return }
        let token = UUID().uuidString; leaveToken = token
        web.evaluateJavaScript("window.requestNativeLeave('\(token)')") { _, error in
            guard self.leaveToken == token, error != nil else { return }
            // The page could not answer. Do not pretend its draft was discarded.
            let alert = NSAlert(); alert.messageText = "离开请求未完成"
            alert.informativeText = "无法确认当前编辑的保存状态。可继续编辑，或关闭并保留本机草稿，稍后重新打开核对。"
            alert.addButton(withTitle: "继续编辑"); alert.addButton(withTitle: "关闭并保留草稿")
            self.finishLeave(token, alert.runModal() == .alertSecondButtonReturn)
        }
    }
    func finishLeave(_ token: String, _ allowed: Bool) {
        guard leaveToken == token else { return }
        leaveToken = nil
        if terminationPending {
            terminationPending = false; allowTermination = allowed
            NSApp.reply(toApplicationShouldTerminate: allowed)
        } else if allowed { allowTermination = true; NSApp.terminate(nil) }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        guard let token = leaveToken else { webView.reload(); return }
        let alert = NSAlert(); alert.messageText = "编辑页面已停止响应"
        alert.informativeText = "无法确认最后一次保存。可重新载入并恢复草稿，或关闭并保留草稿，稍后核对已保存版本。"
        alert.addButton(withTitle: "重新载入"); alert.addButton(withTitle: "关闭并保留草稿")
        let close = alert.runModal() == .alertSecondButtonReturn
        finishLeave(token, close)
        if !close { webView.reload() }
    }
    func windowShouldClose(_ sender: NSWindow) -> Bool { requestLeave(); return false }
    func applicationShouldTerminate(_ sender:NSApplication)->NSApplication.TerminateReply {
        if allowTermination { return .terminateNow }
        terminationPending = true; requestLeave(); return .terminateLater
    }
    func webView(_ webView:WKWebView,decidePolicyFor navigationAction:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){decisionHandler(navigationAction.request.url?.scheme == "notes" ? .allow : .cancel)}
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert(); alert.messageText = prompt
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 320, height: 24)); field.stringValue = defaultText ?? ""
        alert.accessoryView = field; alert.addButton(withTitle: "确定"); alert.addButton(withTitle: "取消")
        completionHandler(alert.runModal() == .alertFirstButtonReturn ? field.stringValue : nil)
    }
    func resolved(_ path:String, allowMissing:Bool=false)throws->URL {
        let parts=path.split(separator:"/",omittingEmptySubsequences:false)
        guard !path.hasPrefix("/"),!path.contains("\\"),path.lowercased().hasSuffix(".md"),parts.allSatisfy({!$0.isEmpty && !$0.hasPrefix(".") && !["credentials", "localnotesdata"].contains($0.lowercased())}) else {throw failure("无效的笔记路径")}
        let base=root.resolvingSymlinksInPath();let url=base.appendingPathComponent(path).resolvingSymlinksInPath()
        guard url.path.hasPrefix(base.path+"/") else {throw failure("路径超出笔记目录")}
        var cursor=base
        for part in parts {cursor.appendPathComponent(String(part));if (try? cursor.resourceValues(forKeys:[.isSymbolicLinkKey]).isSymbolicLink)==true {throw failure("不支持符号链接")}}
        return url
    }
    func snapshot(_ path:String,_ text:String)throws {
        let dir=support.appendingPathComponent("History");try fm.createDirectory(at:dir,withIntermediateDirectories:true)
        let name=UUID().uuidString+".md";try text.write(to:dir.appendingPathComponent(name),atomically:true,encoding:.utf8)
        // History is app-local, never synchronized. Keep latest 200 snapshots.
        let files=try fm.contentsOfDirectory(at:dir,includingPropertiesForKeys:[.contentModificationDateKey]).sorted { ((try? $0.resourceValues(forKeys:[.contentModificationDateKey]).contentModificationDate) ?? .distantPast) > ((try? $1.resourceValues(forKeys:[.contentModificationDateKey]).contentModificationDate) ?? .distantPast) }
        for file in files.dropFirst(200){try? fm.removeItem(at:file)}
    }
    func run(_ req:[String:Any])throws->[String:Any] {
        let cmd=req["cmd"] as? String ?? "";let path=req["path"] as? String ?? ""
        if cmd == "aiSettings" || cmd == "aiConfigure" { return try ai.configure(req) }
        if cmd == "aiCancel" { ai.cancel(); return [:] }
        if cmd == "workspace" || cmd.hasPrefix("action") { return try ActionStorage(root: root, privateRoot: support).run(req) }
        if cmd != "choose" {
            guard req["workspaceId"] as? String == (try ActionStorage(root: root, privateRoot: support).workspace()) else { throw failure("Workspace changed; reopen the note") }
        }
        if cmd.hasPrefix("reference") { return try ReferenceIndex(privateRoot: support, workspaceId: req["workspaceId"] as! String).run(req) }
        switch cmd {
        case "choose":
            let panel=NSOpenPanel();panel.canChooseDirectories=true;panel.canChooseFiles=false;panel.message="选择专用笔记目录（请勿选择包含密钥的上层目录）"; panel.prompt="选择目录"; panel.title="选择笔记目录"
            guard panel.runModal() == .OK,let url=panel.url else{return ["cancelled":true]}
            guard url.lastPathComponent.lowercased() != "credentials" else {throw failure("不能将 Credentials 作为笔记目录")}
            root=url;observeRoot();UserDefaults.standard.set(url.path,forKey:"root");return [:]
        case "list", "metadata":
            return try referenceMetadata(root)
        case "clipboardWrite":
            NSPasteboard.general.clearContents()
            guard NSPasteboard.general.setString(req["text"] as? String ?? "", forType: .string) else { throw failure("Clipboard write failed") }
            return [:]
        case "read":return ["text":try String(contentsOf:resolved(path),encoding:.utf8)]
        case "create":
            let url=try resolved(path);guard !fm.fileExists(atPath:url.path) else{throw failure("目标文件已存在")}
            try fm.createDirectory(at:url.deletingLastPathComponent(),withIntermediateDirectories:true)
            try (req["text"] as? String ?? "").write(to:url,atomically:false,encoding:.utf8);return [:]
        case "save", "move":
            let url=try resolved(path);let old=try String(contentsOf:url,encoding:.utf8)
            guard old == req["expected"] as? String else {throw failure("CONFLICT: 文件已被外部修改")}
            try snapshot(path,old)
            if cmd=="move" {let target=try resolved(req["target"] as? String ?? "");guard !fm.fileExists(atPath:target.path) else{throw failure("目标文件已存在")};try fm.createDirectory(at:target.deletingLastPathComponent(),withIntermediateDirectories:true);try fm.moveItem(at:url,to:target)}
            else {guard try String(contentsOf:url,encoding:.utf8)==old else{throw failure("CONFLICT")};try (req["text"] as? String ?? "").write(to:url,atomically:true,encoding:.utf8)}
            return [:]
        default:throw failure("未知操作")
        }
    }
    func userContentController(_ controller:WKUserContentController,didReceive message:WKScriptMessage){
        guard message.frameInfo.isMainFrame,let str=message.body as? String,let data=str.data(using:.utf8),let req=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any],let id=req["id"] as? Int else{return}
        if req["cmd"] as? String == "leaveResult", let token = req["token"] as? String {
            finishLeave(token, req["allowed"] as? Bool ?? false)
            web.evaluateJavaScript("window.nativeReply(\(id),{})", completionHandler: nil); return
        }
        if req["cmd"] as? String == "aiAnalyze" {
            ai.analyze(req) { result in
                if let data = try? JSONSerialization.data(withJSONObject: result), let json = String(data: data, encoding: .utf8) {
                    DispatchQueue.main.async { self.web.evaluateJavaScript("window.nativeReply(\(id),\(json))", completionHandler: nil) }
                }
            }; return
        }
        let perform = {
            let result: [String: Any]
            do { result = try self.run(req) } catch { result = ["error": error.localizedDescription] }
            if let data = try? JSONSerialization.data(withJSONObject: result), let json = String(data: data, encoding: .utf8) {
                DispatchQueue.main.async { self.web.evaluateJavaScript("window.nativeReply(\(id),\(json))", completionHandler: nil) }
            }
        }
        if req["cmd"] as? String == "choose" || req["cmd"] as? String == "clipboardWrite" { worker.async { DispatchQueue.main.sync(execute: perform) } }
        else { worker.async(execute: perform) }
    }
}
let app=NSApplication.shared;let delegate=App();app.delegate=delegate;app.setActivationPolicy(.regular);app.run()
