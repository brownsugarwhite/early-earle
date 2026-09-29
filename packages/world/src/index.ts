export const WORLD_VERSION = '0.0.1';

export { hash32, mulberry32 } from './rng';
export { GradientNoise3 } from './noise';
export {
  createCapField,
  generateCapPatch,
  resolveCapParams,
  type CapField,
  type CapPatch,
  type CapPatchParams,
  type Vec3,
} from './capPatch';
export { scatterTrees, TREE_PROPORTIONS, type ScatterParams, type TreeInstance, type TreeKind } from './scatterTrees';
