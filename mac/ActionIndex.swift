import Foundation
import SQLite3

// This device-local index can be discarded and reconstructed from synchronized revisions.
final class ActionIndex {
    let privateRoot: URL
    let id: String
    let entityType: String
    let fm = FileManager.default
    init(privateRoot: URL, workspaceId: String, entityType: String = "action") { self.privateRoot = privateRoot; self.id = workspaceId; self.entityType = entityType == "initiative" ? "initiative" : "action" }
    func database() throws -> OpaquePointer {
        let dir = privateRoot.appendingPathComponent("Workspaces/\(id)")
        try fm.createDirectory(at: dir, withIntermediateDirectories: true)
        var db: OpaquePointer?
        guard sqlite3_open(dir.appendingPathComponent("\(entityType)s.sqlite").path, &db) == SQLITE_OK, let opened = db else { if let db = db { sqlite3_close(db) }; throw failure("Cannot open local action index") }
        do {
            try execute(opened, "CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY, status TEXT NOT NULL, description TEXT NOT NULL, record TEXT NOT NULL)")
            var columns = Set<String>(), info: OpaquePointer?
            sqlite3_prepare_v2(opened, "PRAGMA table_info(actions)", -1, &info, nil)
            while sqlite3_step(info) == SQLITE_ROW { columns.insert(String(cString: sqlite3_column_text(info, 1))) }
            sqlite3_finalize(info)
            if !columns.contains("initiative") { try execute(opened, "ALTER TABLE actions ADD COLUMN initiative TEXT NOT NULL DEFAULT ''") }
            if !columns.contains("focus") { try execute(opened, "ALTER TABLE actions ADD COLUMN focus REAL") }
            try execute(opened, "CREATE INDEX IF NOT EXISTS focus_order ON actions(status, focus, id)")
            try execute(opened, "CREATE INDEX IF NOT EXISTS initiative_filter ON actions(initiative, status, id)")
            if !columns.contains("initiative") { try execute(opened, "UPDATE actions SET initiative=coalesce(json_extract(record,'$.initiativeId'),''), focus=json_extract(record,'$.focusPosition') WHERE initiative='' AND json_extract(record,'$.initiativeId') IS NOT NULL") }
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
        guard sqlite3_prepare_v2(db, "INSERT OR REPLACE INTO actions (id,status,description,record,initiative,focus) VALUES (?,?,?,?,?,?)", -1, &statement, nil) == SQLITE_OK, let stmt = statement else { throw failure("Cannot prepare action index update") }
        defer { sqlite3_finalize(stmt) }
        bind(stmt, 1, record["entityId"] as? String ?? "")
        bind(stmt, 2, record["status"] as? String ?? "")
        bind(stmt, 3, record["description"] as? String ?? "")
        bind(stmt, 4, String(data: try JSONSerialization.data(withJSONObject: record), encoding: .utf8)!)
        bind(stmt, 5, record["initiativeId"] as? String ?? "")
        if let focus = record["focusPosition"] as? Double { sqlite3_bind_double(stmt, 6, focus) } else { sqlite3_bind_null(stmt, 6) }
        guard sqlite3_step(stmt) == SQLITE_DONE else { throw failure("Cannot update action index") }
    }
    func run(_ req: [String: Any]) throws -> [String: Any] {
        let cmd = req["cmd"] as? String ?? ""
        let indexURL = privateRoot.appendingPathComponent("Workspaces/\(id)/\(entityType)s.sqlite")
        if cmd == "actionIndex", req["records"] != nil {
            if fm.fileExists(atPath: indexURL.path) { try fm.removeItem(at: indexURL) }
        } else if !fm.fileExists(atPath: indexURL.path) { throw failure("INDEX_REBUILD_REQUIRED: Local action index is missing") }
        let db = try database(); defer { sqlite3_close(db) }
        if cmd == "actionIndex" {
            if let records = req["records"] as? [[String: Any]] {
                try execute(db, "BEGIN IMMEDIATE")
                do { try execute(db, "DELETE FROM actions"); for record in records { try index(db, record) }; try execute(db, "COMMIT") }
                catch { try? execute(db, "ROLLBACK"); throw error }
            } else if let record = req["record"] as? [String: Any] { try index(db, record) }
            return [:]
        }
        var statement: OpaquePointer?
        let focus = req["focus"] as? Bool == true
        let conditions = "(?='' OR status=?) AND instr(lower(description),lower(?))>0 AND (?='' OR initiative=?) AND (?='' OR id=?)"
        let selection = focus ? " AND status IN ('todo','in-progress') AND focus IS NOT NULL" : ""
        let order = req["lastFocus"] as? Bool == true ? "focus DESC, id DESC" : focus ? "focus, id" : "id"
        let sql = "SELECT record FROM actions WHERE \(conditions)\(selection) ORDER BY \(order) LIMIT ? OFFSET ?"
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK, let stmt = statement else { throw failure("Cannot query action index") }
        defer { sqlite3_finalize(stmt) }
        let status = req["status"] as? String ?? ""
        bind(stmt, 1, status); bind(stmt, 2, status); bind(stmt, 3, req["search"] as? String ?? "")
        let limit = min(100, max(1, req["limit"] as? Int ?? 30)); let offset = max(0, req["offset"] as? Int ?? 0)
        let initiative = req["initiativeId"] as? String ?? "", entityId = req["entityId"] as? String ?? ""
        bind(stmt, 4, initiative); bind(stmt, 5, initiative); bind(stmt, 6, entityId); bind(stmt, 7, entityId)
        sqlite3_bind_int(stmt, 8, Int32(limit + 1)); sqlite3_bind_int(stmt, 9, Int32(min(offset, Int(Int32.max))))
        var rows = [[String: Any]](); var step = sqlite3_step(stmt)
        while step == SQLITE_ROW {
            let text = String(cString: sqlite3_column_text(stmt, 0))
            rows.append(try JSONSerialization.jsonObject(with: Data(text.utf8)) as! [String: Any]); step = sqlite3_step(stmt)
        }
        guard step == SQLITE_DONE else { throw failure("Action index query failed") }
        return ["actions": Array(rows.prefix(limit)), "hasMore": rows.count > limit]
    }
}
