import Foundation

// Credentials stay in device-private storage and are never returned to the WebView.
final class AIService: NSObject, URLSessionTaskDelegate {
    let privateRoot: URL
    var task: URLSessionDataTask?
    var activeId = UUID()
    let lock = NSLock()
    init(_ privateRoot: URL) { self.privateRoot = privateRoot }
    var settingsURL: URL { privateRoot.appendingPathComponent("ai-service.json") }
    func settings() -> [String: String] { (try? JSONSerialization.jsonObject(with: Data(contentsOf: settingsURL))) as? [String: String] ?? [:] }
    func configure(_ req: [String: Any]) throws -> [String: Any] {
        if req["cmd"] as? String == "aiSettings" {
            let value = settings(); return ["address": value["address"] ?? "", "model": value["model"] ?? "", "configured": !(value["token"] ?? "").isEmpty]
        }
        let address = req["address"] as? String ?? "", model = req["model"] as? String ?? ""
        guard let url = URL(string: address), (url.scheme == "https" || (url.scheme == "http" && url.host == "127.0.0.1")), url.host != nil, url.user == nil, url.password == nil, url.query == nil, url.fragment == nil, !model.trimmingCharacters(in: .whitespaces).isEmpty else { throw failure("Use an HTTPS Chat Completions endpoint and model") }
        let token = req["token"] as? String ?? ""
        let value = ["address": address, "model": model, "token": token.isEmpty ? settings()["token"] ?? "" : token]
        try FileManager.default.createDirectory(at: privateRoot, withIntermediateDirectories: true)
        try JSONSerialization.data(withJSONObject: value).write(to: settingsURL, options: .atomic)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: settingsURL.path)
        return [:]
    }
    func cancel() { lock.lock(); let active = task; task = nil; lock.unlock(); active?.cancel() }
    func analyze(_ req: [String: Any], completion: @escaping ([String: Any]) -> Void) {
        let value = settings()
        guard let address = value["address"], let url = URL(string: address), let model = value["model"], let token = value["token"], !token.isEmpty else { completion(["error": "Missing configuration"]); return }
        guard let messages = req["messages"] as? [[String: String]], messages.count == 2,
              !messages.contains(where: { ($0["content"] ?? "").contains(token) }),
              let body = try? JSONSerialization.data(withJSONObject: ["model": model, "messages": messages, "stream": false]), body.count < 100000, !(String(data: body, encoding: .utf8) ?? "").contains(token) else { completion(["error": "Invalid or credential-containing input"]); return }
        var request = URLRequest(url: url); request.httpMethod = "POST"; request.timeoutInterval = 45
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization"); request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = body
        let config = URLSessionConfiguration.ephemeral; config.timeoutIntervalForResource = 45; config.urlCache = nil
        let receiver = AIResponseReceiver()
        let session = URLSession(configuration: config, delegate: receiver, delegateQueue: nil)
        lock.lock()
        if task != nil { lock.unlock(); session.invalidateAndCancel(); completion(["error": "Analysis already running"]); return }
        let requestId = UUID(); activeId = requestId
        receiver.completion = { data, response, error in
            defer { session.finishTasksAndInvalidate() }
            self.lock.lock(); if self.activeId == requestId { self.task = nil }; self.lock.unlock()
            if let error = error as? URLError { completion(["error": error.code == .cancelled ? "Canceled" : error.code == .timedOut ? "Timeout; retry explicitly" : "Offline or connection failed; retry explicitly"]); return }
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard status == 200 else { completion(["error": status == 429 ? "Rate limited; retry explicitly" : "Service failed (HTTP \(status)); retry explicitly"]); return }
            guard let data = data, data.count <= 2000000, let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let choices = object["choices"] as? [[String: Any]], let message = choices.first?["message"] as? [String: Any], message["tool_calls"] == nil, let text = message["content"] as? String, !text.contains(token) else { completion(["error": "Invalid response"]); return }
            completion(["text": text])
        }
        let active = session.dataTask(with: request)
        task = active; lock.unlock(); active.resume()
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

// Bound response allocation while receiving bytes, before parsing provider output.
final class AIResponseReceiver: NSObject, URLSessionDataDelegate {
    var bytes = Data()
    var tooLarge = false
    var completion: ((Data?, URLResponse?, Error?) -> Void)?
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        if bytes.count + data.count > 2000000 { tooLarge = true; dataTask.cancel() }
        else { bytes.append(data) }
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        completion?(tooLarge ? nil : bytes, task.response, tooLarge ? nil : error)
        completion = nil
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
