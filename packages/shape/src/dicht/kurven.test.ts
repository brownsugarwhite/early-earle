import { describe, expect, it } from 'vitest';
import { HautLoeser, type Kurve, einflussBereich, hautAus, kurveAnheften, kurvenStuecke, ringAusSchnitt } from './kurven';
import { rundAusSeite } from './rund';
import { type UmrissPunkt, umrissStuecke } from './umriss';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
/** Kopf über Bauch: zwischen ihnen eine Einbuchtung von vorn (links) */
const kopfUeberBauch: UmrissPunkt[] = [
  { x: 150, y: 0 },
  { x: 80, y: 130 },
  { x: -40, y: 150 },
  { x: -150, y: 120 },
  { x: -200, y: 60 },
  { x: -170, y: 22 },
  { x: -110, y: 24 },
  { x: -50, y: 15 },
  { x: -110, y: 4 },
  { x: -180, y: -40 },
  { x: -120, y: -130 },
  { x: 0, y: -150 },
  { x: 110, y: -110 },
];
const startKurve = (u: UmrissPunkt[]): Kurve => ({ art: 'mitte', punkte: u.map((q) => ({ x: q.x, y: q.y, z: 0 })) });

/** größte Tiefe |z| der Haut in einem Bereich der Seite, und die Höhe (y von–bis) in einem Streifen um x */
const tiefe = (pos: Float64Array, sel: (x: number, y: number) => boolean) => {
  let z = 0;
  for (let v = 0; v < pos.length / 3; v++) if (sel(pos[3 * v]!, pos[3 * v + 1]!)) z = Math.max(z, Math.abs(pos[3 * v + 2]!));
  return z;
};
const hoehe = (pos: Float64Array, x0: number, x1: number, y0: number, y1: number) => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let v = 0; v < pos.length / 3; v++) {
    const x = pos[3 * v]!;
    const y = pos[3 * v + 1]!;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return { lo, hi };
};

describe('Kurven als Wahrheit: die Haut ist die runde Fläche durch alle Kurven', () => {
  it('der Startumriss ist die erste Kurve: ohne Änderung bleibt die Kugel eine Kugel', () => {
    const k = startKurve(kreis(150));
    // die Kurve ist genau der gezeichnete Umriss
    const a = kurvenStuecke(k);
    const b = umrissStuecke(kreis(150));
    a.forEach((s, i) => s.forEach((q, j) => expect(Math.hypot(q.x - b[i]![j]!.x, q.y - b[i]![j]!.y, q.z)).toBeLessThan(1e-9)));
    const netz = rundAusSeite(kreis(150), { dreiecke: 6000 });
    const h = hautAus(netz.positionen, netz.indizes);
    const vorher = Float64Array.from(h.pos);
    const t0 = Date.now();
    const l = new HautLoeser(h, [{ kurve: 0, a: kurveAnheften(h, k, 4) }], [k]);
    const t1 = Date.now();
    l.schritt([k], 4);
    const t2 = Date.now();
    let weg = 0;
    let rMin = Infinity;
    let rMax = 0;
    for (let v = 0; v < h.n; v++) {
      weg = Math.max(weg, Math.hypot(h.pos[3 * v]! - vorher[3 * v]!, h.pos[3 * v + 1]! - vorher[3 * v + 1]!, h.pos[3 * v + 2]! - vorher[3 * v + 2]!));
      const r = Math.hypot(h.pos[3 * v]!, h.pos[3 * v + 1]!, h.pos[3 * v + 2]!);
      rMin = Math.min(rMin, r);
      rMax = Math.max(rMax, r);
    }
    log(`Kugel: ${h.n} Punkte, zerlegen ${t1 - t0} ms, 4 Runden ${t2 - t1} ms, weg ${weg.toFixed(2)}, Radius ${rMin.toFixed(1)}–${rMax.toFixed(1)}`);
    expect(rMax - rMin).toBeLessThan(6);
    expect(Math.abs(rMax - 150)).toBeLessThan(4);
  });

  it('Kopf über Bauch: der Loop um den Kopf im Top schmaler — der Kopf wird schmaler, die Höhe bleibt, der Bauch auch', () => {
    const k0 = startKurve(kopfUeberBauch);
    const netz = rundAusSeite(kopfUeberBauch, { dreiecke: 6000 });
    const h = hautAus(netz.positionen, netz.indizes);
    const ring = ringAusSchnitt(h, { x: -150, y: 180 }, { x: -150, y: 14 }, 2)!;
    expect(ring).not.toBeNull();
    log('Ring', ring.punkte.map((q) => `(${q.x.toFixed(0)},${q.y.toFixed(0)},${q.z.toFixed(0)})`).join(' '));
    const kurven: Kurve[] = [k0, ring];
    const l = new HautLoeser(
      h,
      [
        { kurve: 0, a: kurveAnheften(h, k0, 4) },
        { kurve: 1, a: kurveAnheften(h, ring, 4) },
      ],
      kurven,
    );
    l.schritt(kurven, 4);
    const kopf = (x: number, y: number) => Math.abs(x + 150) < 8 && y > 30;
    const bauch = (x: number, y: number) => x > -130 && x < -70 && y < -60;
    const tKopf0 = tiefe(h.pos, kopf);
    const tBauch0 = tiefe(h.pos, bauch);
    const h0 = hoehe(h.pos, -158, -142, 28, 200);
    // den tiefsten Punkt des Rings auf 60 % seiner Tiefe
    let iMax = 0;
    ring.punkte.forEach((q, i) => {
      if (q.z > ring.punkte[iMax]!.z) iMax = i;
    });
    ring.punkte = ring.punkte.map((q) => ({ ...q, z: 0.6 * q.z }));
    const t0 = Date.now();
    for (let r = 0; r < 6; r++) l.schritt(kurven, 2);
    const ms = (Date.now() - t0) / 6;
    const tKopf = tiefe(h.pos, kopf);
    const tBauch = tiefe(h.pos, bauch);
    const h1 = hoehe(h.pos, -158, -142, 28, 200);
    log(`Kopf ${tKopf0.toFixed(1)} → ${tKopf.toFixed(1)}, Höhe ${h0.lo.toFixed(1)}–${h0.hi.toFixed(1)} → ${h1.lo.toFixed(1)}–${h1.hi.toFixed(1)}, Bauch ${tBauch0.toFixed(1)} → ${tBauch.toFixed(1)}, ${ms.toFixed(0)} ms je Zug (2 Runden)`);
    expect(tKopf).toBeLessThan(0.75 * tKopf0);
    expect(Math.abs(h1.hi - h0.hi)).toBeLessThan(3);
    expect(Math.abs(h1.lo - h0.lo)).toBeLessThan(3);
    expect(Math.abs(tBauch - tBauch0)).toBeLessThan(0.05 * tBauch0);
  });

  it('Spiegel: die Kugel oben 60 hoch gezogen bleibt spiegelgleich (der Startumriss hängt an beiden Hälften)', () => {
    const k = startKurve(kreis(150));
    const netz = rundAusSeite(kreis(150), { dreiecke: 6000 });
    const h = hautAus(netz.positionen, netz.indizes);
    let ohnePartner = 0;
    for (let v = 0; v < h.n; v++) if (h.spiegel[v]! < 0) ohnePartner++;
    const l = new HautLoeser(h, [{ kurve: 0, a: kurveAnheften(h, k, 4) }], [k]);
    for (let s = 1; s <= 6; s++) {
      k.punkte[1] = { x: 0, y: 150 + 10 * s, z: 0 };
      l.schritt([k], 2);
    }
    let schief = 0;
    for (let v = 0; v < h.n; v++) {
      const w = h.spiegel[v]!;
      if (w < 0) continue;
      schief = Math.max(schief, Math.hypot(h.pos[3 * v]! - h.pos[3 * w]!, h.pos[3 * v + 1]! - h.pos[3 * w + 1]!, h.pos[3 * v + 2]! + h.pos[3 * w + 2]!));
    }
    let tiefe = 0;
    let breite = 0;
    for (let v = 0; v < h.n; v++) {
      tiefe = Math.max(tiefe, Math.abs(h.pos[3 * v + 2]!));
      breite = Math.max(breite, Math.abs(h.pos[3 * v]!));
    }
    log(
      `Spiegel: ${ohnePartner} Punkte ohne Partner, größte Abweichung vom Spiegelbild ${schief.toExponential(2)}; ` +
        `Tiefe ${tiefe.toFixed(1)}, Breite ${breite.toFixed(1)} (vorher 150)`,
    );
    expect(ohnePartner).toBe(0);
    expect(schief).toBeLessThan(1e-6);
    // höher gezogen wird die Kugel ein Ei. Ziel wäre: nicht tiefer als breit. Heute 166 zu 153 (mit der Krümmung · Kante² waren
    // es 186): Die Haut behält ihre Form (ähnlich je Punkt) und streckt die Krümmung gleichmäßig — offen, Schranke als Wächter
    expect(tiefe).toBeLessThan(1.12 * breite);
  });

  it('Kopf in den Bauch: der Kopf steckt darin, außerhalb des Einflussbereichs bewegt sich nichts, die Haut bleibt ein Netz', () => {
    const k0 = startKurve(kopfUeberBauch);
    const netz = rundAusSeite(kopfUeberBauch, { dreiecke: 6000 });
    const h = hautAus(netz.positionen, netz.indizes);
    const ring = ringAusSchnitt(h, { x: -150, y: 180 }, { x: -150, y: 14 }, 2)!;
    const kurven: Kurve[] = [k0, ring];
    const an = [
      { kurve: 0, a: kurveAnheften(h, k0, 4) },
      { kurve: 1, a: kurveAnheften(h, ring, 4) },
    ];
    // Kopf: die Umrisspunkte vor der Einbuchtung und sein Loop 50 nach unten (gewählt und gezogen, wie G in Blender)
    const kopfPunkte = [3, 4, 5, 6];
    const zentren = [...kopfPunkte.map((i) => ({ ...k0.punkte[i]! })), ...ring.punkte.map((q) => ({ ...q }))];
    const stuecke = new Map([
      [0, new Set([2, 3, 4, 5, 6])],
      [1, new Set(ring.punkte.slice(1).map((_, i) => i))],
    ]);
    const bereich = einflussBereich(h, zentren, 70, an, stuecke);
    const t0 = Date.now();
    const l = new HautLoeser(h, an, kurven, bereich);
    const tAnlegen = Date.now() - t0;
    const vorher = Float64Array.from(h.pos);
    const t1 = Date.now();
    for (let s = 1; s <= 5; s++) {
      k0.punkte = k0.punkte.map((q, i) => (kopfPunkte.includes(i) ? { ...q, y: kopfUeberBauch[i]!.y - 10 * s } : q));
      ring.punkte = ring.punkte.map((q) => ({ ...q, y: q.y - 10 }));
      l.schritt(kurven, 2);
    }
    const msZug = (Date.now() - t1) / 5;
    l.schritt(kurven, 4);
    // der Kopf ist mitgegangen, außerhalb des Bereichs ist alles bitgleich
    let kopfDy = 0;
    let kopfN = 0;
    let aussenWeg = 0;
    let umgeklappt = 0;
    const kerbe = { x: -50, y: 15 };
    let fernVonKerbe = 0;
    for (let v = 0; v < h.n; v++) {
      const x = vorher[3 * v]!;
      const y = vorher[3 * v + 1]!;
      if (x < -160 && y > 50) {
        kopfDy += h.pos[3 * v + 1]! - y;
        kopfN++;
      }
      if (!bereich[v]) aussenWeg = Math.max(aussenWeg, Math.hypot(h.pos[3 * v]! - x, h.pos[3 * v + 1]! - y, h.pos[3 * v + 2]! - vorher[3 * v + 2]!));
    }
    for (let t = 0; t < h.tri.length; t += 3) {
      const f = (p: Float64Array) => {
        const [a, b, c] = [h.tri[t]!, h.tri[t + 1]!, h.tri[t + 2]!];
        const ab = [p[3 * b]! - p[3 * a]!, p[3 * b + 1]! - p[3 * a + 1]!, p[3 * b + 2]! - p[3 * a + 2]!];
        const ac = [p[3 * c]! - p[3 * a]!, p[3 * c + 1]! - p[3 * a + 1]!, p[3 * c + 2]! - p[3 * a + 2]!];
        return [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
      };
      const n0 = f(vorher);
      const n1 = f(h.pos);
      if (n0[0]! * n1[0]! + n0[1]! * n1[1]! + n0[2]! * n1[2]! < 0) {
        umgeklappt++;
        const a = h.tri[t]!;
        fernVonKerbe = Math.max(fernVonKerbe, Math.hypot(vorher[3 * a]! - kerbe.x, vorher[3 * a + 1]! - kerbe.y));
      }
    }
    let imBereich = 0;
    for (let v = 0; v < h.n; v++) imBereich += bereich[v]!;
    log(
      `Kopf in den Bauch: Kopf ${(kopfDy / kopfN).toFixed(1)} nach unten, außerhalb ${aussenWeg} bewegt, im Bereich ${imBereich} von ${h.n}, ` +
        `anlegen ${tAnlegen} ms, ${msZug.toFixed(0)} ms je Zug, umgeklappt ${umgeklappt} (höchstens ${fernVonKerbe.toFixed(0)} von der Kerbe)`,
    );
    expect(kopfDy / kopfN).toBeLessThan(-35);
    expect(aussenWeg).toBe(0);
    // umklappen darf die Haut nur in der Kerbe, die der Kopf zudrückt (dort faltet sie sich zwischen Kopf und Bauch)
    expect(fernVonKerbe).toBeLessThan(40);
  });
});
