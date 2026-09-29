/**
 * Procedural animation primitives for accessories (no keyframes anywhere): damped springs for
 * follow-through, a spring chain for trunks/tails/floppy ears, and a seeded idle clock that fires
 * blinks, twitches and flaps so a creature never sits still. Pure TS, deterministic per seed.
 */
import { mulberry32 } from './rng';
import type { Verb } from './rules';

export interface Spring {
  x: number;
  v: number;
}

const MAX_H = 1 / 240;

/**
 * Damped harmonic spring toward `target` (semi-implicit Euler, sub-stepped so stiff springs stay
 * stable at low frame rates). `omega` = natural frequency (rad/s), `zeta` = damping ratio.
 */
export function springStep(s: Spring, target: number, omega: number, zeta: number, dt: number): void {
  if (!(dt > 0)) return;
  const steps = Math.max(1, Math.ceil(dt / MAX_H));
  const h = Math.min(dt, 0.1) / steps;
  for (let i = 0; i < steps; i++) {
    s.v += (-omega * omega * (s.x - target) - 2 * zeta * omega * s.v) * h;
    s.x += s.v * h;
  }
  if (Math.abs(s.x - target) < 1e-6 && Math.abs(s.v) < 1e-6) {
    s.x = target;
    s.v = 0;
  }
}

/** Convenience wrapper around `springStep` with fixed tuning. */
export class Spring1D implements Spring {
  x: number;
  v = 0;
  target: number;
  constructor(x = 0, public omega = 18, public zeta = 0.3) {
    this.x = x;
    this.target = x;
  }
  kick(velocity: number): void {
    this.v += velocity;
  }
  step(dt: number): number {
    springStep(this, this.target, this.omega, this.zeta, dt);
    return this.x;
  }
  get settled(): boolean {
    return Math.abs(this.x - this.target) < 1e-4 && Math.abs(this.v) < 1e-4;
  }
}

export interface SpringChainOptions {
  omega?: number;
  zeta?: number;
  /** 0..1 how strongly each segment follows the bend of its parent (1 = whip). */
  follow?: number;
  /** Rest bend per segment (radians, about x) so tails curl at rest. */
  restBendX?: number;
  restBendY?: number;
  /** Gravity-like constant bend applied per segment (radians). */
  droop?: number;
}

/**
 * Wiggle-bone chain: segment i has bend angles (ax, ay) that spring toward its parent's bend (delayed
 * follow) plus the rest curl; the root is driven directly (sway, wag). Impulses add angular velocity
 * along the chain with falloff so a poke ripples to the tip.
 */
export class SpringChain {
  readonly ax: Float64Array;
  readonly ay: Float64Array;
  readonly vx: Float64Array;
  readonly vy: Float64Array;
  driveX = 0;
  driveY = 0;
  readonly omega: number;
  readonly zeta: number;
  readonly follow: number;
  readonly restBendX: number;
  readonly restBendY: number;
  readonly droop: number;

  constructor(readonly count: number, opts: SpringChainOptions = {}) {
    this.ax = new Float64Array(count);
    this.ay = new Float64Array(count);
    this.vx = new Float64Array(count);
    this.vy = new Float64Array(count);
    this.omega = opts.omega ?? 14;
    this.zeta = opts.zeta ?? 0.22;
    this.follow = opts.follow ?? 0.85;
    this.restBendX = opts.restBendX ?? 0;
    this.restBendY = opts.restBendY ?? 0;
    this.droop = opts.droop ?? 0;
    for (let i = 0; i < count; i++) {
      this.ax[i] = this.restBendX + this.droop;
      this.ay[i] = this.restBendY;
    }
  }

  /** Angular velocity kick (rad/s) on every segment, scaled by `falloff^i`. */
  impulse(vx: number, vy: number, falloff = 0.75): void {
    let w = 1;
    for (let i = 0; i < this.count; i++) {
      this.vx[i] = this.vx[i]! + vx * w;
      this.vy[i] = this.vy[i]! + vy * w;
      w *= falloff;
    }
  }

  step(dt: number): void {
    if (!(dt > 0)) return;
    const steps = Math.max(1, Math.ceil(dt / MAX_H));
    const h = Math.min(dt, 0.1) / steps;
    const w = this.omega;
    const z = this.zeta;
    for (let s = 0; s < steps; s++) {
      const restX = this.restBendX + this.droop;
      const restY = this.restBendY;
      for (let i = 0; i < this.count; i++) {
        // Children follow the parent's *deviation* from rest (delayed whip), so the rest curl itself
        // does not compound along the chain.
        const parentX = i === 0 ? this.driveX : (this.ax[i - 1]! - restX) * this.follow;
        const parentY = i === 0 ? this.driveY : (this.ay[i - 1]! - restY) * this.follow;
        // Deeper segments get a slightly lower frequency → the tip lags (whip look).
        const wi = w * (1 - 0.12 * i);
        const tx = parentX + restX;
        const ty = parentY + restY;
        const ax = this.ax[i]!;
        const ay = this.ay[i]!;
        const vx = this.vx[i]! + (-wi * wi * (ax - tx) - 2 * z * wi * this.vx[i]!) * h;
        const vy = this.vy[i]! + (-wi * wi * (ay - ty) - 2 * z * wi * this.vy[i]!) * h;
        this.vx[i] = vx;
        this.vy[i] = vy;
        this.ax[i] = ax + vx * h;
        this.ay[i] = ay + vy * h;
      }
    }
  }

  /** Sum of bends up to and including segment i (world bend of that segment). */
  cumulative(i: number): [number, number] {
    let x = 0;
    let y = 0;
    for (let k = 0; k <= i && k < this.count; k++) {
      x += this.ax[k]!;
      y += this.ay[k]!;
    }
    return [x, y];
  }
}

export interface IdleEvent {
  verb: Verb;
  /** 0..1 strength (double blinks, big twitches). */
  strength: number;
}

interface IdleTimer {
  verb: Verb;
  mean: number;
  next: number;
}

/**
 * Seeded idle scheduler: exponential inter-event times (clamped) per verb, scaled by the creature's
 * idle tempo. The rig triggers only the verbs it has parts for; the rest are dropped.
 */
export class IdleClock {
  private readonly rand: () => number;
  private readonly timers: IdleTimer[];
  private t = 0;

  constructor(seed: number, readonly tempo = 1, means: Partial<Record<Verb, number>> = {}) {
    this.rand = mulberry32(seed >>> 0);
    const defaults: Record<Verb, number> = { blink: 3.4, twitch: 5.5, flap: 7, wag: 4.5, bob: 6, sway: 5, gaze: 4 };
    this.timers = (Object.keys(defaults) as Verb[]).map((verb) => {
      const mean = (means[verb] ?? defaults[verb]) / Math.max(0.2, tempo);
      return { verb, mean, next: this.sample(mean) * this.rand() };
    });
  }

  private sample(mean: number): number {
    const u = Math.max(1e-6, 1 - this.rand());
    return Math.min(3 * mean, Math.max(0.3 * mean, -Math.log(u) * mean));
  }

  step(dt: number): IdleEvent[] {
    this.t += dt;
    const fired: IdleEvent[] = [];
    for (const tm of this.timers) {
      if (this.t >= tm.next) {
        fired.push({ verb: tm.verb, strength: 0.6 + 0.4 * this.rand() });
        tm.next = this.t + this.sample(tm.mean);
      }
    }
    return fired;
  }
}

/** Blink curve: 0 → 1 (closed) → 0 over `duration` seconds, sharp close, softer open. */
export function blinkAmount(elapsed: number, duration = 0.16): number {
  if (elapsed < 0 || elapsed > duration) return 0;
  const u = elapsed / duration;
  return u < 0.4 ? Math.pow(u / 0.4, 0.6) : 1 - Math.pow((u - 0.4) / 0.6, 1.4);
}
