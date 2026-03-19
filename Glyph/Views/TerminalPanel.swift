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

                ForEach(AgentPreset.defaults) { preset in
                    Button {
                        guard preset.id != activePreset.id else { return }
                        activePreset = preset
                        restartID += 1
                    } label: {
                        Text(preset.displayName)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(
                                activePreset.id == preset.id ? palette.accent : palette.secondaryText
                            )
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                RoundedRectangle(cornerRadius: 5)
                                    .fill(
                                        activePreset.id == preset.id
                                            ? palette.accent.opacity(0.12)
                                            : palette.appBackground
                                    )
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
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
