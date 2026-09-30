import { DoubleSide, FrontSide, NoBlending, NodeMaterial, Object3D, Quaternion, ShadowBaseNode, ShadowNode, Vector2, Vector3, Vector4 } from 'three/webgpu';
import type { Camera, DirectionalLight, LightShadow, Node, NodeBuilder, PerspectiveCamera, Renderer, Scene, UniformNode } from 'three/webgpu';
import { Discard, Fn, If, float, fract, lightShadowMatrix, max, min, mod, floor, normalWorldGeometry, positionView, reference, screenCoordinate, shadowPositionWorld, smoothstep, step, uniform, vec4 } from 'three/tsl';
import type { FloatNode, Vec2Node, Vec3Node, Vec4Node } from '../earle/tsl';
import { CascadeFitter, createFitResult, type CascadeSize, type ClipBoxSpec, type FitInput, type FitResult, type ReceiverShellSpec, type ReceiverSlabSpec } from './fit';
import { createEarleShadowFilter, createShadowFrameUniforms, thresholdField, type ShadowFrameUniforms, type ShadowTaps } from './filters';
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
 */

export interface ViewReceivers {
  /**
   * Planetenschale: Empfänger zwischen `radius + minHeight` und `radius + maxHeight` um `center`. Mit `surface`
   * (Geländeradius für eine Richtung im lokalen Raum von `center`, z. B. `(d) => planet.surfaceRadius(d)`) werden die
   * feinen Kaskaden an geschätzte Bodenpunkte gefittet — keine Auflösung für Luft über niedrigem Gelände.
   */
  sphere?: { center: Vector3 | Object3D; radius: number; minHeight?: number; maxHeight: number; surface?: ((dirLocal: Vector3) => number) | null } | null;
  plane?: { origin?: Vector3 | Object3D; normal?: Vector3; minHeight: number; maxHeight: number } | null;
  /** Größte Blicktiefe mit Empfängern (Standard: Kamera-far). */
  maxDistance?: number;
  /** Höhe der höchsten Schattenwerfer über den Empfängern (bestimmt die Nahebene Richtung Sonne). */
  casterHeight?: number;
}

export interface CascadedShadowsOptions {
  sizes: CascadeSize[];
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
 */
class TerminatorShadowNode extends ShadowNode {
  private wrapped: RenderObjectFn | null = null;
  private wrappedBase: RenderObjectFn | null = null;
  private biasMaterial: NodeMaterial | null = null;
  private smoothMaterial: NodeMaterial | null = null;
  private smoothBiasMaterial: NodeMaterial | null = null;

  constructor(
    light: DirectionalLight,
    shadow: LightShadow,
    private readonly selfBias: SelfShadowBias,
    private readonly casters: CasterSettings,
    private readonly sunDir: UniformNode<'vec3', Vector3>,
  ) {
    super(light, shadow);
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

  /** Nur Werfer-Bias (Schattenpass-Material: three setzt Seite/Position wie üblich). */
  private getBiasMaterial(): NodeMaterial {
    let m = this.biasMaterial;
    if (!m) {
      m = new NodeMaterial();
      m.colorNode = vec4(0, 0, 0, 1);
      (m as unknown as { isShadowPassMaterial: boolean }).isShadowPassMaterial = true;
      m.name = 'EarleShadowSelfBias';
      m.blending = NoBlending;
      m.fog = false;
      this.biasMaterial = m;
    }
    this.applyBias(m);
    return m;
  }

  /**
   * Beidseitig, verwirft Fragmente mit N_Schattierung·L > 0. Bewusst *kein* Schattenpass-Material: sonst setzt three
   * die Seite zurück auf die Rückseite (die Position übernimmt three trotzdem vom Objektmaterial).
   */
  private getSmoothMaterial(withBias: boolean): NodeMaterial {
    let m = withBias ? this.smoothBiasMaterial : this.smoothMaterial;
    if (!m) {
      m = new NodeMaterial();
      const L = this.sunDir;
      m.colorNode = Fn(() => {
        If((normalWorldGeometry as unknown as Vec3Node).dot(L).greaterThan(0), () => {
          Discard();
        });
        return vec4(0, 0, 0, 1);
      })() as unknown as Vec4Node;
      m.side = DoubleSide;
      m.name = withBias ? 'EarleShadowTerminatorBias' : 'EarleShadowTerminator';
      m.blending = NoBlending;
      m.fog = false;
      if (withBias) this.smoothBiasMaterial = m;
      else this.smoothMaterial = m;
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
        const mat = material as { side?: number; shadowSide?: number | null; castShadowPositionNode?: unknown; flatShading?: boolean; isNodeMaterial?: boolean } | null;
        const self = object.receiveShadow === true && (object.userData as { shadowSelfBias?: boolean }).shadowSelfBias !== false;
        const smooth =
          this.casters.smooth &&
          mat?.isNodeMaterial === true &&
          mat.side === FrontSide &&
          (mat.shadowSide === null || mat.shadowSide === undefined) &&
          !mat.castShadowPositionNode &&
          mat.flatShading !== true &&
          (object.userData as { shadowSmooth?: boolean }).shadowSmooth !== false;
        let override: NodeMaterial | null = null;
        if (smooth) override = this.getSmoothMaterial(self);
        else if (self && this.selfBias.slopeScale > 0) override = this.getBiasMaterial();
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
    this.biasMaterial?.dispose();
    this.smoothMaterial?.dispose();
    this.smoothBiasMaterial?.dispose();
    this.biasMaterial = this.smoothMaterial = this.smoothBiasMaterial = null;
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
  private readonly fitter = new CascadeFitter();
  private readonly axes: Pick<ShadowFrameUniforms, 'axisX' | 'axisY' | 'axisL' | 'grazing'>;
  private signature: number[] = [];
  private dirty = true;
  private referenceDirty = true;
  private readonly shellScratch: ReceiverShellSpec = { center: new Vector3(), rMin: 0, rMax: 1 };
  private readonly slabScratch: ReceiverSlabSpec = { origin: new Vector3(), normal: new Vector3(0, 1, 0), hMin: 0, hMax: 1 };
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
  /** Glatte Terminator-Silhouetten im Schattenpass (live umschaltbar, wirkt ab dem nächsten Pass). */
  readonly casterSettings: CasterSettings = { smooth: true };

  constructor(
    readonly light: DirectionalLight,
    readonly options: CascadedShadowsOptions,
  ) {
    this.lambda = options.lambda ?? 0.72;
    this.blend = options.blend ?? 0.14;
    this.casterOffset = options.casterOffset ?? 0.04;
    this.casterSettings.smooth = options.smoothCasters ?? true;
    const shared = createShadowFrameUniforms();
    this.axes = { axisX: shared.axisX, axisY: shared.axisY, axisL: shared.axisL, grazing: shared.grazing };
    for (const size of options.sizes) this.cascades.push(this.createEntry(size, options.taps, 'field', this.axes));
    if (options.referenceSize) {
      const s = options.referenceSize;
      this.reference = this.createEntry({ width: s, height: s }, 1, 'threshold', null, options.referenceFilter);
    }
    this.fitResult = createFitResult(options.sizes.length);
    this.node = new EarleCascadeNode(light, this);
  }

  private createEntry(size: CascadeSize, taps: ShadowTaps, output: 'field' | 'threshold', axes: Pick<ShadowFrameUniforms, 'axisX' | 'axisY' | 'axisL' | 'grazing'> | null, filter?: unknown): CascadeEntry {
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
      filter ?? createEarleShadowFilter({ frame, taps, output, terminatorOnly: true, ...(this.options.manualCompare !== undefined ? { manualCompare: this.options.manualCompare } : {}) });
    const light = new CascadeLight(shadow);
    light.name = `EarleCascade${this.cascades.length}`;
    const selfBias: SelfShadowBias = { slopeScale: 0, units: 0 };
    const node = (filter
      ? new ShadowNode(light as unknown as DirectionalLight, shadow)
      : new TerminatorShadowNode(light as unknown as DirectionalLight, shadow, selfBias, this.casterSettings, this.axes.axisL)) as unknown as Node;
    return { light, shadow, node, frame, split: uniform(0), active: uniform(0), band: uniform(new Vector4(0.002, 0.004, 0.002, 0.004)), size, selfBias };
  }

  /** Inhalt geändert (Planet gerollt, Wachstum, Werfer bewegt): alle Karten neu rendern. */
  markDirty(): void {
    this.dirty = true;
    this.referenceDirty = true;
  }

  /** TSL-Graph: Auswahl/Überblendung der Kaskaden, eine harte Schwelle am Ende, Debug-Muster. */
  setupNode(node: EarleCascadeNode, builder: NodeBuilder): Node {
    const cascades = this.cascades;
    const reference = this.reference;
    const useReference = this.useReference;
    const debugMode = this.debugMode;
    const blend = this.blend;
    return Fn(() => {
      node.setupShadowPosition(builder);
      const p = vec4(shadowPositionWorld as unknown as Vec3Node, 1) as unknown as Vec4Node;
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
        const last = k === cascades.length - 1;
        const uv = (lightShadowMatrix(c.light as unknown as DirectionalLight) as unknown as { mul(v: unknown): Vec4Node }).mul(p).xy as unknown as Vec2Node;
        const inside = min(min(uv.x, uv.y), min(uv.x.oneMinus(), uv.y.oneMinus())) as unknown as FloatNode;
        let a: FloatNode;
        if (last) {
          a = step(0, inside).mul(c.active) as unknown as FloatNode;
        } else {
          const b = c.band as unknown as Vec4Node;
          const ex = smoothstep(b.x, b.y, min(uv.x, uv.x.oneMinus()));
          const ey = smoothstep(b.z, b.w, min(uv.y, uv.y.oneMinus()));
          const rect = min(ex, ey);
          const far = smoothstep(c.split.mul(1 - blend), c.split, depth).oneMinus();
          a = rect.mul(far).mul(c.active) as unknown as FloatNode;
        }
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
    }
    if (r.plane) {
      slab = this.slabScratch;
      this.resolveVector(r.plane.origin, slab.origin);
      slab.normal.copy(r.plane.normal ?? this.upRef).normalize();
      slab.hMin = r.plane.minHeight;
      slab.hMax = r.plane.maxHeight;
    }
    const key = [...camera.matrixWorld.elements, ...camera.projectionMatrix.elements, this.sunDir.x, this.sunDir.y, this.sunDir.z, size.x, size.y, this.fixedPsiDeg ?? -999];
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
    }
    (this.node as unknown as { dispose(): void }).dispose();
  }
}

function mapSizeOf(shadow: LightShadow): Vec2Node {
  return reference('mapSize', 'vec2', shadow) as unknown as Vec2Node;
}
