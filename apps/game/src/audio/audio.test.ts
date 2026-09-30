import { afterEach, describe, expect, it } from 'vitest';
import { applyMove, createState, gullDropFor, gullTimes, levelFromAscii, setGullMode } from '@ee/core';
import { chainNote, inSet, stepFrom, ZONE_KEYS, ZONE_MUSIC } from './scales';
import { rexSchedule, wordSyllables, babbleSyllables, BABBLE_MAX_S } from './rex';
import { planMove, travelTime } from './timeline';
import { syntheticMove } from './demo';
import { MusicGenerator, type MusicNote } from './music';
import { encodeWav } from './render';
import type { CreatureGuess } from './bodies';

const blob = (): CreatureGuess => ({ body: 'blob', coat: 'bare' });
const walker = (): CreatureGuess => ({ body: 'quadruped', coat: 'fur' });

describe('scales', () => {
  it('climbs the pentatonic: tier 2 = chain root, tier 7 = one octave up, tier 12 = two', () => {
    for (const z of ZONE_KEYS) {
      const root = ZONE_MUSIC[z].chainRoot;
      expect(chainNote(z, 2)).toBe(root);
      expect(chainNote(z, 7)).toBe(root + 12);
      expect(chainNote(z, 12)).toBe(root + 24);
      for (let t = 2; t < 12; t++) expect(chainNote(z, t + 1)).toBeGreaterThan(chainNote(z, t));
    }
  });

  it('keeps every chord, chain note and step inside the zone set (no clashes)', () => {
    for (const z of ZONE_KEYS) {
      expect(inSet(z, ZONE_MUSIC[z].chainRoot)).toBe(true);
      for (const chord of ZONE_MUSIC[z].chords) for (const n of chord) expect(inSet(z, n)).toBe(true);
      for (let t = 1; t <= 14; t++) expect(inSet(z, chainNote(z, t))).toBe(true);
      expect(inSet(z, stepFrom(z, ZONE_MUSIC[z].root, 7))).toBe(true);
      // Anhemitonic: no two set members a semitone apart.
      const pcs = ZONE_MUSIC[z].set;
      for (const a of pcs) expect(pcs.includes((a + 1) % 12)).toBe(false);
    }
  });
});

describe('REX babble', () => {
  it('mirrors the jaw schedule (0.17 s syllables, long diphthongs, punctuation pauses)', () => {
    const s = rexSchedule('Hallo, Kleines.');
    expect(s.syllables.map((y) => y.vowel)).toEqual(['a', 'o', 'ei', 'e']);
    expect(s.syllables[0]!.t0).toBeCloseTo(0.04, 5);
    expect(s.syllables[1]!.t0).toBeCloseTo(0.04 + 0.17, 5);
    // comma pause 0.14 before "Klei" (+ the word gap 0.05)
    expect(s.syllables[2]!.t0).toBeCloseTo(0.04 + 0.34 + 0.14 + 0.05, 5);
    expect(s.syllables[2]!.t1 - s.syllables[2]!.t0).toBeCloseTo(0.17 * 1.25, 5);
  });

  it('keeps onsets: plosive, fricative, nasal, liquid', () => {
    expect(wordSyllables('Schieb')).toEqual([{ vowel: 'ie', onset: 'fricative' }]);
    expect(wordSyllables('Doppelt').map((x) => x.onset)).toEqual(['plosive', 'plosive']);
    expect(wordSyllables('nochmal').map((x) => x.onset)).toEqual(['nasal', 'nasal']);
    expect(wordSyllables('Rex')[0]!.onset).toBe('liquid');
  });

  it('questions rise at the end, worried lines fall, long lines stop after the cap', () => {
    const q = babbleSyllables('Da oben?', 'neutral');
    expect(q[q.length - 1]!.glide).toBeGreaterThan(0.2);
    const w = babbleSyllables('Macht nichts. Nochmal.', 'worried');
    expect(w[w.length - 1]!.glide).toBeLessThan(0);
    const long = babbleSyllables('Das hier ist eine sehr lange Zeile, die REX erzählt, bis alle Blobs eingeschlafen sind und träumen.', 'neutral');
    expect(Math.max(...long.map((y) => y.t0))).toBeLessThanOrEqual(BABBLE_MAX_S);
  });
});

describe('move planning', () => {
  it('slides at the start, the merge note lands on the splash impact', () => {
    const { res, prev } = syntheticMove({ tier: 3, material: 'jelly', merges: 1, cells: 2 });
    const plan = planMove(res, { zone: 'tjorizo', prev, guess: blob });
    const slide = plan.sounds.find((s) => s.id === 'slide')!;
    expect(slide.t).toBe(0);
    const tA = 0.055 + travelTime('blob', 2 - 0.45, 2);
    const merge = plan.sounds.find((s) => s.id === 'merge')!;
    expect(merge.t).toBeCloseTo(tA + 0.2, 5);
    expect(merge.p.tier).toBe(3);
    expect(plan.sounds.find((s) => s.id === 'splash')!.t).toBeCloseTo(merge.t, 5);
  });

  it('staggers simultaneous merges into a rising arpeggio and caps them at four', () => {
    const { res, prev } = syntheticMove({ tier: 3, material: 'jelly', merges: 6, cells: 1, rising: false });
    const merges = planMove(res, { zone: 'tjorizo', prev, guess: blob }).sounds.filter((s) => s.id === 'merge');
    expect(merges).toHaveLength(4);
    for (let i = 1; i < merges.length; i++) expect(merges[i]!.t - merges[i - 1]!.t).toBeCloseTo(0.07, 5);
    // the folded merges make the last one a little fuller
    expect(merges[3]!.p.count).toBe(3);
  });

  it('walkers leap to the camera: whoosh-up, voice at the apex, bite and big splash at contact', () => {
    const { res, prev } = syntheticMove({ tier: 8, material: 'jelly', merges: 1, cells: 2, rising: false });
    const plan = planMove(res, { zone: 'tjorizo', prev, guess: walker });
    const at = (id: string) => plan.sounds.find((s) => s.id === id)!.t;
    const tA = 0.05 + travelTime('quadruped', 2 - 0.62, 7);
    expect(at('leapUp')).toBeCloseTo(tA + 0.11, 5);
    expect(at('creatureVoice')).toBeCloseTo(tA + 0.25, 5);
    expect(at('bite')).toBeCloseTo(tA + 0.53, 5);
    expect(at('merge')).toBeCloseTo(tA + 0.53, 5);
    expect(plan.sounds.find((s) => s.id === 'splash')!.p.kind).toBe('big');
    expect(plan.maxTier).toBe(8);
  });

  it('plain landings become grouped stops; win and lose are flagged', () => {
    const won = syntheticMove({ tier: 3, material: 'liquid', merges: 1, cells: 3, stops: 3, extra: [{ type: 'won', phase: 7, score: 10, movesLeft: 2 }] });
    const plan = planMove(won.res, { zone: 'syrup', prev: won.prev, guess: blob });
    const stops = plan.sounds.filter((s) => s.id === 'stop');
    expect(stops).toHaveLength(1);
    expect(stops[0]!.p.count).toBe(3);
    expect(stops[0]!.p.material).toBe('liquid');
    expect(plan.won).toBe(true);
    expect(plan.sounds.some((s) => s.id === 'won')).toBe(true);
    expect(plan.sounds.every((s) => s.p.zone === 'syrup')).toBe(true);
  });
});

describe('music', () => {
  it('is deterministic per seed and stays in key', () => {
    const run = (seed: number): MusicNote[] => {
      const g = new MusicGenerator('luzz', seed);
      const out: MusicNote[] = [];
      let t = 0;
      for (let b = 0; b < 16; b++) t += g.nextBar(t, b < 8 ? 'map' : 'level', out);
      return out;
    };
    const a = run(3);
    expect(run(3)).toEqual(a);
    expect(run(4)).not.toEqual(a);
    expect(a.length).toBeGreaterThan(20);
    for (const n of a) expect(inSet('luzz', n.midi)).toBe(true);
    // Level bars are sparser than map bars.
    const g = new MusicGenerator('tjorizo', 1);
    const count = (mode: 'map' | 'level'): number => {
      const out: MusicNote[] = [];
      for (let b = 0; b < 32; b++) g.nextBar(0, mode, out);
      return out.filter((n) => n.kind === 'lead').length;
    };
    expect(count('level')).toBeLessThan(count('map'));
  });
});

describe('wav', () => {
  it('writes a 16-bit PCM RIFF header and clamps samples', () => {
    const data = [new Float32Array([0, 0.5, -1.2, 1]), new Float32Array([0.25, -0.25, 0, 0])];
    const buf = { numberOfChannels: 2, length: 4, sampleRate: 44100, getChannelData: (c: number) => data[c]! } as unknown as AudioBuffer;
    const v = new DataView(encodeWav(buf));
    const str = (o: number, n: number): string => String.fromCharCode(...Array.from({ length: n }, (_, i) => v.getUint8(o + i)));
    expect(str(0, 4)).toBe('RIFF');
    expect(str(8, 4)).toBe('WAVE');
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(44100);
    expect(v.getUint32(40, true)).toBe(16);
    expect(v.getInt16(44 + 4 * 2, true)).toBe(-32768); // -1.2 clamped (frame 2, left)
    expect(v.getInt16(44 + 6 * 2, true)).toBe(32767); // 1.0
  });
});

describe('combo harmony', () => {
  it('same-tier merges in one swipe climb the chord (+2, +4 pentatonic steps)', () => {
    const { res, prev } = syntheticMove({ tier: 3, material: 'jelly', merges: 3, cells: 1, rising: false });
    const steps = planMove(res, { zone: 'tjorizo', prev, guess: blob })
      .sounds.filter((s) => s.id === 'merge')
      .map((s) => s.p.step ?? 0);
    expect(steps).toEqual([0, 2, 4]);
  });
});

describe('gull', () => {
  afterEach(() => setGullMode('auto'));
  // 1+1 and 2+2 merge on a swipe left (tier 3 = goal): a spawn and the win in one move.
  const board = `
    1 . . 1
    2 . . 2
    . . . .
    . . . .
  `;

  it('a gull spawn: cries across the stereo field, wings, fall, splat on the shared impact time; no pop sound', () => {
    const level = levelFromAscii(board, { id: 'gull-audio', goals: [{ type: 'reachTier', tier: 5 }] });
    const s0 = createState(level, 77);
    const res = applyMove(s0, 'left')!;
    const spawn = res.events.find((e) => e.type === 'spawn');
    expect(spawn).toBeDefined();
    setGullMode('off');
    const plain = planMove(res, { zone: 'tjorizo', prev: s0, guess: blob });
    expect(plain.gullAt).toBeNull();
    const spawnAt = plain.sounds.find((s) => s.id === 'spawn')!.t;
    expect(plain.sounds.some((s) => s.id.startsWith('gull') || s.id === 'splat' || s.id === 'dropFall')).toBe(false);

    setGullMode('always');
    const drop = gullDropFor(res)!;
    const plan = planMove(res, { zone: 'tjorizo', prev: s0, guess: blob });
    const g = gullTimes(spawnAt);
    expect(plan.gullAt).toBeCloseTo(g.impactAt, 9);
    expect(plan.sounds.some((s) => s.id === 'spawn')).toBe(false);
    const one = (id: string) => plan.sounds.find((s) => s.id === id)!;
    expect(one('splat').t).toBeCloseTo(g.impactAt, 9);
    expect(one('splat').p.tier).toBe(drop.tier);
    expect(one('dropFall').t).toBeCloseTo(g.releaseAt, 9);
    expect(one('gullWings').t).toBeCloseTo(g.releaseAt - 0.12, 9);
    const cries = plan.sounds.filter((s) => s.id === 'gullCall');
    expect(cries).toHaveLength(1 + drop.call);
    expect(cries[0]!.t).toBeCloseTo(g.callAt, 9);
    expect(cries[0]!.p.pan).toBeCloseTo(-0.7 * drop.side, 9);
    if (cries.length > 1) expect(cries[cries.length - 1]!.p.pan).toBeCloseTo(0.7 * drop.side, 9);
    for (const c of cries) expect(c.p.dir).toBe(drop.side > 0 ? 'right' : 'left');
    expect(cries.filter((c) => c.p.kind === 'laugh')).toHaveLength(drop.laugh ? 1 : 0);
    // Cries pan monotonically in flight direction.
    for (let i = 1; i < cries.length; i++) expect((cries[i]!.p.pan! - cries[i - 1]!.p.pan!) * drop.side).toBeGreaterThan(0);
  });

  it('Level 1 (auto): the gull brings the first spawn; the win stinger waits for the splat', () => {
    const level = levelFromAscii(board, { id: 'tjorizo-001', goals: [{ type: 'reachTier', tier: 3 }] });
    const s0 = createState(level, 1001);
    const res = applyMove(s0, 'left')!;
    expect(res.state.status).toBe('won');
    const plan = planMove(res, { zone: 'tjorizo', prev: s0, guess: blob });
    expect(plan.gullAt).not.toBeNull();
    expect(plan.gullAt!).toBeGreaterThanOrEqual(1.0);
    expect(plan.won).toBe(true);
    expect(plan.endAt).toBeGreaterThan(plan.gullAt!);
    expect(plan.sounds.find((s) => s.id === 'won')!.t).toBeGreaterThan(plan.gullAt!);
  });

  it('synthetic moves without a level keep their plain spawn pop in auto mode', () => {
    const { res, prev } = syntheticMove({ tier: 3, material: 'jelly', merges: 1, cells: 2, extra: [{ type: 'spawn', phase: 6, id: 999, at: [3, 3], tier: 1, kind: 'normal', material: 'jelly' }] });
    const plan = planMove(res, { zone: 'tjorizo', prev, guess: blob });
    expect(plan.gullAt).toBeNull();
    expect(plan.sounds.some((s) => s.id === 'spawn')).toBe(true);
  });
});
