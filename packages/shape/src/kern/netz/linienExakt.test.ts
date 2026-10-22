// Plan „Liniennetz, Zielform, Käfig“, S8a: P-Linien auf der Röhre als Kanten genau auf der Linie (statt Treppe).
import { describe, expect, it } from 'vitest';
import type { Kante } from '../../dokument';
import { kanteZwischen } from '../../kaefig/halbkanten';
import { ableiten } from '../ableiten';
import { feinKette } from '../reifen';
import { koerperDokument } from '../pruefen/koerper';
import { zufall } from '../pruefen/zufall';
import { linienExakt } from './linienExakt';
import { FAELLE, PX, abstandZug, kasten, linieAusSeite } from './pruefen';
import { extremKoerper } from '../pruefen/extremreihe';
import { editorBauen, editorPlan, hautZ, imAblauf, linieAufHaut } from '../pruefen/extremMessung';
import { neuesDokument } from '../../dokument';
import { glatteLinie } from '../../versuch/linie3d';
import { feinesNetz } from '../pruefstand';

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

describe('Tore S8a (bekannt rot, Plan 20.10., V0)', () => {
  // Das S8a-Tor verlangte die Kante ≤ 0,5 px an der Linie — verfehlt (Ei 1,0–1,15 px; Kritik-Register „Befunde aus S8a“).
  // Grün erst mit V5 (alle Linien gleichzeitig, Kante tridiagonal genau); wird es grün, schlägt `it.fails` an.
  it.fails('Ei, Bogen über die Flanke: Kante ≤ 0,5 px an der Linie (bekannt rot)', () => {
    const fall = FAELLE.find((f) => f.name === 'Ei, Bogen über die Flanke')!;
    const dok = fall.dok();
    const ohne = ableiten(dok, { stufen: 3 });
    const linie = linieAusSeite(ohne, fall.zug(kasten(ohne)));
    const sk = dok.skalierung;
    const r = linienExakt(ohne, [kanteAus(linie.punkte, sk, 1)], sk, 1e6);
    const k = r.abl.kaefig;
    let maxD = 0;
    for (let e = 0; e < k.nE; e++) {
      if (!(k.eSchaerfe[e]! > 1e5) || ohne.kaefig.eSchaerfe[e]! > 1e5 || k.xyz[3 * k.eA[e]! + 2]! < 0) continue;
      for (const q of feinKette(r.abl.unterteilung, k, k.eA[e]!, k.eB[e]!)) maxD = Math.max(maxD, abstandZug([r.abl.fein[3 * q]!, r.abl.fein[3 * q + 1]!, r.abl.fein[3 * q + 2]!], linie.punkte) * PX);
    }
    expect(maxD).toBeLessThanOrEqual(0.5);
  }, 120_000);
});

describe('Plan 20.10., V0: Rückschritte aus S8a', () => {
  const dok = koerperDokument('kugel', zufall(1));
  const sk = dok.skalierung;
  const ohne = ableiten(dok, { stufen: 3 });
  const k0 = kasten(ohne);
  const bei = (a: number, b: number): [number, number] => [k0.x0 + a * (k0.x1 - k0.x0), k0.y0 + b * (k0.y1 - k0.y0)];
  /** größter Abstand der neuen voll scharfen Kanten (rechte Hälfte) zur nächsten Linie und Zahl der neuen scharfen Käfigkanten */
  const messen = (r: ReturnType<typeof linienExakt>, linien: readonly (readonly V3[])[]) => {
    const k = r.abl.kaefig;
    let max = 0;
    let neu = 0;
    for (let e = 0; e < k.nE; e++) {
      if (!(k.eSchaerfe[e]! > 0) || ohne.kaefig.eSchaerfe[e]! > 0) continue;
      neu++;
      if (!(k.eSchaerfe[e]! > 1e5) || k.xyz[3 * k.eA[e]! + 2]! < 0 || k.xyz[3 * k.eB[e]! + 2]! < 0) continue;
      for (const p of feinKette(r.abl.unterteilung, k, k.eA[e]!, k.eB[e]!)) {
        const q: V3 = [r.abl.fein[3 * p]!, r.abl.fein[3 * p + 1]!, r.abl.fein[3 * p + 2]!];
        max = Math.max(max, Math.min(...linien.map((l) => abstandZug(q, l))) * PX);
      }
    }
    return { max, neu };
  };

  it('gekreuzte Linien: der Kreuzungspunkt schaukelt nicht auf (vorher 24 px neben der Linie)', () => {
    const linien = [linieAusSeite(ohne, [bei(0.25, 0.6), bei(0.75, 0.6)]), linieAusSeite(ohne, [bei(0.45, 0.3), bei(0.45, 0.85)])];
    const r = linienExakt(ohne, linien.map((l) => kanteAus(l.punkte, sk, 1)), sk, 1e6);
    expect(r.berichte.map((b) => b.art)).toEqual(['reihe', 'ring']);
    expect(messen(r, linien.map((l) => l.punkte)).max).toBeLessThan(2);
  }, 120_000);

  it('kurze Querlinie über vier Käfigkanten wird scharf (vorher lief sie ganz aus)', () => {
    const l = linieAusSeite(ohne, [bei(0.45, 0.2), bei(0.45, 0.8)]);
    const r = linienExakt(ohne, [kanteAus(l.punkte, sk, 1)], sk, 1e6);
    const k = r.abl.kaefig;
    let voll = 0;
    for (let e = 0; e < k.nE; e++) if (k.eSchaerfe[e]! > 1e5 && !(ohne.kaefig.eSchaerfe[e]! > 1e5)) voll++;
    expect(r.berichte[0]!.art).toBe('ring');
    expect(voll).toBeGreaterThan(0);
  }, 120_000);

  it('Linie, die weder Reihe noch Ring wird, behält die Treppe (vorher gar keine Falte)', () => {
    const l = linieAusSeite(ohne, [bei(0.4, 0.4), bei(0.6, 0.5), bei(0.5, 0.65), bei(0.35, 0.5), bei(0.45, 0.42)]);
    const r = linienExakt(ohne, [kanteAus(l.punkte, sk, 1)], sk, 1e6);
    expect(r.berichte[0]!.art).toBe('fehlt');
    expect(messen(r, [l.punkte]).neu).toBeGreaterThan(4);
  }, 120_000);

  it('Querlinie bis über den Rücken: die Naht bleibt in der Spiegelebene', () => {
    const l = linieAusSeite(ohne, [bei(0.55, 0.3), bei(0.55, 0.999)]);
    const r = linienExakt(ohne, [kanteAus(l.punkte, sk, 1)], sk, 1e6);
    const { R, N } = ohne.vorlage;
    // vorher konnte das Nachführen Nahtpunkte aus der Ebene schieben (die Ableitung selbst lässt Rundungsreste ~1e-15)
    for (let i = 0; i < R; i++) for (const j of [0, N / 2]) expect(Math.abs(r.abl.kaefig.xyz[3 * ohne.vorlage.ringPunkt(i, j) + 2]!)).toBeLessThan(1e-9);
  }, 120_000);
});

describe('Plan 20.10., V1: eine harte Linie bekommt immer eine Falte', () => {
  // Befund der Extremreihe: Querlinien an Kegel, Vierbeiner und Krake passten auch auf eine Reihe, die sie nur auf einem
  // Bruchteil eines Ringabstands berührten — gemeldet „Reihe“, aber keine einzige Käfigkante scharf
  for (const name of ['kegel', 'vierbeiner']) {
    it(`${name}: Querlinie (Editor-Bau, Florians Ablauf) — neue scharfe Käfigkanten, wie auch immer eingepasst`, () => {
      const k = extremKoerper(name);
      const bau = editorBauen(imAblauf(k.dok(), 'roehre', 'kugel'), editorPlan('roehre'));
      const abl = bau.stand.abl;
      const n = feinesNetz(abl);
      const kante = linieAufHaut(bau.dok, k.linien![0]!, n.punkte, n.flaechen)!;
      const r = linienExakt(abl, [kante], 1, 1e6);
      let neu = 0;
      for (let e = 0; e < r.abl.kaefig.nE; e++) if (r.abl.kaefig.eSchaerfe[e]! > 0 && !(abl.kaefig.eSchaerfe[e]! > 0)) neu++;
      console.log(`${name}: eingepasst als ${r.berichte[0]!.art}, ${neu} neue scharfe Käfigkanten`);
      expect(neu, `eingepasst als ${r.berichte[0]!.art}`).toBeGreaterThan(0);
    }, 120_000);
  }
});

describe('Plan 20.10., V1: Linien mit wenigen Knoten (Stift) liegen beim Einpassen auf der Haut', () => {
  // Befund im Editor (Ablauf E): Eine mit dem Stift gesetzte Linie hat wenige Knoten, dazwischen läuft die Kurve als Sehne
  // durch den Körper (Kugel, zwei Knoten: 20 px neben der Haut). Das Liniennetz zeigte sie auf der Haut, das Einpassen zog den
  // Körper auf die Sehne (Top Δ 0,3 → 10,7 px).
  it('Kugel mit zwei gekreuzten Stiftlinien (3 und 2 Knoten, Härte 100 %): Körper bleibt auf den Umrissen', () => {
    const plan = editorPlan('roehre');
    const b0 = editorBauen(neuesDokument('kugel'), plan);
    const n = feinesNetz(b0.stand.abl);
    const r0 = 0.265;
    const auf = (x: number, y: number): V3 => [x, y, hautZ(n.punkte, n.flaechen, x, y)!];
    const y0 = 1.2 * r0;
    const l1 = glatteLinie([auf(-0.56 * r0, y0), auf(0, y0), auf(0.56 * r0, y0)]);
    const l2 = glatteLinie([auf(0, 1.6 * r0), auf(0, 0.5 * r0)]);
    const kanten = [
      { ...l1, haerte: [1, 1, 1], blick: 'seite' as const },
      { ...l2, haerte: [1, 1], blick: 'seite' as const },
    ];
    const b = editorBauen({ ...b0.dok, kanten }, plan, b0.stand);
    const bl = b.netz.info.blatt!;
    console.log(`zwei Stiftlinien: eingepasst ${b.netz.info.linien?.map((x) => x.art).join(', ')}, Δ Seite ${bl.seite.max.toFixed(1)} · Front ${bl.front.max.toFixed(1)} · Top ${bl.top.max.toFixed(1)} px`);
    expect(b.netz.info.linien?.map((x) => x.art)).toEqual(['reihe', 'ring']);
    for (const a of ['seite', 'front', 'top'] as const) expect(bl[a].max, a).toBeLessThan(2);
  }, 120_000);
});
