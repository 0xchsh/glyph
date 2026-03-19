//
//  AppState.swift
//  Glyph
//

import SwiftUI

enum CenterTab: Hashable {
    case preview
    case file(URL)
}

@Observable
class AppState {
    var rootDirectory: URL? {
        didSet {
            if let url = rootDirectory {
                UserDefaults.standard.set(url.path, forKey: "rootDirectoryPath")
            }
        }
    }
    var projects: [Project] = []
    var selectedProject: Project? {
        didSet {
            // Save current tab state for the previous project
            if let prev = oldValue {
                tabStateByProject[prev.url] = ProjectTabState(
                    openedFileURLs: openedFileURLs,
                    activeCenterTab: activeCenterTab,
                    browserURL: browserURL
                )
            }
            // Restore saved state for the newly selected project
            if let new = selectedProject,
               let saved = tabStateByProject[new.url] {
                openedFileURLs = saved.openedFileURLs
                activeCenterTab = saved.activeCenterTab
                browserURL = saved.browserURL
            } else {
                openedFileURLs = []
                activeCenterTab = .preview
                browserURL = nil
            }
        }
    }
    var browserURL: URL?
    var currentPalette: Palette = .obsidian

    var openedFileURLs: [URL] = []
    var activeCenterTab: CenterTab = .preview
    var dirtyFiles: Set<URL> = []
    private var tabStateByProject: [URL: ProjectTabState] = [:]

    func markDirty(_ url: URL) { dirtyFiles.insert(url) }
    func markClean(_ url: URL) { dirtyFiles.remove(url) }

    func openFile(_ url: URL) {
        if !openedFileURLs.contains(url) {
            openedFileURLs.append(url)
        }
        activeCenterTab = .file(url)
    }

    func closeFile(_ url: URL) {
        guard let idx = openedFileURLs.firstIndex(of: url) else { return }
        openedFileURLs.remove(at: idx)
        dirtyFiles.remove(url)
        if activeCenterTab == .file(url) {
            if openedFileURLs.isEmpty {
                activeCenterTab = .preview
            } else {
                let newIdx = min(idx, openedFileURLs.count - 1)
                activeCenterTab = .file(openedFileURLs[newIdx])
            }
        }
    }

    func closeOthers(except url: URL) {
        let others = openedFileURLs.filter { $0 != url }
        others.forEach { dirtyFiles.remove($0) }
        openedFileURLs = [url]
        activeCenterTab = .file(url)
    }

    func closeToRight(of url: URL) {
        guard let idx = openedFileURLs.firstIndex(of: url) else { return }
        let toRemove = openedFileURLs[(idx + 1)...]
        toRemove.forEach { dirtyFiles.remove($0) }
        openedFileURLs = Array(openedFileURLs.prefix(through: idx))
        if case .file(let active) = activeCenterTab, !openedFileURLs.contains(active) {
            activeCenterTab = .file(url)
        }
    }

    var palette: ColorPalette {
        ColorPalette.make(currentPalette)
    }

    init() {
        if let path = UserDefaults.standard.string(forKey: "rootDirectoryPath"),
           FileManager.default.fileExists(atPath: path) {
            rootDirectory = URL(fileURLWithPath: path)
            scanForProjects()
        }
    }

    func scanForProjects() {
        guard let root = rootDirectory else { return }
        let fm = FileManager.default
        guard let contents = try? fm.contentsOfDirectory(
            at: root,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else { return }

        let discovered = contents
            .filter { (try? $0.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true }
            .sorted { $0.lastPathComponent.localizedCaseInsensitiveCompare($1.lastPathComponent) == .orderedAscending }
            .map { Project(name: $0.lastPathComponent, url: $0) }

        projects = discovered

        // Keep selection if it still exists, otherwise select first
        if selectedProject == nil || !projects.contains(where: { $0.url == selectedProject?.url }) {
            selectedProject = projects.first
        }
    }

    func createProject(name: String) throws {
        guard let root = rootDirectory else { return }
        let projectURL = root.appendingPathComponent(name)
        try FileManager.default.createDirectory(at: projectURL, withIntermediateDirectories: true)
        scanForProjects()
        selectedProject = projects.first { $0.url == projectURL }
    }
}

private struct ProjectTabState {
    var openedFileURLs: [URL]
    var activeCenterTab: CenterTab
    var browserURL: URL?
}

struct Project: Identifiable, Hashable {
    var id: URL { url }
    let name: String
    let url: URL
    var detectedPort: Int?

    func hash(into hasher: inout Hasher) { hasher.combine(url) }
    static func == (lhs: Project, rhs: Project) -> Bool { lhs.url == rhs.url }
}

struct AgentPreset: Identifiable {
    let id: String
    let displayName: String
    let shellArgs: [String]

    static let defaults: [AgentPreset] = [
        AgentPreset(id: "shell",       displayName: "shell",        shellArgs: ["-l"]),
        AgentPreset(id: "claude",      displayName: "claude",       shellArgs: ["-l", "-c", "claude; exec $SHELL -l"]),
        AgentPreset(id: "claude-yolo", displayName: "claude --yolo",shellArgs: ["-l", "-c", "claude --dangerously-skip-permissions; exec $SHELL -l"]),
        AgentPreset(id: "gemini",      displayName: "gemini",       shellArgs: ["-l", "-c", "gemini; exec $SHELL -l"]),
        AgentPreset(id: "codex",       displayName: "codex",        shellArgs: ["-l", "-c", "codex; exec $SHELL -l"]),
    ]
}
