//
//  NextJSPagesRouterAdapter.swift
//  Glyph
//

import Foundation

struct NextJSPagesRouterAdapter: RouteResolver {

    static func canResolve(projectRoot: URL) -> Bool {
        FileManager.default.fileExists(atPath: projectRoot.appendingPathComponent("pages").path)
    }

    func resolve(projectRoot: URL) throws -> [DiscoveredRoute] {
        // Support both root-level pages/ and src/pages/ layouts
        let srcPages = projectRoot.appendingPathComponent("src/pages")
        let pagesDir = FileManager.default.fileExists(atPath: srcPages.path)
            ? srcPages
            : projectRoot.appendingPathComponent("pages")
        let validExtensions: Set<String> = ["tsx", "jsx", "ts", "js"]
        // Next.js special files that are not standalone pages
        let skipNames: Set<String> = ["_app", "_document", "_error"]
        var routes: [DiscoveredRoute] = []

        guard let enumerator = FileManager.default.enumerator(
            at: pagesDir,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else { return [] }

        for case let fileURL as URL in enumerator {
            guard validExtensions.contains(fileURL.pathExtension) else { continue }

            let nameWithoutExt = fileURL.deletingPathExtension().lastPathComponent
            guard !skipNames.contains(nameWithoutExt) else { continue }

            // Path relative to pages dir, without extension
            let relPath = String(fileURL.deletingPathExtension().path.dropFirst(pagesDir.path.count))

            // Skip api routes
            if relPath.hasPrefix("/api") { continue }

            // Convert /index and /foo/index → / and /foo
            var routePath: String
            if relPath == "/index" {
                routePath = "/"
            } else if relPath.hasSuffix("/index") {
                routePath = String(relPath.dropLast("/index".count))
            } else {
                routePath = relPath.isEmpty ? "/" : relPath
            }

            let isDynamic = routePath.contains("[")

            routes.append(DiscoveredRoute(
                path: routePath,
                sourceFile: fileURL,
                isDynamic: isDynamic,
                framework: .nextjsPages
            ))
        }

        return routes.sorted { $0.path < $1.path }
    }
}
