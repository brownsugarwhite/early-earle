import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'physics', include: ['src/**/*.test.ts'], passWithNoTests: true } });
