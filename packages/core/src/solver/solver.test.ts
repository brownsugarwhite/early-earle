import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createState,
  finalizeMove,
  placeSpawn,
  runPreSpawn,
  spawnCandidates,
} from '../engine/applyMove';
import { cloneBoard, copyBoardInto, DIRS } from '../model';
import { hash32 } from '../rng';
import { levelFromAscii } from '../testing/ascii';
import { Searcher, BOT_CONFIGS, createBot } from './expectimax';
import { evaluate, WIN_VALUE } from './heuristic';
import { simulate } from './simulate';
import { hashBoard } from './board';

const hardLevel = levelFromAscii(
  `3 . . 1
   . 2 . .
   . . 2 .
   1 . . .`,
  {
    id: 'solver-hard',
    goals: [{ type: 'reachTier', tier: 6 }],
    moves: 28,
    spawn: {
      table: [
        { tier: 1, weight: 9 },
        { tier: 2, weight: 1 },
      ],
    },
  },
);

describe('heuristic', () => {
  it('values terminal states above everything and prefers progress', () => {
    const s = createState(hardLevel, 1);
    const won = { ...cloneBoard(s), status: 'won' as const };
    const lost = { ...cloneBoard(s), status: 'lost' as const };
    expect(evaluate(won)).toBeGreaterThanOrEqual(WIN_VALUE);
    expect(evaluate(lost)).toBeLessThan(-WIN_VALUE / 2);
    // same moves left, same level: a merged board (higher tier, more room) evaluates higher
    const opts = { goals: [{ type: 'reachTier', tier: 4 } as const], moves: 20 };
    const before = createState(levelFromAscii('1 1 . .\n. 2 . .\n. . . 1', opts), 1);
    const after = createState(levelFromAscii('2 . . .\n. 2 . .\n. . . 1', opts), 1);
    expect(evaluate(after)).toBeGreaterThan(evaluate(before));
    // progress on the goal counts: a state that already produced a tier-3 blob ranks higher
    expect(evaluate({ ...cloneBoard(after), maxTier: 3 })).toBeGreaterThan(evaluate(after));
  });
});

describe('expectimax', () => {
  it('finds the winning swipe when one exists', () => {
    const level = levelFromAscii(
      `. . . .
       1 . . 1
       2 . . 2
       . . . .`,
      { goals: [{ type: 'reachTier', tier: 3 }] },
    );
    const s = createState(level, 1);
    for (const name of ['novice', 'average', 'strong'] as const) {
      const searcher = new Searcher(level, BOT_CONFIGS[name]);
      const dir = searcher.bestMove(s);
      expect(['left', 'right'], name).toContain(dir);
    }
  });

  it('never picks a swipe that changes nothing', () => {
    const level = levelFromAscii('1 . . .');
    const s = createState(level, 1);
    const searcher = new Searcher(level, BOT_CONFIGS.strong);
    const values = searcher.evaluateMoves(s);
    expect(Number.isNaN(values[2]!)).toBe(true); // left changes nothing
    expect(Number.isNaN(values[3]!)).toBe(false);
  });

  it('bot choices are deterministic for a given seed', () => {
    const a = createBot('novice', hardLevel, 3);
    const b = createBot('novice', hardLevel, 3);
    const s = createState(hardLevel, 9);
    const seqA: string[] = [];
    const seqB: string[] = [];
    let sa = s;
    let sb = s;
    for (let i = 0; i < 10; i++) {
      const da = a.choose(sa)!;
      const db = b.choose(sb)!;
      seqA.push(da);
      seqB.push(db);
      sa = applyMove(sa, da)?.state ?? sa;
      sb = applyMove(sb, db)?.state ?? sb;
    }
    expect(seqA).toEqual(seqB);
  });

  it('hashBoard distinguishes different boards', () => {
    const s = createState(hardLevel, 1);
    const t = applyMove(s, 'left')!.state;
    expect(hashBoard(s)).not.toBe(hashBoard(t));
    expect(hashBoard(s)).toBe(hashBoard(cloneBoard(s)));
  });
});

describe('bots', () => {
  it('strong beats novice on a demanding level', () => {
    const seeds = Array.from({ length: 24 }, (_, i) => hash32('solver-hard', i + 1));
    const strong = simulate(hardLevel, 'strong', seeds);
    const novice = simulate(hardLevel, 'novice', seeds);
    console.log(
      `strong pWin=${strong.pWin.toFixed(2)} (${(strong.elapsedMs / strong.totalMoves).toFixed(2)} ms/move, ${Math.round(strong.totalNodes / strong.totalMoves)} nodes/move) | novice pWin=${novice.pWin.toFixed(2)}`,
    );
    // 64 in 28 moves on 4×4 needs ~78 % of all mass in one blob: hard even for a good player.
    expect(strong.pWin).toBeGreaterThanOrEqual(novice.pWin + 0.1);
    expect(strong.pWin).toBeGreaterThanOrEqual(0.4);
    expect(strong.attemptsEst).toBeLessThan(novice.attemptsEst);
  }, 60_000);
});

describe('throughput (bench)', () => {
  it('runs the mutable step at ≥ 50k moves/s and applyMove at ≥ 50k moves/s', () => {
    const s0 = createState(hardLevel, 1);
    const scratch = cloneBoard(s0);
    const buf = new Int16Array(64);
    let lcg = 1;
    let steps = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 400) {
      copyBoardInto(scratch, s0);
      for (let i = 0; i < 200 && scratch.status === 'playing'; i++) {
        lcg = (lcg * 1103515245 + 12345) & 0x7fffffff;
        if (runPreSpawn(scratch, lcg % 4, null) !== false) {
          const n = spawnCandidates(scratch, buf);
          if (n > 0) placeSpawn(scratch, buf[lcg % n]!, { tier: 1, kind: 'normal' }, null);
          finalizeMove(scratch, null);
        }
        steps++;
      }
    }
    const stepRate = steps / ((performance.now() - t0) / 1000);

    let state = s0;
    let moves = 0;
    const t1 = performance.now();
    while (performance.now() - t1 < 400) {
      lcg = (lcg * 1103515245 + 12345) & 0x7fffffff;
      const res = applyMove(state, DIRS[lcg % 4]!);
      moves++;
      state = res ? res.state : state;
      if (state.status !== 'playing') state = createState(hardLevel, lcg);
    }
    const moveRate = moves / ((performance.now() - t1) / 1000);
    console.log(
      `bench: mutable step ${(stepRate / 1000).toFixed(0)}k/s, applyMove ${(moveRate / 1000).toFixed(0)}k/s`,
    );
    expect(stepRate).toBeGreaterThan(50_000);
    expect(moveRate).toBeGreaterThan(50_000);
  }, 30_000);
});
