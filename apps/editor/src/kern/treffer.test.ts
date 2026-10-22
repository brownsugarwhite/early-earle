// M2.2: Treffer deuten — Dreieck + Punkt → Käfigfläche, (u, v), nächster Käfigpunkt (ohne Renderer, am Kugel-Netz).
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '@ee/shape';
import { wesenBauen } from '@ee/shape/kern';
import { trefferDeuten } from './treffer';

describe('Treffer', () => {
  const { netz } = wesenBauen(neuesDokument('Kugel'), { earle: false }, null);

  it('Schwerpunkt eines Körperdreiecks liegt in seiner Käfigfläche, (u, v) im Einheitsquadrat, Käfigpunkt nah', () => {
    const tr = netz.treffer!;
    const dreieck = 1234;
    expect(tr.dreieckFlaeche[dreieck]).toBeGreaterThanOrEqual(0);
    const o = 9 * dreieck;
    const p = netz.positionen;
    const mitte: [number, number, number] = [(p[o]! + p[o + 3]! + p[o + 6]!) / 3, (p[o + 1]! + p[o + 4]! + p[o + 7]!) / 3, (p[o + 2]! + p[o + 5]! + p[o + 8]!) / 3];
    const t = trefferDeuten(netz, dreieck, mitte)!;
    expect(t.flaeche).toBe(tr.flaecheVon[tr.dreieckFlaeche[dreieck]!]);
    expect(t.u).toBeGreaterThanOrEqual(0);
    expect(t.u).toBeLessThanOrEqual(1);
    expect(t.v).toBeGreaterThanOrEqual(0);
    expect(t.v).toBeLessThanOrEqual(1);
    expect(t.kaefigPunkt).toBeGreaterThanOrEqual(0);
    // Käfigpunkt liegt in Reichweite einer Käfigfläche der Kugel (Radius 0,265, ≈ 400 Punkte → Kanten ≈ 0,07)
    expect(t.abstand).toBeLessThan(0.12);
    // Eckpunkt eines Dreiecks: (u, v) = Ecken-(u, v) der feinen Fläche
    const ecke = trefferDeuten(netz, dreieck, [p[o]!, p[o + 1]!, p[o + 2]!])!;
    const fein = tr.dreieckFlaeche[dreieck]!;
    expect(Math.abs(ecke.u - tr.eckenUV[8 * fein]!)).toBeLessThan(1e-4);
    expect(Math.abs(ecke.v - tr.eckenUV[8 * fein + 1]!)).toBeLessThan(1e-4);
  });

  it('Maßstab: Punkte im skalierten Netz werden zurückgerechnet; angesetzte Teile geben Fläche −1', () => {
    const dreieck = 10;
    const o = 9 * dreieck;
    const p = netz.positionen;
    const s = 2;
    const skaliert: [number, number, number] = [p[o]! * s, p[o + 1]! * s, p[o + 2]! * s];
    // skaliertes Netz nachstellen
    const netz2 = { ...netz, positionen: netz.positionen.map((x) => x * s) };
    const t = trefferDeuten(netz2, dreieck, skaliert, s)!;
    expect(Math.abs(t.u - netz.treffer!.eckenUV[8 * netz.treffer!.dreieckFlaeche[dreieck]!]!)).toBeLessThan(1e-4);
    const netz3 = { ...netz, treffer: { ...netz.treffer!, dreieckFlaeche: new Int32Array(netz.treffer!.dreieckFlaeche.length).fill(-1) } };
    expect(trefferDeuten(netz3, 5, [0, 0, 0])!.flaeche).toBe(-1);
  });
});
