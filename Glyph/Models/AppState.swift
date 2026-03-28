//
//  AppState.swift
//  Glyph
//

import SwiftUI

// MARK: - Enums

enum CenterTab: Hashable {
    case preview
    case file(URL)
    case settings
}

enum ViewMode {
    case editor
    case canvas
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
    private enum DefaultsKey {
        static let rootDirectoryPath = "rootDirectoryPath"
        static let currentPalette = "currentPalette"
        static let autoOpenBrowserPreview = "autoOpenBrowserPreview"
        static let defaultPresetID = "defaultPresetID"
        static let savedProjects = "savedProjects"
    }

    var rootDirectory: URL? {
        didSet {
            if let url = rootDirectory {
                UserDefaults.standard.set(url.path, forKey: DefaultsKey.rootDirectoryPath)
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
                addSession(preset: defaultPreset, for: new.url)
            }
        }
    }
    var browserURL: URL?
    var currentPalette: Palette = .obsidian {
        didSet {
            UserDefaults.standard.set(currentPalette.rawValue, forKey: DefaultsKey.currentPalette)
        }
    }
    var fileTreeRefreshToken: Int = 0
    var autoOpenBrowserPreview: Bool = true {
        didSet {
            UserDefaults.standard.set(autoOpenBrowserPreview, forKey: DefaultsKey.autoOpenBrowserPreview)
        }
    }
    var defaultPresetID: String = AgentPreset.defaults[0].id {
        didSet {
            UserDefaults.standard.set(defaultPresetID, forKey: DefaultsKey.defaultPresetID)
        }
    }

    var openedFileURLs: [URL] = []
    var activeCenterTab: CenterTab = .preview
    var dirtyFiles: Set<URL> = []
    var fontSize: CGFloat = 13
    var showBrowser: Bool = false

    // MARK: - Canvas View
    var activeViewMode: ViewMode = .editor
    var discoveredRoutes: [DiscoveredRoute] = []
    var isDiscoveringRoutes: Bool = false
    var canvasSelectedRouteID: UUID? = nil
    let snapshotService = SnapshotService()

    private var tabStateByProject: [URL: ProjectTabState] = [:]
    private var sessionsByProject: [URL: [TerminalSession]] = [:]
    private var activeSessionIDByProject: [URL: UUID] = [:]
    private var portByProject: [URL: URL] = [:]
    var faviconByProject: [URL: NSImage] = [:]

    var defaultPreset: AgentPreset {
        AgentPreset.defaults.first(where: { $0.id == defaultPresetID }) ?? AgentPreset.defaults[0]
    }

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
        // Start snapshot capture now that the server is up
        if selectedProject?.url == projectURL, !discoveredRoutes.isEmpty {
            snapshotService.clearSnapshots()
            snapshotService.captureAll(routes: discoveredRoutes, serverURL: url)
        }
        fetchFavicon(serverURL: url, for: projectURL)
    }

    private func fetchFavicon(serverURL: URL, for projectURL: URL) {
        // Try /favicon.ico first, then fall back to parsing <link rel="icon">
        let icoURL = serverURL.appendingPathComponent("favicon.ico")
        URLSession.shared.dataTask(with: icoURL) { [weak self] data, response, _ in
            if let data, !data.isEmpty,
               let http = response as? HTTPURLResponse, http.statusCode == 200,
               let img = NSImage(data: data) {
                DispatchQueue.main.async { self?.faviconByProject[projectURL] = img }
                return
            }
            // Fall back: fetch root HTML and look for <link rel="icon" href="...">
            URLSession.shared.dataTask(with: serverURL) { [weak self] data, _, _ in
                guard let data,
                      let html = String(data: data, encoding: .utf8) else { return }
                let pattern = #"<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']"#
                guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
                      let match = regex.firstMatch(in: html, range: NSRange(html.startIndex..., in: html)),
                      let hrefRange = Range(match.range(at: 1), in: html) else { return }
                var href = String(html[hrefRange])
                if href.hasPrefix("//") { href = "https:" + href }
                else if href.hasPrefix("/") { href = serverURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + href }
                guard let faviconURL = URL(string: href) else { return }
                URLSession.shared.dataTask(with: faviconURL) { [weak self] data, _, _ in
                    if let data, !data.isEmpty, let img = NSImage(data: data) {
                        DispatchQueue.main.async { self?.faviconByProject[projectURL] = img }
                    }
                }.resume()
            }.resume()
        }.resume()
    }

    // MARK: - Canvas route discovery

    func discoverRoutes() {
        guard let project = selectedProject else {
            discoveredRoutes = []
            return
        }
        isDiscoveringRoutes = true
        canvasSelectedRouteID = nil
        let projectURL = project.url
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let resolver = FrameworkDetector.detect(projectRoot: projectURL)
            let routes = (try? resolver?.resolve(projectRoot: projectURL)) ?? []
            DispatchQueue.main.async {
                self?.discoveredRoutes = routes
                self?.isDiscoveringRoutes = false
                // Kick off snapshot capture if dev server is already running
                if let self, let serverURL = self.port(for: projectURL), !routes.isEmpty {
                    self.snapshotService.clearSnapshots()
                    self.snapshotService.captureAll(routes: routes, serverURL: serverURL)
                }
            }
        }
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

    // MARK: - Git

    enum GitOpState: Equatable {
        case idle
        case running
        case success
        case failed(String)
    }

    var gitOpState: GitOpState = .idle

    func commitAndPush(message: String, projectURL: URL) {
        guard gitOpState != .running else { return }
        gitOpState = .running
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            do {
                try self?.runGit(["-C", projectURL.path, "add", "-A"])
                try self?.runGit(["-C", projectURL.path, "commit", "-m", message])
                try self?.runGit(["-C", projectURL.path, "push"])
                DispatchQueue.main.async { self?.gitOpState = .success }
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    if self?.gitOpState == .success { self?.gitOpState = .idle }
                }
            } catch GitError.failed(let output) {
                DispatchQueue.main.async { self?.gitOpState = .failed(output) }
            } catch {
                DispatchQueue.main.async { self?.gitOpState = .failed(error.localizedDescription) }
            }
        }
    }

    private func runGit(_ args: [String]) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        process.arguments = args
        process.environment = ProcessInfo.processInfo.environment
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        try process.run()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            let output = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? "unknown error"
            throw GitError.failed(output)
        }
    }

    enum GitError: Error {
        case failed(String)
    }

    // MARK: - Theme

    var palette: ColorPalette {
        ColorPalette.make(currentPalette)
    }

    // MARK: - Init & project scanning

    init() {
        let defaults = UserDefaults.standard

        if let rawPalette = defaults.string(forKey: DefaultsKey.currentPalette),
           let palette = Palette(rawValue: rawPalette) {
            currentPalette = palette
        }
        if defaults.object(forKey: DefaultsKey.autoOpenBrowserPreview) != nil {
            autoOpenBrowserPreview = defaults.bool(forKey: DefaultsKey.autoOpenBrowserPreview)
        }
        if let savedDefaultPresetID = defaults.string(forKey: DefaultsKey.defaultPresetID),
           AgentPreset.defaults.contains(where: { $0.id == savedDefaultPresetID }) {
            defaultPresetID = savedDefaultPresetID
        }

        if let path = defaults.string(forKey: DefaultsKey.rootDirectoryPath),
           FileManager.default.fileExists(atPath: path) {
            rootDirectory = URL(fileURLWithPath: path)
            scanForProjects()
        }
    }

    func scanForProjects() {
        let saved = loadCustomProjects()
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        projects = saved

        if selectedProject == nil || !projects.contains(where: { $0.url == selectedProject?.url }) {
            selectedProject = projects.first
        }
    }

    func createProject(name: String, path: URL) throws {
        let fm = FileManager.default
        if !fm.fileExists(atPath: path.path) {
            try fm.createDirectory(at: path, withIntermediateDirectories: true)
        }
        let displayName = name.isEmpty ? path.lastPathComponent : name
        let project = Project(name: displayName, url: path)
        if !projects.contains(where: { $0.url == path }) {
            projects.append(project)
            projects.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        }
        saveCustomProjects()
        selectedProject = projects.first { $0.url == path }
    }

    func removeProject(_ url: URL) {
        projects.removeAll { $0.url == url }
        if selectedProject?.url == url {
            selectedProject = projects.first
        }
        saveCustomProjects()
    }

    func addExistingFolder(_ url: URL) {
        let project = Project(name: url.lastPathComponent, url: url)
        if !projects.contains(where: { $0.url == url }) {
            projects.append(project)
            projects.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            saveCustomProjects()
        }
        selectedProject = projects.first { $0.url == url }
    }

    private func saveCustomProjects() {
        let data = projects.map { ["name": $0.name, "url": $0.url.path] }
        UserDefaults.standard.set(data, forKey: DefaultsKey.savedProjects)
    }

    private func loadCustomProjects() -> [Project] {
        guard let data = UserDefaults.standard.array(forKey: DefaultsKey.savedProjects) as? [[String: String]] else { return [] }
        return data.compactMap { dict in
            guard let name = dict["name"], let urlPath = dict["url"] else { return nil }
            return Project(name: name, url: URL(fileURLWithPath: urlPath))
        }
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
