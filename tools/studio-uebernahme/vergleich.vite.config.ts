// Vergleichsserver 5294 (Plan 6.3, 2.4): Florians Prototyp aus apps/editor als Vergleich für die Proben der Integration, nie sein 5213.
// Start nur in Proben der Integration, mit Schreibhaken: pnpm --filter @ee/studio-uebernahme vergleich (Port 5294, --strictPort).
//
// Eine eigene Konfiguration statt apps/editor/vite.config.ts, weil kein eigener Prozess unter apps/editor/ schreiben darf (Plan 2.5):
// - Wurzel apps/editor, aber ein eigener Zwischenspeicher unter test-results/vergleich/vite. Ein zweiter Server mit dem Zwischenspeicher
//   von apps/editor löschte ihn nach jedem pnpm install beim Start unter dem laufenden 5213.
// - Ohne Schreibwege: nichts aus den Ablagen des Prototyps (/__wesen, /__ozzy-figur/schluessel), kein Electron. Schreibversuche dorthin
//   beantwortet der Server mit 405. Die Proben leiten **/__ozzy-figur/schluessel ohnehin mit page.route um; vergisst eine das, liefert
//   der Server seine schluessel.json nur zum Lesen, wie die Umleitung.
// - Ein versehentliches `vite build` mit dieser Konfiguration schreibt nach test-results/vergleich/dist, nie nach apps/editor/dist.
// Übernommen aus apps/editor/vite.config.ts ist nur, was die Seiten zum Ausliefern brauchen: React, dedupe und Vorbündeln von three.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';

/** absoluter Pfad im Arbeitsbaum (diese Datei liegt in tools/studio-uebernahme/) */
const imArbeitsbaum = (pfad: string): string => fileURLToPath(new URL(`../../${pfad}`, import.meta.url));

/** Florians Schlüsseldatei: nur gelesen */
const SCHLUESSEL = imArbeitsbaum('docs/look/ozzy-figur/schluessel.json');
/** wie der Prototyp ohne Datei: keine Schlüssel */
const OHNE_SCHLUESSEL = '{"version":1,"kopf":[]}\n';

/** Die Wege der Ablagen des Prototyps: nur lesen, nie schreiben */
function nurLesen(): Plugin {
  return {
    name: 'studio-vergleich-nur-lesen',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pfad = (req.url ?? '/').split('?')[0] ?? '/';
        if (!pfad.startsWith('/__ozzy-figur') && !pfad.startsWith('/__wesen')) {
          next();
          return;
        }
        const antworten = (status: number, text: string, art = 'text/plain; charset=utf-8'): void => {
          res.statusCode = status;
          res.setHeader('content-type', art);
          res.setHeader('cache-control', 'no-store');
          res.end(text);
        };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          server.config.logger.warn(`Vergleichsserver: ${req.method ?? '?'} ${pfad} abgelehnt (nur lesen)`);
          antworten(405, 'Vergleichsserver: nur lesen');
          return;
        }
        if (pfad === '/__ozzy-figur/schluessel') {
          antworten(200, existsSync(SCHLUESSEL) ? readFileSync(SCHLUESSEL, 'utf8') : OHNE_SCHLUESSEL, 'application/json; charset=utf-8');
          return;
        }
        antworten(404, 'Vergleichsserver: ohne Ablage');
      });
    },
  };
}

export default defineConfig({
  root: imArbeitsbaum('apps/editor'),
  cacheDir: imArbeitsbaum('test-results/vergleich/vite'),
  plugins: [nurLesen(), react()],
  server: { port: 5294, strictPort: true },
  resolve: { dedupe: ['three'] },
  optimizeDeps: { include: ['three', 'three/webgpu', 'three/tsl'] },
  build: { outDir: imArbeitsbaum('test-results/vergleich/dist'), emptyOutDir: true },
  clearScreen: false,
});
