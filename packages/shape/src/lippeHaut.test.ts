import { describe, expect, it } from 'vitest';
import { lippeAnHaut } from './lippeHaut';
import { abtasten3, linieDurch } from './versuch/linie3d';

// Kugel wie die Startkugel (Mitte 0 | r, Radius r)
const r = 0.265;
const haut = (x: number, y: number) => {
  const q = r * r - x * x - (y - r) * (y - r);
  return q > 0 ? Math.sqrt(q) : null;
};

describe('lippeAnHaut (14.10. nachts): neue Lippenlinie auf der Haut, vorn rund', () => {
  const yR = r - 0.02 * r;
  const xR = -Math.sqrt(r * r - (yR - r) ** 2);
  const roh = linieDurch([
    [xR, yR, 0],
    [xR + 0.5 * r, yR - 0.08 * r, haut(xR + 0.5 * r, yR - 0.08 * r)!],
    [0.3 * r, r - 0.3 * r, haut(0.3 * r, r - 0.3 * r)!],
  ]);
  const l = lippeAnHaut(roh, haut);

  it('Anfang quer zur Spiegelebene: Griff rein in z (gespiegelt glatt, keine Spitze)', () => {
    const a = l.knoten[0]!.aus;
    expect(Math.abs(a[0])).toBeLessThan(1e-12);
    expect(Math.abs(a[1])).toBeLessThan(1e-12);
    expect(a[2]).toBeGreaterThan(0);
    // die alte Vorgabe zeigte schräg nach hinten: von oben ein V
    expect(Math.abs(roh.knoten[0]!.aus[0])).toBeGreaterThan(0.01);
  });

  it('auch zwischen den Knoten auf der Haut (≤ 2 px bei 461 px je Kachel), Seitenlage unverändert', () => {
    let max = 0;
    for (const p of abtasten3(l, 24)) {
      const z = haut(p[0], p[1]);
      if (z === null) continue;
      max = Math.max(max, Math.abs(p[2] - z) * 461);
    }
    expect(max).toBeLessThan(2);
    for (let i = 1; i < l.knoten.length; i++) {
      expect(l.knoten[i]!.p[0]).toBe(roh.knoten[i]!.p[0]);
      expect(l.knoten[i]!.p[1]).toBe(roh.knoten[i]!.p[1]);
      expect(l.knoten[i]!.ein[0]).toBe(roh.knoten[i]!.ein[0]);
    }
  });

  it('glatte Knoten bleiben glatt (Griffe kollinear)', () => {
    const k = l.knoten[1]!;
    const kreuz = [k.ein[1] * k.aus[2] - k.ein[2] * k.aus[1], k.ein[2] * k.aus[0] - k.ein[0] * k.aus[2], k.ein[0] * k.aus[1] - k.ein[1] * k.aus[0]];
    expect(Math.hypot(...kreuz)).toBeLessThan(1e-9);
  });
});
