export {
  DEBRIS_SHAPE,
  HEAL_SPAN,
  HEAP_SHAPES,
  NEVER_HEALS,
  RUIN_SHAPES,
  VENT_CHIMNEY_SHAPE,
  type ChunkTrash,
  type DebrisKind,
  type TrashItem,
  type TrashKind,
  type TrashSpec,
  type VeilGrid,
  type VeilSpore,
} from './types';
export { PathLocator, healAmount, healThreshold, type HealNode, type HealOptions, type PathHit } from './heal';
export { TrashPlanner, type TrashContext } from './placement';
