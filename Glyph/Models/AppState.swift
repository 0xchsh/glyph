//
//  AppState.swift
//  Glyph
//

import SwiftUI

// MARK: - Enums

enum CenterTab: Hashable {
    case preview
    case file(URL)
}

enum TerminalStatus: Equatable {
    case idle
    case busy
    case crashed
}

// MARK: - TerminalSession

struct TerminalSession: Identifiable {
    let id: UUID
    let projectURL: URL
    var preset: AgentPreset
    var restartID: Int = 0
    var status: TerminalStatus = .busy

    init(projectURL: URL, preset: AgentPreset) {
        self.id = UUID()
        self.projectURL = projectURL
        self.preset = preset
    }
}

// MARK: - AppState

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
            if let prev = oldValue {
                tabStateByProject[prev.url] = ProjectTabState(
                    openedFileURLs: openedFileURLs,
                    activeCenterTab: activeCenterTab,
                    browserURL: browserURL
                )
            }
            if let new = selectedProject, let saved = tabStateByProject[new.url] {
                openedFileURLs = saved.openedFileURLs
                activeCenterTab = saved.activeCenterTab
                browserURL = saved.browserURL
            } else {
                openedFileURLs = []
                activeCenterTab = .preview
                browserURL = nil
            }
            // Auto-spawn default shell if no sessions exist for this project
            if let new = selectedProject, sessionsByProject[new.url]?.isEmpty ?? true {
                addSession(preset: AgentPreset.defaults[0], for: new.url)
            }
        }
    }
    var browserURL: URL?
    var currentPalette: Palette = .obsidian
    var fileTreeRefreshToken: Int = 0

    var openedFileURLs: [URL] = []
    var activeCenterTab: CenterTab = .preview
    var dirtyFiles: Set<URL> = []

    private var tabStateByProject: [URL: ProjectTabState] = [:]
    private var sessionsByProject: [URL: [TerminalSession]] = [:]
    private var activeSessionIDByProject: [URL: UUID] = [:]
    private var portByProject: [URL: URL] = [:]

    // MARK: - File tab operations

    func markDirty(_ url: URL) { dirtyFiles.insert(url) }
    func markClean(_ url: URL) { dirtyFiles.remove(url) }

    func openFile(_ url: URL) {
        if !openedFileURLs.contains(url) { openedFileURLs.append(url) }
        activeCenterTab = .file(url)
    }

    func closeFile(_ url: URL) {
        guard let idx = openedFileURLs.firstIndex(of: url) else { return }
        openedFileURLs.remove(at: idx)
        dirtyFiles.remove(url)
        if activeCenterTab == .file(url) {
            activeCenterTab = openedFileURLs.isEmpty ? .preview : .file(openedFileURLs[min(idx, openedFileURLs.count - 1)])
        }
    }

    func closeOthers(except url: URL) {
        openedFileURLs.filter { $0 != url }.forEach { dirtyFiles.remove($0) }
        openedFileURLs = [url]
        activeCenterTab = .file(url)
    }

    func closeToRight(of url: URL) {
        guard let idx = openedFileURLs.firstIndex(of: url) else { return }
        openedFileURLs[(idx + 1)...].forEach { dirtyFiles.remove($0) }
        openedFileURLs = Array(openedFileURLs.prefix(through: idx))
        if case .file(let active) = activeCenterTab, !openedFileURLs.contains(active) {
            activeCenterTab = .file(url)
        }
    }

    // MARK: - Terminal sessions

    var allSessions: [TerminalSession] {
        // Stable order: sorted by project URL string then insertion order
        sessionsByProject.keys
            .sorted { $0.absoluteString < $1.absoluteString }
            .flatMap { sessionsByProject[$0] ?? [] }
    }

    func sessions(for projectURL: URL) -> [TerminalSession] {
        sessionsByProject[projectURL] ?? []
    }

    func activeSessionID(for projectURL: URL) -> UUID? {
        activeSessionIDByProject[projectURL]
    }

    @discardableResult
    func addSession(preset: AgentPreset, for projectURL: URL) -> UUID {
        let session = TerminalSession(projectURL: projectURL, preset: preset)
        let id = session.id
        sessionsByProject[projectURL, default: []].append(session)
        activeSessionIDByProject[projectURL] = id
        return id
    }

    func setActiveSession(_ id: UUID, for projectURL: URL) {
        activeSessionIDByProject[projectURL] = id
    }

    func closeSession(_ id: UUID) {
        for url in sessionsByProject.keys {
            guard let idx = sessionsByProject[url]?.firstIndex(where: { $0.id == id }) else { continue }
            sessionsByProject[url]?.remove(at: idx)
            if activeSessionIDByProject[url] == id {
                activeSessionIDByProject[url] = sessionsByProject[url]?.last?.id
            }
            return
        }
    }

    func restartSession(_ id: UUID) {
        for url in sessionsByProject.keys {
            guard let idx = sessionsByProject[url]?.firstIndex(where: { $0.id == id }) else { continue }
            sessionsByProject[url]?[idx].restartID += 1
            sessionsByProject[url]?[idx].status = .busy
            return
        }
    }

    func updateSessionStatus(_ id: UUID, status: TerminalStatus) {
        for url in sessionsByProject.keys {
            guard let idx = sessionsByProject[url]?.firstIndex(where: { $0.id == id }) else { continue }
            guard sessionsByProject[url]?[idx].status != status else { return }
            sessionsByProject[url]?[idx].status = status
            return
        }
    }

    func projectStatus(for projectURL: URL) -> TerminalStatus? {
        guard let sessions = sessionsByProject[projectURL], !sessions.isEmpty else { return nil }
        if sessions.contains(where: { $0.status == .busy || $0.status == .crashed }) { return .busy }
        return .idle
    }

    // MARK: - Port (single per project)

    func port(for projectURL: URL) -> URL? {
        portByProject[projectURL]
    }

    func setPort(_ url: URL, for projectURL: URL) {
        portByProject[projectURL] = url
    }

    // MARK: - Refresh

    func refreshProject(_ projectURL: URL) {
        // Clear port
        portByProject[projectURL] = nil
        // Clear browser URL
        if selectedProject?.url == projectURL {
            browserURL = nil
        } else {
            tabStateByProject[projectURL]?.browserURL = nil
        }
        // Restart all sessions
        for i in sessionsByProject[projectURL]?.indices ?? [].indices {
            sessionsByProject[projectURL]?[i].restartID += 1
            sessionsByProject[projectURL]?[i].status = .busy
        }
        // Trigger file tree rescan
        fileTreeRefreshToken += 1
    }

    // MARK: - Theme

    var palette: ColorPalette {
        ColorPalette.make(currentPalette)
    }

    // MARK: - Init & project scanning

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

// MARK: - Supporting types

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
