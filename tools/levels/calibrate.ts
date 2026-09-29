/**
 * Calibration: runs every content/levels/*.json through the `strong` and
 * `novice` bots (≤ 200 seeds each, sequential stopping once the Wilson 95 %
 * interval of pWin is narrower than ±0.05), prints a table and writes
 * content/levels/_calibration.json. Exits 1 when a level is unsolvable
 * (0 wins for `strong`) or a level file fails schema validation.
 *
 *   pnpm --filter @ee/tools-levels calibrate [--seeds 200] [--bots strong,novice]
 *        [--half 0.05] [--force] [--only 001,002]
 *
 * Results are cached per level by hash(levelJSON, SOLVER_VERSION); pass --force to redo.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  countElementKinds,
  hash32,
  LevelSchema,
  simulate,
  SOLVER_VERSION,
  type BotName,
  type LevelDef,
  type SimResult,
} from '@ee/core';
import { formatJson } from './format';

const here = dirname(fileURLToPath(import.meta.url));
const levelsDir = resolve(here, '../../content/levels');
const outFile = resolve(levelsDir, '_calibration.json');

// ---- args ---------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name: string, def: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1]! : def;
};
const maxSeeds = Math.min(200, Number(opt('seeds', '200')));
const bots = opt('bots', 'strong,novice').split(',') as BotName[];
const halfWidth = Number(opt('half', '0.05'));
const force = args.includes('--force');
const only = opt('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ---- cache --------------------------------------------------------------------
interface BotSummary {
  n: number;
  wins: number;
  pWin: number;
  wilson: [number, number];
  attemptsEst: number | null;
  meanMoves: number;
  meanMovesWon: number;
  meanScore: number;
  specialFrequency: { line: number; burst: number; fired: number };
  elapsedMs: number;
}
interface LevelEntry {
  id: string;
  file: string;
  name?: string;
  levelHash: number;
  solverVersion: string;
  elements: string[];
  moves: number;
  targetAttempts: [number, number];
  bots: Partial<Record<BotName, BotSummary>>;
}
interface CalibrationFile {
  schemaVersion: 1;
  generatedAt: string;
  solverVersion: string;
  seeds: number;
  halfWidth: number;
  levels: LevelEntry[];
}

const previous: CalibrationFile | null = existsSync(outFile)
  ? (JSON.parse(readFileSync(outFile, 'utf8')) as CalibrationFile)
  : null;

function summarize(r: SimResult): BotSummary {
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

// ---- run ----------------------------------------------------------------------
const files = readdirSync(levelsDir)
  .filter((f) => /^\d{3}\.json$/.test(f))
  .filter((f) => only.length === 0 || only.includes(f.replace('.json', '')))
  .sort();

if (files.length === 0) {
  console.error(`no level files in ${levelsDir}`);
  process.exit(1);
}

const entries: LevelEntry[] = [];
let invalid = 0;
let unsolvable = 0;

for (const file of files) {
  const raw = readFileSync(resolve(levelsDir, file), 'utf8');
  const parsed = LevelSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    invalid++;
    console.error(`✗ ${file}: schema errors`);
    for (const issue of parsed.error.issues)
      console.error(`    ${issue.path.join('.')}: ${issue.message}`);
    continue;
  }
  const level: LevelDef = parsed.data;
  const levelHash = hash32(JSON.stringify(level), SOLVER_VERSION, maxSeeds, halfWidth);
  const cached = previous?.levels.find((e) => e.id === level.id && e.levelHash === levelHash);
  const entry: LevelEntry = {
    id: level.id,
    file,
    levelHash,
    solverVersion: SOLVER_VERSION,
    elements: [...countElementKinds(level)],
    moves: level.moves,
    targetAttempts: level.difficulty.targetAttempts,
    bots: {},
  };
  if (level.name) entry.name = level.name;

  for (const bot of bots) {
    const hit = !force && cached?.bots[bot];
    if (hit) {
      entry.bots[bot] = hit;
      continue;
    }
    const seeds = Array.from({ length: maxSeeds }, (_, i) => hash32(level.id, i + 1));
    const result = simulate(level, bot, seeds, {
      stopHalfWidth: halfWidth,
      minSeeds: 20,
      botSeed: hash32(level.id, bot),
    });
    entry.bots[bot] = summarize(result);
    process.stdout.write(
      `  ${level.id} ${bot.padEnd(7)} pWin=${result.pWin.toFixed(2)} n=${result.n} (${(result.elapsedMs / 1000).toFixed(1)}s)\n`,
    );
  }
  if ((entry.bots.strong?.wins ?? 1) === 0) unsolvable++;
  entries.push(entry);
}

// ---- table --------------------------------------------------------------------
const pct = (x: number | undefined) =>
  x === undefined ? '   -' : `${Math.round(x * 100)}%`.padStart(4);
const num = (x: number | null | undefined, d = 1) =>
  x === undefined || x === null ? '-' : x.toFixed(d);
const cols = [
  'level',
  'name',
  'elements',
  'mv',
  'strong',
  'n',
  'novice',
  'n',
  'att(nov)',
  'att(str)',
  'line/swipe',
  'burst/swipe',
  'meanMv',
  'score(str/nov)',
  'band',
];
const rows = entries.map((e) => {
  const s = e.bots.strong;
  const nv = e.bots.novice;
  const att = nv?.attemptsEst ?? null;
  const [lo, hi] = e.targetAttempts;
  const band =
    att === null ? 'unsolved' : att < lo - 1e-9 ? 'easier' : att > hi + 1e-9 ? 'HARDER' : 'ok';
  return [
    e.id,
    e.name ?? '',
    e.elements.join('+') || '-',
    String(e.moves),
    pct(s?.pWin),
    String(s?.n ?? '-'),
    pct(nv?.pWin),
    String(nv?.n ?? '-'),
    num(att, 2),
    num(s?.attemptsEst ?? null, 2),
    pct(s?.specialFrequency.line),
    pct(s?.specialFrequency.burst),
    num(s?.meanMovesWon),
    `${num(s?.meanScore, 0)}/${num(nv?.meanScore, 0)}`,
    `${band} [${lo}-${hi}]`,
  ];
});
const widths = cols.map((c, i) => Math.max(c.length, ...rows.map((r) => r[i]!.length)));
const line = (r: string[]) => r.map((c, i) => c.padEnd(widths[i]!)).join('  ');
console.log('\n' + line(cols));
console.log(widths.map((w) => '-'.repeat(w)).join('  '));
for (const r of rows) console.log(line(r));

// ---- write --------------------------------------------------------------------
const out: CalibrationFile = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  solverVersion: SOLVER_VERSION,
  seeds: maxSeeds,
  halfWidth,
  levels: entries,
};
writeFileSync(outFile, formatJson(out) + '\n');
console.log(`\nwrote ${outFile}`);

if (invalid > 0 || unsolvable > 0) {
  console.error(
    `\n${invalid} invalid level file(s), ${unsolvable} unsolvable level(s) for 'strong'`,
  );
  process.exit(1);
}
