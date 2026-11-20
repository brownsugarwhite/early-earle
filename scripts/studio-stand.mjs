// Liefert einen festen Stand beider Apps (Plan 2.4): pnpm studio:stand -- <etappe>, nur die Integration, am Ende einer Etappe.
//
// 1. Name <etappe>-<JJJJMMTT-HHMM> (Etappe aus dem ersten Argument, sonst „stand“; Ortszeit des Macs). Gibt es den Ordner schon, hängt
//    es -2, -3 … an: Ein Stand wird nie überschrieben, weil ein laufender Server aus ihm liefert.
// 2. Baut apps/studio und apps/ozzy-spiel nacheinander mit `pnpm --filter <app> stand:bauen` und STUDIO_STAND=<name> in der Umgebung;
//    ihre vite.config.ts baut damit nach apps/<app>/dist/<name>/.
// 3. Erst wenn beide gebaut sind, schreibt es den Namen in die Textdatei apps/<app>/dist/aktuell (erst daneben, dann umbenennen; nur
//    der Name, ohne Zeilenumbruch). `stand:zeigen` liest ihn beim Start; ein laufender Server wechselt erst beim Neustart.
// 4. Löscht ältere Stand-Ordner außer dem neuen und dem vorigen (dem, den dist/aktuell vorher nannte). Einen Stand, aus dem 5217 oder
//    5261 gerade noch liefert, lässt es ebenso stehen (erkannt an der Startseite), damit die offene Seite bis zum Neustart nachladen kann.
// Scheitert ein Bau, bleiben dist/aktuell und alle Stände, wie sie waren; die neuen Ordner werden entfernt (Exitcode 1; 2 bei falschem
// Aufruf). Die ganzen Ausgaben der Bauten liegen in test-results/studio-stand/.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Wurzelordner des Arbeitsbaums (dieses Skript liegt in scripts/) */
const WURZEL = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const AUSGABEN = path.join(WURZEL, 'test-results', 'studio-stand');
const SCHREIBHAKEN = path.join(WURZEL, 'apps', 'studio', 'scripts', 'proben', 'schutz.mjs');

/** Die beiden Apps und der Port, auf dem ihr `stand:zeigen` liefert (Plan 2.4) */
const APPS = [
  { name: '@ee/studio', ordner: 'apps/studio', port: 5217 },
  { name: '@ee/ozzy-spiel', ordner: 'apps/ozzy-spiel', port: 5261 },
];

/** Name eines Stand-Ordners: <etappe>-<JJJJMMTT>-<HHMM>, bei Gleichstand mit -2, -3 … */
export const STAND = /^[A-Za-z0-9][A-Za-z0-9._-]*-\d{8}-\d{4}(-\d+)?$/;
const ETAPPE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

// ---- reine Hilfen ------------------------------------------------------------------------------------------------------------------

/** Ortszeit als JJJJMMTT-HHMM */
export function zeitText(d) {
  const zwei = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${zwei(d.getMonth() + 1)}${zwei(d.getDate())}-${zwei(d.getHours())}${zwei(d.getMinutes())}`;
}

/** Ein Name, den es noch nicht gibt: <etappe>-<zeit>, sonst mit -2, -3 … */
export function standName(etappe, zeit, gibtEs) {
  let name = `${etappe}-${zeit}`;
  for (let n = 2; gibtEs(name); n++) name = `${etappe}-${zeit}-${n}`;
  return name;
}

/** Der Stand, den dist/aktuell nennt, wenn es diesen Ordner gibt; sonst null */
export function aktuellLesen(dist) {
  try {
    const name = readFileSync(path.join(dist, 'aktuell'), 'utf8').trim();
    const einfach = name !== '' && name !== '.' && name !== '..' && !/[/\\]/.test(name);
    return einfach && existsSync(path.join(dist, name)) ? name : null;
  } catch {
    return null;
  }
}

/** Atomar: erst daneben schreiben, dann umbenennen; nur der Name, ohne Zeilenumbruch */
export function aktuellSchreiben(dist, name) {
  const neben = path.join(dist, `aktuell.${process.pid}.neu`);
  writeFileSync(neben, name);
  renameSync(neben, path.join(dist, 'aktuell'));
}

/**
 * Aus welchen dieser Stände liefert ein Server mit dieser Startseite? Gleich ist ein Stand, dessen index.html dieselbe ist oder der
 * jede Datei hat, auf die die Startseite verweist (Skripte und Stile mit Prüfsumme im Namen).
 */
export function staendeMitSeite(html, dist, namen) {
  const verweise = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|mjs|css))(?:\?[^"]*)?"/g)]
    .map((m) => m[1] ?? '')
    .filter((v) => v !== '' && !/^[a-z]+:/i.test(v) && !v.startsWith('//'))
    .map((v) => v.replace(/^\.?\//, ''));
  return namen.filter((n) => {
    const seite = path.join(dist, n, 'index.html');
    if (existsSync(seite) && readFileSync(seite, 'utf8') === html) return true;
    return verweise.length > 0 && verweise.every((v) => existsSync(path.join(dist, n, v)));
  });
}

// ---- Lauf --------------------------------------------------------------------------------------------------------------------------

const FARBE = process.stdout.isTTY === true && !process.env.NO_COLOR;
const farbig = (code, text) => (FARBE ? `\x1b[${code}m${text}\x1b[0m` : text);
const GRUEN = farbig(32, 'grün');
const ROT = farbig(31, 'rot ');
const dauer = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

/** Umgebung der Bauten: ohne Farben, mit Schreibhaken, sobald es ihn gibt (`pnpm studio:stand` setzt ihn schon) */
function umgebung() {
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.FORCE_COLOR;
  if (existsSync(SCHREIBHAKEN) && !/schutz\.mjs/.test(env.NODE_OPTIONS ?? '')) {
    env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --import=${SCHREIBHAKEN}`.trim();
  }
  return env;
}

/** Hört ein Server auf diesem Port? (lsof wie in Plan 2.4; ohne lsof: nein) */
function portBelegt(port) {
  const r = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() !== '';
}

/** Die Startseite des Servers auf diesem Port (nur gelesen) oder null */
export async function startseite(port) {
  if (!portBelegt(port)) return null;
  for (const host of ['127.0.0.1', '[::1]']) {
    try {
      const antwort = await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(2000) });
      if (antwort.ok) return await antwort.text();
    } catch {
      // nächste Adresse
    }
  }
  return null;
}

async function main() {
  const argumente = process.argv.slice(2).filter((a) => a !== '--');
  const etappe = argumente[0] ?? 'stand';
  if (argumente.length > 1 || !ETAPPE.test(etappe)) {
    console.error('Aufruf: pnpm studio:stand -- <etappe>   (etwa m0; Buchstaben, Ziffern, Punkt, Strich)');
    return 2;
  }
  // Ohne STUDIO_STAND bauten die Apps nach dist/ und leerten dabei den Ordner samt allen Ständen: vorher nachsehen.
  for (const app of APPS) {
    const konfig = path.join(WURZEL, app.ordner, 'vite.config.ts');
    if (!existsSync(konfig) || !readFileSync(konfig, 'utf8').includes('STUDIO_STAND')) {
      console.error(`${ROT}  ${app.ordner}/vite.config.ts liest STUDIO_STAND nicht; ohne den Stand-Ordner baut sie nicht.`);
      return 1;
    }
  }
  const distVon = (app) => path.join(WURZEL, app.ordner, 'dist');
  const name = standName(etappe, zeitText(new Date()), (n) => APPS.some((a) => existsSync(path.join(distVon(a), n))));
  mkdirSync(AUSGABEN, { recursive: true });
  console.log(`studio:stand ${name}`);

  // 1. bauen, nacheinander
  const env = { ...umgebung(), STUDIO_STAND: name };
  for (const app of APPS) {
    const t0 = Date.now();
    const args = ['--filter', app.name, '--fail-if-no-match', 'stand:bauen'];
    const r = spawnSync('pnpm', args, {
      cwd: WURZEL,
      env,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      timeout: 20 * 60 * 1000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const ausgabe = `${r.stdout ?? ''}${r.stderr ? `\n${r.stderr}` : ''}${r.error ? `\n${r.error.message}\n` : ''}`;
    const log = path.join(AUSGABEN, `${name}-${path.basename(app.ordner)}.log`);
    writeFileSync(log, `$ STUDIO_STAND=${name} pnpm ${args.join(' ')}\n\n${ausgabe}`);
    const ziel = path.join(distVon(app), name);
    const seite = existsSync(path.join(ziel, 'index.html'));
    if (r.status === 0 && !r.error && seite) {
      console.log(`${GRUEN}  Bau       ${app.name.padEnd(16)}  ${path.relative(WURZEL, ziel)}/  ${dauer(Date.now() - t0)}`);
      continue;
    }
    console.log(`${ROT}  Bau       ${app.name.padEnd(16)}  ${dauer(Date.now() - t0)}`);
    // ohne die eigenen Zeilen von pnpm, die nur sagen, dass das Skript scheiterte
    const fehler = ausgabe.split('\n').filter((z) => /error|fehler|failed|✗/i.test(z) && !/ELIFECYCLE|ERR_PNPM|recursive run/.test(z));
    let zeilen = ausgabe.split('\n').filter((z) => z.trim() !== '').slice(-8);
    if (r.status === 0 && !r.error) zeilen = [`Bau lief, aber ${path.relative(WURZEL, ziel)}/index.html fehlt: Baut die vite.config.ts nach dist/$STUDIO_STAND/?`];
    else if (fehler.length) zeilen = fehler;
    for (const z of zeilen.slice(0, 8)) console.log(`      ${z.trim()}`);
    console.log(`      … ganze Ausgabe: ${path.relative(WURZEL, log)}`);
    for (const a of APPS) rmSync(path.join(distVon(a), name), { recursive: true, force: true });
    console.log('dist/aktuell und alle Stände bleiben, wie sie waren.');
    return 1;
  }

  // 2. erst jetzt dist/aktuell, je App
  const vorige = APPS.map((app) => aktuellLesen(distVon(app)));
  for (const app of APPS) aktuellSchreiben(distVon(app), name);
  const vorher = [...new Set(vorige.map((v) => v ?? 'keiner'))].join(' und ');
  console.log(`${GRUEN}  aktuell   ${name} in ${APPS.map((a) => `${a.ordner}/dist/aktuell`).join(', ')} (vorher: ${vorher})`);

  // 3. aufräumen: alles außer dem neuen, dem vorigen und dem, aus dem ein laufender Server liefert
  for (const [i, app] of APPS.entries()) {
    const dist = distVon(app);
    const staende = readdirSync(dist, { withFileTypes: true }).filter((e) => e.isDirectory() && STAND.test(e.name)).map((e) => e.name);
    const behalten = new Set([name]);
    const v = vorige[i];
    if (v) behalten.add(v);
    const html = await startseite(app.port);
    const laufend = html === null ? [] : staendeMitSeite(html, dist, staende);
    for (const n of laufend) behalten.add(n);
    const weg = staende.filter((n) => !behalten.has(n)).sort();
    for (const n of weg) rmSync(path.join(dist, n), { recursive: true, force: true });
    const was = weg.length ? `gelöscht: ${weg.join(', ')}` : 'nichts zu löschen';
    const laeuft = laufend.length ? `; ${app.port} liefert aus ${laufend.join(', ')}` : '';
    console.log(`${GRUEN}  aufräumen ${app.ordner}/dist: ${was}; behalten: ${[...behalten].sort().join(', ')}${laeuft}`);
  }
  console.log('Laufende Server wechseln erst beim Neustart (5217 nur ohne Ungespeichertes im Journal; Plan 2.4).');
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
