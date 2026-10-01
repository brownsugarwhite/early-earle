import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CURVE_LAST_LEVEL, LEGACY_LAST_LEVEL, curveSpec } from '@ee/core';
import { describe, expect, it } from 'vitest';
import { normalizeDraft, type LevelDraft } from './draft';
import { attemptsBandOf, movesBand, movesBandOf, validateDraft } from './validation';

const levelsDir = fileURLToPath(new URL('../../../../../content/levels/', import.meta.url));
const file = (no: number): string => `${String(no).padStart(3, '0')}.json`;
const load = (no: number): LevelDraft => normalizeDraft(JSON.parse(readFileSync(`${levelsDir}${file(no)}`, 'utf8')));
const bandWarnings = (d: LevelDraft) => validateDraft(d).warnings.filter((w) => w.where === 'Züge' || w.where === 'Versuche-Band');

describe('Validierung: Bänder aus der Schwierigkeitskurve (Level 51–184)', () => {
  it('meldet für keine der Level-Dateien 51–184 ein falsches Zug- oder Versuche-Band', () => {
    for (let no = LEGACY_LAST_LEVEL + 1; no <= CURVE_LAST_LEVEL; no++) {
      const d = load(no);
      const v = validateDraft(d);
      expect(v.errors, `Level ${no}`).toEqual([]);
      expect(bandWarnings(d), `Level ${no}`).toEqual([]);
    }
  });

  it('Level 1–50: kein Versuche-Band-Hinweis (das Kurvenband ist das alte Band)', () => {
    for (let no = 1; no <= LEGACY_LAST_LEVEL; no++) {
      expect(validateDraft(load(no)).warnings.filter((w) => w.where === 'Versuche-Band'), `Level ${no}`).toEqual([]);
    }
  });

  it('Versuche-Band: das Kurvenband von curveSpec, nicht mehr „über 2,5“', () => {
    expect(attemptsBandOf(1)).toEqual(curveSpec(1).targetAttempts);
    expect(attemptsBandOf(CURVE_LAST_LEVEL)).toEqual(curveSpec(CURVE_LAST_LEVEL).targetAttempts);
    expect(attemptsBandOf(CURVE_LAST_LEVEL + 1)).toBeNull();
    // ein Boss (62) darf bis 4,5 — vorher meldete „hi > 2,5“ jedes Boss-/Spitzenlevel
    const boss = load(62);
    expect(curveSpec(62).type).toBe('boss');
    expect(boss.difficulty.targetAttempts[1]).toBeGreaterThan(2.5);
    expect(bandWarnings(boss)).toEqual([]);
    // außerhalb des Kurvenbands wird gewarnt, auf Deutsch mit dem Soll-Band
    const off: LevelDraft = { ...boss, difficulty: { ...boss.difficulty, targetAttempts: [1.0, 6.0] } };
    const w = validateDraft(off).warnings.find((x) => x.where === 'Versuche-Band');
    expect(w?.message).toContain('Kurvenbands 2,77–4,5');
    expect(w?.message).toContain('Boss');
  });

  it('Zugband: Spanne des Kurventyps samt Richtwert; Level 1–50 behalten GDD 6.1; Tutorial-Bretter ohne Band', () => {
    expect(movesBand(5)).toEqual([30, 38]);
    expect(movesBand(30)).toEqual([25, 30]);
    expect(movesBand(1, 3)).toBeNull();
    const normal = movesBandOf(53, 25)!;
    expect(normal.band).toEqual([10, 32]);
    expect(normal.suggested).toBe(25);
    expect(movesBandOf(103, 16)!.band).toEqual([8, 26]);
    expect(movesBand(CURVE_LAST_LEVEL + 1)).toEqual([8, 34]);
    // 99+ Züge heißt „ohne Limit“ und wird nur als Hinweis gemeldet
    const d = load(53);
    const tooLong = validateDraft({ ...d, moves: 40 }).warnings.find((x) => x.where === 'Züge');
    expect(tooLong?.message).toContain('außerhalb des Bands 10–32');
    expect(tooLong?.message).toContain('Kurven-Richtwert 25');
    expect(validateDraft({ ...d, moves: 20 }).warnings.some((x) => x.where === 'Züge' && /Bands/.test(x.message))).toBe(false);
  });
});
