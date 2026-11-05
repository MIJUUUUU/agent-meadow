import Cocoa
import WebKit

final class Companion: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    var panel: NSPanel!
    var web: WKWebView!
    var timer: Timer?
    var boxes: [CGRect] = []
    var state: [String: Any] = ["type": "state", "pets": []]
    var ready = false
    func applicationDidFinishLaunching(_ notification: Notification) {
        let controller = WKUserContentController()
        controller.add(self, name: "meadow")
        controller.addUserScript(WKUserScript(source: "window.acquireVsCodeApi=()=>({postMessage:m=>window.webkit.messageHandlers.meadow.postMessage(m)});", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let config = WKWebViewConfiguration(); config.userContentController = controller
        web = WKWebView(frame: .zero, configuration: config)
        web.setValue(false, forKey: "drawsBackground"); web.navigationDelegate = self
        panel = NSPanel(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false
        panel.level = .floating; panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.hidesOnDeactivate = false; panel.ignoresMouseEvents = true; panel.contentView = web
        layout(); panel.orderFrontRegardless()
        let media = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        web.loadFileURL(media.appendingPathComponent("desktop.html"), allowingReadAccessTo: media)
        NotificationCenter.default.addObserver(self, selector: #selector(layout), name: NSApplication.didChangeScreenParametersNotification, object: nil)
        timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            let mouse = NSEvent.mouseLocation
            let local = CGPoint(x: mouse.x - self.panel.frame.minX, y: self.panel.frame.maxY - mouse.y)
            self.panel.ignoresMouseEvents = !self.boxes.contains { $0.contains(local) }
        }
        DispatchQueue.global().async {
            while let line = readLine() {
                guard let data = line.data(using: .utf8), let message = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }
                DispatchQueue.main.async {
                    self.state = message
                    self.sendState()
                }
            }
            DispatchQueue.main.async { NSApp.terminate(nil) }
        }
    }
    @objc func layout() {
        guard let screen = NSScreen.main ?? NSScreen.screens.first else { return }
        let rect = screen.visibleFrame
        panel.setFrame(NSRect(x: rect.minX, y: rect.minY, width: rect.width, height: min(240, rect.height)), display: true)
    }
    func emit(_ value: [String: Any]) {
        if let data = try? JSONSerialization.data(withJSONObject: value), let text = String(data: data, encoding: .utf8) { print(text); fflush(stdout) }
    }
    func sendState() {
        guard ready, let data = try? JSONSerialization.data(withJSONObject: state), let text = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.dispatchEvent(new MessageEvent('message',{data:\(text)}));", completionHandler: nil)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { ready = true; sendState(); emit(["type":"ready"]); if CommandLine.arguments.contains("--self-test") { selfTest() } }
    func selfTest() {
        let species = ["cat", "rabbit", "penguin", "hamster", "dog"]
        state = ["type":"state", "pets":species.enumerated().map { i, character in
            ["id":character, "provider":"claude", "character":character, "name":character, "state":i == 0 ? "waiting" : "idle", "message":i == 0 ? "확인해 주세요!" : "산책 중", "task":"바탕화면 테스트"]
        }]
        sendState()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.web.evaluateJavaScript("JSON.stringify({count:document.querySelectorAll('.pet').length,transparent:getComputedStyle(document.body).backgroundColor==='rgba(0, 0, 0, 0)',drawn:[...document.querySelectorAll('canvas')].every(c=>c.getContext('2d').getImageData(0,0,40,44).data.some(v=>v>0))})") { value, error in
                guard error == nil, let result = value as? String else { self.emit(["type":"self-test","error":String(describing:error)]); exit(1) }
                self.emit(["type":"self-test","result":result,"hitBoxes":self.boxes.count])
                self.web.takeSnapshot(with: nil) { image, error in
                    if let data = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data), let png = bitmap.representation(using: .png, properties: [:]) {
                        try? png.write(to: URL(fileURLWithPath: "/private/tmp/agent-meadow-desktop.png"))
                    }
                    self.state = ["type":"state","pets":[]]; self.sendState()
                    self.web.evaluateJavaScript("document.querySelectorAll('.pet').length") { value, error in
                        self.emit(["type":"self-test-removal","count":value ?? -1]); NSApp.terminate(nil)
                    }
                }
            }
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(navigationAction.request.url?.isFileURL == true ? .allow : .cancel)
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let m = message.body as? [String: Any], let type = m["type"] as? String else { return }
        if type == "bounds", let rows = m["boxes"] as? [[String: Double]] {
            boxes = rows.map { CGRect(x: $0["x"] ?? 0, y: $0["y"] ?? 0, width: $0["width"] ?? 0, height: $0["height"] ?? 0) }; return
        }
        guard let id = m["id"] as? String else { return }
        if type == "desktopMenu" {
            let menu = NSMenu()
            let item = NSMenuItem(title: "VS Code로 돌려보내기", action: #selector(returnPet(_:)), keyEquivalent: "")
            item.target = self; item.representedObject = id; menu.addItem(item)
            let all = NSMenuItem(title: "모두 돌려보내고 닫기", action: #selector(closePets), keyEquivalent: "")
            all.target = self; menu.addItem(all)
            let pos = web.convert(panel.mouseLocationOutsideOfEventStream, from: nil)
            menu.popUp(positioning: nil, at: pos, in: web)
        } else if type == "inspect" || type == "character" {
            if let app = ProcessInfo.processInfo.environment["MEADOW_EDITOR_APP"] {
                NSWorkspace.shared.openApplication(at: URL(fileURLWithPath: app), configuration: NSWorkspace.OpenConfiguration(), completionHandler: nil)
            }
            emit(["type":type,"id":id])
        }
    }
    @objc func returnPet(_ item: NSMenuItem) { if let id = item.representedObject as? String { emit(["type":"return","id":id]) } }
    @objc func closePets() { NSApp.terminate(nil) }
}
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = Companion(); app.delegate = delegate
app.run()
