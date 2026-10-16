// Teil L, L0 Fall 4 (steil): Querlinie als Ring — „Die Fläche bleibt, das Netz gleitet“ mit vertauschten Rollen. Gemessen wie
// in L0.1: Ring i* dicht gegen die Linie (keine Treppe), Haut und Normalen gegen den Körper ohne Linie (Stufe 4), Falten,
// kleinster Flächenwinkel und Seitenverhältnis. Tor (Plan Teil L): Ring ≤ 0,5 px, Haut ≤ 0,25 px, Normalen ≤ 1°.
import { describe, expect, it } from 'vitest';
import { ableiten } from '../ableiten';
import { faltenMass } from '../pruefstand';
import { roehrenGitter } from './gitter';
import { PX, RING_FAELLE, TOR, abstandZug, flaechenGuete, formMessung, linieAusSeite } from './pruefen';
import { ringEinpassen, ringPunkte } from './ringEinpassen';

declare const console: { log: (...a: unknown[]) => void };

describe('Teil L, L0 Fall 4: Querlinie als Ring (Fläche bleibt, Netz gleitet)', () => {
  for (const fall of RING_FAELLE) {
    it(fall.name, () => {
      const ohne = ableiten(fall.dok(), { stufen: 3 });
      const zug = fall.zug(ohne);
      expect(zug.length).toBeGreaterThan(3);
      const linie = linieAusSeite(ohne, zug);
      expect(linie.punkte.length).toBeGreaterThan(20);
      const e = ringEinpassen(ohne, linie);
      expect(e).not.toBeNull();
      const g = roehrenGitter(ohne.unterteilung, ohne.vorlage.R, ohne.vorlage.N, ohne.kaefig.n);
      const ring = ringPunkte(g, e!.i, e!.vVon, e!.vBis);
      let auf = 0;
      let vorher = 0;
      for (const f of ring) {
        auf = Math.max(auf, abstandZug([e!.fein[3 * f]!, e!.fein[3 * f + 1]!, e!.fein[3 * f + 2]!], linie.punkte) * PX);
        vorher = Math.max(vorher, abstandZug([ohne.fein[3 * f]!, ohne.fein[3 * f + 1]!, ohne.fein[3 * f + 2]!], linie.punkte) * PX);
      }
      const m = formMessung(ohne, e!.xyz);
      const f0 = faltenMass(ohne);
      const f1 = faltenMass(ohne, undefined, e!.fein);
      const q = flaechenGuete(ohne, e!.fein);
      console.log(
        `${fall.name}: Ring i=${e!.i}, v ${e!.vVon.toFixed(2)}–${e!.vBis.toFixed(2)}, ${ring.length} Punkte — auf der Linie ${auf.toFixed(2)} px (ohne Gleiten ${vorher.toFixed(1)} px), Haut ${m.haut.toFixed(3)} px, Normalen ${m.normale.toFixed(2)}°, Winkel ${q.winkel.toFixed(1)}° (vorher ${q.winkelVorher.toFixed(1)}°), Seitenverhältnis ${q.seiten.toFixed(2)} (vorher ${q.seitenVorher.toFixed(2)}), Falten ${f0.max.toFixed(1)}° → ${f1.max.toFixed(1)}°, Linie auf der Haut ${(e!.aufHaut * PX).toFixed(2)} px, ${e!.zeit.toFixed(0)} ms`,
      );
      console.log(`  Tor (Plan): ${[auf <= TOR.reihe ? 'Ring ✓' : 'Ring ✗', m.haut <= TOR.haut ? 'Haut ✓' : 'Haut ✗', m.normale <= TOR.normale ? 'Normalen ✓' : 'Normalen ✗'].join(', ')}`);
      expect(ring.length).toBeGreaterThan(0);
      expect(auf).toBeLessThan(fall.waechter.ring);
    });
  }
});
