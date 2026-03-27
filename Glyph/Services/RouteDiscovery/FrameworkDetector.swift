//
//  FrameworkDetector.swift
//  Glyph
//

import Foundation

struct FrameworkDetector {

    /// Inspects `package.json` at the project root and returns the best-matching
    /// `RouteResolver`, or `nil` if the project is unrecognized.
    static func detect(projectRoot: URL) -> (any RouteResolver)? {
        let pkgURL = projectRoot.appendingPathComponent("package.json")

        guard
            let data = try? Data(contentsOf: pkgURL),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }

        let deps = allDependencies(from: json)
        let fm = FileManager.default

        // Check both project root and src/ (create-next-app default since Next.js 13)
        let searchBases = [projectRoot, projectRoot.appendingPathComponent("src")]

        if deps["next"] != nil {
            for base in searchBases {
                // 1. Next.js App Router: app/ dir with at least one page file
                let appDir = base.appendingPathComponent("app")
                if fm.fileExists(atPath: appDir.path), containsPageFile(appDir) {
                    return NextJSAppRouterAdapter()
                }

                // 2. Next.js Pages Router: pages/ dir
                let pagesDir = base.appendingPathComponent("pages")
                if fm.fileExists(atPath: pagesDir.path) {
                    return NextJSPagesRouterAdapter()
                }
            }
        }

        // 3. React Router
        if deps["react-router"] != nil || deps["react-router-dom"] != nil {
            return ReactRouterAdapter()
        }

        return nil
    }

    // MARK: - Helpers

    private static func allDependencies(from json: [String: Any]) -> [String: Any] {
        var merged: [String: Any] = [:]
        for key in ["dependencies", "devDependencies", "peerDependencies"] {
            if let d = json[key] as? [String: Any] {
                merged.merge(d) { existing, _ in existing }
            }
        }
        return merged
    }

    private static func containsPageFile(_ dir: URL) -> Bool {
        let pageNames: Set<String> = ["page.tsx", "page.jsx", "page.ts", "page.js"]
        guard let enumerator = FileManager.default.enumerator(at: dir, includingPropertiesForKeys: nil) else {
            return false
        }
        for case let url as URL in enumerator {
            if pageNames.contains(url.lastPathComponent) { return true }
        }
        return false
    }
}
