/** Minimal tween runner for the flow transitions (seconds, not ms). One continuous take = chained tweens. */

export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;
export const easeOut: Ease = (t) => 1 - (1 - t) * (1 - t);
export const easeIn: Ease = (t) => t * t;
export const easeInOut: Ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/** Smoother acceleration for camera moves (quintic in/out). */
export const easeInOutQuint: Ease = (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2);
/** Overshoot back-out for pops. */
export const easeOutBack: Ease = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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
  elapsed: number;
  delay: number;
  duration: number;
  ease: Ease;
  apply: (t: number) => void;
  done: (() => void) | undefined;
  tag: string | undefined;
  finished: boolean;
  started: boolean;
}

export class Tweens {
  private list: ActiveTween[] = [];

  get active(): number {
    return this.list.length;
  }

  /** Adds a tween; `apply` receives the eased 0..1 value every frame (and exactly 1 at the end). */
  add(duration: number, apply: (t: number) => void, opts: TweenOptions = {}): void {
    this.list.push({
      elapsed: 0,
      delay: opts.delay ?? 0,
      duration: Math.max(1e-6, duration),
      ease: opts.ease ?? easeInOut,
      apply,
      done: opts.done,
      tag: opts.tag,
      finished: false,
      started: false,
    });
  }

  /** A pure delay (callback after `seconds`). */
  after(seconds: number, fn: () => void, tag?: string): void {
    this.add(0.0001, () => undefined, { delay: seconds, done: fn, ...(tag ? { tag } : {}) });
  }

  cancel(tag: string): void {
    this.list = this.list.filter((t) => t.tag !== tag);
  }

  clear(): void {
    this.list = [];
  }

  update(dt: number): void {
    if (this.list.length === 0) return;
    // Iterate over a snapshot: `done` callbacks may add new tweens.
    const snapshot = this.list;
    for (const tw of snapshot) {
      if (tw.finished) continue;
      tw.elapsed += dt;
      const local = tw.elapsed - tw.delay;
      if (local < 0) continue;
      tw.started = true;
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

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
