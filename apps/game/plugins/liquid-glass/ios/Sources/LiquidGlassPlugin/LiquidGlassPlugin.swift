import Capacitor
import Foundation
import UIKit

/// `LiquidGlass` (JS name) — native SwiftUI HUD above the WKWebView.
/// Methods: isAvailable, show, update, hide, setSafeInsets. Events: `action` ({ id }), `layout` ({ top, bottom, safeTop, safeBottom, glass, line, actions }).
@objc(LiquidGlassPlugin)
public class LiquidGlassPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiquidGlassPlugin"
    public let jsName = "LiquidGlass"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSafeInsets", returnType: CAPPluginReturnPromise)
    ]

    /// `GlassOverlay` (iOS 16+) — typed access only inside `#available` blocks.
    private var overlayBox: AnyObject?

    @objc func isAvailable(_ call: CAPPluginCall) {
        var available = false
        var glass = false
        if #available(iOS 16.0, *) {
            available = true
            glass = GlassOverlay.hasLiquidGlass
        }
        call.resolve([
            "available": available,
            "glass": glass,
            "platform": "ios",
            "version": UIDevice.current.systemVersion
        ])
    }

    @objc func show(_ call: CAPPluginCall) {
        apply(call, visible: true)
    }

    @objc func update(_ call: CAPPluginCall) {
        apply(call, visible: nil)
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [self] in
            if #available(iOS 16.0, *), let overlay = overlayBox as? GlassOverlay {
                overlay.setVisible(false)
            }
            call.resolve()
        }
    }

    @objc func setSafeInsets(_ call: CAPPluginCall) {
        let top = call.getDouble("top") ?? 0
        let bottom = call.getDouble("bottom") ?? 0
        DispatchQueue.main.async { [self] in
            if #available(iOS 16.0, *), let overlay = overlay() {
                overlay.setExtraInsets(top: top, bottom: bottom)
            }
            call.resolve()
        }
    }

    private func apply(_ call: CAPPluginCall, visible: Bool?) {
        let patch = stringKeyed(call.options)
        DispatchQueue.main.async { [self] in
            guard #available(iOS 16.0, *), let overlay = overlay() else {
                call.reject("Native glass HUD needs iOS 16 or newer")
                return
            }
            overlay.apply(patch, animated: true)
            if let visible { overlay.setVisible(visible) }
            call.resolve(["glass": GlassOverlay.hasLiquidGlass])
        }
    }

    @available(iOS 16.0, *)
    private func overlay() -> GlassOverlay? {
        if let overlay = overlayBox as? GlassOverlay { return overlay }
        guard let host = bridge?.viewController else { return nil }
        let overlay = GlassOverlay(host: host)
        overlay.onAction = { [weak self] id in
            self?.notifyListeners("action", data: ["id": id])
        }
        overlay.onLayout = { [weak self] layout in
            self?.notifyListeners("layout", data: layout)
        }
        overlayBox = overlay
        return overlay
    }

    private func stringKeyed(_ options: [AnyHashable: Any]?) -> [String: Any] {
        var out: [String: Any] = [:]
        options?.forEach { key, value in
            if let k = key as? String { out[k] = value }
        }
        return out
    }
}
