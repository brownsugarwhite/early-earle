import { BoxGeometry, Color, InstancedMesh, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Fn, color, float, floor, mix, mod, positionWorld, smoothstep, uniform, vec2 } from 'three/tsl';
import {
  boundingRadius as blobBoundingRadius,
  cloneParams,
  genomeFor,
  scaleForTier,
  squashScales,
  NO_FLOOR,
  type BlobParams,
  type MaterialKind,
  type Vec3,
  type ZoneId,
} from '@ee/genome';
import { ShapeMatching, SpringJiggle, type SquashDriver } from '@ee/physics';
import {
  BLOB_QUALITY_HIGH,
  BLOB_QUALITY_MOBILE,
  BlobParamBlock,
  MERGE_TOTAL_MS,
  MergeTimeline,
  applyBlobQuality,
  createBlobQualityUniforms,
  createBlobShadingUniforms,
  createJiggleBlobMesh,
  createRaymarchBlobMesh,
  type BlobDynamics,
} from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';

export type Candidate = 'a' | 'b' | 'both';
export type BlobCount = 1 | 9 | 36;
export type DriverKind = 'spring' | 'shape';
export type LabPose = 'board' | 'screenshot3';
/** Hoch = full raymarch quality; Mobil = phone preset; Auto = Mobil on touch devices or DPR ≥ 2.5. */
export type Quality = 'high' | 'mobile' | 'auto';

export interface BlobLabSettings {
  candidate: Candidate;
  count: BlobCount;
  material: MaterialKind | 'auto';
  tier: number;
  driver: DriverKind;
  pose: LabPose;
  quality: Quality;
  /** Overrides applied to every blob (null = genome value). */
  sminK: number | null;
  noiseAmp: number | null;
  gloss: number | null;
  translucency: number | null;
}

export const DEFAULT_BLOB_LAB_SETTINGS: BlobLabSettings = {
  candidate: 'b',
  count: 9,
  material: 'auto',
  tier: 1,
  driver: 'spring',
  pose: 'board',
  quality: 'auto',
  sminK: null,
  noiseAmp: null,
  gloss: null,
  translucency: null,
};

interface BlobInstance {
  id: number;
  tier: number;
  seed: number;
  /** Genome (before overrides). */
  genome: BlobParams;
  cell: [number, number];
  phase: number;
  jiggle: number;
  alive: boolean;
}

interface MergeState {
  a: BlobInstance;
  b: BlobInstance;
  child: BlobParams;
  timeline: MergeTimeline;
  /** ms since the merge was triggered; B slides in during the first SLIDE_MS. */
  t: number;
}

const ZONE: ZoneId = 'tjorizo';
const CAPACITY = 36;
const CELL = 1;
const SLIDE_MS = 140;
const INK = '#0f1c22';
/** Mobil preset: render at most 1.5× pixel ratio (iPhone DPR 3 → 4× fewer fragments). */
const MOBILE_DPR_CAP = 1.5;
/** Mobil preset: at most this many spheres per blob (index 0/1 + largest lobes). */
const MOBILE_MAX_SPHERES = 5;
/** Projected diameter (device px) below which the inner march is skipped. */
const LOD_PX = { high: 24, mobile: 64 } as const;

export function resolveQuality(q: Quality): 'high' | 'mobile' {
  if (q !== 'auto') return q;
  if (typeof navigator === 'undefined') return 'high';
  const touch = navigator.maxTouchPoints > 0 || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
  return touch || (window.devicePixelRatio || 1) >= 2.5 ? 'mobile' : 'high';
}

/** A/B switches for the raymarch shader, readable from the URL (`?core=1&oct=const&steps=const`). */
export interface BlobLabSceneOptions {
  /** Core-bound stepping in candidate (a). Default false. */
  coreBound?: boolean;
  /** Bake noise octaves (2) into both shaders instead of the quality uniform (Mobil then keeps 2). */
  constantOctaves?: boolean;
  /** Bake the step count (32) into (a) instead of the quality uniform (Mobil then keeps 32). */
  constantSteps?: boolean;
}

export function sceneOptionsFromSearch(search: string): BlobLabSceneOptions {
  const p = new URLSearchParams(search);
  return { coreBound: p.get('core') === '1', constantOctaves: p.get('oct') === 'const', constantSteps: p.get('steps') === 'const' };
}

export interface RenderInfo {
  backend: string;
  options: BlobLabSceneOptions;
  /** Effective renderer pixel ratio (after the Mobil cap). */
  pixelRatio: number;
  devicePixelRatio: number;
  cssWidth: number;
  cssHeight: number;
  backingWidth: number;
  backingHeight: number;
  quality: 'high' | 'mobile';
  candidate: Candidate;
  count: number;
}

/**
 * P1 Blob-Lab scene: a dark game-board plate with 1/9/36 blobs, rendered by candidate (a) raymarch,
 * (b) jiggle mesh, or both side by side. One SquashDriver feeds both candidates so they wobble alike.
 */
export class BlobLabScene implements SceneController {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(32, 1, 0.1, 100);
  private settings: BlobLabSettings = { ...DEFAULT_BLOB_LAB_SETTINGS };
  constructor(readonly options: BlobLabSceneOptions = {}) {}
  private blobs: BlobInstance[] = [];
  private blockA = new BlobParamBlock(CAPACITY);
  private blockB = new BlobParamBlock(CAPACITY);
  private meshA: InstancedMesh | null = null;
  private meshB: InstancedMesh | null = null;
  private plateA: Mesh | null = null;
  private plateB: Mesh | null = null;
  private plateOffset = uniform(0.5);
  private driver: SquashDriver = new SpringJiggle();
  private merge: MergeState | null = null;
  private ctx: SceneContext | null = null;
  private quality = createBlobQualityUniforms();
  private time = 0;
  private aspect = 1;
  private disposables: Array<{ dispose(): void }> = [];
  /** Vertex count of the (b) icosphere, for the report. */
  vertexCountB = 0;
  /** Set by the route to hear about state changes (merge done etc.). */
  onInfo: ((info: { blobs: number; merging: boolean }) => void) | null = null;

  async mount(ctx: SceneContext): Promise<void> {
    this.ctx = ctx;
    this.scene.background = new Color(INK);
    const uniforms = createBlobShadingUniforms();
    const o = this.options;
    const a = createRaymarchBlobMesh(this.blockA, {
      uniforms,
      quality: this.quality,
      coreBound: o.coreBound ?? false,
      ...(o.constantOctaves ? { constantOctaves: BLOB_QUALITY_HIGH.octaves } : {}),
      ...(o.constantSteps ? { constantSteps: BLOB_QUALITY_HIGH.steps } : {}),
    });
    const b = createJiggleBlobMesh(this.blockB, { uniforms, quality: this.quality, ...(o.constantOctaves ? { constantOctaves: BLOB_QUALITY_HIGH.octaves } : {}) });
    this.meshA = a.mesh;
    this.meshB = b.mesh;
    this.vertexCountB = b.vertexCount;
    this.scene.add(a.mesh, b.mesh);
    this.disposables.push(a.material, b.material, b.glyph, a.mesh.geometry, b.mesh.geometry);
    this.plateA = this.createPlate();
    this.plateB = this.createPlate();
    this.scene.add(this.plateA, this.plateB);
    this.rebuild();
    this.applyQuality();
    this.resize(ctx);
    await ctx.renderer.compileAsync(this.scene, this.camera);
  }

  resize(ctx: SceneContext): void {
    this.aspect = ctx.width / ctx.height;
    this.camera.aspect = this.aspect;
    this.placeCamera();
    this.applyPixelRatio(); // CanvasHost just reset the ratio to its MAX_DPR; re-apply the preset cap
  }

  /** Resolved quality preset. */
  get effectiveQuality(): 'high' | 'mobile' {
    return resolveQuality(this.settings.quality);
  }

  /** Backend, pixel ratio and canvas size for the bench table. */
  getRenderInfo(): RenderInfo | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const pr = ctx.renderer.getPixelRatio();
    return {
      backend: ctx.backend,
      options: this.options,
      pixelRatio: pr,
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      cssWidth: ctx.width,
      cssHeight: ctx.height,
      backingWidth: Math.round(ctx.width * pr),
      backingHeight: Math.round(ctx.height * pr),
      quality: this.effectiveQuality,
      candidate: this.settings.candidate,
      count: this.blobs.filter((b) => b.alive).length,
    };
  }

  private applyQuality(): void {
    applyBlobQuality(this.quality, this.effectiveQuality === 'mobile' ? BLOB_QUALITY_MOBILE : BLOB_QUALITY_HIGH);
    this.applyPixelRatio();
  }

  /** Mobil: cap the renderer pixel ratio for this lab only (restored in dispose / by the next CanvasHost mount). */
  private applyPixelRatio(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const target = this.effectiveQuality === 'mobile' ? Math.min(ctx.dpr, MOBILE_DPR_CAP) : ctx.dpr;
    if (Math.abs(ctx.renderer.getPixelRatio() - target) > 1e-3) {
      ctx.renderer.setPixelRatio(target);
      ctx.renderer.setSize(ctx.width, ctx.height, false);
    }
  }

  /** Applies settings from the React controls; structural changes rebuild the blob set. */
  apply(next: BlobLabSettings): void {
    const prev = this.settings;
    this.settings = { ...next };
    if (prev.driver !== next.driver) this.driver = next.driver === 'shape' ? new ShapeMatching({ particleCount: 20 }) : new SpringJiggle();
    if (prev.count !== next.count || prev.tier !== next.tier || prev.material !== next.material || prev.pose !== next.pose) this.rebuild();
    if (prev.candidate !== next.candidate || prev.pose !== next.pose) this.placeCamera();
    if (prev.quality !== next.quality) this.applyQuality();
    this.layoutPlates();
  }

  /** Random horizontal push on every blob, like a swipe that just stopped. */
  impulse(): void {
    const ang = Math.random() * Math.PI * 2;
    const dir: Vec3 = [Math.cos(ang), 0.15, Math.sin(ang)];
    for (const b of this.blobs) {
      if (!b.alive) continue;
      this.driver.impulse(b.id, dir, 0.9 + Math.random() * 0.3);
      b.jiggle = 1;
    }
  }

  /** Slides the second blob of a row into the first and plays the merge timeline. */
  mergeTwo(): boolean {
    if (this.merge) return false;
    const alive = this.blobs.filter((b) => b.alive);
    let pair: [BlobInstance, BlobInstance] | null = null;
    for (const a of alive) {
      const b = alive.find((o) => o !== a && o.cell[1] === a.cell[1] && o.cell[0] === a.cell[0] + 1);
      if (b) {
        pair = [a, b];
        break;
      }
    }
    if (!pair) {
      // Single blob: spawn a temporary partner next to it so the lab can still show the animation.
      const a = alive[0];
      if (!a) return false;
      const b = this.makeBlob(this.blobs.length, a.tier, [a.cell[0] + 1, a.cell[1]]);
      this.blobs.push(b);
      pair = [a, b];
    }
    const [a, b] = pair;
    const material = this.settings.material === 'auto' ? undefined : this.settings.material;
    const child = genomeFor(ZONE, a.tier + 1, a.seed, material);
    const timeline = new MergeTimeline(
      { params: this.paramsOf(a), center: this.restCenter(a), scale: scaleForTier(a.tier) },
      { params: this.paramsOf(b), center: this.restCenter(b), scale: scaleForTier(b.tier) },
      child,
      { viscosity: a.genome.viscosity, seed: a.seed },
    );
    this.merge = { a, b, child, timeline, t: 0 };
    this.driver.impulse(b.id, [-1, 0, 0], 0.6);
    return true;
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    this.time += dt;
    this.driver.step(dt);
    for (const b of this.blobs) b.jiggle = Math.max(0, b.jiggle - dt * 1.4);
    this.updateMerge(dt);
    this.writeBlocks();
    ctx.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    const ctx = this.ctx;
    if (ctx && Math.abs(ctx.renderer.getPixelRatio() - ctx.dpr) > 1e-3) {
      ctx.renderer.setPixelRatio(ctx.dpr);
      ctx.renderer.setSize(ctx.width, ctx.height, false);
    }
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.scene.clear();
  }

  // --- internals --------------------------------------------------------------------------------

  private get side(): number {
    return Math.round(Math.sqrt(this.settings.count));
  }

  private makeBlob(id: number, tier: number, cell: [number, number]): BlobInstance {
    const material = this.settings.material === 'auto' ? undefined : this.settings.material;
    const seed = id * 31 + 7;
    const genome = genomeFor(ZONE, tier, seed, material);
    this.driver.reset(id);
    this.driver.configure(id, { viscosity: genome.viscosity });
    return { id, tier, seed, genome, cell, phase: (id * 1.618) % (Math.PI * 2), jiggle: 0, alive: true };
  }

  private rebuild(): void {
    this.merge = null;
    this.blobs = [];
    const side = this.side;
    for (let i = 0; i < this.settings.count; i++) {
      this.blobs.push(this.makeBlob(i, this.settings.tier, [i % side, Math.floor(i / side)]));
    }
    for (let i = 0; i < CAPACITY; i++) {
      this.blockA.hide(i);
      this.blockB.hide(i);
    }
    this.layoutPlates();
    this.placeCamera();
    this.onInfo?.({ blobs: this.blobs.length, merging: false });
  }

  /** Genome plus the lab's global overrides. */
  private paramsOf(b: BlobInstance): BlobParams {
    const s = this.settings;
    if (s.sminK === null && s.noiseAmp === null && s.gloss === null && s.translucency === null) return b.genome;
    const p = cloneParams(b.genome);
    if (s.sminK !== null) p.sminK = s.sminK;
    if (s.noiseAmp !== null) p.noiseAmp = s.noiseAmp;
    if (s.gloss !== null) p.gloss = s.gloss;
    if (s.translucency !== null) p.translucency = s.translucency;
    return p;
  }

  /** Rest centre of a blob's local origin on the plate (object space of candidate a's plate). */
  private restCenter(b: BlobInstance, params = b.genome): Vec3 {
    const side = this.side;
    const scale = scaleForTier(b.tier);
    const floorY = params.floorY ?? NO_FLOOR;
    const y = floorY > NO_FLOOR ? -floorY * scale : scale;
    return [(b.cell[0] - (side - 1) / 2) * CELL, y, (b.cell[1] - (side - 1) / 2) * CELL];
  }

  private plateHalfWidth(): number {
    return (this.side * CELL) / 2 + CELL; // one full ring of cells around the board
  }

  /** X offset of candidate a / b plates: side by side in 'both' mode, centred otherwise. */
  private plateShift(which: 'a' | 'b'): number {
    if (this.settings.candidate !== 'both') return 0;
    const half = this.plateHalfWidth();
    return which === 'a' ? -(half + 0.3) : half + 0.3;
  }

  private layoutPlates(): void {
    const half = this.plateHalfWidth();
    const w = half * 2;
    for (const [plate, which] of [
      [this.plateA, 'a'],
      [this.plateB, 'b'],
    ] as const) {
      if (!plate) continue;
      plate.scale.set(w, 1, w);
      plate.position.set(this.plateShift(which), -0.15, 0);
      plate.visible = this.settings.candidate === 'both' || this.settings.candidate === which;
    }
    this.plateOffset.value = this.side % 2 === 0 ? 0 : 0.5;
  }

  private placeCamera(): void {
    const s = this.settings;
    const half = this.plateHalfWidth();
    let width = half * 2 + (s.candidate === 'both' ? half * 2 + 0.6 : 0);
    let depth = half * 2;
    let elev = 0.88; // radians above the plate: game-board view
    let target = new Vector3(0, 0.1, 0);
    if (s.pose === 'screenshot3') {
      width = 1.05;
      depth = 1.05;
      elev = 0.2;
      target = new Vector3(0, 0.33, 0);
    }
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.aspect);
    const distW = width / 2 / Math.tan(hFov / 2);
    const distH = (depth * Math.sin(elev) + 1.2) / 2 / Math.tan(vFov / 2);
    const dist = Math.max(distW, distH) * 1.08 + depth * 0.5;
    this.camera.position.set(target.x, target.y + Math.sin(elev) * dist, target.z + Math.cos(elev) * dist);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
  }

  private createPlate(): Mesh {
    const mat = new MeshBasicNodeMaterial();
    const offset = this.plateOffset;
    // Cells as value steps only (no lines): alternating inks plus a soft vignette toward the edges.
    mat.colorNode = Fn(() => {
      const p = positionWorld;
      const cell = floor(vec2(p.x, p.z).add(offset));
      const checker = mod(cell.x.add(cell.y), 2);
      const top = smoothstep(-0.2, 0.0, p.y);
      const base = mix(color('#0f1c23'), color('#1a2e36'), checker.mul(top));
      return mix(base, color('#0b151a'), float(1).sub(top).mul(0.7));
    })();
    const mesh = new Mesh(new BoxGeometry(1, 0.3, 1), mat);
    this.disposables.push(mat, mesh.geometry);
    return mesh;
  }

  private updateMerge(dt: number): void {
    const m = this.merge;
    if (!m) return;
    m.t += dt * 1000;
    if (m.t >= SLIDE_MS + MERGE_TOTAL_MS) {
      // Finish: A becomes the child, B disappears.
      m.a.genome = m.child;
      m.a.tier += 1;
      m.b.alive = false;
      this.driver.remove(m.b.id);
      this.driver.reset(m.a.id);
      this.driver.configure(m.a.id, { viscosity: m.child.viscosity });
      this.driver.impulse(m.a.id, [0, 1, 0], 0.5);
      m.a.jiggle = 1;
      this.merge = null;
      this.onInfo?.({ blobs: this.blobs.filter((b) => b.alive).length, merging: false });
    }
  }

  private writeBlocks(): void {
    const s = this.settings;
    const showA = s.candidate !== 'b';
    const showB = s.candidate !== 'a';
    const m = this.merge;
    const mergeT = m ? m.t - SLIDE_MS : -1;
    const frame = m && mergeT >= 0 ? m.timeline.sample(mergeT) : null;
    const mobile = this.effectiveQuality === 'mobile';
    const lodPx = LOD_PX[mobile ? 'mobile' : 'high'];
    // Projected size: device pixels per world unit at the blob's distance (perspective camera).
    const pr = this.ctx?.renderer.getPixelRatio() ?? 1;
    const pxPerUnitAt1 = ((this.ctx?.height ?? 800) * pr) / (2 * Math.tan((this.camera.fov * Math.PI) / 360));

    for (const b of this.blobs) {
      const slot = b.id;
      if (slot >= CAPACITY) continue;
      if (!b.alive) {
        this.blockA.hide(slot);
        this.blockB.hide(slot);
        continue;
      }
      const st = this.driver.get(b.id);
      let params = this.paramsOf(b);
      let center = this.restCenter(b, params);
      const scale = scaleForTier(b.tier);
      const dyn: BlobDynamics = {
        squash: { axis: st.axis, amount: st.amount, taper: params.squash.taper ?? 0 },
        jiggle: b.jiggle,
        phase: b.phase,
        seed: b.seed,
      };
      if (mobile) dyn.maxSpheres = MOBILE_MAX_SPHERES;
      let forceA = false;

      if (m && b === m.b) {
        if (frame) {
          this.blockA.hide(slot);
          this.blockB.hide(slot);
          continue;
        }
        // Pre-slide: B moves into A.
        const u = Math.min(1, m.t / SLIDE_MS);
        const ca = this.restCenter(m.a);
        center = [center[0] + (ca[0] - center[0]) * u * 0.6, center[1], center[2] + (ca[2] - center[2]) * u * 0.6];
        dyn.squash = { axis: [1, 0, 0], amount: 0.35 * (1 - u), taper: 0.55 };
      } else if (m && b === m.a && frame) {
        params = frame.params;
        dyn.boxHalf = frame.boxHalf;
        dyn.squash = frame.pop > 0 ? { axis: [0, 1, 0], amount: 0.35 * frame.pop, taper: 0 } : { axis: st.axis, amount: st.amount * 0.5, taper: 0 };
        forceA = true; // the blend window always raymarches, also for candidate (b)
      }

      // Keep the base on the plate while squashed: the floor point scales with the y-scale.
      const { along, across } = squashScales(dyn.squash?.amount ?? 0);
      const ay = dyn.squash?.axis[1] ?? 1;
      const sy = along * ay * ay + across * (1 - ay * ay);
      const floorY = params.floorY ?? NO_FLOOR;
      const baseY = floorY > NO_FLOOR ? -floorY * sy * scale : scale * sy;
      const off = st.offset;
      const offsetScale = 0.22;
      const y = baseY + Math.max(0, off[1]) * offsetScale;

      const placeA = { center: [center[0] + off[0] * offsetScale + this.plateShift('a'), y, center[2] + off[2] * offsetScale] as Vec3, scale };
      const placeB = { center: [center[0] + off[0] * offsetScale + this.plateShift('b'), y, center[2] + off[2] * offsetScale] as Vec3, scale };
      // Screen-size LOD: skip organs/bubbles when the blob is smaller than lodPx on screen.
      const dist = this.camera.position.distanceTo(new Vector3(placeA.center[0], placeA.center[1], placeA.center[2]));
      const projectedPx = (2 * scale * blobBoundingRadius(params) * pxPerUnitAt1) / Math.max(0.1, dist);
      dyn.detail = projectedPx >= lodPx ? 1 : 0;
      if (forceA) delete dyn.maxSpheres; // the merge union keeps all its spheres

      if (showA || forceA) {
        this.blockA.write(slot, params, forceA && !showA ? placeB : placeA, dyn);
      } else this.blockA.hide(slot);
      if (showB && !forceA) this.blockB.write(slot, params, placeB, dyn);
      else this.blockB.hide(slot);
      if (showA && showB && forceA) {
        // 'both': (b)'s copy of the merging blob also switches to the raymarch mesh.
        const extra = CAPACITY - 1;
        this.blockA.write(extra, params, placeB, dyn);
      }
    }
    if (this.meshA) this.meshA.count = showA || m ? CAPACITY : 0;
    if (this.meshB) this.meshB.count = showB ? this.blobs.length : 0;
  }
}
