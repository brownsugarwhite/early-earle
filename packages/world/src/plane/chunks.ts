import { hash32, mulberry32 } from '../rng';
import type { Vec3 } from '../capPatch';
import { TREE_PROPORTIONS, pickTreeKind, type TreeFamily, type TreeKind } from '../scatterTrees';
import { NO_WATER } from './features/index';
import type { FeatureSample } from './features/types';
import type { PlaneField } from './field';
import { isTreeKind } from './field';
import { planeComposeGroveTree } from './grove';
import type { RegionSample } from './layout';
import { smoothstep } from './noise2';
import type { LandmarkSlot, PlanetProp, PlanetPropKind, PlanetPropSpec, PlanetTree, PlanetVegetationFamily } from './types';

/** Kantenlänge eines Chunks in Welteinheiten (≈ die alten 30°-Chunks auf R = 32). */
export const CHUNK_SIZE = 16;
/** Tiefe der Schürzen an den Chunkkanten (verdecken Risse zwischen Detailstufen). */
export const SKIRT_DEPTH = 1.2;

export interface ChunkCoord {
  cx: number;
  cz: number;
}

export function chunkKeyOf(cx: number, cz: number): string {
  return `${cx}:${cz}`;
}

/** Chunk, der den Punkt (x, z) enthält. */
export function chunkAt(x: number, z: number): ChunkCoord {
  return { cx: Math.floor(x / CHUNK_SIZE), cz: Math.floor(z / CHUNK_SIZE) };
}

/**
 * Netz eines Chunks in chunk-lokalen Koordinaten (Ursprung `ox, oz`): n × n Gitterpunkte plus Schürze. Je Vertex die
 * Welt (eigene, dazu das Paar der nächsten Grenze und der vorzeichenbehaftete Grenzabstand, siehe Terrain-Material),
 * Riss-Kennung und -Koordinate, Höhe 0..1 und die Merkmale (Wasser, Schnee, Eis, Sumpf).
 */
export interface PlaneChunkMesh {
  cx: number;
  cz: number;
  key: string;
  ox: number;
  oz: number;
  /** Gitterpunkte je Seite (ohne Schürze). */
  n: number;
  vertexCount: number;
  positions: Float32Array;
  normals: Float32Array;
  heightNorm: Float32Array;
  /** Welt des Vertex. */
  own: Int32Array;
  /** Weltenpaar der nächsten Grenze (lo < hi nach Kennung) und Abstand (> 0 auf der lo-Seite). */
  lo: Int32Array;
  hi: Int32Array;
  sd: Float32Array;
  /** Riss-Kennung (≥ 0 Pfadabschnittsgrenze, schließt mit dem Fortschritt; −1 seitlich, immer offen). */
  borderId: Float32Array;
  /** Koordinate längs der Grenze. */
  along: Float32Array;
  /** Uferabstand, Schneefeld, Musterkoordinate längs des Gewässers, Eis (4 je Vertex). */
  feature: Float32Array;
  swamp: Float32Array;
  indices: Uint16Array | Uint32Array;
  minH: number;
  maxH: number;
  /** Verschiedene Welten im Chunk. */
  worlds: number[];
  /** Regionen im Chunk. */
  regions: string[];
  /** Welt in der Chunkmitte. */
  world: number;
}

/**
 * Chunk-Netz erzeugen. `res` = Gitterpunkte je Seite (Standard 33 → Abstand 0,5 Einheiten).
 */
export function generatePlaneChunk(field: PlaneField, cx: number, cz: number, res = 33): PlaneChunkMesh {
  const n = Math.max(2, Math.floor(res));
  const grid = n * n;
  const perim = 4 * (n - 1);
  const count = grid + perim;
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const step = CHUNK_SIZE / (n - 1);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const heightNorm = new Float32Array(count);
  const own = new Int32Array(count);
  const lo = new Int32Array(count);
  const hi = new Int32Array(count);
  const sd = new Float32Array(count);
  const borderId = new Float32Array(count);
  const along = new Float32Array(count);
  const feature = new Float32Array(count * 4);
  const swamp = new Float32Array(count);
  const fs: FeatureSample = { water: 0, frozen: 0, along: 0, snow: -1, swamp: 0 };
  const rs = {} as RegionSample;
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  let minH = Infinity;
  let maxH = -Infinity;
  const worlds = new Set<number>();
  const regions = new Set<string>();
  // Höhen auf dem Gitter plus einem Ring außen: die Normalen aus zentralen Differenzen sind an den Chunkkanten mit dem
  // Nachbarn identisch (nahtlos) und kosten eine statt fünf Höhenabfragen je Vertex
  const m = n + 2;
  const H = new Float64Array(m * m);
  for (let j = -1; j <= n; j++) {
    const z = oz + j * step;
    for (let i = -1; i <= n; i++) {
      const x = ox + i * step;
      field.sample(x, z, rs);
      H[(j + 1) * m + (i + 1)] = field.heightWithShape(x, z, field.shapeAt(x, z, rs), rs.region.key);
    }
  }
  for (let j = 0; j < n; j++) {
    const z = oz + j * step;
    for (let i = 0; i < n; i++) {
      const x = ox + i * step;
      const k = j * n + i;
      field.sample(x, z, rs);
      const key = rs.region.key;
      const amp = field.shapeAt(x, z, rs).amplitude;
      const c = (j + 1) * m + (i + 1);
      const h = H[c]!;
      const gx = (H[c + 1]! - H[c - 1]!) / (2 * step);
      const gz = (H[c + m]! - H[c - m]!) / (2 * step);
      const l = Math.hypot(gx, 1, gz);
      pos[0] = x;
      pos[1] = h;
      pos[2] = z;
      nor[0] = -gx / l;
      nor[1] = 1 / l;
      nor[2] = -gz / l;
      positions[k * 3] = x - ox;
      positions[k * 3 + 1] = h;
      positions[k * 3 + 2] = z - oz;
      normals[k * 3] = nor[0];
      normals[k * 3 + 1] = nor[1];
      normals[k * 3 + 2] = nor[2];
      heightNorm[k] = amp > 1e-6 ? Math.min(1, Math.max(0, h / amp)) : 0;
      own[k] = rs.world;
      const a = Math.min(rs.world, rs.neighbor);
      const b = Math.max(rs.world, rs.neighbor);
      lo[k] = a;
      hi[k] = b;
      sd[k] = rs.world === a ? Math.min(999, rs.border) : -Math.min(999, rs.border);
      borderId[k] = rs.borderId;
      along[k] = rs.along;
      field.features.sample(key, x, z, heightNorm[k]!, fs);
      feature[k * 4] = fs.water;
      feature[k * 4 + 1] = fs.snow;
      feature[k * 4 + 2] = fs.along;
      feature[k * 4 + 3] = fs.frozen;
      swamp[k] = fs.swamp ?? 0;
      worlds.add(rs.world);
      regions.add(key);
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
  }
  // Schürze: Randpunkte gegen den Uhrzeigersinn, je Punkt eine Kopie SKIRT_DEPTH tiefer
  const ring: number[] = [];
  for (let i = 0; i < n - 1; i++) ring.push(i); // j = 0, x wächst
  for (let j = 0; j < n - 1; j++) ring.push(j * n + (n - 1)); // i = n−1, z wächst
  for (let i = n - 1; i > 0; i--) ring.push((n - 1) * n + i); // j = n−1, x fällt
  for (let j = n - 1; j > 0; j--) ring.push(j * n); // i = 0, z fällt
  ring.forEach((src, r) => {
    const k = grid + r;
    positions[k * 3] = positions[src * 3]!;
    positions[k * 3 + 1] = positions[src * 3 + 1]! - SKIRT_DEPTH;
    positions[k * 3 + 2] = positions[src * 3 + 2]!;
    normals[k * 3] = normals[src * 3]!;
    normals[k * 3 + 1] = normals[src * 3 + 1]!;
    normals[k * 3 + 2] = normals[src * 3 + 2]!;
    heightNorm[k] = heightNorm[src]!;
    own[k] = own[src]!;
    lo[k] = lo[src]!;
    hi[k] = hi[src]!;
    sd[k] = sd[src]!;
    borderId[k] = borderId[src]!;
    along[k] = along[src]!;
    for (let c = 0; c < 4; c++) feature[k * 4 + c] = feature[src * 4 + c]!;
    swamp[k] = swamp[src]!;
  });
  const quads = (n - 1) * (n - 1);
  const skirtTris = perim * 2;
  const indices = count <= 65535 ? new Uint16Array(quads * 6 + skirtTris * 3) : new Uint32Array(quads * 6 + skirtTris * 3);
  let o = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      // nach oben (+y) zeigend: (a, c, b), (b, c, d)
      indices[o++] = a;
      indices[o++] = c;
      indices[o++] = b;
      indices[o++] = b;
      indices[o++] = c;
      indices[o++] = d;
    }
  }
  // Schürzen: Rand gegen den Uhrzeigersinn von oben gesehen → (p, q, p'), (q, q', p') zeigen nach außen
  for (let r = 0; r < perim; r++) {
    const p = ring[r]!;
    const q = ring[(r + 1) % perim]!;
    const p2 = grid + r;
    const q2 = grid + ((r + 1) % perim);
    indices[o++] = p;
    indices[o++] = q;
    indices[o++] = p2;
    indices[o++] = q;
    indices[o++] = q2;
    indices[o++] = p2;
  }
  const centre = field.sample(ox + CHUNK_SIZE / 2, oz + CHUNK_SIZE / 2, rs);
  return {
    cx,
    cz,
    key: `${cx}:${cz}`,
    ox,
    oz,
    n,
    vertexCount: count,
    positions,
    normals,
    heightNorm,
    own,
    lo,
    hi,
    sd,
    borderId,
    along,
    feature,
    swamp,
    indices,
    minH,
    maxH,
    worlds: [...worlds],
    regions: [...regions],
    world: centre.world,
  };
}

/**
 * Höhe des gezeichneten Dreiecksnetzes eines Chunks an (x, z) (genau das Dreieck, das die GPU zeichnet) — was dort
 * steht, gehört auf diese Höhe, sonst schwebt es oder versinkt. null außerhalb des Chunks.
 */
export function chunkMeshHeightAt(mesh: PlaneChunkMesh, x: number, z: number): number | null {
  const n = mesh.n;
  const step = CHUNK_SIZE / (n - 1);
  const lx = (x - mesh.ox) / step;
  const lz = (z - mesh.oz) / step;
  if (lx < -1e-4 || lz < -1e-4 || lx > n - 1 + 1e-4 || lz > n - 1 + 1e-4) return null;
  const i = Math.min(n - 2, Math.max(0, Math.floor(lx)));
  const j = Math.min(n - 2, Math.max(0, Math.floor(lz)));
  const fx = Math.min(1, Math.max(0, lx - i));
  const fz = Math.min(1, Math.max(0, lz - j));
  const P = mesh.positions;
  const a = j * n + i;
  const b = a + 1;
  const c = a + n;
  const d = c + 1;
  const ha = P[a * 3 + 1]!;
  const hb = P[b * 3 + 1]!;
  const hc = P[c * 3 + 1]!;
  const hd = P[d * 3 + 1]!;
  // Diagonale b–c: Dreieck (a, b, c) für fx + fz ≤ 1, sonst (b, d, c)
  if (fx + fz <= 1) return ha + (hb - ha) * fx + (hc - ha) * fz;
  return hd + (hc - hd) * (1 - fx) + (hb - hd) * (1 - fz);
}

// --- Streuung je Chunk ---------------------------------------------------------------------------------------

export interface PlaneScatterOptions {
  /** Multiplikator auf die Weltdichten (Qualitätsstufe). */
  densityScale?: number;
  /** Punkte, die frei bleiben (Pfadkorridor): true = verwerfen. `radius` = Platzbedarf des Objekts. */
  clear?: (x: number, z: number, radius: number) => boolean;
  /** Rand im Chunk (Welteinheiten), in dem nichts steht (Standard 0.15). */
  edgeMargin?: number;
  /** Netz des Chunks: Füße sitzen genau auf dem gezeichneten Dreieck (nichts schwebt). */
  mesh?: PlaneChunkMesh | null;
}

/** Poisson-Disc im Chunk-Quadrat, deterministisch je Chunk und Salz. */
function poissonInChunk(seed: number, cx: number, cz: number, salt: string, minDist: number, margin: number): Array<[number, number]> {
  const rand = mulberry32(hash32('plane-chunk', salt, cx, cz, seed));
  const lo = margin;
  const hi = CHUNK_SIZE - margin;
  const r = Math.max(1e-3, minDist);
  const cell = r / Math.SQRT2;
  const gridN = Math.ceil((hi - lo) / cell) + 1;
  const grid = new Int32Array(gridN * gridN).fill(-1);
  const pts: Array<[number, number]> = [];
  const active: number[] = [];
  const gi = (x: number, y: number) => Math.floor((y - lo) / cell) * gridN + Math.floor((x - lo) / cell);
  const fits = (x: number, y: number): boolean => {
    if (x < lo || x > hi || y < lo || y > hi) return false;
    const gx = Math.floor((x - lo) / cell);
    const gy = Math.floor((y - lo) / cell);
    for (let j = Math.max(0, gy - 2); j <= Math.min(gridN - 1, gy + 2); j++) {
      for (let i = Math.max(0, gx - 2); i <= Math.min(gridN - 1, gx + 2); i++) {
        const idx = grid[j * gridN + i]!;
        if (idx >= 0) {
          const q = pts[idx]!;
          const dx = q[0] - x;
          const dy = q[1] - y;
          if (dx * dx + dy * dy < r * r) return false;
        }
      }
    }
    return true;
  };
  const push = (x: number, y: number) => {
    pts.push([x, y]);
    grid[gi(x, y)] = pts.length - 1;
    active.push(pts.length - 1);
  };
  push(lo + rand() * (hi - lo), lo + rand() * (hi - lo));
  const maxPoints = 6000;
  while (active.length > 0 && pts.length < maxPoints) {
    const ai = Math.floor(rand() * active.length);
    const base = pts[active[ai]!]!;
    let placed = false;
    for (let k = 0; k < 20; k++) {
      const ang = rand() * Math.PI * 2;
      const dist = r * (1 + rand());
      const x = base[0] + Math.cos(ang) * dist;
      const y = base[1] + Math.sin(ang) * dist;
      if (fits(x, y)) {
        push(x, y);
        placed = true;
        break;
      }
    }
    if (!placed) {
      active[ai] = active[active.length - 1]!;
      active.pop();
    }
  }
  return pts.map(([x, y]) => [x + cx * CHUNK_SIZE, y + cz * CHUNK_SIZE]);
}

/** Wahrzeichen-Freiräume (Fokus-Slots der Regionen im Chunk + externe Wahrzeichen). */
function landmarkCleared(slots: readonly LandmarkSlot[], x: number, z: number, radius: number): boolean {
  for (const l of slots) if (Math.hypot(x - l.position[0], z - l.position[2]) < l.clearRadius + radius) return true;
  return false;
}

/** Regionen, die ein Chunk berührt (Ecken, Mitte, Kantenmitten). */
function chunkRegions(field: PlaneField, cx: number, cz: number): string[] {
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const keys = new Set<string>();
  const rs = {} as RegionSample;
  for (let j = 0; j <= 4; j++) for (let i = 0; i <= 4; i++) keys.add(field.sample(ox + (i / 4) * CHUNK_SIZE, oz + (j / 4) * CHUNK_SIZE, rs).region.key);
  return [...keys];
}

function snapToMesh(mesh: PlaneChunkMesh | null | undefined, p: Vec3): number {
  if (!mesh) return 0;
  const h = chunkMeshHeightAt(mesh, p[0], p[2]);
  if (h === null) return 0;
  const shift = h - p[1];
  p[1] = h;
  return shift;
}

export function scatterPlaneTrees(field: PlaneField, cx: number, cz: number, options: PlaneScatterOptions = {}): PlanetTree[] {
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const rs = {} as RegionSample;
  field.sample(ox + CHUNK_SIZE / 2, oz + CHUNK_SIZE / 2, rs);
  const family = field.spec(rs.world).vegetation;
  const regions = chunkRegions(field, cx, cz);
  const slots = field.landmarksIn(regions);
  // Dichte: die dichteste Welt im Chunk bestimmt das Poisson-Raster, dünnere lichten aus
  let maxDensity = family.density;
  for (const k of regions) maxDensity = Math.max(maxDensity, field.spec(field.region(k).world).vegetation.density);
  const density = maxDensity * (options.densityScale ?? 1);
  if (density <= 0) return [];
  const minDist = Math.sqrt(1 / (density * 1.7));
  const rand = mulberry32(hash32('plane-trees', cx, cz, field.seed));
  const pts = poissonInChunk(field.seed, cx, cz, 'trees', minDist, options.edgeMargin ?? 0.15);
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const raw: Array<{ tree: PlanetTree; priority: number }> = [];
  for (const [x, z] of pts) {
    field.sample(x, z, rs);
    const world = rs.world;
    const key = rs.region.key;
    const fam = field.spec(world).vegetation;
    if (fam.density <= 0) continue;
    // Windbäume an der Klippenkante (Welt 14): nur im Band hinter der Klippe
    const band = (fam as TreeFamily).coastBand;
    if (band) {
      const f = field.features.seaDistance(key, x, z, true);
      if (f === null || f > -band[0] || f < -band[1]) continue;
    }
    const rel = Math.min(1, fam.density / Math.max(1e-6, maxDensity));
    const forest = field.forestAt(x, z);
    const ft = fam.forestThreshold ?? 0.51;
    const fm = smoothstep(ft - 0.09, ft + 0.09, forest);
    let pAccept = rel * (1 - fam.clumpiness + fam.clumpiness * fm);
    if (fam.rows) {
      const hn = field.heightNormAt(x, z) + (forest - 0.5) * 0.12;
      const q = Math.abs(((hn / fam.rows.spacing) % 1) - 0.5) * 2;
      pAccept = rel * smoothstep(1 - fam.rows.width, 1 - fam.rows.width * 0.4, q);
    }
    if (rand() > pAccept) continue;
    const pick = planeComposeGroveTree(field, x, z, fam, pickTreeKind(fam.kinds, rand()), fam.scale[0] + (fam.scale[1] - fam.scale[0]) * (0.35 * rand() + 0.65 * rand()), rand);
    if (!pick) continue;
    const { kind, scale } = pick;
    const prop = TREE_PROPORTIONS[kind];
    const canopyRadius = prop.radius * scale;
    if (options.clear?.(x, z, canopyRadius)) continue;
    if (landmarkCleared(slots, x, z, canopyRadius)) continue;
    // Wahrzeichen (Fels, Ruine, Becken, Sumpf): keine Bäume in Stein und Wasser
    if (field.landmarkBlocks(x, z, canopyRadius * 0.6)) continue;
    const hn = field.features.region(key).snow ? field.heightNormAt(x, z) : 0;
    if (field.features.blocksTree(key, x, z, canopyRadius, hn)) continue;
    field.surfaceAt(x, z, pos, nor);
    snapToMesh(options.mesh, pos);
    const hullH = prop.hull * canopyRadius;
    raw.push({
      tree: {
        position: [pos[0], pos[1], pos[2]],
        normal: [nor[0], nor[1], nor[2]],
        kind,
        scale,
        canopyRadius,
        trunkHeight: prop.trunk * canopyRadius,
        hullCenter: [pos[0], pos[1] + hullH, pos[2]],
        growth: 0,
        zone: 0,
        world,
        rank: 0,
        variant: rand(),
      },
      priority: rand(),
    });
  }
  raw.sort((a, b) => a.priority - b.priority);
  // Fokus-Bäume der Weltkompositionen (Slots mit Baum-Instanz) in diesem Chunk wachsen zuerst
  for (const l of slots) {
    const inst = l.instance;
    if (!inst || !isTreeKind(inst.kind)) continue;
    const [px, py, pz] = l.position;
    if (px < ox || px >= ox + CHUNK_SIZE || pz < oz || pz >= oz + CHUNK_SIZE) continue;
    const kind = inst.kind as TreeKind;
    const prop = TREE_PROPORTIONS[kind];
    const canopyRadius = prop.radius * inst.scale;
    const hullH = prop.hull * canopyRadius;
    const p: Vec3 = [px, py, pz];
    snapToMesh(options.mesh, p);
    raw.unshift({
      tree: {
        position: p,
        normal: [l.normal[0], l.normal[1], l.normal[2]],
        kind,
        scale: inst.scale,
        canopyRadius,
        trunkHeight: prop.trunk * canopyRadius,
        hullCenter: [p[0], p[1] + hullH, p[2]],
        growth: 0,
        zone: 0,
        world: l.world,
        rank: 0,
        variant: 0.37,
      },
      priority: -1,
    });
  }
  const n = raw.length;
  return raw.map((e, i) => ({ ...e.tree, rank: n > 0 ? i / n : 0, growth: n > 0 ? i / n : 0 }));
}

const TRASH_KINDS: Array<[PlanetPropKind, number]> = [
  ['mound', 0.34],
  ['monolith', 0.1],
  ['vent', 0.14],
  ['tire', 0.22],
  ['pipe', 0.2],
];

/** Platzbedarf (Radius in Welteinheiten) je Requisit bei Skalierung 1. */
export const PROP_FOOTPRINT: Record<PlanetPropKind, number> = {
  scrap: 0.7,
  pool: 1.2,
  animal: 0.4,
  mound: 0.9,
  monolith: 0.6,
  vent: 0.5,
  tire: 0.5,
  pipe: 0.9,
  barn: 2.6,
  rock: 0.8,
};

export function scatterPlaneProps(field: PlaneField, cx: number, cz: number, options: PlaneScatterOptions & { trashScale?: number } = {}): PlanetProp[] {
  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const rs = {} as RegionSample;
  const regions = chunkRegions(field, cx, cz);
  const slots = field.landmarksIn(regions);
  const out: PlanetProp[] = [];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const scale = options.densityScale ?? 1;
  const trashScale = options.trashScale ?? 1;
  // Dichten: Maximum der Welten im Chunk (jeder Kandidat prüft dann seine eigene Welt)
  const maxOf = (k: keyof PlanetPropSpec): number => {
    let m = 0;
    for (const key of regions) m = Math.max(m, field.spec(field.region(key).world).props?.[k] ?? 0);
    return m;
  };
  const place = (
    density: number,
    salt: string,
    specKey: keyof PlanetPropSpec,
    pick: (rand: () => number, forest: number, spec: PlanetPropSpec | undefined, fam: PlanetVegetationFamily) => { kind: PlanetPropKind; scale: number } | null,
  ) => {
    if (density <= 0) return;
    const minDist = Math.sqrt(1 / (density * 1.7));
    const rand = mulberry32(hash32('plane-' + salt, cx, cz, field.seed));
    const pts = poissonInChunk(field.seed, cx, cz, salt, minDist, options.edgeMargin ?? 0.3);
    const items: Array<{ prop: PlanetProp; priority: number }> = [];
    for (const [x, z] of pts) {
      field.sample(x, z, rs);
      const w = rs.world;
      const key = rs.region.key;
      const spec = field.spec(w);
      const local = spec.props?.[specKey] ?? 0;
      const forest = field.forestAt(x, z);
      // Anteil der eigenen Welt an der Chunkdichte
      const keep = rand() < Math.min(1, local / Math.max(1e-6, density / Math.max(1e-6, specKey === 'trash' || specKey === 'pools' ? scale * trashScale : scale)));
      const r = keep ? pick(rand, forest, spec.props, spec.vegetation) : null;
      const yaw = rand() * Math.PI * 2;
      const variant = rand();
      const priority = rand();
      if (!r) continue;
      const foot = PROP_FOOTPRINT[r.kind] * r.scale;
      if (options.clear?.(x, z, foot)) continue;
      if (landmarkCleared(slots, x, z, foot)) continue;
      if (field.landmarkBlocks(x, z, foot)) continue;
      if (field.features.blocksProp(key, x, z, foot)) continue;
      field.surfaceAt(x, z, pos, nor);
      snapToMesh(options.mesh, pos);
      items.push({ prop: { kind: r.kind, position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], scale: r.scale, yaw, zone: 0, world: w, rank: 0, variant }, priority });
    }
    items.sort((a, b) => a.priority - b.priority);
    items.forEach((e, i) => out.push({ ...e.prop, rank: items.length > 0 ? i / items.length : 0 }));
  };

  place(maxOf('trash') * scale * trashScale, 'trash', 'trash', (rand, forest) => {
    if (forest > 0.62 && rand() < 0.6) return null;
    let acc = 0;
    const t = rand();
    let kind: PlanetPropKind = 'mound';
    for (const [k, w] of TRASH_KINDS) {
      acc += w;
      if (t < acc) {
        kind = k;
        break;
      }
    }
    const size = kind === 'monolith' ? 0.8 + rand() * 1.4 : kind === 'mound' ? 0.6 + rand() * 1.1 : 0.5 + rand() * 0.7;
    return { kind, scale: size };
  });
  place(maxOf('pools') * scale * trashScale, 'pool', 'pools', (rand, forest) => (forest < 0.55 && rand() < 0.85 ? { kind: 'pool', scale: 1.3 + rand() * 1.9 } : null));
  place(maxOf('barns') * scale, 'barn', 'barns', (rand, forest) => (forest < 0.6 ? { kind: 'barn', scale: 2.2 + rand() * 1.6 } : null));
  place(maxOf('rocks') * scale, 'rock', 'rocks', (rand) => (rand() < 0.8 ? { kind: 'rock', scale: 0.7 + rand() * 1.5 } : null));
  place(maxOf('animals') * scale, 'animal', 'animals', (rand, forest) => (forest < 0.5 && rand() < 0.7 ? { kind: 'animal', scale: 0.8 + rand() * 0.35 } : null));
  // Fokus-Requisiten der Weltkompositionen (z. B. die rote Scheune)
  for (const l of slots) {
    const inst = l.instance;
    if (!inst || isTreeKind(inst.kind)) continue;
    const [px, py, pz] = l.position;
    if (px < ox || px >= ox + CHUNK_SIZE || pz < oz || pz >= oz + CHUNK_SIZE) continue;
    const p: Vec3 = [px, py, pz];
    snapToMesh(options.mesh, p);
    out.push({ kind: inst.kind as PlanetPropKind, position: p, normal: [l.normal[0], l.normal[1], l.normal[2]], scale: inst.scale, yaw: (l.yawDeg * Math.PI) / 180, zone: 0, world: l.world, rank: 0, variant: 0.37 });
  }
  void NO_WATER;
  return out;
}
