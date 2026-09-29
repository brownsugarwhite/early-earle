import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iPhone-first shell: ink background under the web view (no white flash), no scroll/zoom/inset games —
 * the canvas is fullscreen and the native Liquid-Glass HUD (plugins/liquid-glass) floats above it.
 * WebGPU in WKWebView needs nothing special on iOS 26+ (WebGL2 fallback below and in the simulator).
 */
const config: CapacitorConfig = {
  appId: 'com.illudiy.earlyearle',
  appName: 'early earle',
  webDir: 'dist',
  backgroundColor: '#0f1c22',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    zoomEnabled: false,
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    backgroundColor: '#0f1c22',
  },
};

export default config;
