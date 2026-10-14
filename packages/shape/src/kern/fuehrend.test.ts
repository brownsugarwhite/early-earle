// „Formen folgen“ (15.10.): Die zuletzt bearbeitete Kurve führt. Rex: Florians Front ist breiter als sein Top; mit
// führender Front liegt der Körper auf der Front, mit führendem Top auf dem Top, ohne Führung gilt die Sichthülle.
import { describe, expect, it } from 'vitest';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import { alleFlaechen } from '../kaefig/halbkanten';
import type { V3 } from '../versuch/catmullClark';
import { type AbleitOptionen, ableiten } from './ableiten';
import { blattAbweichungen } from './abweichung';

declare const console: { log: (...a: unknown[]) => void };

function messen(opt: Partial<AbleitOptionen>) {
  const dok = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
  const abl = ableiten(dok, { stufen: 2, ...opt });
  const punkte: V3[] = [];
  for (let i = 0; i < abl.fein.length / 3; i++) punkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
  const ab = blattAbweichungen(punkte, alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig), dok);
  console.log(`Rex, führend ${opt.fuehrend ?? 'keine'}: Seite ${ab.seite.max.toFixed(1)} px, Front ${ab.front.max.toFixed(1)} px, Top ${ab.top.max.toFixed(1)} px`);
  return ab;
}

describe('Formen folgen: führende Kurve', () => {
  it('führende Front: die Front bestimmt die Breite am breitesten Punkt jedes Rings (Front näher, Top weiter weg)', () => {
    // Aus der rohen Zeichnung (Front 0,014 breiter als Top) bleibt die Front an den Kopfhöhen unterfüllt (Lappen-Vorlage,
    // 7,5 px); im Editor führt die Front nur nach einem Zug, wenn die anderen Kurven schon dem Körper folgen
    const ab = messen({ fuehrend: 'front' });
    expect(ab.front.max).toBeLessThan(9);
    expect(ab.top.max).toBeGreaterThan(4);
  });
  it('führendes Top: wie die Sichthülle beim Rex (Top ≤ 1,5 px, Front ≈ 11 px)', () => {
    const ab = messen({ fuehrend: 'top' });
    expect(ab.top.max).toBeLessThan(1.5);
    expect(ab.front.max).toBeGreaterThan(8);
  });
});
