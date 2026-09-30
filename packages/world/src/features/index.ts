import type { Vec3 } from '../capPatch';
import { CapIndex } from './cells';
import { localOf } from './geometry';
import { featureRandom, type FeatureHost } from './host';
import { WET, carve, generateLakes, lakeAt, type Occupied } from './lakes';
import { generateRivers, riverHeight, riverSegmentAt } from './rivers';
import { columnAt, columnPeak, columnTopAt, generateRocks } from './rocks';
import { SnowFields } from './snow';
import type { DriftSpec, FeatureSample, Lake, LedgeAnchor, River, RockColumn, RockFormation, WorldFeatureSpec } from './types';

export type * from './types';
export { nearestSpiralS, pathDistance, spiralDir, type FeatureHost } from './host';
export { frameAt, framePoint, groundZ, localOf, offsetDir } from './geometry';
export { SHORE_E, WATER_BED, WATER_OVERLAP, lakeRadiusAt } from './lakes';
export { columnPeak, columnTopAt } from './rocks';

/** Kein Wasser in Reichweite (Wert des Uferabstands). */
export const NO_WATER = -8;

interface WaterItem {
  kind: 0 | 1;
  /** See- bzw. Flussindex. */
  index: number;
  /** Segment (Flüsse). */
  seg: number;
}

/**
 * Alle Geländemerkmale des Planeten (Seen, Flüsse, Felsformationen, Schneefelder, Schneewehen, Meißelstufen) und
 * ihre Abfragen. Entsteht einmal im Konstruktor von `PlanetField` (`field.features`) aus den `features`-Angaben der
 * Welten (`content/zones/worlds/NN.json`); deterministisch aus Seed, Welt-ID und Angaben. Seen und Flussrinnen sind ins
 * Höhenfeld gegraben (`field.heightAt` enthält sie), Felsen stehen als eigene Geometrie darauf.
 *
 * **API für die Pfadführung (Levelknoten auf Felsen)** — alle Positionen im Planetenraum, ungebogen (wie
 * `SpiralNode.position`; für die Karte wie alle Pfadpunkte durch `bend()`):
 * - `field.features.ledges(world?)` → `LedgeAnchor[]`: flache Deckflächen (Felsstufen, Wandstufen, Turmsockel,
 *   Tafelfels-Kante), je Formation nach `step` aufsteigend (0 = niedrigste, vom Pfad aus zuerst erreichbar). Felder:
 *   `position` (auf der Deckfläche), `normal` (Oben der Formation), `dir` (Einheitsrichtung), `height` (über dem
 *   Grundradius), `radius` (nutzbare ebene Fläche), `formation`, `kind`, `world`, `pathS` (Spiralparameter des
 *   nächsten Pfadpunkts, zum Einordnen längs des Pfads) und `pathDistance` (seitlicher Abstand zum Pfad).
 * - `field.ledgeNear(dir, maxDist)` / `features.ledgeNear(...)`: nächster Anker zu einer Richtung innerhalb
 *   `maxDist` Welteinheiten (z. B. Knoten n auf den nächsten Felsen setzen, wenn einer näher als 4 liegt).
 * - `field.surfaceHeightAt(dx, dy, dz)`: begehbare Höhe (Gelände oder Felsdeckfläche) — für Figuren, Brett, Kamera.
 *
 * **Masken für Streuungen** (Bäume, Müll, Requisiten — `scatterChunkTrees`/`scatterChunkProps` wenden sie schon an):
 * - `isWater(dx, dy, dz, margin)`: See/Fluss (optional mit Uferrand in Welteinheiten); `field.isWater(...)` ebenso.
 * - `rockAt(dx, dy, dz, margin)`: Felssäule an der Stelle oder null.
 * - `blocksTree(...)`: Wasser + Kronenrand, Felsen, Schneefelder; `blocksProp(...)`: Wasser, Felsen.
 */
export class PlanetFeatures {
  readonly lakes: Lake[] = [];
  readonly rivers: River[] = [];
  readonly formations: RockFormation[] = [];
  readonly ledgeAnchors: LedgeAnchor[] = [];
  /** Schneefelder je Welt (null = keine). */
  readonly snow: Array<SnowFields | null>;
  /** Meißelstufen je Welt (0 = aus). */
  readonly chisel: number[];
  /** Schneewehen je Welt (null = keine). */
  readonly drifts: Array<DriftSpec | null>;
  /** Höchste Felsdeckfläche über dem Grundradius (Schattenkamera). */
  readonly maxRockHeight: number;
  private readonly radius: number;
  private readonly water = new CapIndex(24);
  private readonly waterItems: WaterItem[] = [];
  private readonly rocks = new CapIndex(24);
  private readonly riverBestE: Float64Array;
  private readonly riverBestLevel: Float64Array;
  private readonly riverStamp: Int32Array;
  private stamp = 0;
  private readonly lakeHit = { e: 0, theta: 0, u: 0 };
  private readonly lakeIdx = new Int32Array(8);
  private readonly lakeE = new Float64Array(8);
  private readonly segHit = { e: 0, level: 0, along: 0 };

  constructor(host: FeatureHost, specs: ReadonlyArray<WorldFeatureSpec | undefined>) {
    this.radius = host.radius;
    const R = host.radius;
    this.snow = specs.map((s, i) => (s?.snowFields ? new SnowFields(s.snowFields, host.seed + (s.seed ?? 0), host.worldId(i), R) : null));
    this.chisel = specs.map((s) => Math.max(0, s?.chisel ?? 0));
    this.drifts = specs.map((s) => s?.drifts ?? null);
    const occupied: Occupied[] = host.keepClear().map((k) => ({ dir: k.dir, radius: k.radius }));
    specs.forEach((spec, world) => {
      if (!spec) return;
      const salt = spec.seed ?? 0;
      const id = host.worldId(world);
      // Flüsse mit Mündungsseen, danach übrige Seen
      let made = 0;
      if (spec.rivers) {
        const r = generateRivers(host, world, spec.rivers, spec.lakes, featureRandom(host.seed, id, 'rivers', salt), occupied, this.lakes.length);
        this.lakes.push(...r.lakes);
        this.rivers.push(...r.rivers);
        made = r.lakes.length;
      }
      if (spec.lakes && spec.lakes.count > made) {
        const lakes = generateLakes(host, world, spec.lakes, spec.lakes.count - made, featureRandom(host.seed, id, 'lakes', salt), occupied, made);
        this.lakes.push(...lakes);
      }
      // Felsen danach (sie weichen Wasser aus; Seen brauchen Mulden und sind wählerischer)
      if (spec.rocks && spec.rocks.length > 0) {
        const r = generateRocks(host, world, spec.rocks, featureRandom(host.seed, id, 'rocks', salt), occupied);
        this.formations.push(...r.formations);
        this.ledgeAnchors.push(...r.ledges);
      }
    });
    // Index: Seen und Flusssegmente, Formationen
    this.lakes.forEach((l, i) => {
      this.water.add(l.frame.c, l.reach / R);
      this.waterItems.push({ kind: 0, index: i, seg: -1 });
    });
    this.rivers.forEach((r, i) => {
      for (let s = 0; s + 1 < r.points.length; s++) {
        const a = r.points[s]!;
        const b = r.points[s + 1]!;
        const m: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        const l = Math.hypot(m[0], m[1], m[2]) || 1;
        m[0] /= l;
        m[1] /= l;
        m[2] /= l;
        const half = (Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * R) / 2;
        const w = Math.max(r.widths[s]!, r.widths[s + 1]!);
        this.water.add(m, (half + w * 0.5 + r.shore + 0.2) / R);
        this.waterItems.push({ kind: 1, index: i, seg: s });
      }
    });
    this.formations.forEach((f) => this.rocks.add(f.frame.c, (f.footprint + 1.5) / R));
    this.riverBestE = new Float64Array(this.rivers.length);
    this.riverBestLevel = new Float64Array(this.rivers.length);
    this.riverStamp = new Int32Array(this.rivers.length);
    let maxTop = 0;
    for (const f of this.formations) for (const c of f.columns) maxTop = Math.max(maxTop, columnPeak(c));
    this.maxRockHeight = maxTop;
  }

  /**
   * Höhe mit Seen und Flussrinnen (natürliches Gelände `h` als Eingabe): je Gewässer Becken + Uferwall, das
   * niedrigste Ergebnis gewinnt; an Mündungen (Punkt unter einem anderen Wasser-Mesh) entfällt der Uferwall.
   */
  applyHeight(dx: number, dy: number, dz: number, h: number): number {
    const list = this.water.query(dx, dy, dz);
    if (list.length === 0) return h;
    const R = this.radius;
    const stamp = ++this.stamp;
    let nRivers = 0;
    for (let n = 0; n < list.length; n++) {
      const it = this.waterItems[list[n]!]!;
      if (it.kind !== 1) continue;
      riverSegmentAt(this.rivers[it.index]!, it.seg, R, dx, dy, dz, this.segHit);
      if (this.riverStamp[it.index] !== stamp || this.segHit.e < this.riverBestE[it.index]!) {
        if (this.riverStamp[it.index] !== stamp) nRivers++;
        this.riverStamp[it.index] = stamp;
        this.riverBestE[it.index] = this.segHit.e;
        this.riverBestLevel[it.index] = this.segHit.level;
      }
    }
    // Seen: Uferabstand je See (höchstens eine Handvoll in Reichweite)
    let nLakes = 0;
    for (let n = 0; n < list.length; n++) {
      const it = this.waterItems[list[n]!]!;
      if (it.kind !== 0) continue;
      if (!lakeAt(this.lakes[it.index]!, R, dx, dy, dz, this.lakeHit)) continue;
      if (nLakes < this.lakeE.length) {
        this.lakeIdx[nLakes] = it.index;
        this.lakeE[nLakes] = this.lakeHit.e;
        nLakes++;
      }
    }
    if (nRivers === 0 && nLakes === 0) return h;
    let out = h;
    let changed = false;
    // Flüsse
    if (nRivers > 0) {
      for (let i = 0; i < this.rivers.length; i++) {
        if (this.riverStamp[i] !== stamp) continue;
        const e = this.riverBestE[i]!;
        let otherWet = false;
        for (let k = 0; k < nLakes; k++) if (this.lakeE[k]! < WET) otherWet = true;
        if (!otherWet) for (let j = 0; j < this.rivers.length; j++) if (j !== i && this.riverStamp[j] === stamp && this.riverBestE[j]! < WET) otherWet = true;
        const v = riverHeight(this.rivers[i]!, e, this.riverBestLevel[i]!, h, !otherWet);
        out = changed ? Math.min(out, v) : v;
        changed = true;
      }
    }
    // Seen
    for (let k = 0; k < nLakes; k++) {
      const lake = this.lakes[this.lakeIdx[k]!]!;
      let otherWet = false;
      for (let j = 0; j < nLakes; j++) if (j !== k && this.lakeE[j]! < WET) otherWet = true;
      if (!otherWet && nRivers > 0) for (let i = 0; i < this.rivers.length; i++) if (this.riverStamp[i] === stamp && this.riverBestE[i]! < WET) otherWet = true;
      const v = carve(lake.level, lake.shore, this.lakeE[k]!, h, !otherWet);
      out = changed ? Math.min(out, v) : v;
      changed = true;
    }
    return out;
  }

  /**
   * Merkmale an einer Richtung für das Terrain-Material (je Vertex): Uferabstand, Eis, Musterkoordinate längs des
   * Gewässers, Schneefeld. `heightNorm` = relative Geländehöhe 0..1, `world` = Welt-Index am Ort.
   */
  sample(dx: number, dy: number, dz: number, heightNorm: number, world: number, out: FeatureSample): FeatureSample {
    out.water = NO_WATER;
    out.frozen = 0;
    out.along = 0;
    const list = this.water.query(dx, dy, dz);
    const R = this.radius;
    for (let n = 0; n < list.length; n++) {
      const it = this.waterItems[list[n]!]!;
      if (it.kind === 0) {
        const lake = this.lakes[it.index]!;
        if (!lakeAt(lake, R, dx, dy, dz, this.lakeHit)) continue;
        const w = -this.lakeHit.e;
        if (w > out.water) {
          out.water = w;
          out.frozen = lake.frozen ? 1 : 0;
          out.along = this.lakeHit.u;
        }
      } else {
        const river = this.rivers[it.index]!;
        riverSegmentAt(river, it.seg, R, dx, dy, dz, this.segHit);
        const w = -this.segHit.e;
        if (w > out.water) {
          out.water = w;
          out.frozen = river.frozen ? 1 : 0;
          out.along = this.segHit.along;
        }
      }
    }
    out.water = Math.max(NO_WATER, Math.min(8, out.water));
    const snow = this.snow[world];
    out.snow = snow ? snow.value(dx, dy, dz, heightNorm) : -1;
    // Kein Schnee auf offenem Wasser (zugefrorene Seen malt das Wasser selbst)
    if (out.water > 0) out.snow = Math.min(out.snow, -0.05);
    return out;
  }

  /** Uferabstand (> 0 im Wasser) an einer Richtung, `NO_WATER` außerhalb der Reichweite. */
  waterDepthAt(dx: number, dy: number, dz: number): number {
    let best = NO_WATER;
    const list = this.water.query(dx, dy, dz);
    const R = this.radius;
    for (let n = 0; n < list.length; n++) {
      const it = this.waterItems[list[n]!]!;
      if (it.kind === 0) {
        if (lakeAt(this.lakes[it.index]!, R, dx, dy, dz, this.lakeHit)) best = Math.max(best, -this.lakeHit.e);
      } else {
        riverSegmentAt(this.rivers[it.index]!, it.seg, R, dx, dy, dz, this.segHit);
        best = Math.max(best, -this.segHit.e);
      }
    }
    return best;
  }

  /** Liegt die Richtung im Wasser (oder näher als `margin` Welteinheiten am Ufer)? */
  isWater(dx: number, dy: number, dz: number, margin = 0): boolean {
    return this.waterDepthAt(dx, dy, dz) > -margin;
  }

  /** Felssäule an einer Richtung (mit Rand) oder null. */
  rockAt(dx: number, dy: number, dz: number, margin = 0): { formation: RockFormation; column: RockColumn } | null {
    const list = this.rocks.query(dx, dy, dz);
    const R = this.radius;
    for (let n = 0; n < list.length; n++) {
      const f = this.formations[list[n]!]!;
      const c = columnAt(f, R, dx, dy, dz, margin);
      if (c) return { formation: f, column: c };
    }
    return null;
  }

  /**
   * Höhe der begehbaren Oberfläche über dem Grundradius: Geländehöhe `terrain` oder, auf einer Felssäule, deren
   * Deckfläche (für Kamera-Freiheit, Knoten auf Felsen).
   */
  surfaceHeight(dx: number, dy: number, dz: number, terrain: number): number {
    const hit = this.rockAt(dx, dy, dz);
    if (!hit) return terrain;
    const xy: [number, number] = [0, 0];
    if (!localOf(hit.formation.frame, this.radius, dx, dy, dz, xy)) return terrain;
    const R = this.radius;
    const top = Math.sqrt((R + columnTopAt(hit.column, xy[0], xy[1])) ** 2 + xy[0] * xy[0] + xy[1] * xy[1]) - R;
    return Math.max(terrain, top);
  }

  /** Bäume meiden Wasser (plus Kronenrand), Felsen und Schneefelder. */
  blocksTree(dx: number, dy: number, dz: number, radius: number, world: number, heightNorm: number): boolean {
    if (this.isWater(dx, dy, dz, 0.35 + radius * 0.6)) return true;
    if (this.rockAt(dx, dy, dz, radius * 0.7 + 0.2)) return true;
    const snow = this.snow[world];
    return snow ? snow.value(dx, dy, dz, heightNorm) > -0.04 : false;
  }

  /** Requisiten (Müll, Tiere, Scheunen, Becken) meiden Wasser und Felsen. */
  blocksProp(dx: number, dy: number, dz: number, radius: number): boolean {
    if (this.isWater(dx, dy, dz, 0.3 + radius)) return true;
    return this.rockAt(dx, dy, dz, radius + 0.2) !== null;
  }

  /** Alle Anker für Levelknoten auf Felsen (optional einer Welt), Stufen aufsteigend. */
  ledges(world?: number): LedgeAnchor[] {
    const list = world === undefined ? this.ledgeAnchors : this.ledgeAnchors.filter((l) => l.world === world);
    return [...list].sort((a, b) => (a.formation === b.formation ? a.step - b.step : a.formation < b.formation ? -1 : 1));
  }

  /** Nächster Anker zu einer Richtung (Einheitsvektor) innerhalb `maxDist` Welteinheiten, sonst null. */
  ledgeNear(dir: Vec3, maxDist = Infinity): LedgeAnchor | null {
    const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    let best: LedgeAnchor | null = null;
    let bestD = maxDist;
    for (const a of this.ledgeAnchors) {
      const d = Math.acos(Math.min(1, Math.max(-1, (dir[0] * a.dir[0] + dir[1] * a.dir[1] + dir[2] * a.dir[2]) / l))) * this.radius;
      if (d <= bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }
}
