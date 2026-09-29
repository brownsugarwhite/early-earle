export const CORE_VERSION = '0.1.0';

// schemas
export * from './schema/level';
export * from './schema/zone';

// model + events
export * from './model';
export * from './events';

// rng
export * from './rng';

// engine
export { getGeometry, buildGeometry, type Geometry } from './engine/lanes';
export {
  applyMove,
  createState,
  blobAtCoord,
  canSlide,
  anyDirectionChanges,
  computeGoalProgress,
  spawnDistribution,
} from './engine/applyMove';
export * from './engine/snapshot';
