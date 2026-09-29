import rexJson from '@content/rex/lines.json';

interface RexEntry {
  level?: number;
  min?: number;
  afterSeconds?: number;
  lines: string[];
}
type RexTriggers = Record<string, RexEntry[]>;

const triggers = (rexJson as { triggers: RexTriggers }).triggers;

/** Liefert eine REX-Zeile für einen Auslöser; levelgebundene Einträge nur für genau dieses Level. */
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

/** Auslöser, die beim Start eines Levels gezeigt werden (Mechanik-Einführungen aus dem Progressions-Skelett). */
export function rexIntroFor(levelNo: number): string | null {
  const byLevel: Record<number, string> = {
    1: 'intro.zone.tjorizo',
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
  const t = byLevel[levelNo];
  return t ? rexLine(t, { level: levelNo, seed: levelNo }) : null;
}
