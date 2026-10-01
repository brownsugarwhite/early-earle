import type { WorldPalette } from './palette';

/**
 * Paletten prozeduraler Welten (ADR 0002): zwei Elternpaletten in OKLab gemischt, dann im Farbton gedreht und in
 * Buntheit/Helligkeit leicht verschoben — die Tinte bleibt dunkel (Earle: getönte Tinte, nie Schwarz), die Stufen
 * bleiben geordnet, jede Welt bekommt ihre eigene Serigrafie-Palette.
 */

export interface PaletteRecipe {
  t: number;
  /** Farbdreh in Grad. */
  hue: number;
  chroma: number;
  light: number;
}

type Lab = [number, number, number];

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = Math.min(1, Math.max(0, c));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function hexToOklab(hex: string): Lab {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = srgbToLinear(((v >> 16) & 255) / 255);
  const g = srgbToLinear(((v >> 8) & 255) / 255);
  const b = srgbToLinear((v & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

export function oklabToHex([L, a, b]: Lab): string {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const r = linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bb = linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return '#' + [r, g, bb].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

function mixLab(a: Lab, b: Lab, t: number): Lab {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Farbdreh, Buntheit und Helligkeit (Tinte: Helligkeit gedeckelt, bleibt Tinte). */
function shift(c: Lab, r: PaletteRecipe, ink: boolean): Lab {
  const ang = (r.hue * Math.PI) / 180;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const a = (c[1] * ca - c[2] * sa) * r.chroma;
  const b = (c[1] * sa + c[2] * ca) * r.chroma;
  const L = ink ? Math.min(c[0], 0.3) : Math.min(0.97, Math.max(0.08, c[0] * r.light));
  return [L, a, b];
}

function mixHex(a: string, b: string, r: PaletteRecipe, ink = false): string {
  return oklabToHex(shift(mixLab(hexToOklab(a), hexToOklab(b), r.t), r, ink));
}

/** Liste gleich lang machen (Stufen nach relativer Lage wählen). */
function resample(list: readonly string[], n: number): string[] {
  if (list.length === n) return [...list];
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(list[Math.round((i / Math.max(1, n - 1)) * (list.length - 1))] ?? list[list.length - 1]!);
  return out;
}

function mixList(a: readonly string[] | undefined, b: readonly string[] | undefined, r: PaletteRecipe, inkFirst = false): string[] | undefined {
  if (!a && !b) return undefined;
  const A = a ?? b!;
  const B = b ?? a!;
  const n = Math.max(A.length, B.length);
  const ra = resample(A, n);
  const rb = resample(B, n);
  return ra.map((c, i) => mixHex(c, rb[i]!, r, inkFirst && i === 0));
}

function mixAlpha(a: readonly number[], b: readonly number[], t: number): number[] {
  const n = Math.max(a.length, b.length);
  const at = (l: readonly number[], i: number): number => l[Math.round((i / Math.max(1, n - 1)) * (l.length - 1))] ?? l[l.length - 1] ?? 0;
  return Array.from({ length: n }, (_, i) => at(a, i) + (at(b, i) - at(a, i)) * t);
}

/** Palette einer prozeduralen Welt aus zwei Elternpaletten. */
export function proceduralPalette(A: WorldPalette, B: WorldPalette, r: PaletteRecipe): WorldPalette {
  const dom = r.t < 0.5 ? A : B;
  const out: WorldPalette = {
    ink: mixHex(A.ink, B.ink, r, true),
    terrain: mixList(A.terrain, B.terrain, r)!,
    canopy: mixList(A.canopy, B.canopy, r)!,
    sky: mixList(A.sky, B.sky, r)!,
    sun: mixHex(A.sun, B.sun, { ...r, hue: r.hue * 0.3 }),
    sunRing: mixHex(A.sunRing, B.sunRing, r),
    fog: mixList(A.fog, B.fog, r)!,
    fogAlpha: mixAlpha(A.fogAlpha, B.fogAlpha, r.t),
    accent: mixList(A.accent, B.accent, r)!,
  };
  const variants = dom.canopyVariants;
  if (variants) out.canopyVariants = variants.map((v) => mixList(v, v, r)!);
  for (const k of ['monolith', 'barn', 'water', 'rock', 'snow'] as const) {
    const m = mixList(A[k], B[k], r);
    if (m) out[k] = m;
  }
  return out;
}
