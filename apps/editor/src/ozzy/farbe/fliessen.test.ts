import { describe, expect, it } from 'vitest';
import { linienAusTreffern } from './bemalung';
import { flaechenRechnen } from './flaechen';
import { FERN, fuellungBei, flussWeiten, weiteImDreieck } from './fliessen';
import { kettenAller } from './ketten';
import { naechsterAuf } from './naechster';
import { type Netz, type Ort, karteVon, ortGespiegelt, ortIn } from './ort';

// ---------- Prüfnetz: eine Kugel aus einem unterteilten Oktaeder (spiegelgleich an z = 0) ----------

function kugel(stufen: number, r = 100): Netz & { spiegel: Int32Array; pos: Float64Array; tri: Uint32Array } {
  const P: number[][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  let T: number[][] = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  for (let s = 0; s < stufen; s++) {
    const mitte = new Map<string, number>();
    const m = (a: number, b: number): number => {
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      let i = mitte.get(k);
      if (i === undefined) {
        const x = [(P[a]![0]! + P[b]![0]!) / 2, (P[a]![1]! + P[b]![1]!) / 2, (P[a]![2]! + P[b]![2]!) / 2];
        const l = Math.hypot(x[0]!, x[1]!, x[2]!);
        i = P.length;
        P.push([x[0]! / l, x[1]! / l, x[2]! / l]);
        mitte.set(k, i);
      }
      return i;
    };
    const N: number[][] = [];
    for (const [a, b, c] of T as [number, number, number][]) {
      const ab = m(a, b), bc = m(b, c), ca = m(c, a);
      N.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    T = N;
  }
  const n = P.length;
  const pos = new Float64Array(3 * n);
  P.forEach((p, i) => {
    pos[3 * i] = r * p[0]!;
    pos[3 * i + 1] = r * p[1]!;
    pos[3 * i + 2] = Math.abs(p[2]!) < 1e-12 ? 0 : r * p[2]!;
  });
  const schl = (x: number, y: number, z: number): string => `${Math.round(x * 1e6)},${Math.round(y * 1e6)},${Math.round(z * 1e6)}`;
  const wo = new Map<string, number>();
  for (let i = 0; i < n; i++) wo.set(schl(pos[3 * i]!, pos[3 * i + 1]!, pos[3 * i + 2]!), i);
  const spiegel = new Int32Array(n);
  for (let i = 0; i < n; i++) spiegel[i] = wo.get(schl(pos[3 * i]!, pos[3 * i + 1]!, -pos[3 * i + 2]!)) ?? -1;
  return { pos, tri: Uint32Array.from(T.flat()), n, spiegel };
}

describe('Farbe, Etappe 3: der Weg der Farbe über die Haut', () => {
  const netz = kugel(4);
  const k = karteVon(netz);
  const nah = naechsterAuf(netz);
  const ortBei = (x: number, y: number, z: number): Ort => {
    const r = nah(x, y, z);
    return ortIn(netz, r.t, r.wa, r.wb, r.wc);
  };
  /** der Winkel zwischen zwei Richtungen vom Mittelpunkt aus, mal Halbmesser: der Weg über die Kugel */
  const bogen = (v: number, p: [number, number, number]): number => {
    const x = netz.pos[3 * v]!, y = netz.pos[3 * v + 1]!, z = netz.pos[3 * v + 2]!;
    const c = (x * p[0] + y * p[1] + z * p[2]) / (Math.hypot(x, y, z) * Math.hypot(p[0], p[1], p[2]));
    return 100 * Math.acos(Math.min(1, Math.max(-1, c)));
  };
  const kreis = (z0: number, von = 0, bis = 96): Ort[] => {
    const rho = Math.sqrt(1e4 - z0 * z0);
    return Array.from({ length: bis - von }, (_, j) => ortBei(rho * Math.cos((2 * Math.PI * (von + j)) / 96), rho * Math.sin((2 * Math.PI * (von + j)) / 96), z0));
  };

  it('über die ganze Kugel läuft die Front rund: Die Weite ist der Bogen von der Saat, nicht der Weg längs der Kanten', () => {
    // (die Saat schräg, nicht auf einer Ecke des Netzes)
    const p: [number, number, number] = [31, 47, 82.6];
    const saat = ortBei(...p);
    const fl = flaechenRechnen(k, [], [{ ort: saat, farbe: 0 }]);
    expect(fuellungBei(fl, saat)).toBe(0);
    const { weite, groesst } = flussWeiten(k, fl, 0, [saat]);
    let fehler = 0;
    let mittel = 0;
    let zahl = 0;
    for (let v = 0; v < netz.n; v++) {
      expect(weite[v]).toBeLessThan(Infinity);
      const soll = bogen(v, p);
      if (soll < 20) continue;
      // (das Netz liegt innerhalb der Kugel: Sein Weg ist ein wenig kürzer als der Bogen)
      const f = Math.abs(weite[v]! - soll) / soll;
      fehler = Math.max(fehler, f);
      mittel += f;
      zahl++;
    }
    expect(fehler).toBeLessThan(0.04);
    expect(mittel / zahl).toBeLessThan(0.015);
    // bis zur Gegenseite: ein halber Umfang
    expect(groesst).toBeGreaterThan(0.97 * Math.PI * 100);
    expect(groesst).toBeLessThan(1.02 * Math.PI * 100);
  });

  it('die Farbe staut sich an einer geschlossenen Farblinie: Dahinter kommt die Front nicht weiter als ein Dreieck', () => {
    let id = 1;
    const linien = linienAusTreffern(k, kreis(60), true, false, () => id++);
    const { ketten } = kettenAller(k, linien, false);
    const saat = ortBei(0, 0, 100);
    const fl = flaechenRechnen(k, ketten, [{ ort: saat, farbe: 0 }]);
    expect(fuellungBei(fl, saat)).toBe(0);
    expect(fuellungBei(fl, ortBei(0, 0, -100))).toBe(-1);
    const { weite, groesst } = flussWeiten(k, fl, 0, [saat]);
    let aussen = 0;
    for (let v = 0; v < netz.n; v++) {
      const z = netz.pos[3 * v + 2]!;
      if (z > 62) {
        // in der Kappe: der Bogen vom Pol
        expect(Math.abs(weite[v]! - bogen(v, [0, 0, 100]))).toBeLessThan(0.04 * bogen(v, [0, 0, 100]) + 0.5);
      } else if (z < 40) {
        // weit hinter der Farblinie: nie erreicht
        expect(weite[v]).toBe(Infinity);
        aussen++;
      }
    }
    expect(aussen).toBeGreaterThan(netz.n / 2);
    // die Kappe reicht bis zum Bogen 100 · acos(0,6) = 92,7; dazu höchstens ein Dreieck über die Farblinie hinaus
    expect(groesst).toBeGreaterThan(92);
    expect(groesst).toBeLessThan(92.7 + 16);
  });

  it('durch eine Lücke läuft die Farbe aus: Hinter der Farblinie kommt sie nur auf dem Umweg durch die Lücke an', () => {
    let id = 1;
    // der Kreis ohne das Stück um die Richtung +x (30° offen)
    const linien = linienAusTreffern(k, kreis(60, 4, 93), false, false, () => id++);
    const { ketten } = kettenAller(k, linien, false);
    const saat = ortBei(0, 0, 100);
    const fl = flaechenRechnen(k, ketten, [{ ort: saat, farbe: 0 }]);
    // alles ist eine Fläche
    expect(fuellungBei(fl, ortBei(0, 0, -100))).toBe(0);
    const { weite } = flussWeiten(k, fl, 0, [saat]);
    for (let v = 0; v < netz.n; v++) expect(weite[v]).toBeLessThan(Infinity);
    // knapp hinter der Farblinie, der Lücke gegenüber (bei −x): direkt wären es rund 105, durch die Lücke herum viel mehr
    const hinten = nah(-Math.sqrt(1e4 - 2500), 0, 50);
    const vH = netz.tri[3 * hinten.t]!;
    expect(weite[vH]).toBeGreaterThan(1.8 * bogen(vH, [0, 0, 100]));
    // knapp hinter der Lücke selbst (bei +x): fast der direkte Weg
    const vorn = nah(Math.sqrt(1e4 - 2500), 0, 50);
    const vV = netz.tri[3 * vorn.t]!;
    expect(weite[vV]).toBeLessThan(1.1 * bogen(vV, [0, 0, 100]));
  });

  it('im Inneren eines Dreiecks ist die Front rund: Die Weite ist der Abstand von der Quelle, nicht eben gemischt', () => {
    // ein Dreieck schräg im Raum; die Quelle einmal außerhalb (in seiner Ebene), einmal in ihm selbst (die Saat liegt im Dreieck)
    const P = [10, 0, 5, 22, 3, 9, 13, 11, 2];
    const lage = (b: number, c: number): [number, number, number] => [0, 1, 2].map((i) => (1 - b - c) * P[i]! + b * P[3 + i]! + c * P[6 + i]!) as [number, number, number];
    const ab = (p: readonly number[], q: readonly number[]): number => Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
    for (const [qb, qc] of [[-0.9, -0.4], [0.3, 0.25], [1.6, -0.2]] as const) {
      const quelle = lage(qb, qc);
      const d = [lage(0, 0), lage(1, 0), lage(0, 1)].map((e) => ab(e, quelle));
      const w = weiteImDreieck(P, 0, 3, 6, d[0]!, d[1]!, d[2]!);
      let eben = 0;
      for (let i = 0; i <= 8; i++)
        for (let j = 0; i + j <= 8; j++) {
          const b = i / 8, c = j / 8;
          expect(Math.abs(w(b, c) - ab(lage(b, c), quelle))).toBeLessThan(1e-9);
          eben = Math.max(eben, Math.abs((1 - b - c) * d[0]! + b * d[1]! + c * d[2]! - ab(lage(b, c), quelle)));
        }
      // (eben gemischt läge es deutlich daneben: Daher kamen die Ecken in der Front)
      expect(eben).toBeGreaterThan(0.3);
    }
    // Weiten, die zu keiner Quelle in der Ebene passen (aber längs jeder Kante nicht schneller wachsen als der Weg): An den Ecken
    // stimmt es trotzdem, und dazwischen bleibt es in den Grenzen jeder Ecke
    const w = weiteImDreieck(P, 0, 3, 6, 40, 41, 50.5);
    expect(w(0, 0)).toBeCloseTo(40, 9);
    expect(w(1, 0)).toBeCloseTo(41, 9);
    expect(w(0, 1)).toBeCloseTo(50.5, 9);
    for (let i = 0; i <= 8; i++)
      for (let j = 0; i + j <= 8; j++) {
        const p = lage(i / 8, j / 8);
        const x = w(i / 8, j / 8);
        expect(x).toBeLessThanOrEqual(Math.min(40 + ab(p, lage(0, 0)), 41 + ab(p, lage(1, 0)), 50.5 + ab(p, lage(0, 1))) + 1e-9);
        expect(x).toBeGreaterThanOrEqual(Math.max(40 - ab(p, lage(0, 0)), 41 - ab(p, lage(1, 0)), 50.5 - ab(p, lage(0, 1))) - 1e-9);
      }
    // eine Ecke, an der nichts ankam
    expect(weiteImDreieck(P, 0, 3, 6, 40, FERN, 50.5)(0.2, 0.2)).toBe(FERN);
  });

  it('gespiegelt läuft die Farbe von der Saat und ihrem Spiegelbild zugleich: Die Weiten sind spiegelgleich', () => {
    const saat = ortBei(20, 30, Math.sqrt(1e4 - 1300));
    const g = ortGespiegelt(k, saat)!;
    const fl = flaechenRechnen(k, [], [
      { ort: saat, farbe: 0 },
      { ort: g, farbe: 0 },
    ]);
    const { weite, groesst } = flussWeiten(k, fl, 0, [saat, g]);
    for (let v = 0; v < netz.n; v++) expect(Math.abs(weite[v]! - weite[netz.spiegel[v]!]!)).toBeLessThan(1e-3);
    // am weitesten ist es zur Mitte hin, auf der Gegenseite: weniger als ein halber Umfang
    expect(groesst).toBeLessThan(0.9 * Math.PI * 100);
  });
});
