import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three/webgpu';
import { DisplayMapping } from '../display';
import { displayCardCpu, flatCardWarpedCpu } from './billboard';

/**
 * Karten-Bäume im Anzeigeraum (R3, Florians Punkt 13). Geprüft über den CPU-Spiegel derselben Schritte wie im Shader:
 * die Karte steht quer zur echten Richtung zur Kamera (seitlich und am Horizont), `lean` kippt sie in die Bildebene,
 * und die alte Karte (flach gedreht, dann gebogen) zeigte genau die beschriebenen Fehler.
 */
describe('Karten im Anzeigeraum (CPU-Spiegel von displayCard)', () => {
  const R = 32;
  const m = new DisplayMapping(R, 0.14);
  // Hochformat-Kartenkamera (MAP_VIEW_PORTRAIT): 13,5 über und 5 hinter dem Scheitel
  const camera = new Vector3(0, R + 13.5, 5);
  const up = new Vector3(0, 1, 0);
  const flat = (x: number, z: number) => new Vector3(x, R, z);

  /** Flächennormale einer Karte aus drei Ecken. */
  const normalOf = (a: Vector3, b: Vector3, c: Vector3) => new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
  /** |n · Richtung zur Kamera| (1 = Karte zeigt voll zur Kamera, 0 = Strich). */
  const facing = (n: Vector3, base: Vector3) => Math.abs(n.dot(camera.clone().sub(base).normalize()));

  it('quer zur echten Richtung zur Kamera: seitlich und am Horizont, für jede Neigung', () => {
    for (const [x, z] of [
      [0, -30],
      [12, -8],
      [-20, -25],
      [6, 3],
    ] as const) {
      for (const lean of [0, 0.5, 1]) {
        const c = displayCardCpu(m, flat(x, z), up, camera, lean);
        const toward = camera.clone().sub(c.base).normalize();
        expect(Math.abs(c.right.dot(toward)), `(${x}, ${z}) lean ${lean}`).toBeLessThan(1e-3);
        expect(Math.abs(c.right.dot(c.up))).toBeLessThan(1e-3); // 1e-3 · Kameraquerachse (Entartungsschutz)
        expect(c.cardUp.length()).toBeCloseTo(1, 9);
      }
    }
  });

  it('lean 1 legt die Karte in die Bildebene, lean 0 steht sie senkrecht auf der angezeigten Hochachse', () => {
    const f = flat(4, -6);
    const c1 = displayCardCpu(m, f, up, camera, 1);
    const n1 = normalOf(c1.base, c1.at(1, 0), c1.at(0, 1));
    expect(facing(n1, c1.base)).toBeCloseTo(1, 3);
    const c0 = displayCardCpu(m, f, up, camera, 0);
    // senkrecht: die Kartenhochachse ist die gebogene Hochachse (= Kugelnormale am Fuß)
    expect(c0.cardUp.dot(m.toDisplayCpu(f).normalize())).toBeCloseTo(1, 6);
    const c5 = displayCardCpu(m, f, up, camera, 0.5);
    const n0 = normalOf(c0.base, c0.at(1, 0), c0.at(0, 1));
    const n5 = normalOf(c5.base, c5.at(1, 0), c5.at(0, 1));
    expect(facing(n5, c5.base)).toBeGreaterThan(facing(n0, c0.base));
    expect(facing(n1, c1.base)).toBeGreaterThan(facing(n5, c5.base));
  });

  it('die alte Karte (flach zur flachen Kamera gedreht, dann gebogen) drehte sich seitlich von der Kamera weg', () => {
    // seitlich (12 rechts, 8 voraus): die Querachse der alten Karte weicht deutlich von der Senkrechten zur Kamera ab
    const side = flat(12, -8);
    const s0 = flatCardWarpedCpu(m, side, up, camera, 0, 0);
    const sX = flatCardWarpedCpu(m, side, up, camera, 1, 0);
    const oldRight = sX.sub(s0).normalize();
    const toward = camera.clone().sub(s0).normalize();
    expect(Math.abs(oldRight.dot(toward))).toBeGreaterThan(0.005);
    const c = displayCardCpu(m, side, up, camera, 0.5);
    expect(Math.abs(c.right.dot(camera.clone().sub(c.base).normalize()))).toBeLessThan(1e-3);
  });

  it('Kamera genau über dem Fuß: die Querachse der Kamera übernimmt (kein NaN)', () => {
    const f = flat(0, 0);
    const above = new Vector3(0, R + 10, 0);
    const c = displayCardCpu(m, f, up, above, 0.5, new Vector3(1, 0, 0));
    expect(Number.isFinite(c.right.x + c.right.y + c.right.z)).toBe(true);
    expect(c.right.x).toBeCloseTo(1, 6);
  });

  it('ohne Abbildung (Labs ohne Kugel) bleibt die Karte flach', () => {
    const f = new Vector3(3, 0, -4);
    const c = displayCardCpu(null, f, up, new Vector3(0, 9, 4), 0);
    expect(c.base.equals(f)).toBe(true);
    expect(c.up.equals(up)).toBe(true);
  });
});
