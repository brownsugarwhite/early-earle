// Teil A (Plan „Maul als Einsatz“), Schritt A2: der einmal exakt verfeinerte Käfig. Der Maul-Einsatz kommt nicht in den
// Käfig A0 (≈ 400 Punkte, Kragen eine ganze Grundfläche breit), sondern in seine erste Catmull-Clark-Stufe (≈ 1600 Punkte):
// Sie hat dieselbe Grenzfläche wie A0 (Unterteilung ist Verfeinerung), samt Falten (Chaikin-Abbau, Schärfe − 1), und A wird
// eine Stufe weniger unterteilt — das feine Netz bleibt so groß wie heute. Dazu die Herkunft jedes verfeinerten Punkts
// (Eckpunkt, Kantenpunkt oder Flächenpunkt von A0) und die Kindflächen je Fläche von A0 (für Feld, Kragen und das Kopieren
// der äußeren feinen Blöcke). DOM-frei.
import type { Kaefig } from '../../kaefig/halbkanten';
import { verfeinern } from '../../subdivision/catmullClark';
import type { DuennMatrix } from '../../subdivision/matrix';

/** Herkunft eines verfeinerten Punkts: 0 = Eckpunkt (Index wie in A0), 1 = Kantenpunkt (Kante von A0), 2 = Flächenpunkt */
export const HERKUNFT_ECKE = 0;
export const HERKUNFT_KANTE = 1;
export const HERKUNFT_FLAECHE = 2;

export type Verfeinert = {
  /** Käfig der Stufe 1 (Lagen = Stufe-1-Punkte von A0, Kindschärfen) */
  kaefig: Kaefig;
  /** Lagen Stufe 1 ← A0 */
  matrix: DuennMatrix;
  /** je verfeinertem Punkt: Art der Herkunft und Index in A0 (Punkt, Kante oder Fläche) */
  art: Uint8Array;
  quelle: Int32Array;
  /** je Fläche von A0: ihre Kindflächen in der Stufe 1 (erste Kindfläche, Anzahl = Eckenzahl), in Umlaufreihenfolge */
  kinderStart: Int32Array;
  /** je Kindfläche: die Fläche von A0, aus der sie stammt */
  elternFlaeche: Int32Array;
};

/** A0 einmal exakt verfeinern (Catmull-Clark mit DeRose-Falten wie die Unterteilung des Kerns). */
export function verfeinern1(a0: Kaefig): Verfeinert {
  const st = verfeinern(a0);
  const nV = a0.n;
  const nE = a0.nE;
  const nF = a0.nF;
  const n = st.kaefig.n;
  const art = new Uint8Array(n);
  const quelle = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    if (i < nV) {
      art[i] = HERKUNFT_ECKE;
      quelle[i] = i;
    } else if (i < nV + nE) {
      art[i] = HERKUNFT_KANTE;
      quelle[i] = i - nV;
    } else {
      art[i] = HERKUNFT_FLAECHE;
      quelle[i] = i - nV - nE;
    }
  }
  // Kindflächen: `verfeinern` legt je Fläche von A0 ihre Ecken der Reihe nach an (eine Kindfläche je Ecke)
  const kinderStart = new Int32Array(nF + 1);
  for (let f = 0; f < nF; f++) kinderStart[f + 1] = kinderStart[f]! + (a0.fStart[f + 1]! - a0.fStart[f]!);
  const elternFlaeche = new Int32Array(kinderStart[nF]!);
  for (let f = 0; f < nF; f++) for (let c = kinderStart[f]!; c < kinderStart[f + 1]!; c++) elternFlaeche[c] = f;
  return { kaefig: st.kaefig, matrix: st.matrix, art, quelle, kinderStart, elternFlaeche };
}
