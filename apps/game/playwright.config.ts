import { defineConfig, devices } from '@playwright/test';

// Smoke-Tests: laufen ohne GPU (SwiftShader/WebGL2). Golden-Screenshots gehören auf den Mac, nicht in CI.
// 127.0.0.1 statt localhost: Node löst localhost zuerst nach ::1 auf, Vite lauscht auf IPv4 → sonst hängt der Server-Check.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  globalTimeout: 15 * 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'NO_SSL=1 pnpm exec vite --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
