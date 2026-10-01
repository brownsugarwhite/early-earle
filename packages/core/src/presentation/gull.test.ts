import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMove, createState } from '../engine/applyMove';
import { availableDirections, createHistory, record, rewind } from '../engine/snapshot';
import type { MoveResult, SpawnEvent } from '../events';
import { materializeCells, type LevelState } from '../model';
import { hash32, mulberry32 } from '../rng';
import { LevelSchema, type LevelDef } from '../schema/level';
import { LAST_LEVEL } from '../generator/index';
import {
  GULL_FIRST_LEVEL,
  GULL_WINDOW,
  getGullMode,
  gullDropFor,
  gullLaneValue,
  gullTiers,
  gullTimes,
  gullWindowMove,
  isGullMove,
  parseGullMode,
  setGullMode,
  type GullDrop,
} from './gull';

const levelsDir = fileURLToPath(new URL('../../../../content/levels/', import.meta.url));

function levels(): LevelDef[] {
  return readdirSync(levelsDir)
    .filter((f) => /^\d{3}\.json$/.test(f))
    .sort()
    .map((f) => LevelSchema.parse(JSON.parse(readFileSync(`${levelsDir}${f}`, 'utf8'))));
}

const ALL = levels();

/** Zufallsspiel mit festem Bot-Seed: gültige Richtungen, bis das Level endet oder `max` Züge gespielt sind. */
function play(level: LevelDef, seed: number, botSeed: number, max = 40): MoveResult<LevelState>[] {
  let state = createState(level, seed);
  let rng = botSeed | 0;
  const out: MoveResult<LevelState>[] = [];
  for (let k = 0; k < max && state.status === 'playing'; k++) {
    const dirs = availableDirections(state);
    if (dirs.length === 0) break;
    const [u, next] = mulberry32(rng);
    rng = next;
    const res = applyMove(state, dirs[u % dirs.length]!);
    if (!res) break;
    out.push(res);
    state = res.state;
  }
  return out;
}

const spawnOf = (res: MoveResult<LevelState>): SpawnEvent | undefined => res.events.find((e): e is SpawnEvent => e.type === 'spawn');

/** Vergleichbarer Abdruck eines Spielstands (alles, was die Regeln bestimmen). */
function fingerprint(s: LevelState): string {
  return JSON.stringify({
    tiers: [...s.tiers],
    flags: [...s.flags],
    ids: [...s.ids],
    rng: s.rng,
    score: s.score,
    moveNo: s.moveNo,
    movesLeft: s.movesLeft,
    status: s.status,
    queue: s.spawnQueue,
    cells: materializeCells(s),
  });
}

afterEach(() => setGullMode('auto'));

describe('Möwe: Regel', () => {
  it('liest die zwei niedrigsten Stufen der Spawn-Tabelle (alle Level: Stufe 1 und 2)', () => {
    expect(ALL.length).toBe(LAST_LEVEL);
    for (const level of ALL) expect(gullTiers(level), level.id).toEqual([1, 2]);
    expect(gullTiers({ spawn: { table: [{ tier: 3, weight: 1 }, { tier: 1, weight: 1 }, { tier: 3, weight: 2 }, { tier: 2, weight: 1 }] } } as LevelDef)).toEqual([1, 2]);
  });

  it('kommt in jedem Viererfenster auf Zug 1 oder 2 des Fensters: Abstände 3–5, erste Möwe auf Zug 1 oder 2', () => {
    for (const level of ALL) {
      for (const seed of [hash32(level.id, 1), hash32(level.id, 2)]) {
        for (let w = 0; w < 30; w++) {
          const m = gullWindowMove(level.id, seed, w);
          expect(m === GULL_WINDOW * w + 1 || m === GULL_WINDOW * w + 2).toBe(true);
          const next = gullWindowMove(level.id, seed, w + 1);
          expect(next - m).toBeGreaterThanOrEqual(3);
          expect(next - m).toBeLessThanOrEqual(5);
        }
      }
    }
    // Der Münzwurf ist gemischt: beide Seiten kommen vor, nicht streng abwechselnd.
    const offs = Array.from({ length: 64 }, (_, w) => gullWindowMove('tjorizo-005', 1234, w) - GULL_WINDOW * w);
    expect(offs.filter((o) => o === 1).length).toBeGreaterThan(16);
    expect(offs.filter((o) => o === 2).length).toBeGreaterThan(16);
    expect(offs.some((o, i) => i > 0 && o === offs[i - 1])).toBe(true);
  });

  it('Zufallsspiel über alle Level: Möwe genau auf den Rhythmuszügen mit passendem Spawn, Abstände 3–5', () => {
    let gulls = 0;
    let moves = 0;
    for (const level of ALL) {
      for (const k of [1, 2]) {
        const seed = hash32(level.id, k);
        const results = play(level, seed, hash32('bot', level.id, k));
        const at: number[] = [];
        let skipped = false;
        for (const res of results) {
          moves++;
          const n = res.state.moveNo;
          const spawn = spawnOf(res);
          const drop = gullDropFor(res);
          const expected = isGullMove(level.id, seed, n) && spawn !== undefined && gullTiers(level).includes(spawn.tier);
          expect(drop !== null, `${level.id} Zug ${n}`).toBe(expected);
          if (isGullMove(level.id, seed, n) && !expected) skipped = true;
          if (drop) {
            gulls++;
            expect(drop.spawnId).toBe(spawn!.id);
            expect(drop.at).toEqual(spawn!.at);
            expect(drop.tier).toBe(spawn!.tier);
            at.push(n);
          }
        }
        if (at.length > 0 && results[0] && spawnOf(results[0]) && (results[1] ? spawnOf(results[1]) : true)) expect(at[0]!).toBeLessThanOrEqual(2);
        if (!skipped) {
          for (let i = 1; i < at.length; i++) {
            expect(at[i]! - at[i - 1]!, `${level.id}: ${at.join(',')}`).toBeGreaterThanOrEqual(3);
            expect(at[i]! - at[i - 1]!, `${level.id}: ${at.join(',')}`).toBeLessThanOrEqual(5);
          }
        }
      }
    }
    // ≈ jeder vierte Zug
    expect(gulls / moves).toBeGreaterThan(0.18);
    expect(gulls / moves).toBeLessThan(0.3);
  }, 60_000);

  it('Level 1 (Zwei werden eins): die Möwe bringt den ersten Nachschub', () => {
    const level = ALL.find((l) => l.id === GULL_FIRST_LEVEL)!;
    expect(level).toBeDefined();
    for (let attempt = 1; attempt <= 6; attempt++) {
      const seed = hash32(level.id, attempt);
      for (const dir of availableDirections(createState(level, seed))) {
        const res = applyMove(createState(level, seed), dir)!;
        const spawn = spawnOf(res);
        if (!spawn) continue;
        expect(res.state.moveNo).toBe(1);
        expect(gullDropFor(res)?.spawnId).toBe(spawn.id);
      }
    }
  });

  it('wählt die Schneise, in der man sie sieht: über freie Platten, an den Blobs vorbei', () => {
    let checked = 0;
    let overBoard = 0;
    for (const level of ALL.slice(0, 30)) {
      for (const res of play(level, hash32(level.id, 9), 3, 20)) {
        const drop = gullDropFor(res, 'always');
        if (!drop) continue;
        const chosen = gullLaneValue(res.state, drop.at, drop.spawnId, drop.side, drop.corridor);
        for (const side of [-1, 1] as const) {
          for (const corridor of [0, 1, 2] as const) expect(chosen + 0.05 + 1e-9).toBeGreaterThanOrEqual(gullLaneValue(res.state, drop.at, drop.spawnId, side, corridor));
        }
        if (chosen > 0) overBoard++;
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    // meist führt der Anflug über freie Platten
    expect(overBoard / checked).toBeGreaterThan(0.7);
    // leeres Brett, Zelle oben links: der Anflug kommt von rechts unten übers Brett (Flug nach links oben)
    const level = LevelSchema.parse({ ...JSON.parse(readFileSync(`${levelsDir}005.json`, 'utf8')) });
    const s0 = createState(level, 1);
    const empty = { ...s0, cells: s0.cells.map(() => null) } as LevelState;
    const lanes = ([-1, 1] as const).map((side) => gullLaneValue(empty, [0, 0], -1, side, 0));
    expect(lanes[0]!).toBeGreaterThan(lanes[1]! + 1);
  });

  it('ist deterministisch: gleiches Level, gleicher Seed, gleiche Züge → dieselben Möwen', () => {
    for (const level of ALL.slice(0, 30)) {
      const seed = hash32(level.id, 7);
      const a = play(level, seed, 99).map((r) => gullDropFor(r));
      const b = play(level, seed, 99).map((r) => gullDropFor(r));
      expect(a).toEqual(b);
    }
  });

  it('Rückspulen spielt dieselbe Zugnummer mit demselben Seed → dieselbe Möwe', () => {
    let checked = 0;
    for (const level of ALL.slice(0, 40)) {
      const seed = hash32(level.id, 3);
      let h = createHistory(createState(level, seed), 8);
      let rng = hash32('rewind', level.id);
      for (let k = 0; k < 12 && h.current.status === 'playing'; k++) {
        const dirs = availableDirections(h.current);
        if (dirs.length === 0) break;
        const [u, next] = mulberry32(rng);
        rng = next;
        const dir = dirs[u % dirs.length]!;
        const res = applyMove(h.current, dir)!;
        const drop = gullDropFor(res);
        if (drop) {
          // zurück und derselbe Wisch: identischer Abwurf
          const back = rewind(record(h, res.state));
          expect(back.current).toBe(h.current);
          const again = applyMove(back.current, dir)!;
          expect(gullDropFor(again)).toEqual(drop);
          // zurück und ein anderer Wisch: dieselbe Zugnummer → wieder die Möwe (sofern ein passender Spawn kommt) mit
          // denselben Rufen (Seite und Schneise folgen dem neuen Brett)
          for (const other of dirs) {
            if (other === dir) continue;
            const alt = applyMove(back.current, other)!;
            const s = spawnOf(alt);
            const d2 = gullDropFor(alt);
            if (s && gullTiers(level).includes(s.tier)) {
              expect(d2).not.toBeNull();
              const pick = ({ call, laugh }: GullDrop) => ({ call, laugh });
              expect(pick(d2!)).toEqual(pick(drop));
            } else expect(d2).toBeNull();
          }
          checked++;
        }
        h = record(h, res.state);
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('drei Modi: auto (Standard), always (jeder Spawn), off (nie); URL-Werte', () => {
    expect(getGullMode()).toBe('auto');
    const level = ALL[4]!;
    const results = play(level, hash32(level.id, 5), 17, 24);
    for (const res of results) {
      expect(gullDropFor(res, 'off')).toBeNull();
      const spawn = spawnOf(res);
      if (spawn) expect(gullDropFor(res, 'always')?.spawnId).toBe(spawn.id);
      else expect(gullDropFor(res, 'always')).toBeNull();
    }
    setGullMode('off');
    expect(results.every((r) => gullDropFor(r) === null)).toBe(true);
    setGullMode('always');
    expect(results.filter((r) => spawnOf(r)).every((r) => gullDropFor(r) !== null)).toBe(true);
    expect(parseGullMode('always')).toBe('always');
    expect(parseGullMode('off')).toBe('off');
    expect(parseGullMode('auto')).toBe('auto');
    expect(parseGullMode('yes')).toBeNull();
    expect(parseGullMode(null)).toBeNull();
  });

  it('nur Darstellung: der Spielstand ist mit und ohne Möwe identisch, das Zugergebnis bleibt unverändert', () => {
    for (const level of ALL.filter((_, i) => i % 5 === 0)) {
      const seed = hash32(level.id, 11);
      setGullMode('always');
      const withGull = play(level, seed, 5);
      for (const r of withGull) {
        const before = JSON.stringify(r.events) + fingerprint(r.state);
        gullDropFor(r);
        gullDropFor(r, 'auto');
        expect(JSON.stringify(r.events) + fingerprint(r.state)).toBe(before);
      }
      setGullMode('off');
      const without = play(level, seed, 5);
      expect(without.map((r) => fingerprint(r.state))).toEqual(withGull.map((r) => fingerprint(r.state)));
    }
  });

  it('Seed steht im Zustand und überlebt Züge (Klone)', () => {
    const level = ALL[0]!;
    const s = createState(level, 4242);
    expect(s.seed).toBe(4242);
    const res = applyMove(s, availableDirections(s)[0]!)!;
    expect(res.state.seed).toBe(4242);
    // synthetische Züge ohne Level: nur `always` entscheidet
    const synthetic = { state: { cells: [], geo: { w: 4, h: 4, n: 16 } } as unknown as LevelState, dir: 'left' as const, events: [{ type: 'spawn' as const, phase: 6 as const, id: 9, at: [1, 1] as [number, number], tier: 1, kind: 'normal' as const, material: 'jelly' as const }], mergeCount: 0 };
    expect(gullDropFor(synthetic, 'auto')).toBeNull();
    expect(gullDropFor(synthetic, 'always')?.spawnId).toBe(9);
  });
});

describe('Möwe: Zeiten', () => {
  it('Aufprall frühestens 1,0 s und nie vor dem normalen Pop; Fall 0,42 s; Reihenfolge stimmt', () => {
    for (const spawnAt of [0, 0.3, 0.5, 0.88, 0.9, 1.4, 2.2]) {
      const t = gullTimes(spawnAt);
      expect(t.impactAt).toBeGreaterThanOrEqual(1.0);
      expect(t.impactAt).toBeGreaterThanOrEqual(spawnAt + 0.12 - 1e-9);
      expect(t.impactAt - t.releaseAt).toBeCloseTo(0.42, 9);
      expect(t.enterAt).toBeGreaterThanOrEqual(0);
      expect(t.callAt).toBeGreaterThanOrEqual(0);
      expect(t.enterAt).toBeLessThanOrEqual(t.callAt);
      expect(t.callAt).toBeLessThan(t.releaseAt);
      expect(t.releaseAt).toBeLessThan(t.impactAt);
      expect(t.impactAt).toBeLessThan(t.exitAt);
      expect(t.exitAt - t.releaseAt).toBeCloseTo(1.1, 9);
    }
    const early = gullTimes(0.2);
    expect(early.enterAt).toBe(0);
    expect(early.callAt).toBeCloseTo(0.03, 9);
    expect(early.releaseAt).toBeCloseTo(0.58, 9);
    expect(early.impactAt).toBe(1);
    expect(early.exitAt).toBeCloseTo(1.68, 9);
    const late = gullTimes(1.5);
    expect(late.impactAt).toBeCloseTo(1.62, 9);
    expect(late.enterAt).toBeCloseTo(0.4, 9);
  });
});
