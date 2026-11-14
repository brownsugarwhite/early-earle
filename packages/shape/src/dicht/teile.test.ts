import { describe, expect, it } from 'vitest';
import { formAusAnsichten, formAusTeilen } from './gleich';
import { umrissLinie } from './raumlinien';
import { rundAusSeite, rundAusTeilen } from './rund';
import { dichtNachLage } from './netzpruefung';
import { anEinbuchtungTeilen, anNahtTeilen, einbuchtungen } from './teile';
import { type UmrissPunkt, umrissAbtasten, umrissStuecke } from './umriss';

/** Kopf über dem Bauch: zwischen ihnen eine Einbuchtung von vorn (links), Spitze bei (−50, 15) */
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
const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
const innen = (P: readonly { x: number; y: number }[], x: number, y: number) => {
  let d = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i]!;
    const b = P[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) d = !d;
  }
  return d;
};

describe('Teile: an Einbuchtung oder Naht geteilt, zu einem Netz vereinigt', () => {
  it('Kopf über Bauch: die Einbuchtung ist tiefer als breit, die Teile decken genau die alte Form', () => {
    const e = einbuchtungen(kopfUeberBauch)[0]!;
    expect(e.verhaeltnis).toBeGreaterThan(1);
    expect(anEinbuchtungTeilen(kopfUeberBauch, e.verhaeltnis + 0.1)).toBeNull();
    const t = anEinbuchtungTeilen(kopfUeberBauch, 1)!;
    expect(t).not.toBeNull();
    const alt = umrissAbtasten(kopfUeberBauch, 1).punkte;
    const a = umrissAbtasten(t.koerper, 1).punkte;
    const b = umrissAbtasten(t.teil, 1).punkte;
    // Raster über die alte Form: innen genau dann, wenn in einem der Teile (bis an den Rand: 2 Einheiten Abstand)
    let falsch = 0;
    let doppelt = 0;
    for (let x = -210; x <= 160; x += 4) {
      for (let y = -160; y <= 160; y += 4) {
        const randNah = alt.some((q) => Math.hypot(q.x - x, q.y - y) < 2);
        if (randNah) continue;
        const i0 = innen(alt, x, y);
        const ia = innen(a, x, y);
        const ib = innen(b, x, y);
        if (i0 !== (ia || ib)) falsch++;
        if (ia && ib) doppelt++;
      }
    }
    expect(falsch).toBe(0);
    // an der Naht überdecken sich die Teile (keine Rille)
    expect(doppelt).toBeGreaterThan(10);
  });

  it('an der Spitze bleibt die Linie, wie sie war, und die geteilte Einbuchtung teilt nicht noch einmal', () => {
    const t = anEinbuchtungTeilen(kopfUeberBauch, 1)!;
    const alt = umrissStuecke(kopfUeberBauch);
    const stueck = (u: UmrissPunkt[], a: UmrissPunkt, b: UmrissPunkt) =>
      umrissStuecke(u).find((s) => s[0].x === a.x && s[0].y === a.y && s[3].x === b.x && s[3].y === b.y);
    const gleich = (s: readonly { x: number; y: number }[] | undefined, r: readonly { x: number; y: number }[]) => {
      expect(s).toBeDefined();
      s!.forEach((q, i) => {
        expect(q.x).toBeCloseTo(r[i]!.x, 9);
        expect(q.y).toBeCloseTo(r[i]!.y, 9);
      });
    };
    // der Kopf endet mit seiner Unterseite an der Spitze, der Bauch beginnt dort mit seiner Oberseite
    gleich(stueck(t.teil, kopfUeberBauch[6]!, kopfUeberBauch[7]!), alt[6]!);
    gleich(stueck(t.koerper, kopfUeberBauch[7]!, kopfUeberBauch[8]!), alt[7]!);
    expect(einbuchtungen(t.koerper)[0]?.verhaeltnis ?? 0).toBeLessThan(0.05);
    expect(anEinbuchtungTeilen(t.koerper, 0.05)).toBeNull();
  });

  it('Kopf über Bauch als zwei Teile: ein dichtes Netz, von der Seite die alte Form', () => {
    const t = anEinbuchtungTeilen(kopfUeberBauch, 1)!;
    const g = formAusTeilen([{ seite: [t.koerper] }, { seite: [t.teil] }], { dreiecke: 16000 });
    expect(dichtNachLage([{ p: g.positionen, i: g.indizes }])).toEqual({ offen: 0, mehr: 0 });
    // die Seite zeigt die alte Form: kein Punkt weiter als eine Rasterweite außerhalb
    const alt = umrissAbtasten(kopfUeberBauch, 1).punkte;
    let draussen = 0;
    for (let v = 0; v < g.positionen.length / 3; v++) {
      const x = g.positionen[3 * v]!;
      const y = g.positionen[3 * v + 1]!;
      if (innen(alt, x, y)) continue;
      if (alt.every((q) => Math.hypot(q.x - x, q.y - y) > g.zelle)) draussen++;
    }
    expect(draussen).toBe(0);
  });

  it('jedes Teil hat sein eigenes Top: der Kopf schmal, der Bauch bleibt', () => {
    const t = anEinbuchtungTeilen(kopfUeberBauch, 1)!;
    const breit = formAusTeilen([{ seite: [t.koerper] }, { seite: [t.teil] }], { dreiecke: 16000 });
    // Top des Kopfs: ein schmales Oval über seiner Länge (x von −200 bis −40, halbe Breite 25)
    const kopfTop: UmrissPunkt[] = [
      { x: -205, y: 0 },
      { x: -120, y: 25 },
      { x: -30, y: 0 },
      { x: -120, y: -25 },
    ];
    const schmal = formAusTeilen([{ seite: [t.koerper] }, { seite: [t.teil], top: [kopfTop] }], { dreiecke: 16000 });
    const tiefe = (g: typeof breit, sel: (x: number, y: number) => boolean) => {
      let z = 0;
      for (let v = 0; v < g.positionen.length / 3; v++) {
        if (sel(g.positionen[3 * v]!, g.positionen[3 * v + 1]!)) z = Math.max(z, Math.abs(g.positionen[3 * v + 2]!));
      }
      return z;
    };
    // vorn am Kopf (oberhalb der Naht, vor dem Körper) ist er schmal, unten am Bauch unverändert
    const kopf = (x: number, y: number) => x < -150 && y > 40;
    const bauch = (x: number, y: number) => x < -100 && y < -60;
    expect(tiefe(schmal, kopf)).toBeLessThan(30);
    expect(tiefe(breit, kopf)).toBeGreaterThan(40);
    expect(Math.abs(tiefe(schmal, bauch) - tiefe(breit, bauch))).toBeLessThan(1);
  });

  it('Naht von Hand: eine Kugel senkrecht geteilt, zusammen wieder die Kugel', () => {
    const t = anNahtTeilen(kreis(150), { x: 40, y: 200 }, { x: 40, y: -200 })!;
    expect(t).not.toBeNull();
    const ganz = formAusAnsichten({ seite: [kreis(150)] }, { dreiecke: 16000 });
    const g = formAusTeilen([{ seite: [t.koerper] }, { seite: [t.teil] }], { dreiecke: 16000 });
    expect(dichtNachLage([{ p: g.positionen, i: g.indizes }])).toEqual({ offen: 0, mehr: 0 });
    const rMax = (q: Float32Array) => {
      let r = 0;
      for (let v = 0; v < q.length / 3; v++) r = Math.max(r, Math.hypot(q[3 * v]!, q[3 * v + 1]!, q[3 * v + 2]!));
      return r;
    };
    // keine Kerbe an der Naht: der kleinste Abstand zur Mitte bleibt nahe der Kugel
    const rMin = (q: Float32Array) => {
      let r = Infinity;
      for (let v = 0; v < q.length / 3; v++) r = Math.min(r, Math.hypot(q[3 * v]!, q[3 * v + 1]!, q[3 * v + 2]!));
      return r;
    };
    expect(rMax(g.positionen)).toBeLessThan(rMax(ganz.positionen) + 1);
    expect(rMin(g.positionen)).toBeGreaterThan(rMin(ganz.positionen) - 0.15 * 150);
  });
});

describe('Teile in „Linien auf der Form“: jedes Teil mit eigenen Linien, zusammen die größte Tiefe', () => {
  it('ein einziges Teil ist der runde Körper der Seite (ohne Linien bitgleich, mit Linien dieselbe Fläche)', () => {
    const a = rundAusTeilen([{ punkte: kopfUeberBauch }], { dreiecke: 6000 });
    const b = rundAusSeite(kopfUeberBauch, { dreiecke: 6000 });
    expect(a.positionen).toEqual(b.positionen);
    expect(a.indizes).toEqual(b.indizes);
    expect(a.normalen).toEqual(b.normalen);
    // mit Linien wird die gestreckte Fläche selbst vernetzt (jedes Teil hat seine eigene Streckung): andere Punkte, dieselbe Tiefe
    const linie = umrissLinie(b.kontur!, 'top', 3)!;
    linie.punkte = linie.punkte.map((q) => ({ ...q, z: 1.3 * q.z }));
    const c = rundAusTeilen([{ punkte: kopfUeberBauch, raumlinien: [linie] }], { dreiecke: 6000 });
    const d = rundAusSeite(kopfUeberBauch, { dreiecke: 6000, raumlinien: [linie] });
    expect(c.konturen[0]!.Z).toEqual(d.kontur!.Z);
    const zMax = (p: Float32Array) => p.reduce((m, v, i) => (i % 3 === 2 ? Math.max(m, Math.abs(v)) : m), 0);
    expect(Math.abs(zMax(c.positionen) - zMax(d.positionen))).toBeLessThan(0.01 * zMax(d.positionen));
    expect(dichtNachLage([{ p: c.positionen, i: c.indizes }])).toEqual({ offen: 0, mehr: 0 });
  });

  it('Kopf über Bauch: dicht, der Kopf mit eigener Linie schmaler, der Bauch bleibt', () => {
    const t = anEinbuchtungTeilen(kopfUeberBauch, 1)!;
    const rund = rundAusTeilen([{ punkte: t.koerper }, { punkte: t.teil }], { dreiecke: 16000 });
    expect(dichtNachLage([{ p: rund.positionen, i: rund.indizes }])).toEqual({ offen: 0, mehr: 0 });
    expect(rund.konturen).toHaveLength(2);
    // die Linie, die der Kopf von oben zeigt, auf 60 % seiner Tiefe
    const linie = umrissLinie(rund.konturen[1]!, 'top', 3)!;
    linie.punkte = linie.punkte.map((q) => ({ ...q, z: 0.6 * q.z }));
    const schmal = rundAusTeilen([{ punkte: t.koerper }, { punkte: t.teil, raumlinien: [linie] }], { dreiecke: 16000 });
    expect(dichtNachLage([{ p: schmal.positionen, i: schmal.indizes }])).toEqual({ offen: 0, mehr: 0 });
    const tiefe = (g: { positionen: Float32Array }, sel: (x: number, y: number) => boolean) => {
      let z = 0;
      for (let v = 0; v < g.positionen.length / 3; v++) {
        if (sel(g.positionen[3 * v]!, g.positionen[3 * v + 1]!)) z = Math.max(z, Math.abs(g.positionen[3 * v + 2]!));
      }
      return z;
    };
    const kopf = (x: number, y: number) => x < -150 && y > 40;
    const bauch = (x: number, y: number) => x < -100 && y < -60;
    expect(tiefe(schmal, kopf)).toBeLessThan(0.7 * tiefe(rund, kopf));
    expect(Math.abs(tiefe(schmal, bauch) - tiefe(rund, bauch))).toBeLessThan(0.5);
    // die Seite zeigt weiter die Form beider Teile: kein Punkt weiter als eine Rasterweite außerhalb
    const alt = umrissAbtasten(kopfUeberBauch, 1).punkte;
    let draussen = 0;
    for (let v = 0; v < schmal.positionen.length / 3; v++) {
      const x = schmal.positionen[3 * v]!;
      const y = schmal.positionen[3 * v + 1]!;
      if (!innen(alt, x, y) && alt.every((q) => Math.hypot(q.x - x, q.y - y) > schmal.zelle)) draussen++;
    }
    expect(draussen).toBe(0);
  });
});
