import { featureRandom, type PlaneFeatureHost, type RegionSite } from './host';
import { WET, carve, generateLakes, lakeAt, lakeRadiusAt, type Occupied } from './lakes';
import { generateRivers, riverHeight, riverSegmentAt } from './rivers';
import { columnAt, columnPeak, columnTopAt, generateRocks } from './rocks';
import { SnowFields } from './snow';
import type { DriftSpec, FeatureSample, Lake, LedgeAnchor, River, RockColumn, RockFormation, WorldFeatureSpec } from './types';

export type * from './types';
export { SnowFields } from './snow';
export { WATER_BED, WATER_OVERLAP, SHORE_E, lakeAt, lakeRadiusAt, carve } from './lakes';
export { columnAt, columnPeak, columnTopAt } from './rocks';
export { riverSegmentAt } from './rivers';
export type { PlaneFeatureHost, RegionSite } from './host';
export { pathDistance } from './host';

/** Kein Wasser in Reichweite (Wert des Uferabstands). */
export const NO_WATER = -8;

/** Alle Merkmale einer Region (Seen, Flüsse, Felsen, Schnee, Wehen, Meißel). */
export interface RegionFeatures {
  key: string;
  world: number;
  lakes: Lake[];
  rivers: River[];
  formations: RockFormation[];
  ledges: LedgeAnchor[];
  snow: SnowFields | null;
  chisel: number;
  drifts: DriftSpec | null;
  /** Höchster Felspunkt (absolut) oder −∞. */
  maxRockHeight: number;
  /** Umfassende Box des Wassers bzw. der Felsen (x0, z0, x1, z1) oder null. */
  waterBox: [number, number, number, number] | null;
  rockBox: [number, number, number, number] | null;
  /** Zähler der Neuplanung (ein externes Wahrzeichen hat die Region verändert). */
  version: number;
}

/** Was die Merkmale von der Ebene zur Planung brauchen. */
export interface RegionProvider {
  site(key: string): RegionSite;
  featureSpec(world: number): WorldFeatureSpec | undefined;
}

const EMPTY_BOX = null;

/**
 * Geländemerkmale der unendlichen Ebene, je Region geplant (ADR 0002). Eine Region wird beim ersten Zugriff geplant
 * (deterministisch aus Seed, Regionsschlüssel und Weltangaben) und im Cache gehalten (Obergrenze, älteste zuerst
 * verworfen — eine erneute Planung liefert dasselbe). Abfragen an (x, z) lesen nur die Region des Punkts, denn jedes
 * Merkmal bleibt mit Rand in seiner Region. Seen und Flussrinnen sind ins Höhenfeld gegraben (`applyHeight`).
 */
export class PlaneFeatures {
  private readonly cache = new Map<string, RegionFeatures>();
  private readonly versions = new Map<string, number>();
  private readonly lakeHit = { e: 0, theta: 0, u: 0 };
  private readonly segHit = { e: 0, level: 0, along: 0 };
  /** Obergrenze des Caches (Regionen). */
  capacity = 160;
  /** Planungen seit Beginn (Diagnose, Tests). */
  planned = 0;

  constructor(
    private readonly host: PlaneFeatureHost,
    private readonly provider: RegionProvider,
  ) {}

  /** Merkmale einer Region (geplant beim ersten Zugriff). */
  region(key: string): RegionFeatures {
    const hit = this.cache.get(key);
    if (hit) {
      this.used.set(key, ++this.clock);
      return hit;
    }
    const plan = this.plan(key);
    this.cache.set(key, plan);
    this.used.set(key, ++this.clock);
    if (this.cache.size > this.capacity) {
      // am längsten unbenutzte Regionen verwerfen (selten: nur beim Überlauf)
      const order = [...this.used.entries()].sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < order.length && this.cache.size > this.capacity * 0.8; i++) {
        this.cache.delete(order[i]![0]);
        this.used.delete(order[i]![0]);
      }
    }
    return plan;
  }

  private readonly used = new Map<string, number>();
  private clock = 0;

  /** Bereits geplante Region oder null (ohne zu planen). */
  peek(key: string): RegionFeatures | null {
    return this.cache.get(key) ?? null;
  }

  /** Region neu planen lassen (Freiräume geändert, z. B. ein neues Wahrzeichen). */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.used.delete(key);
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
  }

  /** Alles verwerfen (Seed/Welten geändert). */
  clear(): void {
    this.cache.clear();
    this.used.clear();
  }

  private plan(key: string): RegionFeatures {
    this.planned++;
    const host = this.host;
    const site = this.provider.site(key);
    const world = site.region.world;
    const spec = this.provider.featureSpec(world);
    const out: RegionFeatures = {
      key,
      world,
      lakes: [],
      rivers: [],
      formations: [],
      ledges: [],
      snow: null,
      chisel: Math.max(0, spec?.chisel ?? 0),
      drifts: spec?.drifts ?? null,
      maxRockHeight: -Infinity,
      waterBox: EMPTY_BOX,
      rockBox: EMPTY_BOX,
      version: this.versions.get(key) ?? 0,
    };
    if (!spec) return out;
    const salt = spec.seed ?? 0;
    out.snow = spec.snowFields ? new SnowFields(spec.snowFields, host.seed + salt, `${host.worldId(world)}:${key}`) : null;
    const occupied: Occupied[] = site.keepClear.map((k) => ({ x: k.x, z: k.z, radius: k.radius }));
    let made = 0;
    if (spec.rivers) {
      const r = generateRivers(host, site, world, spec.rivers, spec.lakes, featureRandom(host.seed, key, 'rivers', salt), occupied, 0);
      out.lakes.push(...r.lakes);
      out.rivers.push(...r.rivers);
      made = r.lakes.length;
    }
    if (spec.lakes && spec.lakes.count > made) {
      out.lakes.push(...generateLakes(host, site, world, spec.lakes, spec.lakes.count - made, featureRandom(host.seed, key, 'lakes', salt), occupied, made));
    }
    if (spec.rocks && spec.rocks.length > 0) {
      const r = generateRocks(host, site, world, spec.rocks, featureRandom(host.seed, key, 'rocks', salt), occupied);
      out.formations.push(...r.formations);
      out.ledges.push(...r.ledges);
    }
    // Boxen für schnelle Ablehnung
    const grow = (box: [number, number, number, number] | null, x0: number, z0: number, x1: number, z1: number): [number, number, number, number] =>
      box ? [Math.min(box[0], x0), Math.min(box[1], z0), Math.max(box[2], x1), Math.max(box[3], z1)] : [x0, z0, x1, z1];
    for (const l of out.lakes) out.waterBox = grow(out.waterBox, l.cx - l.reach, l.cz - l.reach, l.cx + l.reach, l.cz + l.reach);
    for (const r of out.rivers) {
      const pad = Math.max(...r.widths) * 0.5 + r.shore + 0.3;
      for (const p of r.points) out.waterBox = grow(out.waterBox, p[0] - pad, p[1] - pad, p[0] + pad, p[1] + pad);
    }
    for (const f of out.formations) {
      out.rockBox = grow(out.rockBox, f.cx - f.footprint - 1.5, f.cz - f.footprint - 1.5, f.cx + f.footprint + 1.5, f.cz + f.footprint + 1.5);
      for (const c of f.columns) out.maxRockHeight = Math.max(out.maxRockHeight, columnPeak(c));
    }
    return out;
  }

  // --- Abfragen (je Punkt, Regionsschlüssel vom Aufrufer) --------------------------------------------------

  private readonly lakeE = new Float64Array(32);
  private readonly riverE = new Float64Array(32);
  private readonly riverLevel = new Float64Array(32);

  /** Nächster Punkt eines Flusses (Uferabstand und Spiegel) oder e = ∞ außerhalb seiner Reichweite. */
  private nearestRiver(river: River, x: number, z: number, reach: number): void {
    let best = Infinity;
    let level = 0;
    let along = 0;
    const pts = river.points;
    for (let s = 0; s + 1 < pts.length; s++) {
      const a = pts[s]!;
      const b = pts[s + 1]!;
      // schnelle Ablehnung über den Segmentmittelpunkt
      const mx = (a[0] + b[0]) * 0.5 - x;
      const mz = (a[1] + b[1]) * 0.5 - z;
      const half = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.5;
      if (mx * mx + mz * mz > (half + reach) * (half + reach)) continue;
      riverSegmentAt(river, s, x, z, this.segHit);
      if (this.segHit.e < best) {
        best = this.segHit.e;
        level = this.segHit.level;
        along = this.segHit.along;
      }
    }
    this.segHit.e = best;
    this.segHit.level = level;
    this.segHit.along = along;
  }

  /** Höhe mit Seen und Flussrinnen (natürliches Gelände `h` als Eingabe). */
  applyHeight(key: string, x: number, z: number, h: number): number {
    const r = this.region(key);
    const box = r.waterBox;
    if (!box || x < box[0] || x > box[2] || z < box[1] || z > box[3]) return h;
    const nl = Math.min(32, r.lakes.length);
    const nr = Math.min(32, r.rivers.length);
    let wetLakes = 0;
    let wetLake = -1;
    for (let i = 0; i < nl; i++) {
      if (!lakeAt(r.lakes[i]!, x, z, this.lakeHit)) {
        this.lakeE[i] = Infinity;
        continue;
      }
      this.lakeE[i] = this.lakeHit.e;
      if (this.lakeHit.e < WET) {
        wetLakes++;
        wetLake = i;
      }
    }
    let wetRivers = 0;
    for (let i = 0; i < nr; i++) {
      const river = r.rivers[i]!;
      this.nearestRiver(river, x, z, Math.max(river.widths[river.widths.length - 1] ?? 1, 1) + river.shore + 1.5);
      this.riverE[i] = this.segHit.e;
      this.riverLevel[i] = this.segHit.level;
      if (this.segHit.e < WET) wetRivers++;
    }
    let out = h;
    let changed = false;
    for (let i = 0; i < nr; i++) {
      const e = this.riverE[i]!;
      const river = r.rivers[i]!;
      if (e > river.shore + 1.5) continue;
      // An Mündungen (Punkt unter einem anderen Wasser-Mesh) kein Uferwall
      const otherWet = wetLakes > 0 || wetRivers - (e < WET ? 1 : 0) > 0;
      const v = riverHeight(river, e, this.riverLevel[i]!, h, !otherWet);
      out = changed ? Math.min(out, v) : v;
      changed = true;
    }
    for (let k = 0; k < nl; k++) {
      const e = this.lakeE[k]!;
      if (!Number.isFinite(e)) continue;
      const lake = r.lakes[k]!;
      const otherWet = wetLakes - (wetLake === k || e < WET ? 1 : 0) > 0 || wetRivers > 0;
      const v = carve(lake.level, lake.shore, e, h, !otherWet);
      out = changed ? Math.min(out, v) : v;
      changed = true;
    }
    return out;
  }

  /** Merkmale an einem Punkt für das Terrain-Material (je Vertex): Uferabstand, Eis, Musterkoordinate, Schnee, Sumpf. */
  sample(key: string, x: number, z: number, heightNorm: number, out: FeatureSample): FeatureSample {
    out.water = NO_WATER;
    out.frozen = 0;
    out.along = 0;
    out.swamp = 0;
    const r = this.region(key);
    const box = r.waterBox;
    if (box && x >= box[0] && x <= box[2] && z >= box[1] && z <= box[3]) {
      for (const lake of r.lakes) {
        if (!lakeAt(lake, x, z, this.lakeHit)) continue;
        const w = -this.lakeHit.e;
        if (w > out.water) {
          out.water = w;
          out.frozen = lake.frozen ? 1 : 0;
          out.along = this.lakeHit.u;
          out.swamp = lake.swamp ? 1 : 0;
        }
      }
      for (const river of r.rivers) {
        this.nearestRiver(river, x, z, 9);
        const w = -this.segHit.e;
        if (w > out.water) {
          out.water = w;
          out.frozen = river.frozen ? 1 : 0;
          out.along = this.segHit.along;
          out.swamp = 0;
        }
      }
    }
    out.water = Math.max(NO_WATER, Math.min(8, out.water));
    out.snow = r.snow ? r.snow.value(x, z, heightNorm) : -1;
    if (out.water > 0) out.snow = Math.min(out.snow, -0.05);
    return out;
  }

  /** Uferabstand (> 0 im Wasser) an einem Punkt, `NO_WATER` außerhalb der Reichweite. */
  waterDepthAt(key: string, x: number, z: number): number {
    const r = this.region(key);
    const box = r.waterBox;
    if (!box || x < box[0] - 1 || x > box[2] + 1 || z < box[1] - 1 || z > box[3] + 1) return NO_WATER;
    let best = NO_WATER;
    for (const lake of r.lakes) if (lakeAt(lake, x, z, this.lakeHit)) best = Math.max(best, -this.lakeHit.e);
    for (const river of r.rivers) {
      this.nearestRiver(river, x, z, 9);
      best = Math.max(best, -this.segHit.e);
    }
    return best;
  }

  /**
   * Liegt (x, z) im Wasser der Region oder näher als `margin` am Ufer? Auch für große Ränder (Planung der Wahrzeichen:
   * Fußabdruck + 1,5): echte Uferabstände statt der Nah-Abfrage (`NO_WATER` heißt „weit weg", nicht „nah").
   */
  isWater(key: string, x: number, z: number, margin = 0): boolean {
    if (margin <= 0.5) return this.waterDepthAt(key, x, z) > -margin;
    const r = this.region(key);
    const box = r.waterBox;
    const m = margin + 1;
    if (!box || x < box[0] - m || x > box[2] + m || z < box[1] - m || z > box[3] + m) return false;
    for (const lake of r.lakes) {
      const dx = x - lake.cx;
      const dz = z - lake.cz;
      if (dx * dx + dz * dz > (lake.reach + margin) * (lake.reach + margin)) continue;
      // Uferabstand ohne die Reichweiten-Grenze von `lakeAt`
      const ca = Math.cos(lake.axis);
      const sa = Math.sin(lake.axis);
      const k = Math.sqrt(lake.stretch);
      const u = (dx * ca + dz * sa) / k;
      const v = (-dx * sa + dz * ca) * k;
      const theta = Math.atan2(v, u);
      const g = Math.hypot(Math.cos(theta) / k, Math.sin(theta) * k) || 1;
      const e = (Math.hypot(u, v) - lakeRadiusAt(lake, theta)) / g;
      if (e < margin) return true;
    }
    for (const river of r.rivers) {
      this.nearestRiver(river, x, z, 9 + margin);
      if (this.segHit.e < margin) return true;
    }
    return false;
  }

  /** Felssäule an einem Punkt (mit Rand) oder null. */
  rockAt(key: string, x: number, z: number, margin = 0): { formation: RockFormation; column: RockColumn } | null {
    const r = this.region(key);
    const box = r.rockBox;
    if (!box || x < box[0] - margin || x > box[2] + margin || z < box[1] - margin || z > box[3] + margin) return null;
    for (const f of r.formations) {
      const c = columnAt(f, x, z, margin);
      if (c) return { formation: f, column: c };
    }
    return null;
  }

  /** Höhe der begehbaren Oberfläche: Gelände oder Felsdeckfläche. */
  surfaceHeight(key: string, x: number, z: number, terrain: number): number {
    const hit = this.rockAt(key, x, z);
    if (!hit) return terrain;
    return Math.max(terrain, columnTopAt(hit.column, x - hit.formation.cx, z - hit.formation.cz));
  }

  /** Bäume meiden Wasser (plus Kronenrand), Felsen und Schneefelder. */
  blocksTree(key: string, x: number, z: number, radius: number, heightNorm: number): boolean {
    if (this.isWater(key, x, z, 0.35 + radius * 0.6)) return true;
    if (this.rockAt(key, x, z, radius * 0.7 + 0.2)) return true;
    const snow = this.region(key).snow;
    return snow ? snow.value(x, z, heightNorm) > -0.04 : false;
  }

  /** Requisiten meiden Wasser und Felsen. */
  blocksProp(key: string, x: number, z: number, radius: number): boolean {
    if (this.isWater(key, x, z, 0.3 + radius)) return true;
    return this.rockAt(key, x, z, radius + 0.2) !== null;
  }

  /** Überschneidet ein Merkmal der Region einen der Kreise? */
  conflicts(key: string, circles: ReadonlyArray<{ x: number; z: number; radius: number }>): boolean {
    const r = this.region(key);
    for (const c of circles) {
      for (const l of r.lakes) if (Math.hypot(c.x - l.cx, c.z - l.cz) < l.reach + c.radius) return true;
      for (const f of r.formations) if (Math.hypot(c.x - f.cx, c.z - f.cz) < f.footprint + c.radius) return true;
      for (const riv of r.rivers) {
        for (let i = 0; i < riv.points.length; i++) if (Math.hypot(c.x - riv.points[i]![0], c.z - riv.points[i]![1]) < riv.widths[i]! * 0.5 + riv.shore + c.radius) return true;
      }
    }
    return false;
  }
}
