import type { GameMode, LevelRecord, SlotSeen } from '../../state/progress';

/**
 * Tor zwischen echtem und freiem Modus (Iteration 4, Punkt 4). Reine Entscheidungen ohne three.js und ohne Store-
 * Zugriff: der Aufrufer reicht den Fortschritt herein (`useProgress.getState()` im Spiel, Attrappen in Tests).
 *
 * - **Echt**: wie im fertigen Spiel. Nur freigeschaltete Knoten (≤ `reached`) öffnen ihr Level, das Intro läuft beim
 *   ersten Start, nach dem ersten Sieg in Level 1 erzählt REX die Szene 'afterLevel1'.
 * - **Frei**: Entwicklung, genau das bisherige Verhalten: jeder Knoten, kein Intro, keine Szene.
 */
export interface GateProgress {
  mode: GameMode;
  reached: number;
  levels: Record<string, LevelRecord>;
  seen: SlotSeen;
}

/** REX-Szene nach dem ersten Sieg in Level 1. */
export const STORY_AFTER_LEVEL_1 = 'afterLevel1';

/** Darf der Held das Level an Knoten `n` betreten? */
export function canEnterNode(n: number, p: GateProgress): boolean {
  return p.mode === 'free' || n <= p.reached;
}

/**
 * Spielt der Tipp auf den Splash das Intro (Splash → direkt in Level 1) statt des Hüpfers auf die Map?
 * Nur im echten Modus, solange Level 1 nie gewonnen und das Intro nie gesehen wurde.
 */
export function shouldPlayIntro(p: GateProgress, firstLevelId: string | undefined): boolean {
  if (p.mode !== 'real' || p.seen.intro) return false;
  return !firstLevelId || (p.levels[firstLevelId]?.wins ?? 0) === 0;
}

/** Welche REX-Szene nach dem Sieg an Knoten `node` bei der Ankunft läuft (oder keine). */
export function storyAfterWin(node: number, p: GateProgress): string | null {
  if (p.mode !== 'real' || node !== 0) return null;
  return p.seen.stories.includes(STORY_AFTER_LEVEL_1) ? null : STORY_AFTER_LEVEL_1;
}

/** Startknoten: im echten Modus nie hinter dem erreichten Knoten (ein alter `current` aus dem freien Spiel). */
export function clampCurrent(current: number, p: Pick<GateProgress, 'mode' | 'reached'>, nodeCount: number): number {
  const last = Math.max(0, nodeCount - 1);
  const c = Math.min(Math.max(0, current), last);
  return p.mode === 'real' ? Math.min(c, Math.max(0, p.reached)) : c;
}
