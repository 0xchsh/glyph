//
//  TerminalPanel.swift
//  Glyph
//

import SwiftUI
import AppKit

// MARK: - TerminalPanel

struct TerminalPanel: View {
    @Environment(AppState.self) private var appState

    private var shell: String {
        ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh"
    }

    var body: some View {
        let palette = appState.palette
        let selectedURL = appState.selectedProject?.url
        let currentSessions = selectedURL.map { appState.sessions(for: $0) } ?? []
        let activeID = selectedURL.flatMap { appState.activeSessionID(for: $0) }

        VStack(spacing: 0) {
            // Tab bar + controls
            HStack(spacing: 0) {
                // Session tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 0) {
                        ForEach(currentSessions) { session in
                            TerminalTabButton(
                                label: session.preset.displayName,
                                isActive: session.id == activeID,
                                showClose: currentSessions.count > 1,
                                palette: palette,
                                onSelect: {
                                    if let url = selectedURL {
                                        appState.setActiveSession(session.id, for: url)
                                    }
                                },
                                onClose: { appState.closeSession(session.id) }
                            )
                        }
                    }
                }

                Spacer(minLength: 0)

                HStack(spacing: 0) {
                    if let url = selectedURL {
                        // + new default preset tab
                        Button {
                            appState.addSession(preset: appState.defaultPreset, for: url)
                        } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(palette.secondaryText)
                                .frame(width: 30, height: panelToolbarHeight)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .help("New terminal session")

                        // Preset picker — opens selected preset in a new tab
                        Menu {
                            ForEach(AgentPreset.defaults) { preset in
                                Button(preset.displayName) {
                                    appState.addSession(preset: preset, for: url)
                                }
                            }
                        } label: {
                            Image(systemName: "chevron.down")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundStyle(palette.secondaryText)
                                .frame(width: 22, height: panelToolbarHeight)
                                .contentShape(Rectangle())
                        }
                        .menuStyle(.borderlessButton)
                        .menuIndicator(.hidden)
                        .fixedSize()
                    }

                    // Browser toggle
                    Button {
                        appState.showBrowser.toggle()
                    } label: {
                        Image(systemName: "globe")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(appState.showBrowser
                                ? palette.accent
                                : palette.secondaryText.opacity(0.6))
                            .frame(width: 30, height: panelToolbarHeight)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .help(appState.showBrowser ? "Hide browser" : "Show browser")
                    .padding(.trailing, 8)
                }
            }
            .frame(height: panelToolbarHeight)
            .background(palette.panelBackground)

            Color(NSColor.separatorColor).opacity(0.4).frame(height: 1)

            // One TerminalViewWrapper per session, kept alive in a ZStack
            ZStack {
                ForEach(appState.allSessions) { session in
                    let isVisible = session.id == activeID && session.projectURL == selectedURL
                    TerminalViewWrapper(
                        shell: shell,
                        shellArgs: session.preset.shellArgs,
                        workingDirectory: session.projectURL.path,
                        backgroundColor: palette.nsBackground,
                        foregroundColor: palette.nsForeground,
                        restartID: session.restartID,
                        fontSize: appState.fontSize,
                        onURLDetected: { urlString in
                            guard let detected = URL(string: urlString) else { return }
                            appState.setPort(detected, for: session.projectURL)
                            if appState.autoOpenBrowserPreview,
                               session.projectURL == appState.selectedProject?.url {
                                appState.browserURL = detected
                            }
                        },
                        onStatusChanged: { status in
                            appState.updateSessionStatus(session.id, status: status)
                        },
                        onProcessTerminated: {
                            appState.updateSessionStatus(session.id, status: .crashed)
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                                appState.restartSession(session.id)
                            }
                        }
                    )
                    .opacity(isVisible ? 1 : 0)
                    .allowsHitTesting(isVisible)
                }
            }
        }
    }
}

// MARK: - TerminalTabButton

private struct TerminalTabButton: View {
    let label: String
    let isActive: Bool
    let showClose: Bool
    let palette: ColorPalette
    let onSelect: () -> Void
    let onClose: () -> Void

    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 0) {
            Button(action: onSelect) {
                HStack(spacing: 6) {
                    Text(label)
                        .font(.system(size: 12))
                        .foregroundStyle(isActive ? palette.primaryText : palette.secondaryText.opacity(0.7))
                        .lineLimit(1)

                    if showClose {
                        Button(action: onClose) {
                            Image(systemName: "xmark")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(palette.secondaryText.opacity(isHovered ? 0.9 : 0.4))
                                .frame(width: 14, height: 14)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .help("Close terminal")
                    }
                }
                .padding(.horizontal, 12)
                .frame(height: panelToolbarHeight)
                .frame(minWidth: 60)
                .background(isActive ? palette.panelBackground : palette.appBackground)
                .overlay(alignment: .bottom) {
                    if isActive { palette.accent.frame(height: 2) }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            palette.border.frame(width: 1, height: panelToolbarHeight)
        }
        .onHover { isHovered = $0 }
    }
}
