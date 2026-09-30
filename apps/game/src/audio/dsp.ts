import type { Strip } from './graph';

/**
 * Instrument and noise primitives. Every function schedules nodes on a borrowed strip starting at context
 * time `t` and returns the time its sound has decayed. Timbres are deliberately soft: sine-based modal
 * partials (marimba, glass, kalimba), low-passed plucks, band-passed noise — warm, rounded, never buzzy.
 */

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Percussive envelope: 0 → peak in `attack`, exponential decay to −60 dB after `t60`. */
export function perc(p: AudioParam, t: number, peak: number, attack: number, t60: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.setTargetAtTime(0, t + attack, Math.max(0.001, t60) / 6.9);
  return t + attack + t60;
}

/** Attack–hold–release: linear attack, flat hold, exponential release (≈ −43 dB after `release`). */
export function ahr(p: AudioParam, t: number, peak: number, attack: number, hold: number, release: number): number {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.setValueAtTime(peak, t + attack + hold);
  p.setTargetAtTime(0, t + attack + hold, Math.max(0.001, release) / 5);
  return t + attack + hold + release;
}

export interface PartialOptions {
  type?: OscillatorType;
  attack?: number;
  /** Detune in cents. */
  detune?: number;
  /** Start at `freq × bend` and glide to `freq` (tine bend, jelly boing). */
  bend?: number;
  bendTime?: number;
  out?: AudioNode | undefined;
}

/** One oscillator partial with a percussive envelope. */
export function partial(s: Strip, t: number, freq: number, amp: number, t60: number, o: PartialOptions = {}): number {
  if (freq >= s.g.nyquist * 0.9 || amp <= 0.0005) return t;
  const attack = o.attack ?? 0.002;
  const end = t + attack + t60;
  const osc = s.osc(o.type ?? 'sine', freq, t, end + 0.03);
  if (o.detune) osc.detune.value = o.detune;
  if (o.bend && o.bend !== 1) {
    osc.frequency.setValueAtTime(freq * o.bend, t);
    osc.frequency.setTargetAtTime(freq, t, (o.bendTime ?? 0.04) / 3);
  }
  const g = s.gain(0);
  perc(g.gain, t, amp, attack, t60);
  osc.connect(g);
  g.connect(o.out ?? s.input);
  return end;
}

/** Mallet/tine transient: a few ms of band-passed noise. */
export function mallet(s: Strip, t: number, freq: number, amp: number, out?: AudioNode): number {
  const n = s.noise('white', t, t + 0.03);
  const bp = s.filter('bandpass', freq, 1.3);
  const g = s.gain(0);
  perc(g.gain, t, amp, 0.0008, 0.014);
  n.connect(bp);
  bp.connect(g);
  g.connect(out ?? s.input);
  return t + 0.02;
}

/** Wooden marimba bar: tuned modes 1 : 4 : 10, a warm detuned twin, a soft mallet. `bright` 0..1. */
export function marimba(s: Strip, t: number, f: number, vel: number, bright = 0.5, out?: AudioNode): number {
  const t60 = clamp(1.65 - f / 1000, 0.3, 1.4);
  const end = partial(s, t, f, 0.6 * vel, t60, { out });
  partial(s, t, f, 0.22 * vel, t60 * 0.7, { detune: 5, out });
  partial(s, t, f * 3.98, (0.15 + 0.2 * bright) * vel, t60 * 0.22, { out });
  if (bright > 0.35) partial(s, t, f * 9.9, 0.04 * bright * vel, 0.04, { out });
  mallet(s, t, clamp(f * 2.4, 600, 4200), 0.07 * (0.4 + bright) * vel, out);
  return end;
}

/** Light marimba for the music layer (two partials, no noise). */
export function marimbaLite(s: Strip, t: number, f: number, vel: number, out?: AudioNode): number {
  const t60 = clamp(1.7 - f / 1000, 0.35, 1.4);
  const end = partial(s, t, f, 0.7 * vel, t60, { out });
  partial(s, t, f * 3.98, 0.12 * vel, t60 * 0.18, { out });
  return end;
}

const GLASS: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [2.32, 0.34, 0.42],
  [4.25, 0.16, 0.2],
  [6.63, 0.07, 0.1],
];

/** Glass / celesta bell: inharmonic partials plus a slightly detuned twin that shimmers. */
export function glass(s: Strip, t: number, f: number, vel: number, ring = 1, out?: AudioNode, attack = 0.003): number {
  const base = 2.2 * ring;
  let end = t;
  for (const [r, a, k] of GLASS) {
    if (f * r > 9500) break;
    end = Math.max(end, partial(s, t, f * r, a * vel * 0.5, base * k, { attack, out }));
  }
  partial(s, t, f * 1.0013, 0.22 * vel, base * 0.9, { attack: attack * 1.5, out });
  return end;
}

/** Kalimba tine: sine with a small downward bend, a faint octave and the characteristic high partial. */
export function kalimba(s: Strip, t: number, f: number, vel: number, out?: AudioNode): number {
  const end = partial(s, t, f, 0.62 * vel, clamp(1.5 - f / 1800, 0.5, 1.3), { bend: 1.016, bendTime: 0.05, out });
  partial(s, t, f * 2.01, 0.07 * vel, 0.3, { out });
  partial(s, t, f * 5.95, 0.12 * vel, 0.08, { out });
  mallet(s, t, 2600, 0.035 * vel, out);
  return end;
}

/** Vibraphone-like bar with a slow tremolo (Syrup). */
export function vibes(s: Strip, t: number, f: number, vel: number, out?: AudioNode, ring = 2.4): number {
  const end = t + 0.002 + ring;
  const trem = s.gain(0.72);
  const lfo = s.osc('sine', 5.2, t, end + 0.05);
  const depth = s.gain(0.28);
  lfo.connect(depth);
  depth.connect(trem.gain);
  trem.connect(out ?? s.input);
  partial(s, t, f, 0.55 * vel, ring, { out: trem });
  partial(s, t, f * 1.0016, 0.16 * vel, ring * 0.85, { out: trem });
  partial(s, t, f * 3.99, 0.1 * vel, 0.3, { out: trem });
  mallet(s, t, clamp(f * 3, 800, 5000), 0.045 * vel, trem);
  return end;
}

/** Warm subtractive pluck (saw through a closing low-pass). */
export function pluck(s: Strip, t: number, f: number, vel: number, bright = 0.5, out?: AudioNode): number {
  const t60 = clamp(1.25 - f / 1600, 0.3, 1.1);
  const end = t + t60;
  const o = s.osc('sawtooth', f, t, end + 0.03);
  const open = Math.min(f * (3 + 7 * bright), 8000);
  const lp = s.filter('lowpass', open, 0.8);
  lp.frequency.setValueAtTime(open, t);
  lp.frequency.setTargetAtTime(Math.max(120, f * 1.3), t + 0.004, 0.06);
  const g = s.gain(0);
  perc(g.gain, t, 0.3 * vel, 0.003, t60);
  o.connect(lp);
  lp.connect(g);
  g.connect(out ?? s.input);
  return end;
}

/** Soft sine bass with a faint octave (music and the big merges). */
export function bass(s: Strip, t: number, f: number, vel: number, t60 = 1.6, out?: AudioNode): number {
  const end = partial(s, t, f, 0.6 * vel, t60, { attack: 0.012, out });
  partial(s, t, f * 2, 0.14 * vel, t60 * 0.35, { attack: 0.01, out });
  return end;
}

/** Slow pad chord: triangle + sine pairs through a low-pass, attack–hold–release. */
export function pad(s: Strip, t: number, freqs: readonly number[], vel: number, attack: number, hold: number, release: number, cutoff = 1100, out?: AudioNode): number {
  const end = t + attack + hold + release;
  const mix = s.gain(1 / Math.max(1, freqs.length * 2));
  const lp = s.filter('lowpass', cutoff, 0.5);
  const g = s.gain(0);
  ahr(g.gain, t, vel, attack, hold, release);
  mix.connect(lp);
  lp.connect(g);
  g.connect(out ?? s.input);
  // Per note a triangle (the colour) and a slightly detuned sine: only the fundamentals beat, slowly (≈ 1 Hz),
  // so the pad shimmers instead of pulsing.
  for (const f of freqs) {
    for (const [type, d] of [
      ['triangle', -3],
      ['sine', 4],
    ] as const) {
      const o = s.osc(type, f, t, end + 0.05);
      o.detune.value = d;
      o.connect(mix);
    }
  }
  return end;
}

/** Breathy flute-ish tone: sine + faint octave, delayed vibrato, a whisper of band-passed breath. */
export function flute(s: Strip, t: number, f: number, vel: number, dur: number, out?: AudioNode): number {
  const end = t + dur + 0.35;
  const dest = out ?? s.input;
  const o = s.osc('sine', f, t, end);
  const o2 = s.osc('sine', f * 2, t, end);
  const vib = s.osc('sine', 4.7, t, end);
  const vd = s.gain(0);
  vd.gain.setValueAtTime(0, t);
  vd.gain.linearRampToValueAtTime(18, t + 0.4);
  vib.connect(vd);
  vd.connect(o.detune);
  vd.connect(o2.detune);
  const g = s.gain(0);
  ahr(g.gain, t, 0.3 * vel, 0.09, dur, 0.3);
  const g2 = s.gain(0.1);
  o.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(dest);
  const n = s.noise('pink', t, end);
  const bp = s.filter('bandpass', f * 1.5, 2.5);
  const ng = s.gain(0);
  ahr(ng.gain, t, 0.05 * vel, 0.05, dur * 0.6, 0.25);
  n.connect(bp);
  bp.connect(ng);
  ng.connect(dest);
  return end;
}

/** Filtered noise hit; the filter may sweep from f0 to f1 over the decay. */
export function noiseHit(
  s: Strip,
  t: number,
  o: { kind?: 'white' | 'pink' | 'brown' | 'crackle'; dur: number; amp: number; type?: BiquadFilterType; f0: number; f1?: number; q?: number; attack?: number; rate?: number; out?: AudioNode | undefined },
): number {
  const attack = o.attack ?? 0.002;
  const end = t + attack + o.dur;
  const n = s.noise(o.kind ?? 'white', t, end + 0.03, o.rate ?? 1);
  const flt = s.filter(o.type ?? 'bandpass', o.f0, o.q ?? 0.9);
  if (o.f1 !== undefined && o.f1 !== o.f0) {
    flt.frequency.setValueAtTime(o.f0, t);
    flt.frequency.exponentialRampToValueAtTime(clamp(o.f1, 30, s.g.nyquist), end);
  }
  const g = s.gain(0);
  perc(g.gain, t, o.amp, attack, o.dur);
  n.connect(flt);
  flt.connect(g);
  g.connect(o.out ?? s.input);
  return end;
}

/** Air movement: pink noise through a band-pass sweeping f0 → fPeak → f1, bell-shaped swell. */
export function whoosh(s: Strip, t: number, dur: number, f0: number, fPeak: number, f1: number, amp: number, q = 1.1, out?: AudioNode, peakAt = 0.45): number {
  const n = s.noise('pink', t, t + dur * 1.3 + 0.05);
  const bp = s.filter('bandpass', f0, q);
  const tp = t + dur * peakAt;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(fPeak, tp);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = s.gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(amp * 0.35, t + dur * peakAt * 0.5);
  g.gain.linearRampToValueAtTime(amp, tp);
  g.gain.setTargetAtTime(0, tp, dur * (1 - peakAt) * 0.32);
  n.connect(bp);
  bp.connect(g);
  g.connect(out ?? s.input);
  return t + dur * 1.3;
}

/** Water drop: a sine whose pitch rises fast (the bubble resonance), very short. */
export function plip(s: Strip, t: number, f: number, amp: number, out?: AudioNode, rise = 2.2, len = 0.07): number {
  const o = s.osc('sine', f, t, t + len + 0.06);
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * rise, t + len * 0.6);
  const g = s.gain(0);
  perc(g.gain, t, amp, 0.001, len);
  o.connect(g);
  g.connect(out ?? s.input);
  return t + len;
}

/**
 * Soft body thump: sine with a pitch drop, a breath of low noise and a small "tock" overtone so the hit still
 * reads on phone speakers (which drop everything below ≈ 300 Hz).
 */
export function thump(s: Strip, t: number, f0: number, f1: number, amp: number, t60: number, out?: AudioNode, noiseAmp = 0.3): number {
  const dest = out ?? s.input;
  const o = s.osc('sine', f0, t, t + t60 + 0.05);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + t60 * 0.55);
  const g = s.gain(0);
  perc(g.gain, t, amp, 0.003, t60);
  o.connect(g);
  g.connect(dest);
  if (f0 < 320) {
    partial(s, t, Math.max(360, f0 * 2.6), amp * 0.42, Math.min(0.1, t60 * 0.5), { out: dest });
    partial(s, t, Math.max(620, f0 * 4.4), amp * 0.16, Math.min(0.05, t60 * 0.3), { out: dest });
  }
  if (noiseAmp > 0) {
    noiseHit(s, t, { kind: 'brown', dur: Math.min(0.12, t60 * 0.6), amp: amp * noiseAmp, type: 'lowpass', f0: 500, q: 0.6, out: dest });
    noiseHit(s, t, { kind: 'white', dur: 0.028, amp: amp * noiseAmp * 1.4, type: 'bandpass', f0: 1000, q: 1, out: dest });
  }
  return t + t60;
}

/** Jelly wobble: a round tone squashed down then wobbling out (decaying vibrato). */
export function wobble(s: Strip, t: number, f: number, amp: number, dur = 0.32, rate = 13, depth = 0.14, out?: AudioNode): number {
  const end = t + dur;
  const o = s.osc('triangle', f, t, end + 0.04);
  o.frequency.setValueAtTime(f * 0.86, t);
  o.frequency.setTargetAtTime(f, t, 0.018);
  const lfo = s.osc('sine', rate, t, end + 0.04);
  lfo.frequency.setValueAtTime(rate, t);
  lfo.frequency.linearRampToValueAtTime(rate * 0.75, end);
  const ld = s.gain(0);
  ld.gain.setValueAtTime(1200 * depth, t);
  ld.gain.setTargetAtTime(0, t + 0.02, dur / 3.5);
  lfo.connect(ld);
  ld.connect(o.detune);
  const lp = s.filter('lowpass', Math.min(f * 5, 3200), 0.7);
  const g = s.gain(0);
  perc(g.gain, t, amp, 0.004, dur);
  o.connect(lp);
  lp.connect(g);
  g.connect(out ?? s.input);
  return end;
}

/** Ember crackle: sparse clicks, band-limited so it stays cosy. */
export function crackle(s: Strip, t: number, dur: number, amp: number, center = 2400, out?: AudioNode): number {
  const n = s.noise('crackle', t, t + dur + 0.03, 0.8 + s.g.rand() * 0.4);
  const bp = s.filter('bandpass', center, 0.6);
  const lp = s.filter('lowpass', 5200, 0.6);
  const g = s.gain(0);
  ahr(g.gain, t, amp, 0.008, dur * 0.35, dur * 0.65);
  n.connect(bp);
  bp.connect(lp);
  lp.connect(g);
  g.connect(out ?? s.input);
  return t + dur;
}

/** Wing flutter: band-passed noise chopped by a slowing flap LFO. */
export function flutter(s: Strip, t: number, dur: number, amp: number, rate = 24, out?: AudioNode, center = 1800): number {
  const end = t + dur;
  const n = s.noise('white', t, end + 0.03);
  const bp = s.filter('bandpass', center, 1.1);
  const am = s.gain(0.5);
  const lfo = s.osc('triangle', rate, t, end + 0.03);
  lfo.frequency.setValueAtTime(rate, t);
  lfo.frequency.linearRampToValueAtTime(rate * 0.65, end);
  const ld = s.gain(0.5);
  lfo.connect(ld);
  ld.connect(am.gain);
  const g = s.gain(0);
  ahr(g.gain, t, amp, 0.012, dur * 0.45, dur * 0.55);
  n.connect(bp);
  bp.connect(am);
  am.connect(g);
  g.connect(out ?? s.input);
  return end;
}

/** Soft breath / gas puff: pink noise through a closing low-pass. */
export function puff(s: Strip, t: number, amp: number, f = 1100, dur = 0.28, out?: AudioNode): number {
  const n = s.noise('pink', t, t + dur + 0.05);
  const lp = s.filter('lowpass', f, 0.6);
  lp.frequency.setValueAtTime(f, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(120, f * 0.3), t + dur);
  const g = s.gain(0);
  ahr(g.gain, t, amp, 0.022, 0.02, dur);
  n.connect(lp);
  lp.connect(g);
  g.connect(out ?? s.input);
  return t + dur;
}

/** Rising sine glide ("fwee"), used for jumps, sparkles and whoosh-ups. */
export function glide(s: Strip, t: number, f0: number, f1: number, dur: number, amp: number, out?: AudioNode, type: OscillatorType = 'sine'): number {
  const o = s.osc(type, f0, t, t + dur + 0.05);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = s.gain(0);
  ahr(g.gain, t, amp, dur * 0.25, dur * 0.25, dur * 0.5);
  o.connect(g);
  g.connect(out ?? s.input);
  return t + dur;
}
