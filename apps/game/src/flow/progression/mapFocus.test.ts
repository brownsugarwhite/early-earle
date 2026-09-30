import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import type { PathLayout } from '../path';
import { createMapFocusConstraint, pathStations } from './mapFocus';

const R = 32;
/** Nodes 4 units apart along a meridian from the apex toward −z, a dot in the middle of each stretch. */
function layout(): PathLayout {
  const at = (s: number): [number, number, number] => {
    const a = (4 * s) / R;
    return [0, R * Math.cos(a), -R * Math.sin(a)];
  };
  const nodes = [0, 1, 2, 3, 4, 5].map((i) => ({ index: i, u: 0, v: 0, position: at(i), normal: at(i).map((c) => c / R) as [number, number, number] }));
  const dots = [0, 1, 2, 3, 4].map((seg) => ({ position: at(seg + 0.5), normal: [0, 1, 0] as [number, number, number], seg, u: 0.5 }));
  return { nodes, dots, length: 20 };
}

describe('pathStations', () => {
  it('orders nodes and dots along the path', () => {
    const s = pathStations(layout(), R).map((p) => p.s);
    expect(s).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
  });
});

describe('createMapFocusConstraint', () => {
  const target = new Vector3(0, 1, 0);
  const make = (limit: { reached: number; margin: number } | null) => createMapFocusConstraint({ layout: layout(), radius: R, targetDir: () => target, limit: () => limit });

  it('is free without a limit (free mode)', () => {
    const c = make(null);
    expect(c.measure(new Quaternion())).toBeNull();
    expect(c.constrain(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 1), new Vector3())).toBe(0);
  });

  it('lets the view roll along the unlocked path', () => {
    const c = make({ reached: 2, margin: 2.5 });
    // The planet turned so the view looks at node 2 (8 units down the path)
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 8 / R);
    const hit = c.measure(q)!;
    expect(hit.distance).toBeLessThan(0.1);
    expect(c.constrain(q, new Vector3())).toBe(0);
  });

  it('pulls back past the region: turning about the returned axis reduces the excess', () => {
    const c = make({ reached: 2, margin: 2.5 });
    // Far beyond the teaser (node 5, 20 units), and sideways off the path
    for (const q of [new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 20 / R), new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 9 / R)]) {
      const axis = new Vector3();
      const e0 = c.constrain(q, axis);
      expect(e0).toBeGreaterThan(0.05);
      expect(axis.length()).toBeCloseTo(1, 5);
      const back = q.clone().premultiply(new Quaternion().setFromAxisAngle(axis, 0.05));
      expect(c.constrain(back, new Vector3())).toBeLessThan(e0);
    }
  });

  it('measures the excess in world units beyond the margin', () => {
    const c = make({ reached: 0, margin: 2.5 });
    // Node 0 plus 0.6 of the first stretch (2.4 units): looking 6 units down the path → 3.6 past the end, 1.1 beyond
    const hit = c.measure(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 6 / R))!;
    expect(hit.excess).toBeCloseTo(1.1, 1);
  });
});
