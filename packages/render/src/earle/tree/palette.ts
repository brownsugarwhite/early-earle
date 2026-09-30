import type { PaletteAtlas } from '../palette';

/**
 * Palettes of the giant tree (references: image 01/04 ink bark, white lines and snow; image 02 jewel domes and
 * stained-glass streaks; image 04/24 golden needle stars). All colours are rows of a nearest-filter atlas; the
 * shaders only look them up.
 */

/**
 * Canopy colour mode (lab selector, URL `family=`): `jewel` spans the whole gradient teal → blue → violet →
 * magenta → red from the rim to the top (image 02); `blue` the cool half, `red` the warm half, `purple` the middle.
 */
export type CanopyFamily = 'purple' | 'blue' | 'red' | 'jewel';
export const CANOPY_FAMILIES: CanopyFamily[] = ['jewel', 'purple', 'blue', 'red'];
/** Kept for compatibility: the three solid modes. */
export type SolidFamily = 'purple' | 'blue' | 'red';
export const SOLID_FAMILIES: SolidFamily[] = ['purple', 'blue', 'red'];

/** Remap of the dome tone (0 rim … 1 top) per colour mode → continuous family index 0..4. */
export function familyTone(mode: CanopyFamily, tone: number): number {
  const t = Math.min(1, Math.max(0, tone));
  if (mode === 'blue') return 0.15 + t * 1.9;
  if (mode === 'red') return 2.2 + t * 1.8;
  if (mode === 'purple') return 1.5 + t * 1.45;
  return 0.1 + t * 3.85;
}

export interface DomeFamily {
  name: string;
  /** ink, three light bands (dark → light), dot in shade, dot lit, dot bright (rim sparkle), accent dot. */
  steps: [string, string, string, string, string, string, string, string];
}

/** Dome families in gradient order (index 0..4), image 02. */
export const DOME_FAMILIES: DomeFamily[] = [
  { name: 'teal', steps: ['#031a1d', '#0a4b52', '#13807f', '#2fb3a4', '#0f5e66', '#58d9c6', '#c2f7e8', '#ec5b86'] },
  { name: 'blue', steps: ['#060f38', '#122a8c', '#2149c6', '#3f76e8', '#1d3aa2', '#78a6ff', '#cfe0ff', '#f2d64e'] },
  { name: 'violet', steps: ['#13083a', '#341a82', '#5732ba', '#8060e2', '#3a2292', '#ad92f4', '#e6daff', '#55e3c6'] },
  { name: 'magenta', steps: ['#29052f', '#661271', '#9e209b', '#cf4cc2', '#5a1068', '#ef8ee0', '#ffd6f4', '#7ee3ff'] },
  { name: 'red', steps: ['#2c0508', '#7e0f19', '#bf1c24', '#ea4a30', '#8a1420', '#ff9270', '#ffd8c2', '#46aaff'] },
];

/** Tiny four-dot flowers on the domes (image 02): cream, pink, cyan, yellow, rose, mint, white, lilac. */
export const MOTIF_PALETTE = ['#f4eedd', '#ff9ec8', '#9ff0f0', '#fff3a0', '#e0506a', '#b0ffb0', '#fdfdf6', '#c8b4ff'];

/** Ink bark (image 01): ink, lit ink, line dim/mid/lit/bright, knot eye, spare. */
export const BARK_PALETTE = ['#06070b', '#151b27', '#384152', '#9aa3b0', '#dedcd0', '#f7f2e2', '#020203', '#232a36'];
/** Kept for compatibility (lab labels): index of the bright line and of the knot. */
export const BARK_EDGE = 5;
export const BARK_RED = 6;
/** Snow (image 01/04): deep blue, shadow blue, light shadow, cream lit, bright, warm, speck, crumb. */
export const SNOW_PALETTE = ['#1c3764', '#3a67a4', '#6995cb', '#efe6cb', '#fbf7ea', '#f2e0b8', '#17243d', '#dfe8f0'];
/** Stained-glass streaks of the jewel bark (image 02/21). */
export const JEWEL_BARK_PALETTE = ['#1f47c9', '#3fa6e6', '#6a3fd0', '#1aa38a', '#d9382f', '#e8d24a', '#4fc35a', '#c65ad8'];
/** Kept for compatibility: lichen tones (the jewel streak row doubles as lichen). */
export const LICHEN_PALETTE = JEWEL_BARK_PALETTE;
/** Blossoms as accents in the picture palette: red, coral, mint white, mauve, pale cyan, lime, pale green, rose. */
export const BLOSSOM_PALETTE = ['#bb2023', '#da603e', '#e5f3e3', '#965d6e', '#93ced7', '#e9f15e', '#d5e9dc', '#c0485a'];
export const BLOSSOM_CENTER_PALETTE = ['#e9f15e', '#e5f3e3', '#bb2023', '#e5f3e3', '#bb2023', '#bb2023', '#bb2023', '#e9f15e'];
/** Golden needle stars (image 04): navy in the shade → bronze → gold → pale gold. */
export const STAR_PALETTE = ['#141d33', '#3a3122', '#7a5b28', '#b68a3c', '#e2bb62', '#f6dc9a'];
/** Twig lace: ink navy (shade) → lit navy. */
export const LACE_PALETTE = ['#070a13', '#101729', '#1d2944', '#2f4166'];

export interface TreePaletteRows {
  bark: number;
  snow: number;
  jewel: number;
  /** First of five consecutive dome family rows (teal, blue, violet, magenta, red). */
  domes: number;
  motif: number;
  blossom: number;
  blossomCenter: number;
  star: number;
  lace: number;
  /** Fog row without effect (alpha 0) for trees without world fog. */
  nofog: number;
  /** Compatibility: family → row (violet/blue/red). */
  canopy: Record<SolidFamily, number>;
  lichen: number;
}

/** Rows the tree needs (for capacity checks on a shared atlas). */
export const TREE_PALETTE_ROWS = 14;

/** Writes all tree rows into the atlas (idempotent by name). The dome rows are consecutive. */
export function addTreePalette(atlas: PaletteAtlas, prefix = 'tree'): TreePaletteRows {
  const domeRows = DOME_FAMILIES.map((f) => atlas.addRow({ name: `${prefix}/dome-${f.name}`, steps: [...f.steps] }));
  for (let i = 1; i < domeRows.length; i++) if (domeRows[i] !== domeRows[0]! + i) throw new Error('tree dome rows must be consecutive');
  const jewel = atlas.addRow({ name: `${prefix}/jewel`, steps: JEWEL_BARK_PALETTE });
  return {
    bark: atlas.addRow({ name: `${prefix}/bark`, steps: BARK_PALETTE }),
    snow: atlas.addRow({ name: `${prefix}/snow`, steps: SNOW_PALETTE }),
    jewel,
    domes: domeRows[0]!,
    motif: atlas.addRow({ name: `${prefix}/motif`, steps: MOTIF_PALETTE }),
    blossom: atlas.addRow({ name: `${prefix}/blossom`, steps: BLOSSOM_PALETTE }),
    blossomCenter: atlas.addRow({ name: `${prefix}/blossom-center`, steps: BLOSSOM_CENTER_PALETTE }),
    star: atlas.addRow({ name: `${prefix}/star`, steps: STAR_PALETTE }),
    lace: atlas.addRow({ name: `${prefix}/lace`, steps: LACE_PALETTE }),
    nofog: atlas.addRow({ name: `${prefix}/nofog`, steps: ['#000000', '#000000'], alphas: [0, 0] }),
    canopy: { blue: domeRows[1]!, purple: domeRows[2]!, red: domeRows[4]! },
    lichen: jewel,
  };
}
