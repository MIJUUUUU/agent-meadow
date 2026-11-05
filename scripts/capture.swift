// Render the shipped UI with documented sample states; no live conversations are read.
import Cocoa
import WebKit
final class Capture: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var index = 0
    let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
    let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration()
        config.userContentController.addUserScript(WKUserScript(source: "window.acquireVsCodeApi=()=>({postMessage:()=>{}});", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        web = WKWebView(frame: .zero, configuration: config)
        web.setValue(false, forKey: "drawsBackground"); web.navigationDelegate = self
        window = NSWindow(contentRect: .zero, styleMask: .borderless, backing: .buffered, defer: false)
        window.backgroundColor = .clear; window.isOpaque = false; window.contentView = web
        load()
    }
    func load() {
        window.setFrame(NSRect(x: 0, y: 0, width: 1000, height: index == 0 ? 420 : 220), display: true)
        window.orderFrontRegardless()
        web.loadFileURL(root.appendingPathComponent(index == 0 ? "capture-garden.html" : "desktop.html"), allowingReadAccessTo: root)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let characters = ["rabbit", "cat", "penguin", "dog", "hamster"]
        let states = ["thinking", "working", "waiting", "done", "sleeping"]
        let messages = ["생각을 정리하는 중…", "코드를 다듬는 중", "계획을 확인해 주세요!", "다 했어요!", "잠깐 쉬고 있어요…"]
        let tasks = ["API 구현", "UI 개발", "코드 리뷰", "테스트", "문서 정리"]
        let pets = characters.enumerated().map { i, character in
            ["id":character, "provider":i % 2 == 0 ? "codex" : "claude", "character":character, "state":states[i], "message":messages[i], "name":(i % 2 == 0 ? "Codex" : "Claude") + " · agent-meadow", "task":tasks[i]]
        }
        let data = try! JSONSerialization.data(withJSONObject: ["type":"state","pets":pets])
        let json = String(data:data,encoding:.utf8)!
        web.evaluateJavaScript("window.dispatchEvent(new MessageEvent('message',{data:\(json)}));") { _, error in
            if let error = error { fputs("\(error)\n",stderr); exit(1) }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                let config = WKSnapshotConfiguration(); config.snapshotWidth = 1000
                self.web.takeSnapshot(with: config) { image, error in
                    guard let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data:tiff), let png = bitmap.representation(using:.png,properties:[:]) else { fputs("Snapshot failed\n",stderr);exit(1) }
                    let file = self.output.appendingPathComponent(self.index == 0 ? "agent-meadow-panel.png" : "agent-meadow-desktop.png")
                    do { try png.write(to:file) } catch { fputs("\(error)\n",stderr);exit(1) }
                    print(file.path)
                    self.index += 1
                    if self.index == 2 { NSApp.terminate(nil) } else { self.load() }
                }
            }
        }
    }
}
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = Capture(); app.delegate = delegate; app.run()
