import { create } from 'zustand';
import {
  applyMove,
  canRewind,
  createHistory,
  createState,
  hash32,
  record,
  rewind,
  type Dir,
  type History,
  type LevelDef,
  type LevelState,
  type MoveResult,
} from '@ee/core';

/**
 * Vorschau-Zustand des Level-Editors. Spiegelt die Form des Grid-Lab-Stores (Level, History,
 * letzter Zug, Animationsflag), lädt aber ungespeicherte Entwürfe (`loadDraft`) statt aus LEVELS.
 * Seeds folgen der Kalibrierung: Versuch n spielt mit `hash32(level.id, n)` — derselbe Seed wie Bot-Lauf n.
 */
export interface PreviewState {
  level: LevelDef | null;
  /** Zählt Ladevorgänge (Entwürfe behalten ihre ID, die Szene braucht ein Änderungssignal). */
  levelSeq: number;
  attempt: number;
  seed: number;
  mode: 'edit' | 'play';
  history: History | null;
  state: LevelState | null;
  lastMove: MoveResult<LevelState> | null;
  moveSeq: number;
  animating: boolean;
  showNumbers: boolean;
  loadDraft: (level: LevelDef, attempt?: number) => void;
  setMode: (mode: 'edit' | 'play') => void;
  setAttempt: (attempt: number) => void;
  restart: () => void;
  move: (dir: Dir) => boolean;
  rewindMove: () => void;
  setAnimating: (v: boolean) => void;
  toggleNumbers: () => void;
}

export const seedFor = (level: LevelDef, attempt: number): number => hash32(level.id, attempt);

export const usePreviewStore = create<PreviewState>((set, get) => ({
  level: null,
  levelSeq: 0,
  attempt: 1,
  seed: 0,
  mode: 'edit',
  history: null,
  state: null,
  lastMove: null,
  moveSeq: 0,
  animating: false,
  showNumbers: true,
  loadDraft: (level, attempt = get().attempt) => {
    const seed = seedFor(level, attempt);
    let state: LevelState;
    try {
      state = createState(level, seed);
    } catch (e) {
      console.warn('Vorschau: Level lässt sich nicht aufbauen', e);
      return;
    }
    set({
      level,
      levelSeq: get().levelSeq + 1,
      attempt,
      seed,
      history: createHistory(state, 16),
      state,
      lastMove: null,
      moveSeq: 0,
      animating: false,
    });
  },
  setMode: (mode) => {
    const { level, attempt } = get();
    set({ mode });
    if (level) get().loadDraft(level, attempt);
  },
  setAttempt: (attempt) => {
    const { level } = get();
    const a = Math.max(1, Math.min(9999, Math.round(attempt)));
    if (level) get().loadDraft(level, a);
    else set({ attempt: a });
  },
  restart: () => {
    const { level, attempt } = get();
    if (level) get().loadDraft(level, attempt);
  },
  move: (dir) => {
    const { history, animating, mode } = get();
    if (!history || animating || mode !== 'play') return false;
    const res = applyMove(history.current, dir);
    if (!res) return false;
    set({ history: record(history, res.state), state: res.state, lastMove: res, moveSeq: get().moveSeq + 1, animating: true });
    return true;
  },
  rewindMove: () => {
    const { history, animating } = get();
    if (!history || animating || !canRewind(history)) return;
    const h = rewind(history);
    set({ history: h, state: h.current, lastMove: null, moveSeq: get().moveSeq + 1 });
  },
  setAnimating: (v) => set({ animating: v }),
  toggleNumbers: () => set({ showNumbers: !get().showNumbers }),
}));
