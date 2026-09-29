import { Color, Frustum, Group, Matrix4, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { EarlePlanet, FogStripes, SunRig, createSkyDome, skySunIndices } from '@ee/render';
import type { LandmarkSlot } from '@ee/world';
import type { FlowQuality } from './quality';
import type { PathLayout } from './path';
import { CHUNKS_PER_FACE, NODES_PER_ZONE, PLANET_RADIUS, planetLandmarks, planetWorlds, planetZones } from '../lab/earle/zones';

export { PLANET_RADIUS, CHUNKS_PER_FACE };
/** Splash ink (#081b25): the scene background matches the splash PNG so the reveal is seamless. */
export const INK_BACKGROUND = '#081b25';

/**
 * Recommended Earle map camera (rig-local, like FlowScene's MAP_OFFSET / MAP_LOOK / MAP_FOV): lower, closer and
 * wider so hills stack as receding bands up to a high, curved horizon (see `/lab/earle`, "Perspektive" 1.0).
 * FlowScene still uses its own constants; adopting these is a three-line change there.
 */
export const MAP_VIEW = { offset: new Vector3(0, 6.2, 4.6), look: new Vector3(0, 0, -9), fov: 82 } as const;

export interface MapWorldOptions {
  quality: FlowQuality;
  seed?: number;
  sunElevationDeg?: number;
  sunAzimuthDeg?: number;
  /**
   * Curvature boost of the far terrain (0 = off). Only terrain, vegetation and props bend; objects the flow
   * places on the planet (nodes, hero, board) do not, so keep 0 unless they follow the same warp.
   */
  curvature?: number;
  /** Trash density of the start world (1 = content default). */
  trashScale?: number;
}

const _v = new Vector3();
const _q = new Quaternion();
const _m = new Matrix4();

/**
 * The Earle world of the flow: the chunked planet (four story zones with cracks, ten Earle worlds as spiral bands,
 * spiral path, per-chunk growth, trash in the start world that sinks as it heals) with the banded EarleMaterial,
 * pooled vegetation, sun rig with the sharpened shadow filter, sky dome and fog stripes. The planet rolls under a
 * fixed rig (camera, sun, sky and stripes hang on it); the flow moves the camera relative to the rig for fly-ins.
 * Chunks load/unload by visibility every frame; sky, fog and stripes cross-fade to the world under the look point.
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
  /** Level path over the whole planet: node i ↔ LEVELS[i]. */
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
    this.world = new EarlePlanet({
      radius: PLANET_RADIUS,
      seed: options.seed ?? 7,
      chunksPerFace: CHUNKS_PER_FACE,
      zones,
      worlds: planetWorlds(),
      landmarks: planetLandmarks(),
      trashScale: options.trashScale ?? 1,
      quality: {
        chunkRes: Math.max(12, Math.round(q.terrainRes / 3)),
        dotsPerTree: q.dotsPerTree,
        collapsePx: q.collapsePx,
        densityScale: q.treeCount / 200,
        nearChunks: q.name === 'mobil' ? 3 : 5,
        // Punkte-Kapazität = Budget je Neuaufbau (die Punkte je Baum werden gleichmäßig ausgedünnt, wenn mehr geplant
        // sind): die Karte sieht auf dem kleineren Planeten mehr Chunks als P2b, die Punktzahl bleibt wie dort
        capacity: q.name === 'mobil' ? { trees: 1400, dots: 11000, props: 300, animals: 160 } : { trees: 2600, dots: 16000, props: 400, animals: 220 },
      },
      path: { nodesPerZone: NODES_PER_ZONE, turns: 2.75, clearNode: 3.4, clearPath: 1.0 },
      loadsPerFrame: 2,
    });
    this.world.curvature.value = options.curvature ?? 0;
    this.planet.add(this.world.group);
    this.layout = {
      nodes: this.world.path.nodes.map((n) => ({ index: n.index, u: n.lon / 180, v: n.lat / 90, position: n.position, normal: n.normal })),
      dots: this.world.path.dots.map((d) => ({ position: d.position, normal: d.normal })),
      length: this.world.path.length,
    };

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
  }

  /** Direction to the sun in world space (unit). */
  sunDirection(out: Vector3): Vector3 {
    return this.sun.directionWorld(out);
  }

  /** Request a shadow pass on the next frame (rotation, moving casters, growth). */
  markShadowDirty(): void {
    this.shadowDirty = true;
  }

  /** Completed nodes → per-chunk growth along the path (trash sinks, trees grow). */
  setProgress(done: number): void {
    this.world.setProgress(done);
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

  /** Landmark slots (e.g. the hero tree): position/normal/scale/zone on the planet surface. */
  get landmarkSlots(): LandmarkSlot[] {
    return this.world.landmarkSlots;
  }

  /** Places an object (e.g. `createHeroTree().group`) on a landmark slot; it rotates with the planet. */
  addLandmark(object: Object3D, slotId?: string): LandmarkSlot | null {
    const slot = this.world.addLandmark(object, slotId);
    this.shadowDirty = true;
    return slot;
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
    const dirWorld = hit ?? camWorld.clone().normalize();
    const dirLocal = dirWorld.applyQuaternion(_q);
    this.world.setViewDirection(dirLocal);
    this.world.tickView(dt);
    this.fogStripes.layout(1, this.world.curvature.value);

    if (this.shadowDirty) {
      if (!this.world.bounds.isEmpty()) this.sun.fitShadow(this.world.bounds, this.planet.matrixWorld, this.world.hTotal);
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
