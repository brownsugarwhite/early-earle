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

export interface GridLabState {
  levelIndex: number;
  level: LevelDef | undefined;
  history: History | null;
  state: LevelState | null;
  lastMove: MoveResult<LevelState> | null;
  moveSeq: number;
  showNumbers: boolean;
  animating: boolean;
  rex: string | null;
  attempt: number;
  loadLevel: (index: number, attempt?: number) => void;
  restart: () => void;
  move: (dir: Dir) => boolean;
  rewindMove: () => void;
  setAnimating: (v: boolean) => void;
  toggleNumbers: () => void;
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
  showNumbers: true,
  animating: false,
  rex: null,
  attempt: 1,
  loadLevel: (index, attempt = 1) => {
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
      attempt,
      rex: rexIntroFor(levelNo(level)),
    });
  },
  restart: () => {
    const { levelIndex, attempt } = get();
    get().loadLevel(levelIndex, attempt + 1);
  },
  move: (dir) => {
    const { history, animating } = get();
    if (!history || animating) return false;
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
    set({ history: next, state: res.state, lastMove: res, moveSeq: get().moveSeq + 1, animating: true, rex });
    return true;
  },
  rewindMove: () => {
    const { history, animating } = get();
    if (!history || animating || !canRewind(history)) return;
    const h = rewind(history);
    set({ history: h, state: h.current, lastMove: null, moveSeq: get().moveSeq + 1, rex: 'Zurück. Nichts passiert.' });
  },
  setAnimating: (v) => set({ animating: v }),
  toggleNumbers: () => set({ showNumbers: !get().showNumbers }),
}));
