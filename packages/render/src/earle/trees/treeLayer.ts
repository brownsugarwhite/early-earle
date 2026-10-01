import { BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, InstancedMesh, Matrix3, Matrix4, Mesh, MeshBasicNodeMaterial, Quaternion, Vector3 } from 'three/webgpu';
import {
  abs,
  attribute,
  cameraWorldMatrix,
  clamp,
  cross,
  float,
  floor,
  fract,
  int,
  max,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  modelWorldMatrixInverse,
  normalGeometry,
  normalLocal,
  normalize,
  positionGeometry,
  positionLocal,
  screenSize,
  select,
  smoothstep,
  step,
  uniformArray,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { TREE_PROPORTIONS, hash32, type PlaneTree as PlanetTree, type TreeFamily, type TreeKind } from '@ee/world';
import type { WorldSlots } from '../worldSlots';
import { SLOT_COUNT } from '../worldSlots';
import { arrayElement, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec3Node, type Vec4Node } from '../tsl';
import { createHexagon } from '../vegetation';
import { createBareCard } from './bare';
import { createWindCard } from './wind';
import { createColumnCrown, createDomeCrown, createPineCrown, type CrownTemplate } from './crowns';
import { instanceFog } from './fog';
import { BARK_STYLE, BarkMaterial, CrownMaterial, DotMaterial } from './materials';
import { stipple } from './patterns';
import { crownShadeTexture } from './shade';
import { FORK_TOP, FORK_Y, LACE_ENVELOPE, PILLAR_TOP, PILLAR_Y, createFanTrunk, createForkTrunk, createOakTrunk, createPillarTrunk, type FanGeometry, type OakGeometry } from './trunks';
import { createParasolCrown, createParasolTrunk, type ParasolTrunk } from './parasol';
import { createShrubCrown } from './shrub';
import { createFirCrown } from './fir';

/** Wachstums-Slots (je geladenem Chunk); gleich wie `GROWTH_SLOTS` der Vegetation. */
export const TREE_SLOTS = 64;

/**
 * Glatter Schattenwert (1 = Sonne, 0 = Schlagschatten) an einer Weltposition, im Vertex-Shader lesbar — z. B.
 * `(p, o) => sunRig.shadowFactor(p, o)`. Die Punkte skalieren damit im Schatten stetig aus 0.
 */
export type ShadowFactorFn = (positionWorld: Vec3Node, options?: { softness?: number }) => FloatNode;

/** Weichheit (Welteinheiten) des Schattenwerts der Punkte: etwa ein bis zwei Punktdurchmesser. */
const DOT_SHADOW_SOFTNESS = 0.12;

/** Was die Baumschicht aus der Planetenvegetation übernimmt (geteilte Knoten und Uniforms). */
export interface TreeLayerShared {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  warp: (p: Vec3Node) => Vec3Node;
  /** Nebeldistanz eines Fragments (Kameraabstand + Schleier der Welt der Zeile). */
  fogDist: (row: FloatNode, dist?: FloatNode) => FloatNode;
  /** Fremde Instanz nahe der Kamera → 0. */
  foreignNear: (row: FloatNode, base: Vec3Node) => FloatNode;
  /** Wachstums-Aufskalierung (Rang, Slot). */
  popScale: (rank: FloatNode, slot: FloatNode) => FloatNode;
  slotGrowth: (slot: FloatNode) => FloatNode;
  /** Nähe-Ausblendung entlang der Achse Fuß → Krone. */
  nearFade: (base: Vec3Node, top: Vec3Node, radius: FloatNode) => FloatNode;
  /** Lichtung unter der Kamera. */
  footFade: (base: Vec3Node) => FloatNode;
  /** Palettenzeile → Welt-Slot (−1 = keine Slotzeile). */
  slotOfRow: (row: FloatNode) => FloatNode;
  nearClear: TSLUniform;
  camLocal: { value: Vector3 } & Vec3Node;
  sunDirLocal: { value: Vector3 } & Vec3Node;
  projScaleY: TSLUniform;
  collapsePx: TSLUniform;
  /** Schattenwert für die Punkte (Vertex-Stufe); fehlt → Punkte folgen nur N·L. */
  shadowFactor?: ShadowFactorFn | null;
}

export interface TreeWorldRows {
  terrain: number;
  canopy: number[];
  accent: number;
}

export interface TreeLayerOptions {
  /** Welt-Slots (Palettenzeilen je Welt). */
  slots: WorldSlots;
  /** Vegetationsfamilie einer Welt (Kennung). */
  family: (world: number) => TreeFamily | undefined;
  capacity: { trees: number; dots: number };
  dotsPerTree: [number, number];
  dotRadius?: number;
}

/**
 * Optionale Felder der Vegetationsfamilie, die nur die Bäume lesen (Weltdatei, Abschnitt `vegetation`):
 * - `stippleCell`: Zellgröße der Tüpfel in den Kuppeln (Welteinheiten, Standard 0.11; Juwelenwald feiner, Bild 02);
 * - `shadeGlow`: Glühen der Schattenseiten der Kronen 0..1 (Standard 0.12; Ebene 16 dunkles Türkis, Ebene 32 Glut);
 * - `capTerminator`: Terminator der Kuppelkappen von Schirm- und Spitzenbaum (Standard wie die Form; Juwelenwald wie
 *   die Juwelenkuppeln, Bild 02: auch die Kappe über dem Spitzenschleier leuchtet farbig);
 * - `crownVeins`: Astnetz in den Säulenkronen 0..1 (Standard 0; Kathedralenwald 1, Ebene 16);
 * - `crownLiftVariance`: Helligkeit der Kronen je Baum streuen 0..1 (Standard 0; Ebene 16: dunkelgrüne und hell-
 *   türkise Kronen nebeneinander);
 * - `kindRows`: Kronenzeile je Art (Index in Hauptzeile + Varianten) statt der Zufallsvariante — eine Zahl oder eine
 *   Liste, aus der je Baum gewählt wird (Ebene 7: Tannen immer in der dunklen Zeile, Schuppenbüsche meist türkis, einige
 *   rot und hellgrün);
 * - `kindRowPatch`: Zellgröße (Welteinheiten), in der die Wahl aus `kindRows` gleich bleibt — Farbflecken statt
 *   verstreuter Einzelbüsche (Ebene 7: ein Fleck roter Büsche, daneben hellgrüne).
 */
export interface TreeFamilyExtras {
  stippleCell?: number;
  shadeGlow?: number;
  capTerminator?: number;
  crownVeins?: number;
  crownLiftVariance?: number;
  kindRows?: Partial<Record<TreeKind, number | number[]>>;
  kindRowPatch?: number;
}

export interface TreeEntry {
  tree: PlanetTree;
  slot: number;
  withDots: boolean;
}

/**
 * Kronen-Meshes: Kuppel-Masse, dieselbe fein aufgelöst für große Bäume (Fokus, Solitäre), Säule, Stufenkiefer; dazu
 * Pilzhut des Schirmbaums, Buschröschen und Etagen der Earle-Tanne (Welten 11/12, Ebene 20 und Ebene 7).
 */
export type CrownKind = 'dome' | 'domeHi' | 'column' | 'pine' | 'parasol' | 'shrub' | 'fir';
export type TrunkKind = 'fork' | 'fan' | 'oak' | 'pillar' | 'parasol';
export const CROWN_KINDS: CrownKind[] = ['dome', 'domeHi', 'column', 'pine', 'parasol', 'shrub', 'fir'];
/** Ab diesem Kronenradius (Welteinheiten, waagrecht) nimmt eine Kuppel die feine Geometrie. */
const DOME_HI_RADIUS = 1.45;
export const TRUNK_KINDS: TrunkKind[] = ['fork', 'fan', 'oak', 'pillar', 'parasol'];

/** Form je Baumart (Einheit Kronenradius r). */
export interface KindForm {
  crown: CrownKind | null;
  /** Kronenmitte über dem Fuß (Kuppel, Juwel, Säule) bzw. Kronenfuß (Kiefer). */
  crownY: number;
  /** Kronenmaßstab (waagrecht, senkrecht) in r. */
  crownS: [number, number];
  trunk: TrunkKind | null;
  /** Maßstab des Stamm-Archetyps in r (Gabel: Einheit H; Fächer: Einheit Kronenradius; Eiche: Stammhöhe). */
  trunkH: number;
  /**
   * Gabelhöhe in r (nur Gabel-Archetyp): der Vertex-Shader streckt den Schaft bis dorthin, das Astnetz behält die
   * Größe `trunkH` — schlanke Kathedralen- und Pappelbäume tragen ihr feines Astnetz in der Krone statt Stäbe darüber.
   */
  forkAt?: number;
  /** Stammdicke relativ zum Archetyp. */
  thick: number;
  dots: 'crown' | 'lace' | 'stars' | 'pine' | 'none';
  /** Terminator der Krone (N·L darunter Tinte). */
  terminator: number;
  /** Anteil der Kronenpunkte, die als Randpunkte nur an der Silhouette zur Sonne stehen (Standard 0.25). */
  rimShare?: number;
  /** Anteil des Punktbudgets für die Bögen der Vorlage (Standard `SCALLOP_SHARE`). */
  scallopShare?: number;
  /** Bögen in Vorlagenreihenfolge statt ab einem Zufallsstart (ganze Schuppenbögen, außen zuerst). */
  scallopsInOrder?: boolean;
  /** Größenfaktor der Kronenpunkte (Standard 1; feiner Punktrand des Schirmbaums kleiner). */
  dotSize?: number;
}

/**
 * Formen: Kronenhöhen und -maße passen zu TREE_PROPORTIONS (hull/top), damit Schatten-Höhe, Nähe-Ausblendung und die
 * Streuung dasselbe annehmen. Die Äste der Gabel enden in der Krone (Kuppel, Säule, Kiefer); Schirm- und Spitzenbaum
 * tragen das Spitzen-Skelett, dessen Hauptäste in der flachen Kappe verschwinden.
 */
/** Arten, die als Linienkarte gezeichnet werden (kahler Baum, Windbaum) — ohne Krone, Stamm und Punkte. */
export type CardKind = 'bare' | 'wind';
export function isCardKind(k: TreeKind): k is CardKind {
  return k === 'bare' || k === 'wind';
}

export const TREE_FORMS: Record<Exclude<TreeKind, CardKind>, KindForm> = {
  dome: { crown: 'dome', crownY: TREE_PROPORTIONS.dome.hull, crownS: [1, 1], trunk: 'fork', trunkH: 0.95, thick: 1, dots: 'crown', terminator: 0.32 },
  stacked: { crown: 'column', crownY: TREE_PROPORTIONS.stacked.hull, crownS: [0.62, 1.2], trunk: 'fork', trunkH: 1.0, forkAt: 0.5, thick: 0.9, dots: 'crown', terminator: 0.15 },
  bulb: { crown: 'dome', crownY: TREE_PROPORTIONS.bulb.hull, crownS: [0.95, 1.15], trunk: 'fork', trunkH: 0.8, thick: 1.1, dots: 'crown', terminator: 0.25 },
  // Juwelenkuppel (Bild 02): gestapelte Kuppel-Masse in Juwelenfarben, sitzt fast am Boden, leuchtet fast rundum
  // Terminator unter 0: die Kuppeln leuchten weit herum, die abgewandte Unterseite wird dunkel und glüht mit ihrer
  // Schattentextur (Bild 02: dunkle, getüpfelte Unterseiten)
  jewel: { crown: 'dome', crownY: TREE_PROPORTIONS.jewel.hull, crownS: [1.08, 1.0], trunk: 'fork', trunkH: 0.5, thick: 1.4, dots: 'crown', terminator: -0.75 },
  // Hohe, schlanke Stämme: derselbe Gabel-Archetyp, waagrecht schmal (ein Mesh weniger je Pass)
  cone: { crown: 'pine', crownY: 0.4, crownS: [1, 2.4], trunk: 'fork', trunkH: 0.55, thick: 0.38, dots: 'pine', terminator: 0.25 },
  pine: { crown: 'pine', crownY: 0.12, crownS: [1, 3.6], trunk: 'fork', trunkH: 0.4, thick: 0.44, dots: 'pine', terminator: 0.22 },
  // Pappel (Luzz): langer Schaft, die Gabel knapp unter der Kiefernkrone, das Astnetz steigt in sie hinein
  tall: { crown: 'pine', crownY: 3.3, crownS: [1, 1.5], trunk: 'fork', trunkH: 1.3, forkAt: 3.0, thick: 0.3, dots: 'pine', terminator: 0.25 },
  // Kathedralenbaum (Ebene 16/23/43): der helle Schaft gabelt sich schon auf halber Höhe in ein feines, steiles Netz,
  // das als Fächer unter der Krone steht und in sie hineinwächst; die Krone eine hohe, runde Kuppel (Ogive)
  spire: { crown: 'column', crownY: TREE_PROPORTIONS.spire.hull, crownS: [1.15, 1.15], trunk: 'fork', trunkH: 5.5, forkAt: 3.4, thick: 0.3, dots: 'crown', terminator: 0.15 },
  umbrella: { crown: 'dome', crownY: TREE_PROPORTIONS.umbrella.hull, crownS: [1.06, 0.6], trunk: 'fan', trunkH: 0.74, thick: 1, dots: 'crown', terminator: 0.12 },
  lace: { crown: 'dome', crownY: TREE_PROPORTIONS.lace.hull + 0.3, crownS: [0.97, 0.62], trunk: 'fan', trunkH: 1.0, thick: 1, dots: 'lace', terminator: 0.12 },
  oak: { crown: null, crownY: TREE_PROPORTIONS.oak.hull, crownS: [1, 1], trunk: 'oak', trunkH: TREE_PROPORTIONS.oak.trunk, thick: 1, dots: 'stars', terminator: 0.3 },
  // Riesenstamm (Ebene 16/3): eigener, fein runder Archetyp, verzweigt bei der Stammhöhe; breite Kuppel hoch darüber
  pillar: { crown: 'dome', crownY: TREE_PROPORTIONS.pillar.hull, crownS: [1.5, 1.1], trunk: 'pillar', trunkH: TREE_PROPORTIONS.pillar.trunk / PILLAR_Y, thick: 1, dots: 'crown', terminator: 0.32 },
  // Schirmbaum (Ebene 20): der Hut sitzt mit seiner Unterseite auf den Astenden, feiner Punktrand an der Hutkante
  parasol: { crown: 'parasol', crownY: TREE_PROPORTIONS.parasol.trunk, crownS: [1, 1], trunk: 'parasol', trunkH: 1, thick: 1, dots: 'crown', terminator: 0.3, rimShare: 0.6, scallopShare: 0.15, dotSize: 0.55 },
  // Buschröschen (Ebene 20/7): Punktrand an der Silhouette zur Sonne, ganze Schuppenbögen um den Scheitel
  // (Terminator über dem der Punkte: der Körper bleibt dunkel, zur Sonne zuerst der Punktrand, dann ein schmaler Lichtsaum)
  shrub: { crown: 'shrub', crownY: TREE_PROPORTIONS.shrub.hull, crownS: [1, 1], trunk: null, trunkH: 0, thick: 1, dots: 'crown', terminator: 0.42, rimShare: 0.5, scallopShare: 0.55, scallopsInOrder: true, dotSize: 0.85 },
  // Earle-Tanne (Ebene 7): dunkle hängende Etagen, der Gabel-Schaft steckt in der untersten Etage
  fir: { crown: 'fir', crownY: TREE_PROPORTIONS.fir.trunk, crownS: [1, 1], trunk: 'fork', trunkH: 0.5, thick: 0.4, dots: 'none', terminator: 0.22 },
  // Schwarze Randtanne (Ebene 10): Sägezahn-Stufen der Kiefer, schmaler und höher, reine Silhouette (Terminator ≥ 0.9:
  // keine Tüpfel, siehe CrownMaterial `inkBody`) — der Sägezahn vor dem Schnee
  spruce: { crown: 'pine', crownY: 0.08, crownS: [0.9, 4.1], trunk: 'fork', trunkH: 0.3, thick: 0.4, dots: 'none', terminator: 0.95 },
};

/**
 * Punktarten (Bruchteil der Zeile · 8): Krone, Juwelenkrone, Kiefernschnee, Randfunkeln, Spitze, Sternnadel, Bogen
 * (gepunktete Oberkante einer Teilkuppel). Ein Viertel-Achtel darüber trägt, ob der Punkt Schlagschatten annimmt —
 * gerundet (`Math.round(fract · 8)`, wie der Blender-Export liest) bleibt es die Art.
 */
export const DOT_KIND = { crown: 0, jewel: 1, pine: 2, rim: 3, lace: 4, star: 5, scallop: 6 } as const;

const _Y = new Vector3(0, 1, 0);
const _q2 = new Quaternion();
const _m = new Matrix4();
const _nm = new Matrix3();
const _p = new Vector3();
const _s = new Vector3();
const _v = new Vector3();
const _n = new Vector3();
const _d = new Vector3();
const _up = new Vector3();
const _axis = new Vector3();

/** Deterministischer Zufallswert 0..1 aus der Baumposition (unabhängig von Reihenfolge, Sonne und Budget). */
export function treeHash(p: readonly number[], salt: number): number {
  return hash32('tree', Math.round(p[0]! * 997), Math.round(p[1]! * 997), Math.round(p[2]! * 997), salt) / 4294967296;
}

/**
 * Lot des Baums: überwiegend lotrecht (Ebene: +Y; Bäume wachsen lotrecht, auch am Hang), ein Hauch Hangnormale; dazu
 * eine kleine, deterministische Neigung und Drehung je Baum (organische Vielfalt ohne weitere Archetypen).
 */
export function treeQuaternion(t: PlanetTree, out: Quaternion, lean = true): Quaternion {
  _up.set(0, 0.8, 0);
  _up.add(_n.set(t.normal[0], t.normal[1], t.normal[2]).normalize().multiplyScalar(0.2)).normalize();
  out.setFromUnitVectors(_Y, _up);
  if (lean) {
    const a = treeHash(t.position, 1) * Math.PI * 2;
    const tilt = (treeHash(t.position, 2) - 0.5) * 0.14;
    out.multiply(_q2.setFromAxisAngle(_axis.set(Math.cos(a), 0, Math.sin(a)), tilt));
  }
  return out.multiply(_q2.setFromAxisAngle(_Y, treeHash(t.position, 3) * Math.PI * 2));
}

/** Streckung des Gabel-Schafts (1 = Archetyp) einer Form: Gabelhöhe `forkAt` bei Archetyp-Maßstab H. */
export function stemStretch(form: KindForm, H: number, r: number): number {
  if (form.trunk !== 'fork' || form.forkAt === undefined || H <= 0) return 1;
  return Math.max(1, (form.forkAt * r) / (FORK_Y * H));
}

interface DotBlock {
  key: string;
  slot: number;
  count: number;
  /** Ursprung (Ebene) der Fuß- und Hüllpositionen des Blocks. */
  ox: number;
  oz: number;
  rel: Float32Array;
  base: Float32Array;
  nrm: Float32Array;
  data: Float32Array;
  row: Float32Array;
  hull: Float32Array;
  /** Nächster Baum der Gruppe zur Kamera beim Aufbau (Budget: nahe zuerst). */
  dist: number;
  fade: number;
  target: number;
  /** Liegt im Pool (nur dann läuft die Blende; ein Block, der auf Platz wartet, blendet danach von 0 ein). */
  written: boolean;
}

/** Dauer der Ein-/Ausblendung der Punkte eines Chunks (s). */
const DOT_FADE_SECONDS = 0.6;
/** Anteil der Kronenpunkte, der als gepunktete Oberkante der Teilkuppeln gesetzt wird (Earles Bögen). */
const SCALLOP_SHARE = 0.4;

/**
 * Bäume v4 auf dem Planeten: Kronen (Kuppel-Masse, Juwel, Säule, Stufenkiefer), organische Stämme (Gabel mit gestrecktem
 * Schaft für die schlanken Formen, Spitzen-Skelett, Eiche), kahle Linienbäume als Karten und der Punkt-Pool (Kronenpunkte
 * mit Randfunkeln, gepunktete Bögen der Teilkuppeln, Spitzenschleier am Skelett, Sternnadeln).
 *
 * Punkte ohne Ploppen: je Baum eine feste, deterministische Punktmenge (Hash der Baumposition, unabhängig von Sonne,
 * Reihenfolge und Budget); im Shader skalieren sie mit N·L der Kronen-Schattierungsnormale weich auf 0 und blenden unter
 * der Kollaps-Grenze weich aus. Chunks, die Punkte bekommen oder verlieren, blenden je Slot über ≈ 0.6 s ein bzw. aus.
 * Nebel je Baum (eine Tiefenebene je Baum, `trees/fog.ts`), Schlagschatten je Teilkuppel ganz oder gar nicht — nichts
 * wirkt halbdurchsichtig.
 */
export class TreeLayer {
  readonly crowns: Record<CrownKind, InstancedMesh>;
  readonly trunks: Record<TrunkKind, InstancedMesh>;
  readonly bare: InstancedMesh;
  /** Windbäume (Welt 14): knorrige Linienkarten mit Spitzenwerk, zur Leeseite (+x) geneigt. */
  readonly wind: InstancedMesh;
  readonly dots: Mesh;
  /** Höchster Baum im aktuellen Inhalt (Welteinheiten, für die Schattenkamera). */
  hMax = 2;
  private readonly templates: Record<CrownKind, CrownTemplate>;
  private readonly fan: FanGeometry;
  private readonly oak: OakGeometry;
  private readonly parasolTrunk: ParasolTrunk;
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Array<{ dispose(): void }> = [];
  private readonly dotsGeometry: InstancedBufferGeometry;
  private readonly dotFade = uniformArray(new Array<number>(TREE_SLOTS).fill(0), 'float');
  private readonly worldSnow: UniformArrayLike;
  private readonly worldTerrain: UniformArrayLike;
  private readonly worldStipple: UniformArrayLike;
  private readonly worldFlowers: UniformArrayLike;
  private readonly worldCell: UniformArrayLike;
  private readonly worldGlow: UniformArrayLike;
  private readonly worldVeins: UniformArrayLike;
  private readonly worldLiftVar: UniformArrayLike;
  private blocks = new Map<number, DotBlock>();
  private dotsDirty = false;
  private lastTick = -1;
  private readonly dotRadius: number;
  private windCard = { height: 2.7, capacity: 16 };

  constructor(
    private readonly shared: TreeLayerShared,
    private readonly options: TreeLayerOptions,
  ) {
    const { lookup, fog } = shared;
    const warp = shared.warp;
    this.dotRadius = options.dotRadius ?? 0.06;
    // Tabellen je Welt-Slot (unendliche Ebene: nachgeführt, wenn ein Slot neu belegt wird, siehe onSlotAssigned)
    const perSlot = (v: number): UniformArrayLike => uniformArray(new Array<number>(SLOT_COUNT).fill(v), 'float') as unknown as UniformArrayLike;
    this.worldSnow = perSlot(0);
    this.worldTerrain = perSlot(0);
    this.worldStipple = perSlot(0.75);
    this.worldFlowers = perSlot(0);
    this.worldCell = perSlot(0.11);
    this.worldGlow = perSlot(0.12);
    this.worldVeins = perSlot(0);
    this.worldLiftVar = perSlot(0);
    for (const [slot, world] of options.slots.entries()) this.onSlotAssigned(slot, world);

    // Detailstufe aus der Qualitätsstufe (Hoch: 60+ Punkte je Baum): feinere Teilkuppeln, glattere Silhouetten
    const detail = options.dotsPerTree[0] >= 50 ? 'hoch' : 'mobil';
    this.templates = {
      dome: createDomeCrown(detail),
      domeHi: createDomeCrown(detail === 'hoch' ? 'ultra' : 'hoch'),
      column: createColumnCrown(detail),
      pine: createPineCrown(),
      parasol: createParasolCrown(detail === 'hoch' ? 'ultra' : 'hoch'),
      shrub: createShrubCrown(detail),
      fir: createFirCrown(detail),
    };
    this.fan = createFanTrunk(5);
    this.oak = createOakTrunk(3);
    this.parasolTrunk = createParasolTrunk(TREE_PROPORTIONS.parasol.trunk);

    // Gepackte Instanzattribute (WebGPU: ≤ 8 Vertex-Puffer je Pipeline):
    // treeA = (Fuß xyz, Rang), treeB = (Kronenmitte bzw. Spitze xyz, Slot), treeC = (Kronenzeile, Akzentzeile, Stil, Variante),
    // treeD: Krone = (Mustermaßstab waagrecht, senkrecht, Ausblendradius, Terminator);
    //        Stamm = (H, Gabel: Astnetz-Stauchung / Fächer: Schleier an, Ausblendradius, Welt + Anlauf)
    const treeA = () => attribute('treeA', 'vec4');
    const treeB = () => attribute('treeB', 'vec4');
    const treeC = () => attribute('treeC', 'vec4');
    const treeD = () => attribute('treeD', 'vec4');
    const treeScale = (): FloatNode =>
      shared.popScale(treeA().w, treeB().w).mul(shared.nearFade(treeA().xyz, treeB().xyz, treeD().z)).mul(shared.foreignNear(treeC().x, treeA().xyz));
    const grownFrom = (p: Vec3Node): Vec3Node => {
      const base = treeA().xyz;
      return base.add(p.sub(base).mul(treeScale()));
    };
    /** Nebel je Baum: Abstand der Kamera zum (gekrümmten) Fuß — Stamm, Krone und Punkte eines Baums teilen ihn. */
    const fogOf = (row: FloatNode, foot: Vec3Node, name: string, rise?: { height: FloatNode; perUnit: number }) => {
      // Aufsteigender Nebel (Earle-Tannen, Ebene 7): je Einheit über dem Fuß ein Stück mehr Nebel — die Tanne verblasst
      // nach oben im Goldnebel, in den Nebelstufen der Welt (harte Stufen, wie der übrige Nebel)
      const lift = rise ? rise.height.max(0).mul(rise.perUnit) : float(0);
      const d = varying(modelViewMatrix.mul(vec4(warp(foot), 1)).xyz.length().add(lift), name);
      const dist = shared.fogDist(row, d);
      return (c: Vec3Node): Vec3Node => instanceFog(c, fog, lookup, dist);
    };

    // --- Kronen ------------------------------------------------------------------------------------------
    const crowns = {} as Record<CrownKind, InstancedMesh>;
    // density: Faktor auf die Tüpfeldichte der Welt (Schirmbaum und Tanne sind fast reine Silhouetten, Ebene 20/7)
    const stippleOf: Record<CrownKind, { cell: number; size: number; flowers: boolean; density?: number }> = {
      dome: { cell: 0.11, size: 0.3, flowers: true },
      domeHi: { cell: 0.11, size: 0.3, flowers: true },
      // Säulen tragen wie bei Earle (Ebene 16) kleine Blütenmotive in den Tüpfeln
      column: { cell: 0.1, size: 0.3, flowers: true },
      pine: { cell: 0.05, size: 0.3, flowers: false },
      parasol: { cell: 0.09, size: 0.3, flowers: false, density: 0.12 },
      shrub: { cell: 0.07, size: 0.32, flowers: false },
      fir: { cell: 0.05, size: 0.3, flowers: false, density: 0 },
    };
    for (const kind of CROWN_KINDS) {
      const geometry = this.templates[kind].geometry;
      this.attachTreeAttributes(geometry, kind === 'domeHi' ? this.hiCapacity : options.capacity.trees);
      const row = treeC().x;
      const world = shared.slotOfRow(row);
      const cfg = stippleOf[kind];
      // Hüllnormale: Richtung von der (mitwachsenden) Kronenmitte zum Punkt, im View-Raum
      const hullPlanet = grownFrom(positionLocal).sub(grownFrom(treeB().xyz));
      const hullN = varying(modelViewMatrix.mul(vec4(hullPlanet, 0)).xyz, 'vCrownHullN');
      // Schlagschatten je Teilkuppel ganz oder gar nicht (Attribut der Krone): Gürtel und untere Kränze nehmen ihn an,
      // Schultern und Scheitel bleiben hell (Bild 03) — eine klare Tintenform, nie ein halbdurchsichtiger Verlauf.
      // Juwelenkuppeln (Terminator < 0) leuchten rundum — kein Schlagschatten auf ihnen (Bild 02)
      const castWeight = varying(step(0.5, attribute('crownCast', 'float')).mul(select(treeD().w.lessThan(0), float(0), float(1))), 'vCrownCastW');
      const patternPos = varying(positionGeometry.mul(vec3(treeD().x, treeD().y, treeD().x)), 'vCrownPattern');
      const patternNormal = varying(normalGeometry, 'vCrownPatternN');
      const flowerCell = kind === 'column' ? 0.22 : 0.26;
      const material = new CrownMaterial({
        lookup,
        fog,
        bands: shared.bands,
        bandScale: 2.0,
        rowNode: row,
        fogDistNode: shared.fogDist(row),
        fogFn: kind === 'fir' ? fogOf(row, treeA().xyz, 'vFirFogDist', { height: grownFrom(positionLocal).y.sub(treeA().y), perUnit: 2.6 }) : fogOf(row, treeA().xyz, 'vCrownFogDist'),
        terminatorNode: treeD().w,
        growthNode: shared.slotGrowth(treeB().w),
        positionNode: warp(grownFrom(positionLocal)),
        patternPos,
        patternNormal,
        stipple: {
          cell: kind === 'dome' || kind === 'domeHi' ? arrayElement(this.worldCell, world) : cfg.cell,
          size: cfg.size,
          density: kind === 'pine' ? float(0.55) : arrayElement(this.worldStipple, world).mul(cfg.density ?? 1),
        },
        inkBody: kind === 'pine',
        flowers: cfg.flowers ? { density: arrayElement(this.worldFlowers, world), cell: flowerCell } : null,
        // Juwelenkuppeln leuchten fast rundum (Bild 02): Bänder etwas angehoben; je Welt streut die Helligkeit je Baum
        lift: select(treeD().w.lessThan(0), float(0.12), float(0)).add(arrayElement(this.worldLiftVar, world).mul(fract(treeC().w.mul(7.31)).sub(0.35))),
        hullNormalView: hullN,
        castWeight: kind === 'pine' ? null : castWeight,
        // Schattenseite: dunkel auf dunkel statt schwarzer Fläche (Kiefern sind ohnehin Tintenkörper mit Punkten)
        shadeTexture:
          kind === 'pine'
            ? null
            : crownShadeTexture({
                lookup,
                patternPos,
                density: arrayElement(this.worldStipple, world).mul(0.85 * (cfg.density ?? 1)),
                glow: arrayElement(this.worldGlow, world).mul(float(0.7).add(fract(treeC().w.mul(3.7)).mul(0.6))),
                veins:
                  kind === 'column'
                    ? { amount: arrayElement(this.worldVeins, world), radius: treeD().x.mul(0.62), half: treeD().y.mul(1.1), color: lookup.pal(0, treeC().y).rgb as unknown as Vec3Node }
                    : null,
                flowers: cfg.flowers ? { normal: patternNormal, cell: flowerCell, density: arrayElement(this.worldFlowers, world) } : null,
              }),
      });
      this.materials.push(material);
      const mesh = new InstancedMesh(geometry, material, kind === 'domeHi' ? this.hiCapacity : options.capacity.trees);
      mesh.name = `planet-crown-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true; // Schlagschatten anderer Bäume und Hügel: untere Teilkuppeln werden Tinte (eine Tintenform)
      mesh.frustumCulled = false;
      mesh.count = 0;
      crowns[kind] = mesh;
      this.geometries.push(geometry);
    }
    this.crowns = crowns;

    // --- Stämme ------------------------------------------------------------------------------------------
    const trunks = {} as Record<TrunkKind, InstancedMesh>;
    const trunkGeos: Record<TrunkKind, BufferGeometry> = { fork: createForkTrunk(11), fan: this.fan.geometry, oak: this.oak.geometry, pillar: createPillarTrunk(7), parasol: this.parasolTrunk.geometry };
    for (const kind of TRUNK_KINDS) {
      const geometry = trunkGeos[kind];
      const cap = this.trunkCapacity(kind);
      this.attachTreeAttributes(geometry, cap);
      const bark = attribute('bark', 'vec4');
      const H = treeD().x;
      // Dicke je Instanz steckt in der Instanzmatrix (waagrecht gestreckt): der Wurzelanlauf wird breiter, nicht höher
      const n = normalize(normalLocal);
      const row = treeC().x;
      // treeD.w = Welt-Slot + (1 − Anlauf)·0.5: schlanke Schäfte (Tannen, Pappeln, Kathedralen) mit schmalem Wurzelanlauf
      const world = floor(treeD().w);
      const keep = float(1).sub(fract(treeD().w).mul(2));
      const level = bark.z;
      let placed: Vec3Node = positionLocal;
      let barkV: FloatNode = bark.y;
      let shadowPlaced: Vec3Node | null = null;
      let veil: { mask: FloatNode; color: Vec3Node } | null = null;
      if (kind === 'fork') {
        const up = normalize(treeB().xyz.sub(treeA().xyz));
        const rel = positionLocal.sub(treeA().xyz);
        const along = up.mul(rel.dot(up));
        const y = positionGeometry.y;
        // Anlauf des Gabel-Archetyps (flare(y, 1.6, 0.075)) waagrecht auf `keep` zurücknehmen
        const F = float(1).add(float(1.6).mul(y.add(0.02).max(0).div(0.075).negate().exp()));
        const k = float(1).add(keep.mul(F.sub(1))).div(F);
        // Astnetz: waagrecht auf die Form zurückgestaucht (breite Juwelen-Schäfte tragen dasselbe schmale Netz)
        const squeeze = mix(float(1), treeD().y, smoothstep(FORK_Y - 0.04, FORK_Y + 0.12, y));
        // Schaft strecken: die Gabel sitzt bei `forkAt`, das Astnetz behält seine Größe (Spitze = treeB)
        const S = float(1).add(treeB().xyz.sub(treeA().xyz).length().div(H).sub(FORK_TOP).div(FORK_Y));
        const lift = up.mul(H.mul(S.sub(1)).mul(clamp(y, 0, FORK_Y)));
        placed = treeA().xyz.add(along).add(lift).add(rel.sub(along).mul(k).mul(squeeze));
        barkV = bark.y.add(S.sub(1).mul(clamp(bark.y.sub(0.28), 0, FORK_Y)));
      } else if (kind === 'fan') {
        // Schleier (Innenseite der unteren Schale, Ebene 4): nur beim Spitzenbaum (treeD.y = 1), nie im Schattenpass
        const isVeil = level.greaterThan(3.5);
        const hideVeil = isVeil.and(treeD().y.lessThan(0.5));
        // Halbscheibe senkrecht hinter der Baummitte, um die Baumachse zur Kamera gedreht (flacher Grund, keine Schale)
        const up = normalize(treeB().xyz.sub(treeA().xyz));
        const centre = treeA().xyz.add(up.mul(H.mul(LACE_ENVELOPE.cy)));
        const toCam = shared.camLocal.sub(centre);
        const view = normalize(toCam.sub(up.mul(toCam.dot(up))));
        const right = normalize(cross(up, view));
        const disc = centre
          .add(right.mul(positionGeometry.x.mul(H).mul(LACE_ENVELOPE.rx * 0.94)))
          .add(up.mul(positionGeometry.y.mul(H).mul(LACE_ENVELOPE.ry * 0.94)))
          .sub(view.mul(H.mul(LACE_ENVELOPE.rx * 0.55)));
        placed = select(hideVeil, treeA().xyz, select(isVeil, disc, positionLocal));
        shadowPlaced = select(isVeil, treeA().xyz, positionLocal);
        // Grundfarbe: das helle Stammlicht der Welt (Akzent 0), wo es dunkel ist, die hellste Kronenstufe
        const acc0 = lookup.pal(0, treeC().y).rgb as unknown as Vec3Node;
        const pale = select(acc0.dot(vec3(0.3, 0.59, 0.11)).greaterThan(0.45), acc0, lookup.pal(5, treeC().x).rgb) as unknown as Vec3Node;
        // feine dunkle Tüpfel auf dem hellen Grund (Bild 02), aus der Ferne ein leichter Grauschleier derselben Tinte
        const veilInk = lookup.pal(0, treeC().x).rgb as unknown as Vec3Node;
        const vst = stipple(varying(positionGeometry.mul(H), 'vVeilPos') as unknown as Vec3Node, 0.045, 0.3, float(1), 0.7);
        const veilCol = mix(mix(pale, veilInk, 0.14), veilInk, vst.mask);
        veil = { mask: varying(select(isVeil, float(1), float(0)), 'vBarkVeil'), color: veilCol };
      }
      const material = new BarkMaterial({
        lookup,
        fog,
        fogDistNode: shared.fogDist(row),
        fogFn: fogOf(row, treeA().xyz, 'vBarkFogDist'),
        positionNode: warp(grownFrom(placed)),
        rowNode: row,
        accentNode: treeC().y,
        terrainRowNode: arrayElement(this.worldTerrain, world),
        styleNode: treeC().z,
        variantNode: treeC().w,
        snowNode: arrayElement(this.worldSnow, world),
        bark: varying(vec4(bark.x, barkV.mul(H), bark.z, bark.w.mul(H)), 'vBark') as unknown as Vec4Node,
        objPos: varying(positionGeometry.mul(H), 'vBarkPos'),
        normalPlanet: varying(n, 'vBarkN'),
        upPlanet: varying(vec3(0, 1, 0), 'vBarkUp'),
        growthNode: shared.slotGrowth(treeB().w),
        veil,
        giant: kind === 'pillar',
      });
      if (shadowPlaced) (material as unknown as { castShadowPositionNode: unknown }).castShadowPositionNode = warp(grownFrom(shadowPlaced));
      this.materials.push(material);
      const mesh = new InstancedMesh(geometry, material, cap);
      mesh.name = `planet-trunk-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.count = 0;
      trunks[kind] = mesh;
      this.geometries.push(geometry);
    }
    this.trunks = trunks;

    // --- Kahle Linienbäume: Karten, zur Kamera gedreht, im Schattenpass zur Sonne ------------------------------
    {
      const geometry = createBareCard(3);
      geometry.deleteAttribute('normal');
      const n = options.capacity.trees;
      geometry.setAttribute('bareBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('bareUp', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('bareData', new InstancedBufferAttribute(new Float32Array(n * 4), 4)); // Größe, Rang, Slot, Akzentzeile
      geometry.setAttribute('bareVariant', new InstancedBufferAttribute(new Float32Array(n), 1));
      const base = attribute('bareBase', 'vec3');
      const up = attribute('bareUp', 'vec3');
      const data = attribute('bareData', 'vec4');
      const variant = attribute('bareVariant', 'float');
      const size = data.x
        .mul(shared.popScale(data.y, data.z))
        .mul(shared.nearFade(base, base.add(up.mul(data.x.mul(2.1))), data.x))
        .mul(shared.foreignNear(data.w, base));
      const flip = select(variant.greaterThan(0.5), float(-1), float(1));
      // Vielfalt ohne weitere Geometrie: Spannweite und ein sanftes Einrollen der Äste je Instanz
      const spread = float(0.78).add(fract(variant.mul(7.31)).mul(0.5));
      const curl = fract(variant.mul(3.17)).sub(0.5).mul(0.28);
      const gx = positionGeometry.x.mul(spread).add(positionGeometry.y.mul(positionGeometry.y).mul(curl).mul(0.12));
      const billboard = (toward: Vec3Node): Vec3Node => {
        const right = normalize(cross(up, toward));
        return base.add(right.mul(gx.mul(size).mul(flip))).add(up.mul(positionGeometry.y.mul(size)));
      };
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      material.colorNode = fogOf(data.w, base, 'vBareFogDist')(lookup.pal(3, data.w).rgb as unknown as Vec3Node);
      material.positionNode = warp(billboard(normalize(shared.camLocal.sub(base))));
      (material as unknown as { castShadowPositionNode: unknown }).castShadowPositionNode = warp(billboard(shared.sunDirLocal));
      const mesh = new InstancedMesh(geometry, material, n);
      mesh.name = 'planet-bare';
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.bare = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
    }

    // --- Windbäume (Ebene 29): knorrige Karten mit Spitzenwerk, immer zur Leeseite geneigt ----------------------------
    {
      const hi = options.dotsPerTree[0] >= 50;
      const card = createWindCard(5, hi ? {} : { depth: 5, tuft: 6 });
      const geometry = card.geometry;
      const n = Math.max(16, Math.round(options.capacity.trees * 0.1));
      geometry.setAttribute('windBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('windUp', new InstancedBufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('windData', new InstancedBufferAttribute(new Float32Array(n * 4), 4)); // Größe, Rang, Slot, Kronenzeile
      geometry.setAttribute('windVariant', new InstancedBufferAttribute(new Float32Array(n), 1));
      const base = attribute('windBase', 'vec3');
      const up = attribute('windUp', 'vec3');
      const data = attribute('windData', 'vec4');
      const variant = attribute('windVariant', 'float');
      const size = data.x
        .mul(shared.popScale(data.y, data.z))
        .mul(shared.nearFade(base, base.add(up.mul(data.x.mul(card.height))), data.x.mul(1.2)))
        .mul(shared.foreignNear(data.w, base));
      // Spitzenwerk (z = 1) je Baum: jeder vierte Baum steht kahl (Ebene 29: der zweite Baum)
      const tuft = step(0.75, positionGeometry.z);
      const keep = float(1).sub(tuft.mul(float(1).sub(step(0.25, variant))));
      const spread = float(0.85).add(fract(variant.mul(7.31)).mul(0.3));
      const billboard = (toward: Vec3Node): Vec3Node => {
        const right = normalize(cross(up, toward));
        // Leeseite = Ebene +x (Wind vom Land zum Meer): die Karte spiegelt sich, wenn die Blickrichtung wechselt
        const lee = step(0, right.x).mul(2).sub(1);
        const gx = positionGeometry.x.mul(spread).mul(keep);
        const gy = positionGeometry.y.mul(keep);
        return base.add(right.mul(gx.mul(size).mul(lee))).add(up.mul(gy.mul(size)));
      };
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      const branchCol = lookup.pal(3, data.w).rgb as unknown as Vec3Node;
      const tuftCol = lookup.pal(4, data.w).rgb as unknown as Vec3Node;
      material.colorNode = fogOf(data.w, base, 'vWindFogDist')(mix(branchCol, tuftCol, tuft) as unknown as Vec3Node);
      material.positionNode = warp(billboard(normalize(shared.camLocal.sub(base))));
      const mesh = new InstancedMesh(geometry, material, n);
      mesh.name = 'planet-wind';
      // Kein Schlagschatten: Ebene 29 steht im Gegenlicht, die Landzunge ist eine ruhige, dunkle Fläche; das feine
      // Astwerk würde bei tiefer Sonne als meterlanges Netz über sie laufen
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.visible = false;
      this.wind = mesh;
      this.windCard = { height: card.height, capacity: n };
      this.geometries.push(geometry);
      this.materials.push(material);
    }

    // --- Punkte ---------------------------------------------------------------------------------------------
    {
      const geometry = new InstancedBufferGeometry();
      const hex = createHexagon();
      geometry.setAttribute('position', hex.position);
      geometry.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
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

      const rel = attribute('dotRel', 'vec3');
      const base = attribute('dotBase', 'vec3');
      const nrm = attribute('dotNormal', 'vec3');
      const dd = attribute('dotData', 'vec4'); // Größe, Rang, Zufall, Slot
      const rowKind = attribute('dotRow', 'float');
      const row = floor(rowKind.add(0.01));
      // Art im Achtel, darüber ein Viertel-Achtel: nimmt Schlagschatten an (Rundung liefert weiter die Art)
      const kf = fract(rowKind).mul(8.0);
      const kind = floor(kf.add(0.1));
      const castBit = step(0.125, kf.sub(kind));
      const hullAttr = attribute('dotHull', 'vec4');
      const toCam = shared.camLocal.sub(hullAttr.xyz);
      const nearDots = smoothstep(shared.nearClear, shared.nearClear.add(1.6), toCam.length().sub(hullAttr.w.mul(1.2))).mul(shared.footFade(base));
      const slotFade = (this.dotFade as unknown as { element(i: unknown): FloatNode }).element(int(dd.w));
      const s = shared.popScale(dd.y, dd.w).mul(nearDots).mul(shared.foreignNear(row, base));
      const center = warp(base.add(rel.mul(s)));
      const viewC = modelViewMatrix.mul(vec4(center, 1));
      // Licht der Kronen-Schattierungsnormale: Punkte skalieren weich aus 0 (gleiche Schwelle wie die Tüpfel der Krone)
      const ndl = nrm.dot(shared.sunDirLocal);
      const term = select(kind.lessThan(0.5), float(0.32), select(kind.lessThan(1.5), float(TREE_FORMS.jewel.terminator), select(kind.lessThan(2.5), float(0.1), float(0.3))));
      const light = smoothstep(term.add(0.02), term.add(0.5), ndl);
      const facingCam = abs(nrm.dot(normalize(shared.camLocal.sub(center))));
      const rim = smoothstep(0.66, 0.3, facingCam);
      const isRim = kind.greaterThan(2.5).and(kind.lessThan(3.5));
      const isLace = kind.greaterThan(3.5).and(kind.lessThan(4.5));
      const isStar = kind.greaterThan(4.5).and(kind.lessThan(5.5));
      const isScallop = kind.greaterThan(5.5);
      const isPine = kind.greaterThan(1.5).and(kind.lessThan(2.5));
      const isJewel = kind.greaterThan(0.5).and(kind.lessThan(1.5));
      // Schlagschatten wie die Krone darunter: je Teilkuppel ganz (untere Kränze) oder gar nicht (Schultern, Scheitel)
      const castW = select(isPine.or(isStar).or(isLace), float(1), select(isJewel, float(0), castBit));
      // Glatter Schattenwert am Punktmittelpunkt (Vertex-Stufe, weich über ≈ 1–2 Punktdurchmesser): im Schlagschatten
      // skalieren die Punkte stetig aus 0, statt je Fragment Tinte zu werden (kein Verschwinden und Wiederauftauchen,
      // wenn eine Schattenkante beim Drehen über die Krone wandert)
      const shadowAt = shared.shadowFactor;
      const sunAt = shadowAt ? shadowAt(modelWorldMatrix.mul(vec4(center, 1)).xyz as unknown as Vec3Node, { softness: DOT_SHADOW_SOFTNESS }) : float(1);
      const inSun = smoothstep(0.15, 0.85, mix(float(1), sunAt, castW));
      // Sternnadeln immer; Spitze, Bögen und Kiefernschnee auch im Schatten (kleiner); Kronenpunkte skalieren aus 0.
      // (Der Schattenwert steht außerhalb aller `select`-Zweige: je Zweig würde TSL seine Abtastung erneut erzeugen.)
      const growLight = select(
        isStar,
        float(1),
        select(isLace, float(0.72).add(light.mul(0.28)), select(isPine, float(0.6).add(light.mul(0.4)), select(isRim, light.mul(rim), select(isScallop, float(0.55).add(light.mul(0.45)), light)))),
      );
      const shrink = select(isStar, float(0.3), select(isLace, float(0.4), select(isPine.or(isScallop), float(0.45), float(1))));
      const grow = growLight.mul(float(1).sub(shrink.mul(float(1).sub(inSun))));
      const depth = viewC.z.negate().max(0.05);
      const pxPerUnit = shared.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
      const sizeW = dd.x.mul(s).mul(grow).mul(slotFade);
      const px = sizeW.mul(pxPerUnit);
      // Bildschirmgröße gedeckelt (≈ 4.5 px bei 900 px Höhe; Nadeln 14 px): nahe Punkte bleiben fein wie Earles
      // Pinselpunkte; ferne Punkte höchstens auf ≈ 1 px angehoben (nie mehr als das Dreifache → kein Aufblitzen)
      const maxPx = screenSize.y.mul(select(isStar, float(14 / 900), float(4.5 / 900)));
      const sizeEff = clamp(sizeW, float(1.1).div(pxPerUnit).min(sizeW.mul(3.0)), maxPx.div(pxPerUnit));
      // Weicher Kollaps unter collapsePx (kein hartes Ein/Aus)
      const collapse = smoothstep(shared.collapsePx.mul(0.45), shared.collapsePx.mul(1.25), px);
      // Nadeln (Sternbüschel): Billboard entlang der projizierten Nadelrichtung gestreckt, ≥ 0.7 px breit
      const dirV = modelViewMatrix.mul(vec4(nrm, 0)).xy;
      const dirN = dirV.div(dirV.length().max(1e-4));
      const halfLen = sizeEff.mul(collapse);
      const halfW = max(halfLen.mul(0.1), float(0.7).div(pxPerUnit)).mul(collapse);
      const needle = vec3(dirN.mul(positionGeometry.x.mul(halfLen)).add(vec2(dirN.y.negate(), dirN.x).mul(positionGeometry.y.mul(halfW))), 0);
      const disc = vec3(positionGeometry.x, positionGeometry.y, 0).mul(sizeEff.mul(collapse));
      // mix statt select: beide Formen hängen am Schattenwert (ein `select` erzeugte dessen Abtastung je Zweig neu)
      const viewPos = viewC.xyz.add(mix(disc, needle, select(isStar, float(1), float(0))));
      // Farbe: Stufen 3..5 gerastert nach Licht + Zufall (Punkt für Punkt ein getüpfelter Verlauf wie bei Earle)
      const vLight = varying(light, 'vTreeDotLight');
      const vKind = varying(kind, 'vTreeDotKind');
      const jitter = varying(dd.z, 'vTreeDotJitter');
      const crownIdx = float(3).add(clamp(floor(vLight.mul(1.6).add(jitter.mul(0.9))), 0, 2));
      // Spitzenschleier (Bild 02): feine dunkle Punkte vor dem hellen Grund — Sonnenseite in der Schattenpunktfarbe, sonst Tinte
      const laceIdx = select(vLight.greaterThan(jitter.mul(0.7).add(0.2)), float(3), float(0));
      const starIdx = select(jitter.greaterThan(0.2), float(7), float(5));
      const pineIdx = select(vLight.greaterThan(jitter.mul(0.8).add(0.1)), float(5), float(4));
      // Bögen: hell auf der Lichtseite, in der Schattenpunktfarbe auf der Schattenseite (Ebene 1/32)
      const scallopIdx = select(vLight.greaterThan(0.3), select(jitter.greaterThan(0.45), float(5), float(4)), float(3));
      const idx = select(
        vKind.lessThan(1.5),
        crownIdx,
        select(vKind.lessThan(2.5), pineIdx, select(vKind.lessThan(3.5), float(5), select(vKind.lessThan(4.5), laceIdx, select(vKind.lessThan(5.5), starIdx, scallopIdx)))),
      );
      // Im Schlagschatten: Kronenpunkte, Spitze und Nadeln werden Tinte (wie die Krone darunter), Kiefernschnee und
      // Bögen nehmen die Schattenpunktfarbe
      const shadowIdx = select(vKind.greaterThan(1.5).and(vKind.lessThan(2.5)).or(vKind.greaterThan(5.5)), float(3), float(0));
      // Mit dem glatten Schattenwert färbt er den ganzen Punkt auf einmal (Kronen- und Randpunkte behalten ihre Lichtfarbe,
      // sie schrumpfen); ohne ihn wie bisher je Fragment aus der Schattenkarte
      const keepsColour = select(kind.lessThan(1.5).or(isRim), float(1), float(0));
      const shade = shadowAt ? varying(mix(inSun, float(1), keepsColour), 'vTreeDotShade') : null;
      const material = new DotMaterial({
        lookup,
        fog,
        castWeight: shadowAt ? null : varying(castW, 'vTreeDotCastW'),
        shade,
        fogDistNode: shared.fogDist(row, varying(depth, 'vTreeDotDist')),
        fogFn: fogOf(row, base, 'vTreeDotFogDist'),
        litColor: lookup.pal(idx, row).rgb as unknown as Vec3Node,
        shadowColor: lookup.pal(shadowIdx, row).rgb as unknown as Vec3Node,
      });
      // Position im Planetenraum aus dem Billboard (View → Welt → Objekt): Schatten, Nebel und Tiefe stimmen je Fragment
      material.positionNode = modelWorldMatrixInverse.mul(cameraWorldMatrix.mul(vec4(viewPos, 1))).xyz;
      material.normalNode = normalize(modelViewMatrix.mul(vec4(nrm, 0)).xyz);
      const mesh = new Mesh(geometry, material);
      mesh.name = 'planet-dots';
      mesh.castShadow = false;
      // Der glatte Schattenwert der Vertex-Stufe ersetzt die Schattenkarte je Fragment (spart deren Taps)
      mesh.receiveShadow = !shadowAt;
      mesh.frustumCulled = false;
      this.dots = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
    }
  }

  /** Plätze der fein aufgelösten Kuppel (Hoch 160, Mobil 80); darüber nehmen große Kuppeln die normale Geometrie. */
  private get hiCapacity(): number {
    return Math.min(this.options.capacity.trees, this.options.dotsPerTree[0] >= 50 ? 160 : 80);
  }

  private trunkCapacity(kind: TrunkKind): number {
    return kind === 'oak' ? 24 : kind === 'pillar' ? 48 : kind === 'fan' || kind === 'parasol' ? Math.max(16, Math.round(this.options.capacity.trees * 0.3)) : this.options.capacity.trees;
  }

  private attachTreeAttributes(geometry: BufferGeometry, n: number): void {
    geometry.setAttribute('treeA', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('treeB', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('treeC', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geometry.setAttribute('treeD', new InstancedBufferAttribute(new Float32Array(n * 4), 4));
  }

  private family(t: PlanetTree): TreeFamily | undefined {
    return this.options.family(t.world);
  }

  private rows(t: PlanetTree): TreeWorldRows {
    const r = this.options.slots.rowsOfWorld(t.world);
    return { terrain: r.terrain, canopy: r.canopyRows, accent: r.accent };
  }

  /** Ein Welt-Slot wurde neu belegt: Schnee, Terrainzeile, Tüpfel, Blüten und Extras der Welt in die Tabellen. */
  onSlotAssigned(slot: number, world: number): void {
    const f = this.options.family(world);
    const x: TreeFamilyExtras = (f as (TreeFamily & TreeFamilyExtras) | undefined) ?? {};
    const rows = this.options.slots.rowsOf(slot);
    this.worldSnow.array[slot] = f?.snow ?? 0;
    this.worldTerrain.array[slot] = rows.terrain;
    this.worldStipple.array[slot] = f?.stipple ?? 0.75;
    this.worldFlowers.array[slot] = f?.flowers ?? (f?.motif === 'cross' || f?.motif === 'diamond' ? 0.35 : 0);
    this.worldCell.array[slot] = x.stippleCell ?? 0.11;
    this.worldGlow.array[slot] = x.shadeGlow ?? 0.12;
    this.worldVeins.array[slot] = x.crownVeins ?? 0;
    this.worldLiftVar.array[slot] = x.crownLiftVariance ?? 0;
  }

  /** Kronenzeile eines Baums (Juwelenwald: Farbvarianten; `kindRows`: feste Zeile je Art). */
  canopyRow(t: PlanetTree): number {
    const rows = this.rows(t);
    const fixed = this.kindRowIndex(t, rows.canopy.length);
    if (fixed >= 0) return rows.canopy[fixed] ?? rows.canopy[0] ?? 0;
    const variants = Math.max(1, Math.min(rows.canopy.length, this.family(t)?.rowVariants ?? 1));
    return rows.canopy[Math.min(variants - 1, Math.floor(t.variant * variants))] ?? rows.canopy[0] ?? 0;
  }

  /** Index der Kronenzeile aus `kindRows` der Welt (−1 = keine Vorgabe für die Art). */
  private kindRowIndex(t: PlanetTree, count: number): number {
    const fam = this.family(t) as (TreeFamily & TreeFamilyExtras) | undefined;
    const k = fam?.kindRows?.[t.kind];
    if (k === undefined) return -1;
    // Flecken: je Zelle derselbe Zufallswert (mit leicht verrauschter Zellgrenze), sonst je Baum
    const patch = fam?.kindRowPatch;
    const r = patch ? treeHash([Math.floor((t.position[0] + 0.6 * Math.sin(t.position[2] * 0.7)) / patch), 0, Math.floor((t.position[2] + 0.6 * Math.sin(t.position[0] * 0.7)) / patch)], 17) : t.variant;
    const i = Array.isArray(k) ? (k[Math.min(k.length - 1, Math.floor(r * k.length))] ?? 0) : k;
    return Math.max(0, Math.min(count - 1, Math.round(i)));
  }

  /**
   * Zeilen der Kronenpunkte oben, in der Mitte und unten: in Welten mit Farbvarianten (Juwelenwald, Bild 02) tragen die
   * Punkte der oberen Teilkuppeln die Nachbarfamilie auf der einen, die der unteren die auf der anderen Seite — eine
   * Kuppel wird ein getüpfelter Verlauf aus mehreren Juwelenfarben (rot → violett → blau, Türkis-Akzente).
   */
  private dotRows(t: PlanetTree): [number, number, number] {
    const rows = this.rows(t);
    const own = this.canopyRow(t);
    if (this.kindRowIndex(t, rows.canopy.length) >= 0) return [own, own, own];
    const n = Math.max(1, Math.min(rows.canopy.length, this.family(t)?.rowVariants ?? 1));
    if (n < 2) return [own, own, own];
    const i = Math.min(n - 1, Math.floor(t.variant * n));
    return [rows.canopy[(i + n - 1) % n] ?? own, own, rows.canopy[(i + 1) % n] ?? own];
  }

  private aspect(t: PlanetTree): number {
    return this.family(t)?.aspect ?? 1;
  }

  private barkStyle(t: PlanetTree): number {
    const f = this.family(t);
    const name = f?.bark ?? f?.trunkStyle ?? 'ink';
    return BARK_STYLE[name] ?? 0;
  }

  /** Breitenfaktor der Welt für schlanke bzw. volle Schäfte (Familie, Standard 0.04). */
  private widthFactor(t: PlanetTree, form: KindForm): number {
    const w = (this.family(t)?.trunkWidth ?? 0.04) / 0.04;
    // Schlanke Formen (Dicke < 0.5) dürfen per Welt breit werden (Juwelenwald: breite gestreifte Schäfte)
    return Math.min(form.thick < 0.5 ? 3 : 2.2, Math.max(0.6, w));
  }

  /** Stammdicke je Instanz: Familie (Anteil am Kronenradius, Standard 0.04) relativ zum Archetyp. */
  private thickness(t: PlanetTree, form: KindForm): number {
    // Eiche, Fächer, Riesenstamm und Schirmbaum haben eigene Proportionen (die Dicke streckt waagrecht und würde die Äste aus der Krone schieben)
    if (form.trunk === 'oak' || form.trunk === 'fan' || form.trunk === 'pillar' || form.trunk === 'parasol') return 1;
    return form.thick * this.widthFactor(t, form);
  }

  /** Terminator der Krone: Form, für Kuppelkappen (Schirm, Spitze) je Welt überschreibbar (`capTerminator`). */
  private terminator(t: PlanetTree, form: KindForm): number {
    const cap = (this.family(t) as (TreeFamily & TreeFamilyExtras) | undefined)?.capTerminator;
    return cap !== undefined && (t.kind === 'lace' || t.kind === 'umbrella') ? cap : form.terminator;
  }

  /** Kronen-Mesh eines Baums: große Kuppeln (Fokus, Solitäre) nehmen die feine Geometrie. */
  private crownMeshOf(t: PlanetTree, form: KindForm): CrownKind {
    if (form.crown !== 'dome') return form.crown ?? 'dome';
    return t.canopyRadius * form.crownS[0] >= DOME_HI_RADIUS ? 'domeHi' : 'dome';
  }

  /** Anker der Instanzpositionen (Ebene): Positionen werden relativ dazu gespeichert (kleine Zahlen, ADR 0002). */
  private ox = 0;
  private oz = 0;

  /** Instanzmatrix der Krone (relativ zum Anker). */
  crownMatrix(t: PlanetTree, form: KindForm, q: Quaternion, out: Matrix4): Matrix4 {
    const r = t.canopyRadius;
    const asp = this.aspect(t);
    _v.set(0, form.crownY * r * (form.crown === 'pine' ? 1 : asp), 0).applyQuaternion(q);
    _p.set(t.position[0] - this.ox, t.position[1], t.position[2] - this.oz).add(_v);
    _s.set(form.crownS[0] * r, form.crownS[1] * r * asp, form.crownS[0] * r);
    return out.compose(_p, q, _s);
  }

  /** Archetyp-Maßstab H des Stamms (Welteinheiten). */
  private trunkScale(t: PlanetTree, form: KindForm): number {
    return form.trunkH * t.canopyRadius * (form.crown === 'pine' ? 1 : Math.min(1.3, this.aspect(t)));
  }

  /** Instanzmatrix des Stamms (Maßstab H, waagrecht mit der Dicke gestreckt). */
  trunkMatrix(t: PlanetTree, form: KindForm, q: Quaternion, out: Matrix4): Matrix4 {
    const H = this.trunkScale(t, form);
    const k = this.thickness(t, form);
    _p.set(t.position[0] - this.ox, t.position[1], t.position[2] - this.oz);
    out.compose(_p, q, _s.set(H * k, H, H * k));
    _s.setScalar(H);
    return out;
  }

  /** Schreibt alle Instanzpuffer der Bäume neu (bei Wechsel der geladenen/nahen Chunks); Positionen relativ zu `origin`. */
  setContent(entries: TreeEntry[], origin: { x: number; z: number } = { x: 0, z: 0 }): void {
    this.ox = origin.x;
    this.oz = origin.z;
    const ox = origin.x;
    const oz = origin.z;
    const cap = this.options.capacity.trees;
    const perCrown = new Map<CrownKind, TreeEntry[]>(CROWN_KINDS.map((k) => [k, []]));
    const perTrunk = new Map<TrunkKind, TreeEntry[]>(TRUNK_KINDS.map((k) => [k, []]));
    const bareList: TreeEntry[] = [];
    const windList: TreeEntry[] = [];
    let hMax = 2;
    for (const e of entries) {
      if (e.tree.kind === 'bare') {
        bareList.push(e);
        hMax = Math.max(hMax, TREE_PROPORTIONS.bare.top * e.tree.canopyRadius);
        continue;
      }
      if (e.tree.kind === 'wind') {
        windList.push(e);
        hMax = Math.max(hMax, this.windCard.height * e.tree.canopyRadius);
        continue;
      }
      const form = TREE_FORMS[e.tree.kind];
      if (form.crown) perCrown.get(this.crownMeshOf(e.tree, form))!.push(e);
      if (form.trunk) perTrunk.get(form.trunk)!.push(e);
      hMax = Math.max(hMax, TREE_PROPORTIONS[e.tree.kind].top * e.tree.canopyRadius * Math.max(1, this.aspect(e.tree)));
    }
    // Feine Kuppeln: nahe Chunks zuerst; was nicht mehr hineinpasst, nimmt die normale Kuppel (nie verschwinden —
    // der Juwelenwald hat viele große Kuppeln)
    const hiList = perCrown.get('domeHi')!;
    if (hiList.length > this.hiCapacity) {
      hiList.sort((x, y) => Number(y.withDots) - Number(x.withDots));
      perCrown.get('dome')!.push(...hiList.splice(this.hiCapacity));
    }
    const q = new Quaternion();
    for (const kind of CROWN_KINDS) {
      const mesh = this.crowns[kind];
      const list = perCrown.get(kind)!.slice(0, kind === 'domeHi' ? this.hiCapacity : cap);
      const g = mesh.geometry;
      const a = g.getAttribute('treeA') as InstancedBufferAttribute;
      const b = g.getAttribute('treeB') as InstancedBufferAttribute;
      const c = g.getAttribute('treeC') as InstancedBufferAttribute;
      const d = g.getAttribute('treeD') as InstancedBufferAttribute;
      let shadowHeight = 0;
      list.forEach((e, i) => {
        const t = e.tree;
        const form = TREE_FORMS[t.kind as Exclude<TreeKind, CardKind>];
        treeQuaternion(t, q);
        this.crownMatrix(t, form, q, _m);
        mesh.setMatrixAt(i, _m);
        const r = t.canopyRadius;
        const asp = form.crown === 'pine' ? 1 : this.aspect(t);
        _v.set(0, form.crownY * r * asp, 0).applyQuaternion(q);
        a.setXYZW(i, t.position[0] - ox, t.position[1], t.position[2] - oz, t.rank);
        b.setXYZW(i, t.position[0] - ox + _v.x, t.position[1] + _v.y, t.position[2] - oz + _v.z, e.slot);
        c.setXYZW(i, this.canopyRow(t), this.rows(t).accent, this.barkStyle(t), t.variant);
        d.setXYZW(i, form.crownS[0] * r, form.crownS[1] * r * asp, r * Math.max(1, form.crownS[1] * asp), this.terminator(t, form));
        // Höchster Punkt, an dem die Krone Schlagschatten zeigt: Kiefern ganz (Tintenkörper), Kuppeln und Säulen bis
        // knapp über die Mitte (die obere Kuppel bleibt hell, siehe castWeight)
        const top = form.crown === 'pine' ? (form.crownY + form.crownS[1]) * r : (form.crownY + 0.5 * form.crownS[1]) * r * asp;
        shadowHeight = Math.max(shadowHeight, top);
      });
      for (const attr of [a, b, c, d, mesh.instanceMatrix]) commit(attr, list.length);
      mesh.count = list.length;
      // Schatten v3: verteilte Empfänger über dem Boden → die gröbste Kaskade deckt auch Boden + diese Höhe ab (Kronen
      // am sonnenabgewandten Bildrand behalten ihre Schlagschatten, die Punkte dort ihren Schattenwert)
      mesh.userData.shadowHeight = shadowHeight;
    }
    for (const kind of TRUNK_KINDS) {
      const mesh = this.trunks[kind];
      const list = perTrunk.get(kind)!.slice(0, this.trunkCapacity(kind));
      const g = mesh.geometry;
      const a = g.getAttribute('treeA') as InstancedBufferAttribute;
      const b = g.getAttribute('treeB') as InstancedBufferAttribute;
      const c = g.getAttribute('treeC') as InstancedBufferAttribute;
      const d = g.getAttribute('treeD') as InstancedBufferAttribute;
      list.forEach((e, i) => {
        const t = e.tree;
        const form = TREE_FORMS[t.kind as Exclude<TreeKind, CardKind>];
        treeQuaternion(t, q);
        this.trunkMatrix(t, form, q, _m);
        mesh.setMatrixAt(i, _m);
        const H = _s.x;
        // Spitze der Achse: Gabel mit gestrecktem Schaft (der Shader liest die Streckung aus dieser Länge zurück)
        const S = stemStretch(form, H, t.canopyRadius);
        const top = kind === 'oak' ? this.oak.top : kind === 'fan' ? this.fan.top : kind === 'pillar' ? PILLAR_TOP : kind === 'parasol' ? this.parasolTrunk.top : FORK_TOP + (S - 1) * FORK_Y;
        _v.set(0, top * H, 0).applyQuaternion(q);
        a.setXYZW(i, t.position[0] - ox, t.position[1], t.position[2] - oz, t.rank);
        b.setXYZW(i, t.position[0] - ox + _v.x, t.position[1] + _v.y, t.position[2] - oz + _v.z, e.slot);
        c.setXYZW(i, this.canopyRow(t), this.rows(t).accent, this.barkStyle(t), t.variant);
        const keep = form.thick < 0.5 ? 0.35 : 1;
        // .y: Gabel = Stauchung des Astnetzes (breite Schäfte, schmales Netz), Fächer = Schleier an (Spitzenbaum)
        const y = kind === 'fork' ? 1 / this.widthFactor(t, form) : kind === 'fan' ? (form.dots === 'lace' ? 1 : 0) : 1;
        // Riesenstamm: wie seine Krone (Stamm und Krone treten gemeinsam aus dem Bild)
        const fadeR = kind === 'oak' ? this.oak.spread * H : kind === 'fan' ? this.fan.spread * H : kind === 'pillar' ? t.canopyRadius : kind === 'parasol' ? this.parasolTrunk.spread * H : Math.max(0.3, t.canopyRadius * 0.4);
        // Welt-Slot (Tabellen) + halber Anlauf-Anteil
        d.setXYZW(i, H, y, fadeR, this.options.slots.slotOf(t.world) + (1 - keep) * 0.5);
        if (kind === 'oak') hMax = Math.max(hMax, this.oak.top * H);
      });
      for (const attr of [a, b, c, d, mesh.instanceMatrix]) commit(attr, list.length);
      mesh.count = list.length;
    }
    {
      const list = bareList.slice(0, cap);
      const geo = this.bare.geometry;
      const b = geo.getAttribute('bareBase') as InstancedBufferAttribute;
      const u = geo.getAttribute('bareUp') as InstancedBufferAttribute;
      const dat = geo.getAttribute('bareData') as InstancedBufferAttribute;
      const va = geo.getAttribute('bareVariant') as InstancedBufferAttribute;
      list.forEach((e, i) => {
        const t = e.tree;
        treeQuaternion(t, q, false);
        _up.set(0, 1, 0).applyQuaternion(q);
        b.setXYZ(i, t.position[0] - ox, t.position[1], t.position[2] - oz);
        u.setXYZ(i, _up.x, _up.y, _up.z);
        dat.setXYZW(i, t.canopyRadius, t.rank, e.slot, this.rows(t).accent);
        va.setX(i, t.variant);
        _m.identity();
        this.bare.setMatrixAt(i, _m);
      });
      for (const a of [b, u, dat, va, this.bare.instanceMatrix]) commit(a, list.length);
      this.bare.count = list.length;
    }
    {
      const list = windList.slice(0, this.windCard.capacity);
      const geo = this.wind.geometry;
      const b = geo.getAttribute('windBase') as InstancedBufferAttribute;
      const u = geo.getAttribute('windUp') as InstancedBufferAttribute;
      const dat = geo.getAttribute('windData') as InstancedBufferAttribute;
      const va = geo.getAttribute('windVariant') as InstancedBufferAttribute;
      list.forEach((e, i) => {
        const t = e.tree;
        treeQuaternion(t, q, false);
        _up.set(0, 1, 0).applyQuaternion(q);
        b.setXYZ(i, t.position[0] - ox, t.position[1], t.position[2] - oz);
        u.setXYZ(i, _up.x, _up.y, _up.z);
        dat.setXYZW(i, t.canopyRadius, t.rank, e.slot, this.canopyRow(t));
        va.setX(i, t.variant);
        _m.identity();
        this.wind.setMatrixAt(i, _m);
      });
      for (const a of [b, u, dat, va, this.wind.instanceMatrix]) commit(a, list.length);
      this.wind.count = list.length;
      // ohne Windbäume kein Aufruf (die meisten Welten)
      this.wind.visible = list.length > 0;
    }
    this.hMax = hMax;
    this.updateDotBlocks(entries);
  }

  /** Blockursprung (Ebene) eines Chunks: Punkte werden relativ dazu gebaut, beim Schreiben auf den Pool-Anker versetzt. */
  private blockOrigin(list: TreeEntry[]): [number, number] {
    const t = list[0]!.tree;
    return [Math.round(t.position[0]), Math.round(t.position[2])];
  }

  // --- Punkte ------------------------------------------------------------------------------------------

  /**
   * Punkte je Chunk: Kapazität geteilt durch die Zahl der nahen Chunks (Hoch 5, Mobil 3 — wie Lab und Flow sie setzen).
   * Die Verteilung auf die Bäume hängt nur vom Inhalt des Chunks ab (nie von anderen Chunks oder der Sonne) → beim
   * Laden und Entladen der Nachbarn ändert sich an einem Baum nichts.
   */
  private get dotsPerChunk(): number {
    const hi = this.options.dotsPerTree[0] >= 50;
    // Nahe Chunks (Hoch 5, Mobil 3) plus zwei, die gerade ausblenden
    const near = (hi ? 5 : 3) + 2;
    // Funkeln, keine Konfetti: die Textur der Kronen tragen die Tüpfel im Material, die Instanzen setzen die Lichter
    return Math.min(hi ? 4200 : 1600, Math.floor(this.options.capacity.dots / near));
  }

  /** Gewicht eines Baums an den Kronenpunkten seines Chunks (Kronenfläche × Welt-Faktor). */
  private dotWeight(t: PlanetTree): number {
    if (isCardKind(t.kind)) return 0;
    const form = TREE_FORMS[t.kind];
    if (form.dots === 'none' || form.dots === 'stars' || !form.crown) return 0;
    const r = t.canopyRadius;
    const k = this.family(t)?.dots ?? 1;
    // Tannen sind schmal, aber hoch (Silhouette ≈ 3.6 r²): der Tannenwald ist aus Punkten gemacht (Bild 05)
    return r * r * (form.dots === 'lace' ? 0.5 : form.dots === 'pine' ? 2.6 : 1) * k;
  }

  private blockKey(slot: number, list: TreeEntry[]): string {
    const t = list[0]!.tree;
    return `${slot}:${list.length}:${t.position[0].toFixed(3)},${t.position[1].toFixed(3)},${t.position[2].toFixed(3)}`;
  }

  private updateDotBlocks(entries: TreeEntry[]): void {
    const bySlot = new Map<number, { all: TreeEntry[]; dotted: boolean }>();
    for (const e of entries) {
      let s = bySlot.get(e.slot);
      if (!s) {
        s = { all: [], dotted: false };
        bySlot.set(e.slot, s);
      }
      s.all.push(e);
      if (e.withDots) s.dotted = true;
    }
    const cam = this.shared.camLocal.value;
    const next = new Map<number, DotBlock>();
    for (const [slot, s] of bySlot) {
      const key = this.blockKey(slot, s.all);
      let block = this.blocks.get(slot);
      if (block && block.key !== key) block = undefined; // Slot neu belegt → alter Chunk ist entladen (unsichtbar)
      if (!block && s.dotted) block = this.buildBlock(slot, key, s.all);
      if (!block) continue;
      block.target = s.dotted ? 1 : 0;
      let dist = Infinity;
      for (const e of s.all) dist = Math.min(dist, Math.hypot(e.tree.position[0] - this.ox - cam.x, e.tree.position[1] - cam.y, e.tree.position[2] - this.oz - cam.z));
      block.dist = dist;
      if (block.target > 0 || block.fade > 0) next.set(slot, block);
    }
    this.blocks = next;
    this.writeDots();
  }

  /**
   * Belegung des Pools: erst die einblendenden bzw. sichtbaren Chunks (nah zuerst), dann die ausblendenden. Ein Block,
   * der nicht passt, liegt nicht im Pool (`written = false`) und blendet erst ein, sobald Platz frei wird.
   */
  private allocate(): DotBlock[] {
    const cap = this.options.capacity.dots;
    const order = [...this.blocks.values()].sort((a, b) => b.target - a.target || a.dist - b.dist);
    const out: DotBlock[] = [];
    let used = 0;
    for (const b of order) {
      b.written = used + b.count <= cap;
      if (!b.written) {
        b.fade = 0; // wartet auf Platz (blendet danach von 0 ein) oder fällt weg (ausblendend, fernster zuerst)
        continue;
      }
      used += b.count;
      out.push(b);
    }
    return out;
  }

  /** Punkte je Spitzenbaum im Budget: Rosetten an den Zweigspitzen und Perlen entlang der Zweige. */
  private laceDotCount(stride: number): number {
    return Math.ceil(this.fan.tips.length / stride) * 7 + Math.ceil(this.fan.beads.length / stride);
  }

  /** Erzeugt die Punkte eines Chunks (deterministisch je Baum). */
  private buildBlock(slot: number, key: string, list: TreeEntry[]): DotBlock {
    const rel: number[] = [];
    const base: number[] = [];
    const nrm: number[] = [];
    const data: number[] = [];
    const row: number[] = [];
    const hull: number[] = [];
    const q = new Quaternion();
    // Blockpositionen relativ zum Blockursprung (Kronen-/Stamm-Matrizen rechnen relativ zum Pool-Anker → zurückversetzen)
    const [bx, bz] = this.blockOrigin(list);
    const dx = this.ox - bx;
    const dz = this.oz - bz;
    // Budget des Chunks: feste Punkte (Spitzenschleier, Sternnadeln) zuerst, der Rest nach Kronenfläche
    const hi = this.options.dotsPerTree[0] >= 50;
    let fixed = 0;
    let weightSum = 0;
    for (const e of list) {
      const t = e.tree;
      if (isCardKind(t.kind)) continue;
      const d = TREE_FORMS[t.kind].dots;
      if (d === 'lace') fixed += this.laceDotCount(hi ? 1 : 2);
      if (d === 'stars') fixed += this.oak.tips.length * (hi ? 9 : 3);
      weightSum += this.dotWeight(t);
    }
    // Spitze und Sternnadeln bekommen höchstens 70 % des Chunk-Anteils (sonst dünner: jede k-te Rosette bzw. Nadel)
    const fixedStride = Math.max(1, Math.ceil(fixed / Math.max(1, 0.7 * this.dotsPerChunk)));
    fixed = Math.ceil(fixed / fixedStride);
    const perWeight = weightSum > 0 ? Math.max(0, this.dotsPerChunk - fixed) / weightSum : 0;
    const maxPerTree = this.options.dotsPerTree[1];
    for (const e of list) {
      const t = e.tree;
      if (isCardKind(t.kind)) continue;
      const form = TREE_FORMS[t.kind];
      if (form.dots === 'none') continue;
      const rowIdx = this.canopyRow(t);
      const [rowTop, , rowLow] = this.dotRows(t);
      treeQuaternion(t, q);
      const rand = mulberryFrom(treeHash(t.position, 9));
      const r = t.canopyRadius;
      // px…/hx… kommen relativ zum Pool-Anker (Matrizen), der Fuß ebenso
      const footX = t.position[0] - this.ox;
      const footZ = t.position[2] - this.oz;
      const push = (px: number, py: number, pz: number, nx: number, ny: number, nz: number, size: number, kind: number, cast: number, hx: number, hy: number, hz: number, fadeR: number, lift = 0.6, dotRow = rowIdx) => {
        const off = size * lift;
        rel.push(px + nx * off - footX, py + ny * off - t.position[1], pz + nz * off - footZ);
        base.push(t.position[0] - bx, t.position[1], t.position[2] - bz);
        nrm.push(nx, ny, nz);
        data.push(size, t.rank, rand(), slot);
        row.push(dotRow + (kind + (cast > 0.5 ? 0.25 : 0)) * 0.125);
        hull.push(hx + dx, hy, hz + dz, fadeR);
      };
      /** Zeile eines Kronenpunkts nach seiner Höhe in der Krone (Probe im Objektraum, −1 unten … 1 oben). */
      const rowAt = (yObj: number, h: number): number => (yObj > 0.3 + 0.25 * h ? rowTop : yObj < -0.2 - 0.25 * h ? rowLow : rowIdx);
      if (form.dots === 'stars') {
        // Sternnadeln der Eiche (Bild 04): goldene Büschel aus feinen Nadeln (gestreckte Punkte), strahlig im Raum
        this.trunkMatrix(t, form, q, _m);
        const H = _s.x;
        _v.set(0, this.oak.top * 0.6 * H, 0).applyQuaternion(q);
        const hx = footX + _v.x;
        const hy = t.position[1] + _v.y;
        const hz = footZ + _v.z;
        const step = (hi ? 1 : 2) * fixedStride;
        const needles = hi ? 9 : 6;
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < this.oak.tips.length; i += step) {
          const tip = this.oak.tips[i]!;
          _p.set(tip.p[0], tip.p[1], tip.p[2]).applyMatrix4(_m);
          const len = (0.045 + 0.03 * rand()) * H;
          const phase = rand() * Math.PI * 2;
          for (let k = 0; k < needles; k++) {
            // Fibonacci-Richtungen auf der Kugel, je Büschel gedreht
            const yy = 1 - (2 * (k + 0.5)) / needles;
            const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
            const ph = k * golden + phase;
            _n.set(rr * Math.cos(ph), yy, rr * Math.sin(ph)).applyQuaternion(q).normalize();
            const l = len * (0.75 + 0.5 * rand());
            push(_p.x + _n.x * l * 0.5, _p.y + _n.y * l * 0.5, _p.z + _n.z * l * 0.5, _n.x, _n.y, _n.z, l * 0.5, DOT_KIND.star, 1, hx, hy, hz, this.oak.spread * H, 0);
          }
        }
        continue;
      }
      if (!form.crown) continue;
      this.crownMatrix(t, form, q, _m);
      _nm.getNormalMatrix(_m);
      const hx = _m.elements[12]!;
      const hy = _m.elements[13]!;
      const hz = _m.elements[14]!;
      const fadeR = r * Math.max(1, form.crownS[1] * this.aspect(t));
      const sizeBase = this.dotRadius * Math.min(1.1, Math.max(0.4, r)) * (form.dotSize ?? 1);
      if (form.dots === 'lace') {
        // Spitzenschleier am Skelett (Bild 02, Ebene 19): Rosetten an den Zweigspitzen, Perlen entlang der hängenden
        // Zweige — jeder Punkt sitzt auf dem Astwerk des Fächer-Archetyps (dieselbe Matrix wie der Stamm)
        const tm = this.trunkMatrix(t, form, q, new Matrix4());
        const H = _s.x;
        const tnm = new Matrix3().getNormalMatrix(tm);
        const stride = (hi ? 1 : 2) * fixedStride;
        _v.set(0, LACE_ENVELOPE.cy * H, 0).applyQuaternion(q);
        const lx = footX + _v.x;
        const ly = t.position[1] + _v.y;
        const lz = footZ + _v.z;
        const s0 = sizeBase * 0.4;
        for (let i = 0; i < this.fan.tips.length; i += stride) {
          const tip = this.fan.tips[i]!;
          _p.set(tip.p[0], tip.p[1], tip.p[2]).applyMatrix4(tm);
          _n.set(tip.n[0], tip.n[1], tip.n[2]).applyMatrix3(tnm).normalize();
          _d.set(tip.d[0], tip.d[1], tip.d[2]).transformDirection(tm);
          push(_p.x, _p.y, _p.z, _n.x, _n.y, _n.z, s0, DOT_KIND.lace, 1, lx, ly, lz, fadeR * 1.6, 0);
          // Rosette: sechs kleinere Punkte in der Schalenebene rund um die Spitze (Ebene 19: runde Punktbüschel)
          _axis.crossVectors(_n, _d).normalize();
          const ring = s0 * 3.4 * Math.sqrt(stride);
          const ph = rand() * Math.PI * 2;
          for (let k = 0; k < 6; k++) {
            const a = ph + (k / 6) * Math.PI * 2;
            const ca = Math.cos(a) * ring;
            const sa = Math.sin(a) * ring;
            const ox = _d.x * ca + _axis.x * sa;
            const oy = _d.y * ca + _axis.y * sa;
            const oz = _d.z * ca + _axis.z * sa;
            push(_p.x + ox, _p.y + oy, _p.z + oz, _n.x, _n.y, _n.z, s0 * 0.72, DOT_KIND.lace, 1, lx, ly, lz, fadeR * 1.6, 0);
          }
        }
        for (let i = 0; i < this.fan.beads.length; i += stride) {
          const bead = this.fan.beads[i]!;
          _p.set(bead.p[0], bead.p[1], bead.p[2]).applyMatrix4(tm);
          _n.set(bead.n[0], bead.n[1], bead.n[2]).applyMatrix3(tnm).normalize();
          push(_p.x, _p.y, _p.z, _n.x, _n.y, _n.z, s0 * 0.62, DOT_KIND.lace, 1, lx, ly, lz, fadeR * 1.6, 0);
        }
        void H;
      }
      const tpl = this.templates[form.crown];
      // Kronen, die rundum leuchten (Juwel, Kappen mit `capTerminator` < 0), tragen Juwelenpunkte (gleiche Lichtschwelle)
      const kind0 = form.dots === 'pine' ? DOT_KIND.pine : this.terminator(t, form) < 0 ? DOT_KIND.jewel : DOT_KIND.crown;
      const budget = Math.min(maxPerTree, Math.max(4, Math.round(perWeight * this.dotWeight(t))));
      // Kronenpunkte und die gepunkteten Bögen der Teilkuppeln teilen sich das Budget (Kiefern ohne Bögen)
      const rimsTotal = tpl.rims.length / 6;
      const rimCount = form.dots === 'pine' ? 0 : Math.min(rimsTotal, Math.round(budget * (form.scallopShare ?? SCALLOP_SHARE)));
      const samples = tpl.samples;
      const total = samples.length / 6;
      const count = Math.min(total, Math.max(4, budget - rimCount));
      const start = Math.floor(treeHash(t.position, 5) * total);
      // Tannenpunkte: feste Größe (die schmalen Kronen würden sie sonst unter die Pixelgrenze drücken)
      const pineSize = form.dots === 'pine' ? 0.042 / Math.max(1e-3, sizeBase) : 1;
      // Randpunkte: jeder n-te Kronenpunkt steht nur an der Silhouette zur Sonne (Buschröschen, Schirmbaum: jeder zweite)
      const rimEvery = Math.max(1, Math.round(1 / Math.max(0.05, form.rimShare ?? 0.25)));
      for (let k = 0; k < count; k++) {
        const j = (start + k) % total;
        const o = j * 6;
        _p.set(samples[o]!, samples[o + 1]!, samples[o + 2]!).applyMatrix4(_m);
        _n.set(samples[o + 3]!, samples[o + 4]!, samples[o + 5]!).applyMatrix3(_nm).normalize();
        const kind = kind0 !== DOT_KIND.pine && k % rimEvery === 0 ? DOT_KIND.rim : kind0;
        const dr = rowAt(samples[o + 1]!, rand() - 0.5);
        push(_p.x, _p.y, _p.z, _n.x, _n.y, _n.z, sizeBase * pineSize * (0.8 + 0.4 * rand()) * (kind === DOT_KIND.rim ? 1.25 : 1), kind, tpl.sampleCast[j] ?? 1, hx, hy, hz, fadeR, 0.6, dr);
      }
      const rims = tpl.rims;
      const rStart = form.scallopsInOrder ? 0 : Math.floor(treeHash(t.position, 6) * Math.max(1, rimsTotal));
      for (let k = 0; k < rimCount; k++) {
        const j = (rStart + k) % rimsTotal;
        const o = j * 6;
        _p.set(rims[o]!, rims[o + 1]!, rims[o + 2]!).applyMatrix4(_m);
        _n.set(rims[o + 3]!, rims[o + 4]!, rims[o + 5]!).applyMatrix3(_nm).normalize();
        push(_p.x, _p.y, _p.z, _n.x, _n.y, _n.z, sizeBase * (0.55 + 0.2 * rand()), DOT_KIND.scallop, tpl.rimCast[j] ?? 1, hx, hy, hz, fadeR, 0.5, rowAt(rims[o + 1]!, rand() - 0.5));
      }
    }
    const count = row.length;
    return {
      key,
      slot,
      count,
      ox: bx,
      oz: bz,
      rel: new Float32Array(rel),
      base: new Float32Array(base),
      nrm: new Float32Array(nrm),
      data: new Float32Array(data),
      row: new Float32Array(row),
      hull: new Float32Array(hull),
      dist: 0,
      fade: 0,
      target: 1,
      written: false,
    };
  }

  /** Schreibt die aktiven Punkt-Blöcke in den Pool. */
  private writeDots(): void {
    const g = this.dotsGeometry;
    const rel = g.getAttribute('dotRel') as InstancedBufferAttribute;
    const base = g.getAttribute('dotBase') as InstancedBufferAttribute;
    const nrm = g.getAttribute('dotNormal') as InstancedBufferAttribute;
    const data = g.getAttribute('dotData') as InstancedBufferAttribute;
    const row = g.getAttribute('dotRow') as InstancedBufferAttribute;
    const hull = g.getAttribute('dotHull') as InstancedBufferAttribute;
    let n = 0;
    const baseArr = base.array as Float32Array;
    const hullArr = hull.array as Float32Array;
    for (const b of this.allocate()) {
      (rel.array as Float32Array).set(b.rel, n * 3);
      (nrm.array as Float32Array).set(b.nrm, n * 3);
      (data.array as Float32Array).set(b.data, n * 4);
      (row.array as Float32Array).set(b.row, n);
      // Fuß und Hülle: Blockursprung → Pool-Anker (kleine Zahlen)
      const ddx = b.ox - this.ox;
      const ddz = b.oz - this.oz;
      for (let i = 0; i < b.count; i++) {
        baseArr[(n + i) * 3] = b.base[i * 3]! + ddx;
        baseArr[(n + i) * 3 + 1] = b.base[i * 3 + 1]!;
        baseArr[(n + i) * 3 + 2] = b.base[i * 3 + 2]! + ddz;
        hullArr[(n + i) * 4] = b.hull[i * 4]! + ddx;
        hullArr[(n + i) * 4 + 1] = b.hull[i * 4 + 1]!;
        hullArr[(n + i) * 4 + 2] = b.hull[i * 4 + 2]! + ddz;
        hullArr[(n + i) * 4 + 3] = b.hull[i * 4 + 3]!;
      }
      n += b.count;
    }
    for (const a of [rel, base, nrm, data, row, hull]) commit(a, n);
    g.instanceCount = n;
    this.syncFades();
    this.dotsDirty = false;
  }

  private syncFades(): void {
    const arr = (this.dotFade as unknown as { array: number[] }).array;
    arr.fill(0);
    for (const b of this.blocks.values()) if (b.written) arr[b.slot] = b.fade;
  }

  /** Einmal pro Frame: Punkt-Blenden der Chunks nachführen (entfernt ausgeblendete Blöcke). `dtSeconds` für Tests. */
  tick(dtSeconds?: number): void {
    const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
    const dt = dtSeconds ?? (this.lastTick < 0 ? 0 : Math.min(0.1, Math.max(0, now - this.lastTick)));
    this.lastTick = now;
    let changed = false;
    let removed = false;
    for (const b of this.blocks.values()) {
      if (!b.written) {
        // Wartet auf Platz (einblendend) oder fällt weg (ausblendend ohne Platz)
        if (b.target <= 0) {
          this.blocks.delete(b.slot);
          removed = true;
        }
        continue;
      }
      if (b.fade === b.target) continue;
      const step = dt / DOT_FADE_SECONDS;
      b.fade = b.target > b.fade ? Math.min(b.target, b.fade + step) : Math.max(b.target, b.fade - step);
      changed = true;
      if (b.fade <= 0 && b.target <= 0) {
        this.blocks.delete(b.slot);
        removed = true;
      }
    }
    if (removed) this.dotsDirty = true; // Platz frei → wartende Blöcke kommen in den Pool
    if (this.dotsDirty) this.writeDots();
    else if (changed) this.syncFades();
  }

  /** Anzahl der Punkte im Pool (für Tests und Statistik). */
  get dotCountTotal(): number {
    return this.dotsGeometry.instanceCount;
  }

  get meshes(): Array<InstancedMesh | Mesh> {
    return [...CROWN_KINDS.map((k) => this.crowns[k]), ...TRUNK_KINDS.map((k) => this.trunks[k]), this.bare, this.wind, this.dots];
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}

/** Kleiner deterministischer Zufallsgenerator aus einem Startwert 0..1. */
function mulberryFrom(seed01: number): () => number {
  let a = Math.floor(seed01 * 4294967296) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Nur den benutzten Bereich hochladen (statische Puffer + Update-Range; siehe planetVegetation `commit`).
 */
function commit(attr: { itemSize: number; clearUpdateRanges(): void; addUpdateRange(start: number, count: number): void; needsUpdate: boolean }, count: number): void {
  attr.clearUpdateRanges();
  if (count <= 0) return;
  attr.addUpdateRange(0, count * attr.itemSize);
  attr.needsUpdate = true;
}
