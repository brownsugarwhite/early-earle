/**
 * Rewind via snapshots. States are immutable, so a snapshot is just a
 * reference; a history keeps the last `limit` states. The spawn queue is part
 * of the state, so rewinding never re-rolls the preview.
 */

import type { Dir, LevelState } from '../model';
import { DIR_INDEX, DIRS } from '../model';
import { canSlide } from './applyMove';

export interface History {
  readonly current: LevelState;
  /** Older states, most recent last. */
  readonly past: readonly LevelState[];
  readonly limit: number;
}

export function createHistory(initial: LevelState, limit = 5): History {
  return { current: initial, past: [], limit: Math.max(0, limit) };
}

/** Records a new current state, dropping the oldest snapshot beyond the limit. */
export function record(h: History, next: LevelState): History {
  const past =
    h.past.length >= h.limit ? h.past.slice(h.past.length - h.limit + 1) : h.past.slice();
  if (h.limit > 0) past.push(h.current);
  return { current: next, past, limit: h.limit };
}

export function canRewind(h: History): boolean {
  return h.past.length > 0;
}

/** Steps back one move; returns the same history when nothing can be rewound. */
export function rewind(h: History): History {
  if (h.past.length === 0) return h;
  const past = h.past.slice(0, -1);
  return { current: h.past[h.past.length - 1]!, past, limit: h.limit };
}

/** Directions that would change the board. */
export function availableDirections(state: LevelState): Dir[] {
  if (state.status !== 'playing') return [];
  const out: Dir[] = [];
  for (const dir of DIRS) if (canSlide(state, DIR_INDEX[dir])) out.push(dir);
  return out;
}

/** True when at least one swipe changes the board (and the game is still running). */
export function canMove(state: LevelState): boolean {
  if (state.status !== 'playing') return false;
  for (let d = 0; d < 4; d++) if (canSlide(state, d)) return true;
  return false;
}
