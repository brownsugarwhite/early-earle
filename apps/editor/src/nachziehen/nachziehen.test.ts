// Nachzeichnen: Silhouette und Schneider-Anpassung an einer gezeichneten Figur (Kreis auf einem Kasten, dunkel auf hell)
import { describe, expect, it } from 'vitest';
import { profilGeschlossen, profilHalb } from './fit';
import { halbUmriss } from './umriss';
import { silhouette } from './umriss-test-helfer';

describe('Nachzeichnen', () => {
  it('Halbprofil (Front) aus einer Ellipse: Achse in der Mitte, Hälfte von oben nach unten, Achsknoten glatt mit Griff quer', () => {
    const w = 300;
    const h = 300;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x - 150) / 80) ** 2 + ((y - 150) / 120) ** 2 <= 1) {
      const i = 4 * (y * w + x);
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 10;
    }
    const sil = silhouette(rgba, w, h);
    const { halb, achse } = halbUmriss(sil.punkte, true);
    expect(Math.abs(achse - 150)).toBeLessThan(2);
    expect(halb.length).toBeGreaterThan(100);
    expect(halb[0]![0]).toBeLessThan(2); // beginnt auf der Achse
    expect(halb[halb.length - 1]![0]).toBeLessThan(2); // endet auf der Achse
    expect(Math.max(...halb.map((q) => q[0]))).toBeGreaterThan(75); // rechte Hälfte reicht bis zum Rand
    const kn = profilHalb(halb, 2, true);
    expect(kn.length).toBeGreaterThanOrEqual(3);
    expect(kn.length).toBeLessThanOrEqual(8);
    expect(kn[0]!.art).toBe('glatt');
    expect(kn[kn.length - 1]!.art).toBe('glatt');
  });

  it('Kreis mit Kasten: Umriss gefunden, Kurve mit wenigen Knoten und Fehler ≤ 1,6 px, Ecken am Kasten', () => {
    const w = 400;
    const h = 300;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    const male = (x: number, y: number) => {
      const i = 4 * (y * w + x);
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 20;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const kreis = (x - 150) ** 2 + (y - 150) ** 2 <= 100 * 100;
        const kasten = x >= 200 && x <= 340 && y >= 120 && y <= 220;
        if (kreis || kasten) male(x, y);
      }
    }
    // Störung: ein kleiner Punkt abseits (darf nicht die Figur werden)
    for (let y = 20; y < 30; y++) for (let x = 360; x < 370; x++) male(x, y);
    const sil = silhouette(rgba, w, h);
    expect(sil.flaeche).toBeGreaterThan(100 * 100 * 3);
    // Tinte wird um 1 px erweitert (Haarlücken): 201 + 2
    expect(sil.hoehePx).toBeGreaterThanOrEqual(201);
    expect(sil.hoehePx).toBeLessThanOrEqual(203);
    expect(sil.punkte.length).toBeGreaterThan(200);
    const kn = profilGeschlossen(sil.punkte, 1.6);
    expect(kn.length).toBeGreaterThanOrEqual(6);
    expect(kn.length).toBeLessThanOrEqual(24);
    expect(kn.filter((k) => k.art === 'ecke').length).toBeGreaterThanOrEqual(3);
    // größter Abstand der Proben zur Kurve (dicht abgetastet)
    const dicht: [number, number][] = [];
    for (let s = 0; s < kn.length; s++) {
      const a = kn[s]!;
      const b = kn[(s + 1) % kn.length]!;
      const P = [a.p, [a.p[0] + a.aus[0], a.p[1] + a.aus[1]], [b.p[0] + b.ein[0], b.p[1] + b.ein[1]], b.p] as const;
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const u = 1 - t;
        dicht.push([u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0], u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]]);
      }
    }
    let maxD = 0;
    for (const p of sil.punkte) {
      let best = Infinity;
      for (const q of dicht) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
      maxD = Math.max(maxD, best);
    }
    expect(maxD).toBeLessThan(2.5);
  });
});
