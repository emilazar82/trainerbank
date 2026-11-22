import UIKit
import WebKit
import AVFoundation

/// Schlanke Hülle um das Spiel: Die HTML-Datei liegt in der App (web/index.html)
/// und läuft in einem WKWebView. Die App greift nicht auf das Netz zu: Gespielt wird immer die
/// mitgelieferte Spieldatei, neue Fassungen kommen als App-Update.
final class GameViewController: UIViewController, WKNavigationDelegate, WKUIDelegate,
                                WKScriptMessageHandler, UIDocumentPickerDelegate {

    private static let scheme = "trainerbank"
    private static let startURL = URL(string: "trainerbank://app/index.html")!
    private static let bg = UIColor(red: 15 / 255, green: 90 / 255, blue: 84 / 255, alpha: 1)

    private var web: WKWebView!
    private var pendingSaveURL: URL?

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.bg

        // Ton wie bei einem Spiel: Der Stummschalter am Gerät gilt, fremde Musik läuft weiter.
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [])
        try? AVAudioSession.sharedInstance().setActive(true)

        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()                       // Spielstand bleibt auf dem Gerät erhalten
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: Self.scheme)

        // Brücke zum Spiel: window.TBApp (wie in der Android-App)
        let bridge = """
        window.TBApp = {
          ios: true,
          saveFile: function (name, json) {
            window.webkit.messageHandlers.tb.postMessage({ a: 'save', name: String(name), json: String(json) });
          },
          shareFile: function (name, json, text) {
            window.webkit.messageHandlers.tb.postMessage({ a: 'share', name: String(name), json: String(json), text: String(text || '') });
          },
          haptic: function (kind) {
            window.webkit.messageHandlers.tb.postMessage({ a: 'haptic', kind: String(kind || '') });
          }
        };
        """
        let noSelect = """
        (function () {
          var s = document.createElement('style');
          s.textContent = 'html,body{-webkit-touch-callout:none;-webkit-user-select:none;overscroll-behavior:none}' +
                          'input,textarea{-webkit-user-select:text}';
          document.documentElement.appendChild(s);
        })();
        """
        cfg.userContentController.addUserScript(
            WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        cfg.userContentController.addUserScript(
            WKUserScript(source: noSelect, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        cfg.userContentController.add(WeakHandler(self), name: "tb")

        web = WKWebView(frame: .zero, configuration: cfg)

        // Zurück aus dem Hintergrund: Tonsitzung wieder aktivieren und das Spiel den Ton aufwecken lassen
        NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification,
                                               object: nil, queue: .main) { [weak self] _ in
            try? AVAudioSession.sharedInstance().setActive(true)
            self?.web.evaluateJavaScript("window.TBWake && window.TBWake()", completionHandler: nil)
        }
        web.navigationDelegate = self
        web.uiDelegate = self
        web.isOpaque = false
        web.backgroundColor = Self.bg
        web.scrollView.backgroundColor = Self.bg
        web.scrollView.bounces = false
        web.scrollView.alwaysBounceVertical = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.showsHorizontalScrollIndicator = false
        web.allowsBackForwardNavigationGestures = false
        web.allowsLinkPreview = false
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)

        // Inhalt nicht unter Statusleiste, Notch oder Home-Balken schieben
        let g = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: g.topAnchor),
            web.bottomAnchor.constraint(equalTo: g.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: g.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: g.trailingAnchor)
        ])

        Self.dropDownloadedGame()
        web.load(URLRequest(url: Self.startURL))
    }

    /// Frühere Testfassungen haben eine Spieldatei nachgeladen. Die wird entfernt und nicht mehr benutzt.
    private static func dropDownloadedGame() {
        let root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.removeItem(at: root.appendingPathComponent("web", isDirectory: true))
    }


    // MARK: Navigation – die App bleibt bei der eigenen Spieldatei

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { return decisionHandler(.cancel) }
        if url.scheme == Self.scheme || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" {
            return decisionHandler(.allow)
        }
        decisionHandler(.cancel)
    }

    /// Falls iOS den Webinhalt wegen Speichermangel beendet: Spiel neu laden (der Spielstand ist gesichert).
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.load(URLRequest(url: Self.startURL))
    }

    // MARK: Meldungen des Spiels (alert / confirm / prompt)

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(a, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        a.addTextField { $0.text = defaultText }
        a.addAction(UIAlertAction(title: "Abbrechen", style: .cancel) { _ in completionHandler(nil) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(a.textFields?.first?.text) })
        present(a, animated: true)
    }

    // MARK: Brücke

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let action = body["a"] as? String else { return }
        switch action {
        case "save":
            saveFile(name: body["name"] as? String ?? "trainerbank-spielstand.json",
                     json: body["json"] as? String ?? "")
        case "share":
            shareFile(name: body["name"] as? String ?? "trainerbank-spielstand.json",
                      json: body["json"] as? String ?? "")
        case "haptic":
            let kind = body["kind"] as? String ?? ""
            if kind == "goal" {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } else {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
        default:
            break
        }
    }

    /// Spielstand sichern: Datei anlegen und den Speicherort vom Nutzer wählen lassen (Dateien-App).
    private func saveFile(name: String, json: String) {
        let safe = name.replacingOccurrences(of: "/", with: "-")
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(safe)
        do {
            try json.data(using: .utf8)?.write(to: tmp, options: .atomic)
        } catch {
            return saved(false)
        }
        pendingSaveURL = tmp
        let picker = UIDocumentPickerViewController(forExporting: [tmp], asCopy: true)
        picker.delegate = self
        present(picker, animated: true)
    }

    /// Spielstand teilen: Datei über das Teilen-Menü (AirDrop, Nachrichten, Mail, Dateien …) weitergeben.
    private func shareFile(name: String, json: String) {
        let safe = name.replacingOccurrences(of: "/", with: "-")
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("share", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let tmp = dir.appendingPathComponent(safe)
        do {
            try json.data(using: .utf8)?.write(to: tmp, options: .atomic)
        } catch {
            return shared(false)
        }
        let vc = UIActivityViewController(activityItems: [tmp], applicationActivities: nil)
        if let pop = vc.popoverPresentationController {
            pop.sourceView = view
            pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            pop.permittedArrowDirections = []
        }
        vc.completionWithItemsHandler = { [weak self] _, done, _, _ in
            try? FileManager.default.removeItem(at: tmp)
            self?.shared(done)
        }
        present(vc, animated: true)
    }

    private func shared(_ ok: Bool) {
        web.evaluateJavaScript("window.tbShared&&window.tbShared(\(ok ? "true" : "false"))", completionHandler: nil)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        cleanup()
        saved(true)
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        cleanup()
        saved(false)
    }

    private func cleanup() {
        if let u = pendingSaveURL { try? FileManager.default.removeItem(at: u) }
        pendingSaveURL = nil
    }

    private func saved(_ ok: Bool) {
        web.evaluateJavaScript("window.tbSaved&&window.tbSaved(\(ok ? "true" : "false"))", completionHandler: nil)
    }
}

/// Liefert die mitgelieferten Dateien aus dem Ordner web/ der App aus.
/// Eine feste Adresse (trainerbank://app/…) sorgt dafür, dass der Spielstand zuverlässig erhalten bleibt.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            return task.didFailWithError(URLError(.badURL))
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let name = (path as NSString).lastPathComponent
        let ext = (name as NSString).pathExtension
        let base = (name as NSString).deletingPathExtension
        // Nur Dateien direkt aus web/ – keine Unterordner, kein Zugriff nach außen.
        // Die Spieldatei ist immer die mitgelieferte.
        let found: Data?
        if name == "index.html" {
            found = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web").flatMap { try? Data(contentsOf: $0) }
        } else if !name.contains(".."), let file = Bundle.main.url(forResource: base, withExtension: ext, subdirectory: "web") {
            found = try? Data(contentsOf: file)
        } else {
            found = nil
        }
        guard let data = found else {
            return task.didFailWithError(URLError(.fileDoesNotExist))
        }
        let mime: String
        switch ext.lowercased() {
        case "html": mime = "text/html"
        case "json": mime = "application/json"
        case "js": mime = "text/javascript"
        case "css": mime = "text/css"
        case "png": mime = "image/png"
        default: mime = "application/octet-stream"
        }
        let headers = [
            "Content-Type": mime + (mime.hasPrefix("text/") ? "; charset=utf-8" : ""),
            "Content-Length": String(data.count),
            "Cache-Control": "no-store"
        ]
        let resp = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(resp)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

/// Verhindert, dass der WebView den Controller dauerhaft festhält.
final class WeakHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        target?.userContentController(c, didReceive: m)
    }
}
