//
//  TerminalViewWrapper.swift
//  Glyph
//

import SwiftUI
import AppKit
import SwiftTerm

// MARK: - GlyphTerminalView

/// LocalProcessTerminalView subclass that watches stdout for dev server ready signals.
final class GlyphTerminalView: LocalProcessTerminalView {
    var onURLDetected: ((String) -> Void)?

    override func dataReceived(slice: ArraySlice<UInt8>) {
        super.dataReceived(slice: slice)
        guard let text = String(bytes: slice, encoding: .utf8) else { return }
        scanForDevServer(in: text)
    }

    private func scanForDevServer(in text: String) {
        // Covers Next.js, Vite, CRA, Remix, SvelteKit, and similar
        let patterns = [
            #"ready on (http://localhost:\d+)"#,
            #"➜\s+Local:\s+(http://localhost:\d+)"#,
            #"Local:\s+(http://localhost:\d+)"#,
            #"listening at (http://localhost:\d+)"#,
            #"started server on [^\s,]+, url: (http://localhost:\d+)"#,
        ]
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern) else { continue }
            let range = NSRange(text.startIndex..., in: text)
            guard let match = regex.firstMatch(in: text, range: range),
                  let urlRange = Range(match.range(at: 1), in: text) else { continue }
            let url = String(text[urlRange])
            DispatchQueue.main.async { [weak self] in
                self?.onURLDetected?(url)
            }
            return
        }
    }
}

// MARK: - TerminalViewWrapper

struct TerminalViewWrapper: NSViewRepresentable {
    let shell: String
    let shellArgs: [String]
    let workingDirectory: String?
    let backgroundColor: NSColor
    let foregroundColor: NSColor
    let restartID: Int
    var onURLDetected: ((String) -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> GlyphTerminalView {
        let view = GlyphTerminalView(frame: .zero)
        configure(view, coordinator: context.coordinator)
        view.startProcess(
            executable: shell,
            args: shellArgs,
            environment: nil,
            execName: nil,
            currentDirectory: workingDirectory
        )
        return view
    }

    func updateNSView(_ view: GlyphTerminalView, context: Context) {
        view.nativeBackgroundColor = backgroundColor
        view.nativeForegroundColor = foregroundColor
        view.onURLDetected = onURLDetected

        guard context.coordinator.lastRestartID != restartID else { return }
        context.coordinator.lastRestartID = restartID

        if view.process.running { view.terminate() }
        let args = shellArgs
        let cwd = workingDirectory
        let exe = shell
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            view.startProcess(
                executable: exe,
                args: args,
                environment: nil,
                execName: nil,
                currentDirectory: cwd
            )
        }
    }

    private func configure(_ view: GlyphTerminalView, coordinator: Coordinator) {
        view.nativeBackgroundColor = backgroundColor
        view.nativeForegroundColor = foregroundColor
        view.font = NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
        view.onURLDetected = onURLDetected
        view.processDelegate = coordinator
        coordinator.view = view
        coordinator.lastRestartID = restartID
    }
}

// MARK: - Coordinator

final class Coordinator: NSObject, LocalProcessTerminalViewDelegate {
    weak var view: GlyphTerminalView?
    var lastRestartID: Int = 0

    func sizeChanged(source: LocalProcessTerminalView, newCols: Int, newRows: Int) {}
    func setTerminalTitle(source: LocalProcessTerminalView, title: String) {}
    func hostCurrentDirectoryUpdate(source: TerminalView, directory: String?) {}
    func processTerminated(source: TerminalView, exitCode: Int32?) {}
}
