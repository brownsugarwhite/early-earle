import type { Vec3 } from '../math/vec';
import { tetraGradient } from '../sdf/scene';
import type { ContourOptions, RawContour, Sdf } from './surfaceNets';

/**
 * Dual Contouring mit QEF: ein Vertex je Zelle mit Vorzeichenwechsel, gesetzt als Punkt mit kleinstem quadratischem
 * Abstand zu den Tangentialebenen der Kantenschnitte (Hermite-Daten: Schnittpunkt + SDF-Gradient). Glatte Flächen
 * bleiben glatt (kein Gitterrauschen, keine Glättung nötig), **Kanten bleiben scharf** (Maullinie, Augenwülste,
 * Standkante). Zusätzlich je Vertex ein Kantenmaß (0 glatt … 1 scharfe Kante) für die Normalenwahl im Shader.
 */
export interface DcContour extends RawContour {
  /** Kantenmaß je Vertex. */
  crease: Float32Array;
  /** Mittlere Normale der Kantenschnitte je Vertex (Einheit). */
  normals: Float32Array;
}

const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/** Löst das regularisierte 3×3-Normalgleichungssystem der QEF (Cholesky-frei über Cramer, λ zieht zum Massepunkt). */
function solveQef(A: Float64Array, b: Float64Array, mass: Vec3, lambda: number, out: Vec3): void {
  const a00 = A[0]! + lambda, a01 = A[1]!, a02 = A[2]!;
  const a11 = A[4]! + lambda, a12 = A[5]!;
  const a22 = A[8]! + lambda;
  const b0 = b[0]! + lambda * mass[0], b1 = b[1]! + lambda * mass[1], b2 = b[2]! + lambda * mass[2];
  const det = a00 * (a11 * a22 - a12 * a12) - a01 * (a01 * a22 - a12 * a02) + a02 * (a01 * a12 - a11 * a02);
  if (Math.abs(det) < 1e-18) {
    out[0] = mass[0];
    out[1] = mass[1];
    out[2] = mass[2];
    return;
  }
  const inv = 1 / det;
  out[0] = (b0 * (a11 * a22 - a12 * a12) - a01 * (b1 * a22 - a12 * b2) + a02 * (b1 * a12 - a11 * b2)) * inv;
  out[1] = (a00 * (b1 * a22 - a12 * b2) - b0 * (a01 * a22 - a12 * a02) + a02 * (a01 * b2 - b1 * a02)) * inv;
  out[2] = (a00 * (a11 * b2 - b1 * a12) - a01 * (a01 * b2 - b1 * a02) + b0 * (a01 * a12 - a11 * a02)) * inv;
}

/**
 * Gitterlauf wie bei den Surface Nets (Narrow-Band), aber Vertexlage per QEF. `gradientEps` = Schrittweite für den
 * Gradienten an den Kantenschnitten (≈ 0,2 Zellen).
 */
export function contourDual(sdf: Sdf, opts: ContourOptions & { gradientEps?: number; lambda?: number }): DcContour {
  const cell = opts.cell;
  const shift = opts.shift ?? 0;
  const pad = cell * (2 + shift);
  const minX = opts.min[0] - pad, minY = opts.min[1] - pad, minZ = opts.min[2] - pad;
  const nx = Math.ceil((opts.max[0] + pad - minX) / cell) + 1;
  const ny = Math.ceil((opts.max[1] + pad - minY) / cell) + 1;
  const nz = Math.ceil((opts.max[2] + pad - minZ) / cell) + 1;
  const val = sampleGrid(sdf, minX, minY, minZ, nx, ny, nz, cell, opts.narrowBand !== false);
  const at = (i: number, j: number, k: number): number => (k * ny + j) * nx + i;
  const cells = (nx - 1) * (ny - 1) * (nz - 1);
  const cellAt = (i: number, j: number, k: number): number => (k * (ny - 1) + j) * (nx - 1) + i;
  const cellVert = new Int32Array(cells).fill(-1);
  const pos: number[] = [];
  const nrm: number[] = [];
  const crease: number[] = [];
  const corner = new Float32Array(8);
  const eps = opts.gradientEps ?? cell * 0.2;
  const lambda = (opts.lambda ?? 0.08) * 1; // relativ: Normalen sind Einheitsvektoren → A hat Einträge O(1)
  const A = new Float64Array(9);
  const bv = new Float64Array(3);
  const g: Vec3 = [0, 0, 0];
  const p: Vec3 = [0, 0, 0];
  const q: Vec3 = [0, 0, 0];
  const mass: Vec3 = [0, 0, 0];
  const normalsTmp: number[] = [];
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          const v = val[at(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]!;
          corner[c] = v;
          if (v < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        A.fill(0);
        bv.fill(0);
        mass[0] = mass[1] = mass[2] = 0;
        normalsTmp.length = 0;
        let cnt = 0;
        let nAvgX = 0, nAvgY = 0, nAvgZ = 0;
        for (const [a, b] of EDGES) {
          const va = corner[a]!, vb = corner[b]!;
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1;
          const bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1;
          p[0] = minX + (i + ax + (bx - ax) * t) * cell;
          p[1] = minY + (j + ay + (by - ay) * t) * cell;
          p[2] = minZ + (k + az + (bz - az) * t) * cell;
          tetraGradient(sdf, p, eps, g);
          const gl = Math.hypot(g[0], g[1], g[2]) || 1;
          const n0 = g[0] / gl, n1 = g[1] / gl, n2 = g[2] / gl;
          A[0]! += n0 * n0; A[1]! += n0 * n1; A[2]! += n0 * n2;
          A[4]! += n1 * n1; A[5]! += n1 * n2; A[8]! += n2 * n2;
          const d = n0 * p[0] + n1 * p[1] + n2 * p[2];
          bv[0]! += n0 * d; bv[1]! += n1 * d; bv[2]! += n2 * d;
          mass[0] += p[0]; mass[1] += p[1]; mass[2] += p[2];
          nAvgX += n0; nAvgY += n1; nAvgZ += n2;
          normalsTmp.push(n0, n1, n2);
          cnt++;
        }
        if (cnt === 0) continue;
        mass[0] /= cnt; mass[1] /= cnt; mass[2] /= cnt;
        solveQef(A, bv, mass, lambda * cnt, q);
        // in die (leicht vergrößerte) Zelle klemmen
        const cx0 = minX + (i - 0.25) * cell, cx1 = minX + (i + 1.25) * cell;
        const cy0 = minY + (j - 0.25) * cell, cy1 = minY + (j + 1.25) * cell;
        const cz0 = minZ + (k - 0.25) * cell, cz1 = minZ + (k + 1.25) * cell;
        q[0] = Math.min(cx1, Math.max(cx0, q[0]));
        q[1] = Math.min(cy1, Math.max(cy0, q[1]));
        q[2] = Math.min(cz1, Math.max(cz0, q[2]));
        // Kantenmaß: kleinstes Skalarprodukt der Schnittnormalen; 0 bis 45° Normalenunterschied (glatte Krümmung in einer
        // Zelle), 1 ab 90° (Maulschnitt, Wulstkante, Standkante)
        let minDot = 1;
        for (let a = 0; a < cnt; a++)
          for (let b = a + 1; b < cnt; b++) {
            const d = normalsTmp[a * 3]! * normalsTmp[b * 3]! + normalsTmp[a * 3 + 1]! * normalsTmp[b * 3 + 1]! + normalsTmp[a * 3 + 2]! * normalsTmp[b * 3 + 2]!;
            if (d < minDot) minDot = d;
          }
        const cr = Math.min(1, Math.max(0, (0.7071 - minDot) / 0.7071));
        const nl = Math.hypot(nAvgX, nAvgY, nAvgZ) || 1;
        cellVert[cellAt(i, j, k)] = pos.length / 3;
        pos.push(q[0], q[1], q[2]);
        nrm.push(nAvgX / nl, nAvgY / nl, nAvgZ / nl);
        crease.push(cr);
      }
    }
  }
  const tris: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tris.push(a, c, b, a, d, c);
    else tris.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const v0 = val[at(i, j, k)]!, v1 = val[at(i + 1, j, k)]!;
        if (v0 < 0 === v1 < 0) continue;
        quad(cellVert[cellAt(i, j - 1, k - 1)]!, cellVert[cellAt(i, j, k - 1)]!, cellVert[cellAt(i, j, k)]!, cellVert[cellAt(i, j - 1, k)]!, v0 >= 0);
      }
  for (let k = 1; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v0 = val[at(i, j, k)]!, v1 = val[at(i, j + 1, k)]!;
        if (v0 < 0 === v1 < 0) continue;
        quad(cellVert[cellAt(i - 1, j, k - 1)]!, cellVert[cellAt(i - 1, j, k)]!, cellVert[cellAt(i, j, k)]!, cellVert[cellAt(i, j, k - 1)]!, v0 >= 0);
      }
  for (let k = 0; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v0 = val[at(i, j, k)]!, v1 = val[at(i, j, k + 1)]!;
        if (v0 < 0 === v1 < 0) continue;
        quad(cellVert[cellAt(i - 1, j - 1, k)]!, cellVert[cellAt(i, j - 1, k)]!, cellVert[cellAt(i, j, k)]!, cellVert[cellAt(i - 1, j, k)]!, v0 >= 0);
      }
  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), crease: new Float32Array(crease), index: new Uint32Array(tris), vertexCount: pos.length / 3 };
}

/** Gitterwerte mit Narrow-Band (identisch zu den Surface Nets). */
function sampleGrid(sdf: Sdf, minX: number, minY: number, minZ: number, nx: number, ny: number, nz: number, cell: number, narrowBand: boolean): Float32Array {
  const val = new Float32Array(nx * ny * nz);
  const at = (i: number, j: number, k: number): number => (k * ny + j) * nx + i;
  const p: Vec3 = [0, 0, 0];
  const B = narrowBand ? 4 : 1_000_000;
  const cbx = Math.ceil((nx - 1) / B) + 1, cby = Math.ceil((ny - 1) / B) + 1, cbz = Math.ceil((nz - 1) / B) + 1;
  const coarse = new Float32Array(cbx * cby * cbz);
  const cat = (i: number, j: number, k: number): number => (k * cby + j) * cbx + i;
  for (let k = 0; k < cbz; k++) {
    p[2] = minZ + Math.min(k * B, nz - 1) * cell;
    for (let j = 0; j < cby; j++) {
      p[1] = minY + Math.min(j * B, ny - 1) * cell;
      for (let i = 0; i < cbx; i++) {
        p[0] = minX + Math.min(i * B, nx - 1) * cell;
        coarse[cat(i, j, k)] = sdf(p);
      }
    }
  }
  const far = cell * (B * 0.87 * 1.7 + 2.0);
  const c8 = new Float32Array(8);
  for (let bk = 0; bk < cbz - 1; bk++)
    for (let bj = 0; bj < cby - 1; bj++)
      for (let bi = 0; bi < cbx - 1; bi++) {
        let allFar = true;
        let sign = 0;
        for (let c = 0; c < 8; c++) {
          const v = coarse[cat(bi + (c & 1), bj + ((c >> 1) & 1), bk + ((c >> 2) & 1))]!;
          c8[c] = v;
          const s = v < 0 ? -1 : 1;
          if (sign === 0) sign = s;
          if (s !== sign || Math.abs(v) <= far) allFar = false;
        }
        const i0 = bi * B, j0 = bj * B, k0 = bk * B;
        const i1 = Math.min(i0 + B, nx - 1), j1 = Math.min(j0 + B, ny - 1), k1 = Math.min(k0 + B, nz - 1);
        const spanI = Math.max(1, Math.min(B, nx - 1 - i0)), spanJ = Math.max(1, Math.min(B, ny - 1 - j0)), spanK = Math.max(1, Math.min(B, nz - 1 - k0));
        for (let k = k0; k <= k1; k++) {
          const fz = (k - k0) / spanK;
          for (let j = j0; j <= j1; j++) {
            const fy = (j - j0) / spanJ;
            for (let i = i0; i <= i1; i++) {
              const idx = at(i, j, k);
              if (allFar) {
                const fx = (i - i0) / spanI;
                const x00 = c8[0]! + (c8[1]! - c8[0]!) * fx, x10 = c8[2]! + (c8[3]! - c8[2]!) * fx;
                const x01 = c8[4]! + (c8[5]! - c8[4]!) * fx, x11 = c8[6]! + (c8[7]! - c8[6]!) * fx;
                const y0 = x00 + (x10 - x00) * fy, y1 = x01 + (x11 - x01) * fy;
                val[idx] = y0 + (y1 - y0) * fz;
              } else {
                p[0] = minX + i * cell;
                p[1] = minY + j * cell;
                p[2] = minZ + k * cell;
                val[idx] = sdf(p);
              }
            }
          }
        }
      }
  return val;
}
