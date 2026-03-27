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
                            Image(systemName: "folder")
                            Text("Open Folder")
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 28)
                        .padding(.vertical, 13)
                        .background(palette.accent, in: RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)

                    Text("Open a folder to get started.\nYou can add more folders anytime.")
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
            case .success(let url):
                appState.rootDirectory = url
                appState.addExistingFolder(url)
            case .failure(let error):
                errorMessage = error.localizedDescription
            }
        }
    }
}
