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
    @State private var loadProgress: Double = 0      // 0.0 – 1.0
    @State private var isLoading: Bool = false
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

            // Loading progress bar — sits flush under the toolbar
            ZStack(alignment: .leading) {
                Color(NSColor.separatorColor).opacity(0.4).frame(height: 1)
                if isLoading {
                    palette.accent
                        .frame(width: isLoading ? nil : 0)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .scaleEffect(x: loadProgress, y: 1, anchor: .leading)
                        .frame(height: 2)
                        .animation(.easeInOut(duration: 0.2), value: loadProgress)
                }
            }
            .frame(height: isLoading ? 2 : 1)

            // Content
            if let url = appState.browserURL {
                WebViewWrapper(
                    url: url,
                    onCoordinatorReady: { webCoordinator = $0 },
                    onLoadStarted: {
                        isLoading = true
                        loadProgress = 0.1
                    },
                    onLoadProgress: { p in loadProgress = p },
                    onLoadFinished: {
                        loadProgress = 1.0
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            isLoading = false
                            loadProgress = 0
                        }
                    }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .transition(.opacity.animation(.easeIn(duration: 0.3)))
            } else {
                ZStack {
                    palette.appBackground
                    let detectedPort = appState.port(for: appState.selectedProject?.url ?? URL(fileURLWithPath: "/"))
                    if let port = detectedPort {
                        // Port is running — show it as a launch button
                        VStack(spacing: 16) {
                            Circle()
                                .stroke(palette.secondaryText.opacity(0.12), lineWidth: 1.5)
                                .frame(width: 52, height: 52)
                                .overlay(
                                    Image(systemName: "globe")
                                        .font(.system(size: 22, weight: .light))
                                        .foregroundStyle(palette.secondaryText.opacity(0.45))
                                )
                            VStack(spacing: 5) {
                                Text("Browser")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(palette.primaryText.opacity(0.75))
                                Text("Dev server detected at \(port.absoluteString)")
                                    .font(.system(size: 12))
                                    .foregroundStyle(palette.secondaryText.opacity(0.45))
                                    .multilineTextAlignment(.center)
                            }
                            Button {
                                appState.browserURL = port
                            } label: {
                                Text("Open \(port.absoluteString)")
                                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                                    .foregroundStyle(palette.isDark ? Color.black : Color.white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 7)
                                    .background(
                                        RoundedRectangle(cornerRadius: 7)
                                            .fill(palette.isDark ? Color.white.opacity(0.85) : Color.black.opacity(0.85))
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                        .frame(maxWidth: 320)
                    } else {
                        // Default empty state
                        VStack(spacing: 16) {
                            Circle()
                                .stroke(palette.secondaryText.opacity(0.12), lineWidth: 1.5)
                                .frame(width: 52, height: 52)
                                .overlay(
                                    Image(systemName: "globe")
                                        .font(.system(size: 22, weight: .light))
                                        .foregroundStyle(palette.secondaryText.opacity(0.45))
                                )
                            VStack(spacing: 5) {
                                Text("Browser")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(palette.primaryText.opacity(0.75))
                                Text("Enter a URL above, or start a dev server\nand the detected port will appear here.")
                                    .font(.system(size: 12))
                                    .foregroundStyle(palette.secondaryText.opacity(0.45))
                                    .multilineTextAlignment(.center)
                            }
                        }
                        .frame(maxWidth: 320)
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
    var onLoadStarted: (() -> Void)?
    var onLoadProgress: ((Double) -> Void)?
    var onLoadFinished: (() -> Void)?

    func makeCoordinator() -> Coordinator { Coordinator() }

    private static func hideScrollIndicators(in view: NSView) {
        if let sv = view as? NSScrollView {
            sv.hasVerticalScroller = false
            sv.hasHorizontalScroller = false
            sv.autohidesScrollers = false
        }
        for sub in view.subviews { hideScrollIndicators(in: sub) }
    }

    func makeNSView(context: Context) -> NSView {
        let config = WKWebViewConfiguration()
        // Allow JS (required for React / Next.js apps)
        let pagePrefs = WKWebpagePreferences()
        pagePrefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = pagePrefs
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        // Allow http:// localhost loads
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        // Enable Safari Web Inspector / DevTools
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsMagnification = true
        // Prevent white flash before page renders
        webView.setValue(false, forKey: "drawsBackground")
        let coordinator = context.coordinator
        coordinator.webView = webView
        coordinator.loadedURL = url
        coordinator.onLoadStarted = onLoadStarted
        coordinator.onLoadProgress = onLoadProgress
        coordinator.onLoadFinished = onLoadFinished
        // Hide scroll indicators inside WKWebView's internal NSScrollView
        DispatchQueue.main.async {
            Self.hideScrollIndicators(in: webView)
        }
        // Observe estimatedProgress for the progress bar
        coordinator.progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { wv, _ in
            DispatchQueue.main.async {
                coordinator.onLoadProgress?(wv.estimatedProgress)
            }
        }
        webView.load(URLRequest(url: url))

        // Wrap in a container so AutoLayout handles resizing and we can
        // dispatch a JS resize event whenever the container bounds change.
        let container = WebContainerView()
        container.webView = webView
        webView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: container.topAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
        ])

        DispatchQueue.main.async { onCoordinatorReady?(coordinator) }
        return container
    }

    func updateNSView(_ container: NSView, context: Context) {
        context.coordinator.onLoadStarted = onLoadStarted
        context.coordinator.onLoadProgress = onLoadProgress
        context.coordinator.onLoadFinished = onLoadFinished
        guard context.coordinator.loadedURL != url else { return }
        context.coordinator.loadedURL = url
        context.coordinator.webView?.load(URLRequest(url: url))
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        weak var webView: WKWebView?
        var loadedURL: URL?
        var onLoadStarted: (() -> Void)?
        var onLoadProgress: ((Double) -> Void)?
        var onLoadFinished: (() -> Void)?
        var progressObservation: NSKeyValueObservation?

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async { self.onLoadStarted?() }
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async { self.onLoadFinished?() }
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async { self.onLoadFinished?() }
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async { self.onLoadFinished?() }
        }
    }
}

// MARK: - WebContainerView

/// An NSView wrapper that dispatches a JS resize event whenever its bounds
/// change, so React / Vite / Next.js apps reflow to fit the new panel size.
private final class WebContainerView: NSView {
    weak var webView: WKWebView?
    private var lastSize: CGSize = .zero

    override func layout() {
        super.layout()
        let newSize = bounds.size
        guard newSize != lastSize, newSize.width > 0, newSize.height > 0 else { return }
        lastSize = newSize
        webView?.evaluateJavaScript("window.dispatchEvent(new Event('resize'));", completionHandler: nil)
    }
}
