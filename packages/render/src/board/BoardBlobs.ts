import { DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { Camera, Object3D } from 'three/webgpu';
import type { Blob, Coord, LevelState } from '@ee/core';
import { NO_FLOOR, buildBody, creatureGenome, genomeFor, mixHex, resolveCreature, scaleForTier, squashScales, type BlobParams, type BodyType, type CreatureSpec, type GenomeRules, type PartSpec, type Vec3, type ZoneId } from '@ee/genome';
import { SpringJiggle } from '@ee/physics';
import {
  BLOB_QUALITY_HIGH,
  BLOB_QUALITY_MOBILE,
  BlobParamBlock,
  applyBlobQuality,
  createBlobQualityUniforms,
  createBlobShadingUniforms,
  createJiggleBlobMesh,
  createRaymarchBlobMesh,
  makePattern,
  type BlobDynamics,
  type BlobShadingUniforms,
  type PatternParams,
} from '../blob/index';
import { CreatureMergeChoreo, CreaturePool, legDefsFor, meshBodyEligible, type CreatureRig, type ModuleLibrary, type PartPool } from '../creature/index';
import type { BoardLabels } from './BoardLabels';
import { labelIndexForTier } from './BoardLabels';
import { MOTIF, type BoardProps, type PropDesc } from './BoardProps';
import { CreatureDrive, archetypeFit } from './boardCreature';
import { BoardMeshBodies } from './boardMeshBodies';
import type { BoardLayout } from './boardElements';
import type { BoardPalette } from './boardPalette';

export type CreatureMode = 'all' | 'strays' | 'none';

export interface BlobVisual {
  id: number;
  slot: number;
  tier: number;
  kind: Blob['kind'];
  axis: 'h' | 'v' | undefined;
  frozen: boolean;
  sleeper: boolean;
  caged: boolean;
  /** Hidden under fog (not drawn until revealed). */
  fogged: boolean;
  /** Hidden by the scene (the hero stands in for it during hand-offs). */
  hidden: boolean;
  seed: number;
  spec: CreatureSpec | null;
  genome: BlobParams;
  /** Body archetype drawn: blob domes below tier 5 (and lines that stay blobs), walkers/snakes above. */
  body: BodyType;
  /** Board units per blob unit for this creature (cell fit, tier overflow), before pops. */
  fit: number;
  /** Locomotion of archetype bodies (null for blobs: those are tween-driven). */
  drive: CreatureDrive | null;
  /** Drawn by the raymarch candidate (solid bodies the mesh path does not take, WebGPU in the Hoch preset). */
  raymarch: boolean;
  /** Mesh path (species animals): the spec re-keyed onto its shared species mesh; null = jiggle/raymarch body. */
  meshSpec: CreatureSpec | null;
  pattern: PatternParams | null;
  x: number;
  z: number;
  /** Extra height (release lift, hops, leaps). */
  lift: number;
  /** Pop multiplier on the world scale. */
  pop: number;
  /** Squash override from a tween (slides, merges); null = spring driver. */
  squash: { axis: Vec3; amount: number } | null;
  jiggle: number;
  phase: number;
  /** Facing the timeline asks for (swipe direction); null = keep the current heading. */
  yawTarget: number | null;
  /** Follow `yawTarget` exactly (sampled merge moves) instead of the heading spring. */
  yawDirect: boolean;
  /** Snake: swallowed bulge along the spine (0 head … 1 tail), < 0 = none; heavy: trunk raised 0..1. */
  bulge: number;
  trumpet: number;
  /** Mouth roundness and eye squeeze (merge moves). */
  mouthRound: number;
  squint: number;
  /** Leap choreography: pitch override (+ = nose down) and its blend weight. */
  pitch: number;
  pitchBlend: number;
  /** 0..1 anticipation crouch, stumble envelope, mouth opening. */
  crouch: number;
  stumble: number;
  mouth: number;
  /** Snake coil override (null = automatic) and inner coil radius (blob units; null = rest coil). */
  coil: number | null;
  coilRadius: number | null;
  /** Unit xz direction of the current / last move (blob stretch, mouth side, droplet trail). */
  moveDir: [number, number];
  rig: CreatureRig | null;
  rigKey: string;
  /** Attachment prop keys currently placed for this blob. */
  attached: Set<string>;
  /** Last written body centre/scale (for attachments and the scene). */
  centerY: number;
  scale: number;
  /** Body radius (board units) for attachments, splashes and labels. */
  radius: number;
  /** Ground footprint of the posed body (centre and half extents along/across the heading, board units). */
  footX: number;
  footZ: number;
  footL: number;
  footW: number;
  /** Reach of the body surface along `moveDir` (board units): where a blob's leading mouth sits. */
  front: number;
  /** Idle glances of the eyes: seconds to the next one and the point looked at (null = ahead). */
  gazeT: number;
  gaze: Vector3 | null;
  labelAlpha: number;
}

/** Another body that carries a board creature's parts (world transform of its ground-contact frame). */
export interface CarrierBody {
  matrixWorld: Matrix4;
  params: BlobParams;
  /** Body origin above the ground-contact point (world units). */
  standY: number;
  scale: number;
  jiggle: number;
  visible: boolean;
}

export interface BoardBlobsOptions {
  zone: ZoneId;
  layout: BoardLayout;
  palette: BoardPalette;
  octaves: number;
  shadowLayer: number;
  capacity?: number;
  /** Raymarch the non-star-shaped archetypes (WebGPU + Hoch); otherwise every body is the jiggle mesh. */
  raymarch?: boolean;
}

/** Merge in progress on a settled creature: the child's rig waits (parts at scale 0) until the swap. */
interface MergeFx {
  settled: BlobVisual;
  child: { spec: CreatureSpec; rig: CreatureRig } | null;
  choreo: CreatureMergeChoreo | null;
  retired: CreatureRig[];
  swapped: boolean;
}

const _m = new Matrix4();
const _inv = new Matrix4();
const _parent = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _v = new Vector3();
const _up = new Vector3(0, 1, 0);
const _z = new Vector3(0, 0, 1);
const _hip: Vec3 = [0, 0, 0];
const _head: Vec3 = [0, 0, 0];
const _fwd: Vec3 = [0, 0, 1];
const LIGHT_CAMERA = new Vector3(-0.66, 0.6, 0.5).normalize();
/** Resting squash: bodies sit slightly heavy on their plate. */
const REST_SQUASH = -0.07;
/** Shadow proxies per creature: posed body spheres plus one per leg. */
const PROXIES_PER_CREATURE = 18;
/**
 * Draw calls the board aims for in its main pass (plateau, plates, props, bodies, coats, parts): creature
 * parts get what the rest leaves (see `budgetSpec`).
 */
export const BOARD_DC_TARGET = 30;
/** Kept free inside the target: the traced mouths' draw and one for particle bursts. */
const DC_RESERVE = 2;
/** Keep order of part slots when the board's part draw-call budget is tight (legs always stay). */
const SLOT_PRIORITY: Record<string, number> = { leg: 100, eye: 90, horn: 60, ear: 55, crest: 50, tail: 45, wing: 40, trunk: 35, tooth: 30 };
/**
 * Draw-call value of a part module on a crowded board (creatures served per draw call × weight): the
 * features that make a species readable from above first — a duck's beak above all, the REX crest, ears and
 * horns.
 */
const PART_WEIGHT: Record<string, number> = { crest: 2.5, ear: 2, horn: 2, tail: 1.2, wing: 1, trunk: 1, tooth: 1 };
const BEAK_WEIGHT = 10;
/** Share of the part budget the eye modules may take before the rarer eye modules give way to a shared one. */
const EYE_SHARE = 0.7;
/** Archetype bodies need parts (legs, eyes); amoebae stay blobs (their violet core is a blob motif). */
const ARCHETYPE_KINDS: ReadonlySet<Blob['kind']> = new Set(['normal', 'line', 'burst', 'stray']);

/** Blob world scale growth beyond tier 7: the big ones overflow their cell. */
function blobOverflow(tier: number): number {
  return tier <= 7 ? 1 : 1 + 0.08 * (tier - 7);
}

/**
 * The creatures on the board: blobs as jiggle-mesh bodies (one instanced draw), species animals on the mesh
 * path (`BoardMeshBodies`: skinned species meshes shared across tiers, fur fins/shells and feather cards on
 * their own block — Hoch and Mobil), smooth sphere proxies on the shadow layer (posed body spheres and legs)
 * so every creature throws a razor shadow, tier badges, modular parts from the CreaturePool within the
 * board's draw-call target (`BOARD_DC_TARGET`, planned per level: eyes first) and per-state attachments:
 * ice shards for crusted blobs, "zzz" dots and a closed lid for sleepers, orbiting dots for charged
 * (line/burst) blobs, a shifting violet core for amoebae, an ink mouth that opens on the leading side;
 * strays are rust-tinted. From tier 5 the lines turn into their archetype (quadruped/snake, REX from 6,
 * heavy from 7) and fill their cell; from tier 8 they overflow it. Blob ids are stable, so they key
 * everything.
 */
export class BoardBlobs {
  readonly group = new Group();
  readonly mesh: InstancedMesh;
  /** Raymarch bodies (null when the backend/preset draws everything as meshes). */
  readonly meshA: InstancedMesh | null = null;
  /** Species animals as skinned meshes with their coats (own block; null when unavailable). */
  readonly meshBodies: BoardMeshBodies | null = null;
  readonly proxies: InstancedMesh;
  readonly visuals = new Map<number, BlobVisual>();
  readonly driver = new SpringJiggle();
  readonly uniforms: BlobShadingUniforms;
  private readonly block: BlobParamBlock;
  private readonly blockA: BlobParamBlock | null = null;
  private readonly freeSlots: number[] = [];
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly scaleCache = new Map<number, number>();
  private readonly merges = new Map<number, MergeFx>();
  /** Part pools by mesh (resolved once through the public `poolFor`) for the draw-call trim. */
  private readonly partPools = new Map<object, PartPool>();
  private pool: CreaturePool | null = null;
  private library: ModuleLibrary | null = null;
  private rules: GenomeRules | null = null;
  private creatureMode: CreatureMode = 'none';
  /** A creature rig that left the board and now follows another body (the flow hero). */
  private carried: CreatureRig | null = null;
  private carrier: CarrierBody | null = null;
  /** Global pop multiplier (board appears/disappears). */
  globalPop = 1;
  /** Board-local xz direction away from the sun (contact shadows lean that way). */
  readonly awayDir = new Vector3(-0.7, 0, 0.4);
  /** Mobil preset: mesh bodies only, one noise octave, fewer part draw calls, sockets traced every other frame. */
  private mobile: boolean;
  private readonly quality: ReturnType<typeof createBlobQualityUniforms>;
  /** Camera position in board-local space (updated every frame; leaps aim at it). */
  readonly cameraLocal = new Vector3(0, 6, 4);
  showLabels = true;
  /** True for a frame in which a creature's shadow caster moved (the scene refreshes the shadow map). */
  castersMoved = false;
  /** A walker's foot landed (board-local x, z; strength ≈ 0.3 trot … 1.2 stomp): the board puffs dust. */
  onFootfall: ((x: number, z: number, strength: number, v: BlobVisual) => void) | null = null;
  /** Draw calls of everything but bodies and parts (plateau, plates, props, labels) — set by the renderer. */
  otherDrawCalls: (() => number) | null = null;
  /** Body draw calls the current level will need (planned at load, refreshed per move). */
  private plannedBodyDc = 0;
  /** Pool keys of the part modules the level plans with (reserved in the part budget). */
  private plannedKeys = new Set<string>();
  /** Crowded boards: eye modules that give way to a shared one (asset → substitute). */
  private eyeSubstitutes = new Map<string, string>();
  /** The shared eye module of a crowded board (kept across re-plans while it is on the board). */
  private sharedEye: string | null = null;
  /** Resolved creatures by tier/seed for planning and preparation (not for rigs). */
  private readonly rawSpecs = new Map<string, CreatureSpec | null>();
  /**
   * Background pipeline compiler (the scene's `renderer.compileAsync` for this board, WebGPU): species
   * meshes and part modules prepared ahead are compiled before their first draw instead of on it (every new
   * instanced mesh builds its node state once — ≈ 60 ms for a species body).
   */
  compiler: ((root: Object3D) => Promise<void>) | null = null;
  private compilePending = false;
  private compiling = false;
  readonly capacity: number;

  constructor(readonly options: BoardBlobsOptions) {
    // 36 × BLOB_STRIDE vec4s = 16 128 B: the largest block that fits WebGL2's 16 KB uniform-block limit
    // (a 6×6 board full of blobs). Blobs beyond that stay slot-less (not drawn) instead of throwing.
    this.capacity = Math.min(options.capacity ?? 36, 36);
    this.group.name = 'board-blobs';
    this.block = new BlobParamBlock(this.capacity);
    this.uniforms = createBlobShadingUniforms();
    const quality = createBlobQualityUniforms();
    this.mobile = options.octaves < 2;
    applyBlobQuality(quality, this.mobile ? BLOB_QUALITY_MOBILE : BLOB_QUALITY_HIGH);
    this.quality = quality;
    const b = createJiggleBlobMesh(this.block, { uniforms: this.uniforms, quality });
    this.mesh = b.mesh;
    this.mesh.name = 'board-blob-bodies';
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.disposables.push(b.material, b.glyph, b.mesh.geometry);
    if (options.raymarch) {
      try {
        this.blockA = new BlobParamBlock(this.capacity);
        const a = createRaymarchBlobMesh(this.blockA, { uniforms: this.uniforms, quality });
        this.meshA = a.mesh;
        this.meshA.name = 'board-blob-bodies-raymarch';
        this.meshA.castShadow = false;
        this.meshA.receiveShadow = false;
        this.meshA.count = 0;
        this.disposables.push(a.material, a.mesh.geometry);
      } catch {
        this.blockA = null;
        this.meshA = null;
      }
    }
    try {
      this.meshBodies = new BoardMeshBodies(this.capacity, this.uniforms, quality, b.glyph, this.mobile);
      this.meshBodies.onNewMesh = () => {
        this.compilePending = true;
      };
      this.meshBodies.onSpec = (spec) => this.preparePools(spec);
      this.disposables.push(this.meshBodies);
    } catch {
      this.meshBodies = null;
    }
    for (let i = this.capacity - 1; i >= 0; i--) this.freeSlots.push(i);

    const proxyGeo = new SphereGeometry(1, 12, 8);
    const proxyMat = new MeshBasicMaterial({ color: '#000000' });
    this.proxies = new InstancedMesh(proxyGeo, proxyMat, this.capacity * PROXIES_PER_CREATURE);
    this.proxies.name = 'board-blob-shadow-proxies';
    this.proxies.layers.set(options.shadowLayer);
    this.proxies.castShadow = true;
    this.proxies.receiveShadow = false;
    this.proxies.frustumCulled = false;
    this.proxies.instanceMatrix.setUsage(DynamicDrawUsage);
    this.proxies.count = 0;
    this.disposables.push(proxyGeo, proxyMat);
    this.group.add(this.mesh, this.proxies);
    if (this.meshA) this.group.add(this.meshA);
    if (this.meshBodies) this.group.add(this.meshBodies.group);
  }

  /** Enables modular creature parts (needs the loaded module library and the genome rules). */
  setCreatures(library: ModuleLibrary | null, rules: GenomeRules | null, mode: CreatureMode): void {
    this.creatureMode = library && rules ? mode : 'none';
    if (library && rules && !this.pool) {
      try {
        this.pool = new CreaturePool(library, this.uniforms, { capacity: 128 });
        this.pool.group.name = 'board-creature-parts';
        this.group.add(this.pool.group);
      } catch {
        this.pool = null;
        this.creatureMode = 'none';
      }
    }
    this.library = library;
    this.rules = rules;
    this.scaleCache.clear();
    // The board may already hold its level (the modules arrived late): plan its body draws before the rigs.
    if (this.creatureMode !== 'none' && this.visuals.size > 0) this.plan(this.visuals.values());
    for (const v of this.visuals.values()) this.refreshRig(v, true);
    // Species meshes of the zone are built in the background (one per frame) before the first level needs them.
    this.prepareZone();
  }

  // ---------- mesh path preparation ----------

  /** Resolves the creature a blob of `tier` seeded `seed` becomes (archetypes; walkers without legs stay blobs). */
  private specOf(tier: number, seed: number, archetypes = true): CreatureSpec | null {
    const rules = this.rules;
    if (!rules) return null;
    const key = `${tier}|${seed}|${archetypes ? 'a' : 'b'}`;
    const hit = this.rawSpecs.get(key);
    if (hit !== undefined) return hit;
    let spec: CreatureSpec | null = null;
    try {
      spec = resolveCreature(creatureGenome(this.options.zone, tier, seed), rules, { archetypes });
      const walker = spec.bodyType === 'quadruped' || spec.bodyType === 'biped' || spec.bodyType === 'heavy';
      if (walker && (spec.skeleton.legs?.length ?? 0) === 0) spec = null;
    } catch {
      spec = null;
    }
    if (this.rawSpecs.size > 512) this.rawSpecs.clear();
    this.rawSpecs.set(key, spec);
    return spec;
  }

  /**
   * Body draw calls of a set of creatures: one per shared species mesh (estimated by species shape), the coat
   * passes of the preset, the jiggle mesh for blobs and the raymarch mesh.
   */
  private bodyDc(shapes: Set<string>, fur: boolean, feather: boolean, jiggle: boolean, ray: boolean): number {
    const shells = !this.mobile && (this.meshBodies?.shells ?? false);
    const coats = (fur ? (shells ? 2 : 1) : 0) + (feather && !this.mobile ? 1 : 0);
    return shapes.size + coats + (jiggle ? 1 : 0) + (ray ? 1 : 0);
  }

  /** Body draw calls of the creatures adopted right now. */
  private bodyDcNow(): number {
    const shapes = new Set<string>();
    let fur = false;
    let feather = false;
    let jiggle = false;
    let ray = false;
    for (const v of this.visuals.values()) {
      const m = v.meshSpec;
      if (m) {
        shapes.add(`${m.species}|${m.legStyle}|${m.body.spheres.length}|${m.tier}`);
        if (m.skin.coat === 'fur') fur = true;
        else if (m.skin.coat === 'feather') feather = true;
      } else if (v.raymarch) ray = true;
      else jiggle = true;
    }
    return this.bodyDc(shapes, fur, feather, jiggle, ray);
  }

  /** Pool keys (`module#segment#prim`: one draw call each) of a part module. */
  private moduleKeys(asset: string): string[] {
    const m = this.library?.get(asset);
    if (!m) return [];
    const out: string[] = [];
    m.segments.forEach((seg, si) => seg.prims.forEach((_p, pi) => out.push(`${m.id}#${si}#${pi}`)));
    return out;
  }

  /** Module draw calls the parts may use: what the board's other draws leave of the target. */
  private partBudget(): number {
    const cap = this.mobile ? 12 : 16;
    const others = this.otherDrawCalls?.() ?? 5;
    const bodies = Math.max(this.plannedBodyDc, this.bodyDcNow());
    return Math.max(4, Math.min(cap, BOARD_DC_TARGET - DC_RESERVE - others - bodies));
  }

  /**
   * Plans a level's draws before its creatures are resolved (load, and per move with the state after it):
   * the body draws (one per species shape, coats, jiggle mesh) and which part modules fit the rest of the
   * target — eye modules first (most creatures per draw call first), then the others the same way. On a
   * crowded Hoch board whose eyes do not fit, the fur shells step back (the fins still carry the coat).
   * `budgetSpec` then keeps the planned modules for every creature and admits others only into what is left.
   */
  private plan(blobs: Iterable<{ tier: number; seed: number; kind: Blob['kind'] }>): void {
    const shapes = new Set<string>();
    let fur = false;
    let feather = false;
    let jiggle = false;
    const specs: CreatureSpec[] = [];
    for (const b of blobs) {
      const arche = ARCHETYPE_KINDS.has(b.kind);
      const spec = this.specOf(b.tier, b.seed, arche);
      if (spec) specs.push(spec);
      if (spec && this.meshBodies && arche && spec.bodyType !== 'blob' && meshBodyEligible(spec)) {
        shapes.add(`${spec.species}|${spec.legStyle}|${spec.body.spheres.length}`);
        if (spec.skin.coat === 'fur') fur = true;
        else if (spec.skin.coat === 'feather') feather = true;
      } else jiggle = true;
    }
    const mb = this.meshBodies;
    if (mb) mb.shells = true;
    this.plannedBodyDc = this.bodyDc(shapes, fur, feather, jiggle, false);
    // Part modules with the creatures they serve.
    interface ModuleUse {
      asset: string;
      keys: string[];
      users: number;
      eye: boolean;
      weight: number;
    }
    const assets = new Map<string, ModuleUse>();
    for (const spec of specs) {
      const seen = new Set<string>();
      for (const p of spec.parts) {
        if (p.role !== null || seen.has(p.asset)) continue;
        seen.add(p.asset);
        let e = assets.get(p.asset);
        if (!e) {
          const keys = this.moduleKeys(p.asset);
          if (keys.length === 0) continue;
          e = { asset: p.asset, keys, users: 0, eye: p.slot === 'eye', weight: p.asset.startsWith('beak') ? BEAK_WEIGHT : (PART_WEIGHT[p.slot] ?? 1) };
          assets.set(p.asset, e);
        }
        e.users++;
      }
    }
    let budget = this.partBudget();
    this.eyeSubstitutes = new Map();
    const all = new Set<string>();
    for (const e of assets.values()) for (const k of e.keys) all.add(k);
    if (all.size <= budget) {
      // Everything fits: every creature keeps its own modules.
      this.plannedKeys = all;
      this.sharedEye = null;
      return;
    }
    // Modules already on the board stay first in line (a re-plan after a move must not swap features of the
    // creatures that remain).
    const live = this.livePoolKeys();
    const isLive = (e: ModuleUse): boolean => e.keys.every((k) => live.has(k));
    const byValue = (a: ModuleUse, b: ModuleUse, va: number, vb: number): number => Number(isLive(b)) - Number(isLive(a)) || vb - va;
    // Eyes first: the most used full eye (≥ 3 prims) is the shared one (the current one while it is still on
    // the board), the others follow by creatures per draw call within a share of the budget; the eye modules
    // left over give way to the shared one (a crowded board's creatures share their eyes, none goes blind).
    const eyes = [...assets.values()].filter((e) => e.eye).sort((a, b) => byValue(a, b, a.users / a.keys.length, b.users / b.keys.length));
    const full = eyes.filter((e) => e.keys.length >= 3);
    const current = eyes.find((e) => e.asset === this.sharedEye && isLive(e));
    const primary = current ?? (full.length > 0 ? full : eyes).reduce<ModuleUse | null>((best, e) => (!best || e.users > best.users ? e : best), null);
    const eyeCap = Math.max(primary?.keys.length ?? 0, Math.floor(budget * EYE_SHARE));
    const admitted: ModuleUse[] = primary ? [primary] : [];
    let eyeDc = primary?.keys.length ?? 0;
    for (const e of eyes) {
      if (e === primary || eyeDc + e.keys.length > eyeCap) continue;
      admitted.push(e);
      eyeDc += e.keys.length;
    }
    for (const e of eyes) if (primary && !admitted.includes(e)) this.eyeSubstitutes.set(e.asset, primary.asset);
    this.sharedEye = this.eyeSubstitutes.size > 0 ? (primary?.asset ?? null) : null;
    if (mb && fur && !this.mobile && budget < eyeDc) {
      // Not even the shared eyes fit: the fur shells give their draw call to them (the fins keep the coat).
      mb.shells = false;
      this.plannedBodyDc -= 1;
      budget = this.partBudget();
    }
    const keys = new Set<string>();
    for (const e of admitted) for (const k of e.keys) keys.add(k);
    const rest = [...assets.values()].filter((e) => !e.eye).sort((a, b) => byValue(a, b, (a.users * a.weight) / a.keys.length, (b.users * b.weight) / b.keys.length));
    for (const e of rest) {
      const need = e.keys.filter((k) => !keys.has(k));
      if (keys.size + need.length <= budget) for (const k of need) keys.add(k);
    }
    this.plannedKeys = keys;
  }

  /**
   * Queues the species meshes a level needs ahead of time: the merge results the next blob ids produce
   * (every present tier + 1; the creatures on the board are meshed when they are adopted). Cheap — the
   * specs resolve lazily in `pumpPrepare`.
   */
  prepareLevel(state: LevelState): void {
    const m = this.meshBodies;
    if (!m || !this.rules || this.creatureMode === 'none') {
      this.plannedBodyDc = 0;
      this.plannedKeys = new Set();
      return;
    }
    const blobs: Array<{ tier: number; seed: number; kind: Blob['kind'] }> = [];
    for (const b of state.cells) if (b) blobs.push({ tier: b.tier, seed: b.id * 31 + 7, kind: b.kind });
    this.plan(blobs);
    const tiers = new Set<number>();
    for (const b of state.cells) {
      if (!b || !ARCHETYPE_KINDS.has(b.kind)) continue;
      if (b.tier >= 4) tiers.add(b.tier + 1);
      if (b.tier >= 5) tiers.add(b.tier);
    }
    const seq = state.blobSeq;
    for (let id = seq + 1; id <= seq + 12; id++) {
      for (const t of tiers) {
        const seed = id * 31 + 7;
        m.enqueue(`${t}|${seed}`, () => this.specOf(t, seed));
      }
    }
  }

  /**
   * Queues every species of the zone (tiers 5–11): call while the board waits (splash, map). Middle tiers
   * first: a shared mesh built from a tier-8 body fits the tiers on both sides best.
   */
  prepareZone(): void {
    const m = this.meshBodies;
    if (!m || !this.rules || this.creatureMode === 'none') return;
    for (const t of [8, 7, 9, 6, 10, 5, 11]) {
      for (let id = 1; id <= 24; id++) {
        const seed = id * 31 + 7;
        m.enqueue(`${t}|${seed}`, () => this.specOf(t, seed));
      }
    }
  }

  /** Works on the prepare queue (see `BoardMeshBodies.pump`); true while work is left. */
  pumpPrepare(budgetMs: number, allowMesh = true): boolean {
    return this.meshBodies?.pump(budgetMs, allowMesh) ?? false;
  }

  /** Part pools (one instanced draw per module segment prim) for a creature that may show up soon. */
  private preparePools(spec: CreatureSpec): void {
    const pool = this.pool;
    const library = this.library;
    if (!pool || !library) return;
    for (const p of spec.parts) {
      const m = library.get(p.asset);
      if (!m) continue;
      m.segments.forEach((seg, si) =>
        seg.prims.forEach((_prim, pi) => {
          const before = pool.group.children.length;
          pool.poolFor(m, si, pi);
          if (pool.group.children.length > before) this.compilePending = true;
        }),
      );
    }
  }

  /**
   * Compiles what was prepared since the last call (new species meshes, part pools) in the background: they
   * are shown for the compiler's synchronous traversal only, the node builds and pipelines follow
   * asynchronously. One compile in flight at a time.
   */
  compileAhead(): void {
    const compile = this.compiler;
    if (!this.compilePending || this.compiling || !compile) return;
    this.compilePending = false;
    const shown: Object3D[] = [];
    const show = (o: Object3D): void => {
      if (o.visible) return;
      o.visible = true;
      shown.push(o);
    };
    if (this.meshBodies) for (const o of this.meshBodies.meshes) show(o);
    if (this.pool) for (const o of this.pool.group.children) show(o);
    this.compiling = true;
    let done: Promise<void>;
    try {
      done = compile(this.group);
    } catch {
      done = Promise.resolve();
    }
    for (const o of shown) o.visible = false;
    void done
      .catch(() => undefined)
      .then(() => {
        this.compiling = false;
      });
  }

  /**
   * Pipeline warm-up before `renderer.compileAsync`: the skinned species material and the coat passes of the
   * preset get one collapsed instance each (the next frame resets them). False when nothing could be warmed.
   */
  warmPipelines(): boolean {
    const m = this.meshBodies;
    if (!m) return false;
    return m.warm(this.capacity - 1, () => {
      for (let id = 1; id <= 24; id++) {
        const spec = this.specOf(7, id * 31 + 7);
        if (spec && meshBodyEligible(spec)) return spec;
      }
      return null;
    });
  }

  get partDrawCalls(): number {
    const pool = this.pool;
    if (!pool) return 0;
    // Creatures v3 pools draw every traced mouth in one extra call.
    const mouths = (pool as { mouths?: { mesh?: { visible: boolean } } }).mouths;
    return pool.drawCalls + (mouths?.mesh?.visible ? 1 : 0);
  }

  /** Draw calls of the bodies (jiggle mesh, raymarch mesh while used, species meshes and their coats). */
  get bodyDrawCalls(): number {
    return (this.mesh.count > 0 ? 1 : 0) + (this.meshA && this.meshA.count > 0 ? 1 : 0) + (this.meshBodies?.drawCalls ?? 0);
  }

  /** World scale of a blob body of a tier on this board (blob units → board units). */
  worldScale(tier: number): number {
    const cached = this.scaleCache.get(tier);
    if (cached !== undefined) return cached;
    let s = scaleForTier(tier);
    if (this.rules) {
      try {
        s = resolveCreature(creatureGenome(this.options.zone, tier, 1), this.rules).worldScale;
      } catch {
        s = scaleForTier(tier);
      }
    }
    const out = s * this.options.layout.cell * blobOverflow(tier);
    this.scaleCache.set(tier, out);
    return out;
  }

  // ---------- visuals ----------

  private baseParamsFallback(): BlobParams {
    return genomeFor(this.options.zone, 1, 1);
  }

  private baseParams(v: BlobVisual): BlobParams {
    if (v.spec) return v.spec.body;
    return genomeFor(this.options.zone, v.tier, v.seed);
  }

  /** Body parameters with the state overrides (stray tint, amoeba milk, ice, sleep). */
  private paramsFor(v: BlobVisual): BlobParams {
    const pal = this.options.palette;
    let p = this.baseParams(v);
    if (v.kind === 'stray') {
      p = { ...p, baseColor: mixHex(p.baseColor, pal.rust, 0.72), innerColor: mixHex(p.innerColor, pal.rustDeep, 0.6), rimColor: mixHex(p.rimColor, pal.rust, 0.5), breathHz: p.breathHz * 1.6 };
    }
    if (v.kind === 'amoeba') {
      p = { ...p, baseColor: pal.paper, innerColor: pal.violet, rimColor: mixHex(pal.paper, pal.violet, 0.35), highlightColor: '#ffffff', translucency: 1, gloss: 0.45, breathHz: 0.3, noiseAmp: p.noiseAmp * 1.5 };
    }
    if (v.frozen) {
      p = { ...p, baseColor: mixHex(p.baseColor, pal.ice, 0.68), innerColor: mixHex(p.innerColor, pal.iceDeep, 0.55), rimColor: mixHex(pal.ice, '#ffffff', 0.3), highlightColor: '#ffffff', gloss: 0.95, breathHz: 0.04 };
    }
    if (v.sleeper) {
      p = { ...p, baseColor: mixHex(p.baseColor, pal.ink, 0.2), innerColor: mixHex(p.innerColor, pal.ink, 0.3), breathHz: 0.16, eye: { ...p.eye, size: 0 } };
    }
    // Sleepers close their eyes: modular eyes are hidden too (the lid attachment covers the painted slit).
    if (v.rig) {
      if (v.sleeper) v.rig.hiddenSlots.add('eye');
      else v.rig.hiddenSlots.delete('eye');
    }
    const hasEyeParts = v.rig?.parts.some((part) => part.spec.slot === 'eye') ?? false;
    if (hasEyeParts && !v.sleeper) p = { ...p, eye: { ...p.eye, size: 0 } };
    return p;
  }

  /** Re-derives the body parameters after a state flag changed (thaw, wake, calm). */
  refreshParams(v: BlobVisual): void {
    v.genome = this.paramsFor(v);
    this.driver.configure(v.id, { viscosity: v.genome.viscosity });
  }

  private wantsRig(v: BlobVisual): boolean {
    if (!this.pool || !this.rules || !this.library) return false;
    if (this.creatureMode === 'none') return false;
    if (this.creatureMode === 'strays') return v.kind === 'stray';
    return true;
  }

  /** Pool keys (`module#segment#prim`) that currently hold a live part instance. */
  private livePoolKeys(): Set<string> {
    const out = new Set<string>();
    const pool = this.pool;
    const library = this.library;
    if (!pool || !library) return out;
    for (const child of pool.group.children) {
      let pp = this.partPools.get(child);
      if (!pp) {
        const [id, seg, prim] = child.name.split('#');
        const module = id ? library.get(id) : undefined;
        if (!module || seg === undefined || prim === undefined) continue;
        pp = pool.poolFor(module, Number(seg), Number(prim));
        if (pp.mesh !== child) continue;
        this.partPools.set(child, pp);
      }
      if (pp.used > 0) out.add(child.name);
    }
    return out;
  }

  /**
   * Draw-call budget for parts: every module segment is its own instanced draw, so a board full of different
   * horns, ears and eyes adds up. Parts whose module is already on the board are free; new modules are
   * admitted by slot priority (legs always, then eyes, horns, ears, …) while the budget lasts. A creature
   * whose eye module does not fit keeps its painted eye.
   */
  private budgetSpec(spec: CreatureSpec): CreatureSpec {
    if (!this.library || spec.parts.length === 0) return spec;
    // Crowded board: rarer eye modules give way to the shared one (see `plan`).
    const subs = this.eyeSubstitutes;
    const source = subs.size > 0 && spec.parts.some((p) => p.slot === 'eye' && subs.has(p.asset)) ? spec.parts.map((p) => (p.slot === 'eye' && subs.has(p.asset) ? { ...p, asset: subs.get(p.asset)! } : p)) : spec.parts;
    // Parts get what the board's other draws leave of the target: the level's planned modules (see `plan`)
    // are reserved, other modules fit into the rest (creatures whose eye modules do not fit keep painted eyes).
    const budget = this.partBudget();
    const reserved = this.livePoolKeys();
    for (const k of this.plannedKeys) reserved.add(k);
    const order = [...source].sort((a, b) => (b.role !== null ? 1000 : SLOT_PRIORITY[b.slot] ?? 0) + b.since * 0.01 - ((a.role !== null ? 1000 : SLOT_PRIORITY[a.slot] ?? 0) + a.since * 0.01));
    const kept = new Set<PartSpec>();
    for (const p of order) {
      const need = this.moduleKeys(p.asset).filter((k) => !reserved.has(k));
      if (p.role !== null || need.length === 0 || reserved.size + need.length <= budget) {
        kept.add(p);
        for (const k of need) reserved.add(k);
      }
    }
    if (kept.size === spec.parts.length && source === spec.parts) return spec;
    const parts = source.filter((p) => kept.has(p));
    let body = spec.body;
    if (!parts.some((p) => p.slot === 'eye') && spec.parts.some((p) => p.slot === 'eye')) {
      // Eye modules dropped: the painted eye of the body comes back.
      try {
        const painted = buildBody(spec.bodyType, spec.zone, spec.tier, spec.genome.seed, spec.material).params.eye;
        body = { ...body, eye: painted };
      } catch {
        body = spec.body;
      }
    }
    return { ...spec, parts, body, paintedEye: !parts.some((p) => p.slot === 'eye') };
  }

  /** Resolves the creature of a blob (archetype when parts are available) and its rig. */
  private resolveSpec(tier: number, seed: number, kind: Blob['kind']): { spec: CreatureSpec; rig: CreatureRig } | null {
    if (!this.pool || !this.rules) return null;
    const archetypes = ARCHETYPE_KINDS.has(kind);
    let spec = this.budgetSpec(resolveCreature(creatureGenome(this.options.zone, tier, seed), this.rules, { archetypes }));
    let rig = this.pool.createRig(spec);
    // Walkers need legs — kneaded from the body (skeleton.legs) or leg modules; otherwise the blob body.
    const walker = spec.bodyType === 'quadruped' || spec.bodyType === 'biped' || spec.bodyType === 'heavy';
    const kneaded = (spec.skeleton.legs?.length ?? 0) > 0;
    if (walker && !kneaded && !rig.parts.some((p) => p.spec.slot === 'leg' && p.spec.role !== null)) {
      rig.dispose();
      spec = this.budgetSpec(resolveCreature(creatureGenome(this.options.zone, tier, seed, undefined, 'blob'), this.rules));
      rig = this.pool.createRig(spec);
    }
    return { spec, rig };
  }

  /** Applies a creature (spec + rig) to a visual: body type, fit, drive, raymarch, skin pattern. */
  private adopt(v: BlobVisual, spec: CreatureSpec | null, rig: CreatureRig | null): void {
    v.spec = spec;
    v.rig = rig;
    v.body = spec?.bodyType ?? 'blob';
    v.meshSpec = null;
    const skin = spec?.skin;
    v.pattern = skin && skin.pattern !== 'none' ? makePattern(skin.pattern, spec.body.baseColor, { scale: skin.patternScale, rotation: skin.patternRotation }) : null;
    if (spec && rig && v.body !== 'blob') {
      const coiled = v.body === 'snake';
      v.fit = archetypeFit(spec, this.options.layout.pitch, coiled);
      const yaw = v.drive?.yaw ?? defaultYaw(v.id);
      v.drive = new CreatureDrive(spec, legDefsFor(spec, rig), { seed: v.seed, scale: v.fit, coilAllowed: coiled, yaw });
      // Walkers are drawn every frame with a new pose: trace their sockets every other frame on phones.
      rig.traceInterval = this.mobile ? 2 : 1;
      // Species animals are skinned meshes (Hoch and Mobil); the shared species mesh is prepared ahead.
      v.meshSpec = this.meshBodies?.specFor(spec) ?? null;
    } else {
      v.fit = this.worldScale(v.tier);
      v.drive = null;
    }
    v.raymarch = !v.meshSpec && this.wantsRaymarch(spec);
    v.genome = this.paramsFor(v);
    this.driver.configure(v.id, { viscosity: v.genome.viscosity });
  }

  /**
   * Raymarch only where it is needed and shades right: bodies the mesh trace cannot follow (`skeleton.raymarch`)
   * that the mesh path does not take either, never snakes (their coil) or gas bodies (both render dark
   * there), never in the Mobil preset.
   */
  private wantsRaymarch(spec: CreatureSpec | null): boolean {
    return !!(spec && spec.skeleton.raymarch && this.blockA && !this.mobile && spec.bodyType !== 'snake' && spec.material !== 'gas');
  }

  /**
   * Quality switch at runtime (the governor dropping to Mobil on a phone): noise octaves, mesh bodies only,
   * the part budget for new creatures and the socket trace interval follow.
   */
  setQuality(mobile: boolean): void {
    if (mobile === this.mobile) return;
    this.mobile = mobile;
    applyBlobQuality(this.quality, mobile ? BLOB_QUALITY_MOBILE : BLOB_QUALITY_HIGH);
    if (this.meshBodies) this.meshBodies.mobile = mobile;
    for (const v of this.visuals.values()) {
      v.raymarch = !v.meshSpec && this.wantsRaymarch(v.spec);
      if (v.rig && v.drive) v.rig.traceInterval = mobile ? 2 : 1;
    }
  }

  private refreshRig(v: BlobVisual, force = false): void {
    const key = `${v.tier}:${v.kind}`;
    if (!force && v.rigKey === key && (v.rig !== null) === this.wantsRig(v)) return;
    v.rig?.dispose();
    v.rig = null;
    v.rigKey = key;
    if (!this.wantsRig(v)) {
      this.adopt(v, null, null);
      return;
    }
    let made: { spec: CreatureSpec; rig: CreatureRig } | null = null;
    try {
      made = this.resolveSpec(v.tier, v.seed, v.kind);
    } catch {
      made = null;
    }
    this.adopt(v, made?.spec ?? null, made?.rig ?? null);
  }

  private applyFlags(v: BlobVisual, blob: Blob): boolean {
    const changed =
      v.tier !== blob.tier ||
      v.kind !== blob.kind ||
      v.axis !== blob.axis ||
      v.frozen !== (blob.frozen === true) ||
      v.sleeper !== (blob.sleeper === true) ||
      v.caged !== (blob.caged === true) ||
      v.fogged !== (blob.hidden === true);
    v.tier = blob.tier;
    v.kind = blob.kind;
    v.axis = blob.axis;
    v.frozen = blob.frozen === true;
    v.sleeper = blob.sleeper === true;
    v.caged = blob.caged === true;
    v.fogged = blob.hidden === true;
    return changed;
  }

  makeVisual(blob: Blob, at: Coord): BlobVisual {
    const slot = this.freeSlots.pop() ?? -1;
    const [x, z] = this.options.layout.cellToLocal(at[0], at[1]);
    const v: BlobVisual = {
      id: blob.id,
      slot,
      tier: blob.tier,
      kind: blob.kind,
      axis: blob.axis,
      frozen: blob.frozen === true,
      sleeper: blob.sleeper === true,
      caged: blob.caged === true,
      fogged: blob.hidden === true,
      hidden: false,
      seed: blob.id * 31 + 7,
      spec: null,
      genome: genomeFor(this.options.zone, blob.tier, blob.id * 31 + 7),
      body: 'blob',
      fit: this.worldScale(blob.tier),
      drive: null,
      raymarch: false,
      meshSpec: null,
      pattern: null,
      x,
      z,
      lift: 0,
      pop: 1,
      squash: null,
      jiggle: 0,
      phase: (blob.id * 1.618) % (Math.PI * 2),
      yawTarget: null,
      yawDirect: false,
      bulge: -1,
      trumpet: 0,
      mouthRound: 0,
      squint: 0,
      pitch: 0,
      pitchBlend: 0,
      crouch: 0,
      stumble: 0,
      mouth: 0,
      coil: null,
      coilRadius: null,
      moveDir: [0, 1],
      rig: null,
      rigKey: '',
      attached: new Set(),
      centerY: 0,
      scale: 0,
      radius: 0.2,
      footX: x,
      footZ: z,
      footL: 0.2,
      footW: 0.2,
      front: 0.2,
      gazeT: 1 + ((blob.id * 0.61) % 1) * 3,
      gaze: null,
      labelAlpha: 1,
    };
    this.visuals.set(blob.id, v);
    this.refreshRig(v, true);
    this.driver.configure(v.id, { viscosity: v.genome.viscosity });
    return v;
  }

  /** Applies a blob's current tier/kind/flags to its visual (palette + rig follow). */
  setBlob(v: BlobVisual, blob: Blob): void {
    // A pending merge swaps to its prepared child (same tier) instead of resolving a second one.
    const fx = this.merges.get(v.id);
    if (fx && !fx.swapped && fx.child && fx.child.spec.tier === blob.tier) {
      this.swapMerge(v, blob);
      return;
    }
    const changed = this.applyFlags(v, blob);
    if (changed) this.refreshRig(v, true);
  }

  removeVisual(id: number, props: BoardProps): void {
    const v = this.visuals.get(id);
    if (!v) return;
    this.endMerge(v);
    if (v.slot >= 0) {
      this.block.hide(v.slot);
      this.blockA?.hide(v.slot);
      this.meshBodies?.hide(v.slot);
      this.freeSlots.push(v.slot);
    }
    this.driver.remove(id);
    v.rig?.dispose();
    v.rig = null;
    for (const key of v.attached) props.remove(key);
    v.attached.clear();
    this.visuals.delete(id);
  }

  /** Re-keys a visual after a merge (the settled blob continues as the result id). */
  rekey(from: number, to: number): void {
    const v = this.visuals.get(from);
    if (!v || from === to) return;
    this.visuals.delete(from);
    this.driver.remove(from);
    const fx = this.merges.get(from);
    if (fx) {
      this.merges.delete(from);
      this.merges.set(to, fx);
    }
    v.id = to;
    this.visuals.set(to, v);
    this.driver.configure(to, { viscosity: v.genome.viscosity });
  }

  get(id: number): BlobVisual | undefined {
    return this.visuals.get(id);
  }

  setHidden(id: number, hidden: boolean): void {
    const v = this.visuals.get(id);
    if (v) v.hidden = hidden;
  }

  /** Blob with the highest tier (ties: first found), or null. */
  topBlob(): { id: number; tier: number; local: Vector3 } | null {
    let best: BlobVisual | null = null;
    for (const v of this.visuals.values()) if (!best || v.tier > best.tier) best = v;
    return best ? { id: best.id, tier: best.tier, local: new Vector3(best.x, this.options.layout.top, best.z) } : null;
  }

  /** Blob the hero becomes when entering: same tier if possible, else the lowest tier. */
  entryBlob(heroTier: number): { id: number; tier: number; local: Vector3 } | null {
    let best: BlobVisual | null = null;
    for (const v of this.visuals.values()) {
      if (v.fogged || v.caged) continue;
      if (v.tier === heroTier) return { id: v.id, tier: v.tier, local: new Vector3(v.x, this.options.layout.top, v.z) };
      if (!best || v.tier < best.tier) best = v;
    }
    return best ? { id: best.id, tier: best.tier, local: new Vector3(best.x, this.options.layout.top, best.z) } : null;
  }

  /**
   * Detaches a blob's creature parts so they can follow another body (see `setCarrier`); the board visual
   * keeps drawing its body without parts. Returns false when the blob has no parts.
   */
  carry(id: number): boolean {
    const v = this.visuals.get(id);
    if (!v?.rig) return false;
    this.endMerge(v);
    this.dropCarried();
    this.carried = v.rig;
    v.rig = null;
    v.rigKey = '';
    return true;
  }

  /** The body the carried parts sit on this frame (null = hide them). */
  setCarrier(body: CarrierBody | null): void {
    this.carrier = body;
  }

  get carrying(): boolean {
    return this.carried !== null;
  }

  dropCarried(): void {
    this.carried?.dispose();
    this.carried = null;
    this.carrier = null;
  }

  /** Brings the visuals to the state without animation (load, rewind, after a timeline). */
  reconcile(state: LevelState, props: BoardProps): void {
    const seen = new Set<number>();
    const { w } = state.geo;
    state.cells.forEach((blob, i) => {
      if (!blob) return;
      seen.add(blob.id);
      const at: Coord = [i % w, Math.floor(i / w)];
      let v = this.visuals.get(blob.id);
      if (!v) v = this.makeVisual(blob, at);
      const [x, z] = this.options.layout.cellToLocal(at[0], at[1]);
      v.x = x;
      v.z = z;
      v.lift = 0;
      v.pop = 1;
      v.squash = null;
      v.crouch = 0;
      v.stumble = 0;
      v.mouth = 0;
      v.pitchBlend = 0;
      v.coil = null;
      v.coilRadius = null;
      v.yawDirect = false;
      v.bulge = -1;
      v.trumpet = 0;
      v.mouthRound = 0;
      v.squint = 0;
      this.setBlob(v, blob);
    });
    for (const id of [...this.visuals.keys()]) if (!seen.has(id)) this.removeVisual(id, props);
  }

  // ---------- merges ----------

  /**
   * Prepares the merge of `mover` into `settled`: the child creature (result tier) is resolved now, its parts
   * wait at scale 0; the choreography detaches the parents' parts and pops the child's (see `sampleMerge`,
   * `swapMerge`). Returns false when there are no parts to choreograph.
   */
  beginMerge(settled: BlobVisual, mover: BlobVisual | undefined, result: Blob): boolean {
    this.endMerge(settled);
    const fx: MergeFx = { settled, child: null, choreo: null, retired: [], swapped: false };
    if (this.wantsRig(settled) && this.pool && this.rules) {
      try {
        // The child is the result blob's own line (seeded by its id, as after a reload).
        const kids = this.resolveSpec(result.tier, result.id * 31 + 7, result.kind);
        if (kids) {
          fx.child = kids;
          // The child's species mesh (usually prepared during the fly-in) is looked up now, not at the swap.
          this.meshBodies?.specFor(kids.spec);
          if (settled.rig) fx.choreo = new CreatureMergeChoreo(settled.rig, mover?.rig ?? settled.rig, kids.rig, { seed: settled.id });
          else for (const p of kids.rig.parts) kids.rig.setChoreo(p.spec.id, { offset: [0, 0, 0], scale: 0, spin: 0 });
        }
      } catch {
        fx.child = null;
      }
    }
    this.merges.set(settled.id, fx);
    return fx.choreo !== null;
  }

  /** Choreography time of a merge (ms since the parents' parts start to detach). */
  sampleMerge(settled: BlobVisual, ms: number): void {
    const fx = this.merges.get(settled.id);
    fx?.choreo?.sample(ms);
    if (fx && !fx.choreo && fx.child && fx.swapped) {
      // No parents to detach: the child's parts pop on their own.
      const w = Math.min(1, Math.max(0, (ms - 300) / 150));
      const over = 1 + 0.32 * Math.sin(Math.PI * w) * (1 - 0.4 * w);
      for (const p of fx.child.rig.parts) fx.child.rig.setChoreo(p.spec.id, w >= 1 ? null : { offset: [0, 0.18 * (1 - w), 0], scale: w * w * (3 - 2 * w) * over, spin: 0 });
    }
  }

  /** The settled creature becomes the child (body type, rig, fit); the parents' rigs retire. */
  swapMerge(settled: BlobVisual, result: Blob): void {
    const fx = this.merges.get(settled.id);
    this.applyFlags(settled, result);
    settled.seed = result.id * 31 + 7;
    settled.rigKey = `${settled.tier}:${settled.kind}`;
    if (!fx || !fx.child) {
      this.refreshRig(settled, true);
      if (fx) fx.swapped = true;
      return;
    }
    if (fx.swapped) return;
    fx.swapped = true;
    if (settled.rig) fx.retired.push(settled.rig);
    const yaw = settled.drive?.yaw;
    settled.drive = null;
    this.adopt(settled, fx.child.spec, fx.child.rig);
    if (yaw !== undefined && settled.drive) (settled.drive as CreatureDrive).yaw = yaw;
    // The retired parents are shrunk away by now (or will be next frame): release their instances.
    for (const r of fx.retired) r.dispose();
    fx.retired.length = 0;
  }

  /** Ends a merge: the child's parts sit on their sockets, leftover rigs are released. */
  endMerge(v: BlobVisual): void {
    const fx = this.merges.get(v.id);
    if (!fx) return;
    this.merges.delete(v.id);
    fx.choreo?.reset();
    if (fx.child) {
      if (fx.swapped) fx.child.rig.clearChoreo();
      else fx.child.rig.dispose();
    }
    for (const r of fx.retired) r.dispose();
  }


  // ---------- frame ----------

  /**
   * Writes bodies, shadow proxies, badges, creature parts and attachments. `now` = board clock (s),
   * `gpuTime` = the value of three's `time` node this frame (the rigs sample the same breathing).
   */
  update(dt: number, camera: Camera, liftWorldQuat: Quaternion, liftWorldInv: Matrix4, props: BoardProps, labels: BoardLabels, now: number, gpuTime: number): void {
    this.driver.step(dt);
    const layout = this.options.layout;
    // Key light relative to the camera, in the board's local frame.
    camera.getWorldQuaternion(_q);
    _v.copy(LIGHT_CAMERA).applyQuaternion(_q);
    const inv = _q.copy(liftWorldQuat).invert();
    this.uniforms.lightDir.value.copy(_v.applyQuaternion(inv)).normalize();
    const camLocal = camera.getWorldQuaternion(new Quaternion()).premultiply(inv);
    camera.getWorldPosition(this.cameraLocal).applyMatrix4(liftWorldInv);

    let maxSlot = -1;
    let maxSlotA = -1;
    let proxyCount = 0;
    let moved = false;
    const ground = layout.top;
    const meshBodies = this.meshBodies;
    meshBodies?.begin();
    for (const v of this.visuals.values()) {
      v.jiggle = Math.max(0, v.jiggle - dt * 1.4);
      const visible = v.slot >= 0 && !v.hidden && !v.fogged && v.pop > 0.001 && this.globalPop > 0.001;
      if (!visible) {
        if (v.slot >= 0) {
          this.block.hide(v.slot);
          this.blockA?.hide(v.slot);
          meshBodies?.hide(v.slot);
        }
        if (v.rig) {
          v.rig.setBody({ params: v.genome, center: [v.x, -50, v.z], scale: 0.0001, time: gpuTime, surface: 'mesh' });
          v.rig.update(dt);
        }
        this.syncAttachments(v, props, now, false);
        continue;
      }
      const st = this.driver.get(v.id);
      const scale = v.fit * v.pop * this.globalPop;
      let center: Vec3;
      let params: BlobParams = v.genome;
      let dyn: BlobDynamics;
      const drive = v.drive;
      if (drive && v.spec) {
        // --- archetype: locomotion pose → posed spheres, legs by IK -------------------------------------
        if (Math.abs(drive.scale - scale) > 1e-5) drive.setScale(scale);
        const pose = drive.update(dt, {
          x: v.x,
          z: v.z,
          lift: v.lift,
          ground,
          yawTarget: v.yawTarget,
          pitch: v.pitch,
          pitchBlend: v.pitchBlend,
          crouch: v.crouch,
          stumble: v.stumble,
          mouth: v.mouth,
          coil: v.coil,
          coilRadius: v.coilRadius,
          yawDirect: v.yawDirect,
          bulge: v.bulge,
          trumpet: v.trumpet,
          mouthRound: v.mouthRound,
          squint: v.squint,
        });
        if (pose.moving || (drive.coil > 0.001 && drive.coil < 0.999)) moved = true;
        if (this.onFootfall) for (const f of drive.footfalls) this.onFootfall(f.x, f.z, f.strength, v);
        center = [pose.x, ground + pose.lift, pose.z];
        const posed = drive.posedParams(center);
        params = posed;
        if (v.genome !== v.spec.body) {
          // State tints (ice, sleep, stray) on top of the posed spheres.
          posed.baseColor = v.genome.baseColor;
          posed.innerColor = v.genome.innerColor;
          posed.rimColor = v.genome.rimColor;
          posed.highlightColor = v.genome.highlightColor;
          posed.gloss = v.genome.gloss;
          posed.breathHz = v.genome.breathHz;
          posed.eye = v.genome.eye;
        }
        // Springs: landings and pokes squash the whole body a little (the legs carry the rest).
        const sq = v.squash ?? { axis: st.axis, amount: st.amount * 0.55 };
        dyn = { squash: { axis: sq.axis, amount: sq.amount, taper: 0.35 }, jiggle: Math.max(v.jiggle, pose.jiggle), phase: v.phase, seed: v.id * 17 + 3, detail: 1 };
        const coat = v.spec.skin.coat;
        if (coat !== 'bare') dyn.material = coat;
        if (v.pattern) dyn.pattern = v.pattern;
        const bodyTop = drive.restHeight + v.spec.skeleton.height * scale * 0.45;
        v.centerY = center[1];
        v.radius = 0.5 * Math.max(v.spec.skeleton.length * 0.7, v.spec.skeleton.width) * scale;
        v.scale = scale;
        if (this.showLabels && v.labelAlpha > 0.01) labels.add(v.x, ground + v.lift + bodyTop + scale * 0.9, v.z, 0.36 * Math.min(1, v.pop * this.globalPop), labelIndexForTier(v.tier), v.labelAlpha, camLocal);
        // Shadow proxies: every posed sphere, plus each leg from hip to foot. The same pass measures the
        // footprint (contact shadow) along/across the heading.
        const r = drive.rotation;
        let fw = 0;
        let fx = 0;
        let fz = 0;
        for (const s of posed.spheres) {
          const w = s.r * s.r;
          fw += w;
          fx += s.center[0] * w;
          fz += s.center[2] * w;
        }
        fx = fw > 0 ? fx / fw : 0;
        fz = fw > 0 ? fz / fw : 0;
        const hx0 = Math.sin(drive.yaw);
        const hz0 = Math.cos(drive.yaw);
        let ext = 0;
        let wid = 0;
        for (const s of posed.spheres) {
          const dx = s.center[0] - fx;
          const dz = s.center[2] - fz;
          ext = Math.max(ext, Math.abs(dx * hx0 + dz * hz0) + s.r);
          wid = Math.max(wid, Math.abs(dx * hz0 - dz * hx0) + s.r);
        }
        v.footX = center[0] + fx * scale;
        v.footZ = center[2] + fz * scale;
        v.footL = ext * scale;
        v.footW = wid * scale;
        for (const s of posed.spheres) {
          _p.set(center[0] + s.center[0] * scale, center[1] + s.center[1] * scale, center[2] + s.center[2] * scale);
          const rr = s.r * scale * 0.96;
          _s.set(rr, rr, rr);
          _m.compose(_p, _q.identity(), _s);
          if (proxyCount < this.capacity * PROXIES_PER_CREATURE) this.proxies.setMatrixAt(proxyCount++, _m);
        }
        for (const f of drive.sdfLegs ? [] : pose.feet) {
          const leg = f.leg;
          const hx = leg.hip[0] * scale;
          const hy = leg.hip[1] * scale;
          const hz = leg.hip[2] * scale;
          _hip[0] = center[0] + r[0] * hx + r[1] * hy + r[2] * hz;
          _hip[1] = center[1] + r[3] * hx + r[4] * hy + r[5] * hz;
          _hip[2] = center[2] + r[6] * hx + r[7] * hy + r[8] * hz;
          _v.set(f.pos[0] - _hip[0], f.pos[1] - _hip[1], f.pos[2] - _hip[2]);
          const len = _v.length();
          if (len < 1e-4) continue;
          _p.set((f.pos[0] + _hip[0]) / 2, (f.pos[1] + _hip[1]) / 2, (f.pos[2] + _hip[2]) / 2);
          _q.setFromUnitVectors(_up, _v.divideScalar(len));
          const w = Math.max(0.012, leg.length * scale * 0.13);
          _s.set(w, len / 2, w);
          _m.compose(_p, _q, _s);
          if (proxyCount < this.capacity * PROXIES_PER_CREATURE) this.proxies.setMatrixAt(proxyCount++, _m);
        }
        if (v.rig) {
          const skin = v.spec.skin;
          v.rig.setBody({
            params,
            center,
            scale,
            squash: dyn.squash,
            jiggle: dyn.jiggle,
            phase: dyn.phase,
            time: gpuTime,
            surface: v.raymarch ? 'exact' : 'mesh',
            rotation: pose.rotation,
            pose,
            noiseMaterial: skin.coat !== 'bare' ? 'jelly' : undefined,
            surfaceOffset: skin.coat === 'fur' ? 0.1 : skin.coat === 'feather' ? 0.05 : 0,
          });
        }
      } else {
        // --- blob dome: spring squash, resting weight, floor cut on the plate -------------------------
        // Strays wander in place: a small hop every ~1.7 s (their own clock), a squash on landing.
        let hop = 0;
        if (v.kind === 'stray' && v.squash === null && v.lift === 0) {
          const ph = (now * 0.6 + v.phase * 0.37) % 1;
          if (ph < 0.22) {
            const t = ph / 0.22;
            hop = 0.1 * layout.cell * Math.sin(Math.PI * t);
            if (t > 0.9 && v.jiggle < 0.2) {
              this.driver.impulse(v.id, [0, 1, 0], 0.45);
              v.jiggle = 0.5;
            }
            moved = true;
          }
        }
        // At rest the body settles a little onto its plate (resting squash); while the spring is active its own
        // axis takes over — blended by the spring's energy so there is no pop between the two.
        let squash = v.squash;
        if (!squash) {
          const w = 1 - Math.min(1, Math.abs(st.amount) / 0.08);
          const ax = st.axis[0] * (1 - w);
          const ayy = st.axis[1] * (1 - w) + w;
          const az = st.axis[2] * (1 - w);
          const al = Math.hypot(ax, ayy, az) || 1;
          squash = { axis: [ax / al, ayy / al, az / al], amount: st.amount * (1 - w) + REST_SQUASH * w };
        }
        const { along, across } = squashScales(squash.amount);
        const ay = squash.axis[1];
        const sy = along * ay * ay + across * (1 - ay * ay);
        const floorY = v.genome.floorY ?? NO_FLOOR;
        const baseY = floorY > NO_FLOOR ? -floorY * sy * scale : scale * sy;
        const k = 0.22 * layout.cell;
        const y = ground + v.lift + hop + baseY + Math.max(0, st.offset[1]) * k;
        center = [v.x + st.offset[0] * k, y, v.z + st.offset[2] * k];
        dyn = {
          squash: { axis: squash.axis, amount: squash.amount, taper: v.genome.squash.taper ?? 0.4 },
          jiggle: v.jiggle,
          phase: v.phase,
          seed: v.id * 17 + 3,
          detail: 1,
        };
        const coat = v.spec?.skin.coat;
        if (coat && coat !== 'bare') dyn.material = coat;
        if (v.pattern) dyn.pattern = v.pattern;
        v.centerY = y;
        v.scale = scale;
        v.radius = scale;
        v.footX = center[0];
        v.footZ = center[2];
        v.footL = scale;
        v.footW = scale;
        const align = squash.axis[0] * v.moveDir[0] + squash.axis[2] * v.moveDir[1];
        v.front = scale * (across + (along - across) * align * align);
        if (v.lift !== 0 || v.squash !== null || Math.abs(st.amount) > 0.02) moved = true;
        // Shadow proxy: an ellipsoid around the body, squashed like it.
        const ax = squash.axis[0];
        const az = squash.axis[2];
        const r = scale * 0.95;
        _p.set(center[0], center[1] - 0.05 * scale, center[2]);
        _s.set(r * (across + (along - across) * ax * ax), r * sy, r * (across + (along - across) * az * az));
        _m.compose(_p, _q.identity(), _s);
        if (proxyCount < this.capacity * PROXIES_PER_CREATURE) this.proxies.setMatrixAt(proxyCount++, _m);
        if (this.showLabels && v.labelAlpha > 0.01) {
          labels.add(v.x, y + scale * 1.32, v.z, 0.36 * Math.min(1, v.pop * this.globalPop), labelIndexForTier(v.tier), v.labelAlpha, camLocal);
        }
        if (v.rig) {
          v.rig.setBody({
            params: v.genome,
            center,
            scale,
            squash: dyn.squash,
            jiggle: dyn.jiggle,
            phase: dyn.phase,
            time: gpuTime,
            surface: 'mesh',
          });
        }
      }
      if (v.meshSpec && meshBodies && drive) {
        // Mesh path: the posed spheres skin the shared species mesh; coats run on the same block slot.
        meshBodies.draw(v.slot, v.meshSpec, params, { center, scale }, dyn, drive.rotation);
        this.block.hide(v.slot);
        this.blockA?.hide(v.slot);
      } else if (v.raymarch && this.blockA) {
        this.blockA.write(v.slot, params, { center, scale }, dyn);
        this.block.hide(v.slot);
        meshBodies?.hide(v.slot);
        maxSlotA = Math.max(maxSlotA, v.slot);
      } else {
        this.block.write(v.slot, params, { center, scale }, dyn);
        this.blockA?.hide(v.slot);
        meshBodies?.hide(v.slot);
        maxSlot = Math.max(maxSlot, v.slot);
      }
      if (v.rig) {
        this.glance(v, dt, now);
        v.rig.update(dt);
      }
      this.syncAttachments(v, props, now, true);
    }
    this.mesh.count = maxSlot + 1;
    if (this.meshA) this.meshA.count = maxSlotA + 1;
    meshBodies?.end();
    this.proxies.count = proxyCount;
    this.proxies.instanceMatrix.needsUpdate = true;
    this.castersMoved = moved;
    this.updateCarried(dt, gpuTime);
  }

  /**
   * Idle glances: now and then the eyes drift to the camera, to a spot on the board or straight ahead
   * (bodies never turn on their own — only a swipe turns a creature).
   */
  private glance(v: BlobVisual, dt: number, now: number): void {
    const rig = v.rig;
    if (!rig) return;
    v.gazeT -= dt;
    if (v.gazeT <= 0) {
      const h = Math.sin(v.id * 12.9898 + Math.floor(now * 0.37) * 78.233) * 43758.5453;
      const u = h - Math.floor(h);
      v.gazeT = 2.2 + u * 3.8;
      if (u < 0.45) v.gaze = this.cameraLocal;
      else if (u < 0.8) {
        const a = u * 40;
        v.gaze = new Vector3(v.x + Math.cos(a) * 1.4, this.options.layout.top + 0.2, v.z + Math.sin(a) * 1.4);
      } else v.gaze = null;
    }
    rig.gazeTarget = v.drive?.moving ? null : v.gaze;
  }

  /** Only the carried creature's parts (the board itself is hidden). */
  updateCarried(dt: number, gpuTime: number): void {
    const rig = this.carried;
    if (rig && this.pool) {
      const c = this.carrier;
      if (c && c.visible) {
        // Carrier body frame → pool group space; the rig traces its sockets on the carrier's body.
        this.pool.group.updateWorldMatrix(true, false);
        _inv.copy(this.pool.group.matrixWorld).invert();
        _parent.multiplyMatrices(_inv, c.matrixWorld);
        rig.setBody({ params: c.params, center: [0, c.standY, 0], scale: c.scale, parent: _parent, time: gpuTime, surface: 'mesh', jiggle: c.jiggle, phase: 0 });
      } else {
        rig.setBody({ params: c?.params ?? this.baseParamsFallback(), center: [0, -1000, 0], scale: 0.0001, time: gpuTime, surface: 'mesh' });
      }
      rig.update(dt);
    }
    this.pool?.commit();
    this.trimPools();
  }

  /**
   * Pools keep drawing up to their high-water mark after their creatures are gone (merges, level changes):
   * hide the ones without a live instance so the board only pays for the parts it shows.
   */
  private trimPools(): void {
    const pool = this.pool;
    const library = this.library;
    if (!pool || !library) return;
    for (const child of pool.group.children) {
      let pp = this.partPools.get(child);
      if (!pp) {
        const [id, seg, prim] = child.name.split('#');
        const module = id ? library.get(id) : undefined;
        if (!module || seg === undefined || prim === undefined) continue;
        pp = pool.poolFor(module, Number(seg), Number(prim));
        if (pp.mesh !== child) continue;
        this.partPools.set(child, pp);
      }
      const live = pp.used > 0;
      pp.mesh.visible = live;
      if (!live) pp.mesh.count = 0;
    }
  }

  /** Places (or removes) the state attachments of one blob for this frame. */
  private syncAttachments(v: BlobVisual, props: BoardProps, now: number, visible: boolean): void {
    const wanted = new Map<string, PropDesc>();
    const pal = this.options.palette;
    if (visible) {
      const r = v.radius;
      const cy = v.centerY;
      const ground = this.options.layout.top;
      const ad = this.awayDir;
      const drive = v.drive;
      // Contact shadow: a crisp ink ellipse under the body, stretched and nudged away from the sun, so the
      // creature sits *in* the meadow (the long razor shadow comes from the proxies in the shadow map). It
      // shrinks while the creature is in the air.
      const air = Math.max(0, v.lift) / Math.max(0.05, r * 2.2);
      const shrink = 1 / (1 + 1.6 * air);
      if (drive && v.spec) {
        // Footprint of the posed body (a coiled snake is round, a walking one long).
        wanted.set(`contact:${v.id}`, {
          family: 'disc',
          x: v.footX + ad.x * r * 0.1,
          y: ground + 0.002,
          z: v.footZ + ad.z * r * 0.1,
          ry: drive.yaw,
          sx: v.footW * 1.9 * shrink,
          sy: 0.006,
          sz: v.footL * 1.75 * shrink,
          color: pal.ink,
        });
      } else {
        wanted.set(`contact:${v.id}`, {
          family: 'disc',
          x: v.x + ad.x * r * 0.22,
          y: ground + 0.002,
          z: v.z + ad.z * r * 0.22,
          ry: -Math.atan2(ad.z, ad.x),
          sx: r * 2.35 * shrink,
          sy: 0.006,
          sz: r * 1.85 * shrink,
          color: pal.ink,
        });
      }
      // Mouth: an ink crescent that opens on the leading side (blobs) or at the head (walkers, snakes). Rigs
      // that trace their own mouth onto the body (Creatures v3) draw the walkers' mouths themselves.
      const traced = drive !== null && v.rig !== null && 'showMouth' in v.rig;
      const mouth = traced ? 0 : drive ? drive.mouthOpen : v.mouth;
      if (mouth > 0.03) {
        if (drive && v.spec) {
          // The skeleton's mouth: anchor sphere and rest direction (posed), an ink gape on the surface.
          const hr = drive.mouthLocal(_head, _fwd) * v.scale;
          const hx = v.x + _head[0] * v.scale;
          const hy = cy + _head[1] * v.scale;
          const hz = v.z + _head[2] * v.scale;
          const fx = _fwd[0];
          const fy = _fwd[1];
          const fz = _fwd[2];
          const w = hr * (0.95 + 0.35 * mouth);
          const h = hr * 0.9 * mouth;
          _v.set(fx, fy, fz).normalize();
          _q.setFromUnitVectors(_z, _v);
          wanted.set(`mouth:${v.id}`, {
            family: 'sphere',
            x: hx + fx * hr * 0.78,
            y: hy + fy * hr * 0.78 - h / 2,
            z: hz + fz * hr * 0.78,
            sx: w,
            sy: h,
            sz: hr * 0.75,
            quat: [_q.x, _q.y, _q.z, _q.w],
            color: pal.ink,
          });
        } else {
          // On the top-front of the leading surface (the stretched body reaches further): from the high camera
          // the ink ellipse poking out of the jelly reads as the sketch's crescent.
          const [dx, dz] = v.moveDir;
          const w = r * (1.0 + 0.45 * mouth);
          const h = r * 0.55 * mouth + 0.01;
          const reach = v.front * 0.72;
          wanted.set(`mouth:${v.id}`, {
            family: 'sphere',
            x: v.x + dx * reach,
            y: cy + r * 0.42 - h / 2,
            z: v.z + dz * reach,
            ry: Math.atan2(dx, dz),
            sx: w,
            sy: h,
            sz: r * 0.62,
            color: pal.ink,
          });
        }
      }
      if (v.frozen) {
        // Ice crust: a pale disc frozen onto the plate and a ring of crystal shards leaning out of it,
        // rooted just outside the body (Earle's snow lace: white against deep blue).
        wanted.set(`crust:${v.id}:disc`, {
          family: 'disc',
          x: v.x,
          y: ground,
          z: v.z,
          sx: r * 2.5,
          sy: 0.02,
          sz: r * 2.5,
          color: mixHex(pal.ice, pal.iceDeep, 0.25),
          motif: MOTIF.rimDots,
          hatch: 18,
          param: 1,
        });
        const n = 9;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + v.id * 0.7;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const lean = 0.5 + (k % 3) * 0.12;
          const half = -lean / 2;
          const tall = (0.62 + ((k * 7) % 5) * 0.1) * r;
          wanted.set(`crust:${v.id}:${k}`, {
            family: 'shard',
            x: v.x + c * r * 1.02,
            y: ground,
            z: v.z + s * r * 1.02,
            sx: 0.34 * r,
            sy: tall,
            sz: 0.34 * r,
            quat: [-s * Math.sin(half), 0, c * Math.sin(half), Math.cos(half)],
            color: k % 3 === 0 ? pal.iceDeep : pal.ice,
            motif: MOTIF.tipLight,
          });
        }
      }
      if (v.sleeper) {
        // "zzz": three dots of growing size drift up and to the side in a staggered loop.
        for (let k = 0; k < 3; k++) {
          const size = (0.055 + k * 0.022) * Math.max(0.8, r / 0.25);
          wanted.set(`zzz:${v.id}:${k}`, {
            family: 'sphere',
            x: v.x + r * (0.5 + k * 0.28),
            y: cy + r * (0.7 + k * 0.3),
            z: v.z + r * 0.25,
            sx: size,
            sy: size,
            sz: size,
            color: pal.paper,
            idle: { kind: 'rise', speed: 0.42, amp: 0.45 * r, phase: k / 3 },
          });
        }
        if (!drive) {
          const e = v.genome.eye.dir;
          const el = Math.hypot(e[0], e[1], e[2]) || 1;
          _v.set(e[0] / el, e[1] / el, e[2] / el);
          _q.setFromUnitVectors(_z, _v);
          wanted.set(`lid:${v.id}`, {
            family: 'box',
            x: v.x + _v.x * r * 0.98,
            y: cy + _v.y * r * 0.98 - 0.02 * r,
            z: v.z + _v.z * r * 0.98,
            sx: 0.34 * r,
            sy: 0.05 * r,
            sz: 0.06 * r,
            quat: [_q.x, _q.y, _q.z, _q.w],
            color: pal.ink,
          });
        }
      }
      if (v.kind === 'line' || v.kind === 'burst') {
        const n = v.kind === 'line' ? 4 : 6;
        const R = r * 1.28;
        for (let k = 0; k < n; k++) {
          const a = now * 3.2 + (k / n) * Math.PI * 2 + v.id;
          let ox = 0;
          let oy = 0;
          let oz = 0;
          if (v.kind === 'line') {
            const horizontal = v.axis !== 'v';
            ox = horizontal ? Math.cos(a) * R : 0;
            oz = horizontal ? 0 : Math.cos(a) * R;
            oy = Math.sin(a) * R * 0.55;
          } else {
            const tilt = k % 2 ? 0.55 : -0.55;
            const b = a + (k % 2 ? Math.PI / 2 : 0);
            ox = Math.cos(b) * R;
            oz = Math.sin(b) * R * Math.cos(tilt);
            oy = Math.sin(b) * R * Math.sin(tilt) * 0.8;
          }
          const size = 0.09 * (r / 0.32);
          wanted.set(`orbit:${v.id}:${k}`, {
            family: 'sphere',
            x: v.x + ox,
            y: cy + r * 0.1 + oy,
            z: v.z + oz,
            sx: size,
            sy: size,
            sz: size,
            color: v.kind === 'line' ? pal.paper : pal.neon,
            motif: MOTIF.glow,
            param: k,
          });
        }
      }
      if (v.kind === 'amoeba') {
        _v.set(0.22 * Math.sin(now * 0.7 + v.id), 0.12 + 0.12 * Math.cos(now * 0.5 + v.id * 0.3), 1).normalize();
        const size = 0.34 * r;
        wanted.set(`core:${v.id}`, {
          family: 'sphere',
          x: v.x + _v.x * r * 0.86,
          y: cy + _v.y * r * 0.86 - size / 2,
          z: v.z + _v.z * r * 0.86,
          sx: size,
          sy: size,
          sz: size,
          color: pal.violet,
        });
      }
    }
    for (const key of v.attached) {
      if (!wanted.has(key)) {
        props.remove(key);
        v.attached.delete(key);
      }
    }
    for (const [key, desc] of wanted) {
      const inst = props.place(key, desc, now);
      if (inst) v.attached.add(key);
    }
  }

  /**
   * Where a creature's mouth is this frame (board-local): the traced mouth of a walker/snake (the skeleton's
   * mouth anchor and direction on the posed body), the leading side of a blob.
   */
  mouthWorld(v: BlobVisual, out: Vector3): Vector3 {
    const drive = v.drive;
    if (drive && v.spec) {
      const r = drive.mouthLocal(_head, _fwd);
      const k = v.scale;
      return out.set(v.x + (_head[0] + _fwd[0] * r * 0.9) * k, v.centerY + (_head[1] + _fwd[1] * r * 0.9) * k, v.z + (_head[2] + _fwd[2] * r * 0.9) * k);
    }
    return out.set(v.x + v.moveDir[0] * v.front * 0.8, v.centerY + v.radius * 0.35, v.z + v.moveDir[1] * v.front * 0.8);
  }

  /** Stops placing an attachment family for a blob (the timeline animates the leftover instances away). */
  releaseAttachments(v: BlobVisual, prefix: string): string[] {
    const keys: string[] = [];
    for (const key of v.attached) {
      if (key.startsWith(prefix)) {
        keys.push(key);
        v.attached.delete(key);
      }
    }
    return keys;
  }

  dispose(): void {
    this.dropCarried();
    for (const v of this.visuals.values()) {
      this.endMerge(v);
      v.rig?.dispose();
      this.driver.remove(v.id);
    }
    this.visuals.clear();
    this.pool?.dispose();
    for (const d of this.disposables) d.dispose();
    this.group.removeFromParent();
  }
}

/** Resting heading of a creature that has not moved yet: a 3/4 view toward the camera, alternating sides. */
function defaultYaw(id: number): number {
  return (id % 2 === 0 ? 1 : -1) * (0.45 + ((id * 0.37) % 0.3));
}
