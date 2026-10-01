/**
 * Unendliche Ebene (ADR 0002): Datenmodell der Karte. Die Kugel ist nur die Anzeige um den Blickpunkt (`@ee/render`).
 */
export { GradientNoise2, hash2 } from './noise2';
export { WorldLayout, LATERAL_WORLD_BASE, PROLOGUE_WORLD_BASE, cellIndex, type LayoutParams, type PathSegment, type Region, type RegionKind, type RegionSample, type RouteEntry } from './layout';
export { WorldCatalog } from './catalog';
export { proceduralRecipe, proceduralWorldSpec, type ProceduralRecipe } from './procedural';
export { PlaneField, isTreeKind, type PlaneFieldParams, type ResolvedShape } from './field';
export { planeComposeGroveTree, planeGroveMask, type PlaneGroveField } from './grove';
export {
  CHUNK_SIZE,
  SKIRT_DEPTH,
  PROP_FOOTPRINT,
  chunkAt,
  chunkKeyOf,
  chunkMeshHeightAt,
  generatePlaneChunk,
  scatterPlaneProps,
  scatterPlaneTrees,
  type ChunkCoord,
  type PlaneChunkMesh,
  type PlaneScatterOptions,
} from './chunks';
export {
  PlanePath,
  type NodeSite,
  type PlanePathDot,
  type PlanePathNode,
  type PlanePathOptions,
  type PlanePathProvider,
  type PlanePathSegment,
  type PlaneRibbonSample,
  type PlaneRouteSample,
} from './path';
export {
  NO_WATER as PLANE_NO_WATER,
  PlaneFeatures,
  SnowFields as PlaneSnowFields,
  WATER_BED as PLANE_WATER_BED,
  WATER_OVERLAP as PLANE_WATER_OVERLAP,
  SHORE_E as PLANE_SHORE_E,
  carve as planeCarve,
  columnAt as planeColumnAt,
  columnPeak as planeColumnPeak,
  columnTopAt as planeColumnTopAt,
  lakeAt as planeLakeAt,
  lakeRadiusAt as planeLakeRadiusAt,
  riverSegmentAt as planeRiverSegmentAt,
  pathDistance as planePathDistance,
  type RegionFeatures,
  type RegionProvider,
  type PlaneFeatureHost,
  type RegionSite,
} from './features/index';
export type {
  FeatureSample as PlaneFeatureSample,
  Lake as PlaneLake,
  LedgeAnchor as PlaneLedgeAnchor,
  River as PlaneRiver,
  RockColumn as PlaneRockColumn,
  RockFormation as PlaneRockFormation,
} from './features/types';
export type {
  CanopyMotif,
  FocalSpec,
  LandmarkSlot as PlaneLandmarkSlot,
  PlanetLandmarkParams as PlaneLandmarkParams,
  PlanetProp as PlaneProp,
  PlanetPropKind as PlanePropKind,
  PlanetPropSpec as PlanePropSpec,
  PlanetTerrainShape as PlaneTerrainShape,
  PlanetTree as PlaneTree,
  PlanetVegetationFamily as PlaneVegetationFamily,
  TrunkStyle as PlaneTrunkStyle,
  WorldSpec,
} from './types';
export { PlaneTrashPlanner, type PlaneChunkTrash, type PlaneTrashContext, type PlaneTrashNode, type PlaneVeilGrid } from './trash';
