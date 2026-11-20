// Vite für Studio (Plan 2.4): vier Seiten, Server-Erweiterungen aus server/plugins.ts, feste Stände.
//   dev            Entwicklungsserver auf STUDIO_PORT (Standard 5263), mit Neuladen; Probe-Ports nur mit --strictPort
//   stand:bauen    baut nach dist/<STUDIO_STAND>; STUDIO_STAND setzt scripts/studio-stand.mjs (pnpm studio:stand), sonst Abbruch
//   stand:zeigen   liefert dist/<Name aus der Textdatei dist/aktuell> aus (5217, pnpm studio)
// Ein laufender Server wechselt nie den Stand; erst ein Neustart nimmt den neuen. Tests und Proben bauen nie nach dist/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { type Connect, defineConfig, type Plugin } from 'vite';
import { studioPlugins } from './server/plugins.js';

const ORDNER = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ORDNER, 'dist');
/** Name eines Stands (<etappe>-<zeit>); nie „aktuell“, so heißt die Datei mit dem Namen des gezeigten Stands */
const STAND_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function standPfad(name: string, woher: string): string {
  if (!STAND_NAME.test(name) || name === 'aktuell') throw new Error(`${woher}: „${name}“ ist kein Name eines Stands.`);
  return path.join(DIST, name);
}

/** Ordner des festen Stands: beim Bauen aus STUDIO_STAND, beim Vorschauen aus dist/aktuell, im Entwicklungsserver keiner. */
function standOrdner(command: 'build' | 'serve', vorschau: boolean): string | undefined {
  if (command === 'build') {
    const stand = process.env.STUDIO_STAND;
    if (!stand) {
      throw new Error(
        'stand:bauen braucht STUDIO_STAND, den Namen des neuen Stands. ' +
          'Feste Stände baut nur „pnpm studio:stand“ (scripts/studio-stand.mjs).',
      );
    }
    return standPfad(stand, 'STUDIO_STAND');
  }
  if (!vorschau) return undefined;
  const datei = path.join(DIST, 'aktuell');
  if (!fs.existsSync(datei)) throw new Error(`Kein fester Stand: ${datei} fehlt. Zuerst „pnpm studio:stand“.`);
  const ordner = standPfad(fs.readFileSync(datei, 'utf8').trim(), datei);
  if (!fs.existsSync(path.join(ordner, 'index.html'))) throw new Error(`Der Stand ${ordner} fehlt oder ist unvollständig.`);
  return ordner;
}

/** COOP und COEP nur für die Messseite (crossOriginIsolated für die Uhr der Messblöcke; Plan 2.4, 8.2). */
function messenKopfzeilen(): Plugin {
  const setzen: Connect.NextHandleFunction = (req, res, weiter) => {
    const pfad = (req.url ?? '/').split('?')[0] ?? '/';
    if (/^\/messen(\.html)?\/?$/.test(pfad)) {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
    weiter();
  };
  return {
    name: 'studio-messen-kopfzeilen',
    configureServer(server) {
      server.middlewares.use(setzen);
    },
    configurePreviewServer(server) {
      server.middlewares.use(setzen);
    },
  };
}

export default defineConfig(({ command, isPreview }) => {
  const outDir = standOrdner(command, isPreview === true);
  return {
    root: ORDNER,
    base: './',
    appType: 'mpa',
    plugins: [...studioPlugins(), react(), messenKopfzeilen()],
    server: { port: Number(process.env.STUDIO_PORT || 5263), strictPort: true, host: true, watch: { ignored: ['**/dist/**'] } },
    preview: { port: 5217, strictPort: true, host: true },
    optimizeDeps: { entries: ['index.html', 'messen.html', 'pruefen.html', 'p1.html', 'e2e/seiten/*.html'] },
    worker: { format: 'es' },
    build: {
      target: 'es2022',
      sourcemap: true,
      ...(outDir === undefined ? {} : { outDir, emptyOutDir: true }),
      rolldownOptions: {
        input: {
          index: path.join(ORDNER, 'index.html'),
          messen: path.join(ORDNER, 'messen.html'),
          pruefen: path.join(ORDNER, 'pruefen.html'),
          p1: path.join(ORDNER, 'p1.html'),
        },
      },
    },
  };
});
