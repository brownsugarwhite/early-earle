import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Dieselben Aliase wie in vite.config.ts, damit Tests Module mit Inhalten (@content/…) laden können.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('../../content', import.meta.url)),
    },
  },
  test: { name: 'game', include: ['src/**/*.test.ts', 'vite-plugins/**/*.test.ts'], passWithNoTests: true },
});
