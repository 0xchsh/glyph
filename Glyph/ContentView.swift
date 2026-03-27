//
//  ContentView.swift
//  Glyph
//

import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Group {
            if appState.rootDirectory == nil {
                OnboardingView()
            } else {
                MainLayoutView()
            }
        }
        .preferredColorScheme(appState.palette.isDark ? .dark : .light)
    }
}
