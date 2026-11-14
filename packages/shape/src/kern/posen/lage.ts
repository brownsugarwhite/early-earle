// Posen (Plan Teil B, Tor von B2): Maullage bei Öffnung w nach dem neuen Modell, X(w) = Skin(A + w·D ; w·θ_F). Bis das
// Dokument Ruhe-Deltas speichert (B3), werden die gespeicherten Fressen-Deltas (nach den Knochen) und der Haps bei jedem
// Bau umgerechnet. Bei w = 1 ist das Ergebnis dasselbe wie `maulLageBei` (≤ 1e-9), dazwischen drehen Haps und Deltas mit
// den Knochen, statt geradlinig überblendet zu werden. Schalter `Bauplan.posenRuhe`.
import type { KaefigDelta } from '../../dokument';
import { anwenden3 } from '../../subdivision/matrix';
import type { MaulErgebnis } from '../maul';
import { deltaFeld, poseAuswerten } from './auswerten';
import { fressenDeltasInRuhe, hapsSaat } from './saat';
import { skinBerechnen, stellungAus } from './skin';

/** Ruhe-Deltas der Fressen-Pose (beide Hälften): Haps-Saat + umgerechnete gespeicherte Deltas. */
export function fressenRuheDeltas(abl: MaulErgebnis, fressen: readonly KaefigDelta[]): Float64Array {
  const opt = abl.maul.opt;
  const voll = skinBerechnen(abl, opt, stellungAus(opt));
  const d = hapsSaat(abl, voll, opt.haps);
  if (fressen.length) {
    const f = deltaFeld(fressenDeltasInRuhe(voll, fressen), abl.kaefig.xyz, abl.kaefig.n);
    for (let k = 0; k < d.length; k++) d[k] = d[k]! + f[k]!;
  }
  return d;
}

export function maulLageRuhe(abl: MaulErgebnis, oeffnung: number, fressen: readonly KaefigDelta[]): { xyz: Float64Array; fein: Float64Array } {
  const opt = abl.maul.opt;
  const d = fressenRuheDeltas(abl, fressen);
  const xyz = poseAuswerten(abl.kaefig.xyz, [{ w: oeffnung, deltas: d, stellung: stellungAus(opt) }], (st) => skinBerechnen(abl, opt, st));
  return { xyz, fein: xyz === abl.kaefig.xyz ? abl.fein : anwenden3(abl.unterteilung.grenze, xyz) };
}
