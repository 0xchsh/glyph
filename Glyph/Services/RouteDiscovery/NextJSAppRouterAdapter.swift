//
//  NextJSAppRouterAdapter.swift
//  Glyph
//

import Foundation

struct NextJSAppRouterAdapter: RouteResolver {

    static func canResolve(projectRoot: URL) -> Bool {
        FileManager.default.fileExists(atPath: projectRoot.appendingPathComponent("app").path)
    }

    func resolve(projectRoot: URL) throws -> [DiscoveredRoute] {
        // Support both root-level app/ and src/app/ layouts
        let srcApp = projectRoot.appendingPathComponent("src/app")
        let appDir = FileManager.default.fileExists(atPath: srcApp.path)
            ? srcApp
            : projectRoot.appendingPathComponent("app")
        let pageNames: Set<String> = ["page.tsx", "page.jsx", "page.ts", "page.js"]
        var routes: [DiscoveredRoute] = []

        guard let enumerator = FileManager.default.enumerator(
            at: appDir,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else { return [] }

        for case let fileURL as URL in enumerator {
            guard pageNames.contains(fileURL.lastPathComponent) else { continue }

            // Path of the file's directory relative to app/
            let relDir = String(
                fileURL.deletingLastPathComponent().path.dropFirst(appDir.path.count)
            )

            // Split into individual segments
            let segments = relDir
                .split(separator: "/", omittingEmptySubsequences: true)
                .map(String.init)

            // Skip api routes and _private directories
            let shouldSkip = segments.contains { $0 == "api" || $0.hasPrefix("_") }
            if shouldSkip { continue }

            // Skip parallel routes (@segment)
            if segments.contains(where: { $0.hasPrefix("@") }) { continue }

            // Strip route groups: segments wrapped in (parentheses) don't appear in URLs
            let routeSegments = segments.filter { !(($0.hasPrefix("(")) && $0.hasSuffix(")")) }

            let routePath = routeSegments.isEmpty ? "/" : "/" + routeSegments.joined(separator: "/")
            let isDynamic = routePath.contains("[")

            routes.append(DiscoveredRoute(
                path: routePath,
                sourceFile: fileURL,
                isDynamic: isDynamic,
                framework: .nextjsApp
            ))
        }

        // Deduplicate by path (parallel layouts can produce duplicates)
        var seen = Set<String>()
        let unique = routes.filter { seen.insert($0.path).inserted }

        return unique.sorted { $0.path < $1.path }
    }
}
