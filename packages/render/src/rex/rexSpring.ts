/**
 * Deterministic helpers for REX's procedural animation: a damped spring integrated in fixed sub-steps
 * (same trajectory at 30, 60 or 120 fps), a seeded PRNG and small easing/shape functions.
 */

/** Fixed integration step of every REX spring (seconds of animation time). */
export const REX_STEP = 1 / 240;

/** Damped harmonic spring toward `target` (frequency in Hz, damping ratio ζ: < 1 overshoots). */
export class Spring {
  value: number;
  velocity = 0;
  target: number;

  constructor(
    initial = 0,
    public frequency = 4,
    public damping = 0.6,
  ) {
    this.value = initial;
    this.target = initial;
  }

  /** One fixed step (`REX_STEP`). */
  step(h = REX_STEP): number {
    const w = 2 * Math.PI * this.frequency;
    const k = w * w;
    const c = 2 * this.damping * w;
    // Semi-implicit Euler: stable for w·h < 2 (≈ 76 Hz at 240 steps/s).
    this.velocity += (-k * (this.value - this.target) - c * this.velocity) * h;
    this.value += this.velocity * h;
    return this.value;
  }

  snap(v: number): void {
    this.value = v;
    this.target = v;
    this.velocity = 0;
  }

  /** Adds an instantaneous velocity kick (landings, jabs). */
  kick(v: number): void {
    this.velocity += v;
  }
}

/** mulberry32: small, fast, deterministic. Returns [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number): number => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** 0 → 1 over [a, b] (smoothstep). */
export const ramp = (t: number, a: number, b: number): number => smooth((t - a) / (b - a));
/** Bump: 0 at a, 1 in [b, c], 0 at d (smooth edges). */
export const window4 = (t: number, a: number, b: number, c: number, d: number): number => (t <= a || t >= d ? 0 : t < b ? ramp(t, a, b) : t <= c ? 1 : 1 - ramp(t, c, d));
/** Parabolic hop: 0 at a and b, 1 at the midpoint. */
export const hop = (t: number, a: number, b: number): number => {
  if (t <= a || t >= b) return 0;
  const x = (t - a) / (b - a);
  return 4 * x * (1 - x);
};
export const easeOutBack = (x: number, s = 1.7): number => {
  const t = clamp01(x) - 1;
  return 1 + (s + 1) * t * t * t + s * t * t;
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
