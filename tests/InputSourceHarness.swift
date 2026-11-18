import Foundation
import Carbon
func property(_ source: TISInputSource, _ key: CFString) -> String {
 guard let pointer = TISGetInputSourceProperty(source, key) else { return "" }
 return Unmanaged<CFString>.fromOpaque(pointer).takeUnretainedValue() as String
}
let sources = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
let current = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
if CommandLine.arguments.count == 1 {
 print(property(current, kTISPropertyInputSourceID))
 for source in sources { print(property(source,kTISPropertyInputSourceID)+" | "+property(source,kTISPropertyLocalizedName)) }
} else {
 let id=CommandLine.arguments[1]
 guard let source=sources.first(where:{ property($0,kTISPropertyInputSourceID)==id }) else { fatalError("Input source unavailable: "+id) }
 let status=TISSelectInputSource(source)
 print("status=\(status) selected="+property(TISCopyCurrentKeyboardInputSource().takeRetainedValue(),kTISPropertyInputSourceID))
 if status != noErr { exit(1) }
}
