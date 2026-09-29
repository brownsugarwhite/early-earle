import { buffer } from 'three/tsl';
import type { Node } from 'three/webgpu';
import { BREATH_AMPLITUDE, squashScales, NO_FLOOR, MATERIAL_KIND_ID, type BlobParams, type SpherePrim, type Vec3 } from '@ee/genome';
import { hexToLinear } from '../common/tsl';

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
  MISC: 20, // floorY, taper, detail (1 = inner march + bubbles, 0 = LOD skip), materialKind
  BASE: 21, // rgb base colour, w gloss
  INNER: 22, // rgb inner colour, w translucency
  RIM: 23, // rgb rim colour, w bubbleDensity
  HIGHLIGHT: 24, // rgb highlight colour, w alpha
  BUBBLE: 25, // rgb bubble colour, w breath phase
  EYE: 26, // xyz eye direction, w eye size
  ANIM: 27, // jiggleAmp, eyeSpacing, seed, box centre y (blob units; the box is tight around the body)
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
}

/** Keeps the body (index 0/1) and the largest lobes so a capped blob still reads the same. */
export function capSpheres(spheres: readonly SpherePrim[], max: number): SpherePrim[] {
  if (spheres.length <= max) return [...spheres];
  const head = spheres.slice(0, Math.min(2, max));
  const rest = spheres.slice(head.length).sort((a, b) => b.r - a.r);
  return head.concat(rest.slice(0, Math.max(0, max - head.length)));
}

/**
 * Per-instance parameter block shared by both render candidates: one Float32Array, uploaded every
 * frame as a uniform buffer, indexed on the GPU with `instanceIndex * BLOB_STRIDE + field`.
 */
export class BlobParamBlock {
  readonly data: Float32Array;
  /** `buffer(...)` node; read with `elementOf(node, index)`. */
  readonly node: Node;

  constructor(readonly capacity: number) {
    this.data = new Float32Array(capacity * BLOB_STRIDE * 4);
    this.node = buffer(this.data, 'vec4', capacity * BLOB_STRIDE) as unknown as Node;
    for (let i = 0; i < capacity; i++) this.hide(i);
  }

  private set4(slot: number, field: number, x: number, y: number, z: number, w: number): void {
    const o = (slot * BLOB_STRIDE + field) * 4;
    this.data[o] = x;
    this.data[o + 1] = y;
    this.data[o + 2] = z;
    this.data[o + 3] = w;
  }

  /** Makes an instance produce no fragments (zero box, zero spheres). */
  hide(slot: number): void {
    this.set4(slot, BlobField.BOX, 0, 0, 0, 0);
    this.set4(slot, BlobField.PLACE, 0, -100, 0, 0);
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

  /**
   * Writes everything for one instance. The instance box is fitted per axis to the sphere list
   * (plus noise/smin/breath margins and the squash), cut at the floor, and re-centred: x/z by
   * shifting the spheres (the placement shifts back by the same amount), y via ANIM.w. Tight boxes
   * are the cheapest raymarch optimisation: fewer pixels enter the loop at all.
   */
  write(slot: number, params: BlobParams, placement: BlobPlacement, dyn: BlobDynamics = {}): void {
    if (slot < 0 || slot >= this.capacity) return;
    const spheres = dyn.maxSpheres !== undefined ? capSpheres(params.spheres, dyn.maxSpheres) : params.spheres;
    const squash = dyn.squash ?? params.squash;
    const ax = squash.axis;
    const al = Math.hypot(ax[0], ax[1], ax[2]) || 1;
    const axis: Vec3 = [ax[0] / al, ax[1] / al, ax[2] / al];
    const amount = Math.max(-0.6, Math.min(1.5, squash.amount));
    const taper = squash.taper ?? params.squash.taper ?? 0;
    const floorY = params.floorY ?? NO_FLOOR;

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
    // Displacement margin: 2-octave noise ≤ 1.6·amp, smin bulge, jiggle ripple, hit epsilon.
    const margin = params.noiseAmp * 1.6 + params.sminK * 0.25 + 0.05 * (dyn.jiggle ?? 0) + 0.04;
    minX -= margin; maxX += margin; minY -= margin; maxY += margin; minZ -= margin; maxZ += margin;
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
    this.set4(slot, BlobField.MISC, floorY, taper, dyn.detail ?? 1, MATERIAL_KIND_ID[params.material]);
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
    this.set4(slot, BlobField.ANIM, dyn.jiggle ?? 0, params.eye.spacing, dyn.seed ?? slot * 17 + 3, cy);
  }
}
