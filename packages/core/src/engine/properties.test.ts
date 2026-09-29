/**
 * Property tests over random boards with random element subsets:
 *   - blob conservation: before − merges − released − delivered − cleared + spawned = after
 *   - determinism: same level + seed + swipes → identical events and board
 *   - applyMove returns null iff no blob would slide or merge (canSlide)
 *   - blob ids are never reused, cells view matches the typed arrays
 */

import { describe, expect, it } from 'vitest';
import { applyMove, canSlide, createState } from './applyMove';
import { DIR_INDEX, DIRS, countBlobs, type Dir, type LevelState } from '../model';
import { levelFromAscii, type AsciiOptions } from '../testing/ascii';
import { mulberry32 } from '../rng';
import type { LevelDef } from '../schema/level';

class R {
  constructor(public s: number) {}
  next(): number {
    const [u, s] = mulberry32(this.s);
    this.s = s;
    return u / 4294967296;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  pick<T>(xs: readonly T[]): T {
    return xs[this.int(xs.length)]!;
  }
}

type Kind =
  | 'pillar'
  | 'scrap'
  | 'crust'
  | 'sleeper'
  | 'cage'
  | 'fog'
  | 'amoeba'
  | 'oil'
  | 'withered'
  | 'spore'
  | 'current'
  | 'rot'
  | 'toxic'
  | 'stray'
  | 'fence'
  | 'specials';
const KINDS: Kind[] = [
  'pillar',
  'scrap',
  'crust',
  'sleeper',
  'cage',
  'fog',
  'amoeba',
  'oil',
  'withered',
  'spore',
  'current',
  'rot',
  'toxic',
  'stray',
  'fence',
  'specials',
];

/** A random valid level with at most three element kinds (plus optional void cells). */
export function randomLevel(seed: number): LevelDef {
  const r = new R(seed);
  const w = 4 + r.int(3);
  const h = 4 + r.int(3);
  const cap = 4 + r.int(9);
  const kinds = new Set<Kind>();
  const nKinds = r.int(4);
  while (kinds.size < nKinds) kinds.add(r.pick(KINDS));
  const has = (k: Kind) => kinds.has(k);
  const mats = ['', '', 'l', 'g', 'r'];
  const rows: string[] = [];
  const fences: NonNullable<AsciiOptions['fences']> = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      const u = r.next();
      const tier = 1 + r.int(Math.min(4, cap - 1));
      const mat = r.pick(mats);
      let tok = '.';
      if (u < 0.05) tok = '#';
      else if (u < 0.09 && has('pillar')) tok = 'P';
      else if (u < 0.13 && has('scrap')) tok = `X${1 + r.int(3)}`;
      else if (u < 0.16 && has('crust')) tok = `${tier}${mat}F`;
      else if (u < 0.19 && has('sleeper')) tok = `${tier}${mat}S`;
      else if (u < 0.22 && has('cage')) tok = `${tier}C${1 + r.int(2)}`;
      else if (u < 0.25 && has('fog')) tok = r.next() < 0.5 ? 'H' : `${tier}H`;
      else if (u < 0.28 && has('rot')) tok = `R${1 + r.int(3)}`;
      else if (u < 0.31 && has('toxic')) tok = `T${1 + r.int(3)}`;
      else if (u < 0.34 && has('stray')) tok = `${tier}W`;
      else if (u < 0.6) {
        tok = has('amoeba') && r.next() < 0.2 ? 'A' : `${tier}${mat}`;
        if (has('oil') && r.next() < 0.3) tok += '/o';
        else if (has('withered') && r.next() < 0.4) tok += r.next() < 0.5 ? '/w' : '/d';
        else if (has('spore') && r.next() < 0.3) tok += '/s';
        else if (has('current') && r.next() < 0.3) tok += '/' + r.pick(['^', 'v', '<', '>']);
      } else {
        if (has('oil') && r.next() < 0.15) tok = 'o';
        else if (has('withered') && r.next() < 0.2) tok = r.next() < 0.5 ? 'w' : 'd';
        else if (has('spore') && r.next() < 0.15) tok = 's';
        else if (has('current') && r.next() < 0.15) tok = r.pick(['^', 'v', '<', '>']);
      }
      row.push(tok);
    }
    rows.push(row.join(' '));
  }
  // guarantee at least one movable blob
  rows[0] = rows[0]!.replace(/^\S+/, '1');
  if (has('fence')) {
    for (let k = 0; k < 2; k++) {
      const x = r.int(w - 1);
      const y = r.int(h);
      const a = rows[y]!.split(' ')[x]!;
      const b = rows[y]!.split(' ')[x + 1]!;
      if (a !== '#' && b !== '#') fences.push({ a: [x, y], b: [x + 1, y] });
    }
  }
  const goals: AsciiOptions['goals'] = [];
  const goalPick = r.int(4);
  if (goalPick === 0) goals.push({ type: 'reachTier', tier: Math.min(cap, 3 + r.int(4)) });
  else if (goalPick === 1) goals.push({ type: 'score', points: 50 + r.int(400) });
  else if (goalPick === 2) goals.push({ type: 'release', count: 1 + r.int(3) });
  else goals.push({ type: 'deliver', tier: Math.min(cap, 2 + r.int(3)), count: 1 + r.int(2) });
  if (has('scrap') && r.next() < 0.5) goals.push({ type: 'clearScrap' });
  if (has('withered') && r.next() < 0.5) goals.push({ type: 'heal' });
  if (has('spore') && r.next() < 0.5) goals.push({ type: 'collectSpores', count: 1 + r.int(3) });
  if (has('cage') && r.next() < 0.5) goals.push({ type: 'rescue', count: 1 });

  const opts: AsciiOptions = {
    id: `prop-${seed}`,
    cap,
    goals,
    moves: 10 + r.int(30),
    fences,
    spawn: {
      table: has('amoeba')
        ? [
            { tier: 1, weight: 8 },
            { tier: 2, weight: 1 },
            { tier: 1, weight: 1, kind: 'amoeba' },
          ]
        : [
            { tier: 1, weight: 9 },
            { tier: 2, weight: 1 },
          ],
      fallback: 'anyEmpty',
    },
  };
  if (has('specials')) {
    opts.lineAt = 2;
    opts.burstAt = 3;
  }
  try {
    return levelFromAscii(rows.join('\n'), opts);
  } catch {
    // occasional invalid combos (e.g. > 4 kinds because void+fence+...) → fall back to a plain board
    return levelFromAscii(
      rows
        .map((row) =>
          row
            .split(' ')
            .map((t) => (/^\d/.test(t) ? t.replace(/[^0-9]/g, '') : t === '#' ? '#' : '.'))
            .join(' '),
        )
        .join('\n'),
      {
        id: `prop-${seed}`,
        cap,
        goals: [{ type: 'reachTier', tier: Math.min(cap, 4) }],
        moves: 20,
      },
    );
  }
}

function countFromEvents(res: NonNullable<ReturnType<typeof applyMove>>) {
  let merges = 0;
  let released = 0;
  let delivered = 0;
  let cleared = 0;
  let spawned = 0;
  let slides = 0;
  for (const e of res.events) {
    switch (e.type) {
      case 'merge':
        merges++;
        break;
      case 'release':
        released++;
        break;
      case 'deliver':
        delivered++;
        break;
      case 'special':
        cleared += e.removed.length;
        break;
      case 'tierBomb':
        cleared += e.removed.length;
        break;
      case 'spawn':
        spawned++;
        break;
      case 'slide':
        slides++;
        break;
    }
  }
  return { merges, released, delivered, cleared, spawned, slides };
}

function checkCellsView(s: LevelState) {
  for (let i = 0; i < s.geo.n; i++) {
    const c = s.cells[i];
    if (s.tiers[i] === 0) expect(c).toBeNull();
    else {
      expect(c?.tier).toBe(s.tiers[i]);
      expect(c?.id).toBe(s.ids[i]);
    }
  }
}

const SEEDS = Array.from({ length: 120 }, (_, i) => i + 1);

describe('engine properties (random boards)', () => {
  it('conserves blobs, never reuses ids and keeps the cells view in sync', () => {
    for (const seed of SEEDS) {
      const level = randomLevel(seed);
      let state = createState(level, seed * 7919);
      const r = new R(seed);
      let maxId = state.blobSeq;
      checkCellsView(state);
      for (let step = 0; step < 40 && state.status === 'playing'; step++) {
        const dir = r.pick(DIRS);
        const before = countBlobs(state);
        const res = applyMove(state, dir);
        if (!res) continue;
        const c = countFromEvents(res);
        const after = countBlobs(res.state);
        expect(
          before - c.merges - c.released - c.delivered - c.cleared + c.spawned,
          `seed ${seed} step ${step} dir ${dir}\n${JSON.stringify(c)}`,
        ).toBe(after);
        expect(c.slides + c.merges).toBeGreaterThan(0);
        expect(res.state.movesLeft).toBe(state.movesLeft - 1);
        // ids: every new id is larger than all previous ones
        for (const e of res.events) {
          if (e.type === 'merge') expect(e.resultId).toBeGreaterThan(maxId);
          if (e.type === 'spawn') expect(e.id).toBeGreaterThan(maxId);
        }
        expect(res.state.blobSeq).toBeGreaterThanOrEqual(maxId);
        maxId = res.state.blobSeq;
        checkCellsView(res.state);
        state = res.state;
      }
    }
  });

  it('is deterministic per seed', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const level = randomLevel(seed);
      const dirs: Dir[] = [];
      const r = new R(seed + 99);
      for (let i = 0; i < 30; i++) dirs.push(r.pick(DIRS));
      const run = () => {
        let s = createState(level, seed);
        const trace: string[] = [];
        for (const d of dirs) {
          if (s.status !== 'playing') break;
          const res = applyMove(s, d);
          if (!res) continue;
          trace.push(JSON.stringify(res.events));
          s = res.state;
        }
        return {
          trace,
          tiers: Array.from(s.tiers),
          ids: Array.from(s.ids),
          score: s.score,
          rng: s.rng,
        };
      };
      expect(run()).toEqual(run());
    }
  });

  it('returns null exactly when no blob would slide or merge', () => {
    let nulls = 0;
    let moves = 0;
    for (const seed of SEEDS) {
      const level = randomLevel(seed);
      let state = createState(level, seed);
      const r = new R(seed + 7);
      for (let step = 0; step < 25 && state.status === 'playing'; step++) {
        for (const dir of DIRS) {
          const res = applyMove(state, dir);
          expect(res === null, `seed ${seed} step ${step} dir ${dir}`).toBe(
            !canSlide(state, DIR_INDEX[dir]),
          );
          if (res) moves++;
          else nulls++;
        }
        const dir = r.pick(DIRS);
        const res = applyMove(state, dir);
        if (res) state = res.state;
      }
      if (state.status !== 'playing') {
        for (const dir of DIRS) expect(applyMove(state, dir)).toBeNull();
      }
    }
    expect(nulls).toBeGreaterThan(0);
    expect(moves).toBeGreaterThan(0);
  });

  it('never mutates the input state', () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const level = randomLevel(seed);
      const state = createState(level, seed);
      const snapshot = JSON.stringify({
        t: Array.from(state.tiers),
        f: Array.from(state.flags),
        q: state.spawnQueue,
        m: state.movesLeft,
        s: state.score,
      });
      for (const dir of DIRS) applyMove(state, dir);
      expect(
        JSON.stringify({
          t: Array.from(state.tiers),
          f: Array.from(state.flags),
          q: state.spawnQueue,
          m: state.movesLeft,
          s: state.score,
        }),
      ).toBe(snapshot);
    }
  });
});
