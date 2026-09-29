/**
 * Ballistic jump planning and the slime-jump timing (anticipation squash → launch stretch → arc →
 * splat). Everything here is pure and deterministic; the MotionController integrates it.
 */

export interface JumpPlan {
  /** Horizontal velocity (world units/s). */
  vx: number;
  vz: number;
  /** Vertical launch velocity. */
  vy: number;
  /** Flight time until the body returns to launch height. */
  duration: number;
  /** Apex height above the launch height. */
  apex: number;
  gravity: number;
}

export interface JumpOptions {
  gravity?: number;
  /** Apex height (world). Omit to derive it from the distance and `power`. */
  apex?: number;
  /** 0..1 jump power: taller arcs for the same distance (blob), flat lunges for heavy bodies. */
  power?: number;
  /** Reference size (world), so short creatures hop lower. */
  size?: number;
}

/**
 * Plans an arc from `from` to `to` (ground points) that lands exactly on `to`: pick the apex height,
 * derive the flight time from gravity, then the horizontal velocity that covers the distance.
 */
export function planJump(from: readonly [number, number], to: readonly [number, number], opts: JumpOptions = {}): JumpPlan {
  const gravity = opts.gravity ?? 9.8;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const dist = Math.hypot(dx, dz);
  const power = opts.power ?? 0.6;
  const size = opts.size ?? 0.4;
  const apex = opts.apex ?? Math.max(0.05, size * (0.35 + 1.1 * power) + dist * (0.12 + 0.28 * power));
  const duration = Math.sqrt((8 * apex) / gravity);
  return { vx: dx / duration, vz: dz / duration, vy: (gravity * duration) / 2, duration, apex, gravity };
}

/** Height above the launch point at time t of a plan (≥ 0 during the flight). */
export function jumpHeight(plan: JumpPlan, t: number): number {
  return plan.vy * t - (plan.gravity * t * t) / 2;
}

/**
 * Squash amount during the phases of a slime jump, sign convention of `Squash`: positive = stretched
 * along the axis, negative = flattened. Anticipation compresses vertically, the launch stretches along
 * the velocity (with a teardrop taper), in flight the stretch follows |v| (round at the apex, stretched
 * again before landing), the splat flattens hard and recovers with a spring.
 */
export const JUMP_TIMING = {
  /** Anticipation length (s) for a unit-mass body; heavier bodies wind up longer. */
  anticipate: 0.15,
  /** Splat hold before the recovery spring takes over (s). */
  splat: 0.06,
  /** Recovery until the next command (s). */
  recover: 0.32,
} as const;

/** Anticipation: ease-in compression toward `depth` over the wind-up. */
export function anticipationSquash(u: number, depth = 0.35): number {
  const e = Math.min(1, Math.max(0, u));
  return -depth * e * e * (3 - 2 * e);
}

/** In-flight stretch along the velocity: proportional to speed relative to the launch speed. */
export function flightStretch(speed: number, launchSpeed: number, max = 0.55): number {
  if (launchSpeed <= 1e-6) return 0;
  return max * Math.min(1, speed / launchSpeed);
}

/** Splat depth from the impact speed (capped so the volume-preserving map stays sane). */
export function splatSquash(impactSpeed: number, launchSpeed: number, mass = 1): number {
  const k = launchSpeed > 1e-6 ? Math.min(1.2, impactSpeed / launchSpeed) : 1;
  return -Math.min(0.55, (0.28 + 0.22 * k) * Math.pow(Math.max(0.3, mass), 0.25));
}
