import { Box3, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, Object3D, PerspectiveCamera, Scene, Vector3 } from 'three/webgpu';
import { mix, modelViewMatrix, normalView, positionLocal, uniform, vec4 } from 'three/tsl';
import { EarleMaterial, PaletteAtlas, PaletteLookup, SunRig, createFogSettings, createSkyDome } from '@ee/render';
import { createHeroPathMarkers, createHeroTree, type BarkStyle, type CanopyFamily, type HeroPathMarkers, type HeroTree, type TreeQuality } from '@ee/render/earle/tree/index.ts';
import { createCanopy, type Canopy } from '@ee/render/earle/tree/canopy.ts';
import { createGrandTrees, layoutGrandTrees, type GrandTrees } from '@ee/render/earle/tree/grand.ts';
import type { Dome } from '@ee/render/earle/tree/shape.ts';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { resolveQuality, type QualityLevel, type QualityPreset, type ResolvedQuality } from '../earle/quality';
import { OrbitRig, type OrbitView } from './orbit';

export type TreeView = 'default' | 'trunk' | 'canopy' | 'blossoms' | 'path' | 'far';
/** Lab stage: green hills like world 01 (Ebene 21) or a snow field under a blue sky (image 04/01). */
export type TreeStage = 'huegel' | 'schnee';

export interface TreeLabParams {
  trunk: boolean;
  branches: boolean;
  stars: boolean;
  canopy: boolean;
  blossoms: boolean;
  path: boolean;
  family: CanopyFamily;
  bark: BarkStyle;
  /** Snow patches and drift 0..1. */
  snow: number;
  stage: TreeStage;
  /** Blossom time 0 (buds) .. 1 (full bloom). */
  bloom: number;
  /** Growth 0..1. */
  growth: number;
  sunElevation: number;
  sunAzimuth: number;
  /** The sun hangs on the camera yaw (shadows run horizontally across the screen like on the map). */
  sunFollowsCamera: boolean;
  quality: QualityLevel;
  /** Current node (ring) 0..nodes-1. */
  progress: number;
  /** Camera ride running. */
  ride: boolean;
  /** Position on the rail 0..1. */
  rideT: number;
  seed: number;
  /** Big siblings around the giant tree (0..6, `?grand=`), see `createGrandTrees`. */
  grand: number;
}

export const DEFAULT_TREE_PARAMS: TreeLabParams = {
  trunk: true,
  branches: true,
  stars: true,
  canopy: true,
  blossoms: true,
  path: true,
  family: 'jewel',
  bark: 'ink',
  snow: 1,
  stage: 'schnee',
  bloom: 1,
  growth: 1,
  sunElevation: 10,
  sunAzimuth: 70,
  sunFollowsCamera: true,
  quality: 'auto',
  progress: 14,
  ride: false,
  rideT: 0,
  seed: 7,
  grand: 4,
};

export interface TreeLabStats {
  drawCalls: number;
  clusters: number;
  domes: number;
  dots: number;
  blossoms: number;
  stars: number;
  twigs: number;
  segments: number;
  nodes: number;
  bushes: number;
  preset: ResolvedQuality;
  shadowPasses: number;
  rideT: number;
  detail: number;
  woodVertices: number;
}

const VIEWS: Record<TreeView, OrbitView> = {
  default: { yaw: -0.55, pitch: 0.2, distance: 78, target: [0, 16, 0] },
  // from the ground looking up: bark lines, snow patches, the drift and the fork against the sky (image 01)
  trunk: { yaw: 0.95, pitch: -0.06, distance: 17, target: [0.5, 8.5, 0] },
  canopy: { yaw: -0.45, pitch: 0.45, distance: 56, target: [0, 24, 0] },
  blossoms: { yaw: 0.25, pitch: 0.42, distance: 24, target: [4, 27, 1.5] },
  path: { yaw: -0.55, pitch: 0.2, distance: 78, target: [0, 16, 0] },
  // target and distance are computed from the shadow in setView('far') (tree + the whole long shadow in view)
  far: { yaw: -0.75, pitch: 0.24, distance: 150, target: [0, 16, 0] },
};

interface StagePalette {
  ground: string[];
  ink: string;
  sky: string[];
  fog: string[];
  fogAlpha: number[];
  background: string;
}

const STAGES: Record<TreeStage, StagePalette> = {
  // Ebene 21: yellow-green hills, deep green ink; sky cream → turquoise → lapis
  huegel: {
    ground: ['#2d6b2a', '#4f9d31', '#8cc63c', '#c9dd4a', '#eaf07a'],
    ink: '#0d1a10',
    sky: ['#f3f1dc', '#c8ecd9', '#8fd8d6', '#5fb9d8', '#3b86c9', '#2a5cb0'],
    fog: ['#8fd8d6', '#3f7f8f', '#5fb0b8', '#8fd0d0', '#b8e6dc', '#dff3ea'],
    fogAlpha: [0, 0.3, 0.5, 0.68, 0.82, 0.92],
    background: '#8fd8d6',
  },
  // image 04: cream snow in the light, blue in the shade, a teal-blue sky
  schnee: {
    ground: ['#3a67a4', '#6995cb', '#c9d9e6', '#efe6cb', '#fbf7ea'],
    ink: '#1c3764',
    sky: ['#cfe7ea', '#8fc9d8', '#4fa6c8', '#2f86b8', '#1f6aa4', '#17558c'],
    fog: ['#4fa6c8', '#2c6f98', '#4f94bc', '#7ab5d0', '#a9d2e0', '#d6ecf0'],
    fogAlpha: [0, 0.3, 0.5, 0.68, 0.82, 0.92],
    background: '#4fa6c8',
  },
};
const RIDE_SECONDS = 48;

const _v = new Vector3();
const _look = new Vector3();
const _box = new Box3();
const _sunLocal = new Vector3();

/**
 * Giant tree lab: the tree on hills or a snow field, a low sun (10°) on the camera yaw like the map, hard sharpened
 * shadows (shadow pass only on motion), orbit camera, camera ride on the path rail with the level path lying on
 * the tree (shelf fungi on the bark, stones on the domes).
 */
export class TreeLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(42, 1, 0.4, 1100);
  private readonly sunPivot = new Object3D();
  private readonly world = new Group();
  private readonly orbit = new OrbitRig();
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly groundBands = uniform(4);
  private readonly bushBands = uniform(3);
  private sun: SunRig;
  private atlas: PaletteAtlas | null = null;
  private tree: HeroTree | null = null;
  private bushes: Canopy | null = null;
  private grand: GrandTrees | null = null;
  private markers: HeroPathMarkers | null = null;
  private ctx: SceneContext | null = null;
  private params: TreeLabParams;
  private preset: QualityPreset;
  private readonly disposables: Array<() => void> = [];
  private readonly listeners = new Set<(p: TreeLabParams) => void>();
  private shadowDirty = true;
  private lastYaw = NaN;
  private elapsed = 0;
  private pendingView: TreeView | null = null;
  /** The camera follows the path rail (ride or slider) until the user orbits. */
  private railMode = false;
  shadowPasses = 0;

  constructor(initial: Partial<TreeLabParams> = {}) {
    this.params = { ...DEFAULT_TREE_PARAMS, ...initial };
    this.preset = resolveQuality(this.params.quality);
    this.sun = new SunRig({ mapSize: this.preset.shadowMapSize, sharpen: true, elevationDeg: this.params.sunElevation, azimuthDeg: this.params.sunAzimuth, distance: 150 });
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.name = 'TreeLab';
    this.scene.add(this.world, this.sunPivot);
    this.sunPivot.add(this.sun.root);
    this.sun.root.position.set(0, 10, 0);
    // Shadows v2: camera cascades for smooth, exact shadow edges (once before the first render)
    this.sun.fitToView(this.camera, { plane: { minHeight: -1, maxHeight: 3 }, maxDistance: 240 });
    this.orbit.attach(ctx.canvas);
    this.build();
    this.applyParams(this.params, true);
    const pv = this.pendingView ?? 'default';
    this.orbit.setView(pv === 'far' ? this.farView() : VIEWS[pv]);
    // ride or rail position from the URL (?view=path, ?t=0.6) → camera on the rail at once
    if (this.params.ride || this.params.rideT > 0) this.railMode = true;
    this.resize(ctx);
  }

  private build(): void {
    this.teardownWorld();
    const p = this.preset;
    const stage = STAGES[this.params.stage];
    this.scene.background = new Color(stage.background);
    const atlas = new PaletteAtlas();
    const lookup = new PaletteLookup(atlas.texture, atlas.width, atlas.height);
    const groundRow = atlas.addRow({ name: 'lab/ground', steps: [stage.ink, ...stage.ground] });
    const skyRow = atlas.addRow({ name: 'lab/sky', steps: [...stage.sky, '#f7f6d8', '#eef7e4'] });
    const fogRow = atlas.addRow({ name: 'lab/fog', steps: stage.fog, alphas: stage.fogAlpha });
    // fog only beyond the tree (the landmark stays crisp even in the far view; the hills behind step)
    const fog = createFogSettings({ row: fogRow, steps: 5, start: 130, range: 260 });
    this.atlas = atlas;
    const quality: TreeQuality = p.name;

    const tree = createHeroTree({
      fog,
      fogLookup: lookup,
      family: this.params.family,
      bark: this.params.bark,
      snow: this.params.snow,
      quality,
      seed: this.params.seed,
      nodes: 24,
      bloom: this.params.bloom,
      growth: this.params.growth,
    });
    this.tree = tree;
    this.world.add(tree.group);
    this.disposables.push(() => tree.dispose());

    // ground: radial grid, flat under the tree, gentle hills from r > 30 (chiselled, no ridges)
    const ground = createGroundGeometry(200, p.name === 'mobil' ? 90 : 150, p.name === 'mobil' ? 80 : 128);
    // Earle-Verlauf über die Hügel (Kamm hell, Senke tiefer) statt Schattierung jeder Delle: Verlaufsnormale zur
    // Hochachse gemischt, dazu die Höhe; die Tintenform folgt weiter dem Relief
    const groundMaterial = new EarleMaterial({
      lookup,
      row: groundRow,
      fog,
      bands: this.groundBands,
      bandScale: 1.6,
      terminator: 0.0,
      gradientNormalNode: mix(normalView, modelViewMatrix.mul(vec4(0, 1, 0, 0)).xyz.normalize(), 0.6),
      lift: positionLocal.y.mul(0.03),
    });
    const groundMesh = new Mesh(ground, groundMaterial);
    groundMesh.name = 'ground';
    groundMesh.receiveShadow = true;
    groundMesh.castShadow = false;
    groundMesh.frustumCulled = false;
    this.world.add(groundMesh);
    this.disposables.push(() => {
      ground.dispose();
      groundMaterial.dispose();
      groundMesh.removeFromParent();
    });

    // dotted dome bushes on the hills (Ebene 21/image 03 groves), sharing uniforms with the tree
    const bushDomes = layoutBushes(this.params.seed, p.name === 'mobil' ? 26 : 44);
    const bushes = createCanopy({
      domes: bushDomes,
      lookup: tree.lookup,
      fog,
      fogLookup: lookup,
      rows: { domes: tree.rows.domes, motif: tree.rows.motif },
      bands: this.bushBands,
      family: this.params.stage === 'schnee' ? 'blue' : 'purple',
      quality: p.name === 'mobil' ? { dotsPerDome: [50, 140], sphere: [20, 12], flowers: false } : { dotsPerDome: [110, 300], sphere: [28, 16], flowers: true },
      dotScale: 1.8,
      bb: tree.billboard,
      seed: this.params.seed + 11,
    });
    this.bushes = bushes;
    this.world.add(bushes.domes, bushes.dots);
    this.disposables.push(() => {
      bushes.dispose();
      bushes.domes.removeFromParent();
      bushes.dots.removeFromParent();
    });

    // big siblings around the giant tree (same style, smaller, each distinct): one set of meshes for all
    if (this.params.grand > 0) {
      const plan = tree.shape.plan;
      const grand = createGrandTrees({
        // free: the path start (root tip) and the sector towards the lab's default views (nobody stands in front of the giant)
        sites: layoutGrandTrees({
          count: this.params.grand,
          seed: this.params.seed,
          heroCrown: tree.shape.R,
          avoid: [
            { angle: plan.startAngle, width: 0.7 },
            { angle: 2.25, width: 0.85 },
          ],
        }),
        seed: this.params.seed,
        quality,
        groundAt: groundHeight,
        bark: this.params.bark,
        snow: this.params.snow,
        lookup: tree.lookup,
        rows: tree.rows,
        fog,
        fogLookup: lookup,
        billboard: tree.billboard,
      });
      this.grand = grand;
      this.world.add(grand.group);
      this.disposables.push(() => grand.dispose());
    }

    // level path lying on the tree
    this.sun.directionLocal(_sunLocal);
    const markers = createHeroPathMarkers({ path: tree.path, sunDirLocal: _sunLocal });
    this.markers = markers;
    tree.group.add(markers.group);
    this.disposables.push(() => markers.dispose());

    const sky = createSkyDome({ lookup, skyRow, steps: stage.sky.length, sunIndex: stage.sky.length, ringIndex: stage.sky.length + 1, sunDirWorld: this.sunDirWorld, spread: 0.45, radius: 1000 });
    this.camera.add(sky);
    this.scene.add(this.camera);
    this.disposables.push(() => {
      sky.geometry.dispose();
      (sky.material as { dispose(): void }).dispose();
      sky.removeFromParent();
    });
    this.shadowDirty = true;
  }

  private teardownWorld(): void {
    for (const d of this.disposables) d();
    this.disposables.length = 0;
    this.tree = null;
    this.bushes = null;
    this.grand = null;
    this.markers = null;
    this.atlas?.dispose();
    this.atlas = null;
  }

  // --- parameters ----------------------------------------------------------------------------------------------

  setParams(patch: Partial<TreeLabParams>): void {
    this.applyParams({ ...this.params, ...patch }, false);
  }

  getParams(): TreeLabParams {
    return { ...this.params };
  }

  getResolvedQuality(): ResolvedQuality {
    return this.preset.name;
  }

  /** The tree (tests, benches). */
  getTree(): HeroTree | null {
    return this.tree;
  }

  subscribe(listener: (p: TreeLabParams) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Camera to a preview view (also before mount, e.g. from the URL). */
  setView(view: TreeView): void {
    if (!this.ctx) {
      this.pendingView = view;
      return;
    }
    if (view === 'path') {
      this.setParams({ ride: true, rideT: this.params.rideT > 0 ? this.params.rideT : 0.05 });
      return;
    }
    this.setParams({ ride: false });
    this.railMode = false;
    this.orbit.setView(view === 'far' ? this.farView() : VIEWS[view]);
  }

  private applyParams(next: TreeLabParams, force: boolean): void {
    const prev = this.params;
    const keys = Object.keys(next) as Array<keyof TreeLabParams>;
    const changed = force || keys.some((k) => next[k] !== prev[k]);
    this.params = next;
    if (!changed) return;
    if (this.ctx) {
      const preset = resolveQuality(next.quality);
      const presetChanged = force || preset.name !== this.preset.name;
      this.preset = preset;
      if (presetChanged || next.seed !== prev.seed || next.bark !== prev.bark || next.stage !== prev.stage || (next.snow > 0) !== (prev.snow > 0) || next.grand !== prev.grand) {
        this.applyDpr();
        this.sun.setMapSize(preset.shadowMapSize);
        this.build();
        force = true;
      }
      const tree = this.tree;
      if (tree) {
        tree.setVisible('trunk', next.trunk);
        tree.setVisible('branches', next.branches);
        tree.setVisible('stars', next.stars);
        tree.setVisible('canopy', next.canopy);
        tree.setVisible('blossoms', next.blossoms);
        if (this.markers) this.markers.group.visible = next.path;
        if (force || next.family !== prev.family) tree.setFamily(next.family);
        if (force || next.snow !== prev.snow) tree.setSnow(next.snow);
        if (force || next.bloom !== prev.bloom) tree.setBloom(next.bloom);
        if (force || next.growth !== prev.growth) {
          tree.setGrowth(next.growth);
          this.shadowDirty = true;
        }
        if (force || next.progress !== prev.progress) {
          const i = Math.max(0, Math.min(tree.path.nodes.length - 1, Math.round(next.progress)));
          this.markers?.setProgress(i, i);
        }
        if (force || next.trunk !== prev.trunk || next.branches !== prev.branches || next.canopy !== prev.canopy) this.shadowDirty = true;
      }
      if (force || next.sunElevation !== prev.sunElevation || next.sunAzimuth !== prev.sunAzimuth) {
        this.sun.setAngles(next.sunElevation, next.sunAzimuth);
        this.shadowDirty = true;
      }
      if ((next.ride && !prev.ride) || next.rideT !== prev.rideT) this.railMode = true;
      if (force || next.sunFollowsCamera !== prev.sunFollowsCamera) {
        if (!next.sunFollowsCamera) this.sunPivot.rotation.y = 0;
        this.lastYaw = NaN;
        this.shadowDirty = true;
      }
    }
    for (const l of this.listeners) l(this.getParams());
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

  /**
   * Far view with the whole shadow (Ebene 9: the long hard shadow belongs to the picture): the sun hangs on the
   * camera yaw, so the shadow direction is fixed for this yaw; the target sits between tree and shadow.
   */
  private farView(): OrbitView {
    const v = VIEWS.far;
    const d = this.sun.directionLocal(new Vector3());
    const c = Math.cos(v.yaw);
    const sn = Math.sin(v.yaw);
    const sx = -(d.x * c + d.z * sn);
    const sz = -(-d.x * sn + d.z * c);
    const sl = Math.hypot(sx, sz) || 1;
    const top = this.tree ? this.tree.shape.crownTop : 33;
    const R = this.tree ? this.tree.shape.R : 13;
    const el = Math.max(0.05, (this.params.sunElevation * Math.PI) / 180);
    const shadowLen = (top * 0.8) / Math.tan(el);
    const mid = shadowLen * 0.28;
    const distance = Math.min(320, (shadowLen * 0.4 + R * 1.6) / 0.6);
    return { yaw: v.yaw, pitch: v.pitch, distance, target: [(sx / sl) * mid, 8, (sz / sl) * mid] };
  }

  resize(ctx: SceneContext): void {
    this.applyDpr();
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
  }

  // --- frame -------------------------------------------------------------------------------------------------

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    const tree = this.tree;
    if (!tree) return;
    this.elapsed += dt;
    const p = this.params;

    // camera: rail (ride running or scrubbed) or orbit; user input ends the ride
    this.orbit.step(dt);
    const userInput = this.orbit.isDragging || performance.now() - this.orbit.lastInput < 50;
    if (userInput) {
      this.railMode = false;
      if (p.ride) this.setParams({ ride: false });
    } else if (p.ride) {
      const t = Math.min(1, p.rideT + dt / RIDE_SECONDS);
      if (t !== p.rideT) {
        this.params = { ...this.params, rideT: t, ride: t < 1 };
        // the ring follows the ride: the node the camera looks at is the current one
        const nodes = tree.path.nodes;
        let cur = 0;
        for (let i = 0; i < nodes.length; i++) if (nodes[i]!.t <= t + 1e-4) cur = i;
        if (cur !== Math.round(this.params.progress)) {
          this.params = { ...this.params, progress: cur };
          this.markers?.setProgress(cur, cur);
        }
        for (const l of this.listeners) l(this.getParams());
      }
    }
    if (this.railMode) {
      tree.group.updateMatrixWorld(true);
      tree.path.sampleRail(this.params.rideT, _v, _look);
      _v.applyMatrix4(tree.group.matrixWorld);
      _look.applyMatrix4(tree.group.matrixWorld);
      this.camera.position.copy(_v);
      this.camera.lookAt(_look);
      // the orbit takes over the ride pose so a grab continues seamlessly
      this.orbit.target.copy(_look);
      const d = _v.clone().sub(_look);
      this.orbit.distance = d.length();
      this.orbit.pitch = Math.asin(Math.min(1, Math.max(-1, d.y / Math.max(1e-3, d.length()))));
      this.orbit.yaw = Math.atan2(d.x, d.z);
    } else this.orbit.apply(this.camera);

    // sun follows the camera yaw (shadows as horizontal bands, like the flow)
    if (p.sunFollowsCamera) {
      const yaw = this.orbit.yaw;
      if (yaw !== this.lastYaw) {
        this.sunPivot.rotation.y = yaw;
        this.lastYaw = yaw;
        this.shadowDirty = true;
      }
    }
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.sun.directionWorld(this.sunDirWorld.value);
    tree.setSunDirection(this.sunDirWorld.value);
    tree.updateCamera(this.camera);
    tree.update(dt);
    this.grand?.updateCamera(this.camera);
    if (this.markers) {
      // the tree group is not rotated in the lab: world sun direction = tree-local direction
      if (this.shadowDirty) this.markers.setSunDirection(this.sunDirWorld.value);
      this.markers.update(this.elapsed);
    }

    if (this.shadowDirty) {
      this.fitShadow(tree);
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
    ctx.renderer.render(this.scene, this.camera);
  }

  /** Shadow camera: tree bounds plus the ground strip the long shadow falls on (direction −sun). */
  private fitShadow(tree: HeroTree): void {
    _box.copy(tree.bounds);
    if (this.grand) _box.union(this.grand.bounds);
    const scale = tree.group.scale.x || 1;
    const el = Math.max(0.03, (this.params.sunElevation * Math.PI) / 180);
    const len = Math.min(220, (_box.max.y * scale) / Math.tan(el)) / scale;
    this.sun.directionWorld(_v);
    _v.y = 0;
    if (_v.lengthSq() > 1e-6) {
      _v.normalize().multiplyScalar(-len);
      _box.expandByPoint(new Vector3(_box.min.x + _v.x, -0.2, _box.min.z + _v.z));
      _box.expandByPoint(new Vector3(_box.max.x + _v.x, -0.2, _box.max.z + _v.z));
    }
    this.sun.fitShadow(_box, tree.group.matrixWorld, _box.max.y * scale);
  }

  getStats(): TreeLabStats {
    const info = this.ctx?.renderer.info as { render?: { drawCalls?: number } } | undefined;
    const t = this.tree;
    const p = this.params;
    return {
      drawCalls: info?.render?.drawCalls ?? 0,
      clusters: t && p.canopy ? t.stats.clusters : 0,
      domes: t && p.canopy ? t.stats.domes : 0,
      dots: t && p.canopy ? t.stats.dots : 0,
      blossoms: t && p.blossoms ? t.stats.blossoms : 0,
      stars: t && p.stars ? t.stats.stars : 0,
      twigs: t && p.branches ? t.stats.twigs : 0,
      segments: t && p.trunk ? t.stats.segments : 0,
      nodes: t?.stats.nodes ?? 0,
      bushes: this.bushes?.counts.domes ?? 0,
      preset: this.preset.name,
      shadowPasses: this.shadowPasses,
      rideT: p.rideT,
      detail: t?.getDetail() ?? 0,
      woodVertices: t?.stats.woodVertices ?? 0,
    };
  }

  dispose(): void {
    this.orbit.detach();
    this.teardownWorld();
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

/** Radial ground grid (denser in the middle): flat up to r ≈ 30, then gentle hill waves. */
function createGroundGeometry(radius: number, rings: number, segments: number): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const q = i / rings;
    const r = radius * Math.pow(q, 1.5);
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      pos.push(x, i === 0 ? 0 : groundHeight(x, z), z);
    }
  }
  const rv = segments + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * rv + j;
      const b = a + rv;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.getAttribute('normal');
  if (n.getY(0) < 0) {
    const index = g.getIndex()!;
    for (let k = 0; k < index.count; k += 3) {
      const t = index.getX(k + 1);
      index.setX(k + 1, index.getX(k + 2));
      index.setX(k + 2, t);
    }
    g.computeVertexNormals();
  }
  return g;
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const w = smooth01((r - 30) / 45);
  const h = 2.4 * Math.sin(x * 0.045 + 1.2) * Math.cos(z * 0.05 - 0.4) + 1.6 * Math.sin((x + z) * 0.07 + 2) + 3.2 * Math.sin(r * 0.028 - 1.1);
  return w * (h + 2.6 * smooth01((r - 70) / 90));
}

/** Dotted dome bushes on the hills around the tree (outside the lace and the path start). */
function layoutBushes(seed: number, count: number): Dome[] {
  let a = (seed * 9301 + 49297) % 233280;
  const rand = () => (a = (a * 9301 + 49297) % 233280) / 233280;
  const domes: Dome[] = [];
  for (let i = 0; i < count; i++) {
    const ang = rand() * Math.PI * 2;
    const r = 30 + Math.sqrt(rand()) * 100;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const size = 1.4 + rand() * 2;
    const center = new Vector3(x, groundHeight(x, z) + size * 0.25, z);
    const tone = rand();
    domes.push({ center, r: size, sy: 0.6 + rand() * 0.1, rank: 0, hash: rand(), cluster: i, tone, path: false });
    if (rand() < 0.5) domes.push({ center: center.clone().add(new Vector3(size * 0.7, -size * 0.2, size * 0.3)), r: size * 0.6, sy: 0.62, rank: 0, hash: rand(), cluster: i, tone, path: false });
  }
  return domes;
}
