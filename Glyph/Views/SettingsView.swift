//
//  SettingsView.swift
//  Glyph
//

import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var appState = appState

        Form {
            Section("Appearance") {
                Picker("Color palette", selection: $appState.currentPalette) {
                    ForEach(Palette.allCases) { palette in
                        Text(palette.rawValue)
                            .tag(palette)
                    }
                }
                .pickerStyle(.menu)
            }

            Section("Workspace") {
                Toggle("Auto-open browser preview when a dev server is detected", isOn: $appState.autoOpenBrowserPreview)

                Picker("Default terminal preset", selection: $appState.defaultPresetID) {
                    ForEach(AgentPreset.defaults) { preset in
                        Text(preset.displayName).tag(preset.id)
                    }
                }
                .pickerStyle(.menu)
            }
        }
        .formStyle(.grouped)
        .padding(20)
        .frame(width: 420)
    }
}
