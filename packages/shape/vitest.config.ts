import { defineConfig } from 'vitest/config';
// Die Geometrie-Tests (Ableitung, Maul, Zähne) laufen parallel zu allen Projekten; unter dieser Last überschreiten
// einzelne die 5 s des Standards, ohne falsch zu sein (15.10. nachts: Kanten, Beine, Langhals, Robbe 5,5–7 s). Tempo
// prüfen die Tests mit eigenen Schranken.
export default defineConfig({ test: { name: 'shape', include: ['src/**/*.test.ts'], passWithNoTests: true, testTimeout: 30_000 } });
