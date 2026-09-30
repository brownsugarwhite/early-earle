import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
// Dieselben Aliase wie vite.config.ts (vitest liest die Vite-Konfiguration nicht, sobald es diese Datei gibt).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('../../content', import.meta.url)),
    },
  },
  test: { name: 'game', include: ['src/**/*.test.ts', 'vite-plugins/**/*.test.ts'], passWithNoTests: true },
});
