import { describe, expect, it } from 'vitest';
import type { PathDot, PathLayout, PathNode } from '../path';
import { createMapFocusConstraint, pathStations } from './mapFocus';
import type { P3 } from './scrollLimit';

/** Nodes 4 units apart along −z on a rising slope, a dot in the middle of each stretch (the infinite plane). */
function layout(): PathLayout {
  const node = (i: number): PathNode => ({ index: i, position: [0, 0.5 * i, -4 * i], normal: [0, 1, 0] });
  return {
    node,
    window(first, last) {
      const nodes: PathNode[] = [];
      for (let i = first; i <= last; i++) nodes.push(node(i));
      const dots: PathDot[] = [];
      for (let seg = first - 1; seg <= last; seg++) if (seg >= 0) dots.push({ position: [0, 0.5 * seg + 0.25, -4 * seg - 2], normal: [0, 1, 0], seg, u: 0.5 });
      return { first, nodes, dots, ribbon: [] };
    },
    nearestNode: (_x, z) => Math.max(0, Math.round(-z / 4)),
    lastPlayable: 99,
  };
}

/** The map target sits 8 units ahead of the focus (the view looks down −z). */
const target = (f: P3): P3 => ({ x: f.x, y: 0, z: f.z - 8 });
const at = (x: number, z: number): P3 => ({ x, y: 0, z });

describe('pathStations', () => {
  it('orders nodes and dots along the path, flat on the plane', () => {
    const st = pathStations(layout(), 5);
    expect(st.map((p) => p.s)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    expect(st.every((p) => p.p.y === 0)).toBe(true);
  });
});

describe('createMapFocusConstraint', () => {
  const make = (limit: { reached: number; margin: number } | null) => createMapFocusConstraint({ layout: layout(), target, limit: () => limit });

  it('is free without a limit (free mode)', () => {
    const c = make(null);
    expect(c.measure(at(0, 0))).toBeNull();
    expect(c.constrain(at(40, -300))).toBeNull();
  });

  it('lets the view pan along the unlocked path', () => {
    const c = make({ reached: 2, margin: 2.5 });
    // The view shows node 2 (8 units down the path) on its target
    const hit = c.measure(at(0, 0))!;
    expect(hit.distance).toBeLessThan(0.1);
    expect(c.constrain(at(0, 0))).toBeNull();
    expect(c.constrain(at(1.5, 4))).toBeNull();
  });

  it('pulls back past the region: moving the focus toward the anchor reduces the excess', () => {
    const c = make({ reached: 2, margin: 2.5 });
    // Far beyond the teaser (the target on node 5, 20 units), and sideways off the path
    for (const f of [at(0, -12), at(9, 0)]) {
      const r = c.constrain(f)!;
      expect(r.excess).toBeGreaterThan(0.05);
      const back = at(f.x + (r.anchor.x - f.x) * 0.1, f.z + (r.anchor.z - f.z) * 0.1);
      expect(c.measure(back)!.excess).toBeLessThan(r.excess);
      // at the anchor the target sits on the path again
      expect(c.measure(r.anchor)!.distance).toBeLessThan(1e-6);
    }
  });

  it('measures the excess in world units beyond the margin', () => {
    const c = make({ reached: 0, margin: 2.5 });
    // Node 0 plus 0.6 of the first stretch (2.4 units): the target 6 units down the path → 3.6 past the end, 1.1 beyond
    const hit = c.measure(at(0, 2))!;
    expect(hit.excess).toBeCloseTo(1.1, 5);
  });
});
