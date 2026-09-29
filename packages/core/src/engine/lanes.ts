/**
 * Geometry precomputation per level: cell types, fence bits, neighbour tables
 * and — per direction — the lines (full rows/columns ordered from the wall
 * side) and the lane segments (playable runs split at void, pillar and fence).
 *
 * Segments are what a jelly/liquid/fire blob can slide within; gas blobs use the
 * full line because they float over rifts and fences.
 */

import {
  CELL_OPEN,
  CELL_PILLAR,
  CELL_VOID,
  DIR_INDEX,
  DX,
  DY,
  indexOf,
} from '../model';
import type { LevelDef } from '../schema/level';
import { mulberry32 } from '../rng';

export interface Geometry {
  readonly w: number;
  readonly h: number;
  readonly n: number;
  /** CELL_VOID | CELL_OPEN | CELL_PILLAR per cell. */
  readonly cellType: Uint8Array;
  /** Bit d set = fence between the cell and its neighbour in direction d. */
  readonly fence: Uint8Array;
  /** Neighbour index per direction (-1 = off board). */
  readonly nb: readonly [Int16Array, Int16Array, Int16Array, Int16Array];
  /** [dir][line] full rows/columns, ordered wall-side first (includes void/pillar cells). */
  readonly lines: readonly (readonly (readonly number[])[])[];
  /** [dir][segment] playable cells ordered wall-side first, split at void/pillar/fence. */
  readonly segments: readonly (readonly (readonly number[])[])[];
  /** Indices of all '.' cells. */
  readonly playable: readonly number[];
  /** Playable cells that are 4-adjacent to a spawn source (ascending, unique). */
  readonly sourceAdjacent: readonly number[];
  /** Zobrist keys, 16 per cell (tier 0..15). */
  readonly zobrist: Uint32Array;
  /** Per-cell multipliers for hashing flags and layers. */
  readonly zobristMul: Uint32Array;
  /** Cells with a current floor, ordered downstream-first. */
  readonly currentOrder: readonly number[];
}

const cache = new WeakMap<LevelDef, Geometry>();

/** Returns the (cached) geometry of a level. */
export function getGeometry(level: LevelDef): Geometry {
  let g = cache.get(level);
  if (!g) {
    g = buildGeometry(level);
    cache.set(level, g);
  }
  return g;
}

export function buildGeometry(level: LevelDef): Geometry {
  const w = level.grid.w;
  const h = level.grid.h;
  const n = w * h;
  const cellType = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    const row = level.grid.mask[y] ?? '';
    for (let x = 0; x < w; x++) {
      const ch = row.charAt(x);
      cellType[y * w + x] = ch === '.' ? CELL_OPEN : ch === 'P' ? CELL_PILLAR : CELL_VOID;
    }
  }

  const nb: [Int16Array, Int16Array, Int16Array, Int16Array] = [
    new Int16Array(n),
    new Int16Array(n),
    new Int16Array(n),
    new Int16Array(n),
  ];
  for (let d = 0; d < 4; d++) {
    for (let i = 0; i < n; i++) {
      const x = (i % w) + DX[d]!;
      const y = Math.floor(i / w) + DY[d]!;
      nb[d]![i] = x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x;
    }
  }

  const fence = new Uint8Array(n);
  for (const f of level.fences) {
    const a = indexOf(w, f.a);
    const b = indexOf(w, f.b);
    for (let d = 0; d < 4; d++) {
      if (nb[d]![a] === b) {
        fence[a] = fence[a]! | (1 << d);
      }
      if (nb[d]![b] === a) {
        fence[b] = fence[b]! | (1 << d);
      }
    }
  }

  // Lines: for each direction, rows/columns ordered from the wall side.
  const lines: number[][][] = [[], [], [], []];
  for (let x = 0; x < w; x++) {
    const up: number[] = [];
    for (let y = 0; y < h; y++) up.push(y * w + x);
    lines[0]!.push(up);
    lines[1]!.push([...up].reverse());
  }
  for (let y = 0; y < h; y++) {
    const left: number[] = [];
    for (let x = 0; x < w; x++) left.push(y * w + x);
    lines[2]!.push(left);
    lines[3]!.push([...left].reverse());
  }

  // Segments: split lines at void/pillar cells and fences.
  const segments: number[][][] = [[], [], [], []];
  for (let d = 0; d < 4; d++) {
    for (const line of lines[d]!) {
      let cur: number[] = [];
      const flush = () => {
        if (cur.length > 0) segments[d]!.push(cur);
        cur = [];
      };
      for (const c of line) {
        if (cellType[c] !== CELL_OPEN) {
          flush();
          continue;
        }
        // fence between c and the cell ahead of it (its neighbour in direction d)?
        if (cur.length > 0 && fence[c]! & (1 << d)) flush();
        cur.push(c);
      }
      flush();
    }
  }

  const playable: number[] = [];
  for (let i = 0; i < n; i++) if (cellType[i] === CELL_OPEN) playable.push(i);

  const adj = new Set<number>();
  for (const s of level.spawn.sources) {
    const si = indexOf(w, s);
    for (let d = 0; d < 4; d++) {
      const j = nb[d]![si]!;
      if (j >= 0 && cellType[j] === CELL_OPEN) adj.add(j);
    }
  }
  const sourceAdjacent = [...adj].sort((a, b) => a - b);

  // Zobrist keys from a fixed seed (level-independent, so hashes are comparable).
  const zobrist = new Uint32Array(n * 16);
  const zobristMul = new Uint32Array(n);
  let s = 0x2545f491;
  for (let i = 0; i < zobrist.length; i++) {
    const [v, next] = mulberry32(s);
    zobrist[i] = v;
    s = next;
  }
  for (let i = 0; i < n; i++) {
    const [v, next] = mulberry32(s);
    zobristMul[i] = v | 1;
    s = next;
  }

  // Current cells ordered downstream-first (chain ends first) so chains move as one.
  const currentDir = new Int8Array(n).fill(-1);
  for (const f of level.floors) {
    if (f.kind === 'current') currentDir[indexOf(w, f.at)] = DIR_INDEX[f.dir];
  }
  const depth = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    if (currentDir[i]! < 0) continue;
    let steps = 0;
    let c = i;
    const seen = new Set<number>();
    while (c >= 0 && currentDir[c]! >= 0 && !seen.has(c)) {
      seen.add(c);
      c = nb[currentDir[c]!]![c]!;
      steps++;
    }
    depth.set(i, steps);
  }
  const currentOrder = [...depth.keys()].sort((a, b) => depth.get(a)! - depth.get(b)! || a - b);

  return {
    w,
    h,
    n,
    cellType,
    fence,
    nb,
    lines,
    segments,
    playable,
    sourceAdjacent,
    zobrist,
    zobristMul,
    currentOrder,
  };
}
