import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  ConeGeometry,
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
  hash,
  int,
  max,
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
  uv,
  varying,
  vec3,
  vec4,
} from 'three/tsl';
import { TREE_PROPORTIONS, hash32, mulberry32, type PlanetProp, type PlanetTree, type PlanetVegetationFamily, type TreeKind } from '@ee/world';
import { EarleMaterial } from './EarleMaterial';
import { arrayElement, hatchMask, lichenCells, palByKey, patternTime, steppedFog, stripeMask, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec3Node } from './tsl';
import { createBareTreeGeometry, createCanopyGeometry, createHexagon, createTrunkGeometry, dotsOnCanopy, mergeGeometries, treeFrame } from './vegetation';

/** Zahl der Wachstums-Slots (ein Slot je geladenem Chunk). */
export const GROWTH_SLOTS = 64;
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
  /** Zeilen und Familie je Welt-Index. */
  worldRows: VegetationWorldRows[];
  families: PlanetVegetationFamily[];
  capacity: { trees: number; dots: number; props: number; animals: number };
  /** Schleier über Nachbarwelten: Zusatz-Nebeldistanz je Welt-Index (TSL); fehlt → kein Schleier. */
  veil?: (worldIndex: FloatNode) => FloatNode;
  /** Fremdheit 0..1 einer Welt (0 = Blick-Welt, 1 = Nachbar); nahe fremde Instanzen treten aus dem Bild. */
  foreign?: (worldIndex: FloatNode) => FloatNode;
  /** Zeilen im Atlas beim Aufbau (Tabelle Zeile → Welt für den Schleier). */
  rowCount?: number;
  dotsPerTree: [number, number];
  collapsePx: number;
  dotRadius?: number;
  seed?: number;
  /** Krümmungs-Warp aller Planetenraum-Positionen (Perspektiv-Boost), identisch mit dem Terrain. */
  warp?: ((p: Vec3Node) => Vec3Node) | undefined;
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

const TRUNK_STYLE_INDEX = { ink: 0, white: 1, striped: 2, lichen: 3 } as const;
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

/** Kronen-Grundformen (ein Mesh je Grundform). */
export type CanopyMesh = 'dome' | 'stacked' | 'cone' | 'sphere' | 'spire';
export const CANOPY_MESHES: CanopyMesh[] = ['dome', 'stacked', 'cone', 'sphere', 'spire'];
const CANOPY_MESH_OF: Record<Exclude<TreeKind, 'bare'>, CanopyMesh> = {
  dome: 'dome',
  stacked: 'stacked',
  cone: 'cone',
  tall: 'cone',
  pine: 'cone',
  bulb: 'sphere',
  jewel: 'sphere',
  spire: 'spire',
};
/** Einheitskegel (Radius 1, Höhe 1, Fuß bei y = 0): Ansatzhöhe und Höhe je Form in Kronenradien. */
const CONE_FORM = { cone: [0.62, 2.2], tall: [3.6, 1.6], pine: [0.25, 3.4] } as const;
/** Einheitskugel: Mittelpunkthöhe und y-Streckung je Form in Kronenradien. */
const SPHERE_FORM = { jewel: [1.05, 0.88], bulb: [1.45, 1.15] } as const;

/** Geometrie einer Kronen-Grundform. */
function createCanopyMeshGeometry(shape: CanopyMesh): BufferGeometry {
  if (shape === 'cone') {
    const g = new ConeGeometry(1, 1, 12, 1, false);
    g.translate(0, 0.5, 0);
    return g;
  }
  if (shape === 'sphere') return new SphereGeometry(1, 16, 12);
  return createCanopyGeometry(shape);
}
const _Y = new Vector3(0, 1, 0);
const _q = new Quaternion();
const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _n = new Vector3();
const _t = new Vector3();
const _qYaw = new Quaternion();
const _b = new Vector3();

/**
 * Vegetation und Requisiten des Planeten als feste Pools (Kapazität vorab): je Kronenform ein InstancedMesh,
 * Stämme (Zylinder mit Stil je Welt: Tinte, weiß, gestreift, Flechten), kahle Fraktalbäume als Karten, ein
 * Punkt-Billboard-Pool (Punkte, Rauten, Kreuze, Randpunkte), Müll (Schrotthügel/Felsen, Monolithe/Gasquellen,
 * Reifen, Rohre, Ölbecken, Sporen), Scheunen und Tier-Silhouetten. Beim Wechsel der geladenen Chunks werden nur
 * die Instanzpuffer neu geschrieben. Wachstum je Chunk über ein Uniform-Array: Bäume wachsen in den Chunk hinein,
 * Müll versinkt im Boden.
 */
export class PlanetVegetation {
  readonly group = new Group();
  /** Kronen-Meshes je Grundform (dome, stacked, cone, sphere, spire). */
  readonly canopies: Partial<Record<CanopyMesh, InstancedMesh>>;
  readonly trunks: InstancedMesh;
  readonly bare: InstancedMesh;
  readonly dots: Mesh;
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
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Array<{ dispose(): void }> = [];
  private readonly rand: () => number;
  private readonly dotRange: [number, number];
  private readonly dotRadius: number;
  private readonly dotsGeometry: InstancedBufferGeometry;
  private readonly sporesGeometry: InstancedBufferGeometry;
  private readonly capacity: PlanetVegetationOptions['capacity'];
  private readonly warp: (p: Vec3Node) => Vec3Node;

  constructor(readonly options: PlanetVegetationOptions) {
    this.group.name = 'PlanetVegetation';
    this.rand = mulberry32(hash32('planet-dots', options.seed ?? 1));
    this.dotRange = options.dotsPerTree;
    this.dotRadius = options.dotRadius ?? 0.06;
    this.collapsePx.value = options.collapsePx;
    this.capacity = options.capacity;
    this.warp = options.warp ?? ((p) => p);
    const { lookup, fog } = options;
    const warp = this.warp;

    // Schleier: Palettenzeile → Welt (jede Welt hat eigene Zeilen), fremde Welten bekommen Zusatz-Nebeldistanz
    const rowWorldValues = new Array<number>(Math.max(1, (options.rowCount ?? 0) + 8)).fill(-1);
    options.worldRows.forEach((r, w) => {
      for (const row of [r.terrain, ...r.canopy, r.accent, r.monolith, r.barn]) if (row >= 0 && row < rowWorldValues.length) rowWorldValues[row] = w;
    });
    const rowWorld = uniformArray(rowWorldValues, 'float') as unknown as UniformArrayLike;
    const veilOfRow = (row: FloatNode): FloatNode => {
      if (!options.veil) return float(0);
      const w = arrayElement(rowWorld, row);
      return select(w.lessThan(-0.5), float(0), options.veil(w));
    };
    /** Nebeldistanz eines Fragments: Kameraabstand + Schleier seiner Welt. */
    const fogDist = (row: FloatNode, dist: FloatNode = positionView.length()): FloatNode => dist.add(veilOfRow(row));
    /** Fremde Instanz nahe der Kamera → 0 (tritt weg), eigene Welt → 1. */
    const foreignNear = (row: FloatNode, base: Vec3Node): FloatNode => {
      if (!options.foreign) return float(1);
      const w = arrayElement(rowWorld, row);
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
      const camUp = normalize(this.camLocal);
      const along = base.dot(camUp);
      // Nur der Fuß zählt: große Elemente außerhalb der Lichtung (Scheune, Fokusbaum) bleiben ganz
      const lateral = base.sub(camUp.mul(along)).length();
      const clear = smoothstep(this.footClear, this.footClear.add(1.8), lateral);
      // Nur auf der Kameraseite des Planeten und nur, wenn eingeschaltet
      return select(along.greaterThan(0).and(this.footClear.greaterThan(0.01)), clear, float(1));
    };
    const nearFade = (base: Vec3Node, top: Vec3Node, radius: FloatNode): FloatNode => {
      const axis = top.sub(base);
      const len2 = axis.dot(axis).max(1e-4);
      const t = clamp(this.camLocal.sub(base).dot(axis).div(len2), 0, 1);
      const closest = base.add(axis.mul(t));
      const gap = this.camLocal.sub(closest).length().sub(radius);
      return smoothstep(this.nearClear, this.nearClear.add(1.6), gap).mul(footFade(base));
    };

    // --- Kronen -----------------------------------------------------------------------------------------
    // Instanzattribute gepackt (WebGPU: höchstens 8 Vertex-Puffer je Pipeline):
    // treeA = (Fußpunkt xyz, Rang), treeB = (Hüllzentrum xyz, Slot), treeC = (Zeile, Akzentzeile, Stammstil, Variante),
    // treeD = (Instanzradius, Instanzhöhe, Kronenradius, –)
    const treeA = () => attribute('treeA', 'vec4');
    const treeB = () => attribute('treeB', 'vec4');
    const treeC = () => attribute('treeC', 'vec4');
    const treeD = () => attribute('treeD', 'vec4');
    const treeScale = (): FloatNode =>
      popScale(treeA().w, treeB().w).mul(nearFade(treeA().xyz, treeB().xyz, treeD().z)).mul(foreignNear(treeC().x, treeA().xyz));
    const treeGrown = (): Vec3Node => {
      const base = treeA().xyz;
      return base.add(positionLocal.sub(base).mul(treeScale()));
    };
    const treeNormal = (grown: Vec3Node): Vec3Node => {
      const base = treeA().xyz;
      const hull = treeB().xyz;
      const s = popScale(treeA().w, treeB().w);
      const hc = base.add(hull.sub(base).mul(s));
      return varying(modelViewMatrix.mul(vec4(grown.sub(hc), 0)).xyz, 'vEarleHullN').normalize();
    };
    const treeGrowth = (): FloatNode => slotGrowth(treeB().w);

    const canopies: Partial<Record<CanopyMesh, InstancedMesh>> = {};
    // Ein Material für alle Kronen; Formen mit gleicher Grundgeometrie teilen sich ein Mesh (Kegel: cone/tall/pine,
    // Kugel: jewel/bulb) → weniger Pipelines. Die Juwelenkuppel (Bild 10: überwiegend farbig) bekommt Terminator
    // und Bandskala über treeD.w = 1.
    {
      const grown = treeGrown();
      const jewel = treeD().w.greaterThan(0.5);
      const material = new EarleMaterial({
        lookup,
        row: options.worldRows[0]?.canopy[0] ?? 0,
        rowNode: treeC().x,
        fogDistNode: fogDist(treeC().x),
        fog,
        bands: options.bands,
        bandScale: 2.0,
        terminator: 0.5,
        // Juwelenkuppeln leuchten fast rundum in ihren Juwelentönen (Schattenseite = dunkler Juwelton, nicht Tinte)
        terminatorNode: select(jewel, float(-0.45), float(0.5)),
        normalNode: treeNormal(grown),
        positionNode: warp(grown),
        growthNode: treeGrowth(),
      });
      this.materials.push(material);
      for (const shape of CANOPY_MESHES) {
        const geometry = createCanopyMeshGeometry(shape);
        this.attachTreeAttributes(geometry, options.capacity.trees);
        const mesh = new InstancedMesh(geometry, material, options.capacity.trees);
        mesh.name = `planet-canopy-${shape}`;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        mesh.count = 0;
        canopies[shape] = mesh;
        this.geometries.push(geometry);
        this.group.add(mesh);
      }
    }
    this.canopies = canopies;

    // --- Stämme: Tinte / weiß / gestreift / Flechtenbänder ------------------------------------------------
    {
      const geometry = createTrunkGeometry();
      this.attachTreeAttributes(geometry, options.capacity.trees);
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      const row = treeC().x;
      const acc = treeC().y;
      const style = treeC().z;
      const variant = treeC().w;
      const size = treeD().xy;
      const u = uv().x;
      const v = uv().y;
      const ink = lookup.pal(0, row).rgb;
      const white = lookup.pal(0, acc).rgb;
      // Weltkoordinaten auf dem Stamm: rundum (Umfang) und Höhe
      const around = u.mul(size.x.mul(Math.PI));
      const height = v.mul(size.y);
      // Gestreift (Bild 10): 7 senkrechte Streifen rundum in Juwelenfarben, dazwischen Tinte, feine Flechtenflecken;
      // Flechtenbänder (Bilder 01, 08): waagrechte Bänder mit Mosaik aus Flechtenfarben, langsam atmend.
      // Ein Flechten-Aufruf für beide Stile (Parameter je Stil) hält den Shader klein.
      const isStriped = style.lessThan(2.5);
      // Gestreifte Stämme ruhig und breit (Bild 10, Ebene_3): vier Bahnen rundum
      const stripeIdx = floor(u.mul(4.0).add(variant.mul(5.0)));
      const sh = hash(stripeIdx.add(variant.mul(31.0)));
      // Akzentzeile: 0 hell, 1–2 Streifenfarben, 3 kahle Bäume, 4–6 Flechten, 7 Requisit B
      const stripeCol = select(sh.lessThan(0.34), ink, select(sh.lessThan(0.58), lookup.pal(1, acc).rgb, select(sh.lessThan(0.82), lookup.pal(2, acc).rgb, lookup.pal(0, acc).rgb)));
      const stripeEdge = stripeMask(u.mul(4.0).add(variant.mul(5.0)).add(0.5), 0.06); // feine Tintenlinien zwischen den Bahnen
      const cells = lichenCells(
        around.mul(select(isStriped, float(9.0), float(14.0))),
        height.mul(select(isStriped, float(7.0), float(22.0))).add(patternTime.mul(0.02)),
        select(isStriped, float(0.05), float(0.62)),
        variant,
      );
      const lichenCol = palByKey(lookup, cells.key, acc, 4, 7);
      const striped = mix(mix(stripeCol, ink, stripeEdge), lichenCol, cells.mask);
      const bandCoord = height.mul(3.2).add(sin(around.mul(2.1).add(variant.mul(6.0))).mul(0.18)).add(patternTime.mul(0.015));
      const band = smoothstep(0.38, 0.5, abs(fract(bandCoord).sub(0.5)).oneMinus()); // breite Bänder, harte Kante (Tinte dazwischen)
      const blueBand = lookup.pal(1, acc).rgb; // Bandgrund (Blau bei 01, dunkles Grau bei 08)
      const lichen = mix(ink, mix(blueBand, lichenCol, cells.mask), band);
      const col = select(style.lessThan(0.5), ink, select(style.lessThan(1.5), white, select(style.lessThan(2.5), striped, lichen)));
      material.colorNode = steppedFog(col, fog, lookup, fogDist(row));
      material.positionNode = warp(treeGrown());
      const mesh = new InstancedMesh(geometry, material, options.capacity.trees);
      mesh.name = 'planet-trunks';
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.trunks = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }

    // --- Kahle Fraktalbäume: Karten, zur Kamera gedreht, im Schattenpass zur Sonne ------------------------
    {
      const geometry = createBareTreeGeometry(3);
      const n = options.capacity.trees;
      geometry.setAttribute('bareBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('bareUp', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('bareData', new InstancedBufferAttribute(new Float32Array(n * 4), 4)); // size, rank, slot, accentRow
      geometry.setAttribute('bareVariant', new InstancedBufferAttribute(new Float32Array(n), 1));
      const base = attribute('bareBase', 'vec3');
      const up = attribute('bareUp', 'vec3');
      const data = attribute('bareData', 'vec4');
      const variant = attribute('bareVariant', 'float');
      const size = data.x.mul(popScale(data.y, data.z)).mul(nearFade(base, base.add(up.mul(data.x.mul(2.1))), data.x)).mul(foreignNear(data.w, base));
      const flip = select(variant.greaterThan(0.5), float(-1), float(1));
      const billboard = (toward: Vec3Node): Vec3Node => {
        const right = normalize(cross(up, toward));
        return base.add(right.mul(positionGeometry.x.mul(size).mul(flip))).add(up.mul(positionGeometry.y.mul(size)));
      };
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      material.colorNode = steppedFog(lookup.pal(3, data.w).rgb, fog, lookup, fogDist(data.w));
      material.positionNode = warp(billboard(normalize(this.camLocal.sub(base))));
      (material as unknown as { castShadowPositionNode: unknown }).castShadowPositionNode = warp(billboard(this.sunDirLocal));
      const mesh = new InstancedMesh(geometry, material, n);
      mesh.name = 'planet-bare';
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.bare = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }

    // --- Punkte (Punkte, Rauten, Kreuze, Randpunkte) ---------------------------------------------------
    {
      const geometry = new InstancedBufferGeometry();
      const hex = createHexagon();
      geometry.setAttribute('position', hex.position);
      geometry.setIndex(hex.index);
      const n = options.capacity.dots;
      geometry.setAttribute('dotRel', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('dotBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('dotNormal', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('dotData', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
      geometry.setAttribute('dotRow', new InstancedBufferAttribute(new Float32Array(n), 1));
      geometry.setAttribute('dotHull', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
      geometry.instanceCount = 0;
      geometry.boundingSphere = null;
      this.dotsGeometry = geometry;

      const material = new MeshBasicNodeMaterial();
      const rel = attribute('dotRel', 'vec3');
      const base = attribute('dotBase', 'vec3');
      const nrm = attribute('dotNormal', 'vec3');
      const dd = attribute('dotData', 'vec4');
      const rowKind = attribute('dotRow', 'float');
      const row = floor(rowKind.add(0.01));
      // Art: 0 Punkt, 1–2 Motivfarben (Rauten/Kreuze), 3 Randpunkt
      const kind = floor(fract(rowKind).mul(8.0).add(0.5));
      const hullAttr = attribute('dotHull', 'vec4');
      // Nähe-Ausblendung billig als Kugeltest um das Hüllzentrum (Punkte folgen ihrer Krone)
      const toCam = this.camLocal.sub(hullAttr.xyz);
      const nearDots = smoothstep(this.nearClear, this.nearClear.add(1.6), toCam.length().sub(hullAttr.w.mul(1.2))).mul(footFade(base));
      const s = popScale(dd.y, dd.w).mul(nearDots).mul(foreignNear(row, base));
      const center = warp(base.add(rel.mul(s)));
      // Billboard im View-Raum: eine Matrixmultiplikation für den Mittelpunkt, der Versatz liegt direkt in x/y.
      // Tönung und Randtest im Planetenraum (Sonne und Kamera liegen dort als Uniforms vor) — keine Normalen-Matrizen.
      const viewC = modelViewMatrix.mul(vec4(center, 1));
      const ndl = varying(nrm.dot(this.sunDirLocal), 'vPlanetDotNdl');
      const facingCam = abs(nrm.dot(normalize(this.camLocal.sub(center))));
      const rimOnly = select(kind.greaterThan(2.5), step(facingCam, float(0.55)), float(1));
      const depth = viewC.z.negate().max(0.05);
      const pxPerUnit = this.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
      const sizeW = dd.x.mul(s);
      const px = sizeW.mul(pxPerUnit);
      // Bildschirmgröße gedeckelt (≈ 4.5 px bei 900 px Höhe): nahe Punkte bleiben fein wie Earles Pinselpunkte
      const maxPx = screenSize.y.mul(4.5 / 900);
      const sizeEff = clamp(sizeW, float(1.2).div(pxPerUnit), maxPx.div(pxPerUnit));
      const sparse = select(ndl.lessThan(0).and(dd.z.greaterThan(0.35)), float(0), float(1));
      const visible = step(this.collapsePx, px).mul(sparse).mul(rimOnly);
      const viewPos = viewC.xyz.add(vec3(positionGeometry.x, positionGeometry.y, 0).mul(sizeEff.mul(visible)));
      material.vertexNode = cameraProjectionMatrix.mul(vec4(viewPos, 1));
      // Nebel nach der echten Punktentfernung (positionView wäre hier der Planetenmittelpunkt)
      const dist = varying(depth, 'vPlanetDotDist');
      const litIdx = select(ndl.greaterThan(0.5), float(5), select(ndl.greaterThan(0.12), float(4), float(3)));
      const idx = select(kind.lessThan(0.5).or(kind.greaterThan(2.5)), litIdx, select(kind.lessThan(1.5), float(6), float(7)));
      material.colorNode = steppedFog(lookup.pal(idx, row).rgb, fog, lookup, fogDist(row, dist));
      const mesh = new Mesh(geometry, material);
      mesh.name = 'planet-dots';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      this.dots = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }

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
        row: options.worldRows[0]?.terrain ?? 0,
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
      const billboard = (toward: Vec3Node): Vec3Node => {
        const right = normalize(cross(up, toward));
        return base.add(right.mul(positionGeometry.x.mul(size))).add(up.mul(positionGeometry.y.mul(size)));
      };
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      material.colorNode = steppedFog(lookup.pal(0, data.w).rgb, fog, lookup, fogDist(data.w));
      material.positionNode = warp(billboard(normalize(this.camLocal.sub(base))));
      // Schattenpass: Karte zur Sonne drehen → lange Kuh-Schatten wie bei Earle
      (material as unknown as { castShadowPositionNode: unknown }).castShadowPositionNode = warp(billboard(this.sunDirLocal));
      const mesh = new InstancedMesh(geometry, material, n);
      mesh.name = 'planet-animals';
      mesh.castShadow = true;
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

  private attachTreeAttributes(geometry: BufferGeometry, n: number): void {
    geometry.setAttribute('treeA', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('treeB', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('treeC', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('treeD', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
  }

  private attachPropAttributes(geometry: BufferGeometry, n: number): void {
    geometry.setAttribute('propA', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('propB', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('propC', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
  }

  private rowsOf(world: number): VegetationWorldRows {
    return this.options.worldRows[world] ?? this.options.worldRows[0] ?? { terrain: 0, canopy: [0], accent: 0, monolith: 0, barn: 0 };
  }

  private familyOf(world: number): PlanetVegetationFamily | undefined {
    return this.options.families[world];
  }

  private canopyRowOf(t: PlanetTree): number {
    const rows = this.rowsOf(t.world);
    const variants = Math.max(1, Math.min(rows.canopy.length, this.familyOf(t.world)?.rowVariants ?? 1));
    return rows.canopy[Math.min(variants - 1, Math.floor(t.variant * variants))] ?? rows.canopy[0] ?? 0;
  }

  /** Schreibt alle Instanzpuffer neu (bei Wechsel der geladenen/nahen Chunks). */
  setContent(trees: VegetationTreeEntry[], props: VegetationPropEntry[]): void {
    let hMax = 2;

    // Kronen je Grundform (Karten separat)
    const perMesh = new Map<CanopyMesh, VegetationTreeEntry[]>();
    for (const k of CANOPY_MESHES) perMesh.set(k, []);
    const bareList: VegetationTreeEntry[] = [];
    const withTrunk: VegetationTreeEntry[] = [];
    for (const e of trees) {
      if (e.tree.kind === 'bare') bareList.push(e);
      else {
        perMesh.get(CANOPY_MESH_OF[e.tree.kind])?.push(e);
        // Juwelenkuppeln sitzen auf dem Boden (Bild 10) — kein Stammstummel darunter
        if (e.tree.kind !== 'jewel') withTrunk.push(e);
      }
    }
    for (const shape of CANOPY_MESHES) {
      const mesh = this.canopies[shape];
      if (!mesh) continue;
      const list = perMesh.get(shape)!.slice(0, this.capacity.trees);
      this.fillTrees(mesh, list, (t, out) => this.canopyMatrix(t, out), (t) => [t.canopyRadius, t.canopyRadius * this.aspectOf(t)]);
      for (const e of list) hMax = Math.max(hMax, TREE_PROPORTIONS[e.tree.kind].top * e.tree.canopyRadius * this.aspectOf(e.tree));
    }
    // Stämme (alle Bäume mit Krone)
    const all = withTrunk.slice(0, this.capacity.trees);
    const trunkSize = (t: PlanetTree): [number, number] => [Math.max(0.035, (this.familyOf(t.world)?.trunkWidth ?? 0.04) * t.canopyRadius), t.trunkHeight + 0.35 * t.canopyRadius];
    this.fillTrees(
      this.trunks,
      all,
      (t, out) => {
        const [w, h] = trunkSize(t);
        treeFrame(t, _q);
        return out.compose(_p.set(t.position[0], t.position[1], t.position[2]), _q, _s.set(w, h, w));
      },
      trunkSize,
    );
    // Kahle Bäume (Karten)
    {
      const list = bareList.slice(0, this.capacity.trees);
      const geo = this.bare.geometry;
      const b = geo.getAttribute('bareBase') as InstancedBufferAttribute;
      const u = geo.getAttribute('bareUp') as InstancedBufferAttribute;
      const dat = geo.getAttribute('bareData') as InstancedBufferAttribute;
      const va = geo.getAttribute('bareVariant') as InstancedBufferAttribute;
      list.forEach((e, i) => {
        const t = e.tree;
        b.setXYZ(i, t.position[0], t.position[1], t.position[2]);
        u.setXYZ(i, t.normal[0], t.normal[1], t.normal[2]);
        dat.setXYZW(i, t.canopyRadius, t.rank, e.slot, this.rowsOf(t.world).accent);
        va.setX(i, t.variant);
        _m.identity();
        this.bare.setMatrixAt(i, _m);
        hMax = Math.max(hMax, TREE_PROPORTIONS.bare.top * t.canopyRadius);
      });
      for (const a of [b, u, dat, va, this.bare.instanceMatrix]) commit(a, list.length);
      this.bare.count = list.length;
    }

    // Punkte (nur nahe Chunks): Anzahl nach Kronenfläche, Budget je Neuaufbau (Kapazität), Punktgröße gedeckelt
    const g = this.dotsGeometry;
    const rel = g.getAttribute('dotRel') as InstancedBufferAttribute;
    const base = g.getAttribute('dotBase') as InstancedBufferAttribute;
    const nrm = g.getAttribute('dotNormal') as InstancedBufferAttribute;
    const data = g.getAttribute('dotData') as InstancedBufferAttribute;
    const rowA = g.getAttribute('dotRow') as InstancedBufferAttribute;
    const hullA = g.getAttribute('dotHull') as InstancedBufferAttribute;
    let d = 0;
    const cap = this.capacity.dots;
    const sunLocal = this.sunDirLocal.value;
    const dotCount = (t: PlanetTree): number => {
      const R = t.canopyRadius;
      const sizeT = Math.min(1, Math.max(0, (R - 0.4) / 1.2));
      const c = this.dotRange[0] + (this.dotRange[1] - this.dotRange[0]) * sizeT;
      const n = R > 1.6 ? Math.min(this.dotRange[1] * 2, c * (R / 1.6) ** 1.5) : c;
      return t.kind === 'jewel' ? n * 1.4 : n;
    };
    const dotted = trees.filter((e) => e.withDots);
    // ~60 % der Kandidaten überstehen die Sonnenseiten-Auswahl
    const planned = dotted.reduce((a, e) => a + dotCount(e.tree) * 0.6, 0);
    const budget = planned > cap ? cap / planned : 1;
    const pushDot = (t: PlanetTree, world: Vector3, hull: Vector3, r: number, row: number, kind: number, slot: number, rc: number): boolean => {
      if (d >= cap) return false;
      _n.copy(world).sub(hull).normalize();
      world.addScaledVector(_n, r * 0.9);
      rel.setXYZ(d, world.x - t.position[0], world.y - t.position[1], world.z - t.position[2]);
      base.setXYZ(d, t.position[0], t.position[1], t.position[2]);
      nrm.setXYZ(d, _n.x, _n.y, _n.z);
      data.setXYZW(d, r * (0.8 + 0.4 * this.rand()), t.rank, this.rand(), slot);
      rowA.setX(d, row + kind * 0.125);
      hullA.setXYZW(d, hull.x, hull.y, hull.z, rc);
      d++;
      return true;
    };
    outer: for (const e of dotted) {
      const t = e.tree;
      const fam = this.familyOf(t.world);
      const motif = fam?.motif ?? 'dots';
      const aspect = fam?.aspect ?? 1;
      const count = Math.max(6, Math.round(dotCount(t) * budget));
      const pts = dotsOnCanopy(t.kind, count, this.rand);
      treeFrame(t, _q);
      _p.set(t.position[0], t.position[1], t.position[2]);
      _s.set(t.canopyRadius, t.canopyRadius * aspect, t.canopyRadius);
      _m.compose(_p, _q, _s);
      const hull = new Vector3(t.hullCenter[0], t.hullCenter[1], t.hullCenter[2]);
      // Punktradius: fein (Earle: Hunderte Punkte je Kuppel), bei großen Kronen gedeckelt
      const r = this.dotRadius * Math.min(1.1, Math.max(0.35, t.canopyRadius)) * (0.85 + 0.3 * this.rand());
      const row = this.canopyRowOf(t);
      const rc = t.canopyRadius * Math.max(1, aspect);
      let k = 0;
      if (motif === 'diamond') {
        // Juwelenkuppel (Bild 10, Ebene_3): kleine Rauten in ruhigen Reihen (Breitenringe der Kuppel) auf der Lichtseite,
        // eine Farbe je Kuppel; dazu nur ein spärlicher Punktrand an der Silhouette — kein Konfetti.
        const ry = t.canopyRadius * (t.kind === 'jewel' ? 0.88 : 0.72) * aspect;
        const rows = t.canopyRadius > 1.4 ? 4 : 3;
        const md = r * 0.8;
        for (let ri = 0; ri < rows; ri++) {
          const polar = ((0.26 + (0.6 * ri) / Math.max(1, rows - 1)) * Math.PI) / 2;
          const ringR = Math.sin(polar) * t.canopyRadius;
          const step = md * 7;
          const nAz = Math.max(4, Math.floor((Math.PI * 2 * ringR) / step));
          const phase = (ri % 2) * 0.5;
          for (let ai = 0; ai < nAz; ai++) {
            const az = ((ai + phase) / nAz) * Math.PI * 2;
            _t.set(Math.cos(az) * ringR, Math.cos(polar) * ry, Math.sin(az) * ringR);
            _t.applyQuaternion(_q);
            const world = hull.clone().add(_t);
            _n.copy(world).sub(hull).normalize();
            if (_n.dot(sunLocal) < -0.05) continue;
            const tang = new Vector3(0, 1, 0).cross(_n);
            if (tang.lengthSq() < 1e-6) tang.set(1, 0, 0).cross(_n);
            tang.normalize();
            const bit = new Vector3().crossVectors(_n, tang).normalize();
            for (const [ox, oy] of [[md * 1.6, 0], [-md * 1.6, 0], [0, md * 1.6], [0, -md * 1.6]] as const) {
              const p2 = world.clone().addScaledVector(tang, ox).addScaledVector(bit, oy);
              if (!pushDot(t, p2, hull, md, row, 1, e.slot, rc)) break outer;
            }
          }
        }
        for (const pt of pts) {
          if (++k % 3 !== 0) continue;
          const world = new Vector3(pt[0], pt[1], pt[2]).applyMatrix4(_m);
          if (!pushDot(t, world, hull, r * 0.8, row, 3, e.slot, rc)) break outer;
        }
        continue;
      }
      for (const pt of pts) {
        const world = new Vector3(pt[0], pt[1], pt[2]).applyMatrix4(_m);
        _n.copy(world).sub(hull).normalize();
        const facing = _n.dot(sunLocal);
        const pAccept = 0.28 + 0.72 * smooth01((facing + 0.25) / 0.85);
        if (this.rand() > pAccept) continue;
        k++;
        // Kreuzmotive (Bilder 01, 04): jede 6. Position wird zu einem Kreuz (5 Punkte) in den Motivfarben
        const isMotif = motif === 'cross' && k % 6 === 0 && facing > -0.1;
        if (isMotif) {
          _t.set(0, 1, 0).cross(_n);
          if (_t.lengthSq() < 1e-6) _t.set(1, 0, 0).cross(_n);
          _t.normalize();
          _b.crossVectors(_n, _t).normalize();
          const dd = r * 2.1;
          const colorKind = this.rand() < 0.5 ? 1 : 2;
          const offsets: Array<[number, number]> = [[0, 0], [dd, 0], [-dd, 0], [0, dd], [0, -dd]];
          for (const [ox, oy] of offsets) {
            const p2 = world.clone().addScaledVector(_t, ox).addScaledVector(_b, oy);
            if (!pushDot(t, p2, hull, r * 0.9, row, colorKind, e.slot, rc)) break outer;
          }
          continue;
        }
        if (!pushDot(t, world, hull, r, row, motif === 'rim' ? 3 : 0, e.slot, rc)) break outer;
      }
    }
    for (const a of [rel, base, nrm, data, rowA, hullA]) commit(a, d);
    g.instanceCount = d;

    // Requisiten
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
      animalList.forEach((e, i) => {
        const p = e.prop;
        b.setXYZ(i, p.position[0], p.position[1], p.position[2]);
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
          sa.setXYZW(n, p.position[0] + p.normal[0] * h, p.position[1] + p.normal[1] * h, p.position[2] + p.normal[2] * h, (k + p.variant * 3) / 6);
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

  private aspectOf(t: PlanetTree): number {
    return this.familyOf(t.world)?.aspect ?? 1;
  }

  /** Instanzmatrix einer Krone: Grundform (Einheitskegel/-kugel) mit Ansatzhöhe und Proportion der Form. */
  private canopyMatrix(t: PlanetTree, out: Matrix4): Matrix4 {
    treeFrame(t, _q);
    const r = t.canopyRadius;
    const asp = this.aspectOf(t);
    _n.set(t.normal[0], t.normal[1], t.normal[2]).normalize();
    _p.set(t.position[0], t.position[1], t.position[2]);
    const cone = CONE_FORM[t.kind as keyof typeof CONE_FORM];
    const sphere = SPHERE_FORM[t.kind as keyof typeof SPHERE_FORM];
    if (cone) {
      _p.addScaledVector(_n, cone[0] * r * asp);
      _s.set(r, cone[1] * r * asp, r);
    } else if (sphere) {
      _p.addScaledVector(_n, sphere[0] * r * asp);
      _s.set(r, sphere[1] * r * asp, r);
    } else {
      _s.set(r, r * asp, r);
    }
    return out.compose(_p, _q, _s);
  }

  private fillTrees(mesh: InstancedMesh, list: VegetationTreeEntry[], matrix: (t: PlanetTree, out: Matrix4) => Matrix4, size: (t: PlanetTree) => [number, number]): void {
    const geo = mesh.geometry;
    const a = geo.getAttribute('treeA') as InstancedBufferAttribute;
    const b = geo.getAttribute('treeB') as InstancedBufferAttribute;
    const c = geo.getAttribute('treeC') as InstancedBufferAttribute;
    const d = geo.getAttribute('treeD') as InstancedBufferAttribute;
    list.forEach((e, i) => {
      const t = e.tree;
      mesh.setMatrixAt(i, matrix(t, _m));
      const [r, h] = size(t);
      const fam = this.familyOf(t.world);
      a.setXYZW(i, t.position[0], t.position[1], t.position[2], t.rank);
      b.setXYZW(i, t.hullCenter[0], t.hullCenter[1], t.hullCenter[2], e.slot);
      c.setXYZW(i, this.canopyRowOf(t), this.rowsOf(t.world).accent, TRUNK_STYLE_INDEX[fam?.trunkStyle ?? 'ink'], t.variant);
      d.setXYZW(i, r, h, t.canopyRadius * Math.max(1, this.aspectOf(t)), t.kind === 'jewel' ? 1 : 0);
    });
    for (const attr of [a, b, c, d, mesh.instanceMatrix]) commit(attr, list.length);
    mesh.count = list.length;
  }

  private fillProps(mesh: InstancedMesh, list: VegetationPropEntry[]): void {
    const geo = mesh.geometry;
    const a = geo.getAttribute('propA') as InstancedBufferAttribute;
    const b = geo.getAttribute('propB') as InstancedBufferAttribute;
    const c = geo.getAttribute('propC') as InstancedBufferAttribute;
    list.forEach((e, i) => {
      const p = e.prop;
      _n.set(p.normal[0], p.normal[1], p.normal[2]).normalize();
      _q.setFromUnitVectors(_Y, _n);
      _q.multiply(_qYaw.setFromAxisAngle(_Y, p.yaw));
      _p.set(p.position[0], p.position[1], p.position[2]);
      const [sx, sy, sz] = propSize(p);
      _s.set(sx, sy, sz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      const rows = this.rowsOf(p.world);
      const row = p.kind === 'monolith' ? rows.monolith : p.kind === 'barn' ? rows.barn : rows.terrain;
      const row2 = p.kind === 'pool' || p.kind === 'pipe' ? rows.accent : rows.terrain;
      a.setXYZW(i, p.position[0], p.position[1], p.position[2], p.rank);
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

  /** Abstand, unter dem Instanzen fremder Welten wegtreten (0 = aus). */
  setForeignClear(units: number): void {
    this.foreignClear.value = Math.max(0, units);
  }

  /** Wachstum 0..1 eines Chunk-Slots (sofort wirksam, kein Pufferschreiben). */
  setSlotGrowth(slot: number, growth: number): void {
    if (slot < 0 || slot >= GROWTH_SLOTS) return;
    (this.growthSlots as unknown as { array: number[] }).array[slot] = Math.min(1, Math.max(0, growth));
  }

  /** Sonnenrichtung in Welt- und Planetenkoordinaten (Punkt-Tönung, Karten-Schatten, Punktverteilung). */
  setSunDirection(world: Vector3, local: Vector3): void {
    this.sunDirWorld.value.copy(world).normalize();
    this.sunDirLocal.value.copy(local).normalize();
  }

  /** Einmal pro Frame: Kameraachsen, Projektionsmaßstab und Kameraposition im Planetenraum. */
  updateCamera(camera: Camera, cameraLocal: Vector3): void {
    this.projScaleY.value = camera.projectionMatrix.elements[5]!;
    this.camLocal.value.copy(cameraLocal);
  }

  /** Alle Instanz-Meshes (für Draw-Call-Zählung und Tests). */
  get meshes(): Array<InstancedMesh | Mesh> {
    const out: Array<InstancedMesh | Mesh> = [];
    for (const k of CANOPY_MESHES) {
      const m = this.canopies[k];
      if (m) out.push(m);
    }
    out.push(this.trunks, this.bare, this.dots, this.props, this.pools, this.animals, this.spores);
    return out;
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
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
