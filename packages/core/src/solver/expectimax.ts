/**
 * Expectimax over the four swipes with chance nodes for the spawn
 * (spawn cell × next preview tier). Depth counts action plies.
 *
 * The search runs on preallocated scratch boards and the engine's mutable step
 * functions (`runPreSpawn`, `placeSpawn`, `finalizeMove`), so the solver plays by
 * exactly the same rules as the game. It never touches the game RNG: chance
 * nodes are enumerated (or deterministically sub-sampled) with their probabilities.
 *
 * Spawn scripts (tutorials) make parts of a chance node deterministic: a scripted
 * cell that is free is the only branch, and while the script lasts the next
 * preview is its next entry (no branching over tiers).
 */

import {
  finalizeMove,
  forcedSpawnCell,
  peekScript,
  placeSpawn,
  runPreSpawn,
  spawnCandidates,
  spawnDistribution,
} from '../engine/applyMove';
import { DIRS, copyBoardInto, type Board, type Dir, type SpawnEntry } from '../model';
import type { LevelDef } from '../schema/level';
import { mulberry32 } from '../rng';
import { allocScratch, hashBoard } from './board';
import { DEFAULT_WEIGHTS, evaluate, type Weights } from './heuristic';

export interface SearchConfig {
  /** Action plies to look ahead (1..4). */
  depth: number;
  /** Max spawn cells enumerated per chance node, per ply (0 = all). */
  chanceSamples: readonly number[];
  /** Enumerate all preview-tier outcomes at plies below this one; deeper plies take the most likely tier. */
  fullTierPlies: number;
  useTT: boolean;
}

const TT_BITS = 16;
const TT_SIZE = 1 << TT_BITS;

export class Searcher {
  readonly level: LevelDef;
  readonly weights: Weights;
  readonly cfg: SearchConfig;
  private readonly dist: { entry: SpawnEntry; p: number }[];
  private readonly likely: SpawnEntry;
  private scratchA: Board[] = [];
  private scratchC: Board[] = [];
  private readonly cands: Int16Array[] = [];
  private readonly ttKey = new Uint32Array(TT_SIZE);
  private readonly ttVal = new Float64Array(TT_SIZE);
  private readonly ttDepth = new Uint8Array(TT_SIZE);
  private readonly ttGen = new Uint16Array(TT_SIZE);
  private gen = 1;
  /** Nodes evaluated in the last `bestMove` call (for benchmarks). */
  nodes = 0;

  constructor(level: LevelDef, cfg: SearchConfig, weights: Weights = DEFAULT_WEIGHTS) {
    this.level = level;
    this.cfg = cfg;
    this.weights = weights;
    this.dist = spawnDistribution(level).sort((a, b) => b.p - a.p);
    this.likely = this.dist[0]!.entry;
    for (let i = 0; i <= cfg.depth + 1; i++) this.cands.push(new Int16Array(64));
  }

  private ensureScratch(template: Board): void {
    if (this.scratchA.length === 0) {
      this.scratchA = allocScratch(template, this.cfg.depth + 2);
      this.scratchC = allocScratch(template, this.cfg.depth + 2);
    }
  }

  /** Expected values of every legal direction (NaN for directions that change nothing). */
  evaluateMoves(root: Board): Float64Array {
    this.ensureScratch(root);
    this.gen = (this.gen + 1) & 0xffff || 1;
    this.nodes = 0;
    const out = new Float64Array(4).fill(Number.NaN);
    for (let d = 0; d < 4; d++) {
      const s = this.scratchA[0]!;
      copyBoardInto(s, root);
      if (runPreSpawn(s, d, null) === false) continue;
      out[d] = this.chanceValue(s, this.cfg.depth - 1, 0);
    }
    return out;
  }

  /** Best direction or null when no swipe changes the board. */
  bestMove(root: Board): Dir | null {
    const values = this.evaluateMoves(root);
    let best = Number.NEGATIVE_INFINITY;
    let bestD = -1;
    for (let d = 0; d < 4; d++) {
      const v = values[d]!;
      if (Number.isNaN(v)) continue;
      if (v > best) {
        best = v;
        bestD = d;
      }
    }
    return bestD < 0 ? null : DIRS[bestD]!;
  }

  /** `b` is after phases 1–5; averages over spawn outcomes, then finalises and recurses. */
  private chanceValue(b: Board, depth: number, ply: number): number {
    const buf = this.cands[ply]!;
    const count = spawnCandidates(b, buf);
    const c = this.scratchC[ply]!;
    if (count === 0) {
      copyBoardInto(c, b);
      finalizeMove(c, null);
      return this.nodeValue(c, depth, ply);
    }
    const queued = b.spawnQueue[0] ?? this.likely;
    // A scripted cell that is free is the only outcome (the engine spawns there without a draw).
    const forced = forcedSpawnCell(queued, buf, count);
    const maxCells = this.cfg.chanceSamples[ply] ?? 0;
    const cells = forced >= 0 ? 1 : maxCells > 0 && count > maxCells ? maxCells : count;
    const stride = count / cells;
    // While the spawn script lasts the next preview is known: no chance node over tiers.
    const scripted = peekScript(b);
    const branchTiers =
      !scripted && depth > 0 && ply < this.cfg.fullTierPlies && this.dist.length > 1;
    let total = 0;
    for (let k = 0; k < cells; k++) {
      const cell = forced >= 0 ? forced : buf[Math.min(count - 1, Math.floor((k + 0.5) * stride))]!;
      copyBoardInto(c, b);
      placeSpawn(c, cell, queued, null);
      c.spawnQueue.length = 0;
      finalizeMove(c, null);
      if (scripted) {
        // mirrors refillQueue: the script entry becomes the preview and the script advances
        c.spawnQueue[0] = scripted;
        c.scriptPos++;
        total += this.nodeValue(c, depth, ply);
      } else if (branchTiers) {
        let v = 0;
        for (let t = 0; t < this.dist.length; t++) {
          const o = this.dist[t]!;
          c.spawnQueue[0] = o.entry;
          v += o.p * this.nodeValue(c, depth, ply);
        }
        total += v;
      } else {
        c.spawnQueue[0] = this.likely;
        total += this.nodeValue(c, depth, ply);
      }
    }
    return total / cells;
  }

  /** Max over swipes (or the static evaluation at the horizon / terminal states). */
  private nodeValue(b: Board, depth: number, ply: number): number {
    this.nodes++;
    if (b.status !== 'playing' || depth <= 0) return evaluate(b, this.weights);

    let slot = -1;
    let key = 0;
    if (this.cfg.useTT) {
      key = hashBoard(b);
      slot = key & (TT_SIZE - 1);
      if (
        this.ttGen[slot] === this.gen &&
        this.ttKey[slot] === key &&
        this.ttDepth[slot]! >= depth
      ) {
        return this.ttVal[slot]!;
      }
    }

    let best = Number.NEGATIVE_INFINITY;
    const s = this.scratchA[ply + 1]!;
    for (let d = 0; d < 4; d++) {
      copyBoardInto(s, b);
      if (runPreSpawn(s, d, null) === false) continue;
      const v = this.chanceValue(s, depth - 1, ply + 1);
      if (v > best) best = v;
    }
    if (best === Number.NEGATIVE_INFINITY) best = evaluate(b, this.weights);

    if (slot >= 0) {
      this.ttGen[slot] = this.gen;
      this.ttKey[slot] = key;
      this.ttDepth[slot] = depth;
      this.ttVal[slot] = best;
    }
    return best;
  }
}

// ---- bots -------------------------------------------------------------------------

export type BotName = 'novice' | 'average' | 'strong';
export const BOT_NAMES: readonly BotName[] = ['novice', 'average', 'strong'];

export interface Bot {
  readonly name: BotName;
  /** Picks a direction for the current state; null when no swipe changes the board. */
  choose(state: Board): Dir | null;
  /** Nodes searched by the last `choose`. */
  readonly lastNodes: number;
}

export const BOT_CONFIGS: Readonly<Record<BotName, SearchConfig>> = {
  novice: { depth: 1, chanceSamples: [0], fullTierPlies: 0, useTT: false },
  average: { depth: 2, chanceSamples: [4, 4], fullTierPlies: 1, useTT: false },
  strong: { depth: 3, chanceSamples: [6, 4, 3], fullTierPlies: 1, useTT: true },
};

/** Fraction of novice moves that are random (among legal swipes). */
export const NOVICE_RANDOM = 0.15;

function noisyWeights(seed: number): Weights {
  const w: Weights = { ...DEFAULT_WEIGHTS };
  let s = seed | 0;
  for (const k of Object.keys(w) as (keyof Weights)[]) {
    const [u, next] = mulberry32(s);
    s = next;
    w[k] = w[k] * (0.6 + 0.8 * (u / 4294967296));
  }
  return w;
}

/**
 * Creates a bot for a level. `seed` drives the novice's noise and random moves
 * (the bots never touch the game's RNG).
 */
export function createBot(name: BotName, level: LevelDef, seed = 1): Bot {
  const cfg = BOT_CONFIGS[name];
  const searcher = new Searcher(
    level,
    cfg,
    name === 'novice' ? noisyWeights(seed) : DEFAULT_WEIGHTS,
  );
  let rng = seed | 0;
  let lastNodes = 0;
  const bot: Bot = {
    name,
    get lastNodes() {
      return lastNodes;
    },
    choose(state: Board): Dir | null {
      if (name === 'novice') {
        const [u, next] = mulberry32(rng);
        rng = next;
        if (u / 4294967296 < NOVICE_RANDOM) {
          const values = searcher.evaluateMoves(state);
          lastNodes = searcher.nodes;
          const legal: Dir[] = [];
          for (let d = 0; d < 4; d++) if (!Number.isNaN(values[d]!)) legal.push(DIRS[d]!);
          if (legal.length === 0) return null;
          const [pick, next2] = mulberry32(rng);
          rng = next2;
          return legal[pick % legal.length]!;
        }
      }
      const dir = searcher.bestMove(state);
      lastNodes = searcher.nodes;
      return dir;
    },
  };
  return bot;
}
