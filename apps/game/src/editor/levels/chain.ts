import {
  CURVE_LAST_LEVEL,
  LEGACY_LAST_LEVEL,
  ZONE_RANGES,
  countElementKinds,
  curveSpec,
  hash32,
  type BotName,
  type CurveType,
  type LevelDef,
} from '@ee/core';
import { levelNumber, type ZoneId } from './draft';
import { bandVerdict, type BandVerdict } from './solverClient';
import type { FreshResult } from './solverStore';

/**
 * Level-Kette: alle Level mit Zone, Elementen, Ziel-Band und gemessenen Versuchen (Anfänger-Bot).
 * Messwerte kommen aus frischen Läufen dieser Sitzung (falls der Stand passt) oder aus `_calibration.json`.
 */

export interface CalibBot {
  n: number;
  wins: number;
  pWin: number;
  attemptsEst: number | null;
  meanMovesWon: number;
}
export interface CalibEntry {
  id: string;
  file: string;
  name?: string;
  levelHash: number;
  solverVersion: string;
  elements: string[];
  moves: number;
  targetAttempts: [number, number];
  bots: Partial<Record<BotName, CalibBot>>;
}
export interface CalibFile {
  generatedAt?: string;
  solverVersion: string;
  seeds: number;
  halfWidth: number;
  levels: CalibEntry[];
}

// Liegt über den LEVELS-Glob ohnehin im Modulgraphen; hier nur zugänglich gemacht (kein Extra-Laden).
const calibModules = import.meta.glob<CalibFile>('@content/levels/_calibration.json', { eager: true, import: 'default' });
export const CALIBRATION: CalibFile | null = Object.values(calibModules)[0] ?? null;
const CALIB_BY_ID = new Map((CALIBRATION?.levels ?? []).map((e) => [e.id, e] as const));

export function calibrationFor(id: string): CalibEntry | null {
  return CALIB_BY_ID.get(id) ?? null;
}

/** Stimmt der Kalibrier-Eintrag noch mit dem Level überein (gleicher Hash wie tools/levels/calibrate.ts)? */
export function calibrationMatches(entry: CalibEntry, level: LevelDef): boolean {
  if (!CALIBRATION) return false;
  return hash32(JSON.stringify(level), CALIBRATION.solverVersion, CALIBRATION.seeds, CALIBRATION.halfWidth) === entry.levelHash;
}

/**
 * Zonenfarben für Kette und Kurve: aus den Zonenpaletten abgeleitet, aber auf Unterscheidbarkeit geprüft
 * (dataviz validate_palette: Helligkeitsband, Chroma, CVD ΔE ≥ 8 zwischen Nachbarn — alle bestanden).
 * Die Zonen sind zusätzlich immer beschriftet (Farbe nie allein).
 */
export const ZONE_COLOR: Record<ZoneId, string> = {
  tjorizo: '#22baa9',
  syrup: '#b0559a',
  luzz: '#2d6fd1',
  wooding: '#c9a227',
};

/** Levelnummern an den Zonengrenzen der Kurve: der Anfang jeder Kartenzone (1, 15, 27 … 173) und das letzte Level (184). */
export const ZONE_TICKS: readonly number[] = [...ZONE_RANGES.map((r) => r[0]), CURVE_LAST_LEVEL];

export type Marker = 'H' | 'SH' | 'Boss' | 'Feier' | null;

/**
 * Markierung eines Levels. Ab Level 51 aus dem Typ der Kurve (`curveSpec`: hart = H, superhart = SH, Boss, Spaß = Feier);
 * davor und dahinter aus dem Band (GDD 6.1): H = 1,6–2,0, SH ≤ 2,5, jedes 10. Level ist Feier.
 */
export function markerFor(no: number, band: readonly [number, number]): Marker {
  if (no > LEGACY_LAST_LEVEL && no <= CURVE_LAST_LEVEL) {
    switch (curveSpec(no).type) {
      case 'hard':
        return 'H';
      case 'superhard':
        return 'SH';
      case 'boss':
        return 'Boss';
      case 'fun':
        return 'Feier';
      default:
        return null;
    }
  }
  if (band[1] >= 2.3) return 'SH';
  if (band[0] >= 1.55) return 'H';
  if (no > 0 && no % 10 === 0 && band[1] <= 1.15) return 'Feier';
  return null;
}

export interface ChainRow {
  no: number;
  file: string;
  id: string;
  name: string;
  zone: ZoneId;
  kinds: string[];
  band: [number, number];
  /** Soll-Band der Kurve (`curveSpec`, Level 1–184), sonst `null`. */
  curve: [number, number] | null;
  /** Typ in der Kurve (Level 1–184), sonst `null`. */
  type: CurveType | null;
  moves: number;
  /** Versuche (Anfänger); null = nie gewonnen, undefined = keine Messung. */
  measured: number | null | undefined;
  source: 'frisch' | 'datei' | 'veraltet' | null;
  verdict: BandVerdict | null;
  marker: Marker;
  outlier: boolean;
  /** Hart direkt nach hart, superhart oder Boss (GDD 6.1: nie zwei harte Level hintereinander). */
  doubleHard: boolean;
}

export function buildChain(levels: readonly LevelDef[], fresh: Record<string, FreshResult>): ChainRow[] {
  const rows: ChainRow[] = levels.map((level, i) => {
    const no = levelNumber(level.id) || i + 1;
    const band: [number, number] = [level.difficulty.targetAttempts[0], level.difficulty.targetAttempts[1]];
    const f = fresh[level.id];
    const cal = calibrationFor(level.id);
    const json = JSON.stringify(level);
    let measured: number | null | undefined;
    let source: ChainRow['source'] = null;
    if (f && f.levelJson === json) {
      measured = f.attemptsEst;
      source = 'frisch';
    } else if (cal?.bots.novice) {
      measured = cal.bots.novice.attemptsEst;
      source = calibrationMatches(cal, level) ? 'datei' : 'veraltet';
    }
    const verdict = measured === undefined ? null : bandVerdict(measured, band);
    const spec = no >= 1 && no <= CURVE_LAST_LEVEL ? curveSpec(no) : null;
    return {
      no,
      file: `${String(i + 1).padStart(3, '0')}.json`,
      id: level.id,
      name: level.name ?? level.id,
      zone: level.zone,
      kinds: [...countElementKinds(level)],
      band,
      curve: spec ? [spec.targetAttempts[0], spec.targetAttempts[1]] : null,
      type: spec ? spec.type : null,
      moves: level.moves,
      measured,
      source,
      verdict,
      marker: markerFor(no, band),
      outlier: verdict !== null && verdict !== 'ok',
      doubleHard: false,
    };
  });
  const hard = (m: Marker): boolean => m === 'H' || m === 'SH' || m === 'Boss';
  for (let i = 1; i < rows.length; i++) {
    if (hard(rows[i - 1]!.marker) && hard(rows[i]!.marker)) rows[i]!.doubleHard = true;
  }
  return rows;
}

export const VERDICT_SHORT: Record<BandVerdict, string> = {
  ok: 'im Band',
  easier: 'zu leicht',
  harder: 'zu schwer',
  unsolved: 'nie gelöst',
};

/** Zahl im deutschen Format mit fester Nachkommastelle. */
export const de = (x: number, digits = 2): string => x.toFixed(digits).replace('.', ',');
