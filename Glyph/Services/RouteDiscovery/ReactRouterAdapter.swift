//
//  ReactRouterAdapter.swift
//  Glyph
//

import Foundation

struct ReactRouterAdapter: RouteResolver {

    static func canResolve(projectRoot: URL) -> Bool {
        let pkgURL = projectRoot.appendingPathComponent("package.json")
        guard let data = try? Data(contentsOf: pkgURL),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return false }

        let deps = allDependencies(from: json)
        return deps["react-router"] != nil || deps["react-router-dom"] != nil
    }

    func resolve(projectRoot: URL) throws -> [DiscoveredRoute] {
        // Common locations for router configuration
        let candidates = [
            "src/App.tsx",   "src/App.jsx",
            "src/router.tsx","src/router.jsx",
            "src/routes.tsx","src/routes.jsx",
            "src/main.tsx",  "src/main.jsx",
        ]

        for candidate in candidates {
            let url = projectRoot.appendingPathComponent(candidate)
            guard let content = try? String(contentsOf: url, encoding: .utf8) else { continue }
            let routes = extractRoutes(from: content, configFile: url)
            if !routes.isEmpty { return routes }
        }

        return []
    }

    // MARK: - Parsing

    /// Extracts `path` values from React Router JSX / createBrowserRouter config
    /// using a regex/string approach — catches ~80 % of real-world patterns.
    private func extractRoutes(from content: String, configFile: URL) -> [DiscoveredRoute] {
        // Match  path="…"  path='…'  path: "…"  path: '…'
        let pattern = #"path\s*[=:]\s*["']([^"'\n]+)["']"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }

        var seen = Set<String>()
        var routes: [DiscoveredRoute] = []

        let range = NSRange(content.startIndex..., in: content)
        regex.enumerateMatches(in: content, range: range) { match, _, _ in
            guard
                let match = match,
                let captureRange = Range(match.range(at: 1), in: content)
            else { return }

            var path = String(content[captureRange])
            // Skip empty, wildcard-only, or relative paths that look like component props
            if path.isEmpty || path == "*" { return }
            if !path.hasPrefix("/") { path = "/" + path }

            if seen.insert(path).inserted {
                let isDynamic = path.contains(":") || path.contains("*")
                routes.append(DiscoveredRoute(
                    path: path,
                    sourceFile: configFile,
                    isDynamic: isDynamic,
                    framework: .reactRouter
                ))
            }
        }

        return routes.sorted { $0.path < $1.path }
    }

    private static func allDependencies(from json: [String: Any]) -> [String: Any] {
        var merged: [String: Any] = [:]
        for key in ["dependencies", "devDependencies"] {
            if let d = json[key] as? [String: Any] {
                merged.merge(d) { existing, _ in existing }
            }
        }
        return merged
    }
}
