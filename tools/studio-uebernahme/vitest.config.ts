import { defineConfig } from 'vitest/config';

// Tests laufen in Kindprozessen (forks, nie threads) mit dem Schreibhaken, gleich wie vitest gestartet wird (Plan 6.3).
const SCHUTZ = new URL('../../apps/studio/scripts/proben/schutz.mjs', import.meta.url).href;

export default defineConfig({
  test: {
    name: 'studio-uebernahme',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 30_000,
    pool: 'forks',
    execArgv: [`--import=${SCHUTZ}`],
  },
});
