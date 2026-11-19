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
        var total: Int?
        let archive = "CASE WHEN instr('/'||lower(directory)||'/', '/archive/')>0 OR instr('/'||lower(directory)||'/', '/archives/')>0 OR instr('/'||lower(directory)||'/', '/archived/')>0 OR instr('/'||directory||'/', '/归档/')>0 THEN 1 ELSE 0 END"
        if command == "referencePut", let record = request["record"] as? [String: Any] {
            sql = "INSERT OR REPLACE INTO notes VALUES(?,?,COALESCE((SELECT topics FROM notes WHERE path=?),''),?,?)"
            values = [record["path"] as? String ?? "", request["search"] as? String ?? "", record["path"] as? String ?? "", record["directory"] as? String ?? "", String(data: try JSONSerialization.data(withJSONObject: record), encoding: .utf8)!]
        } else if command == "referenceRemove" { sql = "DELETE FROM notes WHERE path=?"; values = [request["path"] as? String ?? ""]
        } else if command == "referenceTags" { sql = "UPDATE notes SET topics=? WHERE path=? AND topics<>?"; values = [request["topics"] as? String ?? "", request["path"] as? String ?? "", request["topics"] as? String ?? ""]
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
            if global { sql += " AND (instr(record, '\"searchVersion\":1,')>0 OR instr(record, '\"searchVersion\":1}')>0)" }
            if let path = request["exactPath"] as? String { sql += inventory ? " WHERE path=?" : " AND path=?"; values.append(path) }
            if let paths = request["paths"] as? [String] { sql += paths.isEmpty ? " AND 0" : " AND path IN (" + Array(repeating: "?", count: paths.count).joined(separator: ",") + ")"; values += paths }
            if command == "referenceQuery" {
                if request["archives"] as? String == "exclude" { sql += " AND (\(archive))=0" }
                if request["archives"] as? String == "only" { sql += " AND (\(archive))=1" }
                let countSQL = sql.replacingOccurrences(of: "SELECT record FROM", with: "SELECT count(*) FROM")
                var countStatement: OpaquePointer?
                guard sqlite3_prepare_v2(db, countSQL, -1, &countStatement, nil) == SQLITE_OK, let countStatement = countStatement else { throw failure("Cannot count references") }
                defer { sqlite3_finalize(countStatement) }
                for (position, value) in values.enumerated() { index.bind(countStatement, Int32(position + 1), value) }
                guard sqlite3_step(countStatement) == SQLITE_ROW else { throw failure("Cannot count references") }
                total = Int(sqlite3_column_int(countStatement, 0))
            }
            if global {
                sql += " ORDER BY CASE WHEN instr(lower(substr(search,1,instr(search,char(10))-1)),lower(?))>0 THEN 0 ELSE 1 END, path LIMIT ? OFFSET ?"
                values.append(request["search"] as? String ?? "")
            } else if command == "referenceQuery" {
                let order = request["order"] as? String ?? "current"
                let title = "lower(substr(search,1,instr(search,char(10))-1))"
                let ordering = order == "title" ? "\(title), path" : order == "path" ? "path" : "(\(archive)), path"
                sql += " ORDER BY \(ordering) LIMIT ? OFFSET ?"
            } else { sql += " ORDER BY path LIMIT ? OFFSET ?" }
            let limit = min(100, max(1, request["limit"] as? Int ?? 50))
            values += [String(limit + 1), String(max(0, request["offset"] as? Int ?? 0))]
        }
        if command == "referenceSearch" {
            sql = "WITH RECURSIVE sources AS (SELECT path,record,substr(search,instr(search,char(10))+1) AS body, CASE WHEN instr(lower(substr(search,1,instr(search,char(10))-1)),lower(?))>0 THEN 0 ELSE 1 END AS rank FROM notes WHERE instr(lower(search),lower(?))>0 AND (instr(record, '\"searchVersion\":1,')>0 OR instr(record, '\"searchVersion\":1}')>0)), passages(path,record,body,rank,start) AS (SELECT path,record,body,rank,max(1,instr(lower(body),lower(?))-180) FROM sources UNION ALL SELECT path,record,body,rank,start+899+instr(lower(substr(body,start+900)),lower(?)) FROM passages WHERE instr(lower(substr(body,start+900)),lower(?))>0) SELECT record,substr(body,start,900),start FROM passages ORDER BY rank,path,start LIMIT ? OFFSET ?"
            let term = request["search"] as? String ?? ""
            values = Array(repeating: term, count: 5) + [String(min(100, max(1, request["limit"] as? Int ?? 50)) + 1), String(max(0, request["offset"] as? Int ?? 0))]
        }
        var pointerStatement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &pointerStatement, nil) == SQLITE_OK, let stmt = pointerStatement else { throw failure("Cannot prepare reference query") }
        defer { sqlite3_finalize(stmt) }
        for (position, value) in values.enumerated() { index.bind(stmt, Int32(position + 1), value) }
        var rows = [[String: Any]](); var step = sqlite3_step(stmt)
        while step == SQLITE_ROW {
            var record = try JSONSerialization.jsonObject(with: Data(String(cString: sqlite3_column_text(stmt, 0)).utf8)) as! [String: Any]
            if command == "referenceSearch" { record["passage"] = String(cString: sqlite3_column_text(stmt, 1)); record["passageStart"] = Int(sqlite3_column_int(stmt, 2)) }
            rows.append(record); step = sqlite3_step(stmt)
        }
        guard step == SQLITE_DONE else { throw failure("Reference index operation failed") }
        let limit = min(100, max(1, request["limit"] as? Int ?? 50))
        var result: [String: Any] = ["notes": Array(rows.prefix(limit)), "hasMore": rows.count > limit]
        if let total = total { result["total"] = total }
        if command == "referenceTags" { result["changed"] = sqlite3_changes(db) > 0 }
        return result
    }
}
