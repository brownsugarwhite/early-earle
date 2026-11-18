// Gegenprüfung 10.11.2026, Schritt G1: Das ausgeschriebene Einsetzen für eine und für drei Spalten rechnet bitgleich wie das
// allgemeine (das für zwei Spalten weiter benutzt wird), und die Lösung erfüllt die Normalgleichungen.
import { describe, expect, it } from 'vitest';
import type { NormalZeile } from './normalSystem';
import { normalSystemZerlegt } from './zerlegung';

const EPS = 1e-9;

/** Zeilen wie bei der Haut: je Punkt eines geschlossenen Gitters „Punkt minus Mittel der Nachbarn“, dazu jede siebte Lage gebunden */
function hautZeilen(nx: number, ny: number): { n: number; zeilen: NormalZeile[] } {
  const n = nx * ny;
  const nr = (x: number, y: number) => ((x + nx) % nx) + nx * ((y + ny) % ny);
  const zeilen: NormalZeile[] = [];
  for (let y = 0; y < ny; y++)
    for (let x = 0; x < nx; x++) {
      const nb = [nr(x + 1, y), nr(x - 1, y), nr(x, y + 1), nr(x, y - 1), nr(x + 1, y + 1), nr(x - 1, y - 1)];
      zeilen.push({ index: [nr(x, y), ...nb], wert: [1, ...nb.map(() => -1 / nb.length)], gewicht: 1 });
    }
  for (let i = 0; i < n; i += 7) zeilen.push({ index: [i], wert: [1], gewicht: 100 });
  return { n, zeilen };
}

/** wiederholbare Zahlen in −1 … 1 */
function zahlen(anzahl: number, saat: number): Float64Array {
  const out = new Float64Array(anzahl);
  let s = saat >>> 0;
  for (let i = 0; i < anzahl; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out[i] = s / 2147483648 - 1;
  }
  return out;
}

/** (Σ g·aᵀa + ε)·x für eine Spalte */
function anwenden(n: number, zeilen: readonly NormalZeile[], x: Float64Array): Float64Array {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = EPS * x[i]!;
  for (const z of zeilen) {
    let s = 0;
    for (let t = 0; t < z.index.length; t++) s += z.wert[t]! * x[z.index[t]!]!;
    for (let t = 0; t < z.index.length; t++) y[z.index[t]!] = y[z.index[t]!]! + z.gewicht * z.wert[t]! * s;
  }
  return y;
}

const spalte = (x: Float64Array, k: number, c: number): Float64Array => Float64Array.from({ length: x.length / k }, (_, i) => x[k * i + c]!);
const verschachtelt = (a: Float64Array, b: Float64Array): Float64Array => Float64Array.from({ length: 2 * a.length }, (_, i) => (i % 2 ? b : a)[i >> 1]!);
/** größter Unterschied; NaN zählt als unendlich */
function unterschied(a: Float64Array, b: Float64Array): number {
  expect(a.length).toBe(b.length);
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    const e = Math.abs(a[i]! - b[i]!);
    d = Number.isNaN(e) ? Infinity : Math.max(d, e);
  }
  return d;
}

describe('Einsetzen ausgeschrieben (G1)', () => {
  const { n, zeilen } = hautZeilen(31, 23);
  const sys = normalSystemZerlegt(n, zeilen, EPS);
  const rhs3 = zahlen(3 * n, 7);
  const r = [0, 1, 2].map((c) => spalte(rhs3, 3, c));

  it('drei Spalten: bitgleich mit dem allgemeinen Einsetzen', () => {
    const x = sys.loesen(rhs3);
    const p = sys.loesenSpalten(verschachtelt(r[0]!, r[1]!), 2);
    const q = sys.loesenSpalten(verschachtelt(r[2]!, r[0]!), 2);
    expect(unterschied(spalte(x, 3, 0), spalte(p, 2, 0))).toBe(0);
    expect(unterschied(spalte(x, 3, 1), spalte(p, 2, 1))).toBe(0);
    expect(unterschied(spalte(x, 3, 2), spalte(q, 2, 0))).toBe(0);
    expect(unterschied(x, sys.loesenSpalten(rhs3, 3))).toBe(0);
  });

  it('sechs Spalten (11.11., Normalfluss): bitgleich mit zweimal drei Spalten', () => {
    const zweite = zahlen(3 * n, 11);
    const rhs6 = Float64Array.from({ length: 6 * n }, (_, i) => (i % 6 < 3 ? rhs3[3 * Math.floor(i / 6) + (i % 6)]! : zweite[3 * Math.floor(i / 6) + (i % 6) - 3]!));
    const x = sys.loesenSpalten(rhs6, 6);
    const a = sys.loesen(rhs3);
    const b = sys.loesen(zweite);
    for (let c = 0; c < 3; c++) {
      expect(unterschied(spalte(x, 6, c), spalte(a, 3, c))).toBe(0);
      expect(unterschied(spalte(x, 6, 3 + c), spalte(b, 3, c))).toBe(0);
    }
  });

  it('zwei Spalten ausgeschrieben (13.11., Rechnung auf der Hälfte): bitgleich mit dem allgemeinen Einsetzen', () => {
    const rhs2 = verschachtelt(r[0]!, r[2]!);
    const x = sys.loesenZwei!(rhs2);
    expect(unterschied(x, sys.loesenSpalten(rhs2, 2))).toBe(0);
    // und mit je einer Spalte für sich
    expect(unterschied(spalte(x, 2, 0), sys.loesenSpalte(r[0]!))).toBe(0);
    expect(unterschied(spalte(x, 2, 1), sys.loesenSpalte(r[2]!))).toBe(0);
  });

  it('eine Spalte: bitgleich mit dem allgemeinen Einsetzen', () => {
    for (const b of r) {
      const x = sys.loesenSpalte(b);
      expect(unterschied(x, spalte(sys.loesenSpalten(verschachtelt(b, b), 2), 2, 1))).toBe(0);
      expect(unterschied(x, sys.loesenSpalten(b, 1))).toBe(0);
    }
  });

  it('die Lösung erfüllt die Normalgleichungen, auch nach anderen Aufrufen dazwischen', () => {
    const x = sys.loesen(rhs3);
    sys.loesenSpalte(zahlen(n, 99));
    sys.loesen(zahlen(3 * n, 5));
    expect(unterschied(x, sys.loesen(rhs3))).toBe(0);
    for (let c = 0; c < 3; c++) expect(unterschied(anwenden(n, zeilen, spalte(x, 3, c)), r[c]!)).toBeLessThan(1e-9);
    const eine = sys.loesenSpalte(r[1]!);
    expect(unterschied(anwenden(n, zeilen, eine), r[1]!)).toBeLessThan(1e-9);
  });
});
