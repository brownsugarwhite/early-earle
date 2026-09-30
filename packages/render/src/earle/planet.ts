import { Box3, BufferAttribute, BufferGeometry, Frustum, Group, Matrix4, Mesh, Object3D, Quaternion, Sphere, Vector3, Vector4 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { abs, atan, attribute, float, fract, int, length, max, mix, modelWorldMatrix, normalGeometry, positionGeometry, positionLocal, positionView, select, sin, smoothstep, step, uniform, uniformArray, vec2, vec3, vec4 } from 'three/tsl';
import {
  CHUNK_SIZE,
  PlaneField,
  PlanePath,
  WorldCatalog,
  WorldLayout,
  generatePlaneChunk,
  isTreeKind,
  scatterPlaneProps,
  scatterPlaneTrees,
  type PlaneChunkMesh,
  type PlaneLandmarkParams,
  type PlaneLandmarkSlot,
  type PlanePathNode,
  type PlanePathProvider,
  type PlaneProp,
  type PlaneTree,
  type RegionFeatures,
  type RouteEntry,
  type Vec3,
  type WorldSpec,
} from '@ee/world';
import { DisplayMapping } from './display';
import { EarleMaterial } from './EarleMaterial';
import { PaletteAtlas, type WorldPalette, type WorldRows } from './palette';
import { GROWTH_SLOTS, PlanetVegetation, type VegetationPropEntry, type VegetationTreeEntry } from './planetVegetation';
import { proceduralPalette } from './proceduralPalette';
import type { ShadowFactorFn } from './trees/treeLayer';
import { PaletteLookup, aaStep, arrayElement, createFogSettings, patternTime, stripeMask, type FloatNode, type FogSettings, type TSLUniform, type UniformArrayLike, type Vec3Node, type Vec4Node } from './tsl';
import { createWaterMaterial } from './water/waterSurface';
import { buildWaterGeometry, waterGeometry, type WaterRegionInput } from './water/waterMesh';
import { buildRockGeometry, createRockMaterial, rockGeometry } from './landmarks/rocks';
import { BarnLandmarks } from './landmarks/barn';
import { DriftLandmarks, type DriftPlacement } from './landmarks/drifts';
import { PLANET_ATLAS_HEIGHT, SLOT_COUNT, SLOT_ROWS, WorldSlots, slotRows } from './worldSlots';

/** Bodenbehandlung je Welt (Terrain-Ornament): glatt, Schneelinien, Wiese, Perspektivlinien, Rampen, Schneegrate. */
export type GroundTreatment = 'smooth' | 'snowLines' | 'meadow' | 'floorLines' | 'ramps' | 'snowRidges';

/** Kameradistanz (Welteinheiten, Kamera → Blickpunkt), für die die Nebelwerte der Welten gesetzt sind. */
export const FOG_REFERENCE_DISTANCE = 9;

export interface WorldView {
  /** Kamerahöhe über dem Scheitel (Welteinheiten). */
  height: number;
  /** Kamera nach hinten (+z) vom Scheitel. */
  forward: number;
  /** Blickpunkt vor dem Scheitel (−z). */
  look: number;
  fov: number;
  /** Krümmungs-Boost 0..1 (ferne Erde sinkt zusätzlich ab). */
  curvature: number;
  /** Bildposition (NDC x, y) des Fokus-Elements: Drittellinien statt Bildmitte. */
  focus?: [number, number];
  /** Freiraum vor der Linse in Welteinheiten (Vegetation/Requisiten näher an der Kamera schrumpfen weg). */
  nearClear?: number;
  /** Lichtung unter der Kamera (seitlicher Radius, Welteinheiten): ruhiges unteres Bildband. */
  footClear?: number;
}

/** Eine Welt mit ihren Darstellungsdaten (Autorenwelt aus `content/`, oder prozedural erzeugt). */
export interface EarlePlanetWorld {
  id: string;
  name: string;
  palette: WorldPalette;
  params: WorldSpec;
  ground: GroundTreatment;
  /** Stärke der Nebelstreifen 0..1. */
  fogStripes: number;
  fog: { start: number; range: number };
  view: WorldView;
  /** Prozedural erzeugt (nur lesbar im Editor). */
  procedural?: boolean;
}

export interface EarlePlanetQuality {
  /** Gitterpunkte je Chunkseite in der Nähe (33 → 0,5 Einheiten). */
  chunkRes: number;
  /** Gitterpunkte je Chunkseite in der Ferne (Detailstufe 1). */
  lodRes?: number;
  dotsPerTree: [number, number];
  collapsePx: number;
  /** Multiplikator auf die Weltdichten (Bäume, Requisiten, Tiere). */
  densityScale: number;
  /** Nur die N kameranächsten Chunks bekommen Punkte. */
  nearChunks: number;
  capacity: { trees: number; dots: number; props: number; animals: number };
}

export interface EarlePlanetOptions {
  /** Anzeigeradius R der Kugel. */
  radius: number;
  seed: number;
  /** Autorenwelten (Kennungen 0 … n−1). */
  worlds: EarlePlanetWorld[];
  /** Autorenroute (Level 1 … Summe). */
  route: RouteEntry[];
  quality: EarlePlanetQuality;
  hillWavelength?: number;
  /**
   * Freihaltung um Knoten und Punkte (Streuung); `keepGround`: Knoten (0-basiert), die flacher Boden bleiben (z. B. die
   * Nachbarn des Riesenbaum-Abschnitts).
   */
  path: { clearNode: number; clearPath: number; keepGround?: readonly number[] };
  /** Chunks, die pro Frame höchstens erzeugt werden (zusätzlich gilt `loadBudgetMs`). */
  loadsPerFrame?: number;
  /** Zeitbudget je Frame für den Chunkbau (ms, Standard 7). */
  loadBudgetMs?: number;
  /** Frames, nach denen ein unsichtbarer Chunk entladen wird. */
  unloadAfterFrames?: number;
  /** Breite der Welt-Risse in Welteinheiten. */
  crackWidth?: number;
  /** Müll-Dichtefaktor (Startwelt). */
  trashScale?: number;
  /** Krümmungs-Boost der Anzeige (0 = reine Kugel). */
  curvature?: number;
  /** Ladeweite (Bogen auf der Ebene ab dem Fokus), Standard 0,62 π R. */
  viewRadius?: number;
  /**
   * Schatten des Sonnen-Rigs (Schatten v3): `factor` = glatter Schattenwert an einer Weltposition (Vertex-Stufe; die
   * Kronenpunkte skalieren damit im Schlagschatten aus 0).
   */
  shadow?: { factor?: ShadowFactorFn | null } | null;
}

/** Freihaltung längs des Levelpfads (Knoten und Punkte in der Ebene) je Rechteck. */
export interface PathCorridor {
  nodes: Array<[number, number]>;
  dots: Array<[number, number]>;
}

interface ChunkCpu {
  mesh: PlaneChunkMesh;
  trees: PlaneTree[];
  props: PlaneProp[];
  /** Knotenbereich [i0, i1] des Chunks für das Wachstum (−1: volles Wachstum). */
  nodeRange: [number, number];
}

interface LoadedChunk {
  key: string;
  cx: number;
  cz: number;
  res: number;
  cpu: ChunkCpu;
  mesh: Mesh;
  slot: number;
  lastSeen: number;
  /** Mittelpunkt (Ebene) und Radius für Kulling/Detailstufe. */
  centreY: number;
  radius: number;
}

/** Bodenornament je Behandlung (Wiese, Rampen und Schneegrate leben von Form und Bändern, nicht von Linien). */
const GROUND_KIND: Record<GroundTreatment, number> = { smooth: 0, meadow: 0, ramps: 0, snowRidges: 0, snowLines: 1, floorLines: 2 };
const DEFAULT_VIEW: WorldView = { height: 9, forward: 8, look: 4, fov: 70, curvature: 0 };
/** Periode (Welteinheiten) der Bodenornament-Koordinaten: Muster bleiben beim Umbruch des Fokus deckungsgleich. */
const PATTERN_PERIOD = 700;
const _v = new Vector3();
const _w = new Vector3();
const _c = new Vector3();
const _sphere = new Sphere();
const _q = new Quaternion();
const _q2 = new Quaternion();
const _s = new Vector3();
const _Y = new Vector3(0, 1, 0);

/**
 * Die unendliche Welt, angezeigt als Kugel (ADR 0002): Chunks 16 × 16 Einheiten der Ebene werden um den Fokus geladen
 * und entladen (deterministisch je Chunk, Detailstufe nach Abstand, Budget je Frame), jede Welt bekommt einen Slot
 * (Palettenzeilen, Tabellen), die Anzeige-Abbildung biegt jede Ebene-Position im Vertex-Shader auf die Kugel um den
 * Fokus. Pfadwelten entlang −z (01–10, dann prozedural), Nachbarwelten links und rechts, Risse zwischen den Welten,
 * Merkmale je Region, Vegetation in festen Pools, Wachstum je Chunk aus dem Pfadfortschritt, Himmel und Nebel folgen der
 * Welt unter dem Blickpunkt.
 *
 * `group` (Anzeigeraum) gehört in die Szene; `plane` (flacher Raum) trägt alle Ebeneninhalte — eigene Objekte über
 * `anchorObject(o, x, z)` (Position = Anker − Fokus, kleine Zahlen).
 */
export class EarlePlanet {
  readonly group = new Group();
  /** Flacher Raum: Ebeneninhalte (Position (0, R, 0); Kinder an Anker − Fokus). */
  readonly plane = new Group();
  readonly field: PlaneField;
  readonly layout: WorldLayout;
  readonly catalog: WorldCatalog;
  readonly mapping: DisplayMapping;
  /** Der Bodenpfad (Level-Knoten, Punkte, Lichtband) der Ebene. */
  readonly path: PlanePath;
  readonly atlas = new PaletteAtlas(PLANET_ATLAS_HEIGHT);
  readonly lookup: PaletteLookup;
  readonly slots: WorldSlots;
  /** Autorenwelten (Darstellung). */
  readonly worlds: EarlePlanetWorld[];
  readonly fog: FogSettings;
  readonly skyRowA: TSLUniform;
  readonly skyRowB: TSLUniform;
  readonly skyMix: TSLUniform;
  /** Stärke der Nebelstreifen der aktuellen Welt (0..1), für `FogStripes.strength`. */
  readonly stripeStrength = uniform(1);
  readonly vegetation: PlanetVegetation;
  /** Vereinigung der geladenen Chunks (flacher Raum) inkl. Vegetationshöhe. */
  readonly bounds = new Box3();
  readonly terrainBands = uniform(4);
  readonly canopyBands = uniform(3);
  /** Fokus der Anzeige (Ebene, doppelt genau). */
  readonly focus = { x: 0, z: 0 };
  /** Alle Felsen der aktiven Regionen in einem Mesh (ein Draw Call je Pass), null ohne Felsen. */
  rocks: Mesh | null = null;
  /** Alle Seen und Flüsse der aktiven Regionen in einem Mesh. */
  water: Mesh | null = null;
  /** Alle Scheunen (Fokus + gestreute) als eigene Wahrzeichen. */
  readonly barns: BarnLandmarks;
  /** Schneewehen am Baumfuß in den Schneewelten. */
  readonly drifts: DriftLandmarks;
  private readonly terrainMaterial: EarleMaterial;
  private readonly rockMaterial: EarleMaterial;
  private readonly waterMaterial: EarleMaterial;
  private readonly crackWidth: number;
  /** Pfadrisse mit Kennung < diesem Wert sind geschlossen. */
  private readonly crackOpenFrom = uniform(-1e6);
  private readonly loaded = new Map<string, LoadedChunk>();
  private readonly cache = new Map<string, ChunkCpu>();
  private readonly slotsUsed: Array<string | null> = new Array<string | null>(GROWTH_SLOTS).fill(null);
  private readonly loadsPerFrame: number;
  private readonly loadBudgetMs: number;
  private readonly unloadAfter: number;
  private readonly viewRadius: number;
  private progressDone = 0;
  private frame = 0;
  private nearKeys = '';
  private contentDirty = true;
  private lastRebuild = -1000;
  private trashScale: number;
  private readonly terrainGrowth = uniformArray(new Array<number>(GROWTH_SLOTS).fill(1), 'float');
  /** Welt-Tabellen je Slot (Terrain: Zeile, Bodenart, Linienstufe, Meißel; Wasser/Schnee/Fels). */
  private readonly slotA: { array: Vector4[] };
  private readonly slotB: { array: Vector4[] };
  /** Fokuspunkt je Slot im flachen Raum (Perspektivlinien des Juwelenwalds), je Frame nachgeführt. */
  private readonly slotFocus: { array: Vector4[] };
  private readonly slotFocusPlane: Array<[number, number] | null> = new Array<[number, number] | null>(SLOT_COUNT).fill(null);
  private readonly rockRows: UniformArrayLike;
  private readonly waterRows: UniformArrayLike;
  private readonly barnRows: UniformArrayLike;
  private readonly plainTerrainRows: UniformArrayLike;
  private readonly driftRows: UniformArrayLike;
  /** Fokus modulo PATTERN_PERIOD (Muster in Ebenenkoordinaten ohne Genauigkeitsverlust). */
  private readonly patternOrigin = uniform(new Vector3());
  private readonly anchors = new Map<Object3D, { x: number; z: number }>();
  private readonly worldCache = new Map<number, EarlePlanetWorld>();
  private readonly landmarks = new Map<string, Group>();
  /** Aktive Regionen (Felsen, Wasser) und ihr Schlüssel. */
  private activeRegionsKey = '';
  private featureVersion = -1;
  private readonly featureGrowth: UniformArrayLike;
  private featureRanges: Array<[number, number]> = [];
  private featureAnchor = { x: 0, z: 0 };
  private corridorFn: ((x0: number, z0: number, x1: number, z1: number) => PathCorridor) | null = null;
  /** Blick-Welt und Überblendung (Himmel/Nebel/Streifen). */
  private viewWorldA = 0;
  private viewWorldB = 0;
  private viewBlend = 0;
  private fogStart = 12;
  private fogRange = 22;
  private fogOffset = 0;
  /** Schleier über Nachbarwelten: zusätzliche Nebeldistanz (Welteinheiten) für alles, was nicht zur Blick-Welt gehört. */
  readonly veilDistance = uniform(24);
  private readonly veilSlotA = uniform(0);
  private readonly veilSlotB = uniform(0);
  private landmarkTop = 0;
  /** Chunk-Neubauten seit Beginn (Diagnose). */
  chunkBuilds = 0;
  /** Letzte Streaming-Kennzahlen (Diagnose, Tests). */
  readonly stats = { wanted: 0, loaded: 0, builtThisFrame: 0, buildMs: 0, visible: 0 };

  constructor(readonly options: EarlePlanetOptions) {
    if (options.worlds.length < 1) throw new Error('EarlePlanet needs worlds');
    this.group.name = 'EarlePlanet';
    this.plane.name = 'EarlePlane';
    this.plane.position.set(0, options.radius, 0);
    this.group.add(this.plane);
    this.loadsPerFrame = options.loadsPerFrame ?? 2;
    this.loadBudgetMs = options.loadBudgetMs ?? 7;
    this.unloadAfter = options.unloadAfterFrames ?? 45;
    this.crackWidth = options.crackWidth ?? 0.55;
    this.trashScale = options.trashScale ?? 1;
    this.viewRadius = options.viewRadius ?? 0.62 * Math.PI * options.radius;
    this.worlds = options.worlds;
    this.mapping = new DisplayMapping(options.radius, options.curvature ?? 0);

    // --- Datenmodell ------------------------------------------------------------------------------------------
    this.catalog = new WorldCatalog(
      options.worlds.map((w) => w.params),
      options.seed,
    );
    this.layout = new WorldLayout({ seed: options.seed, route: options.route, authored: options.worlds.length });
    this.field = new PlaneField({ seed: options.seed, layout: this.layout, catalog: this.catalog, ...(options.hillWavelength !== undefined ? { hillWavelength: options.hillWavelength } : {}) });
    this.path = new PlanePath(this.field, { seed: options.seed, provider: featureProvider(this.field), ...(options.path.keepGround ? { keepGround: options.path.keepGround } : {}) });

    // --- Welt-Slots: Palettenzeilen und Tabellen -------------------------------------------------------------
    this.lookup = new PaletteLookup(this.atlas.texture, this.atlas.width, this.atlas.height);
    this.slotA = uniformArray(Array.from({ length: SLOT_COUNT }, () => new Vector4(0, 0, 1, 0)), 'vec4') as unknown as { array: Vector4[] };
    this.slotB = uniformArray(Array.from({ length: SLOT_COUNT }, () => new Vector4(0, 0, 0, 0)), 'vec4') as unknown as { array: Vector4[] };
    this.slotFocus = uniformArray(Array.from({ length: SLOT_COUNT }, () => new Vector4(0, 0, 0, 0)), 'vec4') as unknown as { array: Vector4[] };
    const rowsBy = (pick: (r: WorldRows) => number): UniformArrayLike => uniformArray(Array.from({ length: SLOT_COUNT }, (_, s) => pick(slotRows(s))), 'float') as unknown as UniformArrayLike;
    this.rockRows = rowsBy((r) => r.rock);
    this.waterRows = rowsBy((r) => r.water);
    this.barnRows = rowsBy((r) => r.barn);
    this.plainTerrainRows = rowsBy((r) => r.terrain);
    this.driftRows = rowsBy((r) => r.snow);
    this.slots = new WorldSlots(this.atlas, (w) => this.worldData(w).palette, (slot, world) => this.onSlotAssigned(slot, world));
    const first = this.worldData(0);
    const firstSlot = this.slots.slotOf(0);
    const rows0 = this.slots.rowsOf(firstSlot);
    this.fogStart = first.fog.start;
    this.fogRange = first.fog.range;
    this.fog = createFogSettings({ row: rows0.fog, rowB: rows0.fog, steps: 5, start: this.fogStart, range: this.fogRange });
    this.skyRowA = uniform(rows0.sky);
    this.skyRowB = uniform(rows0.sky);
    this.skyMix = uniform(0);
    this.stripeStrength.value = first.fogStripes;

    const warp = (p: Vec3Node): Vec3Node => this.mapping.warp(p);

    // --- Terrainmaterial (geteilt) ----------------------------------------------------------------------------
    // Gepackte Vertex-Attribute (WebGPU ≤ 8 Puffer): ta = (eigener Slot, Slot², Slot lo, Slot hi),
    // tb = (Grenzabstand ± (lo +), Risskennung, Koordinate längs des Risses, Höhe 0..1),
    // tc = (Uferabstand, Schneefeld, Koordinate längs des Gewässers, Eis + 2·Sumpf), tg = Wachstums-Slot + Lippenseite/2
    const ta = attribute('ta', 'vec4');
    const tb = attribute('tb', 'vec4');
    const tg = attribute('tg', 'float');
    // Welt je Fragment: im Innern einer Welt (alle Ecken derselbe Slot, Varianz 0) der eigene Slot; an einer Grenze das
    // Paar der Grenze nach dem Vorzeichen des interpolierten Abstands — die Welt wechselt genau auf der Risslinie
    const own = ta.x;
    const variance = ta.y.sub(own.mul(own));
    const sd = tb.x;
    const pairSlot = select(sd.greaterThan(0), ta.z, ta.w);
    const slotF = select(variance.lessThan(0.02), own.add(0.5).floor(), pairSlot);
    const wa = vec4Element(this.slotA as unknown as UniformVec4ArrayLike, slotF);
    const wb = vec4Element(this.slotB as unknown as UniformVec4ArrayLike, slotF);
    const rowNode = wa.x;
    const border = abs(sd);
    const borderId = tb.y;
    const along = tb.z;
    const heightAttr = tb.w;
    // Risse als Earle-Spalten: Zickzack-Breite längs der Grenze, tiefe Tinte innen, eine helle Abbruchkante (Lippe)
    // auf einer Seite. Pfadrisse (Kennung ≥ 0) schließen sich mit dem Fortschritt; seitliche Risse sind schmaler und offen.
    const isPath = borderId.greaterThan(-0.5);
    const tri = abs(fract(along.mul(0.9)).mul(2).sub(1));
    const tri2 = abs(fract(along.mul(2.43).add(0.37)).mul(2).sub(1));
    const triW = abs(fract(along.mul(1.17)).mul(2).sub(1));
    const zoneW = select(borderId.lessThan(this.crackOpenFrom), float(0), float(this.crackWidth));
    const width = select(isPath, zoneW.mul(float(0.45).add(tri.mul(0.4)).add(tri2.mul(0.25))), float(0.32).mul(float(0.5).add(triW.mul(0.5))));
    const open = step(0.001, width);
    const crack = aaStep(width, border).oneMinus().mul(open);
    const lipOnLo = step(fract(tg), float(0.25));
    const onLo = step(0, sd);
    const lipSide = mix(onLo.oneMinus(), onLo, lipOnLo);
    const lip = aaStep(width, border).mul(aaStep(width.add(select(isPath, float(0.07), float(0.06))), border).oneMinus()).mul(open).mul(lipSide);
    const growthNode = (this.terrainGrowth as unknown as { element(i: unknown): FloatNode }).element(int(tg.floor()));

    // Bodenornament (nie Screen-Space): Schneelinien quer zum Blick (Linien gleicher z), Perspektivlinien (Strahlen +
    // Ringe um den Fokus der Welt, Bild 10). Koordinaten aus der flachen Position VOR der Anzeige-Abbildung (Ebene −
    // Fokus; `positionWorld` wäre hier schon die Kugel) plus Fokus modulo 700 (keine Sprünge beim Schwenken)
    const pw = (modelWorldMatrix as unknown as { mul(v: unknown): { xyz: Vec3Node } })
      .mul(vec4(positionGeometry, 1))
      .xyz.sub(vec3(0, this.mapping.radius, 0))
      .toVarying('vPlaneLocal') as unknown as Vec3Node;
    const pz = pw.z.add(this.patternOrigin.z);
    const drift = patternTime.mul(0.02);
    const kind = wa.y;
    const isSnow = kind.lessThan(1.5);
    const snowCoord = pz.div(0.7).add(drift);
    const focusS = vec4Element(this.slotFocus as unknown as UniformVec4ArrayLike, slotF);
    const dxy = vec2(pw.x.sub(focusS.x), pw.z.sub(focusS.y));
    const ang = length(dxy);
    const theta = atan(dxy.y, dxy.x);
    const flat = smoothstep(0.86, 0.97, normalGeometry.y);
    const lines = stripeMask(select(isSnow, snowCoord, theta.mul(36 / (Math.PI * 2))), select(isSnow, float(0.09), float(0.035))).mul(select(isSnow, float(1), smoothstep(0.48, 1.9, ang)));
    const rings = stripeMask(ang.div(2.4).add(drift), 0.035).mul(select(isSnow, float(0), float(1)));
    const mask = max(lines, rings).mul(flat).mul(select(kind.greaterThan(0.5).and(kind.lessThan(2.5)), float(1), float(0)));
    const patternColor = this.lookup.pal(wa.z, rowNode).rgb;
    const runsInShadow = kind.greaterThan(0.5).and(kind.lessThan(2.5));
    const patternShadow = mix(this.lookup.pal(0, rowNode).rgb, patternColor, select(runsInShadow, float(0.4), float(0)));

    // Geländemerkmale je Vertex: tc = (Uferabstand, Schneefeld, Koordinate längs des Gewässers, Eis/Sumpf)
    const tc = attribute('tc', 'vec4');
    // Schneefelder (Bild 05): Kante mit feiner organischer Welligkeit (Frequenzen ganzzahlig in 700 → periodisch)
    const po = pw.add(this.patternOrigin);
    const k = (f: number) => (Math.round((f * PATTERN_PERIOD) / (Math.PI * 2)) * Math.PI * 2) / PATTERN_PERIOD;
    const snowWob = sin(po.x.mul(k(1.9)).add(sin(po.z.mul(k(1.9 * 1.3))).mul(1.7)))
      .mul(0.035)
      .add(sin(po.y.mul(2.3 * 1.9).add(po.x.mul(k(0.7 * 1.9)))).mul(0.025));
    const snowField = { mask: aaStep(0, tc.y.add(snowWob)).mul(wb.z), row: wb.y, lift: float(0.08) };
    const chisel = wa.w;
    const contour = fract(heightAttr.mul(5.0).add(0.5)).sub(0.5).mul(0.34);

    this.terrainMaterial = new EarleMaterial({
      lookup: this.lookup,
      row: rows0.terrain,
      rowNode,
      fog: this.fog,
      bands: this.terrainBands,
      bandScale: 2.0,
      terminator: 0.02,
      lift: heightAttr.mul(0.45).add(contour.mul(chisel)),
      crackNode: crack,
      crackLipNode: lip,
      growthNode,
      pattern: { mask, color: patternColor, shadowColor: patternShadow },
      layers: [snowField],
      positionNode: warp(positionLocal as unknown as Vec3Node),
      fogDistNode: positionView.length().add(this.veilNode(slotF)),
    });

    // --- Felsen, Wasser, Scheunen, Schneewehen -----------------------------------------------------------------
    this.featureGrowth = uniformArray(new Array<number>(96).fill(1), 'float') as unknown as UniformArrayLike;
    const featureGrowth = (i: FloatNode): FloatNode => arrayElement(this.featureGrowth, i);
    const slotGrowth = (slot: FloatNode): FloatNode => (this.terrainGrowth as unknown as { element(i: unknown): FloatNode }).element(int(slot.add(0.5).floor()));
    this.rockMaterial = createRockMaterial({ lookup: this.lookup, fog: this.fog, bands: this.terrainBands, rockRows: this.rockRows, veil: (w) => this.veilNode(w), warp, growth: featureGrowth });
    this.waterMaterial = createWaterMaterial({ lookup: this.lookup, fog: this.fog, bands: this.terrainBands, waterRows: this.waterRows, veil: (w) => this.veilNode(w), warp, growth: featureGrowth });
    this.barns = new BarnLandmarks({ lookup: this.lookup, fog: this.fog, bands: this.terrainBands, barnRows: this.barnRows, terrainRows: this.plainTerrainRows, veil: (w) => this.veilNode(w), warp, capacity: 24, growth: slotGrowth });
    this.plane.add(this.barns.mesh);
    this.drifts = new DriftLandmarks({
      lookup: this.lookup,
      fog: this.fog,
      bands: this.canopyBands,
      snowRows: this.driftRows,
      veil: (w) => this.veilNode(w),
      warp,
      capacity: options.quality.capacity.trees > 1500 ? 700 : 360,
      growth: slotGrowth,
    });
    this.plane.add(this.drifts.mesh);

    // --- Vegetation ----------------------------------------------------------------------------------------------
    this.vegetation = new PlanetVegetation({
      lookup: this.lookup,
      fog: this.fog,
      bands: this.canopyBands,
      slots: this.slots,
      family: (world) => this.catalog.spec(world).vegetation,
      capacity: options.quality.capacity,
      dotsPerTree: options.quality.dotsPerTree,
      collapsePx: options.quality.collapsePx,
      seed: options.seed,
      warp,
      veil: (slot) => this.veilNode(slot),
      foreign: (slot) => this.foreignNode(slot),
      shadowFactor: options.shadow?.factor ?? null,
    });
    this.plane.add(this.vegetation.group);
    for (const o of [this.barns.mesh, this.drifts.mesh, this.vegetation.group]) this.anchorObject(o, 0, 0);
  }

  // --- Welten und Slots ------------------------------------------------------------------------------------------

  /** Darstellungsdaten einer Welt (Autorenwelt oder prozedural erzeugt, im Cache). */
  worldData(id: number): EarlePlanetWorld {
    if (id >= 0 && id < this.worlds.length) return this.worlds[id]!;
    let w = this.worldCache.get(id);
    if (!w) {
      w = proceduralWorld(id, this.worlds, this.catalog);
      if (this.worldCache.size > 256) {
        const oldest = this.worldCache.keys().next().value;
        if (oldest !== undefined) this.worldCache.delete(oldest);
      }
      this.worldCache.set(id, w);
    }
    return w;
  }

  /** Palettenzeilen einer Welt (belegt ihren Slot). */
  rowsOfWorld(world: number): WorldRows {
    return this.slots.rowsOfWorld(world);
  }

  /**
   * Welten, deren Slots ein anderer Konsument (Levelpfad, Müll) mit gebackenen Zeilen nutzt: bleiben belegt, solange
   * sie gemeldet sind (`null` gibt sie frei).
   */
  pinWorlds(key: string, worlds: Iterable<number> | null): void {
    if (worlds) this.extraPins.set(key, new Set(worlds));
    else this.extraPins.delete(key);
  }

  private readonly extraPins = new Map<string, Set<number>>();

  private onSlotAssigned(slot: number, world: number): void {
    const w = this.worldData(world);
    const rows = slotRows(slot);
    const spec = this.catalog.spec(world);
    const hasSnow = !!(w.palette.snow && spec.features?.snowFields);
    this.slotA.array[slot]!.set(rows.terrain, GROUND_KIND[w.ground], w.ground === 'floorLines' ? 4 : 1, Math.max(0, spec.features?.chisel ?? 0));
    this.slotB.array[slot]!.set(rows.water, w.palette.snow ? rows.snow : rows.terrain, hasSnow ? 1 : 0, rows.rock);
    // Fokus der Perspektivlinien: setzt `rebuildContent` aus der nächsten Region der Welt
    this.slotFocusPlane[slot] = null;
    this.slotFocus.array[slot]!.set(1e4, 1e4, 0, 0);
    this.vegetation?.onSlotAssigned(slot, world);
  }

  // --- Anker und Fokus -------------------------------------------------------------------------------------------

  /** Objekt im flachen Raum an einem Anker der Ebene führen (Position = Anker − Fokus; y bleibt). */
  anchorObject(object: Object3D, x: number, z: number): void {
    this.anchors.set(object, { x, z });
    object.position.x = x - this.focus.x;
    object.position.z = z - this.focus.z;
  }

  releaseObject(object: Object3D): void {
    this.anchors.delete(object);
  }

  /** Anker eines Objekts (Ebene) oder null. */
  anchorOf(object: Object3D): { x: number; z: number } | null {
    return this.anchors.get(object) ?? null;
  }

  /** Fokus der Anzeige setzen (Ebene): alle verankerten Objekte rücken nach. */
  setFocus(x: number, z: number): void {
    if (x === this.focus.x && z === this.focus.z) return;
    this.focus.x = x;
    this.focus.z = z;
    for (const [o, a] of this.anchors) {
      o.position.x = a.x - x;
      o.position.z = a.z - z;
    }
    this.patternOrigin.value.set(mod(x, PATTERN_PERIOD), 0, mod(z, PATTERN_PERIOD));
    this.syncSlotFocus();
  }

  private syncSlotFocus(): void {
    for (let s = 0; s < SLOT_COUNT; s++) {
      const f = this.slotFocusPlane[s];
      if (f) this.slotFocus.array[s]!.set(f[0] - this.focus.x, f[1] - this.focus.z, 0, 0);
    }
  }

  /** Ebene-Punkt (x, h, z) → flacher Raum (relativ zum Fokus, Höhe + R). */
  toFlat(p: Vec3 | Vector3, out = new Vector3()): Vector3 {
    const x = Array.isArray(p) ? p[0] : (p as Vector3).x;
    const y = Array.isArray(p) ? p[1] : (p as Vector3).y;
    const z = Array.isArray(p) ? p[2] : (p as Vector3).z;
    return out.set(x - this.focus.x, this.options.radius + y, z - this.focus.z);
  }

  /** Ebene-Punkt (x, h, z) → Anzeigeraum (Szene). */
  toDisplay(p: Vec3 | Vector3, out = new Vector3()): Vector3 {
    this.toFlat(p, out);
    return this.mapping.toDisplayCpu(out, out);
  }

  /** Anzeigeraum → Ebene (x, h, z). */
  fromDisplay(p: Vector3, out = new Vector3()): Vector3 {
    this.mapping.toFlatCpu(p, out);
    return out.set(out.x + this.focus.x, out.y - this.options.radius, out.z + this.focus.z);
  }

  /** Starrer Anzeige-Rahmen an einem Ebene-Punkt (Held, Brett, Schienen): Position und Drehung. */
  displayFrame(p: Vec3 | Vector3, outPos: Vector3, outQuat: Quaternion): void {
    this.toFlat(p, _w);
    this.mapping.rotationAt(_w, outQuat);
    this.mapping.toDisplayCpu(_w, outPos);
  }

  get curvature(): { value: number } {
    return this.mapping.curvature;
  }

  // --- Pfadkorridor ---------------------------------------------------------------------------------------------

  /**
   * Freihaltung längs des Levelpfads (Bäume, Requisiten, Müll): Standard = Bodenpfad; der Flow ersetzt ihn durch den
   * endgültigen Pfad (Riesenbaum-Abschnitt). Streuungen werden neu gebaut.
   */
  setPathCorridor(fn: ((x0: number, z0: number, x1: number, z1: number) => PathCorridor) | null): void {
    this.corridorFn = fn;
    this.cache.clear();
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    this.contentDirty = true;
  }

  /** Knoten und Punkte des Bodenpfads in einem Rechteck (Ebene). */
  groundCorridor(x0: number, z0: number, x1: number, z1: number): PathCorridor {
    const out: PathCorridor = { nodes: [], dots: [] };
    const k0 = this.layout.segmentAtDistance(-z1) - 1;
    const k1 = this.layout.segmentAtDistance(-z0) + 1;
    for (let k = Math.max(0, k0); k <= k1; k++) {
      const seg = this.path.segment(k);
      for (const n of seg.nodes) if (n.position[0] >= x0 && n.position[0] <= x1 && n.position[2] >= z0 && n.position[2] <= z1) out.nodes.push([n.position[0], n.position[2]]);
      for (const d of seg.dots) if (d.position[0] >= x0 && d.position[0] <= x1 && d.position[2] >= z0 && d.position[2] <= z1) out.dots.push([d.position[0], d.position[2]]);
    }
    return out;
  }

  // --- Fortschritt, Wachstum ------------------------------------------------------------------------------------

  /** Knotenindex (0-basiert, gebrochen) an einer z-Koordinate aus der Weltenlage (ohne Pfad zu bauen). */
  nodeIndexAtZ(z: number): number {
    const k = this.layout.segmentAtDistance(-z);
    const seg = this.layout.segment(k);
    if (seg.levels <= 0) return -1;
    const f = (seg.zStart - z) / Math.max(1e-6, seg.zStart - seg.zEnd);
    return seg.firstLevel - 1 + f * seg.levels - 0.5;
  }

  private nodeRangeFor(z0: number, z1: number): [number, number] {
    const reach = 12;
    const a = this.nodeIndexAtZ(z1 + reach);
    const b = this.nodeIndexAtZ(z0 - reach);
    // Jenseits der Autorenlevel (Zukunft) und vor dem Start (Vorland): volles Wachstum (−1)
    const last = this.layout.authoredLevels - 1;
    if (Math.min(a, b) > last + 0.5 || Math.max(a, b) < -0.5) return [-1, -1];
    return [Math.max(0, Math.floor(Math.min(a, b))), Math.min(last, Math.ceil(Math.max(a, b)))];
  }

  private growthOf(range: [number, number]): number {
    const [i0, i1] = range;
    if (i0 < 0) return 1;
    return Math.min(1, Math.max(0, (this.progressDone - i0 + 1) / (i1 - i0 + 2)));
  }

  /** Fortschritt: Knoten < `done` sind geschafft → Wachstum je Chunk entlang des Pfads. */
  setProgress(done: number): void {
    this.progressDone = Math.max(0, done);
    for (const chunk of this.loaded.values()) this.applyGrowth(chunk);
    this.applyFeatureGrowth();
  }

  get progress(): number {
    return this.progressDone;
  }

  private applyGrowth(chunk: LoadedChunk): void {
    const g = this.growthOf(chunk.cpu.nodeRange);
    this.vegetation.setSlotGrowth(chunk.slot, g);
    (this.terrainGrowth as unknown as { array: number[] }).array[chunk.slot] = g;
  }

  private applyFeatureGrowth(): void {
    const arr = this.featureGrowth.array;
    this.featureRanges.forEach((r, i) => {
      if (i < arr.length) arr[i] = this.growthOf(r);
    });
  }

  /** Müll-Dichte (Startwelt) ändern: Chunks werden neu gestreut. */
  setTrashScale(scale: number): void {
    if (Math.abs(scale - this.trashScale) < 1e-6) return;
    this.trashScale = scale;
    this.cache.clear();
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    this.contentDirty = true;
  }

  /** Pfadrisse mit Kennung < k schließen (k = Abschnitt; −∞ = alle offen). */
  setCracksClosedBelow(k: number): void {
    this.crackOpenFrom.value = k;
  }

  /** Alte Schnittstelle (Lab): `closed` schließt alle Pfadrisse bis zur Grenze nach Abschnitt `border`. */
  setCrackClosed(border: number, closed: boolean): void {
    this.crackOpenFrom.value = closed ? Math.max(this.crackOpenFrom.value, border + 1) : Math.min(this.crackOpenFrom.value, border);
  }

  // --- Blick-Welt: Himmel, Nebel, Schleier -------------------------------------------------------------------------

  get viewWorld(): number {
    return this.viewWorldB;
  }

  get viewBlending(): boolean {
    return this.viewBlend < 1;
  }

  /** Blickpunkt in der Ebene → Welt darunter → Himmel/Nebel/Streifen überblenden. */
  setViewPoint(x: number, z: number, immediate = false): void {
    this.setViewWorld(this.field.worldAt(x, z), immediate);
  }

  /**
   * Welt unter dem Blickpunkt setzen: überblendet (0,6 s) von der vorigen; `immediate` (Start, Schnitt) setzt ohne
   * Überblendung. Der allererste Aufruf ist immer sofort (kein Start aus einer fremden Welt).
   */
  setViewWorld(world: number, immediate = false): void {
    if (world === this.viewWorldB && (!immediate || this.viewBlend >= 1)) return;
    if (immediate || !this.viewSet) {
      this.viewSet = true;
      this.viewWorldA = world;
      this.viewWorldB = world;
      this.viewBlend = 1;
      this.skyMix.value = 0;
      this.fog.mix.value = 0;
      const w = this.worldData(world);
      this.stripeStrength.value = w.fogStripes;
      this.fogStart = w.fog.start;
      this.fogRange = w.fog.range;
      this.applyFog();
      this.applyViewRows();
      return;
    }
    if (this.viewBlend >= 0.5) this.viewWorldA = this.viewWorldB;
    this.viewWorldB = world;
    this.viewBlend = 0;
    this.applyViewRows();
  }

  private viewSet = false;

  private applyViewRows(): void {
    const a = this.slots.rowsOfWorld(this.viewWorldA);
    const b = this.slots.rowsOfWorld(this.viewWorldB);
    this.skyRowA.value = a.sky;
    this.skyRowB.value = b.sky;
    this.fog.row.value = a.fog;
    this.fog.rowB.value = b.fog;
    this.veilSlotA.value = this.slots.slotOf(this.viewWorldA);
    this.veilSlotB.value = this.slots.slotOf(this.viewWorldB);
  }

  private foreignNode(slot: FloatNode): FloatNode {
    const foreignA = step(0.5, abs(slot.sub(this.veilSlotA)));
    const foreignB = step(0.5, abs(slot.sub(this.veilSlotB)));
    return mix(foreignA, foreignB, this.fog.mix).mul(step(0.01, this.veilDistance));
  }

  private veilNode(slot: FloatNode): FloatNode {
    return this.foreignNode(slot).mul(this.veilDistance);
  }

  /** Überblendung vorantreiben (einmal pro Frame). */
  tickView(dt: number): void {
    const wa = this.worldData(this.viewWorldA);
    const wb = this.worldData(this.viewWorldB);
    if (this.viewBlend < 1) {
      this.viewBlend = Math.min(1, this.viewBlend + dt / 0.6);
      const t = smooth01(this.viewBlend);
      this.skyMix.value = t;
      this.fog.mix.value = t;
      this.stripeStrength.value = wa.fogStripes + (wb.fogStripes - wa.fogStripes) * t;
      this.fogStart = wa.fog.start + (wb.fog.start - wa.fog.start) * t;
      this.fogRange = wa.fog.range + (wb.fog.range - wa.fog.range) * t;
      this.applyFog();
      if (this.viewBlend >= 1) {
        this.viewWorldA = this.viewWorldB;
        this.applyViewRows();
        this.skyMix.value = 0;
        this.fog.mix.value = 0;
      }
    }
  }

  /** Nebel für die Kameradistanz nachführen (Weltwerte gelten für ≈ 9 Einheiten Abstand). */
  setFogDistance(lookDistance: number): void {
    const offset = Math.max(0, lookDistance - FOG_REFERENCE_DISTANCE);
    if (Math.abs(offset - this.fogOffset) < 1e-3) return;
    this.fogOffset = offset;
    this.applyFog();
  }

  private applyFog(): void {
    this.fog.start.value = this.fogStart + this.fogOffset;
    this.fog.invRange.value = 1 / Math.max(1, this.fogRange);
  }

  // --- Gelände-Abfragen (Ebene) -----------------------------------------------------------------------------------

  heightAt(x: number, z: number): number {
    return this.field.heightAt(x, z);
  }

  /** Begehbare Höhe (Gelände oder Felsdeckfläche). */
  walkableHeight(x: number, z: number): number {
    return this.field.surfaceHeightAt(x, z);
  }

  surfaceAt(x: number, z: number, outPos: Vec3, outNormal: Vec3): number {
    return this.field.surfaceAt(x, z, outPos, outNormal);
  }

  isWater(x: number, z: number, margin = 0): boolean {
    return this.field.isWater(x, z, margin);
  }

  worldAt(x: number, z: number): number {
    return this.field.worldAt(x, z);
  }

  /** Höhe der höchsten Werfer über dem Boden (Schattenkamera). */
  get hTotal(): number {
    return Math.max(this.field.hMax + this.vegetation.hMax + 1, this.field.hMax + this.landmarkTop + 1, 9);
  }

  // --- Wahrzeichen (Riesenbaum usw.) ---------------------------------------------------------------------------

  /** Externes Wahrzeichen setzen (z. B. der Riesenbaum); betroffene Chunks werden neu gestreut. */
  setLandmark(params: PlaneLandmarkParams): PlaneLandmarkSlot {
    const slot = this.field.setLandmark(params);
    this.cache.clear();
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    this.path.invalidate();
    this.contentDirty = true;
    return slot;
  }

  getLandmarkSlot(id: string): PlaneLandmarkSlot | undefined {
    return this.field.getLandmark(id);
  }

  /**
   * Setzt ein Objekt auf einen externen Slot: ein Halter (verankert am Slot) trägt Höhe, Drehung und Maßstab, das
   * Objekt bleibt frei. Liefert den Halter (Matrix = Slot-Raum → flacher Raum).
   */
  addLandmark(object: Object3D, slotId: string): Group | null {
    const slot = this.getLandmarkSlot(slotId);
    if (!slot) return null;
    const holder = new Group();
    holder.name = `landmark-${slot.id}`;
    holder.position.y = slot.position[1];
    holder.quaternion.setFromAxisAngle(_Y, (slot.yawDeg * Math.PI) / 180);
    holder.scale.setScalar(slot.scale);
    holder.add(object);
    this.plane.add(holder);
    this.anchorObject(holder, slot.position[0], slot.position[2]);
    this.landmarks.set(slot.id, holder);
    return holder;
  }

  /** Matrix Slot-Raum (Fuß im Ursprung, +Y oben, gedreht um yaw, skaliert) → Ebene (absolut). */
  landmarkMatrix(slot: PlaneLandmarkSlot, out = new Matrix4()): Matrix4 {
    _q.setFromAxisAngle(_Y, (slot.yawDeg * Math.PI) / 180);
    return out.compose(_c.set(slot.position[0], slot.position[1], slot.position[2]), _q, _s.setScalar(slot.scale));
  }

  removeLandmark(slotId: string): void {
    const o = this.landmarks.get(slotId);
    if (o) {
      o.removeFromParent();
      this.releaseObject(o);
      this.landmarks.delete(slotId);
    }
  }

  // --- Streaming -------------------------------------------------------------------------------------------------

  /**
   * Sichtbarkeit prüfen, Chunks laden/entladen (Budget), Detailstufe, Vegetationspools bei Bedarf neu füllen. Kamera in
   * Weltkoordinaten (Anzeigeraum). Liefert true, wenn sich Inhalt geändert hat (Schattenpass nachziehen).
   */
  update(camera: Camera, cameraWorld: Vector3, frustum: Frustum): boolean {
    this.frame++;
    const R = this.options.radius;
    const t0 = performance.now();
    // Kamerafußpunkt in der Ebene und Horizont
    this.mapping.toFlatCpu(cameraWorld, _v);
    const camX = _v.x + this.focus.x;
    const camZ = _v.z + this.focus.z;
    const camDist = cameraWorld.length();
    const horizon = Math.acos(Math.min(1, R / Math.max(R + 0.01, camDist)));
    const camDir = _c.copy(cameraWorld).normalize();
    const camAlpha = Math.hypot(_v.x, _v.z) / R;
    const reach = Math.min(this.viewRadius, (horizon + camAlpha + 0.35) * R + CHUNK_SIZE);
    const limit = Math.cos(Math.min(Math.PI, horizon + (CHUNK_SIZE * 0.75) / R + 0.12));
    const half = CHUNK_SIZE / 2;
    const cx0 = Math.floor((this.focus.x - reach) / CHUNK_SIZE);
    const cx1 = Math.floor((this.focus.x + reach) / CHUNK_SIZE);
    const cz0 = Math.floor((this.focus.z - reach) / CHUNK_SIZE);
    const cz1 = Math.floor((this.focus.z + reach) / CHUNK_SIZE);
    const wanted: Array<{ key: string; cx: number; cz: number; dist: number; visible: boolean; res: number }> = [];
    const hTop = this.field.hMax + 6;
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const mx = cx * CHUNK_SIZE + half;
        const mz = cz * CHUNK_SIZE + half;
        const fd = Math.hypot(mx - this.focus.x, mz - this.focus.z);
        if (fd > reach + half * Math.SQRT2) continue;
        // Anzeige-Kugel des Chunks (Mitte, halbe Höhe)
        _w.set(mx - this.focus.x, R + hTop * 0.4, mz - this.focus.z);
        this.mapping.toDisplayCpu(_w, _w);
        const facing = _w.clone().normalize().dot(camDir);
        if (facing < limit) continue;
        _sphere.center.copy(_w);
        _sphere.radius = half * Math.SQRT2 + hTop * 0.6;
        const visible = frustum.intersectsSphere(_sphere);
        // Chunks knapp außerhalb des Bildes bleiben geladen (Schattenwerfer, sanftes Schwenken)
        const camD = Math.hypot(mx - camX, mz - camZ);
        if (!visible && camD > 30) continue;
        const res = camD < 34 ? this.options.quality.chunkRes : (this.options.quality.lodRes ?? Math.max(9, Math.round((this.options.quality.chunkRes - 1) / 2) + 1));
        wanted.push({ key: `${cx}:${cz}`, cx, cz, dist: camD, visible, res });
      }
    }
    wanted.sort((a, b) => a.dist - b.dist);
    this.stats.wanted = wanted.length;
    this.viewChunkList = wanted.filter((w) => w.visible).map((w) => ({ cx: w.cx, cz: w.cz, dist: w.dist }));

    let changed = false;
    let loads = 0;
    let buildMs = 0;
    const firstFill = this.loaded.size === 0;
    for (const w of wanted) {
      const chunk = this.loaded.get(w.key);
      if (chunk && chunk.res === w.res) {
        chunk.lastSeen = this.frame;
        continue;
      }
      const over = !firstFill && (loads >= this.loadsPerFrame || performance.now() - t0 > this.loadBudgetMs);
      if (over) {
        if (chunk) chunk.lastSeen = this.frame; // alte Detailstufe bleibt, bis die neue gebaut ist
        continue;
      }
      const b0 = performance.now();
      if (this.loadChunk(w.cx, w.cz, w.key, w.res, chunk ?? null)) {
        loads++;
        changed = true;
      }
      buildMs += performance.now() - b0;
    }
    for (const chunk of [...this.loaded.values()]) {
      if (this.frame - chunk.lastSeen > this.unloadAfter) {
        this.unloadChunk(chunk);
        changed = true;
      }
    }
    this.stats.builtThisFrame = loads;
    this.stats.buildMs = buildMs;
    this.stats.loaded = this.loaded.size;

    // Nahe Chunks (Punkte): die N geladenen mit dem kleinsten Abstand zur Kamera
    const near = wanted
      .filter((w) => this.loaded.has(w.key))
      .slice(0, this.options.quality.nearChunks)
      .map((w) => w.key)
      .sort()
      .join('|');
    if (near !== this.nearKeys) {
      this.nearKeys = near;
      changed = true;
    }
    if (changed) this.contentDirty = true;
    const pending = wanted.some((w) => !this.loaded.has(w.key));
    let rebuilt = false;
    if (this.contentDirty && (!pending || this.lastRebuild < 0 || this.frame - this.lastRebuild >= 6)) {
      this.rebuildContent();
      this.contentDirty = false;
      this.lastRebuild = this.frame;
      rebuilt = true;
    }
    // Kugel der Chunks im Anzeigeraum (Haupt- und Schattenpass: three kullt mit der Geometrie-Kugel)
    let visibleCount = 0;
    for (const chunk of this.loaded.values()) if (this.updateChunkBounds(chunk, frustum)) visibleCount++;
    this.stats.visible = visibleCount;
    // Welten der geladenen Chunks und des Inhalts bleiben belegt
    const inUse = new Set<number>();
    for (const chunk of this.loaded.values()) for (const w of chunk.cpu.mesh.worlds) inUse.add(w);
    inUse.add(this.viewWorldA);
    inUse.add(this.viewWorldB);
    for (const set of this.extraPins.values()) for (const w of set) inUse.add(w);
    this.slots.pin(inUse);
    this.mapping.toFlatCpu(cameraWorld, _v);
    this.vegetation.updateCamera(camera, _v.sub(this.vegetation.group.position).sub(this.plane.position));
    return rebuilt;
  }

  /** Grenzkugel eines Chunks im Anzeigeraum in seinem Objektraum (three kullt damit); liefert „im Bild“. */
  private updateChunkBounds(chunk: LoadedChunk, frustum: Frustum): boolean {
    const R = this.options.radius;
    const half = CHUNK_SIZE / 2;
    const m = chunk.cpu.mesh;
    const fx = m.ox + half - this.focus.x;
    const fz = m.oz + half - this.focus.z;
    const cy = (m.minH + m.maxH) * 0.5;
    _w.set(fx, R + cy, fz);
    this.mapping.toDisplayCpu(_w, _v);
    const g = chunk.mesh.geometry;
    const bs = g.boundingSphere ?? (g.boundingSphere = new Sphere());
    // Kugel im Objektraum: Anzeigemitte minus Objektposition (flacher Raum), Radius deckt auch die flache Lage (Schattenpass)
    const ox = chunk.mesh.position.x;
    const oz = chunk.mesh.position.z;
    bs.center.set(_v.x - ox, _v.y - R, _v.z - oz);
    const shift = _v.distanceTo(_w);
    bs.radius = half * Math.SQRT2 + (m.maxH - m.minH) * 0.5 + 1.5 + shift;
    _sphere.center.copy(_v);
    _sphere.radius = half * Math.SQRT2 + (m.maxH - m.minH) * 0.5 + 1.5;
    return frustum.intersectsSphere(_sphere);
  }

  private loadChunk(cx: number, cz: number, key: string, res: number, replaces: LoadedChunk | null): boolean {
    const slot = replaces ? replaces.slot : this.slotsUsed.indexOf(null);
    if (slot < 0) return false;
    const cacheKey = `${key}:${res}`;
    let cpu = this.cache.get(cacheKey);
    if (!cpu) {
      cpu = this.buildChunk(cx, cz, res);
      this.chunkBuilds++;
      this.cache.set(cacheKey, cpu);
      if (this.cache.size > 120) {
        for (const k of this.cache.keys()) {
          const base = k.slice(0, k.lastIndexOf(':'));
          if (!this.loaded.has(base)) {
            this.cache.delete(k);
            break;
          }
        }
      }
    }
    if (replaces) this.disposeChunkMesh(replaces);
    const m = cpu.mesh;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(m.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(m.normals, 3));
    const n = m.vertexCount;
    const ta = new Float32Array(n * 4);
    const tb = new Float32Array(n * 4);
    const tc = new Float32Array(n * 4);
    const tg = new Float32Array(n);
    const slotCache = new Map<number, number>();
    const slotOf = (w: number): number => {
      let s = slotCache.get(w);
      if (s === undefined) {
        s = this.slots.slotOf(w);
        slotCache.set(w, s);
      }
      return s;
    };
    for (let k = 0; k < n; k++) {
      const own = slotOf(m.own[k]!);
      ta[k * 4] = own;
      ta[k * 4 + 1] = own * own;
      ta[k * 4 + 2] = slotOf(m.lo[k]!);
      ta[k * 4 + 3] = slotOf(m.hi[k]!);
      tb[k * 4] = m.sd[k]!;
      tb[k * 4 + 1] = m.borderId[k]!;
      tb[k * 4 + 2] = m.along[k]!;
      tb[k * 4 + 3] = m.heightNorm[k]!;
      tc[k * 4] = m.feature[k * 4]!;
      tc[k * 4 + 1] = m.feature[k * 4 + 1]!;
      tc[k * 4 + 2] = m.feature[k * 4 + 2]!;
      tc[k * 4 + 3] = m.feature[k * 4 + 3]! + 2 * m.swamp[k]!;
      // Lippe: Pfadrisse auf der Seite des nächsten Abschnitts (größere Kennung = weiter vorn), seitliche auf der Bandseite
      tg[k] = slot + (this.lipOnLo(m, k) ? 0 : 0.5);
    }
    geometry.setAttribute('ta', new BufferAttribute(ta, 4));
    geometry.setAttribute('tb', new BufferAttribute(tb, 4));
    geometry.setAttribute('tc', new BufferAttribute(tc, 4));
    geometry.setAttribute('tg', new BufferAttribute(tg, 1));
    geometry.setIndex(new BufferAttribute(m.indices, 1));
    geometry.boundingSphere = new Sphere();
    const mesh = new Mesh(geometry, this.terrainMaterial);
    mesh.name = `chunk-${key}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.userData.shadowGround = true;
    this.plane.add(mesh);
    this.anchorObject(mesh, m.ox, m.oz);
    const chunk: LoadedChunk = { key, cx, cz, res, cpu, mesh, slot, lastSeen: this.frame, centreY: (m.minH + m.maxH) * 0.5, radius: CHUNK_SIZE * 0.72 };
    this.slotsUsed[slot] = key;
    this.loaded.set(key, chunk);
    this.applyGrowth(chunk);
    return true;
  }

  /** Lippenseite eines Vertex: true = auf der lo-Seite der Grenze. */
  private lipOnLo(m: PlaneChunkMesh, k: number): boolean {
    const lo = m.lo[k]!;
    const hi = m.hi[k]!;
    const id = m.borderId[k]!;
    const own = m.own[k]!;
    if (lo === hi) return true;
    if (id >= 0) {
      // Lippe auf der Seite des Abschnitts id (der hintere Abschnitt endet an der Grenze, die Kante zeigt zur Kamera)
      const ahead = this.layout.segment(id).world;
      const selfIsAhead = own === ahead;
      const selfIsLo = own === lo;
      return selfIsAhead ? selfIsLo : !selfIsLo;
    }
    // seitlich: auf der Seite der Welt näher am Pfad (Pfadregion oder die innere Zelle)
    return m.sd[k]! >= 0;
  }

  private disposeChunkMesh(chunk: LoadedChunk): void {
    chunk.mesh.removeFromParent();
    chunk.mesh.geometry.dispose();
    this.releaseObject(chunk.mesh);
  }

  private unloadChunk(chunk: LoadedChunk): void {
    this.disposeChunkMesh(chunk);
    this.slotsUsed[chunk.slot] = null;
    this.loaded.delete(chunk.key);
  }

  private buildChunk(cx: number, cz: number, res: number): ChunkCpu {
    const q = this.options.quality;
    const mesh = generatePlaneChunk(this.field, cx, cz, res);
    const ox = cx * CHUNK_SIZE;
    const oz = cz * CHUNK_SIZE;
    const margin = 3;
    // Pfadkorridor nur in Bandnähe (weit draußen läuft kein Pfad)
    const midZ = oz + CHUNK_SIZE / 2;
    const u = Math.abs(ox + CHUNK_SIZE / 2 - this.layout.backbone(midZ));
    const corridor: PathCorridor = u < this.layout.bandHalfWidth + CHUNK_SIZE ? (this.corridorFn ?? ((a, b, c, d) => this.groundCorridor(a, b, c, d)))(ox - margin, oz - margin, ox + CHUNK_SIZE + margin, oz + CHUNK_SIZE + margin) : { nodes: [], dots: [] };
    const cn = this.options.path.clearNode;
    const cp = this.options.path.clearPath;
    const clear = (x: number, z: number, radius: number): boolean => {
      for (const n of corridor.nodes) if (Math.hypot(x - n[0], z - n[1]) < cn + radius * 0.5) return true;
      for (const d of corridor.dots) if (Math.hypot(x - d[0], z - d[1]) < cp + radius * 0.5) return true;
      return false;
    };
    // Streuung nur auf dem feinen Netz (die ferne Detailstufe übernimmt die Streuung des feinen Netzes nicht exakt,
    // die Füße sitzen dann auf der glatten Oberfläche — aus der Ferne unsichtbar)
    const trees = scatterPlaneTrees(this.field, cx, cz, { densityScale: q.densityScale, clear, mesh });
    const props = scatterPlaneProps(this.field, cx, cz, { densityScale: q.densityScale, trashScale: this.trashScale, clear, mesh });
    return { mesh, trees, props, nodeRange: this.nodeRangeFor(oz, oz + CHUNK_SIZE) };
  }

  // --- Inhalt (Vegetation, Merkmale, Scheunen, Wehen) --------------------------------------------------------------

  private rebuildContent(): void {
    const nearSet = new Set(this.nearKeys.split('|').filter(Boolean));
    const trees: VegetationTreeEntry[] = [];
    const props: VegetationPropEntry[] = [];
    const barns: Array<{ prop: PlaneProp; world: number; slot: number }> = [];
    const drifts: DriftPlacement[] = [];
    // Anker aller Pools: der Fokus beim Neuaufbau (ganzzahlig) — Instanzpositionen bleiben kleine Zahlen
    const ax = Math.round(this.focus.x);
    const az = Math.round(this.focus.z);
    this.bounds.makeEmpty();
    const regions = new Set<string>();
    for (const chunk of this.loaded.values()) {
      const withDots = nearSet.has(chunk.key);
      const m = chunk.cpu.mesh;
      for (const key of m.regions) regions.add(key);
      for (const tree of chunk.cpu.trees) {
        trees.push({ tree, slot: chunk.slot, withDots });
        const rf = this.field.features.peek(this.field.sample(tree.position[0], tree.position[2]).region.key);
        const spec = rf?.drifts ?? this.catalog.spec(tree.world).features?.drifts ?? null;
        if (spec && tree.variant < (spec.trees ?? 1)) {
          const size = Math.min(1.7, Math.max(0.45, tree.canopyRadius * 0.42)) * (spec.size ?? 1);
          drifts.push({ position: [tree.position[0] - ax, tree.position[1], tree.position[2] - az], normal: tree.normal, size, yaw: tree.variant * 97.1, world: this.slots.slotOf(tree.world), slot: chunk.slot });
        }
      }
      for (const prop of chunk.cpu.props) {
        if (prop.kind === 'barn') {
          barns.push({ prop, world: this.slots.slotOf(prop.world), slot: chunk.slot });
          const spec = this.catalog.spec(prop.world).features?.drifts;
          if (spec) for (const d of barnDrifts(prop, spec.size ?? 1, chunk.slot, this.slots.slotOf(prop.world), ax, az)) drifts.push(d);
        } else props.push({ prop, slot: chunk.slot });
      }
      this.bounds.expandByPoint(_v.set(m.ox - this.focus.x, this.options.radius + m.minH, m.oz - this.focus.z));
      this.bounds.expandByPoint(_v.set(m.ox + CHUNK_SIZE - this.focus.x, this.options.radius + m.maxH, m.oz + CHUNK_SIZE - this.focus.z));
    }
    this.vegetation.setContent(trees, props, { x: ax, z: az });
    this.anchorObject(this.vegetation.group, ax, az);
    this.landmarkTop = this.barns.set(barns, { x: ax, z: az });
    this.anchorObject(this.barns.mesh, ax, az);
    this.drifts.set(drifts);
    this.anchorObject(this.drifts.mesh, ax, az);
    // Perspektivlinien (Bodenlinien-Welten): Fokus je Slot = Bildfokus der nächsten Region dieser Welt
    const best = new Map<number, { d: number; f: [number, number] }>();
    for (const rk of regions) {
      const region = this.field.region(rk);
      if (this.worldData(region.world).ground !== 'floorLines') continue;
      const f = this.field.regionSite(rk).focus;
      const d = Math.hypot(f[0] - this.focus.x, f[1] - this.focus.z);
      const slot = this.slots.slotOf(region.world);
      const prev = best.get(slot);
      if (!prev || d < prev.d) best.set(slot, { d, f: [f[0], f[1]] });
    }
    for (const [slot, b] of best) this.slotFocusPlane[slot] = b.f;
    this.syncSlotFocus();
    // Felsen und Wasser der aktiven Regionen (ein Mesh je Schicht)
    const key = [...regions].sort().join('|') + `#${this.field.version}`;
    if (key !== this.activeRegionsKey) {
      this.activeRegionsKey = key;
      this.buildFeatureMeshes([...regions]);
    }
    if (!this.bounds.isEmpty()) this.bounds.expandByScalar(this.hTotal);
  }

  /** Felsen- und Wasser-Meshes aus den Merkmalen der aktiven Regionen. */
  private buildFeatureMeshes(regionKeys: string[]): void {
    for (const m of [this.rocks, this.water]) {
      if (!m) continue;
      m.removeFromParent();
      m.geometry.dispose();
      this.releaseObject(m);
    }
    this.rocks = null;
    this.water = null;
    const ax = Math.round(this.focus.x);
    const az = Math.round(this.focus.z);
    this.featureAnchor = { x: ax, z: az };
    const regions: RegionFeatures[] = regionKeys.map((k) => this.field.features.region(k)).filter((r) => r.lakes.length + r.rivers.length + r.formations.length > 0);
    const ranges: Array<[number, number]> = [];
    const waterInputs: WaterRegionInput[] = [];
    const formations: Array<{ f: RegionFeatures['formations'][number]; feature: number }> = [];
    for (const r of regions) {
      const z0 = Math.min(...[...r.lakes.map((l) => l.cz - l.reach), ...r.formations.map((f) => f.cz - f.footprint), ...r.rivers.flatMap((v) => v.points.map((p) => p[1]))]);
      const z1 = Math.max(...[...r.lakes.map((l) => l.cz + l.reach), ...r.formations.map((f) => f.cz + f.footprint), ...r.rivers.flatMap((v) => v.points.map((p) => p[1]))]);
      const range = this.nodeRangeFor(z0, z1);
      if (r.lakes.length + r.rivers.length > 0) {
        waterInputs.push({ lakes: r.lakes, rivers: r.rivers, slot: this.slots.slotOf(r.world), featureBase: ranges.length });
        for (let i = 0; i < r.lakes.length + r.rivers.length; i++) ranges.push(range);
      }
      for (const f of r.formations) {
        formations.push({ f, feature: ranges.length });
        ranges.push(range);
      }
    }
    this.featureRanges = ranges.slice(0, this.featureGrowth.array.length);
    this.applyFeatureGrowth();
    if (formations.length > 0) {
      const data = buildRockGeometry(
        formations.map((e) => e.f),
        { x: ax, z: az },
        (f) => this.slots.slotOf(f.world),
        (_f, i) => Math.min(this.featureGrowth.array.length - 1, formations[i]!.feature),
      );
      if (data.indices.length > 0) this.rocks = this.featureMesh('planet-rocks', rockGeometry(data), this.rockMaterial, true, ax, az);
    }
    if (waterInputs.length > 0) {
      const data = buildWaterGeometry(waterInputs, { x: ax, z: az }, (x, z) => this.field.heightAt(x, z));
      if (data) this.water = this.featureMesh('planet-water', waterGeometry(data), this.waterMaterial, false, ax, az);
    }
    this.featureVersion = this.field.version;
  }

  private featureMesh(name: string, geometry: BufferGeometry, material: EarleMaterial, castShadow: boolean, ax: number, az: number): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.plane.add(mesh);
    this.anchorObject(mesh, ax, az);
    return mesh;
  }

  /** Sichtbare Chunks des letzten `update` (Ebene), die kameranächsten zuerst (Müll, Diagnose). */
  get viewChunks(): ReadonlyArray<{ cx: number; cz: number; dist: number }> {
    return this.viewChunkList;
  }

  private viewChunkList: Array<{ cx: number; cz: number; dist: number }> = [];

  /** Geladene Chunks. */
  get loadedCount(): number {
    return this.loaded.size;
  }

  /** Schlüssel der geladenen Chunks (Tests, Diagnose). */
  get loadedKeys(): string[] {
    return [...this.loaded.keys()];
  }

  /** Größe der Caches (Speicher bleibt beim endlosen Schwenken begrenzt). */
  get cacheSizes(): { chunks: number; cpu: number; regions: number; slots: number } {
    return { chunks: this.loaded.size, cpu: this.cache.size, regions: this.field.features.planned, slots: this.slots.entries().length };
  }

  /** Letzter Knoten der Autorenroute (0-basiert). */
  get lastAuthoredNode(): number {
    return this.layout.authoredLevels - 1;
  }

  /** Knoten des Bodenpfads (Kurzform). */
  pathNode(index: number): PlanePathNode {
    return this.path.node(index);
  }

  dispose(): void {
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    for (const o of this.landmarks.values()) o.removeFromParent();
    this.landmarks.clear();
    this.vegetation.dispose();
    this.barns.dispose();
    this.drifts.dispose();
    this.rocks?.geometry.dispose();
    this.water?.geometry.dispose();
    this.rockMaterial.dispose();
    this.waterMaterial.dispose();
    this.terrainMaterial.dispose();
    this.atlas.dispose();
    this.group.removeFromParent();
    this.anchors.clear();
  }
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Schneewehen am Fuß einer Scheune (Ebene, relativ zum Anker). */
function barnDrifts(prop: PlaneProp, size: number, slot: number, worldSlot: number, ax: number, az: number): DriftPlacement[] {
  const q = new Quaternion().setFromAxisAngle(_Y, prop.yaw);
  const s = prop.scale;
  const spots: Array<[number, number, number, number]> = [
    [-0.45, 0.62, 0.55, 0.2],
    [0.4, 0.66, 0.5, 2.1],
    [0.15, -1.1, 0.5, 3.6],
    [0.92, 0.05, 0.45, 5.0],
    [-0.9, -0.3, 0.42, 1.2],
  ];
  const out: DriftPlacement[] = [];
  for (const [x, z, r, yaw] of spots) {
    const p = new Vector3(x * s, 0, z * s).applyQuaternion(q);
    out.push({ position: [prop.position[0] + p.x - ax, prop.position[1], prop.position[2] + p.z - az], normal: [0, 1, 0], size: r * s * size, yaw: prop.yaw + yaw, world: worldSlot, slot });
  }
  return out;
}

/**
 * Merkmale als Anker-Lieferant des Pfads: Wasser und Felsfüße kosten (der Pfad hält Abstand), der niedrigste Vorsprung
 * jeder Formation nahe am Pfad zieht die Route an.
 */
function featureProvider(field: PlaneField): PlanePathProvider {
  return {
    anchors: (zHi, zLo) => {
      const out: Array<{ position: Vec3; kind: 'ledge'; reach: number }> = [];
      const keys = new Set<string>();
      for (let z = zLo; z <= zHi; z += 6) keys.add(field.sample(field.layout.backbone(z), z).region.key);
      for (const k of keys) {
        for (const l of field.features.region(k).ledges) {
          if (l.step !== 0 || l.pathDistance >= 6) continue;
          if (l.position[2] < zLo || l.position[2] > zHi) continue;
          out.push({ position: l.position, kind: 'ledge', reach: Math.min(5, l.pathDistance + 1.5) });
        }
      }
      return out;
    },
    cost: (x, z) => (field.isWater(x, z, 0.6) || field.rockAt(x, z, 0.5) !== null ? 1 : 0),
  };
}

/** `uniformArray(Vector4[], 'vec4')` ohne die generischen Typen. */
interface UniformVec4ArrayLike {
  element(i: unknown): Vec4Node;
}

/** vec4-Element eines Uniform-Arrays (Index-Knoten wird gerundet). */
function vec4Element(arr: UniformVec4ArrayLike, index: FloatNode): Vec4Node {
  return arr.element(int(index.add(0.5).floor()));
}

/**
 * Darstellungsdaten einer prozeduralen Welt: Parameter aus dem Katalog (`@ee/world`), Palette aus den beiden
 * Elternwelten gemischt (OKLab, Farbdreh), Boden, Nebel und Blick von der dominanten Elternwelt.
 */
export function proceduralWorld(id: number, authored: readonly EarlePlanetWorld[], catalog: WorldCatalog): EarlePlanetWorld {
  const recipe = catalog.recipe(id);
  if (!recipe) return authored[id]!;
  const A = authored[recipe.parentA] ?? authored[0]!;
  const B = authored[recipe.parentB] ?? A;
  const dom = recipe.t < 0.5 ? A : B;
  const t = recipe.t;
  return {
    id: `p${id}`,
    name: `Welt ${id + 1}`,
    palette: proceduralPalette(A.palette, B.palette, recipe),
    params: catalog.spec(id),
    ground: dom.ground,
    fogStripes: A.fogStripes + (B.fogStripes - A.fogStripes) * t,
    fog: { start: A.fog.start + (B.fog.start - A.fog.start) * t, range: A.fog.range + (B.fog.range - A.fog.range) * t },
    view: dom.view ?? DEFAULT_VIEW,
    procedural: true,
  };
}

export { SLOT_ROWS, isTreeKind };
