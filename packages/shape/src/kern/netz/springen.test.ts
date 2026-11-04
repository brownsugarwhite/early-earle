// Teil L, L0 Fall 5 (ohne Springen), soweit am Einpassen messbar: (1) Eine Pinselbeule neben einer neuen Linie bleibt, wo
// sie ist — das Ziel des Einpassens ist die alte Fläche samt Beule (Tor ≤ 0,5 px). (2) Ein Linienstück wird in zehn Schritten
// um 30 px gezogen, die Reihe bleibt eingefroren: Die Fläche ändert sich je Schritt höchstens um die Formtreue (Tor ≤ 0,5 px),
// die Reihe springt nicht; zum Vergleich die frisch gewählte Reihe. Offen in Fall 5: eine Schleife mehr bei zwei Linien, die
// dichter liegen als eine Reihe.
import { describe, expect, it } from 'vitest';
import type { KaefigDelta } from '../../dokument';
import { ableiten } from '../ableiten';
import { deltasAnwenden, kaefigNormalen, pinselGewichte } from '../pinsel';
import { koerperDokument } from '../pruefen/koerper';
import { zufall } from '../pruefen/zufall';
import { reiheEinpassen } from './einpassen';
import { PX, formMessung, hautZ, kasten, linieAusSeite } from './pruefen';
import { ankerVon, feinNetz } from '../einsatz/flaeche';
import { feinesNetz } from '../pruefstand';

declare const console: { log: (...a: unknown[]) => void };

type V3 = [number, number, number];

describe('Teil L, L0 Fall 5: ohne Springen', () => {
  it('Pinselbeule neben der Linie bleibt an ihrer Stelle', () => {
    const ohne = ableiten(koerperDokument('kugel', zufall(1)), { stufen: 3 });
    const k = kasten(ohne);
    // Beule 18 px über der Linie (65 % Höhe) auf der Flanke
    const xb = k.x0 + 0.5 * (k.x1 - k.x0);
    const yb = k.y0 + 0.65 * (k.y1 - k.y0) + 18 / PX;
    const zb = hautZ(ohne, xb, yb)!;
    const n0 = ohne.vorlage.kaefig.n;
    const nor = kaefigNormalen(ohne.kaefig.xyz, ohne.kaefig.fStart, ohne.kaefig.fVerts, ohne.kaefig.n);
    const deltas: KaefigDelta[] = [];
    for (const g of pinselGewichte(ohne.kaefig.xyz, n0, [xb, yb, zb], 0.08)) {
      if (ohne.kaefig.xyz[3 * g.punkt + 2]! < 1e-9) continue;
      const h = 0.025 * g.w;
      deltas.push({ punkt: g.punkt, d: [nor[3 * g.punkt]! * h, nor[3 * g.punkt + 1]! * h, nor[3 * g.punkt + 2]! * h] });
    }
    const mit = deltasAnwenden(ohne, deltas);
    // Höhe der Beule gegen den Körper ohne Beule
    const netz0 = feinNetz(ohne.fein, feinesNetz(ohne).flaechen);
    let beule = 0;
    for (let i = 0; i < mit.fein.length; i += 3) beule = Math.max(beule, ankerVon(netz0, [mit.fein[i]!, mit.fein[i + 1]!, mit.fein[i + 2]!]).abstand * PX);
    const zug: [number, number][] = [[k.x0 + 0.25 * (k.x1 - k.x0), k.y0 + 0.65 * (k.y1 - k.y0)], [k.x0 + 0.75 * (k.x1 - k.x0), k.y0 + 0.65 * (k.y1 - k.y0)]];
    const e = reiheEinpassen(mit, linieAusSeite(mit, zug))!;
    const m = formMessung(mit, e.xyz);
    console.log(`Beule ${beule.toFixed(1)} px hoch, 18 px über der Linie: nach dem Einpassen Haut gegen den Körper mit Beule ${m.haut.toFixed(3)} px, Normalen ${m.normale.toFixed(2)}°`);
    expect(beule).toBeGreaterThan(3);
    expect(m.haut).toBeLessThanOrEqual(0.5);
  }, 120_000);

  it('Linienstück 30 px ziehen: eingefrorene Reihe, Fläche je Schritt ≤ 0,5 px', () => {
    const ohne = ableiten(koerperDokument('kugel', zufall(1)), { stufen: 3 });
    const k = kasten(ohne);
    const netzBei = (fein: Float64Array) => feinNetz(fein, feinesNetz(ohne, fein).flaechen);
    let jFest = -1;
    let vorherFest: Float64Array | null = null;
    let maxFest = 0;
    let sprungFrisch = 0;
    const reihenFrisch: number[] = [];
    for (let schritt = 0; schritt <= 10; schritt++) {
      const dy = (3 * schritt) / PX;
      // die Mitte der Linie wird gehoben, die Enden bleiben (ein Knoten in der Mitte gezogen)
      const zug: [number, number][] = [];
      for (let s = 0; s <= 8; s++) {
        const t = s / 8;
        zug.push([k.x0 + (0.25 + 0.5 * t) * (k.x1 - k.x0), k.y0 + 0.62 * (k.y1 - k.y0) + dy * Math.sin(Math.PI * t)]);
      }
      const linie = linieAusSeite(ohne, zug);
      const fest = reiheEinpassen(ohne, jFest >= 0 ? { ...linie, reihe: jFest } : linie)!;
      if (jFest < 0) jFest = fest.j;
      const frisch = reiheEinpassen(ohne, linie)!;
      reihenFrisch.push(frisch.j);
      if (vorherFest) {
        // Abstand der neuen Fläche zur vorigen (Haut, nicht Punktwege: die Punkte gleiten mit der Linie)
        const n = netzBei(vorherFest);
        let d = 0;
        for (let i = 0; i < fest.fein.length; i += 3) d = Math.max(d, ankerVon(n, [fest.fein[i]!, fest.fein[i + 1]!, fest.fein[i + 2]!] as V3).abstand * PX);
        maxFest = Math.max(maxFest, d);
      }
      if (schritt > 0 && reihenFrisch[schritt] !== reihenFrisch[schritt - 1]) sprungFrisch++;
      vorherFest = fest.fein;
    }
    console.log(`eingefrorene Reihe j=${jFest}: Fläche je Schritt höchstens ${maxFest.toFixed(3)} px; frisch gewählte Reihe: ${reihenFrisch.join(' ')} (${sprungFrisch} Wechsel)`);
    expect(maxFest).toBeLessThanOrEqual(0.5);
  }, 600_000);
});
