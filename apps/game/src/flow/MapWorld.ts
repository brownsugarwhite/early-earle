import { Color, Frustum, Group, Matrix4, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import type { Node } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { EarlePlanet, FogStripes, SunRig, createSkyDome, skySunIndices } from '@ee/render';
import type { LandmarkSlot } from '@ee/world';
import type { FlowQuality } from './quality';
import type { PathLayout } from './path';
import type { BentLayout } from './NodePath';
import { CHUNKS_PER_FACE, HERO_TREE_WORLD, NODES_PER_ZONE, PLANET_RADIUS, planetLandmarks, planetWorlds, planetZones } from '../lab/earle/zones';
import { TREE_LEVELS, createHeroTreeSite, type HeroTreeSite } from '../lab/earle/heroTreeSite';

export { PLANET_RADIUS, CHUNKS_PER_FACE, TREE_LEVELS };
/** Splash ink (#081b25): the scene background matches the splash PNG so the reveal is seamless. */
export const INK_BACKGROUND = '#081b25';

/**
 * Recommended Earle map camera (rig-local, like FlowScene's MAP_OFFSET / MAP_LOOK / MAP_FOV): "a painting seen from
 * a hill" — camera 9 above and 4 behind the apex, looking 5 ahead (pitch ≈ 45°, fov 52: little wide-angle
 * distortion), so the curved horizon sits in the upper third (NDC ≈ +0.4), the foreground is a quiet band (vegetation
 * cleared within `footClear` of the camera's foot, the long shadows fall into it) and the current node lands on the
 * lower third line at ≈ 13 units (a 0.3 stone ≈ 40 px on a phone, pick disc ≈ 80 px).
 */
export const MAP_VIEW = {
  offset: new Vector3(0, 9, 4),
  look: new Vector3(0, 0, -5),
  fov: 52,
  curvature: 0.14,
  /** Clearing around the camera's foot (lateral radius, world units): nothing in the lower band clips into the lens. */
  footClear: 4.5,
  /** Spherical clearance around the camera for close shots (rail, fly-ins). */
  nearClear: 1.2,
} as const;

export interface MapWorldOptions {
  quality: FlowQuality;
  seed?: number;
  sunElevationDeg?: number;
  sunAzimuthDeg?: number;
  /** Curvature boost of the far terrain (default MAP_VIEW.curvature). Nodes follow via `bend`; the hero/board via FlowScene. */
  curvature?: number;
  /** Trash density of the start world (1 = content default). */
  trashScale?: number;
}

/** Camera rail sample (planet space, rotates with the planet: convert with `planet.localToWorld`). */
export interface MapRail {
  position: Vector3;
  lookAt: Vector3;
}

type Vec3Node = Node<'vec3'>;

const _v = new Vector3();
const _w = new Vector3();
const _q = new Quaternion();
const _m = new Matrix4();

/**
 * The Earle world of the flow: the chunked planet (four story zones with cracks, ten Earle worlds as spiral bands with
 * crevasses between them, spiral path, per-chunk growth, trash in the start world that sinks as it heals, focal
 * elements), the giant tree of world 01 whose trunk and crown carry levels 80–95, the banded EarleMaterial, pooled
 * vegetation, sun rig with the sharpened shadow filter, sky dome and fog stripes. The planet rolls under a fixed rig
 * (camera, sun, sky and stripes hang on it); the flow moves the camera relative to the rig for fly-ins. Chunks
 * load/unload by visibility every frame; sky, fog and stripes cross-fade to the world under the look point.
 */
export class MapWorld {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(70, 1, 0.3, 700);
  /** Rig at the apex of the planet; camera, sun and fog stripes are children. */
  readonly rig = new Object3D();
  /** Rotating planet: chunks, vegetation and everything that lives on the surface. */
  readonly planet = new Group();
  readonly world: EarlePlanet;
  readonly sun: SunRig;
  readonly fogStripes: FogStripes;
  /** The giant tree of world 01 and the level stretch on it. */
  readonly treeSite: HeroTreeSite;
  /** Level path over the whole planet: node i ↔ LEVELS[i] (levels 80–95 climb the tree). Carries `bend` for NodePath. */
  readonly layout: PathLayout;
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly skyHorizon = uniform(-0.5);
  private readonly frustum = new Frustum();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly tmp = new Vector3();
  private readonly sunLocal = new Vector3();
  private shadowDirty = true;
  private lastTime = -1;
  shadowPasses = 0;

  constructor(readonly options: MapWorldOptions) {
    const q = options.quality;
    this.scene.name = 'FlowWorld';
    this.scene.background = new Color(INK_BACKGROUND);
    this.rig.position.set(0, PLANET_RADIUS, 0);
    this.scene.add(this.rig, this.planet);
    this.rig.add(this.camera);

    this.sun = new SunRig({
      mapSize: q.shadowMapSize,
      sharpen: true,
      elevationDeg: options.sunElevationDeg ?? 10,
      azimuthDeg: options.sunAzimuthDeg ?? 70,
    });
    this.sun.root.position.set(0, 0, -4);
    this.rig.add(this.sun.root);

    const zones = planetZones();
    const landmarks = planetLandmarks();
    this.world = new EarlePlanet({
      radius: PLANET_RADIUS,
      seed: options.seed ?? 7,
      chunksPerFace: CHUNKS_PER_FACE,
      zones,
      worlds: planetWorlds(),
      landmarks,
      trashScale: options.trashScale ?? 1,
      quality: {
        chunkRes: Math.max(12, Math.round(q.terrainRes / 3)),
        dotsPerTree: q.dotsPerTree,
        collapsePx: q.collapsePx,
        densityScale: q.treeCount / 200,
        nearChunks: q.name === 'mobil' ? 3 : 5,
        // Dot capacity = budget per rebuild (dots per tree thin out evenly when more are planned): the smaller planet
        // shows more chunks than P2b, the dot count stays where it was there
        capacity: q.name === 'mobil' ? { trees: 1400, dots: 11000, props: 300, animals: 160 } : { trees: 2600, dots: 16000, props: 400, animals: 220 },
      },
      path: { nodesPerZone: NODES_PER_ZONE, turns: 2.75, clearNode: 2.0, clearPath: 0.8 },
      loadsPerFrame: 2,
    });
    this.world.curvature.value = options.curvature ?? MAP_VIEW.curvature;
    this.world.vegetation.setNearClear(MAP_VIEW.nearClear);
    this.world.vegetation.setFootClear(MAP_VIEW.footClear);
    this.planet.add(this.world.group);

    // The giant tree: slot next to the spiral, levels 80–95 on trunk and crown (splices the level path)
    this.treeSite = createHeroTreeSite(this.world, { worldIndex: HERO_TREE_WORLD, quality: q.name, seed: options.seed ?? 7, landmarks });
    const path = this.treeSite.levelPath;
    const layout: BentLayout = {
      nodes: path.nodes.map((n) => ({ index: n.index, u: n.lon / 180, v: n.lat / 90, position: n.position, normal: n.normal })),
      dots: path.dots.map((d) => ({ position: d.position, normal: d.normal })),
      length: path.length,
      bend: (p: Vec3Node) => this.world.bendNode(p),
    };
    this.layout = layout;

    // --- sky and fog stripes -----------------------------------------------------------------------
    const sunIdx = skySunIndices(this.world.worlds[0]!.palette);
    const sky = createSkyDome({
      lookup: this.world.lookup,
      skyRow: this.world.skyRowA,
      steps: sunIdx.steps,
      sunIndex: sunIdx.sun,
      ringIndex: sunIdx.ring,
      sunDirWorld: this.sunDirWorld,
      skyRowB: this.world.skyRowB,
      skyMix: this.world.skyMix,
      horizonY: this.skyHorizon,
    });
    this.camera.add(sky);
    this.disposables.push(sky.geometry, sky.material as { dispose(): void });
    this.fogStripes = new FogStripes({
      lookup: this.world.lookup,
      fogRow: this.world.fog.row,
      colorIndex: 5,
      count: q.fogStripes,
      firstDistance: 6,
      spacing: q.fogStripes > 2 ? 5 : 8,
      curvatureRadius: PLANET_RADIUS,
      strength: this.world.stripeStrength,
    });
    this.rig.add(this.fogStripes.group);
    // Shadows v2: cascades fitted to the planet view (receivers = planet shell incl. the curvature bend)
    this.sun.fitToPlanet(this.camera, this.world, this.planet);
  }

  /** Direction to the sun in world space (unit). */
  sunDirection(out: Vector3): Vector3 {
    return this.sun.directionWorld(out);
  }

  /** Request a shadow pass on the next frame (rotation, moving casters, growth). */
  markShadowDirty(): void {
    this.shadowDirty = true;
  }

  /** Completed nodes → per-chunk growth along the path (trash sinks, trees grow, the giant tree blooms). */
  setProgress(done: number): void {
    this.world.setProgress(done);
    this.treeSite.setProgress(done);
    this.shadowDirty = true;
  }

  /**
   * Clearing around the camera's foot (lateral radius in world units; MAP_VIEW.footClear by default, 0 = off), e.g.
   * smaller for close shots on the board. Changes need a shadow pass (cleared trees drop their shadows too).
   */
  setFootClear(units: number): void {
    this.world.vegetation.setFootClear(units);
    this.shadowDirty = true;
  }

  /** Close (or reopen) the crack between zone `border` and `border + 1`. */
  setCrackClosed(border: number, closed: boolean): void {
    this.world.setCrackClosed(border, closed);
  }

  /** Trash density of the start world (chunks re-scatter). */
  setTrashScale(scale: number): void {
    this.world.setTrashScale(scale);
    this.shadowDirty = true;
  }

  /** Landmark slots (giant tree, focal elements): position/normal/scale/zone on the planet surface. */
  get landmarkSlots(): LandmarkSlot[] {
    return this.world.landmarkSlots;
  }

  /** Places an object on a landmark slot; returns the holder (slot space → planet space), which rotates with the planet. */
  addLandmark(object: Object3D, slotId?: string): Group | null {
    const holder = this.world.addLandmark(object, slotId);
    this.shadowDirty = true;
    return holder;
  }

  /**
   * Curvature bend of a planet-space position (same formula as terrain, vegetation and the node stones): call it
   * every frame for positions set on the CPU (hero, board) — the bend follows the look point.
   */
  bend(pos: Vector3, out = new Vector3()): Vector3 {
    return this.world.bend(pos, out);
  }

  /**
   * Camera rail for a level node on the giant tree (planet space: `planet.localToWorld` for world space), or null
   * for ground nodes. The rail stays behind the node, close to the bark on the trunk, higher and further out above
   * the crown, and craning over the valley in between.
   */
  cameraRailFor(levelIndex: number, out?: MapRail): MapRail | null {
    const r = out ?? { position: new Vector3(), lookAt: new Vector3() };
    return this.treeSite.railFor(levelIndex, r.position, r.lookAt) ? r : null;
  }

  /** Continuous rail over the whole tree stretch (t 0..1, planet space) for camera moves between tree nodes. */
  sampleTreeRail(t: number, out?: MapRail): MapRail {
    const r = out ?? { position: new Vector3(), lookAt: new Vector3() };
    this.treeSite.sampleRail(t, r.position, r.lookAt);
    return r;
  }

  /** Index (0..9) of the Earle world under the look point. */
  get viewWorld(): number {
    return this.world.viewWorld;
  }

  /** Once per frame before rendering: chunk streaming, sun/sky uniforms, world blend, billboard axes, shadow fit. */
  update(): void {
    const now = performance.now() / 1000;
    const dt = this.lastTime < 0 ? 0 : Math.min(0.1, now - this.lastTime);
    this.lastTime = now;
    this.scene.updateMatrixWorld(true);
    this.sun.directionWorld(this.sunDirWorld.value);
    this.planet.getWorldQuaternion(_q).invert();
    this.sunLocal.copy(this.sunDirWorld.value).applyQuaternion(_q);
    this.world.vegetation.setSunDirection(this.sunDirWorld.value, this.sunLocal);

    const camWorld = this.camera.getWorldPosition(this.tmp);
    const camR = camWorld.length();
    this.skyHorizon.value = -Math.sin(Math.acos(Math.min(1, PLANET_RADIUS / Math.max(PLANET_RADIUS + 0.01, camR))));
    _m.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(_m, this.camera.coordinateSystem);
    if (this.world.update(this.camera, camWorld, this.planet.matrixWorld, this.frustum)) this.shadowDirty = true;

    // World under the camera's look point drives sky, fog, stripes (and the curvature warp centre).
    const look = _v.set(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(new Quaternion()));
    const hit = raySphere(camWorld, look, PLANET_RADIUS + 0.5);
    // Fog follows the camera distance (hill view, fly-ins, rail): value steps stay in the middle and far ground
    if (hit) this.world.setFogDistance(_w.copy(hit).multiplyScalar(PLANET_RADIUS + 0.5).distanceTo(camWorld));
    const dirWorld = hit ?? camWorld.clone().normalize();
    const dirLocal = dirWorld.applyQuaternion(_q);
    this.world.setViewDirection(dirLocal);
    if (this.world.viewBlending) this.shadowDirty = true; // neighbours fade in/out near the camera
    this.world.tickView(dt);
    this.fogStripes.layout(1, this.world.curvature.value);

    const treeWasVisible = this.treeSite.holder.visible;
    this.treeSite.update(dt, this.camera, this.sunDirWorld.value, camWorld, this.planet.matrixWorld, this.frustum);
    if (this.treeSite.holder.visible !== treeWasVisible) this.shadowDirty = true;

    if (this.shadowDirty) {
      if (!this.world.bounds.isEmpty()) {
        const hTotal = Math.max(this.world.hTotal, this.treeSite.holder.visible ? this.treeSite.height + 1 : 0);
        this.sun.fitShadow(this.world.bounds, this.planet.matrixWorld, hTotal);
      }
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
  }

  /** Terrain radius (distance from the planet centre) in a unit direction of planet space. */
  surfaceRadius(dir: Vector3): number {
    return this.world.surfaceRadius(dir);
  }

  dispose(): void {
    this.fogStripes.dispose();
    this.treeSite.dispose();
    this.world.dispose();
    for (const d of this.disposables) d.dispose();
    this.sun.dispose();
    this.scene.clear();
  }
}

/** Nearest intersection point of a ray with the sphere of radius r around the origin, or null. */
function raySphere(origin: Vector3, dir: Vector3, r: number): Vector3 | null {
  const b = origin.dot(dir);
  const c = origin.lengthSq() - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0) return null;
  return origin.clone().addScaledVector(dir, t).normalize();
}

/** Builds a tangent frame (right, up = normal, forward) as a rotation matrix. `forward` is projected onto the plane. */
export function tangentFrame(normal: Vector3, forwardHint: Vector3, out: Matrix4): Matrix4 {
  const up = normal.clone().normalize();
  const fwd = forwardHint.clone().addScaledVector(up, -forwardHint.dot(up));
  if (fwd.lengthSq() < 1e-8) fwd.set(0, 0, 1).addScaledVector(up, -up.z);
  fwd.normalize();
  const right = new Vector3().crossVectors(up, fwd).normalize();
  return out.makeBasis(right, up, fwd);
}
