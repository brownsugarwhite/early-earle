import SwiftUI
import UIKit

// The native HUD: top pill (level, moves, goals), REX line, action row.
// iOS 26+: Liquid Glass (`glassEffect` inside one `GlassEffectContainer`, pills morph via `glassEffectID`).
// iOS 16–18: system material blur (UIVisualEffectView under the hood) with the same layout.
// Style rules (docs/STYLE.md, GDD 10.2): no outlines, hard offset shadows in the sun direction only on paper
// elements, jewel-toned tints over the ink background, chunky black grotesk type, ≤ 8 words.

@available(iOS 16.0, *)
struct GlassHudRoot: View {
    @ObservedObject var model: GlassHudModel
    @Namespace private var ns
    /// Width of the HUD area (for the action row's label/icon decision).
    @State private var width: CGFloat = 0

    var body: some View {
        Group {
            if #available(iOS 26.0, *) {
                // Blend distance below the 12-pt row gap: pills stay separate, but still morph when they move.
                GlassEffectContainer(spacing: 10) { layers }
            } else {
                layers
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ignoresSafeArea(.keyboard)
    }

    private var layers: some View {
        let s = model.state
        let tint = Palette.color(s.tint, fallback: Palette.sky).opacity(0.55)
        let accent = Palette.color(s.accent, fallback: Palette.pink).opacity(0.85)
        return VStack(spacing: 0) {
            if let top = s.top {
                TopPill(top: top)
                    .modifier(GlassSurface(tint: tint, shape: Capsule(), interactive: false, id: "top", ns: ns))
                    .modifier(ReportRect(key: "top", model: model))
                    .transition(.opacity.combined(with: .offset(y: -8)))
            }
            Spacer(minLength: 0)
            VStack(spacing: 10) {
                if let rex = s.rex {
                    RexLine(text: rex)
                        .id("rex-\(rex)")
                        // Reported for REX's rim on the map (he peeks over this box); not a hit rect. One key per
                        // line: while a new line slides in, the old one's `onDisappear` must not drop the new frame.
                        .modifier(ReportRect(key: "rex-\(rex)", model: model))
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                if !s.actions.isEmpty {
                    // One decision for the whole row (ActionRowLayout): labels, or the primary label with round
                    // icon pills, or equal icon pills. Never "…".
                    let row = ActionRowLayout.make(s.actions, width: width > 0 ? width - 32 : 0)
                    HStack(spacing: row.spacing) {
                        ForEach(Array(s.actions.enumerated()), id: \.element.id) { i, a in
                            let pillTint = a.tint.flatMap { Color(validHex: $0)?.opacity(0.7) } ?? (a.primary ? accent : tint)
                            ActionPill(action: a, style: row.style(i), height: row.height, padding: row.labelPadding, textScale: row.textScale) { model.onAction?(a.id) }
                                .modifier(GlassSurface(tint: pillTint, shape: Capsule(), interactive: !a.disabled, id: "action-\(a.id)", ns: ns))
                                .modifier(ReportRect(key: "action-\(a.id)", model: model))
                                .transition(.opacity.combined(with: .scale(scale: 0.85)))
                        }
                    }
                }
            }
        }
        .padding(.top, 12 + model.extraTop)
        .padding(.bottom, 14 + model.extraBottom)
        .padding(.horizontal, 16)
        .foregroundStyle(Palette.ink)
        .onGeometryChange(for: CGFloat.self) { proxy in
            proxy.size.width
        } action: { w in
            width = w
        }
    }
}

// MARK: - Pieces

@available(iOS 16.0, *)
struct TopPill: View {
    let top: HudTop

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 2) {
                if !top.subtitle.isEmpty {
                    Text(top.subtitle.uppercased())
                        .font(.system(size: 10, weight: .black))
                        .tracking(2.2)
                        .opacity(0.75)
                        .lineLimit(1)
                }
                // A numeric title ("2048" in the classic mode) gets the display face; names stay in the grotesk.
                Text(top.title)
                    .font(GlassFonts.isShortNumber(top.title) ? GlassFonts.number(19, relativeTo: .headline) : .system(size: 15, weight: .black))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            if !top.moves.isEmpty {
                VStack(spacing: 1) {
                    // The big number in Caprasimo (numbers and short titles only, like the web HUD's 'EE Heavy').
                    Text(top.moves)
                        .font(GlassFonts.number(26))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .dynamicTypeSize(...DynamicTypeSize.xxLarge)
                    Text((top.movesLabel.isEmpty ? "Züge" : top.movesLabel).uppercased())
                        .font(.system(size: 9, weight: .black))
                        .tracking(1.6)
                        .lineLimit(1)
                        .opacity(0.75)
                }
                .frame(minWidth: 44)
            }
            ForEach(Array(top.goals.enumerated()), id: \.offset) { _, g in
                Text(g.done ? "\(g.text) ✓" : g.text)
                    .font(.system(size: 12, weight: .black))
                    .lineLimit(1)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 10)
                    .background(PaperCard(fill: g.done ? Palette.neon : Palette.paper, shadowX: -4, shadowY: 2))
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 20)
    }
}

/// How one pill is drawn in the action row.
enum PillStyle: Equatable {
    /// Icon and label (a capsule sized by its text).
    case label
    /// Icon only, in a circle (height × height).
    case round
    /// Icon only, sharing the row width equally with the other stretched pills.
    case stretch
}

/// One decision for the whole action row, never "…":
/// 1. every pill with its label (`iconOnly` pills are circles);
/// 2. else, when there is a primary action, it keeps its label and every other pill becomes a round icon pill —
///    padding, gaps and circles tighten step by step (gaps stay above the glass container's 10-pt blend distance);
/// 3. else equal icon pills over the full row (the level's four actions); `iconOnly` pills stay round.
struct ActionRowLayout: Equatable {
    var styles: [PillStyle]
    var spacing: CGFloat
    /// Pill height = diameter of the round pills.
    var height: CGFloat
    var labelPadding: CGFloat
    var textScale: CGFloat

    static let labelFont = UIFont.systemFont(ofSize: 15, weight: .black)
    static let tracking: CGFloat = 0.9
    /// Icon (18 pt) plus the gap to the label.
    static let iconWidth: CGFloat = 18 + 8

    /// (label padding, gap, circle, text scale) from roomy to tight.
    static let condensedSteps: [(pad: CGFloat, gap: CGFloat, round: CGFloat, scale: CGFloat)] = [
        (22, 12, 48, 1),
        (16, 12, 48, 1),
        (16, 11, 46, 1),
        (14, 11, 44, 1),
        (12, 11, 44, 0.85)
    ]

    func style(_ i: Int) -> PillStyle {
        i < styles.count ? styles[i] : .label
    }

    static func textWidth(_ label: String, scale: CGFloat = 1) -> CGFloat {
        let text = label.uppercased() as NSString
        return ceil(text.size(withAttributes: [.font: labelFont, .kern: tracking]).width * scale)
    }

    static func labelPillWidth(_ a: HudAction, padding: CGFloat, scale: CGFloat) -> CGFloat {
        max(96, textWidth(a.label, scale: scale) + (a.icon != nil ? iconWidth : 0) + 2 * padding)
    }

    /// `width`: room for the row (points); 0 = unknown yet (first layout pass) → labels.
    static func make(_ actions: [HudAction], width: CGFloat) -> ActionRowLayout {
        let gaps = CGFloat(max(0, actions.count - 1))
        let full = actions.map { $0.iconOnly && $0.icon != nil ? PillStyle.round : .label }
        let fullWidth = zip(actions, full).reduce(CGFloat(0)) { sum, pair in
            sum + (pair.1 == .round ? 48 : labelPillWidth(pair.0, padding: 22, scale: 1))
        } + gaps * 12
        if width <= 0 || fullWidth <= width {
            return ActionRowLayout(styles: full, spacing: 12, height: 48, labelPadding: 22, textScale: 1)
        }
        if actions.contains(where: { $0.primary && !$0.iconOnly }) {
            // A pill without an icon cannot become an icon: it keeps its label too.
            let styles = actions.map { ($0.primary && !$0.iconOnly) || $0.icon == nil ? PillStyle.label : .round }
            for step in condensedSteps {
                let w = zip(actions, styles).reduce(CGFloat(0)) { sum, pair in
                    sum + (pair.1 == .round ? step.round : labelPillWidth(pair.0, padding: step.pad, scale: step.scale))
                } + gaps * step.gap
                if w <= width {
                    return ActionRowLayout(styles: styles, spacing: step.gap, height: step.round, labelPadding: step.pad, textScale: step.scale)
                }
            }
        }
        let styles = actions.map { a -> PillStyle in a.icon == nil ? .label : (a.iconOnly ? .round : .stretch) }
        return ActionRowLayout(styles: styles, spacing: 12, height: 48, labelPadding: 22, textScale: 1)
    }
}

@available(iOS 16.0, *)
struct ActionPill: View {
    let action: HudAction
    var style: PillStyle = .label
    var height: CGFloat = 48
    var padding: CGFloat = 22
    var textScale: CGFloat = 1
    let tap: () -> Void

    var body: some View {
        Button(action: tap) {
            Group {
                if style == .stretch, let icon = action.icon {
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .black))
                        .frame(maxWidth: .infinity)
                } else if style == .round, let icon = action.icon {
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .black))
                        .frame(width: height)
                } else {
                    HStack(spacing: 8) {
                        if let icon = action.icon {
                            Image(systemName: icon).font(.system(size: 14, weight: .black))
                        }
                        Text(action.label.uppercased())
                            .font(.system(size: 15 * textScale, weight: .black))
                            .tracking(ActionRowLayout.tracking)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                    .padding(.horizontal, padding)
                    .frame(minWidth: 96)
                }
            }
            .frame(height: height)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(action.label)
        .disabled(action.disabled)
        .opacity(action.disabled ? 0.4 : 1)
    }
}

/// REX's line: paper card (content, not glass — Apple: no glass on glass), hard sun-direction shadow.
@available(iOS 16.0, *)
struct RexLine: View {
    let text: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text("REX").font(.system(size: 16, weight: .black))
            Text(text)
                .font(.system(size: 16, weight: .bold))
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 14)
        .frame(maxWidth: 520)
        .background(PaperCard(fill: Palette.paper, shadowX: -8, shadowY: 3))
    }
}

/// Solid card with the hard sun-direction offset shadow on the box only (CSS `box-shadow`), never on the glyphs.
@available(iOS 16.0, *)
struct PaperCard: View {
    let fill: Color
    let shadowX: CGFloat
    let shadowY: CGFloat

    var body: some View {
        Rectangle()
            .fill(fill)
            .shadow(color: Palette.inkSoft, radius: 0, x: shadowX, y: shadowY)
    }
}

// MARK: - Modifiers

/// Liquid Glass on iOS 26+, tinted material blur before. `id` + `ns` drive the morph between HUD states.
@available(iOS 16.0, *)
struct GlassSurface<S: Shape>: ViewModifier {
    let tint: Color
    let shape: S
    let interactive: Bool
    let id: String
    let ns: Namespace.ID

    @ViewBuilder
    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .glassEffect(.regular.tint(tint).interactive(interactive), in: shape)
                .glassEffectID(id, in: ns)
        } else {
            content
                .background(
                    ZStack {
                        shape.fill(.regularMaterial)
                        shape.fill(tint)
                    }
                    .shadow(color: Palette.inkSoft, radius: 0, x: -8, y: 3)
                )
        }
    }
}

/// Reports the element's frame (hosting-view coordinates) for hit-testing and the `layout` event.
@available(iOS 16.0, *)
struct ReportRect: ViewModifier {
    let key: String
    let model: GlassHudModel

    func body(content: Content) -> some View {
        content
            .onGeometryChange(for: CGRect.self) { proxy in
                proxy.frame(in: .global)
            } action: { rect in
                model.setRect(key, rect)
            }
            .onDisappear { model.setRect(key, nil) }
    }
}
