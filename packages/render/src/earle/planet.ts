import { Box3, BufferAttribute, BufferGeometry, Frustum, Group, Matrix4, Mesh, Object3D, Quaternion, Sphere, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { abs, acos, asin, atan, attribute, clamp, cos, dot, float, fract, int, max, mix, normalGeometry, normalize, positionGeometry, positionLocal, select, smoothstep, step, uniform, uniformArray } from 'three/tsl';
import {
  PlanetField,
  chunkAngularRadius,
  chunkDirection,
  chunkKey,
  chunkList,
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
import { PaletteAtlas, addWorldPalette, worldPaletteFromZone, type WorldPalette, type WorldRows, type ZonePalette } from './palette';
import { GROWTH_SLOTS, PlanetVegetation, type VegetationPropEntry, type VegetationTreeEntry, type VegetationWorldRows } from './planetVegetation';
import { PaletteLookup, aaStep, arrayElement, createFogSettings, patternTime, stripeMask, type FloatNode, type FogSettings, type TSLUniform, type UniformArrayLike, type Vec3Node } from './tsl';

export interface EarlePlanetZone {
  id: string;
  palette: ZonePalette;
  params: PlanetZoneParams;
}

/** Bodenbehandlung je Welt (Terrain-Ornament): glatt, Schneelinien, Wiese, Perspektivlinien, Rampen, Schneegrate. */
export type GroundTreatment = 'smooth' | 'snowLines' | 'meadow' | 'floorLines' | 'ramps' | 'snowRidges';

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
  /** Krümmungs-Boost (0 = echte Kugel) und Blickrichtung im Planetenraum für den Warp. */
  readonly curvature = uniform(0);
  readonly lookDirLocal = uniform(new Vector3(0, 1, 0));
  readonly path: SpiralPath;
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
    this.rows = this.worlds.map((w) => addWorldPalette(this.atlas, w.palette, w.id));
    this.lookup = new PaletteLookup(this.atlas.texture, this.atlas.width, this.atlas.height);
    const first = this.worlds[0]!;
    this.fogStart = first.fog.start;
    this.fogRange = first.fog.range;
    this.fog = createFogSettings({ row: this.rows[0]!.fog, rowB: this.rows[0]!.fog, steps: 5, start: this.fogStart, range: this.fogRange });
    this.skyRowA = uniform(this.rows[0]!.sky);
    this.skyRowB = uniform(this.rows[0]!.sky);
    this.skyMix = uniform(0);
    this.stripeStrength.value = first.fogStripes;
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
    const warp = (p: Vec3Node): Vec3Node => {
      const n = normalize(p);
      const away = clamp(float(1).sub(dot(n, this.lookDirLocal)), 0, 2);
      return p.sub(n.mul(away.mul(this.curvature).mul(R)));
    };

    // --- Terrainmaterial (geteilt): Zeile je Welt, Riss je Grenze, Wachstum je Slot, Bodenornament ---------
    const zones = options.zones.length;
    const tables = this.field.tables;
    const nearTable = uniformArray(tables.nearWorld.map((v) => v), 'float') as unknown as UniformArrayLike;
    const nearBTable = uniformArray((tables.nearWorldB ?? tables.nearWorld.map(() => -1)).map((v) => v), 'float') as unknown as UniformArrayLike;
    const farATable = uniformArray(tables.farWorldA.map((v) => v), 'float') as unknown as UniformArrayLike;
    const farBTable = uniformArray(tables.farWorldB.map((v) => v), 'float') as unknown as UniformArrayLike;
    const farSplitTable = uniformArray(tables.farSplit.map((v) => v), 'float') as unknown as UniformArrayLike;
    const terrainRows = uniformArray(this.rows.map((r) => r.terrain), 'float') as unknown as UniformArrayLike;
    const groundKinds = uniformArray(this.worlds.map((w) => GROUND_KIND[w.ground]), 'float') as unknown as UniformArrayLike;
    const patternRows = uniformArray(this.worlds.map((w, i) => (w.ground === 'floorLines' ? this.rows[i]!.accent : this.rows[i]!.terrain)), 'float') as unknown as UniformArrayLike;
    const patternIdx = uniformArray(this.worlds.map((w) => (w.ground === 'floorLines' ? 7 : 1)), 'float') as unknown as UniformArrayLike;
    const cosHalfWidth = uniform(this.field.cosHalfWidth);
    // Gepackte Vertex-Attribute (WebGPU ≤ 8 Puffer): ta = (Zone, Grenzabstand, Grenz-ID, Slot), tb = (cos Δ, sin Δ, Höhe, 0)
    const ta = attribute('ta', 'vec4');
    const tb = attribute('tb', 'vec4');
    const zoneCoord = ta.x;
    const side = tb.xy;
    const zoneIndex = zoneCoord.floor().clamp(0, zones - 1);
    const nearA = arrayElement(nearTable, zoneIndex);
    const nearB = arrayElement(nearBTable, zoneIndex);
    const farA = arrayElement(farATable, zoneIndex);
    const farB = arrayElement(farBTable, zoneIndex);
    const half = zoneCoord.sub(zoneIndex).lessThan(arrayElement(farSplitTable, zoneIndex));
    const near = select(nearB.lessThan(-0.5).or(half), nearA, nearB);
    const far = select(farB.lessThan(-0.5).or(half), farA, farB);
    const worldIndex = select(side.x.greaterThan(cosHalfWidth), near, far);
    const rowNode = arrayElement(terrainRows, worldIndex);
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
    const crack = aaStep(jag, border).oneMinus().mul(open);
    const north = zoneCoord.sub(zoneCoord.floor()).lessThan(0.5); // Grenze liegt unter (südlich von) diesem Punkt
    const lip = aaStep(jag, border).mul(aaStep(jag.add(0.07), border).oneMinus()).mul(open).mul(select(north, float(1), float(0)));
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
    const kind = arrayElement(groundKinds, worldIndex);
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
    const lines = stripeMask(select(isSnow, snowCoord, theta.mul(56 / (Math.PI * 2))), select(isSnow, float(0.09), float(0.05))).mul(
      select(isSnow, float(1), smoothstep(0.015, 0.06, ang)),
    );
    const rings = stripeMask(ang.mul(R / 1.5).add(drift), 0.06).mul(select(isSnow, float(0), float(1)));
    const mask = max(lines, rings).mul(flat).mul(select(kind.greaterThan(0.5).and(kind.lessThan(2.5)), float(1), float(0)));
    const patternColor = this.lookup.pal(arrayElement(patternIdx, worldIndex), arrayElement(patternRows, worldIndex)).rgb;
    // Schneelinien und Bodenlinien laufen durch die Schatten (dort halb in Tinte gemischt), Grat-Streifen nur im Licht
    const runsInShadow = kind.greaterThan(0.5).and(kind.lessThan(2.5));
    const patternShadow = mix(this.lookup.pal(0, rowNode).rgb, patternColor, select(runsInShadow, float(0.55), float(0)));

    this.terrainMaterial = new EarleMaterial({
      lookup: this.lookup,
      row: this.rows[0]!.terrain,
      rowNode,
      fog: this.fog,
      bands: this.terrainBands,
      bandScale: 2.0,
      terminator: 0.02,
      lift: heightAttr.mul(0.45),
      crackNode: crack,
      crackLipNode: lip,
      growthNode,
      pattern: { mask, color: patternColor, shadowColor: patternShadow },
      positionNode: warp(positionLocal),
    });

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
    });
    this.group.add(this.vegetation.group);
  }

  get hTotal(): number {
    return this.field.hMax + this.vegetation.hMax + 1 + this.curvature.value * this.options.radius * 0.25;
  }

  /** Terrain-Radius (vom Planetenmittelpunkt) in einer Richtung des Planetenraums. */
  surfaceRadius(dir: Vector3): number {
    const l = dir.length() || 1;
    return this.options.radius + this.field.heightAt(dir.x / l, dir.y / l, dir.z / l);
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

  /** Himmel und Nebel auf die Zone unter dem Blickpunkt einstellen (Altformat: nahe Welt der Zone). */
  setViewZone(zoneCoord: number): void {
    const z = Math.min(this.field.zoneCount - 1, Math.max(0, Math.floor(zoneCoord)));
    this.setViewWorld(this.field.tables.nearWorld[z] ?? 0);
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
      this.fogStart = wa.fog.start + (wb.fog.start - wa.fog.start) * t;
      this.fogRange = wa.fog.range + (wb.fog.range - wa.fog.range) * t;
      this.fog.start.value = this.fogStart;
      this.fog.invRange.value = 1 / Math.max(1, this.fogRange);
      if (this.viewBlend >= 1) {
        this.viewWorldA = this.viewWorldB;
        this.applyViewRows();
        this.skyMix.value = 0;
        this.fog.mix.value = 0;
      }
    }
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
   * Setzt ein externes Objekt (z. B. `createHeroTree()`) auf einen Wahrzeichen-Slot: Fußpunkt auf der Oberfläche,
   * +Y entlang der Normale, Skalierung aus dem Slot. Das Objekt wird Kind der Planetengruppe (rotiert mit).
   */
  addLandmark(object: Object3D, slotId?: string): LandmarkSlot | null {
    const slot = slotId ? this.getLandmarkSlot(slotId) : this.field.landmarkSlots[0];
    if (!slot) return null;
    object.position.set(slot.position[0], slot.position[1], slot.position[2]);
    _v.set(slot.normal[0], slot.normal[1], slot.normal[2]).normalize();
    _q.setFromUnitVectors(_Y, _v);
    object.quaternion.copy(_q);
    object.scale.setScalar(slot.scale);
    this.group.add(object);
    this.landmarks.set(slot.id, object);
    return slot;
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
    const trees = scatterChunkTrees(this.field, id, { densityScale: q.densityScale, clear });
    const props = scatterChunkProps(this.field, id, { densityScale: q.densityScale, trashScale: this.trashScale, clear });
    const nodeRange: [number, number] = nodeIdx.length > 0 ? [Math.min(...nodeIdx), Math.max(...nodeIdx)] : [nearestIdx, nearestIdx];
    return { mesh, trees, props, nodeRange };
  }

  private rebuildContent(): void {
    const nearSet = new Set(this.nearKeys.split('|').filter(Boolean));
    const trees: VegetationTreeEntry[] = [];
    const props: VegetationPropEntry[] = [];
    this.bounds.makeEmpty();
    for (const chunk of this.loaded.values()) {
      const withDots = nearSet.has(chunk.key);
      for (const tree of chunk.cpu.trees) trees.push({ tree, slot: chunk.slot, withDots });
      for (const prop of chunk.cpu.props) props.push({ prop, slot: chunk.slot });
      const b = chunk.cpu.mesh.bounds;
      this.bounds.expandByPoint(_v.set(b.min[0], b.min[1], b.min[2]));
      this.bounds.expandByPoint(_v.set(b.max[0], b.max[1], b.max[2]));
    }
    // Sonnenrichtung im Planetenraum ist in der Vegetation gesetzt (setSunDirection) → Punktverteilung sonnenseitig
    this.vegetation.setContent(trees, props);
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
    this.terrainMaterial.dispose();
    this.atlas.dispose();
    this.group.removeFromParent();
  }
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
