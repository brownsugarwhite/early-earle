// Zufall mit Strömen (Plan 4.1): xoshiro128** gegen die Referenzfolge, Ströme aus Saat und Kennung, ganz(n) ohne Modulo-Schieflage,
// Zustand sichern und setzen. Die festen Folgen unten sind eingefroren: Lauf-Dateien und Merker hängen an ihnen.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Strom, strom } from './zufall';

const ZWEI_HOCH_32 = 4294967296;
const roh = (s: Strom, n: number): number[] => Array.from({ length: n }, () => s.zahl() * ZWEI_HOCH_32);

/** unabhängige Referenz von xoshiro128** (Blackman und Vigna, xoshiro128starstar.c) mit BigInt */
function referenz(start: readonly number[], n: number): number[] {
  const maske = 0xffffffffn;
  const s = start.map((x) => BigInt(x));
  const rotl = (x: bigint, k: bigint): bigint => ((x << k) | (x >> (32n - k))) & maske;
  const aus: number[] = [];
  for (let i = 0; i < n; i++) {
    aus.push(Number((rotl((s[1]! * 5n) & maske, 7n) * 9n) & maske));
    const t = (s[1]! << 9n) & maske;
    s[2] = s[2]! ^ s[0]!;
    s[3] = s[3]! ^ s[1]!;
    s[1] = s[1]! ^ s[2];
    s[0] = s[0]! ^ s[3];
    s[2] = s[2] ^ t;
    s[3] = rotl(s[3], 11n);
  }
  return aus;
}

function mitZustand(z: readonly number[]): Strom {
  const s = strom(0, '');
  s.setzen(Uint32Array.from(z), 0);
  return s;
}

describe('xoshiro128**', () => {
  it('Referenzfolge ab dem Zustand (1, 2, 3, 4)', () => {
    expect(roh(mitZustand([1, 2, 3, 4]), 6)).toEqual([11520, 0, 5927040, 70819200, 2031721883, 1637235492]);
    expect(roh(mitZustand([1, 2, 3, 4]), 2000)).toEqual(referenz([1, 2, 3, 4], 2000));
  });

  it('gleich der Referenz ab jedem Zustand (fast-check)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 0xffffffff }), { minLength: 4, maxLength: 4 }), (z) => {
        fc.pre(z.some((x) => x !== 0));
        expect(roh(mitZustand(z), 50)).toEqual(referenz(z, 50));
      }),
      { numRuns: 500 },
    );
  });
});

describe('strom', () => {
  it('eingefrorene Folgen (ändert sich die Mischung, laufen alte Lauf-Dateien anders)', () => {
    expect(roh(strom(0, ''), 4)).toEqual([3113091897, 625494722, 2722030210, 2840746612]);
    expect(roh(strom(20261120, 'ding/ball'), 4)).toEqual([649297069, 310708040, 3742232523, 2852237960]);
    expect(roh(strom(-1, 'ä😀'), 2)).toEqual([127870345, 2190923894]);
  });

  it('gleiche Saat und Kennung: dieselbe Folge; jede andere: eine andere (fast-check)', () => {
    const saat = fc.oneof(fc.integer(), fc.constantFrom(0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, ZWEI_HOCH_32, ZWEI_HOCH_32 + 1));
    fc.assert(
      fc.property(saat, fc.string(), saat, fc.string(), (s1, k1, s2, k2) => {
        expect(roh(strom(s1, k1), 8)).toEqual(roh(strom(s1, k1), 8));
        if (s1 !== s2 || k1 !== k2) expect(roh(strom(s1, k1), 4)).not.toEqual(roh(strom(s2, k2), 4));
      }),
      { numRuns: 2000 },
    );
  });

  it('die oberen 32 Bit der Saat zählen, die Länge der Kennung auch', () => {
    expect(roh(strom(5, 'a'), 4)).not.toEqual(roh(strom(5 + ZWEI_HOCH_32, 'a'), 4));
    expect(roh(strom(5, 'a'), 4)).not.toEqual(roh(strom(5, 'a\u0000'), 4));
    expect(roh(strom(0, ''), 4)).not.toEqual(roh(strom(0, '\u0000'), 4));
  });

  it('meldet eine Saat, die keine sichere ganze Zahl ist', () => {
    for (const s of [0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => strom(s, 'x')).toThrow(RangeError);
  });
});

describe('zahl und ganz', () => {
  it('zahl in [0, 1), ganz(n) ganz in [0, n) (fast-check)', () => {
    fc.assert(
      fc.property(fc.integer(), fc.string(), fc.integer({ min: 1, max: ZWEI_HOCH_32 }), (saat, kennung, n) => {
        const s = strom(saat, kennung);
        for (let i = 0; i < 20; i++) {
          const z = s.zahl();
          expect(z >= 0 && z < 1).toBe(true);
          const g = s.ganz(n);
          expect(Number.isInteger(g) && g >= 0 && g < n).toBe(true);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('ganz(1) ist 0, ganz(2³²) gibt die rohe Zahl', () => {
    const a = strom(9, 'g');
    const b = strom(9, 'g');
    expect(a.ganz(1)).toBe(0);
    b.zahl();
    expect(a.ganz(ZWEI_HOCH_32)).toBe(b.zahl() * ZWEI_HOCH_32);
  });

  it('ohne Modulo-Schieflage: bei n = 3 · 2³⁰ fällt ein Drittel unter 2³⁰, nicht die Hälfte', () => {
    // mit x mod n kämen die Zahlen unter 2³² − n = 2³⁰ doppelt so oft: Anteil 1/2 statt 1/3
    const s = strom(77, 'schieflage');
    const n = 3 * 1073741824;
    let unten = 0;
    for (let i = 0; i < 30000; i++) if (s.ganz(n) < 1073741824) unten++;
    expect(Math.abs(unten - 10000)).toBeLessThan(600);
  });

  it('gleich verteilt: ganz(6) und zahl() in sechs Fächern', () => {
    const s = strom(1, 'wuerfel');
    const ganz = new Array<number>(6).fill(0);
    const zahl = new Array<number>(6).fill(0);
    for (let i = 0; i < 60000; i++) {
      ganz[s.ganz(6)]!++;
      zahl[Math.floor(s.zahl() * 6)]!++;
    }
    for (const c of [...ganz, ...zahl]) expect(Math.abs(c - 10000)).toBeLessThan(600);
  });

  it('meldet ungültige n', () => {
    const s = strom(1, 'n');
    for (const n of [0, -1, 1.5, NaN, Infinity, ZWEI_HOCH_32 + 1]) expect(() => s.ganz(n)).toThrow(RangeError);
  });
});

describe('stand und setzen', () => {
  it('gesichert und zurückgesetzt läuft der Strom genau gleich weiter (fast-check)', () => {
    fc.assert(
      fc.property(fc.integer(), fc.string(), fc.nat(50), fc.nat(3), (saat, kennung, vorher, i) => {
        const s = strom(saat, kennung);
        roh(s, vorher);
        const feld = new Uint32Array(8);
        s.stand(feld, i);
        const weiter = roh(s, 20);
        const t = strom(0, 'anders');
        t.setzen(feld, i);
        expect(roh(t, 20)).toEqual(weiter);
        s.setzen(feld, i);
        expect(roh(s, 20)).toEqual(weiter);
      }),
      { numRuns: 300 },
    );
  });

  it('meldet vier Nullen und Plätze außerhalb des Felds', () => {
    const s = strom(3, 'p');
    expect(() => s.setzen(new Uint32Array(4), 0)).toThrow(RangeError);
    expect(() => s.stand(new Uint32Array(4), 1)).toThrow(RangeError);
    expect(() => s.stand(new Uint32Array(4), -1)).toThrow(RangeError);
    expect(() => s.setzen(Uint32Array.of(1, 2, 3), 0)).toThrow(RangeError);
    expect(() => s.setzen(Uint32Array.of(1, 2, 3, 4), 0.5)).toThrow(RangeError);
  });
});
