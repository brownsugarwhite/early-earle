/**
 * Tiny grids from 1×N (no 3×3 padding) and the spawn script: order, scripted cells, the
 * random fallback on a taken cell, the opening spawn and rewind.
 */

import { describe, expect, it } from 'vitest';
import { applyMove, createState, forcedSpawnCell, peekScript } from './applyMove';
import { createHistory, record, rewind } from './snapshot';
import { asciiTiers, levelFromAscii, normalizeAscii } from '../testing/ascii';
import { cloneBoard, DIRS, indexOf } from '../model';
import type { MoveEvent, SpawnEvent } from '../events';
import type { LevelDef } from '../schema/level';
import { mulberry32Next } from '../rng';

const spawnsOf = (events: MoveEvent[]): SpawnEvent[] =>
  events.filter((e): e is SpawnEvent => e.type === 'spawn');

describe('tiny boards (no 3×3 padding any more)', () => {
  it('plays a 1×4 strip with its exact geometry', () => {
    const level = levelFromAscii('1 1 . 2');
    expect(level.grid).toEqual({ w: 4, h: 1, mask: ['....'] });
    const s0 = createState(level, 3);
    expect(s0.geo.n).toBe(4);
    expect(applyMove(s0, 'up')).toBeNull();
    expect(applyMove(s0, 'down')).toBeNull();
    const res = applyMove(s0, 'left')!;
    // 1+1 → 2 at the wall, the 2 slides next to it, one spawn fills a free cell
    expect(res.state.tiers[0]).toBe(2);
    expect(res.state.tiers[1]).toBe(2);
    expect(spawnsOf(res.events).length).toBe(1);
    expect(res.state.movesLeft).toBe(29);
  });

  it('plays a 2×2 board (columns and rows of two)', () => {
    const level = levelFromAscii(`1 .
                                  1 2`);
    expect(level.grid).toEqual({ w: 2, h: 2, mask: ['..', '..'] });
    const s0 = createState(level, 1);
    const up = applyMove(s0, 'up')!;
    expect(up.events.some((e) => e.type === 'merge')).toBe(true);
    expect(up.state.tiers[indexOf(2, [0, 0])]).toBe(2);
    expect(up.state.tiers[indexOf(2, [1, 0])]).toBe(2);
    expect(applyMove(s0, 'down')!.state.tiers[indexOf(2, [0, 1])]).toBe(2);
    expect(applyMove(s0, 'right')!.state.tiers[indexOf(2, [1, 0])]).toBe(1);
    // left: both rows already rest against the wall and 1 ≠ 2 → nothing moves, no move is used
    expect(applyMove(s0, 'left')).toBeNull();
    // a full 2×2 without partners is stuck
    const stuck = createState(
      levelFromAscii(`1 2
                                              2 1`),
      1,
    );
    for (const d of DIRS) expect(applyMove(stuck, d)).toBeNull();
  });

  it('asciiTiers prints tiny boards unpadded', () => {
    const s = createState(levelFromAscii('2 . 1'), 1);
    expect(asciiTiers(s)).toBe(normalizeAscii('2 . 1'));
  });
});

describe('spawn script', () => {
  const scripted = (
    script: NonNullable<LevelDef['spawn']['script']>,
    board = '1 1 . . .',
    extra = {},
  ) => levelFromAscii(board, { spawn: { table: [{ tier: 1, weight: 1 }], script }, ...extra });

  it('fills the preview from the script in order without drawing random numbers', () => {
    const level = scripted([{ tier: 3 }, { tier: 2 }, { tier: 1, kind: 'amoeba' }]);
    const s0 = createState(level, 11);
    expect(s0.spawnQueue).toEqual([{ tier: 3, kind: 'normal' }]);
    expect(s0.scriptPos).toBe(1);
    expect(s0.rng).toBe(11); // the scripted refill drew nothing
    const r1 = applyMove(s0, 'left')!;
    expect(spawnsOf(r1.events).map((e) => [e.tier, e.kind])).toEqual([[3, 'normal']]);
    expect(r1.state.spawnQueue).toEqual([{ tier: 2, kind: 'normal' }]);
    expect(r1.state.scriptPos).toBe(2);
    const r2 = applyMove(r1.state, r1.state.tiers[0] === 2 ? 'right' : 'left')!;
    expect(spawnsOf(r2.events)[0]).toMatchObject({ tier: 2, kind: 'normal' });
    expect(r2.state.spawnQueue).toEqual([{ tier: 1, kind: 'amoeba' }]);
    expect(peekScript(r2.state)).toBeNull();
    // once the script is used up the table takes over (the refill draws from the RNG)
    const r3 = applyMove(r2.state, 'left') ?? applyMove(r2.state, 'right')!;
    expect(spawnsOf(r3.events)[0]).toMatchObject({ tier: 1, kind: 'amoeba' });
    expect(r3.state.scriptPos).toBe(3);
    expect(r3.state.spawnQueue).toEqual([{ tier: 1, kind: 'normal' }]);
  });

  it('spawns on the scripted cell when it is free', () => {
    const level = scripted([{ tier: 2, at: [4, 0] }], '1 1 . . .');
    for (const seed of [1, 2, 3, 4, 5]) {
      const s0 = createState(level, seed);
      expect(s0.spawnQueue).toEqual([{ tier: 2, kind: 'normal', at: 4 }]);
      const res = applyMove(s0, 'left')!;
      expect(spawnsOf(res.events)[0]).toMatchObject({ at: [4, 0], tier: 2 });
      // no draw for the cell either: the RNG moved exactly one step (the table refill after the script)
      expect(res.state.rng).toBe(mulberry32Next(s0.rng));
    }
  });

  it('falls back to a random free cell when the scripted cell is taken', () => {
    // after a right swipe the blob rests on [4,0], the scripted cell
    const level = scripted([{ tier: 2, at: [4, 0] }], '1 . 1 . .');
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const res = applyMove(createState(level, seed), 'right')!;
      const sp = spawnsOf(res.events)[0]!;
      expect(sp.at).not.toEqual([4, 0]);
      expect(res.state.tiers[indexOf(5, sp.at)]).toBe(2);
      seen.add(String(sp.at));
    }
    expect(seen.size).toBeGreaterThan(1); // random among the free cells
  });

  it('a scripted cell on an empty board is used by the opening spawn', () => {
    const level = levelFromAscii('. . .\n. . .\n. . .', {
      spawn: { script: [{ tier: 2, at: [1, 1] }, { tier: 1 }] },
    });
    const s0 = createState(level, 5);
    expect(s0.tiers[indexOf(3, [1, 1])]).toBe(2);
    expect(s0.spawnQueue).toEqual([{ tier: 1, kind: 'normal' }]);
    expect(s0.scriptPos).toBe(2);
  });

  it('rewind keeps the script position (replaying gives the same spawns)', () => {
    const level = scripted([{ tier: 2 }, { tier: 3, at: [2, 0] }, { tier: 1 }]);
    const s0 = createState(level, 9);
    let h = createHistory(s0, 5);
    const r1 = applyMove(s0, 'right')!;
    h = record(h, r1.state);
    const r2 = applyMove(r1.state, 'left')!;
    h = record(h, r2.state);
    expect(r2.state.scriptPos).toBe(3);
    h = rewind(h);
    expect(h.current.scriptPos).toBe(2);
    expect(h.current.spawnQueue).toEqual([{ tier: 3, kind: 'normal', at: 2 }]);
    const again = applyMove(h.current, 'left')!;
    expect(Array.from(again.state.tiers)).toEqual(Array.from(r2.state.tiers));
    expect(again.state.scriptPos).toBe(r2.state.scriptPos);
    expect(again.state.rng).toBe(r2.state.rng);
    h = rewind(h);
    expect(h.current).toBe(s0);
    expect(cloneBoard(h.current).scriptPos).toBe(1);
  });

  it('forcedSpawnCell only forces a scripted cell that is among the candidates', () => {
    expect(forcedSpawnCell({ tier: 1, kind: 'normal' }, [0, 1, 2], 3)).toBe(-1);
    expect(forcedSpawnCell({ tier: 1, kind: 'normal', at: 2 }, [0, 1, 2], 3)).toBe(2);
    expect(forcedSpawnCell({ tier: 1, kind: 'normal', at: 2 }, [0, 1, 2], 2)).toBe(-1);
  });
});
