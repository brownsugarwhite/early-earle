/**
 * Schatten v3 (auf v2/P2e): kamera- und bodengefittete, nicht-quadratische Kaskaden + B-Spline-Kantenrekonstruktion für
 * Earle-Tintenschatten, Kontakt (Werfer-Mindestbreite, Kontaktversatz, Empfängerebenen-Bias), glatter Schattenwert für
 * Konsumenten (`SunRig.shadowFactor`) und Schattentönung je Welt (`SunRig.shadowTint`).
 * Einstieg für Konsumenten ist `SunRig` (`earle/hardShadow.ts`): `fitToView(camera, receivers)` / `fitToPlanet(...)`.
 */
export { CascadedShadows, type CascadedShadowStats, type CascadeStats, type ViewReceivers, type CascadedShadowsOptions, type CascadeSampleOptions } from './CascadedShadows';
export { bsplineField, createDefaultShadowFilter, createDepthCompare, createDepthCompareZ, createEarleShadowFilter, createShadowFrameUniforms, flatNormalWorld, planeDepthGradient, receiverDepth, thresholdField, type DepthCompareFn, type DepthCompareZFn, type ReceiverPlaneSource, type ShadowTaps, type ShadowFrameUniforms, type ShadowFilterOptions } from './filters';
export { needsManualDepthCompare, resolveManualCompare, setWebglShadowCompareOverride, webglShadowCompareWorks, type ManualCompareOption } from './webglCompat';
export { CascadeFitter, createFitResult, quantizeTexel, splitDistances, type CascadeFit, type CascadeSize, type FitInput, type FitResult, type ClipBoxSpec, type ReceiverShellSpec, type ReceiverSlabSpec, type ReceiverVolume } from './fit';
export { SHADOW_CASCADE_PRESETS, cascadePresetForMapSize, planetShadowReceivers, type ShadowCascadePreset, type ShadowPlanetLike, type SunViewReceivers } from '../earle/hardShadow';
export { ShadowFactorNode, shadowFactorNode, type ShadowFactorSource } from './shadowFactor';
export { depthCompareLevel } from './compareLevel';
export { ShadowTint } from './shadowTint';
export { PlanetVolumeCollector, coverFromBoxes, VOLUME_CELL_SIZE, MAX_VOLUME_CELLS, MAX_VOLUME_INSTANCES, type SphereCover, type VolumePlanetLike } from './volumes';
export { PLANET_COVER_TOLERANCE, type PlanetReceiverOptions } from '../earle/hardShadow';
