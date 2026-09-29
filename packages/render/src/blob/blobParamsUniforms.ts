import { buffer } from 'three/tsl';
import type { Node } from 'three/webgpu';
import { boundingRadius, squashScales, NO_FLOOR, MATERIAL_KIND_ID, type BlobParams, type SpherePrim, type Vec3 } from '@ee/genome';
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
  MISC: 20, // floorY, taper, morph, materialKind
  BASE: 21, // rgb base colour, w gloss
  INNER: 22, // rgb inner colour, w translucency
  RIM: 23, // rgb rim colour, w bubbleDensity
  HIGHLIGHT: 24, // rgb highlight colour, w alpha
  BUBBLE: 25, // rgb bubble colour, w breath phase
  EYE: 26, // xyz eye direction, w eye size
  ANIM: 27, // jiggleAmp, eyeSpacing, seed, spare
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
  /** Explicit half extents of the instance box (blob units), e.g. during a merge. */
  boxHalf?: Vec3;
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

  /** Writes everything for one instance. */
  write(slot: number, params: BlobParams, placement: BlobPlacement, dyn: BlobDynamics = {}): void {
    if (slot < 0 || slot >= this.capacity) return;
    const count = this.writeSpheres(slot, params.spheres);
    const squash = dyn.squash ?? params.squash;
    const ax = squash.axis;
    const al = Math.hypot(ax[0], ax[1], ax[2]) || 1;
    const axis: Vec3 = [ax[0] / al, ax[1] / al, ax[2] / al];
    const amount = Math.max(-0.6, Math.min(1.5, squash.amount));
    const taper = squash.taper ?? params.squash.taper ?? 0;

    let half = dyn.boxHalf;
    if (!half) {
      // Box big enough for the squashed body: per axis blend of the along/across scale.
      const r = boundingRadius(params);
      const { along, across } = squashScales(amount);
      const grow = Math.max(along, across, 1);
      half = [r * grow, r * grow, r * grow];
      const floorY = params.floorY ?? NO_FLOOR;
      // Nothing below the floor: shrink the box bottom to the cut plane (saves marched pixels).
      if (floorY > NO_FLOOR) half = [half[0], half[1], half[2]];
    }

    this.set4(slot, BlobField.PLACE, placement.center[0], placement.center[1], placement.center[2], placement.scale);
    this.set4(slot, BlobField.BOX, half[0], half[1], half[2], count);
    this.set4(slot, BlobField.SHAPE, params.sminK, params.noiseAmp, params.noiseFreq, params.breathHz);
    this.set4(slot, BlobField.SQUASH, axis[0], axis[1], axis[2], amount);
    this.set4(slot, BlobField.MISC, params.floorY ?? NO_FLOOR, taper, params.morph, MATERIAL_KIND_ID[params.material]);
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
    this.set4(slot, BlobField.ANIM, dyn.jiggle ?? 0, params.eye.spacing, dyn.seed ?? slot * 17 + 3, 0);
  }
}
