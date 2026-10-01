import { GradientNoise2 } from '../noise2';
import { hash32 } from '../../rng';
import type { SnowFieldSpec } from './types';

/**
 * Schneefelder (Bild 05, Ebene_10): gewundene, organische Schneeflächen zwischen dunklen Waldmassen. Feld > 0 = Schnee.
 * Tälern und flachen Hängen folgend, mit langgezogenen Rauschformen quer zur Blickrichtung (Bahnen laufen quer durchs
 * Bild wie bei Earle: x gestreckt, z gestaucht).
 */
export class SnowFields {
  private readonly broad: GradientNoise2;
  private readonly fine: GradientNoise2;
  private readonly cover: number;
  private readonly k: number;

  constructor(spec: SnowFieldSpec, seed: number, worldId: string) {
    this.broad = new GradientNoise2(hash32('snow-broad', worldId, seed));
    this.fine = new GradientNoise2(hash32('snow-fine', worldId, seed));
    this.cover = Math.min(0.95, Math.max(0.05, spec.cover));
    // Wellenlänge ≈ 10 Welteinheiten × Maßstab
    this.k = 1 / (10 * (spec.scale ?? 1));
  }

  /** Feldwert (> 0 Schnee) aus Ort und relativer Höhe 0..1. */
  value(x: number, z: number, heightNorm: number): number {
    const k = this.k;
    const n = this.broad.fbm(x * k * 0.6 + 3.1, z * k * 1.35 + 7.3, 2);
    const w = this.fine.fbm(x * k * 2.2 - 5.3, z * k * 3.1 - 0.7, 1);
    const valley = 0.5 - Math.min(1, Math.max(0, heightNorm));
    return n * 0.62 + w * 0.16 + valley * 0.55 + (this.cover - 0.5) * 0.9;
  }
}
