//
//  MainLayoutView.swift
//  Glyph
//

import SwiftUI

/// Shared toolbar height used by all three panel headers so they stay visually aligned.
let panelToolbarHeight: CGFloat = 38

struct MainLayoutView: View {
    @Environment(AppState.self) private var appState
    @State private var splitFraction: CGFloat = 0.5

    var body: some View {
        let palette = appState.palette

        HSplitView {
            FileTreePanel()
                .frame(minWidth: 160, idealWidth: 220, maxWidth: 320)

            if appState.activeViewMode == .canvas {
                CanvasView()
                    .frame(minWidth: 560)
            } else {
                CenterTerminalSplit(splitFraction: $splitFraction, palette: palette)
                    .frame(minWidth: 560)
            }
        }
        .frame(minWidth: 900, minHeight: 600)
        .background(palette.appBackground)
        .onAppear { appState.scanForProjects() }
    }
}

private struct CenterTerminalSplit: View {
    @Binding var splitFraction: CGFloat
    let palette: ColorPalette

    @GestureState private var dragOffset: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let totalWidth = geo.size.width - 1 // subtract 1px divider
            let activeFraction = min(max(splitFraction + dragOffset / totalWidth, 0.2), 0.8)

            HStack(spacing: 0) {
                CenterPanel()
                    .frame(width: totalWidth * activeFraction)

                divider(totalWidth: totalWidth)

                TerminalPanel()
                    .frame(maxWidth: .infinity)
            }
        }
    }

    @ViewBuilder
    private func divider(totalWidth: CGFloat) -> some View {
        let dragGesture = DragGesture(minimumDistance: 2)
            .updating($dragOffset) { value, state, _ in
                state = value.translation.width
            }
            .onEnded { value in
                splitFraction = min(max(splitFraction + value.translation.width / totalWidth, 0.2), 0.8)
            }

        let doubleTapGesture = TapGesture(count: 2)
            .onEnded {
                withAnimation(.easeInOut(duration: 0.2)) {
                    splitFraction = 0.5
                }
            }

        ZStack {
            palette.border
                .frame(width: 1)
        }
        .frame(width: 8)
        .contentShape(Rectangle())
        .gesture(dragGesture)
        .simultaneousGesture(doubleTapGesture)
        .onHover { hovering in
            if hovering { NSCursor.resizeLeftRight.push() } else { NSCursor.pop() }
        }
    }
}
