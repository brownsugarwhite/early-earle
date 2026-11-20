// Prüft die Studio-Pakete in einem Lauf (Plan 7.4, 2.4): pnpm studio:pruefen, aus dem Wurzelordner des Arbeitsbaums.
//
//   node scripts/studio-pruefen.mjs [<schritt> …] [<paket> …]
//     Schritte: typen, lint, tests, lizenzen (ohne Angabe alle, immer in dieser Reihenfolge)
//     Pakete:   Ordner oder Name, etwa studio-format, @ee/studio, tools/studio-inhalt (ohne Angabe alle Studio-Pakete)
//
// Zuerst (wenn die Tests mitlaufen) leert es die Inhaltskopie test-results/bau/inhalt, die Server und Werkzeuge ohne STUDIO_INHALT
// anlegen (Plan 2.4: geleert wird sie nur hier, vor einem neuen Lauf); arbeitet gerade ein Entwicklungsserver der Integration (5263,
// 5265) darauf, bleibt sie stehen. Dann nacheinander, nie parallel (Last):
//   typen     je Paket, App und Werkzeug das Skript `typecheck`
//   lint      ESLint auf den Studio-Pfaden, darin der Block für den Simulationspfad (Plan 2.3 Nr. 2)
//   tests     je Paket das Skript `test` (vitest), auch für tools/*, die der Wurzellauf von vitest nicht mitnimmt
//   lizenzen  alle Abhängigkeiten der Studio-Pakete (pnpm licenses) gegen die Erlaubnisliste (Plan 7.1, 5.3)
// Ausgabe: je Schritt eine Zeile grün oder rot, bei Rot die ersten Fehlerzeilen; die ganzen Ausgaben liegen in
// test-results/studio-pruefen/. Exitcode 1, sobald ein Schritt rot ist, 2 bei falschem Aufruf.
// Jeder Kindprozess läuft mit dem Schreibhaken apps/studio/scripts/proben/schutz.mjs (Plan 6.3), sobald es ihn gibt.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Wurzelordner des Arbeitsbaums (dieses Skript liegt in scripts/) */
const WURZEL = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const AUSGABEN = path.join(WURZEL, 'test-results', 'studio-pruefen');
const INHALTSKOPIE = path.join(WURZEL, 'test-results', 'bau', 'inhalt');
const SCHREIBHAKEN = path.join(WURZEL, 'apps', 'studio', 'scripts', 'proben', 'schutz.mjs');
/** Entwicklungsserver der Integration, die sich die Inhaltskopie teilen (Plan 2.4) */
const KOPIE_PORTS = [5263, 5265];

/** Studio-Pakete in der Reihenfolge ihrer Abhängigkeiten (Plan 2.1), dann die Apps und die Werkzeuge */
const PAKETE = [
  'packages/studio-rechnen',
  'packages/studio-format',
  'packages/studio-store',
  'packages/studio-ablage',
  'packages/studio-laufzeit',
  'packages/studio-welt',
  'packages/studio-bild',
  'packages/studio-ton',
  'packages/studio-autorig',
  'apps/studio',
  'apps/ozzy-spiel',
  'tools/studio-uebernahme',
  'tools/studio-inhalt',
];
const SCHRITTE = ['typen', 'lint', 'tests', 'lizenzen'];
/** Studio-Skripte der Wurzel, die der Lint mitprüft */
const WURZEL_SKRIPTE = ['scripts/studio-pruefen.mjs', 'scripts/studio-stand.mjs'];
/** Was in den Paketen liegt, aber kein Quelltext ist */
const LINT_AUSSER = ['**/playwright-report/**', '**/test-results/**', 'apps/ozzy-spiel/ios/**', 'apps/ozzy-spiel/android/**'];

/** Erlaubte Lizenzen (SPDX), genau die Liste aus Plan 7.1: MIT, ISC, BSD, Apache-2.0, 0BSD, CC0, BSL-1.0, Zlib */
export const ERLAUBT = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'CC0-1.0', 'BSL-1.0', 'Zlib'];
const ERLAUBT_KLEIN = new Set(ERLAUBT.map((l) => l.toLowerCase()));

/**
 * Begründete Ausnahmen (Plan 7.1), je Paket mit genau der Lizenz, die es heute trägt; keine gelangt in den ausgelieferten Code.
 * Plan 7.1 nennt nur css-value. Die übrigen drei kamen mit den Abhängigkeiten von M0 dazu (am 20.11. mit `pnpm why` nachgesehen);
 * die Integration bestätigt sie in Plan 7.1 oder nimmt sie wieder heraus. Eine neue Lizenz oder ein neues Paket ist erst einmal rot.
 */
export const AUSNAHMEN = [
  { name: /^css-value$/, lizenz: 'Unknown', grund: 'ohne Lizenzfeld; kommt mit webdriverio, nur Prüfwerkzeug am Mac, nie im Spiel (Plan 5.3)' },
  { name: /^@promptbook\/utils$/, lizenz: 'CC-BY-4.0', grund: 'kommt mit webdriverio (über locate-app), nur Prüfwerkzeug am Mac, nie im Spiel' },
  {
    name: /^(?:glob|minimatch|minipass|path-scurry|lru-cache|@isaacs\/nonrecursive-glob-match)$/,
    lizenz: 'BlueOak-1.0.0',
    grund: 'freie Lizenz wie MIT; kommt mit webdriverio (über @wdio/config und archiver), nur Prüfwerkzeug am Mac, nie im Spiel',
  },
  {
    name: /^lightningcss(-[a-z0-9-]+)?$/,
    lizenz: 'MPL-2.0',
    grund: 'CSS-Werkzeug von Vite 8, läuft nur im Bau und im Entwicklungsserver, wird nie ausgeliefert',
  },
];

// ---- reine Hilfen (ohne Seiteneffekte) -------------------------------------------------------------------------------------------

/**
 * Gilt ein SPDX-Ausdruck als erlaubt? Ein ODER-Ausdruck gilt, wenn eine Wahl erlaubt ist, ein UND-Ausdruck nur, wenn alle Teile erlaubt
 * sind; WITH (eine Ausnahme der Lizenz) gibt nur Rechte dazu, „+“ heißt „oder später“. Alles, was kein gültiger Ausdruck ist, gilt nicht.
 */
export function lizenzErlaubt(ausdruck) {
  const t = String(ausdruck).replace(/[()]/g, (k) => ` ${k} `).trim().split(/\s+/);
  let i = 0;
  const einzeln = () => {
    const w = t[i++];
    if (w === '(') {
      const ja = oder();
      if (t[i++] !== ')') throw new Error('Klammer');
      return ja;
    }
    if (w === undefined || w === ')' || /^(AND|OR|WITH)$/i.test(w)) throw new Error('Ausdruck');
    if (/^WITH$/i.test(t[i] ?? '')) {
      i++;
      if (t[i++] === undefined) throw new Error('WITH');
    }
    return ERLAUBT_KLEIN.has(w.replace(/\+$/, '').toLowerCase());
  };
  const und = () => {
    let ja = einzeln();
    while (/^AND$/i.test(t[i] ?? '')) {
      i++;
      ja = einzeln() && ja;
    }
    return ja;
  };
  const oder = () => {
    let ja = und();
    while (/^OR$/i.test(t[i] ?? '')) {
      i++;
      ja = und() || ja;
    }
    return ja;
  };
  try {
    const ja = oder();
    return i === t.length && ja;
  } catch {
    return false;
  }
}

/** Die Ausnahme, die für dieses Paket mit dieser Lizenz gilt, oder null */
export function ausnahmeFuer(name, lizenz) {
  return AUSNAHMEN.find((a) => a.name.test(name) && a.lizenz === lizenz) ?? null;
}

/** Eine Fehlerzeile von tsc mit dem Pfad vom Wurzelordner aus: `ordner/src/x.ts:3:7 error TS2322: …` */
export function tscZeile(zeile, ordner) {
  const m = /^(\S[^(]*)\((\d+),(\d+)\): (.*)$/.exec(zeile.trim());
  if (!m) return zeile.trim();
  const datei = path.relative(WURZEL, path.resolve(WURZEL, ordner, m[1]));
  return `${datei}:${m[2]}:${m[3]} ${m[4]}`;
}

/** Kurzfassung eines Laufs von vitest: „3 Dateien, 12 Tests“, „keine Tests“ oder null */
export function vitestZusammenfassung(text) {
  if (/No test files found/.test(text)) return 'keine Tests';
  const dateien = /^\s*Test Files\s+.*\((\d+)\)\s*$/m.exec(text);
  const tests = /^\s*Tests\s+(.*)\((\d+)\)\s*$/m.exec(text);
  if (!dateien || !tests) return null;
  const rest = [];
  const uebersprungen = /(\d+) skipped/.exec(tests[1] ?? '');
  const offen = /(\d+) todo/.exec(tests[1] ?? '');
  const rot = /(\d+) failed/.exec(tests[1] ?? '');
  if (rot) rest.push(`${rot[1]} rot`);
  if (uebersprungen) rest.push(`${uebersprungen[1]} übersprungen`);
  if (offen) rest.push(`${offen[1]} offen`);
  return `${dateien[1]} Dateien, ${tests[2]} Tests${rest.length ? ` (${rest.join(', ')})` : ''}`;
}

/** Die markanten Zeilen eines roten Laufs von vitest: Fehlschläge, Fehlermeldungen, Orte */
export function vitestFehler(text) {
  // ohne die eigenen Zeilen von pnpm, die nur sagen, dass das Skript scheiterte
  const zeilen = text.split('\n').filter((z) => !/ELIFECYCLE|ERR_PNPM|recursive run|^\s*[│╰]/.test(z));
  const markant = zeilen.filter(
    (z) => /^\s*(FAIL|×)\s/.test(z) || /^\s*[A-Za-z]*(Error|Exception)\b/.test(z) || /^\s*❯ \S+:\d+:\d+/.test(z),
  );
  return (markant.length ? markant : zeilen.filter((z) => z.trim() !== '').slice(-8)).map((z) => z.trim());
}

/** JSON aus einer Ausgabe, die mit `anfang` („[“ oder „{“) am Zeilenanfang beginnt; was pnpm davor schreibt, zählt nicht */
export function jsonAus(text, anfang) {
  const i = text.startsWith(anfang) ? 0 : text.indexOf(`\n${anfang}`) + 1;
  if (i === 0 && !text.startsWith(anfang)) throw new Error('kein JSON in der Ausgabe');
  return JSON.parse(text.slice(i));
}

/** Die Meldungen aus dem JSON von ESLint, je eine Zeile `datei:zeile:spalte Meldung (Regel)`, Pfade vom Wurzelordner aus */
export function lintMeldungen(ergebnisse) {
  const fehler = [];
  const warnungen = [];
  for (const datei of ergebnisse) {
    for (const m of datei.messages) {
      const z = `${path.relative(WURZEL, datei.filePath)}:${m.line ?? 0}:${m.column ?? 0} ${m.message} (${m.ruleId ?? 'Syntax'})`;
      (m.severity === 2 || m.fatal ? fehler : warnungen).push(z);
    }
  }
  return { fehler, warnungen };
}

/** Dauer auf Deutsch: „0,7 s“, „1 min 12 s“ */
export function dauer(ms) {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
}

// ---- Lauf --------------------------------------------------------------------------------------------------------------------------

const FARBE = process.stdout.isTTY === true && !process.env.NO_COLOR;
const farbig = (code, text) => (FARBE ? `\x1b[${code}m${text}\x1b[0m` : text);

/**
 * Umgebung der Kindprozesse: ohne Farben, mit Schreibhaken, sobald es ihn gibt, und ohne stilles Nachinstallieren: pnpm 12 installiert
 * vor `run` und `exec` von selbst, wenn eine package.json nicht zur Lockdatei passt; so bricht der Lauf stattdessen ab (Plan 7.4).
 */
function umgebung() {
  const env = { ...process.env, NO_COLOR: '1', pnpm_config_verify_deps_before_run: 'error' };
  delete env.FORCE_COLOR;
  // `pnpm studio:pruefen` setzt ihn schon (mit $PWD, vielleicht anders geschrieben): dann nicht ein zweites Mal
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

function main() {
  const argumente = process.argv.slice(2).filter((a) => a !== '--');
  if (argumente.some((a) => a === '-h' || a === '--hilfe' || a === '--help')) {
    console.log('Aufruf: node scripts/studio-pruefen.mjs [typen|lint|tests|lizenzen …] [<paket> …]');
    return 0;
  }
  const alle = paketeLesen();
  const schritte = argumente.filter((a) => SCHRITTE.includes(a));
  const auswahl = [];
  for (const a of argumente.filter((a) => !SCHRITTE.includes(a))) {
    const p = alle.find((p) => p.ordner === a.replace(/\/$/, '') || p.name === a || path.basename(p.ordner) === a);
    if (!p) {
      console.error(`unbekannt: „${a}“. Schritte: ${SCHRITTE.join(', ')}; Pakete: ${alle.map((p) => path.basename(p.ordner)).join(', ')}`);
      return 2;
    }
    if (!auswahl.includes(p)) auswahl.push(p);
  }
  const pakete = auswahl.length ? auswahl : alle;
  const tun = schritte.length ? SCHRITTE.filter((s) => schritte.includes(s)) : SCHRITTE;

  rmSync(AUSGABEN, { recursive: true, force: true });
  mkdirSync(AUSGABEN, { recursive: true });
  const env = umgebung();
  const haken = /schutz\.mjs/.test(env.NODE_OPTIONS ?? '') ? 'an' : 'fehlt noch';
  console.log(`studio:pruefen: ${tun.join(', ')} · ${pakete.length} ${pakete.length === 1 ? 'Paket' : 'Pakete'} · Schreibhaken ${haken}`);

  const lauf = { env, nummer: 0, rote: [], zahl: 0, start: Date.now() };
  const fehlend = pakete.filter((p) => p.fehlt);
  if (fehlend.length) {
    const zeilen = [...fehlend.map((p) => `${p.ordner}/package.json ${p.fehlt}`), 'Plan 2.1 nennt diese Pakete; dort wird nichts geprüft'];
    melden(lauf, false, 'Pakete', `${fehlend.length} fehlen`, 0, zeilen);
  }
  const da = pakete.filter((p) => !p.fehlt);

  if (tun.includes('tests')) inhaltskopieLeeren(lauf);
  if (tun.includes('typen')) for (const p of da) typenPruefen(lauf, p);
  if (tun.includes('lint')) lintPruefen(lauf, da, auswahl.length === 0);
  if (tun.includes('tests')) for (const p of da) testsPruefen(lauf, p);
  if (tun.includes('lizenzen')) lizenzenPruefen(lauf, da);

  const gesamt = dauer(Date.now() - lauf.start);
  if (lauf.rote.length === 0) {
    console.log(`studio:pruefen ${farbig(32, 'grün')}: ${lauf.zahl} Schritte, ${gesamt}`);
    return 0;
  }
  console.log(`studio:pruefen ${farbig(31, 'rot')}: ${lauf.rote.length} von ${lauf.zahl} Schritten (${lauf.rote.join('; ')}), ${gesamt}`);
  console.log(`ganze Ausgaben: ${path.relative(WURZEL, AUSGABEN)}/`);
  return 1;
}

/** Die Studio-Pakete: die aus Plan 2.1 und jedes weitere packages/studio-* und tools/studio-* */
function paketeLesen() {
  const ordner = [...PAKETE];
  for (const oben of ['packages', 'tools']) {
    for (const n of readdirSync(path.join(WURZEL, oben)).sort()) {
      const o = `${oben}/${n}`;
      if (n.startsWith('studio-') && !ordner.includes(o) && existsSync(path.join(WURZEL, o, 'package.json'))) ordner.push(o);
    }
  }
  return ordner.map((o) => {
    const datei = path.join(WURZEL, o, 'package.json');
    if (!existsSync(datei)) return { ordner: o, name: o, skripte: {}, fehlt: 'fehlt' };
    try {
      const p = JSON.parse(readFileSync(datei, 'utf8'));
      return { ordner: o, name: p.name ?? o, skripte: p.scripts ?? {}, fehlt: '' };
    } catch {
      return { ordner: o, name: o, skripte: {}, fehlt: 'ist kein gültiges JSON' };
    }
  });
}

/** Eine Zeile je Schritt; bei Rot die ersten Fehlerzeilen und wo die ganze Ausgabe liegt */
function melden(lauf, gruen, schritt, ziel, ms, zeilen = [], log = null, hinweis = '') {
  lauf.zahl++;
  const teile = [gruen ? farbig(32, 'grün') : farbig(31, 'rot '), schritt.padEnd(8), ziel.padEnd(26)];
  if (hinweis) teile.push(hinweis);
  if (ms) teile.push(dauer(ms));
  console.log(teile.join('  ').trimEnd());
  if (gruen) return;
  lauf.rote.push(`${schritt} ${ziel}`.trim());
  const ZEIGEN = 8;
  for (const z of zeilen.slice(0, ZEIGEN)) console.log(`      ${z.length > 220 ? `${z.slice(0, 217)}…` : z}`);
  const mehr = zeilen.length > ZEIGEN ? `noch ${zeilen.length - ZEIGEN} Zeilen` : '';
  if (log) console.log(`      … ${mehr ? `${mehr}; ` : ''}ganze Ausgabe: ${path.relative(WURZEL, path.join(AUSGABEN, log))}`);
  else if (mehr) console.log(`      … ${mehr}`);
}

/** Startet einen Befehl, wartet und legt die ganze Ausgabe ab */
function laufen(lauf, befehl, args, log, cwd = WURZEL) {
  const t0 = Date.now();
  const r = spawnSync(befehl, args, {
    cwd,
    env: lauf.env,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout: 20 * 60 * 1000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = r.stdout ?? '';
  const stderr = r.stderr ?? '';
  const fehler = r.error ? (r.error.code === 'ETIMEDOUT' ? 'nach 20 min abgebrochen' : r.error.message) : '';
  const ausgabe = `${stdout}${stderr ? `\n${stderr}` : ''}${fehler ? `\n${fehler}\n` : ''}`;
  writeFileSync(path.join(AUSGABEN, log), `$ ${befehl} ${args.join(' ')}\n(in ${path.relative(WURZEL, cwd) || '.'})\n\n${ausgabe}`);
  return { ok: r.status === 0 && !r.error, status: r.status, stdout, stderr, ausgabe, fehler, ms: Date.now() - t0 };
}

const lognummer = (lauf) => String(++lauf.nummer).padStart(2, '0');
const kurz = (p) => path.basename(p.ordner);

function typenPruefen(lauf, p) {
  const log = `${lognummer(lauf)}-typen-${kurz(p)}.log`;
  if (!p.skripte.typecheck) return melden(lauf, false, 'Typen', p.name, 0, ['Skript „typecheck“ fehlt in package.json (Plan 2.1)']);
  const r = laufen(lauf, 'pnpm', ['-C', path.join(WURZEL, p.ordner), 'run', 'typecheck'], log);
  if (r.ok) return melden(lauf, true, 'Typen', p.name, r.ms);
  const fehler = r.ausgabe.split('\n').filter((z) => /error TS\d+/.test(z)).map((z) => tscZeile(z, p.ordner));
  const zeilen = fehler.length ? fehler : r.ausgabe.split('\n').filter((z) => z.trim() !== '').slice(-8);
  melden(lauf, false, 'Typen', p.name, r.ms, zeilen, log, fehler.length ? `${fehler.length} Fehler` : '');
}

function lintPruefen(lauf, pakete, mitWurzel) {
  const log = `${lognummer(lauf)}-lint.log`;
  const pfade = [...pakete.map((p) => p.ordner), ...(mitWurzel ? WURZEL_SKRIPTE : [])];
  const ziel = `${pfade.length} Pfade`;
  const args = ['exec', 'eslint', '--format', 'json', '--no-error-on-unmatched-pattern', ...LINT_AUSSER.flatMap((m) => ['--ignore-pattern', m]), ...pfade];
  const r = laufen(lauf, 'pnpm', args, log);
  let ergebnisse;
  try {
    ergebnisse = jsonAus(r.stdout, '[');
  } catch {
    const zeilen = r.stderr.split('\n').filter((z) => z.trim() !== '' && !/MODULE_TYPELESS_PACKAGE_JSON|Reparsing as ES module|To eliminate this warning|trace-warnings/.test(z));
    return melden(lauf, false, 'Lint', ziel, r.ms, zeilen.length ? zeilen : ['ESLint lieferte kein Ergebnis'], log);
  }
  const { fehler, warnungen } = lintMeldungen(ergebnisse);
  writeFileSync(path.join(AUSGABEN, log), [`$ pnpm ${args.join(' ')}`, '', `${ergebnisse.length} Dateien`, '', 'Fehler:', ...fehler, '', 'Warnungen:', ...warnungen, ''].join('\n'));
  const zahl = `${ergebnisse.length} Dateien, ${fehler.length} Fehler, ${warnungen.length} Warnungen`;
  melden(lauf, fehler.length === 0 && r.status !== 2, 'Lint', ziel, r.ms, fehler, log, zahl);
}

function inhaltskopieLeeren(lauf) {
  const ziel = path.relative(WURZEL, INHALTSKOPIE);
  const belegt = KOPIE_PORTS.filter(portBelegt);
  if (belegt.length) {
    console.log(`${farbig(33, 'Hinweis')}  ${ziel} bleibt stehen: ${belegt.join(' und ')} arbeitet darauf (Server beenden, dann neu prüfen)`);
    return;
  }
  try {
    const war = existsSync(INHALTSKOPIE);
    rmSync(INHALTSKOPIE, { recursive: true, force: true });
    melden(lauf, true, 'Leeren', ziel, 0, [], null, war ? 'geleert' : 'war leer');
  } catch (e) {
    melden(lauf, false, 'Leeren', ziel, 0, [e instanceof Error ? e.message : String(e)]);
  }
}

function testsPruefen(lauf, p) {
  const log = `${lognummer(lauf)}-tests-${kurz(p)}.log`;
  if (!p.skripte.test) return melden(lauf, false, 'Tests', p.name, 0, ['Skript „test“ fehlt in package.json (Plan 2.1)']);
  const r = laufen(lauf, 'pnpm', ['-C', path.join(WURZEL, p.ordner), 'run', 'test'], log);
  const zusammen = vitestZusammenfassung(r.ausgabe) ?? '';
  if (r.ok) return melden(lauf, true, 'Tests', p.name, r.ms, [], log, zusammen);
  melden(lauf, false, 'Tests', p.name, r.ms, vitestFehler(r.ausgabe), log, zusammen);
}

function lizenzenPruefen(lauf, pakete) {
  const log = `${lognummer(lauf)}-lizenzen.log`;
  const ziel = 'Abhängigkeiten';
  const r = laufen(lauf, 'pnpm', ['licenses', 'list', '--json', ...pakete.flatMap((p) => ['--filter', p.name])], log);
  let liste;
  try {
    if (!r.ok) throw new Error();
    liste = Object.entries(jsonAus(r.stdout, '{')).flatMap(([schluessel, eintraege]) =>
      eintraege.map((e) => ({ name: e.name, versionen: e.versions ?? [], lizenz: e.license ?? schluessel })),
    );
  } catch {
    return melden(lauf, false, 'Lizenzen', ziel, r.ms, r.ausgabe.split('\n').filter((z) => z.trim() !== '').slice(0, 8), log);
  }
  const verboten = [];
  const ausnahmen = [];
  for (const e of liste) {
    if (lizenzErlaubt(e.lizenz)) continue;
    const a = ausnahmeFuer(e.name, e.lizenz);
    const z = `${e.name}@${e.versionen.join(', ')}: ${e.lizenz}`;
    if (a) ausnahmen.push(`${z} (Ausnahme: ${a.grund})`);
    else verboten.push(z);
  }
  writeFileSync(
    path.join(AUSGABEN, log),
    [`${liste.length} Pakete`, `erlaubt: ${ERLAUBT.join(', ')}`, '', 'nicht erlaubt:', ...verboten, '', 'Ausnahmen mit Grund:', ...ausnahmen, ''].join('\n'),
  );
  const zahl = `${liste.length} Pakete, ${ausnahmen.length} Ausnahmen mit Grund${verboten.length ? `, ${verboten.length} nicht erlaubt` : ''}`;
  const zeilen = verboten.length ? [...verboten, `erlaubt: ${ERLAUBT.join(', ')}; Ausnahmen stehen mit Grund in AUSNAHMEN (scripts/studio-pruefen.mjs)`] : [];
  melden(lauf, verboten.length === 0, 'Lizenzen', ziel, r.ms, zeilen, log, zahl);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
