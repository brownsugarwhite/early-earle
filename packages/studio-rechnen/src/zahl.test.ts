// Zahlen schreiben (Plan 3.5 Nr. 3): ungerundet wie String, −0 als 0, Rundweg bitgleich; NaN, ±∞ und Beträge über 1e15 brechen ab.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ZAHL_GRENZE, zahlText } from './zahl';

describe('zahlText', () => {
  it('schreibt wie String, −0 als 0, nie gerundet', () => {
    expect(zahlText(0)).toBe('0');
    expect(zahlText(-0)).toBe('0');
    expect(zahlText(0.1 + 0.2)).toBe('0.30000000000000004');
    expect(zahlText(-12.5)).toBe('-12.5');
    expect(zahlText(123456789.123)).toBe('123456789.123');
    expect(zahlText(1 / 3)).toBe('0.3333333333333333');
    expect(zahlText(1e15)).toBe('1000000000000000');
    expect(zahlText(-1e15)).toBe('-1000000000000000');
  });

  it('Beträge unter 1e-6 mit Exponent, wie String', () => {
    expect(zahlText(1e-6)).toBe('0.000001');
    expect(zahlText(9.99e-7)).toBe('9.99e-7');
    expect(zahlText(1e-7)).toBe('1e-7');
    expect(zahlText(-2.5e-9)).toBe('-2.5e-9');
    expect(zahlText(5e-324)).toBe('5e-324');
  });

  it('bricht ab bei NaN, ±∞ und Beträgen über 1e15', () => {
    for (const x of [NaN, Infinity, -Infinity, 1e15 + 1, -1e15 - 1, 1e16, 1e21, Number.MAX_VALUE, -Number.MAX_VALUE])
      expect(() => zahlText(x), String(x)).toThrow(RangeError);
  });

  it('gleich String(x) und beim Lesen dieselbe Zahl, bitgleich (fast-check)', () => {
    fc.assert(
      fc.property(fc.double({ min: -ZAHL_GRENZE, max: ZAHL_GRENZE, noNaN: true }), (x) => {
        const text = zahlText(x);
        expect(text).toBe(x === 0 ? '0' : String(x));
        expect(Object.is(Number(text), x === 0 ? 0 : x)).toBe(true);
        expect(Object.is(JSON.parse(text), x === 0 ? 0 : x)).toBe(true);
      }),
      { numRuns: 20000 },
    );
  });
});
