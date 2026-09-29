import { GradientNoise3 } from './noise';
import { hash32 } from './rng';

/**
 * Sphärisches Kappen-Patch: ein gnomonisch projiziertes Quadrat (wie eine Cube-Sphere-Kachel) auf einer Kugel
 * mit Radius `radius`, Öffnungswinkel `arcDeg` (Kante zu Kante), Scheitel bei +Y. Radiale Verschiebung aus
 * 2-Oktaven-fbm: glatte, "gemeißelte" Hügel ohne Grate. Zum Rand hin läuft die Verschiebung auf 0 aus, damit das
 * Patch nahtlos auf einer Füllkugel sitzt.
 */
export interface CapPatchParams {
  radius: number;
  arcDeg: number;
  res: number;
  seed: number;
  /** Höhe der Hügel in Welteinheiten (Standard 1.8). */
  hillAmplitude?: number;
  /** Wellenlänge der Hügel in Welteinheiten (Standard 11). */
  hillWavelength?: number;
  /** Anteil des Randes, über den die Verschiebung ausläuft (0..1 in uv, Standard 0.3). */
  edgeFade?: number;
}

export type Vec3 = [number, number, number];

export interface CapPatch {
  params: Required<CapPatchParams>;
  vertexCount: number;
  /** xyz je Vertex, Kugelmitte = Ursprung, Scheitel bei (0, radius + h, 0). */
  positions: Float32Array;
  normals: Float32Array;
  /** Gnomonische Koordinaten u,v in [-1, 1] je Vertex (für Streuung, Debug, spätere Texturen). */
  uvs: Float32Array;
  indices: Uint16Array | Uint32Array;
  /** Höhe 0..1 relativ zu hMax. */
  height: Float32Array;
  /** Biom-Feld 0..1 (langsames Rauschen, z. B. Wiese → Wald). */
  biome: Float32Array;
  hMax: number;
  /** Achsenparallele Grenzen im Patch-Raum (ohne Vegetation). */
  bounds: { min: Vec3; max: Vec3 };
  /** Sehnenradius des Patches am Scheitel (halbe Kantenlänge in Welteinheiten). */
  halfExtent: number;
}

export interface CapField {
  params: Required<CapPatchParams>;
  hMax: number;
  /** Richtung (normalisiert) für gnomonische Koordinaten u,v ∈ [-1, 1]. */
  direction(u: number, v: number, out: Vec3): Vec3;
  /** Höhe in Welteinheiten für eine Einheitsrichtung (vor Randausblendung). */
  heightAt(dx: number, dy: number, dz: number): number;
  /** Randausblendung 0..1 für u,v. */
  edgeWeight(u: number, v: number): number;
  biomeAt(dx: number, dy: number, dz: number): number;
  /** Oberflächenpunkt und -normale für u,v. */
  surface(u: number, v: number, outPos: Vec3, outNormal: Vec3): void;
}

export function resolveCapParams(p: CapPatchParams): Required<CapPatchParams> {
  return {
    radius: p.radius,
    arcDeg: p.arcDeg,
    res: Math.max(2, Math.floor(p.res)),
    seed: p.seed >>> 0,
    hillAmplitude: p.hillAmplitude ?? 1.8,
    hillWavelength: p.hillWavelength ?? 11,
    edgeFade: p.edgeFade ?? 0.3,
  };
}

/** Erzeugt das Höhenfeld (deterministisch aus `seed`), ohne Mesh. Wird von Patch und Baumstreuung geteilt. */
export function createCapField(params: CapPatchParams): CapField {
  const p = resolveCapParams(params);
  const hills = new GradientNoise3(hash32('hills', p.seed));
  const biome = new GradientNoise3(hash32('biome', p.seed));
  const tanHalf = Math.tan((p.arcDeg * 0.5 * Math.PI) / 180);
  const freq = p.radius / p.hillWavelength; // Rauschkoordinate = Einheitsrichtung · freq
  const hMax = p.hillAmplitude;

  const direction = (u: number, v: number, out: Vec3): Vec3 => {
    const x = u * tanHalf;
    const z = v * tanHalf;
    const inv = 1 / Math.sqrt(x * x + 1 + z * z);
    out[0] = x * inv;
    out[1] = inv;
    out[2] = z * inv;
    return out;
  };

  const heightAt = (dx: number, dy: number, dz: number): number => {
    const n = hills.fbm(dx * freq, dy * freq, dz * freq, 2); // ≈ [-1, 1]
    const t = Math.min(1, Math.max(0, 0.5 + 0.55 * n));
    // Rundung: Kuppen und Mulden weich, Flanken gleichmäßig → keine Grate
    const s = t * t * (3 - 2 * t);
    return hMax * s;
  };

  const edgeWeight = (u: number, v: number): number => {
    const m = Math.max(Math.abs(u), Math.abs(v));
    const t = Math.min(1, Math.max(0, (1 - m) / Math.max(1e-6, p.edgeFade)));
    return t * t * (3 - 2 * t);
  };

  const biomeAt = (dx: number, dy: number, dz: number): number => {
    const f = freq * 0.45;
    const n = biome.fbm(dx * f + 5.1, dy * f - 2.3, dz * f + 9.7, 2);
    return Math.min(1, Math.max(0, 0.5 + 0.6 * n));
  };

  const tmpD: Vec3 = [0, 0, 0];
  const pointAt = (u: number, v: number, out: Vec3): Vec3 => {
    direction(u, v, tmpD);
    const h = heightAt(tmpD[0], tmpD[1], tmpD[2]) * edgeWeight(u, v);
    const r = p.radius + h;
    out[0] = tmpD[0] * r;
    out[1] = tmpD[1] * r;
    out[2] = tmpD[2] * r;
    return out;
  };

  const pu: Vec3 = [0, 0, 0];
  const pv: Vec3 = [0, 0, 0];
  const pu2: Vec3 = [0, 0, 0];
  const pv2: Vec3 = [0, 0, 0];
  const surface = (u: number, v: number, outPos: Vec3, outNormal: Vec3): void => {
    pointAt(u, v, outPos);
    const e = 0.5 / p.res;
    pointAt(u + e, v, pu);
    pointAt(u - e, v, pu2);
    pointAt(u, v + e, pv);
    pointAt(u, v - e, pv2);
    const ax = pu[0] - pu2[0];
    const ay = pu[1] - pu2[1];
    const az = pu[2] - pu2[2];
    const bx = pv[0] - pv2[0];
    const by = pv[1] - pv2[1];
    const bz = pv[2] - pv2[2];
    // dv × du zeigt nach außen (u → +X, v → +Z, Scheitel +Y)
    let nx = by * az - bz * ay;
    let ny = bz * ax - bx * az;
    let nz = bx * ay - by * ax;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    if (nx * outPos[0] + ny * outPos[1] + nz * outPos[2] < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    outNormal[0] = nx;
    outNormal[1] = ny;
    outNormal[2] = nz;
  };

  return { params: p, hMax, direction, heightAt, edgeWeight, biomeAt, surface };
}

/** Erzeugt das Patch-Mesh als typisierte Arrays. Gleicher Seed → identische Arrays. */
export function generateCapPatch(params: CapPatchParams): CapPatch {
  const field = createCapField(params);
  const p = field.params;
  const res = p.res;
  const n = res * res;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const uvs = new Float32Array(n * 2);
  const height = new Float32Array(n);
  const biome = new Float32Array(n);
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const dir: Vec3 = [0, 0, 0];
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (let j = 0; j < res; j++) {
    const v = (j / (res - 1)) * 2 - 1;
    for (let i = 0; i < res; i++) {
      const u = (i / (res - 1)) * 2 - 1;
      const k = j * res + i;
      field.surface(u, v, pos, nor);
      positions[k * 3] = pos[0];
      positions[k * 3 + 1] = pos[1];
      positions[k * 3 + 2] = pos[2];
      normals[k * 3] = nor[0];
      normals[k * 3 + 1] = nor[1];
      normals[k * 3 + 2] = nor[2];
      uvs[k * 2] = u;
      uvs[k * 2 + 1] = v;
      field.direction(u, v, dir);
      const r = Math.hypot(pos[0], pos[1], pos[2]);
      height[k] = Math.min(1, Math.max(0, (r - p.radius) / field.hMax));
      biome[k] = field.biomeAt(dir[0], dir[1], dir[2]);
      if (pos[0] < min[0]) min[0] = pos[0];
      if (pos[1] < min[1]) min[1] = pos[1];
      if (pos[2] < min[2]) min[2] = pos[2];
      if (pos[0] > max[0]) max[0] = pos[0];
      if (pos[1] > max[1]) max[1] = pos[1];
      if (pos[2] > max[2]) max[2] = pos[2];
    }
  }

  const quadCount = (res - 1) * (res - 1);
  const indices = n <= 65535 ? new Uint16Array(quadCount * 6) : new Uint32Array(quadCount * 6);
  let o = 0;
  for (let j = 0; j < res - 1; j++) {
    for (let i = 0; i < res - 1; i++) {
      const a = j * res + i;
      const b = a + 1;
      const c = a + res;
      const d = c + 1;
      // Gegen den Uhrzeigersinn von außen (+Y) gesehen: u → +X, v → +Z
      indices[o++] = a;
      indices[o++] = c;
      indices[o++] = b;
      indices[o++] = b;
      indices[o++] = c;
      indices[o++] = d;
    }
  }

  const halfExtent = p.radius * Math.tan((p.arcDeg * 0.5 * Math.PI) / 180);

  return {
    params: p,
    vertexCount: n,
    positions,
    normals,
    uvs,
    indices,
    height,
    biome,
    hMax: field.hMax,
    bounds: { min, max },
    halfExtent,
  };
}

export interface DisplacedSphereParams extends CapPatchParams {
  widthSegments?: number;
  heightSegments?: number;
  /** Radialer Versatz (z. B. -0.03, damit die Kugel knapp unter dem Patch liegt). */
  radiusOffset?: number;
}

export interface DisplacedSphere {
  vertexCount: number;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array | Uint32Array;
}

/**
 * Ganze Planetenkugel mit demselben Höhenfeld wie das Patch (ohne Randausblendung): Füllkörper für den
 * Horizont, damit Patch und Kugel nahtlos ineinander übergehen. Normalen per finiten Differenzen im Tangentialraum.
 */
export function generateDisplacedSphere(params: DisplacedSphereParams): DisplacedSphere {
  const field = createCapField(params);
  const R = field.params.radius + (params.radiusOffset ?? 0);
  const ws = Math.max(8, Math.floor(params.widthSegments ?? 128));
  const hs = Math.max(6, Math.floor(params.heightSegments ?? 64));
  const n = (ws + 1) * (hs + 1);
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const eps = 0.012;
  const d: Vec3 = [0, 0, 0];
  const t1: Vec3 = [0, 0, 0];
  const t2: Vec3 = [0, 0, 0];
  const pa: Vec3 = [0, 0, 0];
  const pb: Vec3 = [0, 0, 0];
  const pc: Vec3 = [0, 0, 0];
  const pd: Vec3 = [0, 0, 0];
  const displaced = (dx: number, dy: number, dz: number, out: Vec3): Vec3 => {
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l;
    dy /= l;
    dz /= l;
    const r = R + field.heightAt(dx, dy, dz);
    out[0] = dx * r;
    out[1] = dy * r;
    out[2] = dz * r;
    return out;
  };
  let k = 0;
  for (let j = 0; j <= hs; j++) {
    const v = j / hs;
    const theta = v * Math.PI;
    for (let i = 0; i <= ws; i++) {
      const u = i / ws;
      const phi = u * Math.PI * 2;
      d[0] = -Math.sin(theta) * Math.cos(phi);
      d[1] = Math.cos(theta);
      d[2] = Math.sin(theta) * Math.sin(phi);
      displaced(d[0], d[1], d[2], pa);
      positions[k * 3] = pa[0];
      positions[k * 3 + 1] = pa[1];
      positions[k * 3 + 2] = pa[2];
      // Tangentialbasis
      const ax = Math.abs(d[1]) < 0.9 ? 0 : 1;
      const ay = Math.abs(d[1]) < 0.9 ? 1 : 0;
      t1[0] = ay * d[2] - 0 * d[1];
      t1[1] = 0 * d[0] - ax * d[2];
      t1[2] = ax * d[1] - ay * d[0];
      const l1 = Math.hypot(t1[0], t1[1], t1[2]) || 1;
      t1[0] /= l1;
      t1[1] /= l1;
      t1[2] /= l1;
      t2[0] = d[1] * t1[2] - d[2] * t1[1];
      t2[1] = d[2] * t1[0] - d[0] * t1[2];
      t2[2] = d[0] * t1[1] - d[1] * t1[0];
      displaced(d[0] + t1[0] * eps, d[1] + t1[1] * eps, d[2] + t1[2] * eps, pa);
      displaced(d[0] - t1[0] * eps, d[1] - t1[1] * eps, d[2] - t1[2] * eps, pb);
      displaced(d[0] + t2[0] * eps, d[1] + t2[1] * eps, d[2] + t2[2] * eps, pc);
      displaced(d[0] - t2[0] * eps, d[1] - t2[1] * eps, d[2] - t2[2] * eps, pd);
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
      if (nx * d[0] + ny * d[1] + nz * d[2] < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      normals[k * 3] = nx;
      normals[k * 3 + 1] = ny;
      normals[k * 3 + 2] = nz;
      k++;
    }
  }
  const quads = ws * hs;
  const indices = n <= 65535 ? new Uint16Array(quads * 6) : new Uint32Array(quads * 6);
  let o = 0;
  for (let j = 0; j < hs; j++) {
    for (let i = 0; i < ws; i++) {
      const a = j * (ws + 1) + i;
      const b = a + 1;
      const c = a + ws + 1;
      const e = c + 1;
      // von außen gesehen gegen den Uhrzeigersinn (θ von +Y nach -Y, φ um +Y)
      indices[o++] = a;
      indices[o++] = c;
      indices[o++] = b;
      indices[o++] = b;
      indices[o++] = c;
      indices[o++] = e;
    }
  }
  return { vertexCount: n, positions, normals, indices };
}
