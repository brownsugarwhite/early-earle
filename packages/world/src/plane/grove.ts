import { hash32 } from '../rng';
import type { Vec3 } from '../capPatch';
import { pickTreeKind, type GroveSpec, type GroveTree, type TreeFamily, type TreeKind } from '../scatterTrees';
import { GradientNoise2, smoothstep } from './noise2';
import type { PlanetVegetationFamily } from './types';

/**
 * Earle-Komposition der Haine auf der Ebene (Port von `scatterTrees.ts`): Haine als fließende Massen entlang der
 * Höhenlinien, dazwischen Wiesen, am Hainrand Trabanten, auf den Wiesen wenige Solitäre.
 */

export interface PlaneGroveField {
  readonly seed: number;
  heightNormAt(x: number, z: number): number;
  surfaceAt(x: number, z: number, outPos: Vec3, outNormal: Vec3): number;
}

const noiseCache = new Map<number, { mass: GradientNoise2; warp: GradientNoise2 }>();
function groveNoise(seed: number): { mass: GradientNoise2; warp: GradientNoise2 } {
  let n = noiseCache.get(seed);
  if (!n) {
    n = { mass: new GradientNoise2(hash32('plane-grove-mass', seed)), warp: new GradientNoise2(hash32('plane-grove-warp', seed)) };
    noiseCache.set(seed, n);
  }
  return n;
}

/** Streuung des Massenrauschens (Standardabweichung von `0.5 + 0.62·fbm`). */
const MASS_SIGMA = 0.13;

function probit(p: number): number {
  const q = Math.min(1 - 1e-6, Math.max(1e-6, p));
  const sgn = q < 0.5 ? -1 : 1;
  const pp = q < 0.5 ? q : 1 - q;
  const tt = Math.sqrt(-2 * Math.log(pp));
  const z = tt - (2.515517 + 0.802853 * tt + 0.010328 * tt * tt) / (1 + 1.432788 * tt + 0.189269 * tt * tt + 0.001308 * tt * tt * tt);
  return sgn * z;
}

/** Hainmaske 0..1 an (x, z): ≥ 0.5 im Hain (Kern → 1), Randband 0.3..0.5, darunter Wiese. */
export function planeGroveMask(field: PlaneGroveField, x: number, z: number, grove: GroveSpec): number {
  const { mass, warp } = groveNoise(field.seed);
  const f = 1 / Math.max(1, grove.wavelength ?? 9);
  const px = x * f;
  const pz = z * f;
  const wx = warp.fbm(px * 0.5 + 4.1, pz * 0.5 + 8.3, 2);
  const wz = warp.fbm(px * 0.5 - 6.2, pz * 0.5 - 3.4, 2);
  const n = mass.fbm(px + 1.6 * wx, pz + 1.6 * wz, 2);
  const m = 0.5 + 0.62 * n;
  const cover = Math.min(1, Math.max(0, grove.cover));
  const t = cover <= 0 ? 99 : 0.5 + probit(1 - cover) * MASS_SIGMA;
  let s = m - t;
  const contours = grove.contours ?? [];
  if (contours.length > 0) {
    const h = field.heightNormAt(x, z) + 0.07 * n;
    const w = (grove.contourWidth ?? 0.12) * (0.55 + 0.9 * Math.min(1, Math.max(0, m)));
    for (const c of contours) s = Math.max(s, (w - Math.abs(h - c)) * 0.6);
  }
  if (grove.invert) s = -s;
  return Math.min(1, Math.max(0, 0.5 + 4 * s));
}

/** Entscheidet für einen Streukandidaten, ob und welcher Baum dort steht (ohne `grove` altes Verhalten). */
export function planeComposeGroveTree(field: PlaneGroveField, x: number, z: number, fam: PlanetVegetationFamily, kind: TreeKind, scale: number, rand: () => number): GroveTree | null {
  const grove = (fam as TreeFamily).grove;
  if (!grove) return { kind, scale };
  const g = planeGroveMask(field, x, z, grove);
  const r = rand();
  const [s0, s1] = fam.scale;
  let out: GroveTree | null = null;
  if (g > 0.5) {
    const inside = smoothstep(0.5, 0.58, g);
    if (r < (grove.fill ?? 0.9) * (0.55 + 0.45 * inside)) {
      const core = smoothstep(0.62, 0.95, g);
      out = { kind, scale: scale * (1 + (grove.coreScale ?? 0.35) * core) };
    }
  } else if (g > 0.32) {
    if (r < (grove.satellites ?? 0.18) * smoothstep(0.32, 0.5, g)) {
      const k = grove.edgeKinds ? pickTreeKind(grove.edgeKinds, rand()) : kind;
      out = { kind: k, scale: s0 + (s1 - s0) * 0.45 * rand() };
    }
  } else if (r < (grove.specimens ?? 0.004)) {
    const k = grove.specimenKinds ? pickTreeKind(grove.specimenKinds, rand()) : kind;
    const [a, b] = grove.specimenScale ?? [s0 + (s1 - s0) * 0.5, s1];
    out = { kind: k, scale: a + (b - a) * rand() };
  }
  if (!out) return null;
  const maxSlope = grove.maxSlope ?? 0.35;
  if (maxSlope < 1) {
    const pos: Vec3 = [0, 0, 0];
    const nor: Vec3 = [0, 0, 0];
    field.surfaceAt(x, z, pos, nor);
    if (1 - nor[1] > maxSlope) return null;
  }
  return out;
}
