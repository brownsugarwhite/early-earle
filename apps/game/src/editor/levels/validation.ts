/**
 * Live-Validierung eines Entwurfs: zod-`LevelSchema` (harte Fehler, blockieren Speichern) plus
 * weiche Hinweise aus GDD 5/6 (Zugbänder, Zielstufen, Spawn-Erreichbarkeit). Alle Texte deutsch.
 */

import { LevelSchema, SPECIAL_OFF, countElementKinds, type LevelDef } from '@ee/core';
import { levelNumber, moundCells, openCellCount, sourceAdjacentCells, type Cell, type LevelDraft } from './draft';

export interface Issue {
  /** Lesbarer Pfad, z. B. „Start-Blob 3“. */
  where: string;
  message: string;
  severity: 'error' | 'warn';
  /** Reiter, in dem sich das Problem beheben lässt. */
  tab: 'werkzeug' | 'ziele' | 'spawn';
  /** Betroffene Zellen (markiert das Brett). */
  cells?: Cell[];
}

export interface ValidationResult {
  ok: boolean;
  /** Geparstes Level, wenn gültig (füttert Vorschau und Solver). */
  level: LevelDef | null;
  errors: Issue[];
  warnings: Issue[];
}

const SEGMENT_LABEL: Record<string, string> = {
  grid: 'Raster',
  mask: 'Maske',
  w: 'Breite',
  h: 'Höhe',
  fences: 'Zaun',
  floors: 'Boden',
  blockers: 'Blocker',
  threats: 'Bedrohung',
  start: 'Start-Blob',
  spawn: 'Spawn',
  sources: 'Gasquelle',
  table: 'Tabelle',
  weight: 'Gewicht',
  tier: 'Stufe',
  goals: 'Ziel',
  moves: 'Züge',
  cap: 'Kappe',
  specials: 'Spezialteile',
  lineAt: 'Strahl ab',
  burstAt: 'Knall ab',
  difficulty: 'Schwierigkeit',
  targetAttempts: 'Versuche-Band',
  style: 'Stil',
  id: 'ID',
  name: 'Name',
  zone: 'Zone',
  at: 'Position',
  content: 'Inhalt',
  layers: 'Lagen',
  fallback: 'Fallback',
  preview: 'Vorschau',
  portalId: 'Rohr-Kennung',
  script: 'Skript',
  kind: 'Art',
};

function tabFor(path: readonly PropertyKey[]): Issue['tab'] {
  const head = String(path[0] ?? '');
  if (head === 'grid' || head === 'fences') return 'werkzeug';
  if (head === 'spawn') return 'spawn';
  if (head === 'floors' || head === 'blockers' || head === 'threats' || head === 'start') return 'werkzeug';
  return 'ziele';
}

const asCell = (v: unknown): Cell | null => (Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number' ? [v[0], v[1]] : null);

/** Zellen, auf die ein zod-Pfad oder eine Meldung zeigt (für Markierungen auf dem Brett). */
function cellsFor(d: LevelDraft, path: readonly PropertyKey[], message: string): Cell[] {
  const out: Cell[] = [];
  const m = /\[(\d+),(\d+)\]/.exec(message);
  if (m) out.push([Number(m[1]), Number(m[2])]);
  const [head, idx, sub] = path;
  if (typeof idx === 'number') {
    if (head === 'start') {
      const c = asCell(d.start[idx]?.at);
      if (c) out.push(c);
    } else if (head === 'floors' || head === 'threats') {
      const c = asCell(d[head][idx]?.at);
      if (c) out.push(c);
    } else if (head === 'blockers') {
      const b = d.blockers[idx];
      const c = asCell(b?.at);
      if (b && c) out.push(...(b.kind === 'scrapMound' ? moundCells(c) : [c]));
    } else if (head === 'fences') {
      const f = d.fences[idx];
      const a = asCell(f?.a);
      const b = asCell(f?.b);
      if (a) out.push(a);
      if (b) out.push(b);
    }
  } else if (head === 'spawn' && idx === 'sources' && typeof sub === 'number') {
    const c = asCell(d.spawn.sources[sub]);
    if (c) out.push(c);
  } else if (head === 'spawn' && idx === 'script' && typeof sub === 'number') {
    const c = asCell(d.spawn.script?.[sub]?.at);
    if (c) out.push(c);
  }
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = `${c[0]},${c[1]}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function describePath(path: readonly PropertyKey[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    if (typeof seg === 'number') {
      const prev = parts.pop();
      parts.push(`${prev ?? 'Eintrag'} ${seg + 1}`);
    } else {
      const s = String(seg);
      if (s === 'grid') continue;
      parts.push(SEGMENT_LABEL[s] ?? s);
    }
  }
  return parts.join(' › ') || 'Level';
}

const TRANSLATIONS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^mask must have (\d+) rows$/, (m) => `Maske braucht ${m[1]} Zeilen`],
  [/^mask row (\d+) must have (\d+) chars$/, (m) => `Maskenzeile ${Number(m[1]) + 1} braucht ${m[2]} Zeichen`],
  [/^grid needs at least 2 playable cells$/, () => 'Raster braucht mindestens 2 freie Zellen'],
  [/^\[(\d+),(\d+)\] is outside the grid$/, (m) => `[${m[1]},${m[2]}] liegt außerhalb des Rasters`],
  [/^\[(\d+),(\d+)\] is not a '\.' cell$/, (m) => `[${m[1]},${m[2]}] ist keine freie Zelle`],
  [/^(crust|sleeper) at \[(\d+),(\d+)\] needs content or a start blob$/, (m) => `${m[1] === 'crust' ? 'Kruste' : 'Schläfer'} bei [${m[2]},${m[3]}] braucht einen Inhalt oder einen Start-Blob`],
  [/^fence cells must be orthogonally adjacent$/, () => 'Zaunzellen müssen direkt benachbart sein'],
  [/^fence must touch two non-void cells$/, () => 'Zaun muss zwei Zellen berühren (kein Riss)'],
  [/^spawn source must be on a non-void cell$/, () => 'Gasquelle muss auf einer Zelle oder einem Pfeiler liegen'],
  [/^spawn without sources needs fallback 'anyEmpty'$/, () => 'Ohne Gasquellen braucht der Spawn den Fallback „überall“'],
  [/^portal '(.+)' must have exactly two cells \(has (\d+)\)$/, (m) => `Rohr „${m[1]}“ braucht genau zwei Zellen (hat ${m[2]})`],
  [/^cap must be >= reachTier$/, () => 'Kappe muss mindestens die Zielstufe sein'],
  [/^deliver tier must be <= cap$/, () => 'Lieferstufe muss unter oder auf der Kappe liegen'],
  [/^start blob tier must be below the cap$/, () => 'Start-Blob muss unter der Kappe liegen'],
  [/^cell \[(.+)\] already used by (\w+)$/, (m) => `Zelle [${m[1]}] ist schon belegt (${elementName(m[2] ?? '')})`],
  [/^cell \[(.+)\] already has a floor$/, (m) => `Zelle [${m[1]}] hat schon einen Boden`],
  [/^level uses (\d+) element kinds \(max 4\): (.*)$/, (m) => `${m[1]} Elementarten (höchstens 4): ${(m[2] ?? '').split(', ').map(elementName).join(', ')}`],
];

const ELEMENT_NAMES: Record<string, string> = {
  pillar: 'Pfeiler',
  fence: 'Fossilwand',
  scrap: 'Schrott',
  scrapMound: 'Schrottberg',
  crust: 'Kruste',
  sleeper: 'Schläfer',
  cage: 'Käfig',
  fog: 'Nebel',
  oil: 'Ölpfütze',
  current: 'Gasstrom',
  withered: 'Verdorrt',
  deepWithered: 'Tief verdorrt',
  spore: 'Spore',
  portal: 'Rohr',
  rot: 'Fäulnis',
  toxic: 'Giftwolke',
  stray: 'Streuner',
  amoeba: 'Amöbe',
  line: 'Strahl',
  burst: 'Knall',
  start: 'Start-Blob',
};
export function elementName(id: string): string {
  return ELEMENT_NAMES[id] ?? id;
}

interface ZodIssueLike {
  code: string;
  path: readonly PropertyKey[];
  message: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
}

function translate(issue: ZodIssueLike): string {
  for (const [re, fn] of TRANSLATIONS) {
    const m = re.exec(issue.message);
    if (m) return fn(m);
  }
  const last = String(issue.path[issue.path.length - 1] ?? '');
  switch (issue.code) {
    case 'invalid_type':
      return 'Fehlt oder hat den falschen Typ';
    case 'too_small':
      return `Zu klein (mindestens ${String(issue.minimum ?? '?')})`;
    case 'too_big':
      return `Zu groß (höchstens ${String(issue.maximum ?? '?')})`;
    case 'invalid_format':
    case 'invalid_string':
      if (last === 'id') return 'Nur a–z, 0–9 und Bindestrich';
      if (issue.path.includes('mask')) return 'Nur die Zeichen . # P';
      return 'Ungültiges Format';
    case 'invalid_value':
    case 'invalid_enum_value':
    case 'invalid_union':
    case 'invalid_union_discriminator':
      return 'Ungültiger Wert';
    default:
      return issue.message;
  }
}

/**
 * Zugbänder aus GDD 6.1 nach Levelnummer. Gelten ab 4×4; kleinere Tutorial-Bretter (`cells` < 16) bekommen so viele
 * Züge, wie ihre Mechanik braucht.
 */
export function movesBand(levelNo: number, cells = 16): [number, number] | null {
  if (levelNo <= 0 || cells < 16) return null;
  if (levelNo <= 20) return [30, 38];
  if (levelNo <= 60) return [25, 30];
  return [23, 27];
}

function softChecks(d: LevelDraft): Issue[] {
  const out: Issue[] = [];
  const warn = (where: string, message: string, tab: Issue['tab'], cells?: Cell[]) => out.push(cells && cells.length ? { where, message, severity: 'warn', tab, cells } : { where, message, severity: 'warn', tab });
  const no = levelNumber(d.id);

  if (!d.name || !d.name.trim()) warn('Name', 'Kein Name vergeben', 'ziele');
  if (!d.id.startsWith(d.zone)) warn('ID', `ID beginnt nicht mit der Zone „${d.zone}“`, 'ziele');

  const band = movesBand(no, d.grid.w * d.grid.h);
  if (band && d.moves < 99 && (d.moves < band[0] || d.moves > band[1])) {
    warn('Züge', `${d.moves} Züge liegen außerhalb des Bands ${band[0]}–${band[1]} für Level ${no}`, 'ziele');
  }
  if (d.moves >= 99) warn('Züge', '99 = ohne Zuglimit (die UI blendet den Zähler aus)', 'ziele');

  const [lo, hi] = d.difficulty.targetAttempts;
  if (lo > hi) warn('Versuche-Band', 'Untere Grenze liegt über der oberen', 'ziele');
  if (hi > 2.5) warn('Versuche-Band', 'Über 2,5 Versuche: härter als „sehr hart“ (GDD 6.1)', 'ziele');

  for (const [i, g] of d.goals.entries()) {
    if (g.type === 'reachTier' && g.tier > 8) warn(`Ziel ${i + 1}`, `Stufe ${g.tier} (${2 ** g.tier}) — über Stufe 8 nur in Set-Piece-Leveln`, 'ziele');
    if (g.type === 'release' && d.cap >= 12) warn(`Ziel ${i + 1}`, 'Aufbruch-Ziel, aber Kappe 12 ist praktisch unerreichbar', 'ziele');
    if (g.type === 'heal' && !d.floors.some((f) => f.kind === 'withered' || f.kind === 'deepWithered')) warn(`Ziel ${i + 1}`, 'Heilen ohne verdorrte Zellen', 'werkzeug');
    if (g.type === 'collectSpores') {
      const spores = d.floors.filter((f) => f.kind === 'spore').length;
      if (spores < g.count) warn(`Ziel ${i + 1}`, `${g.count} Sporen gefordert, aber nur ${spores} vergraben`, 'werkzeug');
    }
    if (g.type === 'rescue') {
      const cages = d.blockers.filter((b) => b.kind === 'cage').length;
      if (cages < g.count) warn(`Ziel ${i + 1}`, `${g.count} Rettungen gefordert, aber nur ${cages} Käfige`, 'werkzeug');
    }
    if (g.type === 'clearScrap' && !d.blockers.some((b) => b.kind === 'scrap' || b.kind === 'scrapMound')) warn(`Ziel ${i + 1}`, 'Schrott räumen ohne Schrott', 'werkzeug');
    if (g.type === 'clearRot' && !d.threats.some((t) => t.kind === 'rot')) warn(`Ziel ${i + 1}`, 'Fäulnis eindämmen ohne Fäulnis', 'werkzeug');
    if (g.type === 'calmStrays') {
      const strays = d.threats.filter((t) => t.kind === 'stray').length;
      if (strays < g.count) warn(`Ziel ${i + 1}`, `${g.count} Streuner gefordert, aber nur ${strays} gesetzt`, 'werkzeug');
    }
  }

  const open = openCellCount(d);
  const occupied = d.start.length + d.blockers.reduce((s, b) => s + (b.kind === 'scrapMound' ? 4 : b.kind === 'crust' || b.kind === 'sleeper' ? (b.content ? 1 : 0) : 1), 0) + d.threats.length;
  if (open > 0 && occupied >= open) warn('Raster', 'Keine freie Zelle für den ersten Spawn', 'werkzeug');
  if (open < 9) warn('Raster', `Nur ${open} freie Zellen — sehr enges Brett`, 'werkzeug');

  if (d.spawn.sources.length > 0) {
    const adj = sourceAdjacentCells(d);
    const src = d.spawn.sources.map((c) => [c[0], c[1]] as Cell);
    if (adj.length === 0) warn('Gasquellen', 'Keine freie Zelle neben einer Gasquelle', 'spawn', src);
    else if (d.spawn.fallback === 'none' && adj.length <= 2) warn('Gasquellen', `Nur ${adj.length} Spawn-Zellen und kein Fallback — blockierte Quellen beenden den Versuch`, 'spawn', src);
  }

  const kinds = countElementKinds(d);
  if (kinds.size === 4) warn('Elemente', 'Vier Elementarten — das Maximum (eine Idee pro Level)', 'werkzeug');
  if (d.specials.lineAt < SPECIAL_OFF && d.specials.lineAt <= 2 && no > 0 && no !== 24) warn('Spezialteile', 'Strahl ab 2 Verschmelzungen flutet das Brett (Richtwert 2–3, Intro 2)', 'ziele');
  if (d.specials.burstAt < SPECIAL_OFF && d.specials.burstAt <= 2 && no !== 34) warn('Spezialteile', 'Knall ab 2 Verschmelzungen ist sehr häufig (Richtwert 3–4)', 'ziele');
  if (d.specials.lineAt < SPECIAL_OFF && d.goals.some((g) => g.type === 'reachTier')) warn('Spezialteile', 'Strahl-Blobs räumen Masse — bei Stufen-Zielen sinkt die Gewinnrate (GDD Nachtrag 5)', 'ziele');
  if (d.floors.some((f) => f.kind === 'portal')) {
    const ids = new Map<string, number>();
    for (const f of d.floors) if (f.kind === 'portal') ids.set(f.portalId, (ids.get(f.portalId) ?? 0) + 1);
    for (const [id, n] of ids) {
      if (n !== 1) continue;
      const at = d.floors.find((f) => f.kind === 'portal' && f.portalId === id)?.at;
      warn('Rohr', `Rohr „${id}“ wartet auf die zweite Zelle`, 'werkzeug', at ? [[at[0], at[1]]] : undefined);
    }
  }
  return out;
}

export function validateDraft(d: LevelDraft): ValidationResult {
  const r = LevelSchema.safeParse(d);
  const errors: Issue[] = r.success
    ? []
    : r.error.issues.map((iss): Issue => {
        const cells = cellsFor(d, iss.path, iss.message);
        const base: Issue = { where: describePath(iss.path), message: translate(iss as ZodIssueLike), severity: 'error', tab: tabFor(iss.path) };
        return cells.length ? { ...base, cells } : base;
      });
  // Doppelte Meldungen (superRefine meldet manche Dinge pro Zelle mehrfach) zusammenfassen.
  const seen = new Set<string>();
  const unique = errors.filter((e) => {
    const k = e.where + '|' + e.message;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    ok: r.success,
    level: r.success ? r.data : null,
    errors: unique,
    warnings: softChecks(d),
  };
}
