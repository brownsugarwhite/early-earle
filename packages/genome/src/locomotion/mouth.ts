/**
 * Mouth driver: the opening of a creature's mouth (the ink crescent the render side traces onto the body,
 * the REX's lower jaw, a duck's bill) as a small deterministic animation state. Actions: open / close,
 * chew, roar, yawn, devour (snap wide open, bite shut, gulp) and gape (held open, for flights toward
 * prey). The opening follows a critically damped spring toward the action's envelope, so every action
 * blends into the next; `bite` reports the frame in which a snap closes (for splash / swallow timing).
 */

export type MouthAction = 'idle' | 'open' | 'chew' | 'roar' | 'yawn' | 'devour' | 'gape';

export interface MouthSample {
  /** 0..1 opening. */
  open: number;
  /** 0 = wide crescent (grin, bite), 1 = round O (yawn, roar). */
  round: number;
  /** 0..1 how far the eyes squeeze shut (yawn, the bite of a devour). */
  squint: number;
  /** True in the frame a snap closes (devour, chew bites). */
  bite: boolean;
  action: MouthAction;
}

interface Envelope {
  action: MouthAction;
  t: number;
  dur: number;
  amount: number;
  count: number;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (u: number): number => {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
};

/** Envelope durations (s) at tempo 1; `timeScale` stretches them (weightier creatures chew slower). */
export const MOUTH_TIMING = {
  roar: 1.25,
  yawn: 2.2,
  devour: 0.95,
  chewBite: 0.34,
} as const;

export class MouthDriver {
  private env: Envelope | null = null;
  private value = 0;
  private vel = 0;
  private round = 0;
  private squint = 0;
  private lastTarget = 0;
  private hold = 0;
  /** Duration multiplier (mass / tempo of the creature). */
  timeScale = 1;
  private readonly out: MouthSample = { open: 0, round: 0, squint: 0, bite: false, action: 'idle' };

  get sample(): MouthSample {
    return this.out;
  }

  get action(): MouthAction {
    return this.env?.action ?? (this.hold > 0 ? 'open' : 'idle');
  }

  /** Opens to `amount` (0..1) and holds it (until `close` or another action). */
  open(amount = 1): void {
    this.env = null;
    this.hold = clamp01(amount);
  }

  close(): void {
    this.env = null;
    this.hold = 0;
  }

  /** Sets the opening immediately (frozen poses in the lab sheet). */
  set(amount: number, round = 0): void {
    this.env = null;
    this.hold = clamp01(amount);
    this.value = this.hold;
    this.vel = 0;
    this.round = clamp01(round);
  }

  chew(times = 3): void {
    this.env = { action: 'chew', t: 0, dur: MOUTH_TIMING.chewBite * times * this.timeScale, amount: 0.45, count: times };
  }

  roar(): void {
    this.env = { action: 'roar', t: 0, dur: MOUTH_TIMING.roar * this.timeScale, amount: 1, count: 1 };
  }

  yawn(): void {
    this.env = { action: 'yawn', t: 0, dur: MOUTH_TIMING.yawn * this.timeScale, amount: 0.95, count: 1 };
  }

  devour(): void {
    this.env = { action: 'devour', t: 0, dur: MOUTH_TIMING.devour * this.timeScale, amount: 1, count: 1 };
  }

  /** Held wide opening that tracks `amount` every frame (flights toward prey, the leap to the camera). */
  gape(amount: number): void {
    this.env = null;
    this.hold = clamp01(amount);
  }

  /** Advances the driver; returns the current sample (the same object every frame). */
  step(dt: number): MouthSample {
    const out = this.out;
    out.bite = false;
    let target = this.hold;
    let roundT = 0;
    let squintT = 0;
    let stiff = 38;
    const e = this.env;
    if (e) {
      const prevT = e.t;
      e.t += dt;
      const u = e.t / Math.max(1e-3, e.dur);
      switch (e.action) {
        case 'chew': {
          // Rhythmic small bites: open-close per bite, each close a `bite`.
          const per = e.dur / e.count;
          const ph = (e.t % per) / per;
          target = e.amount * Math.sin(Math.PI * Math.min(1, ph * 1.25));
          if (Math.floor(prevT / per) !== Math.floor(e.t / per) && e.t < e.dur) out.bite = true;
          stiff = 60;
          break;
        }
        case 'roar': {
          // Short wind-up, wide open with a tremble, slow close.
          const open = smooth((u - 0.06) / 0.16) * (1 - smooth((u - 0.78) / 0.22));
          target = e.amount * open * (1 + 0.06 * Math.sin(e.t * 55) * open);
          roundT = 0.55 * open;
          stiff = 50;
          break;
        }
        case 'yawn': {
          // Slow open, a long hold with the eyes shut, slow close.
          const open = smooth(u / 0.4) * (1 - smooth((u - 0.7) / 0.3));
          target = e.amount * open;
          roundT = 0.9 * open;
          squintT = smooth(u / 0.3) * (1 - smooth((u - 0.8) / 0.2));
          stiff = 22;
          break;
        }
        case 'devour': {
          // Snap wide open (0–15 %), hold (–40 %), bite shut fast (–48 %), then a gulp (closed).
          const open = smooth(u / 0.15) * (1 - smooth((u - 0.4) / 0.08));
          target = e.amount * open;
          squintT = smooth((u - 0.38) / 0.1) * (1 - smooth((u - 0.7) / 0.2));
          if (prevT / e.dur < 0.44 && u >= 0.44) out.bite = true;
          stiff = 70;
          break;
        }
        default:
          break;
      }
      if (e.t >= e.dur) this.env = null;
    }
    // Critically damped spring toward the target (fast snaps, soft settles).
    const w = stiff;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.vel += (-w * w * (this.value - target) - 2 * w * this.vel) * h;
      this.value += this.vel * h;
    }
    if (this.value < 1e-4 && target === 0) {
      this.value = 0;
      this.vel = 0;
    }
    const kr = 1 - Math.exp(-dt * 10);
    this.round += (roundT - this.round) * kr;
    this.squint += (squintT - this.squint) * kr;
    this.lastTarget = target;
    out.open = clamp01(this.value);
    out.round = this.round;
    out.squint = this.squint;
    out.action = this.action;
    return out;
  }

  /** The envelope target of the last step (tests). */
  get targetOpen(): number {
    return this.lastTarget;
  }
}
