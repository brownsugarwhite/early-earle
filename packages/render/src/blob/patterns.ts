/**
 * Patterns and extended material kinds for the blob bodies (P1b "Materials & simulations v2").
 *
 * Pure data + TSL helpers. The per-instance values travel in the *style block* of `BlobParamBlock`
 * (see blobParamsUniforms.ts) so candidate (a) raymarch, candidate (b) jiggle mesh, the fur shells and
 * the feather cards all read the same pattern.
 *
 * Earle rules (docs/STYLE.md §3/§4): patterns are ornament *inside* the body, never an outline; dots
 * sit where light hits, solid ink elsewhere; 3–4 value bands, no gradients.
 */
import { If, Loop, abs, asin, atan, clamp, cos, dot, float, floor, fract, fwidth, hash, length, max, min, mix, mod, mx_fractal_noise_float, mx_noise_float, normalize, sin, smoothstep, step, vec2, vec3, vec4 } from 'three/tsl';
import { MATERIAL_KIND_ID, mixHex, shiftHex, type BlobParams, type MaterialKind } from '@ee/genome';
import type { FloatNode, Vec2Node, Vec3Node, Vec4Node } from '../common/tsl';

// ----------------------------------------------------------------------------------------- kinds

/** Body material incl. the two surface materials that need extra passes (fur shells, feather cards). */
export type BlobMaterialKind = MaterialKind | 'fur' | 'feather';
export const BLOB_MATERIAL_KINDS: readonly BlobMaterialKind[] = ['jelly', 'liquid', 'gas', 'fire', 'fur', 'feather'];
/** Numeric id in `MISC.w` of the parameter block (0..3 as in @ee/genome, then fur 4, feather 5). */
export const BLOB_MATERIAL_KIND_ID: Readonly<Record<BlobMaterialKind, number>> = { ...MATERIAL_KIND_ID, fur: 4, feather: 5 };
export const BLOB_MATERIAL_LABELS: Readonly<Record<BlobMaterialKind, string>> = { jelly: 'Jelly', liquid: 'Flüssig', gas: 'Gas', fire: 'Feuer', fur: 'Fell', feather: 'Federn' };

// -------------------------------------------------------------------------------------- patterns

export type PatternKind = 'none' | 'tiger' | 'giraffe' | 'zebra' | 'snake' | 'spots' | 'diamonds';
export const PATTERN_KINDS: readonly PatternKind[] = ['none', 'tiger', 'giraffe', 'zebra', 'snake', 'spots', 'diamonds'];
export const PATTERN_KIND_ID: Readonly<Record<PatternKind, number>> = { none: 0, tiger: 1, giraffe: 2, zebra: 3, snake: 4, spots: 5, diamonds: 6 };
export const PATTERN_LABELS: Readonly<Record<PatternKind, string>> = { none: 'ohne', tiger: 'Tiger', giraffe: 'Giraffe', zebra: 'Zebra', snake: 'Schlange', spots: 'Punkte', diamonds: 'Rauten' };

export interface PatternParams {
  kind: PatternKind;
  /** Feature density relative to the body radius (1 = default; 2 = twice as many marks). */
  scale: number;
  /** Dark marks (stripes, patches, seams), sRGB hex. */
  ink: string;
  /** Light marks (dots, crescents, seams), sRGB hex. */
  light: string;
  /** Second light tone for mosaics (diamonds, giraffe patch variation). Default = `light`. */
  light2?: string | undefined;
  /** 0..1 how hard the marks separate from the body ramp (coverage and value distance). */
  contrast: number;
  /**
   * 0..1 Earle stipple: the lit band of the body renders as dots that grow toward the light instead
   * of a flat value step ("dots where light hits, solid ink elsewhere"). Default 0.
   */
  stipple?: number | undefined;
  /** 0..1 dotted rim: light dots along the sunlit Fresnel edge (the dome rims of the references). Default 0. */
  rimDots?: number | undefined;
  /** Rotation of the pattern frame around the body's up axis, radians. Default 0. */
  rotation?: number | undefined;
}

/** No pattern; `rimDots` stays undefined so fur (0.8) / feather (0.5) keep their dotted-rim default. */
export const NO_PATTERN: Readonly<PatternParams> = { kind: 'none', scale: 1, ink: '#0f1c22', light: '#eeecd6', contrast: 0.8, stipple: 0, rotation: 0 };

/**
 * Small per-pattern palette that harmonises with the body ramp: dark marks derived from the base
 * colour, light marks from the Earle references (cream `#eeecd6`/`#f7dfad`, pink-red `#e07380`,
 * cyan `#39bbeb`, deep teal ink `#0d414c` — Ebene_3/45/19/48).
 */
export function patternPalette(kind: PatternKind, baseColor: string): { ink: string; light: string; light2: string } {
  switch (kind) {
    case 'tiger':
      return { ink: mixHex('#1b1612', shiftHex(baseColor, 0, 0.3, 1.1), 0.2), light: mixHex('#f7dfad', baseColor, 0.15), light2: '#f7dfad' };
    case 'zebra':
      return { ink: '#12141c', light: '#eeecd6', light2: '#eeecd6' };
    case 'giraffe':
      return { ink: shiftHex(baseColor, -18, 0.5, 1.15), light: '#eeecd6', light2: shiftHex(baseColor, -8, 0.72, 1.05) };
    case 'snake':
      return { ink: shiftHex(baseColor, 8, 0.42, 1.1), light: shiftHex(baseColor, 0, 1.3, 0.75), light2: shiftHex(baseColor, 14, 0.85, 1) };
    case 'spots':
      return { ink: shiftHex(baseColor, -25, 0.32, 1.2), light: mixHex(baseColor, '#f9f5e7', 0.55), light2: mixHex(baseColor, '#f9f5e7', 0.3) };
    case 'diamonds':
      return { ink: mixHex('#0d414c', baseColor, 0.3), light: '#e07380', light2: '#39bbeb' };
    default:
      return { ink: NO_PATTERN.ink, light: NO_PATTERN.light, light2: NO_PATTERN.light };
  }
}

/**
 * Fills in a full `PatternParams` from a kind (+ optional overrides), colours from `patternPalette`.
 * `rimDots` is left undefined unless given, so the material default applies (fur 0.8, feather 0.5).
 */
export function makePattern(kind: PatternKind, baseColor: string, overrides: Partial<Omit<PatternParams, 'kind'>> = {}): PatternParams {
  const pal = patternPalette(kind, baseColor);
  return { kind, scale: 1, contrast: 0.8, stipple: 0, rotation: 0, ...pal, ...overrides };
}

// ------------------------------------------------------------------------------ fur / feathers

export interface FurParams {
  /** Strand length in blob units (body radius = 1). Default 0.16. */
  length: number;
  /** Strand density multiplier (1 = default ≈ 900 strands on the unit sphere). */
  density: number;
  /** 0..1 wind/idle sway amplitude. */
  sway: number;
  /** 0..1 how strongly the strands comb downward (0 = radial fluff, 1 = flat, combed). */
  comb: number;
}
export const DEFAULT_FUR: Readonly<FurParams> = { length: 0.16, density: 1, sway: 0.5, comb: 0.65 };

export interface FeatherParams {
  /** Card size multiplier (1 = cards ≈ 0.42 blob units long). */
  size: number;
  /** 0..1 ruffle (wind lifts the tips). */
  ruffle: number;
}
export const DEFAULT_FEATHER: Readonly<FeatherParams> = { size: 1, ruffle: 0.5 };

// ------------------------------------------------------------------------------ render params

/** Style on top of the genome body: material (incl. fur/feather), pattern, fur and feather knobs. */
export interface BlobStyle {
  material?: BlobMaterialKind | undefined;
  pattern?: PatternParams | undefined;
  fur?: Partial<FurParams> | undefined;
  feather?: Partial<FeatherParams> | undefined;
}

/**
 * `BlobParams` with the wider material union and the optional style fields. Every `BlobParams` is a
 * valid `BlobRenderParams`, so genome output can be passed through untouched.
 */
export type BlobRenderParams = Omit<BlobParams, 'material'> & { material: BlobMaterialKind } & Omit<BlobStyle, 'material'>;

/** Impulse that starts concentric surface ripples (liquid: full, jelly: damped, fur/feather: faint). */
export interface RippleImpulse {
  /** Unit direction (blob-local rest space, from the main sphere centre) of the impact point. */
  dir: [number, number, number];
  /** Seconds since the impact; the wave front travels ≈ 2.2 blob units per second. */
  age: number;
  /** 0..1.5 amplitude multiplier. Default 1. */
  strength?: number | undefined;
}

/** "Earle-Test" look: dark lapis dome, diamond mosaic, dotted rim, stippled light band (Ebene_3). */
export const EARLE_TEST_STYLE = {
  baseColor: '#2b2f86',
  innerColor: '#101334',
  rimColor: '#6f91b0',
  highlightColor: '#eeecd6',
  bubbleColor: '#447488',
  gloss: 0.15,
  translucency: 0.25,
  bubbleDensity: 0,
  pattern: { kind: 'diamonds', scale: 1, ink: '#0d2a3c', light: '#e07380', light2: '#39bbeb', contrast: 1, stipple: 0.85, rimDots: 1, rotation: 0 } as PatternParams,
} as const;

// ------------------------------------------------------------------------------------------ TSL

/** Anti-aliased step on a pattern coordinate (≈1 px transition, no blur, no stairs). */
function aa(edge: FloatNode | number, x: FloatNode): FloatNode {
  const w = fwidth(x).mul(0.75).add(1e-4);
  const e = typeof edge === 'number' ? float(edge) : edge;
  return smoothstep(e.sub(w), e.add(w), x);
}

/** Tent weight: 1 at `id`, 0 one unit away (exact for integer kinds, a crossfade in between). */
export function kindWeight(kind: FloatNode, id: number): FloatNode {
  return float(1).sub(clamp(abs(kind.sub(id)), 0, 1));
}

/** Three hashes 0..1 from a lattice cell. */
export function cellHash3(cell: Vec3Node, seed: FloatNode | number = 0): Vec3Node {
  const k = dot(cell, vec3(1, 131, 17161)).add(seed);
  const h1 = hash(k);
  const h2 = hash(h1.mul(1000).add(1));
  const h3 = hash(h1.mul(1000).add(2));
  return vec3(h1, h2, h3);
}

/**
 * Object-space stipple: one jittered disc per lattice cell of `p` (dots never cross cells, so a single
 * cell lookup suffices). `radius` 0..0.3 in cell units. Returns 0..1 coverage with a crisp edge.
 */
export function dotField(p: Vec3Node, radius: FloatNode, seed: FloatNode | number = 0): FloatNode {
  const cell = floor(p);
  const h = cellHash3(cell, seed);
  const centre = h.mul(0.4).add(0.3);
  const d = length(fract(p).sub(centre));
  return float(1).sub(aa(radius, d));
}

/**
 * Like `dotField`, but the disc lies in the tangent plane of the surface (normal `n`), so every dot is
 * a full circle whatever the depth of its cell centre (dots whose centre is far from the surface shrink
 * smoothly instead of popping). `radius` ≤ 0.3 cell units.
 */
export function dotFieldTangent(p: Vec3Node, n: Vec3Node, radius: FloatNode, seed: FloatNode | number = 0): FloatNode {
  const cell = floor(p);
  const h = cellHash3(cell, seed);
  const o = fract(p).sub(h.mul(0.3).add(0.35));
  const dn = dot(o, n);
  const d = length(o.sub(n.mul(dn)));
  const r = radius.mul(float(1).sub(smoothstep(0.2, 0.34, abs(dn))));
  return float(1).sub(aa(r, d));
}

/** Anti-aliased step with an explicit width (for lattice coordinates whose own fwidth jumps at cell borders). */
export function aaW(edge: FloatNode | number, x: FloatNode, w: FloatNode): FloatNode {
  const e = typeof edge === 'number' ? float(edge) : edge;
  return smoothstep(e.sub(w), e.add(w), x);
}

/** Spherical frame of a unit-body point, computed once in uniform control flow (outside If chains). */
export interface SphereFrame {
  /** Latitude −π/2..π/2. */
  lat: FloatNode;
  /** Longitude 0..1 (0.5 = front, seam at the back). */
  lon01: FloatNode;
  /** fwidth(lat): the anti-aliasing width source (continuous everywhere, unlike the longitude). */
  dLat: FloatNode;
}

export function sphereFrame(p: Vec3Node): SphereFrame {
  const pn = normalize(p.add(vec3(0, 1e-5, 0)));
  const lat = asin(clamp(pn.y, -1, 1)).toVar();
  const lon01 = atan(pn.x, pn.z).div(Math.PI * 2).add(0.5).toVar();
  const dLat = fwidth(lat).toVar();
  return { lat, lon01, dLat };
}

export interface RowCell {
  /** Row index (latitude band). */
  row: FloatNode;
  /** Column index, 0..cols−1 (seamless around the body). */
  col: FloatNode;
  /** Local coordinates in the cell, −0.5..0.5 (x around, y up). */
  local: Vec2Node;
  /** Continuous row coordinate (rows per unit of `row`). */
  v: FloatNode;
  rowsHalf: FloatNode;
  /** Anti-aliasing width in local units. */
  aaw: FloatNode;
}

/** Columns and staggered longitude coordinate of row `row` (the per-row count keeps cells square). */
function rowColumns(f: SphereFrame, nAround: FloatNode, rowsHalf: FloatNode, row: FloatNode): { u: FloatNode; cols: FloatNode } {
  const latC = row.add(0.5).div(rowsHalf).mul(Math.PI / 2);
  const cols = max(floor(nAround.mul(cos(clamp(latC, -1.5707, 1.5707))).add(0.5)), 3);
  return { u: f.lon01.mul(cols).add(fract(row.mul(0.5))), cols };
}

/**
 * Pole-safe staggered row lattice on the unit body: latitude rows, round(N·cos(lat)) columns per row
 * (every other row shifted by half a cell). Cells stay about square from the equator to the poles —
 * no rosette where a cylindrical unwrap converges. `aspect` = rows per column width (1 = square cells).
 */
export function rowLattice(f: SphereFrame, nAround: FloatNode, aspect: number): RowCell {
  const rowsHalf = nAround.mul(0.25 * aspect);
  const v = f.lat.mul(2 / Math.PI).mul(rowsHalf);
  const row = floor(v);
  const { u, cols } = rowColumns(f, nAround, rowsHalf, row);
  const local = vec2(fract(u), fract(v)).sub(0.5);
  const aaw = f.dLat.mul(rowsHalf).mul((2 / Math.PI) * 0.75).add(1e-4);
  return { row, col: mod(floor(u), cols), local, v, rowsHalf, aaw };
}

/**
 * Snake scales: rhombi (half-diagonals 0.5 × 1 row) centred on the staggered row lattice (rows twice as
 * dense as columns, so the rhombi are square). Ownership is an L1-Voronoi over the own row and the two
 * neighbouring rows, so the seams stay continuous where the per-row column count changes.
 * Returns vec4(seamDistance (l2 − l1), ownerY (−1..1, > 0 = upper half), ownerHash, l1).
 */
export function snakeScales(f: SphereFrame, nAround: FloatNode): Vec4Node {
  const L = rowLattice(f, nAround, 2);
  const best = float(9).toVar();
  const second = float(9).toVar();
  const ownerY = float(0).toVar();
  const ownerId = float(0).toVar();
  for (const dr of [-1, 0, 1]) {
    const r = L.row.add(dr);
    const { u, cols } = rowColumns(f, nAround, L.rowsHalf, r);
    const x = fract(u).sub(0.5);
    const y = L.v.sub(r.add(0.5));
    const l = abs(x).mul(2).add(abs(y));
    const id = hash(mod(floor(u), cols).add(r.mul(97.0)).add(1000));
    const better = l.lessThan(best);
    second.assign(better.select(best, min(second, l)));
    ownerY.assign(better.select(y, ownerY));
    ownerId.assign(better.select(id, ownerId));
    best.assign(better.select(l, best));
  }
  return vec4(second.sub(best), ownerY, ownerId, best);
}

/** Nearest-feature Voronoi (27 cells): returns vec3(F1, F2, cell id 0..1). */
export function voronoi3(p: Vec3Node): Vec3Node {
  const pi = floor(p).toVar();
  const pf = fract(p).toVar();
  const f1 = float(8).toVar();
  const f2 = float(8).toVar();
  const id = float(0).toVar();
  Loop(27, ({ i }) => {
    const x = i.mod(3).sub(1);
    const y = i.div(3).mod(3).sub(1);
    const z = i.div(9).sub(1);
    const g = vec3(float(x), float(y), float(z));
    const h = hash(dot(pi.add(g), vec3(1, 131, 17161)).add(11));
    const o = fract(vec3(h, h.mul(61.7), h.mul(313.9)));
    const d = length(g.add(o).sub(pf));
    const closer = d.lessThan(f1);
    f2.assign(closer.select(f1, min(f2, d)));
    id.assign(closer.select(h, id));
    f1.assign(closer.select(d, f1));
  });
  return vec3(f1, f2, id);
}

export interface PatternInputs {
  /** Pattern id (0..6), scale, contrast, rotation (MAT slot of the style block). */
  mat: Vec4Node;
  /** rgb ink, w stipple. */
  inkSlot: Vec4Node;
  /** rgb light, w rimDots. */
  lightSlot: Vec4Node;
  /** rgb light2. */
  light2Slot: Vec4Node;
  /** Rest-space point relative to the main sphere centre, divided by its radius (unit body). */
  pq: Vec3Node;
  /** Unit surface normal. */
  n: Vec3Node;
  /** Raw wrap light 0..1 (before banding). */
  wrap: FloatNode;
  /** Fresnel 0..1 (1 at the silhouette). */
  fres: FloatNode;
  /** Body highlight colour (third mosaic tone). */
  highlight: Vec3Node;
}

export interface PatternSample {
  /** 0..1 coverage of dark marks. */
  ink: FloatNode;
  /** 0..1 coverage of light marks (dots, crescents, seams). */
  light: FloatNode;
  inkColor: Vec3Node;
  /** Light colour already mixed per mark (light / light2 / highlight). */
  lightColor: Vec3Node;
  /** 0..1 coverage of the Earle stipple (dots that grow toward the light). */
  stipple: FloatNode;
  /** 0..1 coverage of the dotted rim. */
  rimDots: FloatNode;
}

/**
 * Evaluates the pattern of one instance at a surface point. All branches are built; the `If` chain
 * on the per-instance kind keeps the cost of the other kinds out of the frame.
 */
export interface SamplePatternOptions {
  /** Only the pattern marks (ink/light) — skips the body stipple and the dotted rim (fur strands, cards). */
  marksOnly?: boolean;
}

export function samplePattern(inp: PatternInputs, opts: SamplePatternOptions = {}): PatternSample {
  // Every node shared by several branches of the If chain (or used after it) is declared *before* the
  // chain with toVar(): otherwise TSL may cache it into a variable at its first use — inside one
  // branch — and all other branches read an unassigned 0.
  const mat = inp.mat.toVar();
  const inkSlot = inp.inkSlot.toVar();
  const lightSlot = inp.lightSlot.toVar();
  const light2Slot = inp.light2Slot.toVar();
  const highlight = inp.highlight.toVar();
  const kind = mat.x;
  const scale = max(mat.y, 0.05).toVar();
  const contrast = clamp(mat.z, 0, 1).toVar();
  const rot = mat.w;
  // Rotate the pattern frame around y.
  const c = cos(rot);
  const s = sin(rot);
  const p0 = inp.pq;
  const p = vec3(p0.x.mul(c).sub(p0.z.mul(s)), p0.y, p0.x.mul(s).add(p0.z.mul(c))).toVar();
  // Spherical frame for the pole-safe lattices (fwidth taken here, in uniform control flow).
  const frame = sphereFrame(p);
  const lightSide = smoothstep(0.35, 0.6, inp.wrap).toVar();
  const lit01 = smoothstep(0.3, 0.85, inp.wrap).toVar();

  const ink = float(0).toVar();
  const light = float(0).toVar();
  const lightCol = lightSlot.xyz.toVar();

  // 0 none (explicit head of the chain so the ElseIf ranges below stay simple upper bounds).
  If(kind.lessThan(0.5), () => {
    ink.assign(0);
  })
    // 1 tiger: noise-warped bands around the spine (x), tapering to nothing on the belly, broken up.
    .ElseIf(kind.lessThan(1.5), () => {
    const warp = mx_fractal_noise_float(p.mul(1.7).add(vec3(3.1, 0, 7.7)), 2, 2.0, 0.5, 1.0);
    const uu = p.x.mul(3.6).mul(scale).add(warp.mul(1.1)).add(p.y.mul(0.35));
    const band = sin(uu.mul(Math.PI));
    const belly = smoothstep(-0.15, -0.85, p.y.add(warp.mul(0.15)));
    const gaps = aa(0.25, mx_noise_float(p.mul(2.6).add(9.0)).add(0.5));
    const thr = float(0.15).add(float(1).sub(contrast).mul(0.35)).add(belly.mul(1.6));
    ink.assign(aa(thr, band).mul(gaps));
      // Belly: cream underside.
      light.assign(belly.mul(0.9));
    })
    // 2 giraffe: Voronoi patches (ink, two tones by cell id) with light seams.
    .ElseIf(kind.lessThan(2.5), () => {
      const v = voronoi3(p.mul(2.4).mul(scale).add(0.5));
      const seamW = float(0.16).sub(contrast.mul(0.06));
      const inside = aa(seamW, v.y.sub(v.x));
      ink.assign(inside.mul(float(1).sub(step(0.55, v.z).mul(0.35))));
      light.assign(float(1).sub(inside));
    })
    // 3 zebra: equal-width warped stripes, ink on cream.
    .ElseIf(kind.lessThan(3.5), () => {
      const warp = mx_fractal_noise_float(p.mul(2.2).add(vec3(0, 5.5, 1.3)), 2, 2.0, 0.5, 1.0);
      const uu = p.x.mul(5.2).mul(scale).add(warp.mul(0.55)).add(p.y.mul(0.6));
      const band = sin(uu.mul(Math.PI));
      const belly = smoothstep(-0.5, -0.95, p.y);
      ink.assign(aa(0.0, band).mul(float(1).sub(belly)));
      light.assign(float(1).sub(ink));
    })
    // 4 snake: square rhombic scales on the pole-safe row lattice, ink seams, two tones, lit upper edge.
    .ElseIf(kind.lessThan(4.5), () => {
      const sc = snakeScales(frame, float(16).mul(scale));
      const aaw = frame.dLat.mul(float(16).mul(scale)).mul(0.5 * 0.75).add(1e-4);
      const seamW = float(0.12).add(contrast.mul(0.08));
      const seam = float(1).sub(aaW(seamW, sc.x, aaw));
      // Scale tones: every scale darkens toward its lower edge (overlap shadow), half of them one step darker.
      const tone = step(0.5, sc.z).mul(0.3).add(step(sc.y, -0.25).mul(0.25));
      const crest = aaW(seamW, sc.x, aaw).mul(float(1).sub(aaW(seamW.add(0.2), sc.x, aaw))).mul(smoothstep(0.05, 0.3, sc.y)).mul(lightSide);
      ink.assign(max(seam, tone.mul(float(1).sub(seam))));
      light.assign(crest);
    })
    // 5 spots: tangent-plane discs of varying size (full circles), sparse on the belly.
    .ElseIf(kind.lessThan(5.5), () => {
      const q = p.mul(2.8).mul(scale).add(20.0);
      const h = cellHash3(floor(q), 5);
      const r = float(0.12).add(h.y.mul(0.16)).mul(float(0.75).add(contrast.mul(0.25)));
      const present = step(h.z, 0.8).mul(smoothstep(-0.95, -0.55, p.y));
      ink.assign(dotFieldTangent(q, inp.n, r, 5).mul(present));
    })
    // 6 diamonds: Earle mosaic — 4-dot diamonds and 5-dot crosses on the pole-safe row lattice,
    // denser and lighter toward the light (Ebene_3, ref 10).
    .ElseIf(kind.lessThan(6.5), () => {
      const L = rowLattice(frame, float(24).mul(scale), 1);
      const f = L.local;
      const h = cellHash3(vec3(L.col, L.row, 0), 6);
      const o = float(0.21);
      const m = min(min(length(f.sub(vec2(o, 0))), length(f.sub(vec2(o.negate(), 0)))), min(length(f.sub(vec2(0, o))), length(f.sub(vec2(0, o.negate())))));
      const isCross = step(h.y, 0.4);
      const mm = min(m, mix(float(9), length(f), isCross));
      const dotR = float(0.075).add(contrast.mul(0.02));
      const dots = float(1).sub(aaW(dotR, mm, L.aaw));
      const dens = float(0.22).add(lit01.mul(0.62)).add(contrast.mul(0.1));
      const present = step(h.x, dens);
      light.assign(dots.mul(present));
      const pick = h.z;
      lightCol.assign(mix(mix(lightSlot.xyz, light2Slot.xyz, step(0.38, pick)), highlight, step(0.74, pick)));
    });

  if (opts.marksOnly) {
    return { ink: clamp(ink.mul(smoothstep(0.02, 0.15, contrast.add(0.1))), 0, 1), light: clamp(light, 0, 1), inkColor: inkSlot.xyz, lightColor: lightCol, stipple: float(0), rimDots: float(0) };
  }

  // Earle stipple: dots that grow toward the light (object-space halftone of the lit band). When a cell
  // shrinks under ≈ 3 px the dots fade to their average coverage (no moiré on small board blobs).
  const stippleAmt = inkSlot.w;
  const sq = p.mul(14).mul(scale).add(40.0);
  const cellsPerPx = length(fwidth(sq));
  const stRad = float(0.03).add(lit01.mul(0.38));
  const stDots = dotField(sq, stRad, 9);
  const stipple = mix(stDots, lit01.mul(0.42), smoothstep(0.25, 0.55, cellsPerPx)).mul(smoothstep(0.02, 0.1, stippleAmt));

  // Dotted rim: light dots along the sunlit Fresnel band (fades to a thin value step when tiny).
  const rimAmt = lightSlot.w;
  const rq = p.mul(22).mul(scale).add(70.0);
  const rimBand = smoothstep(0.3, 0.5, inp.fres).mul(float(1).sub(smoothstep(0.86, 0.97, inp.fres)));
  const rimD = mix(dotField(rq, float(0.27), 13), float(0.3), smoothstep(0.3, 0.6, length(fwidth(rq))));
  const rimDots = rimD.mul(rimBand).mul(smoothstep(0.25, 0.55, inp.wrap)).mul(smoothstep(0.02, 0.1, rimAmt));

  return { ink: clamp(ink.mul(smoothstep(0.02, 0.15, contrast.add(0.1))), 0, 1), light: clamp(light, 0, 1), inkColor: inkSlot.xyz, lightColor: lightCol, stipple, rimDots };
}
