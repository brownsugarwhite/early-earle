import type { AudioGraph, Strip } from './graph';
import { clamp } from './dsp';
import type { ZoneKey } from './scales';
import type { SfxParams } from './sfx';

/**
 * Gemeinsame Bausteine der Klang-Rezepte (`sfx.ts` Grundkatalog, `sfxExtra.ts` Iteration 4): die Rezept-Signatur,
 * der geliehene Kanal mit dem Lautheitsausgleich des gerade gebauten Klangs, Zone und Stärke mit Vorgaben und die
 * kleine Zufallsverstimmung, damit Wiederholungen nicht mechanisch klingen.
 */

export type Player = (g: AudioGraph, t: number, p: SfxParams) => void;

export const Z = (p: SfxParams): ZoneKey => p.zone ?? 'tjorizo';
export const V = (p: SfxParams): number => clamp(p.vel ?? 1, 0, 1.5);
export const richOf = (tier: number): number => clamp((tier - 2) / 8, 0, 1);
/** Small random detune factor (± `cents`). */
export const jitter = (g: AudioGraph, cents: number): number => Math.pow(2, ((g.rand() * 2 - 1) * cents) / 1200);

/** Level trim of the sound being built (set by `playSfx` via `withTrim`, applied to its strips). */
let trim = 1;

/** The trim of the sound being built as a linear factor (voices that do not borrow via `sfxVoice`, e.g. `speak`). */
export function currentTrim(): number {
  return trim;
}

/** Builds a sound with the trim `db` on every strip it borrows (restores the previous trim afterwards). */
export function withTrim(db: number, build: () => void): void {
  const prev = trim;
  trim = Math.pow(10, db / 20);
  try {
    build();
  } finally {
    trim = prev;
  }
}

export function sfxVoice(g: AudioGraph, t: number, dur: number, prio: number, p: SfxParams, reverb: number, gain = 1): Strip | null {
  return g.voice('sfx', t, dur, prio, p.pan ?? 0, reverb, gain * trim);
}
