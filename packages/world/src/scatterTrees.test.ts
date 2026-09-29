import { describe, expect, it } from 'vitest';
import { scatterTrees } from './scatterTrees';

const cap = { radius: 40, arcDeg: 40, res: 48, seed: 7 };

describe('scatterTrees', () => {
  it('ist deterministisch', () => {
    const a = scatterTrees({ seed: 42, count: 200, minDist: 1.5, cap });
    const b = scatterTrees({ seed: 42, count: 200, minDist: 1.5, cap });
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(20);
    expect(a.length).toBeLessThanOrEqual(200);
  });

  it('hält den Mindestabstand ein (Poisson-Disc)', () => {
    const trees = scatterTrees({ seed: 3, count: 400, minDist: 1.5, cap, clumpiness: 0 });
    for (let i = 0; i < trees.length; i++) {
      for (let j = i + 1; j < trees.length; j++) {
        const a = trees[i]!.position;
        const b = trees[j]!.position;
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        // Sehne statt Bogen plus Höhenversatz: ~15 % Toleranz
        expect(d).toBeGreaterThan(1.5 * 0.85);
      }
    }
  });

  it('Wachstumsrang ist sortiert und in [0,1)', () => {
    const trees = scatterTrees({ seed: 9, count: 150, minDist: 1.4, cap });
    for (let i = 0; i < trees.length; i++) {
      expect(trees[i]!.growth).toBeCloseTo(i / trees.length, 9);
    }
  });

  it('Bäume stehen auf der Oberfläche, Hüllzentrum über dem Fußpunkt', () => {
    const trees = scatterTrees({ seed: 9, count: 150, minDist: 1.4, cap });
    for (const t of trees) {
      const r = Math.hypot(...t.position);
      expect(r).toBeGreaterThanOrEqual(40 - 1e-4);
      expect(r).toBeLessThanOrEqual(40 + 1.8 + 1e-4);
      const dn = Math.hypot(...t.normal);
      expect(dn).toBeCloseTo(1, 4);
      const up =
        (t.hullCenter[0] - t.position[0]) * t.normal[0] +
        (t.hullCenter[1] - t.position[1]) * t.normal[1] +
        (t.hullCenter[2] - t.position[2]) * t.normal[2];
      expect(up).toBeGreaterThan(t.trunkHeight);
      expect(['dome', 'cone', 'stacked']).toContain(t.kind);
    }
  });

  it('Klumpung reduziert die Anzahl gegenüber Gleichverteilung', () => {
    const even = scatterTrees({ seed: 5, count: 1000, minDist: 1.2, cap, clumpiness: 0 });
    const clumped = scatterTrees({ seed: 5, count: 1000, minDist: 1.2, cap, clumpiness: 1 });
    expect(clumped.length).toBeLessThan(even.length);
  });
});
