import { BufferAttribute, BufferGeometry } from 'three/webgpu';
import { WATER_OVERLAP, lakeRadiusAt, offsetDir, type Lake, type PlanetFeatures, type River, type Vec3 } from '@ee/world';

/** Tiefe (Welteinheiten), um die ein Flussende im See unter dessen Spiegel taucht (kein Z-Fighting). */
const MOUTH_DIP = 0.015;
/** Ringe und Segmente eines Sees (Polargitter: glatte Uferlinie, kaum Sehnenfehler auf der Kugel). */
const LAKE_RINGS = 7;
const LAKE_SEGMENTS = 64;

export interface WaterGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  /** (u längs, v quer, Uferabstand, Eis) je Vertex, Welteinheiten. */
  wa: Float32Array;
  /** (Welt-Index, Strömung, Körper-Hash, Art 0 See / 1 Fluss) je Vertex. */
  wb: Float32Array;
  indices: Uint32Array;
}

interface Acc {
  pos: number[];
  nor: number[];
  wa: number[];
  wb: number[];
  idx: number[];
}

function push(acc: Acc, dir: Vec3, r: number, u: number, v: number, e: number, frozen: number, world: number, flow: number, id: number, kind: number): number {
  acc.pos.push(dir[0] * r, dir[1] * r, dir[2] * r);
  acc.nor.push(dir[0], dir[1], dir[2]);
  acc.wa.push(u, v, e, frozen);
  acc.wb.push(world, flow, id, kind);
  return acc.pos.length / 3 - 1;
}

function idHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return (h % 1000) / 1000;
}

/** See als Polargitter (Mitte + Ringe bis zur Uferlinie), flach auf dem Spiegel. */
function addLake(acc: Acc, lake: Lake, R: number): void {
  const k = Math.sqrt(lake.stretch);
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  const r = R + lake.level;
  const id = idHash(lake.id);
  const frozen = lake.frozen ? 1 : 0;
  const flow = 0.15;
  const dir: Vec3 = [0, 0, 0];
  const centre = push(acc, lake.frame.c, r, 0, 0, lake.radius, frozen, lake.world, flow, id, 0);
  const rings: number[][] = [];
  for (let ring = 1; ring <= LAKE_RINGS + 1; ring++) {
    const row: number[] = [];
    for (let j = 0; j < LAKE_SEGMENTS; j++) {
      const th = (j / LAKE_SEGMENTS) * Math.PI * 2;
      const g = Math.hypot(Math.cos(th) / k, Math.sin(th) * k) || 1; // Welteinheiten je gestreckter Einheit (Normalenrichtung)
      const shore = lakeRadiusAt(lake, th);
      // Ringe bis zur Uferlinie, ein letzter Ring `WATER_OVERLAP` darüber hinaus (verschwindet unter dem Uferwall)
      const rs = ring <= LAKE_RINGS ? (shore * ring) / LAKE_RINGS : shore + WATER_OVERLAP * g;
      const a = Math.cos(th) * rs * k; // längs der Bandachse
      const c = (Math.sin(th) * rs) / k; // quer
      offsetDir(lake.frame, R, a * ca - c * sa, a * sa + c * ca, dir);
      // Uferabstand (Welteinheiten, > 0 im Wasser)
      row.push(push(acc, dir, r, a, c, (shore - rs) / g, frozen, lake.world, flow, id, 0));
    }
    rings.push(row);
  }
  // Der Rahmen (Ost, Nord, Oben) ist linkshändig: θ wächst von oben gesehen im Uhrzeigersinn → Dreiecke umgekehrt
  // anlegen, damit sie von oben gegen den Uhrzeigersinn laufen (Vorderseite)
  const first = rings[0]!;
  for (let j = 0; j < LAKE_SEGMENTS; j++) acc.idx.push(centre, first[(j + 1) % LAKE_SEGMENTS]!, first[j]!);
  for (let ring = 1; ring < rings.length; ring++) {
    const a = rings[ring - 1]!;
    const b = rings[ring]!;
    for (let j = 0; j < LAKE_SEGMENTS; j++) {
      const j1 = (j + 1) % LAKE_SEGMENTS;
      acc.idx.push(a[j]!, b[j1]!, b[j]!);
      acc.idx.push(a[j]!, a[j1]!, b[j1]!);
    }
  }
}

/**
 * Fluss als Band (drei Vertices quer: Ufer, Mitte, Ufer → der Uferabstand interpoliert exakt), Quelle spitz
 * auslaufend; Punkte im Mündungssee tauchen knapp unter dessen Spiegel. `keep(i)` wählt die Segmente (Chunk).
 */
function addRiver(acc: Acc, river: River, lake: Lake | undefined, R: number, keep: (i: number) => boolean): void {
  const n = river.points.length;
  if (n < 2) return;
  const id = idHash(river.id);
  const frozen = river.frozen ? 1 : 0;
  const flow = 1;
  const rows: number[][] = [];
  const dir: Vec3 = [0, 0, 0];
  const lakeHit = { e: 0, theta: 0 };
  for (let i = 0; i < n; i++) {
    const p = river.points[i]!;
    const a = river.points[Math.max(0, i - 1)]!;
    const b = river.points[Math.min(n - 1, i + 1)]!;
    // Tangente in der Tangentialebene, seitlich = Oben × Tangente
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    let tz = b[2] - a[2];
    const dp = tx * p[0] + ty * p[1] + tz * p[2];
    tx -= p[0] * dp;
    ty -= p[1] * dp;
    tz -= p[2] * dp;
    let lx = p[1] * tz - p[2] * ty;
    let ly = p[2] * tx - p[0] * tz;
    let lz = p[0] * ty - p[1] * tx;
    const ll = Math.hypot(lx, ly, lz) || 1;
    lx /= ll;
    ly /= ll;
    lz /= ll;
    const halfW = river.widths[i]! * 0.5;
    // Band reicht `WATER_OVERLAP` über die nominelle Uferlinie hinaus (unter die Uferrampe)
    const over = WATER_OVERLAP * Math.min(1, halfW / 0.5);
    const half = (halfW + over) / R;
    let level = river.levels[i]!;
    if (lake && lakeProbe(lake, R, p, lakeHit) && lakeHit.e < 0) level = Math.min(level, lake.level - MOUTH_DIP);
    const r = R + level;
    const row: number[] = [];
    for (const s of [-1, 0, 1]) {
      dir[0] = p[0] + lx * half * s;
      dir[1] = p[1] + ly * half * s;
      dir[2] = p[2] + lz * half * s;
      const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      dir[0] /= l;
      dir[1] /= l;
      dir[2] /= l;
      row.push(push(acc, dir, r, river.along[i]!, s * half * R, s === 0 ? halfW : -over, frozen, river.world, flow, id, 1));
    }
    rows.push(row);
  }
  for (let i = 0; i + 1 < n; i++) {
    if (!keep(i)) continue;
    const a = rows[i]!;
    const b = rows[i + 1]!;
    for (let s = 0; s < 2; s++) {
      acc.idx.push(a[s]!, b[s]!, b[s + 1]!);
      acc.idx.push(a[s]!, b[s + 1]!, a[s + 1]!);
    }
  }
}

function lakeProbe(lake: Lake, R: number, p: Vec3, out: { e: number; theta: number }): boolean {
  // Gleiche Rechnung wie `lakeAt` in @ee/world (Uferabstand im gestreckten Raum)
  const w = p[0] * lake.frame.c[0] + p[1] * lake.frame.c[1] + p[2] * lake.frame.c[2];
  if (w <= 1e-3) return false;
  const s = R / w;
  const x = (p[0] * lake.frame.east[0] + p[1] * lake.frame.east[1] + p[2] * lake.frame.east[2]) * s;
  const y = (p[0] * lake.frame.north[0] + p[1] * lake.frame.north[1] + p[2] * lake.frame.north[2]) * s;
  const k = Math.sqrt(lake.stretch);
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  const u = (x * ca + y * sa) / k;
  const v = (-x * sa + y * ca) * k;
  const th = Math.atan2(v, u);
  const g = Math.hypot(Math.cos(th) / k, Math.sin(th) * k) || 1;
  out.theta = th;
  out.e = (Math.hypot(u, v) - lakeRadiusAt(lake, th)) / g;
  return true;
}

/**
 * Wasser-Geometrie der Seen und Flussabschnitte, die `owns(dir)` einem Chunk zuordnet (Seen nach ihrem Mittelpunkt,
 * Flusssegmente nach ihrem Mittelpunkt). Positionen im Planetenraum auf dem Wasserspiegel. null = kein Wasser.
 */
export function buildWaterGeometry(features: PlanetFeatures, radius: number, owns: (dir: Vec3) => boolean): WaterGeometryData | null {
  const acc: Acc = { pos: [], nor: [], wa: [], wb: [], idx: [] };
  for (const lake of features.lakes) if (owns(lake.frame.c)) addLake(acc, lake, radius);
  const mid: Vec3 = [0, 0, 0];
  for (const river of features.rivers) {
    const keep = (i: number): boolean => {
      const a = river.points[i]!;
      const b = river.points[i + 1]!;
      mid[0] = a[0] + b[0];
      mid[1] = a[1] + b[1];
      mid[2] = a[2] + b[2];
      const l = Math.hypot(mid[0], mid[1], mid[2]) || 1;
      mid[0] /= l;
      mid[1] /= l;
      mid[2] /= l;
      return owns(mid);
    };
    let any = false;
    for (let i = 0; i + 1 < river.points.length && !any; i++) any = keep(i);
    if (any) addRiver(acc, river, features.lakes[river.lake], radius, keep);
  }
  if (acc.idx.length === 0) return null;
  return {
    positions: new Float32Array(acc.pos),
    normals: new Float32Array(acc.nor),
    wa: new Float32Array(acc.wa),
    wb: new Float32Array(acc.wb),
    indices: new Uint32Array(acc.idx),
  };
}

export function waterGeometry(data: WaterGeometryData): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(data.positions, 3));
  g.setAttribute('normal', new BufferAttribute(data.normals, 3));
  g.setAttribute('wa', new BufferAttribute(data.wa, 4));
  g.setAttribute('wb', new BufferAttribute(data.wb, 4));
  g.setIndex(new BufferAttribute(data.indices, 1));
  g.computeBoundingSphere();
  return g;
}
