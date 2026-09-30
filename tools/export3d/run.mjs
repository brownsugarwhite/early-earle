#!/usr/bin/env node
/**
 * Startet den Export der 3D-Inhalte aus den echten Spiel-Generatoren (Wesen, Module, REX, Map, Spielfeld,
 * Paletten) als GLB + manifest.json. Läuft in Node über Vites SSR-Modul-Runner mit der Vite-Konfiguration des
 * Spiels (gleiche Aliase `@/`, `@content/`, `import.meta.glob`) — kein Browser, keine GPU nötig.
 *
 *   node tools/export3d/run.mjs [--out assets/blender/_export] [--only wesen,module,rex,map,spielfeld,paletten] [--quick]
 *
 * Danach baut `tools/blender/build_library.py` die .blend (siehe `pnpm assets:blender`, docs/BLENDER.md).
 */
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const appDir = path.join(root, 'apps/game');
const argv = process.argv.slice(2);
const outArg = argv.indexOf('--out');
const out = path.resolve(root, outArg >= 0 && argv[outArg + 1] ? argv[outArg + 1] : 'assets/blender/_export');

process.env.NO_SSL = '1';
const server = await createServer({
  root: appDir,
  configFile: path.join(appDir, 'vite.config.ts'),
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: 'custom',
  logLevel: 'warn',
  // Eigener Cache: der Dev-Server des Spiels behält seinen.
  cacheDir: path.join(out, '.vite-cache'),
  optimizeDeps: { noDiscovery: true },
});
let code = 1;
try {
  const mod = await server.ssrLoadModule(path.join(here, 'src/main.ts'));
  code = await mod.main({ root, out, argv });
} catch (e) {
  console.error('Export fehlgeschlagen:', e);
  code = 1;
} finally {
  await server.close();
}
process.exit(code);
