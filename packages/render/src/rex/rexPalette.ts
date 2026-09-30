/**
 * REX colours, sampled from the illudiy logo (`assets/ref-florian/07-illudiy-logo-rex.png`, raw authored
 * values): a teal ramp from the logo's ink to its mint top planes, the pink→violet mouth, lavender gas wisp,
 * white teeth and stars. sRGB hex; the material converts to linear once.
 */
export const REX_PALETTE = {
  /** The logo's tinted ink (spiral eyes, spots, nostrils) — never pure black. */
  ink: '#1e3f4d',
  /** Skin ramp: shadow → dark teal → mid teal → mint (the logo's top planes). */
  skin: ['#2b6669', '#459996', '#54ada5', '#7df9e3'],
  /** Belly: a lighter, slightly warmer mint ramp with teal scute lines. */
  belly: ['#4fb3a6', '#6fdfcc', '#a6fbe9'],
  bellyLine: '#3f9a92',
  /** Rim light on the silhouette away from the key light (value jump instead of an outline). */
  rim: '#aef8e8',
  /** Mouth: palate/tongue (violet → pink bands) and the deep throat. */
  mouth: ['#8e4fa6', '#c161b5', '#e070a0'],
  throat: '#5a2a6b',
  star: '#fff6fb',
  /** Teeth and claws (lit / shade). */
  tooth: ['#bdb6d6', '#f6f3fb'],
  /** Eye disc behind the spiral (pale mint, lit / shade). */
  sclera: ['#bfeee3', '#effff9'],
  /** Back crest: violet (head) → lavender → pink (tail tip) — the logo outline's gradient, stepped. */
  crest: ['#8a6ff7', '#c0b0f0', '#e070a0'],
  /** Dizzy halo: pale stars and lavender gas puffs (the logo's wisp). */
  haloStar: '#fff4c9',
  gas: ['#a88fd8', '#d3b1e9'],
  sweat: ['#7fd3ee', '#c8f4ff'],
  /** Flat ground shadow (level / lab), a tinted ink. */
  shadow: '#1b2a1a',
} as const;

/** Part codes baked into the `rexPart` vertex attribute (one material, one draw call). */
export const RexPart = {
  skin: 0,
  mouth: 1,
  throat: 2,
  tooth: 3,
  ink: 4,
  eyeL: 5,
  eyeR: 6,
  crest: 7,
  star: 8,
  gas: 9,
  sweat: 10,
} as const;
export type RexPartCode = (typeof RexPart)[keyof typeof RexPart];
