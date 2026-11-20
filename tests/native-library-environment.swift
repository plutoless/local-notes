// Issue 65: keep reversible environment state private, publishing only receipts.
import Cocoa
import Carbon

func inputID() -> String {
    let source = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
    return Unmanaged<CFString>.fromOpaque(TISGetInputSourceProperty(source, kTISPropertyInputSourceID)).takeUnretainedValue() as String
}
func clipboard() -> [[String: String]] {
    (NSPasteboard.general.pasteboardItems ?? []).map { item in
        Dictionary(uniqueKeysWithValues: item.types.compactMap { type in item.data(forType: type).map { (type.rawValue, $0.base64EncodedString()) } })
    }
}
func receipt(_ value: [String: Any]) throws {
    print(String(data: try JSONSerialization.data(withJSONObject: value, options: .sortedKeys), encoding: .utf8)!)
}
let args = CommandLine.arguments
precondition(args.count == 3 && ["save", "restore"].contains(args[1]))
let path = URL(fileURLWithPath: args[2])
if args[1] == "save" {
    let state: [String: Any] = ["input": inputID(), "clipboard": clipboard()]
    try JSONSerialization.data(withJSONObject: state, options: .sortedKeys).write(to: path, options: .atomic)
    try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: path.path)
    try receipt(["saved": true, "inputSource": inputID(), "privateSnapshot": true])
} else {
    let state = try JSONSerialization.jsonObject(with: Data(contentsOf: path)) as! [String: Any]
    let originalInput = state["input"] as! String
    let originalClipboard = state["clipboard"] as! [[String: String]]
    let changedInput = inputID() != originalInput, changedClipboard = clipboard() != originalClipboard
    if changedInput {
        let filter = [kTISPropertyInputSourceID as String: originalInput] as CFDictionary
        let sources = TISCreateInputSourceList(filter, false).takeRetainedValue() as! [TISInputSource]
        guard let source = sources.first, TISSelectInputSource(source) == noErr else { fatalError("Could not restore input source") }
    }
    if changedClipboard {
        let items = originalClipboard.map { representations -> NSPasteboardItem in
            let item = NSPasteboardItem()
            for (type, encoded) in representations { item.setData(Data(base64Encoded: encoded)!, forType: NSPasteboard.PasteboardType(type)) }
            return item
        }
        NSPasteboard.general.clearContents()
        if !items.isEmpty { precondition(NSPasteboard.general.writeObjects(items)) }
    }
    let restoredInput = inputID() == originalInput, restoredClipboard = clipboard() == originalClipboard
    try receipt(["inputSource": inputID(), "inputRestored": restoredInput, "clipboardRestored": restoredClipboard, "inputChangedDuringRun": changedInput, "clipboardChangedDuringRun": changedClipboard])
    precondition(restoredInput && restoredClipboard)
    try FileManager.default.removeItem(at: path)
}
