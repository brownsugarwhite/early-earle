/**
 * The rules engine.
 *
 * Public API (immutable): `createState(level, seed)` and
 * `applyMove(state, dir) → MoveResult | null` (null when the swipe changes
 * nothing; then no move is consumed).
 *
 * Internal API (mutable, used by the solver on scratch boards):
 *   runPreSpawn(board, dirIndex, events) → false | MoveContext  (phases 1–5)
 *   spawnCandidates(board, out) → count                          (phase 6 choices)
 *   placeSpawn(board, cell, entry, events) / refillQueue(board)   (phase 6)
 *   finalizeMove(board, events)                                  (phase 7)
 *   canSlide(board, dirIndex), anyDirectionChanges(board)
 *
 * Phase order is fixed (see events.ts):
 *   1 slide + merge   2 side effects   3 specials   4 dynamics
 *   5 graduation      6 spawn          7 goals / score / moves
 *
 * Score formula (documented here, mirrored in the GDD):
 *   merge            +2^resultTier
 *   scrap layer      +5      heal step +10     spore +10
 *   thaw / wake      +5      cage layer +10, cage opens +20
 *   special fired    +16 line, +32 burst, +48 cross, +64 tripleCross, +80 burst5,
 *                    plus +4 per blob it cleared
 *   release          +2^tier (graduation)      deliver +2^tier
 *   tier bomb        +8 per removed blob
 *   win              +5 × movesLeft
 *
 * Klassik (`level.mode === 'classic'`, freies 2048): zwei Start-Blobs, Gelee in jeder Zone,
 * keine Spezialteile, keine Aufbrüche, kein Zugzähler, kein Sieg; verloren nur mit `stuck`.
 * Punkte = Summe der Merge-Werte (2^Stufe).
 */

import type { MoveEvent, MoveResult, Phase, PromoteEvent, SpecialKind } from '../events';
import {
  type Blob,
  type Board,
  type Coord,
  type Dir,
  type GoalProgress,
  type LevelState,
  type SpawnEntry,
  CELL_OPEN,
  CELL_PILLAR,
  CELL_VOID,
  DIR_INDEX,
  F_AXIS_V,
  F_CAGED,
  F_FROZEN,
  F_HIDDEN,
  F_IMMOBILE,
  F_SLEEPER,
  FLOOR_CURRENT,
  FLOOR_DEEP_WITHERED,
  FLOOR_NONE,
  FLOOR_OIL,
  FLOOR_PORTAL,
  FLOOR_SPORE,
  FLOOR_WITHERED,
  KIND_AMOEBA,
  KIND_BURST,
  KIND_LINE,
  KIND_NORMAL,
  KIND_STRAY,
  KINDS,
  MAT_FIRE,
  MAT_GAS,
  MAT_LIQUID,
  MATERIAL_INDEX,
  MATERIALS,
  KIND_INDEX,
  cloneBoard,
  coordOf,
  countBlobs,
  indexOf,
  kindOf,
  makeFlags,
  materialOf,
  materializeCells,
  withKind,
} from '../model';
import type { LevelDef, StartBlobDef } from '../schema/level';
import { pickWeighted, randInt } from '../rng';
import { getGeometry } from './lanes';

// ---- module-level scratch (boards have at most 64 cells) ---------------------
const MAX_CELLS = 64;
const mergedThis = new Uint8Array(MAX_CELLS);
const rotImmune = new Uint8Array(MAX_CELLS);
const pushed = new Uint8Array(MAX_CELLS);
const pathBuf = new Int16Array(MAX_CELLS * 2);
const candBuf = new Int16Array(MAX_CELLS);
const histBuf = new Uint8Array(16);
let pathLen = 0;
let stepMergeTarget = -1;

interface FiredSpecial {
  cell: number;
  sKind: number;
  sAxisV: boolean;
  mKind: number;
  mAxisV: boolean;
}

/** Per-move bookkeeping shared between phases (reused, never allocated per move). */
export interface MoveContext {
  mergeCount: number;
  landings: number[];
  /** Cells holding merge results, in merge order (for promotion + deliver goals). */
  results: number[];
  resultIds: number[];
  fired: FiredSpecial[];
  /** Kind of special created this move (0 = none). */
  promoted: number;
}

const ctx: MoveContext = {
  mergeCount: 0,
  landings: [],
  results: [],
  resultIds: [],
  fired: [],
  promoted: 0,
};

const P1: Phase = 1;
const P2: Phase = 2;
const P3: Phase = 3;
const P4: Phase = 4;
const P5: Phase = 5;
const P6: Phase = 6;
const P7: Phase = 7;

// ---- helpers ----------------------------------------------------------------

function isBlockedCell(b: Board, i: number): boolean {
  return b.scrap[i]! > 0 || b.mound[i]! >= 0 || b.rot[i]! > 0 || b.fog[i]! > 0;
}

function isFreeCell(b: Board, i: number): boolean {
  return b.geo.cellType[i] === CELL_OPEN && b.tiers[i] === 0 && !isBlockedCell(b, i);
}

function clearCell(b: Board, i: number): void {
  b.tiers[i] = 0;
  b.flags[i] = 0;
  b.ids[i] = 0;
}

function placeBlob(b: Board, i: number, tier: number, flags: number, id: number): void {
  b.tiers[i] = tier;
  b.flags[i] = flags;
  b.ids[i] = id;
}

function xy(b: Board, i: number): Coord {
  return coordOf(b.geo.w, i);
}

// ---- phase 1: slide + merge ---------------------------------------------------

/**
 * Computes where the blob at `c` would end up when swiping in direction `d`
 * given the current board (blobs ahead of it are already settled). Fills
 * `pathBuf`/`pathLen` and `stepMergeTarget`; returns the destination cell.
 */
function resolveStep(b: Board, d: number, c: number): number {
  const geo = b.geo;
  const nb = geo.nb[d]!;
  const f = b.flags[c]!;
  const mat = materialOf(f);
  const isGas = mat === MAT_GAS;
  const isLiquid = mat === MAT_LIQUID;
  const myTier = b.tiers[c]!;
  const myKind = kindOf(f);
  let pos = c;
  let lastSolid = c;
  let lastSolidLen = 0;
  pathLen = 0;
  stepMergeTarget = -1;

  for (;;) {
    if (geo.fence[pos]! & (1 << d) && !isGas) break;
    const nxt = nb[pos]!;
    if (nxt < 0) break;
    const ct = geo.cellType[nxt]!;
    if (ct === CELL_PILLAR) break;
    if (ct === CELL_VOID) {
      if (!isGas) break;
      pathBuf[pathLen++] = nxt;
      pos = nxt;
      continue;
    }
    if (isBlockedCell(b, nxt)) break;
    const tTier = b.tiers[nxt]!;
    if (tTier !== 0) {
      const tf = b.flags[nxt]!;
      const tKind = kindOf(tf);
      const mergeable =
        mergedThis[nxt] === 0 &&
        (tf & F_IMMOBILE) === 0 &&
        tKind !== KIND_STRAY &&
        myKind !== KIND_STRAY &&
        (tTier === myTier || tKind === KIND_AMOEBA || myKind === KIND_AMOEBA);
      if (mergeable) {
        stepMergeTarget = nxt;
        pathBuf[pathLen++] = nxt;
        lastSolid = nxt;
        lastSolidLen = pathLen;
      }
      break;
    }
    // empty open cell
    if (b.floor[nxt] === FLOOR_PORTAL) {
      const t = b.floorArg[nxt]!;
      if (b.tiers[t] !== 0 || isBlockedCell(b, t)) break; // exit blocked: stop before entering
      pathBuf[pathLen++] = nxt;
      pathBuf[pathLen++] = t;
      pos = t;
      lastSolid = t;
      lastSolidLen = pathLen;
      if (b.floor[t] === FLOOR_OIL && !isLiquid) break;
      continue;
    }
    pathBuf[pathLen++] = nxt;
    pos = nxt;
    lastSolid = nxt;
    lastSolidLen = pathLen;
    if (b.floor[nxt] === FLOOR_OIL && !isLiquid) break;
  }
  pathLen = lastSolidLen;
  return lastSolid;
}

function pathCoords(b: Board): Coord[] {
  const out: Coord[] = new Array(pathLen);
  for (let i = 0; i < pathLen; i++) out[i] = xy(b, pathBuf[i]!);
  return out;
}

function slidePhase(b: Board, d: number, ev: MoveEvent[] | null): boolean {
  const geo = b.geo;
  const n = geo.n;
  mergedThis.fill(0, 0, n);
  ctx.mergeCount = 0;
  ctx.landings.length = 0;
  ctx.results.length = 0;
  ctx.resultIds.length = 0;
  ctx.fired.length = 0;
  ctx.promoted = 0;
  let changed = false;

  const lines = geo.lines[d]!;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    for (let k = 0; k < line.length; k++) {
      const c = line[k]!;
      const tier = b.tiers[c]!;
      if (tier === 0) continue;
      const f = b.flags[c]!;
      if (f & F_IMMOBILE || kindOf(f) === KIND_STRAY) continue;
      const dest = resolveStep(b, d, c);
      if (stepMergeTarget >= 0) {
        const target = stepMergeTarget;
        const sTier = b.tiers[target]!;
        const sf = b.flags[target]!;
        const sKind = kindOf(sf);
        const mKind = kindOf(f);
        const sAm = sKind === KIND_AMOEBA;
        const mAm = mKind === KIND_AMOEBA;
        const r = sAm && mAm ? 2 : sAm ? tier + 1 : sTier + 1;
        const mat = sAm ? materialOf(f) : materialOf(sf);
        const movingId = b.ids[c]!;
        const settledId = b.ids[target]!;
        if (
          sKind === KIND_LINE ||
          sKind === KIND_BURST ||
          mKind === KIND_LINE ||
          mKind === KIND_BURST
        ) {
          ctx.fired.push({
            cell: target,
            sKind,
            sAxisV: (sf & F_AXIS_V) !== 0,
            mKind,
            mAxisV: (f & F_AXIS_V) !== 0,
          });
        }
        const id = ++b.blobSeq;
        placeBlob(b, target, r, makeFlags(mat, KIND_NORMAL), id);
        mergedThis[target] = 1;
        clearCell(b, c);
        ctx.mergeCount++;
        ctx.landings.push(target);
        ctx.results.push(target);
        ctx.resultIds.push(id);
        b.score += 1 << r;
        if (r > b.maxTier) b.maxTier = r;
        changed = true;
        if (ev) {
          ev.push({
            type: 'slide',
            phase: P1,
            id: movingId,
            from: xy(b, c),
            to: xy(b, target),
            path: pathCoords(b),
          });
          ev.push({
            type: 'merge',
            phase: P1,
            ids: [settledId, movingId],
            at: xy(b, target),
            tier: r,
            resultId: id,
            material: MATERIALS[mat]!,
          });
        }
      } else if (dest !== c) {
        const id = b.ids[c]!;
        placeBlob(b, dest, tier, f, id);
        clearCell(b, c);
        changed = true;
        if (ev) {
          ev.push({
            type: 'slide',
            phase: P1,
            id,
            from: xy(b, c),
            to: xy(b, dest),
            path: pathCoords(b),
          });
        }
      }
    }
  }
  return changed;
}

/** Read-only: would swiping in direction `d` move or merge anything? */
export function canSlide(b: Board, d: number): boolean {
  const geo = b.geo;
  mergedThis.fill(0, 0, geo.n);
  const lines = geo.lines[d]!;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    for (let k = 0; k < line.length; k++) {
      const c = line[k]!;
      if (b.tiers[c] === 0) continue;
      const f = b.flags[c]!;
      if (f & F_IMMOBILE || kindOf(f) === KIND_STRAY) continue;
      const dest = resolveStep(b, d, c);
      if (stepMergeTarget >= 0 || dest !== c) return true;
    }
  }
  return false;
}

export function anyDirectionChanges(b: Board): boolean {
  for (let d = 0; d < 4; d++) if (canSlide(b, d)) return true;
  return false;
}

// ---- phase 2: side effects ------------------------------------------------------

/**
 * Applies one "hit" to a cell (a merge landed next to it, or a special swept it).
 * Blockers lose a layer, crust thaws, sleepers wake, cages open, fog lifts, rot
 * is marked immune (or burnt by fire). With `sweep` the cell's floors are also
 * affected (withered heals one step, spores are collected) and toxic clouds vanish.
 */
function hitCell(
  b: Board,
  j: number,
  phase: Phase,
  fire: boolean,
  sweep: boolean,
  ev: MoveEvent[] | null,
): void {
  if (b.scrap[j]! > 0) {
    b.scrap[j] = b.scrap[j]! - 1;
    b.scrapCleared++;
    b.score += 5;
    if (ev)
      ev.push({ type: 'blockerHit', phase, at: xy(b, j), kind: 'scrap', layersLeft: b.scrap[j]! });
    return;
  }
  const m = b.mound[j]!;
  if (m >= 0) {
    b.moundLayers[m] = b.moundLayers[m]! - 1;
    b.scrapCleared++;
    b.score += 5;
    const left = b.moundLayers[m]!;
    if (left === 0) {
      for (let i = 0; i < b.geo.n; i++) if (b.mound[i] === m) b.mound[i] = -1;
    }
    if (ev)
      ev.push({ type: 'blockerHit', phase, at: xy(b, j), kind: 'scrapMound', layersLeft: left });
    return;
  }
  if (b.rot[j]! > 0) {
    // Fire merges and blasts burn rot away; any other merge only stops it growing this move.
    if (fire || sweep) {
      b.rot[j] = 0;
      b.rotCleared++;
      b.score += 10;
      if (ev) ev.push({ type: 'burn', phase, at: xy(b, j), what: 'rot' });
    } else {
      rotImmune[j] = 1;
    }
    return;
  }
  if (b.fog[j]! > 0) {
    b.fog[j] = 0;
    if (b.tiers[j] !== 0) {
      b.flags[j] = b.flags[j]! & ~F_HIDDEN;
      if (ev) ev.push({ type: 'reveal', phase, at: xy(b, j), id: b.ids[j]! });
    } else if (ev) {
      ev.push({ type: 'reveal', phase, at: xy(b, j) });
    }
    return;
  }
  if (b.tiers[j] !== 0) {
    const f = b.flags[j]!;
    if (b.cage[j]! > 0) {
      b.cage[j] = b.cage[j]! - 1;
      b.score += 10;
      const left = b.cage[j]!;
      if (left === 0) {
        b.flags[j] = f & ~F_CAGED;
        b.rescued++;
        b.score += 20;
      }
      if (ev) ev.push({ type: 'cageOpen', phase, at: xy(b, j), id: b.ids[j]!, layersLeft: left });
      return;
    }
    if (f & F_FROZEN) {
      b.flags[j] = f & ~F_FROZEN;
      b.score += 5;
      if (ev) {
        if (fire) ev.push({ type: 'burn', phase, at: xy(b, j), what: 'crust' });
        ev.push({ type: 'thaw', phase, at: xy(b, j), id: b.ids[j]! });
      }
      return;
    }
    if (f & F_SLEEPER) {
      b.flags[j] = f & ~F_SLEEPER;
      b.score += 5;
      if (ev) ev.push({ type: 'wake', phase, at: xy(b, j), id: b.ids[j]! });
      return;
    }
  }
  if (sweep) {
    healFloor(b, j, phase, ev);
    if (b.toxic[j]! >= 0) b.toxic[j] = -1;
  }
}

/** Heals a withered cell one step or collects a spore (merge landed on / sweep). */
function healFloor(b: Board, i: number, phase: Phase, ev: MoveEvent[] | null): void {
  const fl = b.floor[i]!;
  if (fl === FLOOR_WITHERED) {
    b.floor[i] = FLOOR_NONE;
    b.healed++;
    b.score += 10;
    if (ev) ev.push({ type: 'heal', phase, at: xy(b, i), from: 'withered', to: 'healed' });
  } else if (fl === FLOOR_DEEP_WITHERED) {
    b.floor[i] = FLOOR_WITHERED;
    b.healed++;
    b.score += 10;
    if (ev) ev.push({ type: 'heal', phase, at: xy(b, i), from: 'deepWithered', to: 'withered' });
  } else if (fl === FLOOR_SPORE) {
    b.floor[i] = FLOOR_NONE;
    b.spores++;
    b.score += 10;
    if (ev) ev.push({ type: 'collect', phase, at: xy(b, i), total: b.spores });
  }
}

function sideEffectsPhase(b: Board, ev: MoveEvent[] | null): void {
  const geo = b.geo;
  rotImmune.fill(0, 0, geo.n);
  for (let k = 0; k < ctx.landings.length; k++) {
    const L = ctx.landings[k]!;
    healFloor(b, L, P2, ev);
    const fire = materialOf(b.flags[L]!) === MAT_FIRE;
    // Fire ignites oil: the puddle burns away and a burst blast fires at the landing cell (phase 3).
    if (fire && b.floor[L] === FLOOR_OIL) {
      b.floor[L] = FLOOR_NONE;
      if (ev) ev.push({ type: 'burn', phase: P2, at: xy(b, L), what: 'oil' });
      ctx.fired.push({
        cell: L,
        sKind: KIND_BURST,
        sAxisV: false,
        mKind: KIND_NORMAL,
        mAxisV: false,
      });
    }
    // A mound adjacent on two sides still takes only one hit per landing.
    let moundHit = -1;
    for (let d = 0; d < 4; d++) {
      const j = geo.nb[d]![L]!;
      if (j < 0) continue;
      const m = b.mound[j]!;
      if (m >= 0) {
        if (m === moundHit) continue;
        moundHit = m;
      }
      hitCell(b, j, P2, fire, false, ev);
    }
  }
}

// ---- phase 3: specials ------------------------------------------------------------

function specialCells(
  b: Board,
  at: number,
  kind: SpecialKind,
  axisV: boolean,
  out: number[],
): void {
  const { w, h, cellType } = b.geo;
  const ax = at % w;
  const ay = Math.floor(at / w);
  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (i === at || cellType[i] !== CELL_OPEN) return;
    if (!out.includes(i)) out.push(i);
  };
  const row = (y: number) => {
    for (let x = 0; x < w; x++) add(x, y);
  };
  const col = (x: number) => {
    for (let y = 0; y < h; y++) add(x, y);
  };
  const square = (r: number) => {
    for (let y = ay - r; y <= ay + r; y++) for (let x = ax - r; x <= ax + r; x++) add(x, y);
  };
  switch (kind) {
    case 'line':
      if (axisV) col(ax);
      else row(ay);
      break;
    case 'burst':
      square(1);
      break;
    case 'cross':
      row(ay);
      col(ax);
      break;
    case 'tripleCross':
      for (let k = -1; k <= 1; k++) {
        row(ay + k);
        col(ax + k);
      }
      break;
    case 'burst5':
      square(2);
      break;
  }
}

const SPECIAL_BONUS: Record<SpecialKind, number> = {
  line: 16,
  burst: 32,
  cross: 48,
  tripleCross: 64,
  burst5: 80,
};

function fireSpecial(b: Board, fs: FiredSpecial, ev: MoveEvent[] | null): void {
  const sL = fs.sKind === KIND_LINE;
  const sB = fs.sKind === KIND_BURST;
  const mL = fs.mKind === KIND_LINE;
  const mB = fs.mKind === KIND_BURST;
  let kind: SpecialKind;
  let axisV = false;
  if (sL && mL) kind = 'cross';
  else if ((sL && mB) || (sB && mL)) kind = 'tripleCross';
  else if (sB && mB) kind = 'burst5';
  else if (sL || mL) {
    kind = 'line';
    axisV = sL ? fs.sAxisV : fs.mAxisV;
  } else kind = 'burst';

  const cells: number[] = [];
  specialCells(b, fs.cell, kind, axisV, cells);
  const removed: { id: number; at: Coord }[] = [];
  for (let k = 0; k < cells.length; k++) {
    const j = cells[k]!;
    if (b.tiers[j] !== 0 && (b.flags[j]! & F_IMMOBILE) === 0 && b.cage[j] === 0) {
      removed.push({ id: b.ids[j]!, at: xy(b, j) });
      clearCell(b, j);
      b.score += 4;
      healFloor(b, j, P3, ev);
      if (b.toxic[j]! >= 0) b.toxic[j] = -1;
    } else {
      hitCell(b, j, P3, false, true, ev);
    }
  }
  b.score += SPECIAL_BONUS[kind];
  if (ev) {
    ev.push({
      type: 'special',
      phase: P3,
      kind,
      at: xy(b, fs.cell),
      cells: cells.map((i) => xy(b, i)),
      removed,
    });
  }
}

function specialsPhase(b: Board, d: number, ev: MoveEvent[] | null): void {
  // Klassik (freies 2048): keine Spezialteile, weder Beförderung noch Zündung.
  if (b.level.mode === 'classic') return;
  for (let k = 0; k < ctx.fired.length; k++) fireSpecial(b, ctx.fired[k]!, ev);

  const { lineAt, burstAt } = b.level.specials;
  const n = ctx.results.length;
  if (n === 0) return;
  let kind = 0;
  if (ctx.mergeCount >= burstAt) kind = KIND_BURST;
  else if (ctx.mergeCount >= lineAt) kind = KIND_LINE;
  if (kind === 0) return;
  // Promote the last merge result that still exists.
  for (let k = n - 1; k >= 0; k--) {
    const cell = ctx.results[k]!;
    if (b.tiers[cell] === 0 || b.ids[cell] !== ctx.resultIds[k]) continue;
    let f = withKind(b.flags[cell]!, kind);
    const axisV = d === 0 || d === 1; // vertical swipe → clears the column
    if (kind === KIND_LINE && axisV) f |= F_AXIS_V;
    else f &= ~F_AXIS_V;
    b.flags[cell] = f;
    ctx.promoted = kind;
    if (ev) {
      const e: PromoteEvent = {
        type: 'promote',
        phase: P3,
        id: b.ids[cell]!,
        at: xy(b, cell),
        kind: kind === KIND_LINE ? 'line' : 'burst',
      };
      if (kind === KIND_LINE) e.axis = axisV ? 'v' : 'h';
      ev.push(e);
    }
    return;
  }
}

// ---- phase 4: dynamics ----------------------------------------------------------

function dynamicsPhase(b: Board, d: number, ev: MoveEvent[] | null): void {
  const geo = b.geo;
  const n = geo.n;
  pushed.fill(0, 0, n);

  // Currents: push one cell downstream, chain ends first, no merging.
  if (geo.currentOrder.length > 0) {
    for (let k = 0; k < geo.currentOrder.length; k++) {
      const c = geo.currentOrder[k]!;
      if (b.tiers[c] === 0 || pushed[c] || b.floor[c] !== FLOOR_CURRENT) continue;
      const f = b.flags[c]!;
      if (f & F_IMMOBILE) continue;
      const dd = b.floorArg[c]!;
      if (geo.fence[c]! & (1 << dd)) continue;
      const j = geo.nb[dd]![c]!;
      if (j < 0 || !isFreeCell(b, j)) continue;
      placeBlob(b, j, b.tiers[c]!, f, b.ids[c]!);
      clearCell(b, c);
      pushed[j] = 1;
      if (ev) ev.push({ type: 'push', phase: P4, id: b.ids[j]!, from: xy(b, c), to: xy(b, j) });
    }
  }

  // Strays: step one cell in the swipe direction; boxed in → calmed (becomes normal).
  for (let c = 0; c < n; c++) {
    if (b.tiers[c] === 0 || kindOf(b.flags[c]!) !== KIND_STRAY || pushed[c] === 2) continue;
    let free = false;
    for (let dd = 0; dd < 4 && !free; dd++) {
      const j = geo.nb[dd]![c]!;
      if (j >= 0 && !(geo.fence[c]! & (1 << dd)) && isFreeCell(b, j)) free = true;
    }
    if (!free) {
      b.flags[c] = withKind(b.flags[c]!, KIND_NORMAL);
      b.calmed++;
      b.score += 20;
      if (ev) ev.push({ type: 'strayCalm', phase: P4, id: b.ids[c]!, at: xy(b, c) });
      continue;
    }
    const j = geo.nb[d]![c]!;
    if (j >= 0 && !(geo.fence[c]! & (1 << d)) && isFreeCell(b, j)) {
      placeBlob(b, j, b.tiers[c]!, b.flags[c]!, b.ids[c]!);
      clearCell(b, c);
      pushed[j] = 2; // do not process the same stray twice in one scan
      if (ev)
        ev.push({ type: 'strayMove', phase: P4, id: b.ids[j]!, from: xy(b, c), to: xy(b, j) });
    }
  }

  // Rot: every `period` moves one rot cell eats a free neighbour, unless a merge touched it.
  const moveNumber = b.moveNo + 1;
  outer: for (let c = 0; c < n; c++) {
    const period = b.rot[c]!;
    if (period === 0 || rotImmune[c] || moveNumber % period !== 0) continue;
    for (let dd = 0; dd < 4; dd++) {
      const j = geo.nb[dd]![c]!;
      if (j >= 0 && isFreeCell(b, j) && b.floor[j] !== FLOOR_PORTAL) {
        b.rot[j] = period;
        if (ev) ev.push({ type: 'rotGrow', phase: P4, at: xy(b, j), from: xy(b, c) });
        break outer;
      }
    }
  }

  // Toxic clouds: count down, then freeze the blob on the cell or the first neighbour.
  for (let c = 0; c < n; c++) {
    const t = b.toxic[c]!;
    if (t < 0) continue;
    const left = t - 1;
    b.toxic[c] = left;
    if (ev) ev.push({ type: 'toxicTick', phase: P4, at: xy(b, c), countdown: left });
    if (left > 0) continue;
    b.toxic[c] = -1;
    let victim = -1;
    if (b.tiers[c] !== 0 && (b.flags[c]! & F_FROZEN) === 0) victim = c;
    else {
      for (let dd = 0; dd < 4; dd++) {
        const j = geo.nb[dd]![c]!;
        if (j >= 0 && b.tiers[j] !== 0 && (b.flags[j]! & F_FROZEN) === 0) {
          victim = j;
          break;
        }
      }
    }
    if (victim >= 0) {
      b.flags[victim] = b.flags[victim]! | F_FROZEN;
      if (ev) ev.push({ type: 'freeze', phase: P4, at: xy(b, victim), id: b.ids[victim]! });
    }
  }
}

// ---- phase 5: graduation --------------------------------------------------------

function graduationPhase(b: Board, ev: MoveEvent[] | null): void {
  // Klassik: keine Kappe, kein Aufbruch, keine Stufenbombe; die Stufen wachsen unbegrenzt.
  if (b.level.mode === 'classic') return;
  const geo = b.geo;
  const n = geo.n;
  const cap = b.level.cap;

  // Deliver goals: merge results of the ordered tier leave the board.
  for (const g of b.level.goals) {
    if (g.type !== 'deliver') continue;
    for (let k = 0; k < ctx.results.length; k++) {
      const cell = ctx.results[k]!;
      if (b.tiers[cell] === g.tier && b.ids[cell] === ctx.resultIds[k]) {
        b.delivered++;
        b.deliveredByTier[g.tier] = b.deliveredByTier[g.tier]! + 1;
        b.score += 1 << g.tier;
        if (ev)
          ev.push({ type: 'deliver', phase: P5, id: b.ids[cell]!, at: xy(b, cell), tier: g.tier });
        clearCell(b, cell);
      }
    }
  }

  // Release: blobs at the cap leave the board.
  let releasedNow = 0;
  for (let c = 0; c < n; c++) {
    const t = b.tiers[c]!;
    if (t === 0 || t < cap) continue;
    releasedNow++;
    b.released++;
    b.score += 1 << t;
    if (ev) ev.push({ type: 'release', phase: P5, id: b.ids[c]!, at: xy(b, c), tier: t });
    clearCell(b, c);
  }

  // Two releases in one move → tier bomb on the most numerous tier (ties: lowest).
  if (releasedNow >= 2) {
    histBuf.fill(0);
    for (let c = 0; c < n; c++) {
      const t = b.tiers[c]!;
      if (t !== 0 && (b.flags[c]! & F_IMMOBILE) === 0) histBuf[t] = histBuf[t]! + 1;
    }
    let best = 0;
    for (let t = 1; t < 16; t++) if (histBuf[t]! > (best === 0 ? 0 : histBuf[best]!)) best = t;
    if (best > 0) {
      const removed: { id: number; at: Coord }[] = [];
      for (let c = 0; c < n; c++) {
        if (b.tiers[c] === best && (b.flags[c]! & F_IMMOBILE) === 0) {
          removed.push({ id: b.ids[c]!, at: xy(b, c) });
          clearCell(b, c);
          b.score += 8;
        }
      }
      if (ev) ev.push({ type: 'tierBomb', phase: P5, tier: best, removed });
    }
  }
}

// ---- phase 6: spawn ---------------------------------------------------------------

/** Writes the candidate spawn cells into `out`; returns their count. */
export function spawnCandidates(b: Board, out: Int16Array | number[]): number {
  const geo = b.geo;
  let count = 0;
  if (b.level.spawn.sources.length > 0) {
    const adj = geo.sourceAdjacent;
    for (let k = 0; k < adj.length; k++) {
      const i = adj[k]!;
      if (b.tiers[i] === 0 && !isBlockedCell(b, i) && b.floor[i] !== FLOOR_PORTAL) out[count++] = i;
    }
    if (count > 0 || b.level.spawn.fallback === 'none') return count;
  }
  const pl = geo.playable;
  for (let k = 0; k < pl.length; k++) {
    const i = pl[k]!;
    if (b.tiers[i] === 0 && !isBlockedCell(b, i) && b.floor[i] !== FLOOR_PORTAL) out[count++] = i;
  }
  return count;
}

export function placeSpawn(
  b: Board,
  cell: number,
  entry: SpawnEntry,
  ev: MoveEvent[] | null,
): void {
  const id = ++b.blobSeq;
  const kind = entry.kind === 'amoeba' ? KIND_AMOEBA : KIND_NORMAL;
  const material = zoneMaterial(b.level);
  placeBlob(b, cell, entry.tier, makeFlags(material, kind), id);
  if (ev) {
    ev.push({
      type: 'spawn',
      phase: P6,
      id,
      at: xy(b, cell),
      tier: entry.tier,
      kind: KINDS[kind]!,
      material: MATERIALS[material]!,
    });
  }
}

/** Draws the next spawn from the level's table into the queue (uses the board RNG). */
export function refillQueue(b: Board): void {
  const table = b.level.spawn.table;
  const weights = new Array<number>(table.length);
  for (let i = 0; i < table.length; i++) weights[i] = table[i]!.weight;
  const [idx, next] = pickWeighted(b.rng, weights);
  b.rng = next;
  const row = table[idx]!;
  b.spawnQueue.push({ tier: row.tier, kind: row.kind === 'amoeba' ? 'amoeba' : 'normal' });
}

/** All possible spawn entries with their probabilities (for the solver's chance nodes). */
export function spawnDistribution(level: LevelDef): { entry: SpawnEntry; p: number }[] {
  let total = 0;
  for (const row of level.spawn.table) total += row.weight;
  return level.spawn.table.map((row) => ({
    entry: { tier: row.tier, kind: row.kind === 'amoeba' ? 'amoeba' : 'normal' },
    p: row.weight / total,
  }));
}

function spawnPhase(b: Board, ev: MoveEvent[] | null): void {
  const entry = b.spawnQueue[0];
  if (!entry) return;
  const count = spawnCandidates(b, candBuf);
  if (count === 0) return;
  const [k, next] = randInt(b.rng, count);
  b.rng = next;
  placeSpawn(b, candBuf[k]!, entry, ev);
  b.spawnQueue.shift();
  refillQueue(b);
}

// ---- phase 7: goals, score, moves -------------------------------------------------

export function computeGoalProgress(b: Board): GoalProgress[] {
  return b.level.goals.map((g): GoalProgress => {
    switch (g.type) {
      case 'reachTier':
        return { type: g.type, progress: b.maxTier, target: g.tier, done: b.maxTier >= g.tier };
      case 'release':
        return { type: g.type, progress: b.released, target: g.count, done: b.released >= g.count };
      case 'heal':
        return {
          type: g.type,
          progress: b.healed,
          target: b.healTotal,
          done: b.healed >= b.healTotal,
        };
      case 'collectSpores':
        return { type: g.type, progress: b.spores, target: g.count, done: b.spores >= g.count };
      case 'rescue':
        return { type: g.type, progress: b.rescued, target: g.count, done: b.rescued >= g.count };
      case 'clearScrap':
        return {
          type: g.type,
          progress: b.scrapCleared,
          target: b.scrapTotal,
          done: b.scrapCleared >= b.scrapTotal,
        };
      case 'deliver': {
        const n = b.deliveredByTier[g.tier]!;
        return { type: g.type, progress: n, target: g.count, done: n >= g.count };
      }
      case 'score':
        return { type: g.type, progress: b.score, target: g.points, done: b.score >= g.points };
      case 'clearRot': {
        let remaining = 0;
        for (let i = 0; i < b.geo.n; i++) if (b.rot[i]! > 0) remaining++;
        return {
          type: g.type,
          progress: b.rotCleared,
          target: b.rotCleared + remaining,
          done: remaining === 0,
        };
      }
      case 'calmStrays':
        return { type: g.type, progress: b.calmed, target: g.count, done: b.calmed >= g.count };
    }
  });
}

export function finalizeMove(b: Board, ev: MoveEvent[] | null): void {
  if (b.level.mode === 'classic') {
    // Klassik: kein Zugzähler, kein Sieg; vorbei erst, wenn keine Richtung mehr etwas ändert.
    b.moveNo++;
    if (!anyDirectionChanges(b)) {
      b.status = 'lost';
      if (ev) ev.push({ type: 'lost', phase: P7, reason: 'stuck' });
    }
    return;
  }
  b.moveNo++;
  b.movesLeft--;
  const prev = b.goalProgress;
  const gp = computeGoalProgress(b);
  b.goalProgress = gp;
  let allDone = true;
  for (let i = 0; i < gp.length; i++) {
    const g = gp[i]!;
    if (!g.done) allDone = false;
    const p = prev[i];
    if (ev && (!p || p.progress !== g.progress || p.done !== g.done)) {
      ev.push({
        type: 'goalProgress',
        phase: P7,
        index: i,
        progress: g.progress,
        target: g.target,
        done: g.done,
      });
    }
  }
  if (allDone) {
    b.status = 'won';
    b.score += 5 * b.movesLeft;
    if (ev) ev.push({ type: 'won', phase: P7, score: b.score, movesLeft: b.movesLeft });
    return;
  }
  if (b.movesLeft <= 0) {
    b.status = 'lost';
    if (ev) ev.push({ type: 'lost', phase: P7, reason: 'noMoves' });
    return;
  }
  if (!anyDirectionChanges(b)) {
    b.status = 'lost';
    if (ev) ev.push({ type: 'lost', phase: P7, reason: 'stuck' });
  }
}

// ---- move driver -----------------------------------------------------------------

/**
 * Phases 1–5 on a mutable board. Returns `false` when the swipe changes nothing
 * (board untouched), otherwise the shared move context.
 */
export function runPreSpawn(b: Board, d: number, ev: MoveEvent[] | null): MoveContext | false {
  if (b.status !== 'playing') return false;
  if (!slidePhase(b, d, ev)) return false;
  sideEffectsPhase(b, ev);
  specialsPhase(b, d, ev);
  dynamicsPhase(b, d, ev);
  graduationPhase(b, ev);
  return ctx;
}

/**
 * Applies a swipe. Returns null when nothing would change (no move consumed).
 * Never mutates `state`.
 */
export function applyMove(state: LevelState, dir: Dir): MoveResult<LevelState> | null {
  const d = DIR_INDEX[dir];
  const b = cloneBoard(state);
  const events: MoveEvent[] = [];
  const c = runPreSpawn(b, d, events);
  if (c === false) return null;
  const mergeCount = c.mergeCount;
  spawnPhase(b, events);
  finalizeMove(b, events);
  return { state: toLevelState(b), dir, events, mergeCount };
}

export function toLevelState(b: Board): LevelState {
  return { ...b, cells: materializeCells(b) };
}

// ---- createState ------------------------------------------------------------------

function zoneMaterial(level: LevelDef): number {
  // Klassik spielt in jeder Zone mit Gelee (Gas schwebte über Risse, das wäre kein 2048 mehr).
  if (level.mode === 'classic') return MATERIAL_INDEX.jelly;
  switch (level.zone) {
    case 'syrup':
      return MATERIAL_INDEX.liquid;
    case 'luzz':
      return MATERIAL_INDEX.gas;
    case 'wooding':
      return MATERIAL_INDEX.fire;
    default:
      return MATERIAL_INDEX.jelly;
  }
}

function blobFlags(level: LevelDef, def: StartBlobDef): number {
  const mat = def.material ? MATERIAL_INDEX[def.material] : zoneMaterial(level);
  const kind = def.kind ? KIND_INDEX[def.kind] : KIND_NORMAL;
  return makeFlags(mat, kind);
}

/** Builds the initial state of a level for a given RNG seed. */
export function createState(level: LevelDef, seed: number): LevelState {
  const geo = getGeometry(level);
  const n = geo.n;
  const w = geo.w;
  const b: Board = {
    level,
    geo,
    tiers: new Uint8Array(n),
    flags: new Uint16Array(n),
    ids: new Int32Array(n),
    scrap: new Uint8Array(n),
    mound: new Int8Array(n).fill(-1),
    moundLayers: new Uint8Array(level.blockers.filter((x) => x.kind === 'scrapMound').length),
    floor: new Uint8Array(n),
    floorArg: new Int16Array(n).fill(-1),
    fog: new Uint8Array(n),
    cage: new Uint8Array(n),
    rot: new Uint8Array(n),
    toxic: new Int8Array(n).fill(-1),
    movesLeft: level.moves,
    moveNo: 0,
    score: 0,
    rng: seed | 0,
    blobSeq: 0,
    status: 'playing',
    spawnQueue: [],
    released: 0,
    delivered: 0,
    deliveredByTier: new Uint8Array(16),
    rescued: 0,
    rotCleared: 0,
    calmed: 0,
    spores: 0,
    healed: 0,
    healTotal: 0,
    scrapCleared: 0,
    scrapTotal: 0,
    maxTier: 0,
    goalProgress: [],
  };

  // floors
  const portals = new Map<string, number[]>();
  for (const f of level.floors) {
    const i = indexOf(w, f.at);
    switch (f.kind) {
      case 'oil':
        b.floor[i] = FLOOR_OIL;
        break;
      case 'current':
        b.floor[i] = FLOOR_CURRENT;
        b.floorArg[i] = DIR_INDEX[f.dir];
        break;
      case 'withered':
        b.floor[i] = FLOOR_WITHERED;
        b.healTotal += 1;
        break;
      case 'deepWithered':
        b.floor[i] = FLOOR_DEEP_WITHERED;
        b.healTotal += 2;
        break;
      case 'spore':
        b.floor[i] = FLOOR_SPORE;
        break;
      case 'portal': {
        b.floor[i] = FLOOR_PORTAL;
        const list = portals.get(f.portalId) ?? [];
        list.push(i);
        portals.set(f.portalId, list);
        break;
      }
    }
  }
  for (const cells of portals.values()) {
    if (cells.length === 2) {
      b.floorArg[cells[0]!] = cells[1]!;
      b.floorArg[cells[1]!] = cells[0]!;
    }
  }

  // start blobs
  for (const s of level.start) {
    const i = indexOf(w, s.at);
    placeBlob(b, i, s.blob.tier, blobFlags(level, s.blob), ++b.blobSeq);
  }

  // blockers
  let moundIdx = 0;
  for (const bl of level.blockers) {
    const i = indexOf(w, bl.at);
    switch (bl.kind) {
      case 'scrap':
        b.scrap[i] = bl.layers;
        b.scrapTotal += bl.layers;
        break;
      case 'scrapMound': {
        const m = moundIdx++;
        b.moundLayers[m] = bl.layers;
        b.scrapTotal += bl.layers;
        for (const [dx, dy] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ] as const) {
          b.mound[indexOf(w, [bl.at[0] + dx, bl.at[1] + dy])] = m;
        }
        break;
      }
      case 'crust':
      case 'sleeper': {
        if (bl.content) placeBlob(b, i, bl.content.tier, blobFlags(level, bl.content), ++b.blobSeq);
        if (b.tiers[i] !== 0) {
          b.flags[i] = b.flags[i]! | (bl.kind === 'crust' ? F_FROZEN : F_SLEEPER);
        }
        break;
      }
      case 'cage':
        placeBlob(b, i, bl.content.tier, blobFlags(level, bl.content) | F_CAGED, ++b.blobSeq);
        b.cage[i] = bl.layers;
        break;
      case 'fog':
        b.fog[i] = 1;
        if (bl.content)
          placeBlob(b, i, bl.content.tier, blobFlags(level, bl.content) | F_HIDDEN, ++b.blobSeq);
        break;
    }
  }

  // threats
  for (const t of level.threats) {
    const i = indexOf(w, t.at);
    switch (t.kind) {
      case 'rot':
        b.rot[i] = t.period;
        break;
      case 'toxic':
        b.toxic[i] = t.countdown;
        break;
      case 'stray':
        placeBlob(b, i, t.tier, makeFlags(zoneMaterial(level), KIND_STRAY), ++b.blobSeq);
        break;
    }
  }

  // spawn preview; an empty board gets its first blob right away (Klassik: zwei wie in 2048)
  refillQueue(b);
  const starts =
    level.mode === 'classic' ? Math.max(0, 2 - countBlobs(b)) : countBlobs(b) === 0 ? 1 : 0;
  for (let k = 0; k < starts; k++) spawnPhase(b, null);

  b.goalProgress = computeGoalProgress(b);
  return toLevelState(b);
}

/** Convenience for tests and tools: the blob at a coordinate. */
export function blobAtCoord(state: LevelState, c: Coord): Blob | null {
  return state.cells[indexOf(state.geo.w, c)] ?? null;
}
