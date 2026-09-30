import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import {
  abs,
  attribute,
  cameraProjectionMatrix,
  clamp,
  cross,
  float,
  floor,
  fract,
  fwidth,
  int,
  max,
  min,
  mix,
  modelViewMatrix,
  normalGeometry,
  normalize,
  positionGeometry,
  positionLocal,
  positionView,
  screenSize,
  select,
  sin,
  smoothstep,
  step,
  uniform,
  uniformArray,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import type { PlaneProp as PlanetProp, PlaneTree as PlanetTree, PlaneVegetationFamily as PlanetVegetationFamily, TreeFamily } from '@ee/world';
import type { WorldSlots } from './worldSlots';
import { SLOT_COUNT, SLOT_ROWS } from './worldSlots';
import { EarleMaterial } from './EarleMaterial';
import { hatchMask, patternTime, steppedFog, stripeMask, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from './tsl';
import { createHexagon, mergeGeometries } from './vegetation';
import { CROWN_KINDS, TreeLayer, type CrownKind, type ShadowFactorFn } from './trees/treeLayer';

/** Zahl der Wachstums-Slots (ein Slot je geladenem Chunk; die Ebene lädt bis ≈ 60 Chunks). */
export const GROWTH_SLOTS = 96;
const POP = 0.15;

/** Palettenzeilen einer Welt für die Vegetation und Requisiten. */
export interface VegetationWorldRows {
  terrain: number;
  /** Kronenzeilen (Hauptzeile zuerst; Varianten für den Juwelenwald). */
  canopy: number[];
  accent: number;
  monolith: number;
  barn: number;
}

export interface PlanetVegetationOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  /** Welt-Slots (Palettenzeilen je Welt); Instanzen tragen Zeilen und Slots, nie Weltkennungen. */
  slots: WorldSlots;
  /** Vegetationsfamilie einer Welt (Kennung). */
  family: (world: number) => PlanetVegetationFamily;
  capacity: { trees: number; dots: number; props: number; animals: number };
  /** Schleier über Nachbarwelten: Zusatz-Nebeldistanz je Welt-Slot (TSL); fehlt → kein Schleier. */
  veil?: (slot: FloatNode) => FloatNode;
  /** Fremdheit 0..1 eines Welt-Slots (0 = Blick-Welt, 1 = Nachbar); nahe fremde Instanzen treten aus dem Bild. */
  foreign?: (slot: FloatNode) => FloatNode;
  dotsPerTree: [number, number];
  collapsePx: number;
  dotRadius?: number;
  seed?: number;
  /** Anzeige-Abbildung (Objektraum → Objektraum, wie das Terrain). */
  warp?: ((p: Vec3Node) => Vec3Node) | undefined;
  /**
   * Eingebauten Müll (Schrotthügel, Monolithe, Gasquellen, Reifen, Rohre, Ölbecken, Sporen) streuen (Standard true).
   * `false`, wenn eine eigene Müll-Welt ihn ersetzt; Felsen, Scheunen und Tiere bleiben.
   */
  builtinTrash?: boolean;
  /**
   * Glatter Schattenwert an einer Weltposition (Vertex-Stufe), z. B. `(p, o) => sunRig.shadowFactor(p, o)`: die
   * Kronenpunkte skalieren im Schlagschatten stetig aus 0. Fehlt → Punkte empfangen den Schatten je Fragment.
   */
  shadowFactor?: ShadowFactorFn | null;
}

export interface VegetationTreeEntry {
  tree: PlanetTree;
  /** Wachstums-Slot des Chunks. */
  slot: number;
  /** Nur nahe Chunks bekommen Punkte. */
  withDots: boolean;
}

export interface VegetationPropEntry {
  prop: PlanetProp;
  slot: number;
}

/** Requisiten-Typ im gemeinsamen Material (propC.w = Typ + Variante). */
const PROP_TYPE: Record<PlanetProp['kind'], number> = { mound: 0, scrap: 0, rock: 1, monolith: 2, vent: 3, tire: 4, pipe: 5, barn: 6, pool: 7, animal: 7 };

/** Größe (x, Höhe, z) eines Requisits in Welteinheiten. */
function propSize(p: PlanetProp): [number, number, number] {
  const s = p.scale;
  switch (p.kind) {
    case 'rock':
      return [s * 0.8, s * 1.5, s * 0.7];
    case 'monolith':
      return [s * 0.55, s * 2.6, s * 0.55];
    case 'vent':
      return [s * 0.9, s * 0.55, s * 0.9];
    case 'pool':
      return [s, 1, s * 0.62];
    case 'tire':
    case 'pipe':
    case 'barn':
      return [s, s, s];
    default:
      return [s * 1.3, s * 0.75, s * 1.1];
  }
}

/** Kronen-Grundformen der Bäume v3 (ein Mesh je Grundform): Kuppel-Masse, Juwel, Säule, Stufenkiefer. */
export type CanopyMesh = CrownKind;
export const CANOPY_MESHES: CanopyMesh[] = CROWN_KINDS;
/** Müll-Requisiten (werden mit `builtinTrash: false` nicht gestreut — die Müll-Welt kann sie ersetzen). */
const TRASH_PROPS = new Set<PlanetProp['kind']>(['mound', 'scrap', 'monolith', 'vent', 'tire', 'pipe', 'pool']);
const _Y = new Vector3(0, 1, 0);
const _q = new Quaternion();
const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _n = new Vector3();
const _qYaw = new Quaternion();

/**
 * Vegetation und Requisiten des Planeten als feste Pools (Kapazität vorab). Bäume v3 (`trees/treeLayer.ts`): je
 * Kronenform ein InstancedMesh (Kuppel-Masse, Juwel, Säule, Stufenkiefer), organische Stämme (Gabel, Fächer, Eiche)
 * mit Rindenstilen je Welt (Kalligrafie, Flechten, Juwelenstreifen, weiß, Schnee), kahle Linienbäume als Karten und
 * ein Punkt-Pool (Randfunkeln, Spitzenschleier, Sternnadeln). Dazu Müll (Schrotthügel/Felsen, Monolithe/Gasquellen,
 * Reifen, Rohre, Ölbecken, Sporen; abschaltbar mit `builtinTrash: false`), Scheunen und Tier-Silhouetten. Beim
 * Wechsel der geladenen Chunks werden nur die Instanzpuffer neu geschrieben. Wachstum je Chunk über ein
 * Uniform-Array: Bäume wachsen in den Chunk hinein, Müll versinkt im Boden.
 */
export class PlanetVegetation {
  readonly group = new Group();
  /** Bäume v3: Kronen, organische Stämme, Linienbäume, Punkte (trees/treeLayer.ts). */
  readonly trees: TreeLayer;
  /** Alle festen Requisiten (Schrott, Fels, Monolith, Gasquelle, Reifen, Rohr, Scheune) in einem Mesh. */
  readonly props: InstancedMesh;
  readonly pools: InstancedMesh;
  readonly animals: InstancedMesh;
  readonly spores: Mesh;
  /** Höchster Baum/Prop im aktuellen Inhalt (für die Schattenkamera). */
  hMax = 4;
  private readonly growthSlots = uniformArray(new Array<number>(GROWTH_SLOTS).fill(1), 'float');
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly sunDirLocal = uniform(new Vector3(0, 1, 0));
  private readonly camLocal = uniform(new Vector3(0, 50, 0));
  private readonly projScaleY = uniform(1);
  private readonly collapsePx = uniform(0.75);
  /** Freiraum vor der Linse (Welteinheiten): Instanzen näher an der Kamera schrumpfen weg. */
  private readonly nearClear = uniform(0.25);
  /**
   * Lichtung unter der Kamera (Welteinheiten, 0 = aus): Instanzen, deren Fuß seitlich näher als dieser Radius an der
   * Hochachse der Kamera steht, schrumpfen weg — das untere Bildband bleibt ruhiger Boden (Earle: stiller Vordergrund,
   * in den die langen Schatten der Mittelgrund-Bäume fallen).
   */
  private readonly footClear = uniform(0);
  /**
   * Nachbarwelten nah an der Kamera (Welteinheiten): fremde Bäume/Requisiten näher als dieser Abstand treten weg — die
   * Nachbarn bleiben ferne Nebelstufen und ragen nicht groß ins Bild (0 = aus).
   */
  private readonly foreignClear = uniform(11);
  /**
   * Sichtlinie (Karte): Ziel (Objektraum der Vegetation, z. B. der aktuelle Knoten) und Radius. Bäume und Requisiten,
   * deren Achse der Linie Kamera → Ziel näher kommt als ihr Radius + `sightRadius`, schrumpfen weg — kein Juwelenbaum
   * steht zwischen Kamera und Held. Radius 0 = aus.
   */
  private readonly sightTarget = uniform(new Vector3(0, -1000, 0));
  private readonly sightRadius = uniform(0);
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Array<{ dispose(): void }> = [];
  private readonly sporesGeometry: InstancedBufferGeometry;
  private readonly capacity: PlanetVegetationOptions['capacity'];
  private readonly warp: (p: Vec3Node) => Vec3Node;

  constructor(readonly options: PlanetVegetationOptions) {
    this.group.name = 'PlanetVegetation';
    this.collapsePx.value = options.collapsePx;
    this.capacity = options.capacity;
    this.warp = options.warp ?? ((p) => p);
    const { lookup, fog } = options;
    const warp = this.warp;

    // Schleier: Palettenzeile → Welt-Slot (feste Zeilenblöcke je Slot), fremde Welten bekommen Zusatz-Nebeldistanz
    const slotOfRow = (row: FloatNode): FloatNode => select(row.lessThan(SLOT_COUNT * SLOT_ROWS), floor(row.add(0.01).div(SLOT_ROWS)), float(-1));
    const veilOfRow = (row: FloatNode): FloatNode => {
      if (!options.veil) return float(0);
      const w = slotOfRow(row);
      return select(w.lessThan(-0.5), float(0), options.veil(w));
    };
    /** Nebeldistanz eines Fragments: Kameraabstand + Schleier seiner Welt. */
    const fogDist = (row: FloatNode, dist: FloatNode = positionView.length()): FloatNode => dist.add(veilOfRow(row));
    /** Fremde Instanz nahe der Kamera → 0 (tritt weg), eigene Welt → 1. */
    const foreignNear = (row: FloatNode, base: Vec3Node): FloatNode => {
      if (!options.foreign) return float(1);
      const w = slotOfRow(row);
      const f = select(w.lessThan(-0.5), float(0), options.foreign(w));
      const d = this.camLocal.sub(base).length();
      return mix(float(1), smoothstep(this.foreignClear, this.foreignClear.add(3), d), f);
    };

    const slotGrowth = (slotAttr: FloatNode): FloatNode =>
      (this.growthSlots as unknown as { element(i: unknown): FloatNode }).element(int(slotAttr));
    const popScale = (rank: FloatNode, slot: FloatNode): FloatNode => {
      const g = slotGrowth(slot);
      const pop = clamp(g.mul(1.15).sub(rank).div(POP), 0, 1);
      return pop.mul(mix(float(0.45), float(1), g));
    };
    /** Müll: 0 = steht, 1 = im Boden versunken (Rang staffelt das Versinken entlang der Heilung). */
    const sinkAmount = (rank: FloatNode, slot: FloatNode): FloatNode => {
      const g = slotGrowth(slot);
      return clamp(g.mul(1.15).sub(rank.mul(0.85)).div(0.25), 0, 1);
    };

    /**
     * Nähe-Ausblendung: Instanzen, deren Achse (Fuß → Krone) näher als `radius` + 0.25..1.6 an der Kamera liegt,
     * schrumpfen weg — die Kamera steht nie in einer Krone, einem Stamm oder einer Scheune.
     */
    const footFade = (base: Vec3Node): FloatNode => {
      // Ebene: seitlicher Abstand des Fußes zur Hochachse der Kamera (nur der Fuß zählt: große Elemente außerhalb der
      // Lichtung bleiben ganz)
      const lateral = vec2(base.x.sub(this.camLocal.x), base.z.sub(this.camLocal.z)).length();
      const clear = smoothstep(this.footClear, this.footClear.add(1.8), lateral);
      return select(this.footClear.greaterThan(0.01), clear, float(1));
    };
    /** Abstand eines Punkts zur Sichtlinie Kamera → Ziel (nur zwischen den Enden, am Ziel selbst nicht). */
    const sightDist = (p: Vec3Node): FloatNode => {
      const ab = this.sightTarget.sub(this.camLocal);
      const len2 = ab.dot(ab).max(1e-4);
      const t = clamp(p.sub(this.camLocal).dot(ab).div(len2), 0, 0.92);
      return p.sub(this.camLocal.add(ab.mul(t))).length() as unknown as FloatNode;
    };
    const nearFade = (base: Vec3Node, top: Vec3Node, radius: FloatNode): FloatNode => {
      const axis = top.sub(base);
      const len2 = axis.dot(axis).max(1e-4);
      const t = clamp(this.camLocal.sub(base).dot(axis).div(len2), 0, 1);
      const closest = base.add(axis.mul(t));
      const gap = this.camLocal.sub(closest).length().sub(radius);
      // Sichtlinie: drei Punkte der Achse (Fuß, Mitte, Spitze) gegen die Linie Kamera → Ziel
      const sd = min(min(sightDist(base.add(axis.mul(0.3))), sightDist(base.add(axis.mul(0.65)))), sightDist(top)).sub(radius);
      const sight = select(this.sightRadius.greaterThan(0.01), smoothstep(this.sightRadius, this.sightRadius.add(1.4), sd), float(1));
      return smoothstep(this.nearClear, this.nearClear.add(1.6), gap).mul(footFade(base)).mul(sight);
    };

    // --- Bäume v3 (Kronen, Stämme, Linienbäume, Punkte): trees/treeLayer.ts ------------------------------
    this.trees = new TreeLayer(
      {
        lookup,
        fog,
        bands: options.bands,
        warp,
        fogDist,
        foreignNear,
        popScale,
        slotGrowth,
        nearFade,
        footFade,
        slotOfRow,
        nearClear: this.nearClear,
        camLocal: this.camLocal,
        sunDirLocal: this.sunDirLocal,
        projScaleY: this.projScaleY,
        collapsePx: this.collapsePx,
        shadowFactor: options.shadowFactor ?? null,
      },
      {
        slots: options.slots,
        family: (w) => options.family(w) as TreeFamily,
        capacity: { trees: options.capacity.trees, dots: options.capacity.dots },
        dotsPerTree: options.dotsPerTree,
        ...(options.dotRadius !== undefined ? { dotRadius: options.dotRadius } : {}),
      },
    );
    for (const m of this.trees.meshes) this.group.add(m);
    // Stämme: dünne Schattenlinien — nur in den zwei feinen Kaskaden (die Kronen werfen in allen)
    for (const m of Object.values(this.trees.trunks)) m.userData.shadowCascades = 2;

    // --- Requisiten -------------------------------------------------------------------------------------
    // Gepackte Attribute: propA = (Fußpunkt xyz, Rang), propB = (Normale xyz, Höhe), propC = (Slot, Zeile, Zeile 2, Typ + Variante)
    // Typ: 0 Schrotthügel, 1 Fels, 2 Monolith, 3 Gasquelle, 4 Reifen, 5 Rohr, 6 Scheune, 7 Becken
    const propA = () => attribute('propA', 'vec4');
    const propB = () => attribute('propB', 'vec4');
    const propC = () => attribute('propC', 'vec4');
    const propType = () => floor(propC().w);
    const propVariant = () => fract(propC().w);
    const propRow = () => propC().y;
    const propRow2 = () => propC().z;
    /** Müll versinkt mit der Heilung; Fels und Scheune wachsen wie Bäume. `part` blendet fremde Teilformen aus. */
    const propGrown = (part: FloatNode | null): Vec3Node => {
      const base = propA().xyz;
      const rank = propA().w;
      const slot = propC().x;
      const type = propType();
      const up = propB().xyz;
      const h = propB().w;
      const fade = nearFade(base, base.add(up.mul(h)), h.mul(0.8).add(0.5)).mul(foreignNear(propRow(), base));
      // Teilform des Typs: Klumpen (0, 1), Turm (2, 3), Reifen (4), Rohr (5), Scheune (6)
      const want = select(type.lessThan(1.5), float(0), select(type.lessThan(3.5), float(1), type.sub(2)));
      const keep = part ? step(abs(part.sub(want)), float(0.5)) : float(1);
      const local = positionLocal.sub(base).mul(fade.mul(keep));
      const sink = sinkAmount(rank, slot);
      const trash = base.add(local.mul(sink.mul(0.35).oneMinus())).sub(up.mul(sink.mul(h.add(0.3)).mul(keep)));
      const solid = base.add(local.mul(popScale(rank, slot)));
      const isSolid = type.greaterThan(0.5).and(type.lessThan(1.5)).or(type.greaterThan(5.5).and(type.lessThan(6.5)));
      return select(isSolid, solid, trash);
    };
    const makeProp = (name: string, geometry: BufferGeometry, material: EarleMaterial | MeshBasicNodeMaterial, cap: number, castShadow = true): InstancedMesh => {
      this.attachPropAttributes(geometry, cap);
      const mesh = new InstancedMesh(geometry, material, cap);
      mesh.name = name;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
      return mesh;
    };

    {
      // Alle festen Requisiten in einem Mesh (eine Pipeline + eine Schattenvariante): die Geometrie enthält alle
      // Teilformen, der Vertex-Shader behält nur die des Instanztyps; Ornament, Zeile und Tönung je Typ.
      const lp = positionGeometry;
      const ln = normalGeometry;
      const part = attribute('part', 'float');
      const type = propType();
      const variant = propVariant();
      const isType = (t: number) => type.greaterThan(t - 0.5).and(type.lessThan(t + 0.5));
      const isRoof = isType(6).and(ln.y.greaterThan(0.3));
      const alongWall = select(abs(ln.z).greaterThan(0.5), lp.x, lp.z);
      const pick = <T extends FloatNode>(v: [T, T, T, T, T, T, T]): T =>
        select(
          type.lessThan(0.5),
          v[0],
          select(type.lessThan(1.5), v[1], select(type.lessThan(2.5), v[2], select(type.lessThan(3.5), v[3], select(type.lessThan(4.5), v[4], select(type.lessThan(5.5), v[5], v[6]))))),
        ) as unknown as T;
      // Eine Streifenfunktion für alle Typen (Koordinate und Breite je Typ): Monolith-Facetten, Gasquellen-Ringe,
      // Reifenprofil, Rostringe, Bretterfugen
      const stripeCoord = pick<FloatNode>([
        float(0),
        float(0),
        lp.x.mul(9.0).add(lp.z.mul(9.0)).add(variant.mul(4.0)),
        lp.y.mul(5.0),
        lp.x.mul(6.0).add(lp.z.mul(6.0)),
        lp.x.mul(4.5).add(variant.mul(3.0)),
        alongWall.mul(14.0),
      ]);
      const stripeW = pick<FloatNode>([float(0), float(0), float(0.14), float(0.12), float(0.3), float(0.2), float(0.1)]);
      const stripeGain = pick<FloatNode>([float(0), float(0), float(0.9), float(0.7), smoothstep(0.24, 0.3, lp.y), float(1), select(isRoof, float(0), float(1))]);
      const stripes = stripeMask(stripeCoord, stripeW).mul(stripeGain);
      // Eine Schraffur für alle Typen: Schrott (feine schräge Striche), Fels (senkrechte Striche), Scheune (Maserung)
      const hatchCoord = pick<FloatNode>([
        lp.x.mul(9.0).add(lp.y.mul(2.0)).add(variant.mul(3.0)),
        lp.x.mul(6.0).add(lp.z.mul(6.0)).add(variant.mul(7.0)),
        float(0),
        float(0),
        float(0),
        float(0),
        alongWall.mul(38.0).add(variant.mul(5.0)),
      ]);
      const hatchAcross = pick<FloatNode>([lp.z.mul(4.0).add(lp.y.mul(6.0)), lp.y.mul(3.0), float(0), float(0), float(0), float(0), lp.y.mul(2.6)]);
      const hatchGain = pick<FloatNode>([float(1), float(1), float(0), float(0), float(0), float(0), select(isRoof, float(0), float(0.7))]);
      const hatch = hatchMask(hatchCoord, hatchAcross, pick<FloatNode>([float(0.16), float(0.14), float(0), float(0), float(0), float(0), float(0.22)]), 0.35).mul(hatchGain);
      // Monolith: wandernde Zickzack-Glyphenbänder (Bilder 44/45)
      const rowY = lp.y.mul(7.0).add(variant.mul(2.0)).sub(patternTime.mul(0.01));
      const zig = abs(fract(lp.x.mul(6.0).add(lp.z.mul(6.0))).mul(2.0).sub(1.0)); // Dreieckswelle Λ V Λ
      const zigD = abs(fract(rowY).mul(2.2).sub(zig.mul(0.8)).sub(0.1));
      const glyphs = smoothstep(fwidth(zigD).add(0.09), float(0.09).sub(fwidth(zigD)), zigD).mul(step(fract(rowY), float(0.45))).mul(select(isType(2), float(1), float(0)));
      const byType = <T extends FloatNode | Vec3Node>(v: [T, T, T, T, T, T, T]): T => pick(v as unknown as [FloatNode, FloatNode, FloatNode, FloatNode, FloatNode, FloatNode, FloatNode]) as unknown as T;
      const row = propRow();
      const row2 = propRow2();
      const mask = max(max(stripes, hatch), glyphs);
      const ink = lookup.pal(0, row).rgb;
      const color = byType<Vec3Node>([lookup.pal(4, row).rgb, lookup.pal(5, row).rgb, ink, lookup.pal(3, row).rgb, lookup.pal(3, row).rgb, lookup.pal(1, row2).rgb, ink]);
      const material = new EarleMaterial({
        lookup,
        row: 0,
        rowNode: select(isRoof, row2, row),
        fogDistNode: fogDist(row),
        fog,
        bands: options.bands,
        bandScale: 1.5,
        terminator: 0.2,
        // Schrott, Reifen und Gasquellen bleiben dunkle Masse; Monolith hell; Schneedach immer im Licht
        // Scheune: Wände fast rundum im Licht (rote Bänder; nur Schlagschatten sind Tinte), Schneedach immer hell
        terminatorNode: byType<FloatNode>([float(0.2), float(0.2), float(0.15), float(0.15), float(0.35), float(0.3), select(isRoof, float(-1), float(-0.7))]),
        lift: byType<FloatNode>([float(-0.7), float(0), float(0.45), float(-0.8), float(-0.8), float(-0.35), select(isRoof, float(0.9), float(0))]),
        pattern: { mask, color },
        positionNode: warp(propGrown(part)),
      });
      this.props = makeProp('planet-props', createPropGeometry(), material, options.capacity.props);
      // kleine Werfer (Müll, Reifen, Rohre, Felsbrocken): nur in den zwei feinen Kaskaden
      this.props.userData.shadowCascades = 2;
    }
    {
      // Ölbecken: glänzende Tintenellipsen mit einem hellen Reflexband (Akzent 7), langsam driftend
      const geometry = new CircleGeometry(1, 24);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0.05, 0);
      const lp = positionGeometry;
      const material = new MeshBasicNodeMaterial();
      const ink = lookup.pal(0, propRow()).rgb.mul(0.75);
      const band = stripeMask(lp.z.mul(1.6).add(lp.x.mul(0.35)).add(propVariant()).add(patternTime.mul(0.03)), 0.09);
      const band2 = stripeMask(lp.z.mul(1.6).add(lp.x.mul(0.35)).add(propVariant()).add(patternTime.mul(0.03)).add(0.3), 0.04);
      const col = mix(ink, lookup.pal(7, propRow2()).rgb, max(band, band2));
      material.colorNode = steppedFog(col, fog, lookup, fogDist(propRow()));
      material.positionNode = warp(propGrown(null));
      this.pools = makeProp('planet-pools', geometry, material, options.capacity.props, false);
    }
    {
      const geometry = createCowGeometry();
      const n = options.capacity.animals;
      geometry.setAttribute('animBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('animUp', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('animData', new InstancedBufferAttribute(new Float32Array(n * 4), 4)); // scale, rank, slot, row
      const base = attribute('animBase', 'vec3');
      const up = attribute('animUp', 'vec3');
      const data = attribute('animData', 'vec4');
      const g = slotGrowth(data.z);
      const vis = clamp(g.sub(0.5).sub(data.y.mul(0.4)).div(0.1), 0, 1);
      const size = data.x.mul(vis).mul(nearFade(base, base.add(up.mul(0.8)), float(0.6))).mul(foreignNear(data.w, base));
      /**
       * Karte am Fuß, quer zu `toward`. `lean`: die Hochachse kippt in die Bildebene (Blickrichtung ⟂) — von der steilen
       * Kartenkamera bliebe eine senkrechte Karte ein Strich (cos 60° der Höhe), während ihre zur Sonne gedrehte
       * Schattenkarte einen langen Schatten wirft: der Schatten sah losgelöst aus. So liest sich die Kuh als ganze
       * Silhouette, ihr Schatten beginnt an denselben Füßen.
       */
      const billboard = (toward: Vec3Node, lean: boolean): Vec3Node => {
        const right = normalize(cross(up, toward));
        const cardUp = lean ? normalize(cross(toward, right)) : up;
        return base.add(right.mul(positionGeometry.x.mul(size))).add(cardUp.mul(positionGeometry.y.mul(size)));
      };
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      material.colorNode = steppedFog(lookup.pal(0, data.w).rgb, fog, lookup, fogDist(data.w));
      material.positionNode = warp(billboard(normalize(this.camLocal.sub(base)), true));
      // Schattenpass: Karte senkrecht zur Sonne gedreht → lange Kuh-Schatten wie bei Earle
      (material as unknown as { castShadowPositionNode: unknown }).castShadowPositionNode = warp(billboard(this.sunDirLocal, false));
      const mesh = new InstancedMesh(geometry, material, n);
      mesh.name = 'planet-animals';
      mesh.castShadow = true;
      mesh.userData.shadowCascades = 2;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.animals = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }
    {
      // Sporen der Gasquellen: aufsteigende winzige Punkte (Zeit-Uniform), versinken mit der Quelle
      const geometry = new InstancedBufferGeometry();
      const hex = createHexagon();
      geometry.setAttribute('position', hex.position);
      geometry.setIndex(hex.index);
      const n = options.capacity.props * 6;
      geometry.setAttribute('spA', new InstancedBufferAttribute(new Float32Array(n * 4), 4)); // Quelle xyz, Phase
      geometry.setAttribute('spB', new InstancedBufferAttribute(new Float32Array(n * 4), 4)); // oben xyz, Größe
      geometry.setAttribute('spC', new InstancedBufferAttribute(new Float32Array(n * 4), 4)); // Slot, Rang, Zeile, –
      geometry.instanceCount = 0;
      geometry.boundingSphere = null;
      this.sporesGeometry = geometry;
      const spA = attribute('spA', 'vec4');
      const spB = attribute('spB', 'vec4');
      const spC = attribute('spC', 'vec4');
      const t = fract(patternTime.mul(0.16).add(spA.w));
      const sink = sinkAmount(spC.y, spC.x);
      const side = normalize(cross(spB.xyz, vec3(0.3, 0.7, 0.2)));
      const center = warp(
        spA.xyz.add(spB.xyz.mul(float(0.45).add(t.mul(2.6)).mul(sink.oneMinus()))).add(side.mul(sin(t.mul(7.0).add(spA.w.mul(20.0))).mul(0.12).mul(t))),
      );
      const viewC = modelViewMatrix.mul(vec4(center, 1));
      const depth = viewC.z.negate().max(0.05);
      const pxPerUnit = this.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
      const sizeW = spB.w.mul(t.mul(0.7).oneMinus()).mul(sink.oneMinus());
      const sizeEff = max(sizeW, float(1.0).div(pxPerUnit)).mul(step(float(0.02), sizeW));
      const material = new MeshBasicNodeMaterial();
      material.vertexNode = cameraProjectionMatrix.mul(vec4(viewC.xyz.add(vec3(positionGeometry.x, positionGeometry.y, 0).mul(sizeEff)), 1));
      material.colorNode = steppedFog(lookup.pal(7, spC.z).rgb, fog, lookup, varying(depth, 'vPlanetSporeDist'));
      const mesh = new Mesh(geometry, material);
      mesh.name = 'planet-spores';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      this.spores = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }
  }

  private attachPropAttributes(geometry: BufferGeometry, n: number): void {
    geometry.setAttribute('propA', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('propB', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('propC', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
  }

  private rowsOf(world: number): VegetationWorldRows {
    const r = this.options.slots.rowsOfWorld(world);
    return { terrain: r.terrain, canopy: r.canopyRows, accent: r.accent, monolith: r.monolith, barn: r.barn };
  }

  private familyOf(world: number): PlanetVegetationFamily | undefined {
    return this.options.family(world);
  }

  /** Ein Welt-Slot wurde neu belegt (Tabellen der Baumschicht nachführen). */
  onSlotAssigned(slot: number, world: number): void {
    this.trees.onSlotAssigned(slot, world);
  }

  /**
   * Schreibt alle Instanzpuffer neu (bei Wechsel der geladenen/nahen Chunks). Positionen der Ebene werden relativ zum
   * Anker `origin` gespeichert (der Besitzer setzt die Gruppe an Anker − Fokus).
   */
  setContent(trees: VegetationTreeEntry[], props: VegetationPropEntry[], origin: { x: number; z: number } = { x: 0, z: 0 }): void {
    this.origin = origin;
    // Bäume v3: Kronen, Stämme, Linienbäume und Punkte (deterministisch je Baum, Blende je Chunk)
    this.trees.setContent(trees, origin);
    let hMax = this.trees.hMax;

    // Requisiten
    if (this.options.builtinTrash === false) props = props.filter((p) => !TRASH_PROPS.has(p.prop.kind));
    const solid = props.filter((p) => p.prop.kind !== 'pool' && p.prop.kind !== 'animal').slice(0, this.capacity.props);
    const poolList = props.filter((p) => p.prop.kind === 'pool').slice(0, this.capacity.props);
    const animalList = props.filter((p) => p.prop.kind === 'animal').slice(0, this.capacity.animals);
    this.fillProps(this.props, solid);
    this.fillProps(this.pools, poolList);
    for (const e of solid) hMax = Math.max(hMax, propSize(e.prop)[1] * (e.prop.kind === 'barn' ? 1.2 : 1));
    {
      const geo = this.animals.geometry;
      const b = geo.getAttribute('animBase') as InstancedBufferAttribute;
      const u = geo.getAttribute('animUp') as InstancedBufferAttribute;
      const dat = geo.getAttribute('animData') as InstancedBufferAttribute;
      const { x: ax, z: az } = this.origin;
      animalList.forEach((e, i) => {
        const p = e.prop;
        b.setXYZ(i, p.position[0] - ax, p.position[1], p.position[2] - az);
        u.setXYZ(i, p.normal[0], p.normal[1], p.normal[2]);
        dat.setXYZW(i, p.scale * 0.7, p.rank, e.slot, this.rowsOf(p.world).canopy[0] ?? 0);
        _m.identity();
        this.animals.setMatrixAt(i, _m);
      });
      for (const a of [b, u, dat, this.animals.instanceMatrix]) commit(a, animalList.length);
      this.animals.count = animalList.length;
    }
    {
      // Sporen: sechs je Gasquelle
      const geo = this.sporesGeometry;
      const sa = geo.getAttribute('spA') as InstancedBufferAttribute;
      const sb = geo.getAttribute('spB') as InstancedBufferAttribute;
      const sc = geo.getAttribute('spC') as InstancedBufferAttribute;
      let n = 0;
      const capS = sa.count;
      for (const e of solid) {
        if (e.prop.kind !== 'vent') continue;
        const p = e.prop;
        const h = propSize(p)[1];
        for (let k = 0; k < 6 && n < capS; k++) {
          sa.setXYZW(n, p.position[0] + p.normal[0] * h - this.origin.x, p.position[1] + p.normal[1] * h, p.position[2] + p.normal[2] * h - this.origin.z, (k + p.variant * 3) / 6);
          sb.setXYZW(n, p.normal[0], p.normal[1], p.normal[2], 0.05 + 0.04 * ((k * 7) % 3));
          sc.setXYZW(n, e.slot, p.rank, this.rowsOf(p.world).accent, 0);
          n++;
        }
      }
      for (const a of [sa, sb, sc]) commit(a, n);
      geo.instanceCount = n;
    }
    this.hMax = hMax;
  }

  /** Anker der Instanzpositionen (Ebene). */
  private origin = { x: 0, z: 0 };

  private fillProps(mesh: InstancedMesh, list: VegetationPropEntry[]): void {
    const { x: ax, z: az } = this.origin;
    const geo = mesh.geometry;
    const a = geo.getAttribute('propA') as InstancedBufferAttribute;
    const b = geo.getAttribute('propB') as InstancedBufferAttribute;
    const c = geo.getAttribute('propC') as InstancedBufferAttribute;
    list.forEach((e, i) => {
      const p = e.prop;
      _n.set(p.normal[0], p.normal[1], p.normal[2]).normalize();
      _q.setFromUnitVectors(_Y, _n);
      _q.multiply(_qYaw.setFromAxisAngle(_Y, p.yaw));
      _p.set(p.position[0] - ax, p.position[1], p.position[2] - az);
      const [sx, sy, sz] = propSize(p);
      _s.set(sx, sy, sz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      const rows = this.rowsOf(p.world);
      const row = p.kind === 'monolith' ? rows.monolith : p.kind === 'barn' ? rows.barn : rows.terrain;
      const row2 = p.kind === 'pool' || p.kind === 'pipe' ? rows.accent : rows.terrain;
      a.setXYZW(i, p.position[0] - ax, p.position[1], p.position[2] - az, p.rank);
      b.setXYZW(i, _n.x, _n.y, _n.z, sy);
      c.setXYZW(i, e.slot, row, row2, PROP_TYPE[p.kind] + Math.min(0.998, Math.max(0, p.variant)));
    });
    for (const attr of [a, b, c, mesh.instanceMatrix]) commit(attr, list.length);
    mesh.count = list.length;
  }

  /** Freiraum vor der Kamera in Welteinheiten (Kompositionen: nichts ragt in die Linse). */
  setNearClear(units: number): void {
    this.nearClear.value = Math.max(0, units);
  }

  /** Lichtung unter der Kamera (seitlicher Radius um die Hochachse der Kamera, 0 = aus). */
  setFootClear(units: number): void {
    this.footClear.value = Math.max(0, units);
  }

  /** Sichtlinie Kamera → Ziel (Objektraum der Vegetation) frei halten; `null` = aus. */
  setSightLine(target: Vector3 | null, radius = 0.6): void {
    if (!target) {
      this.sightRadius.value = 0;
      return;
    }
    this.sightTarget.value.copy(target);
    this.sightRadius.value = Math.max(0.02, radius);
  }

  /** Abstand, unter dem Instanzen fremder Welten wegtreten (0 = aus). */
  setForeignClear(units: number): void {
    this.foreignClear.value = Math.max(0, units);
  }

  /** Wachstum 0..1 eines Chunk-Slots (sofort wirksam, kein Pufferschreiben). */
  setSlotGrowth(slot: number, growth: number): void {
    if (slot < 0 || slot >= GROWTH_SLOTS) return;
    (this.growthSlots as unknown as { array: number[] }).array[slot] = Math.min(1, Math.max(0, growth));
  }

  /** Sonnenrichtung in Welt- und Ebenenkoordinaten (Punkt-Tönung, Karten-Schatten, Punktverteilung). */
  setSunDirection(world: Vector3, local: Vector3): void {
    this.sunDirWorld.value.copy(world).normalize();
    this.sunDirLocal.value.copy(local).normalize();
  }

  /** Einmal pro Frame: Kameraachsen, Projektionsmaßstab und Kameraposition im Objektraum der Vegetation (flach). */
  updateCamera(camera: Camera, cameraLocal: Vector3): void {
    this.projScaleY.value = camera.projectionMatrix.elements[5]!;
    this.camLocal.value.copy(cameraLocal);
    // Punkt-Blenden der Chunks (Ein-/Ausblenden statt Ploppen)
    this.trees.tick();
  }

  /** Kronen-Meshes je Grundform (Kompatibilität: Zählung im Lab). */
  get canopies(): Record<CanopyMesh, InstancedMesh> {
    return this.trees.crowns;
  }

  /** Stämme der Hainbäume (Gabel-Archetyp); Fächer und Eiche unter `trees.trunks`. */
  get trunks(): InstancedMesh {
    return this.trees.trunks.fork;
  }

  get bare(): InstancedMesh {
    return this.trees.bare;
  }

  get dots(): Mesh {
    return this.trees.dots;
  }

  /** Alle Instanz-Meshes (für Draw-Call-Zählung und Tests). */
  get meshes(): Array<InstancedMesh | Mesh> {
    return [...this.trees.meshes, this.props, this.pools, this.animals, this.spores];
  }

  dispose(): void {
    this.trees.dispose();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}

/**
 * Nur den benutzten Bereich hochladen. Die Puffer sind statisch (StaticDrawUsage): three r186 lädt Attribute mit
 * DynamicDrawUsage bei jedem Draw jedes Passes neu hoch (≈ 18 MB/s bei 10 fps unter SwiftShader); statisch + Version
 * + Update-Range lädt nur nach `setContent` und nur `count` Instanzen.
 */
function commit(attr: { itemSize: number; clearUpdateRanges(): void; addUpdateRange(start: number, count: number): void; needsUpdate: boolean }, count: number): void {
  attr.clearUpdateRanges();
  if (count <= 0) return; // nichts sichtbar (count = 0) → kein Upload nötig
  attr.addUpdateRange(0, count * attr.itemSize);
  attr.needsUpdate = true;
}

/** Kuh-Silhouette (Earle): Körper, Kopf, vier Beine, Schwanz als flache Rechtecke in der XY-Ebene, Höhe ≈ 0.75. */
export function createCowGeometry(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    const b = pos.length / 3;
    pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  rect(-0.5, 0.3, 0.42, 0.66); // Körper
  rect(0.36, 0.42, 0.7, 0.74); // Kopf
  rect(0.62, 0.32, 0.72, 0.5); // Maul
  rect(-0.44, 0, -0.36, 0.34);
  rect(-0.3, 0, -0.22, 0.34);
  rect(0.18, 0, 0.26, 0.34);
  rect(0.32, 0, 0.4, 0.34);
  rect(-0.58, 0.42, -0.5, 0.62); // Schwanz
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Klumpen (Schrotthügel/Fels): unregelmäßige Halbkugel, Radius ≈ 1, Fußpunkt y = 0. Indizierte Kugel mit Buckeln aus
 * der Position (gleiche Position → gleicher Buckel, auch an der Naht) → geschlossene Oberfläche.
 */
export function createLumpGeometry(): BufferGeometry {
  const g = new SphereGeometry(1, 9, 6);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const key = Math.round(x * 97) * 7919 + Math.round(y * 97) * 104729 + Math.round(z * 97) * 1299709;
    const bump = 0.84 + 0.32 * ((((key % 1000) + 1000) % 1000) / 1000);
    p.setXYZ(i, x * bump, Math.max(0, y) * (0.8 + 0.25 * bump), z * bump);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Turm (Monolith/Gasquelle): sechsseitiger, sich verjüngender Prisma-Kegel auf einem flachen Sockel, Höhe 1. */
export function createTowerGeometry(): BufferGeometry {
  const shaft = new CylinderGeometry(0.42, 0.75, 1, 6, 1, false);
  shaft.translate(0, 0.5, 0);
  const plinth = new CylinderGeometry(1.0, 1.15, 0.12, 6, 1, false);
  plinth.translate(0, 0.06, 0);
  const merged = mergeGeometries([shaft, plinth]);
  shaft.dispose();
  plinth.dispose();
  return merged;
}

/** Scheune: Quader mit Satteldach (Firstrichtung x), Breite 1.6, Tiefe 1.0, Traufhöhe 0.7, First 1.15. */
export function createBarnGeometry(): BufferGeometry {
  const body = new BoxGeometry(1.6, 0.7, 1.0);
  body.translate(0, 0.35, 0);
  const pos: number[] = [];
  const idx: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => {
    const s = pos.length / 3;
    pos.push(...a, ...b, ...c);
    idx.push(s, s + 1, s + 2);
  };
  // Dachflächen (leicht überstehend) und Giebel
  const y0 = 0.7;
  const y1 = 1.15;
  const o = 0.06;
  tri([-0.8 - o, y0, 0.5 + o], [0.8 + o, y0, 0.5 + o], [0.8 + o, y1, 0]);
  tri([-0.8 - o, y0, 0.5 + o], [0.8 + o, y1, 0], [-0.8 - o, y1, 0]);
  tri([0.8 + o, y0, -0.5 - o], [-0.8 - o, y0, -0.5 - o], [-0.8 - o, y1, 0]);
  tri([0.8 + o, y0, -0.5 - o], [-0.8 - o, y1, 0], [0.8 + o, y1, 0]);
  tri([0.8, y0, 0.5], [0.8, y0, -0.5], [0.8, y1, 0]);
  tri([-0.8, y0, -0.5], [-0.8, y0, 0.5], [-0.8, y1, 0]);
  const roof = new BufferGeometry();
  roof.setAttribute('position', new Float32BufferAttribute(pos, 3));
  roof.setIndex(idx);
  roof.computeVertexNormals();
  const merged = mergeGeometries([body, roof]);
  body.dispose();
  roof.dispose();
  return merged;
}

/**
 * Alle festen Requisiten in einer Geometrie (ein Mesh, eine Pipeline): Teilform je Vertex im Attribut `part`
 * (0 Klumpen, 1 Turm, 2 Reifen, 3 Rohr, 4 Scheune); der Vertex-Shader behält nur die Teilform des Instanztyps.
 */
export function createPropGeometry(): BufferGeometry {
  const tire = new TorusGeometry(0.5, 0.17, 6, 14);
  tire.rotateX(Math.PI / 2);
  tire.translate(0, 0.17, 0);
  const pipe = new CylinderGeometry(0.16, 0.16, 2.4, 8, 1, false);
  pipe.rotateZ(Math.PI / 2);
  pipe.translate(0, 0.16, 0);
  const parts = [createLumpGeometry(), createTowerGeometry(), tire, pipe, createBarnGeometry()];
  const pos: number[] = [];
  const nor: number[] = [];
  const part: number[] = [];
  const idx: number[] = [];
  let offset = 0;
  parts.forEach((g, pi) => {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      part.push(pi);
    }
    const index = g.getIndex();
    if (index) for (let i = 0; i < index.count; i++) idx.push(index.getX(i) + offset);
    else for (let i = 0; i < p.count; i++) idx.push(i + offset);
    offset += p.count;
    g.dispose();
  });
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  out.setAttribute('part', new Float32BufferAttribute(part, 1));
  out.setIndex(idx);
  return out;
}
