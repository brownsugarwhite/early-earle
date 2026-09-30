import type { Blob, Coord, LevelState, MoveEvent, MoveResult } from '@ee/core';
import type { Material, SwipeDir } from './sfx';

/**
 * Synthetic moves for the Audio-Lab and the unit tests: a row-per-merge board where movers slide `cells`
 * cells into equal partners, optional plain landings and extra events. They run through the same planner
 * as real moves, so the lab hears the real timing, caps and staggering.
 */

export interface SyntheticMoveOptions {
  tier: number;
  material: Material;
  /** Simultaneous merges (each on its own row, tiers rising by one per row when `rising`). */
  merges: number;
  cells: number;
  dir?: SwipeDir;
  /** Plain (non-merging) sliders. */
  stops?: number;
  rising?: boolean;
  extra?: MoveEvent[];
}

export function syntheticMove(o: SyntheticMoveOptions): { res: MoveResult<LevelState>; prev: LevelState } {
  const w = Math.max(4, o.cells + 2);
  const h = Math.max(4, o.merges + (o.stops ?? 0));
  const cells: (Blob | null)[] = new Array<Blob | null>(w * h).fill(null);
  const events: MoveEvent[] = [];
  let id = 100;
  const put = (x: number, y: number, b: Blob): void => {
    cells[y * w + x] = b;
  };
  const path = (y: number, from: number, to: number): Coord[] => {
    const out: Coord[] = [];
    for (let x = from - 1; x >= to; x--) out.push([x, y]);
    return out;
  };
  for (let k = 0; k < o.merges; k++) {
    const tier = Math.max(1, (o.rising ? o.tier + k : o.tier) - 1);
    const settled: Blob = { id: id++, tier, material: o.material, kind: 'normal' };
    const mover: Blob = { id: id++, tier, material: o.material, kind: 'normal' };
    put(0, k, settled);
    put(o.cells, k, mover);
    events.push({ type: 'slide', phase: 1, id: mover.id, from: [o.cells, k], to: [0, k], path: path(k, o.cells, 0) });
    events.push({ type: 'merge', phase: 1, ids: [settled.id, mover.id], at: [0, k], tier: tier + 1, resultId: id++, material: o.material });
  }
  for (let s = 0; s < (o.stops ?? 0); s++) {
    const y = o.merges + s;
    const b: Blob = { id: id++, tier: Math.max(1, o.tier - 1), material: o.material, kind: 'normal' };
    put(o.cells, y, b);
    events.push({ type: 'slide', phase: 1, id: b.id, from: [o.cells, y], to: [0, y], path: path(y, o.cells, 0) });
  }
  if (o.extra) events.push(...o.extra);
  const geo = { w, h, n: w * h };
  const prev = { cells, geo } as unknown as LevelState;
  const state = { cells, geo } as unknown as LevelState;
  return { res: { state, dir: o.dir ?? 'left', events, mergeCount: o.merges }, prev };
}
