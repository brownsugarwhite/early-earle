// Zähne zwischen zwei Lagen (Etappe 8, Scheibe 4): zwei Netze derselben Zähne mischen. Die Zähne selbst (Plätze, Netz, Körper)
// prüft `form/maulEcht.test.ts` an einem Maul.
import { describe, expect, it } from 'vitest';
import type { HautNetz } from '../anfang/haut';
import { type ZahnKapsel, kapselnZwischen, netzZwischen } from './zaehne';

const netz = (pos: number[], normal: number[]): HautNetz => {
  const n = pos.length / 3;
  return {
    pos: Float32Array.from(pos),
    normal: Float32Array.from(normal),
    index: Uint32Array.from([0, 1, 2]),
    hoehe: new Float32Array(n),
    seite: new Float32Array(n),
    blatt: new Float32Array(2 * n),
    sicht: new Float32Array(n).fill(1),
    dehnung: new Float32Array(n).fill(1),
  };
};
const A = (): HautNetz => netz([0, 0, 0, 4, 0, 0, 0, 4, 0], [0, 0, 1, 0, 0, 1, 1, 0, 0]);
const B = (): HautNetz => netz([2, 2, 2, 8, 0, 4, 0, 8, -4], [0, 1, 0, 0, 0, 1, 0, 1, 0]);

describe('Zähne zwischen zwei Lagen', () => {
  it('jeder Punkt liegt anteilig dazwischen; die Normalen bleiben Einheiten; das Blatt folgt den Lagen', () => {
    const a = A();
    const m = netzZwischen(a, B(), 0.25);
    expect(m).toBe(a);
    expect(Array.from(m.pos)).toEqual([0.5, 0.5, 0.5, 5, 0, 1, 0, 5, -1]);
    for (let v = 0; v < 3; v++) expect(Math.hypot(m.normal[3 * v]!, m.normal[3 * v + 1]!, m.normal[3 * v + 2]!)).toBeCloseTo(1, 6);
    // (gleiche Normalen bleiben, verschiedene liegen dazwischen)
    expect(Array.from(m.normal.slice(3, 6))).toEqual([0, 0, 1]);
    expect(m.normal[1]).toBeGreaterThan(0);
    expect(m.normal[2]).toBeGreaterThan(m.normal[1]!);
    expect(Array.from(m.blatt)).toEqual([0.5, 0.5, 5, 0, 0, 5]);
  });

  it('an den Enden: bei 0 bleibt die eine Lage, bei 1 ist es die andere', () => {
    const a0 = A();
    expect(Array.from(netzZwischen(a0, B(), 0).pos)).toEqual(Array.from(A().pos));
    const a1 = netzZwischen(A(), B(), 1);
    expect(Array.from(a1.pos)).toEqual(Array.from(B().pos));
    expect(Array.from(a1.normal)).toEqual(Array.from(B().normal));
  });

  it('passen die Netze nicht zusammen, bleibt das erste', () => {
    const a = A();
    const anders = netz([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    expect(Array.from(netzZwischen(a, anders, 0.5).pos)).toEqual(Array.from(A().pos));
  });

  it('die Körper der Zähne (für die Zunge) wandern mit; passen sie nicht zusammen, gelten die der ersten Lage', () => {
    const k = (x: number, r: number): ZahnKapsel => ({ a: [x, 0, 0], b: [x, 10, 0], r, unten: false, i: 0, gespiegelt: false });
    const m = kapselnZwischen([k(0, 1)], [k(4, 3)], 0.5);
    expect(m[0]).toEqual({ a: [2, 0, 0], b: [2, 10, 0], r: 2, unten: false, i: 0, gespiegelt: false });
    expect(kapselnZwischen([k(0, 1)], [k(4, 3), k(5, 3)], 0.5)).toEqual([k(0, 1)]);
    expect(kapselnZwischen([k(0, 1)], [k(4, 3)], 0)).toEqual([k(0, 1)]);
  });
});
