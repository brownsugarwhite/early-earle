// Plan „Liniennetz, Zielform, Käfig“ (16.10.), R5 Höhenfeld: rundes Aufblasen und Berühren an einfachen Formen.
import { describe, expect, it } from 'vitest';
import type { V2 } from '../../bezier';
import type { Breiten } from '../breite';
import { hoehenfeld } from './hoehenfeld';

const kreis = (r: number, n = 180): V2[] => Array.from({ length: n }, (_, k) => ({ x: r * Math.cos((2 * Math.PI * k) / n), y: r * Math.sin((2 * Math.PI * k) / n) }));
const breitenAus = (top: (x: number) => number, front: (y: number) => number, max: number): Breiten => ({ top, front, topMax: max, frontMax: max });

describe('R5 Höhenfeld', () => {
  it('Scheibe mit Kreisen in Top und Front: Kugel, Naht auf der Zeichnung', () => {
    const R = 0.2;
    const b = breitenAus((x) => (Math.abs(x) < R ? Math.sqrt(R * R - x * x) : 0), (y) => (Math.abs(y) < R ? Math.sqrt(R * R - y * y) : 0), R);
    const f = hoehenfeld(kreis(R), b, { zelle: R / 60 });
    // Mitte und halber Radius gegen die Kugel (≤ 2 % des Radius)
    expect(Math.abs(f.H(0, 0) - R)).toBeLessThan(0.02 * R);
    expect(Math.abs(f.H(R / 2, 0) - Math.sqrt(0.75) * R)).toBeLessThan(0.02 * R);
    expect(Math.abs(f.H(0, -R / 2) - Math.sqrt(0.75) * R)).toBeLessThan(0.02 * R);
    // dicht an der Naht wie die Kugel (senkrechte Tangente), außen 0
    expect(Math.abs(f.H(R * 0.999, 0) - Math.sqrt(1 - 0.999 ** 2) * R)).toBeLessThan(0.02 * R);
    expect(f.H(1.1 * R, 0)).toBe(0);
  });

  it('Streifen mit schmalerem Top: elliptische Querschnitte, Top und Front berührt', () => {
    // Seite: Rechteck 0,8 × 0,2 (Halbdicke 0,1), Top: Halbbreite 0,05, Front: Ellipse mit Halbbreite 0,05
    const poly: V2[] = [
      { x: -0.4, y: -0.1 },
      { x: 0.4, y: -0.1 },
      { x: 0.4, y: 0.1 },
      { x: -0.4, y: 0.1 },
    ];
    const b = breitenAus((x) => (Math.abs(x) < 0.4 ? 0.05 : 0), (y) => (Math.abs(y) < 0.1 ? 0.05 * Math.sqrt(1 - (y / 0.1) ** 2) : 0), 0.05);
    const f = hoehenfeld(poly, b, { zelle: 0.004 });
    // in der Mitte des Streifens: Halbbreite 0,05 auf der Achse, Ellipse quer
    expect(Math.abs(f.H(0, 0) - 0.05)).toBeLessThan(0.002);
    expect(Math.abs(f.H(0, 0.05) - 0.05 * Math.sqrt(0.75))).toBeLessThan(0.003);
  });
});
