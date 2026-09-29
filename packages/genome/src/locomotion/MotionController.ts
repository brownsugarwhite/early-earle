/**
 * MotionController — one per creature: mass, stiffness and gait from the genome, commands from the game
 * (walk to a point, walk a circle, jump to a point, stop) and a Pose per frame that the render side
 * applies to the body (posed spheres, squash, lift), the sockets (rotation) and the legs (foot targets
 * for IK). Deterministic: same config + same commands + same dt sequence → same trajectory.
 *
 * Gaits: blob = hops (idle micro-hops, a hop sequence toward a target, a real slime jump on command:
 * anticipation squash → launch stretch along the velocity → ballistic arc → splat with droplets and a
 * ripple → spring recovery); quadruped = walk/trot step cycle with planted feet, body bob and roll; REX =
 * stomp walk with head bob and tail counter-swing; heavy = waddle (slow, wide sway, occasional stumble);
 * snake = slither (travelling wave along the spine, head leads, amplitude and rate follow the speed).
 */
import type { BodySkeleton } from '../body';
import type { GaitKind, MotionTraits } from '../creature';
import { makeRng, type Rng } from '../rng';
import type { SpherePrim, Squash, Vec3 } from '../types';
import { StepCycle, type FootState, type LegDef } from './gait';
import { JUMP_TIMING, anticipationSquash, flightStretch, jumpHeight, planJump, splatSquash, type JumpPlan } from './jump';
import { ROT_IDENTITY, rotationYPR, type Rot3, type SpineWave } from './pose';

export interface MotionConfig {
  traits: MotionTraits;
  skeleton: BodySkeleton;
  seed: number;
  /** Blob units → world units. */
  scale: number;
  legs?: readonly LegDef[];
  /** Height of the body origin above the ground when standing (world). Derived from the legs by default. */
  restHeight?: number;
  /** Terrain height (world); flat by default. */
  ground?: (x: number, z: number) => number;
  gravity?: number;
}

export type MotionMode = 'idle' | 'walk' | 'circle' | 'jump';
export type JumpPhase = 'none' | 'crouch' | 'flight' | 'splat' | 'recover';

export interface Pose {
  /** World ground position of the body origin's projection and its height above the ground. */
  x: number;
  z: number;
  lift: number;
  yaw: number;
  pitch: number;
  roll: number;
  rotation: Rot3;
  /** World-axis squash of the body. */
  squash: Squash;
  airborne: boolean;
  jumpPhase: JumpPhase;
  /** 0..1 crouch (legs bend, body lowers) — anticipation of a jump. */
  crouch: number;
  feet: readonly FootState[];
  spineWave: SpineWave | null;
  /** Head sphere offsets (blob units) and tail counter-swing (radians). */
  headBob: number;
  headNod: number;
  tailSwing: number;
  /** 0..1 ripple energy (landing splat). */
  jiggle: number;
  /** Impulse of a hard foot plant this frame (0 = none). */
  stomp: number;
  /** 0..1 stumble envelope. */
  stumble: number;
  speed: number;
  /** 0..1 speed relative to the archetype's top speed. */
  speedNorm: number;
  moving: boolean;
  /** Splat droplets in body units (appended to the sphere list). */
  droplets: readonly SpherePrim[];
  /** Seconds since the controller started. */
  time: number;
}

interface Droplet {
  pos: Vec3;
  vel: Vec3;
  r: number;
  r0: number;
  age: number;
  life: number;
}

interface JumpState {
  phase: JumpPhase;
  t: number;
  plan: JumpPlan | null;
  from: [number, number];
  to: [number, number];
  launchSpeed: number;
  /** Height above the ground during the flight. */
  height: number;
  vy: number;
  /** Anticipation length for this jump (s). */
  crouchDur: number;
  /** True for hops of the blob's walk (short recovery, chain continues). */
  hop: boolean;
}

const UP: Vec3 = [0, 1, 0];
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number): number => clamp(v, 0, 1);
const smooth = (u: number): number => u * u * (3 - 2 * u);

/** Top speed (world units/s) of a gait at scale 0.4, before tempo and the speed slider. */
const BASE_SPEED: Readonly<Record<GaitKind, number>> = { hop: 0.9, walk: 1.25, trot: 1.9, stomp: 1.1, slither: 1.15, waddle: 0.62 };
const TURN_RATE: Readonly<Record<GaitKind, number>> = { hop: 4, walk: 2.8, trot: 3.2, stomp: 2.4, slither: 2.2, waddle: 1.4 };

function wrapAngle(a: number): number {
  let x = a % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  if (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export class MotionController {
  readonly traits: MotionTraits;
  readonly skeleton: BodySkeleton;
  readonly scale: number;
  readonly legs: readonly LegDef[];
  readonly cycle: StepCycle | null;
  readonly ground: (x: number, z: number) => number;
  readonly gravity: number;
  /** Rest height of the origin above the ground (world). */
  readonly restHeight: number;
  /** Reference leg length (world) for strides and lifts; a body radius for legless archetypes. */
  readonly legLength: number;
  /** Multiplier from the lab's speed slider. */
  speedFactor = 1;
  /** Multiplier from the lab's mass slider. */
  massFactor = 1;
  /** Wander bounds for `wander()` (world half extents around the origin). */
  private readonly rng: Rng;
  private readonly pose: Pose;
  private mode: MotionMode = 'idle';
  private target: [number, number] | null = null;
  private circle: { cx: number; cz: number; r: number } | null = null;
  private x = 0;
  private z = 0;
  private yaw = 0;
  private speed = 0;
  private vx = 0;
  private vz = 0;
  private t = 0;
  private readonly jump: JumpState = { phase: 'none', t: 0, plan: null, from: [0, 0], to: [0, 0], launchSpeed: 0, height: 0, vy: 0, crouchDur: JUMP_TIMING.anticipate, hop: false };
  private sqAmount = 0;
  private sqVel = 0;
  private sqAxis: Vec3 = [0, 1, 0];
  private jiggle = 0;
  private droplets: Droplet[] = [];
  private wavePhase = 0;
  private waveAmp = 0;
  private nextMicroHop: number;
  private stumbleT = -1;
  private stumbleSign = 1;
  private lastPhase = 0;
  private idleShift = 0;
  /** Scratch: forward axis and hip point (the step cycle reads them immediately). */
  private readonly fwd: Vec3 = [0, 0, 1];
  private readonly hipOut: Vec3 = [0, 0, 0];
  private readonly hipFn = (leg: LegDef): Vec3 => this.hipWorld(leg, this.hipOut);
  private readonly dropletSpheres: SpherePrim[] = [];

  constructor(cfg: MotionConfig) {
    this.traits = cfg.traits;
    this.skeleton = cfg.skeleton;
    this.scale = cfg.scale;
    this.legs = cfg.legs ?? [];
    this.ground = cfg.ground ?? (() => 0);
    this.gravity = cfg.gravity ?? 9.8;
    this.rng = makeRng(cfg.seed >>> 0);
    const legged = this.legs.length > 0 && this.traits.gait !== 'hop' && this.traits.gait !== 'slither';
    if (cfg.restHeight !== undefined) this.restHeight = cfg.restHeight;
    else if (legged) {
      let sum = 0;
      for (const l of this.legs) sum += (0.9 * l.length - l.hip[1]) * this.scale;
      this.restHeight = Math.max(0.05, sum / this.legs.length);
    } else this.restHeight = this.skeleton.restLift * this.scale;
    this.legLength = legged ? Math.max(0.05, (this.legs.reduce((a, l) => a + l.length, 0) / this.legs.length) * this.scale) : Math.max(0.05, this.skeleton.restLift * this.scale);
    this.cycle = legged ? new StepCycle(this.legs, this.traits.gait, this.ground) : null;
    this.nextMicroHop = 1.5 + this.rng.next() * 3;
    this.idleShift = this.rng.next() * Math.PI * 2;
    this.pose = {
      x: 0,
      z: 0,
      lift: this.restHeight,
      yaw: 0,
      pitch: 0,
      roll: 0,
      rotation: [...ROT_IDENTITY] as Rot3,
      squash: { axis: [0, 1, 0], amount: 0, taper: 0.55 },
      airborne: false,
      jumpPhase: 'none',
      crouch: 0,
      feet: this.cycle ? this.cycle.feet : [],
      spineWave: null,
      headBob: 0,
      headNod: 0,
      tailSwing: 0,
      jiggle: 0,
      stomp: 0,
      stumble: 0,
      speed: 0,
      speedNorm: 0,
      moving: false,
      droplets: [],
      time: 0,
    };
    this.cycle?.reset(this.hipFn);
  }

  // --- commands ----------------------------------------------------------------------------------

  /** Places the creature (feet re-planted). */
  teleport(x: number, z: number, yaw = 0): void {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.speed = 0;
    this.vx = this.vz = 0;
    this.pose.x = x;
    this.pose.z = z;
    this.pose.yaw = yaw;
    this.pose.lift = this.restHeight;
    this.cycle?.reset(this.hipFn);
  }

  walkTo(x: number, z: number): void {
    this.target = [x, z];
    this.circle = null;
    if (this.jump.phase === 'none') this.mode = 'walk';
    else this.mode = 'walk'; // takes over after the current jump lands
  }

  walkCircle(cx: number, cz: number, r: number): void {
    this.circle = { cx, cz, r: Math.max(0.2, r) };
    this.target = null;
    this.mode = 'circle';
  }

  /** A real jump to a ground point (slime jump for blobs, a pounce/lunge for the others). */
  jumpTo(x: number, z: number): void {
    this.target = [x, z];
    this.circle = null;
    this.mode = 'jump';
    if (this.jump.phase === 'none' || this.jump.phase === 'recover') this.beginJump([x, z], false);
  }

  stop(): void {
    this.mode = 'idle';
    this.target = null;
    this.circle = null;
  }

  get currentMode(): MotionMode {
    return this.mode;
  }

  get position(): [number, number] {
    return [this.x, this.z];
  }

  get heading(): number {
    return this.yaw;
  }

  get currentPose(): Pose {
    return this.pose;
  }

  /** Effective mass (traits × slider). */
  get mass(): number {
    return Math.max(0.1, this.traits.mass * this.massFactor);
  }

  /** Top speed (world units/s) for the current sliders. */
  get maxSpeed(): number {
    const g = this.traits.gait;
    return BASE_SPEED[g] * Math.pow(this.scale / 0.4, 0.6) * Math.pow(Math.max(0.2, this.traits.tempo), 0.5) * this.speedFactor * Math.pow(this.mass / Math.max(0.1, this.traits.mass), -0.15);
  }

  /** Hip of a leg in world space for the current pose (written into `out` when given). */
  hipWorld(leg: LegDef, out?: Vec3): Vec3 {
    const p = this.pose;
    const r = p.rotation;
    const x = leg.hip[0] * this.scale;
    const y = leg.hip[1] * this.scale;
    const z = leg.hip[2] * this.scale;
    const gy = this.ground(p.x, p.z);
    const o = out ?? ([0, 0, 0] as Vec3);
    o[0] = p.x + r[0] * x + r[1] * y + r[2] * z;
    o[1] = gy + p.lift + r[3] * x + r[4] * y + r[5] * z;
    o[2] = p.z + r[6] * x + r[7] * y + r[8] * z;
    return o;
  }

  // --- simulation ------------------------------------------------------------------------------

  step(dtIn: number): Pose {
    const dt = clamp(dtIn, 0, 0.1);
    if (dt <= 0) return this.pose;
    this.t += dt;
    const pose = this.pose;
    const gait = this.traits.gait;
    const hop = gait === 'hop';
    const mass = this.mass;
    const maxSpeed = this.maxSpeed;
    pose.stomp = 0;

    // --- steering ---------------------------------------------------------------------------
    let desiredSpeed = 0;
    let desiredYaw = this.yaw;
    let dist = 0;
    if (this.mode === 'walk' && this.target) {
      const dx = this.target[0] - this.x;
      const dz = this.target[1] - this.z;
      dist = Math.hypot(dx, dz);
      const arrive = 0.05 + 0.1 * this.scale;
      if (dist < arrive) {
        this.mode = 'idle';
        this.target = null;
      } else {
        desiredYaw = Math.atan2(dx, dz);
        const brake = maxSpeed * 2.5;
        desiredSpeed = Math.min(maxSpeed, Math.sqrt(2 * brake * Math.max(0, dist - arrive * 0.5)));
      }
    } else if (this.mode === 'circle' && this.circle) {
      const c = this.circle;
      const rx = this.x - c.cx;
      const rz = this.z - c.cz;
      const rl = Math.hypot(rx, rz) || 1e-6;
      // Counter-clockwise tangent plus a pull toward the ring.
      const tx = rz / rl;
      const tz = -rx / rl;
      const err = (c.r - rl) / c.r;
      const sx = tx + (rx / rl) * err * 1.5;
      const sz = tz + (rz / rl) * err * 1.5;
      desiredYaw = Math.atan2(sx, sz);
      desiredSpeed = maxSpeed;
    }
    const airborne = this.jump.phase === 'flight';
    if (!airborne && this.jump.phase !== 'crouch' && this.jump.phase !== 'splat') {
      const dYaw = wrapAngle(desiredYaw - this.yaw);
      const turn = TURN_RATE[gait] * Math.pow(Math.max(0.2, this.traits.tempo), 0.3) * Math.pow(mass / Math.max(0.1, this.traits.mass), -0.3);
      const stepYaw = clamp(dYaw, -turn * dt, turn * dt);
      if (desiredSpeed > 0 || Math.abs(dYaw) > 0.01) this.yaw = wrapAngle(this.yaw + stepYaw);
      // Sharp turns: slow down and turn on the spot first.
      if (Math.abs(dYaw) > 1.2) desiredSpeed *= 0.15;
      else if (Math.abs(dYaw) > 0.6) desiredSpeed *= 0.5;
    }

    // --- hop sequence (blob walk) -------------------------------------------------------------
    if (hop && this.mode !== 'jump') {
      // A blob does not glide: walking is a chain of hops toward the target.
      desiredSpeed = 0;
      if ((this.mode === 'walk' || this.mode === 'circle') && this.jump.phase === 'none') {
        let to: [number, number] | null = null;
        if (this.mode === 'walk' && this.target) {
          const dx = this.target[0] - this.x;
          const dz = this.target[1] - this.z;
          const d = Math.hypot(dx, dz);
          const hopLen = Math.min(d, this.scale * (1.0 + 0.9 * this.traits.bounce) * Math.min(1.4, 0.6 + 0.8 * this.speedFactor));
          to = [this.x + (dx / d) * hopLen, this.z + (dz / d) * hopLen];
        } else if (this.circle) {
          const hopLen = this.scale * (0.9 + 0.7 * this.traits.bounce) * Math.min(1.4, 0.6 + 0.8 * this.speedFactor);
          to = [this.x + Math.sin(desiredYaw) * hopLen, this.z + Math.cos(desiredYaw) * hopLen];
        }
        if (to) this.beginJump(to, true);
      }
    }

    // --- idle micro-hops -----------------------------------------------------------------------
    if (hop && this.mode === 'idle' && this.jump.phase === 'none') {
      this.nextMicroHop -= dt;
      if (this.nextMicroHop <= 0) {
        this.nextMicroHop = (2 + this.rng.next() * 4) / Math.max(0.3, this.traits.tempo);
        this.beginJump([this.x, this.z], true, this.scale * 0.22 * (0.5 + this.traits.bounce));
      }
    }

    // --- stumble envelope (a clumsy body catches a foot: it slows down, pitches and rolls) ------------
    let stumbleEnv = 0;
    if (this.stumbleT >= 0) {
      this.stumbleT += dt;
      const dur = 0.75 * Math.pow(mass, 0.2);
      stumbleEnv = Math.sin(Math.PI * clamp01(this.stumbleT / dur));
      if (this.stumbleT >= dur) this.stumbleT = -1;
    }

    // --- horizontal integration (ground locomotion) ---------------------------------------------
    if (!airborne) {
      const accel = maxSpeed * (mass > 2 ? 2.2 : 4.5);
      if (this.jump.phase !== 'none') desiredSpeed = 0;
      desiredSpeed *= 1 - 0.75 * stumbleEnv;
      this.speed = desiredSpeed > this.speed ? Math.min(desiredSpeed, this.speed + accel * dt) : Math.max(desiredSpeed, this.speed - accel * 1.6 * dt);
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      this.vx = fx * this.speed;
      this.vz = fz * this.speed;
      this.x += this.vx * dt;
      this.z += this.vz * dt;
    }
    const speedNorm = maxSpeed > 1e-6 ? clamp01(this.speed / maxSpeed) : 0;

    // --- jump machine ---------------------------------------------------------------------------
    let crouch = 0;
    let flightHeight = 0;
    let stretchAxis: Vec3 | null = null;
    let stretchAmount = 0;
    let splatNow = false;
    const j = this.jump;
    if (j.phase !== 'none') {
      j.t += dt;
      switch (j.phase) {
        case 'crouch': {
          const u = j.t / j.crouchDur;
          crouch = smooth(clamp01(u));
          this.sqAmount = anticipationSquash(u, j.hop ? 0.22 : 0.36 * (0.7 + 0.3 * this.traits.bounce));
          this.sqVel = 0;
          this.sqAxis = UP;
          if (u >= 1) {
            // Launch.
            const plan = planJump([this.x, this.z], j.to, { gravity: this.gravity, power: this.traits.bounce * (j.hop ? 0.35 : 1) * Math.pow(mass, -0.2), size: this.scale, ...(j.hop && j.plan ? { apex: j.plan.apex } : {}) });
            j.plan = plan;
            j.launchSpeed = Math.hypot(plan.vx, plan.vy, plan.vz);
            j.phase = 'flight';
            j.t = 0;
            j.height = 0;
            j.vy = plan.vy;
            this.vx = plan.vx;
            this.vz = plan.vz;
            if (Math.hypot(plan.vx, plan.vz) > 1e-4) this.yaw = Math.atan2(plan.vx, plan.vz);
            this.speed = Math.hypot(plan.vx, plan.vz);
          }
          break;
        }
        case 'flight': {
          const plan = j.plan!;
          j.height = jumpHeight(plan, j.t);
          this.x = j.from[0] + plan.vx * j.t;
          this.z = j.from[1] + plan.vz * j.t;
          const vy = plan.vy - plan.gravity * j.t;
          j.vy = vy;
          const v = Math.hypot(plan.vx, vy, plan.vz);
          stretchAmount = flightStretch(v, j.launchSpeed, j.hop ? 0.3 : 0.45) * (0.7 + 0.3 * this.traits.bounce);
          stretchAxis = v > 1e-6 ? [plan.vx / v, vy / v, plan.vz / v] : UP;
          this.sqAmount = stretchAmount;
          this.sqVel = 0;
          this.sqAxis = stretchAxis;
          flightHeight = Math.max(0, j.height);
          if (j.t >= plan.duration) {
            // Touchdown: land exactly on the target.
            this.x = j.to[0];
            this.z = j.to[1];
            this.vx = this.vz = 0;
            this.speed = 0;
            const impact = Math.hypot(plan.vx, vy, plan.vz);
            this.sqAmount = splatSquash(impact, j.launchSpeed, j.hop ? mass * 0.5 : mass);
            this.sqVel = 0;
            this.sqAxis = UP;
            this.jiggle = j.hop ? 0.45 : 1;
            splatNow = true;
            if (!j.hop || impact > this.scale * 5) this.spawnDroplets(j.hop ? 3 : 5, impact);
            j.phase = 'splat';
            j.t = 0;
            this.cycle?.reset(this.hipFn);
          }
          break;
        }
        case 'splat': {
          const hold = JUMP_TIMING.splat * Math.pow(mass, 0.3);
          if (j.t >= hold) {
            j.phase = 'recover';
            j.t = 0;
          }
          break;
        }
        case 'recover': {
          const dur = (j.hop ? 0.1 : JUMP_TIMING.recover) * Math.pow(mass, 0.25);
          if (j.t >= dur) {
            j.phase = 'none';
            j.t = 0;
            if (this.mode === 'jump') {
              this.mode = 'idle';
              this.target = null;
            }
          }
          break;
        }
        default:
          break;
      }
    }

    const flying = j.phase === 'flight';

    // --- squash spring (recovery wobble) ----------------------------------------------------------
    if (j.phase === 'none' || j.phase === 'recover' || j.phase === 'splat') {
      const stiff = this.traits.stiffness;
      const omega = (9 + 16 * stiff) / Math.pow(mass, 0.25);
      const zeta = 0.2 + 0.4 * stiff;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        this.sqVel += (-omega * omega * this.sqAmount - 2 * zeta * omega * this.sqVel) * h;
        this.sqAmount += this.sqVel * h;
      }
      if (Math.abs(this.sqAmount) < 1e-4 && Math.abs(this.sqVel) < 1e-4) this.sqAmount = this.sqVel = 0;
      // The axis relaxes toward up so idle wobble is vertical.
      if (j.phase === 'none') this.sqAxis = UP;
    }
    this.jiggle = Math.max(0, this.jiggle - dt * 1.6);

    // --- gait ------------------------------------------------------------------------------------
    let bob = 0;
    let roll = 0;
    let pitch = 0;
    let headBob = 0;
    let headNod = 0;
    let tailSwing = 0;
    const cyc = this.cycle;
    const grounded = !flying && j.phase !== 'crouch';
    if (cyc) {
      if (grounded) {
        // Stumble trigger: clumsy bodies catch a foot now and then (once per cycle at most).
        if (this.stumbleT < 0 && cyc.phase < this.lastPhase && speedNorm > 0.2 && this.rng.next() < this.traits.clumsy) {
          this.stumbleT = 0;
          this.stumbleSign = this.rng.next() < 0.5 ? -1 : 1;
          this.jiggle = Math.max(this.jiggle, 0.35);
        }
        this.lastPhase = cyc.phase;
        const fwd = this.fwd;
        fwd[0] = Math.sin(this.yaw);
        fwd[1] = 0;
        fwd[2] = Math.cos(this.yaw);
        cyc.step(dt, this.speed, fwd, this.legLength, this.hipFn, 1 - 0.6 * stumbleEnv, Math.max(0.3, this.traits.tempo));
        const intensity = 0.25 + 0.75 * speedNorm;
        const bm = cyc.bodyMotion(this.legLength, intensity);
        bob = bm.bob;
        roll = bm.roll * Math.pow(mass, 0.3);
        // Hard plants: stomps (REX) and heavy steps shake the body and kick the springs.
        for (const f of cyc.feet) {
          if (!f.landed) continue;
          const strength = gait === 'stomp' ? 0.9 : gait === 'waddle' ? 0.6 : 0.15;
          pose.stomp = Math.max(pose.stomp, strength * (0.4 + 0.6 * speedNorm));
          this.sqVel -= 2.2 * strength * (0.4 + 0.6 * speedNorm) * Math.pow(mass, 0.3);
          this.sqAxis = UP;
          if (gait === 'stomp' || gait === 'waddle') this.jiggle = Math.max(this.jiggle, 0.25 * strength);
        }
        const beatPh = ((cyc.phase * cyc.params.beats) / 2) * Math.PI * 2;
        if (gait === 'stomp') {
          headBob = -0.09 * Math.abs(Math.sin(beatPh)) * intensity;
          headNod = 0.04 * Math.sin(beatPh) * intensity;
          tailSwing = -0.55 * Math.sin(cyc.phase * Math.PI * 2) * intensity;
          pitch = 0.06 * speedNorm;
        } else if (gait === 'waddle') {
          headBob = -0.05 * Math.abs(Math.sin(beatPh)) * intensity;
          tailSwing = -0.3 * Math.sin(cyc.phase * Math.PI * 2) * intensity;
        } else {
          headBob = -0.045 * Math.abs(Math.sin(beatPh)) * intensity;
          headNod = 0.03 * Math.sin(beatPh) * intensity;
          tailSwing = 0.25 * Math.sin(cyc.phase * Math.PI * 2) * intensity;
          pitch = 0.03 * speedNorm;
        }
        if (stumbleEnv > 0) {
          pitch += 0.3 * stumbleEnv;
          roll += 0.28 * stumbleEnv * this.stumbleSign;
          bob -= 0.1 * this.legLength * stumbleEnv;
          // Wobble while catching itself (a force on the squash spring, frame-rate independent).
          this.sqVel += Math.sin(this.t * 26) * stumbleEnv * 5 * dt;
        }
      } else if (flying) {
        // Feet tuck under the hips in flight.
        for (const f of cyc.feet) {
          const h = this.hipWorld(f.leg, this.hipOut);
          f.pos[0] = h[0];
          f.pos[1] = h[1] - f.leg.length * this.scale * 0.7;
          f.pos[2] = h[2];
          f.planted = false;
          f.swing = 0.5;
        }
      }
      // Idle weight shift so a standing animal is never frozen.
      if (this.speed < 1e-3 && grounded && j.phase === 'none') {
        bob += 0.006 * this.legLength * Math.sin(this.t * 1.1 + this.idleShift);
        roll += 0.015 * Math.sin(this.t * 0.7 + this.idleShift);
      }
    }

    // --- slither -----------------------------------------------------------------------------------
    let spineWave: SpineWave | null = null;
    if (gait === 'slither') {
      const targetAmp = 0.1 + 0.62 * speedNorm;
      this.waveAmp += (targetAmp - this.waveAmp) * (1 - Math.exp(-dt * 4));
      const rate = (0.5 + 2.1 * speedNorm) * Math.max(0.3, this.traits.tempo) * Math.PI * 2;
      this.wavePhase += rate * dt;
      const spineN = this.skeleton.spine?.length ?? 8;
      spineWave = { amp: this.waveAmp, phase: this.wavePhase, waves: 1.05 + 0.03 * spineN };
      headBob = 0.1 * speedNorm + 0.03 * Math.sin(this.t * 1.7);
      roll = 0.08 * Math.sin(this.wavePhase) * speedNorm;
    }

    // --- droplets ------------------------------------------------------------------------------------
    if (this.droplets.length > 0) this.stepDroplets(dt);

    // --- assemble the pose ------------------------------------------------------------------------
    const squashAmount = clamp(this.sqAmount, -0.58, 1.2);
    const axis = this.sqAxis;
    const along = Math.max(0.2, 1 + squashAmount);
    const across = 1 / Math.sqrt(along);
    const ay = axis[1];
    const sy = along * ay * ay + across * (1 - ay * ay);
    // A flattened body keeps its base on the ground: the origin sinks with the vertical scale.
    const crouchDepth = crouch * this.restHeight * (cyc ? 0.28 : 0.2);
    const lift = Math.max(0.02, this.restHeight * (flying ? 1 : sy) + bob - crouchDepth) + flightHeight;
    pose.x = this.x;
    pose.z = this.z;
    pose.lift = lift;
    pose.yaw = this.yaw;
    pose.pitch = pitch;
    pose.roll = roll;
    rotationYPR(this.yaw, pitch, roll, pose.rotation);
    pose.squash.axis[0] = axis[0];
    pose.squash.axis[1] = axis[1];
    pose.squash.axis[2] = axis[2];
    pose.squash.amount = squashAmount;
    pose.squash.taper = this.traits.bodyType === 'blob' ? 0.55 : 0.35;
    pose.airborne = flying;
    pose.jumpPhase = j.phase;
    pose.crouch = crouch;
    pose.spineWave = spineWave;
    pose.headBob = headBob;
    pose.headNod = headNod;
    pose.tailSwing = tailSwing;
    pose.jiggle = clamp01(this.jiggle);
    pose.stumble = stumbleEnv;
    pose.speed = flying ? Math.hypot(this.vx, this.vz) : this.speed;
    pose.speedNorm = flying ? 1 : speedNorm;
    pose.moving = flying || this.speed > 1e-3 || j.phase !== 'none';
    const ds = this.dropletSpheres;
    while (ds.length < this.droplets.length) ds.push({ center: [0, 0, 0], r: 0 });
    ds.length = this.droplets.length;
    for (let i = 0; i < ds.length; i++) {
      const d = this.droplets[i]!;
      ds[i]!.center[0] = d.pos[0];
      ds[i]!.center[1] = d.pos[1];
      ds[i]!.center[2] = d.pos[2];
      ds[i]!.r = d.r;
    }
    pose.droplets = ds;
    pose.time = this.t;
    if (splatNow) pose.stomp = Math.max(pose.stomp, j.hop ? 0.3 : 1);
    return pose;
  }

  // --- internals ------------------------------------------------------------------------------------

  private beginJump(to: [number, number], hop: boolean, apex?: number): void {
    const j = this.jump;
    j.phase = 'crouch';
    j.t = 0;
    j.from = [this.x, this.z];
    j.to = to;
    j.hop = hop;
    j.crouchDur = (hop ? 0.07 : JUMP_TIMING.anticipate) * Math.pow(this.mass, 0.35) / Math.pow(Math.max(0.3, this.traits.tempo), 0.3);
    j.plan = apex !== undefined ? planJump(j.from, to, { gravity: this.gravity, apex }) : null;
    if (hop && !j.plan) {
      const d = Math.hypot(to[0] - this.x, to[1] - this.z);
      j.plan = planJump(j.from, to, { gravity: this.gravity, apex: Math.max(0.03, this.scale * (0.25 + 0.55 * this.traits.bounce) + d * 0.1) });
    }
    this.speed = 0;
    this.vx = this.vz = 0;
  }

  private spawnDroplets(count: number, impact: number): void {
    const base = this.skeleton.restLift;
    const n = Math.min(count, 5);
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const r = 0.07 + this.rng.next() * 0.06;
      const spd = (0.9 + this.rng.next() * 0.9) * Math.min(2.5, impact / Math.max(0.05, this.scale) * 0.18);
      this.droplets.push({
        pos: [Math.cos(a) * 0.7, -base * 0.75, Math.sin(a) * 0.7],
        vel: [Math.cos(a) * spd, 1.4 + this.rng.next() * 1.2, Math.sin(a) * spd],
        r,
        r0: r,
        age: 0,
        life: 0.38 + this.rng.next() * 0.12,
      });
    }
  }

  private stepDroplets(dt: number): void {
    const g = (this.gravity / Math.max(0.05, this.scale)) * 0.35; // body units, softened for the stylised look
    for (const d of this.droplets) {
      d.age += dt;
      d.vel[1] -= g * dt;
      d.pos[0] += d.vel[0] * dt;
      d.pos[1] += d.vel[1] * dt;
      d.pos[2] += d.vel[2] * dt;
      const floor = -this.skeleton.restLift + d.r;
      if (d.pos[1] < floor) {
        d.pos[1] = floor;
        d.vel[1] = 0;
        d.vel[0] *= 0.6;
        d.vel[2] *= 0.6;
      }
      const u = d.age / d.life;
      d.r = d.r0 * (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45);
    }
    this.droplets = this.droplets.filter((d) => d.age < d.life && d.r > 0.02);
  }
}
