/**
 * Müll v2 und neongrüner Nebelschleier (Besitzer: Müll-Agent). Import über `@ee/render/earle/trash/index.ts`,
 * die gemeinsamen Index-Dateien bleiben unberührt.
 */
export { TrashField, type TrashFieldOptions, type TrashPlanetLike, type TrashQuality, type TrashWorldSpec } from './TrashField';
export { TrashPalette, TRASH_MATERIALS, isTrashStyle, type TrashStyle, type TrashMaterialName } from './palette';
export { TrashMaterial, type TrashMaterialOptions } from './material';
export { createBigTrashGeometry, createBlockGeometry, createGooGeometry, createRingGeometry, createTubeGeometry } from './geometry';
