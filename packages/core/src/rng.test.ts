import { describe, expect, it } from 'vitest';
import { hash32, mulberry32, pickWeighted, randInt } from './rng';

describe('rng', () => {
  it('mulberry32 is a pure function of its state', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect(a).toEqual(b);
    expect(a[0]).toBeGreaterThanOrEqual(0);
    expect(a[0]).toBeLessThan(2 ** 32);
    expect(a[1]).not.toBe(12345);
    // consecutive draws differ
    const c = mulberry32(a[1]);
    expect(c[0]).not.toBe(a[0]);
  });

  it('produces a reasonably uniform stream', () => {
    let s = 42;
    const buckets = new Array<number>(8).fill(0);
    for (let i = 0; i < 8000; i++) {
      const [u, next] = mulberry32(s);
      s = next;
      buckets[u >>> 29]!++;
    }
    for (const b of buckets) expect(Math.abs(b - 1000)).toBeLessThan(150);
  });

  it('randInt stays in range and pickWeighted follows the weights', () => {
    let s = 7;
    const counts = new Array<number>(5).fill(0);
    for (let i = 0; i < 5000; i++) {
      const [v, next] = randInt(s, 5);
      s = next;
      counts[v]!++;
    }
    for (const c of counts) expect(Math.abs(c - 1000)).toBeLessThan(150);

    const picks = [0, 0];
    for (let i = 0; i < 4000; i++) {
      const [idx, next] = pickWeighted(s, [9, 1]);
      s = next;
      picks[idx]!++;
    }
    expect(picks[0]! / 4000).toBeGreaterThan(0.86);
    expect(picks[0]! / 4000).toBeLessThan(0.94);
    expect(randInt(1, 1)[0]).toBe(0);
  });

  it('hash32 is stable, non-zero and sensitive to every part', () => {
    expect(hash32('tjorizo-001', 1)).toBe(hash32('tjorizo-001', 1));
    expect(hash32('tjorizo-001', 1)).not.toBe(hash32('tjorizo-001', 2));
    expect(hash32('tjorizo-001', 1)).not.toBe(hash32('tjorizo-002', 1));
    expect(hash32('a', 'b')).not.toBe(hash32('ab'));
    expect(hash32('')).not.toBe(0);
    expect(hash32('tjorizo-001', 1)).toMatchInlineSnapshot(`2857839517`);
  });
});
