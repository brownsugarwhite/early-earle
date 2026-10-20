import { defineConfig } from 'vitest/config';
// Die Geometrie-Tests (Schnitte je Prüfwesen) laufen parallel zu allen Projekten; auf dem CI-Rechner überschritt der
// Schnitte-Test die 5 s des Standards (5,2 s, Plan 20.10., V0), ohne falsch zu sein. Tempo prüfen die Tests selbst.
export default defineConfig({ test: { name: 'editor', include: ['src/**/*.test.ts'], passWithNoTests: true, testTimeout: 30_000 } });
