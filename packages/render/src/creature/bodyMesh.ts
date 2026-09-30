import type { BodySkeleton, SpherePrim, Vec3 } from '@ee/genome';

/**
 * CPU meshing of a creature body (Kreaturen v3, mesh path): the rest SDF (smooth union of the body
 * spheres, no noise) is polygonised once per species shape with naive surface nets on a coarse grid,
 * every vertex is projected onto the surface, gets the smooth SDF normal and up to four sphere weights
 * (the spheres whose surfaces it lies on — sharp on a sphere, blended across the smooth-union fillet).
 * The GPU skins it to the posed spheres every frame (`CreatureMeshBodies`), so necks, trunks, tails,
 * snake spines and the kneaded legs bend and stomp with the same data the raymarcher uses — without the
 * star-shape limit of the traced icosphere.
 */
export interface BodyMesh {
  /** Rest positions (body frame, blob units), xyz per vertex. */
  positions: Float32Array;
  /** Unit rest normals. */
  normals: Float32Array;
  /** Four sphere indices per vertex (as floats) and their weights (sum 1). */
  skinIndex: Float32Array;
  skinWeight: Float32Array;
  /** Rest offset of the vertex from each of its four spheres (4 × xyz per vertex): rotation skinning. */
  skinOffset: Float32Array;
  index: Uint32Array;
  /** The rest spheres the weights refer to (the canonical shape of the variant). */
  spheres: SpherePrim[];
  sminK: number;
  cell: number;
  vertexCount: number;
  triangleCount: number;
}

export interface MeshBodyOptions {
  /** Grid cell size (blob units). Default: from the smallest sphere, clamped to 0.07 … 0.12. */
  cell?: number;
  /** Upper bound on vertices: the cell grows until the mesh fits (default 2600). */
  maxVertices?: number;
}

function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function makeSdf(spheres: readonly SpherePrim[], k: number): (x: number, y: number, z: number) => number {
  const n = spheres.length;
  const cx = new Float64Array(n);
  const cy = new Float64Array(n);
  const cz = new Float64Array(n);
  const cr = new Float64Array(n);
  spheres.forEach((s, i) => {
    cx[i] = s.center[0];
    cy[i] = s.center[1];
    cz[i] = s.center[2];
    cr[i] = s.r;
  });
  return (x, y, z) => {
    let d = 1e3;
    for (let i = 0; i < n; i++) {
      const dx = x - cx[i]!;
      const dy = y - cy[i]!;
      const dz = z - cz[i]!;
      d = smin(d, Math.sqrt(dx * dx + dy * dy + dz * dz) - cr[i]!, k);
    }
    return d;
  };
}

/**
 * Polygonises the smooth union of `spheres` (blend radius `sminK`) into a skinnable mesh. Naive surface
 * nets pinch two sheets into one vertex where a thin gap (a leg close to the belly) passes through a
 * cell; such a vertex would drag one sheet along with the other when skinned, so the grid is shifted by
 * part of a cell until the mesh is a clean 2-manifold (or the least pinched grid is taken).
 */
export function meshBody(spheres: readonly SpherePrim[], sminK: number, opts: MeshBodyOptions = {}): BodyMesh {
  const minR = spheres.reduce((m, s) => Math.min(m, s.r), Infinity);
  let cell = opts.cell ?? Math.min(0.12, Math.max(0.07, minR * 0.5));
  const maxVertices = opts.maxVertices ?? 2600;
  const sdf = makeSdf(spheres, sminK);
  if (opts.cell === undefined) {
    // Surface area ∝ vertices × cell²: jump to the budget from the count (the contour pass is cheap).
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = contour(spheres, sdf, sminK, cell, 0).pos.length / 3;
      if (count <= maxVertices) break;
      cell *= Math.sqrt(count / maxVertices) * 1.02;
    }
  }
  let best: Contour | null = null;
  let bestBad = Infinity;
  for (const shift of GRID_SHIFTS) {
    const c = contour(spheres, sdf, sminK, cell, shift);
    if (c.pos.length / 3 > maxVertices && opts.cell === undefined) continue;
    const bad = nonManifoldEdges({ index: c.tris, vertexCount: c.pos.length / 3 });
    if (bad < bestBad) {
      best = c;
      bestBad = bad;
    }
    if (bad === 0) break;
  }
  return finish(spheres, sdf, sminK, cell, best ?? contour(spheres, sdf, sminK, cell, 0));
}

/** Grid origin shifts (fractions of a cell) tried against pinched vertices. */
const GRID_SHIFTS = [0, 0.5, 0.25, 0.75, 0.125, 0.625];

/** Edges not shared by exactly two triangles (0 for a closed 2-manifold). */
export function nonManifoldEdges(m: { index: ArrayLike<number>; vertexCount: number }): number {
  const edges = new Map<number, number>();
  const n = m.vertexCount;
  for (let t = 0; t < m.index.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = m.index[t + e]!;
      const b = m.index[t + ((e + 1) % 3)]!;
      const key = Math.min(a, b) * n + Math.max(a, b);
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const c of edges.values()) if (c !== 2) bad++;
  return bad;
}

interface Contour {
  /** Cell vertices (mean of the edge crossings, not yet on the surface). */
  pos: number[];
  tris: number[];
}

/** Grid pass of the surface nets: one vertex per sign-changing cell, one quad per sign-changing edge. */
function contour(spheres: readonly SpherePrim[], sdf: (x: number, y: number, z: number) => number, k: number, cell: number, shift: number): Contour {
  // --- grid ------------------------------------------------------------------------------------------
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
  const pad = cell * (2 + shift) + k * 0.3;
  minX -= pad;
  minY -= pad;
  minZ -= pad;
  const nx = Math.ceil((maxX + pad - minX) / cell) + 1;
  const ny = Math.ceil((maxY + pad - minY) / cell) + 1;
  const nz = Math.ceil((maxZ + pad - minZ) / cell) + 1;
  const val = new Float32Array(nx * ny * nz);
  const at = (i: number, j: number, kk: number): number => (kk * ny + j) * nx + i;
  for (let kk = 0; kk < nz; kk++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[at(i, j, kk)] = sdf(minX + i * cell, minY + j * cell, minZ + kk * cell);

  // --- one vertex per sign-changing cell (mean of the edge crossings) ---------------------------------
  const cells = (nx - 1) * (ny - 1) * (nz - 1);
  const cellAt = (i: number, j: number, kk: number): number => (kk * (ny - 1) + j) * (nx - 1) + i;
  const cellVert = new Int32Array(cells).fill(-1);
  const pos: number[] = [];
  const corner = new Float32Array(8);
  const EDGES: ReadonlyArray<readonly [number, number]> = [
    [0, 1], [2, 3], [4, 5], [6, 7], // x edges
    [0, 2], [1, 3], [4, 6], [5, 7], // y edges
    [0, 4], [1, 5], [2, 6], [3, 7], // z edges
  ];
  const cornerOffset = (c: number): Vec3 => [c & 1, (c >> 1) & 1, (c >> 2) & 1];
  for (let kk = 0; kk < nz - 1; kk++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          const o = cornerOffset(c);
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
          const oa = cornerOffset(a);
          const ob = cornerOffset(b);
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

  // --- one quad per sign-changing grid edge --------------------------------------------------------------
  const tris: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) tris.push(a, c, b, a, d, c);
    else tris.push(a, b, c, a, c, d);
  };
  for (let kk = 1; kk < nz - 1; kk++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const v0 = val[at(i, j, kk)]!;
        const v1 = val[at(i + 1, j, kk)]!;
        if (v0 < 0 === v1 < 0) continue;
        // Cells around the x edge, ordered with the normal toward +x; flip when the outside is at −x.
        quad(cellVert[cellAt(i, j - 1, kk - 1)]!, cellVert[cellAt(i, j, kk - 1)]!, cellVert[cellAt(i, j, kk)]!, cellVert[cellAt(i, j - 1, kk)]!, v0 >= 0);
      }
    }
  }
  for (let kk = 1; kk < nz - 1; kk++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const v0 = val[at(i, j, kk)]!;
        const v1 = val[at(i, j + 1, kk)]!;
        if (v0 < 0 === v1 < 0) continue;
        quad(cellVert[cellAt(i - 1, j, kk - 1)]!, cellVert[cellAt(i - 1, j, kk)]!, cellVert[cellAt(i, j, kk)]!, cellVert[cellAt(i, j, kk - 1)]!, v0 >= 0);
      }
    }
  }
  for (let kk = 0; kk < nz - 1; kk++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const v0 = val[at(i, j, kk)]!;
        const v1 = val[at(i, j, kk + 1)]!;
        if (v0 < 0 === v1 < 0) continue;
        quad(cellVert[cellAt(i - 1, j - 1, kk)]!, cellVert[cellAt(i, j - 1, kk)]!, cellVert[cellAt(i, j, kk)]!, cellVert[cellAt(i - 1, j, kk)]!, v0 >= 0);
      }
    }
  }

  return { pos, tris };
}

/** Projects the contour onto the surface and adds normals and skin weights. */
function finish(spheres: readonly SpherePrim[], sdf: (x: number, y: number, z: number) => number, k: number, cell: number, c: Contour): BodyMesh {
  const { pos, tris } = c;
  // --- project onto the surface, normals, skin weights -----------------------------------------------
  const n = pos.length / 3;
  const positions = new Float32Array(pos);
  const normals = new Float32Array(n * 3);
  const skinIndex = new Float32Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const skinOffset = new Float32Array(n * 12);
  const e = cell * 0.05;
  const grad = (x: number, y: number, z: number, out: Vec3): Vec3 => {
    out[0] = (sdf(x + e, y, z) - sdf(x - e, y, z)) / (2 * e);
    out[1] = (sdf(x, y + e, z) - sdf(x, y - e, z)) / (2 * e);
    out[2] = (sdf(x, y, z + e) - sdf(x, y, z - e)) / (2 * e);
    return out;
  };
  const g: Vec3 = [0, 0, 0];
  const blend = k * 0.6 + 0.02;
  const cand = spheres.map((_s, i) => i);
  const dist = new Float64Array(spheres.length);
  for (let v = 0; v < n; v++) {
    let x = positions[v * 3]!;
    let y = positions[v * 3 + 1]!;
    let z = positions[v * 3 + 2]!;
    for (let it = 0; it < 4; it++) {
      const d = sdf(x, y, z);
      grad(x, y, z, g);
      const gg = g[0] * g[0] + g[1] * g[1] + g[2] * g[2] || 1;
      x -= (d * g[0]) / gg;
      y -= (d * g[1]) / gg;
      z -= (d * g[2]) / gg;
    }
    positions[v * 3] = x;
    positions[v * 3 + 1] = y;
    positions[v * 3 + 2] = z;
    grad(x, y, z, g);
    const gl = Math.hypot(g[0], g[1], g[2]) || 1;
    normals[v * 3] = g[0] / gl;
    normals[v * 3 + 1] = g[1] / gl;
    normals[v * 3 + 2] = g[2] / gl;
    // Weights: spheres whose surfaces the vertex lies on (≈ 0 distance), blended over the fillet width.
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
    for (let q = 0; q < 4; q++) {
      skinWeight[v * 4 + q] = skinWeight[v * 4 + q]! / (sum || 1);
      const c = spheres[skinIndex[v * 4 + q]!]!.center;
      skinOffset[v * 12 + q * 3] = x - c[0];
      skinOffset[v * 12 + q * 3 + 1] = y - c[1];
      skinOffset[v * 12 + q * 3 + 2] = z - c[2];
    }
  }
  // Winding: every triangle faces along the SDF normal (robust against the quad orientation rules).
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
    const nxv = normals[a * 3]! + normals[b * 3]! + normals[c * 3]!;
    const nyv = normals[a * 3 + 1]! + normals[b * 3 + 1]! + normals[c * 3 + 1]!;
    const nzv = normals[a * 3 + 2]! + normals[b * 3 + 2]! + normals[c * 3 + 2]!;
    if (fx * nxv + fy * nyv + fz * nzv < 0) {
      index[t + 1] = c;
      index[t + 2] = b;
    }
  }
  return {
    positions,
    normals,
    skinIndex,
    skinWeight,
    skinOffset,
    index,
    spheres: spheres.map((s) => ({ center: [s.center[0], s.center[1], s.center[2]] as Vec3, r: s.r })),
    sminK: k,
    cell,
    vertexCount: n,
    triangleCount: index.length / 3,
  };
}

/**
 * The chains of a skeleton that bend (snake spine, neck, trunk), in order from their root, and the
 * spheres that ride rigidly on a chain sphere (snout on the snake's head, the skull on the neck). A
 * chain sphere turns with its chain: its vertices rotate about its centre by the swing from the rest to
 * the posed chain tangent — tight coils, a curled trunk tip or a bent neck keep round cross-sections and
 * their caps instead of shearing (translation-only skinning would slide the caps sideways).
 */
export interface SkinChains {
  /** Ordered sphere indices per chain (root → tip). */
  chains: number[][];
  /** Virtual predecessor of the first sphere per chain (rest, blob units) or null. */
  roots: (Vec3 | null)[];
  /** [sphere, chain sphere it rides on]. */
  attach: Array<[number, number]>;
  /**
   * Spheres that swing about a hinge (the REX's lower jaw): rotation = swing of (centre − hinge) from
   * rest to pose; the hinge rides along with sphere `follow` (−1 = fixed in the body frame).
   */
  levers: Array<{ sphere: number; hinge: Vec3; follow: number }>;
}

export function skinChainsFor(skeleton: Pick<BodySkeleton, 'spineArc' | 'spine' | 'neckChain' | 'trunk' | 'headSphere' | 'mouth'>, spheres: readonly SpherePrim[]): SkinChains {
  const out: SkinChains = { chains: [], roots: [], attach: [], levers: [] };
  const n = spheres.length;
  const used = new Set<number>();
  const spine = skeleton.spineArc ?? skeleton.spine;
  if (spine) {
    const order: number[] = [];
    for (let i = 0; i < n; i++) if ((spine[i] ?? -1) >= 0) order.push(i);
    order.sort((a, b) => spine[a]! - spine[b]!);
    if (order.length >= 2) {
      out.chains.push(order);
      out.roots.push(null);
      for (const i of order) used.add(i);
      const head = skeleton.headSphere >= 0 && used.has(skeleton.headSphere) ? skeleton.headSphere : order[0]!;
      for (let i = 0; i < n; i++) if (!used.has(i) && (spine[i] ?? 0) < 0) out.attach.push([i, head]);
    }
  }
  const neck = skeleton.neckChain;
  if (neck && neck.spheres.length > 0) {
    const order = neck.spheres.filter((i) => i < n && !used.has(i)).sort((a, b) => spheres[a]!.center[2] - spheres[b]!.center[2]);
    if (order.length > 0) {
      out.chains.push(order);
      out.roots.push([neck.base[0], neck.base[1], neck.base[2]]);
      for (const i of order) used.add(i);
      const last = order[order.length - 1]!;
      for (const i of neck.head) if (i < n && !used.has(i)) out.attach.push([i, last]);
    }
  }
  const trunk = skeleton.trunk;
  if (trunk && trunk.spheres.length > 0) {
    const order = trunk.spheres.filter((i) => i < n && !used.has(i));
    if (order.length > 0) {
      out.chains.push(order);
      out.roots.push([trunk.root[0], trunk.root[1], trunk.root[2]]);
      for (const i of order) used.add(i);
    }
  }
  const mouth = skeleton.mouth;
  if (mouth && mouth.jaw.length > 0) {
    // The jaw hinge moves with the head when the head rides on a neck.
    const onNeck = !!neck && mouth.jaw.some((i) => neck.head.includes(i));
    const follow = onNeck && skeleton.headSphere >= 0 ? skeleton.headSphere : -1;
    for (const i of mouth.jaw) {
      if (i >= n || used.has(i)) continue;
      out.levers.push({ sphere: i, hinge: [mouth.hinge[0], mouth.hinge[1], mouth.hinge[2]], follow });
      out.attach = out.attach.filter(([a]) => a !== i);
    }
  }
  return out;
}

const _tr: Vec3 = [0, 0, 0];
const _tp: Vec3 = [0, 0, 0];

/** Unit quaternion (xyzw) of the shortest rotation taking unit vector a to unit vector b. */
export function swingQuat(a: Readonly<Vec3>, b: Readonly<Vec3>, out: Float32Array | Float64Array | number[], o = 0): void {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let x = a[1] * b[2] - a[2] * b[1];
  let y = a[2] * b[0] - a[0] * b[2];
  let z = a[0] * b[1] - a[1] * b[0];
  let w = 1 + d;
  if (w < 1e-6) {
    // Opposite: any axis perpendicular to a (half turn).
    x = Math.abs(a[0]) < 0.9 ? 0 : -a[2];
    y = Math.abs(a[0]) < 0.9 ? -a[2] : 0;
    z = Math.abs(a[0]) < 0.9 ? a[1] : a[0];
    w = 0;
  }
  const l = Math.hypot(x, y, z, w) || 1;
  out[o] = x / l;
  out[o + 1] = y / l;
  out[o + 2] = z / l;
  out[o + 3] = w / l;
}

/**
 * Per-sphere rotation (quaternion xyzw per sphere, body frame) for this frame. Chain spheres are
 * parallel-transported from the root: each sphere takes its predecessor's rotation, then swings its
 * transported rest tangent (central difference along the chain) onto the posed one — so a coil that turns
 * the tail by more than half a turn keeps turning the same way (independent shortest swings would flip at
 * 180° and pinch the tube there). Attached spheres copy their chain sphere, levers swing about their
 * hinge, all others stay unrotated. `posed` = posed centres in the body frame (Rᵀ c').
 */
export function chainRotations(chains: SkinChains, rest: readonly SpherePrim[], posed: readonly Readonly<Vec3>[], out: Float32Array | number[], o = 0): void {
  const n = Math.min(rest.length, posed.length);
  for (let i = 0; i < n; i++) {
    out[o + i * 4] = 0;
    out[o + i * 4 + 1] = 0;
    out[o + i * 4 + 2] = 0;
    out[o + i * 4 + 3] = 1;
  }
  chains.chains.forEach((chain, ci) => {
    const root = chains.roots[ci] ?? null;
    const m = chain.length;
    // Running rotation of the chain (identity at a root fixed in the body frame).
    _q[0] = 0;
    _q[1] = 0;
    _q[2] = 0;
    _q[3] = 1;
    for (let k = 0; k < m; k++) {
      const i = chain[k]!;
      if (i >= n) continue;
      // Tangent = next − previous (central difference; the chain root — fixed in the body frame — stands
      // in before the first sphere, the sphere itself after the last).
      const a = k > 0 ? chain[k - 1]! : -1;
      const b = k < m - 1 ? chain[k + 1]! : i;
      if (a < 0 && !root && b === i) continue;
      const pr = a >= 0 ? rest[a]!.center : (root ?? rest[i]!.center);
      const pp = a >= 0 ? posed[a]! : (root ?? posed[i]!);
      const nr = rest[b]!.center;
      const np = posed[b]!;
      for (let c = 0; c < 3; c++) {
        _tr[c] = nr[c]! - pr[c]!;
        _tp[c] = np[c]! - pp[c]!;
      }
      const lr = Math.hypot(_tr[0], _tr[1], _tr[2]);
      const lp = Math.hypot(_tp[0], _tp[1], _tp[2]);
      if (lr >= 1e-6 && lp >= 1e-6) {
        _tr[0] /= lr;
        _tr[1] /= lr;
        _tr[2] /= lr;
        _tp[0] /= lp;
        _tp[1] /= lp;
        _tp[2] /= lp;
        // Transport the rest tangent by the running rotation, then swing it onto the posed tangent.
        rotateByQuat(_q, 0, _tr, _tt);
        swingQuat(_tt, _tp, _s, 0);
        quatMul(_s, _q, _q);
      }
      out[o + i * 4] = _q[0];
      out[o + i * 4 + 1] = _q[1];
      out[o + i * 4 + 2] = _q[2];
      out[o + i * 4 + 3] = _q[3];
    }
  });
  for (const [i, j] of chains.attach) {
    if (i >= n || j >= n) continue;
    out[o + i * 4] = out[o + j * 4]!;
    out[o + i * 4 + 1] = out[o + j * 4 + 1]!;
    out[o + i * 4 + 2] = out[o + j * 4 + 2]!;
    out[o + i * 4 + 3] = out[o + j * 4 + 3]!;
  }
  for (const lv of chains.levers) {
    const i = lv.sphere;
    if (i >= n) continue;
    const f = lv.follow >= 0 && lv.follow < n ? lv.follow : -1;
    for (let c = 0; c < 3; c++) {
      _tr[c] = rest[i]!.center[c]! - lv.hinge[c]!;
      _tp[c] = posed[i]![c]! - (lv.hinge[c]! + (f >= 0 ? posed[f]![c]! - rest[f]!.center[c]! : 0));
    }
    const lr = Math.hypot(_tr[0], _tr[1], _tr[2]);
    const lp = Math.hypot(_tp[0], _tp[1], _tp[2]);
    if (lr < 1e-6 || lp < 1e-6) continue;
    _tr[0] /= lr;
    _tr[1] /= lr;
    _tr[2] /= lr;
    _tp[0] /= lp;
    _tp[1] /= lp;
    _tp[2] /= lp;
    swingQuat(_tr, _tp, out, o + i * 4);
  }
}

const _q = new Float64Array(4);
const _s = new Float64Array(4);
const _tt: Vec3 = [0, 0, 0];

/** out = a ⊗ b (xyzw; out may alias a or b). */
export function quatMul(a: ArrayLike<number>, b: ArrayLike<number>, out: Float64Array | Float32Array | number[]): void {
  const ax = a[0]!;
  const ay = a[1]!;
  const az = a[2]!;
  const aw = a[3]!;
  const bx = b[0]!;
  const by = b[1]!;
  const bz = b[2]!;
  const bw = b[3]!;
  out[0] = aw * bx + ax * bw + ay * bz - az * by;
  out[1] = aw * by - ax * bz + ay * bw + az * bx;
  out[2] = aw * bz + ax * by - ay * bx + az * bw;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
}

/** Rotates v by the unit quaternion q (xyzw at q[o..o+3]) into out. */
export function rotateByQuat(q: ArrayLike<number>, o: number, v: Readonly<Vec3>, out: Vec3): Vec3 {
  const qx = q[o]!;
  const qy = q[o + 1]!;
  const qz = q[o + 2]!;
  const qw = q[o + 3]!;
  // t = 2 q×v; v' = v + w t + q×t
  const tx = 2 * (qy * v[2] - qz * v[1]);
  const ty = 2 * (qz * v[0] - qx * v[2]);
  const tz = 2 * (qx * v[1] - qy * v[0]);
  out[0] = v[0] + qw * tx + (qy * tz - qz * ty);
  out[1] = v[1] + qw * ty + (qz * tx - qx * tz);
  out[2] = v[2] + qw * tz + (qx * ty - qy * tx);
  return out;
}

const _o: Vec3 = [0, 0, 0];
const _r: Vec3 = [0, 0, 0];

/**
 * CPU reference of the GPU skinning (tests, parts debugging): every vertex rides on its (up to four)
 * spheres — the sphere's displacement (`delta` = posed − rest centre, body frame) plus its rest offset
 * turned by the sphere's rotation (`quats`, xyzw per sphere; omitted = none) — and moves along its
 * (turned) normal by the radius change. Returns the skinned position; `outNormal` receives the normal.
 */
export function skinVertex(mesh: BodyMesh, v: number, delta: readonly Readonly<Vec3>[], dr: readonly number[], out: Vec3, quats?: ArrayLike<number>, outNormal?: Vec3): Vec3 {
  let x = mesh.positions[v * 3]!;
  let y = mesh.positions[v * 3 + 1]!;
  let z = mesh.positions[v * 3 + 2]!;
  const n: Vec3 = [mesh.normals[v * 3]!, mesh.normals[v * 3 + 1]!, mesh.normals[v * 3 + 2]!];
  let nx = 0;
  let ny = 0;
  let nz = 0;
  let r = 0;
  for (let q = 0; q < 4; q++) {
    const i = mesh.skinIndex[v * 4 + q]!;
    const w = mesh.skinWeight[v * 4 + q]!;
    if (w <= 0) continue;
    const d = delta[i]!;
    _o[0] = mesh.skinOffset[v * 12 + q * 3]!;
    _o[1] = mesh.skinOffset[v * 12 + q * 3 + 1]!;
    _o[2] = mesh.skinOffset[v * 12 + q * 3 + 2]!;
    if (quats) rotateByQuat(quats, i * 4, _o, _r);
    else {
      _r[0] = _o[0];
      _r[1] = _o[1];
      _r[2] = _o[2];
    }
    x += (d[0] + _r[0] - _o[0]) * w;
    y += (d[1] + _r[1] - _o[1]) * w;
    z += (d[2] + _r[2] - _o[2]) * w;
    if (quats) rotateByQuat(quats, i * 4, n, _r);
    else {
      _r[0] = n[0];
      _r[1] = n[1];
      _r[2] = n[2];
    }
    nx += _r[0] * w;
    ny += _r[1] * w;
    nz += _r[2] * w;
    r += (dr[i] ?? 0) * w;
  }
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl;
  ny /= nl;
  nz /= nl;
  out[0] = x + nx * r;
  out[1] = y + ny * r;
  out[2] = z + nz * r;
  if (outNormal) {
    outNormal[0] = nx;
    outNormal[1] = ny;
    outNormal[2] = nz;
  }
  return out;
}
