import { describe, expect, it } from 'vitest';
import { createBarnGeometry } from './barn';

/** Einheitsscheune nach Bild 01 (Welt 08): niedrige Wände im Schnee, steiles Dach, Schneeplatte mit Traufbrett. */
describe('Rote Scheune: Geometrie', () => {
  const g = createBarnGeometry();
  const pos = g.getAttribute('position').array as Float32Array;
  const bn = g.getAttribute('bn').array as Float32Array;
  const n = pos.length / 3;

  it('Teile: Wand, Schneedach, Kante, Unterseite — der Anbau trägt eine eigene Markierung', () => {
    const parts = new Set<number>();
    let annex = 0;
    for (let i = 0; i < n; i++) {
      const v = bn[i * 4]!;
      const part = Math.floor(v + 0.01);
      parts.add(part);
      const f = v - part;
      expect(f === 0 || Math.abs(f - 0.25) < 1e-6).toBe(true);
      if (f > 0.1) annex++;
    }
    expect([...parts].sort()).toEqual([0, 1, 2, 3]);
    expect(annex).toBeGreaterThan(10);
    for (let i = 0; i < pos.length; i++) expect(Number.isFinite(pos[i]!)).toBe(true);
  });

  it('steht nie schwebend: die Wände reichen unter den Boden; das Dach ist steil (≈ 44°) und hoch', () => {
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      minY = Math.min(minY, pos[i * 3 + 1]!);
      maxY = Math.max(maxY, pos[i * 3 + 1]!);
    }
    expect(minY).toBeLessThan(-0.5);
    expect(maxY).toBeGreaterThan(0.95);
    expect(maxY).toBeLessThan(1.15);
  });

  it('die Schneeplatten stoßen am First auf Gehrung zusammen (keine Kerbe über dem Giebel)', () => {
    // Oberseiten (Teil 1) am First: höchste Punkte beider Platten liegen auf derselben Höhe über der Firstlinie
    const ridge: Array<[number, number, number]> = [];
    let top = -Infinity;
    for (let i = 0; i < n; i++) if (Math.floor(bn[i * 4]! + 0.01) === 1) top = Math.max(top, pos[i * 3 + 1]!);
    for (let i = 0; i < n; i++) {
      if (Math.floor(bn[i * 4]! + 0.01) !== 1 || bn[i * 4]! % 1 > 0.1) continue;
      if (Math.abs(pos[i * 3 + 1]! - top) < 1e-5) ridge.push([pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!]);
    }
    // nach der Drehung läuft der First längs x: alle Firstpunkte haben z ≈ 0
    expect(ridge.length).toBeGreaterThanOrEqual(4);
    for (const p of ridge) expect(Math.abs(p[2])).toBeLessThan(1e-5);
  });
});
