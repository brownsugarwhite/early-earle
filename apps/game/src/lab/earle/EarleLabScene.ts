import { Color, Frustum, Matrix4, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { CloudBanks, EarlePlanet, FogStripes, PLANET_SHADOW_LAYER, SunRig, createForegroundBranch, createSkyDome, followViewClouds, skySunIndices, type ForegroundBranch, type WorldView } from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { PanBall } from './panball';
import { resolveQuality, type QualityLevel, type QualityPreset, type ResolvedQuality } from './quality';
import { AUTHORED_ROUTE, HERO_TREE_WORLD, LEVEL_COUNT, PLANET_RADIUS, PLAYABLE_COUNT, WORLD_CONTENTS, planetWorlds, routeOptions, zoneOfLevel } from './zones';
import { TREE_RANGE, createHeroTreeSite, type HeroTreeSite } from './heroTreeSite';
import { createPlanetTrash } from './trash';
import type { TrashField } from '@ee/render/earle/trash/index.ts';
import { NodePath } from '../../flow/NodePath';
import { FlowPath } from '../../flow/levelPath';
import { planetPathPalette } from '../../flow/MapWorld';

export interface EarleLabParams {
  /** Fortschritt: Anzahl geschaffter Knoten (0..184) → Wachstum je Chunk entlang des Pfads (Müll versinkt). */
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
  /** Alle Pfadrisse geschlossen (sonst schließen sie mit dem Fortschritt). */
  cracksClosed: boolean;
  seed: number;
  /**
   * Gewählte Welt (Kennung: 0..15 = Weltdateien 01..16 — 15 Autorenwelten auf der Route und die angedeutete Zone 16;
   * nur mit `procedural` ab 16 prozedurale Pfadwelten 17, 18, …): gleitet zu ihrem Bildfokus. −1 = keine Wahl.
   */
  world: number;
  /** Alter Weltenmodus (`?prozedural=1`): prozedurale Welten hinter und neben der Route statt der angedeuteten Zone. */
  procedural: boolean;
  /** Perspektive: 0 = alte Übersicht, 1 = Earle-Komposition der Welt (Kamera tief, FOV weit, Krümmung), bis 1.4 übertrieben. */
  perspective: number;
  /** Müll-Dichte der Startwelt in Prozent (0–200). */
  trash: number;
  /** Levelpfad (Steine, Punkte, Ring) einblenden — inkl. des Abschnitts über den Riesenbaum. */
  path: boolean;
  /** Kamera auf der Baum-Schiene bei Knoten `rail` (0-basiert, 98–113); −1 = aus. */
  rail: number;
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
  cracksClosed: false,
  seed: 7,
  world: -1,
  procedural: false,
  perspective: 1,
  trash: 100,
  path: false,
  rail: -1,
};

/** Wählbare Welten im Lab: die Weltdateien (15 Autorenwelten und die angedeutete Zone 16). */
export const LAB_WORLD_COUNT = WORLD_CONTENTS.length;
/** Nur mit `?prozedural=1`: so viele prozedurale Pfadwelten hinter der Route kommen im Weltwähler dazu. */
export const LAB_PROCEDURAL_WORLDS = 30;

/** Wählbare Welten (Kennungen 0 … n−1): die Weltdateien, mit `procedural` dazu 30 prozedurale Pfadwelten. */
export function labWorldCount(procedural: boolean): number {
  return LAB_WORLD_COUNT + (procedural ? LAB_PROCEDURAL_WORLDS : 0);
}

export interface EarleBenchInfo {
  backend: 'webgpu' | 'webgl2' | 'unknown';
  dpr: number;
  deviceDpr: number;
  canvas: [number, number];
  css: [number, number];
  ua: string;
  preset: ResolvedQuality;
}

export { PLANET_RADIUS };

/** Schleier über Nachbarwelten im Weltblick (Zusatz-Nebeldistanz, Welteinheiten). */
const VEIL_DISTANCE = 24;
/** Alte Übersicht (P2b): Kamera 9 hoch, 8 zurück, Blick 4 voraus, FOV 70, keine Zusatzkrümmung. */
const OVERVIEW: WorldView = { height: 9, forward: 8, look: 4, fov: 70, curvature: 0 };
/** Bildposition des Fokus: Knoten auf der unteren Drittellinie; Welten nach ihrer Komposition (view.focus). */
const NODE_NDC: [number, number] = [0, -0.3];
/** Mindestabstand der Kamera über dem Gelände. */
const CLEARANCE = 1.3;
const _Y = new Vector3(0, 1, 0);

/**
 * sin der Horizont-Elevation für eine Kamera im Abstand `camR` vom Kugelmittelpunkt: reine Kugel analytisch; mit
 * negativem Krümmungs-Boost (flachere Erde, Kompositionen der Welten 13/14) liegt der Horizont höher — dann die höchste
 * Elevation der Anzeigekurve r(α) = R·(1 − c·(1 − cos α)).
 */
export function horizonSin(R: number, c: number, camR: number): number {
  const sphere = -Math.sin(Math.acos(Math.min(1, R / Math.max(R + 0.01, camR))));
  if (c >= 0) return sphere;
  let best = -Math.PI / 2;
  for (let a = 0.02; a < 1.9; a += 0.02) {
    const r = R * (1 - c * (1 - Math.cos(a)));
    best = Math.max(best, Math.atan2(r * Math.cos(a) - camR, r * Math.sin(a)));
  }
  return Math.max(sphere, Math.sin(best));
}

/**
 * P2c Earle-Lab auf der unendlichen Ebene (ADR 0002, Route 15 + 1): die 15 Autorenwelten entlang des Pfads, dahinter
 * und links und rechts die angedeutete Zone 16 (mit `?prozedural=1` der alte Modus: prozedurale Welten hinter der Route,
 * Nachbarwelten links und rechts), als Kugel um den Fokus angezeigt. Weltwähler gleitet zum Bildfokus
 * der Welt; Ziehen schiebt den Fokus endlos in jede Richtung. Perspektive je Welt (Kamerahöhe, Blickpunkt, FOV 80–90°,
 * Krümmungs-Boost der fernen Erde) mit dem Regler „Perspektive" zwischen alter Übersicht und Earle-Komposition, Müll der
 * Startwelt (Dichte-Regler, versinkt mit dem Wachstum), Risse, Levelpfad, Sonnen-Rig mit Schatten in der Ebene.
 */
export class EarleLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(70, 1, 0.3, 700);
  private readonly probe = new PerspectiveCamera(70, 1, 0.3, 700);
  private readonly rig = new Object3D();
  private readonly sun: SunRig;
  private readonly panBall: PanBall;
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly skyHorizon = uniform(-0.5);
  private readonly frustum = new Frustum();
  private params: EarleLabParams;
  private preset: QualityPreset;
  private ctx: SceneContext | null = null;
  private world: EarlePlanet | null = null;
  private fogStripes: FogStripes | null = null;
  /** Wolkenbänke der Blick-Welt (Welt 13). */
  private clouds: CloudBanks | null = null;
  /** Vordergrund-Ast der Komposition (Welt 12, Ebene 7), an der Kamera. */
  private branch: ForegroundBranch | null = null;
  private branchFade = 0;
  private treeSite: HeroTreeSite | null = null;
  /** Müll v2 und Neon-Schleier (heilt mit dem Fortschritt; ein Schritt am Regler spielt die Feier). */
  private trash: TrashField | null = null;
  private pathLayout: FlowPath | null = null;
  private nodePath: NodePath | null = null;
  private elapsed = 0;
  private nearClear = 0.25;
  private footClear = 0;
  /**
   * Gewählte Welt (Weltwahl/Knoten): Himmel, Nebel und Komposition bleiben bei ihr, auch wenn der Bildmittelpunkt
   * knapp in einer Nachbarwelt liegt (Fokus auf der Drittellinie). Ziehen löst die Bindung.
   */
  private pinnedWorld = -1;
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly listeners = new Set<(p: EarleLabParams) => void>();
  private readonly worldListeners = new Set<(world: number) => void>();
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly tmpM = new Matrix4();
  /** Aktuelle (geglättete) Kamera-Komposition. */
  private readonly view: WorldView = { ...OVERVIEW };
  private viewInitialised = false;
  private lift = 0;
  /**
   * Geländehöhe am Blickpunkt (Welteinheiten, geglättet): Kamera und Blickziel stehen relativ zum Gelände, das man
   * ansieht — in steilen Welten (Violette Hänge, Schneekiefern) klebt der Hügelblick sonst am Hang.
   */
  private groundLift = 0;
  private shadowDirty = true;
  private zoom = 1;
  private yaw = 0;
  private autoRotate = 0;
  private autoPan: { x: number; z: number } = { x: 0, z: 0 };
  private glide: { x0: number; z0: number; x1: number; z1: number; t: number; duration: number } | null = null;
  private lastViewWorld = -1;
  private lastCurvature = -1;
  /** Anzahl angeforderter Schattenpässe (für die Leerlauf-Kontrolle). */
  shadowPasses = 0;
  /**
   * Die gewählte Welt geheilt zeigen: eine Autorenwelt weiter vorn auf der Route wäre beim Standard-Fortschritt noch
   * kahl (ihre Bäume wachsen erst mit dem Fortschritt) — das Lab zeigt sie geheilt (wirksamer Fortschritt = mindestens
   * ihr letzter Level). Aus, sobald `?progress=` oder der Regler den Fortschritt setzt.
   */
  private progressFollowsWorld: boolean;

  constructor(initial: Partial<EarleLabParams> = {}, options: { progressFromUrl?: boolean } = {}) {
    this.progressFollowsWorld = options.progressFromUrl !== true;
    this.params = { ...DEFAULT_EARLE_PARAMS, ...initial };
    this.preset = resolveQuality(this.params.quality);
    this.sun = new SunRig({
      mapSize: this.preset.shadowMapSize,
      sharpen: this.params.hardShadow,
      elevationDeg: this.params.sunElevation,
      azimuthDeg: this.params.sunAzimuth,
    });
    // Schattenwerfer des Geländes: Stellvertreter-Layer der Ebene
    this.sun.light.shadow.camera.layers.enable(PLANET_SHADOW_LAYER);
    this.panBall = new PanBall({
      worldUnitsPerPixel: () => this.worldUnitsPerPixel(),
      yaw: () => this.yaw,
      onPan: (dx, dz) => this.panBy(dx, dz),
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
    this.scene.add(this.rig);
    this.rig.add(this.camera);
    this.sun.root.position.set(0, 0, -4);
    this.rig.add(this.sun.root);
    this.panBall.attach(ctx.canvas);
    this.buildWorld();
    this.applyParams(this.params, true);
    this.resize(ctx);
    if (this.params.world >= 0) this.snapToWorld(this.params.world);
    else this.snapToNode(Math.max(0, Math.min(this.params.progress, LEVEL_COUNT - 1)));
  }

  private buildWorld(): void {
    this.nodePath?.dispose();
    this.nodePath = null;
    this.treeSite?.dispose();
    this.treeSite = null;
    this.trash?.dispose();
    this.trash = null;
    this.world?.dispose();
    this.fogStripes?.dispose();
    this.clouds?.dispose();
    this.clouds = null;
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    const p = this.preset;
    const treeFirst = TREE_RANGE[0] - 1;
    const treeLast = TREE_RANGE[1] - 1;
    const world = new EarlePlanet({
      radius: PLANET_RADIUS,
      seed: this.params.seed,
      worlds: planetWorlds(),
      // Route 15 + 1; `?prozedural=1` = alter Weltenmodus mit prozeduralen Welten
      ...routeOptions(this.params.procedural),
      trashScale: this.params.trash / 100,
      quality: {
        chunkRes: p.name === 'mobil' ? 25 : 33,
        lodRes: p.name === 'mobil' ? 9 : 13,
        dotsPerTree: p.dotsPerTree,
        collapsePx: p.collapsePx,
        densityScale: (p.treeCount / 260) * (this.params.density / 100),
        nearChunks: p.name === 'mobil' ? 6 : 9,
        capacity: p.name === 'mobil' ? { trees: 1400, dots: 14000, props: 300, animals: 160 } : { trees: 2600, dots: 45000, props: 400, animals: 220 },
      },
      path: { clearNode: 2.0, clearPath: 0.8, keepGround: [treeFirst - 1, treeLast + 1] },
      loadsPerFrame: 2,
      shadow: { factor: (q, o) => this.sun.shadowFactor(q, o) },
      // Schattentönung je Welt (blaue Schatten auf Schnee …) aus den Weltdateien
      shadowTint: this.sun.shadowTint,
    });
    this.world = world;
    this.scene.add(world.group);
    // Levelpfad wie im Flow: durch die Landschaft geroutet, dann der Riesenbaum (Welt 01) mit dem Abschnitt 99–114 über
    // Stamm und Krone (seine eigenen Markierungen tragen ihn); Knoten ohne Leveldatei bleiben „bald“
    this.treeSite = createHeroTreeSite(world, { worldIndex: HERO_TREE_WORLD, quality: p.name, seed: this.params.seed });
    this.pathLayout = new FlowPath(world, this.treeSite, HERO_TREE_WORLD, PLAYABLE_COUNT);
    world.setPathCorridor((x0, z0, x1, z1) => this.pathLayout!.corridor(x0, z0, x1, z1));
    this.trash = createPlanetTrash(world, this.pathLayout, { quality: p.name, seed: this.params.seed, densityScale: this.params.trash / 100 });
    this.trash.setProgress(this.currentProgress, false);
    // neue Welt: der wirksame Fortschritt wird in applyParams wieder gesetzt
    this.effectiveProgress = -1;
    world.plane.add(this.trash.group);
    this.buildNodePath();
    world.terrainBands.value = this.params.bands;
    world.fog.steps.value = this.params.fogSteps;
    // Schatten in der Ebene: Kaskaden an der Kamera, Werfer und Empfänger über die Umkehr-Abbildung
    this.sun.fitToDisplay(this.camera, () => this.world, world.plane);

    const sunIdx = skySunIndices(world.worlds[0]!.palette);
    const sky = createSkyDome({
      lookup: world.lookup,
      skyRow: world.skyRowA,
      steps: sunIdx.steps,
      sunIndex: sunIdx.sun,
      ringIndex: sunIdx.ring,
      sunDirWorld: this.sunDirWorld,
      skyRowB: world.skyRowB,
      skyMix: world.skyMix,
      horizonY: this.skyHorizon,
      glow: world.skyGlow,
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
      strength: world.stripeStrength,
    });
    this.rig.add(this.fogStripes.group);
    this.clouds = new CloudBanks({ lookup: world.lookup });
    this.rig.add(this.clouds.group);
    this.branch?.dispose();
    this.branch = createForegroundBranch();
    this.branch.setOpacity(0);
    this.camera.add(this.branch.group);
    this.lastCurvature = -1;
    this.shadowDirty = true;
  }

  /**
   * Levelpfad wie im Flow (geroutet, mit Band und Knoten auf ihren Elementen; der Riesenbaum trägt seinen Abschnitt mit
   * eigenen Markierungen), ein Fenster um den Blick; nur wenn eingeschaltet.
   */
  private buildNodePath(): void {
    this.nodePath?.dispose();
    this.nodePath = null;
    const world = this.world;
    const site = this.treeSite;
    const layout = this.pathLayout;
    if (site) site.markers.group.visible = this.params.path;
    if (!world || !layout || !this.params.path) return;
    this.scene.updateMatrixWorld(true);
    this.nodePath = new NodePath({
      planet: world,
      layout,
      palette: planetPathPalette(world, this.sun.shadowTint),
      external: (i) => layout.isTreeNode(i),
      sunDirWorld: this.sun.directionWorld(new Vector3()),
      onProgress: (cur, done) => site?.setPathState(cur, done),
    });
    const current = Math.max(0, Math.min(this.currentProgress, layout.lastPlayable));
    this.nodePath.setProgress(current, this.currentProgress);
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
    return { ...this.params };
  }

  getResolvedQuality(): ResolvedQuality {
    return this.preset.name;
  }

  subscribe(listener: (p: EarleLabParams) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Meldet die Welt unter dem Blickpunkt (Kennung), sobald sie wechselt. */
  onViewWorld(listener: (world: number) => void): () => void {
    this.worldListeners.add(listener);
    if (this.lastViewWorld >= 0) listener(this.lastViewWorld);
    return () => this.worldListeners.delete(listener);
  }

  /** Name und Referenz einer Welt (Autorenwelt, angedeutete Zone „Bald“ oder prozedurale Welt). */
  worldLabel(id: number): { ref: string; name: string; zone: string; authored: boolean } {
    const c = WORLD_CONTENTS[id];
    if (c?.hinted) return { ref: c.ref, name: 'Bald', zone: 'gesperrt', authored: true };
    if (c) return { ref: c.ref, name: c.name, zone: c.zone, authored: true };
    const data = this.world?.worldData(id);
    const nr = String(id + 1).padStart(2, '0');
    return { ref: nr, name: data?.name ?? `Welt ${id + 1}`, zone: 'prozedural', authored: false };
  }

  private applyParams(next: EarleLabParams, force: boolean): void {
    const prev = this.params;
    // Regler bewegt → der Fortschritt gehört dem Benutzer
    if (!force && next.progress !== prev.progress) this.progressFollowsWorld = false;
    const keys = Object.keys(next) as Array<keyof EarleLabParams>;
    const changed = force || keys.some((k) => next[k] !== prev[k]);
    this.params = next;
    if (!changed) return;
    if (this.ctx && this.world) {
      const preset = resolveQuality(next.quality);
      const presetChanged = force || preset.name !== this.preset.name;
      this.preset = preset;
      if (presetChanged || next.seed !== prev.seed || next.density !== prev.density || next.procedural !== prev.procedural) {
        this.applyDpr();
        this.sun.setMapSize(preset.shadowMapSize);
        const f = this.world ? { x: this.world.focus.x, z: this.world.focus.z } : null;
        this.buildWorld();
        if (f && !force) this.world!.setFocus(f.x, f.z);
      }
      const world = this.world!;
      world.terrainBands.value = Math.max(2, Math.min(5, Math.round(next.bands)));
      world.fog.steps.value = Math.max(2, Math.min(6, Math.round(next.fogSteps)));
      if (!force && next.trash !== prev.trash) {
        world.setTrashScale(Math.max(0, next.trash) / 100);
        this.trash?.setDensity(Math.max(0, next.trash) / 100);
        this.shadowDirty = true;
      }
      // Wirksamer Fortschritt: der Regler, oder (Standard) mindestens der letzte Level der gewählten Autorenwelt
      const progress = this.progressFollowsWorld && next.world >= 0 ? Math.max(next.progress, this.healedProgress(next.world)) : next.progress;
      const before = this.effectiveProgress;
      this.effectiveProgress = progress;
      if (force || progress !== before || next.cracksClosed !== prev.cracksClosed) {
        world.setProgress(progress);
        world.setCracksClosedBelow(next.cracksClosed ? 1e9 : world.layout.segmentOfLevel(progress + 1) + 1);
        this.treeSite?.setProgress(progress);
        this.trash?.setProgress(progress, !force);
        const last = this.pathLayout?.lastPlayable ?? PLAYABLE_COUNT - 1;
        this.nodePath?.setProgress(Math.max(0, Math.min(progress, last)), progress);
        this.shadowDirty = true;
        if (!force && next.progress !== prev.progress) this.turnToNode(Math.max(0, Math.min(progress, last)));
      }
      if (!force && next.path !== prev.path) this.buildNodePath();
      if (!force && next.world !== prev.world && next.world >= 0) this.turnToWorld(next.world);
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

  // --- Kamera / Komposition -------------------------------------------------------------------------

  /** Komposition einer Welt für das aktuelle Bildformat (Hochformat: `view.portrait` ersetzt Felder). */
  private presetOf(worldId: number): WorldView {
    const v = this.world?.worldData(worldId).view ?? OVERVIEW;
    return v.portrait && this.camera.aspect < 1 ? { ...v, ...v.portrait } : v;
  }

  /** Kamera-Komposition einer Welt bei Perspektive p (0 = Übersicht, 1 = Weltpreset, >1 übertrieben). */
  private viewFor(worldId: number, out: WorldView = { ...OVERVIEW }): WorldView {
    const preset = this.presetOf(worldId);
    const p = Math.max(0, Math.min(1.4, this.params.perspective));
    const t = Math.min(1, p);
    out.height = OVERVIEW.height + (preset.height - OVERVIEW.height) * t;
    out.forward = OVERVIEW.forward + (preset.forward - OVERVIEW.forward) * t;
    out.look = OVERVIEW.look + (preset.look - OVERVIEW.look) * t;
    out.fov = OVERVIEW.fov + (preset.fov - OVERVIEW.fov) * t;
    out.curvature = OVERVIEW.curvature + (preset.curvature - OVERVIEW.curvature) * t;
    out.lookHeight = (preset.lookHeight ?? 0) * t;
    out.lookSide = (preset.lookSide ?? 0) * t;
    if (p > 1) {
      const e = (p - 1) / 0.4; // 0..1 Übertreibung
      out.curvature *= 1 + 1.5 * e;
      out.fov = Math.min(100, out.fov + 8 * e);
      out.height *= 1 - 0.25 * e;
    }
    return out;
  }

  /** Aktuelle (geglättete) Sonne in Grad; NaN = noch nicht gesetzt. */
  private readonly sunNow = { el: Number.NaN, az: Number.NaN };

  /**
   * Sonne der Weltkomposition (`view.sun`, z. B. Welt 13: Licht von rechts hinten auf die Schauseite des Monolithen)
   * weich anfahren; ohne Angabe (oder in der Übersicht) die Sonne der Regler.
   */
  private followWorldSun(view: WorldView, k: number): void {
    const want = view.sun && this.params.perspective > 0.5 ? view.sun : null;
    const el = want ? (want.elevation ?? this.params.sunElevation) : this.params.sunElevation;
    const az = want ? want.azimuth : this.params.sunAzimuth;
    if (Number.isNaN(this.sunNow.el)) {
      this.sunNow.el = this.params.sunElevation;
      this.sunNow.az = this.params.sunAzimuth;
    }
    if (Math.abs(el - this.sunNow.el) < 0.01 && Math.abs(az - this.sunNow.az) < 0.01) return;
    const snap = Math.abs(el - this.sunNow.el) < 0.05 && Math.abs(az - this.sunNow.az) < 0.05;
    this.sunNow.el = snap ? el : this.sunNow.el + (el - this.sunNow.el) * k;
    this.sunNow.az = snap ? az : this.sunNow.az + (az - this.sunNow.az) * k;
    this.sun.setAngles(this.sunNow.el, this.sunNow.az);
    this.shadowDirty = true;
  }

  private cameraOffset(v: WorldView, out: Vector3): Vector3 {
    return out.set(0, v.height, v.forward).multiplyScalar(this.zoom);
  }

  private applyView(): void {
    const v = this.view;
    this.cameraOffset(v, this.camera.position);
    this.camera.position.y += this.lift + this.groundLift;
    this.rig.updateMatrixWorld(true);
    this.camera.lookAt(this.rig.localToWorld(this.tmp.set(v.lookSide ?? 0, this.groundLift + (v.lookHeight ?? 0), -v.look)));
    if (Math.abs(this.camera.fov - v.fov) > 1e-3) {
      this.camera.fov = v.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Kameraschiene des Baumabschnitts (Vorschau für den Flow): Kamera auf der Schiene bei Knoten `params.rail`, Blick
   * zum Schienen-Blickpunkt; Schiene in der Ebene → Anzeige → Rig-Raum.
   */
  private applyRail(): void {
    const site = this.treeSite;
    const world = this.world;
    const index = this.params.rail;
    if (!site || !world || index < 0) return;
    const pos = new Vector3();
    const look = new Vector3();
    if (!site.railFor(index, pos, look)) return;
    world.toDisplay(pos, pos);
    world.toDisplay(look, look);
    this.scene.updateMatrixWorld(true);
    // Kamera hängt am Rig (Scheitel): Weltposition in Rig-Raum, Blick mit Oben = radial am Kameraort
    const up = pos.clone().normalize();
    this.rig.worldToLocal(pos);
    this.camera.position.copy(pos);
    this.camera.up.copy(up.applyQuaternion(this.rig.quaternion.clone().invert()));
    this.camera.lookAt(look);
    this.camera.up.set(0, 1, 0);
  }

  private worldUnitsPerPixel(): number {
    const h = this.ctx?.height ?? 800;
    const dist = this.cameraOffset(this.view, this.tmp2).distanceTo(this.tmp.set(0, 0, -this.view.look));
    return (2 * dist * Math.tan((this.camera.fov * Math.PI) / 360)) / h;
  }

  setZoom(z: number): void {
    this.zoom = Math.min(2.4, Math.max(0.55, z));
  }

  private panBy(dx: number, dz: number): void {
    const world = this.world;
    if (!world) return;
    this.glide = null;
    this.pinnedWorld = -1;
    world.setFocus(world.focus.x + dx, world.focus.z + dz);
    this.shadowDirty = true;
  }

  /** Programmatisches Ziehen (Tests): Pixel-Delta wie eine Zeigerbewegung. */
  rotateBy(dxPx: number, dyPx: number): void {
    this.panBall.drag(dxPx, dyPx, 1 / 60);
  }

  /** Konstante Drehung der Ansicht um die Senkrechte (rad/s), 0 = aus. Für die Bench „rotierend". */
  setAutoRotate(radPerSec: number): void {
    this.autoRotate = radPerSec;
  }

  /** Konstantes Schwenken des Fokus (Einheiten/s in der Ebene), Bench und E2E „endlos schwenken". */
  setAutoPan(x: number, z: number): void {
    this.autoPan = { x, z };
  }

  /** Fokus-Versatz (Rig-Raum ohne Drehung), an dem ein Punkt bei der Komposition `v` an der Bildstelle `ndc` erscheint. */
  private targetOffset(v: WorldView, ndc: [number, number], groundY = 0.9): { x: number; z: number } {
    const [ndcX, ndcY] = ndc;
    const cam = this.probe;
    cam.aspect = this.camera.aspect;
    cam.fov = v.fov;
    this.cameraOffset(v, cam.position).add(this.rig.position);
    cam.position.y += this.groundLift;
    cam.lookAt(this.tmp.set(v.lookSide ?? 0, this.groundLift + (v.lookHeight ?? 0), -v.look).add(this.rig.position));
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const world = this.world!;
    if (ndcX === 0 && ndcY === 0) return { x: 0, z: -v.look };
    const origin = cam.position.clone();
    const dir = this.tmp.set(ndcX, ndcY, 0.5).unproject(cam).sub(origin).normalize();
    const r = PLANET_RADIUS + groundY;
    const b = origin.dot(dir);
    const c = origin.lengthSq() - r * r;
    const disc = b * b - c;
    const t = disc >= 0 ? -b - Math.sqrt(disc) : -1;
    if (t <= 0) return { x: 0, z: -v.look };
    world.mapping.toFlatCpu(this.tmp2.copy(origin).addScaledVector(dir, t), this.tmp2);
    return { x: this.tmp2.x, z: this.tmp2.z };
  }

  /** Fokus, der den Ebenenpunkt (x, z) an die Bildstelle `ndc` der Welt-Komposition bringt (Ansicht ohne Drehung). */
  private focusFor(x: number, z: number, worldId: number, ndc: [number, number], groundY?: number): { x: number; z: number } {
    const o = this.targetOffset(this.viewFor(worldId), ndc, groundY);
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    return { x: x - (o.x * c + o.z * s), z: z - (-o.x * s + o.z * c) };
  }

  /** Welt unter einem Pfadknoten. */
  private nodeWorld(index: number): number {
    const n = this.pathLayout?.node(index);
    return n?.world ?? 0;
  }

  /** Knoten sofort ins untere Drittel. */
  snapToNode(index: number): void {
    const world = this.world;
    const layout = this.pathLayout;
    if (!world || !layout) return;
    const p = layout.node(index).position;
    const f = this.focusFor(p[0], p[2], this.nodeWorld(index), NODE_NDC);
    world.setFocus(f.x, f.z);
    this.glide = null;
    this.pinnedWorld = this.nodeWorld(index);
    this.viewInitialised = false;
    this.shadowDirty = true;
  }

  /** Weich (1 s) zum Knoten gleiten; ein Zug bricht ab. */
  turnToNode(index: number): void {
    const world = this.world;
    const layout = this.pathLayout;
    if (!world || !layout) return;
    const p = layout.node(index).position;
    const f = this.focusFor(p[0], p[2], this.nodeWorld(index), NODE_NDC);
    this.glide = { x0: world.focus.x, z0: world.focus.z, x1: f.x, z1: f.z, t: 0, duration: 1.1 };
    this.pinnedWorld = this.nodeWorld(index);
  }

  /**
   * Bildfokus einer Welt (Ebene): ihr Fokus-Element (Scheune, Wurzelbaum …) oder Bildanker im Pfadabschnitt der Welt
   * (Autorenwelten auf ihrer Route, prozedurale Welten dahinter), sonst die Mitte des Abschnitts.
   */
  /** Wirksamer Fortschritt (Regler oder die geheilte gewählte Welt); −1 = noch nicht gesetzt. */
  private effectiveProgress = -1;

  private get currentProgress(): number {
    return this.effectiveProgress >= 0 ? this.effectiveProgress : this.params.progress;
  }

  /**
   * Fortschritt, bei dem die Autorenwelt `id` ganz geheilt ist (letzter Level ihres Abschnitts geschafft, höchstens die
   * spielbaren Level der Route); angedeutete Zonen und Welten ohne Abschnitt: 0.
   */
  private healedProgress(id: number): number {
    const layout = this.world?.layout;
    if (!layout) return 0;
    for (let k = 0; k < layout.routeLength; k++) {
      const seg = layout.segment(k);
      if (seg.world === id && seg.levels > 0 && !seg.hinted) return Math.min(layout.authoredLevels, seg.firstLevel + seg.levels + 1);
    }
    return 0;
  }

  private worldFocusPoint(id: number): { x: number; z: number } | null {
    const world = this.world;
    if (!world) return null;
    // Komposition auf einem Wahrzeichen (Welt 01: der Riesenbaum, Ebene 21)
    const anchor = WORLD_CONTENTS[id]?.focal?.landmark;
    const lm = anchor ? world.getLandmarkSlot(anchor) : undefined;
    if (lm) return { x: lm.position[0], z: lm.position[2] };
    const n = AUTHORED_ROUTE.length;
    let k = AUTHORED_ROUTE.findIndex((r) => r.world === id);
    // prozedurale Pfadwelten (nur `?prozedural=1`) liegen hinter der Route
    if (k < 0 && id >= world.worlds.length && world.layout.procedural) k = n + (id - world.worlds.length);
    if (k < 0) return null;
    const slot = world.field.focalSlot(`p${k}`);
    if (slot) return { x: slot.position[0], z: slot.position[2] };
    const seg = world.layout.segment(k);
    const z = (seg.zStart + seg.zEnd) / 2;
    return { x: world.layout.backbone(z), z };
  }

  private worldFocusNdc(id: number): [number, number] {
    const f = this.world?.worldData(id).view.focus;
    return f ? [f[0], f[1]] : [0, 0];
  }

  /**
   * Fokus der Weltkomposition: mit `view.aim` liegt der Scheitel um diesen Versatz (Rig-Raum, x rechts, z zur Kamera)
   * neben dem Bildfokus — für Untersichten, deren Bildstelle kein Bodenstrahl trifft (Welt 13); sonst über `view.focus`.
   */
  private worldTarget(id: number, p: { x: number; z: number }): { x: number; z: number } {
    const aim = this.presetOf(id).aim;
    if (aim && this.params.perspective > 0.5) {
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      return { x: p.x + aim[0] * c + aim[1] * s, z: p.z - aim[0] * s + aim[1] * c };
    }
    return this.worldFocusFor(id, p);
  }

  /**
   * Blickrichtung der Komposition einer Welt (Rig um die Hochachse; Welt 12 blickt schräg auf den Steilhang). Die Sonne
   * der Komposition (`view.sun`) fährt `followWorldSun` weich an.
   */
  private applyWorldYaw(id: number): void {
    const view = this.presetOf(id);
    this.yaw = ((view.yaw ?? 0) * Math.PI) / 180;
    this.rig.quaternion.setFromAxisAngle(_Y, this.yaw);
    this.shadowDirty = true;
  }

  /** Geländehöhe am Blickpunkt, wenn der Fokus bei (fx, fz) liegt (wie `update` sie für die Kamera nachführt). */
  private liftAt(fx: number, fz: number, v: WorldView): number {
    const world = this.world!;
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    let sum = 0;
    for (const ahead of [-2, 0, 3]) {
      const oz = -(v.look + ahead);
      sum += world.heightAt(fx + oz * s, fz + oz * c);
    }
    return Math.max(0, sum / 3);
  }

  /**
   * Fokus zum Bildfokus einer Welt. Kompositionen mit `view.lookHeight` (auch 0: flache Kamera, steile Hänge) rechnen
   * die Geländehöhe am Blickpunkt (wie sie die Kamera nachführt) und die Höhe des Fokus-Elements vorab ein (zwei
   * Durchgänge) — sonst verschöbe das Nachführen der Höhe das Bild, das Fokus-Element landete nicht an seiner
   * Bildstelle (Welt 04: der Kuppelbaum auf dem Hang statt auf dem Kamm). Ohne `lookHeight` in der Weltdatei wie bisher.
   */
  private worldFocusFor(id: number, p: { x: number; z: number }): { x: number; z: number } {
    const ndc = this.worldFocusNdc(id);
    let f = this.focusFor(p.x, p.z, id, ndc);
    const v = this.viewFor(id);
    if (this.presetOf(id).lookHeight !== undefined && this.world) {
      const groundY = this.world.heightAt(p.x, p.z) + 0.3;
      for (let i = 0; i < 2; i++) {
        this.groundLift = this.liftAt(f.x, f.z, v);
        f = this.focusFor(p.x, p.z, id, ndc, groundY);
      }
    }
    return f;
  }

  /** Sofort zum Bildfokus von Welt `id`. */
  snapToWorld(id: number): void {
    const world = this.world;
    const p = this.worldFocusPoint(id);
    if (!world || !p) return;
    this.applyWorldYaw(id);
    const f = this.worldTarget(id, p);
    world.setFocus(f.x, f.z);
    this.glide = null;
    this.pinnedWorld = id;
    this.viewInitialised = false;
    this.shadowDirty = true;
  }

  /** Weich zum Bildfokus von Welt `id` gleiten (Dauer nach Weglänge, 1.2–3 s). */
  turnToWorld(id: number): void {
    const world = this.world;
    const p = this.worldFocusPoint(id);
    if (!world || !p) return;
    this.applyWorldYaw(id);
    const f = this.worldTarget(id, p);
    const dist = Math.hypot(f.x - world.focus.x, f.z - world.focus.z);
    // Weite Wege springen vorab bis kurz davor (die Welt dazwischen streamt sonst in Sekunden durch)
    if (dist > 120) {
      const k = (dist - 60) / dist;
      world.setFocus(world.focus.x + (f.x - world.focus.x) * k, world.focus.z + (f.z - world.focus.z) * k);
    }
    const d2 = Math.hypot(f.x - world.focus.x, f.z - world.focus.z);
    this.glide = { x0: world.focus.x, z0: world.focus.z, x1: f.x, z1: f.z, t: 0, duration: Math.min(3, Math.max(1.2, d2 / 40)) };
    this.pinnedWorld = id;
  }

  resize(ctx: SceneContext): void {
    this.applyDpr();
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    const world = this.world;
    if (!world) return;
    this.elapsed += dt;
    if (this.panBall.step(dt)) this.shadowDirty = true;
    if (this.panBall.isDragging) {
      this.glide = null;
      this.pinnedWorld = -1;
    }
    if (this.glide) {
      const g = this.glide;
      g.t = Math.min(1, g.t + dt / g.duration);
      const e = g.t * g.t * (3 - 2 * g.t);
      world.setFocus(g.x0 + (g.x1 - g.x0) * e, g.z0 + (g.z1 - g.z0) * e);
      this.shadowDirty = true;
      if (g.t >= 1) this.glide = null;
    }
    if (this.autoPan.x !== 0 || this.autoPan.z !== 0) {
      world.setFocus(world.focus.x + this.autoPan.x * dt, world.focus.z + this.autoPan.z * dt);
      this.pinnedWorld = -1;
      this.shadowDirty = true;
    }
    if (this.autoRotate !== 0 && dt > 0) {
      this.yaw += this.autoRotate * dt;
      this.rig.quaternion.setFromAxisAngle(_Y, this.yaw);
      this.shadowDirty = true;
    }

    // Komposition: Ziel = Preset der Welt unter dem Blickpunkt, weich nachgeführt (τ ≈ 0.5 s)
    const target = this.viewFor(world.viewWorld);
    const k = this.viewInitialised ? 1 - Math.exp(-dt / 0.5) : 1;
    this.viewInitialised = true;
    const v = this.view;
    v.height += (target.height - v.height) * k;
    v.forward += (target.forward - v.forward) * k;
    v.look += (target.look - v.look) * k;
    v.fov += (target.fov - v.fov) * k;
    v.curvature += (target.curvature - v.curvature) * k;
    v.lookHeight = (v.lookHeight ?? 0) + ((target.lookHeight ?? 0) - (v.lookHeight ?? 0)) * k;
    v.lookSide = (v.lookSide ?? 0) + ((target.lookSide ?? 0) - (v.lookSide ?? 0)) * k;
    this.followWorldSun(this.presetOf(world.viewWorld), k);
    world.curvature.value = v.curvature;
    const viewData = this.presetOf(world.viewWorld);
    // Freiraum vor der Linse: Vegetation, die näher kommt, schrumpft weg (nichts schneidet ins Bild)
    const nearTarget = this.params.rail >= 0 ? 1.0 : (viewData.nearClear ?? 1.2) * Math.min(1, this.params.perspective);
    this.nearClear += (Math.max(0.25, nearTarget) - this.nearClear) * k;
    world.vegetation.setNearClear(this.nearClear);
    // Lichtung unter der Kamera: ruhiges unteres Bildband (Schatten fallen hinein); Schattenpass mitziehen
    const footTarget = this.params.rail >= 0 ? 0 : (viewData.footClear ?? 0) * Math.min(1, this.params.perspective);
    const footNext = this.footClear + (footTarget - this.footClear) * k;
    if (Math.abs(footNext - this.footClear) > 0.02) this.shadowDirty = true;
    this.footClear = Math.abs(footNext - footTarget) < 0.02 ? footTarget : footNext;
    world.vegetation.setFootClear(this.footClear);
    // Schleier über Nachbarwelten (Übersicht ohne Schleier, Weltblick mit): fremde Welten = ferne Nebelstufen
    world.veilDistance.value = VEIL_DISTANCE * Math.min(1, this.params.perspective);
    if (Math.abs(v.curvature - this.lastCurvature) > 1e-3) {
      this.lastCurvature = v.curvature;
      this.shadowDirty = true;
    }
    this.applyView();
    this.applyRail();
    // Nebel mit der Kameradistanz nach hinten schieben (Hügelblick: Wertstufen im Mittel-/Hintergrund)
    world.setFogDistance(this.params.rail >= 0 ? 9 : this.camera.position.distanceTo(this.tmp.set(0, 0, -v.look)));
    this.fogStripes?.layout(Math.max(0.6, v.look / 6), v.curvature);
    // Vordergrund-Ornament der Welt (Ast oben links) nur in der Komposition, weich mit der Weltwahl
    if (this.branch) {
      const want = viewData.ornament === 'branch' && this.params.rail < 0 ? Math.max(0, Math.min(1, (this.params.perspective - 0.6) / 0.4)) : 0;
      this.branchFade += (want - this.branchFade) * k;
      this.branch.setOpacity(this.branchFade);
      if (this.branchFade > 0.001) this.branch.layout(this.camera);
    }

    this.scene.updateMatrixWorld(true);
    // Kompositionshöhe: Gelände am Blickpunkt (Mittel aus Blickpunkt und zwei Nachbarproben längs der Blickachse)
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    if (this.params.rail < 0) {
      let sum = 0;
      for (const ahead of [-2, 0, 3]) {
        const oz = -(v.look + ahead);
        sum += world.heightAt(world.focus.x + oz * s, world.focus.z + oz * c);
      }
      const targetLift = Math.max(0, sum / 3);
      const kg = this.viewInitialised ? 1 - Math.exp(-dt / 0.6) : 1;
      const prev = this.groundLift;
      this.groundLift += (targetLift - this.groundLift) * kg;
      if (Math.abs(this.groundLift - prev) > 1e-3) this.applyView();
    }
    // Geländefreiheit: Kamera über dem Gelände unter ihr halten (hohe Grate der Schneewelt, steile Hänge)
    const camWorld = this.camera.getWorldPosition(this.tmp);
    const camPlane = world.fromDisplay(camWorld, this.tmp2);
    const ground = world.walkableHeight(camPlane.x, camPlane.z);
    const need = Math.max(0, ground + CLEARANCE - (camPlane.y - this.lift));
    const kl = 1 - Math.exp(-dt / 0.25);
    const liftPrev = this.lift;
    this.lift += (need - this.lift) * kl;
    if (Math.abs(this.lift - liftPrev) > 1e-4 && this.params.rail < 0) {
      this.applyView();
      this.scene.updateMatrixWorld(true);
      this.camera.getWorldPosition(camWorld);
    }

    this.sun.directionWorld(this.sunDirWorld.value);
    world.setSunDirection(this.sunDirWorld.value);

    const camR = camWorld.length();
    this.skyHorizon.value = horizonSin(PLANET_RADIUS, v.curvature, camR);
    this.tmpM.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.tmpM, this.camera.coordinateSystem);
    if (world.update(this.camera, camWorld, this.frustum)) this.shadowDirty = true;

    // Welt unter dem Blickpunkt → Himmel/Nebel/Streifen
    const look = new Vector3(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new Quaternion()));
    const b = camWorld.dot(look);
    const cc = camWorld.lengthSq() - (PLANET_RADIUS + 0.5) ** 2;
    const disc = b * b - cc;
    const t = disc >= 0 ? -b - Math.sqrt(disc) : -1;
    if (this.pinnedWorld >= 0) world.setViewWorld(this.pinnedWorld);
    else if (t > 0) {
      const hit = world.fromDisplay(camWorld.clone().addScaledVector(look, t), new Vector3());
      world.setViewPoint(hit.x, hit.z);
    } else world.setViewPoint(world.focus.x - v.look * s, world.focus.z - v.look * c);
    // Überblendung: fremde Instanzen nahe der Kamera treten weg/zurück → Schattenpass mitziehen
    if (world.viewBlending) this.shadowDirty = true;
    world.tickView(dt);
    if (this.clouds) followViewClouds(this.clouds, world, this.camera.position, this.skyHorizon.value);
    if (this.trash) {
      this.trash.setNearClear(this.nearClear);
      this.trash.setFootClear(this.footClear);
      if (this.trash.update(this.camera, camWorld, this.frustum, dt)) this.shadowDirty = true;
    }
    const site = this.treeSite;
    if (site) {
      const wasVisible = site.holder.visible;
      site.update(dt, this.camera, this.sunDirWorld.value, camWorld, this.frustum);
      if (site.holder.visible !== wasVisible) this.shadowDirty = true;
    }
    this.nodePath?.update(this.elapsed, this.sunDirWorld.value);
    if (world.viewWorld !== this.lastViewWorld) {
      this.lastViewWorld = world.viewWorld;
      for (const l of this.worldListeners) l(this.lastViewWorld);
    }

    if (this.shadowDirty) {
      const hTotal = Math.max(world.hTotal, site?.holder.visible ? site.height + 1 : 0, world.terrainTop + (this.trash?.hMax ?? 0) + 1);
      this.sun.setCasterHeight(hTotal);
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
    ctx.renderer.render(this.scene, this.camera);
  }

  // --- Messwerte ----------------------------------------------------------------------------------

  getStats(): {
    drawCalls: number;
    shadowPasses: number;
    chunks: number;
    trees: number;
    dots: number;
    props: number;
    preset: ResolvedQuality;
    dpr: number;
    zone: string;
    world: string;
    worldIndex: number;
    view: WorldView;
    focus: { x: number; z: number };
    streaming: { wanted: number; loaded: number; builtThisFrame: number; buildMs: number; visible: number };
    caches: { chunks: number; cpu: number; regions: number; slots: number };
  } {
    const info = this.ctx?.renderer.info as { render?: { drawCalls?: number } } | undefined;
    const world = this.world;
    let trees = 0;
    let props = 0;
    if (world) {
      for (const mesh of Object.values(world.vegetation.canopies)) trees += mesh?.count ?? 0;
      trees += world.vegetation.bare.count;
      props = world.vegetation.props.count + world.vegetation.pools.count;
    }
    const wi = world?.viewWorld ?? 0;
    const label = this.worldLabel(wi);
    // Knoten am Blickpunkt (W3: z ist längs des Pfads nicht monoton — nach Lage, nicht nach z)
    const node = world ? world.path.nearestNode(world.focus.x, world.focus.z) : 0;
    return {
      drawCalls: info?.render?.drawCalls ?? 0,
      shadowPasses: this.shadowPasses,
      chunks: world?.loadedCount ?? 0,
      trees,
      dots: (world?.vegetation.dots.geometry as { instanceCount?: number } | undefined)?.instanceCount ?? 0,
      props,
      preset: this.preset.name,
      dpr: this.ctx?.renderer.getPixelRatio() ?? 0,
      zone: node < PLAYABLE_COUNT ? (zoneOfLevel(node + 1)?.name ?? '') : 'bald',
      world: `${label.ref} ${label.name}`,
      worldIndex: wi,
      view: { ...this.view },
      focus: world ? { x: world.focus.x, z: world.focus.z } : { x: 0, z: 0 },
      streaming: world ? { ...world.stats } : { wanted: 0, loaded: 0, builtThisFrame: 0, buildMs: 0, visible: 0 },
      caches: world ? world.cacheSizes : { chunks: 0, cpu: 0, regions: 0, slots: 0 },
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
    this.panBall.detach();
    this.nodePath?.dispose();
    this.treeSite?.dispose();
    this.trash?.dispose();
    this.world?.dispose();
    this.fogStripes?.dispose();
    this.clouds?.dispose();
    this.branch?.dispose();
    for (const d of this.disposables) d.dispose();
    this.sun.dispose();
    if (this.ctx) {
      this.ctx.renderer.shadowMap.enabled = false;
      this.ctx.renderer.setPixelRatio(this.ctx.dpr);
    }
    this.listeners.clear();
    this.worldListeners.clear();
    this.scene.clear();
    this.world = null;
    this.ctx = null;
  }
}
