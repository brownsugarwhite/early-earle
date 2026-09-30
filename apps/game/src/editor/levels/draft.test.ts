import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeDraft, removeScriptEntry, resizeGrid, serializeDraft, setMask } from './draft';
import { validateDraft } from './validation';

const levelsDir = fileURLToPath(new URL('../../../../../content/levels/', import.meta.url));
const load = (file: string): unknown => JSON.parse(readFileSync(`${levelsDir}${file}`, 'utf8'));

describe('Level-Entwurf: Tutorial-Bretter und Spawn-Skript', () => {
  it('liest 1×3-Bretter und das Skript (Level 1), ohne Fehler und ohne Zugband-Warnung', () => {
    const d = normalizeDraft(load('001.json'));
    expect(d.grid).toEqual({ w: 3, h: 1, mask: ['...'] });
    expect(d.spawn.script).toEqual([{ tier: 1 }]);
    const v = validateDraft(d);
    expect(v.errors).toEqual([]);
    expect(v.warnings.some((w) => w.where === 'Züge' && /Bands/.test(w.message))).toBe(false);
  });

  it('Level ohne Skript bekommen keinen script-Schlüssel (bytegleich beim Sichern)', () => {
    const d = normalizeDraft(load('007.json'));
    expect('script' in d.spawn).toBe(false);
    expect(serializeDraft(d)).not.toContain('script');
    expect(JSON.parse(serializeDraft(normalizeDraft(load('016.json')))).spawn.script).toEqual([{ tier: 1, at: [1, 1], kind: 'amoeba' }]);
  });

  it('klemmt Skript-Einträge (Stufe 1–3, höchstens 32) und das Raster auf 1..8', () => {
    const d = normalizeDraft({ grid: { w: 0, h: 12, mask: ['.'] }, spawn: { script: [{ tier: 9, kind: 'amoeba' }, 'x', ...Array.from({ length: 40 }, () => ({ tier: 1 }))] } });
    expect(d.grid.w).toBe(1);
    expect(d.grid.h).toBe(8);
    expect(d.spawn.script?.length).toBe(32);
    expect(d.spawn.script?.[0]).toEqual({ tier: 3, kind: 'amoeba' });
  });

  it('Größe und Maske: Zielzellen außerhalb oder auf Riss/Pfeiler fallen weg, die Einträge bleiben', () => {
    const d = normalizeDraft(load('016.json'));
    const small = resizeGrid(d, 1, 3);
    expect(small.grid).toEqual({ w: 1, h: 3, mask: ['.', '.', '.'] });
    expect(small.spawn.script).toEqual([{ tier: 1, kind: 'amoeba' }]);
    const rift = setMask(d, [1, 1], '#');
    expect(rift.spawn.script).toEqual([{ tier: 1, kind: 'amoeba' }]);
    expect(validateDraft(rift).errors).toEqual([]);
    // ein Riss anderswo lässt die Zielzelle stehen
    expect(setMask(d, [0, 0], '#').spawn.script).toEqual(d.spawn.script);
  });

  it('entfernt Skript-Spawns einzeln; der letzte nimmt den Schlüssel mit', () => {
    const d = normalizeDraft({ ...(load('001.json') as object), spawn: { ...(load('001.json') as { spawn: object }).spawn, script: [{ tier: 1 }, { tier: 2 }] } });
    const one = removeScriptEntry(d, 0);
    expect(one.spawn.script).toEqual([{ tier: 2 }]);
    const none = removeScriptEntry(one, 0);
    expect('script' in none.spawn).toBe(false);
    expect(removeScriptEntry(none, 0)).toBe(none);
  });

  it('meldet Bretter mit weniger als zwei freien Zellen auf Deutsch', () => {
    const d = normalizeDraft({ ...(load('001.json') as object), grid: { w: 3, h: 1, mask: ['.##'] }, start: [{ at: [0, 0], blob: { tier: 1 } }] });
    const v = validateDraft(d);
    expect(v.ok).toBe(false);
    expect(v.errors.map((e) => e.message)).toContain('Raster braucht mindestens 2 freie Zellen');
  });
});
