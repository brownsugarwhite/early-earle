import type { SpherePrim, Vec3 } from '@ee/genome';

/**
 * Surface nets for an arbitrary signed distance function — the blob domes (smooth sphere union cut flat
 * at the floor, `evalSdf` of @ee/genome). Same recipe as the game's species mesher
 * (`@ee/render` creature/bodyMesh.ts, used unchanged for every species): one vertex per sign-changing
 * cell, projected onto the surface with the SDF gradient, up to four sphere weights per vertex (the
 * spheres whose surfaces the vertex lies on, blended over the fillet width) — so the Blender armature
 * deforms blobs the way the game skins its species meshes.
 */
export interface SdfMesh {
  positions: Float32Array;
  normals: Float32Array;
  skinIndex: Float32Array;
  skinWeight: Float32Array;
  index: Uint32Array;
  vertexCount: number;
  triangleCount: number;
}

type Sdf = (x: number, y: number, z: number) => number;

export function meshSdf(sdf: Sdf, spheres: readonly SpherePrim[], sminK: number, opts: { cell?: number; maxVertices?: number; bounds?: { min: Vec3; max: Vec3 } } = {}): SdfMesh {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const s of spheres) {
    minX = Math.min(minX, s.center[0] - s.r);
    minY = Math.min(minY, s.center[1] - s.r);
    minZ = Math.min(minZ, s.center[2] - s.r);
    maxX = Math.max(maxX, s.center[0] + s.r);
    maxY = Math.max(maxY, s.center[1] + s.r);
    maxZ = Math.max(maxZ, s.center[2] + s.r);
  }
  if (opts.bounds) {
    minX = opts.bounds.min[0];
    minY = opts.bounds.min[1];
    minZ = opts.bounds.min[2];
    maxX = opts.bounds.max[0];
    maxY = opts.bounds.max[1];
    maxZ = opts.bounds.max[2];
  }
  const maxVertices = opts.maxVertices ?? 2600;
  let cell = opts.cell ?? 0.08;
  let c = contour(sdf, [minX, minY, minZ], [maxX, maxY, maxZ], cell, sminK);
  for (let attempt = 0; attempt < 5 && c.pos.length / 3 > maxVertices; attempt++) {
    cell *= Math.sqrt(c.pos.length / 3 / maxVertices) * 1.02;
    c = contour(sdf, [minX, minY, minZ], [maxX, maxY, maxZ], cell, sminK);
  }
  return finish(sdf, spheres, sminK, cell, c.pos, c.tris);
}

function contour(sdf: Sdf, lo: Vec3, hi: Vec3, cell: number, k: number): { pos: number[]; tris: number[] } {
  const pad = cell * 2 + k * 0.3;
  const minX = lo[0] - pad;
  const minY = lo[1] - pad;
  const minZ = lo[2] - pad;
  const nx = Math.ceil((hi[0] + pad - minX) / cell) + 1;
  const ny = Math.ceil((hi[1] + pad - minY) / cell) + 1;
  const nz = Math.ceil((hi[2] + pad - minZ) / cell) + 1;
  const val = new Float32Array(nx * ny * nz);
  const at = (i: number, j: number, kk: number): number => (kk * ny + j) * nx + i;
  for (let kk = 0; kk < nz; kk++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[at(i, j, kk)] = sdf(minX + i * cell, minY + j * cell, minZ + kk * cell);
  const cellAt = (i: number, j: number, kk: number): number => (kk * (ny - 1) + j) * (nx - 1) + i;
  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const pos: number[] = [];
  const corner = new Float32Array(8);
  const EDGES: ReadonlyArray<readonly [number, number]> = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const off = (c: number): Vec3 => [c & 1, (c >> 1) & 1, (c >> 2) & 1];
  for (let kk = 0; kk < nz - 1; kk++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          const o = off(c);
          const v = val[at(i + o[0], j + o[1], kk + o[2])]!;
          corner[c] = v;
          if (v < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let cnt = 0;
        for (const [a, b] of EDGES) {
          const va = corner[a]!;
          const vb = corner[b]!;
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          const oa = off(a);
          const ob = off(b);
          sx += oa[0] + (ob[0] - oa[0]) * t;
          sy += oa[1] + (ob[1] - oa[1]) * t;
          sz += oa[2] + (ob[2] - oa[2]) * t;
          cnt++;
        }
        cellVert[cellAt(i, j, kk)] = pos.length / 3;
        pos.push(minX + (i + sx / cnt) * cell, minY + (j + sy / cnt) * cell, minZ + (kk + sz / cnt) * cell);
      }
    }
  }
  const tris: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tris.push(a, c, b, a, d, c);
    else tris.push(a, b, c, a, c, d);
  };
  for (let kk = 1; kk < nz - 1; kk++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const v0 = val[at(i, j, kk)]!;
        if (v0 < 0 === val[at(i + 1, j, kk)]! < 0) continue;
        quad(cellVert[cellAt(i, j - 1, kk - 1)]!, cellVert[cellAt(i, j, kk - 1)]!, cellVert[cellAt(i, j, kk)]!, cellVert[cellAt(i, j - 1, kk)]!, v0 >= 0);
      }
  for (let kk = 1; kk < nz - 1; kk++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v0 = val[at(i, j, kk)]!;
        if (v0 < 0 === val[at(i, j + 1, kk)]! < 0) continue;
        quad(cellVert[cellAt(i - 1, j, kk - 1)]!, cellVert[cellAt(i - 1, j, kk)]!, cellVert[cellAt(i, j, kk)]!, cellVert[cellAt(i, j, kk - 1)]!, v0 >= 0);
      }
  for (let kk = 0; kk < nz - 1; kk++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v0 = val[at(i, j, kk)]!;
        if (v0 < 0 === val[at(i, j, kk + 1)]! < 0) continue;
        quad(cellVert[cellAt(i - 1, j - 1, kk)]!, cellVert[cellAt(i, j - 1, kk)]!, cellVert[cellAt(i, j, kk)]!, cellVert[cellAt(i - 1, j, kk)]!, v0 >= 0);
      }
  return { pos, tris };
}

function finish(sdf: Sdf, spheres: readonly SpherePrim[], k: number, cell: number, pos: number[], tris: number[]): SdfMesh {
  const n = pos.length / 3;
  const positions = new Float32Array(pos);
  const normals = new Float32Array(n * 3);
  const skinIndex = new Float32Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const e = cell * 0.05;
  const g: Vec3 = [0, 0, 0];
  const grad = (x: number, y: number, z: number): Vec3 => {
    g[0] = (sdf(x + e, y, z) - sdf(x - e, y, z)) / (2 * e);
    g[1] = (sdf(x, y + e, z) - sdf(x, y - e, z)) / (2 * e);
    g[2] = (sdf(x, y, z + e) - sdf(x, y, z - e)) / (2 * e);
    return g;
  };
  const blend = k * 0.6 + 0.02;
  const cand = spheres.map((_s, i) => i);
  const dist = new Float64Array(spheres.length);
  for (let v = 0; v < n; v++) {
    let x = positions[v * 3]!;
    let y = positions[v * 3 + 1]!;
    let z = positions[v * 3 + 2]!;
    for (let it = 0; it < 4; it++) {
      const d = sdf(x, y, z);
      grad(x, y, z);
      const gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] || 1;
      x -= (d * g[0]) / gg;
      y -= (d * g[1]) / gg;
      z -= (d * g[2]) / gg;
    }
    positions[v * 3] = x;
    positions[v * 3 + 1] = y;
    positions[v * 3 + 2] = z;
    grad(x, y, z);
    const gl = Math.hypot(g[0], g[1], g[2]) || 1;
    normals[v * 3] = g[0] / gl;
    normals[v * 3 + 1] = g[1] / gl;
    normals[v * 3 + 2] = g[2] / gl;
    let dmin = Infinity;
    spheres.forEach((s, i) => {
      const di = Math.hypot(x - s.center[0], y - s.center[1], z - s.center[2]) - s.r;
      dist[i] = di;
      dmin = Math.min(dmin, di);
    });
    cand.sort((a, b) => dist[a]! - dist[b]!);
    let sum = 0;
    for (let q = 0; q < 4; q++) {
      const i = cand[q];
      let w = 0;
      if (i !== undefined) {
        const u = Math.max(0, 1 - (dist[i]! - dmin) / blend);
        w = u * u;
      }
      skinIndex[v * 4 + q] = i ?? 0;
      skinWeight[v * 4 + q] = w;
      sum += w;
    }
    for (let q = 0; q < 4; q++) skinWeight[v * 4 + q] = skinWeight[v * 4 + q]! / (sum || 1);
  }
  const index = new Uint32Array(tris);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]!;
    const b = index[t + 1]!;
    const c = index[t + 2]!;
    const abx = positions[b * 3]! - positions[a * 3]!;
    const aby = positions[b * 3 + 1]! - positions[a * 3 + 1]!;
    const abz = positions[b * 3 + 2]! - positions[a * 3 + 2]!;
    const acx = positions[c * 3]! - positions[a * 3]!;
    const acy = positions[c * 3 + 1]! - positions[a * 3 + 1]!;
    const acz = positions[c * 3 + 2]! - positions[a * 3 + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    const nx = normals[a * 3]! + normals[b * 3]! + normals[c * 3]!;
    const ny = normals[a * 3 + 1]! + normals[b * 3 + 1]! + normals[c * 3 + 1]!;
    const nz = normals[a * 3 + 2]! + normals[b * 3 + 2]! + normals[c * 3 + 2]!;
    if (fx * nx + fy * ny + fz * nz < 0) {
      index[t + 1] = c;
      index[t + 2] = b;
    }
  }
  return { positions, normals, skinIndex, skinWeight, index, vertexCount: n, triangleCount: index.length / 3 };
}
