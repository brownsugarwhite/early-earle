/**
 * LevelSchema — zod schema + inferred `LevelDef` for `content/levels/NNN.json`.
 *
 * Coordinates are `[x, y]` with `x` the column (0..w-1) and `y` the row (0..h-1).
 * `grid.mask` holds `h` rows of `w` characters: `.` playable cell, `#` void ("Riss"),
 * `P` pillar. Every `at` must point at a `.` cell.
 */

import { z } from 'zod';

export const ZONE_IDS = ['tjorizo', 'syrup', 'luzz', 'wooding'] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export const MATERIAL_NAMES = ['jelly', 'liquid', 'gas', 'fire'] as const;
export const DIR_NAMES = ['up', 'down', 'left', 'right'] as const;

/** Threshold value at or above which a special threshold counts as "switched off". */
export const SPECIAL_OFF = 9;

const Int = z.number().int();
const Coord = z.tuple([Int.min(0).max(7), Int.min(0).max(7)]);
const Tier = Int.min(1).max(12);

const BlobDef = z.object({
  tier: Tier,
  material: z.enum(MATERIAL_NAMES).optional(),
  kind: z.enum(['normal', 'amoeba', 'stray']).optional(),
});

const Floor = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('oil'), at: Coord }),
  z.object({ kind: z.literal('current'), at: Coord, dir: z.enum(DIR_NAMES) }),
  z.object({ kind: z.literal('withered'), at: Coord }),
  z.object({ kind: z.literal('deepWithered'), at: Coord }),
  z.object({ kind: z.literal('spore'), at: Coord }),
  z.object({ kind: z.literal('portal'), at: Coord, portalId: z.string().min(1) }),
]);

const Blocker = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('scrap'), at: Coord, layers: Int.min(1).max(3) }),
  z.object({
    kind: z.literal('scrapMound'),
    /** Top-left cell of the 2×2 mound. */
    at: Coord,
    size: z.tuple([z.literal(2), z.literal(2)]),
    layers: Int.min(4).max(8),
  }),
  z.object({ kind: z.literal('crust'), at: Coord, content: BlobDef.optional() }),
  z.object({ kind: z.literal('sleeper'), at: Coord, content: BlobDef.optional() }),
  z.object({
    kind: z.literal('cage'),
    at: Coord,
    content: BlobDef,
    layers: Int.min(1).max(3).default(1),
  }),
  z.object({ kind: z.literal('fog'), at: Coord, content: BlobDef.optional() }),
]);

const Threat = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('rot'), at: Coord, period: Int.min(1).max(9) }),
  z.object({ kind: z.literal('toxic'), at: Coord, countdown: Int.min(1).max(30) }),
  z.object({ kind: z.literal('stray'), at: Coord, tier: Tier.default(1) }),
]);

const Goal = z.discriminatedUnion('type', [
  z.object({ type: z.literal('reachTier'), tier: Tier.min(2) }),
  z.object({ type: z.literal('release'), count: Int.min(1).max(20) }),
  z.object({ type: z.literal('heal') }),
  z.object({ type: z.literal('collectSpores'), count: Int.min(1).max(30) }),
  z.object({ type: z.literal('rescue'), count: Int.min(1).max(10) }),
  z.object({ type: z.literal('clearScrap') }),
  z.object({ type: z.literal('deliver'), tier: Tier.min(2), count: Int.min(1).max(20) }),
  z.object({ type: z.literal('score'), points: Int.min(1) }),
  /** "Fäulnis eindämmen": remove every rot cell (blasts and fire merges burn rot). */
  z.object({ type: z.literal('clearRot') }),
  /** "Streuner beruhigen": box in N strays. */
  z.object({ type: z.literal('calmStrays'), count: Int.min(1).max(5) }),
]);

export const DIFFICULTY_STYLES = ['explosive', 'precise', 'journey', 'puzzle', 'diligent'] as const;

export const LevelSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9-]+$/),
    zone: z.enum(ZONE_IDS),
    name: z.string().min(1).optional(),
    grid: z.object({
      w: Int.min(3).max(8),
      h: Int.min(3).max(8),
      mask: z
        .array(z.string().regex(/^[.#P]+$/))
        .min(3)
        .max(8),
    }),
    fences: z.array(z.object({ a: Coord, b: Coord })).default([]),
    floors: z.array(Floor).default([]),
    blockers: z.array(Blocker).default([]),
    threats: z.array(Threat).default([]),
    start: z.array(z.object({ at: Coord, blob: BlobDef })).default([]),
    spawn: z.object({
      sources: z.array(Coord).default([]),
      table: z
        .array(
          z.object({
            tier: Int.min(1).max(3),
            weight: z.number().positive(),
            kind: z.enum(['normal', 'amoeba']).optional(),
          }),
        )
        .min(1),
      preview: z.boolean().default(true),
      fallback: z.enum(['none', 'anyEmpty']).default('none'),
    }),
    goals: z.array(Goal).min(1),
    moves: Int.min(1).max(99),
    cap: Int.min(3).max(12),
    specials: z
      .object({
        lineAt: Int.min(2).max(16).default(3),
        burstAt: Int.min(2).max(16).default(4),
      })
      .default({ lineAt: 3, burstAt: 4 }),
    difficulty: z.object({
      targetAttempts: z.tuple([z.number().min(1), z.number().min(1)]),
      style: z.enum(DIFFICULTY_STYLES).optional(),
    }),
  })
  .superRefine((lvl, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path });
    const { w, h, mask } = lvl.grid;
    if (mask.length !== h) issue(`mask must have ${h} rows`, ['grid', 'mask']);
    mask.forEach((row, y) => {
      if (row.length !== w) issue(`mask row ${y} must have ${w} chars`, ['grid', 'mask', y]);
    });
    const cellAt = (c: readonly [number, number]): string | undefined =>
      mask[c[1]]?.charAt(c[0]) || undefined;
    const isCell = (c: readonly [number, number]) => cellAt(c) === '.';
    const inside = (c: readonly [number, number]) => c[0] < w && c[1] < h;

    const checkCell = (c: readonly [number, number], path: (string | number)[]) => {
      if (!inside(c)) issue(`[${c[0]},${c[1]}] is outside the grid`, path);
      else if (!isCell(c)) issue(`[${c[0]},${c[1]}] is not a '.' cell`, path);
    };

    lvl.floors.forEach((f, i) => checkCell(f.at, ['floors', i, 'at']));
    lvl.threats.forEach((t, i) => checkCell(t.at, ['threats', i, 'at']));
    lvl.start.forEach((s, i) => checkCell(s.at, ['start', i, 'at']));
    lvl.blockers.forEach((b, i) => {
      if (b.kind === 'scrapMound') {
        for (const d of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ] as const) {
          checkCell([b.at[0] + d[0], b.at[1] + d[1]], ['blockers', i, 'at']);
        }
      } else {
        checkCell(b.at, ['blockers', i, 'at']);
      }
      if ((b.kind === 'crust' || b.kind === 'sleeper') && !b.content) {
        const hasStart = lvl.start.some((s) => s.at[0] === b.at[0] && s.at[1] === b.at[1]);
        if (!hasStart) {
          issue(`${b.kind} at [${b.at[0]},${b.at[1]}] needs content or a start blob`, [
            'blockers',
            i,
          ]);
        }
      }
    });

    // Fences only between orthogonally adjacent non-void cells.
    lvl.fences.forEach((f, i) => {
      const dx = Math.abs(f.a[0] - f.b[0]);
      const dy = Math.abs(f.a[1] - f.b[1]);
      if (dx + dy !== 1) issue('fence cells must be orthogonally adjacent', ['fences', i]);
      for (const c of [f.a, f.b]) {
        if (!inside(c) || cellAt(c) === '#')
          issue('fence must touch two non-void cells', ['fences', i]);
      }
    });

    // Spawn sources on non-void cells; empty sources need the anyEmpty fallback.
    lvl.spawn.sources.forEach((s, i) => {
      if (!inside(s) || cellAt(s) === '#')
        issue('spawn source must be on a non-void cell', ['spawn', 'sources', i]);
    });
    if (lvl.spawn.sources.length === 0 && lvl.spawn.fallback !== 'anyEmpty') {
      issue("spawn without sources needs fallback 'anyEmpty'", ['spawn', 'fallback']);
    }

    // Portals paired (exactly two cells per portalId).
    const portals = new Map<string, number>();
    for (const f of lvl.floors) {
      if (f.kind === 'portal') portals.set(f.portalId, (portals.get(f.portalId) ?? 0) + 1);
    }
    for (const [id, n] of portals) {
      if (n !== 2) issue(`portal '${id}' must have exactly two cells (has ${n})`, ['floors']);
    }

    // cap >= reachTier, deliver tier <= cap, start tiers below the cap.
    for (const [i, g] of lvl.goals.entries()) {
      if (g.type === 'reachTier' && g.tier > lvl.cap)
        issue('cap must be >= reachTier', ['goals', i]);
      if (g.type === 'deliver' && g.tier > lvl.cap)
        issue('deliver tier must be <= cap', ['goals', i]);
    }
    lvl.start.forEach((s, i) => {
      if (s.blob.tier >= lvl.cap) issue('start blob tier must be below the cap', ['start', i]);
    });

    // No two things on the same cell (start blobs, blockers, floors, threats).
    const occupied = new Map<string, string>();
    const claim = (c: readonly [number, number], what: string, path: (string | number)[]) => {
      const key = `${c[0]},${c[1]}`;
      const prev = occupied.get(key);
      if (prev) issue(`cell [${key}] already used by ${prev}`, path);
      else occupied.set(key, what);
    };
    lvl.blockers.forEach((b, i) => {
      if (b.kind === 'scrapMound') {
        for (const d of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ] as const) {
          claim([b.at[0] + d[0], b.at[1] + d[1]], 'scrapMound', ['blockers', i]);
        }
      } else if (b.kind === 'crust' || b.kind === 'sleeper') {
        // may share the cell with a start blob (that blob is the content)
        if (b.content) claim(b.at, b.kind, ['blockers', i]);
      } else {
        claim(b.at, b.kind, ['blockers', i]);
      }
    });
    lvl.threats.forEach((t, i) => claim(t.at, t.kind, ['threats', i]));
    lvl.start.forEach((s, i) => claim(s.at, 'start', ['start', i]));
    // Floors are overlays (a blob may rest on them) but at most one floor per cell.
    const floorCells = new Set<string>();
    lvl.floors.forEach((f, i) => {
      const key = `${f.at[0]},${f.at[1]}`;
      if (floorCells.has(key)) issue(`cell [${key}] already has a floor`, ['floors', i]);
      floorCells.add(key);
    });

    // At most 4 distinct element kinds per level (King/Playrix rule).
    if (countElementKinds(lvl).size > 4) {
      issue(
        `level uses ${countElementKinds(lvl).size} element kinds (max 4): ${[...countElementKinds(lvl)].join(', ')}`,
        ['blockers'],
      );
    }
  });

export type LevelDef = z.infer<typeof LevelSchema>;
export type LevelInput = z.input<typeof LevelSchema>;
export type FloorDef = LevelDef['floors'][number];
export type BlockerDef = LevelDef['blockers'][number];
export type ThreatDef = LevelDef['threats'][number];
export type GoalDef = LevelDef['goals'][number];
export type GoalType = GoalDef['type'];
export type StartBlobDef = LevelDef['start'][number]['blob'];
export type SpawnTableEntry = LevelDef['spawn']['table'][number];

/** Distinct element kinds a level uses (for the "max 4 kinds" rule and the calibration table). */
export function countElementKinds(lvl: {
  grid: { mask: string[] };
  fences: unknown[];
  floors: { kind: string }[];
  blockers: { kind: string }[];
  threats: { kind: string }[];
  start: { blob: { kind?: string | undefined } }[];
  spawn: { table: { kind?: string | undefined }[] };
  specials: { lineAt: number; burstAt: number };
}): Set<string> {
  const kinds = new Set<string>();
  if (lvl.grid.mask.some((r) => r.includes('P'))) kinds.add('pillar');
  if (lvl.fences.length > 0) kinds.add('fence');
  for (const f of lvl.floors) kinds.add(f.kind);
  for (const b of lvl.blockers) kinds.add(b.kind);
  for (const t of lvl.threats) kinds.add(t.kind);
  if (
    lvl.start.some((s) => s.blob.kind === 'amoeba') ||
    lvl.spawn.table.some((t) => t.kind === 'amoeba')
  ) {
    kinds.add('amoeba');
  }
  if (lvl.specials.lineAt < SPECIAL_OFF) kinds.add('line');
  if (lvl.specials.burstAt < SPECIAL_OFF) kinds.add('burst');
  return kinds;
}

/** Parses and validates a level; throws a ZodError with paths on failure. */
export function parseLevel(input: unknown): LevelDef {
  return LevelSchema.parse(input);
}
