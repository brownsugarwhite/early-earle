import type { LevelDef } from '@ee/core';
import { LEVELS } from '../content/levels';

/**
 * The planet carries all levels on one spiral path (Tjorizo → Syrup → Luzz → Wooding, 25 each).
 * Node i ↔ FLOW_LEVELS[i] ↔ LEVELS[i] (global order).
 */
export interface FlowLevel {
  level: LevelDef;
  /** Index into `LEVELS` (what `useGridStore.loadLevel` expects). */
  index: number;
}

export const FLOW_LEVELS: FlowLevel[] = LEVELS.map((level, index) => ({ level, index }));

/** Display names of the story zones (content/zones/*.json). */
const ZONE_NAMES: Record<string, string> = {
  tjorizo: 'Tjorizo',
  syrup: 'Syrup',
  luzz: 'Luzz',
  wooding: 'Wooding',
};

export function zoneName(level: LevelDef | undefined): string {
  if (!level) return 'early earle';
  return ZONE_NAMES[level.zone] ?? level.zone;
}

/** Global level number (1-based) of a loaded level, or null if it is not part of the path. */
export function flowLevelNo(level: LevelDef | undefined): number | null {
  if (!level) return null;
  const i = FLOW_LEVELS.findIndex((e) => e.level === level || e.level.id === level.id);
  return i >= 0 ? i + 1 : null;
}
