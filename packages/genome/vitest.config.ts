import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'genome', include: ['src/**/*.test.ts'], passWithNoTests: true } });
