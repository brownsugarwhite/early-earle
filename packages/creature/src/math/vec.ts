/** Kleine Vektor- und Quaternion-Helfer (Tupel, ohne three.js), für SDF-Aufbau, Deskriptoren und Skelett. */

export type Vec3 = [number, number, number];
/** Quaternion xyzw. */
export type Quat = [number, number, number, number];

export const v3 = (x = 0, y = 0, z = 0): Vec3 => [x, y, z];
export const add = (a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Readonly<Vec3>, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Readonly<Vec3>, b: Readonly<Vec3>): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Readonly<Vec3>, b: Readonly<Vec3>): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Readonly<Vec3>): number => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: Readonly<Vec3>, b: Readonly<Vec3>): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function normalize(a: Readonly<Vec3>): Vec3 {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const mixV = (a: Readonly<Vec3>, b: Readonly<Vec3>, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const clamp01 = (x: number): number => clamp(x, 0, 1);
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-9));
  return t * t * (3 - 2 * t);
}
/** Polynomiales Smooth-Minimum (Quilez), identisch mit dem TSL-Zwilling im Renderer. */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
/** Smooth-Maximum (Schnitt bzw. Subtraktion mit weicher Kante). */
export const smax = (a: number, b: number, k: number): number => -smin(-a, -b, k);

export const QUAT_ID: Quat = [0, 0, 0, 1];
export function quatFromAxisAngle(axis: Readonly<Vec3>, angle: number): Quat {
  const n = normalize(axis);
  const s = Math.sin(angle / 2);
  return [n[0] * s, n[1] * s, n[2] * s, Math.cos(angle / 2)];
}
/** Kürzeste Drehung, die Einheitsvektor a auf Einheitsvektor b bringt. */
export function quatFromTo(a: Readonly<Vec3>, b: Readonly<Vec3>): Quat {
  const d = dot(a, b);
  let x = a[1] * b[2] - a[2] * b[1];
  let y = a[2] * b[0] - a[0] * b[2];
  let z = a[0] * b[1] - a[1] * b[0];
  let w = 1 + d;
  if (w < 1e-6) {
    // entgegengesetzt: beliebige Achse senkrecht zu a (halbe Drehung)
    if (Math.abs(a[0]) < 0.9) {
      x = 0;
      y = -a[2];
      z = a[1];
    } else {
      x = -a[2];
      y = 0;
      z = a[0];
    }
    w = 0;
  }
  const l = Math.hypot(x, y, z, w) || 1;
  return [x / l, y / l, z / l, w / l];
}
export function quatMul(a: Readonly<Quat>, b: Readonly<Quat>): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}
export function quatConj(q: Readonly<Quat>): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}
export function rotate(q: Readonly<Quat>, v: Readonly<Vec3>): Vec3 {
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  return [v[0] + qw * tx + (qy * tz - qz * ty), v[1] + qw * ty + (qz * tx - qx * tz), v[2] + qw * tz + (qx * ty - qy * tx)];
}
/** Quaternion aus orthonormalem Rahmen (Spalten x, y, z). */
export function quatFromFrame(x: Readonly<Vec3>, y: Readonly<Vec3>, z: Readonly<Vec3>): Quat {
  const m00 = x[0], m01 = y[0], m02 = z[0];
  const m10 = x[1], m11 = y[1], m12 = z[1];
  const m20 = x[2], m21 = y[2], m22 = z[2];
  const tr = m00 + m11 + m22;
  let q: Quat;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    q = [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    q = [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    q = [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
/** Orthonormaler Rahmen aus einer Tangente (z) und einem bevorzugten Oben (y). */
export function frameFromTangent(t: Readonly<Vec3>, up: Readonly<Vec3> = [0, 1, 0]): { x: Vec3; y: Vec3; z: Vec3 } {
  const z = normalize(t);
  let x = cross(up, z);
  if (length(x) < 1e-4) x = cross([1, 0, 0], z);
  x = normalize(x);
  const y = normalize(cross(z, x));
  return { x, y, z };
}
