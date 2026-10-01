import { describe, expect, it } from 'vitest';
import { BARN_ANNEX_FROM, BARN_SHED_FROM, barnKeepsVertex, barnRoofValue, createBarnGeometry } from './barn';

/**
 * Einheitsscheune v3 (Welt 08, Ebene 6; Welt 03, Screenshot 8): zwei Vertex-Sätze in einer Geometrie — Satteldach (mit
 * Anbau ab `BARN_ANNEX_FROM`) und Pultdach-Scheune mit EINER großen Dachfläche (First bei −0,25 W). Niedrige Wände im
 * Schnee, Schneeplatte mit Traufbrett, Tinte unter dem Dach.
 */
describe('Rote Scheune v3: Geometrie', () => {
  const g = createBarnGeometry();
  const pos = g.getAttribute('position').array as Float32Array;
  const bn = g.getAttribute('bn').array as Float32Array;
  const bt = g.getAttribute('bt').array as Float32Array;
  const n = pos.length / 3;
  const partOf = (i: number) => Math.floor(bn[i * 4]! + 0.01);
  const markOf = (i: number) => bn[i * 4]! - partOf(i);
  const ofMark = (m: number) => [...Array(n).keys()].filter((i) => Math.abs(markOf(i) - m) < 1e-4);

  it('Teile: Wand, Schneedach, Kante, Unterseite — Markierung je Vertex-Satz (0 Satteldach, 0.25 Anbau, 0.5 Pultdach)', () => {
    const parts = new Set<number>();
    const marks = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      parts.add(partOf(i));
      const m = Math.round(markOf(i) * 4) / 4;
      expect(Math.abs(markOf(i) - m)).toBeLessThan(1e-6);
      marks.set(m, (marks.get(m) ?? 0) + 1);
    }
    expect([...parts].sort()).toEqual([0, 1, 2, 3]);
    expect([...marks.keys()].sort()).toEqual([0, 0.25, 0.5]);
    expect(marks.get(0.25)!).toBeGreaterThan(10);
    expect(marks.get(0.5)!).toBeGreaterThan(40);
    for (let i = 0; i < pos.length; i++) expect(Number.isFinite(pos[i]!)).toBe(true);
    for (let i = 0; i < bt.length; i++) expect(Number.isFinite(bt[i]!)).toBe(true);
  });

  it('steht nie schwebend: die Wände reichen unter den Boden; das Dach ist steil und hoch', () => {
    for (const mark of [0, 0.5]) {
      const ys = ofMark(mark).map((i) => pos[i * 3 + 1]!);
      expect(Math.min(...ys), `Satz ${mark}`).toBeLessThan(-0.5);
      expect(Math.max(...ys), `Satz ${mark}`).toBeGreaterThan(0.95);
      expect(Math.max(...ys), `Satz ${mark}`).toBeLessThan(1.15);
    }
  });

  it('Satteldach: die Schneeplatten stoßen am First auf Gehrung zusammen (keine Kerbe über dem Giebel)', () => {
    const tops = ofMark(0).filter((i) => partOf(i) === 1);
    const top = Math.max(...tops.map((i) => pos[i * 3 + 1]!));
    const ridge = tops.filter((i) => Math.abs(pos[i * 3 + 1]! - top) < 1e-5);
    // nach der Drehung läuft der First längs x: alle Firstpunkte haben z ≈ 0
    expect(ridge.length).toBeGreaterThanOrEqual(4);
    for (const i of ridge) expect(Math.abs(pos[i * 3 + 2]!)).toBeLessThan(1e-5);
  });

  it('Pultdach: First bei −0,25 W (nach der Drehung z = +0,25), EINE große Dachfläche — gut doppelt so breit wie der Rest', () => {
    const tops = ofMark(0.5).filter((i) => partOf(i) === 1);
    const top = Math.max(...tops.map((i) => pos[i * 3 + 1]!));
    const ridge = tops.filter((i) => Math.abs(pos[i * 3 + 1]! - top) < 1e-5);
    expect(ridge.length).toBeGreaterThanOrEqual(4);
    // beide Oberseiten treffen sich in derselben Firstlinie (Gehrung ohne Stufe bei ungleicher Neigung)
    const rz = ridge.map((i) => pos[i * 3 + 2]!);
    expect(Math.max(...rz) - Math.min(...rz)).toBeLessThan(1e-4);
    const wallTop = ofMark(0.5)
      .filter((i) => partOf(i) === 0)
      .reduce((a, i) => (pos[i * 3 + 1]! > pos[a * 3 + 1]! ? i : a));
    expect(pos[wallTop * 3 + 2]!).toBeCloseTo(0.25, 5);
    // Ausladung der Dachoberseiten zu beiden Seiten des Firsts (längs z nach der Drehung)
    const zs = tops.map((i) => pos[i * 3 + 2]!);
    const ridgeZ = pos[wallTop * 3 + 2]!;
    const long = ridgeZ - Math.min(...zs);
    const short = Math.max(...zs) - ridgeZ;
    expect(long / short).toBeGreaterThan(2);
    // die große Fläche fällt zur niedrigen Traufe (Längswand z = −0,5), der kurze Rest zur höheren (z = +0,5)
    const wallTopAt = (z: number) => Math.max(...ofMark(0.5).filter((i) => partOf(i) === 0 && Math.abs(pos[i * 3 + 2]! - z) < 1e-4).map((i) => pos[i * 3 + 1]!));
    expect(wallTopAt(-0.5)).toBeLessThan(0.4);
    expect(wallTopAt(0.5)).toBeGreaterThan(wallTopAt(-0.5) + 0.15);
    // Neigung der großen Fläche ≈ 42° (Ebene 6)
    const slope = (Math.atan((pos[wallTop * 3 + 1]! - wallTopAt(-0.5)) / (ridgeZ + 0.5)) * 180) / Math.PI;
    expect(slope).toBeGreaterThan(38);
    expect(slope).toBeLessThan(46);
  });

  it('Wände tragen ihre Oberkante (Giebel: First über den Traufen) für Glut und Traufschatten', () => {
    let gables = 0;
    for (let i = 0; i < n; i++) {
      if (partOf(i) !== 0) continue;
      const [ur, yl, yr, yt] = [bt[i * 4]!, bt[i * 4 + 1]!, bt[i * 4 + 2]!, bt[i * 4 + 3]!];
      expect(ur).toBeGreaterThan(0);
      expect(ur).toBeLessThan(1);
      // jede Wandecke liegt unter (oder auf) ihrer Oberkante
      const u = bn[i * 4 + 1]!;
      const topAt = u < ur ? yl + ((yr - yl) * u) / ur : yr + ((yt - yr) * (u - ur)) / (1 - ur);
      expect(bn[i * 4 + 2]!).toBeLessThanOrEqual(topAt + 1e-4);
      if (yr > Math.max(yl, yt) + 0.02) gables++;
    }
    expect(gables).toBeGreaterThan(0);
  });
});

describe('Rote Scheune v3: Varianten und Dach', () => {
  it('jede Variante trägt genau einen Vertex-Satz: Satteldach, Pultdach oder Satteldach mit Anbau', () => {
    // Begleiter der Weltkompositionen (Variante 0.37) → Pultdach (Ebene 6)
    expect(barnKeepsVertex(0.5, 0.37)).toBe(true);
    expect(barnKeepsVertex(0, 0.37)).toBe(false);
    expect(barnKeepsVertex(0.25, 0.37)).toBe(false);
    // Satteldach ohne Anbau (Ebene 37: Tintendächer)
    expect(barnKeepsVertex(0, 0.1)).toBe(true);
    expect(barnKeepsVertex(0.5, 0.1)).toBe(false);
    expect(barnKeepsVertex(0.25, 0.1)).toBe(false);
    // ab BARN_ANNEX_FROM mit Anbau
    expect(barnKeepsVertex(0, BARN_ANNEX_FROM)).toBe(true);
    expect(barnKeepsVertex(0.25, BARN_ANNEX_FROM)).toBe(true);
    expect(barnKeepsVertex(0.5, BARN_ANNEX_FROM)).toBe(false);
    expect(BARN_SHED_FROM).toBeLessThan(0.37);
    expect(BARN_ANNEX_FROM).toBeGreaterThan(0.37);
  });

  it('Dachzeile je Welt: Schnee 0 (Standard), Tinte 1', () => {
    expect(barnRoofValue(undefined)).toBe(0);
    expect(barnRoofValue('snow')).toBe(0);
    expect(barnRoofValue('ink')).toBe(1);
  });
});
