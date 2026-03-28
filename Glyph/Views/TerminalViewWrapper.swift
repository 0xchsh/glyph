//
//  TerminalViewWrapper.swift
//  Glyph
//

import SwiftUI
import AppKit
import SwiftTerm

// No-op CAAction — used to disable implicit layer animations (e.g. cursor fade)
private final class NullCAAction: NSObject, CAAction {
    func run(forKey event: String, object anObject: Any, arguments dict: [AnyHashable: Any]?) {}
}

private func disableImplicitAnimations(in layer: CALayer?) {
    guard let layer else { return }
    let noAnim = NullCAAction()
    layer.actions = ["opacity": noAnim, "hidden": noAnim, "backgroundColor": noAnim]
    layer.sublayers?.forEach { disableImplicitAnimations(in: $0) }
}

// MARK: - GlyphTerminalView

final class GlyphTerminalView: LocalProcessTerminalView {
    var onURLDetected: ((String) -> Void)?
    var onStatusChanged: ((TerminalStatus) -> Void)?
    private var lastEmittedStatus: TerminalStatus = .idle
    private var idleWorkItem: DispatchWorkItem?

    override func viewDidMoveToSuperview() {
        super.viewDidMoveToSuperview()
        subviews.compactMap { $0 as? NSScroller }.forEach { $0.isHidden = true }
        // Disable implicit opacity/hidden animations so cursor blinks analog (hard on/off)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            disableImplicitAnimations(in: self?.layer)
        }
    }

    override func dataReceived(slice: ArraySlice<UInt8>) {
        super.dataReceived(slice: slice)
        guard let text = String(bytes: slice, encoding: .utf8) else { return }

        // Typing echoes single chars with no newline — only go busy once Enter (\r) or
        // real output (\n) arrives, so the spinner doesn't flash while the user is typing.
        let hasLineBreak = slice.contains(0x0A) || slice.contains(0x0D)

        if hasLineBreak, lastEmittedStatus != .busy {
            lastEmittedStatus = .busy
            onStatusChanged?(.busy)
        }

        // Keep resetting the idle timer while output flows (even mid-stream chunks
        // without newlines), but only start the timer once we're actually busy.
        if lastEmittedStatus == .busy || hasLineBreak {
            idleWorkItem?.cancel()
            let work = DispatchWorkItem { [weak self] in
                self?.lastEmittedStatus = .idle
                self?.onStatusChanged?(.idle)
            }
            idleWorkItem = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5, execute: work)
        }

        scanForDevServer(in: text)
    }

    private func scanForDevServer(in text: String) {
        // EADDRINUSE → port is already occupied by a running server
        if let regex = try? NSRegularExpression(pattern: #"EADDRINUSE.*?:+(\d+)"#) {
            let range = NSRange(text.startIndex..., in: text)
            if let match = regex.firstMatch(in: text, range: range),
               let portRange = Range(match.range(at: 1), in: text),
               let port = Int(text[portRange]) {
                DispatchQueue.main.async { [weak self] in
                    self?.onURLDetected?("http://localhost:\(port)")
                }
                return
            }
        }
        // Any http://localhost:PORT mention
        if let regex = try? NSRegularExpression(pattern: #"(http://localhost:\d+)"#) {
            let range = NSRange(text.startIndex..., in: text)
            if let match = regex.firstMatch(in: text, range: range),
               let urlRange = Range(match.range(at: 1), in: text) {
                let url = String(text[urlRange])
                DispatchQueue.main.async { [weak self] in
                    self?.onURLDetected?(url)
                }
            }
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
    var fontSize: CGFloat = 13
    var onURLDetected: ((String) -> Void)?
    var onStatusChanged: ((TerminalStatus) -> Void)?
    var onProcessTerminated: (() -> Void)?

    private let padding: CGFloat = 16

    func makeCoordinator() -> Coordinator { Coordinator() }

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
        view.onStatusChanged = onStatusChanged
        context.coordinator.onProcessTerminated = onProcessTerminated

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
        view.onURLDetected = onURLDetected
        view.onStatusChanged = onStatusChanged
        let descriptor = NSFontDescriptor(fontAttributes: [
            .family: "JetBrains Mono",
            .face: "Regular"
        ])
        view.font = NSFont(descriptor: descriptor, size: fontSize)
            ?? NSFont.monospacedSystemFont(ofSize: fontSize, weight: .regular)
        view.processDelegate = coordinator
        coordinator.view = view
        coordinator.lastRestartID = restartID
        coordinator.onProcessTerminated = onProcessTerminated
    }
}

// MARK: - Coordinator

final class Coordinator: NSObject, LocalProcessTerminalViewDelegate {
    weak var view: GlyphTerminalView?
    var lastRestartID: Int = 0
    var onProcessTerminated: (() -> Void)?

    func sizeChanged(source: LocalProcessTerminalView, newCols: Int, newRows: Int) {}
    func setTerminalTitle(source: LocalProcessTerminalView, title: String) {}
    func hostCurrentDirectoryUpdate(source: TerminalView, directory: String?) {}
    func processTerminated(source: TerminalView, exitCode: Int32?) {
        DispatchQueue.main.async { [weak self] in
            self?.onProcessTerminated?()
        }
    }
}
