import {
  NO_FLOOR,
  PathHistory,
  StepCycle,
  poseSpheres,
  rotationYPR,
  type BlobParams,
  type BodyPose,
  type BodyType,
  type CreatureSpec,
  type LegDef,
  type Pose,
  type SpherePrim,
  type Vec3,
} from '@ee/genome';

/**
 * Board locomotion of one archetype creature (quadruped, REX/duck biped, heavy, snake). The board moves a
 * creature by tweening its ground position (slides, leaps, merge moves, the depart walk); this driver
 * *reacts* to that motion every frame and builds the locomotion pose the body block and the rig consume:
 * a heading that turns toward the swipe with a quick spring (anticipation, overshoot, settle) and a head
 * that leads the turn (neck arc), the genome's step cycle for the feet (kneaded SDF legs or leg modules;
 * the rate follows the speed, capped so fast slides scurry instead of strobing), lean from the
 * acceleration, waddle roll, stumbles, tucked legs in the air and a stomp on landing, the trunk's sway,
 * the REX jaw, and the snake's follow-the-leader spine (the body flows through the path the head drew) with
 * its coil at rest. Deterministic given the same inputs; allocation-free per frame.
 */

export interface DriveInput {
  /** Ground position (board-local) this frame: the body origin (walkers) or the head (snakes). */
  x: number;
  z: number;
  /** Extra height above the standing pose (leaps). */
  lift: number;
  /** Board top (ground height). */
  ground: number;
  /** Desired heading (radians, yaw about +y, 0 = facing +z); null keeps the current heading. */
  yawTarget: number | null;
  /** Follow `yawTarget` exactly (sampled merge moves) instead of the heading spring. */
  yawDirect: boolean;
  /** Leap choreography: pitch override (radians, + = nose down) blended in by `pitchBlend`. */
  pitch: number;
  pitchBlend: number;
  /** 0..1 anticipation crouch (legs bend, body lowers). */
  crouch: number;
  /** 0..1 stumble envelope (heavy stop). */
  stumble: number;
  /** 0..1 mouth opening. */
  mouth: number;
  /** Snake: coil target override (null = automatic: coiled at rest when allowed). */
  coil: number | null;
  /** Snake: inner coil radius (blob units) — wider to wrap around a merge partner; null = rest coil. */
  coilRadius: number | null;
  /** Snake: swallowed bulge along the spine (0 head … 1 tail), < 0 = none. */
  bulge: number;
  /** Heavy: trunk raised (trumpet) 0..1. */
  trumpet: number;
  /** Mouth roundness (0 grin … 1 round O) and eye squeeze (bites) from merge moves. */
  mouthRound: number;
  squint: number;
}

/** Per-body-type tuning (board scale, all world-space rates). */
interface Tuning {
  /** Step cycle rate cap (Hz): above it the feet skate instead of strobing. */
  maxRate: number;
  /** Heading spring (rad/s natural frequency, damping ratio). */
  turnOmega: number;
  turnZeta: number;
  /** Lean per unit forward acceleration (rad per board unit/s²), clamped. */
  lean: number;
  /** Constant forward lean while running (rad at full speed). */
  runLean: number;
  /** Landing stomp strength (rig kicks). */
  stomp: number;
}

const TUNING: Record<Exclude<BodyType, 'blob'>, Tuning> = {
  quadruped: { maxRate: 11, turnOmega: 26, turnZeta: 0.5, lean: 0.012, runLean: 0.06, stomp: 0.3 },
  biped: { maxRate: 9, turnOmega: 22, turnZeta: 0.5, lean: 0.014, runLean: 0.16, stomp: 0.9 },
  heavy: { maxRate: 6.5, turnOmega: 15, turnZeta: 0.42, lean: 0.009, runLean: 0.04, stomp: 0.7 },
  snake: { maxRate: 0, turnOmega: 30, turnZeta: 0.6, lean: 0, runLean: 0, stomp: 0 },
};

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const smooth = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const wrap = (a: number): number => {
  let v = a;
  while (v > Math.PI) v -= TAU;
  while (v < -Math.PI) v += TAU;
  return v;
};

/** Small deterministic PRNG (idle timers). */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** Kneaded SDF legs of a spec as step-cycle legs (same order as `skeleton.legs`). */
export function sdfLegDefs(spec: CreatureSpec): LegDef[] {
  const legs = spec.skeleton.legs ?? [];
  return legs.map((l, i) => ({
    id: `sdf:${i}`,
    role: l.role,
    hip: [l.hip[0], l.hip[1], l.hip[2]] as Vec3,
    length: l.length,
    side: l.hip[0] >= 0 ? 1 : -1,
    pair: l.role === 'BL' || l.role === 'BR' ? 'back' : 'front',
    knee: l.bend,
  }));
}

/**
 * Board scale (blob units → board units) that makes an archetype fill one cell at tiers 5–7 and overflow its
 * neighbours from tier 8 on (a 4096 stands over the grid). `coiled` = the snake rests in its coil.
 */
export function archetypeFit(spec: CreatureSpec, pitch: number, coiled: boolean): number {
  const sk = spec.skeleton;
  let extent: number;
  let fill: number;
  switch (spec.bodyType) {
    case 'snake':
      extent = coiled ? coilGeometry(spec).extent : sk.length * 0.62;
      fill = 0.95;
      break;
    case 'biped':
      extent = Math.max(sk.length * 0.8, sk.width);
      fill = 0.98;
      break;
    case 'heavy':
      extent = Math.max(sk.length * 0.86, sk.width);
      fill = 0.96;
      break;
    default:
      extent = Math.max(sk.length * 0.84, sk.width);
      fill = 0.94;
      break;
  }
  return (pitch * fill * tierGrowth(spec.tier)) / Math.max(0.5, extent);
}

/** Size multiplier over the cell fit: slight growth 5 → 7, then overflow (tier 8 = 1.1 … tier 12 = 1.5). */
export function tierGrowth(tier: number): number {
  if (tier <= 7) return 0.94 + 0.03 * Math.max(0, tier - 5);
  return 1.0 + 0.1 * (tier - 7);
}

// ---------------------------------------------------------------------------------------------- coil

interface CoilGeometry {
  /** Spiral growth per radian, head-end radius, start radius, spiral length (blob units). */
  b: number;
  rEnd: number;
  r0: number;
  L: number;
  /** Diameter of the coil including the body thickness. */
  extent: number;
}

/** Rest coil of a snake (blob units): rings touch, the head ends near the centre (the genome's coil plan). */
function coilGeometry(spec: CreatureSpec, rEndOverride?: number): CoilGeometry {
  const thick = Math.max(0.3, spec.skeleton.width);
  const b = (thick * 1.02) / TAU;
  const rEnd = rEndOverride ?? thick * 0.55;
  const L = spec.skeleton.length * 0.94;
  const r0 = Math.sqrt(2 * b * L + rEnd * rEnd);
  return { b, rEnd, r0, L, extent: 2 * r0 + thick };
}

// ---------------------------------------------------------------------------------------------- driver

export class CreatureDrive {
  readonly body: Exclude<BodyType, 'blob'>;
  readonly cycle: StepCycle | null;
  readonly pose: Pose;
  /** True when the legs are kneaded from the body (feet move body spheres) rather than leg modules. */
  readonly sdfLegs: boolean;
  /** Current heading (radians) and its spring velocity. */
  yaw: number;
  private yawVel = 0;
  scale: number;
  restHeight = 0;
  legLength = 0;
  /** True when the body may coil (raymarched snakes; the mesh cannot draw a spiral). */
  coilAllowed: boolean;
  /** 0..1 current coil amount (snakes). */
  coil = 0;
  private readonly tune: Tuning;
  private readonly rand: () => number;
  private readonly restSpheres: readonly SpherePrim[];
  private readonly posed: SpherePrim[] = [];
  private readonly feetBody: Vec3[] = [];
  private readonly footSwing: number[] = [];
  private readonly footSplat: number[] = [];
  private readonly bodyPose: BodyPose = { rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1], spineWave: null, headBob: 0, headNod: 0, droplets: [] };
  private readonly params: BlobParams;
  private readonly hipOut: Vec3 = [0, 0, 0];
  private readonly fwd: Vec3 = [0, 0, 1];
  private readonly hipFn = (leg: LegDef): Vec3 => this.hipWorld(leg, this.hipOut);
  private ground = 0;
  private px = 0;
  private pz = 0;
  private vx = 0;
  private vz = 0;
  private speed = 0;
  private accel = 0;
  private dirX = 0;
  private dirZ = 1;
  private airborne = false;
  private wasMoving = false;
  private restT = 0;
  private settleT = -1;
  private shuffleT = -1;
  private nextShuffle: number;
  private t = 0;
  private pitchSm = 0;
  private stompPending = 0;
  private mouth = 0;
  private fresh = true;
  // neck, trunk, idle glances
  private neckBend = 0;
  private neckVel = 0;
  private glanceT: number;
  private glance = 0;
  private glanceLeft = 0;
  private trunkCurlT = -1;
  private nextTrunk: number;
  // snake: follow-the-leader spine and coil
  private readonly trail: PathHistory | null = null;
  private readonly spineIdx: number[] = [];
  private readonly spineArc: number[] = [];
  private spineDist = new Float64Array(0);
  private sx = new Float64Array(0);
  private sz = new Float64Array(0);
  private sy = new Float64Array(0);
  private stx = new Float64Array(0);
  private stz = new Float64Array(0);
  private readonly spinePts: (Vec3 | null)[] = [];
  private readonly coilPts: Vec3[] = [];
  private coilR = -1;
  private readonly sphereScale: number[] = [];
  /** Base stride / lift scale of the step cycle (kneaded stumps take short steps at walking pace). */
  private baseStride = 1;
  /** Feet that landed this frame (board-local x, z and a strength) — the board puffs dust there. */
  readonly footfalls: { x: number; z: number; strength: number }[] = [];
  private wavePhase = 0;
  private waveAmp = 0.12;
  private headLift = 0;
  private bulge = -1;

  constructor(
    readonly spec: CreatureSpec,
    moduleLegs: readonly LegDef[],
    opts: { seed: number; scale: number; coilAllowed: boolean; yaw?: number },
  ) {
    if (spec.bodyType === 'blob') throw new Error('CreatureDrive: blobs are tween-driven');
    this.body = spec.bodyType;
    this.tune = TUNING[this.body];
    this.scale = opts.scale;
    this.coilAllowed = opts.coilAllowed;
    this.yaw = opts.yaw ?? 0;
    this.rand = rng(opts.seed * 2654435761);
    this.nextShuffle = 2 + this.rand() * 5;
    this.glanceT = 1 + this.rand() * 3;
    this.nextTrunk = 2 + this.rand() * 4;
    this.restSpheres = spec.body.spheres;
    this.params = { ...spec.body, spheres: this.posed };
    // Kneaded legs (feet move body spheres) unless the spec asks for leg modules; `legDefsFor` returns the
    // kneaded legs itself in newer builds, older ones only the modules.
    const style = (spec as { legStyle?: string }).legStyle;
    const kneaded = (spec.skeleton.legs?.length ?? 0) > 0;
    this.sdfLegs = kneaded && (style === 'sdf' || (style === undefined && moduleLegs.length === 0));
    const legs = this.sdfLegs && moduleLegs.length !== (spec.skeleton.legs?.length ?? 0) ? sdfLegDefs(spec) : moduleLegs;
    this.legs = legs;
    const legged = legs.length > 0 && this.body !== 'snake';
    this.cycle = legged ? new StepCycle(legs, spec.motion.gait, () => this.ground) : null;
    // Kneaded stumps take short, quick steps (a long stride would tear the foot out of the jelly).
    const cyc = this.cycle as (StepCycle & { strideScale?: number; liftScale?: number }) | null;
    if (this.sdfLegs && cyc && 'strideScale' in cyc) {
      cyc.strideScale = this.baseStride = this.body === 'biped' ? 0.62 : 0.5;
      cyc.liftScale = this.body === 'biped' ? 0.95 : 0.8;
    }
    for (let i = 0; i < legs.length; i++) {
      this.feetBody.push([0, 0, 0]);
      this.footSwing.push(0);
      this.footSplat.push(0);
    }
    // Snake spine: every sphere with an arc follows the head's trail (the snout moves rigidly with it).
    const arc = spec.skeleton.spineArc ?? null;
    if (this.body === 'snake' && arc) {
      for (let i = 0; i < arc.length; i++) if ((arc[i] ?? -1) >= 0) this.spineIdx.push(i);
      this.spineIdx.sort((a, b) => arc[a]! - arc[b]!);
      for (const i of this.spineIdx) this.spineArc.push(arc[i]!);
      const n = this.spineIdx.length;
      this.spineDist = new Float64Array(n);
      this.sx = new Float64Array(n);
      this.sz = new Float64Array(n);
      this.sy = new Float64Array(n);
      this.stx = new Float64Array(n);
      this.stz = new Float64Array(n);
      // Spheres without an arc (snout) stay null: `poseSpheres` carries them rigidly with the head.
      for (let i = 0; i < this.restSpheres.length; i++) this.spinePts.push((arc[i] ?? -1) >= 0 ? [0, 0, 0] : null);
      for (let i = 0; i < this.restSpheres.length; i++) this.sphereScale.push(1);
      for (let k = 0; k < n; k++) this.coilPts.push([0, 0, 0]);
      this.trail = new PathHistory(320, 0.01);
    }
    this.coil = this.coilAllowed && this.body === 'snake' ? 1 : 0;
    this.setScale(opts.scale);
    this.pose = {
      x: 0,
      z: 0,
      lift: this.restHeight,
      yaw: this.yaw,
      pitch: 0,
      roll: 0,
      rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      squash: { axis: [0, 1, 0], amount: 0, taper: 0.35 },
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
  }

  readonly legs: readonly LegDef[];

  /** Blob units → board units (without pops); rest height, leg reach and the snake's trail follow. */
  setScale(s: number): void {
    const prev = this.scale;
    this.scale = s;
    if (this.cycle) {
      let sum = 0;
      for (const l of this.legs) sum += (0.9 * l.length - l.hip[1]) * s;
      this.restHeight = Math.max(0.02, sum / this.legs.length);
      this.legLength = Math.max(0.02, (this.legs.reduce((a, l) => a + l.length, 0) / this.legs.length) * s);
    } else {
      this.restHeight = this.spec.skeleton.restLift * s;
      this.legLength = this.restHeight;
    }
    if (this.trail) {
      this.trail.spacing = Math.max(0.003, ((this.spec.skeleton.length + 0.5) * s) / 260);
      for (let k = 0; k < this.spineArc.length; k++) this.spineDist[k] = this.spineArc[k]! * s;
      // A pop scales the trail with the body (about the head).
      if (prev > 0 && Math.abs(prev - s) > 1e-6 && !this.fresh) this.trail.reset(this.px, this.pz, this.yaw, (this.spec.skeleton.length + 0.5) * s);
    }
  }

  /** Current planar velocity (board units/s). */
  get velocity(): [number, number] {
    return [this.vx, this.vz];
  }

  get moving(): boolean {
    return this.speed > 0.05;
  }

  /** Places the creature (feet re-planted under the hips, a snake laid out straight behind its head). */
  teleport(x: number, z: number, ground: number, yaw = this.yaw): void {
    this.px = x;
    this.pz = z;
    this.vx = this.vz = 0;
    this.speed = 0;
    this.accel = 0;
    this.yaw = yaw;
    this.yawVel = 0;
    this.ground = ground;
    this.pose.x = x;
    this.pose.z = z;
    this.pose.yaw = yaw;
    this.pose.lift = this.restHeight;
    rotationYPR(yaw, 0, 0, this.pose.rotation);
    this.cycle?.reset(this.hipFn);
    this.trail?.reset(x, z, yaw, (this.spec.skeleton.length + 0.5) * this.scale);
    this.fresh = false;
  }

  /** Hip of a leg (board-local) for the current pose. */
  hipWorld(leg: LegDef, out: Vec3): Vec3 {
    const p = this.pose;
    const r = p.rotation;
    const s = this.scale;
    const x = leg.hip[0] * s;
    const y = leg.hip[1] * s;
    const z = leg.hip[2] * s;
    out[0] = p.x + r[0] * x + r[1] * y + r[2] * z;
    out[1] = this.ground + p.lift + r[3] * x + r[4] * y + r[5] * z;
    out[2] = p.z + r[6] * x + r[7] * y + r[8] * z;
    return out;
  }

  /** Advances the pose for this frame. */
  update(dtIn: number, inp: DriveInput): Pose {
    const dt = clamp(dtIn, 1e-4, 0.1);
    this.t += dt;
    this.ground = inp.ground;
    if (this.fresh) this.teleport(inp.x, inp.z, inp.ground, inp.yawTarget ?? this.yaw);
    const pose = this.pose;
    const tune = this.tune;
    const sk = this.spec.skeleton;
    pose.stomp = 0;
    this.footfalls.length = 0;

    // --- motion from the tweened position ------------------------------------------------------------
    let dx = inp.x - this.px;
    let dz = inp.z - this.pz;
    const jump = Math.hypot(dx, dz);
    if (jump > this.scale * 6 + 0.9) {
      // Teleport (portal, fast-forward, reconcile): re-plant instead of sprinting across the board.
      this.px = inp.x;
      this.pz = inp.z;
      this.cycle?.reset(this.hipFn);
      this.trail?.reset(inp.x, inp.z, this.yaw, (sk.length + 0.5) * this.scale);
      dx = dz = 0;
    }
    const k = 1 - Math.exp(-dt * 35);
    this.vx += (dx / dt - this.vx) * k;
    this.vz += (dz / dt - this.vz) * k;
    const speed = Math.hypot(this.vx, this.vz);
    const rawAccel = (speed - this.speed) / dt;
    this.accel += (rawAccel - this.accel) * (1 - Math.exp(-dt * 18));
    this.speed = speed;
    this.px = inp.x;
    this.pz = inp.z;
    if (speed > 0.05) {
      this.dirX = this.vx / speed;
      this.dirZ = this.vz / speed;
    }
    const moving = speed > 0.05;
    const refSpeed = 3.2 * Math.max(0.2, this.scale / 0.3);
    const speedNorm = clamp(speed / refSpeed, 0, 1);

    // --- heading: spring toward the target (quick anticipatory turn, overshoot, settle) ---------------
    const prevYaw = this.yaw;
    if (inp.yawTarget !== null && inp.yawDirect) {
      this.yaw = wrap(inp.yawTarget);
      this.yawVel = wrap(this.yaw - prevYaw) / dt;
    } else if (inp.yawTarget !== null) {
      const err = wrap(inp.yawTarget - this.yaw);
      const w = tune.turnOmega;
      this.yawVel += (w * w * err - 2 * tune.turnZeta * w * this.yawVel) * dt;
      this.yaw = wrap(this.yaw + this.yawVel * dt);
    } else {
      this.yawVel *= Math.exp(-dt * 12);
      this.yaw = wrap(this.yaw + this.yawVel * dt);
    }
    // A snake's heading is its head's travel direction.
    if (this.body === 'snake' && moving && !inp.yawDirect) this.yaw = wrap(this.yaw + wrap(Math.atan2(this.dirX, this.dirZ) - this.yaw) * (1 - Math.exp(-dt * 16)));

    // --- airborne / landing ------------------------------------------------------------------------------
    const airborne = inp.lift > this.restHeight * 0.18 + 0.01;
    if (this.airborne && !airborne) {
      this.cycle?.reset(this.hipFn);
      this.stompPending = tune.stomp + 0.3;
      for (let i = 0; i < this.footSplat.length; i++) this.footSplat[i] = 1;
      if (this.cycle) for (const f of this.cycle.feet) this.footfalls.push({ x: f.pos[0], z: f.pos[2], strength: tune.stomp + 0.3 });
    }
    this.airborne = airborne;

    // --- rest bookkeeping (settle shuffle after a move, idle shuffles) --------------------------------
    if (moving || airborne) {
      this.restT = 0;
      this.wasMoving = true;
    } else {
      this.restT += dt;
      if (this.wasMoving && this.restT > 0.06) {
        this.wasMoving = false;
        this.settleT = 0;
      }
    }
    this.nextShuffle -= dt;
    if (this.nextShuffle <= 0 && !moving && !airborne) {
      this.nextShuffle = 4 + this.rand() * 6;
      this.shuffleT = 0;
    }

    // --- gait -----------------------------------------------------------------------------------------------
    let bob = 0;
    let roll = 0;
    let headBob = 0;
    let headNod = 0;
    let tailSwing = 0;
    const cyc = this.cycle;
    const gait = this.spec.motion.gait;
    const tempo = Math.max(0.3, this.spec.motion.tempo);
    rotationYPR(this.yaw, pose.pitch, pose.roll, pose.rotation);
    pose.x = inp.x;
    pose.z = inp.z;
    if (cyc) {
      if (airborne) {
        // Feet tuck under the hips in the air.
        for (const f of cyc.feet) {
          const h = this.hipWorld(f.leg, this.hipOut);
          f.pos[0] = h[0];
          f.pos[1] = h[1] - f.leg.length * this.scale * 0.55;
          f.pos[2] = h[2];
          f.planted = false;
          f.swing = 0.5;
        }
      } else {
        let stepSpeed = speed;
        let stepTempo = tempo;
        let rateScale = 1;
        const turning = Math.abs(this.yawVel) > 0.6;
        const c2 = cyc as StepCycle & { strideScale?: number; reach: number };
        c2.strideScale = this.baseStride;
        c2.reach = 0.9;
        if (moving) {
          // Board slides are fast: the stride grows (long, low steps) until the cycle stays under its rate
          // cap, and planted feet may trail half a stride behind the hip — the stumps step instead of skating.
          const unit = Math.max(1e-3, cyc.params.stride * this.legLength) * (0.7 + 0.3 * tempo);
          const need = speed / (tune.maxRate * unit);
          const ss = Math.min(2.4, Math.max(this.baseStride, need));
          c2.strideScale = ss;
          c2.reach = Math.min(1.7, Math.max(0.9, (0.55 * ss * unit) / Math.max(1e-3, this.legLength)));
          const rate = speed / (unit * ss);
          if (rate > tune.maxRate) rateScale = tune.maxRate / rate;
        } else if (this.settleT >= 0 || this.shuffleT >= 0 || turning) {
          // Settle / idle shuffle / turning on the spot: a creep speed lets every foot step back under its hip.
          stepSpeed = 2e-3;
          stepTempo = this.settleT >= 0 || turning ? 2.6 : 1.1;
        }
        this.fwd[0] = moving ? this.dirX : Math.sin(this.yaw);
        this.fwd[1] = 0;
        this.fwd[2] = moving ? this.dirZ : Math.cos(this.yaw);
        cyc.step(dt, stepSpeed, this.fwd, this.legLength, this.hipFn, rateScale * (1 - 0.6 * inp.stumble), stepTempo);
        const intensity = moving ? 0.35 + 0.65 * speedNorm : 0.2;
        const bm = cyc.bodyMotion(this.legLength, intensity);
        bob = moving ? bm.bob : 0;
        roll = moving ? bm.roll * Math.pow(this.spec.motion.mass, 0.3) : 0;
        for (const f of cyc.feet) {
          if (!f.landed) continue;
          pose.stomp = Math.max(pose.stomp, tune.stomp * (0.3 + 0.7 * speedNorm));
          if (moving) this.footfalls.push({ x: f.pos[0], z: f.pos[2], strength: tune.stomp * (0.4 + 0.6 * speedNorm) });
        }
        const beat = ((cyc.phase * cyc.params.beats) / 2) * TAU;
        const inten = moving ? intensity : 0;
        if (gait === 'stomp') {
          headBob = -0.09 * Math.abs(Math.sin(beat)) * inten;
          headNod = 0.04 * Math.sin(beat) * inten;
          tailSwing = -0.55 * Math.sin(cyc.phase * TAU) * inten;
        } else if (gait === 'waddle') {
          headBob = -0.05 * Math.abs(Math.sin(beat)) * inten;
          tailSwing = -0.3 * Math.sin(cyc.phase * TAU) * inten;
        } else {
          headBob = -0.045 * Math.abs(Math.sin(beat)) * inten;
          headNod = 0.03 * Math.sin(beat) * inten;
          tailSwing = 0.25 * Math.sin(cyc.phase * TAU) * inten;
        }
        if (this.settleT >= 0) {
          this.settleT += dt;
          if (this.settleT > 0.55 && !cyc.swinging) this.settleT = -1;
        }
        if (this.shuffleT >= 0) {
          this.shuffleT += dt;
          if (this.shuffleT > 1.2 && !cyc.swinging) this.shuffleT = -1;
        }
      }
    }

    // --- idle life: breathing weight shift, the head glancing about, the tail ------------------------
    if (!moving && !airborne) {
      const ph = this.t;
      const heavy = this.body === 'heavy' ? 1 : 0;
      bob += 0.008 * this.legLength * Math.sin(ph * 1.3);
      roll += (0.012 + 0.03 * heavy) * Math.sin(ph * (0.7 - 0.25 * heavy));
      headNod += 0.03 * Math.sin(ph * 0.53 + 1.1) + 0.015 * Math.sin(ph * 1.37);
      headBob += 0.02 * Math.sin(ph * 0.9 + 0.4);
      tailSwing += 0.12 * Math.sin(ph * 1.1);
    }

    // --- neck: the head leads turns and glances about at rest ------------------------------------------------
    const nc = sk.neckChain ?? null;
    if (nc) {
      let target = 0;
      if (inp.yawTarget !== null && !inp.yawDirect) target = wrap(inp.yawTarget - this.yaw) * 0.9;
      if (!moving && !airborne && Math.abs(target) < 0.05) {
        this.glanceT -= dt;
        if (this.glanceT <= 0) {
          this.glanceT = 2.5 + this.rand() * 4;
          this.glance = (this.rand() * 2 - 1) * nc.maxBend * 0.6;
          this.glanceLeft = 0.9 + this.rand() * 1.2;
        }
        if (this.glanceLeft > 0) {
          this.glanceLeft -= dt;
          target = this.glance;
        }
      }
      target = clamp(target, -nc.maxBend, nc.maxBend);
      const w = 9 / Math.pow(Math.max(0.3, this.spec.motion.mass), 0.2);
      this.neckVel += (-w * w * (this.neckBend - target) - 2 * 0.75 * w * this.neckVel) * dt;
      this.neckBend += this.neckVel * dt;
    }

    // --- trunk: idle sway, a curl now and then, raised in a trumpet --------------------------------------
    let trunkSway = 0;
    let trunkCurl = 0;
    if (sk.trunk) {
      trunkSway = 0.18 * Math.sin(this.t * 0.8) + 0.08 * Math.sin(this.t * 1.9 + 1) + (moving ? 0.25 * Math.sin(this.t * 7) * speedNorm : 0);
      this.nextTrunk -= dt;
      if (this.nextTrunk <= 0 && this.trunkCurlT < 0) {
        this.nextTrunk = 4 + this.rand() * 5;
        this.trunkCurlT = 0;
      }
      if (this.trunkCurlT >= 0) {
        this.trunkCurlT += dt;
        trunkCurl = 0.8 * Math.sin(Math.PI * Math.min(1, this.trunkCurlT / 1.4));
        if (this.trunkCurlT > 1.4) this.trunkCurlT = -1;
      }
      trunkCurl = Math.max(trunkCurl, 1.3 * inp.trumpet);
    }

    // --- snake: follow-the-leader spine, travelling wave, coil at rest --------------------------------
    let spineWave = null as Pose['spineWave'];
    this.bulge = inp.bulge;
    if (this.body === 'snake') {
      const coilTarget = inp.coil ?? (this.coilAllowed && !moving && !airborne && this.restT > 0.2 ? 1 : 0);
      if (this.trail) {
        // Leaving the coil: the trail becomes the coil so the body unwinds through it as the head moves on.
        if (coilTarget < this.coil && this.coil > 0.05 && moving) {
          this.loadTrailFromCoil();
          this.coil = 0;
        }
      }
      const rate = coilTarget > this.coil ? 2.4 : 14;
      this.coil += (coilTarget - this.coil) * (1 - Math.exp(-dt * rate));
      if (!this.trail) {
        // Old skeletons (no spine arcs): a travelling wave along the rest spine.
        const L = sk.length * this.scale;
        this.wavePhase += (TAU * 1.1 * speed * dt) / Math.max(0.05, L) + dt * 0.8;
        const ampTarget = moving ? 0.28 + 0.4 * speedNorm : 0.22;
        this.waveAmp += (ampTarget - this.waveAmp) * (1 - Math.exp(-dt * 10));
        spineWave = { amp: this.waveAmp, phase: this.wavePhase, waves: 1.1 };
      }
      headBob = 0.06 * speedNorm + 0.03 * Math.sin(this.t * 1.7);
      roll = 0;
    }

    // --- lean, crouch, stumble, leap pitch -----------------------------------------------------------------
    const accelFwd = moving ? this.accel : 0;
    let pitch = clamp(accelFwd * tune.lean, -0.22, 0.22) + tune.runLean * speedNorm;
    if (inp.stumble > 0) {
      pitch += 0.32 * inp.stumble;
      roll += 0.22 * inp.stumble * Math.sin(this.t * 9);
      bob -= 0.1 * this.legLength * inp.stumble;
    }
    this.pitchSm += (pitch - this.pitchSm) * (1 - Math.exp(-dt * 16));
    pitch = this.pitchSm * (1 - inp.pitchBlend) + inp.pitch * inp.pitchBlend;
    const crouchDepth = inp.crouch * this.restHeight * (cyc ? 0.3 : 0.25);

    // --- landing stomp (rig kick, one frame) ------------------------------------------------------------
    if (this.stompPending > 0) {
      pose.stomp = Math.max(pose.stomp, this.stompPending);
      this.stompPending = 0;
    }
    this.mouth += (inp.mouth - this.mouth) * (1 - Math.exp(-dt * 22));

    pose.lift = Math.max(0.01, this.restHeight + bob - crouchDepth) + inp.lift;
    pose.yaw = this.yaw;
    pose.pitch = pitch;
    pose.roll = roll;
    rotationYPR(this.yaw, pitch, roll, pose.rotation);
    pose.airborne = airborne;
    pose.jumpPhase = airborne ? 'flight' : 'none';
    pose.crouch = inp.crouch;
    pose.spineWave = spineWave;
    pose.headBob = headBob;
    pose.headNod = headNod;
    pose.tailSwing = tailSwing;
    pose.stumble = inp.stumble;
    pose.speed = speed;
    pose.speedNorm = airborne ? 1 : speedNorm;
    pose.moving = moving || airborne;
    pose.time = this.t;
    pose.mouth = this.mouth;
    pose.mouthRound = inp.mouthRound;
    pose.squint = inp.squint;
    pose.jaw = this.mouth;
    pose.neckBend = this.neckBend;
    pose.trunkSway = trunkSway;
    pose.trunkCurl = trunkCurl;
    pose.coil = this.coil;
    // Snake trail: record the head, sample every spine sphere.
    if (this.trail) this.updateSpine(inp);
    return pose;
  }

  /** Snake: spine sphere centres from the head's trail, blended into the rest coil. */
  private updateSpine(inp: DriveInput): void {
    const trail = this.trail!;
    const s = this.scale;
    const thick = this.spec.skeleton.width * s;
    const liftTarget = this.coil * thick * 0.35 + inp.lift;
    this.headLift += (liftTarget - this.headLift) * 0.2;
    const x = this.pose.x;
    const z = this.pose.z;
    trail.record(x, z, this.headLift);
    trail.sample(x, z, this.headLift, this.spineDist, this.sx, this.sz, this.sy, this.stx, this.stz);
    const c = smooth(this.coil);
    if (c > 1e-3) this.computeCoil(inp.coilRadius);
    const n = this.spineIdx.length;
    const L = Math.max(1e-6, this.spec.skeleton.length * s);
    const tailWag = 0.03 * Math.sin(this.t * 1.3) * (this.moving ? 0.3 : 1);
    for (let k = 0; k < n; k++) {
      const i = this.spineIdx[k]!;
      const p = this.spinePts[i]!;
      const d = this.spineDist[k]!;
      const f = clamp((d / L - 0.65) / 0.35, 0, 1);
      const lat = tailWag * f * f * s * 3;
      const px = this.sx[k]! + this.stz[k]! * lat;
      const pz = this.sz[k]! - this.stx[k]! * lat;
      const restY = this.restSpheres[i]?.center[1] ?? 0;
      let bx = (px - x) / s;
      let by = restY + this.sy[k]! / s;
      let bz = (pz - z) / s;
      if (c > 1e-3) {
        const q = this.coilPts[k]!;
        bx += (q[0] - bx) * c;
        by += (q[1] - by) * c;
        bz += (q[2] - bz) * c;
      }
      p[0] = bx;
      p[1] = by;
      p[2] = bz;
    }
  }

  /** Rest coil (body units, world-aligned, relative to the head) oriented so the head faces the heading. */
  private computeCoil(radius: number | null): void {
    const g = coilGeometry(this.spec, radius ?? undefined);
    this.coilR = g.rEnd;
    const n = this.spineIdx.length;
    // Spiral point for the arc distance d behind the head: r(d) = √(rEnd² + 2·b·d), angle −θ.
    const th = (d: number): { r: number; a: number } => {
      const r = Math.sqrt(g.rEnd * g.rEnd + 2 * g.b * Math.min(g.L, d));
      return { r, a: -(g.r0 - r) / g.b };
    };
    const h = th(0);
    const hx = h.r * Math.cos(h.a);
    const hz = h.r * Math.sin(h.a);
    // Head tangent (travel toward the centre = decreasing arc behind the head): derivative wrt −d.
    const eps = 0.02;
    const h2 = th(eps);
    const tx = hx - h2.r * Math.cos(h2.a);
    const tz = hz - h2.r * Math.sin(h2.a);
    const rho = this.yaw - Math.atan2(tx, tz);
    const cr = Math.cos(rho);
    const sr = Math.sin(rho);
    const thick = this.spec.skeleton.width;
    for (let k = 0; k < n; k++) {
      const i = this.spineIdx[k]!;
      const d = this.spineArc[k]!;
      const q = th(d);
      const lx = q.r * Math.cos(q.a) - hx;
      const lz = q.r * Math.sin(q.a) - hz;
      const out = this.coilPts[k]!;
      out[0] = lx * cr + lz * sr;
      out[2] = -lx * sr + lz * cr;
      const restY = this.restSpheres[i]?.center[1] ?? 0;
      // The head (and neck) rest on the inner ring, raised.
      out[1] = restY + (d < 0.6 ? thick * 0.55 * (1 - d / 0.6) : 0);
    }
  }

  /** Lays the trail along the current coil (oldest = tail first) so moving off unwinds it. */
  private loadTrailFromCoil(): void {
    const trail = this.trail;
    if (!trail) return;
    const n = this.spineIdx.length;
    const s = this.scale;
    const pts: number[] = [];
    for (let k = n - 1; k >= 0; k--) {
      const i = this.spineIdx[k]!;
      const p = this.spinePts[i];
      if (!p) continue;
      pts.push(this.pose.x + p[0] * s, this.pose.z + p[2] * s, 0);
    }
    pts.push(this.pose.x, this.pose.z, 0);
    trail.load(pts, 3);
  }

  /**
   * Posed body parameters for the pose of this frame (same object every frame, mutated in place): rotated
   * spheres with head bob, neck arc, trunk, jaw, kneaded feet, the snake's spine points.
   */
  posedParams(center: Vec3): BlobParams {
    const pose = this.pose;
    const bp = this.bodyPose;
    bp.rotation = pose.rotation;
    bp.spineWave = pose.spineWave;
    bp.headBob = pose.headBob;
    bp.headNod = pose.headNod;
    bp.neckBend = this.neckBend;
    bp.trunkSway = pose.trunkSway ?? 0;
    bp.trunkCurl = pose.trunkCurl ?? 0;
    bp.jaw = this.mouth;
    bp.spinePoints = this.trail ? this.spinePts : null;
    if (this.sdfLegs && this.cycle) {
      const s = Math.max(1e-6, this.scale);
      const feet = this.cycle.feet;
      for (let i = 0; i < feet.length; i++) {
        const f = feet[i]!;
        const o = this.feetBody[i]!;
        o[0] = (f.pos[0] - center[0]) / s;
        o[1] = (f.pos[1] - center[1]) / s;
        o[2] = (f.pos[2] - center[2]) / s;
        this.footSwing[i] = f.planted ? 0 : f.swing;
        this.footSplat[i] = Math.max(f.splat ?? 0, this.footSplat[i]! * 0.85);
      }
      bp.feet = this.feetBody;
      bp.footSwing = this.footSwing;
      bp.footSplat = this.footSplat;
    } else {
      bp.feet = null;
    }
    // A swallowed bulge travels down the snake (per-sphere radius multipliers).
    const bpx = bp as BodyPose & { sphereScale?: readonly number[] | null };
    if (this.bulge >= 0 && this.trail) {
      const L = Math.max(1e-6, this.spec.skeleton.length);
      for (let k = 0; k < this.spineIdx.length; k++) {
        const along = this.spineArc[k]! / L;
        this.sphereScale[this.spineIdx[k]!] = 1 + 0.45 * Math.exp(-((along - this.bulge) * (along - this.bulge)) / 0.012);
      }
      bpx.sphereScale = this.sphereScale;
    } else bpx.sphereScale = null;
    poseSpheres(this.restSpheres, this.spec.skeleton, bp, this.posed);
    // Old skeletons: the REX lower jaw (sphere 8) drops with the mouth.
    if (this.body === 'biped' && this.mouth > 0.01 && !(this.spec.skeleton.mouth?.jaw?.length)) {
      const jaw = this.posed[8];
      if (jaw) {
        const m = this.mouth;
        const r = pose.rotation;
        jaw.center[0] += r[1] * -0.34 * m + r[2] * -0.12 * m;
        jaw.center[1] += r[4] * -0.34 * m + r[5] * -0.12 * m;
        jaw.center[2] += r[7] * -0.34 * m + r[8] * -0.12 * m;
      }
    }
    this.params.floorY = NO_FLOOR;
    return this.params;
  }

  /** Mouth anchor (body units, posed) and the mouth's forward direction (world-aligned) for the ink mouth. */
  mouthLocal(out: Vec3, dirOut: Vec3): number {
    const m = this.spec.skeleton.mouth;
    const r = this.pose.rotation;
    const ai = m ? m.anchor : this.spec.skeleton.headSphere;
    const a = ai >= 0 ? this.posed[ai] : undefined;
    const rest = m?.dir ?? [0, 0, 1];
    dirOut[0] = r[0] * rest[0] + r[1] * rest[1] + r[2] * rest[2];
    dirOut[1] = r[3] * rest[0] + r[4] * rest[1] + r[5] * rest[2];
    dirOut[2] = r[6] * rest[0] + r[7] * rest[1] + r[8] * rest[2];
    if (!a) {
      out[0] = out[1] = out[2] = 0;
      return 0.8;
    }
    out[0] = a.center[0];
    out[1] = a.center[1];
    out[2] = a.center[2];
    return a.r;
  }

  /** Mouth opening (smoothed) this frame. */
  get mouthOpen(): number {
    return this.mouth;
  }

  /** Posed spheres (body units, rotated) of this frame — shadow proxies read them. */
  get spheres(): readonly SpherePrim[] {
    return this.posed;
  }

  get rotation(): Pose['rotation'] {
    return this.pose.rotation;
  }

  /** Forward unit vector of the body (board-local, horizontal). */
  forward(out: Vec3): Vec3 {
    out[0] = Math.sin(this.yaw);
    out[1] = 0;
    out[2] = Math.cos(this.yaw);
    return out;
  }
}
