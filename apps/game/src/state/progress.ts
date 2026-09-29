import { create } from 'zustand';

/**
 * Spielfortschritt, lokal gespeichert (localStorage; im WKWebView der App bleibt er über Neustarts erhalten).
 * Später: Sync über Firebase (Plan §8), Capacitor Preferences als robustere Ablage.
 *
 * - `reached`: höchster freigeschalteter Knoten (0-basiert, = globale Levelnummer − 1)
 * - `current`: zuletzt gewählter Knoten (Kamera/Held starten dort)
 * - `levels[id]`: Bestwerte pro Level
 */
export interface LevelRecord {
  /** Anzahl Siege. */
  wins: number;
  /** Anzahl Versuche insgesamt (Start eines Levels). */
  attempts: number;
  /** Bester Punktestand. */
  bestScore: number;
  /** Meiste übrige Züge bei einem Sieg. */
  bestMovesLeft: number;
}

interface PersistedProgress {
  version: 1;
  reached: number;
  current: number;
  levels: Record<string, LevelRecord>;
}

export interface ProgressState extends PersistedProgress {
  /** Anzahl abgeschlossener Level (für Wachstum und Statistik). */
  completedCount: () => number;
  recordAttempt: (levelId: string) => void;
  recordWin: (levelId: string, node: number, score: number, movesLeft: number, nodeCount: number) => void;
  setCurrent: (node: number) => void;
  /** Nur für Entwicklung/Tests. */
  resetAll: () => void;
}

const KEY = 'ee.progress.v1';

function load(): PersistedProgress {
  const empty: PersistedProgress = { version: 1, reached: 0, current: 0, levels: {} };
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedProgress>;
    if (parsed.version !== 1) return empty;
    return {
      version: 1,
      reached: Math.max(0, Number(parsed.reached) || 0),
      current: Math.max(0, Number(parsed.current) || 0),
      levels: typeof parsed.levels === 'object' && parsed.levels ? parsed.levels : {},
    };
  } catch {
    return empty;
  }
}

function save(p: PersistedProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* privater Modus / Speicher voll: Fortschritt gilt dann nur für diese Sitzung */
  }
}

const emptyRecord = (): LevelRecord => ({ wins: 0, attempts: 0, bestScore: 0, bestMovesLeft: 0 });

export const useProgress = create<ProgressState>((set, get) => {
  const initial = load();
  const persist = () => {
    const { version, reached, current, levels } = get();
    save({ version, reached, current, levels });
  };
  return {
    ...initial,
    completedCount: () => Object.values(get().levels).filter((r) => r.wins > 0).length,
    recordAttempt: (levelId) => {
      const levels = { ...get().levels };
      const rec = { ...(levels[levelId] ?? emptyRecord()) };
      rec.attempts += 1;
      levels[levelId] = rec;
      set({ levels });
      persist();
    },
    recordWin: (levelId, node, score, movesLeft, nodeCount) => {
      const levels = { ...get().levels };
      const rec = { ...(levels[levelId] ?? emptyRecord()) };
      rec.wins += 1;
      rec.bestScore = Math.max(rec.bestScore, score);
      rec.bestMovesLeft = Math.max(rec.bestMovesLeft, movesLeft);
      levels[levelId] = rec;
      const reached = Math.min(Math.max(get().reached, node + 1), Math.max(0, nodeCount - 1));
      set({ levels, reached });
      persist();
    },
    setCurrent: (node) => {
      if (node === get().current) return;
      set({ current: node });
      persist();
    },
    resetAll: () => {
      set({ reached: 0, current: 0, levels: {} });
      persist();
    },
  };
});
