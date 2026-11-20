// Grenzen von Studio (Plan 2.3 Nr. 3 bis 6). Liest alle Quelltexte der Studio-Pakete, beider Apps (samt scripts/ und e2e/), der
// Werkzeuge und der Wurzel-Skripte von Studio und prüft:
//   1. die Import-Matrix aus 2.1 für src/, samt „nur import type“. Drei Erweiterungen gehen über 2.1 und 2.3 Nr. 6 hinaus (die
//      Integration trägt sie im Plan nach): Konfiguration, Tests, e2e/, scripts/ und server/ dürfen die Werkzeuge ihres Pakets
//      importieren (vite, @vitejs/*, vitest, fast-check, @playwright/test, webdriverio, typescript, Node und die devDependencies ihres
//      Pakets); sie dürfen die Pakete, die src/ nur als Typ nehmen darf, auch als Wert importieren (studio-welt/src/vertrag.test.ts
//      braucht ab M2.1 die WeltAttrappe der Laufzeit); src/ der beiden Werkzeuge darf Node importieren (sie laufen mit tsx in Node,
//      wie die Ablage);
//   2. keine Worker-Threads von Node (node:worker_threads) und kein vitest mit `pool: 'threads'` oder `'vmThreads'`: Der
//      Schreibhaken wirkt nur im Hauptthread und in Kindprozessen (6.3, Kopf von scripts/proben/schutz.mjs);
//   3. keine Teilnamen von Ozzy außerhalb von tools/studio-uebernahme, tools/studio-inhalt und pruefdaten/ (Nr. 3, F6): Die Namen
//      kommen aus studio-format/pruefdaten/ozzy-rollen.json; Namen, die zugleich Rollen-Wörter sind, bleiben als Rolle erlaubt.
//      Geprüft werden Bezeichner und Zeichenketten, keine Kommentare;
//   4. kein Paket importiert aus apps/, die Apps nicht voneinander (einzige Verbindung: spielPlugins in der vite.config.ts des
//      Spiels), apps/editor importiert nur tools/studio-uebernahme, und nur aus src/ozzy-figur/ (Nr. 4, 5);
//   5. apps/editor importiert nichts aus Studio (Nr. 5).
// Code eines anderen Pakets kommt nur über seinen Paketnamen, nie über einen relativen Pfad; Daten (JSON, SVG, Schriften) dürfen
// relativ gelesen werden. Der Test nennt selbst keinen Teilnamen.
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ROLLEN_DATEI = path.join(WURZEL, 'packages/studio-format/pruefdaten/ozzy-rollen.json');
const EDITOR = path.join(WURZEL, 'apps/editor');
const EDITOR_FIGUR = path.join(EDITOR, 'src/ozzy-figur');

// --- Matrix aus Plan 2.1 ---------------------------------------------------------------------------------------------------------

const NODE = 'node:*';
const R = '@ee/studio-rechnen';
const F = '@ee/studio-format';
const S = '@ee/studio-store';
const A = '@ee/studio-ablage';
const L = '@ee/studio-laufzeit';
const W = '@ee/studio-welt';
const B = '@ee/studio-bild';
const T = '@ee/studio-ton';
const G = '@ee/studio-autorig';
const STUDIO = '@ee/studio';
const SPIEL = '@ee/ozzy-spiel';
const UEBERNAHME = '@ee/studio-uebernahme';
const INHALT = '@ee/studio-inhalt';

interface Bereich {
  name: string;
  /** relativ zum Wurzelordner */
  ordner: string;
  /** was src/ importieren darf (Paketnamen; Muster „@scope/*“; NODE für Node) */
  darf: readonly string[];
  /** was src/ nur mit „import type“ importieren darf */
  nurTyp?: readonly string[];
  /** Teilnamen erlaubt (F6) */
  teilnamen?: true;
}

const BEREICHE: readonly Bereich[] = [
  { name: R, ordner: 'packages/studio-rechnen', darf: [] },
  { name: F, ordner: 'packages/studio-format', darf: [R, 'zod', 'fractional-indexing'] },
  { name: S, ordner: 'packages/studio-store', darf: [F] },
  { name: A, ordner: 'packages/studio-ablage', darf: [R, NODE], nurTyp: ['vite'] },
  { name: L, ordner: 'packages/studio-laufzeit', darf: [R, F] },
  { name: W, ordner: 'packages/studio-welt', darf: [R, 'box2d3-wasm'], nurTyp: [L, F] },
  { name: B, ordner: 'packages/studio-bild', darf: [], nurTyp: [L, F] },
  { name: T, ordner: 'packages/studio-ton', darf: [], nurTyp: [L, F] },
  { name: G, ordner: 'packages/studio-autorig', darf: [F, R, 'earcut'] },
  { name: STUDIO, ordner: 'apps/studio', darf: [R, F, S, A, L, W, B, T, G, 'react', 'react-dom', 'idb', '@zag-js/*', 'opentype.js'] },
  // Spiel: aus dem Format als Wert nur `laden`, sonst Typen; die Laufzeit ohne editor/ (Sonderregeln in importVerstoesse)
  { name: SPIEL, ordner: 'apps/ozzy-spiel', darf: [L, W, B, T], nurTyp: [F] },
  // Werkzeuge laufen in Node (tsx); Node ist hier wie bei der Ablage erlaubt (über 2.1 hinaus, Kopf dieser Datei)
  { name: UEBERNAHME, ordner: 'tools/studio-uebernahme', darf: [F, S, A, L, R, NODE], teilnamen: true },
  { name: INHALT, ordner: 'tools/studio-inhalt', darf: [F, S, A, L, R, 'opentype.js', NODE], teilnamen: true },
];

/** Wurzel-Skripte von Studio: nur Node und Werkzeuge */
const WURZEL_SKRIPTE: Bereich = { name: 'Wurzel-Skripte', ordner: 'scripts', darf: [NODE] };

/** Werkzeuge, die Konfiguration, Tests, e2e/, scripts/ und server/ zusätzlich importieren dürfen (2.3 Nr. 6, erweitert) */
const WERKZEUGE = ['vite', '@vitejs/*', 'vitest', 'fast-check', '@playwright/test', 'webdriverio', 'typescript', NODE];

/** Worker-Threads von Node: Der Schreibhaken sieht sie nicht (6.3) */
const WORKER_THREADS = /^(?:node:)?worker_threads(?:\/|$)/;
/** vitest mit Threads statt Kindprozessen umginge den Schreibhaken (vitest 5 nimmt ohne Angabe forks): Name des Pools, Aufruf */
const POOL_THREADS = /^(?:vm)?threads$/i;
const POOL_THREADS_AUFRUF = /--pool[=\s]+['"]?(?:vm)?threads\b/i;

const CODE = /\.[cm]?[jt]sx?$/;
const TEXT = /\.(?:html|css|json|svg|webmanifest)$/;
const NIE_BETRETEN = new Set([
  'node_modules',
  'dist',
  'dist-electron',
  'release',
  'ios',
  'android',
  'test-results',
  'playwright-report',
  'coverage',
]);
const GROESSTE_DATEI = 4_000_000;

// --- Hilfen ---------------------------------------------------------------------------------------------------------------------

const unter = (p: string, ordner: string): boolean => p === ordner || p.startsWith(ordner + path.sep);
const alsRel = (abs: string): string => path.relative(WURZEL, abs).split(path.sep).join('/');

function dateienIn(ordner: string, muster: RegExp): string[] {
  const aus: string[] = [];
  const gehen = (o: string): void => {
    let eintraege: fs.Dirent[];
    try {
      eintraege = fs.readdirSync(o, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of eintraege) {
      if (e.name.startsWith('.') || NIE_BETRETEN.has(e.name)) continue;
      const p = path.join(o, e.name);
      if (e.isDirectory()) gehen(p);
      else if (e.isFile() && muster.test(e.name)) aus.push(p);
    }
  };
  gehen(ordner);
  return aus.sort();
}

function lesen(abs: string): string | null {
  try {
    return fs.statSync(abs).size > GROESSTE_DATEI ? null : fs.readFileSync(abs, 'utf8');
  } catch {
    return null; // eben gelöscht oder umbenannt (andere Pakete bauen gleichzeitig)
  }
}

const abhaengigkeiten = new Map<string, readonly string[]>();
/** devDependencies eines Bereichs: die Werkzeuge seines Pakets */
function devAbhaengigkeiten(b: Bereich): readonly string[] {
  let liste = abhaengigkeiten.get(b.ordner);
  if (!liste) {
    try {
      const text = fs.readFileSync(path.join(WURZEL, b.ordner, 'package.json'), 'utf8');
      liste = Object.keys((JSON.parse(text) as { devDependencies?: Record<string, string> }).devDependencies ?? {});
    } catch {
      liste = [];
    }
    abhaengigkeiten.set(b.ordner, liste);
  }
  return liste;
}

/** Werkzeug-Dateien: Konfiguration, Tests, e2e/, scripts/, server/; alles andere zählt als Quelle (Matrix für src/) */
function istWerkzeug(b: Bereich, rel: string): boolean {
  if (b === WURZEL_SKRIPTE) return true;
  const name = path.posix.basename(rel);
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name) || /\.config\.[cm]?[jt]s$/.test(name)) return true;
  return ['test', 'e2e', 'scripts', 'server'].includes(rel.split('/')[0] ?? '');
}

function paketVon(spez: string): string {
  if (spez.startsWith('node:') || builtinModules.includes(spez) || builtinModules.includes(spez.split('/')[0] ?? '')) return NODE;
  const teile = spez.split('/');
  return spez.startsWith('@') ? teile.slice(0, 2).join('/') : (teile[0] ?? spez);
}

const passt = (paket: string, liste: readonly string[]): boolean =>
  liste.some((e) => e === paket || (e.endsWith('/*') && paket.startsWith(e.slice(0, -1))));

// --- Importe lesen ----------------------------------------------------------------------------------------------------------------

interface Import {
  spez: string;
  /** import type, export type … from, import('…') in Typen */
  nurTyp: boolean;
  /** importierte Namen; null ohne Liste (Seiteneffekt, require, import(), export … from) */
  namen: string[] | null;
  zeile: number;
}

function skriptArt(datei: string): ts.ScriptKind {
  if (datei.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (datei.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/.test(datei)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function quelleLesen(datei: string, text: string): ts.SourceFile {
  return ts.createSourceFile(datei, text, ts.ScriptTarget.Latest, true, skriptArt(datei));
}

function importeAus(sf: ts.SourceFile, zeileVorn = 0): Import[] {
  const aus: Import[] = [];
  const zeile = (n: ts.Node): number => zeileVorn + sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const besuchen = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const k = n.importClause;
      let namen: string[] | null = null;
      if (k) {
        namen = k.name ? ['default'] : [];
        const bindung = k.namedBindings;
        if (bindung && ts.isNamespaceImport(bindung)) namen.push('*');
        else if (bindung) for (const e of bindung.elements) namen.push((e.propertyName ?? e.name).text);
      }
      // unter verbatimModuleSyntax bleibt `import { type X } from …` zur Laufzeit stehen: nur `import type` zählt als Typ
      aus.push({ spez: n.moduleSpecifier.text, nurTyp: k?.isTypeOnly === true, namen, zeile: zeile(n) });
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      aus.push({ spez: n.moduleSpecifier.text, nurTyp: n.isTypeOnly, namen: null, zeile: zeile(n) });
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) {
      const a = n.moduleReference.expression;
      if (ts.isStringLiteral(a)) aus.push({ spez: a.text, nurTyp: n.isTypeOnly, namen: null, zeile: zeile(n) });
    } else if (ts.isCallExpression(n)) {
      const a = n.arguments[0];
      const ruft = n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require');
      if (ruft && a && ts.isStringLiteralLike(a)) aus.push({ spez: a.text, nurTyp: false, namen: null, zeile: zeile(n) });
    } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
      aus.push({ spez: n.argument.literal.text, nurTyp: true, namen: null, zeile: zeile(n) });
    }
    ts.forEachChild(n, besuchen);
  };
  besuchen(sf);
  return aus;
}

const zeileBei = (text: string, stelle: number): number => text.slice(0, stelle).split('\n').length;

/** Importe einer Datei; in HTML die Quellen der script-Elemente und die Importe der eingebetteten Module */
function importe(datei: string, text: string): Import[] {
  if (CODE.test(datei)) return importeAus(quelleLesen(datei, text));
  if (!datei.endsWith('.html')) return [];
  const aus: Import[] = [];
  const ohneKommentare = text.replace(/<!--[\s\S]*?-->/g, (k) => k.replace(/[^\n]/g, ' '));
  for (const m of ohneKommentare.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attribute = m[1] ?? '';
    const zeile = zeileBei(ohneKommentare, m.index);
    const quelle = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attribute)?.[1];
    if (quelle !== undefined && !/^(?:https?:|data:)/.test(quelle)) {
      const spez = quelle.startsWith('/') || quelle.startsWith('.') ? quelle : `./${quelle}`;
      aus.push({ spez, nurTyp: false, namen: null, zeile });
    } else if (quelle === undefined && /type\s*=\s*["']module["']/i.test(attribute)) {
      aus.push(...importeAus(quelleLesen(`${datei}.mts`, m[2] ?? ''), zeile - 1));
    }
  }
  return aus;
}

// --- Regeln 1, 2 und 4: Import-Matrix, Worker-Threads, Grenzen zwischen Paketen und Apps -----------------------------------------

/** Der Bereich, in dem ein Pfad liegt, sonst der Editor, eine andere App oder sonst etwas */
function ortVon(abs: string): { art: 'bereich'; bereich: Bereich } | { art: 'editor' | 'app' | 'sonst' } {
  for (const b of BEREICHE) if (unter(abs, path.join(WURZEL, b.ordner))) return { art: 'bereich', bereich: b };
  if (unter(abs, EDITOR)) return { art: 'editor' };
  if (unter(abs, path.join(WURZEL, 'apps'))) return { art: 'app' };
  return { art: 'sonst' };
}

const istApp = (b: Bereich): boolean => b.ordner.startsWith('apps/');

/** Verstöße gegen die Regeln 1, 2 (Worker-Threads) und 4 in einer Datei des Bereichs b */
function importVerstoesse(b: Bereich, abs: string, text: string): string[] {
  const rel = path.relative(path.join(WURZEL, b.ordner), abs).split(path.sep).join('/');
  const wo = alsRel(abs);
  const werkzeug = istWerkzeug(b, rel);
  const aus: string[] = [];
  for (const i of importe(abs, text)) {
    const melden = (grund: string): number => aus.push(`${wo}:${i.zeile}: ${i.spez}: ${grund}`);
    if (WORKER_THREADS.test(i.spez)) {
      melden('Worker-Threads von Node laufen ohne Schreibhaken (6.3); Kindprozesse nehmen ihn mit');
      continue;
    }
    const ohneAnfrage = i.spez.split('?')[0] ?? i.spez;
    if (ohneAnfrage.startsWith('.') || ohneAnfrage.startsWith('/')) {
      // „/…“ ist in Vite die Wurzel der Seite, also der Ordner des Bereichs
      const ziel = ohneAnfrage.startsWith('/')
        ? path.join(WURZEL, b.ordner, ohneAnfrage)
        : path.resolve(path.dirname(abs), ohneAnfrage);
      const ort = ortVon(ziel);
      if (ort.art === 'bereich' && ort.bereich === b) continue;
      if (ort.art === 'editor') {
        if (b.name !== UEBERNAHME || !unter(ziel, EDITOR_FIGUR)) {
          melden('apps/editor liest nur tools/studio-uebernahme, und nur src/ozzy-figur/ (2.3 Nr. 5)');
        }
        continue;
      }
      if (ort.art === 'app' || (ort.art === 'bereich' && istApp(ort.bereich))) {
        const spielPlugins =
          b.name === SPIEL &&
          rel === 'vite.config.ts' &&
          ziel.replace(/\.[cm]?[jt]s$/, '') === path.join(WURZEL, 'apps/studio/server/plugins') &&
          JSON.stringify(i.namen) === '["spielPlugins"]';
        if (!spielPlugins) {
          melden(
            istApp(b)
              ? 'die Apps verbindet nur spielPlugins in der vite.config.ts des Spiels (2.3 Nr. 4)'
              : 'kein Paket importiert aus apps/ (2.3 Nr. 5)',
          );
        }
        continue;
      }
      const code = CODE.test(ziel) || path.extname(ziel) === '';
      if (code && ort.art === 'bereich') melden(`Code von ${ort.bereich.name} nur über den Paketnamen (Matrix 2.1)`);
      else if (code) melden('Code nur aus dem eigenen Paket oder über einen erlaubten Paketnamen (Matrix 2.1)');
      continue; // Daten (JSON, SVG, Schriften) dürfen gelesen werden
    }
    const paket = paketVon(i.spez);
    if (paket === b.name) continue;
    if (paket === STUDIO || paket === SPIEL || paket === '@ee/editor') {
      melden(istApp(b) ? 'die Apps importieren einander nicht (2.3 Nr. 4)' : 'kein Paket importiert aus apps/ (2.3 Nr. 5)');
      continue;
    }
    if (b.name === SPIEL && /^@ee\/studio-laufzeit\/editor(?:\/|$)/.test(i.spez)) {
      melden('editor/ der Laufzeit gehört nicht ins Spiel (2.3 Nr. 4)');
      continue;
    }
    if (b.name === SPIEL && paket === F && !werkzeug && !i.nurTyp && i.spez !== `${F}/laden`) {
      melden('aus dem Format nimmt das Spiel als Wert nur laden, sonst Typen (2.1)');
      continue;
    }
    if (b.name === SPIEL && paket === F) continue;
    const nurTyp = b.nurTyp ?? [];
    const darf = werkzeug ? [...b.darf, ...nurTyp, ...WERKZEUGE, ...devAbhaengigkeiten(b)] : b.darf;
    if (passt(paket, darf)) continue;
    if (passt(paket, nurTyp)) {
      if (!i.nurTyp) melden(`${paket} nur mit „import type“ (Matrix 2.1)`);
      continue;
    }
    const wer = werkzeug ? `Werkzeug-Dateien von ${b.name}` : `src/ von ${b.name}`;
    melden(`${paket === NODE ? 'Node' : paket} ist für ${wer} nicht erlaubt (Matrix 2.1)`);
  }
  return aus;
}

// --- Regel 2: vitest ohne Threads ---------------------------------------------------------------------------------------------------

/** Stellen in einer Konfiguration (Code) oder package.json (Skripte), die vitest mit Threads laufen ließen */
function poolVerstoesse(abs: string, text: string): string[] {
  const wo = alsRel(abs);
  if (abs.endsWith('.json')) {
    let skripte: Record<string, unknown> = {};
    try {
      skripte = (JSON.parse(text) as { scripts?: Record<string, unknown> }).scripts ?? {};
    } catch {
      return [`${wo}: kein gültiges JSON`];
    }
    return Object.entries(skripte)
      .filter(([, befehl]) => typeof befehl === 'string' && POOL_THREADS_AUFRUF.test(befehl))
      .map(([name]) => `${wo}: Skript „${name}“ startet vitest mit Threads`);
  }
  const aus: string[] = [];
  const sf = quelleLesen(abs, text);
  const besuchen = (n: ts.Node): void => {
    if (
      ts.isPropertyAssignment(n) &&
      (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) &&
      n.name.text === 'pool' &&
      ts.isStringLiteralLike(n.initializer) &&
      POOL_THREADS.test(n.initializer.text)
    ) {
      aus.push(`${wo}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}: pool '${n.initializer.text}'`);
    }
    ts.forEachChild(n, besuchen);
  };
  besuchen(sf);
  return aus;
}

// --- Regel 3: keine Teilnamen ---------------------------------------------------------------------------------------------------

interface Rollen {
  rollen: string[];
  seiten: string[];
  teile: { name: string; rolle: string; seite: string; partner?: string; gebaut?: boolean }[];
  ansichten: Record<string, { datei: string; teile: string[] }>;
}

const sonderzeichen = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Suchmuster für Namen in Bezeichnern und Zeichenketten: am Wortanfang (der erste Buchstabe auch groß) oder als Binnenwort im
 * camelCase (erster Buchstabe groß nach einem Kleinbuchstaben oder einer Ziffer), und dahinter kein Kleinbuchstabe. So trifft ein Name
 * auch in „…/name“, „nameWinkel“ und „seinName“, aber nicht in längeren Wörtern, die nur so anfangen.
 */
function namenMuster(namen: readonly string[]): RegExp | null {
  const sortiert = [...namen].filter((n) => n.length > 0).sort((a, b) => b.length - a.length);
  if (sortiert.length === 0) return null;
  const erster = (n: string): string => n[0] ?? '';
  const vorn = sortiert.map((n) => `[${sonderzeichen(erster(n))}${sonderzeichen(erster(n).toUpperCase())}]${sonderzeichen(n.slice(1))}`);
  const binnen = sortiert.map((n) => sonderzeichen(erster(n).toUpperCase() + n.slice(1)));
  const amAnfang = `(?<![\\p{L}\\p{N}])(?:${vorn.join('|')})`;
  const imWort = `(?<=[\\p{Ll}\\p{N}])(?:${binnen.join('|')})`;
  return new RegExp(`(?:${amAnfang}|${imWort})(?!\\p{Ll})`, 'gu');
}

function treffer(muster: RegExp, text: string): string[] {
  return [...text.matchAll(muster)].map((m) => m[0]);
}

/** Teilnamen in Bezeichnern und Zeichenketten (Code) oder im Text ohne Kommentare (HTML, CSS, JSON, SVG) */
function namenVerstoesse(wo: string, datei: string, text: string, muster: RegExp): string[] {
  const aus: string[] = [];
  if (CODE.test(datei)) {
    const sf = quelleLesen(datei, text);
    const besuchen = (n: ts.Node): void => {
      const bezeichner = ts.isIdentifier(n) || ts.isPrivateIdentifier(n);
      const zeichenkette = ts.isStringLiteralLike(n) || ts.isTemplateLiteralToken(n) || ts.isJsxText(n) || ts.isRegularExpressionLiteral(n);
      if (bezeichner || zeichenkette) {
        const zeile = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        for (const t of treffer(muster, n.text)) aus.push(`${wo}:${zeile}: „${t}“`);
      }
      ts.forEachChild(n, besuchen);
    };
    besuchen(sf);
    return aus;
  }
  let ohne = text;
  if (/\.(?:html|svg)$/.test(datei)) ohne = ohne.replace(/<!--[\s\S]*?-->/g, (k) => k.replace(/[^\n]/g, ' '));
  if (/\.(?:css|html)$/.test(datei)) ohne = ohne.replace(/\/\*[\s\S]*?\*\//g, (k) => k.replace(/[^\n]/g, ' '));
  for (const m of ohne.matchAll(muster)) aus.push(`${wo}:${zeileBei(ohne, m.index)}: „${m[0]}“`);
  return aus;
}

const teilnamenErlaubt = (b: Bereich, abs: string): boolean =>
  b.teilnamen === true || alsRel(abs).split('/').includes('pruefdaten');

// --- Dateien ----------------------------------------------------------------------------------------------------------------------

interface Datei {
  bereich: Bereich;
  abs: string;
  text: string;
}

function alleDateien(): Datei[] {
  const aus: Datei[] = [];
  const muster = new RegExp(`(?:${CODE.source})|(?:${TEXT.source})`);
  for (const b of BEREICHE) {
    for (const abs of dateienIn(path.join(WURZEL, b.ordner), muster)) {
      const text = lesen(abs);
      if (text !== null) aus.push({ bereich: b, abs, text });
    }
  }
  for (const abs of dateienIn(path.join(WURZEL, 'scripts'), /^studio-.*\.[cm]?[jt]s$/)) {
    const text = lesen(abs);
    if (text !== null) aus.push({ bereich: WURZEL_SKRIPTE, abs, text });
  }
  return aus;
}

// --- Tests ------------------------------------------------------------------------------------------------------------------------

describe('Grenzen von Studio (Plan 2.3)', () => {
  const dateien = alleDateien();
  const rollen = JSON.parse(fs.readFileSync(ROLLEN_DATEI, 'utf8')) as Rollen;
  const rollenWoerter = new Set(rollen.rollen);
  // Namen, die zugleich Rollen-Wörter sind, bleiben als Rolle erlaubt (Nr. 3); der Test kennt sie nur aus der Datei
  const namen = rollen.teile.map((t) => t.name).filter((n) => !rollenWoerter.has(n));
  const muster = namenMuster(namen);

  it('ozzy-rollen.json ist vollständig: jedes Teil mit Rolle und Seite, jede Ansicht nur mit bekannten Teilen', () => {
    const seiten = new Set(rollen.seiten);
    const alleNamen = rollen.teile.map((t) => t.name);
    expect(new Set(alleNamen).size).toBe(alleNamen.length);
    expect(rollen.teile.filter((t) => !rollenWoerter.has(t.rolle) || !seiten.has(t.seite))).toEqual([]);
    expect(rollen.teile.filter((t) => t.partner !== undefined && !alleNamen.includes(t.partner))).toEqual([]);
    const fremd = Object.entries(rollen.ansichten).flatMap(([a, v]) =>
      v.teile.filter((n) => !alleNamen.includes(n)).map((n) => `${a}: ${n}`),
    );
    expect(fremd).toEqual([]);
    expect(Object.keys(rollen.ansichten).length).toBeGreaterThan(0);
    expect(namen.length).toBeGreaterThan(0);
  });

  it('findet Studio-Quellen', () => {
    expect(dateien.some((d) => d.bereich.name === STUDIO)).toBe(true);
    expect(dateien.some((d) => d.bereich.name === SPIEL)).toBe(true);
  });

  it('Import-Matrix aus 2.1, „nur import type“, keine Worker-Threads, keine Importe über App-Grenzen (2.3 Nr. 4 bis 6)', () => {
    expect(dateien.flatMap((d) => importVerstoesse(d.bereich, d.abs, d.text))).toEqual([]);
  });

  it('vitest läuft in Kindprozessen, nie mit Threads (6.3)', () => {
    const verstoesse: string[] = [];
    const ordner = [...BEREICHE.map((b) => b.ordner), '.'];
    for (const o of ordner) {
      for (const name of ['vitest.config.ts', 'vitest.config.mts', 'vite.config.ts', 'package.json']) {
        const abs = path.join(WURZEL, o, name);
        const text = lesen(abs);
        if (text !== null) verstoesse.push(...poolVerstoesse(abs, text));
      }
    }
    expect(verstoesse).toEqual([]);
  });

  it('keine Teilnamen außerhalb der Übernahme, der Inhalt-Skripte und pruefdaten/ (2.3 Nr. 3)', () => {
    if (muster === null) throw new Error('keine Namen in ozzy-rollen.json');
    const verstoesse = dateien
      .filter((d) => !teilnamenErlaubt(d.bereich, d.abs))
      .flatMap((d) => namenVerstoesse(alsRel(d.abs), d.abs, d.text, muster));
    expect(verstoesse).toEqual([]);
  });

  it('apps/editor importiert nichts aus Studio (2.3 Nr. 5)', () => {
    const studioOrdner = BEREICHE.map((b) => path.join(WURZEL, b.ordner));
    const verstoesse: string[] = [];
    for (const abs of dateienIn(EDITOR, CODE)) {
      const text = lesen(abs);
      if (text === null) continue;
      for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(["'])([^"'\n]+)\1/g)) {
        const spez = m[2] ?? '';
        const ziel = spez.startsWith('.') ? path.resolve(path.dirname(abs), spez) : null;
        if (/^@ee\/(?:studio|ozzy-spiel)(?:-|\/|$)/.test(spez) || (ziel !== null && studioOrdner.some((o) => unter(ziel, o)))) {
          verstoesse.push(`${alsRel(abs)}:${zeileBei(text, m.index)}: ${spez}`);
        }
      }
    }
    const paket = JSON.parse(fs.readFileSync(path.join(EDITOR, 'package.json'), 'utf8')) as Record<string, unknown>;
    for (const feld of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const liste = (paket[feld] ?? {}) as Record<string, string>;
      for (const n of Object.keys(liste)) {
        if (/^@ee\/(?:studio|ozzy-spiel)(?:-|$)/.test(n)) verstoesse.push(`apps/editor/package.json: ${feld} ${n}`);
      }
    }
    expect(verstoesse).toEqual([]);
  });
});

describe('Die Prüfung erkennt Verstöße (Probe an erfundenen Dateien)', () => {
  const bereich = (name: string): Bereich => {
    const b = BEREICHE.find((x) => x.name === name);
    if (!b) throw new Error(name);
    return b;
  };
  const datei = (b: Bereich, rel: string): string => path.join(WURZEL, b.ordner, rel);
  const pruefen = (name: string, rel: string, text: string): number =>
    importVerstoesse(bereich(name), datei(bereich(name), rel), text).length;

  it('meldet verbotene Importe und lässt erlaubte stehen', () => {
    expect(pruefen(SPIEL, 'src/x.ts', "import { Store } from '@ee/studio-store/store';")).toBe(1);
    expect(pruefen(SPIEL, 'src/x.ts', "import type { Zug } from '@ee/studio-laufzeit/editor/zug';")).toBe(1);
    expect(pruefen(SPIEL, 'src/x.ts', "import { pruefen } from '@ee/studio-format/pruefen';")).toBe(1);
    const formatErlaubt = [
      "import { laden } from '@ee/studio-format/laden';",
      "import type { Dokument } from '@ee/studio-format/typen/dokument';",
    ].join('\n');
    expect(pruefen(SPIEL, 'src/x.ts', formatErlaubt)).toBe(0);
    expect(pruefen(SPIEL, 'vite.config.ts', "import { spielPlugins } from '../studio/server/plugins';")).toBe(0);
    expect(pruefen(SPIEL, 'vite.config.ts', "import { studioPlugins } from '../studio/server/plugins';")).toBe(1);
    expect(pruefen(SPIEL, 'src/x.ts', "import { spielPlugins } from '../../studio/server/plugins';")).toBe(1);
    expect(pruefen(L, 'src/x.ts', "import React from 'react';")).toBe(1);
    expect(pruefen(L, 'src/x.ts', "import { a } from '../../studio-store/src/store';")).toBe(1);
    expect(pruefen(L, 'src/x.ts', "import daten from '../../studio-format/pruefdaten/testfigur.json';")).toBe(0);
    expect(pruefen(L, 'src/x.ts', "import fs from 'node:fs';")).toBe(1);
    expect(pruefen(L, 'src/x.test.ts', "import fs from 'node:fs';\nimport fc from 'fast-check';\nimport { it } from 'vitest';")).toBe(0);
    expect(pruefen(B, 'src/x.ts', "import { bauen } from '@ee/studio-laufzeit/fassade';")).toBe(1);
    expect(pruefen(B, 'src/x.ts', "import type { Bauplan } from '@ee/studio-laufzeit/vertrag/bauplan';")).toBe(0);
    expect(pruefen(B, 'src/x.ts', "import { type Bauplan } from '@ee/studio-laufzeit/vertrag/bauplan';")).toBe(1);
    expect(pruefen(A, 'src/x.ts', "import type { Plugin } from 'vite';\nimport fs from 'node:fs';")).toBe(0);
    expect(pruefen(A, 'src/x.ts', "import { createServer } from 'vite';")).toBe(1);
    expect(pruefen(R, 'src/x.ts', "import { a } from '../../../apps/studio/src/main';")).toBe(1);
    expect(pruefen(INHALT, 'src/x.ts', "import { a } from '../../../apps/editor/src/ozzy-figur/form';")).toBe(1);
    expect(pruefen(UEBERNAHME, 'src/x.ts', "import { a } from '../../../apps/editor/src/ozzy-figur/form';")).toBe(0);
    expect(pruefen(UEBERNAHME, 'src/x.ts', "import { a } from '../../../apps/editor/src/form/werk';")).toBe(1);
    expect(pruefen(STUDIO, 'src/x.ts', "import { a } from '../../ozzy-spiel/src/main';")).toBe(1);
    expect(pruefen(STUDIO, 'src/x.ts', "const z = await import('@ee/shape/dicht/x');")).toBe(1);
    expect(pruefen(STUDIO, 'src/x.tsx', "import { useState } from 'react';\nimport { menu } from '@zag-js/menu';")).toBe(0);
    expect(pruefen(STUDIO, 'e2e/x.spec.ts', "import { test } from '@playwright/test';")).toBe(0);
    const seite = '<script type="module">import a from "@ee/shape/x";</script>';
    expect(importVerstoesse(bereich(STUDIO), datei(bereich(STUDIO), 'x.html'), seite)).toHaveLength(1);
    // Worker-Threads nirgends, auch nicht in Werkzeug-Dateien und Werkzeugen, die Node sonst dürfen
    expect(pruefen(A, 'src/x.ts', "import { Worker } from 'node:worker_threads';")).toBe(1);
    expect(pruefen(UEBERNAHME, 'src/x.ts', "import wt from 'worker_threads';")).toBe(1);
    expect(pruefen(STUDIO, 'scripts/proben/x.mjs', "const { Worker } = await import('node:worker_threads');")).toBe(1);
    expect(importVerstoesse(WURZEL_SKRIPTE, path.join(WURZEL, 'scripts/studio-x.mjs'), "import 'node:worker_threads';")).toHaveLength(1);
    expect(pruefen(A, 'src/x.ts', "import { fork } from 'node:child_process';")).toBe(0);
  });

  it('meldet vitest mit Threads in Konfiguration und Skripten', () => {
    const konfig = datei(bereich(L), 'vitest.config.ts');
    expect(poolVerstoesse(konfig, "export default defineConfig({ test: { pool: 'threads' } });")).toHaveLength(1);
    expect(poolVerstoesse(konfig, "export default { test: { projects: [{ test: { pool: 'vmThreads' } }] } };")).toHaveLength(1);
    expect(poolVerstoesse(konfig, "// pool: 'threads'\nexport default { test: { pool: 'forks' } };")).toEqual([]);
    const paket = datei(bereich(L), 'package.json');
    expect(poolVerstoesse(paket, JSON.stringify({ scripts: { test: 'vitest run --pool=threads' } }))).toHaveLength(1);
    expect(poolVerstoesse(paket, JSON.stringify({ scripts: { test: 'vitest run --pool forks' } }))).toEqual([]);
  });

  it('findet Namen in Bezeichnern und Zeichenketten, nicht in längeren Wörtern und nicht in Kommentaren', () => {
    // erfundene Namen, keine Teile von Ozzy
    const m = namenMuster(['pfoteQ', 'zehL', 'kralle']);
    if (m === null) throw new Error('kein Muster');
    const finde = (text: string): number => namenVerstoesse('x.ts', 'x.ts', text, m).length;
    expect(finde('const pfoteQ = 1;')).toBe(1);
    expect(finde("const t = 'tier/pfoteQ';")).toBe(1);
    expect(finde('const linkePfoteQ = 1;')).toBe(1);
    expect(finde('const pfoteQWinkel = 1;')).toBe(1);
    expect(finde('const zehL2 = 1;')).toBe(1);
    expect(finde("const titel = 'Kralle';")).toBe(1);
    expect(finde('const t = `a${1}kralle`;')).toBe(1);
    expect(finde('const pfoteQuer = 1; const zehLinks = 2; const krallen = 3;')).toBe(0);
    expect(finde('// pfoteQ im Kommentar\n/* zehL */ const a = 1;')).toBe(0);
    expect(namenVerstoesse('x.css', 'x.css', '/* kralle */ .a { color: red; }\n.kralle { color: red; }', m)).toHaveLength(1);
  });
});
