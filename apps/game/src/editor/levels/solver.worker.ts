/**
 * Web Worker des Level-Editors: spielt ein Level mit einem Bot über N Seeds (wie tools/levels/calibrate.ts:
 * Seed k = hash32(level.id, k), Bot-Seed = hash32(level.id, bot), Novice mit frischem Rauschen pro Spiel)
 * und meldet nach jedem Spiel den Fortschritt. Abbruch = Worker beenden (der Hauptthread terminiert ihn).
 */

import { LevelSchema, createBot, hash32, mean, playGame, wilson, wilsonHalfWidth, type BotName, type RunResult } from '@ee/core';

export interface SolverRequest {
  type: 'run';
  level: unknown;
  bot: BotName;
  seeds: number;
  /** 0 = nie früh stoppen. */
  stopHalfWidth: number;
  minSeeds: number;
}

export interface SolverRun {
  seed: number;
  attempt: number;
  won: boolean;
  moves: number;
  score: number;
}

export interface SolverSummary {
  bot: BotName;
  n: number;
  wins: number;
  pWin: number;
  wilson: [number, number];
  attemptsEst: number | null;
  meanMoves: number;
  meanMovesWon: number;
  meanScore: number;
  specialFrequency: { line: number; burst: number; fired: number; combo: number };
  elapsedMs: number;
  runs: SolverRun[];
  stoppedEarly: boolean;
}

export type SolverMessage =
  | { type: 'progress'; bot: BotName; n: number; wins: number; total: number; runs: SolverRun[] }
  | { type: 'done'; summary: SolverSummary }
  | { type: 'error'; message: string };

function summarize(bot: BotName, runs: RunResult[], results: SolverRun[], t0: number, stoppedEarly: boolean): SolverSummary {
  const n = runs.length;
  const wins = runs.filter((r) => r.won).length;
  const pWin = n > 0 ? wins / n : 0;
  const totalMoves = runs.reduce((s, r) => s + r.moves, 0);
  const won = runs.filter((r) => r.won);
  const combos = (r: RunResult): number => (r as { combos?: number }).combos ?? 0;
  return {
    bot,
    n,
    wins,
    pWin,
    wilson: wilson(wins, n),
    attemptsEst: pWin > 0 ? 1 / pWin : null,
    meanMoves: mean(runs.map((r) => r.moves)),
    meanMovesWon: mean(won.map((r) => r.moves)),
    meanScore: mean(runs.map((r) => r.score)),
    specialFrequency: {
      line: totalMoves > 0 ? runs.reduce((s, r) => s + r.linePromotes, 0) / totalMoves : 0,
      burst: totalMoves > 0 ? runs.reduce((s, r) => s + r.burstPromotes, 0) / totalMoves : 0,
      fired: totalMoves > 0 ? runs.reduce((s, r) => s + r.specialsFired, 0) / totalMoves : 0,
      combo: totalMoves > 0 ? runs.reduce((s, r) => s + combos(r), 0) / totalMoves : 0,
    },
    elapsedMs: performance.now() - t0,
    runs: results,
    stoppedEarly,
  };
}

const post = (m: SolverMessage) => (self as unknown as Worker).postMessage(m);

self.onmessage = (e: MessageEvent<SolverRequest>) => {
  const req = e.data;
  if (req.type !== 'run') return;
  try {
    const level = LevelSchema.parse(req.level);
    const botSeed = hash32(level.id, req.bot);
    const shared = req.bot === 'novice' ? null : createBot(req.bot, level, botSeed);
    const runs: RunResult[] = [];
    const results: SolverRun[] = [];
    const t0 = performance.now();
    let wins = 0;
    let lastPost = 0;
    let stoppedEarly = false;
    for (let k = 1; k <= req.seeds; k++) {
      const seed = hash32(level.id, k);
      const bot = shared ?? createBot('novice', level, hash32(botSeed, seed));
      const r = playGame(level, bot, seed);
      runs.push(r);
      results.push({ seed, attempt: k, won: r.won, moves: r.moves, score: r.score });
      if (r.won) wins++;
      const now = performance.now();
      if (now - lastPost > 120 || k === req.seeds) {
        lastPost = now;
        post({ type: 'progress', bot: req.bot, n: runs.length, wins, total: req.seeds, runs: results.slice() });
      }
      if (req.stopHalfWidth > 0 && runs.length >= req.minSeeds && wilsonHalfWidth(wins, runs.length) < req.stopHalfWidth) {
        stoppedEarly = runs.length < req.seeds;
        break;
      }
    }
    post({ type: 'done', summary: summarize(req.bot, runs, results, t0, stoppedEarly) });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
