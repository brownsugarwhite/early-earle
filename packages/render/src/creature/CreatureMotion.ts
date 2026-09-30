import {
  MotionController,
  NO_FLOOR,
  RADIAL_TRACE_EXACT,
  coilSwallow,
  devour,
  faceCapFor,
  leapToCamera,
  poseSpheres,
  pounceTo,
  radialSurfaceDistance,
  sdfNormal,
  socketDirection,
  splashMerge,
  squashScales,
  stompMerge,
  type BlobParams,
  type BodyPose,
  type CreatureSpec,
  type FaceCap,
  type LeapOptions,
  type LegDef,
  type MergeMove,
  type MotionConfig,
  type MoveContext,
  type MoveEvent,
  type MovePartner,
  type Pose,
  type SdfProgram,
  type SpherePrim,
  type Vec3,
} from '@ee/genome';
import type { CreatureRig } from './CreatureRig';

export interface CreatureMotionOptions {
  seed: number;
  /** Blob units → world units (usually `spec.worldScale`). */
  scale: number;
  ground?: ((x: number, z: number) => number) | undefined;
  gravity?: number | undefined;
  /** Snakes coil up when resting (default true). */
  coilAtRest?: boolean | undefined;
  /** Idle life: head glances, trunk play, the odd yawn, blob micro-hops (default true). */
  idleLife?: boolean | undefined;
}

/** Options every merge move takes. */
export interface MoveOptions {
  /** Duration multiplier: 1 = natural, 0.5 = twice as fast (board combos), 2 = slow motion. */
  timeScale?: number | undefined;
  /** Fires for every scheduled event (`launch`, `contact`, `bite`, `swallow`, `splash`, `done` …). */
  onEvent?: ((e: MoveEvent) => void) | undefined;
}

/** A merge partner: another creature (its position and size are read) or a plain position/radius. */
export type PartnerLike = MovePartner | CreatureMotion;

/** Face cap for `BlobDynamics.face` (the body shader keeps patterns and fur off the face). */
export interface FaceMaskLike {
  dir: [number, number, number];
  radius: number;
  strength: number;
}

/**
 * Bridges one creature's `MotionController` (pure locomotion math in @ee/genome) with its rig and the
 * body parameter block: derives the leg definitions (kneaded SDF legs from the skeleton, leg modules from
 * the rig), steps the controller, and turns the pose into the posed body parameters (rotated/displaced
 * spheres, feet, neck lead, trunk, jaw, the snake's spine, droplets, the floor cut following the ground)
 * and the world centre of the body origin. Merge moves (`pounceTo`, `leapToCamera`, `devour`,
 * `coilSwallow`, `stompMerge`, `splashMerge`) play on the controller with event hooks.
 */
export class CreatureMotion {
  readonly controller: MotionController;
  readonly legs: LegDef[];
  readonly scale: number;
  private readonly restFloor: number;
  private readonly posed: SpherePrim[] = [];
  private params: BlobParams | null = null;
  private readonly bodyPose: BodyPose = { rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1], spineWave: null, headBob: 0, headNod: 0, droplets: [] };
  private readonly feet: Vec3[] = [];
  private readonly footSwing: number[] = [];
  private readonly footSplat: number[] = [];
  private readonly sdfLegs: boolean;
  private readonly cap: FaceCap | null;
  private readonly mask: FaceMaskLike = { dir: [0, 0, 1], radius: 0.6, strength: 1 };
  /** Hidden painted eye of module-eyed creatures: it carries the body's forward axis for the patterns. */
  private readonly eye: { dir: Vec3; size: number; spacing: number };
  private readonly restEye: Vec3;
  /** Patterns in raw rest space (giraffe patches) turn via their rotation instead of the eye. */
  private readonly restFrame: boolean;

  constructor(
    readonly spec: CreatureSpec,
    readonly rig: CreatureRig,
    opts: CreatureMotionOptions,
  ) {
    this.scale = opts.scale;
    this.legs = legDefsFor(spec, rig);
    this.restFloor = spec.body.floorY ?? NO_FLOOR;
    this.sdfLegs = spec.legStyle === 'sdf' && spec.skeleton.legs.length > 0;
    const cfg: MotionConfig = { traits: spec.motion, skeleton: spec.skeleton, seed: opts.seed, scale: opts.scale, legs: this.legs, body: spec.body.spheres };
    if (opts.ground) cfg.ground = opts.ground;
    if (opts.gravity !== undefined) cfg.gravity = opts.gravity;
    if (opts.coilAtRest !== undefined) cfg.coilAtRest = opts.coilAtRest;
    if (opts.idleLife !== undefined) cfg.idleLife = opts.idleLife;
    this.controller = new MotionController(cfg);
    // Kneaded stumps take short, quick steps (a long stride would tear the foot out of the jelly).
    if (this.sdfLegs && this.controller.cycle) {
      this.controller.cycle.strideScale = spec.bodyType === 'biped' ? 0.62 : 0.5;
      this.controller.cycle.liftScale = spec.bodyType === 'biped' ? 0.95 : 0.8;
    }
    for (let i = 0; i < spec.skeleton.legs.length; i++) {
      this.feet.push([0, 0, 0]);
      this.footSwing.push(0);
      this.footSplat.push(0);
    }
    this.cap = faceCapFor(spec);
    this.restEye = [spec.body.eye.dir[0], spec.body.eye.dir[1], spec.body.eye.dir[2]];
    this.eye = { dir: [this.restEye[0], this.restEye[1], this.restEye[2]], size: spec.body.eye.size, spacing: spec.body.eye.spacing };
    this.restFrame = spec.skin.pattern === 'giraffe';
  }

  /**
   * Extra rotation (radians about up) to add to the pattern's own rotation this frame: patterns laid out
   * in raw rest space (the giraffe's patches) turn with the heading this way; every other pattern follows
   * the (posed) eye direction the body shader uses as its forward axis. Mesh bodies need nothing:
   * `CreatureMeshBodies.add` resets the pattern rotation of their slot (the flag stays for old callers).
   */
  patternYaw(pose: Pose, meshBody = false): number {
    return this.restFrame && !meshBody ? pose.yaw : 0;
  }

  get pose(): Pose {
    return this.controller.currentPose;
  }

  step(dt: number): Pose {
    return this.controller.step(dt);
  }

  /** World position of the body origin for the parameter block (ground height + lift). */
  center(pose: Pose): Vec3 {
    return [pose.x, this.controller.ground(pose.x, pose.z) + pose.lift, pose.z];
  }

  /**
   * Body parameters for this frame: posed spheres (feet on the gait's footholds, the head leading on its
   * neck, trunk, jaw, the snake's spine on its trail) plus, for blobs, the flat base kept on the ground
   * (the cut plane sinks away when the body lifts off and rises into the body while it crouches). The same
   * object every frame (mutated in place: consumers read it within the frame, nothing may cache it).
   * `frame: 'rest'` keeps the rest forward axis (raw-space patterns); mesh bodies set their own frame.
   */
  posedParams(pose: Pose, frame: 'posed' | 'rest' = 'posed'): BlobParams {
    const params = (this.params ??= { ...this.spec.body, spheres: this.posed });
    // Splat droplets are *not* part of the body: the jiggle mesh cannot draw disconnected islands, so
    // they are drawn as their own tiny blob instances (see `dropletParams`).
    const bp = this.bodyPose;
    bp.rotation = pose.rotation;
    bp.spineWave = pose.spineWave;
    bp.headBob = pose.headBob;
    bp.headNod = pose.headNod;
    bp.neckBend = pose.neckBend ?? 0;
    bp.trunkSway = pose.trunkSway ?? 0;
    bp.trunkCurl = pose.trunkCurl ?? 0;
    bp.jaw = pose.jaw ?? 0;
    bp.spinePoints = pose.spinePoints ?? null;
    bp.sphereScale = pose.sphereScale ?? null;
    if (this.sdfLegs && pose.feet.length > 0) {
      const gy = this.controller.ground(pose.x, pose.z);
      const oy = gy + pose.lift;
      const legs = this.spec.skeleton.legs;
      const hidden = this.rig.hiddenSlots.has('leg');
      const r = pose.rotation;
      for (let i = 0; i < legs.length; i++) {
        const f = pose.feet[i];
        const out = this.feet[i]!;
        if (!f || hidden) {
          // Hidden legs retract into the body (the foot sphere sinks into the hip).
          const h = legs[i]!.hip;
          out[0] = r[0] * h[0] + r[1] * h[1] + r[2] * h[2];
          out[1] = r[3] * h[0] + r[4] * h[1] + r[5] * h[2] - legs[i]!.footR;
          out[2] = r[6] * h[0] + r[7] * h[1] + r[8] * h[2];
          this.footSwing[i] = 0;
          this.footSplat[i] = 0;
          continue;
        }
        out[0] = (f.pos[0] - pose.x) / this.scale;
        out[1] = (f.pos[1] - oy) / this.scale;
        out[2] = (f.pos[2] - pose.z) / this.scale;
        this.footSwing[i] = f.planted ? 0 : f.swing;
        this.footSplat[i] = f.splat ?? 0;
      }
      bp.feet = this.feet;
      bp.footSwing = this.footSwing;
      bp.footSplat = this.footSplat;
    } else {
      bp.feet = null;
    }
    poseSpheres(this.spec.body.spheres, this.spec.skeleton, bp, this.posed);
    if (!this.spec.paintedEye) {
      // The shrunk painted eye points at the face: the body's forward axis for stripes, lattices, fur flow.
      const e = this.eye.dir;
      // Rest frame (mesh bodies of bare animals, the giraffe's raw-space patches): the forward axis stays
      // the rest one — the pattern coordinates are the rest body's.
      if (this.restFrame || frame === 'rest') {
        e[0] = this.restEye[0];
        e[1] = this.restEye[1];
        e[2] = this.restEye[2];
      } else {
        const r = pose.rotation;
        const x = this.restEye[0];
        const y = this.restEye[1];
        const z = this.restEye[2];
        e[0] = r[0] * x + r[1] * y + r[2] * z;
        e[1] = r[3] * x + r[4] * y + r[5] * z;
        e[2] = r[6] * x + r[7] * y + r[8] * z;
      }
      params.eye = this.eye;
    }
    if (this.restFloor > NO_FLOOR) {
      const { along, across } = squashScales(pose.squash.amount);
      const ay = pose.squash.axis[1];
      const sy = along * ay * ay + across * (1 - ay * ay);
      const grounded = this.controller.restHeight * sy;
      const extra = (pose.lift - grounded) / Math.max(1e-6, this.scale);
      params.floorY = this.restFloor - extra;
    }
    return params;
  }

  /**
   * Face cap for `BlobDynamics.face`: the eye modules' cap turned with the pose (and the neck lead), so
   * patterns and fur step back around the eyes. Null for painted eyes (the renderer derives it). Mesh
   * bodies write their own (rest-frame) face cap in `CreatureMeshBodies.add`.
   */
  faceMask(pose: Pose, frame: 'posed' | 'rest' = 'posed'): FaceMaskLike | null {
    const cap = this.cap;
    if (!cap) return null;
    if (frame === 'rest') {
      const m = this.mask;
      m.dir[0] = cap.dir[0];
      m.dir[1] = cap.dir[1];
      m.dir[2] = cap.dir[2];
      m.radius = cap.radius;
      return m;
    }
    let x = cap.dir[0];
    const y = cap.dir[1];
    let z = cap.dir[2];
    const bend = (pose.neckBend ?? 0) * 0.7;
    if (bend !== 0) {
      const c = Math.cos(bend);
      const s = Math.sin(bend);
      const x0 = x;
      x = x0 * c + z * s;
      z = -x0 * s + z * c;
    }
    const r = pose.rotation;
    const m = this.mask;
    m.dir[0] = r[0] * x + r[1] * y + r[2] * z;
    m.dir[1] = r[3] * x + r[4] * y + r[5] * z;
    m.dir[2] = r[6] * x + r[7] * y + r[8] * z;
    m.radius = cap.radius;
    return m;
  }

  // --- facing & merge moves ---------------------------------------------------------------------------

  /** Turns to a heading (radians) or toward a point, anticipating and overshooting (see MotionController). */
  faceDirection(dir: number | readonly [number, number], opts: { timeScale?: number } = {}): number {
    return this.controller.faceDirection(dir, opts);
  }

  /** The context a merge move starts from (this creature's position, heading, size, mass, bounce). */
  moveContext(timeScale = 1): MoveContext {
    const c = this.controller;
    const [x, z] = c.position;
    return { from: [x, z], yaw: c.heading, scale: this.scale, mass: c.mass, bounce: this.spec.motion.bounce, bodyType: this.spec.bodyType, timeScale };
  }

  /** Radius (world) of this creature's body for merge partners. */
  get radius(): number {
    return 0.5 * Math.max(this.spec.skeleton.width, Math.min(this.spec.skeleton.length, 2.4)) * this.scale;
  }

  pounceTo(target: readonly [number, number], opts: MoveOptions = {}): MergeMove {
    return this.play(pounceTo(this.moveContext(opts.timeScale), target), opts);
  }

  leapToCamera(height: number, opts: MoveOptions & { camera?: Vec3; partner?: PartnerLike } = {}): MergeMove {
    const lo: LeapOptions = {};
    if (opts.camera) lo.camera = opts.camera;
    if (opts.partner) lo.partner = partnerOf(opts.partner);
    return this.play(leapToCamera(this.moveContext(opts.timeScale), height, lo), opts);
  }

  devour(partner: PartnerLike, opts: MoveOptions = {}): MergeMove {
    return this.play(devour(this.moveContext(opts.timeScale), partnerOf(partner)), opts);
  }

  coilSwallow(partner: PartnerLike, opts: MoveOptions = {}): MergeMove {
    const thick = this.spec.skeleton.width * this.scale;
    return this.play(coilSwallow(this.moveContext(opts.timeScale), partnerOf(partner), thick), opts);
  }

  stompMerge(opts: MoveOptions & { partner?: PartnerLike } = {}): MergeMove {
    return this.play(stompMerge(this.moveContext(opts.timeScale), opts.partner ? partnerOf(opts.partner) : undefined), opts);
  }

  splashMerge(opts: MoveOptions & { partner?: PartnerLike } = {}): MergeMove {
    return this.play(splashMerge(this.moveContext(opts.timeScale), opts.partner ? partnerOf(opts.partner) : undefined), opts);
  }

  private play(move: MergeMove, opts: MoveOptions): MergeMove {
    this.controller.play(move, opts.onEvent);
    return move;
  }
}

function partnerOf(p: PartnerLike): MovePartner {
  if (p instanceof CreatureMotion) {
    const [x, z] = p.controller.position;
    return { x, z, radius: p.radius };
  }
  return p;
}

/**
 * A droplet as its own blob instance: one unit sphere in the creature's palette and material (no eye,
 * no organs, a little noise so it wobbles). Write it with scale = droplet radius × world scale.
 */
export function dropletParams(body: BlobParams): BlobParams {
  return {
    ...body,
    spheres: [{ center: [0, 0, 0], r: 1 }],
    floorY: NO_FLOOR,
    sminK: 0,
    noiseAmp: Math.min(0.06, body.noiseAmp),
    translucency: 0,
    bubbleDensity: 0,
    squash: { axis: [0, 1, 0], amount: 0, taper: 0 },
    eye: { dir: [0.02, -1, 0.05], size: 0.0001, spacing: 0 },
  };
}

/**
 * Legs of a creature as the controller needs them: kneaded SDF legs straight from the skeleton (hip,
 * length), leg modules from the rig (hip rest points traced on the rest body, lengths from the modules).
 */
export function legDefsFor(spec: CreatureSpec, rig: CreatureRig): LegDef[] {
  const legs: LegDef[] = [];
  if (spec.legStyle === 'sdf' && spec.skeleton.legs.length > 0) {
    spec.skeleton.legs.forEach((l, i) => {
      const part = rig.parts.find((p) => p.spec.slot === 'leg' && p.spec.role === l.role);
      legs.push({ id: part?.spec.id ?? `leg:leg_sdf:${i}`, role: l.role, hip: [l.hip[0], l.hip[1], l.hip[2]], length: l.length, side: l.hip[0] >= 0 ? 1 : -1, pair: l.role === 'BL' || l.role === 'BR' ? 'back' : 'front', knee: l.bend });
    });
    return legs;
  }
  const rest: SdfProgram = { ...spec.body, noiseAmp: 0 };
  for (const p of rig.parts) {
    const s = p.spec;
    if (s.slot !== 'leg' || s.role === null) continue;
    const dir = socketDirection(s.theta, s.phi);
    const anchor = s.anchor >= 0 ? rest.spheres[s.anchor] : undefined;
    const origin: Vec3 = anchor ? anchor.center : boxCentre(rest.spheres);
    const t = radialSurfaceDistance(rest, dir, {}, RADIAL_TRACE_EXACT, origin);
    const point: Vec3 = [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
    const n = sdfNormal(rest, point, {}, 0.02);
    const hip: Vec3 = [point[0] - n[0] * s.sink, point[1] - n[1] * s.sink, point[2] - n[2] * s.sink];
    // Fit the module to the species' stance height (0.9 × length reaches the ground from the hip, as the
    // kneaded legs do), so a leg asset never lifts a round body onto stilts.
    const designed = (spec.skeleton.restLift + hip[1]) / 0.9;
    const current = rig.legLength(s.id);
    if (current > 1e-3 && designed > 0.1) rig.fitLeg(s.id, designed / current);
    const length = Math.max(0.15, rig.legLength(s.id));
    legs.push({ id: s.id, role: s.role, hip, length, side: hip[0] >= 0 ? 1 : -1, pair: s.role === 'BL' || s.role === 'BR' ? 'back' : 'front', knee: s.knee });
  }
  return legs;
}

function boxCentre(spheres: readonly SpherePrim[]): Vec3 {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of spheres) {
    minX = Math.min(minX, s.center[0] - s.r);
    maxX = Math.max(maxX, s.center[0] + s.r);
    minZ = Math.min(minZ, s.center[2] - s.r);
    maxZ = Math.max(maxZ, s.center[2] + s.r);
  }
  return [Number.isFinite(minX) ? (minX + maxX) / 2 : 0, 0, Number.isFinite(minZ) ? (minZ + maxZ) / 2 : 0];
}
