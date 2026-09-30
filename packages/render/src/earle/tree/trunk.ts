import { Vector3 } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { catmullRom, makeTube, smooth01, type TubeCurve } from './curve';

export interface TrunkSpec {
  /** Height of the fork (top of the trunk) in tree units. */
  height: number;
  /** Mean radius just above the flare (y ≈ 0.12·height). */
  baseRadius: number;
  /** Mean radius at the fork. */
  topRadius: number;
  /** Extra radius at the ground as a fraction of `baseRadius` (Standard 0.55): the foot flares into the ground. */
  flare?: number;
  /** Rotation of the buttress lobes over the height (rad): the trunk twists like image 04. */
  twist: number;
  /** Buttress lobes at the foot (5–7). */
  lobes: number;
  /** Amplitude of the gnarled S-curve of the axis (tree units). */
  lean: number;
  /** Mesh resolution (does not change the form). */
  rings: number;
  segments: number;
  /** Surface roots along the ground. */
  rootCount: number;
  rootLength: number;
  /**
   * Curvature radius of the ground in tree units (a planet: planet radius / slot scale). Roots, the snow drift and
   * the first path node follow the sphere instead of the tangent plane (nothing floats at the rim). Standard: flat.
   */
  groundRadius?: number;
  seed: number;
}

/** Pure form of the trunk (no GPU objects) — shared by the wood mesh, the level path and the collision volumes. */
export interface TrunkProfile {
  spec: TrunkSpec;
  /** Largest radius (incl. lobes and burls) at height y. */
  radiusAt(y: number): number;
  /** Surface radius at height y in tree direction `angle` (rad, atan2(z, x) around the axis). */
  surfaceAt(y: number, angle: number): number;
  /** Surface point at height y, direction `angle`. */
  pointAt(y: number, angle: number, out?: Vector3): Vector3;
  /** Outward surface normal at height y, direction `angle` (from the analytic surface, finite differences). */
  normalAt(y: number, angle: number, out?: Vector3): Vector3;
  /** Axis point at height y (the trunk bends in a gnarled S). */
  axisAt(y: number, out: Vector3): Vector3;
  /** Ground height below (x, z) (0 on flat ground, the sphere with `groundRadius`). */
  groundY(x: number, z: number): number;
  /** Axis point at the fork. */
  top: Vector3;
  topRadius: number;
  /** Surface roots (tube centrelines, partly below the ground). */
  roots: TubeCurve[];
  /** Main roots only (first `rootCount` entries of `roots`): angle at the trunk. */
  rootAngles: number[];
  /** Visible tips of the main roots on the ground (where they dive): path start candidates. */
  rootTips: Vector3[];
  /** Circumference at mid height and trunk height (tree units). */
  surfaceUnits: [number, number];
  /** Mean radius at height fraction t (0..1). */
  rMean(t: number): number;
  /** Rotation of the lobes (and the bark grain) at height y (rad). */
  twistAt(y: number): number;
  /** Lobe amplitude at height fraction t (0..1). */
  lobeAmp(t: number): number;
}

interface Burl {
  angle: number;
  y: number;
  amp: number;
  sa: number;
  sy: number;
}

/**
 * Gnarled giant trunk (image 01/03/04/35): the axis bends in an S, the cross-section carries twisting buttress lobes
 * that are strong at the foot and fade upwards, plus burls (knots) where the bark lines swirl. The foot flares and
 * continues below the ground; surface roots leave from the lobe crests, hug the ground (sphere-aware) and dive.
 */
export function trunkProfile(spec: TrunkSpec): TrunkProfile {
  const H = spec.height;
  const rand = mulberry32(hash32('hero-trunk', spec.seed));
  const flare = spec.flare ?? 0.55;
  const R = spec.groundRadius ?? Infinity;
  const groundY = (x: number, z: number): number => {
    if (!Number.isFinite(R)) return 0;
    const d2 = Math.min(R * R * 0.98, x * x + z * z);
    return -(R - Math.sqrt(R * R - d2));
  };

  // --- Axis: gnarled S through a few offsets (Catmull-Rom), looked up by height -------------------------------
  const dirA = rand() * Math.PI * 2;
  const ax = Math.cos(dirA) * spec.lean;
  const az = Math.sin(dirA) * spec.lean;
  const bx = -az * 0.55;
  const bz = ax * 0.55;
  const ctrl = [
    new Vector3(0, -3, 0),
    new Vector3(0, 0, 0),
    new Vector3(ax * 0.45 + bx * 0.2, 0.3 * H, az * 0.45 + bz * 0.2),
    new Vector3(-ax * 0.3 + bx * 0.9, 0.62 * H, -az * 0.3 + bz * 0.9),
    new Vector3(ax * 0.55 + bx * 0.35, H, az * 0.55 + bz * 0.35),
    new Vector3(ax * 0.75 + bx * 0.2, H + 4, az * 0.75 + bz * 0.2),
  ];
  const axisPts = catmullRom(ctrl, 40);
  const axisAt = (y: number, out: Vector3): Vector3 => {
    let lo = 0;
    let hi = axisPts.length - 1;
    if (y <= axisPts[0]!.y) return out.copy(axisPts[0]!).setY(y);
    if (y >= axisPts[hi]!.y) return out.copy(axisPts[hi]!).setY(y);
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (axisPts[mid]!.y <= y) lo = mid;
      else hi = mid;
    }
    const a = axisPts[lo]!;
    const b = axisPts[hi]!;
    const f = (y - a.y) / Math.max(1e-6, b.y - a.y);
    return out.copy(a).lerp(b, f).setY(y);
  };

  // --- Cross-section -------------------------------------------------------------------------------------------
  const rMean = (t: number): number => {
    const y = t * H;
    if (y < 0) return rMean(0) + -y * 0.7;
    const tt = Math.min(1, t);
    return spec.topRadius + (spec.baseRadius - spec.topRadius) * Math.pow(1 - tt, 1.25) + spec.baseRadius * flare * Math.exp(-y / (0.09 * H));
  };
  const lobeAmp = (t: number): number => 0.15 + 0.45 * Math.exp(-Math.max(0, t) * 5);
  const phi2 = rand() * Math.PI * 2;
  const phi3 = rand() * Math.PI * 2;
  const phiK = rand() * Math.PI * 2;
  const burls: Burl[] = [];
  const nb = 9;
  for (let i = 0; i < nb; i++) {
    burls.push({
      angle: rand() * Math.PI * 2,
      y: H * (0.12 + 0.8 * ((i + rand()) / nb)),
      amp: 0.06 + rand() * 0.11,
      sa: 0.22 + rand() * 0.3,
      sy: 0.7 + rand() * 1.5,
    });
  }
  const lobeAt = (angle: number, y: number): number => {
    const t = y / H;
    const tau = spec.twist * Math.max(0, Math.min(1.1, t));
    const th = angle - tau;
    const c = 0.5 + 0.5 * Math.cos(spec.lobes * th + phiK);
    const main = lobeAmp(t) * (c * c - 0.3);
    // braided: finer twisted ridges between the buttress lobes (image 04), plus slow asymmetry
    const braid = 0.035 * Math.cos(2 * spec.lobes * th + phiK * 2) * Math.min(1, 0.4 + t);
    return main + braid + 0.06 * Math.cos(3 * th + phi3) + 0.05 * Math.cos(2 * th + phi2);
  };
  const burlAt = (angle: number, y: number): number => {
    let acc = 0;
    for (const b of burls) {
      let da = angle - b.angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const dy = y - b.y;
      acc += b.amp * Math.exp(-(da * da) / (b.sa * b.sa) - (dy * dy) / (b.sy * b.sy));
    }
    return acc;
  };
  const surfaceAt = (y: number, angle: number): number => {
    const t = y / H;
    const cap = y > H ? Math.max(0.02, 1 - Math.pow((y - H) / 1.6, 2)) : 1;
    return rMean(Math.min(t, 1)) * (1 + lobeAt(angle, y) + burlAt(angle, y)) * Math.sqrt(cap);
  };
  const _a = new Vector3();
  const pointAt = (y: number, angle: number, out = new Vector3()): Vector3 => {
    axisAt(y, _a);
    const r = surfaceAt(y, angle);
    return out.set(_a.x + Math.cos(angle) * r, y, _a.z + Math.sin(angle) * r);
  };
  const _p0 = new Vector3();
  const _p1 = new Vector3();
  const _p2 = new Vector3();
  const _p3 = new Vector3();
  const normalAt = (y: number, angle: number, out = new Vector3()): Vector3 => {
    const da = 0.01;
    const dy = 0.05;
    pointAt(y, angle - da, _p0);
    pointAt(y, angle + da, _p1);
    pointAt(y - dy, angle, _p2);
    pointAt(y + dy, angle, _p3);
    const tu = _p1.sub(_p0);
    const tv = _p3.sub(_p2);
    out.crossVectors(tv, tu).normalize();
    // outward: same side as the radial direction
    if (out.x * Math.cos(angle) + out.z * Math.sin(angle) < 0) out.negate();
    return out;
  };
  const radiusAt = (y: number): number => {
    let m = 0;
    for (let i = 0; i < 48; i++) m = Math.max(m, surfaceAt(y, (i / 48) * Math.PI * 2));
    return m;
  };

  // --- Roots: leave from the lobe crests at the foot, hug the ground, fork once, dive ------------------------------
  const roots: TubeCurve[] = [];
  const rootTips: Vector3[] = [];
  const rootAngles: number[] = [];
  const crest = (2 * Math.PI) / spec.lobes;
  const crest0 = -phiK / spec.lobes;
  const r0 = rMean(0.02);
  /**
   * Root from a start point on the ground plane, heading `heading` (rad): the crest (top of the tube) follows `tops`
   * above the ground (sphere-aware) and ends below it, so the root dives instead of ending in the air.
   */
  const makeRoot = (sx: number, sz: number, heading: number, len: number, thick: number, tops: number[], bend: number): TubeCurve => {
    const fr = [0, 0.14, 0.34, 0.58, 0.82, 1];
    const radii = [1, 0.85, 0.62, 0.42, 0.26, 0.12];
    const ctrl: Vector3[] = [];
    let x = sx;
    let z = sz;
    for (let i = 0; i < fr.length; i++) {
      const q = fr[i]!;
      if (i > 0) {
        const dq = q - fr[i - 1]!;
        const a = heading + bend * q * q + 0.14 * Math.sin(q * 3.3 + heading * 2.1) * q;
        x += Math.cos(a) * len * dq;
        z += Math.sin(a) * len * dq;
      }
      const rad = thick * radii[i]!;
      ctrl.push(new Vector3(x, groundY(x, z) + tops[i]! - rad, z));
    }
    return makeTube(ctrl, 0.35, (u) => thick * (1 - 0.88 * Math.pow(u, 0.8)));
  };
  const axis0 = axisAt(0, new Vector3());
  for (let k = 0; k < spec.rootCount; k++) {
    const angle = crest0 + Math.round(((k / spec.rootCount) * Math.PI * 2 + rand() * 0.4) / crest) * crest;
    const len = spec.rootLength * (0.7 + 0.5 * rand());
    const thick = r0 * (0.3 + 0.1 * rand());
    const lift = 1.7 + 0.9 * rand();
    const tube = makeRoot(axis0.x + Math.cos(angle) * r0 * 0.55, axis0.z + Math.sin(angle) * r0 * 0.55, angle + (rand() - 0.5) * 0.25, len, thick, [lift, lift * 0.6, 0.5, 0.25, 0.04, -0.45], (rand() - 0.5) * 0.7);
    roots.push(tube);
    rootAngles.push(angle);
    // visible tip: last sample whose top is still above the ground
    let tip = tube.points[0]!.clone();
    for (let i = 0; i < tube.points.length; i++) {
      const p = tube.points[i]!;
      if (p.y + tube.radii[i]! > groundY(p.x, p.z) + 0.05) tip = p.clone().setY(p.y + tube.radii[i]!);
    }
    rootTips.push(tip);
  }
  // side roots (after the main roots so indices 0..rootCount-1 stay the main ones): fork off a main root
  for (let k = 0; k < spec.rootCount; k++) {
    const main = roots[k]!;
    const at = Math.floor(main.points.length * (0.3 + 0.2 * rand()));
    const p = main.points[at]!;
    const q = main.points[Math.min(main.points.length - 1, at + 1)]!;
    const side = rand() < 0.5 ? -1 : 1;
    const heading = Math.atan2(q.z - p.z, q.x - p.x) + side * (0.6 + 0.35 * rand());
    const top0 = p.y + main.radii[at]! - groundY(p.x, p.z);
    roots.push(makeRoot(p.x, p.z, heading, spec.rootLength * (0.35 + 0.2 * rand()), main.radii[at]! * 0.62, [top0 * 0.85, top0 * 0.6, 0.22, 0.1, 0.0, -0.35], side * 0.4));
  }

  const top = axisAt(H, new Vector3());
  return {
    spec,
    radiusAt,
    surfaceAt,
    pointAt,
    normalAt,
    axisAt,
    groundY,
    top,
    topRadius: rMean(1),
    roots,
    rootAngles,
    rootTips,
    surfaceUnits: [Math.PI * 2 * rMean(0.5), H],
    rMean,
    lobeAmp,
    twistAt: (y) => spec.twist * Math.max(0, Math.min(1.1, y / H)),
  };
}

/** Ground-following height helper for a snow drift profile (exported for tests). */
export function driftHeight(r: number, rIn: number, rOut: number, peak: number): number {
  const q = smooth01((r - rIn) / Math.max(1e-3, rOut - rIn));
  return peak * Math.pow(1 - q, 1.6) - 0.9 * smooth01((r - rOut * 0.82) / (rOut * 0.18));
}
