/**
 * Shadows v2 (P2e): kamera-gefittete, nicht-quadratische Kaskaden + B-Spline-Kantenrekonstruktion für
 * Earle-Tintenschatten. Einstieg für Konsumenten ist `SunRig` (`earle/hardShadow.ts`): `fitToView(camera, receivers)`.
 */
export { CascadedShadows, type CascadedShadowStats, type CascadeStats, type ViewReceivers, type CascadedShadowsOptions } from './CascadedShadows';
export { createEarleShadowFilter, createShadowFrameUniforms, thresholdField, type ShadowTaps, type ShadowFrameUniforms, type ShadowFilterOptions } from './filters';
export { CascadeFitter, createFitResult, quantizeTexel, splitDistances, type CascadeFit, type CascadeSize, type FitInput, type FitResult, type ClipBoxSpec, type ReceiverShellSpec, type ReceiverSlabSpec } from './fit';
export { SHADOW_CASCADE_PRESETS, cascadePresetForMapSize, planetShadowReceivers, type ShadowCascadePreset, type ShadowPlanetLike, type SunViewReceivers } from '../earle/hardShadow';
