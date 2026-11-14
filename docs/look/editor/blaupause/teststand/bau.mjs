// Artefakt „Wesen-Editor“ bauen: eine einzige Seite aus `/editor` des Editors (Zweig `claude/form-spiegel`):
//   - apps/editor/editor.html (Gerüst, Stil, Leiste), apps/editor/src/form/editor.ts (Fenster) und blaupause.ts (Darstellung),
//   - dem Kern und den Helfern desselben Stands (per `git archive`; kein Arbeitsbaum wird angefasst),
//   - Florians gesicherten Formen aus `wesen/` desselben Stands (gzip, base64), dazu der Hintergrund-Rechner als Text.
// Aufruf (aus diesem Ordner):  node bau.mjs            → dist/wesen-editor.html
//                              QUELLE=<commit> node bau.mjs   (Standard: claude/form-spiegel)
//                              FORMEN=0 node bau.mjs  → ohne eingebettete Formen (klein, nur die Kugel)
// Bis 11.11. mittags baute dieses Skript den „Blaupause Teststand“ aus einer Kopie in diesem Ordner (Commit 087ae214).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, '../../../../..');
const QUELLE = process.env.QUELLE || 'claude/form-spiegel';
/** Florians Formen in `wesen/` dieses Stands; die erste ist die Startform */
const FORMEN = process.env.FORMEN === '0' ? [] : ['strange bird', 'teat firefish', 'test_kaputt'];
const START = process.env.START || FORMEN[0] || 'kugel';

const req = createRequire(path.join(REPO, 'package.json'));
const esbuild = req(path.join(REPO, 'node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wesen-editor-'));
execSync(`git archive ${QUELLE} packages/shape/src apps/editor/src/form apps/editor/src/viewports/ansicht2d.ts apps/editor/editor.html | tar -x -C "${tmp}"`, {
  cwd: REPO,
  stdio: ['ignore', 'inherit', 'inherit'],
});
const form = path.join(tmp, 'apps/editor/src/form');

const gemeinsam = {
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: process.env.KLAR !== '1',
  legalComments: 'none',
  write: false,
  logLevel: 'error',
  alias: {
    '@ee/shape/dicht': path.join(tmp, 'packages/shape/src/dicht/index.ts'),
    '@ee/shape': path.join(tmp, 'packages/shape/src/index.ts'),
  },
  // three aus dem Editor; meshoptimizer liegt im Speicher von pnpm (im Hauptarbeitsbaum ist er beim Kern noch nicht verlinkt)
  nodePaths: [
    path.join(REPO, 'apps/editor/node_modules'),
    path.join(REPO, 'packages/shape/node_modules'),
    path.join(REPO, 'node_modules/.pnpm/meshoptimizer@1.1.1/node_modules'),
    path.join(REPO, 'node_modules/.pnpm/node_modules'),
    path.join(REPO, 'node_modules'),
  ],
};
const w = await esbuild.build({ ...gemeinsam, entryPoints: [path.join(form, 'verfeinern.worker.ts')] });
const workerCode = w.outputFiles[0].text;
const m = await esbuild.build({ ...gemeinsam, entryPoints: [path.join(form, 'editor.ts')], define: { __TESTSTAND_WORKER__: JSON.stringify(workerCode) } });
const code = m.outputFiles[0].text;

const formen = {};
for (const name of FORMEN) {
  const roh = execSync(`git show "${QUELLE}:wesen/${name}.eewesen"`, { cwd: REPO, maxBuffer: 64 << 20 });
  formen[name] = zlib.gzipSync(roh, { level: 9 }).toString('base64');
}
const knopfId = (n) => 'form-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const knoepfe = FORMEN.map((n) => `<button class="wahl" type="button" id="${knopfId(n)}" data-form="${n}">${n}</button>`).join('\n        ');

// Seite fürs Artefakt: ohne eigenes Gerüst (das setzt das Artefakt), das Modul-Skript des Dev-Servers wird zum eingebetteten Bündel
let html = fs.readFileSync(path.join(tmp, 'apps/editor/editor.html'), 'utf8');
const weg = [/<!doctype html>\s*/i, /<html[^>]*>\s*/i, /<head>\s*/i, /<meta charset="utf-8">\s*/i, /<meta name="viewport"[^>]*>\s*/i, /<\/head>\s*/i, /<body>\s*/i, /<\/body>\s*/i, /<\/html>\s*/i];
for (const r of weg) html = html.replace(r, '');
const modul = '<script type="module" src="./src/form/editor.ts"></script>';
if (!html.includes(modul)) throw new Error('Modul-Skript in editor.html nicht gefunden');
html = html
  .replace('<!--FORM_KNOEPFE-->', knoepfe)
  .replace('<!--FORMEN-->', () => `<script>window.__TESTSTAND_FORMEN=${JSON.stringify(formen)};window.__TESTSTAND_START=${JSON.stringify(START)};</script>`)
  // `</script` im Code würde das Skript beenden
  .replace(modul, () => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`);
fs.mkdirSync(path.join(HIER, 'dist'), { recursive: true });
const aus = path.join(HIER, 'dist/wesen-editor.html');
fs.writeFileSync(aus, html);
fs.rmSync(tmp, { recursive: true, force: true });
const mb = (x) => (x / 1e6).toFixed(2) + ' MB';
console.log(`${aus}: ${mb(html.length)} (Code ${mb(code.length)}, Rechner ${mb(workerCode.length)}, Formen ${mb(Object.values(formen).reduce((s, f) => s + f.length, 0))}) aus ${QUELLE}`);
