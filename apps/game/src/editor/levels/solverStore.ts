import { create } from 'zustand';
import type { BotName, LevelDef } from '@ee/core';
import { bandVerdict, runSolver, type BandVerdict, type SolverHandle, type SolverRun, type SolverSummary } from './solverClient';
import { calibrationFor, calibrationMatches } from './chain';

export interface BotRunState {
  status: 'idle' | 'running' | 'done' | 'error' | 'cancelled';
  n: number;
  wins: number;
  total: number;
  runs: SolverRun[];
  summary: SolverSummary | null;
  error?: string;
  /** JSON des gespielten Levels, damit alte Ergebnisse als „veraltet“ erkennbar sind. */
  levelJson: string;
  /** Lauf kam aus dem Auto-Check (nur Anfänger, wenige Seeds). */
  auto?: boolean;
}

/** Letztes Anfänger-Ergebnis pro Level-ID (Chip, Kette); überlebt Neuladen. */
export interface FreshResult {
  levelJson: string;
  attemptsEst: number | null;
  pWin: number;
  n: number;
  band: [number, number];
  verdict: BandVerdict;
  at: number;
}

export const BOTS: readonly BotName[] = ['novice', 'average', 'strong'];
export const BOT_LABEL: Record<BotName, string> = { novice: 'Anfänger', average: 'Durchschnitt', strong: 'Stark' };
export const SEED_OPTIONS = [10, 25, 50, 100, 200] as const;
const AUTO_SEEDS = 40;
const AUTO_DELAY_MS = 900;
const FRESH_KEY = 'ee.editor.levels.fresh';
const PREFS_KEY = 'ee.editor.levels.solverPrefs';

const idle = (): BotRunState => ({ status: 'idle', n: 0, wins: 0, total: 0, runs: [], summary: null, levelJson: '' });

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* privat / voll */
  }
}

interface Prefs {
  bots: Record<BotName, boolean>;
  seeds: number;
  stopEarly: boolean;
  autoCheck: boolean;
}

export interface SolverState {
  bots: Record<BotName, boolean>;
  seeds: number;
  stopEarly: boolean;
  /** Nach jeder Änderung leise einen Anfänger-Lauf starten. */
  autoCheck: boolean;
  results: Record<BotName, BotRunState>;
  /** Manueller Lauf aktiv. */
  running: boolean;
  /** Auto-Check aktiv. */
  autoRunning: boolean;
  fresh: Record<string, FreshResult>;
  setBot: (bot: BotName, on: boolean) => void;
  setSeeds: (n: number) => void;
  setStopEarly: (v: boolean) => void;
  setAutoCheck: (v: boolean) => void;
  run: (level: LevelDef) => Promise<void>;
  cancel: () => void;
  /** Vom Editor nach jeder Änderung: plant einen Auto-Check (oder bricht ihn ab, wenn `level` null ist). */
  scheduleAuto: (level: LevelDef | null) => void;
}

let handles: Partial<Record<BotName, SolverHandle>> = {};
let autoHandle: SolverHandle | null = null;
let autoTimer: ReturnType<typeof setTimeout> | null = null;
let autoWanted: LevelDef | null = null;

const prefs = readJson<Prefs>(PREFS_KEY);

/** Ergebnisse überleben Reiterwechsel; ein Worker pro Bot, alle parallel. */
export const useSolverStore = create<SolverState>((set, get) => {
  const savePrefs = () => {
    const { bots, seeds, stopEarly, autoCheck } = get();
    writeJson(PREFS_KEY, { bots, seeds, stopEarly, autoCheck } satisfies Prefs);
  };
  const remember = (level: LevelDef, levelJson: string, s: SolverSummary) => {
    const band: [number, number] = [level.difficulty.targetAttempts[0], level.difficulty.targetAttempts[1]];
    const entry: FreshResult = { levelJson, attemptsEst: s.attemptsEst, pWin: s.pWin, n: s.n, band, verdict: bandVerdict(s.attemptsEst, band), at: Date.now() };
    const fresh = { ...get().fresh, [level.id]: entry };
    const ids = Object.keys(fresh);
    if (ids.length > 240) {
      ids.sort((a, b) => (fresh[a]?.at ?? 0) - (fresh[b]?.at ?? 0));
      for (const id of ids.slice(0, ids.length - 240)) delete fresh[id];
    }
    set({ fresh });
    writeJson(FRESH_KEY, fresh);
  };
  const cancelAuto = () => {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    if (autoHandle) {
      autoHandle.cancel();
      autoHandle = null;
      const cur = get().results.novice;
      if (cur.status === 'running' && cur.auto) set({ results: { ...get().results, novice: { ...cur, status: 'cancelled' } } });
    }
    if (get().autoRunning) set({ autoRunning: false });
  };
  const startAuto = (level: LevelDef) => {
    const levelJson = JSON.stringify(level);
    const cur = get().results.novice;
    // Schon frisch gemessen (manuell oder automatisch)? Dann nichts tun.
    if (cur.levelJson === levelJson && (cur.status === 'done' || cur.status === 'running')) return;
    if (get().fresh[level.id]?.levelJson === levelJson && cur.levelJson !== levelJson) {
      // Ergebnis aus einer früheren Sitzung: Karte bleibt leer, Chip zeigt den Cache.
      return;
    }
    const cal = calibrationFor(level.id);
    if (cal?.bots.novice && calibrationMatches(cal, level)) return; // _calibration.json kennt genau diesen Stand

    const { stopEarly } = get();
    set({ autoRunning: true, results: { ...get().results, novice: { ...idle(), status: 'running', total: AUTO_SEEDS, levelJson, auto: true } } });
    const handle = runSolver(level, 'novice', AUTO_SEEDS, stopEarly ? 0.05 : 0, (p) => {
      if (autoHandle !== handle) return;
      set({ results: { ...get().results, novice: { ...get().results.novice, n: p.n, wins: p.wins, total: p.total, runs: p.runs } } });
    });
    autoHandle = handle;
    handle.promise
      .then((summary) => {
        if (autoHandle !== handle) return;
        autoHandle = null;
        set({ autoRunning: false, results: { ...get().results, novice: { ...get().results.novice, status: 'done', n: summary.n, wins: summary.wins, runs: summary.runs, summary } } });
        remember(level, levelJson, summary);
      })
      .catch((e: unknown) => {
        if (autoHandle !== handle) return;
        autoHandle = null;
        const nov = get().results.novice;
        set({ autoRunning: false, results: { ...get().results, novice: { ...nov, status: 'error', error: e instanceof Error ? e.message : String(e) } } });
      });
  };

  return {
    bots: prefs?.bots ?? { novice: true, average: false, strong: true },
    seeds: prefs?.seeds ?? 50,
    stopEarly: prefs?.stopEarly ?? true,
    autoCheck: prefs?.autoCheck ?? true,
    results: { novice: idle(), average: idle(), strong: idle() },
    running: false,
    autoRunning: false,
    fresh: readJson<Record<string, FreshResult>>(FRESH_KEY) ?? {},
    setBot: (bot, on) => {
      set({ bots: { ...get().bots, [bot]: on } });
      savePrefs();
    },
    setSeeds: (seeds) => {
      set({ seeds });
      savePrefs();
    },
    setStopEarly: (stopEarly) => {
      set({ stopEarly });
      savePrefs();
    },
    setAutoCheck: (autoCheck) => {
      set({ autoCheck });
      savePrefs();
      if (!autoCheck) cancelAuto();
      else if (autoWanted) get().scheduleAuto(autoWanted);
    },
    run: async (level) => {
      if (get().running) return;
      cancelAuto();
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
            if (bot === 'novice') remember(level, levelJson, summary);
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
      // Hat sich der Entwurf während des Laufs geändert, prüft der Auto-Check danach den neuen Stand.
      if (autoWanted && JSON.stringify(autoWanted) !== levelJson) get().scheduleAuto(autoWanted);
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
      cancelAuto();
    },
    scheduleAuto: (level) => {
      autoWanted = level;
      if (autoTimer) clearTimeout(autoTimer);
      autoTimer = null;
      if (!level || !get().autoCheck) {
        if (!level) cancelAuto();
        return;
      }
      const levelJson = JSON.stringify(level);
      // Ein laufender Auto-Check für einen älteren Stand ist wertlos.
      if (autoHandle && get().results.novice.levelJson !== levelJson) cancelAuto();
      autoTimer = setTimeout(() => {
        autoTimer = null;
        if (get().running) return; // der manuelle Lauf plant danach neu
        if (autoWanted) startAuto(autoWanted);
      }, AUTO_DELAY_MS);
    },
  };
});
