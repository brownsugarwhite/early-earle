import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseBauplan } from '@ee/creature';
import { ENTWURF_KEY, HIST_LIMIT, STIL_KEY, _resetWesenStore, starteWesenLab, useWesenStore, vorlageBauplan, vorschauOeffnung } from './wesenStore';

/** localStorage-Ersatz für Node. */
function speicher(): Map<string, string> {
  const m = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
  return m;
}

const s = () => useWesenStore.getState();

describe('Wesen-Store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    _resetWesenStore();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('gleicher Regler kurz hintereinander = ein Schritt; Rückgängig stellt den Wert zurück', () => {
    const start = s().bauplan.maul.hoehe;
    s().setzeBauplanWert('maul.hoehe', 0.5);
    s().setzeBauplanWert('maul.hoehe', 0.6);
    s().setzeBauplanWert('maul.hoehe', 0.7);
    expect(s().past).toHaveLength(1);
    s().setzeBauplanWert('maul.form', 0.2);
    expect(s().past).toHaveLength(2);
    s().undo();
    expect(s().bauplan.maul.form).toBe(1);
    expect(s().bauplan.maul.hoehe).toBe(0.7);
    s().undo();
    expect(s().bauplan.maul.hoehe).toBe(start);
    s().redo();
    expect(s().bauplan.maul.hoehe).toBe(0.7);
    expect(s().future).toHaveLength(1);
  });

  it('ein Zug (Geste) bleibt ein Schritt, auch mit Pausen; danach beginnt ein neuer', () => {
    s().beginGeste();
    s().setzeBauplanWert('koerper.hoehe', 1.2);
    vi.advanceTimersByTime(3000);
    s().setzeBauplanWert('koerper.hoehe', 1.4);
    s().endeGeste();
    expect(s().past).toHaveLength(1);
    s().setzeBauplanWert('koerper.hoehe', 1.5);
    expect(s().past).toHaveLength(2);
  });

  it('ohne Geste trennt eine Pause > 1 s die Schritte', () => {
    s().setzeBauplanWert('koerper.hoehe', 1.2);
    vi.advanceTimersByTime(1500);
    s().setzeBauplanWert('koerper.hoehe', 1.3);
    expect(s().past).toHaveLength(2);
  });

  it(`Verlauf hält höchstens ${HIST_LIMIT} Schritte`, () => {
    for (let i = 0; i < HIST_LIMIT + 15; i++) s().setzeBauplanWert(i % 2 ? 'maul.hoehe' : 'maul.form', (i % 10) / 10);
    expect(s().past).toHaveLength(HIST_LIMIT);
  });

  it('ungültige Werte verwirft das Schema (kein Schritt)', () => {
    s().setzeBauplanWert('maul.hoehe', 5);
    expect(s().past).toHaveLength(0);
    expect(s().bauplan.maul.hoehe).toBe(0.45);
  });

  it('Vorlage laden: neue Basis, rückgängig machbar; Zurücksetzen auf die Basis', () => {
    const keil = vorlageBauplan('keil')!;
    s().setzeBauplanWert('maul.hoehe', 0.9);
    s().ladeBauplan(keil, { art: 'vorlage', id: 'keil' });
    expect(s().basis).toBe(keil);
    s().setzeBauplanWert('maul.winkel', 0.1);
    s().zuruecksetzen('maul');
    expect(s().bauplan.maul).toEqual(keil.maul);
    s().undo(); // Zurücksetzen
    s().undo(); // Winkel
    s().undo(); // Laden
    expect(s().quelle).toEqual({ art: 'vorlage', id: 'grundblob' });
    expect(s().bauplan.maul.hoehe).toBe(0.9);
  });

  it('Würfel lässt gesperrte Regler stehen, ein Würfelwurf ist ein Schritt', () => {
    s().schalteSchloss('maul.hoehe');
    const vorher = s().bauplan;
    s().wuerfeln('maul', () => 0.99);
    expect(s().bauplan.maul.hoehe).toBe(vorher.maul.hoehe);
    expect(s().bauplan.maul.form).not.toBe(vorher.maul.form);
    expect(s().past).toHaveLength(1);
    s().schalteSchloss('maul.hoehe');
    expect(s().schloss['maul.hoehe']).toBeUndefined();
  });

  it('Stilwerte im Verlauf wie Bauplanwerte', () => {
    s().setzeStilWert('rim', 0.9);
    s().setzeStilWert('schatten.h', 20);
    expect(s().stil.rim).toBe(0.9);
    expect(s().stil.schatten.h).toBe(20);
    s().undo();
    expect(s().stil.schatten.h).not.toBe(20);
    expect(s().stil.rim).toBe(0.9);
  });

  it('Vorschau-Öffnung folgt der gebauten Öffnung, bis Maul auf/zu sie übernimmt; Laden stellt das zurück', () => {
    expect(vorschauOeffnung(s())).toBe(s().bauplan.maul.oeffnung);
    s().setzeBauplanWert('maul.oeffnung', 0.8);
    expect(vorschauOeffnung(s())).toBe(0.8);
    s().setOffen(0);
    expect(vorschauOeffnung(s())).toBe(0);
    s().ladeBauplan(vorlageBauplan('loch')!, { art: 'vorlage', id: 'loch' });
    expect(vorschauOeffnung(s())).toBe(0.6);
    s().setOffen(1);
    s().offenWieGebaut();
    expect(vorschauOeffnung(s())).toBe(0.6);
  });

  it('Referenzmodus: weißer Grund, Drehen aus; danach kommt der alte Boden zurück', () => {
    s().setBoden('wiese');
    s().setSpin(true);
    s().setAnsicht('referenz');
    expect(s().boden).toBe('weiss');
    expect(s().spin).toBe(false);
    s().setAnsicht('brett');
    expect(s().boden).toBe('wiese');
    s().setAnsicht('held');
    expect(s().ansicht).toBe('held');
    expect(s().past).toHaveLength(0); // Ansichten sind kein Verlaufsschritt
  });

  it('Start: Entwurf und Stil aus dem Browser-Speicher, sichert nach 250 ms', () => {
    const m = speicher();
    const entwurf = parseBauplan({ name: 'Mein Rex', maul: { hoehe: 0.2 } });
    m.set(ENTWURF_KEY, JSON.stringify({ v: 1, bauplan: entwurf, quelle: { art: 'neu', id: 'entwurf' }, schloss: { 'maul.hoehe': true }, tab: 'koerper', at: 1 }));
    m.set(STIL_KEY, JSON.stringify({ rim: 0.8 }));
    starteWesenLab({});
    expect(s().bauplan.name).toBe('Mein Rex');
    expect(s().bauplan.maul.hoehe).toBe(0.2);
    expect(s().schloss).toEqual({ 'maul.hoehe': true });
    expect(s().tab).toBe('koerper');
    expect(s().stil.rim).toBe(0.8);
    s().setzeBauplanWert('maul.hoehe', 0.3);
    vi.advanceTimersByTime(300);
    expect(JSON.parse(m.get(ENTWURF_KEY)!).bauplan.maul.hoehe).toBe(0.3);
  });

  it('Start mit ?vorlage=: Vorlage gewinnt, der Entwurf bleibt per Rückgängig erreichbar', () => {
    const m = speicher();
    m.set(ENTWURF_KEY, JSON.stringify({ v: 1, bauplan: parseBauplan({ name: 'Entwurf' }), at: 1 }));
    starteWesenLab({ vorlage: 'giraffe', ansicht: 'referenz' });
    expect(s().quelle).toEqual({ art: 'vorlage', id: 'giraffe' });
    expect(s().bauplan.hals.laenge).toBe(1.6);
    expect(s().ansicht).toBe('referenz');
    expect(s().boden).toBe('weiss');
    s().undo();
    expect(s().bauplan.name).toBe('Entwurf');
  });

  it('Start mit ?vorlage= ohne Entwurf: kein Verlaufsschritt', () => {
    speicher();
    starteWesenLab({ vorlage: 'schlange', boden: 'weiss' });
    expect(s().bauplan.unterkoerper.typ).toBe('schlange');
    expect(s().past).toHaveLength(0);
    expect(s().boden).toBe('weiss');
  });
});
