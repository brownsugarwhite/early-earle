// Prüfsumme des Laufs (Plan 4.1): deterministisch über die Bytes, jede Änderung eines Bits fällt auf, Sichten zählen nur ihre Bytes.
// Die festen Werte unten sind eingefroren: Merker und Lauf-Dateien vergleichen gespeicherte Prüfsummen.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { pruefsumme } from './pruefsumme';

/** Felder verschiedener Arten mit zufälligem Inhalt */
const feld = fc.oneof(
  fc.uint8Array({ maxLength: 40 }),
  fc.float64Array({ maxLength: 10 }),
  fc.array(fc.integer(), { maxLength: 10 }).map((z) => Int32Array.from(z)),
  fc.array(fc.double(), { maxLength: 10 }).map((z) => Float32Array.from(z)),
);

const bytesVon = (v: ArrayBufferView): Uint8Array => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);

describe('pruefsumme', () => {
  it('eingefrorene Werte', () => {
    expect(pruefsumme([])).toBe(0);
    expect(pruefsumme([], 7)).toBe(415870660);
    expect(pruefsumme([Uint8Array.of(1, 2, 3, 4, 5)])).toBe(483011291);
    expect(pruefsumme([Float64Array.of(0.5, -2, 1e300), Int32Array.of(-1, 7)])).toBe(2874182114);
  });

  it('ganz in [0, 2³²) und zweimal gerechnet gleich (fast-check)', () => {
    fc.assert(
      fc.property(fc.array(feld, { maxLength: 5 }), fc.integer(), (felder, start) => {
        const a = pruefsumme(felder, start);
        expect(Number.isInteger(a) && a >= 0 && a < 4294967296).toBe(true);
        expect(pruefsumme(felder, start)).toBe(a);
      }),
    );
  });

  it('jedes geänderte Bit ändert die Summe (fast-check)', () => {
    fc.assert(
      fc.property(
        fc.array(feld, { minLength: 1, maxLength: 4 }).filter((f) => f.some((v) => v.byteLength > 0)),
        fc.nat(),
        fc.nat(),
        (felder, wahl, bit) => {
          const kopie = felder.map((v) => v.slice());
          const mitBytes = kopie.filter((v) => v.byteLength > 0);
          const v = mitBytes[wahl % mitBytes.length]!;
          const bytes = bytesVon(v);
          const i = bit % (v.byteLength * 8);
          bytes[i >> 3]! ^= 1 << (i & 7);
          expect(pruefsumme(kopie)).not.toBe(pruefsumme(felder));
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('gemessen werden Bytes: andere Sicht auf dieselben Bytes, dieselbe Summe; Teilsichten nur ihre Bytes', () => {
    fc.assert(
      fc.property(fc.float64Array({ minLength: 1, maxLength: 12 }), fc.nat(), fc.nat(), (f, a, b) => {
        expect(pruefsumme([f])).toBe(pruefsumme([bytesVon(f)]));
        expect(pruefsumme([f])).toBe(pruefsumme([new DataView(f.buffer, f.byteOffset, f.byteLength)]));
        const von = a % f.length;
        const bis = von + (b % (f.length - von + 1));
        const teil = f.subarray(von, bis);
        expect(pruefsumme([teil])).toBe(pruefsumme([teil.slice()]));
        const roh = bytesVon(f).subarray(von * 8 + 1, bis * 8);
        expect(pruefsumme([roh])).toBe(pruefsumme([roh.slice()]));
      }),
    );
  });

  it('die Grenzen der Felder und angehängte Nullen zählen mit, der Anfangswert auch', () => {
    const ab = pruefsumme([Uint8Array.of(1, 2, 3)]);
    expect(pruefsumme([Uint8Array.of(1), Uint8Array.of(2, 3)])).not.toBe(ab);
    expect(pruefsumme([Uint8Array.of(1, 2), Uint8Array.of(3)])).not.toBe(ab);
    expect(pruefsumme([Uint8Array.of(1, 2, 3, 0)])).not.toBe(ab);
    expect(pruefsumme([Uint8Array.of(1, 2, 3), new Uint8Array(0)])).not.toBe(ab);
    expect(pruefsumme([Uint8Array.of(1, 2, 3)], 1)).not.toBe(ab);
  });
});
