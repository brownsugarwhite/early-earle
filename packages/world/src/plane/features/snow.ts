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

  /** Feld am Bildfokus (Mitte x, z und Radius) oder null. */
  private readonly focus: [number, number, number] | null;

  constructor(spec: SnowFieldSpec, seed: number, worldId: string, focus?: readonly [number, number]) {
    this.broad = new GradientNoise2(hash32('snow-broad', worldId, seed));
    this.fine = new GradientNoise2(hash32('snow-fine', worldId, seed));
    this.cover = Math.min(0.95, Math.max(0.05, spec.cover));
    // Wellenlänge ≈ 10 Welteinheiten × Maßstab
    this.k = 1 / (10 * (spec.scale ?? 1));
    const f = spec.focus;
    this.focus = f && focus ? [focus[0] + (f.offset?.[0] ?? 0), focus[1] + (f.offset?.[1] ?? 0), Math.max(0.5, f.radius)] : null;
  }

  /** Feldwert (> 0 Schnee) aus Ort und relativer Höhe 0..1. */
  value(x: number, z: number, heightNorm: number): number {
    const k = this.k;
    const n = this.broad.fbm(x * k * 0.6 + 3.1, z * k * 1.35 + 7.3, 2);
    const w = this.fine.fbm(x * k * 2.2 - 5.3, z * k * 3.1 - 0.7, 1);
    const valley = 0.5 - Math.min(1, Math.max(0, heightNorm));
    let v = n * 0.62 + w * 0.16 + valley * 0.55 + (this.cover - 0.5) * 0.9;
    const f = this.focus;
    if (f) {
      // Feld am Bildfokus: weich gewellter Rand (das Rauschen bleibt in der Kante)
      const d = Math.hypot((x - f[0]) / f[2], (z - f[1]) / (f[2] * 0.7));
      v = Math.max(v, 0.55 * (1 - d * d) + w * 0.2 + n * 0.15);
    }
    return v;
  }
}
