// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S3-Versuch für die Look-Entscheidung: Fülle der Querschnitte. Ohne
// Schalter bitgleich; die Superellipse-Fülle trifft die Formel; an Florians einfacher Form (aus der Startkugel) holt
// „mittel“ die Front von der Raute (21,9 px) auf ≤ 10 px, ohne Seite oder freie Haut zu verschlechtern; die Kugel bleibt.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../dokument';
import { neuesDokument } from '../dokument';
import { type AbleitOptionen, GLATTE_HAUT, ableiten } from './ableiten';
import { blattAbweichungen } from './abweichung';
import { querschnittFuellen } from './fuelle';
import { feinesNetz, mitStationenVon } from './pruefstand';
import { s0KoerperDokument } from './pruefen/grundkoerper';
import { faltenNachZonenRoehre } from './pruefen/zonen';

function messen(dok: Dokument, o: Partial<AbleitOptionen>) {
  const abl = ableiten(dok, dok.kaefig?.stationen ? { ...o, stationen: dok.kaefig.stationen } : o);
  const { punkte, flaechen } = feinesNetz(abl);
  const ab = blattAbweichungen(punkte, flaechen, dok);
  return { abl, frei: faltenNachZonenRoehre(abl).zonen.frei.max, seite: ab.seite.max, front: ab.front.max, top: ab.top.max };
}

describe('S3-Versuch Fülle', () => {
  it('Superellipse: Höhe bleibt, Breite folgt |w|^p + |s|^p = 1', () => {
    const n = 9;
    const kreis = { v: [] as number[], w: [] as number[], haerte: [] as number[], knoten: [] as number[] };
    for (let j = 0; j < n; j++) {
      const t = (Math.PI * j) / (n - 1);
      kreis.v.push((1 + Math.cos(t)) / 2);
      kreis.w.push(Math.sin(t));
    }
    const voll = querschnittFuellen(kreis, 4);
    for (let j = 0; j < n; j++) {
      const s = 2 * voll.v[j]! - 1;
      expect(voll.v[j]).toBe(kreis.v[j]);
      expect(Math.abs(voll.w[j]! ** 4 + s ** 4 - 1)).toBeLessThan(1e-9);
    }
    expect(querschnittFuellen(kreis, 2)).toBe(kreis);
  });

  it('ohne Schalter oder „rund“ bitgleich', () => {
    const dok = s0KoerperDokument('einfach-glatt');
    const a = ableiten(dok, GLATTE_HAUT);
    const b = ableiten(dok, { ...GLATTE_HAUT, fuelle: 'rund' });
    expect(b.fuelle).toBeUndefined();
    expect(Array.from(b.fein)).toEqual(Array.from(a.fein));
  });

  it('einfache Form aus der Startkugel: Front von der Raute zur Ellipse, Seite und Haut bleiben', () => {
    const dok = mitStationenVon(s0KoerperDokument('einfach-glatt'), neuesDokument());
    const rund = messen(dok, GLATTE_HAUT);
    const mittel = messen(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
    expect(rund.front).toBeGreaterThan(18);
    expect(mittel.front).toBeLessThanOrEqual(10);
    expect(mittel.seite).toBeLessThanOrEqual(rund.seite + 0.5);
    expect(mittel.top).toBeLessThanOrEqual(rund.top + 0.5);
    expect(mittel.frei).toBeLessThanOrEqual(20);
    expect(Math.max(...mittel.abl.fuelle!.exponent)).toBeLessThanOrEqual(4 + 1e-9);
  });

  it('Kugel bleibt (nichts zu füllen)', () => {
    const dok = neuesDokument();
    const rund = messen(dok, GLATTE_HAUT);
    const mittel = messen(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
    expect(Math.abs(mittel.front - rund.front)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(mittel.seite - rund.seite)).toBeLessThanOrEqual(0.5);
    expect(mittel.frei).toBeLessThanOrEqual(rund.frei + 1);
  });
});
