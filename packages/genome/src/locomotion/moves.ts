/**
 * Merge moves — spectacular, deterministic, time-scaled choreographies for the moment two creatures
 * merge: pounce, leap toward the camera and devour, devour, the snake's coil-and-swallow, the heavy stomp
 * and the blob's splash. Each move is a pure timeline: `sample(t)` returns where the actor is (ground
 * position, lift, heading, pitch, squash, crouch, mouth, coil …) and where/how big the partner is, and
 * the move carries a sorted event schedule (`launch`, `apex`, `mouthOpen`, `contact`, `bite`, `swallow`,
 * `splash`, `stomp`, `land`, `settle`, `done`) so a board can start body blends, splashes and sounds on
 * the exact frame. Durations scale with distance and mass and with `timeScale` (a duration multiplier).
 * No randomness beyond the optional seed; the same context gives the same timeline on every device.
 */
import type { BodyType, Vec3 } from '../types';

export type MergeMoveKind = 'pounce' | 'leapToCamera' | 'devour' | 'coilSwallow' | 'stompMerge' | 'splashMerge';

export type MoveEventType = 'anticipate' | 'launch' | 'apex' | 'mouthOpen' | 'contact' | 'bite' | 'swallow' | 'chew' | 'stomp' | 'splash' | 'land' | 'coil' | 'settle' | 'done';

export interface MoveEvent {
  type: MoveEventType;
  /** Seconds from the start of the move. */
  t: number;
  /** 0..1 intensity (impact speed, stomp strength). */
  strength: number;
}

/** Where the partner of a merge is drawn during the move (the one that gets eaten / absorbed). */
export interface MovePartnerSample {
  x: number;
  z: number;
  /** Height above its ground (world). */
  lift: number;
  /** 1 = full size, 0 = gone (swallowed). */
  scale: number;
  /** Vertical squash (− = flattened, + = stretched). */
  squash: number;
  visible: boolean;
}

export interface MoveSample {
  /** Ground position of the actor's body origin (world). */
  x: number;
  z: number;
  /** Extra height above the standing pose (world). */
  lift: number;
  yaw: number;
  /** + = nose down, − = nose up (toward the camera in `leapToCamera`). */
  pitch: number;
  roll: number;
  /** World-space squash axis (unit) and amount (+ stretch, − flatten). */
  squashAxis: Vec3;
  squash: number;
  /** 0..1 anticipation crouch (legs bend, body lowers). */
  crouch: number;
  /** 0..1 mouth opening and roundness. */
  mouth: number;
  mouthRound: number;
  /** 0..1 eyes squeezed (bite, effort). */
  squint: number;
  /** Snake: 0..1 how far the body is wrapped around the partner. */
  coil: number;
  /** Snake: the swallowed bulge along the spine (0 head … 1 tail); < 0 = none. */
  bulge: number;
  /** Heavy: trunk raised (trumpet) 0..1. */
  trumpet: number;
  /** 0..1 ripple/jiggle energy (landings, stomps). */
  jiggle: number;
  airborne: boolean;
  partner: MovePartnerSample | null;
}

export interface MoveContext {
  /** Actor's ground position and heading at the start. */
  from: readonly [number, number];
  yaw: number;
  /** Blob units → world units of the actor (its size). */
  scale: number;
  /** Relative mass (blob tier 1 ≈ 1, heavy ≈ 3+). */
  mass: number;
  /** 0..1 jump power (blob high, heavy low). */
  bounce?: number | undefined;
  bodyType?: BodyType | undefined;
  /** Duration multiplier: 1 = natural, 0.5 = twice as fast (board combos), 2 = slow motion. */
  timeScale?: number | undefined;
  /** World gravity for the arcs (default 6.5 — weighty, readable arcs at creature scale). */
  gravity?: number | undefined;
}

export interface MovePartner {
  x: number;
  z: number;
  /** Partner body radius (world). */
  radius: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number): number => clamp(v, 0, 1);
const smooth = (u: number): number => {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
};
const easeOut = (u: number): number => 1 - (1 - clamp01(u)) * (1 - clamp01(u));
const easeIn = (u: number): number => clamp01(u) * clamp01(u);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const wrap = (a: number): number => {
  let x = a % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  if (x < -Math.PI) x += Math.PI * 2;
  return x;
};
const lerpAngle = (a: number, b: number, t: number): number => a + wrap(b - a) * t;
/** Damped recovery from `amount` toward 0 with one overshoot (spring look), v = 0..1. */
const springBack = (amount: number, v: number, freq = 2.2): number => amount * Math.exp(-4.2 * clamp01(v)) * Math.cos(Math.PI * freq * clamp01(v));
/** Anticipate-and-overshoot turn profile 0 → 1 (small counter-turn first, ~10 % overshoot, settled). */
export function turnProfile(u: number, delta = 1): number {
  const x = clamp01(u);
  const a = 0.16;
  const dip = Math.min(0.1, 0.06 / Math.max(0.3, Math.abs(delta)));
  if (x < a) return -dip * Math.sin((Math.PI * x) / a);
  const q = (x - a) / (1 - a);
  // Underdamped step response (ζ ≈ 0.55), overshoot capped for big turns.
  const zw = 5.2;
  const wd = 7.9;
  const spring = 1 - Math.exp(-zw * q) * (Math.cos(wd * q) + (zw / wd) * Math.sin(wd * q));
  const crit = 1 - Math.exp(-9 * q) * (1 + 9 * q);
  const k = Math.min(1, 0.32 / (0.126 * Math.max(0.3, Math.abs(delta))));
  const v = crit + (spring - crit) * k;
  return q >= 1 ? 1 : v;
}

type Sampler = (t: number, out: MoveSample) => void;

/** One merge move: its timeline, event schedule and sampler. */
export class MergeMove {
  readonly events: readonly MoveEvent[];

  constructor(
    readonly kind: MergeMoveKind,
    readonly duration: number,
    events: MoveEvent[],
    private readonly sampler: Sampler,
    /** Where the actor ends (the merge result's cell). */
    readonly end: readonly [number, number],
  ) {
    this.events = events.slice().sort((a, b) => a.t - b.t);
  }

  /** The move at time `t` (seconds, clamped to [0, duration]); writes into `out` when given. */
  sample(t: number, out: MoveSample = createMoveSample()): MoveSample {
    resetSample(out);
    this.sampler(clamp(t, 0, this.duration), out);
    return out;
  }

  /** Calls `cb` for every event with t0 < event.t ≤ t1 (in order); t0 < 0 includes events at t = 0. */
  forEachEvent(t0: number, t1: number, cb: (e: MoveEvent) => void): void {
    for (const e of this.events) if (e.t > t0 && e.t <= t1) cb(e);
  }

  /** Time of the first event of a type (−1 if the move has none). */
  timeOf(type: MoveEventType): number {
    return this.events.find((e) => e.type === type)?.t ?? -1;
  }
}

export function createMoveSample(): MoveSample {
  return { x: 0, z: 0, lift: 0, yaw: 0, pitch: 0, roll: 0, squashAxis: [0, 1, 0], squash: 0, crouch: 0, mouth: 0, mouthRound: 0, squint: 0, coil: 0, bulge: -1, trumpet: 0, jiggle: 0, airborne: false, partner: null };
}

function resetSample(o: MoveSample): void {
  o.lift = 0;
  o.pitch = 0;
  o.roll = 0;
  o.squashAxis[0] = 0;
  o.squashAxis[1] = 1;
  o.squashAxis[2] = 0;
  o.squash = 0;
  o.crouch = 0;
  o.mouth = 0;
  o.mouthRound = 0;
  o.squint = 0;
  o.coil = 0;
  o.bulge = -1;
  o.trumpet = 0;
  o.jiggle = 0;
  o.airborne = false;
}

function setAxis(o: MoveSample, x: number, y: number, z: number): void {
  const l = Math.hypot(x, y, z) || 1;
  o.squashAxis[0] = x / l;
  o.squashAxis[1] = y / l;
  o.squashAxis[2] = z / l;
}

function partnerOut(o: MoveSample, p: MovePartner | null, x: number, z: number, lift: number, scale: number, squash: number): void {
  if (!p) {
    o.partner = null;
    return;
  }
  const q = (o.partner ??= { x: 0, z: 0, lift: 0, scale: 1, squash: 0, visible: true });
  q.x = x;
  q.z = z;
  q.lift = lift;
  q.scale = clamp01(scale);
  q.squash = squash;
  q.visible = scale > 0.01;
}

interface Base {
  ts: number;
  /** Heaviness factor for durations (mass^0.3). */
  heavy: number;
  g: number;
  bounce: number;
}

function base(ctx: MoveContext): Base {
  return {
    ts: Math.max(0.05, ctx.timeScale ?? 1),
    heavy: Math.pow(Math.max(0.3, ctx.mass), 0.3),
    g: ctx.gravity ?? 6.5,
    bounce: clamp01(ctx.bounce ?? 0.6),
  };
}

// --- pounce ----------------------------------------------------------------------------------------------

/**
 * Pounce: turn toward the target while winding up (crouch, pull back, squash), launch stretched along the
 * velocity, a ballistic arc (height from the distance and bounce), the mouth opening toward the target in
 * the second half of the flight (the sketch's crescent on the leading side), a splat landing exactly on
 * the target and a springy recovery.
 */
export function pounceTo(ctx: MoveContext, target: readonly [number, number]): MergeMove {
  const b = base(ctx);
  const [fx, fz] = ctx.from;
  const dx = target[0] - fx;
  const dz = target[1] - fz;
  const dist = Math.hypot(dx, dz);
  const ux = dist > 1e-6 ? dx / dist : Math.sin(ctx.yaw);
  const uz = dist > 1e-6 ? dz / dist : Math.cos(ctx.yaw);
  const yaw1 = dist > 1e-6 ? Math.atan2(dx, dz) : ctx.yaw;
  const turn = Math.abs(wrap(yaw1 - ctx.yaw));
  const A = (0.24 + 0.1 * Math.min(1, dist / (ctx.scale * 4)) + 0.08 * turn) * b.heavy * b.ts;
  const apex = ctx.scale * (0.4 + 0.55 * b.bounce) / Math.pow(Math.max(0.5, ctx.mass), 0.25) + dist * 0.2;
  const F = Math.sqrt((8 * apex) / b.g) * b.ts;
  const L = 0.09 * b.heavy * b.ts;
  const R = 0.42 * b.heavy * b.ts;
  const T = A + F + L + R;
  const impact = clamp01((Math.sqrt(2 * b.g * apex) / Math.max(0.2, ctx.scale * 6)) * 0.8 + 0.2);
  const events: MoveEvent[] = [
    { type: 'anticipate', t: 0, strength: 0.5 },
    { type: 'launch', t: A, strength: 0.7 },
    { type: 'apex', t: A + F / 2, strength: 0.5 },
    { type: 'mouthOpen', t: A + F * 0.5, strength: 0.8 },
    { type: 'land', t: A + F, strength: impact },
    { type: 'contact', t: A + F, strength: impact },
    { type: 'settle', t: A + F + L + R * 0.6, strength: 0.3 },
    { type: 'done', t: T, strength: 0 },
  ];
  const sampler: Sampler = (t, o) => {
    o.partner = null;
    if (t < A) {
      const u = t / A;
      const e = smooth(u);
      o.x = fx - ux * ctx.scale * 0.14 * e;
      o.z = fz - uz * ctx.scale * 0.14 * e;
      o.yaw = ctx.yaw + wrap(yaw1 - ctx.yaw) * turnProfile(u * 1.1, turn);
      o.crouch = e;
      o.squash = -0.32 * e;
      o.pitch = 0.08 * e;
      o.squint = 0.3 * e;
      return;
    }
    o.yaw = yaw1;
    if (t < A + F) {
      const u = (t - A) / F;
      o.x = fx + dx * u;
      o.z = fz + dz * u;
      o.lift = 4 * apex * u * (1 - u);
      o.airborne = true;
      // Velocity direction → stretch along it (round at the apex, a teardrop on launch and before landing).
      const vy = 4 * apex * (1 - 2 * u) / F;
      const vh = dist / F;
      setAxis(o, ux * vh, vy, uz * vh);
      o.squash = 0.36 * (0.35 + 0.65 * Math.abs(1 - 2 * u));
      o.pitch = lerp(-0.28, 0.32, u);
      o.mouth = smooth((u - 0.45) / 0.3);
      o.mouthRound = 0.2;
      return;
    }
    o.x = target[0];
    o.z = target[1];
    const t2 = t - A - F;
    if (t2 < L) {
      const u = t2 / L;
      o.squash = -0.42 * impact * Math.sin((Math.PI / 2) * Math.min(1, u * 1.4) + 0.001);
      o.jiggle = 1;
      o.mouth = 1 - smooth(u * 2);
      o.pitch = 0.2 * (1 - u);
      o.crouch = 0.6;
      return;
    }
    const v = (t2 - L) / R;
    o.squash = springBack(-0.42 * impact, v);
    o.jiggle = 1 - v;
    o.crouch = 0.6 * (1 - smooth(v));
  };
  return new MergeMove('pounce', T, events, sampler, [target[0], target[1]]);
}

// --- leap toward the camera -------------------------------------------------------------------------

export interface LeapOptions {
  /** Unit direction from the actor toward the camera (default: up and toward +z, 65° elevation). */
  camera?: Vec3 | undefined;
  /** Partner to fall onto and devour (default: none, lands where it started). */
  partner?: MovePartner | undefined;
}

/**
 * Leap toward the camera (strong legs, wings): a deep crouch facing the camera, a launch straight up and
 * a little toward the lens, the body pitching so the face — mouth wide open — looks into the camera,
 * a short hang at the apex, then the dive back down onto the partner: the mouth bites shut on impact,
 * the partner is gulped, a big splat and two chews.
 */
export function leapToCamera(ctx: MoveContext, height: number, opts: LeapOptions = {}): MergeMove {
  const b = base(ctx);
  const [fx, fz] = ctx.from;
  const cam = opts.camera ?? [0, Math.sin(1.13), Math.cos(1.13)];
  const cl = Math.hypot(cam[0], cam[1], cam[2]) || 1;
  const cx = cam[0] / cl;
  const cy = cam[1] / cl;
  const cz = cam[2] / cl;
  const ch = Math.hypot(cx, cz);
  const camYaw = ch > 1e-4 ? Math.atan2(cx, cz) : ctx.yaw;
  // Face the camera: pitch the nose up by (almost) the camera's elevation above the horizon.
  const faceUp = -Math.min(1.25, Math.atan2(cy, ch) * 0.9);
  const partner = opts.partner ?? null;
  const tx = partner ? partner.x : fx;
  const tz = partner ? partner.z : fz;
  const h = Math.max(ctx.scale * 0.8, height);
  const A = 0.36 * b.heavy * b.ts;
  const Up = Math.sqrt((2 * h) / b.g) * b.ts;
  const Hang = 0.26 * b.ts;
  const Down = Math.sqrt((2 * h) / (b.g * 1.25)) * b.ts;
  const L = 0.1 * b.heavy * b.ts;
  const Sw = 0.22 * b.ts;
  const Ch = 0.62 * b.ts;
  const R = 0.35 * b.heavy * b.ts;
  const tUp = A;
  const tApex = A + Up;
  const tDown = tApex + Hang;
  const tLand = tDown + Down;
  const T = tLand + L + Sw + Ch + R;
  const toward = Math.min(h * 0.35, ctx.scale * 1.2);
  const events: MoveEvent[] = [
    { type: 'anticipate', t: 0, strength: 0.7 },
    { type: 'launch', t: tUp, strength: 1 },
    { type: 'mouthOpen', t: tUp + Up * 0.45, strength: 1 },
    { type: 'apex', t: tApex, strength: 1 },
    { type: 'land', t: tLand, strength: 1 },
    { type: 'bite', t: tLand, strength: 1 },
    { type: 'contact', t: tLand, strength: 1 },
    { type: 'splash', t: tLand, strength: 1 },
    { type: 'swallow', t: tLand + L + Sw, strength: 0.8 },
    { type: 'chew', t: tLand + L + Sw + Ch * 0.35, strength: 0.5 },
    { type: 'chew', t: tLand + L + Sw + Ch * 0.8, strength: 0.5 },
    { type: 'settle', t: T - R * 0.4, strength: 0.3 },
    { type: 'done', t: T, strength: 0 },
  ];
  const sampler: Sampler = (t, o) => {
    partnerOut(o, partner, tx, tz, 0, 1, 0);
    if (t < tUp) {
      const u = t / A;
      const e = smooth(u);
      o.x = fx;
      o.z = fz;
      o.yaw = lerpAngle(ctx.yaw, camYaw, turnProfile(u * 1.15, wrap(camYaw - ctx.yaw)));
      o.crouch = e;
      o.squash = -0.4 * e;
      o.pitch = 0.12 * e;
      o.squint = 0.4 * e;
      return;
    }
    o.yaw = camYaw;
    if (t < tApex) {
      const u = (t - tUp) / Up;
      const e = easeOut(u);
      o.airborne = true;
      o.lift = h * (1 - (1 - u) * (1 - u));
      o.x = fx + cx / Math.max(1e-4, ch) * toward * e * (ch > 1e-4 ? 1 : 0);
      o.z = fz + cz / Math.max(1e-4, ch) * toward * e * (ch > 1e-4 ? 1 : 0);
      o.pitch = faceUp * smooth(u * 1.3);
      setAxis(o, 0, 1, 0);
      o.squash = 0.38 * (1 - u);
      o.mouth = smooth((u - 0.3) / 0.5);
      o.mouthRound = 0.35 * o.mouth;
      return;
    }
    const topX = fx + (ch > 1e-4 ? (cx / ch) * toward : 0);
    const topZ = fz + (ch > 1e-4 ? (cz / ch) * toward : 0);
    if (t < tDown) {
      const u = (t - tApex) / Hang;
      o.airborne = true;
      o.lift = h * (1 - 0.03 * Math.sin(Math.PI * u));
      o.x = topX;
      o.z = topZ;
      o.pitch = faceUp;
      o.mouth = 1;
      o.mouthRound = 0.4;
      o.squash = 0.05 * Math.sin(Math.PI * 2 * u);
      return;
    }
    if (t < tLand) {
      const u = (t - tDown) / Down;
      const e = easeIn(u);
      o.airborne = true;
      o.lift = h * (1 - e);
      o.x = lerp(topX, tx, smooth(u));
      o.z = lerp(topZ, tz, smooth(u));
      // Dive: from facing the camera to nose down onto the prey.
      o.pitch = lerp(faceUp, 0.45, smooth(u * 1.2));
      setAxis(o, 0, 1, 0);
      o.squash = 0.3 * e;
      o.mouth = 1;
      o.mouthRound = 0.25;
      return;
    }
    o.x = tx;
    o.z = tz;
    const t2 = t - tLand;
    if (t2 < L) {
      const u = t2 / L;
      o.squash = -0.5 * Math.sin((Math.PI / 2) * Math.min(1, u * 1.5) + 0.001);
      o.jiggle = 1;
      o.pitch = 0.45 * (1 - u);
      o.mouth = 1 - smooth(u * 3);
      o.squint = 1;
      o.crouch = 0.7;
      partnerOut(o, partner, tx, tz, 0, 1 - smooth(u * 1.5), -0.4 * u);
      return;
    }
    const t3 = t2 - L;
    if (t3 < Sw) {
      const u = t3 / Sw;
      o.squash = springBack(-0.5, u * 0.3);
      o.jiggle = 1 - u * 0.3;
      o.crouch = 0.7 * (1 - u);
      o.squint = 1 - u * 0.5;
      // Gulp: a bulge down the throat — the body stretches forward then back.
      setAxis(o, Math.sin(camYaw), 0.3, Math.cos(camYaw));
      o.squash = 0.18 * Math.sin(Math.PI * u);
      partnerOut(o, partner, tx, tz, 0, 0, 0);
      return;
    }
    const t4 = t3 - Sw;
    partnerOut(o, partner, tx, tz, 0, 0, 0);
    if (t4 < Ch) {
      const u = t4 / Ch;
      o.mouth = 0.38 * Math.max(0, Math.sin(Math.PI * 2 * u * 2));
      o.squash = -0.06 * Math.sin(Math.PI * 2 * u * 2);
      o.jiggle = 0.3;
      return;
    }
    const v = (t4 - Ch) / R;
    o.squash = springBack(-0.08, v);
  };
  return new MergeMove('leapToCamera', T, events, sampler, [tx, tz]);
}

// --- devour ----------------------------------------------------------------------------------------------

/**
 * Devour: approach the partner (a gliding shuffle when it is far), wind up with the mouth snapping wide
 * open and the body leaning back, lunge, bite shut on contact, pull the partner into the mouth (it
 * shrinks away), gulp (a stretch wave), chew twice and settle on the partner's spot.
 */
export function devour(ctx: MoveContext, partner: MovePartner): MergeMove {
  const b = base(ctx);
  const [fx, fz] = ctx.from;
  const dx = partner.x - fx;
  const dz = partner.z - fz;
  const dist = Math.hypot(dx, dz);
  const ux = dist > 1e-6 ? dx / dist : Math.sin(ctx.yaw);
  const uz = dist > 1e-6 ? dz / dist : Math.cos(ctx.yaw);
  const yaw1 = dist > 1e-6 ? Math.atan2(dx, dz) : ctx.yaw;
  const reach = partner.radius + ctx.scale * 1.05;
  const walk = Math.max(0, dist - reach);
  const W = walk > 1e-4 ? (walk / (ctx.scale * 2.6)) * b.heavy * b.ts + 0.12 * b.ts : 0.18 * b.ts;
  const O = 0.26 * b.heavy * b.ts;
  const Lg = 0.15 * b.ts;
  const Sw = 0.38 * b.ts;
  const Ch = 0.7 * b.ts;
  const R = 0.32 * b.heavy * b.ts;
  const tO = W;
  const tLg = W + O;
  const tBite = tLg + Lg;
  const tSw = tBite + Sw;
  const T = tSw + Ch + R;
  const sx = fx + ux * walk;
  const sz = fz + uz * walk;
  const lungeX = sx + ux * Math.min(reach, dist) * 0.45;
  const lungeZ = sz + uz * Math.min(reach, dist) * 0.45;
  const events: MoveEvent[] = [
    { type: 'anticipate', t: tO, strength: 0.6 },
    { type: 'mouthOpen', t: tO + O * 0.5, strength: 1 },
    { type: 'launch', t: tLg, strength: 0.6 },
    { type: 'contact', t: tBite, strength: 1 },
    { type: 'bite', t: tBite, strength: 1 },
    { type: 'swallow', t: tSw, strength: 0.8 },
    { type: 'chew', t: tSw + Ch * 0.3, strength: 0.5 },
    { type: 'chew', t: tSw + Ch * 0.75, strength: 0.5 },
    { type: 'settle', t: T - R * 0.4, strength: 0.3 },
    { type: 'done', t: T, strength: 0 },
  ];
  const sampler: Sampler = (t, o) => {
    partnerOut(o, partner, partner.x, partner.z, 0, 1, 0);
    if (t < tO) {
      const u = W > 0 ? t / W : 1;
      o.x = lerp(fx, sx, smooth(u));
      o.z = lerp(fz, sz, smooth(u));
      o.yaw = lerpAngle(ctx.yaw, yaw1, turnProfile(u * 1.4, wrap(yaw1 - ctx.yaw)));
      // A few eager shuffles on the way (a blob hops, walkers bob).
      o.lift = Math.abs(Math.sin(Math.PI * 3 * u)) * ctx.scale * 0.06 * (1 - u);
      o.squash = 0.06 * Math.sin(Math.PI * 6 * u);
      return;
    }
    o.yaw = yaw1;
    if (t < tLg) {
      const u = (t - tO) / O;
      const e = smooth(u);
      o.x = sx - ux * ctx.scale * 0.1 * e;
      o.z = sz - uz * ctx.scale * 0.1 * e;
      o.pitch = -0.2 * e;
      setAxis(o, 0, 1, 0);
      o.squash = 0.12 * e;
      o.mouth = smooth(u / 0.55);
      o.mouthRound = 0.15;
      o.crouch = 0.4 * e;
      return;
    }
    if (t < tBite) {
      const u = (t - tLg) / Lg;
      const e = easeIn(u);
      o.x = lerp(sx - ux * ctx.scale * 0.1, lungeX, e);
      o.z = lerp(sz - uz * ctx.scale * 0.1, lungeZ, e);
      o.pitch = lerp(-0.2, 0.22, e);
      setAxis(o, ux, 0.15, uz);
      o.squash = 0.32 * e;
      o.mouth = 1;
      o.crouch = 0.4 * (1 - e);
      return;
    }
    if (t < tSw) {
      const u = (t - tBite) / Sw;
      const e = smooth(u);
      // The actor slides onto the partner's spot while the partner is pulled into the mouth.
      o.x = lerp(lungeX, partner.x, e);
      o.z = lerp(lungeZ, partner.z, e);
      o.pitch = 0.22 * (1 - e);
      setAxis(o, ux, 0.2, uz);
      o.squash = 0.32 * (1 - e) - 0.16 * Math.sin(Math.PI * u);
      o.mouth = Math.max(0, 1 - u * 5) * 0.8;
      o.squint = 1 - e * 0.6;
      o.jiggle = 0.7;
      const mx = lerp(partner.x, lungeX + ux * ctx.scale * 0.4, e);
      const mz = lerp(partner.z, lungeZ + uz * ctx.scale * 0.4, e);
      partnerOut(o, partner, mx, mz, ctx.scale * 0.2 * e, 1 - smooth(u * 1.2), 0.2 * e);
      return;
    }
    partnerOut(o, partner, partner.x, partner.z, 0, 0, 0);
    o.x = partner.x;
    o.z = partner.z;
    const t2 = t - tSw;
    if (t2 < Ch) {
      const u = t2 / Ch;
      o.mouth = 0.4 * Math.max(0, Math.sin(Math.PI * 2 * u * 2));
      o.squash = -0.07 * Math.sin(Math.PI * 2 * u * 2);
      o.jiggle = 0.3;
      return;
    }
    const v = (t2 - Ch) / R;
    o.squash = springBack(-0.08, v);
  };
  return new MergeMove('devour', T, events, sampler, [partner.x, partner.z]);
}

// --- snake: coil and swallow ------------------------------------------------------------------------

/**
 * Snake: the head slithers to the partner and circles it (the follow-the-leader body wraps around it),
 * the coil squeezes (the partner flattens), the head rises and turns to the partner with the mouth wide
 * open, swallows it (the partner shrinks into the mouth) and a bulge travels down the body while the
 * snake rests in its coil. The head path is sampled as (x, z, yaw); `coil` and `bulge` drive the body.
 */
export function coilSwallow(ctx: MoveContext, partner: MovePartner, thickness?: number): MergeMove {
  const b = base(ctx);
  const [fx, fz] = ctx.from;
  const th = thickness ?? ctx.scale * 0.8;
  const rc = partner.radius + th * 0.65;
  const dx = partner.x - fx;
  const dz = partner.z - fz;
  const dist = Math.hypot(dx, dz);
  // Approach point on the circle: the side facing the snake, entering tangentially (counter-clockwise).
  const a0 = dist > 1e-6 ? Math.atan2(fz - partner.z, fx - partner.x) : ctx.yaw;
  const ex = partner.x + Math.cos(a0) * rc;
  const ez = partner.z + Math.sin(a0) * rc;
  const approach = Math.hypot(ex - fx, ez - fz);
  const turns = 1.3;
  const circleLen = 2 * Math.PI * rc * turns;
  const speed = ctx.scale * 2.2;
  const Ap = (approach / speed + 0.1) * b.ts;
  const Ci = (circleLen / speed) * b.ts;
  const Sq = 0.45 * b.ts;
  const Op = 0.32 * b.ts;
  const Sw = 0.5 * b.ts;
  const Di = 1.1 * b.ts;
  const tCi = Ap;
  const tSq = Ap + Ci;
  const tOp = tSq + Sq;
  const tSw = tOp + Op;
  const tDi = tSw + Sw;
  const T = tDi + Di;
  const yawIn = Math.atan2(ex - fx, ez - fz);
  const events: MoveEvent[] = [
    { type: 'anticipate', t: 0, strength: 0.3 },
    { type: 'coil', t: tCi, strength: 0.6 },
    { type: 'contact', t: tSq, strength: 0.8 },
    { type: 'mouthOpen', t: tOp + Op * 0.4, strength: 1 },
    { type: 'bite', t: tSw, strength: 1 },
    { type: 'swallow', t: tDi, strength: 1 },
    { type: 'settle', t: T - Di * 0.3, strength: 0.3 },
    { type: 'done', t: T, strength: 0 },
  ];
  const circleAt = (s: number, shrink: number, out: MoveSample): void => {
    // Counter-clockwise around the partner, radius shrinking a little as it squeezes.
    const ang = a0 - s / rc;
    const r = rc * (1 - 0.12 * shrink);
    out.x = partner.x + Math.cos(ang) * r;
    out.z = partner.z + Math.sin(ang) * r;
    // Tangent of a decreasing angle: (sin, −cos).
    out.yaw = Math.atan2(Math.sin(ang), -Math.cos(ang));
  };
  const sampler: Sampler = (t, o) => {
    partnerOut(o, partner, partner.x, partner.z, 0, 1, 0);
    if (t < tCi) {
      const u = t / Ap;
      o.x = lerp(fx, ex, u);
      o.z = lerp(fz, ez, u);
      o.yaw = lerpAngle(ctx.yaw, yawIn, smooth(u * 3));
      return;
    }
    if (t < tSq) {
      const u = (t - tCi) / Ci;
      circleAt(u * circleLen, 0, o);
      o.coil = u;
      return;
    }
    if (t < tOp) {
      const u = (t - tSq) / Sq;
      circleAt(circleLen, smooth(u), o);
      o.coil = 1;
      o.squint = 0.5 * smooth(u);
      partnerOut(o, partner, partner.x, partner.z, 0, 1, -0.3 * smooth(u));
      return;
    }
    circleAt(circleLen, 1, o);
    o.coil = 1;
    const faceYaw = Math.atan2(partner.x - o.x, partner.z - o.z);
    if (t < tSw) {
      const u = (t - tOp) / Op;
      const e = smooth(u);
      o.yaw = lerpAngle(o.yaw, faceYaw, e);
      o.lift = ctx.scale * 0.32 * e;
      o.pitch = -0.25 * e;
      o.mouth = smooth(u / 0.7);
      o.mouthRound = 0.3;
      partnerOut(o, partner, partner.x, partner.z, 0, 1, -0.3);
      return;
    }
    o.yaw = faceYaw;
    if (t < tDi) {
      const u = (t - tSw) / Sw;
      const e = smooth(u);
      o.lift = ctx.scale * 0.32 * (1 - 0.6 * e);
      o.pitch = -0.25 + 0.35 * e;
      o.mouth = 1 - smooth((u - 0.7) / 0.3);
      o.squint = e;
      const mx = lerp(partner.x, o.x, e);
      const mz = lerp(partner.z, o.z, e);
      partnerOut(o, partner, mx, mz, ctx.scale * 0.2 * e, 1 - smooth(u * 1.1), -0.3 * (1 - e));
      o.bulge = 0;
      return;
    }
    partnerOut(o, partner, partner.x, partner.z, 0, 0, 0);
    const u = (t - tDi) / Di;
    o.lift = ctx.scale * 0.13 * (1 - smooth(u));
    o.pitch = 0.1 * (1 - u);
    o.bulge = u;
    o.jiggle = 0.3 * (1 - u);
  };
  const end = { x: 0, z: 0 };
  {
    const ang = a0 - circleLen / rc;
    end.x = partner.x + Math.cos(ang) * rc * 0.88;
    end.z = partner.z + Math.sin(ang) * rc * 0.88;
  }
  return new MergeMove('coilSwallow', T, events, sampler, [end.x, end.z]);
}

// --- heavy: stomp ----------------------------------------------------------------------------------------

/**
 * Heavy stomp: rear up (front lifts, nose up, trunk raised and mouth open — a trumpet), hold with a
 * tremble, slam down (a hard stomp, splash, the partner pressed flat and absorbed), a heavy shake and a
 * slow settle. With a partner the actor ends on the partner's spot (it steps onto it while rearing).
 */
export function stompMerge(ctx: MoveContext, partner?: MovePartner): MergeMove {
  const b = base(ctx);
  const [fx, fz] = ctx.from;
  const p = partner ?? null;
  const tx = p ? p.x : fx;
  const tz = p ? p.z : fz;
  const dx = tx - fx;
  const dz = tz - fz;
  const dist = Math.hypot(dx, dz);
  const yaw1 = dist > 1e-6 ? Math.atan2(dx, dz) : ctx.yaw;
  // Stop short of the partner by the overlap the slam covers.
  const stopX = p ? tx - (dist > 1e-6 ? (dx / dist) : 0) * Math.min(dist, p.radius * 0.8) : fx;
  const stopZ = p ? tz - (dist > 1e-6 ? (dz / dist) : 0) * Math.min(dist, p.radius * 0.8) : fz;
  const Rr = 0.5 * b.heavy * b.ts;
  const Ho = 0.22 * b.ts;
  const Sl = 0.14 * b.ts;
  const Sh = 0.55 * b.heavy * b.ts;
  const Se = 0.42 * b.heavy * b.ts;
  const tHo = Rr;
  const tSl = Rr + Ho;
  const tHit = tSl + Sl;
  const T = tHit + Sh + Se;
  const events: MoveEvent[] = [
    { type: 'anticipate', t: 0, strength: 0.6 },
    { type: 'mouthOpen', t: Rr * 0.6, strength: 0.7 },
    { type: 'launch', t: tSl, strength: 0.7 },
    { type: 'stomp', t: tHit, strength: 1 },
    { type: 'contact', t: tHit, strength: 1 },
    { type: 'splash', t: tHit, strength: 1 },
    { type: 'swallow', t: tHit + Sh * 0.6, strength: 0.6 },
    { type: 'settle', t: T - Se * 0.4, strength: 0.3 },
    { type: 'done', t: T, strength: 0 },
  ];
  const sampler: Sampler = (t, o) => {
    partnerOut(o, p, tx, tz, 0, 1, 0);
    if (t < tHo) {
      const u = t / Rr;
      const e = smooth(u);
      o.x = lerp(fx, stopX, e);
      o.z = lerp(fz, stopZ, e);
      o.yaw = lerpAngle(ctx.yaw, yaw1, turnProfile(u * 1.2, wrap(yaw1 - ctx.yaw)));
      o.pitch = -0.42 * e;
      o.lift = ctx.scale * 0.22 * e;
      o.trumpet = e;
      o.mouth = smooth((u - 0.4) / 0.4) * 0.8;
      o.mouthRound = 0.6;
      o.squash = 0.1 * e;
      return;
    }
    o.yaw = yaw1;
    if (t < tSl) {
      const u = (t - tHo) / Ho;
      o.x = stopX;
      o.z = stopZ;
      o.pitch = -0.42 - 0.04 * Math.sin(Math.PI * u);
      o.lift = ctx.scale * (0.22 + 0.02 * Math.sin(Math.PI * u));
      o.trumpet = 1;
      o.mouth = 0.8 + 0.06 * Math.sin(u * 40);
      o.mouthRound = 0.6;
      o.squash = 0.1;
      o.roll = 0.03 * Math.sin(u * 30);
      return;
    }
    if (t < tHit) {
      const u = (t - tSl) / Sl;
      const e = easeIn(u);
      o.x = lerp(stopX, tx, e * 0.5);
      o.z = lerp(stopZ, tz, e * 0.5);
      o.pitch = lerp(-0.42, 0.14, e);
      o.lift = ctx.scale * 0.22 * (1 - e);
      o.trumpet = 1 - e;
      o.mouth = 0.8 * (1 - e);
      o.squash = 0.1 + 0.15 * e;
      o.airborne = true;
      return;
    }
    const mx = lerp(stopX, tx, 0.5);
    const mz = lerp(stopZ, tz, 0.5);
    const t2 = t - tHit;
    if (t2 < Sh) {
      const u = t2 / Sh;
      o.x = lerp(mx, tx, smooth(u));
      o.z = lerp(mz, tz, smooth(u));
      o.pitch = 0.14 * (1 - smooth(u));
      o.squash = springBack(-0.4, u * 0.8, 3);
      o.jiggle = 1 - u * 0.5;
      o.roll = 0.06 * Math.sin(u * 22) * (1 - u);
      o.crouch = 0.5 * (1 - u);
      o.squint = 1 - u;
      partnerOut(o, p, tx, tz, 0, 1 - smooth(u / 0.6), -0.7 * smooth(u * 3));
      return;
    }
    partnerOut(o, p, tx, tz, 0, 0, 0);
    o.x = tx;
    o.z = tz;
    const v = (t2 - Sh) / Se;
    o.squash = springBack(-0.08, v);
    o.jiggle = 0.5 * (1 - v);
  };
  return new MergeMove('stompMerge', T, events, sampler, [tx, tz]);
}

// --- blob: splash ------------------------------------------------------------------------------------------

/**
 * Blob splash: a squash wind-up, a small hop onto the partner, a splash-down into a puddle (droplets,
 * ripple), the partner melting into the puddle, then the puddle gathering itself back up into a blob
 * with an overshoot.
 */
export function splashMerge(ctx: MoveContext, partner?: MovePartner): MergeMove {
  const b = base(ctx);
  const [fx, fz] = ctx.from;
  const p = partner ?? null;
  const tx = p ? p.x : fx;
  const tz = p ? p.z : fz;
  const dx = tx - fx;
  const dz = tz - fz;
  const dist = Math.hypot(dx, dz);
  const yaw1 = dist > 1e-6 ? Math.atan2(dx, dz) : ctx.yaw;
  const A = 0.2 * b.heavy * b.ts;
  const apex = ctx.scale * (0.35 + 0.35 * b.bounce) + dist * 0.18;
  const F = Math.sqrt((8 * apex) / b.g) * b.ts;
  const Sp = 0.12 * b.ts;
  const Pu = 0.3 * b.ts;
  const Ga = 0.55 * b.heavy * b.ts;
  const tF = A;
  const tSp = A + F;
  const tPu = tSp + Sp;
  const tGa = tPu + Pu;
  const T = tGa + Ga;
  const events: MoveEvent[] = [
    { type: 'anticipate', t: 0, strength: 0.5 },
    { type: 'launch', t: tF, strength: 0.6 },
    { type: 'apex', t: tF + F / 2, strength: 0.4 },
    { type: 'land', t: tSp, strength: 1 },
    { type: 'splash', t: tSp, strength: 1 },
    { type: 'contact', t: tSp, strength: 1 },
    { type: 'swallow', t: tGa, strength: 0.7 },
    { type: 'settle', t: T - Ga * 0.35, strength: 0.4 },
    { type: 'done', t: T, strength: 0 },
  ];
  const sampler: Sampler = (t, o) => {
    partnerOut(o, p, tx, tz, 0, 1, 0);
    if (t < tF) {
      const u = t / A;
      const e = smooth(u);
      o.x = fx;
      o.z = fz;
      o.yaw = lerpAngle(ctx.yaw, yaw1, smooth(u));
      o.squash = -0.34 * e;
      o.crouch = e;
      return;
    }
    o.yaw = yaw1;
    if (t < tSp) {
      const u = (t - tF) / F;
      o.airborne = true;
      o.x = fx + dx * u;
      o.z = fz + dz * u;
      o.lift = 4 * apex * u * (1 - u);
      const vy = 4 * apex * (1 - 2 * u) / F;
      const vh = dist / F;
      setAxis(o, (dist > 1e-6 ? dx / dist : 0) * vh, vy, (dist > 1e-6 ? dz / dist : 0) * vh);
      o.squash = 0.34 * Math.abs(1 - 2 * u) + 0.08;
      o.mouth = smooth((u - 0.5) / 0.3) * 0.7;
      return;
    }
    o.x = tx;
    o.z = tz;
    if (t < tPu) {
      const u = (t - tSp) / Sp;
      o.squash = -0.66 * easeOut(u);
      o.jiggle = 1;
      o.mouth = 0.7 * (1 - u);
      partnerOut(o, p, tx, tz, 0, 1 - 0.4 * u, -0.5 * u);
      return;
    }
    if (t < tGa) {
      const u = (t - tPu) / Pu;
      o.squash = -0.66 + 0.04 * Math.sin(Math.PI * 3 * u);
      o.jiggle = 1;
      o.squint = 0.6;
      partnerOut(o, p, tx, tz, 0, 0.6 * (1 - smooth(u)), -0.5);
      return;
    }
    partnerOut(o, p, tx, tz, 0, 0, 0);
    const v = (t - tGa) / Ga;
    // Gather up: from the puddle through a tall overshoot back to rest.
    o.squash = -0.66 * Math.exp(-3.6 * v) * Math.cos(Math.PI * 1.6 * v);
    o.jiggle = 1 - v;
  };
  return new MergeMove('splashMerge', T, events, sampler, [tx, tz]);
}

/** The move that fits an archetype best (the board's default merge flourish). */
export function defaultMergeMove(bodyType: BodyType): MergeMoveKind {
  switch (bodyType) {
    case 'snake':
      return 'coilSwallow';
    case 'heavy':
      return 'stompMerge';
    case 'biped':
      return 'leapToCamera';
    case 'quadruped':
      return 'devour';
    default:
      return 'splashMerge';
  }
}
