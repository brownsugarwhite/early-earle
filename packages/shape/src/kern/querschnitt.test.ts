// Querschnitt-Vorlagen liegender Abschnitte aus der Front-Silhouette (Lappen): Kasten mit Ecken, Kugel, abgeschnittener Lappen.
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from '../dokument';
import { ABLEIT_STANDARD, querschnitteFuer } from './ableiten';
import { silhouettenBreite } from './breite';

const N = 16;
const o = { x: 0, y: 0 };
const r = 0.265;

/** Kugel-Dokument mit Kasten-Front (rechte Hälfte, Achse senkrecht): Deckkante → Ecke → Seite → Ecke → Bodenkante. */
function kastenDokument(): Dokument {
  const dok = neuesDokument('Kasten');
  const front: Dokument['profile']['front'] = {
    art: 'halb',
    achse: 'senkrecht',
    knoten: [
      { p: { x: 0, y: 2 * r }, ein: o, aus: o, art: 'glatt' },
      { p: { x: 0.8 * r, y: 2 * r }, ein: o, aus: o, art: 'ecke', haerte: 1 },
      { p: { x: 0.8 * r, y: 0 }, ein: o, aus: o, art: 'ecke', haerte: 1 },
      { p: { x: 0, y: 0 }, ein: o, aus: o, art: 'glatt' },
    ],
  };
  return { ...dok, profile: { ...dok.profile, front } };
}

function vorlage(dok: Dokument, yLo: number, yHi: number) {
  const q = querschnitteFuer([{ o: { x: 0.012, y: yHi }, u: { x: 0.012, y: yLo } }], dok, silhouettenBreite(dok), N, ABLEIT_STANDARD);
  return q[0]!;
}

describe('Lappen-Querschnitt', () => {
  it('Kasten: Schnittgrenzen rasten auf Deck- und Bodenkante ein, Ecken liegen auf Stützstellen', () => {
    // Sprosse der Kreis-Seite endet knapp unter der Deckkante (0,5297 statt 0,53) und knapp über dem Boden
    const q = vorlage(kastenDokument(), 0.00027, 0.52973);
    expect(q.knoten).toEqual([2, 6]);
    expect(q.haerte).toEqual([1, 1]);
    // Deckkante: zwei Stützstellen oben bei voller Höhe, Breite 0 → 1; Seite senkrecht; Bodenkante spiegelbildlich
    expect(q.v.slice(0, 3).map((x) => +x.toFixed(3))).toEqual([1, 1, 1]);
    expect(q.w.slice(0, 3).map((x) => +x.toFixed(3))).toEqual([0, 0.5, 1]);
    expect(q.w.slice(2, 7).every((x) => Math.abs(x - 1) < 1e-9)).toBe(true);
    expect(q.v.slice(6).map((x) => +x.toFixed(3))).toEqual([0, 0, 0]);
    expect(q.w.slice(6).map((x) => +x.toFixed(3))).toEqual([1, 0.5, 0]);
  });

  it('Kugel: runde Vorlage ohne Ecken und ohne flache Kanten', () => {
    const q = vorlage(neuesDokument('Kugel'), 0.00027, 0.52973);
    expect(q.knoten).toEqual([]);
    expect(q.v[0]).toBe(1);
    expect(q.w[0]).toBe(0);
    expect(q.v[1]).toBeLessThan(0.999);
    expect(q.w[N / 4]!).toBeGreaterThan(0.95);
    expect(Math.abs(q.v[N / 4]! - 0.5)).toBeLessThan(0.1);
  });

  it('abgeschnittener Lappen (Sprosse mitten im Kasten): flache Kanten zur Naht statt Schrägen, keine Ecken', () => {
    const q = vorlage(kastenDokument(), 0.1, 0.4);
    expect(q.knoten).toEqual([]);
    // erste und letzte Stützstelle an der Naht, die zweite noch auf voller Höhe und schon abseits der Achse
    expect(q.w[0]).toBe(0);
    expect(q.v[1]).toBe(1);
    expect(q.w[1]).toBeGreaterThan(0.2);
    expect(q.v[q.v.length - 2]).toBe(0);
    expect(q.w[q.w.length - 2]).toBeGreaterThan(0.2);
  });
});
