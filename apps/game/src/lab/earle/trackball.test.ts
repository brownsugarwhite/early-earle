import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { Trackball } from './trackball';

const R = 32;
const DT = 1 / 60;
const Y = new Vector3(0, 1, 0);

/** The spring and inertia of the trackball before `constrain` existed (maxTilt only), as the reference. */
function referenceStep(q: Quaternion, omega: Vector3, dt: number, maxTilt: number, tau = 0.4): void {
  const up = Y.clone().applyQuaternion(q);
  const tilt = Math.acos(Math.min(1, Math.max(-1, up.y)));
  if (tilt > maxTilt) {
    const axis = new Vector3().crossVectors(up, Y);
    if (axis.lengthSq() > 1e-12) {
      axis.normalize();
      omega.addScaledVector(axis, (tilt - maxTilt) * 14 * dt);
    }
    omega.multiplyScalar(Math.exp(-dt / 0.12));
  }
  const speed = omega.length();
  if (speed > 1e-4) {
    q.premultiply(new Quaternion().setFromAxisAngle(omega.clone().divideScalar(speed), speed * dt));
    omega.multiplyScalar(Math.exp(-dt / tau));
  } else if (speed > 0) omega.set(0, 0, 0);
}

const tiltOf = (q: Quaternion): number => Y.clone().applyQuaternion(q).angleTo(Y);

describe('Trackball', () => {
  it('keeps the default maxTilt spring exactly as before', () => {
    const maxTilt = (12 * Math.PI) / 180;
    const tb = new Trackball({ radius: R, worldUnitsPerPixel: () => 0.05 });
    // Tilt the apex by 30° and let go without inertia
    const start = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (30 * Math.PI) / 180);
    tb.quaternion.copy(start);
    const q = start.clone();
    const omega = new Vector3();
    for (let i = 0; i < 180; i++) {
      tb.step(DT);
      referenceStep(q, omega, DT, maxTilt);
      expect(tb.quaternion.angleTo(q)).toBeLessThan(1e-6);
    }
    expect(tiltOf(tb.quaternion)).toBeLessThan(maxTilt + 0.02);
  });

  /** A limit on the rotation angle about +X (a stand-in for the map's scroll region). */
  const limitAboutX = (limit: number) => (q: Quaternion, out: Vector3): number => {
    const p = new Vector3(0, 0, 1).applyQuaternion(q);
    const angle = Math.atan2(-p.y, p.z);
    const excess = Math.abs(angle) - limit;
    if (excess <= 0) return 0;
    out.set(-Math.sign(angle), 0, 0);
    return excess;
  };

  it('springs back into a custom region after a far throw', () => {
    const limit = 0.2;
    const constrain = limitAboutX(limit);
    const tb = new Trackball({ radius: R, worldUnitsPerPixel: () => 0.05, maxTilt: Math.PI, constrain, spring: 30 });
    // A fast drag down the screen (rotation about +X): far past the limit, with inertia
    for (let i = 0; i < 30; i++) tb.drag(0, 40, DT);
    expect(constrain(tb.quaternion, new Vector3())).toBeGreaterThan(0.5);
    for (let t = 0; t < 2; t += DT) tb.step(DT);
    expect(constrain(tb.quaternion, new Vector3())).toBeLessThan(0.01);
  });

  it('rubber-bands a drag past the limit (and only there)', () => {
    const limit = 0.2;
    const free = new Trackball({ radius: R, worldUnitsPerPixel: () => 0.05, maxTilt: Math.PI, constrain: limitAboutX(limit) });
    const band = new Trackball({ radius: R, worldUnitsPerPixel: () => 0.05, maxTilt: Math.PI, constrain: limitAboutX(limit), rubberSoft: 2.5 / R });
    // Inside the region both follow the finger 1:1
    free.drag(0, 30, DT);
    band.drag(0, 30, DT);
    expect(band.quaternion.angleTo(free.quaternion)).toBeLessThan(1e-6);
    for (let i = 0; i < 40; i++) {
      free.drag(0, 30, DT);
      band.drag(0, 30, DT);
    }
    const eFree = limitAboutX(limit)(free.quaternion, new Vector3());
    const eBand = limitAboutX(limit)(band.quaternion, new Vector3());
    expect(eFree).toBeGreaterThan(1);
    expect(eBand).toBeGreaterThan(0);
    expect(eBand).toBeLessThan(eFree * 0.5);
  });
});
