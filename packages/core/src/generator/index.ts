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
export { ZONE_KITS, storyZone, type Idea, type ZoneKit } from './ideas';
export {
  applyTune,
  baseSpec,
  dialSpec,
  extendedSpec,
  goalLabel,
  ideaOf,
  spawnSpec,
  startSpec,
  zoneSetOf,
} from './extended';
export { TUNING, type Tune } from './tuning';
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
import { CURVE_LAST_LEVEL } from './curve';
import { extendedSpec } from './extended';

/** Highest authored level number (sum of the 15 map zones). */
export const LAST_LEVEL = CURVE_LAST_LEVEL;

/**
 * Spec of any authored level by its 1-based number:
 * Tjorizo 1–25 and Syrup 26–50 from their tables (frozen), 51–184 derived from the
 * difficulty curve, the zone ideas and the calibrated tuning (`extended.ts`).
 */
export function levelSpec(index: number): LevelSpec {
  if (index >= 1 && index <= 25) return tjorizoSpec(index);
  if (index >= 26 && index <= 50) return syrupSpec(index);
  if (index >= 51 && index <= LAST_LEVEL) return extendedSpec(index);
  throw new Error(`no spec for level ${index}`);
}
