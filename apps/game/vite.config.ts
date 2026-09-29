import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'node:url';
import { contentApi } from './vite-plugins/contentApi.ts';

// HTTPS ist Pflicht: WebGPU läuft nur in sicheren Kontexten. Ohne HTTPS fällt das iPhone still auf WebGL2 zurück.
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    ...(command === 'serve' && process.env.NO_SSL !== '1' ? [basicSsl()] : []),
    contentApi({ contentDir: fileURLToPath(new URL('../../content', import.meta.url)) }),
  ],
  resolve: {
    dedupe: ['three'],
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5173, strictPort: false },
  preview: { host: true, port: 4173 },
  build: { target: 'es2022', sourcemap: true },
  optimizeDeps: { include: ['three', 'three/webgpu', 'three/tsl'] },
}));
