//
//  GlyphApp.swift
//  Glyph
//

import SwiftUI
import AppKit

@main
struct GlyphApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .background(WindowConfigurator())
                .ignoresSafeArea(.all, edges: .top)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        .defaultSize(width: 1440, height: 900)

    }
}

/// Grabs the NSWindow on first appear and makes the titlebar transparent
/// so content extends edge-to-edge (Conductor-style).
private struct WindowConfigurator: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        DispatchQueue.main.async {
            guard let window = view.window else { return }
            window.titlebarAppearsTransparent = true
            window.titleVisibility = .hidden
            window.styleMask.insert(.fullSizeContentView)
            window.isMovableByWindowBackground = false
        }
        return view
    }
    func updateNSView(_ nsView: NSView, context: Context) {}
}
