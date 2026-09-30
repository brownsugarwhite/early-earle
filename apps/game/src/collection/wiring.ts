import type { MoveEvent } from '@ee/core';
import { ZONE_KEYS, type GenomeRules, type ZoneId } from '@ee/genome';
import type { BoardHooks, MadeCreature } from '@ee/render';
import type { CollectInput, CollectionEntry } from '../state/progress';
import { earnedFromEvents, type EarnedLook } from './earn';

/** Was die Verdrahtung vom Grid-Store liest (strukturell: `useGridStore`). */
export interface GridLike {
  levelIndex: number;
  level: { id: string; zone: string } | undefined;
  attempt: number;
  moveSeq: number;
  lastMove: { events: readonly MoveEvent[] } | null;
  /** Klassik (B6) spielt ohne Sammlung; fehlt das Feld, ist es die Geschichte. */
  session?: 'story' | 'classic' | string;
}

/** Was die Verdrahtung vom Flow-Store liest (strukturell: `useFlowStore`). */
export interface FlowLike {
  phase: string;
  playing: number | null;
  current: number;
}

/** Minimaler zustand-Store (getState + subscribe mit Vorzustand). */
export interface StoreLike<T> {
  getState(): T;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

export interface WiringDeps {
  grid: StoreLike<GridLike>;
  flow: StoreLike<FlowLike>;
  /** Trägt ein erschaffenes Wesen in den aktiven Stand ein (`useProgress.recordCollect`). */
  record(input: CollectInput): { isNew: boolean; entry: CollectionEntry };
  /** Genom-Regeln (null, solange sie laden: dann wird nichts verbucht). */
  rules(): GenomeRules | null;
  /** Der Stempel wurde gezeigt (Klang, Haptik). */
  onStamp?(made: MadeCreature): void;
  /** Entwicklung: warnen, wenn das Brett eine andere Art zeichnet als die Linie. */
  dev?: boolean;
  warn?(message: string): void;
}

export interface CollectionWiring {
  /** Brett-Hooks: `isNewCreature` antwortet aus den verbuchten Zügen, `stampShown` spielt Klang und Haptik. */
  readonly hooks: Required<Pick<BoardHooks, 'isNewCreature' | 'stampShown'>>;
  /** Neue Wesen des laufenden Levels (Blob-ID → Aussehen), deren Stempel noch aussteht. */
  readonly pending: ReadonlyMap<number, EarnedLook>;
  /** Neue Wesen des laufenden Levelversuchs in Fundreihenfolge (für den Aufbruch auf die Map). */
  readonly found: readonly CollectionEntry[];
  dispose(): void;
}

/** Phasen, in denen der Flow ein Level spielt (nur dort wird verbucht). */
const LEVEL_PHASES = new Set(['flyIn', 'level', 'depart']);

const isZone = (z: string | undefined): z is ZoneId => !!z && (ZONE_KEYS as readonly string[]).includes(z);

/**
 * Sammlung ↔ Spiel: jeder Zug im Level des Flows wird nach erschaffenen Wesen durchsucht (`earnedFromEvents`), jedes
 * wird im aktiven Stand verbucht (`recordCollect` mit Level und Knoten); die ersten ihrer Art merkt sich die
 * Verdrahtung, bis das Brett sie beim Merge-Wechsel oder Spawn-Pop meldet (`isNewCreature` → "NEU!"). Klassik und
 * Labs verbuchen nichts. Ein Levelwechsel oder Neustart vergisst ausstehende Stempel.
 */
export function wireCollection(deps: WiringDeps): CollectionWiring {
  const pending = new Map<number, EarnedLook>();
  const found: CollectionEntry[] = [];

  const earning = (s: GridLike): boolean => {
    if (s.session === 'classic') return false;
    if (!isZone(s.level?.zone)) return false;
    return LEVEL_PHASES.has(deps.flow.getState().phase);
  };

  const offGrid = deps.grid.subscribe((s, prev) => {
    const sameRun = s.level === prev.level && s.levelIndex === prev.levelIndex && s.attempt === prev.attempt;
    if (!sameRun) {
      pending.clear();
      found.length = 0;
      return;
    }
    if (s.moveSeq === prev.moveSeq || !s.lastMove || s.lastMove === prev.lastMove) return;
    if (!earning(s)) return;
    const rules = deps.rules();
    const level = s.level;
    if (!rules || !level || !isZone(level.zone)) return;
    const flow = deps.flow.getState();
    const node = flow.playing ?? flow.current;
    for (const look of earnedFromEvents(s.lastMove.events, level.zone, rules)) {
      const { isNew, entry } = deps.record({ zone: look.zone, tier: look.tier, species: look.species, bodyType: look.bodyType, seed: look.seed, levelId: level.id, node });
      if (!isNew) continue;
      pending.set(look.blobId, look);
      found.push(entry);
    }
  });

  const hooks: CollectionWiring['hooks'] = {
    isNewCreature(made: MadeCreature): boolean {
      const look = pending.get(made.blobId);
      if (!look) return false;
      pending.delete(made.blobId);
      if (deps.dev && (look.species !== made.species || look.tier !== made.tier || look.zone !== made.zone)) {
        deps.warn?.(`[Sammlung] Blob ${made.blobId}: verbucht ${look.zone}:${look.tier}:${look.species}, gezeichnet ${made.zone}:${made.tier}:${made.species}`);
      }
      return true;
    },
    stampShown(made: MadeCreature): void {
      deps.onStamp?.(made);
    },
  };

  return {
    hooks,
    pending,
    found,
    dispose: () => {
      offGrid();
      pending.clear();
      found.length = 0;
    },
  };
}
