import { describe, expect, it } from 'vitest';
import { nearestInRegion, nodeStations, onPlane, onSphere, rubber, scrollRegion, type P3, type PathStation } from './scrollLimit';

const p = (x: number, z: number, y = 0): P3 => ({ x, y, z });
/** A straight path along −z: node i at z = −4i. */
const straight = nodeStations([0, 1, 2, 3, 4, 5].map((i) => p(0, -4 * i)));

describe('scrollRegion', () => {
  it('covers the reached nodes plus the teaser share of the next stretch', () => {
    const r = scrollRegion(straight, 2, { margin: 2.5, teaser: 0.6 });
    expect(r.points).toHaveLength(4);
    expect(r.points[3]!.z).toBeCloseTo(-10.4);
    expect(r.margin).toBe(2.5);
  });

  it('keeps at least the first node and stops at the path end', () => {
    const first = scrollRegion(straight, 0, { margin: 3, teaser: 0 }).points;
    expect(first).toHaveLength(1);
    expect(Math.hypot(first[0]!.x, first[0]!.z)).toBe(0);
    expect(scrollRegion(straight, 9, { margin: 3 }).points).toHaveLength(6);
  });

  it('follows dots between the nodes', () => {
    const path: PathStation[] = [
      { p: p(0, 0), s: 0 },
      { p: p(1, -2), s: 0.5 },
      { p: p(0, -4), s: 1 },
      { p: p(-1, -6), s: 1.5 },
      { p: p(0, -8), s: 2 },
    ];
    const r = scrollRegion(path, 1, { margin: 2, teaser: 0.25 });
    expect(r.points).toHaveLength(4);
    expect(r.points[3]!.x).toBeCloseTo(-0.5);
    expect(r.points[3]!.z).toBeCloseTo(-5);
  });
});

describe('nearestInRegion', () => {
  const r = scrollRegion(straight, 2, { margin: 2.5 });

  it('finds the nearest point on the polyline', () => {
    const hit = nearestInRegion(r, p(3, -5));
    expect(hit.anchor.x).toBeCloseTo(0);
    expect(hit.anchor.z).toBeCloseTo(-5);
    expect(hit.distance).toBeCloseTo(3);
    expect(hit.excess).toBeCloseTo(0.5);
  });

  it('clamps to the region ends', () => {
    const behind = nearestInRegion(r, p(0, 6));
    expect(behind.anchor.z).toBeCloseTo(0);
    expect(behind.excess).toBeCloseTo(3.5);
    const ahead = nearestInRegion(r, p(0, -20));
    expect(ahead.anchor.z).toBeCloseTo(-10.4);
    expect(ahead.excess).toBeCloseTo(20 - 10.4 - 2.5);
  });

  it('reports no excess inside the margin', () => {
    expect(nearestInRegion(r, p(2, -3)).excess).toBe(0);
    expect(nearestInRegion(r, p(0, -1)).distance).toBeCloseTo(0);
  });
});

describe('rubber', () => {
  it('is 1 at the rim and falls monotonically', () => {
    expect(rubber(0)).toBe(1);
    let last = 1;
    for (let e = 0.25; e < 20; e += 0.25) {
      const g = rubber(e);
      expect(g).toBeLessThan(last);
      expect(g).toBeGreaterThan(0);
      last = g;
    }
    expect(rubber(2.5)).toBeCloseTo(0.25);
    expect(rubber(-3)).toBe(1);
  });
});

describe('sphere and plane agree near the focus', () => {
  const R = 32;
  /** Azimuthal equidistant map of the plane around the apex (the ADR 0002 display). */
  const toSphere = (q: P3): P3 => {
    const d = Math.hypot(q.x, q.z);
    if (d < 1e-9) return { x: 0, y: R, z: 0 };
    const a = d / R;
    return { x: (R * Math.sin(a) * q.x) / d, y: R * Math.cos(a), z: (R * Math.sin(a) * q.z) / d };
  };
  // A meandering path of 6 nodes around the apex, the region up to node 3 (+0.6)
  const plane = [p(0, 4), p(1.5, 0.5), p(-0.8, -3), p(0.6, -6.5), p(-1.2, -9.5), p(0.4, -13)];

  // The display map keeps distances from the focus exactly; between other points it stretches by ≈ (d/R)²/6, and a
  // chord between two nodes 4 apart sags L²/8R ≈ 0.06 below the sphere: a tenth of a unit against a 2.5-unit margin.
  it('gives the same distance and excess (0.1 + 2 %)', () => {
    const rPlane = scrollRegion(nodeStations(plane.map(onPlane)), 3, { margin: 2.5 });
    // on the sphere: points a little above ground, projected radially (like the planet's nodes)
    const rSphere = scrollRegion(nodeStations(plane.map((q) => onSphere({ ...toSphere(q), y: toSphere(q).y + 0.3 }, R))), 3, { margin: 2.5 });
    for (const f of [p(4, -2), p(-5, -8), p(0, 8), p(2, -12), p(0.5, -1)]) {
      const a = nearestInRegion(rPlane, onPlane(f));
      const b = nearestInRegion(rSphere, onSphere(toSphere(f), R));
      expect(Math.abs(a.distance - b.distance)).toBeLessThan(0.1 + 0.02 * a.distance);
      expect(Math.abs(a.excess - b.excess)).toBeLessThan(0.1 + 0.02 * a.distance);
    }
  });
});
