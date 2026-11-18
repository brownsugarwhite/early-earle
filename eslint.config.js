// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', 'apps/godot/**', 'ref/**', 'apps/game/ios/build/**', 'apps/game/ios/build-device/**', '.claude/**', 'apps/game/ios/App/App/public/**', 'apps/game/android/**/build/**', 'apps/editor/dist-electron/**', 'apps/editor/release/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
