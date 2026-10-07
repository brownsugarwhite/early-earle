import type { Vec3 } from '../math/vec';
import { tetraGradient } from '../sdf/scene';

/**
 * Naive Surface Nets auf einem regelmäßigen Gitter: ein Vertex je Zelle mit Vorzeichenwechsel (Mittel der Kantenschnitte),
 * ein Viereck je Gitterkante mit Vorzeichenwechsel. Danach: Projektion auf die Fläche, Taubin-Glättung (Gitterrauschen
 * weg, Form bleibt), größte Zusammenhangskomponente, Normalen aus dem SDF-Gradienten. Herkunft: `render/creature/bodyMesh.ts`
 * (Prototyp), verallgemeinert auf eine beliebige Abstandsfunktion.
 */
export type Sdf = (p: Readonly<Vec3>) => number;

export interface ContourOptions {
  min: Vec3;
  max: Vec3;
  /** Zellgröße. */
  cell: number;
  /** Gitterverschiebung in Zellanteilen (gegen Pinch-Vertices). */
  shift?: number;
  /** Narrow-Band-Auswertung (Standard an); aus = jede Zelle exakt (Vergleichstests). */
  narrowBand?: boolean;
}

export interface RawContour {
  positions: Float32Array;
  index: Uint32Array;
  vertexCount: number;
}

const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7], // x
  [0, 2], [1, 3], [4, 6], [5, 7], // y
  [0, 4], [1, 5], [2, 6], [3, 7], // z
];

/** Gitterdurchlauf (Vertices je Zelle, Vierecke je Kante). */
export function contour(sdf: Sdf, opts: ContourOptions): RawContour {
  const cell = opts.cell;
  const shift = opts.shift ?? 0;
  const pad = cell * (2 + shift);
  const minX = opts.min[0] - pad, minY = opts.min[1] - pad, minZ = opts.min[2] - pad;
  const nx = Math.ceil((opts.max[0] + pad - minX) / cell) + 1;
  const ny = Math.ceil((opts.max[1] + pad - minY) / cell) + 1;
  const nz = Math.ceil((opts.max[2] + pad - minZ) / cell) + 1;
  const val = new Float32Array(nx * ny * nz);
  const at = (i: number, j: number, k: number): number => (k * ny + j) * nx + i;
  const p: Vec3 = [0, 0, 0];
  // Narrow Band: grobe Blöcke von B Zellen; liegt die Fläche sicher nicht im Block (|d| an allen Ecken größer als die
  // halbe Blockdiagonale plus eine Zelle, gleiches Vorzeichen), werden die feinen Werte trilinear interpoliert statt
  // ausgewertet. Nur Zellen nahe der Fläche kosten echte SDF-Auswertungen.
  const B = opts.narrowBand === false ? 1_000_000 : 4;
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
  // Sicherheitsrand: unsere Abstände sind Schranken, keine exakten Distanzen (Smooth-Min, Ellipsoid-Näherung,
  // Superellipse, Scherung) — deshalb deutlich mehr als die halbe Blockdiagonale
  const far = cell * (B * 0.87 * 1.7 + 2.0);
  const c8 = new Float32Array(8);
  for (let bk = 0; bk < cbz - 1; bk++) {
    for (let bj = 0; bj < cby - 1; bj++) {
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
              } else if ((i - i0) % B === 0 && (j - j0) % B === 0 && (k - k0) % B === 0 && i < nx && j < ny && k < nz && (i === i0 || i === i1) && (j === j0 || j === j1) && (k === k0 || k === k1)) {
                // Blockecke: Wert liegt schon vor
                val[idx] = coarse[cat(bi + (i === i1 && i1 === i0 + B ? 1 : i === i0 ? 0 : 1), bj + (j === j1 && j1 === j0 + B ? 1 : j === j0 ? 0 : 1), bk + (k === k1 && k1 === k0 + B ? 1 : k === k0 ? 0 : 1))]!;
                if (i === i1 && i1 !== i0 + B) {
                  p[0] = minX + i * cell;
                  p[1] = minY + j * cell;
                  p[2] = minZ + k * cell;
                  val[idx] = sdf(p);
                }
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
    }
  }
  const cells = (nx - 1) * (ny - 1) * (nz - 1);
  const cellAt = (i: number, j: number, k: number): number => (k * (ny - 1) + j) * (nx - 1) + i;
  const cellVert = new Int32Array(cells).fill(-1);
  const pos: number[] = [];
  const corner = new Float32Array(8);
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
        let sx = 0, sy = 0, sz = 0, cnt = 0;
        for (const [a, b] of EDGES) {
          const va = corner[a]!, vb = corner[b]!;
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1;
          const bx = b & 1, by = (b >> 1) & 1, bz = (b >> 2) & 1;
          sx += ax + (bx - ax) * t;
          sy += ay + (by - ay) * t;
          sz += az + (bz - az) * t;
          cnt++;
        }
        cellVert[cellAt(i, j, k)] = pos.length / 3;
        pos.push(minX + (i + sx / cnt) * cell, minY + (j + sy / cnt) * cell, minZ + (k + sz / cnt) * cell);
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
  return { positions: new Float32Array(pos), index: new Uint32Array(tris), vertexCount: pos.length / 3 };
}

/** Kanten, die nicht genau zwei Dreiecke teilen (0 = geschlossene 2-Mannigfaltigkeit). */
export function nonManifoldEdges(index: ArrayLike<number>, vertexCount: number): number {
  const edges = new Map<number, number>();
  for (let t = 0; t < index.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = index[t + e]!, b = index[t + ((e + 1) % 3)]!;
      const key = Math.min(a, b) * vertexCount + Math.max(a, b);
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const c of edges.values()) if (c !== 2) bad++;
  return bad;
}

const GRID_SHIFTS = [0, 0.5];

/**
 * Probiert bis zu zwei Gitterverschiebungen, bis die Kontur (fast) eine saubere 2-Mannigfaltigkeit ist — wenige
 * Pinch-Kanten sind erlaubt (jeder Versuch kostet einen Gitterlauf). `acceptBad`: so viele schlechte Kanten gelten als ok.
 */
export function contourManifold(sdf: Sdf, opts: Omit<ContourOptions, 'shift'>, acceptBad = 6): RawContour {
  let best: RawContour | null = null;
  let bestBad = Infinity;
  for (const shift of GRID_SHIFTS) {
    const c = contour(sdf, { ...opts, shift });
    const bad = nonManifoldEdges(c.index, c.vertexCount);
    if (bad < bestBad) {
      best = c;
      bestBad = bad;
    }
    if (bad <= acceptBad) break;
  }
  return best!;
}

/** Behält nur die größte Zusammenhangskomponente (Splitter weg); `extras` (je Vertex `size` Werte) werden mit umsortiert. */
export function largestComponent<T extends RawContour>(raw: T, extras: Array<{ array: Float32Array; size: number }> = []): T {
  const n = raw.vertexCount;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (a: number): number => {
    let r = a;
    while (parent[r] !== r) r = parent[r]!;
    while (parent[a] !== r) {
      const nx = parent[a]!;
      parent[a] = r;
      a = nx;
    }
    return r;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const idx = raw.index;
  for (let t = 0; t < idx.length; t += 3) {
    union(idx[t]!, idx[t + 1]!);
    union(idx[t]!, idx[t + 2]!);
  }
  const count = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    count.set(r, (count.get(r) ?? 0) + 1);
  }
  let bestRoot = -1, bestCount = -1;
  for (const [r, c] of count) if (c > bestCount) {
    bestRoot = r;
    bestCount = c;
  }
  if (count.size <= 1) return raw;
  const remap = new Int32Array(n).fill(-1);
  const pos: number[] = [];
  const extraOut = extras.map(() => [] as number[]);
  for (let i = 0; i < n; i++) {
    if (find(i) !== bestRoot) continue;
    remap[i] = pos.length / 3;
    pos.push(raw.positions[i * 3]!, raw.positions[i * 3 + 1]!, raw.positions[i * 3 + 2]!);
    extras.forEach((e, k) => {
      for (let c = 0; c < e.size; c++) extraOut[k]!.push(e.array[i * e.size + c]!);
    });
  }
  const tris: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = remap[idx[t]!]!, b = remap[idx[t + 1]!]!, c = remap[idx[t + 2]!]!;
    if (a < 0 || b < 0 || c < 0) continue;
    tris.push(a, b, c);
  }
  extras.forEach((e, k) => {
    e.array = new Float32Array(extraOut[k]!);
  });
  return { ...raw, positions: new Float32Array(pos), index: new Uint32Array(tris), vertexCount: pos.length / 3 };
}

/** Nachbarschaftslisten (CSR) aus dem Index. */
export function adjacency(index: ArrayLike<number>, vertexCount: number): { offsets: Uint32Array; neighbours: Uint32Array } {
  const deg = new Uint32Array(vertexCount);
  const pairs: number[] = [];
  const seen = new Set<number>();
  const addEdge = (a: number, b: number): void => {
    const key = Math.min(a, b) * vertexCount + Math.max(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(a, b);
    deg[a]!++;
    deg[b]!++;
  };
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]!, b = index[t + 1]!, c = index[t + 2]!;
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  }
  const offsets = new Uint32Array(vertexCount + 1);
  for (let i = 0; i < vertexCount; i++) offsets[i + 1] = offsets[i]! + deg[i]!;
  const fill = new Uint32Array(vertexCount);
  const neighbours = new Uint32Array(offsets[vertexCount]!);
  for (let e = 0; e < pairs.length; e += 2) {
    const a = pairs[e]!, b = pairs[e + 1]!;
    neighbours[offsets[a]! + fill[a]!++] = b;
    neighbours[offsets[b]! + fill[b]!++] = a;
  }
  return { offsets, neighbours };
}

/** Taubin-Glättung (λ/μ), erhält das Volumen besser als reine Laplace-Glättung. */
export function taubin(positions: Float32Array, adj: { offsets: Uint32Array; neighbours: Uint32Array }, iterations = 6, lambda = 0.5, mu = -0.53): void {
  const n = positions.length / 3;
  const tmp = new Float32Array(positions.length);
  const pass = (f: number): void => {
    for (let v = 0; v < n; v++) {
      const s = adj.offsets[v]!, e = adj.offsets[v + 1]!;
      const cnt = e - s;
      if (cnt === 0) {
        tmp[v * 3] = positions[v * 3]!;
        tmp[v * 3 + 1] = positions[v * 3 + 1]!;
        tmp[v * 3 + 2] = positions[v * 3 + 2]!;
        continue;
      }
      let ax = 0, ay = 0, az = 0;
      for (let q = s; q < e; q++) {
        const u = adj.neighbours[q]!;
        ax += positions[u * 3]!;
        ay += positions[u * 3 + 1]!;
        az += positions[u * 3 + 2]!;
      }
      ax /= cnt;
      ay /= cnt;
      az /= cnt;
      tmp[v * 3] = positions[v * 3]! + f * (ax - positions[v * 3]!);
      tmp[v * 3 + 1] = positions[v * 3 + 1]! + f * (ay - positions[v * 3 + 1]!);
      tmp[v * 3 + 2] = positions[v * 3 + 2]! + f * (az - positions[v * 3 + 2]!);
    }
    positions.set(tmp);
  };
  for (let it = 0; it < iterations; it++) {
    pass(lambda);
    pass(mu);
  }
}

/** Zieht jeden Vertex per Newton-Schritten auf die Nullfläche und schreibt Normalen aus dem Gradienten. */
export function projectAndNormals(sdf: Sdf, positions: Float32Array, normals: Float32Array, eps: number, steps = 3): void {
  const n = positions.length / 3;
  const p: Vec3 = [0, 0, 0];
  const g: Vec3 = [0, 0, 0];
  const grad = (): void => {
    tetraGradient(sdf, p, eps, g);
  };
  for (let v = 0; v < n; v++) {
    p[0] = positions[v * 3]!;
    p[1] = positions[v * 3 + 1]!;
    p[2] = positions[v * 3 + 2]!;
    for (let it = 0; it < steps; it++) {
      const d = sdf(p);
      grad();
      const gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] || 1;
      const f = Math.max(-1, Math.min(1, d / gg));
      p[0] -= f * g[0];
      p[1] -= f * g[1];
      p[2] -= f * g[2];
    }
    positions[v * 3] = p[0];
    positions[v * 3 + 1] = p[1];
    positions[v * 3 + 2] = p[2];
    grad();
    const gl = Math.hypot(g[0], g[1], g[2]) || 1;
    normals[v * 3] = g[0] / gl;
    normals[v * 3 + 1] = g[1] / gl;
    normals[v * 3 + 2] = g[2] / gl;
  }
}

/** Dreht jedes Dreieck so, dass es entlang der Vertexnormalen zeigt. */
export function orientToNormals(positions: Float32Array, normals: Float32Array, index: Uint32Array): void {
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]!, b = index[t + 1]!, c = index[t + 2]!;
    const abx = positions[b * 3]! - positions[a * 3]!, aby = positions[b * 3 + 1]! - positions[a * 3 + 1]!, abz = positions[b * 3 + 2]! - positions[a * 3 + 2]!;
    const acx = positions[c * 3]! - positions[a * 3]!, acy = positions[c * 3 + 1]! - positions[a * 3 + 1]!, acz = positions[c * 3 + 2]! - positions[a * 3 + 2]!;
    const fx = aby * acz - abz * acy, fy = abz * acx - abx * acz, fz = abx * acy - aby * acx;
    const nx = normals[a * 3]! + normals[b * 3]! + normals[c * 3]!;
    const ny = normals[a * 3 + 1]! + normals[b * 3 + 1]! + normals[c * 3 + 1]!;
    const nz = normals[a * 3 + 2]! + normals[b * 3 + 2]! + normals[c * 3 + 2]!;
    if (fx * nx + fy * ny + fz * nz < 0) {
      index[t + 1] = c;
      index[t + 2] = b;
    }
  }
}
