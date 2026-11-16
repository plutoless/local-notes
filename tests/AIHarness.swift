import Foundation
func failure(_ message: String) -> NSError { NSError(domain: "AIHarness", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
@main struct AIHarness {
 static func main() {
  let service = AIService(URL(fileURLWithPath: CommandLine.arguments[1]))
  DispatchQueue.global().async {
   while let line = readLine() {
    do {
     let request = try JSONSerialization.jsonObject(with: Data(line.utf8)) as! [String: Any]
     let reply: ([String: Any]) -> Void = { result in
      let data = try! JSONSerialization.data(withJSONObject: result.merging(["id": request["id"]!]) { old, _ in old })
      print(String(data: data, encoding: .utf8)!); fflush(stdout)
     }
     if request["cmd"] as? String == "aiAnalyze" { service.analyze(request, completion: reply) }
     else if request["cmd"] as? String == "aiCancel" { service.cancel(); reply([:]) }
     else { reply(try service.configure(request)) }
    } catch { print("{\"error\":\"configuration error\"}"); fflush(stdout) }
   }
   exit(0)
  }
  dispatchMain()
 }
}
