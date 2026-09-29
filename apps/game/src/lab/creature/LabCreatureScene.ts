import { BoxGeometry, Color, InstancedMesh, Mesh, PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Fn, color, float, floor, mix, mod, positionWorld, smoothstep, time, uniform, vec2 } from 'three/tsl';
import {
  NO_FLOOR,
  creatureGenome,
  describeInheritance,
  inherit,
  resolveCreature,
  squashScales,
  type BlobParams,
  type CreatureGenome,
  type CreatureSpec,
  type GenomeRules,
  type SlotId,
  type Vec3,
  type Verb,
  type ZoneId,
} from '@ee/genome';
import { SpringJiggle } from '@ee/physics';
import {
  BLOB_QUALITY_HIGH,
  BLOB_QUALITY_MOBILE,
  BlobParamBlock,
  CREATURE_MERGE_TOTAL_MS,
  MERGE_BLEND_MS,
  CreatureMergeChoreo,
  CreaturePool,
  MERGE_TOTAL_MS,
  MergeTimeline,
  ModuleLibrary,
  applyBlobQuality,
  createBlobQualityUniforms,
  createBlobShadingUniforms,
  createJiggleBlobMesh,
  createRaymarchBlobMesh,
  type BlobDynamics,
  type CreatureRig,
  type PartOverride,
} from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { useAppStore } from '../../state/store';
import { BUNDLED_RULES, MODULE_URLS } from './content';

export type LabMode = 'single' | 'gallery' | 'grid' | 'merge';
export type BodyCandidate = 'a' | 'b';
export type Quality = 'high' | 'mobile' | 'auto';

export interface CreatureLabSettings {
  mode: LabMode;
  zone: ZoneId;
  /** 1..12 */
  tier: number;
  seed: number;
  candidate: BodyCandidate;
  quality: Quality;
  hiddenSlots: SlotId[];
  /** Per-part overrides (single mode sliders). */
  overrides: Record<string, PartOverride>;
}

export const DEFAULT_CREATURE_LAB_SETTINGS: CreatureLabSettings = {
  mode: 'single',
  zone: 'tjorizo',
  tier: 4,
  seed: 7,
  candidate: 'b',
  quality: 'auto',
  hiddenSlots: [],
  overrides: {},
};

export interface CreatureLabInfo {
  creatures: number;
  parts: number;
  partDrawCalls: number;
  modules: number;
  missing: string[];
  merging: boolean;
  inheritance: string[];
  /** Parts of the first creature (for the per-part sliders). */
  partIds: Array<{ id: string; label: string; theta: number; phi: number; scale: number; tint: string | null }>;
  /** CPU time of the socket/rig update per frame (ms, smoothed). */
  rigMs: number;
}

interface LabCreature {
  id: number;
  genome: CreatureGenome;
  spec: CreatureSpec;
  rig: CreatureRig;
  /** Ground contact point (world x, z). */
  at: [number, number];
  /** Slides `at` toward this point (post-merge line-up). */
  target: [number, number] | null;
  phase: number;
  jiggle: number;
  alive: boolean;
  role: 'A' | 'B' | 'child' | null;
}

interface MergeState {
  a: LabCreature;
  b: LabCreature;
  child: LabCreature;
  timeline: MergeTimeline;
  choreo: CreatureMergeChoreo;
  t: number;
}

const CAPACITY = 40;
const SLIDE_MS = 140;
/** Length of the whole merge (B's slide + body timeline + part settle) for the lab's scrub slider. */
export const MERGE_SCRUB_MAX_MS = SLIDE_MS + CREATURE_MERGE_TOTAL_MS;
const INK = '#0f1c22';
const MOBILE_DPR_CAP = 1.5;
const MOBILE_MAX_SPHERES = 5;

export function resolveQuality(q: Quality): 'high' | 'mobile' {
  if (q !== 'auto') return q;
  return useAppStore.getState().effectiveQuality === 'mobil' ? 'mobile' : 'high';
}

/**
 * P4 Genom-Lab scene: creatures = body (candidate b jiggle mesh, or a raymarch for the hero view) +
 * modular accessories on SDF sockets. Modes: one creature close up, the tier gallery 1–8, a 6×6 grid
 * of tier-4 creatures (cost check) and a merge stage (parents A/B → child with inherited genes).
 */
export class LabCreatureScene implements SceneController {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(32, 1, 0.1, 100);
  onInfo: ((info: CreatureLabInfo) => void) | null = null;
  private settings: CreatureLabSettings = { ...DEFAULT_CREATURE_LAB_SETTINGS };
  private rules: GenomeRules;
  private readonly library = new ModuleLibrary(MODULE_URLS);
  private readonly uniforms = createBlobShadingUniforms();
  private readonly quality = createBlobQualityUniforms();
  private readonly blockA = new BlobParamBlock(CAPACITY);
  private readonly blockB = new BlobParamBlock(CAPACITY);
  private meshA: InstancedMesh | null = null;
  private meshB: InstancedMesh | null = null;
  private pool: CreaturePool | null = null;
  private plate: Mesh | null = null;
  private readonly plateOffset = uniform(0.5);
  private readonly driver = new SpringJiggle();
  private creatures: LabCreature[] = [];
  private merge: MergeState | null = null;
  private ctx: SceneContext | null = null;
  private aspect = 1;
  private nextId = 0;
  private rigMs = 0;
  private infoTimer = 0;
  private inheritance: string[] = [];
  private loaded = false;
  private readonly gaze = new Vector3();
  private gazeActive = false;
  private readonly raycaster = new Raycaster();
  private readonly disposables: Array<{ dispose(): void }> = [];

  /** 'lab': the controls sheet covers the lower part of the canvas; 'editor': the preview is its own row. */
  private readonly framing: 'lab' | 'editor';

  constructor(opts: { rules?: GenomeRules; framing?: 'lab' | 'editor' } = {}) {
    this.rules = opts.rules ?? BUNDLED_RULES;
    this.framing = opts.framing ?? 'lab';
  }

  async mount(ctx: SceneContext): Promise<void> {
    this.ctx = ctx;
    this.scene.background = new Color(INK);
    const a = createRaymarchBlobMesh(this.blockA, { uniforms: this.uniforms, quality: this.quality });
    const b = createJiggleBlobMesh(this.blockB, { uniforms: this.uniforms, quality: this.quality });
    this.meshA = a.mesh;
    this.meshB = b.mesh;
    this.scene.add(a.mesh, b.mesh);
    this.disposables.push(a.material, b.material, b.glyph, a.mesh.geometry, b.mesh.geometry);
    this.plate = this.createPlate();
    this.scene.add(this.plate);
    this.pool = new CreaturePool(this.library, this.uniforms, { capacity: 512 });
    this.scene.add(this.pool.group);
    await this.library.loadAll();
    this.loaded = true;
    this.rebuild();
    this.applyQuality();
    this.resize(ctx);
    // Pre-warm both body pipelines (the merge blend always raymarches, whatever the candidate) so the
    // first merge does not stall on a shader compile; hidden instances keep the frame empty.
    a.mesh.count = 1;
    b.mesh.count = 1;
    await ctx.renderer.compileAsync(this.scene, this.camera);
    a.mesh.count = 0;
    b.mesh.count = 0;
  }

  resize(ctx: SceneContext): void {
    this.aspect = ctx.width / ctx.height;
    this.camera.aspect = this.aspect;
    this.placeCamera();
    this.applyPixelRatio();
  }

  get effectiveQuality(): 'high' | 'mobile' {
    return resolveQuality(this.settings.quality);
  }

  /** Editors push edited rules here; creatures are re-resolved live. */
  setRules(rules: GenomeRules): void {
    this.rules = rules;
    if (this.loaded) this.rebuild();
  }

  apply(next: CreatureLabSettings): void {
    const prev = this.settings;
    this.settings = { ...next, hiddenSlots: [...next.hiddenSlots], overrides: { ...next.overrides } };
    const structural = prev.mode !== next.mode || prev.zone !== next.zone || prev.tier !== next.tier || prev.seed !== next.seed;
    if (structural && this.loaded) this.rebuild();
    if (prev.candidate !== next.candidate) this.placeCamera();
    if (prev.quality !== next.quality) this.applyQuality();
    this.applyOverrides();
  }

  trigger(verb: Verb): void {
    if (verb === 'gaze') {
      // No pointer needed: the eyes follow a point circling in front of the creatures for a while.
      this.gazeDemo = 4;
      return;
    }
    for (const c of this.creatures) if (c.alive) c.rig.trigger(verb, 1);
  }

  /** Seconds left of the "Blick" demo (a wandering gaze target). */
  private gazeDemo = 0;
  private gazeDemoT = 0;

  private updateGazeDemo(dt: number): void {
    if (this.gazeDemo <= 0) return;
    this.gazeDemo -= dt;
    this.gazeDemoT += dt;
    if (this.gazeDemo <= 0 && !this.gazeActive) {
      for (const c of this.creatures) c.rig.gazeTarget = null;
      return;
    }
    if (this.gazeActive) return; // a real pointer wins
    const r = 1.2 + this.extent().width * 0.3;
    this.gaze.set(Math.cos(this.gazeDemoT * 1.7) * r, 0.5 + Math.sin(this.gazeDemoT * 2.3) * 0.4, Math.abs(Math.sin(this.gazeDemoT * 1.1)) * r + 0.6);
    for (const c of this.creatures) c.rig.gazeTarget = this.gaze;
  }

  /** Poke every creature (button) — or one under the pointer via `pokeAt`. */
  poke(): void {
    for (const c of this.creatures) if (c.alive) this.pokeCreature(c, [Math.random() - 0.5, 0.2, Math.random() - 0.5]);
  }

  /** Pointer in NDC: gaze target on the eye plane; null clears it. */
  setPointer(ndc: { x: number; y: number } | null): void {
    if (!ndc) {
      this.gazeActive = false;
      for (const c of this.creatures) c.rig.gazeTarget = null;
      return;
    }
    const hit = this.pointOnPlane(ndc, 0.45);
    if (!hit) return;
    this.gaze.copy(hit);
    this.gazeActive = true;
    for (const c of this.creatures) c.rig.gazeTarget = this.gaze;
  }

  /** Click/tap: pokes the nearest creature (within its cell). */
  pokeAt(ndc: { x: number; y: number }): boolean {
    const hit = this.pointOnPlane(ndc, 0.2);
    if (!hit) return false;
    let best: LabCreature | null = null;
    let bestD = Infinity;
    for (const c of this.creatures) {
      if (!c.alive) continue;
      const d = Math.hypot(c.at[0] - hit.x, c.at[1] - hit.z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (!best || bestD > 0.9 * Math.max(0.5, best.spec.worldScale * 2.2)) return false;
    const dir: Vec3 = [hit.x - best.at[0], 0.25, hit.z - best.at[1]];
    this.pokeCreature(best, dir);
    return true;
  }

  /** Merge mode: B slides into A, bodies blend (MergeTimeline), parts detach/re-attach (choreo). */
  mergeParents(): boolean {
    if (this.merge || this.settings.mode !== 'merge' || !this.pool) return false;
    const a = this.creatures.find((c) => c.role === 'A' && c.alive);
    const b = this.creatures.find((c) => c.role === 'B' && c.alive);
    if (!a || !b) return false;
    const childGenome = inherit(a.genome, b.genome, this.rules);
    const childSpec = resolveCreature(childGenome, this.rules);
    const child: LabCreature = {
      id: this.nextId++,
      genome: childGenome,
      spec: childSpec,
      rig: this.pool.createRig(childSpec),
      at: [a.at[0], a.at[1]],
      target: null,
      phase: a.phase,
      jiggle: 0,
      alive: false, // body hidden until the pop; parts driven by the choreography
      role: 'child',
    };
    child.rig.hiddenSlots.clear();
    for (const s of this.settings.hiddenSlots) child.rig.hiddenSlots.add(s);
    this.creatures.push(child);
    const timeline = new MergeTimeline(
      { params: a.spec.body, center: this.restCenter(a), scale: a.spec.worldScale },
      { params: b.spec.body, center: this.restCenter(b), scale: b.spec.worldScale },
      childSpec.body,
      { viscosity: a.spec.body.viscosity, seed: this.settings.seed },
    );
    const choreo = new CreatureMergeChoreo(a.rig, b.rig, child.rig, { seed: this.settings.seed });
    this.merge = { a, b, child, timeline, choreo, t: 0 };
    this.mergeScrub = null;
    this.driver.impulse(b.id, [-1, 0, 0], 0.6);
    this.inheritance = describeInheritance(childSpec, a.spec, b.spec);
    this.emitInfo();
    return true;
  }

  /** Freezes the running merge at `ms` (0 … MERGE_SCRUB_MAX_MS) for inspection; null resumes. */
  setMergeScrub(ms: number | null): void {
    this.mergeScrub = ms;
  }
  private mergeScrub: number | null = null;

  /** Puts the merge stage back to two fresh parents. */
  resetMerge(): void {
    this.merge = null;
    this.inheritance = [];
    this.rebuild();
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    this.driver.step(dt);
    const slide = 1 - Math.exp(-dt * 7);
    for (const c of this.creatures) {
      c.jiggle = Math.max(0, c.jiggle - dt * 1.4);
      if (c.target) {
        c.at[0] += (c.target[0] - c.at[0]) * slide;
        c.at[1] += (c.target[1] - c.at[1]) * slide;
        if (Math.hypot(c.target[0] - c.at[0], c.target[1] - c.at[1]) < 1e-3) c.target = null;
      }
    }
    this.updateMerge(dt);
    this.updateGazeDemo(dt);
    // The body shaders read the TSL `time` uniform, which the renderer advances by this frame's delta
    // during render — sockets must be traced at the value the GPU is about to use.
    const gpuTime = time.value + dt;
    this.writeBodies(gpuTime);
    const t0 = performance.now();
    for (const c of this.creatures) c.rig.update(dt);
    this.pool?.commit();
    const ms = performance.now() - t0;
    this.rigMs = this.rigMs === 0 ? ms : this.rigMs * 0.9 + ms * 0.1;
    ctx.renderer.render(this.scene, this.camera);
    this.infoTimer += dt;
    if (this.infoTimer > 0.5) {
      this.infoTimer = 0;
      this.emitInfo();
    }
  }

  dispose(): void {
    const ctx = this.ctx;
    if (ctx && Math.abs(ctx.renderer.getPixelRatio() - ctx.dpr) > 1e-3) {
      ctx.renderer.setPixelRatio(ctx.dpr);
      ctx.renderer.setSize(ctx.width, ctx.height, false);
    }
    for (const c of this.creatures) c.rig.dispose();
    this.creatures = [];
    this.pool?.dispose();
    this.pool = null;
    this.library.dispose();
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.scene.clear();
  }

  // --- internals --------------------------------------------------------------------------------

  private pointOnPlane(ndc: { x: number; y: number }, y: number): Vector3 | null {
    this.raycaster.setFromCamera(new Vector2(ndc.x, ndc.y), this.camera);
    const plane = new Plane(new Vector3(0, 1, 0), -y);
    const out = new Vector3();
    return this.raycaster.ray.intersectPlane(plane, out) ? out : null;
  }

  private pokeCreature(c: LabCreature, dir: Vec3): void {
    this.driver.impulse(c.id, dir, 0.8 + 0.4 * c.spec.personality.squashHardness);
    c.jiggle = 1;
    c.rig.poke(1);
  }

  private applyQuality(): void {
    applyBlobQuality(this.quality, this.effectiveQuality === 'mobile' ? BLOB_QUALITY_MOBILE : BLOB_QUALITY_HIGH);
    this.applyPixelRatio();
  }

  private applyPixelRatio(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const target = this.effectiveQuality === 'mobile' ? Math.min(ctx.dpr, MOBILE_DPR_CAP) : ctx.dpr;
    if (Math.abs(ctx.renderer.getPixelRatio() - target) > 1e-3) {
      ctx.renderer.setPixelRatio(target);
      ctx.renderer.setSize(ctx.width, ctx.height, false);
    }
  }

  private applyOverrides(): void {
    const s = this.settings;
    for (const c of this.creatures) {
      c.rig.hiddenSlots.clear();
      for (const slot of s.hiddenSlots) c.rig.hiddenSlots.add(slot);
      if (c === this.creatures[0]) {
        c.rig.overrides.clear();
        for (const [id, ov] of Object.entries(s.overrides)) c.rig.overrides.set(id, ov);
        c.rig.overrideVersion++;
      }
    }
  }

  private makeCreature(genome: CreatureGenome, at: [number, number], role: LabCreature['role'] = null): LabCreature {
    const spec = resolveCreature(genome, this.rules);
    const id = this.nextId++;
    this.driver.reset(id);
    this.driver.configure(id, { viscosity: spec.body.viscosity });
    const rig = this.pool!.createRig(spec);
    return { id, genome, spec, rig, at, target: null, phase: (id * 1.618) % (Math.PI * 2), jiggle: 0, alive: true, role };
  }

  private rebuild(): void {
    if (!this.pool) return;
    this.merge = null;
    for (const c of this.creatures) c.rig.dispose();
    this.creatures = [];
    const s = this.settings;
    switch (s.mode) {
      case 'single':
        this.creatures.push(this.makeCreature(creatureGenome(s.zone, s.tier, s.seed), [0, 0]));
        break;
      case 'gallery': {
        let x = 0;
        const specs: Array<{ genome: CreatureGenome; w: number }> = [];
        for (let t = 1; t <= 8; t++) {
          const genome = creatureGenome(s.zone, t, s.seed);
          const w = resolveCreature(genome, this.rules).worldScale * 2.6 + 0.25;
          specs.push({ genome, w });
        }
        const total = specs.reduce((acc, e) => acc + e.w, 0);
        x = -total / 2;
        for (const e of specs) {
          this.creatures.push(this.makeCreature(e.genome, [x + e.w / 2, 0]));
          x += e.w;
        }
        break;
      }
      case 'grid':
        for (let i = 0; i < 36; i++) {
          this.creatures.push(this.makeCreature(creatureGenome(s.zone, 4, s.seed + i * 13), [(i % 6) - 2.5, Math.floor(i / 6) - 2.5]));
        }
        break;
      case 'merge':
        this.creatures.push(this.makeCreature(creatureGenome(s.zone, s.tier, s.seed), [-0.8, 0], 'A'));
        this.creatures.push(this.makeCreature(creatureGenome(s.zone, s.tier, s.seed + 1), [0.8, 0], 'B'));
        break;
    }
    for (let i = 0; i < CAPACITY; i++) {
      this.blockA.hide(i);
      this.blockB.hide(i);
    }
    this.applyOverrides();
    this.layoutPlate();
    this.placeCamera();
    this.emitInfo();
  }

  private restCenter(c: LabCreature, params = c.spec.body): Vec3 {
    const scale = c.spec.worldScale;
    const floorY = params.floorY ?? NO_FLOOR;
    const y = floorY > NO_FLOOR ? -floorY * scale : scale;
    return [c.at[0], y, c.at[1]];
  }

  private extent(): { width: number; depth: number } {
    switch (this.settings.mode) {
      case 'single': {
        const s = this.creatures[0]?.spec.worldScale ?? 0.4;
        return { width: s * 4.6 + 0.3, depth: s * 3.6 + 0.3 };
      }
      case 'gallery': {
        const xs = this.creatures.map((c) => c.at[0]);
        const w = (Math.max(...xs, 0) - Math.min(...xs, 0)) + 1.6;
        return { width: w, depth: 1.6 };
      }
      case 'grid':
        return { width: 7, depth: 7 };
      case 'merge':
        return { width: 3.6, depth: 1.6 };
    }
  }

  private layoutPlate(): void {
    if (!this.plate) return;
    const { width, depth } = this.extent();
    this.plate.scale.set(Math.max(width, 2), 1, Math.max(depth, 2));
    this.plate.position.set(0, -0.15, 0);
    this.plateOffset.value = 0.5;
  }

  private placeCamera(): void {
    const { width, depth } = this.extent();
    const mode = this.settings.mode;
    const s = this.creatures[0]?.spec.worldScale ?? 0.4;
    const maxS = this.creatures.reduce((m, c) => Math.max(m, c.spec.worldScale), s);
    const elev = mode === 'grid' ? 0.88 : mode === 'single' ? 0.3 : 0.42;
    // Creature height incl. parts (crest/horns stick out ≈ one body radius).
    const height = mode === 'grid' ? 1.2 : maxS * 3.8 + 0.4;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const tanV = Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(tanV * this.aspect);
    const distW = width / 2 / Math.tan(hFov / 2);
    const distH = (depth * Math.sin(elev) + height) / 2 / tanV;
    const dist = Math.max(distW, distH) * 1.08 + depth * 0.35;
    // The controls sheet covers the lower ~40 % of the screen: look a bit below the body centre so the
    // creature sits in the upper part of the view.
    const centreY = mode === 'grid' ? 0.1 : maxS * 1.3;
    const lower = this.framing === 'editor' ? 0.08 : 0.22;
    const target = new Vector3(0, mode === 'grid' ? centreY : centreY - lower * dist * tanV, 0);
    this.camera.position.set(target.x, target.y + Math.sin(elev) * dist, target.z + Math.cos(elev) * dist);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
  }

  private createPlate(): Mesh {
    const mat = new MeshBasicNodeMaterial();
    const offset = this.plateOffset;
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
    // Scrubbing never completes the merge (the completion is irreversible); releasing resumes from there.
    if (this.mergeScrub !== null) m.t = Math.min(this.mergeScrub, SLIDE_MS + MERGE_TOTAL_MS - 1);
    else m.t += dt * 1000;
    const tChoreo = m.t - SLIDE_MS;
    if (tChoreo >= 0) m.choreo.sample(tChoreo);
    if (tChoreo >= MERGE_TOTAL_MS && !m.child.alive) {
      // Body pop done: the child takes over A's slot with a landing squash.
      m.child.alive = true;
      m.child.at = [m.a.at[0], m.a.at[1]];
      this.driver.reset(m.child.id);
      this.driver.configure(m.child.id, { viscosity: m.child.spec.body.viscosity });
      this.driver.impulse(m.child.id, [0, 1, 0], 0.5);
      m.child.jiggle = 1;
    }
    if (m.choreo.done) {
      // Springs settled: the parents come back at the sides so A, child and B can be compared.
      m.child.target = [0, 0];
      m.a.target = [-1.35, 0.1];
      m.b.at = [1.6, 0.1];
      m.b.target = [1.35, 0.1];
      m.a.rig.clearChoreo();
      m.b.rig.clearChoreo();
      this.driver.reset(m.a.id);
      this.driver.reset(m.b.id);
      this.merge = null;
      this.emitInfo();
    }
  }

  private writeBodies(gpuTime: number): void {
    const s = this.settings;
    const showA = s.candidate === 'a';
    const mobile = this.effectiveQuality === 'mobile';
    const octaves = mobile ? BLOB_QUALITY_MOBILE.octaves : BLOB_QUALITY_HIGH.octaves;
    const m = this.merge;
    const mergeT = m ? m.t - SLIDE_MS : -1;
    const frame = m && mergeT >= 0 ? m.timeline.sample(mergeT) : null;
    let slot = 0;
    for (const c of this.creatures) {
      const isChildPending = m && c === m.child && !c.alive;
      if (!c.alive && !isChildPending) continue;
      if (slot >= CAPACITY) break;
      const st = this.driver.get(c.id);
      let params: BlobParams = c.spec.body;
      let center = this.restCenter(c);
      const scale = c.spec.worldScale;
      const dyn: BlobDynamics = {
        squash: { axis: st.axis, amount: st.amount, taper: params.squash.taper ?? 0 },
        jiggle: c.jiggle,
        phase: c.phase,
        seed: c.id * 31 + 7,
      };
      if (mobile) dyn.maxSpheres = MOBILE_MAX_SPHERES;
      let forceA = false;
      let hideBody = false;

      if (m && c === m.b) {
        const ca = this.restCenter(m.a);
        if (frame) {
          // Body is part of A's blended union now; B's parts still detach from a centre that is being
          // pulled into A along the timeline's viscosity curve.
          hideBody = true;
          const u = Math.min(1, mergeT / MERGE_BLEND_MS);
          const e = u * u * (3 - 2 * u);
          const pull = Math.pow(e, 1 + 1.5 * m.a.spec.body.viscosity);
          const from: Vec3 = [center[0] + (ca[0] - center[0]) * 0.6, center[1], center[2] + (ca[2] - center[2]) * 0.6];
          center = [from[0] + (ca[0] - from[0]) * pull, from[1] + (ca[1] - from[1]) * pull, from[2] + (ca[2] - from[2]) * pull];
        } else {
          const u = Math.min(1, m.t / SLIDE_MS);
          center = [center[0] + (ca[0] - center[0]) * u * 0.6, center[1], center[2] + (ca[2] - center[2]) * u * 0.6];
          dyn.squash = { axis: [1, 0, 0], amount: 0.35 * (1 - u), taper: 0.55 };
        }
      } else if (m && c === m.a && frame) {
        params = frame.params;
        dyn.boxHalf = frame.boxHalf;
        dyn.squash = frame.pop > 0 ? { axis: [0, 1, 0], amount: 0.35 * frame.pop, taper: 0 } : { axis: st.axis, amount: st.amount * 0.5, taper: 0 };
        forceA = true;
        if (m.child.alive) hideBody = true; // the child body took over
      } else if (isChildPending) {
        hideBody = true; // parts only (choreography) until the pop finished
        center = this.restCenter(m!.a);
      }

      const { along, across } = squashScales(dyn.squash?.amount ?? 0);
      const ay = dyn.squash?.axis[1] ?? 1;
      const sy = along * ay * ay + across * (1 - ay * ay);
      const floorY = params.floorY ?? NO_FLOOR;
      const baseY = floorY > NO_FLOOR ? -floorY * sy * scale : scale * sy;
      const off = st.offset;
      const offsetScale = 0.22;
      const place = { center: [center[0] + off[0] * offsetScale, baseY + Math.max(0, off[1]) * offsetScale, center[2] + off[2] * offsetScale] as Vec3, scale };
      if (forceA) delete dyn.maxSpheres;

      if (hideBody) {
        this.blockA.hide(slot);
        this.blockB.hide(slot);
      } else if (showA || forceA) {
        this.blockA.write(slot, params, place, dyn);
        this.blockB.hide(slot);
      } else {
        this.blockB.write(slot, params, place, dyn);
        this.blockA.hide(slot);
      }
      // The rig samples exactly what the shader draws (same params, squash, phase, jiggle, time).
      c.rig.setBody({
        params: isChildPending ? c.spec.body : params,
        center: place.center,
        scale,
        squash: dyn.squash,
        jiggle: dyn.jiggle,
        phase: dyn.phase,
        maxSpheres: dyn.maxSpheres,
        time: gpuTime,
        noiseOctaves: octaves,
        surface: showA || forceA ? 'exact' : 'mesh',
      });
      slot++;
    }
    for (let i = slot; i < CAPACITY; i++) {
      this.blockA.hide(i);
      this.blockB.hide(i);
    }
    if (this.meshA) this.meshA.count = showA || m ? slot : 0;
    if (this.meshB) this.meshB.count = showA ? 0 : slot;
  }

  private emitInfo(): void {
    if (!this.onInfo) return;
    const first = this.creatures[0];
    const parts = this.creatures.reduce((n, c) => n + (c.alive ? c.rig.parts.length : 0), 0);
    const missing = new Set<string>();
    for (const c of this.creatures) for (const id of c.rig.missingModules) missing.add(id);
    for (const id of this.library.missing) missing.add(id);
    this.onInfo({
      creatures: this.creatures.filter((c) => c.alive).length,
      parts,
      partDrawCalls: this.pool?.drawCalls ?? 0,
      modules: this.library.ids.filter((id) => this.library.has(id)).length,
      missing: [...missing],
      merging: this.merge !== null,
      inheritance: this.inheritance,
      partIds: first
        ? first.spec.parts.map((p) => ({ id: p.id, label: `${p.slot} · ${p.asset}${p.count > 1 ? ` #${p.index + 1}` : ''}`, theta: p.theta, phi: p.phi, scale: p.scale, tint: p.tint }))
        : [],
      rigMs: Math.round(this.rigMs * 100) / 100,
    });
  }
}
