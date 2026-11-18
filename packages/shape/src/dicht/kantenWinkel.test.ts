import { describe, expect, it } from 'vitest';
import { hatKnick, knickSoll } from './kantenWinkel';
import type { Loop, LoopPunkt } from './loops';

const punkt = (s: number, knick?: number): LoopPunkt => ({ s, ref: { x: s, y: 0, z: 0 }, cur: { x: s, y: 0, z: 0 }, ...(knick === undefined ? {} : { knick }) });
const linie = (art: Loop['art'], punkte: LoopPunkt[]): Loop => ({ id: 1, art, proben: [], s: new Float64Array(0), laenge: 100, ruhe: new Float64Array(0), punkte });

describe('Kante mit eigenem Winkel: die Angabe längs der Linie', () => {
  it('ohne Angabe: kein Knick vorgegeben', () => {
    const l = linie('ring', [punkt(0), punkt(50), punkt(100)]);
    expect(hatKnick(l)).toBe(false);
    expect(knickSoll(l, 30)).toBeNull();
  });

  it('Ring: zwischen den Punkten mit Angabe gleitend, Punkte ohne Angabe zählen nicht', () => {
    // Maullinie: an den Lippen 95°, am Mundwinkel 70°; dazwischen ein Punkt ohne Angabe
    const l = linie('ring', [punkt(0, 95), punkt(20), punkt(40, 70), punkt(100, 95)]);
    expect(hatKnick(l)).toBe(true);
    expect(knickSoll(l, 0)).toBeCloseTo(95, 9);
    expect(knickSoll(l, 20)).toBeCloseTo(82.5, 9);
    expect(knickSoll(l, 40)).toBeCloseTo(70, 9);
    expect(knickSoll(l, 70)).toBeCloseTo(82.5, 9);
    expect(knickSoll(l, 100)).toBeCloseTo(95, 9);
  });

  it('Ring: vor dem ersten und nach dem letzten Punkt mit Angabe wie dieser', () => {
    const l = linie('ring', [punkt(0), punkt(30, 60), punkt(60, 80), punkt(100)]);
    expect(knickSoll(l, 10)).toBeCloseTo(60, 9);
    expect(knickSoll(l, 45)).toBeCloseTo(70, 9);
    expect(knickSoll(l, 90)).toBeCloseTo(80, 9);
  });

  it('geschlossener Loop: ringsum', () => {
    const l = linie('paar', [punkt(10, 40), punkt(60, 80)]);
    expect(knickSoll(l, 35)).toBeCloseTo(60, 9);
    // von 60 über das Ende zurück zu 10: halbwegs bei 85
    expect(knickSoll(l, 85)).toBeCloseTo(60, 9);
    expect(knickSoll(l, 5)).toBeCloseTo(44, 9);
  });
});
