import Foundation
func failure(_ message: String) -> NSError { NSError(domain: "LocalNotesTests", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
@main struct StorageHarness {
    static func main() {
        let arguments = CommandLine.arguments
        let storage = ActionStorage(root: URL(fileURLWithPath: arguments[1]), privateRoot: URL(fileURLWithPath: arguments[2]))
        while let line = readLine() {
            do {
                let request = try JSONSerialization.jsonObject(with: Data(line.utf8)) as! [String: Any]
                let command = request["cmd"] as? String ?? ""
                let result: [String: Any]
                if command == "metadata" { result = try referenceMetadata(storage.root) } else if command.hasPrefix("reference") {
                    guard request["workspaceId"] as? String == (try storage.workspace()) else { throw failure("Workspace changed") }
                    result = try ReferenceIndex(privateRoot: storage.privateRoot, workspaceId: request["workspaceId"] as! String).run(request)
                } else { result = try storage.run(request) }
                print(String(data: try JSONSerialization.data(withJSONObject: result), encoding: .utf8)!)
            } catch { print(String(data: try! JSONSerialization.data(withJSONObject: ["error": error.localizedDescription]), encoding: .utf8)!) }
            fflush(stdout)
        }
    }
}
