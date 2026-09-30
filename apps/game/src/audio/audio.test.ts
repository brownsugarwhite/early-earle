import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chainNote, inSet, stepFrom, ZONE_KEYS, ZONE_MUSIC } from './scales';
import { rexSchedule, wordSyllables, babbleSyllables, BABBLE_MAX_S } from './rex';
import { planMove, travelTime } from './timeline';
import { syntheticMove } from './demo';
import { MusicGenerator, type MusicNote } from './music';
import { encodeWav, measure, renderSfx, sfxLevel } from './render';
import { installMiniOffline } from './miniOffline';
import { EXTRA_CHECKS, EXTRA_LEVEL_TARGETS, EXTRA_SFX_IDS, EXTRA_TRIM_DB } from './sfxExtra';
import { SFX_IDS, type SfxId } from './sfx';
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

// ------------------------------------------------------------------------------------------ offline renders

/** Mono mix of a render. */
function mono(buf: AudioBuffer): Float32Array {
  const m = new Float32Array(buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < m.length; i++) m[i] = m[i]! + d[i]! / buf.numberOfChannels;
  }
  return m;
}

/** Fundamental (Hz) of a 40 ms window at `t` s by normalised autocorrelation in 500–2600 Hz, null when quiet. */
function pitchAt(m: Float32Array, sr: number, t: number): number | null {
  const n = Math.round(sr * 0.04);
  const s0 = Math.round(t * sr);
  let e = 0;
  for (let i = 0; i < n; i++) e += m[s0 + i]! * m[s0 + i]!;
  if (e < 1e-6) return null;
  const lo = Math.floor(sr / 2600);
  const hi = Math.ceil(sr / 500);
  const r = (lag: number): number => {
    let acc = 0;
    for (let i = 0; i < n; i++) acc += m[s0 + i]! * m[s0 + i + lag]!;
    return acc / e;
  };
  // The first lag whose correlation is near the best one (avoids octave errors on strong second harmonics).
  let best = -1;
  for (let lag = lo; lag <= hi; lag++) best = Math.max(best, r(lag));
  for (let lag = lo; lag <= hi; lag++) {
    const v = r(lag);
    if (v >= 0.9 * best && v >= r(lag - 1) && v >= r(lag + 1)) return sr / lag;
  }
  return null;
}

// Offline renders cost 0.05–0.4 s each (more while the whole suite runs in parallel).
describe('Iteration-4-Klänge (offline gerendert)', { timeout: 30_000 }, () => {
  // Node has no OfflineAudioContext: the tests render through the small spec renderer (≈ Chromium ± 0.7 dB).
  let uninstall: () => void = () => undefined;
  beforeAll(() => {
    uninstall = installMiniOffline();
  });
  afterAll(() => uninstall());

  it('hat für jede neue ID einen Soll-Pegel und mindestens eine Prüf-Variante', () => {
    for (const id of EXTRA_SFX_IDS) {
      expect(SFX_IDS).toContain(id);
      expect(EXTRA_LEVEL_TARGETS[id]).toBeLessThan(-15);
      expect(EXTRA_CHECKS.some((c) => c.id === id)).toBe(true);
    }
    // Trims stay small corrections, not a second mixer.
    for (const v of Object.values(EXTRA_TRIM_DB)) expect(Math.abs(v)).toBeLessThanOrEqual(10);
  });

  it.each(EXTRA_CHECKS.map((c) => [c.label, c] as const))('%s: hörbar, ohne Clipping, im Pegel der Politik', async (_label, c) => {
    const l = await sfxLevel(c.id, c.p, 3);
    // Not silent, clearly under full scale, and within ±1.5 dB of its place in the loudness policy.
    expect(l.peakDb).toBeGreaterThan(-40);
    expect(l.peakDb).toBeLessThan(-6);
    expect(l.clipped).toBe(0);
    expect(l.maxRmsDb).toBeGreaterThan(c.target - 1.5);
    expect(l.maxRmsDb).toBeLessThan(c.target + 1.5);
  });

  it('ist deterministisch: gleicher Seed → gleiche Samples, anderer Seed → andere Variation', async () => {
    for (const id of EXTRA_SFX_IDS) {
      const a = mono(await renderSfx(id, {}, 1.6, 7, 22050));
      const b = mono(await renderSfx(id, {}, 1.6, 7, 22050));
      expect(a).toEqual(b);
    }
    // Without `kind` the gull picks a variant and a pitch from the graph's random stream.
    const g1 = mono(await renderSfx('gullCall', {}, 1.6, 7, 22050));
    const g2 = mono(await renderSfx('gullCall', {}, 1.6, 8, 22050));
    expect(g1).not.toEqual(g2);
  });

  it('Möwe „kjau“: steigt um ≈ +35 % auf ≈ 1,5 kHz und fällt dann deutlich', async () => {
    const buf = await renderSfx('gullCall', { kind: 'a' }, 1.2, 42);
    const m = mono(buf);
    const sr = buf.sampleRate;
    // The call starts at 0.1 s: "ky" (0.065 s) rises, "ow" falls.
    const start = pitchAt(m, sr, 0.1 + 0.005)!;
    const peak = pitchAt(m, sr, 0.1 + 0.09)!;
    const end = pitchAt(m, sr, 0.1 + 0.29)!;
    expect(start).toBeGreaterThan(1000);
    expect(start).toBeLessThan(1250);
    expect(peak / start).toBeGreaterThan(1.2);
    expect(peak).toBeGreaterThan(1350);
    expect(peak).toBeLessThan(1650);
    expect(end / peak).toBeLessThan(0.75);
  });

  it('Stern 1 → 2 → 3 wird lauter und höher; großer Flatsch lauter als der kleine', async () => {
    const lv = async (id: SfxId, p: object): Promise<number> => (await sfxLevel(id, p, 2)).maxRmsDb;
    const s0 = await lv('starPop', { step: 0 });
    const s1 = await lv('starPop', { step: 1 });
    const s2 = await lv('starPop', { step: 2 });
    expect(s1).toBeGreaterThan(s0);
    expect(s2).toBeGreaterThan(s1);
    expect(await lv('splat', { kind: 'big' })).toBeGreaterThan((await lv('splat', {})) + 2);
    expect(await lv('splat', { tier: 2 })).toBeCloseTo(await lv('splat', { kind: 'big' }), 0);
  });
});

describe('Grundkatalog offline (Stichproben gegen Chromium-Messung)', { timeout: 30_000 }, () => {
  let uninstall: () => void = () => undefined;
  beforeAll(() => {
    uninstall = installMiniOffline();
  });
  afterAll(() => uninstall());

  // Chromium (/lab/audio, OfflineAudioContext 44.1 kHz) measured these loudest-100-ms levels; the policy of TRIM_DB.
  it.each([
    ['merge', { tier: 2 }, -21.2],
    ['merge', { tier: 7 }, -16.9],
    ['won', {}, -19.6],
    ['land', {}, -32.9],
    ['splash', {}, -36.4],
    ['uiTick', {}, -40],
    ['creatureVoice', {}, -22.2],
  ] as const)('%s %o ≈ %d dBFS', async (id, p, db) => {
    const l = measure(await renderSfx(id, p, 3));
    expect(Math.abs(l.maxRmsDb - db)).toBeLessThanOrEqual(0.8);
  });
});
