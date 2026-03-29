//
//  PrettyCodeEditorView.swift
//  Glyph
//
//  Custom code editor: line numbers, VS Code Dark+ colors, proper line spacing.
//

import SwiftUI
import AppKit
import Highlightr

// MARK: - PrettyCodeEditorView

struct PrettyCodeEditorView: NSViewRepresentable {
    @Binding var text: String
    let language: String          // highlight.js language id, e.g. "swift", "javascript"
    let isDark: Bool
    let backgroundColor: NSColor
    let foregroundColor: NSColor

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text)
    }

    func makeNSView(context: Context) -> NSScrollView {
        // --- Highlightr setup ---
        guard let highlightr = Highlightr() else {
            return NSScrollView()
        }
        highlightr.setTheme(to: isDark ? "vs2015" : "xcode")
        let codeFont = NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)
        highlightr.theme.setCodeFont(codeFont)

        // CodeAttributedString is Highlightr's live-highlighting NSTextStorage subclass
        let textStorage = CodeAttributedString(highlightr: highlightr)
        textStorage.language = language

        let layoutManager = NSLayoutManager()
        layoutManager.allowsNonContiguousLayout = true
        textStorage.addLayoutManager(layoutManager)

        let container = NSTextContainer(size: NSSize(width: 0, height: CGFloat.greatestFiniteMagnitude))
        container.widthTracksTextView = true
        layoutManager.addTextContainer(container)

        // --- Text view ---
        let textView = NSTextView(frame: .zero, textContainer: container)
        textView.delegate = context.coordinator
        textView.isEditable = true
        textView.isSelectable = true
        textView.allowsUndo = true
        textView.usesFindPanel = true
        textView.isRichText = true          // needed for attributed string rendering
        textView.importsGraphics = false
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        textView.isAutomaticSpellingCorrectionEnabled = false
        textView.isAutomaticTextReplacementEnabled = false
        textView.isAutomaticLinkDetectionEnabled = false
        textView.backgroundColor = backgroundColor
        textView.drawsBackground = true
        textView.insertionPointColor = isDark
            ? NSColor(red: 0.53, green: 0.73, blue: 1.00, alpha: 1)
            : NSColor(red: 0.2, green: 0.4, blue: 0.9, alpha: 1)
        textView.font = codeFont
        textView.textColor = foregroundColor
        textView.textContainerInset = NSSize(width: 16, height: 14)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]

        // Better line spacing
        let para = NSMutableParagraphStyle()
        para.lineSpacing = 5
        textView.defaultParagraphStyle = para
        textView.typingAttributes = [
            .font: codeFont,
            .foregroundColor: foregroundColor,
            .paragraphStyle: para
        ]

        // --- Scroll view ---
        let scrollView = NSScrollView()
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.autohidesScrollers = true
        scrollView.borderType = .noBorder
        scrollView.backgroundColor = backgroundColor
        scrollView.documentView = textView

        // --- Line numbers ruler ---
        let ruler = LineNumbersRulerView(textView: textView, isDark: isDark)
        scrollView.verticalRulerView = ruler
        scrollView.hasVerticalRuler = true
        scrollView.rulersVisible = true

        context.coordinator.textView = textView
        context.coordinator.ruler = ruler

        // Load initial text into storage (without triggering dirty)
        textStorage.replaceCharacters(
            in: NSRange(location: 0, length: 0),
            with: text
        )
        DispatchQueue.main.async { context.coordinator.isLoaded = true }

        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        guard let textView = scrollView.documentView as? NSTextView else { return }

        if textView.string != text {
            let sel = textView.selectedRange()
            // Replace via storage so Highlightr re-highlights
            textView.textStorage?.replaceCharacters(
                in: NSRange(location: 0, length: textView.string.utf16.count),
                with: text
            )
            let safeLocation = min(sel.location, textView.string.utf16.count)
            textView.setSelectedRange(NSRange(location: safeLocation, length: 0))
        }

        if textView.backgroundColor != backgroundColor {
            textView.backgroundColor = backgroundColor
            scrollView.backgroundColor = backgroundColor
        }
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject, NSTextViewDelegate {
        var text: Binding<String>
        var isLoaded = false
        weak var textView: NSTextView?
        weak var ruler: LineNumbersRulerView?

        init(text: Binding<String>) {
            self.text = text
        }

        func textDidChange(_ notification: Notification) {
            guard isLoaded, let tv = notification.object as? NSTextView else { return }
            text.wrappedValue = tv.string
            ruler?.needsDisplay = true
        }

        func textViewDidChangeSelection(_ notification: Notification) {
            ruler?.needsDisplay = true
        }
    }
}

// MARK: - LineNumbersRulerView

final class LineNumbersRulerView: NSRulerView {

    private let textView: NSTextView
    private let isDark: Bool

    private var rulerBG: NSColor   { isDark ? NSColor(white: 0.095, alpha: 1) : NSColor(white: 0.945, alpha: 1) }
    private var separatorColor: NSColor { isDark ? NSColor(white: 0.17, alpha: 1) : NSColor(white: 0.82, alpha: 1) }
    private var numberColor: NSColor    { isDark ? NSColor(white: 0.32, alpha: 1) : NSColor(white: 0.58, alpha: 1) }
    private var activeColor: NSColor    { isDark ? NSColor(white: 0.65, alpha: 1) : NSColor(white: 0.25, alpha: 1) }

    init(textView: NSTextView, isDark: Bool) {
        self.textView = textView
        self.isDark = isDark
        super.init(scrollView: textView.enclosingScrollView, orientation: .verticalRuler)
        ruleThickness = 46

        NotificationCenter.default.addObserver(
            self, selector: #selector(refresh),
            name: NSText.didChangeNotification, object: textView
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(refresh),
            name: NSView.boundsDidChangeNotification,
            object: textView.enclosingScrollView?.contentView
        )
    }

    required init(coder: NSCoder) { fatalError() }
    deinit { NotificationCenter.default.removeObserver(self) }

    @objc private func refresh() { needsDisplay = true }

    override func drawHashMarksAndLabels(in rect: NSRect) {
        guard
            let scrollView = textView.enclosingScrollView,
            let layoutManager = textView.layoutManager,
            textView.textContainer != nil
        else { return }

        // Background + separator
        rulerBG.setFill()
        rect.fill()
        separatorColor.setFill()
        NSRect(x: bounds.maxX - 1, y: rect.minY, width: 1, height: rect.height).fill()

        let numFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
        let normalAttrs: [NSAttributedString.Key: Any] = [.font: numFont, .foregroundColor: numberColor]
        let activeAttrs: [NSAttributedString.Key: Any] = [.font: numFont, .foregroundColor: activeColor]

        let inset = textView.textContainerInset
        let visibleRect = scrollView.contentView.bounds

        // Selected line character index (for highlighting the active line number)
        let selectedCharIndex = textView.selectedRange().location

        let content = textView.string as NSString
        let contentLength = content.length

        // Walk through the source lines and draw each visible one
        var lineNumber = 1
        var charIndex = 0

        while charIndex <= contentLength {
            // Get the NSRange of this entire source line (including newline)
            let lineCharRange: NSRange
            if charIndex < contentLength {
                lineCharRange = content.lineRange(for: NSRange(location: charIndex, length: 0))
            } else {
                // Empty final line after a trailing newline
                lineCharRange = NSRange(location: charIndex, length: 0)
            }

            // Map to glyph range → get the y position of the first fragment
            let glyphRange = layoutManager.glyphRange(
                forCharacterRange: NSRange(location: lineCharRange.location, length: max(lineCharRange.length, 1)),
                actualCharacterRange: nil
            )

            if glyphRange.location < layoutManager.numberOfGlyphs || lineCharRange.length == 0 {
                var fragmentRect = NSRect.zero
                if layoutManager.numberOfGlyphs > 0 && glyphRange.location < layoutManager.numberOfGlyphs {
                    fragmentRect = layoutManager.lineFragmentRect(
                        forGlyphAt: min(glyphRange.location, layoutManager.numberOfGlyphs - 1),
                        effectiveRange: nil
                    )
                } else {
                    // Trailing empty line: position below the last glyph
                    let lastGlyph = max(0, layoutManager.numberOfGlyphs - 1)
                    if layoutManager.numberOfGlyphs > 0 {
                        let lastRect = layoutManager.lineFragmentRect(forGlyphAt: lastGlyph, effectiveRange: nil)
                        fragmentRect = NSRect(x: 0, y: lastRect.maxY, width: lastRect.width, height: lastRect.height)
                    }
                }

                let lineY = fragmentRect.minY + inset.height - visibleRect.minY

                // Early exit if we've passed the visible area
                if lineY > rect.maxY + 40 { break }

                if lineY >= rect.minY - 40 {
                    // Highlight current line's number
                    let isActive = selectedCharIndex >= lineCharRange.location &&
                        (lineCharRange.length == 0 || selectedCharIndex < NSMaxRange(lineCharRange))
                    let attrs = isActive ? activeAttrs : normalAttrs
                    let label = "\(lineNumber)" as NSString
                    let labelSize = label.size(withAttributes: attrs)
                    let drawX = ruleThickness - labelSize.width - 10
                    let drawY = lineY + (fragmentRect.height - labelSize.height) / 2
                    label.draw(at: NSPoint(x: drawX, y: drawY), withAttributes: attrs)
                }
            }

            lineNumber += 1

            if lineCharRange.length == 0 || NSMaxRange(lineCharRange) >= contentLength {
                break
            }
            charIndex = NSMaxRange(lineCharRange)
        }
    }
}
