import type { RouteShape, RouteShapeParams } from '@ee/core';
import { GradientNoise2, hash2, smoothstep } from './noise2';
import { hash32 } from '../rng';
import { focalClearRadius, macroCenterline, type MacroCircle, type MacroHit, type MacroLine } from './macro';
import { ridgeTrainCrest } from './flank';
import type { WorldSpec } from './types';

/**
 * Weltenlage der unendlichen Ebene (ADR 0002, Nachtrag „Route 15 + 1“): der Levelpfad läuft entlang −z auf einem
 * langsam schwingenden Rückgrat `x_b(z)`. Die Pfadwelten bilden eine Folge von Abschnitten entlang z — die Autorenroute
 * aus `content/zones/route.json` (15 Autorenwelten, dahinter die angedeutete Zone mit dem Torknoten). Das Pfadband ist
 * ±`bandHalfWidth` breit (verrauschter Rand); links und rechts davon liegen Seitenzellen (Voronoi in (v, z), v =
 * Abstand vom Bandrand). Jenseits der Route — seitlich, hinter dem Tor und vor dem Start — liegt überall die
 * angedeutete Welt `beyondWorld` (Nebelmeer, Silhouetten; Varianten kommen mit W2).
 *
 * Mit `procedural` (Lab `?prozedural=1`) gilt das alte Verhalten: prozedurale Pfadwelten hinter der Route, ein
 * prozedurales Vorland hinter dem Start, Seitenzellen mit Nachbar-Autorenwelten und weiter draußen prozeduralen Welten.
 *
 * Alles deterministisch aus dem Seed; beliebiger Zugriff (keine Abhängigkeit von vorherigen Abschnitten).
 */

/**
 * Weltkennungen: 0 … authored−1 Autorenwelten (Dateien); nur mit `procedural`: danach prozedurale Pfadwelten,
 * Seitenzellen und Vorland in eigenen Räumen.
 */
export const LATERAL_WORLD_BASE = 1 << 20;
export const PROLOGUE_WORLD_BASE = 1 << 21;
/**
 * Angedeutete Zonen (Route 15 + 1): Kennungsraum der Silhouetten-Varianten (W2). In W1 ist die angedeutete Welt die
 * Dateiwelt `beyondWorld` (w16) selbst; Varianten erhalten später `HINTED_WORLD_BASE + v`. Nur ohne `procedural`
 * (dort belegen die Seitenzellen denselben Raum).
 */
export const HINTED_WORLD_BASE = 1 << 20;
/** Höchstzahl der Hinted-Varianten im Kennungsraum (W2: ≤ 6). */
export const HINTED_VARIANT_LIMIT = 16;

/** Zustand eines Abschnitts der Route: spielbar oder angedeutet (gesperrt, „bald“). */
export type RouteEntryState = 'playable' | 'hinted';

/** Ein Abschnitt der Autorenroute (Welt und Anzahl Level), aufgelöst aus `content/zones/route.json`. */
export interface RouteEntry {
  world: number;
  levels: number;
  /** Länge entlang z (Welteinheiten); Standard `levels × nodeSpacing` (der Riesenbaum trägt 16 Level auf kurzer Strecke). */
  length?: number;
  /**
   * `hinted`: angedeutete Zone hinter der Route (Zone 16, gesperrt): Abschnitt, Levelnummern und Welt wie gehabt, aber
   * nicht in `authoredLevels` — ihr Knoten ist der Torknoten („bald“), das Wachstum ist dort voll. Ab dem ersten
   * angedeuteten Eintrag zählt keiner mehr mit. Standard `playable`.
   */
  state?: RouteEntryState;
  /** Der Abschnitt trägt den Riesenbaum (seine Level steigen Stamm und Krone hinauf). */
  tree?: true;
  /**
   * Makroform des Pfads (W3, `plane/macro.ts`): Mäander, Serpentine, Schnecke, Gratweg, Kletterweg. Ohne Form (und im
   * Riesenbaum-Abschnitt, in angedeuteten Abschnitten, im Vorland) läuft die Mittellinie auf dem Rückgrat.
   */
  shape?: RouteShape;
  shapeParams?: RouteShapeParams;
}

export interface LayoutParams {
  seed: number;
  /** Autorenroute (Level 1 … Summe). */
  route: RouteEntry[];
  /** Anzahl Autorenwelten (Kennungen 0 … authored−1); mit `procedural` beginnen danach die prozeduralen Pfadwelten. */
  authored: number;
  /**
   * Welt jenseits der Route: Seitenzellen, Abschnitte hinter dem Tor und vor dem Start (angedeutete Zone). Standard:
   * die Welt des letzten angedeuteten Abschnitts, sonst die des letzten Abschnitts.
   */
  beyondWorld?: number;
  /** Welten, die nie Nachbarwelt einer Seitenzelle werden (nur mit `procedural`; Weltdatei `lateral: false`). */
  noLateral?: readonly number[];
  /**
   * Altes Verhalten (Lab `?prozedural=1`): prozedurale Pfadwelten hinter der Route, prozedurales Vorland, Seitenzellen
   * mit Nachbar-Autorenwelten. Standard false: jenseits der Route nur `beyondWorld`, der Pfad endet am Torknoten.
   */
  procedural?: boolean;
  /** Abstand zweier Level entlang z (Standard 4.2 — wie der alte Spiralpfad). */
  nodeSpacing?: number;
  /** Level je prozeduraler Pfadwelt (Standard 10). */
  proceduralLevels?: number;
  /** Länge eines Vorland-Abschnitts hinter dem Start (Standard 52). */
  prologueLength?: number;
  /**
   * Halbe Breite des Pfadbands (Standard 30: breit genug, dass Wahrzeichen neben dem Pfad — Fels mit Wasserfall, Ruine,
   * 8–18 Einheiten vom Pfad, Kern ≈ 9 — ganz in der Pfadwelt stehen).
   */
  bandHalfWidth?: number;
  /** Zellmaß der Seitenwelten: quer (v) und längs (z). Standard 38 × 44. */
  cell?: { across: number; along: number };
  /**
   * Weltspezifikation je Kennung (Makroformen: Lage des Fokus-Elements und seiner Begleiter, Freiraum, Hügelstaffel des
   * Gratwegs). Ohne sie kennen die Makroformen keinen Fokus (Tests mit eigener Route).
   */
  specOf?: (world: number) => WorldSpec | undefined;
}

/** Nächster Punkt der Pfad-Mittellinie (`WorldLayout.pathNearest`): Abschnitt und Treffer. */
export interface PlanePathHit extends MacroHit {
  k: number;
}

export interface PathSegment {
  k: number;
  world: number;
  /** z-Bereich: der Abschnitt beginnt bei `zStart` und läuft nach `zEnd` (< zStart, vorwärts = −z). */
  zStart: number;
  zEnd: number;
  /** Erster Level (1-basiert) und Anzahl; Vorland und Abschnitte hinter dem Tor: 0 und 0. */
  firstLevel: number;
  levels: number;
  /** Angedeuteter Abschnitt (Torknoten-Zone, hinter dem Tor, vor dem Start; nie mit `procedural` außer Routeneinträgen). */
  hinted: boolean;
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
/** Abstand „keine Grenze in Reichweite“ (alle Nachbarregionen tragen dieselbe Welt). */
const NO_BORDER = 1e4;

export class WorldLayout {
  readonly seed: number;
  readonly nodeSpacing: number;
  readonly proceduralLevels: number;
  readonly prologueLength: number;
  readonly bandHalfWidth: number;
  readonly cellAcross: number;
  readonly cellAlong: number;
  readonly authored: number;
  /** Anzahl spielbarer Level der Autorenroute (bis zum ersten angedeuteten Eintrag) — `LEVEL_COUNT`. */
  readonly authoredLevels: number;
  /** Welt jenseits der Route (seitlich, hinter dem Tor, vor dem Start). */
  readonly beyondWorld: number;
  /** Altes Verhalten mit prozeduralen Welten (Lab-Flag). */
  readonly procedural: boolean;
  /**
   * Letzter Level auf der Route (1-basiert, der Torknoten eingeschlossen); mit `procedural` unbegrenzt (∞). Knoten
   * dahinter gibt es nicht: `PlanePath.node` klemmt darauf.
   */
  readonly lastLevel: number;
  /** Level des Torknotens (1-basiert: erster Level des ersten angedeuteten Abschnitts), `null` ohne Tor. */
  readonly gateLevel: number | null;
  /** Level des Riesenbaums [erster, letzter] (1-basiert) aus dem Eintrag mit `tree`, `null` ohne. */
  readonly treeRange: readonly [number, number] | null;
  /** Letzter Abschnitt mit Knoten (der Torabschnitt); mit `procedural` ∞. */
  readonly lastSegment: number;
  private readonly route: RouteEntry[];
  /** Welten der angedeuteten Abschnitte und `beyondWorld`. */
  private readonly hintedWorlds: Set<number>;
  private readonly lateralPool: number[];
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
  private readonly specOf: ((world: number) => WorldSpec | undefined) | null;
  private readonly macroCache = new Map<number, MacroLine>();

  constructor(params: LayoutParams) {
    this.specOf = params.specOf ?? null;
    this.seed = params.seed;
    this.nodeSpacing = params.nodeSpacing ?? 4.2;
    this.proceduralLevels = params.proceduralLevels ?? 10;
    this.prologueLength = params.prologueLength ?? 52;
    this.bandHalfWidth = params.bandHalfWidth ?? 30;
    this.cellAcross = params.cell?.across ?? 38;
    this.cellAlong = params.cell?.along ?? 44;
    this.authored = params.authored;
    this.procedural = params.procedural ?? false;
    this.route = params.route.length > 0 ? params.route : [{ world: 0, levels: 10 }];
    let s = 0;
    let level = 1;
    let playable = -1;
    let tree: [number, number] | null = null;
    let lastSegment = -1;
    for (const [k, r] of this.route.entries()) {
      if (r.state === 'hinted' && playable < 0) playable = level - 1;
      if (r.tree && !tree && r.levels > 0) tree = [level, level + r.levels - 1];
      if (r.levels > 0) lastSegment = k;
      this.starts.push(s);
      this.firstLevels.push(level);
      s += r.length ?? r.levels * this.nodeSpacing;
      level += r.levels;
    }
    this.starts.push(s);
    this.firstLevels.push(level);
    this.authoredLevels = playable >= 0 ? playable : level - 1;
    this.treeRange = tree;
    this.gateLevel = playable >= 0 && level - 1 > playable ? playable + 1 : null;
    this.lastLevel = this.procedural ? Number.POSITIVE_INFINITY : level - 1;
    this.lastSegment = this.procedural ? Number.POSITIVE_INFINITY : lastSegment;
    const lastHinted = [...this.route].reverse().find((r) => r.state === 'hinted');
    this.beyondWorld = params.beyondWorld ?? lastHinted?.world ?? this.route[this.route.length - 1]!.world;
    this.hintedWorlds = new Set([this.beyondWorld, ...this.route.filter((r) => r.state === 'hinted').map((r) => r.world)]);
    const noLateral = new Set(params.noLateral ?? []);
    this.lateralPool = [];
    for (let w = 0; w < this.authored; w++) if (!noLateral.has(w) && !this.hintedWorlds.has(w)) this.lateralPool.push(w);
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

  /** Anzahl der Routeneinträge (Abschnitte 0 … n−1; der letzte ist mit Tor der angedeutete Abschnitt). */
  get routeLength(): number {
    return this.route.length;
  }

  /** Routeneintrag des Abschnitts k (oder `undefined` außerhalb der Route). */
  routeEntry(k: number): RouteEntry | undefined {
    return k >= 0 ? this.route[k] : undefined;
  }

  /** Länge eines Abschnitts hinter der Route (prozedural: eine Pfadwelt; sonst wie das Vorland). */
  private get beyondLength(): number {
    return this.procedural ? this.proceduralLevels * this.nodeSpacing : this.prologueLength;
  }

  /** Abstand vom Start (z = 0) zum Beginn von Abschnitt k (Vorland: negativ). */
  segmentStart(k: number): number {
    const n = this.route.length;
    if (k < 0) return k * this.prologueLength;
    if (k <= n) return this.starts[k]!;
    return this.starts[n]! + (k - n) * this.beyondLength;
  }

  /** Welt des Abschnitts k (ohne Objekt; schnell für `sample`). */
  segmentWorld(k: number): number {
    const n = this.route.length;
    if (k < 0) return this.procedural ? PROLOGUE_WORLD_BASE + -k : this.beyondWorld;
    if (k < n) return this.route[k]!.world;
    return this.procedural ? this.authored + (k - n) : this.beyondWorld;
  }

  segment(k: number): PathSegment {
    const n = this.route.length;
    const d0 = this.segmentStart(k);
    const d1 = this.segmentStart(k + 1);
    const world = this.segmentWorld(k);
    let firstLevel = 0;
    let levels = 0;
    let hinted = !this.procedural;
    if (k >= 0 && k < n) {
      firstLevel = this.firstLevels[k]!;
      levels = this.route[k]!.levels;
      hinted = this.route[k]!.state === 'hinted';
    } else if (k >= n && this.procedural) {
      firstLevel = this.firstLevels[n]! + (k - n) * this.proceduralLevels;
      levels = this.proceduralLevels;
      hinted = false;
    }
    return { k, world, zStart: -d0, zEnd: -d1, firstLevel, levels, hinted };
  }

  /** Abschnitt, in dem die Entfernung d = −z vom Start liegt (ohne Grenzrauschen). */
  segmentAtDistance(d: number): number {
    const n = this.route.length;
    if (d < 0) return Math.floor(d / this.prologueLength);
    const end = this.starts[n]!;
    if (d >= end) return n + Math.floor((d - end) / this.beyondLength);
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.starts[mid]! <= d) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /**
   * Abschnitt mit dem Level (1-basiert). Ohne `procedural` gibt es hinter dem Torknoten keine Level: Levelnummern
   * jenseits des letzten liegen im letzten Abschnitt mit Knoten (geklemmt).
   */
  segmentOfLevel(level: number): number {
    const n = this.route.length;
    if (level < 1) return 0;
    if (level < this.firstLevels[n]!) {
      for (let k = n - 1; k >= 0; k--) if (level >= this.firstLevels[k]! && (this.route[k]!.levels > 0 || k === 0)) return k;
      return 0;
    }
    if (!this.procedural) return Math.max(0, this.lastSegment);
    return n + Math.floor((level - this.firstLevels[n]!) / this.proceduralLevels);
  }

  /** Angedeutete Welt (Zone 16, hinter dem Tor, seitlich; W2: Silhouetten-Varianten)? */
  isHinted(world: number): boolean {
    if (this.hintedWorlds.has(world)) return true;
    return !this.procedural && world >= HINTED_WORLD_BASE && world < HINTED_WORLD_BASE + HINTED_VARIANT_LIMIT;
  }

  // --- Makroform (W3) --------------------------------------------------------------------------------------

  /**
   * Makroform des Abschnitts k aus der Route, oder null (gerade auf dem Rückgrat): ohne `shape`, im Riesenbaum-Abschnitt,
   * in angedeuteten Abschnitten, ohne Level, im Vorland und hinter der Route.
   */
  shapeOf(k: number): { shape: RouteShape; params: RouteShapeParams } | null {
    if (k < 0 || k >= this.route.length) return null;
    const r = this.route[k]!;
    if (!r.shape || r.tree || r.state === 'hinted' || r.levels <= 0) return null;
    return { shape: r.shape, params: r.shapeParams ?? {} };
  }

  /**
   * Mittellinie des Pfads im Abschnitt k (`plane/macro.ts`, im Cache): beginnt und endet auf dem Rückgrat, Bogenlänge
   * `levels × nodeSpacing`. Ohne Makroform das Rückgrat selbst.
   */
  macro(k: number): MacroLine {
    const hit = this.macroCache.get(k);
    if (hit) return hit;
    const line = this.buildMacro(k);
    if (this.macroCache.size >= 96) {
      const oldest = this.macroCache.keys().next().value;
      if (oldest !== undefined) this.macroCache.delete(oldest);
    }
    this.macroCache.set(k, line);
    return line;
  }

  private buildMacro(k: number): MacroLine {
    const seg = this.segment(k);
    const backbone = (z: number): number => this.backbone(z);
    const band = (z: number): number => this.bandHalf(z);
    const sh = this.shapeOf(k);
    if (!sh) return macroCenterline(seg, backbone, band, this.seed, 'straight');
    const spec = this.specOf?.(seg.world);
    const focal = spec?.focal;
    const keepClear: MacroCircle[] = [];
    const spiralFocal = sh.shape === 'spiral' && (sh.params.centre ?? 'focal') === 'focal';
    let centreClear = 0;
    if (focal) {
      const r = focal.clearRadius ?? focalClearRadius(focal.kind, focal.scale ?? 1);
      if (spiralFocal) centreClear = r;
      else {
        // Fokus-Element und Begleiter bleiben frei (die Form wählt die Seite)
        const p = this.focalBase(k, focal.along, focal.lateral);
        if (r > 0) keepClear.push({ x: p.x, z: p.z, radius: r });
        for (const c of focal.companions ?? []) {
          const cr = c.clearRadius ?? focalClearRadius(c.kind, c.scale ?? 1);
          if (cr > 0) keepClear.push({ x: p.x + c.dx, z: p.z + c.dz, radius: cr });
        }
      }
    }
    const ridges = spec?.terrain.ridges;
    const crestAt = sh.shape === 'ridge' && ridges ? (x: number, z: number): number => ridgeTrainCrest(ridges, this.seed, x, z) : undefined;
    return macroCenterline(seg, backbone, band, this.seed, sh.shape, sh.params, {
      arc: seg.levels * this.nodeSpacing,
      keepClear,
      centreClear,
      ...(crestAt ? { crestAt } : {}),
    });
  }

  /** Fokus des Pfadabschnitts k am Rückgrat: `along` (0 … 1, geklemmt 0,1 … 0,9) und `lateral` (Standard ±10 aus dem Seed). */
  private focalBase(k: number, along: number | undefined, lateral: number | undefined): { x: number; z: number } {
    const seg = this.segment(k);
    const z = seg.zStart + (seg.zEnd - seg.zStart) * Math.min(0.9, Math.max(0.1, along ?? 0.5));
    const u = lateral ?? (hash2(k, 7, this.seed) < 0.5 ? -1 : 1) * 10;
    return { x: this.backbone(z) + u, z };
  }

  /**
   * Lage des Fokus-Elements im Pfadabschnitt k (Weltkomposition): das Zentrum der Schnecke, wenn der Abschnitt eine
   * Makroform `spiral` um den Fokus trägt, sonst `along`/`lateral` am Rückgrat (die Makroform hält es frei).
   */
  focalPoint(k: number, focal: { along?: number; lateral?: number }): { x: number; z: number } {
    const sh = this.shapeOf(k);
    if (sh && sh.shape === 'spiral' && (sh.params.centre ?? 'focal') === 'focal') {
      const c = this.macro(k).centre;
      if (c) return { x: c[0], z: c[1] };
    }
    return this.focalBase(k, focal.along, focal.lateral);
  }

  private readonly hitA = {} as MacroHit;

  /**
   * Nächster Punkt der Pfad-Mittellinie zu (x, z): gesucht in den Mittellinien des Abschnitts bei z und seiner Nachbarn
   * (die Makroformen bleiben im z-Bereich ihres Abschnitts).
   */
  pathNearest(x: number, z: number, out?: PlanePathHit): PlanePathHit {
    const o = out ?? ({} as PlanePathHit);
    const k0 = this.segmentAtDistance(-z);
    let best = Infinity;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const h = this.macro(k).nearest(x, z, this.hitA);
      if (h.d < best) {
        best = h.d;
        Object.assign(o, h);
        o.k = k;
      }
    }
    return o;
  }

  private readonly hitB = {} as PlanePathHit;

  /**
   * Abstand zur Pfad-Mittellinie (Makroform) — ersetzt den Abstand zum Rückgrat überall, wo Merkmale, Wahrzeichen und
   * Fokus-Elemente den Pfad meiden. Der Viterbi-Lauf schwingt bis ±`ROUTE_HALF_WIDTH` darum.
   */
  pathDistance(x: number, z: number): number {
    return this.pathNearest(x, z, this.hitB).d;
  }

  /** Seite eines Punkts zur Pfad-Mittellinie: +1 rechts der Laufrichtung, −1 links. */
  pathSide(x: number, z: number): number {
    return this.pathNearest(x, z, this.hitB).side;
  }

  /** Punkt und Normale (rechts der Laufrichtung) der Mittellinie des Abschnitts k beim Bogenanteil t (0 … 1). */
  pathPoint(k: number, t: number): { x: number; z: number; nx: number; nz: number } {
    const m = this.macro(k);
    return m.at(Math.min(1, Math.max(0, t)) * m.length);
  }

  /**
   * Äußerste seitliche Lage der Mittellinie auf der Seite `side` nahe z (Versatz zum Rückgrat, + = in Richtung `side`):
   * Merkmale „neben dem Pfad“ messen von hier (auch an Serpentinen und Schnecken vorbei). 0 ohne Mittellinie in der Nähe.
   */
  pathEnvelope(z: number, side: number, window = 4): number {
    const k0 = this.segmentAtDistance(-z);
    let best: number | null = null;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const e = this.macro(k).envelope(z, side, window);
      if (e !== null && (best === null || e > best)) best = e;
    }
    return best ?? 0;
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
   * Welt einer Seitenzelle: ohne `procedural` die angedeutete Welt `beyondWorld` (W2: Silhouetten-Varianten). Mit
   * `procedural` (altes Verhalten) im Autorenbereich der Route (erste zwei Spalten) eine der anderen Autorenwelten, sonst
   * eine eigene prozedurale Welt (eindeutige Kennung je Zelle — nie zweimal dieselbe).
   */
  cellWorld(c: number, j: number): number {
    if (!this.procedural) return this.beyondWorld;
    const key = `${c}:${j}`;
    const cached = this.cellWorldCache.get(key);
    if (cached !== undefined) return cached;
    const [, z] = this.site(c, j, this.siteTmp);
    const k = this.segmentAtDistance(-z);
    let world: number;
    const pathWorld = k >= 0 && k < this.route.length ? this.route[k]!.world : -1;
    const pool = this.lateralPool.filter((w) => w !== pathWorld);
    if (pathWorld >= 0 && Math.abs(c) <= 2 && pool.length > 1) {
      const salt = this.cellWorldSalt;
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
      // Nächste Grenze zu einer ANDEREN Welt (zwischen gleichen Welten — Torabschnitt und Zone dahinter, seitliche Zellen
      // der angedeuteten Welt — gibt es keinen Riss); Reihenfolge wie gehabt: Rand vor Anfang vor Ende
      let best = Infinity;
      let which = -1;
      let nb = region.world;
      const startW = this.segmentWorld(k - 1);
      const endW = this.segmentWorld(k + 1);
      if (startW !== region.world) {
        best = toStart;
        which = 1;
      }
      if (endW !== region.world && (which < 0 || toEnd < best)) {
        best = toEnd;
        which = 2;
      }
      if (which < 0 || toEdge < best) {
        // Welt jenseits des Bandrands: die Seitenzelle direkt daneben
        const lateral = this.procedural ? this.cellAt(u >= 0 ? 1 : -1, 0.01, z).region.world : this.beyondWorld;
        if (lateral !== region.world) {
          best = toEdge;
          which = 0;
          nb = lateral;
        }
      }
      if (which === 0) {
        o.border = Math.max(0, toEdge);
        o.borderId = -1;
        o.along = z;
        o.neighbor = nb;
      } else if (which === 1) {
        o.border = Math.max(0, toStart);
        o.borderId = k;
        o.along = x;
        o.neighbor = startW;
      } else if (which === 2) {
        o.border = Math.max(0, toEnd);
        o.borderId = k + 1;
        o.along = x;
        o.neighbor = endW;
      } else {
        o.border = NO_BORDER;
        o.borderId = -1;
        o.along = z;
        o.neighbor = region.world;
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
    // Welt jenseits des Bandrands: der Pfadabschnitt an dieser Stelle
    const bandWorld = this.segmentWorld(this.segmentAtDistance(d));
    const bandOther = bandWorld !== hit.region.world;
    const cellOther = hit.neighbor !== hit.region.world;
    if (bandOther && (toBand < hit.edge || !cellOther)) {
      o.border = Math.max(0, toBand);
      o.borderId = -1;
      o.along = z;
      o.neighbor = bandWorld;
    } else if (cellOther) {
      o.border = Math.max(0, hit.edge);
      o.borderId = -1;
      o.along = hit.along;
      o.neighbor = hit.neighbor;
    } else {
      o.border = NO_BORDER;
      o.borderId = -1;
      o.along = z;
      o.neighbor = hit.region.world;
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
