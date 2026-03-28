//
//  MainLayoutView.swift
//  Glyph
//

import SwiftUI

/// Shared toolbar height used by all three panel headers so they stay visually aligned.
let panelToolbarHeight: CGFloat = 38

struct MainLayoutView: View {
    @Environment(AppState.self) private var appState
    @State private var centerSplitFraction: CGFloat = 0.5
    @State private var sidebarWidth: CGFloat = 260
    @State private var browserWidth: CGFloat = 380

    var body: some View {
        let palette = appState.palette

        GeometryReader { geo in
            let W = geo.size.width
            let clampedSidebar = min(max(sidebarWidth, 160), 320)

            ZStack(alignment: .topLeading) {
                // Full-width sidebarBackground behind the transparent titlebar
                palette.sidebarBackground
                    .frame(maxWidth: .infinity)
                    .ignoresSafeArea(.all, edges: .top)

                HStack(spacing: 0) {
                    FileTreePanel()
                        .frame(width: clampedSidebar)

                    if appState.selectedProject == nil {
                        WelcomeView()
                            .frame(maxWidth: .infinity)
                    } else if appState.activeViewMode == .canvas {
                        CanvasView()
                            .frame(maxWidth: .infinity)
                    } else {
                        GeometryReader { innerGeo in
                            ZStack(alignment: .topLeading) {
                                HStack(spacing: 0) {
                                    CenterTerminalSplit(splitFraction: $centerSplitFraction, palette: palette)
                                        .frame(maxWidth: .infinity)
                                    if appState.showBrowser {
                                        Color(NSColor.separatorColor).opacity(0.4).frame(width: 1)
                                        BrowserPanel()
                                            .frame(width: browserWidth - 1)
                                    }
                                }

                                // Browser panel divider hit area
                                if appState.showBrowser {
                                    BrowserDivider(browserWidth: $browserWidth, totalWidth: innerGeo.size.width)
                                        .offset(x: innerGeo.size.width - browserWidth - 12)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                }

                // Sidebar divider hit area
                SidebarDivider(sidebarWidth: $sidebarWidth, totalWidth: W)
                    .offset(x: clampedSidebar - 12)
            }
        }
        .frame(minWidth: 900, minHeight: 600)
        .onAppear { appState.scanForProjects() }
        .overlay {
            Group {
                Button("") { appState.fontSize = min(appState.fontSize + 1, 24) }
                    .keyboardShortcut("=", modifiers: .command)
                    .frame(width: 0, height: 0)
                Button("") { appState.fontSize = max(appState.fontSize - 1, 9) }
                    .keyboardShortcut("-", modifiers: .command)
                    .frame(width: 0, height: 0)
                Button("") { appState.fontSize = 13 }
                    .keyboardShortcut("0", modifiers: .command)
                    .frame(width: 0, height: 0)
            }
        }
    }
}

private struct SidebarDivider: View {
    @Binding var sidebarWidth: CGFloat
    let totalWidth: CGFloat
    @State private var isDragging = false
    @State private var isHovering = false

    var body: some View {
        GeometryReader { geo in
            Rectangle()
                .fill(Color.white.opacity(0.001))
                .frame(width: 24, height: geo.size.height)
                .gesture(
                    DragGesture(minimumDistance: 1)
                        .onChanged { v in
                            isDragging = true
                            let newW = sidebarWidth + v.translation.width
                            sidebarWidth = min(max(newW, 160), 320)
                        }
                        .onEnded { _ in isDragging = false }
                )
                .onHover { hovering in
                    isHovering = hovering
                    if hovering { NSCursor.resizeLeftRight.push() } else { NSCursor.pop() }
                }
        }
    }
}

private struct BrowserDivider: View {
    @Binding var browserWidth: CGFloat
    let totalWidth: CGFloat
    @State private var isDragging = false
    @State private var isHovering = false

    var body: some View {
        GeometryReader { geo in
            Rectangle()
                .fill(Color.white.opacity(0.001))
                .frame(width: 24, height: geo.size.height)
                .gesture(
                    DragGesture(minimumDistance: 1)
                        .onChanged { v in
                            isDragging = true
                            let newW = browserWidth - v.translation.width
                            browserWidth = min(max(newW, 240), 700)
                        }
                        .onEnded { _ in isDragging = false }
                )
                .onHover { hovering in
                    isHovering = hovering
                    if hovering { NSCursor.resizeLeftRight.push() } else { NSCursor.pop() }
                }
        }
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
                    TerminalPanel()
                        .frame(maxWidth: .infinity)
                }

                // Divider line — only visible on hover/drag
                if isHovering || isDragging {
                    Color(NSColor.separatorColor)
                        .opacity(isDragging ? 0.0 : 0.8)
                        .frame(width: 1, height: H)
                        .offset(x: committedX)
                        .allowsHitTesting(false)
                        .animation(.easeInOut(duration: 0.12), value: isHovering)
                }

                // Ghost line tracks cursor during drag
                if isDragging {
                    Color(NSColor.separatorColor)
                        .frame(width: 1, height: H)
                        .offset(x: ghostX)
                        .allowsHitTesting(false)
                        .animation(nil, value: ghostX)
                }

                // Drag handle — 24 px hit area centered on the divider
                Rectangle()
                    .fill(Color.white.opacity(0.001))
                    .frame(width: 24, height: H)
                    .offset(x: committedX - 12)
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
