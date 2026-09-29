import { describe, expect, it } from 'vitest';
import { genomeFor } from './genome';
import { evalSdf } from './sdf';
import { RADIAL_TRACE_EXACT, RADIAL_TRACE_MESH, orientationFrame, radialSurfaceDistance, sampleSurface, socketDirection, socketSlotFromName, sphericalFromDirection, steerDirection } from './sockets';
import type { SdfProgram, Vec3 } from './types';

const unit: SdfProgram = { spheres: [{ center: [0, 0, 0], r: 1 }], sminK: 0, noiseAmp: 0, noiseFreq: 1 };
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

describe('socket directions', () => {
  it('round-trips spherical ↔ direction, forward is +z, right is +x', () => {
    expect(socketDirection(0, 0)).toEqual([0, 0, 1]);
    const right = socketDirection(Math.PI / 2, 0);
    expect(right[0]).toBeCloseTo(1);
    for (const [theta, phi] of [[0.3, 0.3], [-1.2, 0.8], [3.0, -0.4]] as const) {
      const s = sphericalFromDirection(socketDirection(theta, phi));
      expect(s.theta).toBeCloseTo(theta);
      expect(s.phi).toBeCloseTo(phi);
    }
  });
});

describe('radial surface trace', () => {
  it('finds the unit sphere at t = 1 with both configs', () => {
    const dir = socketDirection(0.4, 0.2);
    expect(radialSurfaceDistance(unit, dir, {}, RADIAL_TRACE_EXACT)).toBeCloseTo(1, 4);
    expect(Math.abs(radialSurfaceDistance(unit, dir, {}, RADIAL_TRACE_MESH) - 1)).toBeLessThan(2e-3);
  });

  it('lands on the genome body surface, also squashed, breathing and jiggling', () => {
    const g = genomeFor('tjorizo', 5, 11);
    const opts = { squash: { axis: [0.3, 1, 0] as Vec3, amount: 0.35, taper: 0.55 }, time: 2.3, breathHz: g.breathHz, phase: 1.1, jiggle: 0.8, material: g.material };
    for (const [theta, phi] of [[0.3, 0.3], [1.05, 0.6], [3.1, -0.1], [0, 1.32]] as const) {
      const dir = socketDirection(theta, phi);
      const s = sampleSurface(g, dir, opts, RADIAL_TRACE_EXACT);
      expect(Math.abs(evalSdf(g, s.point, opts))).toBeLessThan(0.01);
      // The mesh iteration (6 damped steps, what candidate b renders) stays within 0.05 blob units of
      // the converged surface; the rig uses that same iteration for (b) bodies, so parts sit on the mesh.
      const tMesh = radialSurfaceDistance(g, dir, opts, RADIAL_TRACE_MESH);
      expect(Math.abs(tMesh - s.t)).toBeLessThan(0.05);
      expect(len(s.normal)).toBeCloseTo(1);
      expect(dot(s.normal, dir)).toBeGreaterThan(0.3); // outward
    }
  });
});

describe('orientation frame', () => {
  it('is orthonormal with z = normal, y toward up; mirror reflects x', () => {
    const n: Vec3 = [0.6, 0.3, 0.74];
    const f = orientationFrame(n, { ref: 'up', mirror: 1, tilt: 0, roll: 0 });
    expect(len(f.x)).toBeCloseTo(1);
    expect(len(f.y)).toBeCloseTo(1);
    expect(dot(f.x, f.y)).toBeCloseTo(0);
    expect(dot(f.x, f.z)).toBeCloseTo(0);
    expect(dot(f.y, f.z)).toBeCloseTo(0);
    expect(f.y[1]).toBeGreaterThan(0);
    const m = orientationFrame(n, { ref: 'up', mirror: -1, tilt: 0, roll: 0 });
    expect(m.x[0]).toBeCloseTo(-f.x[0]);
    expect(m.z).toEqual(f.z);
  });

  it('tilt leans z toward the reference and roll spins about z; top sockets use forward', () => {
    const n: Vec3 = [0, 0, 1];
    const t = orientationFrame(n, { ref: 'up', mirror: 1, tilt: 0.5, roll: 0 });
    expect(t.z[1]).toBeCloseTo(Math.sin(0.5));
    const r = orientationFrame(n, { ref: 'up', mirror: 1, tilt: 0, roll: Math.PI / 2 });
    expect(Math.abs(dot(r.x, [0, 1, 0]))).toBeCloseTo(1);
    const top = orientationFrame([0, 1, 0], { ref: 'forward', mirror: 1, tilt: 0, roll: 0 });
    expect(top.y[2]).toBeCloseTo(1);
    // 'up' reference at an up-pointing normal falls back to forward instead of producing NaN.
    const degenerate = orientationFrame([0, 1, 0], { ref: 'up', mirror: 1, tilt: 0, roll: 0 });
    expect(Number.isFinite(degenerate.x[0] + degenerate.y[0])).toBe(true);
  });
});

describe('steerDirection', () => {
  it('turns toward the target but never further than maxAngle', () => {
    const d = steerDirection([0, 0, 1], [1, 0, 0], 0.2);
    expect(Math.acos(dot(d, [0, 0, 1]))).toBeCloseTo(0.2);
    // Within reach: the result is the (normalised) target itself.
    const reached = steerDirection([0, 0, 1], [0, 0.1, 1], 1);
    const l = Math.hypot(0, 0.1, 1);
    expect(reached[1]).toBeCloseTo(0.1 / l);
    expect(reached[2]).toBeCloseTo(1 / l);
    expect(len(reached)).toBeCloseTo(1);
  });
});

describe('socketSlotFromName', () => {
  it('strips Blender numeric suffixes and three.js sanitised suffixes', () => {
    expect(socketSlotFromName('SOCKET_root')).toBe('root');
    expect(socketSlotFromName('SOCKET_root.001')).toBe('root');
    expect(socketSlotFromName('SOCKET_root001')).toBe('root');
    expect(socketSlotFromName('SOCKET_tip.014')).toBe('tip');
    expect(socketSlotFromName('SOCKET_eye_l')).toBe('eye_l');
    expect(socketSlotFromName('SOCKET_tip2')).toBe('tip2');
    expect(socketSlotFromName('trunk_short_seg0')).toBeNull();
    expect(socketSlotFromName('SOCKET_')).toBeNull();
  });
});
