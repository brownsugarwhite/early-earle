import SwiftUI
import UIKit

/// Container above the WKWebView: only points inside a reported glass element are hit; everything else
/// falls through to the web view (canvas swipes, planet drag).
final class PassthroughView: UIView {
    var hitRects: [CGRect] = []

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        guard !isHidden, alpha > 0.5, isUserInteractionEnabled else { return nil }
        guard hitRects.contains(where: { $0.insetBy(dx: -6, dy: -6).contains(point) }) else { return nil }
        return super.hitTest(point, with: event)
    }
}

/// Hosts the SwiftUI HUD as a child view controller of the Capacitor bridge view controller.
@available(iOS 16.0, *)
final class GlassOverlay {
    static var hasLiquidGlass: Bool {
        if #available(iOS 26.0, *) { return true }
        return false
    }

    let model = GlassHudModel()
    private let container = PassthroughView()
    private let hosting: UIHostingController<GlassHudRoot>
    private weak var host: UIViewController?
    private var lastLayout: [String: Double] = [:]
    private(set) var visible = false

    var onAction: ((String) -> Void)?
    var onLayout: (([String: Any]) -> Void)?

    init(host: UIViewController) {
        self.host = host
        hosting = UIHostingController(rootView: GlassHudRoot(model: model))
        hosting.view.backgroundColor = .clear
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = .clear
        container.translatesAutoresizingMaskIntoConstraints = false
        container.isHidden = true
        container.alpha = 0

        host.addChild(hosting)
        container.addSubview(hosting.view)
        host.view.addSubview(container)
        NSLayoutConstraint.activate([
            hosting.view.topAnchor.constraint(equalTo: container.topAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            hosting.view.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            container.topAnchor.constraint(equalTo: host.view.topAnchor),
            container.bottomAnchor.constraint(equalTo: host.view.bottomAnchor),
            container.leadingAnchor.constraint(equalTo: host.view.leadingAnchor),
            container.trailingAnchor.constraint(equalTo: host.view.trailingAnchor)
        ])
        hosting.didMove(toParent: host)

        model.onAction = { [weak self] id in
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            self?.onAction?(id)
        }
        model.onRects = { [weak self] rects in self?.rectsChanged(rects) }
    }

    func apply(_ patch: [String: Any], animated: Bool) {
        var next = model.state
        next.apply(patch: patch)
        guard next != model.state else { return }
        if animated {
            withAnimation(.spring(response: 0.42, dampingFraction: 0.74)) { model.state = next }
        } else {
            model.state = next
        }
    }

    func setVisible(_ visible: Bool) {
        self.visible = visible
        host?.view.bringSubviewToFront(container)
        if visible {
            container.isHidden = false
            UIView.animate(withDuration: 0.35, delay: 0, options: [.beginFromCurrentState, .curveEaseOut]) {
                self.container.alpha = 1
            }
        } else {
            UIView.animate(withDuration: 0.3, delay: 0, options: [.beginFromCurrentState, .curveEaseOut]) {
                self.container.alpha = 0
            } completion: { _ in
                if !self.visible { self.container.isHidden = true }
            }
        }
    }

    func setExtraInsets(top: Double, bottom: Double) {
        model.extraTop = CGFloat(max(0, top))
        model.extraBottom = CGFloat(max(0, bottom))
    }

    /// Hit rects for the passthrough container + `layout` event (points == CSS px in the WKWebView).
    private func rectsChanged(_ rects: [String: CGRect]) {
        // The REX line is paper, not a control: it reports its frame but lets swipes through.
        container.hitRects = rects.filter { !$0.key.hasPrefix("rex-") }.map { $0.value }
        // During a line change the old and the new card overlap: the union covers both.
        let lineRects = rects.filter { $0.key.hasPrefix("rex-") }.map { $0.value }
        let lineUnion = lineRects.dropFirst().reduce(lineRects.first) { acc, r in acc?.union(r) }
        let height = Double(container.bounds.height)
        let safe = container.safeAreaInsets
        let top = rects["top"].map { Double($0.maxY) } ?? 0
        let actionRects = rects.filter { $0.key.hasPrefix("action-") }.map { $0.value }
        let actionsUnion = actionRects.dropFirst().reduce(actionRects.first) { acc, r in acc?.union(r) }
        let bottom = actionsUnion.map { max(0, height - Double($0.minY)) } ?? 0
        var layout: [String: Double] = [
            "top": top,
            "bottom": bottom,
            "safeTop": Double(safe.top),
            "safeBottom": Double(safe.bottom)
        ]
        // Flat keys for the change check; nested rects in the payload.
        func put(_ name: String, _ r: CGRect?) {
            guard let r else { return }
            layout[name + "Left"] = Double(r.minX)
            layout[name + "Top"] = Double(r.minY)
            layout[name + "Right"] = Double(r.maxX)
            layout[name + "Bottom"] = Double(r.maxY)
        }
        put("line", lineUnion)
        put("actions", actionsUnion)
        guard layout != lastLayout else { return }
        lastLayout = layout
        var payload: [String: Any] = [
            "top": top,
            "bottom": bottom,
            "safeTop": Double(safe.top),
            "safeBottom": Double(safe.bottom),
            "glass": Self.hasLiquidGlass
        ]
        func rectPayload(_ r: CGRect?) -> Any {
            guard let r else { return NSNull() }
            return ["left": Double(r.minX), "top": Double(r.minY), "right": Double(r.maxX), "bottom": Double(r.maxY)]
        }
        payload["line"] = rectPayload(lineUnion)
        payload["actions"] = rectPayload(actionsUnion)
        onLayout?(payload)
    }
}
