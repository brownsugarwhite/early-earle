import { Color } from 'three';

/**
 * Stil-Vorgabe der Wesen (Look-Vertrag, `content/creatures/stil.json` später): Lichtrichtung relativ zur Ansicht,
 * Wertstufen und ihre Federung, Verlaufsanteil in der Stufe, Rim, Papierkorn, Glimmer und die Schattenregel
 * (dunkler, gesättigter, leicht kühler — nie grau). Eine Änderung hier ändert alle Wesen.
 */
export interface WesenStil {
  /** Azimut des Figurenlichts in Grad (positiv = rechts vom Betrachter). */
  lichtAzimut: number;
  /** Höhe des Figurenlichts in Grad über der Blickachse. */
  lichtHoehe: number;
  /** Anzahl der Wertstufen (2…4). */
  stufen: number;
  /** Federung der Stufenkanten (0 hart … 1 sehr weich). */
  federung: number;
  /** Verlauf innerhalb jeder Stufe (0 … 1). */
  verlauf: number;
  /** Rim auf der Lichtseite (0 … 1). */
  rim: number;
  /** Papierkorn (0 … 1). */
  korn: number;
  /** Glimmer fester Blobs (0 … 1). */
  glimmer: number;
  /** Bodenkontakt: Abdunklung unten (0 … 1). */
  bodenlicht: number;
  /** Schattenregel: Helligkeitsabfall (OKLab L), Chroma-Zugabe, Farbtondrehung zum Kühlen (Grad). */
  schatten: { l: number; c: number; h: number };
  /** Lichtseite: Aufhellung (OKLab L). */
  licht: { l: number; c: number };
}

export const STIL_STANDARD: WesenStil = {
  lichtAzimut: 40,
  lichtHoehe: 38,
  stufen: 3,
  federung: 0.45,
  verlauf: 0.6,
  rim: 0.35,
  korn: 0.45,
  glimmer: 0.5,
  bodenlicht: 0.5,
  schatten: { l: -0.16, c: 0.02, h: 12 },
  licht: { l: 0.1, c: -0.01 },
};

// --- OKLab -------------------------------------------------------------------------------------------------------
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, v));
}
export function hexToOklch(hex: string): [number, number, number] {
  const col = new Color(hex);
  // three's Color stores linear values after colour management; use its sRGB getters to be explicit
  const r = srgbToLinear(col.r > 1 ? 1 : linearToSrgb(col.r)), g = srgbToLinear(linearToSrgb(col.g)), b = srgbToLinear(linearToSrgb(col.b));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI];
}
/** OKLCh → lineares RGB (0…1), geklemmt. */
export function oklchToLinear(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const A = Math.cos(h) * C, B = Math.sin(h) * C;
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [Math.min(1.2, Math.max(0, r)), Math.min(1.2, Math.max(0, g)), Math.min(1.2, Math.max(0, b))];
}

export interface FarbRolle {
  /** Grundton (linear RGB). */
  base: [number, number, number];
  schatten: [number, number, number];
  licht: [number, number, number];
}

/** Grund-, Schatten- und Lichtfarbe einer Farbrolle nach der Schattenregel des Stils. */
export function farbRolle(hex: string, stil: WesenStil): FarbRolle {
  const [L, C, h] = hexToOklch(hex);
  // Schatten kühler: warme Töne (h < 180 oder > 330) drehen zu Violett/Blau hin, kühle leicht weiter ins Blau
  const cool = h > 60 && h < 250 ? stil.schatten.h : -stil.schatten.h;
  return {
    base: oklchToLinear(L, C, h),
    schatten: oklchToLinear(Math.max(0.05, L + stil.schatten.l), Math.max(0, C + stil.schatten.c), h + cool),
    licht: oklchToLinear(Math.min(0.98, L + stil.licht.l), Math.max(0, C + stil.licht.c), h),
  };
}
