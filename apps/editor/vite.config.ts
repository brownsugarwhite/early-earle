import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';

// EDITOR_WEB=1: nur der Renderer im Browser (Vorschau, Playwright). Sonst baut vite-plugin-electron
// Hauptprozess (ESM) und Preload (CJS, weil das Fenster mit sandbox läuft) und startet Electron.
const web = process.env.EDITOR_WEB === '1';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(web
      ? []
      : electron([
          { entry: 'electron/main.ts' },
          {
            onstart({ reload }) {
              reload();
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                rolldownOptions: {
                  input: 'electron/preload.ts',
                  output: { format: 'cjs', entryFileNames: 'preload.cjs', codeSplitting: false },
                },
              },
            },
          },
        ])),
  ],
  server: { port: 5181, strictPort: true },
  resolve: { dedupe: ['three'] },
  optimizeDeps: { include: ['three', 'three/webgpu', 'three/tsl'] },
  build: { target: 'es2022', outDir: 'dist', sourcemap: true },
});
