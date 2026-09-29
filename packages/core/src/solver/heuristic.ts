/**
 * Static evaluation of a board for the expectimax bots.
 *
 * Terms (each weighted, see `Weights`):
 *   goal      per-goal progress fraction plus goal-specific shaping
 *             (tier concentration for reachTier/release/deliver/score, merge
 *             potential next to blockers for clearScrap/rescue, blobs parked on
 *             withered/spore cells with a merge partner for heal/collectSpores)
 *   empty     free playable cells
 *   mono      monotonicity along lane segments (2048 classic)
 *   smooth    smoothness between adjacent blobs (2048 classic)
 *   oil       penalty per blob stuck on an oil puddle
 *   frag      penalty per blob boxed in by blobs of other tiers
 *   urgency   goal progress is worth more the fewer moves remain
 *
 * Terminal states dominate everything: won → +1e6 (+ faster wins), lost → −1e6.
 */

import {
  CELL_OPEN,
  F_IMMOBILE,
  FLOOR_OIL,
  FLOOR_SPORE,
  FLOOR_WITHERED,
  FLOOR_DEEP_WITHERED,
  KIND_AMOEBA,
  KIND_STRAY,
  kindOf,
  type Board,
} from '../model';

export interface Weights {
  goal: number;
  shaping: number;
  empty: number;
  mono: number;
  smooth: number;
  oil: number;
  frag: number;
  urgency: number;
}

export const DEFAULT_WEIGHTS: Readonly<Weights> = {
  goal: 400,
  shaping: 120,
  empty: 60,
  mono: 6,
  smooth: 4,
  oil: 10,
  frag: 12,
  urgency: 1.0,
};

export const WIN_VALUE = 1_000_000;
export const LOSS_VALUE = -1_000_000;

const POW4 = new Float64Array(20);
for (let i = 0; i < POW4.length; i++) POW4[i] = 4 ** i;

/** Does the blob at `i` have a same-tier (or amoeba) partner reachable along a row/column? */
function hasMergePartner(b: Board, i: number): boolean {
  const geo = b.geo;
  const t = b.tiers[i]!;
  for (let d = 0; d < 4; d++) {
    const nb = geo.nb[d]!;
    let c = i;
    for (let steps = 0; steps < 8; steps++) {
      if (geo.fence[c]! & (1 << d)) break;
      c = nb[c]!;
      if (c < 0 || geo.cellType[c] !== CELL_OPEN) break;
      if (b.scrap[c]! > 0 || b.mound[c]! >= 0 || b.rot[c]! > 0 || b.fog[c]! > 0) break;
      const tt = b.tiers[c]!;
      if (tt === 0) continue;
      const f = b.flags[c]!;
      if (f & F_IMMOBILE) break;
      return tt === t || kindOf(f) === KIND_AMOEBA;
    }
  }
  return false;
}

/** Concentration of value into high tiers relative to a target tier (0..~1, can exceed). */
function concentration(b: Board, targetTier: number): number {
  let sum = 0;
  let maxT = 0;
  for (let i = 0; i < b.geo.n; i++) {
    const t = b.tiers[i]!;
    if (t === 0) continue;
    sum += POW4[t]!;
    if (t > maxT) maxT = t;
  }
  // 2^(maxT-target) rewards the top tier, sum/4^target rewards consolidation below it.
  return Math.min(1, 2 ** (maxT - targetTier)) * 0.6 + Math.min(1, sum / POW4[targetTier]!) * 0.4;
}

export function evaluate(b: Board, w: Weights = DEFAULT_WEIGHTS): number {
  if (b.status === 'won') return WIN_VALUE + b.movesLeft * 100;
  if (b.status === 'lost') return LOSS_VALUE;

  const geo = b.geo;
  const n = geo.n;
  const level = b.level;

  // --- goal terms ---------------------------------------------------------
  let goal = 0;
  let shaping = 0;
  for (const g of level.goals) {
    switch (g.type) {
      case 'reachTier':
        goal += Math.min(1, b.maxTier / g.tier);
        shaping += concentration(b, g.tier);
        break;
      case 'release':
        goal += Math.min(1, b.released / g.count);
        shaping += concentration(b, level.cap);
        break;
      case 'deliver':
        goal += Math.min(1, b.deliveredByTier[g.tier]! / g.count);
        shaping += concentration(b, g.tier);
        break;
      case 'score':
        goal += Math.min(1, b.score / g.points);
        shaping += concentration(b, Math.min(level.cap, 6));
        break;
      case 'heal':
      case 'collectSpores': {
        const total = g.type === 'heal' ? b.healTotal : g.count;
        const done = g.type === 'heal' ? b.healed : b.spores;
        goal += total > 0 ? Math.min(1, done / total) : 1;
        // blobs parked on target cells that could receive a merge
        let pot = 0;
        let targets = 0;
        for (let i = 0; i < n; i++) {
          const fl = b.floor[i]!;
          const isTarget =
            g.type === 'heal'
              ? fl === FLOOR_WITHERED || fl === FLOOR_DEEP_WITHERED
              : fl === FLOOR_SPORE;
          if (!isTarget) continue;
          targets++;
          if (b.tiers[i] !== 0 && hasMergePartner(b, i)) pot += 1;
        }
        shaping += targets > 0 ? pot / targets : 0;
        break;
      }
      case 'clearRot': {
        let remaining = 0;
        for (let i = 0; i < n; i++) if (b.rot[i]! > 0) remaining++;
        const total = b.rotCleared + remaining;
        goal += total > 0 ? b.rotCleared / total : 1;
        shaping -= Math.min(1, remaining / 6);
        break;
      }
      case 'calmStrays': {
        goal += Math.min(1, b.calmed / g.count);
        // a stray with fewer free neighbours is closer to being boxed in
        let boxed = 0;
        let strays = 0;
        for (let i = 0; i < n; i++) {
          if (b.tiers[i] === 0 || kindOf(b.flags[i]!) !== KIND_STRAY) continue;
          strays++;
          let free = 0;
          for (let d = 0; d < 4; d++) {
            const j = geo.nb[d]![i]!;
            if (j >= 0 && geo.cellType[j] === CELL_OPEN && b.tiers[j] === 0) free++;
          }
          boxed += (4 - free) / 4;
        }
        shaping += strays > 0 ? boxed / strays : 0;
        break;
      }
      case 'clearScrap':
      case 'rescue': {
        const total = g.type === 'clearScrap' ? b.scrapTotal : g.count;
        const done = g.type === 'clearScrap' ? b.scrapCleared : b.rescued;
        goal += total > 0 ? Math.min(1, done / total) : 1;
        // merge potential next to remaining blockers
        let pot = 0;
        let blockers = 0;
        for (let i = 0; i < n; i++) {
          const isBlocker =
            g.type === 'clearScrap' ? b.scrap[i]! > 0 || b.mound[i]! >= 0 : b.cage[i]! > 0;
          if (!isBlocker) continue;
          blockers++;
          for (let d = 0; d < 4; d++) {
            const j = geo.nb[d]![i]!;
            if (
              j >= 0 &&
              b.tiers[j] !== 0 &&
              (b.flags[j]! & F_IMMOBILE) === 0 &&
              hasMergePartner(b, j)
            ) {
              pot += 0.5;
            }
          }
        }
        shaping += blockers > 0 ? Math.min(1, pot / blockers) : 0;
        break;
      }
    }
  }
  const goalCount = level.goals.length;
  goal /= goalCount;
  shaping /= goalCount;

  // --- board shape --------------------------------------------------------
  let empty = 0;
  let oil = 0;
  let frag = 0;
  for (let i = 0; i < n; i++) {
    if (geo.cellType[i] !== CELL_OPEN) continue;
    const t = b.tiers[i]!;
    if (t === 0) {
      if (b.scrap[i] === 0 && b.mound[i]! < 0 && b.rot[i] === 0 && b.fog[i] === 0) empty++;
      continue;
    }
    if (b.floor[i] === FLOOR_OIL) oil++;
    // boxed in by different tiers on all open sides?
    let boxed = true;
    for (let d = 0; d < 4 && boxed; d++) {
      const j = geo.nb[d]![i]!;
      if (j < 0 || geo.cellType[j] !== CELL_OPEN) continue;
      const tj = b.tiers[j]!;
      if (tj === 0 || tj === t) boxed = false;
    }
    if (boxed && t < 4) frag++;
  }

  // monotonicity + smoothness along lane segments (left/right = 2, up/down = 0)
  let mono = 0;
  let smooth = 0;
  for (const d of [0, 2]) {
    const segs = geo.segments[d]!;
    for (let s = 0; s < segs.length; s++) {
      const seg = segs[s]!;
      let inc = 0;
      let dec = 0;
      let prev = -1;
      for (let k = 0; k < seg.length; k++) {
        const t = b.tiers[seg[k]!]!;
        if (t === 0) continue;
        if (prev >= 0) {
          const diff = t - prev;
          if (diff > 0) inc += diff;
          else dec -= diff;
          smooth -= Math.abs(diff);
        }
        prev = t;
      }
      mono -= Math.min(inc, dec);
    }
  }

  const playable = geo.playable.length;
  const urgency = 1 + w.urgency * (4 / Math.max(4, b.movesLeft));

  return (
    w.goal * goal * urgency +
    w.shaping * shaping * urgency +
    w.empty * (empty / playable) +
    w.mono * mono +
    w.smooth * smooth -
    w.oil * oil -
    w.frag * frag
  );
}
