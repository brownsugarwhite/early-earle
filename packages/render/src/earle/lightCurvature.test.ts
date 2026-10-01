import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three/webgpu';
import { curvedLightCpu, earleLight, rotateLightCpu, setLightCurvature } from './lightCurvature';

/**
 * Lichtkrümmung (R0): CPU-Seite der Rodrigues-Drehung (die TSL-Seite ist dieselbe Formel). Geprüft: k = 1 legt n̂ auf
 * `up` (up · L' = n̂ · L), k = 0 ist die Identität, der Scheitel liefert kein NaN, und die Drehung ist rahmenunabhängig
 * (View- und Welt-Variante liefern dasselbe, nur gedreht).
 */
describe('Lichtkrümmung (CPU)', () => {
  const R = 32;
  const up = new Vector3(0, 1, 0);
  const sun = (elDeg: number, azDeg: number): Vector3 => {
    const el = (elDeg * Math.PI) / 180;
    const az = (azDeg * Math.PI) / 180;
    return new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  };
  /** Anzeigepunkt auf der Kugel: Bogen `d` vom Scheitel in Richtung `theta` (xz). */
  const onGlobe = (d: number, theta: number, h = 0): Vector3 => {
    const a = d / R;
    return new Vector3(Math.sin(a) * Math.cos(theta), Math.cos(a), Math.sin(a) * Math.sin(theta)).multiplyScalar(R + h);
  };

  it('k = 1: die gedrehte Sonne sieht die Ebene so, wie die ungedrehte die Kugel sah (up · L′ = n̂ · L)', () => {
    const L = sun(10, 70);
    for (const [d, theta, h] of [
      [3, 0.2, 0],
      [16, 1.1, 2.5],
      [30, -2.0, 0],
      [60, 3.0, 1],
    ] as const) {
      const p = onGlobe(d, theta, h);
      const n = p.clone().normalize();
      const out = curvedLightCpu(L, p, 1);
      expect(out.length()).toBeCloseTo(1, 9);
      expect(up.dot(out)).toBeCloseTo(n.dot(L), 9);
    }
  });

  it('k = 0: Identität', () => {
    const L = sun(10, 70);
    const p = onGlobe(16, 1.1, 2.5);
    const out = curvedLightCpu(L, p, 0);
    expect(out.x).toBe(L.x);
    expect(out.y).toBe(L.y);
    expect(out.z).toBe(L.z);
  });

  it('dazwischen stetig: k = 0,4 liegt zwischen flach und Kugel', () => {
    const L = sun(10, 70);
    const p = onGlobe(16, 1.1);
    const n = p.clone().normalize();
    const flat = up.dot(L);
    const globe = n.dot(L);
    const mid = up.dot(curvedLightCpu(L, p, 0.4));
    expect(mid).toBeGreaterThan(Math.min(flat, globe) - 1e-9);
    expect(mid).toBeLessThan(Math.max(flat, globe) + 1e-9);
    expect(mid).not.toBeCloseTo(flat, 3);
  });

  it('Scheitel (n̂ = up) ohne NaN, L unverändert — auch ganz knapp daneben', () => {
    const L = sun(10, 70);
    for (const p of [new Vector3(0, R, 0), new Vector3(1e-9, R, -1e-9), new Vector3(0, R + 3, 0)]) {
      const out = curvedLightCpu(L, p, 1);
      expect(Number.isFinite(out.x + out.y + out.z)).toBe(true);
      expect(out.x).toBeCloseTo(L.x, 6);
      expect(out.y).toBeCloseTo(L.y, 6);
      expect(out.z).toBeCloseTo(L.z, 6);
    }
  });

  it('View- und Welt-Variante sind dieselbe Drehung: ein gedrehter Rahmen dreht nur das Ergebnis mit', () => {
    const L = sun(10, 70);
    const p = onGlobe(16, 1.1, 2.5);
    const q = new Quaternion().setFromAxisAngle(new Vector3(0.3, 1, -0.2).normalize(), 1.3);
    const world = curvedLightCpu(L, p, 0.4);
    // View-Raum: n̂, up und L mit derselben Drehung (Kameramatrix) abgebildet
    const view = rotateLightCpu(L.clone().applyQuaternion(q), p.clone().applyQuaternion(q), up.clone().applyQuaternion(q), 0.4);
    const back = view.applyQuaternion(q.clone().invert());
    expect(back.x).toBeCloseTo(world.x, 9);
    expect(back.y).toBeCloseTo(world.y, 9);
    expect(back.z).toBeCloseTo(world.z, 9);
  });

  it('setLightCurvature klemmt auf 0 … 1 und lässt fehlende Werte stehen', () => {
    const b0 = earleLight.bands.value;
    const i0 = earleLight.ink.value;
    try {
      setLightCurvature({ bands: 1.7 });
      expect(earleLight.bands.value).toBe(1);
      expect(earleLight.ink.value).toBe(i0);
      setLightCurvature({ ink: -0.2, bands: 0.25 });
      expect(earleLight.ink.value).toBe(0);
      expect(earleLight.bands.value).toBe(0.25);
      setLightCurvature({ bands: Number.NaN });
      expect(earleLight.bands.value).toBe(0.25);
    } finally {
      setLightCurvature({ bands: b0, ink: i0 });
    }
  });
});
