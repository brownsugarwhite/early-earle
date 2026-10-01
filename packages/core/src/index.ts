export const CORE_VERSION = '0.1.0';

// schemas
export * from './schema/level';
export * from './schema/zone';
export * from './schema/klassik';
export * from './schema/route';

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

// solver
export * from './solver/index';

// testing helpers (ASCII boards, also handy for the editor's debug view)
export {
  levelFromAscii,
  asciiTiers,
  normalizeAscii,
  expectedAscii,
  type AsciiOptions,
} from './testing/ascii';

// generator
export * from './generator/index';

// presentation rules (never touch the board RNG)
export * from './presentation/gull';
