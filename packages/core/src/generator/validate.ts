/**
 * Validierung der Schwierigkeitskurve (Plan „L“, 13 Checks) plus Band-Gate.
 *
 * `validateCurve(specs, calibration?, levels?)` prüft
 *   - auf den Kurven-Specs: Spitzenabstand, Atempausen, Zonen-Reset, Boss-Maximum, gleitender
 *     Mittelwert, Spitzenanteil, Zugfaktoren (Checks 1–6, 11),
 *   - mit den erzeugten Leveln: Artenzahl, Kombi ≤ 2, Boss = Zonen-Set, Signatur-Vielfalt (12, 13),
 *   - mit der Kalibrierung (`_calibration.json`): Band-Gate, Tutorials, Anfänger-Median,
 *     starker Bot ≥ 0,9, Near-Miss (B, 7–10).
 * Level 1–50 sind eingefroren: Verstöße, die nur sie betreffen, sind Warnungen.
 */

import type { LevelDef } from '../schema/level';
import { countElementKinds } from '../schema/level';
import type { CurveSpec } from './curve';

export interface CalibrationBot {
  n: number;
  pWin: number;
  attemptsEst: number | null;
  meanMovesWon: number;
  /** Median des Zielfortschritts verlorener Partien (nur Anfänger, ab Kalibrierung v2). */
  lossProgress?: number | null;
}

export interface CalibrationEntry {
  id: string;
  file: string;
  moves: number;
  targetAttempts: [number, number];
  bots: { strong?: CalibrationBot; novice?: CalibrationBot };
}

export interface CurveLevelInfo {
  index: number;
  level: LevelDef;
  /** Festes Brett (ASCII) statt Zufallsplatzierung. */
  fixed: boolean;
  /** Zonen-Set (nur Boss-Check). */
  zoneSet?: readonly string[];
}

export type CheckId =
  | 'B'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | '13';

export interface CurveIssue {
  check: CheckId;
  severity: 'error' | 'warn';
  index?: number;
  zone?: number;
  message: string;
}

export interface CurveReport {
  issues: CurveIssue[];
  errors: CurveIssue[];
  warnings: CurveIssue[];
}

/** Grenzwerte der Checks (Plan „Validierungs-Checks“). */
export const CURVE_LIMITS = {
  spikeDistance: 3,
  breatherHi: 1.35,
  resetHi: 1.2,
  rollingWindow: 5,
  rollingLo: [2.0, 2.5, 3.0] as const,
  /** 17–25 % (2 von 12 = 16,7 % zählt als 17 %). */
  spikeShare: [1 / 6, 0.25] as const,
  firstHard: 10,
  tutorialPWin: 0.97,
  attemptsL1to12: 15,
  noviceWarn: 5,
  noviceError: 8,
  strongPWin: 0.9,
  nearMissRest: 0.15,
  lossProgress: 0.7,
  maxKinds: 4,
  combineKinds: 2,
} as const;

/** Signatur (Brett, Zielarten, Artenmenge, festes Brett) — Check 13. */
export function levelSignature(level: LevelDef, fixed: boolean): string {
  const voids = level.grid.mask.some((r) => r.includes('#'))
    ? `[${level.grid.mask.map((r) => r.replace(/P/g, '.')).join('|')}]`
    : '';
  const goals = [...new Set(level.goals.map((g) => g.type))].sort().join('+');
  const kinds = [...countElementKinds(level)].sort().join('+');
  return `${level.grid.w}x${level.grid.h}${voids}|${goals}|${kinds || '-'}|${fixed ? 'fest' : 'zufall'}`;
}

const fmt = (x: number) => x.toFixed(2);

export function validateCurve(
  specs: readonly CurveSpec[],
  calibration?: readonly CalibrationEntry[] | null,
  levels?: readonly CurveLevelInfo[] | null,
): CurveReport {
  const issues: CurveIssue[] = [];
  const byIndex = new Map(specs.map((s) => [s.index, s] as const));
  const push = (
    check: CheckId,
    legacy: boolean,
    message: string,
    where: { index?: number; zone?: number } = {},
    severity: 'error' | 'warn' = 'error',
  ) => issues.push({ check, severity: legacy ? 'warn' : severity, message, ...where });

  const zones = new Map<number, CurveSpec[]>();
  for (const s of specs) {
    const z = zones.get(s.zoneIndex) ?? [];
    z.push(s);
    zones.set(s.zoneIndex, z);
  }
  const zoneLegacy = (z: number) => (zones.get(z) ?? []).every((s) => s.legacy);

  // 1 — Spitzen nie adjazent (Mindestabstand 3).
  const spikes = specs.filter((s) => s.spike);
  for (let i = 1; i < spikes.length; i++) {
    const a = spikes[i - 1]!;
    const b = spikes[i]!;
    if (b.index - a.index < CURVE_LIMITS.spikeDistance)
      push('1', a.legacy && b.legacy, `Spitzen ${a.index} und ${b.index} liegen nur ${b.index - a.index} auseinander`, {
        index: b.index,
      });
  }

  // 2 — nach hart/superhart/Boss eine Atempause (hi ≤ 1,35).
  for (const s of specs) {
    if (!s.spike) continue;
    const next = byIndex.get(s.index + 1);
    if (next && next.targetAttempts[1] > CURVE_LIMITS.breatherHi + 1e-9)
      push('2', next.legacy, `nach der Spitze ${s.index} folgt ${next.index} mit hi ${fmt(next.targetAttempts[1])} > 1,35`, {
        index: next.index,
      });
  }

  // 3 — Zonen-Reset: Position 1 hi ≤ 1,2.
  for (const s of specs) {
    if (s.positionInZone === 1 && s.targetAttempts[1] > CURVE_LIMITS.resetHi + 1e-9)
      push('3', s.legacy, `Zonenstart ${s.index} (Zone ${s.zoneIndex}) hat hi ${fmt(s.targetAttempts[1])} > 1,2`, {
        index: s.index,
        zone: s.zoneIndex,
      });
  }

  // 4 — Boss = Zonenmaximum, Boss(z+1) ≥ Boss(z).
  let prevBoss: CurveSpec | null = null;
  for (const [z, list] of [...zones.entries()].sort((a, b) => a[0] - b[0])) {
    const boss = list.find((s) => s.type === 'boss');
    if (!boss) {
      push('4', zoneLegacy(z), `Zone ${z} hat keinen Boss`, { zone: z });
      continue;
    }
    if (boss.index !== list[list.length - 1]!.index)
      push('4', boss.legacy, `Boss ${boss.index} steht nicht am Ende der Zone ${z}`, { index: boss.index, zone: z });
    for (const s of list) {
      if (s !== boss && s.targetAttempts[1] > boss.targetAttempts[1] + 1e-9)
        push('4', s.legacy, `Level ${s.index} (hi ${fmt(s.targetAttempts[1])}) liegt über dem Boss ${boss.index}`, {
          index: s.index,
          zone: z,
        });
    }
    if (
      prevBoss &&
      (boss.targetAttempts[0] < prevBoss.targetAttempts[0] - 1e-9 ||
        boss.targetAttempts[1] < prevBoss.targetAttempts[1] - 1e-9)
    )
      push('4', false, `Boss ${boss.index} ist leichter als Boss ${prevBoss.index}`, { index: boss.index, zone: z });
    prevBoss = boss;
  }

  // 5 — gleitender Mittelwert (5) der unteren Grenzen.
  const w = CURVE_LIMITS.rollingWindow;
  for (let i = w - 1; i < specs.length; i++) {
    const win = specs.slice(i - w + 1, i + 1);
    const mean = win.reduce((s, c) => s + c.targetAttempts[0], 0) / w;
    const z = specs[i]!.zoneIndex;
    const limit = CURVE_LIMITS.rollingLo[z <= 5 ? 0 : z <= 10 ? 1 : 2];
    if (mean > limit + 1e-9)
      push('5', win.every((c) => c.legacy), `gleitender Mittelwert ${fmt(mean)} bis Level ${specs[i]!.index} > ${limit}`, {
        index: specs[i]!.index,
      });
  }

  // 6 — Spitzenanteil 17–25 % je Zone, erster Hard ≥ L10.
  for (const [z, list] of zones) {
    const share = list.filter((s) => s.spike).length / list.length;
    if (share < CURVE_LIMITS.spikeShare[0] - 1e-9 || share > CURVE_LIMITS.spikeShare[1] + 1e-9)
      push('6', zoneLegacy(z), `Zone ${z}: Spitzenanteil ${(share * 100).toFixed(0)} % (Soll 17–25 %)`, { zone: z });
  }
  const firstHard = specs.find((s) => s.spike);
  if (firstHard && firstHard.index < CURVE_LIMITS.firstHard)
    push('6', firstHard.legacy, `erstes hartes Level ${firstHard.index} < 10`, { index: firstHard.index });

  // 11 — Zugfaktor hart/Boss < normal derselben Zone.
  for (const [z, list] of zones) {
    const normal = list.filter((s) => s.type === 'normal').map((s) => s.moveBudgetFactor);
    if (normal.length === 0) continue;
    const nMin = Math.min(...normal);
    for (const s of list)
      if ((s.type === 'hard' || s.type === 'superhard' || s.type === 'boss') && s.moveBudgetFactor >= nMin)
        push('11', s.legacy, `Zugfaktor ${s.moveBudgetFactor} von ${s.index} nicht unter normal (${nMin})`, {
          index: s.index,
          zone: z,
        });
  }

  // 12, 13 — Arten und Signaturen der erzeugten Level.
  if (levels && levels.length > 0) {
    for (const l of levels) {
      const c = byIndex.get(l.index);
      if (!c) continue;
      const kinds = countElementKinds(l.level);
      if (kinds.size > CURVE_LIMITS.maxKinds)
        push('12', c.legacy, `Level ${l.index}: ${kinds.size} Arten > 4`, { index: l.index });
      if (c.type === 'combine' && kinds.size > CURVE_LIMITS.combineKinds)
        push('12', c.legacy, `Kombi-Level ${l.index}: ${kinds.size} Arten > 2 (${[...kinds].join(', ')})`, {
          index: l.index,
        });
      if (c.type === 'boss' && l.zoneSet) {
        const missing = l.zoneSet.filter((k) => !kinds.has(k));
        if (missing.length > 0)
          push('12', c.legacy, `Boss ${l.index} ohne Zonen-Arten: ${missing.join(', ')}`, { index: l.index });
      }
      if (c.newElement && c.type === 'intro' && !c.legacy) {
        const others = [...kinds].filter((k) => k !== c.newElement && k !== 'burst' && k !== 'line');
        if (others.length > 0)
          push('12', false, `Einführung ${l.index} (${c.newElement}) zeigt weitere Arten: ${others.join(', ')}`, {
            index: l.index,
          }, 'warn');
      }
    }
    const sig = new Map<number, string>();
    for (const l of levels) sig.set(l.index, levelSignature(l.level, l.fixed));
    for (const a of levels) {
      const ca = byIndex.get(a.index);
      if (!ca) continue;
      for (const b of levels) {
        if (b.index <= a.index) continue;
        const cb = byIndex.get(b.index);
        if (!cb || Math.abs(cb.zoneIndex - ca.zoneIndex) > 1) continue;
        if (sig.get(a.index) === sig.get(b.index))
          push('13', ca.legacy && cb.legacy, `Level ${a.index} und ${b.index} haben dieselbe Signatur ${sig.get(a.index)}`, {
            index: b.index,
          });
      }
    }
  }

  // Kalibrierung: Band-Gate und Checks 7–10.
  if (calibration && calibration.length > 0) {
    const cal = new Map<number, CalibrationEntry>();
    for (const e of calibration) cal.set(Number(e.file.replace('.json', '')), e);
    let sum12 = 0;
    for (const s of specs) {
      const e = cal.get(s.index);
      if (!e) {
        push('B', s.legacy, `Level ${s.index} fehlt in der Kalibrierung`, { index: s.index });
        continue;
      }
      const nv = e.bots.novice;
      const st = e.bots.strong;
      const att = nv?.attemptsEst ?? null;
      const [lo, hi] = s.targetAttempts;
      if (s.index <= 12) sum12 += att ?? 99;
      // B — Band-Gate.
      if (att === null) push('B', s.legacy, `Level ${s.index}: Anfänger gewinnt nie`, { index: s.index });
      else if (att < lo - 1e-9 || att > hi + 1e-9)
        push('B', s.legacy, `Level ${s.index} (${s.type}): ${fmt(att)} Versuche außerhalb [${lo}, ${hi}]`, {
          index: s.index,
        });
      if (e.targetAttempts[0] !== lo || e.targetAttempts[1] !== hi)
        push('B', s.legacy, `Level ${s.index}: Band der Datei [${e.targetAttempts.join(', ')}] ≠ Kurve [${lo}, ${hi}]`, {
          index: s.index,
        });
      // 7 — Tutorials.
      if (s.index <= 6 && (nv?.pWin ?? 0) < CURVE_LIMITS.tutorialPWin)
        push('7', s.legacy, `Tutorial ${s.index}: Anfänger ${fmt(nv?.pWin ?? 0)} < 0,97`, { index: s.index });
      // 8 — Anfänger-Median.
      if (att !== null && att > CURVE_LIMITS.noviceError)
        push('8', s.legacy, `Level ${s.index}: ${fmt(att)} Versuche > 8`, { index: s.index });
      else if (att !== null && att > CURVE_LIMITS.noviceWarn)
        push('8', s.legacy, `Level ${s.index}: ${fmt(att)} Versuche > 5`, { index: s.index }, 'warn');
      // 9 — starker Bot ≥ 0,9 auf Nicht-Boss.
      if (s.type !== 'boss' && st && st.pWin < CURVE_LIMITS.strongPWin - 1e-9)
        push('9', s.legacy, `Level ${s.index} (${s.type}): starker Bot ${fmt(st.pWin)} < 0,9 (Glück)`, {
          index: s.index,
        });
      // 10 — Near-Miss (Warnungen).
      if ((s.type === 'hard' || s.type === 'superhard' || s.type === 'boss') && st && st.pWin > 0) {
        const rest = (e.moves - st.meanMovesWon) / e.moves;
        if (rest > CURVE_LIMITS.nearMissRest + 1e-9)
          push('10', s.legacy, `Spitze ${s.index}: starker Bot siegt mit ${(rest * 100).toFixed(0)} % Restzügen (> 15 %)`, {
            index: s.index,
          }, 'warn');
      }
      if (nv && nv.lossProgress !== undefined && nv.lossProgress !== null && s.type !== 'tutorial') {
        if (nv.lossProgress < CURVE_LIMITS.lossProgress - 1e-9)
          push('10', s.legacy, `Level ${s.index}: Anfänger verliert mit ${(nv.lossProgress * 100).toFixed(0)} % Zielfortschritt (< 70 %)`, {
            index: s.index,
          }, 'warn');
      }
    }
    const first12 = specs.filter((s) => s.index <= 12);
    if (first12.length === 12 && sum12 > CURVE_LIMITS.attemptsL1to12)
      push('7', first12.every((s) => s.legacy), `Level 1–12 brauchen zusammen ${fmt(sum12)} Versuche > 15`);
  }

  return {
    issues,
    errors: issues.filter((i) => i.severity === 'error'),
    warnings: issues.filter((i) => i.severity === 'warn'),
  };
}
