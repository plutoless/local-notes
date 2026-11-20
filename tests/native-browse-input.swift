// Issue 81: an external, process-targeted sender with read-only capability checks.
import Cocoa
import CoreGraphics

func receipt(_ value: [String: Any]) {
    print(String(data: try! JSONSerialization.data(withJSONObject: value, options: .sortedKeys), encoding: .utf8)!)
}
let access: [String: Any] = ["senderPID": getpid(), "parentPID": getppid(), "postAccess": CGPreflightPostEventAccess(), "listenAccess": CGPreflightListenEventAccess(), "axTrusted": AXIsProcessTrusted()]
if CommandLine.arguments.count == 1 { receipt(access); exit(0) }
let args = CommandLine.arguments
guard args.count == 4, args[3] == "post", let pid = Int32(args[1]), let window = Int(args[2]), CGPreflightPostEventAccess(), NSRunningApplication(processIdentifier: pid)?.isActive == true,
      let windows = CGWindowListCopyWindowInfo(.optionIncludingWindow, CGWindowID(window)) as? [[String: Any]],
      windows.contains(where: { ($0[kCGWindowOwnerPID as String] as? Int) == Int(pid) && ($0[kCGWindowNumber as String] as? Int) == window }) else {
    receipt(access.merging(["ok": false, "error": "Owned active recipient or sender capability unavailable"]) { _, new in new }); exit(1)
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
let types = events.map { $0.type.rawValue }
guard events.count == 2, types == [1, 2] || types == [10, 11], events.allSatisfy({ NSEvent(cgEvent: $0)?.windowNumber == window }) else {
    receipt(["ok": false, "error": "Unsupported input or window association lost; nothing posted"]); exit(1)
}
var posted: [[String: Any]] = []
for event in events {
    event.setIntegerValueField(.eventSourceUserData, value: marker)
    posted.append(["type": event.type.rawValue, "x": event.location.x, "y": event.location.y, "flags": event.flags.rawValue, "keyCode": event.getIntegerValueField(.keyboardEventKeycode), "nativeWindow": NSEvent(cgEvent: event)!.windowNumber, "marker": marker, "utc": ISO8601DateFormatter().string(from: Date())])
    event.postToPid(pid)
    usleep(50000)
}
receipt(access.merging(["ok": true, "recipientPID": pid, "window": window, "posted": posted, "delivery": "unverified until observed in recipient"]) { _, new in new })
