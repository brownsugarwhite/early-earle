import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iPhone-first shell: splash ink (#081b25, same as launch screen, loader and 3D scene) under the web view (no flash), no scroll/zoom/inset games —
 * the canvas is fullscreen and the native Liquid-Glass HUD (plugins/liquid-glass) floats above it.
 * WebGPU in WKWebView needs nothing special on iOS 26+ (WebGL2 fallback below and in the simulator).
 */
const config: CapacitorConfig = {
  appId: 'com.illudiy.earlyearle',
  appName: 'early earle',
  webDir: 'dist',
  backgroundColor: '#081b25',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    zoomEnabled: false,
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    backgroundColor: '#081b25',
  },
};

export default config;
