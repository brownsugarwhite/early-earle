import { describe, expect, it } from 'vitest';
import { applyMove, createState, blobAtCoord } from './applyMove';
import {
  applySpecialTokens,
  asciiTiers,
  expectedAscii,
  levelFromAscii,
  type AsciiOptions,
} from '../testing/ascii';
import { cloneBoard, indexOf, type Dir, type LevelState } from '../model';
import type { MoveEvent, MoveResult } from '../events';

/** Board after the move with the spawned blob(s) removed, for deterministic expectations. */
function boardWithoutSpawn(res: MoveResult<LevelState>): string {
  const b = cloneBoard(res.state);
  for (const e of res.events) {
    if (e.type === 'spawn') {
      const i = indexOf(b.geo.w, e.at);
      b.tiers[i] = 0;
      b.flags[i] = 0;
      b.ids[i] = 0;
    }
  }
  return asciiTiers(b);
}

function play(
  board: string,
  dir: Dir,
  opts: AsciiOptions = {},
  seed = 1,
): MoveResult<LevelState> | null {
  const level = levelFromAscii(board, opts);
  const s0 = createState(level, seed);
  applySpecialTokens(s0);
  return applyMove(s0, dir);
}

function expectMove(
  board: string,
  dir: Dir,
  expected: string,
  opts: AsciiOptions = {},
): MoveResult<LevelState> {
  const res = play(board, dir, opts);
  expect(res, 'move should change the board').not.toBeNull();
  expect(boardWithoutSpawn(res!)).toBe(expectedAscii(expected));
  return res!;
}

function types(events: MoveEvent[]): string[] {
  return events.map((e) => e.type);
}

describe('slide + merge (phase 1)', () => {
  it('slides a blob to the wall and emits a slide event with its path', () => {
    const res = expectMove('1 . . .', 'right', '. . . 1');
    const slide = res.events.find((e) => e.type === 'slide');
    expect(slide).toMatchObject({
      phase: 1,
      from: [0, 0],
      to: [3, 0],
      path: [
        [1, 0],
        [2, 0],
        [3, 0],
      ],
    });
  });

  it('merges equal tiers into the settled blob and hands out a fresh id', () => {
    const level = levelFromAscii('1 1 . .');
    const s0 = createState(level, 1);
    const res = applyMove(s0, 'left')!;
    expect(boardWithoutSpawn(res)).toBe(expectedAscii('2 . . .'));
    const merge = res.events.find((e) => e.type === 'merge');
    expect(merge).toMatchObject({ phase: 1, ids: [1, 2], at: [0, 0], tier: 2, resultId: 3 });
    expect(res.mergeCount).toBe(1);
    // 2^2 for the merge; spawn does not score
    expect(res.state.score).toBe(4);
  });

  it('merges each blob at most once per move (classic 2048 rows)', () => {
    expectMove('1 1 1 1', 'left', '2 2 . .');
    expectMove('1 1 1 .', 'left', '2 1 . .');
    expectMove('1 1 1 .', 'right', '. . 1 2');
    expectMove('2 1 1 .', 'left', '2 2 . .');
  });

  it('returns null when nothing changes and does not consume a move', () => {
    const level = levelFromAscii('1 . . .');
    const s0 = createState(level, 1);
    expect(applyMove(s0, 'left')).toBeNull();
    expect(s0.movesLeft).toBe(30);
  });

  it('never mutates the input state', () => {
    const level = levelFromAscii('1 1 . .');
    const s0 = createState(level, 1);
    const before = asciiTiers(s0);
    applyMove(s0, 'left');
    expect(asciiTiers(s0)).toBe(before);
    expect(s0.movesLeft).toBe(30);
  });

  it('slides all rows/columns and orders processing from the wall side', () => {
    expectMove(
      `1 . 1 .
       . 2 . 2
       3 3 3 3
       . . . 1`,
      'right',
      `. . . 2
       . . . 3
       . . 4 4
       . . . 1`,
    );
    expectMove(
      `1 .
       1 .
       2 .
       . 2`,
      'up',
      `2 2
       2 .
       . .
       . .`,
    );
  });
});

describe('layout elements', () => {
  it('pillar blocks sliding and creates a new merge spot', () => {
    expectMove('1 . P 1', 'right', '. 1 P 1');
    expectMove('1 1 P 1', 'left', '2 . P 1');
  });

  it('void cells are not entered by jelly', () => {
    expectMove('1 # 1 .', 'right', '1 # . 1');
    expect(play('1 # . .', 'right')).toBeNull();
  });

  it('fence stops blobs but costs no cell', () => {
    const fences = [{ a: [1, 0] as [number, number], b: [2, 0] as [number, number] }];
    expectMove('1 1 1 .', 'right', '. 2 . 1', { fences });
    expectMove('. 1 1 1', 'left', '1 . 2 .', { fences });
  });

  it('oil stops a jelly blob on the puddle; liquid glides through', () => {
    expectMove('1 . o .', 'right', '. . 1 .');
    expectMove('1l . o .', 'right', '. . . 1l');
  });

  it('gas floats over void and fences but cannot stop on void', () => {
    expectMove('1g # . .', 'right', '. # . 1g');
    expect(play('. . 1g #', 'right')).toBeNull();
    const fences = [{ a: [0, 0] as [number, number], b: [1, 0] as [number, number] }];
    expectMove('1g . . .', 'right', '. . . 1g', { fences });
  });

  it('gas jelly mix: jelly blocked by fence returns null', () => {
    const fences = [{ a: [0, 0] as [number, number], b: [1, 0] as [number, number] }];
    expect(play('1 . . .', 'right', { fences })).toBeNull();
  });

  it('portal teleports A → B and continues; exit blocked → stop before entering', () => {
    const res = expectMove('1 . @a . @a .', 'right', '. . . . . 1');
    const slide = res.events.find((e) => e.type === 'slide');
    expect(slide).toMatchObject({
      to: [5, 0],
      path: [
        [1, 0],
        [2, 0],
        [4, 0],
        [5, 0],
      ],
    });
    expectMove('1 . @a . 3F/@a .', 'right', '. 1 . . 3F .');
  });
});

describe('locked blobs act as pillars', () => {
  it('frozen, sleeping and caged blobs neither move nor merge', () => {
    expect(play('1 1F . .', 'right')).toBeNull();
    expect(play('. 1F 1 .', 'left')).toBeNull();
    expect(play('1 1S . .', 'right')).toBeNull();
    expect(play('1 1C . .', 'right')).toBeNull();
    expectMove('1 . 1F 1', 'right', '. 1 1F 1');
  });

  it('a hidden (fog) blob is a wall until revealed', () => {
    expect(play('1 1H . .', 'right')).toBeNull();
    expect(play('1 H . .', 'right')).toBeNull();
  });
});

describe('amoeba', () => {
  it('merges with any tier: amoeba + N → N+1, amoeba + amoeba → 2', () => {
    expectMove('A 3 . .', 'left', '4 . . .');
    expectMove('3 A . .', 'left', '4 . . .');
    expectMove('A A . .', 'left', '2 . . .');
  });
});

describe('side effects at the landing cell and its neighbours (phase 2)', () => {
  it('scrap next to a merge landing loses a layer; clearScrap goal tracks it', () => {
    const res = expectMove('. 1 1 X2', 'right', '. . 2 X1', { goals: [{ type: 'clearScrap' }] });
    expect(res.events).toContainEqual({
      type: 'blockerHit',
      phase: 2,
      at: [3, 0],
      kind: 'scrap',
      layersLeft: 1,
    });
    expect(res.state.goalProgress[0]).toMatchObject({ progress: 1, target: 2, done: false });
    // a slide next to scrap does nothing
    expect(play('1 . . X2', 'right')!.state.scrap[3]).toBe(2);
  });

  it('a 2×2 scrap mound takes one hit per adjacent landing', () => {
    const res = expectMove(
      `1 1 M4 m
       . . m  m`,
      'right',
      `. 2 M3 M3
       . . M3 M3`,
    );
    expect(res.events).toContainEqual({
      type: 'blockerHit',
      phase: 2,
      at: [2, 0],
      kind: 'scrapMound',
      layersLeft: 3,
    });
  });

  it('merge landing on withered heals, on deep withered lifts one step, on spore collects', () => {
    const r1 = expectMove('1 1/w . .', 'right', '. . . 2', {}); // landing at [3,0] – not withered
    expect(types(r1.events)).not.toContain('heal');
    const r2 = expectMove('. . 1 1/w', 'right', '. . . 2', { goals: [{ type: 'heal' }] });
    expect(r2.events).toContainEqual({
      type: 'heal',
      phase: 2,
      at: [3, 0],
      from: 'withered',
      to: 'healed',
    });
    expect(r2.state.status).toBe('won');
    const r3 = expectMove('. . 1 1/d', 'right', '. . . 2', { goals: [{ type: 'heal' }] });
    expect(r3.events).toContainEqual({
      type: 'heal',
      phase: 2,
      at: [3, 0],
      from: 'deepWithered',
      to: 'withered',
    });
    expect(r3.state.status).toBe('playing');
    const r4 = expectMove('. . 1 1/s', 'right', '. . . 2', {
      goals: [{ type: 'collectSpores', count: 1 }],
    });
    expect(r4.events).toContainEqual({ type: 'collect', phase: 2, at: [3, 0], total: 1 });
    expect(r4.state.status).toBe('won');
  });

  it('thaws crust, wakes sleepers, opens cages (rescue) and lifts fog next to a landing', () => {
    const thaw = expectMove('. 1 1 2F', 'right', '. . 2 2');
    expect(thaw.events).toContainEqual({ type: 'thaw', phase: 2, at: [3, 0], id: 3 });
    const wake = expectMove('. 1 1 2S', 'right', '. . 2 2');
    expect(types(wake.events)).toContain('wake');
    const cage = expectMove('. 1 1 2C', 'right', '. . 2 2', {
      goals: [{ type: 'rescue', count: 1 }],
    });
    expect(cage.events).toContainEqual({
      type: 'cageOpen',
      phase: 2,
      at: [3, 0],
      id: 3,
      layersLeft: 0,
    });
    expect(cage.state.status).toBe('won');
    const cage2 = expectMove('. 1 1 2C2', 'right', '. . 2 2C');
    expect(cage2.events).toContainEqual({
      type: 'cageOpen',
      phase: 2,
      at: [3, 0],
      id: 3,
      layersLeft: 1,
    });
    const fog = expectMove('. 1 1 3H', 'right', '. . 2 3');
    expect(fog.events).toContainEqual({ type: 'reveal', phase: 2, at: [3, 0], id: 3 });
    const fogEmpty = expectMove('. 1 1 H', 'right', '. . 2 .');
    expect(fogEmpty.events).toContainEqual({ type: 'reveal', phase: 2, at: [3, 0] });
  });

  it('fire merges burn adjacent crust and rot', () => {
    const res = expectMove('. 1r 1r 2F', 'right', '. . 2r 2');
    expect(res.events).toContainEqual({ type: 'burn', phase: 2, at: [3, 0], what: 'crust' });
    const rot = expectMove(
      `. 1r 1r
       . . R1`,
      'right',
      `. . 2r
       . . .`,
    );
    expect(rot.events).toContainEqual({ type: 'burn', phase: 2, at: [2, 1], what: 'rot' });
  });
});

describe('specials (phase 3)', () => {
  it('promotes the last merge result to a line blob at lineAt merges (axis = swipe axis)', () => {
    const res = expectMove('1 1 2 2', 'left', '2 3L . .', { lineAt: 2 });
    expect(res.events).toContainEqual({
      type: 'promote',
      phase: 3,
      id: 6,
      at: [1, 0],
      kind: 'line',
      axis: 'h',
    });
    const vert = expectMove(
      `1 2
       1 2`,
      'up',
      `2 3V
       . .`,
      { lineAt: 2 },
    );
    expect(vert.events.find((e) => e.type === 'promote')).toMatchObject({ axis: 'v' });
  });

  it('promotes to burst at burstAt merges (takes precedence over line)', () => {
    const res = expectMove('1 1 2 2 3 3', 'left', '2 3 4B . . .', { lineAt: 2, burstAt: 3 });
    expect(res.events.find((e) => e.type === 'promote')).toMatchObject({
      kind: 'burst',
      at: [2, 0],
    });
  });

  it('a line blob fires when it merges: clears its row/column (blockers lose a layer)', () => {
    const res = expectMove(
      `1 2L 2 X1
       5 6  7 8`,
      'left',
      `. 3 . .
       5 6 7 8`,
      { lineAt: 16 },
    );
    const sp = res.events.find((e) => e.type === 'special');
    expect(sp).toMatchObject({ phase: 3, kind: 'line', at: [1, 0] });
    expect(res.events).toContainEqual({
      type: 'blockerHit',
      phase: 3,
      at: [3, 0],
      kind: 'scrap',
      layersLeft: 0,
    });
    // the blob in the row was removed
    expect(sp && sp.type === 'special' ? sp.removed.map((r) => r.at) : []).toEqual([[0, 0]]);
  });

  it('a vertical line blob clears its column; burst clears 3×3; line+line = cross', () => {
    const col = expectMove(
      `1 . .
       2V 2 .
       3 . .`,
      'right',
      `. . .
       . . 3
       . . .`,
    );
    expect(col.events.find((e) => e.type === 'special')).toMatchObject({
      kind: 'line',
      at: [2, 1],
    });
    // the 1 and the 3 slid into column 2 before the blast and were cleared by it
    expect(col.state.tiers[indexOf(3, [2, 0])]).toBe(0);

    const burst = expectMove(
      `5 6 7 8
       4 3B 3 8
       5 6 7 8`,
      'left',
      `. . . 8
       . 4 . .
       . . . 8`,
    );
    expect(burst.events.find((e) => e.type === 'special')).toMatchObject({
      kind: 'burst',
      at: [1, 1],
    });
    expect(blobAtCoord(burst.state, [1, 1])).toMatchObject({ tier: 4, kind: 'normal' });

    const cross = expectMove(
      `5 6 7
       2L 2L 8
       5 6 7`,
      'left',
      `. 6 7
       3 . .
       . 6 7`,
    );
    expect(cross.events.find((e) => e.type === 'special')).toMatchObject({
      kind: 'cross',
      at: [0, 1],
    });
  });
});

describe('dynamics (phase 4)', () => {
  it('a current pushes a blob one cell downstream without merging', () => {
    const res = expectMove(
      `1 . . .
       . . . .
       . . . 1`,
      'right',
      `. . . .
       . . . 1
       . . . 1`,
      { floors: [{ kind: 'current', at: [3, 0], dir: 'down' }] },
    );
    expect(res.events).toContainEqual({ type: 'push', phase: 4, id: 1, from: [3, 0], to: [3, 1] });
  });

  it('a stray does not slide; it steps one cell in the swipe direction and calms when boxed in', () => {
    const res = expectMove('1W . 2 .', 'right', '. 1W . 2');
    expect(res.events).toContainEqual({
      type: 'strayMove',
      phase: 4,
      id: 2,
      from: [0, 0],
      to: [1, 0],
    });
    const calm = expectMove(
      `1W P .
       P  1 .`,
      'right',
      `1 P .
       P . 1`,
    );
    expect(types(calm.events)).toContain('strayCalm');
  });

  it('rot grows every period into a free neighbour unless a merge touched it', () => {
    const grow = expectMove(
      `R1 . .
       .  . 1`,
      'left',
      `R1 R1 .
       1  . .`,
    );
    expect(grow.events).toContainEqual({ type: 'rotGrow', phase: 4, at: [1, 0], from: [0, 0] });
    const touched = expectMove(
      `R1 1 1
       .  . .`,
      'left',
      `R1 2 .
       .  . .`,
    );
    expect(types(touched.events)).not.toContain('rotGrow');
    const period = play(
      `R2 . .
       .  . 1`,
      'left',
    )!;
    expect(types(period.events)).not.toContain('rotGrow');
  });

  it('toxic counts down and then freezes the blob on or next to it', () => {
    const res = expectMove('1 . . T1', 'right', '. . . 1F');
    expect(res.events).toContainEqual({ type: 'toxicTick', phase: 4, at: [3, 0], countdown: 0 });
    expect(res.events).toContainEqual({ type: 'freeze', phase: 4, at: [3, 0], id: 1 });
    const tick = play('1 . . T2', 'right')!;
    expect(types(tick.events)).not.toContain('freeze');
    expect(tick.state.toxic[3]).toBe(1);
  });
});

describe('graduation (phase 5)', () => {
  it('a blob reaching the cap is released and counts for release goals', () => {
    const res = expectMove('2 2 . .', 'left', '. . . .', {
      cap: 3,
      goals: [{ type: 'release', count: 1 }],
    });
    expect(res.events).toContainEqual({ type: 'release', phase: 5, id: 3, at: [0, 0], tier: 3 });
    expect(res.state.released).toBe(1);
    expect(res.state.status).toBe('won');
  });

  it('two releases in one move trigger a tier bomb on the most numerous tier', () => {
    const res = expectMove(
      `3 3 1 .
       3 3 1 .
       1 . 2 .`,
      'left',
      `. . . .
       . . . .
       . 2 . .`,
      {
        cap: 4,
        goals: [{ type: 'release', count: 5 }],
        spawn: { table: [{ tier: 2, weight: 1 }] },
      },
    );
    const bomb = res.events.find((e) => e.type === 'tierBomb');
    expect(bomb).toMatchObject({ phase: 5, tier: 1 });
    expect(bomb && bomb.type === 'tierBomb' ? bomb.removed.length : 0).toBe(3);
  });

  it('deliver goals take the ordered tier off the board', () => {
    const res = expectMove('1 1 . .', 'left', '. . . .', {
      goals: [{ type: 'deliver', tier: 2, count: 1 }],
    });
    expect(res.events).toContainEqual({ type: 'deliver', phase: 5, id: 3, at: [0, 0], tier: 2 });
    expect(res.state.status).toBe('won');
  });
});

describe('spawn (phase 6)', () => {
  it('spawns next to a source, uses the preview queue and refills it', () => {
    const level = levelFromAscii(
      `1 . . .
       . . . .
       . . . .
       . . . 1`,
      { spawn: { sources: [[0, 3]], fallback: 'none', table: [{ tier: 2, weight: 1 }] } },
    );
    const s0 = createState(level, 7);
    expect(s0.spawnQueue).toEqual([{ tier: 2, kind: 'normal' }]);
    const res = applyMove(s0, 'up')!;
    const spawn = res.events.find((e) => e.type === 'spawn');
    expect(spawn).toMatchObject({ phase: 6, tier: 2 });
    const at = spawn && spawn.type === 'spawn' ? spawn.at : [-1, -1];
    expect([
      [1, 3],
      [0, 2],
    ]).toContainEqual(at);
    expect(res.state.spawnQueue).toEqual([{ tier: 2, kind: 'normal' }]);
  });

  it('with fallback none there is no spawn when the source is boxed in', () => {
    const level = levelFromAscii(
      `1 2 . .
       3 . . .
       . . 5 .`,
      { spawn: { sources: [[0, 0]], fallback: 'none' } },
    );
    const res = applyMove(createState(level, 1), 'left')!;
    expect(types(res.events)).not.toContain('spawn');
    expect(res.state.spawnQueue.length).toBe(1);
  });

  it('spawns anywhere with fallback anyEmpty and empty sources', () => {
    const res = play('1 1 . .', 'left')!;
    expect(types(res.events)).toContain('spawn');
  });
});

describe('goals, moves and terminal states (phase 7)', () => {
  it('wins when all goals are met (reachTier counts merges, not start blobs)', () => {
    const level = levelFromAscii('3 3 . .', { goals: [{ type: 'reachTier', tier: 4 }], cap: 5 });
    const s0 = createState(level, 1);
    expect(s0.goalProgress[0]).toMatchObject({ progress: 0, target: 4, done: false });
    const res = applyMove(s0, 'left')!;
    expect(res.state.status).toBe('won');
    expect(types(res.events)).toContain('won');
    expect(res.events).toContainEqual({
      type: 'goalProgress',
      phase: 7,
      index: 0,
      progress: 4,
      target: 4,
      done: true,
    });
  });

  it('loses when the last move is used up', () => {
    const res = play('1 . . .', 'right', { moves: 1 })!;
    expect(res.state.status).toBe('lost');
    expect(res.events).toContainEqual({ type: 'lost', phase: 7, reason: 'noMoves' });
    expect(applyMove(res.state, 'left')).toBeNull();
  });

  it('loses when no direction changes the board any more', () => {
    const res = play(
      `1 2 3
       4 5 6
       7 8 .`,
      'right',
    )!;
    expect(res.state.status).toBe('lost');
    expect(res.events).toContainEqual({ type: 'lost', phase: 7, reason: 'stuck' });
  });

  it('score goal and win bonus (5 × movesLeft)', () => {
    const res = play('2 2 . .', 'left', { goals: [{ type: 'score', points: 8 }], moves: 10 })!;
    // merge 2^3 = 8 → goal met → +5 × 9 moves left
    expect(res.state.score).toBe(8 + 45);
    expect(res.state.status).toBe('won');
  });
});

describe('Luzz / Wooding rules', () => {
  it('a fire merge landing on oil burns the puddle and fires a burst blast', () => {
    const res = expectMove(
      `1r/o 1r . .
       5    . . .`,
      'left',
      `2r . . .
       .  . . .`,
      { zone: 'wooding' },
    );
    expect(res.events).toContainEqual({ type: 'burn', phase: 2, at: [0, 0], what: 'oil' });
    const sp = res.events.find((e) => e.type === 'special');
    expect(sp).toMatchObject({ phase: 3, kind: 'burst', at: [0, 0] });
    expect(sp && sp.type === 'special' ? sp.removed.map((r) => r.at) : []).toEqual([[0, 1]]);
    expect(res.state.floor[0]).toBe(0);
    // a jelly merge on oil does nothing of the sort
    const jelly = play('1j/o 1j . .', 'left')!;
    expect(types(jelly.events)).not.toContain('burn');
    expect(jelly.state.floor[0]).toBe(1);
  });

  it('blasts burn rot away and count for the clearRot goal', () => {
    const res = expectMove('1 2L 2 R2', 'left', '. 3 . .', { goals: [{ type: 'clearRot' }] });
    expect(res.events).toContainEqual({ type: 'burn', phase: 3, at: [3, 0], what: 'rot' });
    expect(res.state.rot[3]).toBe(0);
    expect(res.state.rotCleared).toBe(1);
    expect(res.state.status).toBe('won');
    // an ordinary merge next to rot only stops it growing
    const touched = play('R1 1 1 .', 'left', { goals: [{ type: 'clearRot' }] })!;
    expect(touched.state.rot[0]).toBe(1);
    expect(touched.state.goalProgress[0]).toMatchObject({ progress: 0, target: 1, done: false });
  });

  it('fire merges burn adjacent rot and count for clearRot', () => {
    const res = play(
      `. 1r 1r
       . . R1`,
      'right',
      { goals: [{ type: 'clearRot' }] },
    )!;
    expect(res.state.rotCleared).toBe(1);
    expect(res.state.status).toBe('won');
  });

  it('calming a boxed-in stray completes a calmStrays goal', () => {
    const res = expectMove(
      `1W P .
       P  1 .`,
      'right',
      `1 P .
       P . 1`,
      { goals: [{ type: 'calmStrays', count: 1 }] },
    );
    expect(res.state.calmed).toBe(1);
    expect(res.state.status).toBe('won');
  });
});
