import { GradientNoise3 } from './noise';
import { hash32, mulberry32 } from './rng';
import { TREE_KIND_LIST, TREE_PROPORTIONS, composeGroveTree, type TreeInstance, type TreeKind } from './scatterTrees';
import type { Vec3 } from './capPatch';
import { areaSplit, decideWorld, pathLongitude, smoothstep01, wrapAngle, type WorldTables } from './worldLayout';

/**
 * Rotierbarer Planet: Cube-Sphere mit `chunksPerFace²` Chunks pro Würfelseite, ein globales Höhenfeld aus
 * 3D-Gradientenrauschen auf der Einheitsrichtung (nahtlos über Chunk- und Seitengrenzen), vier Story-Zonen als
 * Breitenbänder (Nord → Süd) mit verrauschten Grenzen ("Risse"), Level-Pfad als Spirale von Pol zu Pol.
 * Zehn Welten: je Band eine nahe Welt (um den Pfad) und ein bis zwei ferne Welten (Gegenseite, siehe
 * `worldLayout.ts`); Terrainform, Vegetation und Requisiten kommen aus der Welt am Ort.
 * Alles deterministisch: `seed = hash32('chunk', zone, face, cx, cy)`.
 */

/** Stamm-Stil der Vegetation (Shader-Zweig): Tinte, weiße Kathedralenstämme, gestreifte Juwelenstämme, Flechtenbänder. */
export type TrunkStyle = 'ink' | 'white' | 'striped' | 'lichen';
/** Punktmotiv in den Kronen: einzelne Punkte, Rauten (4 Punkte), Kreuze (5 Punkte), nur am Rand. */
export type CanopyMotif = 'dots' | 'diamond' | 'cross' | 'rim';

export interface PlanetVegetationFamily {
  /** Bäume pro Welteinheit² vor Waldmaske und Qualitätsfaktor. */
  density: number;
  /** 0 = gleichmäßig, 1 = nur Waldflecken. */
  clumpiness: number;
  kinds: Partial<Record<TreeKind, number>>;
  /** Größenfaktor-Bereich. */
  scale: [number, number];
  /** Requisiten der Zone (Altformat): Schrotthaufen (dunkle Boxen) oder Öl-/Sirupbecken. */
  props?: 'scrap' | 'pool' | null;
  propDensity?: number;
  /** Tiere (Silhouetten) pro Welteinheit² auf offenen Flächen. */
  animalDensity?: number;
  trunkStyle?: TrunkStyle;
  /** Stammbreite relativ zum Kronenradius (Standard 0.04). */
  trunkWidth?: number;
  /** Höhenfaktor der Krone (1 = Proportion der Form; Kiefern 1.3 = spitzer). */
  aspect?: number;
  motif?: CanopyMotif;
  /** Anzahl Farbvarianten der Kronenzeile (Juwelenwald: 4 Zeilen rot/blau/violett/türkis). */
  rowVariants?: number;
  /** Schwelle der Waldmaske 0..1 (Standard 0.51; kleiner = mehr Wald, z. B. Nebelhügel 0.42). */
  forestThreshold?: number;
  /**
   * Hecken (Bilder 09, Ebene_36): Bäume stehen in Reihen entlang der Höhenlinien — Abstand der Reihen in
   * Höhen-Einheiten (Anteil der Amplitude) und Breite einer Reihe (Anteil des Abstands).
   */
  rows?: { spacing: number; width: number };
}

export interface PlanetTerrainShape {
  /** Hügelhöhe in Welteinheiten. */
  amplitude: number;
  /** Wellenlängenfaktor relativ zu `hillWavelength` (1 = Standard, 2 = doppelt so weite Hügel). */
  wavelength?: number;
  /** 0 = runde "gemeißelte" Hügel, 1 = messerscharfe Grate (ridged noise). */
  ridge?: number;
  /** Schwelle 0..1: unterhalb Ebene, oberhalb erhebt sich der Hügel (0 = alles gewellt). */
  floor?: number;
  /** Anteil einer großwelligen Rampe (steile Hänge wie in Bild 04). */
  slope?: number;
}

export interface PlanetPropSpec {
  /** Müll (Schrotthügel, Monolithe, Gasquellen, Reifen, Rohre) pro Welteinheit². */
  trash?: number;
  /** Öl-/Sirupbecken pro Welteinheit². */
  pools?: number;
  /** Rote Scheunen pro Welteinheit² (sehr sparsam). */
  barns?: number;
  /** Felsen/Felsnadeln pro Welteinheit². */
  rocks?: number;
  /** Tiere (Silhouetten) pro Welteinheit². */
  animals?: number;
}

export interface PlanetWorldParams {
  id: string;
  /** Zonenband 0..zones-1. */
  zone: number;
  side: 'near' | 'far';
  /** Bei zwei Welten auf derselben Seite eines Bands: 0 = Nordhälfte, 1 = Südhälfte (flächengleich geteilt). */
  half?: 0 | 1;
  terrain: PlanetTerrainShape;
  vegetation: PlanetVegetationFamily;
  props?: PlanetPropSpec;
}

export interface PlanetZoneParams {
  id: string;
  hillAmplitude: number;
  vegetation: PlanetVegetationFamily;
}

export interface PlanetLandmarkParams {
  id: string;
  /** Welt-Index. */
  world: number;
  /** Längenversatz zum Pfad in Grad (nahe Welten; Standard 34). */
  deltaDeg?: number;
  /** Anteil 0..1 innerhalb der Breitenspanne der Welt (Standard 0.5). */
  latFrac?: number;
  /** Explizite Richtung (Einheitsvektor, Planetenraum); überschreibt deltaDeg/latFrac. */
  dir?: Vec3;
  /** Drehung um die Oberflächennormale in Grad (z. B. Wurzelspitze zum Pfad). */
  yawDeg?: number;
  scale: number;
  /** Radius (Welteinheiten), in dem keine Vegetation/Requisiten stehen. */
  clearRadius: number;
  /**
   * Fokus-Element der Weltkomposition: ein Baum oder Requisit, das die Streuung genau an diesem Slot setzt
   * (z. B. die rote Scheune in Welt 08, der Wurzelbaum in 05). Fehlt es, bleibt der Slot leer (externes Objekt).
   */
  instance?: { kind: TreeKind | PlanetPropKind; scale: number };
}

export interface LandmarkSlot {
  id: string;
  world: number;
  zone: number;
  position: Vec3;
  normal: Vec3;
  dir: Vec3;
  /** Drehung um die Normale (Grad). */
  yawDeg: number;
  scale: number;
  clearRadius: number;
  instance?: { kind: TreeKind | PlanetPropKind; scale: number };
}

export interface PlanetParams {
  radius: number;
  seed: number;
  chunksPerFace: number;
  /** Zonen von Nord nach Süd (gleich breite Breitenbänder). */
  zones: PlanetZoneParams[];
  /** Zehn Welten; fehlt die Liste, ist jede Zone ihre eigene (nahe) Welt. */
  worlds?: PlanetWorldParams[];
  hillWavelength?: number;
  /** Amplitude des Grenz-Wobbles in Zonenbreiten (Standard 0.07 ≈ ±3°). */
  borderWobble?: number;
  /** Spirale des Levelpfads (Umdrehungen Pol → Pol, Polkappen ohne Pfad in Grad). */
  spiral?: { turns?: number; polarMarginDeg?: number };
  /** Halbe Breite (Grad Länge) des nahen Streifens um den Pfad (Standard 90 ≈ ±15° Breite um die Spirale). */
  nearHalfWidthDeg?: number;
  /** Verrauschung der Nah/Fern-Grenze in Grad (Standard 9). */
  sideWobbleDeg?: number;
  landmarks?: PlanetLandmarkParams[];
}

export interface ChunkId {
  face: number;
  cx: number;
  cy: number;
}

export interface ChunkMeshData {
  id: ChunkId;
  key: string;
  vertexCount: number;
  positions: Float32Array;
  normals: Float32Array;
  /** Höhe 0..1 relativ zur lokalen Amplitude. */
  height: Float32Array;
  /** Kontinuierliche Zonenkoordinate (Grenzen bei ganzen Zahlen). */
  zone: Float32Array;
  /** Pfadseite je Vertex: (cos Δ, sin Δ) des Längenabstands zum Pfad, verrauscht. */
  side: Float32Array;
  /** Abstand zur nächsten Zonengrenze in Welteinheiten. */
  border: Float32Array;
  /** Index der nächsten Grenze (0 = Zone 0|1, …), -1 = keine. */
  borderId: Float32Array;
  indices: Uint16Array | Uint32Array;
  bounds: { min: Vec3; max: Vec3 };
  center: Vec3;
  /** Zonenindex am Chunk-Mittelpunkt. */
  zoneIndex: number;
  /** Welt-Index am Chunk-Mittelpunkt. */
  worldIndex: number;
}

export interface PlanetTree extends TreeInstance {
  zone: number;
  world: number;
  /** Wachstumsrang 0..1 innerhalb des Chunks. */
  rank: number;
  /** Deterministischer Zufallswert 0..1 (Farbvariante, Motiv-Phase). */
  variant: number;
}

export type PlanetPropKind = 'scrap' | 'pool' | 'animal' | 'mound' | 'monolith' | 'vent' | 'tire' | 'pipe' | 'barn' | 'rock';

export interface PlanetProp {
  kind: PlanetPropKind;
  position: Vec3;
  normal: Vec3;
  scale: number;
  yaw: number;
  zone: number;
  world: number;
  rank: number;
  variant: number;
}

export interface SpiralNode {
  index: number;
  zone: number;
  position: Vec3;
  normal: Vec3;
  /** Breite/Länge in Grad. */
  lat: number;
  lon: number;
}

export interface SpiralPath {
  nodes: SpiralNode[];
  dots: Array<{ position: Vec3; normal: Vec3 }>;
  length: number;
}

// --- Würfelseiten ------------------------------------------------------------------------------------
// origin + fu·right + fv·up, right × up zeigt nach außen (Dreiecke gegen den Uhrzeigersinn von außen).
const FACES: Array<{ origin: Vec3; right: Vec3; up: Vec3 }> = [
  { origin: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  { origin: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
  { origin: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] },
  { origin: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] },
  { origin: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
  { origin: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
];

export function chunkKey(id: ChunkId): string {
  return `${id.face}:${id.cx}:${id.cy}`;
}

export function chunkList(chunksPerFace: number): ChunkId[] {
  const out: ChunkId[] = [];
  for (let face = 0; face < 6; face++) for (let cy = 0; cy < chunksPerFace; cy++) for (let cx = 0; cx < chunksPerFace; cx++) out.push({ face, cx, cy });
  return out;
}

/** Einheitsrichtung für lokale Chunk-Koordinaten lu, lv ∈ [-1, 1]. */
export function chunkDirection(id: ChunkId, chunksPerFace: number, lu: number, lv: number, out: Vec3): Vec3 {
  const f = FACES[id.face]!;
  const fu = -1 + (2 * (id.cx + (lu + 1) * 0.5)) / chunksPerFace;
  const fv = -1 + (2 * (id.cy + (lv + 1) * 0.5)) / chunksPerFace;
  const x = f.origin[0] + fu * f.right[0] + fv * f.up[0];
  const y = f.origin[1] + fu * f.right[1] + fv * f.up[1];
  const z = f.origin[2] + fu * f.right[2] + fv * f.up[2];
  const inv = 1 / Math.hypot(x, y, z);
  out[0] = x * inv;
  out[1] = y * inv;
  out[2] = z * inv;
  return out;
}

/** Chunk, dessen Zelle die Richtung enthält (Umkehrung von `chunkDirection`). */
export function chunkIdOf(dx: number, dy: number, dz: number, chunksPerFace: number): ChunkId {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const az = Math.abs(dz);
  let face: number;
  if (ax >= ay && ax >= az) face = dx > 0 ? 0 : 1;
  else if (ay >= az) face = dy > 0 ? 2 : 3;
  else face = dz > 0 ? 4 : 5;
  const f = FACES[face]!;
  // Strahl auf die Würfelseite projizieren: origin·d / |…| → Punkt mit origin-Komponente 1
  const o = f.origin[0] * dx + f.origin[1] * dy + f.origin[2] * dz;
  const px = dx / o;
  const py = dy / o;
  const pz = dz / o;
  const fu = (px - f.origin[0]) * f.right[0] + (py - f.origin[1]) * f.right[1] + (pz - f.origin[2]) * f.right[2];
  const fv = (px - f.origin[0]) * f.up[0] + (py - f.origin[1]) * f.up[1] + (pz - f.origin[2]) * f.up[2];
  const cx = Math.min(chunksPerFace - 1, Math.max(0, Math.floor(((fu + 1) / 2) * chunksPerFace)));
  const cy = Math.min(chunksPerFace - 1, Math.max(0, Math.floor(((fv + 1) / 2) * chunksPerFace)));
  return { face, cx, cy };
}

/** Winkelradius eines Chunks (Mittelpunkt → fernste Ecke), Maximum über alle Chunks einer Seite. */
export function chunkAngularRadius(chunksPerFace: number): number {
  const c: Vec3 = [0, 0, 0];
  const e: Vec3 = [0, 0, 0];
  let worst = 0;
  for (let cy = 0; cy < chunksPerFace; cy++) {
    for (let cx = 0; cx < chunksPerFace; cx++) {
      const id: ChunkId = { face: 4, cx, cy };
      chunkDirection(id, chunksPerFace, 0, 0, c);
      for (const [lu, lv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        chunkDirection(id, chunksPerFace, lu, lv, e);
        const d = Math.min(1, c[0] * e[0] + c[1] * e[1] + c[2] * e[2]);
        worst = Math.max(worst, Math.acos(d));
      }
    }
  }
  return worst + 0.005;
}

// --- Feld ------------------------------------------------------------------------------------------

export interface ResolvedShape {
  amplitude: number;
  wavelength: number;
  ridge: number;
  floor: number;
  slope: number;
}

function resolveShape(s: PlanetTerrainShape): ResolvedShape {
  return { amplitude: s.amplitude, wavelength: s.wavelength ?? 1, ridge: s.ridge ?? 0, floor: s.floor ?? 0, slope: s.slope ?? 0 };
}

function mixShape(a: ResolvedShape, b: ResolvedShape, t: number, out: ResolvedShape): ResolvedShape {
  out.amplitude = a.amplitude + (b.amplitude - a.amplitude) * t;
  out.wavelength = a.wavelength + (b.wavelength - a.wavelength) * t;
  out.ridge = a.ridge + (b.ridge - a.ridge) * t;
  out.floor = a.floor + (b.floor - a.floor) * t;
  out.slope = a.slope + (b.slope - a.slope) * t;
  return out;
}

export class PlanetField {
  readonly params: PlanetParams;
  readonly hMax: number;
  /** Aufgelöste Welten (aus `params.worlds` oder eine je Zone). */
  readonly worlds: PlanetWorldParams[];
  readonly tables: WorldTables;
  readonly turns: number;
  readonly polarMargin: number;
  readonly cosHalfWidth: number;
  landmarkSlots: LandmarkSlot[];
  private readonly hills: GradientNoise3;
  private readonly ridges: GradientNoise3;
  private readonly ramps: GradientNoise3;
  private readonly biome: GradientNoise3;
  private readonly forest: GradientNoise3;
  private readonly wobble: GradientNoise3;
  private readonly sideNoise: GradientNoise3;
  private readonly freq: number;
  private readonly borderWobble: number;
  private readonly sideWobble: number;
  private readonly zoneWidthRad: number;
  private readonly shapes: ResolvedShape[];
  private readonly cosOuter: number;
  private readonly cosInner: number;
  private readonly tmpA: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  private readonly tmpB: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  private readonly tmpC: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  private readonly tmpD: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };
  private readonly tmpE: ResolvedShape = { amplitude: 0, wavelength: 1, ridge: 0, floor: 0, slope: 0 };

  constructor(params: PlanetParams) {
    if (params.zones.length < 1) throw new Error('PlanetField needs at least one zone');
    this.params = params;
    this.hills = new GradientNoise3(hash32('hills', params.seed));
    this.ridges = new GradientNoise3(hash32('ridges', params.seed));
    this.ramps = new GradientNoise3(hash32('ramps', params.seed));
    this.biome = new GradientNoise3(hash32('biome', params.seed));
    this.forest = new GradientNoise3(hash32('forest', params.seed));
    this.wobble = new GradientNoise3(hash32('border', params.seed));
    this.sideNoise = new GradientNoise3(hash32('side', params.seed));
    this.freq = params.radius / (params.hillWavelength ?? 11);
    this.borderWobble = params.borderWobble ?? 0.07;
    this.zoneWidthRad = Math.PI / params.zones.length;
    this.turns = params.spiral?.turns ?? 2.75;
    this.polarMargin = ((params.spiral?.polarMarginDeg ?? 9) * Math.PI) / 180;

    // Welten: explizit oder eine je Zone (Altverhalten: alles "nah")
    const explicit = params.worlds && params.worlds.length > 0;
    this.worlds = explicit
      ? params.worlds!
      : params.zones.map((z, i) => ({ id: z.id, zone: i, side: 'near' as const, terrain: { amplitude: z.hillAmplitude }, vegetation: z.vegetation }));
    const hw = explicit ? ((params.nearHalfWidthDeg ?? 90) * Math.PI) / 180 : Math.PI;
    this.cosHalfWidth = explicit ? Math.cos(hw) : -2;
    const blend = (6 * Math.PI) / 180;
    this.cosOuter = explicit ? Math.cos(Math.min(Math.PI, hw + blend)) : -2;
    this.cosInner = explicit ? Math.cos(Math.max(0, hw - blend)) : -2;
    this.sideWobble = ((params.sideWobbleDeg ?? 9) * Math.PI) / 180;
    const zones = params.zones.length;
    const farSplit = Array.from({ length: zones }, (_, z) => areaSplit(Math.PI / 2 - (z / zones) * Math.PI, Math.PI / 2 - ((z + 1) / zones) * Math.PI));
    const tables: WorldTables = {
      nearWorld: new Array<number>(zones).fill(-1),
      nearWorldB: new Array<number>(zones).fill(-1),
      farWorldA: new Array<number>(zones).fill(-1),
      farWorldB: new Array<number>(zones).fill(-1),
      farSplit,
    };
    this.worlds.forEach((w, i) => {
      if (w.zone < 0 || w.zone >= zones) throw new Error(`World "${w.id}" refers to zone ${w.zone}`);
      if (w.side === 'near') {
        if (w.half === 1) tables.nearWorldB![w.zone] = i;
        else tables.nearWorld[w.zone] = i;
      } else if (w.half === 1) tables.farWorldB[w.zone] = i;
      else tables.farWorldA[w.zone] = i;
    });
    for (let z = 0; z < zones; z++) {
      if (tables.nearWorld[z]! < 0 && tables.nearWorldB![z]! >= 0) {
        tables.nearWorld[z] = tables.nearWorldB![z]!;
        tables.nearWorldB![z] = -1;
      }
      if (tables.nearWorld[z]! < 0) throw new Error(`Zone ${z} has no near world`);
      if (tables.farWorldA[z]! < 0 && tables.farWorldB[z]! >= 0) tables.farWorldA[z] = tables.farWorldB[z]!;
      if (tables.farWorldA[z]! < 0) tables.farWorldA[z] = tables.nearWorld[z]!;
    }
    this.tables = tables;
    this.shapes = this.worlds.map((w) => resolveShape(w.terrain));
    this.hMax = Math.max(...this.shapes.map((s) => s.amplitude));
    this.landmarkSlots = (params.landmarks ?? []).map((l) => this.buildLandmark(l));
  }

  get zoneCount(): number {
    return this.params.zones.length;
  }

  get worldCount(): number {
    return this.worlds.length;
  }

  /** Kontinuierliche Zonenkoordinate 0..zones (Nordpol → Südpol), Grenzen bei ganzen Zahlen, verrauscht. */
  zoneCoord(dx: number, dy: number, dz: number): number {
    const lat = Math.asin(Math.max(-1, Math.min(1, dy))); // +π/2 am Nordpol
    const base = ((Math.PI / 2 - lat) / Math.PI) * this.zoneCount;
    const w = this.wobble.fbm(dx * 2.3 + 11.7, dy * 2.3, dz * 2.3 - 4.1, 2) * this.borderWobble;
    // Wobble an den Polen ausblenden, damit die Koordinate im Bereich bleibt
    const polar = Math.min(1, Math.max(0, 1 - Math.abs(dy) * 1.02));
    return Math.min(this.zoneCount - 1e-6, Math.max(0, base + w * polar));
  }

  zoneIndex(dx: number, dy: number, dz: number): number {
    return Math.min(this.zoneCount - 1, Math.floor(this.zoneCoord(dx, dy, dz)));
  }

  /** Abstand (Welteinheiten) zur nächsten Zonengrenze und deren Index (-1 = keine, an den Polen). */
  borderAt(dx: number, dy: number, dz: number): { dist: number; border: number } {
    return this.borderFromZone(this.zoneCoord(dx, dy, dz));
  }

  borderFromZone(zc: number): { dist: number; border: number } {
    const nearest = Math.round(zc);
    if (nearest <= 0 || nearest >= this.zoneCount) return { dist: 1e4, border: -1 };
    return { dist: Math.abs(zc - nearest) * this.zoneWidthRad * this.params.radius, border: nearest - 1 };
  }

  /** Länge (rad) des Pfads auf Breite `lat` (rad). */
  pathLongitudeAt(lat: number): number {
    return pathLongitude(lat, this.turns, this.polarMargin);
  }

  /** Pfadseite: (cos Δ, sin Δ) des verrauschten Längenabstands zum Pfad auf dieser Breite. */
  pathSideAt(dx: number, dy: number, dz: number, out: [number, number] = [0, 0]): [number, number] {
    const lat = Math.asin(Math.max(-1, Math.min(1, dy)));
    const lon = Math.atan2(dz, dx);
    const n = this.sideNoise.fbm(dx * 1.9 - 3.1, dy * 1.9 + 7.7, dz * 1.9 + 1.3, 2);
    const delta = wrapAngle(lon - this.pathLongitudeAt(lat)) + n * this.sideWobble;
    out[0] = Math.cos(delta);
    out[1] = Math.sin(delta);
    return out;
  }

  /** Welt-Index am Ort (CPU-Seite derselben Entscheidung wie im Terrain-Shader). */
  worldAt(dx: number, dy: number, dz: number): number {
    const zc = this.zoneCoord(dx, dy, dz);
    const side = this.pathSideAt(dx, dy, dz, this.sideTmp);
    return decideWorld(zc, side[0], this.cosHalfWidth, this.tables);
  }
  private readonly sideTmp: [number, number] = [0, 0];

  /** Vegetationsfamilie der Welt am Ort. */
  familyAt(dx: number, dy: number, dz: number): PlanetVegetationFamily {
    return this.worlds[this.worldAt(dx, dy, dz)]!.vegetation;
  }

  /** Breitenspanne [latHi, latLo] (rad) einer Welt: Zonenband bzw. flächengleiche Hälfte, ohne Polkappen des Pfads. */
  worldLatRange(index: number): [number, number] {
    const w = this.worlds[index];
    if (!w) throw new Error(`No world ${index}`);
    const zones = this.zoneCount;
    let latHi = Math.PI / 2 - (w.zone / zones) * Math.PI;
    let latLo = Math.PI / 2 - ((w.zone + 1) / zones) * Math.PI;
    const paired = w.side === 'far' ? (this.tables.farWorldB[w.zone] ?? -1) >= 0 : (this.tables.nearWorldB?.[w.zone] ?? -1) >= 0;
    if (paired) {
      const split = latHi + (latLo - latHi) * (this.tables.farSplit[w.zone] ?? 0.5);
      if (w.half === 1) latHi = split;
      else latLo = split;
    }
    // Polkappen ohne Pfad meiden
    latHi = Math.min(latHi, Math.PI / 2 - this.polarMargin - 0.02);
    latLo = Math.max(latLo, -Math.PI / 2 + this.polarMargin + 0.02);
    return [latHi, latLo];
  }

  /** Richtung des Weltmittelpunkts (Mitte der Breitenspanne, auf bzw. gegenüber dem Pfad). */
  worldCenterDir(index: number, out: Vec3 = [0, 0, 0]): Vec3 {
    const w = this.worlds[index]!;
    const [latHi, latLo] = this.worldLatRange(index);
    const lat = (latHi + latLo) * 0.5;
    const lon = this.pathLongitudeAt(lat) + (w.side === 'far' ? Math.PI : 0);
    out[0] = Math.cos(lat) * Math.cos(lon);
    out[1] = Math.sin(lat);
    out[2] = Math.cos(lat) * Math.sin(lon);
    return out;
  }

  private buildLandmark(l: PlanetLandmarkParams): LandmarkSlot {
    const w = this.worlds[l.world];
    if (!w) throw new Error(`Landmark "${l.id}" refers to world ${l.world}`);
    let dir: Vec3;
    if (l.dir) {
      const len = Math.hypot(l.dir[0], l.dir[1], l.dir[2]) || 1;
      dir = [l.dir[0] / len, l.dir[1] / len, l.dir[2] / len];
    } else {
      const [latHi, latLo] = this.worldLatRange(l.world);
      const f = l.latFrac ?? 0.5;
      const lat = latHi + (latLo - latHi) * f;
      const delta = ((l.deltaDeg ?? 34) * Math.PI) / 180;
      const lon = this.pathLongitudeAt(lat) + (w.side === 'far' ? Math.PI : delta);
      dir = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
    }
    const position: Vec3 = [0, 0, 0];
    const normal: Vec3 = [0, 0, 0];
    this.surfaceAt(dir[0], dir[1], dir[2], position, normal);
    return {
      id: l.id,
      world: l.world,
      zone: w.zone,
      position,
      normal,
      dir,
      yawDeg: l.yawDeg ?? 0,
      scale: l.scale,
      clearRadius: l.clearRadius,
      ...(l.instance ? { instance: l.instance } : {}),
    };
  }

  /** Wahrzeichen-Slots neu setzen (z. B. nachdem der Pfad bekannt ist); Streuungen danach neu erzeugen. */
  setLandmarks(landmarks: PlanetLandmarkParams[]): void {
    this.landmarkSlots = landmarks.map((l) => this.buildLandmark(l));
  }

  /** Chunk, in dessen Zelle eine Richtung liegt (Würfelseite nach größter Komponente, dann gnomonisch). */
  chunkOf(dx: number, dy: number, dz: number): ChunkId {
    return chunkIdOf(dx, dy, dz, this.params.chunksPerFace);
  }

  /** Terrainform am Ort: Welt-Parameter, schmal über Nah/Fern-, Hälften- und Zonengrenzen (Risse) geblendet. */
  shapeAt(dx: number, dy: number, dz: number): ResolvedShape {
    const zc = this.zoneCoord(dx, dy, dz);
    const side = this.pathSideAt(dx, dy, dz, this.sideTmp);
    return this.shapeFrom(zc, side[0]);
  }

  /** Terrainform aus Zonenkoordinate und cos Δ der Pfadseite (für Aufrufer, die beides schon haben). */
  shapeFrom(zc: number, cosSide: number): ResolvedShape {
    const nearW = this.cosHalfWidth <= -1 ? 1 : smoothstep01(this.cosOuter, this.cosInner, cosSide);
    const zones = this.zoneCount;
    const z = Math.min(zones - 1, Math.max(0, Math.floor(zc)));
    const f = zc - z;
    // Nur in einem schmalen Streifen um die Zonengrenze (±bw Zonenbreiten ≈ ±3.6°) mischen, sonst reine Weltform
    const bw = 0.08;
    let a = z;
    let b = z;
    let t = 0;
    if (f < bw && z > 0) {
      a = z - 1;
      t = smoothstep01(-bw, bw, f);
    } else if (f > 1 - bw && z < zones - 1) {
      b = z + 1;
      t = smoothstep01(1 - bw, 1 + bw, f);
    }
    const halfOf = (zi: number): number => {
      const split = this.tables.farSplit[zi] ?? 0.5;
      const local = zc - zi; // Koordinate relativ zum Band zi (kann außerhalb 0..1 liegen)
      return smoothstep01(split - 0.08, split + 0.08, local);
    };
    this.zoneShape(a, nearW, halfOf(a), this.tmpA);
    if (a === b || t <= 0) return this.tmpA;
    this.zoneShape(b, nearW, halfOf(b), this.tmpB);
    return mixShape(this.tmpA, this.tmpB, t, this.tmpC);
  }

  private zoneShape(z: number, nearW: number, half: number, out: ResolvedShape): ResolvedShape {
    const nearA = this.shapes[this.tables.nearWorld[z]!]!;
    const nb = this.tables.nearWorldB?.[z] ?? -1;
    const near = nb >= 0 ? mixShape(nearA, this.shapes[nb]!, half, this.tmpE) : nearA;
    const farA = this.shapes[this.tables.farWorldA[z]!]!;
    const b = this.tables.farWorldB[z] ?? -1;
    const far = b >= 0 ? mixShape(farA, this.shapes[b]!, half, this.tmpD) : farA;
    return mixShape(far, near, nearW, out);
  }

  /** Höhenamplitude am Ort (zwischen Welten weich überblendet). */
  amplitudeAt(dx: number, dy: number, dz: number): number {
    return this.shapeAt(dx, dy, dz).amplitude;
  }

  /** Höhe in Welteinheiten (0..Amplitude): runde Hügel, Grate, Ebenen mit Kuppen oder Rampen je Welt. */
  heightAt(dx: number, dy: number, dz: number): number {
    return this.heightWithShape(dx, dy, dz, this.shapeAt(dx, dy, dz));
  }

  /** Höhe mit vorab bestimmter Form (Nachbarproben der Normalen teilen die Form des Mittelpunkts). */
  heightWithShape(dx: number, dy: number, dz: number, s: ResolvedShape): number {
    const f = this.freq / Math.max(0.2, s.wavelength);
    const n = this.hills.fbm(dx * f, dy * f, dz * f, 2);
    const smooth = smoothstep01(0, 1, 0.5 + 0.55 * n);
    let base = smooth;
    if (s.ridge > 0) {
      const r = 1 - Math.abs(this.ridges.fbm(dx * f * 0.85 + 2.7, dy * f * 0.85 - 5.3, dz * f * 0.85 + 9.1, 2));
      base = smooth + (r * r - smooth) * s.ridge;
    }
    if (s.slope > 0) {
      const ramp = 0.5 + 0.5 * this.ramps.fbm(dx * f * 0.3 - 1.7, dy * f * 0.3 + 4.4, dz * f * 0.3 - 2.2, 1);
      base = base * (1 - s.slope * 0.5) + ramp * s.slope;
    }
    base = Math.min(1, Math.max(0, base));
    const h = s.floor > 0 ? smoothstep01(s.floor, 1, base) : base;
    return s.amplitude * h;
  }

  /** Höhe 0..1 relativ zur lokalen Amplitude. */
  heightNormAt(dx: number, dy: number, dz: number): number {
    const a = this.amplitudeAt(dx, dy, dz);
    return a > 1e-6 ? Math.min(1, this.heightAt(dx, dy, dz) / a) : 0;
  }

  biomeAt(dx: number, dy: number, dz: number): number {
    const f = this.freq * 0.45;
    return Math.min(1, Math.max(0, 0.5 + 0.6 * this.biome.fbm(dx * f + 5.1, dy * f - 2.3, dz * f + 9.7, 2)));
  }

  /** Waldmaske 0..1 (Klumpung der Vegetation). */
  forestAt(dx: number, dy: number, dz: number): number {
    const f = this.freq / 1.6;
    return 0.5 + 0.5 * this.forest.fbm(dx * f + 3.3, dy * f, dz * f - 7.1, 2);
  }

  /** Oberflächenpunkt (vom Planetenmittelpunkt) und Normale in einer Einheitsrichtung. */
  surfaceAt(dx: number, dy: number, dz: number, outPos: Vec3, outNormal: Vec3, knownShape?: ResolvedShape): number {
    const R = this.params.radius;
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l;
    dy /= l;
    dz /= l;
    // Form einmal am Mittelpunkt; die vier Nachbarproben (±0.34°) nutzen sie mit (Form ändert sich langsam)
    const sh = knownShape ?? this.shapeAt(dx, dy, dz);
    const shape: ResolvedShape = { amplitude: sh.amplitude, wavelength: sh.wavelength, ridge: sh.ridge, floor: sh.floor, slope: sh.slope };
    const h0 = this.heightWithShape(dx, dy, dz, shape);
    const r = R + h0;
    outPos[0] = dx * r;
    outPos[1] = dy * r;
    outPos[2] = dz * r;
    // Tangentialbasis
    const ax = Math.abs(dy) < 0.9 ? 0 : 1;
    const ay = Math.abs(dy) < 0.9 ? 1 : 0;
    let t1x = ay * dz;
    let t1y = -ax * dz;
    let t1z = ax * dy - ay * dx;
    const l1 = Math.hypot(t1x, t1y, t1z) || 1;
    t1x /= l1;
    t1y /= l1;
    t1z /= l1;
    const t2x = dy * t1z - dz * t1y;
    const t2y = dz * t1x - dx * t1z;
    const t2z = dx * t1y - dy * t1x;
    const eps = 0.006;
    const p = (ox: number, oy: number, oz: number): Vec3 => {
      const ex = dx + ox;
      const ey = dy + oy;
      const ez = dz + oz;
      const el = Math.hypot(ex, ey, ez) || 1;
      const rr = R + this.heightWithShape(ex / el, ey / el, ez / el, shape);
      return [(ex / el) * rr, (ey / el) * rr, (ez / el) * rr];
    };
    const pa = p(t1x * eps, t1y * eps, t1z * eps);
    const pb = p(-t1x * eps, -t1y * eps, -t1z * eps);
    const pc = p(t2x * eps, t2y * eps, t2z * eps);
    const pd = p(-t2x * eps, -t2y * eps, -t2z * eps);
    const ex = pa[0] - pb[0];
    const ey = pa[1] - pb[1];
    const ez = pa[2] - pb[2];
    const fx = pc[0] - pd[0];
    const fy = pc[1] - pd[1];
    const fz = pc[2] - pd[2];
    let nx = ey * fz - ez * fy;
    let ny = ez * fx - ex * fz;
    let nz = ex * fy - ey * fx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    if (nx * dx + ny * dy + nz * dz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    outNormal[0] = nx;
    outNormal[1] = ny;
    outNormal[2] = nz;
    return h0;
  }
}

// --- Chunk-Mesh ------------------------------------------------------------------------------------

export function generateChunkMesh(field: PlanetField, id: ChunkId, res: number): ChunkMeshData {
  const n = Math.max(2, Math.floor(res));
  const count = n * n;
  const cpf = field.params.chunksPerFace;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const height = new Float32Array(count);
  const zone = new Float32Array(count);
  const side = new Float32Array(count * 2);
  const border = new Float32Array(count);
  const borderId = new Float32Array(count);
  const dir: Vec3 = [0, 0, 0];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const sd: [number, number] = [0, 0];
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let j = 0; j < n; j++) {
    const lv = (j / (n - 1)) * 2 - 1;
    for (let i = 0; i < n; i++) {
      const lu = (i / (n - 1)) * 2 - 1;
      const k = j * n + i;
      chunkDirection(id, cpf, lu, lv, dir);
      // Zone, Pfadseite und Form einmal je Vertex; Höhe, Normale, Höhe 0..1 und Grenze daraus
      const zc = field.zoneCoord(dir[0], dir[1], dir[2]);
      field.pathSideAt(dir[0], dir[1], dir[2], sd);
      const sh = field.shapeFrom(zc, sd[0]);
      const amp = sh.amplitude;
      const h = field.surfaceAt(dir[0], dir[1], dir[2], pos, nor, sh);
      positions[k * 3] = pos[0];
      positions[k * 3 + 1] = pos[1];
      positions[k * 3 + 2] = pos[2];
      normals[k * 3] = nor[0];
      normals[k * 3 + 1] = nor[1];
      normals[k * 3 + 2] = nor[2];
      height[k] = amp > 1e-6 ? Math.min(1, h / amp) : 0;
      zone[k] = zc;
      side[k * 2] = sd[0];
      side[k * 2 + 1] = sd[1];
      const b = field.borderFromZone(zc);
      border[k] = Math.min(999, b.dist);
      borderId[k] = b.border;
      if (pos[0] < min[0]) min[0] = pos[0];
      if (pos[1] < min[1]) min[1] = pos[1];
      if (pos[2] < min[2]) min[2] = pos[2];
      if (pos[0] > max[0]) max[0] = pos[0];
      if (pos[1] > max[1]) max[1] = pos[1];
      if (pos[2] > max[2]) max[2] = pos[2];
    }
  }
  const quads = (n - 1) * (n - 1);
  const indices = count <= 65535 ? new Uint16Array(quads * 6) : new Uint32Array(quads * 6);
  let o = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices[o++] = a;
      indices[o++] = b;
      indices[o++] = c;
      indices[o++] = b;
      indices[o++] = d;
      indices[o++] = c;
    }
  }
  chunkDirection(id, cpf, 0, 0, dir);
  const centre: Vec3 = [dir[0] * field.params.radius, dir[1] * field.params.radius, dir[2] * field.params.radius];
  return {
    id,
    key: chunkKey(id),
    vertexCount: count,
    positions,
    normals,
    height,
    zone,
    side,
    border,
    borderId,
    indices,
    bounds: { min, max },
    center: centre,
    zoneIndex: field.zoneIndex(dir[0], dir[1], dir[2]),
    worldIndex: field.worldAt(dir[0], dir[1], dir[2]),
  };
}

// --- Streuung je Chunk ------------------------------------------------------------------------------

export interface ChunkScatterOptions {
  /** Multiplikator auf die Zonendichte (Qualitätsstufe). */
  densityScale?: number;
  /** Multiplikator auf die Müll-Dichte (Lab-Regler). */
  trashScale?: number;
  /** Punkte, die frei bleiben (Pfadkorridor, Wahrzeichen): true = verwerfen. `radius` = Platzbedarf des Objekts. */
  clear?: (p: Vec3, radius: number) => boolean;
  /** Rand in lokalen uv, in dem nichts steht (Standard 0.02). */
  edgeMargin?: number;
}

/** Poisson-Disc im lokalen Chunk-Raum, deterministisch über `hash32('chunk', zone, face, cx, cy)`. */
function poissonInChunk(field: PlanetField, id: ChunkId, salt: string, minDistWorld: number, margin: number): Array<{ lu: number; lv: number; dir: Vec3 }> {
  const cpf = field.params.chunksPerFace;
  const dir: Vec3 = [0, 0, 0];
  chunkDirection(id, cpf, 0, 0, dir);
  const zone = field.zoneIndex(dir[0], dir[1], dir[2]);
  const rand = mulberry32(hash32('chunk', salt, zone, id.face, id.cx, id.cy, field.params.seed));
  // Halbe Kantenlänge in Welteinheiten (am Chunk-Mittelpunkt)
  const e: Vec3 = [0, 0, 0];
  chunkDirection(id, cpf, 1, 0, e);
  const halfExtent = Math.acos(Math.min(1, dir[0] * e[0] + dir[1] * e[1] + dir[2] * e[2])) * field.params.radius;
  const r = Math.max(1e-3, minDistWorld / Math.max(1e-3, halfExtent));
  const lo = -1 + margin;
  const hi = 1 - margin;
  const cell = r / Math.SQRT2;
  const gridN = Math.ceil((hi - lo) / cell) + 1;
  const grid = new Int32Array(gridN * gridN).fill(-1);
  const pts: Array<[number, number]> = [];
  const active: number[] = [];
  const gi = (x: number, y: number) => Math.floor((y - lo) / cell) * gridN + Math.floor((x - lo) / cell);
  const fits = (x: number, y: number): boolean => {
    if (x < lo || x > hi || y < lo || y > hi) return false;
    const cx = Math.floor((x - lo) / cell);
    const cy = Math.floor((y - lo) / cell);
    for (let j = Math.max(0, cy - 2); j <= Math.min(gridN - 1, cy + 2); j++) {
      for (let i = Math.max(0, cx - 2); i <= Math.min(gridN - 1, cx + 2); i++) {
        const idx = grid[j * gridN + i]!;
        if (idx >= 0) {
          const q = pts[idx]!;
          const dx = q[0] - x;
          const dy = q[1] - y;
          if (dx * dx + dy * dy < r * r) return false;
        }
      }
    }
    return true;
  };
  const push = (x: number, y: number) => {
    pts.push([x, y]);
    grid[gi(x, y)] = pts.length - 1;
    active.push(pts.length - 1);
  };
  push(lo + rand() * (hi - lo), lo + rand() * (hi - lo));
  const maxPoints = 6000;
  while (active.length > 0 && pts.length < maxPoints) {
    const ai = Math.floor(rand() * active.length);
    const base = pts[active[ai]!]!;
    let placed = false;
    for (let k = 0; k < 20; k++) {
      const ang = rand() * Math.PI * 2;
      const dist = r * (1 + rand());
      const x = base[0] + Math.cos(ang) * dist;
      const y = base[1] + Math.sin(ang) * dist;
      if (fits(x, y)) {
        push(x, y);
        placed = true;
        break;
      }
    }
    if (!placed) {
      active[ai] = active[active.length - 1]!;
      active.pop();
    }
  }
  return pts.map(([lu, lv]) => ({ lu, lv, dir: chunkDirection(id, cpf, lu, lv, [0, 0, 0]) }));
}

/** Freihalte-Prüfung inklusive Wahrzeichen-Radien. */
function isCleared(field: PlanetField, options: ChunkScatterOptions, p: Vec3, radius: number): boolean {
  if (options.clear && options.clear(p, radius)) return true;
  for (const l of field.landmarkSlots) {
    const d = Math.hypot(p[0] - l.position[0], p[1] - l.position[1], p[2] - l.position[2]);
    if (d < l.clearRadius + radius) return true;
  }
  return false;
}

export function scatterChunkTrees(field: PlanetField, id: ChunkId, options: ChunkScatterOptions = {}): PlanetTree[] {
  const cpf = field.params.chunksPerFace;
  const centreDir: Vec3 = [0, 0, 0];
  chunkDirection(id, cpf, 0, 0, centreDir);
  const centreZone = field.zoneIndex(centreDir[0], centreDir[1], centreDir[2]);
  const family = field.familyAt(centreDir[0], centreDir[1], centreDir[2]);
  const density = family.density * (options.densityScale ?? 1);
  if (density <= 0) return [];
  const minDist = Math.sqrt(1 / (density * 1.7));
  const rand = mulberry32(hash32('trees', centreZone, id.face, id.cx, id.cy, field.params.seed));
  const pts = poissonInChunk(field, id, 'trees', minDist, options.edgeMargin ?? 0.02);
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const raw: Array<{ tree: PlanetTree; priority: number }> = [];
  for (const q of pts) {
    const d = q.dir;
    // Welt am Baum (kann von der Chunk-Welt abweichen): eigene Familie
    const world = field.worldAt(d[0], d[1], d[2]);
    const zone = field.zoneIndex(d[0], d[1], d[2]);
    const fam = field.worlds[world]!.vegetation;
    if (fam.density <= 0) continue;
    // Dichte relativ zur Chunk-Familie (dichtere Welten behalten ihr Poisson-Raster, dünnere lichten aus)
    const rel = Math.min(1, fam.density / Math.max(1e-6, family.density));
    const forest = field.forestAt(d[0], d[1], d[2]);
    const ft = fam.forestThreshold ?? 0.51;
    const fm = smoothstep(ft - 0.09, ft + 0.09, forest);
    let pAccept = rel * (1 - fam.clumpiness + fam.clumpiness * fm);
    if (fam.rows) {
      // Hecke: Nähe zur nächsten Höhenlinie h = k·spacing (leicht verrauscht, damit die Reihen atmen)
      const hn = field.heightNormAt(d[0], d[1], d[2]) + (forest - 0.5) * 0.12;
      const q = Math.abs((hn / fam.rows.spacing) % 1 - 0.5) * 2; // 1 auf der Linie, 0 dazwischen
      pAccept = rel * smoothstep(1 - fam.rows.width, 1 - fam.rows.width * 0.4, q);
    }
    if (rand() > pAccept) continue;
    // Earle-Komposition (Haine an Höhenlinien, Wiesen, Solitäre; ohne `vegetation.grove` unverändert): scatterTrees.ts
    const pick = composeGroveTree(field, d, fam, pickKind(fam.kinds, rand()), fam.scale[0] + (fam.scale[1] - fam.scale[0]) * (0.35 * rand() + 0.65 * rand()), rand);
    if (!pick) continue;
    const { kind, scale } = pick;
    const prop = TREE_PROPORTIONS[kind];
    const canopyRadius = prop.radius * scale;
    field.surfaceAt(d[0], d[1], d[2], pos, nor);
    if (isCleared(field, options, pos, canopyRadius)) continue;
    const trunkHeight = prop.trunk * canopyRadius;
    const hullH = prop.hull * canopyRadius;
    raw.push({
      tree: {
        position: [pos[0], pos[1], pos[2]],
        normal: [nor[0], nor[1], nor[2]],
        kind,
        scale,
        canopyRadius,
        trunkHeight,
        hullCenter: [pos[0] + nor[0] * hullH, pos[1] + nor[1] * hullH, pos[2] + nor[2] * hullH],
        growth: 0,
        zone,
        world,
        rank: 0,
        variant: rand(),
      },
      priority: rand(),
    });
  }
  raw.sort((a, b) => a.priority - b.priority);
  // Fokus-Bäume der Weltkompositionen (Landmark-Slots mit Baum-Instanz), genau im Chunk ihres Slots, wachsen zuerst
  for (const l of field.landmarkSlots) {
    const inst = l.instance;
    if (!inst || !isTreeKind(inst.kind)) continue;
    const c = field.chunkOf(l.dir[0], l.dir[1], l.dir[2]);
    if (c.face !== id.face || c.cx !== id.cx || c.cy !== id.cy) continue;
    const kind = inst.kind;
    const prop = TREE_PROPORTIONS[kind];
    const canopyRadius = prop.radius * inst.scale;
    const hullH = prop.hull * canopyRadius;
    const [px, py, pz] = l.position;
    const [nx, ny, nz] = l.normal;
    raw.unshift({
      tree: {
        position: [px, py, pz],
        normal: [nx, ny, nz],
        kind,
        scale: inst.scale,
        canopyRadius,
        trunkHeight: prop.trunk * canopyRadius,
        hullCenter: [px + nx * hullH, py + ny * hullH, pz + nz * hullH],
        growth: 0,
        zone: l.zone,
        world: l.world,
        rank: 0,
        variant: 0.37,
      },
      priority: -1,
    });
  }
  const n = raw.length;
  return raw.map((e, i) => ({ ...e.tree, rank: n > 0 ? i / n : 0, growth: n > 0 ? i / n : 0 }));
}

const TREE_KIND_SET = new Set<string>(TREE_KIND_LIST);
function isTreeKind(k: string): k is TreeKind {
  return TREE_KIND_SET.has(k);
}

const TRASH_KINDS: Array<[PlanetPropKind, number]> = [
  ['mound', 0.34],
  ['monolith', 0.1],
  ['vent', 0.14],
  ['tire', 0.22],
  ['pipe', 0.2],
];

/** Platzbedarf (Radius in Welteinheiten) je Requisit bei Skalierung 1. */
const PROP_FOOTPRINT: Record<PlanetPropKind, number> = {
  scrap: 0.7,
  pool: 1.2,
  animal: 0.4,
  mound: 0.9,
  monolith: 0.6,
  vent: 0.5,
  tire: 0.5,
  pipe: 0.9,
  barn: 2.6,
  rock: 0.8,
};

export function scatterChunkProps(field: PlanetField, id: ChunkId, options: ChunkScatterOptions = {}): PlanetProp[] {
  const cpf = field.params.chunksPerFace;
  const centreDir: Vec3 = [0, 0, 0];
  chunkDirection(id, cpf, 0, 0, centreDir);
  const centreZone = field.zoneIndex(centreDir[0], centreDir[1], centreDir[2]);
  const centreWorld = field.worldAt(centreDir[0], centreDir[1], centreDir[2]);
  const world = field.worlds[centreWorld]!;
  const family = world.vegetation;
  const out: PlanetProp[] = [];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  const scale = options.densityScale ?? 1;
  const trashScale = options.trashScale ?? 1;

  const place = (
    density: number,
    salt: string,
    pick: (rand: () => number, forest: number, spec: PlanetPropSpec | undefined, fam: PlanetVegetationFamily) => { kind: PlanetPropKind; scale: number } | null,
  ) => {
    if (density <= 0) return;
    const minDist = Math.sqrt(1 / (density * 1.7));
    const rand = mulberry32(hash32(salt, centreZone, id.face, id.cx, id.cy, field.params.seed));
    const pts = poissonInChunk(field, id, salt, minDist, options.edgeMargin ?? 0.03);
    const items: Array<{ prop: PlanetProp; priority: number }> = [];
    for (const q of pts) {
      const d = q.dir;
      const zone = field.zoneIndex(d[0], d[1], d[2]);
      const w = field.worldAt(d[0], d[1], d[2]);
      const forest = field.forestAt(d[0], d[1], d[2]);
      const r = pick(rand, forest, field.worlds[w]!.props, field.worlds[w]!.vegetation);
      const yaw = rand() * Math.PI * 2;
      const variant = rand();
      const priority = rand();
      if (!r) continue;
      field.surfaceAt(d[0], d[1], d[2], pos, nor);
      if (isCleared(field, options, pos, PROP_FOOTPRINT[r.kind] * r.scale)) continue;
      items.push({ prop: { kind: r.kind, position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], scale: r.scale, yaw, zone, world: w, rank: 0, variant }, priority });
    }
    items.sort((a, b) => a.priority - b.priority);
    items.forEach((e, i) => out.push({ ...e.prop, rank: items.length > 0 ? i / items.length : 0 }));
  };

  const spec = world.props;
  if (spec) {
    // Neues Format: Welt-Requisiten
    place((spec.trash ?? 0) * scale * trashScale, 'trash', (rand, forest, s) => {
      if (!s?.trash || rand() > Math.min(1, s.trash / Math.max(1e-6, spec.trash ?? 1))) return null;
      if (forest > 0.62 && rand() < 0.6) return null;
      let acc = 0;
      const t = rand();
      let kind: PlanetPropKind = 'mound';
      for (const [k, w] of TRASH_KINDS) {
        acc += w;
        if (t < acc) {
          kind = k;
          break;
        }
      }
      const size = kind === 'monolith' ? 0.8 + rand() * 1.4 : kind === 'mound' ? 0.6 + rand() * 1.1 : 0.5 + rand() * 0.7;
      return { kind, scale: size };
    });
    place((spec.pools ?? 0) * scale * trashScale, 'pool', (rand, forest, s) => (s?.pools && forest < 0.55 && rand() < 0.85 ? { kind: 'pool', scale: 1.3 + rand() * 1.9 } : null));
    place((spec.barns ?? 0) * scale, 'barn', (rand, forest, s) => (s?.barns && forest < 0.6 ? { kind: 'barn', scale: 2.2 + rand() * 1.6 } : null));
    place((spec.rocks ?? 0) * scale, 'rock', (rand, _forest, s) => (s?.rocks && rand() < 0.8 ? { kind: 'rock', scale: 0.7 + rand() * 1.5 } : null));
    place((spec.animals ?? 0) * scale, 'animal', (rand, forest, s) => (s?.animals && forest < 0.5 && rand() < 0.7 ? { kind: 'animal', scale: 0.8 + rand() * 0.35 } : null));
    // Fokus-Requisiten der Weltkompositionen (z. B. die rote Scheune in Welt 08)
    for (const l of field.landmarkSlots) {
      const inst = l.instance;
      if (!inst || isTreeKind(inst.kind)) continue;
      const c = field.chunkOf(l.dir[0], l.dir[1], l.dir[2]);
      if (c.face !== id.face || c.cx !== id.cx || c.cy !== id.cy) continue;
      out.push({
        kind: inst.kind as PlanetPropKind,
        position: [l.position[0], l.position[1], l.position[2]],
        normal: [l.normal[0], l.normal[1], l.normal[2]],
        scale: inst.scale,
        yaw: (l.yawDeg * Math.PI) / 180,
        zone: l.zone,
        world: l.world,
        rank: 0,
        variant: 0.37,
      });
    }
    return out;
  }

  // Altformat (Zonen ohne Weltenliste)
  if (family.props === 'scrap') place((family.propDensity ?? 0.03) * scale, 'scrap', (rand) => (rand() < 0.75 ? { kind: 'scrap', scale: 0.5 + rand() * 0.9 } : null));
  if (family.props === 'pool') place((family.propDensity ?? 0.02) * scale, 'pool', (rand, forest) => (forest < 0.55 && rand() < 0.8 ? { kind: 'pool', scale: 1.4 + rand() * 1.8 } : null));
  place((family.animalDensity ?? 0.012) * scale, 'animal', (rand, forest) => (forest < 0.5 && rand() < 0.7 ? { kind: 'animal', scale: 0.8 + rand() * 0.35 } : null));
  return out;
}

// --- Spiralpfad ------------------------------------------------------------------------------------

export interface SpiralOptions {
  nodesPerZone: number;
  /** Umdrehungen von Pol zu Pol (Standard: Feldparameter). */
  turns?: number;
  /** Polkappen ohne Pfad (Grad; Standard: Feldparameter). */
  polarMarginDeg?: number;
  /** Abstand der Knoten zu den nominellen Zonengrenzen in Zonenbreiten. */
  borderPad?: number;
  dotSpacing?: number;
  dotClearance?: number;
}

/**
 * Großkreis-Spirale von Pol zu Pol: Breite läuft linear, Länge dreht `turns` mal. Je Zone `nodesPerZone`
 * Knoten in gleichen Bogenlängen innerhalb des Zonenbands (mit Abstand zu den Grenzen), Punkte dazwischen.
 */
export function spiralPath(field: PlanetField, options: SpiralOptions): SpiralPath {
  const zones = field.zoneCount;
  const turns = options.turns ?? field.turns;
  const margin = options.polarMarginDeg !== undefined ? (options.polarMarginDeg * Math.PI) / 180 : field.polarMargin;
  const pad = options.borderPad ?? 0.09;
  const dotSpacing = options.dotSpacing ?? 0.6;
  const dotClearance = options.dotClearance ?? 0.95;

  const dirAt = (s: number, out: Vec3): Vec3 => {
    const lat = Math.PI / 2 - margin - s * (Math.PI - 2 * margin);
    const lon = s * turns * Math.PI * 2;
    out[0] = Math.cos(lat) * Math.cos(lon);
    out[1] = Math.sin(lat);
    out[2] = Math.cos(lat) * Math.sin(lon);
    return out;
  };

  // Feine Polylinie mit Bogenlänge
  const steps = 4000;
  const samples: Array<{ s: number; pos: Vec3; nor: Vec3; len: number }> = [];
  const d: Vec3 = [0, 0, 0];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  let total = 0;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    dirAt(s, d);
    field.surfaceAt(d[0], d[1], d[2], pos, nor);
    if (i > 0) {
      const p = samples[i - 1]!.pos;
      total += Math.hypot(pos[0] - p[0], pos[1] - p[1], pos[2] - p[2]);
    }
    samples.push({ s, pos: [pos[0], pos[1], pos[2]], nor: [nor[0], nor[1], nor[2]], len: total });
  }
  const lenAtS = (s: number): number => {
    const i = Math.min(steps, Math.max(0, Math.floor(s * steps)));
    const a = samples[i]!;
    const b = samples[Math.min(steps, i + 1)]!;
    const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return a.len + (b.len - a.len) * t;
  };
  const at = (len: number): { s: number; pos: Vec3; nor: Vec3 } => {
    const target = Math.min(total, Math.max(0, len));
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.len <= target) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!;
    const b = samples[hi]!;
    const t = b.len > a.len ? (target - a.len) / (b.len - a.len) : 0;
    return {
      s: a.s + (b.s - a.s) * t,
      pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * t, a.pos[1] + (b.pos[1] - a.pos[1]) * t, a.pos[2] + (b.pos[2] - a.pos[2]) * t],
      nor: [a.nor[0] + (b.nor[0] - a.nor[0]) * t, a.nor[1] + (b.nor[1] - a.nor[1]) * t, a.nor[2] + (b.nor[2] - a.nor[2]) * t],
    };
  };

  // Zonenband in s: Breite lat ∈ [90 − 180k/zones, …] ↔ s über die Polkappen-Marge
  const latToS = (latRad: number): number => (Math.PI / 2 - margin - latRad) / (Math.PI - 2 * margin);
  const nodes: SpiralNode[] = [];
  let index = 0;
  for (let z = 0; z < zones; z++) {
    const latHi = Math.PI / 2 - (z / zones) * Math.PI;
    const latLo = Math.PI / 2 - ((z + 1) / zones) * Math.PI;
    const padRad = (pad * Math.PI) / zones;
    const s0 = Math.max(0, latToS(latHi - padRad));
    const s1 = Math.min(1, latToS(latLo + padRad));
    const l0 = lenAtS(s0);
    const l1 = lenAtS(s1);
    const n = options.nodesPerZone;
    for (let i = 0; i < n; i++) {
      const len = n > 1 ? l0 + ((l1 - l0) * i) / (n - 1) : (l0 + l1) / 2;
      const { s } = at(len);
      dirAt(s, d);
      field.surfaceAt(d[0], d[1], d[2], pos, nor);
      const lat = (Math.asin(d[1]) * 180) / Math.PI;
      const lon = (Math.atan2(d[2], d[0]) * 180) / Math.PI;
      nodes.push({ index: index++, zone: z, position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], lat, lon });
    }
  }

  const dots: SpiralPath['dots'] = [];
  const first = nodes[0] ? lenAtS(latToS((nodes[0].lat * Math.PI) / 180)) : 0;
  const last = nodes.length > 0 ? lenAtS(latToS((nodes[nodes.length - 1]!.lat * Math.PI) / 180)) : total;
  for (let len = first + dotSpacing * 0.5; len < last; len += dotSpacing) {
    const { pos: p, nor: nn } = at(len);
    let near = false;
    for (const node of nodes) {
      if (Math.hypot(p[0] - node.position[0], p[1] - node.position[1], p[2] - node.position[2]) < dotClearance) {
        near = true;
        break;
      }
    }
    if (near) continue;
    const l = Math.hypot(nn[0], nn[1], nn[2]) || 1;
    dots.push({ position: [p[0], p[1], p[2]], normal: [nn[0] / l, nn[1] / l, nn[2] / l] });
  }
  return { nodes, dots, length: total };
}

function pickKind(weights: Partial<Record<TreeKind, number>>, r: number): TreeKind {
  const entries = Object.entries(weights) as Array<[TreeKind, number]>;
  const total = entries.reduce((a, [, w]) => a + (w ?? 0), 0) || 1;
  let acc = 0;
  for (const [kind, w] of entries) {
    acc += (w ?? 0) / total;
    if (r < acc) return kind;
  }
  return entries[entries.length - 1]?.[0] ?? 'dome';
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
