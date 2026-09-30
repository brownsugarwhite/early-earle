import type { AudioGraph } from './graph';
import { flute, glass, marimba, noiseHit, partial, plip } from './dsp';
import { mtof, setNotes, type ZoneKey } from './scales';

/**
 * Ambient beds per world: a continuous wind made of looped noise (two slow LFOs on level and colour, an
 * optional whistle for the cold worlds) plus sparse one-shot details — distant birds, crickets, faint
 * metallic creaks on the littered meadow, syrup bubbles, glowing chimes, rustling leaves, snow sifting.
 * Details run through the pooled ambient strips at the lowest priority, so they can never crowd the game.
 */

export type WorldId = 'w01' | 'w02' | 'w03' | 'w04' | 'w05' | 'w06' | 'w07' | 'w08' | 'w09' | 'w10';

export type AmbientEvent =
  | 'bird'
  | 'trill'
  | 'cricket'
  | 'creak'
  | 'clink'
  | 'gasVent'
  | 'cowbell'
  | 'bubble'
  | 'chime'
  | 'hoot'
  | 'drip'
  | 'rustle'
  | 'knock'
  | 'snowSift'
  | 'barnCreak'
  | 'windChime'
  | 'twinkle';

export interface WindSpec {
  color: 'pink' | 'brown';
  /** Low-pass cutoff (Hz). */
  lp: number;
  /** Gust LFO rate (Hz) and depth (0..1). */
  lfo: number;
  depth: number;
  gain: number;
  /** High airy layer level (0 = none). */
  hiss: number;
  /** Cold whistle: a narrow band drifting between f0 and f1. */
  whistle?: { f0: number; f1: number; q: number; gain: number };
}

export interface AmbientPreset {
  id: WorldId;
  name: string;
  zone: ZoneKey;
  wind: WindSpec;
  events: ReadonlyArray<{ kind: AmbientEvent; every: readonly [number, number]; gain: number }>;
}

export const AMBIENT_PRESETS: Readonly<Record<WorldId, AmbientPreset>> = {
  w09: {
    id: 'w09',
    name: 'Goldene Wiese (vermüllt)',
    zone: 'tjorizo',
    wind: { color: 'pink', lp: 760, lfo: 0.08, depth: 0.5, gain: 0.34, hiss: 0.03 },
    events: [
      { kind: 'cricket', every: [3, 7], gain: 0.05 },
      { kind: 'creak', every: [7, 16], gain: 0.05 },
      { kind: 'clink', every: [9, 22], gain: 0.035 },
      { kind: 'bird', every: [6, 14], gain: 0.04 },
      { kind: 'gasVent', every: [12, 28], gain: 0.035 },
      { kind: 'cowbell', every: [25, 55], gain: 0.03 },
    ],
  },
  w06: {
    id: 'w06',
    name: 'Schneekiefern',
    zone: 'tjorizo',
    wind: { color: 'pink', lp: 1500, lfo: 0.12, depth: 0.65, gain: 0.3, hiss: 0.05, whistle: { f0: 520, f1: 1150, q: 14, gain: 0.06 } },
    events: [
      { kind: 'snowSift', every: [6, 12], gain: 0.04 },
      { kind: 'bird', every: [22, 40], gain: 0.025 },
    ],
  },
  w04: {
    id: 'w04',
    name: 'Violette Hänge',
    zone: 'syrup',
    wind: { color: 'brown', lp: 520, lfo: 0.06, depth: 0.4, gain: 0.32, hiss: 0.015 },
    events: [
      { kind: 'bubble', every: [4, 9], gain: 0.06 },
      { kind: 'cricket', every: [5, 10], gain: 0.035 },
      { kind: 'bird', every: [10, 20], gain: 0.03 },
    ],
  },
  w05: {
    id: 'w05',
    name: 'Wurzelwelt',
    zone: 'syrup',
    wind: { color: 'pink', lp: 900, lfo: 0.07, depth: 0.45, gain: 0.24, hiss: 0.03, whistle: { f0: 700, f1: 1000, q: 16, gain: 0.03 } },
    events: [
      { kind: 'drip', every: [3, 8], gain: 0.05 },
      { kind: 'snowSift', every: [10, 20], gain: 0.03 },
    ],
  },
  w10: {
    id: 'w10',
    name: 'Juwelenwald',
    zone: 'syrup',
    wind: { color: 'brown', lp: 320, lfo: 0.05, depth: 0.35, gain: 0.28, hiss: 0.012 },
    events: [
      { kind: 'twinkle', every: [3, 7], gain: 0.04 },
      { kind: 'chime', every: [8, 16], gain: 0.035 },
      { kind: 'rustle', every: [10, 20], gain: 0.03 },
    ],
  },
  w02: {
    id: 'w02',
    name: 'Nebelhügel',
    zone: 'luzz',
    wind: { color: 'pink', lp: 1100, lfo: 0.05, depth: 0.4, gain: 0.28, hiss: 0.04 },
    events: [
      { kind: 'chime', every: [5, 11], gain: 0.04 },
      { kind: 'hoot', every: [15, 30], gain: 0.035 },
      { kind: 'drip', every: [9, 18], gain: 0.03 },
    ],
  },
  w07: {
    id: 'w07',
    name: 'Kathedralenwald',
    zone: 'luzz',
    wind: { color: 'brown', lp: 380, lfo: 0.04, depth: 0.35, gain: 0.32, hiss: 0.02 },
    events: [
      { kind: 'drip', every: [4, 9], gain: 0.045 },
      { kind: 'chime', every: [10, 20], gain: 0.03 },
      { kind: 'hoot', every: [20, 40], gain: 0.03 },
    ],
  },
  w01: {
    id: 'w01',
    name: 'Flechtenbaum',
    zone: 'wooding',
    wind: { color: 'pink', lp: 1300, lfo: 0.1, depth: 0.5, gain: 0.3, hiss: 0.035 },
    events: [
      { kind: 'bird', every: [2, 6], gain: 0.05 },
      { kind: 'trill', every: [6, 12], gain: 0.04 },
      { kind: 'rustle', every: [5, 10], gain: 0.05 },
      { kind: 'knock', every: [15, 30], gain: 0.03 },
    ],
  },
  w03: {
    id: 'w03',
    name: 'Kuppelbaum',
    zone: 'wooding',
    wind: { color: 'pink', lp: 1000, lfo: 0.07, depth: 0.45, gain: 0.26, hiss: 0.03 },
    events: [
      { kind: 'bird', every: [3, 8], gain: 0.045 },
      { kind: 'rustle', every: [6, 12], gain: 0.04 },
      { kind: 'knock', every: [18, 35], gain: 0.03 },
      { kind: 'cricket', every: [8, 16], gain: 0.03 },
    ],
  },
  w08: {
    id: 'w08',
    name: 'Rote Scheune im Schnee',
    zone: 'wooding',
    wind: { color: 'pink', lp: 1250, lfo: 0.1, depth: 0.6, gain: 0.28, hiss: 0.04, whistle: { f0: 600, f1: 950, q: 12, gain: 0.035 } },
    events: [
      { kind: 'barnCreak', every: [7, 15], gain: 0.05 },
      { kind: 'windChime', every: [10, 22], gain: 0.035 },
      { kind: 'snowSift', every: [8, 16], gain: 0.03 },
    ],
  },
};

export const WORLD_IDS = Object.keys(AMBIENT_PRESETS) as WorldId[];

/** The story world on the path for a zone (Wooding's second half is the first grove, Kuppelbaum). */
export function worldForZone(zone: ZoneKey, levelInZone = 0): WorldId {
  switch (zone) {
    case 'syrup':
      return 'w04';
    case 'luzz':
      return 'w02';
    case 'wooding':
      return levelInZone >= 12 ? 'w03' : 'w01';
    default:
      return 'w09';
  }
}

/**
 * Level trims (dB) per detail from the offline level check: with the preset gains the details sit ≈ 2–8 dB
 * over the bed's median (birds and chimes on top, sifting snow and rustles just above the wind).
 */
const DETAIL_TRIM_DB: Readonly<Record<AmbientEvent, number>> = {
  bird: 11,
  trill: 12,
  cricket: 14,
  creak: 16,
  clink: 14,
  gasVent: 23,
  cowbell: 14,
  bubble: 9,
  chime: 6,
  hoot: 7,
  drip: 13,
  rustle: 26,
  knock: 12,
  snowSift: 23,
  barnCreak: 21,
  windChime: 10,
  twinkle: 11,
};

/** One-shot details. `gain` is the preset's level for this kind; `pan` spreads them across the field. */
export function ambientDetail(g: AudioGraph, kind: AmbientEvent, t: number, gain: number, zone: ZoneKey): void {
  const r = g.rand;
  const pan = (r() * 2 - 1) * 0.8;
  const reverb = kind === 'drip' || kind === 'chime' || kind === 'hoot' ? 0.5 : 0.3;
  const s = g.voice('ambient', t, 2.5, 0, pan, reverb, Math.pow(10, DETAIL_TRIM_DB[kind] / 20));
  if (!s) return;
  switch (kind) {
    case 'bird': {
      const n = 2 + Math.floor(r() * 3);
      const base = 2600 + r() * 1600;
      for (let i = 0; i < n; i++) {
        const t0 = t + i * (0.09 + r() * 0.05);
        const o = s.osc('sine', base, t0, t0 + 0.12);
        o.frequency.setValueAtTime(base * (0.85 + r() * 0.3), t0);
        o.frequency.exponentialRampToValueAtTime(base * (1.05 + r() * 0.35), t0 + 0.07);
        const e = s.gain(0);
        e.gain.setValueAtTime(0, t0);
        e.gain.linearRampToValueAtTime(gain, t0 + 0.012);
        e.gain.setTargetAtTime(0, t0 + 0.05, 0.02);
        o.connect(e);
        e.connect(s.input);
      }
      break;
    }
    case 'trill': {
      const f = 3000 + r() * 900;
      const o = s.osc('sine', f, t, t + 0.6);
      const am = s.gain(0.5);
      const lfo = s.osc('square', 22 + r() * 6, t, t + 0.6);
      const ld = s.gain(0.5);
      lfo.connect(ld);
      ld.connect(am.gain);
      const e = s.gain(0);
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(gain * 0.8, t + 0.08);
      e.gain.setTargetAtTime(0, t + 0.4, 0.05);
      const lp = s.filter('lowpass', 5000, 0.7);
      o.connect(am);
      am.connect(e);
      e.connect(lp);
      lp.connect(s.input);
      break;
    }
    case 'cricket': {
      const f = 4300 + r() * 700;
      const groups = 2 + Math.floor(r() * 3);
      for (let k = 0; k < groups; k++) {
        const t0 = t + k * (0.28 + r() * 0.1);
        const o = s.osc('sine', f, t0, t0 + 0.14);
        const am = s.gain(0.5);
        const lfo = s.osc('square', 34, t0, t0 + 0.14);
        const ld = s.gain(0.5);
        lfo.connect(ld);
        ld.connect(am.gain);
        const e = s.gain(0);
        e.gain.setValueAtTime(0, t0);
        e.gain.linearRampToValueAtTime(gain * 0.6, t0 + 0.02);
        e.gain.setTargetAtTime(0, t0 + 0.09, 0.015);
        o.connect(am);
        am.connect(e);
        e.connect(s.input);
      }
      break;
    }
    case 'creak': {
      // Bowed old metal far away: inharmonic partials drifting, slow swell, band-limited.
      const f = 170 + r() * 240;
      const bp = s.filter('bandpass', f * 2.2, 0.9);
      bp.connect(s.input);
      for (const [k, a] of [
        [1, 1],
        [2.31, 0.6],
        [3.93, 0.3],
      ] as const) {
        const o = s.osc('triangle', f * k, t, t + 2.2);
        o.frequency.setValueAtTime(f * k, t);
        o.frequency.linearRampToValueAtTime(f * k * (0.96 + r() * 0.08), t + 1.6);
        const e = s.gain(0);
        e.gain.setValueAtTime(0, t);
        e.gain.linearRampToValueAtTime(gain * a * 0.6, t + 0.35 + r() * 0.2);
        e.gain.setTargetAtTime(0, t + 0.7, 0.3);
        o.connect(e);
        e.connect(bp);
      }
      break;
    }
    case 'clink': {
      const f = 900 + r() * 900;
      for (const [k, a, d] of [
        [1, 1, 0.3],
        [2.76, 0.5, 0.15],
        [5.4, 0.25, 0.08],
      ] as const)
        partial(s, t, f * k, gain * a, d);
      break;
    }
    case 'gasVent':
      noiseHit(s, t, { kind: 'pink', dur: 0.9, amp: gain * 1.3, type: 'bandpass', f0: 1800, f1: 900, q: 0.8, attack: 0.25 });
      break;
    case 'cowbell': {
      const f = 560 + r() * 60;
      const lp = s.filter('lowpass', 1800, 0.7);
      lp.connect(s.input);
      for (const [k, a, d] of [
        [1, 1, 0.9],
        [1.51, 0.6, 0.6],
        [2.33, 0.35, 0.35],
      ] as const)
        partial(s, t, f * k, gain * a * 0.8, d, { out: lp });
      if (r() < 0.6) for (const [k, a, d] of [[1, 0.7, 0.8] as const, [1.51, 0.4, 0.5] as const]) partial(s, t + 0.42, f * k, gain * a * 0.8, d, { out: lp });
      break;
    }
    case 'bubble':
      plip(s, t, 90 + r() * 70, gain * 1.6, undefined, 1.45, 0.22);
      if (r() < 0.5) plip(s, t + 0.2 + r() * 0.2, 120 + r() * 60, gain, undefined, 1.4, 0.18);
      break;
    case 'chime': {
      const notes = setNotes(zone, 79, 96);
      const n = notes[Math.floor(r() * notes.length)] ?? 84;
      glass(s, t, mtof(n), gain * 1.6, 1.6, undefined, 0.02);
      break;
    }
    case 'hoot': {
      const f = 360 + r() * 50;
      flute(s, t, f, gain * 3, 0.18);
      flute(s, t + 0.42, f * 0.94, gain * 2.6, 0.26);
      break;
    }
    case 'drip':
      plip(s, t, 1300 + r() * 900, gain * 1.6, undefined, 2, 0.06);
      break;
    case 'rustle': {
      const dur = 0.6 + r() * 0.8;
      const n = s.noise('pink', t, t + dur + 0.1);
      const bp = s.filter('bandpass', 3200 + r() * 1500, 0.8);
      const am = s.gain(0.4);
      const lfo = s.osc('sine', 7 + r() * 6, t, t + dur + 0.1);
      const ld = s.gain(0.4);
      lfo.connect(ld);
      ld.connect(am.gain);
      const e = s.gain(0);
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(gain * 2.2, t + dur * 0.4);
      e.gain.setTargetAtTime(0, t + dur * 0.5, dur * 0.2);
      n.connect(bp);
      bp.connect(am);
      am.connect(e);
      e.connect(s.input);
      break;
    }
    case 'knock': {
      const f = 650 + r() * 250;
      const n = 4 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) marimba(s, t + i * 0.065, f, gain * (1.4 - i * 0.12), 0.1);
      break;
    }
    case 'snowSift':
      noiseHit(s, t, { kind: 'pink', dur: 1.4, amp: gain * 1.5, type: 'highpass', f0: 4500, f1: 6500, q: 0.6, attack: 0.5 });
      break;
    case 'barnCreak': {
      const o = s.osc('sawtooth', 85 + r() * 25, t, t + 1.1);
      o.frequency.linearRampToValueAtTime(70 + r() * 30, t + 0.9);
      const bp = s.filter('bandpass', 420, 4);
      const am = s.gain(0.5);
      const lfo = s.osc('square', 16 + r() * 8, t, t + 1.1);
      const ld = s.gain(0.5);
      lfo.connect(ld);
      ld.connect(am.gain);
      const e = s.gain(0);
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(gain * 1.4, t + 0.3);
      e.gain.setTargetAtTime(0, t + 0.7, 0.12);
      o.connect(bp);
      bp.connect(am);
      am.connect(e);
      e.connect(s.input);
      break;
    }
    case 'windChime': {
      const notes = setNotes(zone, 84, 100);
      for (let i = 0; i < 3; i++) {
        const n = notes[Math.floor(r() * notes.length)] ?? 88;
        glass(s, t + i * (0.15 + r() * 0.2), mtof(n), gain * 1.3, 1.2);
      }
      break;
    }
    case 'twinkle': {
      const notes = setNotes(zone, 91, 103);
      for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
        const n = notes[Math.floor(r() * notes.length)] ?? 96;
        glass(s, t + i * 0.11, mtof(n), gain * 1.2, 0.5);
      }
      break;
    }
    default:
      break;
  }
}

/** The wind body sits ≈ 2 dB under the preset gains (the details carry the character). */
const BED_TRIM = 0.8;

/** A running ambient bed: continuous wind nodes plus a pump that schedules details ahead of time. */
export class AmbientBed {
  readonly out: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly next: number[];
  private stopped = false;

  constructor(
    private readonly g: AudioGraph,
    readonly preset: AmbientPreset,
    t0: number,
    fadeIn: number,
  ) {
    const ctx = g.ctx;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, t0);
    this.out.gain.linearRampToValueAtTime(1, t0 + fadeIn);
    this.out.connect(g.busIn.ambient);
    const w = preset.wind;
    const src = (kind: 'pink' | 'brown', rate: number): AudioBufferSourceNode => {
      const s = ctx.createBufferSource();
      s.buffer = g.noise(kind);
      s.loop = true;
      s.playbackRate.value = rate;
      s.start(t0, g.rand() * 2);
      this.sources.push(s);
      return s;
    };
    const lfo = (freq: number): OscillatorNode => {
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      o.start(t0);
      this.sources.push(o);
      return o;
    };
    // Body: noise → low-pass (colour LFO) → level (gust LFO).
    const body = src(w.color, 0.97);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = w.lp;
    lp.Q.value = 0.5;
    const colour = lfo(w.lfo * 0.7);
    const colourDepth = ctx.createGain();
    colourDepth.gain.value = w.lp * 0.35;
    colour.connect(colourDepth);
    colourDepth.connect(lp.frequency);
    const level = ctx.createGain();
    level.gain.value = w.gain * (1 - w.depth * 0.5) * BED_TRIM;
    const gust = lfo(w.lfo);
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = w.gain * w.depth * 0.5 * BED_TRIM;
    gust.connect(gustDepth);
    gustDepth.connect(level.gain);
    body.connect(lp);
    lp.connect(level);
    level.connect(this.out);
    // Second, slower body layer at another rate (breaks the loop period, widens the gusts).
    const body2 = src(w.color, 1.06);
    const lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = w.lp * 0.6;
    const level2 = ctx.createGain();
    level2.gain.value = w.gain * 0.45 * BED_TRIM;
    const gust2 = lfo(w.lfo * 0.53);
    const gust2Depth = ctx.createGain();
    gust2Depth.gain.value = w.gain * 0.35 * BED_TRIM;
    gust2.connect(gust2Depth);
    gust2Depth.connect(level2.gain);
    body2.connect(lp2);
    lp2.connect(level2);
    level2.connect(this.out);
    if (w.hiss > 0) {
      const air = src('pink', 1.9);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2500;
      const al = ctx.createGain();
      al.gain.value = w.hiss;
      const airLfo = lfo(w.lfo * 1.3);
      const airDepth = ctx.createGain();
      airDepth.gain.value = w.hiss * 0.6;
      airLfo.connect(airDepth);
      airDepth.connect(al.gain);
      air.connect(hp);
      hp.connect(al);
      al.connect(this.out);
    }
    if (w.whistle) {
      const wh = w.whistle;
      const n = src('pink', 1.2);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = wh.q;
      bp.frequency.value = (wh.f0 + wh.f1) / 2;
      const sweep = lfo(0.045);
      const sweepDepth = ctx.createGain();
      sweepDepth.gain.value = (wh.f1 - wh.f0) / 2;
      sweep.connect(sweepDepth);
      sweepDepth.connect(bp.frequency);
      const wl = ctx.createGain();
      wl.gain.value = wh.gain * 0.6;
      const wlLfo = lfo(0.07);
      const wlDepth = ctx.createGain();
      wlDepth.gain.value = wh.gain * 0.5;
      wlLfo.connect(wlDepth);
      wlDepth.connect(wl.gain);
      n.connect(bp);
      bp.connect(wl);
      wl.connect(this.out);
    }
    this.next = preset.events.map((e) => t0 + e.every[0] * 0.3 + g.rand() * (e.every[1] - e.every[0]) * 0.6);
  }

  /** Drops details that should have started before `t` (a stalled page) instead of bunching them up. */
  skipBefore(t: number): void {
    this.preset.events.forEach((e, i) => {
      while (this.next[i]! < t - 0.1) this.next[i] = this.next[i]! + e.every[0] + this.g.rand() * (e.every[1] - e.every[0]);
    });
  }

  /** Schedules the details that fall before `until` (context time). */
  pump(until: number): void {
    if (this.stopped) return;
    this.preset.events.forEach((e, i) => {
      let at = this.next[i]!;
      while (at < until) {
        ambientDetail(this.g, e.kind, at, e.gain, this.preset.zone);
        at += e.every[0] + this.g.rand() * (e.every[1] - e.every[0]);
      }
      this.next[i] = at;
    });
  }

  /** Fades out and stops everything (works ahead of time, so offline renders can crossfade beds too). */
  stop(t: number, fade: number): void {
    if (this.stopped) return;
    this.stopped = true;
    const p = this.out.gain;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(0, t + fade);
    for (const s of this.sources) {
      try {
        s.stop(t + fade + 0.05);
      } catch {
        // already stopped
      }
    }
    // Once its sources have stopped the chain has no inputs left and is garbage-collected with the bed.
    this.sources.length = 0;
  }
}
