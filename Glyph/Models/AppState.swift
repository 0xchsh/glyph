//
//  AppState.swift
//  Glyph
//

import SwiftUI

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
        didSet { browserURL = nil }
    }
    var browserURL: URL?
    var currentPalette: Palette = .obsidian

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
        AgentPreset(id: "shell",       displayName: "shell",  shellArgs: ["-l"]),
        AgentPreset(id: "claude",      displayName: "claude", shellArgs: ["-l", "-c", "claude; exec $SHELL -l"]),
        AgentPreset(id: "claude-yolo", displayName: "yolo",   shellArgs: ["-l", "-c", "claude --dangerously-skip-permissions; exec $SHELL -l"]),
    ]
}
