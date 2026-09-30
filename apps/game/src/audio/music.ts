import { rng32, Strip, type AudioGraph } from './graph';
import { bass, flute, glass, kalimba, marimbaLite, pad, vibes } from './dsp';
import { mtof, setNotes, ZONE_MUSIC, type ZoneKey } from './scales';

/**
 * Generative music per zone: slow, sparse pentatonic phrases on the zone's lead instrument over an open pad,
 * a soft bass on the map, rare glass sparkles and the occasional echo. Four-bar phrases breathe (the fourth
 * bar mostly rests); chords change every two bars on the map and every four in a level. In levels the music
 * thins out (half the notes, no bass, softer pad) and sits lower so the board carries the sound.
 */

export type MusicMode = 'map' | 'level';

export interface MusicNote {
  t: number;
  kind: 'lead' | 'echo' | 'sparkle' | 'bass' | 'pad' | 'breath';
  midi: number;
  vel: number;
  /** Pad chord (MIDI notes) and hold time. */
  chord?: readonly number[];
  dur?: number;
}

const GRID_MAP = [0.62, 0.12, 0.34, 0.16, 0.5, 0.12, 0.3, 0.14];

/** Deterministic phrase generator (same seed → same music), independent of any audio context. */
export class MusicGenerator {
  private bar = 0;
  private note: number;
  private readonly rng: () => number;
  private readonly lead: number[];

  constructor(
    readonly zone: ZoneKey,
    seed = 1,
  ) {
    this.rng = rng32(seed * 7919 + zone.length * 131);
    const m = ZONE_MUSIC[zone];
    this.lead = setNotes(zone, m.root, m.root + 19);
    this.note = this.lead[Math.min(2, this.lead.length - 1)] ?? m.root;
  }

  get bpm(): number {
    return ZONE_MUSIC[this.zone].bpm;
  }

  /** Bar length (s). */
  get barSeconds(): number {
    return (4 * 60) / this.bpm;
  }

  /** Appends the notes of the next bar (starting at context time `t`) to `out`; returns the bar length. */
  nextBar(t: number, mode: MusicMode, out: MusicNote[]): number {
    const m = ZONE_MUSIC[this.zone];
    const r = this.rng;
    const eighth = 30 / m.bpm;
    const barLen = eighth * 8;
    const chordBars = mode === 'map' ? 2 : 4;
    const chord = m.chords[Math.floor(this.bar / chordBars) % m.chords.length] ?? m.chords[0]!;
    const chordStart = this.bar % chordBars === 0;
    const phraseBar = this.bar % 4;
    const density = (mode === 'map' ? 1 : 0.5) * (phraseBar === 3 ? 0.3 : 1);
    const chordPcs = new Set(chord.map((n) => (((n - m.root) % 12) + 12) % 12));

    if (chordStart) {
      const upper = chord.slice(1);
      out.push({ t, kind: 'pad', midi: chord[0]!, vel: mode === 'map' ? 0.2 : 0.11, chord: upper, dur: barLen * chordBars });
      if (mode === 'map') out.push({ t, kind: 'bass', midi: chord[0]! >= 48 ? chord[0]! - 12 : chord[0]!, vel: 0.34 });
    } else if (mode === 'map' && r() < 0.35) {
      out.push({ t: t + eighth * 4, kind: 'bass', midi: (chord[1] ?? chord[0]!) - 12, vel: 0.22 });
    }

    for (let i = 0; i < 8; i++) {
      const grid = GRID_MAP[i] ?? 0.1;
      if (r() >= grid * density) continue;
      // Random walk on the lead range; strong beats lean to chord tones.
      const idx = Math.max(0, this.lead.indexOf(this.note));
      const u = r();
      const step = u < 0.12 ? -2 : u < 0.46 ? -1 : u < 0.54 ? 0 : u < 0.88 ? 1 : 2;
      let k = Math.min(this.lead.length - 1, Math.max(0, idx + step));
      if ((i === 0 || i === 4) && r() < 0.65) {
        const pc = (n: number): number => (((n - m.root) % 12) + 12) % 12;
        let best = k;
        for (let d = 0; d < this.lead.length; d++) {
          const a = k + d;
          const b = k - d;
          if (a < this.lead.length && chordPcs.has(pc(this.lead[a]!))) {
            best = a;
            break;
          }
          if (b >= 0 && chordPcs.has(pc(this.lead[b]!))) {
            best = b;
            break;
          }
        }
        k = best;
      }
      this.note = this.lead[k] ?? this.note;
      const at = t + i * eighth + (r() - 0.5) * 0.016;
      const vel = 0.3 + (i % 4 === 0 ? 0.1 : 0.03) + r() * 0.06;
      out.push({ t: at, kind: 'lead', midi: this.note, vel: mode === 'map' ? vel : vel * 0.85 });
      if (r() < 0.18) out.push({ t: at + eighth * 3, kind: 'echo', midi: this.note, vel: vel * 0.42 });
      if (mode === 'map' && r() < 0.05) {
        const top = chord[chord.length - 1]!;
        out.push({ t: at + eighth, kind: 'sparkle', midi: top + 24 > 100 ? top + 12 : top + 24, vel: 0.1 });
      }
    }
    // Luzz breathes a long flute note in the resting bar; the others sometimes add a slow sparkle there.
    if (phraseBar === 3 && r() < (this.zone === 'luzz' ? 0.8 : 0.3)) {
      const n = chord[2] ?? chord[0]!;
      if (this.zone === 'luzz') out.push({ t: t + eighth, kind: 'breath', midi: n + 12, vel: mode === 'map' ? 0.32 : 0.22, dur: eighth * 5 });
      else out.push({ t: t + eighth * 2, kind: 'sparkle', midi: n + 24, vel: 0.08 });
    }
    this.bar++;
    return barLen;
  }
}

/** Plays one note of the generator on a layer's strips. */
function playNote(lead: Strip, color: Strip, center: Strip, zone: ZoneKey, n: MusicNote): void {
  const f = mtof(n.midi);
  switch (n.kind) {
    case 'pad':
      pad(center, n.t, (n.chord ?? [n.midi]).map(mtof), n.vel, 1.6, Math.max(0.5, (n.dur ?? 6) - 1.6), 2.6, 1000);
      break;
    case 'bass':
      bass(center, n.t, f, n.vel, 1.8);
      break;
    case 'sparkle':
      glass(color, n.t, f, n.vel, 1.3);
      break;
    case 'breath':
      flute(color, n.t, f, n.vel, n.dur ?? 1.5);
      break;
    case 'echo':
    case 'lead': {
      const dest = n.kind === 'echo' ? color : lead;
      switch (ZONE_MUSIC[zone].lead) {
        case 'vibes':
          vibes(dest, n.t, f, n.vel * 0.9, undefined, 1.8);
          break;
        case 'celesta':
          glass(dest, n.t, f, n.vel * 1.1, 0.9);
          break;
        case 'kalimba':
          kalimba(dest, n.t, f, n.vel);
          break;
        default:
          marimbaLite(dest, n.t, f, n.vel);
          break;
      }
      break;
    }
    default:
      break;
  }
}

/** One zone's running music: its generator, three fixed strips (lead left, colour right, centre) and a fader. */
export class MusicLayer {
  private readonly lead: Strip;
  private readonly color: Strip;
  private readonly center: Strip;
  private readonly gen: MusicGenerator;
  private nextBar: number;
  private stopped = false;
  private readonly buf: MusicNote[] = [];
  mode: MusicMode;

  constructor(
    private readonly g: AudioGraph,
    readonly zone: ZoneKey,
    mode: MusicMode,
    t0: number,
    fadeIn: number,
    seed = 1,
  ) {
    this.mode = mode;
    this.gen = new MusicGenerator(zone, seed);
    this.lead = new Strip(g, 'music', false);
    this.color = new Strip(g, 'music', false);
    this.center = new Strip(g, 'music', false);
    this.lead.begin(t0, 0, 0, -0.22, 0.34, 0);
    this.color.begin(t0, 0, 0, 0.28, 0.42, 0);
    this.center.begin(t0, 0, 0, 0, 0.3, 0);
    const level = this.levelFor(mode);
    for (const s of [this.lead, this.color, this.center]) s.input.gain.linearRampToValueAtTime(level, t0 + fadeIn);
    this.nextBar = t0 + 0.05;
  }

  private levelFor(mode: MusicMode): number {
    return mode === 'map' ? 1 : 0.5;
  }

  setMode(mode: MusicMode, t: number): void {
    if (mode === this.mode || this.stopped) return;
    this.mode = mode;
    for (const s of [this.lead, this.color, this.center]) {
      s.input.gain.cancelScheduledValues(t);
      s.input.gain.setTargetAtTime(this.levelFor(mode), t, 0.8);
    }
  }

  /** Schedules every bar that starts before `until`. */
  pump(until: number): void {
    if (this.stopped) return;
    while (this.nextBar < until) {
      this.buf.length = 0;
      const len = this.gen.nextBar(this.nextBar, this.mode, this.buf);
      for (const n of this.buf) playNote(this.lead, this.color, this.center, this.zone, n);
      this.nextBar += len;
    }
  }

  /** Re-anchors after a pause or a stall so the next bar starts promptly instead of bunching up. */
  resync(now: number): void {
    if (this.nextBar < now - 0.05) this.nextBar = now + 0.1;
  }

  stop(t: number, fade: number): void {
    if (this.stopped) return;
    this.stopped = true;
    for (const s of [this.lead, this.color, this.center]) {
      const p = s.input.gain;
      p.cancelScheduledValues(t);
      p.setValueAtTime(p.value, t);
      p.linearRampToValueAtTime(0, t + fade);
    }
  }

  get isStopped(): boolean {
    return this.stopped;
  }

  /** Detaches the layer's strips (call after the fade-out has finished). */
  dispose(): void {
    this.stopped = true;
    for (const s of [this.lead, this.color, this.center]) s.dispose();
  }
}
