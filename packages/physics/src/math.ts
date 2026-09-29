import type { Vec3 } from './types';

export const v3 = (x = 0, y = 0, z = 0): Vec3 => [x, y, z];
export const len3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function norm3(a: Vec3): Vec3 {
  const l = len3(a);
  return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 1, 0];
}

/** Row-major 3x3 matrix as a flat array. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export const mat3Identity = (): Mat3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mat3Mul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9).fill(0) as Mat3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!;
  return r;
}

export function mat3Transpose(a: Mat3): Mat3 {
  return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
}

export function mat3Det(a: Mat3): number {
  return a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]);
}

export function mat3Inverse(a: Mat3): Mat3 | null {
  const det = mat3Det(a);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    (a[4] * a[8] - a[5] * a[7]) * inv,
    (a[2] * a[7] - a[1] * a[8]) * inv,
    (a[1] * a[5] - a[2] * a[4]) * inv,
    (a[5] * a[6] - a[3] * a[8]) * inv,
    (a[0] * a[8] - a[2] * a[6]) * inv,
    (a[2] * a[3] - a[0] * a[5]) * inv,
    (a[3] * a[7] - a[4] * a[6]) * inv,
    (a[1] * a[6] - a[0] * a[7]) * inv,
    (a[0] * a[4] - a[1] * a[3]) * inv,
  ];
}

export function mat3MulVec(a: Mat3, v: Vec3): Vec3 {
  return [
    a[0] * v[0] + a[1] * v[1] + a[2] * v[2],
    a[3] * v[0] + a[4] * v[1] + a[5] * v[2],
    a[6] * v[0] + a[7] * v[1] + a[8] * v[2],
  ];
}

/**
 * Eigen-decomposition of a symmetric 3x3 matrix (cyclic Jacobi). Returns eigenvalues and the
 * matrix whose columns are the corresponding unit eigenvectors.
 */
export function symEigen3(s: Mat3): { values: Vec3; vectors: Mat3 } {
  const a: Mat3 = [...s] as Mat3;
  const v = mat3Identity();
  for (let sweep = 0; sweep < 12; sweep++) {
    const off = a[1] * a[1] + a[2] * a[2] + a[5] * a[5];
    if (off < 1e-18) break;
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      const apq = a[p * 3 + q]!;
      if (Math.abs(apq) < 1e-15) continue;
      const app = a[p * 3 + p]!;
      const aqq = a[q * 3 + q]!;
      const theta = (aqq - app) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const sn = t * c;
      // Rotate rows/cols p and q of `a` and accumulate the rotation into `v`.
      for (let k = 0; k < 3; k++) {
        const akp = a[k * 3 + p]!;
        const akq = a[k * 3 + q]!;
        a[k * 3 + p] = c * akp - sn * akq;
        a[k * 3 + q] = sn * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p * 3 + k]!;
        const aqk = a[q * 3 + k]!;
        a[p * 3 + k] = c * apk - sn * aqk;
        a[q * 3 + k] = sn * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k * 3 + p]!;
        const vkq = v[k * 3 + q]!;
        v[k * 3 + p] = c * vkp - sn * vkq;
        v[k * 3 + q] = sn * vkp + c * vkq;
      }
    }
  }
  return { values: [a[0], a[4], a[8]], vectors: v };
}

/**
 * Polar decomposition A = R·S via S = sqrt(AᵀA). Returns the rotation R and the symmetric stretch S.
 * Falls back to identity when A is degenerate.
 */
export function polarDecompose(a: Mat3): { r: Mat3; s: Mat3 } {
  const ata = mat3Mul(mat3Transpose(a), a);
  const { values, vectors } = symEigen3(ata);
  const sq = values.map((x) => Math.sqrt(Math.max(x, 1e-12))) as Vec3;
  const vt = mat3Transpose(vectors);
  const d: Mat3 = [sq[0], 0, 0, 0, sq[1], 0, 0, 0, sq[2]];
  const s = mat3Mul(mat3Mul(vectors, d), vt);
  const dInv: Mat3 = [1 / sq[0], 0, 0, 0, 1 / sq[1], 0, 0, 0, 1 / sq[2]];
  const sInv = mat3Mul(mat3Mul(vectors, dInv), vt);
  const r = mat3Mul(a, sInv);
  if (!r.every(Number.isFinite)) return { r: mat3Identity(), s: mat3Identity() };
  return { r, s };
}
