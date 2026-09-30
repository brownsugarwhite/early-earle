import { GradientNoise2, hash2, smoothstep } from './noise2';
import { hash32 } from '../rng';

/**
 * Weltenlage der unendlichen Ebene (ADR 0002): der Levelpfad läuft entlang −z auf einem langsam schwingenden
 * Rückgrat `x_b(z)`. Die Pfadwelten bilden eine Folge von Abschnitten entlang z (Autorenwelten 01–10 für die Level
 * 1–100, danach prozedurale Welten mit je 10 Leveln, hinter dem Start ein prozedurales Vorland). Das Pfadband ist
 * ±`bandHalfWidth` breit (verrauschter Rand); links und rechts davon liegen Seitenzellen (Voronoi in (v, z), v =
 * Abstand vom Bandrand) mit Nachbarwelten — nahe am Start Autorenwelten, weiter draußen prozedurale Welten.
 *
 * Alles deterministisch aus dem Seed; beliebiger Zugriff (keine Abhängigkeit von vorherigen Abschnitten).
 */

/** Weltkennungen: 0 … authored−1 Autorenwelten, danach prozedurale Pfadwelten; Seitenzellen und Vorland eigene Räume. */
export const LATERAL_WORLD_BASE = 1 << 20;
export const PROLOGUE_WORLD_BASE = 1 << 21;

/** Ein Abschnitt der Autorenroute (Welt und Anzahl Level). */
export interface RouteEntry {
  world: number;
  levels: number;
  /** Länge entlang z (Welteinheiten); Standard `levels × nodeSpacing` (der Riesenbaum trägt 16 Level auf kurzer Strecke). */
  length?: number;
}

export interface LayoutParams {
  seed: number;
  /** Autorenroute (Level 1 … Summe). */
  route: RouteEntry[];
  /** Anzahl Autorenwelten (Kennungen 0 … authored−1); danach beginnen die prozeduralen Pfadwelten. */
  authored: number;
  /** Abstand zweier Level entlang z (Standard 4.2 — wie der alte Spiralpfad). */
  nodeSpacing?: number;
  /** Level je prozeduraler Pfadwelt (Standard 10). */
  proceduralLevels?: number;
  /** Länge eines Vorland-Abschnitts hinter dem Start (Standard 52). */
  prologueLength?: number;
  /** Halbe Breite des Pfadbands (Standard 13). */
  bandHalfWidth?: number;
  /** Zellmaß der Seitenwelten: quer (v) und längs (z). Standard 34 × 42. */
  cell?: { across: number; along: number };
}

export interface PathSegment {
  k: number;
  world: number;
  /** z-Bereich: der Abschnitt beginnt bei `zStart` und läuft nach `zEnd` (< zStart, vorwärts = −z). */
  zStart: number;
  zEnd: number;
  /** Erster Level (1-basiert) und Anzahl; Vorland: 0 und 0. */
  firstLevel: number;
  levels: number;
}

export type RegionKind = 'path' | 'cell';

export interface Region {
  key: string;
  kind: RegionKind;
  world: number;
  /** Pfadabschnitt (kind 'path') bzw. benachbarter Pfadabschnitt einer Zelle. */
  k: number;
  /** Seitenzelle: Spalte (± = rechts/links, nie 0) und Reihe. */
  c: number;
  j: number;
  /** Mittelpunkt (Ebene): Pfadabschnitt = Rückgrat in der Mitte, Zelle = Voronoi-Zentrum. */
  cx: number;
  cz: number;
}

/** Ergebnis von `WorldLayout.sample` (je Punkt): Region, Welt, nächste Grenze. */
export interface RegionSample {
  region: Region;
  world: number;
  /** Welt jenseits der nächsten Grenze. */
  neighbor: number;
  /** Abstand zur nächsten Regionsgrenze (≥ 0, Welteinheiten). */
  border: number;
  /** Grenzkennung: ≥ 1 Pfadabschnittsgrenze k|k+1 (schließt mit dem Fortschritt), −1 seitliche Grenze (immer offen). */
  borderId: number;
  /** Koordinate längs der Grenze (Zickzack des Risses). */
  along: number;
  /** Seitlicher Abstand zum Rückgrat (vorzeichenbehaftet, + = rechts). */
  u: number;
}

const SPLIT_WOBBLE = 1.6;

export class WorldLayout {
  readonly seed: number;
  readonly nodeSpacing: number;
  readonly proceduralLevels: number;
  readonly prologueLength: number;
  readonly bandHalfWidth: number;
  readonly cellAcross: number;
  readonly cellAlong: number;
  readonly authored: number;
  /** Anzahl Level der Autorenroute. */
  readonly authoredLevels: number;
  private readonly route: RouteEntry[];
  /** Kumulierte Längen der Autorenroute: starts[k] = Abstand vom Start zum Beginn von Abschnitt k. */
  private readonly starts: number[] = [];
  private readonly firstLevels: number[] = [];
  private readonly band: GradientNoise2;
  private readonly split: GradientNoise2;
  private readonly wobble: GradientNoise2;
  private readonly phases: number[];
  private readonly regionCache = new Map<string, Region>();
  private readonly cellWorldCache = new Map<string, number>();
  private readonly siteSalt: number;
  private readonly cellWorldSalt: number;

  constructor(params: LayoutParams) {
    this.seed = params.seed;
    this.nodeSpacing = params.nodeSpacing ?? 4.2;
    this.proceduralLevels = params.proceduralLevels ?? 10;
    this.prologueLength = params.prologueLength ?? 52;
    this.bandHalfWidth = params.bandHalfWidth ?? 13;
    this.cellAcross = params.cell?.across ?? 34;
    this.cellAlong = params.cell?.along ?? 42;
    this.authored = params.authored;
    this.route = params.route.length > 0 ? params.route : [{ world: 0, levels: 10 }];
    let s = 0;
    let level = 1;
    for (const r of this.route) {
      this.starts.push(s);
      this.firstLevels.push(level);
      s += r.length ?? r.levels * this.nodeSpacing;
      level += r.levels;
    }
    this.starts.push(s);
    this.firstLevels.push(level);
    this.authoredLevels = level - 1;
    this.siteSalt = hash32('layout-site', params.seed);
    this.cellWorldSalt = hash32('layout-cellworld', params.seed);
    this.band = new GradientNoise2(hash32('layout-band', params.seed));
    this.split = new GradientNoise2(hash32('layout-split', params.seed));
    this.wobble = new GradientNoise2(hash32('layout-wobble', params.seed));
    const rnd = (n: number) => hash2(n, 3, hash32('layout-phase', params.seed));
    this.phases = [rnd(1) * Math.PI * 2, rnd(2) * Math.PI * 2, rnd(3) * Math.PI * 2];
  }

  // --- Rückgrat ------------------------------------------------------------------------------------------

  /** Seitliche Lage des Pfad-Rückgrats bei z (langsame Schwünge, x_b(0) = 0). */
  backbone(z: number): number {
    return this.backboneRaw(z) - this.backboneRaw(0);
  }

  private backboneRaw(z: number): number {
    const [a, b, c] = this.phases;
    const t = Math.PI * 2;
    return 13 * Math.sin((t * z) / 430 + a!) + 5 * Math.sin((t * z) / 173 + b!) + 1.6 * Math.sin((t * z) / 71 + c!);
  }

  /** Steigung dx/dz des Rückgrats. */
  backboneSlope(z: number): number {
    const [a, b, c] = this.phases;
    const t = Math.PI * 2;
    return 13 * (t / 430) * Math.cos((t * z) / 430 + a!) + 5 * (t / 173) * Math.cos((t * z) / 173 + b!) + 1.6 * (t / 71) * Math.cos((t * z) / 71 + c!);
  }

  /** Halbe Bandbreite bei z (verrauscht, ±2). */
  bandHalf(z: number): number {
    return this.bandHalfWidth + 2.2 * this.band.fbm(z / 31 + 5.3, 0.7, 2);
  }

  // --- Abschnitte ------------------------------------------------------------------------------------------

  /** Abstand vom Start (z = 0) zum Beginn von Abschnitt k (Vorland: negativ). */
  segmentStart(k: number): number {
    const n = this.route.length;
    if (k < 0) return k * this.prologueLength;
    if (k <= n) return this.starts[k]!;
    return this.starts[n]! + (k - n) * this.proceduralLevels * this.nodeSpacing;
  }

  segment(k: number): PathSegment {
    const n = this.route.length;
    const d0 = this.segmentStart(k);
    const d1 = this.segmentStart(k + 1);
    let world: number;
    let firstLevel: number;
    let levels: number;
    if (k < 0) {
      world = PROLOGUE_WORLD_BASE + -k;
      firstLevel = 0;
      levels = 0;
    } else if (k < n) {
      world = this.route[k]!.world;
      firstLevel = this.firstLevels[k]!;
      levels = this.route[k]!.levels;
    } else {
      world = this.authored + (k - n);
      firstLevel = this.firstLevels[n]! + (k - n) * this.proceduralLevels;
      levels = this.proceduralLevels;
    }
    return { k, world, zStart: -d0, zEnd: -d1, firstLevel, levels };
  }

  /** Abschnitt, in dem die Entfernung d = −z vom Start liegt (ohne Grenzrauschen). */
  segmentAtDistance(d: number): number {
    const n = this.route.length;
    if (d < 0) return Math.floor(d / this.prologueLength);
    const end = this.starts[n]!;
    if (d >= end) return n + Math.floor((d - end) / (this.proceduralLevels * this.nodeSpacing));
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid]! <= d) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** Abschnitt mit dem Level (1-basiert). */
  segmentOfLevel(level: number): number {
    const n = this.route.length;
    if (level < 1) return 0;
    if (level < this.firstLevels[n]!) {
      for (let k = n - 1; k >= 0; k--) if (level >= this.firstLevels[k]!) return k;
      return 0;
    }
    return n + Math.floor((level - this.firstLevels[n]!) / this.proceduralLevels);
  }

  /** Verrauschte Abschnittsgrenze: Versatz entlang z (Welteinheiten) an der Stelle x. */
  private splitOffset(x: number, k: number): number {
    return SPLIT_WOBBLE * this.split.fbm(x / 9 + k * 3.7, k * 1.3, 2);
  }

  // --- Regionen --------------------------------------------------------------------------------------------

  private pathRegion(k: number): Region {
    const key = `p${k}`;
    let r = this.regionCache.get(key);
    if (!r) {
      const seg = this.segment(k);
      const cz = (seg.zStart + seg.zEnd) * 0.5;
      r = { key, kind: 'path', world: seg.world, k, c: 0, j: 0, cx: this.backbone(cz), cz };
      this.cacheRegion(key, r);
    }
    return r;
  }

  private cacheRegion(key: string, r: Region): void {
    if (this.regionCache.size > 4096) this.regionCache.clear();
    this.regionCache.set(key, r);
  }

  /** Voronoi-Zentrum der Seitenzelle (c, j) in (v, z) — v = Abstand vom Bandrand. */
  private site(c: number, j: number, out: [number, number]): [number, number] {
    const col = Math.abs(c);
    const salt = this.siteSalt;
    const stagger = hash2(c, 0, salt) * this.cellAlong;
    const jv = (hash2(c, j, salt + 1) - 0.5) * 0.56;
    const jz = (hash2(c, j, salt + 2) - 0.5) * 0.62;
    out[0] = (col - 0.5 + jv) * this.cellAcross;
    out[1] = (j + 0.5 + jz) * this.cellAlong - stagger;
    return out;
  }

  private readonly siteTmp: [number, number] = [0, 0];

  /** Seitenzelle als Region (Welt über `cellWorld`). */
  cellRegion(c: number, j: number): Region {
    const key = `c${c}:${j}`;
    let r = this.regionCache.get(key);
    if (!r) {
      const [v, z] = this.site(c, j, this.siteTmp);
      const side = c > 0 ? 1 : -1;
      const x = this.backbone(z) + side * (this.bandHalf(z) + v);
      const d = -z;
      r = { key, kind: 'cell', world: this.cellWorld(c, j), k: this.segmentAtDistance(d), c, j, cx: x, cz: z };
      this.cacheRegion(key, r);
    }
    return r;
  }

  /**
   * Welt einer Seitenzelle: im Autorenbereich der Route (erste zwei Spalten) eine der anderen Autorenwelten, sonst eine
   * eigene prozedurale Welt (eindeutige Kennung je Zelle — nie zweimal dieselbe).
   */
  cellWorld(c: number, j: number): number {
    const key = `${c}:${j}`;
    const cached = this.cellWorldCache.get(key);
    if (cached !== undefined) return cached;
    const [, z] = this.site(c, j, this.siteTmp);
    const k = this.segmentAtDistance(-z);
    let world: number;
    if (k >= 0 && k < this.route.length && Math.abs(c) <= 2 && this.authored > 2) {
      const pathWorld = this.route[k]!.world;
      const salt = this.cellWorldSalt;
      const pool: number[] = [];
      for (let w = 0; w < this.authored; w++) if (w !== pathWorld) pool.push(w);
      let pick = pool[Math.floor(hash2(c, j, salt) * pool.length)]!;
      // Nachbarzellen (die Zelle weiter vorn in der Spalte, die Spalte näher am Band) nicht dieselbe Welt. Rekursiv
      // (endet, sobald die Nachbarzelle den Autorenbereich verlässt) — unabhängig von der Abfragereihenfolge.
      const avoid = new Set<number>([this.cellWorld(c, j - 1)]);
      if (Math.abs(c) > 1) avoid.add(this.cellWorld(c - Math.sign(c), j));
      for (let t = 0; t < pool.length && avoid.has(pick); t++) pick = pool[(pool.indexOf(pick) + 1) % pool.length]!;
      world = pick;
    } else {
      world = LATERAL_WORLD_BASE + cellIndex(c, j);
    }
    if (this.cellWorldCache.size > 8192) this.cellWorldCache.clear();
    this.cellWorldCache.set(key, world);
    return world;
  }

  /** Region, Welt und nächste Grenze am Punkt (x, z). */
  sample(x: number, z: number, out?: RegionSample): RegionSample {
    const o = out ?? ({} as RegionSample);
    const xb = this.backbone(z);
    const u = x - xb;
    const half = this.bandHalf(z);
    const au = Math.abs(u);
    o.u = u;
    const d = -z;
    if (au < half) {
      // Pfadband: Abschnitt mit verrauschter Grenze
      let k = this.segmentAtDistance(d);
      const off0 = this.splitOffset(x, k);
      const startD = this.segmentStart(k) + off0;
      if (d < startD) k -= 1;
      else {
        const endD = this.segmentStart(k + 1) + this.splitOffset(x, k + 1);
        if (d >= endD) k += 1;
      }
      const a = this.segmentStart(k) + this.splitOffset(x, k);
      const b = this.segmentStart(k + 1) + this.splitOffset(x, k + 1);
      const toStart = d - a;
      const toEnd = b - d;
      const region = this.pathRegion(k);
      o.region = region;
      o.world = region.world;
      const toEdge = half - au;
      if (toEdge < Math.min(toStart, toEnd)) {
        o.border = Math.max(0, toEdge);
        o.borderId = -1;
        o.along = z;
        // Welt jenseits des Bandrands: die Seitenzelle direkt daneben
        o.neighbor = this.cellAt(u >= 0 ? 1 : -1, 0.01, z).region.world;
      } else if (toStart <= toEnd) {
        o.border = Math.max(0, toStart);
        o.borderId = k;
        o.along = x;
        o.neighbor = this.pathRegion(k - 1).world;
      } else {
        o.border = Math.max(0, toEnd);
        o.borderId = k + 1;
        o.along = x;
        o.neighbor = this.pathRegion(k + 1).world;
      }
      return o;
    }
    // Seitenzellen: Voronoi in (v, z), v = Abstand vom Bandrand (leicht verrauscht)
    const side = u >= 0 ? 1 : -1;
    const v = au - half + 1.4 * this.wobble.fbm(x / 13 - 2.1, z / 13 + 4.4, 2);
    const hit = this.cellAt(side, Math.max(0.001, v), z);
    o.region = hit.region;
    o.world = hit.region.world;
    const toBand = au - half;
    if (toBand < hit.edge) {
      o.border = Math.max(0, toBand);
      o.borderId = -1;
      o.along = z;
      // Welt jenseits: der Pfadabschnitt an dieser Stelle
      o.neighbor = this.pathRegion(this.segmentAtDistance(d)).world;
    } else {
      o.border = Math.max(0, hit.edge);
      o.borderId = -1;
      o.along = hit.along;
      o.neighbor = hit.neighbor;
    }
    return o;
  }

  private readonly cellTmp = { region: null as unknown as Region, edge: 0, along: 0, neighbor: 0 };
  private readonly siteA: [number, number] = [0, 0];

  /** Nächste Seitenzelle zu (v, z) auf der Seite `side` (±1): Region, Abstand zur Voronoi-Kante, Nachbarwelt. */
  private cellAt(side: number, v: number, z: number): { region: Region; edge: number; along: number; neighbor: number } {
    const col0 = Math.max(1, Math.floor(v / this.cellAcross) + 1);
    let best = Infinity;
    let second = Infinity;
    let bc = 0;
    let bj = 0;
    let bx = 0;
    let bz = 0;
    let sc = 0;
    let sj = 0;
    let sx = 0;
    let sz = 0;
    for (let dc = -1; dc <= 1; dc++) {
      const col = col0 + dc;
      if (col < 1) continue;
      const c = side * col;
      const salt = this.siteSalt;
      const stagger = hash2(c, 0, salt) * this.cellAlong;
      const j0 = Math.floor((z + stagger) / this.cellAlong);
      for (let dj = -1; dj <= 1; dj++) {
        const j = j0 + dj;
        const [pv, pz] = this.site(c, j, this.siteA);
        const dv = v - pv;
        const dz = z - pz;
        const dd = dv * dv + dz * dz;
        if (dd < best) {
          second = best;
          sc = bc;
          sj = bj;
          sx = bx;
          sz = bz;
          best = dd;
          bc = c;
          bj = j;
          bx = pv;
          bz = pz;
        } else if (dd < second) {
          second = dd;
          sc = c;
          sj = j;
          sx = pv;
          sz = pz;
        }
      }
    }
    const t = this.cellTmp;
    t.region = this.cellRegion(bc, bj);
    if (!Number.isFinite(second)) {
      t.edge = 1e4;
      t.along = z;
      t.neighbor = t.region.world;
      return t;
    }
    const ex = sx - bx;
    const ez = sz - bz;
    const el = Math.hypot(ex, ez) || 1;
    // Abstand zur Mittelsenkrechten der beiden nächsten Zentren
    t.edge = (second - best) / (2 * el);
    t.along = (v * -ez + z * ex) / el;
    t.neighbor = this.cellRegion(sc, sj).world;
    return t;
  }

  /** Welt am Punkt (Kurzform). */
  worldAt(x: number, z: number): number {
    return this.sample(x, z, this.tmp).world;
  }

  private readonly tmp = {} as RegionSample;

  /** Region nach Schlüssel (Pfadabschnitt `p{k}` oder Zelle `c{c}:{j}`). */
  region(key: string): Region {
    if (key.startsWith('p')) return this.pathRegion(Number(key.slice(1)));
    const [c, j] = key.slice(1).split(':').map(Number);
    return this.cellRegion(c!, j!);
  }

  /** Pfadabschnitt als Region. */
  pathRegionOf(k: number): Region {
    return this.pathRegion(k);
  }

  /**
   * Regionen, die ein Rechteck [x0, x1] × [z0, z1] berühren können (Pfadabschnitte über den z-Bereich, Seitenzellen der
   * nächsten Spalten). Für die Merkmalsplanung je Chunk.
   */
  regionsInRect(x0: number, z0: number, x1: number, z1: number): Region[] {
    const out = new Map<string, Region>();
    const step = 4;
    for (let z = z0; z <= z1 + 1e-6; z += step) {
      for (let x = x0; x <= x1 + 1e-6; x += step) {
        const s = this.sample(Math.min(x, x1), Math.min(z, z1), this.tmp);
        out.set(s.region.key, s.region);
      }
    }
    return [...out.values()];
  }

  /** Weltgrenzen-Weichheit für Formen (0 an der Grenze → Hälfte, 1 ab `width`). */
  static blendWeight(border: number, width = 2): number {
    return 0.5 + 0.5 * smoothstep(0, width, border);
  }
}

/** Eindeutiger Index einer Seitenzelle (c ≠ 0, j beliebig) → ℕ. */
export function cellIndex(c: number, j: number): number {
  const a = c > 0 ? 2 * c - 2 : -2 * c - 1; // ±c → 0, 1, 2, …
  const b = j >= 0 ? 2 * j : -2 * j - 1;
  // Cantor-Paarung
  return ((a + b) * (a + b + 1)) / 2 + b;
}
