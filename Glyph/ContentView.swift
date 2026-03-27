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
    @Environment(AppState.self) private var appState

    var body: some View {
        Group {
            if appState.rootDirectory == nil {
                OnboardingView()
            } else {
                MainLayoutView()
            }
        }
        .focusedSceneValue(\.appState, appState)
        .preferredColorScheme(appState.palette.isDark ? .dark : .light)
    }
}
