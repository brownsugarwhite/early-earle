import { describe, expect, it } from 'vitest';
import { boundingRadius, evalSdf, inverseSquash, sdfNormal, smin, traceSdf } from './sdf';
import { fractalNoise3, perlin3 } from './noise';
import { genomeFor, scaleForTier } from './genome';
import type { SdfProgram } from './types';

const unit: SdfProgram = { spheres: [{ center: [0, 0, 0], r: 1 }], sminK: 0, noiseAmp: 0, noiseFreq: 1 };

describe('smin', () => {
  it('never exceeds the hard minimum and is symmetric', () => {
    expect(smin(0.5, 0.2, 0.3)).toBeLessThanOrEqual(0.2);
    expect(smin(0.5, 0.2, 0.3)).toBeCloseTo(smin(0.2, 0.5, 0.3));
    expect(smin(1, 2, 0)).toBe(1);
  });
});

describe('evalSdf', () => {
  it('is exact for a single sphere', () => {
    expect(evalSdf(unit, [2, 0, 0])).toBeCloseTo(1);
    expect(evalSdf(unit, [0, 0, 0])).toBeCloseTo(-1);
  });
  it('inverse squash keeps the surface where the scaled body is', () => {
    // Stretch 50 % along y: the surface along y is at 1.5, across at 1/sqrt(1.5).
    const squash = { axis: [0, 1, 0] as [number, number, number], amount: 0.5 };
    const dTop = evalSdf(unit, [0, 1.5, 0], { squash });
    const dSide = evalSdf(unit, [1 / Math.sqrt(1.5), 0, 0], { squash });
    expect(Math.abs(dTop)).toBeLessThan(1e-6);
    expect(Math.abs(dSide)).toBeLessThan(1e-6);
    // Conservative: never over-estimates the distance.
    expect(evalSdf(unit, [0, 3, 0], { squash })).toBeLessThanOrEqual(1.5 + 1e-9);
    expect(inverseSquash([0, 0, 0], squash).lipschitz).toBeGreaterThanOrEqual(1);
  });
  it('normals are unit length and point outward', () => {
    const n = sdfNormal(unit, [0, 0, 1]);
    expect(Math.hypot(...n)).toBeCloseTo(1);
    expect(n[2]).toBeGreaterThan(0.99);
  });
  it('sphere tracing finds the surface of a genome body', () => {
    const g = genomeFor('tjorizo', 3, 7);
    const t = traceSdf(g, [0, 0, 5], [0, 0, -1], { time: 1.2, breathHz: g.breathHz });
    expect(t).not.toBeNull();
    expect(t!).toBeLessThan(5);
    expect(t!).toBeGreaterThan(5 - boundingRadius(g));
  });
});

describe('noise', () => {
  it('is deterministic, bounded and varies', () => {
    expect(perlin3(0.3, 0.7, 1.1)).toBe(perlin3(0.3, 0.7, 1.1));
    let min = 1;
    let max = -1;
    for (let i = 0; i < 2000; i++) {
      const v = fractalNoise3(i * 0.173, i * 0.091, i * 0.057);
      min = Math.min(min, v);
      max = Math.max(max, v);
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(max - min).toBeGreaterThan(0.5);
    expect(Math.abs(min)).toBeLessThan(1.6);
    expect(Math.abs(max)).toBeLessThan(1.6);
  });
  it('is zero on integer lattice points like Perlin noise', () => {
    expect(perlin3(3, 4, 5)).toBeCloseTo(0);
  });
});

describe('genomeFor', () => {
  it('is deterministic and tier 1 is pezenpez', () => {
    const a = genomeFor('tjorizo', 1, 42);
    const b = genomeFor('tjorizo', 1, 42);
    expect(a).toEqual(b);
    expect(a.spheres.length).toBe(1);
    expect(a.baseColor).toBe('#7ce6d5');
    expect(a.innerColor).toBe('#2f7f7a');
    expect(a.material).toBe('jelly');
  });
  it('grows with tier and never exceeds 8 spheres', () => {
    for (let t = 1; t <= 8; t++) {
      const g = genomeFor('luzz', t, 'x');
      expect(g.spheres.length).toBeLessThanOrEqual(8);
      expect(g.spheres.length).toBe(Math.min(8, t));
    }
    expect(scaleForTier(8)).toBeGreaterThan(scaleForTier(1));
    expect(genomeFor('tjorizo', 8, 0).material).toBe('fire');
  });
  it('differs between zones', () => {
    expect(genomeFor('tjorizo', 2, 1).baseColor).not.toBe(genomeFor('syrup', 2, 1).baseColor);
  });
});
