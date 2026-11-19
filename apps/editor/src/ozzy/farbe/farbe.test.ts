import { describe, expect, it } from 'vitest';
import { alsDatei, ausDatei, kopie, leereBemalung, linienAusTreffern, uebergeben } from './bemalung';
import { type Saat, flaechenRechnen, naechsteSeite } from './flaechen';
import { jeDreieck, kettenAller, stueckeVon } from './ketten';
import { type Karte, type Naechster, type Netz, type Ort, karteVon, ortGespiegelt, ortLage, spur } from './ort';

// ---------- Prüfnetz: eine Kugel aus einem unterteilten Oktaeder (spiegelgleich an z = 0, Punkte der Mitte genau in der Ebene) ----------

function kugel(stufen: number, r = 100, drehung = 0): Netz & { spiegel: Int32Array; pos: Float64Array; tri: Uint32Array } {
  let P: number[][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
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
  if (drehung) {
    const co = Math.cos(drehung), si = Math.sin(drehung);
    P = P.map(([x, y, z]) => [co * x! - si * y!, si * x! + co * y!, z!]);
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

/** der nächste Ort auf einem Netz, über alle Dreiecke (für Tests genügt das) */
function naechsterVon(netz: Netz): Naechster {
  const P = netz.pos;
  const I = netz.tri;
  return (x, y, z) => {
    let best = { t: 0, wa: 1, wb: 0, wc: 0, d2: Infinity };
    for (let t = 0; t < I.length / 3; t++) {
      const a = 3 * I[3 * t]!, b = 3 * I[3 * t + 1]!, c = 3 * I[3 * t + 2]!;
      const ab = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!];
      const ac = [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!];
      const ap = [x - P[a]!, y - P[a + 1]!, z - P[a + 2]!];
      const d00 = ab[0]! * ab[0]! + ab[1]! * ab[1]! + ab[2]! * ab[2]!;
      const d01 = ab[0]! * ac[0]! + ab[1]! * ac[1]! + ab[2]! * ac[2]!;
      const d11 = ac[0]! * ac[0]! + ac[1]! * ac[1]! + ac[2]! * ac[2]!;
      const d20 = ap[0]! * ab[0]! + ap[1]! * ab[1]! + ap[2]! * ab[2]!;
      const d21 = ap[0]! * ac[0]! + ap[1]! * ac[1]! + ap[2]! * ac[2]!;
      const den = d00 * d11 - d01 * d01;
      let wb = (d11 * d20 - d01 * d21) / den;
      let wc = (d00 * d21 - d01 * d20) / den;
      // (auf das Dreieck begrenzt: grob, für Punkte dicht an der Fläche genau genug)
      wb = Math.min(1, Math.max(0, wb));
      wc = Math.min(1 - wb, Math.max(0, wc));
      const q = [P[a]! + wb * ab[0]! + wc * ac[0]!, P[a + 1]! + wb * ab[1]! + wc * ac[1]!, P[a + 2]! + wb * ab[2]! + wc * ac[2]!];
      const d2 = (x - q[0]!) ** 2 + (y - q[1]!) ** 2 + (z - q[2]!) ** 2;
      if (d2 < best.d2) best = { t, wa: 1 - wb - wc, wb, wc, d2 };
    }
    return best;
  };
}

const ortBei = (netz: Netz, nah: Naechster, x: number, y: number, z: number): Ort => {
  const r = nah(x, y, z);
  return { t: r.t, e: [netz.tri[3 * r.t]!, netz.tri[3 * r.t + 1]!, netz.tri[3 * r.t + 2]!], w: [r.wa, r.wb, r.wc] };
};

/** ein Kreis um die z-Achse in der Höhe z0 (auf der Kugel mit Halbmesser r), als Treffer */
function kreisUmZ(netz: Netz, nah: Naechster, z0: number, r = 100, schritte = 96): Ort[] {
  const rho = Math.sqrt(r * r - z0 * z0);
  return Array.from({ length: schritte }, (_, i) => ortBei(netz, nah, rho * Math.cos((2 * Math.PI * i) / schritte), rho * Math.sin((2 * Math.PI * i) / schritte), z0));
}

/** Fläche eines Dreiecks */
function flaecheVon(netz: Netz, t: number): number {
  const P = netz.pos, I = netz.tri;
  const a = 3 * I[3 * t]!, b = 3 * I[3 * t + 1]!, c = 3 * I[3 * t + 2]!;
  const u = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!];
  const v = [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!];
  return Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!) / 2;
}

/** die gefärbte Fläche (Dreiecke ganz, Dreiecke mit Ketten nach Stichproben) und der Anteil falsch gefärbter Stichproben gegen `soll` */
function auswerten(k: Karte, fl: ReturnType<typeof flaechenRechnen>, soll: (p: [number, number, number]) => boolean, rand = 2): { flaeche: number; falsch: number; proben: number } {
  const netz = k.netz;
  let flaeche = 0, falsch = 0, proben = 0;
  const mitte = (t: number): [number, number, number] => ortLage(netz.pos, { t, e: [netz.tri[3 * t]!, netz.tri[3 * t + 1]!, netz.tri[3 * t + 2]!], w: [1 / 3, 1 / 3, 1 / 3] });
  const fern = (p: [number, number, number]): boolean => soll([p[0], p[1], p[2] + rand]) === soll([p[0], p[1], p[2] - rand]) && soll([p[0] + rand, p[1], p[2]]) === soll([p[0] - rand, p[1], p[2]]) && soll([p[0], p[1] + rand, p[2]]) === soll([p[0], p[1] - rand, p[2]]);
  const mit = new Set(fl.rand.map((r) => r.t));
  for (let t = 0; t < k.T; t++) {
    if (mit.has(t)) continue;
    const an = fl.ganz[t]! >= 0;
    if (an) flaeche += flaecheVon(netz, t);
    const p = mitte(t);
    if (fern(p)) {
      proben++;
      if (an !== soll(p)) falsch++;
    }
  }
  for (const r of fl.rand) {
    const A = flaecheVon(netz, r.t);
    const e: [number, number, number] = [netz.tri[3 * r.t]!, netz.tri[3 * r.t + 1]!, netz.tri[3 * r.t + 2]!];
    let drin = 0;
    const N = 12;
    let zahl = 0;
    for (let i = 0; i < N; i++)
      for (let j = 0; i + j < N; j++) {
        const b = (i + 1 / 3) / N, c = (j + 1 / 3) / N;
        const s = naechsteSeite(r.ketten, b, c);
        const an = (s.seite === 0 ? r.ketten[s.k]!.links : r.ketten[s.k]!.rechts) >= 0;
        zahl++;
        if (an) drin++;
        const p = ortLage(netz.pos, { t: r.t, e, w: [1 - b - c, b, c] });
        if (fern(p)) {
          proben++;
          if (an !== soll(p)) falsch++;
        }
      }
    flaeche += (A * drin) / zahl;
  }
  return { flaeche, falsch, proben };
}

describe('Farbe: Ort, Spur, Ketten, Flächen', () => {
  const netz = kugel(4);
  const k = karteVon(netz);
  const nah = naechsterVon(netz);

  it('die Spur zwischen zwei Orten läuft lückenlos von Dreieck zu Dreieck und bleibt nah am geraden Weg', () => {
    const A = ortBei(netz, nah, 30, 20, Math.sqrt(1e4 - 1300));
    const B = ortBei(netz, nah, 52, 31, Math.sqrt(1e4 - 52 * 52 - 31 * 31));
    const st = spur(k, A, B)!;
    expect(st).not.toBeNull();
    expect(st.length).toBeGreaterThan(2);
    const lage = (t: number, b: number, c: number): [number, number, number] => ortLage(netz.pos, { t, e: [netz.tri[3 * t]!, netz.tri[3 * t + 1]!, netz.tri[3 * t + 2]!], w: [1 - b - c, b, c] });
    const pa = ortLage(netz.pos, A), pb = ortLage(netz.pos, B);
    const lang = Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]);
    let weg = 0;
    for (let i = 0; i < st.length; i++) {
      const s = st[i]!;
      const p0 = lage(s.t, s.b0, s.c0), p1 = lage(s.t, s.b1, s.c1);
      weg += Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      if (i > 0) {
        // das Ende des Stücks davor und der Anfang dieses Stücks sind derselbe Punkt der Haut
        const v = st[i - 1]!;
        const q = lage(v.t, v.b1, v.c1);
        expect(Math.hypot(q[0] - p0[0], q[1] - p0[1], q[2] - p0[2])).toBeLessThan(1e-9);
        expect(v.aus).toBeGreaterThanOrEqual(0);
        expect(s.ein).toBeGreaterThanOrEqual(0);
        expect(k.nachbar[3 * v.t + v.aus]).toBe(3 * s.t + s.ein);
      }
    }
    expect(st[0]!.ein).toBe(-1);
    expect(st[st.length - 1]!.aus).toBe(-1);
    // kaum länger als die Sehne (ein Bogen über die Kugel)
    expect(weg).toBeGreaterThanOrEqual(lang - 1e-9);
    expect(weg).toBeLessThan(lang * 1.02);
  });

  it('ein Kreis um den Pol, innen gefüllt: die Kappe ist gefärbt, der Rest nicht, die Fläche stimmt', () => {
    let id = 1;
    const linien = linienAusTreffern(k, kreisUmZ(netz, nah, 60), true, false, () => id++);
    expect(linien).toHaveLength(1);
    const { ketten, fehl } = kettenAller(k, linien, false);
    expect(fehl).toHaveLength(0);
    // jede Kette geht von Kante zu Kante, nichts endet im Inneren
    for (const c of ketten) {
      expect(c.ein).toBeGreaterThanOrEqual(0);
      expect(c.aus).toBeGreaterThanOrEqual(0);
    }
    const saaten: Saat[] = [{ ort: ortBei(netz, nah, 0, 0, 100), farbe: 0 }];
    const fl = flaechenRechnen(k, ketten, saaten);
    const r = auswerten(k, fl, (p) => p[2] > 60);
    expect(r.proben).toBeGreaterThan(1500);
    expect(r.falsch).toBe(0);
    // Kappe der Kugel: 2 π r h (das Netz liegt etwas innerhalb der Kugel)
    const kappe = 2 * Math.PI * 100 * 40;
    expect(r.flaeche).toBeGreaterThan(0.97 * kappe);
    expect(r.flaeche).toBeLessThan(1.005 * kappe);
    // die andere Seite füllen: alles außer der Kappe
    const fl2 = flaechenRechnen(k, ketten, [{ ort: ortBei(netz, nah, 0, 0, -100), farbe: 3 }]);
    const r2 = auswerten(k, fl2, (p) => p[2] < 60);
    expect(r2.falsch).toBe(0);
    expect(r2.flaeche + r.flaeche).toBeGreaterThan(0.985 * 4 * Math.PI * 1e4);
    expect(r2.flaeche + r.flaeche).toBeLessThan(1.001 * 4 * Math.PI * 1e4);
  });

  it('gespiegelt: Die Linie auf der Hälfte z > 0 hat ihr Spiegelbild, beide Kappen sind gefärbt', () => {
    let id = 1;
    // (auf der anderen Hälfte gezeichnet: Sie landet auf der Hälfte z ≥ 0)
    const linien = linienAusTreffern(k, kreisUmZ(netz, nah, -60), true, true, () => id++);
    expect(linien).toHaveLength(1);
    for (const o of linien[0]!.stuetzen) expect(ortLage(netz.pos, o)[2]).toBeGreaterThan(50);
    const { ketten } = kettenAller(k, linien, true);
    expect(ketten.filter((c) => c.gespiegelt).length).toBe(ketten.filter((c) => !c.gespiegelt).length);
    const saat = ortBei(netz, nah, 0, 0, 100);
    const fl = flaechenRechnen(k, ketten, [
      { ort: saat, farbe: 1 },
      { ort: ortGespiegelt(k, saat)!, farbe: 1 },
    ]);
    const r = auswerten(k, fl, (p) => Math.abs(p[2]) > 60);
    expect(r.falsch).toBe(0);
    expect(r.flaeche).toBeGreaterThan(0.97 * 2 * 2 * Math.PI * 100 * 40);
  });

  it('über die Mitte gezeichnet: Es bleibt der Teil auf der Hälfte z ≥ 0, er endet auf der Ebene, und mit dem Spiegelbild ist die Fläche zu', () => {
    let id = 1;
    // ein Kreis um die x-Achse (x = 60): Er kreuzt die Mittelebene zweimal
    const rho = Math.sqrt(1e4 - 3600);
    const treffer = Array.from({ length: 96 }, (_, i) => ortBei(netz, nah, 60, rho * Math.cos((2 * Math.PI * (i + 0.37)) / 96), rho * Math.sin((2 * Math.PI * (i + 0.37)) / 96)));
    const linien = linienAusTreffern(k, treffer, true, true, () => id++);
    expect(linien).toHaveLength(1);
    const l = linien[0]!;
    expect(l.zu).toBe(false);
    const erster = ortLage(netz.pos, l.stuetzen[0]!), letzter = ortLage(netz.pos, l.stuetzen[l.stuetzen.length - 1]!);
    expect(Math.abs(erster[2])).toBeLessThan(1e-9);
    expect(Math.abs(letzter[2])).toBeLessThan(1e-9);
    for (const o of l.stuetzen) expect(ortLage(netz.pos, o)[2]).toBeGreaterThanOrEqual(-1e-9);
    const { ketten, fehl } = kettenAller(k, linien, true);
    expect(fehl).toHaveLength(0);
    for (const c of ketten) {
      expect(c.ein).toBeGreaterThanOrEqual(0);
      expect(c.aus).toBeGreaterThanOrEqual(0);
    }
    const saat = ortBei(netz, nah, 99, 5, 10);
    const fl = flaechenRechnen(k, ketten, [
      { ort: saat, farbe: 2 },
      { ort: ortGespiegelt(k, saat)!, farbe: 2 },
    ]);
    const r = auswerten(k, fl, (p) => p[0] > 60);
    expect(r.falsch).toBe(0);
    expect(r.flaeche).toBeGreaterThan(0.97 * 2 * Math.PI * 100 * 40);
    expect(r.flaeche).toBeLessThan(1.005 * 2 * Math.PI * 100 * 40);
  });

  it('ein kleiner geschlossener Zug in einem einzigen Dreieck: innen und außen sind getrennte Flächen', () => {
    const grob = kugel(1);
    const kg = karteVon(grob);
    const ng = naechsterVon(grob);
    // ein kleiner Kreis um einen Punkt mitten in einem großen Dreieck
    const m = ortBei(grob, ng, 57, 57, 57);
    const pm = ortLage(grob.pos, m);
    const u = [1, -1, 0].map((x) => x / Math.SQRT2), v = [1, 1, -2].map((x) => x / Math.sqrt(6));
    const treffer = Array.from({ length: 24 }, (_, i) => {
      const a = (2 * Math.PI * i) / 24;
      return ortBei(grob, ng, pm[0] + 6 * (Math.cos(a) * u[0]! + Math.sin(a) * v[0]!), pm[1] + 6 * (Math.cos(a) * u[1]! + Math.sin(a) * v[1]!), pm[2] + 6 * (Math.cos(a) * u[2]! + Math.sin(a) * v[2]!));
    });
    expect(new Set(treffer.map((o) => o.t)).size).toBe(1);
    let id = 1;
    const linien = linienAusTreffern(kg, treffer, true, false, () => id++);
    const { ketten } = kettenAller(kg, linien, false);
    expect(ketten).toHaveLength(1);
    expect(ketten[0]!.zu).toBe(true);
    const innen = flaechenRechnen(kg, ketten, [{ ort: m, farbe: 0 }]);
    expect(Array.from(innen.ganz).every((f) => f < 0)).toBe(true);
    const c = innen.rand[0]!.ketten[0]!;
    expect([c.links, c.rechts].sort()).toEqual([-1, 0]);
    const aussen = flaechenRechnen(kg, ketten, [{ ort: ortBei(grob, ng, -57, -57, -57), farbe: 5 }]);
    expect(Array.from(aussen.ganz).filter((f, t) => t !== m.t).every((f) => f === 5)).toBe(true);
    const d = aussen.rand[0]!.ketten[0]!;
    expect([d.links, d.rechts].sort()).toEqual([-1, 5]);
    // dieselbe Seite ist innen gefärbt und außen leer, und umgekehrt
    expect(c.links >= 0).toBe(d.links < 0);
  });

  it('Netzwechsel: Auf einem anders unterteilten Netz derselben Kugel liegt die Bemalung an derselben Stelle', () => {
    let id = 1;
    const b = leereBemalung();
    b.ebenen[0]!.linien = linienAusTreffern(k, kreisUmZ(netz, nah, 60), true, true, () => id++);
    b.ebenen[0]!.fuellungen = [{ id: id++, saat: ortBei(netz, nah, 0, 0, 100), farbe: [1, 0.5, 0] }];
    const vorher = b.ebenen[0]!.linien[0]!.stuetzen.map((o) => ortLage(netz.pos, o));
    const sicher = kopie(b);
    // dieselbe Kugel, anders unterteilt (um die z-Achse gedreht: spiegelgleich bleibt sie)
    const neu = kugel(4, 100, 0.3);
    const kn = karteVon(neu);
    const weit = uebergeben(netz.pos, kn, naechsterVon(neu), b);
    // die zwei Netze liegen höchstens um die Pfeilhöhe eines Dreiecks auseinander
    expect(weit).toBeLessThan(0.5);
    const nachher = b.ebenen[0]!.linien[0]!.stuetzen.map((o) => ortLage(neu.pos, o));
    let groesst = 0;
    vorher.forEach((p, i) => (groesst = Math.max(groesst, Math.hypot(p[0] - nachher[i]![0], p[1] - nachher[i]![1], p[2] - nachher[i]![2]))));
    expect(groesst).toBeLessThan(0.5);
    const { ketten, fehl } = kettenAller(kn, b.ebenen[0]!.linien, true);
    expect(fehl).toHaveLength(0);
    const saat = b.ebenen[0]!.fuellungen[0]!.saat;
    const fl = flaechenRechnen(kn, ketten, [
      { ort: saat, farbe: 0 },
      { ort: ortGespiegelt(kn, saat)!, farbe: 0 },
    ]);
    const r = auswerten(kn, fl, (p) => Math.abs(p[2]) > 60);
    expect(r.falsch).toBe(0);
    // die Kopie von vorher ist unberührt (für ⌘Z)
    expect(sicher.ebenen[0]!.linien[0]!.stuetzen[0]!.t).not.toBe(-1);
    expect(sicher.ebenen[0]!.linien[0]!.stuetzen.map((o) => ortLage(netz.pos, o))).toEqual(vorher);
  });

  it('Sichern und Laden: Die Bemalung kommt Ort für Ort zurück; auf einem fremden Netz wird sie abgewiesen', () => {
    let id = 1;
    const b = leereBemalung();
    b.ebenen[0]!.linien = linienAusTreffern(k, kreisUmZ(netz, nah, 60), true, true, () => id++);
    b.ebenen[0]!.fuellungen = [{ id: id++, saat: ortBei(netz, nah, 0, 0, 100), farbe: [0.2, 0.4, 0.6] }];
    b.naechste = id;
    const d = alsDatei(b);
    const zurueck = ausDatei(k, JSON.parse(JSON.stringify(d, (_, v) => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v))) as typeof d)!;
    expect(zurueck).not.toBeNull();
    expect(zurueck.naechste).toBe(b.naechste);
    const vor = b.ebenen[0]!.linien[0]!.stuetzen, nach = zurueck.ebenen[0]!.linien[0]!.stuetzen;
    expect(nach).toHaveLength(vor.length);
    vor.forEach((o, i) => expect(ortLage(netz.pos, nach[i]!)).toEqual(ortLage(netz.pos, o)));
    expect(zurueck.ebenen[0]!.fuellungen[0]!.farbe).toEqual([0.2, 0.4, 0.6]);
    expect(ausDatei(karteVon(kugel(3)), d)).toBeNull();
  });

  it('die Ketten eines Dreiecks stehen zusammen, und die Stücke einer Linie lassen sich immer finden', () => {
    let id = 1;
    const linien = [...linienAusTreffern(k, kreisUmZ(netz, nah, 60), true, false, () => id++), ...linienAusTreffern(k, kreisUmZ(netz, nah, 20, 100, 160), true, false, () => id++)];
    for (const l of linien) expect(stueckeVon(k, l)).not.toBeNull();
    const { ketten } = kettenAller(k, linien, false);
    const kd = jeDreieck(ketten);
    let summe = 0;
    for (const liste of kd.values()) summe += liste.length;
    expect(summe).toBe(ketten.length);
    // zwei Linien, drei Flächen: Kappe, Gürtel, Rest; der Gürtel wird gefüllt
    const fl = flaechenRechnen(k, ketten, [{ ort: ortBei(netz, nah, Math.sqrt(1e4 - 1600), 0, 40), farbe: 7 }]);
    const r = auswerten(k, fl, (p) => p[2] > 20 && p[2] < 60);
    expect(r.falsch).toBe(0);
    expect(r.flaeche).toBeGreaterThan(0.97 * 2 * Math.PI * 100 * 40);
    expect(r.flaeche).toBeLessThan(1.005 * 2 * Math.PI * 100 * 40);
  });
});
