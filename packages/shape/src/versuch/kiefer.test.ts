import { describe, expect, it } from 'vitest';
import type { V3 } from './catmullClark';
import { anwenden, gelenkAus, gelenkBewegung, oeffnungsart, restfehler, starreAnpassung } from './kiefer';
import { achsDrehung, drehe, minus3, plus3 } from './v3';

/** Ein symmetrischer „Unterkiefer“ aus Punkten (Löffelform), Gelenk bei (0.1, 0.3, 0). */
function kiefer(): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i <= 8; i++) {
    for (const z of [-0.06, -0.03, 0, 0.03, 0.06]) {
      const x = -0.25 + (i / 8) * 0.3;
      pts.push([x, 0.28 - 0.05 * Math.sin((i / 8) * Math.PI) - 0.2 * z * z, z]);
    }
  }
  return pts;
}

describe('Versuch Kiefer: Gelenk aus zwei Zuständen', () => {
  it('findet eine bekannte Drehung um ein Gelenk (Achse, Winkel, Lage)', () => {
    const c: V3 = [0.1, 0.3, 0];
    for (const grad of [20, 60, 90, 120]) {
      const R = achsDrehung([0, 0, 1], (grad * Math.PI) / 180);
      const a = kiefer();
      const b = a.map((p) => plus3(drehe(R, minus3(p, c)), c));
      const s = starreAnpassung(a, b);
      const g = gelenkAus(s, [0.1, 0.3, 0]);
      expect(Math.abs((g.w * 180) / Math.PI - grad)).toBeLessThan(0.1);
      expect(Math.abs(Math.abs(g.u[2]) - 1)).toBeLessThan(1e-6);
      expect(Math.hypot(g.c[0] - c[0], g.c[1] - c[1])).toBeLessThan(1e-6);
      expect(restfehler(a, b, s)).toBeLessThan(1e-6);
      expect(oeffnungsart(restfehler(a, b, s))).toBe('kippen');
      // halbe Bewegung = halber Winkel um dasselbe Gelenk
      const halb = gelenkBewegung(g, 0.5);
      const R2 = achsDrehung([0, 0, 1], (grad * Math.PI) / 360);
      const p = a[7]!;
      const soll = plus3(drehe(R2, minus3(p, c)), c);
      const ist = anwenden(halb, p);
      expect(Math.hypot(ist[0] - soll[0], ist[1] - soll[1], ist[2] - soll[2])).toBeLessThan(1e-9);
    }
  });

  it('erkennt Ziehen: Verschieben ohne Drehung bzw. Dehnen', () => {
    const a = kiefer();
    const b = a.map((p) => plus3(p, [0, -0.1, 0]));
    const s = starreAnpassung(a, b);
    expect(gelenkAus(s, [0, 0, 0]).w).toBeLessThan(1e-6);
    // Dehnen: Unterkiefer wird doppelt so lang
    const d = a.map((p) => [p[0] * 2, p[1] - 0.1, p[2]] as V3);
    expect(oeffnungsart(restfehler(a, d, starreAnpassung(a, d)))).not.toBe('kippen');
  });
});
