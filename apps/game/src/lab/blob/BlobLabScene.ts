import { useAppStore } from '../../state/store';
import { BoxGeometry, Color, InstancedMesh, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Fn, color, float, floor, mix, mod, positionWorld, smoothstep, uniform, vec2 } from 'three/tsl';
import {
  boundingRadius as blobBoundingRadius,
  cloneParams,
  genomeFor,
  scaleForTier,
  squashScales,
  MATERIAL_KINDS,
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
  EARLE_TEST_STYLE,
  MERGE_TOTAL_MS,
  MergeTimeline,
  applyBlobQuality,
  createBlobParticleMesh,
  createBlobQualityUniforms,
  createBlobShadingUniforms,
  createFeatherCardMesh,
  createFurFinMesh,
  createFurShellMesh,
  createJiggleBlobMesh,
  createRaymarchBlobMesh,
  makePattern,
  type BlobDynamics,
  type BlobMaterialKind,
  type BlobRenderParams,
  type PatternKind,
  type RippleImpulse,
} from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';

export type Candidate = 'a' | 'b' | 'both';
export type BlobCount = 1 | 9 | 36;
export type DriverKind = 'spring' | 'shape';
export type LabPose = 'board' | 'topdown' | 'screenshot3' | 'close' | 'macro';
/** Sheet mode: every blob of the board shows a different pattern / material (review and screenshots). */
export type LabSheet = 'off' | 'patterns' | 'materials' | 'designer';
/** Hoch = full raymarch quality; Mobil = phone preset; Auto = Mobil on touch devices or DPR ≥ 2.5. */
export type Quality = 'high' | 'mobile' | 'auto';

export interface BlobLabSettings {
  candidate: Candidate;
  count: BlobCount;
  material: BlobMaterialKind | 'auto';
  tier: number;
  driver: DriverKind;
  pose: LabPose;
  quality: Quality;
  /** Overrides applied to every blob (null = genome value). */
  sminK: number | null;
  noiseAmp: number | null;
  gloss: number | null;
  translucency: number | null;
  /** P1b: pattern on every blob (colours from the per-pattern palette). */
  pattern: PatternKind;
  patternScale: number;
  patternContrast: number;
  /** 0..1 Earle stipple (lit band as dots). */
  stipple: number;
  /** 0..1 dotted rim. */
  rimDots: number;
  /** 0..1 species colours → body/world palette (patterns with a species coat). */
  recolor: number;
  /** "Earle-Test": dark lapis body with the diamond mosaic (colours from EARLE_TEST_STYLE). */
  earleTest: boolean;
  /** Extra passes (fur shells, feather cards) — only in the Hoch preset; Mobil always uses the single-pass looks. */
  passes: boolean;
  /** Sheet mode (overrides pattern/material per blob). */
  sheet: LabSheet;
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
  pattern: 'none',
  patternScale: 1,
  patternContrast: 0.8,
  stipple: 0,
  rimDots: 0,
  recolor: 0.25,
  earleTest: false,
  passes: true,
  sheet: 'off',
};

/** One entry of a sheet: material and/or pattern (plus look knobs) for blob i. */
interface SheetEntry {
  material?: BlobMaterialKind;
  pattern?: PatternKind;
  stipple?: number;
  rimDots?: number;
  earle?: boolean;
  /** Designer sheet: two eye slits turned a little upward (readable from the ~65° board camera). */
  twoEyes?: boolean;
  /** Matte opaque body (no organs/bubbles, little gloss) like the flat creatures of sketch 08. */
  matte?: boolean;
}

/** Patterns sheet (3×3): the six patterns, the Earle test, tiger with stipple, pure stipple + dotted rim. */
export const PATTERN_SHEET: readonly SheetEntry[] = [
  { pattern: 'tiger' },
  { pattern: 'giraffe' },
  { pattern: 'zebra' },
  { pattern: 'snake' },
  { pattern: 'spots' },
  { pattern: 'diamonds' },
  { pattern: 'diamonds', earle: true, stipple: 0.85, rimDots: 1 },
  { pattern: 'tiger', stipple: 0.7, rimDots: 0.8 },
  { pattern: 'none', stipple: 0.9, rimDots: 1 },
];

/** Materials sheet (3×3): six materials plus fur/feather/jelly with patterns. */
export const MATERIAL_SHEET: readonly SheetEntry[] = [
  { material: 'jelly' },
  { material: 'liquid' },
  { material: 'gas' },
  { material: 'fire' },
  { material: 'fur' },
  { material: 'feather' },
  { material: 'fur', pattern: 'tiger' },
  { material: 'feather', pattern: 'spots' },
  { material: 'jelly', pattern: 'giraffe' },
];

/** Designer sheet (3×3, sketch 08): species coats, fur, feathers and the classic patterns, eyes visible. */
export const DESIGNER_SHEET: readonly SheetEntry[] = [
  { pattern: 'giraffe', matte: true, twoEyes: true },
  { pattern: 'elephant', matte: true, twoEyes: true },
  { pattern: 'rex', matte: true, twoEyes: true },
  { material: 'fur', pattern: 'retriever', twoEyes: true },
  { material: 'fur', pattern: 'mouse', twoEyes: true },
  { material: 'feather', pattern: 'retriever', twoEyes: true },
  { pattern: 'tiger', matte: true, twoEyes: true },
  { pattern: 'spots', matte: true, twoEyes: true },
  { pattern: 'snake', matte: true, twoEyes: true },
];

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
  /** Impact ripple: seconds since the impulse (< 0 = none) and the impact direction. */
  rippleAge: number;
  rippleDir: Vec3;
}

interface MergeState {
  a: BlobInstance;
  b: BlobInstance;
  child: BlobParams;
  timeline: MergeTimeline;
  /** ms since the merge was triggered; B slides in during the first SLIDE_MS. */
  t: number;
}

interface BodySet {
  block: BlobParamBlock;
  body: InstancedMesh;
  fur: InstancedMesh;
  fins: InstancedMesh;
  finCards: number;
  finSilhouetteOnly: { value: number };
  feather: InstancedMesh;
  particles: InstancedMesh;
  cards: number;
  perBlob: number;
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
/** Ripples fade out after this many seconds (the wave envelope is ≈ 0 by then). */
const RIPPLE_MAX_AGE = 3;

export function resolveQuality(q: Quality): 'high' | 'mobile' {
  if (q !== 'auto') return q;
  // 'auto' folgt dem App-Governor (siehe canvas/qualityGovernor.ts)
  return useAppStore.getState().effectiveQuality === 'mobil' ? 'mobile' : 'high';
}

/** Genome material for a lab material choice (fur/feather bodies start from the jelly genome). */
export function genomeMaterialFor(m: BlobMaterialKind | 'auto'): MaterialKind | undefined {
  if (m === 'auto') return undefined;
  return (MATERIAL_KINDS as readonly string[]).includes(m) ? (m as MaterialKind) : 'jelly';
}

/** A/B switches for the raymarch shader, readable from the URL (`?core=1&oct=const&steps=const`). */
export interface BlobLabSceneOptions {
  /** Core-bound stepping in candidate (a). Default false. */
  coreBound?: boolean;
  /** Bake noise octaves (2) into both shaders instead of the quality uniform (Mobil then keeps 2). */
  constantOctaves?: boolean;
  /** Bake the step count (32) into (a) instead of the quality uniform (Mobil then keeps 32). */
  constantSteps?: boolean;
  /** Measure GPU time per frame with WebGPU timestamp queries (`?gpu=1`, always on in bench mode). */
  gpuTiming?: boolean;
}

export function sceneOptionsFromSearch(search: string): BlobLabSceneOptions {
  const p = new URLSearchParams(search);
  return { coreBound: p.get('core') === '1', constantOctaves: p.get('oct') === 'const', constantSteps: p.get('steps') === 'const', gpuTiming: p.get('gpu') === '1' || p.get('bench') === '1' };
}

/** Median of the last GPU frame times (ms) from timestamp queries; 0 when unsupported. */
class GpuTimer {
  enabled = false;
  private samples: number[] = [];
  private inFlight = false;

  enable(ctx: SceneContext): void {
    const backend = ctx.renderer.backend as unknown as { trackTimestamp?: boolean; hasFeature?: (n: string) => boolean };
    if (ctx.backend !== 'webgpu' || !backend.hasFeature?.('timestamp-query')) return;
    backend.trackTimestamp = true;
    this.enabled = true;
  }

  disable(ctx: SceneContext | null): void {
    if (!this.enabled || !ctx) return;
    (ctx.renderer.backend as unknown as { trackTimestamp?: boolean }).trackTimestamp = false;
    this.enabled = false;
  }

  /** Call after each render: resolves the frame's render-pass timestamps (one readback in flight). */
  sample(ctx: SceneContext): void {
    if (!this.enabled || this.inFlight) return;
    this.inFlight = true;
    ctx.renderer
      .resolveTimestampsAsync('render')
      .then((ms) => {
        if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) {
          this.samples.push(ms);
          if (this.samples.length > 240) this.samples.shift();
        }
      })
      .catch(() => {})
      .finally(() => {
        this.inFlight = false;
      });
  }

  reset(): void {
    this.samples = [];
  }

  median(): number {
    return this.percentile(0.5);
  }

  /** q-quantile of the recent samples (low quantiles are robust against other GPU load). */
  percentile(q: number): number {
    if (this.samples.length === 0) return 0;
    const s = [...this.samples].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * q))]!;
  }
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
 * P1b adds per block: fur shells, feather cards and the particle stream (wisps/embers/drips).
 */
export class BlobLabScene implements SceneController {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(32, 1, 0.1, 100);
  private settings: BlobLabSettings = { ...DEFAULT_BLOB_LAB_SETTINGS };
  constructor(readonly options: BlobLabSceneOptions = {}) {}
  private blobs: BlobInstance[] = [];
  private blockA = new BlobParamBlock(CAPACITY);
  private blockB = new BlobParamBlock(CAPACITY);
  private setA: BodySet | null = null;
  private setB: BodySet | null = null;
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
  /** Vertices of one fur instance (all shells) and shell count, for the report. */
  furShells = 0;
  furVertices = 0;
  /** Set by the route to hear about state changes (merge done etc.). */
  onInfo: ((info: { blobs: number; merging: boolean }) => void) | null = null;
  /** GPU frame time from timestamp queries (bench / `?gpu=1`). */
  readonly gpu = new GpuTimer();
  private pendingCost: { n: number; resolve: (ms: number) => void } | null = null;

  /**
   * Cost of one frame of the current scene: renders it `n` extra times inside the next frame and waits
   * for the GPU queue (`onSubmittedWorkDone`) — robust where pass timestamps are coarse or other GPU
   * load interferes (take the minimum of a few calls). WebGPU only; resolves 0 otherwise.
   */
  measureFrameCost(n = 30): Promise<number> {
    return new Promise((resolve) => {
      if (this.ctx?.backend !== 'webgpu') return resolve(0);
      this.pendingCost = { n, resolve };
    });
  }

  private runPendingCost(ctx: SceneContext): void {
    const job = this.pendingCost;
    if (!job) return;
    this.pendingCost = null;
    const device = (ctx.renderer.backend as unknown as { device?: { queue: { onSubmittedWorkDone(): Promise<void> } } }).device;
    if (!device) return job.resolve(0);
    void device.queue.onSubmittedWorkDone().then(() => {
      const t0 = performance.now();
      for (let i = 0; i < job.n; i++) ctx.renderer.render(this.scene, this.camera);
      void device.queue.onSubmittedWorkDone().then(() => job.resolve((performance.now() - t0) / job.n));
    });
  }

  async mount(ctx: SceneContext): Promise<void> {
    this.ctx = ctx;
    this.scene.background = new Color(INK);
    const uniforms = createBlobShadingUniforms();
    const o = this.options;
    const octaves = o.constantOctaves ? { constantOctaves: BLOB_QUALITY_HIGH.octaves } : {};
    const a = createRaymarchBlobMesh(this.blockA, {
      uniforms,
      quality: this.quality,
      coreBound: o.coreBound ?? false,
      ...octaves,
      ...(o.constantSteps ? { constantSteps: BLOB_QUALITY_HIGH.steps } : {}),
    });
    const b = createJiggleBlobMesh(this.blockB, { uniforms, quality: this.quality, ...octaves });
    this.vertexCountB = b.vertexCount;
    this.disposables.push(a.material, b.material, b.glyph, a.mesh.geometry, b.mesh.geometry);
    this.scene.add(a.mesh, b.mesh);
    this.setA = this.createPasses(this.blockA, a.mesh, uniforms, octaves);
    this.setB = this.createPasses(this.blockB, b.mesh, uniforms, octaves);
    this.plateA = this.createPlate();
    this.plateB = this.createPlate();
    this.scene.add(this.plateA, this.plateB);
    this.rebuild();
    this.applyQuality();
    this.resize(ctx);
    if (o.gpuTiming) this.gpu.enable(ctx);
    await ctx.renderer.compileAsync(this.scene, this.camera);
  }

  private createPasses(block: BlobParamBlock, body: InstancedMesh, uniforms: ReturnType<typeof createBlobShadingUniforms>, octaves: { constantOctaves?: number }): BodySet {
    const fur = createFurShellMesh(block, { uniforms, quality: this.quality, shells: 6, ...octaves });
    const fins = createFurFinMesh(block, { uniforms, quality: this.quality, ...octaves });
    const feather = createFeatherCardMesh(block, { uniforms, quality: this.quality, ...octaves });
    const particles = createBlobParticleMesh(block, { uniforms, quality: this.quality });
    this.furShells = fur.shells;
    this.furVertices = fur.vertexCount;
    this.disposables.push(fur.material, fur.mesh.geometry, fins.material, fins.mesh.geometry, feather.material, feather.mesh.geometry, particles.material, particles.mesh.geometry);
    this.scene.add(fur.mesh, fins.mesh, feather.mesh, particles.mesh);
    return { block, body, fur: fur.mesh, fins: fins.mesh, finCards: fins.cards, finSilhouetteOnly: fins.silhouetteOnly, feather: feather.mesh, particles: particles.mesh, cards: feather.cards, perBlob: particles.perBlob };
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

  /** Whether the extra passes (fur shells, feather cards) are drawn this frame. */
  get passesActive(): boolean {
    return this.settings.passes && this.effectiveQuality === 'high';
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
    if (prev.count !== next.count || prev.tier !== next.tier || prev.material !== next.material || prev.pose !== next.pose || prev.sheet !== next.sheet) this.rebuild();
    if (prev.candidate !== next.candidate || prev.pose !== next.pose) this.placeCamera();
    if (prev.quality !== next.quality) this.applyQuality();
    this.layoutPlates();
  }

  /** Random horizontal push on every blob, like a swipe that just stopped; also starts impact ripples. */
  impulse(): void {
    const ang = Math.random() * Math.PI * 2;
    const dir: Vec3 = [Math.cos(ang), 0.15, Math.sin(ang)];
    for (const b of this.blobs) {
      if (!b.alive) continue;
      this.driver.impulse(b.id, dir, 0.9 + Math.random() * 0.3);
      b.jiggle = 1;
      b.rippleAge = 0;
      b.rippleDir = [-dir[0], 0.25, -dir[2]];
    }
  }

  /** Impact ripples only (liquid v2): a tap on the front-facing flank of every blob. */
  ripple(): void {
    for (const b of this.blobs) {
      if (!b.alive) continue;
      const ang = (Math.random() - 0.5) * 1.6;
      b.rippleAge = 0;
      b.rippleDir = [Math.sin(ang), 0.15 + Math.random() * 0.4, Math.cos(ang)];
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
    const child = genomeFor(ZONE, a.tier + 1, a.seed, genomeMaterialFor(this.settings.material));
    // The timeline works on genome materials; fur/feather stay a dynamics override during the merge.
    const blobParamsOf = (x: BlobInstance): BlobParams => ({ ...this.paramsOf(x), material: x.genome.material });
    const timeline = new MergeTimeline(
      { params: blobParamsOf(a), center: this.restCenter(a), scale: scaleForTier(a.tier) },
      { params: blobParamsOf(b), center: this.restCenter(b), scale: scaleForTier(b.tier) },
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
    for (const b of this.blobs) {
      b.jiggle = Math.max(0, b.jiggle - dt * 1.4);
      if (b.rippleAge >= 0) {
        b.rippleAge += dt;
        if (b.rippleAge > RIPPLE_MAX_AGE) b.rippleAge = -1;
      }
    }
    this.updateMerge(dt);
    this.writeBlocks();
    ctx.renderer.render(this.scene, this.camera);
    this.gpu.sample(ctx);
    this.runPendingCost(ctx);
  }

  dispose(): void {
    const ctx = this.ctx;
    this.gpu.disable(ctx);
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

  /** Effective body material of the lab (null = genome material by tier). */
  private get materialOverride(): BlobMaterialKind | null {
    return this.settings.material === 'auto' ? null : this.settings.material;
  }

  private sheetEntry(b: BlobInstance): SheetEntry | null {
    const s = this.settings.sheet;
    if (s === 'off') return null;
    const list = s === 'patterns' ? PATTERN_SHEET : s === 'designer' ? DESIGNER_SHEET : MATERIAL_SHEET;
    return list[b.id % list.length] ?? null;
  }

  /** Material of one blob: sheet entry → lab override → genome. */
  private materialOf(b: BlobInstance): BlobMaterialKind | null {
    return this.sheetEntry(b)?.material ?? this.materialOverride;
  }

  private makeBlob(id: number, tier: number, cell: [number, number]): BlobInstance {
    const seed = id * 31 + 7;
    const list = this.settings.sheet === 'materials' ? MATERIAL_SHEET : this.settings.sheet === 'designer' ? DESIGNER_SHEET : null;
    const m = list?.[id % list.length]?.material ?? this.settings.material;
    const genome = genomeFor(ZONE, tier, seed, genomeMaterialFor(m));
    this.driver.reset(id);
    this.driver.configure(id, { viscosity: genome.viscosity });
    return { id, tier, seed, genome, cell, phase: (id * 1.618) % (Math.PI * 2), jiggle: 0, alive: true, rippleAge: -1, rippleDir: [0, 0, 1] };
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

  /** Genome plus the lab's global overrides, pattern and Earle-Test colours. */
  private paramsOf(b: BlobInstance): BlobRenderParams {
    const s = this.settings;
    const p: BlobRenderParams = cloneParams(b.genome);
    if (s.sminK !== null) p.sminK = s.sminK;
    if (s.noiseAmp !== null) p.noiseAmp = s.noiseAmp;
    if (s.gloss !== null) p.gloss = s.gloss;
    if (s.translucency !== null) p.translucency = s.translucency;
    const entry = this.sheetEntry(b);
    const material = this.materialOf(b);
    if (material) p.material = material;
    if (material === 'fur' || material === 'feather') {
      // Opaque, matte bodies: no organs, no bubbles, hardly any gloss.
      if (s.gloss === null) p.gloss = material === 'feather' ? 0.35 : 0.1;
      if (s.translucency === null) p.translucency = 0;
      p.bubbleDensity = 0;
    }
    if (entry?.matte && !material) {
      if (s.gloss === null) p.gloss = 0.3;
      if (s.translucency === null) p.translucency = 0.05;
      p.bubbleDensity = 0;
    }
    if (entry?.twoEyes) {
      const d = p.eye.dir;
      const up: Vec3 = [d[0] * 0.5, d[1] + 0.2, d[2]];
      const l = Math.hypot(up[0], up[1], up[2]) || 1;
      p.eye = { ...p.eye, dir: [up[0] / l, up[1] / l, up[2] / l], spacing: p.eye.spacing > 0 ? p.eye.spacing : 0.25, size: Math.min(p.eye.size, 0.3) };
    }
    const earle = entry ? entry.earle === true : s.earleTest;
    if (earle) {
      p.baseColor = EARLE_TEST_STYLE.baseColor;
      p.innerColor = EARLE_TEST_STYLE.innerColor;
      p.rimColor = EARLE_TEST_STYLE.rimColor;
      p.highlightColor = EARLE_TEST_STYLE.highlightColor;
      p.bubbleColor = EARLE_TEST_STYLE.bubbleColor;
      if (s.gloss === null) p.gloss = EARLE_TEST_STYLE.gloss;
      if (s.translucency === null) p.translucency = EARLE_TEST_STYLE.translucency;
      p.bubbleDensity = EARLE_TEST_STYLE.bubbleDensity;
    }
    // rimDots 0 = "material default" (fur/feather get their dotted rim), > 0 overrides.
    const rim = entry ? entry.rimDots : s.rimDots > 0 ? s.rimDots : undefined;
    const overrides = { scale: s.patternScale, contrast: s.patternContrast, recolor: s.recolor, stipple: entry?.stipple ?? (entry ? 0 : s.stipple), ...(rim !== undefined ? { rimDots: rim } : {}) };
    const kind = entry ? (entry.pattern ?? 'none') : s.pattern;
    p.pattern = earle && kind === 'diamonds' ? { ...EARLE_TEST_STYLE.pattern, ...overrides } : makePattern(kind, p.baseColor, overrides);
    return p;
  }

  /** Rest centre of a blob's local origin on the plate (object space of candidate a's plate). */
  private restCenter(b: BlobInstance, params: BlobParams | BlobRenderParams = b.genome): Vec3 {
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
    if (s.pose === 'macro') {
      width = 1.05;
      depth = 1.05;
      elev = 0.3;
      target = new Vector3(0.05, 0.62, 0);
    } else if (s.pose === 'close') {
      width = 1.7;
      depth = 1.7;
      elev = 0.32;
      target = new Vector3(0, 0.45, 0);
    } else if (s.pose === 'topdown') {
      // ≈ 65°: the new, more top-down board camera, framed on the bodies (1 blob = top-down close-up).
      elev = 1.134;
      width = this.side * CELL + 0.2 + (s.candidate === 'both' ? half * 2 + 0.6 : 0);
      depth = this.side * CELL + 0.2;
      target = new Vector3(0, 0.25, 0);
    } else if (s.pose === 'screenshot3') {
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
      m.a.rippleAge = 0;
      m.a.rippleDir = [0, 1, 0];
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
      let params: BlobRenderParams = this.paramsOf(b);
      let center = this.restCenter(b, params);
      const scale = scaleForTier(b.tier);
      const ripple: RippleImpulse | undefined = b.rippleAge >= 0 ? { dir: b.rippleDir, age: b.rippleAge, strength: 1 } : undefined;
      const dyn: BlobDynamics = {
        squash: { axis: st.axis, amount: st.amount, taper: params.squash.taper ?? 0 },
        jiggle: b.jiggle,
        phase: b.phase,
        seed: b.seed,
        ripple,
      };
      const blobMaterial = this.materialOf(b);
      if (blobMaterial) dyn.material = blobMaterial;
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
        params = { ...frame.params, pattern: params.pattern };
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
    const passes = this.passesActive;
    const mats = new Set(this.blobs.filter((b) => b.alive).map((b) => this.materialOf(b) ?? b.genome.material));
    const furOn = passes && mats.has('fur');
    // Fur fins: Hoch = silhouette tufts + inner locks, Mobil = silhouette tufts only (always on for fur).
    const finsOn = mats.has('fur');
    const featherOn = passes && mats.has('feather');
    const particlesOn = mats.has('gas') || mats.has('fire') || mats.has('liquid');
    const setA = this.setA;
    const setB = this.setB;
    if (setA) {
      const on = showA || m !== null;
      setA.body.count = on ? CAPACITY : 0;
      setA.fur.count = on && furOn ? CAPACITY : 0;
      setA.fins.count = on && finsOn ? CAPACITY * setA.finCards : 0;
      setA.finSilhouetteOnly.value = passes ? 0 : 1;
      setA.feather.count = on && featherOn ? CAPACITY * setA.cards : 0;
      setA.particles.count = on && particlesOn ? CAPACITY * setA.perBlob : 0;
    }
    if (setB) {
      const n = showB ? this.blobs.length : 0;
      setB.body.count = n;
      setB.fur.count = furOn ? n : 0;
      setB.fins.count = finsOn ? n * setB.finCards : 0;
      setB.finSilhouetteOnly.value = passes ? 0 : 1;
      setB.feather.count = featherOn ? n * setB.cards : 0;
      setB.particles.count = particlesOn ? n * setB.perBlob : 0;
    }
  }
}
