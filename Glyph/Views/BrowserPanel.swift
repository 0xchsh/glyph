//
//  BrowserPanel.swift
//  Glyph
//

import SwiftUI
import WebKit

struct BrowserPanel: View {
    @Environment(AppState.self) private var appState
    @State private var webCoordinator: WebViewWrapper.Coordinator?
    @State private var urlText: String = ""
    @FocusState private var urlFieldFocused: Bool

    var body: some View {
        let palette = appState.palette

        VStack(spacing: 0) {
            // Browser chrome
            HStack(spacing: 8) {
                Button {
                    webCoordinator?.webView?.goBack()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.secondaryText.opacity(appState.browserURL == nil ? 0.3 : 0.8))
                        .frame(width: 26, height: 26)
                }
                .buttonStyle(.plain)
                .disabled(appState.browserURL == nil)

                // Editable URL bar
                HStack(spacing: 6) {
                    Image(systemName: appState.browserURL != nil ? "lock.fill" : "globe")
                        .font(.system(size: 9))
                        .foregroundStyle(palette.secondaryText.opacity(0.5))
                    TextField("http://localhost:3000", text: $urlText)
                        .font(.system(size: 12))
                        .foregroundStyle(palette.primaryText)
                        .textFieldStyle(.plain)
                        .focused($urlFieldFocused)
                        .onSubmit { commitURL() }
                        .onAppear { urlText = appState.browserURL?.absoluteString ?? "" }
                        .onChange(of: appState.browserURL) { _, newURL in
                            if !urlFieldFocused {
                                urlText = newURL?.absoluteString ?? ""
                            }
                        }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(palette.appBackground, in: RoundedRectangle(cornerRadius: 6))

                Button {
                    webCoordinator?.webView?.reload()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.secondaryText.opacity(appState.browserURL == nil ? 0.3 : 0.8))
                        .frame(width: 26, height: 26)
                }
                .buttonStyle(.plain)
                .disabled(appState.browserURL == nil)
            }
            .padding(.horizontal, 12)
            .frame(height: panelToolbarHeight)
            .background(palette.panelBackground)

            palette.border.frame(height: 1)

            // Content
            if let url = appState.browserURL {
                WebViewWrapper(url: url, onCoordinatorReady: { webCoordinator = $0 })
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity.animation(.easeIn(duration: 0.3)))
            } else {
                ZStack {
                    palette.appBackground
                    VStack(spacing: 16) {
                        Image(systemName: "display")
                            .font(.system(size: 36))
                            .foregroundStyle(palette.secondaryText.opacity(0.2))
                        VStack(spacing: 6) {
                            Text("Waiting for dev server")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(palette.secondaryText.opacity(0.6))
                            Text("Start a server in the terminal and Glyph will load it here automatically.")
                                .font(.system(size: 12))
                                .foregroundStyle(palette.secondaryText.opacity(0.35))
                                .multilineTextAlignment(.center)
                        }
                    }
                    .frame(maxWidth: 300)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    private func commitURL() {
        var raw = urlText.trimmingCharacters(in: .whitespaces)
        guard !raw.isEmpty else { return }
        if !raw.hasPrefix("http://") && !raw.hasPrefix("https://") {
            raw = "http://" + raw
        }
        if let url = URL(string: raw) {
            appState.browserURL = url
            urlText = url.absoluteString
        }
    }
}

// MARK: - WebViewWrapper

struct WebViewWrapper: NSViewRepresentable {
    let url: URL
    var onCoordinatorReady: ((Coordinator) -> Void)?

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView
        context.coordinator.loadedURL = url
        webView.load(URLRequest(url: url))
        onCoordinatorReady?(context.coordinator)
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        // Only load if the URL prop changed, not on every SwiftUI redraw
        guard context.coordinator.loadedURL != url else { return }
        context.coordinator.loadedURL = url
        webView.load(URLRequest(url: url))
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        weak var webView: WKWebView?
        var loadedURL: URL?

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {}
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {}
    }
}
