// Test-only durable prelaunch restoration; never print original clipboard data.
import Cocoa
import Carbon

struct Baseline: Codable {
    let inputSource: String
    let clipboard: [[String: Data]]
}
func sourceID(_ source: TISInputSource) -> String {
    guard let value = TISGetInputSourceProperty(source, kTISPropertyInputSourceID) else { return "" }
    return Unmanaged<CFString>.fromOpaque(value).takeUnretainedValue() as String
}
func clipboard() -> [[String: Data]] {
    (NSPasteboard.general.pasteboardItems ?? []).map { item in
        Dictionary(uniqueKeysWithValues: item.types.compactMap { type in
            item.data(forType: type).map { (type.rawValue, $0) }
        })
    }
}
func run() throws {
    let args = CommandLine.arguments
    guard args.count == 3, ["snapshot", "restore"].contains(args[1]) else {
        throw NSError(domain: "IMEBaseline", code: 1, userInfo: [NSLocalizedDescriptionKey: "Expected snapshot/restore and private file path"])
    }
    let url = URL(fileURLWithPath: args[2])
    if args[1] == "snapshot" {
        guard !FileManager.default.fileExists(atPath: url.path) else {
            throw NSError(domain: "IMEBaseline", code: 2, userInfo: [NSLocalizedDescriptionKey: "Refusing to overwrite an existing restoration baseline"])
        }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        let baseline = Baseline(inputSource: sourceID(TISCopyCurrentKeyboardInputSource().takeRetainedValue()), clipboard: clipboard())
        guard !baseline.inputSource.isEmpty else { throw NSError(domain: "IMEBaseline", code: 3) }
        let data = try PropertyListEncoder().encode(baseline)
        // Creation is private from the first byte; retain the durable file until restoration verifies.
        guard FileManager.default.createFile(atPath: url.path, contents: data, attributes: [.posixPermissions: 0o600]) else {
            throw NSError(domain: "IMEBaseline", code: 4)
        }
        print("{\"snapshotSaved\":true,\"prelaunch\":true}")
    } else {
        let baseline = try PropertyListDecoder().decode(Baseline.self, from: Data(contentsOf: url))
        let sources = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
        guard let source = sources.first(where: { sourceID($0) == baseline.inputSource }), TISSelectInputSource(source) == noErr else {
            throw NSError(domain: "IMEBaseline", code: 5)
        }
        let items = baseline.clipboard.map { saved -> NSPasteboardItem in
            let item = NSPasteboardItem()
            for (type, data) in saved { item.setData(data, forType: NSPasteboard.PasteboardType(type)) }
            return item
        }
        NSPasteboard.general.clearContents()
        if !items.isEmpty { guard NSPasteboard.general.writeObjects(items) else { throw NSError(domain: "IMEBaseline", code: 6) } }
        guard sourceID(TISCopyCurrentKeyboardInputSource().takeRetainedValue()) == baseline.inputSource,
              clipboard() == baseline.clipboard else { throw NSError(domain: "IMEBaseline", code: 7) }
        try FileManager.default.removeItem(at: url)
        print("{\"inputSourceRestored\":true,\"clipboardRestoredExactBytes\":true,\"privateBaselineDeleted\":true}")
    }
}
do { try run() } catch {
    fputs("Baseline operation failed; preserve private restoration file: \(error.localizedDescription)\n", stderr)
    exit(1)
}
