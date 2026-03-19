//
//  MainLayoutView.swift
//  Glyph
//

import SwiftUI

/// Shared toolbar height used by all three panel headers so they stay visually aligned.
let panelToolbarHeight: CGFloat = 38

struct MainLayoutView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        let palette = appState.palette

        HSplitView {
            FileTreePanel()
                .frame(minWidth: 160, idealWidth: 220, maxWidth: 320)

            CenterPanel()
                .frame(minWidth: 280)

            TerminalPanel()
                .frame(minWidth: 280)
        }
        .frame(minWidth: 900, minHeight: 600)
        .background(palette.appBackground)
        .onAppear { appState.scanForProjects() }
    }
}
