/**
 * The solver on scripted spawns: a free scripted cell is the only chance outcome, and
 * while the script lasts the next preview is known (no chance node over tiers).
 */

import { describe, expect, it } from 'vitest';
import { applyMove, createState } from '../engine/applyMove';
import { cloneBoard, DIRS } from '../model';
import { levelFromAscii } from '../testing/ascii';
import { hashBoard } from './board';
import { BOT_CONFIGS, Searcher, createBot } from './expectimax';
import { evaluate } from './heuristic';
import { simulate } from './simulate';

const opts = { goals: [{ type: 'reachTier' as const, tier: 5 }], moves: 20 };
const board = `2 . .
               . . .
               . . 2`;
const scripted = levelFromAscii(board, {
  ...opts,
  id: 'script-solver',
  spawn: {
    table: [
      { tier: 1, weight: 9 },
      { tier: 2, weight: 1 },
    ],
    script: [{ tier: 2, at: [1, 1] }, { tier: 3, at: [2, 0] }, { tier: 1 }],
  },
});

describe('solver with a spawn script', () => {
  it('a free scripted cell is a single deterministic branch (depth 1 = the engine outcome)', () => {
    const s0 = createState(scripted, 1);
    const searcher = new Searcher(scripted, BOT_CONFIGS.novice);
    const values = searcher.evaluateMoves(s0);
    for (let d = 0; d < 4; d++) {
      const res = applyMove(s0, DIRS[d]!);
      if (!res) {
        expect(Number.isNaN(values[d]!)).toBe(true);
        continue;
      }
      // the engine spawns on [1,1] without a draw and refills the preview from the script:
      // exactly the one board the solver averages over
      expect(res.state.tiers[4]).toBe(2);
      expect(res.state.spawnQueue).toEqual([{ tier: 3, kind: 'normal', at: 2 }]);
      expect(res.state.scriptPos).toBe(2);
      expect(values[d]).toBeCloseTo(evaluate(res.state), 9);
    }
    // one evaluated node per legal direction: no averaging over cells or tiers
    const legal = values.filter((v) => !Number.isNaN(v)).length;
    expect(searcher.nodes).toBe(legal);
  });

  it('is deterministic and cheaper than the same board without a script', () => {
    const plain = levelFromAscii(board, {
      ...opts,
      id: 'script-solver-plain',
      spawn: {
        table: [
          { tier: 1, weight: 9 },
          { tier: 2, weight: 1 },
        ],
      },
    });
    const run = (level: typeof scripted) => {
      const searcher = new Searcher(level, BOT_CONFIGS.strong);
      const s0 = createState(level, 1);
      const a = Array.from(searcher.evaluateMoves(s0));
      const nodes = searcher.nodes;
      const b = Array.from(searcher.evaluateMoves(s0));
      return { a, b, nodes };
    };
    const s = run(scripted);
    expect(s.a).toEqual(s.b);
    const p = run(plain);
    expect(s.nodes).toBeLessThan(p.nodes);
  });

  it('the strong bot plays scripted levels to the end, reproducibly', () => {
    const seeds = [1, 2, 3, 4];
    const a = simulate(scripted, 'strong', seeds);
    const b = simulate(scripted, createBot('strong', scripted, 1), seeds);
    expect(a.runs.map((r) => [r.won, r.moves])).toEqual(b.runs.map((r) => [r.won, r.moves]));
    expect(a.wins).toBeGreaterThan(0);
  });

  it('the hash sees the script position and the scripted preview cell', () => {
    const s0 = createState(scripted, 1);
    const b = cloneBoard(s0);
    const h0 = hashBoard(b);
    b.scriptPos++;
    expect(hashBoard(b)).not.toBe(h0);
    b.scriptPos--;
    expect(hashBoard(b)).toBe(h0);
    b.spawnQueue[0] = { tier: 2, kind: 'normal' }; // same tier, no cell
    expect(hashBoard(b)).not.toBe(h0);
    // levels without a script: position 0 and no cell leave the hash as it was
    const plain = createState(levelFromAscii(board, opts), 1);
    expect(plain.scriptPos).toBe(0);
    expect(hashBoard(plain)).toBe(hashBoard(cloneBoard(plain)));
  });
});
