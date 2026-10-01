import { BufferAttribute, BufferGeometry } from 'three/webgpu';
import { PLANE_WATER_OVERLAP as WATER_OVERLAP, planeLakeAt, planeLakeRadiusAt as lakeRadiusAt, type PlaneLake as Lake, type PlaneRiver as River } from '@ee/world';

/** Tiefe (Welteinheiten), um die ein Flussende im See unter dessen Spiegel taucht (kein Z-Fighting). */
const MOUTH_DIP = 0.015;
/** Ringe und Segmente eines Sees (Polargitter: glatte Uferlinie). */
const LAKE_RINGS = 7;
const LAKE_SEGMENTS = 64;

export interface WaterGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  /** (u längs, v quer, Uferabstand, Eis) je Vertex, Welteinheiten. */
  wa: Float32Array;
  /** (Welt-Slot, Strömung, Körper-Hash, Art 0 See / 1 Fluss / 2 Sumpf) je Vertex. */
  wb: Float32Array;
  /** (Merkmals-Index, Uferhöhe) je Vertex. */
  wg: Float32Array;
  indices: Uint32Array;
}

interface Acc {
  pos: number[];
  nor: number[];
  wa: number[];
  wb: number[];
  wg: number[];
  idx: number[];
  feature: number;
  bank: number;
  ax: number;
  az: number;
}

/** Geländehöhe an einem Punkt der Ebene (für die Uferhöhe). */
export type HeightFn = (x: number, z: number) => number;

/** Abstand vom Ufer, in dem die Böschungshöhe gemessen wird (Welteinheiten). */
const BANK_PROBE = 1.1;

function push(acc: Acc, x: number, level: number, z: number, u: number, v: number, e: number, frozen: number, slot: number, flow: number, id: number, kind: number): number {
  acc.pos.push(x - acc.ax, level, z - acc.az);
  acc.nor.push(0, 1, 0);
  acc.wa.push(u, v, e, frozen);
  acc.wb.push(slot, flow, id, kind);
  acc.wg.push(acc.feature, acc.bank);
  return acc.pos.length / 3 - 1;
}

function idHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return (h % 1000) / 1000;
}

/** See als Polargitter (Mitte + Ringe bis zur Uferlinie), flach auf dem Spiegel. */
function addLake(acc: Acc, lake: Lake, slot: number, height: HeightFn | null): void {
  const k = Math.sqrt(lake.stretch);
  const ca = Math.cos(lake.axis);
  const sa = Math.sin(lake.axis);
  const id = idHash(lake.id);
  const frozen = lake.frozen ? 1 : 0;
  const kind = lake.swamp ? 2 : 0;
  const flow = 0.15;
  const at = (th: number, rs: number): [number, number, number, number] => {
    const a = Math.cos(th) * rs * k;
    const c = (Math.sin(th) * rs) / k;
    return [lake.cx + a * ca - c * sa, lake.cz + a * sa + c * ca, a, c];
  };
  const banks: number[] = [];
  for (let j = 0; j < LAKE_SEGMENTS; j++) {
    const th = (j / LAKE_SEGMENTS) * Math.PI * 2;
    const g = Math.hypot(Math.cos(th) / k, Math.sin(th) * k) || 1;
    const [x, z] = at(th, lakeRadiusAt(lake, th) + BANK_PROBE * g);
    banks.push(height ? Math.max(0, Math.min(3, height(x, z) - lake.level)) : 0);
  }
  acc.bank = 0;
  const centre = push(acc, lake.cx, lake.level, lake.cz, 0, 0, lake.radius, frozen, slot, flow, id, kind);
  const rings: number[][] = [];
  for (let ring = 1; ring <= LAKE_RINGS + 1; ring++) {
    const row: number[] = [];
    for (let j = 0; j < LAKE_SEGMENTS; j++) {
      const th = (j / LAKE_SEGMENTS) * Math.PI * 2;
      acc.bank = banks[j]!;
      const g = Math.hypot(Math.cos(th) / k, Math.sin(th) * k) || 1;
      const shore = lakeRadiusAt(lake, th);
      const rs = ring <= LAKE_RINGS ? (shore * ring) / LAKE_RINGS : shore + WATER_OVERLAP * g;
      const [x, z, a, c] = at(th, rs);
      row.push(push(acc, x, lake.level, z, a, c, (shore - rs) / g, frozen, slot, flow, id, kind));
    }
    rings.push(row);
  }
  // θ wächst in (x, z) von +x nach +z — von oben gesehen im Uhrzeigersinn → Dreiecke umgekehrt anlegen (Vorderseite oben)
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

/** Fluss als Band (Ufer, Mitte, Ufer), Quelle spitz; im Mündungssee knapp unter dessen Spiegel. */
function addRiver(acc: Acc, river: River, lake: Lake | undefined, slot: number, height: HeightFn | null): void {
  const n = river.points.length;
  if (n < 2) return;
  const id = idHash(river.id);
  const frozen = river.frozen ? 1 : 0;
  const flow = 1;
  const rows: number[][] = [];
  const lakeHit = { e: 0, theta: 0 };
  for (let i = 0; i < n; i++) {
    const p = river.points[i]!;
    const a = river.points[Math.max(0, i - 1)]!;
    const b = river.points[Math.min(n - 1, i + 1)]!;
    let tx = b[0] - a[0];
    let tz = b[1] - a[1];
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    // seitlich = Oben × Tangente = (tz, 0, −tx)
    const lx = tz;
    const lz = -tx;
    const halfW = river.widths[i]! * 0.5;
    const over = WATER_OVERLAP * Math.min(1, halfW / 0.5);
    const half = halfW + over;
    let level = river.levels[i]!;
    if (lake && planeLakeAt(lake, p[0], p[1], lakeHit) && lakeHit.e < 0) level = Math.min(level, lake.level - MOUTH_DIP);
    const row: number[] = [];
    const bankAt = (sgn: number): number => {
      if (!height) return 0;
      const off = halfW + BANK_PROBE;
      return Math.max(0, Math.min(3, height(p[0] + lx * off * sgn, p[1] + lz * off * sgn) - level));
    };
    const bankL = bankAt(-1);
    const bankR = bankAt(1);
    for (const s of [-1, 0, 1]) {
      acc.bank = s < 0 ? bankL : s > 0 ? bankR : (bankL + bankR) * 0.5;
      row.push(push(acc, p[0] + lx * half * s, level, p[1] + lz * half * s, river.along[i]!, s * half, s === 0 ? halfW : -over, frozen, slot, flow, id, 1));
    }
    rows.push(row);
  }
  for (let i = 0; i + 1 < n; i++) {
    const a = rows[i]!;
    const b = rows[i + 1]!;
    for (let s = 0; s < 2; s++) {
      acc.idx.push(a[s]!, b[s]!, b[s + 1]!);
      acc.idx.push(a[s]!, b[s + 1]!, a[s + 1]!);
    }
  }
}

/** Gewässer einer Liste von Regionen (Seen, Flüsse mit Mündungssee), Positionen relativ zum Anker. */
export interface WaterRegionInput {
  lakes: readonly Lake[];
  rivers: readonly River[];
  slot: number;
  /** Merkmals-Index des ersten Gewässers dieser Region (Wachstum), Seen zuerst, dann Flüsse. */
  featureBase: number;
}

export function buildWaterGeometry(regions: readonly WaterRegionInput[], anchor: { x: number; z: number }, height: HeightFn | null = null): WaterGeometryData | null {
  const acc: Acc = { pos: [], nor: [], wa: [], wb: [], wg: [], idx: [], feature: 0, bank: 0, ax: anchor.x, az: anchor.z };
  for (const r of regions) {
    r.lakes.forEach((lake, i) => {
      acc.feature = r.featureBase + i;
      addLake(acc, lake, r.slot, height);
    });
    r.rivers.forEach((river, i) => {
      acc.feature = r.featureBase + r.lakes.length + i;
      addRiver(acc, river, r.lakes[river.lake], r.slot, height);
    });
  }
  if (acc.idx.length === 0) return null;
  return {
    positions: new Float32Array(acc.pos),
    normals: new Float32Array(acc.nor),
    wa: new Float32Array(acc.wa),
    wb: new Float32Array(acc.wb),
    wg: new Float32Array(acc.wg),
    indices: new Uint32Array(acc.idx),
  };
}

export function waterGeometry(data: WaterGeometryData): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(data.positions, 3));
  g.setAttribute('normal', new BufferAttribute(data.normals, 3));
  g.setAttribute('wa', new BufferAttribute(data.wa, 4));
  g.setAttribute('wb', new BufferAttribute(data.wb, 4));
  g.setAttribute('wg', new BufferAttribute(data.wg, 2));
  g.setIndex(new BufferAttribute(data.indices, 1));
  g.computeBoundingSphere();
  return g;
}
