import { describe, expect, it } from 'vitest';
import { applyMove, createState } from './applyMove';
import { availableDirections, canMove, canRewind, createHistory, record, rewind } from './snapshot';
import { levelFromAscii } from '../testing/ascii';

describe('snapshots / rewind', () => {
  const level = levelFromAscii(
    `1 1 . .
     . . . .
     . . . .
     . . . 2`,
    { spawn: { table: [{ tier: 1, weight: 1 }] } },
  );

  it('rewinds to earlier states without re-rolling the spawn preview', () => {
    const s0 = createState(level, 5);
    let h = createHistory(s0, 3);
    expect(canRewind(h)).toBe(false);
    const r1 = applyMove(s0, 'left')!;
    h = record(h, r1.state);
    const r2 = applyMove(r1.state, 'down')!;
    h = record(h, r2.state);
    expect(canRewind(h)).toBe(true);
    h = rewind(h);
    expect(h.current).toBe(r1.state);
    // replaying the same swipe after a rewind gives the identical result (queue is in the state)
    const again = applyMove(h.current, 'down')!;
    expect(Array.from(again.state.tiers)).toEqual(Array.from(r2.state.tiers));
    expect(again.state.rng).toBe(r2.state.rng);
    h = rewind(h);
    expect(h.current).toBe(s0);
    expect(rewind(h)).toBe(h);
  });

  it('keeps at most `limit` snapshots', () => {
    let s = createState(level, 1);
    let h = createHistory(s, 2);
    for (let i = 0; i < 5; i++) {
      const res = applyMove(s, i % 2 === 0 ? 'left' : 'right');
      if (!res) break;
      s = res.state;
      h = record(h, s);
    }
    expect(h.past.length).toBe(2);
  });

  it('reports available directions and canMove', () => {
    const s0 = createState(level, 1);
    expect(availableDirections(s0).sort()).toEqual(['down', 'left', 'right', 'up'].sort());
    expect(canMove(s0)).toBe(true);
    const stuck = createState(
      levelFromAscii(
        `1 2 3
         4 5 6
         7 8 1`,
      ),
      1,
    );
    expect(availableDirections(stuck)).toEqual([]);
    expect(canMove(stuck)).toBe(false);
    const won = { ...s0, status: 'won' as const };
    expect(canMove(won)).toBe(false);
    expect(availableDirections(won)).toEqual([]);
  });
});
