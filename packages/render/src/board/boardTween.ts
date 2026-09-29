/**
 * Wall-clock tween runner for the board. Tweens are scheduled against `performance.now()` (seconds), so a
 * hitched frame jumps ahead instead of playing the move in slow motion: the timeline always finishes at the
 * scheduled time, whatever the frame rate. Easings include damped springs for pops, splats and settles.
 */

export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;
export const easeOut: Ease = (t) => 1 - (1 - t) * (1 - t);
export const easeIn: Ease = (t) => t * t;
export const easeInOut: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic: Ease = (t) => t * t * t;
export const easeOutBack: Ease = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Normalised damped spring 0 → 1: `1 − e^(−ζωt)·(cos(ωd t) + ζ/√(1−ζ²)·sin(ωd t))`. With ζω ≥ 6 the
 * response has settled at t = 1 (error < 0.3 %); lower ζ = livelier overshoot.
 */
export function springEase(zeta = 0.5, omega = 14): Ease {
  const z = Math.min(0.999, Math.max(0.05, zeta));
  const wd = omega * Math.sqrt(1 - z * z);
  const k = z / Math.sqrt(1 - z * z);
  const settle = 1 - Math.exp(-z * omega) * (Math.cos(wd) + k * Math.sin(wd));
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const v = 1 - Math.exp(-z * omega * t) * (Math.cos(wd * t) + k * Math.sin(wd * t));
    return v / settle;
  };
}

/** Lively pop with one visible overshoot (plates, props, spawns). */
export const easeSpring: Ease = springEase(0.42, 15);
/** Soft settle without a second bounce (slides, dips). */
export const easeSpringSoft: Ease = springEase(0.72, 13);
/** Splat: 0 → 1 as "impact then rebound" — use with `1 − v` for a compression curve. */
export const easeSplat: Ease = (t) => {
  const s = Math.sin(Math.PI * Math.min(1, t * 1.15));
  return s * s * Math.exp(-2.2 * t);
};

export interface TweenOptions {
  delay?: number;
  ease?: Ease;
  /** Called once when the tween reaches t = 1. */
  done?: () => void;
  /** Group tag: `cancel(tag)` removes every tween with that tag. */
  tag?: string;
}

interface ActiveTween {
  start: number;
  duration: number;
  ease: Ease;
  apply: (t: number) => void;
  done: (() => void) | undefined;
  tag: string | undefined;
  finished: boolean;
}

const defaultClock = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

export class WallClockTweens {
  private list: ActiveTween[] = [];
  private now = 0;
  /** Playback speed per tag (`hurry`): tweens added later under the tag run at the same speed. */
  private readonly speed = new Map<string, number>();

  constructor(private readonly clock: () => number = defaultClock) {
    this.now = clock();
  }

  get active(): number {
    return this.list.length;
  }

  /** Current wall-clock time in seconds (as of the last `update`). */
  get time(): number {
    return this.now;
  }

  /** Latest scheduled end time among the pending tweens (seconds from now). */
  get remaining(): number {
    let end = this.now;
    for (const t of this.list) end = Math.max(end, t.start + t.duration);
    return end - this.now;
  }

  /** Adds a tween starting at `delay` seconds from now; `apply` receives the eased 0..1 value (exactly 1 at the end). */
  add(duration: number, apply: (t: number) => void, opts: TweenOptions = {}): void {
    const k = opts.tag ? (this.speed.get(opts.tag) ?? 1) : 1;
    this.list.push({
      start: this.clock() + (opts.delay ?? 0) / k,
      duration: Math.max(1e-6, duration / k),
      ease: opts.ease ?? easeInOut,
      apply,
      done: opts.done,
      tag: opts.tag,
      finished: false,
    });
  }

  /** A pure delay (callback after `seconds`). */
  after(seconds: number, fn: () => void, tag?: string): void {
    this.add(0.0001, () => undefined, { delay: seconds, done: fn, ...(tag ? { tag } : {}) });
  }

  cancel(tag: string): void {
    this.list = this.list.filter((t) => t.tag !== tag);
    this.speed.delete(tag);
  }

  /**
   * Plays the rest of every tween with `tag` `factor` × faster (pending delays shrink too, progress is kept),
   * and so do tweens added under the tag afterwards — a queued swipe hurries the running move instead of
   * cutting it.
   */
  hurry(tag: string, factor: number): void {
    const now = this.clock();
    const prev = this.speed.get(tag) ?? 1;
    const k = Math.max(1, factor / prev);
    if (k <= 1.0001) return;
    this.speed.set(tag, prev * k);
    for (const tw of this.list) {
      if (tw.tag !== tag || tw.finished) continue;
      if (tw.start >= now) {
        tw.start = now + (tw.start - now) / k;
        tw.duration /= k;
      } else {
        const p = Math.min(1, (now - tw.start) / tw.duration);
        tw.duration /= k;
        tw.start = now - p * tw.duration;
      }
    }
  }

  /** Current speed factor of a tag (1 = normal). */
  speedOf(tag: string): number {
    return this.speed.get(tag) ?? 1;
  }

  /**
   * Fast-forwards every tween with `tag` to its end (apply(1) + done), started or not, in start order.
   * `done` callbacks may schedule more tagged tweens; those are finished too (bounded passes).
   */
  finish(tag: string): void {
    this.speed.set(tag, 1e6);
    for (let pass = 0; pass < 8; pass++) {
      const batch = this.list.filter((t) => t.tag === tag && !t.finished).sort((a, b) => a.start - b.start);
      if (batch.length === 0) return;
      this.list = this.list.filter((t) => t.tag !== tag);
      for (const tw of batch) {
        tw.finished = true;
        tw.apply(tw.ease(1));
        tw.done?.();
      }
    }
    this.speed.delete(tag);
  }

  clear(): void {
    this.list = [];
    this.speed.clear();
  }

  /** Advances to the current wall-clock time; `done` callbacks may schedule new tweens. */
  update(): void {
    this.now = this.clock();
    if (this.list.length === 0) return;
    const snapshot = this.list;
    for (const tw of snapshot) {
      if (tw.finished) continue;
      const local = this.now - tw.start;
      if (local < 0) continue;
      const t = Math.min(1, local / tw.duration);
      tw.apply(tw.ease(t));
      if (t >= 1) {
        tw.finished = true;
        tw.done?.();
      }
    }
    this.list = this.list.filter((t) => !t.finished);
  }
}

/** Walk: starts at a third of the cruise speed, peaks mid-way, arrives softly. */
export const easeWalk: Ease = (t) => 0.3 * t + 0.7 * t * t * (3 - 2 * t);

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
