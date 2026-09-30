import { Vector3 } from 'three/webgpu';

/**
 * Centreline of a tube (limb, branch, root): samples evenly spaced by arc length, radius and cumulative length per
 * sample. Pure data — the wood mesh, the lace, the path and the collision volumes all read the same curves.
 */
export interface TubeCurve {
  points: Vector3[];
  radii: number[];
  /** Cumulative arc length at each sample (lengths[0] = 0). */
  lengths: number[];
}

/** Centripetal Catmull-Rom through `ctrl` (no cusps or self-loops), `perSpan` samples per span. */
export function catmullRom(ctrl: Vector3[], perSpan = 16): Vector3[] {
  if (ctrl.length < 2) return ctrl.map((p) => p.clone());
  const pts = [ctrl[0]!.clone().multiplyScalar(2).sub(ctrl[1]!), ...ctrl, ctrl[ctrl.length - 1]!.clone().multiplyScalar(2).sub(ctrl[ctrl.length - 2]!)];
  const out: Vector3[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2]!;
    const t0 = 0;
    const t1 = t0 + Math.sqrt(Math.max(1e-6, p0.distanceTo(p1)));
    const t2 = t1 + Math.sqrt(Math.max(1e-6, p1.distanceTo(p2)));
    const t3 = t2 + Math.sqrt(Math.max(1e-6, p2.distanceTo(p3)));
    const last = i === pts.length - 3;
    for (let k = 0; k < perSpan + (last ? 1 : 0); k++) {
      const t = t1 + ((t2 - t1) * k) / perSpan;
      const a1 = p0.clone().multiplyScalar((t1 - t) / (t1 - t0)).addScaledVector(p1, (t - t0) / (t1 - t0));
      const a2 = p1.clone().multiplyScalar((t2 - t) / (t2 - t1)).addScaledVector(p2, (t - t1) / (t2 - t1));
      const a3 = p2.clone().multiplyScalar((t3 - t) / (t3 - t2)).addScaledVector(p3, (t - t2) / (t3 - t2));
      const b1 = a1.multiplyScalar((t2 - t) / (t2 - t0)).addScaledVector(a2, (t - t0) / (t2 - t0));
      const b2 = a2.clone().multiplyScalar((t3 - t) / (t3 - t1)).addScaledVector(a3, (t - t1) / (t3 - t1));
      out.push(b1.multiplyScalar((t2 - t) / (t2 - t1)).addScaledVector(b2, (t - t1) / (t2 - t1)));
    }
  }
  return out;
}

export function cumulativeLengths(points: Vector3[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1]! + points[i]!.distanceTo(points[i - 1]!));
  return out;
}

/** Resample a polyline to (almost) equal steps of at most `step` (keeps both ends). */
export function resample(points: Vector3[], step: number): Vector3[] {
  const L = cumulativeLengths(points);
  const total = L[L.length - 1]!;
  const n = Math.max(1, Math.ceil(total / step));
  const out: Vector3[] = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * total;
    while (j < L.length - 2 && L[j + 1]! < s) j++;
    const a = points[j]!;
    const b = points[j + 1] ?? a;
    const seg = L[j + 1]! - L[j]!;
    const f = seg > 1e-9 ? (s - L[j]!) / seg : 0;
    out.push(a.clone().lerp(b, Math.min(1, Math.max(0, f))));
  }
  return out;
}

/** Tube curve from control points: smooth, resampled by `step`, radius from `radius(u)` with u = s / length. */
export function makeTube(ctrl: Vector3[], step: number, radius: (u: number, s: number) => number): TubeCurve {
  const points = resample(catmullRom(ctrl, 24), step);
  const lengths = cumulativeLengths(points);
  const total = lengths[lengths.length - 1]! || 1;
  return { points, lengths, radii: lengths.map((s) => radius(s / total, s)) };
}

export function tubeLength(c: TubeCurve): number {
  return c.lengths[c.lengths.length - 1] ?? 0;
}

/** Index and fraction of arc length `s` on a tube. */
function locate(c: TubeCurve, s: number): { i: number; f: number } {
  const L = c.lengths;
  const x = Math.min(L[L.length - 1]!, Math.max(0, s));
  let lo = 0;
  let hi = L.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (L[mid]! <= x) lo = mid;
    else hi = mid;
  }
  const seg = L[hi]! - L[lo]!;
  return { i: lo, f: seg > 1e-9 ? (x - L[lo]!) / seg : 0 };
}

export function tubePointAt(c: TubeCurve, s: number, out = new Vector3()): Vector3 {
  const { i, f } = locate(c, s);
  const b = c.points[Math.min(c.points.length - 1, i + 1)]!;
  return out.copy(c.points[i]!).lerp(b, f);
}

export function tubeRadiusAt(c: TubeCurve, s: number): number {
  const { i, f } = locate(c, s);
  const b = c.radii[Math.min(c.radii.length - 1, i + 1)]!;
  return c.radii[i]! + (b - c.radii[i]!) * f;
}

export function tubeTangentAt(c: TubeCurve, s: number, out = new Vector3()): Vector3 {
  const { i } = locate(c, s);
  const a = c.points[Math.max(0, Math.min(c.points.length - 2, i))]!;
  const b = c.points[Math.max(1, Math.min(c.points.length - 1, i + 1))]!;
  return out.subVectors(b, a).normalize();
}

/**
 * Rotation-minimising frames along a polyline (parallel transport): tangent T, normal N, binormal B per sample.
 * The first normal is chosen perpendicular to T and as close to `up` as possible, so ring vertex 0 lies on the
 * upper side of a limb (bark patterns and snow line up with the top).
 */
export function transportFrames(points: Vector3[], up = new Vector3(0, 1, 0)): { T: Vector3[]; N: Vector3[]; B: Vector3[] } {
  const n = points.length;
  const T: Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(n - 1, i + 1)]!;
    const t = new Vector3().subVectors(b, a);
    T.push(t.lengthSq() > 1e-12 ? t.normalize() : new Vector3(0, 1, 0));
  }
  const N: Vector3[] = [];
  const B: Vector3[] = [];
  let n0 = up.clone().addScaledVector(T[0]!, -up.dot(T[0]!));
  if (n0.lengthSq() < 1e-6) n0 = new Vector3(1, 0, 0).addScaledVector(T[0]!, -T[0]!.x);
  n0.normalize();
  N.push(n0);
  B.push(new Vector3().crossVectors(T[0]!, n0).normalize());
  for (let i = 1; i < n; i++) {
    const prevN = N[i - 1]!;
    const t0 = T[i - 1]!;
    const t1 = T[i]!;
    const axis = new Vector3().crossVectors(t0, t1);
    const s = axis.length();
    let ni = prevN.clone();
    if (s > 1e-6) {
      const ang = Math.atan2(s, Math.min(1, Math.max(-1, t0.dot(t1))));
      ni.applyAxisAngle(axis.divideScalar(s), ang);
    }
    ni.addScaledVector(t1, -ni.dot(t1)).normalize();
    if (!Number.isFinite(ni.x)) ni = prevN.clone();
    N.push(ni);
    B.push(new Vector3().crossVectors(t1, ni).normalize());
  }
  return { T, N, B };
}

/** Smoothstep 0..1. */
export function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Wrap an angle to (−π, π]. */
export function wrapAngle(a: number): number {
  const t = (a + Math.PI) % (Math.PI * 2);
  return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
}

/**
 * Surface point of a tube at arc length s on its flank: `angle` (rad) away from the top towards the horizontal side
 * `side` (the perpendicular that points most along it). Returns the point and the outward normal.
 */
export function tubeFlank(c: TubeCurve, s: number, side: Vector3, angle: number, outP: Vector3, outN: Vector3): void {
  tubePointAt(c, s, outP);
  const r = tubeRadiusAt(c, s);
  const t = tubeTangentAt(c, s, new Vector3());
  const up = new Vector3(0, 1, 0).addScaledVector(t, -t.y);
  if (up.lengthSq() < 1e-6) up.set(1, 0, 0);
  up.normalize();
  const b = new Vector3().crossVectors(t, up).normalize();
  if (b.dot(side) < 0) b.negate();
  outN.copy(up).multiplyScalar(Math.cos(angle)).addScaledVector(b, Math.sin(angle)).normalize();
  outP.addScaledVector(outN, r);
}
