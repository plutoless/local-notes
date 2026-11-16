import Foundation
func failure(_ message: String) -> NSError { NSError(domain: "LocalNotesTests", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
@main struct StorageHarness {
    static func main() {
        let arguments = CommandLine.arguments
        let storage = ActionStorage(root: URL(fileURLWithPath: arguments[1]), privateRoot: URL(fileURLWithPath: arguments[2]))
        while let line = readLine() {
            do {
                let request = try JSONSerialization.jsonObject(with: Data(line.utf8)) as! [String: Any]
                let result = try storage.run(request)
                print(String(data: try JSONSerialization.data(withJSONObject: result), encoding: .utf8)!)
            } catch { print(String(data: try! JSONSerialization.data(withJSONObject: ["error": error.localizedDescription]), encoding: .utf8)!) }
            fflush(stdout)
        }
    }
}
