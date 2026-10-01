/**
 * Sonden für Kalibrierung und Nachjustierung.
 *
 * `playTracked` spielt eine Partie exakt wie `playGame` aus `@ee/core` (gleicher Bot, gleiche
 * Zugwahl, gleicher Rückfall) und liefert zusätzlich den Zielfortschritt am Ende (0..1, Mittel über
 * alle Ziele) — die Grundlage für den Near-Miss-Check („Verlust knapp vor dem Ziel“).
 *
 * `probeLevel` spielt ein Level mit verlängertem Zugbudget: Aus den Siegzügen ergibt sich die
 * Gewinnrate für *jedes* kleinere Budget auf einmal (`pAt`). Das Ergebnis ist eine Schätzung
 * (der Bot spielt mit mehr Restzügen etwas weniger dringlich); die echte Kalibrierung prüft nach.
 */

import {
  applyMove,
  createBot,
  createState,
  DIRS,
  hash32,
  simulate,
  type Bot,
  type BotName,
  type Dir,
  type LevelDef,
  type LevelState,
} from '@ee/core';

export interface TrackedRun {
  won: boolean;
  moves: number;
  /** Zielfortschritt am Ende, 0..1 (Mittel über die Ziele, je Ziel gedeckelt bei 1). */
  progress: number;
}

function progressOf(state: LevelState): number {
  const g = state.goalProgress;
  if (g.length === 0) return 1;
  let s = 0;
  for (const p of g) s += p.done ? 1 : p.target > 0 ? Math.min(1, p.progress / p.target) : 0;
  return s / g.length;
}

/** Wie `playGame`, plus Zielfortschritt. */
export function playTracked(level: LevelDef, bot: Bot, seed: number): TrackedRun {
  let state: LevelState = createState(level, seed);
  let moves = 0;
  while (state.status === 'playing') {
    const dir: Dir | null = bot.choose(state);
    let res = dir ? applyMove(state, dir) : null;
    if (!res) {
      for (const d of DIRS) {
        if (d === dir) continue;
        res = applyMove(state, d);
        if (res) break;
      }
      if (!res) break;
    }
    moves++;
    state = res.state;
  }
  return { won: state.status === 'won', moves, progress: progressOf(state) };
}

/** Seeds wie in der Kalibrierung: `hash32(level.id, k)`. */
export function calibrationSeeds(id: string, n: number): number[] {
  return Array.from({ length: n }, (_, i) => hash32(id, i + 1));
}

/** Median der Zielfortschritte verlorener Anfänger-Partien (null ohne Niederlage). */
export function noviceLossProgress(level: LevelDef, n: number): number | null {
  const botSeed = hash32(level.id, 'novice');
  const losses: number[] = [];
  for (const seed of calibrationSeeds(level.id, n)) {
    const bot = createBot('novice', level, hash32(botSeed, seed));
    const r = playTracked(level, bot, seed);
    if (!r.won) losses.push(r.progress);
  }
  if (losses.length === 0) return null;
  losses.sort((a, b) => a - b);
  const m = losses.length >> 1;
  return losses.length % 2 ? losses[m]! : (losses[m - 1]! + losses[m]!) / 2;
}

export interface Probe {
  bot: BotName;
  n: number;
  /** Budget der Sonde. */
  budget: number;
  /** Siegzüge (aufsteigend). */
  winMoves: number[];
}

/** Spielt `level` mit `budget` Zügen (Standard: Züge + 15, höchstens 99). */
export function probeLevel(level: LevelDef, bot: BotName, n: number, budget?: number): Probe {
  const b = Math.min(99, budget ?? level.moves + 15);
  const ext: LevelDef = { ...level, moves: b };
  const r = simulate(ext, bot, calibrationSeeds(level.id, n), { botSeed: hash32(level.id, bot) });
  const winMoves = r.runs
    .filter((g) => g.won)
    .map((g) => g.moves)
    .sort((a, c) => a - c);
  return { bot, n: r.n, budget: b, winMoves };
}

/** Geschätzte Gewinnrate bei `m` Zügen. */
export function pAt(p: Probe, m: number): number {
  let k = 0;
  for (const w of p.winMoves) if (w <= m) k++;
  return p.n > 0 ? k / p.n : 0;
}

/** Mittlere Siegzüge bei Budget `m` (für die Restzug-Quote). */
export function meanWinAt(p: Probe, m: number): number {
  const w = p.winMoves.filter((x) => x <= m);
  return w.length ? w.reduce((s, x) => s + x, 0) / w.length : Number.NaN;
}
