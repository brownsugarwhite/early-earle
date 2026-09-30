/**
 * Landmark renderer (Wahrzeichen): rock with waterfall, cliff step, twin falls, tall ruin, green swamp — built from
 * the `@ee/world` blueprints (`placeLandmark`) into a few merged meshes per region. Entry point: `LandmarkSet`.
 */
export { LandmarkSet, type LandmarkQuality, type LandmarkSetOptions, type LandmarkSetStats } from './LandmarkSet';
export { LANDMARK_ROLES, addLandmarkPalette, landmarkPaletteFromWorld, type LandmarkPalette, type LandmarkRows } from './palette';
export { createLandmarkUniforms, type LandmarkMaterialContext, type LandmarkUniforms } from './context';
export { GeoBuffer, framePoint, type LandmarkFrame } from './buffers';
export { landmarkPlateauStyle } from './plateauStyle';
