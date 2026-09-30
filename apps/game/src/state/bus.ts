import mitt from 'mitt';
import type { CollectionEntry, GameMode } from './progress';

/** Einmal-Ereignisse zwischen Spielkern, Renderer und UI. Zustand, der gelesen wird, gehört in den Store. */
export type BusEvents = {
  'move': { direction: 'up' | 'down' | 'left' | 'right' };
  'animationDone': { moveId: number };
  'ui/toast': { text: string };
  'renderer/ready': { backend: 'webgpu' | 'webgl2' };
  /** Echter oder freier Modus wurde umgeschaltet. */
  'progress/mode': { mode: GameMode };
  /** Ein Level wurde gewonnen (`first`: erster Sieg in diesem Stand). */
  'progress/won': { levelId: string; node: number; first: boolean; mode: GameMode };
  /** Der Held ist am neu freigeschalteten Knoten angekommen (sichtbare Freischaltung). */
  'progress/unlocked': { node: number };
  /** Ein Wesen wurde erschaffen; `isNew` beim ersten seiner Art. */
  'collection/added': { key: string; isNew: boolean; entry: CollectionEntry };
  /** Ein Wesen wohnt jetzt auf der Map. */
  'collection/placed': { key: string };
  /** Choreografie-Takt für Klang und Haptik (z. B. 'heroLand', 'creatureRelease', 'locked', 'splat'). */
  'flow/cue': { cue: string; strength?: number };
  /** REX-Szene (z. B. 'afterLevel1'): Beginn, jede Zeile, Ende. */
  'flow/story': { id: string; state: 'start' | 'line' | 'end'; line?: number };
};

export const bus = mitt<BusEvents>();
