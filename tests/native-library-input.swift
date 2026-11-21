// Issue 65: external process-targeted input with independent guard diagnostics.
import Cocoa
import CoreGraphics

func receipt(_ value: [String: Any]) {
    print(String(data: try! JSONSerialization.data(withJSONObject: value, options: .sortedKeys), encoding: .utf8)!)
}
// A pure guard seam permits rejection tests without GUI discovery or input.
func failedChecks(_ checks: [String: Bool]) -> [String] {
    checks.filter { !$0.value }.map { $0.key }.sorted()
}
if CommandLine.arguments == [CommandLine.arguments[0], "--self-test"] {
    let passing = ["arguments": true, "postAccess": true, "recipientActive": true, "frontmostRecipient": true, "windowQueryAvailable": true, "windowOwned": true]
    precondition(failedChecks(passing).isEmpty)
    for name in passing.keys {
        var rejected = passing; rejected[name] = false
        precondition(failedChecks(rejected) == [name])
    }
    receipt(["passed": true, "guardConditionsTested": passing.keys.sorted(), "guiDiscovery": false, "posted": false])
    exit(0)
}
let args = CommandLine.arguments
let pid: pid_t = args.count == 4 ? Int32(args[1]) ?? 0 : 0
let window: Int = args.count == 4 ? Int(args[2]) ?? 0 : 0
let access: [String: Any] = ["senderPID": getpid(), "parentPID": getppid(), "postAccess": CGPreflightPostEventAccess(), "listenAccess": CGPreflightListenEventAccess(), "axTrusted": AXIsProcessTrusted()]
func recipientSnapshot() -> [String: Any] {
    let application = NSRunningApplication(processIdentifier: pid)
    let windows = CGWindowListCopyWindowInfo(.optionIncludingWindow, CGWindowID(window)) as? [[String: Any]]
    // Publish only the requested or owned window's routing fields, never titles.
    let owned = (CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID) as? [[String: Any]] ?? []).filter { ($0[kCGWindowOwnerPID as String] as? Int) == Int(pid) }
    func routing(_ entries: [[String: Any]]) -> [[String: Any]] {
        entries.map { entry in Dictionary(uniqueKeysWithValues: [kCGWindowOwnerPID, kCGWindowNumber, kCGWindowLayer, kCGWindowIsOnscreen].compactMap { key in entry[key as String].map { (key as String, $0) } }) }
    }
    let frontmost = NSWorkspace.shared.frontmostApplication?.processIdentifier ?? -1
    let checks = ["arguments": args.count == 4 && args[3] == "post" && pid > 0 && window > 0,
                  "postAccess": CGPreflightPostEventAccess(), "recipientActive": application?.isActive == true,
                  "frontmostRecipient": frontmost == pid, "windowQueryAvailable": windows != nil,
                  "windowOwned": windows?.contains(where: { ($0[kCGWindowOwnerPID as String] as? Int) == Int(pid) && ($0[kCGWindowNumber as String] as? Int) == window }) == true]
    return ["checks": checks, "failedChecks": failedChecks(checks), "recipientPID": pid, "expectedWindow": window,
            "frontmostPID": frontmost, "recipientExists": application != nil, "recipientTerminated": application?.isTerminated ?? true,
            "recipientHidden": application?.isHidden ?? true, "requestedWindowRouting": routing((windows ?? []).filter { ($0[kCGWindowOwnerPID as String] as? Int) == Int(pid) || ($0[kCGWindowNumber as String] as? Int) == window }), "ownedWindowRouting": routing(owned), "utc": ISO8601DateFormatter().string(from: Date())]
}
let initial = recipientSnapshot()
guard (initial["failedChecks"] as! [String]).isEmpty else {
    receipt(access.merging(["ok": false, "posted": false, "stage": "recipient-preflight", "recipient": initial]) { _, new in new }); exit(1)
}
let marker: Int64 = 810053
// Event construction uses the fixture's actual NSWindow; this process only
// decodes public CGEvent data and posts through the OS, without app dispatch APIs.
let input = FileHandle.standardInput.readDataToEndOfFile()
let payload = (try? JSONSerialization.jsonObject(with: input)) as? [String: Any]
let flattened = payload?["events"] as? [String] ?? []
let events = flattened.compactMap { value -> CGEvent? in
    guard let data = Data(base64Encoded: value) else { return nil }
    return CGEvent(withDataAllocator: nil, data: data as CFData)
}
let decoded: [[String: Any]] = events.map { event in
    ["type": event.type.rawValue, "sourcePID": event.getIntegerValueField(.eventSourceUnixProcessID), "window": NSEvent(cgEvent: event)?.windowNumber ?? -1]
}
let types = events.map { $0.type.rawValue }
guard events.count == 2, types == [1, 2] || types == [10, 11], events.allSatisfy({ NSEvent(cgEvent: $0)?.windowNumber == window && $0.getIntegerValueField(.eventSourceUnixProcessID) == Int64(getpid()) }) else {
    receipt(access.merging(["ok": false, "posted": false, "stage": "event-envelope", "recipient": initial, "decoded": decoded, "error": "Unsupported input or window association lost; nothing posted"]) { _, new in new }); exit(1)
}
var posted: [[String: Any]] = []
for event in events {
    let current = recipientSnapshot()
    guard (current["failedChecks"] as! [String]).isEmpty else {
        receipt(access.merging(["ok": false, "stage": "before-event", "recipient": current, "posted": posted, "decoded": decoded]) { _, new in new }); exit(1)
    }
    event.setIntegerValueField(.eventSourceUserData, value: marker)
    posted.append(["type": event.type.rawValue, "x": event.location.x, "y": event.location.y, "flags": event.flags.rawValue, "keyCode": event.getIntegerValueField(.keyboardEventKeycode), "nativeWindow": NSEvent(cgEvent: event)!.windowNumber, "sourcePID": event.getIntegerValueField(.eventSourceUnixProcessID), "marker": marker, "utc": ISO8601DateFormatter().string(from: Date())])
    event.postToPid(pid)
    usleep(50000)
}
receipt(access.merging(["ok": true, "recipientPID": pid, "window": window, "recipient": initial, "decoded": decoded, "posted": posted, "delivery": "unverified until observed in recipient"]) { _, new in new })
