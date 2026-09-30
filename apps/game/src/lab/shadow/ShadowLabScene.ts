import { Color, PerspectiveCamera, Quaternion, Vector3 } from 'three/webgpu';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { MapWorld, PLANET_RADIUS } from '../../flow/MapWorld';
import { FLOW_QUALITY } from '../../flow/quality';
import { NodePath } from '../../flow/NodePath';
import { Trackball } from '../earle/trackball';
import type { CascadedShadowStats, ShadowCascadePreset, ShadowTaps } from '@ee/render/shadow/index.ts';

/** Anzeige: nur neu, nur alt (P2-Verfahren) oder geteilt (links alt, rechts neu, gleiches Bild). */
export type ShadowLabMode = 'neu' | 'alt' | 'split';
/** Kamerapresets: iPhone (Flow-Karte, gezoomt, wie Florians Screenshot), Earle-Komposition, Übersicht, nah. */
export type ShadowLabView = 'iphone' | 'earle' | 'uebersicht' | 'nah' | 'oben';

export interface ShadowLabParams {
  mode: ShadowLabMode;
  view: ShadowLabView;
  sunElevation: number;
  sunAzimuth: number;
  /** Kaskaden-Preset (Kartengrößen) — Mobil = 2 Kaskaden. */
  cascades: ShadowCascadePreset;
  /** 0 = automatisch (9 bei Hoch/Ultra, 4 bei Mobil). */
  taps: ShadowTaps | 0;
  /** 0 aus, 1 Kaskadenmuster, 2 Texelgitter. */
  debug: 0 | 1 | 2;
  magnifier: boolean;
  /** Lupenmitte als Anteil der Canvas-Breite/-Höhe (0..1, oben links = 0,0). */
  magX: number;
  magY: number;
  /** Automatische Drehung (Grad/s), 0 = aus. */
  rotate: number;
  quality: 'hoch' | 'mobil';
  /** Pfadknoten im Fokus (0..). */
  node: number;
  /** Tiefenaufteilung 0 (gleichmäßig) … 1 (logarithmisch). */
  lambda: number;
  /** Planet um die Hochachse gedreht (Grad), für reproduzierbare Ansichten. */
  spin: number;
  /** Geometrischer Werfer-Versatz für Selbstschatten-Objekte (Gelände-Facetten), Welteinheiten. */
  slopeBias: number;
  /** Terminator-Zusatzbias (Welteinheiten bei N·L = 0,05). */
  grazingBias: number;
  /** Bench: Hauptansicht N-mal je Frame rendern (GPU-gebunden messen). */
  repeat: number;
  /** Glatte Terminator-Silhouetten der Werfer. */
  smoothCasters: boolean;
  /** Diagnose: 1 = Einzelkarte (keine Kamera binden), 2 = three-Standard-PCF (kein eigener Filter). */
  legacy: 0 | 1 | 2;
  /** Tiefenvergleich: -1 automatisch, 0 Hardware-Vergleichs-Sampler, 1 manuell im Shader (WebGL2-Rückfall). */
  compare: -1 | 0 | 1;
}

export const DEFAULT_SHADOW_PARAMS: ShadowLabParams = {
  mode: 'split',
  view: 'iphone',
  sunElevation: 10,
  sunAzimuth: 70,
  cascades: 'hoch',
  taps: 0,
  debug: 0,
  magnifier: true,
  magX: 0.5,
  magY: 0.55,
  rotate: 0,
  quality: 'hoch',
  node: 1,
  lambda: 0.72,
  spin: 0,
  slopeBias: 0.04,
  grazingBias: 0.006,
  repeat: 1,
  smoothCasters: true,
  legacy: 0,
  compare: -1,
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
}

interface ViewPose {
  offset: Vector3;
  look: Vector3;
  fov: number;
  curvature: number;
  /** NDC-y, auf dem der Fokusknoten liegt. */
  ndcY: number;
}

/**
 * iPhone: FlowScenes Kartenpose (0, 9, 8) mit Zoom 0,7, Blick (0, 0, −4), FOV 70 — bei Querformat ≈ 113° horizontal,
 * das ist die übertriebene, tiefe Perspektive aus `docs/progress/p2e-shadow-before-iphone.webp`.
 */
const VIEWS: Record<ShadowLabView, ViewPose> = {
  iphone: { offset: new Vector3(0, 9, 8).multiplyScalar(0.7), look: new Vector3(0, 0, -4), fov: 70, curvature: 0, ndcY: -0.36 },
  earle: { offset: new Vector3(0, 4.6, 0.8), look: new Vector3(0, 0, -3.06), fov: 86, curvature: 0.14, ndcY: -0.3 },
  uebersicht: { offset: new Vector3(0, 9, 8), look: new Vector3(0, 0, -4), fov: 70, curvature: 0, ndcY: -0.36 },
  nah: { offset: new Vector3(0, 2.3, 2.0), look: new Vector3(0, 0, -3), fov: 60, curvature: 0, ndcY: -0.25 },
  /** Draufsicht (Diagnose): Schattenformen ohne Perspektive. */
  oben: { offset: new Vector3(0, 22, 0.01), look: new Vector3(0, 0, 0), fov: 60, curvature: 0, ndcY: 0 },
};

const _v = new Vector3();
const _q = new Quaternion();
const _Y = new Vector3(0, 1, 0);
const INK = new Color('#081b25');

/**
 * P2e Schatten-Lab: die Flow-Welt (MapWorld + Pfad, unverändert wiederverwendet) mit dem neuen Sonnen-Rig
 * (`fitToView` → kamera-gefittete Kaskaden, B-Spline-Kante). Alt/Neu/Split ohne Neukompilieren, 4×-Lupe (zweiter
 * Render mit `setViewOffset` in ein Inset), Kaskaden- und Texel-Debug, Sonnenregler, Rotation für den Stabilitätstest.
 */
export class ShadowLabScene implements SceneController {
  private params: ShadowLabParams;
  private ctx: SceneContext | null = null;
  private world: MapWorld | null = null;
  private nodePath: NodePath | null = null;
  private readonly magCamera = new PerspectiveCamera(70, 1, 0.3, 700);
  private readonly probe = new PerspectiveCamera(70, 1, 0.3, 700);
  private trackball: Trackball | null = null;
  private readonly listeners = new Set<(p: ShadowLabParams) => void>();
  private cpuMs = 0;
  private needsSnap = true;
  private appliedSpin = 0;
  private elapsed = 0;

  constructor(initial: Partial<ShadowLabParams> = {}) {
    this.params = { ...DEFAULT_SHADOW_PARAMS, ...initial };
  }

  get isMounted(): boolean {
    return this.ctx !== null;
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.trackball = new Trackball({
      radius: PLANET_RADIUS,
      tau: 0.4,
      maxTilt: Math.PI,
      worldUnitsPerPixel: () => this.worldUnitsPerPixel(),
    });
    this.trackball.attach(ctx.canvas);
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
    const sunLocal = world.sunDirection(new Vector3());
    this.nodePath = new NodePath(world.layout, sunLocal);
    world.planet.add(this.nodePath.group);
    this.nodePath.setProgress(p.node, p.node);
    // --- Die neue API, genau so wie ein Konsument sie nutzt -----------------------------------------------
    const sun = world.sun;
    sun.setCascades(p.cascades);
    sun.setTaps(p.taps === 0 ? null : p.taps);
    sun.setReferenceEnabled(true);
    this.bindView();
    sun.setBias(p.slopeBias, p.grazingBias);
    sun.setSmoothCasters(p.smoothCasters);
    sun.setManualCompare(p.compare < 0 ? null : p.compare === 1);
    sun.setDebug(p.debug);
    this.needsSnap = true;
    this.appliedSpin = 0;
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
    world.sun.fitToPlanet(world.camera, () => this.world?.world, world.planet);
  }

  private disposeWorld(): void {
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
        if (next.cascades !== prev.cascades) sun.setCascades(next.cascades);
        if (next.taps !== prev.taps) sun.setTaps(next.taps === 0 ? null : next.taps);
        if (next.debug !== prev.debug) sun.setDebug(next.debug);
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
        if (next.view !== prev.view || next.node !== prev.node || next.spin !== prev.spin) {
          this.nodePath?.setProgress(next.node, next.node);
          this.needsSnap = true;
        }
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
    cam.lookAt(_v.copy(pose.look).add(this.world!.rig.position));
    cam.fov = pose.fov;
    cam.updateProjectionMatrix();
  }

  private worldUnitsPerPixel(): number {
    const h = this.ctx?.height ?? 800;
    const pose = this.pose();
    const dist = pose.offset.distanceTo(pose.look);
    return (2 * dist * Math.tan((pose.fov * Math.PI) / 360)) / h;
  }

  /** Planet so drehen, dass der Fokusknoten auf `ndcY` liegt, Pfad Richtung Horizont (wie FlowScene). */
  private snapToNode(): void {
    const world = this.world;
    if (!world || !this.ctx) return;
    const pose = this.pose();
    const node = world.layout.nodes[Math.min(this.params.node, world.layout.nodes.length - 1)];
    if (!node) return;
    const cam = this.probe;
    cam.aspect = this.ctx.width / this.ctx.height;
    cam.fov = pose.fov;
    cam.position.copy(pose.offset).add(world.rig.position);
    cam.up.set(0, 1, 0);
    cam.lookAt(_v.copy(pose.look).add(world.rig.position));
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const origin = cam.position.clone();
    const dir = new Vector3(0, pose.ndcY, 0.5).unproject(cam).sub(origin).normalize();
    const r = PLANET_RADIUS + 0.9;
    const b = origin.dot(dir);
    const c = origin.lengthSq() - r * r;
    const disc = b * b - c;
    const target = disc >= 0 ? origin.clone().addScaledVector(dir, -b - Math.sqrt(disc)).normalize() : new Vector3(0, 1, 0);
    world.planet.quaternion.identity();
    world.planet.updateMatrixWorld(true);
    const nodeDir = new Vector3(node.position[0], node.position[1], node.position[2]).normalize();
    world.planet.quaternion.setFromUnitVectors(nodeDir, target);
    // Kurs: Pfadrichtung (zum nächsten Knoten) zeigt in die Bildtiefe
    const next = world.layout.nodes[Math.min(this.params.node + 1, world.layout.nodes.length - 1)];
    if (next && next !== node) {
      const a = new Vector3(next.position[0], next.position[1], next.position[2]).sub(new Vector3(node.position[0], node.position[1], node.position[2]));
      a.applyQuaternion(world.planet.quaternion);
      a.addScaledVector(target, -a.dot(target)).normalize();
      const fwd = new Vector3(0, 0, -1).addScaledVector(target, target.z).normalize();
      const angle = Math.atan2(target.dot(new Vector3().crossVectors(a, fwd)), a.dot(fwd));
      world.planet.quaternion.premultiply(_q.setFromAxisAngle(target, angle));
    }
    world.planet.quaternion.premultiply(_q.setFromAxisAngle(target, (this.params.spin * Math.PI) / 180));
    this.appliedSpin = this.params.spin;
    this.trackball?.quaternion.copy(world.planet.quaternion);
    world.world.curvature.value = pose.curvature;
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
    const tb = this.trackball;
    if (!world || !tb) return;
    const t0 = performance.now();
    this.elapsed += dt;
    if (this.needsSnap) {
      this.snapToNode();
      this.needsSnap = false;
    }
    let rotated = tb.step(dt);
    if (this.params.rotate !== 0 && dt > 0 && !tb.isDragging) {
      _q.setFromAxisAngle(_Y, ((this.params.rotate * Math.PI) / 180) * dt);
      tb.quaternion.premultiply(_q);
      rotated = true;
    }
    if (rotated) {
      world.planet.quaternion.copy(tb.quaternion);
      world.markShadowDirty();
    }
    const pose = this.pose();
    this.applyCamera(world.camera, pose);
    world.world.curvature.value = pose.curvature;
    world.update();
    this.nodePath?.update(this.elapsed);
    this.render(ctx);
    const ms = performance.now() - t0;
    this.cpuMs += (ms - this.cpuMs) * 0.1;
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
    sun.keepReference(p.mode !== 'neu');
    const bg = scene.background;
    r.setClearColor(INK, 1);
    if (!split) {
      sun.showReference(p.mode === 'alt');
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
  }

  /** 4×-Lupe: gleicher Blick, `setViewOffset` auf ein Viertel-Fenster um die Lupenmitte, Inset unten rechts. */
  magnifierRects(): { src: { x: number; y: number; w: number; h: number }; insets: Array<{ x: number; y: number; w: number; h: number; label: string }> } {
    const ctx = this.ctx;
    const W = ctx?.width ?? 1;
    const H = ctx?.height ?? 1;
    const size = Math.round(Math.min(W * 0.3, H * 0.46));
    const split = this.params.mode === 'split';
    const src = { w: size / 4, h: size / 4, x: this.params.magX * W - size / 8, y: this.params.magY * H - size / 8 };
    const pad = 12;
    const count = split ? 2 : 1;
    const total = count * size + (count - 1) * pad;
    // Insets auf die Seite, die der Lupenmitte gegenüberliegt (sonst verdecken sie die gezeigte Kante)
    const right = this.params.magX < 0.5;
    const x0 = right ? W - total - pad : pad;
    const y = Math.round(Math.max(right ? 64 : 200, Math.min(H - size - pad - 60, H * 0.12)));
    const labels = split ? ['Alt 4×', 'Neu 4×'] : [this.params.mode === 'alt' ? 'Alt 4×' : 'Neu 4×'];
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
    const split = this.params.mode === 'split';
    r.setScissorTest(true);
    insets.forEach((inset, i) => {
      world.sun.showReference(split ? i === 0 : this.params.mode === 'alt');
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

  // --- Messwerte ---------------------------------------------------------------------------------------------

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
    this.trackball?.detach();
    this.trackball = null;
    this.disposeWorld();
    if (this.ctx) this.ctx.renderer.shadowMap.enabled = false;
    this.listeners.clear();
    this.ctx = null;
  }
}
