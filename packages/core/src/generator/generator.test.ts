import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateLevel, defaultMoves, targetAttempts } from './generateLevel';
import { P3_LEVEL_INDICES, TJORIZO_SPECS, tjorizoSpec } from './tjorizo';
import { countElementKinds, LevelSchema } from '../schema/level';

const levelsDir = fileURLToPath(new URL('../../../../content/levels/', import.meta.url));

describe('generateLevel', () => {
  it('produces valid levels for every Tjorizo spec (1–25)', () => {
    expect(TJORIZO_SPECS.length).toBe(25);
    for (const spec of TJORIZO_SPECS) {
      const level = generateLevel(spec);
      expect(level.id).toBe(`tjorizo-${String(spec.index).padStart(3, '0')}`);
      expect(LevelSchema.safeParse(JSON.parse(JSON.stringify(level))).success).toBe(true);
      expect(countElementKinds(level).size).toBeLessThanOrEqual(4);
      // requested elements are present
      if (spec.elements.includes('pillar')) expect(level.grid.mask.join('')).toContain('P');
      if (spec.elements.includes('scrap'))
        expect(level.blockers.some((b) => b.kind === 'scrap')).toBe(true);
      if (spec.elements.includes('spore'))
        expect(level.floors.some((f) => f.kind === 'spore')).toBe(true);
      if (spec.elements.includes('withered'))
        expect(level.floors.some((f) => f.kind === 'withered')).toBe(true);
      if (spec.elements.includes('amoeba'))
        expect(level.spawn.table.some((t) => t.kind === 'amoeba')).toBe(true);
      if (spec.elements.includes('line')) expect(level.specials.lineAt).toBeLessThan(9);
      else expect(level.specials.lineAt).toBeGreaterThanOrEqual(9);
      if (spec.elements.includes('cap')) expect(level.cap).toBeLessThan(12);
    }
  });

  it('is deterministic for a spec and changes with the seed', () => {
    const a = generateLevel(tjorizoSpec(7));
    const b = generateLevel(tjorizoSpec(7));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = generateLevel({ ...tjorizoSpec(7), seed: 99 });
    expect(JSON.stringify(c.start)).not.toBe(JSON.stringify(a.start));
  });

  it('follows the progression rules for moves and attempt bands', () => {
    expect(defaultMoves(5, 'comfort')).toBe(34);
    expect(defaultMoves(30, 'comfort')).toBe(28);
    expect(defaultMoves(70, 'hard')).toBe(21);
    expect(targetAttempts(3, 'tutorial')).toEqual([1, 1.1]);
    expect(targetAttempts(19, 'hard')).toEqual([1.6, 2]);
    expect(targetAttempts(59, 'veryHard')).toEqual([2, 2.5]);
    for (const i of P3_LEVEL_INDICES) {
      const level = generateLevel(tjorizoSpec(i));
      expect(level.difficulty.targetAttempts[1]).toBeLessThanOrEqual(1.1);
      expect(level.moves).toBeGreaterThanOrEqual(30);
    }
  });

  it('places pillars in the interior only', () => {
    for (const spec of TJORIZO_SPECS.filter((s) => s.elements.includes('pillar'))) {
      const level = generateLevel(spec);
      level.grid.mask.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === 'P') {
            expect(x).toBeGreaterThan(0);
            expect(y).toBeGreaterThan(0);
            expect(x).toBeLessThan(level.grid.w - 1);
            expect(y).toBeLessThan(level.grid.h - 1);
          }
        }
      });
    }
  });

  it('content/levels/001–010 are exactly what the specs generate (run tools/levels/generate.ts after changing specs)', () => {
    for (const i of P3_LEVEL_INDICES) {
      const file = `${levelsDir}${String(i).padStart(3, '0')}.json`;
      const onDisk = LevelSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
      const generated = LevelSchema.parse(
        JSON.parse(JSON.stringify(generateLevel(tjorizoSpec(i)))),
      );
      expect(onDisk, file).toEqual(generated);
    }
  });
});
