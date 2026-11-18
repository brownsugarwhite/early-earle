// Versuch 13.10. nachmittags: Bauweise „rund“ gegen creation (Platzhalter-Loft bzw. Kanten-Käfig), Wirbelsäule und
// Schnitt-Loft. Gemessen: Abweichung des 3D-Umrisses von den gezeichneten Profilen in px (461 px je Kachel, Mittel und
// Größtwert über beide Richtungen) und die Bauzeit. Prüfwesen: Kugel, Florians Überhang (13.10.), Rex, Tiger, Robbe,
// Langhals.
import { type Dokument, dokumentLesen, loftNetz, neuesDokument } from '@ee/shape';
import { type Netz, type V3, type Vorlage, RUND_GROB, rundKoerper, schnittLoft, unterteilenMehrfach, vorlageDokument } from '@ee/shape/versuch';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { kantenBauen, kantenDreiecke, mitKanten } from '../kanten/kantenKoerper';
import { netzAusFlaeche } from '../schnitte/schnittKoerper';
import { umrissAbweichung } from './umrissMessen';
import { wirbelBauen } from '../wirbel/wirbelKoerper';

const WESEN = ['kugel', 'ueberhang', 'rex', 'tiger', 'robbe', 'langhals'] as const;

function laden(wesen: string): Dokument {
  if (wesen === 'kugel') return neuesDokument('Kugel');
  const json = JSON.parse(readFileSync(new URL(`../../public/versuch/${wesen}/${wesen}.json`, import.meta.url), 'utf8')) as { format?: string };
  return json.format === 'ee-wesen' ? dokumentLesen(json) : vorlageDokument(json as Vorlage, 'zu', wesen);
}

type Bau = { netz: Netz; ms: number; dreiecke: number };

function zeit<T>(f: () => T): [T, number] {
  const t0 = performance.now();
  const r = f();
  return [r, performance.now() - t0];
}

function dreieckNetz(positionen: Float32Array): Netz {
  const punkte: V3[] = [];
  for (let i = 0; i < positionen.length; i += 3) punkte.push([positionen[i]!, positionen[i + 1]!, positionen[i + 2]!]);
  const flaechen: number[][] = [];
  for (let i = 0; i < punkte.length; i += 3) flaechen.push([i, i + 1, i + 2]);
  return { punkte, flaechen, schaerfe: new Map() };
}

const bauweisen: Record<string, (d: Dokument) => Bau> = {
  creation: (d) => {
    if (mitKanten(d)) {
      const [t, ms] = zeit(() => kantenDreiecke(kantenBauen(d)));
      return { netz: dreieckNetz(t.positionen), ms, dreiecke: t.positionen.length / 9 };
    }
    const [l, ms] = zeit(() => loftNetz(d));
    return { netz: netzAusFlaeche(l.positionen, l.indizes), ms, dreiecke: l.indizes.length / 3 };
  },
  wirbelsäule: (d) => {
    const [n, ms] = zeit(() => unterteilenMehrfach(wirbelBauen(d, false, { winkel: 0, bei: 0.5 }), 3));
    return { netz: n, ms, dreiecke: n.flaechen.length * 2 };
  },
  schnitte: (d) => {
    const [s, ms] = zeit(() => schnittLoft(d, { aufloesung: 112 }));
    return { netz: netzAusFlaeche(s.positionen, s.indizes), ms, dreiecke: s.indizes.length / 3 };
  },
  rund: (d) => {
    const [r, ms] = zeit(() => rundKoerper(d));
    return { netz: netzAusFlaeche(r.positionen, r.indizes), ms, dreiecke: r.indizes.length / 3 };
  },
};

describe('Versuch rund gegen creation, Wirbelsäule und Schnitt-Loft', () => {
  it('Umrisse und Bauzeit je Prüfwesen', () => {
    const zeilen = ['| Wesen | Bauweise | Seite Ø/max px | Front Ø/max px | Top Ø/max px | Bauzeit ms | Dreiecke |', '|---|---|---|---|---|---|---|'];
    const rund: Record<string, Record<'seite' | 'front' | 'top', { mittel: number; max: number }>> = {};
    for (const wesen of WESEN) {
      const dok = laden(wesen);
      for (const [name, bauen] of Object.entries(bauweisen)) {
        bauen(dok); // aufwärmen (JIT)
        const b = bauen(dok);
        const u = { seite: umrissAbweichung(b.netz, dok, 'seite'), front: umrissAbweichung(b.netz, dok, 'front'), top: umrissAbweichung(b.netz, dok, 'top') };
        const fmt = (x: { mittel: number; max: number }) => `${x.mittel.toFixed(1)} / ${x.max.toFixed(1)}`;
        let zeitText = b.ms.toFixed(0);
        if (name === 'rund') {
          rund[wesen] = u;
          const [, msGrob] = zeit(() => rundKoerper(dok, { abstand: RUND_GROB, vereinigen: false }));
          zeitText = `${b.ms.toFixed(0)} (grob ${msGrob.toFixed(0)})`;
        }
        zeilen.push(`| ${wesen} | ${name} | ${fmt(u.seite)} | ${fmt(u.front)} | ${fmt(u.top)} | ${zeitText} | ${b.dreiecke} |`);
      }
    }
    console.log(zeilen.join('\n'));
    // Seite genau (Rand liegt auf dem Umriss), Kugel in allen Ansichten
    for (const wesen of WESEN) expect(rund[wesen]!.seite.mittel).toBeLessThan(1);
    for (const a of ['seite', 'front', 'top'] as const) expect(rund.kugel![a].max).toBeLessThan(1.5);
  }, 120_000);
});
