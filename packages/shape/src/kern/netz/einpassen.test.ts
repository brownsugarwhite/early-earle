// Teil L, L0.1: Längslinie als Reihe — „Die Fläche bleibt, das Netz gleitet“. Gemessen: Reihe j* dicht gegen die Linie
// (keine Treppe), Haut und Normalen gegen den Körper ohne Linie (die Linie liegt auf der Haut, die Form darf sich nicht
// ändern), Falten, kleinster Flächenwinkel und Seitenverhältnis der feinen Flächen, die sich bewegt haben.
// Tor (Plan Teil L): Reihe ≤ 0,5 px, Haut ≤ 0,25 px, Normalen ≤ 1°, Winkel ≥ 20°, Seitenverhältnis ≤ 4, Falten höchstens
// 2° mehr. Haut und Normalen werden gegen die Grenzfläche des alten Käfigs auf Stufe 4 gemessen: Das Dreiecksnetz der
// Stufe 2 liegt als Sehne bis zu 0,2–0,4 px unter der gewölbten Fläche, das wäre Messfehler, keine Formänderung.
import { describe, expect, it } from 'vitest';
import { ableiten } from '../ableiten';
import { faltenMass } from '../pruefstand';
import { reiheEinpassen, reihenPunkte, versuchSetzen } from './einpassen';
import { roehrenGitter } from './gitter';
import { FAELLE, PX, TOR, abstandZug, feldMax, flaechenGuete, formMessung, kasten, linieAusSeite } from './pruefen';

declare const console: { log: (...a: unknown[]) => void };
declare const process: { env: Record<string, string | undefined> };
// Messreihen: Feldart, Teilung, Gewichte über VERSUCH='{"art":"platte",…}'
if (process.env.VERSUCH) versuchSetzen(JSON.parse(process.env.VERSUCH) as Parameters<typeof versuchSetzen>[0]);
// Ableitung wie im Editor (Stufe 3); RING='24' prüft dichtere Reihen
const STUFEN = { stufen: 3, ...(process.env.RING ? { ring: Number(process.env.RING) } : {}), ...(process.env.RINGE ? { ringe: Number(process.env.RINGE) } : {}) };

describe('Teil L, L0.1: Längslinie als Reihe (Fläche bleibt, Netz gleitet)', () => {
  for (const fall of FAELLE) {
    it(fall.name, () => {
      const ohne = ableiten(fall.dok(), STUFEN);
      const linie = linieAusSeite(ohne, fall.zug(kasten(ohne)));
      expect(linie.punkte.length).toBeGreaterThan(20);
      const e = reiheEinpassen(ohne, linie);
      expect(e).not.toBeNull();
      const g = roehrenGitter(ohne.unterteilung, ohne.vorlage.R, ohne.vorlage.N, ohne.kaefig.n);
      const reihe = reihenPunkte(g, e!.j, e!.uVon, e!.uBis);
      let auf = 0;
      let vorher = 0;
      for (const f of reihe) {
        auf = Math.max(auf, abstandZug([e!.fein[3 * f]!, e!.fein[3 * f + 1]!, e!.fein[3 * f + 2]!], linie.punkte) * PX);
        vorher = Math.max(vorher, abstandZug([ohne.fein[3 * f]!, ohne.fein[3 * f + 1]!, ohne.fein[3 * f + 2]!], linie.punkte) * PX);
      }
      const m = formMessung(ohne, e!.xyz);
      const f0 = faltenMass(ohne);
      const f1 = faltenMass(ohne, undefined, e!.fein);
      const q = flaechenGuete(ohne, e!.fein);
      console.log(
        `${fall.name}: Reihe j=${e!.j} (Feld bis ${feldMax(e!.feld, ohne.vorlage.R, ohne.vorlage.N).toFixed(2)} Reihen), u ${e!.uVon.toFixed(2)}–${e!.uBis.toFixed(2)}, ${reihe.length} Punkte — auf der Linie ${auf.toFixed(2)} px (ohne Gleiten ${vorher.toFixed(1)} px), Haut ${m.haut.toFixed(3)} px bei (${m.ort.map((x) => x.toFixed(3)).join(', ')}), Normalen ${m.normale.toFixed(2)}° bei (${m.normaleOrt.map((x) => x.toFixed(3)).join(', ')}), Winkel ${q.winkel.toFixed(1)}° (vorher ${q.winkelVorher.toFixed(1)}°) bei (${q.winkelOrt.map((x) => x.toFixed(3)).join(', ')}), Seitenverhältnis ${q.seiten.toFixed(2)} (vorher ${q.seitenVorher.toFixed(2)}) bei (${q.seitenOrt.map((x) => x.toFixed(3)).join(', ')}), Falten ${f0.max.toFixed(1)}° → ${f1.max.toFixed(1)}° bei (${f1.ort.map((x) => x.toFixed(3)).join(', ')}), Linie auf der Haut ${(e!.aufHaut * PX).toFixed(2)} px, ${e!.zeit.toFixed(1)} ms`,
      );
      const tor = [auf <= TOR.reihe ? 'Reihe ✓' : 'Reihe ✗', m.haut <= TOR.haut ? 'Haut ✓' : 'Haut ✗', m.normale <= TOR.normale ? 'Normalen ✓' : 'Normalen ✗'].join(', ');
      console.log(`  Tor (Plan): ${tor}`);
      expect(reihe.length).toBeGreaterThan(0);
      expect(auf).toBeLessThan(fall.waechter.reihe);
      if (fall.waechter.haut !== undefined) expect(m.haut).toBeLessThan(fall.waechter.haut);
      if (fall.waechter.normale !== undefined) expect(m.normale).toBeLessThan(fall.waechter.normale);
    }, 120_000);
  }
});
