// Die schnelle Rechnung der glatten Anzeige (`glattPlan.ts`) gegen die Fassung aus dem Vergleichsbild (`glatt.ts`): Beide müssen
// dieselben Lagen, Normalen und Dreiecke geben, auch mit Linien (weich und hart) und mit einem Rand.
import { describe, expect, it } from 'vitest';
import { type AnzeigeNetz, type KantenPfad, kantenVon, netzNormalen, ruhigeNormalen, unterteilen, verfeinernGekruemmt } from './glatt';
import { GlattPlan, type LinienKante } from './glattPlan';

/** eine bucklige Kugel aus einem Oktaeder, zweimal geteilt (66 Punkte, 128 Dreiecke) */
function kugel(): { pos: Float64Array; tri: Uint32Array } {
  const pos: number[] = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];
  let tri: number[] = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5];
  for (let s = 0; s < 2; s++) {
    const mitte = new Map<string, number>();
    const neu: number[] = [];
    const m = (a: number, b: number): number => {
      const k = a < b ? `${a}/${b}` : `${b}/${a}`;
      let i = mitte.get(k);
      if (i === undefined) {
        i = pos.length / 3;
        for (let x = 0; x < 3; x++) pos.push((pos[3 * a + x]! + pos[3 * b + x]!) / 2);
        mitte.set(k, i);
      }
      return i;
    };
    for (let t = 0; t < tri.length; t += 3) {
      const [a, b, c] = [tri[t]!, tri[t + 1]!, tri[t + 2]!];
      const [ab, bc, ca] = [m(a, b), m(b, c), m(c, a)];
      neu.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    tri = neu;
  }
  const P = new Float64Array(pos.length);
  for (let v = 0; v < pos.length / 3; v++) {
    const [x, y, z] = [pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!];
    const l = Math.hypot(x, y, z);
    // Radius 100, mit Buckeln und ungleich verteilt
    const r = 100 * (1 + 0.08 * Math.sin(3 * x + 1) * Math.cos(2 * y - z));
    P[3 * v] = (x / l) * r + 0.7 * Math.sin(5 * v);
    P[3 * v + 1] = (y / l) * r * 1.3;
    P[3 * v + 2] = (z / l) * r * 0.8;
  }
  return { pos: P, tri: Uint32Array.from(tri) };
}

/** Linien auf einigen Kanten: Pfadstücke, die sich über die Sehne wölben; `hart` je zweite */
function mitLinien(pos: Float64Array, tri: Uint32Array, kanten: readonly number[]): { net: AnzeigeNetz; linien: LinienKante[]; pfade: Float64Array } {
  const n = pos.length / 3;
  const K = kantenVon(tri, n);
  const nor = netzNormalen(pos, tri);
  const pfad = new Map<number, KantenPfad>();
  const fest = new Uint8Array(n);
  const linien: LinienKante[] = [];
  const pfade = new Float64Array(12 * kanten.length);
  kanten.forEach((i, q) => {
    const a = K.a[i]!;
    const b = K.b[i]!;
    const hart = q % 2 === 1;
    const k = new Float64Array(12);
    for (let x = 0; x < 3; x++) {
      const pa = pos[3 * a + x]!;
      const pb = pos[3 * b + x]!;
      k[x] = pa;
      k[3 + x] = pa + (pb - pa) / 3 + 2.5 * nor[3 * a + x]!;
      k[6 + x] = pb - (pb - pa) / 3 + 1.5 * nor[3 * b + x]!;
      k[9 + x] = pb;
    }
    pfad.set(a * n + b, { k, hart });
    if (hart) fest[a] = fest[b] = 1;
    // dem Plan die Kante einmal vorwärts, einmal rückwärts geben (er dreht selbst)
    const rueck = q % 3 === 0;
    linien.push(rueck ? { a: b, b: a, hart } : { a, b, hart });
    for (let p = 0; p < 4; p++) for (let x = 0; x < 3; x++) pfade[12 * q + 3 * p + x] = k[3 * (rueck ? 3 - p : p) + x]!;
  });
  return { net: { pos, tri, fest, pfad }, linien, pfade };
}

function vergleich(net: AnzeigeNetz, linien: LinienKante[], pfade: Float64Array, stufen: number): { lage: number; normale: number; dreiecke: boolean } {
  let g = net;
  let gn = ruhigeNormalen(net);
  let r = net;
  for (let s = 0; s < stufen; s++) {
    g = verfeinernGekruemmt(g, gn);
    gn = ruhigeNormalen(g);
    r = unterteilen(r, false);
  }
  const soll = netzNormalen(r.pos, r.tri);
  const plan = new GlattPlan(net.tri, net.pos.length / 3, net.fest, linien);
  const ist = plan.rechnen(net.pos, pfade, stufen);
  let lage = 0;
  let normale = 0;
  expect(ist.pos.length).toBe(g.pos.length);
  for (let i = 0; i < g.pos.length; i++) {
    lage = Math.max(lage, Math.abs(ist.pos[i]! - g.pos[i]!));
    normale = Math.max(normale, Math.abs(ist.nor[i]! - soll[i]!));
  }
  const I = plan.index(stufen);
  let dreiecke = I.length === g.tri.length;
  for (let i = 0; dreiecke && i < I.length; i++) dreiecke = I[i] === g.tri[i];
  return { lage, normale, dreiecke };
}

describe('glatte Anzeige: schnelle Rechnung = Rechnung des Vergleichsbilds', () => {
  it('geschlossenes Netz ohne Linien, eine und zwei Stufen', () => {
    const { pos, tri } = kugel();
    const { net, linien, pfade } = mitLinien(pos, tri, []);
    for (const stufen of [1, 2]) {
      const v = vergleich(net, linien, pfade, stufen);
      expect(v.dreiecke).toBe(true);
      // die Anzeige rechnet am Ende in einfacher Genauigkeit (Lagen um 100)
      expect(v.lage).toBeLessThan(2e-5);
      expect(v.normale).toBeLessThan(1e-6);
    }
  });

  it('mit weichen und harten Linien', () => {
    const { pos, tri } = kugel();
    const { net, linien, pfade } = mitLinien(pos, tri, [0, 7, 19, 33, 52, 80, 121, 150]);
    for (const stufen of [1, 2]) {
      const v = vergleich(net, linien, pfade, stufen);
      expect(v.dreiecke).toBe(true);
      expect(v.lage).toBeLessThan(2e-5);
      expect(v.normale).toBeLessThan(1e-6);
    }
  });

  it('mit einem Rand (Öffnung) und Linien', () => {
    const { pos, tri } = kugel();
    const offen = tri.slice(0, tri.length - 3 * 9);
    const { net, linien, pfade } = mitLinien(pos, offen, [3, 11, 40, 77]);
    const v = vergleich(net, linien, pfade, 2);
    expect(v.dreiecke).toBe(true);
    expect(v.lage).toBeLessThan(2e-5);
    expect(v.normale).toBeLessThan(1e-6);
  });

  it('eine Linienkante liegt genau auf ihrem Pfad, ein Rechenpunkt bleibt, wo er ist', () => {
    const { pos, tri } = kugel();
    const { net, linien, pfade } = mitLinien(pos, tri, [19]);
    const plan = new GlattPlan(net.tri, net.pos.length / 3, net.fest, linien);
    const ist = plan.rechnen(net.pos, pfade, 2);
    const n = net.pos.length / 3;
    for (let i = 0; i < 3 * n; i++) expect(Math.abs(ist.pos[i]! - net.pos[i]!)).toBeLessThan(2e-5);
    // die Mitte der Kante nach der ersten Stufe ist der Punkt n + 19: Pfad bei ½
    for (let x = 0; x < 3; x++) {
      const mitte = (pfade[x]! + 3 * pfade[3 + x]! + 3 * pfade[6 + x]! + pfade[9 + x]!) / 8;
      expect(Math.abs(ist.pos[3 * (n + 19) + x]! - mitte)).toBeLessThan(2e-5);
    }
  });

  it('reicht die Seite der Spiegelung auf die feinen Punkte weiter', () => {
    const { pos, tri } = kugel();
    const n = pos.length / 3;
    const seite = Float32Array.from({ length: n }, (_, v) => Math.sign(Math.round(pos[3 * v + 2]! * 1000)));
    const plan = new GlattPlan(tri, n, new Uint8Array(n), []);
    const fein = plan.weiterreichen(2, seite);
    expect(fein.length).toBe(plan.punkte(2));
    const feinPos = plan.rechnen(pos, new Float64Array(0), 2).pos;
    // kein feiner Punkt trägt das Vorzeichen der anderen Seite
    for (let v = 0; v < fein.length; v++) if (fein[v] !== 0 && Math.abs(feinPos[3 * v + 2]!) > 1) expect(Math.sign(feinPos[3 * v + 2]!)).toBe(fein[v]);
  });
});

/** Punkte genau auf einer Kugel (Radius 100), ungleichmäßig verteilt: ein Oktaeder, `stufen`-mal geteilt, längs der Kugel verschoben */
function kugelUngleich(stufen: number): { pos: Float64Array; tri: Uint32Array } {
  const pos: number[] = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];
  let tri: number[] = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5];
  for (let s = 0; s < stufen; s++) {
    const mitte = new Map<string, number>();
    const neu: number[] = [];
    const m = (a: number, b: number): number => {
      const k = a < b ? `${a}/${b}` : `${b}/${a}`;
      let i = mitte.get(k);
      if (i === undefined) {
        i = pos.length / 3;
        // nicht in der Mitte der Kante: bei 35 bis 65 %
        const t = 0.5 + 0.15 * Math.sin(7 * i + 1);
        for (let x = 0; x < 3; x++) pos.push((1 - t) * pos[3 * a + x]! + t * pos[3 * b + x]!);
        mitte.set(k, i);
      }
      return i;
    };
    for (let t = 0; t < tri.length; t += 3) {
      const [a, b, c] = [tri[t]!, tri[t + 1]!, tri[t + 2]!];
      const [ab, bc, ca] = [m(a, b), m(b, c), m(c, a)];
      neu.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    tri = neu;
    for (let v = 0; v < pos.length / 3; v++) {
      const l = Math.hypot(pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!);
      for (let x = 0; x < 3; x++) pos[3 * v + x] = pos[3 * v + x]! / l;
    }
  }
  return { pos: Float64Array.from(pos, (w) => 100 * w), tri: Uint32Array.from(tri) };
}

/** größter Winkel (Grad) zwischen Normale und Richtung vom Mittelpunkt, größte Abweichung des Radius (Anteil) */
function gegenKugel(pos: Float32Array, nor: Float32Array): { winkel: number; radius: number } {
  let winkel = 0;
  let radius = 0;
  for (let v = 0; v < pos.length; v += 3) {
    const r = Math.hypot(pos[v]!, pos[v + 1]!, pos[v + 2]!);
    const c = (pos[v]! * nor[v]! + pos[v + 1]! * nor[v + 1]! + pos[v + 2]! * nor[v + 2]!) / r;
    winkel = Math.max(winkel, (Math.acos(Math.min(1, c)) * 180) / Math.PI);
    radius = Math.max(radius, Math.abs(r / 100 - 1));
  }
  return { winkel, radius };
}

describe('glatte Anzeige: Normalen als Feld (`ruhe` ≥ 0)', () => {
  it('Punkte auf einer Kugel, ungleichmäßig verteilt: die Normalen zeigen vom Mittelpunkt weg, auch beruhigt und verfeinert', () => {
    const { pos, tri } = kugelUngleich(4);
    const n = pos.length / 3;
    const plan = new GlattPlan(tri, n, new Uint8Array(n), []);
    const leer = new Float64Array(0);
    // gemessen, nicht beruhigt: genau (Max 1999), bis auf die einfache Genauigkeit der Anzeige
    expect(gegenKugel(plan.rechnen(pos, leer, 0, 0).pos, plan.rechnen(pos, leer, 0, 0).nor).winkel).toBeLessThan(0.05);
    // die Normalen der Flächen (nach der Fläche gewichtet) liegen auf demselben Netz um ein Vielfaches daneben
    const flaeche = gegenKugel(plan.rechnen(pos, leer, 0, -1).pos, plan.rechnen(pos, leer, 0, -1).nor).winkel;
    expect(flaeche).toBeGreaterThan(0.5);
    for (const stufen of [0, 1, 2]) {
      const a = plan.rechnen(pos, leer, stufen, 3);
      const g = gegenKugel(a.pos, a.nor);
      expect(a.pos.length).toBe(3 * plan.punkte(stufen));
      // beruhigt bleibt das Feld der Kugel, wie es ist (Gewichte nach den Mittelwert-Koordinaten)
      expect(g.winkel).toBeLessThan(0.1);
      // die verfeinerten Punkte liegen auf der Kugel (gewölbte Kanten)
      expect(g.radius).toBeLessThan(0.002);
    }
  });

  it('ohne Stufe: die Rechenpunkte selbst und die Dreiecke des Netzes', () => {
    const { pos, tri } = kugel();
    const n = pos.length / 3;
    const plan = new GlattPlan(tri, n, new Uint8Array(n), []);
    const a = plan.rechnen(pos, new Float64Array(0), 0, 3);
    expect(plan.punkte(0)).toBe(n);
    expect(plan.index(0)).toBe(tri);
    expect(a.pos.length).toBe(3 * n);
    for (let i = 0; i < 3 * n; i++) expect(Math.abs(a.pos[i]! - pos[i]!)).toBeLessThan(2e-5);
    for (let v = 0; v < 3 * n; v += 3) expect(Math.abs(Math.hypot(a.nor[v]!, a.nor[v + 1]!, a.nor[v + 2]!) - 1)).toBeLessThan(1e-5);
  });

  it('an einem Grat mischen die beiden Flanken nicht: ein Dach, jede Flanke behält ihre Normale', () => {
    // 7 × 7 Punkte, in der Mitte (Spalte 3) gefaltet, beide Seiten spiegelgleich: Die Flanken stehen 113° zueinander, die Normale
    // auf dem First 56° zu jeder
    const m = 7;
    const steil = 1.5;
    const pos = new Float64Array(3 * m * m);
    for (let j = 0; j < m; j++)
      for (let i = 0; i < m; i++) {
        const v = 3 * (j * m + i);
        const w = Math.abs(i - 3);
        // ungleichmäßig: die Spalten liegen verschieden weit auseinander, die Zeilen sind verschoben
        const u = w * 10 + (w === 0 ? 0 : 2 * Math.sin(3 * w + j));
        pos[v] = i < 3 ? -u : u;
        pos[v + 1] = -steil * u;
        pos[v + 2] = j * 10 + (w === 0 ? 0 : Math.cos(2 * w + 3 * j));
      }
    const tri: number[] = [];
    for (let j = 0; j + 1 < m; j++)
      for (let i = 0; i + 1 < m; i++) {
        const a = j * m + i;
        tri.push(a, a + m, a + 1, a + 1, a + m, a + m + 1);
      }
    const plan = new GlattPlan(Uint32Array.from(tri), m * m, new Uint8Array(m * m), []);
    const a = plan.rechnen(pos, new Float64Array(0), 0, 3);
    const l = Math.hypot(steil, 1);
    for (let j = 0; j < m; j++)
      for (let i = 0; i < m; i++) {
        if (i === 3) continue;
        const v = 3 * (j * m + i);
        // links (x < 0) steigt die Fläche mit x: Normale (−steil, 1, 0), rechts (steil, 1, 0), je auf Länge 1
        expect(Math.abs(a.nor[v]! - (i < 3 ? -steil : steil) / l)).toBeLessThan(1e-5);
        expect(Math.abs(a.nor[v + 1]! - 1 / l)).toBeLessThan(1e-5);
        expect(Math.abs(a.nor[v + 2]!)).toBeLessThan(1e-5);
      }
  });
});
