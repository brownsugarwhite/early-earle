/** P2 Earle-Lab: EarleMaterial, Schattenfilter, Vegetation-Instancing, Himmel/Nebel. Besitzer: P2-Agent. */
export const RENDER_EARLE = true;

export {
  PaletteAtlas,
  TJORIZO_PALETTE,
  addZonePalette,
  hexToRgb8,
  skySunIndices,
  type PaletteRowSpec,
  type ZonePalette,
  type ZoneRows,
} from './palette';
// `aaStep` und die Node-Typaliase bleiben paketintern (common/ exportiert gleichnamige Helfer).
export { PaletteLookup, createFogSettings, steppedFog, type FogSettings, type TSLUniform } from './tsl';
export { EarleMaterial, type EarleMaterialOptions } from './EarleMaterial';
export { SunRig, hardShadowFilter, type SunOptions } from './hardShadow';
export { EarleVegetation, type VegetationOptions } from './vegetation';
export { FogStripes, createSkyDome, type FogStripeOptions, type SkyDomeOptions } from './skyFog';
