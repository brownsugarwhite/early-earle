// Das Spiel bleibt schlank (Plan 2.3 Nr. 4): Es importiert weder @ee/studio-store noch @ee/studio-laufzeit/editor/* noch React noch
// opentype.js, hat höchstens 300 Zeilen Code (ohne Tests und Konfiguration), und seine einzige Verbindung zu Studio ist spielPlugins
// aus apps/studio/server/plugins.ts in vite.config.ts (läuft nur im Server). Was dem Spiel fehlt, ist eine Lücke im Editor, kein
// Spielcode (Konzept, Grundgesetz 10).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SPIEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STUDIO_PLUGINS = path.resolve(SPIEL, '../studio/server/plugins');
const HOECHSTENS = 300;
const CODE = /\.[cm]?[jt]sx?$/;
const NIE_BETRETEN = new Set(['node_modules', 'dist', 'ios', 'android', 'test-results', 'playwright-report', 'coverage']);

const VERBOTEN: readonly { muster: RegExp; grund: string }[] = [
  { muster: /^@ee\/studio-store(?:\/|$)/, grund: 'der Store gehört in den Editor' },
  { muster: /^@ee\/studio-laufzeit\/editor(?:\/|$)/, grund: 'editor/ der Laufzeit gehört in den Editor' },
  { muster: /^react(?:-dom)?(?:\/|$)/, grund: 'kein React im Spiel' },
  { muster: /^opentype\.js(?:\/|$)/, grund: 'das Spiel liest keine Schriften' },
];

interface Import {
  spez: string;
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

/** Alle Importe einer Datei: import, export … from, import x = require(), require(), import(), import('…') in Typen. */
function importe(datei: string, text: string): Import[] {
  const sf = ts.createSourceFile(datei, text, ts.ScriptTarget.Latest, true, skriptArt(datei));
  const aus: Import[] = [];
  const zeile = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const besuchen = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const k = n.importClause;
      let namen: string[] | null = null;
      if (k) {
        namen = k.name ? ['default'] : [];
        const b = k.namedBindings;
        if (b && ts.isNamespaceImport(b)) namen.push('*');
        else if (b) for (const e of b.elements) namen.push((e.propertyName ?? e.name).text);
      }
      aus.push({ spez: n.moduleSpecifier.text, namen, zeile: zeile(n) });
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      aus.push({ spez: n.moduleSpecifier.text, namen: null, zeile: zeile(n) });
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) {
      const a = n.moduleReference.expression;
      if (ts.isStringLiteral(a)) aus.push({ spez: a.text, namen: null, zeile: zeile(n) });
    } else if (ts.isCallExpression(n)) {
      const a = n.arguments[0];
      const ruft = n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require');
      if (ruft && a && ts.isStringLiteralLike(a)) aus.push({ spez: a.text, namen: null, zeile: zeile(n) });
    } else if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
      aus.push({ spez: n.argument.literal.text, namen: null, zeile: zeile(n) });
    }
    ts.forEachChild(n, besuchen);
  };
  besuchen(sf);
  return aus;
}

/** Zeilen mit Code: jede Zeile, auf der ein Zeichen steht, das kein Leerraum und kein Kommentar ist. */
function codeZeilen(datei: string, text: string): number {
  const sf = ts.createSourceFile(datei, text, ts.ScriptTarget.Latest, true, skriptArt(datei));
  const zeilen = new Set<number>();
  const besuchen = (n: ts.Node): void => {
    if (n.kind >= ts.SyntaxKind.FirstJSDocNode && n.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const kinder = n.getChildren(sf);
    if (kinder.length > 0) {
      for (const k of kinder) besuchen(k);
      return;
    }
    if (n.kind === ts.SyntaxKind.EndOfFileToken) return;
    if (ts.isJsxText(n) && n.containsOnlyTriviaWhiteSpaces) return;
    const von = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line;
    const bis = sf.getLineAndCharacterOfPosition(n.getEnd()).line;
    for (let z = von; z <= bis; z++) zeilen.add(z);
  };
  besuchen(sf);
  return zeilen.size;
}

function dateien(ordner: string): string[] {
  const aus: string[] = [];
  const gehen = (o: string): void => {
    for (const e of fs.readdirSync(o, { withFileTypes: true })) {
      if (e.name.startsWith('.') || NIE_BETRETEN.has(e.name)) continue;
      const p = path.join(o, e.name);
      if (e.isDirectory()) gehen(p);
      else if (e.isFile() && CODE.test(e.name)) aus.push(p);
    }
  };
  gehen(ordner);
  return aus.sort();
}

const relativ = (p: string): string => path.relative(SPIEL, p).split(path.sep).join('/');
const istTestOderKonfig = (rel: string): boolean =>
  /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel) || /\.config\.[cm]?[jt]s$/.test(rel) || /^(?:test|e2e)\//.test(rel);

/** Verbotene Importe einer Datei */
function verboteneImporte(rel: string, text: string): string[] {
  const aus: string[] = [];
  for (const i of importe(rel, text)) {
    for (const v of VERBOTEN) if (v.muster.test(i.spez)) aus.push(`${rel}:${i.zeile}: ${i.spez} (${v.grund})`);
  }
  return aus;
}

/** Verbindungen nach Studio: nur vite.config.ts → apps/studio/server/plugins mit genau spielPlugins */
function verbindungen(abs: string, text: string): string[] {
  const rel = relativ(abs);
  const aus: string[] = [];
  for (const i of importe(rel, text)) {
    const app = /^@ee\/(?:studio|ozzy-spiel)(?:\/|$)/.test(i.spez);
    if (!i.spez.startsWith('.') && !app) continue;
    const ziel = app ? i.spez : path.resolve(path.dirname(abs), i.spez.split('?')[0] ?? '');
    if (!app && (ziel === SPIEL || ziel.startsWith(SPIEL + path.sep))) continue;
    const erlaubt =
      rel === 'vite.config.ts' && ziel.replace(/\.[cm]?[jt]s$/, '') === STUDIO_PLUGINS && JSON.stringify(i.namen) === '["spielPlugins"]';
    if (!erlaubt) aus.push(`${rel}:${i.zeile}: ${i.spez} (nur vite.config.ts darf spielPlugins aus apps/studio/server/plugins.ts holen)`);
  }
  return aus;
}

describe('Das Spiel bleibt schlank (Plan 2.3 Nr. 4)', () => {
  const alle = dateien(SPIEL);
  const texte = new Map(alle.map((d) => [d, fs.readFileSync(d, 'utf8')] as const));

  it('importiert weder Store noch editor/ der Laufzeit noch React noch opentype.js', () => {
    expect(alle.length).toBeGreaterThan(0);
    expect(alle.flatMap((d) => verboteneImporte(relativ(d), texte.get(d) ?? ''))).toEqual([]);
  });

  it(`hat höchstens ${HOECHSTENS} Zeilen Code ohne Tests und Konfiguration`, () => {
    const je = alle.filter((d) => !istTestOderKonfig(relativ(d))).map((d) => [relativ(d), codeZeilen(d, texte.get(d) ?? '')] as const);
    const summe = je.reduce((s, [, n]) => s + n, 0);
    expect(summe, `Zeilen je Datei: ${je.map(([d, n]) => `${d} ${n}`).join(', ')}`).toBeLessThanOrEqual(HOECHSTENS);
  });

  it('ist mit Studio nur über spielPlugins in vite.config.ts verbunden', () => {
    expect(alle.flatMap((d) => verbindungen(d, texte.get(d) ?? ''))).toEqual([]);
  });

  it('erkennt Verstöße (Probe der Prüfung selbst)', () => {
    const quelle = [
      "import { Store } from '@ee/studio-store/store';",
      "import type { Zug } from '@ee/studio-laufzeit/editor/zug';",
      "export * from '@ee/studio-store/diff';",
      "const r = await import('react');",
      "const o = require('opentype.js');",
      "import { laden } from '@ee/studio-format/laden';",
      "import { form } from '@ee/studio-laufzeit/form/koordinaten';",
    ].join('\n');
    expect(verboteneImporte('src/probe.ts', quelle).map((v) => v.split(' ')[0])).toEqual([
      'src/probe.ts:1:',
      'src/probe.ts:2:',
      'src/probe.ts:3:',
      'src/probe.ts:4:',
      'src/probe.ts:5:',
    ]);
    const konfig = path.join(SPIEL, 'vite.config.ts');
    expect(verbindungen(konfig, "import { spielPlugins } from '../studio/server/plugins';")).toEqual([]);
    expect(verbindungen(konfig, "import { studioPlugins } from '../studio/server/plugins';")).toHaveLength(1);
    expect(verbindungen(path.join(SPIEL, 'src/x.ts'), "import { spielPlugins } from '../../studio/server/plugins';")).toHaveLength(1);
    expect(verbindungen(path.join(SPIEL, 'src/x.ts'), "import { a } from '@ee/studio/src/main';")).toHaveLength(1);
    const zeilen = ['// Kommentar', '', '/** Doku', ' * mehr */', 'const a = 1; // dahinter', 'const b = `zwei', 'drei`;', '/* lang', '*/'];
    expect(codeZeilen('src/z.ts', zeilen.join('\n'))).toBe(3);
  });
});
