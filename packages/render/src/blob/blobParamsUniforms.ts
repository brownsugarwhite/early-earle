import { buffer } from 'three/tsl';
import type { Node } from 'three/webgpu';
import { BREATH_AMPLITUDE, squashScales, NO_FLOOR, type BlobParams, type SpherePrim, type Vec3 } from '@ee/genome';
import { hexToLinear } from '../common/tsl';
import { patternPalette } from './patterns';
import { BLOB_MATERIAL_KIND_ID, DEFAULT_FEATHER, DEFAULT_FUR, NO_PATTERN, PATTERN_KIND_ID, type BlobMaterialKind, type BlobRenderParams, type FaceMask, type FeatherParams, type FurParams, type PatternParams, type RippleImpulse } from './patterns';

/** Sphere slots per instance on the GPU. Genomes use ≤ 8; a merge union (A ∪ B + droplets) up to 16. */
export const BLOB_MAX_SPHERES_GPU = 16;

/**
 * vec4 slots per instance. The whole block is one uniform buffer (works on WebGPU and on the WebGL2
 * fallback as a UBO; 36 blobs × 28 × 16 B = 16 128 B, under the 16 KB minimum UBO size of WebGL2/iOS).
 */
export const BLOB_STRIDE = 28;

/** Slot indices inside one instance (vec4 units). */
export const BlobField = {
  SPHERES: 0, // 0..15: xyz centre, w radius (blob units)
  PLACE: 16, // xyz centre in object space (world units), w = blob→world scale
  BOX: 17, // xyz half extents of the instance box (blob units), w = sphere count
  SHAPE: 18, // sminK, noiseAmp, noiseFreq, breathHz
  SQUASH: 19, // xyz unit axis, w amount
  MISC: 20, // floorY, taper, detail (1 = inner march + bubbles, 0 = LOD skip), materialKind (0..5, see BLOB_MATERIAL_KIND_ID)
  BASE: 21, // rgb base colour, w gloss
  INNER: 22, // rgb inner colour, w translucency
  RIM: 23, // rgb rim colour, w bubbleDensity
  HIGHLIGHT: 24, // rgb highlight colour, w alpha
  BUBBLE: 25, // rgb bubble colour, w breath phase
  EYE: 26, // xyz eye direction, w eye size
  ANIM: 27, // jiggleAmp, eyeSpacing, seed, box centre y (blob units; the box is tight around the body)
} as const;

/**
 * Second, small uniform buffer per instance ("style block"): pattern, ripple, fur/feather knobs,
 * species ground. Kept apart from the main block so the main block stays under the 16 KB WebGL2
 * minimum. 36 × 9 × 16 B = 5 184 B. Always index with `BLOB_STYLE_STRIDE` (7 → 8 → 9).
 */
export const BLOB_STYLE_STRIDE = 9;

/** Slot indices inside one instance of the style block (vec4 units). */
export const BlobStyleField = {
  MAT: 0, // patternKind (PATTERN_KIND_ID), patternScale, patternContrast, patternRotation
  PATTERN_INK: 1, // rgb pattern ink colour, w stipple (0..1)
  PATTERN_LIGHT: 2, // rgb pattern light colour, w rimDots (0..1)
  PATTERN_LIGHT2: 3, // rgb second light colour, w spare
  RIPPLE: 4, // xyz impact direction (rest space, unit), w age in seconds (< 0 = no ripple)
  FUR: 5, // length, density, sway, comb
  FX: 6, // particle seed, ripple strength, feather size, feather ruffle
  GROUND: 7, // rgb species ground colour (linear, already recoloured), w weight (1 = coat, 0 = body colours)
  FACE: 8, // xyz face direction (unit, blob-local), w angular radius (rad); strength lives in PATTERN_LIGHT2.w
} as const;

export interface BlobPlacement {
  /** Centre of the blob's local origin in the mesh's object space (world units). */
  center: Vec3;
  /** Blob units → world units. */
  scale: number;
}

export interface BlobDynamics {
  /** Overrides `params.squash` (from the SquashDriver). */
  squash?: { axis: Vec3; amount: number; taper?: number };
  /** 0..1 travelling-wave jiggle energy (decays after impulses). */
  jiggle?: number;
  /** Opacity (gas uses it). */
  alpha?: number;
  /** Per-blob phase so idle animations are not in sync. */
  phase?: number;
  /** Hash seed for bubbles. */
  seed?: number;
  /** Explicit half extents of the instance box (blob units); default = tight box around the spheres. */
  boxHalf?: Vec3;
  /** 1 = full detail (inner organs, bubbles); 0 = screen-size LOD skips the inner march. Default 1. */
  detail?: number;
  /** Keep at most this many spheres (index 0/1 first, then the largest lobes). Default: all. */
  maxSpheres?: number;
  /** Overrides `params.material` (lets a genome `BlobParams` render as fur or feathers). */
  material?: BlobMaterialKind | undefined;
  /** Overrides `params.pattern`. */
  pattern?: PatternParams | undefined;
  /** Overrides `params.fur`. */
  fur?: Partial<FurParams> | undefined;
  /** Overrides `params.feather`. */
  feather?: Partial<FeatherParams> | undefined;
  /** Concentric surface ripples from an impact (liquid v2; jelly damped). */
  ripple?: RippleImpulse | undefined;
  /**
   * Face mask (overrides `params.faceMask`): patterns, fur strokes/fins/shells and feather cards are
   * suppressed around the face so eyes stay readable. Default: derived from the painted eye
   * (`params.eye`: direction, size and spacing). Set `strength: 0` to switch it off.
   */
  face?: FaceMask | undefined;
}

/** Linear sRGB → OKLab → OKLCh; h in radians. */
function toOklch(c: readonly number[]): [number, number, number] {
  const l = 0.4122214708 * c[0]! + 0.5363325363 * c[1]! + 0.0514459929 * c[2]!;
  const m = 0.2119034982 * c[0]! + 0.6806995451 * c[1]! + 0.1073969566 * c[2]!;
  const s = 0.0883024619 * c[0]! + 0.2817188376 * c[1]! + 0.6299787005 * c[2]!;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function fromOklch([L, C, h]: readonly [number, number, number]): [number, number, number] {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = L - 0.0894841775 * A - 1.291485548 * B;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  return [clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}

/**
 * Harmonising blend (recolor): lightness and chroma blend linearly, the hue walks the short way round
 * the OKLCh circle — saffron pulled toward a teal body becomes ochre/olive-gold, not grey.
 */
const mixLin = (a: readonly number[], b: readonly number[], t: number): [number, number, number] => {
  if (t <= 0) return [a[0]!, a[1]!, a[2]!];
  if (t >= 1) return [b[0]!, b[1]!, b[2]!];
  const x = toOklch(a);
  const y = toOklch(b);
  let dh = y[2] - x[2];
  if (dh > Math.PI) dh -= 2 * Math.PI;
  if (dh < -Math.PI) dh += 2 * Math.PI;
  // Near-grey colours have no meaningful hue: take the other's.
  const hx = x[1] < 0.02 ? y[2] : x[2];
  const hy = y[1] < 0.02 ? x[2] : hx + dh;
  return fromOklch([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, hx + (hy - hx) * t]);
};

/** Keeps the body (index 0/1) and the largest lobes so a capped blob still reads the same. */
export function capSpheres(spheres: readonly SpherePrim[], max: number): SpherePrim[] {
  if (spheres.length <= max) return [...spheres];
  const head = spheres.slice(0, Math.min(2, max));
  const rest = spheres.slice(head.length).sort((a, b) => b.r - a.r);
  return head.concat(rest.slice(0, Math.max(0, max - head.length)));
}

/**
 * Per-instance parameter block shared by both render candidates (and the fur/feather/particle passes):
 * one Float32Array, uploaded every frame as a uniform buffer, indexed on the GPU with
 * `instanceIndex * BLOB_STRIDE + field`, plus the style block indexed with `instanceIndex * BLOB_STYLE_STRIDE + field`.
 */
export class BlobParamBlock {
  readonly data: Float32Array;
  /** `buffer(...)` node; read with `elementOf(node, index)`. */
  readonly node: Node;
  /** Style block data (pattern, ripple, fur, feather). */
  readonly styleData: Float32Array;
  /** `buffer(...)` node of the style block; read with `elementOf(styleNode, slot * BLOB_STYLE_STRIDE + field)`. */
  readonly styleNode: Node;

  constructor(readonly capacity: number) {
    this.data = new Float32Array(capacity * BLOB_STRIDE * 4);
    this.node = buffer(this.data, 'vec4', capacity * BLOB_STRIDE) as unknown as Node;
    this.styleData = new Float32Array(capacity * BLOB_STYLE_STRIDE * 4);
    this.styleNode = buffer(this.styleData, 'vec4', capacity * BLOB_STYLE_STRIDE) as unknown as Node;
    for (let i = 0; i < capacity; i++) this.hide(i);
  }

  private set4(slot: number, field: number, x: number, y: number, z: number, w: number): void {
    const o = (slot * BLOB_STRIDE + field) * 4;
    this.data[o] = x;
    this.data[o + 1] = y;
    this.data[o + 2] = z;
    this.data[o + 3] = w;
  }

  private setStyle(slot: number, field: number, x: number, y: number, z: number, w: number): void {
    const o = (slot * BLOB_STYLE_STRIDE + field) * 4;
    this.styleData[o] = x;
    this.styleData[o + 1] = y;
    this.styleData[o + 2] = z;
    this.styleData[o + 3] = w;
  }

  /** Makes an instance produce no fragments (zero box, zero spheres) and clears its style. */
  hide(slot: number): void {
    this.set4(slot, BlobField.BOX, 0, 0, 0, 0);
    this.set4(slot, BlobField.PLACE, 0, -100, 0, 0);
    this.set4(slot, BlobField.MISC, NO_FLOOR, 0, 0, 0);
    this.setStyle(slot, BlobStyleField.MAT, 0, 1, 0, 0);
    this.setStyle(slot, BlobStyleField.RIPPLE, 0, 1, 0, -1);
    this.setStyle(slot, BlobStyleField.FX, slot * 7.31, 0, 1, 0);
    this.setStyle(slot, BlobStyleField.GROUND, 0, 0, 0, 0);
    this.setStyle(slot, BlobStyleField.FACE, 0, 0, 1, 0);
  }

  /** Writes the sphere list (≤ 16). Returns the count written. */
  writeSpheres(slot: number, spheres: readonly SpherePrim[]): number {
    const n = Math.min(spheres.length, BLOB_MAX_SPHERES_GPU);
    for (let i = 0; i < n; i++) {
      const s = spheres[i]!;
      this.set4(slot, BlobField.SPHERES + i, s.center[0], s.center[1], s.center[2], s.r);
    }
    return n;
  }

  /** Material kind written for an instance (params or the dynamics override). */
  static materialOf(params: BlobRenderParams | BlobParams, dyn: BlobDynamics = {}): BlobMaterialKind {
    return dyn.material ?? params.material;
  }

  /**
   * Writes everything for one instance. The instance box is fitted per axis to the sphere list
   * (plus noise/smin/breath margins and the squash), cut at the floor, and re-centred: x/z by
   * shifting the spheres (the placement shifts back by the same amount), y via ANIM.w. Tight boxes
   * are the cheapest raymarch optimisation: fewer pixels enter the loop at all.
   */
  write(slot: number, params: BlobRenderParams | BlobParams, placement: BlobPlacement, dyn: BlobDynamics = {}): void {
    if (slot < 0 || slot >= this.capacity) return;
    const spheres = dyn.maxSpheres !== undefined ? capSpheres(params.spheres, dyn.maxSpheres) : params.spheres;
    const squash = dyn.squash ?? params.squash;
    const ax = squash.axis;
    const al = Math.hypot(ax[0], ax[1], ax[2]) || 1;
    const axis: Vec3 = [ax[0] / al, ax[1] / al, ax[2] / al];
    const amount = Math.max(-0.6, Math.min(1.5, squash.amount));
    const taper = squash.taper ?? params.squash.taper ?? 0;
    const floorY = params.floorY ?? NO_FLOOR;
    const material = BlobParamBlock.materialOf(params, dyn);
    const style = params as Partial<BlobRenderParams>;
    const ripple = dyn.ripple;
    const rippleActive = ripple !== undefined && ripple.age >= 0;

    // --- tight box -----------------------------------------------------------------------------
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (const s of spheres) {
      const r = s.r * (1 + BREATH_AMPLITUDE);
      minX = Math.min(minX, s.center[0] - r);
      maxX = Math.max(maxX, s.center[0] + r);
      minY = Math.min(minY, s.center[1] - r);
      maxY = Math.max(maxY, s.center[1] + r);
      minZ = Math.min(minZ, s.center[2] - r);
      maxZ = Math.max(maxZ, s.center[2] + r);
    }
    if (!Number.isFinite(minX)) minX = maxX = minY = maxY = minZ = maxZ = 0;
    // Displacement margin: 2-octave noise ≤ 1.6·amp, smin bulge, jiggle ripple, impact ripple, hit
    // epsilon. Fire: the ridged noise pushes out ≤ 0.8·amp·4 and the tongue crown rises — mostly upward,
    // so the box grows up (every ray that misses between tongues marches all steps: keep it tight).
    const fire = material === 'fire';
    const margin = params.noiseAmp * 1.6 * (fire ? 1.5 : 1) + params.sminK * 0.25 + 0.05 * (dyn.jiggle ?? 0) + (rippleActive ? 0.05 : 0) + 0.04;
    const fireUp = fire ? params.noiseAmp * (0.8 * 4 + 3.2) : 0;
    minX -= margin; maxX += margin; minY -= margin; maxY += margin + fireUp; minZ -= margin; maxZ += margin;
    if (floorY > NO_FLOOR) minY = Math.max(minY, floorY - 0.02); // nothing below the cut plane
    const { along, across } = squashScales(amount);
    const grow = Math.abs(amount) > 0.01 ? Math.max(along, across) : 1;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const cy = ((minY + maxY) / 2) * grow;
    let half: Vec3 = [((maxX - minX) / 2) * grow, ((maxY - minY) / 2) * grow, ((maxZ - minZ) / 2) * grow];
    if (dyn.boxHalf) half = dyn.boxHalf;

    // Spheres shifted so the box is centred in x/z; the placement moves back by the same amount.
    const count = Math.min(spheres.length, BLOB_MAX_SPHERES_GPU);
    for (let i = 0; i < count; i++) {
      const s = spheres[i]!;
      this.set4(slot, BlobField.SPHERES + i, s.center[0] - cx, s.center[1], s.center[2] - cz, s.r);
    }
    const sc = placement.scale;
    this.set4(slot, BlobField.PLACE, placement.center[0] + cx * sc, placement.center[1], placement.center[2] + cz * sc, sc);
    this.set4(slot, BlobField.BOX, half[0], half[1], half[2], count);
    this.set4(slot, BlobField.SHAPE, params.sminK, params.noiseAmp, params.noiseFreq, params.breathHz);
    this.set4(slot, BlobField.SQUASH, axis[0], axis[1], axis[2], amount);
    this.set4(slot, BlobField.MISC, floorY, taper, dyn.detail ?? 1, BLOB_MATERIAL_KIND_ID[material]);
    const base = hexToLinear(params.baseColor);
    const inner = hexToLinear(params.innerColor);
    const rim = hexToLinear(params.rimColor);
    const hl = hexToLinear(params.highlightColor);
    const bub = hexToLinear(params.bubbleColor);
    this.set4(slot, BlobField.BASE, base[0], base[1], base[2], params.gloss);
    this.set4(slot, BlobField.INNER, inner[0], inner[1], inner[2], params.translucency);
    this.set4(slot, BlobField.RIM, rim[0], rim[1], rim[2], params.bubbleDensity);
    this.set4(slot, BlobField.HIGHLIGHT, hl[0], hl[1], hl[2], dyn.alpha ?? 1);
    this.set4(slot, BlobField.BUBBLE, bub[0], bub[1], bub[2], dyn.phase ?? 0);
    const e = params.eye.dir;
    const el = Math.hypot(e[0], e[1], e[2]) || 1;
    this.set4(slot, BlobField.EYE, e[0] / el, e[1] / el, e[2] / el, params.eye.size);
    const seed = dyn.seed ?? slot * 17 + 3;
    this.set4(slot, BlobField.ANIM, dyn.jiggle ?? 0, params.eye.spacing, seed, cy);

    // --- style block ---------------------------------------------------------------------------
    const pattern: PatternParams = dyn.pattern ?? style.pattern ?? NO_PATTERN;
    // Species colours, pulled toward the body palette by `recolor` (linear RGB, no string churn).
    const rc = Math.max(0, Math.min(1, pattern.recolor ?? 0));
    let pInk = hexToLinear(pattern.ink);
    let pLight = hexToLinear(pattern.light);
    let pLight2 = hexToLinear(pattern.light2 ?? pattern.light);
    let ground: [number, number, number] = pattern.ground ? hexToLinear(pattern.ground) : [0, 0, 0];
    if (rc > 0) {
      const h = patternPalette(pattern.kind, params.baseColor);
      pInk = mixLin(pInk, hexToLinear(h.ink), rc);
      pLight = mixLin(pLight, hexToLinear(h.light), rc);
      pLight2 = mixLin(pLight2, hexToLinear(h.light2), rc);
      if (pattern.ground) ground = mixLin(ground, hexToLinear(params.baseColor), rc);
    }
    // The ground replaces the body ramp (already recoloured above: recolor 1 = the body colour itself).
    const groundW = pattern.ground ? 1 : 0;
    this.setStyle(slot, BlobStyleField.GROUND, ground[0], ground[1], ground[2], groundW);
    // Fur and feather bodies default to a dotted rim (their silhouettes are strands/tips in the references).
    const rimDots = pattern.rimDots ?? (material === 'fur' ? 0.8 : material === 'feather' ? 0.5 : 0);
    this.setStyle(slot, BlobStyleField.MAT, PATTERN_KIND_ID[pattern.kind], pattern.scale, pattern.contrast, pattern.rotation ?? 0);
    this.setStyle(slot, BlobStyleField.PATTERN_INK, pInk[0], pInk[1], pInk[2], pattern.stipple ?? 0);
    this.setStyle(slot, BlobStyleField.PATTERN_LIGHT, pLight[0], pLight[1], pLight[2], rimDots);
    // Face mask: explicit (dyn / params) or derived from the painted eye (covers both slits + a halo).
    const faceIn = dyn.face ?? (params as Partial<BlobRenderParams>).faceMask;
    const fDir = faceIn?.dir ?? params.eye.dir;
    const fLen = Math.hypot(fDir[0], fDir[1], fDir[2]) || 1;
    // Default: the angular radius of the eye pair (slit half-height 0.85·size, half-width ≈ 0.15·size
    // beside the spacing) plus a clean halo of 0.16 rad.
    const fRadius = faceIn ? faceIn.radius : Math.hypot(params.eye.spacing + params.eye.size * 0.15, params.eye.size * 0.85) + 0.16;
    const fStrength = Math.max(0, Math.min(1, faceIn?.strength ?? 1));
    this.setStyle(slot, BlobStyleField.PATTERN_LIGHT2, pLight2[0], pLight2[1], pLight2[2], fStrength);
    this.setStyle(slot, BlobStyleField.FACE, fDir[0] / fLen, fDir[1] / fLen, fDir[2] / fLen, fRadius);
    if (rippleActive) {
      const d = ripple.dir;
      const dl = Math.hypot(d[0], d[1], d[2]) || 1;
      this.setStyle(slot, BlobStyleField.RIPPLE, d[0] / dl, d[1] / dl, d[2] / dl, ripple.age);
    } else this.setStyle(slot, BlobStyleField.RIPPLE, 0, 1, 0, -1);
    const fur: FurParams = { ...DEFAULT_FUR, ...style.fur, ...dyn.fur };
    const feather: FeatherParams = { ...DEFAULT_FEATHER, ...style.feather, ...dyn.feather };
    this.setStyle(slot, BlobStyleField.FUR, fur.length, fur.density, fur.sway, fur.comb);
    this.setStyle(slot, BlobStyleField.FX, seed * 0.173, rippleActive ? (ripple.strength ?? 1) : 0, feather.size, feather.ruffle);
  }
}
