import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { START_RADIUS, bewegeGriff, bewegeKnoten } from '../profil';
import { LOFT_HALBRING, LOFT_STATIONEN, loftNetz } from './loft';

describe('Platzhalter-Loft', () => {
  it('drei Kreise ergeben eine Kugel mit nach außen zeigenden Normalen', () => {
    const n = loftNetz(neuesDokument());
    const r = START_RADIUS;
    let maxFehler = 0;
    let aussen = 0;
    const anzahl = n.positionen.length / 3;
    for (let v = 0; v < anzahl; v++) {
      const x = n.positionen[v * 3]!;
      const y = n.positionen[v * 3 + 1]! - r;
      const z = n.positionen[v * 3 + 2]!;
      const d = Math.hypot(x, y, z);
      maxFehler = Math.max(maxFehler, Math.abs(d - r) / r);
      if (d > 1e-6 && (x * n.normalen[v * 3]! + y * n.normalen[v * 3 + 1]! + z * n.normalen[v * 3 + 2]!) / d > 0.9) aussen++;
    }
    expect(maxFehler).toBeLessThan(0.02);
    expect(aussen / anzahl).toBeGreaterThan(0.97);
  });

  it('hat für jede Form dieselbe Vertexzahl', () => {
    const a = loftNetz(neuesDokument());
    const d = neuesDokument();
    d.profile.seite = bewegeKnoten(d.profile.seite, 1, { x: 0.6, y: 0.4 });
    d.profile.top = bewegeGriff(d.profile.top, 0, 'aus', { x: -0.2, y: 0.08 }, true);
    d.skalierung = 1.7;
    const b = loftNetz(d);
    expect(b.positionen.length).toBe(a.positionen.length);
    expect(b.indizes.length).toBe(a.indizes.length);
    expect(a.positionen.length).toBe((LOFT_STATIONEN + 1) * 2 * LOFT_HALBRING * 3);
    expect(Number.isFinite(b.positionen.reduce((s, x) => s + x, 0))).toBe(true);
  });
});

describe('Platzhalter-Loft: herausgezogener Seitenpunkt', () => {
  it('ergibt eine runde Spitze statt einer flachen Flosse', () => {
    const d = neuesDokument();
    d.profile.seite = bewegeKnoten(d.profile.seite, 1, { x: 0.7, y: 0.27 });
    const n = loftNetz(d);
    let breite = 0;
    for (let v = 0; v < n.positionen.length / 3; v++) {
      const x = n.positionen[v * 3]!;
      if (x > 0.4 && x < 0.55) breite = Math.max(breite, Math.abs(n.positionen[v * 3 + 2]!));
    }
    expect(breite).toBeGreaterThan(0.02);
  });
});
