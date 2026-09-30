import { Group, Mesh, type BufferGeometry, type Camera, type Material, type PerspectiveCamera } from 'three/webgpu';
import type { LandmarkInstance } from '@ee/world';
import type { FloatNode, Vec3Node } from '../../tsl';
import { GeoBuffer, type LandmarkFrame } from './buffers';
import { createLandmarkUniforms, type LandmarkMaterialContext, type LandmarkUniforms } from './context';
import type { LandmarkRows } from './palette';
import { ROCK_LAYOUT, addArcade, addPrisms } from './prismGeometry';
import { createLandmarkRockMaterial } from './rockMaterial';
import { DotBatch, FALL_LAYOUT, addFallDots, addFalls, createDotMesh, createFallMaterial, createMistMesh } from './waterfall';
import { WATER_LAYOUT, addPoolsAndStreams, createPoolMaterial } from './water';

export type LandmarkQuality = 'hoch' | 'mobil';

export interface LandmarkSetOptions {
  ctx: LandmarkMaterialContext;
  /** Palette rows for an Earle world index (the atlas must hold them; one world → always the same rows). */
  rowsFor: (world: number) => LandmarkRows;
  quality?: LandmarkQuality;
  /**
   * Floating origin (ADR 0002): meshes are built relative to this plane point; the host places `group` there (or
   * leaves it at 0 and moves it with the focus).
   */
  origin?: { x: number; z: number };
  /** Sun shadow factor at a world position (e.g. `sun.shadowFactor(p)`): spray and stipple dots darken in shade. */
  shade?: ((worldPos: Vec3Node) => FloatNode) | undefined;
}

export interface LandmarkSetStats {
  landmarks: number;
  meshes: number;
  vertices: number;
  triangles: number;
  dots: number;
  mistPuffs: number;
}

/**
 * All landmarks of a region as a handful of merged meshes — one draw call per role (rock/stone, fall sheets, pools
 * and streams, mist puffs, dots), whatever the number of landmarks. Rebuild with `build(instances)` when
 * the region changes; animation runs on the GPU (`update` only feeds the camera's projection scale for the dots).
 *
 * Shadows: rock and stone cast and receive; water, falls and mist receive; dots neither.
 */
export class LandmarkSet {
  readonly group = new Group();
  readonly uniforms: LandmarkUniforms;
  private readonly ctx: LandmarkMaterialContext;
  private readonly rowsFor: (world: number) => LandmarkRows;
  private quality: LandmarkQuality;
  private readonly origin: { x: number; z: number };
  private readonly shade: ((worldPos: Vec3Node) => FloatNode) | undefined;
  private readonly materials = new Map<string, Material>();
  private readonly geometries: BufferGeometry[] = [];
  private instances: readonly LandmarkInstance[] = [];
  private statsCache: LandmarkSetStats = { landmarks: 0, meshes: 0, vertices: 0, triangles: 0, dots: 0, mistPuffs: 0 };
  /** Meshes by role (for tests, labs and the shadow fitting). */
  readonly meshes = new Map<string, Mesh>();

  constructor(o: LandmarkSetOptions) {
    this.ctx = o.ctx;
    this.rowsFor = o.rowsFor;
    this.quality = o.quality ?? 'hoch';
    this.origin = o.origin ?? { x: 0, z: 0 };
    this.shade = o.shade;
    this.uniforms = createLandmarkUniforms();
    this.uniforms.collapsePx.value = this.quality === 'mobil' ? 1.2 : 0.75;
    this.group.name = 'landmarks';
  }

  private material<T extends Material>(key: string, make: () => T): T {
    let m = this.materials.get(key) as T | undefined;
    if (!m) {
      m = make();
      this.materials.set(key, m);
    }
    return m;
  }

  private frameOf(inst: LandmarkInstance): LandmarkFrame {
    const p = inst.placement;
    return { x: p.x - this.origin.x, y: p.y, z: p.z - this.origin.z, yaw: p.yaw };
  }

  /** (Re)builds all meshes for these instances. Materials are kept (no shader rebuild on a new region). */
  build(instances: readonly LandmarkInstance[]): void {
    this.clearMeshes();
    this.instances = instances;
    const detail = this.quality === 'mobil' ? 0.55 : 1;
    const rock = new GeoBuffer(ROCK_LAYOUT);
    const falls = new GeoBuffer(FALL_LAYOUT);
    const water = new GeoBuffer(WATER_LAYOUT);
    const dots = new DotBatch();
    const mist: Array<{ puff: LandmarkInstance['blueprint']['mist'][number]; frame: LandmarkFrame; row: number }> = [];
    instances.forEach((inst, i) => {
      const bp = inst.blueprint;
      const frame = this.frameOf(inst);
      const rows = this.rowsFor(inst.placement.world);
      addPrisms(rock, bp.prisms, frame, rows);
      for (const a of bp.arcades) addArcade(rock, a, frame, rows);
      addFalls(falls, bp.falls, frame, rows, bp.seed + i);
      addPoolsAndStreams(water, bp.pools, bp.falls, frame, rows, [0, 0]);
      addFallDots(dots, bp.falls, bp.mist, frame, rows, detail, bp.seed + i * 7);
      for (const puff of bp.mist) mist.push({ puff, frame, row: rows.mist });
    });
    const ctx = this.ctx;
    const uni = this.uniforms;
    this.addMesh('rock', rock, () => createLandmarkRockMaterial(ctx, uni), true, true);
    this.addMesh('falls', falls, () => createFallMaterial(ctx, uni), false, true);
    this.addMesh('water', water, () => createPoolMaterial(ctx, uni), false, true);
    const mistMesh = createMistMesh(mist, ctx, uni, detail);
    if (mistMesh) this.adopt('mist', mistMesh);
    if (dots.count > 0) this.adopt('dots', createDotMesh(dots, ctx, uni, this.shade));
    this.statsCache = this.computeStats(dots.count, mist.length);
  }

  private addMesh(role: string, buf: GeoBuffer, make: () => Material, cast: boolean, receive: boolean, renderOrder = 0): void {
    if (buf.empty) return;
    const geometry = buf.toGeometry();
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, this.material(role, make));
    mesh.name = `landmark-${role}`;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.renderOrder = renderOrder;
    // landmarks are tall: tell the cascaded shadows how high the receivers reach
    mesh.userData.shadowVolume = cast;
    this.group.add(mesh);
    this.meshes.set(role, mesh);
  }

  /** Meshes that own their material and geometry (instanced dots, mist). */
  private adopt(role: string, mesh: Mesh): void {
    this.geometries.push(mesh.geometry);
    const prev = this.materials.get(role);
    if (prev) prev.dispose();
    this.materials.set(role, mesh.material as Material);
    this.group.add(mesh);
    this.meshes.set(role, mesh);
  }

  private clearMeshes(): void {
    for (const m of this.meshes.values()) m.removeFromParent();
    this.meshes.clear();
    for (const g of this.geometries) g.dispose();
    this.geometries.length = 0;
  }

  private computeStats(dots: number, mistPuffs: number): LandmarkSetStats {
    let vertices = 0;
    let triangles = 0;
    for (const m of this.meshes.values()) {
      const g = m.geometry;
      const count = g.getAttribute('position').count;
      const inst = (g as { instanceCount?: number }).instanceCount;
      const idx = g.getIndex()?.count ?? count;
      if (typeof inst === 'number' && inst !== Infinity && (m.name === 'landmark-dots' || m.name === 'landmark-mist')) {
        vertices += count * inst;
        triangles += (idx / 3) * inst;
      } else {
        vertices += count;
        triangles += idx / 3;
      }
    }
    return { landmarks: this.instances.length, meshes: this.meshes.size, vertices, triangles, dots, mistPuffs };
  }

  get stats(): LandmarkSetStats {
    return this.statsCache;
  }

  setQuality(q: LandmarkQuality): void {
    if (q === this.quality) return;
    this.quality = q;
    this.uniforms.collapsePx.value = q === 'mobil' ? 1.2 : 0.75;
    this.build(this.instances);
  }

  /** Once per frame (cheap): the camera's projection scale for the dot sizes. */
  update(camera: Camera): void {
    const cam = camera as PerspectiveCamera;
    if (cam.isPerspectiveCamera) this.uniforms.projScaleY.value = 1 / Math.tan(((cam.fov * Math.PI) / 180) * 0.5);
  }

  /** Highest point of all landmarks above their reference ground (shadow camera). */
  get maxHeight(): number {
    return Math.max(0, ...this.instances.map((i) => i.blueprint.height));
  }

  dispose(): void {
    this.clearMeshes();
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    this.group.removeFromParent();
  }
}
