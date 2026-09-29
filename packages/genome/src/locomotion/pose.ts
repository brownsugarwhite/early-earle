/**
 * Applying a pose to the body's sphere list: the slither wave along a snake's spine, the head bob, the
 * body rotation (yaw · pitch · roll about the origin) and splat droplets. Pure; the render side writes
 * the result into the GPU block, the rig traces sockets on it, so both see the same posed body.
 */
import type { BodySkeleton } from '../body';
import type { SpherePrim, Vec3 } from '../types';

/** Row-major 3×3 rotation as a flat tuple. */
export type Rot3 = [number, number, number, number, number, number, number, number, number];

export const ROT_IDENTITY: Readonly<Rot3> = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** R = Ry(yaw) · Rx(pitch) · Rz(roll): yaw about up, pitch nose down (+), roll to the left (+). */
export function rotationYPR(yaw: number, pitch: number, roll: number, out?: Rot3): Rot3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  // Ry · Rx · Rz
  const m = out ?? ([0, 0, 0, 0, 0, 0, 0, 0, 0] as Rot3);
  m[0] = cy * cr + sy * sp * sr;
  m[1] = -cy * sr + sy * sp * cr;
  m[2] = sy * cp;
  m[3] = cp * sr;
  m[4] = cp * cr;
  m[5] = -sp;
  m[6] = -sy * cr + cy * sp * sr;
  m[7] = sy * sr + cy * sp * cr;
  m[8] = cy * cp;
  return m;
}

export function rotate(r: Readonly<Rot3>, v: Vec3): Vec3 {
  return [r[0] * v[0] + r[1] * v[1] + r[2] * v[2], r[3] * v[0] + r[4] * v[1] + r[5] * v[2], r[6] * v[0] + r[7] * v[1] + r[8] * v[2]];
}

/** Transpose (inverse of a rotation). */
export function rotateInverse(r: Readonly<Rot3>, v: Vec3): Vec3 {
  return [r[0] * v[0] + r[3] * v[1] + r[6] * v[2], r[1] * v[0] + r[4] * v[1] + r[7] * v[2], r[2] * v[0] + r[5] * v[1] + r[8] * v[2]];
}

export interface SpineWave {
  /** Lateral amplitude at the tail (blob units); the head moves ~30 % of it. */
  amp: number;
  /** Travelling phase (radians); increases with distance travelled. */
  phase: number;
  /** Waves along the body. */
  waves: number;
}

export interface BodyPose {
  rotation: Readonly<Rot3>;
  spineWave: SpineWave | null;
  /** Head sphere offset (blob units, before rotation). */
  headBob: number;
  headNod: number;
  droplets: readonly SpherePrim[];
}

/** Lateral spine offset at spine parameter s (0 head … 1 tail). */
export function spineOffset(wave: SpineWave, s: number): number {
  const w = 0.3 + 0.7 * Math.min(1, Math.max(0, s));
  return wave.amp * w * Math.sin(Math.PI * 2 * wave.waves * s - wave.phase);
}

/**
 * Posed sphere list: rest spheres displaced (spine wave, head bob), rotated about the origin, droplets
 * appended (they are radial splashes, already in body space). Writes into `out` when given.
 */
export function poseSpheres(rest: readonly SpherePrim[], skeleton: BodySkeleton, pose: BodyPose, out?: SpherePrim[]): SpherePrim[] {
  const n = rest.length;
  const res = out ?? [];
  const total = n + pose.droplets.length;
  // Reuse the sphere objects of `out` (the scene poses every creature every frame).
  while (res.length < total) res.push({ center: [0, 0, 0], r: 0 });
  res.length = total;
  const r = pose.rotation;
  const wave = pose.spineWave;
  for (let i = 0; i < n; i++) {
    const s = rest[i]!;
    let x = s.center[0];
    let y = s.center[1];
    let z = s.center[2];
    if (wave && skeleton.spine) {
      const sp = skeleton.spine[i];
      if (sp !== undefined) {
        const off = spineOffset(wave, sp);
        x += off;
        // The head yaws into the wave a little (it leads the curve).
        if (sp <= 0) z -= Math.abs(off) * 0.15;
      }
    }
    if (i === skeleton.headSphere) {
      y += pose.headBob;
      z += pose.headNod;
    }
    const o = res[i]!;
    o.center[0] = r[0] * x + r[1] * y + r[2] * z;
    o.center[1] = r[3] * x + r[4] * y + r[5] * z;
    o.center[2] = r[6] * x + r[7] * y + r[8] * z;
    o.r = s.r;
  }
  for (let j = 0; j < pose.droplets.length; j++) {
    const d = pose.droplets[j]!;
    const o = res[n + j]!;
    o.center[0] = d.center[0];
    o.center[1] = d.center[1];
    o.center[2] = d.center[2];
    o.r = d.r;
  }
  return res;
}
