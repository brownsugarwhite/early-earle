// Teststand „Blaupause“ bauen: eine einzige Seite (für das Artefakt) aus
//   - fenster.ts und gl.ts (hier),
//   - dem Kern und den Helfern des Editors aus dem festen Stand STAND des Zweigs `claude/form-zuerst` (per `git archive`, der
//     Arbeitsbaum der anderen Sitzung wird nicht angefasst),
//   - Florians gesicherten Formen aus `wesen/` desselben Stands (gzip, base64).
// Aufruf (aus diesem Ordner):  node bau.mjs            → dist/blaupause-teststand.html
//                              FORMEN=0 node bau.mjs   → ohne eingebettete Formen (klein, nur die Kugel)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, '../../../../..');
/** Stand des Editors (Zweig claude/form-zuerst, 11.11.2026 vormittags) */
const STAND = process.env.STAND || '6ba0bcb3';
/** Florians Formen in `wesen/` dieses Stands; die erste ist die Startform */
const FORMEN = process.env.FORMEN === '0' ? [] : ['strange bird', 'teat firefish', 'test_kaputt'];
const START = process.env.START || FORMEN[0] || 'kugel';

const req = createRequire(path.join(REPO, 'package.json'));
const esbuild = req(path.join(REPO, 'node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teststand-'));
execSync(
  `git archive ${STAND} packages/shape/src apps/editor/src/form/verfeinern.ts apps/editor/src/form/verfeinern.worker.ts apps/editor/src/form/ablage.ts apps/editor/src/viewports/ansicht2d.ts | tar -x -C "${tmp}"`,
  { cwd: REPO, stdio: ['ignore', 'inherit', 'inherit'] },
);
const form = path.join(tmp, 'apps/editor/src/form');
fs.copyFileSync(path.join(HIER, 'fenster.ts'), path.join(form, 'fenster.ts'));
fs.copyFileSync(path.join(HIER, 'gl.ts'), path.join(form, 'gl.ts'));

const gemeinsam = {
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: process.env.KLAR !== '1',
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
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
const m = await esbuild.build({ ...gemeinsam, entryPoints: [path.join(form, 'fenster.ts')], define: { __TESTSTAND_WORKER__: JSON.stringify(workerCode) } });
const code = m.outputFiles[0].text;

const formen = {};
for (const name of FORMEN) {
  const roh = execSync(`git show "${STAND}:wesen/${name}.eewesen"`, { cwd: REPO, maxBuffer: 64 << 20 });
  formen[name] = zlib.gzipSync(roh, { level: 9 }).toString('base64');
}
const knopfId = (n) => 'form-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const knoepfe = FORMEN.map((n) => `<button class="wahl" type="button" id="${knopfId(n)}" data-form="${n}">${n}</button>`).join('\n        ');
const html = fs
  .readFileSync(path.join(HIER, 'teststand.html'), 'utf8')
  .replace('<!--FORM_KNOEPFE-->', knoepfe)
  .replace('<!--FORMEN-->', () => `<script>window.__TESTSTAND_FORMEN=${JSON.stringify(formen)};window.__TESTSTAND_START=${JSON.stringify(START)};</script>`)
  // `</script` im Code würde das Skript beenden
  .replace('<!--BUNDLE-->', () => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`);
fs.mkdirSync(path.join(HIER, 'dist'), { recursive: true });
const aus = path.join(HIER, 'dist/blaupause-teststand.html');
fs.writeFileSync(aus, html);
fs.rmSync(tmp, { recursive: true, force: true });
const mb = (x) => (x / 1e6).toFixed(2) + ' MB';
console.log(`${aus}: ${mb(html.length)} (Code ${mb(code.length)}, Rechner ${mb(workerCode.length)}, Formen ${mb(Object.values(formen).reduce((s, f) => s + f.length, 0))})`);
