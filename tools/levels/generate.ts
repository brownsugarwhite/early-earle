/**
 * Generates the authored levels into content/levels/NNN.json:
 * Tjorizo 1–25 and Syrup 26–50 from their (frozen) tables, 51–184 from the difficulty curve
 * (`curve.ts`), the zone ideas (`ideas.ts`) and the calibrated tuning (`tuning.ts`).
 *
 *   pnpm --filter @ee/tools-levels generate            # all levels 1–184
 *   pnpm --filter @ee/tools-levels generate 51 184     # a range
 *
 * Workflow for 51–184: `tune` (writes tuning.ts) → `generate 51 184` → `calibrate --strict`
 * (band gate) → `report` (docs/progress/level-kurve-184.*).
 * Files are written with a stable key order (the schema's order) so diffs stay small.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateLevel, LevelSchema, LAST_LEVEL, levelSpec } from '@ee/core';
import { formatJson } from './format';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../content/levels');

const [fromArg, toArg] = process.argv.slice(2);
const from = Number(fromArg ?? 1);
const to = Number(toArg ?? fromArg ?? LAST_LEVEL);
const indices = Array.from({ length: to - from + 1 }, (_, i) => from + i);

mkdirSync(outDir, { recursive: true });
for (const index of indices) {
  const level = generateLevel(levelSpec(index));
  // Round-trip through the schema once more so the file is exactly what the game will parse.
  const parsed = LevelSchema.parse(JSON.parse(JSON.stringify(level)));
  const file = resolve(outDir, `${String(index).padStart(3, '0')}.json`);
  writeFileSync(file, formatJson(parsed) + '\n');
  console.log(
    `wrote ${file}  (${parsed.name ?? parsed.id}, ${parsed.grid.w}×${parsed.grid.h}, ${parsed.moves} moves)`,
  );
}
