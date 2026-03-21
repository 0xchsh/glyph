//
//  TerminalPanel.swift
//  Glyph
//

import SwiftUI
import AppKit

struct TerminalPanel: View {
    @Environment(AppState.self) private var appState
    @State private var activePreset = AgentPreset.defaults[0]
    @State private var restartID = 0

    private var shell: String {
        ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh"
    }

    private var workingDirectory: String? {
        appState.selectedProject?.url.path ?? appState.rootDirectory?.path
    }

    var body: some View {
        let palette = appState.palette

        VStack(spacing: 0) {
            // Toolbar
            HStack(spacing: 6) {
                Text("TERMINAL")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(palette.secondaryText)
                    .tracking(0.8)

                Spacer()

                // + New shell
                Button {
                    activePreset = AgentPreset.defaults[0] // shell
                    restartID += 1
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.secondaryText)
                        .frame(width: 24, height: 24)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                // Preset picker
                Menu {
                    ForEach(AgentPreset.defaults) { preset in
                        Button {
                            activePreset = preset
                            restartID += 1
                        } label: {
                            if activePreset.id == preset.id {
                                Label(preset.displayName, systemImage: "checkmark")
                            } else {
                                Text(preset.displayName)
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 3) {
                        Text(activePreset.displayName)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(palette.primaryText)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 8, weight: .semibold))
                            .foregroundStyle(palette.secondaryText)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(palette.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 5))
                }
                .menuStyle(.borderlessButton)
                .menuIndicator(.hidden)
                .fixedSize()
            }
            .padding(.horizontal, 12)
            .frame(height: panelToolbarHeight)
            .background(palette.panelBackground)

            palette.border.frame(height: 1)

            TerminalViewWrapper(
                shell: shell,
                shellArgs: activePreset.shellArgs,
                workingDirectory: workingDirectory,
                backgroundColor: palette.nsBackground,
                foregroundColor: palette.nsForeground,
                restartID: restartID,
                onURLDetected: { urlString in
                    if let url = URL(string: urlString) {
                        appState.browserURL = url
                    }
                }
            )
        }
    }
}
