import type { PaletteAtlas } from '../palette';

/**
 * Paletten des Riesenbaums (aus den Referenzen: Ebene 21/35 Stamm, Ebene 3/10 Kronen, Ebene 11/24 Sterne).
 * Alle Farben liegen als Zeilen im gemeinsamen Nearest-Filter-Atlas; die Shader schlagen nur nach.
 */
export type SolidFamily = 'purple' | 'blue' | 'red';
/** `jewel` = jede Kuppel zieht eine der drei Familien (Juwelenwald, Ebene 3). */
export type CanopyFamily = SolidFamily | 'jewel';
export const SOLID_FAMILIES: SolidFamily[] = ['purple', 'blue', 'red'];
export const CANOPY_FAMILIES: CanopyFamily[] = ['purple', 'blue', 'red', 'jewel'];

export interface FamilyPalette {
  ink: string;
  /** Zwei Lichtbänder (dunkel → hell). */
  bands: [string, string];
  /** Punkte: Schattenseite, Lichtseite, hellste Stufe. */
  dots: [string, string, string];
  /** Innenmotive (Rauten, Kreuze, Blüten): vier Töne. */
  motifs: [string, string, string, string];
}

export const FAMILY_PALETTES: Record<SolidFamily, FamilyPalette> = {
  purple: { ink: '#120a26', bands: ['#26154f', '#40267c'], dots: ['#4a3a9a', '#8f86e0', '#dcd8ff'], motifs: ['#e5f3e3', '#d86070', '#93ced7', '#f0e8d0'] },
  blue: { ink: '#07122b', bands: ['#0f2a62', '#1a4396'], dots: ['#1c5fa8', '#4f9fd8', '#cfe9f5'], motifs: ['#e5f3e3', '#c0485a', '#93ced7', '#f0e8d0'] },
  red: { ink: '#2a0812', bands: ['#5e1424', '#932033'], dots: ['#9e2a3a', '#d8606a', '#f5d0c8'], motifs: ['#f0e8d0', '#93ced7', '#e5f3e3', '#e9c36a'] },
};

/**
 * Stamm (Ebene 21, per k-Means aus dem Bild): Tinte fast schwarz-blau, drei Blaustufen, weißblauer Strich,
 * Lichtkante (Cyan-Weiß) und das seltene Flechtenrot.
 */
export const BARK_PALETTE = ['#06091a', '#114a86', '#1485c2', '#4db0e0', '#dbf0ff', '#e8fbff', '#a8403a'];
/** Index der Lichtkante bzw. des seltenen Flechtenrots in der Rindenzeile. */
export const BARK_EDGE = 5;
export const BARK_RED = 6;
/**
 * Flechten (k-Means aus Ebene 21): Blau-Cyan-Weiß überwiegt (6/8), dazu Grün und Limette; Rot kommt selten über
 * `BARK_RED` hinzu.
 */
export const LICHEN_PALETTE = ['#74c0ce', '#e5f3e3', '#3b9bd0', '#a8dce6', '#e5f3e3', '#74c0ce', '#1a8653', '#dbe958'];
/** Blüten als Akzente in der Bildpalette (k-Means aus Ebene 3/21): Rot, Koralle, Minzweiß, Malve, Blasscyan, Limette. */
export const BLOSSOM_PALETTE = ['#bb2023', '#da603e', '#e5f3e3', '#965d6e', '#93ced7', '#e9f15e', '#d5e9dc', '#c0485a'];
export const BLOSSOM_CENTER_PALETTE = ['#e9f15e', '#e5f3e3', '#bb2023', '#e5f3e3', '#bb2023', '#bb2023', '#bb2023', '#e9f15e'];
/** Sternnadeln in dunkler Bronze (Ebene 11: Schatten → Licht). */
export const STAR_PALETTE = ['#2a1e0c', '#4f3b1a', '#77592a', '#9c7a3e'];

export interface TreePaletteRows {
  bark: number;
  lichen: number;
  canopy: Record<SolidFamily, number>;
  motif: Record<SolidFamily, number>;
  blossom: number;
  blossomCenter: number;
  star: number;
  /** Nebelzeile ohne Wirkung (Alpha 0) für Bäume ohne Weltnebel. */
  nofog: number;
}

/** Schreibt alle Baumzeilen in den Atlas (idempotent über den Namen). */
export function addTreePalette(atlas: PaletteAtlas, prefix = 'tree'): TreePaletteRows {
  const canopy = {} as Record<SolidFamily, number>;
  const motif = {} as Record<SolidFamily, number>;
  for (const f of SOLID_FAMILIES) {
    const p = FAMILY_PALETTES[f];
    canopy[f] = atlas.addRow({ name: `${prefix}/canopy-${f}`, steps: [p.ink, ...p.bands, ...p.dots] });
    motif[f] = atlas.addRow({ name: `${prefix}/motif-${f}`, steps: [...p.motifs] });
  }
  return {
    bark: atlas.addRow({ name: `${prefix}/bark`, steps: BARK_PALETTE }),
    lichen: atlas.addRow({ name: `${prefix}/lichen`, steps: LICHEN_PALETTE }),
    canopy,
    motif,
    blossom: atlas.addRow({ name: `${prefix}/blossom`, steps: BLOSSOM_PALETTE }),
    blossomCenter: atlas.addRow({ name: `${prefix}/blossom-center`, steps: BLOSSOM_CENTER_PALETTE }),
    star: atlas.addRow({ name: `${prefix}/star`, steps: STAR_PALETTE }),
    nofog: atlas.addRow({ name: `${prefix}/nofog`, steps: ['#000000', '#000000'], alphas: [0, 0] }),
  };
}
