/** P2 Earle-Lab: EarleMaterial, Schattenfilter, Vegetation-Instancing, Himmel/Nebel. Besitzer: P2-Agent. */
export const RENDER_EARLE = true;

export {
  PaletteAtlas,
  TJORIZO_PALETTE,
  addZonePalette,
  hexToRgb8,
  skySunIndices,
  zonePaletteFromContent,
  type PaletteRowSpec,
  type ZoneContentPalette,
  type ZonePalette,
  type ZoneRows,
} from './palette';
// `aaStep` und die Node-Typaliase bleiben paketintern (common/ exportiert gleichnamige Helfer).
export { PaletteLookup, createFogSettings, steppedFog, type FogSettings, type TSLUniform } from './tsl';
export { EarleMaterial, type EarleMaterialOptions } from './EarleMaterial';
export { SunRig, createHardShadowFilter, type SunOptions } from './hardShadow';
export { EarleVegetation, TREE_KINDS, type VegetationOptions } from './vegetation';
export { PlanetVegetation, GROWTH_SLOTS, type PlanetVegetationOptions, type VegetationTreeEntry, type VegetationPropEntry } from './planetVegetation';
export { EarlePlanet, type EarlePlanetOptions, type EarlePlanetQuality, type EarlePlanetZone } from './planet';
export { FogStripes, createSkyDome, type FogStripeOptions, type SkyDomeOptions } from './skyFog';
