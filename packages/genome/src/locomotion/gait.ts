/**
 * Step cycles: feet that are planted stay where they are, swinging feet travel in an arc to a target
 * ahead of the hip. Phase offsets per leg give the lateral-sequence walk, the diagonal trot, the biped
 * stomp and the heavy waddle. The cycle rate follows the body speed (rate = speed / stride) so planted
 * feet never slide, with a minimum rate so a barely moving body still shuffles. Pure and deterministic.
 */
import type { LegRole } from '../body';
import type { GaitKind } from '../creature';
import type { Vec3 } from '../types';

export interface LegDef {
  /** Part id in the creature spec. */
  id: string;
  role: LegRole;
  /** Hip point in blob-local rest space (blob units). */
  hip: Vec3;
  /** Leg length (blob units). */
  length: number;
  /** +1 = left side (+x), −1 = right side. */
  side: 1 | -1;
  pair: 'front' | 'back';
  /** Knee bend direction along the body's forward axis. */
  knee: 1 | -1;
}

export interface GaitParams {
  /** Stance fraction of the cycle. */
  duty: number;
  /** Phase offset per role (fraction of the cycle). */
  offsets: Record<LegRole, number>;
  /** Swing arc height as a fraction of the leg length. */
  lift: number;
  /** Stride as a fraction of the leg length (world). */
  stride: number;
  /** Vertical body bob amplitude (fraction of the leg length) and beats per cycle. */
  bob: number;
  beats: number;
  /** Body roll amplitude (radians) toward the stance side. */
  roll: number;
  /** Minimum cycle rate (Hz) while creeping. */
  minRate: number;
}

export const GAIT_PARAMS: Readonly<Record<GaitKind, GaitParams>> = {
  // Lateral sequence: LH, LF, RH, RF each a quarter cycle apart.
  walk: { duty: 0.66, offsets: { BL: 0, FL: 0.25, BR: 0.5, FR: 0.75, L: 0, R: 0.5 }, lift: 0.32, stride: 1.25, bob: 0.035, beats: 4, roll: 0.05, minRate: 0.9 },
  // Diagonal pairs.
  trot: { duty: 0.52, offsets: { FL: 0, BR: 0, FR: 0.5, BL: 0.5, L: 0, R: 0.5 }, lift: 0.4, stride: 1.6, bob: 0.06, beats: 2, roll: 0.03, minRate: 1.2 },
  // Biped: alternate legs, big lifts, hard landings.
  stomp: { duty: 0.6, offsets: { L: 0, R: 0.5, FL: 0, FR: 0.5, BL: 0, BR: 0.5 }, lift: 0.45, stride: 1.05, bob: 0.07, beats: 2, roll: 0.12, minRate: 0.8 },
  // Heavy: long stances, wide sway.
  waddle: { duty: 0.74, offsets: { BL: 0, FL: 0.25, BR: 0.5, FR: 0.75, L: 0, R: 0.5 }, lift: 0.22, stride: 0.9, bob: 0.03, beats: 2, roll: 0.16, minRate: 0.6 },
  // Hop and slither have no feet; their params only matter for legs a blob wears (kick with the hop).
  hop: { duty: 0.7, offsets: { FL: 0, FR: 0, BL: 0, BR: 0, L: 0, R: 0 }, lift: 0.3, stride: 1, bob: 0, beats: 1, roll: 0, minRate: 1 },
  slither: { duty: 0.7, offsets: { FL: 0, FR: 0.5, BL: 0.5, BR: 0, L: 0, R: 0.5 }, lift: 0.2, stride: 1, bob: 0, beats: 2, roll: 0, minRate: 1 },
};

export interface FootState {
  leg: LegDef;
  /** Current foot position (world). While planted it does not move. */
  pos: Vec3;
  planted: boolean;
  /** Planted position the current swing started from and its target. */
  from: Vec3;
  to: Vec3;
  /** 0..1 progress of the current swing (0 while planted). */
  swing: number;
  /** Local phase 0..1 (offset applied). */
  phase: number;
  /** True for the frame in which the foot landed (stomp impulses). */
  landed: boolean;
  /** True for the frame in which a planted foot slipped (reach limit). */
  slipped: boolean;
}

const smooth = (u: number): number => u * u * (3 - 2 * u);

/**
 * Drives the feet of one creature. `hips` returns the current world hip position of a leg (the caller
 * knows the body pose); `ground` the terrain height at (x, z).
 */
export class StepCycle {
  readonly params: GaitParams;
  readonly feet: FootState[];
  /** Cycle phase 0..1. */
  phase = 0;
  /** Rate of the last step (Hz) — 0 while standing. */
  rate = 0;
  /** Effective stride of the last step (world units). */
  stride = 0;
  /** Horizontal reach limit of a planted foot from its hip, in leg lengths. */
  reach = 0.9;

  constructor(
    readonly legs: readonly LegDef[],
    readonly gait: GaitKind,
    readonly ground: (x: number, z: number) => number = () => 0,
  ) {
    this.params = GAIT_PARAMS[gait];
    this.feet = legs.map((leg) => ({ leg, pos: [0, 0, 0], planted: true, from: [0, 0, 0], to: [0, 0, 0], swing: 0, phase: this.params.offsets[leg.role], landed: false, slipped: false }));
  }

  /** Plants every foot under its hip (teleport, start of a scene). */
  reset(hips: (leg: LegDef) => Vec3): void {
    this.phase = 0;
    for (const f of this.feet) {
      const h = hips(f.leg);
      const gy = this.ground(h[0], h[2]);
      f.pos[0] = f.from[0] = f.to[0] = h[0];
      f.pos[1] = f.from[1] = f.to[1] = gy;
      f.pos[2] = f.from[2] = f.to[2] = h[2];
      f.planted = true;
      f.swing = 0;
      f.landed = false;
      f.phase = this.params.offsets[f.leg.role];
    }
  }

  /** True while any foot is mid-swing (the cycle keeps running until it lands). */
  get swinging(): boolean {
    return this.feet.some((f) => !f.planted);
  }

  /**
   * Advances the cycle. `speed` (world/s) and `forward` (unit) describe the body motion, `legLength`
   * the reference leg length (world) for stride and lift. `rateScale` slows the cycle (stumbles).
   */
  step(dt: number, speed: number, forward: Vec3, legLength: number, hips: (leg: LegDef) => Vec3, rateScale = 1, tempo = 1): void {
    const p = this.params;
    const strideMax = Math.max(1e-3, p.stride * legLength) * (0.7 + 0.3 * tempo);
    const moving = speed > 1e-4;
    let rate = 0;
    if (moving) rate = Math.max(p.minRate * tempo, speed / strideMax);
    else if (this.swinging) rate = p.minRate * tempo; // finish the swings in the air, then stand
    rate *= rateScale;
    this.rate = rate;
    this.stride = rate > 0 ? Math.min(strideMax, speed / rate) : 0;
    this.phase = (this.phase + rate * dt) % 1;
    const lift = p.lift * legLength;
    for (const f of this.feet) {
      f.landed = false;
      f.slipped = false;
      const local = (this.phase + p.offsets[f.leg.role]) % 1;
      f.phase = local;
      const inStance = local < p.duty;
      if (inStance) {
        if (!f.planted) {
          // Touchdown: the foot lands on its target and stays there.
          f.pos[0] = f.to[0];
          f.pos[1] = f.to[1];
          f.pos[2] = f.to[2];
          f.planted = true;
          f.swing = 0;
          f.landed = true;
        } else {
          // Reach limit: a planted foot is never left behind beyond what the leg can stretch to (a hard
          // turn or a shove); it slips after the hip instead. Normal strides stay far inside it.
          const h = hips(f.leg);
          const dx = f.pos[0] - h[0];
          const dz = f.pos[2] - h[2];
          const d = Math.hypot(dx, dz);
          const reach = this.reach * legLength;
          if (d > reach) {
            const k = reach / d;
            f.pos[0] = h[0] + dx * k;
            f.pos[2] = h[2] + dz * k;
            f.slipped = true;
          }
        }
        continue;
      }
      const u = (local - p.duty) / (1 - p.duty);
      if (f.planted) {
        // Standing still: planted feet stay down even when their phase window says swing.
        if (!moving) continue;
        // Lift-off: aim ahead of the hip so the body passes over the foot during the next stance.
        const h = hips(f.leg);
        const ahead = this.stride * (1 - p.duty / 2);
        const tx = h[0] + forward[0] * ahead;
        const tz = h[2] + forward[2] * ahead;
        f.from[0] = f.pos[0];
        f.from[1] = f.pos[1];
        f.from[2] = f.pos[2];
        f.to[0] = tx;
        f.to[1] = this.ground(tx, tz);
        f.to[2] = tz;
        f.planted = false;
      }
      const e = smooth(u);
      f.swing = u;
      f.pos[0] = f.from[0] + (f.to[0] - f.from[0]) * e;
      f.pos[1] = f.from[1] + (f.to[1] - f.from[1]) * e + Math.sin(Math.PI * u) * lift;
      f.pos[2] = f.from[2] + (f.to[2] - f.from[2]) * e;
    }
  }

  /** Vertical bob (world) and roll (radians) of the body from the cycle, scaled by the motion intensity. */
  bodyMotion(legLength: number, intensity: number): { bob: number; roll: number } {
    const p = this.params;
    const ph = this.phase * Math.PI * 2;
    return {
      bob: -Math.abs(Math.sin((ph * p.beats) / 2)) * p.bob * legLength * intensity,
      roll: Math.sin(ph) * p.roll * intensity,
    };
  }
}
