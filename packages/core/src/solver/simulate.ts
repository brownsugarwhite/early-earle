/**
 * Plays a level with a bot over many seeds and reports win probability,
 * estimated attempts, mean moves and special-piece frequency.
 *
 * `simulate` supports sequential stopping: once the Wilson 95 % interval of
 * pWin is narrower than ±`stopHalfWidth` (and at least `minSeeds` ran) it stops.
 */

import { applyMove, createState } from '../engine/applyMove';
import { DIRS, type Dir, type LevelState } from '../model';
import type { LevelDef } from '../schema/level';
import { hash32 } from '../rng';
import { createBot, type Bot, type BotName } from './expectimax';
import { mean, wilson, wilsonHalfWidth } from './stats';

export interface RunResult {
  seed: number;
  won: boolean;
  moves: number;
  score: number;
  /** Swipes in which a line / burst blob was created. */
  linePromotes: number;
  burstPromotes: number;
  /** Specials that fired. */
  specialsFired: number;
  /** Combos among them (cross, tripleCross, burst5). */
  combos: number;
  nodes: number;
}

export interface SimResult {
  levelId: string;
  bot: BotName;
  n: number;
  wins: number;
  pWin: number;
  wilson: [lo: number, hi: number];
  /** 1 / pWin (∞ when never won). */
  attemptsEst: number;
  meanMoves: number;
  meanMovesWon: number;
  meanScore: number;
  /** Fraction of swipes that created a line blob / a burst blob. */
  specialFrequency: { line: number; burst: number; fired: number; combo: number };
  totalMoves: number;
  totalNodes: number;
  elapsedMs: number;
  runs: RunResult[];
}

export interface SimOptions {
  /** Stop once the Wilson half-width is below this (0 = never stop early). */
  stopHalfWidth?: number;
  minSeeds?: number;
  /** Stop after the first win (for pure solvability checks). */
  stopAtFirstWin?: boolean;
  /** Bot seed offset (novice noise). */
  botSeed?: number;
}

/** Plays one game to the end. */
export function playGame(level: LevelDef, bot: Bot, seed: number): RunResult {
  let state: LevelState = createState(level, seed);
  let moves = 0;
  let linePromotes = 0;
  let burstPromotes = 0;
  let specialsFired = 0;
  let combos = 0;
  let nodes = 0;
  while (state.status === 'playing') {
    const dir: Dir | null = bot.choose(state);
    nodes += bot.lastNodes;
    let res = dir ? applyMove(state, dir) : null;
    if (!res) {
      // The bot found nothing useful; try every direction before giving up.
      for (const d of DIRS) {
        if (d === dir) continue;
        res = applyMove(state, d);
        if (res) break;
      }
      if (!res) break;
    }
    moves++;
    let line = false;
    let burst = false;
    for (const e of res.events) {
      if (e.type === 'promote') {
        if (e.kind === 'line') line = true;
        else burst = true;
      } else if (e.type === 'special') {
        specialsFired++;
        if (e.kind === 'cross' || e.kind === 'tripleCross' || e.kind === 'burst5') combos++;
      }
    }
    if (line) linePromotes++;
    if (burst) burstPromotes++;
    state = res.state;
  }
  return {
    seed,
    won: state.status === 'won',
    moves,
    score: state.score,
    linePromotes,
    burstPromotes,
    specialsFired,
    combos,
    nodes,
  };
}

export function simulate(
  level: LevelDef,
  bot: BotName | Bot,
  seeds: readonly number[],
  opts: SimOptions = {},
): SimResult {
  const botName: BotName = typeof bot === 'string' ? bot : bot.name;
  const botSeed = opts.botSeed ?? 1;
  // A novice is a different "player" per game (fresh noisy weights); the others are deterministic.
  const shared: Bot | null =
    typeof bot === 'string' ? (bot === 'novice' ? null : createBot(bot, level, botSeed)) : bot;
  const stopHalfWidth = opts.stopHalfWidth ?? 0;
  const minSeeds = opts.minSeeds ?? 20;
  const runs: RunResult[] = [];
  const t0 = performance.now();
  let wins = 0;
  for (const seed of seeds) {
    const b = shared ?? createBot('novice', level, hash32(botSeed, seed));
    const r = playGame(level, b, seed);
    runs.push(r);
    if (r.won) wins++;
    if (opts.stopAtFirstWin && r.won) break;
    if (
      stopHalfWidth > 0 &&
      runs.length >= minSeeds &&
      wilsonHalfWidth(wins, runs.length) < stopHalfWidth
    )
      break;
  }
  const n = runs.length;
  const pWin = n > 0 ? wins / n : 0;
  const totalMoves = runs.reduce((s, r) => s + r.moves, 0);
  const won = runs.filter((r) => r.won);
  return {
    levelId: level.id,
    bot: botName,
    n,
    wins,
    pWin,
    wilson: wilson(wins, n),
    attemptsEst: pWin > 0 ? 1 / pWin : Number.POSITIVE_INFINITY,
    meanMoves: mean(runs.map((r) => r.moves)),
    meanMovesWon: mean(won.map((r) => r.moves)),
    meanScore: mean(runs.map((r) => r.score)),
    specialFrequency: {
      line: totalMoves > 0 ? runs.reduce((s, r) => s + r.linePromotes, 0) / totalMoves : 0,
      burst: totalMoves > 0 ? runs.reduce((s, r) => s + r.burstPromotes, 0) / totalMoves : 0,
      fired: totalMoves > 0 ? runs.reduce((s, r) => s + r.specialsFired, 0) / totalMoves : 0,
      combo: totalMoves > 0 ? runs.reduce((s, r) => s + r.combos, 0) / totalMoves : 0,
    },
    totalMoves,
    totalNodes: runs.reduce((s, r) => s + r.nodes, 0),
    elapsedMs: performance.now() - t0,
    runs,
  };
}
