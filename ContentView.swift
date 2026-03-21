//
//  ContentView.swift
//  Glyph
//

import SwiftUI

struct ContentView: View {
    @State private var appState = AppState()

    var body: some View {
        Group {
            if appState.rootDirectory == nil {
                OnboardingView()
            } else {
                MainLayoutView()
            }
        }
        .environment(appState)
        .preferredColorScheme(appState.palette.isDark ? .dark : .light)
    }
}
