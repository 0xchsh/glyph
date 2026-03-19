//
//  MainLayoutView.swift
//  Glyph
//

import SwiftUI

struct MainLayoutView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        let palette = appState.palette

        HStack(spacing: 0) {
            FileTreePanel()
                .frame(width: 220)

            palette.border
                .frame(width: 1)

            BrowserPanel()
                .frame(maxWidth: .infinity)

            palette.border
                .frame(width: 1)

            TerminalPanel()
                .frame(maxWidth: .infinity)
        }
        .frame(minWidth: 900, minHeight: 600)
        .background(palette.appBackground)
        .onAppear { appState.scanForProjects() }
    }
}
