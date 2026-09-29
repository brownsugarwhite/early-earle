/**
 * MoveEvent — the contract between the rules engine and the renderer.
 *
 * `applyMove` emits events in the order they happened, each tagged with the
 * phase that produced it:
 *
 *   1 slide + merge          2 side effects (landing cell + 4-neighbours)
 *   3 specials (fire/promote) 4 dynamics (currents, strays, rot, toxic)
 *   5 graduation (release, deliver, tier bomb)
 *   6 spawn                  7 goals / win / lose
 *
 * The renderer builds a timeline from these phases: slides play in parallel,
 * merges blend at the end of the slides, side effects and spawns pop after.
 * Blob ids are stable and never reused, so an id can be used as an animation key.
 */

import type { BlobKind, Coord, Dir, LineAxis, Material } from './model';

export type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SlideEvent {
  type: 'slide';
  phase: Phase;
  id: number;
  from: Coord;
  to: Coord;
  /** Every cell visited after `from`, including teleport exits; ends with `to`. */
  path: Coord[];
}

export interface MergeEvent {
  type: 'merge';
  phase: Phase;
  /** [settled blob, moving blob] */
  ids: [number, number];
  at: Coord;
  tier: number;
  resultId: number;
  material: Material;
}

export interface HealEvent {
  type: 'heal';
  phase: Phase;
  at: Coord;
  from: 'withered' | 'deepWithered';
  to: 'healed' | 'withered';
}

export interface CollectEvent {
  type: 'collect';
  phase: Phase;
  at: Coord;
  /** Total spores collected so far. */
  total: number;
}

export interface BlockerHitEvent {
  type: 'blockerHit';
  phase: Phase;
  at: Coord;
  kind: 'scrap' | 'scrapMound';
  layersLeft: number;
}

export interface ThawEvent {
  type: 'thaw';
  phase: Phase;
  at: Coord;
  id: number;
}

export interface WakeEvent {
  type: 'wake';
  phase: Phase;
  at: Coord;
  id: number;
}

export interface CageOpenEvent {
  type: 'cageOpen';
  phase: Phase;
  at: Coord;
  id: number;
  /** 0 means the cage is open and the blob is free (counts as rescued). */
  layersLeft: number;
}

export interface RevealEvent {
  type: 'reveal';
  phase: Phase;
  at: Coord;
  /** The blob that was hidden in the fog, if any. */
  id?: number;
}

export interface BurnEvent {
  type: 'burn';
  phase: Phase;
  at: Coord;
  what: 'crust' | 'rot' | 'oil';
}

/** A blob became a special piece because enough merges happened in one swipe. */
export interface PromoteEvent {
  type: 'promote';
  phase: Phase;
  id: number;
  at: Coord;
  kind: 'line' | 'burst';
  axis?: LineAxis;
}

export type SpecialKind = 'line' | 'burst' | 'cross' | 'tripleCross' | 'burst5';

/** A special piece fired (it merged). `cells` are the affected cells, `removed` the blobs cleared. */
export interface SpecialEvent {
  type: 'special';
  phase: Phase;
  kind: SpecialKind;
  at: Coord;
  cells: Coord[];
  removed: { id: number; at: Coord }[];
}

export interface PushEvent {
  type: 'push';
  phase: Phase;
  id: number;
  from: Coord;
  to: Coord;
}

export interface StrayMoveEvent {
  type: 'strayMove';
  phase: Phase;
  id: number;
  from: Coord;
  to: Coord;
}

export interface StrayCalmEvent {
  type: 'strayCalm';
  phase: Phase;
  id: number;
  at: Coord;
}

export interface RotGrowEvent {
  type: 'rotGrow';
  phase: Phase;
  at: Coord;
  from: Coord;
}

export interface ToxicTickEvent {
  type: 'toxicTick';
  phase: Phase;
  at: Coord;
  countdown: number;
}

export interface FreezeEvent {
  type: 'freeze';
  phase: Phase;
  at: Coord;
  id: number;
}

export interface ReleaseEvent {
  type: 'release';
  phase: Phase;
  id: number;
  at: Coord;
  tier: number;
}

export interface DeliverEvent {
  type: 'deliver';
  phase: Phase;
  id: number;
  at: Coord;
  tier: number;
}

export interface TierBombEvent {
  type: 'tierBomb';
  phase: Phase;
  tier: number;
  removed: { id: number; at: Coord }[];
}

export interface SpawnEvent {
  type: 'spawn';
  phase: Phase;
  id: number;
  at: Coord;
  tier: number;
  kind: BlobKind;
  material: Material;
}

export interface GoalProgressEvent {
  type: 'goalProgress';
  phase: Phase;
  index: number;
  progress: number;
  target: number;
  done: boolean;
}

export interface WonEvent {
  type: 'won';
  phase: Phase;
  score: number;
  movesLeft: number;
}

export interface LostEvent {
  type: 'lost';
  phase: Phase;
  reason: 'noMoves' | 'stuck';
}

export type MoveEvent =
  | SlideEvent
  | MergeEvent
  | HealEvent
  | CollectEvent
  | BlockerHitEvent
  | ThawEvent
  | WakeEvent
  | CageOpenEvent
  | RevealEvent
  | BurnEvent
  | PromoteEvent
  | SpecialEvent
  | PushEvent
  | StrayMoveEvent
  | StrayCalmEvent
  | RotGrowEvent
  | ToxicTickEvent
  | FreezeEvent
  | ReleaseEvent
  | DeliverEvent
  | TierBombEvent
  | SpawnEvent
  | GoalProgressEvent
  | WonEvent
  | LostEvent;

export type MoveEventType = MoveEvent['type'];

/** Result of a move that changed the board. */
export interface MoveResult<S> {
  state: S;
  dir: Dir;
  events: MoveEvent[];
  /** Number of merges in phase 1 (drives the special thresholds). */
  mergeCount: number;
}
