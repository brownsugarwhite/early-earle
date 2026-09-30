import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  KLASSIK_MAX_CELLS,
  KlassikFormatsSchema,
  classicLevel,
  classicSeed,
  isFormatUnlocked,
  playableCells,
  type KlassikFormats,
} from './klassik';
import { LevelSchema, ZONE_IDS, type LevelInput } from './level';

const contentDir = fileURLToPath(new URL('../../../../content/', import.meta.url));

function errorsOf(input: unknown): string[] {
  const r = KlassikFormatsSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

const square = (n: number) => Array.from({ length: n }, () => '.'.repeat(n));

describe('Level-Schema: Modus', () => {
  const base = (): LevelInput => ({
    schemaVersion: 1,
    id: 'test-klassik',
    zone: 'tjorizo',
    grid: { w: 4, h: 4, mask: square(4) },
    spawn: { sources: [], table: [{ tier: 1, weight: 1 }], fallback: 'anyEmpty' },
    goals: [],
    moves: 99,
    cap: 12,
    difficulty: { targetAttempts: [1, 1] },
  });

  it('erlaubt Klassik-Level ohne Ziele, normale Level brauchen mindestens eines', () => {
    expect(LevelSchema.safeParse({ ...base(), mode: 'classic' }).success).toBe(true);
    const plain = LevelSchema.safeParse(base());
    expect(plain.success).toBe(false);
    expect(plain.error?.issues[0]).toMatchObject({
      code: 'too_small',
      path: ['goals'],
      minimum: 1,
    });
    expect(LevelSchema.safeParse({ ...base(), mode: 'level' }).success).toBe(false);
    expect(
      LevelSchema.safeParse({ ...base(), mode: 'level', goals: [{ type: 'reachTier', tier: 5 }] })
        .success,
    ).toBe(true);
    expect(LevelSchema.safeParse({ ...base(), mode: 'arcade' }).success).toBe(false);
  });
});

describe('KlassikFormatsSchema', () => {
  const ok = (): KlassikFormats => ({
    schemaVersion: 1,
    formats: [
      { id: '4x4', name: '4×4', grid: { w: 4, h: 4, mask: square(4) }, unlockAfterLevel: 5 },
    ],
  });

  it('nimmt ein gültiges Format an', () => {
    expect(errorsOf(ok())).toEqual([]);
  });

  it('prüft Maske, Zellenzahl und eindeutige IDs', () => {
    const rows = ok();
    rows.formats[0]!.grid.mask = square(4).slice(0, 3);
    expect(errorsOf(rows).join()).toMatch(/mask must have 4 rows/);
    const width = ok();
    width.formats[0]!.grid.mask = ['....', '...', '....', '....'];
    expect(errorsOf(width).join()).toMatch(/mask row 1 must have 4 chars/);
    const big = ok();
    big.formats[0]!.grid = { w: 7, h: 7, mask: square(7) };
    expect(errorsOf(big).join()).toMatch(new RegExp(`at most ${KLASSIK_MAX_CELLS} playable cells`));
    const tiny = ok();
    tiny.formats[0]!.grid = { w: 3, h: 3, mask: ['#.#', '...', '#.#'] };
    expect(errorsOf(tiny).join()).toMatch(/at least 6 playable cells/);
    const twice = ok();
    twice.formats.push({ ...twice.formats[0]! });
    expect(errorsOf(twice).join()).toMatch(/duplicate format id '4x4'/);
  });

  it('schaltet ab dem Sieg über Level N frei (reached = gewonnene Level)', () => {
    expect(isFormatUnlocked({ unlockAfterLevel: 5 }, 4)).toBe(false);
    expect(isFormatUnlocked({ unlockAfterLevel: 5 }, 5)).toBe(true);
    expect(isFormatUnlocked({ unlockAfterLevel: 0 }, 0)).toBe(true);
  });

  it('gibt je Format und Durchgang einen festen, eigenen Seed', () => {
    expect(classicSeed('4x4')).toBe(classicSeed('4x4', 0));
    expect(classicSeed('4x4', 1)).not.toBe(classicSeed('4x4', 0));
    expect(classicSeed('5x5')).not.toBe(classicSeed('4x4'));
    for (const run of [0, 1, 99, 5000]) {
      const s = classicSeed('riss', run);
      expect(Number.isInteger(s) && s >= 0 && s < 1_000_000_007).toBe(true);
    }
  });
});

describe('content/klassik/formats.json', () => {
  const file = KlassikFormatsSchema.parse(
    JSON.parse(readFileSync(`${contentDir}klassik/formats.json`, 'utf8')),
  );

  it('validiert und hat die sieben Formate in Freischalt-Reihenfolge', () => {
    expect(file.formats.map((f) => [f.id, f.unlockAfterLevel])).toEqual([
      ['4x4', 5],
      ['3x3', 10],
      ['5x5', 15],
      ['6x6', 25],
      ['kreuz', 40],
      ['ring', 50],
      ['riss', 60],
    ]);
    for (const f of file.formats) expect(playableCells(f.grid.mask)).toBeLessThanOrEqual(36);
    expect(playableCells(file.formats.find((f) => f.id === 'kreuz')!.grid.mask)).toBe(21);
    expect(file.formats.find((f) => f.id === 'ring')!.grid.mask.join('')).toContain('P');
    expect(file.formats.find((f) => f.id === 'riss')!.grid.mask.join('')).toContain('#');
  });

  it('jedes Format ergibt in jeder Zone ein gültiges Klassik-Level', () => {
    for (const f of file.formats) {
      for (const zone of ZONE_IDS) {
        const level = classicLevel(f, zone);
        const r = LevelSchema.safeParse(level);
        expect(
          r.success,
          `${f.id}/${zone}: ${r.success ? '' : JSON.stringify(r.error.issues)}`,
        ).toBe(true);
        expect(level).toMatchObject({ mode: 'classic', zone, goals: [], id: `klassik-${f.id}` });
      }
    }
  });
});
