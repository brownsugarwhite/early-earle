import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Mesh } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { attribute, color, mix, smoothstep } from 'three/tsl';
import type { FloatNode } from '../common/tsl';

/** Columns across a mouth and rows (upper lip, middle, lower lip). */
export const MOUTH_COLS = 15;
export const MOUTH_ROWS = 3;
const VERTS = MOUTH_COLS * MOUTH_ROWS;

/**
 * All creature mouths of a pool in one draw call: per mouth a small grid (upper lip → middle → lower lip)
 * whose vertices the rig traces onto the body SDF every frame the mouth is open (the sketch's black
 * crescent, conformal to the jelly, riding its squash and wobble). Flat ink with a slightly lighter lip
 * edge; closed mouths collapse to nothing. No outlines.
 */
export class MouthBatch {
  readonly mesh: Mesh;
  readonly capacity: number;
  private readonly position: BufferAttribute;
  private readonly free: number[] = [];
  private high = 0;
  private dirty = false;
  private readonly visible: Uint8Array;

  constructor(capacity = 96) {
    this.capacity = capacity;
    const geo = new BufferGeometry();
    this.position = new BufferAttribute(new Float32Array(capacity * VERTS * 3), 3);
    this.position.setUsage(DynamicDrawUsage);
    geo.setAttribute('position', this.position);
    // v: 0 at the lips, 1 on the middle row (depth shade).
    const depth = new Float32Array(capacity * VERTS);
    const index: number[] = [];
    for (let m = 0; m < capacity; m++) {
      const b = m * VERTS;
      for (let r = 0; r < MOUTH_ROWS; r++) for (let c = 0; c < MOUTH_COLS; c++) depth[b + r * MOUTH_COLS + c] = r === 1 ? 1 : 0;
      for (let r = 0; r < MOUTH_ROWS - 1; r++) {
        for (let c = 0; c < MOUTH_COLS - 1; c++) {
          const a = b + r * MOUTH_COLS + c;
          const d = a + MOUTH_COLS;
          index.push(a, d, a + 1, a + 1, d, d + 1);
        }
      }
    }
    geo.setAttribute('mouthDepth', new BufferAttribute(depth, 1));
    geo.setIndex(index);
    const material = new MeshBasicNodeMaterial();
    const v = attribute('mouthDepth', 'float') as FloatNode;
    material.colorNode = mix(color('#2b1a2e'), color('#0a0a0f'), smoothstep(0.0, 0.7, v));
    material.side = DoubleSide;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    material.polygonOffsetUnits = -2;
    material.name = 'ee-creature-mouth';
    this.mesh = new Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'creature-mouths';
    this.mesh.renderOrder = 1;
    this.visible = new Uint8Array(capacity);
  }

  alloc(): number {
    const reused = this.free.pop();
    if (reused !== undefined) return reused;
    if (this.high >= this.capacity) return -1;
    return this.high++;
  }

  release(i: number): void {
    if (i < 0) return;
    this.hide(i);
    this.free.push(i);
  }

  hide(i: number): void {
    if (i < 0 || !this.visible[i]) return;
    this.position.array.fill(0, i * VERTS * 3, (i + 1) * VERTS * 3);
    this.visible[i] = 0;
    this.dirty = true;
  }

  /** Writes mouth `i` (VERTS × xyz in the pool group's space, rows upper → middle → lower). */
  write(i: number, verts: Float32Array): void {
    if (i < 0) return;
    (this.position.array as Float32Array).set(verts, i * VERTS * 3);
    this.visible[i] = 1;
    this.dirty = true;
  }

  commit(): void {
    if (!this.dirty) return;
    this.position.needsUpdate = true;
    this.dirty = false;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicNodeMaterial).dispose();
  }
}

export const MOUTH_VERTS = VERTS;
