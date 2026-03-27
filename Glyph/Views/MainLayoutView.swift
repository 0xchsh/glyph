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

    @State private var isDragging = false
    @State private var isHovering = false
    @State private var dragOffset: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let W = geo.size.width
            let H = geo.size.height
            let committedX = W * splitFraction
            let ghostX = isDragging
                ? min(max(committedX + dragOffset, W * 0.2), W * 0.8)
                : committedX

            ZStack(alignment: .topLeading) {
                // Panels never resize during drag — only update on commit
                HStack(spacing: 0) {
                    CenterPanel()
                        .frame(width: committedX)
                    palette.border.frame(width: 1)
                    TerminalPanel()
                        .frame(maxWidth: .infinity)
                }

                // Hover highlight on the divider line
                if isHovering || isDragging {
                    palette.accent.opacity(isDragging ? 0.7 : 0.35)
                        .frame(width: 2, height: H)
                        .offset(x: committedX - 1)
                        .allowsHitTesting(false)
                        .animation(.easeInOut(duration: 0.15), value: isHovering)
                }

                // Ghost line tracks cursor during drag
                if isDragging {
                    palette.accent.opacity(0.7)
                        .frame(width: 2, height: H)
                        .offset(x: ghostX - 1)
                        .allowsHitTesting(false)
                        .animation(nil, value: ghostX)
                }

                // Drag handle — 24 px hit area centered on the divider
                Color.clear
                    .frame(width: 24, height: H)
                    .offset(x: committedX - 12)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 1)
                            .onChanged { v in
                                isDragging = true
                                dragOffset = v.translation.width
                            }
                            .onEnded { v in
                                let newFraction = min(max(splitFraction + v.translation.width / W, 0.2), 0.8)
                                withAnimation(.easeOut(duration: 0.12)) {
                                    splitFraction = newFraction
                                }
                                isDragging = false
                                dragOffset = 0
                            }
                    )
                    .simultaneousGesture(
                        TapGesture(count: 2).onEnded {
                            withAnimation(.easeInOut(duration: 0.2)) { splitFraction = 0.5 }
                        }
                    )
                    .onHover { hovering in
                        isHovering = hovering
                        if hovering { NSCursor.resizeLeftRight.push() } else { NSCursor.pop() }
                    }
            }
        }
    }
}
