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
            // ── Projects header ────────────────────────────────────────
            HStack(alignment: .center, spacing: 4) {
                Text("Projects")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(palette.primaryText)

                Spacer()

                Menu {
                    Button {
                        openExistingFolder()
                    } label: {
                        Label("Open Folder", systemImage: "folder")
                    }
                    Button {
                        isNewProjectPresented = true
                    } label: {
                        Label("New Project", systemImage: "plus.square")
                    }
                } label: {
                    Image(systemName: "folder.badge.plus")
                        .font(.system(size: 12))
                        .foregroundStyle(palette.secondaryText.opacity(0.55))
                        .frame(width: 28, height: 28)
                        .contentShape(Rectangle())
                }
                .menuStyle(.borderlessButton)
                .menuIndicator(.hidden)
                .fixedSize()
                .help("Add project")

                Button {
                    appState.activeCenterTab = .settings
                    appState.activeViewMode = .editor
                } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 12))
                        .foregroundStyle(appState.activeCenterTab == .settings
                            ? palette.primaryText
                            : palette.secondaryText.opacity(0.55))
                        .frame(width: 28, height: 28)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help("Settings")
            }
            .padding(.horizontal, 12)
            .padding(.top, 8)
            .padding(.bottom, 12)
            .background(palette.sidebarBackground)

            ScrollView {
                sidebarContent(palette: palette)
                    .padding(.top, 8)
                    .padding(.bottom, 16)
            }
            .scrollIndicators(.hidden)
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
        .onChange(of: appState.fileTreeRefreshToken) { _, _ in loadFiles() }
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
            NewProjectSheet(isPresented: $isNewProjectPresented) { name, path in
                try appState.createProject(name: name, path: path)
            }
            .environment(appState)
        }
    }

    @ViewBuilder
    private func sidebarContent(palette: ColorPalette) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Projects
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
                        favicon: appState.faviconByProject[project.url],
                        label: project.name,
                        isSelected: appState.selectedProject == project,
                        palette: palette,
                        action: { appState.selectedProject = project },
                        status: appState.projectStatus(for: project.url),
                        largeIcon: true,
                        onRefresh: { appState.refreshProject(project.url) },
                        onRemove: { appState.removeProject(project.url) }
                    )
                }
            }

            Spacer().frame(height: 4)

            if appState.activeViewMode == .canvas {
                SidebarSectionHeader(
                    title: "Routes",
                    palette: palette,
                    trailing: {
                        Button {
                            appState.discoverRoutes()
                        } label: {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 10))
                                .foregroundStyle(palette.secondaryText.opacity(0.4))
                        }
                        .buttonStyle(.plain)
                        .help("Re-scan routes")
                    }
                )
                routesSection(palette: palette)
            } else {
                SidebarSectionHeader(title: "Files", palette: palette)
                fileSection(palette: palette)

                Spacer().frame(height: 12)

                SidebarSectionHeader(title: "Ports", palette: palette)
                portsSection(palette: palette)
            }
        }
    }

    @ViewBuilder
    private func fileSection(palette: ColorPalette) -> some View {
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
    }

    @ViewBuilder
    private func portsSection(palette: ColorPalette) -> some View {
        let currentPort = appState.port(for: appState.selectedProject?.url ?? URL(fileURLWithPath: "/"))
        HStack(spacing: 10) {
            Image(systemName: "circle.fill")
                .font(.system(size: 7))
                .foregroundStyle(currentPort != nil ? Color.green : palette.secondaryText.opacity(0.4))
            if let port = currentPort {
                Button {
                    appState.browserURL = port
                    appState.activeCenterTab = .preview
                } label: {
                    Text(":\(port.port.map(String.init) ?? "80")")
                        .font(.system(size: 13))
                        .foregroundStyle(palette.primaryText)
                }
                .buttonStyle(.plain)
            } else {
                Text("No active server")
                    .font(.system(size: 13))
                    .foregroundStyle(palette.secondaryText)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 5)
    }

    // MARK: - View mode switcher

    @ViewBuilder
    private func viewModeSwitcher(palette: ColorPalette) -> some View {
        HStack(spacing: 4) {
            ViewModeButton(
                label: "Editor",
                isActive: appState.activeViewMode == .editor,
                palette: palette
            ) {
                appState.activeViewMode = .editor
            }

            ViewModeButton(
                label: "Canvas",
                isActive: appState.activeViewMode == .canvas,
                palette: palette
            ) {
                appState.activeViewMode = .canvas
                if appState.discoveredRoutes.isEmpty {
                    appState.discoverRoutes()
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(palette.sidebarBackground)

        Color(NSColor.separatorColor).opacity(0.5).frame(height: 1)
    }

    // MARK: - Canvas routes section

    @ViewBuilder
    private func routesSection(palette: ColorPalette) -> some View {
        if appState.isDiscoveringRoutes {
            HStack(spacing: 8) {
                Dots3Spinner(size: 13, color: palette.secondaryText.opacity(0.85))
                Text("Scanning…")
                    .font(.system(size: 12))
                    .foregroundStyle(palette.secondaryText.opacity(0.4))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
        } else if appState.discoveredRoutes.isEmpty {
            Text("No routes found")
                .font(.system(size: 12))
                .foregroundStyle(palette.secondaryText.opacity(0.35))
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
        } else {
            ForEach(appState.discoveredRoutes) { route in
                Button {
                    appState.canvasSelectedRouteID = route.id
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: route.isDynamic ? "bolt" : "doc.text")
                            .font(.system(size: 11))
                            .foregroundStyle(
                                appState.canvasSelectedRouteID == route.id
                                    ? palette.accent
                                    : palette.secondaryText.opacity(0.55)
                            )
                            .frame(width: 16, alignment: .center)

                        Text(route.path)
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(
                                appState.canvasSelectedRouteID == route.id
                                    ? palette.primaryText
                                    : palette.secondaryText.opacity(0.8)
                            )
                            .lineLimit(1)

                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 5)
                    .background(
                        Group {
                            if appState.canvasSelectedRouteID == route.id {
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
            }
        }
    }

    private func openExistingFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = false
        panel.prompt = "Open"
        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            appState.addExistingFolder(url)
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

    @State private var isHovered = false

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
        let active = isSelected || isHovered

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
                            .foregroundStyle(palette.secondaryText.opacity(active ? 0.8 : 0.5))
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
                            ? palette.primaryText
                            : palette.secondaryText.opacity(isHovered ? 0.95 : 0.7))
                        .frame(width: 18, alignment: .center)

                    Spacer().frame(width: 6)

                    // Label
                    Text(item.name)
                        .font(.system(size: 13, weight: isSelected ? .medium : .regular))
                        .foregroundStyle(isSelected
                            ? palette.primaryText
                            : palette.secondaryText.opacity(isHovered ? 1.0 : 0.85))
                        .lineLimit(1)

                    Spacer()

                    // Dirty dot
                    if isDirty {
                        Circle()
                            .fill(palette.secondaryText.opacity(0.5))
                            .frame(width: 5, height: 5)
                            .padding(.trailing, 10)
                    }
                }
                .frame(height: 36)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 5)
                        .fill(isSelected
                            ? (palette.isDark ? Color(white: 0.22) : Color(white: 0.0, opacity: 0.07))
                            : isHovered
                                ? (palette.isDark ? Color(white: 0.16) : Color(white: 0.0, opacity: 0.04))
                                : Color.clear)
                        .padding(.horizontal, 6)
                        .animation(.easeInOut(duration: 0.1), value: isHovered)
                )
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .onHover { isHovered = $0 }
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

// MARK: - ViewModeButton

private struct ViewModeButton: View {
    let label: String
    let isActive: Bool
    let palette: ColorPalette
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 12, weight: isActive ? .semibold : .regular))
                .foregroundStyle(isActive ? palette.primaryText : palette.secondaryText.opacity(0.45))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(isActive
                              ? (palette.isDark ? Color(white: 0.18) : Color(white: 0.0, opacity: 0.08))
                              : Color.clear)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
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
                .foregroundStyle(palette.secondaryText.opacity(0.6))
                .tracking(0.2)
            Spacer()
            trailing()
        }
        .padding(.horizontal, 12)
        .padding(.top, 10)
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
    var favicon: NSImage? = nil
    let label: String
    let isSelected: Bool
    let palette: ColorPalette
    let action: () -> Void
    var status: TerminalStatus? = nil
    var largeIcon: Bool = false
    var onRefresh: (() -> Void)? = nil
    var onRemove: (() -> Void)? = nil

    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: largeIcon ? 10 : 8) {
                if largeIcon {
                    // Large project icon: favicon or letter avatar
                    if let favicon {
                        Image(nsImage: favicon)
                            .resizable()
                            .interpolation(.high)
                            .scaledToFit()
                            .frame(width: 36, height: 36)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    } else {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(palette.isDark ? Color(white: 0.22) : Color(white: 0.88))
                            .frame(width: 36, height: 36)
                            .overlay(
                                Text(String(label.prefix(1)).uppercased())
                                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                                    .foregroundStyle(palette.secondaryText.opacity(0.7))
                            )
                    }
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 13))
                        .foregroundStyle(isSelected
                            ? palette.primaryText
                            : palette.secondaryText.opacity(isHovered ? 0.95 : 0.7))
                        .frame(width: 16, alignment: .center)
                }

                Text(label)
                    .font(.system(size: largeIcon ? 13 : 13, weight: isSelected ? .medium : .regular))
                    .foregroundStyle(isSelected
                        ? palette.primaryText
                        : palette.secondaryText.opacity(isHovered ? 1.0 : 0.85))
                    .lineLimit(1)

                Spacer()

                // Status indicator
                switch status {
                case .idle:
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                        .padding(.trailing, 4)
                case .busy, .crashed:
                    Dots3Spinner(size: 13, color: palette.secondaryText.opacity(0.85))
                        .padding(.trailing, 4)
                case .none:
                    EmptyView()
                }
            }
            .padding(.horizontal, 10)
            .frame(height: largeIcon ? 52 : 40)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(isSelected
                        ? (palette.isDark ? Color(white: 0.22) : Color(white: 0.0, opacity: 0.07))
                        : isHovered
                            ? (palette.isDark ? Color(white: 0.16) : Color(white: 0.0, opacity: 0.04))
                            : Color.clear)
                    .animation(.easeInOut(duration: 0.1), value: isHovered)
            )
            .padding(.horizontal, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
        .contextMenu {
            if let onRefresh {
                Button("Refresh") { onRefresh() }
            }
            if let onRemove {
                Button("Remove from Sidebar") { onRemove() }
            }
        }
    }
}

// MARK: - NewProjectSheet

private struct ProjectTemplate: Identifiable {
    let id = UUID()
    let icon: String          // SF Symbol name
    let name: String
    let description: String
    let isNew: Bool
}

private let projectTemplates: [ProjectTemplate] = [
    ProjectTemplate(icon: "doc.badge.plus", name: "Empty", description: "Start from scratch", isNew: false),
    ProjectTemplate(icon: "swift", name: "SwiftUI", description: "macOS / iOS app", isNew: false),
    ProjectTemplate(icon: "globe", name: "Next.js", description: "TS, Tailwind, App Router", isNew: true),
]

private struct NewProjectSheet: View {
    @Binding var isPresented: Bool
    @Environment(AppState.self) private var appState
    let onCreate: (String, URL) throws -> Void

    @State private var projectName = ""
    @State private var projectPath = ""
    @State private var errorMessage: String?
    @State private var selectedTemplate: UUID? = projectTemplates.first?.id

    var body: some View {
        let palette = appState.palette
        let canCreate = !projectPath.trimmingCharacters(in: .whitespaces).isEmpty
            && !projectName.trimmingCharacters(in: .whitespaces).isEmpty

        VStack(alignment: .leading, spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 4) {
                Text("Quick start")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(palette.primaryText)
                Text("Glyph will create a new project folder for you.")
                    .font(.system(size: 13))
                    .foregroundStyle(palette.secondaryText)
            }
            .padding(.bottom, 24)

            // Name field
            VStack(alignment: .leading, spacing: 8) {
                Text("Name")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(palette.secondaryText)
                TextField("my-project", text: $projectName)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13, design: .monospaced))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(palette.appBackground, in: RoundedRectangle(cornerRadius: 7))
                    .foregroundStyle(palette.primaryText)
                    .onSubmit { submit() }
            }
            .padding(.bottom, 16)

            // Location field
            VStack(alignment: .leading, spacing: 8) {
                Text("Location")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(palette.secondaryText)
                HStack(spacing: 8) {
                    TextField("/path/to/project", text: $projectPath)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13, design: .monospaced))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(palette.appBackground, in: RoundedRectangle(cornerRadius: 7))
                        .foregroundStyle(palette.primaryText)
                        .onSubmit { submit() }
                    Button {
                        browsePath(palette: palette)
                    } label: {
                        Text("Browse...")
                            .font(.system(size: 13))
                            .foregroundStyle(palette.primaryText)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(palette.appBackground, in: RoundedRectangle(cornerRadius: 7))
                    }
                    .buttonStyle(.plain)
                    .help("Choose folder")
                }
            }
            .padding(.bottom, 20)

            // Template picker
            VStack(alignment: .leading, spacing: 10) {
                Text("Template")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(palette.secondaryText)
                HStack(spacing: 10) {
                    ForEach(projectTemplates) { template in
                        TemplateCard(
                            template: template,
                            isSelected: selectedTemplate == template.id,
                            palette: palette
                        )
                        .onTapGesture { selectedTemplate = template.id }
                    }
                    Spacer()
                }
            }
            .padding(.bottom, 24)

            if let error = errorMessage {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundStyle(.red)
                    .padding(.bottom, 12)
            }

            // Footer
            HStack {
                Spacer()
                Button("Create") { submit() }
                    .keyboardShortcut(.defaultAction)
                    .disabled(!canCreate)
                    .buttonStyle(CreateButtonStyle(palette: palette, isEnabled: canCreate))
            }
        }
        .padding(24)
        .frame(width: 500)
        .background(palette.panelBackground)
    }

    private func browsePath(palette: ColorPalette) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.prompt = "Select"
        panel.begin { response in
            guard response == .OK, let url = panel.url else { return }
            projectPath = url.path
        }
    }

    private func submit() {
        let path = projectPath.trimmingCharacters(in: .whitespaces)
        let name = projectName.trimmingCharacters(in: .whitespaces)
        guard !path.isEmpty, !name.isEmpty else { return }
        let url = URL(fileURLWithPath: path).appendingPathComponent(name)
        do {
            try onCreate(name, url)
            isPresented = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct TemplateCard: View {
    let template: ProjectTemplate
    let isSelected: Bool
    let palette: ColorPalette

    var body: some View {
        ZStack(alignment: .topTrailing) {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(palette.panelBackground)
                        .frame(width: 44, height: 44)
                    Image(systemName: template.icon)
                        .font(.system(size: 20))
                        .foregroundStyle(palette.primaryText)
                }
                Text(template.name)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(palette.primaryText)
                Text(template.description)
                    .font(.system(size: 11))
                    .foregroundStyle(palette.secondaryText)
                    .multilineTextAlignment(.center)
            }
            .frame(width: 130, height: 110)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isSelected
                          ? (palette.isDark ? Color(white: 0.22) : Color(white: 0.88))
                          : palette.appBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(
                        isSelected ? palette.accent.opacity(0.6) : Color.clear,
                        lineWidth: 1.5
                    )
            )

            if template.isNew {
                Text("NEW")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Color.orange, in: RoundedRectangle(cornerRadius: 4))
                    .offset(x: -6, y: 6)
            }
        }
    }
}

private struct CreateButtonStyle: ButtonStyle {
    let palette: ColorPalette
    let isEnabled: Bool

    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            configuration.label
                .font(.system(size: 13, weight: .medium))
            Text("⌘↩")
                .font(.system(size: 11))
                .opacity(0.6)
        }
        .foregroundStyle(palette.isDark ? Color.black : Color.white)
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isEnabled
                      ? (palette.isDark ? Color.white : Color.black)
                      : (palette.isDark ? Color(white: 0.4) : Color(white: 0.6)))
        )
        .opacity(configuration.isPressed ? 0.85 : 1)
    }
}
