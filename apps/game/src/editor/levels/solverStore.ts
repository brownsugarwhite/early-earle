import { create } from 'zustand';
import type { BotName, LevelDef } from '@ee/core';
import { runSolver, type SolverHandle, type SolverRun, type SolverSummary } from './solverClient';

export interface BotRunState {
  status: 'idle' | 'running' | 'done' | 'error' | 'cancelled';
  n: number;
  wins: number;
  total: number;
  runs: SolverRun[];
  summary: SolverSummary | null;
  error?: string;
  /** Level-ID + Hash des Laufs, damit alte Ergebnisse als „veraltet“ erkennbar sind. */
  levelJson: string;
}

export const BOTS: readonly BotName[] = ['novice', 'average', 'strong'];
export const BOT_LABEL: Record<BotName, string> = { novice: 'Anfänger', average: 'Durchschnitt', strong: 'Stark' };
export const SEED_OPTIONS = [10, 25, 50, 100, 200] as const;

const idle = (): BotRunState => ({ status: 'idle', n: 0, wins: 0, total: 0, runs: [], summary: null, levelJson: '' });

export interface SolverState {
  bots: Record<BotName, boolean>;
  seeds: number;
  stopEarly: boolean;
  results: Record<BotName, BotRunState>;
  running: boolean;
  setBot: (bot: BotName, on: boolean) => void;
  setSeeds: (n: number) => void;
  setStopEarly: (v: boolean) => void;
  run: (level: LevelDef) => Promise<void>;
  cancel: () => void;
}

let handles: Partial<Record<BotName, SolverHandle>> = {};

/** Ergebnisse überleben Reiterwechsel; ein Worker pro Bot, alle parallel. */
export const useSolverStore = create<SolverState>((set, get) => ({
  bots: { novice: true, average: false, strong: true },
  seeds: 50,
  stopEarly: true,
  results: { novice: idle(), average: idle(), strong: idle() },
  running: false,
  setBot: (bot, on) => set({ bots: { ...get().bots, [bot]: on } }),
  setSeeds: (seeds) => set({ seeds }),
  setStopEarly: (stopEarly) => set({ stopEarly }),
  run: async (level) => {
    if (get().running) return;
    const { bots, seeds, stopEarly } = get();
    const selected = BOTS.filter((b) => bots[b]);
    if (selected.length === 0) return;
    const levelJson = JSON.stringify(level);
    const results = { ...get().results };
    for (const b of selected) results[b] = { ...idle(), status: 'running', total: seeds, levelJson };
    set({ results, running: true });
    handles = {};
    await Promise.all(
      selected.map(async (bot) => {
        const handle = runSolver(level, bot, seeds, stopEarly ? 0.05 : 0, (p) => {
          set({ results: { ...get().results, [bot]: { ...get().results[bot], n: p.n, wins: p.wins, total: p.total, runs: p.runs } } });
        });
        handles[bot] = handle;
        try {
          const summary = await handle.promise;
          set({ results: { ...get().results, [bot]: { ...get().results[bot], status: 'done', n: summary.n, wins: summary.wins, runs: summary.runs, summary } } });
        } catch (e) {
          const cur = get().results[bot];
          if (cur.status === 'running') {
            set({ results: { ...get().results, [bot]: { ...cur, status: 'error', error: e instanceof Error ? e.message : String(e) } } });
          }
        }
      }),
    );
    handles = {};
    set({ running: false });
  },
  cancel: () => {
    for (const bot of BOTS) {
      const h = handles[bot];
      if (h) h.cancel();
      const cur = get().results[bot];
      if (cur.status === 'running') set({ results: { ...get().results, [bot]: { ...cur, status: 'cancelled' } } });
    }
    handles = {};
    set({ running: false });
  },
}));
