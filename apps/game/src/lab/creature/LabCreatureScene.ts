import { BoxGeometry, Color, InstancedMesh, Mesh, PerspectiveCamera, Plane, Raycaster, Scene, Vector2, Vector3 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Fn, color, float, floor, mix, mod, positionWorld, smoothstep, time, uniform, vec2 } from 'three/tsl';
import {
  BODY_TYPES,
  BODY_TYPE_LABELS,
  NO_FLOOR,
  creatureGenome,
  describeInheritance,
  inherit,
  makeRng,
  resolveCreature,
  squashScales,
  type BlobParams,
  type BodyType,
  type CreatureGenome,
  type CreatureSpec,
  type GaitKind,
  type GenomeRules,
  type Pose,
  type SlotId,
  type Squash,
  type Vec3,
  type Verb,
  type ZoneId,
} from '@ee/genome';
import { SpringJiggle, combineSquash } from '@ee/physics';
import {
  BLOB_QUALITY_HIGH,
  BLOB_QUALITY_MOBILE,
  BlobParamBlock,
  CREATURE_MERGE_TOTAL_MS,
  MERGE_BLEND_MS,
  CreatureMergeChoreo,
  CreatureMotion,
  CreaturePool,
  createBlobParticleMesh,
  createFeatherCardMesh,
  createFurFinMesh,
  createFurShellMesh,
  dropletParams,
  makePattern,
  type PatternParams,
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

export type LabMode = 'single' | 'gallery' | 'grid' | 'herd' | 'merge' | 'motion' | 'sheet' | 'compare';
export type BodyCandidate = 'a' | 'b';
export type Quality = 'high' | 'mobile' | 'auto';
export type MotionAction = 'walk' | 'jump' | 'slither' | 'stand';
export type BodyChoice = BodyType | 'auto';

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
  /** Archetype override ('auto' = the rules decide per zone/tier/seed). */
  bodyType: BodyChoice;
  /** Motion section: what a tap on the plate does. */
  action: MotionAction;
  /** Speed multiplier 0.3..2.5. */
  speed: number;
  /** Mass multiplier 0.4..3. */
  mass: number;
  /** Motion mode: six archetypes wander at once. */
  parcours: boolean;
  /** Second tier of the compare view. */
  compareTier: number;
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
  bodyType: 'auto',
  action: 'walk',
  speed: 1,
  mass: 1,
  parcours: false,
  compareTier: 7,
};

export const GAIT_LABELS: Readonly<Record<GaitKind, string>> = { hop: 'Hüpfen', walk: 'Schritt', trot: 'Trab', stomp: 'Stampfen', slither: 'Schlängeln', waddle: 'Watscheln' };

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
  /** CPU time of the locomotion controllers per frame (ms, smoothed). */
  motionMs: number;
  /** The hero creature's archetype, gait and motion state. */
  bodyType: BodyType | null;
  gait: GaitKind | null;
  massKg: number;
  speed: number;
  motionState: string;
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
  /** Locomotion (null for merge parties and frozen sheet poses). */
  motion: CreatureMotion | null;
  pose: Pose | null;
  /** Sheet: a frozen squash pose. */
  fixed: Squash | null;
  /** Sheet: static droplets around a frozen pose (body units, relative to the body origin). */
  drops: Array<{ center: Vec3; r: number }>;
  /** Cached droplet body (palette + material of the creature). */
  dropBody: BlobParams | null;
  /** Cached render pattern of the creature's skin (null = none). */
  pattern: PatternParams | null | undefined;
  /** Impact ripple (landing splat, poke): direction in rest space, age in seconds. */
  ripple: { dir: [number, number, number]; age: number; strength: number } | null;
  /** Parcours/herd: seconds until the next wander target. */
  wanderAt: number;
}

interface SurfacePasses {
  fur: InstancedMesh;
  /** Fur fins / tuft cards (Materials pass 2): silhouette tufts + combed locks. */
  fins: InstancedMesh;
  finCards: number;
  finSilhouetteOnly: { value: number };
  feather: InstancedMesh;
  particles: InstancedMesh;
  cards: number;
  perBlob: number;
}

interface MergeState {
  a: LabCreature;
  b: LabCreature;
  child: LabCreature;
  timeline: MergeTimeline;
  choreo: CreatureMergeChoreo;
  t: number;
}

/**
 * Instances per parameter block: 36 × 28 vec4 = 16 128 B, the 16 KB minimum UBO size of the WebGL2
 * fallback (iOS). Creatures first, droplets fill the remaining slots.
 */
const CAPACITY = 36;
const SLIDE_MS = 140;
/** Length of the whole merge (B's slide + body timeline + part settle) for the lab's scrub slider. */
export const MERGE_SCRUB_MAX_MS = SLIDE_MS + CREATURE_MERGE_TOTAL_MS;
const INK = '#0f1c22';
/** The lab shows the full creature system: the rules pick archetypes per zone/tier/seed. */
const ARCHETYPES = { archetypes: true } as const;
const MOBILE_DPR_CAP = 1.5;
const MOBILE_MAX_SPHERES = 5;
/** Motion plate half extents (world). */
const MOTION_HALF: [number, number] = [3.1, 2.1];
const HERD_HALF: [number, number] = [3.6, 3.2];

export function resolveQuality(q: Quality): 'high' | 'mobile' {
  if (q !== 'auto') return q;
  const st = useAppStore.getState();
  // An explicit preference applies at once (the governor only confirms it with its next stats window).
  if (st.qualityPref === 'mobil') return 'mobile';
  if (st.qualityPref === 'hoch') return 'high';
  return st.effectiveQuality === 'mobil' ? 'mobile' : 'high';
}

/**
 * P4 Genom-Lab scene: creatures = body archetype (candidate b jiggle mesh, raymarch for the hero view
 * and for snakes) + modular accessories on SDF sockets, alive through their MotionController. Modes:
 * one creature close up, the tier gallery 1–8, a 6×6 grid (cost check), a herd of 36 walking
 * quadrupeds (locomotion cost check), the merge stage, the motion stage (walk / jump / slither,
 * parcours of six archetypes), the blob sheet (tiers, archetypes, squash cross) and a two-tier compare.
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
  /** Surface passes per block (Materials agent, P1b): fur shells, feather cards, gas/fire/liquid particles. */
  private passes: { a: SurfacePasses; b: SurfacePasses } | null = null;
  private pool: CreaturePool | null = null;
  private plate: Mesh | null = null;
  private readonly plateOffset = uniform(0.5);
  private readonly driver = new SpringJiggle();
  private creatures: LabCreature[] = [];
  private merge: MergeState | null = null;
  private ctx: SceneContext | null = null;
  private aspect = 1;
  private viewW = 1;
  private viewH = 1;
  /** Fraction of the canvas height covered by the controls sheet (lab framing); content is fitted above it. */
  private insetBottom: number;
  /** Follow camera (motion stage with one hero): smoothed look-at target and the fixed offset from it. */
  private readonly followTarget = new Vector3();
  private readonly followOffset = new Vector3();
  private following = false;
  private nextId = 0;
  private rigMs = 0;
  private motionMs = 0;
  private infoTimer = 0;
  private inheritance: string[] = [];
  private loaded = false;
  private readonly gaze = new Vector3();
  private gazeActive = false;
  private readonly raycaster = new Raycaster();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private wanderRng = makeRng(1);

  /** 'lab': the controls sheet covers the lower part of the canvas; 'editor': the preview is its own row. */
  private readonly framing: 'lab' | 'editor';

  constructor(opts: { rules?: GenomeRules; framing?: 'lab' | 'editor' } = {}) {
    this.rules = opts.rules ?? BUNDLED_RULES;
    this.framing = opts.framing ?? 'lab';
    this.insetBottom = this.framing === 'lab' ? 0.42 : 0;
  }

  /** The lab route reports how much of the canvas its controls sheet covers (0..0.8). */
  setInsetBottom(fraction: number): void {
    const f = Math.min(0.8, Math.max(0, fraction));
    if (Math.abs(f - this.insetBottom) < 0.01) return;
    this.insetBottom = f;
    this.placeCamera();
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
    const makePasses = (block: BlobParamBlock): SurfacePasses => {
      const fur = createFurShellMesh(block, { uniforms: this.uniforms, quality: this.quality });
      const fins = createFurFinMesh(block, { uniforms: this.uniforms, quality: this.quality });
      const feather = createFeatherCardMesh(block, { uniforms: this.uniforms, quality: this.quality });
      const particles = createBlobParticleMesh(block, { uniforms: this.uniforms, quality: this.quality });
      this.scene.add(fur.mesh, fins.mesh, feather.mesh, particles.mesh);
      this.disposables.push(fur.material, fur.mesh.geometry, fins.material, fins.mesh.geometry, feather.material, feather.mesh.geometry, particles.material, particles.mesh.geometry);
      return { fur: fur.mesh, fins: fins.mesh, finCards: fins.cards, finSilhouetteOnly: fins.silhouetteOnly, feather: feather.mesh, particles: particles.mesh, cards: feather.cards, perBlob: particles.perBlob };
    };
    this.passes = { a: makePasses(this.blockA), b: makePasses(this.blockB) };
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
    // The Hoch-only passes are pre-warmed only when starting in Hoch (Mobil never draws them; a later
    // switch compiles them once).
    const warmPasses = this.effectiveQuality === 'high';
    for (const ps of [this.passes.a, this.passes.b]) {
      ps.fur.count = warmPasses ? 1 : 0;
      ps.fins.count = 1;
      ps.feather.count = warmPasses ? 1 : 0;
      ps.particles.count = warmPasses ? 1 : 0;
    }
    await ctx.renderer.compileAsync(this.scene, this.camera);
    a.mesh.count = 0;
    b.mesh.count = 0;
    for (const ps of [this.passes.a, this.passes.b]) {
      ps.fur.count = 0;
      ps.fins.count = 0;
      ps.feather.count = 0;
      ps.particles.count = 0;
    }
  }

  resize(ctx: SceneContext): void {
    this.viewW = ctx.width;
    this.viewH = ctx.height;
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
    const structural =
      prev.mode !== next.mode || prev.zone !== next.zone || prev.tier !== next.tier || prev.seed !== next.seed || prev.bodyType !== next.bodyType || prev.parcours !== next.parcours || prev.compareTier !== next.compareTier;
    if (prev.mode !== next.mode || prev.parcours !== next.parcours) this.lastAct = null;
    if (structural && this.loaded) this.rebuild();
    if (prev.candidate !== next.candidate) this.placeCamera();
    if (prev.quality !== next.quality) this.applyQuality();
    if (prev.speed !== next.speed || prev.mass !== next.mass) this.applyMotionSliders();
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
    const best = this.nearest(hit.x, hit.z);
    if (!best || best.d > 0.9 * Math.max(0.5, best.c.spec.worldScale * 2.2)) return false;
    const dir: Vec3 = [hit.x - best.c.at[0], 0.25, hit.z - best.c.at[1]];
    this.pokeCreature(best.c, dir);
    return true;
  }

  /**
   * Motion stage tap: the hero (or, in the parcours, the nearest creature) walks / jumps to the point;
   * a tap on a creature pokes it instead. Returns what happened.
   */
  commandAt(ndc: { x: number; y: number }): 'poke' | 'command' | null {
    if (this.settings.mode !== 'motion' && this.settings.mode !== 'herd') return this.pokeAt(ndc) ? 'poke' : null;
    const hit = this.pointOnPlane(ndc, 0);
    if (!hit) return null;
    const near = this.nearest(hit.x, hit.z);
    if (near && near.d < 0.55 * Math.max(0.4, near.c.spec.worldScale * 2)) {
      this.pokeCreature(near.c, [hit.x - near.c.at[0], 0.25, hit.z - near.c.at[1]]);
      return 'poke';
    }
    const half = this.settings.mode === 'herd' ? HERD_HALF : MOTION_HALF;
    const x = Math.max(-half[0], Math.min(half[0], hit.x));
    const z = Math.max(-half[1], Math.min(half[1], hit.z));
    const c = this.settings.parcours || this.settings.mode === 'herd' ? near?.c : this.creatures[0];
    if (!c?.motion) return null;
    this.commandTo(c, x, z);
    return 'command';
  }

  /** Last motion button (re-applied after rebuilds, so switching the archetype keeps it walking). */
  private lastAct: MotionAction | null = null;

  /** Motion buttons: the hero performs the action on the spot (circle walk, random jump, slither, stand). */
  act(action: MotionAction): void {
    this.lastAct = action === 'stand' || action === 'jump' ? null : action;
    this.applyAct(action);
  }

  private applyAct(action: MotionAction): void {
    this.settings.action = action;
    const heroes = this.settings.parcours || this.settings.mode === 'herd' ? this.creatures.filter((c) => c.motion) : this.creatures.slice(0, 1);
    for (const c of heroes) {
      const m = c.motion;
      if (!m) continue;
      c.wanderAt = Infinity; // manual control until the next rebuild
      switch (action) {
        case 'walk':
        case 'slither': {
          const r = Math.max(0.9, Math.min(1.6, 0.5 + c.spec.worldScale * 2.5));
          m.controller.walkCircle(c.at[0] > 0 ? c.at[0] - r : c.at[0] + r, c.at[1], r);
          break;
        }
        case 'jump': {
          const half = this.settings.mode === 'herd' ? HERD_HALF : MOTION_HALF;
          const dist = 0.8 + Math.random() * 1.4;
          const ang = Math.random() * Math.PI * 2;
          const x = Math.max(-half[0], Math.min(half[0], c.at[0] + Math.cos(ang) * dist));
          const z = Math.max(-half[1], Math.min(half[1], c.at[1] + Math.sin(ang) * dist));
          m.controller.jumpTo(x, z);
          break;
        }
        case 'stand':
          m.controller.stop();
          break;
      }
    }
  }

  /** Merge mode: B slides into A, bodies blend (MergeTimeline), parts detach/re-attach (choreo). */
  mergeParents(): boolean {
    if (this.merge || this.settings.mode !== 'merge' || !this.pool) return false;
    const a = this.creatures.find((c) => c.role === 'A' && c.alive);
    const b = this.creatures.find((c) => c.role === 'B' && c.alive);
    if (!a || !b) return false;
    const childGenome = inherit(a.genome, b.genome, this.rules, ARCHETYPES);
    const childSpec = resolveCreature(childGenome, this.rules, ARCHETYPES);
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
      motion: null,
      pose: null,
      fixed: null,
      drops: [],
      dropBody: null,
      pattern: undefined,
      ripple: null,
      wanderAt: Infinity,
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
      if (c.ripple) {
        c.ripple.age += dt;
        if (c.ripple.age > 2.5) c.ripple = null;
      }
      if (c.target) {
        c.at[0] += (c.target[0] - c.at[0]) * slide;
        c.at[1] += (c.target[1] - c.at[1]) * slide;
        if (Math.hypot(c.target[0] - c.at[0], c.target[1] - c.at[1]) < 1e-3) c.target = null;
      }
    }
    this.updateMerge(dt);
    this.updateGazeDemo(dt);
    // Locomotion: every living creature with a controller steps; wanderers pick new targets.
    const tm0 = performance.now();
    this.separate();
    for (const c of this.creatures) {
      if (!c.motion || !c.alive) continue;
      this.updateWander(c, dt);
      c.pose = c.motion.step(dt);
      c.at[0] = c.pose.x;
      c.at[1] = c.pose.z;
      // A landing splat rings the body from below (liquid strongest, jelly damped — per material).
      if (c.pose.jumpPhase === 'splat' && c.pose.stomp >= 0.99) c.ripple = { dir: [0, -1, 0], age: 0, strength: 1.2 };
    }
    const motionMs = performance.now() - tm0;
    this.motionMs = this.motionMs === 0 ? motionMs : this.motionMs * 0.9 + motionMs * 0.1;
    this.updateFollow(dt);
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

  private nearest(x: number, z: number): { c: LabCreature; d: number } | null {
    let best: LabCreature | null = null;
    let bestD = Infinity;
    for (const c of this.creatures) {
      if (!c.alive) continue;
      const d = Math.hypot(c.at[0] - x, c.at[1] - z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best ? { c: best, d: bestD } : null;
  }

  private pokeCreature(c: LabCreature, dir: Vec3): void {
    this.driver.impulse(c.id, dir, 0.8 + 0.4 * c.spec.personality.squashHardness);
    c.jiggle = 1;
    c.rig.poke(1);
    // Concentric rings from the side that was poked (the impact point faces against the push).
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    c.ripple = { dir: [-dir[0] / l, -dir[1] / l, -dir[2] / l], age: 0, strength: 1 };
  }

  private commandTo(c: LabCreature, x: number, z: number): void {
    const m = c.motion;
    if (!m) return;
    c.wanderAt = Infinity;
    const action = this.settings.action;
    if (action === 'jump') m.controller.jumpTo(x, z);
    else if (action === 'stand') m.controller.stop();
    else m.controller.walkTo(x, z);
  }

  /**
   * Wanderers keep their distance: when two bodies get closer than their combined size, the one that
   * is not jumping picks a new target on the far side (cheap, O(n²) for ≤ 36 creatures).
   */
  private separate(): void {
    if (this.settings.mode !== 'motion' && this.settings.mode !== 'herd') return;
    const list = this.creatures.filter((c) => c.motion && c.alive && Number.isFinite(c.wanderAt));
    const half = this.settings.mode === 'herd' ? HERD_HALF : MOTION_HALF;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]!;
        const dx = b.at[0] - a.at[0];
        const dz = b.at[1] - a.at[1];
        const d = Math.hypot(dx, dz);
        const minD = 0.55 * (a.spec.worldScale * Math.max(2, a.spec.skeleton.length) + b.spec.worldScale * Math.max(2, b.spec.skeleton.length));
        if (d >= minD) continue;
        const mover = b.motion!.controller.currentMode === 'jump' ? a : b;
        const other = mover === a ? b : a;
        const ux = d > 1e-4 ? (mover.at[0] - other.at[0]) / d : 1;
        const uz = d > 1e-4 ? (mover.at[1] - other.at[1]) / d : 0;
        const tx = Math.max(-half[0], Math.min(half[0], mover.at[0] + ux * minD * 1.6));
        const tz = Math.max(-half[1], Math.min(half[1], mover.at[1] + uz * minD * 1.6));
        if (mover.motion!.controller.currentMode !== 'jump') mover.motion!.controller.walkTo(tx, tz);
        mover.wanderAt = Math.max(mover.wanderAt, 0.8);
      }
    }
  }

  private updateWander(c: LabCreature, dt: number): void {
    if (!Number.isFinite(c.wanderAt) || !c.motion) return;
    const ctl = c.motion.controller;
    if (ctl.currentMode !== 'idle') return;
    c.wanderAt -= dt;
    if (c.wanderAt > 0) return;
    const half = this.settings.mode === 'herd' ? HERD_HALF : MOTION_HALF;
    const rng = this.wanderRng;
    const x = (rng.next() * 2 - 1) * half[0] * 0.9;
    const z = (rng.next() * 2 - 1) * half[1] * 0.9;
    if (c.spec.bodyType === 'blob' ? rng.next() < 0.45 : rng.next() < 0.08) ctl.jumpTo(x, z);
    else ctl.walkTo(x, z);
    c.wanderAt = 0.6 + rng.next() * 2.2;
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

  private applyMotionSliders(): void {
    for (const c of this.creatures) {
      if (!c.motion) continue;
      c.motion.controller.speedFactor = this.settings.speed;
      c.motion.controller.massFactor = this.settings.mass;
    }
  }

  private makeCreature(genome: CreatureGenome, at: [number, number], role: LabCreature['role'] = null, opts: { motion?: boolean; yaw?: number; wander?: boolean; fixed?: Squash } = {}): LabCreature {
    const spec = resolveCreature(genome, this.rules, ARCHETYPES);
    const id = this.nextId++;
    this.driver.reset(id);
    this.driver.configure(id, { viscosity: spec.body.viscosity });
    const rig = this.pool!.createRig(spec);
    const c: LabCreature = { id, genome, spec, rig, at, target: null, phase: (id * 1.618) % (Math.PI * 2), jiggle: 0, alive: true, role, motion: null, pose: null, fixed: opts.fixed ?? null, drops: [], dropBody: null, pattern: undefined, ripple: null, wanderAt: opts.wander ? this.wanderRng.next() * 1.5 : Infinity };
    if (opts.motion !== false && !opts.fixed) {
      c.motion = new CreatureMotion(spec, rig, { seed: (id * 7919 + this.settings.seed * 31) >>> 0, scale: spec.worldScale });
      c.motion.controller.speedFactor = this.settings.speed;
      c.motion.controller.massFactor = this.settings.mass;
      // Walkers show their profile in a 3/4 view by default; blobs face the camera.
      c.motion.controller.teleport(at[0], at[1], opts.yaw ?? (spec.bodyType === 'blob' ? 0 : 0.75));
      c.pose = c.motion.controller.currentPose;
    }
    return c;
  }

  private genome(tier: number, seed: number, bodyType?: BodyChoice): CreatureGenome {
    const bt = bodyType ?? this.settings.bodyType;
    return creatureGenome(this.settings.zone, tier, seed, undefined, bt === 'auto' ? undefined : bt);
  }

  private rebuild(): void {
    if (!this.pool) return;
    this.merge = null;
    for (const c of this.creatures) c.rig.dispose();
    this.creatures = [];
    const s = this.settings;
    this.wanderRng = makeRng(s.seed * 1000003 + 17);
    switch (s.mode) {
      case 'single':
        this.creatures.push(this.makeCreature(this.genome(s.tier, s.seed), [0, 0]));
        break;
      case 'gallery': {
        let x = 0;
        const specs: Array<{ genome: CreatureGenome; w: number }> = [];
        for (let t = 1; t <= 8; t++) {
          const genome = this.genome(t, s.seed);
          const spec = resolveCreature(genome, this.rules, ARCHETYPES);
          const w = spec.worldScale * (spec.bodyType === 'snake' ? 2.6 + spec.skeleton.length * 0.3 : 2.6) + 0.25;
          specs.push({ genome, w });
        }
        const total = specs.reduce((acc, e) => acc + e.w, 0);
        x = -total / 2;
        for (const e of specs) {
          this.creatures.push(this.makeCreature(e.genome, [x + e.w / 2, 0], null, { yaw: 0.35 }));
          x += e.w;
        }
        break;
      }
      case 'grid':
        for (let i = 0; i < 36; i++) {
          const c = this.makeCreature(this.genome(4, s.seed + i * 13), [(i % 6) - 2.5, Math.floor(i / 6) - 2.5]);
          c.rig.traceInterval = 3;
          this.creatures.push(c);
        }
        break;
      case 'herd':
        // Locomotion cost check: 36 tier-5 quadrupeds walking at once.
        for (let i = 0; i < 36; i++) {
          const c = this.makeCreature(this.genome(5, s.seed + i * 13, 'quadruped'), [((i % 6) - 2.5) * 1.15, (Math.floor(i / 6) - 2.5) * 1.15], null, { wander: true, yaw: (i * 2.4) % (Math.PI * 2) });
          // Crowd LOD: cached socket traces follow rotation and squash analytically; re-trace every 4th frame.
          c.rig.traceInterval = 4;
          c.wanderAt = 0;
          this.creatures.push(c);
        }
        break;
      case 'merge':
        this.creatures.push(this.makeCreature(this.genome(s.tier, s.seed), [-0.8, 0], 'A', { motion: false }));
        this.creatures.push(this.makeCreature(this.genome(s.tier, s.seed + 1), [0.8, 0], 'B', { motion: false }));
        break;
      case 'motion':
        if (s.parcours) {
          const line: BodyType[] = ['blob', 'snake', 'quadruped', 'biped', 'heavy', BODY_TYPES[Math.floor(makeRng(s.seed).next() * BODY_TYPES.length)]!];
          line.forEach((bt, i) => {
            const c = this.makeCreature(this.genome(Math.max(5, s.tier), s.seed + i * 101, bt), [((i % 3) - 1) * 1.9, (i < 3 ? -1 : 1) * 1.1], null, { wander: true, yaw: i * 1.1 });
            this.creatures.push(c);
          });
        } else {
          this.creatures.push(this.makeCreature(this.genome(Math.max(s.bodyType === 'auto' || s.bodyType === 'blob' ? 1 : 5, s.tier), s.seed), [0, 0]));
        }
        break;
      case 'sheet':
        this.buildSheet();
        break;
      case 'compare': {
        const ga = this.genome(s.tier, s.seed);
        const gb = this.genome(s.compareTier, s.seed);
        const wa = resolveCreature(ga, this.rules, ARCHETYPES).worldScale * 2.4 + 0.2;
        const wb = resolveCreature(gb, this.rules, ARCHETYPES).worldScale * 2.4 + 0.2;
        this.creatures.push(this.makeCreature(ga, [-(wa + wb) / 4 - 0.1, 0], null, { yaw: 0.3 }));
        this.creatures.push(this.makeCreature(gb, [(wa + wb) / 4 + 0.1, 0], null, { yaw: -0.3 }));
        break;
      }
    }
    for (let i = 0; i < CAPACITY; i++) {
      this.blockA.hide(i);
      this.blockB.hide(i);
    }
    this.applyOverrides();
    this.layoutPlate();
    this.placeCamera();
    if (this.lastAct && (s.mode === 'motion' || s.mode === 'herd')) this.applyAct(this.lastAct);
    this.emitInfo();
  }

  /** The designer's blob sheet: tiers across the back, the five archetypes, and the squash/stretch cross. */
  private buildSheet(): void {
    const s = this.settings;
    // Row A: tiers 1–8 (blob line) along the back.
    for (let t = 1; t <= 8; t++) this.creatures.push(this.makeCreature(this.genome(t, s.seed, 'blob'), [-4.3 + (t - 1) * 1.2, -2.6], null, { yaw: 0.2 }));
    // Row B: the archetypes at tier 6, alive in place (hops, weight shifts, idle verbs).
    BODY_TYPES.forEach((bt, i) => this.creatures.push(this.makeCreature(this.genome(6, s.seed + 5, bt), [-4.3 + i * 1.3, -0.4], null, { yaw: 0.6 })));
    // Cross (the green blob cross of the animation draft, seen from above): per direction the
    // anticipation squash against the motion (splash at the sides) and the stretch along it with
    // trailing droplets; the centre blob at rest.
    const cx = 2.9;
    const cz = 1.2;
    const arms: Array<{ dx: number; dz: number; axis: Vec3 }> = [
      { dx: 1, dz: 0, axis: [1, 0, 0] },
      { dx: -1, dz: 0, axis: [-1, 0, 0] },
      { dx: 0, dz: -1, axis: [0, 0, -1] },
      { dx: 0, dz: 1, axis: [0, 0, 1] },
    ];
    const g = this.genome(2, s.seed, 'blob');
    this.creatures.push(this.makeCreature(g, [cx, cz], null, { fixed: { axis: [0, 1, 0], amount: 0, taper: 0.55 } }));
    for (const a of arms) {
      const squash = this.makeCreature(g, [cx + a.dx * 1.0, cz + a.dz * 1.0], null, { fixed: { axis: a.axis, amount: -0.3, taper: 0.55 } });
      const side: Vec3 = [a.axis[2], 0, -a.axis[0]];
      squash.drops.push(
        { center: [side[0] * 1.25 - a.axis[0] * 0.2, -0.75, side[2] * 1.25 - a.axis[2] * 0.2], r: 0.12 },
        { center: [-side[0] * 1.25 - a.axis[0] * 0.2, -0.75, -side[2] * 1.25 - a.axis[2] * 0.2], r: 0.1 },
      );
      this.creatures.push(squash);
      const stretch = this.makeCreature(g, [cx + a.dx * 2.05, cz + a.dz * 2.05], null, { fixed: { axis: a.axis, amount: 0.55, taper: 0.55 } });
      stretch.drops.push(
        { center: [-a.axis[0] * 1.75, -0.35, -a.axis[2] * 1.75], r: 0.13 },
        { center: [-a.axis[0] * 2.15 + side[0] * 0.3, -0.45, -a.axis[2] * 2.15 + side[2] * 0.3], r: 0.09 },
      );
      this.creatures.push(stretch);
    }
  }

  private restCenter(c: LabCreature, params = c.spec.body): Vec3 {
    const scale = c.spec.worldScale;
    const floorY = params.floorY ?? NO_FLOOR;
    const y = floorY > NO_FLOOR ? -floorY * scale : c.spec.skeleton.restLift * scale;
    return [c.at[0], y, c.at[1]];
  }

  private extent(): { width: number; depth: number } {
    switch (this.settings.mode) {
      case 'single': {
        const c = this.creatures[0];
        const s = c?.spec.worldScale ?? 0.4;
        const long = c ? Math.max(2.1, c.spec.skeleton.length) : 2.1;
        return { width: s * (2.5 + long) + 0.3, depth: s * 3.6 + 0.3 };
      }
      case 'gallery': {
        const xs = this.creatures.map((c) => c.at[0]);
        const w = (Math.max(...xs, 0) - Math.min(...xs, 0)) + 1.6;
        return { width: w, depth: 1.6 };
      }
      case 'grid':
        return { width: 7, depth: 7 };
      case 'herd':
        return { width: HERD_HALF[0] * 2 + 1, depth: HERD_HALF[1] * 2 + 1 };
      case 'merge':
        return { width: 3.6, depth: 1.6 };
      case 'motion': {
        const hero = this.followHero();
        if (hero) {
          // Follow camera: frame the creature with room to move (≈ 4 body lengths).
          const sz = hero.spec.worldScale * Math.max(2.2, hero.spec.skeleton.length);
          return { width: Math.max(2.4, sz * 3.2), depth: Math.max(1.6, sz * 1.8) };
        }
        return { width: MOTION_HALF[0] * 2 + 0.6, depth: MOTION_HALF[1] * 2 + 0.6 };
      }
      case 'sheet':
        return { width: 10.6, depth: 6.8 };
      case 'compare': {
        const xs = this.creatures.map((c) => c.at[0]);
        return { width: (Math.max(...xs, 0) - Math.min(...xs, 0)) + 2.2, depth: 2 };
      }
    }
  }

  private layoutPlate(): void {
    if (!this.plate) return;
    const { width, depth } = this.settings.mode === 'motion' ? { width: MOTION_HALF[0] * 2 + 3, depth: MOTION_HALF[1] * 2 + 3 } : this.extent();
    this.plate.scale.set(Math.max(width, 2), 1, Math.max(depth, 2));
    this.plate.position.set(0, -0.15, 0);
    this.plateOffset.value = 0.5;
  }

  private placeCamera(): void {
    // Off-centre projection: the frustum is fitted to the visible part above the controls sheet and the
    // principal point sits in its middle; the covered strip below still renders (more ground).
    const visH = Math.max(1, this.viewH * (1 - this.insetBottom));
    this.aspect = this.viewW / visH;
    this.camera.aspect = this.aspect;
    if (this.insetBottom > 0.001) this.camera.setViewOffset(this.viewW, visH, 0, 0, this.viewW, this.viewH);
    else this.camera.clearViewOffset();
    const { width, depth } = this.extent();
    const mode = this.settings.mode;
    const s = this.creatures[0]?.spec.worldScale ?? 0.4;
    const maxS = this.creatures.reduce((m, c) => Math.max(m, c.spec.worldScale), s);
    const hero = this.followHero();
    const flat = mode === 'grid' || mode === 'herd' || mode === 'sheet' || (mode === 'motion' && !hero);
    const elev = mode === 'grid' || mode === 'herd' ? 0.88 : mode === 'sheet' ? 0.72 : mode === 'motion' ? (hero ? 0.3 : 0.62) : mode === 'single' ? 0.3 : 0.42;
    // Creature height incl. parts (crest/horns stick out ≈ one body radius).
    const height = flat ? 1.2 : maxS * 3.8 + 0.4;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const tanV = Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(tanV * this.aspect);
    const distW = width / 2 / Math.tan(hFov / 2);
    const distH = (depth * Math.sin(elev) + height) / 2 / tanV;
    const dist = Math.max(distW, distH) * 1.08 + depth * 0.35;
    let centreY = flat ? 0.05 : maxS * 1.2;
    let camDist = dist;
    const target = new Vector3(0, centreY, 0);
    const framed = hero ?? (mode === 'single' ? this.creatures[0] ?? null : null);
    if (framed) {
      // Hero framing: the creature fills ≈ 55 % of the visible height (legs, head and parts included).
      const sk = framed.spec.skeleton;
      const w = framed.spec.worldScale;
      const tall = w * (sk.height + 1.2 * sk.restLift);
      const long = w * Math.max(2, sk.length);
      const size = Math.max(tall * 1.1, long * 0.75, 0.45);
      camDist = size / (0.55 * 2 * tanV);
      centreY = tall * 0.45;
      target.set(framed.at[0], centreY, framed.at[1]);
      if (hero) this.followTarget.copy(target);
    }
    this.followOffset.set(0, Math.sin(elev) * camDist, Math.cos(elev) * camDist);
    this.following = !!hero;
    this.camera.position.copy(target).add(this.followOffset);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
  }

  /** The motion stage without the parcours follows its one creature. */
  private followHero(): LabCreature | null {
    if (this.settings.mode !== 'motion' || this.settings.parcours) return null;
    return this.creatures[0] ?? null;
  }

  /** Smoothed follow: the camera glides after the hero so the ground visibly moves under its feet. */
  private updateFollow(dt: number): void {
    if (!this.following) return;
    const hero = this.followHero();
    if (!hero) return;
    const k = 1 - Math.exp(-dt * 2.2);
    this.followTarget.x += (hero.at[0] - this.followTarget.x) * k;
    this.followTarget.z += (hero.at[1] - this.followTarget.z) * k;
    this.camera.position.copy(this.followTarget).add(this.followOffset);
    this.camera.lookAt(this.followTarget);
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
    let anyA = false;
    let usesFur = false;
    let usesFeather = false;
    let usesParticles = false;
    const crowd = s.mode === 'herd' || s.mode === 'grid' || s.mode === 'sheet' || s.mode === 'gallery';
    for (const c of this.creatures) {
      const isChildPending = m && c === m.child && !c.alive;
      if (!c.alive && !isChildPending) continue;
      if (slot >= CAPACITY) break;
      const st = this.driver.get(c.id);
      let params: BlobParams = c.spec.body;
      let center = this.restCenter(c);
      const scale = c.spec.worldScale;
      const pose = c.motion && c.pose ? c.pose : null;
      const dyn: BlobDynamics = {
        squash: { axis: st.axis, amount: st.amount, taper: params.squash.taper ?? 0 },
        jiggle: c.jiggle,
        phase: c.phase,
        seed: c.id * 31 + 7,
      };
      // Skin (Materials agent): coats render as fur shells / feather cards, patterns in the style block.
      const skin = c.spec.skin;
      if (skin.coat !== 'bare') {
        dyn.material = skin.coat;
        if (skin.coat === 'fur') usesFur = true;
        else usesFeather = true;
      } else if (c.spec.material !== 'jelly') usesParticles = true;
      if (c.pattern === undefined) c.pattern = skin.pattern === 'none' ? null : makePattern(skin.pattern, c.spec.body.baseColor, { scale: skin.patternScale, rotation: skin.patternRotation });
      if (c.pattern) dyn.pattern = c.pattern;
      if (c.ripple) dyn.ripple = c.ripple;
      // Crowds: small on screen — skip the inner organ march, halve the fur shells.
      if (crowd) dyn.detail = 0;
      // Snakes, REX and giraffe necks are not star-shaped from the box centre (the 6-step mesh trace
      // cannot follow them): they raymarch — except on the WebGL2 fallback (old devices, SwiftShader),
      // where marching a long 10–14-sphere body stalls the frame; there the mesh draws them with small
      // dents at the overhangs instead.
      let forceA = c.spec.skeleton.raymarch && this.ctx?.backend !== 'webgl2';
      if (mobile && c.spec.bodyType === 'blob') dyn.maxSpheres = MOBILE_MAX_SPHERES;
      let hideBody = false;
      let offsetScale = 0.22;

      if (pose) {
        params = c.motion!.posedParams(pose);
        center = c.motion!.center(pose);
        const combined = combineSquash(pose.squash, st, offsetScale);
        dyn.squash = { axis: combined.axis, amount: combined.amount, taper: pose.squash.taper ?? 0.55 };
        dyn.jiggle = Math.max(c.jiggle, pose.jiggle);
        offsetScale = 0; // the driver's lurch is already inside `combined.offset`
        center = [center[0] + combined.offset[0], center[1] + Math.max(0, combined.offset[1]), center[2] + combined.offset[2]];
      } else if (c.fixed) {
        dyn.squash = { axis: c.fixed.axis, amount: c.fixed.amount, taper: c.fixed.taper ?? 0.55 };
      }

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

      let place: { center: Vec3; scale: number };
      if (pose) {
        place = { center, scale };
      } else {
        const { along, across } = squashScales(dyn.squash?.amount ?? 0);
        const ay = dyn.squash?.axis[1] ?? 1;
        const sy = along * ay * ay + across * (1 - ay * ay);
        const floorY = params.floorY ?? NO_FLOOR;
        const baseY = floorY > NO_FLOOR ? -floorY * sy * scale : center[1] * sy;
        const off = st.offset;
        place = { center: [center[0] + off[0] * offsetScale, baseY + Math.max(0, off[1]) * offsetScale, center[2] + off[2] * offsetScale], scale };
      }
      if (forceA) delete dyn.maxSpheres;

      if (hideBody) {
        this.blockA.hide(slot);
        this.blockB.hide(slot);
      } else if (showA || forceA) {
        this.blockA.write(slot, params, place, dyn);
        this.blockB.hide(slot);
        anyA = true;
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
        rotation: pose ? pose.rotation : undefined,
        pose,
        noiseMaterial: skin.coat !== 'bare' ? 'jelly' : undefined,
        surfaceOffset: skin.coat === 'fur' ? 0.1 : skin.coat === 'feather' ? 0.05 : 0,
      });
      slot++;

      // Droplets (splat, sheet frames): each its own one-sphere blob instance, whatever the candidate.
      const drops = pose ? pose.droplets : c.drops;
      if (drops.length > 0 && !hideBody) {
        c.dropBody ??= dropletParams(c.spec.body);
        const rot = pose ? pose.rotation : null;
        for (const d of drops) {
          if (slot >= CAPACITY) break;
          // Pose droplets are body-local in the posed frame's rest orientation → rotate with the body.
          const lc: Vec3 = rot ? [rot[0] * d.center[0] + rot[1] * d.center[1] + rot[2] * d.center[2], rot[3] * d.center[0] + rot[4] * d.center[1] + rot[5] * d.center[2], rot[6] * d.center[0] + rot[7] * d.center[1] + rot[8] * d.center[2]] : d.center;
          const at: Vec3 = [place.center[0] + lc[0] * scale, place.center[1] + lc[1] * scale, place.center[2] + lc[2] * scale];
          const dyn2: BlobDynamics = { phase: c.phase + d.r * 13, seed: c.id * 31 + slot };
          if (showA || forceA) {
            this.blockA.write(slot, c.dropBody, { center: at, scale: d.r * scale }, dyn2);
            this.blockB.hide(slot);
            anyA = true;
          } else {
            this.blockB.write(slot, c.dropBody, { center: at, scale: d.r * scale }, dyn2);
            this.blockA.hide(slot);
          }
          slot++;
        }
      }
    }
    for (let i = slot; i < CAPACITY; i++) {
      this.blockA.hide(i);
      this.blockB.hide(i);
    }
    const aOn = showA || m !== null || anyA;
    const bOn = !showA;
    if (this.meshA) this.meshA.count = aOn ? slot : 0;
    if (this.meshB) this.meshB.count = bOn ? slot : 0;
    // Extra passes (fur shells, feather cards, gas/fire/liquid particles) only in the Hoch preset; fur
    // fins (tufts) whenever fur is on stage — silhouette tufts only in Mobil (Materials agent's contract).
    const passes = this.passes;
    if (passes) {
      const high = !mobile;
      for (const [ps, on] of [[passes.a, aOn], [passes.b, bOn]] as const) {
        ps.fur.count = on && high && usesFur ? slot : 0;
        ps.fins.count = on && usesFur ? slot * ps.finCards : 0;
        ps.finSilhouetteOnly.value = high ? 0 : 1;
        ps.feather.count = on && high && usesFeather ? slot * ps.cards : 0;
        ps.particles.count = on && high && usesParticles ? slot * ps.perBlob : 0;
      }
    }
  }

  private emitInfo(): void {
    if (!this.onInfo) return;
    const first = this.creatures[0];
    const parts = this.creatures.reduce((n, c) => n + (c.alive ? c.rig.parts.length : 0), 0);
    const missing = new Set<string>();
    for (const c of this.creatures) for (const id of c.rig.missingModules) missing.add(id);
    for (const id of this.library.missing) missing.add(id);
    const pose = first?.pose ?? null;
    const ctl = first?.motion?.controller ?? null;
    const state = !ctl || !pose ? '' : pose.jumpPhase !== 'none' ? { crouch: 'duckt sich', flight: 'fliegt', splat: 'platscht', recover: 'federt' }[pose.jumpPhase] : pose.stumble > 0.3 ? 'stolpert' : ctl.currentMode === 'idle' ? 'steht' : ctl.currentMode === 'circle' ? 'läuft im Kreis' : 'geht';
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
      motionMs: Math.round(this.motionMs * 100) / 100,
      bodyType: first?.spec.bodyType ?? null,
      gait: first?.spec.motion.gait ?? null,
      massKg: ctl ? Math.round(ctl.mass * 10) / 10 : 0,
      speed: pose ? Math.round(pose.speed * 100) / 100 : 0,
      motionState: state,
    });
  }
}

export { BODY_TYPE_LABELS };
