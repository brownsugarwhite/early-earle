import { describe, expect, it } from 'vitest';
import { type UmrissPunkt, umrissAbtasten, umrissStuecke } from './umriss';

const kreis = (r: number): UmrissPunkt[] => [
  { x: r, y: 0 },
  { x: 0, y: r },
  { x: -r, y: 0 },
  { x: 0, y: -r },
];
/** größter Abstand der Linie vom Kreis um den Ursprung */
const vomKreis = (p: readonly UmrissPunkt[], r: number): number => Math.max(...umrissAbtasten(p, 1).punkte.map((q) => Math.abs(Math.hypot(q.x, q.y) - r)));

describe('Umriss: Punkte, Richtungen, Anfänge der Lippen', () => {
  it('ein Punkt dicht neben einem anderen knickt die Linie nicht (Richtung nach den Abständen)', () => {
    // auf dem Kreis, 2 Einheiten neben dem Punkt links: Mit der Richtung von Nachbar zu Nachbar lag die Linie dort bis 26
    // Einheiten neben dem Kreis (sie drehte um fast einen halben Viertelbogen weg)
    const a = Math.PI - 2 / 150;
    const p = [...kreis(150)];
    p.splice(2, 0, { x: 150 * Math.cos(a), y: 150 * Math.sin(a) });
    expect(vomKreis(kreis(150), 150)).toBeLessThan(0.05);
    expect(vomKreis(p, 150)).toBeLessThan(0.1);
  });

  it('Ober- und Unterlippe beginnen am selben Punkt: dieselbe Linie wie mit einem Punkt dort', () => {
    const r = { x: 0, y: -1 };
    const zwei: UmrissPunkt[] = [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0, lippe: 'oben', richtung: r },
      { x: -150, y: 0, lippe: 'unten', richtung: r },
      { x: 0, y: -150 },
    ];
    const eins = umrissAbtasten(kreis(150), 1).punkte;
    const mit = umrissAbtasten(zwei, 1).punkte;
    expect(mit.length).toBe(eins.length);
    let d = 0;
    mit.forEach((q, i) => {
      d = Math.max(d, Math.hypot(q.x - eins[i]!.x, q.y - eins[i]!.y));
    });
    expect(d).toBeLessThan(1e-9);
  });

  it('getrennt: zwischen den Anfängen ein gerades Stück, die Kiefer behalten ihre Richtung', () => {
    const r = { x: 0, y: -1 };
    const p: UmrissPunkt[] = [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -180, y: 0, lippe: 'oben', richtung: r },
      { x: -150, y: -20, lippe: 'unten', richtung: r },
      { x: 0, y: -150 },
    ];
    const st = umrissStuecke(p);
    // die Front: gerade (Griffe auf der Sehne, je ein Drittel)
    const f = st[2]!;
    expect(f[1].x).toBeCloseTo(-180 + 10, 9);
    expect(f[1].y).toBeCloseTo(-20 / 3, 9);
    expect(f[2].x).toBeCloseTo(-150 - 10, 9);
    // der Oberkiefer kommt senkrecht an (wie beim Trennen), der Unterkiefer geht senkrecht weg
    const oben = st[1]!;
    expect(oben[3].x - oben[2].x).toBeCloseTo(0, 9);
    expect(oben[3].y - oben[2].y).toBeLessThan(0);
    const unten = st[3]!;
    expect(unten[1].x - unten[0].x).toBeCloseTo(0, 9);
    expect(unten[1].y - unten[0].y).toBeLessThan(0);
  });
});
