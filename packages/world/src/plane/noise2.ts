/**
 * Glattes 2D-Gradientenrauschen für die unendliche Ebene (ADR 0002). Anders als `GradientNoise3` ohne Permutations-
 * tabelle: die Gradienten kommen aus einem Hash der Gitterzelle, das Feld wiederholt sich nie (die Tabelle hatte eine
 * Periode von 256 Zellen ≈ 2,8 km bei Hügelwellenlänge 11). Quintische Überblendung, Werte etwa in [-1, 1].
 */
export class GradientNoise2 {
  private readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  /** Gradient (Einheitsvektor aus 16 Richtungen) der Gitterzelle (i, j), als Skalarprodukt mit (x, y). */
  private grad(i: number, j: number, x: number, y: number): number {
    let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x165667b1) ^ this.seed;
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    h ^= h >>> 15;
    const a = ((h >>> 0) & 15) * (Math.PI / 8) + 0.19634954084936207; // 16 Richtungen, um eine halbe Stufe gedreht
    return Math.cos(a) * x + Math.sin(a) * y;
  }

  /** Ein Oktav, ≈ [-1, 1]. */
  sample(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const u = fade(fx);
    const v = fade(fy);
    const n00 = this.grad(x0, y0, fx, fy);
    const n10 = this.grad(x0 + 1, y0, fx - 1, fy);
    const n01 = this.grad(x0, y0 + 1, fx, fy - 1);
    const n11 = this.grad(x0 + 1, y0 + 1, fx - 1, fy - 1);
    const nx0 = n00 + (n10 - n00) * u;
    const nx1 = n01 + (n11 - n01) * u;
    // Auf die Streuung des alten 3D-Rauschens auf der Kugel geeicht (fbm-Standardabweichung ≈ 0,19 statt 0,23):
    // Hügelformen, Haine und Schneefelder behalten ihre abgestimmten Schwellen
    return (nx0 + (nx1 - nx0) * v) * NORM;
  }

  /** fbm mit `octaves` Oktaven (Lacunarity 2, Gain 0.5), normalisiert auf etwa [-1, 1]. */
  fbm(x: number, y: number, octaves: number): number {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.sample(x * f + o * 17.31, y * f - o * 11.13);
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  }
}

/** √2 (Maximum des 2D-Gradientenrauschens → ±1) × 0,847 (Eichung auf das alte Kugelrauschen). */
const NORM = 1.4142135623730951 * 0.847;

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 32-bit-Integer-Hash zweier Ganzzahlen und eines Salzes → 0..1. */
export function hash2(i: number, j: number, salt: number): number {
  let h = Math.imul(i | 0, 0x9e3779b1) ^ Math.imul(j | 0, 0x85ebca77) ^ Math.imul(salt | 0, 0xc2b2ae3d);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
