import { mulberry32 } from './rng';

/**
 * Glattes 3D-Gradientenrauschen (Perlin-Stil, quintische Überblendung) mit geseedeter Permutation.
 * Liefert Werte in etwa [-1, 1]. Zwei Oktaven davon ergeben die "gemeißelten" Hügel ohne Grate.
 */
export class GradientNoise3 {
  private readonly perm = new Uint8Array(512);

  constructor(seed: number) {
    const rand = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = p[i]!;
      p[i] = p[j]!;
      p[j] = t;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]!;
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    // 12 Kantengradienten des Würfels (Perlin 2002)
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  sample(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const p = this.perm;
    const A = p[X]! + Y;
    const AA = p[A]! + Z;
    const AB = p[A + 1]! + Z;
    const B = p[X + 1]! + Y;
    const BA = p[B]! + Z;
    const BB = p[B + 1]! + Z;
    return lerp(
      w,
      lerp(
        v,
        lerp(u, this.grad(p[AA]!, x, y, z), this.grad(p[BA]!, x - 1, y, z)),
        lerp(u, this.grad(p[AB]!, x, y - 1, z), this.grad(p[BB]!, x - 1, y - 1, z)),
      ),
      lerp(
        v,
        lerp(u, this.grad(p[AA + 1]!, x, y, z - 1), this.grad(p[BA + 1]!, x - 1, y, z - 1)),
        lerp(u, this.grad(p[AB + 1]!, x, y - 1, z - 1), this.grad(p[BB + 1]!, x - 1, y - 1, z - 1)),
      ),
    );
  }

  /** fbm mit `octaves` Oktaven (Lacunarity 2, Gain 0.5), normalisiert auf etwa [-1, 1]. */
  fbm(x: number, y: number, z: number, octaves: number): number {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.sample(x * f + o * 17.31, y * f + o * 3.7, z * f - o * 11.13);
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  }
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}
