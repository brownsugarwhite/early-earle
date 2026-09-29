import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'world', include: ['src/**/*.test.ts'], passWithNoTests: true } });
