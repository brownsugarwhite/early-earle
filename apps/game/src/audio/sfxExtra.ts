import type { AudioGraph, Strip } from './graph';
import { clamp, crackle, glass, glide, kalimba, marimba, noiseHit, pad, partial, plip, puff, thump, whoosh, wobble, bass } from './dsp';
import { chainNote, mtof, stepFrom, ZONE_MUSIC } from './scales';
import { speak, type VoiceStyle, type VoiceSyllable } from './voice';
import { currentTrim, jitter, sfxVoice, V, Z, type Player } from './sfxKit';
import type { SfxParams } from './sfx';

/**
 * Klänge der Iteration 4 (Loader, Möwe, Sammlung, Klassik, Aufbruch): Rezepte mit derselben Signatur wie im
 * Grundkatalog (`sfx.ts`), prozedural wie alles andere, mit einem Mittenanteil, der auf Handylautsprechern trägt.
 * Pegel nach derselben Politik (`EXTRA_LEVEL_TARGETS`: lautestes 100-ms-Fenster, Standard-Mischung); die
 * Ausgleichswerte (`EXTRA_TRIM_DB`) kommen aus der Offline-Pegelmessung (`sfxLevel` in render.ts, im Audio-Lab
 * „Pegel prüfen“, in den Tests mit `miniOffline.ts`).
 */

export const EXTRA_SFX_IDS = [
  /**
   * Möwenruf (Silbermöwe, Formantstimme): `p.kind` 'a' ein „kjau“, 'b' zwei, 'c' drei fallend, 'laugh' das Lachen
   * „ha-ha-ha-ha“; ohne `kind` zufällig a/b/c. Stereo von `p.pan` aus, `p.dir` 'left'/'right' = Flugrichtung.
   */
  'gullCall',
  /** Flügelschlag / Vorbeiflug der Möwe (≈ 3,2 Schläge/s), `p.dur` Länge (Vorgabe 1,3 s), Pan von `p.pan` nach `p.dir`. */
  'gullWings',
  /** Fallender Blob: Pfiff 1600 → 520 Hz mit anschwellender Luft, `p.dur` Fallzeit (Vorgabe 0,5 s). */
  'dropFall',
  /** Nasses Aufklatschen („Flatsch“), `p.tier` ≥ 2 oder `p.kind: 'big'` = großer Flatsch. */
  'splat',
  /** Harter Stempel auf Papier (Logo-Teile, NEU!). */
  'stamp',
  /** Ein neues Wesen für den Setzkasten: Stempel, drei Glastöne die Zonenleiter hinauf, ein Jauchzer. */
  'newCreature',
  /** Holziges Klacken (Setzkasten, Loader-Ziffern); `p.step` hebt es um Ganztöne (0–6). */
  'clack',
  /** Die Flamme im Logo zündet: Luft-Wumms und Knistern. */
  'flameIgnite',
  /** Ein Stern springt ein, `p.step` 0/1/2 steigt (der dritte ist der größte). */
  'starPop',
  /** Ein Wesen hüpft vom Plateau und zieht fröhlich auf die Map. */
  'creatureRelease',
  /** Der Held landet weich auf einem Knoten oder Pfadpunkt. */
  'heroLand',
  /** Tipp auf einen gesperrten Knoten: dumpfes Klopfen, kein Alarm. */
  'locked',
  /** Klassik: kein Zug mehr (sanft fallend). */
  'gameOver',
  /** Klassik: neuer Bestwert (hell steigend). */
  'newBest',
] as const;

export type ExtraSfxId = (typeof EXTRA_SFX_IDS)[number];

/** Die Grundklänge, auf die Rezepte zurückgreifen dürfen (werden von `sfx.ts` hereingereicht). */
export type BasePlayers = Record<'land', Player>;

// ------------------------------------------------------------------------------------------ helpers

const pickPan = (p: SfxParams): number => clamp(p.pan ?? 0, -1, 1);

/** Where a moving source ends up: `p.dir` sets the travel, else it drifts halfway to the centre. */
function panEnd(p: SfxParams, travel: number): number {
  const from = pickPan(p);
  if (p.dir === 'right') return clamp(from + travel, -1, 1);
  if (p.dir === 'left') return clamp(from - travel, -1, 1);
  return from * 0.5;
}

/** Plain voiced call on the sfx bus with the running trim (the formant voice does not borrow via `sfxVoice`). */
function call(g: AudioGraph, t: number, syl: VoiceSyllable[], style: VoiceStyle, p: SfxParams, prio: number, reverb: number, panTo?: number): number {
  return speak(g, t, syl, { ...style, gain: style.gain * currentTrim() * V(p) }, { bus: 'sfx', pan: pickPan(p), prio, reverb, ...(panTo === undefined ? {} : { panTo }) });
}

// ------------------------------------------------------------------------------------------ gull

/** Silbermöwe: small, bright, harsh (growl), breathy; formants ≈ 2 × a human's. */
const GULL: VoiceStyle = { size: 2.1, breath: 0.35, vibrato: 8, growl: 0.25, gain: 0.3, bright: 0.8 };

/**
 * One "kyow": a short plosive "ky" gliding up (+35 %) tied into a long falling "ow" (−50 %). `t0` relative to the
 * call, `p` the fundamental at the start (1.1–1.5 kHz), `len` the length of the "ow".
 */
function kyow(out: VoiceSyllable[], t0: number, p: number, len: number, amp: number): number {
  out.push({ t0, t1: t0 + 0.065, vowel: 'i', onset: 'plosive', stress: false, pitch: p, glide: 0.35, amp: amp * 0.75, legato: true });
  out.push({ t0: t0 + 0.065, t1: t0 + 0.065 + len, vowel: 'au', onset: 'none', stress: true, pitch: p * 1.35, glide: -0.5, amp });
  return t0 + 0.065 + len;
}

const gullCall: Player = (g, t, p) => {
  const k = jitter(g, 45);
  const kind = p.kind === 'a' || p.kind === 'b' || p.kind === 'c' || p.kind === 'laugh' ? p.kind : (['a', 'b', 'c'] as const)[Math.floor(g.rand() * 3)]!;
  const syl: VoiceSyllable[] = [];
  let style = GULL;
  if (kind === 'laugh') {
    // "ha-ha-ha-ha": four short open syllables, falling, rougher.
    const base = 1180 * k;
    for (let i = 0; i < 4; i++) {
      const t0 = i * 0.155;
      syl.push({ t0, t1: t0 + 0.1, vowel: 'a', onset: 'plosive', stress: i === 0, pitch: base * (1 - 0.05 * i), glide: -0.2, amp: 1 - 0.08 * i });
    }
    // Open 'a' formants sit away from the fundamental: the laugh needs more drive to match the "kyow" level.
    style = { ...GULL, growl: 0.4, breath: 0.42, gain: GULL.gain * 3.2 };
  } else {
    const n = kind === 'a' ? 1 : kind === 'b' ? 2 : 3;
    let at = 0;
    for (let i = 0; i < n; i++) {
      const f = 1120 * k * (1 - 0.06 * i) * (0.97 + g.rand() * 0.06);
      const end = kyow(syl, at, f, (i === 0 ? 0.27 : 0.23) * (0.94 + g.rand() * 0.12), 1 - 0.08 * i);
      at = end + 0.1 + g.rand() * 0.04;
    }
  }
  call(g, t, syl, style, p, 2, 0.22, panEnd(p, 0.35));
};

const gullWings: Player = (g, t, p) => {
  const dur = clamp(p.dur ?? 1.3, 0.4, 3);
  const s = sfxVoice(g, t, dur + 0.5, 1, p, 0.12);
  if (!s) return;
  s.panTo(panEnd(p, 0.8), t, dur);
  const vel = V(p);
  const rate = 3.2 * jitter(g, 60);
  const n = Math.max(1, Math.floor(dur * rate));
  for (let i = 0; i < n; i++) {
    const u = n > 1 ? i / (n - 1) : 0.5;
    // Pass-by: loudest in the middle, a touch brighter while approaching.
    const near = Math.sin(Math.PI * (0.15 + 0.7 * u));
    const f = (880 - 260 * u) * jitter(g, 80);
    noiseHit(s, t + i / rate + g.rand() * 0.02, { kind: 'pink', dur: 0.13, amp: 0.55 * near * vel * (0.85 + g.rand() * 0.3), type: 'bandpass', f0: f * 1.25, f1: f * 0.7, q: 1.3, attack: 0.035 });
  }
  whoosh(s, t, dur, 320, 1150, 380, 0.07 * vel, 0.8, undefined, 0.5);
};

// ------------------------------------------------------------------------------------------ loader

const dropFall: Player = (g, t, p) => {
  const dur = clamp(p.dur ?? 0.5, 0.2, 1.5);
  const s = sfxVoice(g, t, dur + 0.15, 1, p, 0.08);
  if (!s) return;
  const vel = V(p);
  const k = jitter(g, 30);
  // The whistle: a pure sine falling 1600 → 520 Hz, faded in and cut just before the impact.
  const o = s.osc('sine', 1600 * k, t, t + dur + 0.06);
  o.frequency.setValueAtTime(1600 * k, t);
  o.frequency.exponentialRampToValueAtTime(520 * k, t + dur);
  const e = s.gain(0);
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(0.1 * vel, t + 0.05);
  e.gain.linearRampToValueAtTime(0.085 * vel, t + dur * 0.85);
  e.gain.setTargetAtTime(0, t + dur * 0.9, 0.015);
  o.connect(e);
  e.connect(s.input);
  // Rising air: it falls faster, the rush swells and brightens.
  const n = s.noise('pink', t, t + dur + 0.08);
  const bp = s.filter('bandpass', 700, 0.9);
  bp.frequency.setValueAtTime(700, t);
  bp.frequency.exponentialRampToValueAtTime(2600, t + dur);
  const a = s.gain(0);
  a.gain.setValueAtTime(0, t);
  a.gain.linearRampToValueAtTime(0.02 * vel, t + dur * 0.4);
  a.gain.linearRampToValueAtTime(0.16 * vel, t + dur);
  a.gain.setTargetAtTime(0, t + dur, 0.02);
  n.connect(bp);
  bp.connect(a);
  a.connect(s.input);
};

/** Wet slap of a blob: crack of wet noise, a body thump, the jelly wobble, droplets and a squelchy tail. */
const splat: Player = (g, t, p) => {
  const big = p.kind === 'big' || (p.tier ?? 1) >= 2;
  const vel = V(p) * (big ? 1.15 : 1);
  const s = sfxVoice(g, t, big ? 1.1 : 0.8, 2, p, big ? 0.2 : 0.15);
  if (!s) return;
  noiseHit(s, t, { kind: 'white', dur: big ? 0.19 : 0.13, amp: 0.55 * vel, type: 'bandpass', f0: 1800, f1: 400, q: 0.9, attack: 0.003 });
  noiseHit(s, t, { kind: 'pink', dur: 0.05, amp: 0.3 * vel, type: 'lowpass', f0: 1300, q: 0.7 });
  noiseHit(s, t + 0.01, { kind: 'pink', dur: big ? 0.24 : 0.16, amp: 0.3 * vel, type: 'bandpass', f0: 1500, f1: 450, q: 2.4, attack: 0.008 });
  thump(s, t, big ? 125 : 140, big ? 52 : 60, (big ? 0.24 : 0.16) * vel, big ? 0.32 : 0.2, undefined, 0.5);
  wobble(s, t + 0.012, (big ? 230 : 270) * jitter(g, 60), 0.14 * vel, big ? 0.36 : 0.28, 14, 0.13);
  const drops = big ? 5 + Math.floor(g.rand() * 2) : 3 + Math.floor(g.rand() * 2);
  for (let i = 0; i < drops; i++) {
    const dt = 0.05 + g.rand() * (big ? 0.38 : 0.28);
    plip(s, t + dt, 950 + g.rand() * 1500, (0.05 + 0.05 * g.rand()) * vel);
  }
};

/** Rubber stamp on paper: a firm mid thump, the paper's crisp "tsk" and a short wooden body. */
function stampOn(s: Strip, g: AudioGraph, t: number, vel: number): void {
  thump(s, t, 220 * jitter(g, 40), 110, 0.22 * vel, 0.12, undefined, 0.45);
  noiseHit(s, t, { kind: 'pink', dur: 0.035, amp: 0.34 * vel, type: 'bandpass', f0: 900, q: 1 });
  partial(s, t, 480 * jitter(g, 60), 0.16 * vel, 0.07);
  partial(s, t, 1310 * jitter(g, 60), 0.05 * vel, 0.025);
  noiseHit(s, t, { kind: 'white', dur: 0.022, amp: 0.4 * vel, type: 'bandpass', f0: 3200, q: 1.2 });
  noiseHit(s, t + 0.004, { kind: 'white', dur: 0.012, amp: 0.16 * vel, type: 'highpass', f0: 5200, q: 0.7 });
}

const stamp: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.4, 2, p, 0.1);
  if (!s) return;
  stampOn(s, g, t, V(p));
};

const newCreature: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1.6, 2, p, 0.24);
  if (!s) return;
  const vel = V(p);
  stampOn(s, g, t, vel * 0.8);
  const base = chainNote(zone, 7);
  for (let i = 0; i < 3; i++) glass(s, t + 0.12 + i * 0.075, mtof(stepFrom(zone, base, i * 2)), (0.15 + 0.02 * i) * vel, 0.9);
  // A small happy "yip!" of the newcomer.
  const f = mtof(chainNote(zone, 9)) * jitter(g, 40);
  call(g, t + 0.36, [{ t0: 0, t1: 0.12, vowel: 'i', onset: 'none', stress: true, pitch: f, glide: 0.3, amp: 1 }], { size: 1.35, breath: 0.15, vibrato: 0, growl: 0, gain: 0.3, bright: 0.5 }, p, 2, 0.15);
};

/** Wood block: a damped resonance with two inharmonic modes and a small click. */
const clack: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.2, 1, p, 0.06);
  if (!s) return;
  const vel = V(p);
  const f = 1040 * jitter(g, 60) * Math.pow(2, (2 * clamp(p.step ?? 0, 0, 6)) / 12);
  const lp = s.filter('lowpass', 4200, 0.6);
  lp.connect(s.input);
  partial(s, t, f, 0.32 * vel, 0.05, { out: lp, bend: 1.04, bendTime: 0.006 });
  partial(s, t, f * 2.74, 0.1 * vel, 0.022, { out: lp });
  partial(s, t, f * 4.9, 0.04 * vel, 0.012, { out: lp });
  noiseHit(s, t, { kind: 'white', dur: 0.01, amp: 0.2 * vel, type: 'bandpass', f0: 2600, q: 1.4, out: lp });
};

/** The logo's flame catches: an airy "fwoomp" (low-pass noise opening and closing), a soft low whump, crackle. */
const flameIgnite: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 1.6, 2, p, 0.16);
  if (!s) return;
  const vel = V(p);
  const n = s.noise('pink', t, t + 0.95);
  const lp = s.filter('lowpass', 420, 0.9);
  lp.frequency.setValueAtTime(420, t);
  lp.frequency.exponentialRampToValueAtTime(3200, t + 0.17);
  lp.frequency.exponentialRampToValueAtTime(900, t + 0.85);
  const hp = s.filter('highpass', 260, 0.7);
  const e = s.gain(0);
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(0.55 * vel, t + 0.14);
  e.gain.setTargetAtTime(0, t + 0.2, 0.16);
  n.connect(lp);
  lp.connect(hp);
  hp.connect(e);
  e.connect(s.input);
  thump(s, t + 0.05, 110, 70, 0.08 * vel, 0.26, undefined, 0.2);
  noiseHit(s, t + 0.2, { kind: 'white', dur: 0.6, amp: 0.025 * vel, type: 'bandpass', f0: 3600, q: 0.8, attack: 0.08 });
  crackle(s, t + 0.1, 1.1, 0.22 * vel, 2600);
};

/** A star pops in: cork pop, click and a sparkle up the zone scale; each further star sits higher and fuller. */
const starPop: Player = (g, t, p) => {
  const zone = Z(p);
  const step = clamp(Math.round(p.step ?? 0), 0, 2);
  const vel = V(p) * (0.94 + 0.04 * step);
  const s = sfxVoice(g, t, 1.4, 2, p, 0.22 + 0.04 * step);
  if (!s) return;
  const k = Math.pow(2, (3 * step) / 12);
  plip(s, t, 520 * k * jitter(g, 30), 0.3 * vel, undefined, 2.7, 0.05);
  noiseHit(s, t, { kind: 'white', dur: 0.014, amp: 0.16 * vel, type: 'bandpass', f0: 3000, q: 1.1 });
  const base = chainNote(zone, 9 + 2 * step);
  const notes = 3 + step;
  for (let i = 0; i < notes; i++) glass(s, t + 0.035 + i * 0.045, mtof(stepFrom(zone, base, i)), (0.13 + 0.02 * step) * vel, 0.7 + 0.2 * step);
  if (step === 2) whoosh(s, t, 0.4, 700, 3400, 2600, 0.04 * vel, 1, undefined, 0.6);
};

// ------------------------------------------------------------------------------------------ map & flow

/** Happy hop-off: a springy boing, a little flight whoosh towards `p.dir`, and a cheerful kalimba run. */
const creatureRelease: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 1.4, 2, p, 0.18);
  if (!s) return;
  const vel = V(p);
  s.panTo(panEnd(p, 0.4), t + 0.1, 0.7);
  wobble(s, t, 230 * jitter(g, 50), 0.16 * vel, 0.18, 16, 0.12);
  glide(s, t + 0.03, 280, 780, 0.17, 0.1 * vel);
  whoosh(s, t + 0.08, 0.7, 300, 1150, 420, 0.06 * vel, 0.9, undefined, 0.45);
  const base = chainNote(zone, 7);
  for (let i = 0; i < 3; i++) kalimba(s, t + 0.1 + i * 0.085, mtof(stepFrom(zone, base, i * 2)), (0.24 + 0.03 * i) * vel);
};

/** The hero's soft small landing (smaller than `land`): a short jelly wobble and a padded pat. */
const heroLand: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.45, 1, p, 0.1);
  if (!s) return;
  const vel = V(p);
  wobble(s, t, 420 * jitter(g, 40), 0.17 * vel, 0.24, 14, 0.1);
  noiseHit(s, t, { kind: 'pink', dur: 0.06, amp: 0.16 * vel, type: 'lowpass', f0: 900, q: 0.6 });
  thump(s, t, 180, 120, 0.06 * vel, 0.08, undefined, 0.3);
};

/** Locked: two soft, muffled knocks on wood ("tok tok"): a closed door, not an alarm. */
const locked: Player = (g, t, p) => {
  const s = sfxVoice(g, t, 0.5, 1, p, 0.08);
  if (!s) return;
  const vel = V(p);
  const lp = s.filter('lowpass', 1800, 0.6);
  lp.connect(s.input);
  const f = 310 * jitter(g, 30);
  for (const [dt, a, fk] of [
    [0, 1, 1],
    [0.12, 0.78, 0.94],
  ] as const) {
    partial(s, t + dt, f * fk, 0.28 * a * vel, 0.09, { out: lp });
    partial(s, t + dt, f * fk * 2.3, 0.16 * a * vel, 0.045, { out: lp });
    partial(s, t + dt, f * fk * 3.9, 0.06 * a * vel, 0.022, { out: lp });
    noiseHit(s, t + dt, { kind: 'pink', dur: 0.04, amp: 0.22 * a * vel, type: 'bandpass', f0: 650, q: 0.8, out: lp });
  }
};

// ------------------------------------------------------------------------------------------ classic 2048

/** No more moves: four gentle falling marimba notes resting on a warm low chord (a shrug, not a failure). */
const gameOver: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 2.6, 3, p, 0.28);
  if (!s) return;
  const vel = V(p);
  [7, 6, 5, 3].forEach((tier, i) => marimba(s, t + i * 0.16, mtof(chainNote(zone, tier)), (0.3 - i * 0.03) * vel, 0.3));
  const tc = t + 0.66;
  const root = ZONE_MUSIC[zone].chainRoot;
  bass(s, tc, mtof(root - 12), 0.3 * vel, 1.6);
  pad(s, tc, [mtof(root - 12), mtof(stepFrom(zone, root - 12, 2)), mtof(stepFrom(zone, root - 12, 4))], 0.12 * vel, 0.12, 0.35, 1.2, 1300);
  puff(s, t + 0.62, 0.04 * vel, 800, 0.6);
  g.duckBus('music', t, 0.5, 1.4, 0.1, 1.4);
};

/** New best: a quick bright run up the zone scale into a sparkling bell chord and a rising shimmer. */
const newBest: Player = (g, t, p) => {
  const zone = Z(p);
  const s = sfxVoice(g, t, 2.6, 3, p, 0.3);
  if (!s) return;
  const vel = V(p);
  for (let i = 0; i < 5; i++) {
    const n = chainNote(zone, 5 + i);
    marimba(s, t + i * 0.065, mtof(n), (0.34 + 0.04 * i) * vel, 0.55);
    glass(s, t + i * 0.065, mtof(n + 12), 0.07 * vel, 0.6);
  }
  const tc = t + 5 * 0.065 + 0.04;
  const top = chainNote(zone, 9);
  for (const [i, d] of [0, 2, 4].entries()) glass(s, tc + i * 0.018, mtof(stepFrom(zone, top, d)), 0.2 * vel, 1.3);
  for (let i = 0; i < 5; i++) glass(s, tc + 0.14 + i * 0.05, mtof(stepFrom(zone, top + 12, i)), (0.1 - i * 0.012) * vel, 1);
  whoosh(s, t, 0.6, 600, 3200, 2600, 0.05 * vel, 1, undefined, 0.75);
  g.duckBus('music', t, 0.55, 1.2, 0.06, 1.2);
};

export function extraPlayers(_b: BasePlayers): Record<ExtraSfxId, Player> {
  return {
    gullCall,
    gullWings,
    dropFall,
    splat,
    stamp,
    newCreature,
    clack,
    flameIgnite,
    starPop,
    creatureRelease,
    heroLand,
    locked,
    gameOver,
    newBest,
  };
}

/**
 * Pegelpolitik der neuen Klänge (lautestes 100-ms-Fenster in dBFS, Standard-Mischung, Standard-Parameter), in der
 * Einordnung des Grundkatalogs: Merges −21 … −17, Sieg −20, REX −24, Landungen und Splashes ≈ −32, Wusch −36, UI −40.
 */
export const EXTRA_LEVEL_TARGETS: Readonly<Record<ExtraSfxId, number>> = {
  gullCall: -28,
  gullWings: -36,
  dropFall: -34,
  splat: -31,
  stamp: -29,
  newCreature: -26,
  clack: -38,
  flameIgnite: -31,
  starPop: -31,
  creatureRelease: -29,
  heroLand: -34,
  locked: -36,
  gameOver: -27,
  newBest: -22,
};

/** Jede Variante mit Knopf-Beschriftung und Soll-Pegel: Audio-Lab („Iteration 4“, Pegel prüfen) und Unit-Tests. */
export const EXTRA_CHECKS: ReadonlyArray<{ id: ExtraSfxId; p: SfxParams; label: string; target: number }> = [
  { id: 'gullCall', p: { kind: 'a', pan: -0.3, dir: 'right' }, label: 'Möwe: kjau', target: -28 },
  { id: 'gullCall', p: { kind: 'b', pan: 0.3, dir: 'left' }, label: 'Möwe: kjau kjau', target: -28 },
  { id: 'gullCall', p: { kind: 'c' }, label: 'Möwe: drei Rufe', target: -28 },
  { id: 'gullCall', p: { kind: 'laugh' }, label: 'Möwe lacht', target: -29.5 },
  { id: 'gullWings', p: { pan: -0.7, dir: 'right' }, label: 'Möwe fliegt vorbei', target: -36 },
  { id: 'dropFall', p: {}, label: 'Blob fällt (Pfiff)', target: -34 },
  { id: 'splat', p: {}, label: 'Flatsch', target: -31 },
  { id: 'splat', p: { kind: 'big' }, label: 'Großer Flatsch', target: -26.5 },
  { id: 'stamp', p: {}, label: 'Stempel', target: -29 },
  { id: 'newCreature', p: {}, label: 'Neues Wesen', target: -26 },
  { id: 'clack', p: {}, label: 'Klacken (Holz)', target: -38 },
  { id: 'flameIgnite', p: {}, label: 'Flamme zündet', target: -31 },
  { id: 'starPop', p: { step: 0 }, label: 'Stern 1', target: -31 },
  { id: 'starPop', p: { step: 1 }, label: 'Stern 2', target: -29 },
  { id: 'starPop', p: { step: 2 }, label: 'Stern 3', target: -27 },
  { id: 'creatureRelease', p: {}, label: 'Wesen zieht los', target: -29 },
  { id: 'heroLand', p: {}, label: 'Held landet', target: -34 },
  { id: 'locked', p: {}, label: 'Gesperrt (Klopfen)', target: -36 },
  { id: 'gameOver', p: {}, label: 'Klassik: vorbei', target: -27 },
  { id: 'newBest', p: {}, label: 'Klassik: Bestwert', target: -22 },
];

/**
 * Lautheitsausgleich (dB) der neuen Klänge aus der Offline-Pegelmessung (lautestes 100-ms-Fenster, Standard-Mischung,
 * `sfxLevel` in render.ts; geprüft in audio.test.ts), wie `TRIM_DB` in `sfx.ts`.
 */
export const EXTRA_TRIM_DB: Partial<Record<ExtraSfxId, number>> = {
  gullCall: -7.5,
  gullWings: 4,
  dropFall: -2,
  splat: 1,
  stamp: 4.5,
  newCreature: 2.5,
  clack: -3,
  flameIgnite: -1,
  creatureRelease: -1.5,
  heroLand: 1.5,
  locked: -2.5,
  gameOver: -0.5,
  newBest: -2,
};
