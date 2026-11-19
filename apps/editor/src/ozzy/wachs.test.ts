import { describe, expect, it } from 'vitest';
import { farbtonDrehen, nachOklab, WACHS_FARBTON_GRUND, wachsFarbe, wachsKugel, wachsVorlage } from './wachs';

/** Farbton in OKLCH (Grad, 0 … 360) und Buntheit */
function ton(f: readonly [number, number, number]): { L: number; C: number; h: number } {
  const [L, a, b] = nachOklab(f[0], f[1], f[2]);
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

describe('Wachs: das Kugelbild aus Florians ZBrush-Vorlage', () => {
  it('trifft die an der Vorlage gemessenen Farben (Mitte, Glanz, oben, unten, Seiten)', () => {
    // gemessen am Bildschirmfoto (60-%-Quantil über 15 × 15 Bildpunkte), auf 6 Stufen genau
    const mess: [string, number, number, [number, number, number]][] = [
      ['Mitte', 0, 0, [163, 112, 120]],
      ['über der Mitte', 0, 0.5, [140, 90, 96]],
      ['oben', 0, 0.9, [124, 65, 64]],
      ['unter dem Glanz', 0, -0.3, [126, 52, 46]],
      ['unten', 0, -0.8, [91, 18, 9]],
      ['links', -0.8, 0, [106, 45, 44]],
      ['rechts', 0.8, 0, [119, 50, 42]],
    ];
    for (const [name, u, v, soll] of mess) {
      const ist = wachsVorlage(u, v);
      for (let k = 0; k < 3; k++) expect(Math.abs(ist[k]! - soll[k]!), `${name}, Kanal ${k}: ${ist.map(Math.round).join(',')}`).toBeLessThanOrEqual(6);
    }
  });

  it('ist oben in der Mitte am hellsten und am unteren Rand am dunkelsten', () => {
    const hell = (u: number, v: number): number => nachOklab(...wachsVorlage(u, v))[0];
    let bestes = { u: 0, v: 0, L: -1 };
    for (let v = -0.9; v <= 0.9; v += 0.05) for (let u = -0.9; u <= 0.9; u += 0.05) if (u * u + v * v < 0.9 && hell(u, v) > bestes.L) bestes = { u, v, L: hell(u, v) };
    expect(Math.abs(bestes.u)).toBeLessThan(0.15);
    expect(bestes.v).toBeGreaterThan(-0.05);
    expect(bestes.v).toBeLessThan(0.3);
    expect(hell(0, -0.95)).toBeLessThan(hell(0, 0.95) - 0.15);
    expect(hell(0, -0.95)).toBeLessThan(0.3);
  });

  it('dreht nur den Farbton: Helligkeit bleibt, die Buntheit wächst nie', () => {
    for (const [u, v] of [[0, 0], [0, 0.6], [0, -0.4], [-0.7, -0.5], [0.6, 0.3], [0, -0.92]] as [number, number][]) {
      const rot = ton(wachsVorlage(u, v));
      const magenta = ton(wachsFarbe(u, v, -40));
      expect(Math.abs(magenta.L - rot.L)).toBeLessThan(0.012);
      expect(magenta.C).toBeLessThan(rot.C + 0.004);
      // um 40 Grad gedreht (an fast unbunten Stellen ist der Farbton ungenau: nur prüfen, wo Buntheit da ist)
      if (rot.C > 0.03 && magenta.C > 0.03) {
        const d = ((magenta.h - rot.h + 540) % 360) - 180;
        expect(Math.abs(d + 40)).toBeLessThan(3);
      }
    }
    expect(farbtonDrehen(123, 48, 43, 0)).toEqual([123, 48, 43]);
  });

  it('der Grundwert ist Magenta: Rot und Blau über Grün, Rot nicht unter Blau', () => {
    expect(WACHS_FARBTON_GRUND).toBeLessThan(-20);
    const [r, g, b] = wachsFarbe(0, -0.35);
    expect(r).toBeGreaterThan(g + 40);
    expect(b).toBeGreaterThan(g + 20);
    expect(r).toBeGreaterThanOrEqual(b);
  });

  it('gibt eine deckende Textur ohne Lücken, auch außerhalb der Kugel (dort der Rand)', () => {
    const G = 48;
    const t = wachsKugel(G);
    expect(t.length).toBe(G * G * 4);
    for (let i = 0; i < G * G; i++) expect(t[i * 4 + 3]).toBe(255);
    // die Ecke der Textur trägt die Farbe des Rands in ihrer Richtung, kein Schwarz aus dem Nichts
    const ecke = [t[0]!, t[1]!, t[2]!];
    const rand = wachsFarbe(-Math.SQRT1_2, -Math.SQRT1_2).map(Math.round);
    expect(ecke).toEqual(rand);
    // Zeile 0 ist unten (dunkel), die letzte oben
    const mitteUnten = (2 * G + G / 2) * 4;
    const mitteOben = ((G - 3) * G + G / 2) * 4;
    expect(t[mitteUnten]!).toBeLessThan(t[mitteOben]!);
  });
});
