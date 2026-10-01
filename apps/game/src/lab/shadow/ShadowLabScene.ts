import { Color, Mesh, NodeMaterial, PerspectiveCamera, QuadMesh, Vector3 } from 'three/webgpu';
import type { Material, NodeBuilder, UniformNode } from 'three/webgpu';
import { Fn, float, fract, ivec2, mix, normalWorld, property, texture, uniform, uv, vec3, vec4 } from 'three/tsl';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { MapWorld, MAP_VIEW, MAP_VIEW_PORTRAIT, PLANET_RADIUS } from '../../flow/MapWorld';
import { FLOW_QUALITY } from '../../flow/quality';
import { NodePath } from '../../flow/NodePath';
import { PanBall } from '../earle/panball';
import { createShadowTestDots } from './shadowDots';
import { flatNormalWorld, type CascadedShadows, type CascadedShadowStats, type ShadowCascadePreset, type ShadowTaps } from '@ee/render/shadow/index.ts';

/** Anzeige: nur neu, nur alt (P2-Verfahren) oder geteilt (links alt, rechts neu, gleiches Bild). */
export type ShadowLabMode = 'neu' | 'alt' | 'split';
/** Kamerapresets: Karte (iPhone hoch, wie der Flow), Hügelblick, iPhone quer (alt), Earle-Komposition, Übersicht, nah, Draufsicht. */
export type ShadowLabView = 'karte' | 'huegel' | 'iphone' | 'earle' | 'uebersicht' | 'nah' | 'oben';
/**
 * 0 aus, 1 Kaskadenmuster, 2 Texelgitter, 3 Kontakt-Diagnose (Spalt magenta, Kontakt grün, verlorene dünne Schatten
 * cyan), 4 Feld (glatter Schattenwert grau, 0,5-Kante rot, Texelgitter).
 */
export type ShadowLabDebug = 0 | 1 | 2 | 3 | 4;

export interface ShadowLabParams {
  mode: ShadowLabMode;
  view: ShadowLabView;
  sunElevation: number;
  sunAzimuth: number;
  /** Kaskaden-Preset (Kartengrößen) — Mobil = 2 Kaskaden. */
  cascades: ShadowCascadePreset;
  /** Eigene Kartengrößen statt Preset (Versuche), z. B. "2048x2048,1024x2048"; leer = Preset. */
  sizes: string;
  /** 0 = automatisch (9 bei Hoch/Ultra, 4 bei Mobil). */
  taps: ShadowTaps | 0;
  debug: ShadowLabDebug;
  magnifier: boolean;
  /** Lupenmitte als Anteil der Canvas-Breite/-Höhe (0..1, oben links = 0,0). */
  magX: number;
  magY: number;
  /** Automatische Drehung (Grad/s), 0 = aus. */
  rotate: number;
  quality: 'hoch' | 'mobil';
  /** Pfadknoten im Fokus (0..). */
  node: number;
  /** Abgeschlossene Level (Wachstum: Bäume wachsen, Müll versinkt). */
  progress: number;
  /** Tiefenaufteilung 0 (gleichmäßig) … 1 (logarithmisch). */
  lambda: number;
  /** Planet um die Hochachse gedreht (Grad), für reproduzierbare Ansichten. */
  spin: number;
  /** Geometrischer Werfer-Versatz für Selbstschatten-Objekte (Gelände-Facetten), Welteinheiten. */
  slopeBias: number;
  /** Terminator-Zusatzbias (Welteinheiten bei N·L = 0,05). */
  grazingBias: number;
  /** Werfer-Mindestbreite: Aufweitung reiner Werfer im Schattenpass (Texel je Seite, 0 = aus). */
  dilation: number;
  /** Kontaktversatz reiner Werfer (Welteinheiten entlang −Licht-Y; Schatten beginnt unter dem Fuß, 0 = aus). */
  shift: number;
  /** Empfängerebenen-Bias (Taps folgen der Facette); aus = alter symmetrischer Kernel-Bias. */
  planeBias: boolean;
  /** Grundbias (Anteil einer mittleren Texelkante). */
  baseBias: number;
  /** Kontakt-Diagnose: Tiefenfenster (Welteinheiten) für „Werfer direkt davor“. */
  gap: number;
  /** Bench: Hauptansicht N-mal je Frame rendern (GPU-gebunden messen). */
  repeat: number;
  /** Glatte Terminator-Silhouetten der Werfer. */
  smoothCasters: boolean;
  /** Diagnose: 1 = Einzelkarte (keine Kamera binden), 2 = three-Standard-PCF (kein eigener Filter). */
  legacy: 0 | 1 | 2;
  /** Tiefenkarte einer Kaskade als Einblendung unten links (0 = aus, 1..3 = Kaskade). */
  mapInset: number;
  /** Testpunkte für `shadowFactor()` (skalieren im Vertex-Shader mit dem Schatten). */
  dots: boolean;
  /** Höhe verteilter Empfänger über dem Boden (Kronen mit Schlagschatten, `coverAbove`), 0 = nur Hinweise der Meshes. */
  crownHeight: number;
  /** Tiefenvergleich: -1 automatisch, 0 Hardware-Vergleichs-Sampler, 1 manuell im Shader (WebGL2-Rückfall). */
  compare: -1 | 0 | 1;
}

export const DEFAULT_SHADOW_PARAMS: ShadowLabParams = {
  mode: 'split',
  view: 'iphone',
  sunElevation: 10,
  sunAzimuth: 70,
  cascades: 'hoch',
  sizes: '',
  taps: 0,
  debug: 0,
  magnifier: true,
  magX: 0.5,
  magY: 0.55,
  rotate: 0,
  quality: 'hoch',
  node: 1,
  progress: 0,
  lambda: 0.72,
  spin: 0,
  slopeBias: 0.04,
  grazingBias: 0.006,
  dilation: 0.6,
  shift: 0.03,
  planeBias: true,
  baseBias: 0.25,
  gap: 0.35,
  repeat: 1,
  smoothCasters: true,
  legacy: 0,
  compare: -1,
  mapInset: 0,
  dots: false,
  crownHeight: 0,
};

export interface ShadowLabStats {
  cascades: CascadedShadowStats | null;
  passes: number;
  chunks: number;
  backend: string;
  canvas: [number, number];
  dpr: number;
  /** CPU-Zeit je Frame für update + Render-Aufrufe (ms, gleitend). */
  cpuMs: number;
  /** Tiefenvergleich der gebauten Filter: manuell (true), Hardware (false), noch nichts gebaut (null). */
  manualCompare: boolean | null;
  /** Letzte Schattenpass-Messung (ms je Pass, GPU+CPU, WebGPU) oder null. */
  shadowPassMs: number | null;
}

interface ViewPose {
  offset: Vector3;
  look: Vector3;
  fov: number;
  curvature: number;
  /** NDC des Fokusknotens (x optional). */
  ndcY: number;
  ndcX?: number;
}

/**
 * Karte (hoch): die Hochformat-Kartenkamera des Flows (`MAP_VIEW_PORTRAIT`) — so sieht Florian die Map auf dem iPhone.
 * Hügel: `MAP_VIEW` (Querformat, „ein Gemälde vom Hügel aus“). iPhone (quer): die alte Flow-Pose (0, 9, 8) × 0,7,
 * FOV 70 — die übertriebene Perspektive aus `docs/progress/p2e-shadow-before-iphone.webp`.
 */
const VIEWS: Record<ShadowLabView, ViewPose> = {
  karte: { offset: MAP_VIEW_PORTRAIT.offset.clone(), look: MAP_VIEW_PORTRAIT.look.clone(), fov: MAP_VIEW_PORTRAIT.fov, curvature: MAP_VIEW.curvature, ndcY: MAP_VIEW_PORTRAIT.target.y, ndcX: MAP_VIEW_PORTRAIT.target.x },
  huegel: { offset: MAP_VIEW.offset.clone(), look: MAP_VIEW.look.clone(), fov: MAP_VIEW.fov, curvature: MAP_VIEW.curvature, ndcY: -0.33 },
  iphone: { offset: new Vector3(0, 9, 8).multiplyScalar(0.7), look: new Vector3(0, 0, -4), fov: 70, curvature: 0, ndcY: -0.36 },
  earle: { offset: new Vector3(0, 4.6, 0.8), look: new Vector3(0, 0, -3.06), fov: 86, curvature: 0.14, ndcY: -0.3 },
  uebersicht: { offset: new Vector3(0, 9, 8), look: new Vector3(0, 0, -4), fov: 70, curvature: 0, ndcY: -0.36 },
  nah: { offset: new Vector3(0, 2.3, 2.0), look: new Vector3(0, 0, -3), fov: 60, curvature: 0, ndcY: -0.25 },
  /** Draufsicht (Diagnose): Schattenformen ohne Perspektive. */
  oben: { offset: new Vector3(0, 22, 0.01), look: new Vector3(0, 0, 0), fov: 60, curvature: 0, ndcY: 0 },
};

/** "2048x2048,1024x2048" → Kartengrößen (oder null). */
function parseSizes(text: string): Array<{ width: number; height: number }> | null {
  if (!text) return null;
  const out = text
    .split(',')
    .map((t) => t.trim().split('x').map(Number))
    .filter((v) => v.length === 2 && v.every((n) => Number.isFinite(n) && n >= 64 && n <= 8192))
    .map(([width, height]) => ({ width: width!, height: height! }));
  return out.length ? out : null;
}

const _v = new Vector3();
const _Y = new Vector3(0, 1, 0);
const INK = new Color('#081b25');

type DiagMaterial = NodeMaterial & { eeCascades?: CascadedShadows };

/**
 * P2e Schatten-Lab: die Flow-Welt (MapWorld + Pfad, unverändert wiederverwendet) mit dem neuen Sonnen-Rig
 * (`fitToView` → kamera-gefittete Kaskaden, B-Spline-Kante). Alt/Neu/Split ohne Neukompilieren, 4×-Lupe (zweiter
 * Render mit `setViewOffset` in ein Inset), Kaskaden-, Texel- und Kontakt-Debug, Sonnenregler, Rotation für den
 * Stabilitätstest, Schattenpass-Messung.
 */
export class ShadowLabScene implements SceneController {
  private params: ShadowLabParams;
  private ctx: SceneContext | null = null;
  private world: MapWorld | null = null;
  private nodePath: NodePath | null = null;
  private readonly magCamera = new PerspectiveCamera(70, 1, 0.3, 700);
  private readonly probe = new PerspectiveCamera(70, 1, 0.3, 700);
  private panBall: PanBall | null = null;
  /** Drehung der Ansicht um die Senkrechte am Scheitel (rad): „drehen" dreht Kamera und Sonne über der Ebene. */
  private yaw = 0;
  private readonly listeners = new Set<(p: ShadowLabParams) => void>();
  private cpuMs = 0;
  private needsSnap = true;
  private appliedSpin = 0;
  private elapsed = 0;
  /** Kontakt-Diagnose: Ersatzmaterial je Empfängermaterial (Position vom Original, Farbe aus der Diagnose). */
  private readonly diagMaterials = new WeakMap<Material, DiagMaterial>();
  private readonly diagSwaps: Array<{ mesh: Mesh; original: Material }> = [];
  private readonly diagGap: UniformNode<'float', number> = uniform(0.35);
  private readonly diagEpsilon: UniformNode<'float', number> = uniform(0.02);
  private readonly diagMode: UniformNode<'float', number> = uniform(0);
  private testDots: ReturnType<typeof createShadowTestDots> | null = null;
  /** Einblendung der Tiefenkarte (Material je Kaskade/Kaskadensatz). */
  private insetQuad: QuadMesh | null = null;
  private insetKey = '';
  /** Bench läuft: die Animationsschleife rendert nicht. */
  private benchRunning = false;
  private shadowPassMs: number | null = null;

  constructor(initial: Partial<ShadowLabParams> = {}) {
    this.params = { ...DEFAULT_SHADOW_PARAMS, ...initial };
  }

  get isMounted(): boolean {
    return this.ctx !== null;
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.panBall = new PanBall({
      worldUnitsPerPixel: () => this.worldUnitsPerPixel(),
      yaw: () => this.yaw,
      onPan: (dx, dz) => {
        const w = this.world;
        if (!w) return;
        w.setFocus(w.focus.x + dx, w.focus.z + dz);
      },
    });
    this.panBall.attach(ctx.canvas);
    this.buildWorld();
    this.resize(ctx);
  }

  private buildWorld(): void {
    this.disposeWorld();
    const p = this.params;
    const world = new MapWorld({ quality: FLOW_QUALITY[p.quality], seed: 7, sunElevationDeg: p.sunElevation, sunAzimuthDeg: p.sunAzimuth });
    this.world = world;
    world.rig.add(this.magCamera);
    world.rig.updateWorldMatrix(true, true);
    this.nodePath = new NodePath({ planet: world.world, layout: world.layout, sunDirWorld: world.sunDirection(new Vector3()) });
    this.nodePath.setProgress(p.node, p.node);
    if (p.progress > 0) world.setProgress(p.progress);
    // --- Die neue API, genau so wie ein Konsument sie nutzt -----------------------------------------------
    const sun = world.sun;
    sun.setCascades(parseSizes(p.sizes) ?? p.cascades);
    sun.setTaps(p.taps === 0 ? null : p.taps);
    sun.setReferenceEnabled(true);
    this.bindView();
    sun.setBias(p.slopeBias, p.grazingBias);
    sun.setContact({ dilation: p.dilation, shift: p.shift, planeBias: p.planeBias, baseBias: p.baseBias });
    sun.setSmoothCasters(p.smoothCasters);
    sun.setManualCompare(p.compare < 0 ? null : p.compare === 1);
    sun.setDebug(p.debug >= 3 ? 0 : (p.debug as 0 | 1 | 2));
    this.diagGap.value = p.gap;
    this.diagMode.value = p.debug === 4 ? 1 : 0;

    this.needsSnap = true;
    this.appliedSpin = 0;
    this.syncTestDots();
  }

  /** Testpunkte um den Fokusknoten (neu, wenn Knoten oder Schalter wechseln). */
  private syncTestDots(): void {
    this.testDots?.dispose();
    this.testDots = null;
    if (this.world && this.params.dots) this.testDots = createShadowTestDots(this.world, this.params.node);
  }

  /** Die Ein-Zeilen-Integration für MapWorld/EarleLab (Planetenschale um den Planetenmittelpunkt). */
  private bindView(): void {
    const world = this.world;
    if (!world) return;
    if (this.params.legacy > 0) {
      world.sun.fitToView(null);
      if (this.params.legacy === 2) world.sun.setSharpen(false);
      return;
    }
    world.sun.fitToDisplay(world.camera, () => this.world?.world, world.world.plane, { coverAbove: this.params.crownHeight });
  }

  private disposeWorld(): void {
    this.restoreDiagnostics();
    this.testDots?.dispose();
    this.testDots = null;
    this.nodePath?.dispose();
    this.nodePath = null;
    if (this.world) {
      this.world.rig.remove(this.magCamera);
      this.world.dispose();
    }
    this.world = null;
  }

  // --- Parameter -------------------------------------------------------------------------------------------

  getParams(): ShadowLabParams {
    return { ...this.params };
  }

  subscribe(listener: (p: ShadowLabParams) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setParams(patch: Partial<ShadowLabParams>): void {
    const prev = this.params;
    const next = { ...prev, ...patch };
    this.params = next;
    const world = this.world;
    if (this.ctx && world) {
      if (next.quality !== prev.quality) {
        this.buildWorld();
      } else {
        const sun = world.sun;
        if (next.cascades !== prev.cascades || next.sizes !== prev.sizes) sun.setCascades(parseSizes(next.sizes) ?? next.cascades);
        if (next.taps !== prev.taps) sun.setTaps(next.taps === 0 ? null : next.taps);
        if (next.debug !== prev.debug) {
          sun.setDebug(next.debug >= 3 ? 0 : (next.debug as 0 | 1 | 2));
          this.diagMode.value = next.debug === 4 ? 1 : 0;
        }
        if (next.sunElevation !== prev.sunElevation || next.sunAzimuth !== prev.sunAzimuth) {
          sun.setAngles(next.sunElevation, next.sunAzimuth);
          world.markShadowDirty();
        }
        if (next.lambda !== prev.lambda) sun.setSplitLambda(next.lambda);
        if (next.smoothCasters !== prev.smoothCasters) {
          sun.setSmoothCasters(next.smoothCasters);
          world.markShadowDirty();
        }
        if (next.slopeBias !== prev.slopeBias || next.grazingBias !== prev.grazingBias) {
          sun.setBias(next.slopeBias, next.grazingBias);
          world.markShadowDirty();
        }
        if (next.dilation !== prev.dilation || next.shift !== prev.shift || next.planeBias !== prev.planeBias || next.baseBias !== prev.baseBias) {
          sun.setContact({ dilation: next.dilation, shift: next.shift, planeBias: next.planeBias, baseBias: next.baseBias });
          world.markShadowDirty();
        }
        if (next.gap !== prev.gap) this.diagGap.value = next.gap;
        if (next.progress !== prev.progress) world.setProgress(next.progress);
        if (next.view !== prev.view || next.node !== prev.node || next.spin !== prev.spin) {
          this.nodePath?.setProgress(next.node, next.node);
          this.needsSnap = true;
        }
        if (next.dots !== prev.dots || (next.dots && next.node !== prev.node)) this.syncTestDots();
        if (next.crownHeight !== prev.crownHeight) this.bindView();
      }
    }
    for (const l of this.listeners) l(this.getParams());
  }

  // --- Kamera ------------------------------------------------------------------------------------------------

  private pose(): ViewPose {
    return VIEWS[this.params.view];
  }

  private applyCamera(cam: PerspectiveCamera, pose: ViewPose): void {
    cam.position.copy(pose.offset);
    cam.up.set(0, 1, 0);
    this.world!.rig.updateMatrixWorld(true);
    cam.lookAt(this.world!.rig.localToWorld(_v.copy(pose.look)));
    cam.fov = pose.fov;
    cam.updateProjectionMatrix();
  }

  private worldUnitsPerPixel(): number {
    const h = this.ctx?.height ?? 800;
    const pose = this.pose();
    const dist = pose.offset.distanceTo(pose.look);
    return (2 * dist * Math.tan((pose.fov * Math.PI) / 360)) / h;
  }

  /**
   * Fokus so setzen, dass der Fokusknoten auf `ndcY` liegt, Pfad Richtung Horizont (wie FlowScene): die Ansicht dreht
   * sich um die Senkrechte, bis der Weg zum nächsten Knoten in die Bildtiefe zeigt, plus `spin` Grad.
   */
  private snapToNode(): void {
    const world = this.world;
    if (!world || !this.ctx) return;
    const pose = this.pose();
    const node = world.layout.node(this.params.node);
    const next = world.layout.node(this.params.node + 1);
    // Kurs: Weg zum nächsten Knoten zeigt in die Bildtiefe (−z im Rig), plus Spin
    const dx = next.position[0] - node.position[0];
    const dz = next.position[2] - node.position[2];
    const heading = Math.hypot(dx, dz) > 1e-4 ? Math.atan2(dx, dz) - Math.PI : 0;
    this.setYaw(heading + (this.params.spin * Math.PI) / 180);
    this.appliedSpin = this.params.spin;
    // Zielpunkt im Rig (ohne Drehung): Strahl der Probe-Kamera auf die Kugel, flacher Versatz vom Scheitel
    const cam = this.probe;
    cam.aspect = this.ctx.width / this.ctx.height;
    cam.fov = pose.fov;
    cam.position.copy(pose.offset).add(world.rig.position);
    cam.up.set(0, 1, 0);
    cam.lookAt(_v.copy(pose.look).add(world.rig.position));
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const origin = cam.position.clone();
    const dir = new Vector3(pose.ndcX ?? 0, pose.ndcY, 0.5).unproject(cam).sub(origin).normalize();
    const r = PLANET_RADIUS + 0.9;
    const b = origin.dot(dir);
    const c = origin.lengthSq() - r * r;
    const disc = b * b - c;
    const hit = disc >= 0 ? origin.clone().addScaledVector(dir, -b - Math.sqrt(disc)) : new Vector3(0, PLANET_RADIUS, -6);
    world.world.mapping.toFlatCpu(hit, hit);
    const cs = Math.cos(this.yaw);
    const sn = Math.sin(this.yaw);
    const ox = hit.x * cs + hit.z * sn;
    const oz = -hit.x * sn + hit.z * cs;
    world.setFocus(node.position[0] - ox, node.position[2] - oz);
    world.world.curvature.value = pose.curvature;
    world.markShadowDirty();
  }

  private setYaw(yaw: number): void {
    const world = this.world;
    this.yaw = yaw;
    if (!world) return;
    world.rig.quaternion.setFromAxisAngle(_Y, yaw);
    world.rig.updateMatrixWorld(true);
    world.markShadowDirty();
  }

  resize(ctx: SceneContext): void {
    const world = this.world;
    if (!world) return;
    world.camera.aspect = ctx.width / ctx.height;
    world.camera.updateProjectionMatrix();
    this.needsSnap = true;
  }

  // --- Frame -------------------------------------------------------------------------------------------------

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    const world = this.world;
    const pan = this.panBall;
    if (!world || !pan || this.benchRunning) return;
    const t0 = performance.now();
    this.elapsed += dt;
    if (this.needsSnap) {
      this.snapToNode();
      this.needsSnap = false;
    }
    if (pan.step(dt)) world.markShadowDirty();
    if (this.params.rotate !== 0 && dt > 0 && !pan.isDragging) this.setYaw(this.yaw + ((this.params.rotate * Math.PI) / 180) * dt);
    this.frameWorld();
    this.render(ctx);
    const ms = performance.now() - t0;
    this.cpuMs += (ms - this.cpuMs) * 0.1;
  }

  /** Kamera, Welt-Update und Pfad für den nächsten Render (auch von Skripten/Bench genutzt). */
  private frameWorld(): void {
    const world = this.world!;
    const pose = this.pose();
    this.applyCamera(world.camera, pose);
    world.world.curvature.value = pose.curvature;
    world.update();
    this.nodePath?.update(this.elapsed);
  }

  private render(ctx: SceneContext): void {
    const world = this.world!;
    const r = ctx.renderer;
    const sun = world.sun;
    const p = this.params;
    const W = ctx.width;
    const H = ctx.height;
    const scene = world.scene;
    const cam = world.camera;
    const split = p.mode === 'split';
    const diag = p.debug >= 3;
    sun.keepReference(p.mode !== 'neu' && !diag);
    const bg = scene.background;
    r.setClearColor(INK, 1);
    if (diag) {
      // Erst normal rendern: nur Empfänger-Materialien stoßen Refit und Schattenpässe an (das Diagnosematerial ist unbeleuchtet)
      sun.showReference(false);
      r.render(scene, cam);
      this.swapInDiagnostics();
    }
    if (!split || diag) {
      sun.showReference(p.mode === 'alt' && !diag);
      for (let i = 0; i < Math.max(1, Math.round(p.repeat)); i++) r.render(scene, cam);
    } else {
      const half = Math.round(W / 2);
      r.setScissorTest(true);
      sun.showReference(true);
      r.setScissor(0, 0, half, H);
      r.render(scene, cam);
      sun.showReference(false);
      scene.background = null;
      r.autoClear = false;
      r.setScissor(half, 0, W - half, H);
      r.render(scene, cam);
      r.autoClear = true;
      scene.background = bg;
      r.setScissorTest(false);
    }
    if (p.magnifier) this.renderMagnifier(ctx);
    if (diag) this.restoreDiagnostics();
    if (p.mapInset > 0) this.renderMapInset(ctx);
  }

  /**
   * Tiefenkarte einer Kaskade als Einblendung (Diagnose): Höhenlinien der gespeicherten Tiefe (fract·40), leere Texel
   * (Tiefe 1) dunkelblau. Zeigt, was der Schattenpass wirklich geschrieben hat (Aufweitung, Terminator-Silhouetten).
   */
  private renderMapInset(ctx: SceneContext): void {
    const cascaded = this.world?.sun.cascadedShadows;
    const k = (Math.round(this.params.mapInset) % 10) - 1;
    const entry = cascaded?.cascades[k];
    const depth = entry?.depth;
    if (!cascaded || !entry || !depth) return;
    const key = `${depth.uuid}`;
    if (!this.insetQuad || this.insetKey !== key) {
      (this.insetQuad?.material as NodeMaterial | undefined)?.dispose();
      const m = new NodeMaterial();
      m.name = 'ShadowMapInset';
      const size = vec4(entry.size.width, entry.size.height, 0, 0);
      const t = uv();
      const d = texture(depth).load(ivec2(t.x.mul(size.x).toInt() as never, t.y.oneMinus().mul(size.y).toInt() as never)) as unknown as ReturnType<typeof float>;
      const empty = d.greaterThan(0.99999);
      const bands = fract(d.mul(40));
      m.colorNode = mix(vec3(bands.mul(0.7).add(0.2), bands.mul(0.5).add(0.25), float(0.3)), vec3(0.05, 0.08, 0.2), empty.select(float(1), float(0))) as never;
      this.insetQuad = new QuadMesh(m);
      this.insetKey = key;
    }
    const r = ctx.renderer;
    const W = ctx.width;
    const H = ctx.height;
    const aspect = entry.size.width / entry.size.height;
    // Ganze Karte 1:1 (Texel = Pixel) mit `mapInset` ≥ 10 (z. B. 12 = Kaskade 2), sonst eine kleine Einblendung
    const full = this.params.mapInset >= 10;
    const h = full ? Math.min(H, W / aspect) : Math.round(H * 0.45);
    const w = full ? h * aspect : Math.round(Math.min(W * 0.9, h * aspect));
    const y0 = full ? 0 : H - h - 8;
    r.setViewport(full ? 0 : 8, y0, w, h);
    r.setScissor(full ? 0 : 8, y0, w, h);
    r.setScissorTest(true);
    r.autoClear = false;
    this.insetQuad.render(r);
    r.autoClear = true;
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
  }

  // --- Kontakt-Diagnose --------------------------------------------------------------------------------------

  /**
   * Ersetzt für einen Render alle Empfänger (receiveShadow) durch ein Diagnosematerial mit derselben Position
   * (Krümmungs-Warp, Wachstum): Farbe = `CascadedShadows.contactDiagnostics` (Spalt magenta, Kontakt grün, verlorene
   * dünne Schatten cyan). Werfer behalten ihr Material.
   */
  private swapInDiagnostics(): void {
    const world = this.world;
    const cascaded = world?.sun.cascadedShadows ?? null;
    if (!world || !cascaded) return;
    world.scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || mesh.receiveShadow !== true || Array.isArray(mesh.material)) return;
      const original = mesh.material as Material;
      let d = this.diagMaterials.get(original);
      if (!d || d.eeCascades !== cascaded) {
        d?.dispose();
        d = this.createDiagMaterial(original, cascaded);
        this.diagMaterials.set(original, d);
      }
      this.diagSwaps.push({ mesh, original });
      mesh.material = d;
    });
  }

  private restoreDiagnostics(): void {
    for (const s of this.diagSwaps) s.mesh.material = s.original;
    this.diagSwaps.length = 0;
  }

  private createDiagMaterial(original: Material, cascaded: CascadedShadows): DiagMaterial {
    const src = original as Material & { positionNode?: unknown; side: number };
    const m = new NodeMaterial() as DiagMaterial;
    m.name = 'ShadowContactDiagnostics';
    m.eeCascades = cascaded;
    m.lights = false;
    m.fog = false;
    m.side = src.side;
    if (src.positionNode) (m as unknown as { positionNode: unknown }).positionNode = src.positionNode;
    const gap = this.diagGap;
    const epsilon = this.diagEpsilon;
    const mode = this.diagMode;
    m.colorNode = Fn((builder: NodeBuilder) => {
      // Facettenebene vor jeder Verzweigung (Ableitungen in gleichförmigem Kontrollfluss)
      const plane = property('vec3', 'eeDiagPlane') as unknown as { assign(v: unknown): void };
      plane.assign(flatNormalWorld());
      return cascaded.contactDiagnostics(builder, { gap, epsilon, plane: plane as never, shading: normalWorld as never, mode });
    })() as never;
    return m;
  }

  // --- Lupe --------------------------------------------------------------------------------------------------

  /** 4×-Lupe: gleicher Blick, `setViewOffset` auf ein Viertel-Fenster um die Lupenmitte, Inset unten rechts. */
  magnifierRects(): { src: { x: number; y: number; w: number; h: number }; insets: Array<{ x: number; y: number; w: number; h: number; label: string }> } {
    const ctx = this.ctx;
    const W = ctx?.width ?? 1;
    const H = ctx?.height ?? 1;
    const size = Math.round(Math.min(W * 0.3, H * 0.46));
    const split = this.params.mode === 'split' && this.params.debug < 3;
    const src = { w: size / 4, h: size / 4, x: this.params.magX * W - size / 8, y: this.params.magY * H - size / 8 };
    const pad = 12;
    const count = split ? 2 : 1;
    const total = count * size + (count - 1) * pad;
    // Insets auf die Seite, die der Lupenmitte gegenüberliegt (sonst verdecken sie die gezeigte Kante)
    const right = this.params.magX < 0.5;
    const x0 = right ? W - total - pad : pad;
    const y = Math.round(Math.max(right ? 64 : 200, Math.min(H - size - pad - 60, H * 0.12)));
    const labels = split ? ['Alt 4×', 'Neu 4×'] : [this.params.debug === 3 ? 'Kontakt 4×' : this.params.debug === 4 ? 'Feld 4×' : this.params.mode === 'alt' ? 'Alt 4×' : 'Neu 4×'];
    const insets = labels.map((label, i) => ({ x: x0 + i * (size + pad), y, w: size, h: size, label }));
    return { src, insets };
  }

  private renderMagnifier(ctx: SceneContext): void {
    const world = this.world!;
    const r = ctx.renderer;
    const W = ctx.width;
    const H = ctx.height;
    const { src, insets } = this.magnifierRects();
    const mag = this.magCamera;
    mag.position.copy(world.camera.position);
    mag.quaternion.copy(world.camera.quaternion);
    mag.fov = world.camera.fov;
    mag.aspect = W / H;
    mag.near = world.camera.near;
    mag.far = world.camera.far;
    mag.setViewOffset(W, H, src.x, src.y, src.w, src.h);
    mag.updateProjectionMatrix();
    mag.updateMatrixWorld(true);
    const scene = world.scene;
    const bg = scene.background;
    const split = this.params.mode === 'split' && this.params.debug < 3;
    r.setScissorTest(true);
    insets.forEach((inset, i) => {
      world.sun.showReference(split ? i === 0 : this.params.mode === 'alt' && this.params.debug < 3);
      r.setViewport(inset.x, inset.y, inset.w, inset.h);
      r.setScissor(inset.x, inset.y, inset.w, inset.h);
      r.clearDepth();
      scene.background = null;
      r.autoClear = false;
      r.render(scene, mag);
      r.autoClear = true;
      scene.background = bg;
    });
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
    mag.clearViewOffset();
  }

  // --- Messungen ---------------------------------------------------------------------------------------------

  /**
   * Schattenpass-Kosten (WebGPU): je Probe `batch` Renders mit erzwungenem Pass aller Kaskaden und `batch` ohne, jeweils
   * bis die GPU fertig ist, abwechselnd (gegen Takt- und Wärmedrift); Median der Differenz / batch = ms je Schattenpass
   * (GPU + Encode der Kaskaden). Null auf WebGL2.
   */
  async benchShadowPass(samples = 15, batch = 8): Promise<{ withPass: number; without: number; pass: number } | null> {
    const ctx = this.ctx;
    const world = this.world;
    if (!ctx || !world) return null;
    const device = (ctx.renderer.backend as unknown as { device?: { queue: { onSubmittedWorkDone(): Promise<void> } } }).device;
    if (!device) return null;
    this.benchRunning = true;
    try {
      const run = async (withPass: boolean): Promise<number> => {
        this.frameWorld();
        await device.queue.onSubmittedWorkDone();
        const t0 = performance.now();
        for (let i = 0; i < batch; i++) {
          if (withPass) world.sun.requestUpdate();
          ctx.renderer.render(world.scene, world.camera);
        }
        await device.queue.onSubmittedWorkDone();
        return (performance.now() - t0) / batch;
      };
      await run(true);
      await run(false);
      const a: number[] = [];
      const b: number[] = [];
      for (let k = 0; k < samples; k++) {
        a.push(await run(true));
        b.push(await run(false));
      }
      const median = (v: number[]) => [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)]!;
      const withPass = median(a);
      const without = median(b);
      this.shadowPassMs = Math.max(0, withPass - without);
      return { withPass, without, pass: this.shadowPassMs };
    } finally {
      this.benchRunning = false;
    }
  }

  /** Für Skripte (Bildfolgen beim Drehen): Ansicht um `deg` Grad um die Senkrechte am Scheitel drehen. */
  stepRotation(deg: number): void {
    if (!this.world || !this.ctx) return;
    this.setYaw(this.yaw + (deg * Math.PI) / 180);
  }

  getStats(): ShadowLabStats {
    const world = this.world;
    const r = this.ctx?.renderer;
    return {
      cascades: world?.sun.cascadeStats ?? null,
      passes: world?.shadowPasses ?? 0,
      chunks: world?.world.loadedCount ?? 0,
      backend: this.ctx?.backend ?? 'unknown',
      canvas: [r?.domElement.width ?? 0, r?.domElement.height ?? 0],
      dpr: r?.getPixelRatio() ?? 0,
      cpuMs: this.cpuMs,
      manualCompare: world?.sun.manualCompareActive ?? null,
      shadowPassMs: this.shadowPassMs,
    };
  }

  /** Tatsächlich verwendete Taps (nach Automatik). */
  get effectiveTaps(): number {
    return this.world?.sun.taps ?? 0;
  }

  /** Zugriff für Skripte/Tests (Screenshots, Messungen). */
  get sun() {
    return this.world?.sun ?? null;
  }

  get mapWorld(): MapWorld | null {
    return this.world;
  }

  dispose(): void {
    this.panBall?.detach();
    this.panBall = null;
    this.disposeWorld();
    if (this.ctx) this.ctx.renderer.shadowMap.enabled = false;
    this.listeners.clear();
    this.ctx = null;
  }
}
