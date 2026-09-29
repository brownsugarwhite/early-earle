import { hslToHex, shiftHex, mixHex } from './color';
import { hash32, makeRng } from './rng';
import { MAX_GENOME_SPHERES, type BlobParams, type MaterialKind, type SpherePrim, type Vec3 } from './types';

export type ZoneId = 'tjorizo' | 'syrup' | 'luzz' | 'wooding';
export const ZONES: readonly ZoneId[] = ['tjorizo', 'syrup', 'luzz', 'wooding'];

/** Hue offset per zone relative to Tjorizo's teal start palette (from the k-means zone palettes). */
export const ZONE_HUE_SHIFT: Readonly<Record<ZoneId, number>> = { tjorizo: 0, syrup: 130, luzz: 20, wooding: -110 };

/** One stop of the tier palette ramp (HSL, hue in degrees). */
export interface RampStop {
  hue: number;
  sat: number;
  light: number;
}

/**
 * Tier ramp of the blob sheet: teal → green → yellow → orange. Tier 1 is pezenpez (#7ce6d5 / #22baa9,
 * inner #2f7f7a). Hues in degrees, lightness of the base colour.
 */
const TIER_RAMP: RampStop[] = [
  { hue: 171, sat: 0.68, light: 0.69 }, // 1 teal (pezenpez)
  { hue: 158, sat: 0.66, light: 0.66 }, // 2 mint
  { hue: 132, sat: 0.66, light: 0.62 }, // 3 green
  { hue: 92, sat: 0.72, light: 0.6 }, // 4 lime
  { hue: 58, sat: 0.82, light: 0.6 }, // 5 yellow
  { hue: 42, sat: 0.9, light: 0.58 }, // 6 amber
  { hue: 26, sat: 0.9, light: 0.56 }, // 7 orange
  { hue: 12, sat: 0.86, light: 0.52 }, // 8 red-orange
];

/** Material thresholds (plan §5): merges switch material at tier boundaries. */
export function materialForTier(tier: number): MaterialKind {
  if (tier <= 3) return 'jelly';
  if (tier <= 5) return 'liquid';
  if (tier <= 7) return 'gas';
  return 'fire';
}

/** The built-in blob-sheet ramp (read-only copy for editors that want to start from it). */
export const DEFAULT_TIER_RAMP: readonly Readonly<RampStop>[] = TIER_RAMP;

/** Optional palette override from `content/genome/rules.json` (per zone). */
export interface PaletteOverride {
  /** Replaces the built-in tier ramp (index = tier − 1; the last stop repeats for higher tiers). */
  ramp?: readonly RampStop[] | undefined;
  /** Replaces the built-in zone hue shift (degrees). */
  hueShift?: number | undefined;
}

export type BlobPalette = Pick<BlobParams, 'baseColor' | 'innerColor' | 'rimColor' | 'highlightColor' | 'bubbleColor'>;

/**
 * Palette for a (zone, tier, material). Exported so the merge timeline can crossfade toward a child.
 * Without `override` the result is the built-in blob-sheet ramp (tier 1 Tjorizo = exact pezenpez colours).
 */
export function paletteFor(zone: ZoneId, tier: number, material: MaterialKind, override?: PaletteOverride): BlobPalette {
  const stops = override?.ramp && override.ramp.length > 0 ? override.ramp : TIER_RAMP;
  const ramp = stops[Math.min(stops.length, Math.max(1, Math.round(tier))) - 1]!;
  const hue = ramp.hue + (override?.hueShift ?? ZONE_HUE_SHIFT[zone]);
  const pezenpez = tier === 1 && zone === 'tjorizo' && !override?.ramp && override?.hueShift === undefined;
  let base = pezenpez ? '#7ce6d5' : hslToHex(hue, ramp.sat, ramp.light);
  let inner = pezenpez ? '#2f7f7a' : hslToHex(hue + 4, ramp.sat * 0.7, ramp.light * 0.5);
  let rim = shiftHex(base, -6, 1.22, 0.8);
  let highlight = mixHex('#ffffff', base, 0.08);
  let bubble = shiftHex(base, 0, 1.25, 0.6);
  if (material === 'fire') {
    // Fire is always ember orange with a yellow core, whatever the tier hue.
    base = mixHex('#e8552a', hslToHex(hue, 0.9, 0.5), 0.15);
    inner = '#ffcf4a';
    rim = '#ff8a3c';
    highlight = '#fff1b8';
    bubble = '#ffe9a0';
  } else if (material === 'gas') {
    base = shiftHex(base, 0, 1.05, 0.55);
    inner = shiftHex(inner, 0, 1.4, 0.5);
    rim = mixHex(base, '#ffffff', 0.35);
  } else if (material === 'liquid') {
    rim = mixHex(base, '#ffffff', 0.45);
    highlight = '#ffffff';
  }
  return { baseColor: base, innerColor: inner, rimColor: rim, highlightColor: highlight, bubbleColor: bubble };
}

function normalize3(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * Deterministic genome stub: `blob = f(zone, tier, seed)`. Tier 1 = pezenpez (one teal body, one eye slit);
 * higher tiers grow, gain lobes and shift the palette along the blob sheet. Body is in blob units
 * (main sphere r = 1); the renderer applies a world scale.
 */
export function genomeFor(zone: ZoneId, tier: number, seed: number | string = 0, material?: MaterialKind): BlobParams {
  const t = Math.max(1, Math.min(8, Math.round(tier)));
  const rng = makeRng(hash32(zone, t, seed));
  const mat = material ?? materialForTier(t);

  // Body: a dome (main sphere + a wider, lower base sphere, cut flat at the floor like the reference)
  // plus up to 6 lobes. Lobes sit in the upper hemisphere and at the sides so the base stays clean;
  // tier 1 keeps the pezenpez shoulder bump on the upper right.
  const lobeCount = Math.min(MAX_GENOME_SPHERES - 2, t - 1);
  const spheres: SpherePrim[] = [
    { center: [0, 0.08, 0], r: 1 },
    { center: [0, -0.3 - 0.05 * t, 0], r: 0.96 + 0.03 * t },
  ];
  if (t === 1) spheres.push({ center: [0.5, 0.5, 0.15], r: 0.52 });
  const golden = 2.399963; // golden angle spreads lobes around the body deterministically
  for (let i = 0; i < lobeCount; i++) {
    const ang = i * golden + rng.range(-0.4, 0.4);
    const elev = rng.range(0.15, 0.9); // radians above the equator
    const dist = rng.range(0.5, 0.8);
    const r = rng.range(0.34, 0.55) * (1 + 0.03 * i);
    const dir: Vec3 = [Math.cos(ang) * Math.cos(elev), Math.sin(elev), Math.sin(ang) * Math.cos(elev)];
    spheres.push({ center: [dir[0] * dist, dir[1] * dist + 0.1 * t, dir[2] * dist], r });
  }

  const viscosity = mat === 'jelly' ? rng.range(0.25, 0.45) : mat === 'liquid' ? rng.range(0.1, 0.25) : mat === 'gas' ? rng.range(0.5, 0.7) : rng.range(0.3, 0.5);
  const palette = paletteFor(zone, t, mat);

  // Eye: slightly right of centre, facing the camera-ish (+z), a little upward.
  const eyeDir = normalize3([0.22 + rng.range(-0.05, 0.05), 0.3 + rng.range(-0.05, 0.08), 1]);

  return {
    spheres,
    floorY: -1.05 - 0.05 * t,
    sminK: mat === 'liquid' ? rng.range(0.45, 0.6) : rng.range(0.3, 0.45),
    noiseAmp: mat === 'gas' ? rng.range(0.12, 0.18) : mat === 'fire' ? rng.range(0.1, 0.16) : rng.range(0.05, 0.07),
    noiseFreq: mat === 'gas' ? rng.range(1.2, 1.8) : rng.range(0.8, 1.1),
    breathHz: rng.range(0.35, 0.6) * (mat === 'fire' ? 2 : 1),
    squash: { axis: [0, 1, 0], amount: 0, taper: mat === 'gas' ? 0.2 : 0.55 },
    morph: 0,
    ...palette,
    gloss: mat === 'liquid' ? 0.9 : mat === 'gas' ? 0.15 : mat === 'fire' ? 0.3 : rng.range(0.55, 0.75),
    translucency: mat === 'jelly' ? rng.range(0.6, 0.8) : mat === 'liquid' ? 0.35 : mat === 'gas' ? 0.5 : 0.9,
    bubbleDensity: mat === 'jelly' ? rng.range(0.4, 0.7) : mat === 'liquid' ? 0.25 : 0,
    material: mat,
    eye: { dir: eyeDir, size: 0.3 + 0.015 * t, spacing: t >= 3 ? 0.26 : 0 },
    viscosity,
  };
}

/** World-space scale of a tier (tier 1 ≈ 0.36 units on a 1-unit grid cell, growing per tier). */
export function scaleForTier(tier: number): number {
  return 0.32 * (1 + 0.06 * (Math.max(1, tier) - 1));
}

/** Deep copy so callers can mutate a genome (merge timeline) without touching cached results. */
export function cloneParams(p: BlobParams): BlobParams {
  return {
    ...p,
    spheres: p.spheres.map((s) => ({ center: [...s.center] as Vec3, r: s.r })),
    squash: { ...p.squash, axis: [...p.squash.axis] as Vec3 },
    eye: { ...p.eye, dir: [...p.eye.dir] as Vec3 },
  };
}
