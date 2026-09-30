import { describe, expect, it } from 'vitest';
import { applyMove, createState } from './applyMove';
import { asciiTiers, levelFromAscii, type AsciiOptions } from '../testing/ascii';
import { countBlobs, DIRS, type Dir, type LevelState } from '../model';
import type { MoveEvent } from '../events';
import { classicLevel, type KlassikFormat } from '../schema/klassik';
import type { LevelDef } from '../schema/level';

/** Klassik-Level aus einem ASCII-Brett (Start-Blobs aus dem Brett, Spawn 9:1 überall). */
function classicFromAscii(board: string, opts: AsciiOptions = {}): LevelDef {
  const base = levelFromAscii(board, {
    ...opts,
    spawn: {
      sources: [],
      table: [
        { tier: 1, weight: 9 },
        { tier: 2, weight: 1 },
      ],
      fallback: 'anyEmpty',
    },
  });
  return { ...base, mode: 'classic', goals: [], moves: 99, cap: 12 };
}

const F4: KlassikFormat = {
  id: '4x4',
  name: '4×4',
  grid: { w: 4, h: 4, mask: ['....', '....', '....', '....'] },
  unlockAfterLevel: 5,
};

/** Spielt reihum (oben, unten, links, rechts; wirkungslose übersprungen) bis zum Ende. */
function playOut(
  level: LevelDef,
  seed: number,
  maxMoves = 5000,
): { state: LevelState; events: MoveEvent[]; moves: number } {
  let state = createState(level, seed);
  const events: MoveEvent[] = [];
  let moves = 0;
  let k = 0;
  while (state.status === 'playing' && moves < maxMoves) {
    let res = null;
    for (let tries = 0; tries < 4 && !res; tries++) res = applyMove(state, DIRS[k++ % 4]!);
    if (!res) break;
    events.push(...res.events);
    state = res.state;
    moves++;
  }
  return { state, events, moves };
}

describe('Klassik (freies 2048)', () => {
  it('beginnt mit zwei Start-Blobs der Stufe 1 oder 2, ohne Ziele', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createState(classicLevel(F4), seed);
      expect(countBlobs(s)).toBe(2);
      for (const b of s.cells) if (b) expect([1, 2]).toContain(b.tier);
      expect(s.goalProgress).toEqual([]);
      expect(s.status).toBe('playing');
    }
  });

  it('füllt vorgegebene Start-Blobs nur bis zwei auf', () => {
    expect(countBlobs(createState(classicFromAscii('3 . .\n. . .\n. . .'), 7))).toBe(2);
    expect(countBlobs(createState(classicFromAscii('3 4 .\n. 5 .\n. . .'), 7))).toBe(3);
  });

  it('wird nie gewonnen, zählt keine Züge herunter und endet nur mit „stuck“', () => {
    for (const seed of [11, 12, 13]) {
      const { state, events, moves } = playOut(classicLevel(F4), seed);
      expect(state.status).toBe('lost');
      expect(events.some((e) => e.type === 'won')).toBe(false);
      const lost = events.filter((e) => e.type === 'lost');
      expect(lost).toEqual([{ type: 'lost', phase: 7, reason: 'stuck' }]);
      expect(state.movesLeft).toBe(99);
      expect(state.moveNo).toBe(moves);
      // Weit über das Zuglimit eines Levels hinaus möglich (99 wäre sonst „noMoves“).
      expect(moves).toBeGreaterThan(30);
    }
  });

  it('verliert, wenn nach dem Spawn keine Richtung mehr etwas ändert', () => {
    const level = classicFromAscii(`
      3 4 3
      4 3 4
      5 6 .
    `);
    const res = applyMove(createState(level, 1), 'right');
    expect(res).not.toBeNull();
    expect(res!.state.status).toBe('lost');
    expect(res!.events.at(-1)).toEqual({ type: 'lost', phase: 7, reason: 'stuck' });
    // Dasselbe Brett als normales Level: dort zählt der Zug herunter.
    const story = levelFromAscii('3 4 3\n4 3 4\n5 6 .', {
      goals: [{ type: 'reachTier', tier: 12 }],
    });
    const res2 = applyMove(createState(story, 1), 'right');
    expect(res2!.state.movesLeft).toBe(29);
  });

  it('Punkte = Summe der Merge-Werte (2^Stufe), ohne Siegbonus', () => {
    const { state, events } = playOut(classicLevel(F4), 5);
    const merges = events.filter(
      (e): e is Extract<MoveEvent, { type: 'merge' }> => e.type === 'merge',
    );
    expect(merges.length).toBeGreaterThan(20);
    expect(state.score).toBe(merges.reduce((sum, m) => sum + 2 ** m.tier, 0));
  });

  it('kennt keine Spezialteile, keine Kappe und keine Aufbrüche', () => {
    // Vier Paare in einem Wisch wären im Level ein Knall (burstAt 3) — hier bleibt alles normal.
    const level: LevelDef = {
      ...classicFromAscii('1 1 1 1\n1 1 1 1\n. . . .\n. . . .'),
      specials: { lineAt: 2, burstAt: 3 },
    };
    const res = applyMove(createState(level, 3), 'left');
    expect(res!.mergeCount).toBe(4);
    expect(res!.events.some((e) => e.type === 'promote' || e.type === 'special')).toBe(false);
    expect(res!.state.cells.every((b) => !b || b.kind === 'normal')).toBe(true);

    // Stufe 12 (Kappe) verlässt das Brett nicht, Stufe 13 entsteht.
    const big = classicFromAscii('11 11 11 11\n. . . .\n. . . .\n. . . .');
    const r1 = applyMove(createState(big, 3), 'left')!;
    expect(r1.events.some((e) => e.type === 'release' || e.type === 'tierBomb')).toBe(false);
    expect(asciiTiers(r1.state).split('\n')[0]!.split(' ').slice(0, 2)).toEqual(['12', '12']);
    const r2 = applyMove(r1.state, 'left')!;
    expect(r2.state.maxTier).toBe(13);
    expect(r2.state.cells.some((b) => b?.tier === 13)).toBe(true);
    expect(r2.state.status).toBe('playing');
  });

  it('spielt in jeder Zone mit Gelee (Gas schwebt nicht über Risse)', () => {
    const riss: KlassikFormat = {
      id: 'riss',
      name: 'Riss',
      grid: { w: 4, h: 4, mask: ['....', '.#..', '..#.', '....'] },
      unlockAfterLevel: 0,
    };
    for (const zone of ['tjorizo', 'syrup', 'luzz', 'wooding'] as const) {
      const { state, events } = playOut(classicLevel(riss, zone), 21, 60);
      for (const b of state.cells) if (b) expect(b.material).toBe('jelly');
      for (const e of events) {
        if (e.type === 'slide')
          for (const [x, y] of e.path) expect(riss.grid.mask[y]![x]).toBe('.');
      }
    }
  });

  it('ist je Seed deterministisch', () => {
    const seq: Dir[] = ['left', 'up', 'right', 'down', 'left', 'left', 'up', 'right'];
    const run = (seed: number) => {
      let s = createState(classicLevel(F4), seed);
      for (const d of seq) s = applyMove(s, d)?.state ?? s;
      return { board: asciiTiers(s), score: s.score, rng: s.rng };
    };
    expect(run(4242)).toEqual(run(4242));
    const starts = new Set(
      [1, 2, 3, 4, 5, 6].map((seed) => asciiTiers(createState(classicLevel(F4), seed))),
    );
    expect(starts.size).toBeGreaterThan(1);
  });
});
