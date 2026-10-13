// Diagnose Beweis 4: Tiger mit Kastenschnauze und Maul (Stufe 2) — Lippen zu, Durchdringungen je Öffnung, Lage der Front.
import { describe, expect, it } from 'vitest';
import { type Vorlage, vorlageDokument } from '../versuch';
import tigerJson from '../versuch/vorlagen/tiger.json';
import { selbstDurchdringungen } from '../versuch/pruefen';
import type { V3 } from '../versuch/catmullClark';
import { alleFlaechen } from '../kaefig/halbkanten';
import { kastenSpanten } from './kasten';
import { ableitenMitMaul, maulPose } from './maul';

declare const console: { log: (...a: unknown[]) => void };

describe('Tiger-Diagnose (Beweis 4)', () => {
  it('Maul zu: Lippenketten liegen aufeinander; Durchdringungen bei 0/50/100 %; Front der Kastenschnauze', () => {
    const roh = vorlageDokument(tigerJson as unknown as Vorlage, 'zu', 'tiger');
    const dok = { ...roh, spanten: kastenSpanten(roh.profile.front, 0.02, 0.15, 0.25, 0.85) };
    const abl = ableitenMitMaul(dok, { fv: [{ f: 0.02, v: 0.28 }, { f: 0.1, v: 0.26 }, { f: 0.17, v: 0.33 }], unterSpitze: 1 }, { stufen: 2 });
    const m = abl.maul;
    const v = abl.vorlage;
    const zu = maulPose(abl, 0).fein;
    let spalt = 0;
    for (const [t, idx] of m.pfad.entries()) {
      const u = m.unten[t] ?? idx;
      spalt = Math.max(spalt, Math.hypot(zu[3 * idx]! - zu[3 * u]!, zu[3 * idx + 1]! - zu[3 * u + 1]!, zu[3 * idx + 2]! - zu[3 * u + 2]!));
    }
    expect(spalt).toBeLessThan(1e-9);
    const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);
    const zeilen: string[] = [`Tiger: Käfig ${abl.kaefig.n}, Maul m=${m.lage.m} k=${m.lage.k} jL=${m.lage.jL}, Lippen zu (Spalt ${spalt.toExponential(1)})`];
    for (const oeffnung of [0, 0.5, 1]) {
      const fein = maulPose(abl, oeffnung).fein;
      const punkte: V3[] = [];
      for (let i = 0; i < fein.length / 3; i++) punkte.push([fein[3 * i]!, fein[3 * i + 1]!, fein[3 * i + 2]!]);
      const d = selbstDurchdringungen({ punkte, flaechen, schaerfe: new Map<string, number>() }, 1e-4);
      zeilen.push(`${Math.round(oeffnung * 100)} %: ${d.paare} Durchdringungen${d.paare ? ' z. B. (' + d.orte[0]!.map((x) => x.toFixed(3)).join(', ') + ')' : ''}`);
    }
    const P = (i: number) => `(${zu[3 * i]!.toFixed(3)}, ${zu[3 * i + 1]!.toFixed(3)}, ${zu[3 * i + 2]!.toFixed(3)})`;
    zeilen.push(`Front: Ring 0 oben ${P(v.ringPunkt(0, 0))}, unten ${P(v.ringPunkt(0, v.N / 2))}; Spitze ${P(v.naht.spitzeVorn)}; Lippe t0 ${P(m.pfad[0]!)}`);
    console.log(zeilen.join('\n'));
  });
});
