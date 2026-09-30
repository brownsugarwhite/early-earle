import CoreText
import Foundation
import SwiftUI
import UIKit

/// Caprasimo (SIL OFL 1.1, `Fonts/OFL.txt`; the web's 'EE Heavy'): the fat display face of early earle. Only for
/// numbers and very short titles (the moves/score number, a numeric level title); REX, goals and pills stay in the
/// system font (docs/STYLE.md).
enum GlassFonts {
    /// PostScript name of the bundled face.
    static let displayName = "Caprasimo-Regular"
    private static var registered = false

    /// Registers the bundled font for this process (once; called from `LiquidGlassPlugin.load()`).
    static func register() {
        guard !registered else { return }
        registered = true
        guard let url = Bundle.module.url(forResource: displayName, withExtension: "ttf", subdirectory: "Fonts") else { return }
        // "Already registered" (a second bridge, a reload) is harmless.
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }

    /// The display face at `size`, scaling with Dynamic Type like `style` (falls back to the system font when missing).
    static func number(_ size: CGFloat, relativeTo style: Font.TextStyle = .title2) -> Font {
        Font.custom(displayName, size: size, relativeTo: style)
    }

    /// Characters Caprasimo maps to an empty box instead of leaving them to the fallback font.
    private static let boxed: Set<Character> = ["∞"]

    /// Every character has a real glyph in the display face (false when the font is not registered).
    static func covers(_ text: String) -> Bool {
        guard !text.contains(where: { boxed.contains($0) }), let font = UIFont(name: displayName, size: 20) else { return false }
        let units = Array(text.utf16)
        var glyphs = [CGGlyph](repeating: 0, count: units.count)
        return CTFontGetGlyphsForCharacters(font as CTFont, units, &glyphs, units.count)
    }

    /// `number(size)` for `text`, or the system black face when the display face cannot draw it ("∞" for no limit).
    static func number(for text: String, size: CGFloat, relativeTo style: Font.TextStyle = .title2) -> Font {
        covers(text) ? number(size, relativeTo: style) : .system(size: size * 0.9, weight: .black)
    }

    /// "12", "2048", "∞", "1 024" …: short and numeric enough for the display face.
    static func isShortNumber(_ text: String) -> Bool {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, t.count <= 7, t.contains(where: { $0.isNumber || $0 == "∞" }) else { return false }
        return t.allSatisfy { $0.isNumber || " .,·×+-−∞/'".contains($0) }
    }
}
