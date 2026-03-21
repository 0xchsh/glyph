//
//  GlyphApp.swift
//  Glyph
//

import SwiftUI

@main
struct GlyphApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unifiedCompact)
        .defaultSize(width: 1440, height: 900)
    }
}
