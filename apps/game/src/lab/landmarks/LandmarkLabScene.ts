import { Box3, Color, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicNodeMaterial, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { color, float, uniform } from 'three/tsl';
import { BOARD_SHADOW_LAYER, EarleMaterial, PaletteAtlas, PaletteLookup, SunRig, addWorldPalette, createFogSettings, createSkyDome } from '@ee/render';
import { LandmarkSet, addLandmarkPalette, landmarkPaletteFromWorld, landmarkPlateauStyle, type LandmarkPalette, type LandmarkRows } from '@ee/render/earle/landmarks/set/index.ts';
import {
  DEFAULT_LANDMARK_PLAN,
  instanceOf,
  landmarkBlueprint,
  landmarkGround,
  localGround,
  placeLandmark,
  planLandmarks,
  type LandmarkEnv,
  type LandmarkInstance,
  type LandmarkKind,
  type LandmarkPlacement,
  type P2,
} from '@ee/world';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { LevelBoard } from '../../flow/LevelBoard';
import { useGridStore } from '../grid/gridStore';
import { WORLD_CONTENTS } from '../earle/zones';
import { resolveQuality, type QualityLevel, type QualityPreset, type ResolvedQuality } from '../earle/quality';
import { OrbitRig, type OrbitView } from '../tree/orbit';
import { createPatchGeometry, labHeight } from './terrain';

export type LandmarkLabKind = LandmarkKind | 'region';
export type LandmarkLabView = 'karte' | 'unten' | 'level' | 'weit' | 'oben';

export interface LandmarkLabParams {
  kind: LandmarkLabKind;
  seed: number;
  /** Earle world 0..9 (palette). */
  world: number;
  view: LandmarkLabView;
  quality: QualityLevel;
  /** Level board on the anchor. */
  board: boolean;
  /** Route waypoints as stones. */
  route: boolean;
  mirror: 'auto' | 'links' | 'rechts';
  sunElevation: number;
  sunAzimuth: number;
  sunFollowsCamera: boolean;
  /** Speed of falls, spray, ripples, bubbles. */
  flow: number;
  /** Vertical glow of rock and stone (gradient hook). */
  gradient: number;
  /** Camera override (yaw, pitch, distance) on top of the view preset — URL `?cam=yaw,pitch,dist`. */
  cam?: [number, number, number] | undefined;
}

export const DEFAULT_LANDMARK_LAB: LandmarkLabParams = {
  kind: 'fallsRock',
  seed: 7,
  world: 0,
  view: 'karte',
  quality: 'auto',
  board: true,
  route: true,
  mirror: 'auto',
  sunElevation: 11,
  sunAzimuth: 68,
  sunFollowsCamera: true,
  flow: 1,
  gradient: 0.35,
};

export interface LandmarkLabStats {
  drawCalls: number;
  triangles: number;
  landmarks: number;
  dots: number;
  meshes: number;
  anchor: { radius: number; height: number } | null;
  ascent: number;
  descent: number;
  preset: ResolvedQuality;
  shadowPasses: number;
  backend: string;
}

/** Region of the placement demo (plane coordinates). */
const REGION = { minX: -96, minZ: -96, maxX: 96, maxZ: 96 };
const PATCH_RADIUS = 78;
const REGION_PATCH_RADIUS = 150;

/** The level path of the placement demo: a meander along z (the lab's stand-in for the globe's path). */
function demoPathX(z: number): number {
  return 16 * Math.sin(z / 38) + 6 * Math.sin(z / 13 + 1);
}

const _v = new Vector3();
const _q = new Quaternion();
const _m = new Matrix4();
const _box = new Box3();

/**
 * `/lab/landmarks`: each landmark on a small Earle terrain patch (carved by the landmark: pools, streams, ponds),
 * low sun on the camera yaw with long hard shadows, a level board on the anchor, the route as stones; or the
 * placement demo (`region`): the planner on a 190 × 190 patch with a meandering path and a lake.
 */
export class LandmarkLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(40, 1, 0.3, 1400);
  private readonly sunPivot = new Object3D();
  private readonly world = new Group();
  private readonly orbit = new OrbitRig();
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly bands = uniform(4);
  private sun: SunRig;
  private params: LandmarkLabParams;
  private preset: QualityPreset;
  private ctx: SceneContext | null = null;
  private atlas: PaletteAtlas | null = null;
  private set: LandmarkSet | null = null;
  private board: LevelBoard | null = null;
  private instances: LandmarkInstance[] = [];
  private palette: LandmarkPalette | null = null;
  private readonly disposables: Array<() => void> = [];
  private readonly listeners = new Set<(p: LandmarkLabParams) => void>();
  private shadowDirty = true;
  private lastYaw = NaN;
  private pendingView: LandmarkLabView | null = null;
  shadowPasses = 0;

  constructor(initial: Partial<LandmarkLabParams> = {}) {
    this.params = { ...DEFAULT_LANDMARK_LAB, ...initial };
    this.preset = resolveQuality(this.params.quality);
    this.sun = new SunRig({ mapSize: this.preset.shadowMapSize, sharpen: true, elevationDeg: this.params.sunElevation, azimuthDeg: this.params.sunAzimuth, distance: 160 });
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.name = 'LandmarkLab';
    this.scene.add(this.world, this.sunPivot, this.camera);
    this.sunPivot.add(this.sun.root);
    this.sun.light.shadow.camera.layers.enable(BOARD_SHADOW_LAYER);
    this.sun.fitToView(this.camera, { plane: { minHeight: -2.5, maxHeight: 15 }, maxDistance: 320 });
    this.orbit.attach(ctx.canvas);
    this.build();
    this.resize(ctx);
    this.setView(this.pendingView ?? this.params.view);
  }

  // --- world -----------------------------------------------------------------------------------------------------

  private mirrorOption(): boolean | undefined {
    return this.params.mirror === 'auto' ? undefined : this.params.mirror === 'links';
  }

  private makeInstances(): LandmarkInstance[] {
    const p = this.params;
    const detail = this.preset.name === 'mobil' ? 0.55 : 1;
    const mirror = this.mirrorOption();
    if (p.kind === 'region') {
      const env = this.regionEnv();
      const plan = planLandmarks(REGION, p.seed, { ...DEFAULT_LANDMARK_PLAN, cell: 56, density: 0.9 }, env);
      return plan.map((pl) => placeLandmark(pl, labHeight, { detail }));
    }
    const kind = p.kind;
    const placement: LandmarkPlacement = { id: `${kind}:lab`, kind, x: 0, z: 0, y: labHeight(0, 0), yaw: 0, seed: p.seed, radius: 16, world: p.world };
    const bp = landmarkBlueprint(kind, p.seed, { ground: localGround(placement, labHeight), detail, ...(mirror !== undefined ? { mirror } : {}) });
    return [instanceOf(placement, bp)];
  }

  private regionEnv(): LandmarkEnv {
    return {
      heightAt: labHeight,
      isWater: (x, z, margin) => Math.hypot(x - 46, z + 38) < 13 + margin,
      pathDistance: (x, z) => Math.abs(x - demoPathX(z)),
      pathDirection: (x, z) => {
        const dx = demoPathX(z) - x;
        return [Math.sign(dx) || 1, 0];
      },
      worldAt: () => this.params.world,
    };
  }

  private build(): void {
    this.teardown();
    const p = this.params;
    const content = WORLD_CONTENTS[Math.max(0, Math.min(WORLD_CONTENTS.length - 1, p.world))]!;
    const pal = content.palette;
    const atlas = new PaletteAtlas();
    this.atlas = atlas;
    const lookup = new PaletteLookup(atlas.texture, atlas.width, atlas.height);
    const worldRows = addWorldPalette(atlas, pal, 'lab', { water: true, rock: true });
    const lp = landmarkPaletteFromWorld(pal);
    this.palette = lp;
    const lmRows: LandmarkRows = addLandmarkPalette(atlas, lp, 'lab');
    const region = p.kind === 'region';
    const fog = createFogSettings({ row: worldRows.fog, steps: pal.fog.length, start: region ? 150 : 90, range: region ? 260 : 170 });
    this.scene.background = new Color(pal.sky[Math.floor(pal.sky.length / 2)] ?? '#7ce6d5');

    this.instances = this.makeInstances();
    const instances = this.instances;

    // terrain patch, carved by the landmarks (pools, streams, swamp ponds)
    const radius = region ? REGION_PATCH_RADIUS : PATCH_RADIUS;
    const mobil = this.preset.name === 'mobil';
    const ground = createPatchGeometry(radius, mobil ? 110 : 170, mobil ? 150 : 240, (x, z) => landmarkGround(instances, x, z, labHeight(x, z)));
    const groundMat = new EarleMaterial({ lookup, row: worldRows.terrain, fog, bands: this.bands, bandScale: 1.6, terminator: 0.0 });
    const groundMesh = new Mesh(ground, groundMat);
    groundMesh.name = 'lab-ground';
    groundMesh.receiveShadow = true;
    groundMesh.frustumCulled = false;
    groundMesh.userData.shadowGround = true;
    this.world.add(groundMesh);
    this.disposables.push(() => {
      ground.dispose();
      groundMat.dispose();
      groundMesh.removeFromParent();
    });

    // the landmark set
    const set = new LandmarkSet({
      ctx: { lookup, fog, bands: this.bands },
      rowsFor: () => lmRows,
      quality: this.preset.name,
      shade: (w) => this.sun.shadowFactor(w, { softness: 0.1 }),
      groundAt: (x, z) => landmarkGround(instances, x, z, labHeight(x, z)),
    });
    set.uniforms.flow.value = p.flow;
    set.uniforms.gradient.value = p.gradient;
    set.build(instances);
    this.world.add(set.group);
    this.set = set;
    for (const mesh of set.meshes.values()) if (mesh.material) this.sun.trackShadowConsumer(mesh.material);
    this.disposables.push(() => {
      set.dispose();
      this.set = null;
    });

    if (region) this.addRegionDecor(lookup, worldRows.water, fog);
    if (p.route) this.addRouteStones();
    if (p.board && !region) this.addBoard(lp);

    const sky = createSkyDome({ lookup, skyRow: worldRows.sky, steps: pal.sky.length, sunIndex: pal.sky.length, ringIndex: pal.sky.length + 1, sunDirWorld: this.sunDirWorld, spread: 0.5, radius: 1200 });
    this.camera.add(sky);
    this.disposables.push(() => {
      sky.geometry.dispose();
      (sky.material as { dispose(): void }).dispose();
      sky.removeFromParent();
    });
    this.shadowDirty = true;
  }

  /** The path of the placement demo as a dotted band, the lake as a flat disc. */
  private addRegionDecor(lookup: PaletteLookup, waterRow: number, fog: ReturnType<typeof createFogSettings>): void {
    const dotGeo = new CylinderGeometry(0.34, 0.34, 0.08, 10);
    const dotMat = new MeshBasicNodeMaterial();
    dotMat.colorNode = color(new Color('#f7f4e2'));
    const pts: Vector3[] = [];
    for (let z = REGION.minZ; z <= REGION.maxZ; z += 2.2) {
      const x = demoPathX(z);
      pts.push(new Vector3(x, labHeight(x, z) + 0.05, z));
    }
    const dots = new InstancedMesh(dotGeo, dotMat, pts.length);
    pts.forEach((pt, i) => dots.setMatrixAt(i, _m.makeTranslation(pt.x, pt.y, pt.z)));
    dots.instanceMatrix.needsUpdate = true;
    dots.frustumCulled = false;
    this.world.add(dots);
    const lakeGeo = new CylinderGeometry(13, 13, 0.1, 48);
    const lakeMat = new EarleMaterial({ lookup, row: waterRow, fog, bands: this.bands, bandNode: float(0.45), terminatorNode: float(-1) });
    const lake = new Mesh(lakeGeo, lakeMat);
    lake.position.set(46, labHeight(46, -38) + 0.3, -38);
    lake.receiveShadow = true;
    this.world.add(lake);
    this.disposables.push(() => {
      dotGeo.dispose();
      dotMat.dispose();
      dots.removeFromParent();
      lakeGeo.dispose();
      lakeMat.dispose();
      lake.removeFromParent();
    });
  }

  /** Route waypoints as flat cream stones, anchors as pink level stones (the level path's look). */
  private addRouteStones(): void {
    const way = this.instances.flatMap((i) => [...i.route.ascent, ...i.route.descent]);
    const anchors = this.instances.flatMap((i) => i.anchors);
    if (way.length === 0) return;
    const geo = new CylinderGeometry(0.3, 0.34, 0.12, 12);
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color(new Color('#f7f4e2'));
    const stones = new InstancedMesh(geo, mat, way.length);
    way.forEach((w, i) => stones.setMatrixAt(i, _m.makeTranslation(w.position[0], w.position[1] + 0.07, w.position[2])));
    stones.instanceMatrix.needsUpdate = true;
    stones.frustumCulled = false;
    stones.name = 'lab-route';
    const nodeGeo = new CylinderGeometry(0.62, 0.68, 0.16, 20);
    const nodeMat = new MeshBasicNodeMaterial();
    nodeMat.colorNode = color(new Color('#e5aed4'));
    const nodes = new InstancedMesh(nodeGeo, nodeMat, Math.max(1, anchors.length));
    anchors.forEach((a, i) => nodes.setMatrixAt(i, _m.makeTranslation(a.position[0], a.position[1] + 0.09, a.position[2])));
    nodes.count = anchors.length;
    nodes.instanceMatrix.needsUpdate = true;
    nodes.frustumCulled = false;
    // the level stone sits under the board when the board stands there
    nodes.visible = !this.params.board || this.params.kind === 'region';
    this.world.add(stones, nodes);
    this.routeMeshes = [stones, nodes];
    this.disposables.push(() => {
      geo.dispose();
      mat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      stones.removeFromParent();
      nodes.removeFromParent();
      this.routeMeshes = [];
    });
  }

  private routeMeshes: Object3D[] = [];

  private addBoard(lp: LandmarkPalette): void {
    const inst = this.instances[0];
    const anchor = inst?.anchors[0];
    if (!inst || !anchor) return;
    const grid = useGridStore.getState();
    if (!grid.state || grid.levelIndex < 0) grid.loadLevel(0);
    const mobil = this.preset.name === 'mobil';
    const board = new LevelBoard('tjorizo', { octaves: mobil ? 1 : 2, creatures: 'all', raymarch: false });
    this.board = board;
    board.root.position.set(anchor.position[0], anchor.position[1], anchor.position[2]);
    board.root.rotation.y = Math.atan2(anchor.facing[0], anchor.facing[1]);
    board.root.updateMatrix();
    this.world.add(board.root);
    board.setSite(landmarkPlateauStyle(anchor.site, lp), this.params.seed);
    board.setTerrain(-0.15, 0);
    board.bind();
    board.setRise(1);
    board.setMorph(1);
    board.setBlobPop(1);
    this.disposables.push(() => {
      board.dispose();
      board.root.removeFromParent();
      this.board = null;
    });
  }

  private teardown(): void {
    for (const d of this.disposables.splice(0).reverse()) d();
    this.atlas?.dispose();
    this.atlas = null;
    this.instances = [];
  }

  // --- params and views --------------------------------------------------------------------------------------------

  getParams(): LandmarkLabParams {
    return { ...this.params };
  }

  subscribe(listener: (p: LandmarkLabParams) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setParams(patch: Partial<LandmarkLabParams>): void {
    const prev = this.params;
    const next = { ...prev, ...patch };
    const keys = Object.keys(patch) as Array<keyof LandmarkLabParams>;
    if (!keys.some((k) => next[k] !== prev[k])) return;
    this.params = next;
    if (this.ctx) {
      const preset = resolveQuality(next.quality);
      const presetChanged = preset.name !== this.preset.name;
      this.preset = preset;
      if (presetChanged) {
        this.applyDpr();
        this.sun.setMapSize(preset.shadowMapSize);
      }
      const rebuild = presetChanged || next.kind !== prev.kind || next.seed !== prev.seed || next.world !== prev.world || next.mirror !== prev.mirror || next.board !== prev.board || next.route !== prev.route;
      if (rebuild) {
        this.build();
        if (next.kind !== prev.kind) this.setView(next.view);
      }
      if (next.view !== prev.view) this.setView(next.view);
      if (next.sunElevation !== prev.sunElevation || next.sunAzimuth !== prev.sunAzimuth) {
        this.sun.setAngles(next.sunElevation, next.sunAzimuth);
        this.shadowDirty = true;
      }
      if (next.sunFollowsCamera !== prev.sunFollowsCamera) {
        if (!next.sunFollowsCamera) this.sunPivot.rotation.y = 0;
        this.lastYaw = NaN;
        this.shadowDirty = true;
      }
      if (this.set) {
        this.set.uniforms.flow.value = next.flow;
        this.set.uniforms.gradient.value = next.gradient;
      }
    }
    for (const l of this.listeners) l(this.getParams());
  }

  /** Camera to a preset view (also before mount). */
  setView(view: LandmarkLabView): void {
    if (!this.ctx) {
      this.pendingView = view;
      return;
    }
    if (view !== this.params.view) {
      this.params = { ...this.params, view };
      for (const l of this.listeners) l(this.getParams());
    }
    const base = this.viewFor(view);
    // portrait (phone): the same subject needs more distance to fit the narrow width
    const fit = view === 'level' ? 1 : Math.min(2, Math.max(1, 1.2 / Math.max(0.3, this.camera.aspect)));
    const v = { ...base, distance: base.distance * fit };
    const cam = this.params.cam;
    this.orbit.setView(cam ? { ...v, yaw: cam[0], pitch: cam[1], distance: cam[2] } : v);
  }

  private viewFor(view: LandmarkLabView): OrbitView {
    const inst = this.instances[0];
    const bp = inst?.blueprint;
    const H = bp?.anchors[0]?.height ?? 5;
    const R = bp?.radius ?? 12;
    const y0 = inst?.placement.y ?? 0;
    if (this.params.kind === 'region') {
      if (view === 'oben') return { yaw: 0, pitch: 1.32, distance: 210, target: [0, 0, 0] };
      if (view === 'unten' || view === 'level') return { yaw: 0.3, pitch: 0.28, distance: 95, target: [0, 4, 10] };
      return { yaw: 0.12, pitch: 0.62, distance: 190, target: [0, 0, 0] };
    }
    const a = inst?.anchors[0];
    const facing: P2 = a?.facing ?? [0, 1];
    const facingYaw = Math.atan2(facing[0], facing[1]);
    // the tall ruin: its tower rises far above the terrace — frame the whole silhouette, look up from the front-left
    const peak = bp?.height ?? H;
    if (this.params.kind === 'ruin' && view === 'karte') return { yaw: 0.2, pitch: 0.5, distance: Math.max(38, peak * 2.35), target: [0, y0 + Math.max(H * 0.45, peak * 0.38), 0] };
    if (this.params.kind === 'ruin' && view === 'unten') return { yaw: -0.38, pitch: 0.04, distance: Math.max(26, R * 2.2), target: [-1.5, y0 + H * 1.15, -2.5] };
    switch (view) {
      case 'unten': {
        // from the pool's side, low, looking up at the massif (Earle's monoliths from below)
        const pool = bp?.pools[0];
        const px = pool ? pool.center[0] : R * 0.4;
        const pz = pool ? pool.center[1] : R * 0.4;
        const yaw = Math.atan2(px, pz) + 0.35;
        return { yaw, pitch: -0.16, distance: Math.max(16, R * 1.25), target: [0, y0 + H * 0.9, 0] };
      }
      case 'level':
        return { yaw: facingYaw, pitch: 1.05, distance: 13.5, target: [a?.position[0] ?? 0, (a?.position[1] ?? H) + 0.4, (a?.position[2] ?? 0) + 0.6] };
      case 'weit':
        return { yaw: 0.45, pitch: 0.3, distance: Math.max(46, R * 4.2), target: [0, y0 + H * 0.4, -R * 0.4] };
      case 'oben':
        return { yaw: 0, pitch: 1.34, distance: R * 3.4, target: [0, y0, 0] };
      default:
        return { yaw: 0.2, pitch: 0.62, distance: Math.max(34, R * 2.75), target: [0, y0 + H * 0.45, 0] };
    }
  }

  private applyDpr(): void {
    if (!this.ctx) return;
    const { renderer, width, height, dpr } = this.ctx;
    const target = Math.min(dpr, this.preset.dprCap);
    if (Math.abs(renderer.getPixelRatio() - target) > 1e-3) {
      renderer.setPixelRatio(target);
      renderer.setSize(width, height, false);
    }
  }

  resize(ctx: SceneContext): void {
    this.applyDpr();
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
  }

  // --- frame ----------------------------------------------------------------------------------------------------------

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    this.orbit.step(dt);
    this.orbit.apply(this.camera);
    if (this.params.sunFollowsCamera && this.orbit.yaw !== this.lastYaw) {
      this.sunPivot.rotation.y = this.orbit.yaw;
      this.lastYaw = this.orbit.yaw;
      this.shadowDirty = true;
    }
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.sun.directionWorld(this.sunDirWorld.value);
    this.set?.update(this.camera);
    this.set?.setSunDirection(this.sunDirWorld.value);
    const board = this.board;
    if (board) {
      board.root.updateWorldMatrix(true, false);
      _v.copy(this.sunDirWorld.value).applyQuaternion(board.root.getWorldQuaternion(_q).invert());
      board.setSunDirection(_v);
      board.update(dt, this.camera);
      if (board.animating || board.moved) this.shadowDirty = true;
    }
    if (this.shadowDirty) {
      this.fitShadow();
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
    ctx.renderer.render(this.scene, this.camera);
  }

  /** Clip box: the landmarks plus the ground their long shadows fall on. */
  private fitShadow(): void {
    _box.makeEmpty();
    for (const inst of this.instances) {
      const r = inst.blueprint.radius;
      _box.expandByPoint(_v.set(inst.placement.x - r, inst.placement.y - 2, inst.placement.z - r));
      _box.expandByPoint(_v.set(inst.placement.x + r, inst.placement.y + inst.blueprint.height + 1, inst.placement.z + r));
    }
    if (_box.isEmpty()) _box.set(new Vector3(-20, -2, -20), new Vector3(20, 10, 20));
    const h = this.set?.maxHeight ?? 10;
    const el = Math.max(0.05, (this.params.sunElevation * Math.PI) / 180);
    const len = Math.min(260, (h + 1) / Math.tan(el));
    this.sun.directionWorld(_v);
    _v.y = 0;
    if (_v.lengthSq() > 1e-6) {
      _v.normalize().multiplyScalar(-len);
      const lo = _box.min.clone();
      const hi = _box.max.clone();
      _box.expandByPoint(new Vector3(lo.x + _v.x, lo.y, lo.z + _v.z));
      _box.expandByPoint(new Vector3(hi.x + _v.x, lo.y, hi.z + _v.z));
    }
    this.world.updateMatrixWorld(true);
    this.sun.fitShadow(_box, this.world.matrixWorld, h + 2);
  }

  getStats(): LandmarkLabStats {
    const info = this.ctx?.renderer.info as { render?: { drawCalls?: number; triangles?: number } } | undefined;
    const a = this.instances[0]?.anchors[0];
    return {
      drawCalls: info?.render?.drawCalls ?? 0,
      triangles: this.set?.stats.triangles ?? 0,
      landmarks: this.instances.length,
      dots: this.set?.stats.dots ?? 0,
      meshes: this.set?.stats.meshes ?? 0,
      anchor: a ? { radius: a.radius, height: a.height } : null,
      ascent: this.instances[0]?.route.ascent.length ?? 0,
      descent: this.instances[0]?.route.descent.length ?? 0,
      preset: this.preset.name,
      shadowPasses: this.shadowPasses,
      backend: this.ctx?.backend ?? '…',
    };
  }

  /** For tests: instances of the current build. */
  getInstances(): readonly LandmarkInstance[] {
    return this.instances;
  }

  dispose(): void {
    this.orbit.detach();
    this.teardown();
    this.sun.dispose();
    if (this.ctx) {
      this.ctx.renderer.shadowMap.enabled = false;
      this.ctx.renderer.setPixelRatio(this.ctx.dpr);
    }
    this.listeners.clear();
    this.scene.clear();
    this.ctx = null;
  }
}
