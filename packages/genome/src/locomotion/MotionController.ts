/**
 * MotionController — one per creature: mass, stiffness and gait from the genome, commands from the game
 * (walk to a point, walk a circle, jump to a point, face a direction, play a merge move, stop) and a Pose
 * per frame that the render side applies to the body (posed spheres, squash, lift), the sockets
 * (rotation) and the legs (feet for the kneaded SDF legs or the leg-module IK). Deterministic: same
 * config + same commands + same dt sequence → same trajectory.
 *
 * Gaits: blob = hops (idle micro-hops, a hop sequence toward a target, a real slime jump on command:
 * anticipation squash → launch stretch along the velocity with trailing droplets → ballistic arc, the
 * mouth opening toward the motion → splat with droplets and a ripple → spring recovery); quadruped =
 * walk/trot step cycle with planted feet; REX = stomp walk (feet slam down) with head bob and tail
 * counter-swing; heavy/duck = waddle; snake = slither with follow-the-leader (the body flows through
 * the path the weaving head drew, S-curves in turns, the tail lags; at rest it slithers into a coil).
 *
 * v3: weightier timing (durations scale with distance and mass), `faceDirection` (anticipating turn
 * with overshoot and settle, feet shuffle while turning), a head that leads turns (neck arc), the
 * elephant's trunk chain (sway, curl, sniff, trumpet), a mouth (open/close/chew/roar/yawn/devour) and
 * merge moves (`play(move)`, see moves.ts) with event hooks.
 */
import type { BodySkeleton } from '../body';
import type { GaitKind, MotionTraits } from '../creature';
import { makeRng, type Rng } from '../rng';
import type { SpherePrim, Squash, Vec3 } from '../types';
import { StepCycle, type FootState, type LegDef } from './gait';
import { JUMP_TIMING, anticipationSquash, flightStretch, jumpHeight, planJump, splatSquash, type JumpPlan } from './jump';
import { MergeMove, createMoveSample, turnProfile, type MoveEvent, type MoveSample } from './moves';
import { MouthDriver } from './mouth';
import { ROT_IDENTITY, rotationYPR, type Rot3, type SpineWave } from './pose';
import { PathHistory, coilPoint, planCoil, type CoilPlan } from './spine';

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
  /** Snakes coil up after resting a moment (default true). */
  coilAtRest?: boolean;
  /** Idle life: head glances, trunk play, the odd yawn (default true). */
  idleLife?: boolean;
  /** The body's rest spheres (snakes: the spine heights above the origin). */
  body?: readonly SpherePrim[];
}

export type MotionMode = 'idle' | 'walk' | 'circle' | 'jump' | 'turn' | 'coil' | 'move';
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
  /** Splat droplets in body units (posed frame's rest orientation, relative to the body origin). */
  droplets: readonly SpherePrim[];
  /** Seconds since the controller started. */
  time: number;
  // --- v3 (optional so drivers that build their own Pose stay valid) ---------------------------------
  /** 0..1 mouth opening, roundness (yawn/roar) and eye squeeze. */
  mouth?: number | undefined;
  mouthRound?: number | undefined;
  squint?: number | undefined;
  /** 0..1 lower-jaw opening (REX). */
  jaw?: number | undefined;
  /** Head lead over the body (radians, neck arc). */
  neckBend?: number | undefined;
  /** Trunk chain sway / curl (radians). */
  trunkSway?: number | undefined;
  trunkCurl?: number | undefined;
  /** Snake: follow-the-leader spine centres (blob units, world-aligned, relative to the origin). */
  spinePoints?: readonly (Vec3 | null)[] | null | undefined;
  /** Per-sphere radius multipliers (a swallowed bulge travelling down a snake). */
  sphereScale?: readonly number[] | null | undefined;
  /** Snake: 0..1 coiled. */
  coil?: number | undefined;
}

interface Droplet {
  /** World position and velocity. */
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
  /** Trailing droplets already spawned in this flight. */
  trail: number;
}

interface TurnState {
  from: number;
  delta: number;
  t: number;
  dur: number;
  /** Continue with the walk/circle afterwards. */
  then: 'idle' | 'walk' | 'circle';
}

interface MoveState {
  move: MergeMove;
  t: number;
  onEvent: ((e: MoveEvent) => void) | null;
  sample: MoveSample;
  prevX: number;
  prevZ: number;
}

const UP: Vec3 = [0, 1, 0];
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number): number => clamp(v, 0, 1);
const smooth = (u: number): number => {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
};

/** Top speed (world units/s) of a gait at scale 0.4, before tempo and the speed slider (v3: weightier). */
const BASE_SPEED: Readonly<Record<GaitKind, number>> = { hop: 0.75, walk: 0.95, trot: 1.4, stomp: 0.85, slither: 0.9, waddle: 0.5 };
const TURN_RATE: Readonly<Record<GaitKind, number>> = { hop: 3.2, walk: 2.2, trot: 2.6, stomp: 1.8, slither: 1.8, waddle: 1.1 };

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
  /** Snakes coil after resting (the lab's frozen layouts switch it off). */
  coilAtRest: boolean;
  idleLife: boolean;
  readonly mouthDriver = new MouthDriver();
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
  private readonly jump: JumpState = { phase: 'none', t: 0, plan: null, from: [0, 0], to: [0, 0], launchSpeed: 0, height: 0, vy: 0, crouchDur: JUMP_TIMING.anticipate, hop: false, trail: 0 };
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
  private turn: TurnState | null = null;
  // Neck lead (head looks where it goes) and idle glances.
  private neckBend = 0;
  private neckVel = 0;
  private glanceT: number;
  private glance = 0;
  private glanceLeft = 0;
  // Trunk play.
  private trunkCurlT = -1;
  private trunkSniffT = -1;
  private nextTrunk: number;
  private nextYawn: number;
  // Snake: follow-the-leader.
  private readonly path: PathHistory | null;
  private readonly spineIdx: number[] = [];
  private readonly spineDist: Float64Array;
  private readonly sx: Float64Array;
  private readonly sz: Float64Array;
  private readonly sy: Float64Array;
  private readonly stx: Float64Array;
  private readonly stz: Float64Array;
  private readonly spinePts: (Vec3 | null)[] = [];
  private readonly restYs: number[];
  private readonly sphereScale: number[] = [];
  private weavePhase = 0;
  private headYaw = 0;
  private headLift = 0;
  private restT = 0;
  private coilPlan: CoilPlan | null = null;
  private coilA = 0;
  private coiled = false;
  private coilAmt = 0;
  private uncoilFrom: [number, number] | null = null;
  private readonly coilOut = { x: 0, z: 0, yaw: 0 };
  // Merge moves.
  private move: MoveState | null = null;
  private moveLift = 0;
  private movePitch = 0;
  private moveRoll = 0;
  private moveCrouch = 0;
  private bulge = -1;
  private trumpet = 0;
  /** Scratch: forward axis and hip point (the step cycle reads them immediately). */
  private readonly fwd: Vec3 = [0, 0, 1];
  private readonly zeroFwd: Vec3 = [0, 0, 0];
  private readonly hipOut: Vec3 = [0, 0, 0];
  private readonly hipFn = (leg: LegDef): Vec3 => this.hipWorld(leg, this.hipOut);
  private readonly dropletSpheres: SpherePrim[] = [];
  private readonly moveAxis: Vec3 = [0, 1, 0];
  private readonly dispatchMoveEvent = (e: MoveEvent): void => {
    this.onMoveEvent(e);
    this.move?.onEvent?.(e);
  };

  constructor(cfg: MotionConfig) {
    this.traits = cfg.traits;
    this.skeleton = cfg.skeleton;
    this.scale = cfg.scale;
    this.legs = cfg.legs ?? [];
    this.ground = cfg.ground ?? (() => 0);
    this.gravity = cfg.gravity ?? 9.8;
    this.coilAtRest = cfg.coilAtRest ?? true;
    this.idleLife = cfg.idleLife ?? true;
    this.rng = makeRng(cfg.seed >>> 0);
    this.restYs = (cfg.body ?? []).map((s) => s.center[1]);
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
    this.glanceT = 1.5 + this.rng.next() * 3;
    this.nextTrunk = 2 + this.rng.next() * 4;
    this.nextYawn = 14 + this.rng.next() * 20;
    this.mouthDriver.timeScale = Math.pow(Math.max(0.3, this.traits.mass), 0.2) / Math.pow(Math.max(0.3, this.traits.tempo), 0.3);
    // Follow-the-leader spine: every sphere with an arc (the snout moves rigidly with the head).
    const arc = this.skeleton.spineArc;
    if (arc && this.traits.gait === 'slither') {
      for (let i = 0; i < arc.length; i++) if (arc[i]! >= 0) this.spineIdx.push(i);
      this.spineIdx.sort((a, b) => arc[a]! - arc[b]!);
      const len = (this.skeleton.length + 0.5) * this.scale;
      this.path = new PathHistory(320, Math.max(0.004, len / 260));
    } else this.path = null;
    const ns = this.spineIdx.length;
    this.spineDist = new Float64Array(ns);
    this.sx = new Float64Array(ns);
    this.sz = new Float64Array(ns);
    this.sy = new Float64Array(ns);
    this.stx = new Float64Array(ns);
    this.stz = new Float64Array(ns);
    for (let k = 0; k < ns; k++) this.spineDist[k] = arc![this.spineIdx[k]!]! * this.scale;
    const nSpheres = arc ? arc.length : 0;
    for (let i = 0; i < nSpheres; i++) {
      this.spinePts.push(arc![i]! >= 0 ? [0, 0, 0] : null);
      this.sphereScale.push(1);
    }
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
      mouth: 0,
      mouthRound: 0,
      squint: 0,
      jaw: 0,
      neckBend: 0,
      trunkSway: 0,
      trunkCurl: 0,
      spinePoints: this.path ? this.spinePts : null,
      sphereScale: this.path ? this.sphereScale : null,
      coil: 0,
    };
    this.cycle?.reset(this.hipFn);
    this.path?.reset(0, 0, 0, (this.skeleton.length + 0.5) * this.scale);
  }

  // --- commands ----------------------------------------------------------------------------------

  /** Places the creature (feet re-planted, a snake laid out straight behind its head). */
  teleport(x: number, z: number, yaw = 0): void {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.headYaw = yaw;
    this.speed = 0;
    this.vx = this.vz = 0;
    this.turn = null;
    this.pose.x = x;
    this.pose.z = z;
    this.pose.yaw = yaw;
    this.pose.lift = this.restHeight;
    rotationYPR(yaw, 0, 0, this.pose.rotation);
    this.cycle?.reset(this.hipFn);
    this.path?.reset(x, z, yaw, (this.skeleton.length + 0.5) * this.scale);
    this.coiled = false;
    this.coilPlan = null;
    this.coilAmt = 0;
    this.restT = 0;
  }

  walkTo(x: number, z: number): void {
    this.target = [x, z];
    this.circle = null;
    this.leaveCoil();
    this.mode = 'walk';
    this.maybeTurnFirst('walk', Math.atan2(x - this.x, z - this.z));
  }

  walkCircle(cx: number, cz: number, r: number): void {
    this.circle = { cx, cz, r: Math.max(0.2, r) };
    this.target = null;
    this.leaveCoil();
    this.mode = 'circle';
  }

  /** A real jump to a ground point (slime jump for blobs, a pounce/lunge for the others). */
  jumpTo(x: number, z: number): void {
    this.target = [x, z];
    this.circle = null;
    this.leaveCoil();
    this.turn = null;
    this.mode = 'jump';
    if (this.jump.phase === 'none' || this.jump.phase === 'recover') this.beginJump([x, z], false);
  }

  /**
   * Turns to face `dir` (a heading in radians, or a point [x, z] to look at): a small counter-turn first
   * (anticipation), then the turn with an overshoot that settles. Walkers shuffle their feet while they
   * turn, the head leads. Only this command (or moving) turns a creature — a standing creature never
   * rotates on its own. Returns the turn duration (s).
   */
  faceDirection(dir: number | readonly [number, number], opts: { timeScale?: number } = {}): number {
    const yaw = typeof dir === 'number' ? dir : Math.atan2(dir[0] - this.x, dir[1] - this.z);
    this.leaveCoil();
    this.target = null;
    this.circle = null;
    return this.beginTurn(yaw, 'idle', opts.timeScale ?? 1);
  }

  stop(): void {
    this.mode = 'idle';
    this.target = null;
    this.circle = null;
    this.turn = null;
  }

  /** Mouth actions (the render side traces the crescent; the REX jaw swings). */
  openMouth(amount = 1): void {
    this.mouthDriver.open(amount);
  }

  closeMouth(): void {
    this.mouthDriver.close();
  }

  chew(times = 3): void {
    this.mouthDriver.chew(times);
  }

  roar(): void {
    this.mouthDriver.roar();
    this.sqVel += 2.5;
    this.sqAxis = UP;
    this.jiggle = Math.max(this.jiggle, 0.4);
    if (this.skeleton.trunk) this.trunkCurlT = 0;
  }

  yawn(): void {
    this.mouthDriver.yawn();
  }

  /** Snaps the mouth open and bites (no movement) — `devour` in moves.ts is the full merge move. */
  bite(): void {
    this.mouthDriver.devour();
  }

  /**
   * Plays a merge move (moves.ts): position, heading, lift, pitch, squash, crouch, mouth, coil and the
   * partner follow its timeline; `onEvent` fires for every scheduled event as its time is crossed
   * (events at t = 0 fire on the first step). The creature ends idle at `move.end`.
   */
  play(move: MergeMove, onEvent?: (e: MoveEvent) => void): void {
    this.leaveCoil();
    this.turn = null;
    this.target = null;
    this.circle = null;
    this.jump.phase = 'none';
    this.mode = 'move';
    this.move = { move, t: 0, onEvent: onEvent ?? null, sample: createMoveSample(), prevX: this.x, prevZ: this.z };
    this.mouthDriver.close();
  }

  /** The running merge move's sample (partner position/scale for the renderer); null without a move. */
  get moveSample(): MoveSample | null {
    return this.move ? this.move.sample : null;
  }

  get currentMove(): MergeMove | null {
    return this.move?.move ?? null;
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

  /** True while a snake lies coiled up. */
  get isCoiled(): boolean {
    return this.coiled;
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

  /** Coil for snakes lying on the spot right away (the lab sheet): lays the spiral into the trail. */
  coilNow(): void {
    if (!this.path) return;
    const plan = this.makeCoilPlan();
    const n = 200;
    const pts = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) {
      coilPoint(plan, (plan.length * i) / (n - 1), this.coilOut);
      pts[i * 3] = this.coilOut.x;
      pts[i * 3 + 1] = this.coilOut.z;
      pts[i * 3 + 2] = 0;
    }
    this.path.load(pts);
    this.x = this.coilOut.x;
    this.z = this.coilOut.z;
    this.yaw = this.coilOut.yaw;
    this.headYaw = this.coilOut.yaw;
    this.coiled = true;
    this.coilAmt = 1;
    this.mode = 'idle';
  }

  // --- simulation ------------------------------------------------------------------------------

  step(dtIn: number): Pose {
    const dt = clamp(dtIn, 0, 0.1);
    if (dt <= 0) return this.pose;
    this.t += dt;
    const pose = this.pose;
    const gait = this.traits.gait;
    const hop = gait === 'hop';
    const snake = this.path !== null;
    const mass = this.mass;
    const maxSpeed = this.maxSpeed;
    pose.stomp = 0;
    this.moveLift = 0;
    this.movePitch = 0;
    this.moveRoll = 0;
    this.moveCrouch = 0;
    let moveSquash = false;
    let mouthFromMove = -1;
    let mouthRoundMove = 0;
    let squintMove = 0;
    let moveAirborne = false;

    // --- merge move playback -----------------------------------------------------------------------
    const mv = this.move;
    if (mv) {
      const t0 = mv.t;
      mv.t += dt;
      const s = mv.move.sample(mv.t, mv.sample);
      mv.move.forEachEvent(t0 === 0 ? -1 : t0, mv.t, this.dispatchMoveEvent);
      this.x = s.x;
      this.z = s.z;
      this.yaw = s.yaw;
      const sp = Math.hypot(s.x - mv.prevX, s.z - mv.prevZ) / dt;
      mv.prevX = s.x;
      mv.prevZ = s.z;
      this.speed = Math.min(sp, maxSpeed * 3);
      this.vx = Math.sin(this.yaw) * this.speed;
      this.vz = Math.cos(this.yaw) * this.speed;
      this.moveLift = s.lift;
      this.movePitch = s.pitch;
      this.moveRoll = s.roll;
      this.moveCrouch = s.crouch;
      this.moveAxis[0] = s.squashAxis[0];
      this.moveAxis[1] = s.squashAxis[1];
      this.moveAxis[2] = s.squashAxis[2];
      this.sqAxis = this.moveAxis;
      this.sqAmount = s.squash;
      this.sqVel = 0;
      moveSquash = true;
      mouthFromMove = s.mouth;
      mouthRoundMove = s.mouthRound;
      squintMove = s.squint;
      moveAirborne = s.airborne;
      this.jiggle = Math.max(this.jiggle, s.jiggle);
      this.bulge = s.bulge;
      this.trumpet = s.trumpet;
      if (mv.t >= mv.move.duration) {
        this.move = null;
        this.mode = 'idle';
        this.x = mv.move.end[0];
        this.z = mv.move.end[1];
        this.speed = 0;
        this.bulge = -1;
        this.trumpet = 0;
        this.restT = 0;
      }
    }

    // --- steering ---------------------------------------------------------------------------
    let desiredSpeed = 0;
    let desiredYaw = this.yaw;
    let turning = 0;
    if (!mv) {
      if (this.turn) {
        const tr = this.turn;
        tr.t += dt;
        const u = tr.t / tr.dur;
        const prev = this.yaw;
        this.yaw = wrapAngle(tr.from + tr.delta * turnProfile(u, tr.delta));
        turning = Math.abs(wrapAngle(this.yaw - prev)) / dt;
        desiredYaw = tr.from + tr.delta;
        if (u >= 1) {
          this.turn = null;
          this.mode = tr.then === 'idle' ? (this.mode === 'turn' ? 'idle' : this.mode) : tr.then;
        }
      } else if (this.mode === 'walk' && this.target) {
        const dx = this.target[0] - this.x;
        const dz = this.target[1] - this.z;
        const dist = Math.hypot(dx, dz);
        const arrive = 0.05 + 0.1 * this.scale;
        if (dist < arrive) {
          this.mode = 'idle';
          this.target = null;
        } else {
          desiredYaw = Math.atan2(dx, dz);
          const brake = maxSpeed * 1.8 / Math.pow(mass, 0.2);
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
      } else if (this.mode === 'coil' && this.coilPlan) {
        desiredSpeed = maxSpeed * 0.55;
      }
    }
    const airborne = this.jump.phase === 'flight' || moveAirborne;
    if (!mv && !this.turn && this.mode !== 'coil' && !airborne && this.jump.phase !== 'crouch' && this.jump.phase !== 'splat') {
      const dYaw = wrapAngle(desiredYaw - this.yaw);
      const turnRate = TURN_RATE[gait] * Math.pow(Math.max(0.2, this.traits.tempo), 0.3) * Math.pow(mass / Math.max(0.1, this.traits.mass), -0.3);
      const stepYaw = clamp(dYaw, -turnRate * dt, turnRate * dt);
      if (desiredSpeed > 0 || Math.abs(dYaw) > 0.01) {
        this.yaw = wrapAngle(this.yaw + stepYaw);
        turning = Math.abs(stepYaw) / dt;
      }
      // Sharp turns: slow down and turn on the spot first.
      if (Math.abs(dYaw) > 1.2) desiredSpeed *= 0.15;
      else if (Math.abs(dYaw) > 0.6) desiredSpeed *= 0.5;
    }

    // --- hop sequence (blob walk) -------------------------------------------------------------
    if (hop && !mv && this.mode !== 'jump') {
      // A blob does not glide: walking is a chain of hops toward the target.
      desiredSpeed = 0;
      if ((this.mode === 'walk' || this.mode === 'circle') && this.jump.phase === 'none' && !this.turn) {
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
    if (hop && !mv && this.mode === 'idle' && this.jump.phase === 'none' && this.idleLife) {
      this.nextMicroHop -= dt;
      if (this.nextMicroHop <= 0) {
        this.nextMicroHop = (2.5 + this.rng.next() * 4.5) / Math.max(0.3, this.traits.tempo);
        this.beginJump([this.x, this.z], true, this.scale * 0.2 * (0.5 + this.traits.bounce));
      }
    }

    // --- stumble envelope (a clumsy body catches a foot: it slows down, pitches and rolls) ------------
    let stumbleEnv = 0;
    if (this.stumbleT >= 0) {
      this.stumbleT += dt;
      const dur = 0.85 * Math.pow(mass, 0.2);
      stumbleEnv = Math.sin(Math.PI * clamp01(this.stumbleT / dur));
      if (this.stumbleT >= dur) this.stumbleT = -1;
    }

    // --- horizontal integration (ground locomotion) ---------------------------------------------
    if (!mv && !airborne) {
      const accel = maxSpeed * (mass > 2 ? 1.6 : 3.2);
      if (this.jump.phase !== 'none') desiredSpeed = 0;
      desiredSpeed *= 1 - 0.75 * stumbleEnv;
      this.speed = desiredSpeed > this.speed ? Math.min(desiredSpeed, this.speed + accel * dt) : Math.max(desiredSpeed, this.speed - accel * 1.5 * dt);
      let dirYaw = this.yaw;
      if (snake) {
        if (this.mode === 'coil' && this.coilPlan) {
          // Slither into the coil: the head follows the inward spiral, the body its trail.
          this.coilA += this.speed * dt;
          coilPoint(this.coilPlan, this.coilA, this.coilOut);
          this.x = this.coilOut.x;
          this.z = this.coilOut.z;
          this.yaw = this.coilOut.yaw;
          dirYaw = this.yaw;
          this.coilAmt = clamp01(this.coilA / this.coilPlan.length);
          if (this.coilA >= this.coilPlan.length) {
            this.coiled = true;
            this.coilAmt = 1;
            this.mode = 'idle';
            this.speed = 0;
          }
        } else {
          // Serpentine: the head weaves around the travel direction (phase by distance, so the trail is
          // a standing S the body flows through).
          const norm = maxSpeed > 1e-6 ? clamp01(this.speed / maxSpeed) : 0;
          const lambda = Math.max(0.3, this.skeleton.length * this.scale * 0.55);
          this.weavePhase += ((this.speed * dt) / lambda) * Math.PI * 2;
          dirYaw = this.yaw + (0.2 + 0.4 * norm) * Math.sin(this.weavePhase) * (this.speed > 1e-4 ? 1 : 0);
        }
      }
      if (!(snake && this.mode === 'coil')) {
        const fx = Math.sin(dirYaw);
        const fz = Math.cos(dirYaw);
        this.vx = fx * this.speed;
        this.vz = fz * this.speed;
        this.x += this.vx * dt;
        this.z += this.vz * dt;
      }
      if (snake) {
        // Head heading follows its actual direction of travel (smoothed); at rest it keeps it.
        if (this.speed > 1e-4) {
          const k = 1 - Math.exp(-dt * 10);
          this.headYaw = wrapAngle(this.headYaw + wrapAngle(dirYaw - this.headYaw) * k);
        }
      }
    } else if (snake && mv) {
      this.headYaw = this.yaw;
    }
    if (!snake) this.headYaw = this.yaw;
    const speedNorm = maxSpeed > 1e-6 ? clamp01(this.speed / maxSpeed) : 0;

    // --- jump machine ---------------------------------------------------------------------------
    let crouch = 0;
    let flightHeight = 0;
    let splatNow = false;
    const j = this.jump;
    if (j.phase !== 'none' && !mv) {
      j.t += dt;
      switch (j.phase) {
        case 'crouch': {
          const u = j.t / j.crouchDur;
          crouch = smooth(clamp01(u));
          this.sqAmount = anticipationSquash(u, j.hop ? 0.22 : 0.38 * (0.7 + 0.3 * this.traits.bounce));
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
            j.trail = 0;
            this.vx = plan.vx;
            this.vz = plan.vz;
            if (Math.hypot(plan.vx, plan.vz) > 1e-4) {
              this.yaw = Math.atan2(plan.vx, plan.vz);
              this.headYaw = this.yaw;
            }
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
          const stretch = flightStretch(v, j.launchSpeed, j.hop ? 0.3 : 0.45) * (0.7 + 0.3 * this.traits.bounce);
          this.sqAmount = stretch;
          this.sqVel = 0;
          this.sqAxis = v > 1e-6 ? [plan.vx / v, vy / v, plan.vz / v] : UP;
          flightHeight = Math.max(0, j.height);
          const u = j.t / plan.duration;
          // The sketch: a jumping blob trails droplets and opens its mouth on the leading side.
          if (hop && j.trail < (j.hop ? 1 : 3) && u > 0.08 + 0.12 * j.trail) {
            this.spawnTrail(plan, vy);
            j.trail++;
          }
          if (!j.hop) mouthFromMove = Math.max(mouthFromMove, smooth((u - 0.35) / 0.35));
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
            if (!j.hop) this.mouthDriver.chew(1);
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
          const dur = (j.hop ? 0.14 : JUMP_TIMING.recover) * Math.pow(mass, 0.25);
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
    const flying = j.phase === 'flight' || moveAirborne;
    if (moveSquash) crouch = this.moveCrouch;

    // --- squash spring (recovery wobble) ----------------------------------------------------------
    if (!moveSquash && (j.phase === 'none' || j.phase === 'recover' || j.phase === 'splat')) {
      const stiff = this.traits.stiffness;
      const omega = (8 + 14 * stiff) / Math.pow(mass, 0.3);
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
    this.jiggle = Math.max(0, this.jiggle - dt * 1.4);

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
        if (!mv && this.stumbleT < 0 && cyc.phase < this.lastPhase && speedNorm > 0.2 && this.rng.next() < this.traits.clumsy) {
          this.stumbleT = 0;
          this.stumbleSign = this.rng.next() < 0.5 ? -1 : 1;
          this.jiggle = Math.max(this.jiggle, 0.35);
        }
        this.lastPhase = cyc.phase;
        const fwd = this.fwd;
        fwd[0] = Math.sin(this.yaw);
        fwd[1] = 0;
        fwd[2] = Math.cos(this.yaw);
        // Turning on the spot shuffles the feet (they step back under their rotating hips).
        const shuffle = this.speed < 1e-3 && turning > 0.05 ? turning * this.skeleton.width * 0.5 * this.scale : 0;
        cyc.step(dt, Math.max(this.speed, shuffle), shuffle > 0 ? this.zeroFwd : fwd, this.legLength, this.hipFn, 1 - 0.6 * stumbleEnv, Math.max(0.3, this.traits.tempo));
        const intensity = 0.25 + 0.75 * Math.max(speedNorm, Math.min(1, shuffle * 3));
        const bm = cyc.bodyMotion(this.legLength, intensity);
        bob = bm.bob;
        roll = bm.roll * Math.pow(mass, 0.3);
        // Hard plants: stomps (REX) and heavy steps shake the body and kick the springs.
        for (const f of cyc.feet) {
          if (!f.landed) continue;
          const strength = gait === 'stomp' ? 0.9 : gait === 'waddle' ? 0.6 : 0.2;
          pose.stomp = Math.max(pose.stomp, strength * (0.4 + 0.6 * speedNorm));
          if (!moveSquash) {
            this.sqVel -= 2.2 * strength * (0.4 + 0.6 * speedNorm) * Math.pow(mass, 0.3);
            this.sqAxis = UP;
          }
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
      if (this.speed < 1e-3 && grounded && j.phase === 'none' && !mv) {
        bob += 0.006 * this.legLength * Math.sin(this.t * 1.1 + this.idleShift);
        roll += 0.015 * Math.sin(this.t * 0.7 + this.idleShift);
      }
    }

    // --- slither (legacy wave for skeletons without spine arcs) -------------------------------------
    let spineWave: SpineWave | null = null;
    if (gait === 'slither' && !snake) {
      const targetAmp = 0.1 + 0.62 * speedNorm;
      this.waveAmp += (targetAmp - this.waveAmp) * (1 - Math.exp(-dt * 4));
      const rate = (0.5 + 2.1 * speedNorm) * Math.max(0.3, this.traits.tempo) * Math.PI * 2;
      this.wavePhase += rate * dt;
      const spineN = this.skeleton.spine?.length ?? 8;
      spineWave = { amp: this.waveAmp, phase: this.wavePhase, waves: 1.05 + 0.03 * spineN };
      headBob = 0.1 * speedNorm + 0.03 * Math.sin(this.t * 1.7);
      roll = 0.08 * Math.sin(this.wavePhase) * speedNorm;
    }

    // --- follow-the-leader spine (snake) -----------------------------------------------------------------
    if (snake) this.updateSpine(dt, speedNorm);

    // --- head lead (neck arc), trunk, mouth -------------------------------------------------------------
    this.updateNeck(dt, desiredYaw, speedNorm, mv !== null);
    const trunk = this.updateTrunk(dt, speedNorm);
    const mouth = this.mouthDriver.step(dt);
    let mouthOpen = mouth.open;
    let mouthRound = mouth.round;
    if (mouthFromMove >= 0) {
      mouthOpen = Math.max(mouthFromMove, mv ? 0 : mouthOpen);
      mouthRound = Math.max(mouthRoundMove, mv ? 0 : mouthRound);
    }
    if (this.idleLife && !mv && this.mode === 'idle' && !hop && !snake) {
      this.nextYawn -= dt;
      if (this.nextYawn <= 0) {
        this.nextYawn = 18 + this.rng.next() * 26;
        this.mouthDriver.yawn();
      }
    }

    // --- droplets ------------------------------------------------------------------------------------
    if (this.droplets.length > 0) this.stepDroplets(dt);

    // --- assemble the pose ------------------------------------------------------------------------
    const squashAmount = clamp(this.sqAmount, -0.66, 1.2);
    const axis = this.sqAxis;
    const along = Math.max(0.2, 1 + squashAmount);
    const across = 1 / Math.sqrt(along);
    const ay = axis[1];
    const sy = along * ay * ay + across * (1 - ay * ay);
    // A flattened body keeps its base on the ground: the origin sinks with the vertical scale.
    const crouchDepth = crouch * this.restHeight * (cyc ? 0.28 : 0.2);
    const flightH = mv ? this.moveLift : flightHeight;
    const lift = Math.max(0.02, this.restHeight * (flying ? 1 : sy) + bob - crouchDepth) + flightH;
    pose.x = this.x;
    pose.z = this.z;
    pose.lift = lift;
    pose.yaw = snake ? this.headYaw : this.yaw;
    pose.pitch = pitch + this.movePitch;
    pose.roll = roll + this.moveRoll;
    rotationYPR(pose.yaw, pose.pitch, pose.roll, pose.rotation);
    pose.squash.axis[0] = axis[0];
    pose.squash.axis[1] = axis[1];
    pose.squash.axis[2] = axis[2];
    pose.squash.amount = squashAmount;
    pose.squash.taper = this.traits.bodyType === 'blob' ? 0.55 : 0.35;
    pose.airborne = flying;
    pose.jumpPhase = mv ? (flying ? 'flight' : 'none') : j.phase;
    pose.crouch = crouch;
    pose.spineWave = spineWave;
    pose.headBob = headBob;
    pose.headNod = headNod;
    pose.tailSwing = tailSwing;
    pose.jiggle = clamp01(this.jiggle);
    pose.stumble = stumbleEnv;
    pose.speed = flying && !mv ? Math.hypot(this.vx, this.vz) : this.speed;
    pose.speedNorm = flying ? 1 : speedNorm;
    pose.moving = flying || this.speed > 1e-3 || j.phase !== 'none' || mv !== null || turning > 0.05;
    pose.mouth = mouthOpen;
    pose.mouthRound = mouthRound;
    pose.squint = Math.max(mouth.squint, squintMove);
    pose.jaw = mouthOpen;
    pose.neckBend = this.neckBend;
    pose.trunkSway = trunk.sway;
    pose.trunkCurl = trunk.curl;
    pose.coil = this.coilAmt;
    this.writeDroplets(pose);
    pose.time = this.t;
    if (splatNow) pose.stomp = Math.max(pose.stomp, j.hop ? 0.3 : 1);
    return pose;
  }

  // --- internals ------------------------------------------------------------------------------------

  private onMoveEvent(e: MoveEvent): void {
    switch (e.type) {
      case 'land':
      case 'stomp':
      case 'splash':
        this.pose.stomp = Math.max(this.pose.stomp, e.strength);
        this.jiggle = Math.max(this.jiggle, e.strength);
        this.cycle?.reset(this.hipFn);
        if (this.traits.gait === 'hop' || e.type === 'splash') this.spawnDroplets(e.type === 'splash' ? 6 : 4, this.scale * 6 * e.strength);
        break;
      case 'launch':
        if (this.traits.gait === 'hop') this.spawnDroplets(2, this.scale * 3);
        break;
      default:
        break;
    }
  }

  /** Starts a profiled turn (anticipation, overshoot, settle) to `yaw`; returns its duration. */
  private beginTurn(yaw: number, then: TurnState['then'], timeScale: number): number {
    const delta = wrapAngle(yaw - this.yaw);
    if (Math.abs(delta) < 0.02) {
      this.mode = then === 'idle' ? 'idle' : then;
      return 0;
    }
    const dur = (0.34 + 0.26 * (Math.abs(delta) / Math.PI)) * Math.pow(this.mass, 0.25) / Math.pow(Math.max(0.3, this.traits.tempo), 0.3) * Math.max(0.05, timeScale);
    this.turn = { from: this.yaw, delta, t: 0, dur, then };
    if (then === 'idle') this.mode = 'turn';
    return dur;
  }

  /** Walkers turn on the spot (profiled) before walking off when the target is far behind them. */
  private maybeTurnFirst(then: 'walk' | 'circle', yaw: number): void {
    if (this.traits.gait === 'hop' || this.path) return;
    if (Math.abs(wrapAngle(yaw - this.yaw)) > 1.0 && this.speed < 0.2 * this.maxSpeed) this.beginTurn(yaw, then, 1);
  }

  private leaveCoil(): void {
    if (this.coiled || this.mode === 'coil') this.uncoilFrom = this.coilPlan ? [this.coilPlan.cx, this.coilPlan.cz] : [this.x, this.z];
    this.coiled = false;
    this.coilPlan = null;
    this.coilA = 0;
    this.restT = 0;
    if (this.mode === 'coil') this.mode = 'idle';
  }

  private makeCoilPlan(): CoilPlan {
    const thick = this.skeleton.width * this.scale;
    const dir: 1 | -1 = (this.rng.next() < 0.5 ? 1 : -1) as 1 | -1;
    return planCoil(this.x, this.z, this.headYaw, this.skeleton.length * this.scale * 0.94, thick, dir);
  }

  /** Snake spine: record the head, sample every sphere on the trail, coil when resting. */
  private updateSpine(dt: number, speedNorm: number): void {
    const path = this.path!;
    const sk = this.skeleton;
    // Rest → coil (slither into a spiral) after a pause.
    if (this.mode === 'idle' && !this.move && !this.coiled && this.speed < 1e-3 && this.coilAtRest) {
      this.restT += dt;
      if (this.restT > 1.6) {
        this.coilPlan = this.makeCoilPlan();
        this.coilA = 0;
        this.mode = 'coil';
      }
    } else if (this.mode !== 'idle') this.restT = 0;
    // Head lift: resting on the coil, crossing the rings while uncoiling, rising in moves.
    const thick = sk.width * this.scale;
    let lift = 0;
    if (this.coiled) lift = thick * 0.35;
    else if (this.uncoilFrom) {
      const d = Math.hypot(this.x - this.uncoilFrom[0], this.z - this.uncoilFrom[1]);
      const r = thick * 3.2;
      lift = d < r ? thick * 0.7 * (1 - d / r) : 0;
      if (d >= r) this.uncoilFrom = null;
    }
    lift += this.moveLift;
    const k = 1 - Math.exp(-dt * 6);
    this.headLift += (lift - this.headLift) * k;
    path.record(this.x, this.z, this.headLift);
    path.sample(this.x, this.z, this.headLift, this.spineDist, this.sx, this.sz, this.sy, this.stx, this.stz);
    const n = this.spineIdx.length;
    const tailWag = (0.03 + 0.05 * (1 - speedNorm)) * Math.sin(this.t * 1.3);
    const L = sk.length * this.scale;
    for (let k2 = 0; k2 < n; k2++) {
      const i = this.spineIdx[k2]!;
      const p = this.spinePts[i]!;
      const d = this.spineDist[k2]!;
      // Tail flick: the last third sways a little (idle life), perpendicular to the trail.
      const f = clamp01((d / Math.max(1e-6, L) - 0.65) / 0.35);
      const lat = tailWag * f * f * this.scale * 3;
      const px = this.sx[k2]! + this.stz[k2]! * lat;
      const pz = this.sz[k2]! - this.stx[k2]! * lat;
      p[0] = (px - this.x) / this.scale;
      p[1] = (this.restYs[i] ?? 0) + this.sy[k2]! / this.scale;
      p[2] = (pz - this.z) / this.scale;
      // A swallowed bulge travels down the body.
      const b = this.bulge;
      const along = d / Math.max(1e-6, L);
      this.sphereScale[i] = b >= 0 ? 1 + 0.45 * Math.exp(-((along - b) * (along - b)) / 0.012) : 1;
    }
  }

  /** The head leads: toward the travel direction / turn target, idle glances when standing. */
  private updateNeck(dt: number, desiredYaw: number, speedNorm: number, inMove: boolean): void {
    const nc = this.skeleton.neckChain;
    if (!nc) {
      this.neckBend = 0;
      return;
    }
    let target = 0;
    if (this.turn) target = wrapAngle(this.turn.from + this.turn.delta - this.yaw) * 0.9;
    else if (this.mode === 'walk' || this.mode === 'circle') target = wrapAngle(desiredYaw - this.yaw) * 1.2 + 0.08 * Math.sin(this.t * 1.7) * speedNorm;
    else if (!inMove && this.idleLife) {
      this.glanceT -= dt;
      if (this.glanceT <= 0) {
        this.glanceT = 2.5 + this.rng.next() * 4;
        this.glance = (this.rng.next() * 2 - 1) * nc.maxBend * 0.6;
        this.glanceLeft = 0.9 + this.rng.next() * 1.2;
      }
      if (this.glanceLeft > 0) {
        this.glanceLeft -= dt;
        target = this.glance;
      }
    }
    target = clamp(target, -nc.maxBend, nc.maxBend);
    const w = 7 / Math.pow(this.mass, 0.2);
    const z = 0.75;
    this.neckVel += (-w * w * (this.neckBend - target) - 2 * z * w * this.neckVel) * dt;
    this.neckBend += this.neckVel * dt;
  }

  private readonly trunkOut = { sway: 0, curl: 0 };

  /** Elephant trunk: idle sway, curls up toward the face, sniffs, trumpets (raised) in moves and roars. */
  private updateTrunk(dt: number, speedNorm: number): { sway: number; curl: number } {
    const out = this.trunkOut;
    if (!this.skeleton.trunk) {
      out.sway = 0;
      out.curl = 0;
      return out;
    }
    if (this.idleLife && this.mode === 'idle' && !this.move) {
      this.nextTrunk -= dt;
      if (this.nextTrunk <= 0) {
        this.nextTrunk = 4 + this.rng.next() * 6;
        if (this.rng.next() < 0.5) this.trunkCurlT = 0;
        else this.trunkSniffT = 0;
      }
    }
    let curl = 0;
    let sniff = 0;
    if (this.trunkCurlT >= 0) {
      this.trunkCurlT += dt;
      const dur = 1.8;
      curl = Math.sin(Math.PI * clamp01(this.trunkCurlT / dur));
      if (this.trunkCurlT > dur) this.trunkCurlT = -1;
    }
    if (this.trunkSniffT >= 0) {
      this.trunkSniffT += dt;
      const dur = 1.1;
      sniff = Math.sin(Math.PI * clamp01(this.trunkSniffT / dur));
      if (this.trunkSniffT > dur) this.trunkSniffT = -1;
    }
    const swing = this.cycle ? Math.sin(this.cycle.phase * Math.PI * 2) * 0.22 * speedNorm : 0;
    out.sway = 0.16 * Math.sin(this.t * 0.62 + this.idleShift) + swing + 0.05 * Math.sin(this.t * 31) * sniff;
    out.curl = 0.95 * curl + 0.3 * sniff + 1.35 * this.trumpet - 0.08 * speedNorm;
    return out;
  }

  private beginJump(to: [number, number], hop: boolean, apex?: number): void {
    const j = this.jump;
    j.phase = 'crouch';
    j.t = 0;
    j.from = [this.x, this.z];
    j.to = to;
    j.hop = hop;
    j.trail = 0;
    const d = Math.hypot(to[0] - this.x, to[1] - this.z);
    // Longer jumps wind up longer, heavy bodies much longer.
    j.crouchDur = ((hop ? 0.09 : JUMP_TIMING.anticipate) + (hop ? 0 : 0.05 * Math.min(1, d / (this.scale * 4)))) * Math.pow(this.mass, 0.35) / Math.pow(Math.max(0.3, this.traits.tempo), 0.3);
    j.plan = apex !== undefined ? planJump(j.from, to, { gravity: this.gravity, apex }) : null;
    if (hop && !j.plan) {
      j.plan = planJump(j.from, to, { gravity: this.gravity, apex: Math.max(0.03, this.scale * (0.25 + 0.55 * this.traits.bounce) + d * 0.1) });
    }
    this.speed = 0;
    this.vx = this.vz = 0;
  }

  private spawnDroplets(count: number, impact: number): void {
    const gy = this.ground(this.x, this.z);
    const n = Math.min(count, 6);
    const rb = Math.max(0.5, this.skeleton.width * 0.4) * this.scale;
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const r = 0.07 + this.rng.next() * 0.06;
      const spd = (0.9 + this.rng.next() * 0.9) * Math.min(2.5, (impact / Math.max(0.05, this.scale)) * 0.18) * this.scale;
      this.droplets.push({
        pos: [this.x + Math.cos(a) * rb * 0.8, gy + r * this.scale * 1.2, this.z + Math.sin(a) * rb * 0.8],
        vel: [Math.cos(a) * spd, (1.4 + this.rng.next() * 1.2) * this.scale, Math.sin(a) * spd],
        r,
        r0: r,
        age: 0,
        life: 0.42 + this.rng.next() * 0.14,
      });
    }
  }

  /** Droplets shed from the trailing end of a stretched jump (they lag behind and fall). */
  private spawnTrail(plan: JumpPlan, vy: number): void {
    const gy = this.ground(this.x, this.z);
    const v = Math.hypot(plan.vx, vy, plan.vz) || 1;
    const back = this.skeleton.width * 0.5 * this.scale;
    const h = gy + this.restHeight + Math.max(0, this.jump.height);
    const r = 0.06 + this.rng.next() * 0.05;
    const side = (this.rng.next() * 2 - 1) * 0.3;
    this.droplets.push({
      pos: [this.x - (plan.vx / v) * back + side * (plan.vz / v) * back, h - (vy / v) * back, this.z - (plan.vz / v) * back - side * (plan.vx / v) * back],
      vel: [plan.vx * 0.45, vy * 0.3, plan.vz * 0.45],
      r,
      r0: r,
      age: 0,
      life: 0.5 + this.rng.next() * 0.15,
    });
  }

  private stepDroplets(dt: number): void {
    const g = this.gravity * 0.55;
    for (const d of this.droplets) {
      d.age += dt;
      d.vel[1] -= g * dt;
      d.pos[0] += d.vel[0] * dt;
      d.pos[1] += d.vel[1] * dt;
      d.pos[2] += d.vel[2] * dt;
      const floor = this.ground(d.pos[0], d.pos[2]) + d.r * this.scale;
      if (d.pos[1] < floor) {
        d.pos[1] = floor;
        d.vel[1] = 0;
        d.vel[0] *= 0.5;
        d.vel[2] *= 0.5;
      }
      const u = d.age / d.life;
      d.r = d.r0 * (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45);
    }
    this.droplets = this.droplets.filter((d) => d.age < d.life && d.r > 0.02);
  }

  /** Droplets in the posed frame's rest orientation, relative to the body origin (blob units). */
  private writeDroplets(pose: Pose): void {
    const ds = this.dropletSpheres;
    while (ds.length < this.droplets.length) ds.push({ center: [0, 0, 0], r: 0 });
    ds.length = this.droplets.length;
    const r = pose.rotation;
    const ox = pose.x;
    const oy = this.ground(pose.x, pose.z) + pose.lift;
    const oz = pose.z;
    for (let i = 0; i < ds.length; i++) {
      const d = this.droplets[i]!;
      const lx = (d.pos[0] - ox) / this.scale;
      const ly = (d.pos[1] - oy) / this.scale;
      const lz = (d.pos[2] - oz) / this.scale;
      // Inverse rotation (the consumer rotates them back with the body).
      ds[i]!.center[0] = r[0] * lx + r[3] * ly + r[6] * lz;
      ds[i]!.center[1] = r[1] * lx + r[4] * ly + r[7] * lz;
      ds[i]!.center[2] = r[2] * lx + r[5] * ly + r[8] * lz;
      ds[i]!.r = d.r;
    }
    pose.droplets = ds;
  }
}

