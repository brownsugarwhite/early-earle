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
        container.hitRects = Array(rects.values)
        let height = Double(container.bounds.height)
        let safe = container.safeAreaInsets
        let top = rects["top"].map { Double($0.maxY) } ?? 0
        let actionsMinY = rects.filter { $0.key.hasPrefix("action-") }.values.map { Double($0.minY) }.min()
        let bottom = actionsMinY.map { max(0, height - $0) } ?? 0
        let layout: [String: Double] = [
            "top": top,
            "bottom": bottom,
            "safeTop": Double(safe.top),
            "safeBottom": Double(safe.bottom)
        ]
        guard layout != lastLayout else { return }
        lastLayout = layout
        var payload: [String: Any] = layout
        payload["glass"] = Self.hasLiquidGlass
        onLayout?(payload)
    }
}
