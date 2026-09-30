import { create } from 'zustand';
import {
  createHistory,
  createState,
  record,
  rewind,
  canRewind,
  applyMove,
  type Dir,
  type History,
  type LevelDef,
  type LevelState,
  type MoveResult,
} from '@ee/core';
import { LEVELS } from '../../content/levels';
import { rexIntroFor, rexLine } from './rex';
import { CREATURE_DEMO_LEVEL, DEMO_LEVEL, HERD_DEMO_LEVEL, creatureDemoState, demoState, herdDemoState } from './demoLevel';

/** `levelIndex` of the Elemente-Schau demo board (not part of `LEVELS`). */
export const DEMO_LEVEL_INDEX = -1;
/** `levelIndex` of the Wesen-Schau demo board (body archetypes, every merge style in one swipe). */
export const CREATURE_DEMO_INDEX = -2;
/** `levelIndex` of the Herde demo board (21 species of mixed tiers: the mesh-path stress board). */
export const HERD_DEMO_INDEX = -3;

export interface GridLabState {
  levelIndex: number;
  level: LevelDef | undefined;
  history: History | null;
  state: LevelState | null;
  lastMove: MoveResult<LevelState> | null;
  moveSeq: number;
  showNumbers: boolean;
  /** Board juice (particles, dips, shake, REX pulse) on/off. */
  juice: boolean;
  animating: boolean;
  /** Ein während der Animation eingegebener Wisch (Warteschlange Tiefe 1). */
  pendingDir: Dir | null;
  rex: string | null;
  attempt: number;
  loadLevel: (index: number, attempt?: number) => void;
  /** Loads the Elemente-Schau demo board (every element type on one board). */
  loadDemo: (attempt?: number) => void;
  /** Loads the Wesen-Schau demo board (body archetypes and merge styles). */
  loadCreatureDemo: (attempt?: number) => void;
  restart: () => void;
  move: (dir: Dir) => boolean;
  rewindMove: () => void;
  setAnimating: (v: boolean) => void;
  toggleNumbers: () => void;
  toggleJuice: () => void;
}

function levelNo(level: LevelDef | undefined): number {
  const m = level?.id.match(/(\d+)$/);
  return m ? Number(m[1]) : 0;
}

/** Zustand des Grid-Labs: ein Level, seine History (Rückspulen), der letzte Zug (für die Animation), REX-Zeile. */
export const useGridStore = create<GridLabState>((set, get) => ({
  levelIndex: 0,
  level: undefined,
  history: null,
  state: null,
  lastMove: null,
  moveSeq: 0,
  // Board v2: stages read from colour, size and parts; tier numbers are an opt-in HUD toggle.
  showNumbers: false,
  juice: true,
  animating: false,
  pendingDir: null,
  rex: null,
  attempt: 1,
  loadLevel: (index, attempt = 1) => {
    if (index === DEMO_LEVEL_INDEX) {
      get().loadDemo(attempt);
      return;
    }
    if (index === CREATURE_DEMO_INDEX) {
      get().loadCreatureDemo(attempt);
      return;
    }
    if (index === HERD_DEMO_INDEX) {
      const state = herdDemoState(3000 + attempt);
      set({
        levelIndex: HERD_DEMO_INDEX,
        level: HERD_DEMO_LEVEL,
        history: createHistory(state, 8),
        state,
        lastMove: null,
        moveSeq: 0,
        animating: false,
        pendingDir: null,
        attempt,
        rex: 'Herde: einundzwanzig Arten auf einem Brett.',
      });
      return;
    }
    const level = LEVELS[index];
    if (!level) return;
    const seed = (index + 1) * 1000 + attempt;
    const state = createState(level, seed);
    set({
      levelIndex: index,
      level,
      history: createHistory(state, 8),
      state,
      lastMove: null,
      moveSeq: 0,
      animating: false,
      pendingDir: null,
      attempt,
      rex: rexIntroFor(levelNo(level)),
    });
  },
  loadDemo: (attempt = 1) => {
    const state = demoState(1000 + attempt);
    set({
      levelIndex: DEMO_LEVEL_INDEX,
      level: DEMO_LEVEL,
      history: createHistory(state, 8),
      state,
      lastMove: null,
      moveSeq: 0,
      animating: false,
      pendingDir: null,
      attempt,
      rex: 'Elemente-Schau: alles auf einem Brett.',
    });
  },
  loadCreatureDemo: (attempt = 1) => {
    const state = creatureDemoState(2000 + attempt);
    set({
      levelIndex: CREATURE_DEMO_INDEX,
      level: CREATURE_DEMO_LEVEL,
      history: createHistory(state, 8),
      state,
      lastMove: null,
      moveSeq: 0,
      animating: false,
      pendingDir: null,
      attempt,
      rex: 'Wesen-Schau: einmal nach links wischen.',
    });
  },
  restart: () => {
    const { levelIndex, attempt } = get();
    get().loadLevel(levelIndex, attempt + 1);
  },
  move: (dir) => {
    const { history, animating } = get();
    if (!history) return false;
    if (animating) {
      set({ pendingDir: dir });
      return true;
    }
    const res = applyMove(history.current, dir);
    if (!res) return false;
    const next = record(history, res.state);
    const won = res.events.some((e) => e.type === 'won');
    const lost = res.events.some((e) => e.type === 'lost');
    const combo = res.mergeCount;
    let rex: string | null = get().rex;
    if (won) rex = rexLine('win');
    else if (lost) rex = rexLine('lose');
    else if (combo >= 2) rex = rexLine('combo', { combo });
    else if (res.events.some((e) => e.type === 'release')) rex = rexLine('release');
    set({ history: next, state: res.state, lastMove: res, moveSeq: get().moveSeq + 1, animating: true, pendingDir: null, rex });
    return true;
  },
  rewindMove: () => {
    const { history, animating } = get();
    if (!history || animating || !canRewind(history)) return;
    const h = rewind(history);
    set({ history: h, state: h.current, lastMove: null, moveSeq: get().moveSeq + 1, rex: 'Zurück. Nichts passiert.' });
  },
  setAnimating: (v) => {
    set({ animating: v });
    if (!v) {
      const pending = get().pendingDir;
      if (pending) {
        set({ pendingDir: null });
        get().move(pending);
      }
    }
  },
  toggleNumbers: () => set({ showNumbers: !get().showNumbers }),
  toggleJuice: () => set({ juice: !get().juice }),
}));
