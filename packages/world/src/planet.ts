import { GradientNoise3 } from './noise';
import { hash32, mulberry32 } from './rng';
import { TREE_PROPORTIONS, type TreeInstance, type TreeKind } from './scatterTrees';
import type { Vec3 } from './capPatch';

/**
 * Rotierbarer Planet: Cube-Sphere mit `chunksPerFace²` Chunks pro Würfelseite, ein globales Höhenfeld aus
 * 3D-Gradientenrauschen auf der Einheitsrichtung (nahtlos über Chunk- und Seitengrenzen), vier Zonen als
 * Breitenbänder (Nord → Süd) mit verrauschten Grenzen ("Risse"), Level-Pfad als Spirale von Pol zu Pol.
 * Alles deterministisch: `seed = hash32('chunk', zone, face, cx, cy)`.
 */

export interface PlanetVegetationFamily {
  /** Bäume pro Welteinheit² vor Waldmaske und Qualitätsfaktor. */
  density: number;
  /** 0 = gleichmäßig, 1 = nur Waldflecken. */
  clumpiness: number;
  kinds: Partial<Record<TreeKind, number>>;
  /** Größenfaktor-Bereich. */
  scale: [number, number];
  /** Requisiten der Zone: Schrotthaufen (dunkle Boxen) oder Öl-/Sirupbecken (flache dunkle Scheiben). */
  props?: 'scrap' | 'pool' | null;
  propDensity?: number;
  /** Tiere (Silhouetten) pro Welteinheit² auf offenen Flächen. */
  animalDensity?: number;
}

export interface PlanetZoneParams {
  id: string;
  hillAmplitude: number;
  vegetation: PlanetVegetationFamily;
}

export interface PlanetParams {
  radius: number;
  seed: number;
  chunksPerFace: number;
  /** Zonen von Nord nach Süd (gleich breite Breitenbänder). */
  zones: PlanetZoneParams[];
  hillWavelength?: number;
  /** Amplitude des Grenz-Wobbles in Zonenbreiten (Standard 0.07 ≈ ±3°). */
  borderWobble?: number;
}

export interface ChunkId {
  face: number;
  cx: number;
  cy: number;
}

export interface ChunkMeshData {
  id: ChunkId;
  key: string;
  vertexCount: number;
  positions: Float32Array;
  normals: Float32Array;
  /** Höhe 0..1 relativ zur Zonen-Amplitude. */
  height: Float32Array;
  /** Kontinuierliche Zonenkoordinate (Grenzen bei ganzen Zahlen). */
  zone: Float32Array;
  /** Abstand zur nächsten Zonengrenze in Welteinheiten. */
  border: Float32Array;
  /** Index der nächsten Grenze (0 = Zone 0|1, …), -1 = keine. */
  borderId: Float32Array;
  indices: Uint16Array | Uint32Array;
  bounds: { min: Vec3; max: Vec3 };
  center: Vec3;
  /** Zonenindex am Chunk-Mittelpunkt. */
  zoneIndex: number;
}

export interface PlanetTree extends TreeInstance {
  zone: number;
  /** Wachstumsrang 0..1 innerhalb des Chunks. */
  rank: number;
}

export type PlanetPropKind = 'scrap' | 'pool' | 'animal';

export interface PlanetProp {
  kind: PlanetPropKind;
  position: Vec3;
  normal: Vec3;
  scale: number;
  yaw: number;
  zone: number;
  rank: number;
}

export interface SpiralNode {
  index: number;
  zone: number;
  position: Vec3;
  normal: Vec3;
  /** Breite/Länge in Grad. */
  lat: number;
  lon: number;
}

export interface SpiralPath {
  nodes: SpiralNode[];
  dots: Array<{ position: Vec3; normal: Vec3 }>;
  length: number;
}

// --- Würfelseiten ------------------------------------------------------------------------------------
// origin + fu·right + fv·up, right × up zeigt nach außen (Dreiecke gegen den Uhrzeigersinn von außen).
const FACES: Array<{ origin: Vec3; right: Vec3; up: Vec3 }> = [
  { origin: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  { origin: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
  { origin: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] },
  { origin: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] },
  { origin: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
  { origin: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
];

export function chunkKey(id: ChunkId): string {
  return `${id.face}:${id.cx}:${id.cy}`;
}

export function chunkList(chunksPerFace: number): ChunkId[] {
  const out: ChunkId[] = [];
  for (let face = 0; face < 6; face++) for (let cy = 0; cy < chunksPerFace; cy++) for (let cx = 0; cx < chunksPerFace; cx++) out.push({ face, cx, cy });
  return out;
}

/** Einheitsrichtung für lokale Chunk-Koordinaten lu, lv ∈ [-1, 1]. */
export function chunkDirection(id: ChunkId, chunksPerFace: number, lu: number, lv: number, out: Vec3): Vec3 {
  const f = FACES[id.face]!;
  const fu = -1 + (2 * (id.cx + (lu + 1) * 0.5)) / chunksPerFace;
  const fv = -1 + (2 * (id.cy + (lv + 1) * 0.5)) / chunksPerFace;
  const x = f.origin[0] + fu * f.right[0] + fv * f.up[0];
  const y = f.origin[1] + fu * f.right[1] + fv * f.up[1];
  const z = f.origin[2] + fu * f.right[2] + fv * f.up[2];
  const inv = 1 / Math.hypot(x, y, z);
  out[0] = x * inv;
  out[1] = y * inv;
  out[2] = z * inv;
  return out;
}

/** Winkelradius eines Chunks (Mittelpunkt → fernste Ecke), Maximum über alle Chunks einer Seite. */
export function chunkAngularRadius(chunksPerFace: number): number {
  const c: Vec3 = [0, 0, 0];
  const e: Vec3 = [0, 0, 0];
  let worst = 0;
  for (let cy = 0; cy < chunksPerFace; cy++) {
    for (let cx = 0; cx < chunksPerFace; cx++) {
      const id: ChunkId = { face: 4, cx, cy };
      chunkDirection(id, chunksPerFace, 0, 0, c);
      for (const [lu, lv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        chunkDirection(id, chunksPerFace, lu, lv, e);
        const d = Math.min(1, c[0] * e[0] + c[1] * e[1] + c[2] * e[2]);
        worst = Math.max(worst, Math.acos(d));
      }
    }
  }
  return worst + 0.005;
}

// --- Feld ------------------------------------------------------------------------------------------

export class PlanetField {
  readonly params: PlanetParams;
  readonly hMax: number;
  private readonly hills: GradientNoise3;
  private readonly biome: GradientNoise3;
  private readonly forest: GradientNoise3;
  private readonly wobble: GradientNoise3;
  private readonly freq: number;
  private readonly borderWobble: number;
  private readonly zoneWidthRad: number;

  constructor(params: PlanetParams) {
    if (params.zones.length < 1) throw new Error('PlanetField needs at least one zone');
    this.params = params;
    this.hills = new GradientNoise3(hash32('hills', params.seed));
    this.biome = new GradientNoise3(hash32('biome', params.seed));
    this.forest = new GradientNoise3(hash32('forest', params.seed));
    this.wobble = new GradientNoise3(hash32('border', params.seed));
    this.freq = params.radius / (params.hillWavelength ?? 11);
    this.borderWobble = params.borderWobble ?? 0.07;
    this.zoneWidthRad = Math.PI / params.zones.length;
    this.hMax = Math.max(...params.zones.map((z) => z.hillAmplitude));
  }

  get zoneCount(): number {
    return this.params.zones.length;
  }

  /** Kontinuierliche Zonenkoordinate 0..zones (Nordpol → Südpol), Grenzen bei ganzen Zahlen, verrauscht. */
  zoneCoord(dx: number, dy: number, dz: number): number {
    const lat = Math.asin(Math.max(-1, Math.min(1, dy))); // +π/2 am Nordpol
    const base = ((Math.PI / 2 - lat) / Math.PI) * this.zoneCount;
    const w = this.wobble.fbm(dx * 2.3 + 11.7, dy * 2.3, dz * 2.3 - 4.1, 2) * this.borderWobble;
    // Wobble an den Polen ausblenden, damit die Koordinate im Bereich bleibt
    const polar = Math.min(1, Math.max(0, 1 - Math.abs(dy) * 1.02));
    return Math.min(this.zoneCount - 1e-6, Math.max(0, base + w * polar));
  }

  zoneIndex(dx: number, dy: number, dz: number): number {
    return Math.min(this.zoneCount - 1, Math.floor(this.zoneCoord(dx, dy, dz)));
  }

  /** Abstand (Welteinheiten) zur nächsten Zonengrenze und deren Index (-1 = keine, an den Polen). */
  borderAt(dx: number, dy: number, dz: number): { dist: number; border: number } {
    const zc = this.zoneCoord(dx, dy, dz);
    const nearest = Math.round(zc);
    if (nearest <= 0 || nearest >= this.zoneCount) return { dist: 1e4, border: -1 };
    return { dist: Math.abs(zc - nearest) * this.zoneWidthRad * this.params.radius, border: nearest - 1 };
  }

  /** Höhenamplitude am Ort (zwischen Zonen weich überblendet). */
  amplitudeAt(dx: number, dy: number, dz: number): number {
    const zc = this.zoneCoord(dx, dy, dz) - 0.5;
    const i = Math.max(0, Math.min(this.zoneCount - 1, Math.floor(zc)));
    const j = Math.min(this.zoneCount - 1, i + 1);
    const t = Math.min(1, Math.max(0, zc - i));
    const a = this.params.zones[i]!.hillAmplitude;
    const b = this.params.zones[j]!.hillAmplitude;
    return a + (b - a) * (t * t * (3 - 2 * t));
  }

  /** Höhe in Welteinheiten (0..Amplitude), glatt, ohne Grate. */
  heightAt(dx: number, dy: number, dz: number): number {
    const n = this.hills.fbm(dx * this.freq, dy * this.freq, dz * this.freq, 2);
    const t = Math.min(1, Math.max(0, 0.5 + 0.55 * n));
    return this.amplitudeAt(dx, dy, dz) * (t * t * (3 - 2 * t));
  }

  /** Höhe 0..1 relativ zur lokalen Amplitude. */
  heightNormAt(dx: number, dy: number, dz: number): number {
    const a = this.amplitudeAt(dx, dy, dz);
    return a > 1e-6 ? Math.min(1, this.heightAt(dx, dy, dz) / a) : 0;
  }

  biomeAt(dx: number, dy: number, dz: number): number {
    const f = this.freq * 0.45;
    return Math.min(1, Math.max(0, 0.5 + 0.6 * this.biome.fbm(dx * f + 5.1, dy * f - 2.3, dz * f + 9.7, 2)));
  }

  /** Waldmaske 0..1 (Klumpung der Vegetation). */
  forestAt(dx: number, dy: number, dz: number): number {
    const f = this.freq / 1.6;
    return 0.5 + 0.5 * this.forest.fbm(dx * f + 3.3, dy * f, dz * f - 7.1, 2);
  }

  /** Oberflächenpunkt (vom Planetenmittelpunkt) und Normale in einer Einheitsrichtung. */
  surfaceAt(dx: number, dy: number, dz: number, outPos: Vec3, outNormal: Vec3): void {
    const R = this.params.radius;
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l;
    dy /= l;
    dz /= l;
    const r = R + this.heightAt(dx, dy, dz);
    outPos[0] = dx * r;
    outPos[1] = dy * r;
    outPos[2] = dz * r;
    // Tangentialbasis
    const ax = Math.abs(dy) < 0.9 ? 0 : 1;
    const ay = Math.abs(dy) < 0.9 ? 1 : 0;
    let t1x = ay * dz;
    let t1y = -ax * dz;
    let t1z = ax * dy - ay * dx;
    const l1 = Math.hypot(t1x, t1y, t1z) || 1;
    t1x /= l1;
    t1y /= l1;
    t1z /= l1;
    const t2x = dy * t1z - dz * t1y;
    const t2y = dz * t1x - dx * t1z;
    const t2z = dx * t1y - dy * t1x;
    const eps = 0.006;
    const p = (ox: number, oy: number, oz: number): Vec3 => {
      const ex = dx + ox;
      const ey = dy + oy;
      const ez = dz + oz;
      const el = Math.hypot(ex, ey, ez) || 1;
      const rr = R + this.heightAt(ex / el, ey / el, ez / el);
      return [(ex / el) * rr, (ey / el) * rr, (ez / el) * rr];
    };
    const pa = p(t1x * eps, t1y * eps, t1z * eps);
    const pb = p(-t1x * eps, -t1y * eps, -t1z * eps);
    const pc = p(t2x * eps, t2y * eps, t2z * eps);
    const pd = p(-t2x * eps, -t2y * eps, -t2z * eps);
    const ex = pa[0] - pb[0];
    const ey = pa[1] - pb[1];
    const ez = pa[2] - pb[2];
    const fx = pc[0] - pd[0];
    const fy = pc[1] - pd[1];
    const fz = pc[2] - pd[2];
    let nx = ey * fz - ez * fy;
    let ny = ez * fx - ex * fz;
    let nz = ex * fy - ey * fx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    if (nx * dx + ny * dy + nz * dz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    outNormal[0] = nx;
    outNormal[1] = ny;
    outNormal[2] = nz;
  }
}

// --- Chunk-Mesh ------------------------------------------------------------------------------------

export function generateChunkMesh(field: PlanetField, id: ChunkId, res: number): ChunkMeshData {
  const n = Math.max(2, Math.floor(res));
  const count = n * n;
  const cpf = field.params.chunksPerFace;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const height = new Float32Array(count);
  const zone = new Float32Array(count);
  const border = new Float32Array(count);
  const borderId = new Float32Array(count);
  const dir: Vec3 = [0, 0, 0];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let j = 0; j < n; j++) {
    const lv = (j / (n - 1)) * 2 - 1;
    for (let i = 0; i < n; i++) {
      const lu = (i / (n - 1)) * 2 - 1;
      const k = j * n + i;
      chunkDirection(id, cpf, lu, lv, dir);
      field.surfaceAt(dir[0], dir[1], dir[2], pos, nor);
      positions[k * 3] = pos[0];
      positions[k * 3 + 1] = pos[1];
      positions[k * 3 + 2] = pos[2];
      normals[k * 3] = nor[0];
      normals[k * 3 + 1] = nor[1];
      normals[k * 3 + 2] = nor[2];
      height[k] = field.heightNormAt(dir[0], dir[1], dir[2]);
      zone[k] = field.zoneCoord(dir[0], dir[1], dir[2]);
      const b = field.borderAt(dir[0], dir[1], dir[2]);
      border[k] = Math.min(999, b.dist);
      borderId[k] = b.border;
      if (pos[0] < min[0]) min[0] = pos[0];
      if (pos[1] < min[1]) min[1] = pos[1];
      if (pos[2] < min[2]) min[2] = pos[2];
      if (pos[0] > max[0]) max[0] = pos[0];
      if (pos[1] > max[1]) max[1] = pos[1];
      if (pos[2] > max[2]) max[2] = pos[2];
    }
  }
  const quads = (n - 1) * (n - 1);
  const indices = count <= 65535 ? new Uint16Array(quads * 6) : new Uint32Array(quads * 6);
  let o = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices[o++] = a;
      indices[o++] = b;
      indices[o++] = c;
      indices[o++] = b;
      indices[o++] = d;
      indices[o++] = c;
    }
  }
  chunkDirection(id, cpf, 0, 0, dir);
  const centre: Vec3 = [dir[0] * field.params.radius, dir[1] * field.params.radius, dir[2] * field.params.radius];
  return {
    id,
    key: chunkKey(id),
    vertexCount: count,
    positions,
    normals,
    height,
    zone,
    border,
    borderId,
    indices,
    bounds: { min, max },
    center: centre,
    zoneIndex: field.zoneIndex(dir[0], dir[1], dir[2]),
  };
}

// --- Streuung je Chunk ------------------------------------------------------------------------------

export interface ChunkScatterOptions {
  /** Multiplikator auf die Zonendichte (Qualitätsstufe). */
  densityScale?: number;
  /** Punkte, die frei bleiben (Pfadkorridor): true = verwerfen. */
  clear?: (p: Vec3) => boolean;
  /** Rand in lokalen uv, in dem nichts steht (Standard 0.02). */
  edgeMargin?: number;
}

/** Poisson-Disc im lokalen Chunk-Raum, deterministisch über `hash32('chunk', zone, face, cx, cy)`. */
function poissonInChunk(field: PlanetField, id: ChunkId, salt: string, minDistWorld: number, margin: number): Array<{ lu: number; lv: number; dir: Vec3 }> {
  const cpf = field.params.chunksPerFace;
  const dir: Vec3 = [0, 0, 0];
  chunkDirection(id, cpf, 0, 0, dir);
  const zone = field.zoneIndex(dir[0], dir[1], dir[2]);
  const rand = mulberry32(hash32('chunk', salt, zone, id.face, id.cx, id.cy, field.params.seed));
  // Halbe Kantenlänge in Welteinheiten (am Chunk-Mittelpunkt)
  const e: Vec3 = [0, 0, 0];
  chunkDirection(id, cpf, 1, 0, e);
  const halfExtent = Math.acos(Math.min(1, dir[0] * e[0] + dir[1] * e[1] + dir[2] * e[2])) * field.params.radius;
  const r = Math.max(1e-3, minDistWorld / Math.max(1e-3, halfExtent));
  const lo = -1 + margin;
  const hi = 1 - margin;
  const cell = r / Math.SQRT2;
  const gridN = Math.ceil((hi - lo) / cell) + 1;
  const grid = new Int32Array(gridN * gridN).fill(-1);
  const pts: Array<[number, number]> = [];
  const active: number[] = [];
  const gi = (x: number, y: number) => Math.floor((y - lo) / cell) * gridN + Math.floor((x - lo) / cell);
  const fits = (x: number, y: number): boolean => {
    if (x < lo || x > hi || y < lo || y > hi) return false;
    const cx = Math.floor((x - lo) / cell);
    const cy = Math.floor((y - lo) / cell);
    for (let j = Math.max(0, cy - 2); j <= Math.min(gridN - 1, cy + 2); j++) {
      for (let i = Math.max(0, cx - 2); i <= Math.min(gridN - 1, cx + 2); i++) {
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
  return pts.map(([lu, lv]) => ({ lu, lv, dir: chunkDirection(id, cpf, lu, lv, [0, 0, 0]) }));
}

export function scatterChunkTrees(field: PlanetField, id: ChunkId, options: ChunkScatterOptions = {}): PlanetTree[] {
  const cpf = field.params.chunksPerFace;
  const centreDir: Vec3 = [0, 0, 0];
  chunkDirection(id, cpf, 0, 0, centreDir);
  const centreZone = field.zoneIndex(centreDir[0], centreDir[1], centreDir[2]);
  const family = field.params.zones[centreZone]!.vegetation;
  const density = family.density * (options.densityScale ?? 1);
  if (density <= 0) return [];
  const minDist = Math.sqrt(1 / (density * 1.7));
  const rand = mulberry32(hash32('trees', centreZone, id.face, id.cx, id.cy, field.params.seed));
  const pts = poissonInChunk(field, id, 'trees', minDist, options.edgeMargin ?? 0.02);
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const raw: Array<{ tree: PlanetTree; priority: number }> = [];
  for (const q of pts) {
    const d = q.dir;
    // Zone am Baum (kann von der Chunk-Zone abweichen): eigene Familie
    const zone = field.zoneIndex(d[0], d[1], d[2]);
    const fam = field.params.zones[zone]!.vegetation;
    const forest = field.forestAt(d[0], d[1], d[2]);
    const fm = smoothstep(0.42, 0.6, forest);
    const pAccept = 1 - fam.clumpiness + fam.clumpiness * fm;
    if (rand() > pAccept) continue;
    field.surfaceAt(d[0], d[1], d[2], pos, nor);
    if (options.clear && options.clear(pos)) continue;
    const kind = pickKind(fam.kinds, rand());
    const scale = fam.scale[0] + (fam.scale[1] - fam.scale[0]) * (0.35 * rand() + 0.65 * rand());
    const prop = TREE_PROPORTIONS[kind];
    const canopyRadius = prop.radius * scale;
    const trunkHeight = prop.trunk * canopyRadius;
    const hullH = prop.hull * canopyRadius;
    raw.push({
      tree: {
        position: [pos[0], pos[1], pos[2]],
        normal: [nor[0], nor[1], nor[2]],
        kind,
        scale,
        canopyRadius,
        trunkHeight,
        hullCenter: [pos[0] + nor[0] * hullH, pos[1] + nor[1] * hullH, pos[2] + nor[2] * hullH],
        growth: 0,
        zone,
        rank: 0,
      },
      priority: rand(),
    });
  }
  raw.sort((a, b) => a.priority - b.priority);
  const n = raw.length;
  return raw.map((e, i) => ({ ...e.tree, rank: n > 0 ? i / n : 0, growth: n > 0 ? i / n : 0 }));
}

export function scatterChunkProps(field: PlanetField, id: ChunkId, options: ChunkScatterOptions = {}): PlanetProp[] {
  const cpf = field.params.chunksPerFace;
  const centreDir: Vec3 = [0, 0, 0];
  chunkDirection(id, cpf, 0, 0, centreDir);
  const centreZone = field.zoneIndex(centreDir[0], centreDir[1], centreDir[2]);
  const family = field.params.zones[centreZone]!.vegetation;
  const out: PlanetProp[] = [];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const scale = options.densityScale ?? 1;

  const place = (kind: PlanetPropKind, density: number, salt: string, pick: (rand: () => number, forest: number) => { ok: boolean; scale: number }) => {
    if (density <= 0) return;
    const minDist = Math.sqrt(1 / (density * 1.7));
    const rand = mulberry32(hash32(salt, centreZone, id.face, id.cx, id.cy, field.params.seed));
    const pts = poissonInChunk(field, id, salt, minDist, options.edgeMargin ?? 0.03);
    const items: Array<{ prop: PlanetProp; priority: number }> = [];
    for (const q of pts) {
      const d = q.dir;
      const zone = field.zoneIndex(d[0], d[1], d[2]);
      const forest = field.forestAt(d[0], d[1], d[2]);
      const r = pick(rand, forest);
      if (!r.ok) continue;
      field.surfaceAt(d[0], d[1], d[2], pos, nor);
      if (options.clear && options.clear(pos)) continue;
      items.push({ prop: { kind, position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], scale: r.scale, yaw: rand() * Math.PI * 2, zone, rank: 0 }, priority: rand() });
    }
    items.sort((a, b) => a.priority - b.priority);
    items.forEach((e, i) => out.push({ ...e.prop, rank: items.length > 0 ? i / items.length : 0 }));
  };

  if (family.props === 'scrap') place('scrap', (family.propDensity ?? 0.03) * scale, 'scrap', (rand) => ({ ok: rand() < 0.75, scale: 0.5 + rand() * 0.9 }));
  if (family.props === 'pool') place('pool', (family.propDensity ?? 0.02) * scale, 'pool', (rand, forest) => ({ ok: forest < 0.55 && rand() < 0.8, scale: 1.4 + rand() * 1.8 }));
  place('animal', (family.animalDensity ?? 0.012) * scale, 'animal', (rand, forest) => ({ ok: forest < 0.5 && rand() < 0.7, scale: 0.8 + rand() * 0.35 }));
  return out;
}

// --- Spiralpfad ------------------------------------------------------------------------------------

export interface SpiralOptions {
  nodesPerZone: number;
  /** Umdrehungen von Pol zu Pol. */
  turns?: number;
  /** Polkappen ohne Pfad (Grad). */
  polarMarginDeg?: number;
  /** Abstand der Knoten zu den nominellen Zonengrenzen in Zonenbreiten. */
  borderPad?: number;
  dotSpacing?: number;
  dotClearance?: number;
}

/**
 * Großkreis-Spirale von Pol zu Pol: Breite läuft linear, Länge dreht `turns` mal. Je Zone `nodesPerZone`
 * Knoten in gleichen Bogenlängen innerhalb des Zonenbands (mit Abstand zu den Grenzen), Punkte dazwischen.
 */
export function spiralPath(field: PlanetField, options: SpiralOptions): SpiralPath {
  const zones = field.zoneCount;
  const turns = options.turns ?? 2.75;
  const margin = ((options.polarMarginDeg ?? 9) * Math.PI) / 180;
  const pad = options.borderPad ?? 0.09;
  const dotSpacing = options.dotSpacing ?? 0.6;
  const dotClearance = options.dotClearance ?? 0.95;
  const R = field.params.radius;

  const dirAt = (s: number, out: Vec3): Vec3 => {
    const lat = Math.PI / 2 - margin - s * (Math.PI - 2 * margin);
    const lon = s * turns * Math.PI * 2;
    out[0] = Math.cos(lat) * Math.cos(lon);
    out[1] = Math.sin(lat);
    out[2] = Math.cos(lat) * Math.sin(lon);
    return out;
  };

  // Feine Polylinie mit Bogenlänge
  const steps = 4000;
  const samples: Array<{ s: number; pos: Vec3; nor: Vec3; len: number }> = [];
  const d: Vec3 = [0, 0, 0];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  let total = 0;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    dirAt(s, d);
    field.surfaceAt(d[0], d[1], d[2], pos, nor);
    if (i > 0) {
      const p = samples[i - 1]!.pos;
      total += Math.hypot(pos[0] - p[0], pos[1] - p[1], pos[2] - p[2]);
    }
    samples.push({ s, pos: [pos[0], pos[1], pos[2]], nor: [nor[0], nor[1], nor[2]], len: total });
  }
  const lenAtS = (s: number): number => {
    const i = Math.min(steps, Math.max(0, Math.floor(s * steps)));
    const a = samples[i]!;
    const b = samples[Math.min(steps, i + 1)]!;
    const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return a.len + (b.len - a.len) * t;
  };
  const at = (len: number): { s: number; pos: Vec3; nor: Vec3 } => {
    const target = Math.min(total, Math.max(0, len));
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.len <= target) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!;
    const b = samples[hi]!;
    const t = b.len > a.len ? (target - a.len) / (b.len - a.len) : 0;
    return {
      s: a.s + (b.s - a.s) * t,
      pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * t, a.pos[1] + (b.pos[1] - a.pos[1]) * t, a.pos[2] + (b.pos[2] - a.pos[2]) * t],
      nor: [a.nor[0] + (b.nor[0] - a.nor[0]) * t, a.nor[1] + (b.nor[1] - a.nor[1]) * t, a.nor[2] + (b.nor[2] - a.nor[2]) * t],
    };
  };

  // Zonenband in s: Breite lat ∈ [90 − 180k/zones, …] ↔ s über die Polkappen-Marge
  const latToS = (latRad: number): number => (Math.PI / 2 - margin - latRad) / (Math.PI - 2 * margin);
  const nodes: SpiralNode[] = [];
  let index = 0;
  for (let z = 0; z < zones; z++) {
    const latHi = Math.PI / 2 - (z / zones) * Math.PI;
    const latLo = Math.PI / 2 - ((z + 1) / zones) * Math.PI;
    const padRad = (pad * Math.PI) / zones;
    const s0 = Math.max(0, latToS(latHi - padRad));
    const s1 = Math.min(1, latToS(latLo + padRad));
    const l0 = lenAtS(s0);
    const l1 = lenAtS(s1);
    const n = options.nodesPerZone;
    for (let i = 0; i < n; i++) {
      const len = n > 1 ? l0 + ((l1 - l0) * i) / (n - 1) : (l0 + l1) / 2;
      const { s } = at(len);
      dirAt(s, d);
      field.surfaceAt(d[0], d[1], d[2], pos, nor);
      const lat = (Math.asin(d[1]) * 180) / Math.PI;
      const lon = (Math.atan2(d[2], d[0]) * 180) / Math.PI;
      nodes.push({ index: index++, zone: z, position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], lat, lon });
    }
  }

  const dots: SpiralPath['dots'] = [];
  const first = nodes[0] ? lenAtS(latToS((nodes[0].lat * Math.PI) / 180)) : 0;
  const last = nodes.length > 0 ? lenAtS(latToS((nodes[nodes.length - 1]!.lat * Math.PI) / 180)) : total;
  for (let len = first + dotSpacing * 0.5; len < last; len += dotSpacing) {
    const { pos: p, nor: nn } = at(len);
    let near = false;
    for (const node of nodes) {
      if (Math.hypot(p[0] - node.position[0], p[1] - node.position[1], p[2] - node.position[2]) < dotClearance) {
        near = true;
        break;
      }
    }
    if (near) continue;
    const l = Math.hypot(nn[0], nn[1], nn[2]) || 1;
    dots.push({ position: [p[0], p[1], p[2]], normal: [nn[0] / l, nn[1] / l, nn[2] / l] });
  }
  void R;
  return { nodes, dots, length: total };
}

function pickKind(weights: Partial<Record<TreeKind, number>>, r: number): TreeKind {
  const entries = Object.entries(weights) as Array<[TreeKind, number]>;
  const total = entries.reduce((a, [, w]) => a + (w ?? 0), 0) || 1;
  let acc = 0;
  for (const [kind, w] of entries) {
    acc += (w ?? 0) / total;
    if (r < acc) return kind;
  }
  return entries[entries.length - 1]?.[0] ?? 'dome';
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
