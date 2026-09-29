/**
 * Riesenbaum (Earle-Wahrzeichen): `createHeroTree(options)` liefert Gruppe, Update-Hooks, Schattencaster und den
 * Levelpfad; `heroTreePath({ nodes })` allein liefert Knoten, Punkte und Kameraschiene (ohne GPU-Objekte) für die
 * Karte; `transformHeroTreePath` überträgt ihn in den Raum eines Landmark-Slots.
 * Besitzer: P2d-Agent (Baum, Blüten, Kronenpfad).
 */
export const RENDER_TREE = true;

export { createHeroTree, type HeroTree, type HeroTreeOptions, type HeroTreePart, type HeroTreeStats, type TreeQuality } from './heroTree';
export {
  heroTreePath,
  transformHeroTreePath,
  type HeroPathDot,
  type HeroPathNode,
  type HeroPathPhase,
  type HeroRailSample,
  type HeroTreePath,
  type HeroTreePathOptions,
} from './treePath';
export { computeTreeShape, layoutCrown, type CrownLayoutSpec, type Dome, type TreeShape, type TreeShapeOptions } from './shape';
export {
  BARK_PALETTE,
  BLOSSOM_CENTER_PALETTE,
  BLOSSOM_PALETTE,
  CANOPY_FAMILIES,
  FAMILY_PALETTES,
  LICHEN_PALETTE,
  SOLID_FAMILIES,
  STAR_PALETTE,
  addTreePalette,
  type CanopyFamily,
  type FamilyPalette,
  type SolidFamily,
  type TreePaletteRows,
} from './palette';
export { InkMaterial, type InkMaterialOptions } from './inkMaterial';
export { createBarkShade, type BarkShadeOptions } from './bark';
export { buildTrunk, trunkProfile, type RootLine, type TrunkBuild, type TrunkProfile, type TrunkSpec } from './trunk';
export { growSkeleton, type BranchSegment, type BranchTip, type Skeleton, type SkeletonSpec } from './lsystem';
export { createBranchMesh, createStarGlyph, createStarMesh, popScale, type BillboardUniforms, type StarInstance } from './branches';
export { createCanopy, createGlyphGeometry, type Canopy, type CanopyOptions, type CanopyQuality } from './canopy';
