/**
 * P3 acceptance (plan §11): all shipped levels solvable by `strong`,
 * tutorial levels `pWin(novice) ≥ 0.9` (1–6 and the shrunken first level of every later
 * Tjorizo mechanic: 11, 14, 16, 18, 21, 24), line specials on ≤ 40 % of swipes.
 * Full statistics live in content/levels/_calibration.json (tools/levels/calibrate.ts).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateLevel, tjorizoSpec } from './generator/index';
import { hash32 } from './rng';
import { LevelSchema, type LevelDef } from './schema/level';
import { simulate } from './solver/simulate';

const levelsDir = fileURLToPath(new URL('../../../content/levels/', import.meta.url));

function load(i: number): LevelDef {
  return LevelSchema.parse(
    JSON.parse(readFileSync(`${levelsDir}${String(i).padStart(3, '0')}.json`, 'utf8')),
  );
}

const seeds = (id: string, n: number) => Array.from({ length: n }, (_, k) => hash32(id, k + 1));

describe('calibration acceptance', () => {
  it('every shipped level is solvable by the strong bot', () => {
    const files = readdirSync(levelsDir).filter((f) => /^\d{3}\.json$/.test(f));
    for (const f of files) {
      const level = load(Number(f.replace('.json', '')));
      const r = simulate(level, 'strong', seeds(level.id, 20), { stopAtFirstWin: true });
      expect(r.wins, level.id).toBeGreaterThanOrEqual(1);
    }
  }, 120_000);

  it('tutorial levels (1–6 and the intro levels 11, 14, 16, 18, 21, 24) are won by the novice bot at least 90 % of the time', () => {
    for (const i of [1, 2, 3, 4, 5, 6, 11, 14, 16, 18, 21, 24]) {
      const level = load(i);
      const r = simulate(level, 'novice', seeds(level.id, 40), {
        botSeed: hash32(level.id, 'novice'),
      });
      expect(r.pWin, `${level.id}: ${r.wins}/${r.n}`).toBeGreaterThanOrEqual(0.9);
    }
  }, 90_000);

  it('line specials appear on at most 40 % of swipes (shipped levels and the line-blob intro draft)', () => {
    for (let i = 1; i <= 10; i++) {
      const level = load(i);
      const r = simulate(level, 'average', seeds(level.id, 6));
      expect(r.specialFrequency.line, level.id).toBeLessThanOrEqual(0.4);
    }
    const intro = generateLevel(tjorizoSpec(24));
    const r = simulate(intro, 'strong', seeds(intro.id, 8));
    console.log(
      `level 24 (line intro): line on ${(r.specialFrequency.line * 100).toFixed(0)} % of swipes, pWin(strong)=${r.pWin.toFixed(2)}`,
    );
    expect(r.specialFrequency.line).toBeLessThanOrEqual(0.4);
    expect(r.specialFrequency.line).toBeGreaterThan(0);
    // the beam intro shows the beam firing, not only forming (novice: most games)
    const nov = simulate(intro, 'novice', seeds(intro.id, 20), {
      botSeed: hash32(intro.id, 'novice'),
    });
    expect(nov.runs.filter((g) => g.specialsFired > 0).length).toBeGreaterThanOrEqual(12);
  }, 120_000);
});
