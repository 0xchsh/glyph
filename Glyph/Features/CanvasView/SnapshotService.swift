//
//  SnapshotService.swift
//  Glyph
//

import AppKit
import WebKit

// MARK: - SnapshotService

/// Sequentially captures WKWebView snapshots for each discovered route.
/// Runs entirely on the main actor (WKWebView requirement).
@MainActor
@Observable
final class SnapshotService {

    var snapshots: [String: NSImage] = [:]   // route.path → captured image
    var capturing: Set<String> = []           // paths currently in flight

    private var queue: [(path: String, url: URL)] = []
    private var activeCapture: PageCapture?

    // MARK: - Public API

    /// Start (or restart) capturing snapshots for all non-dynamic routes.
    func captureAll(routes: [DiscoveredRoute], serverURL: URL) {
        cancel()
        queue = routes
            .filter { !$0.isDynamic }          // skip [param] routes — no value to render
            .compactMap { route in
                let path = route.path == "/" ? "" : route.path
                guard let url = URL(string: serverURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + path) else { return nil }
                return (path: route.path, url: url)
            }
        processNext()
    }

    func cancel() {
        activeCapture = nil
        queue = []
        capturing = []
    }

    func clearSnapshots() {
        snapshots = [:]
    }

    // MARK: - Private

    private func processNext() {
        guard activeCapture == nil, !queue.isEmpty else { return }
        let item = queue.removeFirst()
        guard snapshots[item.path] == nil else { processNext(); return }

        capturing.insert(item.path)
        let capture = PageCapture(url: item.url) { [weak self] image in
            guard let self else { return }
            self.capturing.remove(item.path)
            if let image { self.snapshots[item.path] = image }
            self.activeCapture = nil
            self.processNext()
        }
        activeCapture = capture
        capture.start()
    }
}

// MARK: - PageCapture

/// Loads a single URL in an off-screen WKWebView and takes a snapshot.
@MainActor
private final class PageCapture: NSObject, WKNavigationDelegate {

    private let webView: WKWebView
    private let completion: (NSImage?) -> Void
    private var snapshotTaken = false
    private var timeoutTask: Task<Void, Never>?

    init(url: URL, completion: @escaping (NSImage?) -> Void) {
        self.completion = completion
        let cfg = WKWebViewConfiguration()
        cfg.suppressesIncrementalRendering = true
        self.webView = WKWebView(
            frame: CGRect(x: 0, y: 0, width: 1280, height: 800),
            configuration: cfg
        )
        super.init()
        webView.navigationDelegate = self
        webView.load(URLRequest(url: url))
    }

    func start() {
        // Hard timeout — don't wait forever for slow pages
        timeoutTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(12))
            await self?.takeSnapshot()
        }
    }

    // Navigation finished → short settle delay, then snapshot
    nonisolated func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(900))
            await self?.takeSnapshot()
        }
    }

    nonisolated func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        Task { @MainActor [weak self] in self?.finish(nil) }
    }

    nonisolated func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        Task { @MainActor [weak self] in self?.finish(nil) }
    }

    private func takeSnapshot() {
        guard !snapshotTaken else { return }
        snapshotTaken = true
        timeoutTask?.cancel()
        let cfg = WKSnapshotConfiguration()
        cfg.rect = CGRect(x: 0, y: 0, width: 1280, height: 800)
        webView.takeSnapshot(with: cfg) { [weak self] image, _ in
            self?.finish(image)
        }
    }

    private func finish(_ image: NSImage?) {
        timeoutTask?.cancel()
        completion(image)
    }
}
