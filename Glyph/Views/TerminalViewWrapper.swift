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

    override func viewDidMoveToSuperview() {
        super.viewDidMoveToSuperview()
        // SwiftTerm uses a legacy NSScroller — hide it on first appearance
        subviews.compactMap { $0 as? NSScroller }.forEach { $0.isHidden = true }
    }

    override func dataReceived(slice: ArraySlice<UInt8>) {
        super.dataReceived(slice: slice)
        guard let text = String(bytes: slice, encoding: .utf8) else { return }
        scanForDevServer(in: text)
    }

    private func scanForDevServer(in text: String) {
        // Match any http://localhost:PORT mention in terminal output
        let pattern = #"(http://localhost:\d+)"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, range: range),
              let urlRange = Range(match.range(at: 1), in: text) else { return }
        let url = String(text[urlRange])
        DispatchQueue.main.async { [weak self] in
            self?.onURLDetected?(url)
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

    private let padding: CGFloat = 16

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> NSView {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = backgroundColor.cgColor

        let terminal = GlyphTerminalView(frame: .zero)
        configure(terminal, coordinator: context.coordinator)
        terminal.startProcess(
            executable: shell,
            args: shellArgs,
            environment: nil,
            execName: nil,
            currentDirectory: workingDirectory
        )

        container.addSubview(terminal)
        terminal.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            terminal.topAnchor.constraint(equalTo: container.topAnchor, constant: padding),
            terminal.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: padding),
            terminal.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -padding),
            terminal.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -padding),
        ])

        return container
    }

    func updateNSView(_ container: NSView, context: Context) {
        container.layer?.backgroundColor = backgroundColor.cgColor
        guard let view = context.coordinator.view else { return }
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
        view.caretColor = .white
        let descriptor = NSFontDescriptor(fontAttributes: [
            .family: "JetBrains Mono",
            .face: "Regular"
        ])
        view.font = NSFont(descriptor: descriptor, size: 13)
            ?? NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
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
