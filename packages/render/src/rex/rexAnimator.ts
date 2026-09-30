import { REX_STEP, Spring, clamp01, createRng, easeOutBack, hop, lerp, ramp, window4 } from './rexSpring';
import { jawAt, syllableSchedule, type SyllableSchedule } from './rexSyllables';

/**
 * REX's procedural animation: an always-on idle (breath, sway, blinks, glances, lazy tail), one body action at
 * a time (cheer, despair, point, peek, dizzy, celebrate, hide) cross-faded over 0.18 s, a talk overlay that
 * flaps the jaw on syllables, and springs on head, neck, arms, tail, jaw, squash and the rise out of hiding
 * for overlap and follow-through. Everything runs on the animation clock (dt × timeScale) in fixed 1/240 s
 * steps with a seeded PRNG: the same calls give the same motion on every device and frame rate.
 */

export type RexActionKind = 'idle' | 'cheer' | 'despair' | 'point' | 'peek' | 'dizzy' | 'celebrate' | 'hide';

export interface RexArmPose {
  /** Swing up around the shoulder (rad, 0 = rest, ≈ 2.3 = straight up). */
  raise: number;
  /** Lift sideways/outward (rad). */
  spread: number;
  /** Swing inward (+) / outward (−) horizontally (rad). */
  twist: number;
  /** Elbow flexion (rad). */
  bend: number;
  /** Exact aim (REX root space) blended over the swing by `aimW` (pointing). */
  aim: [number, number, number];
  aimW: number;
}

export interface RexPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  /** Log squash: + taller/thinner, − squat (volume-preserving, pivot at the feet). */
  squash: number;
  hipsPitch: number;
  hipsRoll: number;
  chestPitch: number;
  chestYaw: number;
  chestRoll: number;
  breathe: number;
  neckPitch: number;
  neckYaw: number;
  neckRoll: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  jaw: number;
  armL: RexArmPose;
  armR: RexArmPose;
  legL: number;
  legR: number;
  footL: number;
  footR: number;
  tailYaw: [number, number, number, number];
  tailPitch: [number, number, number, number];
  blink: number;
  squint: number;
  worry: number;
  lookX: number;
  lookY: number;
  spinRate: number;
  mirrorSpin: number;
  halo: number;
  sparkle: number;
  sweat: number;
  /** 0 = fully below the rim / ground, 1 = standing up. */
  emerge: number;
}

export function createRexPose(): RexPose {
  const arm = (): RexArmPose => ({ raise: 0, spread: 0, twist: 0, bend: 0, aim: [0, 0, 1], aimW: 0 });
  return {
    x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, squash: 0,
    hipsPitch: 0, hipsRoll: 0, chestPitch: 0, chestYaw: 0, chestRoll: 0, breathe: 0,
    neckPitch: 0, neckYaw: 0, neckRoll: 0, headPitch: 0, headYaw: 0, headRoll: 0, jaw: 0,
    armL: arm(), armR: arm(), legL: 0, legR: 0, footL: 0, footR: 0,
    tailYaw: [0, 0, 0, 0], tailPitch: [0, 0, 0, 0],
    blink: 0, squint: 0, worry: 0, lookX: 0, lookY: 0, spinRate: 0, mirrorSpin: 0,
    halo: 0, sparkle: 0, sweat: 0, emerge: 1,
  };
}

function resetPose(p: RexPose): void {
  p.x = p.y = p.z = p.yaw = p.pitch = p.roll = p.squash = 0;
  p.hipsPitch = p.hipsRoll = p.chestPitch = p.chestYaw = p.chestRoll = p.breathe = 0;
  p.neckPitch = p.neckYaw = p.neckRoll = p.headPitch = p.headYaw = p.headRoll = p.jaw = 0;
  for (const a of [p.armL, p.armR]) {
    a.raise = a.spread = a.twist = a.bend = 0;
    a.aimW = 0;
  }
  p.legL = p.legR = p.footL = p.footR = 0;
  for (let i = 0; i < 4; i++) p.tailYaw[i] = p.tailPitch[i] = 0;
  p.blink = p.squint = p.worry = p.lookX = p.lookY = p.spinRate = p.mirrorSpin = 0;
  p.halo = p.sparkle = p.sweat = 0;
  p.emerge = 1;
}

/** Direction in REX's root space (x = his left, y = up, z = forward). */
export type RexDir = [number, number, number];

interface Action {
  kind: RexActionKind;
  t: number;
  duration: number;
  /** Animation time at which a newer action started to replace this one (cross-fade), or −1. */
  fadeFrom: number;
  strength: number;
  aim: RexDir;
  /** Peek from hiding (true) or a quick duck-and-pop (false). */
  fromHidden: boolean;
}

interface Talk {
  schedule: SyllableSchedule;
  t: number;
}

const FADE_S = 0.18;
const TAU = Math.PI * 2;
/** Idle spiral spin (rad/s): REX is always a little dizzy from the gases. */
const IDLE_SPIN = 0.8;
/**
 * Head "face" direction in head space: between the snout (+z) and the eye plane on top — this is what points
 * at the camera when REX looks at the player (elevation ≈ 22°).
 */
const FACE_ELEVATION = 0.38;

const DURATION: Record<Exclude<RexActionKind, 'idle'>, number> = {
  cheer: 1.3,
  despair: 2.6,
  point: 2.2,
  peek: 1.5,
  dizzy: 3.4,
  celebrate: 3.0,
  hide: 0.62,
};

export interface RexAnimatorOptions {
  seed?: number;
  /** Start below the rim (the first `peek()` brings REX up). */
  hidden?: boolean;
}

export class RexAnimator {
  /** Animation speed multiplier (1 = design speed). */
  timeScale = 1;
  /** Where the player is (REX root space): the head and eyes turn toward it when nothing else leads. */
  lookTarget: RexDir | null = [0, 0, 1];
  /** Final pose after springs (read by the rig). */
  readonly pose = createRexPose();
  /** Accumulated spiral angles (rad). */
  spin = 0;
  haloAngle = 0;
  sparkleAngle = 0;

  private readonly target = createRexPose();
  private readonly rng: () => number;
  private time = 0;
  private acc = 0;
  private actions: Action[] = [];
  private talkState: Talk | null = null;
  private nextBlink = 1.2;
  private blinkT = -1;
  private doubleBlink = false;
  private nextGlance = 2.5;
  private glanceX = 0;
  private glanceY = 0;
  private hiddenState: boolean;
  private readonly springs: Record<string, Spring> = {};
  private readonly armSprings: Record<'L' | 'R', Record<'raise' | 'spread' | 'twist' | 'bend', Spring>>;
  private readonly tailYawS: Spring[];
  private readonly tailPitchS: Spring[];
  private readonly emergeS: Spring;
  private prevYaw = 0;
  private yawVel = 0;

  constructor(opts: RexAnimatorOptions = {}) {
    this.rng = createRng(opts.seed ?? 7);
    this.hiddenState = opts.hidden ?? false;
    const mk = (f: number, z: number, v = 0): Spring => new Spring(v, f, z);
    for (const k of ['headPitch', 'headYaw', 'headRoll']) this.springs[k] = mk(4.6, 0.52);
    for (const k of ['neckPitch', 'neckYaw', 'neckRoll']) this.springs[k] = mk(6, 0.62);
    for (const k of ['chestPitch', 'chestYaw', 'chestRoll']) this.springs[k] = mk(7, 0.7);
    this.springs.jaw = mk(15, 0.7);
    this.springs.squash = mk(6.5, 0.36);
    this.springs.yaw = mk(4.2, 0.62);
    this.springs.breathe = mk(8, 0.8);
    const armSet = (): Record<'raise' | 'spread' | 'twist' | 'bend', Spring> => ({ raise: mk(5.4, 0.48), spread: mk(5.4, 0.5), twist: mk(5.4, 0.55), bend: mk(7, 0.55) });
    this.armSprings = { L: armSet(), R: armSet() };
    this.tailYawS = [0, 1, 2, 3].map((i) => mk(3.4 - i * 0.35, 0.34));
    this.tailPitchS = [0, 1, 2, 3].map((i) => mk(3.6 - i * 0.35, 0.38));
    this.emergeS = mk(5.2, 0.42, this.hiddenState ? 0 : 1);
    this.pose.emerge = this.emergeS.value;
    // Settle every spring on the idle pose so the first frame does not snap.
    this.evaluate(0, this.target);
    this.snapSprings(this.target);
  }

  // ------------------------------------------------------------------------------------------ public API

  /** Current body action ('idle' when none plays). */
  get action(): RexActionKind {
    const live = this.actions.filter((a) => a.fadeFrom < 0);
    return live.length > 0 ? live[live.length - 1]!.kind : 'idle';
  }

  /** Below the rim (after `hide()`, before `peek()`). */
  get hidden(): boolean {
    return this.hiddenState;
  }

  /** Fully hidden: the rig may skip rendering. */
  get invisible(): boolean {
    return this.hiddenState && this.emergeS.value < 0.02 && this.actions.every((a) => a.kind === 'hide' || a.fadeFrom >= 0);
  }

  get talking(): boolean {
    return this.talkState !== null;
  }

  /** Seconds of animation time since creation. */
  get clock(): number {
    return this.time;
  }

  /** Flaps the jaw through the line's syllables (runs over any body action). Returns the duration (s). */
  talk(text: string): number {
    const schedule = syllableSchedule(text);
    this.talkState = { schedule, t: 0 };
    return schedule.duration / this.timeScale;
  }

  cheer(strength = 1): void {
    this.start('cheer', { strength: Math.max(1, Math.min(2.5, strength)) });
  }

  despair(): void {
    this.start('despair');
  }

  /** Points toward `dir` (REX root space) with the nearer arm; head and eyes follow. */
  point(dir: RexDir): void {
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    this.start('point', { aim: [dir[0] / l, dir[1] / l, dir[2] / l] });
  }

  /** Pops up from behind the rim (or ducks and pops when already up). */
  peek(): void {
    const fromHidden = this.hiddenState || this.emergeS.value < 0.5;
    this.hiddenState = false;
    this.start('peek', { fromHidden });
  }

  dizzy(): void {
    this.start('dizzy');
  }

  /** Zone-finale joy: hops, a pirouette, sparkles (intensity 2 = longer, two spins). */
  celebrate(intensity = 1): void {
    this.start('celebrate', { strength: intensity >= 2 ? 2 : 1 });
  }

  /** Ducks below the rim and stays there until `peek()`. */
  hide(): void {
    if (this.hiddenState && this.emergeS.value < 0.05) return;
    this.hiddenState = true;
    this.start('hide');
  }

  /** Instantly up (true) or down (false), without animation (re-mounts, lab resets). */
  setHidden(hidden: boolean): void {
    this.hiddenState = hidden;
    this.actions = [];
    this.emergeS.snap(hidden ? 0 : 1);
  }

  /** Back to idle at once (lab). */
  stop(): void {
    for (const a of this.actions) if (a.fadeFrom < 0) a.fadeFrom = this.time;
    this.talkState = null;
  }

  update(dt: number): void {
    this.acc += Math.max(0, Math.min(0.25, dt)) * this.timeScale;
    let steps = 0;
    while (this.acc >= REX_STEP && steps < 240) {
      this.acc -= REX_STEP;
      steps++;
      this.stepOnce();
    }
  }

  // ------------------------------------------------------------------------------------------ internals

  private start(kind: Exclude<RexActionKind, 'idle'>, opts: { strength?: number; aim?: RexDir; fromHidden?: boolean } = {}): void {
    for (const a of this.actions) if (a.fadeFrom < 0) a.fadeFrom = this.time;
    const strength = opts.strength ?? 1;
    let duration = DURATION[kind];
    if (kind === 'cheer' && strength > 1.4) duration += 0.45;
    if (kind === 'celebrate' && strength >= 2) duration = 4.3;
    if (kind === 'peek' && opts.fromHidden === false) duration = 0.75;
    this.actions.push({ kind, t: 0, duration, fadeFrom: -1, strength, aim: opts.aim ?? [0, 0, 1], fromHidden: opts.fromHidden ?? true });
    if (kind === 'hide') this.emergeS.velocity = 0;
  }

  private stepOnce(): void {
    const h = REX_STEP;
    this.time += h;
    for (const a of this.actions) a.t += h;
    // Drop finished and fully faded actions.
    this.actions = this.actions.filter((a) => a.t < a.duration && (a.fadeFrom < 0 || this.time - a.fadeFrom < FADE_S));
    if (this.talkState) {
      this.talkState.t += h;
      if (this.talkState.t > this.talkState.schedule.duration) this.talkState = null;
    }
    this.updateIdleSchedules();
    const tgt = this.target;
    this.evaluate(this.time, tgt);
    this.integrate(tgt, h);
  }

  private updateIdleSchedules(): void {
    const t = this.time;
    if (t >= this.nextBlink && this.blinkT < 0) {
      this.blinkT = 0;
      this.doubleBlink = this.rng() < 0.22;
      this.nextBlink = t + 2.2 + this.rng() * 3.2;
    }
    if (this.blinkT >= 0) {
      this.blinkT += REX_STEP;
      if (this.blinkT > (this.doubleBlink ? 0.42 : 0.17)) this.blinkT = -1;
    }
    if (t >= this.nextGlance) {
      const away = this.rng() < 0.55;
      this.glanceX = away ? (this.rng() * 2 - 1) * 0.7 : 0;
      this.glanceY = away ? (this.rng() * 2 - 1) * 0.35 : 0;
      this.nextGlance = t + 1.8 + this.rng() * 3.5;
    }
  }

  private blinkAmount(): number {
    const b = this.blinkT;
    if (b < 0) return 0;
    const one = (x: number): number => (x < 0 || x > 0.17 ? 0 : x < 0.06 ? x / 0.06 : x < 0.08 ? 1 : 1 - (x - 0.08) / 0.09);
    return Math.max(one(b), this.doubleBlink ? one(b - 0.24) : 0);
  }

  /** Target pose at animation time `T` (idle + actions + talk + look-at). */
  private evaluate(T: number, p: RexPose): void {
    resetPose(p);
    // ---- idle: breath, sway, lazy tail, arms hanging with a little life
    const breath = Math.sin(TAU * 0.3 * T);
    p.breathe += 0.032 * breath;
    p.y += 0.004 * breath;
    p.roll += 0.03 * Math.sin(TAU * 0.19 * T);
    p.hipsRoll -= 0.018 * Math.sin(TAU * 0.19 * T);
    p.yaw += 0.07 * Math.sin(TAU * 0.11 * T + 1.3);
    p.x += 0.006 * Math.sin(TAU * 0.19 * T + 0.5);
    p.headPitch += 0.035 * Math.sin(TAU * 0.3 * T - 0.9);
    p.headRoll += 0.05 * Math.sin(TAU * 0.16 * T + 2);
    for (let i = 0; i < 4; i++) {
      p.tailYaw[i] = 0.12 * (1 + 0.35 * i) * Math.sin(TAU * 0.42 * T - 0.7 * i);
      p.tailPitch[i] = 0.04 + 0.03 * Math.sin(TAU * 0.3 * T - 0.5 * i);
    }
    // Tiny T-rex arms held up in front of the chest, claws hanging.
    for (const [arm, ph] of [[p.armL, 0], [p.armR, 0.9]] as const) {
      arm.raise += 0.28 + 0.06 * Math.sin(TAU * 0.3 * T + ph);
      arm.bend += 0.85 + 0.08 * Math.sin(TAU * 0.3 * T + ph + 0.5);
      arm.spread += 0.12;
    }
    p.blink = this.blinkAmount();
    p.lookX += this.glanceX;
    p.lookY += this.glanceY;
    p.spinRate = IDLE_SPIN;
    let lookWeight = 1;
    let blinkSuppress = 0;

    // ---- body actions (cross-faded)
    for (const a of this.actions) {
      const fadeIn = ramp(a.t, 0, 0.12);
      const fadeOut = a.duration === Infinity ? 1 : 1 - ramp(a.t, a.duration - 0.28, a.duration);
      const cross = a.fadeFrom < 0 ? 1 : 1 - clamp01((this.time - a.fadeFrom) / FADE_S);
      const w = Math.min(fadeIn, fadeOut) * cross;
      if (w <= 0) continue;
      switch (a.kind) {
        case 'cheer':
          this.cheer_(a, w, p);
          break;
        case 'despair':
          blinkSuppress = Math.max(blinkSuppress, w * (1 - ramp(a.t, 0.3, 0.45)));
          this.despair_(a, w, p);
          break;
        case 'point':
          lookWeight = Math.min(lookWeight, 1 - w);
          this.point_(a, w, p);
          break;
        case 'peek':
          this.peek_(a, w, p);
          break;
        case 'dizzy':
          lookWeight = Math.min(lookWeight, 1 - w * 0.8);
          this.dizzy_(a, w, p);
          break;
        case 'celebrate':
          this.celebrate_(a, w, p);
          break;
        case 'hide':
          blinkSuppress = Math.max(blinkSuppress, w);
          this.hide_(a, w, p);
          break;
        default:
          break;
      }
    }

    // ---- emergence: hidden → 0, otherwise 1 unless an action drives it
    const drives = this.actions.some((a) => (a.kind === 'peek' || a.kind === 'hide') && a.fadeFrom < 0);
    if (!drives) p.emerge = this.hiddenState ? 0 : 1;

    // ---- talk overlay
    const tk = this.talkState;
    if (tk) {
      const s = tk.schedule;
      const j = jawAt(s, tk.t);
      p.jaw = Math.max(p.jaw, j * (s.exclaim ? 0.85 : 0.68));
      p.headPitch -= 0.08 * j;
      p.neckPitch -= 0.03 * j;
      const word = Math.floor(tk.t / 0.42);
      p.headRoll += 0.045 * (word % 2 === 0 ? 1 : -1) * ramp(tk.t, 0, 0.2) * (1 - ramp(tk.t, s.duration - 0.2, s.duration));
      p.chestPitch += 0.035 * ramp(tk.t, 0, 0.25) * (1 - ramp(tk.t, s.duration - 0.25, s.duration));
      if (s.exclaim) {
        p.y += 0.035 * hop(tk.t, 0.02, 0.28);
        p.armL.raise += 0.5 * window4(tk.t, 0, 0.1, 0.3, 0.5);
        p.armR.raise += 0.5 * window4(tk.t, 0, 0.1, 0.3, 0.5);
      }
      if (s.question) p.headRoll += 0.14 * ramp(tk.t, s.duration - 0.5, s.duration - 0.2);
      if (s.trailing) p.blink = Math.max(p.blink, 0.35 * ramp(tk.t, 0, 0.3));
      // A small hand gesture on longer lines.
      if (s.syllables.length > 5) p.armL.raise += 0.35 * window4(tk.t, 0.2, 0.4, 0.8, 1.1);
    }

    // ---- look at the player (head, neck and eyes), yielding to actions that lead the head themselves
    const lt = this.lookTarget;
    if (lt && lookWeight > 0) {
      const yaw = Math.max(-1.1, Math.min(1.1, Math.atan2(lt[0], lt[2])));
      const elev = Math.max(-0.5, Math.min(1.2, Math.atan2(lt[1], Math.hypot(lt[0], lt[2]))));
      const w = lookWeight;
      p.neckYaw += 0.35 * yaw * w;
      p.headYaw += 0.45 * yaw * w;
      const pitch = FACE_ELEVATION - elev;
      p.neckPitch += 0.35 * pitch * w;
      p.headPitch += 0.55 * pitch * w;
      p.chestPitch -= 0.12 * Math.max(0, elev - 0.3) * w;
      p.lookX += 0.25 * yaw * w;
    }
    p.blink = Math.max(p.blink * (1 - blinkSuppress), 0);
    p.lookX = Math.max(-1, Math.min(1, p.lookX));
    p.lookY = Math.max(-1, Math.min(1, p.lookY));
  }

  // ---- actions (each adds its layer × w; t = action time) ----------------------------------------

  private cheer_(a: Action, w: number, p: RexPose): void {
    const t = a.t;
    const s = a.strength;
    const D = a.duration;
    const crouch = window4(t, 0, 0.1, 0.14, 0.24);
    p.squash -= 0.15 * crouch * w;
    p.y -= 0.02 * crouch * w;
    p.headPitch += 0.12 * crouch * w;
    const jump = hop(t, 0.2, 0.62);
    p.y += 0.2 * Math.min(1.6, s) * jump * w;
    p.squash += 0.14 * window4(t, 0.18, 0.22, 0.3, 0.46) * w;
    p.squash -= 0.17 * window4(t, 0.6, 0.64, 0.68, 0.84) * w;
    p.legL -= 0.45 * jump * w;
    p.legR -= 0.4 * jump * w;
    p.footL += 0.6 * jump * w;
    p.footR += 0.6 * jump * w;
    for (let i = 0; i < 4; i++) p.tailPitch[i]! -= 0.32 * jump * w;
    const up = window4(t, 0.14, 0.3, D - 0.36, D - 0.05);
    const wave = window4(t, 0.64, 0.8, D - 0.3, D - 0.05);
    const sw = Math.sin(TAU * 3.2 * t);
    p.armL.raise += (1.85 * up + 0.35 * sw * wave) * w;
    p.armR.raise += (1.85 * up - 0.35 * sw * wave) * w;
    p.armL.spread += 0.95 * up * w;
    p.armR.spread += 0.95 * up * w;
    p.armL.bend -= 0.4 * up * w;
    p.armR.bend -= 0.4 * up * w;
    p.jaw = Math.max(p.jaw, 0.9 * window4(t, 0.2, 0.3, 0.72, 0.98) * w);
    p.squint = Math.max(p.squint, window4(t, 0.2, 0.32, D - 0.25, D) * w);
    p.spinRate += 9 * window4(t, 0.15, 0.25, D - 0.3, D) * w;
    p.headPitch -= 0.1 * window4(t, 0.18, 0.3, 0.7, 0.95) * w;
    if (s > 1.4) {
      p.y += 0.1 * s * hop(t, 0.92, 1.28) * w;
      p.squash -= 0.1 * window4(t, 1.26, 1.3, 1.34, 1.45) * w;
      p.sparkle = Math.max(p.sparkle, window4(t, 0.3, 0.45, D - 0.3, D) * w);
    }
  }

  private despair_(a: Action, w: number, p: RexPose): void {
    const t = a.t;
    // "Oh no": head jerks back, eyes wide and worried, jaw drops, tiny arms fly up.
    const gasp = window4(t, 0, 0.08, 0.3, 0.45);
    p.headPitch -= 0.2 * gasp * w;
    p.jaw = Math.max(p.jaw, 0.5 * gasp * w);
    p.armL.raise += 0.8 * gasp * w;
    p.armR.raise += 0.8 * gasp * w;
    p.armL.spread += 0.6 * gasp * w;
    p.armR.spread += 0.6 * gasp * w;
    // Claws to the cheeks (the arms are far too short for a real facepalm — the head comes down to meet them),
    // the head droops and shakes slowly: "no, no, no".
    const hold = window4(t, 0.35, 0.62, 1.95, 2.35);
    for (const arm of [p.armL, p.armR]) {
      arm.raise += 1.35 * hold * w;
      arm.twist += 0.75 * hold * w;
      arm.bend += 1.25 * hold * w;
      arm.spread += 0.1 * hold * w;
    }
    p.headPitch += 0.3 * hold * w;
    p.neckPitch += 0.2 * hold * w;
    p.chestPitch += 0.2 * hold * w;
    p.headRoll += 0.13 * Math.sin(TAU * 0.9 * (t - 0.6)) * window4(t, 0.6, 0.8, 1.9, 2.3) * w;
    p.blink = Math.max(p.blink, 0.5 * hold * w);
    // The comic sigh: a big inhale, then a long deflating exhale that sinks the whole body.
    const inhale = window4(t, 0.9, 1.2, 1.25, 1.45);
    const exhale = window4(t, 1.35, 1.55, 1.95, 2.3);
    p.breathe += (0.11 * inhale - 0.07 * exhale) * w;
    p.headPitch -= 0.1 * inhale * w;
    p.squash -= 0.1 * exhale * w;
    p.y -= 0.02 * exhale * w;
    p.jaw = Math.max(p.jaw, 0.3 * exhale * w);
    for (let i = 0; i < 4; i++) p.tailPitch[i]! += 0.18 * (inhale * 0.3 + exhale) * w;
    p.worry = Math.max(p.worry, window4(t, 0.05, 0.2, 2.15, 2.55) * w);
    p.sweat = Math.max(p.sweat, window4(t, 0.4, 0.6, 2.05, 2.45) * w);
    p.spinRate -= 0.5 * w;
  }

  private point_(a: Action, w: number, p: RexPose): void {
    const t = a.t;
    const D = a.duration;
    const [dx, dy, dz] = a.aim;
    const aimYaw = Math.max(-1.35, Math.min(1.35, Math.atan2(dx, dz)));
    const aimPitch = Math.max(-0.6, Math.min(0.9, Math.asin(Math.max(-1, Math.min(1, dy)))));
    const left = aimYaw >= 0;
    // The eyes go all the way, the head only part of it (the big jaw must not hide the pointing arm).
    const look = window4(t, 0, 0.15, D - 0.4, D);
    p.lookX += (left ? 0.95 : -0.95) * look * w;
    p.lookY += 0.5 * aimPitch * look * w;
    p.neckYaw += 0.12 * aimYaw * look * w;
    p.headYaw += 0.18 * aimYaw * look * w;
    p.headPitch += (FACE_ELEVATION * 0.6 - 0.45 * aimPitch) * look * w;
    const turn = window4(t, 0.12, 0.35, D - 0.4, D - 0.05);
    const bodyShare = 0.38;
    p.yaw += 0.18 * aimYaw * turn * w;
    p.chestYaw += 0.2 * aimYaw * turn * w;
    p.roll -= 0.06 * Math.sign(aimYaw) * turn * w;
    p.squash -= 0.06 * window4(t, 0, 0.08, 0.12, 0.22) * w;
    // The pointing arm swings out and up beside the jaw, straight; two little jabs for emphasis.
    const ext = window4(t, 0.2, 0.36, D - 0.45, D - 0.1);
    const jabs = hop(t, 0.6, 0.78) + hop(t, 0.95, 1.13);
    const arm = left ? p.armL : p.armR;
    const other = left ? p.armR : p.armL;
    // Exact aim (the rig turns the straight arm onto the target), a little above it so it reads as pointing.
    arm.aim = [dx, 0.35 * dy + 0.12 + 0.18 * jabs, dz];
    arm.aimW = Math.max(arm.aimW, ext * w);
    arm.bend -= 0.9 * ext * w;
    void bodyShare;
    other.raise += 0.25 * ext * w;
    p.jaw = Math.max(p.jaw, 0.42 * (hop(t, 0.55, 0.8) + 0.6 * hop(t, 0.92, 1.12)) * w);
    p.squint = Math.max(p.squint, 0.35 * ext * w);
  }

  private peek_(a: Action, w: number, p: RexPose): void {
    const t = a.t;
    if (!a.fromHidden) {
      // Duck and pop.
      p.emerge = 1 - 0.42 * window4(t, 0, 0.14, 0.22, 0.4);
      p.squash += 0.12 * window4(t, 0.36, 0.42, 0.46, 0.6) * w;
      p.armL.raise += 1.7 * window4(t, 0.4, 0.5, 0.6, 0.75) * w;
      return;
    }
    // Eyes first over the rim, a look left and right, then the full pop with a wave.
    p.emerge = t < 0.08 ? 0 : t < 0.95 ? 0.6 : 1;
    const scan = window4(t, 0.4, 0.5, 0.85, 0.95);
    const sx = Math.sin(TAU * 1.5 * (t - 0.45));
    p.lookX += 0.9 * sx * scan;
    p.headYaw += 0.32 * sx * scan * w;
    p.blink = Math.max(p.blink, window4(t, 0.3, 0.33, 0.35, 0.39));
    p.squash += 0.12 * window4(t, 0.95, 1.0, 1.05, 1.18) * w;
    p.squash -= 0.08 * window4(t, 1.15, 1.2, 1.24, 1.36) * w;
    const wave = window4(t, 1.02, 1.12, 1.32, 1.48);
    p.armL.raise += (1.8 + 0.4 * Math.sin(TAU * 4 * t)) * wave * w;
    p.armL.spread += 0.9 * wave * w;
    p.jaw = Math.max(p.jaw, 0.35 * window4(t, 1.0, 1.08, 1.2, 1.35) * w);
    p.squint = Math.max(p.squint, 0.6 * wave * w);
  }

  private dizzy_(a: Action, w: number, p: RexPose): void {
    const t = a.t;
    const D = a.duration;
    const on = window4(t, 0, 0.2, D - 0.7, D - 0.35) * w;
    p.spinRate += 12 * on;
    p.mirrorSpin = Math.max(p.mirrorSpin, on);
    p.halo = Math.max(p.halo, window4(t, 0.05, 0.3, D - 0.6, D - 0.3) * w);
    const c = TAU * 1.05 * t;
    p.headPitch += 0.14 * Math.sin(c) * on;
    p.headRoll += 0.17 * Math.cos(c) * on;
    p.neckRoll += 0.08 * Math.cos(c - 0.6) * on;
    p.neckPitch += 0.06 * Math.sin(c - 0.6) * on;
    p.roll += 0.07 * Math.sin(TAU * 0.5 * t) * on;
    p.yaw += 0.12 * Math.sin(TAU * 0.5 * t + 1) * on;
    p.x += 0.02 * Math.sin(TAU * 0.5 * t) * on;
    p.squash += 0.035 * Math.sin(TAU * 2.1 * t) * on;
    p.jaw = Math.max(p.jaw, 0.28 * on);
    for (const [arm, ph] of [[p.armL, 0], [p.armR, 1.7]] as const) {
      arm.raise -= 0.2 * on;
      arm.bend += (0.3 + 0.25 * Math.sin(TAU * 0.9 * t + ph)) * on;
      arm.spread += 0.15 * Math.sin(TAU * 0.5 * t + ph) * on;
    }
    p.blink = Math.max(p.blink, 0.3 * on);
    p.lookX += 0.65 * Math.cos(c * 1.3) * on;
    p.lookY += 0.65 * Math.sin(c * 1.3) * on;
    const brr = window4(t, D - 0.72, D - 0.62, D - 0.25, D - 0.05) * w;
    p.headYaw += 0.3 * Math.sin(TAU * 7 * t) * brr;
    p.jaw = Math.max(p.jaw, 0.3 * brr);
  }

  private celebrate_(a: Action, w: number, p: RexPose): void {
    const t = a.t;
    const D = a.duration;
    const big = a.strength >= 2;
    const hops: Array<[number, number, number, number]> = big
      ? [
          [0.1, 0.45, 0.12, 0],
          [0.6, 1.3, 0.32, 1],
          [1.45, 1.9, 0.16, 0],
          [2.05, 2.75, 0.36, -1],
          [2.9, 3.3, 0.12, 0],
        ]
      : [
          [0.1, 0.45, 0.12, 0],
          [0.6, 1.3, 0.32, 1],
          [1.45, 1.9, 0.16, 0],
        ];
    for (const [a0, a1, hgt, spin] of hops) {
      p.y += hgt * hop(t, a0, a1) * w;
      p.squash -= 0.12 * window4(t, a0 - 0.1, a0 - 0.05, a0 - 0.02, a0 + 0.02) * w;
      p.squash += 0.1 * window4(t, a0, a0 + 0.04, a0 + 0.1, a0 + 0.2) * w;
      p.squash -= 0.14 * window4(t, a1 - 0.02, a1 + 0.02, a1 + 0.05, a1 + 0.16) * w;
      if (spin !== 0) {
        const x = clamp01((t - a0) / (a1 - a0));
        const turn = spin * TAU * (x < 1 ? x * x * (3 - 2 * x) : 1);
        p.yaw += (t >= a1 ? 0 : turn) * w;
      }
      p.legL -= 0.4 * hop(t, a0, a1) * w;
      p.legR -= 0.35 * hop(t, a0, a1) * w;
    }
    const up = window4(t, 0.05, 0.25, D - 0.4, D - 0.05);
    const sw = Math.sin(TAU * 3 * t);
    p.armL.raise += (1.85 + 0.35 * sw) * up * w;
    p.armR.raise += (1.85 - 0.35 * sw) * up * w;
    p.armL.spread += 0.95 * up * w;
    p.armR.spread += 0.95 * up * w;
    p.armL.bend -= 0.3 * up * w;
    p.armR.bend -= 0.3 * up * w;
    p.jaw = Math.max(p.jaw, (0.62 + 0.22 * Math.sin(TAU * 5.5 * t)) * up * w);
    p.squint = Math.max(p.squint, up * w);
    p.spinRate += 10 * up * w;
    for (let i = 0; i < 4; i++) p.tailYaw[i]! += 0.42 * Math.sin(TAU * 3 * t - 0.6 * i) * up * w;
    p.sparkle = Math.max(p.sparkle, window4(t, 0.2, 0.45, D - 0.5, D - 0.1) * w);
    p.headPitch -= 0.08 * up * w;
  }

  private hide_(a: Action, w: number, p: RexPose): void {
    const t = a.t;
    // A little hop up, then a drop below the rim.
    const drop = t < 0.14 ? 0 : clamp01((t - 0.14) / 0.42);
    p.emerge = t < 0.14 ? 1 + 0.08 * hop(t, 0, 0.14) : 1 - drop * drop;
    p.squash += 0.1 * window4(t, 0.1, 0.18, 0.4, 0.55) * w;
    p.armL.raise += 1.3 * window4(t, 0.1, 0.2, 0.5, 0.62) * w;
    p.armR.raise += 1.3 * window4(t, 0.1, 0.2, 0.5, 0.62) * w;
    p.jaw = Math.max(p.jaw, 0.3 * window4(t, 0.05, 0.12, 0.3, 0.45) * w);
    p.worry = Math.max(p.worry, 0.4 * w);
  }

  // ---- springs ------------------------------------------------------------------------------------

  private snapSprings(t: RexPose): void {
    const s = this.springs;
    for (const k of Object.keys(s)) s[k]!.snap((t as unknown as Record<string, number>)[k] ?? 0);
    for (const side of ['L', 'R'] as const) {
      const arm = side === 'L' ? t.armL : t.armR;
      for (const k of ['raise', 'spread', 'twist', 'bend'] as const) this.armSprings[side][k].snap(arm[k]);
    }
    for (let i = 0; i < 4; i++) {
      this.tailYawS[i]!.snap(t.tailYaw[i]!);
      this.tailPitchS[i]!.snap(t.tailPitch[i]!);
    }
    Object.assign(this.pose, {
      ...t,
      armL: { ...t.armL, aim: [...t.armL.aim] },
      armR: { ...t.armR, aim: [...t.armR.aim] },
      tailYaw: [...t.tailYaw],
      tailPitch: [...t.tailPitch],
    });
    this.pose.emerge = this.emergeS.value;
    this.prevYaw = t.yaw;
  }

  private integrate(t: RexPose, h: number): void {
    const out = this.pose;
    const s = this.springs;
    // Direct channels (choreographed curves).
    out.x = t.x;
    out.y = t.y;
    out.z = t.z;
    out.pitch = t.pitch;
    out.roll = t.roll;
    out.hipsPitch = t.hipsPitch;
    out.hipsRoll = t.hipsRoll;
    out.legL = t.legL;
    out.legR = t.legR;
    out.footL = t.footL;
    out.footR = t.footR;
    out.blink = t.blink;
    out.squint = t.squint;
    out.worry = t.worry;
    out.lookX = lerp(out.lookX, t.lookX, 1 - Math.exp(-h * 14));
    out.lookY = lerp(out.lookY, t.lookY, 1 - Math.exp(-h * 14));
    out.spinRate = t.spinRate;
    out.mirrorSpin = lerp(out.mirrorSpin, t.mirrorSpin, 1 - Math.exp(-h * 6));
    out.halo = t.halo;
    out.sparkle = t.sparkle;
    out.sweat = t.sweat;
    // Sprung channels.
    const sprung = ['headPitch', 'headYaw', 'headRoll', 'neckPitch', 'neckYaw', 'neckRoll', 'chestPitch', 'chestYaw', 'chestRoll', 'jaw', 'squash', 'yaw', 'breathe'] as const;
    for (const k of sprung) {
      const sp = s[k]!;
      sp.target = t[k];
      out[k] = sp.step(h);
    }
    out.jaw = Math.max(0, Math.min(1.05, out.jaw));
    for (const side of ['L', 'R'] as const) {
      const src = side === 'L' ? t.armL : t.armR;
      const dst = side === 'L' ? out.armL : out.armR;
      const sp = this.armSprings[side];
      for (const k of ['raise', 'spread', 'twist', 'bend'] as const) {
        sp[k].target = src[k];
        dst[k] = sp[k].step(h);
      }
      dst.aim[0] = src.aim[0];
      dst.aim[1] = src.aim[1];
      dst.aim[2] = src.aim[2];
      dst.aimW = src.aimW;
    }
    // Tail follow-through: it trails the body's turns and bounces.
    this.yawVel = (out.yaw - this.prevYaw) / h;
    this.prevYaw = out.yaw;
    for (let i = 0; i < 4; i++) {
      const ty = this.tailYawS[i]!;
      ty.target = t.tailYaw[i]! - 0.05 * this.yawVel * (1 + i * 0.4);
      out.tailYaw[i] = ty.step(h);
      const tp = this.tailPitchS[i]!;
      tp.target = t.tailPitch[i]!;
      out.tailPitch[i] = tp.step(h);
    }
    // Rise out of hiding: a sprung pop up (overshoot), a straight fall down.
    const e = this.emergeS;
    const hidingNow = this.actions.some((a) => a.kind === 'hide' && a.fadeFrom < 0);
    if (hidingNow) {
      e.snap(t.emerge);
    } else {
      e.target = t.emerge;
      e.step(h);
    }
    out.emerge = e.value;
    // Spiral angles.
    this.spin += out.spinRate * h;
    this.haloAngle += 3.2 * h;
    this.sparkleAngle += 1.6 * h;
  }
}

/** Popping scale used by the rig for accessories (halo, sparkles, sweat): overshoots as it grows. */
export function popScale(x: number): number {
  return x <= 0 ? 0 : x >= 1 ? 1 : easeOutBack(x, 2.2);
}
