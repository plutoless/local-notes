import Foundation
import CoreGraphics

// Read-only discovery for production-test panels omitted by layer-zero UI tools.
let owner = Int(CommandLine.arguments[1])!
let windows = CGWindowListCopyWindowInfo(.optionAll, kCGNullWindowID) as? [[String: Any]] ?? []
let owned = windows.filter { ($0[kCGWindowOwnerPID as String] as? Int) == owner }
let data = try JSONSerialization.data(withJSONObject: owned, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
