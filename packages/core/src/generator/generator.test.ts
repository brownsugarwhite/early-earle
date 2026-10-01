import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateLevel, defaultMoves, targetAttempts } from './generateLevel';
import { P3_LEVEL_INDICES, TJORIZO_SPECS, tjorizoSpec } from './tjorizo';
import { SYRUP_SPECS } from './syrup';
import { LAST_LEVEL, levelSpec } from './index';
import { curveBand, curveSpec } from './curve';
import { applyTune, baseSpec, dialSpec, startSpec } from './extended';
import { ZONE_KITS, storyZone } from './ideas';
import { TUNING } from './tuning';
import { countElementKinds, LevelSchema } from '../schema/level';

const levelsDir = fileURLToPath(new URL('../../../../content/levels/', import.meta.url));

const ALL_SPECS = Array.from({ length: LAST_LEVEL }, (_, i) => levelSpec(i + 1));

describe('generateLevel', () => {
  it('produces valid levels for every spec 1–184 (frozen tables 1–50, curve-derived 51–184)', () => {
    expect(TJORIZO_SPECS.length).toBe(25);
    expect(SYRUP_SPECS.length).toBe(25);
    expect(SYRUP_SPECS.map((s) => s.index)).toEqual(Array.from({ length: 25 }, (_, i) => 26 + i));
    expect(ZONE_KITS.map((k) => k.ideas.length)).toEqual([
      12, 12, 12, 12, 16, 10, 12, 12, 12, 12, 12,
    ]);
    expect(ALL_SPECS.map((s) => s.index)).toEqual(Array.from({ length: 184 }, (_, i) => i + 1));
    for (const spec of ALL_SPECS) {
      const level = generateLevel(spec);
      expect(level.id).toBe(`${spec.zone}-${String(spec.index).padStart(3, '0')}`);
      if (spec.index <= 25) expect(levelSpec(spec.index)).toBe(tjorizoSpec(spec.index));
      if (spec.index > 50) {
        expect(spec.zone).toBe(storyZone(spec.index));
        expect(spec.type).toBe(curveSpec(spec.index).type);
        // Raster 4×4–5×5 (der Pacing-Hebel), Masken eingeschlossen.
        expect([4, 5], `${level.id} w`).toContain(level.grid.w);
        expect([4, 5], `${level.id} h`).toContain(level.grid.h);
        // Ziele sind erfüllbar: genug Käfige, Sporen, Streuner, Kappe für Aufbrüche.
        for (const g of level.goals) {
          if (g.type === 'rescue')
            expect(
              level.blockers.filter((b) => b.kind === 'cage').length,
              level.id,
            ).toBeGreaterThanOrEqual(g.count);
          if (g.type === 'collectSpores')
            expect(
              level.floors.filter((f) => f.kind === 'spore').length,
              level.id,
            ).toBeGreaterThanOrEqual(g.count);
          if (g.type === 'calmStrays')
            expect(
              level.threats.filter((t) => t.kind === 'stray').length,
              level.id,
            ).toBeGreaterThanOrEqual(g.count);
          if (g.type === 'release') expect(level.cap, level.id).toBeLessThan(12);
        }
      }
      expect(LevelSchema.safeParse(JSON.parse(JSON.stringify(level))).success).toBe(true);
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
    // 1–50: the original thresholds (20/60) stay, so their files stay byte-identical.
    expect(defaultMoves(5, 'comfort')).toBe(34);
    expect(defaultMoves(30, 'comfort')).toBe(28);
    expect(defaultMoves(45, 'hard')).toBe(24);
    expect(targetAttempts(3, 'tutorial')).toEqual([1, 1.1]);
    expect(targetAttempts(19, 'hard')).toEqual([1.6, 2]);
    expect(targetAttempts(30, 'celebration')).toEqual([1, 1.1]);
    // 51–184: the curve; hard levels get fewer moves than normal ones on the same board.
    for (let i = 51; i <= LAST_LEVEL; i++)
      expect(targetAttempts(i, 'normal')).toEqual(curveSpec(i).targetAttempts);
    expect(defaultMoves(55, 'hard', 16)).toBeLessThan(defaultMoves(53, 'normal', 16));
    expect(defaultMoves(177, 'hard', 16)).toBeLessThan(defaultMoves(55, 'hard', 16));
    // Drafts past the curve (editor) get the band of their type in the last zone.
    expect(targetAttempts(185, 'hard')).toEqual(curveBand('hard', 15));
    expect(targetAttempts(190, 'skill')).toEqual(curveBand('normal', 15));
    for (const i of P3_LEVEL_INDICES) {
      const level = generateLevel(tjorizoSpec(i));
      expect(level.difficulty.targetAttempts[1]).toBeLessThanOrEqual(1.1);
      // The move band (GDD 6.1) applies from 4×4 up; tiny tutorial boards get what their mechanic needs.
      if (level.grid.w * level.grid.h >= 16)
        expect(level.moves, level.id).toBeGreaterThanOrEqual(30);
    }
  });

  it('builds the tutorial curriculum on tiny boards (level 1 is a 1×3 strip with a scripted spawn)', () => {
    const sizes = [1, 2, 3, 4, 5, 6].map((i) => {
      const l = generateLevel(tjorizoSpec(i));
      return `${l.grid.w}x${l.grid.h}`;
    });
    expect(sizes).toEqual(['3x1', '3x2', '3x3', '3x3', '4x4', '3x3']);
    const one = generateLevel(tjorizoSpec(1));
    expect(one.grid.mask).toEqual(['...']);
    expect(one.start.map((s) => s.blob.tier)).toEqual([1, 1, 2]);
    expect(one.spawn.script).toEqual([{ tier: 1 }]);
    // the first level of every later mechanic is shrunk to 3×3 (24, the beam, to 4×4); follow-ups keep 5×5
    for (const i of [11, 14, 16, 18, 21])
      expect(generateLevel(tjorizoSpec(i)).grid.w, `level ${i}`).toBe(3);
    expect(generateLevel(tjorizoSpec(24)).grid.w).toBe(4);
    for (const i of [12, 15, 17, 19, 22])
      expect(generateLevel(tjorizoSpec(i)).grid.w, `level ${i}`).toBe(5);
    const amoeba = generateLevel(tjorizoSpec(16));
    expect(amoeba.spawn.script).toEqual([{ tier: 1, at: [1, 1], kind: 'amoeba' }]);
    // levels without a script carry no `script` key at all (their JSON stays byte-identical)
    expect('script' in generateLevel(tjorizoSpec(7)).spawn).toBe(false);
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

  it('tunes 51–184 only through moves, goal size, start mass and spawn rate (seed stays)', () => {
    for (let i = 51; i <= LAST_LEVEL; i++) {
      const base = baseSpec(i);
      const tuned = levelSpec(i);
      expect(tuned.seed, `${i}`).toBe(base.seed);
      // fixed boards keep their layout; the start knob only moves plain blobs up or down a tier
      const layout = (b?: string) =>
        b
          ?.trim()
          .split(/\s+/)
          .map((t) => t.replace(/^\d{1,2}(\/|$)/, '#$1'));
      expect(layout(tuned.board), `${i}`).toEqual(layout(base.board));
      if (!TUNING[i]?.start) expect(tuned.board, `${i}`).toBe(base.board);
      expect(tuned.elements, `${i}`).toEqual(base.elements);
      expect(tuned.moves, `${i}`).toBe(TUNING[i]?.moves ?? base.moves);
    }
    // the dial changes the first adjustable goal, the start knob the start mass
    const s = baseSpec(53);
    expect(dialSpec(s, 1).goals[0]).toEqual({ type: 'reachTier', tier: 7 });
    expect(startSpec(s, -1).startTiers!.length).toBe(s.startTiers!.length - 1);
    expect(applyTune(s, { moves: 20, t2: 2 }).spawn?.tier2).toBe(2);
    // every level keeps tier 1 and 2 in its spawn table (the gull reads them)
    for (const spec of ALL_SPECS) {
      const tiers = new Set(generateLevel(spec).spawn.table.map((r) => r.tier));
      expect(tiers.has(1) && tiers.has(2), `${spec.index}`).toBe(true);
    }
  });

  it('every content/levels/NNN.json is exactly what its spec generates (run tools/levels/generate.ts after changing specs)', () => {
    const files = readdirSync(levelsDir).filter((f) => /^\d{3}\.json$/.test(f));
    expect(files.length).toBe(LAST_LEVEL);
    for (const f of files) {
      const i = Number(f.replace('.json', ''));
      const file = `${levelsDir}${f}`;
      const onDisk = LevelSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
      const generated = LevelSchema.parse(JSON.parse(JSON.stringify(generateLevel(levelSpec(i)))));
      expect(onDisk, file).toEqual(generated);
    }
  });
});
