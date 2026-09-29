import * as Genome from '@ee/genome';
import type { BodyType, Vec3 } from '@ee/genome';

/**
 * Merge moves of the Creatures v3 locomotion (`@ee/genome` moves: leap toward the camera and devour, coil and
 * swallow, stomp, splash, devour) resolved by feature detection, so the board keeps its own choreography
 * when a build does not ship them. The board samples a move with its own clock: a piecewise-linear time warp
 * through the move's key events (launch, contact, swallow) fits every move into the board's merge budget
 * while keeping its shape (anticipation, flight, the bite).
 */

export interface MovePartnerLike {
  x: number;
  z: number;
  lift: number;
  scale: number;
  squash: number;
  visible: boolean;
}

export interface MoveSampleLike {
  x: number;
  z: number;
  lift: number;
  yaw: number;
  pitch: number;
  roll: number;
  squashAxis: Vec3;
  squash: number;
  crouch: number;
  mouth: number;
  coil: number;
  bulge: number;
  trumpet: number;
  jiggle: number;
  airborne: boolean;
  partner: MovePartnerLike | null;
}

export interface MoveEventLike {
  type: string;
  t: number;
  strength: number;
}

export interface MergeMoveLike {
  readonly kind: string;
  readonly duration: number;
  readonly end: readonly [number, number];
  sample(t: number, out?: MoveSampleLike): MoveSampleLike;
  timeOf(type: string): number;
  forEachEvent(t0: number, t1: number, cb: (e: MoveEventLike) => void): void;
}

export interface MoveContextLike {
  from: readonly [number, number];
  yaw: number;
  scale: number;
  mass: number;
  bounce?: number;
  bodyType?: BodyType;
  timeScale?: number;
  gravity?: number;
}

type Fn = (...args: unknown[]) => unknown;
const lib = Genome as unknown as Record<string, unknown>;
const fn = (name: string): Fn | null => (typeof lib[name] === 'function' ? (lib[name] as Fn) : null);

/** The merge flourish of the mover's body type (legged creatures leap toward the camera and devour). */
export function mergeMoveKind(body: BodyType): 'leapToCamera' | 'coilSwallow' | 'stompMerge' | 'splashMerge' {
  switch (body) {
    case 'snake':
      return 'coilSwallow';
    case 'heavy':
      return 'stompMerge';
    case 'quadruped':
    case 'biped':
      return 'leapToCamera';
    default:
      return 'splashMerge';
  }
}

/** Builds the genome's merge move of `kind`, or null when this build has no such move. */
export function genomeMergeMove(kind: string, ctx: MoveContextLike, partner: { x: number; z: number; radius: number }, opts: { height?: number; camera?: Vec3; thickness?: number } = {}): MergeMoveLike | null {
  try {
    switch (kind) {
      case 'leapToCamera': {
        const f = fn('leapToCamera');
        return f ? (f(ctx, opts.height ?? ctx.scale * 4, { camera: opts.camera, partner }) as MergeMoveLike) : null;
      }
      case 'coilSwallow': {
        const f = fn('coilSwallow');
        return f ? (f(ctx, partner, opts.thickness) as MergeMoveLike) : null;
      }
      case 'stompMerge': {
        const f = fn('stompMerge');
        return f ? (f(ctx, partner) as MergeMoveLike) : null;
      }
      case 'splashMerge': {
        const f = fn('splashMerge');
        return f ? (f(ctx, partner) as MergeMoveLike) : null;
      }
      case 'devour': {
        const f = fn('devour');
        return f ? (f(ctx, partner) as MergeMoveLike) : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** Board durations (s) per segment: anticipation → launch, launch → contact, contact → swallow. */
const SEGMENTS: Record<string, readonly [number, number, number]> = {
  leapToCamera: [0.11, 0.36, 0.15],
  coilSwallow: [0.14, 0.3, 0.32],
  stompMerge: [0.17, 0.09, 0.16],
  splashMerge: [0.07, 0.13, 0.2],
  devour: [0.16, 0.08, 0.14],
};

/**
 * Time warp board → move: key times (launch, contact, swallow) land on the board's segment budget; after
 * the swallow the move runs at `tailSpeed` × real time. Returns the warp and the board time of the swallow.
 */
export function mergeWarp(move: MergeMoveLike, tailSpeed = 1): { warp: (tb: number) => number; swallowAt: number; contactAt: number } {
  const seg = SEGMENTS[move.kind] ?? [0.12, 0.2, 0.16];
  const T = move.duration;
  let contact = move.timeOf('contact');
  if (contact < 0) contact = move.timeOf('splash');
  if (contact < 0) contact = T * 0.5;
  let launch = move.kind === 'coilSwallow' ? move.timeOf('coil') : move.timeOf('launch');
  if (launch < 0 || launch > contact) launch = contact * 0.4;
  let swallow = move.timeOf('swallow');
  if (swallow < 0 || swallow < contact) swallow = Math.min(T, contact + 0.3);
  const bm: number[] = [0, seg[0], seg[0] + seg[1], seg[0] + seg[1] + seg[2]];
  const mt: number[] = [0, launch, contact, swallow];
  const warp = (tb: number): number => {
    if (tb <= 0) return 0;
    for (let i = 1; i < bm.length; i++) {
      if (tb <= bm[i]!) {
        const a = bm[i - 1]!;
        const b = bm[i]!;
        const u = b > a ? (tb - a) / (b - a) : 1;
        return mt[i - 1]! + (mt[i]! - mt[i - 1]!) * u;
      }
    }
    return Math.min(T, swallow + (tb - bm[3]!) * tailSpeed);
  };
  return { warp, swallowAt: bm[3]!, contactAt: bm[2]! };
}

/**
 * Turn profile 0 → 1 of a facing turn (Creatures v3: a small counter-turn first, ≈ 10 % overshoot, settle);
 * a damped spring when this build has none.
 */
export function turnCurve(u: number, delta: number): number {
  const f = fn('turnProfile');
  if (f) return f(u, delta) as number;
  const x = Math.min(1, Math.max(0, u));
  return 1 - Math.exp(-6 * x) * Math.cos(7.5 * x) * (1 - x);
}
