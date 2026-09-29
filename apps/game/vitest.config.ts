import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'game', include: ['src/**/*.test.ts', 'vite-plugins/**/*.test.ts'], passWithNoTests: true } });
