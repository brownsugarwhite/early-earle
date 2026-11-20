// Playwright für das Spiel (Plan 2.4, 7.1, 7.5): eigener Entwicklungsserver auf SPIEL_PORT (Standard 5292, Integration; Bau-Agenten
// ihre Probe-Ports), mit Schreibhaken; Specs nur in e2e/ (die Tests in test/ gehören vitest). Chromium und WebKit, WebKit im Format des
// iPhone 16. Jeder Lauf hat seinen eigenen Ordner wie bei Studio (apps/studio/playwright.config.ts):
//   STUDIO_INHALT=test-results/<paket>/inhalt  (Bau-Agenten, 2.4)  Inhalt dort, Ausgaben in test-results/<paket>/ausgaben
//   ohne STUDIO_INHALT                          (Integration)       test-results/playwright-<port>/inhalt und …/ausgaben
// STUDIO_INHALT muss unter test-results/ liegen: Playwright arbeitet nie auf Florians Inhalt (7.5).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const ORDNER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(ORDNER, '../..');
const TEST_ERGEBNISSE = path.join(WURZEL, 'test-results');
const SCHUTZ = path.join(WURZEL, 'apps/studio/scripts/proben/schutz.mjs');
const PORT = Number(process.env.SPIEL_PORT || 5292);

/** Inhaltskopie des Laufs: aus STUDIO_INHALT (relativ zum Wurzelordner, 2.4), sonst je Port eine eigene */
function inhaltsOrdner(): string {
  const roh = process.env.STUDIO_INHALT;
  if (!roh) return path.join(TEST_ERGEBNISSE, `playwright-${PORT}`, 'inhalt');
  const abs = path.resolve(WURZEL, roh);
  if (!abs.startsWith(TEST_ERGEBNISSE + path.sep) || path.dirname(abs) === TEST_ERGEBNISSE) {
    throw new Error(`STUDIO_INHALT=${roh}: Playwright arbeitet nur auf einer Kopie in test-results/<ordner>/… (Plan 2.4, 7.5).`);
  }
  if (path.basename(abs) === 'ausgaben') throw new Error(`STUDIO_INHALT=${roh}: „ausgaben“ daneben leert Playwright bei jedem Lauf.`);
  return abs;
}
const INHALT = inhaltsOrdner();
const AUSGABEN = path.join(path.dirname(INHALT), 'ausgaben');

/** NODE_OPTIONS des Servers: die vorhandenen und der Schreibhaken mit absolutem Pfad (6.3), nie doppelt. */
function nodeOptionen(): string {
  const da = process.env.NODE_OPTIONS ?? '';
  if (da.includes(SCHUTZ)) return da;
  const haken = /\s/.test(SCHUTZ) ? `--import="${SCHUTZ}"` : `--import=${SCHUTZ}`;
  return `${da} ${haken}`.trim();
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: AUSGABEN,
  snapshotPathTemplate: '{testDir}/bilder/{testFilePath}/{arg}{-projectName}{-snapshotSuffix}{ext}',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node ./node_modules/vite/bin/vite.js --port ${PORT} --strictPort --host 127.0.0.1`,
    cwd: ORDNER,
    url: `http://127.0.0.1:${PORT}/`,
    // immer ein eigener Server mit Schreibhaken und Kopie; ist der Port belegt, bricht der Lauf ab statt einen fremden zu nehmen
    reuseExistingServer: false,
    // Playwright legt env über process.env: Was hier steht, gilt für den Server
    env: {
      SPIEL_PORT: String(PORT),
      // relativ zum Wurzelordner des Arbeitsbaums (2.4)
      STUDIO_INHALT: path.relative(WURZEL, INHALT),
      // die Quelle „florian“ gibt es unter Automation nie (4.9, 7.5)
      STUDIO_FLORIAN: '',
      NODE_OPTIONS: nodeOptionen(),
    },
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['iPhone 16'] } },
  ],
});
