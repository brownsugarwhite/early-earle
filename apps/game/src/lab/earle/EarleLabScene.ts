import { Box3, BufferAttribute, BufferGeometry, Group, Mesh, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { attribute, uniform } from 'three/tsl';
import { generateCapPatch, generateDisplacedSphere, scatterTrees, type CapPatch, type CapPatchParams } from '@ee/world';
import {
  EarleMaterial,
  EarleVegetation,
  FogStripes,
  PaletteAtlas,
  PaletteLookup,
  SunRig,
  TJORIZO_PALETTE,
  addZonePalette,
  createFogSettings,
  createSkyDome,
  skySunIndices,
  type FogSettings,
  type ZoneRows,
} from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { Trackball } from './trackball';
import { resolveQuality, type QualityLevel, type QualityPreset, type ResolvedQuality } from './quality';

export interface EarleLabParams {
  /** Wachstum 0..1 (Instanzanzahl + Aufskalieren). */
  growth: number;
  /** Sonnenhöhe in Grad (6–15). */
  sunElevation: number;
  /** Sonnenazimut relativ zur Blickachse in Grad. */
  sunAzimuth: number;
  /** Lichtbänder Terrain (2–5). */
  bands: number;
  /** Nebelstufen (3–6). */
  fogSteps: number;
  /** Zielanzahl Bäume (Poisson-Disc liefert ≤). Wird beim Wechsel der Qualitätsstufe auf deren Wert gesetzt. */
  treeCount: number;
  /** Nachschärfender Schattenfilter (true) oder three-Standard-PCF (false). */
  hardShadow: boolean;
  /** Qualitätsstufe: Hoch / Mobil / Auto (Touch oder DPR ≥ 2.5 → Mobil). */
  quality: QualityLevel;
  seed: number;
}

export const DEFAULT_EARLE_PARAMS: EarleLabParams = {
  growth: 1,
  sunElevation: 10,
  sunAzimuth: 70,
  bands: 4,
  fogSteps: 5,
  treeCount: 260,
  hardShadow: true,
  quality: 'auto',
  seed: 7,
};

export interface EarleBenchInfo {
  backend: 'webgpu' | 'webgl2' | 'unknown';
  /** Effektiver Pixel-Ratio des Renderers (nach dem Preset-Cap). */
  dpr: number;
  deviceDpr: number;
  /** Zeichenpuffer in Pixeln. */
  canvas: [number, number];
  /** CSS-Größe in Pixeln. */
  css: [number, number];
  ua: string;
  preset: ResolvedQuality;
}

const PLANET_RADIUS = 40;
const CAP_ARC_DEG = 40;
const CAMERA_OFFSET = new Vector3(0, 9, 8);
const LOOK_AT = new Vector3(0, 0, -4);
const _Y = new Vector3(0, 1, 0);

/**
 * P2 Earle-Lab: ein Kappen-Patch des Planeten (R 40, 40°) mit Hügeln, nachgeschärften Riesenschatten,
 * instanzierten Kuppel-/Kegel-Kronen mit Sechseck-Punkten, dünnen Stämmen, gestuftem Nebel und Bandhimmel.
 * Kamera fest (FOV 70, Planetenmitte weit unter der Bildmitte), das Patch rollt per Trackball unter ihr durch.
 * Qualitätsstufen (siehe quality.ts) tauschen Schattenkarte, Punktdichte, Baumzahl, Nebelstreifen, Auflösung
 * und den Pixel-Ratio des Renderers (Override über `resize()`, das der CanvasHost nach seinem setPixelRatio ruft).
 */
export class EarleLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(70, 1, 0.5, 700);
  private readonly rig = new Object3D();
  private readonly planet = new Group();
  private readonly atlas = new PaletteAtlas();
  private readonly rows: ZoneRows;
  private readonly lookup: PaletteLookup;
  private readonly fog: FogSettings;
  private readonly terrainBands = uniform(4);
  private readonly canopyBands = uniform(3);
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  /** sin der Horizontsenke (negativ), damit die Himmelsrampe am Planetenhorizont beginnt. */
  private readonly skyHorizon = uniform(-0.5);
  private readonly sun: SunRig;
  private readonly trackball: Trackball;
  private params: EarleLabParams;
  private preset: QualityPreset;
  private ctx: SceneContext | null = null;
  private patch: CapPatch | null = null;
  private terrain: Mesh | null = null;
  private filler: Mesh | null = null;
  private vegetation: EarleVegetation | null = null;
  private sky: Mesh | null = null;
  private fogStripes: FogStripes | null = null;
  private readonly shadowBounds = new Box3();
  private shadowDirty = true;
  private zoom = 1;
  private autoRotate = 0;
  private readonly listeners = new Set<(p: EarleLabParams) => void>();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly tmp = new Vector3();
  private readonly tmpQ = new Quaternion();
  /** Anzahl angeforderter Schattenpässe (für die Leerlauf-Kontrolle). */
  shadowPasses = 0;

  constructor(initial: Partial<EarleLabParams> = {}) {
    this.params = { ...DEFAULT_EARLE_PARAMS, ...initial };
    this.preset = resolveQuality(this.params.quality);
    this.rows = addZonePalette(this.atlas, TJORIZO_PALETTE, 'tjorizo');
    this.lookup = new PaletteLookup(this.atlas.texture, this.atlas.width, this.atlas.height);
    this.fog = createFogSettings({ row: this.rows.fog, steps: this.params.fogSteps, start: 12, range: 22 });
    this.sun = new SunRig({
      mapSize: this.preset.shadowMapSize,
      sharpen: this.params.hardShadow,
      elevationDeg: this.params.sunElevation,
      azimuthDeg: this.params.sunAzimuth,
    });
    this.trackball = new Trackball({
      radius: PLANET_RADIUS,
      tau: 0.4,
      worldUnitsPerPixel: () => this.worldUnitsPerPixel(),
      onZoom: (f) => this.setZoom(this.zoom * f),
    });
  }

  private get capParams(): CapPatchParams {
    // Kein Randauslauf: die Füllkugel trägt dasselbe Höhenfeld, Patch und Kugel gehen nahtlos ineinander über.
    return { radius: PLANET_RADIUS, arcDeg: CAP_ARC_DEG, res: this.preset.terrainRes, seed: this.params.seed, edgeFade: 0 };
  }

  get isMounted(): boolean {
    return this.ctx !== null;
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.name = 'EarleLab';

    // Rig am Scheitel des Planeten; Kamera, Sonne, Himmel und Nebelstreifen hängen daran.
    this.rig.position.set(0, PLANET_RADIUS, 0);
    this.scene.add(this.rig);
    this.rig.add(this.camera);
    this.sun.root.position.copy(LOOK_AT);
    this.rig.add(this.sun.root);
    this.setZoom(1);
    this.scene.add(this.planet);

    const sunIdx = skySunIndices(TJORIZO_PALETTE);
    this.sky = createSkyDome({
      lookup: this.lookup,
      skyRow: this.rows.sky,
      steps: sunIdx.steps,
      sunIndex: sunIdx.sun,
      ringIndex: sunIdx.ring,
      sunDirWorld: this.sunDirWorld,
      horizonY: this.skyHorizon,
    });
    this.camera.add(this.sky);
    this.disposables.push(this.sky.geometry, this.sky.material as { dispose(): void });

    this.trackball.attach(ctx.canvas);
    // Preset bestimmt Baumzahl, Auflösung, Schattenkarte, DPR; danach alle Parameter anwenden
    this.applyParams({ ...this.params, treeCount: this.preset.treeCount }, true);
    this.resize(ctx);
  }

  // --- Aufbau ------------------------------------------------------------------------------------

  private buildTerrain(): void {
    this.terrain?.removeFromParent();
    this.terrain?.geometry.dispose();
    this.filler?.removeFromParent();
    this.filler?.geometry.dispose();

    const patch = generateCapPatch(this.capParams);
    this.patch = patch;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(patch.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(patch.normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(patch.uvs, 2));
    geometry.setAttribute('height', new BufferAttribute(patch.height, 1));
    geometry.setAttribute('biome', new BufferAttribute(patch.biome, 1));
    geometry.setIndex(new BufferAttribute(patch.indices, 1));
    const material = new EarleMaterial({
      lookup: this.lookup,
      row: this.rows.terrain,
      fog: this.fog,
      bands: this.terrainBands,
      bandScale: 2.0,
      terminator: -0.05,
      lift: attribute('height', 'float').mul(0.45),
    });
    const terrain = new Mesh(geometry, material);
    terrain.name = 'terrain';
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    terrain.frustumCulled = false;
    this.planet.add(terrain);
    this.terrain = terrain;
    this.disposables.push(material);

    // Füllkugel: der Rest des Planeten (Horizontkrümmung) mit demselben Höhenfeld, knapp unter dem Patch.
    const [ws, hs] = this.preset.fillerSegments;
    const sphere = generateDisplacedSphere({ ...this.capParams, widthSegments: ws, heightSegments: hs, radiusOffset: -0.03 });
    const fillerGeometry = new BufferGeometry();
    fillerGeometry.setAttribute('position', new BufferAttribute(sphere.positions, 3));
    fillerGeometry.setAttribute('normal', new BufferAttribute(sphere.normals, 3));
    fillerGeometry.setIndex(new BufferAttribute(sphere.indices, 1));
    const fillerMaterial = new EarleMaterial({
      lookup: this.lookup,
      row: this.rows.terrain,
      fog: this.fog,
      bands: this.terrainBands,
      bandScale: 2.0,
      terminator: -0.05,
    });
    const filler = new Mesh(fillerGeometry, fillerMaterial);
    filler.name = 'planet-filler';
    filler.castShadow = false;
    filler.receiveShadow = true;
    filler.frustumCulled = false;
    this.planet.add(filler);
    this.filler = filler;
    this.disposables.push(fillerMaterial);
  }

  private buildVegetation(): void {
    if (!this.patch) return;
    this.vegetation?.dispose();
    const trees = scatterTrees({
      seed: this.params.seed,
      count: this.params.treeCount,
      minDist: 1.45,
      cap: this.capParams,
      clumpiness: 0.6,
    });
    // Sonnenrichtung im Patch-Raum (für die sonnenseitige Punktverteilung)
    this.rig.updateWorldMatrix(true, true);
    const sunLocal = this.sun.directionWorld(new Vector3());
    this.planet.updateWorldMatrix(true, false);
    sunLocal.applyQuaternion(this.planet.quaternion.clone().invert());
    this.vegetation = new EarleVegetation({
      trees,
      lookup: this.lookup,
      canopyRow: this.rows.canopy,
      fog: this.fog,
      bands: this.canopyBands,
      sunDirLocal: sunLocal,
      seed: this.params.seed,
      dotsPerTree: this.preset.dotsPerTree,
      collapsePx: this.preset.collapsePx,
    });
    this.planet.add(this.vegetation.group);
    this.vegetation.setGrowth(this.params.growth);
    // Schattenkamera: Patch-Grenzen plus Vegetationshöhe
    const b = this.patch.bounds;
    this.shadowBounds.min.set(b.min[0], b.min[1], b.min[2]);
    this.shadowBounds.max.set(b.max[0], b.max[1] + this.vegetation.hMax, b.max[2]);
    this.shadowBounds.expandByScalar(1);
    this.shadowDirty = true;
  }

  private buildFogStripes(): void {
    this.fogStripes?.dispose();
    this.fogStripes = new FogStripes({
      lookup: this.lookup,
      fogRow: this.rows.fog,
      colorIndex: 5,
      count: this.preset.fogStripes,
      firstDistance: 6,
      spacing: this.preset.fogStripes > 2 ? 5 : 8,
      curvatureRadius: PLANET_RADIUS,
    });
    this.rig.add(this.fogStripes.group);
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

  /** Parameter live setzen (React und Bench rufen das). Löst Listener aus, wenn sich etwas geändert hat. */
  setParams(patch: Partial<EarleLabParams>): void {
    const next = { ...this.params, ...patch };
    if (patch.quality !== undefined && patch.quality !== this.params.quality && patch.treeCount === undefined) {
      next.treeCount = resolveQuality(patch.quality).treeCount;
    }
    this.applyParams(next, false);
  }

  getParams(): EarleLabParams {
    return { ...this.params };
  }

  getResolvedQuality(): ResolvedQuality {
    return this.preset.name;
  }

  /** Listener für Parameteränderungen (auch programmatische), z. B. damit Regler nachziehen. */
  subscribe(listener: (p: EarleLabParams) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private applyParams(next: EarleLabParams, force: boolean): void {
    const prev = this.params;
    const changed = force || (Object.keys(next) as Array<keyof EarleLabParams>).some((k) => next[k] !== prev[k]);
    this.params = next;
    if (!changed) return;
    if (this.ctx) {
      const preset = resolveQuality(next.quality);
      const presetChanged = force || preset.name !== this.preset.name;
      this.preset = preset;
      if (presetChanged) {
        this.applyDpr();
        this.sun.setMapSize(preset.shadowMapSize);
        this.buildTerrain();
        this.buildVegetation();
        this.buildFogStripes();
      } else if (next.seed !== prev.seed) {
        this.buildTerrain();
        this.buildVegetation();
      } else if (next.treeCount !== prev.treeCount) {
        this.buildVegetation();
      }
      if (force || next.growth !== prev.growth) {
        this.vegetation?.setGrowth(next.growth);
        this.shadowDirty = true;
      }
      if (force || next.sunElevation !== prev.sunElevation || next.sunAzimuth !== prev.sunAzimuth) {
        this.sun.setAngles(next.sunElevation, next.sunAzimuth);
        this.shadowDirty = true;
      }
      if (force || next.hardShadow !== prev.hardShadow) {
        this.sun.setSharpen(next.hardShadow);
        this.shadowDirty = true;
      }
      this.terrainBands.value = Math.max(2, Math.min(5, Math.round(next.bands)));
      this.fog.steps.value = Math.max(2, Math.min(6, Math.round(next.fogSteps)));
    }
    for (const l of this.listeners) l({ ...this.params });
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

  /** Konstante Drehung um die Hochachse des Patches (rad/s), 0 = aus. Für die Bench "rotierend". */
  setAutoRotate(radPerSec: number): void {
    this.autoRotate = radPerSec;
  }

  resize(ctx: SceneContext): void {
    this.applyDpr();
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    let rotated = this.trackball.step(dt);
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
    // Sonnenrichtung (Welt) für Himmel und Punkt-Tönung; Kameraachsen für die Billboards
    this.sun.directionWorld(this.sunDirWorld.value);
    // Horizontsenke aus der Kamerahöhe über der Kugel: dip = acos(R / (R + h))
    const camR = this.camera.getWorldPosition(this.tmp).length();
    this.skyHorizon.value = -Math.sin(Math.acos(Math.min(1, PLANET_RADIUS / Math.max(PLANET_RADIUS + 0.01, camR))));
    this.vegetation?.setSunDirection(this.sunDirWorld.value);
    this.vegetation?.updateCamera(this.camera);
    if (this.shadowDirty) {
      this.sun.fitShadow(this.shadowBounds, this.planet.matrixWorld, (this.patch?.hMax ?? 2) + (this.vegetation?.hMax ?? 3));
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
    ctx.renderer.render(this.scene, this.camera);
  }

  // --- Messwerte ----------------------------------------------------------------------------------

  getStats(): { drawCalls: number; shadowPasses: number; trees: number; dots: number; visibleTrees: number; preset: ResolvedQuality; dpr: number } {
    const info = this.ctx?.renderer.info as { render?: { drawCalls?: number } } | undefined;
    return {
      drawCalls: info?.render?.drawCalls ?? 0,
      shadowPasses: this.shadowPasses,
      trees: this.vegetation?.treeCount ?? 0,
      dots: this.vegetation?.dotCount ?? 0,
      visibleTrees: Math.floor((this.vegetation?.treeCount ?? 0) * this.params.growth),
      preset: this.preset.name,
      dpr: this.ctx?.renderer.getPixelRatio() ?? 0,
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
    this.vegetation?.dispose();
    this.fogStripes?.dispose();
    this.terrain?.geometry.dispose();
    this.filler?.geometry.dispose();
    for (const d of this.disposables) d.dispose();
    this.sun.dispose();
    this.atlas.dispose();
    if (this.ctx) {
      this.ctx.renderer.shadowMap.enabled = false;
      this.ctx.renderer.setPixelRatio(this.ctx.dpr);
    }
    this.listeners.clear();
    this.scene.clear();
    this.ctx = null;
  }
}
