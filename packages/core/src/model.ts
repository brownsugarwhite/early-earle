/**
 * Core model: blobs, the board and the public `LevelState`.
 *
 * Internally the board lives in typed arrays (one entry per cell, row-major,
 * index = y * w + x). `applyMove` never mutates a state it was given: it clones
 * the arrays, runs the phases on the clone and returns it. The same mutable
 * step functions power the solver on preallocated scratch boards, so there is
 * exactly one implementation of the rules.
 *
 * `LevelState.cells` is a materialised, renderer-friendly view of the typed
 * arrays (built once at the end of `applyMove`).
 */

import type { GoalType, LevelDef } from './schema/level';
import type { Geometry } from './engine/lanes';

export type Coord = [x: number, y: number];
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Material = 'jelly' | 'liquid' | 'gas' | 'fire';
export type BlobKind = 'normal' | 'amoeba' | 'line' | 'burst' | 'stray';
export type LineAxis = 'h' | 'v';
export type Status = 'playing' | 'won' | 'lost';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
/** Direction index: 0 up, 1 down, 2 left, 3 right. */
export const DIR_INDEX: Readonly<Record<Dir, number>> = { up: 0, down: 1, left: 2, right: 3 };
export const DX: readonly number[] = [0, 0, -1, 1];
export const DY: readonly number[] = [-1, 1, 0, 0];
export const OPPOSITE: readonly number[] = [1, 0, 3, 2];
export const MATERIAL_INDEX: Readonly<Record<Material, number>> = {
  jelly: 0,
  liquid: 1,
  gas: 2,
  fire: 3,
};
export const MATERIALS: readonly Material[] = ['jelly', 'liquid', 'gas', 'fire'];
export const KIND_INDEX: Readonly<Record<BlobKind, number>> = {
  normal: 0,
  amoeba: 1,
  line: 2,
  burst: 3,
  stray: 4,
};
export const KINDS: readonly BlobKind[] = ['normal', 'amoeba', 'line', 'burst', 'stray'];

/** A blob as the renderer sees it. Ids are stable and never reused. */
export interface Blob {
  id: number;
  tier: number;
  material: Material;
  kind: BlobKind;
  /** Only for `kind: 'line'`: the axis it will clear when it fires. */
  axis?: LineAxis;
  frozen?: true;
  sleeper?: true;
  caged?: true;
  hidden?: true;
}

// ---- flag bits (Uint16 per cell) -------------------------------------------
export const F_MAT_MASK = 0b11;
export const F_KIND_SHIFT = 2;
export const F_KIND_MASK = 0b111 << F_KIND_SHIFT;
export const F_AXIS_V = 1 << 5;
export const F_FROZEN = 1 << 6;
export const F_SLEEPER = 1 << 7;
export const F_CAGED = 1 << 8;
export const F_HIDDEN = 1 << 9;
/** Blobs with any of these act as pillars: they neither slide nor merge. */
export const F_IMMOBILE = F_FROZEN | F_SLEEPER | F_CAGED | F_HIDDEN;

export const KIND_NORMAL = 0;
export const KIND_AMOEBA = 1;
export const KIND_LINE = 2;
export const KIND_BURST = 3;
export const KIND_STRAY = 4;

export const MAT_JELLY = 0;
export const MAT_LIQUID = 1;
export const MAT_GAS = 2;
export const MAT_FIRE = 3;

export function kindOf(flags: number): number {
  return (flags & F_KIND_MASK) >> F_KIND_SHIFT;
}
export function materialOf(flags: number): number {
  return flags & F_MAT_MASK;
}
export function makeFlags(material: number, kind: number): number {
  return (material & F_MAT_MASK) | ((kind << F_KIND_SHIFT) & F_KIND_MASK);
}
export function withKind(flags: number, kind: number): number {
  return (flags & ~F_KIND_MASK) | ((kind << F_KIND_SHIFT) & F_KIND_MASK);
}

// ---- floor codes (Uint8 per cell) ------------------------------------------
export const FLOOR_NONE = 0;
export const FLOOR_OIL = 1;
export const FLOOR_CURRENT = 2;
export const FLOOR_WITHERED = 3;
export const FLOOR_DEEP_WITHERED = 4;
export const FLOOR_SPORE = 5;
export const FLOOR_PORTAL = 6;

// ---- cell types (Geometry.cellType) ----------------------------------------
export const CELL_VOID = 0;
export const CELL_OPEN = 1;
export const CELL_PILLAR = 2;

export interface SpawnEntry {
  tier: number;
  kind: 'normal' | 'amoeba';
}

export interface GoalProgress {
  type: GoalType;
  progress: number;
  target: number;
  done: boolean;
}

/**
 * Mutable board used by the engine and the solver. The public `LevelState`
 * adds the materialised `cells` view. Treat every `LevelState` as immutable.
 */
export interface Board {
  readonly level: LevelDef;
  readonly geo: Geometry;

  /** 0 = empty cell, otherwise the blob's tier. */
  tiers: Uint8Array;
  /** Flag bits (material, kind, axis, frozen, sleeper, caged, hidden). */
  flags: Uint16Array;
  /** Blob id per cell (0 when empty). */
  ids: Int32Array;

  /** Scrap layers per cell (0 = none). Scrap cells are impassable. */
  scrap: Uint8Array;
  /** Mound index per cell (-1 = none); layers shared per mound. */
  mound: Int8Array;
  moundLayers: Uint8Array;
  /** Floor code per cell (FLOOR_*). */
  floor: Uint8Array;
  /** Floor argument: current → direction index, portal → paired cell index. */
  floorArg: Int16Array;
  /** 1 = fogged (hidden content, impassable until revealed). */
  fog: Uint8Array;
  /** Cage layers per cell (0 = none). */
  cage: Uint8Array;
  /** Rot period per cell (0 = no rot). Rot cells are impassable. */
  rot: Uint8Array;
  /** Toxic countdown per cell (-1 = none). Passable. */
  toxic: Int8Array;

  movesLeft: number;
  /** Number of moves applied so far (drives rot periods). */
  moveNo: number;
  score: number;
  /** mulberry32 state. */
  rng: number;
  /** Last blob id handed out. */
  blobSeq: number;
  status: Status;
  /** Pre-drawn spawns; index 0 is the next one (the preview). */
  spawnQueue: SpawnEntry[];

  // goal counters
  released: number;
  delivered: number;
  /** Deliveries per tier (index = tier), for `deliver` goals. */
  deliveredByTier: Uint8Array;
  rescued: number;
  /** Rot cells burnt away (fire merges, blasts). */
  rotCleared: number;
  /** Strays calmed (boxed in). */
  calmed: number;
  spores: number;
  healed: number;
  healTotal: number;
  scrapCleared: number;
  scrapTotal: number;
  maxTier: number;

  goalProgress: GoalProgress[];
}

export interface LevelState extends Board {
  /** Row-major w*h view of the blobs (null = empty). */
  readonly cells: readonly (Blob | null)[];
}

export function coordOf(w: number, index: number): Coord {
  return [index % w, Math.floor(index / w)];
}

export function indexOf(w: number, c: readonly [number, number]): number {
  return c[1] * w + c[0];
}

/** Builds a `Blob` object from the typed-array representation. */
export function blobAt(b: Board, i: number): Blob | null {
  const tier = b.tiers[i]!;
  if (tier === 0) return null;
  const f = b.flags[i]!;
  const kind = KINDS[kindOf(f)]!;
  const blob: Blob = {
    id: b.ids[i]!,
    tier,
    material: MATERIALS[materialOf(f)]!,
    kind,
  };
  if (kind === 'line') blob.axis = f & F_AXIS_V ? 'v' : 'h';
  if (f & F_FROZEN) blob.frozen = true;
  if (f & F_SLEEPER) blob.sleeper = true;
  if (f & F_CAGED) blob.caged = true;
  if (f & F_HIDDEN) blob.hidden = true;
  return blob;
}

export function materializeCells(b: Board): (Blob | null)[] {
  const out: (Blob | null)[] = new Array(b.geo.n);
  for (let i = 0; i < b.geo.n; i++) out[i] = blobAt(b, i);
  return out;
}

/** Deep-enough clone: typed arrays are copied, `level` and `geo` are shared. */
export function cloneBoard(b: Board): Board {
  return {
    level: b.level,
    geo: b.geo,
    tiers: b.tiers.slice(),
    flags: b.flags.slice(),
    ids: b.ids.slice(),
    scrap: b.scrap.slice(),
    mound: b.mound.slice(),
    moundLayers: b.moundLayers.slice(),
    floor: b.floor.slice(),
    floorArg: b.floorArg.slice(),
    fog: b.fog.slice(),
    cage: b.cage.slice(),
    rot: b.rot.slice(),
    toxic: b.toxic.slice(),
    movesLeft: b.movesLeft,
    moveNo: b.moveNo,
    score: b.score,
    rng: b.rng,
    blobSeq: b.blobSeq,
    status: b.status,
    spawnQueue: b.spawnQueue.slice(),
    released: b.released,
    delivered: b.delivered,
    deliveredByTier: b.deliveredByTier.slice(),
    rescued: b.rescued,
    rotCleared: b.rotCleared,
    calmed: b.calmed,
    spores: b.spores,
    healed: b.healed,
    healTotal: b.healTotal,
    scrapCleared: b.scrapCleared,
    scrapTotal: b.scrapTotal,
    maxTier: b.maxTier,
    goalProgress: b.goalProgress,
  };
}

/** Copies `src` into the preallocated `dst` (same level) without allocating. */
export function copyBoardInto(dst: Board, src: Board): void {
  dst.tiers.set(src.tiers);
  dst.flags.set(src.flags);
  dst.ids.set(src.ids);
  dst.scrap.set(src.scrap);
  dst.mound.set(src.mound);
  dst.moundLayers.set(src.moundLayers);
  dst.floor.set(src.floor);
  dst.floorArg.set(src.floorArg);
  dst.fog.set(src.fog);
  dst.cage.set(src.cage);
  dst.rot.set(src.rot);
  dst.toxic.set(src.toxic);
  dst.movesLeft = src.movesLeft;
  dst.moveNo = src.moveNo;
  dst.score = src.score;
  dst.rng = src.rng;
  dst.blobSeq = src.blobSeq;
  dst.status = src.status;
  const q = dst.spawnQueue;
  q.length = src.spawnQueue.length;
  for (let i = 0; i < q.length; i++) q[i] = src.spawnQueue[i]!;
  dst.released = src.released;
  dst.delivered = src.delivered;
  dst.deliveredByTier.set(src.deliveredByTier);
  dst.rescued = src.rescued;
  dst.rotCleared = src.rotCleared;
  dst.calmed = src.calmed;
  dst.spores = src.spores;
  dst.healed = src.healed;
  dst.healTotal = src.healTotal;
  dst.scrapCleared = src.scrapCleared;
  dst.scrapTotal = src.scrapTotal;
  dst.maxTier = src.maxTier;
  dst.goalProgress = src.goalProgress;
}

/** Number of blobs on the board. */
export function countBlobs(b: Board): number {
  let n = 0;
  for (let i = 0; i < b.geo.n; i++) if (b.tiers[i] !== 0) n++;
  return n;
}
