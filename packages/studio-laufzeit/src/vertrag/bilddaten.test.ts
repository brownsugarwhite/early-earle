// Daten eines Bilds (Plan 4.6): Platz aus dem Bauplan für mehrere Auswertungen je Bild, Leeren zu Beginn jedes Bilds.
import { describe, expect, it } from 'vitest';
import { type Bauplan, leererBauplan } from './bauplan';
import {
  bildDatenAnlegen, bildDatenLeeren, DECKUNG_FELDER, GEBACKEN_FELDER, KAMERA_FELDER, KREIS_FELDER, RAHMEN_FELDER, STRECKE_FELDER,
  TEIL_FELDER,
} from './bilddaten';
import { KANAELE, type ZeichenModell } from './zeichenmodell';

/** eine Figur mit `teile` gezeichneten Teilen, nach der Feldsatz-Regel aufgeteilt (je KANAELE einer), dazu Uniforms und gebackene Dinge */
function plan(teile: number, uniforms: number, gebacken: number, strecken: number): Bauplan {
  const leer = leererBauplan();
  const zeichen: ZeichenModell = {
    ...leer.zeichen,
    teile: Array.from({ length: teile }, (_, i) => ({
      teil: i, figur: 0, farbe: [0, 0, 0], weiss: false, linie: false, feldsatz: Math.floor(i / KANAELE), kanal: i % KANAELE,
    })),
    feldsaetze: Array.from({ length: Math.ceil(teile / KANAELE) }, (_, f) => ({
      figur: 0, einheit: 100, teile: Array.from({ length: Math.min(KANAELE, teile - f * KANAELE) }, (_, k) => f * KANAELE + k),
    })),
    uniforms: Array.from({ length: uniforms }, (_, i) => ({ name: `u${i}`, quelle: null, fest: i })),
    gebacken: Array.from({ length: gebacken }, (_, i) => ({ ding: i, figur: 1, groesse: 64 })),
  };
  return { ...leer, zeichen, abflach: { ...leer.abflach, streckenZahl: strecken } };
}

describe('bildDatenAnlegen', () => {
  it('Platz für jede Auswertung: Strecken, Teile, Feldsätze, Malreihenfolge, weiche Paare je Feldsatz, Uniforms je Feldsatz', () => {
    const d = bildDatenAnlegen(plan(30, 3, 2, 100), { auswertungen: 2, kreise: 80 });
    expect(d.strecken.length).toBe(2 * 100 * STRECKE_FELDER);
    expect(d.teile.length).toBe(2 * 30 * TEIL_FELDER);
    expect(d.rahmen.length).toBe(2 * 2 * RAHMEN_FELDER);   // 30 Teile: zwei Feldsätze
    expect(d.ordnung.length).toBe(2 * 30);
    expect(d.deckung.length).toBe(2 * ((24 * 23) / 2 + (6 * 5) / 2) * DECKUNG_FELDER);
    expect(d.werte.length).toBe(2 * 2 * 3);
    expect(d.lagen.length).toBe(2 * GEBACKEN_FELDER);
    expect(d.kreise.length).toBe(80 * KREIS_FELDER);
    expect([...d.kamera]).toEqual([1, 0, 0, 0, 0, 0]);
    expect(d.kamera.length).toBe(KAMERA_FELDER);
    expect([d.streckenZahl, d.teilZahl, d.feldsatzZahl, d.deckungZahl, d.kreisZahl]).toEqual([0, 0, 0, 0, 0]);
  });

  it('ohne Angaben eine Auswertung und keine Kreise; ein leerer Bauplan gibt leere Felder', () => {
    const d = bildDatenAnlegen(plan(5, 0, 0, 7));
    expect([d.strecken.length, d.teile.length, d.rahmen.length, d.kreise.length]).toEqual([7 * STRECKE_FELDER, 5 * TEIL_FELDER, RAHMEN_FELDER, 0]);
    const leer = bildDatenAnlegen(leererBauplan());
    expect([leer.strecken.length, leer.teile.length, leer.ordnung.length, leer.deckung.length, leer.werte.length]).toEqual([0, 0, 0, 0, 0]);
  });

  it('wirft bei weniger als einer Auswertung und wenn die Malreihenfolge die Teile nicht fasst (Uint16)', () => {
    expect(() => bildDatenAnlegen(plan(5, 0, 0, 0), { auswertungen: 0 })).toThrow(RangeError);
    expect(() => bildDatenAnlegen(plan(5, 0, 0, 0), { auswertungen: 1.5 })).toThrow(RangeError);
    expect(() => bildDatenAnlegen(plan(1000, 0, 0, 0), { auswertungen: 66 })).toThrow(RangeError);
  });

  it('bildDatenLeeren setzt nur die Zähler zurück', () => {
    const d = bildDatenAnlegen(plan(5, 1, 1, 7), { kreise: 2 });
    d.streckenZahl = 7;
    d.teilZahl = 5;
    d.feldsatzZahl = 1;
    d.deckungZahl = 3;
    d.kreisZahl = 2;
    d.lagen[0] = 4;
    d.kamera[0] = 2;
    bildDatenLeeren(d);
    expect([d.streckenZahl, d.teilZahl, d.feldsatzZahl, d.deckungZahl, d.kreisZahl]).toEqual([0, 0, 0, 0, 0]);
    expect([d.lagen[0], d.kamera[0]]).toEqual([4, 2]);
  });
});
