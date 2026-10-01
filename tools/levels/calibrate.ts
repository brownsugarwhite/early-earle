/**
 * Calibration: runs every content/levels/*.json through the `strong` and
 * `novice` bots (≤ 200 seeds each, sequential stopping once the Wilson 95 %
 * interval of pWin is narrower than ±0.05), prints a table and writes
 * content/levels/_calibration.json. Exits 1 when a level is unsolvable
 * (0 wins for `strong`) or a level file fails schema validation.
 *
 *   pnpm --filter @ee/tools-levels calibrate [--seeds 200] [--bots strong,novice]
 *        [--half 0.05] [--force] [--only 001,002] [--jobs 6] [--strict]
 *
 * `--strict` is the band gate of the difficulty curve: exit 1 when the novice's
 * `attemptsEst` lies outside the level's `targetAttempts`, or when the strong bot
 * wins less than 90 % on a non-boss level (levels 1–50 are frozen: their strong
 * gate is reported as a warning only).
 *
 * Results are cached per level by hash(levelJSON, SOLVER_VERSION); pass --force to redo.
 * The novice entry also carries `lossProgress` (median goal progress of lost games, the
 * near-miss check); cached entries without it get it filled in (novice only, cheap).
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import {
  CURVE_LAST_LEVEL,
  LEGACY_LAST_LEVEL,
  countElementKinds,
  curveSpec,
  hash32,
  LevelSchema,
  SOLVER_VERSION,
  type BotName,
  type LevelDef,
} from '@ee/core';
import { calibrateBot, type BotSummary, type CalibOptions } from './calib';
import { noviceLossProgress } from './probe';
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
const strict = args.includes('--strict');
const jobs = Math.max(1, Number(opt('jobs', '6')));
const only = opt('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const calibOpts: CalibOptions = { maxSeeds, halfWidth };

// ---- cache --------------------------------------------------------------------
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

// ---- worker mode: one level file per stdin line, one JSON result per stdout line --------
interface Job {
  file: string;
  bots: BotName[];
  lossOnly: boolean;
  /** Seeds of the cached novice run (lossOnly). */
  n?: number;
}

function loadLevel(file: string): LevelDef {
  return LevelSchema.parse(JSON.parse(readFileSync(resolve(levelsDir, file), 'utf8')));
}

function runJob(job: Job): {
  file: string;
  bots: Partial<Record<BotName, BotSummary>>;
  loss?: number | null;
} {
  const level = loadLevel(job.file);
  if (job.lossOnly)
    return { file: job.file, bots: {}, loss: noviceLossProgress(level, job.n ?? maxSeeds) };
  const out: Partial<Record<BotName, BotSummary>> = {};
  for (const bot of job.bots) out[bot] = calibrateBot(level, bot, calibOpts);
  return { file: job.file, bots: out };
}

if (args.includes('--worker')) {
  const rl = createInterface({ input: process.stdin });
  for await (const line of rl) {
    if (!line.trim()) continue;
    process.stdout.write(JSON.stringify(runJob(JSON.parse(line) as Job)) + '\n');
  }
  process.exit(0);
}

// ---- run ----------------------------------------------------------------------
const previous: CalibrationFile | null = existsSync(outFile)
  ? (JSON.parse(readFileSync(outFile, 'utf8')) as CalibrationFile)
  : null;

const files = readdirSync(levelsDir)
  .filter((f) => /^\d{3}\.json$/.test(f))
  .filter((f) => only.length === 0 || only.includes(f.replace('.json', '')))
  .sort();

if (files.length === 0) {
  console.error(`no level files in ${levelsDir}`);
  process.exit(1);
}

const entries = new Map<string, LevelEntry>();
const pending: Job[] = [];
let invalid = 0;
const t0 = performance.now();

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
  const todo: BotName[] = [];
  for (const bot of bots) {
    const hit = !force && cached?.bots[bot];
    if (hit) entry.bots[bot] = hit;
    else todo.push(bot);
  }
  entries.set(file, entry);
  if (todo.length > 0) pending.push({ file, bots: todo, lossOnly: false });
  else if (entry.bots.novice && entry.bots.novice.lossProgress === undefined)
    pending.push({ file, bots: [], lossOnly: true, n: entry.bots.novice.n });
}

function apply(r: ReturnType<typeof runJob>): void {
  const e = entries.get(r.file)!;
  if (r.loss !== undefined && e.bots.novice)
    e.bots.novice = { ...e.bots.novice, lossProgress: r.loss };
  for (const [bot, s] of Object.entries(r.bots) as [BotName, BotSummary][]) {
    e.bots[bot] = s;
    process.stdout.write(
      `  ${e.id} ${bot.padEnd(7)} pWin=${s.pWin.toFixed(2)} n=${s.n} (${(s.elapsedMs / 1000).toFixed(1)}s)\n`,
    );
  }
}

if (pending.length > 0 && jobs > 1) {
  const queue = [...pending];
  await Promise.all(
    Array.from(
      { length: Math.min(jobs, queue.length) },
      () =>
        new Promise<void>((done, fail) => {
          const child = spawn(
            process.execPath,
            [...process.execArgv, fileURLToPath(import.meta.url), ...args, '--worker'],
            {
              stdio: ['pipe', 'pipe', 'inherit'],
            },
          );
          const feed = () => {
            const next = queue.shift();
            if (next === undefined) child.stdin.end();
            else child.stdin.write(JSON.stringify(next) + '\n');
          };
          createInterface({ input: child.stdout }).on('line', (line) => {
            if (!line.startsWith('{')) return;
            apply(JSON.parse(line) as ReturnType<typeof runJob>);
            feed();
          });
          child.on('exit', (code) =>
            code === 0 ? done() : fail(new Error(`worker exit ${code}`)),
          );
          feed();
        }),
    ),
  );
} else {
  for (const job of pending) apply(runJob(job));
}

const ordered = files.map((f) => entries.get(f)).filter((e): e is LevelEntry => e !== undefined);
const unsolvable = ordered.filter((e) => (e.bots.strong?.wins ?? 1) === 0).length;

// ---- table --------------------------------------------------------------------
const pct = (x: number | undefined) =>
  x === undefined ? '   -' : `${Math.round(x * 100)}%`.padStart(4);
const num = (x: number | null | undefined, d = 1) =>
  x === undefined || x === null ? '-' : x.toFixed(d);
const indexOf = (e: LevelEntry) => Number(e.file.replace('.json', ''));
const typeOf = (e: LevelEntry) => {
  const i = indexOf(e);
  return i >= 1 && i <= CURVE_LAST_LEVEL ? curveSpec(i).type : '?';
};
const cols = [
  'level',
  'name',
  'type',
  'elements',
  'mv',
  'strong',
  'n',
  'novice',
  'n',
  'att(nov)',
  'att(str)',
  'rest(str)',
  'loss(nov)',
  'line/swipe',
  'burst/swipe',
  'band',
];
const verdicts: { e: LevelEntry; band: string; strongOk: boolean }[] = [];
const rows = ordered.map((e) => {
  const s = e.bots.strong;
  const nv = e.bots.novice;
  const att = nv?.attemptsEst ?? null;
  const [lo, hi] = e.targetAttempts;
  const band =
    att === null ? 'unsolved' : att < lo - 1e-9 ? 'easier' : att > hi + 1e-9 ? 'HARDER' : 'ok';
  const strongOk = typeOf(e) === 'boss' || s === undefined || s.pWin >= 0.9 - 1e-9;
  verdicts.push({ e, band, strongOk });
  const rest = s && s.wins > 0 ? (e.moves - s.meanMovesWon) / e.moves : undefined;
  return [
    e.id,
    e.name ?? '',
    typeOf(e),
    e.elements.join('+') || '-',
    String(e.moves),
    pct(s?.pWin),
    String(s?.n ?? '-'),
    pct(nv?.pWin),
    String(nv?.n ?? '-'),
    num(att, 2),
    num(s?.attemptsEst ?? null, 2),
    pct(rest),
    pct(nv?.lossProgress ?? undefined),
    pct(s?.specialFrequency.line),
    pct(s?.specialFrequency.burst),
    `${band}${strongOk ? '' : ' STRONG<90%'} [${lo}-${hi}]`,
  ];
});
const widths = cols.map((c, i) => Math.max(c.length, ...rows.map((r) => r[i]!.length)));
const line = (r: string[]) => r.map((c, i) => c.padEnd(widths[i]!)).join('  ');
console.log('\n' + line(cols));
console.log(widths.map((w) => '-'.repeat(w)).join('  '));
for (const r of rows) console.log(line(r));

// ---- write --------------------------------------------------------------------
// Partial runs (--only) keep the other levels' entries.
const keep = only.length > 0 ? (previous?.levels ?? []).filter((e) => !files.includes(e.file)) : [];
const out: CalibrationFile = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  solverVersion: SOLVER_VERSION,
  seeds: maxSeeds,
  halfWidth,
  levels: [...keep, ...ordered].sort((a, b) => a.file.localeCompare(b.file)),
};
writeFileSync(outFile, formatJson(out) + '\n');
console.log(`\nwrote ${outFile} (${((performance.now() - t0) / 1000).toFixed(0)} s)`);

if (invalid > 0 || unsolvable > 0) {
  console.error(
    `\n${invalid} invalid level file(s), ${unsolvable} unsolvable level(s) for 'strong'`,
  );
  process.exit(1);
}

if (strict) {
  const legacy = (v: (typeof verdicts)[number]) => indexOf(v.e) <= LEGACY_LAST_LEVEL;
  const outOfBand = verdicts.filter((v) => v.band !== 'ok');
  const weak = verdicts.filter((v) => !v.strongOk && !legacy(v));
  const weakLegacy = verdicts.filter((v) => !v.strongOk && legacy(v));
  if (weakLegacy.length > 0)
    console.warn(
      `\nwarn: strong < 90 % on frozen levels ${weakLegacy.map((v) => v.e.id).join(', ')} (1–50 bleiben unverändert)`,
    );
  if (outOfBand.length > 0 || weak.length > 0) {
    console.error(
      `\n--strict: ${outOfBand.length} level(s) outside their band, ${weak.length} with strong < 90 %`,
    );
    for (const v of outOfBand)
      console.error(
        `  ${v.e.id}: ${v.band} (${num(v.e.bots.novice?.attemptsEst ?? null, 2)} ∉ [${v.e.targetAttempts.join(', ')}])`,
      );
    for (const v of weak) console.error(`  ${v.e.id}: strong ${pct(v.e.bots.strong?.pWin)}`);
    process.exit(1);
  }
  console.log('\n--strict: all bands green');
}
