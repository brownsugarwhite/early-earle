import { hash32 } from '../rng';
import type { Vec3 } from '../capPatch';
import { TREE_KIND_LIST, type TreeKind } from '../scatterTrees';
import type { WorldFeatureSpec } from '../features/types';
import { GradientNoise2, hash2, smoothstep } from './noise2';
import { WorldLayout, type Region, type RegionSample } from './layout';
import type { WorldCatalog } from './catalog';
import { PlaneFeatures, type RegionSite } from './features/index';
import type { LedgeAnchor, RockColumn, RockFormation } from './features/types';
import type { LandmarkSlot, PlanetLandmarkParams, PlanetPropKind, PlanetVegetationFamily, WorldSpec } from './types';
import { PlaneLandmarks, type PlaneLandmarkOptions } from './landmarks';
import { flankHeight, ridgeTrainHeight, type FlankSpec, type RidgeTrainSpec } from './flank';
import type { LandmarkPlanParams } from '../landmarks/types';
import { DEFAULT_LANDMARK_PLAN } from '../landmarks/placement';

export interface ResolvedShape {
  amplitude: number;
  wavelength: number;
  ridge: number;
  floor: number;
  slope: number;
  /** Streckung der Hügel quer zum Pfad (x), 1 = rund (siehe `PlanetTerrainShape.stretch`). */
  stretch?: number;
  /** Steilhang neben dem Pfad (Welt 12) und sein Anteil (1 in der Welt, an Grenzen gemischt). */
  flank?: FlankSpec;
  flankW?: number;
  /** Hügelstaffel (Welt 11) und ihr Anteil. */
  ridges?: RidgeTrainSpec;
  ridgesW?: number;
}

export interface PlaneFieldParams {
  seed: number;
  layout: WorldLayout;
  catalog: WorldCatalog;
  /** Wellenlänge der Hügel in Welteinheiten (Standard 11, wie auf dem alten Planeten). */
  hillWavelength?: number;
  /** Breite der Formüberblendung an Weltgrenzen (Welteinheiten, Standard 2). */
  blendWidth?: number;
  /**
   * Wahrzeichen (Fels mit Wasserfall, Ruine, Sumpf …): Planung und Detailstufe; `false` = keine (Tests, alte Labs).
   */
  landmarks?: (PlaneLandmarkOptions & { plan?: LandmarkPlanParams }) | false;
}

function resolveShape(s: WorldSpec['terrain']): ResolvedShape {
  return {
    amplitude: s.amplitude,
    wavelength: s.wavelength ?? 1,
    ridge: s.ridge ?? 0,
    floor: s.floor ?? 0,
    slope: s.slope ?? 0,
    stretch: s.stretch ?? 1,
    ...(s.flank ? { flank: s.flank, flankW: 1 } : {}),
    ...(s.ridges ? { ridges: s.ridges, ridgesW: 1 } : {}),
  };
}

function mixShape(a: ResolvedShape, b: ResolvedShape, t: number, out: ResolvedShape): ResolvedShape {
  out.amplitude = a.amplitude + (b.amplitude - a.amplitude) * t;
  out.wavelength = a.wavelength + (b.wavelength - a.wavelength) * t;
  out.ridge = a.ridge + (b.ridge - a.ridge) * t;
  out.floor = a.floor + (b.floor - a.floor) * t;
  out.slope = a.slope + (b.slope - a.slope) * t;
  out.stretch = (a.stretch ?? 1) + ((b.stretch ?? 1) - (a.stretch ?? 1)) * t;
  const flank = a.flank ?? b.flank;
  if (flank) {
    out.flank = flank;
    out.flankW = (a.flank ? (a.flankW ?? 1) : 0) + ((b.flank ? (b.flankW ?? 1) : 0) - (a.flank ? (a.flankW ?? 1) : 0)) * t;
  } else if (out.flank) {
    delete out.flank;
    delete out.flankW;
  }
  const ridges = a.ridges ?? b.ridges;
  if (ridges) {
    out.ridges = ridges;
    out.ridgesW = (a.ridges ? (a.ridgesW ?? 1) : 0) + ((b.ridges ? (b.ridgesW ?? 1) : 0) - (a.ridges ? (a.ridgesW ?? 1) : 0)) * t;
  } else if (out.ridges) {
    delete out.ridges;
    delete out.ridgesW;
  }
  return out;
}

/**
 * Planung der Wahrzeichen auf der Ebene: wie `DEFAULT_LANDMARK_PLAN`, aber dichter und mit mehr Versuchen je Zelle —
 * der Kern jedes Wahrzeichens muss ganz in einer Welt liegen (Pfadabschnitte sind 42 lang, das Band ±30), das
 * verwirft viele Kandidaten. Etwa ein Wahrzeichen je Pfadabschnitt, Sümpfe dreifach in den Startwelten (09, 02).
 */
export const PLANE_LANDMARK_PLAN: LandmarkPlanParams = {
  ...DEFAULT_LANDMARK_PLAN,
  density: 0.85,
  tries: 12,
  // Sümpfe dürfen in welligem Gelände liegen (die Startwelten sind hügelig): die Teiche folgen dem Boden
  kinds: { ...DEFAULT_LANDMARK_PLAN.kinds, swamp: { weight: 1.1, pathDistance: [10, 60], maxRelief: 2.8, maxSlope: 0.34 } },
};

const TREE_KINDS = new Set<string>(TREE_KIND_LIST);
export function isTreeKind(k: string): k is TreeKind {
  return TREE_KINDS.has(k);
}

/**
 * Das Feld der unendlichen Ebene (ADR 0002): Höhen aus 2D-Rauschen je Weltform (an Grenzen weich gemischt), Welten
 * aus der Weltenlage, Geländemerkmale je Region (Seen und Flussrinnen im Höhenfeld), Fokus-Slots je Region und
 * externe Wahrzeichen (Riesenbaum). Positionen sind Ebenenkoordinaten `[x, h, z]`.
 */
export class PlaneField {
  readonly seed: number;
  readonly layout: WorldLayout;
  readonly catalog: WorldCatalog;
  readonly features: PlaneFeatures;
  /** Größte Hügelhöhe aller Welten (Schatten, Kamera). */
  readonly hMax: number;
  private readonly hills: GradientNoise2;
  private readonly ridges: GradientNoise2;
  private readonly ramps: GradientNoise2;
  private readonly biome: GradientNoise2;
  private readonly forest: GradientNoise2;
  private readonly freq: number;
  private readonly blendWidth: number;
  private readonly shapes = new Map<number, ResolvedShape>();
  private readonly rs = {} as RegionSample;
  private readonly rs2 = {} as RegionSample;
  private readonly tmpA: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  private readonly tmpB: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  private readonly tmpC: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  /** Eigene Formen der Planungs-Höhen (Merkmale, Wahrzeichen): laufen verschachtelt in `heightWithShape`. */
  private readonly tmpD: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  private readonly tmpE: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  private readonly external = new Map<string, LandmarkSlot>();
  private readonly focalCache = new Map<string, LandmarkSlot | null>();
  private readonly companionCache = new Map<string, LandmarkSlot[]>();
  /** Wahrzeichen der Ebene (null = aus). Ihre Becken und Teiche liegen im Höhenfeld. */
  readonly landmarks: PlaneLandmarks | null;
  private readonly rs3 = {} as RegionSample;
  /** Zählt Änderungen an Wahrzeichen/Merkmalen (Streuungen und Meshes neu bauen). */
  version = 0;

  constructor(params: PlaneFieldParams) {
    this.seed = params.seed;
    this.layout = params.layout;
    this.catalog = params.catalog;
    this.freq = 1 / (params.hillWavelength ?? 11);
    this.blendWidth = params.blendWidth ?? 2;
    this.hills = new GradientNoise2(hash32('plane-hills', params.seed));
    this.ridges = new GradientNoise2(hash32('plane-ridges', params.seed));
    this.ramps = new GradientNoise2(hash32('plane-ramps', params.seed));
    this.biome = new GradientNoise2(hash32('plane-biome', params.seed));
    this.forest = new GradientNoise2(hash32('plane-forest', params.seed));
    // Nur die Hügelamplitude: Steilhang und Hügelstaffel (Welten 11/12) zählen hier nicht — sonst wüchsen Kullkugeln und
    // Schattenkamera in allen Welten mit; die Karte nimmt dafür die Höhe der geladenen Chunks (`EarlePlanet.hTotal`)
    this.hMax = Math.max(3.6, ...params.catalog.authored.map((w) => w.terrain.amplitude));
    this.features = new PlaneFeatures(
      {
        seed: params.seed,
        worldId: (w) => this.catalog.spec(w).id,
        regionKeyAt: (x, z) => this.layout.sample(x, z, this.rs2).region.key,
        baseHeightAt: (x, z) => this.baseHeightAt(x, z),
        amplitudeAt: (x, z) => this.amplitudeAt(x, z),
        backbone: (z) => this.layout.backbone(z),
        backboneSlope: (z) => this.layout.backboneSlope(z),
        bandHalf: (z) => this.layout.bandHalf(z),
      },
      {
        site: (key) => this.regionSite(key),
        featureSpec: (w) => this.catalog.spec(w).features as WorldFeatureSpec | undefined,
      },
    );
    this.landmarks =
      params.landmarks === false
        ? null
        : new PlaneLandmarks(
            {
              seed: params.seed,
              heightAt: (x, z) => this.heightNoLandmarks(x, z),
              isWater: (x, z, m) => this.features.isWater(this.layout.sample(x, z, this.rs3).region.key, x, z, m),
              isBlocked: (x, z, r) => this.landmarkBlocked(x, z, r),
              pathDistance: (x, z) => this.backboneDistance(x, z),
              worldAt: (x, z) => this.layout.sample(x, z, this.rs3).world,
              regionAt: (x, z) => this.layout.sample(x, z, this.rs3).region,
              segment: (k) => this.layout.segment(k),
              backbone: (z) => this.layout.backbone(z),
              landmarkChance: (w) => this.catalog.spec(w).landmarkChance ?? 1,
            },
            {
              // Gewichte je Welt: Standard (Sümpfe der Startwelten) mal die Vorgabe der Weltdatei (`landmarks`, z. B. keine
              // Felsen mit Wasserfall in der Nebelweide)
              plan: { ...PLANE_LANDMARK_PLAN, worldWeights: (w) => ({ ...(PLANE_LANDMARK_PLAN.worldWeights?.(w) ?? {}), ...(this.catalog.spec(w).landmarks ?? {}) }) },
              ...(params.landmarks ?? {}),
            },
          );
  }

  /**
   * Abstand zur Mittellinie des Levelpfads, geschätzt aus dem Rückgrat (der Pfad schwingt höchstens ±3,2 darum): ohne
   * den Pfad zu bauen (die Wahrzeichen werden vor dem Pfad geplant, der Pfad besucht sie danach).
   */
  backboneDistance(x: number, z: number): number {
    const slope = this.layout.backboneSlope(z);
    const u = Math.abs(x - this.layout.backbone(z)) / Math.hypot(1, slope);
    return Math.max(0, u - 3.2);
  }

  /**
   * Belegt für die Planung der Wahrzeichen: Felsformationen, Riesenbaum und Fokus-Elemente im Fußabdruck; der Kern
   * (55 % des Radius: Fels, Becken, Treppen) liegt ganz in einer Welt (keine Weltgrenze, kein Riss quer durch Becken
   * und Fels).
   */
  private landmarkBlocked(x: number, z: number, radius: number): boolean {
    const rs = this.layout.sample(x, z, this.rs3);
    const world = rs.world;
    const key = rs.region.key;
    const core = radius * 0.55;
    if (rs.border < core) return true;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = x + Math.cos(a) * core;
      const pz = z + Math.sin(a) * core;
      const q = this.layout.sample(px, pz, this.rs3);
      if (q.world !== world) return true;
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI * 2;
      const f = i === 8 ? 0 : 0.7;
      const px = x + Math.cos(a) * radius * f;
      const pz = z + Math.sin(a) * radius * f;
      if (this.features.rockAt(this.layout.sample(px, pz, this.rs3).region.key, px, pz, 1) !== null) return true;
    }
    for (const l of this.external.values()) if (Math.hypot(x - l.position[0], z - l.position[2]) < l.clearRadius + radius) return true;
    const focal = this.focalSlot(key);
    if (focal && Math.hypot(x - focal.position[0], z - focal.position[2]) < focal.clearRadius + radius * 0.8) return true;
    for (const c of this.companionSlots(key)) if (Math.hypot(x - c.position[0], z - c.position[2]) < c.clearRadius + radius * 0.8) return true;
    return false;
  }

  // --- Welten und Formen -----------------------------------------------------------------------------------

  sample(x: number, z: number, out?: RegionSample): RegionSample {
    return this.layout.sample(x, z, out ?? this.rs);
  }

  spec(world: number): WorldSpec {
    return this.catalog.spec(world);
  }

  worldAt(x: number, z: number): number {
    return this.layout.sample(x, z, this.rs).world;
  }

  familyAt(x: number, z: number): PlanetVegetationFamily {
    return this.catalog.spec(this.worldAt(x, z)).vegetation;
  }

  shapeOf(world: number): ResolvedShape {
    let s = this.shapes.get(world);
    if (!s) {
      s = resolveShape(this.catalog.spec(world).terrain);
      if (this.shapes.size > 512) this.shapes.clear();
      this.shapes.set(world, s);
    }
    return s;
  }

  /** Form am Ort: Weltform, an Grenzen über ±`blendWidth` mit der Nachbarwelt gemischt. */
  shapeAt(x: number, z: number, rs?: RegionSample): ResolvedShape {
    const s = rs ?? this.layout.sample(x, z, this.rs);
    const own = this.shapeOf(s.world);
    if (s.neighbor === s.world || s.border >= this.blendWidth) return own;
    const w = WorldLayout.blendWeight(s.border, this.blendWidth);
    const other = this.shapeOf(s.neighbor);
    // Kopie, damit Aufrufer die Form über weitere Abfragen hinweg halten können
    mixShape(other, own, w, this.tmpC);
    return this.tmpC;
  }

  /** Form am Punkt in eine eigene Ablage (verschachtelte Abfragen überschreiben `shapeAt`s Ablage nicht). */
  private shapeInto(rs: RegionSample, out: ResolvedShape): ResolvedShape {
    const own = this.shapeOf(rs.world);
    if (rs.neighbor === rs.world || rs.border >= this.blendWidth) return own;
    return mixShape(this.shapeOf(rs.neighbor), own, WorldLayout.blendWeight(rs.border, this.blendWidth), out);
  }

  amplitudeAt(x: number, z: number): number {
    return this.shapeAt(x, z).amplitude;
  }

  // --- Höhen ---------------------------------------------------------------------------------------------

  /** Natürliches Gelände (ohne Seen/Flüsse) mit vorab bestimmter Form. */
  naturalHeight(x: number, z: number, s: ResolvedShape): number {
    const f = this.freq / Math.max(0.2, s.wavelength);
    // Streckung quer zum Pfad: Kämme laufen quer durchs Bild und staffeln sich in die Tiefe (Ebene 20)
    const fx = f / Math.max(0.25, s.stretch ?? 1);
    const n = this.hills.fbm(x * fx, z * f, 2);
    const smooth = smoothstep(0, 1, 0.5 + 0.55 * n);
    let base = smooth;
    if (s.ridge > 0) {
      const r = 1 - Math.abs(this.ridges.fbm(x * fx * 0.85 + 2.7, z * f * 0.85 + 9.1, 2));
      base = smooth + (r * r - smooth) * s.ridge;
    }
    if (s.slope > 0) {
      const ramp = 0.5 + 0.5 * this.ramps.fbm(x * fx * 0.3 - 1.7, z * f * 0.3 - 2.2, 1);
      base = base * (1 - s.slope * 0.5) + ramp * s.slope;
    }
    base = Math.min(1, Math.max(0, base));
    const h = s.floor > 0 ? smoothstep(s.floor, 1, base) : base;
    // Steilhang neben dem Pfad (Welt 12): Bergrücken parallel zum Pfad
    const flank = s.flank && (s.flankW ?? 1) > 0 ? flankHeight(this.layout, s.flank, x, z) * (s.flankW ?? 1) : 0;
    // Hügelstaffel (Welt 11): Kamm hinter Kamm quer zum Blick
    const ridges = s.ridges && (s.ridgesW ?? 1) > 0 ? ridgeTrainHeight(s.ridges, this.seed, x, z) * (s.ridgesW ?? 1) : 0;
    return s.amplitude * h + flank + ridges;
  }

  /** Natürliches Gelände (Planung der Merkmale). */
  baseHeightAt(x: number, z: number): number {
    const rs = this.layout.sample(x, z, this.rs2);
    return this.naturalHeight(x, z, this.shapeInto(rs, this.tmpD));
  }

  /** Höhe mit Seen, Flussrinnen und den Becken der Wahrzeichen. `key` = Region des Punkts (sonst neu bestimmt). */
  heightWithShape(x: number, z: number, s: ResolvedShape, key?: string): number {
    const h = this.naturalHeight(x, z, s);
    const k = key ?? this.layout.sample(x, z, this.rs2).region.key;
    const hf = this.features.applyHeight(k, x, z, h);
    return this.landmarks ? this.landmarks.ground(x, z, hf) : hf;
  }

  /** Gelände ohne Wahrzeichen (Planung und Bau der Wahrzeichen). */
  heightNoLandmarks(x: number, z: number): number {
    const rs = this.layout.sample(x, z, this.rs3);
    const key = rs.region.key;
    const h = this.naturalHeight(x, z, this.shapeInto(rs, this.tmpE));
    return this.features.applyHeight(key, x, z, h);
  }

  heightAt(x: number, z: number): number {
    const rs = this.layout.sample(x, z, this.rs);
    const s = this.shapeAt(x, z, rs);
    return this.heightWithShape(x, z, s, rs.region.key);
  }

  /** Höhe 0..1 relativ zur lokalen Amplitude. */
  heightNormAt(x: number, z: number): number {
    const rs = this.layout.sample(x, z, this.rs);
    const s = this.shapeAt(x, z, rs);
    return this.heightNormOf(x, z, this.heightWithShape(x, z, s, rs.region.key), s);
  }

  /**
   * Relative Höhe 0..1 einer Geländehöhe `h` an (x, z) mit der Form `s`; ein Steilhang mit `relief` zählt nicht mit
   * (Welt 06: das Relief des Hangs, nicht seine Höhe).
   */
  heightNormOf(x: number, z: number, h: number, s: ResolvedShape): number {
    const a = s.amplitude;
    if (a <= 1e-6) return 0;
    const base = s.flank?.relief && (s.flankW ?? 1) > 0 ? h - flankHeight(this.layout, s.flank, x, z) * (s.flankW ?? 1) : h;
    return Math.min(1, Math.max(0, base / a));
  }

  /**
   * Oberflächenpunkt `[x, h, z]` und Normale. Form und Region einmal am Punkt; die vier Nachbarproben (±0,19) nutzen
   * sie mit (Form und Region ändern sich langsam). Liefert die Höhe.
   */
  surfaceAt(x: number, z: number, outPos: Vec3, outNormal: Vec3, knownShape?: ResolvedShape, knownKey?: string): number {
    let shape: ResolvedShape;
    let key: string;
    if (knownShape && knownKey) {
      shape = knownShape;
      key = knownKey;
    } else {
      const rs = this.layout.sample(x, z, this.rs);
      key = rs.region.key;
      shape = knownShape ?? this.shapeAt(x, z, rs);
    }
    const sh: ResolvedShape = {
      amplitude: shape.amplitude,
      wavelength: shape.wavelength,
      ridge: shape.ridge,
      floor: shape.floor,
      slope: shape.slope,
      stretch: shape.stretch ?? 1,
      ...(shape.flank ? { flank: shape.flank, flankW: shape.flankW ?? 1 } : {}),
      ...(shape.ridges ? { ridges: shape.ridges, ridgesW: shape.ridgesW ?? 1 } : {}),
    };
    const h0 = this.heightWithShape(x, z, sh, key);
    outPos[0] = x;
    outPos[1] = h0;
    outPos[2] = z;
    const e = 0.19;
    const hx0 = this.heightWithShape(x - e, z, sh, key);
    const hx1 = this.heightWithShape(x + e, z, sh, key);
    const hz0 = this.heightWithShape(x, z - e, sh, key);
    const hz1 = this.heightWithShape(x, z + e, sh, key);
    const gx = (hx1 - hx0) / (2 * e);
    const gz = (hz1 - hz0) / (2 * e);
    const l = Math.hypot(gx, 1, gz);
    outNormal[0] = -gx / l;
    outNormal[1] = 1 / l;
    outNormal[2] = -gz / l;
    return h0;
  }

  /** Waldmaske 0..1 (Klumpung der Vegetation). */
  forestAt(x: number, z: number): number {
    const f = this.freq / 1.6;
    return 0.5 + 0.5 * this.forest.fbm(x * f + 3.3, z * f - 7.1, 2);
  }

  biomeAt(x: number, z: number): number {
    const f = this.freq * 0.45;
    return Math.min(1, Math.max(0, 0.5 + 0.6 * this.biome.fbm(x * f + 5.1, z * f + 9.7, 2)));
  }

  // --- Merkmale (Kurzformen mit Regionsbestimmung) ----------------------------------------------------------

  private keyAt(x: number, z: number): string {
    return this.layout.sample(x, z, this.rs2).region.key;
  }

  isWater(x: number, z: number, margin = 0): boolean {
    if (this.features.isWater(this.keyAt(x, z), x, z, margin)) return true;
    const lw = this.landmarks?.waterAt(x, z);
    return !!lw && lw.depth > -margin;
  }

  /** Belegt ein Wahrzeichen (Fels, Stein, Wasser) den Kreis (x, z, r)? Für Streuung, Müll und Pfad. */
  landmarkBlocks(x: number, z: number, radius: number): boolean {
    return this.landmarks?.blocks(x, z, radius) ?? false;
  }

  rockAt(x: number, z: number, margin = 0): { formation: RockFormation; column: RockColumn } | null {
    return this.features.rockAt(this.keyAt(x, z), x, z, margin);
  }

  /** Begehbare Höhe (Gelände, Felsdeckfläche oder die Oberkante eines Wahrzeichens). */
  surfaceHeightAt(x: number, z: number): number {
    const h = this.features.surfaceHeight(this.keyAt(x, z), x, z, this.heightAt(x, z));
    const top = this.landmarks?.surfaceAt(x, z);
    return top !== null && top !== undefined ? Math.max(h, top) : h;
  }

  /** Nächster Felsanker innerhalb `maxDist` (sucht in den Regionen um den Punkt). */
  ledgeNear(x: number, z: number, maxDist = 6): LedgeAnchor | null {
    const keys = new Set<string>();
    for (const [ox, oz] of [[0, 0], [maxDist, 0], [-maxDist, 0], [0, maxDist], [0, -maxDist]] as const) keys.add(this.keyAt(x + ox, z + oz));
    let best: LedgeAnchor | null = null;
    let bestD = maxDist;
    for (const k of keys) {
      for (const a of this.features.region(k).ledges) {
        const d = Math.hypot(a.position[0] - x, a.position[2] - z);
        if (d <= bestD) {
          bestD = d;
          best = a;
        }
      }
    }
    return best;
  }

  // --- Regionen, Fokus-Slots, Wahrzeichen ---------------------------------------------------------------------

  /** Planungsdaten einer Region (Merkmale): Geometrie, Bildfokus, Freiräume. */
  regionSite(key: string): RegionSite {
    const region = this.layout.region(key);
    const segment = region.kind === 'path' ? this.layout.segment(region.k) : null;
    const focal = this.focalSlot(key);
    const focus: [number, number] = focal ? [focal.position[0], focal.position[2]] : [region.cx, region.cz];
    const keepClear: RegionSite['keepClear'] = [];
    if (focal && focal.clearRadius > 0) keepClear.push({ x: focal.position[0], z: focal.position[2], radius: focal.clearRadius });
    for (const c of this.companionSlots(key)) if (c.clearRadius > 0) keepClear.push({ x: c.position[0], z: c.position[2], radius: c.clearRadius });
    for (const l of this.external.values()) if (l.region === key && l.clearRadius > 0) keepClear.push({ x: l.position[0], z: l.position[2], radius: l.clearRadius });
    return { region, segment, focus, cellRadius: Math.min(this.layout.cellAcross, this.layout.cellAlong) * 0.5, keepClear };
  }

  /** Fokus-Slot einer Region (Fokus-Element der Weltkomposition) oder null. */
  focalSlot(key: string): LandmarkSlot | null {
    if (this.focalCache.has(key)) return this.focalCache.get(key)!;
    const region = this.layout.region(key);
    const spec = this.catalog.spec(region.world);
    const focal = spec.focal;
    let slot: LandmarkSlot | null = null;
    if (focal) {
      let x: number;
      let z: number;
      if (region.kind === 'path') {
        const seg = this.layout.segment(region.k);
        const along = focal.along ?? 0.5;
        z = seg.zStart + (seg.zEnd - seg.zStart) * Math.min(0.9, Math.max(0.1, along));
        const lateral = focal.lateral ?? (hash2(region.k, 7, this.seed) < 0.5 ? -1 : 1) * 10;
        x = this.layout.backbone(z) + lateral;
      } else {
        const jx = (hash2(region.c, region.j, this.seed + 17) - 0.5) * 6;
        const jz = (hash2(region.c, region.j, this.seed + 23) - 0.5) * 6;
        x = region.cx + jx;
        z = region.cz + jz;
      }
      const pos: Vec3 = [0, 0, 0];
      const nor: Vec3 = [0, 0, 0];
      const rs = this.layout.sample(x, z, this.rs2);
      const shape = this.shapeAt(x, z, rs);
      pos[0] = x;
      pos[1] = this.naturalHeight(x, z, shape);
      pos[2] = z;
      const e = 0.19;
      const gx = (this.naturalHeight(x + e, z, shape) - this.naturalHeight(x - e, z, shape)) / (2 * e);
      const gz = (this.naturalHeight(x, z + e, shape) - this.naturalHeight(x, z - e, shape)) / (2 * e);
      const l = Math.hypot(gx, 1, gz);
      nor[0] = -gx / l;
      nor[1] = 1 / l;
      nor[2] = -gz / l;
      const kind = focal.kind;
      const scale = focal.scale ?? 1;
      const clearRadius = focal.clearRadius ?? defaultClearRadius(kind, scale);
      slot = {
        id: `focal-${key}`,
        world: region.world,
        region: key,
        position: pos,
        normal: nor,
        yawDeg: focal.yawDeg ?? 0,
        scale: 1,
        clearRadius,
        ...(kind ? { instance: { kind, scale } } : {}),
        // Baum mit Gesicht: gesetztes `yawDeg` dreht den Fokus-Baum (Wintereiche Ebene 11), sonst gehasht wie alle
        ...(focal.yawDeg !== undefined ? { turnTree: true } : {}),
      };
    }
    if (this.focalCache.size > 2048) this.focalCache.clear();
    this.focalCache.set(key, slot);
    return slot;
  }

  /**
   * Begleiter des Fokus-Elements einer Region (Weltkomposition, `focal.companions`): feste Versätze zum Fokus, Fuß auf
   * dem natürlichen Gelände. Nur Begleiter in derselben Region (an einer Grenze fällt einer weg); leer ohne Fokus.
   */
  companionSlots(key: string): LandmarkSlot[] {
    const hit = this.companionCache.get(key);
    if (hit) return hit;
    const focal = this.focalSlot(key);
    const list = focal ? (this.catalog.spec(focal.world).focal?.companions ?? []) : [];
    const out: LandmarkSlot[] = [];
    list.forEach((c, i) => {
      const x = focal!.position[0] + c.dx;
      const z = focal!.position[2] + c.dz;
      const rs = this.layout.sample(x, z, this.rs2);
      if (rs.region.key !== key) return;
      const shape = this.shapeAt(x, z, rs);
      const e = 0.19;
      const gx = (this.naturalHeight(x + e, z, shape) - this.naturalHeight(x - e, z, shape)) / (2 * e);
      const gz = (this.naturalHeight(x, z + e, shape) - this.naturalHeight(x, z - e, shape)) / (2 * e);
      const l = Math.hypot(gx, 1, gz);
      const scale = c.scale ?? 1;
      out.push({
        id: `focal-${key}-c${i}`,
        world: focal!.world,
        region: key,
        position: [x, this.naturalHeight(x, z, shape), z],
        normal: [-gx / l, 1 / l, -gz / l],
        yawDeg: c.yawDeg ?? 0,
        scale: 1,
        clearRadius: c.clearRadius ?? defaultClearRadius(c.kind, scale),
        instance: { kind: c.kind, scale },
        turnTree: true,
      });
    });
    if (this.companionCache.size > 2048) this.companionCache.clear();
    this.companionCache.set(key, out);
    return out;
  }

  /** Alle Wahrzeichen (Fokus-Slots der Regionen + externe) in den gegebenen Regionen. */
  landmarksIn(keys: Iterable<string>): LandmarkSlot[] {
    const out: LandmarkSlot[] = [];
    const set = new Set(keys);
    for (const k of set) {
      const f = this.focalSlot(k);
      if (f) out.push(f);
      for (const c of this.companionSlots(k)) out.push(c);
    }
    for (const l of this.external.values()) if (set.has(l.region)) out.push(l);
    return out;
  }

  /** Externes Wahrzeichen setzen (z. B. der Riesenbaum); seine Region wird neu geplant, wenn Merkmale im Weg lagen. */
  setLandmark(params: PlanetLandmarkParams): LandmarkSlot {
    const rs = this.layout.sample(params.x, params.z, this.rs2);
    const key = rs.region.key;
    const pos: Vec3 = [0, 0, 0];
    const nor: Vec3 = [0, 0, 0];
    const slot: LandmarkSlot = {
      id: params.id,
      world: params.world,
      region: key,
      position: pos,
      normal: nor,
      yawDeg: params.yawDeg ?? 0,
      scale: params.scale,
      clearRadius: params.clearRadius,
      ...(params.instance ? { instance: params.instance } : {}),
    };
    const prev = this.external.get(params.id);
    this.external.set(params.id, slot);
    const circle = [{ x: params.x, z: params.z, radius: params.clearRadius }];
    if (params.clearRadius > 0 && this.features.conflicts(key, circle)) {
      this.features.invalidate(key);
      this.version++;
    }
    if (prev && prev.region !== key) {
      this.features.invalidate(prev.region);
      this.version++;
    }
    // Wahrzeichen der Umgebung neu planen (sie meiden den Riesenbaum)
    this.landmarks?.invalidate();
    // Höhe erst nach der (Neu-)Planung: der Fuß steht auf dem echten Gelände (Seen im Höhenfeld)
    this.surfaceAt(params.x, params.z, pos, nor);
    this.version++;
    return slot;
  }

  removeLandmark(id: string): void {
    const prev = this.external.get(id);
    if (!prev) return;
    this.external.delete(id);
    this.features.invalidate(prev.region);
    this.landmarks?.invalidate();
    this.version++;
  }

  getLandmark(id: string): LandmarkSlot | undefined {
    return this.external.get(id);
  }

  get externalLandmarks(): LandmarkSlot[] {
    return [...this.external.values()];
  }

  /** Region als Objekt (Kurzform). */
  region(key: string): Region {
    return this.layout.region(key);
  }

  /** Fokus-Element als Requisit? */
  static isPropInstance(kind: TreeKind | PlanetPropKind): kind is PlanetPropKind {
    return !isTreeKind(kind);
  }
}

/** Standard-Freiraum eines Fokus-Elements bzw. Begleiters nach Art (Scheune 4.5, Eiche und Schnee-Ahorn nach Größe). */
function defaultClearRadius(kind: TreeKind | PlanetPropKind | undefined, scale: number): number {
  if (!kind) return 0;
  if (kind === 'barn') return 4.5;
  if (kind === 'oak' || kind === 'winterOak') return 2.4 * scale;
  if (kind === 'maple') return 1.6 * scale;
  return 3.2;
}
