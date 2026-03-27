//
//  Dots3Spinner.swift
//  Glyph
//
//  cli-spinners "dots3" — interval: 80ms
//  frames: ["⠋","⠙","⠚","⠞","⠖","⠦","⠴","⠲","⠳","⠓"]
//

import SwiftUI

struct Dots3Spinner: View {
    var size: CGFloat = 13
    var color: Color = .primary

    private static let frames: [String] = ["⠋","⠙","⠚","⠞","⠖","⠦","⠴","⠲","⠳","⠓"]
    private static let interval: TimeInterval = 0.08

    @State private var index = 0
    @State private var timer: Timer?

    var body: some View {
        Text(Self.frames[index])
            .font(.system(size: size, design: .monospaced))
            .foregroundStyle(color)
            .onAppear { start() }
            .onDisappear { stop() }
    }

    private func start() {
        timer = Timer.scheduledTimer(withTimeInterval: Self.interval, repeats: true) { _ in
            index = (index + 1) % Self.frames.count
        }
    }

    private func stop() {
        timer?.invalidate()
        timer = nil
    }
}
