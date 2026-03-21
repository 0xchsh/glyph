//
//  FileItem.swift
//  Glyph
//

import Foundation

struct FileItem: Identifiable, Hashable {
    var id: URL { url }
    let url: URL
    let name: String
    let isDirectory: Bool

    func hash(into hasher: inout Hasher) { hasher.combine(url) }
    static func == (lhs: FileItem, rhs: FileItem) -> Bool { lhs.url == rhs.url }

    static func load(from directoryURL: URL) -> [FileItem] {
        guard let contents = try? FileManager.default.contentsOfDirectory(
            at: directoryURL,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else { return [] }

        return contents
            .compactMap { url -> FileItem? in
                let isDir = (try? url.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true
                return FileItem(url: url, name: url.lastPathComponent, isDirectory: isDir)
            }
            .sorted {
                if $0.isDirectory != $1.isDirectory { return $0.isDirectory }
                return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
            }
    }

    func sfSymbol() -> String {
        if isDirectory { return "folder" }
        switch url.pathExtension.lowercased() {
        case "swift":                    return "swift"
        case "js", "ts", "jsx", "tsx":  return "doc.text"
        case "json":                     return "doc.badge.gearshape"
        case "md", "mdx":               return "doc.plaintext"
        case "css", "scss":              return "paintbrush.pointed"
        case "html":                     return "globe"
        case "png", "jpg", "jpeg", "svg", "gif": return "photo"
        default:                         return "doc"
        }
    }
}
