import Foundation

// Enumerate metadata only; callers retain existing rows on any traversal warning.
func referenceMetadata(_ root: URL) throws -> [String: Any] {
    let fm = FileManager.default
            guard fm.fileExists(atPath: root.path) else { throw failure("Note directory unavailable") }
            var notes = [[String: Any]](), warnings = [String]()
            let keys: Set<URLResourceKey> = [.isDirectoryKey, .isSymbolicLinkKey, .contentModificationDateKey, .fileSizeKey]
            guard let enumerator = fm.enumerator(at: root, includingPropertiesForKeys: Array(keys), options: [.skipsHiddenFiles], errorHandler: { url, error in warnings.append("\(url.path): \(error.localizedDescription)"); return true }) else { throw failure("Note directory unavailable") }
            for case let url as URL in enumerator {
                do {
                    let v = try url.resourceValues(forKeys: keys)
                    if v.isSymbolicLink == true || ["credentials", "localnotesdata"].contains(url.lastPathComponent.lowercased()) { enumerator.skipDescendants(); continue }
                    if v.isDirectory == true { continue }
                    guard url.pathExtension.lowercased() == "md", (v.fileSize ?? 0) <= 2_000_000 else { continue }
                    notes.append(["path": String(url.resolvingSymlinksInPath().path.dropFirst(root.resolvingSymlinksInPath().path.count + 1)), "modified": v.contentModificationDate?.timeIntervalSince1970 ?? 0, "size": v.fileSize ?? 0])
                } catch { warnings.append("\(url.path): \(error.localizedDescription)") }
            }
            return ["notes": notes, "root": root.path, "warnings": warnings]
}
