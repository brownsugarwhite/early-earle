// Posen (Plan Teil B, B2): Saat der Fressen-Pose und Umrechnung alter Daten.
// - Haps als Saat: Der automatische Haps (`hapsAnwenden`, Winkel nach hinten und außen, Lippen auseinander) wird einmal
//   auf der Knochenpose ausgerechnet und als Ruhe-Delta gespeichert (Rᵀ·Versatz). Bei voller Pose sieht er aus wie
//   heute, in den Zwischenstufen dreht er mit den Knochen; danach ist er wie jeder Blendshape weiter formbar.
// - Alte Fressen-Deltas wurden nach den Knochen addiert (posierter Raum, mit der Öffnung skaliert). Als Ruhe-Deltas:
//   D_neu = R(θ_F)ᵀ·D_alt — bei voller Öffnung ergibt sich exakt dieselbe Form.
import type { KaefigDelta } from '../../dokument';
import { type MaulErgebnis, hapsAnwenden } from '../maul';
import { type Skin, skinAnwenden, versatzInRuhe } from './skin';

/** Haps-Saat als volles Ruhe-Deltafeld (beide Hälften), für eine Skin der vollen Pose und die Haps-Stärke. */
export function hapsSaat(abl: MaulErgebnis, sk: Skin, staerke: number): Float64Array {
  const n = abl.kaefig.n;
  const feld = new Float64Array(3 * n);
  if (!(staerke > 0)) return feld;
  const knochen = skinAnwenden(sk, abl.kaefig.xyz);
  const mit = new Float64Array(knochen);
  hapsAnwenden(abl, mit, staerke);
  for (let i = 0; i < n; i++) {
    const d = versatzInRuhe(sk, i, [mit[3 * i]! - knochen[3 * i]!, mit[3 * i + 1]! - knochen[3 * i + 1]!, mit[3 * i + 2]! - knochen[3 * i + 2]!]);
    feld[3 * i] = d[0];
    feld[3 * i + 1] = d[1];
    feld[3 * i + 2] = d[2];
  }
  return feld;
}

/** Alte Fressen-Deltas (nach den Knochen gespeichert) in Ruhe-Deltas der vollen Pose; ohne Knochen unverändert. */
export function fressenDeltasInRuhe(sk: Skin | null, alt: readonly KaefigDelta[]): KaefigDelta[] {
  if (!sk) return alt.map((d) => ({ ...d, d: [...d.d] as [number, number, number] }));
  return alt.map((d) => ({ ...d, d: d.punkt < sk.n ? versatzInRuhe(sk, d.punkt, d.d) : ([...d.d] as [number, number, number]) }));
}
