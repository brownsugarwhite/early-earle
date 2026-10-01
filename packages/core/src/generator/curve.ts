/**
 * Schwierigkeitskurve für alle 184 Level (Plan „L — Level 101–184“, Saga-Recherche).
 *
 * `curveSpec(index)` beschreibt jedes Level durch seinen Kurventyp, das Soll-Band der
 * Versuche (`targetAttempts`, gemessen als `attemptsEst = 1 / pWin(novice)`), das
 * vorgeschlagene Raster, den Zugfaktor und die Lage in der Kartenzone.
 *
 * - **Zonen** (Karte, 15 Abschnitte): `ZONE_LENGTHS` = 14, 12 × 7, 16 (Riesenbaum), 10, 12 × 5.
 * - **Zonenschablone** (12 Level): Lehren → Üben → Normal → Spaß → **Hart** → Atempause →
 *   Kombinieren → Normal → **Hart** → Spaß → Normal → **Boss** am Zonenende. Varianten für
 *   10 (zwei Spitzen, damit der Spitzenanteil 17–25 % bleibt), 14 und 16 (Riesenbaum:
 *   Superhart auf Knoten 13).
 * - **Globale Rampe**: `1 + (b − 1)·(1 + 0,045·(z − 1))` auf beide Bandgrenzen, Zugfaktor
 *   `· (1 − 0,2·(z − 1)/14)`; Deckel `hi ≤ 5`, bis Zone 10 `hi ≤ 4,5`; Zonenstart `hi ≤ 1,2`,
 *   Atempause nach einer Spitze `hi ≤ 1,35`; jedes Band ist in `pWin` mindestens 0,08 breit.
 * - **Neue Elementarten** nur bis Zone 8: zwei je Zone 5–8 (Position 1 und die Atempause 6).
 * - **Level 1–50** sind eingefroren (Inhalt und Dateien bleiben): Die Kurve beschreibt sie
 *   rückwirkend aus ihren Tabellen (`legacy: true`), ihr Band ist das alte Band.
 */

import type { ElementId, LevelType } from './generateLevel';
import { TJORIZO_SPECS } from './tjorizo';
import { SYRUP_SPECS } from './syrup';

export type CurveType =
  | 'tutorial'
  | 'intro'
  | 'practice'
  | 'normal'
  | 'fun'
  | 'combine'
  | 'hard'
  | 'superhard'
  | 'boss';

export const CURVE_TYPES: readonly CurveType[] = [
  'tutorial',
  'intro',
  'practice',
  'normal',
  'fun',
  'combine',
  'hard',
  'superhard',
  'boss',
];

/** Level je Kartenzone (Route w09 · w06 · w04 · w10 · w05 · w02 · w07 · w08 · w01 · w03 · w11 · w12 · w13 · w14 · w15). */
export const ZONE_LENGTHS: readonly number[] = [14, 12, 12, 12, 12, 12, 12, 12, 16, 10, 12, 12, 12, 12, 12];

/** Welt je Kartenzone (nur für Berichte). */
export const ZONE_WORLDS: readonly string[] = [
  'w09',
  'w06',
  'w04',
  'w10',
  'w05',
  'w02',
  'w07',
  'w08',
  'w01',
  'w03',
  'w11',
  'w12',
  'w13',
  'w14',
  'w15',
];

/** Höchste Levelnummer der Kurve (= Summe der Zonenlängen). */
export const CURVE_LAST_LEVEL = ZONE_LENGTHS.reduce((s, n) => s + n, 0);

/** Level 1–50 bleiben unverändert (Fortschritt, Tutorials, Intros); die Kurve beschreibt sie nur. */
export const LEGACY_LAST_LEVEL = 50;

/** Erste und letzte Levelnummer jeder Zone (1-basiert). */
export const ZONE_RANGES: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  let first = 1;
  for (const n of ZONE_LENGTHS) {
    out.push([first, first + n - 1]);
    first += n;
  }
  return out;
})();

/** Neue Elementarten je Zone (nur Zonen 5–8; Position 1 und Position 6). */
export const NEW_ELEMENTS: Readonly<Record<number, readonly [ElementId, ElementId]>> = {
  5: ['sleeper', 'rot'],
  6: ['toxic', 'scrapMound'],
  7: ['portal', 'fog'],
  8: ['current', 'stray'],
};

/** Wahrzeichen-Knoten, auf denen eine Spitze liegt (für die Karte). */
export const LANDMARK_SPIKES: Readonly<Record<number, string>> = {
  13: 'Müllfelsen (w09)',
  38: 'Klippe (w04)',
  111: 'Riesenbaum (w01)',
  160: 'Monolith-Gipfel (w13)',
  184: 'Klippe (w15)',
};

export interface CurveSpec {
  /** 1-basierte Levelnummer. */
  index: number;
  type: CurveType;
  /** Soll-Band der Versuche (Anfänger-Bot), nach Rampe und Deckeln. */
  targetAttempts: [number, number];
  /** Vorgeschlagenes Raster (die Spec darf für ihr Element größer werden). */
  grid: { w: number; h: number };
  /** Zugfaktor relativ zum Grundbudget (Typ × Rampe). */
  moveBudgetFactor: number;
  /** Neue Elementart, die dieses Level einführt. */
  newElement?: ElementId;
  /** 1-basierte Kartenzone. */
  zoneIndex: number;
  /** 1-basierte Position in der Zone. */
  positionInZone: number;
  zoneLength: number;
  /** Fortschritt innerhalb der Zone für normale Level (0 = Atempause, 1 = vor dem Boss). */
  t?: number;
  /** Spitze (hart, superhart, Boss). */
  spike: boolean;
  /** Atempause direkt nach einer Spitze (`hi ≤ 1,35`). */
  breather: boolean;
  /** Level 1–50: eingefroren, Kurve nur beschreibend. */
  legacy: boolean;
  /** Wahrzeichen, auf dem die Spitze liegt. */
  landmark?: string;
}

interface Slot {
  type: CurveType;
  t?: number;
}

// ---- Typen (Zone 1, vor der Rampe) --------------------------------------------------

const BASE_BAND: Record<Exclude<CurveType, 'normal'>, [number, number]> = {
  tutorial: [1.0, 1.03],
  intro: [1.05, 1.2],
  practice: [1.1, 1.35],
  fun: [1.03, 1.2],
  combine: [1.25, 1.65],
  hard: [1.8, 2.9],
  superhard: [2.9, 5.0],
  boss: [2.5, 4.0],
};

/** Normal: ein Fenster, das mit `t` durch [1,25, 1,80] wandert. */
function normalBand(t: number): [number, number] {
  return [1.2 + 0.25 * t, 1.45 + 0.35 * t];
}

/** Atempause (Normal t = 0 nach einer Spitze). */
const BREATHER_BAND: [number, number] = [1.1, 1.35];

const MOVE_FACTOR: Record<CurveType, number> = {
  tutorial: 1.4,
  intro: 1.3,
  practice: 1.2,
  normal: 1.0,
  fun: 1.15,
  combine: 1.0,
  hard: 0.9,
  superhard: 0.85,
  boss: 0.85,
};

const GRID: Record<CurveType, { w: number; h: number }> = {
  tutorial: { w: 3, h: 3 },
  intro: { w: 4, h: 4 },
  practice: { w: 4, h: 4 },
  normal: { w: 4, h: 4 },
  fun: { w: 5, h: 5 },
  combine: { w: 5, h: 5 },
  hard: { w: 4, h: 4 },
  superhard: { w: 4, h: 4 },
  boss: { w: 5, h: 5 },
};

// ---- Zonenschablonen ------------------------------------------------------------------

const N = (t: number): Slot => ({ type: 'normal', t });
const S = (type: CurveType): Slot => ({ type });

/** 12: Lehren · Üben · Normal · Spaß · Hart · Atempause · Kombi · Normal · Hart · Spaß · Normal · Boss. */
const T12: Slot[] = [
  S('intro'),
  S('practice'),
  N(0.2),
  S('fun'),
  S('hard'),
  N(0),
  S('combine'),
  N(0.5),
  S('hard'),
  S('fun'),
  N(1),
  S('boss'),
];
/** 10 (Kuppelbaum nach dem Riesenbaum): ohne Spaß 4 und Hart 9 — zwei Spitzen (20 %). */
const T10: Slot[] = [
  S('intro'),
  S('practice'),
  N(0.2),
  S('hard'),
  N(0),
  S('combine'),
  N(0.5),
  S('fun'),
  N(1),
  S('boss'),
];
/** 14: + Üben nach 2 und Normal nach 8. */
const T14: Slot[] = [
  S('intro'),
  S('practice'),
  S('practice'),
  N(0.2),
  S('fun'),
  S('hard'),
  N(0),
  S('combine'),
  N(0.5),
  N(0.7),
  S('hard'),
  S('fun'),
  N(1),
  S('boss'),
];
/** 16 (Riesenbaum): … Normal · Superhart (Baum-Spitze) · Spaß · Kombi · Boss (vor dem Aufzug). */
const T16: Slot[] = [
  S('intro'),
  S('practice'),
  N(0.2),
  S('fun'),
  S('hard'),
  N(0),
  S('combine'),
  N(0.5),
  S('hard'),
  S('fun'),
  N(0.7),
  N(1),
  S('superhard'),
  S('fun'),
  S('combine'),
  S('boss'),
];

function template(length: number): Slot[] {
  switch (length) {
    case 10:
      return T10;
    case 12:
      return T12;
    case 14:
      return T14;
    case 16:
      return T16;
    default:
      throw new Error(`no zone template for ${length} levels`);
  }
}

// ---- Rampe und Deckel -----------------------------------------------------------------

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Rampenfaktor der Zone z (1-basiert): Zone 15 ×1,63. */
export function zoneRamp(z: number): number {
  return 1 + 0.045 * (z - 1);
}

/** Zugfaktor-Rampe: Zone 15 × 0,8. */
export function zoneMoveRamp(z: number): number {
  return 1 - (0.2 * (z - 1)) / 14;
}

/** Deckel der oberen Bandgrenze in Zone z. */
export function zoneCap(z: number): number {
  return z <= 10 ? 4.5 : 5;
}

/** Mindestbreite eines Bands in Gewinnwahrscheinlichkeit (sonst trifft keine Kalibrierung). */
const MIN_PWIN_WIDTH = 0.08;

function rampBand(
  base: [number, number],
  z: number,
  opts: { reset: boolean; breather: boolean },
): [number, number] {
  const f = zoneRamp(z);
  let lo = 1 + (base[0] - 1) * f;
  let hi = 1 + (base[1] - 1) * f;
  hi = Math.min(hi, zoneCap(z));
  if (opts.reset) hi = Math.min(hi, 1.2);
  if (opts.breather) hi = Math.min(hi, 1.35);
  lo = Math.min(lo, 1 / (1 / hi + MIN_PWIN_WIDTH));
  return [round2(Math.max(1, lo)), round2(hi)];
}

/** Band eines Typs in Zone z ohne Lage in der Schablone (Entwürfe hinter der Kurve). */
export function curveBand(type: LevelType, z: number): [number, number] {
  const t = toCurveType(type);
  const base: [number, number] = t === 'normal' ? normalBand(0.5) : BASE_BAND[t];
  return rampBand(base, z, { reset: false, breather: false });
}

function toCurveType(type: LevelType): CurveType {
  switch (type) {
    case 'comfort':
      return 'practice';
    case 'skill':
    case 'breather':
      return 'normal';
    case 'veryHard':
      return 'superhard';
    case 'celebration':
    case 'fuu':
      return 'fun';
    default:
      return type;
  }
}

// ---- Rückschau auf 1–50 ---------------------------------------------------------------

const LEGACY_NEW: Readonly<Record<number, ElementId>> = {
  6: 'pillar',
  11: 'scrap',
  14: 'spore',
  16: 'amoeba',
  18: 'cap',
  21: 'withered',
  22: 'deepWithered',
  24: 'line',
  26: 'fence',
  27: 'oil',
  31: 'cage',
  34: 'burst',
  41: 'crust',
};

/** Altes Band (Schwellen 20/60) — gilt unverändert für Level 1–50. */
export function legacyTargetAttempts(index: number, type: LevelType): [number, number] {
  switch (type) {
    case 'hard':
      return [1.6, 2.0];
    case 'veryHard':
      return [2.0, 2.5];
    case 'comfort':
      return index <= 20 ? [1.0, 1.1] : [1.1, 1.3];
    case 'skill':
      return index <= 20 ? [1.0, 1.1] : [1.2, 1.4];
    default:
      return [1.0, 1.1];
  }
}

function legacyCurveType(index: number, type: LevelType): CurveType {
  if (index <= 6) return 'tutorial';
  return type === 'tutorial' ? 'intro' : toCurveType(type);
}

// ---- curveSpec ------------------------------------------------------------------------

/** Kartenzone (1-basiert) und Position eines Levels. */
export function zoneOfLevel(index: number): { zoneIndex: number; positionInZone: number; zoneLength: number } {
  if (!Number.isInteger(index) || index < 1 || index > CURVE_LAST_LEVEL)
    throw new Error(`level ${index} is outside the curve (1–${CURVE_LAST_LEVEL})`);
  for (let z = 0; z < ZONE_RANGES.length; z++) {
    const [a, b] = ZONE_RANGES[z]!;
    if (index >= a && index <= b)
      return { zoneIndex: z + 1, positionInZone: index - a + 1, zoneLength: b - a + 1 };
  }
  throw new Error(`level ${index} has no zone`);
}

const cache = new Map<number, CurveSpec>();

export function curveSpec(index: number): CurveSpec {
  const hit = cache.get(index);
  if (hit) return hit;
  const { zoneIndex: z, positionInZone: pos, zoneLength: len } = zoneOfLevel(index);
  let spec: CurveSpec;

  if (index <= LEGACY_LAST_LEVEL) {
    const legacy = [...TJORIZO_SPECS, ...SYRUP_SPECS].find((s) => s.index === index)!;
    const type = legacyCurveType(index, legacy.type);
    const w = legacy.mask ? legacy.mask[0]!.length : legacy.grid.w;
    const h = legacy.mask ? legacy.mask.length : legacy.grid.h;
    const prev = index > 1 ? curveSpec(index - 1) : null;
    spec = {
      index,
      type,
      targetAttempts: legacyTargetAttempts(index, legacy.type),
      grid: { w, h },
      moveBudgetFactor: round2(MOVE_FACTOR[type] * zoneMoveRamp(z)),
      zoneIndex: z,
      positionInZone: pos,
      zoneLength: len,
      spike: type === 'hard' || type === 'superhard' || type === 'boss',
      breather: prev !== null && prev.spike,
      legacy: true,
    };
    const ne = LEGACY_NEW[index];
    if (ne) spec.newElement = ne;
  } else {
    const slots = template(len);
    const slot = slots[pos - 1]!;
    let type = slot.type;
    const intros = NEW_ELEMENTS[z];
    let newElement: ElementId | undefined;
    if (pos === 1) {
      if (intros) newElement = intros[0];
      else type = 'fun';
    }
    // Zweite Einführung der Zone auf der Atempause nach der ersten Spitze.
    const firstSpike = slots.findIndex((s) => s.type === 'hard') + 1;
    if (intros && pos === firstSpike + 1) {
      type = 'intro';
      newElement = intros[1];
    }
    const prevSlot = pos > 1 ? slots[pos - 2]! : null;
    const breather =
      prevSlot !== null &&
      (prevSlot.type === 'hard' || prevSlot.type === 'superhard' || prevSlot.type === 'boss');
    const reset = pos === 1;
    const base: [number, number] =
      type === 'normal'
        ? breather
          ? BREATHER_BAND
          : normalBand(slot.t ?? 0.5)
        : BASE_BAND[type];
    spec = {
      index,
      type,
      targetAttempts: rampBand(base, z, { reset, breather }),
      grid: { ...GRID[type] },
      moveBudgetFactor: round2(MOVE_FACTOR[type] * zoneMoveRamp(z)),
      zoneIndex: z,
      positionInZone: pos,
      zoneLength: len,
      spike: type === 'hard' || type === 'superhard' || type === 'boss',
      breather,
      legacy: false,
    };
    if (type === 'normal' && slot.t !== undefined) spec.t = slot.t;
    if (newElement) spec.newElement = newElement;
  }
  const lm = LANDMARK_SPIKES[index];
  if (lm && spec.spike) spec.landmark = lm;
  cache.set(index, spec);
  return spec;
}

/** Alle Kurven-Specs 1…184. */
export function curveSpecs(): CurveSpec[] {
  return Array.from({ length: CURVE_LAST_LEVEL }, (_, i) => curveSpec(i + 1));
}

/** Levelnummern aller Spitzen (hart, superhart, Boss) — für die Karte (`path.ts` `spikes`). */
export function spikeLevels(): number[] {
  return curveSpecs()
    .filter((c) => c.spike)
    .map((c) => c.index);
}
