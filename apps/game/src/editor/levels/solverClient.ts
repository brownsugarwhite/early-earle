import type { BotName, LevelDef } from '@ee/core';
import type { SolverMessage, SolverRequest, SolverRun, SolverSummary } from './solver.worker';

export type { SolverRun, SolverSummary } from './solver.worker';

export interface SolverProgress {
  n: number;
  wins: number;
  total: number;
  runs: SolverRun[];
}

export interface SolverHandle {
  promise: Promise<SolverSummary>;
  cancel: () => void;
}

/**
 * Startet einen Bot-Lauf in einem eigenen Worker (ein Worker pro Bot, laufen parallel).
 * Abbrechen beendet den Worker hart — der Hot Path des Solvers gibt den Thread sonst nicht frei.
 */
export function runSolver(level: LevelDef, bot: BotName, seeds: number, stopHalfWidth: number, onProgress: (p: SolverProgress) => void): SolverHandle {
  const worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  let settled = false;
  const promise = new Promise<SolverSummary>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<SolverMessage>) => {
      const m = e.data;
      if (m.type === 'progress') onProgress({ n: m.n, wins: m.wins, total: m.total, runs: m.runs });
      else if (m.type === 'done') {
        settled = true;
        worker.terminate();
        resolve(m.summary);
      } else if (m.type === 'error') {
        settled = true;
        worker.terminate();
        reject(new Error(m.message));
      }
    };
    worker.onerror = (ev) => {
      settled = true;
      worker.terminate();
      reject(new Error(ev.message || 'Worker-Fehler'));
    };
    const req: SolverRequest = { type: 'run', level, bot, seeds, stopHalfWidth, minSeeds: 20 };
    worker.postMessage(req);
  });
  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      worker.terminate();
    },
  };
}

/** Band-Urteil wie in tools/levels/calibrate.ts (Anfänger-Bot gegen `targetAttempts`). */
export type BandVerdict = 'unsolved' | 'easier' | 'ok' | 'harder';
export function bandVerdict(attemptsEst: number | null, band: readonly [number, number]): BandVerdict {
  if (attemptsEst === null) return 'unsolved';
  if (attemptsEst < band[0] - 1e-9) return 'easier';
  if (attemptsEst > band[1] + 1e-9) return 'harder';
  return 'ok';
}
export const VERDICT_LABEL: Record<BandVerdict, string> = {
  unsolved: 'nie gewonnen',
  easier: 'leichter als das Band',
  ok: 'im Band',
  harder: 'härter als das Band',
};
