import { Box3, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, Object3D, PerspectiveCamera, Scene, Vector3 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { EarleMaterial, PaletteAtlas, PaletteLookup, SunRig, createFogSettings, createSkyDome } from '@ee/render';
import { createHeroTree, type CanopyFamily, type HeroTree, type TreeQuality } from '@ee/render/earle/tree/index.ts';
import { createCanopy, type Canopy, type Dome } from '@ee/render/earle/tree/canopy.ts';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { NodePath } from '../../flow/NodePath';
import { resolveQuality, type QualityLevel, type QualityPreset, type ResolvedQuality } from '../earle/quality';
import { OrbitRig, type OrbitView } from './orbit';

export type TreeView = 'default' | 'trunk' | 'canopy' | 'blossoms' | 'path' | 'far';

export interface TreeLabParams {
  trunk: boolean;
  branches: boolean;
  stars: boolean;
  canopy: boolean;
  blossoms: boolean;
  path: boolean;
  family: CanopyFamily;
  /** Blütezeit 0 (Knospen) .. 1 (volle Blüte). */
  bloom: number;
  /** Wachstum 0..1. */
  growth: number;
  sunElevation: number;
  sunAzimuth: number;
  /** Sonne hängt am Kamera-Yaw (Schatten laufen wie auf der Karte waagrecht über den Bildschirm). */
  sunFollowsCamera: boolean;
  quality: QualityLevel;
  /** Aktueller Knoten (Ring) 0..nodes-1. */
  progress: number;
  /** Kamerafahrt läuft. */
  ride: boolean;
  /** Position auf der Schiene 0..1. */
  rideT: number;
  seed: number;
}

export const DEFAULT_TREE_PARAMS: TreeLabParams = {
  trunk: true,
  branches: true,
  stars: true,
  canopy: true,
  blossoms: true,
  path: true,
  family: 'purple',
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
};

export interface TreeLabStats {
  drawCalls: number;
  clusters: number;
  domes: number;
  dots: number;
  glyphs: number;
  meadow: number;
  blossoms: number;
  stars: number;
  segments: number;
  nodes: number;
  bushes: number;
  preset: ResolvedQuality;
  shadowPasses: number;
  rideT: number;
}

const VIEWS: Record<TreeView, OrbitView> = {
  default: { yaw: -0.6, pitch: 0.28, distance: 62, target: [0, 13, 0] },
  // vom Boden aus schräg nach oben: Bänder, Flechten, Wurzelanlauf und die Astgabel gegen den Himmel (Ebene 21/35)
  trunk: { yaw: 0.95, pitch: -0.15, distance: 28, target: [0.5, 8.5, 0] },
  canopy: { yaw: -0.45, pitch: 0.5, distance: 46, target: [0, 19, 0] },
  blossoms: { yaw: 0.25, pitch: 0.45, distance: 20, target: [4, 21.5, 1.5] },
  path: { yaw: -0.6, pitch: 0.28, distance: 62, target: [0, 13, 0] },
  // Ziel und Abstand werden in setView('far') aus dem Schattenwurf berechnet (Baum + ganzer langer Schatten im Bild)
  far: { yaw: -0.75, pitch: 0.26, distance: 130, target: [0, 13, 0] },
};

/** Ebene 21: gelbgrüne Hügel, tiefgrüne Tinte; Himmel Creme → Türkis → Lapis. */
const GROUND_STEPS = ['#2d6b2a', '#4f9d31', '#8cc63c', '#c9dd4a', '#eaf07a'];
const GROUND_INK = '#0d1a10';
const SKY_STEPS = ['#f3f1dc', '#c8ecd9', '#8fd8d6', '#5fb9d8', '#3b86c9', '#2a5cb0'];
const FOG_STEPS = ['#8fd8d6', '#3f7f8f', '#5fb0b8', '#8fd0d0', '#b8e6dc', '#dff3ea'];
const FOG_ALPHA = [0, 0.3, 0.5, 0.68, 0.82, 0.92];
const RIDE_SECONDS = 40;

const _v = new Vector3();
const _look = new Vector3();
const _box = new Box3();
const _sunLocal = new Vector3();

/**
 * P2d Baum-Lab: der Riesenbaum auf gelbgrünen Hügeln, Sonne flach (10°) am Kamera-Yaw wie auf der Karte, harte
 * nachgeschärfte Schatten (Schattenpass nur bei Bewegung), Orbit-Kamera, Kamerafahrt auf der Pfadschiene.
 */
export class TreeLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(42, 1, 0.4, 900);
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
  private nodePath: NodePath | null = null;
  private ctx: SceneContext | null = null;
  private params: TreeLabParams;
  private preset: QualityPreset;
  private readonly disposables: Array<() => void> = [];
  private readonly listeners = new Set<(p: TreeLabParams) => void>();
  private shadowDirty = true;
  private lastYaw = NaN;
  private elapsed = 0;
  private pendingView: TreeView | null = null;
  /** Kamera folgt der Pfadschiene (Fahrt oder Regler), bis der Nutzer orbitet. */
  private railMode = false;
  shadowPasses = 0;

  constructor(initial: Partial<TreeLabParams> = {}) {
    this.params = { ...DEFAULT_TREE_PARAMS, ...initial };
    this.preset = resolveQuality(this.params.quality);
    this.sun = new SunRig({ mapSize: this.preset.shadowMapSize, sharpen: true, elevationDeg: this.params.sunElevation, azimuthDeg: this.params.sunAzimuth, distance: 120 });
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.name = 'TreeLab';
    this.scene.background = new Color(SKY_STEPS[2]!);
    this.scene.add(this.world, this.sunPivot);
    this.sunPivot.add(this.sun.root);
    this.sun.root.position.set(0, 10, 0);
    // Shadows v2: Kamera-Kaskaden für glatte, exakte Schattenkanten (einmal vor dem ersten Rendern)
    this.sun.fitToView(this.camera, { plane: { minHeight: -1, maxHeight: 3 }, maxDistance: 200 });
    this.orbit.attach(ctx.canvas);
    this.build();
    this.applyParams(this.params, true);
    const pv = this.pendingView ?? 'default';
    this.orbit.setView(pv === 'far' ? this.farView() : VIEWS[pv]);
    // Fahrt oder Schienenposition aus der URL (?view=path, ?t=0.6) → Kamera sofort auf der Schiene
    if (this.params.ride || this.params.rideT > 0) this.railMode = true;
    this.resize(ctx);
  }

  private build(): void {
    this.teardownWorld();
    const p = this.preset;
    const atlas = new PaletteAtlas();
    const lookup = new PaletteLookup(atlas.texture, atlas.width, atlas.height);
    const groundRow = atlas.addRow({ name: 'lab/ground', steps: [GROUND_INK, ...GROUND_STEPS] });
    const skyRow = atlas.addRow({ name: 'lab/sky', steps: [...SKY_STEPS, '#f7f6d8', '#eef7e4'] });
    const fogRow = atlas.addRow({ name: 'lab/fog', steps: FOG_STEPS, alphas: FOG_ALPHA });
    // Nebel erst jenseits des Baums (auch in der Fernansicht bleibt das Wahrzeichen scharf; die Hügel dahinter stufen)
    const fog = createFogSettings({ row: fogRow, steps: 5, start: 100, range: 240 });
    this.atlas = atlas;
    const quality: TreeQuality = p.name;

    const tree = createHeroTree({ atlas, lookup, fog, family: this.params.family, quality, seed: this.params.seed, nodes: 24, bloom: this.params.bloom, growth: this.params.growth });
    this.tree = tree;
    this.world.add(tree.group);
    this.disposables.push(() => tree.dispose());

    // Boden: radiales Gitter, flach unter dem Baum, sanfte Hügel ab r > 24 (gemeißelt, keine Grate)
    const ground = createGroundGeometry(170, p.name === 'mobil' ? 90 : 150, p.name === 'mobil' ? 80 : 128);
    const groundMaterial = new EarleMaterial({ lookup, row: groundRow, fog, bands: this.groundBands, bandScale: 1.6, terminator: 0.0 });
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

    // Violette Punktkuppel-Büsche auf den Hügeln (Ebene 21), teilen Uniforms und Atlas mit dem Baum
    const bushDomes = layoutBushes(this.params.seed, p.name === 'mobil' ? 26 : 44);
    const bushes = createCanopy({
      domes: bushDomes,
      lookup,
      fog,
      rows: { canopy: tree.rows.canopy, motif: tree.rows.motif },
      bands: this.bushBands,
      family: 'purple',
      quality: p.name === 'mobil' ? { dotsPerDome: [60, 160], glyphsPerDome: [0, 1] } : { dotsPerDome: [140, 380], glyphsPerDome: [0, 2] },
      dotScale: 2,
      bb: tree.billboard,
      seed: this.params.seed + 11,
    });
    this.bushes = bushes;
    this.world.add(bushes.domes, bushes.dots, bushes.glyphs);
    this.disposables.push(() => {
      bushes.dispose();
      bushes.domes.removeFromParent();
      bushes.dots.removeFromParent();
      bushes.glyphs.removeFromParent();
    });

    // Levelpfad: Pucks, Punktlinie und der Ring des aktuellen Knotens (Look aus dem Flow)
    this.sun.directionLocal(_sunLocal);
    const nodePath = new NodePath({ nodes: tree.path.nodes, dots: tree.path.dots, length: tree.path.length }, _sunLocal);
    this.nodePath = nodePath;
    tree.group.add(nodePath.group);
    this.disposables.push(() => nodePath.dispose());

    const sky = createSkyDome({ lookup, skyRow, steps: SKY_STEPS.length, sunIndex: SKY_STEPS.length, ringIndex: SKY_STEPS.length + 1, sunDirWorld: this.sunDirWorld, spread: 0.45, radius: 800 });
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
    this.nodePath = null;
    this.atlas?.dispose();
    this.atlas = null;
  }

  // --- Parameter ---------------------------------------------------------------------------------------

  setParams(patch: Partial<TreeLabParams>): void {
    this.applyParams({ ...this.params, ...patch }, false);
  }

  getParams(): TreeLabParams {
    return { ...this.params };
  }

  getResolvedQuality(): ResolvedQuality {
    return this.preset.name;
  }

  subscribe(listener: (p: TreeLabParams) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Kamera auf eine Vorschau-Ansicht setzen (auch vor dem Mount, z. B. aus der URL). */
  setView(view: TreeView): void {
    if (!this.ctx) {
      this.pendingView = view;
      return;
    }
    if (view === 'path') {
      this.setParams({ ride: true, rideT: this.params.rideT > 0 ? this.params.rideT : 0.62 });
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
      if (presetChanged || next.seed !== prev.seed) {
        this.applyDpr();
        this.sun.setMapSize(preset.shadowMapSize);
        this.build();
      }
      const tree = this.tree;
      if (tree) {
        tree.setVisible('trunk', next.trunk);
        tree.setVisible('branches', next.branches);
        tree.setVisible('stars', next.stars);
        tree.setVisible('canopy', next.canopy);
        tree.setVisible('blossoms', next.blossoms);
        if (this.nodePath) this.nodePath.group.visible = next.path;
        if (force || next.family !== prev.family) tree.setFamily(next.family);
        if (force || next.bloom !== prev.bloom) tree.setBloom(next.bloom);
        if (force || next.growth !== prev.growth) {
          tree.setGrowth(next.growth);
          this.shadowDirty = true;
        }
        if (force || next.progress !== prev.progress) {
          const i = Math.max(0, Math.min(tree.path.nodes.length - 1, Math.round(next.progress)));
          this.nodePath?.setProgress(i, i);
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
   * Fernansicht mit dem ganzen Schatten (Ebene 9: der lange harte Schatten gehört zum Bild): Die Sonne hängt am
   * Kamera-Yaw, also liegt die Schattenrichtung für diesen Yaw fest; das Ziel sitzt zwischen Baum und Schatten, der
   * Abstand reicht, dass Baum und Schattenspitze ins Bild passen.
   */
  private farView(): OrbitView {
    const v = VIEWS.far;
    const d = this.sun.directionLocal(new Vector3());
    const c = Math.cos(v.yaw);
    const sn = Math.sin(v.yaw);
    const sx = -(d.x * c + d.z * sn);
    const sz = -(-d.x * sn + d.z * c);
    const sl = Math.hypot(sx, sz) || 1;
    const top = this.tree ? this.tree.shape.crownTop : 25;
    const R = this.tree ? this.tree.shape.R : 12;
    const el = Math.max(0.05, (this.params.sunElevation * Math.PI) / 180);
    const shadowLen = (top * 0.8) / Math.tan(el);
    const mid = shadowLen * 0.3;
    const distance = Math.min(260, (shadowLen * 0.42 + R * 1.5) / 0.6);
    return { yaw: v.yaw, pitch: v.pitch, distance, target: [(sx / sl) * mid, 5, (sz / sl) * mid] };
  }

  resize(ctx: SceneContext): void {
    this.applyDpr();
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
  }

  // --- Frame -------------------------------------------------------------------------------------------

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    const tree = this.tree;
    if (!tree) return;
    this.elapsed += dt;
    const p = this.params;

    // Kamera: Schiene (Fahrt läuft oder per Regler gescrubbt) oder Orbit; eine Nutzereingabe beendet die Fahrt
    this.orbit.step(dt);
    const userInput = this.orbit.isDragging || performance.now() - this.orbit.lastInput < 50;
    if (userInput) {
      this.railMode = false;
      if (p.ride) this.setParams({ ride: false });
    } else if (p.ride) {
      const t = Math.min(1, p.rideT + dt / RIDE_SECONDS);
      if (t !== p.rideT) {
        this.params = { ...this.params, rideT: t, ride: t < 1 };
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
      // Orbit übernimmt die Fahrtposition, damit ein Griff nahtlos weitergeht
      this.orbit.target.copy(_look);
      const d = _v.clone().sub(_look);
      this.orbit.distance = d.length();
      this.orbit.pitch = Math.asin(Math.min(1, Math.max(-1, d.y / Math.max(1e-3, d.length()))));
      this.orbit.yaw = Math.atan2(d.x, d.z);
    } else this.orbit.apply(this.camera);

    // Sonne folgt dem Kamera-Yaw (Schatten als waagrechte Bänder, wie im Flow)
    if (p.sunFollowsCamera) {
      const yaw = this.orbit.yaw;
      if (yaw !== this.lastYaw) {
        this.sunPivot.rotation.y = yaw;
        this.lastYaw = yaw;
        this.shadowDirty = true;
      }
    }
    this.scene.updateMatrixWorld(true);
    this.sun.directionWorld(this.sunDirWorld.value);
    tree.setSunDirection(this.sunDirWorld.value);
    tree.updateCamera(this.camera);
    tree.update(dt);
    this.nodePath?.update(this.elapsed);

    if (this.shadowDirty) {
      this.fitShadow(tree);
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
    ctx.renderer.render(this.scene, this.camera);
  }

  /** Schattenkamera: Baumgrenzen plus der Bodenstreifen, auf den der lange Schatten fällt (Richtung −Sonne). */
  private fitShadow(tree: HeroTree): void {
    _box.copy(tree.bounds);
    const scale = tree.group.scale.x || 1;
    const el = Math.max(0.03, (this.params.sunElevation * Math.PI) / 180);
    const len = Math.min(170, (_box.max.y * scale) / Math.tan(el)) / scale;
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
      glyphs: t && p.canopy ? t.stats.glyphs : 0,
      meadow: t && p.canopy ? t.stats.meadow : 0,
      blossoms: t && p.blossoms ? t.stats.blossoms : 0,
      stars: t && p.stars ? t.stats.stars : 0,
      segments: t && p.branches ? t.stats.segments : 0,
      nodes: t?.stats.nodes ?? 0,
      bushes: this.bushes?.counts.domes ?? 0,
      preset: this.preset.name,
      shadowPasses: this.shadowPasses,
      rideT: p.rideT,
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

/** Radiales Bodengitter (dichter in der Mitte): flach bis r ≈ 24, dann sanfte Hügelwellen. */
function createGroundGeometry(radius: number, rings: number, segments: number): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const height = (x: number, z: number): number => {
    const r = Math.hypot(x, z);
    const w = smooth01((r - 22) / 40);
    const h = 2.4 * Math.sin(x * 0.045 + 1.2) * Math.cos(z * 0.05 - 0.4) + 1.6 * Math.sin((x + z) * 0.07 + 2) + 3.2 * Math.sin(r * 0.028 - 1.1);
    return w * (h + 2.6 * smooth01((r - 60) / 90));
  };
  for (let i = 0; i <= rings; i++) {
    const q = i / rings;
    const r = radius * Math.pow(q, 1.5);
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      pos.push(x, i === 0 ? 0 : height(x, z), z);
    }
  }
  const rv = segments + 1;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * rv + j;
      const b = a + rv;
      // Gegen den Uhrzeigersinn von oben gesehen → Normale nach oben
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Falls die Wicklung nach unten zeigt, umdrehen (Normale der Mitte prüfen)
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

/** Punktkuppel-Büsche auf den Hügeln rund um den Baum (außerhalb der Wurzeln, nicht auf dem Pfadstart). */
function layoutBushes(seed: number, count: number): Dome[] {
  let a = (seed * 9301 + 49297) % 233280;
  const rand = () => (a = (a * 9301 + 49297) % 233280) / 233280;
  const domes: Dome[] = [];
  for (let i = 0; i < count; i++) {
    const ang = rand() * Math.PI * 2;
    const r = 24 + Math.sqrt(rand()) * 90;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const size = 1.3 + rand() * 1.9;
    const center = new Vector3(x, groundHeightApprox(x, z) + size * 0.25, z);
    domes.push({ center, r: size, sy: 0.6 + rand() * 0.1, rank: 0, hash: rand(), cluster: i });
    if (rand() < 0.5) domes.push({ center: center.clone().add(new Vector3(size * 0.7, -size * 0.2, size * 0.3)), r: size * 0.6, sy: 0.62, rank: 0, hash: rand(), cluster: i });
  }
  return domes;
}

function groundHeightApprox(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const w = smooth01((r - 22) / 40);
  const h = 2.4 * Math.sin(x * 0.045 + 1.2) * Math.cos(z * 0.05 - 0.4) + 1.6 * Math.sin((x + z) * 0.07 + 2) + 3.2 * Math.sin(r * 0.028 - 1.1);
  return w * (h + 2.6 * smooth01((r - 60) / 90));
}
