/**
 * Automatische Nachjustierung der Level 51–184 gegen die Schwierigkeitskurve.
 *
 *   pnpm --filter @ee/tools-levels tune [from] [to] [--only 55,59] [--jobs 6] [--rounds 3]
 *        [--dry] [--verbose]
 *
 * Je Level (deterministisch, der Seed bleibt):
 *   1. Leiter: Varianten der Grund-Spec aus Zielgröße (`dial`), Startmasse (`start`) und
 *      Spawn-Rate (`t2`), nach Abstand zur Grund-Spec sortiert.
 *   2. Anfänger-Sonde je Variante (200 Seeds, großes Zugbudget): aus den Siegzügen folgt die
 *      Gewinnrate für *jedes* Budget (`probe.ts`). Gesucht sind Budgets in der Zugspanne des Typs,
 *      bei denen die Gewinnrate im Soll-Band (`curveSpec`) liegt, möglichst mittig.
 *   3. Für die besten Varianten die Sonde des starken Bots (50 Seeds): er muss beim gewählten
 *      Budget ≥ 94 % gewinnen (außer Boss); Spitzen bevorzugen knappe Budgets (Near-Miss).
 *   4. Prüfung mit der echten Kalibrierung (`calib.ts`), höchstens `--rounds` Runden je Level
 *      (Züge ±1/±2 oder die nächste Variante).
 * Ergebnis: `packages/core/src/generator/tuning.ts` (Einträge außerhalb des Bereichs bleiben).
 * Danach `generate 51 184` und `calibrate --strict`.
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import {
  applyTune,
  baseSpec,
  curveSpec,
  generateLevel,
  LAST_LEVEL,
  LEGACY_LAST_LEVEL,
  TUNING,
  type LevelDef,
  type LevelSpec,
  type Tune,
} from '@ee/core';
import { calibrateBot } from './calib';
import { meanWinAt, pAt, probeLevel, type Probe } from './probe';

const here = dirname(fileURLToPath(import.meta.url));
const tuningFile = resolve(here, '../../packages/core/src/generator/tuning.ts');

const args = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : def;
};
const ROUNDS = Number(opt('rounds', '3'));
const VERBOSE = args.includes('--verbose');
const NOVICE_PROBE = 200;
const STRONG_PROBE = 50;
const STRONG_PROBE_MIN = 0.94;
const STRONG_GATE = 0.9;
/** Boss: der starke Bot soll ihn meistens schaffen (Können statt Glück), sonst Rückfall ohne Schranke. */
const BOSS_STRONG_MIN = 0.6;
/** So viele Varianten mit passendem Anfänger-Budget werden gesammelt, bevor der starke Bot prüft. */
const CANDIDATES = 6;
/** Spitzen brauchen mehr Varianten: der starke Bot muss beim knappen Budget sicher bleiben. */
const SPIKE_CANDIDATES = 12;

/**
 * Zugspanne je Typ: Ein Casual-Level soll in 1–3 Minuten gespielt sein; harte Level sind kurz
 * („if a level is really hard, it must be really short“).
 */
export const MOVE_RANGE: Record<string, [number, number]> = {
  intro: [10, 30],
  practice: [10, 32],
  normal: [10, 32],
  combine: [10, 32],
  fun: [10, 32],
  hard: [8, 26],
  superhard: [8, 24],
  boss: [12, 34],
};

// ---- Leiter der Varianten -------------------------------------------------------------------

interface Knobs {
  d: number;
  s: number;
  t2: number;
}

function tuneOf(k: Knobs, moves: number): Tune {
  const t: Tune = { moves };
  if (k.d !== 0) t.dial = k.d;
  if (k.s !== 0) t.start = k.s;
  if (k.t2 !== 1) t.t2 = k.t2;
  return t;
}

const specFor = (base: LevelSpec, k: Knobs, moves: number): LevelSpec =>
  applyTune(base, tuneOf(k, moves));
const shape = (base: LevelSpec, k: Knobs) => JSON.stringify(specFor(base, k, 1));
const cost = (k: Knobs) =>
  Math.abs(k.d) + 0.5 * Math.abs(k.s) + (k.t2 === 1 ? 0 : k.t2 === 2 || k.t2 === 0.5 ? 0.7 : 1.2);

/** Alle unterscheidbaren Varianten, die nächsten zuerst. */
function ladder(base: LevelSpec): Knobs[] {
  const fixed = base.board !== undefined;
  const ds = fixed ? [0, 1, -1, 2, -2, 3] : [0, 1, -1, 2];
  const ss = fixed ? [0, 1, -1, 2, -2, 3, -3, 4, 5, 6] : [0, 1, -1, 2, -2, 3, -3];
  const ts = [1, 2, 0.5, 3];
  const all: Knobs[] = [];
  for (const d of ds)
    for (const s of ss) for (const t2 of ts) if (s === 0 || t2 === 1) all.push({ d, s, t2 });
  all.sort((a, b) => cost(a) - cost(b));
  const seen = new Set<string>();
  return all.filter((k) => {
    const key = shape(base, k);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---- Wahl der Züge --------------------------------------------------------------------------

interface Window {
  pLo: number;
  pHi: number;
  mid: number;
  w: number;
}

function windowOf(band: [number, number]): Window {
  const pLo = 1 / band[1];
  const pHi = 1 / band[0];
  return { pLo, pHi, mid: (pLo + pHi) / 2, w: pHi - pLo };
}

/** Budgets in der Spanne, bei denen der Anfänger im Band liegt (beste zuerst). */
function noviceFits(
  nv: Probe,
  win: Window,
  range: [number, number],
): { m: number; score: number }[] {
  const out: { m: number; score: number }[] = [];
  for (let m = range[0]; m <= Math.min(range[1], nv.budget); m++) {
    const pN = pAt(nv, m);
    if (pN < win.pLo || pN > win.pHi) continue;
    const inner = pN >= win.pLo + 0.2 * win.w && pN <= win.pHi - 0.2 * win.w;
    out.push({ m, score: Math.abs(pN - win.mid) / win.w + (inner ? 0 : 0.5) });
  }
  return out.sort((a, b) => a.score - b.score || a.m - b.m);
}

// ---- ein Level ------------------------------------------------------------------------------

interface Verified {
  tune: Tune;
  att: number | null;
  pS: number;
  ok: boolean;
}

export interface TuneResult {
  index: number;
  tune: Tune;
  ok: boolean;
  att: number | null;
  pS: number;
  band: [number, number];
  probes: number;
  rounds: number;
  log: string[];
}

function distance(att: number | null, band: [number, number]): number {
  if (att === null) return 99;
  if (att < band[0]) return band[0] - att;
  if (att > band[1]) return att - band[1];
  return 0;
}

export function tuneLevel(index: number): TuneResult {
  const c = curveSpec(index);
  const base = baseSpec(index);
  const band = c.targetAttempts;
  const win = windowOf(band);
  const needStrong = c.type !== 'boss';
  const spike = c.spike;
  const range = MOVE_RANGE[c.type] ?? [10, 32];
  const budget = range[1] + 8;
  const log: string[] = [];
  let probes = 0;
  let rounds = 0;
  let best = null as Verified | null;
  const score = (x: Verified) =>
    distance(x.att, band) + (needStrong ? Math.max(0, STRONG_GATE - x.pS) * 4 : 0);

  const verify = (k: Knobs, m: number): Verified => {
    const tune = tuneOf(k, m);
    const level: LevelDef = generateLevel(applyTune(base, tune));
    const nv = calibrateBot(level, 'novice');
    const st = calibrateBot(level, 'strong');
    const att = nv.attemptsEst;
    const ok = distance(att, band) === 0 && (!needStrong || st.pWin >= STRONG_GATE);
    const v: Verified = { tune, att, pS: st.pWin, ok };
    if (!best || (v.ok && !best.ok) || (!best.ok && score(v) < score(best))) best = v;
    rounds++;
    log.push(
      `verify ${JSON.stringify(tune)} att=${att?.toFixed(2) ?? '∞'} S=${st.pWin.toFixed(2)}${ok ? ' ✓' : ''}`,
    );
    return v;
  };

  // 1–2: Anfänger-Sonden entlang der Leiter.
  const candidates: { k: Knobs; fits: { m: number; score: number }[]; level: LevelDef }[] = [];
  let nearest: { k: Knobs; m: number; gap: number } | null = null;
  for (const k of ladder(base)) {
    if (candidates.length >= (spike ? SPIKE_CANDIDATES : CANDIDATES)) break;
    const level = generateLevel(specFor(base, k, budget));
    const nv = probeLevel(level, 'novice', NOVICE_PROBE, budget);
    probes++;
    const fits = noviceFits(nv, win, range);
    if (fits.length > 0) candidates.push({ k, fits, level });
    else {
      // für den Notfall: das Budget, das dem Band am nächsten kommt
      for (let m = range[0]; m <= range[1]; m++) {
        const pN = pAt(nv, m);
        const gap = pN < win.pLo ? win.pLo - pN : pN > win.pHi ? pN - win.pHi : 0;
        if (!nearest || gap < nearest.gap) nearest = { k, m, gap };
      }
    }
    if (VERBOSE && fits.length > 0)
      log.push(
        `novice ${JSON.stringify(k)}: m ${fits
          .map((f) => f.m)
          .sort((a, b) => a - b)
          .join(',')}`,
      );
  }

  // 3–4: starker Bot und Prüfung. Boss: erst Varianten, die der starke Bot ≥ 60 % schafft
  // (Können statt Glück), dann notfalls ohne diese Schranke.
  const passes = needStrong ? [STRONG_PROBE_MIN] : [BOSS_STRONG_MIN, 0];
  for (const floor of passes) {
    if (best?.ok) break;
    for (const cand of candidates) {
      if (rounds >= ROUNDS) break;
      let pick = cand.fits[0]!.m;
      if (needStrong || spike) {
        const st = probeLevel(cand.level, 'strong', STRONG_PROBE, budget);
        probes++;
        const ok = cand.fits.filter((f) => pAt(st, f.m) >= floor);
        if (ok.length === 0) {
          log.push(
            `strong ${JSON.stringify(cand.k)}: zu unsicher (S(${cand.fits[0]!.m})=${pAt(st, cand.fits[0]!.m).toFixed(2)})`,
          );
          continue;
        }
        // Spitzen: unter fast gleich guten Budgets das knappste (Near-Miss).
        const rest = (m: number) => (pAt(st, m) > 0 ? (m - meanWinAt(st, m)) / m : 0);
        ok.sort(
          (a, b) =>
            a.score + (spike ? 0.3 * rest(a.m) : 0) - (b.score + (spike ? 0.3 * rest(b.m) : 0)),
        );
        pick = ok[0]!.m;
      }
      let m = pick;
      let v = verify(cand.k, m);
      const tried = new Set<number>([m]);
      while (!v.ok && rounds < ROUNDS) {
        let next = m;
        if (needStrong && v.pS < STRONG_GATE && (v.att === null || v.att >= band[0])) next = m + 1;
        else if (v.att === null || v.att > band[1])
          next = m + (v.att === null || v.att > band[1] * 1.25 ? 2 : 1);
        else if (v.att < band[0]) next = m - (v.att < band[0] - (band[1] - band[0]) * 0.5 ? 2 : 1);
        else break;
        if (next < 4 || next > 98 || tried.has(next)) break;
        tried.add(next);
        m = next;
        v = verify(cand.k, m);
      }
      if (v.ok) break;
    }
  }

  if (!best && nearest) verify(nearest.k, nearest.m);
  const fin: Verified = best ?? {
    tune: { moves: generateLevel(base).moves },
    att: null,
    pS: 0,
    ok: false,
  };
  return { index, tune: fin.tune, ok: fin.ok, att: fin.att, pS: fin.pS, band, probes, rounds, log };
}

// ---- tuning.ts schreiben -------------------------------------------------------------------

function writeTuning(entries: Map<number, Tune>): void {
  const lines = [...entries.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, t]) => {
      const parts = [`moves: ${t.moves}`];
      if (t.dial !== undefined) parts.push(`dial: ${t.dial}`);
      if (t.start !== undefined) parts.push(`start: ${t.start}`);
      if (t.t2 !== undefined) parts.push(`t2: ${t.t2}`);
      return `  ${i}: { ${parts.join(', ')} },`;
    });
  const src = readFileSync(tuningFile, 'utf8');
  const head = src.slice(0, src.indexOf('export const TUNING'));
  writeFileSync(
    tuningFile,
    `${head}export const TUNING: Readonly<Record<number, Tune>> = {\n${lines.join('\n')}\n};\n`,
  );
}

// ---- Prozesse -------------------------------------------------------------------------------

async function runWorker(): Promise<void> {
  const rl = createInterface({ input: process.stdin });
  for await (const line of rl) {
    const index = Number(line.trim());
    if (!Number.isFinite(index) || index <= 0) continue;
    process.stdout.write(JSON.stringify(tuneLevel(index)) + '\n');
  }
}

async function runParent(): Promise<void> {
  const positional = args.filter(
    (a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]!.startsWith('--')),
  );
  const from = Number(positional[0] ?? LEGACY_LAST_LEVEL + 1);
  const to = Number(positional[1] ?? positional[0] ?? LAST_LEVEL);
  const only = opt('only', '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => n > 0);
  const indices = only.length
    ? only
    : Array.from({ length: to - from + 1 }, (_, i) => from + i).filter(
        (i) => i > LEGACY_LAST_LEVEL,
      );
  const jobs = Math.max(1, Math.min(Number(opt('jobs', '6')), indices.length));
  const dry = args.includes('--dry');
  // Teure Level (Spitzen, Boss) zuerst, damit die Arbeiter am Ende nicht auf einen Nachzügler warten.
  const queue = [...indices].sort(
    (a, b) => Number(curveSpec(b).spike) - Number(curveSpec(a).spike) || a - b,
  );
  const results: TuneResult[] = [];
  const t0 = performance.now();

  await Promise.all(
    Array.from(
      { length: jobs },
      () =>
        new Promise<void>((done, fail) => {
          const child = spawn(
            process.execPath,
            [...process.execArgv, fileURLToPath(import.meta.url), '--worker'],
            {
              stdio: ['pipe', 'pipe', 'inherit'],
            },
          );
          const feed = () => {
            const next = queue.shift();
            if (next === undefined) child.stdin.end();
            else child.stdin.write(`${next}\n`);
          };
          createInterface({ input: child.stdout }).on('line', (line) => {
            if (!line.startsWith('{')) return;
            const r = JSON.parse(line) as TuneResult;
            results.push(r);
            const c = curveSpec(r.index);
            console.log(
              `${String(r.index).padStart(3)} ${c.type.padEnd(9)} [${r.band.join('–')}] → ${JSON.stringify(r.tune)} att=${r.att?.toFixed(2) ?? '∞'} S=${r.pS.toFixed(2)} ${r.ok ? 'ok' : 'FAIL'} (${r.probes} Sonden, ${r.rounds} Runden, ${((performance.now() - t0) / 1000).toFixed(0)}s)`,
            );
            if (!r.ok || VERBOSE) for (const l of r.log) console.log(`      ${l}`);
            feed();
          });
          child.on('exit', (code) =>
            code === 0 ? done() : fail(new Error(`worker exit ${code}`)),
          );
          feed();
        }),
    ),
  );

  results.sort((a, b) => a.index - b.index);
  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length} Level in ${((performance.now() - t0) / 1000).toFixed(0)} s, ${failed.length} ohne Band: ${failed.map((r) => r.index).join(', ') || '–'}`,
  );
  if (!dry) {
    const merged = new Map<number, Tune>(Object.entries(TUNING).map(([k, v]) => [Number(k), v]));
    for (const r of results) merged.set(r.index, r.tune);
    writeTuning(merged);
    console.log(`wrote ${tuningFile}`);
  }
}

if (args.includes('--worker')) await runWorker();
else await runParent();
