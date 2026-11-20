// Attrappe der Welt (Plan 4.5, 5.3): jede Funktion von `WeltAdapter` mit prüfbarem Verhalten. Dieselben Fälle prüft M2.1 gegen Box2D;
// darum fragen die Tests nur, was der Vertrag in vertrag/welt.ts festlegt, mit Toleranzen für eine weiche Lösung.
import { describe, expect, it } from 'vitest';
import type { Punkt } from '@ee/studio-format/typen/grund';
import {
  BEIN_FELDER, KONTAKT_FELDER, STRAHL_FELDER, VIELECK_PUNKTE, ZONE_FELDER, type StoffWerte, type WeltAdapter, type WeltPuffer,
} from './welt';
import { WeltAttrappe } from './weltAttrappe';

const TAKT = 1 / 60;
const STOFF: StoffWerte = { haftung: 0.6, abprall: 0, rollwiderstand: 0, dichte: 1 };
const FEDER = { f: 3, zeta: 1 };

function puffer(koerper = 16): WeltPuffer {
  return {
    lagen: new Float64Array(3 * koerper), tempi: new Float64Array(3 * koerper), kontakte: new Float64Array(KONTAKT_FELDER * 64),
    kontaktZahl: 0, zonen: new Int32Array(ZONE_FELDER * 64), zonenZahl: 0, beine: new Float64Array(BEIN_FELDER * 16), beinZahl: 0,
  };
}

/** n Takte zu je 4 Teilschritten; `vorher` gibt die Eingaben eines Takts */
function takte(w: WeltAdapter, n: number, vorher?: (i: number) => void): void {
  for (let i = 0; i < n; i++) {
    vorher?.(i);
    w.schritt(TAKT, 4);
  }
}

function lage(w: WeltAdapter, k: number): { x: number; y: number; w: number; vx: number; vy: number; om: number } {
  const p = puffer(64);
  w.lesen(p);
  return { x: p.lagen[3 * k]!, y: p.lagen[3 * k + 1]!, w: p.lagen[3 * k + 2]!, vx: p.tempi[3 * k]!, vy: p.tempi[3 * k + 1]!, om: p.tempi[3 * k + 2]! };
}

/** Kontakteinträge des letzten Schritts als Objekte */
function kontakte(w: WeltAdapter): { a: number; b: number; ha: number; hb: number; x: number; y: number; nx: number; ny: number; tempo: number; impuls: number; art: number }[] {
  const p = puffer();
  w.lesen(p);
  const aus = [];
  for (let i = 0; i < p.kontaktZahl; i++) {
    const k = p.kontakte.subarray(i * KONTAKT_FELDER, (i + 1) * KONTAKT_FELDER);
    aus.push({ a: k[0]!, b: k[1]!, ha: k[2]!, hb: k[3]!, x: k[4]!, y: k[5]!, nx: k[6]!, ny: k[7]!, tempo: k[8]!, impuls: k[9]!, art: k[10]! });
  }
  return aus;
}

function zonen(w: WeltAdapter): [zone: number, koerper: number, art: number][] {
  const p = puffer();
  w.lesen(p);
  const aus: [number, number, number][] = [];
  for (let i = 0; i < p.zonenZahl; i++) aus.push([p.zonen[3 * i]!, p.zonen[3 * i + 1]!, p.zonen[3 * i + 2]!]);
  return aus;
}

function beine(w: WeltAdapter): { traf: number; abstand: number; kraft: number; koerper: number; x: number; y: number }[] {
  const p = puffer();
  w.lesen(p);
  const aus = [];
  for (let i = 0; i < (p.beinZahl ?? 0); i++) {
    const b = p.beine!.subarray(i * BEIN_FELDER, (i + 1) * BEIN_FELDER);
    aus.push({ traf: b[0]!, abstand: b[1]!, kraft: b[2]!, koerper: b[3]!, x: b[4]!, y: b[5]! });
  }
  return aus;
}

/** Boden: feste Kette waagrecht bei y (y zeigt nach unten) */
function boden(w: WeltAdapter, y: number): number {
  const k = w.koerper('fest', { x: 0, y: 0, w: 0 });
  w.huelle(k, { kette: { punkte: [[-20, y], [20, y]], schleife: false } }, STOFF);
  return k;
}

function kugel(w: WeltAdapter, x: number, y: number, r: number, stoff: StoffWerte = STOFF, schnell = false): number {
  const k = w.koerper('beweglich', { x, y, w: 0 });
  w.huelle(k, { kreis: { mitte: [0, 0], r } }, stoff, schnell);
  return k;
}

/** dem Körper einen Stoß geben (Kräftepaar gegen einen festen Körper für einen Takt) */
function stossen(w: WeltAdapter, k: number, fest: number, punkt: Punkt, impuls: Punkt): void {
  w.kraftpaar(k, fest, punkt, [impuls[0] / TAKT, impuls[1] / TAKT]);
  w.schritt(TAKT, 4);
}

describe('fallen', () => {
  it('ein Körper fällt mit der Schwerkraft (Teilschritte wie halbimplizites Euler-Verfahren)', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const k = kugel(w, 0, 0, 0.25);
    takte(w, 60);
    const l = lage(w, k);
    // 240 Teilschritte zu h = 1/240: v = 240·h·g, y = h²·g·240·241/2
    expect(l.vy).toBeCloseTo(10, 9);
    expect(l.y).toBeCloseTo((10 * 241) / (2 * 240), 9);
    expect(l.x).toBe(0);
    expect(l.w).toBe(0);
  });

  it('Kreis landet auf einer Kette und ruht; der Kontakt beginnt, dauert an und trägt das Gewicht', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const b = boden(w, 2);
    const k = kugel(w, 0, 0, 0.25);
    const arten: number[] = [];
    let beginn = -1;
    takte(w, 180, () => {
      const ks = kontakte(w);
      for (const c of ks) {
        arten.push(c.art);
        if (c.art === 1) beginn = c.tempo;
      }
    });
    const l = lage(w, k);
    expect(l.y).toBeGreaterThan(2 - 0.25 - 0.01);
    expect(l.y).toBeLessThan(2 - 0.25 + 0.001);
    expect(Math.abs(l.vy)).toBeLessThan(1e-3);
    expect(arten[0]).toBe(1);
    expect(arten.slice(1).every((a) => a === 0)).toBe(true);
    // Aufprall nach rund 1,75 L Fall: Annäherungstempo ≈ √(2 · g · 1,75) ≈ 5,9 L/s
    expect(beginn).toBeGreaterThan(5);
    expect(beginn).toBeLessThan(6.5);
    const [c] = kontakte(w);
    expect(c).toMatchObject({ a: b, b: k, ha: 0, hb: 1, art: 0 });
    expect(c!.nx).toBeCloseTo(0, 6);
    expect(c!.ny).toBeCloseTo(-1, 6);   // von der Kette (A) zur Kugel (B), nach oben
    expect(c!.y).toBeCloseTo(2, 2);
    // Normalimpuls eines Takts trägt das Gewicht: m · g · dt
    const m = Math.PI * 0.25 * 0.25;
    expect(c!.impuls).toBeCloseTo(m * 10 * TAKT, 4);
  });

  it('liegende Kapsel und Vieleck ruhen gerade auf einem Vieleck', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const g = w.koerper('fest', { x: 0, y: 0, w: 0 });
    w.huelle(g, { vieleck: { punkte: [[-10, 2], [10, 2], [10, 3], [-10, 3]], rundung: 0 } }, STOFF);
    const kap = w.koerper('beweglich', { x: -3, y: 0, w: 0 });
    w.huelle(kap, { kapsel: { a: [-0.5, 0], b: [0.5, 0], r: 0.2 } }, STOFF);
    const kiste = w.koerper('beweglich', { x: 3, y: 0, w: 0 });
    w.huelle(kiste, { vieleck: { punkte: [[-0.3, -0.2], [0.3, -0.2], [0.3, 0.2], [-0.3, 0.2]], rundung: 0 } }, STOFF);
    takte(w, 240);
    const a = lage(w, kap), b = lage(w, kiste);
    expect(a.y).toBeCloseTo(2 - 0.2, 2);
    expect(Math.abs(a.w)).toBeLessThan(0.5);
    expect(Math.abs(a.vy)).toBeLessThan(1e-3);
    expect(b.y).toBeCloseTo(2 - 0.2, 2);
    expect(Math.abs(b.w)).toBeLessThan(0.5);
    expect(Math.abs(b.vy)).toBeLessThan(1e-3);
    expect(a.x).toBe(-3);
    expect(Math.abs(b.x - 3)).toBeLessThan(1e-9);
  });

  it('Abprall: eine Kugel mit Abprall 0,5 springt auf rund ein Viertel der Fallhöhe', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    boden(w, 4);
    const k = kugel(w, 0, 0, 0.25, { ...STOFF, abprall: 0.5 });
    let aufgeprallt = false, hoechst = Infinity;
    takte(w, 240, () => {
      const l = lage(w, k);
      if (l.vy < 0) aufgeprallt = true;
      if (aufgeprallt) hoechst = Math.min(hoechst, l.y);
    });
    const fall = 4 - 0.25, steigen = 4 - 0.25 - hoechst;
    expect(aufgeprallt).toBe(true);
    expect(steigen / fall).toBeGreaterThan(0.18);
    expect(steigen / fall).toBeLessThan(0.32);
  });

  it('Masse aus den Hüllen (Kreis, Kapsel, Vieleck) und von Hand', () => {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const fest = w.koerper('fest', { x: 0, y: 0, w: 0 });
    const kreis = kugel(w, 0, 10, 0.5, { ...STOFF, dichte: 2 });
    const kapsel = w.koerper('beweglich', { x: 0, y: 20, w: 0 });
    w.huelle(kapsel, { kapsel: { a: [-1, 0], b: [1, 0], r: 0.5 } }, STOFF);
    const kiste = w.koerper('beweglich', { x: 0, y: 30, w: 0 });
    w.huelle(kiste, { vieleck: { punkte: [[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]], rundung: 0 } }, STOFF);
    const hand = w.koerper('beweglich', { x: 0, y: 40, w: 0 }, { masse: 4, traegheit: 1, schwerpunkt: [0, 0] });
    w.huelle(hand, { kreis: { mitte: [0, 0], r: 1 } }, STOFF);
    for (const k of [kreis, kapsel, kiste, hand]) {
      const l = lage(w, k);
      w.kraftpaar(k, fest, [l.x, l.y], [1 / TAKT, 0]);   // Impuls 1 durch den Schwerpunkt
    }
    w.schritt(TAKT, 4);
    expect(lage(w, kreis).vx).toBeCloseTo(1 / (2 * Math.PI * 0.25), 9);
    expect(lage(w, kapsel).vx).toBeCloseTo(1 / (Math.PI * 0.25 + 2), 9);
    expect(lage(w, kiste).vx).toBeCloseTo(1 / 2, 9);
    expect(lage(w, hand).vx).toBeCloseTo(1 / 4, 9);
  });
});

describe('Scharnier, Motor, Grenzen', () => {
  /** Stab der Länge 1 (Kapsel) am festen Punkt (0, 0) */
  function stab(w: WeltAdapter, motor?: { tempo: number; moment: number }, grenzen?: [number, number]): { stab: number; gelenk: number } {
    const fest = w.koerper('fest', { x: 0, y: 0, w: 0 });
    const s = w.koerper('beweglich', { x: 0, y: 0, w: 0 });
    w.huelle(s, { kapsel: { a: [0, 0], b: [1, 0], r: 0.05 } }, STOFF);
    return { stab: s, gelenk: w.scharnier(fest, s, [0, 0], motor, grenzen) };
  }

  it('Scharnier hält: der Ankerpunkt bleibt, der Stab schwingt', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const { stab: s } = stab(w);
    let groessterAbstand = 0, groessterWinkel = 0;
    takte(w, 180, () => {
      const l = lage(w, s);
      groessterAbstand = Math.max(groessterAbstand, Math.hypot(l.x, l.y));
      groessterWinkel = Math.max(groessterWinkel, l.w);
    });
    expect(groessterAbstand).toBeLessThan(2e-3);
    expect(groessterWinkel).toBeGreaterThan(80);   // fällt aus der Waagrechten nach unten (y nach unten: w wächst)
  });

  it('Motor mit Zieltempo dreht ein Rad auf dieses Tempo', () => {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const fest = w.koerper('fest', { x: 0, y: 0, w: 0 });
    const rad = kugel(w, 0, 0, 1);
    w.scharnier(fest, rad, [0, 0], { tempo: 90, moment: 100 });
    takte(w, 60);
    expect(lage(w, rad).om).toBeCloseTo(90, 6);
  });

  it('Motor mit Tempo 0 bremst gleichmäßig mit Höchstmoment / Trägheit bis zum Stillstand (Lagerreibung)', () => {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const fest = w.koerper('fest', { x: 0, y: 0, w: 0 });
    const rad = kugel(w, 0, 0, 1);
    w.scharnier(fest, rad, [0, 0], { tempo: 0, moment: 0.5 });
    stossen(w, rad, fest, [1, 0], [0, 1]);   // Drehimpuls 1
    const traegheit = Math.PI / 2;
    const om0 = lage(w, rad).om;
    takte(w, 60);
    const om1 = lage(w, rad).om;
    // Abnahme in einer Sekunde: Moment / Trägheit, in Grad
    expect(om0 - om1).toBeCloseTo(((0.5 / traegheit) * 180) / Math.PI, 6);
    takte(w, 300);
    expect(lage(w, rad).om).toBeCloseTo(0, 9);
  });

  it('Grenzen halten den Gelenkwinkel in [unten, oben]', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const { stab: s } = stab(w, undefined, [-30, 30]);
    let hoechst = -Infinity;
    takte(w, 240, () => {
      hoechst = Math.max(hoechst, lage(w, s).w);
    });
    expect(hoechst).toBeLessThan(31);
    expect(lage(w, s).w).toBeCloseTo(30, 0);
    // auch nach oben: Schwerkraft nach oben
    const w2 = new WeltAttrappe();
    w2.neu([0, -10]);
    const { stab: s2 } = stab(w2, undefined, [-30, 30]);
    let tiefst = Infinity;
    takte(w2, 240, () => {
      tiefst = Math.min(tiefst, lage(w2, s2).w);
    });
    expect(tiefst).toBeGreaterThan(-31);
    expect(lage(w2, s2).w).toBeCloseTo(-30, 0);
  });
});

describe('Ziel-Gelenk', () => {
  function aufbau(kraft: number, schwer = 0): { w: WeltAttrappe; b: number; g: number } {
    const w = new WeltAttrappe();
    w.neu([0, schwer]);
    const a = w.koerper('fest', { x: 0, y: 0, w: 0 });
    const b = kugel(w, 1, 0, 0.2);
    const g = w.ziel(a, b, { f: 2, zeta: 1 }, kraft);
    return { w, b, g };
  }

  it('zieht den Körper mit der Feder auf Ziel-Lage und Zielwinkel', () => {
    const { w, b, g } = aufbau(1000);
    takte(w, 30);
    expect(lage(w, b)).toMatchObject({ x: 1, y: 0, w: 0 });   // Anfangsziel: die Lage beim Anlegen
    w.zielSetzen(g, { x: 2, y: 1, w: 45 });
    takte(w, 180);
    const l = lage(w, b);
    expect(l.x).toBeCloseTo(2, 3);
    expect(l.y).toBeCloseTo(1, 3);
    expect(l.w).toBeCloseTo(45, 1);
  });

  it('die Höchstkraft begrenzt die Beschleunigung', () => {
    const { w, b, g } = aufbau(0.01);
    w.zielSetzen(g, { x: 3, y: 0, w: 0 });
    takte(w, 30);
    const m = Math.PI * 0.04, weg = lage(w, b).x - 1;
    expect(weg).toBeGreaterThan(0);
    expect(weg).toBeLessThan(0.5 * (0.01 / m) * 0.25 * 1.02);
  });

  it('Höchstkraft und Feder ändern sich mit zielSetzen; Höchstkraft 0 lässt los', () => {
    const { w, b, g } = aufbau(1000, 10);
    takte(w, 120);
    expect(lage(w, b).y).toBeLessThan(0.1);   // hält gegen die Schwerkraft (Feder 2 Hz gibt etwas nach)
    w.zielSetzen(g, { x: 1, y: 0, w: 0 }, 0);
    takte(w, 30);
    expect(lage(w, b).y).toBeGreaterThan(1);
    expect(() => w.zielSetzen(99, { x: 0, y: 0, w: 0 })).toThrow(RangeError);
  });
});

describe('Finger', () => {
  it('greift den Körper unter dem Punkt und zieht ihn mit', () => {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const k = kugel(w, 0, 0, 0.5);
    w.finger(true, [0.2, 0], { f: 4, zeta: 1 }, 1000);
    takte(w, 120, () => w.finger(true, [2.2, 0], { f: 4, zeta: 1 }, 1000));
    const l = lage(w, k);
    expect(l.x).toBeCloseTo(2, 2);
    expect(l.y).toBeCloseTo(0, 6);
  });

  it('Loslassen gibt Schwung; ohne Körper unter dem Punkt greift er nichts', () => {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const k = kugel(w, 0, 0, 0.5);
    takte(w, 90, (i) => w.finger(true, [0.2 + i * TAKT, 0], { f: 4, zeta: 1 }, 1000));
    w.finger(false, [0, 0], { f: 4, zeta: 1 }, 1000);
    const vor = lage(w, k);
    takte(w, 30);
    const nach = lage(w, k);
    expect(vor.vx).toBeGreaterThan(0.8);
    expect(nach.vx).toBe(vor.vx);   // ohne Reibung und Finger keine Kraft
    // neu ansetzen neben dem Körper: hält nichts, auch nicht, wenn er über den Körper fährt
    const w2 = new WeltAttrappe();
    w2.neu([0, 0]);
    const k2 = kugel(w2, 0, 0, 0.5);
    takte(w2, 60, (i) => w2.finger(true, [3 - i * 0.1, 0], { f: 4, zeta: 1 }, 1000));
    expect(lage(w2, k2)).toMatchObject({ x: 0, y: 0, vx: 0, vy: 0 });
  });

  it('die Höchstkraft begrenzt den Griff', () => {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const k = kugel(w, 0, 0, 0.5);
    takte(w, 60, (i) => w.finger(true, i === 0 ? [0, 0] : [5, 0], { f: 4, zeta: 1 }, 0.05));
    const m = Math.PI * 0.25;
    expect(lage(w, k).x).toBeLessThan(0.5 * (0.05 / m) * 1.02);
  });
});

describe('Federbein', () => {
  /** Körper mit Kreis über dem Boden bei y = 2; Beine je Takt neu an der aktuellen Lage (wie der Baustein) */
  function aufbau(beinX: readonly number[], anteil?: number): { w: WeltAttrappe; k: number; m: number; takt: () => void } {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    boden(w, 2);
    const k = kugel(w, 0, 1, 0.2);
    const takt = (): void => {
      const l = lage(w, k);
      for (const x of beinX) w.federbein(k, [l.x + x, l.y], [0, 1], 1, FEDER, anteil);
    };
    return { w, k, m: Math.PI * 0.04, takt };
  }

  it('mit Vorspannung steht das Bein beim Gewichtsanteil genau auf seiner Länge', () => {
    const { w, k, m, takt } = aufbau([0]);
    takte(w, 300, takt);
    const [b] = beine(w);
    expect(b).toMatchObject({ traf: 1, koerper: 0 });
    expect(b!.abstand).toBeCloseTo(1, 5);
    expect(b!.kraft).toBeCloseTo(m * 10, 5);
    expect(b!.y).toBeCloseTo(2, 9);
    expect(lage(w, k).y).toBeCloseTo(1, 5);
  });

  it('zwei Beine teilen sich das Gewicht von selbst', () => {
    const { w, m, takt } = aufbau([-0.1, 0.1]);
    takte(w, 300, takt);
    const bs = beine(w);
    expect(bs).toHaveLength(2);
    for (const b of bs) {
      expect(b.abstand).toBeCloseTo(1, 5);
      expect(b.kraft).toBeCloseTo((m * 10) / 2, 5);
    }
  });

  it('ein größerer Anteil drückt weniger zusammen: Abstand laenge + g/(2πf)² · (1 − Gewicht/Anteil); Anteil 0 trägt nichts', () => {
    const zwei = aufbau([0], 2 * Math.PI * 0.04);
    takte(zwei.w, 300, zwei.takt);
    const om = 2 * Math.PI * 3;
    expect(beine(zwei.w)[0]!.abstand).toBeCloseTo(1 + 10 / (2 * om * om), 5);
    const null_ = aufbau([0], 0);
    takte(null_.w, 120, null_.takt);
    expect(beine(null_.w)[0]).toMatchObject({ traf: 1, kraft: 0 });
    expect(lage(null_.w, null_.k).y).toBeCloseTo(2 - 0.2, 2);   // liegt mit seiner Hülle auf dem Boden
  });

  it('ohne Boden im Strahl trägt es nichts; der Strahl sieht weder seinen Körper noch dessen Gelenkpartner', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const k = kugel(w, 0, 0, 0.2);
    const partner = kugel(w, 0, 0.6, 0.2);   // liegt im Strahl, ist aber verbunden
    w.ziel(k, partner, FEDER, 1000);
    w.federbein(k, [0, 0], [0, 1], 1, FEDER);
    w.schritt(TAKT, 4);
    const [b] = beine(w);
    const ruhe = 1 + 10 / ((2 * Math.PI * 3) * (2 * Math.PI * 3));
    expect(b).toMatchObject({ traf: 0, kraft: 0, koerper: -1 });
    expect(b!.abstand).toBeCloseTo(ruhe, 12);
    expect(beine(w)).toHaveLength(1);
    w.schritt(TAKT, 4);
    expect(beine(w)).toHaveLength(0);   // Beine gelten nur für einen Schritt
  });

  it('Rückwirkung: das Bein drückt den getroffenen Körper (Platte am Scharnier dreht sich)', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const achse = w.koerper('fest', { x: 0, y: 2, w: 0 });
    const platte = w.koerper('beweglich', { x: 0, y: 2, w: 0 }, { masse: 5, traegheit: 5, schwerpunkt: [0, 0] });
    w.huelle(platte, { kette: { punkte: [[-3, 0], [3, 0]], schleife: false } }, STOFF);
    w.scharnier(achse, platte, [0, 2]);
    const k = kugel(w, 1, 1, 0.2);
    takte(w, 30, () => {
      const l = lage(w, k);
      w.federbein(k, [l.x, l.y], [0, 1], 1, FEDER);
    });
    // Kraft nach unten bei x = 1 dreht die Platte im Sinn wachsender w (y nach unten)
    expect(lage(w, platte).w).toBeGreaterThan(0.1);
  });
});

describe('Kräftepaar', () => {
  it('Kraft und Gegenkraft: Impuls und Drehimpuls bleiben null', () => {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const a = kugel(w, 0, 0, 0.5);
    const b = w.koerper('beweglich', { x: 3, y: 0, w: 0 });
    w.huelle(b, { kapsel: { a: [-1, 0], b: [1, 0], r: 0.25 } }, STOFF);
    w.kraftpaar(a, b, [0, 0.5], [6, 0]);
    w.kraftpaar(a, b, [0, 0.5], [-1, 2]);
    w.schritt(TAKT, 4);
    const la = lage(w, a), lb = lage(w, b);
    const ma = Math.PI * 0.25, mb = Math.PI * 0.0625 + 1;
    expect(la.vx).toBeCloseTo((5 * TAKT) / ma, 12);
    expect(la.vy).toBeCloseTo((2 * TAKT) / ma, 12);
    expect(ma * la.vx + mb * lb.vx).toBeCloseTo(0, 12);
    expect(ma * la.vy + mb * lb.vy).toBeCloseTo(0, 12);
    // Drehimpuls um den Ursprung: I·ω + m·(x·vy − y·vx), Schwerpunkte in der Mitte der Hüllen
    const ia = 0.5 * ma * 0.25, ib = (() => {
      const r = 0.25, l = 2, kreis = Math.PI * r * r, kasten = 2 * r * l, lc = (4 * r) / (3 * Math.PI), h = l / 2;
      return kreis * (0.5 * r * r + h * h + 2 * h * lc) + (kasten * (4 * r * r + l * l)) / 12;
    })();
    const rad = Math.PI / 180;
    const drall = ia * la.om * rad + ma * (la.x * la.vy - la.y * la.vx) + ib * lb.om * rad + mb * (lb.x * lb.vy - lb.y * lb.vx);
    expect(drall).toBeCloseTo(0, 10);
    expect(la.om).not.toBe(0);
  });
});

describe('Strahl', () => {
  function szene(): WeltAttrappe {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const f = w.koerper('fest', { x: 0, y: 0, w: 0 });
    w.huelle(f, { kreis: { mitte: [5, 0], r: 1 } }, STOFF);                          // Hülle 0
    w.huelle(f, { kapsel: { a: [10, -1], b: [10, 1], r: 0.5 } }, STOFF);             // Hülle 1
    const v = w.koerper('beweglich', { x: 20, y: 0, w: 90 });                         // gedrehter Körper
    w.huelle(v, { vieleck: { punkte: [[-1, -1], [1, -1], [1, 1], [-1, 1]], rundung: 0.25 } }, STOFF);   // Hülle 2
    const k = w.koerper('fest', { x: 30, y: 0, w: 0 });
    w.huelle(k, { kette: { punkte: [[0, -2], [0, 2]], schleife: false } }, STOFF);   // Hülle 3
    return w;
  }
  const aus = new Float64Array(STRAHL_FELDER);

  it('trifft zuerst den Kreis, mit Punkt, Normale, Anteil, Körper und Hülle', () => {
    expect(szene().strahl([0, 0], [40, 0], aus)).toBe(true);
    [4, 0, -1, 0, 0.1, 0, 0].forEach((x, i) => expect(aus[i]).toBeCloseTo(x, 12));
  });

  it('beginnt er in einer Hülle, zählt sie nicht; Kapsel seitlich und an der Kappe', () => {
    const w = szene();
    expect(w.strahl([5, 0], [40, 0], aus)).toBe(true);
    expect(aus[0]).toBeCloseTo(9.5, 12);
    [-1, 0].forEach((x, i) => expect(aus[2 + i]).toBeCloseTo(x, 12));
    expect([aus[5], aus[6]]).toEqual([0, 1]);
    expect(w.strahl([10, -5], [10, 5], aus)).toBe(true);
    expect(aus[1]).toBeCloseTo(-1.5, 12);
    expect(aus[3]).toBeCloseTo(-1, 12);
    expect(aus[4]).toBeCloseTo(3.5 / 10, 12);
  });

  it('Vieleck mit Rundung (gedreht), Kette nur von vorn, kein Treffer', () => {
    const w = szene();
    expect(w.strahl([15, 0.5], [25, 0.5], aus)).toBe(true);
    expect(aus[0]).toBeCloseTo(18.75, 9);
    expect(aus[5]).toBe(1);
    // die Kette läuft auf dem Bildschirm nach unten: vorn ist rechts (größeres x)
    expect(w.strahl([35, 1], [25, 1], aus)).toBe(true);
    expect(aus[0]).toBeCloseTo(30, 12);
    expect(aus[2]).toBeCloseTo(1, 12);
    expect(aus[6]).toBe(3);
    expect(w.strahl([25, 1], [35, 1], aus)).toBe(false);   // von hinten
    expect(w.strahl([31, 1], [31, 9], aus)).toBe(false);
    expect(() => w.strahl([0, 0], [1, 0], new Float64Array(3))).toThrow(RangeError);
  });

  it('sieht keine ausgeschalteten und keine entfernten Körper', () => {
    const w = szene();
    w.aktiv(1, false);
    expect(w.strahl([15, 0.5], [25, 0.5], aus)).toBe(false);
    w.aktiv(1, true);
    expect(w.strahl([15, 0.5], [25, 0.5], aus)).toBe(true);
    w.entfernen(1);
    expect(w.strahl([15, 0.5], [25, 0.5], aus)).toBe(false);
  });
});

describe('Ketten sind einseitig (wie Box2D)', () => {
  const aus = new Float64Array(STRAHL_FELDER);

  function kette(punkte: Punkt[], schleife = false, schwerkraft: Punkt = [0, 0]): WeltAttrappe {
    const w = new WeltAttrappe();
    w.neu(schwerkraft);
    w.huelle(w.koerper('fest', { x: 0, y: 0, w: 0 }), { kette: { punkte, schleife } }, STOFF);
    return w;
  }

  it('Strahl: von links nach rechts nur von oben getroffen, von rechts nach links nur von unten; Normale nach vorn', () => {
    const lr = kette([[-2, 0], [2, 0]]);
    expect(lr.strahl([0, -1], [0, 1], aus)).toBe(true);
    [0, 0, 0, -1, 0.5, 0, 0].forEach((x, i) => expect(aus[i]).toBeCloseTo(x, 12));
    expect(lr.strahl([0, 1], [0, -1], aus)).toBe(false);
    const rl = kette([[2, 0], [-2, 0]]);
    expect(rl.strahl([0, -1], [0, 1], aus)).toBe(false);
    expect(rl.strahl([0, 1], [0, -1], aus)).toBe(true);
    [0, 0, 0, 1].forEach((x, i) => expect(aus[i]).toBeCloseTo(x, 12));
  });

  it('eine Schleife im Uhrzeigersinn (auf dem Bildschirm) ist von außen fest: von innen kein Treffer', () => {
    const w = kette([[-1, -1], [1, -1], [1, 1], [-1, 1]], true);
    expect(w.strahl([0, -3], [0, 0], aus)).toBe(true);
    [0, -1, 0, -1].forEach((x, i) => expect(aus[i]).toBeCloseTo(x, 12));
    expect(w.strahl([3, 0.5], [0, 0.5], aus)).toBe(true);
    [1, 0.5, 1, 0].forEach((x, i) => expect(aus[i]).toBeCloseTo(x, 12));
    expect(w.strahl([0, 0], [0, -3], aus)).toBe(false);
    expect(w.strahl([0, 0], [3, 0.5], aus)).toBe(false);
  });

  it('Stoß: von vorn bleibt eine Kugel liegen, von hinten fällt sie durch', () => {
    const oben = kette([[-2, 0], [2, 0]], false, [0, 10]);
    const a = kugel(oben, 0, -1, 0.25);
    takte(oben, 120);
    expect(lage(oben, a).y).toBeCloseTo(-0.25, 2);
    expect(kontakte(oben)).toHaveLength(1);
    const unten = kette([[-2, 0], [2, 0]], false, [0, -10]);   // Schwerkraft nach oben: die Kugel steigt von hinten an
    const b = kugel(unten, 0, 1, 0.25);
    takte(unten, 120);
    expect(lage(unten, b).y).toBeLessThan(-5);
    expect(kontakte(unten)).toHaveLength(0);
  });

  it('Stoß: ein Vieleck liegt von vorn auf einer Kette mit innerem Punkt und fällt von hinten durch', () => {
    const kiste = (w: WeltAttrappe, y: number): number => {
      const k = w.koerper('beweglich', { x: 0, y, w: 0 });
      w.huelle(k, { vieleck: { punkte: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], rundung: 0 } }, STOFF);
      return k;
    };
    const punkte: Punkt[] = [[-2, 0], [0, 0], [2, 0]];
    const oben = kette(punkte, false, [0, 10]);
    const a = kiste(oben, -1);
    takte(oben, 120);
    expect(lage(oben, a).y).toBeCloseTo(-0.5, 2);
    expect(Math.abs(lage(oben, a).w)).toBeLessThan(0.01);   // Grad: liegt gerade
    const unten = kette(punkte, false, [0, -10]);
    const b = kiste(unten, 1);
    takte(unten, 120);
    expect(lage(unten, b).y).toBeLessThan(-5);
  });
});

describe('Zonen', () => {
  it('melden Betreten und Drinsein eines Körpers, der in der Zone liegen bleibt, nie feste Körper', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const fest = w.koerper('fest', { x: 0, y: 0, w: 0 });
    w.huelle(fest, { vieleck: { punkte: [[-2, 5.5], [2, 5.5], [2, 6.5], [-2, 6.5]], rundung: 0 } }, STOFF);   // ragt in die Zone
    const z = w.zone({ kreis: { mitte: [0, 0], r: 1 } }, { x: 0, y: 5, w: 0 });
    const k = kugel(w, 0, 0, 0.25);
    const folge: number[] = [];
    takte(w, 120, () => {
      for (const [zone, koerper, art] of zonen(w)) {
        expect([zone, koerper]).toEqual([z, k]);
        folge.push(art);
      }
    });
    expect(folge[0]).toBe(1);
    expect(folge.length).toBeGreaterThan(10);
    expect(folge.slice(1).every((a) => a === 0)).toBe(true);
    expect(lage(w, k).y).toBeCloseTo(5.25, 2);
  });

  it('Verlassen wird gemeldet, danach nichts mehr', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const z = w.zone({ vieleck: { punkte: [[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]], rundung: 0 } }, { x: 0, y: 3, w: 0 });
    const k = kugel(w, 0, 0, 0.1);
    const folge: number[] = [];
    takte(w, 120, () => {
      for (const [zone, koerper, art] of zonen(w)) {
        expect([zone, koerper]).toEqual([z, k]);
        folge.push(art);
      }
    });
    expect(folge[0]).toBe(1);
    expect(folge[folge.length - 1]).toBe(-1);
    expect(folge.slice(1, -1).every((a) => a === 0)).toBe(true);
    expect(folge.length).toBeGreaterThan(2);
  });
});

describe('führen, aktiv, entfernen', () => {
  it('ein geführter Körper steht nach dem Schritt in der Ziel-Lage und behält sein Tempo', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const k = w.koerper('gefuehrt', { x: 0, y: 0, w: 0 });
    w.huelle(k, { kreis: { mitte: [0.5, 0], r: 0.2 } }, STOFF);
    w.fuehren(k, { x: 1, y: 2, w: 90 });
    w.schritt(TAKT, 4);
    const l = lage(w, k);
    expect(l.x).toBeCloseTo(1, 9);
    expect(l.y).toBeCloseTo(2, 9);
    expect(l.w).toBeCloseTo(90, 9);
    w.schritt(TAKT, 4);
    // Tempo und Drehung bleiben wie in Box2D, die Schwerkraft wirkt nicht: der Schwerpunkt (lokal 0,5 | 0) geht noch einmal
    // um (0,5 | 2,5) weiter und dreht noch einmal um 90°
    const l2 = lage(w, k);
    expect(l2.x).toBeCloseTo(2, 9);
    expect(l2.y).toBeCloseTo(5, 9);
    expect(Math.abs(l2.w)).toBeCloseTo(180, 9);
  });

  it('ausgeschaltet ruht ein Körper; entfernt meldet lesen NaN, und die Nummer ist ungültig', () => {
    const w = new WeltAttrappe();
    w.neu([0, 10]);
    const k = kugel(w, 0, 0, 0.25);
    w.aktiv(k, false);
    takte(w, 30);
    expect(lage(w, k)).toMatchObject({ x: 0, y: 0, vy: 0 });
    w.aktiv(k, true);
    takte(w, 30);
    expect(lage(w, k).y).toBeGreaterThan(1);
    w.entfernen(k);
    w.schritt(TAKT, 4);
    expect(Number.isNaN(lage(w, k).x)).toBe(true);
    expect(() => w.aktiv(k, true)).toThrow(RangeError);
    expect(() => w.huelle(k, { kreis: { mitte: [0, 0], r: 1 } }, STOFF)).toThrow(RangeError);
    expect(w.koerper('fest', { x: 0, y: 0, w: 0 })).toBe(k + 1);   // Nummern werden nicht wieder vergeben
  });

  it('schnell: ein schneller kleiner Körper fällt nicht durch eine dünne Wand', () => {
    const w = new WeltAttrappe();
    w.neu([0, 0]);
    const wand = w.koerper('fest', { x: 0, y: 0, w: 0 });
    w.huelle(wand, { kette: { punkte: [[5, 2], [5, -2]], schleife: false } }, STOFF);   // läuft nach oben: vorn ist links, zur Kugel
    const k = kugel(w, 0, 0, 0.05, STOFF, true);
    stossen(w, k, wand, [0, 0], [Math.PI * 0.0025 * 120, 0]);   // 120 L/s: 0,5 L je Teilschritt
    takte(w, 30);
    expect(lage(w, k).x).toBeLessThan(5);
  });

  it('ungültige Eingaben werfen', () => {
    const w = new WeltAttrappe();
    expect(() => w.schritt(0, 4)).toThrow(RangeError);
    expect(() => w.schritt(TAKT, 0)).toThrow(RangeError);
    expect(() => w.koerper('beweglich', { x: NaN, y: 0, w: 0 })).toThrow(RangeError);
    const k = kugel(w, 0, 0, 1);
    expect(() => w.scharnier(k, k, [0, 0])).toThrow(RangeError);
    expect(() => w.federbein(k, [0, 0], [0, 0], 1, FEDER)).toThrow(RangeError);
    expect(() => w.huelle(k, { vieleck: { punkte: [[0, 0], [1, 1], [2, 2]], rundung: 0 } }, STOFF)).toThrow(RangeError);
    // höchstens VIELECK_PUNKTE Punkte, auch wenn die Hülle weniger Ecken hätte (wie b2ComputeHull)
    const acht: Punkt[] = Array.from({ length: VIELECK_PUNKTE }, (_, i) =>
      [Math.cos((2 * Math.PI * i) / VIELECK_PUNKTE), Math.sin((2 * Math.PI * i) / VIELECK_PUNKTE)]);
    expect(w.huelle(k, { vieleck: { punkte: acht, rundung: 0 } }, STOFF)).toBeGreaterThan(0);
    const neun: Punkt[] = [...acht, [0, 0]];
    expect(() => w.huelle(k, { vieleck: { punkte: neun, rundung: 0 } }, STOFF)).toThrow(RangeError);
    expect(() => w.zone({ vieleck: { punkte: neun, rundung: 0 } }, { x: 0, y: 0, w: 0 })).toThrow(RangeError);
    // Ketten: offen mindestens zwei Punkte, als Schleife drei
    expect(() => w.huelle(k, { kette: { punkte: [[0, 0]], schleife: false } }, STOFF)).toThrow(RangeError);
    expect(() => w.huelle(k, { kette: { punkte: [[0, 0], [1, 0]], schleife: true } }, STOFF)).toThrow(RangeError);
    expect(() => w.lesen({ ...puffer(0) })).toThrow(RangeError);
    expect(() => w.zuruecksetzen(new Uint8Array(8))).toThrow(RangeError);
  });
});

// ---------- merken, zurücksetzen, Wiederholbarkeit ----------

/** eine Szene mit allem: Hügel am Scharnier mit Lagerreibung, drei Körper mit Ziel-Gelenken und Federbeinen, Finger, Zone, Bälle */
function grosseSzene(): { w: WeltAttrappe; eingaben: (t: number) => void } {
  const w = new WeltAttrappe();
  w.neu([0, 20]);
  const achse = w.koerper('fest', { x: 0, y: 14, w: 0 });
  const huegel = w.koerper('beweglich', { x: 0, y: 14, w: 0 }, { masse: 20, traegheit: 20 * 14 * 14, schwerpunkt: [0, 0] });
  const rand: Punkt[] = [];   // läuft auf dem Bildschirm im Uhrzeigersinn: von außen fest (Ketten sind einseitig)
  for (let i = 0; i < 48; i++) rand.push([14 * Math.cos((2 * Math.PI * i) / 48), 14 * Math.sin((2 * Math.PI * i) / 48)]);
  w.huelle(huegel, { kette: { punkte: rand, schleife: true } }, STOFF);
  w.scharnier(achse, huegel, [0, 14], { tempo: 0, moment: 2 });
  const hinten = w.koerper('beweglich', { x: -0.3, y: -0.6, w: 0 });
  w.huelle(hinten, { kapsel: { a: [-0.2, 0], b: [0.2, 0], r: 0.15 } }, STOFF);
  const vorn = w.koerper('beweglich', { x: 0.3, y: -0.6, w: 0 });
  w.huelle(vorn, { kapsel: { a: [-0.2, 0], b: [0.2, 0], r: 0.15 } }, STOFF);
  const kopf = w.koerper('beweglich', { x: 0.7, y: -0.9, w: 0 });
  w.huelle(kopf, { kreis: { mitte: [0, 0], r: 0.2 } }, STOFF);
  const g1 = w.ziel(hinten, vorn, { f: 4, zeta: 0.7 }, 50);
  const g2 = w.ziel(vorn, kopf, { f: 4, zeta: 0.7 }, 50);
  w.zone({ kreis: { mitte: [0, 0], r: 0.6 } }, { x: 2, y: -1, w: 0 });
  const baelle = [kugel(w, 2, -3, 0.15, { ...STOFF, abprall: 0.4 }), kugel(w, -2, -4, 0.2)];
  const p = puffer();
  const eingaben = (t: number): void => {
    w.lesen(p);
    for (const [k, xs] of [[hinten, [-0.15, 0.15]], [vorn, [-0.15, 0.15]]] as const) {
      const x = p.lagen[3 * k]!, y = p.lagen[3 * k + 1]!, wk = (p.lagen[3 * k + 2]! * Math.PI) / 180;
      const c = Math.cos(wk), s = Math.sin(wk);
      for (const bx of xs) w.federbein(k, [x + c * bx, y + s * bx], [-s, c], 0.45, { f: 3, zeta: 0.8 });
    }
    w.kraftpaar(vorn, huegel, [p.lagen[3 * vorn]!, p.lagen[3 * vorn + 1]! + 0.45], [0.3 * Math.sin(t / 20), 0]);
    if (t === 200) w.zielSetzen(g1, { x: 0.6, y: 0, w: 5 }, 30);
    if (t === 400) w.zielSetzen(g2, { x: 0.4, y: -0.3, w: -10 });
    w.finger(t >= 100 && t < 450, [Math.sin(t / 40), 3 + Math.cos(t / 60)], { f: 4, zeta: 1 }, 40);
    void baelle;
  };
  return { w, eingaben };
}

/** alles, was `lesen` meldet: Lagen, Tempi, Kontakte, Zonen, Beine */
function ausgabe(w: WeltAdapter): number[] {
  const p = puffer(32);
  w.lesen(p);
  return [...p.lagen, ...p.tempi, p.kontaktZahl, ...p.kontakte.subarray(0, p.kontaktZahl * KONTAKT_FELDER), p.zonenZahl,
    ...p.zonen.subarray(0, p.zonenZahl * ZONE_FELDER), p.beinZahl ?? -1, ...p.beine!.subarray(0, (p.beinZahl ?? 0) * BEIN_FELDER)];
}

/** rechnet die Takte von … bis und gibt je Takt die Ausgabe und die Prüfsumme */
function lauf(w: WeltAdapter, eingaben: (t: number) => void, von: number, bis: number): number[][] {
  const aus: number[][] = [];
  for (let t = von; t < bis; t++) {
    eingaben(t);
    w.schritt(TAKT, 4);
    aus.push([...ausgabe(w), w.pruefsumme()]);
  }
  return aus;
}

function bitgleich(a: readonly (readonly number[])[], b: readonly (readonly number[])[]): boolean {
  return a.length === b.length && a.every((x, i) => x.length === b[i]!.length && x.every((y, j) => Object.is(y, b[i]![j])));
}

describe('merken und zurücksetzen', () => {
  it('nach zuruecksetzen rechnet die Welt bitgleich weiter: jeder Takt meldet dasselbe (Lagen, Kontakte, Zonen, Beine)', () => {
    // Schlüsselstände vor allem, mitten in einer Zone und mitten in einer Berührung: dort muss der Stand mehr tragen als die Lagen
    const { w, eingaben } = grosseSzene();
    const erst: number[][] = [];
    const staende = new Map<number, { stand: Uint8Array; summe: number }>();
    let tZone = -1, tKontakt = -1;
    for (let t = 0; t < 600; t++) {
      if (t === 20) staende.set(t, { stand: w.merken(), summe: w.pruefsumme() });
      eingaben(t);
      w.schritt(TAKT, 4);
      erst.push([...ausgabe(w), w.pruefsumme()]);
      if (tZone < 0 && zonen(w).some(([, , art]) => art === 0)) staende.set((tZone = t + 1), { stand: w.merken(), summe: w.pruefsumme() });
      if (tKontakt < 0 && kontakte(w).some((k) => k.art === 0)) staende.set((tKontakt = t + 1), { stand: w.merken(), summe: w.pruefsumme() });
    }
    expect(tZone).toBeGreaterThan(20);
    expect(tKontakt).toBeGreaterThan(20);
    for (const [t0, { stand, summe }] of staende) {
      w.zuruecksetzen(stand);
      expect(w.pruefsumme()).toBe(summe);
      expect(w.merken()).toEqual(stand);
      expect(bitgleich(lauf(w, eingaben, t0, 600), erst.slice(t0))).toBe(true);
    }
  });

  it('der Schlüsselstand gehört der Welt nicht: spätere Schritte ändern ihn nicht; auch in eine neue Attrappe', () => {
    const { w, eingaben } = grosseSzene();
    for (let t = 0; t < 120; t++) {
      eingaben(t);
      w.schritt(TAKT, 4);
    }
    const stand = w.merken();
    const kopie = stand.slice();
    for (let t = 120; t < 200; t++) {
      eingaben(t);
      w.schritt(TAKT, 4);
    }
    expect(stand).toEqual(kopie);
    const andere = new WeltAttrappe();
    andere.zuruecksetzen(stand);
    w.zuruecksetzen(stand);
    expect(andere.pruefsumme()).toBe(w.pruefsumme());
    for (let i = 0; i < 60; i++) {
      andere.schritt(TAKT, 4);
      w.schritt(TAKT, 4);
    }
    expect(andere.pruefsumme()).toBe(w.pruefsumme());
  });
});

describe('Wiederholbarkeit', () => {
  it('zwei Welten mit denselben Aufrufen sind nach 600 Takten bitgleich; eine winzige Änderung ändert die Prüfsumme', () => {
    const a = grosseSzene(), b = grosseSzene();
    for (let t = 0; t < 600; t++) {
      a.eingaben(t);
      a.w.schritt(TAKT, 4);
      b.eingaben(t);
      b.w.schritt(TAKT, 4);
    }
    expect(a.w.pruefsumme()).toBe(b.w.pruefsumme());
    expect(a.w.merken()).toEqual(b.w.merken());
    const c = grosseSzene();
    for (let t = 0; t < 600; t++) {
      c.eingaben(t);
      if (t === 10) c.w.kraftpaar(1, 0, [0, 0], [1e-9, 0]);
      c.w.schritt(TAKT, 4);
    }
    expect(c.w.pruefsumme()).not.toBe(a.w.pruefsumme());
  });

  it('die Szene läuft plausibel: Beine tragen, der Hügel dreht sich, Kontakte und Zonen kommen vor, alles bleibt endlich', () => {
    // ohne Reibung hält nichts Ozzys Körper seitlich (das macht später das Kräftepaar des Vierbeiners): er rutscht irgendwann ab
    const { w, eingaben } = grosseSzene();
    let kontakteGesehen = 0, zonenGesehen = 0, beineGetroffen = 0;
    for (let t = 0; t < 600; t++) {
      eingaben(t);
      w.schritt(TAKT, 4);
      kontakteGesehen += kontakte(w).length;
      zonenGesehen += zonen(w).length;
      beineGetroffen += beine(w).filter((b) => b.traf === 1 && b.koerper === 1).length;
    }
    expect(Math.abs(lage(w, 1).w)).toBeGreaterThan(0.01);
    expect(beineGetroffen).toBeGreaterThan(400);
    expect(kontakteGesehen).toBeGreaterThan(0);
    expect(zonenGesehen).toBeGreaterThan(0);
    const p = puffer();
    w.lesen(p);
    expect(p.lagen.subarray(0, 3 * 7).every(Number.isFinite)).toBe(true);
    expect(p.tempi.subarray(0, 3 * 7).every(Number.isFinite)).toBe(true);
  });
});
