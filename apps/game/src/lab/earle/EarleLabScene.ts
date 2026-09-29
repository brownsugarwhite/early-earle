import { Color, Frustum, Group, Matrix4, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { EarlePlanet, FogStripes, SunRig, createSkyDome, skySunIndices } from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { Trackball } from './trackball';
import { resolveQuality, type QualityLevel, type QualityPreset, type ResolvedQuality } from './quality';
import { NODES_PER_ZONE, ZONE_CONTENTS, planetZones } from './zones';

export interface EarleLabParams {
  /** Fortschritt: Anzahl geschaffter Knoten (0..100) → Wachstum je Chunk entlang des Pfads. */
  progress: number;
  /** Sonnenhöhe in Grad (6–15). */
  sunElevation: number;
  /** Sonnenazimut relativ zur Blickachse in Grad (positiv = Sonne rechts, Schatten nach links). */
  sunAzimuth: number;
  /** Lichtbänder Terrain (2–5). */
  bands: number;
  /** Nebelstufen (3–6). */
  fogSteps: number;
  /** Dichtefaktor der Vegetation in Prozent (Preset setzt den Standard). */
  density: number;
  /** Nachschärfender Schattenfilter (true) oder three-Standard-PCF (false). */
  hardShadow: boolean;
  /** Qualitätsstufe: Hoch / Mobil / Auto (Touch oder DPR ≥ 2.5 → Mobil). */
  quality: QualityLevel;
  /** Risse geschlossen (Index = Grenze Zone i | i+1). */
  cracksClosed: boolean[];
  seed: number;
}

export const DEFAULT_EARLE_PARAMS: EarleLabParams = {
  progress: 12,
  sunElevation: 10,
  sunAzimuth: 70,
  bands: 4,
  fogSteps: 5,
  density: 100,
  hardShadow: true,
  quality: 'auto',
  cracksClosed: [false, false, false],
  seed: 7,
};

export interface EarleBenchInfo {
  backend: 'webgpu' | 'webgl2' | 'unknown';
  dpr: number;
  deviceDpr: number;
  canvas: [number, number];
  css: [number, number];
  ua: string;
  preset: ResolvedQuality;
}

export const PLANET_RADIUS = 40;
const CHUNKS_PER_FACE = 3;
const CAMERA_OFFSET = new Vector3(0, 9, 8);
const LOOK_AT = new Vector3(0, 0, -4);
/** NDC y des aktuellen Knotens (unteres Drittel). */
const TARGET_NDC_Y = -0.36;
const _Y = new Vector3(0, 1, 0);

/**
 * P2 Earle-Lab auf dem ganzen Planeten: Cube-Sphere-Chunks (Laden nach Sicht), vier Zonen mit Rissen, Spiralpfad
 * mit allen Knoten, Wachstum je Chunk aus dem Fortschritt, Vegetation in Pools, Sonnen-Rig mit nachgeschärften
 * Schatten. Kamera fest am Scheitel-Rig (FOV 70), der Planet rollt per Trackball (ohne Federgrenze: die
 * Rückseite ist erreichbar) und dreht sich beim Fortschritt automatisch zum letzten Knoten.
 */
export class EarleLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(70, 1, 0.5, 700);
  private readonly probe = new PerspectiveCamera(70, 1, 0.5, 700);
  private readonly rig = new Object3D();
  private readonly planet = new Group();
  private readonly sun: SunRig;
  private readonly trackball: Trackball;
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly skyHorizon = uniform(-0.5);
  private readonly frustum = new Frustum();
  private params: EarleLabParams;
  private preset: QualityPreset;
  private ctx: SceneContext | null = null;
  private world: EarlePlanet | null = null;
  private fogStripes: FogStripes | null = null;
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly listeners = new Set<(p: EarleLabParams) => void>();
  private readonly tmp = new Vector3();
  private readonly tmpQ = new Quaternion();
  private readonly tmpM = new Matrix4();
  private readonly sunLocal = new Vector3();
  private readonly targetDir = new Vector3(0, 1, 0);
  private shadowDirty = true;
  private zoom = 1;
  private autoRotate = 0;
  private autoTurn: { q0: Quaternion; q1: Quaternion; t: number } | null = null;
  /** Anzahl angeforderter Schattenpässe (für die Leerlauf-Kontrolle). */
  shadowPasses = 0;

  constructor(initial: Partial<EarleLabParams> = {}) {
    this.params = { ...DEFAULT_EARLE_PARAMS, ...initial };
    this.preset = resolveQuality(this.params.quality);
    this.sun = new SunRig({
      mapSize: this.preset.shadowMapSize,
      sharpen: this.params.hardShadow,
      elevationDeg: this.params.sunElevation,
      azimuthDeg: this.params.sunAzimuth,
    });
    this.trackball = new Trackball({
      radius: PLANET_RADIUS,
      tau: 0.4,
      maxTilt: Math.PI,
      worldUnitsPerPixel: () => this.worldUnitsPerPixel(),
      onZoom: (f) => this.setZoom(this.zoom * f),
    });
  }

  get isMounted(): boolean {
    return this.ctx !== null;
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.name = 'EarleLab';
    this.scene.background = new Color('#081b25');
    this.rig.position.set(0, PLANET_RADIUS, 0);
    this.scene.add(this.rig, this.planet);
    this.rig.add(this.camera);
    this.sun.root.position.copy(LOOK_AT);
    this.rig.add(this.sun.root);
    this.setZoom(1);
    this.trackball.attach(ctx.canvas);
    this.buildWorld();
    this.applyParams(this.params, true);
    this.resize(ctx);
    this.snapToNode(Math.max(0, Math.min(this.params.progress, NODES_PER_ZONE * ZONE_CONTENTS.length - 1)));
  }

  private buildWorld(): void {
    this.world?.dispose();
    this.fogStripes?.dispose();
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    const zones = planetZones();
    const p = this.preset;
    const world = new EarlePlanet({
      radius: PLANET_RADIUS,
      seed: this.params.seed,
      chunksPerFace: CHUNKS_PER_FACE,
      zones,
      quality: {
        chunkRes: Math.max(12, Math.round(p.terrainRes / 3)),
        dotsPerTree: p.dotsPerTree,
        collapsePx: p.collapsePx,
        densityScale: (p.treeCount / 260) * (this.params.density / 100),
        nearChunks: p.name === 'mobil' ? 3 : 5,
        capacity: p.name === 'mobil' ? { trees: 1400, dots: 14000, props: 300, animals: 160 } : { trees: 2600, dots: 45000, props: 400, animals: 220 },
      },
      path: { nodesPerZone: NODES_PER_ZONE, turns: 2.75, clearNode: 3.4, clearPath: 1.0 },
      loadsPerFrame: 2,
    });
    this.world = world;
    this.planet.add(world.group);
    world.terrainBands.value = this.params.bands;
    world.fog.steps.value = this.params.fogSteps;

    const sunIdx = skySunIndices(zones[0]!.palette);
    const sky = createSkyDome({
      lookup: world.lookup,
      skyRow: world.rows[0]!.sky,
      steps: sunIdx.steps,
      sunIndex: sunIdx.sun,
      ringIndex: sunIdx.ring,
      sunDirWorld: this.sunDirWorld,
      skyRowB: world.skyRowB,
      skyMix: world.skyMix,
      horizonY: this.skyHorizon,
    });
    this.camera.add(sky);
    this.disposables.push(sky.geometry, sky.material as { dispose(): void }, { dispose: () => sky.removeFromParent() });
    this.fogStripes = new FogStripes({
      lookup: world.lookup,
      fogRow: world.fog.row,
      colorIndex: 5,
      count: p.fogStripes,
      firstDistance: 6,
      spacing: p.fogStripes > 2 ? 5 : 8,
      curvatureRadius: PLANET_RADIUS,
    });
    this.rig.add(this.fogStripes.group);
    this.shadowDirty = true;
  }

  /** Pixel-Ratio-Override: CanvasHost setzt min(DPR, 2), das Preset deckelt weiter (Mobil 1.5). */
  private applyDpr(): void {
    if (!this.ctx) return;
    const { renderer, width, height, dpr } = this.ctx;
    const target = Math.min(dpr, this.preset.dprCap);
    if (Math.abs(renderer.getPixelRatio() - target) > 1e-3) {
      renderer.setPixelRatio(target);
      renderer.setSize(width, height, false);
    }
  }

  // --- Parameter ----------------------------------------------------------------------------------

  setParams(patch: Partial<EarleLabParams>): void {
    this.applyParams({ ...this.params, ...patch }, false);
  }

  getParams(): EarleLabParams {
    return { ...this.params, cracksClosed: [...this.params.cracksClosed] };
  }

  getResolvedQuality(): ResolvedQuality {
    return this.preset.name;
  }

  subscribe(listener: (p: EarleLabParams) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private applyParams(next: EarleLabParams, force: boolean): void {
    const prev = this.params;
    const keys = Object.keys(next) as Array<keyof EarleLabParams>;
    const changed = force || keys.some((k) => (k === 'cracksClosed' ? next.cracksClosed.join() !== prev.cracksClosed.join() : next[k] !== prev[k]));
    this.params = next;
    if (!changed) return;
    if (this.ctx && this.world) {
      const preset = resolveQuality(next.quality);
      const presetChanged = force || preset.name !== this.preset.name;
      this.preset = preset;
      if (presetChanged || next.seed !== prev.seed || next.density !== prev.density) {
        this.applyDpr();
        this.sun.setMapSize(preset.shadowMapSize);
        this.buildWorld();
      }
      const world = this.world;
      world.terrainBands.value = Math.max(2, Math.min(5, Math.round(next.bands)));
      world.fog.steps.value = Math.max(2, Math.min(6, Math.round(next.fogSteps)));
      next.cracksClosed.forEach((closed, i) => world.setCrackClosed(i, closed));
      if (force || next.progress !== prev.progress) {
        world.setProgress(next.progress);
        this.shadowDirty = true;
        if (!force) this.turnToNode(Math.max(0, Math.min(next.progress, world.path.nodes.length - 1)));
      }
      if (force || next.sunElevation !== prev.sunElevation || next.sunAzimuth !== prev.sunAzimuth) {
        this.sun.setAngles(next.sunElevation, next.sunAzimuth);
        this.shadowDirty = true;
      }
      if (force || next.hardShadow !== prev.hardShadow) {
        this.sun.setSharpen(next.hardShadow);
        this.shadowDirty = true;
      }
    }
    for (const l of this.listeners) l(this.getParams());
  }

  // --- Kamera / Interaktion -----------------------------------------------------------------------

  private worldUnitsPerPixel(): number {
    const h = this.ctx?.height ?? 800;
    const dist = CAMERA_OFFSET.clone().multiplyScalar(this.zoom).distanceTo(LOOK_AT);
    return (2 * dist * Math.tan((this.camera.fov * Math.PI) / 360)) / h;
  }

  setZoom(z: number): void {
    this.zoom = Math.min(2.4, Math.max(0.55, z));
    this.camera.position.copy(CAMERA_OFFSET).multiplyScalar(this.zoom);
    this.camera.lookAt(this.tmp.copy(LOOK_AT).add(this.rig.position));
  }

  /** Programmatisches Ziehen (Tests): Pixel-Delta wie eine Zeigerbewegung. */
  rotateBy(dxPx: number, dyPx: number): void {
    this.trackball.drag(dxPx, dyPx, 1 / 60);
    this.planet.quaternion.copy(this.trackball.quaternion);
    this.shadowDirty = true;
  }

  /** Konstante Drehung um die Hochachse (rad/s), 0 = aus. Für die Bench "rotierend". */
  setAutoRotate(radPerSec: number): void {
    this.autoRotate = radPerSec;
  }

  /** Weltrichtung (vom Planetenmittelpunkt), die im unteren Drittel erscheint. */
  private computeTargetDir(): void {
    const cam = this.probe;
    cam.aspect = this.camera.aspect;
    cam.fov = this.camera.fov;
    cam.position.copy(CAMERA_OFFSET).add(this.rig.position);
    cam.lookAt(this.tmp.copy(LOOK_AT).add(this.rig.position));
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const origin = cam.position.clone();
    const dir = this.tmp.set(0, TARGET_NDC_Y, 0.5).unproject(cam).sub(origin).normalize();
    const r = PLANET_RADIUS + 0.9;
    const b = origin.dot(dir);
    const c = origin.lengthSq() - r * r;
    const disc = b * b - c;
    if (disc < 0) {
      this.targetDir.set(0, 1, 0);
      return;
    }
    this.targetDir.copy(origin).addScaledVector(dir, -b - Math.sqrt(disc)).normalize();
  }

  private nodeDirWorld(index: number, out: Vector3): Vector3 | null {
    const node = this.world?.path.nodes[index];
    if (!node) return null;
    return out.set(node.position[0], node.position[1], node.position[2]).applyQuaternion(this.planet.quaternion).normalize();
  }

  /** Planet sofort so drehen, dass Knoten `index` im unteren Drittel liegt. */
  snapToNode(index: number): void {
    this.computeTargetDir();
    const d = this.nodeDirWorld(index, this.tmp);
    if (!d) return;
    this.tmpQ.setFromUnitVectors(d, this.targetDir);
    this.planet.quaternion.premultiply(this.tmpQ);
    this.trackball.quaternion.copy(this.planet.quaternion);
    this.shadowDirty = true;
  }

  /** Weich (Slerp, 1 s) zum Knoten drehen; ein Zug bricht ab. */
  turnToNode(index: number): void {
    this.computeTargetDir();
    const d = this.nodeDirWorld(index, this.tmp);
    if (!d) return;
    const delta = new Quaternion().setFromUnitVectors(d, this.targetDir);
    this.autoTurn = { q0: this.planet.quaternion.clone(), q1: delta.multiply(this.planet.quaternion.clone()), t: 0 };
  }

  resize(ctx: SceneContext): void {
    this.applyDpr();
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    const world = this.world;
    if (!world) return;
    let rotated = this.trackball.step(dt);
    if (this.trackball.isDragging) this.autoTurn = null;
    if (this.autoTurn) {
      this.autoTurn.t = Math.min(1, this.autoTurn.t + dt / 1.0);
      const t = this.autoTurn.t;
      const e = t * t * (3 - 2 * t);
      this.planet.quaternion.slerpQuaternions(this.autoTurn.q0, this.autoTurn.q1, e);
      this.trackball.quaternion.copy(this.planet.quaternion);
      rotated = true;
      if (t >= 1) this.autoTurn = null;
    }
    if (this.autoRotate !== 0 && dt > 0) {
      this.tmpQ.setFromAxisAngle(_Y, this.autoRotate * dt);
      this.trackball.quaternion.premultiply(this.tmpQ);
      rotated = true;
    }
    if (rotated) {
      this.planet.quaternion.copy(this.trackball.quaternion);
      this.shadowDirty = true;
    }
    this.scene.updateMatrixWorld(true);
    this.sun.directionWorld(this.sunDirWorld.value);
    this.planet.getWorldQuaternion(this.tmpQ).invert();
    this.sunLocal.copy(this.sunDirWorld.value).applyQuaternion(this.tmpQ);
    world.vegetation.setSunDirection(this.sunDirWorld.value, this.sunLocal);

    const camWorld = this.camera.getWorldPosition(this.tmp);
    const camR = camWorld.length();
    this.skyHorizon.value = -Math.sin(Math.acos(Math.min(1, PLANET_RADIUS / Math.max(PLANET_RADIUS + 0.01, camR))));
    this.tmpM.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.tmpM, this.camera.coordinateSystem);
    if (world.update(this.camera, camWorld, this.planet.matrixWorld, this.frustum)) this.shadowDirty = true;

    // Zone unter dem Blickpunkt → Himmel/Nebel
    const look = new Vector3(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new Quaternion()));
    const b = camWorld.dot(look);
    const c = camWorld.lengthSq() - (PLANET_RADIUS + 0.5) ** 2;
    const disc = b * b - c;
    const dirWorld = disc >= 0 ? camWorld.clone().addScaledVector(look, -b - Math.sqrt(disc)).normalize() : camWorld.clone().normalize();
    world.setViewZone(world.zoneCoordAt(dirWorld.applyQuaternion(this.tmpQ)));

    if (this.shadowDirty) {
      if (!world.bounds.isEmpty()) this.sun.fitShadow(world.bounds, this.planet.matrixWorld, world.hTotal);
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
    ctx.renderer.render(this.scene, this.camera);
  }

  // --- Messwerte ----------------------------------------------------------------------------------

  getStats(): { drawCalls: number; shadowPasses: number; chunks: number; trees: number; dots: number; preset: ResolvedQuality; dpr: number; zone: string } {
    const info = this.ctx?.renderer.info as { render?: { drawCalls?: number } } | undefined;
    const world = this.world;
    let trees = 0;
    if (world) for (const kind of Object.keys(world.vegetation.canopies) as Array<keyof typeof world.vegetation.canopies>) trees += world.vegetation.canopies[kind].count;
    const zc = world ? world.zoneCoordAt(this.targetDir.clone().applyQuaternion(this.planet.quaternion.clone().invert())) : 0;
    return {
      drawCalls: info?.render?.drawCalls ?? 0,
      shadowPasses: this.shadowPasses,
      chunks: world?.loadedCount ?? 0,
      trees,
      dots: (world?.vegetation.dots.geometry as { instanceCount?: number } | undefined)?.instanceCount ?? 0,
      preset: this.preset.name,
      dpr: this.ctx?.renderer.getPixelRatio() ?? 0,
      zone: ZONE_CONTENTS[Math.min(ZONE_CONTENTS.length - 1, Math.floor(zc))]?.name ?? '',
    };
  }

  getBenchInfo(): EarleBenchInfo {
    const r = this.ctx?.renderer;
    return {
      backend: this.ctx?.backend ?? 'unknown',
      dpr: r?.getPixelRatio() ?? 0,
      deviceDpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      canvas: [r?.domElement.width ?? 0, r?.domElement.height ?? 0],
      css: [this.ctx?.width ?? 0, this.ctx?.height ?? 0],
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      preset: this.preset.name,
    };
  }

  dispose(): void {
    this.trackball.detach();
    this.world?.dispose();
    this.fogStripes?.dispose();
    for (const d of this.disposables) d.dispose();
    this.sun.dispose();
    if (this.ctx) {
      this.ctx.renderer.shadowMap.enabled = false;
      this.ctx.renderer.setPixelRatio(this.ctx.dpr);
    }
    this.listeners.clear();
    this.scene.clear();
    this.world = null;
    this.ctx = null;
  }
}
