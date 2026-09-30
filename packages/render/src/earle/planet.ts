import { Box3, BufferAttribute, BufferGeometry, Frustum, Group, Matrix4, Mesh, Object3D, Quaternion, Sphere, Vector3, Vector4 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { abs, acos, asin, atan, attribute, clamp, cos, dot, float, fract, int, max, mix, modelViewMatrix, normalGeometry, normalView, normalize, positionGeometry, positionLocal, positionView, select, sin, smoothstep, step, uniform, uniformArray, varying, vec4 } from 'three/tsl';
import {
  PlanetField,
  chunkAngularRadius,
  chunkDirection,
  chunkKey,
  chunkList,
  frameAt,
  offsetDir,
  generateChunkMesh,
  scatterChunkProps,
  scatterChunkTrees,
  spiralPath,
  type ChunkId,
  type ChunkMeshData,
  type LandmarkSlot,
  type PlanetLandmarkParams,
  type PlanetProp,
  type PlanetTree,
  type PlanetWorldParams,
  type PlanetZoneParams,
  type SpiralPath,
  type Vec3,
} from '@ee/world';
import { EarleMaterial } from './EarleMaterial';
import { aaSaw, earleGradients } from './gradients';
import type { ShadowTint } from '../shadow/shadowTint';
import { PaletteAtlas, addWorldPalette, hexToRgb8, worldPaletteFromZone, type WorldPalette, type WorldRows, type ZonePalette } from './palette';
import { GROWTH_SLOTS, PlanetVegetation, type VegetationPropEntry, type VegetationTreeEntry, type VegetationWorldRows } from './planetVegetation';
import { PaletteLookup, aaStep, arrayElement, createFogSettings, patternTime, stripeMask, type FloatNode, type FogSettings, type TSLUniform, type UniformArrayLike, type Vec3Node, type Vec4Node } from './tsl';
import { createWaterMaterial } from './water/waterSurface';
import { buildWaterGeometry, waterGeometry } from './water/waterMesh';
import { buildRockGeometry, createRockMaterial, rockGeometry } from './landmarks/rocks';
import { BarnLandmarks } from './landmarks/barn';
import { DriftLandmarks, type DriftPlacement } from './landmarks/drifts';

export interface EarlePlanetZone {
  id: string;
  palette: ZonePalette;
  params: PlanetZoneParams;
}

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

export interface EarlePlanetWorld {
  id: string;
  name: string;
  palette: WorldPalette;
  params: PlanetWorldParams;
  ground: GroundTreatment;
  /** Stärke der Nebelstreifen 0..1. */
  fogStripes: number;
  fog: { start: number; range: number };
  view: WorldView;
  /**
   * Schattentönung der Welt (Earle: Schatten auf Schnee blau, Bild 05; auf der goldenen Wiese tiefes Oliv): Farbe und
   * Anteil 0..1, mit dem die Tintenform auf dem Gelände (und Wehen, Pfad) zur Tönung gemischt wird. Fehlt → Tinte.
   */
  shadowTint?: { color: string; amount: number; lift?: number };
  /** Talnebel 0..1 (Ebene 20, Bild 03): helle Nebelbank am Talgrund, nach oben ausdünnend. Fehlt → 0. */
  valleyMist?: number;
  /** Leuchtender Horizont 0..1 (Ebene 16: heller Schein hinter den Baumreihen, am Horizont rundum). Fehlt → 0. */
  skyGlow?: number;
}

export interface EarlePlanetQuality {
  chunkRes: number;
  dotsPerTree: [number, number];
  collapsePx: number;
  /** Multiplikator auf die Zonendichten (Bäume, Requisiten, Tiere). */
  densityScale: number;
  /** Nur die N kameranächsten Chunks bekommen Punkte. */
  nearChunks: number;
  capacity: { trees: number; dots: number; props: number; animals: number };
}

export interface EarlePlanetOptions {
  radius: number;
  seed: number;
  chunksPerFace: number;
  /** Story-Zonen (Breitenbänder, Nord → Süd). */
  zones: EarlePlanetZone[];
  /** Zehn Welten; fehlt die Liste, ist jede Zone ihre eigene Welt. */
  worlds?: EarlePlanetWorld[];
  quality: EarlePlanetQuality;
  hillWavelength?: number;
  path: { nodesPerZone: number; turns?: number; clearNode: number; clearPath: number };
  /** Chunks, die pro Frame höchstens erzeugt werden (CPU-Spitzen verteilen). */
  loadsPerFrame?: number;
  /** Frames, nach denen ein unsichtbarer Chunk entladen wird. */
  unloadAfterFrames?: number;
  /** Breite der Zonen-Risse in Welteinheiten. */
  crackWidth?: number;
  landmarks?: PlanetLandmarkParams[];
  nearHalfWidthDeg?: number;
  /** Müll-Dichtefaktor (Startwelt). */
  trashScale?: number;
  /**
   * Schattentönung je Welt (`SunRig.shadowTint`): der Planet schreibt die Tönungen der Welten hinein und tönt damit
   * die Tintenform von Gelände und Schneewehen. Fehlt → ungetönte Tinte.
   */
  shadowTint?: ShadowTint | null;
}

interface ChunkCpu {
  mesh: ChunkMeshData;
  trees: PlanetTree[];
  props: PlanetProp[];
  /** Knotenbereich [i0, i1] des Chunks für das Wachstum. */
  nodeRange: [number, number];
}

interface LoadedChunk {
  key: string;
  cpu: ChunkCpu;
  mesh: Mesh;
  slot: number;
  lastSeen: number;
}

/** Bodenornament je Behandlung (Wiese, Rampen und Schneegrate leben von Form und Bändern, nicht von Linien). */
const GROUND_KIND: Record<GroundTreatment, number> = { smooth: 0, meadow: 0, ramps: 0, snowRidges: 0, snowLines: 1, floorLines: 2 };
const DEFAULT_VIEW: WorldView = { height: 9, forward: 8, look: 4, fov: 70, curvature: 0 };
const _v = new Vector3();
const _c = new Vector3();
const _sphere = new Sphere();
const _q = new Quaternion();
const _q2 = new Quaternion();
const _s = new Vector3();
const _Y = new Vector3(0, 1, 0);

/**
 * Der rotierbare Planet: Cube-Sphere-Chunks (Laden/Entladen nach Sichtbarkeit, deterministisch je Chunk),
 * vier Story-Zonen mit Rissen an den Grenzen, zehn Welten (Palettenzeilen, Bodenornament, Vegetation, Requisiten)
 * als Spiralstreifen um den Pfad und auf der Gegenseite, Spiralpfad mit allen Knoten, Vegetation in festen Pools,
 * Wachstum je Chunk aus dem Pfadfortschritt, Himmel/Nebel folgen der Welt unter dem Blickpunkt (Überblendung).
 * `group` gehört unter das rotierende Planeten-Objekt.
 */
export class EarlePlanet {
  readonly group = new Group();
  readonly field: PlanetField;
  readonly atlas = new PaletteAtlas();
  readonly lookup: PaletteLookup;
  /** Palettenzeilen je Welt-Index. */
  readonly rows: WorldRows[];
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
  /** Krümmungs-Boost (0 = echte Kugel) und Blickrichtung im Planetenraum für den Warp. */
  readonly curvature = uniform(0);
  readonly lookDirLocal = uniform(new Vector3(0, 1, 0));
  /** Levelpfad (Spirale; Abschnitte können überschrieben werden, z. B. der Baumpfad). */
  path: SpiralPath;
  readonly vegetation: PlanetVegetation;
  /** Vereinigung der geladenen Chunks (Planetenraum) inkl. Vegetationshöhe, für die Schattenkamera. */
  readonly bounds = new Box3();
  readonly terrainBands = uniform(4);
  readonly canopyBands = uniform(3);
  readonly crackClosed: boolean[];
  readonly angularRadius: number;
  private readonly crackWidths: TSLUniform[];
  private readonly crackWidth: number;
  private readonly terrainMaterial: EarleMaterial;
  /**
   * Alle Felsformationen des Planeten in einem Mesh (ein Draw Call je Pass; wenige tausend Dreiecke, die Formationen
   * stehen fest). `null`, wenn keine Welt Felsen hat.
   */
  rocks: Mesh | null = null;
  /** Alle Seen und Flüsse in einem Mesh (flach auf dem Wasserspiegel, empfängt Schatten). */
  water: Mesh | null = null;
  private readonly rockMaterial: EarleMaterial;
  private readonly waterMaterial: EarleMaterial;
  /** Alle Scheunen (Fokus + gestreute) als eigene Wahrzeichen. */
  readonly barns: BarnLandmarks;
  /** Schneewehen am Baumfuß in den Schneewelten. */
  readonly drifts: DriftLandmarks;
  /** Höchster Aufbau der geladenen Wahrzeichen (Scheunenfirst) für die Schattenkamera. */
  private landmarkTop = 0;
  /** Wachstum je Merkmal (Seen, Flüsse, Formationen) und ihr Knotenbereich. */
  /** Plätze im Wachstums-Array der Merkmale (fest, damit neu geplante Merkmale keinen Shader-Umbau brauchen). */
  private readonly featureCapacity: number;
  private featureVersion = 0;
  private readonly featureGrowth: UniformArrayLike;
  private featureRanges: Array<[number, number]> = [];
  /** Chunks, in die Felsen bzw. Gewässer reichen: ohne geladenen Chunk bleiben die Meshes unsichtbar (spart Draw Calls). */
  private readonly rockChunks = new Set<string>();
  private readonly waterChunks = new Set<string>();
  private readonly ids: ChunkId[];
  private readonly centres: Vector3[];
  private readonly loaded = new Map<string, LoadedChunk>();
  private readonly cache = new Map<string, ChunkCpu>();
  private readonly slots: Array<string | null> = new Array<string | null>(GROWTH_SLOTS).fill(null);
  private readonly loadsPerFrame: number;
  private readonly unloadAfter: number;
  private progressDone = 0;
  private frame = 0;
  private nearKeys = '';
  private contentDirty = true;
  private lastRebuild = -1000;
  private trashScale: number;
  /** Wachstum je Slot für das Terrain (die Vegetation hält ein eigenes Array mit denselben Werten). */
  private readonly terrainGrowth = uniformArray(new Array<number>(GROWTH_SLOTS).fill(1), 'float');
  private readonly invPlanet = new Matrix4();
  private readonly landmarks = new Map<string, Object3D>();
  /** Blick-Welt und Überblendung (Himmel/Nebel/Streifen). */
  private viewWorldA = 0;
  private viewWorldB = 0;
  private viewBlend = 0;
  private fogStart = 12;
  private fogRange = 22;
  /**
   * Nebel-Versatz (Welteinheiten) für die aktuelle Kamera: Die Nebelwerte der Welten gelten für eine Kamera
   * ≈ 9 Einheiten vor dem Blickpunkt; höhere Kameras (Hügelblick, Karte) schieben den Nebel um ihren Mehrabstand
   * nach hinten, damit die Wertstufen im Mittel- und Hintergrund liegen und nicht schon am Vordergrund.
   */
  private fogOffset = 0;
  /**
   * Schleier über Nachbarwelten: zusätzliche Nebeldistanz (Welteinheiten) für alles, was nicht zur Blick-Welt gehört.
   * Fremde Welten lesen so als ferne Wertstufen im Nebel der eigenen Welt (Earle: ein Bild, ruhige Hintergrundbänder)
   * statt als bunte Flecken im Bild; beim Drehen wandert der Schleier mit der Überblendung. 0 = aus.
   */
  readonly veilDistance = uniform(24);
  private readonly veilWorldA = uniform(0);
  private readonly veilWorldB = uniform(0);

  constructor(readonly options: EarlePlanetOptions) {
    if (options.zones.length < 1) throw new Error('EarlePlanet needs zones');
    this.group.name = 'EarlePlanet';
    this.loadsPerFrame = options.loadsPerFrame ?? 2;
    this.unloadAfter = options.unloadAfterFrames ?? 45;
    this.crackWidth = options.crackWidth ?? 0.55;
    this.trashScale = options.trashScale ?? 1;

    // Welten: explizit oder eine je Zone (Altformat)
    this.worlds =
      options.worlds && options.worlds.length > 0
        ? options.worlds
        : options.zones.map((z, i) => ({
            id: z.id,
            name: z.id,
            palette: worldPaletteFromZone(z.palette),
            params: { id: z.id, zone: i, side: 'near' as const, terrain: { amplitude: z.params.hillAmplitude }, vegetation: z.params.vegetation },
            ground: 'smooth' as const,
            fogStripes: 1,
            fog: { start: 12, range: 22 },
            view: DEFAULT_VIEW,
          }));

    this.field = new PlanetField({
      radius: options.radius,
      seed: options.seed,
      chunksPerFace: options.chunksPerFace,
      zones: options.zones.map((z) => z.params),
      worlds: this.worlds.map((w) => w.params),
      ...(options.hillWavelength !== undefined ? { hillWavelength: options.hillWavelength } : {}),
      ...(options.path.turns !== undefined ? { spiral: { turns: options.path.turns } } : {}),
      ...(options.landmarks ? { landmarks: options.landmarks } : {}),
      ...(options.nearHalfWidthDeg !== undefined ? { nearHalfWidthDeg: options.nearHalfWidthDeg } : {}),
    });
    // Wasser-/Felszeilen nur für Welten, die Gewässer bzw. Felsen haben (Atlas hat 128 Zeilen für alle Agenten)
    const feat = this.field.features;
    this.rows = this.worlds.map((w, i) =>
      addWorldPalette(this.atlas, w.palette, w.id, {
        water: feat.lakes.some((l) => l.world === i) || feat.rivers.some((r) => r.world === i),
        rock: feat.formations.some((f) => f.world === i),
      }),
    );
    this.lookup = new PaletteLookup(this.atlas.texture, this.atlas.width, this.atlas.height);
    const first = this.worlds[0]!;
    this.fogStart = first.fog.start;
    this.fogRange = first.fog.range;
    this.fog = createFogSettings({ row: this.rows[0]!.fog, rowB: this.rows[0]!.fog, steps: 5, start: this.fogStart, range: this.fogRange });
    this.skyRowA = uniform(this.rows[0]!.sky);
    this.skyRowB = uniform(this.rows[0]!.sky);
    this.skyMix = uniform(0);
    this.stripeStrength.value = first.fogStripes;
    this.mistStrength.value = first.valleyMist ?? 0;
    this.skyGlow.value = first.skyGlow ?? 0;
    this.setMistColor(0, 0, 0);
    this.crackClosed = options.zones.map(() => false);
    this.crackWidths = options.zones.slice(0, -1).map(() => uniform(this.crackWidth));
    this.angularRadius = chunkAngularRadius(options.chunksPerFace);
    this.ids = chunkList(options.chunksPerFace);
    this.centres = this.ids.map((id) => {
      const d: Vec3 = [0, 0, 0];
      chunkDirection(id, options.chunksPerFace, 0, 0, d);
      return new Vector3(d[0], d[1], d[2]);
    });

    this.path = spiralPath(this.field, { nodesPerZone: options.path.nodesPerZone });

    // --- Krümmungs-Warp (Perspektiv-Boost): ferne Erde sinkt radial um (1 − cos θ)·c·R ab (θ = Winkel zum
    // Blickpunkt → effektiver Krümmungsradius R / (1 + c)); dieselbe Formel für Terrain, Vegetation, Requisiten
    // und den Schattenpass (Caster und Empfänger konsistent gebogen).
    const R = options.radius;
    const warp = (p: Vec3Node): Vec3Node => this.bendNode(p);

    // --- Terrainmaterial (geteilt): Zeile je Welt, Riss je Grenze, Wachstum je Slot, Bodenornament ---------
    const zones = options.zones.length;
    const tables = this.field.tables;
    // Tabellen gepackt (WebGPU: höchstens 12 Uniform-Puffer je Stufe, jedes uniformArray ist einer):
    // je Zone (nahe A, nahe B, ferne A, ferne B) + Teilung; je Welt A = (Terrainzeile, Bodenart, Linienstufe, Meißel),
    // B = (Wasserzeile, Schneezeile, Schneefelder an, Felszeile)
    const nearB0 = tables.nearWorldB ?? tables.nearWorld.map(() => -1);
    const zoneTable = uniformArray(
      tables.nearWorld.map((v, z) => new Vector4(v, nearB0[z] ?? -1, tables.farWorldA[z] ?? v, tables.farWorldB[z] ?? -1)),
      'vec4',
    ) as unknown as UniformVec4ArrayLike;
    const farSplitTable = uniformArray(tables.farSplit.map((v) => v), 'float') as unknown as UniformArrayLike;
    // Linienfarbe: Schneestreifen eine Stufe dunkler als der Schnee; Bodenlinien des Juwelenwalds (Ebene_3) dunkel auf
    // dunklem Grund — nur zwei Stufen heller als die Bodentinte
    const worldA = uniformArray(
      this.worlds.map((w, i) => new Vector4(this.rows[i]!.terrain, GROUND_KIND[w.ground], w.ground === 'floorLines' ? (w.palette.groundLine ? 6 : 4) : 1, this.field.features.chisel[i] ?? 0)),
      'vec4',
    ) as unknown as UniformVec4ArrayLike;
    const worldB = uniformArray(
      this.worlds.map((w, i) => new Vector4(this.rows[i]!.water, this.rows[i]!.snow, w.palette.snow && this.field.features.snow[i] ? 1 : 0, this.rows[i]!.rock)),
      'vec4',
    ) as unknown as UniformVec4ArrayLike;
    const cosHalfWidth = uniform(this.field.cosHalfWidth);
    // Gepackte Vertex-Attribute (WebGPU ≤ 8 Puffer): ta = (Zone, Grenzabstand, Grenz-ID, Slot), tb = (cos Δ, sin Δ, Höhe, 0)
    const ta = attribute('ta', 'vec4');
    const tb = attribute('tb', 'vec4');
    const zoneCoord = ta.x;
    const side = tb.xy;
    const zoneIndex = zoneCoord.floor().clamp(0, zones - 1);
    const zt = vec4Element(zoneTable, zoneIndex);
    const nearA = zt.x;
    const nearB = zt.y;
    const farA = zt.z;
    const farB = zt.w;
    const half = zoneCoord.sub(zoneIndex).lessThan(arrayElement(farSplitTable, zoneIndex));
    const near = select(nearB.lessThan(-0.5).or(half), nearA, nearB);
    const far = select(farB.lessThan(-0.5).or(half), farA, farB);
    const worldIndex = select(side.x.greaterThan(cosHalfWidth), near, far);
    const wa = vec4Element(worldA, worldIndex);
    const wb = vec4Element(worldB, worldIndex);
    const rowNode = wa.x;
    const border = ta.y;
    const borderId = ta.z;
    let width: FloatNode = float(0);
    for (let i = this.crackWidths.length - 1; i >= 0; i--) {
      width = select(borderId.lessThan(i + 0.5), this.crackWidths[i]!, width) as unknown as FloatNode;
    }
    width = select(borderId.lessThan(-0.5), float(0), width) as unknown as FloatNode;
    // Riss als Earle-Spalte statt Band: Zickzack-Breite entlang der Grenze (Koordinate ≈ Länge × Radius, die Grenzen
    // laufen als Breitenkreise), tiefe Tinte innen, eine helle Abbruchkante (Lippe) auf der Nordseite.
    // Geschlossener Riss (Breite 0) darf keine Restlinie zeigen.
    const pc = normalize(positionGeometry);
    const along = atan(pc.z, pc.x).mul(cos(asin(clamp(pc.y, -0.999, 0.999)))).mul(R * 0.9);
    const tri = abs(fract(along).mul(2).sub(1));
    const tri2 = abs(fract(along.mul(2.7).add(0.37)).mul(2).sub(1));
    const jag = width.mul(float(0.45).add(tri.mul(0.4)).add(tri2.mul(0.25)));
    const open = step(0.001, width);
    const zoneCrack = aaStep(jag, border).oneMinus().mul(open);
    const north = zoneCoord.sub(zoneCoord.floor()).lessThan(0.5); // Grenze liegt unter (südlich von) diesem Punkt
    const zoneLip = aaStep(jag, border).mul(aaStep(jag.add(0.07), border).oneMinus()).mul(open).mul(select(north, float(1), float(0)));
    // Weltgrenzen innerhalb einer Zone (Pfadseite ↔ Gegenseite, Nord-/Südhälfte) als schmalere, immer offene
    // Spalten: Nachbarwelten liegen hinter einer klaren Kante statt ineinander zu verlaufen.
    const hw = Math.acos(Math.max(-1, Math.min(1, this.field.cosHalfWidth)));
    const cosLat = float(1).sub(pc.y.mul(pc.y)).max(0).sqrt();
    const deltaAbs = abs(atan(side.y, side.x));
    const dSide = abs(deltaAbs.sub(hw)).mul(cosLat).mul(R);
    const hasB = select(side.x.greaterThan(cosHalfWidth), nearB, farB).greaterThan(-0.5);
    const zoneFrac = zoneCoord.sub(zoneIndex);
    const dHalf = select(hasB, abs(zoneFrac.sub(arrayElement(farSplitTable, zoneIndex))).mul((Math.PI / zones) * R), float(1e4));
    const alongW = select(dSide.lessThan(dHalf), asin(clamp(pc.y, -0.999, 0.999)).mul(R * 0.9), along);
    const triW = abs(fract(alongW.mul(1.3)).mul(2).sub(1));
    const worldGap = float(hw < Math.PI - 1e-3 ? 1 : 0); // ohne Weltenliste (Altformat) keine Weltgrenzen
    const wWorld = float(0.32).mul(float(0.5).add(triW.mul(0.5))).mul(worldGap);
    const dWorld = dSide.min(dHalf);
    const worldCrack = aaStep(wWorld, dWorld).oneMinus().mul(worldGap);
    const nearSide = side.x.greaterThan(cosHalfWidth);
    const lipSide = select(dSide.lessThan(dHalf), select(nearSide, float(1), float(0)), select(zoneFrac.lessThan(arrayElement(farSplitTable, zoneIndex)), float(1), float(0)));
    const worldLip = aaStep(wWorld, dWorld).mul(aaStep(wWorld.add(0.06), dWorld).oneMinus()).mul(lipSide).mul(worldGap);
    const crack = max(zoneCrack, worldCrack);
    const lip = max(zoneLip, worldLip);
    const slotAttr = ta.w;
    const growthNode = (this.terrainGrowth as unknown as { element(i: unknown): FloatNode }).element(int(slotAttr));

    // Bodenornament im Planetenraum (nie Screen-Space): Schneelinien (Breitenkreise), Schneegrat-Streifen
    // (Meridiane), Perspektivlinien (Strahlen + Ringe um den Weltmittelpunkt des Juwelenwalds)
    const heightAttr = tb.z;
    const p = positionGeometry;
    const d = normalize(p);
    const lat = asin(clamp(d.y, -0.999, 0.999));
    const lon = atan(d.z, d.x);
    const flat = smoothstep(0.86, 0.97, dot(normalGeometry, d));
    const drift = patternTime.mul(0.02);
    // Schneestreifen (Meridiane → waagrechte Bänder im Blick längs des Weltbands, Bilder 05/08) und Perspektivlinien
    // (Strahlen + Ringe um den Mittelpunkt des Juwelenwalds, Bild 10). Eine Streifenfunktion für Schnee/Strahlen
    // (Koordinate je Art), eine für die Ringe.
    const kind = wa.y;
    const isSnow = kind.lessThan(1.5);
    const snowCoord = lon.mul(cos(lat)).mul(R / 0.7).add(drift);
    const anchorIdx = this.worlds.findIndex((w) => w.ground === 'floorLines');
    const anchor = this.field.worldCenterDir(Math.max(0, anchorIdx));
    const a = new Vector3(anchor[0], anchor[1], anchor[2]);
    const e1 = new Vector3().crossVectors(a, _Y);
    if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0);
    e1.normalize();
    const e2 = new Vector3().crossVectors(a, e1).normalize();
    const anchorU = uniform(a);
    const e1U = uniform(e1);
    const e2U = uniform(e2);
    const ang = acos(clamp(dot(d, anchorU), -1, 1));
    const theta = atan(dot(d, e2U), dot(d, e1U));
    // Perspektivlinien (Ebene 3/32): fein und dicht wie gezogene Tuschelinien — 48 Strahlen, Ringe alle 2.4 Einheiten
    const lines = stripeMask(select(isSnow, snowCoord, theta.mul(48 / (Math.PI * 2))), select(isSnow, float(0.09), float(0.022))).mul(
      select(isSnow, float(1), smoothstep(0.015, 0.06, ang)),
    );
    const rings = stripeMask(ang.mul(R / 2.4).add(drift), 0.018).mul(select(isSnow, float(0), float(1)));
    const mask = max(lines, rings).mul(flat).mul(select(kind.greaterThan(0.5).and(kind.lessThan(2.5)), float(1), float(0)));
    const patternColor = this.lookup.pal(wa.z, rowNode).rgb;
    // Schneelinien und Bodenlinien laufen durch die Schatten (dort halb in Tinte gemischt), Grat-Streifen nur im Licht
    const runsInShadow = kind.greaterThan(0.5).and(kind.lessThan(2.5));
    const patternShadow = mix(this.lookup.pal(0, rowNode).rgb, patternColor, select(runsInShadow, float(0.4), float(0)));

    // --- Geländemerkmale je Vertex: tc = (Uferabstand, Schneefeld, Koordinate längs des Gewässers, Eis) ------------
    // Wasser hat eigene Meshes (exakte Uferlinie); das Terrain darunter ist knapp unter dem Spiegel gegraben.
    const tc = attribute('tc', 'vec4');
    // Schneefelder (Bild 05): eigene Zeile Creme → gesättigtes Blau, Schatten blau statt Tinte. Die Kante bekommt im
    // Planetenraum eine feine organische Welligkeit (bricht die Interpolation des Vertex-Felds)
    const sp = positionGeometry.mul(1.9);
    const snowWob = sin(sp.x.add(sin(sp.z.mul(1.3)).mul(1.7))).mul(0.035).add(sin(sp.y.mul(2.3).add(sp.x.mul(0.7))).mul(0.025));
    // Schatten auf dem Schneefeld laufen von tiefem zu hellerem Blau (sonnenzugewandte Hänge heller, Bild 05)
    const snowField = { mask: aaStep(0, tc.y.add(snowWob)).mul(wb.z), row: wb.y, lift: float(0.08), shadowLift: 0.1 };
    // Gemeißelte Hänge: Wertstufen entlang der Höhenlinien (Stufensprung im Bandwert je Höhenschicht)
    const chisel = wa.w;
    // Sägezahn mit 1-px-Kante: jede Höhenschicht verläuft in sich, die Stufe zur nächsten bleibt eine klare Kante
    const contour = aaSaw(heightAttr.mul(5.0).add(0.5)).sub(0.5).mul(0.34);
    // Verlaufsnormale: Geländenormale zur Kugelnormale hin gemischt → ein ruhiger Verlauf über den Hügel (Kamm hell,
    // Hang zur Sonne heller), kleine Dellen und Uferrinnen zeigen keine Dreiecke; die Tintenform folgt weiter dem Relief
    const sphereN = varying(modelViewMatrix.mul(vec4(normalize(positionGeometry), 0)).xyz, 'vTerrainSphereN');
    const gradientNormal = mix(normalView, normalize(sphereN), 0.8);
    // Talnebel (Ebene 20): am Talgrund dicht und hell, zu den Kämmen hin ausdünnend; direkt vor der Linse frei
    const valley = float(1).sub(smoothstep(0.0, 0.5, heightAttr));
    const mist = varying(valley.mul(valley).mul(smoothstep(4.0, 13.0, positionView.length())), 'vTerrainMist').mul(this.mistStrength).mul(earleGradients.air);
    // Schattentönung je Welt (SunRig.shadowTint): Tönungen der Weltdateien eintragen
    const tint = options.shadowTint ?? null;
    if (tint) this.worlds.forEach((w, i) => (w.shadowTint ? tint.set(i, w.shadowTint.color, w.shadowTint.amount, w.shadowTint.lift ?? 0) : tint.clear(i)));

    this.terrainMaterial = new EarleMaterial({
      lookup: this.lookup,
      row: this.rows[0]!.terrain,
      rowNode,
      fog: this.fog,
      bands: this.terrainBands,
      bandScale: 2.0,
      terminator: 0.02,
      // Kamm → Tal: Kuppen heller, Mulden tiefer (Earles Hügel), dazu die Meißelschichten
      lift: heightAttr.mul(0.5).add(contour.mul(chisel)),
      gradientNormalNode: gradientNormal,
      shadowTint: tint ? { tint, world: worldIndex, up: sphereN } : null,
      mist: { amount: mist, color: this.mistColor as unknown as Vec3Node },
      crackNode: crack,
      crackLipNode: lip,
      growthNode,
      pattern: { mask, color: patternColor, shadowColor: patternShadow },
      layers: [snowField],
      positionNode: warp(positionLocal),
      fogDistNode: positionView.length().add(this.veilNode(worldIndex)),
    });

    // --- Felsen, Wasser, Scheunen, Schneewehen -----------------------------------------------------------
    // Wachstum/Heilung: Gewässer und Formationen je Merkmals-Index (Knotenbereich ihrer Umgebung wie bei den Chunks),
    // Scheunen und Wehen je Chunk-Slot (wie Terrain und Vegetation) — vor der Heilung verdorrt wie das Gelände ringsum
    const features = this.field.features;
    this.featureCapacity = Math.max(64, features.lakes.length + features.rivers.length + features.formations.length);
    this.featureGrowth = uniformArray(new Array<number>(this.featureCapacity).fill(1), 'float') as unknown as UniformArrayLike;
    const featureGrowth = (i: FloatNode): FloatNode => arrayElement(this.featureGrowth, i);
    const slotGrowth = (slot: FloatNode): FloatNode => (this.terrainGrowth as unknown as { element(i: unknown): FloatNode }).element(int(slot.add(0.5).floor()));
    const rockRows = uniformArray(this.rows.map((r) => r.rock), 'float') as unknown as UniformArrayLike;
    this.rockMaterial = createRockMaterial({ lookup: this.lookup, fog: this.fog, bands: this.terrainBands, rockRows, veil: (w) => this.veilNode(w), warp, growth: featureGrowth });
    const waterRows = uniformArray(this.rows.map((r) => r.water), 'float') as unknown as UniformArrayLike;
    this.waterMaterial = createWaterMaterial({ lookup: this.lookup, fog: this.fog, bands: this.terrainBands, waterRows, veil: (w) => this.veilNode(w), warp, growth: featureGrowth });
    // Felsen und Wasser: je ein Mesh für den ganzen Planeten (fest, klein) — kein Draw Call je Chunk
    this.buildFeatureMeshes();
    const barnRows = uniformArray(this.rows.map((r) => r.barn), 'float') as unknown as UniformArrayLike;
    const plainTerrainRows = uniformArray(this.rows.map((r) => r.terrain), 'float') as unknown as UniformArrayLike;
    this.barns = new BarnLandmarks({ lookup: this.lookup, fog: this.fog, bands: this.terrainBands, barnRows, terrainRows: plainTerrainRows, veil: (w) => this.veilNode(w), warp, capacity: 24, growth: slotGrowth });
    this.group.add(this.barns.mesh);
    const driftRows = uniformArray(this.rows.map((r) => r.snow), 'float') as unknown as UniformArrayLike;
    this.drifts = new DriftLandmarks({
      lookup: this.lookup,
      fog: this.fog,
      bands: this.canopyBands,
      snowRows: driftRows,
      veil: (w) => this.veilNode(w),
      warp,
      capacity: options.quality.capacity.trees > 1500 ? 700 : 360,
      growth: slotGrowth,
      shadowTint: tint,
    });
    this.group.add(this.drifts.mesh);

    // --- Vegetation ------------------------------------------------------------------------------------
    const worldRows: VegetationWorldRows[] = this.rows.map((r) => ({ terrain: r.terrain, canopy: r.canopyRows, accent: r.accent, monolith: r.monolith, barn: r.barn }));
    this.vegetation = new PlanetVegetation({
      lookup: this.lookup,
      fog: this.fog,
      bands: this.canopyBands,
      worldRows,
      families: this.worlds.map((w) => w.params.vegetation),
      capacity: options.quality.capacity,
      dotsPerTree: options.quality.dotsPerTree,
      collapsePx: options.quality.collapsePx,
      seed: options.seed,
      warp,
      veil: (worldIndex) => this.veilNode(worldIndex),
      foreign: (worldIndex) => this.foreignNode(worldIndex),
      rowCount: this.atlas.rowCount,
    });
    this.group.add(this.vegetation.group);
  }

  /**
   * Krümmungs-Boost als TSL-Knoten für Planetenraum-Positionen: Punkt sinkt radial um (1 − cos θ)·c·R ab
   * (θ = Winkel zum Blickpunkt). Dieselbe Formel wie Terrain und Vegetation — für Pfad-Pucks, Held, Brett.
   */
  bendNode(p: Vec3Node): Vec3Node {
    const n = normalize(p);
    const away = clamp(float(1).sub(dot(n, this.lookDirLocal)), 0, 2);
    return p.sub(n.mul(away.mul(this.curvature).mul(this.options.radius)));
  }

  /** CPU-Gegenstück zu `bendNode` (Planetenraum): für Positionen, die auf der CPU gesetzt werden. */
  bend(p: Vector3, out = new Vector3()): Vector3 {
    const len = p.length() || 1;
    const away = Math.min(2, Math.max(0, 1 - p.dot(this.lookDirLocal.value) / len));
    const drop = away * this.curvature.value * this.options.radius;
    return out.copy(p).addScaledVector(p, -drop / len);
  }

  /** Planetenweites Merkmals-Mesh (Felsen, Wasser): ohne Culling (Krümmungs-Warp), Schattenempfang an. */
  private featureMesh(name: string, geometry: BufferGeometry, material: EarleMaterial, castShadow: boolean): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    return mesh;
  }

  /** Wahrzeichen-Slots ersetzen (Freiräume und Fokus-Elemente); geladene Chunks werden neu gestreut. */
  setLandmarks(landmarks: PlanetLandmarkParams[]): void {
    this.field.setLandmarks(landmarks);
    this.cache.clear();
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    this.contentDirty = true;
    // Merkmale wurden neu geplant (ein Wahrzeichen stand auf einem See/Felsen): Felsen- und Wasser-Meshes neu bauen
    if (this.field.featureVersion !== this.featureVersion) this.buildFeatureMeshes();
  }

  /**
   * Felsen- und Wasser-Meshes aus den Merkmalen des Felds (je ein Mesh für den ganzen Planeten), dazu Chunk-Zuordnung,
   * Knotenbereiche und Wachstum. Ersetzt vorhandene Meshes.
   */
  private buildFeatureMeshes(): void {
    const features = this.field.features;
    const R = this.options.radius;
    for (const m of [this.rocks, this.water]) {
      if (!m) continue;
      m.removeFromParent();
      m.geometry.dispose();
    }
    const rockBase = features.lakes.length + features.rivers.length;
    const rockData = buildRockGeometry(features.formations, R, (f) => f.world, (_f, i) => Math.min(this.featureCapacity - 1, rockBase + i));
    this.rocks = rockData.indices.length > 0 ? this.featureMesh('planet-rocks', rockGeometry(rockData), this.rockMaterial, true) : null;
    const waterData = buildWaterGeometry(features, R, () => true, (x, y, z) => this.field.heightAt(x, y, z));
    this.water = waterData ? this.featureMesh('planet-water', waterGeometry(waterData), this.waterMaterial, false) : null;
    this.rockChunks.clear();
    this.waterChunks.clear();
    this.collectFeatureChunks();
    this.featureRanges = this.computeFeatureRanges();
    this.applyFeatureGrowth();
    this.featureVersion = this.field.featureVersion;
  }

  /**
   * Levelpfad ersetzen (vor dem ersten Laden der Chunks, sonst werden sie neu gestreut): Pfadkorridor und Wachstum
   * folgen dann den neuen Knoten (z. B. dem Abschnitt, der den Riesenbaum hinaufführt).
   */
  setPath(path: SpiralPath): void {
    this.path = path;
    this.cache.clear();
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    this.contentDirty = true;
    this.featureRanges = this.computeFeatureRanges();
    this.applyFeatureGrowth();
  }

  /**
   * Knotenbereich je Merkmal (Seen, Flüsse, Formationen): Knoten in derselben Reichweite wie bei den Chunks (Winkelradius
   * eines Chunks + 5° um den Merkmalsmittelpunkt), sonst der nächste Knoten — das Merkmal heilt mit seiner Umgebung.
   */
  private computeFeatureRanges(): Array<[number, number]> {
    const f = this.field.features;
    const centres: Vec3[] = [
      ...f.lakes.map((l) => l.frame.c),
      ...f.rivers.map((r) => r.points[Math.floor(r.points.length / 2)] ?? r.points[0]!),
      ...f.formations.map((r) => r.frame.c),
    ];
    const reach = Math.cos(this.angularRadius + (5 * Math.PI) / 180);
    return centres.map((c) => {
      let i0 = Infinity;
      let i1 = -Infinity;
      let nearest = 0;
      let nearestDot = -2;
      for (const n of this.path.nodes) {
        const d = _v.set(n.position[0], n.position[1], n.position[2]).normalize().dot(_c.set(c[0], c[1], c[2]));
        if (d > nearestDot) {
          nearestDot = d;
          nearest = n.index;
        }
        if (d >= reach) {
          i0 = Math.min(i0, n.index);
          i1 = Math.max(i1, n.index);
        }
      }
      return Number.isFinite(i0) ? ([i0, i1] as [number, number]) : ([nearest, nearest] as [number, number]);
    });
  }

  /** Wachstum der Merkmale (Wasser, Felsen) aus dem Fortschritt — gleiche Formel wie je Chunk. */
  private applyFeatureGrowth(): void {
    const arr = this.featureGrowth.array;
    this.featureRanges.forEach(([i0, i1], k) => {
      if (k < arr.length) arr[k] = Math.min(1, Math.max(0, (this.progressDone - i0 + 1) / (i1 - i0 + 2)));
    });
  }

  get hTotal(): number {
    // Felsen und Scheunen können höher als Gelände + Vegetation sein (Turm-Monolith, Tafelberg)
    const rocks = Math.max(this.field.features.maxRockHeight, this.field.hMax + this.landmarkTop) + 1;
    return Math.max(this.field.hMax + this.vegetation.hMax + 1, rocks) + this.curvature.value * this.options.radius * 0.25;
  }

  /** Terrain-Radius (vom Planetenmittelpunkt, inkl. Seebecken und Flussrinnen) in einer Richtung des Planetenraums. */
  surfaceRadius(dir: Vector3): number {
    const l = dir.length() || 1;
    return this.options.radius + this.field.heightAt(dir.x / l, dir.y / l, dir.z / l);
  }

  /**
   * Radius der begehbaren Oberfläche: Gelände oder — auf einer Felsformation — deren Deckfläche (Knoten auf Felsen,
   * Kamera-Freiheit über Felswänden). `surfaceRadius` bleibt das reine Gelände.
   */
  walkableRadius(dir: Vector3): number {
    const l = dir.length() || 1;
    return this.options.radius + this.field.surfaceHeightAt(dir.x / l, dir.y / l, dir.z / l);
  }

  /** Liegt die Richtung (Planetenraum) im Wasser (See/Fluss, optional mit Uferrand in Welteinheiten)? */
  isWater(dir: Vector3, margin = 0): boolean {
    const l = dir.length() || 1;
    return this.field.isWater(dir.x / l, dir.y / l, dir.z / l, margin);
  }

  zoneCoordAt(dir: Vector3): number {
    const l = dir.length() || 1;
    return this.field.zoneCoord(dir.x / l, dir.y / l, dir.z / l);
  }

  worldAt(dir: Vector3): number {
    const l = dir.length() || 1;
    return this.field.worldAt(dir.x / l, dir.y / l, dir.z / l);
  }

  /** Richtung (Planetenraum) des Mittelpunkts einer Welt. */
  worldCenter(index: number, out = new Vector3()): Vector3 {
    const d = this.field.worldCenterDir(index);
    return out.set(d[0], d[1], d[2]);
  }

  /** Aktuelle Blick-Welt (Ziel der Überblendung). */
  get viewWorld(): number {
    return this.viewWorldB;
  }

  /** Läuft gerade eine Welt-Überblendung? (Schleier/Nahfeld der Nachbarn ändern sich → Schattenpass nachziehen.) */
  get viewBlending(): boolean {
    return this.viewBlend < 1;
  }

  /** Himmel und Nebel auf die Zone unter dem Blickpunkt einstellen (Altformat: nahe Welt der Zone). */
  setViewZone(zoneCoord: number): void {
    const z = Math.min(this.field.zoneCount - 1, Math.max(0, Math.floor(zoneCoord)));
    this.setViewWorld(this.field.tables.nearWorld[z] ?? 0);
  }

  /** Nur den Blickpunkt setzen (Zentrum des Krümmungs-Boosts), ohne die Blick-Welt zu wechseln. */
  setLookDirection(dirLocal: Vector3): void {
    this.lookDirLocal.value.copy(dirLocal).normalize();
  }

  /** Blickpunkt im Planetenraum → Welt darunter → Himmel/Nebel/Streifen überblenden. */
  setViewDirection(dirLocal: Vector3): void {
    this.lookDirLocal.value.copy(dirLocal).normalize();
    this.setViewWorld(this.worldAt(dirLocal));
  }

  setViewWorld(world: number): void {
    const w = Math.min(this.worlds.length - 1, Math.max(0, world));
    if (w === this.viewWorldB) return;
    // Laufende Überblendung einfrieren: aktueller Mischzustand wird neue A-Seite (nur Zeilen, keine Farbmischung)
    if (this.viewBlend >= 0.5) this.viewWorldA = this.viewWorldB;
    this.viewWorldB = w;
    this.viewBlend = 0;
    this.applyViewRows();
  }

  private applyViewRows(): void {
    const a = this.rows[this.viewWorldA]!;
    const b = this.rows[this.viewWorldB]!;
    this.skyRowA.value = a.sky;
    this.skyRowB.value = b.sky;
    this.fog.row.value = a.fog;
    this.fog.rowB.value = b.fog;
    this.veilWorldA.value = this.viewWorldA;
    this.veilWorldB.value = this.viewWorldB;
  }

  /** Talnebel-Farbe: hellste Nebelstufe der Welten A/B, gemischt (linear, wie die Paletten-Textur sie liefert). */
  private setMistColor(a: number, b: number, t: number): void {
    const lin = (w: number): [number, number, number] => {
      const fog = this.worlds[w]?.palette.fog ?? ['#ffffff'];
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

  /** Fremdheit 0..1 der Welt `worldIndex` gegenüber der Blick-Welt (mit der Überblendung weich) (TSL). */
  private foreignNode(worldIndex: FloatNode): FloatNode {
    const foreignA = step(0.5, abs(worldIndex.sub(this.veilWorldA)));
    const foreignB = step(0.5, abs(worldIndex.sub(this.veilWorldB)));
    // Schleier aus (Übersicht) → auch keine Fremdheit
    return mix(foreignA, foreignB, this.fog.mix).mul(step(0.01, this.veilDistance));
  }

  /** Schleier-Zusatzdistanz für ein Fragment/eine Instanz der Welt `worldIndex` (TSL). */
  private veilNode(worldIndex: FloatNode): FloatNode {
    return this.foreignNode(worldIndex).mul(this.veilDistance);
  }

  /** Überblendung vorantreiben (einmal pro Frame). */
  tickView(dt: number): void {
    const wa = this.worlds[this.viewWorldA]!;
    const wb = this.worlds[this.viewWorldB]!;
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

  /**
   * Nebel für die Kameradistanz nachführen: `lookDistance` = Abstand Kamera → Blickpunkt am Boden. Die Weltwerte
   * (fog.start/range) sind für ≈ 9 Einheiten gesetzt; mehr Abstand verschiebt den Nebel um die Differenz.
   */
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

  /** Riss zwischen Zone `border` und `border + 1` schließen/öffnen. */
  setCrackClosed(border: number, closed: boolean): void {
    const u = this.crackWidths[border];
    if (!u) return;
    this.crackClosed[border] = closed;
    u.value = closed ? 0 : this.crackWidth;
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

  /** Müll-Dichte (Startwelt) ändern: Chunks werden neu gestreut. */
  setTrashScale(scale: number): void {
    if (Math.abs(scale - this.trashScale) < 1e-6) return;
    this.trashScale = scale;
    this.cache.clear();
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    this.contentDirty = true;
  }

  // --- Wahrzeichen (Hero-Baum usw.) ---------------------------------------------------------------------

  get landmarkSlots(): LandmarkSlot[] {
    return this.field.landmarkSlots;
  }

  getLandmarkSlot(id: string): LandmarkSlot | undefined {
    return this.field.landmarkSlots.find((s) => s.id === id);
  }

  /**
   * Setzt ein externes Objekt (z. B. `createHeroTree().group`) auf einen Wahrzeichen-Slot: ein Halter trägt Lage,
   * Normale, Drehung (yaw) und Maßstab des Slots, das Objekt selbst bleibt frei (eigenes Wachstum/Skalierung).
   * Der Halter hängt in der Planetengruppe (rotiert mit) und wird zurückgegeben (Matrix = Slot-Raum → Planetenraum).
   */
  addLandmark(object: Object3D, slotId?: string): Group | null {
    const slot = slotId ? this.getLandmarkSlot(slotId) : this.field.landmarkSlots[0];
    if (!slot) return null;
    const holder = new Group();
    holder.name = `landmark-${slot.id}`;
    holder.matrix.copy(this.landmarkMatrix(slot));
    holder.matrix.decompose(holder.position, holder.quaternion, holder.scale);
    holder.add(object);
    this.group.add(holder);
    this.landmarks.set(slot.id, holder);
    return holder;
  }

  /** Matrix Slot-Raum (Fuß im Ursprung, +Y = Normale, gedreht um yaw, skaliert) → Planetenraum. */
  landmarkMatrix(slot: LandmarkSlot, out = new Matrix4()): Matrix4 {
    _v.set(slot.normal[0], slot.normal[1], slot.normal[2]).normalize();
    _q.setFromUnitVectors(_Y, _v);
    _q2.setFromAxisAngle(_Y, (slot.yawDeg * Math.PI) / 180);
    _q.multiply(_q2);
    return out.compose(_c.set(slot.position[0], slot.position[1], slot.position[2]), _q, _s.setScalar(slot.scale));
  }

  removeLandmark(slotId: string): void {
    const o = this.landmarks.get(slotId);
    if (o) {
      o.removeFromParent();
      this.landmarks.delete(slotId);
    }
  }

  private growthFor(cpu: ChunkCpu): number {
    const [i0, i1] = cpu.nodeRange;
    return Math.min(1, Math.max(0, (this.progressDone - i0 + 1) / (i1 - i0 + 2)));
  }

  private applyGrowth(chunk: LoadedChunk): void {
    const g = this.growthFor(chunk.cpu);
    this.vegetation.setSlotGrowth(chunk.slot, g);
    (this.terrainGrowth as unknown as { array: number[] }).array[chunk.slot] = g;
  }

  /**
   * Sichtbarkeit prüfen, Chunks laden/entladen, Vegetationspools bei Bedarf neu füllen. `cameraWorld` und
   * `planetMatrixWorld` in Weltkoordinaten. Liefert true, wenn sich die geladene/nahe Menge geändert hat.
   */
  update(camera: Camera, cameraWorld: Vector3, planetMatrixWorld: Matrix4, frustum: Frustum): boolean {
    this.frame++;
    const R = this.options.radius;
    const camDist = cameraWorld.length();
    const horizon = Math.acos(Math.min(1, R / Math.max(R + 0.01, camDist)));
    const limit = Math.cos(Math.min(Math.PI, horizon + this.angularRadius + (6 * Math.PI) / 180));
    const camDir = _c.copy(cameraWorld).normalize();
    const sphereR = R * Math.sin(this.angularRadius) + this.hTotal + 1;
    const wanted: Array<{ key: string; id: ChunkId; angle: number }> = [];
    for (let i = 0; i < this.ids.length; i++) {
      const dirWorld = _v.copy(this.centres[i]!).transformDirection(planetMatrixWorld);
      const facing = dirWorld.dot(camDir);
      if (facing < limit) continue;
      _sphere.center.copy(dirWorld).multiplyScalar(R);
      _sphere.radius = sphereR;
      if (!frustum.intersectsSphere(_sphere)) continue;
      wanted.push({ key: chunkKey(this.ids[i]!), id: this.ids[i]!, angle: Math.acos(Math.min(1, facing)) });
    }
    wanted.sort((a, b) => a.angle - b.angle);

    let changed = false;
    let loads = 0;
    for (const w of wanted) {
      const chunk = this.loaded.get(w.key);
      if (chunk) {
        chunk.lastSeen = this.frame;
        continue;
      }
      if (loads >= this.loadsPerFrame) continue;
      if (this.loadChunk(w.id, w.key)) {
        loads++;
        changed = true;
      }
    }
    for (const chunk of [...this.loaded.values()]) {
      if (this.frame - chunk.lastSeen > this.unloadAfter) {
        this.unloadChunk(chunk);
        changed = true;
      }
    }

    // Nahe Chunks (Punkte): die N geladenen mit dem kleinsten Winkel zur Kamera
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
    // Vegetation erst neu schreiben, wenn alle gewünschten Chunks da sind (oder spätestens alle 6 Frames):
    // spart Puffer-Uploads und Schattenpässe beim Streamen
    const pending = wanted.some((w) => !this.loaded.has(w.key));
    let rebuilt = false;
    // Erster Aufbau sofort (Vegetation und ihre Programme ab dem ersten Frame), danach gebündelt
    if (this.contentDirty && (!pending || this.lastRebuild < 0 || this.frame - this.lastRebuild >= 6)) {
      this.rebuildContent();
      this.contentDirty = false;
      this.lastRebuild = this.frame;
      rebuilt = true;
    }
    const camLocal = _v.copy(cameraWorld).applyMatrix4(this.invPlanet.copy(planetMatrixWorld).invert());
    this.vegetation.updateCamera(camera, camLocal);
    return rebuilt;
  }

  private loadChunk(id: ChunkId, key: string): boolean {
    const slot = this.slots.indexOf(null);
    if (slot < 0) return false;
    let cpu = this.cache.get(key);
    if (!cpu) {
      cpu = this.buildChunk(id);
      this.cache.set(key, cpu);
      if (this.cache.size > 96) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined && !this.loaded.has(oldest)) this.cache.delete(oldest);
      }
    }
    const m = cpu.mesh;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(m.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(m.normals, 3));
    const ta = new Float32Array(m.vertexCount * 4);
    const tb = new Float32Array(m.vertexCount * 4);
    for (let k = 0; k < m.vertexCount; k++) {
      ta[k * 4] = m.zone[k]!;
      ta[k * 4 + 1] = m.border[k]!;
      ta[k * 4 + 2] = m.borderId[k]!;
      ta[k * 4 + 3] = slot;
      tb[k * 4] = m.side[k * 2]!;
      tb[k * 4 + 1] = m.side[k * 2 + 1]!;
      tb[k * 4 + 2] = m.height[k]!;
    }
    geometry.setAttribute('ta', new BufferAttribute(ta, 4));
    geometry.setAttribute('tb', new BufferAttribute(tb, 4));
    // Merkmale (Wasser, Schneefeld, Musterkoordinate, Eis) — direkt aus dem Chunk-Generator
    geometry.setAttribute('tc', new BufferAttribute(m.feature, 4));
    geometry.setIndex(new BufferAttribute(m.indices, 1));
    geometry.computeBoundingSphere();
    // Krümmungs-Warp senkt ferne Chunks radial ab: Kugel großzügig, damit das Culling sie nicht verliert
    if (geometry.boundingSphere) geometry.boundingSphere.radius += this.options.radius * 0.15;
    const mesh = new Mesh(geometry, this.terrainMaterial);
    mesh.name = `chunk-${key}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Kugel-Culling je Chunk: Haupt- und Schattenpass zeichnen nur Chunks in ihrem Frustum
    mesh.frustumCulled = true;
    this.group.add(mesh);
    const chunk: LoadedChunk = { key, cpu, mesh, slot, lastSeen: this.frame };
    this.slots[slot] = key;
    this.loaded.set(key, chunk);
    this.applyGrowth(chunk);
    return true;
  }

  private unloadChunk(chunk: LoadedChunk): void {
    chunk.mesh.removeFromParent();
    chunk.mesh.geometry.dispose();
    this.slots[chunk.slot] = null;
    this.loaded.delete(chunk.key);
  }

  private buildChunk(id: ChunkId): ChunkCpu {
    const q = this.options.quality;
    const mesh = generateChunkMesh(this.field, id, q.chunkRes);
    // Pfadkorridor und Knotenbereich aus den Knoten/Punkten in der Nachbarschaft des Chunks
    const centre = new Vector3(mesh.center[0], mesh.center[1], mesh.center[2]).normalize();
    const reach = Math.cos(this.angularRadius + (5 * Math.PI) / 180);
    const nodes: Vec3[] = [];
    const nodeIdx: number[] = [];
    let nearestIdx = 0;
    let nearestDot = -2;
    this.path.nodes.forEach((n) => {
      const d = _v.set(n.position[0], n.position[1], n.position[2]).normalize().dot(centre);
      if (d > nearestDot) {
        nearestDot = d;
        nearestIdx = n.index;
      }
      if (d >= reach) {
        nodes.push(n.position);
        nodeIdx.push(n.index);
      }
    });
    const dots: Vec3[] = [];
    for (const dot of this.path.dots) {
      if (_v.set(dot.position[0], dot.position[1], dot.position[2]).normalize().dot(centre) >= reach) dots.push(dot.position);
    }
    const cn = this.options.path.clearNode;
    const cp = this.options.path.clearPath;
    const clear = (p: Vec3, radius: number): boolean => {
      for (const n of nodes) if (Math.hypot(p[0] - n[0], p[1] - n[1], p[2] - n[2]) < cn + radius * 0.5) return true;
      for (const d of dots) if (Math.hypot(p[0] - d[0], p[1] - d[1], p[2] - d[2]) < cp + radius * 0.5) return true;
      return false;
    };
    // meshSpacing: Bäume sinken auf Kuppen/Graten bis zur Netz-Sehne (Bäume v3, kein Schweben); Halbdiagonale → Kante
    const meshSpacing = (this.options.radius * this.angularRadius * Math.SQRT2) / Math.max(1, q.chunkRes - 1);
    const trees = scatterChunkTrees(this.field, id, { densityScale: q.densityScale, clear, meshSpacing });
    const props = scatterChunkProps(this.field, id, { densityScale: q.densityScale, trashScale: this.trashScale, clear });
    const nodeRange: [number, number] = nodeIdx.length > 0 ? [Math.min(...nodeIdx), Math.max(...nodeIdx)] : [nearestIdx, nearestIdx];
    return { mesh, trees, props, nodeRange };
  }

  /** Chunk-Schlüssel, die jede Formation bzw. jedes Gewässer berührt (Mitte und Rand des Grundrisses). */
  private collectFeatureChunks(): void {
    const f = this.field.features;
    const R = this.options.radius;
    const add = (set: Set<string>, c: Vec3, radius: number): void => {
      const frame = frameAt(c);
      const d: Vec3 = [0, 0, 0];
      for (let i = -1; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i < 0 ? 0 : radius;
        offsetDir(frame, R, Math.cos(a) * r, Math.sin(a) * r, d);
        set.add(chunkKey(this.field.chunkOf(d[0], d[1], d[2])));
      }
    };
    for (const form of f.formations) add(this.rockChunks, form.frame.c, form.footprint + 0.5);
    for (const lake of f.lakes) add(this.waterChunks, lake.frame.c, lake.reach);
    for (const river of f.rivers) for (let i = 0; i < river.points.length; i += 4) add(this.waterChunks, river.points[i]!, 1.5);
  }

  private rebuildContent(): void {
    const nearSet = new Set(this.nearKeys.split('|').filter(Boolean));
    const trees: VegetationTreeEntry[] = [];
    const props: VegetationPropEntry[] = [];
    const barns: Array<{ prop: PlanetProp; world: number; slot: number }> = [];
    const drifts: DriftPlacement[] = [];
    const driftSpecs = this.field.features.drifts;
    this.bounds.makeEmpty();
    for (const chunk of this.loaded.values()) {
      const withDots = nearSet.has(chunk.key);
      for (const tree of chunk.cpu.trees) {
        trees.push({ tree, slot: chunk.slot, withDots });
        // Schneewehe am Stammfuß (Schneewelten): verbirgt den Fuß, der Baum steht im Schnee
        const spec = driftSpecs[tree.world];
        if (spec && tree.variant < (spec.trees ?? 1)) {
          const size = Math.min(1.7, Math.max(0.45, tree.canopyRadius * 0.42)) * (spec.size ?? 1);
          drifts.push({ position: tree.position, normal: tree.normal, size, yaw: tree.variant * 97.1, world: tree.world, slot: chunk.slot });
        }
      }
      for (const prop of chunk.cpu.props) {
        // Scheunen zeichnet das Wahrzeichen (Earle-Scheune), nicht der Requisiten-Pool
        if (prop.kind === 'barn') {
          barns.push({ prop, world: prop.world, slot: chunk.slot });
          // Schneewehen an den Längswänden (Bild 01): der Wandfuß steht im Schnee
          const spec = driftSpecs[prop.world];
          if (spec) for (const d of barnDrifts(prop, spec.size ?? 1, chunk.slot)) drifts.push(d);
        } else props.push({ prop, slot: chunk.slot });
      }
      const b = chunk.cpu.mesh.bounds;
      this.bounds.expandByPoint(_v.set(b.min[0], b.min[1], b.min[2]));
      this.bounds.expandByPoint(_v.set(b.max[0], b.max[1], b.max[2]));
    }
    // Sonnenrichtung im Planetenraum ist in der Vegetation gesetzt (setSunDirection) → Punktverteilung sonnenseitig
    this.vegetation.setContent(trees, props);
    this.landmarkTop = this.barns.set(barns);
    this.drifts.set(drifts);
    // Felsen und Wasser nur zeichnen (Haupt- und Schattenpass), wenn einer ihrer Chunks geladen ist
    if (this.rocks) this.rocks.visible = [...this.rockChunks].some((k) => this.loaded.has(k));
    if (this.water) this.water.visible = [...this.waterChunks].some((k) => this.loaded.has(k));
    if (!this.bounds.isEmpty()) this.bounds.expandByScalar(this.hTotal);
  }

  get loadedCount(): number {
    return this.loaded.size;
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
  }
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/**
 * Schneewehen am Fuß einer Scheune: an Längswänden, Anbau und Giebeln, im Scheunenraum gesetzt und in den
 * Planetenraum gedreht.
 */
function barnDrifts(prop: PlanetProp, size: number, slot: number): DriftPlacement[] {
  const n = new Vector3(prop.normal[0], prop.normal[1], prop.normal[2]).normalize();
  const radial = new Vector3(prop.position[0], prop.position[1], prop.position[2]).normalize();
  const up = n.lerp(radial, 0.85).normalize();
  const q = new Quaternion().setFromUnitVectors(_Y, up).multiply(new Quaternion().setFromAxisAngle(_Y, prop.yaw));
  const s = prop.scale;
  // Scheunenraum nach der Drehung der Geometrie: First längs x (±0.78), Wände bei z = ±0.5, Anbau bei z −0.5…−1.0
  const spots: Array<[number, number, number, number]> = [
    // x, z, Größe, Drehung
    [-0.45, 0.62, 0.55, 0.2],
    [0.4, 0.66, 0.5, 2.1],
    [0.15, -1.1, 0.5, 3.6],
    [0.92, 0.05, 0.45, 5.0],
    [-0.9, -0.3, 0.42, 1.2],
  ];
  const out: DriftPlacement[] = [];
  for (const [x, z, r, yaw] of spots) {
    const p = new Vector3(x * s, 0, z * s).applyQuaternion(q).add(new Vector3(prop.position[0], prop.position[1], prop.position[2]));
    out.push({ position: [p.x, p.y, p.z], normal: [up.x, up.y, up.z], size: r * s * size, yaw: prop.yaw + yaw, world: prop.world, slot });
  }
  return out;
}

/** `uniformArray(Vector4[], 'vec4')` ohne die generischen Typen. */
interface UniformVec4ArrayLike {
  element(i: unknown): Vec4Node;
}

/** vec4-Element eines Uniform-Arrays (Index-Knoten wird gerundet). */
function vec4Element(arr: UniformVec4ArrayLike, index: FloatNode): Vec4Node {
  return arr.element(int(index.add(0.5).floor()));
}
