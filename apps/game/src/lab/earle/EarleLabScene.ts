import { Color, Frustum, Group, Matrix4, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { EarlePlanet, FogStripes, SunRig, createSkyDome, skySunIndices, type WorldView } from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { Trackball } from './trackball';
import { resolveQuality, type QualityLevel, type QualityPreset, type ResolvedQuality } from './quality';
import { CHUNKS_PER_FACE, HERO_TREE_WORLD, NODES_PER_ZONE, PLANET_RADIUS, WORLD_CONTENTS, ZONE_CONTENTS, nearWorldOfZone, planetLandmarks, planetWorlds, planetZones } from './zones';
import { createHeroTreeSite, type HeroTreeSite } from './heroTreeSite';
import { createPlanetTrash } from './trash';
import type { TrashField } from '@ee/render/earle/trash/index.ts';
import { NodePath, type BentLayout } from '../../flow/NodePath';

export interface EarleLabParams {
  /** Fortschritt: Anzahl geschaffter Knoten (0..100) → Wachstum je Chunk entlang des Pfads (Müll versinkt). */
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
  /** Gewählte Welt 0..9 (Referenz 01..10): dreht den Planeten zu ihrem Mittelpunkt. -1 = keine Wahl. */
  world: number;
  /** Perspektive: 0 = alte Übersicht, 1 = Earle-Komposition der Welt (Kamera tief, FOV weit, Krümmung), bis 1.4 übertrieben. */
  perspective: number;
  /** Müll-Dichte der Startwelt in Prozent (0–200). */
  trash: number;
  /** Levelpfad (Steine, Punkte, Ring) einblenden — inkl. des Abschnitts über den Riesenbaum. */
  path: boolean;
  /** Kamera auf der Baum-Schiene bei Knoten `rail` (0-basiert, 79–94); −1 = aus. */
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
  cracksClosed: [false, false, false],
  seed: 7,
  world: -1,
  perspective: 1,
  trash: 100,
  path: false,
  rail: -1,
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

export { PLANET_RADIUS };

/** Alte Übersicht (P2b): Kamera 9 hoch, 8 zurück, Blick 4 voraus, FOV 70, keine Zusatzkrümmung. */
/** Schleier über Nachbarwelten im Weltblick (Zusatz-Nebeldistanz, Welteinheiten). */
const VEIL_DISTANCE = 24;
const OVERVIEW: WorldView = { height: 9, forward: 8, look: 4, fov: 70, curvature: 0 };
/** Bildposition des Fokus: Knoten auf der unteren Drittellinie; Welten nach ihrer Komposition (view.focus). */
const NODE_NDC: [number, number] = [0, -0.3];
/** Mindestabstand der Kamera über dem Gelände. */
const CLEARANCE = 1.3;
const _Y = new Vector3(0, 1, 0);

/**
 * P2c Earle-Lab: zehn Welten auf dem Planeten (je eine Earle-Serigrafie, Weltwähler dreht dorthin), Perspektive je
 * Welt (Kamerahöhe, Blickpunkt, FOV 80–90°, Krümmungs-Boost der fernen Erde) mit dem Regler "Perspektive"
 * zwischen alter Übersicht und Earle-Komposition, Müll der Startwelt (Dichte-Regler, versinkt mit dem Wachstum),
 * Cube-Sphere-Chunks, Risse, Spiralpfad, Sonnen-Rig mit nachgeschärften Schatten (Pass nur bei Änderung).
 */
export class EarleLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(70, 1, 0.3, 700);
  private readonly probe = new PerspectiveCamera(70, 1, 0.3, 700);
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
  private treeSite: HeroTreeSite | null = null;
  /** Müll v2 und Neon-Schleier (heilt mit dem Fortschritt; ein Schritt am Regler spielt die Feier). */
  private trash: TrashField | null = null;
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
  private readonly tmpQ = new Quaternion();
  private readonly tmpM = new Matrix4();
  private readonly sunLocal = new Vector3();
  private readonly targetDir = new Vector3(0, 1, 0);
  /** Aktuelle (geglättete) Kamera-Komposition. */
  private readonly view: WorldView = { ...OVERVIEW };
  private viewInitialised = false;
  private lift = 0;
  /**
   * Geländehöhe am Blickpunkt (Welteinheiten über dem Grundradius, geglättet): Kamera und Blickziel stehen relativ zum
   * Gelände, das man ansieht — in steilen Welten (Violette Hänge, Schneekiefern) klebt der Hügelblick sonst am Hang.
   */
  private groundLift = 0;
  private shadowDirty = true;
  private zoom = 1;
  private autoRotate = 0;
  private autoTurn: { q0: Quaternion; q1: Quaternion; t: number } | null = null;
  private lastViewWorld = -1;
  private lastCurvature = -1;
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
    // Schatten v2: Kaskaden an der Planetensicht (Empfänger = Planetenschale inkl. Krümmungs-Warp; Welt als Getter)
    this.sun.fitToPlanet(this.camera, () => this.world, this.planet);
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
    this.sun.root.position.set(0, 0, -4);
    this.rig.add(this.sun.root);
    this.trackball.attach(ctx.canvas);
    this.buildWorld();
    this.applyParams(this.params, true);
    this.resize(ctx);
    if (this.params.world >= 0) this.snapToWorld(this.params.world);
    else this.snapToNode(Math.max(0, Math.min(this.params.progress, NODES_PER_ZONE * ZONE_CONTENTS.length - 1)));
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
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    const p = this.preset;
    const landmarks = planetLandmarks();
    const world = new EarlePlanet({
      radius: PLANET_RADIUS,
      seed: this.params.seed,
      chunksPerFace: CHUNKS_PER_FACE,
      zones: planetZones(),
      worlds: planetWorlds(),
      landmarks,
      trashScale: this.params.trash / 100,
      quality: {
        chunkRes: Math.max(12, Math.round(p.terrainRes / 3)),
        dotsPerTree: p.dotsPerTree,
        collapsePx: p.collapsePx,
        densityScale: (p.treeCount / 260) * (this.params.density / 100),
        nearChunks: p.name === 'mobil' ? 3 : 5,
        capacity: p.name === 'mobil' ? { trees: 1400, dots: 14000, props: 300, animals: 160 } : { trees: 2600, dots: 45000, props: 400, animals: 220 },
      },
      path: { nodesPerZone: NODES_PER_ZONE, turns: 2.75, clearNode: 2.0, clearPath: 0.8 },
      loadsPerFrame: 2,
      // Schattentönung je Welt (blaue Schatten auf Schnee …) aus den Weltdateien
      shadowTint: this.sun.shadowTint,
    });
    this.world = world;
    this.planet.add(world.group);
    // Riesenbaum (Welt 01) mit dem Levelabschnitt 80–95 über Stamm und Krone
    this.treeSite = createHeroTreeSite(world, { worldIndex: HERO_TREE_WORLD, quality: p.name, seed: this.params.seed, landmarks });
    this.trash = createPlanetTrash(world, { quality: p.name, seed: this.params.seed, densityScale: this.params.trash / 100 });
    this.trash.setProgress(this.params.progress, false);
    this.planet.add(this.trash.group);
    this.buildNodePath();
    world.terrainBands.value = this.params.bands;
    world.fog.steps.value = this.params.fogSteps;

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
    this.lastCurvature = -1;
    this.shadowDirty = true;
  }

  /** Levelpfad (NodePath des Flows) mit Krümmung; nur wenn eingeschaltet. */
  private buildNodePath(): void {
    this.nodePath?.dispose();
    this.nodePath = null;
    const world = this.world;
    const site = this.treeSite;
    if (!world || !site || !this.params.path) return;
    const path = site.levelPath;
    const layout: BentLayout = {
      nodes: path.nodes.map((n) => ({ index: n.index, u: n.lon / 180, v: n.lat / 90, position: n.position, normal: n.normal })),
      dots: path.dots.map((d) => ({ position: d.position, normal: d.normal })),
      length: path.length,
      bend: (q) => world.bendNode(q),
    };
    this.scene.updateMatrixWorld(true);
    const sunLocal = this.sun.directionWorld(new Vector3()).applyQuaternion(this.planet.quaternion.clone().invert());
    this.nodePath = new NodePath(layout, sunLocal);
    const current = Math.max(0, Math.min(this.params.progress, layout.nodes.length - 1));
    this.nodePath.setProgress(current, this.params.progress);
    this.planet.add(this.nodePath.group);
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

  /** Meldet die Welt unter dem Blickpunkt (0..9), sobald sie wechselt. */
  onViewWorld(listener: (world: number) => void): () => void {
    this.worldListeners.add(listener);
    if (this.lastViewWorld >= 0) listener(this.lastViewWorld);
    return () => this.worldListeners.delete(listener);
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
      const world = this.world!;
      world.terrainBands.value = Math.max(2, Math.min(5, Math.round(next.bands)));
      world.fog.steps.value = Math.max(2, Math.min(6, Math.round(next.fogSteps)));
      next.cracksClosed.forEach((closed, i) => world.setCrackClosed(i, closed));
      if (!force && next.trash !== prev.trash) {
        world.setTrashScale(Math.max(0, next.trash) / 100);
        this.trash?.setDensity(Math.max(0, next.trash) / 100);
        this.shadowDirty = true;
      }
      if (force || next.progress !== prev.progress) {
        world.setProgress(next.progress);
        this.treeSite?.setProgress(next.progress);
        this.trash?.setProgress(next.progress, !force);
        this.nodePath?.setProgress(Math.max(0, Math.min(next.progress, world.path.nodes.length - 1)), next.progress);
        this.shadowDirty = true;
        if (!force) this.turnToNode(Math.max(0, Math.min(next.progress, world.path.nodes.length - 1)));
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

  /** Kamera-Komposition einer Welt bei Perspektive p (0 = Übersicht, 1 = Weltpreset, >1 übertrieben). */
  private viewFor(worldIndex: number, out: WorldView = { ...OVERVIEW }): WorldView {
    const preset = this.world?.worlds[worldIndex]?.view ?? OVERVIEW;
    const p = Math.max(0, Math.min(1.4, this.params.perspective));
    const t = Math.min(1, p);
    out.height = OVERVIEW.height + (preset.height - OVERVIEW.height) * t;
    out.forward = OVERVIEW.forward + (preset.forward - OVERVIEW.forward) * t;
    out.look = OVERVIEW.look + (preset.look - OVERVIEW.look) * t;
    out.fov = OVERVIEW.fov + (preset.fov - OVERVIEW.fov) * t;
    out.curvature = OVERVIEW.curvature + (preset.curvature - OVERVIEW.curvature) * t;
    if (p > 1) {
      const e = (p - 1) / 0.4; // 0..1 Übertreibung
      out.curvature *= 1 + 1.5 * e;
      out.fov = Math.min(100, out.fov + 8 * e);
      out.height *= 1 - 0.25 * e;
    }
    return out;
  }

  private cameraOffset(v: WorldView, out: Vector3): Vector3 {
    return out.set(0, v.height, v.forward).multiplyScalar(this.zoom);
  }

  private applyView(): void {
    const v = this.view;
    this.cameraOffset(v, this.camera.position);
    this.camera.position.y += this.lift + this.groundLift;
    this.camera.lookAt(this.tmp.set(0, this.groundLift, -v.look).add(this.rig.position));
    if (Math.abs(this.camera.fov - v.fov) > 1e-3) {
      this.camera.fov = v.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Kameraschiene des Baumabschnitts (Vorschau für den Flow): Kamera auf der Schiene bei Knoten `params.rail`,
   * Blick zum Schienen-Blickpunkt; Schiene im Planetenraum → Welt → Rig-Raum.
   */
  private applyRail(): void {
    const site = this.treeSite;
    const index = this.params.rail;
    if (!site || index < 0) return;
    const pos = new Vector3();
    const look = new Vector3();
    if (!site.railFor(index, pos, look)) return;
    this.scene.updateMatrixWorld(true);
    this.planet.localToWorld(pos);
    this.planet.localToWorld(look);
    // Kamera hängt am Rig (Scheitel): Weltposition in Rig-Raum, Blick mit Oben = radial am Kameraort
    this.rig.worldToLocal(pos);
    this.camera.position.copy(pos);
    this.camera.up.copy(pos.clone().add(this.rig.position).normalize());
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

  /** Programmatisches Ziehen (Tests): Pixel-Delta wie eine Zeigerbewegung. */
  rotateBy(dxPx: number, dyPx: number): void {
    this.trackball.drag(dxPx, dyPx, 1 / 60);
    this.pinnedWorld = -1;
    this.planet.quaternion.copy(this.trackball.quaternion);
    this.shadowDirty = true;
  }

  /** Konstante Drehung um die Hochachse (rad/s), 0 = aus. Für die Bench "rotierend". */
  setAutoRotate(radPerSec: number): void {
    this.autoRotate = radPerSec;
  }

  /** Weltrichtung (vom Planetenmittelpunkt), die bei der Komposition `v` an der Bildstelle `ndc` erscheint. */
  private computeTargetDir(v: WorldView, ndc: [number, number]): void {
    const [ndcX, ndcY] = ndc;
    const cam = this.probe;
    cam.aspect = this.camera.aspect;
    cam.fov = v.fov;
    this.cameraOffset(v, cam.position).add(this.rig.position);
    cam.position.y += this.groundLift;
    cam.lookAt(this.tmp.set(0, this.groundLift, -v.look).add(this.rig.position));
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    // Blickpunkt am Boden (auch für flache Blicke, deren Mittelstrahl über den Horizont geht)
    const lookDir = new Vector3(0, 0, -v.look).add(this.rig.position).normalize();
    if (ndcY === 0 && ndcX === 0) {
      this.targetDir.copy(lookDir);
      return;
    }
    const origin = cam.position.clone();
    const dir = this.tmp.set(ndcX, ndcY, 0.5).unproject(cam).sub(origin).normalize();
    const r = PLANET_RADIUS + 0.9;
    const b = origin.dot(dir);
    const c = origin.lengthSq() - r * r;
    const disc = b * b - c;
    const t = disc >= 0 ? -b - Math.sqrt(disc) : -1;
    if (t <= 0) {
      this.targetDir.copy(lookDir);
      return;
    }
    this.targetDir.copy(origin).addScaledVector(dir, t).normalize();
  }

  /** Welt unter einem Pfadknoten (Wooding: 01 in der ersten, 03 in der zweiten Hälfte). */
  private nodeWorld(index: number): number {
    const node = this.world?.path.nodes[index];
    if (!this.world || !node) return nearWorldOfZone(0);
    return this.world.worldAt(new Vector3(node.position[0], node.position[1], node.position[2]));
  }

  private nodeDirWorld(index: number, out: Vector3): Vector3 | null {
    const node = this.world?.path.nodes[index];
    if (!node) return null;
    return out.set(node.position[0], node.position[1], node.position[2]).applyQuaternion(this.planet.quaternion).normalize();
  }

  /**
   * Drehung, die `focusWorld` an die Zielstelle bringt, plus Kurs: Planeten-Ost am Fokus zeigt in die Bildtiefe. Die
   * Welten sind Spiralbänder (Ost–West), der Blick läuft also längs der Welt und des Pfads zum Horizont; die
   * Nachbarwelten liegen links und rechts.
   */
  private focusRotation(focusWorld: Vector3, worldIndex: number, ndc: [number, number]): Quaternion {
    this.computeTargetDir(this.viewFor(worldIndex), ndc);
    const delta = new Quaternion().setFromUnitVectors(focusWorld, this.targetDir);
    const focusLocal = focusWorld.clone().applyQuaternion(this.planet.quaternion.clone().invert());
    const heading = this.bestHeading(focusLocal, worldIndex);
    if (!heading) return delta;
    heading.applyQuaternion(this.planet.quaternion).applyQuaternion(delta);
    const n = this.targetDir;
    const a = heading.addScaledVector(n, -heading.dot(n)).normalize();
    const forward = new Vector3(0, 0, -1);
    const b = forward.addScaledVector(n, -forward.dot(n)).normalize();
    const angle = Math.atan2(n.dot(new Vector3().crossVectors(a, b)), a.dot(b));
    return new Quaternion().setFromAxisAngle(n, angle).multiply(delta);
  }

  /**
   * Blickrichtung (Tangente am Fokus, Planetenraum), in der das Bild in der eigenen Welt bleibt: Kandidaten alle 10°,
   * Proben entlang der Blickachse (3–15 Einheiten) und seitlich (Bildbreite); die Richtung mit den meisten Proben in
   * der Welt gewinnt (bei Gleichstand: Osten, längs des Weltbands). Nachbarwelten rücken so an den Rand oder hinter
   * den Horizont.
   */
  private bestHeading(focusLocal: Vector3, worldIndex: number): Vector3 | null {
    const world = this.world;
    const up = focusLocal.clone().normalize();
    const east = new Vector3(-up.z, 0, up.x);
    if (east.lengthSq() < 1e-6) return null;
    east.normalize();
    const north = new Vector3().crossVectors(up, east).normalize();
    if (!world) return east;
    const R = PLANET_RADIUS;
    const probe = new Vector3();
    const inWorld = (dir: Vector3, dist: number): number => {
      const ang = dist / R;
      probe.copy(up).multiplyScalar(Math.cos(ang)).addScaledVector(dir, Math.sin(ang));
      return world.worldAt(probe) === worldIndex ? 1 : 0;
    };
    let best = east.clone();
    let bestScore = -1;
    for (let deg = 0; deg < 360; deg += 10) {
      const a = (deg * Math.PI) / 180;
      const fwd = east.clone().multiplyScalar(Math.cos(a)).addScaledVector(north, Math.sin(a));
      const side = new Vector3().crossVectors(up, fwd).normalize();
      let score = 0;
      for (const d of [3, 6, 9, 12, 15]) score += inWorld(fwd, d);
      for (const [f, l] of [[8, 6], [8, -6], [14, 10], [14, -10]] as const) {
        const dir = fwd.clone().multiplyScalar(f).addScaledVector(side, l);
        score += 0.6 * inWorld(dir.normalize(), Math.hypot(f, l));
      }
      score -= 0.002 * Math.min(deg, 360 - deg); // Gleichstand → Osten
      if (score > bestScore) {
        bestScore = score;
        best = fwd;
      }
    }
    return best;
  }

  /** Planet sofort so drehen, dass Knoten `index` im unteren Drittel liegt. */
  snapToNode(index: number): void {
    const world = this.world;
    const d = this.nodeDirWorld(index, this.tmp2);
    if (!world || !d) return;
    this.planet.quaternion.premultiply(this.focusRotation(d, this.nodeWorld(index), NODE_NDC));
    this.trackball.quaternion.copy(this.planet.quaternion);
    this.pinnedWorld = this.nodeWorld(index);
    this.viewInitialised = false;
    this.shadowDirty = true;
  }

  /** Weich (Slerp, 1 s) zum Knoten drehen; ein Zug bricht ab. */
  turnToNode(index: number): void {
    const world = this.world;
    const d = this.nodeDirWorld(index, this.tmp2);
    if (!world || !d) return;
    const delta = this.focusRotation(d, this.nodeWorld(index), NODE_NDC);
    this.autoTurn = { q0: this.planet.quaternion.clone(), q1: delta.multiply(this.planet.quaternion.clone()), t: 0 };
    this.pinnedWorld = this.nodeWorld(index);
  }

  /**
   * Fokus einer Welt (Planetenraum → Welt): ihr Fokus-Element (Scheune, Wurzelbaum, Riesenbaum …), sonst die Mitte
   * ihres Bands (nahe Welten 25° neben dem Pfad, der Korridor ist frei geräumt).
   */
  private worldDirWorld(index: number, out: Vector3): Vector3 | null {
    const world = this.world;
    if (!world || index < 0 || index >= world.worlds.length) return null;
    const ref = WORLD_CONTENTS[index]?.ref;
    // Fokus-Slot der Welt (Element oder Bildanker). Welt 01: Anker an der breitesten Stelle des schmalen Bands, der
    // Riesenbaum steht am Horizont (aus der Nähe zeigt ihn die Kameraschiene, `?rail=80..95`)
    const slot = ref ? world.getLandmarkSlot(`focal-${ref}`) : undefined;
    if (slot) out.set(slot.dir[0], slot.dir[1], slot.dir[2]);
    else {
      world.worldCenter(index, out);
      if (world.worlds[index]!.params.side === 'near') out.applyAxisAngle(_Y, (-25 * Math.PI) / 180);
    }
    return out.applyQuaternion(this.planet.quaternion).normalize();
  }

  private worldFocusNdc(index: number): [number, number] {
    const f = this.world?.worlds[index]?.view.focus;
    return f ? [f[0], f[1]] : [0, 0];
  }

  /** Planet sofort zur Mitte von Welt `index` drehen. */
  snapToWorld(index: number): void {
    const d = this.worldDirWorld(index, this.tmp2);
    if (!d) return;
    this.planet.quaternion.premultiply(this.focusRotation(d, index, this.worldFocusNdc(index)));
    this.trackball.quaternion.copy(this.planet.quaternion);
    this.pinnedWorld = index;
    this.viewInitialised = false;
    this.shadowDirty = true;
  }

  /** Weich (1.2 s) zur Mitte von Welt `index` drehen. */
  turnToWorld(index: number): void {
    const d = this.worldDirWorld(index, this.tmp2);
    if (!d) return;
    const delta = this.focusRotation(d, index, this.worldFocusNdc(index));
    this.autoTurn = { q0: this.planet.quaternion.clone(), q1: delta.multiply(this.planet.quaternion.clone()), t: 0 };
    this.pinnedWorld = index;
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
    let rotated = this.trackball.step(dt);
    if (this.trackball.isDragging) {
      this.autoTurn = null;
      this.pinnedWorld = -1;
    }
    if (this.autoTurn) {
      this.autoTurn.t = Math.min(1, this.autoTurn.t + dt / 1.1);
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
    world.curvature.value = v.curvature;
    // Freiraum vor der Linse: Vegetation, die näher kommt, schrumpft weg (nichts schneidet ins Bild)
    const nearTarget = this.params.rail >= 0 ? 1.0 : (world.worlds[world.viewWorld]?.view.nearClear ?? 1.2) * Math.min(1, this.params.perspective);
    this.nearClear += (Math.max(0.25, nearTarget) - this.nearClear) * k;
    world.vegetation.setNearClear(this.nearClear);
    // Lichtung unter der Kamera: ruhiges unteres Bildband (Schatten fallen hinein); Schattenpass mitziehen
    const footTarget = this.params.rail >= 0 ? 0 : (world.worlds[world.viewWorld]?.view.footClear ?? 0) * Math.min(1, this.params.perspective);
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

    this.scene.updateMatrixWorld(true);
    // Kompositionshöhe: Gelände am Blickpunkt (Mittel aus Blickpunkt und zwei Nachbarproben längs der Blickachse)
    if (this.params.rail < 0) {
      const inv = this.planet.getWorldQuaternion(this.tmpQ).invert();
      let sum = 0;
      for (const ahead of [-2, 0, 3]) {
        const probe = this.tmp2.set(0, 0, -(v.look + ahead)).add(this.rig.position).normalize().applyQuaternion(inv);
        sum += world.surfaceRadius(probe) - PLANET_RADIUS;
      }
      const target = Math.max(0, sum / 3);
      const kg = this.viewInitialised ? 1 - Math.exp(-dt / 0.6) : 1;
      const prev = this.groundLift;
      this.groundLift += (target - this.groundLift) * kg;
      if (Math.abs(this.groundLift - prev) > 1e-3) this.applyView();
    }
    // Geländefreiheit: Kamera über dem Gelände unter ihr halten (hohe Grate der Schneewelt, steile Hänge)
    const camWorld = this.camera.getWorldPosition(this.tmp);
    this.planet.getWorldQuaternion(this.tmpQ).invert();
    const camLocalDir = this.tmp2.copy(camWorld).applyQuaternion(this.tmpQ).normalize();
    const ground = world.surfaceRadius(camLocalDir);
    const need = Math.max(0, ground + CLEARANCE - (camWorld.length() - this.lift));
    const kl = 1 - Math.exp(-dt / 0.25);
    const liftPrev = this.lift;
    this.lift += (need - this.lift) * kl;
    if (Math.abs(this.lift - liftPrev) > 1e-4 && this.params.rail < 0) {
      this.applyView();
      this.scene.updateMatrixWorld(true);
      this.camera.getWorldPosition(camWorld);
    }

    this.sun.directionWorld(this.sunDirWorld.value);
    this.sunLocal.copy(this.sunDirWorld.value).applyQuaternion(this.tmpQ);
    world.vegetation.setSunDirection(this.sunDirWorld.value, this.sunLocal);

    const camR = camWorld.length();
    this.skyHorizon.value = -Math.sin(Math.acos(Math.min(1, PLANET_RADIUS / Math.max(PLANET_RADIUS + 0.01, camR))));
    this.tmpM.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.tmpM, this.camera.coordinateSystem);
    if (world.update(this.camera, camWorld, this.planet.matrixWorld, this.frustum)) this.shadowDirty = true;

    // Welt unter dem Blickpunkt → Himmel/Nebel/Streifen und Zentrum des Krümmungs-Warps
    const look = new Vector3(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new Quaternion()));
    const b = camWorld.dot(look);
    const c = camWorld.lengthSq() - (PLANET_RADIUS + 0.5) ** 2;
    const disc = b * b - c;
    const t = disc >= 0 ? -b - Math.sqrt(disc) : -1;
    const dirWorld = t > 0 ? camWorld.clone().addScaledVector(look, t).normalize() : this.tmp2.set(0, 0, -this.view.look).add(this.rig.position).normalize();
    if (this.pinnedWorld >= 0) {
      world.setLookDirection(dirWorld.applyQuaternion(this.tmpQ));
      world.setViewWorld(this.pinnedWorld);
    } else world.setViewDirection(dirWorld.applyQuaternion(this.tmpQ));
    // Überblendung: fremde Instanzen nahe der Kamera treten weg/zurück → Schattenpass mitziehen
    if (world.viewBlending) this.shadowDirty = true;
    world.tickView(dt);
    if (this.trash) {
      this.trash.setNearClear(this.nearClear);
      this.trash.setFootClear(this.footClear);
      if (this.trash.update(this.camera, camWorld, this.planet.matrixWorld, this.frustum, dt)) this.shadowDirty = true;
    }
    const site = this.treeSite;
    if (site) {
      const wasVisible = site.holder.visible;
      site.update(dt, this.camera, this.sunDirWorld.value, camWorld, this.planet.matrixWorld, this.frustum);
      if (site.holder.visible !== wasVisible) this.shadowDirty = true;
    }
    this.nodePath?.update(this.elapsed);
    if (world.viewWorld !== this.lastViewWorld) {
      this.lastViewWorld = world.viewWorld;
      for (const l of this.worldListeners) l(this.lastViewWorld);
    }

    if (this.shadowDirty) {
      const hTotal = Math.max(world.hTotal, site?.holder.visible ? site.height + 1 : 0, world.field.hMax + (this.trash?.hMax ?? 0) + 1);
      if (!world.bounds.isEmpty()) this.sun.fitShadow(world.bounds, this.planet.matrixWorld, hTotal);
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
    const zc = world ? world.zoneCoordAt(this.targetDir.clone().applyQuaternion(this.planet.quaternion.clone().invert())) : 0;
    const wi = world?.viewWorld ?? 0;
    return {
      drawCalls: info?.render?.drawCalls ?? 0,
      shadowPasses: this.shadowPasses,
      chunks: world?.loadedCount ?? 0,
      trees,
      dots: (world?.vegetation.dots.geometry as { instanceCount?: number } | undefined)?.instanceCount ?? 0,
      props,
      preset: this.preset.name,
      dpr: this.ctx?.renderer.getPixelRatio() ?? 0,
      zone: ZONE_CONTENTS[Math.min(ZONE_CONTENTS.length - 1, Math.floor(zc))]?.name ?? '',
      world: WORLD_CONTENTS[wi] ? `${WORLD_CONTENTS[wi]!.ref} ${WORLD_CONTENTS[wi]!.name}` : '',
      worldIndex: wi,
      view: { ...this.view },
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
    this.nodePath?.dispose();
    this.treeSite?.dispose();
    this.trash?.dispose();
    this.world?.dispose();
    this.fogStripes?.dispose();
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
