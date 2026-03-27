//
//  WelcomeView.swift
//  Glyph
//

import SwiftUI
import UniformTypeIdentifiers

struct WelcomeView: View {
    @Environment(AppState.self) private var appState
    @State private var isPickerPresented = false
    @State private var isNewFolderPickerPresented = false

    var body: some View {
        let palette = appState.palette

        ZStack {
            palette.appBackground

            VStack(spacing: 48) {
                // Wordmark
                Text("GLYPH")
                    .font(.system(size: 64, weight: .black, design: .monospaced))
                    .tracking(12)
                    .foregroundStyle(palette.primaryText.opacity(0.9))

                // Action cards
                HStack(spacing: 12) {
                    WelcomeCard(
                        icon: "folder",
                        title: "Open project",
                        palette: palette
                    ) {
                        isPickerPresented = true
                    }

                    WelcomeCard(
                        icon: "plus.square",
                        title: "New project",
                        palette: palette
                    ) {
                        isNewFolderPickerPresented = true
                    }

                    WelcomeCard(
                        icon: "gearshape",
                        title: "Settings",
                        palette: palette
                    ) {
                        appState.activeCenterTab = .settings
                    }
                }
                .frame(width: 500)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .fileImporter(isPresented: $isPickerPresented, allowedContentTypes: [.folder]) { result in
            if case .success(let url) = result {
                appState.addExistingFolder(url)
            }
        }
        .fileImporter(isPresented: $isNewFolderPickerPresented, allowedContentTypes: [.folder]) { result in
            if case .success(let url) = result {
                appState.addExistingFolder(url)
            }
        }
    }
}

private struct WelcomeCard: View {
    let icon: String
    let title: String
    let palette: ColorPalette
    let action: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 0) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(palette.secondaryText.opacity(0.7))
                    .padding(.top, 20)
                    .padding(.leading, 20)

                Spacer()

                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(palette.primaryText.opacity(0.8))
                    .padding(.bottom, 20)
                    .padding(.leading, 20)
            }
            .frame(width: 156, height: 120)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isHovered
                        ? (palette.isDark ? Color(white: 0.18) : Color(white: 0.92))
                        : (palette.isDark ? Color(white: 0.14) : Color(white: 0.88)))
            )
            .animation(.easeInOut(duration: 0.1), value: isHovered)
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }
}
