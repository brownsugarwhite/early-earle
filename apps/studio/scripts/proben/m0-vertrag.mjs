// Probe M0 (a) (Plan 5.3, 7.4), aus dem Wurzelordner des Arbeitsbaums, mit Schreibhaken:
//   NODE_OPTIONS=--import=$PWD/apps/studio/scripts/proben/schutz.mjs node apps/studio/scripts/proben/m0-vertrag.mjs [<teil> …]
// Vier Teile, je mit festem Kriterium (ohne Angabe alle):
//   bild     Die leere Editor-Seite auf 5263 nach data-schrift="geladen", ohne Fehler der Seite → docs/progress/studio/m0-leer.png
//            (Chromium, 1280 × 800, Pixeldichte 2). Hört auf 5263 schon ein Server (pnpm studio:bau), nimmt die Probe ihn; sonst
//            startet sie selbst einen mit --strictPort und Schreibhaken und beendet ihn danach.
//   simpfad  Ein Math.sin in studio-laufzeit wird rot gemeldet: ESLint über stdin unter dem Namen packages/studio-laufzeit/src/…
//            (geschrieben wird nichts), dazu **, Date und die Umwege über einen Namen, globalThis und crypto; Math.sqrt und Math.PI
//            bleiben grün.
//   spiel    Ein Import von @ee/studio-store in apps/ozzy-spiel wird rot gemeldet: eine Probedatei in apps/ozzy-spiel/src/, dann tsc
//            des Spiels, test/keinSpielcode.test.ts und apps/studio/test/grenzen.test.ts; danach ist die Datei weg und das Spiel
//            wieder grün.
//   schutz   Der Schreibhaken verweigert Schreibversuche unter apps/editor/ und meldet sie (stderr und test-results/schutz/
//            meldungen.log): zwei Kindprozesse (writeFileSync über require, writeFile aus node:fs/promises über import) auf einen
//            Ordner, den es dort nicht gibt. Ohne Haken scheiterte der Versuch an ENOENT; geschrieben wird also in keinem Fall.
// Ausgabe: je Teil eine Zeile; die ganzen Ausgaben und ergebnis.json in test-results/proben/m0-vertrag/. Exitcode 1, sobald ein Teil
// nicht wie erwartet ausgeht, 2 bei falschem Aufruf. Nur nach einer Welle laufen lassen (7.4): Die Probedatei des Teils „spiel“ sähe
// ein gleichzeitiger Test.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(HIER, '../..');
const WURZEL = path.resolve(STUDIO, '../..');
const SPIEL = path.join(WURZEL, 'apps/ozzy-spiel');
const SCHUTZ = path.join(HIER, 'schutz.mjs');
const AUSGABEN = path.join(WURZEL, 'test-results/proben/m0-vertrag');
const BILD = path.join(WURZEL, 'docs/progress/studio/m0-leer.png');
const MELDUNGEN = path.join(WURZEL, 'test-results/schutz/meldungen.log');
const PORT = 5263;
const TEILE = ['bild', 'simpfad', 'spiel', 'schutz'];

// ---- Hilfen ----------------------------------------------------------------------------------------------------------------------

/** Umgebung der Kindprozesse: ohne Farben, mit Schreibhaken (absoluter Pfad, 6.3) */
function umgebung(dazu = {}) {
  const env = { ...process.env, NO_COLOR: '1', ...dazu };
  delete env.FORCE_COLOR;
  if (!(env.NODE_OPTIONS ?? '').includes(SCHUTZ)) env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --import=${SCHUTZ}`.trim();
  return env;
}

/** Startet einen Befehl, wartet und legt die ganze Ausgabe unter AUSGABEN/<log> ab */
function laufen(log, befehl, args, { cwd = WURZEL, eingabe } = {}) {
  const r = spawnSync(befehl, args, {
    cwd,
    env: umgebung(),
    input: eingabe,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 5 * 60 * 1000,
  });
  const ausgabe = `${r.stdout ?? ''}${r.stderr ? `\n${r.stderr}` : ''}${r.error ? `\n${r.error.message}` : ''}`;
  writeFileSync(path.join(AUSGABEN, log), `$ ${befehl} ${args.join(' ')}\n(in ${path.relative(WURZEL, cwd) || '.'})\n\n${ausgabe}`);
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', ausgabe };
}

/** Hört ein Server auf diesem Port? (lsof wie in Plan 2.4) */
function portBelegt(port) {
  const r = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() !== '';
}

const zeilenZahl = (datei) => (existsSync(datei) ? readFileSync(datei, 'utf8').split('\n').filter((z) => z !== '').length : 0);
const zeilenMit = (text, wort) => text.split('\n').filter((z) => z.includes(wort)).map((z) => z.trim());

// ---- bild ------------------------------------------------------------------------------------------------------------------------

async function warten(url, ms) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // noch nicht da
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`${url} antwortet nicht nach ${ms / 1000} s`);
}

async function beenden(server) {
  if (server.exitCode !== null || server.signalCode !== null) return;
  const zu = new Promise((r) => server.once('exit', r));
  server.kill('SIGTERM');
  const zeit = setTimeout(() => server.kill('SIGKILL'), 10_000);
  await zu;
  clearTimeout(zeit);
}

async function bild() {
  let server = null;
  let protokoll = '';
  const eigener = !portBelegt(PORT);
  if (eigener) {
    const vite = path.join(STUDIO, 'node_modules/vite/bin/vite.js');
    server = spawn(process.execPath, [vite, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
      cwd: STUDIO,
      env: umgebung({ STUDIO_PORT: String(PORT), SPIEL_PORT: '5265', STUDIO_FLORIAN: '' }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', (d) => (protokoll += d));
    server.stderr.on('data', (d) => (protokoll += d));
  }
  try {
    await warten(`http://127.0.0.1:${PORT}/`, 60_000);
    const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
      const fehler = [];
      page.on('pageerror', (e) => fehler.push(`Ausnahme: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') fehler.push(`console.error: ${m.text()}`);
      });
      await page.goto(`http://127.0.0.1:${PORT}/`);
      await page.waitForFunction(() => document.documentElement.dataset.schrift !== undefined, null, { timeout: 30_000 });
      const schrift = await page.evaluate(() => document.documentElement.dataset.schrift);
      const titel = await page.locator('#kopfzeile h1').textContent();
      // zwei Bilder abwarten: das erste zeichnet über das erste Prüfbild (7.3)
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))));
      mkdirSync(path.dirname(BILD), { recursive: true });
      await page.screenshot({ path: BILD });
      const ok = schrift === 'geladen' && titel === 'Studio' && fehler.length === 0;
      const text = `${path.relative(WURZEL, BILD)} (Seite auf ${PORT}${eigener ? ', eigener Server' : ''}; data-schrift=${schrift}, Titel „${titel}“${fehler.length ? `; ${fehler.join('; ')}` : ''})`;
      return { ok, text };
    } finally {
      await browser.close();
    }
  } finally {
    if (server) {
      await beenden(server);
      writeFileSync(path.join(AUSGABEN, 'bild-server.log'), protokoll);
    }
  }
}

// ---- simpfad ---------------------------------------------------------------------------------------------------------------------

const SIMPFAD_FAELLE = [
  { name: 'Math.sin', code: 'export const welle = (x: number): number => Math.sin(x);\n', rot: true },
  { name: '**', code: 'export const quadrat = (x: number): number => x ** 2;\n', rot: true },
  { name: 'Date.now', code: 'export const jetzt = (): number => Date.now();\n', rot: true },
  { name: 'const M = Math', code: 'const M = Math;\nexport const c = (x: number): number => M.cos(x);\n', rot: true },
  { name: 'globalThis.Math', code: 'export const e = (x: number): number => globalThis.Math.exp(x);\n', rot: true },
  { name: 'crypto', code: 'export const z = (): number => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;\n', rot: true },
  { name: 'Math.sqrt, Math.PI', code: 'export const kreis = (r: number): number => Math.sqrt(r) * Math.PI;\n', rot: false },
];

function simpfad() {
  const eslint = path.join(WURZEL, 'node_modules/eslint/bin/eslint.js');
  const name = 'packages/studio-laufzeit/src/m0-probe-rot.ts';
  const teile = [];
  let ok = true;
  for (const [i, f] of SIMPFAD_FAELLE.entries()) {
    const r = laufen(`simpfad-${i + 1}.log`, process.execPath, [eslint, '--stdin', '--stdin-filename', name, '--format', 'json'], {
      eingabe: f.code,
    });
    let meldungen = [];
    try {
      meldungen = JSON.parse(r.stdout)[0]?.messages ?? [];
    } catch {
      ok = false;
      teile.push(`${f.name}: kein Ergebnis von ESLint`);
      continue;
    }
    const regeln = [...new Set(meldungen.filter((m) => m.severity === 2).map((m) => m.ruleId ?? 'Syntax'))];
    const rot = regeln.length > 0;
    if (rot !== f.rot || (rot && r.status !== 1)) ok = false;
    teile.push(`${f.name} ${rot ? `rot (${regeln.join(', ')})` : 'grün'}`);
  }
  return { ok, text: `${name} über stdin: ${teile.join('; ')}` };
}

// ---- spiel -----------------------------------------------------------------------------------------------------------------------

const SPIEL_PROBE = path.join(SPIEL, 'src/m0-probe-rot.ts');

function spielProbeWeg() {
  rmSync(SPIEL_PROBE, { force: true });
}

function spiel() {
  const tsc = [path.join(SPIEL, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.json'];
  const vitestSpiel = path.join(SPIEL, 'node_modules/vitest/vitest.mjs');
  const vitestStudio = path.join(STUDIO, 'node_modules/vitest/vitest.mjs');
  const quelle = [
    '// Probe M0 (a): ein verbotener Import, nur für die Dauer der Probe (apps/studio/scripts/proben/m0-vertrag.mjs)',
    "import * as speicher from '@ee/studio-store/typen';",
    'export const probe = speicher;',
    '',
  ].join('\n');
  if (existsSync(SPIEL_PROBE)) return { ok: false, text: `${path.relative(WURZEL, SPIEL_PROBE)} gibt es schon; nichts geändert` };
  const ergebnis = [];
  let ok = true;
  writeFileSync(SPIEL_PROBE, quelle);
  try {
    const typen = laufen('spiel-1-tsc.log', process.execPath, tsc, { cwd: SPIEL });
    const typFehler = zeilenMit(typen.ausgabe, 'm0-probe-rot.ts').filter((z) => /error TS\d+/.test(z));
    ok &&= typen.status !== 0 && typFehler.length > 0;
    ergebnis.push(`tsc des Spiels rot: ${typFehler[0] ?? `(Exit ${typen.status})`}`);
    const schlank = laufen('spiel-2-keinSpielcode.log', process.execPath, [vitestSpiel, 'run', 'test/keinSpielcode.test.ts'], { cwd: SPIEL });
    const schlankZeile = zeilenMit(schlank.ausgabe, 'm0-probe-rot.ts:')[0] ?? '';
    ok &&= schlank.status !== 0 && schlankZeile !== '';
    ergebnis.push(`keinSpielcode.test.ts rot: ${schlankZeile.replace(/^[^"']*["']?/, '').replace(/["'],?$/, '')}`);
    const grenzen = laufen('spiel-3-grenzen.log', process.execPath, [vitestStudio, 'run', 'test/grenzen.test.ts'], { cwd: STUDIO });
    const grenzZeile = zeilenMit(grenzen.ausgabe, 'm0-probe-rot.ts:')[0] ?? '';
    ok &&= grenzen.status !== 0 && grenzZeile !== '';
    ergebnis.push(`grenzen.test.ts rot: ${grenzZeile.replace(/^[^"']*["']?/, '').replace(/["'],?$/, '')}`);
  } finally {
    spielProbeWeg();
  }
  const danach = laufen('spiel-4-danach.log', process.execPath, [vitestSpiel, 'run', 'test/keinSpielcode.test.ts'], { cwd: SPIEL });
  const typenDanach = laufen('spiel-5-tsc-danach.log', process.execPath, tsc, { cwd: SPIEL });
  const gruen = danach.status === 0 && typenDanach.status === 0 && !existsSync(SPIEL_PROBE);
  ok &&= gruen;
  ergebnis.push(gruen ? 'Probedatei entfernt, Spiel wieder grün' : 'Spiel nach der Probe nicht grün');
  return { ok, text: ergebnis.join('; ') };
}

// ---- schutz ----------------------------------------------------------------------------------------------------------------------

function schutz() {
  // ein Ordner, den es unter apps/editor/ nicht gibt: Ohne Haken scheiterte der Versuch an ENOENT
  const ordner = path.join(WURZEL, 'apps/editor/.m0-schutzprobe-gibt-es-nicht');
  const ziel = path.join(ordner, 'probe.txt');
  if (existsSync(ordner)) return { ok: false, text: `${path.relative(WURZEL, ordner)} gibt es; Probe nicht ausgeführt` };
  const vorher = zeilenZahl(MELDUNGEN);
  const versuche = [
    { name: 'writeFileSync (require)', args: ['-e', `require('node:fs').writeFileSync(${JSON.stringify(ziel)}, 'x')`] },
    {
      name: 'writeFile aus node:fs/promises (import)',
      args: ['--input-type=module', '-e', `import { writeFile } from 'node:fs/promises'; await writeFile(${JSON.stringify(ziel)}, 'x');`],
    },
  ];
  const ergebnis = [];
  let ok = true;
  for (const [i, v] of versuche.entries()) {
    const r = laufen(`schutz-${i + 1}.log`, process.execPath, [`--import=${SCHUTZ}`, ...v.args]);
    const meldung = zeilenMit(r.stderr, '[schutz] verweigert')[0] ?? '';
    const verweigert = r.status !== 0 && /EPERM/.test(r.stderr) && meldung.includes('unter apps/editor/');
    ok &&= verweigert;
    ergebnis.push(`${v.name} ${verweigert ? 'verweigert (EPERM)' : `NICHT verweigert (Exit ${r.status})`}`);
  }
  const neu = zeilenZahl(MELDUNGEN) - vorher;
  const unberuehrt = !existsSync(ordner);
  ok &&= unberuehrt && neu >= versuche.length;
  ergebnis.push(`${neu} neue Meldungen in ${path.relative(WURZEL, MELDUNGEN)}`, unberuehrt ? 'nichts geschrieben' : 'GESCHRIEBEN');
  return { ok, text: ergebnis.join('; ') };
}

// ---- Lauf ------------------------------------------------------------------------------------------------------------------------

async function main() {
  const gewuenscht = process.argv.slice(2).filter((a) => a !== '--');
  const fremd = gewuenscht.filter((t) => !TEILE.includes(t));
  if (fremd.length) {
    console.error(`unbekannt: ${fremd.join(', ')}; Teile: ${TEILE.join(', ')}`);
    return 2;
  }
  const tun = gewuenscht.length ? TEILE.filter((t) => gewuenscht.includes(t)) : TEILE;
  rmSync(AUSGABEN, { recursive: true, force: true });
  mkdirSync(AUSGABEN, { recursive: true });
  const haken = (process.env.NODE_OPTIONS ?? '').includes('schutz.mjs') ? 'an' : 'nur in den Kindprozessen';
  console.log(`Probe M0 (a): ${tun.join(', ')} · Schreibhaken ${haken}`);
  const ergebnisse = {};
  for (const teil of tun) {
    let r;
    try {
      r = await { bild, simpfad, spiel, schutz }[teil]();
    } catch (e) {
      r = { ok: false, text: e instanceof Error ? e.message : String(e) };
    }
    ergebnisse[teil] = r;
    console.log(`${r.ok ? 'wie erwartet' : 'NICHT wie erwartet'}  ${teil.padEnd(8)} ${r.text}`);
  }
  writeFileSync(path.join(AUSGABEN, 'ergebnis.json'), `${JSON.stringify({ zeit: new Date().toISOString(), ergebnisse }, null, 2)}\n`);
  const schlecht = Object.entries(ergebnisse).filter(([, r]) => !r.ok).map(([t]) => t);
  console.log(schlecht.length ? `Probe M0 (a) rot: ${schlecht.join(', ')}` : 'Probe M0 (a) grün');
  console.log(`ganze Ausgaben: ${path.relative(WURZEL, AUSGABEN)}/`);
  return schlecht.length ? 1 : 0;
}

// Die Probedatei im Spiel bleibt auch bei Abbruch nicht liegen
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    spielProbeWeg();
    process.exit(130);
  });
}

process.exitCode = await main();
