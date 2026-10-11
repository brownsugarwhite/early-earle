import { describe, expect, it } from 'vitest';
import { neuesDokument } from './dokument';
import { abgleichen, abweichung, angleichen, ausdehnung } from './kopplung';
import { START_RADIUS, bewegeGriff, bewegeKnoten } from './profil';

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

  it('angleichen macht ein widersprüchliches Dokument stimmig', () => {
    const p = neuesDokument().profile;
    const widerspruch = { ...p, top: bewegeKnoten(p.top, 1, { x: 0, y: 0.5 }), front: bewegeKnoten(p.front, 0, { x: 0, y: 0.8 }) };
    expect(abweichung(widerspruch)).toBeGreaterThan(0.1);
    expect(abweichung(angleichen(widerspruch))).toBeLessThan(1e-3);
  });
});
