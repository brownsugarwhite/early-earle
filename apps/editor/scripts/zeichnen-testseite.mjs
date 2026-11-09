// Testseite „Zeichnen und Aufblasen“ (09.11.2026): baut `zeichnen.html` und legt alles in eine einzige HTML-Datei (CSS und JS
// inline, ohne <html>/<head>/<body>, weil die Artefakt-Seite das Gerüst selbst setzt), dazu `vorschau.html` mit Gerüst zum
// Ansehen im Browser. Veröffentlicht wird die erste Datei als Artefakt (Link für Florian, auch auf dem iPhone).
// Aufruf aus apps/editor:  node scripts/zeichnen-testseite.mjs <ausgabeordner>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'vite';

const aus = resolve(process.argv[2] ?? 'pruefen-ausgabe/testseite');
const dist = join(aus, 'dist');
const wurzel = resolve('.');
await build({
  configFile: false,
  root: wurzel,
  base: './',
  logLevel: 'warn',
  publicDir: false,
  resolve: { dedupe: ['three'] },
  build: {
    target: 'es2022',
    outDir: dist,
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    chunkSizeWarningLimit: 2000,
    rolldownOptions: { input: join(wurzel, 'zeichnen.html'), output: { codeSplitting: false } },
  },
});
const html = readFileSync(join(dist, 'zeichnen.html'), 'utf8');
const datei = (endung) => readFileSync(join(dist, 'assets', readdirSync(join(dist, 'assets')).find((n) => n.endsWith(endung))), 'utf8');
const js = datei('.js');
const css = datei('.css');
const koerper = /<body>([\s\S]*)<\/body>/.exec(html)[1].trim();
if (js.includes('</script') || js.includes('<!--')) throw new Error('Das Skript lässt sich so nicht einbetten');
const rand = `
/* Testseite: Rand nach dem Seitenvertrag der Artefakte, 16 px seitlich und die Safe-Area oben und unten; ein Thema, Papier wie im Editor */
#raster {
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: env(safe-area-inset-top, 0px) env(safe-area-inset-bottom, 0px);
}
`;
const seite =
  '<title>Zeichnen und Aufblasen</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' +
  `<style>\n${css}${rand}</style>\n${koerper}\n<script type="module">\n${js}\n</script>\n`;
writeFileSync(join(aus, 'zeichnen-und-aufblasen.html'), seite);
writeFileSync(
  join(aus, 'vorschau.html'),
  '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}</style>' +
    `</head><body>\n${seite}</body></html>\n`,
);
console.log(`${join(aus, 'zeichnen-und-aufblasen.html')} (${Math.round(seite.length / 1024)} KB)`);
