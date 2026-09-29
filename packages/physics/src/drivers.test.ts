import { describe, expect, it } from 'vitest';
import { SpringJiggle } from './SpringJiggle';
import { ShapeMatching } from './ShapeMatching';
import { polarDecompose, symEigen3, type Mat3 } from './math';
import type { SquashDriver, Vec3 } from './types';

const finite = (v: Vec3) => v.every(Number.isFinite);

function runDriver(driver: SquashDriver, name: string) {
  describe(name, () => {
    it('is at rest before any impulse', () => {
      const s = driver.get(0);
      expect(s.amount).toBe(0);
      expect(s.offset).toEqual([0, 0, 0]);
    });

    it('reacts to an impulse along the given axis and stays finite', () => {
      driver.impulse(1, [1, 0, 0], 1);
      let peak = 0;
      for (let i = 0; i < 30; i++) {
        driver.step(1 / 60);
        const s = driver.get(1);
        expect(finite(s.axis) && finite(s.offset) && Number.isFinite(s.amount)).toBe(true);
        peak = Math.max(peak, Math.abs(s.amount));
        expect(Math.abs(Math.hypot(...s.axis) - 1)).toBeLessThan(1e-3);
      }
      expect(peak).toBeGreaterThan(0.03);
      // The dominant axis is the impulse axis (sign-free).
      expect(Math.abs(driver.get(1).axis[0])).toBeGreaterThan(0.9);
    });

    it('returns to rest after a few seconds', () => {
      driver.impulse(2, [0, 0, 1], 1);
      driver.impulse(2, [0, 1, 0], 0.5);
      for (let i = 0; i < 60 * 8; i++) driver.step(1 / 60);
      const s = driver.get(2);
      expect(Math.abs(s.amount)).toBeLessThan(1e-3);
      expect(Math.hypot(...s.offset)).toBeLessThan(1e-3);
    });

    it('survives random impulses, large and tiny time steps without NaN', () => {
      let seed = 7;
      const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 400; i++) {
        if (rnd() < 0.2) driver.impulse(3, [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], rnd() * 3);
        driver.step(rnd() < 0.1 ? 0.25 : rnd() * 0.03);
        const s = driver.get(3);
        expect(finite(s.axis) && finite(s.offset) && Number.isFinite(s.amount)).toBe(true);
        expect(s.amount).toBeGreaterThanOrEqual(-0.6);
        expect(s.amount).toBeLessThanOrEqual(1.2);
      }
      driver.step(0);
      driver.step(-1);
      expect(Number.isFinite(driver.get(3).amount)).toBe(true);
    });

    it('viscous blobs settle faster than wobbly ones', () => {
      driver.configure(10, { viscosity: 0.05 });
      driver.configure(11, { viscosity: 0.95 });
      driver.impulse(10, [1, 0, 0], 1);
      driver.impulse(11, [1, 0, 0], 1);
      let wobbly = 0;
      let thick = 0;
      for (let i = 0; i < 60 * 2; i++) {
        driver.step(1 / 60);
        if (i > 30) {
          wobbly += Math.abs(driver.get(10).amount);
          thick += Math.abs(driver.get(11).amount);
        }
      }
      expect(wobbly).toBeGreaterThan(thick);
    });
  });
}

runDriver(new SpringJiggle(), 'SpringJiggle');
runDriver(new ShapeMatching({ particleCount: 20 }), 'ShapeMatching (20 particles)');
runDriver(new ShapeMatching({ particleCount: 12 }), 'ShapeMatching (12 particles)');

describe('math', () => {
  it('symmetric eigen-decomposition recovers a diagonal stretch', () => {
    const s: Mat3 = [2, 0, 0, 0, 1, 0, 0, 0, 0.5];
    const { values } = symEigen3(s);
    expect([...values].sort((a, b) => a - b)).toEqual([0.5, 1, 2]);
  });
  it('polar decomposition splits rotation and stretch', () => {
    const c = Math.cos(0.4);
    const sn = Math.sin(0.4);
    const rot: Mat3 = [c, -sn, 0, sn, c, 0, 0, 0, 1];
    const stretch: Mat3 = [1.5, 0, 0, 0, 1, 0, 0, 0, 1 / 1.5];
    // A = R · S
    const a: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) a[i * 3 + j] = a[i * 3 + j]! + rot[i * 3 + k]! * stretch[k * 3 + j]!;
    const { r, s } = polarDecompose(a);
    for (let i = 0; i < 9; i++) {
      expect(r[i]).toBeCloseTo(rot[i]!, 5);
      expect(s[i]).toBeCloseTo(stretch[i]!, 5);
    }
  });
});
