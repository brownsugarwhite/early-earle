/**
 * Level generator: builds a validated `LevelDef` from a compact `LevelSpec`.
 *
 * Deterministic: `hash32(zone, index, seed)` seeds every random placement.
 * Follows the progression rules of plan section 7: move budgets per band,
 * target-attempt bands per level type, one idea per level, at most four
 * element kinds, interior pillars (against the corner strategy), blockers and
 * target floors placed edge-first for gentle levels and centre-first for hard ones.
 */

import { hash32, randInt } from '../rng';
import {
  LevelSchema,
  type DIFFICULTY_STYLES,
  type LevelDef,
  type LevelInput,
  type ZoneId,
} from '../schema/level';
import { levelFromAscii, type AsciiOptions } from '../testing/ascii';
import type { Coord, Dir, Material } from '../model';

export type LevelType =
  'tutorial' | 'fuu' | 'comfort' | 'skill' | 'hard' | 'veryHard' | 'celebration' | 'breather';
export type DifficultyStyle = (typeof DIFFICULTY_STYLES)[number];

export type ElementId =
  | 'pillar'
  | 'fence'
  | 'scrap'
  | 'scrapMound'
  | 'spore'
  | 'amoeba'
  | 'cap'
  | 'withered'
  | 'deepWithered'
  | 'line'
  | 'burst'
  | 'cage'
  | 'crust'
  | 'sleeper'
  | 'fog'
  | 'oil'
  | 'current'
  | 'portal'
  | 'rot'
  | 'toxic'
  | 'stray';

export type GoalSpec = LevelInput['goals'][number];

/** A start blob with an explicit material/kind (e.g. jelly blobs in a liquid zone). */
export interface StartBlobSpec {
  tier: number;
  material?: Material;
  kind?: 'normal' | 'amoeba' | 'stray';
}

export interface LevelSpec {
  zone: ZoneId;
  /** 1-based level number. */
  index: number;
  name?: string;
  type: LevelType;
  grid: { w: number; h: number };
  elements: ElementId[];
  goals: GoalSpec[];
  moves?: number;
  /** Defaults to 12 (never reached) unless 'cap' is among the elements. */
  cap?: number;
  seed: number;
  /** Fixed ASCII layout (tokens of `testing/ascii`); overrides random placement. */
  board?: string;
  /** Multiset of start blobs (tier or tier+material) placed on random open cells. */
  startTiers?: (number | StartBlobSpec)[];
  /**
   * Explicit mask rows ('.', '#', 'P'): void shapes ("Riss-Formen") and vents.
   * The grid size follows the mask; pillars come from the mask instead of random placement.
   */
  mask?: string[];
  counts?: Partial<
    Record<
      | 'pillars'
      | 'scrap'
      | 'spores'
      | 'withered'
      | 'deepWithered'
      | 'cages'
      | 'fences'
      | 'crust'
      | 'sleepers'
      | 'oil'
      | 'rot'
      | 'toxic'
      | 'mounds'
      | 'portals'
      | 'fog'
      | 'currents'
      | 'strays',
      number
    >
  >;
  scrapLayers?: number;
  cageLayers?: number;
  cageTier?: number;
  crustTier?: number;
  sleeperTier?: number;
  /** Rot growth period (moves), default 3. */
  rotPeriod?: number;
  /** Toxic cloud countdown (moves), default 6. */
  toxicCountdown?: number;
  /** 2×2 scrap mound layers (4–8), default 4. */
  moundLayers?: number;
  /** Tier of the blob hidden in fog cells; 0 = empty fog. Default 2. */
  fogTier?: number;
  /** Direction of randomly placed currents, default 'right'. */
  currentDir?: Dir;
  /** Explicit current cells (added to randomly placed ones). */
  currents?: { at: Coord; dir: Dir }[];
  strayTier?: number;
  /** Explicit fences (added to randomly placed ones). */
  fences?: { a: Coord; b: Coord }[];
  spawn?: {
    tier2?: number;
    tier3?: number;
    amoeba?: number;
    sources?: Coord[];
    fallback?: 'none' | 'anyEmpty';
  };
  specials?: { lineAt?: number; burstAt?: number };
  style?: DifficultyStyle;
  /** Where blockers and target floors go; defaults to edge-first for gentle types, centre-first otherwise. */
  placement?: 'edge' | 'interior' | 'any';
}

export function levelId(zone: ZoneId, index: number): string {
  return `${zone}-${String(index).padStart(3, '0')}`;
}

/** Move budget per band and type (plan §7: 30–38 / 25–30 / 23–27, hard levels short). */
export function defaultMoves(index: number, type: LevelType): number {
  if (type === 'fuu') return 10;
  const base = index <= 20 ? 34 : index <= 60 ? 28 : 25;
  switch (type) {
    case 'hard':
      return base - 4;
    case 'veryHard':
      return base - 6;
    case 'celebration':
      return 30;
    default:
      return base;
  }
}

export function targetAttempts(index: number, type: LevelType): [number, number] {
  switch (type) {
    case 'hard':
      return [1.6, 2.0];
    case 'veryHard':
      return [2.0, 2.5];
    case 'tutorial':
    case 'fuu':
    case 'celebration':
    case 'breather':
      return [1.0, 1.1];
    case 'comfort':
      return index <= 20 ? [1.0, 1.1] : [1.1, 1.3];
    case 'skill':
      return index <= 20 ? [1.0, 1.1] : [1.2, 1.4];
  }
}

// ---- deterministic placement helpers -------------------------------------------

class Rng {
  constructor(public state: number) {}
  int(n: number): number {
    const [v, next] = randInt(this.state, n);
    this.state = next;
    return v;
  }
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = a[i]!;
      a[i] = a[j]!;
      a[j] = t;
    }
    return a;
  }
}

function isInterior(w: number, h: number, c: Coord): boolean {
  return c[0] > 0 && c[0] < w - 1 && c[1] > 0 && c[1] < h - 1;
}

function chebyshev(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

/**
 * Picks `k` cells from `pool` (already shuffled by bias), keeping at least
 * `minDist` (Chebyshev) between picks. Removes picked cells from `pool`.
 */
function take(pool: Coord[], k: number, minDist = 0): Coord[] {
  const out: Coord[] = [];
  for (let i = 0; i < pool.length && out.length < k; i++) {
    const c = pool[i]!;
    if (out.every((o) => chebyshev(o, c) >= minDist)) {
      out.push(c);
      pool.splice(i, 1);
      i--;
    }
  }
  return out;
}

/** Orders cells edge-first (gentle) or centre-first (hard), randomised within each ring. */
function biasedPool(
  rng: Rng,
  cells: Coord[],
  w: number,
  h: number,
  bias: 'edge' | 'interior' | 'any',
): Coord[] {
  const shuffled = rng.shuffle(cells);
  if (bias === 'any') return shuffled;
  const ring = (c: Coord) => Math.min(c[0], c[1], w - 1 - c[0], h - 1 - c[1]);
  return shuffled.sort((a, b) => (bias === 'edge' ? ring(a) - ring(b) : ring(b) - ring(a)));
}

// ---- generator -------------------------------------------------------------------

export function generateLevel(spec: LevelSpec): LevelDef {
  const w = spec.mask ? (spec.mask[0]?.length ?? 0) : spec.grid.w;
  const h = spec.mask ? spec.mask.length : spec.grid.h;
  const id = levelId(spec.zone, spec.index);
  const seed = hash32(spec.zone, spec.index, spec.seed);
  const rng = new Rng(seed);
  const has = (e: ElementId) => spec.elements.includes(e);
  const gentle =
    spec.type === 'tutorial' ||
    spec.type === 'fuu' ||
    spec.type === 'comfort' ||
    spec.type === 'celebration' ||
    spec.type === 'breather';
  const bias = spec.placement ?? (gentle ? 'edge' : 'interior');

  const table: LevelInput['spawn']['table'] = [{ tier: 1, weight: 9 }];
  const t2 = spec.spawn?.tier2 ?? 1;
  if (t2 > 0) table.push({ tier: 2, weight: t2 });
  if (spec.spawn?.tier3) table.push({ tier: 3, weight: spec.spawn.tier3 });
  if (has('amoeba')) table.push({ tier: 1, weight: spec.spawn?.amoeba ?? 1, kind: 'amoeba' });

  const goals = spec.goals;
  const goalTier = Math.max(
    0,
    ...goals.map((g) => (g.type === 'reachTier' || g.type === 'deliver' ? g.tier : 0)),
  );
  const cap = spec.cap ?? (has('cap') ? Math.max(3, goalTier || 5) : 12);
  const lineAt = spec.specials?.lineAt ?? (has('line') ? 3 : 16);
  const burstAt = spec.specials?.burstAt ?? (has('burst') ? 4 : 16);
  const moves = spec.moves ?? defaultMoves(spec.index, spec.type);
  const difficulty: LevelInput['difficulty'] = {
    targetAttempts: targetAttempts(spec.index, spec.type),
  };
  if (spec.style) difficulty.style = spec.style;
  const spawn: LevelInput['spawn'] = {
    sources: spec.spawn?.sources ?? [],
    table,
    preview: true,
    fallback:
      spec.spawn?.fallback ??
      (spec.spawn?.sources && spec.spawn.sources.length > 0 ? 'none' : 'anyEmpty'),
  };

  // Fixed board: reuse the ASCII parser, then stamp id/name/difficulty.
  if (spec.board) {
    const opts: AsciiOptions = {
      id,
      zone: spec.zone,
      moves,
      cap,
      goals,
      lineAt,
      burstAt,
      spawn,
      fences: spec.fences ?? [],
    };
    const base = levelFromAscii(spec.board, opts);
    const input: LevelInput = { ...base, difficulty };
    if (spec.name) input.name = spec.name;
    return LevelSchema.parse(input);
  }

  // Mask: explicit (void shapes, vents) or a full rectangle with random interior pillars.
  const mask: string[][] = spec.mask
    ? spec.mask.map((r) => r.split(''))
    : Array.from({ length: h }, () => new Array<string>(w).fill('.'));
  const all: Coord[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) all.push([x, y]);
  const open: Coord[] = all.filter((c) => mask[c[1]]![c[0]] === '.');
  if (has('pillar') && !spec.mask) {
    const interior = rng.shuffle(all.filter((c) => isInterior(w, h, c)));
    const k = spec.counts?.pillars ?? 1;
    const picked = take(interior, k, 2);
    for (const c of picked) {
      mask[c[1]]![c[0]] = 'P';
      open.splice(
        open.findIndex((o) => o[0] === c[0] && o[1] === c[1]),
        1,
      );
    }
  }

  const blockers: NonNullable<LevelInput['blockers']> = [];
  const floors: NonNullable<LevelInput['floors']> = [];
  const threats: NonNullable<LevelInput['threats']> = [];
  const fences: NonNullable<LevelInput['fences']> = [...(spec.fences ?? [])];
  const start: NonNullable<LevelInput['start']> = [];
  const inPool = (pool: Coord[], c: Coord) => pool.some((o) => o[0] === c[0] && o[1] === c[1]);
  const drop = (pool: Coord[], c: Coord) => {
    const i = pool.findIndex((o) => o[0] === c[0] && o[1] === c[1]);
    if (i >= 0) pool.splice(i, 1);
  };

  // Explicitly authored current cells are reserved before anything else is placed.
  for (const cur of spec.currents ?? []) drop(open, cur.at);

  // Blockers first (they take cells), keeping at least one cell apart so lanes stay open.
  let pool = biasedPool(rng, open, w, h, bias);
  if (has('scrap')) {
    const layers = spec.scrapLayers ?? 1;
    for (const c of take(pool, spec.counts?.scrap ?? 2, 2))
      blockers.push({ kind: 'scrap', at: c, layers });
  }
  if (has('cage')) {
    for (const c of take(pool, spec.counts?.cages ?? 1, 2)) {
      blockers.push({
        kind: 'cage',
        at: c,
        content: { tier: spec.cageTier ?? 2 },
        layers: spec.cageLayers ?? 1,
      });
    }
  }
  if (has('crust')) {
    for (const c of take(pool, spec.counts?.crust ?? 1, 2))
      blockers.push({ kind: 'crust', at: c, content: { tier: spec.crustTier ?? 2 } });
  }
  if (has('sleeper')) {
    for (const c of take(pool, spec.counts?.sleepers ?? 1, 2))
      blockers.push({ kind: 'sleeper', at: c, content: { tier: spec.sleeperTier ?? 2 } });
  }
  if (has('scrapMound')) {
    // 2×2 block of free cells, anchored at its top-left cell.
    let placed = 0;
    for (let i = 0; i < pool.length && placed < (spec.counts?.mounds ?? 1); i++) {
      const c = pool[i]!;
      const cells: Coord[] = [c, [c[0] + 1, c[1]], [c[0], c[1] + 1], [c[0] + 1, c[1] + 1]];
      if (!cells.every((q) => inPool(pool, q))) continue;
      blockers.push({ kind: 'scrapMound', at: c, size: [2, 2], layers: spec.moundLayers ?? 4 });
      for (const q of cells) drop(pool, q);
      placed++;
      i = -1;
    }
  }
  if (has('fog')) {
    const tier = spec.fogTier ?? 2;
    for (const c of take(pool, spec.counts?.fog ?? 3, 1)) {
      if (tier > 0) blockers.push({ kind: 'fog', at: c, content: { tier } });
      else blockers.push({ kind: 'fog', at: c });
    }
  }
  if (has('rot')) {
    for (const c of take(pool, spec.counts?.rot ?? 1, 2))
      threats.push({ kind: 'rot', at: c, period: spec.rotPeriod ?? 3 });
  }
  if (has('stray')) {
    for (const c of take(pool, spec.counts?.strays ?? 1, 2))
      threats.push({ kind: 'stray', at: c, tier: spec.strayTier ?? 1 });
  }

  // Target floors: withered / deep withered / spores.
  pool = biasedPool(rng, pool, w, h, bias);
  if (has('withered')) {
    for (const c of take(pool, spec.counts?.withered ?? 3, 1))
      floors.push({ kind: 'withered', at: c });
  }
  if (has('deepWithered')) {
    for (const c of take(pool, spec.counts?.deepWithered ?? 2, 1))
      floors.push({ kind: 'deepWithered', at: c });
  }
  if (has('spore')) {
    for (const c of take(pool, spec.counts?.spores ?? 3, 1)) floors.push({ kind: 'spore', at: c });
  }
  if (has('oil')) {
    for (const c of take(pool, spec.counts?.oil ?? 2, 1)) floors.push({ kind: 'oil', at: c });
  }
  if (has('toxic')) {
    for (const c of take(pool, spec.counts?.toxic ?? 1, 2))
      threats.push({ kind: 'toxic', at: c, countdown: spec.toxicCountdown ?? 6 });
  }
  if (has('portal')) {
    // Pairs far apart (Chebyshev ≥ 3 when possible).
    for (let k = 0; k < (spec.counts?.portals ?? 1); k++) {
      const pair = take(pool, 2, 3);
      if (pair.length < 2) break;
      const portalId = String.fromCharCode(97 + k);
      for (const c of pair) floors.push({ kind: 'portal', at: c, portalId });
    }
  }
  if (has('current')) {
    for (const cur of spec.currents ?? [])
      floors.push({ kind: 'current', at: cur.at, dir: cur.dir });
    for (const c of take(pool, spec.counts?.currents ?? 0, 1))
      floors.push({ kind: 'current', at: c, dir: spec.currentDir ?? 'right' });
  }

  // Fences between two adjacent open cells (never touching a blocker).
  if (has('fence')) {
    const k = spec.counts?.fences ?? 1;
    const candidates = rng.shuffle(pool.slice());
    for (const a of candidates) {
      if (fences.length >= k) break;
      const b: Coord = rng.int(2) === 0 ? [a[0] + 1, a[1]] : [a[0], a[1] + 1];
      if (pool.some((c) => c[0] === b[0] && c[1] === b[1])) fences.push({ a, b });
    }
  }

  // Start blobs on the remaining cells (floors may sit underneath).
  const startCells = rng.shuffle(pool.slice());
  const tiers = spec.startTiers ?? [2, 2, 1, 1];
  tiers.forEach((t, i) => {
    const c = startCells[i];
    if (!c) return;
    const def: StartBlobSpec = typeof t === 'number' ? { tier: t } : t;
    const blob: NonNullable<LevelInput['start']>[number]['blob'] = { tier: def.tier };
    if (def.material) blob.material = def.material;
    if (def.kind) blob.kind = def.kind;
    start.push({ at: c, blob });
  });

  const input: LevelInput = {
    schemaVersion: 1,
    id,
    zone: spec.zone,
    grid: { w, h, mask: mask.map((r) => r.join('')) },
    fences,
    floors,
    blockers,
    threats,
    start,
    spawn,
    goals,
    moves,
    cap,
    specials: { lineAt, burstAt },
    difficulty,
  };
  if (spec.name) input.name = spec.name;
  return LevelSchema.parse(input);
}
