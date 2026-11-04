// B7: Die schnelle Dreieckszerlegung (flache Zahlenfelder) muss bitgleich zur bisherigen sein — dieselbe Rechenreihenfolge.
import { describe, expect, it } from 'vitest';
import { ableiten } from '../kern/ableiten';
import { feinesNetz } from '../kern/pruefstand';
import { koerperDokument } from '../kern/pruefen/koerper';
import { zufall } from '../kern/pruefen/zufall';
import { type Netz, type V3, zuDreiecken } from './catmullClark';

const plus = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mal = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];

/** Bisherige Fassung (bis 16.10.) zum Vergleich: Zwischenobjekte je Rechenschritt, Ergebnis über Zahlenlisten. */
function zuDreieckenAlt(netz: Netz, glattWinkelGrad = 40): { positionen: Float32Array; normalen: Float32Array } {
  const { punkte, flaechen } = netz;
  const fn: V3[] = flaechen.map((f) => {
    let n: V3 = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = punkte[f[i]!]!;
      const b = punkte[f[(i + 1) % f.length]!]!;
      n = plus(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
    }
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return mal(n, 1 / l);
  });
  const punktFlaechen: number[][] = Array.from({ length: punkte.length }, () => []);
  flaechen.forEach((f, fi) => f.forEach((i) => punktFlaechen[i]!.push(fi)));
  const cosGrenze = Math.cos((glattWinkelGrad * Math.PI) / 180);
  const ecknormale = (fi: number, v: number): V3 => {
    let n: V3 = [0, 0, 0];
    for (const g of punktFlaechen[v]!) {
      const d = fn[g]![0] * fn[fi]![0] + fn[g]![1] * fn[fi]![1] + fn[g]![2] * fn[fi]![2];
      if (d >= cosGrenze) n = plus(n, fn[g]!);
    }
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return mal(n, 1 / l);
  };
  const pos: number[] = [];
  const nrm: number[] = [];
  flaechen.forEach((f, fi) => {
    for (let i = 1; i < f.length - 1; i++) {
      for (const v of [f[0]!, f[i]!, f[i + 1]!]) {
        pos.push(...punkte[v]!);
        nrm.push(...ecknormale(fi, v));
      }
    }
  });
  return { positionen: new Float32Array(pos), normalen: new Float32Array(nrm) };
}

const gleich = (a: Float32Array, b: Float32Array) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

describe('B7: schnelle Dreieckszerlegung', () => {
  for (const art of ['kugel', 'rex', 'kasten'] as const) {
    it(`${art}: bitgleich zur bisherigen Fassung (40° und 10°)`, () => {
      const abl = ableiten(koerperDokument(art, zufall(1)), { stufen: 3 });
      const n = feinesNetz(abl);
      const netz: Netz = { punkte: n.punkte as V3[], flaechen: n.flaechen, schaerfe: new Map() };
      for (const w of [40, 10]) {
        const a = zuDreiecken(netz, w);
        const b = zuDreieckenAlt(netz, w);
        expect(gleich(a.positionen, b.positionen)).toBe(true);
        expect(gleich(a.normalen, b.normalen)).toBe(true);
      }
    });
  }
  it('Fünf- und Dreiecke (Fächer) bitgleich', () => {
    const punkte: V3[] = [[0, 0, 0], [1, 0, 0], [1.2, 0.8, 0.1], [0.5, 1.3, 0.3], [-0.2, 0.7, 0.05], [0.5, 0.5, 1]];
    const netz: Netz = { punkte, flaechen: [[0, 1, 2, 3, 4], [0, 1, 5], [1, 2, 5], [2, 3, 5], [3, 4, 5], [4, 0, 5]], schaerfe: new Map() };
    const a = zuDreiecken(netz, 40);
    const b = zuDreieckenAlt(netz, 40);
    expect(gleich(a.positionen, b.positionen)).toBe(true);
    expect(gleich(a.normalen, b.normalen)).toBe(true);
  });
});
