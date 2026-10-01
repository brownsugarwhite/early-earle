import { CURVE_LAST_LEVEL, ZONE_RANGES, curveSpec } from '@ee/core';
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

/** Level → Mechanik-Einführung (Level 1–24, eingefroren; GDD 6.2; Level 1 zeigt nur die Richtung). */
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
};

/** Letztes Level jeder Kartenzone der Kurve (14, 26, 38, 50, 62 … 184): dort gibt es den großen Beat. */
export const ZONE_END_LEVELS: readonly number[] = ZONE_RANGES.map((r) => r[1]);

/** Ist das Level das Ende einer Kartenzone (großer Beat: Zonenfinale)? */
export function isZoneEnd(levelNo: number): boolean {
  return ZONE_END_LEVELS.includes(levelNo);
}

/** Ist das Level ein Boss der Kurve (ab Level 62 jeweils das Zonenende)? */
export function isBossLevel(levelNo: number): boolean {
  return levelNo >= 1 && levelNo <= CURVE_LAST_LEVEL && curveSpec(levelNo).type === 'boss';
}

/**
 * Auslöser der Einführung eines Levels (oder null). Mechanik-Einführungen gehen vor (Level 14 bleibt die Spore); sonst
 * bekommen Bosse `hard.boss` und die übrigen Zonenenden (26, 38, 50) `finale.zone`.
 */
export function rexIntroTrigger(levelNo: number): string | null {
  const mechanic = INTRO_BY_LEVEL[levelNo];
  if (mechanic) return mechanic;
  if (isBossLevel(levelNo)) return 'hard.boss';
  if (isZoneEnd(levelNo)) return 'finale.zone';
  return null;
}

/** Zeile, die beim Start eines Levels gezeigt wird (Mechanik-Einführungen aus dem Progressions-Skelett). */
export function rexIntroFor(levelNo: number): string | null {
  const t = rexIntroTrigger(levelNo);
  return t ? rexLine(t, { level: levelNo, seed: levelNo }) : null;
}

/**
 * Zeile nach dem ersten Wisch eines Levels: in Level 1 kommt der erste Nachschub (`mechanic.preview`),
 * sonst null (dann gelten die üblichen Zug-Kommentare).
 */
export function rexAfterFirstMove(levelNo: number): string | null {
  return levelNo === 1 ? rexLine('mechanic.preview', { level: 1, seed: 1 }) : null;
}
