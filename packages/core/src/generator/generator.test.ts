import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateLevel, defaultMoves, targetAttempts } from './generateLevel';
import { P3_LEVEL_INDICES, TJORIZO_SPECS, tjorizoSpec } from './tjorizo';
import { SYRUP_SPECS } from './syrup';
import { LUZZ_SPECS } from './luzz';
import { WOODING_SPECS } from './wooding';
import { levelSpec } from './index';
import { countElementKinds, LevelSchema } from '../schema/level';

const levelsDir = fileURLToPath(new URL('../../../../content/levels/', import.meta.url));

describe('generateLevel', () => {
  it('produces valid levels for every spec of the four zones (1–100)', () => {
    expect(TJORIZO_SPECS.length).toBe(25);
    expect(SYRUP_SPECS.length).toBe(25);
    expect(LUZZ_SPECS.length).toBe(25);
    expect(WOODING_SPECS.length).toBe(25);
    expect(SYRUP_SPECS.map((s) => s.index)).toEqual(Array.from({ length: 25 }, (_, i) => 26 + i));
    expect(LUZZ_SPECS.map((s) => s.index)).toEqual(Array.from({ length: 25 }, (_, i) => 51 + i));
    expect(WOODING_SPECS.map((s) => s.index)).toEqual(Array.from({ length: 25 }, (_, i) => 76 + i));
    for (const spec of [...TJORIZO_SPECS, ...SYRUP_SPECS, ...LUZZ_SPECS, ...WOODING_SPECS]) {
      const level = generateLevel(spec);
      expect(level.id).toBe(`${spec.zone}-${String(spec.index).padStart(3, '0')}`);
      expect(levelSpec(spec.index)).toBe(spec);
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
      if (spec.elements.includes('cage'))
        expect(level.blockers.some((b) => b.kind === 'cage')).toBe(true);
      if (spec.elements.includes('crust'))
        expect(level.blockers.some((b) => b.kind === 'crust')).toBe(true);
      if (spec.elements.includes('oil'))
        expect(level.floors.some((f) => f.kind === 'oil')).toBe(true);
      if (spec.elements.includes('fence')) expect(level.fences.length).toBeGreaterThan(0);
      if (spec.elements.includes('burst')) expect(level.specials.burstAt).toBeLessThan(9);
      if (spec.mask) expect(level.grid.mask).toEqual(spec.mask);
      if (spec.spawn?.sources) expect(level.spawn.fallback).toBe('none');
      if (spec.elements.includes('sleeper'))
        expect(level.blockers.some((b) => b.kind === 'sleeper')).toBe(true);
      if (spec.elements.includes('scrapMound'))
        expect(level.blockers.some((b) => b.kind === 'scrapMound')).toBe(true);
      if (spec.elements.includes('fog'))
        expect(level.blockers.some((b) => b.kind === 'fog')).toBe(true);
      if (spec.elements.includes('rot'))
        expect(level.threats.some((t) => t.kind === 'rot')).toBe(true);
      if (spec.elements.includes('toxic'))
        expect(level.threats.some((t) => t.kind === 'toxic')).toBe(true);
      if (spec.elements.includes('stray'))
        expect(level.threats.some((t) => t.kind === 'stray')).toBe(true);
      if (spec.elements.includes('portal'))
        expect(level.floors.filter((f) => f.kind === 'portal').length % 2).toBe(0);
      if (spec.elements.includes('current'))
        expect(level.floors.some((f) => f.kind === 'current')).toBe(true);
    }
  });

  it('Syrup levels with oil carry jelly start blobs (liquid ignores oil)', () => {
    for (const spec of SYRUP_SPECS.filter((s) => s.elements.includes('oil'))) {
      const level = generateLevel(spec);
      expect(
        level.start.some((s) => s.blob.material === 'jelly'),
        level.id,
      ).toBe(true);
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

  it('places random pillars in the interior only', () => {
    for (const spec of TJORIZO_SPECS.filter((s) => s.elements.includes('pillar') && !s.mask)) {
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

  it('every content/levels/NNN.json is exactly what its spec generates (run tools/levels/generate.ts after changing specs)', () => {
    const files = readdirSync(levelsDir).filter((f) => /^\d{3}\.json$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(P3_LEVEL_INDICES.length);
    for (const f of files) {
      const i = Number(f.replace('.json', ''));
      const file = `${levelsDir}${f}`;
      const onDisk = LevelSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
      const generated = LevelSchema.parse(JSON.parse(JSON.stringify(generateLevel(levelSpec(i)))));
      expect(onDisk, file).toEqual(generated);
    }
  });
});
