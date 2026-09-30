import type { AudioGraph, BusName } from './graph';
import { perc } from './dsp';

/**
 * Formant voice: one glottal oscillator (soft 1/n^1.3 spectrum) plus a breath of noise through three
 * band-pass formants, with per-syllable pitch, vowel and amplitude automation and short consonant bursts.
 * A whole line is one voice (≈ 20 nodes), however many syllables it has. Used for REX's babble and chirps
 * and for the creatures' yips and roars.
 */

export type Onset = 'none' | 'plosive' | 'fricative' | 'nasal' | 'liquid';

export interface VoiceSyllable {
  /** Start / end relative to the line start (s). */
  t0: number;
  t1: number;
  /** Vowel group: a e i o u ä ö ü y, or a diphthong (ei ai au eu äu ie ou). */
  vowel: string;
  onset: Onset;
  stress: boolean;
  /** Pitch at the syllable start (Hz). */
  pitch: number;
  /** Relative pitch change across the syllable (0.1 = +10 %). */
  glide: number;
  /** 0..1 */
  amp: number;
  /** Tied to the next syllable (no release at its end): one breath across a pitch or vowel change ("kyow"). */
  legato?: boolean;
}

export interface VoiceStyle {
  /** Formant scale: 1 ≈ adult, > 1 smaller creature (higher formants), < 1 bigger. */
  size: number;
  /** Noise share 0..1 (breathy, whispery). */
  breath: number;
  /** Vibrato depth in cents. */
  vibrato: number;
  /** Roughness 0..1 (amplitude flutter at ≈ 28 Hz): roars. */
  growl: number;
  /** Output level. */
  gain: number;
  /** Upper formant emphasis 0..1. */
  bright: number;
}

const FORMANTS: Readonly<Record<string, readonly [number, number]>> = {
  a: [800, 1250],
  e: [440, 1950],
  i: [300, 2250],
  o: [470, 820],
  u: [320, 720],
  ä: [620, 1700],
  ö: [430, 1450],
  ü: [300, 1650],
  y: [300, 1650],
};

/** Vowel group → [first, second] targets (the second glides in half-way through the syllable). */
export function vowelTargets(v: string): [string, string | null] {
  const w = v.toLowerCase();
  switch (w) {
    case 'ei':
    case 'ai':
      return ['a', 'i'];
    case 'au':
      return ['a', 'u'];
    case 'eu':
    case 'äu':
      return ['o', 'i'];
    case 'ou':
      return ['o', 'u'];
    case 'ie':
      return ['i', null];
    default: {
      const c = w[0] ?? 'e';
      const base = 'àáâ'.includes(c) ? 'a' : 'éèê'.includes(c) ? 'e' : 'íìî'.includes(c) ? 'i' : 'óòô'.includes(c) ? 'o' : 'úùû'.includes(c) ? 'u' : c;
      return [FORMANTS[base] ? base : 'e', null];
    }
  }
}

function formantOf(v: string): readonly [number, number] {
  return FORMANTS[v] ?? FORMANTS.e!;
}

const waves = new WeakMap<BaseAudioContext, PeriodicWave>();

/** Soft glottal-pulse spectrum (warmer than a sawtooth). */
function glottalWave(ctx: BaseAudioContext): PeriodicWave {
  const hit = waves.get(ctx);
  if (hit) return hit;
  const n = 28;
  const real = new Float32Array(n + 1);
  const imag = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) imag[k] = (k === 1 ? 0.85 : 1) / Math.pow(k, 1.3);
  const w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  waves.set(ctx, w);
  return w;
}

export interface SpeakOptions {
  bus?: BusName;
  pan?: number;
  prio?: number;
  reverb?: number;
  /** Fade the voice out from this relative time (long lines trail off). */
  fadeFrom?: number;
  /** Pans from `pan` to this position over the line (a call from something moving). */
  panTo?: number;
}

/** Speaks a syllable sequence from context time `t`; returns the end time (or `t` when the pool is full). */
export function speak(g: AudioGraph, t: number, syl: readonly VoiceSyllable[], style: VoiceStyle, opts: SpeakOptions = {}): number {
  const first = syl[0];
  const last = syl[syl.length - 1];
  if (!first || !last) return t;
  const dur = last.t1 + 0.3;
  const s = g.voice(opts.bus ?? 'voice', t, dur, opts.prio ?? 2, opts.pan ?? 0, opts.reverb ?? 0.12, style.gain);
  if (!s) return t;
  const end = t + dur;
  const size = style.size;
  if (opts.panTo !== undefined) s.panTo(opts.panTo, t, dur);
  // Onsets reach a little before their syllable; never before the context's time zero (a line right after unlock).
  const at = (x: number): number => Math.max(0, x);

  // Source, vibrato, breath.
  const src = s.osc('sine', first.pitch, t, end);
  src.setPeriodicWave(glottalWave(g.ctx));
  src.frequency.setValueAtTime(first.pitch, t);
  if (style.vibrato > 0) {
    const vib = s.osc('sine', 5.3 + g.rand() * 0.6, t, end);
    const vg = s.gain(style.vibrato);
    vib.connect(vg);
    vg.connect(src.detune);
  }
  const pre = s.gain(1);
  src.connect(pre);
  if (style.breath > 0) {
    const br = s.noise('pink', t, end);
    const bg = s.gain(style.breath * 0.9);
    br.connect(bg);
    bg.connect(pre);
  }

  // Formant bank (parallel band-passes) → amplitude envelope → optional growl → strip.
  const [a1, a2] = formantOf(vowelTargets(first.vowel)[0]);
  const f1 = s.filter('bandpass', a1 * size, 5.5);
  const f2 = s.filter('bandpass', a2 * size, 7);
  const f3 = s.filter('bandpass', 2750 * size, 9);
  const g1 = s.gain(2.4);
  const g2 = s.gain(1.5 + 0.8 * style.bright);
  const g3 = s.gain(0.5 + 0.8 * style.bright);
  const amp = s.gain(0);
  pre.connect(f1);
  pre.connect(f2);
  pre.connect(f3);
  f1.connect(g1);
  f2.connect(g2);
  f3.connect(g3);
  g1.connect(amp);
  g2.connect(amp);
  g3.connect(amp);
  const body = s.filter('lowpass', 520 * size, 0.7);
  const bodyGain = s.gain(0.22);
  src.connect(body);
  body.connect(bodyGain);
  bodyGain.connect(amp);
  let tail: AudioNode = amp;
  if (style.growl > 0) {
    const gr = s.gain(1 - style.growl * 0.45);
    const lfo = s.osc('sine', 27 + g.rand() * 5, t, end);
    const lg = s.gain(style.growl * 0.45);
    lfo.connect(lg);
    lg.connect(gr.gain);
    amp.connect(gr);
    tail = gr;
  }
  const out = s.gain(1);
  tail.connect(out);
  out.connect(s.input);
  if (opts.fadeFrom !== undefined && opts.fadeFrom < last.t1) {
    out.gain.setValueAtTime(1, t + opts.fadeFrom);
    out.gain.linearRampToValueAtTime(0, t + Math.min(last.t1, opts.fadeFrom + 0.35));
  }

  // Consonant bursts share one noise source.
  const cn = s.noise('white', t, end);
  const cf = s.filter('bandpass', 3000, 1.2);
  const cg = s.gain(0);
  cn.connect(cf);
  cf.connect(cg);
  cg.connect(out);

  amp.gain.setValueAtTime(0, t);
  for (const y of syl) {
    const t0 = t + y.t0;
    const t1 = t + y.t1;
    const len = Math.max(0.04, t1 - t0);
    const [v1, v2] = vowelTargets(y.vowel);
    const [b1, b2] = formantOf(v1);
    const peak = y.amp * (y.stress ? 1 : 0.78);
    // Onsets: nasals/liquids start closed and open into the vowel; plosives click; fricatives hiss before.
    if (y.onset === 'nasal') {
      f1.frequency.setTargetAtTime(260 * size, at(t0 - 0.03), 0.01);
      f2.frequency.setTargetAtTime(1100 * size, at(t0 - 0.03), 0.01);
    } else if (y.onset === 'liquid') {
      f2.frequency.setTargetAtTime(1150 * size, at(t0 - 0.03), 0.01);
    }
    f1.frequency.setTargetAtTime(b1 * size, t0 + (y.onset === 'nasal' ? 0.02 : 0), 0.016);
    f2.frequency.setTargetAtTime(b2 * size, t0 + (y.onset === 'nasal' || y.onset === 'liquid' ? 0.02 : 0), 0.02);
    if (v2) {
      const [c1, c2] = formantOf(v2);
      f1.frequency.setTargetAtTime(c1 * size, t0 + len * 0.45, 0.03);
      f2.frequency.setTargetAtTime(c2 * size, t0 + len * 0.45, 0.035);
    }
    src.frequency.setTargetAtTime(y.pitch, at(t0 - 0.01), 0.012);
    if (y.glide !== 0) src.frequency.setTargetAtTime(y.pitch * (1 + y.glide), t0 + len * 0.25, len * 0.35);
    const attack = y.onset === 'nasal' || y.onset === 'liquid' ? 0.03 : 0.014;
    amp.gain.setTargetAtTime(peak, t0, attack / 2.5);
    amp.gain.setTargetAtTime(peak * 0.82, t0 + len * 0.4, len * 0.3);
    if (!y.legato) amp.gain.setTargetAtTime(0, t1 - Math.min(0.05, len * 0.3), 0.018);
    if (y.onset === 'plosive') {
      cf.frequency.setValueAtTime(1900 * size, at(t0 - 0.012));
      perc(cg.gain, at(t0 - 0.012), 0.22 * y.amp, 0.001, 0.025);
    } else if (y.onset === 'fricative') {
      cf.frequency.setValueAtTime(4800, at(t0 - 0.05));
      cg.gain.setValueAtTime(0, at(t0 - 0.055));
      cg.gain.linearRampToValueAtTime(0.1 * y.amp, at(t0 - 0.03));
      cg.gain.setTargetAtTime(0, at(t0 - 0.004), 0.01);
    }
  }
  return end;
}

/** Creature voices ------------------------------------------------------------------------------------- */

/** A lovable "rawr" for big leap merges: a short rising onset then a falling, growly open vowel. */
export function roar(g: AudioGraph, t: number, tier: number, pan = 0): number {
  const p = Math.max(120, 196 - 9 * Math.max(0, tier - 7));
  const syl: VoiceSyllable[] = [
    { t0: 0, t1: 0.09, vowel: 'a', onset: 'liquid', stress: false, pitch: p * 0.85, glide: 0.25, amp: 0.6 },
    { t0: 0.09, t1: 0.44, vowel: 'au', onset: 'none', stress: true, pitch: p * 1.08, glide: -0.3, amp: 1 },
  ];
  return speak(g, t, syl, { size: 0.92, breath: 0.5, vibrato: 16, growl: 0.55, gain: 0.5, bright: 0.25 }, { bus: 'sfx', pan, prio: 3, reverb: 0.22 });
}

/** A small excited "yip!" for the mid-tier leaps. */
export function yip(g: AudioGraph, t: number, tier: number, pan = 0): number {
  const p = Math.max(380, 600 - 25 * Math.max(0, tier - 5));
  const syl: VoiceSyllable[] = [{ t0: 0, t1: 0.11, vowel: 'i', onset: 'none', stress: true, pitch: p, glide: 0.3, amp: 1 }];
  return speak(g, t, syl, { size: 1.35, breath: 0.15, vibrato: 0, growl: 0, gain: 0.34, bright: 0.5 }, { bus: 'sfx', pan, prio: 2, reverb: 0.15 });
}

/** A sleepy "mm-hm?" when a sleeper wakes up. */
export function yawn(g: AudioGraph, t: number, pan = 0): number {
  const syl: VoiceSyllable[] = [
    { t0: 0, t1: 0.16, vowel: 'u', onset: 'nasal', stress: false, pitch: 330, glide: -0.1, amp: 0.7 },
    { t0: 0.2, t1: 0.42, vowel: 'a', onset: 'nasal', stress: true, pitch: 360, glide: 0.25, amp: 0.85 },
  ];
  return speak(g, t, syl, { size: 1.3, breath: 0.35, vibrato: 12, growl: 0, gain: 0.3, bright: 0.3 }, { bus: 'sfx', pan, prio: 1, reverb: 0.2 });
}
