// Phase 1 / M3: Pinsel — Deltas auf Käfigpunkten, gespiegelt angewendet, ohne Umbau; Spiegelpartner, Gewichte.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { ableiten } from './ableiten';
import { abfall, deltasAnwenden, kaefigNachbarn, kaefigNormalen, pinselGewichte, spiegelIndex } from './pinsel';
import { wesenBauen } from './wesen';

describe('M3 Pinsel', () => {
  const kugel = neuesDokument('Kugel');
  const abl = ableiten(kugel);
  const n0 = abl.vorlage.kaefig.n;
  const { N } = abl.vorlage;

  it('Spiegelpartner: jeder Vorlagenpunkt hat einen, Nahtpunkte sich selbst, der Partner des Partners ist der Punkt', () => {
    const sp = spiegelIndex(abl.kaefig.xyz, n0);
    for (let p = 0; p < n0; p++) {
      expect(sp[p]).toBeGreaterThanOrEqual(0);
      expect(sp[sp[p]!]).toBe(p);
      const z = abl.kaefig.xyz[3 * p + 2]!;
      if (Math.abs(z) < 1e-6) expect(sp[p]).toBe(p);
      else expect(Math.abs(abl.kaefig.xyz[3 * sp[p]! + 2]! + z)).toBeLessThan(1e-6);
    }
    // Ringpunkt (i, j) spiegelt auf (i, N − j)
    expect(sp[10 * N + 4]).toBe(10 * N + (N - 4));
  });

  it('Deltas anwenden: Punkt und Spiegelpartner wandern, die Naht bleibt bei z = 0, fern bleibt alles stehen', () => {
    const p = 10 * N + 4;
    const naht = 10 * N;
    const d = deltasAnwenden(abl, [
      { punkt: p, d: [0.01, 0.05, 0.02] },
      { punkt: naht, d: [0, 0.03, 0.01] },
    ]);
    const q = spiegelIndex(abl.kaefig.xyz, n0)[p]!;
    expect(d.kaefig.xyz[3 * p + 1]! - abl.kaefig.xyz[3 * p + 1]!).toBeCloseTo(0.05, 9);
    expect(d.kaefig.xyz[3 * p + 2]! - abl.kaefig.xyz[3 * p + 2]!).toBeCloseTo(0.02, 9);
    expect(d.kaefig.xyz[3 * q + 2]! - abl.kaefig.xyz[3 * q + 2]!).toBeCloseTo(-0.02, 9);
    expect(d.kaefig.xyz[3 * naht + 2]).toBeCloseTo(0, 9);
    expect(d.kaefig.xyz[3 * naht + 1]! - abl.kaefig.xyz[3 * naht + 1]!).toBeCloseTo(0.03, 9);
    // feines Netz: der Punktpunkt von p folgt, ein ferner Punkt (Ring 20) nicht
    expect(Math.abs(d.fein[3 * p + 1]! - abl.fein[3 * p + 1]!)).toBeGreaterThan(0.01);
    const fern = 20 * N + 8;
    expect(Math.abs(d.fein[3 * fern]! - abl.fein[3 * fern]!) + Math.abs(d.fein[3 * fern + 1]! - abl.fein[3 * fern + 1]!)).toBeLessThan(1e-12);
    // Ableitung ohne Deltas unverändert
    expect(deltasAnwenden(abl, [])).toBe(abl);
  });

  it('wesenBauen: Deltas im Dokument verändern das Netz ohne Umbau, der Stand bleibt deltafrei', () => {
    const ohne = wesenBauen(kugel, { earle: false }, null);
    const mit = wesenBauen({ ...kugel, kaefig: { deltas: [{ punkt: 10 * N + 4, d: [0, 0.05, 0] }] } }, { earle: false }, ohne.stand);
    expect(mit.netz.info.ableitung).toBe(0);
    let diff = 0;
    for (let i = 0; i < ohne.netz.positionen.length; i++) diff = Math.max(diff, Math.abs(ohne.netz.positionen[i]! - mit.netz.positionen[i]!));
    expect(diff).toBeGreaterThan(0.01);
    expect(mit.stand.abl.kaefig.xyz[3 * (10 * N + 4) + 1]).toBe(ohne.stand.abl.kaefig.xyz[3 * (10 * N + 4) + 1]);
    // andere Deltas: wieder ohne Umbau
    const mit2 = wesenBauen({ ...kugel, kaefig: { deltas: [{ punkt: 10 * N + 4, d: [0, 0.1, 0] }] } }, { earle: false }, mit.stand);
    expect(mit2.netz.info.ableitung).toBe(0);
  });

  it('Gewichte, Normalen, Nachbarn: Mitte wiegt 1, Spiegelgewicht am Spiegelbild, Normalen zeigen nach außen, Ringpunkte haben 4 Nachbarn', () => {
    const p = 10 * N + 4;
    const mitte: [number, number, number] = [abl.kaefig.xyz[3 * p]!, abl.kaefig.xyz[3 * p + 1]!, abl.kaefig.xyz[3 * p + 2]!];
    const g = pinselGewichte(abl.kaefig.xyz, n0, mitte, 0.1);
    const eigen = g.find((x) => x.punkt === p)!;
    expect(eigen.w).toBeCloseTo(1, 9);
    const partner = g.find((x) => x.punkt === 10 * N + (N - 4))!;
    expect(partner.wSpiegel).toBeCloseTo(1, 9);
    expect(abfall(0, 1)).toBe(1);
    expect(abfall(1, 1)).toBe(0);
    expect(abfall(0.5, 1)).toBeCloseTo(0.5625, 9);
    const nrm = kaefigNormalen(abl.kaefig.xyz, abl.kaefig.fStart, abl.kaefig.fVerts, n0);
    // Kugel: Normale ≈ Richtung vom Mittelpunkt
    let m: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < n0; i++) m = [m[0] + abl.kaefig.xyz[3 * i]! / n0, m[1] + abl.kaefig.xyz[3 * i + 1]! / n0, m[2] + abl.kaefig.xyz[3 * i + 2]! / n0];
    const rv = [abl.kaefig.xyz[3 * p]! - m[0], abl.kaefig.xyz[3 * p + 1]! - m[1], abl.kaefig.xyz[3 * p + 2]! - m[2]];
    const l = Math.hypot(rv[0]!, rv[1]!, rv[2]!);
    expect((rv[0]! * nrm[3 * p]! + rv[1]! * nrm[3 * p + 1]! + rv[2]! * nrm[3 * p + 2]!) / l).toBeGreaterThan(0.9);
    const nb = kaefigNachbarn(abl.kaefig.fStart, abl.kaefig.fVerts, n0);
    expect(nb[p]!.length).toBe(4);
  });
});
