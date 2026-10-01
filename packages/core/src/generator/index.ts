export {
  generateLevel,
  levelId,
  defaultMoves,
  targetAttempts,
  type LevelSpec,
  type LevelType,
  type ElementId,
  type GoalSpec,
  type StartBlobSpec,
  type DifficultyStyle,
} from './generateLevel';
export { TJORIZO_SPECS, tjorizoSpec, P3_LEVEL_INDICES } from './tjorizo';
export { SYRUP_SPECS, syrupSpec } from './syrup';
export { LUZZ_SPECS, luzzSpec } from './luzz';
export { WOODING_SPECS, woodingSpec } from './wooding';
export {
  CURVE_LAST_LEVEL,
  CURVE_TYPES,
  LANDMARK_SPIKES,
  LEGACY_LAST_LEVEL,
  NEW_ELEMENTS,
  ZONE_LENGTHS,
  ZONE_RANGES,
  ZONE_WORLDS,
  curveBand,
  curveSpec,
  curveSpecs,
  legacyTargetAttempts,
  spikeLevels,
  zoneCap,
  zoneMoveRamp,
  zoneOfLevel,
  zoneRamp,
  type CurveSpec,
  type CurveType,
} from './curve';
export {
  CURVE_LIMITS,
  validateCurve,
  levelSignature,
  type CalibrationBot,
  type CalibrationEntry,
  type CurveIssue,
  type CurveLevelInfo,
  type CurveReport,
} from './validate';

import type { LevelSpec } from './generateLevel';
import { tjorizoSpec } from './tjorizo';
import { syrupSpec } from './syrup';
import { luzzSpec } from './luzz';
import { woodingSpec } from './wooding';

/** Highest authored level number. */
export const LAST_LEVEL = 100;

/**
 * Spec of any authored level by its 1-based number:
 * Tjorizo 1–25, Syrup 26–50, Luzz 51–75, Wooding 76–100.
 */
export function levelSpec(index: number): LevelSpec {
  if (index >= 1 && index <= 25) return tjorizoSpec(index);
  if (index >= 26 && index <= 50) return syrupSpec(index);
  if (index >= 51 && index <= 75) return luzzSpec(index);
  if (index >= 76 && index <= 100) return woodingSpec(index);
  throw new Error(`no spec for level ${index}`);
}
