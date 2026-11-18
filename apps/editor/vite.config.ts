import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';
import electron from 'vite-plugin-electron';

// EDITOR_WEB=1: nur der Renderer im Browser (Vorschau, Playwright). Sonst baut vite-plugin-electron
// Hauptprozess (ESM) und Preload (CJS, weil das Fenster mit sandbox läuft) und startet Electron.
const web = process.env.EDITOR_WEB === '1';

/**
 * Ablage für Wesen aus `kurven.html` (nur im Dev-Server; 10.11.2026): „Sichern“ legt eine Datei `<Name>.eewesen` in den Ordner
 * `wesen/` des Arbeitsbaums, „Laden“ liest sie von dort. So liegen Florians Wesen als Dateien neben dem Code (zum Messen, zum
 * Aufheben), ohne Dialoge des Browsers.
 *   GET  /__wesen/        Liste: Name, Größe, Zeit, Punkte, Loops (aus dem Kopf der Datei)
 *   GET  /__wesen/<Name>  die Datei
 *   PUT  /__wesen/<Name>  schreiben (überschreibt)
 * Namen: Buchstaben, Ziffern, Leerzeichen, Punkt, Strich, Unterstrich; nichts, was aus dem Ordner hinausführt. Schreiben nur von
 * der eigenen Seite (Origin).
 */
function wesenAblage(): Plugin {
  const ordner = fileURLToPath(new URL('../../wesen/', import.meta.url));
  const ENDUNG = '.eewesen';
  const gueltig = (name: string): boolean => /^[\p{L}\p{N}][\p{L}\p{N} _.-]{0,59}$/u.test(name) && !name.includes('..');
  /** Punkte und Loops aus dem Kopf der Datei (Kennung 6 Bytes, Länge 4 Bytes, dann JSON) */
  const kopfInfo = (datei: string): { punkte: number; loops: number } => {
    try {
      const fd = fs.openSync(datei, 'r');
      try {
        const vorn = Buffer.alloc(10);
        fs.readSync(fd, vorn, 0, 10, 0);
        const laenge = vorn.readUInt32LE(6);
        if (vorn.subarray(0, 6).toString() !== 'EEKW1\n' || laenge > 64e6) return { punkte: 0, loops: 0 };
        const kopf = Buffer.alloc(laenge);
        fs.readSync(fd, kopf, 0, laenge, 10);
        const k = JSON.parse(kopf.toString('utf8')) as { stand?: { haut?: { n?: number }; loops?: unknown[] } };
        return { punkte: k.stand?.haut?.n ?? 0, loops: k.stand?.loops?.length ?? 0 };
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return { punkte: 0, loops: 0 };
    }
  };
  return {
    name: 'ee-wesen-ablage',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__wesen', (req, res) => {
        const antworten = (status: number, text: string, art = 'text/plain; charset=utf-8'): void => {
          res.statusCode = status;
          res.setHeader('content-type', art);
          res.setHeader('cache-control', 'no-store');
          res.end(text);
        };
        try {
          const roh = decodeURIComponent((req.url ?? '/').split('?')[0]!.replace(/^\//, ''));
          if (req.method === 'GET' && roh === '') {
            const liste = fs.existsSync(ordner)
              ? fs
                  .readdirSync(ordner)
                  .filter((f) => f.endsWith(ENDUNG))
                  .map((f) => {
                    const st = fs.statSync(path.join(ordner, f));
                    return { name: f.slice(0, -ENDUNG.length), bytes: st.size, zeit: st.mtime.toISOString(), ...kopfInfo(path.join(ordner, f)) };
                  })
              : [];
            antworten(200, JSON.stringify(liste), 'application/json; charset=utf-8');
            return;
          }
          if (!gueltig(roh)) {
            antworten(400, 'Name nicht erlaubt');
            return;
          }
          const datei = path.join(ordner, roh + ENDUNG);
          if (req.method === 'GET') {
            if (!fs.existsSync(datei)) {
              antworten(404, 'gibt es nicht');
              return;
            }
            res.statusCode = 200;
            res.setHeader('content-type', 'application/octet-stream');
            res.setHeader('cache-control', 'no-store');
            fs.createReadStream(datei).pipe(res);
            return;
          }
          if (req.method === 'PUT') {
            // nur von der eigenen Seite
            const origin = req.headers.origin;
            if (origin && new URL(origin).host !== req.headers.host) {
              antworten(403, 'nur von der eigenen Seite');
              return;
            }
            const teile: Buffer[] = [];
            let bytes = 0;
            req.on('data', (t: Buffer) => {
              bytes += t.length;
              if (bytes > 300e6) req.destroy();
              else teile.push(t);
            });
            req.on('end', () => {
              try {
                const alles = Buffer.concat(teile);
                if (alles.subarray(0, 6).toString() !== 'EEKW1\n') {
                  antworten(400, 'keine Wesen-Datei');
                  return;
                }
                fs.mkdirSync(ordner, { recursive: true });
                // erst daneben schreiben, dann umbenennen: Eine halbe Datei ersetzt nie eine ganze
                const neben = `${datei}.neu`;
                fs.writeFileSync(neben, alles);
                fs.renameSync(neben, datei);
                antworten(200, 'gesichert');
              } catch (e) {
                antworten(500, e instanceof Error ? e.message : String(e));
              }
            });
            return;
          }
          antworten(405, 'nur GET und PUT');
        } catch (e) {
          antworten(500, e instanceof Error ? e.message : String(e));
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    wesenAblage(),
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
