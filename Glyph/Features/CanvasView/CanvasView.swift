//
//  CanvasView.swift
//  Glyph
//

import SwiftUI

struct CanvasView: View {
    @Environment(AppState.self) private var appState

    // Zoom + pan state
    @State private var scale: CGFloat = 1.0
    @State private var baseScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var dragBase: CGSize = .zero

    private let tileColumns = 4
    private let tileSpacing: CGFloat = 24
    private let canvasPadding: CGFloat = 48

    var body: some View {
        let palette = appState.palette

        ZStack {
            palette.appBackground
                .ignoresSafeArea()

            switch canvasContent {
            case .loading:
                loadingView(palette: palette)
            case .empty:
                emptyView(palette: palette)
            case .routes(let routes):
                tilesCanvas(routes: routes, palette: palette)
            }
        }
        .onAppear {
            if appState.discoveredRoutes.isEmpty {
                appState.discoverRoutes()
            }
        }
        .onChange(of: appState.selectedProject) { _, _ in
            appState.discoverRoutes()
            resetView()
        }
    }

    // MARK: - Content state

    private enum CanvasContent {
        case loading
        case empty
        case routes([DiscoveredRoute])
    }

    private var canvasContent: CanvasContent {
        if appState.isDiscoveringRoutes { return .loading }
        if appState.discoveredRoutes.isEmpty { return .empty }
        return .routes(appState.discoveredRoutes)
    }

    // MARK: - Canvas with tiles

    @ViewBuilder
    private func tilesCanvas(routes: [DiscoveredRoute], palette: ColorPalette) -> some View {
        let cols = max(1, min(tileColumns, routes.count))
        let gridColumns = Array(
            repeating: GridItem(.fixed(canvasTileWidth), spacing: tileSpacing),
            count: cols
        )

        GeometryReader { geo in
            LazyVGrid(columns: gridColumns, spacing: tileSpacing) {
                ForEach(routes) { route in
                    CanvasTileView(
                        route: route,
                        palette: palette,
                        isSelected: appState.canvasSelectedRouteID == route.id,
                        snapshot: appState.snapshotService.snapshots[route.path],
                        isCapturing: appState.snapshotService.capturing.contains(route.path),
                        onTap: { appState.canvasSelectedRouteID = route.id },
                        onDoubleTap: {
                            appState.canvasSelectedRouteID = route.id
                            appState.openFile(route.sourceFile)
                            appState.activeViewMode = .editor
                        }
                    )
                }
            }
            .padding(canvasPadding)
            // Center grid in canvas on initial load
            .frame(
                minWidth: geo.size.width,
                minHeight: geo.size.height,
                alignment: .center
            )
            .scaleEffect(scale)
            .offset(offset)
            .gesture(panGesture)
            .simultaneousGesture(zoomGesture)
        }
        .clipped()
        .overlay(alignment: .bottomTrailing) {
            zoomControls(palette: palette)
        }
    }

    // MARK: - Gestures

    private var panGesture: some Gesture {
        DragGesture(minimumDistance: 6)
            .onChanged { value in
                offset = CGSize(
                    width: dragBase.width + value.translation.width,
                    height: dragBase.height + value.translation.height
                )
            }
            .onEnded { _ in dragBase = offset }
    }

    private var zoomGesture: some Gesture {
        MagnificationGesture()
            .onChanged { value in
                scale = min(max(baseScale * value, 0.1), 2.0)
            }
            .onEnded { _ in baseScale = scale }
    }

    // MARK: - Zoom controls HUD

    @ViewBuilder
    private func zoomControls(palette: ColorPalette) -> some View {
        HStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    scale = max(scale - 0.1, 0.1)
                    baseScale = scale
                }
            } label: {
                Image(systemName: "minus")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(palette.secondaryText)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)

            Text("\(Int(scale * 100))%")
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(palette.secondaryText.opacity(0.7))
                .frame(width: 40)

            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    scale = min(scale + 0.1, 2.0)
                    baseScale = scale
                }
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(palette.secondaryText)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)

            Divider()
                .frame(height: 14)
                .padding(.horizontal, 4)

            Button {
                withAnimation(.easeInOut(duration: 0.2)) { resetView() }
            } label: {
                Image(systemName: "arrow.up.left.and.down.right.magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundStyle(palette.secondaryText)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
            .help("Reset view")
        }
        .background(
            RoundedRectangle(cornerRadius: 7)
                .fill(palette.panelBackground)
                .shadow(color: .black.opacity(0.15), radius: 4, y: 2)
        )
        .padding(12)
    }

    // MARK: - Empty / loading views

    @ViewBuilder
    private func emptyView(palette: ColorPalette) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "square.grid.2x2")
                .font(.system(size: 40))
                .foregroundStyle(palette.secondaryText.opacity(0.18))
            Text("No pages detected")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(palette.secondaryText.opacity(0.45))
            Text("Is this a Next.js or React project?")
                .font(.system(size: 13))
                .foregroundStyle(palette.secondaryText.opacity(0.3))
            Button("Scan Again") { appState.discoverRoutes() }
                .buttonStyle(.plain)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(palette.accent)
                .padding(.top, 4)
        }
    }

    @ViewBuilder
    private func loadingView(palette: ColorPalette) -> some View {
        VStack(spacing: 12) {
            ProgressView()
                .scaleEffect(0.75)
            Text("Discovering routes…")
                .font(.system(size: 13))
                .foregroundStyle(palette.secondaryText.opacity(0.4))
        }
    }

    // MARK: - Helpers

    private func resetView() {
        scale = 1.0
        baseScale = 1.0
        offset = .zero
        dragBase = .zero
    }
}
