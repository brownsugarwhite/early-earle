/**
 * Level-Entwurf für den Editor: die vollständig ausgefüllte Form von `content/levels/NNN.json`
 * (strukturell wie `LevelDef`, darf aber semantisch ungültig sein — die Validierung läuft separat).
 * Alle Operationen sind unveränderlich (neue Objekte), damit Undo/Redo nur Referenzen braucht.
 */

import type { Dir, LevelDef, Material } from '@ee/core';

export type LevelDraft = LevelDef;
export type Cell = readonly [number, number];
export type MaskChar = '.' | '#' | 'P';
export type StartDef = LevelDraft['start'][number];
export type BlockerDef = LevelDraft['blockers'][number];
export type FloorDef = LevelDraft['floors'][number];
export type ThreatDef = LevelDraft['threats'][number];
export type GoalDef = LevelDraft['goals'][number];
export type GoalType = GoalDef['type'];
export type BlobDef = StartDef['blob'];
export type ZoneId = LevelDraft['zone'];

export const ZONES: readonly ZoneId[] = ['tjorizo', 'syrup', 'luzz', 'wooding'];
export const ZONE_LABEL: Record<ZoneId, string> = {
  tjorizo: 'Tjorizo',
  syrup: 'Syrup',
  luzz: 'Luzz',
  wooding: 'Wooding',
};
/** Material, das Blobs ohne eigenes `material` in der Zone bekommen (Spielkern `zoneMaterial`). */
export const ZONE_MATERIAL: Record<ZoneId, Material> = {
  tjorizo: 'jelly',
  syrup: 'liquid',
  luzz: 'gas',
  wooding: 'fire',
};
export const MATERIAL_LABEL: Record<Material, string> = {
  jelly: 'Jelly',
  liquid: 'Flüssig',
  gas: 'Gas',
  fire: 'Feuer',
};
export const DIR_LABEL: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' };

export const GOAL_TYPES: readonly GoalType[] = [
  'reachTier',
  'release',
  'heal',
  'collectSpores',
  'rescue',
  'clearScrap',
  'deliver',
  'score',
  'clearRot',
  'calmStrays',
];
export const GOAL_LABEL: Record<GoalType, string> = {
  reachTier: 'Stufe erreichen',
  release: 'Aufbrechen lassen',
  heal: 'Alles heilen',
  collectSpores: 'Sporen sammeln',
  rescue: 'Retten',
  clearScrap: 'Schrott räumen',
  deliver: 'Liefern',
  score: 'Punkte',
  clearRot: 'Fäulnis eindämmen',
  calmStrays: 'Streuner beruhigen',
};

export const STYLE_LABEL: Record<NonNullable<LevelDraft['difficulty']['style']>, string> = {
  explosive: 'explosiv',
  precise: 'präzise',
  journey: 'Reise',
  puzzle: 'knobelig',
  diligent: 'fleißig',
};

/** Versuche-Bänder aus GDD 6.1. */
export const BAND_PRESETS: { label: string; band: [number, number] }[] = [
  { label: 'Tutorial', band: [1, 1.1] },
  { label: 'Komfort', band: [1.1, 1.3] },
  { label: 'Normal', band: [1.2, 1.4] },
  { label: 'Hart', band: [1.6, 2] },
  { label: 'Sehr hart', band: [2, 2.5] },
];

// ---- kleine Helfer ------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown, def: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : def);
function clampInt(v: unknown, min: number, max: number, def: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : def;
  return Math.min(max, Math.max(min, n));
}
function coord(v: unknown): Cell | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const x = v[0];
  const y = v[1];
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  return [Math.max(0, Math.min(7, Math.round(x))), Math.max(0, Math.min(7, Math.round(y)))];
}
export const sameCell = (a: Cell, b: Cell): boolean => a[0] === b[0] && a[1] === b[1];
export const cellKey = (c: Cell): string => `${c[0]},${c[1]}`;
export const adjacent = (a: Cell, b: Cell): boolean => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

function normBlob(v: unknown): BlobDef {
  const o = isObj(v) ? v : {};
  const blob: BlobDef = { tier: clampInt(o.tier, 1, 12, 1) };
  if (o.material === 'jelly' || o.material === 'liquid' || o.material === 'gas' || o.material === 'fire') blob.material = o.material;
  if (o.kind === 'amoeba' || o.kind === 'stray' || o.kind === 'normal') blob.kind = o.kind;
  return blob;
}

function normFloor(v: unknown): FloorDef | null {
  if (!isObj(v)) return null;
  const at = coord(v.at);
  if (!at) return null;
  const a: [number, number] = [at[0], at[1]];
  switch (v.kind) {
    case 'oil':
    case 'withered':
    case 'deepWithered':
    case 'spore':
      return { kind: v.kind, at: a };
    case 'current': {
      const dir = v.dir === 'up' || v.dir === 'down' || v.dir === 'left' || v.dir === 'right' ? v.dir : 'right';
      return { kind: 'current', at: a, dir };
    }
    case 'portal':
      return { kind: 'portal', at: a, portalId: typeof v.portalId === 'string' && v.portalId ? v.portalId : 'a' };
    default:
      return null;
  }
}

function normBlocker(v: unknown): BlockerDef | null {
  if (!isObj(v)) return null;
  const at = coord(v.at);
  if (!at) return null;
  const a: [number, number] = [at[0], at[1]];
  switch (v.kind) {
    case 'scrap':
      return { kind: 'scrap', at: a, layers: clampInt(v.layers, 1, 3, 1) };
    case 'scrapMound':
      return { kind: 'scrapMound', at: a, size: [2, 2], layers: clampInt(v.layers, 4, 8, 4) };
    case 'crust':
    case 'sleeper':
    case 'fog': {
      const b: Extract<BlockerDef, { kind: 'crust' | 'sleeper' | 'fog' }> = { kind: v.kind, at: a };
      if (isObj(v.content)) b.content = normBlob(v.content);
      return b;
    }
    case 'cage':
      return { kind: 'cage', at: a, content: normBlob(v.content), layers: clampInt(v.layers, 1, 3, 1) };
    default:
      return null;
  }
}

function normThreat(v: unknown): ThreatDef | null {
  if (!isObj(v)) return null;
  const at = coord(v.at);
  if (!at) return null;
  const a: [number, number] = [at[0], at[1]];
  switch (v.kind) {
    case 'rot':
      return { kind: 'rot', at: a, period: clampInt(v.period, 1, 9, 3) };
    case 'toxic':
      return { kind: 'toxic', at: a, countdown: clampInt(v.countdown, 1, 30, 5) };
    case 'stray':
      return { kind: 'stray', at: a, tier: clampInt(v.tier, 1, 12, 1) };
    default:
      return null;
  }
}

function normGoal(v: unknown): GoalDef | null {
  if (!isObj(v)) return null;
  switch (v.type) {
    case 'reachTier':
      return { type: 'reachTier', tier: clampInt(v.tier, 2, 12, 5) };
    case 'release':
      return { type: 'release', count: clampInt(v.count, 1, 20, 1) };
    case 'heal':
    case 'clearScrap':
    case 'clearRot':
      return { type: v.type };
    case 'collectSpores':
      return { type: 'collectSpores', count: clampInt(v.count, 1, 30, 1) };
    case 'rescue':
      return { type: 'rescue', count: clampInt(v.count, 1, 10, 1) };
    case 'deliver':
      return { type: 'deliver', tier: clampInt(v.tier, 2, 12, 4), count: clampInt(v.count, 1, 20, 1) };
    case 'score':
      return { type: 'score', points: Math.max(1, Math.round(num(v.points, 100))) };
    case 'calmStrays':
      return { type: 'calmStrays', count: clampInt(v.count, 1, 5, 1) };
    default:
      return null;
  }
}

function fitMask(rows: readonly string[], w: number, h: number): string[] {
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    const row = (rows[y] ?? '').replace(/[^.#P]/g, '.');
    out.push(row.length >= w ? row.slice(0, w) : row.padEnd(w, '.'));
  }
  return out;
}

/** Liest beliebiges JSON defensiv in einen vollständigen Entwurf (füllt Standardwerte, wirft nie). */
export function normalizeDraft(raw: unknown): LevelDraft {
  const o = isObj(raw) ? raw : {};
  const grid = isObj(o.grid) ? o.grid : {};
  const maskIn = arr(grid.mask).filter((r): r is string => typeof r === 'string');
  const w = clampInt(grid.w, 3, 8, maskIn[0]?.length ?? 4);
  const h = clampInt(grid.h, 3, 8, maskIn.length || 4);
  const spawn = isObj(o.spawn) ? o.spawn : {};
  const table = arr(spawn.table)
    .filter(isObj)
    .map((t) => {
      const row: LevelDraft['spawn']['table'][number] = { tier: clampInt(t.tier, 1, 3, 1), weight: Math.max(0.01, num(t.weight, 1)) };
      if (t.kind === 'amoeba') row.kind = 'amoeba';
      return row;
    });
  const specials = isObj(o.specials) ? o.specials : {};
  const difficulty = isObj(o.difficulty) ? o.difficulty : {};
  const band = Array.isArray(difficulty.targetAttempts) ? difficulty.targetAttempts : [];
  const lo = Math.max(1, num(band[0], 1.2));
  const hi = Math.max(1, num(band[1], 1.4));
  const goals = arr(o.goals).map(normGoal).filter((g): g is GoalDef => g !== null);
  const zone = (ZONES as readonly string[]).includes(String(o.zone)) ? (o.zone as ZoneId) : 'tjorizo';

  const draft: LevelDraft = {
    schemaVersion: 1,
    id: typeof o.id === 'string' ? o.id : 'neu-001',
    zone,
    grid: { w, h, mask: fitMask(maskIn, w, h) },
    fences: arr(o.fences)
      .filter(isObj)
      .map((f) => ({ a: coord(f.a), b: coord(f.b) }))
      .filter((f): f is { a: Cell; b: Cell } => f.a !== null && f.b !== null)
      .map((f) => ({ a: [f.a[0], f.a[1]] as [number, number], b: [f.b[0], f.b[1]] as [number, number] })),
    floors: arr(o.floors).map(normFloor).filter((f): f is FloorDef => f !== null),
    blockers: arr(o.blockers).map(normBlocker).filter((b): b is BlockerDef => b !== null),
    threats: arr(o.threats).map(normThreat).filter((t): t is ThreatDef => t !== null),
    start: arr(o.start)
      .filter(isObj)
      .map((s) => ({ at: coord(s.at), blob: normBlob(s.blob) }))
      .filter((s): s is { at: Cell; blob: BlobDef } => s.at !== null)
      .map((s) => ({ at: [s.at[0], s.at[1]] as [number, number], blob: s.blob })),
    spawn: {
      sources: arr(spawn.sources)
        .map(coord)
        .filter((c): c is Cell => c !== null)
        .map((c) => [c[0], c[1]] as [number, number]),
      table: table.length > 0 ? table : [{ tier: 1, weight: 1 }],
      preview: spawn.preview !== false,
      fallback: spawn.fallback === 'anyEmpty' ? 'anyEmpty' : 'none',
    },
    goals: goals.length > 0 ? goals : [{ type: 'reachTier', tier: 5 }],
    moves: clampInt(o.moves, 1, 99, 30),
    cap: clampInt(o.cap, 3, 12, 12),
    specials: { lineAt: clampInt(specials.lineAt, 2, 16, 16), burstAt: clampInt(specials.burstAt, 2, 16, 16) },
    difficulty: { targetAttempts: [lo, hi] },
  };
  if (typeof o.name === 'string' && o.name.trim()) draft.name = o.name;
  const style = difficulty.style;
  if (style === 'explosive' || style === 'precise' || style === 'journey' || style === 'puzzle' || style === 'diligent') {
    draft.difficulty.style = style;
  }
  return draft;
}

/** Leerer Entwurf (4×4, offenes Brett, Stufe-5-Ziel). */
export function emptyDraft(id = 'neu-001', zone: ZoneId = 'tjorizo'): LevelDraft {
  return normalizeDraft({
    id,
    zone,
    name: 'Neues Level',
    grid: { w: 4, h: 4, mask: ['....', '....', '....', '....'] },
    start: [
      { at: [0, 0], blob: { tier: 2 } },
      { at: [3, 3], blob: { tier: 2 } },
    ],
    spawn: { sources: [], table: [{ tier: 1, weight: 9 }, { tier: 2, weight: 1 }], preview: true, fallback: 'anyEmpty' },
    goals: [{ type: 'reachTier', tier: 5 }],
    moves: 30,
    cap: 12,
    specials: { lineAt: 16, burstAt: 16 },
    difficulty: { targetAttempts: [1.2, 1.4], style: 'journey' },
  });
}

/** JSON in stabiler Schlüsselreihenfolge (die Reihenfolge von `normalizeDraft`). */
export function serializeDraft(d: LevelDraft): string {
  return JSON.stringify(normalizeDraft(d));
}

/** Levelnummer aus der ID (`tjorizo-003` → 3), 0 wenn keine. */
export function levelNumber(id: string): number {
  const m = /(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}

// ---- Maske -----------------------------------------------------------------------------

export function maskAt(d: LevelDraft, c: Cell): MaskChar | undefined {
  const ch = d.grid.mask[c[1]]?.charAt(c[0]);
  return ch === '.' || ch === '#' || ch === 'P' ? ch : undefined;
}

export function inside(d: LevelDraft, c: Cell): boolean {
  return c[0] >= 0 && c[1] >= 0 && c[0] < d.grid.w && c[1] < d.grid.h;
}

/** Zellen eines Schrottbergs (2×2 ab links oben). */
export function moundCells(at: Cell): Cell[] {
  return [at, [at[0] + 1, at[1]], [at[0], at[1] + 1], [at[0] + 1, at[1] + 1]];
}

function blockerCovers(b: BlockerDef, c: Cell): boolean {
  return b.kind === 'scrapMound' ? moundCells(b.at).some((m) => sameCell(m, c)) : sameCell(b.at, c);
}

/** Alles, was auf einer Zelle liegt (Indizes in die jeweiligen Listen, -1 = nichts). */
export interface Occupants {
  start: number;
  blocker: number;
  floor: number;
  threat: number;
  source: boolean;
}
export function occupantsAt(d: LevelDraft, c: Cell): Occupants {
  return {
    start: d.start.findIndex((s) => sameCell(s.at, c)),
    blocker: d.blockers.findIndex((b) => blockerCovers(b, c)),
    floor: d.floors.findIndex((f) => sameCell(f.at, c)),
    threat: d.threats.findIndex((t) => sameCell(t.at, c)),
    source: d.spawn.sources.some((s) => sameCell(s, c)),
  };
}

export interface RemoveOptions {
  /** Boden stehen lassen (z. B. beim Setzen eines Blobs). */
  keepFloor?: boolean;
  /** Gasquelle stehen lassen. */
  keepSource?: boolean;
  /** Zäune an der Zelle stehen lassen. */
  keepFences?: boolean;
}

/** Entfernt alles auf der Zelle (Start-Blob, Blocker inkl. überdeckendem Schrottberg, Boden, Bedrohung, Quelle). */
export function removeAt(d: LevelDraft, c: Cell, opts: RemoveOptions = {}): LevelDraft {
  return {
    ...d,
    start: d.start.filter((s) => !sameCell(s.at, c)),
    blockers: d.blockers.filter((b) => !blockerCovers(b, c)),
    floors: opts.keepFloor ? d.floors : d.floors.filter((f) => !sameCell(f.at, c)),
    threats: d.threats.filter((t) => !sameCell(t.at, c)),
    fences: opts.keepFences ? d.fences : d.fences,
    spawn: opts.keepSource ? d.spawn : { ...d.spawn, sources: d.spawn.sources.filter((s) => !sameCell(s, c)) },
  };
}

/** Setzt ein Maskenzeichen; Elemente auf Zellen, die keine `.` mehr sind, fallen weg (Quellen dürfen auf `P` bleiben). */
export function setMask(d: LevelDraft, c: Cell, ch: MaskChar): LevelDraft {
  if (!inside(d, c) || maskAt(d, c) === ch) return d;
  const mask = d.grid.mask.map((row, y) => (y === c[1] ? row.slice(0, c[0]) + ch + row.slice(c[0] + 1) : row));
  let next: LevelDraft = { ...d, grid: { ...d.grid, mask } };
  if (ch !== '.') {
    next = removeAt(next, c, { keepSource: ch === 'P', keepFences: true });
    if (ch === '#') {
      next = {
        ...next,
        fences: next.fences.filter((f) => !sameCell(f.a, c) && !sameCell(f.b, c)),
      };
    }
  }
  return next;
}

/** Nächstes Maskenzeichen beim Antippen: . → # → P → . */
export function cycleMask(ch: MaskChar | undefined): MaskChar {
  return ch === '.' ? '#' : ch === '#' ? 'P' : '.';
}

/** Ändert die Rastergröße; neue Zellen sind `.`, Elemente außerhalb fallen weg. */
export function resizeGrid(d: LevelDraft, w: number, h: number): LevelDraft {
  w = Math.max(3, Math.min(8, Math.round(w)));
  h = Math.max(3, Math.min(8, Math.round(h)));
  if (w === d.grid.w && h === d.grid.h) return d;
  const mask = fitMask(d.grid.mask, w, h);
  const next: LevelDraft = { ...d, grid: { w, h, mask } };
  const inb = (c: Cell) => c[0] < w && c[1] < h;
  return {
    ...next,
    start: next.start.filter((s) => inb(s.at)),
    blockers: next.blockers.filter((b) => (b.kind === 'scrapMound' ? moundCells(b.at).every(inb) : inb(b.at))),
    floors: next.floors.filter((f) => inb(f.at)),
    threats: next.threats.filter((t) => inb(t.at)),
    fences: next.fences.filter((f) => inb(f.a) && inb(f.b)),
    spawn: { ...next.spawn, sources: next.spawn.sources.filter(inb) },
  };
}

// ---- Zäune -----------------------------------------------------------------------------

export function fenceIndex(d: LevelDraft, a: Cell, b: Cell): number {
  return d.fences.findIndex((f) => (sameCell(f.a, a) && sameCell(f.b, b)) || (sameCell(f.a, b) && sameCell(f.b, a)));
}

/** Zaun zwischen zwei Nachbarzellen setzen oder entfernen. */
export function toggleFence(d: LevelDraft, a: Cell, b: Cell): LevelDraft {
  if (!adjacent(a, b) || !inside(d, a) || !inside(d, b)) return d;
  if (maskAt(d, a) === '#' || maskAt(d, b) === '#') return d;
  const i = fenceIndex(d, a, b);
  if (i >= 0) return { ...d, fences: d.fences.filter((_, k) => k !== i) };
  return { ...d, fences: [...d.fences, { a: [a[0], a[1]], b: [b[0], b[1]] }] };
}

// ---- Werkzeuge -------------------------------------------------------------------------

export type ToolId =
  | 'blob'
  | 'scrap'
  | 'scrapMound'
  | 'crust'
  | 'sleeper'
  | 'cage'
  | 'fog'
  | 'oil'
  | 'current'
  | 'withered'
  | 'deepWithered'
  | 'spore'
  | 'portal'
  | 'rot'
  | 'toxic'
  | 'stray'
  | 'source'
  | 'erase';

export interface ToolParams {
  tier: number;
  /** 'zone' = kein eigenes Material (Zonenmaterial). */
  material: Material | 'zone';
  blobKind: 'normal' | 'amoeba';
  scrapLayers: number;
  moundLayers: number;
  cageLayers: number;
  /** Nebel/Kruste/Schläfer mit eigenem Inhalt (sonst leer bzw. der Start-Blob auf der Zelle). */
  withContent: boolean;
  dir: Dir;
  period: number;
  countdown: number;
}

export const DEFAULT_TOOL_PARAMS: ToolParams = {
  tier: 2,
  material: 'zone',
  blobKind: 'normal',
  scrapLayers: 1,
  moundLayers: 4,
  cageLayers: 1,
  withContent: true,
  dir: 'right',
  period: 3,
  countdown: 5,
};

export interface ToolInfo {
  id: ToolId;
  label: string;
  group: 'Blobs' | 'Blocker' | 'Boden' | 'Bedrohung' | 'Spawn' | 'Werkzeug';
  /** Kurzzeichen (wie im ASCII-Format). */
  glyph: string;
  hint: string;
}

export const TOOLS: readonly ToolInfo[] = [
  { id: 'blob', label: 'Blob', group: 'Blobs', glyph: '2', hint: 'Start-Blob mit Stufe, Material, Art' },
  { id: 'scrap', label: 'Schrott', group: 'Blocker', glyph: 'X', hint: '1–3 Lagen, verliert eine Lage pro Verschmelzung daneben' },
  { id: 'scrapMound', label: 'Schrottberg', group: 'Blocker', glyph: 'M', hint: '2×2 ab links oben, 4–8 Treffer' },
  { id: 'crust', label: 'Kruste', group: 'Blocker', glyph: 'F', hint: 'Festgefrorener Blob, Nachbar-Verschmelzungen tauen' },
  { id: 'sleeper', label: 'Schläfer', group: 'Blocker', glyph: 'S', hint: 'Verschmilzt erst, wenn ein Nachbar ihn weckt' },
  { id: 'cage', label: 'Käfig', group: 'Blocker', glyph: 'C', hint: 'Inhalt mit Nachbar-Verschmelzungen befreien' },
  { id: 'fog', label: 'Nebel', group: 'Blocker', glyph: 'H', hint: 'Inhalt verborgen bis aufgedeckt' },
  { id: 'oil', label: 'Ölpfütze', group: 'Boden', glyph: 'o', hint: 'Eintretende Figur bleibt stehen' },
  { id: 'current', label: 'Gasstrom', group: 'Boden', glyph: '→', hint: 'Schiebt nach jedem Wisch eine Zelle' },
  { id: 'withered', label: 'Verdorrt', group: 'Boden', glyph: 'w', hint: 'Heilt, wenn eine Verschmelzung darauf landet' },
  { id: 'deepWithered', label: 'Tief verdorrt', group: 'Boden', glyph: 'd', hint: 'Zwei Heilungen nötig' },
  { id: 'spore', label: 'Spore', group: 'Boden', glyph: 's', hint: 'Wird gesammelt, wenn eine Verschmelzung darauf landet' },
  { id: 'portal', label: 'Rohr', group: 'Boden', glyph: '@', hint: 'Zwei Zellen antippen = ein Rohrpaar' },
  { id: 'rot', label: 'Fäulnis', group: 'Bedrohung', glyph: 'R', hint: 'Frisst alle N Züge eine Nachbarzelle' },
  { id: 'toxic', label: 'Giftwolke', group: 'Bedrohung', glyph: 'T', hint: 'Countdown, friert danach eine Figur ein' },
  { id: 'stray', label: 'Streuner', group: 'Bedrohung', glyph: 'W', hint: 'Wandert pro Wisch; eingekesselt wird er Helfer' },
  { id: 'source', label: 'Gasquelle', group: 'Spawn', glyph: '◆', hint: 'Spawnt daneben (auch auf Pfeilern)' },
  { id: 'erase', label: 'Radieren', group: 'Werkzeug', glyph: '⌫', hint: 'Tippen entfernt alles auf der Zelle' },
];

export const toolInfo = (id: ToolId): ToolInfo => TOOLS.find((t) => t.id === id)!;

function blobFromParams(p: ToolParams): BlobDef {
  const blob: BlobDef = { tier: p.tier };
  if (p.material !== 'zone') blob.material = p.material;
  if (p.blobKind === 'amoeba') blob.kind = 'amoeba';
  return blob;
}

/** Freie Portal-Kennung: eine mit genau einer Zelle (offenes Paar) oder der nächste freie Buchstabe. */
export function nextPortalId(d: LevelDraft, preferred: string | null): string {
  const counts = new Map<string, number>();
  for (const f of d.floors) if (f.kind === 'portal') counts.set(f.portalId, (counts.get(f.portalId) ?? 0) + 1);
  if (preferred && (counts.get(preferred) ?? 0) === 1) return preferred;
  for (const [id, n] of counts) if (n === 1) return id;
  for (let i = 0; i < 26; i++) {
    const id = String.fromCharCode(97 + i);
    if (!counts.has(id)) return id;
  }
  return 'z';
}

export interface PlaceResult {
  draft: LevelDraft;
  /** Fehlermeldung, wenn nichts gesetzt wurde. */
  error?: string;
  /** Portal-Kennung, die noch eine zweite Zelle braucht. */
  pendingPortalId?: string | null;
}

/** Setzt ein Werkzeug auf eine Zelle (ersetzt, was dort im Weg ist). */
export function placeTool(d: LevelDraft, tool: ToolId, p: ToolParams, c: Cell, pendingPortalId: string | null): PlaceResult {
  if (!inside(d, c)) return { draft: d, error: 'Außerhalb des Rasters' };
  const m = maskAt(d, c);
  const at: [number, number] = [c[0], c[1]];
  if (tool === 'erase') return { draft: removeAt(d, c) };
  if (tool === 'source') {
    if (m === '#') return { draft: d, error: 'Gasquellen nur auf Zellen oder Pfeilern' };
    const has = d.spawn.sources.some((s) => sameCell(s, c));
    return {
      draft: {
        ...d,
        spawn: { ...d.spawn, sources: has ? d.spawn.sources.filter((s) => !sameCell(s, c)) : [...d.spawn.sources, at] },
      },
    };
  }
  if (m !== '.') return { draft: d, error: 'Nur auf freien Zellen (.)' };

  switch (tool) {
    case 'blob': {
      // Kruste/Schläfer ohne Inhalt dürfen bleiben: der Blob wird ihr Inhalt.
      const keepBlocker = d.blockers.find((b) => (b.kind === 'crust' || b.kind === 'sleeper') && !b.content && sameCell(b.at, c));
      let next = removeAt(d, c, { keepFloor: true, keepSource: true });
      if (keepBlocker) next = { ...next, blockers: [...next.blockers, keepBlocker] };
      return { draft: { ...next, start: [...next.start, { at, blob: blobFromParams(p) }] } };
    }
    case 'scrap':
    case 'scrapMound':
    case 'cage':
    case 'fog':
    case 'crust':
    case 'sleeper': {
      if (tool === 'scrapMound') {
        const cells = moundCells(c);
        if (!cells.every((mc) => inside(d, mc) && maskAt(d, mc) === '.')) return { draft: d, error: 'Schrottberg braucht 2×2 freie Zellen' };
        let next = d;
        for (const mc of cells) next = removeAt(next, mc, { keepFloor: true, keepSource: true });
        return { draft: { ...next, blockers: [...next.blockers, { kind: 'scrapMound', at, size: [2, 2], layers: p.moundLayers }] } };
      }
      const existingStart = d.start.find((s) => sameCell(s.at, c));
      let next: LevelDraft = {
        ...d,
        blockers: d.blockers.filter((b) => !blockerCovers(b, c)),
        threats: d.threats.filter((t) => !sameCell(t.at, c)),
      };
      let blocker: BlockerDef;
      if (tool === 'scrap') {
        blocker = { kind: 'scrap', at, layers: p.scrapLayers };
        next = { ...next, start: next.start.filter((s) => !sameCell(s.at, c)) };
      } else if (tool === 'cage') {
        blocker = { kind: 'cage', at, content: blobFromParams(p), layers: p.cageLayers };
        next = { ...next, start: next.start.filter((s) => !sameCell(s.at, c)) };
      } else if (tool === 'fog') {
        const fog: Extract<BlockerDef, { kind: 'fog' }> = { kind: 'fog', at };
        if (p.withContent) fog.content = blobFromParams(p);
        blocker = fog;
        next = { ...next, start: next.start.filter((s) => !sameCell(s.at, c)) };
      } else {
        // Kruste / Schläfer: liegt schon ein Start-Blob da, wird er der Inhalt; sonst eigener Inhalt.
        const wrapped: Extract<BlockerDef, { kind: 'crust' | 'sleeper' }> = { kind: tool, at };
        if (!existingStart) wrapped.content = blobFromParams(p);
        blocker = wrapped;
      }
      return { draft: { ...next, blockers: [...next.blockers, blocker] } };
    }
    case 'oil':
    case 'withered':
    case 'deepWithered':
    case 'spore':
    case 'current':
    case 'portal': {
      const floors = d.floors.filter((f) => !sameCell(f.at, c));
      let floor: FloorDef;
      let pending: string | null = pendingPortalId;
      if (tool === 'current') floor = { kind: 'current', at, dir: p.dir };
      else if (tool === 'portal') {
        const removedPortal = d.floors.find((f) => f.kind === 'portal' && sameCell(f.at, c));
        const base = removedPortal ? { ...d, floors } : d;
        const id = nextPortalId(base, pendingPortalId);
        floor = { kind: 'portal', at, portalId: id };
        const countAfter = floors.filter((f) => f.kind === 'portal' && f.portalId === id).length + 1;
        pending = countAfter < 2 ? id : null;
      } else floor = { kind: tool, at };
      return { draft: { ...d, floors: [...floors, floor] }, pendingPortalId: pending };
    }
    case 'rot':
    case 'toxic':
    case 'stray': {
      const next = removeAt(d, c, { keepFloor: true, keepSource: true });
      const threat: ThreatDef =
        tool === 'rot'
          ? { kind: 'rot', at, period: p.period }
          : tool === 'toxic'
            ? { kind: 'toxic', at, countdown: p.countdown }
            : { kind: 'stray', at, tier: p.tier };
      return { draft: { ...next, threats: [...next.threats, threat] } };
    }
    default:
      return { draft: d };
  }
}

// ---- Ziele / Spawn --------------------------------------------------------------------------

export function defaultGoal(type: GoalType): GoalDef {
  switch (type) {
    case 'reachTier':
      return { type, tier: 5 };
    case 'release':
      return { type, count: 1 };
    case 'collectSpores':
      return { type, count: 3 };
    case 'rescue':
      return { type, count: 1 };
    case 'deliver':
      return { type, tier: 4, count: 1 };
    case 'score':
      return { type, points: 200 };
    case 'calmStrays':
      return { type, count: 1 };
    default:
      return { type } as GoalDef;
  }
}

/** Kurztext eines Ziels (für Listen und Berichte). */
export function goalText(g: GoalDef): string {
  const label = GOAL_LABEL[g.type] ?? g.type;
  switch (g.type) {
    case 'reachTier':
      return `${label} ${g.tier} (${2 ** g.tier})`;
    case 'deliver':
      return `${label}: ${g.count}× Stufe ${g.tier}`;
    case 'score':
      return `${label}: ${g.points}`;
    case 'release':
    case 'collectSpores':
    case 'rescue':
    case 'calmStrays':
      return `${label}: ${g.count}`;
    default:
      return label;
  }
}

/** Zellen, die neben einer Gasquelle liegen (dort spawnt der Kern). */
export function sourceAdjacentCells(d: LevelDraft): Cell[] {
  const out = new Map<string, Cell>();
  for (const s of d.spawn.sources) {
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const c: Cell = [s[0] + dx, s[1] + dy];
      if (inside(d, c) && maskAt(d, c) === '.') out.set(cellKey(c), c);
    }
  }
  return [...out.values()];
}

/** Anzahl freier Zellen (`.`). */
export function openCellCount(d: LevelDraft): number {
  let n = 0;
  for (const row of d.grid.mask) for (const ch of row) if (ch === '.') n++;
  return n;
}
