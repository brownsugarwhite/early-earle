// Ankerzeilen und Glätte-Regel, gemessen an Kurvenpunkten (3.5: je Kurvenstück t = 0, 1/8, …, 1, Anker eingeschlossen). Die Kurven
// rechnet der Test selbst aus den Bernstein-Gewichten, unabhängig vom Code unter Test.
import { cos, gradZuRad, sin } from '@ee/studio-rechnen/winkel';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  alsEcke,
  ankerPunkte,
  ankerZeile,
  ankerZeileAus,
  formPunkte,
  GLAETTE_KURVE,
  GLAETTE_WINKEL,
  glaetteMass,
  glattMachen,
  istGlatt,
  KURVENPUNKT_GEWICHT,
  richtung,
  ueberallGlatt,
  winkelNormal,
} from './anker';
import type { AnkerZeile } from './typen/form';
import type { Punkt } from './typen/grund';

interface AnkerPunkte { p: Punkt; ein: Punkt; aus: Punkt }

/** Kurvenpunkte eines Stücks bei t = 0, 1/8, …, 1 */
function kurvenpunkte(p0: Punkt, c1: Punkt, c2: Punkt, p3: Punkt): Punkt[] {
  const aus: Punkt[] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    const u = 1 - t;
    const b0 = u * u * u;
    const b1 = 3 * u * u * t;
    const b2 = 3 * u * t * t;
    const b3 = t * t * t;
    aus.push([b0 * p0[0] + b1 * c1[0] + b2 * c2[0] + b3 * p3[0], b0 * p0[1] + b1 * c1[1] + b2 * c2[1] + b3 * p3[1]]);
  }
  return aus;
}

/** größte Änderung an Kurvenpunkten der beiden Stücke um den Anker b (vorher a → b, danach b → c), wenn b durch b2 ersetzt wird */
function aenderungAnKurvenpunkten(a: AnkerPunkte, b: AnkerPunkte, b2: AnkerPunkte, c: AnkerPunkte): number {
  const vor1 = kurvenpunkte(a.p, a.aus, b.ein, b.p);
  const vor2 = kurvenpunkte(a.p, a.aus, b2.ein, b2.p);
  const nach1 = kurvenpunkte(b.p, b.aus, c.ein, c.p);
  const nach2 = kurvenpunkte(b2.p, b2.aus, c.ein, c.p);
  let groesste = 0;
  for (let k = 0; k <= 8; k++) {
    groesste = Math.max(groesste, abstand(vor1[k]!, vor2[k]!), abstand(nach1[k]!, nach2[k]!));
  }
  return groesste;
}

function abstand(a: Punkt, b: Punkt): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function punkteVon(z: AnkerZeile): AnkerPunkte {
  const f = new Float64Array(6);
  ankerPunkte(z, f, 0);
  return { p: [f[0]!, f[1]!], ein: [f[2]!, f[3]!], aus: [f[4]!, f[5]!] };
}

/** Punkt in Richtung w (Grad) im Abstand l */
function polar(p: Punkt, w: number, l: number): Punkt {
  const r = gradZuRad(w);
  return [p[0] + l * cos(r), p[1] + l * sin(r)];
}

/** Abweichung von einer Geraden (Grad): Winkel zwischen der umgedrehten Richtung des Ein-Griffs und der des Aus-Griffs */
function abweichung(b: AnkerPunkte): number {
  const ux = b.p[0] - b.ein[0];
  const uy = b.p[1] - b.ein[1];
  const vx = b.aus[0] - b.p[0];
  const vy = b.aus[1] - b.p[1];
  const lu = Math.sqrt(ux * ux + uy * uy);
  const lv = Math.sqrt(vx * vx + vy * vy);
  if (lu === 0 || lv === 0) return 0;
  const cosinus = Math.min(1, Math.max(-1, (ux * vx + uy * vy) / (lu * lv)));
  // Winkel aus dem Kosinus über die Sehne der Einheitsvektoren (ohne acos): 2·asin(s/2); für kleine Winkel genau genug
  const s = Math.sqrt(Math.max(0, 2 - 2 * cosinus));
  return (2 * (s / 2 + (s * s * s) / 48) * 180) / Math.PI;
}

const nachbarVor: AnkerPunkte = { p: [-40, 25], ein: [-60, 30], aus: [-25, 40] };
const nachbarNach: AnkerPunkte = { p: [70, -10], ein: [55, 20], aus: [90, -30] };

const koordinate = fc.double({ min: -500, max: 500, noNaN: true });
const winkelGrad = fc.double({ min: -180, max: 180, noNaN: true });
/** Grifflängen: oft 0, sonst 0,001 bis 300 */
const laenge = fc.oneof(
  { arbitrary: fc.constant(0), weight: 1 },
  { arbitrary: fc.integer({ min: 1, max: 300000 }).map((n) => n / 1000), weight: 4 },
);
/** Drehung eines Griffs aus der Geraden (Grad): oft 0, sonst bis ±0,5° oder bis ±0,001° */
const kleineAbweichung = fc.oneof(
  { arbitrary: fc.constant(0), weight: 1 },
  { arbitrary: fc.integer({ min: -5000, max: 5000 }).map((n) => n / 10000), weight: 3 },
  { arbitrary: fc.integer({ min: -1000, max: 1000 }).map((n) => n / 1e6), weight: 2 },
);

describe('Rückweg Zeile → Punkte', () => {
  it('ohne Glätten: immer eine Ecke mit genau ihren Winkeln, Kurvenpunkte unter 1e-9', () => {
    fc.assert(
      fc.property(koordinate, koordinate, winkelGrad, laenge, winkelGrad, laenge, (x, y, wEin, lEin, wAus, lAus) => {
        const p: Punkt = [x, y];
        const b: AnkerPunkte = { p, ein: polar(p, wEin, lEin), aus: polar(p, wAus, lAus) };
        const z = ankerZeile(b.p, b.ein, b.aus, { glaetten: false });
        if (istGlatt(z)) throw new Error('ohne Glätten eine glatte Zeile');
        const b2 = punkteVon(z);
        expect(b2.p).toEqual(b.p);
        expect(abstand(b2.ein, b.ein)).toBeLessThan(1e-9);
        expect(abstand(b2.aus, b.aus)).toBeLessThan(1e-9);
        expect(aenderungAnKurvenpunkten(nachbarVor, b, b2, nachbarNach)).toBeLessThan(1e-9);
        // Winkel im Bereich (−180, 180], Längen ≥ 0, genau die Längen des Ankers
        expect(z[2] > -180 && z[2] <= 180 && z[4] > -180 && z[4] <= 180).toBe(true);
        expect(z[3]).toBeGreaterThanOrEqual(0);
        expect(z[5]).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 500 },
    );
  });

  it('eine Ecke wiederholt sich: Zeile → Punkte → Zeile ändert die Winkel höchstens um Rundungsreste', () => {
    const z: AnkerZeile = [12.5, -3.25, 135, 20, -60, 7.5];
    const z2 = ankerZeileAus(formPunkte([z]), 0, { glaetten: false });
    expect(z2).toHaveLength(6);
    z.forEach((wert, i) => expect(Math.abs(z2[i]! - wert)).toBeLessThan(1e-12));
  });

  it('glatte Zeile: Ein-Griff in Richtung w + 180°, Aus-Griff in Richtung w', () => {
    const b = punkteVon([10, 20, 90, 5, 8]);
    expect(b.p).toEqual([10, 20]);
    expect(abstand(b.ein, [10, 15])).toBeLessThan(1e-12);
    expect(abstand(b.aus, [10, 28])).toBeLessThan(1e-12);
  });

  it('formPunkte: 6 Zahlen je Anker, ab Stelle 6·a', () => {
    const f = formPunkte([[0, 0, 0, 1, 1], [5, 5, 180, 0, 0, 0]]);
    expect(f).toHaveLength(12);
    expect(Array.from(f.subarray(6))).toEqual([5, 5, 5, 5, 5, 5]);
  });
});

describe('Glätte-Regel an Kurvenpunkten', () => {
  it('die Messstellen t = k/8 geben als größtes Gewicht eines Griffs 225/512', () => {
    let groesstes = 0;
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      groesstes = Math.max(groesstes, 3 * (1 - t) * (1 - t) * t, 3 * (1 - t) * t * t);
    }
    expect(groesstes).toBe(KURVENPUNKT_GEWICHT);
  });

  it('glatt nur bei höchstens 0,2° und 0,0002 an Kurvenpunkten; sonst eine Ecke mit genau ihren Winkeln', () => {
    let glatte = 0;
    let ecken = 0;
    fc.assert(
      fc.property(koordinate, koordinate, winkelGrad, laenge, laenge, kleineAbweichung, kleineAbweichung, (x, y, w, lEin, lAus, dEin, dAus) => {
        const p: Punkt = [x, y];
        const b: AnkerPunkte = { p, ein: polar(p, w + 180 + dEin, lEin), aus: polar(p, w + dAus, lAus) };
        const z = ankerZeile(b.p, b.ein, b.aus);
        const b2 = punkteVon(z);
        const gemessen = aenderungAnKurvenpunkten(nachbarVor, b, b2, nachbarNach);
        const g = glaetteMass(b.p, b.ein, b.aus);
        // Toleranz 1e-11: Rundungsreste der Kurvenpunkte bei Koordinaten bis 800, weit unter der Schwelle 0,0002
        if (istGlatt(z)) {
          glatte++;
          expect(gemessen).toBeLessThanOrEqual(GLAETTE_KURVE + 1e-11);
          expect(abweichung(b)).toBeLessThanOrEqual(GLAETTE_WINKEL + 1e-6);
          // die Regel misst genau, was an den Kurvenpunkten geschieht, unabhängig von den Nachbarn
          expect(Math.abs(gemessen - g.aenderung)).toBeLessThan(1e-11);
          expect(z[3]).toBe(Math.sqrt((b.ein[0] - x) * (b.ein[0] - x) + (b.ein[1] - y) * (b.ein[1] - y)));
        } else {
          ecken++;
          expect(z).toHaveLength(6);
          // glatt gemacht änderte sich ein Kurvenpunkt um mehr als 0,0002, oder die Griffe lägen mehr als 0,2° neben einer Geraden
          const glattGemacht = punkteVon(glattMachen(z));
          const waere = aenderungAnKurvenpunkten(nachbarVor, b, glattGemacht, nachbarNach);
          expect(Math.abs(waere - g.aenderung)).toBeLessThan(1e-9);
          expect(waere > GLAETTE_KURVE - 1e-11 || abweichung(b) > GLAETTE_WINKEL - 1e-6).toBe(true);
          expect(aenderungAnKurvenpunkten(nachbarVor, b, b2, nachbarNach)).toBeLessThan(1e-9);
        }
      }),
      { numRuns: 2000 },
    );
    // beide Ausgänge kommen vor
    expect(glatte).toBeGreaterThan(50);
    expect(ecken).toBeGreaterThan(50);
  });

  it('genau auf einer Geraden: glatt mit genauer Richtung und Länge', () => {
    expect(ankerZeile([10, 10], [-90, 10], [60, 10])).toEqual([10, 10, 0, 100, 50]);
    expect(ankerZeile([0, 0], [0, -4], [0, 30])).toEqual([0, 0, 90, 4, 30]);
    // nach links: 180°, nie −180°
    expect(ankerZeile([0, 0], [40, 0], [-40, 0])).toEqual([0, 0, 180, 40, 40]);
    expect(ankerZeile([0, 0], [40, -0], [-40, -0])).toEqual([0, 0, 180, 40, 40]);
  });

  it('kurze Griffe dürfen mehr Winkel haben als lange: 0,1° bei Länge 0,4 glatt, bei Länge 10 eine Ecke; 0,3° nie', () => {
    const p: Punkt = [0, 0];
    expect(ankerZeile(p, polar(p, 180.05, 0.4), polar(p, -0.05, 0.4))).toHaveLength(5);
    expect(ankerZeile(p, polar(p, 180.05, 10), polar(p, -0.05, 10))).toHaveLength(6);
    expect(ankerZeile(p, polar(p, 180.15, 0.01), polar(p, -0.15, 0.01))).toHaveLength(6);
    const g = glaetteMass(p, polar(p, 180.15, 0.01), polar(p, -0.15, 0.01));
    expect(g.winkel).toBeCloseTo(0.3, 9);
    expect(g.aenderung).toBeLessThan(GLAETTE_KURVE);
    expect(g.glatt).toBe(false);
  });

  it('abschaltbar: ohne Glätten bleibt auch ein genau glatter Anker eine Ecke mit wEin = w + 180°', () => {
    expect(ankerZeile([10, 10], [-90, 10], [60, 10], { glaetten: false })).toEqual([10, 10, 180, 100, 0, 50]);
  });

  it('Griffe der Länge 0: glatt in Richtung des anderen; als Ecke auf der Geraden des Gegengriffs', () => {
    expect(ankerZeile([1, 1], [1, 1], [1, 5])).toEqual([1, 1, 90, 0, 4]);
    expect(ankerZeile([1, 1], [1, 5], [1, 1])).toEqual([1, 1, -90, 4, 0]);
    expect(ankerZeile([1, 1], [1, 1], [1, 5], { glaetten: false })).toEqual([1, 1, -90, 0, 90, 4]);
    expect(ankerZeile([1, 1], [1, 5], [1, 1], { glaetten: false })).toEqual([1, 1, 90, 4, -90, 0]);
    expect(ankerZeile([1, 1], [1, 1], [1, 1])).toEqual([1, 1, 0, 0, 0]);
    expect(ankerZeile([1, 1], [1, 1], [1, 1], { glaetten: false })).toEqual([1, 1, 180, 0, 0, 0]);
    // beide zeigen zum Anker zurück
    for (const z of [ankerZeile([1, 1], [1, 1], [1, 5]), ankerZeile([1, 1], [1, 1], [1, 5], { glaetten: false })]) {
      const b = punkteVon(z);
      expect(b.ein).toEqual([1, 1]);
      expect(abstand(b.aus, [1, 5])).toBeLessThan(1e-12);
    }
  });

  it('eine Spitze (beide Griffe in dieselbe Richtung) wird nie glatt', () => {
    const g = glaetteMass([0, 0], [3, 4], [3, 4]);
    expect(g.glatt).toBe(false);
    expect(g.winkel).toBe(180);
    expect(ankerZeile([0, 0], [3, 4], [3, 4])).toHaveLength(6);
  });

  it('ungültige Zahlen sind ein Fehler', () => {
    expect(() => ankerZeile([Number.NaN, 0], [0, 0], [1, 0])).toThrow(RangeError);
    expect(() => ankerZeile([0, 0], [Number.POSITIVE_INFINITY, 0], [1, 0], { glaetten: false })).toThrow(RangeError);
  });
});

describe('glatte und Ecken-Zeilen (3.2)', () => {
  it('alsEcke: wEin = w + 180°, im Bereich (−180, 180]', () => {
    expect(alsEcke([0, 0, 30, 2, 3])).toEqual([0, 0, -150, 2, 30, 3]);
    expect(alsEcke([0, 0, 0, 2, 3])).toEqual([0, 0, 180, 2, 0, 3]);
    expect(alsEcke([0, 0, -90, 2, 3])).toEqual([0, 0, 90, 2, -90, 3]);
    const ecke: AnkerZeile = [1, 2, 3, 4, 5, 6];
    expect(alsEcke(ecke)).toEqual(ecke);
    expect(alsEcke(ecke)).not.toBe(ecke);
  });

  it('alsEcke ändert keinen Kurvenpunkt', () => {
    fc.assert(
      fc.property(koordinate, koordinate, winkelGrad, laenge, laenge, (x, y, w, lEin, lAus) => {
        const z: AnkerZeile = [x, y, winkelNormal(w), lEin, lAus];
        const b = punkteVon(z);
        const b2 = punkteVon(alsEcke(z));
        expect(aenderungAnKurvenpunkten(nachbarVor, b, b2, nachbarNach)).toBeLessThan(1e-9);
      }),
    );
  });

  it('glattMachen (⇧C): Richtung vom Ein-Griff zum Aus-Griff, Längen bleiben, ohne Schwelle', () => {
    // gleich lange Griffe: die Mitte der beiden Richtungen (0° und 10°)
    const gleich = glattMachen([0, 0, 180, 2, 10, 2]);
    expect([gleich[0], gleich[1], gleich[3], gleich[4]]).toEqual([0, 0, 2, 2]);
    expect(gleich[2]).toBeCloseTo(5, 12);
    // längengewichtet: die Richtung des längeren Griffs zählt mehr
    const ungleich = glattMachen([0, 0, 180, 1, 30, 3]);
    expect(ungleich[2]).toBeGreaterThan(15);
    expect(ungleich[2]).toBeLessThan(30);
    expect(glattMachen([0, 0, 45, 0, 0, 0])).toEqual([0, 0, 0, 0, 0]);
    const einGriff = glattMachen([0, 0, 45, 0, 10, 3]);
    expect([einGriff[0], einGriff[1], einGriff[3], einGriff[4]]).toEqual([0, 0, 0, 3]);
    expect(einGriff[2]).toBeCloseTo(10, 12);
    const schon: AnkerZeile = [1, 2, 3, 4, 5];
    expect(glattMachen(schon)).toEqual(schon);
  });

  it('glatt im Bauplan nur, wenn alle Zeilen glatt sind', () => {
    expect(ueberallGlatt([[0, 0, 0, 1, 1], [1, 1, 10, 1, 1]])).toBe(true);
    expect(ueberallGlatt([[0, 0, 0, 1, 1], [1, 1, 180, 1, 0, 1]])).toBe(false);
    expect(ueberallGlatt([])).toBe(true);
  });

  it('winkelNormal und richtung: Bereich (−180, 180], Werte darin bitgleich', () => {
    expect(winkelNormal(180)).toBe(180);
    expect(winkelNormal(-180)).toBe(180);
    expect(winkelNormal(540)).toBe(180);
    expect(winkelNormal(-540)).toBe(180);
    expect(winkelNormal(190)).toBe(-170);
    expect(winkelNormal(-190)).toBe(170);
    expect(Object.is(winkelNormal(-0), 0)).toBe(true);
    for (const w of [0.1, -179.99999999999997, 179.99999999999997, 33.3333]) expect(winkelNormal(w)).toBe(w);
    expect(richtung(-1, 0)).toBe(180);
    expect(richtung(-1, -0)).toBe(180);
    expect(richtung(0, 0)).toBe(0);
    fc.assert(
      fc.property(fc.double({ min: -1e6, max: 1e6, noNaN: true }), (w) => {
        const r = winkelNormal(w);
        return r > -180 && r <= 180;
      }),
    );
  });
});
