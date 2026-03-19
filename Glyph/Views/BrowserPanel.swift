//
//  BrowserPanel.swift
//  Glyph
//

import SwiftUI
import WebKit

struct BrowserPanel: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        let palette = appState.palette

        VStack(spacing: 0) {
            // Browser chrome
            HStack(spacing: 8) {
                HStack(spacing: 2) {
                    Button {
                        // handled by WebViewWrapper coordinator
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(palette.secondaryText.opacity(appState.browserURL == nil ? 0.3 : 0.8))
                            .frame(width: 26, height: 26)
                    }
                    .buttonStyle(.plain)
                    .disabled(appState.browserURL == nil)
                }

                // URL bar
                HStack(spacing: 6) {
                    Image(systemName: appState.browserURL != nil ? "lock.fill" : "globe")
                        .font(.system(size: 9))
                        .foregroundStyle(palette.secondaryText.opacity(0.5))
                    Text(appState.browserURL?.absoluteString ?? "No server running")
                        .font(.system(size: 12))
                        .foregroundStyle(appState.browserURL != nil ? palette.primaryText : palette.secondaryText)
                        .lineLimit(1)
                    Spacer()
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(palette.appBackground, in: RoundedRectangle(cornerRadius: 6))

                Button {
                    // TODO: reload
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
            .padding(.vertical, 8)
            .background(palette.panelBackground)

            palette.border.frame(height: 1)

            // Content
            if let url = appState.browserURL {
                WebViewWrapper(url: url)
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
}

// MARK: - WebViewWrapper

struct WebViewWrapper: NSViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView(frame: .zero)
        webView.navigationDelegate = context.coordinator
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        if webView.url != url {
            webView.load(URLRequest(url: url))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {}
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {}
    }
}
