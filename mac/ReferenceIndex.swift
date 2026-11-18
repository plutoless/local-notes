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
            sql = "INSERT INTO notes VALUES(?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET search=excluded.search, directory=excluded.directory, record=excluded.record"
            values = [record["path"] as? String ?? "", request["search"] as? String ?? "", "", record["directory"] as? String ?? "", String(data: try JSONSerialization.data(withJSONObject: record), encoding: .utf8)!]
        } else if command == "referenceRemove" { sql = "DELETE FROM notes WHERE path=?"; values = [request["path"] as? String ?? ""]
        } else if command == "referenceTags" { sql = "UPDATE notes SET topics=? WHERE path=?"; values = [request["topics"] as? String ?? "", request["path"] as? String ?? ""]
        } else {
            let inventory = command == "referenceInventory"
            let global = command == "referenceSearch"
            sql = global ? "SELECT record, substr(substr(search,instr(search,char(10))+1), max(1,instr(lower(substr(search,instr(search,char(10))+1)),lower(?))-180),900) FROM notes" : "SELECT record FROM notes"
            if global { values.append(request["search"] as? String ?? "") }
            if !inventory {
                sql += " WHERE instr(lower(search),lower(?))>0 AND (?='*' OR directory=?) AND (?='' OR (?='uncategorized' AND topics='') OR instr(topics,?)>0)"
                let directory = request["directory"] as? String ?? "*", topic = request["topic"] as? String ?? ""
                values += [request["search"] as? String ?? "", directory, directory, topic, topic, topic]
            }
            if let path = request["exactPath"] as? String { sql += inventory ? " WHERE path=?" : " AND path=?"; values.append(path) }
            if let paths = request["paths"] as? [String] { sql += paths.isEmpty ? " AND 0" : " AND path IN (" + Array(repeating: "?", count: paths.count).joined(separator: ",") + ")"; values += paths }
            if global {
                sql += " ORDER BY CASE WHEN instr(lower(json_extract(record, '$.title')),lower(?))>0 THEN 0 ELSE 1 END, path LIMIT ? OFFSET ?"
                values.append(request["search"] as? String ?? "")
            } else { sql += " ORDER BY path LIMIT ? OFFSET ?" }
            let limit = min(100, max(1, request["limit"] as? Int ?? 50))
            values += [String(limit + 1), String(max(0, request["offset"] as? Int ?? 0))]
        }
        var pointerStatement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &pointerStatement, nil) == SQLITE_OK, let stmt = pointerStatement else { throw failure("Cannot prepare reference query") }
        defer { sqlite3_finalize(stmt) }
        for (position, value) in values.enumerated() { index.bind(stmt, Int32(position + 1), value) }
        var rows = [[String: Any]](); var step = sqlite3_step(stmt)
        while step == SQLITE_ROW {
            var record = try JSONSerialization.jsonObject(with: Data(String(cString: sqlite3_column_text(stmt, 0)).utf8)) as! [String: Any]
            if command == "referenceSearch" { record["passage"] = String(cString: sqlite3_column_text(stmt, 1)) }
            rows.append(record); step = sqlite3_step(stmt)
        }
        guard step == SQLITE_DONE else { throw failure("Reference index operation failed") }
        let limit = min(100, max(1, request["limit"] as? Int ?? 50))
        return ["notes": Array(rows.prefix(limit)), "hasMore": rows.count > limit]
    }
}
