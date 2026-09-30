import { describe, expect, it } from 'vitest';
import { hopArc, hopDurations, MAX_HOPS, routeStops, walkDuration, WALK_MAX, WALK_MIN, type RouteDot } from './route';

/** `n` dots on segment `seg`, shuffled, with dots of the neighbour segments around them. */
function dots(n: number, seg = 3): RouteDot[] {
  const own = Array.from({ length: n }, (_, i) => ({ seg, u: (i + 1) / (n + 1) }));
  const shuffled = own.map((d, i) => ({ d, k: (i * 7919) % 13 })).sort((a, b) => a.k - b.k).map((e) => e.d);
  return [{ seg: seg - 1, u: 0.5 }, ...shuffled, { seg: seg + 1, u: 0.2 }];
}

describe('routeStops', () => {
  it('takes the dots of the segment sorted by u and ends on the next node', () => {
    const all = dots(6);
    const stops = routeStops(all, 3);
    expect(stops).toHaveLength(7);
    for (let i = 1; i < stops.length; i++) expect(stops[i]!.u).toBeGreaterThan(stops[i - 1]!.u);
    for (const s of stops.slice(0, -1)) expect(all[s.dot]!.seg).toBe(3);
    expect(stops.at(-1)).toEqual({ dot: -1, u: 1 });
  });

  it('thins long stretches to at most ten hops (every second dot)', () => {
    for (const n of [9, 10, 14, 25, 40]) {
      const stops = routeStops(dots(n), 3);
      expect(stops.length).toBeLessThanOrEqual(MAX_HOPS);
      expect(stops.length).toBeGreaterThanOrEqual(3);
      expect(stops.at(-1)!.u).toBe(1);
    }
    // nine dots + the node fit exactly, ten do not
    expect(routeStops(dots(9), 3)).toHaveLength(10);
    expect(routeStops(dots(10), 3)).toHaveLength(6);
  });

  it('hops straight onto the node when the segment has no dots', () => {
    expect(routeStops(dots(0), 3)).toEqual([{ dot: -1, u: 1 }]);
  });
});

describe('hop timing', () => {
  it('splits the walk by the share of each hop and sums to the walk duration', () => {
    for (const n of [0, 3, 8, 20]) {
      const stops = routeStops(dots(n), 3);
      const walk = walkDuration(stops.length);
      const durations = hopDurations(stops, walk);
      expect(durations).toHaveLength(stops.length);
      expect(durations.reduce((a, b) => a + b, 0)).toBeCloseTo(walk, 9);
      for (const d of durations) expect(d).toBeGreaterThan(0);
    }
  });

  it('clamps the walk between 1.1 and 2.4 s', () => {
    expect(walkDuration(1)).toBe(WALK_MIN);
    expect(walkDuration(8)).toBeCloseTo(1.76);
    expect(walkDuration(40)).toBe(WALK_MAX);
  });

  it('lifts longer hops higher', () => {
    expect(hopArc(0)).toBeCloseTo(0.18);
    expect(hopArc(2)).toBeGreaterThan(hopArc(1));
  });
});
