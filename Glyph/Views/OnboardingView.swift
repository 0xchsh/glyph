//
//  OnboardingView.swift
//  Glyph
//

import SwiftUI
import UniformTypeIdentifiers

struct OnboardingView: View {
    @Environment(AppState.self) private var appState
    @State private var isPickerPresented = false
    @State private var errorMessage: String?

    var body: some View {
        let palette = appState.palette

        ZStack {
            palette.appBackground.ignoresSafeArea()

            VStack(spacing: 40) {
                VStack(spacing: 12) {
                    Text("Glyph")
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                        .foregroundStyle(palette.primaryText)

                    Text("Claude Code is the brain. This is the body.")
                        .font(.system(size: 16, weight: .regular))
                        .foregroundStyle(palette.secondaryText)
                }

                VStack(spacing: 12) {
                    Button {
                        isPickerPresented = true
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "folder.badge.plus")
                            Text("Choose Location")
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 28)
                        .padding(.vertical, 13)
                        .background(palette.accent, in: RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)

                    Text("Glyph will create a Glyph/ folder in the location you choose.\nAll your projects live inside it.")
                        .font(.system(size: 12))
                        .foregroundStyle(palette.secondaryText)
                        .multilineTextAlignment(.center)

                    if let error = errorMessage {
                        Text(error)
                            .font(.system(size: 12))
                            .foregroundStyle(.red)
                    }
                }
            }
            .frame(maxWidth: 480)
        }
        .frame(minWidth: 600, minHeight: 400)
        .fileImporter(
            isPresented: $isPickerPresented,
            allowedContentTypes: [.folder]
        ) { result in
            switch result {
            case .success(let parentURL):
                let glyphURL = parentURL.appendingPathComponent("Glyph")
                do {
                    try FileManager.default.createDirectory(
                        at: glyphURL,
                        withIntermediateDirectories: true
                    )
                    appState.rootDirectory = glyphURL
                    appState.scanForProjects()
                } catch {
                    errorMessage = "Couldn't create Glyph folder: \(error.localizedDescription)"
                }
            case .failure(let error):
                errorMessage = error.localizedDescription
            }
        }
    }
}
