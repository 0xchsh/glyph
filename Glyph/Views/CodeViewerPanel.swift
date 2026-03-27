//
//  CodeViewerPanel.swift
//  Glyph
//

import SwiftUI
import AppKit

struct CodeViewerPanel: View {
    @Environment(AppState.self) private var appState
    let url: URL

    @State private var content: String = ""
    @State private var loadError: String?
    @State private var isLoaded = false

    private var isMarkdown: Bool {
        ["md", "mdx"].contains(url.pathExtension.lowercased())
    }

    private var highlightrLanguage: String {
        switch url.pathExtension.lowercased() {
        case "swift":               return "swift"
        case "js", "jsx":           return "javascript"
        case "ts", "tsx":           return "typescript"
        case "json":                return "json"
        case "css":                 return "css"
        case "scss":                return "scss"
        case "html":                return "html"
        case "py":                  return "python"
        case "sh", "bash", "zsh":   return "bash"
        case "yaml", "yml":         return "yaml"
        case "xml":                 return "xml"
        case "rb":                  return "ruby"
        case "go":                  return "go"
        case "rs":                  return "rust"
        case "kt":                  return "kotlin"
        case "java":                return "java"
        case "c", "h":              return "c"
        case "cpp", "cc", "cxx":    return "cpp"
        default:                    return "plaintext"
        }
    }

    private var isDirty: Bool { appState.dirtyFiles.contains(url) }

    var body: some View {
        let palette = appState.palette

        VStack(spacing: 0) {
            // Toolbar
            HStack(spacing: 8) {
                Image(systemName: "doc.text")
                    .font(.system(size: 11))
                    .foregroundStyle(palette.secondaryText.opacity(0.5))

                Text(url.lastPathComponent)
                    .font(.system(size: 13))
                    .foregroundStyle(palette.primaryText)

                if let projectURL = appState.selectedProject?.url,
                   url.path.hasPrefix(projectURL.path) {
                    Text(String(url.path.dropFirst(projectURL.path.count + 1)))
                        .font(.system(size: 11))
                        .foregroundStyle(palette.secondaryText.opacity(0.35))
                        .lineLimit(1)
                }

                // Unsaved dot
                if isDirty {
                    Circle()
                        .fill(palette.secondaryText.opacity(0.5))
                        .frame(width: 6, height: 6)
                }

                Spacer()

                if isDirty {
                    Button("Save") { save() }
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(palette.accent)
                        .keyboardShortcut("s", modifiers: .command)
                }

                Button {
                    NSWorkspace.shared.activateFileViewerSelecting([url])
                } label: {
                    Image(systemName: "arrow.up.right.square")
                        .font(.system(size: 11))
                        .foregroundStyle(palette.secondaryText.opacity(0.45))
                }
                .buttonStyle(.plain)
                .help("Reveal in Finder")
            }
            .padding(.horizontal, 12)
            .frame(height: panelToolbarHeight)
            .background(palette.panelBackground)

            palette.border.frame(height: 1)

            if let error = loadError {
                ZStack {
                    palette.appBackground
                    VStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 28))
                            .foregroundStyle(palette.secondaryText.opacity(0.25))
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundStyle(palette.secondaryText.opacity(0.45))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if isMarkdown {
                MarkdownEditorView(
                    text: $content,
                    isDark: palette.isDark,
                    backgroundColor: palette.nsBackground,
                    fontSize: appState.fontSize
                )
                .onChange(of: content) { _, _ in
                    if isLoaded { appState.markDirty(url) }
                }
            } else {
                PrettyCodeEditorView(
                    text: $content,
                    language: highlightrLanguage,
                    isDark: palette.isDark,
                    backgroundColor: palette.nsBackground,
                    foregroundColor: palette.isDark
                        ? NSColor(white: 0.88, alpha: 1)
                        : NSColor(white: 0.12, alpha: 1)
                )
                .onChange(of: content) { _, _ in
                    if isLoaded { appState.markDirty(url) }
                }
            }
        }
        .onAppear { loadContent() }
        .onChange(of: url) { _, _ in loadContent() }
    }

    private func loadContent() {
        isLoaded = false
        do {
            content = try String(contentsOf: url, encoding: .utf8)
            loadError = nil
            // Defer marking loaded so the initial content set doesn't trigger dirty
            DispatchQueue.main.async { isLoaded = true }
        } catch {
            loadError = "Cannot display this file"
        }
    }

    private func save() {
        guard isDirty else { return }
        do {
            try content.write(to: url, atomically: true, encoding: .utf8)
            appState.markClean(url)
        } catch {
            // Silently fail for now — could surface an alert in future
        }
    }
}
