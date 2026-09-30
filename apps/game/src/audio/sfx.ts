import type { AudioGraph, Strip } from './graph';
import { bass, clamp, crackle, flutter, glass, glide, kalimba, mallet, marimba, noiseHit, pad, partial, plip, pluck, puff, thump, whoosh, wobble } from './dsp';
import { chainNote, mtof, stepFrom, ZONE_MUSIC, type ZoneKey } from './scales';
import { roar, yawn, yip } from './voice';
import { EXTRA_TRIM_DB, extraPlayers } from './sfxExtra';
import { currentTrim, jitter, richOf, sfxVoice, V, withTrim, Z, type Player } from './sfxKit';

/**
 * The sound catalogue. Every sound is a small recipe on a borrowed strip, parameterised by zone (key),
 * material, tier, creature coat/body and stereo position. Loudness (max 100 ms RMS, default mix, see
 * `TRIM_DB`): merges −23 → −18 dBFS as the tier grows, win −20, REX −24, landings and splashes ≈ −32,
 * whooshes −36, UI ticks −40; the limiter only catches stacking. Low sounds carry a mid "tock" so they still
 * read on phone speakers. Variation (±cents, velocity, droplet timing) keeps repeats from sounding mechanical.
 */

export type Material = 'jelly' | 'liquid' | 'gas' | 'fire';
export type BodyKind = 'blob' | 'snake' | 'quadruped' | 'biped' | 'heavy';
export type Coat = 'bare' | 'fur' | 'feather';
export type SwipeDir = 'up' | 'down' | 'left' | 'right';

export interface SfxParams {
  zone?: ZoneKey;
  tier?: number;
  material?: Material;
  body?: BodyKind;
  coat?: Coat;
  /** −1 (left) … 1 (right). */
  pan?: number;
  /** How many things this one sound stands for (grouped stops, removed blobs …). */
  count?: number;
  /** Distance in cells (slides). */
  cells?: number;
  /** Duration hint (s): slide travel, coil wrap … */
  dur?: number;
  dir?: SwipeDir;
  /** Sub-kind: special kind, blocker variant, 'big' splash … */
  kind?: string;
  /** Running total (spores collected). */
  total?: number;
  /** Layers left (scrap, cages). */
  layers?: number;
  /** Intensity multiplier 0..1.5. */
  vel?: number;
  /** Extra pentatonic steps above the tier's note (simultaneous merges harmonise into a rising chord). */
  step?: number;
}

// ------------------------------------------------------------------------------------------ movement

const slide: Player = (g, t, p) => {
  const cells = clamp(p.cells ?? 1, 1, 7);
  const n = Math.max(1, p.count ?? 1);
  const dur = clamp(p.dur ?? 0.2 + 0.09 * cells, 0.16, 0.9);
  const side = p.dir === 'left' ? 1 : p.dir === 'right' ? -1 : 0;
  const s = g.voice('sfx', t, dur * 1.4, 1, side * 0.35, 0.06, currentTrim());
  if (!s) return;
  s.panTo(-side * 0.35, t, dur);
  const up = p.dir === 'up' ? 1.14 : p.dir === 'down' ? 0.88 : 1;
  const k = jitter(g, 60);
  const amp = 0.2 * (0.75 + 0.25 * Math.min(2.2, Math.sqrt(n))) * V(p);
  whoosh(s, t, dur, 320 * up * k, (650 + 170 * cells) * up * k, 360 * up, amp, 1.0);
  noiseHit(s, t + dur * 0.08, { kind: 'brown', dur: dur * 0.8, amp: 0.06 * Math.min(2, Math.sqrt(n)) * V(p), type: 'lowpass', f0: 420, q: 0.5, attack: dur * 0.3 });
};

const stop: Player = (g, t, p) => {
  const tier = p.tier ?? 2;
  const k = clamp((tier - 1) / 9, 0, 1);
  const vel = V(p) * (0.8 + 0.2 * Math.min(2, Math.sqrt(p.count ?? 1)));
  const s = sfxVoice(g, t, 0.5, 1, p, 0.1);
  if (!s) return;
  if (p.coat === 'feather') {
    flutter(s, t, 0.2, 0.6 * vel, 26);
    thump(s, t + 0.015, 190, 130, 0.3 * vel, 0.08, undefined, 0.3);
    return;
  }
  if (p.coat === 'fur') {
    thump(s, t, 150 - 40 * k, 90 - 20 * k, 0.3 * vel, 0.15, undefined, 0.6);
    noiseHit(s, t, { kind: 'pink', dur: 0.09, amp: 0.45 * vel, type: 'bandpass', f0: 750, q: 0.8 });
    return;
  }
  if (p.body === 'heavy') {
    thump(s, t, 100, 55, 0.26 * vel, 0.26, undefined, 0.8);
    noiseHit(s, t, { kind: 'pink', dur: 0.16, amp: 0.45 * vel, type: 'lowpass', f0: 1200, f1: 450, q: 0.6 });
    return;
  }
  if (p.body === 'snake') {
    noiseHit(s, t, { kind: 'white', dur: 0.17, amp: 0.22 * vel, type: 'bandpass', f0: 5200, f1: 3600, q: 0.9, attack: 0.03 });
    thump(s, t, 150, 105, 0.25 * vel, 0.09, undefined, 0.2);
    return;
  }
  const f = jitter(g, 50);
  switch (p.material ?? 'jelly') {
    case 'liquid':
      plip(s, t, (740 - 290 * k) * f, 0.5 * vel);
      plip(s, t + 0.065, (740 - 290 * k) * 1.36 * f, 0.24 * vel);
      noiseHit(s, t, { kind: 'white', dur: 0.04, amp: 0.1 * vel, type: 'bandpass', f0: 2400, q: 1 });
      break;
    case 'gas':
      puff(s, t, 0.5 * vel, 1300 - 500 * k, 0.26);
      glide(s, t, (260 - 60 * k) * f, (190 - 50 * k) * f, 0.13, 0.14 * vel);
      break;
    case 'fire':
      crackle(s, t, 0.34, 0.6 * vel, 2600);
      thump(s, t, 112, 62, 0.3 * vel, 0.12, undefined, 0.2);
      break;
    default:
      wobble(s, t, (360 - 110 * k) * f, 0.3 * vel, 0.3 + 0.1 * k, 13 - 3 * k, 0.12);
      noiseHit(s, t, { kind: 'pink', dur: 0.06 + 0.04 * k, amp: (0.16 + 0.12 * k) * vel, type: 'bandpass', f0: 900 - 250 * k, q: 0.9 });
      break;
  }
};

// ------------------------------------------------------------------------------------------ merges

/** The musical merge: the new tier's step on the zone's pentatonic, richer as the tier grows. */
const merge: Player = (g, t, p) => {
  const zone = Z(p);
  const T = clamp(Math.round(p.tier ?? 2), 1, 14);
  const rich = richOf(T);
  const note = stepFrom(zone, chainNote(zone, T), Math.max(0, Math.round(p.step ?? 0)));
  const f = mtof(note) * jitter(g, 4);
  // A touch of human variation (velocity, mallet hardness) so the most frequent sound never machine-guns.
  const vel = V(p) * (0.55 + 0.3 * rich) * (0.94 + g.rand() * 0.12);
  const hard = (g.rand() - 0.5) * 0.16;
  const s = sfxVoice(g, t, 1.4 + 2.4 * rich, T >= 7 ? 3 : 2, p, 0.16 + 0.22 * rich);
  if (!s) return;
  switch (p.material ?? 'jelly') {
    case 'liquid':
      marimba(s, t, f, vel * 0.9, 0.35 + hard);
      plip(s, t + 0.025, f * 2, 0.07 * vel, undefined, 1.8);
      plip(s, t + 0.085, f * 3, 0.045 * vel, undefined, 1.6);
      break;
    case 'gas':
      glass(s, t, f, vel * 0.85, 0.75, undefined, 0.012);
      partial(s, t, f, 0.25 * vel, 0.9, { attack: 0.02 });
      puff(s, t, 0.05 * vel, Math.min(6000, f * 3), 0.3);
      break;
    case 'fire':
      pluck(s, t, f, vel, 0.5);
      marimba(s, t, f, vel * 0.45, 0.3);
      crackle(s, t + 0.02, 0.3, 0.06 * vel, 3000);
      break;
    default:
      marimba(s, t, f, vel, (f < 330 ? 0.7 : 0.45) + hard);
      wobble(s, t, f / 2, 0.09 * vel, 0.22, 14, 0.07);
      break;
  }
  if (T >= 4) glass(s, t + 0.03, mtof(stepFrom(zone, note, 5)), (0.1 + 0.12 * rich) * V(p), 0.55 + 0.7 * rich);
  if (T >= 6) {
    marimba(s, t + 0.055, mtof(stepFrom(zone, note, 2)), vel * 0.5, 0.4);
    marimba(s, t + 0.11, mtof(stepFrom(zone, note, 4)), vel * 0.46, 0.45);
    bass(s, t, mtof(note - (T >= 8 ? 24 : 12)), 0.4 * V(p), 1.4 + rich);
  }
  if (T >= 8) {
    pad(s, t + 0.04, [mtof(note - 12), mtof(stepFrom(zone, note - 12, 2)), mtof(stepFrom(zone, note - 12, 4))], 0.16 * V(p), 0.25, 0.35, 1.8, 1500);
    glass(s, t + 0.16, mtof(note + 24), 0.12 * V(p), 1.4);
  }
  if (T >= 10) {
    for (let i = 0; i < 4; i++) glass(s, t + 0.24 + i * 0.07, mtof(stepFrom(zone, note + 24, -i)), (0.1 - i * 0.015) * V(p), 1.1);
  }
  g.duckBus('music', t, 0.22 + 0.04 * Math.min(8, T), 0.12 + 0.12 * rich);
};

/** Impact crown and droplets (the visual splash), by material; big tiers add a soft low boom. */
const splash: Player = (g, t, p) => {
  const T = p.tier ?? 2;
  const rich = richOf(T);
  const big = p.kind === 'big' || T >= 7;
  const s = sfxVoice(g, t, 0.9, 1, p, 0.2 + 0.12 * rich);
  if (!s) return;
  const mat = p.material ?? 'jelly';
  const amp = (0.14 + 0.1 * rich) * V(p);
  if (mat === 'gas') {
    puff(s, t, amp * 2.6, 1900, 0.38);
    whoosh(s, t, 0.3, 700, 2200, 1500, amp * 2.5, 0.9, undefined, 0.3);
  } else if (mat === 'fire') {
    noiseHit(s, t, { kind: 'pink', dur: 0.26, amp: amp * 3.2, type: 'lowpass', f0: 1900, f1: 450, q: 0.7, attack: 0.006 });
    crackle(s, t, 0.42, amp * 2, 2800);
  } else {
    noiseHit(s, t, { kind: 'white', dur: 0.14 + 0.08 * rich, amp: amp * 3.4, type: 'bandpass', f0: 2600, f1: 650, q: 0.8, attack: 0.004 });
    noiseHit(s, t, { kind: 'pink', dur: 0.09, amp: amp * 2.4, type: 'lowpass', f0: 720, q: 0.6 });
    if (mat === 'jelly') wobble(s, t, 170 * jitter(g, 60), amp * 0.6, 0.24, 15, 0.1);
  }
  const drops = (mat === 'liquid' ? 4 : mat === 'gas' ? 1 : 2) + Math.min(5, Math.floor(T / 2));
  for (let i = 0; i < drops; i++) {
    const dt = 0.05 + g.rand() * (0.22 + 0.22 * rich);
    plip(s, t + dt, 950 + g.rand() * 1500, (0.05 + 0.05 * g.rand()) * (0.7 + rich) * V(p));
  }
  if (big) thump(s, t, 92, 42, (0.26 + 0.12 * rich) * V(p), 0.45, undefined, 0.5);
};

/** The child pops out of the merge: a soft rising bloop (a sparkle for the big ones). */
const childPop: Player = (g, t, p) => {
  const zone = Z(p);
  const T = p.tier ?? 2;
  const s = sfxVoice(g, t, 0.5, 1, p, 0.12);
  if (!s) return;
  const f = mtof(chainNote(zone, T));
  glide(s, t, f, f * 2, 0.09, 0.09 * V(p));
  if (T >= 6) glass(s, t + 0.04, mtof(chainNote(zone, T) + 24), 0.07 * V(p), 0.5);
};

const leapUp: Player = (g, t, p) => {
  const T = p.tier ?? 6;
  const s = sfxVoice(g, t, 0.4, 2, p, 0.1);
  if (!s) return;
  whoosh(s, t, 0.22, 350, 2600, 1900, 0.2 * V(p), 1.2, undefined, 0.75);
  glide(s, t, 300, 820 + 40 * T, 0.17, 0.05 * V(p));
};

const creatureVoice: Player = (g, t, p) => {
  const T = p.tier ?? 7;
  if (T >= 7) roar(g, t, T, p.pan ?? 0);
  else yip(g, t, T, p.pan ?? 0);
};

const diveWhoosh: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.3, 1, p, 0.08);
  if (!s) return;
  whoosh(s, t, 0.14, 2300, 1700, 420, 0.15 * V(p), 1.1, undefined, 0.3);
};

/** "Nom": teeth click plus a round little chomp. */
const bite: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.3, 2, p, 0.1);
  if (!s) return;
  noiseHit(s, t, { kind: 'white', dur: 0.024, amp: 0.4 * V(p), type: 'bandpass', f0: 1600, q: 1.6 });
  thump(s, t, 220, 110, 0.24 * V(p), 0.1, undefined, 0.4);
  noiseHit(s, t + 0.05, { kind: 'white', dur: 0.016, amp: 0.2 * V(p), type: 'bandpass', f0: 2200, q: 1.6 });
};

/** "Nom nom": two muffled chews with a little closed-mouth hum. */
const chew: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.4, 1, p, 0.06);
  if (!s) return;
  for (const [dt, a] of [
    [0, 0.1],
    [0.1, 0.08],
  ] as const) {
    thump(s, t + dt, 135, 92, a * V(p), 0.07, undefined, 0.6);
    partial(s, t + dt + 0.01, 390, a * 0.45 * V(p), 0.06, { attack: 0.01 });
  }
};

/** Snake: scales rustle while it coils, a rubbery squeeze. */
const coil: Player = (g, t, p) => {
  const dur = p.dur ?? 0.3;
  const s = sfxVoice(g, t, dur + 0.3, 1, p, 0.1);
  if (!s) return;
  const n = s.noise('white', t, t + dur + 0.1);
  const bp = s.filter('bandpass', 4600, 0.9);
  bp.frequency.setValueAtTime(4600, t);
  bp.frequency.exponentialRampToValueAtTime(3000, t + dur);
  const am = s.gain(0.55);
  const lfo = s.osc('sine', 9, t, t + dur + 0.1);
  const ld = s.gain(0.45);
  lfo.connect(ld);
  ld.connect(am.gain);
  const env = s.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.07 * V(p), t + dur * 0.5);
  env.gain.setTargetAtTime(0, t + dur * 0.8, 0.05);
  n.connect(bp);
  bp.connect(am);
  am.connect(env);
  env.connect(s.input);
  glide(s, t + dur * 0.4, 190, 145, 0.26, 0.04 * V(p), undefined, 'triangle');
};

const gulp: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.4, 1, p, 0.08);
  if (!s) return;
  thump(s, t, 230, 95, 0.2 * V(p), 0.14, undefined, 0.3);
  plip(s, t + 0.07, 420, 0.14 * V(p), undefined, 1.6, 0.08);
};

const stompRear: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.4, 1, p, 0.06);
  if (!s) return;
  whoosh(s, t, 0.18, 300, 950, 700, 0.07 * V(p), 0.9);
};

const stomp: Player = (g, t, p) => {
  const T = p.tier ?? 7;
  const s = sfxVoice(g, t, 0.8, 2, p, 0.14);
  if (!s) return;
  thump(s, t, 80, 40, (0.42 + 0.03 * Math.max(0, T - 7)) * V(p), 0.5, undefined, 0.8);
  noiseHit(s, t, { kind: 'brown', dur: 0.4, amp: 0.13 * V(p), type: 'lowpass', f0: 380, q: 0.5, attack: 0.01 });
  noiseHit(s, t, { kind: 'pink', dur: 0.14, amp: 0.6 * V(p), type: 'lowpass', f0: 1500, f1: 500, q: 0.6 });
  partial(s, t, 310, 0.22 * V(p), 0.2);
  partial(s, t, 520, 0.1 * V(p), 0.12);
  mallet(s, t, 900, 0.1 * V(p));
};

// ------------------------------------------------------------------------------------------ specials

const popOut: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.25, 1, p, 0.1);
  if (!s) return;
  plip(s, t, 520 + g.rand() * 380, 0.11 * V(p), undefined, 2.8, 0.05);
  noiseHit(s, t, { kind: 'white', dur: 0.03, amp: 0.04 * V(p), type: 'bandpass', f0: 3000, q: 1 });
};

function lineZap(s: Strip, g: AudioGraph, t: number, zone: ZoneKey, vel: number, up: boolean): void {
  const o = s.osc('sawtooth', up ? 200 : 1500, t, t + 0.45);
  o.frequency.setValueAtTime(up ? 200 : 1500, t);
  o.frequency.exponentialRampToValueAtTime(up ? 1500 : 220, t + 0.24);
  const lp = s.filter('lowpass', 900, 3);
  lp.frequency.setValueAtTime(700, t);
  lp.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
  lp.frequency.exponentialRampToValueAtTime(600, t + 0.42);
  const e = s.gain(0);
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(0.07 * vel, t + 0.03);
  e.gain.setTargetAtTime(0, t + 0.2, 0.06);
  o.connect(lp);
  lp.connect(e);
  e.connect(s.input);
  const base = ZONE_MUSIC[zone].chainRoot + 12;
  for (let i = 0; i < 5; i++) glass(s, t + 0.03 + i * 0.035, mtof(stepFrom(zone, base, up ? i : 4 - i)), 0.13 * vel, 0.6);
}

const special: Player = (g, t, p) => {
  const zone = Z(p);
  const kind = p.kind ?? 'line';
  const s = sfxVoice(g, t, 1.4, 3, p, 0.22);
  if (!s) return;
  const vel = V(p);
  const burstIt = (scale: number): void => {
    thump(s, t, 190, 46, 0.36 * scale * vel, 0.38, undefined, 0.6);
    puff(s, t, 0.2 * scale * vel, 2600, 0.32);
    const root = chainNote(zone, 7);
    for (const [i, d] of [0, 2, 4].entries()) glass(s, t + 0.02 + i * 0.02, mtof(stepFrom(zone, root, d)), 0.14 * vel, 0.9);
    for (let i = 0; i < 4; i++) plip(s, t + 0.12 + g.rand() * 0.35, 900 + g.rand() * 1400, 0.035 * vel);
  };
  switch (kind) {
    case 'burst':
      burstIt(1);
      break;
    case 'burst5':
      burstIt(1.25);
      break;
    case 'cross':
      lineZap(s, g, t, zone, vel, true);
      lineZap(s, g, t + 0.06, zone, vel * 0.8, false);
      break;
    case 'tripleCross':
      lineZap(s, g, t, zone, vel, true);
      lineZap(s, g, t + 0.06, zone, vel * 0.8, false);
      burstIt(0.8);
      break;
    default:
      lineZap(s, g, t, zone, vel, true);
      break;
  }
  g.duckBus('music', t, 0.4, 0.3);
};

const promote: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1.2, 2, p, 0.25);
  if (!s) return;
  const base = ZONE_MUSIC[zone].chainRoot + 12;
  for (let i = 0; i < 4; i++) glass(s, t + i * 0.042, mtof(stepFrom(zone, base, i * 2)), 0.15 * V(p), 0.8);
  whoosh(s, t, 0.3, 600, 3000, 2400, 0.05 * V(p), 1, undefined, 0.8);
};

const tierBomb: Player = (g, t, p) => {
  special(g, t, { ...p, kind: 'burst5' });
  const zone = Z(p);
  const s = sfxVoice(g, t + 0.1, 1.2, 2, p, 0.3);
  if (!s) return;
  const top = ZONE_MUSIC[zone].chainRoot + 24;
  for (let i = 0; i < 5; i++) glass(s, t + 0.1 + i * 0.06, mtof(stepFrom(zone, top, -i)), 0.12 * V(p), 0.9);
};

// ------------------------------------------------------------------------------------------ graduation & side effects

/** Flying chime: an airy rise and a pentatonic glissando of bells. */
const release: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1.6, 2, p, 0.3);
  if (!s) return;
  whoosh(s, t, 0.55, 380, 3200, 2600, 0.09 * V(p), 0.9, undefined, 0.7);
  const start = chainNote(zone, Math.max(4, p.tier ?? 6));
  for (let i = 0; i < 6; i++) glass(s, t + 0.04 + i * 0.07, mtof(stepFrom(zone, start, i)), (0.17 - i * 0.015) * V(p), 0.9);
  glide(s, t + 0.05, 500, 1500, 0.4, 0.03 * V(p));
};

const deliver: Player = (g, t, p) => {
  release(g, t, p);
  const zone = Z(p);
  const s = sfxVoice(g, t + 0.3, 1.2, 2, p, 0.25);
  if (!s) return;
  const n = chainNote(zone, 9);
  glass(s, t + 0.3, mtof(n), 0.18 * V(p), 1.2);
  glass(s, t + 0.39, mtof(stepFrom(zone, n, 3)), 0.18 * V(p), 1.4);
};

const spawn: Player = (g, t, p) => {
  const T = p.tier ?? 1;
  const s = sfxVoice(g, t, 0.4, 0, p, 0.08);
  if (!s) return;
  puff(s, t, 0.05 * V(p), 900, 0.22);
  const f = 300 + 35 * T;
  if (p.kind === 'amoeba') wobble(s, t + 0.05, f * 0.8, 0.1 * V(p), 0.25, 11, 0.12);
  else glide(s, t + 0.05, f, f * 1.7, 0.07, 0.08 * V(p));
};

/** Tiny bloom chime: three bell notes opening upward, a leafy fwip, two petals. */
const heal: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1.2, 1, p, 0.22);
  if (!s) return;
  const base = ZONE_MUSIC[zone].chainRoot + 12;
  const off = Math.floor(g.rand() * 3);
  for (let i = 0; i < 3; i++) glass(s, t + i * 0.055, mtof(stepFrom(zone, base, off + i * 2)), 0.15 * V(p), 0.8);
  noiseHit(s, t, { kind: 'pink', dur: 0.18, amp: 0.05 * V(p), type: 'bandpass', f0: 1500, f1: 4200, q: 1.2, attack: 0.05 });
  plip(s, t + 0.14, 1800, 0.03 * V(p));
  plip(s, t + 0.22, 2300, 0.025 * V(p));
};

const healStep: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 0.6, 1, p, 0.12);
  if (!s) return;
  puff(s, t, 0.12 * V(p), 900, 0.3);
  marimba(s, t, mtof(ZONE_MUSIC[zone].chainRoot), 0.16 * V(p), 0.25);
};

/** Spore sparkle: quick high twinkles that climb with the running total. */
const collect: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1, 1, p, 0.25);
  if (!s) return;
  const base = chainNote(zone, 7 + Math.min(5, Math.max(0, (p.total ?? 1) - 1)));
  for (let i = 0; i < 5; i++) glass(s, t + i * 0.034 + g.rand() * 0.02, mtof(stepFrom(zone, base, Math.floor(g.rand() * 4))), (0.08 + 0.05 * g.rand()) * V(p), 0.5);
  glide(s, t, 620, 1650, 0.12, 0.04 * V(p));
};

/** Scrap layer: a soft clank (inharmonic, damped) and a rattle; the last layer tumbles away. */
const scrap: Player = (g, t, p) => {
  const layers = p.layers ?? 1;
  const s = sfxVoice(g, t, 0.8, 2, p, 0.14);
  if (!s) return;
  const lp = s.filter('lowpass', 3200, 0.6);
  lp.connect(s.input);
  const f = (330 + 40 * layers) * jitter(g, 40);
  for (const [r, a, d] of [
    [1, 0.16, 0.28],
    [2.76, 0.09, 0.18],
    [5.4, 0.05, 0.1],
    [8.93, 0.03, 0.06],
  ] as const) partial(s, t, f * r, a * V(p), d, { out: lp });
  crackle(s, t, 0.16, 0.08 * V(p), 3400);
  if (layers <= 0) {
    for (let i = 0; i < 3; i++) partial(s, t + 0.09 + i * 0.075, f * (1.6 + i * 0.35), 0.05 * V(p), 0.12, { out: lp });
    glass(s, t + 0.3, mtof(chainNote(Z(p), 8)), 0.08 * V(p), 0.7);
  }
};

const mound: Player = (g, t, p) => {
  const layers = p.layers ?? 1;
  const s = sfxVoice(g, t, 1.2, 2, p, 0.16);
  if (!s) return;
  const lp = s.filter('lowpass', 2400, 0.6);
  lp.connect(s.input);
  const f = 190 * jitter(g, 30);
  for (const [r, a, d] of [
    [1, 0.18, 0.4],
    [2.76, 0.08, 0.25],
    [5.4, 0.04, 0.12],
  ] as const) partial(s, t, f * r, a * V(p), d, { out: lp });
  thump(s, t, 110, 55, 0.25 * V(p), 0.3, undefined, 0.6);
  noiseHit(s, t + 0.02, { kind: 'brown', dur: 0.35, amp: 0.1 * V(p), type: 'lowpass', f0: 700, q: 0.5 });
  if (layers <= 0) for (let i = 0; i < 4; i++) partial(s, t + 0.25 + i * 0.07, f * (2 + i * 0.4), 0.05 * V(p), 0.14, { out: lp });
};

/** Crust / ice crack: brittle clicks, a glassy tinkle, a melting drip. */
const crustCrack: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.7, 2, p, 0.18);
  if (!s) return;
  for (let i = 0; i < 4; i++) noiseHit(s, t + i * 0.018 + g.rand() * 0.01, { kind: 'white', dur: 0.012 + g.rand() * 0.01, amp: (0.14 - i * 0.02) * V(p), type: 'bandpass', f0: 1500 + g.rand() * 2500, q: 1.4 });
  glass(s, t + 0.05, 2600 * jitter(g, 80), 0.07 * V(p), 0.25);
  glass(s, t + 0.09, 3300 * jitter(g, 80), 0.05 * V(p), 0.2);
  plip(s, t + 0.24, 900, 0.05 * V(p));
};

const wake: Player = (g, t, p) => {
  yawn(g, t, p.pan ?? 0);
  const s = sfxVoice(g, t + 0.25, 0.6, 0, p, 0.2);
  if (!s) return;
  glass(s, t + 0.3, mtof(chainNote(Z(p), 9)), 0.06 * V(p), 0.6);
};

/** Cage vine snaps; the last layer frees the creature with a small "ta-da". */
const cage: Player = (g, t, p) => {
  const open = (p.layers ?? 1) <= 0;
  const s = sfxVoice(g, t, open ? 1.2 : 0.4, 2, p, 0.14);
  if (!s) return;
  noiseHit(s, t, { kind: 'white', dur: 0.035, amp: 1.1 * V(p), type: 'bandpass', f0: 1400 * jitter(g, 100), q: 1.5 });
  thump(s, t, 240, 150, 0.35 * V(p), 0.06, undefined, 0.3);
  noiseHit(s, t + 0.01, { kind: 'pink', dur: 0.22, amp: 0.3 * V(p), type: 'bandpass', f0: 3000, q: 1 });
  if (open) {
    const zone = Z(p);
    const n = chainNote(zone, 7);
    for (let i = 0; i < 3; i++) glass(s, t + 0.22 + i * 0.07, mtof(stepFrom(zone, n, i * 2)), 0.15 * V(p), 1);
    yip(g, t + 0.3, 5, p.pan ?? 0);
  }
};

const fogLift: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 1, 1, p, 0.3);
  if (!s) return;
  whoosh(s, t, 0.7, 480, 1400, 2500, 0.1 * V(p), 0.7, undefined, 0.6);
  glass(s, t + 0.2, mtof(chainNote(Z(p), 9)), 0.07 * V(p), 1.2, undefined, 0.02);
};

const rotSquelch: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.6, 2, p, 0.12);
  if (!s) return;
  noiseHit(s, t, { kind: 'pink', dur: 0.22, amp: 0.2 * V(p), type: 'bandpass', f0: 1500, f1: 450, q: 2.4, attack: 0.01 });
  plip(s, t + 0.04, 250, 0.12 * V(p), undefined, 1.5, 0.1);
  crackle(s, t, 0.3, 0.08 * V(p), 2600);
};

const rotGrow: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.7, 1, p, 0.12);
  if (!s) return;
  noiseHit(s, t, { kind: 'brown', dur: 0.4, amp: 0.08 * V(p), type: 'lowpass', f0: 420, f1: 200, q: 0.8, attack: 0.15 });
  noiseHit(s, t + 0.05, { kind: 'pink', dur: 0.3, amp: 0.2 * V(p), type: 'bandpass', f0: 700, f1: 400, q: 1.5, attack: 0.1 });
  plip(s, t + 0.2, 260, 0.1 * V(p), undefined, 1.4, 0.15);
};

const oilGlug: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.9, 2, p, 0.14);
  if (!s) return;
  puff(s, t, 0.14 * V(p), 900, 0.4);
  for (let i = 0; i < 3; i++) plip(s, t + 0.05 + i * 0.09, 210 + i * 35, 0.13 * V(p), undefined, 1.5, 0.09);
  crackle(s, t, 0.5, 0.1 * V(p), 2400);
};

const toxicTick: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.5, 1, p, 0.1);
  if (!s) return;
  marimba(s, t, 392, 0.13 * V(p), 0.15);
  marimba(s, t, 415.3, 0.08 * V(p), 0.15);
};

const freeze: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.8, 2, p, 0.22);
  if (!s) return;
  noiseHit(s, t, { kind: 'white', dur: 0.3, amp: 0.06 * V(p), type: 'bandpass', f0: 6200, f1: 2800, q: 1, attack: 0.02 });
  for (let i = 0; i < 3; i++) glass(s, t + 0.04 + i * 0.03, (2100 + i * 540) * jitter(g, 50), 0.07 * V(p), 0.3);
};

const push: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.35, 1, p, 0.08);
  if (!s) return;
  puff(s, t, 0.12 * V(p), 1500, 0.25);
};

const strayMove: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.35, 0, p, 0.05);
  if (!s) return;
  for (let i = 0; i < 3; i++) partial(s, t + i * 0.06, 880 * jitter(g, 120), 0.05 * V(p), 0.04, { bend: 1.1, bendTime: 0.01 });
};

const strayCalm: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1, 1, p, 0.22);
  if (!s) return;
  glide(s, t, 700, 520, 0.3, 0.05 * V(p));
  const n = chainNote(zone, 8);
  glass(s, t + 0.1, mtof(n), 0.1 * V(p), 1);
  glass(s, t + 0.2, mtof(stepFrom(zone, n, -2)), 0.09 * V(p), 1.2);
};

const goalDone: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1.6, 2, p, 0.28);
  if (!s) return;
  glass(s, t, mtof(chainNote(zone, 9)), 0.2 * V(p), 1.3);
  glass(s, t + 0.11, mtof(chainNote(zone, 11)), 0.2 * V(p), 1.6);
};

// ------------------------------------------------------------------------------------------ level end

/** Celebratory motif: a marimba run up the zone's pentatonic into a warm open chord with bells. */
const won: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 3, 3, p, 0.3);
  if (!s) return;
  const vel = V(p);
  const run = [2, 4, 5, 7, 9];
  run.forEach((tier, i) => {
    const n = chainNote(zone, tier);
    marimba(s, t + i * 0.095, mtof(n), (0.42 + i * 0.04) * vel, 0.45);
    if (i >= 3) glass(s, t + i * 0.095, mtof(n + 12), 0.08 * vel, 0.7);
  });
  const tc = t + run.length * 0.095 + 0.08;
  const root = chainNote(zone, 7);
  const chord = [root, stepFrom(zone, root, 2), stepFrom(zone, root, 4)];
  chord.forEach((n, i) => marimba(s, tc + i * 0.012, mtof(n), 0.4 * vel, 0.5));
  bass(s, tc, mtof(root - 24), 0.45 * vel, 2.2);
  pad(s, tc, chord.map((n) => mtof(n - 12)), 0.2 * vel, 0.2, 0.7, 1.6, 1700);
  for (let i = 0; i < 5; i++) glass(s, tc + 0.12 + i * 0.06, mtof(stepFrom(zone, root + 12, i)), 0.09 * vel, 1.1);
  g.duckBus('music', t, 0.7, 2.2, 0.08, 1.5);
  g.duckBus('ambient', t, 0.3, 2, 0.1, 1.5);
};

/** Soft descending sigh: three gentle falling notes and a breathy "aww". */
const lost: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 2.4, 3, p, 0.28);
  if (!s) return;
  const vel = V(p);
  [6, 5, 3].forEach((tier, i) => marimba(s, t + i * 0.17, mtof(chainNote(zone, tier)), (0.3 - i * 0.04) * vel, 0.25));
  const o = s.osc('sine', 430, t + 0.45, t + 1.6);
  o.frequency.setValueAtTime(430, t + 0.45);
  o.frequency.exponentialRampToValueAtTime(300, t + 1.25);
  const vib = s.osc('sine', 5, t + 0.45, t + 1.6);
  const vd = s.gain(14);
  vib.connect(vd);
  vd.connect(o.detune);
  const e = s.gain(0);
  e.gain.setValueAtTime(0, t + 0.45);
  e.gain.linearRampToValueAtTime(0.07 * vel, t + 0.6);
  e.gain.setTargetAtTime(0, t + 0.95, 0.15);
  o.connect(e);
  e.connect(s.input);
  puff(s, t + 0.45, 0.05 * vel, 900, 0.7);
  g.duckBus('music', t, 0.55, 1.6, 0.1, 1.6);
};

// ------------------------------------------------------------------------------------------ UI & flow

const rewind: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 0.8, 1, p, 0.15);
  if (!s) return;
  whoosh(s, t, 0.34, 2600, 1800, 480, 0.1 * V(p), 1, undefined, 0.8);
  const top = ZONE_MUSIC[zone].chainRoot + 19;
  for (let i = 0; i < 3; i++) glass(s, t + 0.05 + i * 0.045, mtof(stepFrom(zone, top, -i)), 0.08 * V(p), 0.4);
};

const restart: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1, 1, p, 0.15);
  if (!s) return;
  whoosh(s, t, 0.42, 400, 1600, 700, 0.07 * V(p), 0.9);
  marimba(s, t + 0.28, mtof(ZONE_MUSIC[zone].chainRoot), 0.22 * V(p), 0.35);
};

const uiTick: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.12, 1, p, 0.04);
  if (!s) return;
  const f = 1450 * jitter(g, 90);
  partial(s, t, f, 0.12 * V(p), 0.04, { bend: 1.18, bendTime: 0.008 });
  partial(s, t, f * 2.7, 0.03 * V(p), 0.015);
  mallet(s, t, 2600, 0.04 * V(p));
};

const glassTap: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.3, 1, p, 0.1);
  if (!s) return;
  glass(s, t, 1960 * jitter(g, 60), 0.14 * V(p), 0.12);
};

const soundOn: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1, 2, p, 0.2);
  if (!s) return;
  glass(s, t, mtof(chainNote(zone, 7)), 0.14 * V(p), 0.8);
  glass(s, t + 0.09, mtof(chainNote(zone, 9)), 0.14 * V(p), 1);
};

const hop: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 1.2, 2, p, 0.12);
  if (!s) return;
  wobble(s, t, 210, 0.12 * V(p), 0.12, 16, 0.1);
  glide(s, t + 0.04, 250, 640, 0.15, 0.1 * V(p));
  whoosh(s, t + 0.05, 0.9, 260, 700, 300, 0.05 * V(p), 0.8);
};

const land: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.5, 1, p, 0.12);
  if (!s) return;
  wobble(s, t, 300, 0.22 * V(p), 0.32, 13, 0.12);
  noiseHit(s, t, { kind: 'white', dur: 0.1, amp: 0.06 * V(p), type: 'bandpass', f0: 2000, f1: 700, q: 0.8 });
};

const select: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1, 2, p, 0.2);
  if (!s) return;
  kalimba(s, t, mtof(chainNote(zone, 5)), 0.3 * V(p));
  kalimba(s, t + 0.08, mtof(chainNote(zone, 7)), 0.3 * V(p));
};

const flyIn: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 1.6, 1, p, 0.12);
  if (!s) return;
  whoosh(s, t, 1.15, 240, 900, 360, 0.1 * V(p), 0.8, undefined, 0.5);
};

/** The plateau heaves out of the ground: a low earthy swell and a few pebbles. */
const rise: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 1.4, 1, p, 0.12);
  if (!s) return;
  noiseHit(s, t, { kind: 'brown', dur: 0.9, amp: 0.12 * V(p), type: 'lowpass', f0: 170, f1: 320, q: 0.7, attack: 0.35 });
  noiseHit(s, t + 0.1, { kind: 'pink', dur: 0.8, amp: 0.26 * V(p), type: 'bandpass', f0: 380, f1: 900, q: 1.2, attack: 0.3 });
  glide(s, t, 44, 72, 0.85, 0.14 * V(p));
  for (let i = 0; i < 3; i++) partial(s, t + 0.4 + i * 0.11 + g.rand() * 0.05, 1100 * jitter(g, 300), 0.03 * V(p), 0.03, { bend: 1.1, bendTime: 0.01 });
};

const heroJump: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.6, 2, p, 0.1);
  if (!s) return;
  glide(s, t, 240, 720, 0.16, 0.1 * V(p));
  whoosh(s, t, 0.5, 400, 1300, 700, 0.05 * V(p), 0.9);
};

const depart: Player = (g, t, p) => {
  release(g, t, { ...p, tier: 7, vel: 0.8 * V(p) });
  const s = sfxVoice(g, t + 0.2, 1.8, 1, p, 0.15);
  if (!s) return;
  whoosh(s, t + 0.2, 1.3, 260, 850, 320, 0.08 * V(p), 0.8, undefined, 0.5);
};

const sink: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 1.4, 0, p, 0.1);
  if (!s) return;
  noiseHit(s, t, { kind: 'brown', dur: 1, amp: 0.09 * V(p), type: 'lowpass', f0: 320, f1: 120, q: 0.6, attack: 0.2 });
  noiseHit(s, t + 0.05, { kind: 'pink', dur: 0.8, amp: 0.22 * V(p), type: 'bandpass', f0: 900, f1: 350, q: 1.2, attack: 0.2 });
  glide(s, t, 70, 40, 0.9, 0.1 * V(p));
};

const nodeUnlock: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1.4, 1, p, 0.3);
  if (!s) return;
  const base = chainNote(zone, 7);
  for (let i = 0; i < 4; i++) glass(s, t + i * 0.06, mtof(stepFrom(zone, base, i)), 0.1 * V(p), 0.9);
};

const BASE_PLAYERS = {
  slide,
  stop,
  merge,
  splash,
  childPop,
  leapUp,
  creatureVoice,
  diveWhoosh,
  bite,
  chew,
  coil,
  gulp,
  stompRear,
  stomp,
  popOut,
  special,
  promote,
  tierBomb,
  release,
  deliver,
  spawn,
  heal,
  healStep,
  collect,
  scrap,
  mound,
  crustCrack,
  wake,
  cage,
  fogLift,
  rotSquelch,
  rotGrow,
  oilGlug,
  toxicTick,
  freeze,
  push,
  strayMove,
  strayCalm,
  goalDone,
  won,
  lost,
  rewind,
  restart,
  uiTick,
  glassTap,
  soundOn,
  hop,
  land,
  select,
  flyIn,
  rise,
  heroJump,
  depart,
  sink,
  nodeUnlock,
} satisfies Record<string, Player>;

/** Grundkatalog plus die Klänge der Iteration 4 (`sfxExtra.ts`). */
const PLAYERS = { ...BASE_PLAYERS, ...extraPlayers(BASE_PLAYERS) };

export type SfxId = keyof typeof PLAYERS;
export const SFX_IDS = Object.keys(PLAYERS) as SfxId[];

/**
 * Loudness trims (dB) from the offline level check (max 100 ms RMS, default mix): merges ≈ −22 dBFS rising to
 * −18 for the big tiers, win −20, REX −24, landings −32, splashes −32, whooshes −36, UI ticks −40.
 */
const TRIM_DB: Partial<Record<SfxId, number>> = {
  ...EXTRA_TRIM_DB,
  slide: 9,
  childPop: 5,
  leapUp: 7,
  diveWhoosh: 18,
  bite: 7,
  chew: 8,
  coil: 8,
  gulp: 5,
  stompRear: 17,
  popOut: 12,
  spawn: 3,
  scrap: 6,
  crustCrack: 10,
  wake: -4,
  fogLift: 6,
  rotSquelch: 14,
  rotGrow: 8,
  oilGlug: 8,
  freeze: 6,
  push: 10,
  strayMove: 10,
  strayCalm: 3,
  rewind: 5,
  uiTick: 5,
  glassTap: 5,
  select: -3,
  flyIn: 12,
  rise: -4,
  sink: -3,
};

export function playSfx(g: AudioGraph, id: SfxId, t: number, p: SfxParams = {}): void {
  withTrim(TRIM_DB[id] ?? 0, () => PLAYERS[id](g, Math.max(t, g.ctx.currentTime, 0.001), p));
}
