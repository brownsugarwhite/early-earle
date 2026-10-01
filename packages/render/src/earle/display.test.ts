import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three/webgpu';
import { DisplayMapping } from './display';

/**
 * Anzeige-Abbildung der unendlichen Ebene (ADR 0002): flacher Raum `F = (x − fx, R + h, z − fz)` → Kugel um den Fokus.
 * CPU-Seite (die TSL-Seite ist dieselbe Formel); geprüft: Scheitel, Bogenlänge, Höhe entlang der Normalen, Umkehrung,
 * Begrenzung auf π (keine Umrundung), starre Rahmen.
 */
describe('DisplayMapping (CPU)', () => {
  const R = 32;
  const flat = (x: number, h: number, z: number) => new Vector3(x, R + h, z);

  it('der Fokus liegt am Scheitel, Höhen gehen nach oben', () => {
    const m = new DisplayMapping(R, 0);
    const p = m.toDisplayCpu(flat(0, 0, 0));
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(R, 9);
    expect(p.z).toBeCloseTo(0, 9);
    expect(m.toDisplayCpu(flat(0, 3, 0)).y).toBeCloseTo(R + 3, 9);
  });

  it('abstandstreu: der Bogen vom Scheitel ist der Abstand auf der Ebene (ohne Krümmungs-Boost)', () => {
    const m = new DisplayMapping(R, 0);
    for (const d of [1, 7.5, 20, 45, 90]) {
      const p = m.toDisplayCpu(flat(d * 0.6, 0, -d * 0.8));
      const alpha = Math.atan2(Math.hypot(p.x, p.z), p.y);
      expect(alpha * R).toBeCloseTo(d, 6);
      expect(p.length()).toBeCloseTo(R, 6);
    }
  });

  it('Umkehrung: toFlat(toDisplay(p)) = p, auch mit Krümmungs-Boost und Höhe', () => {
    const m = new DisplayMapping(R, 0.14);
    for (const [x, h, z] of [
      [0, 0, 0],
      [3.5, 1.2, -8],
      [-20, 4.5, 31],
      [60, -0.5, -40],
    ] as const) {
      const back = m.toFlatCpu(m.toDisplayCpu(flat(x, h, z)));
      expect(back.x).toBeCloseTo(x, 5);
      expect(back.y).toBeCloseTo(R + h, 5);
      expect(back.z).toBeCloseTo(z, 5);
    }
  });

  it('weiter als π·R läuft nichts um die Kugel: es bleibt am Gegenpol statt neben dem Scheitel', () => {
    const m = new DisplayMapping(R, 0.14);
    // 2πR voraus hätte die ungebremste Abbildung wieder am Scheitel gelegen (der Riesenbaum in Welt 10)
    const far = m.toDisplayCpu(flat(0, 0, -2 * Math.PI * R));
    expect(far.y).toBeLessThan(0);
    const antipode = m.toDisplayCpu(flat(0, 0, -Math.PI * R * 1.3));
    expect(Math.hypot(antipode.x, antipode.z)).toBeLessThan(1e-6);
    expect(antipode.y).toBeLessThan(-R * 0.5);
  });

  it('starrer Rahmen: dreht die Hochachse auf die Kugelnormale am Ort', () => {
    const m = new DisplayMapping(R, 0);
    const p = flat(12, 0, -9);
    const q = m.rotationAt(p, new Quaternion());
    const up = new Vector3(0, 1, 0).applyQuaternion(q);
    const n = m.toDisplayCpu(p).normalize();
    expect(up.dot(n)).toBeCloseTo(1, 6);
  });
});
