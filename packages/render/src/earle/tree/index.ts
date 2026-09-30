/**
 * Giant tree (Earle landmark, v3): `createHeroTree(options)` returns the group, update hooks, shadow casters and the
 * level path; `heroTreePath({ nodes })` alone returns nodes (lying on bark and domes), dots, camera rail, colliders
 * and the exit without GPU objects; `transformHeroTreePath` moves it into a landmark slot's space;
 * `createHeroPathMarkers` renders the path on the tree (shelf fungi on the bark, stones on the domes).
 * Owner: giant tree agent (tree, blossoms, rail).
 */
export const RENDER_TREE = true;

export {
  createHeroTree,
  type HeroTree,
  type HeroTreeOptions,
  type HeroTreePart,
  type HeroTreeStats,
  type TreeQuality,
} from './heroTree';
export {
  HERO_CLEARANCE_REACH,
  HERO_NODE_MOTION,
  heroNodeAngle,
  heroNodeScale,
  heroTreePath,
  transformHeroTreePath,
  type HeroCollider,
  type HeroNodeMotion,
  type HeroPathDot,
  type HeroPathNode,
  type HeroPathPhase,
  type HeroRailSample,
  type HeroSurface,
  type HeroTreePath,
  type HeroTreePathOptions,
} from './treePath';
export { createHeroPathMarkers, type HeroPathMarkers, type HeroPathMarkerOptions } from './pathMarkers';
export { computeTreeShape, type Dome, type Limb, type LimbKind, type NeedleSite, type PathPlan, type TreeShape, type TreeShapeOptions, type Twig } from './shape';
export {
  BARK_EDGE,
  BARK_PALETTE,
  BARK_RED,
  BLOSSOM_CENTER_PALETTE,
  BLOSSOM_PALETTE,
  CANOPY_FAMILIES,
  DOME_FAMILIES,
  JEWEL_BARK_PALETTE,
  LACE_PALETTE,
  LICHEN_PALETTE,
  MOTIF_PALETTE,
  SNOW_PALETTE,
  SOLID_FAMILIES,
  STAR_PALETTE,
  TREE_PALETTE_ROWS,
  addTreePalette,
  familyTone,
  type CanopyFamily,
  type DomeFamily,
  type SolidFamily,
  type TreePaletteRows,
} from './palette';
export { InkMaterial, type InkMaterialOptions } from './inkMaterial';
export { createBarkShade, valueNoise3, type BarkShadeOptions, type BarkStyle } from './bark';
export { driftHeight, trunkProfile, type TrunkProfile, type TrunkSpec } from './trunk';
export { buildWood, type WoodBuild, type WoodOptions } from './wood';
export { catmullRom, makeTube, resample, transportFrames, tubeLength, tubePointAt, tubeRadiusAt, tubeTangentAt, type TubeCurve } from './curve';
export { createLaceMesh, createStarGlyph, createStarMesh, popScale, type BillboardUniforms, type CountLodMesh } from './branches';
export { createCanopy, type Canopy, type CanopyOptions, type CanopyQuality } from './canopy';
