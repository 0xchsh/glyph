//
//  GlyphApp.swift
//  Glyph
//

import SwiftUI

@main
struct GlyphApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unifiedCompact)
        .defaultSize(width: 1440, height: 900)

        Settings {
            SettingsView()
                .environment(appState)
        }
    }
}
