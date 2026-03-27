//
//  CenterPanel.swift
//  Glyph
//

import SwiftUI

// MARK: - CenterPanel

struct CenterPanel: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        let palette = appState.palette

        VStack(spacing: 0) {
            // Tab bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 0) {
                    CenterTabButton(
                        icon: "globe",
                        label: "Preview",
                        isDirty: false,
                        isActive: appState.activeCenterTab == .preview,
                        palette: palette,
                        onSelect: { appState.activeCenterTab = .preview },
                        onClose: nil
                    )

                    ForEach(appState.openedFileURLs, id: \.self) { url in
                        let isLast = url == appState.openedFileURLs.last
                        CenterTabButton(
                            icon: "doc.text",
                            label: url.lastPathComponent,
                            isDirty: appState.dirtyFiles.contains(url),
                            isActive: appState.activeCenterTab == .file(url),
                            palette: palette,
                            onSelect: { appState.activeCenterTab = .file(url) },
                            onClose: { appState.closeFile(url) },
                            onCloseOthers: appState.openedFileURLs.count > 1
                                ? { appState.closeOthers(except: url) } : nil,
                            onCloseToRight: !isLast
                                ? { appState.closeToRight(of: url) } : nil
                        )
                    }
                }
            }
            .frame(height: panelToolbarHeight)
            .background(palette.appBackground)

            palette.border.frame(height: 1)

            // Content — .id(url) gives each file its own view instance,
            // preserving unsaved edits when switching between tabs.
            switch appState.activeCenterTab {
            case .preview:
                BrowserPanel()
            case .file(let url):
                CodeViewerPanel(url: url)
                    .id(url)
            }
        }
    }
}

// MARK: - CenterTabButton

private struct CenterTabButton: View {
    let icon: String
    let label: String
    let isDirty: Bool
    let isActive: Bool
    let palette: ColorPalette
    let onSelect: () -> Void
    let onClose: (() -> Void)?
    var onCloseOthers: (() -> Void)? = nil
    var onCloseToRight: (() -> Void)? = nil

    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 0) {
            Button(action: onSelect) {
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 11))
                        .foregroundStyle(isActive ? palette.primaryText : palette.secondaryText.opacity(0.55))

                    Text(label)
                        .font(.system(size: 12))
                        .foregroundStyle(isActive ? palette.primaryText : palette.secondaryText.opacity(0.7))
                        .lineLimit(1)

                    // Dirty dot or close button
                    if let onClose {
                        ZStack {
                            // Show dot when dirty and not hovered; close × otherwise
                            if isDirty && !isHovered {
                                Circle()
                                    .fill(palette.accent.opacity(0.8))
                                    .frame(width: 7, height: 7)
                            } else {
                                Button(action: onClose) {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 9, weight: .medium))
                                        .foregroundStyle(palette.secondaryText.opacity(isHovered ? 0.9 : 0.4))
                                        .frame(width: 14, height: 14)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .help("Close tab")
                            }
                        }
                        .frame(width: 14, height: 14)
                    }
                }
                .padding(.horizontal, 12)
                .frame(height: panelToolbarHeight)
                .frame(minWidth: 80)
                .background(isActive ? palette.panelBackground : palette.appBackground)
                .overlay(alignment: .bottom) {
                    if isActive {
                        palette.accent.frame(height: 2)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // Right separator
            palette.border.frame(width: 1, height: panelToolbarHeight)
        }
        .onHover { isHovered = $0 }
        .contextMenu {
            if let onClose {
                Button("Close") { onClose() }
                if let onCloseOthers {
                    Button("Close Others") { onCloseOthers() }
                }
                if let onCloseToRight {
                    Button("Close to the Right") { onCloseToRight() }
                }
            }
        }
    }
}
