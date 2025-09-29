import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        WebContainer()
            .ignoresSafeArea()
            .background(Color.black)
    }
}

struct WebContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        if #available(iOS 16.4, *) {
            config.mediaTypesRequiringUserActionForPlayback = []
        }
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.userContentController.add(context.coordinator, name: "save")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false

        if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "save",
                  let base64 = message.body as? String,
                  let data = Data(base64Encoded: base64.replacingOccurrences(of: "data:image/png;base64,", with: "")),
                  let image = UIImage(data: data) else { return }
            UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        }
    }
}
