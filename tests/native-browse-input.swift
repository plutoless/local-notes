// Issue 81: an external, process-targeted sender with read-only capability checks.
import Cocoa
import CoreGraphics

func receipt(_ value: [String: Any]) {
    print(String(data: try! JSONSerialization.data(withJSONObject: value, options: .sortedKeys), encoding: .utf8)!)
}
let access: [String: Any] = ["senderPID": getpid(), "parentPID": getppid(), "postAccess": CGPreflightPostEventAccess(), "listenAccess": CGPreflightListenEventAccess(), "axTrusted": AXIsProcessTrusted()]
if CommandLine.arguments.count == 1 { receipt(access); exit(0) }
let args = CommandLine.arguments
guard args.count >= 5, let pid = Int32(args[1]), let window = Int(args[2]), CGPreflightPostEventAccess(), NSRunningApplication(processIdentifier: pid)?.isActive == true,
      let windows = CGWindowListCopyWindowInfo(.optionIncludingWindow, CGWindowID(window)) as? [[String: Any]],
      windows.contains(where: { ($0[kCGWindowOwnerPID as String] as? Int) == Int(pid) && ($0[kCGWindowNumber as String] as? Int) == window }) else {
    receipt(access.merging(["ok": false, "error": "Owned active recipient or sender capability unavailable"]) { _, new in new }); exit(1)
}
let marker: Int64 = 810053
var events: [CGEvent] = []
if args[3] == "click", args.count == 6, let x = Double(args[4]), let y = Double(args[5]) {
    events = [CGEventType.leftMouseDown, .leftMouseUp].compactMap {
        CGEvent(mouseEventSource: nil, mouseType: $0, mouseCursorPosition: CGPoint(x: x, y: y), mouseButton: .left)
    }
} else if args[3] == "key", args.count == 5 {
    let codes: [String: CGKeyCode] = ["Tab": 48, "Shift+Tab": 48, "Escape": 53, "Return": 36, "CmdOrCtrl+A": 0]
    if let code = codes[args[4]] {
        events = [true, false].compactMap { down in
            let event = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: down)
            if args[4] == "Shift+Tab" { event?.flags = .maskShift }
            if args[4] == "CmdOrCtrl+A" { event?.flags = .maskCommand }
            return event
        }
    }
}
guard events.count == 2 else { receipt(["ok": false, "error": "Unsupported input; nothing posted"]); exit(1) }
var posted: [[String: Any]] = []
for event in events {
    event.setIntegerValueField(.eventSourceUserData, value: marker)
    posted.append(["type": event.type.rawValue, "x": event.location.x, "y": event.location.y, "flags": event.flags.rawValue, "keyCode": event.getIntegerValueField(.keyboardEventKeycode), "windowUnderPointer": event.getIntegerValueField(.mouseEventWindowUnderMousePointer), "marker": marker, "utc": ISO8601DateFormatter().string(from: Date())])
    event.postToPid(pid)
    usleep(50000)
}
receipt(access.merging(["ok": true, "recipientPID": pid, "window": window, "posted": posted, "delivery": "unverified until observed in recipient"]) { _, new in new })
