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
  purple: { ink: '#120a26', bands: ['#26154f', '#40267c'], dots: ['#5e3fb0', '#9d7fe3', '#e2ccff'], motifs: ['#e0324a', '#f3e8cc', '#86c8ff', '#ffd45c'] },
  blue: { ink: '#07122b', bands: ['#0f2a62', '#1a4396'], dots: ['#2f70d8', '#63a8f5', '#d2e9ff'], motifs: ['#e0324a', '#f3e8cc', '#3ee8e0', '#ffd45c'] },
  red: { ink: '#2a0812', bands: ['#5e1424', '#932033'], dots: ['#c62f3d', '#ea6a52', '#ffd3a8'], motifs: ['#f3e8cc', '#63a8f5', '#ffe680', '#3ee8e0'] },
};

/** Stamm (Ebene 21): Tinte fast schwarz-blau, drei Blaustufen, weißblauer Strich. */
export const BARK_PALETTE = ['#06091a', '#112c80', '#1f5bd0', '#4d9ff2', '#dbf0ff'];
/**
 * Flechten-Mosaik (Ebene 21/35), 8 Stufen mit Gewichtung durch Wiederholung: Grün und Gelbgrün überwiegen,
 * dazu Weiß, Gelb, Türkis und wenig Rot.
 */
export const LICHEN_PALETTE = ['#4ed35c', '#a6dc3c', '#f0e04b', '#f6f2e4', '#2fd6d0', '#4ed35c', '#e23a44', '#a6dc3c'];
/** Blüten in Juwelentönen; die Mitte kontrastiert je Index. */
export const BLOSSOM_PALETTE = ['#e8304a', '#f2703a', '#f5d84a', '#e64a9c', '#35e0e8', '#c9a2ff', '#f7f1d8', '#ff9e5c'];
export const BLOSSOM_CENTER_PALETTE = ['#f5d84a', '#f7f1d8', '#e8304a', '#f7f1d8', '#f5d84a', '#f5d84a', '#e8304a', '#f7f1d8'];
/** Sternnadeln in Bronze (Schatten → Licht). */
export const STAR_PALETTE = ['#4d3816', '#8a6a2c', '#bf9542', '#e6c46a'];

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
