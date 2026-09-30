import { GradientNoise3 } from '../noise';
import { hash32 } from '../rng';
import type { SnowFieldSpec } from './types';

/**
 * Schneefelder (Bild 05, Ebene_10): gewundene, organische Schneeflächen zwischen dunklen Waldmassen. Feld > 0 = Schnee.
 * Tälern und flachen Hängen folgend (niedrige Höhe begünstigt Schnee, Grate tragen Wald), mit langgezogenen
 * Rauschformen, damit die Felder als Bahnen zwischen den Waldrücken laufen.
 */
export class SnowFields {
  private readonly broad: GradientNoise3;
  private readonly fine: GradientNoise3;
  private readonly cover: number;
  private readonly k: number;

  constructor(spec: SnowFieldSpec, seed: number, worldId: string, radius: number) {
    this.broad = new GradientNoise3(hash32('snow-broad', worldId, seed));
    this.fine = new GradientNoise3(hash32('snow-fine', worldId, seed));
    this.cover = Math.min(0.95, Math.max(0.05, spec.cover));
    // Wellenlänge ≈ 10 Welteinheiten × Maßstab
    this.k = radius / (10 * (spec.scale ?? 1));
  }

  /** Feldwert (> 0 Schnee) aus Richtung und relativer Höhe 0..1. */
  value(dx: number, dy: number, dz: number, heightNorm: number): number {
    const k = this.k;
    // Langgezogen: Nord-Süd gestaucht → Bahnen laufen quer zum Blick längs des Weltbands
    const n = this.broad.fbm(dx * k * 1.35 + 3.1, dy * k * 0.55 - 1.7, dz * k * 1.35 + 7.3, 2);
    const w = this.fine.fbm(dx * k * 3.1 - 5.3, dy * k * 2.2 + 2.9, dz * k * 3.1 - 0.7, 1);
    const valley = 0.5 - Math.min(1, Math.max(0, heightNorm));
    return n * 0.62 + w * 0.16 + valley * 0.55 + (this.cover - 0.5) * 0.9;
  }
}
