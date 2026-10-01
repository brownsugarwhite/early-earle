import { BufferAttribute, BufferGeometry } from 'three/webgpu';
import { PLANE_WATER_OVERLAP as WATER_OVERLAP, planeLakeAt, planeLakeRadiusAt as lakeRadiusAt, planeSeaField, type PlaneLake as Lake, type PlaneRiver as River, type PlaneSea as Sea } from '@ee/world';

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
  /** (Merkmals-Index, Uferhöhe, Gift-Code 0 klar / 1…5 Müllstil) je Vertex. */
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
  /** Gift-Code des aktuellen Gewässers (0 = klar). */
  toxic: number;
  ax: number;
  az: number;
}

/** Geländehöhe an einem Punkt der Ebene (für die Uferhöhe). */
export type HeightFn = (x: number, z: number) => number;

/** Abstand vom Ufer, in dem die Böschungshöhe gemessen wird (Welteinheiten). */
const BANK_PROBE = 1.1;
/** Höchste Böschungshöhe für das Spiegelbild (Welteinheiten): große Seen bekommen kein Band breiter als ≈ 1,3. */
const BANK_MAX = 1.6;
/** Glättung der Böschungshöhen längs des Ufers (Nachbarn je Seite): ruhige Spiegelkante statt Stufen je Segment. */
const BANK_SMOOTH = 3;

/** Gleitendes Mittel ±`r` (zyklisch für Seeufer), Gewichte fallen nach außen linear ab. */
export function smoothBanks(v: readonly number[], r: number, cyclic: boolean): number[] {
  const n = v.length;
  return v.map((_, i) => {
    let sum = 0;
    let wsum = 0;
    for (let d = -r; d <= r; d++) {
      let j = i + d;
      if (cyclic) j = ((j % n) + n) % n;
      else if (j < 0 || j >= n) continue;
      const w = r + 1 - Math.abs(d);
      sum += v[j]! * w;
      wsum += w;
    }
    return wsum > 0 ? sum / wsum : v[i]!;
  });
}

function push(acc: Acc, x: number, level: number, z: number, u: number, v: number, e: number, frozen: number, slot: number, flow: number, id: number, kind: number): number {
  acc.pos.push(x - acc.ax, level, z - acc.az);
  acc.nor.push(0, 1, 0);
  acc.wa.push(u, v, e, frozen);
  acc.wb.push(slot, flow, id, kind);
  acc.wg.push(acc.feature, acc.bank, acc.toxic);
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
  const raw: number[] = [];
  for (let j = 0; j < LAKE_SEGMENTS; j++) {
    const th = (j / LAKE_SEGMENTS) * Math.PI * 2;
    const g = Math.hypot(Math.cos(th) / k, Math.sin(th) * k) || 1;
    const [x, z] = at(th, lakeRadiusAt(lake, th) + BANK_PROBE * g);
    raw.push(height ? Math.max(0, Math.min(BANK_MAX, height(x, z) - lake.level)) : 0);
  }
  const banks = smoothBanks(raw, BANK_SMOOTH, true);
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
  // Rahmen, Spiegel und Böschungshöhen je Punkt (die Höhen danach längs des Flusses geglättet)
  const frames = river.points.map((p, i) => {
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
    let level = river.levels[i]!;
    if (lake && planeLakeAt(lake, p[0], p[1], lakeHit) && lakeHit.e < 0) level = Math.min(level, lake.level - MOUTH_DIP);
    const bankAt = (sgn: number): number => {
      if (!height) return 0;
      const off = halfW + BANK_PROBE;
      return Math.max(0, Math.min(BANK_MAX, height(p[0] + lx * off * sgn, p[1] + lz * off * sgn) - level));
    };
    return { p, lx, lz, halfW, level, bankL: bankAt(-1), bankR: bankAt(1) };
  });
  const banksL = smoothBanks(
    frames.map((f) => f.bankL),
    BANK_SMOOTH,
    false,
  );
  const banksR = smoothBanks(
    frames.map((f) => f.bankR),
    BANK_SMOOTH,
    false,
  );
  frames.forEach((f, i) => {
    const over = WATER_OVERLAP * Math.min(1, f.halfW / 0.5);
    const half = f.halfW + over;
    const bankL = banksL[i]!;
    const bankR = banksR[i]!;
    const row: number[] = [];
    for (const s of [-1, 0, 1]) {
      acc.bank = s < 0 ? bankL : s > 0 ? bankR : (bankL + bankR) * 0.5;
      row.push(push(acc, f.p[0] + f.lx * half * s, f.level, f.p[1] + f.lz * half * s, river.along[i]!, s * half, s === 0 ? f.halfW : -over, frozen, slot, flow, id, 1));
    }
    rows.push(row);
  });
  for (let i = 0; i + 1 < n; i++) {
    const a = rows[i]!;
    const b = rows[i + 1]!;
    for (let s = 0; s < 2; s++) {
      acc.idx.push(a[s]!, b[s]!, b[s + 1]!);
      acc.idx.push(a[s]!, b[s + 1]!, a[s + 1]!);
    }
  }
}

/** Maschenweite des Meeres (Welteinheiten); die Uferlinie liegt ohnehin unter der Klippe. */
const SEA_STEP = 1.0;

/**
 * Meer (Ebene 29) als Gitter über der Bucht (Rückgrat-Rahmen: längs z, quer der Abstand zur Pfadküste), flach auf dem
 * Spiegel, bis knapp unter die Klippe. Musterkoordinaten = Ebenenkoordinaten (x, z) — die Kräusel liegen quer zum
 * Pfad, also waagrecht im Bild; `e` = Uferabstand, Art 3.
 */
function addSea(acc: Acc, sea: Sea, slot: number): void {
  const id = idHash(sea.id);
  const L = sea.zTop - sea.zBottom;
  const zA = sea.zTop - L * Math.max(0, sea.t0 - 0.06);
  const zB = sea.zTop - L * Math.min(1, sea.t1 + 0.06);
  const rows = Math.max(2, Math.ceil((zA - zB) / SEA_STEP));
  const u0 = sea.near - 1.2;
  const u1 = sea.outer + 1.4;
  const cols = Math.max(2, Math.ceil((u1 - u0) / SEA_STEP));
  const hit = { t: 0, coast: 0 };
  const grid: number[] = [];
  const keep: boolean[] = [];
  acc.bank = sea.cliff;
  // Musterkoordinaten gedreht (Längsachse der Kräusel quer zum Blick der Komposition); linear, also exakt interpoliert
  const rc = Math.cos(sea.ripple);
  const rs = Math.sin(sea.ripple);
  // Spiegelbild der Landzunge: Richtung zur Pfadküste (Ebene) und die spiegelnde Höhe (Klippe plus halber Anstieg zum
  // Grat), gepackt in den Fluss-Slot: Winkel + 10 · Höhe. Der Winkel ist um π/2 gedreht und liegt in 0..2π, damit die
  // übliche Richtung (quer zum Pfad, ±x) weit vom Sprung bei 0/2π liegt — der Wert wird im Dreieck linear gemischt.
  const reflH = Math.max(1, Math.min(40, Math.round(sea.cliff + sea.rise * sea.ridge * 0.5)));
  const probe = { t: 0, coast: 0 };
  const coastAt = (x: number, z: number): number => {
    planeSeaField(sea, x, z, probe);
    return probe.coast;
  };
  for (let i = 0; i <= rows; i++) {
    const z = zA - ((zA - zB) * i) / rows;
    const k = Math.max(0, Math.min(sea.backbone.length - 1, Math.round(sea.zTop - z)));
    const xb = sea.backbone[k]!;
    for (let j = 0; j <= cols; j++) {
      const u = u0 + ((u1 - u0) * j) / cols;
      const x = xb + sea.side * u;
      const f = planeSeaField(sea, x, z, hit);
      // Uferhöhe-Slot trägt beim Meer den Abstand zur Pfadküste (Spiegelbild der Landzunge)
      acc.bank = hit.coast;
      const gx = coastAt(x + 0.5, z) - coastAt(x - 0.5, z);
      const gz = coastAt(x, z + 0.5) - coastAt(x, z - 0.5);
      let toward = Math.atan2(-gz, -gx) + Math.PI / 2;
      if (toward > Math.PI) toward -= Math.PI * 2;
      toward += Math.PI;
      grid.push(push(acc, x, sea.level, z, x * rc - z * rs, x * rs + z * rc, f, 0, slot, toward + 10 * reflH, id, 3));
      keep.push(f > -0.8);
    }
  }
  const at = (i: number, j: number) => i * (cols + 1) + j;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = at(i, j);
      const b = at(i, j + 1);
      const c = at(i + 1, j);
      const d = at(i + 1, j + 1);
      if (!keep[a] && !keep[b] && !keep[c] && !keep[d]) continue;
      // Vorderseite oben (Normale +y): j läuft mit der Seite des Meeres in ±x, i nach −z
      if (sea.side > 0) {
        acc.idx.push(grid[a]!, grid[b]!, grid[c]!);
        acc.idx.push(grid[b]!, grid[d]!, grid[c]!);
      } else {
        acc.idx.push(grid[a]!, grid[c]!, grid[b]!);
        acc.idx.push(grid[b]!, grid[c]!, grid[d]!);
      }
    }
  }
}

/** Gewässer einer Liste von Regionen (Seen, Flüsse mit Mündungssee, Meer), Positionen relativ zum Anker. */
export interface WaterRegionInput {
  lakes: readonly Lake[];
  rivers: readonly River[];
  /** Meer mit Landzunge (Welt 14). */
  seas?: readonly Sea[];
  slot: number;
  /** Merkmals-Index des ersten Gewässers dieser Region (Wachstum), Seen zuerst, dann Flüsse, dann Meere. */
  featureBase: number;
  /**
   * Gift-Code der Welt (Müllstil, `toxicStyleCode`: 1 Rost … 5 Wald) für ihre Giftseen und -flüsse; fehlt → Rost.
   * Klare Gewässer tragen immer 0.
   */
  toxicStyle?: number;
}

export function buildWaterGeometry(regions: readonly WaterRegionInput[], anchor: { x: number; z: number }, height: HeightFn | null = null): WaterGeometryData | null {
  const acc: Acc = { pos: [], nor: [], wa: [], wb: [], wg: [], idx: [], feature: 0, bank: 0, toxic: 0, ax: anchor.x, az: anchor.z };
  for (const r of regions) {
    const code = Math.max(1, Math.round(r.toxicStyle ?? 1));
    r.lakes.forEach((lake, i) => {
      acc.feature = r.featureBase + i;
      acc.toxic = lake.toxic ? code : 0;
      addLake(acc, lake, r.slot, height);
    });
    r.rivers.forEach((river, i) => {
      acc.feature = r.featureBase + r.lakes.length + i;
      acc.toxic = river.toxic ? code : 0;
      addRiver(acc, river, r.lakes[river.lake], r.slot, height);
    });
    acc.toxic = 0;
    (r.seas ?? []).forEach((sea, i) => {
      acc.feature = r.featureBase + r.lakes.length + r.rivers.length + i;
      addSea(acc, sea, r.slot);
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
  g.setAttribute('wg', new BufferAttribute(data.wg, 3));
  g.setIndex(new BufferAttribute(data.indices, 1));
  g.computeBoundingSphere();
  return g;
}
