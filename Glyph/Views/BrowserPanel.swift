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
    @State private var backHovered = false
    @State private var refreshHovered = false
    @FocusState private var urlFieldFocused: Bool

    var body: some View {
        let palette = appState.palette
        let hasURL = appState.browserURL != nil

        VStack(spacing: 0) {
            // Browser chrome
            HStack(spacing: 4) {
                Button {
                    webCoordinator?.webView?.goBack()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.secondaryText.opacity(hasURL ? (backHovered ? 1.0 : 0.8) : 0.3))
                        .frame(width: 26, height: 26)
                        .background(backHovered && hasURL ? palette.secondaryText.opacity(0.08) : Color.clear, in: RoundedRectangle(cornerRadius: 5))
                }
                .buttonStyle(.plain)
                .disabled(!hasURL)
                .onHover { backHovered = $0 }
                .help("Go back")

                Button {
                    webCoordinator?.webView?.reload()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.secondaryText.opacity(hasURL ? (refreshHovered ? 1.0 : 0.8) : 0.3))
                        .frame(width: 26, height: 26)
                        .background(refreshHovered && hasURL ? palette.secondaryText.opacity(0.08) : Color.clear, in: RoundedRectangle(cornerRadius: 5))
                }
                .buttonStyle(.plain)
                .disabled(!hasURL)
                .onHover { refreshHovered = $0 }
                .help("Reload page")

                // Editable URL bar
                HStack(spacing: 6) {
                    Image(systemName: hasURL ? "lock.fill" : "globe")
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
                    let detectedPort = appState.port(for: appState.selectedProject?.url ?? URL(fileURLWithPath: "/"))
                    if let port = detectedPort {
                        // Port is running — show it as a launch button
                        VStack(spacing: 20) {
                            VStack(spacing: 6) {
                                Circle()
                                    .fill(Color.green.opacity(0.15))
                                    .frame(width: 48, height: 48)
                                    .overlay(
                                        Image(systemName: "circle.fill")
                                            .font(.system(size: 10))
                                            .foregroundStyle(Color.green)
                                    )
                                Text("Dev server running")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(palette.secondaryText.opacity(0.6))
                            }
                            Button {
                                appState.browserURL = port
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: "arrow.up.right.square")
                                        .font(.system(size: 12))
                                    Text(port.absoluteString)
                                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                                }
                                .foregroundStyle(palette.isDark ? Color.black : Color.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 9)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(palette.isDark ? Color.white : Color.black)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    } else {
                        // No port detected yet
                        VStack(spacing: 6) {
                            Image(systemName: "display")
                                .font(.system(size: 36))
                                .foregroundStyle(palette.secondaryText.opacity(0.2))
                            Text("Waiting for dev server")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(palette.secondaryText.opacity(0.6))
                            Text("Start a server in the terminal — detected ports will appear here.")
                                .font(.system(size: 12))
                                .foregroundStyle(palette.secondaryText.opacity(0.35))
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: 300)
                    }
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
        guard let url = URL(string: raw) else { return }
        urlText = url.absoluteString
        if appState.browserURL == url {
            // Same URL — force a reload
            webCoordinator?.webView?.reload()
        } else {
            appState.browserURL = url
        }
    }
}

// MARK: - WebViewWrapper

struct WebViewWrapper: NSViewRepresentable {
    let url: URL
    var onCoordinatorReady: ((Coordinator) -> Void)?

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Allow JS (required for React / Next.js apps)
        let pagePrefs = WKWebpagePreferences()
        pagePrefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = pagePrefs
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        // Allow http:// localhost loads
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsMagnification = true
        // Prevent white flash before page renders
        webView.setValue(false, forKey: "drawsBackground")
        context.coordinator.webView = webView
        context.coordinator.loadedURL = url
        webView.load(URLRequest(url: url))
        let coordinator = context.coordinator
        DispatchQueue.main.async { onCoordinatorReady?(coordinator) }
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
