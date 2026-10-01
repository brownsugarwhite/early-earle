/**
 * Eine Level-Kalibrierung (gemeinsam für `calibrate.ts` und `tune.ts`): `strong` und `novice`
 * über bis zu 200 Seeds mit sequenziellem Abbruch (Wilson-95-%-Intervall schmaler als ±0,05),
 * dazu der Median-Zielfortschritt verlorener Anfänger-Partien (Near-Miss).
 */

import { hash32, simulate, type BotName, type LevelDef, type SimResult } from '@ee/core';
import { calibrationSeeds, noviceLossProgress } from './probe';

export interface BotSummary {
  n: number;
  wins: number;
  pWin: number;
  wilson: [number, number];
  attemptsEst: number | null;
  meanMoves: number;
  meanMovesWon: number;
  meanScore: number;
  specialFrequency: { line: number; burst: number; fired: number; combo: number };
  elapsedMs: number;
  /** Nur Anfänger: Median-Zielfortschritt der verlorenen Partien (0..1), null ohne Niederlage. */
  lossProgress?: number | null;
}

export interface CalibOptions {
  maxSeeds: number;
  halfWidth: number;
}

export const DEFAULT_CALIB: CalibOptions = { maxSeeds: 200, halfWidth: 0.05 };

export function summarize(r: SimResult): BotSummary {
  return {
    n: r.n,
    wins: r.wins,
    pWin: r.pWin,
    wilson: r.wilson,
    attemptsEst: Number.isFinite(r.attemptsEst) ? r.attemptsEst : null,
    meanMoves: r.meanMoves,
    meanMovesWon: r.meanMovesWon,
    meanScore: r.meanScore,
    specialFrequency: r.specialFrequency,
    elapsedMs: r.elapsedMs,
  };
}

/** Kalibriert einen Bot auf einem Level (wie `calibrate.ts` seit jeher). */
export function calibrateBot(level: LevelDef, bot: BotName, opts: CalibOptions = DEFAULT_CALIB): BotSummary {
  const result = simulate(level, bot, calibrationSeeds(level.id, opts.maxSeeds), {
    stopHalfWidth: opts.halfWidth,
    minSeeds: 20,
    botSeed: hash32(level.id, bot),
  });
  const s = summarize(result);
  if (bot === 'novice') s.lossProgress = noviceLossProgress(level, result.n);
  return s;
}
