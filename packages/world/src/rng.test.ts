import { describe, expect, it } from 'vitest';
import { hash32, mulberry32 } from './rng';

/** Die frühere Fassung (je Zahl ein neues Float64Array): Referenz für identische Werte. */
function hash32Reference(...parts: ReadonlyArray<number | string>): number {
  let h = 0x811c9dc5;
  const mixByte = (b: number) => {
    h ^= b & 0xff;
    h = Math.imul(h, 0x01000193);
  };
  for (const part of parts) {
    if (typeof part === 'string') {
      for (let i = 0; i < part.length; i++) mixByte(part.charCodeAt(i));
      mixByte(0xff);
    } else {
      const f = new Float64Array([part]);
      const u = new Uint8Array(f.buffer);
      for (let i = 0; i < 8; i++) mixByte(u[i] ?? 0);
    }
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

describe('hash32', () => {
  it('liefert ohne Allokation dieselben Werte wie die frühere Fassung', () => {
    const rnd = mulberry32(42);
    const specials = [0, -0, 1, -1, 0.5, 1e-9, -1e9, 3.141592653589793, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE, Infinity, -Infinity, NaN];
    for (const s of specials) expect(hash32('x', s)).toBe(hash32Reference('x', s));
    for (let i = 0; i < 2000; i++) {
      const a = Math.round((rnd() - 0.5) * 2e5);
      const b = (rnd() - 0.5) * 1e3;
      const c = rnd();
      const tag = i % 3 === 0 ? 'tree' : i % 3 === 1 ? 'map-home' : 'ünïcødé';
      expect(hash32(tag, a, b, c, i)).toBe(hash32Reference(tag, a, b, c, i));
      expect(hash32(a, tag, b)).toBe(hash32Reference(a, tag, b));
    }
    expect(hash32()).toBe(hash32Reference());
    expect(hash32('')).toBe(hash32Reference(''));
  });
});
