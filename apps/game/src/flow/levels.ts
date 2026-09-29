import type { LevelDef } from '@ee/core';
import { LEVELS } from '../content/levels';

/** The zone shown on the P5 patch; other zones get their own patch once the planet is chunked. */
export const FLOW_ZONE = 'tjorizo';
/** Node cap per patch (plan: 10–25 nodes on one cap patch). */
export const MAX_NODES = 25;

export interface FlowLevel {
  level: LevelDef;
  /** Index into `LEVELS` (what `useGridStore.loadLevel` expects). */
  index: number;
}

/** Levels of the flow's zone in order, mapped to their global index. Node i ↔ FLOW_LEVELS[i]. */
export const FLOW_LEVELS: FlowLevel[] = LEVELS.map((level, index) => ({ level, index }))
  .filter((e) => e.level.zone === FLOW_ZONE)
  .slice(0, MAX_NODES);

/** Zone-relative level number (1-based) of a loaded level, or null if it is not on this patch. */
export function flowLevelNo(level: LevelDef | undefined): number | null {
  if (!level) return null;
  const i = FLOW_LEVELS.findIndex((e) => e.level === level || e.level.id === level.id);
  return i >= 0 ? i + 1 : null;
}
