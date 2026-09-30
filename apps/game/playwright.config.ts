import { defineConfig, devices } from '@playwright/test';

// Smoke-Tests: laufen ohne GPU (SwiftShader/WebGL2). Golden-Screenshots gehören auf den Mac, nicht in CI.
// 127.0.0.1 statt localhost: Node löst localhost zuerst nach ::1 auf, Vite lauscht auf IPv4 → sonst hängt der Server-Check.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  // SwiftShader on the GitHub runners needs ~16 min for the whole suite (audio, REX, flow with long CI waits).
  globalTimeout: (process.env.CI ? 32 : 15) * 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'NO_SSL=1 node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort',
    stdout: 'ignore',
    stderr: 'pipe',
    url: 'http://127.0.0.1:4173',
    // scripts/e2e.mjs startet den Server selbst und setzt PW_REUSE_SERVER=1; direkter `playwright test` startet ihn hier.
    reuseExistingServer: !process.env.CI || process.env.PW_REUSE_SERVER === '1',
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
