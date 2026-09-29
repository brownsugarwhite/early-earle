import { describe, expect, it } from 'vitest';
import { IdleClock, Spring1D, SpringChain, blinkAmount, springStep } from './procedural';

describe('springs', () => {
  it('settle on the target and overshoot when under-damped', () => {
    const s = { x: 0, v: 0 };
    let maxX = 0;
    for (let i = 0; i < 600; i++) {
      springStep(s, 1, 20, 0.2, 1 / 120);
      maxX = Math.max(maxX, s.x);
    }
    expect(maxX).toBeGreaterThan(1.05); // overshoot
    expect(s.x).toBeCloseTo(1, 3);
    const c = new Spring1D(0, 30, 1);
    c.target = 2;
    for (let i = 0; i < 300; i++) c.step(1 / 60);
    expect(c.settled).toBe(true);
    expect(c.x).toBeCloseTo(2, 3);
  });

  it('kicks decay and stay finite at low frame rates', () => {
    const s = new Spring1D(0, 40, 0.15);
    s.kick(12);
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      s.step(0.1); // 10 fps
      peak = Math.max(peak, Math.abs(s.x));
      expect(Number.isFinite(s.x)).toBe(true);
    }
    expect(peak).toBeGreaterThan(0.05);
    expect(Math.abs(s.x)).toBeLessThan(peak);
  });
});

describe('SpringChain', () => {
  it('segments follow the root drive with a lag and rest curl', () => {
    const chain = new SpringChain(4, { restBendX: 0.2, follow: 0.9 });
    for (let i = 0; i < 400; i++) chain.step(1 / 120);
    expect(chain.ax[0]).toBeCloseTo(0.2, 2);
    expect(chain.cumulative(3)[0]).toBeCloseTo(0.2 * 4, 1);
    chain.driveY = 0.5;
    chain.step(1 / 60);
    chain.step(1 / 60);
    // Root reacts first, the tip lags behind.
    expect(Math.abs(chain.ay[0]!)).toBeGreaterThan(Math.abs(chain.ay[3]!));
    for (let i = 0; i < 600; i++) chain.step(1 / 120);
    expect(chain.ay[0]).toBeCloseTo(0.5, 2);
    expect(chain.ay[3]).toBeGreaterThan(0.2);
  });

  it('impulses ripple with falloff and decay', () => {
    const chain = new SpringChain(3);
    chain.impulse(6, 0, 0.5);
    expect(chain.vx[0]).toBeCloseTo(6);
    expect(chain.vx[2]).toBeCloseTo(1.5);
    for (let i = 0; i < 600; i++) chain.step(1 / 120);
    expect(Math.abs(chain.ax[0]!)).toBeLessThan(0.02);
  });
});

describe('IdleClock', () => {
  it('is deterministic per seed and fires blinks at a plausible rate', () => {
    const run = (seed: number, tempo = 1) => {
      const clock = new IdleClock(seed, tempo);
      const fired: string[] = [];
      for (let i = 0; i < 60 * 60; i++) for (const e of clock.step(1 / 60)) fired.push(e.verb);
      return fired;
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
    const blinks = run(7).filter((v) => v === 'blink').length;
    expect(blinks).toBeGreaterThan(8); // ≈ 60 s / 3.4 s
    expect(blinks).toBeLessThan(40);
    expect(run(7, 2).filter((v) => v === 'blink').length).toBeGreaterThan(blinks);
  });

  it('blink curve closes fast and opens softer', () => {
    expect(blinkAmount(-1)).toBe(0);
    expect(blinkAmount(0.16 * 0.4)).toBeCloseTo(1);
    expect(blinkAmount(0.16 * 0.2)).toBeGreaterThan(0.5);
    expect(blinkAmount(0.16 * 0.8)).toBeLessThan(0.5);
    expect(blinkAmount(1)).toBe(0);
  });
});
