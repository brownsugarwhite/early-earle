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

    /// "12", "2048", "∞", "1 024" …: short and numeric enough for the display face.
    static func isShortNumber(_ text: String) -> Bool {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, t.count <= 7, t.contains(where: { $0.isNumber || $0 == "∞" }) else { return false }
        return t.allSatisfy { $0.isNumber || " .,·×+-−∞/'".contains($0) }
    }
}
