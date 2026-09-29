/**
 * Analytic two-bone IK (hip → knee → foot) and the one-bone "stretch" fallback used when a leg module
 * is a single mesh (the starter library): the leg is aimed at the foot and scaled along its length.
 * Pure Vec3 math, no three.js.
 */
import type { Vec3 } from '../types';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

export interface TwoBoneResult {
  knee: Vec3;
  /** 0..1 how far the leg is extended (1 = straight). */
  extension: number;
  /** Unit direction hip → knee and knee → foot. */
  upperDir: Vec3;
  lowerDir: Vec3;
}

/**
 * Two-bone IK: places the knee so that |hip−knee| = l1 and |knee−foot| = l2 with the knee pushed toward
 * `pole` (a direction, e.g. the body's forward for front legs, backward for hind legs). Targets out of
 * reach straighten the leg (clamped to 0.999·(l1+l2)); too-close targets fold it.
 */
export function twoBoneIk(hip: Vec3, foot: Vec3, l1: number, l2: number, pole: Vec3, out?: TwoBoneResult): TwoBoneResult {
  // Scalar math, writes into `out` when given (the rig solves every leg of every creature each frame).
  const tx = foot[0] - hip[0];
  const ty = foot[1] - hip[1];
  const tz = foot[2] - hip[2];
  const dRaw = Math.sqrt(tx * tx + ty * ty + tz * tz);
  const dMax = (l1 + l2) * 0.999;
  const dMin = Math.abs(l1 - l2) * 1.001 + 1e-4;
  const d = Math.min(dMax, Math.max(dMin, dRaw));
  let ax = 0;
  let ay = -1;
  let az = 0;
  if (dRaw > 1e-9) {
    ax = tx / dRaw;
    ay = ty / dRaw;
    az = tz / dRaw;
  }
  // Law of cosines: distance of the knee along the axis and its perpendicular offset.
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  // Perpendicular direction: the pole projected off the axis.
  const pd = pole[0] * ax + pole[1] * ay + pole[2] * az;
  let px = pole[0] - ax * pd;
  let py = pole[1] - ay * pd;
  let pz = pole[2] - az * pd;
  let pl = Math.sqrt(px * px + py * py + pz * pz);
  if (pl < 1e-6) {
    px = -ax * az;
    py = -ay * az;
    pz = 1 - az * az;
    pl = Math.sqrt(px * px + py * py + pz * pz) || 1;
  }
  px /= pl;
  py /= pl;
  pz /= pl;
  const r = out ?? { knee: [0, 0, 0], extension: 0, upperDir: [0, 0, 0], lowerDir: [0, 0, 0] };
  const kx = hip[0] + ax * a + px * h;
  const ky = hip[1] + ay * a + py * h;
  const kz = hip[2] + az * a + pz * h;
  r.knee[0] = kx;
  r.knee[1] = ky;
  r.knee[2] = kz;
  r.extension = (d - dMin) / Math.max(1e-6, dMax - dMin);
  let ux = kx - hip[0];
  let uy = ky - hip[1];
  let uz = kz - hip[2];
  let ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
  r.upperDir[0] = ux / ul;
  r.upperDir[1] = uy / ul;
  r.upperDir[2] = uz / ul;
  ux = foot[0] - kx;
  uy = foot[1] - ky;
  uz = foot[2] - kz;
  ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
  r.lowerDir[0] = ux / ul;
  r.lowerDir[1] = uy / ul;
  r.lowerDir[2] = uz / ul;
  return r;
}

export interface StretchResult {
  /** Unit direction hip → foot. */
  dir: Vec3;
  /** Scale factor along the leg (clamped so the leg never collapses or over-stretches). */
  stretch: number;
}

/** One-bone fallback: aim the leg at the foot and stretch/compress it (cartoon legs). */
export function stretchLeg(hip: Vec3, foot: Vec3, length: number, minStretch = 0.55, maxStretch = 1.35): StretchResult {
  const toFoot = sub(foot, hip);
  const d = len(toFoot);
  const dir = d > 1e-9 ? scale(toFoot, 1 / d) : ([0, -1, 0] as Vec3);
  const stretch = Math.min(maxStretch, Math.max(minStretch, d / Math.max(1e-6, length)));
  return { dir, stretch };
}
