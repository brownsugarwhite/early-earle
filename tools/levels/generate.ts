/**
 * Generates authored levels into content/levels/NNN.json (Tjorizo 1–25, Syrup 26–50).
 *
 *   pnpm --filter @ee/tools-levels generate            # levels 1–10
 *   pnpm --filter @ee/tools-levels generate 26 50      # a range
 *
 * Files are written with a stable key order (the schema's order) so diffs stay small.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateLevel, LevelSchema, P3_LEVEL_INDICES, levelSpec } from '@ee/core';
import { formatJson } from './format';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../content/levels');

const [fromArg, toArg] = process.argv.slice(2);
const indices =
  fromArg !== undefined
    ? Array.from(
        { length: Number(toArg ?? fromArg) - Number(fromArg) + 1 },
        (_, i) => Number(fromArg) + i,
      )
    : [...P3_LEVEL_INDICES];

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
