// Plan 20.10., V3: Tore der Abbildung von G/S/R (Blätter) — S 2,0 und R 90° exakt, glatte Griffe auf einer Geraden,
// Gewicht 0 bitgleich, Abfall wie Blender, Mitte auf der Spiegelachse, „nur verbunden“ längs der Kurve.
import { describe, expect, it } from 'vitest';
import { type Profil, START_RADIUS, achsenRegeln, startHalbkreis, startKreis, verschiebeKnoten } from '@ee/shape';
import { abbildungAus, abfallGewicht, auswahlMitte, aufGerade, freiImBlatt, gewichte, knotenAbbilden, kurvenAbbilden, skalierFaktor, winkelSchritt, zahlLesen, zahlTaste } from './abbildung';

const kreis = startKreis({ x: 0.03, y: 0.3 }, START_RADIUS, 6);
const alle = (pr: Profil) => new Set(pr.knoten.map((_, i) => i));
const AUS = { an: false, abfall: 'glatt', radius: 0.2, verbunden: false } as const;
const kreuz = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x * b.y - a.y * b.x;

describe('V3: Abbildung von G/S/R im Blatt', () => {
  it('S 2,0 um die Mitte skaliert Knoten und Griffe exakt', () => {
    const c = auswahlMitte(kreis.knoten.map((k) => k.p), null);
    const a = abbildungAus({ art: 's', c, frei: { u: true, v: true }, faktor: 2 });
    const [neu] = kurvenAbbilden(a, [kreis.knoten], gewichte([{ knoten: kreis.knoten, geschlossen: true, gewaehlt: alle(kreis) }], AUS));
    neu!.forEach((k, i) => {
      const alt = kreis.knoten[i]!;
      expect(Math.abs(k.p.x - (c.x + 2 * (alt.p.x - c.x)))).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(k.p.y - (c.y + 2 * (alt.p.y - c.y)))).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(k.aus.x - 2 * alt.aus.x) + Math.abs(k.aus.y - 2 * alt.aus.y)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(k.ein.x - 2 * alt.ein.x) + Math.abs(k.ein.y - 2 * alt.ein.y)).toBeLessThanOrEqual(1e-9);
    });
  });

  it('R 90° dreht exakt (Vielfache von 90° ohne Rundungsfehler)', () => {
    const c = { x: 0.01, y: 0.27 };
    const a = abbildungAus({ art: 'r', c, frei: { u: true, v: true }, winkel: (90 * Math.PI) / 180 });
    const [neu] = kurvenAbbilden(a, [kreis.knoten], gewichte([{ knoten: kreis.knoten, geschlossen: true, gewaehlt: alle(kreis) }], AUS));
    neu!.forEach((k, i) => {
      const alt = kreis.knoten[i]!;
      // (dx, dy) → (−dy, dx)
      expect(k.p.x).toBe(c.x - (alt.p.y - c.y));
      expect(k.p.y).toBe(c.y + (alt.p.x - c.x));
      expect(k.aus.x).toBe(-alt.aus.y);
      expect(k.aus.y).toBe(alt.aus.x);
    });
  });

  it('G verschiebt wie das Ziehen mit der Maus (bitgleich mit verschiebeKnoten)', () => {
    const d = { x: 0.0123, y: -0.0456 };
    const sel = new Set([1, 2]);
    const a = abbildungAus({ art: 'g', c: { x: 0, y: 0 }, frei: { u: true, v: true }, versatz: d });
    const [neu] = kurvenAbbilden(a, [kreis.knoten], gewichte([{ knoten: kreis.knoten, geschlossen: true, gewaehlt: sel }], AUS));
    expect(JSON.stringify({ ...kreis, knoten: neu })).toBe(JSON.stringify(verschiebeKnoten(kreis, [1, 2], d)));
    // Knoten ohne Gewicht bleiben dieselben Objekte
    expect(neu![0]).toBe(kreis.knoten[0]);
  });

  it('glatte Griffe bleiben auf einer Geraden: S nur in einer Richtung, R und G mit proportionalem Abfall', () => {
    const sel = new Set([0]);
    const prop = { an: true, abfall: 'glatt', radius: 0.4, verbunden: false } as const;
    const g = gewichte([{ knoten: kreis.knoten, geschlossen: true, gewaehlt: sel }], prop);
    // Nachbarn haben Zwischengewichte, Knoten und Spitzen verschieden
    expect(g[0]![1]!.p).toBeGreaterThan(0);
    expect(g[0]![1]!.p).toBeLessThan(1);
    expect(g[0]![1]!.ein).not.toBe(g[0]![1]!.aus);
    const c = { x: 0.03, y: 0.3 };
    for (const a of [
      abbildungAus({ art: 's', c, frei: { u: true, v: false }, faktor: 1.7 }),
      abbildungAus({ art: 'r', c, frei: { u: true, v: true }, winkel: 0.83 }),
      abbildungAus({ art: 'g', c, frei: { u: true, v: true }, versatz: { x: 0.05, y: 0.11 } }),
    ]) {
      const [neu] = kurvenAbbilden(a, [kreis.knoten], g);
      for (const k of neu!) {
        const le = Math.hypot(k.ein.x, k.ein.y);
        const la = Math.hypot(k.aus.x, k.aus.y);
        expect(Math.abs(kreuz(k.ein, k.aus)) / (le * la), `${a.art}`).toBeLessThanOrEqual(1e-9);
        expect(k.ein.x * k.aus.x + k.ein.y * k.aus.y).toBeLessThan(0);
      }
    }
    // S nur waagerecht skaliert die Griffe ohne proportional exakt (gewählte Knoten starr)
    const a = abbildungAus({ art: 's', c, frei: { u: true, v: false }, faktor: 1.7 });
    const [starr] = kurvenAbbilden(a, [kreis.knoten], gewichte([{ knoten: kreis.knoten, geschlossen: true, gewaehlt: alle(kreis) }], AUS));
    starr!.forEach((k, i) => {
      expect(k.aus.x).toBe(1.7 * kreis.knoten[i]!.aus.x);
      expect(k.aus.y).toBe(kreis.knoten[i]!.aus.y);
    });
  });

  it('aufGerade: liegt schon auf einer Geraden → unverändert; sonst gemeinsame Richtung, Längen bleiben', () => {
    const e = { x: -0.1, y: 0 };
    const a = { x: 0.3, y: 0 };
    const [e1, a1] = aufGerade(e, a);
    expect(e1).toBe(e);
    expect(a1).toBe(a);
    const [e2, a2] = aufGerade({ x: -0.1, y: 0.02 }, { x: 0.2, y: 0.05 });
    expect(Math.abs(kreuz(e2, a2))).toBeLessThanOrEqual(1e-15);
    expect(Math.hypot(e2.x, e2.y)).toBeCloseTo(Math.hypot(-0.1, 0.02), 12);
    expect(Math.hypot(a2.x, a2.y)).toBeCloseTo(Math.hypot(0.2, 0.05), 12);
  });

  it('Abfall wie Blender (s = 1 − d/r)', () => {
    const s = 0.5;
    expect(abfallGewicht('glatt', 0.5, 1)).toBeCloseTo(3 * s * s - 2 * s * s * s, 15);
    expect(abfallGewicht('kugel', 0.5, 1)).toBeCloseTo(Math.sqrt(2 * s - s * s), 15);
    expect(abfallGewicht('wurzel', 0.5, 1)).toBeCloseTo(Math.sqrt(s), 15);
    expect(abfallGewicht('spitz', 0.5, 1)).toBeCloseTo(s * s, 15);
    expect(abfallGewicht('linear', 0.5, 1)).toBeCloseTo(s, 15);
    expect(abfallGewicht('konstant', 0.5, 1)).toBe(1);
    expect(abfallGewicht('glatt', 0, 1)).toBe(1);
    expect(abfallGewicht('glatt', 1, 1)).toBe(0);
    expect(abfallGewicht('konstant', 1.2, 1)).toBe(0);
  });

  it('Mitte: Rahmen der Auswahl; berührt sie die Spiegelachse eines halben Umrisses, liegt sie auf der Achse', () => {
    const front = startHalbkreis({ x: 0, y: 0.3 }, 0.2, 'senkrecht', 4);
    const punkte = front.knoten.map((k) => k.p);
    const c = auswahlMitte(punkte, 'x');
    expect(c.x).toBe(0);
    expect(c.y).toBeCloseTo(0.3, 12);
    // S 2 um die Achsenmitte: Achsknoten bleiben auf der Achse, die Form wächst symmetrisch exakt
    const a = abbildungAus({ art: 's', c, frei: { u: true, v: true }, faktor: 2 });
    const [neu] = kurvenAbbilden(a, [front.knoten], gewichte([{ knoten: front.knoten, geschlossen: false, gewaehlt: alle(front) }], AUS));
    const pr = achsenRegeln({ ...front, knoten: neu! });
    pr.knoten.forEach((k, i) => {
      expect(k.p.x).toBe(2 * front.knoten[i]!.p.x);
      expect(Math.abs(k.p.y - (c.y + 2 * (front.knoten[i]!.p.y - c.y)))).toBeLessThanOrEqual(1e-12);
    });
  });

  it('„nur verbunden“: Abstand längs der Kurve — ein naher, aber auf der Kurve ferner Knoten bleibt', () => {
    // Haarnadel: zwei Arme nah beieinander (Hals und Brust), verbunden erst am Ende
    const pr = achsenRegeln({
      art: 'halb',
      achse: 'senkrecht',
      knoten: [
        { p: { x: 0, y: 1 }, ein: { x: 0, y: 0 }, aus: { x: 0.05, y: 0 }, art: 'glatt' },
        { p: { x: 0.1, y: 0.9 }, ein: { x: 0, y: 0.03 }, aus: { x: 0, y: -0.03 }, art: 'glatt' },
        { p: { x: 0.1, y: 0.2 }, ein: { x: 0, y: 0.03 }, aus: { x: 0.03, y: 0 }, art: 'glatt' },
        { p: { x: 0.18, y: 0.2 }, ein: { x: -0.03, y: 0 }, aus: { x: 0, y: 0.03 }, art: 'glatt' },
        { p: { x: 0.18, y: 0.85 }, ein: { x: 0, y: -0.03 }, aus: { x: 0, y: 0.03 }, art: 'glatt' },
        { p: { x: 0, y: 1.2 }, ein: { x: 0.05, y: 0 }, aus: { x: 0, y: 0 }, art: 'glatt' },
      ],
    });
    const kurve = { knoten: pr.knoten, geschlossen: false, gewaehlt: new Set([1]) };
    const luft = gewichte([kurve], { an: true, abfall: 'glatt', radius: 0.15, verbunden: false });
    const verbunden = gewichte([kurve], { an: true, abfall: 'glatt', radius: 0.15, verbunden: true });
    // Knoten 4 liegt 0,09 neben Knoten 1, aber weit weg längs der Kurve
    expect(luft[0]![4]!.p).toBeGreaterThan(0.2);
    expect(verbunden[0]![4]!.p).toBe(0);
    // Knoten 0 ist längs der Kurve nah (0,14 über die Griffe)
    expect(verbunden[0]![0]!.p).toBeGreaterThan(0);
    // Gewicht 0 → dasselbe Objekt
    const a = abbildungAus({ art: 'g', c: { x: 0, y: 0 }, frei: { u: true, v: true }, versatz: { x: 0.01, y: 0 } });
    expect(knotenAbbilden(a, pr.knoten[4]!, verbunden[0]![4]!)).toBe(pr.knoten[4]);
  });

  it('Achsen im Blatt: X/Y/Z, ⇧ = alles außer, quer zum Blatt = null', () => {
    expect(freiImBlatt('seite', { achse: 'x', ohne: false })).toEqual({ u: true, v: false });
    expect(freiImBlatt('seite', { achse: 'z', ohne: false })).toBeNull();
    expect(freiImBlatt('seite', { achse: 'z', ohne: true })).toEqual({ u: true, v: true });
    expect(freiImBlatt('front', { achse: 'z', ohne: false })).toEqual({ u: true, v: false });
    expect(freiImBlatt('front', { achse: 'x', ohne: false })).toBeNull();
    expect(freiImBlatt('front', { achse: 'y', ohne: true })).toEqual({ u: true, v: false });
    expect(freiImBlatt('top', { achse: 'z', ohne: false })).toEqual({ u: false, v: true });
    expect(freiImBlatt('top', { achse: 'y', ohne: false })).toBeNull();
  });

  it('Zeigerwerte und Zahlen', () => {
    const c = { x: 0, y: 0 };
    expect(skalierFaktor(c, { x: 1, y: 0 }, { x: 0, y: 2.5 })).toBe(2.5);
    expect(winkelSchritt(c, { x: -1, y: 0.01 }, { x: -1, y: -0.01 })).toBeCloseTo(0.02, 3);
    expect(zahlLesen('2,5')).toBe(2.5);
    expect(zahlLesen('-90')).toBe(-90);
    expect(zahlLesen('-')).toBeNaN();
    expect(zahlLesen('')).toBeNaN();
    let t = '';
    for (const k of ['1', ',', '5', '-', '.', 'Backspace']) t = zahlTaste(t, k) ?? t;
    expect(t).toBe('-1.');
    expect(zahlTaste('', 'x')).toBeNull();
    expect(zahlTaste('', ',')).toBe('0.');
  });
});
