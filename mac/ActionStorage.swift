import Foundation
import SQLite3

// Synchronized JSON is authoritative. This SQLite connection is a disposable device-local index.
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
    func database(_ id: String) throws -> OpaquePointer {
        let dir = privateRoot.appendingPathComponent("Workspaces/\(id)")
        try fm.createDirectory(at: dir, withIntermediateDirectories: true)
        var db: OpaquePointer?
        guard sqlite3_open(dir.appendingPathComponent("actions.sqlite").path, &db) == SQLITE_OK, let opened = db else { if let db = db { sqlite3_close(db) }; throw failure("Cannot open local action index") }
        do {
            try execute(opened, "CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY, status TEXT NOT NULL, description TEXT NOT NULL, record TEXT NOT NULL)")
            return opened
        } catch { sqlite3_close(opened); throw error }
    }
    func execute(_ db: OpaquePointer, _ sql: String) throws {
        guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else { throw failure("Local index: \(String(cString: sqlite3_errmsg(db)))") }
    }
    func bind(_ statement: OpaquePointer, _ position: Int32, _ value: String) {
        sqlite3_bind_text(statement, position, value, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
    }
    func index(_ db: OpaquePointer, _ record: [String: Any]) throws {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, "INSERT OR REPLACE INTO actions VALUES (?,?,?,?)", -1, &statement, nil) == SQLITE_OK, let stmt = statement else { throw failure("Cannot prepare action index update") }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, record["entityId"] as? String ?? "")
        bind(stmt, 2, record["status"] as? String ?? "")
        bind(stmt, 3, record["description"] as? String ?? "")
        bind(stmt, 4, String(data: try JSONSerialization.data(withJSONObject: record), encoding: .utf8)!)
        guard sqlite3_step(stmt) == SQLITE_DONE else { throw failure("Cannot update action index") }
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
            let indexURL = privateRoot.appendingPathComponent("Workspaces/\(id)/actions.sqlite")
            if cmd == "actionIndex", req["records"] != nil {
                if fm.fileExists(atPath: indexURL.path) { try fm.removeItem(at: indexURL) }
            } else if !fm.fileExists(atPath: indexURL.path) { throw failure("INDEX_REBUILD_REQUIRED: Local action index is missing") }
            let db = try database(id); defer { sqlite3_close(db) }
            if cmd == "actionIndex" {
                if let records = req["records"] as? [[String: Any]] {
                    try execute(db, "BEGIN IMMEDIATE")
                    do { try execute(db, "DELETE FROM actions"); for record in records { try index(db, record) }; try execute(db, "COMMIT") }
                    catch { try? execute(db, "ROLLBACK"); throw error }
                } else if let record = req["record"] as? [String: Any] { try index(db, record) }
                return [:]
            }
            var statement: OpaquePointer?
            let sql = "SELECT record FROM actions WHERE (?='' OR status=?) AND instr(lower(description),lower(?))>0 ORDER BY id LIMIT ? OFFSET ?"
            guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK, let stmt = statement else { throw failure("Cannot query action index") }
            defer { sqlite3_finalize(stmt) }
            let status = req["status"] as? String ?? ""
            bind(stmt, 1, status); bind(stmt, 2, status); bind(stmt, 3, req["search"] as? String ?? "")
            let limit = min(100, max(1, req["limit"] as? Int ?? 30)); let offset = max(0, req["offset"] as? Int ?? 0)
            sqlite3_bind_int(stmt, 4, Int32(limit + 1)); sqlite3_bind_int(stmt, 5, Int32(min(offset, Int(Int32.max))))
            var rows = [[String: Any]](); var step = sqlite3_step(stmt)
            while step == SQLITE_ROW {
                let text = String(cString: sqlite3_column_text(stmt, 0))
                rows.append(try JSONSerialization.jsonObject(with: Data(text.utf8)) as! [String: Any]); step = sqlite3_step(stmt)
            }
            guard step == SQLITE_DONE else { throw failure("Action index query failed") }
            return ["actions": Array(rows.prefix(limit)), "hasMore": rows.count > limit]
        default: throw failure("Unknown action storage command")
        }
    }
}
