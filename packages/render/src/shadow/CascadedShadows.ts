import { DepthTexture, DoubleSide, FrontSide, GreaterEqualCompare, LessEqualCompare, LinearFilter, Matrix4, NoBlending, NodeMaterial, Object3D, Quaternion, RenderTarget, ShadowBaseNode, ShadowNode, Vector2, Vector3, Vector4 } from 'three/webgpu';
import type { BufferGeometry, Camera, DirectionalLight, LightShadow, Node, NodeBuilder, PerspectiveCamera, Renderer, Scene, UniformNode } from 'three/webgpu';
import {
  Discard,
  Fn,
  If,
  cameraProjectionMatrix,
  cameraViewMatrix,
  float,
  floor,
  fract,
  fwidth,
  lightShadowMatrix,
  max,
  min,
  mix,
  mod,
  normalWorldGeometry,
  positionView,
  positionWorld,
  property,
  reference,
  screenCoordinate,
  select,
  shadowPositionWorld,
  smoothstep,
  step,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import type { FloatNode, Vec2Node, Vec3Node, Vec4Node } from '../earle/tsl';
import { CascadeFitter, createFitResult, type CascadeSize, type ClipBoxSpec, type FitInput, type FitResult, type ReceiverShellSpec, type ReceiverSlabSpec, type ReceiverVolume, type ShadowSpaceWarp } from './fit';
import {
  bsplineField,
  createDepthCompareZ,
  createEarleShadowFilter,
  createShadowFrameUniforms,
  flatNormalWorld,
  kernelRadiusOf,
  receiverDepth,
  thresholdField,
  type DepthCompareZFn,
  type ShadowFrameUniforms,
  type ShadowTaps,
} from './filters';
import type { ManualCompareOption } from './webglCompat';

/**
 * Kaskadierte, an die Kamera gefittete Earle-Schatten als eigener Schattenknoten (`light.shadow.shadowNode`).
 *
 * - N verschachtelte Kaskaden (Kaskade k deckt Blicktiefe ≤ s_k), je eine three-`ShadowNode` mit eigener
 *   (nicht-quadratischer) Tiefenkarte und dem B-Spline-Filter im Feld-Modus.
 * - Auswahl je Fragment: feinste Kaskade, in deren Rechteck und Tiefenbereich der Punkt liegt; an Tiefen- und
 *   Rechteckgrenzen werden die **Felder** überblendet, erst danach wird einmal auf 1 px geschnitten → keine Naht.
 * - Refit nur, wenn sich Kamera, Sonne, Empfänger oder Clip-Box ändern; Schattenpässe nur nach `markDirty()`
 *   oder Refit (Planet rollt → Konsument ruft `requestUpdate()`).
 * - Optional eine Referenzkarte („Alt“: eine Karte über die ganze `fitShadow`-Box, 1 Tap), per Uniform
 *   umschaltbar — für den A/B- und Split-Vergleich im Schatten-Lab ohne Neukompilieren.
 *
 * Schatten v3 (Kontakt):
 * - **Werfer-Mindestbreite**: reine Werfer (werfen, empfangen nicht: Stämme, Kronen, Requisiten, Tiere, Wesen) werden
 *   im Schattenpass entlang ihrer ins Lichtbild projizierten Normale um `casterDilation` Texel aufgeweitet. Ein
 *   Stamm, der schmaler als ein Texel ist, fiel vorher durch das Raster (gestrichelte oder fehlende Linie zwischen
 *   Stammfuß und Kronenschatten → die Krone „schwebt“); jetzt bleibt seine Linie geschlossen und reicht bis zum Fuß.
 * - **Empfängerebenen-Bias** (siehe `filters.ts`): die Ebene kommt aus den Bildschirmableitungen der gerenderten
 *   Facette, einmal je Fragment in gleichförmigem Kontrollfluss berechnet.
 * - Die Tiefenkarten gehören dieser Klasse (vorab angelegt) → `sampleField()`/`shadowFactor` können sie in jedem
 *   Material und jeder Shader-Stufe lesen (Kronenpunkte skalieren im Vertex-Shader mit dem Schatten).
 */

export interface ViewReceivers {
  /**
   * Planetenschale: Empfänger zwischen `radius + minHeight` und `radius + maxHeight` um `center`. Mit `surface`
   * (Geländeradius für eine Richtung im lokalen Raum von `center`, z. B. `(d) => planet.surfaceRadius(d)`) werden die
   * feinen Kaskaden an geschätzte Bodenpunkte gefittet — keine Auflösung für Luft über niedrigem Gelände.
   */
  sphere?: {
    center: Vector3 | Object3D;
    radius: number;
    minHeight?: number;
    maxHeight: number;
    surface?: ((dirLocal: Vector3) => number) | null;
    /**
     * Schatten v3: auch die gröbste Kaskade an den Boden fitten (± Toleranz in Welteinheiten, braucht `surface`).
     * Empfänger über dem Boden (Riesenbaum, Brett) kommen über `ViewReceivers.volumes` dazu.
     */
    coverTolerance?: number | null;
    /**
     * Höhe, bis zu der verteilte Empfänger über dem Boden reichen (Kronen einer Wald-Schicht mit Schlagschatten): die
     * gröbste Kaskade deckt je Strahl auch Boden + Normale · `coverAbove` ab (einseitig, nur wenn > `coverTolerance`).
     * Darf ein Getter sein (wird je Refit nach `volumes` gelesen).
     */
    coverAbove?: number | null;
  } | null;
  plane?: { origin?: Vector3 | Object3D; normal?: Vector3; minHeight: number; maxHeight: number } | null;
  /** Größte Blicktiefe mit Empfängern (Standard: Kamera-far). */
  maxDistance?: number;
  /** Höhe der höchsten Schattenwerfer über den Empfängern (bestimmt die Nahebene Richtung Sonne). */
  casterHeight?: number;
  /** Empfänger über dem Boden als Welt-Kugeln (je Refit abgefragt), z. B. Riesenbaum-Stamm oder Brett. */
  volumes?: (() => ReceiverVolume[]) | null;
}

/**
 * Schatten in Ebenenkoordinaten (ADR 0002): die Kamera sieht die Anzeigekugel, Werfer und Empfänger liegen für den
 * Schatten in der flachen Ebene. `node` bildet eine Anzeigeposition in den Schattenraum ab (TSL: Werfer im Schattenpass,
 * Empfänger je Fragment, Schattenwerte der Kronenpunkte), `cpu` dasselbe für den Kaskaden-Fit.
 */
export interface ShadowWarp {
  node(p: Vec3Node): Vec3Node;
  cpu: ShadowSpaceWarp;
}

export interface CascadedShadowsOptions {
  sizes: CascadeSize[];
  /** Verzug Anzeige- → Schattenraum (null = gleicher Raum, alte Konsumenten). */
  warp?: ShadowWarp | null;
  taps: ShadowTaps;
  /** Referenzkarte („Alt“) für Vergleiche; Kantenlänge der quadratischen Karte. */
  referenceSize?: number | null;
  /** Filter der Referenzkarte (Standard: 1 Tap + Schwelle); das Lab übergibt den alten P2-Filter. */
  referenceFilter?: unknown;
  /** Glatte Terminator-Silhouetten für glatte, einseitige Werfer (Standard an). */
  smoothCasters?: boolean;
  /**
   * Geometrischer Werfer-Versatz für Selbstschatten-Objekte in Welteinheiten (Facettenabweichung des Geländes);
   * wird je Kaskade in einen Hardware-Steigungsfaktor umgerechnet (`g / min(tx, ty)`), damit er nicht mit der Texelgröße
   * schrumpft.
   */
  casterOffset?: number;
  /** Aufweitung reiner Werfer im Schattenpass (Texel je Seite, Standard 0,6 → dünne Werfer ≥ 1,2 Texel breit). */
  casterDilation?: number;
  /**
   * Kontaktversatz reiner Werfer entlang −Licht-Y in Welteinheiten (Standard 0,03, mindestens ein Texel): schließt die
   * Lichtlücke unter Werfern, die bis zu diesem Maß über dem gerenderten Gelände stehen.
   */
  casterShift?: number;
  /**
   * Empfängerebenen-Bias (Standard an). `false` kompiliert den alten symmetrischen Kernel-Bias ein (A/B-Vergleich im Lab;
   * Umschalten baut die Kaskaden neu).
   */
  planeBias?: boolean;
  lambda?: number;
  blend?: number;
  normalBias?: number;
  bias?: number;
  /** Tiefe manuell vergleichen (siehe `ShadowFilterOptions.manualCompare`); Standard: automatisch. */
  manualCompare?: ManualCompareOption;
}

export interface CascadeStats {
  width: number;
  height: number;
  pxPerTexel: number;
  split: number;
  texelX: number;
  texelY: number;
  active: boolean;
}

export interface CascadedShadowStats {
  cascades: CascadeStats[];
  psiDeg: number;
  refits: number;
  passes: number;
  rays: number;
  dMin: number;
  dMax: number;
}

/** Optionen für `sampleField` (Schattenwert an beliebiger Weltposition, jede Shader-Stufe). */
export interface CascadeSampleOptions {
  /** Blicktiefe für die Kaskadenwahl (Standard: aus der rendernden Kamera, −(View · p).z). */
  viewDepth?: FloatNode | null;
  /** B-Spline-Ordnung der Kante: 1 (bilinear), 4 (kubisch, Standard), 9 (quintisch). */
  taps?: ShadowTaps;
  /**
   * Weichheit (Welteinheiten, Radius): statt der Kante wird der Anteil Licht über eine Scheibe dieses Radius quer zur
   * Sonne gemittelt (9 bilineare Taps, feste Verteilung, kein Rauschen). Glättet den Übergang über einen Weg von etwa
   * 2 × Radius und dämpft das Springen einzelner Texel beim Drehen. Mindestens 1 Texel.
   */
  softness?: FloatNode | number | null;
  /** Empfängerebene (Weltnormale): Taps folgen der Ebene statt einer Punktprobe. */
  plane?: Vec3Node | null;
  /** Schattierungsnormale (Terminatornähe → kleiner Zusatzbias). */
  shading?: Vec3Node | null;
  /** Außerhalb aller Kaskaden: Wert (Standard 1 = beleuchtet). */
  outside?: number;
}

/** Platzhalter-Licht je Kaskade (three braucht ein Objekt mit `shadow`, `target`, `castShadow`). */
class CascadeLight extends Object3D {
  readonly target = new Object3D();
  override castShadow = true;
  readonly isCascadeLight = true;
  constructor(readonly shadow: LightShadow) {
    super();
  }
}

interface CascadeEntry {
  light: CascadeLight;
  shadow: LightShadow;
  node: Node;
  frame: ShadowFrameUniforms;
  split: UniformNode<'float', number>;
  active: UniformNode<'float', number>;
  /** Überblendband am Rechteckrand in uv: (x ab, x voll, y ab, y voll). */
  band: UniformNode<'vec4', Vector4>;
  size: CascadeSize;
  /** Werfer-Bias dieser Kaskade (Steigungsfaktor = geometrischer Versatz / Texelgröße). */
  selfBias: SelfShadowBias;
  /**
   * Werfer-Transformation reiner Werfer im Schattenpass (Welteinheiten): x, y = Aufweitung entlang Licht-X/-Y,
   * z = Kontaktversatz entlang −Licht-Y (Schatten rutscht unter den Fuß), w = Kontakthub zur Sonne (Tiefe).
   */
  casterXf: UniformNode<'vec4', Vector4>;
  /** Vorab angelegte Tiefenkarte (gehört dieser Klasse; die `ShadowNode` rendert hinein). */
  target: RenderTarget | null;
  depth: DepthTexture | null;
}

/** Tiefen-Bias der Werferseite für Objekte, die zugleich werfen und empfangen (Gelände, Brett, Hero-Stamm). */
export interface SelfShadowBias {
  /** Steigungsfaktor (WebGPU `depthBiasSlopeScale`, WebGL `polygonOffset factor`), je Kaskade aus der Texelgröße. */
  slopeScale: number;
  /** Konstanter Anteil (Einheiten der Tiefenauflösung). */
  units: number;
}

type RenderObjectFn = (object: Object3D, scene: Scene, camera: Camera, ...rest: unknown[]) => void;

/** Einstellungen des Schattenpasses für glatte Werfer (live änderbar). */
export interface CasterSettings {
  /** Glatte Terminator-Silhouette (siehe `TerminatorShadowNode`). */
  smooth: boolean;
  /** Reine Werfer aufweiten (Mindestbreite dünner Werfer). */
  dilate: boolean;
  /** Reine Werfer im Lichtbild nach unten versetzen (Kontakt: Schatten beginnt unter dem Fuß). */
  shift: boolean;
}

interface CasterMaterialState {
  side?: number;
  shadowSide?: number | null;
  castShadowPositionNode?: unknown;
  flatShading?: boolean;
  isNodeMaterial?: boolean;
}

/**
 * Kaskaden-`ShadowNode` mit Earle-Werferregeln:
 *
 * 1. **Glatte Terminator-Silhouette** für einseitige, glatt schattierte Werfer (Gelände, Kronen, Requisiten): sie werden
 *    beidseitig gerendert, aber jedes Fragment, dessen Schattierungsnormale zur Sonne zeigt (N·L > 0), wird verworfen.
 *    In der Karte steht damit genau die *dunkle Seite* der glatten Fläche — ihr Umriss ist die glatte Terminatorkurve
 *    statt der Dreieckskanten. Ohne das zeichnet ein exakter Schatten bei 10° Sonne jede Rasterstufe eines
 *    Geländegrats 5,7-fach gestreckt nach (geometrische Treppen), und geometrisch abgewandte Facetten mit beleuchteter
 *    Normale beschatten sich selbst (Akne). Beleuchtete Empfänger stehen nie selbst in der Karte.
 * 2. **Werfer-Bias** (Hardware-Slope-Bias) für Objekte, die zugleich werfen und empfangen (Gelände, Brett, Stamm).
 *    Reine Werfer bleiben exakt → kein Lichtspalt am Stammfuß.
 * 3. **Werfer-Mindestbreite** für dünne reine Werfer (Stämme, Rohre, Beine, alles ohne glatte Silhouette): Aufweitung
 *    um `casterDilation` Texel quer zur Sonne (Vertex-Shader des Schattenpasses, entlang der projizierten Normale).
 *    Je Objekt: `userData.shadowDilate = false` schaltet sie ab, `true` erzwingt sie auch für glatte Werfer.
 */
class TerminatorShadowNode extends ShadowNode {
  private wrapped: RenderObjectFn | null = null;
  private wrappedBase: RenderObjectFn | null = null;
  private readonly materials = new Map<string, NodeMaterial>();

  constructor(
    light: DirectionalLight,
    shadow: LightShadow,
    private readonly selfBias: SelfShadowBias,
    private readonly casters: CasterSettings,
    private readonly axes: Pick<ShadowFrameUniforms, 'axisX' | 'axisY' | 'axisL'>,
    private readonly casterXf: UniformNode<'vec4', Vector4>,
    private readonly owned: { target: RenderTarget; depth: DepthTexture },
    private readonly warp: ShadowWarp | null = null,
    /** Index der Kaskade (0 = die feinste, kameranächste). */
    private readonly cascadeIndex = 0,
  ) {
    super(light, shadow);
  }

  /**
   * Empfängerposition für den Kartenvergleich: mit Verzug (Ebene) die flache Position des Fragments — dieselbe, in der
   * die Werfer liegen (three nimmt sonst die angezeigte Position, die Karten lägen neben den Werfern).
   */
  override setupShadowPosition(builder: NodeBuilder): void {
    const b = builder as unknown as { context: { shadowPositionWorld?: Vec3Node }; material: { receivedShadowPositionNode?: Vec3Node | null } };
    const src = (b.material.receivedShadowPositionNode ?? b.context.shadowPositionWorld ?? positionWorld) as unknown as Vec3Node;
    (shadowPositionWorld as unknown as { assign(v: unknown): void }).assign(this.warp ? this.warp.node(src) : src);
  }

  /** Eigene, vorab angelegte Tiefenkarte statt einer neuen je Aufbau (Konsumenten binden dieselbe Textur). */
  setupRenderTarget(_shadow: LightShadow, builder: NodeBuilder): { shadowMap: RenderTarget; depthTexture: DepthTexture } {
    const { target, depth } = this.owned;
    if (depth.compareFunction !== null) depth.compareFunction = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer ? GreaterEqualCompare : LessEqualCompare;
    return { shadowMap: target, depthTexture: depth };
  }

  private applyBias(m: NodeMaterial): void {
    const on = this.selfBias.slopeScale > 0;
    if (m.polygonOffset !== on || m.polygonOffsetFactor !== this.selfBias.slopeScale || m.polygonOffsetUnits !== this.selfBias.units) {
      m.polygonOffset = on;
      m.polygonOffsetFactor = this.selfBias.slopeScale;
      m.polygonOffsetUnits = this.selfBias.units;
      m.needsUpdate = true;
    }
  }

  /**
   * Clip-Position reiner Werfer: Weltposition + Aufweitung (projizierte Normale × Texel entlang Licht-X/-Y, nur wenn
   * `dilate`) − Kontaktversatz entlang Licht-Y. Beides liegt in der Lichtebene → die Tiefe bleibt unverändert.
   *
   * Der Versatz schiebt den Werfer im Lichtbild um `shift` nach unten (Richtung Boden, quer zur Sonne): sein Schatten
   * rutscht auf dem Boden um shift / sin(Sonnenhöhe) auf den Werfer zu (0,03 → 0,17 Einheiten). Das schließt die Lücke
   * zwischen Fuß und
   * Schattenbeginn, die sonst entsteht, wenn der Werfer eine Spur über dem gerenderten Gelände steht (analytischer Fuß
   * vs. facettiertes Gelände: 1 cm Schweben = 6 cm Lichtspalt bei 10° Sonne) oder die Kante am Linienende rundet.
   * Vor dem Werfer (sonnenseitig) entsteht kein Schatten — der Tiefentest schützt den näheren Boden.
   */
  private casterClip(dilate: boolean, shift = true): Vec4Node {
    const X = this.axes.axisX as unknown as Vec3Node;
    const Y = this.axes.axisY as unknown as Vec3Node;
    const xf = this.casterXf as unknown as Vec4Node;
    const L = this.axes.axisL as unknown as Vec3Node;
    // Versatz Richtung Boden (Lichtbild) + Hub zur Sonne (Tiefe): am Fuß registrieren auch die sonnenseitigen Taps den
    // Werfer, das Linienende rundet nicht mehr vor dem Fuß ab (dünne Linien: Feld am Fuß ≈ ¾ · ½ < 0,5)
    let off: Vec3Node = (shift ? Y.mul(xf.z.negate()).add(L.mul(xf.w)) : vec3(0, 0, 0)) as unknown as Vec3Node;
    if (dilate) {
      const n = normalWorldGeometry as unknown as Vec3Node;
      const np = n.sub(L.mul(n.dot(L)));
      const len = np.length();
      const dir = np.div(len.max(1e-5)).mul(step(1e-4, len));
      off = off.add(X.mul(dir.dot(X).mul(xf.x)).add(Y.mul(dir.dot(Y).mul(xf.y)))) as unknown as Vec3Node;
    }
    // Ebene: Werfer aus der Anzeigekugel in den flachen Schattenraum
    const pw = positionWorld as unknown as Vec3Node;
    const p = (this.warp ? this.warp.node(pw) : pw).add(off);
    return (cameraProjectionMatrix as unknown as { mul(v: unknown): Vec4Node }).mul((cameraViewMatrix as unknown as { mul(v: unknown): Vec4Node }).mul(vec4(p, 1)));
  }

  /**
   * Materialvarianten des Schattenpasses:
   * - `smooth`: beidseitig, verwirft Fragmente mit N_Schattierung·L > 0 (kein Schattenpass-Material: sonst setzt three
   *   die Seite zurück auf die Rückseite; die Position übernimmt three trotzdem vom Objektmaterial).
   * - `bias`: Werfer-Bias (Schattenpass-Material: three setzt Seite/Position/Alpha wie üblich).
   * - `plain`: nur Aufweitung (Schattenpass-Material, three übernimmt auch `castShadowPositionNode`).
   */
  private getMaterial(kind: 'smooth' | 'bias' | 'plain', withBias: boolean, dilate: boolean, shift = false): NodeMaterial {
    const key = `${kind}${withBias ? '+b' : ''}${dilate ? '+d' : ''}${shift ? '+s' : ''}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new NodeMaterial();
      m.name = `EarleShadow_${key}`;
      m.blending = NoBlending;
      m.fog = false;
      if (kind === 'smooth') {
        const L = this.axes.axisL;
        m.colorNode = Fn(() => {
          If((normalWorldGeometry as unknown as Vec3Node).dot(L).greaterThan(0), () => {
            Discard();
          });
          return vec4(0, 0, 0, 1);
        })() as unknown as Vec4Node;
        m.side = DoubleSide;
      } else {
        m.colorNode = vec4(0, 0, 0, 1);
        (m as unknown as { isShadowPassMaterial: boolean }).isShadowPassMaterial = true;
      }
      // Mit Verzug (Ebene) läuft jeder Werfer durch den eigenen Vertex-Schritt (Anzeige → Schattenraum)
      if (dilate || shift || this.warp) m.vertexNode = this.casterClip(dilate, shift);
      this.materials.set(key, m);
    }
    if (withBias) this.applyBias(m);
    return m;
  }

  override getShadowRenderObjectFunction(renderer: Renderer, shadow?: LightShadow): RenderObjectFn {
    const base = super.getShadowRenderObjectFunction(renderer, shadow) as unknown as RenderObjectFn;
    if (this.wrappedBase !== base || !this.wrapped) {
      this.wrappedBase = base;
      this.wrapped = (object, scene, camera, geometry, material, ...rest) => {
        if (object.castShadow !== true) {
          base(object, scene, camera, geometry, material, ...rest);
          return;
        }
        const mat = material as CasterMaterialState | null;
        const data = object.userData as { shadowSelfBias?: boolean; shadowSmooth?: boolean; shadowDilate?: boolean; shadowContact?: boolean; shadowCascades?: number };
        // Kleine Werfer (Müll, Requisiten, Tiere, Sockel): nur in den feinen Kaskaden — in der gröbsten wären ihre
        // Schatten kleiner als ein Texel, der Zeichenaufruf je Kaskade bliebe (`userData.shadowCascades = n`: Kaskaden 0 … n−1)
        if (typeof data.shadowCascades === 'number' && this.cascadeIndex >= data.shadowCascades) return;
        const self = object.receiveShadow === true && data.shadowSelfBias !== false;
        const smooth =
          this.casters.smooth &&
          mat?.isNodeMaterial === true &&
          mat.side === FrontSide &&
          (mat.shadowSide === null || mat.shadowSide === undefined) &&
          !mat.castShadowPositionNode &&
          mat.flatShading !== true &&
          data.shadowSmooth !== false;
        // Reine Werfer (empfangen nicht) aufweiten — nie Selbstschatten-Objekte (sie würden sich selbst beschatten),
        // nie Karten mit eigener Schattenposition (zur Sonne gedrehte Astkarten), nur mit Normalen. Glatte Werfer
        // (Kronen, Felsen: groß, geschlossen) nur auf Wunsch (`userData.shadowDilate = true`): aufgeweitet rissen an den
        // Kugelrändern der Kronen-Cluster feine Lichtbögen in die Schatten.
        const dilate =
          this.casters.dilate &&
          object.receiveShadow !== true &&
          (data.shadowDilate === true || (data.shadowDilate !== false && !smooth)) &&
          mat?.isNodeMaterial === true &&
          !mat.castShadowPositionNode &&
          (geometry as BufferGeometry | undefined)?.hasAttribute?.('normal') === true;
        // Kontaktversatz für alle reinen Werfer (auch Karten und glatte Werfer: reine Verschiebung, Topologie bleibt)
        const shift = this.casters.shift && object.receiveShadow !== true && data.shadowContact !== false && mat?.isNodeMaterial === true;
        let override: NodeMaterial | null = null;
        if (smooth) override = this.getMaterial('smooth', self && this.selfBias.slopeScale > 0, dilate, shift && !self);
        else if (self && this.selfBias.slopeScale > 0) override = this.getMaterial('bias', true, false);
        else if (dilate || shift || (this.warp && mat?.isNodeMaterial === true)) override = this.getMaterial('plain', false, dilate, shift);
        if (!override) {
          base(object, scene, camera, geometry, material, ...rest);
          return;
        }
        const prev = scene.overrideMaterial;
        scene.overrideMaterial = override;
        base(object, scene, camera, geometry, material, ...rest);
        scene.overrideMaterial = prev;
      };
    }
    return this.wrapped;
  }

  override dispose(): void {
    for (const m of this.materials.values()) m.dispose();
    this.materials.clear();
    super.dispose();
  }
}

/** Eigener Schattenknoten: registriert sich vor den Kaskaden-`ShadowNode`s, damit der Refit zuerst läuft. */
class EarleCascadeNode extends ShadowBaseNode {
  static get type(): string {
    return 'EarleCascadeNode';
  }

  constructor(
    light: DirectionalLight,
    private readonly owner: CascadedShadows,
  ) {
    super(light);
  }

  override build(builder: NodeBuilder, output?: string | null): string | Node | null {
    (builder as unknown as { addSequentialNode(n: unknown): void }).addSequentialNode(this);
    return (super.build as (b: NodeBuilder, o?: string | null) => string | Node | null)(builder, output);
  }

  override setup(builder: NodeBuilder): Node {
    return this.owner.setupNode(this, builder);
  }

  override updateBefore(frame: unknown): boolean | undefined {
    this.owner.beforeRender(frame as { camera: Camera; renderer: unknown });
    return undefined;
  }
}

const _v = new Vector3();
const _v2 = new Vector3();
const _size = new Vector2();
const _dirLocal = new Vector3();
const _invQ = new Quaternion();
const _yawQ = new Quaternion();
const _yawM = new Matrix4();
const _keyM = new Matrix4();
const _keySun = new Vector3();
const _yu = new Vector3();
const _yf = new Vector3();
const _yr = new Vector3();
const _yc = new Vector3();

/**
 * Drehung um die Hochachse `up` (durch den Ursprung), die den Blick der Kamera auf −z (in der Ebene ⊥ `up`) dreht —
 * der „gierfreie“ Rahmen der Kamera. Dreht die Ansicht mit Kamera und Sonne gemeinsam um die Hochachse (ADR 0002: das
 * Rig dreht über der Ebene; früher drehte sich die Kugel unter fester Kamera), ist die Lage in diesem Rahmen dieselbe.
 */
function yawFreeRotation(camera: PerspectiveCamera, up: Vector3, out: Quaternion): Quaternion {
  const u = _yu.copy(up).normalize();
  const e = camera.matrixWorld.elements;
  const f = _yf.set(-e[8]!, -e[9]!, -e[10]!);
  f.addScaledVector(u, -f.dot(u));
  // senkrecht nach unten: die Hochachse des Bildes gibt die Richtung
  if (f.lengthSq() < 1e-8) f.set(e[4]!, e[5]!, e[6]!).addScaledVector(u, -_yc.set(e[4]!, e[5]!, e[6]!).dot(u));
  if (f.lengthSq() < 1e-8) return out.identity();
  f.normalize();
  const ref = _yr.set(0, 0, -1).addScaledVector(u, u.z);
  if (ref.lengthSq() < 1e-8) ref.set(1, 0, 0).addScaledVector(u, -u.x);
  ref.normalize();
  const angle = Math.atan2(u.dot(_yc.crossVectors(f, ref)), f.dot(ref));
  return out.setFromAxisAngle(u, angle);
}

/** Feste Scheibenverteilung (goldener Winkel, 8 Punkte + Mitte) für weiche Schattenwerte. */
const SOFT_DISC: Array<[number, number]> = (() => {
  const out: Array<[number, number]> = [[0, 0]];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 8; i++) {
    const r = Math.sqrt((i + 0.5) / 8);
    out.push([r * Math.cos(i * golden), r * Math.sin(i * golden)]);
  }
  return out;
})();

export class CascadedShadows {
  readonly node: EarleCascadeNode;
  readonly cascades: CascadeEntry[] = [];
  readonly reference: CascadeEntry | null = null;
  /** 1 = Referenzkarte („Alt“) statt Kaskaden zeigen. */
  readonly useReference = uniform(0);
  /** 0 aus, 1 Kaskadenmuster, 2 Texelgitter. */
  readonly debugMode = uniform(0);
  readonly fitResult: FitResult;
  /** Gebundene Kamera: nur ihre Renders fitten (Lupe, Zweitkameras benutzen die fertigen Karten). */
  camera: PerspectiveCamera | null = null;
  receivers: ViewReceivers = {};
  /** Clip-Box aus `fitShadow` (lokale Box + Matrix) und Werferhöhe. */
  clip: ClipBoxSpec | null = null;
  casterHeight = 6;
  /** Sonne und Rig (Welt): gesetzt vom Besitzer. */
  readonly sunDir = new Vector3(0, 1, 0);
  readonly upRef = new Vector3(0, 1, 0);
  readonly anchor = new Vector3();
  elevationRad = 0.17;
  /** ψ fixieren (Grad) oder null = optimieren. */
  fixedPsiDeg: number | null = null;
  lambda: number;
  blend: number;
  refits = 0;
  passes = 0;
  /** Referenzkarte mitrendern (A/B-Vergleich aktiv). */
  referenceActive = false;
  /** Vor jedem Fit-Check (gebundene Kamera): Besitzer synchronisiert Sonne/Rig (Welt). */
  preFit: (() => void) | null = null;
  /** Aufweitung reiner Werfer (Texel je Seite), live änderbar. */
  casterDilation: number;
  private readonly fitter = new CascadeFitter();
  private readonly axes: Pick<ShadowFrameUniforms, 'axisX' | 'axisY' | 'axisL' | 'grazing' | 'baseBias'>;
  /** Empfängerebene je Fragment (flache Weltnormale), vor der Kaskadenwahl in gleichförmigem Kontrollfluss gesetzt. */
  private readonly planeNormal = property('vec3', 'eeShadowPlaneN') as unknown as Vec3Node & { assign(v: unknown): void };
  private signature: number[] = [];
  private dirty = true;
  private referenceDirty = true;
  private readonly shellScratch: ReceiverShellSpec = { center: new Vector3(), rMin: 0, rMax: 1 };
  private readonly slabScratch: ReceiverSlabSpec = { origin: new Vector3(), normal: new Vector3(0, 1, 0), hMin: 0, hMax: 1 };
  /** Empfänger-Volumen des letzten Signaturaufbaus (je Frame einmal abgefragt). */
  private volumeScratch: ReceiverVolume[] | null = null;
  /** Bodenmarsch-Amortisierung: Epoche, Planetendrehung und Kamerazustand beim letzten Marsch. */
  private surfaceEpoch = 0;
  private readonly marchQuat = new Quaternion();
  private readonly marchCam: number[] = [];
  /** Kamera/Sonne/Viewport beim letzten ψ-Suchlauf (unverändert → ψ behalten, spart die Suche beim Rollen). */
  private readonly psiKey: number[] = [];
  /** Winkel (rad), ab dem die Bodenschätzung neu gemessen wird. */
  marchAngle = (0.8 * Math.PI) / 180;
  /** Geometrischer Werfer-Versatz (Welteinheiten), live änderbar. */
  casterOffset: number;
  /** Glatte Terminator-Silhouetten und Werfer-Aufweitung im Schattenpass (live umschaltbar, ab dem nächsten Pass). */
  readonly casterSettings: CasterSettings = { smooth: true, dilate: true, shift: true };
  /** Kontaktversatz reiner Werfer (Welteinheiten entlang −Licht-Y, mindestens ein Texel), live änderbar. */
  casterShift: number;

  constructor(
    readonly light: DirectionalLight,
    readonly options: CascadedShadowsOptions,
  ) {
    this.lambda = options.lambda ?? 0.72;
    this.blend = options.blend ?? 0.14;
    this.casterOffset = options.casterOffset ?? 0.04;
    this.casterDilation = options.casterDilation ?? 0.6;
    this.casterShift = options.casterShift ?? 0.03;
    this.casterSettings.smooth = options.smoothCasters ?? true;
    const shared = createShadowFrameUniforms();
    this.axes = { axisX: shared.axisX, axisY: shared.axisY, axisL: shared.axisL, grazing: shared.grazing, baseBias: shared.baseBias };
    for (const size of options.sizes) this.cascades.push(this.createEntry(size, options.taps, 'field', this.axes));
    if (options.referenceSize) {
      const s = options.referenceSize;
      this.reference = this.createEntry({ width: s, height: s }, 1, 'threshold', null, options.referenceFilter);
    }
    this.fitResult = createFitResult(options.sizes.length);
    this.node = new EarleCascadeNode(light, this);
  }

  private createEntry(size: CascadeSize, taps: ShadowTaps, output: 'field' | 'threshold', axes: CascadedShadows['axes'] | null, filter?: unknown): CascadeEntry {
    const shadow = this.light.shadow.clone() as LightShadow;
    shadow.mapSize.set(size.width, size.height);
    shadow.autoUpdate = false;
    shadow.needsUpdate = true;
    shadow.bias = filter ? this.light.shadow.bias : (this.options.bias ?? 0);
    // Normalen-Versatz verschiebt bei 10° Sonne den ganzen Schatten um normalBias·cot θ von seinem Werfer weg
    // (0,04 → 0,23 Einheiten Lichtspalt am Fuß); Rückseiten-Karte + Werfer-Bias machen ihn überflüssig.
    shadow.normalBias = filter ? this.light.shadow.normalBias : (this.options.normalBias ?? 0);
    shadow.radius = 1;
    const frame = createShadowFrameUniforms();
    if (axes) Object.assign(frame, axes);
    (shadow as unknown as { filterNode: unknown }).filterNode =
      filter ??
      createEarleShadowFilter({
        frame,
        taps,
        output,
        terminatorOnly: true,
        plane: this.options.planeBias === false ? null : this.planeNormal,
        legacyBias: this.options.planeBias === false,
        ...(this.options.manualCompare !== undefined ? { manualCompare: this.options.manualCompare } : {}),
      });
    const light = new CascadeLight(shadow);
    light.name = `EarleCascade${this.cascades.length}`;
    const selfBias: SelfShadowBias = { slopeScale: 0, units: 0 };
    const casterXf = uniform(new Vector4(0, 0, 0, 0));
    let target: RenderTarget | null = null;
    let depth: DepthTexture | null = null;
    let node: Node;
    if (filter) {
      node = new ShadowNode(light as unknown as DirectionalLight, shadow) as unknown as Node;
    } else {
      // Tiefenkarte vorab anlegen (wie `ShadowNode.setupRenderTarget`): Konsumenten binden sie vor dem ersten Aufbau
      depth = new DepthTexture(size.width, size.height);
      depth.name = `EarleShadowDepth${this.cascades.length}`;
      depth.compareFunction = LessEqualCompare;
      depth.minFilter = LinearFilter;
      depth.magFilter = LinearFilter;
      target = new RenderTarget(size.width, size.height);
      target.texture.name = 'EarleShadowMap';
      target.texture.type = shadow.mapType;
      target.depthTexture = depth;
      node = new TerminatorShadowNode(light as unknown as DirectionalLight, shadow, selfBias, this.casterSettings, this.axes, casterXf, { target, depth }, this.options.warp ?? null, this.cascades.length) as unknown as Node;
    }
    return { light, shadow, node, frame, split: uniform(0), active: uniform(0), band: uniform(new Vector4(0.002, 0.004, 0.002, 0.004)), size, selfBias, casterXf, target, depth };
  }

  /** Inhalt geändert (Planet gerollt, Wachstum, Werfer bewegt): alle Karten neu rendern. */
  markDirty(): void {
    this.dirty = true;
    this.referenceDirty = true;
  }

  /** Überblendgewicht einer Kaskade an `uv` (Rechteckrand) und Blicktiefe `depth` (Split); die letzte deckt alles ab. */
  private cascadeWeight(k: number, uv: Vec2Node, depth: FloatNode): FloatNode {
    const c = this.cascades[k]!;
    const last = k === this.cascades.length - 1;
    const inside = min(min(uv.x, uv.y), min(uv.x.oneMinus(), uv.y.oneMinus())) as unknown as FloatNode;
    if (last) return step(0, inside).mul(c.active) as unknown as FloatNode;
    const b = c.band as unknown as Vec4Node;
    const ex = smoothstep(b.x, b.y, min(uv.x, uv.x.oneMinus()));
    const ey = smoothstep(b.z, b.w, min(uv.y, uv.y.oneMinus()));
    const rect = min(ex, ey);
    const far = smoothstep(c.split.mul(1 - this.blend), c.split, depth).oneMinus();
    return rect.mul(far).mul(c.active) as unknown as FloatNode;
  }

  /** TSL-Graph: Auswahl/Überblendung der Kaskaden, eine harte Schwelle am Ende, Debug-Muster. */
  setupNode(node: EarleCascadeNode, builder: NodeBuilder): Node {
    const cascades = this.cascades;
    const reference = this.reference;
    const useReference = this.useReference;
    const debugMode = this.debugMode;
    const planeNormal = this.planeNormal;
    const warp = this.options.warp ?? null;
    return Fn(() => {
      node.setupShadowPosition(builder);
      // Ebene: Empfänger schlagen mit ihrer flachen Position nach (Anzeige → Schattenraum je Fragment)
      const spw = shadowPositionWorld as unknown as Vec3Node;
      const ps = warp ? (hoist(warp.node(spw), 'vec3') as Vec3Node) : spw;
      // Empfängerebene einmal je Fragment, vor jeder Verzweigung (Ableitungen brauchen gleichförmigen Kontrollfluss)
      planeNormal.assign(flatNormalWorld(ps));
      const p = vec4(ps, 1) as unknown as Vec4Node;
      const depth = (positionView as unknown as Vec3Node).z.negate() as unknown as FloatNode;
      const field = float(0).toVar('eeShadowField') as unknown as FloatNode & { assign(v: unknown): void; addAssign(v: unknown): void };
      const rem = float(1).toVar('eeShadowRem') as unknown as FloatNode & { assign(v: unknown): void; mulAssign(v: unknown): void };
      const dbgLevel = float(0).toVar('eeShadowDbg') as unknown as FloatNode & { assign(v: unknown): void };
      const dbgChecker = float(0).toVar('eeShadowChk') as unknown as FloatNode & { assign(v: unknown): void };
      if (reference) {
        If(useReference.greaterThan(0.5), () => {
          field.assign(reference.node);
          rem.assign(0);
        });
      }
      cascades.forEach((c, k) => {
        const uv = (lightShadowMatrix(c.light as unknown as DirectionalLight) as unknown as { mul(v: unknown): Vec4Node }).mul(p).xy as unknown as Vec2Node;
        const a = this.cascadeWeight(k, uv, depth);
        If(rem.greaterThan(1e-4).and(a.greaterThan(1e-4)), () => {
          field.addAssign(rem.mul(a).mul(c.node as unknown as FloatNode));
          If(a.mul(rem).greaterThan(0.5), () => {
            dbgLevel.assign(k);
            const ms = mapSizeOf(c.shadow);
            const t = floor(uv.mul(ms));
            dbgChecker.assign(mod(t.x.add(t.y), 2));
          });
          rem.mulAssign(a.oneMinus());
        });
      });
      field.addAssign(rem);
      const lit = thresholdField(field);
      // Debug: Kaskade 1 schlicht, 2 Diagonalen, 3 Kreuzschraffur (in Pixeln); Texelgitter als Schachbrett
      const sc = screenCoordinate as unknown as Vec2Node;
      const diag = step(fract(sc.x.add(sc.y).div(9)), 0.28);
      const anti = step(fract(sc.x.sub(sc.y).div(9)), 0.28);
      const pattern = dbgLevel.greaterThan(1.5).select(max(diag, anti), dbgLevel.greaterThan(0.5).select(diag, float(0)));
      const levelMod = float(1).sub(pattern.mul(0.45));
      const checkerMod = float(1).sub(dbgChecker.mul(0.3));
      const mode = debugMode;
      const dbg = mode.greaterThan(1.5).select(checkerMod, mode.greaterThan(0.5).select(levelMod, float(1)));
      return lit.mul(dbg);
    })() as unknown as Node;
  }

  /** Kartenkoordinaten einer Weltposition in Kaskade `c`: uv (WebGPU-Konvention wie three), Tiefe z, Innentest. */
  private coordsOf(c: CascadeEntry, p: Vec3Node): { uv: Vec2Node; z: FloatNode; inside: FloatNode } {
    const sp = (lightShadowMatrix(c.light as unknown as DirectionalLight) as unknown as { mul(v: unknown): Vec4Node }).mul(vec4(p, 1));
    const coord = sp.xyz.div(sp.w) as unknown as Vec3Node;
    const uv = vec2(coord.x, coord.y.oneMinus()) as unknown as Vec2Node;
    const z = coord.z.add(reference('bias', 'float', c.shadow) as unknown as FloatNode) as unknown as FloatNode;
    const inside = step(0, uv.x).mul(step(uv.x, 1)).mul(step(0, uv.y)).mul(step(uv.y, 1)).mul(step(z, 1)) as unknown as FloatNode;
    return { uv, z, inside };
  }

  /**
   * Glatter Schattenwert 0..1 (1 = beleuchtet) an einer Weltposition, **ohne** 1-px-Schwelle — für Konsumenten
   * außerhalb der Beleuchtung (Kronenpunkte skalieren, Tönungen, Diagnose). Jede Shader-Stufe (Vergleich auf Level 0).
   * Dieselbe Kaskadenwahl und -überblendung wie die Empfänger; B-Spline-Feld (C²-stetig im Raum) oder mit `softness`
   * ein über eine Scheibe gemittelter Lichtanteil (stetig, zeitlich ruhig). Muss innerhalb eines Aufbaus aufgerufen
   * werden (`builder` für die Plattformentscheidung Hardware-/Handvergleich).
   */
  sampleField(pView: Vec3Node, builder: NodeBuilder, options: CascadeSampleOptions = {}): FloatNode {
    const taps = options.taps ?? 4;
    const depth =
      options.viewDepth ?? ((cameraViewMatrix as unknown as { mul(v: unknown): Vec4Node }).mul(vec4(pView, 1)).z.negate() as unknown as FloatNode);
    const warp = this.options.warp ?? null;
    const p = warp ? warp.node(pView) : pView;
    const soft = options.softness === undefined || options.softness === null ? null : typeof options.softness === 'number' ? (options.softness > 0 ? float(options.softness) : null) : options.softness;
    const reversed = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer === true;
    // Knoten des Aufrufers vor jeder Verzweigung auswerten (sonst setzt three ihre Variable nur im ersten Zweig)
    const plane = options.plane ? hoist(options.plane, 'vec3') : null;
    const shading = options.shading ? hoist(options.shading, 'vec3') : null;
    const field = float(0).toVar() as unknown as FloatNode & { addAssign(v: unknown): void };
    const rem = float(1).toVar() as unknown as FloatNode & { mulAssign(v: unknown): void };
    this.cascades.forEach((c, k) => {
      const depthTex = c.depth;
      if (!depthTex) return;
      const { uv, z, inside } = this.coordsOf(c, p);
      const a = this.cascadeWeight(k, uv, depth);
      If(rem.greaterThan(1e-4).and(a.greaterThan(1e-4)), () => {
        const compare: DepthCompareZFn = createDepthCompareZ(depthTex, c.shadow, builder, this.options.manualCompare);
        const zAt = receiverDepth({
          frame: c.frame,
          z,
          plane,
          shading,
          kernelRadius: kernelRadiusOf(taps),
          terminatorOnly: true,
          reversed,
        });
        const mapSize = mapSizeOf(c.shadow);
        let value: FloatNode;
        if (soft) {
          // Scheibe quer zur Sonne: Radius in Texeln je Achse (mindestens 1), 9 bilineare Taps mit gleichem Gewicht
          const rTex = vec2(soft.div(c.frame.texel.x), soft.div(c.frame.texel.y)).max(vec2(1, 1)) as unknown as Vec2Node;
          const s = uv.mul(mapSize) as unknown as Vec2Node;
          let acc: FloatNode | null = null;
          for (const [dx, dy] of SOFT_DISC) {
            const delta = vec2(rTex.x.mul(dx), rTex.y.mul(dy)) as unknown as Vec2Node;
            const tapUV = s.add(delta).div(mapSize) as unknown as Vec2Node;
            const t = compare(tapUV, zAt(delta));
            acc = acc ? (acc.add(t) as unknown as FloatNode) : t;
          }
          value = acc!.div(SOFT_DISC.length) as unknown as FloatNode;
        } else {
          value = bsplineField(compare, uv, mapSize, taps, zAt);
        }
        // außerhalb der Karte (uv/z) gilt beleuchtet — wie `ShadowNode.setupShadowFilter`
        value = mix(float(1), value, inside) as unknown as FloatNode;
        field.addAssign(rem.mul(a).mul(value));
        rem.mulAssign(a.oneMinus());
      });
    });
    return field.add(rem.mul(options.outside ?? 1)) as unknown as FloatNode;
  }

  /**
   * Kontakt-Diagnose (Farbe) für eine Empfängerposition im Fragment-Shader — für das Schatten-Lab:
   * - **Magenta**: Spalt — direkt vor dem Punkt steht ein Werfer (Tiefenabstand ε…`gap`), das Ergebnis ist aber hell
   *   (Bias oder Filter öffnen eine Lichtlücke zwischen Werfer und Schatten → „schwebt“).
   * - **Grün**: Kontakt in Ordnung (naher Werfer, Schatten erreicht ihn).
   * - **Cyan**: dünner Schatten verloren (das rohe Texel ist verdeckt, das gefilterte Ergebnis hell).
   * - **Orange**: Filter wächst über den rohen Schatten hinaus.
   * - Hell-/Dunkelgrau: normales Licht/Schatten; Dunkelblau: außerhalb aller Kaskaden.
   * `mode` = 1: stattdessen das glatte Feld als Grauwert, rote 0,5-Isolinie (die Kante) und das Texelgitter der Karte.
   * `gap` in Welteinheiten entlang der Sonne; `plane` wie bei den Empfängern (flache Facettennormale).
   */
  contactDiagnostics(builder: NodeBuilder, options: { gap: FloatNode; epsilon: FloatNode; plane: Vec3Node; shading: Vec3Node; mode?: FloatNode }): Vec3Node {
    const pw = positionWorld as unknown as Vec3Node;
    const p = this.options.warp ? this.options.warp.node(pw) : pw;
    const depth = (positionView as unknown as Vec3Node).z.negate() as unknown as FloatNode;
    const reversed = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer === true;
    const plane = hoist(options.plane, 'vec3');
    const shading = hoist(options.shading, 'vec3');
    type Var = FloatNode & { assign(v: unknown): void };
    const fieldV = float(1).toVar() as unknown as Var;
    const rawV = float(1).toVar() as unknown as Var;
    const nearV = float(0).toVar() as unknown as Var;
    const kV = float(-1).toVar() as unknown as Var;
    const checkV = float(0).toVar() as unknown as Var;
    this.cascades.forEach((c, k) => {
      const depthTex = c.depth;
      if (!depthTex) return;
      const { uv, z, inside } = this.coordsOf(c, p);
      const a = this.cascadeWeight(k, uv, depth);
      // harte Auswahl (Diagnose zeigt die dominierende Kaskade)
      If(kV.lessThan(0).and(a.greaterThan(0.5)).and(inside.greaterThan(0.5)), () => {
        const compare = createDepthCompareZ(depthTex, c.shadow, builder, this.options.manualCompare);
        const zAt = receiverDepth({ frame: c.frame, z, plane, shading, kernelRadius: kernelRadiusOf(this.options.taps), terminatorOnly: true, reversed });
        const mapSize = mapSizeOf(c.shadow);
        fieldV.assign(bsplineField(compare, uv, mapSize, this.options.taps, zAt));
        // nächstes Texelzentrum, Punktvergleiche (LINEAR an der Texelmitte = genau dieses Texel)
        const t = floor(uv.mul(mapSize));
        const center = t.add(0.5).div(mapSize) as unknown as Vec2Node;
        const range = c.frame.range;
        const toDepth = (w: FloatNode): FloatNode => w.div(range) as unknown as FloatNode;
        const shift = (dz: FloatNode): FloatNode => (reversed ? z.add(dz) : z.sub(dz)) as unknown as FloatNode;
        rawV.assign(step(0.5, compare(center, z)));
        const occEps = float(1).sub(step(0.5, compare(center, shift(toDepth(options.epsilon)))));
        const clearGap = step(0.5, compare(center, shift(toDepth(options.gap))));
        nearV.assign(occEps.mul(clearGap));
        checkV.assign(mod(t.x.add(t.y), 2));
        kV.assign(k);
      });
    });
    // Farben nach der Verzweigung (gleichförmiger Kontrollfluss: fwidth für die Isolinie). Nur sichtbare Fälle zählen:
    // jenseits des Terminators (N·L < 0,02, Eigenschatten = Tinte) ist jeder Spalt unsichtbar
    const selfLit = step(0.02, shading.dot(this.axes.axisL));
    const litF = step(0.5, fieldV).mul(selfLit);
    const rawLit = rawV;
    const near = nearV.mul(selfLit);
    const base = mix(vec3(0.24, 0.25, 0.28), vec3(0.8, 0.8, 0.76), litF);
    // Reine, im Spiel nicht vorkommende Farben (auch zum automatischen Zählen in Screenshots)
    const gapCol = vec3(1.0, 0.0, 1.0);
    const okCol = vec3(0.0, 0.8, 0.2);
    const lostCol = vec3(0.0, 1.0, 1.0);
    const grownCol = vec3(1.0, 0.5, 0.0);
    const lost = litF.mul(rawLit.oneMinus());
    const grown = litF.oneMinus().mul(rawLit).mul(selfLit);
    let col = mix(base, grownCol, grown.mul(0.8));
    col = mix(col, lostCol, lost);
    col = mix(col, mix(okCol, gapCol, litF), near);
    // Kaskade als feine Tönung der Grautöne (1 schlicht, 2 wärmer, 3 kühler), Signalfarben bleiben rein
    const tint = select(kV.lessThan(0.5), vec3(1, 1, 1), select(kV.lessThan(1.5), vec3(1.04, 1.0, 0.94), vec3(0.94, 0.98, 1.06)));
    const signal = max(max(near, lost), grown);
    const contact = mix(col.mul(tint), col, signal);
    // Feldansicht: Grauwert, rote Isolinie bei 0,5, Texelgitter als feines Schachbrett
    const w = fwidth(fieldV).max(1e-4);
    const iso = smoothstep(w.mul(1.5), w.mul(0.5), fieldV.sub(0.5).abs());
    const fieldCol = mix(vec3(fieldV).mul(float(0.92).add(checkV.mul(0.08))), vec3(1, 0, 0), iso);
    const out = options.mode ? mix(contact, fieldCol, options.mode) : contact;
    return select(kV.lessThan(0), vec3(0.07, 0.1, 0.22), out) as unknown as Vec3Node;
  }

  /** Wird vor jedem Render des Knotens aufgerufen (einmal je Render): Refit bei Änderung, Pässe anstoßen. */
  beforeRender(frame: { camera: Camera; renderer: unknown }): void {
    const renderer = frame.renderer as { _isPreCompiling?: boolean; getDrawingBufferSize(v: Vector2): Vector2; getRenderTarget(): unknown };
    if (renderer._isPreCompiling) return;
    const camera = this.camera;
    if (!camera || frame.camera !== camera) return;
    this.preFit?.();
    // Layer der Hauptschattenkamera übernehmen (Schatten-Proxys im Flow, Brett-Layer im Grid-Lab)
    const mask = this.light.shadow.camera.layers.mask;
    for (const c of this.cascades) c.shadow.camera.layers.mask = mask;
    if (this.reference) this.reference.shadow.camera.layers.mask = mask;

    renderer.getDrawingBufferSize(_size);
    const sig = this.buildSignature(camera, _size);
    let changed = sig.length !== this.signature.length;
    if (!changed) {
      for (let i = 0; i < sig.length; i++) {
        if (Math.abs(sig[i]! - this.signature[i]!) > 1e-6 * Math.max(1, Math.abs(sig[i]!))) {
          changed = true;
          break;
        }
      }
    }
    // Koordinatensystem der Lichtkameras wie die rendernde Kamera (sonst passt die Schattenmatrix nicht zur Karte,
    // falls ein Konsument vor dem ersten Empfänger rendert)
    for (const c of this.cascades) {
      const cam = c.shadow.camera as unknown as { coordinateSystem: number; updateProjectionMatrix(): void };
      const sys = (camera as unknown as { coordinateSystem: number }).coordinateSystem;
      if (cam.coordinateSystem !== sys) {
        cam.coordinateSystem = sys;
        cam.updateProjectionMatrix();
        changed = true;
      }
    }
    if (changed) {
      this.signature = sig;
      this.refit(camera, _size);
    }
    if (this.dirty) {
      for (const c of this.cascades) if (c.active.value > 0.5) c.shadow.needsUpdate = true;
      this.passes++;
      this.dirty = false;
    }
    if (this.reference && this.referenceActive && this.referenceDirty) {
      this.reference.shadow.needsUpdate = true;
      this.referenceDirty = false;
    }
  }

  private resolveVector(v: Vector3 | Object3D | undefined, out: Vector3): Vector3 {
    if (!v) return out.set(0, 0, 0);
    if ((v as Object3D).isObject3D) return (v as Object3D).getWorldPosition(out);
    return out.copy(v as Vector3);
  }

  private buildSignature(camera: PerspectiveCamera, size: Vector2): number[] {
    const s: number[] = [];
    s.push(...camera.matrixWorld.elements, ...camera.projectionMatrix.elements, size.x, size.y);
    s.push(this.sunDir.x, this.sunDir.y, this.sunDir.z, this.anchor.x, this.anchor.y, this.anchor.z, this.casterHeight, this.lambda, this.fixedPsiDeg ?? -999);
    const r = this.receivers;
    if (r.sphere) {
      this.resolveVector(r.sphere.center, _v);
      s.push(1, _v.x, _v.y, _v.z, r.sphere.radius, r.sphere.minHeight ?? 0, r.sphere.maxHeight);
      const c = r.sphere.center as Object3D;
      if (r.sphere.surface && c.isObject3D) {
        c.getWorldQuaternion(_invQ);
        s.push(_invQ.x, _invQ.y, _invQ.z, _invQ.w);
      }
    }
    if (r.plane) {
      this.resolveVector(r.plane.origin, _v);
      s.push(2, _v.x, _v.y, _v.z, r.plane.minHeight, r.plane.maxHeight);
    }
    s.push(r.maxDistance ?? -1);
    const vols = r.volumes?.() ?? null;
    this.volumeScratch = vols;
    if (vols) for (const v of vols) s.push(3, v.center.x, v.center.y, v.center.z, v.radius);
    // nach `volumes` (der Sammler liest dabei die Höhen-Hinweise der Empfänger)
    if (r.sphere) s.push(4, r.sphere.coverTolerance ?? -1, r.sphere.coverAbove ?? -1);
    if (this.clip) s.push(...this.clip.toLocal.elements, this.clip.min.x, this.clip.min.y, this.clip.min.z, this.clip.max.x, this.clip.max.y, this.clip.max.z);
    for (const c of this.cascades) s.push(c.size.width, c.size.height);
    return s;
  }

  private refit(camera: PerspectiveCamera, size: Vector2): void {
    const r = this.receivers;
    let shell: ReceiverShellSpec | null = null;
    let slab: ReceiverSlabSpec | null = null;
    if (r.sphere) {
      shell = this.shellScratch;
      this.resolveVector(r.sphere.center, shell.center);
      shell.rMin = r.sphere.radius + (r.sphere.minHeight ?? 0);
      shell.rMax = r.sphere.radius + r.sphere.maxHeight;
      const surface = r.sphere.surface;
      const c = r.sphere.center as Object3D;
      if (surface) {
        if (c.isObject3D) c.getWorldQuaternion(_invQ);
        else _invQ.identity();
        // Neu messen, wenn sich die Kamera bewegt oder der Planet seit dem letzten Marsch merklich gedreht hat
        const camNow = [...camera.matrixWorld.elements, ...camera.projectionMatrix.elements];
        let camMoved = camNow.length !== this.marchCam.length;
        for (let i = 0; !camMoved && i < camNow.length; i++) camMoved = Math.abs(camNow[i]! - this.marchCam[i]!) > 1e-6;
        if (camMoved || this.marchQuat.angleTo(_invQ) > this.marchAngle) {
          this.surfaceEpoch++;
          this.marchQuat.copy(_invQ);
          this.marchCam.length = 0;
          this.marchCam.push(...camNow);
        }
        _invQ.invert();
        shell.surfaceEpoch = this.surfaceEpoch;
        const minR = shell.rMin;
        const maxR = shell.rMax;
        shell.surface = (dirWorld: Vector3) => Math.min(maxR, Math.max(minR, surface(_dirLocal.copy(dirWorld).applyQuaternion(_invQ))));
      } else {
        shell.surface = null;
      }
      shell.coverTolerance = r.sphere.coverTolerance ?? null;
      shell.coverAbove = r.sphere.coverAbove ?? null;
    }
    if (r.plane) {
      slab = this.slabScratch;
      this.resolveVector(r.plane.origin, slab.origin);
      slab.normal.copy(r.plane.normal ?? this.upRef).normalize();
      slab.hMin = r.plane.minHeight;
      slab.hMax = r.plane.maxHeight;
    }
    // Schlüssel im gierfreien Rahmen der Kamera: dreht die Ansicht mit Kamera und Sonne gemeinsam um die Hochachse
    // (Rig-Drehung über der Ebene, das „Rollen“ im Lab), bleibt die Lage dieselbe → ψ und die Texel der feinen
    // Kaskaden bleiben stehen (Gitter steht), wie früher beim Drehen der Kugel unter fester Kamera
    const yaw = yawFreeRotation(camera, this.upRef, _yawQ);
    _keyM.copy(camera.matrixWorld).premultiply(_yawM.makeRotationFromQuaternion(yaw));
    _keySun.copy(this.sunDir).applyQuaternion(yaw);
    const key = [..._keyM.elements, ...camera.projectionMatrix.elements, _keySun.x, _keySun.y, _keySun.z, size.x, size.y, this.fixedPsiDeg ?? -999];
    for (const c of this.cascades) key.push(c.size.width, c.size.height);
    let keepPsi = key.length === this.psiKey.length;
    for (let i = 0; keepPsi && i < key.length; i++) keepPsi = Math.abs(key[i]! - this.psiKey[i]!) <= 1e-7;
    if (!keepPsi) {
      this.psiKey.length = 0;
      this.psiKey.push(...key);
    }
    const sinEl = Math.max(0.06, Math.sin(this.elevationRad));
    const reach = Math.min(160, Math.max(4, (r.casterHeight ?? this.casterHeight) / sinEl));
    const input: FitInput = {
      camera,
      viewport: { width: size.x, height: size.y },
      shell,
      slab,
      clip: this.clip,
      maxDistance: r.maxDistance ?? camera.far,
      sunDir: this.sunDir,
      upRef: this.upRef,
      anchor: this.anchor,
      casterReach: reach,
      sizes: this.cascades.map((c) => c.size),
      lambda: this.lambda,
      padTexels: 4,
      blend: this.blend,
      fixedPsiDeg: this.fixedPsiDeg,
      keepPsi,
      lockTexels: keepPsi,
      volumes: this.volumeScratch,
      warp: this.options.warp?.cpu ?? null,
    };
    const fit = this.fitter.fit(input, this.fitResult);
    this.refits++;
    this.apply(fit);
    this.dirty = true;
  }

  private apply(fit: FitResult): void {
    this.axes.axisX.value.copy(fit.X);
    this.axes.axisY.value.copy(fit.Y);
    this.axes.axisL.value.copy(fit.L);
    const ex = fit.X.dot(fit.eye);
    const ey = fit.Y.dot(fit.eye);
    this.cascades.forEach((c, k) => {
      const cf = fit.cascades[k]!;
      c.active.value = !fit.empty && cf.active ? 1 : 0;
      if (!c.active.value) return;
      c.light.position.copy(fit.eye);
      c.light.target.position.copy(fit.eye).sub(fit.L);
      c.light.updateMatrixWorld(true);
      c.light.target.updateMatrixWorld(true);
      const cam = c.shadow.camera as unknown as { up: Vector3; left: number; right: number; top: number; bottom: number; near: number; far: number; updateProjectionMatrix(): void };
      cam.up.copy(fit.Y);
      cam.left = cf.x0 - ex;
      cam.right = cf.x1 - ex;
      cam.bottom = cf.y0 - ey;
      cam.top = cf.y1 - ey;
      cam.near = cf.near;
      cam.far = cf.far;
      cam.updateProjectionMatrix();
      c.shadow.updateMatrices(c.light as unknown as DirectionalLight);
      c.frame.texel.value.set(cf.texelX, cf.texelY);
      c.frame.range.value = Math.max(1e-3, cf.far - cf.near);
      // Hardware-Slope-Bias = Faktor × Tiefenänderung je Texel: mit der kleineren Texelkante ist der Versatz entlang jeder
      // Gradientenrichtung ≥ casterOffset/tan α (bei anisotropen Texeln sonst bis zu √(tx/ty)-fach zu klein)
      c.selfBias.slopeScale = this.casterOffset > 0 ? Math.min(400, this.casterOffset / Math.min(cf.texelX, cf.texelY)) : 0;
      this.applyCasterXf(c);
      c.split.value = cf.split;
      // Überblendband: von 2,5 Texeln (Filter-Fußabdruck) bis 4 Texel vom Rand
      c.band.value.set(2.5 / c.size.width, 4 / c.size.width, 2.5 / c.size.height, 4 / c.size.height);
    });
  }

  /**
   * Referenzkarte („Alt“) wie der alte `fitShadow`: Kamera = Lichtkamera des Hauptlichts (ψ = 0), Grenzen von außen
   * gesetzt. Der Besitzer ruft das nach seinem eigenen Fit auf.
   */
  setReferenceFrom(mainShadow: LightShadow, light: DirectionalLight): void {
    const ref = this.reference;
    if (!ref) return;
    const src = mainShadow.camera as unknown as { left: number; right: number; top: number; bottom: number; near: number; far: number };
    const cam = ref.shadow.camera as unknown as { up: Vector3; left: number; right: number; top: number; bottom: number; near: number; far: number; updateProjectionMatrix(): void; matrixWorld: { elements: number[] } };
    cam.up.set(0, 1, 0);
    cam.left = src.left;
    cam.right = src.right;
    cam.top = src.top;
    cam.bottom = src.bottom;
    cam.near = src.near;
    cam.far = src.far;
    cam.updateProjectionMatrix();
    light.getWorldPosition(_v);
    ref.light.position.copy(_v);
    light.target.getWorldPosition(_v2);
    ref.light.target.position.copy(_v2);
    ref.light.updateMatrixWorld(true);
    ref.light.target.updateMatrixWorld(true);
    ref.shadow.updateMatrices(ref.light as unknown as DirectionalLight);
    const m = cam.matrixWorld.elements;
    ref.frame.axisX.value.set(m[0]!, m[1]!, m[2]!);
    ref.frame.axisY.value.set(m[4]!, m[5]!, m[6]!);
    ref.frame.axisL.value.set(m[8]!, m[9]!, m[10]!);
    ref.frame.texel.value.set((src.right - src.left) / ref.size.width, (src.top - src.bottom) / ref.size.height);
    ref.frame.range.value = Math.max(1e-3, src.far - src.near);
    this.referenceDirty = true;
  }

  /** Bias-Feinabstimmung: geometrischer Werfer-Versatz (Selbstschatten-Objekte) und Terminator-Zusatz (Welteinheiten). */
  setBias(casterOffset: number, grazing: number): void {
    this.casterOffset = casterOffset;
    for (const c of this.cascades) {
      const t = Math.min(c.frame.texel.value.x, c.frame.texel.value.y);
      c.selfBias.slopeScale = casterOffset > 0 && t > 0 ? Math.min(400, casterOffset / t) : 0;
    }
    this.axes.grazing.value = grazing;
    this.markDirty();
  }

  /**
   * Kontakt-Einstellungen (live): Werfer-Aufweitung (Texel je Seite, 0 = aus), Kontaktversatz (Welteinheiten entlang
   * −Licht-Y, mindestens ein Texel, 0 = aus), Grundbias (Anteil einer mittleren Texelkante). Der Empfängerebenen-Bias
   * ist eine Bau-Option (`planeBias`).
   */
  setContact(options: { dilation?: number; shift?: number; baseBias?: number }): void {
    if (options.dilation !== undefined) {
      this.casterDilation = Math.max(0, options.dilation);
      this.casterSettings.dilate = this.casterDilation > 0;
    }
    if (options.shift !== undefined) {
      this.casterShift = Math.max(0, options.shift);
      this.casterSettings.shift = this.casterShift > 0;
    }
    for (const c of this.cascades) this.applyCasterXf(c);
    if (options.baseBias !== undefined) this.axes.baseBias.value = Math.max(0, options.baseBias);
    this.markDirty();
  }

  get contactSettings(): { dilation: number; shift: number; planeBias: boolean; baseBias: number } {
    return {
      dilation: this.casterSettings.dilate ? this.casterDilation : 0,
      shift: this.casterSettings.shift ? this.casterShift : 0,
      planeBias: this.options.planeBias !== false,
      baseBias: this.axes.baseBias.value,
    };
  }

  /** Werfer-Transformation einer Kaskade aus ihrer Texelgröße (Aufweitung x/y, Kontaktversatz z). */
  private applyCasterXf(c: CascadeEntry): void {
    const t = c.frame.texel.value;
    // Hub zur Sonne: Tiefenänderung des Bodens über zwei Texel entlang der Sonne (t.y / tan θ je Texel), höchstens 4 cm
    const lift = this.casterShift > 0 ? Math.min(0.04, (2 * t.y) / Math.max(0.05, Math.tan(this.elevationRad))) : 0;
    c.casterXf.value.set(this.casterDilation * t.x, this.casterDilation * t.y, this.casterShift > 0 ? Math.max(this.casterShift, t.y) : 0, lift);
  }

  get grazingBias(): number {
    return this.axes.grazing.value;
  }

  stats(): CascadedShadowStats {
    const fit = this.fitResult;
    return {
      cascades: this.cascades.map((c, k) => {
        const cf = fit.cascades[k]!;
        return { width: c.size.width, height: c.size.height, pxPerTexel: cf.pxPerTexel, split: cf.split, texelX: cf.texelX, texelY: cf.texelY, active: c.active.value > 0.5 };
      }),
      psiDeg: (fit.psi * 180) / Math.PI,
      refits: this.refits,
      passes: this.passes,
      rays: fit.rays,
      dMin: fit.dMin,
      dMax: fit.dMax,
    };
  }

  dispose(): void {
    for (const c of [...this.cascades, ...(this.reference ? [this.reference] : [])]) {
      (c.node as unknown as { dispose(): void }).dispose();
      c.shadow.dispose();
      c.target?.dispose();
    }
    (this.node as unknown as { dispose(): void }).dispose();
  }
}

let hoistCount = 0;

/**
 * Wertet einen Knoten an der aktuellen Stelle aus (Eigenschaft + Zuweisung) — vor einer Verzweigung aufgerufen, ist
 * die Variable danach überall gesetzt. three legt sonst für mehrfach genutzte Knoten eine Variable dort an, wo sie
 * zuerst gebaut werden (im ersten `If`-Zweig), und spätere Nutzer außerhalb lesen einen nie gesetzten Wert.
 */
function hoist<T>(node: T, type: 'vec3' | 'float'): T {
  const prop = property(type, `eeShadowHoist${hoistCount++}`) as unknown as { assign(v: unknown): void };
  prop.assign(node);
  return prop as unknown as T;
}

function mapSizeOf(shadow: LightShadow): Vec2Node {
  return reference('mapSize', 'vec2', shadow) as unknown as Vec2Node;
}

