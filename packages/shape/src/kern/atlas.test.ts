// Beweis 4: Zonen-Atlas — Kachelung aus der Unterteilung, Ecken auf dem Kachelgitter, nahtlose Werte, Vektorform gerastert.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { alleFlaechen } from '../kaefig/halbkanten';
import { ableiten } from './ableiten';
import { type ZonenForm, atlasEcken, kachelung, polygonAbstand, zonenRastern } from './atlas';

declare const console: { log: (...a: unknown[]) => void };

describe('Beweis 4: Zonen-Atlas', () => {
  const abl = ableiten(neuesDokument('Kugel'), { stufen: 2 });
  const k = kachelung(abl);
  const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);

  it('Kachelung: jede feine Fläche kennt ihre Käfigfläche, Ecken liegen auf dem Gitter 2^L + 1', () => {
    expect(k.flaecheVon.length).toBe(flaechen.length);
    expect(k.kante).toBe(5);
    const n = 1 << k.stufe;
    const kinder = new Int32Array(abl.kaefig.nF);
    for (let f = 0; f < flaechen.length; f++) {
      kinder[k.flaecheVon[f]!]!++;
      for (let i = 0; i < k.eckenZahl[f]!; i++) {
        const u = k.eckenUV[8 * f + 2 * i]! * n;
        const v = k.eckenUV[8 * f + 2 * i + 1]! * n;
        expect(Math.abs(u - Math.round(u))).toBeLessThan(1e-9);
        expect(Math.abs(v - Math.round(v))).toBeLessThan(1e-9);
      }
    }
    // Vierecke: 4^L Kinder je Käfigfläche
    for (let f = 0; f < abl.kaefig.nF; f++) expect(kinder[f]).toBe(4 ** k.stufe);
    console.log(`Atlas Kugel: ${abl.kaefig.nF} Kacheln à ${k.kante}², ${k.breite} × ${k.hoehe} Texel, ${flaechen.length} feine Flächen`);
  });

  it('Gemeinsame feine Punkte zweier Kacheln bekommen denselben Rasterwert; Atlas-Ecken bleiben in ihrer Kachel', () => {
    const bauch: ZonenForm = { ansicht: 'seite', punkte: [{ x: -1, y: -1, weich: 0.002 }, { x: 1, y: -1, weich: 0.002 }, { x: 1, y: 0.22, weich: 0.002 }, { x: -1, y: 0.22, weich: 0.002 }] };
    const r = zonenRastern(k, flaechen, abl.fein, [bauch]);
    // je feiner Punkt: alle (Fläche, Ecke)-Vorkommen zeigen auf Texel mit demselben Wert
    const n = 1 << k.stufe;
    const gesehen = new Map<number, number>();
    let geprueft = 0;
    for (let f = 0; f < flaechen.length; f++) {
      const kf = k.flaecheVon[f]!;
      const ox = (kf % k.spalten) * k.kante;
      const oy = Math.floor(kf / k.spalten) * k.kante;
      for (let i = 0; i < k.eckenZahl[f]!; i++) {
        const tx = ox + Math.round(k.eckenUV[8 * f + 2 * i]! * n);
        const ty = oy + Math.round(k.eckenUV[8 * f + 2 * i + 1]! * n);
        const wert = r.abstand[4 * (ty * k.breite + tx)]!;
        const v = flaechen[f]![i]!;
        const alt = gesehen.get(v);
        if (alt !== undefined) {
          expect(wert).toBe(alt);
          geprueft++;
        } else gesehen.set(v, wert);
        expect(Math.abs(wert - (0.22 - abl.fein[3 * v + 1]!))).toBeLessThan(1e-6);
      }
    }
    expect(geprueft).toBeGreaterThan(1000);
    const ecken = atlasEcken(k);
    expect(ecken.length).toBe(2 * 3 * 2 * flaechen.length);
    for (let f = 0; f < flaechen.length; f++) {
      const kf = k.flaecheVon[f]!;
      const ox = (kf % k.spalten) * k.kante;
      const oy = Math.floor(kf / k.spalten) * k.kante;
      for (let e = 0; e < 6; e++) {
        const tx = ecken[2 * (6 * f + e)]! * k.breite;
        const ty = ecken[2 * (6 * f + e) + 1]! * k.hoehe;
        expect(tx).toBeGreaterThanOrEqual(ox + 0.5 - 1e-3);
        expect(tx).toBeLessThanOrEqual(ox + k.kante - 0.5 + 1e-3);
        expect(ty).toBeGreaterThanOrEqual(oy + 0.5 - 1e-3);
        expect(ty).toBeLessThanOrEqual(oy + k.kante - 0.5 + 1e-3);
      }
    }
  });

  it('Polygonabstand: innen positiv, außen negativ, Weichheit zwischen den Punkten', () => {
    const q: ZonenForm = { ansicht: 'seite', punkte: [{ x: 0, y: 0, weich: 0 }, { x: 1, y: 0, weich: 0.1 }, { x: 1, y: 1, weich: 0.1 }, { x: 0, y: 1, weich: 0 }] };
    expect(polygonAbstand(q, 0.5, 0.5).d).toBeCloseTo(0.5, 9);
    expect(polygonAbstand(q, 1.5, 0.5).d).toBeCloseTo(-0.5, 9);
    expect(polygonAbstand(q, 0.5, -0.25).weich).toBeCloseTo(0.05, 9);
    expect(polygonAbstand(q, 1.5, 0.5).weich).toBeCloseTo(0.1, 9);
  });
});
