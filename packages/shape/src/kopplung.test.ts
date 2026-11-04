import { describe, expect, it } from 'vitest';
import { neuesDokument } from './dokument';
import { KOPPEL_BAND, abgleichen, abweichung, angleichen, ausdehnung } from './kopplung';
import { type Profil, START_RADIUS, bewegeGriff, bewegeKnoten } from './profil';

const r = START_RADIUS;

describe('Kopplung der Ansichten', () => {
  it('Startkugel ist stimmig', () => {
    expect(abweichung(neuesDokument().profile)).toBeLessThan(1e-3);
  });

  it('Front: oberen Punkt hochziehen hebt die Seite mit (gleiche Höhe), Top bleibt', () => {
    const p = neuesDokument().profile;
    const front = bewegeKnoten(p.front, 0, { x: 0, y: 0.75 });
    const g = abgleichen({ ...p, front }, 'front');
    expect(ausdehnung(g.seite, 'y')[1]).toBeCloseTo(0.75, 5);
    expect(ausdehnung(g.seite, 'y')[0]).toBeCloseTo(0, 3);
    expect(g.top).toEqual(p.top);
    expect(abweichung(g)).toBeLessThan(1e-4);
  });

  it('Front: Flanke rausziehen macht das Top breiter, die Seite bleibt', () => {
    const p = neuesDokument().profile;
    const front = bewegeKnoten(p.front, 1, { x: 0.4, y: r });
    const g = abgleichen({ ...p, front }, 'front');
    expect(ausdehnung(g.top, 'y')[1]).toBeCloseTo(ausdehnung(front, 'x')[1], 5);
    expect(g.seite).toEqual(p.seite);
    // Achspunkte des Tops bleiben auf der Achse
    expect(g.top.knoten[0]!.p.y).toBe(0);
    expect(g.top.knoten[g.top.knoten.length - 1]!.p.y).toBe(0);
  });

  it('Top: Spitze nach vorn zieht die Schnauze in der Seite mit', () => {
    const p = neuesDokument().profile;
    const top = bewegeKnoten(p.top, 0, { x: -0.45, y: 0 });
    const g = abgleichen({ ...p, top }, 'top');
    expect(ausdehnung(g.seite, 'x')[0]).toBeCloseTo(-0.45, 5);
    expect(ausdehnung(g.seite, 'x')[1]).toBeCloseTo(r, 3);
    expect(abweichung(g)).toBeLessThan(1e-4);
  });

  it('Seite: Griff wölbt über den Knoten hinaus → Front folgt der Kurve, nicht nur den Knoten', () => {
    const p = neuesDokument().profile;
    const kn = p.seite.knoten[0]!;
    const seite = bewegeGriff(p.seite, 0, 'aus', { x: kn.p.x + 0.1, y: kn.p.y + 0.12 }, true);
    const g = abgleichen({ ...p, seite }, 'seite');
    expect(abweichung(g)).toBeLessThan(1e-4);
    expect(ausdehnung(g.front, 'y')[1]).toBeGreaterThan(2 * r + 0.01);
  });

  it('Schrumpfen bleibt monoton und stimmig', () => {
    const p = neuesDokument().profile;
    const front = bewegeKnoten(bewegeKnoten(p.front, 0, { x: 0, y: 0.3 }), 1, { x: 0.12, y: 0.2 });
    const g = abgleichen({ ...p, front }, 'front');
    expect(abweichung(g)).toBeLessThan(1e-3);
    // Höhe der Seite = Höhe der Front
    const hoehe = ausdehnung(front, 'y')[1];
    expect(hoehe).toBeLessThan(2 * r - 0.01);
    expect(Math.max(...g.seite.knoten.map((k) => k.p.y))).toBeLessThanOrEqual(hoehe + 1e-6);
    // monoton: Reihenfolge der Knotenhöhen bleibt erhalten
    const vorher = p.seite.knoten.map((k) => k.p.y);
    const nachher = g.seite.knoten.map((k) => k.p.y);
    for (let i = 0; i < vorher.length; i++)
      for (let j = 0; j < vorher.length; j++) if (vorher[i]! < vorher[j]! - 1e-9) expect(nachher[i]!).toBeLessThan(nachher[j]! + 1e-9);
  });

  // Florian 12.10.: „Wenn ich bei der Kugel im Frontview den oberen Punkt nach oben ziehe, würde ich erwarten, dass im
  // Sideview auch nur der oberste Punkt nach oben wandert.“ Der oberste Punkt beider Ansichten ist derselbe Körperpunkt.
  it('Front: oberen Punkt hochziehen → in der Seite wandert nur der oberste Punkt, die Seitenpunkte bleiben', () => {
    const p = neuesDokument().profile;
    const front = bewegeKnoten(p.front, 0, { x: 0, y: 0.75 });
    const g = abgleichen({ ...p, front }, 'front');
    expect(g.seite.knoten[0]!.p.y).toBeCloseTo(0.75, 6);
    // Griffe des obersten Punkts wandern mit (bleiben waagerecht)
    expect(g.seite.knoten[0]!.ein.y).toBeCloseTo(p.seite.knoten[0]!.ein.y, 12);
    expect(g.seite.knoten[0]!.aus.y).toBeCloseTo(p.seite.knoten[0]!.aus.y, 12);
    for (const i of [1, 2, 3]) expect(g.seite.knoten[i]).toEqual(p.seite.knoten[i]);
  });

  it('Seite: obersten Punkt hochziehen → in der Front nur der Achspunkt oben, die Flanke bleibt', () => {
    const p = neuesDokument().profile;
    const seite = bewegeKnoten(p.seite, 0, { x: 0, y: 0.7 });
    const g = abgleichen({ ...p, seite }, 'seite');
    expect(g.front.knoten[0]!.p.y).toBeCloseTo(0.7, 6);
    for (const i of [1, 2]) expect(g.front.knoten[i]).toEqual(p.front.knoten[i]);
    expect(g.top).toEqual(p.top);
  });

  it('Top: Spitze nach vorn → in der Seite nur die Schnauzenspitze, Ober- und Unterpunkt bleiben', () => {
    const p = neuesDokument().profile;
    const top = bewegeKnoten(p.top, 0, { x: -0.45, y: 0 });
    const g = abgleichen({ ...p, top }, 'top');
    const spitze = g.seite.knoten.reduce((a, k) => (k.p.x < a.p.x ? k : a));
    expect(spitze.p.x).toBeCloseTo(-0.45, 6);
    expect(spitze.p.y).toBeCloseTo(r, 9);
    const andere = g.seite.knoten.filter((k) => k !== spitze);
    expect(andere).toEqual(p.seite.knoten.filter((k) => k.p.x > -r + 1e-9));
  });

  it('Punkte knapp unter dem äußersten (Band 5 %) gehen anteilig mit, tiefere bleiben', () => {
    // flacher Rücken: zwei Knoten oben, der zweite 2,5 % der Höhe tiefer (halb im Band)
    const h = 2 * r;
    const glatt = (x: number, y: number, ein: { x: number; y: number }, aus: { x: number; y: number }) => ({ p: { x, y }, ein, aus, art: 'glatt' as const });
    const seite: Profil = {
      art: 'geschlossen',
      knoten: [
        glatt(-0.08, h, { x: -0.06, y: 0 }, { x: 0.06, y: 0 }),
        glatt(0.08, h * (1 - KOPPEL_BAND / 2), { x: -0.06, y: 0 }, { x: 0.06, y: 0 }),
        glatt(r, r, { x: 0, y: 0.12 }, { x: 0, y: -0.12 }),
        glatt(0, 0, { x: 0.14, y: 0 }, { x: -0.14, y: 0 }),
        glatt(-r, r, { x: 0, y: -0.12 }, { x: 0, y: 0.12 }),
      ],
    };
    const p = { ...neuesDokument().profile, seite };
    const [, oben] = ausdehnung(seite, 'y');
    const front = bewegeKnoten(p.front, 0, { x: 0, y: oben + 0.1 });
    const g = abgleichen({ ...p, seite, front: { ...front, knoten: front.knoten.map((k, i) => (i === 0 ? { ...k, p: { x: 0, y: oben + 0.1 } } : k)) } }, 'front');
    const hub = (i: number) => g.seite.knoten[i]!.p.y - seite.knoten[i]!.p.y;
    expect(ausdehnung(g.seite, 'y')[1]).toBeCloseTo(oben + 0.1, 6);
    expect(hub(0)).toBeGreaterThan(0.09);
    expect(hub(1)).toBeGreaterThan(0.2 * hub(0));
    expect(hub(1)).toBeLessThan(0.8 * hub(0));
    for (const i of [2, 3, 4]) expect(g.seite.knoten[i]).toEqual(seite.knoten[i]);
  });

  it('Schrumpfen: Höheres wird auf das Ziel gedrückt, die Seitenpunkte bleiben, solange sie darunter liegen', () => {
    const p = neuesDokument().profile;
    const front = bewegeKnoten(p.front, 0, { x: 0, y: 0.4 });
    const g = abgleichen({ ...p, front }, 'front');
    // die Front wölbt sich am Griff der Flanke knapp über den Punkt (0,4002)
    expect(ausdehnung(g.seite, 'y')[1]).toBeCloseTo(ausdehnung(front, 'y')[1], 6);
    expect(g.seite.knoten[1]!.p).toEqual(p.seite.knoten[1]!.p);
    expect(g.seite.knoten[3]!.p).toEqual(p.seite.knoten[3]!.p);
    expect(abweichung(g)).toBeLessThan(1e-4);
  });

  it('angleichen macht ein widersprüchliches Dokument stimmig', () => {
    const p = neuesDokument().profile;
    const widerspruch = { ...p, top: bewegeKnoten(p.top, 1, { x: 0, y: 0.5 }), front: bewegeKnoten(p.front, 0, { x: 0, y: 0.8 }) };
    expect(abweichung(widerspruch)).toBeGreaterThan(0.1);
    expect(abweichung(angleichen(widerspruch))).toBeLessThan(1e-3);
  });
});
