import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { ANSICHTEN, Turntable, rahmen } from './turntable';

describe('Drehteller', () => {
  it('Rahmen: Würfel von vorn, 90° Sichtfeld → Abstand 1 (Vorderkante 0,5 + halbe Breite 0,5)', () => {
    const r = rahmen({ min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] }, 0, 0, 90, 1, 1);
    expect(r.distance).toBeCloseTo(1, 6);
    r.target.forEach((v) => expect(v).toBeCloseTo(0, 6));
  });

  it('Rahmen: jede Ecke liegt nach dem Einpassen im Bild (Bögen-Ansicht, hochkant)', () => {
    const box = { min: [-0.4, 0, -1.2], max: [0.5, 1.6, 0.9] };
    const a = ANSICHTEN.boegen;
    const aspect = 393 / 460;
    const { distance, target } = rahmen(box, a.yaw, a.pitch, a.fov, aspect, 0.84);
    const t = new Turntable();
    t.setView({ yaw: a.yaw, pitch: a.pitch, fov: a.fov, distance, target });
    const cam = new PerspectiveCamera(a.fov, aspect, 0.01, 100);
    t.apply(cam);
    cam.updateMatrixWorld(true);
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < 8; i++) {
      const p = new Vector3(i & 1 ? box.max[0] : box.min[0], i & 2 ? box.max[1] : box.min[1], i & 4 ? box.max[2] : box.min[2]).project(cam);
      maxX = Math.max(maxX, Math.abs(p.x));
      maxY = Math.max(maxY, Math.abs(p.y));
    }
    expect(Math.max(maxX, maxY)).toBeLessThanOrEqual(0.8401);
    expect(Math.max(maxX, maxY)).toBeGreaterThan(0.6); // eng, nicht verschenkt
  });

  it('Fahrt zu einer festen Ansicht: erreicht Winkel und Brennweite, Ziehen bricht ab', () => {
    const t = new Turntable();
    t.setAnsicht('brett', { distance: 5, target: [0, 0.2, 0] }, 0.4);
    expect(t.animating).toBe(true);
    for (let i = 0; i < 30; i++) t.step(1 / 60);
    expect(t.animating).toBe(false);
    expect(t.pitch).toBeCloseTo(ANSICHTEN.brett.pitch, 6);
    expect(t.fov).toBeCloseTo(ANSICHTEN.brett.fov, 6);
    expect(t.distance).toBeCloseTo(5, 6);
    expect(t.userZoomed).toBe(false);
    t.zoom(1.2, true);
    expect(t.userZoomed).toBe(true);
  });
});
