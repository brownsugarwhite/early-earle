/**
 * REX, the guide (the dino of the illudiy logo): procedural skinned model (one draw call), flat banded TSL
 * material with animated spiral-eye glyphs, deterministic procedural animation (idle, talk, cheer, despair,
 * point, peek, dizzy, celebrate, hide) and the placement math for map and level. Besitzer: REX-Agent.
 */
export const RENDER_REX = true;
export { REX_PALETTE, RexPart, type RexPartCode } from './rexPalette';
export { REX_BONES, REX_BONE_COUNT, RexBone, type RexBoneDef, type RexBoneId } from './rexSkeleton';
export { Spring as RexSpring, REX_STEP, createRng as createRexRng } from './rexSpring';
export { syllableSchedule, jawAt, vowelGroups, type Syllable, type SyllableSchedule } from './rexSyllables';
export { createRexGeometry, type RexModelInfo } from './rexGeometry';
export { createRexMaterial, createRexShadowMaterial, createRexUniforms, type RexUniforms } from './rexMaterial';
export { RexAnimator, createRexPose, popScale, type RexActionKind, type RexAnimatorOptions, type RexArmPose, type RexDir, type RexPose } from './rexAnimator';
export {
  REX_HEIGHT,
  REX_RIM_CUT,
  REX_VISIBLE_ASPECT,
  chooseBoardSpot,
  mapPlacementToCamera,
  placeRexOnMap,
  rexVisibleHeight,
  type RexAvoid,
  type RexBoardBox,
  type RexBoardInput,
  type RexBoardSpot,
  type RexCameraPlacement,
  type RexInsets,
  type RexMapLayoutInput,
  type RexMapPlacement,
  type RexRect,
  type RexSide,
} from './rexPlacement';
export { REX_HIDE_DEPTH, RexCharacter, type RexCharacterOptions } from './RexCharacter';
export { RexMapStager, projectToScreen, stageAtBoard, stageOnCamera } from './rexStaging';
