//
//  FileTreePanel.swift
//  Glyph
//

import SwiftUI

struct FileTreePanel: View {
    @Environment(AppState.self) private var appState
    @State private var fileItems: [FileItem] = []
    @State private var isNewProjectPresented = false
    @State private var newProjectName = ""

    var body: some View {
        let palette = appState.palette

        VStack(spacing: 0) {

            // ── Projects ────────────────────────────────────────────
            SectionHeader(title: "PROJECTS", palette: palette) {
                Button {
                    newProjectName = ""
                    isNewProjectPresented = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.secondaryText)
                        .frame(width: 24, height: 24)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }

            if appState.projects.isEmpty {
                Text("No projects yet")
                    .font(.system(size: 11))
                    .foregroundStyle(palette.secondaryText.opacity(0.35))
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                VStack(spacing: 0) {
                    ForEach(appState.projects) { project in
                        ProjectRow(
                            project: project,
                            isSelected: appState.selectedProject == project,
                            palette: palette
                        ) {
                            appState.selectedProject = project
                        }
                    }
                }
            }

            palette.border.frame(height: 1)

            // ── Files ────────────────────────────────────────────────
            SectionHeader(title: "FILES", palette: palette)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(fileItems) { item in
                        FileRowView(item: item, palette: palette)
                    }
                }
                .padding(.vertical, 4)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxHeight: .infinity)

            palette.border.frame(height: 1)

            // ── Ports ────────────────────────────────────────────────
            SectionHeader(title: "PORTS", palette: palette)

            HStack(spacing: 6) {
                Circle()
                    .fill(appState.browserURL != nil ? Color.green : palette.secondaryText.opacity(0.3))
                    .frame(width: 6, height: 6)
                if let url = appState.browserURL {
                    Text("\(url.host ?? "localhost"):\(url.port.map(String.init) ?? "80")")
                        .font(.system(size: 11))
                        .foregroundStyle(palette.primaryText)
                } else {
                    Text("No active server")
                        .font(.system(size: 11))
                        .foregroundStyle(palette.secondaryText)
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(palette.sidebarBackground)
        .onChange(of: appState.selectedProject, initial: true) { _, _ in
            loadFiles()
        }
        .sheet(isPresented: $isNewProjectPresented) {
            NewProjectSheet(isPresented: $isNewProjectPresented, projectName: $newProjectName) {
                try appState.createProject(name: newProjectName)
            }
            .environment(appState)
        }
    }

    private func loadFiles() {
        guard let project = appState.selectedProject else {
            fileItems = []
            return
        }
        fileItems = FileItem.load(from: project.url)
    }
}

// MARK: - SectionHeader

private struct SectionHeader<Trailing: View>: View {
    let title: String
    let palette: ColorPalette
    @ViewBuilder var trailing: () -> Trailing

    init(title: String, palette: ColorPalette, @ViewBuilder trailing: @escaping () -> Trailing) {
        self.title = title
        self.palette = palette
        self.trailing = trailing
    }

    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(palette.secondaryText.opacity(0.55))
                .tracking(0.8)
            Spacer()
            trailing()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }
}

extension SectionHeader where Trailing == EmptyView {
    init(title: String, palette: ColorPalette) {
        self.init(title: title, palette: palette, trailing: { EmptyView() })
    }
}

// MARK: - ProjectRow

private struct ProjectRow: View {
    let project: Project
    let isSelected: Bool
    let palette: ColorPalette
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 7) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(isSelected ? palette.accent : Color.clear)
                    .frame(width: 2, height: 14)

                Text(project.name)
                    .font(.system(size: 12, weight: isSelected ? .medium : .regular))
                    .foregroundStyle(isSelected ? palette.primaryText : palette.secondaryText)
                    .lineLimit(1)

                Spacer()
            }
            .padding(.leading, 10)
            .padding(.trailing, 12)
            .padding(.vertical, 5)
            .background(isSelected ? palette.accent.opacity(0.08) : Color.clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - FileRowView

private struct FileRowView: View {
    let item: FileItem
    let palette: ColorPalette

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: item.sfSymbol())
                .font(.system(size: 11))
                .foregroundStyle(item.isDirectory ? palette.accent.opacity(0.7) : palette.secondaryText.opacity(0.6))
                .frame(width: 14, alignment: .center)
            Text(item.name)
                .font(.system(size: 12))
                .foregroundStyle(palette.primaryText)
                .lineLimit(1)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 3)
    }
}

// MARK: - NewProjectSheet

private struct NewProjectSheet: View {
    @Binding var isPresented: Bool
    @Binding var projectName: String
    @Environment(AppState.self) private var appState
    let onCreate: () throws -> Void

    @State private var errorMessage: String?

    var body: some View {
        let palette = appState.palette

        VStack(alignment: .leading, spacing: 20) {
            Text("New Project")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(palette.primaryText)

            TextField("project-name", text: $projectName)
                .textFieldStyle(.plain)
                .font(.system(size: 14, design: .monospaced))
                .padding(10)
                .background(palette.appBackground, in: RoundedRectangle(cornerRadius: 8))
                .foregroundStyle(palette.primaryText)
                .onSubmit { submit() }

            if let error = errorMessage {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundStyle(.red)
            }

            HStack {
                Spacer()
                Button("Cancel") { isPresented = false }
                    .keyboardShortcut(.cancelAction)
                Button("Create") { submit() }
                    .keyboardShortcut(.defaultAction)
                    .disabled(projectName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 320)
        .background(palette.panelBackground)
    }

    private func submit() {
        let name = projectName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        do {
            try onCreate()
            isPresented = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
