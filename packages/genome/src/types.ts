/** Shared scalar/vector types for the genome layer (DOM-free, JSON-friendly). */
export type Vec3 = [number, number, number];

/** Body material variants. Every variant renders on the same SDF, only the shading changes. */
export type MaterialKind = 'jelly' | 'liquid' | 'gas' | 'fire';
export const MATERIAL_KINDS: readonly MaterialKind[] = ['jelly', 'liquid', 'gas', 'fire'];
/** Numeric id used inside GPU parameter blocks. */
export const MATERIAL_KIND_ID: Readonly<Record<MaterialKind, number>> = { jelly: 0, liquid: 1, gas: 2, fire: 3 };

/** Maximum number of body primitives a blob genome may produce. Merge unions may temporarily exceed this (see render). */
export const MAX_GENOME_SPHERES = 8;
/** Sphere budget of an archetype body (snake spines, droplets); the GPU block holds 16 incl. merge droplets. */
export const MAX_BODY_SPHERES = 14;

/**
 * Body archetypes (Kreaturen v2). `blob` is the dome of the blob sheet; `snake` a chain of spheres along a
 * spine that slithers; `quadruped` a torso with four legs that really walks; `biped` the REX (big head,
 * crest, two stomping legs, tail); `heavy` a wide, low, sluggish body.
 */
export const BODY_TYPES = ['blob', 'snake', 'quadruped', 'biped', 'heavy'] as const;
export type BodyType = (typeof BODY_TYPES)[number];
export const BODY_TYPE_LABELS: Readonly<Record<BodyType, string>> = { blob: 'Blob', snake: 'Schlange', quadruped: 'Vierbeiner', biped: 'REX', heavy: 'Behäbig' };

/** Skin coat: `bare` shows the body material; `fur` / `feather` render shells / cards (render: BlobMaterialKind). */
export const COATS = ['bare', 'fur', 'feather'] as const;
export type Coat = (typeof COATS)[number];
export const COAT_LABELS: Readonly<Record<Coat, string>> = { bare: 'nackt', fur: 'Fell', feather: 'Federn' };

/** Procedural skin patterns in the Earle palette (render: `PatternKind` in blob/patterns.ts). */
export const SKIN_PATTERNS = ['none', 'tiger', 'giraffe', 'zebra', 'snake', 'spots', 'diamonds'] as const;
export type SkinPattern = (typeof SKIN_PATTERNS)[number];
export const SKIN_PATTERN_LABELS: Readonly<Record<SkinPattern, string>> = { none: 'ohne', tiger: 'Tiger', giraffe: 'Giraffe', zebra: 'Zebra', snake: 'Schlange', spots: 'Punkte', diamonds: 'Rauten' };

/** One body primitive: a sphere in blob-local units (main body radius ≈ 1). */
export interface SpherePrim {
  center: Vec3;
  r: number;
}

/**
 * The body shape as data. The same program is evaluated on the CPU (`evalSdf`, sockets, physics)
 * and compiled to TSL on the GPU (`@ee/render` compileSdf), so shape is defined once.
 */
export interface SdfProgram {
  spheres: SpherePrim[];
  /** Smooth-union radius (blob units). 0 = hard union. */
  sminK: number;
  /** Fractal-noise displacement amplitude added to the distance (blob units). */
  noiseAmp: number;
  /** Noise frequency (cycles per blob unit). */
  noiseFreq: number;
  /**
   * Flat base: the body is cut off below this height (blob units) with a soft fillet, so blobs sit on
   * the plate like the reference dome. Omit or use < -10 for no cut.
   */
  floorY?: number;
}

/** Volume-preserving squash: scale (1 + amount) along `axis`, 1/sqrt(1 + amount) perpendicular. */
export interface Squash {
  axis: Vec3;
  amount: number;
  /**
   * 0..1: when stretched (amount > 0) the trailing half tapers into a teardrop pointing along `axis`
   * (Florian's slide frames). Ignored for compression.
   */
  taper?: number;
}

/**
 * Face: slit eye(s) in direction `dir` (blob-local, from the main sphere), angular half-size `size`.
 * `spacing` > 0 draws two slits offset sideways by ±spacing (radians); 0 = the single pezenpez slit.
 */
export interface Eye {
  dir: Vec3;
  size: number;
  spacing: number;
}

/** Everything the renderer needs for one blob. Colours are sRGB hex strings. */
export interface BlobParams extends SdfProgram {
  /** Idle breathing (radius modulation) in Hz. */
  breathHz: number;
  squash: Squash;
  /** 0..1 blend toward the child genome during a merge pop (drives a highlight flash on the GPU). */
  morph: number;
  baseColor: string;
  innerColor: string;
  rimColor: string;
  highlightColor: string;
  bubbleColor: string;
  /** 0..1: highlight size/strength. */
  gloss: number;
  /** 0..1: how visible the inner "organs" are. */
  translucency: number;
  /** 0..1: bubble count inside the body. */
  bubbleDensity: number;
  material: MaterialKind;
  eye: Eye;
  /** 0..1: physical viscosity, drives spring stiffness/damping in @ee/physics (0 = wobbly jelly). */
  viscosity: number;
}
