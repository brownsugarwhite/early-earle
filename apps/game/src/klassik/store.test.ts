import { beforeEach, describe, expect, it } from 'vitest';
import { KLASSIK_KEY, emptyKlassikSlot, loadKlassik, useKlassik } from './store';
import { classicSeed } from '@ee/core';

const storage = (items: Record<string, string>) => ({ getItem: (k: string) => items[k] ?? null });

describe('loadKlassik', () => {
  it('beginnt leer und übersteht Müll', () => {
    expect(loadKlassik(null).slots.real).toEqual(emptyKlassikSlot());
    expect(loadKlassik(storage({ [KLASSIK_KEY]: '{kaputt' })).slots.free).toEqual(emptyKlassikSlot());
    expect(loadKlassik(storage({ [KLASSIK_KEY]: JSON.stringify({ version: 9 }) })).slots.real).toEqual(emptyKlassikSlot());
  });

  it('liest beide Stände und bereinigt Felder', () => {
    const raw = { version: 1, slots: { free: { best: { '4x4': 1234, x: -5, y: 'abc' }, runs: { '4x4': 3 }, seen: ['4x4', 7] }, real: null } };
    const p = loadKlassik(storage({ [KLASSIK_KEY]: JSON.stringify(raw) }));
    expect(p.slots.free).toEqual({ best: { '4x4': 1234 }, runs: { '4x4': 3 }, seen: ['4x4'] });
    expect(p.slots.real).toEqual(emptyKlassikSlot());
  });
});

describe('useKlassik', () => {
  beforeEach(() => useKlassik.getState().resetAll());

  it('merkt Bestwerte je Stand und Format, nur nach oben', () => {
    const k = useKlassik.getState();
    expect(k.submitScore('free', '4x4', 300)).toBe(true);
    expect(useKlassik.getState().submitScore('free', '4x4', 200)).toBe(false);
    expect(useKlassik.getState().submitScore('free', '4x4', 300)).toBe(false);
    expect(useKlassik.getState().submitScore('free', '4x4', 420)).toBe(true);
    expect(useKlassik.getState().bestOf('free', '4x4')).toBe(420);
    expect(useKlassik.getState().bestOf('real', '4x4')).toBe(0);
    expect(useKlassik.getState().bestOf('free', '5x5')).toBe(0);
  });

  it('zählt Durchgänge: jeder Start eine neue Seed-Basis, frisch immer dieselbe erste', () => {
    const a = useKlassik.getState().nextRun('free', '4x4');
    const b = useKlassik.getState().nextRun('free', '4x4');
    expect(a).toBe(classicSeed('4x4', 0));
    expect(b).toBe(classicSeed('4x4', 1));
    expect(a).not.toBe(b);
    expect(useKlassik.getState().slots.free.runs['4x4']).toBe(2);
    expect(useKlassik.getState().nextRun('real', '4x4')).toBe(a);
  });

  it('merkt gesehene Formate und steuert Blatt und Stempel', () => {
    const k = useKlassik.getState();
    k.markSeen('real', ['4x4']);
    k.markSeen('real', ['4x4', '3x3']);
    expect(useKlassik.getState().slots.real.seen).toEqual(['4x4', '3x3']);
    k.toggleSheet();
    expect(useKlassik.getState().sheetOpen).toBe(true);
    useKlassik.getState().closeSheet();
    expect(useKlassik.getState().sheetOpen).toBe(false);
    useKlassik.getState().showStamp();
    expect(useKlassik.getState().stamp).toBe(1);
  });
});
