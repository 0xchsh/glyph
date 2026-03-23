//
//  ContentView.swift
//  Glyph
//

import SwiftUI

// MARK: - FocusedValue for AppState

struct FocusedAppStateKey: FocusedValueKey {
    typealias Value = AppState
}

extension FocusedValues {
    var appState: AppState? {
        get { self[FocusedAppStateKey.self] }
        set { self[FocusedAppStateKey.self] = newValue }
    }
}

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
        .focusedSceneValue(\.appState, appState)
        .preferredColorScheme(appState.palette.isDark ? .dark : .light)
    }
}
