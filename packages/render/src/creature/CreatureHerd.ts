import { CylinderGeometry, DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { Camera, Object3D } from 'three/webgpu';
import { time } from 'three/tsl';
import { NO_FLOOR, faceCapFor, resolveCreature, rotationYPR, squashScales, type BlobParams, type CreatureGenome, type CreatureSpec, type GenomeRules, type PartSpec, type Pose, type Rot3, type Vec3 } from '@ee/genome';
import { SpringJiggle } from '@ee/physics';
import { BLOB_QUALITY_HIGH, BLOB_QUALITY_MOBILE, BlobParamBlock, applyBlobQuality, createBlobQualityUniforms, createBlobShadingUniforms, createJiggleBlobMesh, makePattern, type BlobDynamics, type BlobShadingUniforms, type PatternParams } from '../blob/index';
import { BoardMeshBodies } from '../board/boardMeshBodies';
import { CreatureMotion } from './CreatureMotion';
import { CreaturePool, type PartPool } from './CreaturePool';
import type { CreatureRig } from './CreatureRig';
import type { ModuleLibrary } from './ModuleLibrary';

/**
 * A herd of creatures off the board (Iteration 4): the Setzkasten's compartments and the creatures living on the map.
 * The same bodies as the board — blobs on the jiggle mesh, species as skinned meshes shared across tiers
 * (`BoardMeshBodies`, with their fur/feather passes), modular parts from a `CreaturePool` on the shared module
 * library — alive through a `CreatureMotion` each (walk, hop, turn, idle life) in its own local (x, z) frame.
 *
 * Every member stands in its own **ground frame** (origin + quaternion in the herd group's space; local +y = up): the
 * posed body is rotated rigidly into it (body rotation = frame · pose), the parts follow through the rig's parent
 * transform. Nothing here knows about spheres or planes — the caller (the map's `MapGround`, the Setzkasten's floors)
 * sets the frames. Optional extras: shadow proxies (smooth spheres on a shadow layer) for a shadow map, flat ink contact
 * shadows for scenes without one. Silhouette members (undiscovered looks) are static ink shapes: ink body, ink parts,
 * no pattern or coat.
 */
export interface CreatureHerdOptions {
  rules: GenomeRules;
  /** The board's module library (parts); may come later (`setLibrary`). */
  library?: ModuleLibrary | null;
  /** Creatures at once (≤ 36: one uniform block, WebGL2-safe). */
  capacity?: number;
  /** Mobil preset: one noise octave, fins only (no fur shells / feather cards). */
  mobile?: boolean;
  /** Smooth shadow proxies on this render layer (castShadow) for a shadow map; null = none. */
  shadowLayer?: number | null;
  /** Flat ink contact shadows under the creatures (no shadow map), nudged along `away` (frame-local x/z). */
  contactShadows?: { color: string; away: readonly [number, number] } | null;
  /** Part draw calls (module segment pools) the herd may use; the rest of a creature's parts are left off. */
  maxPartPools?: number;
  /** One eye module for every creature (a crowded herd shares its eyes: fewer draw calls); null = their own. */
  sharedEye?: string | null;
}

export interface HerdMemberOptions {
  /** Zone, tier, seed and (forced) species of the look. */
  genome: CreatureGenome;
  /** Blob units → world units. */
  scale: number;
  /** Alive (gait, idle life) or a static pose (default alive). */
  animated?: boolean;
  /** Ink colour: an undiscovered look drawn as a static silhouette. */
  silhouette?: string | null;
  /** Heading (radians about the frame's up; 0 = frame +z). */
  yaw?: number;
  /** Start in the local frame (x, z). */
  at?: readonly [number, number];
  /** Ground height in the local frame (the controller plants the feet there); default flat 0. */
  ground?: ((x: number, z: number) => number) | undefined;
  /** Motion seed (default from the genome seed). */
  seed?: number;
}

/** Slots in the herd's frames etc. Exposed read-mostly: callers steer through `motion` and the fields below. */
export class HerdMember {
  /** The species mesh the body is drawn with (mesh path), or null (jiggle body). */
  meshSpec: CreatureSpec | null = null;
  rig: CreatureRig | null = null;
  motion: CreatureMotion | null = null;
  /** Ground frame: origin in the herd group's space and orientation (local +y = the ground's up). */
  readonly origin = new Vector3();
  readonly quaternion = new Quaternion();
  /** Blob units → world units (the controller's own scale is fixed; see `renderScale`). */
  scale: number;
  /** Pop multiplier (appear/disappear). */
  pop = 1;
  visible = true;
  /** Extra height along the frame's up (world units): hops off a ledge, riding a sinking plateau. */
  lift = 0;
  /** Static heading and local position (members without motion). */
  yaw: number;
  x: number;
  z: number;
  jiggle = 0;
  readonly phase: number;
  readonly pattern: PatternParams | null;
  readonly silhouette: boolean;
  readonly animatedWanted: boolean;
  /** Last written body: group-space centre and radius (picking, cards, stamps). */
  readonly center = new Vector3();
  radius = 0;
  /** Footprint (local frame): centre and half extents. */
  foot: [number, number, number, number] = [0, 0, 0.2, 0.2];
  /** @internal block slot */
  slot = -1;
  /** @internal ground function of the controller */
  ground: ((x: number, z: number) => number) | undefined;
  /** @internal */
  motionSeed: number;
  private staticParams: BlobParams | null = null;
  private staticYaw = NaN;

  constructor(
    readonly id: number,
    readonly spec: CreatureSpec,
    opts: HerdMemberOptions,
  ) {
    this.scale = opts.scale;
    this.yaw = opts.yaw ?? 0;
    this.x = opts.at?.[0] ?? 0;
    this.z = opts.at?.[1] ?? 0;
    this.phase = (id * 1.618) % (Math.PI * 2);
    this.silhouette = !!opts.silhouette;
    this.animatedWanted = !this.silhouette && opts.animated !== false;
    this.ground = opts.ground;
    const s = typeof spec.genome.seed === 'number' ? spec.genome.seed : 7;
    this.motionSeed = opts.seed ?? ((s * 7919 + id * 31) >>> 0);
    const skin = spec.skin;
    this.pattern = !this.silhouette && skin.pattern !== 'none' ? makePattern(skin.pattern, spec.body.baseColor, { scale: skin.patternScale, rotation: skin.patternRotation }) : null;
  }

  /** Rest body turned by the static heading (cached per heading). */
  restParams(): BlobParams {
    if (this.staticParams && this.staticYaw === this.yaw) return this.staticParams;
    const r = rotationYPR(this.yaw, 0, 0);
    const body = this.spec.body;
    const spheres = body.spheres.map((s) => ({ center: mulRV(r, s.center, [0, 0, 0]), r: s.r }));
    const e = body.eye.dir;
    this.staticParams = { ...body, spheres, eye: { ...body.eye, dir: mulRV(r, [e[0], e[1], e[2]], [0, 0, 0]) } };
    this.staticYaw = this.yaw;
    return this.staticParams;
  }

  /** World units per blob unit as drawn this frame. */
  get renderScale(): number {
    return this.scale * this.pop;
  }
}

const LIGHT_CAMERA = new Vector3(-0.66, 0.6, 0.5).normalize();
const PROXIES_PER_MEMBER = 16;
const IDENTITY: Rot3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
/** Keep order of part slots under a tight budget: the parts that make a species readable first. */
const SLOT_PRIORITY: Record<string, number> = { eye: 100, trunk: 80, ear: 75, crest: 70, horn: 65, tail: 55, tooth: 40, wing: 35, leg: 30 };
const EYE_PREFERENCE = ['eye_round', 'eye_cute', 'eye_sleepy'];

const _m = new Matrix4();
const _m2 = new Matrix4();
const _q = new Quaternion();
const _v = new Vector3();
const _p = new Vector3();
const _s = new Vector3();
const _up = new Vector3();
const _rf: Rot3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const _rb: Rot3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const _c: Vec3 = [0, 0, 0];
const _axis: Vec3 = [0, 1, 0];
const _face: [number, number, number] = [0, 0, 1];

function mulRV(r: Readonly<Rot3>, v: Readonly<Vec3>, out: Vec3): Vec3 {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  out[0] = r[0] * x + r[1] * y + r[2] * z;
  out[1] = r[3] * x + r[4] * y + r[5] * z;
  out[2] = r[6] * x + r[7] * y + r[8] * z;
  return out;
}

function mulRR(a: Readonly<Rot3>, b: Readonly<Rot3>, out: Rot3): Rot3 {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) out[i * 3 + j] = a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!;
  }
  return out;
}

function rotFromQuat(q: Quaternion, out: Rot3): Rot3 {
  _m2.makeRotationFromQuaternion(q);
  const e = _m2.elements;
  // Matrix4 is column-major; Rot3 is row-major.
  out[0] = e[0]!;
  out[1] = e[4]!;
  out[2] = e[8]!;
  out[3] = e[1]!;
  out[4] = e[5]!;
  out[5] = e[9]!;
  out[6] = e[2]!;
  out[7] = e[6]!;
  out[8] = e[10]!;
  return out;
}

/** Stand-in for a rig (no module library yet): kneaded legs need only the part list and the hidden slots. */
const NO_RIG = { parts: [], hiddenSlots: new Set<string>() } as unknown as CreatureRig;

export class CreatureHerd {
  readonly group = new Group();
  readonly capacity: number;
  readonly uniforms: BlobShadingUniforms;
  readonly members: HerdMember[] = [];
  private readonly block: BlobParamBlock;
  private readonly jiggle: InstancedMesh;
  private readonly bodies: BoardMeshBodies | null;
  private readonly proxies: InstancedMesh | null;
  private readonly contacts: InstancedMesh | null;
  private readonly driver = new SpringJiggle();
  private readonly quality: ReturnType<typeof createBlobQualityUniforms>;
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly freeSlots: number[] = [];
  private readonly poolKeys = new Set<string>();
  private pool: CreaturePool | null = null;
  private library: ModuleLibrary | null;
  private rules: GenomeRules;
  private sharedEye: string | null;
  private readonly maxPartPools: number;
  private readonly contactAway: readonly [number, number];
  private nextId = 1;
  private mobile: boolean;
  private compilePending = false;
  private compiling = false;
  /** Background pipeline compiler (`renderer.compileAsync` for this herd): new species meshes and parts compile ahead. */
  compiler: ((root: Object3D) => Promise<void>) | null = null;
  /** True for a frame in which a shadow caster moved (walk, hop, pop). */
  castersMoved = false;

  constructor(opts: CreatureHerdOptions) {
    this.capacity = Math.min(36, Math.max(1, opts.capacity ?? 36));
    this.rules = opts.rules;
    this.library = opts.library ?? null;
    this.mobile = opts.mobile ?? false;
    this.maxPartPools = opts.maxPartPools ?? 20;
    this.sharedEye = opts.sharedEye === undefined ? 'auto' : opts.sharedEye;
    this.contactAway = opts.contactShadows?.away ?? [-0.12, 0.08];
    this.group.name = 'creature-herd';
    this.uniforms = createBlobShadingUniforms();
    this.quality = createBlobQualityUniforms();
    applyBlobQuality(this.quality, this.mobile ? BLOB_QUALITY_MOBILE : BLOB_QUALITY_HIGH);
    this.block = new BlobParamBlock(this.capacity);
    const b = createJiggleBlobMesh(this.block, { uniforms: this.uniforms, quality: this.quality });
    this.jiggle = b.mesh;
    this.jiggle.name = 'herd-blob-bodies';
    this.jiggle.count = 0;
    this.jiggle.castShadow = false;
    this.jiggle.receiveShadow = false;
    this.disposables.push(b.material, b.glyph, b.mesh.geometry);
    this.group.add(this.jiggle);
    let bodies: BoardMeshBodies | null = null;
    try {
      bodies = new BoardMeshBodies(this.capacity, this.uniforms, this.quality, b.glyph, this.mobile);
      bodies.onNewMesh = () => {
        this.compilePending = true;
      };
      this.group.add(bodies.group);
      this.disposables.push(bodies);
    } catch {
      bodies = null;
    }
    this.bodies = bodies;
    for (let i = this.capacity - 1; i >= 0; i--) this.freeSlots.push(i);

    if (opts.shadowLayer !== null && opts.shadowLayer !== undefined) {
      const geo = new SphereGeometry(1, 10, 8);
      const mat = new MeshBasicMaterial({ color: '#000000' });
      const proxies = new InstancedMesh(geo, mat, this.capacity * PROXIES_PER_MEMBER);
      proxies.name = 'herd-shadow-proxies';
      proxies.layers.set(opts.shadowLayer);
      proxies.castShadow = true;
      proxies.receiveShadow = false;
      proxies.frustumCulled = false;
      proxies.instanceMatrix.setUsage(DynamicDrawUsage);
      proxies.count = 0;
      this.disposables.push(geo, mat);
      this.group.add(proxies);
      this.proxies = proxies;
    } else this.proxies = null;

    if (opts.contactShadows) {
      const geo = new CylinderGeometry(1, 1, 0.004, 24);
      const mat = new MeshBasicMaterial({ color: opts.contactShadows.color });
      const contacts = new InstancedMesh(geo, mat, this.capacity);
      contacts.name = 'herd-contact-shadows';
      contacts.castShadow = false;
      contacts.receiveShadow = false;
      contacts.frustumCulled = false;
      contacts.instanceMatrix.setUsage(DynamicDrawUsage);
      contacts.count = 0;
      this.disposables.push(geo, mat);
      this.group.add(contacts);
      this.contacts = contacts;
    } else this.contacts = null;

    if (this.library) this.makePool();
  }

  get size(): number {
    return this.members.length;
  }

  get full(): boolean {
    return this.freeSlots.length === 0;
  }

  /** The module library arrived (or changed): parts for every member. */
  setLibrary(library: ModuleLibrary | null, rules?: GenomeRules | null): void {
    if (rules) this.rules = rules;
    if (library === this.library) return;
    this.library = library;
    for (const m of this.members) {
      m.rig?.dispose();
      m.rig = null;
    }
    this.pool?.dispose();
    this.pool = null;
    this.poolKeys.clear();
    if (library) this.makePool();
    for (const m of this.members) this.attachRig(m);
  }

  /** Colour of the flat contact shadows (a scene that changes its ground). */
  setContactColor(color: string): void {
    const mat = this.contacts?.material as MeshBasicMaterial | undefined;
    mat?.color.set(color);
  }

  /** Quality switch at runtime. */
  setQuality(mobile: boolean): void {
    if (mobile === this.mobile) return;
    this.mobile = mobile;
    applyBlobQuality(this.quality, mobile ? BLOB_QUALITY_MOBILE : BLOB_QUALITY_HIGH);
    if (this.bodies) this.bodies.mobile = mobile;
  }

  /** Resolves a look (archetypes on; a forced species implies its archetype). */
  resolve(genome: CreatureGenome): CreatureSpec {
    return resolveCreature(genome, this.rules, { archetypes: true });
  }

  /** Queues a look's species mesh (built in `pump`, before it is needed). */
  prepare(genome: CreatureGenome): void {
    const bodies = this.bodies;
    if (!bodies) return;
    const key = `${genome.zone}|${genome.tier}|${genome.seed}|${genome.species ?? ''}`;
    bodies.enqueue(key, () => this.resolve(genome));
  }

  /** Works on the species mesh queue (≤ budget ms, one new mesh per call); true while work is left. */
  pump(budgetMs: number): boolean {
    return this.bodies?.pump(budgetMs, true) ?? false;
  }

  /** Adds a creature; null when the herd is full. */
  add(opts: HerdMemberOptions): HerdMember | null {
    const slot = this.freeSlots.pop();
    if (slot === undefined) return null;
    let spec = this.resolve(opts.genome);
    if (opts.silhouette) spec = silhouetteSpec(spec, opts.silhouette);
    const m = new HerdMember(this.nextId++, spec, opts);
    m.slot = slot;
    this.driver.configure(m.id, { viscosity: spec.body.viscosity });
    m.meshSpec = this.bodies?.specFor(spec) ?? null;
    this.attachRig(m);
    if (m.animatedWanted) this.setAnimated(m, true);
    this.members.push(m);
    return m;
  }

  remove(m: HerdMember): void {
    const i = this.members.indexOf(m);
    if (i < 0) return;
    this.members.splice(i, 1);
    m.rig?.dispose();
    m.rig = null;
    m.motion = null;
    if (m.slot >= 0) {
      this.block.hide(m.slot);
      this.bodies?.hide(m.slot);
      this.freeSlots.push(m.slot);
    }
    m.slot = -1;
    this.driver.remove(m.id);
  }

  clear(): void {
    for (const m of [...this.members]) this.remove(m);
  }

  /** Switches a member between alive (its own controller, trace interval `trace`) and a static pose. */
  setAnimated(m: HerdMember, on: boolean, trace = 1): void {
    if (m.silhouette) on = false;
    if (on && !m.motion) {
      const motion = new CreatureMotion(m.spec, m.rig ?? NO_RIG, { seed: m.motionSeed, scale: m.scale, ground: m.ground, coilAtRest: false, idleLife: true });
      motion.controller.teleport(m.x, m.z, m.yaw);
      m.motion = motion;
    } else if (!on && m.motion) {
      const pose = m.motion.pose;
      m.x = pose.x;
      m.z = pose.z;
      m.yaw = pose.yaw;
      m.motion = null;
    }
    if (m.rig) m.rig.traceInterval = on ? trace : 12;
  }

  /** A poke: the body squashes and wobbles, the parts follow through. */
  poke(m: HerdMember, strength = 1): void {
    this.driver.impulse(m.id, [0, 1, 0], 0.8 * strength);
    m.jiggle = 1;
    m.rig?.poke(strength);
  }

  /**
   * Per frame: light, controllers, bodies, parts, proxies, contact shadows. Returns true when a shadow caster moved
   * (walks, hops, pops — the caller refreshes its shadow map).
   */
  update(dt: number, camera: Camera): boolean {
    this.driver.step(dt);
    // Key light relative to the camera, in the herd's space.
    this.group.updateWorldMatrix(true, false);
    camera.getWorldQuaternion(_q);
    _v.copy(LIGHT_CAMERA).applyQuaternion(_q);
    this.group.getWorldQuaternion(_q).invert();
    this.uniforms.lightDir.value.copy(_v.applyQuaternion(_q)).normalize();

    const gpuTime = time.value + dt;
    const bodies = this.bodies;
    bodies?.begin();
    let maxSlot = -1;
    let proxyCount = 0;
    let contactCount = 0;
    let moved = false;
    for (const m of this.members) {
      m.jiggle = Math.max(0, m.jiggle - dt * 1.4);
      const visible = m.visible && m.pop > 0.001 && m.slot >= 0;
      if (!visible) {
        if (m.slot >= 0) {
          this.block.hide(m.slot);
          bodies?.hide(m.slot);
        }
        if (m.rig) {
          m.rig.setBody({ params: m.spec.body, center: [0, -1000, 0], scale: 0.0001, time: gpuTime, surface: 'mesh' });
          m.rig.update(dt);
        }
        continue;
      }
      const st = this.driver.get(m.id);
      const scale = m.renderScale;
      rotFromQuat(m.quaternion, _rf);
      _up.set(0, 1, 0).applyQuaternion(m.quaternion);
      const upright = _up.y > 0.9999;
      let local: BlobParams;
      let pose: Pose | null = null;
      let bodyRot: Readonly<Rot3>;
      const center: Vec3 = [0, 0, 0];
      let squashAxis: Vec3;
      let squashAmount: number;
      let jig = m.jiggle;
      /** Ground under the body and the body origin's resting height above it (local frame, world units). */
      let groundY: number;
      let restY: number;
      if (m.motion) {
        pose = m.motion.step(dt);
        if (pose.moving || pose.airborne) moved = true;
        local = m.motion.posedParams(pose);
        const c = m.motion.center(pose);
        // The controller walks at its own scale; the drawn body may be smaller or larger (pop, release lerp).
        const k = scale / m.motion.scale;
        groundY = m.motion.controller.ground(pose.x, pose.z);
        restY = m.motion.controller.restHeight * k;
        center[0] = c[0];
        center[1] = groundY + (c[1] - groundY) * k;
        center[2] = c[2];
        bodyRot = pose.rotation;
        const sq = Math.abs(st.amount) > Math.abs(pose.squash.amount) ? { axis: st.axis, amount: st.amount } : pose.squash;
        squashAxis = [sq.axis[0], sq.axis[1], sq.axis[2]];
        squashAmount = sq.amount;
        jig = Math.max(jig, pose.jiggle);
        m.x = pose.x;
        m.z = pose.z;
      } else {
        local = m.restParams();
        const floorY = local.floorY ?? NO_FLOOR;
        const { along, across } = squashScales(st.amount);
        const ay = st.axis[1];
        const sy = along * ay * ay + across * (1 - ay * ay);
        groundY = m.ground?.(m.x, m.z) ?? 0;
        restY = floorY > NO_FLOOR ? -floorY * sy * scale : m.spec.skeleton.restLift * scale;
        center[0] = m.x + st.offset[0] * 0.22 * scale;
        center[1] = groundY + restY + Math.max(0, st.offset[1]) * 0.22 * scale;
        center[2] = m.z + st.offset[2] * 0.22 * scale;
        bodyRot = rotationYPR(m.yaw, 0, 0, _rb);
        squashAxis = [st.axis[0], st.axis[1], st.axis[2]];
        squashAmount = st.amount;
        if (Math.abs(st.amount) > 0.01) moved = true;
      }
      if (m.pop < 0.999) moved = true;
      // Local → herd space: the frame's rotation, its origin and the extra lift along its up.
      const params = this.intoFrame(local, _rf, upright, m.slot);
      mulRV(_rf, center, _c);
      const gx = m.origin.x + _c[0] + _up.x * m.lift;
      const gyy = m.origin.y + _c[1] + _up.y * m.lift;
      const gz = m.origin.z + _c[2] + _up.z * m.lift;
      m.center.set(gx, gyy, gz);
      const rot = mulRR(_rf, bodyRot, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const taper = pose ? (pose.squash.taper ?? 0.55) : (local.squash.taper ?? 0.4);
      const dyn: BlobDynamics = {
        squash: { axis: mulRV(_rf, squashAxis, _axis).slice() as Vec3, amount: squashAmount, taper },
        jiggle: jig,
        phase: m.phase,
        seed: m.id * 17 + 3,
        detail: 1,
      };
      const coat = m.spec.skin.coat;
      if (coat !== 'bare' && !m.silhouette) dyn.material = coat;
      if (m.pattern) dyn.pattern = m.pattern;
      if (!m.meshSpec) {
        // Jiggle bodies: the face cap turned into the frame (mesh bodies write their own).
        const posed = pose && m.motion ? m.motion.faceMask(pose) : null;
        const rest = posed ? null : faceCapFor(m.spec);
        const cap = posed ?? rest;
        if (cap) {
          const d: Vec3 = posed ? [cap.dir[0], cap.dir[1], cap.dir[2]] : mulRV(bodyRot, [cap.dir[0], cap.dir[1], cap.dir[2]], [0, 0, 0]);
          mulRV(_rf, d, _face as unknown as Vec3);
          dyn.face = { dir: [_face[0], _face[1], _face[2]], radius: cap.radius, strength: 1 };
        }
      }
      const place = { center: [gx, gyy, gz] as Vec3, scale };
      if (m.meshSpec && bodies) {
        bodies.draw(m.slot, m.meshSpec, params, place, dyn, rot);
        this.block.hide(m.slot);
      } else {
        this.block.write(m.slot, params, place, dyn);
        bodies?.hide(m.slot);
        maxSlot = Math.max(maxSlot, m.slot);
      }
      // Radius and footprint (picking, contact shadows).
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      let rMax = 0;
      for (const s of local.spheres) {
        minX = Math.min(minX, s.center[0] - s.r);
        maxX = Math.max(maxX, s.center[0] + s.r);
        minZ = Math.min(minZ, s.center[2] - s.r);
        maxZ = Math.max(maxZ, s.center[2] + s.r);
        rMax = Math.max(rMax, Math.hypot(s.center[0], s.center[1], s.center[2]) + s.r);
      }
      m.radius = rMax * scale;
      if (Number.isFinite(minX)) m.foot = [center[0] + ((minX + maxX) / 2) * scale, center[2] + ((minZ + maxZ) / 2) * scale, ((maxX - minX) / 2) * scale, ((maxZ - minZ) / 2) * scale];
      // Shadow proxies: the posed spheres in herd space.
      if (this.proxies) {
        let n = 0;
        for (const s of params.spheres) {
          if (n++ >= PROXIES_PER_MEMBER || proxyCount >= this.proxies.instanceMatrix.count) break;
          _p.set(gx + s.center[0] * scale, gyy + s.center[1] * scale, gz + s.center[2] * scale);
          const rr = s.r * scale * 0.96;
          _m.compose(_p, _q.identity(), _s.set(rr, rr, rr));
          this.proxies.setMatrixAt(proxyCount++, _m);
        }
      }
      // Contact shadow: a flat ink ellipse under the footprint, nudged away from the light.
      if (this.contacts && contactCount < this.capacity) {
        const air = Math.max(0, center[1] - groundY - restY + m.lift) / Math.max(0.05, m.radius);
        const shrink = 1 / (1 + 1.6 * air);
        const lx = m.foot[0] + this.contactAway[0] * m.radius;
        const lz = m.foot[1] + this.contactAway[1] * m.radius;
        const ly = groundY + 0.003;
        mulRV(_rf, [lx, ly, lz], _c);
        _p.set(m.origin.x + _c[0], m.origin.y + _c[1], m.origin.z + _c[2]);
        _s.set(m.foot[2] * 0.82 * shrink, 1, m.foot[3] * 0.78 * shrink);
        _m.compose(_p, m.quaternion, _s);
        this.contacts.setMatrixAt(contactCount++, _m);
      }
      // Parts: the rig traces the local body and rides the frame through its parent transform.
      if (m.rig) {
        _p.set(m.origin.x + _up.x * m.lift, m.origin.y + _up.y * m.lift, m.origin.z + _up.z * m.lift);
        const parent = (m as HerdMemberWithParent).parentMatrix ?? ((m as HerdMemberWithParent).parentMatrix = new Matrix4());
        parent.compose(_p, m.quaternion, _s.set(1, 1, 1));
        const skin = m.spec.skin;
        m.rig.setBody({
          params: local,
          center: [center[0], center[1], center[2]],
          scale,
          squash: { axis: [squashAxis[0], squashAxis[1], squashAxis[2]], amount: squashAmount, taper },
          jiggle: jig,
          phase: m.phase,
          time: gpuTime,
          surface: 'mesh',
          rotation: bodyRot,
          pose,
          parent,
          noiseMaterial: skin.coat !== 'bare' ? 'jelly' : undefined,
          surfaceOffset: skin.coat === 'fur' ? 0.1 : skin.coat === 'feather' ? 0.05 : 0,
        });
        m.rig.update(dt);
      }
    }
    this.jiggle.count = maxSlot + 1;
    bodies?.end();
    if (this.proxies) {
      this.proxies.count = proxyCount;
      this.proxies.instanceMatrix.needsUpdate = true;
    }
    if (this.contacts) {
      this.contacts.count = contactCount;
      this.contacts.instanceMatrix.needsUpdate = true;
    }
    this.pool?.commit();
    this.trimPools();
    this.compileAhead();
    this.castersMoved = moved;
    return moved;
  }

  /** Draw calls of the herd this frame (bodies, coats, parts, contact shadows; the proxies only in the shadow pass). */
  get drawCalls(): number {
    let n = this.jiggle.count > 0 ? 1 : 0;
    n += this.bodies?.drawCalls ?? 0;
    if (this.pool) {
      n += this.pool.drawCalls;
      if (this.pool.mouths.mesh.visible) n++;
    }
    if (this.contacts && this.contacts.count > 0) n++;
    return n;
  }

  dispose(): void {
    for (const m of this.members) m.rig?.dispose();
    this.members.length = 0;
    this.pool?.dispose();
    this.pool = null;
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.group.removeFromParent();
  }

  // ------------------------------------------------------------------------------------------ internals

  private makePool(): void {
    const library = this.library;
    if (!library || this.pool) return;
    try {
      this.pool = new CreaturePool(library, this.uniforms, { capacity: 48, mouths: this.capacity });
      this.pool.group.name = 'herd-creature-parts';
      this.group.add(this.pool.group);
    } catch {
      this.pool = null;
    }
    if (this.sharedEye === 'auto') this.sharedEye = EYE_PREFERENCE.find((id) => library.get(id)) ?? null;
  }

  private attachRig(m: HerdMember): void {
    const pool = this.pool;
    if (!pool || m.rig) return;
    const before = pool.group.children.length;
    const rig = pool.createRig(this.budgetParts(m.spec));
    if (pool.group.children.length > before) this.compilePending = true;
    if (m.silhouette) inkParts(rig, m.spec.constants.ink);
    rig.traceInterval = m.motion ? 1 : 12;
    m.rig = rig;
    // A rig that arrived after the motion: the controller keeps its kneaded legs (module legs are not used by species).
  }

  /** Module pool keys (`module#segment#prim`: one draw call each). */
  private moduleKeys(asset: string): string[] {
    const mod = this.library?.get(asset);
    if (!mod) return [];
    const out: string[] = [];
    mod.segments.forEach((seg, si) => seg.prims.forEach((_p, pi) => out.push(`${mod.id}#${si}#${pi}`)));
    return out;
  }

  /**
   * Parts within the herd's draw-call budget: every creature wears the shared eye module (when set), then parts are
   * admitted by what makes the species readable (beak/trunk, ears, crest, horns, tail …) while module pools are
   * left; parts of pools already in use are free.
   */
  private budgetParts(spec: CreatureSpec): CreatureSpec {
    if (!this.library || spec.parts.length === 0) return spec;
    const eye = this.sharedEye && this.sharedEye !== 'auto' ? this.sharedEye : null;
    let parts: PartSpec[] = eye ? spec.parts.map((p) => (p.slot === 'eye' && !p.sdf && p.asset !== eye ? { ...p, asset: eye } : p)) : spec.parts;
    const order = [...parts].sort((a, b) => prio(b) - prio(a));
    const keep = new Set<PartSpec>();
    for (const p of order) {
      if (p.sdf) {
        keep.add(p);
        continue;
      }
      const need = this.moduleKeys(p.asset).filter((k) => !this.poolKeys.has(k));
      if (need.length === 0 || this.poolKeys.size + need.length <= this.maxPartPools) {
        keep.add(p);
        for (const k of need) this.poolKeys.add(k);
      }
    }
    if (keep.size === parts.length && parts === spec.parts) return spec;
    parts = parts.filter((p) => keep.has(p));
    return { ...spec, parts };
  }

  /** Pools without a live instance stop drawing (their creatures left the herd). */
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

  private readonly partPools = new Map<object, PartPool>();

  /** Compiles new species meshes and part pools in the background (one compile in flight). */
  private compileAhead(): void {
    const compile = this.compiler;
    if (!this.compilePending || this.compiling || !compile) return;
    this.compilePending = false;
    this.compiling = true;
    let done: Promise<void>;
    try {
      done = compile(this.group);
    } catch {
      done = Promise.resolve();
    }
    void done
      .catch(() => undefined)
      .then(() => {
        this.compiling = false;
      });
  }

  /** Posed local body → herd space (spheres and eye turned by the frame; blobs lose the floor cut on a tilted frame). */
  private intoFrame(local: BlobParams, rf: Readonly<Rot3>, upright: boolean, slot: number): BlobParams {
    let out = this.framed.get(slot);
    if (!out || out.spheres.length !== local.spheres.length) {
      out = { ...local, spheres: local.spheres.map((s) => ({ center: [0, 0, 0] as Vec3, r: s.r })), eye: { ...local.eye, dir: [0, 0, 1] } };
      this.framed.set(slot, out);
    }
    const spheres = out.spheres;
    for (let i = 0; i < local.spheres.length; i++) {
      const s = local.spheres[i]!;
      const o = spheres[i]!;
      mulRV(rf, s.center, o.center as Vec3);
      (o as { r: number }).r = s.r;
    }
    const e = local.eye;
    // Copy the scalar fields (colours, material, noise …) of this frame's body, then the turned vectors.
    Object.assign(out, local, { spheres, eye: { dir: mulRV(rf, e.dir, [0, 0, 0]), size: e.size, spacing: e.spacing } });
    // On a tilted frame the flat base would cut along the herd's y: the terrain hides the lower dome instead.
    if (!upright) out.floorY = NO_FLOOR;
    else if (local.floorY === undefined) delete out.floorY;
    else out.floorY = local.floorY;
    return out;
  }

  private readonly framed = new Map<number, BlobParams>();
}

interface HerdMemberWithParent extends HerdMember {
  parentMatrix?: Matrix4;
}

function prio(p: PartSpec): number {
  if (p.asset.startsWith('beak')) return 90;
  return SLOT_PRIORITY[p.slot] ?? 10;
}

/** An undiscovered look: the same shape in ink (no pattern, no coat, no gloss, no eye slit). */
export function silhouetteSpec(spec: CreatureSpec, ink: string): CreatureSpec {
  const body: BlobParams = {
    ...spec.body,
    baseColor: ink,
    innerColor: ink,
    rimColor: ink,
    highlightColor: ink,
    bubbleColor: ink,
    gloss: 0,
    translucency: 0,
    bubbleDensity: 0,
    eye: { ...spec.body.eye, size: 0 },
  };
  return {
    ...spec,
    body,
    palette: { baseColor: ink, innerColor: ink, rimColor: ink, highlightColor: ink, bubbleColor: ink },
    skin: { ...spec.skin, coat: 'bare', pattern: 'none' },
    parts: spec.parts.map((p) => ({ ...p, tint: ink })),
    constants: { ink, bone: ink, accent: ink },
    paintedEye: true,
  };
}

/** Every part instance of a rig in flat ink (authored module colours too). */
function inkParts(rig: CreatureRig, ink: string): void {
  const v = parseInt(ink.replace('#', ''), 16);
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = lin((v >> 16) & 255);
  const g = lin((v >> 8) & 255);
  const b = lin(v & 255);
  for (const p of rig.parts) {
    for (const inst of (p as unknown as { instances: Array<{ pool: { setTint(i: number, r: number, g: number, b: number): void; setAnim(i: number, x: number, y: number, z: number, w: number): void }; index: number }> }).instances) {
      inst.pool.setTint(inst.index, r, g, b);
      inst.pool.setAnim(inst.index, 0, 1, 0.05, 0);
    }
  }
}

export { IDENTITY as HERD_IDENTITY };
