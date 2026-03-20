//
//  TerminalPanel.swift
//  Glyph
//

import SwiftUI
import AppKit

struct TerminalPanel: View {
    @Environment(AppState.self) private var appState
    // Tracks which project URLs have had a terminal created (in order, for ForEach)
    @State private var visitedProjectURLs: [URL] = []

    private var shell: String {
        ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh"
    }

    var body: some View {
        let palette = appState.palette
        let selectedURL = appState.selectedProject?.url

        VStack(spacing: 0) {
            // Toolbar
            HStack(spacing: 6) {
                Text("TERMINAL")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(palette.secondaryText)
                    .tracking(0.8)

                Spacer()

                if let url = selectedURL {
                    let activePreset = appState.terminalPreset(for: url)

                    // + New shell
                    Button {
                        appState.setTerminalPreset(AgentPreset.defaults[0], for: url)
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
                                appState.setTerminalPreset(preset, for: url)
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
            }
            .padding(.horizontal, 12)
            .frame(height: panelToolbarHeight)
            .background(palette.panelBackground)

            palette.border.frame(height: 1)

            // One terminal per visited project — kept alive, only active one is visible
            ZStack {
                ForEach(visitedProjectURLs, id: \.self) { url in
                    TerminalViewWrapper(
                        shell: shell,
                        shellArgs: appState.terminalPreset(for: url).shellArgs,
                        workingDirectory: url.path,
                        backgroundColor: palette.nsBackground,
                        foregroundColor: palette.nsForeground,
                        restartID: appState.terminalRestartID(for: url),
                        onURLDetected: { urlString in
                            guard let detected = URL(string: urlString) else { return }
                            appState.addServer(detected, for: url)
                            if url == appState.selectedProject?.url && appState.browserURL == nil {
                                appState.browserURL = detected
                            }
                        },
                        onConflictDetected: { port in
                            appState.markConflict(port: port, for: url)
                        }
                    )
                    .opacity(url == selectedURL ? 1 : 0)
                    .allowsHitTesting(url == selectedURL)
                }
            }
        }
        .onAppear { trackCurrentProject() }
        .onChange(of: appState.selectedProject) { _, _ in trackCurrentProject() }
    }

    private func trackCurrentProject() {
        guard let url = appState.selectedProject?.url,
              !visitedProjectURLs.contains(url) else { return }
        visitedProjectURLs.append(url)
    }
}
