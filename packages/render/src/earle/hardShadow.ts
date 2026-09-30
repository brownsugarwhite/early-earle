import { Box3, DirectionalLight, Matrix4, Object3D, Vector3 } from 'three/webgpu';
import type { DepthTexture, LightShadow, NodeBuilder, PerspectiveCamera, UniformNode } from 'three/webgpu';
import { Fn, fwidth, lightTargetDirection, normalView, smoothstep, uniform } from 'three/tsl';
import type { FloatNode, Vec2Node, Vec3Node } from './tsl';
import { CascadedShadows, type CascadeSampleOptions, type CascadedShadowStats, type ShadowWarp, type ViewReceivers } from '../shadow/CascadedShadows';
import type { DisplayMapping } from './display';
import { shadowFactorNode, type ShadowFactorSource } from '../shadow/shadowFactor';
import { ShadowTint } from '../shadow/shadowTint';
import { createDefaultShadowFilter, createDepthCompare, createEarleShadowFilter, createShadowFrameUniforms, type ShadowFrameUniforms, type ShadowTaps } from '../shadow/filters';
import type { CascadeSize, ReceiverVolume } from '../shadow/fit';
import { PlanetVolumeCollector } from '../shadow/volumes';
import { needsManualDepthCompare, type ManualCompareOption } from '../shadow/webglCompat';

/**
 * Alter nachschärfender Schattenfilter (P2, bleibt als Export und als „Alt“-Referenz erhalten).
 * Ein Vergleichs-Tap über den Hardware-Compare-Sampler (LINEAR → 2×2-PCF-Rampe), danach `smoothstep(0.5 ± ½·fwidth)`.
 * Nur „vektorhaft“, solange ein Schattentexel ≲ 1–2 Bildschirmpixel ist — sonst Treppen (siehe `shadow/filters.ts`).
 */
export function createHardShadowFilter(light: DirectionalLight, depthPerTexel: UniformNode<'float', number>, manualCompare?: ManualCompareOption) {
  return Fn((inputs: { depthTexture: DepthTexture; shadowCoord: Vec3Node; shadow: LightShadow }, builder: NodeBuilder) => {
    const { depthTexture, shadowCoord, shadow } = inputs;
    const ndl = normalView.dot(lightTargetDirection(light)).clamp(0.04, 1);
    const tanTheta = ndl.mul(ndl).oneMinus().max(0).sqrt().div(ndl).clamp(1, 20);
    const slopeBias = depthPerTexel.mul(tanTheta).mul(2.0);
    const reversed = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer === true;
    const z = (reversed ? shadowCoord.z.add(slopeBias) : shadowCoord.z.sub(slopeBias)) as unknown as FloatNode;
    // Ein bilinearer Vergleich (Hardware-PCF; ohne funktionierende Vergleichs-Sampler manuell, siehe shadow/webglCompat)
    const r = createDepthCompare(depthTexture, shadow, z, builder, manualCompare)(shadowCoord.xy as unknown as Vec2Node);
    const w = fwidth(r).mul(0.5).clamp(1 / 256, 0.5);
    return smoothstep(w.oneMinus().sub(0.5), w.add(0.5), r);
  });
}

/** Kaskaden-Stufen: Kartengrößen je Kaskade (fein → grob). */
export type ShadowCascadePreset = 'hoch' | 'mobil' | 'ultra';

/**
 * Kaskaden je Preset. Nicht-quadratisch, weil die Lichtbasis per ψ so gedreht wird, dass die lange Kante der Karte
 * in die Richtung zeigt, in der ein Texel auf dem Bildschirm am größten wäre (flache Sonne: 1/sin θ-Streckung).
 */
export const SHADOW_CASCADE_PRESETS: Record<ShadowCascadePreset, CascadeSize[]> = {
  ultra: [
    { width: 2048, height: 4096 },
    { width: 2048, height: 2048 },
    { width: 2048, height: 2048 },
  ],
  hoch: [
    { width: 1024, height: 4096 },
    { width: 1024, height: 2048 },
    { width: 1024, height: 2048 },
  ],
  // Mobil (Schatten v3): zwei gleich große Karten — mit der bodengefitteten gröbsten Kaskade fällt die ferne Stufe in der
  // Hochformat-Karte von ≈ 17 auf ≈ 6 px je Texel (vorher 1024², über 45 × 35 Einheiten Luft gespannt)
  mobil: [
    { width: 1024, height: 2048 },
    { width: 1024, height: 2048 },
  ],
};

/** Preset aus der alten Kartenkante (2048 → Hoch, ≤ 1024 → Mobil, ≥ 4096 → Ultra). */
export function cascadePresetForMapSize(mapSize: number): ShadowCascadePreset {
  return mapSize >= 4096 ? 'ultra' : mapSize >= 2048 ? 'hoch' : 'mobil';
}

export interface SunOptions {
  mapSize?: number;
  /** Nachschärfender Filter an (true) oder three-Standard-PCF (false, Vergleich). */
  sharpen?: boolean;
  elevationDeg?: number;
  /** Azimut relativ zur Blickachse (0 = hinter der Kamera Richtung -Z, 90 = rechts). */
  azimuthDeg?: number;
  bias?: number;
  normalBias?: number;
  /** Abstand Licht ↔ Ziel (nur für die Schattenkamera relevant). */
  distance?: number;
  /**
   * Rekonstruktion der Kante: 1 = alt (bilinear), 4 = kubischer B-Spline, 9 = quintischer B-Spline.
   * Standard: 9 bei Hoch/Ultra-Kaskaden, 4 bei Mobil und für die Einzelkarte.
   */
  taps?: ShadowTaps;
  /** Kaskaden für `fitToView` (Preset oder eigene Größen). Standard: aus `mapSize`. */
  cascades?: ShadowCascadePreset | CascadeSize[];
  /** Referenzkarte „Alt“ mitführen (A/B-Vergleich im Schatten-Lab). */
  reference?: boolean;
  /**
   * Glatte Terminator-Silhouetten (Kaskaden): glatt schattierte, einseitige Werfer werfen den Schatten ihrer glatten
   * dunklen Seite statt ihrer Dreieckskanten (keine Geländetreppen, keine Facetten-Akne). Standard an.
   */
  smoothCasters?: boolean;
  /**
   * Tiefe ohne Vergleichs-Sampler lesen und im Shader vergleichen (true/false). Standard: automatisch — nur im
   * WebGL2-Rückfall, wenn der Vergleichs-Sampler-Test fehlschlägt (iOS-Simulator: jeder Vergleich liefert 0 → alles
   * Tinte). Siehe `shadow/webglCompat.ts`.
   */
  manualCompare?: boolean;
}

/** Empfänger für `fitToView`: Planetenschale oder Bodenplatte (Welt), plus Werferhöhe. */
export type SunViewReceivers = ViewReceivers;

/** Was `planetShadowReceivers` vom Planeten braucht (strukturell, passt auf `EarlePlanet`). */
export interface ShadowPlanetLike {
  readonly options: { radius: number };
  readonly field: { hMax: number };
  readonly curvature: { value: number };
  readonly lookDirLocal: { value: Vector3 };
  surfaceRadius(dirLocal: Vector3): number;
}

/** Toleranz der bodengefitteten gröbsten Kaskade um den geschätzten Boden (Welteinheiten). */
export const PLANET_COVER_TOLERANCE = 1.2;

/**
 * Empfänger für einen Earle-Planeten (Ein-Zeilen-Integration):
 * `sun.fitToView(camera, planetShadowReceivers(() => this.world, this.planet))`.
 * Schale = Radius + [−Krümmungs-Warp, hMax], Bodenschätzung aus dem analytischen Feld inklusive desselben Warps wie im
 * Vertex-Shader (ferne Erde sinkt um (1 − cos θ)·c·R). `planet` darf ein Getter sein (Labs bauen die Welt neu).
 *
 * Schatten v3: alle Kaskaden sitzen am Boden (± `coverTolerance`, Standard `PLANET_COVER_TOLERANCE`); Empfänger, die
 * deutlich darüber aufragen (Riesenbaum-Holz und -Kuppeln, Scheune), sammelt `PlanetVolumeCollector` je Refit als grobe
 * Kugelhülle ein (`shadow/volumes.ts`: nur die Teile über dem Bodenband; flache, weite Schichten, große Instanz-Streu
 * und Geländechunks nicht). `userData.shadowVolume = true | false` erzwingt bzw. verbietet ein Volumen,
 * `userData.shadowGround = true` markiert Gelände. Verteilte hohe Empfänger (Wald mit Schlagschatten auf den Kronen)
 * melden ihre Höhe mit `userData.shadowHeight = h` → die gröbste Kaskade deckt auch Boden + h ab (`coverAbove`).
 */
export function planetShadowReceivers(
  planet: ShadowPlanetLike | (() => ShadowPlanetLike | null | undefined),
  planetObject: Object3D,
  options: PlanetReceiverOptions = {},
): ViewReceivers {
  const get = typeof planet === 'function' ? planet : () => planet;
  const coverTolerance = options.coverTolerance ?? PLANET_COVER_TOLERANCE;
  const collector = new PlanetVolumeCollector();
  const sphere = {
    center: planetObject,
    get radius(): number {
      return get()?.options.radius ?? 1;
    },
    get minHeight(): number {
      const p = get();
      return p ? -0.3 - p.curvature.value * p.options.radius * 0.45 : 0;
    },
    get maxHeight(): number {
      return (get()?.field.hMax ?? 0) + 0.3;
    },
    coverTolerance,
    get coverAbove(): number {
      return Math.max(options.coverAbove ?? 0, collector.receiverHeight);
    },
    surface: (dirLocal: Vector3): number => {
      const p = get();
      if (!p) return 1;
      const r = p.surfaceRadius(dirLocal);
      const c = p.curvature.value;
      if (c <= 0) return r;
      const away = Math.min(2, Math.max(0, 1 - dirLocal.dot(p.lookDirLocal.value)));
      return r - away * c * p.options.radius;
    },
  };
  const volumes = (): ReceiverVolume[] => collector.collect(planetObject, get() ?? null, coverTolerance);
  return { sphere, volumes };
}

/** Was die Schatten von der unendlichen Welt brauchen (strukturell, passt auf `EarlePlanet`). */
export interface ShadowDisplayLike {
  readonly mapping: DisplayMapping;
  readonly focus: { x: number; z: number };
  readonly field: { hMax: number; heightAt(x: number, z: number): number };
}

/** Verzug Anzeige ↔ Schattenraum (flache Ebene) einer Anzeige-Abbildung. */
export function displayShadowWarp(mapping: DisplayMapping): ShadowWarp {
  return {
    node: (p) => mapping.toFlat(p),
    cpu: { toShadow: (p) => mapping.toFlatCpu(p, p), toView: (p) => mapping.toDisplayCpu(p, p) },
  };
}

/**
 * Empfänger der unendlichen Welt (ADR 0002): Schale um die Anzeigekugel, Bodenschätzung je Blickrichtung aus dem
 * Höhenfeld der Ebene (dieselbe Abbildung wie im Vertex-Shader, mit dem Krümmungs-Boost), Volumen der hohen Empfänger
 * (Riesenbaum, Felsen, Scheunen) im flachen Schattenraum.
 */
export function displayShadowReceivers(world: ShadowDisplayLike | (() => ShadowDisplayLike | null | undefined), planeObject: Object3D, options: PlanetReceiverOptions = {}): ViewReceivers {
  const get = typeof world === 'function' ? world : () => world;
  const coverTolerance = options.coverTolerance ?? PLANET_COVER_TOLERANCE;
  const collector = new PlanetVolumeCollector();
  const origin = new Object3D();
  const sphere = {
    center: origin,
    get radius(): number {
      return get()?.mapping.radius.value ?? 1;
    },
    get minHeight(): number {
      const w = get();
      // ferne Erde sinkt mit dem Krümmungs-Boost (bis ≈ 0,45 · c · R bei 90°)
      return w ? -0.3 - w.mapping.curvature.value * w.mapping.radius.value * 0.6 : 0;
    },
    get maxHeight(): number {
      return (get()?.field.hMax ?? 0) + 0.3;
    },
    coverTolerance,
    get coverAbove(): number {
      return Math.max(options.coverAbove ?? 0, collector.receiverHeight);
    },
    surface: (dir: Vector3): number => {
      const w = get();
      if (!w) return 1;
      const R = w.mapping.radius.value;
      const c = w.mapping.curvature.value;
      const rxz = Math.hypot(dir.x, dir.z);
      const alpha = Math.atan2(rxz, dir.y);
      const k = rxz > 1e-9 ? (alpha * R) / rxz : 0;
      const h = w.field.heightAt(w.focus.x + dir.x * k, w.focus.z + dir.z * k);
      return R + h - (1 - Math.cos(alpha)) * c * R;
    },
  };
  const volumes = (): ReceiverVolume[] => {
    const w = get();
    return collector.collect(planeObject, w ? { heightAt: (x, z) => w.field.heightAt(x, z), focus: w.focus } : null, coverTolerance);
  };
  return { sphere, volumes };
}

/** Optionen für `planetShadowReceivers` / `SunRig.fitToPlanet`. */
export interface PlanetReceiverOptions {
  /** Halbe Höhe des Bodenbands (Standard `PLANET_COVER_TOLERANCE`). */
  coverTolerance?: number;
  /** Mindesthöhe verteilter Empfänger über dem Boden (sonst nur die `userData.shadowHeight`-Hinweise). */
  coverAbove?: number;
}

const _corner = new Vector3();
const _min = new Vector3();
const _max = new Vector3();
const _m = new Matrix4();

/**
 * Sonne als Kind des Kamera-Rigs: flache Höhe (≈10°), 60–80° seitlich, damit Schatten als lange Bänder über den
 * Bildschirm laufen. `shadow.autoUpdate = false` — der Schattenpass läuft nur nach `requestUpdate()`.
 *
 * Zwei Betriebsarten, gleiche API:
 * - **Einzelkarte** (Standard, alte Konsumenten): `fitShadow()` fittet eine Karte über die übergebene Box, der
 *   Filter rekonstruiert die Kante als B-Spline und schneidet auf 1 px (Treppen → glatte Kurven).
 * - **Kamera-Kaskaden** (nach `fitToView(camera, receivers)`, einmal aufrufen genügt): 2–3 verschachtelte,
 *   nicht-quadratische Karten, eng an den sichtbaren Empfängerbereich gefittet (Kamerafrustum ∩ Planetenschale),
 *   Lichtbasis um ψ gedreht; Refit automatisch, wenn sich Kamera/Sonne bewegen. `fitShadow()` wirkt dann als
 *   Clip-Box (z. B. Brett-Fokus im Flow), `requestUpdate()` rendert alle Kaskaden neu.
 */
export class SunRig implements ShadowFactorSource {
  readonly root = new Object3D();
  readonly target = new Object3D();
  light!: DirectionalLight;
  elevationDeg: number;
  azimuthDeg: number;
  sharpen: boolean;
  mapSize: number;
  taps: ShadowTaps;
  private readonly bias: number;
  private readonly normalBias: number;
  private readonly distance: number;
  /**
   * Schattentönung je Welt (Haken für die Material-Besitzer, z. B. blaue Schatten auf Schnee): siehe `ShadowTint`.
   * Überlebt Neubauten des Lichts (reine Uniforms).
   */
  readonly shadowTint = new ShadowTint(16);
  /** Tiefe je Schattentexel (normalisiert), aus fitShadow; Basis des steigungsabhängigen Bias (alter Filter). */
  readonly depthPerTexel = uniform(0.0005);
  /** Zähler der gerenderten Schattenpässe (zur Kontrolle "nicht im Leerlauf"). */
  updatesRequested = 0;
  /** Lichtraum-Uniforms der Einzelkarte (Bias des neuen Filters). */
  private readonly frame: ShadowFrameUniforms = createShadowFrameUniforms();
  private cascadeSizes: CascadeSize[];
  private readonly cascadeOverride: boolean;
  private wantReference: boolean;
  private cascaded: CascadedShadows | null = null;
  private viewCamera: PerspectiveCamera | null = null;
  private viewReceivers: ViewReceivers = {};
  private lastClip: { bounds: Box3; matrix: Matrix4; hTotal: number } | null = null;
  private debugMode = 0;
  private referenceOn = false;
  private fixedPsiDeg: number | null = null;
  private biasTuning = { casterOffset: 0.04, grazing: 0.006 };
  private contactTuning: { dilation: number; shift: number; planeBias: boolean; baseBias: number } = { dilation: 0.6, shift: 0.03, planeBias: true, baseBias: 0.25 };
  /** Materialien mit `shadowFactor()`-Knoten: nach einem Kaskaden-Neubau neu bauen (neue Karten binden). */
  private readonly shadowConsumers = new Set<{ needsUpdate: boolean; addEventListener?(type: string, fn: () => void): void }>();
  private smoothCasters: boolean;
  private tapsOverride: ShadowTaps | null;
  private manualCompare: boolean | null;
  /** Verzug Anzeige ↔ Schattenraum (unendliche Ebene) oder null. */
  private warp: ShadowWarp | null = null;

  constructor(options: SunOptions = {}) {
    this.root.name = 'SunRig';
    this.target.name = 'SunTarget';
    this.root.add(this.target);
    this.mapSize = options.mapSize ?? 2048;
    this.sharpen = options.sharpen ?? true;
    this.elevationDeg = options.elevationDeg ?? 10;
    this.azimuthDeg = options.azimuthDeg ?? 70;
    this.bias = options.bias ?? -0.0006;
    this.normalBias = options.normalBias ?? 0.04;
    this.distance = options.distance ?? 80;
    this.tapsOverride = options.taps ?? null;
    this.taps = this.tapsOverride ?? 4;
    this.cascadeOverride = options.cascades !== undefined;
    this.cascadeSizes = resolveCascades(options.cascades, this.mapSize);
    this.wantReference = options.reference ?? false;
    this.smoothCasters = options.smoothCasters ?? true;
    this.manualCompare = options.manualCompare ?? null;
    this.rebuild();
  }

  /** Kaskaden aktiv (Kamera gebunden und Filter an)? */
  get cascadedActive(): boolean {
    return this.cascaded !== null;
  }

  /** Erzeugt das Licht neu (neue UUID → Materialien kompilieren mit dem anderen Filter neu). */
  private rebuild(): void {
    let layersMask: number | null = null;
    if (this.light) {
      layersMask = this.light.shadow.camera.layers.mask;
      this.root.remove(this.light);
      this.cascaded?.dispose();
      this.cascaded = null;
      this.light.dispose();
    }
    const light = new DirectionalLight(0xffffff, 1);
    light.name = 'EarleSun';
    light.castShadow = true;
    light.shadow.mapSize.set(this.mapSize, this.mapSize);
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    light.shadow.bias = this.bias;
    light.shadow.normalBias = this.normalBias;
    light.shadow.radius = 1;
    if (layersMask !== null) light.shadow.camera.layers.mask = layersMask;
    light.target = this.target;
    this.root.add(light);
    this.light = light;
    const shadow = light.shadow as unknown as { filterNode: unknown; shadowNode?: unknown };
    const cascadedMode = this.sharpen && this.viewCamera !== null;
    // Kante: quintisch (9 Taps) bei großen Kaskaden, kubisch (4) bei Mobil und auf der Einzelkarte
    this.taps = this.tapsOverride ?? (cascadedMode && this.cascadeSizes.length >= 3 ? 9 : 4);
    if (cascadedMode) {
      const cascaded = new CascadedShadows(light, {
        sizes: this.cascadeSizes,
        warp: this.warp,
        taps: this.taps,
        referenceSize: this.wantReference ? this.mapSize : null,
        referenceFilter: createHardShadowFilter(light, this.depthPerTexel, this.manualCompareFn),
        manualCompare: this.manualCompareFn,
        smoothCasters: this.smoothCasters,
        planeBias: this.contactTuning.planeBias,
      });
      cascaded.camera = this.viewCamera;
      cascaded.receivers = this.viewReceivers;
      cascaded.debugMode.value = this.debugMode;
      cascaded.useReference.value = this.referenceOn ? 1 : 0;
      cascaded.referenceActive = this.wantReference;
      cascaded.fixedPsiDeg = this.fixedPsiDeg;
      cascaded.preFit = () => this.syncCascadedFrame();
      cascaded.setBias(this.biasTuning.casterOffset, this.biasTuning.grazing);
      cascaded.setContact(this.contactTuning);
      shadow.shadowNode = cascaded.node;
      shadow.filterNode = null;
      this.cascaded = cascaded;
    } else {
      shadow.filterNode = this.sharpen
        ? createEarleShadowFilter({
            frame: this.frame,
            taps: this.taps,
            output: 'threshold',
            manualCompare: this.manualCompareFn,
            ...(this.contactTuning.planeBias ? {} : { plane: null, legacyBias: true }),
          })
        : createDefaultShadowFilter(this.manualCompareFn);
    }
    this.applyAngles();
    if (this.lastClip) this.fitShadow(this.lastClip.bounds, this.lastClip.matrix, this.lastClip.hTotal);
    else if (this.cascaded && this.casterHeightFree !== null) this.cascaded.casterHeight = this.casterHeightFree;
    // Konsumenten von `shadowFactor()` binden sonst weiter die alten Karten
    for (const m of this.shadowConsumers) m.needsUpdate = true;
  }

  setSharpen(sharpen: boolean): void {
    if (sharpen === this.sharpen) return;
    this.sharpen = sharpen;
    this.rebuild();
  }

  /** Rekonstruktion der Kante: 1 (alt, bilinear), 4 (kubischer B-Spline), 9 (quintischer B-Spline), null = automatisch. */
  setTaps(taps: ShadowTaps | null): void {
    if (taps === this.tapsOverride) return;
    this.tapsOverride = taps;
    this.rebuild();
  }

  /**
   * Schattenkarte umschalten (z. B. 2048 → 1024 auf dem Handy). Baut das Licht neu statt das Render-Target in
   * place zu skalieren: nach `RenderTarget.setSize` blieb der Schattenpass in r186 dauerhaft ~3 ms langsamer.
   * Im Kaskadenbetrieb wählt die Kante das Preset (2048 → Hoch, 1024 → Mobil), sofern keine Kaskaden vorgegeben sind.
   */
  setMapSize(size: number): void {
    if (size === this.mapSize) return;
    this.mapSize = size;
    if (!this.cascadeOverride) this.cascadeSizes = resolveCascades(undefined, size);
    this.rebuild();
  }

  /** Kaskadengrößen setzen (Preset oder Liste); baut neu. */
  setCascades(cascades: ShadowCascadePreset | CascadeSize[]): void {
    this.cascadeSizes = resolveCascades(cascades, this.mapSize);
    if (this.cascaded) this.rebuild();
  }

  get cascadeSizesCurrent(): CascadeSize[] {
    return this.cascadeSizes.map((s) => ({ ...s }));
  }

  /**
   * Kamera-gefittete Kaskaden einschalten (einmal aufrufen genügt; erneuter Aufruf aktualisiert nur die Empfänger).
   * `receivers.sphere`: Planet (Mittelpunkt als Objekt oder Weltpunkt, Radius, Geländehöhen), `receivers.plane`:
   * flache Bühne. Ohne Empfänger dient die `fitShadow`-Box als Empfängervolumen. `null` schaltet zurück auf die
   * Einzelkarte.
   */
  fitToView(camera: PerspectiveCamera | null, receivers: ViewReceivers = {}): void {
    this.viewReceivers = receivers;
    if (camera === this.viewCamera) {
      if (this.cascaded) this.cascaded.receivers = receivers;
      return;
    }
    const wasBound = this.viewCamera !== null;
    this.viewCamera = camera;
    if (this.cascaded && camera) {
      this.cascaded.camera = camera;
      this.cascaded.receivers = receivers;
      return;
    }
    if (wasBound !== (camera !== null)) this.rebuild();
  }

  /**
   * Ein-Zeilen-Integration für die Planetenkarte: Kaskaden an `camera`, Empfänger = Planetenschale mit Bodenschätzung
   * aus dem analytischen Feld (inkl. Krümmungs-Warp). `planet` darf ein Getter sein, wenn die Welt neu gebaut wird.
   * `options.coverTolerance`: halbe Höhe des Bodenbands (Standard `PLANET_COVER_TOLERANCE`); `options.coverAbove`:
   * Mindesthöhe verteilter Empfänger (Kronen mit Schlagschatten) — sonst genügt `userData.shadowHeight` am Mesh.
   */
  fitToPlanet(
    camera: PerspectiveCamera,
    planet: ShadowPlanetLike | (() => ShadowPlanetLike | null | undefined),
    planetObject: Object3D,
    options: PlanetReceiverOptions = {},
  ): void {
    this.fitToView(camera, planetShadowReceivers(planet, planetObject, options));
  }

  /**
   * Ein-Zeilen-Integration für die unendliche Welt (ADR 0002): Kaskaden an `camera`, Schatten in der flachen Ebene
   * (Werfer und Empfänger über die Umkehr-Abbildung), Empfänger = Anzeigekugel mit Bodenschätzung aus der Ebene,
   * Volumen der hohen Empfänger aus `planeObject`.
   */
  fitToDisplay(camera: PerspectiveCamera, world: ShadowDisplayLike | (() => ShadowDisplayLike | null | undefined), planeObject: Object3D, options: PlanetReceiverOptions = {}): void {
    const w = typeof world === 'function' ? world() : world;
    let rebuild = false;
    if (w && this.warpMapping !== w.mapping) {
      this.warp = displayShadowWarp(w.mapping);
      this.warpMapping = w.mapping;
      rebuild = true;
    }
    this.viewReceivers = displayShadowReceivers(world, planeObject, options);
    this.viewCamera = camera;
    if (rebuild || !this.cascaded) this.rebuild();
    else {
      this.cascaded.camera = camera;
      this.cascaded.receivers = this.viewReceivers;
    }
  }

  private warpMapping: DisplayMapping | null = null;

  /**
   * Kaskaden ohne Clip-Box (unendliche Ebene: die Empfänger sind die sichtbare Kugel, geladen ist, was man sieht), nur
   * die Werferhöhe. Hebt eine Clip-Box (Brett-Fokus) wieder auf.
   */
  setCasterHeight(hTotal: number): void {
    this.lastClip = null;
    this.casterHeightFree = hTotal;
    if (this.cascaded) {
      this.cascaded.clip = null;
      this.cascaded.casterHeight = hTotal;
    }
  }

  private casterHeightFree: number | null = null;

  /** Verzug (Ebene) aufheben — alte Konsumenten ohne Anzeige-Abbildung. */
  clearWarp(): void {
    if (!this.warp) return;
    this.warp = null;
    this.warpMapping = null;
    this.rebuild();
  }

  /** Debug-Darstellung: 0 aus, 1 Kaskadenmuster, 2 Texelgitter. */
  setDebug(mode: 0 | 1 | 2): void {
    this.debugMode = mode;
    if (this.cascaded) this.cascaded.debugMode.value = mode;
  }

  /**
   * Referenzkarte („Alt“ = P2-Verfahren: eine Karte über die `fitShadow`-Box, 1 Tap) mitführen. Baut einmal neu,
   * danach ist `showReference()` ein reiner Uniform-Schalter (Split-Ansicht ohne Neukompilieren).
   */
  setReferenceEnabled(on: boolean): void {
    if (on === this.wantReference) return;
    this.wantReference = on;
    if (!on) this.referenceOn = false;
    if (this.cascaded) this.rebuild();
  }

  get referenceEnabled(): boolean {
    return this.wantReference && this.cascaded?.reference != null;
  }

  /** Referenz („Alt“) statt Kaskaden zeigen — nur Uniform, kein Neubau (braucht `setReferenceEnabled(true)`). */
  showReference(on: boolean): void {
    if (on === this.referenceOn) return;
    this.referenceOn = on;
    if (this.cascaded) {
      this.cascaded.useReference.value = on ? 1 : 0;
      if (on && !this.cascaded.referenceActive) {
        this.cascaded.referenceActive = true;
        this.cascaded.markDirty();
      }
    }
  }

  /** Referenzkarte bei jedem Schattenpass mitrendern (Split-Ansicht Alt | Neu). */
  keepReference(on: boolean): void {
    if (!this.cascaded) return;
    const was = this.cascaded.referenceActive;
    this.cascaded.referenceActive = on;
    if (on && !was) this.cascaded.markDirty();
  }

  /** Lichtbasis-Drehung ψ fixieren (Grad) oder `null` = automatisch (kleinster Texel-Fußabdruck). */
  setFixedPsi(deg: number | null): void {
    this.fixedPsiDeg = deg;
    if (this.cascaded) this.cascaded.fixedPsiDeg = deg;
  }

  /**
   * Bias-Feinabstimmung der Kaskaden (Lab): geometrischer Werfer-Versatz für Selbstschatten-Objekte (Gelände-Facetten,
   * Welteinheiten) und Terminator-Zusatz (Welteinheiten bei N·L = 0,05).
   */
  setBias(casterOffset: number, grazing: number): void {
    this.biasTuning = { casterOffset, grazing };
    this.cascaded?.setBias(casterOffset, grazing);
    this.frame.grazing.value = grazing;
  }

  get biasSettings(): { casterOffset: number; grazing: number } {
    return { ...this.biasTuning };
  }

  /**
   * Kontakt (Schatten v3, live): `dilation` = Werfer-Mindestbreite (Texel je Seite, dünne reine Werfer im Schattenpass,
   * 0 = aus), `shift` = Kontaktversatz reiner Werfer (Welteinheiten entlang −Licht-Y, mindestens ein Texel: der Schatten
   * beginnt unter dem Fuß, auch wenn der Werfer knapp über dem facettierten Gelände steht; 0 = aus), `planeBias` = Empfängerebenen-Bias (Taps folgen der Facette; aus = alter symmetrischer Kernel-Bias),
   * `baseBias` = Grundbias in Anteilen einer mittleren Texelkante.
   */
  setContact(options: { dilation?: number; shift?: number; planeBias?: boolean; baseBias?: number }): void {
    const planeChanged = options.planeBias !== undefined && options.planeBias !== this.contactTuning.planeBias;
    this.contactTuning = { ...this.contactTuning, ...options };
    this.frame.baseBias.value = this.contactTuning.baseBias;
    // Ebenen-Bias ist fest einkompiliert (kein Uniform-Zweig im Shader): Umschalten baut neu
    if (planeChanged) this.rebuild();
    else this.cascaded?.setContact(this.contactTuning);
  }

  get contactSettings(): { dilation: number; shift: number; planeBias: boolean; baseBias: number } {
    return { ...this.contactTuning };
  }

  // --- Schattenwert für Konsumenten (Kronenpunkte, Tönungen) -------------------------------------------------

  /** Aktuelle Kaskaden (null im Einzelkartenbetrieb). Teil von `ShadowFactorSource`. */
  get cascadedShadows(): CascadedShadows | null {
    return this.cascaded;
  }

  /** Teil von `ShadowFactorSource`: Material merken, damit es nach einem Kaskaden-Neubau neu gebaut wird. */
  trackShadowConsumer(material: object): void {
    const m = material as { needsUpdate: boolean; addEventListener?(type: string, fn: () => void): void };
    if (this.shadowConsumers.has(m)) return;
    this.shadowConsumers.add(m);
    m.addEventListener?.('dispose', () => this.shadowConsumers.delete(m));
  }

  /**
   * **Glatter, zeitlich ruhiger Schattenwert** an einer Weltposition: 1 = Sonne, 0 = Schatten (Schlagschatten *und*
   * dunkle Seite glatter Werfer, denn die Karte enthält deren Schattenseite). Ohne 1-px-Schwelle, stetig im Raum,
   * nutzbar im **Vertex- und Fragment-Shader** jedes Materials (Vergleich auf Level 0, keine Ableitungen).
   *
   * Gedacht für die Kronenpunkte: je Instanz im Vertex-Shader lesen und die Punktgröße damit aus 0 skalieren, z. B.
   * ```ts
   * const centerWorld = modelWorldMatrix.mul(vec4(centerLocal, 1)).xyz;
   * const sun = sunRig.shadowFactor(centerWorld, { softness: 0.12 }); // Radius ≈ 1–2 Punktdurchmesser
   * const scale = smoothstep(0.15, 0.85, sun).mul(smoothstep(-0.1, 0.25, ndl));
   * ```
   * - `softness` (Welteinheiten): Lichtanteil über eine Scheibe quer zur Sonne statt der Kante → der Wert wandert
   *   beim Drehen gleichmäßig durch 0..1, statt mit einzelnen Texeln zu springen. 0/weglassen = kubischer B-Spline
   *   (≈ 2 Texel Übergang).
   * - `taps`: 1 (bilinear, billig), 4 (kubisch, Standard), 9 (quintisch).
   * - `plane`: Weltnormale einer Empfängerebene (Taps folgen ihr), sonst Punktprobe.
   * Kosten je Aufruf: 4 (kubisch) bzw. 9 (weich) Vergleichs-Taps je Kaskade, meist eine Kaskade.
   * Im Einzelkartenbetrieb (keine Kamera gebunden) konstant 1. Nach einem Kaskaden-Neubau (Qualitätswechsel) baut
   * das Konsumentenmaterial automatisch neu.
   * Achtung: den Wert nicht in `select`-/`If`-Zweigen verwenden — TSL baut Knoten je Zweig neu auf, die Abtastung
   * stünde dann mehrfach im Shader; stattdessen außerhalb berechnen und mit `mix` weiterverwenden (siehe Kronenpunkte).
   */
  shadowFactor(positionWorld: Vec3Node, options: CascadeSampleOptions = {}): FloatNode {
    return shadowFactorNode(this, positionWorld, options);
  }

  /** Wird beim Bauen der Filter gelesen: manuellen Tiefenvergleich erzwingen, verbieten oder automatisch. */
  private lastManualCompare: boolean | null = null;
  private readonly manualCompareFn = (builder: NodeBuilder): boolean => {
    const on = this.manualCompare ?? needsManualDepthCompare(builder);
    this.lastManualCompare = on;
    return on;
  };

  /** Manuellen Tiefenvergleich erzwingen (true/false) oder automatisch (null); baut neu. */
  setManualCompare(on: boolean | null): void {
    if (on === this.manualCompare) return;
    this.manualCompare = on;
    this.rebuild();
  }

  /** Letzte Entscheidung der Filter (true = manueller Vergleich), null solange nichts gebaut wurde. */
  get manualCompareActive(): boolean | null {
    return this.lastManualCompare;
  }

  /** Glatte Terminator-Silhouetten der Werfer an/aus (Kaskaden; ohne Neubau). */
  setSmoothCasters(on: boolean): void {
    this.smoothCasters = on;
    if (this.cascaded) {
      this.cascaded.casterSettings.smooth = on;
      this.cascaded.markDirty();
    }
  }

  /** Aufteilung der Blicktiefe: 0 gleichmäßig … 1 logarithmisch. */
  setSplitLambda(lambda: number): void {
    if (this.cascaded) this.cascaded.lambda = lambda;
  }

  /** Kennzahlen der Kaskaden (px je Texel, Splits, ψ, Refits, Pässe) oder null im Einzelkartenbetrieb. */
  get cascadeStats(): CascadedShadowStats | null {
    return this.cascaded ? this.cascaded.stats() : null;
  }

  setAngles(elevationDeg: number, azimuthDeg: number): void {
    this.elevationDeg = elevationDeg;
    this.azimuthDeg = azimuthDeg;
    this.applyAngles();
    this.requestUpdate();
  }

  /** Richtung zur Sonne im Raum von `root` (Rig blickt nach -Z). */
  directionLocal(out: Vector3): Vector3 {
    const el = (this.elevationDeg * Math.PI) / 180;
    const az = (this.azimuthDeg * Math.PI) / 180;
    return out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  }

  /** Richtung zur Sonne im Weltraum. */
  directionWorld(out: Vector3): Vector3 {
    this.directionLocal(out);
    return out.transformDirection(this.root.matrixWorld);
  }

  private applyAngles(): void {
    this.directionLocal(_corner);
    this.light.position.copy(_corner).multiplyScalar(this.distance).add(this.target.position);
    this.syncCascadedFrame();
  }

  /** Sonne, Rig-Oben und Anker (Welt) an die Kaskaden weitergeben. */
  private syncCascadedFrame(): void {
    const c = this.cascaded;
    if (!c) return;
    this.root.updateWorldMatrix(true, false);
    this.directionWorld(c.sunDir);
    c.upRef.set(0, 1, 0).transformDirection(this.root.matrixWorld);
    this.root.getWorldPosition(c.anchor);
    c.elevationRad = (this.elevationDeg * Math.PI) / 180;
  }

  requestUpdate(): void {
    this.light.shadow.needsUpdate = true;
    this.updatesRequested++;
    if (this.cascaded) {
      this.syncCascadedFrame();
      this.cascaded.markDirty();
    }
  }

  /**
   * Passt die orthografische Schattenkamera eng an die Grenzen des Patches (Objektraum-AABB inkl.
   * Vegetationshöhe, transformiert mit `objectMatrixWorld`) an. Rand Richtung Sonne: `hTotal / tan(θ)`.
   * Größe auf 4-Einheiten-Quanten gerundet, Mitte auf Texel gesnappt → kein Flimmern beim Rollen.
   * Im Kaskadenbetrieb: Box = Clip-Volumen der Empfänger, `hTotal` = Werferhöhe.
   */
  fitShadow(localBounds: Box3, objectMatrixWorld: Matrix4, hTotal: number): void {
    if (!this.lastClip) this.lastClip = { bounds: new Box3(), matrix: new Matrix4(), hTotal };
    if (this.lastClip.bounds !== localBounds) this.lastClip.bounds.copy(localBounds);
    if (this.lastClip.matrix !== objectMatrixWorld) this.lastClip.matrix.copy(objectMatrixWorld);
    this.lastClip.hTotal = hTotal;
    this.root.updateWorldMatrix(true, true);
    const shadow = this.light.shadow;
    shadow.updateMatrices(this.light);
    const cam = shadow.camera;
    _m.multiplyMatrices(cam.matrixWorldInverse, objectMatrixWorld);
    _min.set(Infinity, Infinity, Infinity);
    _max.set(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < 8; i++) {
      _corner.set(i & 1 ? localBounds.max.x : localBounds.min.x, i & 2 ? localBounds.max.y : localBounds.min.y, i & 4 ? localBounds.max.z : localBounds.min.z);
      _corner.applyMatrix4(_m);
      _min.min(_corner);
      _max.max(_corner);
    }
    const el = Math.max(0.02, (this.elevationDeg * Math.PI) / 180);
    const sunMargin = hTotal / Math.tan(el);
    const quantum = 4;
    const sizeX = Math.ceil((_max.x - _min.x + 1) / quantum) * quantum;
    const sizeY = Math.ceil((_max.y - _min.y + 1) / quantum) * quantum;
    const texelX = sizeX / this.mapSize;
    const texelY = sizeY / this.mapSize;
    const cx = Math.round((_min.x + _max.x) * 0.5 / texelX) * texelX;
    const cy = Math.round((_min.y + _max.y) * 0.5 / texelY) * texelY;
    cam.left = cx - sizeX * 0.5;
    cam.right = cx + sizeX * 0.5;
    cam.bottom = cy - sizeY * 0.5;
    cam.top = cy + sizeY * 0.5;
    // View-Raum: sichtbare Tiefe ist -z. Nächste Ecke = _max.z, fernste = _min.z.
    cam.near = Math.max(0.1, -_max.z - sunMargin);
    cam.far = -_min.z + sunMargin;
    cam.updateProjectionMatrix();
    // Boden liegt fast parallel zum Licht: die Tiefe ändert sich pro Texel entlang der Licht-Y-Achse am stärksten
    this.depthPerTexel.value = texelY / Math.max(1e-3, cam.far - cam.near);
    // Lichtraum-Uniforms des neuen Filters (Achsen aus der Kameramatrix, Texel in Welteinheiten)
    shadow.updateMatrices(this.light);
    const e = cam.matrixWorld.elements;
    this.frame.axisX.value.set(e[0]!, e[1]!, e[2]!);
    this.frame.axisY.value.set(e[4]!, e[5]!, e[6]!);
    this.frame.axisL.value.set(e[8]!, e[9]!, e[10]!);
    this.frame.texel.value.set(texelX, texelY);
    this.frame.range.value = Math.max(1e-3, cam.far - cam.near);

    const c = this.cascaded;
    if (c) {
      this.syncCascadedFrame();
      if (!c.clip) c.clip = { min: new Vector3(), max: new Vector3(), toLocal: new Matrix4() };
      c.clip.min.copy(localBounds.min);
      c.clip.max.copy(localBounds.max);
      c.clip.toLocal.copy(objectMatrixWorld).invert();
      c.casterHeight = hTotal;
      c.setReferenceFrom(shadow, this.light);
    }
  }

  dispose(): void {
    this.cascaded?.dispose();
    this.cascaded = null;
    this.light.dispose();
  }
}

function resolveCascades(c: ShadowCascadePreset | CascadeSize[] | undefined, mapSize: number): CascadeSize[] {
  if (Array.isArray(c)) return c.map((s) => ({ ...s }));
  return SHADOW_CASCADE_PRESETS[c ?? cascadePresetForMapSize(mapSize)].map((s) => ({ ...s }));
}
