import rexJson from '@content/rex/lines.json';

interface RexEntry {
  level?: number;
  min?: number;
  afterSeconds?: number;
  lines: string[];
}
type RexTriggers = Record<string, RexEntry[]>;

const data = rexJson as { triggers: RexTriggers; scenes?: Record<string, string[]> };
const triggers = data.triggers;
const scenes = data.scenes ?? {};

/**
 * Liefert eine REX-Zeile für einen Auslöser; levelgebundene Einträge nur für genau dieses Level.
 * Auslöser ohne Levelbindung (z. B. `locked`, `collection.new`, `classic.unlock`, `win`) gelten überall.
 */
export function rexLine(trigger: string, opts: { level?: number; combo?: number; seed?: number } = {}): string | null {
  const entries = triggers[trigger];
  if (!entries) return null;
  let pool: string[] = [];
  for (const e of entries) {
    if (e.level !== undefined && e.level !== opts.level) continue;
    if (e.min !== undefined && (opts.combo ?? 0) < e.min) continue;
    pool = e.lines; // bei Combos gewinnt der höchste passende Eintrag
  }
  if (pool.length === 0) return null;
  const i = Math.abs(Math.floor((opts.seed ?? Math.random() * 1e9))) % pool.length;
  return pool[i] ?? null;
}

/** Eine REX-Szene (`scenes.<id>` in content/rex/lines.json): die Sätze in Sprechreihenfolge, leer wenn unbekannt. */
export function rexScene(id: string): string[] {
  return [...(scenes[id] ?? [])];
}

/** Level → Mechanik-Einführung (Progressions-Skelett GDD 6.2; Level 1 zeigt nur die Richtung). */
const INTRO_BY_LEVEL: Readonly<Record<number, string>> = {
  1: 'mechanic.swipe',
  2: 'mechanic.moves',
  6: 'mechanic.pillar',
  8: 'mechanic.rewind',
  10: 'celebrate',
  11: 'mechanic.scrap',
  14: 'mechanic.spore',
  16: 'mechanic.amoeba',
  17: 'mechanic.pluck',
  18: 'mechanic.cap',
  19: 'hard.enter',
  20: 'celebrate',
  21: 'mechanic.withered',
  24: 'mechanic.line',
  25: 'finale.zone.tjorizo',
};

/** Auslöser der Einführung eines Levels (oder null). */
export function rexIntroTrigger(levelNo: number): string | null {
  return INTRO_BY_LEVEL[levelNo] ?? null;
}

/** Zeile, die beim Start eines Levels gezeigt wird (Mechanik-Einführungen aus dem Progressions-Skelett). */
export function rexIntroFor(levelNo: number): string | null {
  const t = INTRO_BY_LEVEL[levelNo];
  return t ? rexLine(t, { level: levelNo, seed: levelNo }) : null;
}

/**
 * Zeile nach dem ersten Wisch eines Levels: in Level 1 kommt der erste Nachschub (`mechanic.preview`),
 * sonst null (dann gelten die üblichen Zug-Kommentare).
 */
export function rexAfterFirstMove(levelNo: number): string | null {
  return levelNo === 1 ? rexLine('mechanic.preview', { level: 1, seed: 1 }) : null;
}
