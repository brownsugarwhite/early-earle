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

  // Plan 20.10., V0 „ehrliche Tore“: Das S3-Tor verlangte für die einfache Form ohne Kerbe Front und Top ≤ 2 px — verfehlt
  // (heute ≈ 7,7 / 6,4 px; Kritik-Register). Bekannt rot; grün erst mit V4 (Umrisse als Käfigschleifen).
  it.fails('Tor S3: einfache Form aus der Startkugel trifft Front und Top auf 2 px (bekannt rot)', () => {
    const dok = mitStationenVon(s0KoerperDokument('einfach-glatt'), neuesDokument());
    const mittel = messen(dok, { ...GLATTE_HAUT, fuelle: 'mittel' });
    expect(mittel.front).toBeLessThanOrEqual(2);
    expect(mittel.top).toBeLessThanOrEqual(2);
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

  it('Front schrittweise breiter: kein großer Sprung an der Wachstumsgrenze (Plan 20.10., V0)', () => {
    // einfache Form, Ringe eingefroren wie im Editor; die Front wächst in Schritten von 0,6 % (≈ 0,4 px). Mit der harten
    // Grenze × 1,35 sprang der Käfig dabei um bis zu 36 px, mit dem stetigen Übergang bis 14 px (der Rest: Wahl des Rings
    // je Höhe, diskret — kommt mit V4)
    const d0 = s0KoerperDokument('einfach');
    const opt = { ...GLATTE_HAUT, fuelle: 'mittel' as const };
    const stationen = ableiten(d0, opt).gefroren;
    const breiter = (f: number): Dokument => ({
      ...d0,
      profile: { ...d0.profile, front: { ...d0.profile.front, knoten: d0.profile.front.knoten.map((k) => ({ ...k, p: { x: k.p.x * f, y: k.p.y }, ein: { x: k.ein.x * f, y: k.ein.y }, aus: { x: k.aus.x * f, y: k.aus.y } })) } },
    });
    let vorher: Float64Array | null = null;
    let sprung = 0;
    for (let s = 0; s <= 16; s++) {
      const xyz = ableiten(breiter(1.05 + (0.1 * s) / 16), { ...opt, stationen }).kaefig.xyz;
      if (vorher) for (let i = 0; i < xyz.length; i++) sprung = Math.max(sprung, Math.abs(xyz[i]! - vorher[i]!) * 461);
      vorher = xyz;
    }
    expect(sprung).toBeLessThan(20);
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
