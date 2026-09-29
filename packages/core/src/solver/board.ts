/**
 * Fast-board utilities for the solver: preallocated scratch boards (typed
 * arrays reused across nodes, no allocation in the hot path) and a Zobrist
 * hash for the transposition table.
 */

import { cloneBoard, type Board } from '../model';

/** Allocates `count` scratch boards shaped like `template`. */
export function allocScratch(template: Board, count: number): Board[] {
  const out: Board[] = [];
  for (let i = 0; i < count; i++) out.push(cloneBoard(template));
  return out;
}

/**
 * Zobrist hash over (cell, tier) plus per-cell multipliers for flags and
 * layers, mixed with the scalar state that influences the evaluation.
 */
export function hashBoard(b: Board): number {
  const geo = b.geo;
  const n = geo.n;
  let h = 0x9e3779b9;
  for (let i = 0; i < n; i++) {
    const t = b.tiers[i]!;
    if (t !== 0) {
      h ^= geo.zobrist[i * 16 + (t & 15)]!;
      h = (h + Math.imul(b.flags[i]! + 1, geo.zobristMul[i]!)) | 0;
    }
    const layer =
      b.scrap[i]! |
      (b.cage[i]! << 2) |
      (b.fog[i]! << 4) |
      (b.rot[i]! << 5) |
      ((b.floor[i]! & 7) << 9);
    if (layer !== 0) h = (h ^ Math.imul(layer + 0x51, geo.zobristMul[i]!)) | 0;
    const m = b.mound[i]!;
    if (m >= 0) h = (h + Math.imul(b.moundLayers[m]! + 1, geo.zobristMul[i]! ^ 0x7f4a7c15)) | 0;
  }
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h ^= b.movesLeft * 0x27d4eb2f;
  h ^= (b.spawnQueue[0]?.tier ?? 0) * 0x165667b1;
  h ^=
    (b.maxTier |
      (b.released << 4) |
      (b.healed << 8) |
      (b.spores << 12) |
      (b.scrapCleared << 16) |
      (b.rescued << 22)) *
    0x9e3779b1;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
