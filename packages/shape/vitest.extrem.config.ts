import { defineConfig } from 'vitest/config';
// Plan 20.10., V1: Prüfstand „Extremreihe“ als eigener Lauf (≈ 80 Bauten mit Linien und Durchdringungen); der normale Lauf
// prüft nur die schnellen Wächter in `extremreihe.test.ts`.
export default defineConfig({ test: { name: 'shape-extrem', include: ['src/**/*.extrem.ts'], testTimeout: 240_000 } });
