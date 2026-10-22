import { defineConfig, devices } from '@playwright/test';

// Eigener Port je Lauf (E2E_PORT), Renderer im Web-Modus. EE_GPU=1: echte GPU (Mac/Metal), sonst SwiftShader.
const PORT = Number(process.env.E2E_PORT ?? 5190);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1728, height: 1161 },
    trace: 'retain-on-failure',
    launchOptions: {
      args: process.env.EE_GPU ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] : ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: {
    command: `EDITOR_WEB=1 node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1728, height: 1161 } } }],
});
