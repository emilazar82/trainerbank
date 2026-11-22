import UIKit
import WebKit
import AVFoundation

/// Schlanke Hülle um das Spiel: Die HTML-Datei liegt in der App (web/index.html)
/// und läuft in einem WKWebView. Gespielt wird immer die mitgelieferte Spieldatei, neue Fassungen
/// kommen als App-Update. Ins Netz geht nur die freiwillige Online-Sicherung der Spielstände.
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
          scanQR: function () {
            window.webkit.messageHandlers.tb.postMessage({ a: 'scan' });
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
        case "scan":
            scanQR()
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

    /// QR-Code der Online-Sicherung mit der Kamera lesen und den Inhalt ans Spiel geben.
    private func scanQR() {
        let go = { [weak self] in
            guard let self = self else { return }
            let vc = QRScanViewController()
            vc.onResult = { [weak self] text in
                guard let self = self, let text = text else { return }
                let js = (try? String(data: JSONSerialization.data(withJSONObject: [text]), encoding: .utf8)) ?? "[\"\"]"
                self.web.evaluateJavaScript("window.tbScan&&window.tbScan(\(js)[0])", completionHandler: nil)
            }
            vc.modalPresentationStyle = .fullScreen
            self.present(vc, animated: true)
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            go()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { ok in DispatchQueue.main.async { ok ? go() : self.cameraDenied() } }
        default:
            cameraDenied()
        }
    }

    private func cameraDenied() {
        let a = UIAlertController(title: "Kamera nicht erlaubt",
                                  message: "Erlaube Trainerbank in den Einstellungen den Zugriff auf die Kamera oder tipp den Code ein.",
                                  preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Einstellungen", style: .default) { _ in
            if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
        })
        a.addAction(UIAlertAction(title: "OK", style: .cancel))
        present(a, animated: true)
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


/// Vollbild-Kamera, die den ersten QR-Code liest und sich dann schließt.
final class QRScanViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onResult: ((String?) -> Void)?
    private let session = AVCaptureSession()
    private var preview: AVCaptureVideoPreviewLayer?
    private var done = false

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 6 / 255, green: 48 / 255, blue: 46 / 255, alpha: 1)

        if let dev = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
           let input = try? AVCaptureDeviceInput(device: dev), session.canAddInput(input) {
            session.addInput(input)
            let out = AVCaptureMetadataOutput()
            if session.canAddOutput(out) {
                session.addOutput(out)
                out.setMetadataObjectsDelegate(self, queue: .main)
                out.metadataObjectTypes = [.qr]
            }
            let pl = AVCaptureVideoPreviewLayer(session: session)
            pl.videoGravity = .resizeAspectFill
            view.layer.addSublayer(pl)
            preview = pl
        }

        let title = UILabel()
        title.text = "QR-CODE SCANNEN"
        title.textColor = UIColor(red: 1, green: 216 / 255, blue: 77 / 255, alpha: 1)
        title.font = .monospacedSystemFont(ofSize: 15, weight: .bold)
        title.textAlignment = .center
        let hint = UILabel()
        hint.text = "Halte die Kamera auf den QR-Code in den Optionen des anderen Geräts."
        hint.textColor = .white
        hint.numberOfLines = 0
        hint.font = .systemFont(ofSize: 15)
        hint.textAlignment = .center
        let frame = UIView()
        frame.layer.borderColor = UIColor(red: 1, green: 216 / 255, blue: 77 / 255, alpha: 1).cgColor
        frame.layer.borderWidth = 3
        let cancel = UIButton(type: .system)
        cancel.setTitle("Abbrechen", for: .normal)
        cancel.setTitleColor(.white, for: .normal)
        cancel.titleLabel?.font = .monospacedSystemFont(ofSize: 17, weight: .bold)
        cancel.backgroundColor = UIColor(red: 15 / 255, green: 92 / 255, blue: 88 / 255, alpha: 1)
        cancel.layer.borderColor = UIColor(red: 63 / 255, green: 174 / 255, blue: 152 / 255, alpha: 1).cgColor
        cancel.layer.borderWidth = 2
        cancel.addTarget(self, action: #selector(close), for: .touchUpInside)

        for v in [title, hint, frame, cancel] { v.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(v) }
        let g = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            title.topAnchor.constraint(equalTo: g.topAnchor, constant: 24),
            title.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            frame.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            frame.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            frame.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.65),
            frame.heightAnchor.constraint(equalTo: frame.widthAnchor),
            hint.topAnchor.constraint(equalTo: frame.bottomAnchor, constant: 20),
            hint.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 28),
            hint.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -28),
            cancel.bottomAnchor.constraint(equalTo: g.bottomAnchor, constant: -24),
            cancel.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 24),
            cancel.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -24),
            cancel.heightAnchor.constraint(equalToConstant: 52)
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        let s = session
        DispatchQueue.global(qos: .userInitiated).async { if !s.isRunning { s.startRunning() } }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        let s = session
        DispatchQueue.global(qos: .userInitiated).async { if s.isRunning { s.stopRunning() } }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard !done, let o = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let text = o.stringValue else { return }
        done = true
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        dismiss(animated: true) { [onResult] in onResult?(text) }
    }

    @objc private func close() {
        done = true
        dismiss(animated: true) { [onResult] in onResult?(nil) }
    }
}
