/**
 * P4 Genom-Lab: modular accessories on body sockets (module library incl. procedural species parts,
 * instanced pools, procedural rig, traced mouths, merge choreography) and creature locomotion (kneaded
 * legs, follow-the-leader snakes, facing turns, merge moves). API: ./README.md. Besitzer: P4-Agent.
 */
export const RENDER_CREATURE = true;
export * from './ModuleLibrary';
export * from './ProceduralModules';
export * from './partMaterial';
export * from './CreatureMouth';
export * from './CreaturePool';
export * from './CreatureRig';
export * from './CreatureMergeChoreo';
export * from './CreatureMotion';
export * from './bodyMesh';
export * from './CreatureMeshBodies';
// Merge moves and facing (pure timelines from @ee/genome), re-exported for the board.
export {
  MergeMove,
  coilSwallow,
  createMoveSample,
  defaultMergeMove,
  devour,
  leapToCamera,
  pounceTo,
  splashMerge,
  stompMerge,
  turnProfile,
  type LeapOptions,
  type MergeMoveKind,
  type MoveContext,
  type MoveEvent,
  type MoveEventType,
  type MovePartner,
  type MovePartnerSample,
  type MoveSample,
} from '@ee/genome';
