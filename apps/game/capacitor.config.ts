import type { CapacitorConfig } from '@capacitor/cli';

/**
 * iPhone-first shell: ink background under the web view (no white flash), no scroll/zoom/inset games —
 * the canvas is fullscreen and the native Liquid-Glass HUD (plugins/liquid-glass) floats above it.
 * WebGPU in WKWebView needs nothing special on iOS 26+ (WebGL2 fallback below and in the simulator).
 */
// Nur zur Diagnose im Simulator: `CAP_SERVER_URL=http://127.0.0.1:5199/play pnpm exec cap sync ios` lässt die App
// vom Dev-Server laden (HMR, URL-Parameter wie `?shadowcompat=`). Ohne die Variable bleibt das gebündelte `dist/`.
const devServer = process.env['CAP_SERVER_URL'];

const config: CapacitorConfig = {
  appId: 'com.illudiy.earlyearle',
  appName: 'early earle',
  webDir: 'dist',
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
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
