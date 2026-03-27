//
//  ColorPalette.swift
//  Glyph
//

import SwiftUI
import AppKit

enum Palette: String, CaseIterable, Identifiable {
    case obsidian = "Obsidian"
    case midnight = "Midnight"
    case ash      = "Ash"
    case chalk    = "Chalk"
    case forest   = "Forest"

    var id: String { rawValue }
}

struct ColorPalette {
    let appBackground: Color
    let panelBackground: Color
    let sidebarBackground: Color
    let accent: Color
    let border: Color
    let primaryText: Color
    let secondaryText: Color
    let isDark: Bool

    // NSColor versions for use in NSViewRepresentable (e.g. terminal background/foreground)
    var nsBackground: NSColor { NSColor(appBackground) }
    var nsForeground: NSColor { NSColor(primaryText) }

    static func make(_ palette: Palette) -> ColorPalette {
        switch palette {
        case .obsidian: return .obsidian
        case .midnight: return .midnight
        case .ash:      return .ash
        case .chalk:    return .chalk
        case .forest:   return .forest
        }
    }

    // Near-black, neutral accent
    static let obsidian = ColorPalette(
        appBackground:     Color(red: 0.051, green: 0.051, blue: 0.055),
        panelBackground:   Color(red: 0.082, green: 0.082, blue: 0.090),
        sidebarBackground: Color(red: 0.063, green: 0.063, blue: 0.071),
        accent:            Color(white: 0.82),
        border:            Color(white: 0.16),
        primaryText:       Color(white: 0.95),
        secondaryText:     Color(white: 0.62),
        isDark: true
    )

    // Deep navy, blue accent
    static let midnight = ColorPalette(
        appBackground:     Color(red: 0.043, green: 0.055, blue: 0.098),
        panelBackground:   Color(red: 0.063, green: 0.082, blue: 0.141),
        sidebarBackground: Color(red: 0.051, green: 0.067, blue: 0.118),
        accent:            Color(red: 0.220, green: 0.540, blue: 1.000),
        border:            Color(red: 0.118, green: 0.157, blue: 0.239),
        primaryText:       Color(red: 0.871, green: 0.898, blue: 0.969),
        secondaryText:     Color(red: 0.380, green: 0.443, blue: 0.557),
        isDark: true
    )

    // Dark gray, neutral
    static let ash = ColorPalette(
        appBackground:     Color(red: 0.098, green: 0.098, blue: 0.102),
        panelBackground:   Color(red: 0.137, green: 0.137, blue: 0.145),
        sidebarBackground: Color(red: 0.118, green: 0.118, blue: 0.122),
        accent:            Color(red: 0.776, green: 0.784, blue: 0.820),
        border:            Color(red: 0.220, green: 0.220, blue: 0.231),
        primaryText:       Color(red: 0.878, green: 0.878, blue: 0.894),
        secondaryText:     Color(red: 0.459, green: 0.459, blue: 0.475),
        isDark: true
    )

    // Light mode, off-white
    static let chalk = ColorPalette(
        appBackground:     Color(red: 0.953, green: 0.945, blue: 0.933),
        panelBackground:   Color(red: 0.980, green: 0.976, blue: 0.969),
        sidebarBackground: Color(red: 0.929, green: 0.922, blue: 0.906),
        accent:            Color(red: 0.180, green: 0.180, blue: 0.200),
        border:            Color(red: 0.820, green: 0.812, blue: 0.800),
        primaryText:       Color(red: 0.122, green: 0.118, blue: 0.110),
        secondaryText:     Color(red: 0.455, green: 0.447, blue: 0.431),
        isDark: false
    )

    // Dark green tones
    static let forest = ColorPalette(
        appBackground:     Color(red: 0.039, green: 0.082, blue: 0.055),
        panelBackground:   Color(red: 0.055, green: 0.114, blue: 0.075),
        sidebarBackground: Color(red: 0.047, green: 0.098, blue: 0.063),
        accent:            Color(red: 0.275, green: 0.784, blue: 0.427),
        border:            Color(red: 0.098, green: 0.196, blue: 0.133),
        primaryText:       Color(red: 0.827, green: 0.933, blue: 0.855),
        secondaryText:     Color(red: 0.341, green: 0.494, blue: 0.384),
        isDark: true
    )
}
