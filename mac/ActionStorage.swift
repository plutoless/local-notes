import Foundation

// Synchronized JSON and immutable revisions are the authoritative action storage.
final class ActionStorage {
    let root: URL
    let privateRoot: URL
    let fm = FileManager.default
    var data: URL { root.appendingPathComponent("LocalNotesData") }
    init(root: URL, privateRoot: URL) { self.root = root.resolvingSymlinksInPath(); self.privateRoot = privateRoot }

    func directory(_ url: URL) throws {
        let base = root.resolvingSymlinksInPath().path
        var cursor = url
        while cursor.path.count > root.path.count {
            if (try? cursor.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == true { throw failure("Symbolic links are not supported in action storage") }
            cursor.deleteLastPathComponent()
        }
        guard url.resolvingSymlinksInPath().path.hasPrefix(base + "/") else { throw failure("Invalid action storage path") }
        try fm.createDirectory(at: url, withIntermediateDirectories: true)
    }
    func workspace() throws -> String {
        try directory(data)
        let file = data.appendingPathComponent("workspace.json")
        if !fm.fileExists(atPath: file.path) {
            let object: [String: Any] = ["formatVersion": 1, "workspaceId": UUID().uuidString.lowercased()]
            let bytes = try JSONSerialization.data(withJSONObject: object)
            try bytes.write(to: file, options: .withoutOverwriting)
        }
        guard (try file.resourceValues(forKeys: [.isSymbolicLinkKey])).isSymbolicLink != true,
              let object = try JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any],
              object["formatVersion"] as? Int == 1, let id = object["workspaceId"] as? String, UUID(uuidString: id) != nil else { throw failure("Invalid workspace metadata") }
        return id
    }
    func file(_ path: String) throws -> URL {
        let pattern = "^(actions/[a-fA-F0-9-]{36}|revisions/[a-fA-F0-9-]{36}/[a-fA-F0-9-]{36})\\.json$"
        guard path.range(of: pattern, options: .regularExpression) != nil else { throw failure("Invalid action record path") }
        let url = data.appendingPathComponent(path)
        try directory(url.deletingLastPathComponent())
        if (try? url.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == true { throw failure("Symbolic links are not supported") }
        return url
    }
    func write(_ path: String, _ text: String) throws {
        let url = try file(path)
        if path.hasPrefix("revisions/") {
            if fm.fileExists(atPath: url.path) {
                guard try String(contentsOf: url, encoding: .utf8) == text else { throw failure("Immutable revision already exists") }
            } else {
                let temporary = url.deletingLastPathComponent().appendingPathComponent("." + UUID().uuidString + ".tmp")
                defer { try? fm.removeItem(at: temporary) }
                try Data(text.utf8).write(to: temporary)
                let handle = try FileHandle(forWritingTo: temporary)
                try handle.synchronize(); try handle.close()
                try fm.moveItem(at: temporary, to: url)
            }
        } else { try Data(text.utf8).write(to: url, options: .atomic) }
        guard try String(contentsOf: url, encoding: .utf8) == text else { throw failure("Action write verification failed") }
    }
    func files() throws -> [String: String] {
        var result = [String: String]()
        for name in ["actions", "revisions"] {
            let dir = data.appendingPathComponent(name)
            try directory(dir)
            guard let entries = fm.enumerator(atPath: dir.path) else { throw failure("Action directory unavailable") }
            for case let relative as String in entries {
                let url = dir.appendingPathComponent(relative)
                if (try? url.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == true { entries.skipDescendants(); continue }
                if url.pathExtension == "json" { result[name + "/" + relative] = try String(contentsOf: url, encoding: .utf8) }
            }
        }
        return result
    }
    func run(_ req: [String: Any]) throws -> [String: Any] {
        let id = try workspace()
        let cmd = req["cmd"] as? String ?? ""
        if cmd == "workspace" { return ["workspaceId": id, "root": root.path] }
        guard req["workspaceId"] as? String == id else { throw failure("Workspace changed; reopen the action") }
        switch cmd {
        case "actionFiles": return ["files": try files()]
        case "actionWrite": try write(req["path"] as? String ?? "", req["text"] as? String ?? ""); return [:]
        case "actionIndex", "actionQuery":
            return try ActionIndex(privateRoot: privateRoot, workspaceId: id).run(req)
        default: throw failure("Unknown action storage command")
        }
    }
}
