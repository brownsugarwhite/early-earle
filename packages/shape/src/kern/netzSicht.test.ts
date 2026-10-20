// Plan „Liniennetz, Zielform, Käfig“, S1: das 3D-Liniennetz auf dem Kern-Körper. Tore an der Kugel (alles bekannt):
// Konturen auf den Großkreisen (≤ 0,5 px), Sichtbarkeit von oben/unten/vorn/hinten/Seite richtig, gehobene Umrissknoten
// in Mittelhöhe bzw. auf der Mittelebene; dazu Zeit je Bau an komplexen Körpern.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { ableiten } from './ableiten';
import { feinesNetz } from './pruefstand';
import { alleFlaechen } from '../kaefig/halbkanten';
import { SICHT, netzSicht } from './netzSicht';
import { gKoerperDokument, s0KoerperDokument } from './pruefen/grundkoerper';
import { baumAbleiten, baumFeinesNetz } from './grundkoerper/baumBau';
import { teilSatzDokument } from './pruefen/teilsatz';

declare const console: { log: (...a: unknown[]) => void };

const PX = 461;

describe('S1: Liniennetz auf dem Kern-Körper', () => {
  it('Kugel: Konturen auf den Großkreisen, Sichtbarkeit, gehobene Knoten', () => {
    const d = neuesDokument('kugel');
    const abl = ableiten(d, { stufen: 3 });
    const { punkte, flaechen } = feinesNetz(abl);
    const verdecker = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 2]!.kaefig);
    const ns = netzSicht({ dok: d, punkte, flaechen, kaefig: abl.kaefig, unterteilung: abl.unterteilung, verdecker });
    // Mitte und Radius aus dem Netz
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of punkte) {
      lo = Math.min(lo, p[1]);
      hi = Math.max(hi, p[1]);
    }
    const cy = (lo + hi) / 2;
    const fehler = { seite: 0, front: 0, top: 0 };
    let obenSichtbarVonOben = 0;
    let obenGesamt = 0;
    let untenSichtbarVonOben = 0;
    for (const z of ns.zuege) {
      for (let i = 0; i < z.sicht.length; i++) {
        const x = z.punkte[3 * i]!;
        const y = z.punkte[3 * i + 1]!;
        const zz = z.punkte[3 * i + 2]!;
        if (z.art === 'kontur-seite') {
          fehler.seite = Math.max(fehler.seite, Math.abs(zz) * PX);
          if (y > cy + 0.02) {
            obenGesamt++;
            if (z.sicht[i]! & SICHT.top) obenSichtbarVonOben++;
          }
          if (y < cy - 0.02 && z.sicht[i]! & SICHT.top) untenSichtbarVonOben++;
        }
        if (z.art === 'kontur-top') fehler.top = Math.max(fehler.top, Math.abs(y - cy) * PX);
        if (z.art === 'kontur-front') fehler.front = Math.max(fehler.front, Math.abs(x) * PX);
      }
    }
    console.log(`Kugel: Konturen Seite |z| ${fehler.seite.toFixed(2)} px, Top |y−Mitte| ${fehler.top.toFixed(2)} px, Front |x| ${fehler.front.toFixed(2)} px; Seitenkontur oben von oben sichtbar ${obenSichtbarVonOben}/${obenGesamt}, unten ${untenSichtbarVonOben}; ${ns.zuege.length} Züge, ${ns.ms.toFixed(1)} ms`);
    expect(fehler.seite).toBeLessThan(0.5);
    expect(fehler.top).toBeLessThan(2);
    expect(fehler.front).toBeLessThan(2);
    expect(obenSichtbarVonOben).toBe(obenGesamt);
    expect(untenSichtbarVonOben).toBe(0);
    // Top-Knoten in Mittelhöhe, Front-Knoten auf x ≈ 0
    for (let i = 0; i < ns.knoten.top.length; i += 3) if (Number.isFinite(ns.knoten.top[i + 1]!)) expect(Math.abs(ns.knoten.top[i + 1]! - cy) * PX).toBeLessThan(3);
    for (let i = 0; i < ns.knoten.front.length; i += 3) if (Number.isFinite(ns.knoten.front[i]!)) expect(Math.abs(ns.knoten.front[i]!) * PX).toBeLessThan(3);
  }, 60_000);

  it('Seitenknoten an Beinen, Flügeln, zweitem Hals liegen auf der Haut, nicht auf der Mittelebene (Plan 20.10., V0)', () => {
    // vorher z = 0 für jeden Seitenknoten: Vierbeiner 27,9 px, Zweihals 30,5 px, Flügel oben 74,6 px neben der Haut
    for (const name of ['vierbeiner', 'zweihals', 'fluegel-oben', 'giraffe-bauch']) {
      const dok = teilSatzDokument(name);
      const b = baumAbleiten(dok, { paare: true });
      const { punkte, flaechen } = baumFeinesNetz(b);
      const ns = netzSicht({ dok, punkte, flaechen, kaefig: b.kaefig, unterteilung: b.unterteilung, reifen: [] });
      const k = ns.knoten.seite;
      let max = 0;
      for (let i = 0; i < k.length; i += 3) {
        let d = Infinity;
        for (const q of punkte) d = Math.min(d, (q[0] - k[i]!) ** 2 + (q[1] - k[i + 1]!) ** 2 + (q[2] - k[i + 2]!) ** 2);
        max = Math.max(max, Math.sqrt(d) * PX);
      }
      expect(max, name).toBeLessThan(6);
    }
  }, 120_000);

  it('Zeit und Umfang an komplexen Körpern (Ausgabe)', () => {
    const zeilen: string[] = [];
    for (const [name, d] of [['ente-haken', s0KoerperDokument('ente-haken')], ['giraffe-bauch', gKoerperDokument('giraffe-bauch')], ['vierbeiner', s0KoerperDokument('vierbeiner')]] as const) {
      const abl = ableiten(d, { stufen: 3 });
      const { punkte, flaechen } = feinesNetz(abl);
      netzSicht({ dok: d, punkte, flaechen }); // warm
      const verdecker = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 2]!.kaefig);
      const ns = netzSicht({ dok: d, punkte, flaechen, kaefig: abl.kaefig, unterteilung: abl.unterteilung, verdecker });
      const proben = ns.zuege.reduce((s, z) => s + z.sicht.length, 0);
      const arten = [...new Set(ns.zuege.map((z) => z.art))].map((a) => `${a} ${ns.zuege.filter((z) => z.art === a).length}`).join(', ');
      zeilen.push(`${name}: ${ns.zuege.length} Züge (${arten}), ${proben} Proben, ${ns.ms.toFixed(1)} ms`);
    }
    console.log(zeilen.join('\n'));
  }, 120_000);
});
