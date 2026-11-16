import Foundation
import SQLite3

// Private, rebuildable search data. List responses never contain the searchable body.
final class ReferenceIndex {
    let index: ActionIndex
    init(privateRoot: URL, workspaceId: String) { index = ActionIndex(privateRoot: privateRoot, workspaceId: workspaceId) }
    func run(_ request: [String: Any]) throws -> [String: Any] {
        let dir = index.privateRoot.appendingPathComponent("Workspaces/\(index.id)")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var pointer: OpaquePointer?
        guard sqlite3_open(dir.appendingPathComponent("references.sqlite").path, &pointer) == SQLITE_OK, let db = pointer else { if let pointer = pointer { sqlite3_close(pointer) }; throw failure("Cannot open reference index") }
        defer { sqlite3_close(db) }
        try index.execute(db, "CREATE TABLE IF NOT EXISTS notes(path TEXT PRIMARY KEY, search TEXT, topics TEXT, directory TEXT, record TEXT)")
        let command = request["cmd"] as? String ?? ""
        var values = [String](); var sql = ""
        if command == "referencePut", let record = request["record"] as? [String: Any] {
            sql = "INSERT OR REPLACE INTO notes VALUES(?,?,?,?,?)"
            values = [record["path"] as? String ?? "", request["search"] as? String ?? "", "", record["directory"] as? String ?? "", String(data: try JSONSerialization.data(withJSONObject: record), encoding: .utf8)!]
        } else if command == "referenceRemove" { sql = "DELETE FROM notes WHERE path=?"; values = [request["path"] as? String ?? ""]
        } else if command == "referenceTags" { sql = "UPDATE notes SET topics=? WHERE path=?"; values = [request["topics"] as? String ?? "", request["path"] as? String ?? ""]
        } else {
            let inventory = command == "referenceInventory"
            sql = "SELECT record FROM notes"
            if !inventory {
                sql += " WHERE instr(lower(search),lower(?))>0 AND (?='*' OR directory=?) AND (?='' OR (?='uncategorized' AND topics='') OR instr(topics,?)>0)"
                let directory = request["directory"] as? String ?? "*", topic = request["topic"] as? String ?? ""
                values = [request["search"] as? String ?? "", directory, directory, topic, topic, topic]
            }
            sql += " ORDER BY path LIMIT ? OFFSET ?"
            let limit = min(100, max(1, request["limit"] as? Int ?? 50))
            values += [String(limit + 1), String(max(0, request["offset"] as? Int ?? 0))]
        }
        var pointerStatement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &pointerStatement, nil) == SQLITE_OK, let stmt = pointerStatement else { throw failure("Cannot prepare reference query") }
        defer { sqlite3_finalize(stmt) }
        for (position, value) in values.enumerated() { index.bind(stmt, Int32(position + 1), value) }
        var rows = [[String: Any]](); var step = sqlite3_step(stmt)
        while step == SQLITE_ROW {
            rows.append(try JSONSerialization.jsonObject(with: Data(String(cString: sqlite3_column_text(stmt, 0)).utf8)) as! [String: Any]); step = sqlite3_step(stmt)
        }
        guard step == SQLITE_DONE else { throw failure("Reference index operation failed") }
        let limit = min(100, max(1, request["limit"] as? Int ?? 50))
        return ["notes": Array(rows.prefix(limit)), "hasMore": rows.count > limit]
    }
}
