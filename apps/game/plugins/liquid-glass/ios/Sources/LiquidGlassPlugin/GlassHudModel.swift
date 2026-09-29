import Foundation
import SwiftUI

// MARK: - HUD state (mirrors the JSON the web app sends)

struct HudGoal: Equatable {
    var text: String
    var done: Bool
}

struct HudTop: Equatable {
    var title: String = ""
    var subtitle: String = ""
    var moves: String = ""
    var goals: [HudGoal] = []
}

struct HudAction: Equatable, Identifiable {
    var id: String
    var label: String
    var icon: String?
    var primary: Bool = false
    var disabled: Bool = false
    /// Optional hex override for this pill's glass tint.
    var tint: String?
}

struct HudState: Equatable {
    var top: HudTop?
    var actions: [HudAction] = []
    var rex: String?
    /// Hex tint of the top pill and neutral actions (zone colour), e.g. "#7ce6d5".
    var tint: String?
    /// Hex tint of primary actions, e.g. "#e5aed4".
    var accent: String?

    /// Applies a partial update: only keys present in `patch` are replaced (`null` clears).
    mutating func apply(patch: [String: Any]) {
        if patch.keys.contains("top") { top = HudParser.top(patch["top"]) }
        if patch.keys.contains("actions") { actions = HudParser.actions(patch["actions"]) ?? [] }
        if patch.keys.contains("rex") { rex = HudParser.nonEmpty(HudParser.string(patch["rex"])) }
        if patch.keys.contains("tint") { tint = HudParser.nonEmpty(HudParser.string(patch["tint"])) }
        if patch.keys.contains("accent") { accent = HudParser.nonEmpty(HudParser.string(patch["accent"])) }
    }
}

/// Tolerant parsing of the bridged JSON values (strings, NSNumber, arrays, dictionaries, NSNull).
enum HudParser {
    static func string(_ v: Any?) -> String? {
        if let s = v as? String { return s }
        if let n = v as? NSNumber { return n.stringValue }
        return nil
    }

    static func nonEmpty(_ s: String?) -> String? {
        guard let s, !s.isEmpty else { return nil }
        return s
    }

    static func bool(_ v: Any?) -> Bool {
        if let b = v as? Bool { return b }
        if let n = v as? NSNumber { return n.boolValue }
        return false
    }

    static func top(_ v: Any?) -> HudTop? {
        guard let d = v as? [String: Any] else { return nil }
        var t = HudTop()
        t.title = string(d["title"]) ?? ""
        t.subtitle = string(d["subtitle"]) ?? ""
        t.moves = string(d["moves"]) ?? ""
        if let goals = d["goals"] as? [Any] {
            t.goals = goals.compactMap { g in
                if let s = g as? String { return HudGoal(text: s, done: false) }
                if let o = g as? [String: Any], let text = string(o["text"]) { return HudGoal(text: text, done: bool(o["done"])) }
                return nil
            }
        }
        return t
    }

    static func actions(_ v: Any?) -> [HudAction]? {
        guard let arr = v as? [Any] else { return nil }
        return arr.compactMap { a in
            guard let o = a as? [String: Any], let id = string(o["id"]) else { return nil }
            return HudAction(
                id: id,
                label: string(o["label"]) ?? id,
                icon: nonEmpty(string(o["icon"])),
                primary: bool(o["primary"]),
                disabled: bool(o["disabled"]),
                tint: nonEmpty(string(o["tint"])))
        }
    }
}

// MARK: - Palette (Earle tokens from apps/game/src/styles/tokens.css)

enum Palette {
    static let ink = Color(hex: "#0f1c22")
    static let inkSoft = Color(hex: "#242c0b")
    static let paper = Color(hex: "#f7f6d8")
    static let sky = Color(hex: "#7ce6d5")
    static let neon = Color(hex: "#b8ff2a")
    static let pink = Color(hex: "#e5aed4")
    static let khaki = Color(hex: "#b3bb6d")

    /// Hex string → colour, with a fallback when the string is missing or malformed.
    static func color(_ hex: String?, fallback: Color) -> Color {
        guard let hex, let c = Color(validHex: hex) else { return fallback }
        return c
    }
}

extension Color {
    init(hex: String) {
        self = Color(validHex: hex) ?? .clear
    }

    /// Accepts "#rgb", "#rrggbb" and "#rrggbbaa" (leading "#" optional).
    init?(validHex: String) {
        var s = validHex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
        guard s.count == 6 || s.count == 8, let v = UInt64(s, radix: 16) else { return nil }
        let r, g, b, a: Double
        if s.count == 8 {
            r = Double((v >> 24) & 0xff) / 255; g = Double((v >> 16) & 0xff) / 255
            b = Double((v >> 8) & 0xff) / 255; a = Double(v & 0xff) / 255
        } else {
            r = Double((v >> 16) & 0xff) / 255; g = Double((v >> 8) & 0xff) / 255
            b = Double(v & 0xff) / 255; a = 1
        }
        self = Color(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

// MARK: - Observable model shared between the plugin (UIKit side) and the SwiftUI view

@available(iOS 16.0, *)
final class GlassHudModel: ObservableObject {
    @Published var state = HudState()
    /// Extra insets requested by the web app (e.g. to keep the action row above a web element).
    @Published var extraTop: CGFloat = 0
    @Published var extraBottom: CGFloat = 0

    var onAction: ((String) -> Void)?
    /// Called whenever an interactive element's frame changes (hit-testing + `layout` event).
    var onRects: (([String: CGRect]) -> Void)?

    private(set) var rects: [String: CGRect] = [:]

    func setRect(_ key: String, _ rect: CGRect?) {
        if let rect {
            if rects[key] == rect { return }
            rects[key] = rect
        } else {
            if rects[key] == nil { return }
            rects.removeValue(forKey: key)
        }
        onRects?(rects)
    }
}
