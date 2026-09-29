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

import type { LevelSpec } from './generateLevel';
import { tjorizoSpec } from './tjorizo';
import { syrupSpec } from './syrup';

/** Spec of any authored level by its 1-based number (Tjorizo 1–25, Syrup 26–50). */
export function levelSpec(index: number): LevelSpec {
  if (index >= 1 && index <= 25) return tjorizoSpec(index);
  if (index >= 26 && index <= 50) return syrupSpec(index);
  throw new Error(`no spec for level ${index}`);
}
