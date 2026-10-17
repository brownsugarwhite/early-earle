// Plan „Liniennetz, Zielform, Käfig“, S8a: P-Linien auf der Röhre als Kanten genau auf der Linie (statt Treppe).
import { describe, expect, it } from 'vitest';
import type { Kante } from '../../dokument';
import { kanteZwischen } from '../../kaefig/halbkanten';
import { ableiten } from '../ableiten';
import { feinKette } from '../reifen';
import { linienExakt } from './linienExakt';
import { FAELLE, PX, abstandZug, kasten, linieAusSeite } from './pruefen';

declare const console: { log: (...a: unknown[]) => void };

type V3 = [number, number, number];

/** Kante (Dokument) aus Hautpunkten: sieben Knoten der Linie, glatt wie eine mit P gezeichnete Linie (`glatteLinie`). */
function kanteAus(punkte: readonly V3[], sk: number, h: number): Kante {
  const n = 7;
  const pts = Array.from({ length: n }, (_, k) => {
    const p = punkte[Math.round((k * (punkte.length - 1)) / (n - 1))]!;
    return [p[0] / sk, p[1] / sk, p[2] / sk] as V3;
  });
  const knoten = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    const t: V3 = [(b[0] - a[0]) / 6, (b[1] - a[1]) / 6, (b[2] - a[2]) / 6];
    return { p, ein: (i === 0 ? [0, 0, 0] : [-t[0], -t[1], -t[2]]) as V3, aus: (i === n - 1 ? [0, 0, 0] : t) as V3, art: 'glatt' as const };
  });
  return { knoten, haerte: knoten.map(() => h), blick: 'seite' };
}

describe('S8a Linien genau auf der Haut (Röhre)', () => {
  for (const name of ['Kugel, waagerecht auf 65 % Höhe', 'Ei, Bogen über die Flanke']) {
    it(`${name}: Käfigreihe auf der Linie, scharf bei Härte 1, ohne Härte unverändert`, () => {
      const fall = FAELLE.find((f) => f.name === name)!;
      const dok = fall.dok();
      const ohne = ableiten(dok, { stufen: 3 });
      const linie = linieAusSeite(ohne, fall.zug(kasten(ohne)));
      const sk = dok.skalierung;
      // ohne Härte: bitgleich
      const weich = linienExakt(ohne, [kanteAus(linie.punkte, sk, 0)], sk, 1e6);
      expect(weich.abl).toBe(ohne);
      // mit Härte: eine Reihe, scharfe Kanten, die Kante liegt auf der Linie
      const r = linienExakt(ohne, [kanteAus(linie.punkte, sk, 1)], sk, 1e6);
      expect(r.berichte[0]!.art).toBe('reihe');
      const k = r.abl.kaefig;
      const neu: number[] = [];
      for (let e = 0; e < k.nE; e++) if (k.eSchaerfe[e]! > 1e5 && !(ohne.kaefig.eSchaerfe[e]! > 1e5)) neu.push(e);
      expect(neu.length).toBeGreaterThanOrEqual(4);
      // feine Punkte längs der neuen scharfen Kanten (rechte Hälfte) gegen die Linie
      let maxD = 0;
      for (const e of neu) {
        const a = k.eA[e]!;
        if (r.abl.kaefig.xyz[3 * a + 2]! < 0) continue;
        for (const p of feinKette(r.abl.unterteilung, k, k.eA[e]!, k.eB[e]!)) maxD = Math.max(maxD, abstandZug([r.abl.fein[3 * p]!, r.abl.fein[3 * p + 1]!, r.abl.fein[3 * p + 2]!], linie.punkte) * PX);
      }
      console.log(`${name}: ${neu.length} scharfe Käfigkanten, Kante bis ${maxD.toFixed(2)} px neben der Linie, ${r.berichte[0]!.ms.toFixed(0)} ms`);
      expect(maxD).toBeLessThan(1.5);
      expect(kanteZwischen(k, k.eA[neu[0]!]!, k.eB[neu[0]!]!)).toBe(neu[0]);
    }, 120_000);
  }
});
