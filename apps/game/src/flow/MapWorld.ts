import { Color, Frustum, Group, Matrix4, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { uniform } from 'three/tsl';
import { CloudBanks, EarlePlanet, FogStripes, PLANET_SHADOW_LAYER, SunRig, createSkyDome, followViewClouds, skySunIndices, type WorldPalette } from '@ee/render';
import { hash32, type Vec3 } from '@ee/world';
import { mixHex } from '@ee/genome';
import type { FlowQuality } from './quality';
import type { GroundFrame, MapGround } from './MapCreatures';
import type { PathPalette, PathWorldColors } from './NodePath';
import { FlowPath } from './levelPath';
import { HERO_TREE_WORLD, PLANET_RADIUS, PLAYABLE_COUNT, planetWorlds, routeOptions } from '../lab/earle/zones';
import { TREE_RANGE, createHeroTreeSite, type HeroTreeSite } from '../lab/earle/heroTreeSite';
import { createPlanetTrash } from '../lab/earle/trash';
import type { TrashField } from '@ee/render/earle/trash/index.ts';

export { PLANET_RADIUS, TREE_RANGE };
/** Splash ink (#081b25): the scene background matches the splash PNG so the reveal is seamless. */
export const INK_BACKGROUND = '#081b25';

/**
 * Recommended Earle map camera (rig-local, like FlowScene's MAP_OFFSET / MAP_LOOK / MAP_FOV): "a painting seen from
 * a hill" — camera 9 above and 4 behind the apex, looking 5 ahead (pitch ≈ 45°, fov 52: little wide-angle
 * distortion), so the curved horizon sits in the upper third (NDC ≈ +0.4), the foreground is a quiet band (vegetation
 * cleared within `footClear` of the camera's foot, the long shadows fall into it) and the current node lands on the
 * lower third line at ≈ 13 units (a 0.3 stone ≈ 40 px on a phone, tap radius ≈ 80 px).
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
 * fov 61). On this small globe a flatter look fills the upper half with sky; this one keeps the curved horizon with
 * the painted sky band just under the top HUD pill (≈ 120 pt), reads the ground as a landscape seen from above, puts
 * the current node on the lower third a little left of centre (above the bottom HUD; REX has the lower-right corner)
 * and shows the next 5–6 path nodes running up the screen (the view turns so the path heads away from the camera).
 * The hero lands ≈ 14 units from the lens (≈ 50 pt on an iPhone 16).
 */
export const MAP_VIEW_PORTRAIT = {
  offset: new Vector3(0, 13.5, 5),
  look: new Vector3(0, 0, -4),
  fov: 61,
  /** NDC of the current node (x a little left: REX stands at the lower right). */
  target: { x: -0.1, y: -0.36 },
  /**
   * Nodes before/after the current one whose chord gives the path's direction the view turns toward screen-up (the path
   * runs away from the camera). 1 = the local tangent: macro shapes (W3) fold the path — serpentines and snails run
   * across and back, a node three ahead can lie behind the camera.
   */
  lookAhead: 1,
} as const;

export interface MapWorldOptions {
  quality: FlowQuality;
  seed?: number;
  sunElevationDeg?: number;
  sunAzimuthDeg?: number;
  /** Curvature boost of the far terrain (default MAP_VIEW.curvature). */
  curvature?: number;
  /** Trash density of the start world (1 = content default). */
  trashScale?: number;
  /** The giant tree and its level stretch (default on). */
  tree?: boolean;
}

/** Camera rail sample in plane coordinates (map with `toDisplay`). */
export interface MapRail {
  position: Vector3;
  lookAt: Vector3;
}

const _v = new Vector3();
const _w = new Vector3();
const _q = new Quaternion();
const _m = new Matrix4();
const _f = new Vector3();

/**
 * The Earle world of the flow on the infinite plane (ADR 0002, Route 15 + 1): the streamed world (the 15 authored
 * path worlds of `content/zones/route.json` along −z, the gate node of the hinted zone 16; left, right, behind the gate
 * and behind the start only the hinted zone; cracks between them; per-chunk growth; focal elements), the giant tree of
 * world 01 whose trunk and crown carry levels 99–114, the banded EarleMaterial, pooled vegetation, sun rig with shadows
 * in plane space, sky dome and fog stripes.
 *
 * The world is shown as a globe around the **focus** (the plane point at the apex): panning moves the focus, the
 * display mapping bends everything onto the sphere. The rig (camera, sun, sky, stripes) sits at the apex; `planet` is
 * the display space for rigid objects (hero, board) that the flow places with `planeToDisplay`. Sky, fog and stripes
 * cross-fade to the world under the look point.
 */
export class MapWorld {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(70, 1, 0.3, 700);
  /** Rig at the apex of the globe; camera, sun and fog stripes are children. May turn about its vertical (view yaw). */
  readonly rig = new Object3D();
  /** Display space for rigid objects (hero, board): identity transform, the globe's centre at the origin. */
  readonly planet = new Group();
  readonly world: EarlePlanet;
  readonly sun: SunRig;
  readonly fogStripes: FogStripes;
  /** Cloud banks of the view world (world 13), on the rig like the fog stripes. */
  readonly clouds: CloudBanks;
  /** The giant tree of world 01 and the level stretch on it (null without the tree). */
  readonly treeSite: HeroTreeSite | null;
  /** Trash v2 and the neon fog veil (start world, pockets elsewhere); heals with the progress (null: none). */
  readonly trash: TrashField | null;
  /**
   * Level path: node i ↔ level i + 1, ending at the gate node of the hinted zone 16 (`lastNode`); levels 99–114 climb
   * the tree, stones without a level file and the gate are locked ("bald").
   */
  readonly layout: FlowPath;
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly skyHorizon = uniform(-0.5);
  private readonly frustum = new Frustum();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly tmp = new Vector3();
  private shadowDirty = true;
  private lastTime = -1;
  shadowPasses = 0;

  constructor(readonly options: MapWorldOptions) {
    const q = options.quality;
    const seed = options.seed ?? 7;
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
    // Schattenwerfer des Geländes (Stellvertreter-Layer der Ebene) und der Schatten-Proxy des Helden
    this.sun.light.shadow.camera.layers.enable(PLANET_SHADOW_LAYER);

    const withTree = options.tree !== false;
    const treeFirst = TREE_RANGE[0] - 1;
    const treeLast = TREE_RANGE[1] - 1;
    this.world = new EarlePlanet({
      radius: PLANET_RADIUS,
      seed,
      worlds: planetWorlds(),
      // Route 15 + 1 (`content/zones/route.json`): seitlich und hinter dem Tor nur die angedeutete Zone
      ...routeOptions(),
      trashScale: options.trashScale ?? 1,
      curvature: options.curvature ?? MAP_VIEW.curvature,
      quality: {
        chunkRes: q.name === 'mobil' ? 25 : 33,
        lodRes: q.name === 'mobil' ? 9 : 13,
        dotsPerTree: q.dotsPerTree,
        collapsePx: q.collapsePx,
        densityScale: q.treeCount / 200,
        nearChunks: q.name === 'mobil' ? 6 : 9,
        // Dot capacity = budget per rebuild (dots per tree thin out evenly when more are planned)
        capacity: q.name === 'mobil' ? { trees: 1400, dots: 11000, props: 300, animals: 160 } : { trees: 2600, dots: 16000, props: 400, animals: 220 },
      },
      path: { clearNode: 2.0, clearPath: 0.8, ...(withTree ? { keepGround: [treeFirst - 1, treeLast + 1] } : {}) },
      loadsPerFrame: 2,
      // Schatten v3: Kronenpunkte skalieren mit dem glatten Schattenwert aus 0 (`?dotshadow=0` = alter Vergleich)
      shadow: { factor: typeof location !== 'undefined' && location.search.includes('dotshadow=0') ? null : (p, o) => this.sun.shadowFactor(p, o) },
      // Schattentönung je Welt (blaue Schatten auf Schnee …) aus den Weltdateien
      shadowTint: this.sun.shadowTint,
    });
    this.world.vegetation.setNearClear(MAP_VIEW.nearClear);
    this.world.setFootClear(MAP_VIEW.footClear);
    this.planet.add(this.world.group);

    // The giant tree stands a little ahead of the last ground node before its stretch (root tip facing it); its nodes
    // replace the ground nodes of TREE_RANGE (levels 99–114)
    this.treeSite = withTree ? createHeroTreeSite(this.world, { worldIndex: HERO_TREE_WORLD, quality: q.name, seed }) : null;
    // Playable: the route's levels that have a level file (101–184 are generated in parallel; the rest stay "bald")
    this.layout = new FlowPath(this.world, this.treeSite, HERO_TREE_WORLD, PLAYABLE_COUNT);
    // Scatter keeps off the final path (stones on the tree, the connectors to and from it)
    this.world.setPathCorridor((x0, z0, x1, z1) => this.layout.corridor(x0, z0, x1, z1));
    // Trash v2 (neon debris, ruins, heaps, veil) along the final path
    this.trash = createPlanetTrash(this.world, this.layout, { quality: q.name, seed, densityScale: options.trashScale ?? 1 });
    if (this.trash) {
      this.trash.setFootClear(MAP_VIEW.footClear);
      this.world.plane.add(this.trash.group);
    }

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
    this.clouds = new CloudBanks({ lookup: this.world.lookup });
    this.rig.add(this.clouds.group);
    // Shadows in plane space: cascades at the camera, casters and receivers inverse-mapped onto the flat plane
    this.sun.fitToDisplay(this.camera, this.world, this.world.plane);
  }

  /**
   * Palette context for the path visuals: the ribbon is shaded like the terrain (slot rows, bands, fog), stones,
   * flowers and pedestals take each world's ink, jewel accent, rock, scrap, sand and water.
   */
  pathPalette(): PathPalette {
    return planetPathPalette(this.world, this.sun.shadowTint);
  }

  /** Direction to the sun in world space (unit). */
  sunDirection(out: Vector3): Vector3 {
    return this.sun.directionWorld(out);
  }

  /** Request a shadow pass on the next frame (pan, moving casters, growth). */
  markShadowDirty(): void {
    this.shadowDirty = true;
  }

  // --- focus and display mapping ---------------------------------------------------------------------------

  /** The plane point at the apex of the globe. */
  get focus(): { readonly x: number; readonly z: number } {
    return this.world.focus;
  }

  /** Moves the view: the plane point (x, z) goes to the apex (chunks stream, shadows follow). */
  setFocus(x: number, z: number): void {
    if (x === this.world.focus.x && z === this.world.focus.z) return;
    this.world.setFocus(x, z);
    this.shadowDirty = true;
  }

  /** Plane point → display (scene) position. */
  toDisplay(p: Vec3 | Vector3, out = new Vector3()): Vector3 {
    return this.world.toDisplay(p, out);
  }

  /** Display (scene) position → plane point (x, h, z). */
  fromDisplay(p: Vector3, out = new Vector3()): Vector3 {
    return this.world.fromDisplay(p, out);
  }

  /** A rigid pose on the plane (position, orientation in plane axes) → display pose (hero, board, rails). */
  planeToDisplay(position: Vector3, quaternion: Quaternion, outPosition: Vector3, outQuaternion: Quaternion): void {
    this.world.toFlat(position, _f);
    this.world.mapping.rotationAt(_f, _q);
    this.world.mapping.toDisplayCpu(_f, outPosition);
    outQuaternion.copy(_q).multiply(quaternion);
  }

  /** The inverse: a display pose → plane pose. */
  displayToPlane(position: Vector3, quaternion: Quaternion, outPosition: Vector3, outQuaternion: Quaternion): void {
    this.world.mapping.toFlatCpu(position, _f);
    this.world.mapping.rotationAt(_f, _q).invert();
    outQuaternion.copy(_q).multiply(quaternion);
    this.world.fromDisplay(position, outPosition);
  }

  /** Display position of a path node's stone. */
  nodeDisplay(index: number, out: Vector3): Vector3 {
    return this.toDisplay(this.layout.node(index).position, out);
  }

  /**
   * Terrain height under a rigid display frame (board root, local x/z) in the frame's local y: the ground as it is
   * displayed (plane heights through the display mapping).
   */
  groundLocalY(frame: Object3D, x: number, z: number): number {
    frame.updateMatrixWorld();
    _v.set(x, 0, z).applyMatrix4(frame.matrixWorld);
    this.fromDisplay(_v, _w);
    _w.y = this.world.walkableHeight(_w.x, _w.z);
    this.toDisplay(_w, _v);
    _m.copy(frame.matrixWorld).invert();
    return _v.applyMatrix4(_m).y;
  }

  heightAt(x: number, z: number): number {
    return this.world.heightAt(x, z);
  }

  /**
   * The ground seam for everything that walks or rests on the map (MapCreatures, ADR 0002): points in plane
   * coordinates (x, h, z). `ground` / `groundPoint` put feet on the drawn surface (the loaded chunk's triangles, the
   * deck on rock formations, else the smooth height) a hair below it, `homeSpot` finds dry spots beside the path at a
   * node (1.1–1.5 from the stone, off the dots, off water and rock; nodes on the giant tree live around the trunk on
   * the root terrace), `walkable` is dry and rock-free ground, `display` maps a plane point onto the display globe and
   * `displayRotation` gives the globe's turn there (feet frames stand on the curved ground), `focus` is the point the
   * map shows (default: the apex).
   */
  mapGround(opts: { focus?: (out: Vector3) => Vector3 } = {}): MapGround & { walkable(p: Vector3): boolean } {
    const world = this.world;
    const layout = this.layout;
    const pos: Vec3 = [0, 0, 0];
    const nor: Vec3 = [0, 0, 0];
    const flat = new Vector3();
    const spot = new Vector3();
    /** Feet sink this far under the drawn surface (nothing floats). */
    const SINK = 0.02;
    /** Homes: distance to the node, clearance to the dots, clearing around the node. */
    const HOME_MIN = 1.1;
    const HOME_MAX = 1.5;
    const DOT_CLEAR = 0.45;
    const CLEARING = 1.95;
    const surfaceY = (x: number, z: number): number => {
      if (world.field.rockAt(x, z, 0) !== null) return world.walkableHeight(x, z);
      return world.meshHeightAt(x, z) ?? world.heightAt(x, z);
    };
    const walkable = (p: Vector3): boolean => !world.isWater(p.x, p.z, 0.25) && world.field.rockAt(p.x, p.z, 0.25) === null;
    const ground = (p: Vector3, out: GroundFrame): void => {
      world.surfaceAt(p.x, p.z, pos, nor);
      out.position.set(p.x, surfaceY(p.x, p.z) - SINK, p.z);
      // half way to the vertical: creatures do not stand askew on a slope
      out.normal.set(nor[0], nor[1] + 1, nor[2]).normalize();
    };
    const nearDots = new Map<number, Array<[number, number]>>();
    /** Dots within 4 units of the node (plane x, z). */
    const dotsNear = (node: number): Array<[number, number]> => {
      let list = nearDots.get(node);
      if (list) return list;
      const c = layout.node(node).position;
      list = layout
        .window(Math.max(0, node - 1), node + 1)
        .dots.filter((d) => Math.hypot(d.position[0] - c[0], d.position[2] - c[2]) < 4)
        .map((d) => [d.position[0], d.position[2]] as [number, number]);
      if (nearDots.size > 256) nearDots.clear();
      nearDots.set(node, list);
      return list;
    };
    /** Root terrace of the giant tree (the nodes on its trunk and crown live there). */
    let terrace: { foot: Vec3; radius: number } | null | undefined;
    const terraceOf = (): { foot: Vec3; radius: number } | null => {
      if (terrace !== undefined) return terrace;
      terrace = null;
      for (let i = layout.treeFirst; i >= 0 && i <= layout.treeLast; i++) {
        const o = layout.node(i).stage?.orbit;
        if (o) {
          terrace = { foot: o.foot, radius: o.radius };
          break;
        }
      }
      return terrace;
    };
    return {
      homeSpot: (node, slot, out) => {
        const n = layout.node(node);
        const c = n.position;
        const onTree = this.isTreeNode(node);
        const t = onTree ? terraceOf() : null;
        // path direction at the node (toward the next minus from the previous), and the side across it
        const prev = layout.node(Math.max(0, node - 1)).position;
        const next = layout.node(node + 1).position;
        let ax = next[0] - prev[0];
        let az = next[2] - prev[2];
        const al = Math.hypot(ax, az);
        if (al > 1e-6) {
          ax /= al;
          az /= al;
        } else {
          ax = 0;
          az = -1;
        }
        const side = (hash32('map-side', node, slot) & 1) === 0 ? 1 : -1;
        for (let attempt = 0; attempt < 14; attempt++) {
          const h = hash32('map-home', node, slot, attempt);
          const u1 = (h & 0xffff) / 0xffff;
          const u2 = ((h >>> 16) & 0xffff) / 0xffff;
          let x: number;
          let z: number;
          if (onTree && t) {
            // around the trunk on the root terrace, each node at its own angle, its creatures side by side
            const base = hash32('map-terrace', node) / 0xffffffff;
            const ang = (base + slot * 0.021 + (u1 - 0.5) * 0.03) * Math.PI * 2;
            const r = t.radius + 0.6 + u2 * 1.4 + attempt * 0.15;
            x = t.foot[0] + Math.cos(ang) * r;
            z = t.foot[2] + Math.sin(ang) * r;
          } else {
            // beside the path (side hashed per node and slot), 1.1–1.5 from the node
            const ang = (u1 - 0.5) * 1.6 + (attempt > 6 ? Math.PI : 0);
            const d = HOME_MIN + (HOME_MAX - HOME_MIN) * u2;
            const across = Math.cos(ang) * d * side;
            const along = Math.sin(ang) * d;
            x = c[0] + az * across + ax * along;
            z = c[2] - ax * across + az * along;
          }
          spot.set(x, surfaceY(x, z), z);
          if (!walkable(spot)) continue;
          if (onTree) {
            if (this.treeClearance(spot) < 1.2) continue;
          } else {
            if (Math.hypot(x - c[0], z - c[2]) > CLEARING) continue;
            if (dotsNear(node).some((d) => Math.hypot(d[0] - x, d[1] - z) < DOT_CLEAR)) continue;
          }
          ground(spot, out);
          return true;
        }
        return false;
      },
      ground,
      groundPoint: (p, out) => out.set(p.x, surfaceY(p.x, p.z) - SINK, p.z),
      walkable,
      display: (p, out) => world.toDisplay(p, out),
      displayRotation: (p, out) => world.mapping.rotationAt(world.toFlat(p, flat), out),
      focus: opts.focus ?? ((out) => out.set(world.focus.x, world.walkableHeight(world.focus.x, world.focus.z), world.focus.z)),
    };
  }

  walkableHeight(x: number, z: number): number {
    return this.world.walkableHeight(x, z);
  }

  /**
   * How far the landmark of node `index` rises above the node's stone (the ruin's tower over its terrace), 0 without a
   * landmark — the map camera pulls back for tall silhouettes.
   */
  landmarkRiseAbove(index: number): number {
    const lm = this.layout.node(index).landmark;
    if (!lm) return 0;
    const inst = this.world.landmarkList.find((l) => l.placement.id === lm.id);
    if (!inst) return 0;
    return Math.max(0, inst.placement.y + inst.blueprint.height - lm.anchor.position[1]);
  }

  // --- progress ----------------------------------------------------------------------------------------

  /**
   * Completed nodes → per-chunk growth along the path (trash sinks, trees grow, the giant tree blooms); `current` (the
   * node with the ring) drives the markers on the giant tree.
   */
  setProgress(done: number, current = -1): void {
    this.treeSite?.setPathState(current, done);
    if (done === this.lastDone) return;
    this.lastDone = done;
    this.world.setProgress(done);
    this.treeSite?.setProgress(done);
    this.trash?.setProgress(done);
    // The crack at the start of path segment k closes once every level of segment k − 1 is done
    this.world.setCracksClosedBelow(this.world.layout.segmentOfLevel(done + 1) + 1);
    this.shadowDirty = true;
  }

  private lastDone = -1;

  // --- the giant tree ----------------------------------------------------------------------------------

  /** Is node `index` drawn by the giant tree's own markers (fungi, stones on the tree) instead of NodePath? */
  isTreeNode(index: number): boolean {
    return this.layout.isTreeNode(index);
  }

  /** What a node of the giant tree rests on (root, bark, limb, dome), null for ground nodes. */
  treeSurface(index: number): 'root' | 'bark' | 'limb' | 'dome' | null {
    const site = this.treeSite;
    return site && this.isTreeNode(index) ? (site.tree.path.nodes[index - site.first]?.surface ?? null) : null;
  }

  /**
   * Where the hero (body radius `radius`, world units) stands on a node of the giant tree: on top of its shelf fungus
   * (up = the fungus seat, the body clears the bark) or its flower stone — plane coordinates. False elsewhere.
   */
  treeSeat(index: number, radius: number, outPos: Vector3, outUp: Vector3): boolean {
    return this.treeSite?.seatFor(index, radius, outPos, outUp) ?? false;
  }

  /** Hide the giant tree's marker of node `index` while its level plateau stands there (crown levels), or none. */
  setTreeLevelNode(index: number | null): void {
    this.treeSite?.setHiddenNode(index);
  }

  /** Foot of the giant tree (plane). */
  treeFoot(out: Vector3): Vector3 {
    const s = this.treeSite?.slot;
    return s ? out.set(s.position[0], s.position[1], s.position[2]) : out.set(0, 0, 0);
  }

  /** Distance (plane, world units, saturating at ≈ 3.5) from a plane point to the giant tree's trunk, limbs and domes. */
  treeClearance(p: Vector3): number {
    return this.treeSite ? this.treeSite.path.clearance(p) : 10;
  }

  /** Keep a plane point in sight through the giant tree's curtain of hanging twigs; `null` = the current node. */
  setTreeSight(point: Vector3 | null, radius = 3): void {
    this.treeSite?.setSightOverride(point, radius);
  }

  /**
   * Look point for sky and fog (plane) — e.g. the node on the giant tree the rail camera looks at — instead of the
   * ground under the camera's centre ray (which lands on a neighbour world behind the tree). `null` = the ray.
   */
  setViewFocus(point: Vector3 | null, immediate = false): void {
    if (point) this.viewFocus.copy(point);
    this.hasViewFocus = point !== null;
    if (immediate) {
      this.focusBlend = point ? 1 : 0;
      this.viewCut = true;
    }
  }

  /** A cut (start, re-mount, jump): sky, fog and stripes switch to the new look point without a blend. */
  private viewCut = true;

  private readonly viewFocus = new Vector3();
  private hasViewFocus = false;
  /** 0 = look point from the camera ray, 1 = the focus (blended, see `update`). */
  private focusBlend = 0;

  /**
   * Clearing around the camera's foot (lateral radius in world units; MAP_VIEW.footClear by default, 0 = off), e.g.
   * smaller for close shots on the board. Changes need a shadow pass (cleared trees drop their shadows too).
   */
  setFootClear(units: number): void {
    this.world.setFootClear(units);
    this.trash?.setFootClear(units);
    this.shadowDirty = true;
  }

  /** Trash density of the start world (chunks re-scatter). */
  setTrashScale(scale: number): void {
    this.world.setTrashScale(scale);
    this.trash?.setDensity(scale);
    this.shadowDirty = true;
  }

  /**
   * Camera rail for a level node on the giant tree (plane coordinates), or null for ground nodes. The rail stays behind
   * the node, close to the bark on the trunk, higher and further out above the crown, and craning over the valley.
   */
  cameraRailFor(levelIndex: number, out?: MapRail, portrait = false): MapRail | null {
    const site = this.treeSite;
    if (!site) return null;
    const r = out ?? { position: new Vector3(), lookAt: new Vector3() };
    return site.railFor(levelIndex, r.position, r.lookAt, portrait) ? r : null;
  }

  /** Continuous rail over the whole tree stretch (t 0..1, plane) for camera moves between tree nodes. */
  sampleTreeRail(t: number, out?: MapRail, portrait = false): MapRail {
    const r = out ?? { position: new Vector3(), lookAt: new Vector3() };
    this.treeSite?.sampleRail(t, r.position, r.lookAt, portrait);
    return r;
  }

  /** Earle world under the look point (world id; ≥ 10 procedural). */
  get viewWorld(): number {
    return this.world.viewWorld;
  }

  /** Once per frame before rendering: streaming, sun/sky uniforms, world blend, billboard axes, shadow refresh. */
  update(): void {
    const now = performance.now() / 1000;
    const dt = this.lastTime < 0 ? 0 : Math.min(0.1, now - this.lastTime);
    this.lastTime = now;
    this.scene.updateMatrixWorld(true);
    this.sun.directionWorld(this.sunDirWorld.value);
    // Plane space = world axes (the plane group does not turn): the sun is the same in both
    this.world.setSunDirection(this.sunDirWorld.value);

    const camWorld = this.camera.getWorldPosition(this.tmp);
    const R = PLANET_RADIUS;
    const camR = camWorld.length();
    this.skyHorizon.value = -Math.sin(Math.acos(Math.min(1, R / Math.max(R + 0.01, camR))));
    _m.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(_m, this.camera.coordinateSystem);
    if (this.world.update(this.camera, camWorld, this.frustum)) this.shadowDirty = true;

    // World under the camera's look point drives sky, fog and stripes
    const look = _v.set(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(_q));
    const hit = raySphere(camWorld, look, R + 0.5, _w);
    let fogDist = hit ? hit.distanceTo(camWorld) : -1;
    const lookPlane = hit ? this.fromDisplay(hit, _f) : _f.set(this.world.focus.x, 0, this.world.focus.z);
    // A focus on the giant tree (rail camera): its world and its distance — the centre ray would pass the crown and
    // land on a neighbour world far behind. Blended in and out over ≈ 0.6 s
    this.focusBlend = Math.min(1, Math.max(0, this.focusBlend + (this.hasViewFocus ? dt : -dt) / 0.6));
    const wf = this.focusBlend * this.focusBlend * (3 - 2 * this.focusBlend);
    if (wf > 0) {
      const focusDisplay = this.toDisplay(this.viewFocus, _v);
      const fd = focusDisplay.distanceTo(camWorld);
      fogDist = fogDist < 0 ? fd : fogDist + (fd - fogDist) * wf;
      lookPlane.x += (this.viewFocus.x - lookPlane.x) * wf;
      lookPlane.z += (this.viewFocus.z - lookPlane.z) * wf;
    }
    if (fogDist >= 0) this.world.setFogDistance(fogDist);
    this.world.setViewPoint(lookPlane.x, lookPlane.z, this.viewCut);
    this.viewCut = false;
    if (this.world.viewBlending) this.shadowDirty = true; // neighbours fade in/out near the camera
    this.world.tickView(dt);
    followViewClouds(this.clouds, this.world, this.camera.position, this.skyHorizon.value);
    if (this.trash?.update(this.camera, camWorld, this.frustum, dt)) this.shadowDirty = true;
    this.fogStripes.layout(1, this.world.curvature.value);

    const site = this.treeSite;
    if (site) {
      const treeWasVisible = site.holder.visible;
      site.update(dt, this.camera, this.sunDirWorld.value, camWorld, this.frustum);
      if (site.holder.visible !== treeWasVisible) this.shadowDirty = true;
    }

    if (this.shadowDirty) {
      const treeH = site?.holder.visible ? site.height + 1 : 0;
      this.sun.setCasterHeight(Math.max(this.world.hTotal, treeH, this.world.terrainTop + (this.trash?.hMax ?? 0) + 1));
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
  }

  dispose(): void {
    this.fogStripes.dispose();
    this.clouds.dispose();
    this.treeSite?.dispose();
    this.trash?.dispose();
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

const pathColorCache = new Map<string, PathWorldColors>();

/**
 * Path colours of an Earle world from its palette: ink for contact shadows, the most saturated mid-light accent as
 * the flower petal (Earle's single accent), red rust towers as rock where the world has a monolith row, otherwise
 * rock from the terrain's dark steps; sand from the lightest terrain step, pool water from ink and sky.
 */
export function worldPathColors(p: WorldPalette, key?: string): PathWorldColors {
  const cached = key ? pathColorCache.get(key) : undefined;
  if (cached) return cached;
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
  if (key) {
    if (pathColorCache.size > 256) pathColorCache.clear();
    pathColorCache.set(key, colors);
  }
  return colors;
}

/** Nearest intersection point of a ray with the sphere of radius r around the origin, or null. */
function raySphere(origin: Vector3, dir: Vector3, r: number, out: Vector3): Vector3 | null {
  const b = origin.dot(dir);
  const c = origin.lengthSq() - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0) return null;
  return out.copy(origin).addScaledVector(dir, t);
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

/** Palette context of the path visuals on the infinite world (see `MapWorld.pathPalette`); `shadowTint` tints the stones' shadows per world slot. */
export function planetPathPalette(world: EarlePlanet, shadowTint: PathPalette['shadowTint'] = null): PathPalette {
  return {
    lookup: world.lookup,
    fog: world.fog,
    bands: world.terrainBands,
    // Welten mit Nebelmeer (Welt 12): das Band liegt im Nebel und nimmt dessen Farben (Wasserzeile), nicht das Gelände
    terrainRow: (w) => (world.catalog.spec(w).mist?.sea ? world.rowsOfWorld(w).water : world.rowsOfWorld(w).terrain),
    colors: (w) => worldPathColors(world.worldData(w).palette, world.worldData(w).id),
    shadowTint,
  };
}
