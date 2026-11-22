import Foundation
import Darwin
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
            let exactPath = request["exactPath"] as? String
            let sourceFilter = exactPath == nil ? "" : " AND path=?"
            sql = "WITH RECURSIVE sources AS (SELECT path,record,substr(search,instr(search,char(10))+1) AS body, CASE WHEN instr(lower(substr(search,1,instr(search,char(10))-1)),lower(?))>0 THEN 0 ELSE 1 END AS rank FROM notes WHERE instr(lower(search),lower(?))>0\(sourceFilter) AND (instr(record, '\"searchVersion\":1,')>0 OR instr(record, '\"searchVersion\":1}')>0)), passages(path,record,body,rank,start) AS (SELECT path,record,body,rank,max(1,instr(lower(body),lower(?))-180) FROM sources UNION ALL SELECT path,record,body,rank,start+899+instr(lower(substr(body,start+900)),lower(?)) FROM passages WHERE instr(lower(substr(body,start+900)),lower(?))>0) SELECT record,substr(body,start,900),start FROM passages"
            let term = request["search"] as? String ?? ""
            values = [term, term]
            if let exactPath { values.append(exactPath) }
            values += [term, term, term]
            if let start = request["overlapStart"] as? Int, let length = request["overlapLength"] as? Int,
               (1...2_000_001).contains(start), (1...900).contains(length), exactPath != nil {
                sql += " WHERE start < CAST(? AS INTEGER) AND start + min(900,length(body)-start+1) > CAST(? AS INTEGER)"
                values += [String(start + length), String(start)]
            }
            sql += " ORDER BY rank,path,start LIMIT ? OFFSET ?"
            values += [String(min(100, max(1, request["limit"] as? Int ?? 50)) + 1), String(max(0, request["offset"] as? Int ?? 0))]
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

// This bridge forwards only after explicit, per-workspace consent.
func runMeaningSearch(_ input: [String: Any], privateRoot: URL, workspaceId: String) throws -> [String: Any] {
    let fm = FileManager.default
    let directory = privateRoot.appendingPathComponent("Workspaces/\(workspaceId)", isDirectory: true)
    let preference = directory.appendingPathComponent("meaning-search-enabled")
    let operation = input["operation"] as? String ?? ""
    if operation == "configure" {
        if input["enabled"] as? Bool == true {
            try fm.createDirectory(at: directory, withIntermediateDirectories: true,
                                   attributes: [.posixPermissions: 0o700])
            try Data().write(to: preference, options: .atomic)
        } else if fm.fileExists(atPath: preference.path) {
            try fm.removeItem(at: preference)
        }
    }
    let enabled = fm.fileExists(atPath: preference.path)
    if operation == "preference" || operation == "configure" { return ["enabled": enabled] }
    guard enabled else { throw failure("Meaning search disabled") }
    guard ["status", "inventory", "put", "remove", "query"].contains(operation) else {
        throw failure("Invalid meaning search operation")
    }
    let fields: [String: [String]] = [
        "put": ["type", "entityId", "version", "source", "chunks"],
        "remove": ["type", "entityId"],
        "query": ["scope", "query"]
    ]
    var payload: [String: Any] = ["operation": operation, "workspaceId": workspaceId]
    for key in fields[operation] ?? [] { payload[key] = input[key] }

    let result = try exchangeMeaningRequest(payload, timeout: operation == "put" ? 90 : 3)
    if operation == "status" && result["protocol"] as? String != "local-notes-meaning-v1" {
        throw failure("Local meaning search version is incompatible")
    }
    return result
}

private func exchangeMeaningRequest(_ payload: [String: Any], timeout: Int) throws -> [String: Any] {
    let temporary = FileManager.default.temporaryDirectory
    let defaultPath = temporary.appendingPathComponent("ln-meaning/service.sock").path
    let endpoint = ProcessInfo.processInfo.environment["LOCAL_NOTES_MEANING_SOCKET"] ?? defaultPath
    let directory = URL(fileURLWithPath: endpoint).deletingLastPathComponent().path
    var info = stat()
    guard lstat(directory, &info) == 0, info.st_uid == getuid(),
          info.st_mode & S_IFMT == S_IFDIR, info.st_mode & 0o077 == 0,
          lstat(endpoint, &info) == 0, info.st_uid == getuid(),
          info.st_mode & S_IFMT == S_IFSOCK, info.st_mode & 0o077 == 0 else {
        throw failure("Local meaning search unavailable")
    }

    let descriptor = socket(AF_UNIX, SOCK_STREAM, 0)
    guard descriptor >= 0 else { throw failure("Cannot connect to local meaning search") }
    defer { close(descriptor) }
    var noSignal: Int32 = 1
    var deadline = timeval(tv_sec: timeout, tv_usec: 0)
    let timeoutSize = socklen_t(MemoryLayout<timeval>.size)
    guard setsockopt(descriptor, SOL_SOCKET, SO_NOSIGPIPE, &noSignal, socklen_t(MemoryLayout<Int32>.size)) == 0,
          setsockopt(descriptor, SOL_SOCKET, SO_RCVTIMEO, &deadline, timeoutSize) == 0,
          setsockopt(descriptor, SOL_SOCKET, SO_SNDTIMEO, &deadline, timeoutSize) == 0 else {
        throw failure("Cannot configure local meaning search transport")
    }
    var address = sockaddr_un()
    let path = Array(endpoint.utf8CString)
    guard path.count <= MemoryLayout.size(ofValue: address.sun_path) else {
        throw failure("Local meaning search socket path is too long")
    }
    address.sun_len = UInt8(MemoryLayout<sockaddr_un>.size)
    address.sun_family = sa_family_t(AF_UNIX)
    withUnsafeMutableBytes(of: &address.sun_path) { destination in
        path.withUnsafeBytes { destination.prefix(path.count).copyBytes(from: $0) }
    }
    let connected = withUnsafePointer(to: &address) {
        $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
            connect(descriptor, $0, socklen_t(MemoryLayout<sockaddr_un>.size))
        }
    }
    var owner: uid_t = 0
    var group: gid_t = 0
    guard connected == 0, getpeereid(descriptor, &owner, &group) == 0, owner == getuid() else {
        throw failure("Local meaning search unavailable")
    }
    var message = try JSONSerialization.data(withJSONObject: payload)
    message.append(10)
    try message.withUnsafeBytes { bytes in
        var sent = 0
        while sent < bytes.count {
            let count = write(descriptor, bytes.baseAddress!.advanced(by: sent), bytes.count - sent)
            guard count > 0 else { throw failure("Local meaning search request failed") }
            sent += count
        }
    }
    var response = Data()
    var buffer = [UInt8](repeating: 0, count: 8192)
    while true {
        let count = read(descriptor, &buffer, buffer.count)
        guard count >= 0 else { throw failure("Local meaning search unavailable") }
        if count == 0 { break }
        response.append(contentsOf: buffer.prefix(count))
        guard response.count <= 8 * 1024 * 1024 else { throw failure("Local meaning search response too large") }
    }
    guard let result = try JSONSerialization.jsonObject(with: response) as? [String: Any],
          result["error"] == nil else { throw failure("Local meaning search rejected the request") }
    return result
}
