import SwiftUI

// The native HUD: top pill (level, moves, goals), REX line, action row.
// iOS 26+: Liquid Glass (`glassEffect` inside one `GlassEffectContainer`, pills morph via `glassEffectID`).
// iOS 16–18: system material blur (UIVisualEffectView under the hood) with the same layout.
// Style rules (docs/STYLE.md, GDD 10.2): no outlines, hard offset shadows in the sun direction only on paper
// elements, jewel-toned tints over the ink background, chunky black grotesk type, ≤ 8 words.

@available(iOS 16.0, *)
struct GlassHudRoot: View {
    @ObservedObject var model: GlassHudModel
    @Namespace private var ns

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
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                if !s.actions.isEmpty {
                    HStack(spacing: 12) {
                        ForEach(s.actions) { a in
                            let pillTint = a.tint.flatMap { Color(validHex: $0)?.opacity(0.7) } ?? (a.primary ? accent : tint)
                            ActionPill(action: a) { model.onAction?(a.id) }
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
                Text(top.title)
                    .font(.system(size: 15, weight: .black))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            if !top.moves.isEmpty {
                VStack(spacing: 3) {
                    Text(top.moves)
                        .font(.system(size: 20, weight: .black))
                        .monospacedDigit()
                    Text("ZÜGE")
                        .font(.system(size: 9, weight: .black))
                        .tracking(1.6)
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

@available(iOS 16.0, *)
struct ActionPill: View {
    let action: HudAction
    let tap: () -> Void

    var body: some View {
        Button(action: tap) {
            HStack(spacing: 8) {
                if let icon = action.icon {
                    Image(systemName: icon).font(.system(size: 14, weight: .black))
                }
                Text(action.label.uppercased())
                    .font(.system(size: 15, weight: .black))
                    .tracking(0.9)
                    .lineLimit(1)
            }
            .padding(.vertical, 14)
            .padding(.horizontal, 22)
            .frame(minWidth: 96, minHeight: 48)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
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
