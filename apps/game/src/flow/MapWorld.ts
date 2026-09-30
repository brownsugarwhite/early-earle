import { Color, Frustum, Group, Matrix4, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import type { Node } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { EarlePlanet, FogStripes, SunRig, createSkyDome, skySunIndices } from '@ee/render';
import type { LandmarkSlot } from '@ee/world';
import { mixHex } from '@ee/genome';
import type { FlowQuality } from './quality';
import { routeGroundPath, type PathAnchorProvider, type PathLayout, type RoutedGround } from './path';
import type { BentLayout, PathPalette, PathWorldColors } from './NodePath';
import { buildLevelPath } from './levelPath';
import { CHUNKS_PER_FACE, HERO_TREE_WORLD, NODES_PER_ZONE, PLANET_RADIUS, WORLD_CONTENTS, planetLandmarks, planetWorlds, planetZones } from '../lab/earle/zones';
import { TREE_LEVELS, createHeroTreeSite, type HeroTreeSite } from '../lab/earle/heroTreeSite';
import { createPlanetTrash } from '../lab/earle/trash';
import type { TrashField } from '@ee/render/earle/trash/index.ts';

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

/**
 * Portrait (phone) map camera: higher and steeper — 13.5 above and 5 behind the apex, looking 4 ahead (pitch ≈ 56°,
 * fov 61). On this small planet a flatter look fills the upper half with sky; this one keeps the curved horizon with
 * the painted sky band just under the top HUD pill (≈ 120 pt), reads the ground as a landscape seen from above, puts
 * the current node on the lower third a little left of centre (above the bottom HUD; REX has the lower-right corner)
 * and shows the next 5–6 path nodes running up the screen (the planet turns so the path heads away from the camera).
 * The hero lands ≈ 14 units from the lens (≈ 50 pt on an iPhone 16).
 */
export const MAP_VIEW_PORTRAIT = {
  offset: new Vector3(0, 13.5, 5),
  look: new Vector3(0, 0, -4),
  fov: 61,
  /** NDC of the current node (x a little left: REX stands at the lower right). */
  target: { x: -0.1, y: -0.36 },
  /** Nodes ahead the planet turns toward screen-up (the path runs away from the camera). */
  lookAhead: 3,
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
  /**
   * Terrain features (cliff ledges, rivers, lakes) can offer anchors the level path visits and a walk cost that keeps
   * it off water and cliff faces (see `PathAnchorProvider` in path.ts).
   */
  anchors?: PathAnchorProvider | null;
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
  /** Trash v2 and the neon fog veil (start world, pockets elsewhere); heals with the progress. */
  readonly trash: TrashField;
  /** Level path over the whole planet: node i ↔ LEVELS[i] (levels 80–95 climb the tree). Carries `bend` for NodePath. */
  readonly layout: PathLayout;
  /** The ground route through the landscape before the tree stretch was spliced in. */
  readonly route: RoutedGround;
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
      // Schattentönung je Welt (blaue Schatten auf Schnee …) aus den Weltdateien
      shadowTint: this.sun.shadowTint,
    });
    this.world.curvature.value = options.curvature ?? MAP_VIEW.curvature;
    this.world.vegetation.setNearClear(MAP_VIEW.nearClear);
    this.world.vegetation.setFootClear(MAP_VIEW.footClear);
    this.planet.add(this.world.group);

    // The level path leads through the landscape: the spiral is only its backbone (hillsides and valley floors,
    // organic S-curves, nodes on flat ground or on the element they visit). Routed before the giant tree splices in.
    const firstTree = TREE_LEVELS[0] - 1;
    const lastTree = TREE_LEVELS[1] - 1;
    this.route = routeGroundPath(this.world.field, this.world.path, {
      nodesPerZone: NODES_PER_ZONE,
      seed: options.seed ?? 7,
      keepGround: [firstTree - 1, lastTree + 1],
      provider: options.anchors === undefined ? featurePathProvider(this.world.field) : options.anchors,
    });
    this.world.setPath(this.route);

    // The giant tree: slot next to the path, levels 80–95 on trunk and crown (splices the level path)
    this.treeSite = createHeroTreeSite(this.world, { worldIndex: HERO_TREE_WORLD, quality: q.name, seed: options.seed ?? 7, landmarks });
    const slot = this.world.getLandmarkSlot('hero-tree');
    const built = buildLevelPath(
      this.world,
      this.route,
      slot
        ? {
            first: this.treeSite.first,
            last: this.treeSite.last,
            path: this.treeSite.tree.path,
            shape: this.treeSite.tree.shape,
            domes: this.treeSite.tree.domes,
            matrix: this.world.landmarkMatrix(slot, new Matrix4()),
            world: HERO_TREE_WORLD,
          }
        : null,
    );
    // Corridor and growth follow the final path (stones on the tree, dots on bark and crown).
    this.world.setPath(built.spiral);
    const layout: BentLayout = { ...built.layout, bend: (p: Vec3Node) => this.world.bendNode(p) };
    // Trash v2 (neon debris, ruins, heaps, veil): placed after the final path, so its corridor stays clear.
    this.trash = createPlanetTrash(this.world, { quality: q.name, seed: options.seed ?? 7, densityScale: options.trashScale ?? 1 });
    this.trash.setFootClear(MAP_VIEW.footClear);
    this.planet.add(this.trash.group);
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
      glow: this.world.skyGlow,
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

  /**
   * Palette context for the path visuals: the ribbon is shaded like the terrain (atlas rows, bands, fog), stones,
   * flowers and pedestals take each world's ink, jewel accent, rock, scrap, sand and water.
   */
  pathPalette(): PathPalette {
    return {
      lookup: this.world.lookup,
      fog: this.world.fog,
      bands: this.world.terrainBands,
      terrainRow: (w) => this.world.rows[Math.max(0, Math.min(this.world.rows.length - 1, w))]!.terrain,
      colors: (w) => worldPathColors(w),
      shadowTint: this.sun.shadowTint,
    };
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
    this.trash.setProgress(done);
    this.shadowDirty = true;
  }

  /**
   * Clearing around the camera's foot (lateral radius in world units; MAP_VIEW.footClear by default, 0 = off), e.g.
   * smaller for close shots on the board. Changes need a shadow pass (cleared trees drop their shadows too).
   */
  setFootClear(units: number): void {
    this.world.vegetation.setFootClear(units);
    this.trash.setFootClear(units);
    this.shadowDirty = true;
  }

  /** Close (or reopen) the crack between zone `border` and `border + 1`. */
  setCrackClosed(border: number, closed: boolean): void {
    this.world.setCrackClosed(border, closed);
  }

  /** Trash density of the start world (chunks re-scatter). */
  setTrashScale(scale: number): void {
    this.world.setTrashScale(scale);
    this.trash.setDensity(scale);
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
    if (this.trash.update(this.camera, camWorld, this.planet.matrixWorld, this.frustum, dt)) this.shadowDirty = true;
    this.fogStripes.layout(1, this.world.curvature.value);

    const treeWasVisible = this.treeSite.holder.visible;
    this.treeSite.update(dt, this.camera, this.sunDirWorld.value, camWorld, this.planet.matrixWorld, this.frustum);
    if (this.treeSite.holder.visible !== treeWasVisible) this.shadowDirty = true;

    if (this.shadowDirty) {
      if (!this.world.bounds.isEmpty()) {
        const hTotal = Math.max(this.world.hTotal, this.treeSite.holder.visible ? this.treeSite.height + 1 : 0, this.world.field.hMax + this.trash.hMax + 1);
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
    this.trash.dispose();
    this.world.dispose();
    for (const d of this.disposables) d.dispose();
    this.sun.dispose();
    this.scene.clear();
  }
}

function chroma(hex: string): { c: number; l: number } {
  const v = parseInt(hex.replace('#', ''), 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return { c: mx - mn, l: (mx + mn) / 2 };
}

const pathColorCache = new Map<number, PathWorldColors>();

/**
 * Path colours of an Earle world from its palette: ink for contact shadows, the most saturated mid-light accent as
 * the flower petal (Earle's single accent), red rust towers as rock where the world has a monolith row, otherwise
 * rock from the terrain's dark steps; sand from the lightest terrain step, pool water from ink and sky.
 */
export function worldPathColors(w: number): PathWorldColors {
  const cached = pathColorCache.get(w);
  if (cached) return cached;
  const content = WORLD_CONTENTS[w];
  if (!content) throw new Error(`no world ${w}`);
  const p = content.palette;
  let petal = '#e0567a';
  let best = 0.28;
  for (const hex of [...p.accent, ...p.canopy.slice(3)]) {
    const { c, l } = chroma(hex);
    const score = c * (l > 0.25 && l < 0.8 ? 1 : 0.3);
    if (score > best) {
      best = score;
      petal = hex;
    }
  }
  const t = p.terrain;
  const rock = p.monolith?.[3] ?? mixHex(mixHex(t[2] ?? '#8c8c70', '#8a8272', 0.45), p.ink, 0.12);
  const colors: PathWorldColors = {
    ink: p.ink,
    petal,
    rock,
    rockShade: p.monolith?.[1] ?? mixHex(t[0] ?? '#303020', p.ink, 0.55),
    scrap: mixHex('#8a3a22', p.ink, 0.25),
    sand: mixHex(t[t.length - 1] ?? '#e8d8a0', '#f2e2b0', 0.45),
    water: mixHex(p.ink, p.sky[3] ?? '#3a6a8a', 0.22),
  };
  pathColorCache.set(w, colors);
  return colors;
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

/**
 * The terrain features as the level path's anchor provider (MapWorld default): lakes, rivers and rock columns cost
 * (the route keeps off water and rock feet), the lowest ledge of each formation near the path attracts the route, so
 * it swings past the rocks like a path through an Earle landscape. Nodes keep their own stones (a board on a narrow
 * rock top would float), the formations are the backdrop.
 */
function featurePathProvider(field: {
  features?: {
    ledges(world?: number): Array<{ position: [number, number, number]; normal: [number, number, number]; step: number; pathDistance: number }>;
    isWater(dx: number, dy: number, dz: number, margin?: number): boolean;
    rockAt(dx: number, dy: number, dz: number, margin?: number): unknown;
  };
}): PathAnchorProvider | null {
  const features = field.features;
  if (!features) return null;
  return {
    anchors: () =>
      features
        .ledges()
        .filter((l) => l.step === 0 && l.pathDistance < 6)
        .map((l) => ({ position: l.position, normal: l.normal, kind: 'ledge' as const, reach: Math.min(5, l.pathDistance + 1.5) })),
    cost: (dir) => (features.isWater(dir[0], dir[1], dir[2], 0.6) || features.rockAt(dir[0], dir[1], dir[2], 0.5) !== null ? 1 : 0),
  };
}
