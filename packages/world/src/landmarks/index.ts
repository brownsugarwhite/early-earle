/**
 * Landmarks on the infinite plane (ADR 0002): rock with a waterfall (+ cliff step, twin falls), tall ruin, green
 * swamp. Pure data, deterministic; the renderer lives in `@ee/render/earle/landmarks/set/`.
 *
 * **API for the region planner / level path** (plane coordinates: x lateral, y up, z along the path, forward = −z):
 *
 * 1. `planLandmarks(region, seed, params, env)` → `LandmarkPlacement[]` — jittered-grid planning, ownership by centre
 *    (pieces of a region give exactly the union, no seams); `env.heightAt` is required, `isWater`, `isBlocked`,
 *    `pathDistance`, `pathDirection`, `worldAt` are optional callbacks. `DEFAULT_LANDMARK_PLAN` holds tuned defaults
 *    (swamps × 3 in worlds 09 and 02). `planningRegionFor(chunk, params)` + `landmarksTouching(...)` find the
 *    landmarks a chunk must draw or carve.
 * 2. `placeLandmark(placement, heightAt, { detail })` → `LandmarkInstance`: the blueprint built on the real terrain,
 *    plus in plane coordinates:
 *    - `anchors`: `{ id, landmark, kind: 'plateau' | 'terrace' | 'island', position, normal, radius (≥ 4.5), height,
 *      facing, site: 'ledge' | 'ruin' | 'island' }` — the level board stands at `position`, the level camera comes
 *      from `facing`;
 *    - `route.ascent` / `route.descent`: waypoints `{ position, normal, kind, width }` ground → steps/stairs → top and
 *      top → steps/rubble/stones → ground (the level path's dots lie on them);
 *    - `connections`: pool outlets `{ position, direction, width, level }` where rivers can join.
 * 3. Terrain: `landmarkGround(instances, x, z, h)` carves pools, streams and swamp ponds into the height field;
 *    `landmarkWaterAt`, `landmarkSurfaceAt` (walkable top), `landmarkBlocks` (for tree/prop/trash scattering).
 */
export * from './types';
export { FOOT_SINK, SHORE_SAMPLES, pondField, prismPeak, prismTopAt, shoreAt, wallAxis, wallCorners, wallPoint } from './shapes';
export { MIN_PLATEAU_RADIUS, buildCliffFall, buildFallsRock, buildTwinFalls, mirrorBlueprint, type RockOptions } from './rock';
export { buildRuin, lancetHeight, type RuinOptions } from './ruin';
export { buildSwamp, swampWater, type SwampOptions } from './swamp';
export {
  carveHit,
  carveLocal,
  dirToWorld,
  instanceOf,
  landmarkBlocks,
  landmarkBlueprint,
  landmarkGround,
  landmarkSurfaceAt,
  landmarkWaterAt,
  localGround,
  placeLandmark,
  toLocal,
  toWorld,
  type BlueprintOptions,
} from './blueprint';
export { DEFAULT_LANDMARK_PLAN, LANDMARK_RADIUS, checkLandmarkSite, landmarksTouching, planLandmarks, planningRegionFor, terrainRelief, type RejectReason } from './placement';
