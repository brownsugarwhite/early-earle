import { defineConfig } from 'vitest/config';

// Nur src/ und test/: Die Playwright-Specs in e2e/ laufen nie in vitest (Plan 2.1).
// Tests laufen in Kindprozessen (forks, nie threads) mit dem Schreibhaken, gleich wie vitest gestartet wird (Plan 6.3).
const SCHUTZ = new URL('../studio/scripts/proben/schutz.mjs', import.meta.url).href;

export default defineConfig({
  test: {
    name: 'ozzy-spiel',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 30_000,
    pool: 'forks',
    execArgv: [`--import=${SCHUTZ}`],
  },
});
