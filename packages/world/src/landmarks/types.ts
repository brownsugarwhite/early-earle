/**
 * Landmarks (Wahrzeichen) on the infinite plane (ADR 0002): tall Earle set pieces a level can be played on — the rock
 * with a waterfall and its variants, the tall ruin, the green swamp with an island.
 *
 * Coordinates: plane space, x = lateral, y = up, z = along the path (forward = −z), world units. A landmark is built
 * in its own local frame (origin on the ground at its centre, local +z = its front, the side the incoming path and
 * the camera see) and placed with a yaw about +y.
 *
 * Everything here is pure data (no three.js), deterministic per seed.
 */

/** Plane point (x, y, z). */
export type P3 = [number, number, number];
/** Plane point on the ground (x, z). */
export type P2 = [number, number];

/**
 * Landmark kinds:
 * - `fallsRock`: towering basalt massif, level plateau on top, a waterfall from a cleft in a crag into a pool at the
 *   foot, a stair of basalt columns spiralling up (Ebene 12/25/44/45);
 * - `cliffFall`: a broad, lower rock step with a smaller fall out of the front wall;
 * - `twinFalls`: a massif with two crags and two falls framing a frontal column stair;
 * - `ruin`: a tall gothic ruin growing out of rock (a battered keep carrying the level terrace, a stair winding up
 *   its wall, leaning lancet walls with broken tops, a half-collapsed arch, a spire tower, buttresses, a tree growing
 *   out of the top, vines and dome bushes — Ebene 22, the Sleeping-Beauty backgrounds);
 * - `swamp`: green marsh ponds with lily pads, reeds, gas bubbles and a hummock island for a level (start worlds).
 */
export type LandmarkKind = 'fallsRock' | 'cliffFall' | 'twinFalls' | 'ruin' | 'swamp';

export const LANDMARK_KINDS: readonly LandmarkKind[] = ['fallsRock', 'cliffFall', 'twinFalls', 'ruin', 'swamp'];

/** Terrain height relative to the landmark's reference height, in landmark-local coordinates. */
export type LocalGround = (x: number, z: number) => number;

// ------------------------------------------------------------------------------------------------ geometry parts

/**
 * Surface family of a prism (material code): basalt column (vertical striations, moss caps), crag (striations plus
 * Earle's zigzag glyph bands, towering), wet rock (dark streaks beside a fall), cut stone (ruin masonry: fine
 * vertical strokes, a few irregular joints, lichen on the lit top edge), rubble (tumbled ruin blocks), roof (the
 * tower's spire, dark slate), island (swamp hummock: meadow cap, earthy walls), bark (snags and the ruin's tree: dark
 * wood with fine grain).
 */
export type PrismSurface = 'basalt' | 'crag' | 'wet' | 'stone' | 'rubble' | 'roof' | 'island' | 'bark';

export const PRISM_SURFACES: readonly PrismSurface[] = ['basalt', 'crag', 'wet', 'stone', 'rubble', 'roof', 'island', 'bark'];
export const PRISM_CAPS: readonly PrismCap[] = ['moss', 'plateau', 'facet', 'cut', 'broken'];

/**
 * Cap of a prism: `moss` flat walkable top in the moss colour (steps), `plateau` the level top (flat, lighter meadow
 * tone), `facet` a sloped rock facet in light bands (crags, spires with an apex), `cut` cut stone (ruin), `broken`
 * jagged stone (ruin wall stubs, tower crown).
 */
export type PrismCap = 'moss' | 'plateau' | 'facet' | 'cut' | 'broken';

/** A faceted column (basalt, crag, stone block): walls from `y0` to the top ring, flat or sloped top, optional apex. */
export interface Prism {
  /** Foot polygon (x, z), counter-clockwise seen from above. */
  base: P2[];
  /** Top polygon, same vertex count (tapered or offset). */
  top: P2[];
  /** Foot height (sunk below the lowest ground under the foot). */
  y0: number;
  /** Top height at the top polygon's centroid. */
  y1: number;
  /** Slope of the top: dy/dx, dy/dz around the centroid (0, 0 = level). */
  tilt: P2;
  /** Spire: apex height above the top centroid (0 = flat top). */
  apex: number;
  /** Apex offset (x, z) from the top centroid. */
  apexOffset: P2;
  /**
   * Per-vertex top heights (jagged crowns, broken walls): offsets added to the top ring, same count as `top`. Empty =
   * a clean top.
   */
  jag: number[];
  surface: PrismSurface;
  cap: PrismCap;
  /** Role for tests/tools: plateau, step, skirt, crag, spire, buttress, terrace, stair, tower, wall, rubble, island … */
  role: string;
  /** Pattern phase 0..1 (deterministic). */
  variant: number;
  /** Lancet windows painted into wall faces (stone only, at most one per face). */
  lancets?: LancetSpec[];
}

/**
 * A lancet window painted into one wall face of a prism as an ink shape (Ebene 22's turret slits, a blind portal):
 * face `face` is the wall from `base[face]` to `base[face + 1]`; the window is centred `s` from the face's middle
 * (along that edge), `width` wide, from `sill` up to its pointed `apex` (local heights).
 */
export interface LancetSpec {
  face: number;
  s: number;
  width: number;
  sill: number;
  apex: number;
}

/** A waterfall: a curved water sheet along a polyline, source (in a cleft) → impact (in a pool). */
export interface FallSpec {
  /** Centreline, source → impact (local). */
  path: P3[];
  /** Sheet width at each path point. */
  widths: number[];
  /** Horizontal direction the sheet faces (unit, outward from the rock). */
  facing: P2;
  /** Impact point on the pool surface. */
  impact: P3;
  /** Thin side threads: offset across (share of the half width), start along the fall (0..1), width, speed factor. */
  threads: Array<{ offset: number; start: number; width: number; speed: number }>;
  /** Pool index the fall pours into. */
  pool: number;
  /** 0..1: small fall … big fall (spray amount, mist size). */
  volume: number;
}

/** A pool at the foot of a fall (flat water at `level`, wobbly shore) with an optional outlet stream. */
export interface PoolSpec {
  center: P2;
  level: number;
  /** Mean radius. */
  radius: number;
  /** Shore radius factors for `SHORE_SAMPLES` directions (angle = i / n · 2π from +x toward +z). */
  shore: number[];
  /** Outlet stream (from inside the pool outward) with widths; its last point is where rivers connect. */
  outlet: { path: P3[]; widths: number[] } | null;
}

/** A puff of mist at a fall's foot (flattened ellipsoid, stepped value tier 0 low/cool … 2 high/light). */
export interface MistPuff {
  center: P3;
  radius: number;
  /** Vertical squash (height / radius). */
  squash: number;
  tier: number;
  phase: number;
}

/**
 * A tracery wall of the ruin (Ebene 22's broken arch, the Sleeping-Beauty nave walls): a stone slab along the foot
 * line `from` → `to`, `depth` thick. Its shape is drawn in the wall's own plane — `s` along the foot line (0 …
 * length), `h` up from the floor `y` (negative = sunk into the floor) — as an outline with a broken top, pierced by
 * lancet openings (holes). The slab leans outward along `normal` by `lean` per unit of height.
 */
export interface WallSpec {
  from: P2;
  to: P2;
  /** Outward side (unit, xz, perpendicular to from → to): the slab leans this way. */
  normal: P2;
  /** Height of the floor the outline's h = 0 stands on. */
  y: number;
  depth: number;
  /** Closed outline in (s, h), counter-clockwise; its lowest points reach below the floor (sunk foot). */
  outline: P2[];
  /** Openings cut through the slab (lancet windows), closed polygons in (s, h) inside the outline. */
  holes: P2[][];
  /** Horizontal offset along `normal` per unit of height (0 = plumb). */
  lean: number;
  /** Role for tests/tools: nave, arch, pier … */
  role: string;
  /** Pattern phase 0..1 (deterministic). */
  variant: number;
}

/** A vine (thorn creeper, Ebene 22): a polyline climbing a surface, with curls; drawn as a thin ink ribbon. */
export interface VineSpec {
  path: P3[];
  /** Outward normal of the surface it climbs (the ribbon lies flat on it). */
  normal: P3;
  width: number;
}

/** An Earle dome bush (flattened sphere, dotted lit rim). */
export interface BushSpec {
  center: P3;
  radius: number;
  squash: number;
  /** 0..1 tone within the canopy row. */
  tone: number;
}

/** Swamp parts: ponds (smooth union of circles), lily pads, reeds, bubbles, hummocks, stepping stones, snags. */
export interface SwampParts {
  level: number;
  /** Pond circles (x, z, r); water where the smooth union field is > 0. */
  ponds: Array<[number, number, number]>;
  /** Blend distance of the smooth union. */
  blend: number;
  /** Island in the middle (radius, top height); radius 0 = none. */
  island: { radius: number; top: number };
  /** Outer radius of the swamp (bank treatment fades out there). */
  radius: number;
  pads: Array<{ x: number; z: number; r: number; rot: number; notch: number; flower: number }>;
  reeds: Array<{ x: number; z: number; height: number; lean: number; phase: number; blades: number }>;
  bubbles: Array<{ x: number; z: number; rate: number; phase: number; size: number }>;
  hummocks: BushSpec[];
  stones: Array<{ x: number; z: number; r: number; y: number }>;
  snags: Array<{ x: number; z: number; height: number; lean: P2; branches: number; seed: number }>;
}

// ------------------------------------------------------------------------------------------------ level hooks

/**
 * Where a level board can stand on a landmark: the flat top (`position` = centre on the surface, `normal` up),
 * `radius` = usable flat radius (≥ 4.5: the whole board incl. its skirt), `height` = top above the surrounding
 * ground, `facing` = the open side (the level camera comes from there; nothing rises above the top on that side).
 */
export interface LandmarkAnchor {
  id: string;
  /** Id of the landmark instance. */
  landmark: string;
  kind: 'plateau' | 'terrace' | 'island';
  position: P3;
  normal: P3;
  radius: number;
  height: number;
  facing: P2;
  /**
   * Plateau style hint for the flow (`NodeSite`-like): `ledge` rock top (moss), `ruin` cut stone terrace, `island`
   * swamp hummock (meadow in a pool).
   */
  site: 'ledge' | 'ruin' | 'island';
}

/** A point of the walkable route onto and off a landmark (the level path's dots lie on these). */
export interface LandmarkWaypoint {
  position: P3;
  normal: P3;
  kind: 'ground' | 'step' | 'stair' | 'landing' | 'rubble' | 'stone' | 'top';
  /** Walkable width across the route. */
  width: number;
}

/** Ascent (ground → top) and descent (top → ground) of a landmark. Both start/end on the ground outside the footprint. */
export interface LandmarkRoute {
  ascent: LandmarkWaypoint[];
  descent: LandmarkWaypoint[];
}

/** Where a river can connect (a pool's outlet end), plane/local coordinates. */
export interface WaterConnection {
  position: P3;
  /** Flow direction (unit, xz) at the end. */
  direction: P2;
  width: number;
  level: number;
}

/**
 * Terrain treatment under a landmark (pools and swamp ponds carve basins; `landmarkGround` applies them): a circle
 * with a wobbly shore (`shore` factors like `PoolSpec.shore`) or a stream band, water at `level`.
 */
export type CarveShape =
  | { kind: 'pool'; center: P2; radius: number; shore: number[]; level: number; bank: number }
  | { kind: 'stream'; path: P3[]; widths: number[]; bank: number }
  | { kind: 'swamp'; ponds: Array<[number, number, number]>; blend: number; level: number; bank: number; radius: number; island: { radius: number; top: number } };

// ------------------------------------------------------------------------------------------------ blueprint

/**
 * Local build plan of one landmark (origin on the ground at its centre, +z = front). The renderer turns it into
 * meshes; the planners read anchors, route, carves and connections.
 */
export interface LandmarkBlueprint {
  kind: LandmarkKind;
  seed: number;
  /** Footprint radius (everything incl. pools, steps and bushes). */
  radius: number;
  /** Highest point above the reference ground. */
  height: number;
  prisms: Prism[];
  falls: FallSpec[];
  pools: PoolSpec[];
  mist: MistPuff[];
  /** Tracery walls (ruin). */
  walls: WallSpec[];
  vines: VineSpec[];
  bushes: BushSpec[];
  swamp: SwampParts | null;
  anchors: Array<Omit<LandmarkAnchor, 'landmark' | 'id'> & { id: string }>;
  route: LandmarkRoute;
  carves: CarveShape[];
  connections: WaterConnection[];
}

// ------------------------------------------------------------------------------------------------ placement

/** A planned landmark on the plane. `id` is stable (kind + grid cell), independent of the queried region. */
export interface LandmarkPlacement {
  id: string;
  kind: LandmarkKind;
  x: number;
  z: number;
  /** Reference ground height (terrain at the centre). */
  y: number;
  /** Rotation about +y: local +z (front) points to (sin yaw, cos yaw) on the plane. */
  yaw: number;
  seed: number;
  /** Footprint radius (planning estimate, the blueprint's `radius` is exact). */
  radius: number;
  /** Earle world at the centre (from `env.worldAt`), −1 if unknown. */
  world: number;
}

/** A placed landmark: placement + blueprint + everything the planners need, in plane coordinates. */
export interface LandmarkInstance {
  placement: LandmarkPlacement;
  blueprint: LandmarkBlueprint;
  anchors: LandmarkAnchor[];
  route: LandmarkRoute;
  connections: WaterConnection[];
}

/** Axis-aligned region on the plane (a chunk or a planning region). */
export interface LandmarkRegion {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/** Callbacks into the world (plane coordinates). Everything but `heightAt` is optional. */
export interface LandmarkEnv {
  heightAt(x: number, z: number): number;
  /** Lake/river at (x, z) (or within `margin` of its shore). */
  isWater?(x: number, z: number, margin: number): boolean;
  /** Occupied by something else (giant tree, rock formation, trash mountain …) within `radius`. */
  isBlocked?(x: number, z: number, radius: number): boolean;
  /** Distance to the level path's centreline (≥ 0). Landmarks keep off the path and hero kinds stay near it. */
  pathDistance?(x: number, z: number): number;
  /** Direction (unit, xz) from (x, z) toward the nearest path point — hero landmarks turn their front to it. */
  pathDirection?(x: number, z: number): P2 | null;
  /** Earle world index at (x, z) (weights per world, e.g. swamps in the start worlds). */
  worldAt?(x: number, z: number): number;
}

/** Per-kind planning parameters. */
export interface LandmarkKindParams {
  /** Relative frequency. */
  weight: number;
  /** Allowed distance of the centre to the level path [min, max] (only with `env.pathDistance`). */
  pathDistance?: P2;
  /** Maximum terrain slope (rise/run) sampled over the footprint. */
  maxSlope?: number;
  /** Maximum terrain relief (max − min height) over the footprint. */
  maxRelief?: number;
}

export interface LandmarkPlanParams {
  /** Grid cell (world units): at most one landmark per cell; the jitter keeps centres ≥ `cell · (1 − 2·jitter)` apart. */
  cell: number;
  /** Share of cells that try to hold a landmark (0..1). */
  density: number;
  /** Jitter of the centre inside its cell (share of the cell, ≤ 0.3). */
  jitter?: number;
  kinds: Partial<Record<LandmarkKind, LandmarkKindParams>>;
  /** Weight multipliers per Earle world (e.g. world 09, the start: swamps × 3). */
  worldWeights?: (world: number) => Partial<Record<LandmarkKind, number>>;
  /** Candidate positions tried per cell. */
  tries?: number;
  /** Keep this far from water (world units, added to the footprint). */
  waterMargin?: number;
}
