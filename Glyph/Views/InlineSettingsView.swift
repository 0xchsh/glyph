//
//  InlineSettingsView.swift
//  Glyph
//
//  Settings rendered inside the center panel (not a separate window).
//

import SwiftUI

struct InlineSettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedSection: SettingsSection = .general

    enum SettingsSection: String, CaseIterable {
        case general = "General"
        case appearance = "Appearance"
        case terminal = "Terminal"
    }

    var body: some View {
        let palette = appState.palette

        HStack(spacing: 0) {
            // ── Left nav ──────────────────────────────────────────────
            VStack(alignment: .leading, spacing: 2) {
                Text("Settings")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(palette.secondaryText.opacity(0.6))
                    .padding(.horizontal, 16)
                    .padding(.top, 20)
                    .padding(.bottom, 8)

                ForEach(SettingsSection.allCases, id: \.self) { section in
                    SettingsNavRow(
                        label: section.rawValue,
                        isSelected: selectedSection == section,
                        palette: palette
                    ) {
                        selectedSection = section
                    }
                }

                Spacer()
            }
            .frame(width: 200)
            .background(palette.sidebarBackground)

            Color(NSColor.separatorColor).opacity(0.5).frame(width: 1)

            // ── Content ───────────────────────────────────────────────
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text(selectedSection.rawValue)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(palette.primaryText)
                        .padding(.horizontal, 40)
                        .padding(.top, 32)
                        .padding(.bottom, 24)

                    switch selectedSection {
                    case .general:   GeneralSettingsSection()
                    case .appearance: AppearanceSettingsSection()
                    case .terminal:  TerminalSettingsSection()
                    }
                }
                .frame(maxWidth: 640, alignment: .leading)
                .padding(.horizontal, 40)
                .padding(.bottom, 40)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(palette.appBackground)
        }
        .environment(appState)
    }
}

// MARK: - Nav row

private struct SettingsNavRow: View {
    let label: String
    let isSelected: Bool
    let palette: ColorPalette
    let action: () -> Void
    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: isSelected ? .medium : .regular))
                .foregroundStyle(isSelected ? palette.primaryText : palette.secondaryText.opacity(isHovered ? 1.0 : 0.75))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 12)
                .frame(height: 36)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(isSelected
                            ? (palette.isDark ? Color(white: 0.18) : Color(white: 0, opacity: 0.07))
                            : isHovered
                                ? (palette.isDark ? Color(white: 0.14) : Color(white: 0, opacity: 0.04))
                                : Color.clear)
                        .animation(.easeInOut(duration: 0.1), value: isHovered)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
        .padding(.horizontal, 8)
    }
}

// MARK: - Setting row

private struct SettingRow<Control: View>: View {
    let title: String
    let description: String?
    @ViewBuilder let control: () -> Control

    init(_ title: String, description: String? = nil, @ViewBuilder control: @escaping () -> Control) {
        self.title = title
        self.description = description
        self.control = control
    }

    var body: some View {
        @Environment(AppState.self) var appState
        let palette = appState.palette

        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(palette.primaryText)
                if let desc = description {
                    Text(desc)
                        .font(.system(size: 12))
                        .foregroundStyle(palette.secondaryText.opacity(0.65))
                }
            }
            Spacer()
            control()
        }
        .padding(.vertical, 14)

        Color(NSColor.separatorColor).opacity(0.35).frame(height: 1)
    }
}

// MARK: - Sections

private struct GeneralSettingsSection: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var appState = appState

        VStack(spacing: 0) {
            SettingRow("Auto-open browser preview",
                       description: "Automatically open the browser when a dev server port is detected") {
                Toggle("", isOn: $appState.autoOpenBrowserPreview)
                    .labelsHidden()
                    .toggleStyle(.switch)
            }
        }
    }
}

private struct AppearanceSettingsSection: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var appState = appState
        let palette = appState.palette

        VStack(spacing: 0) {
            SettingRow("Color palette", description: "Choose the color theme for the interface") {
                Picker("", selection: $appState.currentPalette) {
                    ForEach(Palette.allCases) { p in
                        Text(p.rawValue).tag(p)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .frame(width: 140)
            }

            SettingRow("Font size", description: "Size of the code editor and terminal font") {
                HStack(spacing: 8) {
                    Button {
                        appState.fontSize = max(appState.fontSize - 1, 9)
                    } label: {
                        Image(systemName: "minus")
                            .font(.system(size: 11, weight: .medium))
                            .frame(width: 24, height: 24)
                            .background(palette.isDark ? Color(white: 0.18) : Color(white: 0, opacity: 0.06),
                                        in: RoundedRectangle(cornerRadius: 5))
                    }
                    .buttonStyle(.plain)

                    Text("\(Int(appState.fontSize))pt")
                        .font(.system(size: 13, design: .monospaced))
                        .foregroundStyle(palette.primaryText)
                        .frame(width: 40, alignment: .center)

                    Button {
                        appState.fontSize = min(appState.fontSize + 1, 24)
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .medium))
                            .frame(width: 24, height: 24)
                            .background(palette.isDark ? Color(white: 0.18) : Color(white: 0, opacity: 0.06),
                                        in: RoundedRectangle(cornerRadius: 5))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

private struct TerminalSettingsSection: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        @Bindable var appState = appState

        VStack(spacing: 0) {
            SettingRow("Default preset", description: "The terminal preset used when opening a new project") {
                Picker("", selection: $appState.defaultPresetID) {
                    ForEach(AgentPreset.defaults) { preset in
                        Text(preset.displayName).tag(preset.id)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .frame(width: 180)
            }
        }
    }
}
