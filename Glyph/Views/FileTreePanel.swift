//
//  FileTreePanel.swift
//  Glyph
//

import SwiftUI
import AppKit

// MARK: - DirectoryWatcher

/// Watches a directory for changes using kqueue/DispatchSource.
final class DirectoryWatcher {
    private var source: (any DispatchSourceFileSystemObject)?
    private var fd: Int32 = -1

    func watch(_ url: URL, onChange: @escaping @MainActor () -> Void) {
        cancel()
        fd = open(url.path, O_EVTONLY)
        guard fd >= 0 else { return }
        let src = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fd,
            eventMask: [.write, .link, .rename, .delete],
            queue: .main
        )
        src.setEventHandler {
            Task { @MainActor in onChange() }
        }
        src.setCancelHandler { [weak self] in
            if let fd = self?.fd, fd >= 0 { close(fd) }
            self?.fd = -1
        }
        src.resume()
        source = src
    }

    func cancel() {
        source?.cancel()
        source = nil
    }

    deinit { cancel() }
}

// MARK: - FileTreePanel

struct FileTreePanel: View {
    @Environment(AppState.self) private var appState
    @State private var fileItems: [FileItem] = []
    @State private var expandedFolders: Set<URL> = []
    @State private var watcher = DirectoryWatcher()
    @State private var isNewProjectPresented = false
    @State private var newProjectName = ""

    // Rename dialog
    @State private var renamingItem: FileItem? = nil
    @State private var renameText = ""

    // New file/folder dialog
    @State private var isNewItemPresented = false
    @State private var newItemName = ""
    @State private var newItemIsFile = true
    @State private var newItemParent: URL? = nil

    var body: some View {
        let palette = appState.palette

        VStack(spacing: 0) {
            // ── Projects toolbar ──────────────────────────────────────
            HStack {
                Text("PROJECTS")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(palette.secondaryText)
                    .tracking(0.8)
                Spacer()
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
            .padding(.horizontal, 12)
            .frame(height: panelToolbarHeight)
            .background(palette.panelBackground)

            palette.border.frame(height: 1)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {

                    // ── Projects ──────────────────────────────────────
                    if appState.projects.isEmpty {
                        Text("No projects yet")
                            .font(.system(size: 13))
                            .foregroundStyle(palette.secondaryText.opacity(0.4))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                    } else {
                        ForEach(appState.projects) { project in
                            SidebarRow(
                                icon: "folder",
                                label: project.name,
                                isSelected: appState.selectedProject == project,
                                palette: palette
                            ) {
                                appState.selectedProject = project
                            }
                        }
                    }

                    Spacer().frame(height: 20)

                    // ── Files ─────────────────────────────────────────────
                    SidebarSectionHeader(title: "Files", palette: palette)

                    if fileItems.isEmpty {
                        Text(appState.selectedProject == nil ? "No project selected" : "Empty")
                            .font(.system(size: 13))
                            .foregroundStyle(palette.secondaryText.opacity(0.4))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                    } else {
                        ForEach(fileItems) { item in
                            FileTreeNode(
                                item: item,
                                depth: 0,
                                expandedFolders: $expandedFolders,
                                onRename: { renamingItem = $0; renameText = $0.name },
                                onNewItem: { parent, isFile in
                                    newItemParent = parent
                                    newItemIsFile = isFile
                                    newItemName = ""
                                    isNewItemPresented = true
                                },
                                onDelete: { item in
                                    try? FileManager.default.trashItem(at: item.url, resultingItemURL: nil)
                                    loadFiles()
                                }
                            )
                        }
                    }

                    Spacer().frame(height: 20)

                    // ── Ports ─────────────────────────────────────────────
                    SidebarSectionHeader(title: "Ports", palette: palette)

                    HStack(spacing: 10) {
                        Image(systemName: "circle.fill")
                            .font(.system(size: 7))
                            .foregroundStyle(appState.browserURL != nil ? Color.green : palette.secondaryText.opacity(0.4))
                        if let url = appState.browserURL {
                            Text("\(url.host ?? "localhost"):\(url.port.map(String.init) ?? "80")")
                                .font(.system(size: 13))
                                .foregroundStyle(palette.primaryText)
                        } else {
                            Text("No active server")
                                .font(.system(size: 13))
                                .foregroundStyle(palette.secondaryText)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 5)
                }
                .padding(.top, 8)
                .padding(.bottom, 16)
            }
        }
        .background(palette.sidebarBackground)
        .onChange(of: appState.selectedProject, initial: true) { _, project in
            expandedFolders = []
            loadFiles()
            if let url = project?.url {
                watcher.watch(url) { loadFiles() }
            } else {
                watcher.cancel()
            }
        }
        .onDisappear { watcher.cancel() }
        // Rename alert
        .alert("Rename", isPresented: Binding(
            get: { renamingItem != nil },
            set: { if !$0 { renamingItem = nil } }
        )) {
            TextField("Name", text: $renameText)
            Button("Rename") { performRename() }
            Button("Cancel", role: .cancel) { renamingItem = nil }
        }
        // New file/folder alert
        .alert(newItemIsFile ? "New File" : "New Folder", isPresented: $isNewItemPresented) {
            TextField("Name", text: $newItemName)
            Button("Create") { performCreate() }
            Button("Cancel", role: .cancel) {}
        }
        // New project sheet
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

    private func performRename() {
        guard let item = renamingItem, !renameText.isEmpty else { return }
        let dest = item.url.deletingLastPathComponent().appendingPathComponent(renameText)
        try? FileManager.default.moveItem(at: item.url, to: dest)
        renamingItem = nil
        loadFiles()
    }

    private func performCreate() {
        guard let parent = newItemParent, !newItemName.isEmpty else { return }
        let dest = parent.appendingPathComponent(newItemName)
        if newItemIsFile {
            FileManager.default.createFile(atPath: dest.path, contents: nil)
        } else {
            try? FileManager.default.createDirectory(at: dest, withIntermediateDirectories: true)
        }
        loadFiles()
    }
}

// MARK: - FileTreeNode

private struct FileTreeNode: View {
    @Environment(AppState.self) private var appState
    let item: FileItem
    let depth: Int
    @Binding var expandedFolders: Set<URL>
    let onRename: (FileItem) -> Void
    let onNewItem: (URL, Bool) -> Void
    let onDelete: (FileItem) -> Void

    private var isExpanded: Bool { expandedFolders.contains(item.url) }
    private var isSelected: Bool {
        !item.isDirectory && appState.activeCenterTab == .file(item.url)
    }
    private var isDirty: Bool {
        !item.isDirectory && appState.dirtyFiles.contains(item.url)
    }
    private var children: [FileItem] {
        guard item.isDirectory && isExpanded else { return [] }
        return FileItem.load(from: item.url)
    }

    var body: some View {
        let palette = appState.palette

        VStack(spacing: 0) {
            // Row
            Button {
                if item.isDirectory {
                    withAnimation(.easeInOut(duration: 0.15)) {
                        if isExpanded { expandedFolders.remove(item.url) }
                        else { expandedFolders.insert(item.url) }
                    }
                } else {
                    appState.openFile(item.url)
                }
            } label: {
                HStack(spacing: 0) {
                    // Indentation
                    Color.clear
                        .frame(width: max(0, CGFloat(depth) * 14 + 10))

                    // Chevron (directories) or spacer (files)
                    if item.isDirectory {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(palette.secondaryText.opacity(0.45))
                            .rotationEffect(.degrees(isExpanded ? 90 : 0))
                            .frame(width: 14, alignment: .center)
                    } else {
                        Color.clear.frame(width: 14)
                    }

                    // Icon
                    Image(systemName: item.isDirectory
                          ? (isExpanded ? "folder.fill" : "folder")
                          : item.sfSymbol())
                        .font(.system(size: 13))
                        .foregroundStyle(isSelected
                            ? palette.accent
                            : (item.isDirectory
                               ? palette.secondaryText.opacity(0.7)
                               : palette.secondaryText.opacity(0.6)))
                        .frame(width: 18, alignment: .center)

                    Spacer().frame(width: 6)

                    // Label
                    Text(item.name)
                        .font(.system(size: 13, weight: isSelected ? .medium : .regular))
                        .foregroundStyle(isSelected
                            ? palette.primaryText
                            : palette.secondaryText.opacity(0.85))
                        .lineLimit(1)

                    Spacer()

                    // Dirty dot
                    if isDirty {
                        Circle()
                            .fill(palette.accent.opacity(0.8))
                            .frame(width: 6, height: 6)
                            .padding(.trailing, 10)
                    }
                }
                .frame(height: 28)
                .frame(maxWidth: .infinity)
                .background(
                    Group {
                        if isSelected {
                            RoundedRectangle(cornerRadius: 5)
                                .fill(palette.isDark
                                      ? Color(white: 0.22)
                                      : Color(white: 0.0, opacity: 0.07))
                                .padding(.horizontal, 6)
                        }
                    }
                )
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .contextMenu { contextMenuItems }

            // Children
            if isExpanded {
                ForEach(children) { child in
                    FileTreeNode(
                        item: child,
                        depth: depth + 1,
                        expandedFolders: $expandedFolders,
                        onRename: onRename,
                        onNewItem: onNewItem,
                        onDelete: onDelete
                    )
                }
            }
        }
    }

    @ViewBuilder
    private var contextMenuItems: some View {
        Button("New File…") {
            let parent = item.isDirectory ? item.url : item.url.deletingLastPathComponent()
            onNewItem(parent, true)
        }
        Button("New Folder…") {
            let parent = item.isDirectory ? item.url : item.url.deletingLastPathComponent()
            onNewItem(parent, false)
        }

        Divider()

        Button("Reveal in Finder") {
            NSWorkspace.shared.activateFileViewerSelecting([item.url])
        }

        Divider()

        Button("Copy") {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.writeObjects([item.url as NSURL])
        }

        Divider()

        Button("Copy Path") {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(item.url.path, forType: .string)
        }
        Button("Copy Relative Path") {
            guard let projectURL = appState.selectedProject?.url else { return }
            let rel = String(item.url.path.dropFirst(projectURL.path.count + 1))
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(rel, forType: .string)
        }

        Divider()

        Button("Rename…") { onRename(item) }
        Button("Delete", role: .destructive) { onDelete(item) }
    }
}

// MARK: - SidebarSectionHeader

private struct SidebarSectionHeader<Trailing: View>: View {
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
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(palette.secondaryText.opacity(0.5))
            Spacer()
            trailing()
        }
        .padding(.horizontal, 12)
        .padding(.top, 4)
        .padding(.bottom, 2)
    }
}

extension SidebarSectionHeader where Trailing == EmptyView {
    init(title: String, palette: ColorPalette) {
        self.init(title: title, palette: palette, trailing: { EmptyView() })
    }
}

// MARK: - SidebarRow

private struct SidebarRow: View {
    let icon: String
    let label: String
    let isSelected: Bool
    let palette: ColorPalette
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(isSelected ? palette.primaryText : palette.secondaryText)
                    .frame(width: 18, alignment: .center)

                Text(label)
                    .font(.system(size: 13, weight: isSelected ? .medium : .regular))
                    .foregroundStyle(isSelected ? palette.primaryText : palette.secondaryText.opacity(0.85))
                    .lineLimit(1)

                Spacer()
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .frame(maxWidth: .infinity)
            .background(
                Group {
                    if isSelected {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(palette.isDark ? Color(white: 0.22) : Color(white: 0.0, opacity: 0.07))
                    }
                }
            )
            .padding(.horizontal, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
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
