import { describe, expect, it } from 'vitest';
import { alsDatei, ausDatei, kopie, leereBemalung, linienAusTreffern, uebergeben } from './bemalung';
import { punkteSchaetzen, richtungAus, richtungVektor, stueckLegen } from './kurve';
import { naechsterAuf } from './naechster';
import { type Netz, type Ort, type V3, karteVon, ortIn, ortLage } from './ort';

// ---------- Prüfnetz: eine Kugel aus einem unterteilten Oktaeder ----------

function kugel(stufen: number, r = 100): Netz & { pos: Float64Array; tri: Uint32Array } {
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
  return { pos: Float64Array.from(P.flatMap((p) => p.map((x) => r * x))), tri: Uint32Array.from(T.flat()), n: P.length };
}

const netz = kugel(4);
const nah = naechsterAuf(netz);
const ortBei = (x: number, y: number, z: number): Ort => {
  const r = nah(x, y, z);
  return ortIn(netz, r.t, r.wa, r.wb, r.wc);
};
const laenge = (v: V3): number => Math.hypot(v[0], v[1], v[2]);
const ab = (a: V3, b: V3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** ein Kreis um die z-Achse in der Höhe z0 als Folge von Orten */
const kreis = (z0: number, schritte = 120): Ort[] => {
  const rho = Math.sqrt(100 * 100 - z0 * z0);
  return Array.from({ length: schritte }, (_, i) => ortBei(rho * Math.cos((2 * Math.PI * i) / schritte), rho * Math.sin((2 * Math.PI * i) / schritte), z0));
};

describe('Farbe, Etappe 2: Punkte, Richtungen, Kurve', () => {
  it('eine Richtung steht im Maß ihres Dreiecks: Vektor hin und zurück, und sie dreht sich mit dem Netz', () => {
    const o = ortBei(30, 40, 86);
    // ein Vektor in der Ebene des Dreiecks kommt genau zurück
    const a = 3 * o.e[0], b = 3 * o.e[1], c = 3 * o.e[2];
    const v: V3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) v[i] = 0.3 * (netz.pos[b + i]! - netz.pos[a + i]!) - 0.7 * (netz.pos[c + i]! - netz.pos[a + i]!);
    const g = richtungAus(netz.pos, o, v);
    expect(g[0] + g[1] + g[2]).toBeCloseTo(0, 12);
    const w = richtungVektor(netz.pos, o, g);
    expect(ab(v, w)).toBeLessThan(1e-9);
    // ein Vektor mit einem Anteil aus der Haut heraus: Es bleibt sein Anteil in der Ebene
    const n = ortLage(netz.pos, o).map((x) => x / 100) as V3;
    const schief: V3 = [v[0] + 5 * n[0], v[1] + 5 * n[1], v[2] + 5 * n[2]];
    expect(ab(richtungVektor(netz.pos, o, richtungAus(netz.pos, o, schief)), v)).toBeLessThan(0.3);
    // das Netz um die x-Achse gedreht und doppelt so groß: Die Richtung geht mit, ohne dass ihre Zahlen sich ändern
    const co = Math.cos(0.7), si = Math.sin(0.7);
    const gedreht = Float64Array.from({ length: netz.pos.length }, (_, i) => {
      const p = [netz.pos[i - (i % 3)]!, netz.pos[i - (i % 3) + 1]!, netz.pos[i - (i % 3) + 2]!];
      return 2 * [p[0]!, co * p[1]! - si * p[2]!, si * p[1]! + co * p[2]!][i % 3]!;
    });
    const w2 = richtungVektor(gedreht, o, g);
    expect(ab(w2, [2 * v[0], 2 * (co * v[1] - si * v[2]), 2 * (si * v[1] + co * v[2])])).toBeLessThan(1e-9);
  });

  it('die Kurve zwischen zwei Punkten liegt auf der Haut, dicht genug, und folgt ihren Richtungen', () => {
    const A = ortBei(60, 0, 80);
    const B = ortBei(0, 60, 80);
    // ohne Richtungen: der gerade Weg über die Haut (hier ein Stück Großkreis)
    const gerade = stueckLegen(netz, nah, A, null, B, null);
    expect(gerade.length).toBeGreaterThan(40);
    const pA = ortLage(netz.pos, A), pB = ortLage(netz.pos, B);
    let vor = pA;
    let weit = 0;
    for (const o of gerade) {
      const p = ortLage(netz.pos, o);
      // auf dem Netz (das Netz liegt höchstens um seine Pfeilhöhe unter der Kugel)
      expect(laenge(p)).toBeGreaterThan(99.2);
      expect(laenge(p)).toBeLessThan(100.01);
      // in der Ebene durch A, B und die Mitte der Kugel (bis auf die Facetten des Netzes)
      const nx = pA[1] * pB[2] - pA[2] * pB[1], ny = pA[2] * pB[0] - pA[0] * pB[2], nz = pA[0] * pB[1] - pA[1] * pB[0];
      expect(Math.abs(p[0] * nx + p[1] * ny + p[2] * nz) / Math.hypot(nx, ny, nz)).toBeLessThan(0.5);
      weit = Math.max(weit, ab(vor, p));
      vor = p;
    }
    // (bestellt sind höchstens 1,5 Einheiten; durch das Halbieren liegt jede Probe nah an der Haut, bevor sie auf sie gelegt wird)
    // (auf dem groben Prüfnetz teilt eine Hälfte nicht immer genau in der Mitte: bis 2 statt 1,5)
    expect(Math.max(weit, ab(vor, pB))).toBeLessThan(2.2);
    // mit Richtungen: Die Kurve verlässt A längs seiner Richtung und baucht zur Seite aus
    const gA: V3 = [0, -40, 0];
    const gB: V3 = [-40, 0, 0];
    const rund = stueckLegen(netz, nah, A, gA, B, gB);
    const erste = ortLage(netz.pos, rund[0]!);
    const d: V3 = [erste[0] - pA[0], erste[1] - pA[1], erste[2] - pA[2]];
    // (die Richtung liegt nicht ganz in der Haut: verglichen wird ihr Anteil in der Haut)
    const nA = pA.map((x) => x / laenge(pA)) as V3;
    const gn = gA[0] * nA[0] + gA[1] * nA[1] + gA[2] * nA[2];
    const gT: V3 = [gA[0] - gn * nA[0], gA[1] - gn * nA[1], gA[2] - gn * nA[2]];
    expect((d[0] * gT[0] + d[1] * gT[1] + d[2] * gT[2]) / (laenge(d) * laenge(gT))).toBeGreaterThan(0.97);
    const mitteGerade = ortLage(netz.pos, gerade[Math.floor(gerade.length / 2)]!);
    const mitteRund = ortLage(netz.pos, rund[Math.floor(rund.length / 2)]!);
    expect(ab(mitteGerade, mitteRund)).toBeGreaterThan(10);
    for (const o of rund) expect(laenge(ortLage(netz.pos, o))).toBeGreaterThan(99.2);
  });

  it('an einem dünnen Teil bleibt die Kurve auf ihrer Seite', () => {
    // eine flache Linse: die Kugel in z auf ein Zwanzigstel gedrückt (10 Einheiten dick)
    const linse = { pos: Float64Array.from(netz.pos, (x, i) => (i % 3 === 2 ? x * 0.05 : x)), tri: netz.tri, n: netz.n };
    const nahL = naechsterAuf(linse);
    const auf = (x: number, y: number): Ort => {
      const r = nahL(x, y, 50, 0, 0, 1);
      return ortIn(linse, r.t, r.wa, r.wb, r.wc);
    };
    const A = auf(-50, 0);
    const B = auf(50, 0);
    expect(ortLage(linse.pos, A)[2]).toBeGreaterThan(0);
    // die Richtungen zeigen nach unten durch die Linse: Die Kurve im Raum läuft unter ihr durch
    const orte = stueckLegen(linse, nahL, A, [20, 0, -40], B, [-20, 0, -40]);
    expect(orte.length).toBeGreaterThan(20);
    for (const o of orte) expect(ortLage(linse.pos, o)[2]).toBeGreaterThan(0);
  });

  it('Punkte aus dem Verlauf: Ecken werden geknickte Punkte, ein Kreis bekommt runde in gleichen Abständen', () => {
    // ein Sechseck um den Pol (gerade Seiten über die Haut)
    const ecken = Array.from({ length: 6 }, (_, i) => ortBei(50 * Math.cos((i * Math.PI) / 3), 50 * Math.sin((i * Math.PI) / 3), 86.6));
    const st: Ort[] = [];
    ecken.forEach((e, i) => st.push(e, ...stueckLegen(netz, nah, e, null, ecken[(i + 1) % 6]!, null)));
    const P = punkteSchaetzen(netz, st, true, 80);
    expect(P.map((q) => q.knick)).toEqual([true, true, true, true, true, true]);
    expect(P[0]!.i).toBe(0);
    P.forEach((q, k) => expect(ab(ortLage(netz.pos, st[q.i]!), ortLage(netz.pos, ecken[k]!))).toBeLessThan(1e-9));
    // ein Kreis: keine Ecke, runde Punkte, die Richtungen längs der Linie und einander gegenüber
    const kr = kreis(70);
    const R = punkteSchaetzen(netz, kr, true, 30);
    const umfang = 2 * Math.PI * Math.sqrt(100 * 100 - 70 * 70);
    expect(R.length).toBe(Math.round(umfang / 30));
    for (const q of R) {
      expect(q.knick).toBe(false);
      const o = kr[q.i]!;
      const ein = richtungVektor(netz.pos, o, q.ein!);
      const aus = richtungVektor(netz.pos, o, q.aus!);
      expect((ein[0] * aus[0] + ein[1] * aus[1] + ein[2] * aus[2]) / (laenge(ein) * laenge(aus))).toBeLessThan(-0.99);
      // ein Drittel des Wegs zum nächsten Punkt
      expect(laenge(aus)).toBeGreaterThan(umfang / R.length / 3 - 1.5);
      expect(laenge(aus)).toBeLessThan(umfang / R.length / 3 + 1.5);
    }
    // offen: Anfang und Ende sind Punkte
    const offen = punkteSchaetzen(netz, kr.slice(0, 40), false, 30);
    expect(offen[0]!.i).toBe(0);
    expect(offen[offen.length - 1]!.i).toBe(39);
    expect(offen[0]!.ein).toBeNull();
    expect(offen[offen.length - 1]!.aus).toBeNull();
  });

  it('Punkte gehen durch Sichern und Laden und durch den Netzwechsel', () => {
    const k = karteVon(netz);
    let id = 1;
    const st = kreis(60, 90);
    const b = leereBemalung();
    b.ebenen[0]!.linien = linienAusTreffern(k, st, true, false, () => id++, [
      { i: 0, ein: [0, -20, 0], aus: [0, 20, 0], knick: false },
      { i: 30, ein: null, aus: [-5, -15, 0], knick: true },
      { i: 60, ein: null, aus: null, knick: true },
    ]);
    b.naechste = id;
    const l = b.ebenen[0]!.linien[0]!;
    expect(l.punkte.map((q) => q.i)).toEqual([0, 30, 60]);
    const vek = (bb: typeof b, pos: ArrayLike<number>, q: number, seite: 'ein' | 'aus'): V3 | null => {
      const L = bb.ebenen[0]!.linien[0]!;
      const g = L.punkte[q]![seite];
      return g ? richtungVektor(pos, L.stuetzen[L.punkte[q]!.i]!, g) : null;
    };
    // die Richtungen liegen in der Haut: der Anteil des Vektors in der Ebene seines Dreiecks
    expect(ab(vek(b, netz.pos, 0, 'aus')!, [0, 20, 0])).toBeLessThan(1.5);
    expect(vek(b, netz.pos, 1, 'ein')).toBeNull();
    // Sichern und Laden
    const d = alsDatei(b);
    expect(d.version).toBe(2);
    const zurueck = ausDatei(k, JSON.parse(JSON.stringify(d, (_, v) => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : typeof v === 'number' && Number.isNaN(v) ? 'NaN' : v)), (_, v) => (v === 'NaN' ? NaN : v)) as typeof d)!;
    expect(zurueck).not.toBeNull();
    const lz = zurueck.ebenen[0]!.linien[0]!;
    expect(lz.punkte.map((q) => [q.i, q.knick])).toEqual(l.punkte.map((q) => [q.i, q.knick]));
    for (let q = 0; q < 3; q++)
      for (const seite of ['ein', 'aus'] as const) {
        const a = vek(b, netz.pos, q, seite);
        const z = vek(zurueck, netz.pos, q, seite);
        if (!a) expect(z).toBeNull();
        else expect(ab(a, z!)).toBeLessThan(1e-9);
      }
    // eine Datei aus Etappe 1 (ohne Punkte) bekommt welche
    const alt = alsDatei(b);
    alt.version = 1;
    for (const li of alt.ebenen[0]!.linien) {
      delete li.p;
      delete li.g;
      delete li.k;
    }
    const geschaetzt = ausDatei(k, alt)!;
    expect(geschaetzt.ebenen[0]!.linien[0]!.punkte.length).toBeGreaterThan(3);
    expect(geschaetzt.ebenen[0]!.linien[0]!.punkte[0]!.i).toBe(0);
    // Netzwechsel: dasselbe Netz, um die z-Achse gedreht (die Punkte bleiben, die Haut hat sich bewegt): Die Richtung dreht mit
    const kopiert = kopie(b);
    const co = Math.cos(0.02), si = Math.sin(0.02);
    const neu = { pos: new Float64Array(netz.pos.length), tri: Uint32Array.from(netz.tri), n: netz.n };
    for (let i = 0; i < netz.n; i++) {
      neu.pos[3 * i] = co * netz.pos[3 * i]! - si * netz.pos[3 * i + 1]!;
      neu.pos[3 * i + 1] = si * netz.pos[3 * i]! + co * netz.pos[3 * i + 1]!;
      neu.pos[3 * i + 2] = netz.pos[3 * i + 2]!;
    }
    const vorher = vek(kopiert, netz.pos, 0, 'aus')!;
    const r = uebergeben(netz.pos, netz.n, karteVon(neu), naechsterAuf(neu), kopiert);
    expect(r.gesucht).toBe(0);
    const nachher = vek(kopiert, neu.pos, 0, 'aus')!;
    expect(ab(nachher, [co * vorher[0] - si * vorher[1], si * vorher[0] + co * vorher[1], vorher[2]])).toBeLessThan(1e-9);
    // und auf einem fremden Netz derselben Kugel (anders unterteilt): Die Richtung zeigt weiter dorthin
    const fremd = kugel(3);
    const b2 = kopie(b);
    const r2 = uebergeben(netz.pos, netz.n, karteVon(fremd), naechsterAuf(fremd), b2);
    expect(r2.gehalten).toBe(0);
    const v2 = vek(b2, fremd.pos, 0, 'aus')!;
    expect((v2[0] * vorher[0] + v2[1] * vorher[1] + v2[2] * vorher[2]) / (laenge(v2) * laenge(vorher))).toBeGreaterThan(0.99);
    expect(Math.abs(laenge(v2) - laenge(vorher))).toBeLessThan(1);
  });
});
