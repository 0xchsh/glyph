//
//  CanvasTileView.swift
//  Glyph
//

import SwiftUI

// Fixed logical size for every tile (before canvas zoom is applied)
let canvasTileWidth:  CGFloat = 200
let canvasTileHeight: CGFloat = 130   // roughly 16:10 viewport aspect

struct CanvasTileView: View {
    let route: DiscoveredRoute
    let palette: ColorPalette
    let isSelected: Bool
    let snapshot: NSImage?
    let isCapturing: Bool
    let onTap: () -> Void
    let onDoubleTap: () -> Void

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Card background
            RoundedRectangle(cornerRadius: 10)
                .fill(palette.panelBackground)

            // Page snapshot (when available)
            if let image = snapshot {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: canvasTileWidth, height: canvasTileHeight)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .transition(.opacity.animation(.easeIn(duration: 0.3)))
            } else if isCapturing {
                // Loading shimmer
                ZStack {
                    Color.clear
                    Dots3Spinner(size: 14, color: .secondary)
                }
            }

            // Label overlay — always visible, darkened bg when snapshot is shown
            VStack(alignment: .leading, spacing: 0) {
                // Top: framework badge + dynamic
                HStack(spacing: 4) {
                    Text(route.framework.shortName)
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(snapshot != nil ? .white.opacity(0.85) : palette.secondaryText.opacity(0.55))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(
                            Capsule().fill(snapshot != nil ? Color.black.opacity(0.45) : palette.appBackground)
                        )

                    Spacer()

                    if route.isDynamic {
                        HStack(spacing: 2) {
                            Image(systemName: "bolt.fill").font(.system(size: 8))
                            Text("dynamic").font(.system(size: 8))
                        }
                        .foregroundStyle(palette.accent.opacity(0.85))
                    }
                }

                Spacer()

                // Bottom: route info on a scrim when snapshot is present
                VStack(alignment: .leading, spacing: 3) {
                    Text(route.displayName)
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .foregroundStyle(snapshot != nil ? .white : palette.primaryText)
                        .lineLimit(1)

                    Text(route.path)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(snapshot != nil ? .white.opacity(0.65) : palette.secondaryText.opacity(0.5))
                        .lineLimit(1)
                }
                .padding(8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    snapshot != nil
                        ? AnyView(
                            LinearGradient(
                                colors: [.clear, .black.opacity(0.65)],
                                startPoint: .top, endPoint: .bottom
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        )
                        : AnyView(Color.clear)
                )
            }
            .padding(.top, 10)
            .padding(.horizontal, 10)

            // Border
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(
                    isSelected ? palette.accent : palette.border.opacity(snapshot != nil ? 0.4 : 1),
                    style: route.isDynamic
                        ? StrokeStyle(lineWidth: isSelected ? 2 : 1, dash: [5, 3])
                        : StrokeStyle(lineWidth: isSelected ? 2 : 1)
                )
        }
        .frame(width: canvasTileWidth, height: canvasTileHeight)
        .shadow(
            color: Color.black.opacity(palette.isDark ? 0.28 : 0.07),
            radius: isSelected ? 10 : 3,
            y: isSelected ? 5 : 2
        )
        .scaleEffect(isSelected ? 1.03 : 1.0)
        .animation(.easeInOut(duration: 0.12), value: isSelected)
        .contentShape(Rectangle())
        .onTapGesture(count: 2) { onDoubleTap() }
        .onTapGesture(count: 1) { onTap() }
    }
}
