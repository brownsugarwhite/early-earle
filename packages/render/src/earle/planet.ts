import { Box3, BufferAttribute, BufferGeometry, Frustum, Group, Matrix4, Mesh, MeshBasicNodeMaterial, Object3D, Quaternion, Sphere, Vector3, Vector4 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { Fn, If, abs, atan, attribute, cameraViewMatrix, clamp, float, fract, fwidth, int, length, max, mix, modelViewMatrix, modelWorldMatrix, normalGeometry, normalize, positionGeometry, positionLocal, positionView, select, sin, smoothstep, step, uniform, uniformArray, varying, vec2, vec3, vec4 } from 'three/tsl';
import {
  CHUNK_SIZE,
  PlaneField,
  PlaneMist,
  PlanePath,
  WorldCatalog,
  WorldLayout,
  generatePlaneChunk,
  isTreeKind,
  scatterPlaneProps,
  scatterPlaneTrees,
  type MistBank,
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
import { aaSaw, earleGradients } from './gradients';
import type { ShadowTint } from '../shadow/shadowTint';
import { PaletteAtlas, hexToRgb8, type WorldPalette, type WorldRows } from './palette';
import { GROWTH_SLOTS, PlanetVegetation, type VegetationPropEntry, type VegetationTreeEntry } from './planetVegetation';
import { proceduralPalette } from './proceduralPalette';
import type { ShadowFactorFn } from './trees/treeLayer';
import { PaletteLookup, aaStep, arrayElement, createFogSettings, patternTime, stripeMask, type FloatNode, type FogSettings, type TSLUniform, type UniformArrayLike, type Vec3Node, type Vec4Node } from './tsl';
import { TOXIC_HEAL_FROM, createWaterMaterial } from './water/waterSurface';
import { buildWaterGeometry, waterGeometry, type WaterRegionInput } from './water/waterMesh';
import { encodeShore, packTerrainFlags, shoreBandLayers } from './water/shoreBand';
import { toxicStyleCode } from './trash/palette';
import { buildRockGeometry, createRockMaterial, rockGeometry } from './landmarks/rocks';
import { BarnLandmarks } from './landmarks/barn';
import { HorseHerd, type HorsePlacement } from './landmarks/horses';
import { DriftLandmarks, type DriftPlacement } from './landmarks/drifts';
import { PLANET_ATLAS_HEIGHT, SLOT_COUNT, SLOT_ROWS, WorldSlots, slotLandmarkRows, slotRows } from './worldSlots';
import { LandmarkSet } from './landmarks/set/LandmarkSet';
import type { CloudBankSpec } from './sky/cloudBanks';
import { MistBanks } from './mist/mistBanks';
import { createScaleCarpet, type ScaleCarpet } from './ground/scaleCarpet';
import { fogSeaLayer } from './ground/fogSea';
import { meadowLayer } from './ground/meadow';
import { firCarpetColors, firCarpetMask, firProjScale, viewQuarter } from './ground/firCarpet';
import { canopyCarpetColors, canopyCarpetMask } from './ground/canopyCarpet';
import type { LandmarkInstance } from '@ee/world';

/**
 * Bodenbehandlung je Welt (Terrain-Ornament): glatt, Schneelinien, Wiese, Perspektivlinien, Rampen, Schneegrate,
 * Buschteppich aus Schuppenbögen (Welt 11, Ebene 20) und Schuppenbüsche mit Lichtlinien (Welt 12, Ebene 7).
 */
export type GroundTreatment = 'smooth' | 'snowLines' | 'meadow' | 'floorLines' | 'ramps' | 'snowRidges' | 'scales' | 'scalesStreaked'
  // Tannenwald aus weißen Punkten (Welt 06, Ebene 10): Tannen-Zeichen als Bodenornament, siehe ground/firCarpet
  | 'firs'
  // Kronendach von oben (Welt 02, Ebene 49): runde Kronen mit heller, getüpfelter Kappe, siehe ground/canopyCarpet
  | 'canopy';

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
  /** Blickpunkt über dem Gelände (Welteinheiten): > 0 hebt den Blick (Untersicht, z. B. zum Monolithen, Ebene 45). */
  lookHeight?: number;
  /**
   * Sonne der Komposition (Grad, Azimut relativ zur Blickachse wie im Sonnen-Rig: 0 = Gegenlicht vor der Kamera,
   * 90 = rechts); fehlt die Höhe, gilt die des Lab-Reglers. Welt 11: Gegenlicht von rechts vorn (Ebene 20), Welt 13:
   * Licht von rechts hinten auf die Schauseite des Monolithen (Ebene 45).
   */
  sun?: { azimuth: number; elevation?: number };
  /** Scheitel neben dem Bildfokus (Rig-Raum: x rechts, z zur Kamera) statt `focus` — Untersichten ohne Bodenstrahl. */
  aim?: [number, number];
  /** Blickpunkt seitlich (Welteinheiten, + rechts): die Kamera dreht sich zur Seite (Welt 14: zur Landzunge). */
  lookSide?: number;
  /** Abweichungen der Komposition im Hochformat (Handy): ersetzen die Felder oben, wenn das Bild höher als breit ist. */
  portrait?: Partial<Omit<WorldView, 'portrait'>>;
  /** Blickrichtung der Komposition (Grad um die Hochachse, + = nach links; Standard 0 = längs des Pfads). */
  yaw?: number;
  /** Vordergrund-Ornament der Komposition (Welt 12: der fraktale Ast oben links, Ebene 7). */
  ornament?: 'branch';
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
  /**
   * Terminator des Geländes (N·L darunter Tinte; Standard 0,02). Welt 11 (Ebene 20): 0,22 — flache Kuppen bleiben dunkle
   * Masse, nur die zur Sonne geneigten Kämme leuchten.
   */
  groundTerminator?: number;
  /** Prozedural erzeugt (nur lesbar im Editor). */
  procedural?: boolean;
  /** Wolkenbänke am Himmel der Welt (Welt 13, `sky/cloudBanks.ts`). */
  clouds?: CloudBankSpec;
  /**
   * Schattentönung der Welt (Earle: Schatten auf Schnee blau, Bild 05; auf der goldenen Wiese tiefes Oliv): Farbe und
   * Anteil 0..1, mit dem die Tintenform auf dem Gelände (und Wehen, Pfad) zur Tönung gemischt wird. Fehlt → Tinte.
   */
  shadowTint?: { color: string; amount: number; lift?: number };
  /** Talnebel 0..1 (Ebene 20, Bild 03): helle Nebelbank am Talgrund, nach oben ausdünnend. Fehlt → 0. */
  valleyMist?: number;
  /** Leuchtender Horizont 0..1 (Ebene 16: heller Schein hinter den Baumreihen, am Horizont rundum). Fehlt → 0. */
  skyGlow?: number;
  /**
   * Fluchtpunkt der Bodenlinien (`ground: floorLines`, Ebene 3/32) als Versatz vom Bildfokus der Welt in Welteinheiten
   * (Ebene: Ost = voraus längs des Pfads, −z; Nord = quer, +x). Fehlt → Bildfokus (Strahlen und Ringe um die Mitte).
   */
  floorAnchor?: { east?: number; north?: number };
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
  /** Autorenroute (Level 1 … Summe; `content/zones/route.json`, Route 15 + 1). */
  route: RouteEntry[];
  /** Welt jenseits der Route (seitlich, hinter dem Tor, vor dem Start): die angedeutete Zone (w16). */
  beyondWorld?: number;
  /** Welten, die nie Nachbarwelt einer Seitenzelle werden (nur mit `procedural`). */
  noLateral?: readonly number[];
  /** Abstand zweier Level entlang z (Standard 4,2). */
  nodeSpacing?: number;
  /** Altes Verhalten mit prozeduralen Welten hinter und neben der Route (Lab `?prozedural=1`). Standard false. */
  procedural?: boolean;
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
  /**
   * Schattentönung je Welt (`SunRig.shadowTint`): der Planet schreibt die Tönungen der Welten hinein und tönt damit
   * die Tintenform von Gelände und Schneewehen. Fehlt → ungetönte Tinte.
   */
  shadowTint?: ShadowTint | null;
}

/** Freihaltung längs des Levelpfads (Knoten und Punkte in der Ebene) je Rechteck. */
export interface PathCorridor {
  nodes: Array<[number, number]>;
  dots: Array<[number, number]>;
}

/** Chunks, die nach dem Schwenken höchstens über die gewollten hinaus geladen bleiben (Rückweg ohne Neubau). */
const LINGER_CHUNKS = 12;
/** Frist der ersten Füllung (ms): so viele der nächsten Chunks wie hineinpassen, der Rest mit dem Budget je Bild. */
const FIRST_FILL_MS = 60;

/**
 * Grundbestand vor der Heilung (nie leeres Gelände): Welten ohne ganzes Müllfeld zeigen schon die Hälfte ihrer Bäume
 * (etwas kleiner) auf nur leicht verdorrtem Boden; mit dem Fortschritt wird es dichter. Die vermüllte Startwelt (Müll
 * überall, voller Neon-Schleier) bleibt dystopisch — dort lichten sich Müll und Schleier mit dem Fortschritt.
 */
const GROWTH_FLOOR = 0.5;
/** Dasselbe für die Farbe des Bodens, der Felsen und des Wassers (0 = verdorrt, 1 = geheilt). */
const TERRAIN_FLOOR = 0.7;

/**
 * Layer der Schattenwerfer-Stellvertreter (nur Schattenpass): das Gelände wirft seinen Schatten über eigene Meshes je
 * 2 × 2 Chunks, deren Grenzkugel im Schattenraum liegt — die sichtbaren Chunks kullen eng im Anzeigeraum, und jede
 * Kaskade zeichnet ein Viertel der Aufrufe. Der Besitzer der Sonne schaltet den Layer auf der Schattenkamera ein (wie
 * den Schatten-Proxy des Helden).
 */
export const PLANET_SHADOW_LAYER = 1;
/** Chunks je Seite einer Schatten-Kachel. */
const SHADOW_TILE = 3;
/** Neubau geänderter Schatten-Kacheln höchstens alle so viele Frames. */
const TILE_REBUILD_FRAMES = 6;
/**
 * Chunks je Seite einer Gelände-Kachel des Hauptpasses: das Gelände zeichnet je 2 × 2 Chunks ein Mesh (dieselben
 * Vertices, dasselbe Material) — beim Schwenken ≈ 5 statt ≈ 10 Aufrufe für den Boden.
 */
const TERRAIN_TILE = 3;

interface ShadowTile {
  key: string;
  tx: number;
  tz: number;
  mesh: Mesh | null;
  dirty: boolean;
  minH: number;
  maxH: number;
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
  /** Gelände-Attribute je Vertex (Welt-Slots, Grenze, Merkmale, Wachstum) für die Gelände-Kachel. */
  attrs: { ta: Float32Array; tb: Float32Array; tc: Float32Array; tg: Float32Array };
  /** Hinter dem Horizont (Bogen vom Kamerafuß, letztes `update`): trägt keinen Inhalt bei. */
  beyond: boolean;
  /** Diesseits des Horizonts und im Bild (Kugel im Anzeigeraum, letztes `update`): seine Kachel zeichnet. */
  inView: boolean;
  slot: number;
  lastSeen: number;
  /** Mittelpunkt (Ebene) und Radius für Kulling/Detailstufe. */
  centreY: number;
  radius: number;
}

/** Bodenornament je Behandlung (Wiese, Rampen und Schneegrate leben von Form und Bändern, nicht von Linien). */
const GROUND_KIND: Record<GroundTreatment, number> = { smooth: 0, meadow: 0, ramps: 0, snowRidges: 0, snowLines: 1, floorLines: 2, scales: 3, scalesStreaked: 4, firs: 5, canopy: 6 };
const DEFAULT_VIEW: WorldView = { height: 9, forward: 8, look: 4, fov: 70, curvature: 0 };
/** Periode (Welteinheiten) der Bodenornament-Koordinaten: Muster bleiben beim Umbruch des Fokus deckungsgleich. */
const PATTERN_PERIOD = 700;
const _v = new Vector3();
const _w = new Vector3();
const _c = new Vector3();
const _sphere = new Sphere();
const _q = new Quaternion();
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
  /** Talnebel der Blick-Welt (0..1, mit der Überblendung): helle Nebelbank am Talgrund des Geländes. */
  readonly mistStrength = uniform(0);
  /** Leuchtender Horizont der Blick-Welt (0..1, mit der Überblendung), für `createSkyDome({ glow })`. */
  readonly skyGlow = uniform(0);
  /** Farbe des Talnebels (hellste Nebelstufe der Blick-Welt, mit der Überblendung; linear). */
  private readonly mistColor = uniform(new Vector3(1, 1, 1));
  /** Schattentönung je Welt-Slot (`SunRig.shadowTint`), nachgeführt beim Belegen eines Slots. */
  private shadowTint: ShadowTint | null = null;
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
  /** Weiße Pferde am Fuß der Monolithen (Welt 13). */
  readonly horses: HorseHerd;
  /** Nebelbänke zwischen den Hügeln und Nebelmeer (Welten mit `mist`, Ebene 20/7). */
  readonly mist: MistBanks;
  private readonly mistPlan: PlaneMist;
  /** Buschteppich des Geländes (Bodenbehandlung `scales`): Sonnenrichtung für die Punktränder. */
  private readonly carpet: ScaleCarpet;
  /** Projektionsmaßstab für die Oktaven des Tannenteppichs (Bodenbehandlung `firs`). */
  private readonly firProj = firProjScale();
  /** Viertel der Blickrichtung (die Tannen-Zeichen stehen im Bild aufrecht). */
  private readonly firQuarter = uniform(0);
  /**
   * Wahrzeichen der geladenen Regionen (Fels mit Wasserfall, Felsstufe, Zwillingsfälle, Ruine, Sumpf): wenige
   * zusammengefasste Meshes, neu gebaut, wenn sich die Menge ändert (Anker = Fokus beim Bau).
   */
  readonly landmarkSet: LandmarkSet;
  private landmarkKey = '';
  private readonly landmarkOrigin = { x: 0, z: 0 };
  private landmarkInstances: LandmarkInstance[] = [];
  private readonly terrainMaterial: EarleMaterial;
  private readonly rockMaterial: EarleMaterial;
  private readonly waterMaterial: EarleMaterial;
  private readonly crackWidth: number;
  /** Pfadrisse mit Kennung < diesem Wert sind geschlossen. */
  private readonly crackOpenFrom = uniform(-1e6);
  private readonly loaded = new Map<string, LoadedChunk>();
  /** Schattenwerfer des Geländes je 2 × 2 Chunks (Layer PLANET_SHADOW_LAYER). */
  private readonly shadowTiles = new Map<string, ShadowTile>();
  private tileMaterial: MeshBasicNodeMaterial | null = null;
  /** Gelände-Kacheln des Hauptpasses (je TERRAIN_TILE² Chunks ein Mesh). */
  private readonly terrainTiles = new Map<string, ShadowTile>();
  /** Nebelbänke des Inhalts (für den Bildtest: das Nebel-Mesh zeichnet nur, wenn eine Bank im Bild liegt). */
  private mistBanks: readonly MistBank[] = [];
  /** Chunks, die Inhalt tragen (nicht hinter dem Horizont): Neubau des Inhalts, wenn sich die Menge ändert. */
  private contentKeys = '';
  private readonly cache = new Map<string, ChunkCpu>();
  private readonly slotsUsed: Array<string | null> = new Array<string | null>(GROWTH_SLOTS).fill(null);
  private readonly loadsPerFrame: number;
  private readonly loadBudgetMs: number;
  private readonly unloadAfter: number;
  private readonly viewRadius: number;
  private progressDone = 0;
  /** Grundbestand je Welt (siehe `GROWTH_FLOOR`), einmal je Welt ermittelt. */
  private readonly floors = new Map<number, { vegetation: number; terrain: number }>();
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
  /** Strahlen der Perspektivlinien je Slot (48; mit fernem Fluchtpunkt `floorAnchor` 144). */
  private readonly slotRays: number[] = new Array<number>(SLOT_COUNT).fill(48);
  private readonly rockRows: UniformArrayLike;
  private readonly waterRows: UniformArrayLike;
  private readonly barnRows: UniformArrayLike;
  private readonly plainTerrainRows: UniformArrayLike;
  private readonly driftRows: UniformArrayLike;
  /** Nebelspiegel je Welt-Slot (Welt 12: darunter ist der Boden Nebelmeer; −10⁴ = keins). */
  private readonly slotSea: UniformArrayLike;
  /** Wiese statt Schnee je Welt-Slot (Welt 11: die Schneefelder sind leuchtende Wiesen mit Verlauf; 0/1). */
  private readonly slotMeadow: UniformArrayLike;
  /** Terminator des Geländes je Welt-Slot (`groundTerminator`, Standard 0,02). */
  private readonly slotTerminator: UniformArrayLike;
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
  /** Welt je Merkmal (Grundbestand der Farbe). */
  private featureWorlds: number[] = [];
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
  /** Kamera im Objektraum des Fels-Meshes und Lichtungsradius (Karte: wie die Bäume, `setFootClear`). */
  private readonly rockCamLocal = uniform(new Vector3(0, 100, 0)) as unknown as { value: Vector3 } & Vec3Node;
  private readonly rockFootClear = uniform(0);
  /** Richtung zur Sonne für die Stufen des Monolithen (Fels-Material). */
  private readonly rockSunDir = uniform(new Vector3(0.8, 0.21, 0.56).normalize()) as unknown as { value: Vector3 } & Vec3Node;
  private readonly barnCamLocal = uniform(new Vector3(0, 100, 0)) as unknown as { value: Vector3 } & Vec3Node;
  private readonly driftCamLocal = uniform(new Vector3(0, 100, 0)) as unknown as { value: Vector3 } & Vec3Node;
  /** Scheunen im geladenen Inhalt (Ebene: Mitte, Radius, Firsthöhe) — Hindernisse für die Kartenkamera. */
  private barnSpots: Array<{ x: number; z: number; r: number; top: number }> = [];
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
    this.layout = new WorldLayout({
      seed: options.seed,
      route: options.route,
      authored: options.worlds.length,
      ...(options.beyondWorld !== undefined ? { beyondWorld: options.beyondWorld } : {}),
      ...(options.noLateral ? { noLateral: options.noLateral } : {}),
      ...(options.nodeSpacing !== undefined ? { nodeSpacing: options.nodeSpacing } : {}),
      ...(options.procedural ? { procedural: true } : {}),
    });
    this.catalog = new WorldCatalog(
      options.worlds.map((w) => w.params),
      options.seed,
      { procedural: this.layout.procedural, hinted: this.layout.beyondWorld },
    );
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
    this.slotSea = uniformArray(new Array<number>(SLOT_COUNT).fill(-1e4), 'float') as unknown as UniformArrayLike;
    this.slotMeadow = uniformArray(new Array<number>(SLOT_COUNT).fill(0), 'float') as unknown as UniformArrayLike;
    this.slotTerminator = uniformArray(new Array<number>(SLOT_COUNT).fill(0.02), 'float') as unknown as UniformArrayLike;
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
    this.mistStrength.value = first.valleyMist ?? 0;
    this.skyGlow.value = first.skyGlow ?? 0;
    this.setMistColor(0, 0, 0);

    const warp = (p: Vec3Node): Vec3Node => this.mapping.warp(p);

    // --- Terrainmaterial (geteilt) ----------------------------------------------------------------------------
    // Gepackte Vertex-Attribute (WebGPU ≤ 8 Puffer): ta = (eigener Slot, Slot², Slot lo, Slot hi),
    // tb = (Grenzabstand ± (lo +), Risskennung, Koordinate längs des Risses, Höhe 0..1),
    // tc = (Uferabstand, Schneefeld, Uferband-Code, Eis + 2·Sumpf + 4·Gift-Code; `water/shoreBand.ts`),
    // tg = Wachstums-Slot + Lippenseite/2
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
    // Zickzack längs der Grenze, bandbegrenzt: wird eine Zacke auf dem Bildschirm schmaler als etwa 5 Pixel (flacher
    // Blick, Ferne), glättet sie sich zur mittleren Breite — sonst zerfällt die Kante in Kamm- und Treppenmuster
    const alongPx = fwidth(along).max(1e-5);
    const zig = (freq: number, t: FloatNode): FloatNode => mix(float(0.5), t, float(1).sub(smoothstep(0.07, 0.2, alongPx.mul(freq)))) as unknown as FloatNode;
    const tri = zig(0.9, abs(fract(along.mul(0.9)).mul(2).sub(1)) as unknown as FloatNode);
    const tri2 = zig(2.43, abs(fract(along.mul(2.43).add(0.37)).mul(2).sub(1)) as unknown as FloatNode);
    const triW = zig(1.17, abs(fract(along.mul(1.17)).mul(2).sub(1)) as unknown as FloatNode);
    const zoneW = select(borderId.lessThan(this.crackOpenFrom), float(0), float(this.crackWidth));
    const width = select(isPath, zoneW.mul(float(0.45).add(tri.mul(0.4)).add(tri2.mul(0.25))), float(0.32).mul(float(0.5).add(triW.mul(0.5))));
    const open = step(0.001, width);
    // Rand als Abstandsfeld (Grenzabstand − Rissbreite), geglättet über seine eigene Bildschirmänderung: die Zacken der
    // Breite zählen mit (nur `border` zu glätten ließ sie als harte Kammzähne stehen)
    const edge = border.sub(width);
    const edgePx = fwidth(edge).max(1e-4);
    const outside = smoothstep(edgePx.negate(), edgePx, edge);
    const crack = outside.oneMinus().mul(open);
    const lipOnLo = step(fract(tg), float(0.25));
    const onLo = step(0, sd);
    const lipSide = mix(onLo.oneMinus(), onLo, lipOnLo);
    // Lippe: helles Band neben dem Spalt; schmaler als gut ein Pixel blendet es aus, statt zu flimmern
    const lipW = select(isPath, float(0.07), float(0.06));
    const lipFade = smoothstep(0.8, 1.8, lipW.div(edgePx));
    const lip = outside.mul(smoothstep(lipW.sub(edgePx), lipW.add(edgePx), edge).oneMinus()).mul(open).mul(lipSide).mul(lipFade);
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
    // Perspektivlinien (Ebene 3/32): fein und dicht wie gezogene Tuschelinien — 48 Strahlen (mit fernem Fluchtpunkt,
    // `floorAnchor`, 144, damit sie vorn dicht bleiben; Anzahl je Slot in focusS.z), Ringe alle 2.4 Einheiten
    const rays = select(focusS.z.greaterThan(0.5), focusS.z, float(48));
    const lines = stripeMask(select(isSnow, snowCoord, theta.mul(rays).div(Math.PI * 2)), select(isSnow, float(0.09), float(0.022))).mul(select(isSnow, float(1), smoothstep(0.48, 1.9, ang)));
    const rings = stripeMask(ang.div(2.4).add(drift), 0.018).mul(select(isSnow, float(0), float(1)));
    const mask = max(lines, rings).mul(flat).mul(select(kind.greaterThan(0.5).and(kind.lessThan(2.5)), float(1), float(0)));
    const patternColor = this.lookup.pal(wa.z, rowNode).rgb;
    const runsInShadow = kind.greaterThan(0.5).and(kind.lessThan(2.5));
    const patternShadow = mix(this.lookup.pal(0, rowNode).rgb, patternColor, select(runsInShadow, float(0.4), float(0)));

    // Geländemerkmale je Vertex: tc = (Uferabstand, Schneefeld, Koordinate längs des Gewässers, Eis/Sumpf)
    const tc = attribute('tc', 'vec4');
    // Schneefelder (Bild 05): Kante mit feiner organischer Welligkeit (Frequenzen ganzzahlig in 700 → periodisch)
    const po = pw.add(this.patternOrigin);
    // Buschteppich (Ebene 20/7): Schuppenbögen der Büsche als Ornament statt der Linien
    this.carpet = createScaleCarpet(this.lookup, rowNode, po, normalGeometry as unknown as Vec3Node, step(3.5, kind), rowNode.add(7));
    const isCarpet = kind.greaterThan(2.5).and(kind.lessThan(4.5));
    // Tannenwald aus weißen Punkten (Welt 06): nur Welten mit `firs` rechnen ihn (Zweig); Ableitungen außerhalb des Zweigs
    const isFirs = kind.greaterThan(4.5).and(kind.lessThan(5.5));
    // Kronendach von oben (Welt 02): ebenfalls nur im Zweig seiner Welt
    const isCanopy = kind.greaterThan(5.5).and(kind.lessThan(6.5));
    const firFw = max(fwidth(po.x), fwidth(po.z)).max(1e-5);
    const firDepth = positionView.z.negate().max(0.05);
    const glyphSun = this.carpet.sunDir as { value: Vector3 } & Vec3Node;
    const firData = Fn(() => {
      const out = vec2(0, 0).toVar('glyphCarpet');
      If(isFirs, () => {
        const f = firCarpetMask({ po, normal: normalGeometry as unknown as Vec3Node, sunDir: glyphSun, fw: firFw, depth: firDepth, projScale: this.firProj, quarter: this.firQuarter });
        out.assign(vec2(f.mask, f.light));
      }).ElseIf(isCanopy, () => {
        const c = canopyCarpetMask({ po, sunDir: glyphSun, fw: firFw, depth: firDepth, projScale: this.firProj, quarter: this.firQuarter });
        out.assign(vec2(c.mask, c.tone));
      });
      return out;
    })();
    const firCol = firCarpetColors(this.lookup, rowNode.add(1), firData.y as unknown as FloatNode);
    const crownCol = canopyCarpetColors(this.lookup, rowNode.add(1), firData.y as unknown as FloatNode);
    const isGlyph = isFirs.or(isCanopy);
    const glyphColor = select(isFirs, firCol.color, crownCol.color);
    const glyphShadow = select(isFirs, firCol.shadowColor, crownCol.shadowColor);
    // Nebelmeer (Welt 12): unter dem Nebelspiegel des Slots ist der Boden Nebel, Farben aus der Wasserzeile (Slot + 10)
    const seaLayer = fogSeaLayer(this.lookup, rowNode.add(10), arrayElement(this.slotSea, slotF), pw.y, po);
    const k = (f: number) => (Math.round((f * PATTERN_PERIOD) / (Math.PI * 2)) * Math.PI * 2) / PATTERN_PERIOD;
    const snowWob = sin(po.x.mul(k(1.9)).add(sin(po.z.mul(k(1.9 * 1.3))).mul(1.7)))
      .mul(0.035)
      .add(sin(po.y.mul(2.3 * 1.9).add(po.x.mul(k(0.7 * 1.9)))).mul(0.025));
    // Wiese (Welt 11): dieselbe Feldkante, aber als flache Fläche mit Verlauf nach innen statt Schnee in Lichtbändern
    const meadowOn = arrayElement(this.slotMeadow, slotF);
    const fieldEdge = aaStep(0, tc.y.add(snowWob)).mul(wb.z);
    const snowField = { mask: fieldEdge.mul(meadowOn.oneMinus()), row: wb.y, lift: float(0.08) };
    const meadow = meadowLayer(this.lookup, wb.y, tc.y, fieldEdge, po, meadowOn);
    // Uferband (W7): hellere Uferstufe mit flachen Spiegelformen, Neon-Saum an Giftufern (`water/shoreBand.ts`)
    const shoreLayers = shoreBandLayers({
      lookup: this.lookup,
      terrainRow: rowNode,
      waterRow: wb.x,
      bands: this.terrainBands,
      code: tc.z,
      flags: tc.w,
      po,
      period: PATTERN_PERIOD,
      growth: growthNode,
      healFrom: TOXIC_HEAL_FROM,
    });
    // Gemeißelte Hänge: Wertstufen entlang der Höhenlinien (Stufensprung im Bandwert je Höhenschicht)
    const chisel = wa.w;
    // Sägezahn mit 1-px-Kante: jede Höhenschicht verläuft in sich, die Stufe zur nächsten bleibt eine klare Kante
    const contour = aaSaw(heightAttr.mul(5.0).add(0.5)).sub(0.5).mul(0.34);
    // Verlauf innerhalb der Lichtbänder (Ebene 19/20/36: jede Wiese, jedes Schneefeld verläuft in sich), großräumig und
    // damit auf beiden Seiten einer Bandkante fast gleich — die Kante bleibt ein harter Sprung:
    // - zur Sonne hin heller (Normale der Anzeigekugel: die sonnenseitige Hälfte des Bildes, Ebene 19),
    // - Kamm hell → Tal tief (Höhe),
    // - vorn tief, zum Horizont heller (Bildtiefe: die Höhe im Bild — unterer Bildrand = nächster Boden −1, Horizont
    //   +1, bei FOV 50–61° in jeder Kameraeinstellung gleich; dahinter übernehmen die Wertstufen der Luftperspektive).
    // Schattentönung und Tintenform rechnen weiter in der Ebene (ADR 0002): dort ist „oben“ die Hochachse der Ebene.
    const planeUpN = varying(modelViewMatrix.mul(vec4(0, 1, 0, 0)).xyz, 'vTerrainPlaneUp');
    const planeUp = normalize(planeUpN);
    // Die Anzeigekugel liegt um den Weltursprung: ihre Normale zeigt vom Mittelpunkt zur angezeigten Position
    const globeUp = normalize(positionView.sub(cameraViewMatrix.mul(vec4(0, 0, 0, 1)).xyz));
    const crest = heightAttr.mul(2).sub(1);
    const depth = clamp(positionView.y.div(positionView.length()).mul(4.5).add(0.9), -1, 1);
    // Eine gemeinsame Richtung (vorn tief → hinten und zur Sonne hell), die über das ganze Bild läuft: große Flächen
    // zeigen den Verlauf deutlich, kleine Formen sehen nur ein Stück davon
    const terrainGradient = ({ L }: { L: Vec3Node }): FloatNode => {
      const sunSide = clamp(globeUp.dot(L).sub(0.17).mul(3.5), -1, 1);
      return clamp(depth.mul(0.7).add(sunSide.mul(0.4)).add(crest.mul(0.3)), -1, 1) as unknown as FloatNode;
    };
    // Talnebel (Ebene 20): am Talgrund dicht und hell, zu den Kämmen hin ausdünnend; direkt vor der Linse frei
    const valley = float(1).sub(smoothstep(0.0, 0.5, heightAttr));
    const mist = varying(valley.mul(valley).mul(smoothstep(4.0, 13.0, positionView.length())), 'vTerrainMist').mul(this.mistStrength).mul(earleGradients.air);
    // Schattentönung je Welt-Slot (SunRig.shadowTint): die Tönung der Welt im Slot, nachgeführt beim Belegen
    const tint = options.shadowTint ?? null;
    this.shadowTint = tint;
    for (const [slot, world] of this.slots.entries()) this.applySlotTint(slot, world);

    this.terrainMaterial = new EarleMaterial({
      lookup: this.lookup,
      row: rows0.terrain,
      rowNode,
      fog: this.fog,
      bands: this.terrainBands,
      bandScale: 2.0,
      terminator: 0.02,
      terminatorNode: arrayElement(this.slotTerminator, slotF),
      // Höhe → hellere Kuppen, dazu die Meißelschichten (harte Bänder wie im Siebdruck)
      lift: heightAttr.mul(0.45).add(contour.mul(chisel)),
      gradient: terrainGradient,
      // große, gleichfarbige Flächen (Wiese, Schnee, Wüste) zeigen den Verlauf deutlich: bis 45 % zur Nachbarstufe
      gradientAmount: earleGradients.surface.mul(0.45),
      shadowTint: tint ? { tint, world: slotF, up: planeUp } : null,
      mist: { amount: mist, color: this.mistColor as unknown as Vec3Node },
      crackNode: crack,
      crackLipNode: lip,
      growthNode,
      pattern: {
        mask: select(isGlyph, firData.x, select(isCarpet, this.carpet.mask, mask)),
        color: select(isGlyph, glyphColor, select(isCarpet, this.carpet.color, patternColor)),
        shadowColor: select(isGlyph, glyphShadow, select(isCarpet, this.carpet.shadowColor, patternShadow)),
      },
      layers: [...shoreLayers, snowField, meadow, seaLayer],
      positionNode: warp(positionLocal as unknown as Vec3Node),
      fogDistNode: positionView.length().add(this.veilNode(slotF)),
    });

    // --- Felsen, Wasser, Scheunen, Schneewehen -----------------------------------------------------------------
    this.featureGrowth = uniformArray(new Array<number>(96).fill(1), 'float') as unknown as UniformArrayLike;
    const featureGrowth = (i: FloatNode): FloatNode => arrayElement(this.featureGrowth, i);
    const slotGrowth = (slot: FloatNode): FloatNode => (this.terrainGrowth as unknown as { element(i: unknown): FloatNode }).element(int(slot.add(0.5).floor()));
    this.rockMaterial = createRockMaterial({
      lookup: this.lookup,
      fog: this.fog,
      bands: this.terrainBands,
      rockRows: this.rockRows,
      veil: (w) => this.veilNode(w),
      warp,
      growth: featureGrowth,
      footClear: { camLocal: this.rockCamLocal, radius: this.rockFootClear },
      sunDir: this.rockSunDir,
    });
    this.waterMaterial = createWaterMaterial({ lookup: this.lookup, fog: this.fog, bands: this.terrainBands, waterRows: this.waterRows, veil: (w) => this.veilNode(w), warp, growth: featureGrowth });
    this.barns = new BarnLandmarks({
      lookup: this.lookup,
      fog: this.fog,
      bands: this.terrainBands,
      barnRows: this.barnRows,
      terrainRows: this.plainTerrainRows,
      veil: (w) => this.veilNode(w),
      warp,
      capacity: 24,
      growth: slotGrowth,
      footClear: { camLocal: this.barnCamLocal, radius: this.rockFootClear },
    });
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
      footClear: { camLocal: this.driftCamLocal, radius: this.rockFootClear },
      shadowTint: this.shadowTint,
    });
    this.plane.add(this.drifts.mesh);
    this.horses = new HorseHerd({ lookup: this.lookup, fog: this.fog, warp, camLocal: this.rockCamLocal, sunDir: this.rockSunDir, veil: (w) => this.veilNode(w) });
    this.plane.add(this.horses.mesh);
    // Nebelbänke (Ebene 20: Bänder zwischen den Hügelschichten; Ebene 7: Nebelmeer), je Region geplant
    this.mistPlan = new PlaneMist(this.field);
    this.mist = new MistBanks({ lookup: this.lookup, warp });
    this.plane.add(this.mist.mesh);

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

    // --- Wahrzeichen (@ee/world/landmarks): Zeilen je Welt-Slot, Anzeige-Abbildung wie das Terrain -------------
    const factor = options.shadow?.factor ?? null;
    this.landmarkSet = new LandmarkSet({
      ctx: { lookup: this.lookup, fog: this.fog, bands: this.terrainBands, warp },
      rowsFor: (world) => slotLandmarkRows(this.slots.slotOf(world)),
      quality: options.quality.chunkRes < 30 ? 'mobil' : 'hoch',
      origin: this.landmarkOrigin,
      ...(factor ? { shade: (p: Vec3Node) => factor(p, { softness: 0.1 }) } : {}),
      groundAt: (x, z) => this.field.heightAt(x, z),
    });
    this.plane.add(this.landmarkSet.group);
    for (const o of [this.barns.mesh, this.drifts.mesh, this.mist.mesh, this.vegetation.group, this.landmarkSet.group]) this.anchorObject(o, 0, 0);
  }

  // --- Welten und Slots ------------------------------------------------------------------------------------------

  /**
   * Darstellungsdaten einer Welt (Autorenwelt oder prozedural erzeugt, im Cache). Ohne `procedural` (Route 15 + 1) sind
   * fremde Kennungen (Hinted-Varianten, W2) die angedeutete Welt selbst — wie eine Autorenwelt.
   */
  worldData(id: number): EarlePlanetWorld {
    if (id >= 0 && id < this.worlds.length) return this.worlds[id]!;
    if (!this.layout.procedural) return this.worlds[this.layout.beyondWorld] ?? this.worlds[this.worlds.length - 1]!;
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
    this.slotA.array[slot]!.set(rows.terrain, GROUND_KIND[w.ground], w.ground === 'floorLines' ? (w.palette.groundLine ? 6 : 4) : 1, Math.max(0, spec.features?.chisel ?? 0));
    this.slotB.array[slot]!.set(rows.water, w.palette.snow ? rows.snow : rows.terrain, hasSnow ? 1 : 0, rows.rock);
    const sea = spec.mist?.sea;
    this.slotSea.array[slot] = sea ? (sea.height ?? sea.level * spec.terrain.amplitude) : -1e4;
    this.slotMeadow.array[slot] = hasSnow && spec.features?.snowFields?.meadow ? 1 : 0;
    this.slotTerminator.array[slot] = w.groundTerminator ?? 0.02;
    // Fokus der Perspektivlinien: setzt `rebuildContent` aus der nächsten Region der Welt
    this.slotFocusPlane[slot] = null;
    this.slotRays[slot] = w.floorAnchor ? 144 : 48;
    this.slotFocus.array[slot]!.set(1e4, 1e4, this.slotRays[slot]!, 0);
    this.vegetation?.onSlotAssigned(slot, world);
    this.applySlotTint(slot, world);
  }

  /** Schattentönung der Welt in ihren Slot schreiben (oder löschen). */
  private applySlotTint(slot: number, world: number): void {
    const tint = this.shadowTint;
    if (!tint) return;
    const t = this.worldData(world).shadowTint;
    if (t) tint.set(slot, t.color, t.amount, t.lift ?? 0);
    else tint.clear(slot);
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
      if (f) this.slotFocus.array[s]!.set(f[0] - this.focus.x, f[1] - this.focus.z, this.slotRays[s]!, 0);
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

  /** Knoten und Punkte des Bodenpfads in einem Rechteck (Ebene); Abschnitte ohne Level (Vorland, hinter dem Tor) zählen nicht. */
  groundCorridor(x0: number, z0: number, x1: number, z1: number): PathCorridor {
    const out: PathCorridor = { nodes: [], dots: [] };
    const k0 = this.layout.segmentAtDistance(-z1) - 1;
    const k1 = Math.min(this.layout.segmentAtDistance(-z0) + 1, this.layout.lastSegment);
    for (let k = Math.max(0, k0); k <= k1; k++) {
      const seg = this.path.segment(k);
      for (const n of seg.nodes) if (n.position[0] >= x0 && n.position[0] <= x1 && n.position[2] >= z0 && n.position[2] <= z1) out.nodes.push([n.position[0], n.position[2]]);
      for (const d of seg.dots) if (d.position[0] >= x0 && d.position[0] <= x1 && d.position[2] >= z0 && d.position[2] <= z1) out.dots.push([d.position[0], d.position[2]]);
    }
    return out;
  }

  // --- Fortschritt, Wachstum ------------------------------------------------------------------------------------

  /**
   * Knotenindex (0-basiert, gebrochen) an einer z-Koordinate aus der Weltenlage (ohne Pfad zu bauen), geklemmt auf
   * [−1, lastNode]: vor dem Start −1, hinter dem Tor der Torknoten.
   */
  nodeIndexAtZ(z: number): number {
    const k = this.layout.segmentAtDistance(-z);
    if (k > this.layout.lastSegment) return this.lastNode;
    const seg = this.layout.segment(k);
    if (seg.levels <= 0) return -1;
    const f = (seg.zStart - z) / Math.max(1e-6, seg.zStart - seg.zEnd);
    return Math.min(this.lastNode, seg.firstLevel - 1 + f * seg.levels - 0.5);
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
    const floor = this.growthFloor(chunk.cpu.mesh.world);
    this.vegetation.setSlotGrowth(chunk.slot, Math.max(g, floor.vegetation));
    (this.terrainGrowth as unknown as { array: number[] }).array[chunk.slot] = Math.max(g, floor.terrain);
  }

  private applyFeatureGrowth(): void {
    const arr = this.featureGrowth.array;
    this.featureRanges.forEach((r, i) => {
      if (i < arr.length) arr[i] = Math.max(this.growthOf(r), this.growthFloor(this.featureWorlds[i] ?? -1).terrain);
    });
  }

  /**
   * Grundbestand einer Welt vor der Heilung: 0 für die vermüllte Welt mit ganzem Müllfeld und vollem Neon-Schleier
   * (dystopisch, der Müll lichtet sich mit dem Fortschritt), sonst `GROWTH_FLOOR` / `TERRAIN_FLOOR` (Earle-Natur).
   */
  private growthFloor(world: number): { vegetation: number; terrain: number } {
    let f = this.floors.get(world);
    if (f) return f;
    const trash = world >= 0 ? this.worldData(world).params.trash : undefined;
    const dystopian = !!trash && !trash.pockets && trash.heals !== false && (trash.veil ?? 0) >= 0.8;
    f = dystopian ? { vegetation: 0, terrain: 0 } : { vegetation: GROWTH_FLOOR, terrain: TERRAIN_FLOOR };
    if (this.floors.size > 256) this.floors.clear();
    this.floors.set(world, f);
    return f;
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

  /** Blick-Welten der Überblendung (Himmel, Nebel, Wolken): A → B mit Anteil t. */
  get viewWorlds(): { a: number; b: number; t: number } {
    return { a: this.viewWorldA, b: this.viewWorldB, t: this.skyMix.value };
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
      this.mistStrength.value = w.valleyMist ?? 0;
      this.skyGlow.value = w.skyGlow ?? 0;
      this.setMistColor(world, world, 0);
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

  /** Talnebel-Farbe: hellste Nebelstufe der Welten A/B, gemischt (linear, wie die Paletten-Textur sie liefert). */
  private setMistColor(a: number, b: number, t: number): void {
    const lin = (w: number): [number, number, number] => {
      const fog = this.worldData(w).palette.fog ?? ['#ffffff'];
      const [r, g, bl] = hexToRgb8(fog[Math.min(5, fog.length - 1)] ?? '#ffffff');
      const f = (c: number) => {
        const x = c / 255;
        return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return [f(r), f(g), f(bl)];
    };
    const ca = lin(a);
    const cb = lin(b);
    this.mistColor.value.set(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t);
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
      this.mistStrength.value = (wa.valleyMist ?? 0) + ((wb.valleyMist ?? 0) - (wa.valleyMist ?? 0)) * t;
      this.skyGlow.value = (wa.skyGlow ?? 0) + ((wb.skyGlow ?? 0) - (wa.skyGlow ?? 0)) * t;
      this.setMistColor(this.viewWorldA, this.viewWorldB, t);
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

  /**
   * Höhe des gezeichneten Geländenetzes an (x, z): die Dreiecke des geladenen Chunks (Gitter n × n, Diagonale wie in
   * `generatePlaneChunk`), `null`, wenn der Chunk nicht geladen ist. Füße (Map-Wesen) stehen so auf dem Netz, das man
   * sieht — zwischen den Gitterpunkten weicht die glatte Höhe um einige Zentimeter ab.
   */
  meshHeightAt(x: number, z: number): number | null {
    // Letzter Chunk als Merker (der Schatten-Fit fragt tausendfach je Bild längs weniger Strahlen): gültig im selben
    // Bild, in dem Chunks nur in `update` kommen und gehen
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    let chunk: LoadedChunk | undefined;
    if (cx === this.meshMemo.cx && cz === this.meshMemo.cz && this.meshMemo.frame === this.frame) chunk = this.meshMemo.chunk ?? undefined;
    else {
      chunk = this.loaded.get(`${cx}:${cz}`);
      this.meshMemo.cx = cx;
      this.meshMemo.cz = cz;
      this.meshMemo.frame = this.frame;
      this.meshMemo.chunk = chunk ?? null;
    }
    if (!chunk) return null;
    const m = chunk.cpu.mesh;
    const n = m.n;
    const step = CHUNK_SIZE / (n - 1);
    const fx = (x - m.ox) / step;
    const fz = (z - m.oz) / step;
    const i = Math.min(n - 2, Math.max(0, Math.floor(fx)));
    const j = Math.min(n - 2, Math.max(0, Math.floor(fz)));
    const u = fx - i;
    const v = fz - j;
    const P = m.positions;
    const h = (ii: number, jj: number): number => P[(jj * n + ii) * 3 + 1]!;
    // Dreiecke (a, c, b) und (b, c, d) je Zelle: a = (i, j), b = (i + 1, j), c = (i, j + 1), d = (i + 1, j + 1)
    if (u + v <= 1) {
      const ha = h(i, j);
      return ha + u * (h(i + 1, j) - ha) + v * (h(i, j + 1) - ha);
    }
    const hd = h(i + 1, j + 1);
    return hd + (1 - u) * (h(i, j + 1) - hd) + (1 - v) * (h(i + 1, j) - hd);
  }

  /**
   * Lichtung unter der Kamera (seitlicher Radius, 0 = aus): Bäume und Requisiten treten weg, Felssäulen sinken in den
   * Boden — das untere Bildband der Karte bleibt ruhiger Boden, auch wenn sie über eine Felswand schwenkt.
   */
  setFootClear(units: number): void {
    this.vegetation.setFootClear(units);
    this.rockFootClear.value = Math.max(0, units);
  }

  /** Höchste Oberfläche an (x, z) für die Kamera: Gelände, Felsformationen, Wahrzeichen und Scheunen-Firste. */
  obstacleHeightAt(x: number, z: number): number {
    let h = this.field.surfaceHeightAt(x, z);
    for (const b of this.barnSpots) if (Math.hypot(x - b.x, z - b.z) < b.r) h = Math.max(h, b.top);
    return h;
  }

  isWater(x: number, z: number, margin = 0): boolean {
    return this.field.isWater(x, z, margin);
  }

  worldAt(x: number, z: number): number {
    return this.field.worldAt(x, z);
  }

  /** Höhe der höchsten Werfer über dem Boden (Schattenkamera). */
  get hTotal(): number {
    const top = this.terrainTop;
    return Math.max(top + this.vegetation.hMax + 1, top + this.landmarkTop + 1, top + this.landmarkSet.maxHeight + 1, 9);
  }

  /** Höchstes Gelände: Hügelamplitude aller Welten oder die geladenen Chunks (Steilhang in Welt 12, Hügelstaffel in Welt 11). */
  get terrainTop(): number {
    return Math.max(this.field.hMax, this.loadedTop);
  }

  /** Höchster Punkt der geladenen Chunks (bei jedem Neuaufbau des Inhalts). */
  private loadedTop = 0;
  /** Höchster Punkt der Chunks im Bild (je Frame). */
  private viewTop = 0;

  /** Höchstes Gelände im Bild (Empfänger der Schlagschatten: Steilhänge reichen über die Hügelamplitude). */
  get viewTerrainTop(): number {
    return Math.max(this.field.hMax, this.viewTop);
  }

  /** Richtung zur Sonne (Welt = Ebene, die Ebene dreht sich nicht): Vegetation und Wahrzeichen. */
  setSunDirection(dir: Vector3): void {
    this.rockSunDir.value.copy(dir);
    this.vegetation.setSunDirection(dir, dir);
    this.carpet.sunDir.value.copy(dir);
    this.landmarkSet.setSunDirection(dir);
  }

  /**
   * Sichtlinie Kamera → Ebenenpunkt (z. B. der aktuelle Knoten) frei halten: Bäume und Requisiten dazwischen schrumpfen
   * weg. `null` = aus.
   */
  setSightTarget(p: Vec3 | null, radius = 0.6): void {
    this.sightPlane = p ? [p[0], p[1], p[2]] : null;
    this.sightRadius = radius;
  }

  private sightPlane: Vec3 | null = null;
  private sightRadius = 0.6;

  /** Wahrzeichen im Bild (gebaut). */
  get landmarkList(): readonly LandmarkInstance[] {
    return this.landmarkInstances;
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
    this.firProj.value = (camera as Camera & { projectionMatrix: { elements: number[] } }).projectionMatrix.elements[5] ?? 2;
    camera.getWorldDirection(_w);
    this.firQuarter.value = viewQuarter(_w.x, _w.z);
    const R = this.options.radius;
    const t0 = performance.now();
    // Kamerafußpunkt in der Ebene und Horizont
    this.mapping.toFlatCpu(cameraWorld, _v);
    const camX = _v.x + this.focus.x;
    const camZ = _v.z + this.focus.z;
    const camDist = cameraWorld.length();
    const horizon = Math.acos(Math.min(1, R / Math.max(R + 0.01, camDist)));
    this.viewFoot.x = camX;
    this.viewFoot.z = camZ;
    this.viewHorizon = horizon;
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
    const hTop = this.terrainTop + 6;
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
    // Erste Füllung (Start, Qualitätswechsel im Lab): die nächsten Chunks sofort, bis FIRST_FILL_MS — der Rest folgt mit
    // dem normalen Budget über die nächsten Bilder (vorher alle in einem Bild: ≈ 250 ms bei 20 Chunks, M3)
    const firstFill = this.loaded.size === 0;
    for (const w of wanted) {
      const chunk = this.loaded.get(w.key);
      if (chunk && chunk.res === w.res) {
        chunk.lastSeen = this.frame;
        continue;
      }
      const over = firstFill ? loads > 0 && performance.now() - t0 > FIRST_FILL_MS : loads >= this.loadsPerFrame || performance.now() - t0 > this.loadBudgetMs;
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
    // Schnelles Schwenken: nicht mehr gewollte Chunks warten höchstens bis zur Obergrenze (älteste zuerst) — sonst
    // häufen sich Dutzende hinter dem Horizont (Speicher, Schattenpass)
    const lingerCap = wanted.length + LINGER_CHUNKS;
    if (this.loaded.size > lingerCap) {
      const stale = [...this.loaded.values()].filter((c) => c.lastSeen < this.frame).sort((a, b) => a.lastSeen - b.lastSeen);
      for (let i = 0; i < stale.length && this.loaded.size > lingerCap; i++) {
        this.unloadChunk(stale[i]!);
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
    // Chunks hinter dem Horizont (Bogen vom Kamerafuß, mit Rand für hohe Bäume und Felsen): ihr Gelände zeichnet nur
    // mit einer Kachel diesseits mit, ihr Inhalt (Bäume, Requisiten, Merkmale, Wahrzeichen) gar nicht — beim schnellen
    // Schwenken warten dort bis zu LINGER_CHUNKS Chunks, deren Arten sonst je Pass einen Aufruf kosteten
    const horizonReach = (horizon + 0.12) * R + CHUNK_SIZE * 0.75 + 8;
    const content: string[] = [];
    for (const chunk of this.loaded.values()) {
      const m = chunk.cpu.mesh;
      chunk.beyond = Math.hypot(m.ox + half - camX, m.oz + half - camZ) > horizonReach;
      if (!chunk.beyond) content.push(chunk.key);
    }
    const contentKeys = content.sort().join('|');
    if (contentKeys !== this.contentKeys) {
      this.contentKeys = contentKeys;
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
    // Kugel der Kacheln im Anzeigeraum (Haupt- und Schattenpass: three kullt mit der Geometrie-Kugel); Kacheln ganz hinter
    // dem Horizont bleiben aus — die Abbildung legte sie sonst an den Gegenpol, und ihre für den Schattenpass vergrößerte
    // Kugel hielte sie in beiden Pässen
    let visibleCount = 0;
    let viewTop = 0;
    for (const chunk of this.loaded.values()) {
      chunk.inView = this.chunkInView(chunk, frustum);
      if (!chunk.inView) continue;
      visibleCount++;
      viewTop = Math.max(viewTop, chunk.cpu.mesh.maxH);
    }
    this.viewTop = viewTop;
    this.rebuildTerrainTiles();
    for (const tile of this.terrainTiles.values()) this.updateTerrainTileBounds(tile);
    this.rebuildShadowTiles();
    for (const tile of this.shadowTiles.values()) this.updateTileBounds(tile, camX, camZ, horizonReach);
    this.stats.visible = visibleCount;
    // Nebelbänke (kein Schatten, nur der Hauptpass): zeichnen, wenn eine Bank diesseits des Horizonts im Bild liegt —
    // ihr Mesh ist durchsichtig und beidseitig (zwei Aufrufe)
    this.mist.mesh.visible = this.mistInView(frustum);
    // Welten der geladenen Chunks und des Inhalts bleiben belegt
    const inUse = new Set<number>();
    for (const chunk of this.loaded.values()) for (const w of chunk.cpu.mesh.worlds) inUse.add(w);
    inUse.add(this.viewWorldA);
    inUse.add(this.viewWorldB);
    for (const set of this.extraPins.values()) for (const w of set) inUse.add(w);
    for (const l of this.landmarkInstances) inUse.add(l.placement.world);
    this.slots.pin(inUse);
    this.landmarkSet.update(camera);
    this.mapping.toFlatCpu(cameraWorld, _v);
    // Fels-Mesh: Kamera im Objektraum (flach, relativ zu seinem Anker)
    if (this.rocks) this.rockCamLocal.value.set(_v.x - this.rocks.position.x, _v.y - this.options.radius, _v.z - this.rocks.position.z);
    this.barnCamLocal.value.set(_v.x - this.barns.mesh.position.x, _v.y - this.options.radius, _v.z - this.barns.mesh.position.z);
    this.driftCamLocal.value.set(_v.x - this.drifts.mesh.position.x, _v.y - this.options.radius, _v.z - this.drifts.mesh.position.z);
    camera.getWorldDirection(_w);
    this.mist.setCamera(_v.x - this.mist.mesh.position.x, _v.y - this.options.radius, _v.z - this.mist.mesh.position.z, _w.x, _w.z);
    this.vegetation.updateCamera(camera, _v.sub(this.vegetation.group.position).sub(this.plane.position));
    // Sichtlinie im Objektraum der Vegetation (Anker der Pools)
    const a = this.anchorOf(this.vegetation.group);
    const sp = this.sightPlane;
    this.vegetation.setSightLine(sp && a ? _w.set(sp[0] - a.x, sp[1], sp[2] - a.z) : null, this.sightRadius);
    return rebuilt;
  }

  /** Liegt eine Nebelbank diesseits des Horizonts im Bild (Kugel um ihre Mitte im Anzeigeraum, Länge und Dicke)? */
  private mistInView(frustum: Frustum): boolean {
    const R = this.options.radius;
    for (const b of this.mistBanks) {
      if (this.beyondHorizon(b.x, b.z, b.y + b.thickness, b.length * 0.5)) continue;
      _w.set(b.x - this.focus.x, R + b.y, b.z - this.focus.z);
      this.mapping.toDisplayCpu(_w, _sphere.center);
      _sphere.radius = b.length * 0.5 + b.thickness + 2;
      if (frustum.intersectsSphere(_sphere)) return true;
    }
    return false;
  }

  /**
   * Liegt ein Chunk diesseits des Horizonts im Bild (Kugel im Anzeigeraum, wie früher die Grenzkugel seiner Mesh, mit
   * 1,5 Rand für den Kamera-Ruck nach `update`)? Eine Gelände-Kachel zeichnet, sobald einer ihrer Chunks im Bild liegt.
   */
  private chunkInView(chunk: LoadedChunk, frustum: Frustum): boolean {
    if (chunk.beyond) return false;
    const R = this.options.radius;
    const half = CHUNK_SIZE / 2;
    const m = chunk.cpu.mesh;
    _w.set(m.ox + half - this.focus.x, R + (m.minH + m.maxH) * 0.5, m.oz + half - this.focus.z);
    this.mapping.toDisplayCpu(_w, _sphere.center);
    _sphere.radius = half * Math.SQRT2 + (m.maxH - m.minH) * 0.5 + 3;
    return frustum.intersectsSphere(_sphere);
  }

  /** Schatten-Kachel eines Chunks als geändert markieren (Neubau im nächsten `update`). */
  private markShadowTile(cx: number, cz: number): void {
    const tx = Math.floor(cx / SHADOW_TILE);
    const tz = Math.floor(cz / SHADOW_TILE);
    const key = `${tx}:${tz}`;
    let tile = this.shadowTiles.get(key);
    if (!tile) {
      tile = { key, tx, tz, mesh: null, dirty: true, minH: 0, maxH: 0 };
      this.shadowTiles.set(key, tile);
    }
    tile.dirty = true;
  }

  /**
   * Geänderte Schatten-Kacheln neu zusammensetzen (Positionen relativ zur Kachelecke, Normalen, Indizes) — beim Schwenken
   * höchstens alle paar Frames (neue Chunks laden am Rand, ihr Schatten darf kurz nachziehen), sonst sofort.
   */
  private rebuildShadowTiles(force = false): void {
    if (!force && this.frame - this.lastTileRebuild < TILE_REBUILD_FRAMES) return;
    let any = false;
    for (const tile of [...this.shadowTiles.values()]) {
      if (!tile.dirty) continue;
      tile.dirty = false;
      any = true;
      const parts: PlaneChunkMesh[] = [];
      for (let dz = 0; dz < SHADOW_TILE; dz++) {
        for (let dx = 0; dx < SHADOW_TILE; dx++) {
          const c = this.loaded.get(`${tile.tx * SHADOW_TILE + dx}:${tile.tz * SHADOW_TILE + dz}`);
          if (c) parts.push(c.cpu.mesh);
        }
      }
      if (tile.mesh) {
        tile.mesh.removeFromParent();
        tile.mesh.geometry.dispose();
        this.releaseObject(tile.mesh);
        tile.mesh = null;
      }
      if (parts.length === 0) {
        this.shadowTiles.delete(tile.key);
        continue;
      }
      const ox = tile.tx * SHADOW_TILE * CHUNK_SIZE;
      const oz = tile.tz * SHADOW_TILE * CHUNK_SIZE;
      let verts = 0;
      let idx = 0;
      for (const m of parts) {
        verts += m.vertexCount;
        idx += m.indices.length;
      }
      const pos = new Float32Array(verts * 3);
      const nor = new Float32Array(verts * 3);
      const index = new Uint32Array(idx);
      let v0 = 0;
      let i0 = 0;
      let minH = Infinity;
      let maxH = -Infinity;
      for (const m of parts) {
        const sx = m.ox - ox;
        const sz = m.oz - oz;
        for (let k = 0; k < m.vertexCount; k++) {
          pos[(v0 + k) * 3] = m.positions[k * 3]! + sx;
          pos[(v0 + k) * 3 + 1] = m.positions[k * 3 + 1]!;
          pos[(v0 + k) * 3 + 2] = m.positions[k * 3 + 2]! + sz;
        }
        nor.set(m.normals.subarray(0, m.vertexCount * 3), v0 * 3);
        for (let k = 0; k < m.indices.length; k++) index[i0 + k] = m.indices[k]! + v0;
        v0 += m.vertexCount;
        i0 += m.indices.length;
        minH = Math.min(minH, m.minH);
        maxH = Math.max(maxH, m.maxH);
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(pos, 3));
      geometry.setAttribute('normal', new BufferAttribute(nor, 3));
      geometry.setIndex(new BufferAttribute(index, 1));
      geometry.boundingSphere = new Sphere();
      if (!this.tileMaterial) {
        this.tileMaterial = new MeshBasicNodeMaterial();
        this.tileMaterial.name = 'planet-terrain-shadow';
        this.tileMaterial.positionNode = this.mapping.warp(positionLocal as unknown as Vec3Node);
      }
      const mesh = new Mesh(geometry, this.tileMaterial);
      mesh.name = `chunk-shadow-${tile.key}`;
      mesh.layers.set(PLANET_SHADOW_LAYER);
      mesh.castShadow = true;
      // Selbstschatten-Neigung wie das Gelände (der Schattenpass wählt danach sein Material)
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      mesh.userData.shadowGround = true;
      this.plane.add(mesh);
      this.anchorObject(mesh, ox, oz);
      tile.mesh = mesh;
      tile.minH = minH;
      tile.maxH = maxH;
    }
    if (any) this.lastTileRebuild = this.frame;
  }

  private lastTileRebuild = -1000;

  /** Grenzkugel einer Schatten-Kachel im Schattenraum (Ebene mit dem Kugelabfall um den Fokus, `displayShadowWarp`). */
  private updateTileBounds(tile: ShadowTile, camX: number, camZ: number, horizonReach: number): void {
    const mesh = tile.mesh;
    if (!mesh) return;
    const R = this.options.radius;
    const half = (SHADOW_TILE * CHUNK_SIZE) / 2;
    const cx = tile.tx * SHADOW_TILE * CHUNK_SIZE + half;
    const cz = tile.tz * SHADOW_TILE * CHUNK_SIZE + half;
    const beyond = Math.hypot(cx - camX, cz - camZ) > horizonReach + half * 0.5;
    mesh.visible = !beyond;
    if (beyond) return;
    const fx = cx - this.focus.x;
    const fz = cz - this.focus.z;
    const cy = (tile.minH + tile.maxH) * 0.5;
    const k = (1 + this.mapping.curvature.value) / (2 * R);
    const d = Math.hypot(fx, fz);
    const dMax = d + half * Math.SQRT2;
    const bs = mesh.geometry.boundingSphere ?? (mesh.geometry.boundingSphere = new Sphere());
    bs.center.set(half, cy - d * d * k, half);
    bs.radius = half * Math.SQRT2 + (tile.maxH - tile.minH) * 0.5 + 1.5 + (dMax * dMax - d * d) * k;
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
    const m = cpu.mesh;
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
    // Gift-Code je Welt (Müllstil; nur gelesen, wo ein Uferband giftig ist)
    const styleCache = new Map<number, number>();
    const styleOf = (w: number): number => {
      let c = styleCache.get(w);
      if (c === undefined) {
        const trash = this.worldData(w).params.trash as { style?: unknown } | undefined;
        c = trash ? toxicStyleCode(trash.style) : 0;
        styleCache.set(w, c);
      }
      return c;
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
      // Uferband (W7): Band 0..1 bzw. 2 − Band an Giftufern (stetig am Bandrand); dazu der Gift-Code der Welt
      tc[k * 4 + 2] = encodeShore(m.shore[k]!, m.toxic[k]!);
      tc[k * 4 + 3] = packTerrainFlags(m.feature[k * 4 + 3]!, m.swamp[k]!, styleOf(m.own[k]!));
      // Lippe: Pfadrisse auf der Seite des nächsten Abschnitts (größere Kennung = weiter vorn), seitliche auf der Bandseite
      tg[k] = slot + (this.lipOnLo(m, k) ? 0 : 0.5);
    }
    // Gezeichnet wird die Gelände-Kachel (je 2 × 2 Chunks ein Mesh, `rebuildTerrainTiles`)
    const chunk: LoadedChunk = { key, cx, cz, res, cpu, attrs: { ta, tb, tc, tg }, beyond: replaces?.beyond ?? false, inView: replaces?.inView ?? true, slot, lastSeen: this.frame, centreY: (m.minH + m.maxH) * 0.5, radius: CHUNK_SIZE * 0.72 };
    this.markShadowTile(cx, cz);
    this.markTerrainTile(cx, cz);
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

  private unloadChunk(chunk: LoadedChunk): void {
    this.slotsUsed[chunk.slot] = null;
    this.loaded.delete(chunk.key);
    this.markShadowTile(chunk.cx, chunk.cz);
    this.markTerrainTile(chunk.cx, chunk.cz);
  }

  /** Gelände-Kachel eines Chunks als geändert markieren (Neubau noch im selben `update`: kein Loch im Bild). */
  private markTerrainTile(cx: number, cz: number): void {
    const tx = Math.floor(cx / TERRAIN_TILE);
    const tz = Math.floor(cz / TERRAIN_TILE);
    const key = `${tx}:${tz}`;
    let tile = this.terrainTiles.get(key);
    if (!tile) {
      tile = { key, tx, tz, mesh: null, dirty: true, minH: 0, maxH: 0 };
      this.terrainTiles.set(key, tile);
    }
    tile.dirty = true;
  }

  /**
   * Geänderte Gelände-Kacheln neu zusammensetzen: Positionen relativ zur Kachelecke, Normalen, Gelände-Attribute und
   * Indizes der geladenen Chunks hintereinander — dieselben Vertices wie die einzelnen Chunks, ein Aufruf je Kachel.
   */
  private rebuildTerrainTiles(): void {
    for (const tile of [...this.terrainTiles.values()]) {
      if (!tile.dirty) continue;
      tile.dirty = false;
      const parts: LoadedChunk[] = [];
      for (let dz = 0; dz < TERRAIN_TILE; dz++) {
        for (let dx = 0; dx < TERRAIN_TILE; dx++) {
          const c = this.loaded.get(`${tile.tx * TERRAIN_TILE + dx}:${tile.tz * TERRAIN_TILE + dz}`);
          if (c) parts.push(c);
        }
      }
      if (tile.mesh) {
        tile.mesh.removeFromParent();
        tile.mesh.geometry.dispose();
        this.releaseObject(tile.mesh);
        tile.mesh = null;
      }
      if (parts.length === 0) {
        this.terrainTiles.delete(tile.key);
        continue;
      }
      const ox = tile.tx * TERRAIN_TILE * CHUNK_SIZE;
      const oz = tile.tz * TERRAIN_TILE * CHUNK_SIZE;
      let verts = 0;
      let idx = 0;
      for (const p of parts) {
        verts += p.cpu.mesh.vertexCount;
        idx += p.cpu.mesh.indices.length;
      }
      const pos = new Float32Array(verts * 3);
      const nor = new Float32Array(verts * 3);
      const ta = new Float32Array(verts * 4);
      const tb = new Float32Array(verts * 4);
      const tc = new Float32Array(verts * 4);
      const tg = new Float32Array(verts);
      const index = verts <= 65535 ? new Uint16Array(idx) : new Uint32Array(idx);
      let v0 = 0;
      let i0 = 0;
      let minH = Infinity;
      let maxH = -Infinity;
      for (const p of parts) {
        const m = p.cpu.mesh;
        const n = m.vertexCount;
        const sx = m.ox - ox;
        const sz = m.oz - oz;
        for (let k = 0; k < n; k++) {
          pos[(v0 + k) * 3] = m.positions[k * 3]! + sx;
          pos[(v0 + k) * 3 + 1] = m.positions[k * 3 + 1]!;
          pos[(v0 + k) * 3 + 2] = m.positions[k * 3 + 2]! + sz;
        }
        nor.set(m.normals.subarray(0, n * 3), v0 * 3);
        ta.set(p.attrs.ta, v0 * 4);
        tb.set(p.attrs.tb, v0 * 4);
        tc.set(p.attrs.tc, v0 * 4);
        tg.set(p.attrs.tg, v0);
        for (let k = 0; k < m.indices.length; k++) index[i0 + k] = m.indices[k]! + v0;
        v0 += n;
        i0 += m.indices.length;
        minH = Math.min(minH, m.minH);
        maxH = Math.max(maxH, m.maxH);
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(pos, 3));
      geometry.setAttribute('normal', new BufferAttribute(nor, 3));
      geometry.setAttribute('ta', new BufferAttribute(ta, 4));
      geometry.setAttribute('tb', new BufferAttribute(tb, 4));
      geometry.setAttribute('tc', new BufferAttribute(tc, 4));
      geometry.setAttribute('tg', new BufferAttribute(tg, 1));
      geometry.setIndex(new BufferAttribute(index, 1));
      geometry.boundingSphere = new Sphere();
      const mesh = new Mesh(geometry, this.terrainMaterial);
      mesh.name = `chunk-tile-${tile.key}`;
      // Schatten wirft der Stellvertreter (eigene Grenzkugel im Schattenraum); die Kachel kullt über ihre Chunks im Bild
      // (`updateTerrainTileBounds`), ihre Vertices liegen erst nach dem Verzug im Shader dort, wo sie zu sehen sind
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData.shadowGround = true;
      this.plane.add(mesh);
      this.anchorObject(mesh, ox, oz);
      tile.mesh = mesh;
      tile.minH = minH;
      tile.maxH = maxH;
    }
  }

  /**
   * Gelände-Kachel zeichnet, sobald einer ihrer Chunks diesseits des Horizonts im Bild liegt (dieselbe Kugel je Chunk
   * wie früher die Grenzkugel seiner Mesh; die Kachel wirft keinen Schatten, nur der Hauptpass zeichnet sie).
   */
  private updateTerrainTileBounds(tile: ShadowTile): void {
    const mesh = tile.mesh;
    if (!mesh) return;
    let show = false;
    for (let dz = 0; dz < TERRAIN_TILE && !show; dz++) {
      for (let dx = 0; dx < TERRAIN_TILE && !show; dx++) {
        const c = this.loaded.get(`${tile.tx * TERRAIN_TILE + dx}:${tile.tz * TERRAIN_TILE + dz}`);
        if (c?.inView) show = true;
      }
    }
    mesh.visible = show;
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
    let loadedTop = 0;
    for (const chunk of this.loaded.values()) {
      const withDots = nearSet.has(chunk.key);
      const m = chunk.cpu.mesh;
      loadedTop = Math.max(loadedTop, m.maxH);
      this.bounds.expandByPoint(_v.set(m.ox - this.focus.x, this.options.radius + m.minH, m.oz - this.focus.z));
      this.bounds.expandByPoint(_v.set(m.ox + CHUNK_SIZE - this.focus.x, this.options.radius + m.maxH, m.oz + CHUNK_SIZE - this.focus.z));
      // Inhalt nur diesseits des Horizonts (wartende Chunks hinter der Kamera tragen nichts bei)
      if (chunk.beyond) continue;
      for (const key of m.regions) regions.add(key);
      for (const tree of chunk.cpu.trees) {
        trees.push({ tree, slot: chunk.slot, withDots });
        const rf = this.field.features.peek(this.field.sample(tree.position[0], tree.position[2]).region.key);
        const spec = rf?.drifts ?? this.catalog.spec(tree.world).features?.drifts ?? null;
        // der Schnee-Ahorn trägt seinen Schneehügel selbst (trees/maple.ts)
        if (spec && tree.variant < (spec.trees ?? 1) && tree.kind !== 'maple') {
          const size = Math.min(1.7, Math.max(0.45, tree.canopyRadius * 0.42)) * (spec.size ?? 1);
          drifts.push({ position: [tree.position[0] - ax, tree.position[1], tree.position[2] - az], normal: tree.normal, size, yaw: tree.variant * 97.1, world: this.slots.slotOf(tree.world), slot: chunk.slot });
        }
      }
      for (const prop of chunk.cpu.props) {
        if (prop.kind === 'barn') {
          barns.push({ prop, world: this.slots.slotOf(prop.world), slot: chunk.slot });
          const spec = this.catalog.spec(prop.world).features?.drifts;
          if (spec && (spec.barns ?? 1) > 0) for (const d of barnDrifts(prop, (spec.size ?? 1) * (spec.barns ?? 1), chunk.slot, this.slots.slotOf(prop.world), ax, az)) drifts.push(d);
        } else props.push({ prop, slot: chunk.slot });
      }
    }
    this.loadedTop = loadedTop;
    this.vegetation.setContent(trees, props, { x: ax, z: az });
    this.anchorObject(this.vegetation.group, ax, az);
    this.landmarkTop = this.barns.set(barns, { x: ax, z: az });
    // Scheunen-Firste (Einheit: Scheunenmaßstab, First 1,12, halbe Länge ≈ 1)
    this.barnSpots = barns.map(({ prop }) => ({ x: prop.position[0], z: prop.position[2], r: 1.3 * prop.scale, top: prop.position[1] + 1.12 * prop.scale }));
    this.anchorObject(this.barns.mesh, ax, az);
    this.drifts.set(drifts);
    this.anchorObject(this.drifts.mesh, ax, az);
    this.mistBanks = this.mistPlan.in(regions);
    this.mist.set(this.mistBanks, { x: ax, z: az }, (w) => {
      const r = this.slots.rowsOfWorld(w);
      return r.mist ?? r.fog;
    });
    this.anchorObject(this.mist.mesh, ax, az);
    // Perspektivlinien (Bodenlinien-Welten): Fokus je Slot = Bildfokus der nächsten Region dieser Welt, verschoben um
    // `floorAnchor` (Ebene: Ost = voraus längs des Pfads, −z; Nord = quer, +x) — ein ferner Fluchtpunkt, auf den die
    // Strahlen wie Earles Perspektivlinien zulaufen
    const best = new Map<number, { d: number; f: [number, number] }>();
    for (const rk of regions) {
      const region = this.field.region(rk);
      const data = this.worldData(region.world);
      if (data.ground !== 'floorLines') continue;
      const f = this.field.regionSite(rk).focus;
      const d = Math.hypot(f[0] - this.focus.x, f[1] - this.focus.z);
      const slot = this.slots.slotOf(region.world);
      const prev = best.get(slot);
      const fa = data.floorAnchor;
      if (!prev || d < prev.d) best.set(slot, { d, f: [f[0] + (fa?.north ?? 0), f[1] - (fa?.east ?? 0)] });
    }
    for (const [slot, b] of best) this.slotFocusPlane[slot] = b.f;
    this.syncSlotFocus();
    // Wahrzeichen der geladenen Fläche (nur neu bauen, wenn sich die Menge ändert)
    this.rebuildLandmarks();
    // Felsen und Wasser der aktiven Regionen (ein Mesh je Schicht)
    const key = [...regions].sort().join('|') + `#${this.field.version}`;
    if (key !== this.activeRegionsKey) {
      this.activeRegionsKey = key;
      this.buildFeatureMeshes([...regions]);
    }
    if (!this.bounds.isEmpty()) this.bounds.expandByScalar(this.hTotal);
  }

  /** Wahrzeichen der geladenen Chunks: Menge bestimmen, bei Änderung neu bauen (Anker = gerundeter Fokus). */
  private rebuildLandmarks(): void {
    const lm = this.field.landmarks;
    if (!lm) return;
    let x0 = Infinity;
    let z0 = Infinity;
    let x1 = -Infinity;
    let z1 = -Infinity;
    for (const chunk of this.loaded.values()) {
      if (chunk.beyond) continue;
      const m = chunk.cpu.mesh;
      x0 = Math.min(x0, m.ox);
      z0 = Math.min(z0, m.oz);
      x1 = Math.max(x1, m.ox + CHUNK_SIZE);
      z1 = Math.max(z1, m.oz + CHUNK_SIZE);
    }
    const list = x0 < x1 ? lm.inRect(x0, z0, x1, z1) : [];
    const key = list.map((l) => l.placement.id).sort().join('|') + `#${lm.version}`;
    if (key === this.landmarkKey) return;
    this.landmarkKey = key;
    this.landmarkInstances = list;
    this.landmarkOrigin.x = Math.round(this.focus.x);
    this.landmarkOrigin.z = Math.round(this.focus.z);
    this.landmarkSet.build(list);
    this.anchorObject(this.landmarkSet.group, this.landmarkOrigin.x, this.landmarkOrigin.z);
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
    const regions: RegionFeatures[] = regionKeys.map((k) => this.field.features.region(k)).filter((r) => r.lakes.length + r.rivers.length + r.seas.length + r.formations.length > 0);
    const ranges: Array<[number, number]> = [];
    const worlds: number[] = [];
    const waterInputs: WaterRegionInput[] = [];
    const formations: Array<{ f: RegionFeatures['formations'][number]; feature: number }> = [];
    for (const r of regions) {
      const z0 = Math.min(...[...r.lakes.map((l) => l.cz - l.reach), ...r.formations.map((f) => f.cz - f.footprint), ...r.rivers.flatMap((v) => v.points.map((p) => p[1])), ...r.seas.map((m) => m.zBottom)]);
      const z1 = Math.max(...[...r.lakes.map((l) => l.cz + l.reach), ...r.formations.map((f) => f.cz + f.footprint), ...r.rivers.flatMap((v) => v.points.map((p) => p[1])), ...r.seas.map((m) => m.zTop)]);
      const range = this.nodeRangeFor(z0, z1);
      const bodies = r.lakes.length + r.rivers.length + r.seas.length;
      if (bodies > 0) {
        waterInputs.push({ lakes: r.lakes, rivers: r.rivers, seas: r.seas, slot: this.slots.slotOf(r.world), featureBase: ranges.length, toxicStyle: toxicStyleCode((this.worldData(r.world).params.trash as { style?: unknown } | undefined)?.style) });
        for (let i = 0; i < bodies; i++) {
          ranges.push(range);
          worlds.push(r.world);
        }
      }
      for (const f of r.formations) {
        formations.push({ f, feature: ranges.length });
        ranges.push(range);
        worlds.push(f.world);
      }
    }
    this.featureRanges = ranges.slice(0, this.featureGrowth.array.length);
    this.featureWorlds = worlds.slice(0, this.featureGrowth.array.length);
    this.applyFeatureGrowth();
    const horses: HorsePlacement[] = [];
    for (const { f } of formations) {
      if (!f.herd) continue;
      const slot = this.slots.slotOf(f.world);
      const row = this.slots.rowsOf(slot).accent;
      for (const [a, b, flip] of f.herd) {
        const x = f.cx + a;
        const z = f.cz + b;
        horses.push({ x, y: this.field.heightAt(x, z), z, size: 0.62, flip, row, slot });
      }
    }
    this.horses.set(horses, { x: ax, z: az });
    this.anchorObject(this.horses.mesh, ax, az);
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

  /**
   * Steht etwas an Ebenenpunkt (x, z), `top` Einheiten über der Kugel (Boden + Höhe), mit waagrechter Ausdehnung `reach`
   * für die Kamera des letzten `update` ganz hinter dem Horizont der Anzeigekugel? Ein Gegenstand der Höhe H lugt bis
   * acos(R / (R + H)) über den Horizont (Bogen vom Kamerafuß); dazu 0,05 rad Rand. Vor dem ersten `update`: nie.
   */
  beyondHorizon(x: number, z: number, top: number, reach = 0): boolean {
    if (this.viewHorizon < 0) return false;
    const R = this.options.radius;
    const arc = Math.hypot(x - this.viewFoot.x, z - this.viewFoot.z) - reach;
    const peek = Math.acos(R / (R + Math.max(0, top)));
    return arc / R > Math.min(Math.PI * 0.9, this.viewHorizon + peek + 0.05);
  }

  private readonly meshMemo: { cx: number; cz: number; frame: number; chunk: LoadedChunk | null } = { cx: 0, cz: 0, frame: -1, chunk: null };

  /** Kamerafuß in der Ebene und Horizontwinkel des letzten `update` (−1 = noch keins). */
  private readonly viewFoot = { x: 0, z: 0 };
  private viewHorizon = -1;

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
    return { chunks: this.loaded.size, cpu: this.cache.size, regions: this.field.features.size, slots: this.slots.entries().length };
  }

  /** Letzter spielbare Knoten der Autorenroute (0-basiert). */
  get lastAuthoredNode(): number {
    return this.layout.authoredLevels - 1;
  }

  /** Letzter Knoten überhaupt (0-basiert): der Torknoten der angedeuteten Zone; mit `procedural` ∞. */
  get lastNode(): number {
    return this.layout.lastLevel - 1;
  }

  /** Knoten des Bodenpfads (Kurzform). */
  pathNode(index: number): PlanePathNode {
    return this.path.node(index);
  }

  dispose(): void {
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    this.rebuildTerrainTiles();
    this.rebuildShadowTiles(true);
    this.tileMaterial?.dispose();
    for (const o of this.landmarks.values()) o.removeFromParent();
    this.landmarks.clear();
    this.vegetation.dispose();
    this.landmarkSet.dispose();
    this.barns.dispose();
    this.drifts.dispose();
    this.horses.dispose();
    this.mist.dispose();
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
    view: proceduralView(dom.view ?? DEFAULT_VIEW),
    ...((A.valleyMist ?? 0) + (B.valleyMist ?? 0) > 0 ? { valleyMist: (A.valleyMist ?? 0) + ((B.valleyMist ?? 0) - (A.valleyMist ?? 0)) * t } : {}),
    ...((A.skyGlow ?? 0) + (B.skyGlow ?? 0) > 0 ? { skyGlow: (A.skyGlow ?? 0) + ((B.skyGlow ?? 0) - (A.skyGlow ?? 0)) * t } : {}),
    ...(dom.shadowTint ? { shadowTint: dom.shadowTint } : {}),
    procedural: true,
  };
}

/** Ansicht einer prozeduralen Welt: wie die Elternwelt, aber ohne deren Einzelkomposition (Untersicht, Sonne, Versatz). */
function proceduralView(v: WorldView): WorldView {
  const rest: WorldView = { ...v };
  delete rest.lookHeight;
  delete rest.sun;
  delete rest.aim;
  delete rest.lookSide;
  delete rest.portrait;
  return rest;
}

export { SLOT_ROWS, isTreeKind };
