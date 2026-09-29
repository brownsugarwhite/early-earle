import { Group, InstancedBufferAttribute, InstancedMesh, type BufferGeometry, type Material } from 'three';
import type { MeshBasicNodeMaterial } from 'three/webgpu';
import type { CreatureSpec } from '@ee/genome';
import type { BlobShadingUniforms } from '../blob/blobShading';
import { CreatureRig } from './CreatureRig';
import type { ModuleDef, ModuleLibrary } from './ModuleLibrary';
import { PART_ANIM_ATTR, PART_TINT_ATTR, createPartMaterial } from './partMaterial';

const ZERO16 = new Float32Array(16);

/** One InstancedMesh per (module, segment, primitive): every creature's copy of that part is an instance. */
export class PartPool {
  readonly mesh: InstancedMesh;
  readonly tint: InstancedBufferAttribute;
  readonly anim: InstancedBufferAttribute;
  private readonly free: number[] = [];
  private high = 0;
  private dirtyMatrix = false;
  private dirtyAttr = false;

  constructor(
    readonly key: string,
    geometry: BufferGeometry,
    material: Material,
    readonly capacity: number,
  ) {
    const geo = geometry.clone();
    this.tint = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.anim = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    geo.setAttribute(PART_TINT_ATTR, this.tint);
    geo.setAttribute(PART_ANIM_ATTR, this.anim);
    this.mesh = new InstancedMesh(geo, material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.name = key;
    this.mesh.instanceMatrix.array.fill(0); // zero matrices: hidden until written
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
    this.mesh.instanceMatrix.array.set(ZERO16, i * 16);
    this.dirtyMatrix = true;
  }

  setMatrix(i: number, elements: ArrayLike<number>): void {
    this.mesh.instanceMatrix.array.set(elements, i * 16);
    this.dirtyMatrix = true;
  }

  setTint(i: number, r: number, g: number, b: number): void {
    const a = this.tint.array as Float32Array;
    const o = i * 3;
    if (a[o] === r && a[o + 1] === g && a[o + 2] === b) return;
    a[o] = r;
    a[o + 1] = g;
    a[o + 2] = b;
    this.dirtyAttr = true;
  }

  setAnim(i: number, x: number, y: number, z: number, w: number): void {
    const a = this.anim.array as Float32Array;
    const o = i * 4;
    if (a[o] === x && a[o + 1] === y && a[o + 2] === z && a[o + 3] === w) return;
    a[o] = x;
    a[o + 1] = y;
    a[o + 2] = z;
    a[o + 3] = w;
    this.dirtyAttr = true;
  }

  commit(): void {
    this.mesh.count = this.high;
    if (this.dirtyMatrix) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.dirtyMatrix = false;
    }
    if (this.dirtyAttr) {
      this.tint.needsUpdate = true;
      this.anim.needsUpdate = true;
      this.dirtyAttr = false;
    }
  }

  get used(): number {
    return this.high - this.free.length;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.dispose();
  }
}

export interface CreaturePoolOptions {
  /** Instances per pool (a pool = one module segment primitive). */
  capacity?: number;
}

/**
 * Owns the instanced pools of all accessories in a scene: add `group` to the scene, create rigs from
 * `CreatureSpec`s, call `update` on the rigs and `commit()` once per frame. One draw call per module
 * segment type, however many creatures wear it.
 */
export class CreaturePool {
  readonly group = new Group();
  readonly material: MeshBasicNodeMaterial;
  readonly capacity: number;
  private readonly pools = new Map<string, PartPool>();
  private readonly rigs = new Set<CreatureRig>();

  constructor(
    readonly library: ModuleLibrary,
    uniforms: BlobShadingUniforms,
    opts: CreaturePoolOptions = {},
  ) {
    this.material = createPartMaterial(uniforms);
    this.capacity = opts.capacity ?? 256;
    this.group.name = 'creature-parts';
  }

  poolFor(module: ModuleDef, segment: number, prim: number): PartPool {
    const key = `${module.id}#${segment}#${prim}`;
    let pool = this.pools.get(key);
    if (!pool) {
      const geometry = module.segments[segment]!.prims[prim]!.geometry;
      pool = new PartPool(key, geometry, this.material, this.capacity);
      this.pools.set(key, pool);
      this.group.add(pool.mesh);
    }
    return pool;
  }

  /** Modules must be loaded (`library.get`); parts whose module is missing are skipped. */
  createRig(spec: CreatureSpec): CreatureRig {
    const rig = new CreatureRig(this, spec);
    this.rigs.add(rig);
    return rig;
  }

  /** @internal */
  forget(rig: CreatureRig): void {
    this.rigs.delete(rig);
  }

  get rigCount(): number {
    return this.rigs.size;
  }

  /** Uploads dirty instance data; call once per frame after all rigs updated. */
  commit(): void {
    for (const p of this.pools.values()) p.commit();
  }

  /** Pools that currently draw (≈ draw calls for the accessories). */
  get drawCalls(): number {
    let n = 0;
    for (const p of this.pools.values()) if (p.mesh.count > 0) n++;
    return n;
  }

  get instanceCount(): number {
    let n = 0;
    for (const p of this.pools.values()) n += p.used;
    return n;
  }

  dispose(): void {
    for (const rig of [...this.rigs]) rig.dispose();
    for (const p of this.pools.values()) {
      this.group.remove(p.mesh);
      p.dispose();
    }
    this.pools.clear();
    this.material.dispose();
  }
}
