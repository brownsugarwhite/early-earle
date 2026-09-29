/**
 * Applying a pose to the body's sphere list: the slither wave along a snake's spine (or, v3, the spine
 * points of follow-the-leader), the neck arc the head leads with, the trunk sway/curl, the lower jaw,
 * the kneaded legs (foot + knee spheres placed at the gait's feet), the head bob, the body rotation
 * (yaw · pitch · roll about the origin) and splat droplets. Pure; the render side writes the result into
 * the GPU block, the rig traces sockets on it, so both see the same posed body.
 */
import type { BodySkeleton } from '../body';
import type { SpherePrim, Vec3 } from '../types';
import { twoBoneIk, type TwoBoneResult } from './ik';

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
  /**
   * Kneaded legs: foot contact points in the posed body frame (blob units, world-aligned axes, relative to
   * the body origin), one per `skeleton.legs` entry. Omit / null = legs at rest (rotated with the body).
   */
  feet?: readonly Vec3[] | null | undefined;
  /** Per leg 0..1 swing progress (foot thins while lifted) and landing splat (foot widens) — optional. */
  footSwing?: readonly number[] | null | undefined;
  footSplat?: readonly number[] | null | undefined;
  /** Head lead over the body (radians, yaw; + = toward +x): the neck bends in an arc (neck chain). */
  neckBend?: number | undefined;
  /** Trunk chain sway (yaw) and curl (tip up toward the face), radians over the whole chain. */
  trunkSway?: number | undefined;
  trunkCurl?: number | undefined;
  /** 0..1 lower-jaw opening (mouth.jaw spheres swing down about mouth.hinge). */
  jaw?: number | undefined;
  /**
   * Follow-the-leader spine (snake): per sphere the posed centre (blob units, world-aligned, relative to
   * the body origin) or null for spheres that move rigidly with the head (snout). Replaces the rest
   * layout *and* the rotation for those spheres.
   */
  spinePoints?: readonly (Vec3 | null)[] | null | undefined;
  /** Per-sphere radius multipliers (a swallowed bulge travelling down a snake); null = 1. */
  sphereScale?: readonly number[] | null | undefined;
}

/** Maximum jaw swing (radians) at `jaw = 1`. */
export const JAW_MAX_ANGLE = 0.62;

/** Lateral spine offset at spine parameter s (0 head … 1 tail). */
export function spineOffset(wave: SpineWave, s: number): number {
  const w = 0.3 + 0.7 * Math.min(1, Math.max(0, s));
  return wave.amp * w * Math.sin(Math.PI * 2 * wave.waves * s - wave.phase);
}

const _ik: TwoBoneResult = { knee: [0, 0, 0], extension: 0, upperDir: [0, 0, 0], lowerDir: [0, 0, 0] };
const _hip: Vec3 = [0, 0, 0];
const _foot: Vec3 = [0, 0, 0];
const _pole: Vec3 = [0, 0, 0];
const _tmp: Vec3 = [0, 0, 0];

/** Neck arc: rest offset (x, s along forward) of a point bent by `bend` over the neck length `L`. */
function arcPoint(s: number, x: number, bend: number, L: number, out: Vec3): Vec3 {
  const sc = Math.min(s, L);
  const phi = (bend * sc) / L;
  let ax: number;
  let az: number;
  if (Math.abs(bend) < 1e-4) {
    ax = 0;
    az = sc;
  } else {
    const R = L / bend;
    ax = R * (1 - Math.cos(phi));
    az = R * Math.sin(phi);
  }
  // Beyond the arc end the head continues straight along the end tangent (rigid snout / jaw).
  const rest = s - sc;
  const c = Math.cos(phi);
  const sn = Math.sin(phi);
  out[0] = ax + sn * rest + c * x;
  out[1] = 0;
  out[2] = az + c * rest - sn * x;
  return out;
}

/**
 * Posed sphere list: rest spheres displaced (spine wave or spine points, neck arc, trunk, jaw, legs,
 * head bob), rotated about the origin, droplets appended (they are radial splashes, already in body
 * space). Writes into `out` when given.
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
  const neck = skeleton.neckChain ?? null;
  const bend = neck ? Math.max(-neck.maxBend, Math.min(neck.maxBend, pose.neckBend ?? 0)) : 0;
  const trunk = skeleton.trunk ?? null;
  const sway = pose.trunkSway ?? 0;
  const curl = pose.trunkCurl ?? 0;
  const mouth = skeleton.mouth;
  const jaw = mouth && mouth.jaw.length > 0 ? Math.max(0, Math.min(1, pose.jaw ?? 0)) * JAW_MAX_ANGLE : 0;
  const spinePts = pose.spinePoints ?? null;
  const radii = pose.sphereScale ?? null;
  const headBobAll = neck ? neck.head : null;
  const head = skeleton.headSphere;
  for (let i = 0; i < n; i++) {
    const s = rest[i]!;
    const o = res[i]!;
    o.r = s.r * (radii ? radii[i] ?? 1 : 1);
    const sp = spinePts ? spinePts[i] : null;
    if (sp) {
      // Follow-the-leader: already posed and world-aligned.
      o.center[0] = sp[0];
      o.center[1] = sp[1];
      o.center[2] = sp[2];
      continue;
    }
    if (spinePts && head >= 0 && spinePts[head]) {
      // Rigid with the head (snout): the rest offset from the head, turned with the head's heading.
      const hp = spinePts[head]!;
      const hr = rest[head]!.center;
      const x = s.center[0] - hr[0];
      const y = s.center[1] - hr[1];
      const z = s.center[2] - hr[2];
      o.center[0] = hp[0] + r[0] * x + r[1] * y + r[2] * z;
      o.center[1] = hp[1] + r[3] * x + r[4] * y + r[5] * z;
      o.center[2] = hp[2] + r[6] * x + r[7] * y + r[8] * z;
      continue;
    }
    let x = s.center[0];
    let y = s.center[1];
    let z = s.center[2];
    if (wave && skeleton.spine) {
      const spv = skeleton.spine[i];
      if (spv !== undefined) {
        // Spheres ahead of the head (snout: spine < 0) move rigidly with the head — never their own phase.
        const off = spineOffset(wave, Math.max(0, spv));
        x += off;
        // The head yaws into the wave a little (it leads the curve).
        if (spv <= 0) z -= Math.abs(off) * 0.15;
      }
    }
    // Lower jaw swings down about the hinge (before the neck bend: it is part of the head).
    if (jaw > 0 && mouth.jaw.includes(i)) {
      const hy = y - mouth.hinge[1];
      const hz = z - mouth.hinge[2];
      const c = Math.cos(jaw);
      const sn = Math.sin(jaw);
      y = mouth.hinge[1] + hy * c - hz * sn;
      z = mouth.hinge[2] + hy * sn + hz * c;
    }
    // Trunk chain: each segment turns a little more (sway sideways, curl the tip up toward the face).
    if (trunk && (sway !== 0 || curl !== 0)) {
      const k = trunk.spheres.indexOf(i);
      if (k >= 0) {
        let px = trunk.root[0];
        let py = trunk.root[1];
        let pz = trunk.root[2];
        let prevX = trunk.root[0];
        let prevY = trunk.root[1];
        let prevZ = trunk.root[2];
        const m = trunk.spheres.length;
        for (let j = 0; j <= k; j++) {
          const q = rest[trunk.spheres[j]!]!.center;
          const vx = q[0] - prevX;
          const vy = q[1] - prevY;
          const vz = q[2] - prevZ;
          prevX = q[0];
          prevY = q[1];
          prevZ = q[2];
          const f = (j + 1) / m;
          const yaw = sway * f;
          const pitch = -curl * f * f * 1.6; // the tip curls more than the base
          // pitch about x (nose up for −), then yaw about y
          const cy1 = Math.cos(pitch);
          const sy1 = Math.sin(pitch);
          const y1 = vy * cy1 - vz * sy1;
          const z1 = vy * sy1 + vz * cy1;
          const cyw = Math.cos(yaw);
          const syw = Math.sin(yaw);
          px += vx * cyw + z1 * syw;
          py += y1;
          pz += -vx * syw + z1 * cyw;
        }
        x = px;
        y = py;
        z = pz;
      }
    }
    // Neck arc: the head leads, every neck/head sphere follows the arc from the neck base.
    if (neck && bend !== 0) {
      const inHead = neck.head.includes(i);
      if (inHead || neck.spheres.includes(i)) {
        const sAlong = z - neck.base[2];
        if (sAlong > 0) {
          arcPoint(sAlong, x - neck.base[0], bend, neck.length, _tmp);
          x = neck.base[0] + _tmp[0];
          z = neck.base[2] + _tmp[2];
        }
      }
    }
    if (headBobAll ? headBobAll.includes(i) : i === skeleton.headSphere) {
      y += pose.headBob;
      z += pose.headNod;
    }
    o.center[0] = r[0] * x + r[1] * y + r[2] * z;
    o.center[1] = r[3] * x + r[4] * y + r[5] * z;
    o.center[2] = r[6] * x + r[7] * y + r[8] * z;
  }
  // Kneaded legs: foot spheres at the gait's feet, knee spheres solved between the (posed) hip and foot.
  const feet = pose.feet;
  const legs = skeleton.legs;
  if (feet && legs.length > 0) {
    const swing = pose.footSwing ?? null;
    const splat = pose.footSplat ?? null;
    for (let li = 0; li < legs.length; li++) {
      const leg = legs[li]!;
      const f = feet[li];
      if (!f || leg.footSphere < 0 || leg.footSphere >= n) continue;
      const sw = swing ? swing[li] ?? 0 : 0;
      const sp = splat ? splat[li] ?? 0 : 0;
      const fr = leg.footR * (1 - 0.12 * Math.sin(Math.PI * Math.min(1, Math.max(0, sw)))) * (1 + 0.16 * sp);
      const fo = res[leg.footSphere]!;
      fo.center[0] = f[0];
      fo.center[1] = f[1] + fr * (1 - 0.35 * sp);
      fo.center[2] = f[2];
      fo.r = fr;
      if (leg.kneeSphere >= 0 && leg.kneeSphere < n) {
        _hip[0] = r[0] * leg.hip[0] + r[1] * leg.hip[1] + r[2] * leg.hip[2];
        _hip[1] = r[3] * leg.hip[0] + r[4] * leg.hip[1] + r[5] * leg.hip[2];
        _hip[2] = r[6] * leg.hip[0] + r[7] * leg.hip[1] + r[8] * leg.hip[2];
        _foot[0] = fo.center[0];
        _foot[1] = fo.center[1];
        _foot[2] = fo.center[2];
        const kr = rest[leg.kneeSphere]!;
        const l1 = Math.hypot(kr.center[0] - leg.hip[0], kr.center[1] - leg.hip[1], kr.center[2] - leg.hip[2]);
        const fc = rest[leg.footSphere]!.center;
        const l2 = Math.hypot(fc[0] - kr.center[0], fc[1] - kr.center[1], fc[2] - kr.center[2]);
        // Pole: the body's forward (rotated), knees bend along it (hind legs backward).
        _pole[0] = r[2] * leg.bend;
        _pole[1] = r[5] * leg.bend;
        _pole[2] = r[8] * leg.bend;
        const ik = twoBoneIk(_hip, _foot, l1 * 1.04, l2 * 1.04, _pole, _ik);
        const ko = res[leg.kneeSphere]!;
        ko.center[0] = ik.knee[0];
        ko.center[1] = ik.knee[1];
        ko.center[2] = ik.knee[2];
        ko.r = kr.r;
      }
    }
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
