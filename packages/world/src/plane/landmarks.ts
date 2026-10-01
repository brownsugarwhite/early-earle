import { hash32, mulberry32 } from '../rng';
import { DEFAULT_LANDMARK_PLAN, LANDMARK_RADIUS, checkLandmarkSite, landmarkBlocks, landmarkGround, landmarkSurfaceAt, landmarkWaterAt, placeLandmark } from '../landmarks/index';
import type { LandmarkEnv, LandmarkInstance, LandmarkKind, LandmarkKindParams, LandmarkPlacement, LandmarkPlanParams, P2 } from '../landmarks/types';
import type { PathSegment, Region } from './layout';

/**
 * Wahrzeichen der unendlichen Ebene (ADR 0002): Fels mit Wasserfall, Felsstufe, Zwillingsfälle, hohe Ruine, grüner
 * Sumpf (`@ee/world/landmarks`). Geplant **je Region** der Weltenlage wie die übrigen Merkmale (deterministisch aus dem
 * Schlüssel der Region): je Pfadabschnitt meist ein Held-Wahrzeichen neben dem Pfad (12–20 Einheiten, der Pfad besucht
 * es), in den Startwelten dazu ein Sumpf; je Seitenzelle gelegentlich eines. Der Kern jedes Wahrzeichens liegt ganz in
 * seiner Welt (kein Riss durch Fels und Becken); zwei Wahrzeichen überlappen nie. Gebaut auf dem echten Gelände (Höhen
 * ohne Wahrzeichen); das Höhenfeld der Welt trägt danach ihre Becken, Bäche und Sumpfteiche (`ground`), Streuung, Müll
 * und Pfad fragen `blocks`, `waterAt` und `surfaceAt`.
 */
export interface PlaneLandmarkHost {
  seed: number;
  /** Gelände ohne Wahrzeichen (natürliche Höhe mit Seen und Flussrinnen). */
  heightAt(x: number, z: number): number;
  isWater(x: number, z: number, margin: number): boolean;
  /** Belegt (Felsformationen, Riesenbaum, Fokus-Elemente) oder über eine Weltgrenze hinweg. */
  isBlocked(x: number, z: number, radius: number): boolean;
  /** Abstand zur Mittellinie des Levelpfads (≥ 0). */
  pathDistance(x: number, z: number): number;
  worldAt(x: number, z: number): number;
  /** Region am Punkt (Weltenlage). */
  regionAt(x: number, z: number): Region;
  segment(k: number): PathSegment;
  backbone(z: number): number;
}

export interface PlaneLandmarkOptions {
  plan?: LandmarkPlanParams;
  /** Detailstufe der Blaupausen (1 Hoch, 0,55 Mobil): nur Zierrat; Plateaus und Wege bleiben gleich. */
  detail?: number;
  /** Chance eines Held-Wahrzeichens je Pfadabschnitt (Standard 0,8). */
  pathChance?: number;
  /** Chance eines Wahrzeichens je Seitenzelle (Standard 0,45). */
  cellChance?: number;
  /** Welten mit zusätzlichen Sümpfen am Pfad (Startwelten: 09 = 8, 02 = 1) und ihre Chance. */
  swampWorlds?: ReadonlyArray<number>;
  swampChance?: number;
  /** Regionen im Cache (Standard 512). */
  capacity?: number;
}

const EMPTY: readonly LandmarkInstance[] = [];
/** Raster der Nachschlage-Tabelle (Welteinheiten). */
const GRID = 32;
const HERO_KINDS: readonly LandmarkKind[] = ['fallsRock', 'cliffFall', 'twinFalls', 'ruin'];

export class PlaneLandmarks {
  readonly plan: LandmarkPlanParams;
  private readonly detail: number;
  private readonly capacity: number;
  private readonly pathChance: number;
  private readonly cellChance: number;
  private readonly swampWorlds: Set<number>;
  private readonly swampChance: number;
  private readonly regions = new Map<string, LandmarkInstance[]>();
  private readonly grid = new Map<string, readonly LandmarkInstance[]>();
  private readonly env: LandmarkEnv;
  /** Nachbarschaft des zuletzt gefragten Rasterfelds (die meisten Abfragen eines Chunks liegen im selben Feld). */
  private lastI = NaN;
  private lastK = NaN;
  private lastNear: readonly LandmarkInstance[] = EMPTY;
  /** Größter Planungsradius. */
  readonly reach: number;
  /** Zählt Änderungen (neue Planung nach `invalidate`). */
  version = 0;

  constructor(
    private readonly host: PlaneLandmarkHost,
    options: PlaneLandmarkOptions = {},
  ) {
    this.plan = options.plan ?? DEFAULT_LANDMARK_PLAN;
    this.detail = options.detail ?? 1;
    this.capacity = options.capacity ?? 512;
    this.pathChance = options.pathChance ?? 0.8;
    this.cellChance = options.cellChance ?? 0.45;
    this.swampWorlds = new Set(options.swampWorlds ?? [8, 1]);
    this.swampChance = options.swampChance ?? 0.85;
    this.reach = Math.max(...Object.values(LANDMARK_RADIUS));
    this.env = {
      heightAt: (x, z) => host.heightAt(x, z),
      isWater: (x, z, m) => host.isWater(x, z, m),
      isBlocked: (x, z, r) => host.isBlocked(x, z, r),
      pathDistance: (x, z) => host.pathDistance(x, z),
      worldAt: (x, z) => host.worldAt(x, z),
    };
  }

  // --- Planung je Region -----------------------------------------------------------------------------------

  /** Wahrzeichen einer Region (geplant und gebaut beim ersten Zugriff). */
  regionInstances(region: Region): LandmarkInstance[] {
    const hit = this.regions.get(region.key);
    if (hit) return hit;
    const list = this.planRegion(region).map((p) => placeLandmark(p, (x, z) => this.host.heightAt(x, z), { detail: this.detail }));
    if (this.regions.size >= this.capacity) {
      const oldest = this.regions.keys().next().value;
      if (oldest !== undefined) this.regions.delete(oldest);
    }
    this.regions.set(region.key, list);
    return list;
  }

  private weights(world: number, kinds: readonly LandmarkKind[]): Array<[LandmarkKind, number]> {
    const mult = this.plan.worldWeights?.(world) ?? {};
    return kinds.filter((k) => this.plan.kinds[k]).map((k) => [k, (this.plan.kinds[k]?.weight ?? 0) * (mult[k] ?? 1)]);
  }

  private candidate(kind: LandmarkKind, x: number, z: number, yaw: number, seed: number, world: number, params: LandmarkKindParams, taken: LandmarkPlacement[]): LandmarkPlacement | null {
    const R = LANDMARK_RADIUS[kind];
    for (const t of taken) if (Math.hypot(t.x - x, t.z - z) < t.radius + R + 2) return null;
    if (checkLandmarkSite(kind, x, z, params, this.env, this.plan.waterMargin ?? 1.5)) return null;
    return { id: `${kind}:${Math.round(x * 10)}:${Math.round(z * 10)}`, kind, x, z, y: this.host.heightAt(x, z), yaw, seed, radius: R, world };
  }

  /** Front eines Wahrzeichens neben dem Pfad: halb zum Pfad, halb zurück zur Kamera (die Karte blickt nach −z). */
  private yawToward(u: number, r: number): number {
    const dx = -Math.sign(u || 1);
    const dz = 0.8;
    return Math.atan2(dx, dz) + (r - 0.5) * 0.4;
  }

  private planRegion(region: Region): LandmarkPlacement[] {
    const rand = mulberry32(hash32('plane-landmarks', region.key, this.host.seed));
    const out: LandmarkPlacement[] = [];
    const world = region.world;
    if (region.kind === 'path') {
      const seg = this.host.segment(region.k);
      const len = seg.zStart - seg.zEnd;
      // Held-Wahrzeichen neben dem Pfad (der Pfad steigt hinauf)
      if (rand() < this.pathChance) {
        const kind = pick(this.weights(world, HERO_KINDS), rand());
        const sideDraw = rand() < 0.5 ? -1 : 1;
        const seed = Math.floor(rand() * 0x7fffffff);
        if (kind) {
          for (let t = 0; t < 10; t++) {
            const side = t % 2 === 0 ? sideDraw : -sideDraw;
            const z = seg.zStart - len * (0.3 + rand() * 0.4);
            const u = side * (12.5 + rand() * 7);
            const x = this.host.backbone(z) + u;
            const p = this.candidate(kind, x, z, this.yawToward(u, rand()), seed, world, this.plan.kinds[kind]!, out);
            if (p) {
              out.push(p);
              break;
            }
          }
        }
      }
      // Sümpfe in den Startwelten (grün, viel Wasser), sonst seltener
      const swampChance = this.swampWorlds.has(world) ? this.swampChance : 0.2;
      if (this.plan.kinds.swamp && rand() < swampChance) {
        const seed = Math.floor(rand() * 0x7fffffff);
        const pref = out[0] ? -Math.sign(out[0].x - this.host.backbone(out[0].z)) : rand() < 0.5 ? -1 : 1;
        for (let t = 0; t < 16; t++) {
          const side = t % 3 === 2 ? -pref : pref;
          const z = seg.zStart - len * (0.15 + rand() * 0.7);
          const u = side * (14 + rand() * 14);
          const x = this.host.backbone(z) + u;
          const p = this.candidate('swamp', x, z, this.yawToward(u, rand()), seed, world, this.plan.kinds.swamp, out);
          if (p) {
            out.push(p);
            break;
          }
        }
      }
      return out;
    }
    // Seitenzelle: gelegentlich ein Wahrzeichen nahe der Mitte (ohne Pfadabstand: der Pfad ist weit)
    if (rand() < this.cellChance) {
      const kind = pick(this.weights(world, [...HERO_KINDS, 'swamp']), rand());
      const seed = Math.floor(rand() * 0x7fffffff);
      if (kind) {
        const params: LandmarkKindParams = { ...this.plan.kinds[kind]! };
        delete params.pathDistance;
        for (let t = 0; t < 8; t++) {
          const x = region.cx + (rand() - 0.5) * 12;
          const z = region.cz + (rand() - 0.5) * 12;
          const p = this.candidate(kind, x, z, rand() * Math.PI * 2, seed, world, params, out);
          if (p) {
            out.push(p);
            break;
          }
        }
      }
    }
    return out;
  }

  // --- Nachschlagen --------------------------------------------------------------------------------------

  /** Wahrzeichen, deren Fußabdruck das Rasterfeld (gi, gk) berührt (plant die Regionen ringsum bei Bedarf). */
  private gridCell(gi: number, gk: number): readonly LandmarkInstance[] {
    const key = `${gi}:${gk}`;
    const hit = this.grid.get(key);
    if (hit) return hit;
    const R = this.reach + 1;
    const x0 = gi * GRID - R;
    const z0 = gk * GRID - R;
    const x1 = (gi + 1) * GRID + R;
    // Regionen im erweiterten Feld (Abtastung dichter als die kleinste Region)
    const seen = new Set<string>();
    const found: LandmarkInstance[] = [];
    const step = (x1 - x0) / 4;
    for (let a = 0; a <= 4; a++) {
      for (let b = 0; b <= 4; b++) {
        const region = this.host.regionAt(x0 + a * step, z0 + b * step);
        if (seen.has(region.key)) continue;
        seen.add(region.key);
        for (const inst of this.regionInstances(region)) {
          const p = inst.placement;
          const r = inst.blueprint.radius;
          if (p.x + r < gi * GRID || p.x - r > (gi + 1) * GRID || p.z + r < gk * GRID || p.z - r > (gk + 1) * GRID) continue;
          if (!found.includes(inst)) found.push(inst);
        }
      }
    }
    const list = found.length > 0 ? found : EMPTY;
    if (this.grid.size >= this.capacity * 2) {
      const oldest = this.grid.keys().next().value;
      if (oldest !== undefined) this.grid.delete(oldest);
      this.lastI = NaN;
    }
    this.grid.set(key, list);
    return list;
  }

  /** Wahrzeichen, deren Fußabdruck (x, z) erreichen kann. */
  near(x: number, z: number): readonly LandmarkInstance[] {
    const i = Math.floor(x / GRID);
    const k = Math.floor(z / GRID);
    if (i === this.lastI && k === this.lastK) return this.lastNear;
    const list = this.gridCell(i, k);
    this.lastI = i;
    this.lastK = k;
    this.lastNear = list;
    return list;
  }

  /** Wahrzeichen, deren Fußabdruck das Rechteck berührt. */
  inRect(x0: number, z0: number, x1: number, z1: number): LandmarkInstance[] {
    const out: LandmarkInstance[] = [];
    for (let i = Math.floor(x0 / GRID); i <= Math.floor(x1 / GRID); i++) {
      for (let k = Math.floor(z0 / GRID); k <= Math.floor(z1 / GRID); k++) {
        for (const inst of this.gridCell(i, k)) {
          const p = inst.placement;
          const R = inst.blueprint.radius;
          if (p.x + R < x0 || p.x - R > x1 || p.z + R < z0 || p.z - R > z1) continue;
          if (!out.includes(inst)) out.push(inst);
        }
      }
    }
    return out;
  }

  /** Höhe mit Becken, Bächen und Sumpfteichen der Wahrzeichen (h = Gelände ohne sie). */
  ground(x: number, z: number, h: number): number {
    const near = this.near(x, z);
    return near.length === 0 ? h : landmarkGround(near, x, z, h);
  }

  /** Belegt ein Wahrzeichen (Fels, Stein, Wasser, Nebel) den Kreis (x, z, r)? */
  blocks(x: number, z: number, radius: number): boolean {
    const near = this.near(x, z);
    return near.length > 0 && landmarkBlocks(near, x, z, radius);
  }

  /** Wasser eines Wahrzeichens (Becken, Bach, Sumpf) an (x, z) oder null. */
  waterAt(x: number, z: number): { level: number; depth: number } | null {
    const near = this.near(x, z);
    return near.length === 0 ? null : landmarkWaterAt(near, x, z);
  }

  /** Begehbare Oberkante eines Wahrzeichens (Plateau, Terrasse, Stufe, Insel) an (x, z) oder null. */
  surfaceAt(x: number, z: number): number | null {
    let best: number | null = null;
    for (const inst of this.near(x, z)) {
      const top = landmarkSurfaceAt(inst, x, z);
      if (top !== null && (best === null || top > best)) best = top;
    }
    return best;
  }

  /** Alles neu planen (Wahrzeichen oder Merkmale haben sich geändert). */
  invalidate(): void {
    this.regions.clear();
    this.grid.clear();
    this.lastI = NaN;
    this.lastK = NaN;
    this.lastNear = EMPTY;
    this.version++;
  }

  get planned(): number {
    return this.regions.size;
  }
}

function pick(kinds: ReadonlyArray<[LandmarkKind, number]>, r: number): LandmarkKind | null {
  let total = 0;
  for (const [, w] of kinds) total += Math.max(0, w);
  if (total <= 0) return null;
  let acc = 0;
  for (const [k, w] of kinds) {
    acc += Math.max(0, w) / total;
    if (r < acc) return k;
  }
  return kinds[kinds.length - 1]![0];
}

export type { P2 };
