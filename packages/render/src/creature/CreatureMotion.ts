import {
  MotionController,
  NO_FLOOR,
  RADIAL_TRACE_EXACT,
  poseSpheres,
  radialSurfaceDistance,
  sdfNormal,
  socketDirection,
  squashScales,
  type BlobParams,
  type BodyPose,
  type CreatureSpec,
  type LegDef,
  type MotionConfig,
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
}

/**
 * Bridges one creature's `MotionController` (pure locomotion math in @ee/genome) with its rig and the
 * body parameter block: derives the leg definitions from the rig's leg modules (hip rest points traced
 * on the rest body, lengths from the module tips), steps the controller, and turns the pose into the
 * posed body parameters (rotated/displaced spheres, droplets, the floor cut following the ground) and
 * the world centre of the body origin.
 */
export class CreatureMotion {
  readonly controller: MotionController;
  readonly legs: LegDef[];
  readonly scale: number;
  private readonly restFloor: number;
  private readonly posed: SpherePrim[] = [];
  private params: BlobParams | null = null;
  private readonly bodyPose: BodyPose = { rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1], spineWave: null, headBob: 0, headNod: 0, droplets: [] };

  constructor(
    readonly spec: CreatureSpec,
    readonly rig: CreatureRig,
    opts: CreatureMotionOptions,
  ) {
    this.scale = opts.scale;
    this.legs = legDefsFor(spec, rig);
    this.restFloor = spec.body.floorY ?? NO_FLOOR;
    const cfg: MotionConfig = { traits: spec.motion, skeleton: spec.skeleton, seed: opts.seed, scale: opts.scale, legs: this.legs };
    if (opts.ground) cfg.ground = opts.ground;
    if (opts.gravity !== undefined) cfg.gravity = opts.gravity;
    this.controller = new MotionController(cfg);
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
   * Body parameters for this frame: posed spheres plus, for blobs, the flat base kept on the ground
   * (the cut plane sinks away when the body lifts off — a jumping blob rounds into a teardrop — and
   * rises into the body while it crouches). The same object every frame (mutated in place: consumers
   * read it within the frame, nothing may cache it by identity).
   */
  posedParams(pose: Pose): BlobParams {
    const params = (this.params ??= { ...this.spec.body, spheres: this.posed });
    // Splat droplets are *not* part of the body: the jiggle mesh cannot draw disconnected islands, so
    // they are drawn as their own tiny blob instances (see `dropletParams`).
    this.bodyPose.rotation = pose.rotation;
    this.bodyPose.spineWave = pose.spineWave;
    this.bodyPose.headBob = pose.headBob;
    this.bodyPose.headNod = pose.headNod;
    poseSpheres(this.spec.body.spheres, this.spec.skeleton, this.bodyPose, this.posed);
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

/** Legs of the rig as the controller needs them: hip rest points on the rest body, lengths in blob units. */
export function legDefsFor(spec: CreatureSpec, rig: CreatureRig): LegDef[] {
  const legs: LegDef[] = [];
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
