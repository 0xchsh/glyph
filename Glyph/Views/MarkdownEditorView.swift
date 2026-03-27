//
//  MarkdownEditorView.swift
//  Glyph
//

import SwiftUI
import AppKit

// MARK: - NSViewRepresentable

struct MarkdownEditorView: NSViewRepresentable {
    @Binding var text: String
    let isDark: Bool
    let backgroundColor: NSColor
    let fontSize: CGFloat

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = NSScrollView()
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.autohidesScrollers = true
        scrollView.borderType = .noBorder
        scrollView.backgroundColor = backgroundColor

        let textView = NSTextView()
        textView.delegate = context.coordinator
        textView.isEditable = true
        textView.isSelectable = true
        textView.isRichText = false
        textView.importsGraphics = false
        textView.allowsUndo = true
        textView.usesFindPanel = true
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticSpellingCorrectionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.isAutomaticLinkDetectionEnabled = false
        textView.backgroundColor = backgroundColor
        textView.textColor = MarkdownSyntaxColors.forMode(isDark).body
        textView.insertionPointColor = isDark
            ? NSColor(red: 0.40, green: 0.75, blue: 1.00, alpha: 1)
            : NSColor(red: 0.20, green: 0.50, blue: 0.90, alpha: 1)
        textView.font = NSFont.monospacedSystemFont(ofSize: fontSize, weight: .regular)
        textView.textContainerInset = NSSize(width: 24, height: 16)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.textContainer?.widthTracksTextView = true

        scrollView.documentView = textView

        context.coordinator.textView = textView
        textView.string = text
        context.coordinator.applyHighlighting()

        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = scrollView.documentView as? NSTextView else { return }

        let needsRehighlight = context.coordinator.isDark != isDark
        context.coordinator.isDark = isDark

        if textView.string != text {
            let sel = textView.selectedRange()
            textView.string = text
            let clampedLoc = min(sel.location, textView.string.count)
            textView.setSelectedRange(NSRange(location: clampedLoc, length: 0))
            context.coordinator.applyHighlighting()
        } else if needsRehighlight {
            context.coordinator.applyHighlighting()
        }

        if textView.backgroundColor != backgroundColor {
            textView.backgroundColor = backgroundColor
            scrollView.backgroundColor = backgroundColor
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text, isDark: isDark)
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, NSTextViewDelegate {
        var text: Binding<String>
        var isDark: Bool
        weak var textView: NSTextView?

        init(text: Binding<String>, isDark: Bool) {
            self.text = text
            self.isDark = isDark
        }

        func textDidChange(_ notification: Notification) {
            guard let tv = notification.object as? NSTextView else { return }
            text.wrappedValue = tv.string
            applyHighlighting()
        }

        func applyHighlighting() {
            guard let tv = textView, let storage = tv.textStorage else { return }

            let colors = MarkdownSyntaxColors.forMode(isDark)
            let fontSize = tv.font?.pointSize ?? 13
            let mono = NSFont.monospacedSystemFont(ofSize: fontSize, weight: .regular)
            let monoBold = NSFont.monospacedSystemFont(ofSize: fontSize, weight: .bold)
            let str = storage.string
            let fullRange = NSRange(location: 0, length: storage.length)

            storage.beginEditing()

            // Reset to body
            storage.setAttributes([
                .font: mono,
                .foregroundColor: colors.body
            ], range: fullRange)

            // Apply from least- to most-specific so later rules win on overlaps

            // Ordered/unordered lists (before headings so heading lines are not re-colored)
            apply(#"^[-*+]\s.+$"#, opts: .anchorsMatchLines, to: storage, str: str,
                  attrs: [.foregroundColor: colors.list, .font: mono])
            apply(#"^\d+\.\s.+$"#, opts: .anchorsMatchLines, to: storage, str: str,
                  attrs: [.foregroundColor: colors.list, .font: mono])

            // Headings H3+ then H2 then H1 (most specific wins)
            apply(#"^#{3,}\s.+$"#, opts: .anchorsMatchLines, to: storage, str: str,
                  attrs: [.foregroundColor: colors.h3, .font: mono])
            apply(#"^#{2}\s.+$"#, opts: .anchorsMatchLines, to: storage, str: str,
                  attrs: [.foregroundColor: colors.h2, .font: mono])
            apply(#"^#\s.+$"#, opts: .anchorsMatchLines, to: storage, str: str,
                  attrs: [.foregroundColor: colors.h1, .font: mono])

            // Bold+italic (*** or ___) — apply before bold so triple markers win
            apply(#"\*{3}(?!\*).+?(?<!\*)\*{3}"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.emphasis, .font: monoBold])
            apply(#"_{3}(?!_).+?(?<!_)_{3}"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.emphasis, .font: monoBold])

            // Bold (** or __)
            apply(#"(?<!\*)\*{2}(?!\*).+?(?<!\*)\*{2}(?!\*)"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.emphasis, .font: monoBold])
            apply(#"(?<!_)_{2}(?!_).+?(?<!_)_{2}(?!_)"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.emphasis, .font: monoBold])

            // Italic (* or _)
            apply(#"(?<!\*)\*(?!\*).+?(?<!\*)\*(?!\*)"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.emphasis, .font: mono])
            apply(#"(?<!_)_(?!_).+?(?<!_)_(?!_)"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.emphasis, .font: mono])

            // Inline code `code`
            apply(#"`[^`\n]+`"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.code, .font: mono])

            // Reference-style links: [label]: url
            apply(#"^\[.+?\]:\s*\S+"#, opts: .anchorsMatchLines, to: storage, str: str,
                  attrs: [.foregroundColor: colors.link, .font: mono])
            // Override URL portion with url color
            apply(#"(?<=:\s)(https?://\S+)"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.url, .font: mono])

            // Inline links [text](url)
            apply(#"\[.+?\]\(.+?\)"#, to: storage, str: str,
                  attrs: [.foregroundColor: colors.link, .font: mono])

            storage.endEditing()
        }

        private func apply(
            _ pattern: String,
            opts: NSRegularExpression.Options = [],
            to storage: NSTextStorage,
            str: String,
            attrs: [NSAttributedString.Key: Any]
        ) {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: opts) else { return }
            let range = NSRange(location: 0, length: (str as NSString).length)
            regex.enumerateMatches(in: str, range: range) { match, _, _ in
                guard let r = match?.range else { return }
                storage.addAttributes(attrs, range: r)
            }
        }
    }
}

// MARK: - Syntax Colors

struct MarkdownSyntaxColors {
    let body: NSColor
    let h1: NSColor
    let h2: NSColor
    let h3: NSColor
    let list: NSColor
    let emphasis: NSColor
    let code: NSColor
    let link: NSColor
    let url: NSColor

    static func forMode(_ isDark: Bool) -> MarkdownSyntaxColors {
        isDark ? .dark : .light
    }

    static let light = MarkdownSyntaxColors(
        body:     NSColor(red: 0.30, green: 0.30, blue: 0.32, alpha: 1),
        h1:       NSColor(red: 0.18, green: 0.68, blue: 0.70, alpha: 1),
        h2:       NSColor(red: 0.52, green: 0.22, blue: 0.76, alpha: 1),
        h3:       NSColor(red: 0.28, green: 0.48, blue: 0.85, alpha: 1),
        list:     NSColor(red: 0.93, green: 0.22, blue: 0.43, alpha: 1),
        emphasis: NSColor(red: 0.76, green: 0.58, blue: 0.04, alpha: 1),
        code:     NSColor(red: 0.65, green: 0.25, blue: 0.15, alpha: 1),
        link:     NSColor(red: 0.18, green: 0.68, blue: 0.70, alpha: 1),
        url:      NSColor(red: 0.12, green: 0.42, blue: 0.88, alpha: 1)
    )

    static let dark = MarkdownSyntaxColors(
        body:     NSColor(red: 0.78, green: 0.78, blue: 0.80, alpha: 1),
        h1:       NSColor(red: 0.28, green: 0.82, blue: 0.82, alpha: 1),
        h2:       NSColor(red: 0.68, green: 0.38, blue: 0.95, alpha: 1),
        h3:       NSColor(red: 0.42, green: 0.63, blue: 1.00, alpha: 1),
        list:     NSColor(red: 1.00, green: 0.33, blue: 0.53, alpha: 1),
        emphasis: NSColor(red: 1.00, green: 0.80, blue: 0.18, alpha: 1),
        code:     NSColor(red: 1.00, green: 0.55, blue: 0.40, alpha: 1),
        link:     NSColor(red: 0.28, green: 0.82, blue: 0.82, alpha: 1),
        url:      NSColor(red: 0.38, green: 0.63, blue: 1.00, alpha: 1)
    )
}
