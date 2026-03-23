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
        .commands {
            ProjectNavigationCommands()
        }
    }
}

// MARK: - ⌘1–9 project switching

struct ProjectNavigationCommands: Commands {
    @FocusedValue(\.appState) private var appState

    var body: some Commands {
        CommandMenu("Projects") {
            ForEach(0..<9, id: \.self) { index in
                Button(projectName(at: index)) {
                    selectProject(at: index)
                }
                .keyboardShortcut(KeyEquivalent(Character("\(index + 1)")), modifiers: .command)
                .disabled(appState == nil || index >= (appState?.projects.count ?? 0))
            }
        }
    }

    private func projectName(at index: Int) -> String {
        guard let projects = appState?.projects, index < projects.count else {
            return "Project \(index + 1)"
        }
        return projects[index].name
    }

    private func selectProject(at index: Int) {
        guard let appState, index < appState.projects.count else { return }
        appState.selectedProject = appState.projects[index]
    }
}
