/**
 * Qualitätsstufen des Earle-Labs. Der Look (Tintenformen, Bänder, Punktrand) bleibt in beiden Stufen gleich;
 * nur die Kosten ändern sich.
 *
 * Was die einzelnen Regler kosten (Erfahrungswerte aus dem Lab, Handy ≈ iPhone-12-Klasse):
 * - `dprCap` 2 → 1.5: 44 % weniger Fragmente — der mit Abstand größte Posten auf dem Handy (Fragment-bound).
 * - `shadowMapSize` 2048² → 1024²: 4× weniger Tiefen-Texel im Schattenpass (16 MB → 4 MB Tiefe, viermal
 *   weniger Fill), Vergleichs-Tap pro Fragment bleibt einer; Kante ≈ 2 px statt 1 px Texelbreite auf dem Handy.
 * - `dotsPerTree` 60–200 → 28–52: ~4× weniger Punkt-Instanzen (6 Vertices + Rasterisierung je Punkt),
 *   `collapsePx` 0.75 → 1.2 px lässt Sub-Pixel-Punkte ganz wegfallen (kein Overdraw für unsichtbare Punkte).
 * - `treeCount` 260 → 120: halbiert Kronen/Stämme im Haupt- **und** Schattenpass (Caster).
 * - `fogStripes` 4 → 2: jeder Streifen ist ein bildschirmbreites, transparentes Quad (Overdraw ≈ 1 Bildbreite
 *   je Streifen im Bereich der Streifenhöhe); transparent → teuerster Overdraw pro Pixel.
 * - `terrainRes` 96² → 64², Füllkugel 160×80 → 96×48: 9,2k → 4,1k bzw. 13k → 4,7k Vertices — fast kostenlos,
 *   spart nur Speicher/Generierzeit.
 */
export type QualityLevel = 'hoch' | 'mobil' | 'auto';
export type ResolvedQuality = 'hoch' | 'mobil';

export interface QualityPreset {
  name: ResolvedQuality;
  shadowMapSize: number;
  dotsPerTree: [number, number];
  collapsePx: number;
  treeCount: number;
  fogStripes: number;
  terrainRes: number;
  fillerSegments: [number, number];
  /** Obergrenze für den Pixel-Ratio des Renderers (CanvasHost erlaubt bis 2). */
  dprCap: number;
}

export const QUALITY_PRESETS: Record<ResolvedQuality, QualityPreset> = {
  hoch: {
    name: 'hoch',
    shadowMapSize: 2048,
    dotsPerTree: [60, 200],
    collapsePx: 0.75,
    treeCount: 260,
    fogStripes: 4,
    terrainRes: 96,
    fillerSegments: [160, 80],
    dprCap: 2,
  },
  mobil: {
    name: 'mobil',
    shadowMapSize: 1024,
    dotsPerTree: [28, 52],
    collapsePx: 1.2,
    treeCount: 120,
    fogStripes: 2,
    terrainRes: 64,
    fillerSegments: [96, 48],
    dprCap: 1.5,
  },
};

/** Auto: Touch-Gerät oder DPR ≥ 2.5 → Mobil, sonst Hoch. */
export function detectAutoQuality(): ResolvedQuality {
  if (typeof window === 'undefined') return 'hoch';
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const dpr = window.devicePixelRatio || 1;
  return touch || dpr >= 2.5 ? 'mobil' : 'hoch';
}

export function resolveQuality(level: QualityLevel): QualityPreset {
  return QUALITY_PRESETS[level === 'auto' ? detectAutoQuality() : level];
}
