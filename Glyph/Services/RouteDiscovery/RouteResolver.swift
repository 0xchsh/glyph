//
//  RouteResolver.swift
//  Glyph
//

import Foundation

// MARK: - Framework

enum Framework: String, CaseIterable {
    case nextjsApp    = "Next.js App Router"
    case nextjsPages  = "Next.js Pages Router"
    case reactRouter  = "React Router"
    case html         = "HTML"

    var shortName: String {
        switch self {
        case .nextjsApp:    return "App"
        case .nextjsPages:  return "Pages"
        case .reactRouter:  return "React"
        case .html:         return "HTML"
        }
    }
}

// MARK: - DiscoveredRoute

struct DiscoveredRoute: Identifiable {
    let id: UUID
    let path: String
    let sourceFile: URL
    let isDynamic: Bool
    let framework: Framework

    init(path: String, sourceFile: URL, isDynamic: Bool, framework: Framework) {
        self.id = UUID()
        self.path = path
        self.sourceFile = sourceFile
        self.isDynamic = isDynamic
        self.framework = framework
    }

    /// Short display label for the tile (last path segment, or "Home" for /)
    var displayName: String {
        if path == "/" { return "Home" }
        return path.split(separator: "/").last.map(String.init) ?? path
    }

    /// Number of path segments (depth in the route tree)
    var depth: Int {
        path == "/" ? 0 : path.split(separator: "/").count
    }
}

// MARK: - RouteResolver protocol

protocol RouteResolver {
    /// Returns true if this resolver can handle the given project root
    static func canResolve(projectRoot: URL) -> Bool

    /// Scans the project and returns all discovered routes, sorted by path
    func resolve(projectRoot: URL) throws -> [DiscoveredRoute]
}
