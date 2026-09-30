import { applyMove, type Dir, type LevelState } from '@ee/core';

/**
 * Wisch-Hinweis für Level 1 (Iteration 4, Punkt 3): ein großer Papierpfeil über dem Brett zeigt die erste Richtung,
 * die etwas verschmilzt — bis zum ersten Wisch. Hier nur die Entscheidungen (rein, testbar); die Darstellung ist
 * `SwipeHint.tsx` (eigener Dateiname: `swipeHint.ts` neben `SwipeHint.tsx` verwechselt macOS ohne Groß-/Kleinschreibung).
 */

/** Reihenfolge der Proberichtungen (waagerecht zuerst: so liegen die Paare im ersten Level). */
export const HINT_DIRECTIONS: readonly Dir[] = ['left', 'right', 'up', 'down'];
/** Der Hinweis erscheint so viele Sekunden nach dem Beginn der Level-Phase (≈ 2,6 s nach der Intro-Landung). */
export const HINT_DELAY_S = 2.45;

/** Erste Richtung, deren Zug etwas verschmilzt; sonst die erste gültige; null ohne gültigen Zug. */
export function pickSwipeDirection(state: LevelState | null | undefined): Dir | null {
  if (!state || state.status !== 'playing') return null;
  let fallback: Dir | null = null;
  for (const dir of HINT_DIRECTIONS) {
    const res = applyMove(state, dir);
    if (!res) continue;
    if (res.mergeCount > 0) return dir;
    fallback ??= dir;
  }
  return fallback;
}

export interface HintFacts {
  /** Flow-Phase (nur im Level). */
  phase: string;
  /** Geladenes Level (Index in LEVELS) und der gespielte Knoten. */
  levelIndex: number;
  playing: number | null;
  /** Züge dieses Versuchs. */
  moveSeq: number;
  status: string | undefined;
  /** Siege in Level 1 im aktiven Stand. */
  firstLevelWins: number;
}

/** Soll der Hinweis gerade da sein (abgesehen von der Verzögerung)? Level 1, nie gewonnen, noch kein Zug. */
export function hintWanted(f: HintFacts): boolean {
  return f.phase === 'level' && f.levelIndex === 0 && (f.playing ?? 0) === 0 && f.moveSeq === 0 && f.status === 'playing' && f.firstLevelWins === 0;
}
