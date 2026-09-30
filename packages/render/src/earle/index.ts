/** P2 Earle-Lab: EarleMaterial, Schattenfilter, Vegetation-Instancing, Himmel/Nebel, zehn Welten. Besitzer: P2-Agent. */
export const RENDER_EARLE = true;

export {
  PaletteAtlas,
  TJORIZO_PALETTE,
  addZonePalette,
  addWorldPalette,
  hexToRgb8,
  mixRgb,
  skySunIndices,
  worldPaletteFromZone,
  zonePaletteFromContent,
  type PaletteRowSpec,
  type WorldPalette,
  type WorldRows,
  type ZoneContentPalette,
  type ZonePalette,
  type ZoneRows,
} from './palette';
// `aaStep` und die Node-Typaliase bleiben paketintern (common/ exportiert gleichnamige Helfer).
export { PaletteLookup, createFogSettings, steppedFog, patternSpeed, type FogSettings, type TSLUniform } from './tsl';
export { EarleMaterial, type EarleGradient, type EarleMaterialOptions, type EarlePattern } from './EarleMaterial';
export { earleGradients, setGradientAmount, stepRamp, shiftTone, mixInk, STEP_GRADIENT, SAW_GRADIENT } from './gradients';
export { SunRig, createHardShadowFilter, displayShadowReceivers, displayShadowWarp, type ShadowDisplayLike, type SunOptions } from './hardShadow';
export { EarleVegetation, TREE_KINDS, CANOPY_KINDS, createBareTreeGeometry, type VegetationOptions } from './vegetation';
export { PlanetVegetation, GROWTH_SLOTS, CANOPY_MESHES, createPropGeometry, type CanopyMesh, type PlanetVegetationOptions, type VegetationTreeEntry, type VegetationPropEntry, type VegetationWorldRows } from './planetVegetation';
export { EarlePlanet, FOG_REFERENCE_DISTANCE, PLANET_SHADOW_LAYER, proceduralWorld, type EarlePlanetOptions, type EarlePlanetQuality, type EarlePlanetWorld, type GroundTreatment, type PathCorridor, type WorldView } from './planet';
export { DisplayMapping } from './display';
export { WorldSlots, SLOT_COUNT, SLOT_ROWS, PLANET_ATLAS_HEIGHT, slotLandmarkRows, slotRows, slotOfRow, writeSlotPalette } from './worldSlots';
export { proceduralPalette, hexToOklab, oklabToHex, type PaletteRecipe } from './proceduralPalette';
export { FogStripes, createSkyDome, type FogStripeOptions, type SkyDomeOptions } from './skyFog';
export { CloudBanks, cloudGeometry, followViewClouds, type CloudBankSpec, type CloudBanksOptions, type CloudHost, type CloudLayerSpec } from './sky/cloudBanks';
