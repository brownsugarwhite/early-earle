// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S3 „Umrisse berühren“ (Florian: Fülle mittel). Ohne Option bitgleich; an
// Florians einfacher Form (aus der Startkugel) holt „mittel“ die Front von der Raute (21,9 px) zur Ellipse, ohne Seite,
// Top oder freie Haut zu verschlechtern; die Kugel bleibt; die Vase berührt ihre Front wieder (Breite am eigenen Punkt).
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../dokument';
import { neuesDokument } from '../dokument';
import { type AbleitOptionen, GLATTE_HAUT, ableiten } from './ableiten';
import { blattAbweichungen } from './abweichung';
import { feinesNetz, mitStationenVon } from './pruefstand';
import { s0KoerperDokument } from './pruefen/grundkoerper';
import { faltenNachZonenRoehre } from './pruefen/zonen';

function messen(dok: Dokument, o: Partial<AbleitOptionen>) {
  const abl = ableiten(dok, dok.kaefig?.stationen ? { ...o, stationen: dok.kaefig.stationen } : o);
  const { punkte, flaechen } = feinesNetz(abl);
  const ab = blattAbweichungen(punkte, flaechen, dok);
  return { abl, frei: faltenNachZonenRoehre(abl).zonen.frei.max, seite: ab.seite.max, front: ab.front.max, top: ab.top.max };
}

describe('S3 Umrisse berühren', () => {
  it('ohne Option bitgleich', () => {
    const dok = s0KoerperDokument('einfach-glatt');
    const a = ableiten(dok, GLATTE_HAUT);
    const b = ableiten(dok, { ...GLATTE_HAUT });
    expect(b.rand).toBeUndefined();
    expect(Array.from(b.fein)).toEqual(Array.from(a.fein));
  });

  it('einfache Form aus der Startkugel: Front von der Raute zur Ellipse, Seite, Top und Haut bleiben', () => {
    const dok = mitStationenVon(s0KoerperDokument('einfach-glatt'), neuesDokument());
    const heute = messen(dok, GLATTE_HAUT);
    const mittel = messen(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
    expect(heute.front).toBeGreaterThan(18);
    expect(mittel.front).toBeLessThanOrEqual(10);
    expect(mittel.seite).toBeLessThanOrEqual(heute.seite + 0.5);
    expect(mittel.top).toBeLessThanOrEqual(heute.top + 0.5);
    // hinten verlangt die Zeichnung eine Kante (0,8 breit bei fast 0 Höhe): „mittel“ rundet sie eng (gemessen 21,5–22,8°)
    expect(mittel.frei).toBeLessThanOrEqual(25);
  });

  it('Vase aus der Startkugel berührt ihre Front wieder (Breite am eigenen Punkt der geneigten Ringe)', () => {
    const dok = mitStationenVon(s0KoerperDokument('vase'), neuesDokument());
    const heute = messen(dok, GLATTE_HAUT);
    const mittel = messen(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
    expect(heute.front).toBeGreaterThan(12);
    expect(mittel.front).toBeLessThanOrEqual(4);
    expect(mittel.seite).toBeLessThanOrEqual(heute.seite + 0.5);
    expect(mittel.top).toBeLessThanOrEqual(heute.top + 0.5);
    expect(mittel.frei).toBeLessThanOrEqual(heute.frei + 1);
  });

  it('Kugel bleibt (nichts zu berühren)', () => {
    const dok = neuesDokument();
    const heute = messen(dok, GLATTE_HAUT);
    const mittel = messen(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
    expect(Math.abs(mittel.front - heute.front)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(mittel.seite - heute.seite)).toBeLessThanOrEqual(0.5);
    expect(mittel.frei).toBeLessThanOrEqual(heute.frei + 1);
  });
});
