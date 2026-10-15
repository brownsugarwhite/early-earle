// Teil A (Plan „Maul als Einsatz“): ein Prüffall des Einsatzes von A0 bis zur Karte (Körper × Anfang × Form), gemeinsam für
// die Tests von A4 an und die Bilderskripte. A0 mit drei Stufen, Linie aus der Zufallsreihe (kurz, Kiefer gleich), Feld auf
// der ersten exakten Verfeinerung K1 (Radius 3 Kanten), Kantenpfad und Schnitt auf dem feinen Netz, Karte. DOM-frei.
import type { Ableitung } from '../ableiten';
import { ableiten } from '../ableiten';
import { feinesNetz, hautAusNetz } from '../pruefstand';
import { GRUNDKOERPER, type KoerperArt, koerperDokument, vorlageVon } from './koerper';
import { type Anfang, type Form, maulBezug, maulLinien } from './linien';
import { zufall } from './zufall';
import { alleFlaechen } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { type FeldSpec, feldMitGerademRand, flaechenAbstand } from '../einsatz/feld';
import { type Aufgeschnitten, aufschneiden, type FeinNetz, feinNetz, kantenPfad, linieAufNetz } from '../einsatz/flaeche';
import { type Karte, karteBauen } from '../einsatz/karte';
import { type Verfeinert, verfeinern1 } from '../einsatz/verfeinern';

type V3 = [number, number, number];

export type EinsatzFall = {
  name: string;
  abl: Ableitung;
  /** feines Netz von A0 (Stufe 3 = Stufe 2 von K1, gleiche Nummern) */
  netz: FeinNetz;
  linie: V3[];
  v: Verfeinert;
  /** feine Flächen von K1 auf Stufe 2 (Blöcke je Fläche von K1) und ihre Grenzlagen */
  feinFlaechen: number[][];
  feinK1: Float64Array;
  h1: number;
  feld: FeldSpec & { radius: number };
  pfad: number[];
  schnitt: Aufgeschnitten;
  karte: Karte;
};

/** Alle 54 Fälle der Einsatz-Reihe (6 Körper × 3 Anfänge × 3 Formen). */
export function einsatzFaelle(): [KoerperArt, Anfang, Form][] {
  const faelle: [KoerperArt, Anfang, Form][] = [];
  for (const k of ['kugel', 'ei', 'birne', 'rex', 'langhals', 'robbe'] as KoerperArt[]) for (const a of ['hoch', 'mittel', 'tief'] as Anfang[]) for (const f of ['gerade', 'j', 's'] as Form[]) faelle.push([k, a, f]);
  return faelle;
}

/** Einen Fall bis zur Karte bauen; null, wenn die Reihe für diese Lage keine Linie zieht; `fehler` bei einem Bruch. */
export function einsatzFall(art: KoerperArt, anfang: Anfang, form: Form): EinsatzFall | { name: string; fehler: string } | null {
  const name = `${art}/${anfang}/${form}`;
  const dok = koerperDokument(art, zufall(1));
  const abl = ableiten(dok, { stufen: 3 });
  const vorlage = GRUNDKOERPER.includes(art) ? null : vorlageVon(art as 'rex' | 'langhals' | 'robbe');
  const l = maulLinien(dok, art, maulBezug(art, dok, vorlage), hautAusNetz(abl), anfang, form, 'kurz', 'gleich', zufall(3));
  if ('fehler' in l) return null;
  const { flaechen } = feinesNetz(abl);
  const netz = feinNetz(abl.fein, flaechen);
  const auf = linieAufNetz(netz, l.oben);
  const v = verfeinern1(abl.kaefig);
  const u = unterteilung(v.kaefig, 2);
  const fein = anwenden3(u.grenze, v.kaefig.xyz);
  const ff = alleFlaechen(u.stufen[u.stufen.length - 1]!.kaefig);
  const d = flaechenAbstand(fein, ff, v.kaefig.nF, auf.lagen);
  const kanten: number[] = [];
  for (let e = 0; e < v.kaefig.nE; e++) {
    const a = v.kaefig.eA[e]!;
    const b = v.kaefig.eB[e]!;
    kanten.push(Math.hypot(v.kaefig.xyz[3 * a]! - v.kaefig.xyz[3 * b]!, v.kaefig.xyz[3 * a + 1]! - v.kaefig.xyz[3 * b + 1]!, v.kaefig.xyz[3 * a + 2]! - v.kaefig.xyz[3 * b + 2]!));
  }
  kanten.sort((a, b) => a - b);
  const h1 = kanten[Math.floor(kanten.length / 2)]!;
  const feld = feldMitGerademRand(v.kaefig, d, 3 * h1, h1);
  // feine Dreiecke der rechten Hälfte von M (Blöcke der Stufe-1-Flächen; je Viereck zwei Dreiecke in `feinNetz`)
  const block = ff.length / v.kaefig.nF;
  const dreiecke: number[] = [];
  for (const f of feld.feld)
    for (let q = f * block; q < (f + 1) * block; q++) {
      const ecken = ff[q]!;
      if (ecken.some((p) => netz.punkte[3 * p + 2]! < -1e-9)) continue;
      dreiecke.push(2 * q, 2 * q + 1);
    }
  const pfad = kantenPfad(netz, dreiecke, auf.lagen);
  if (pfad.length < 2) return { name, fehler: 'kein Pfad' };
  const schnitt = aufschneiden(netz, dreiecke, pfad);
  const karte = karteBauen({ dreiecke: schnitt.dreiecke, punkte: netz.punkte, nPunkte: netz.punkte.length / 3, doppel: schnitt.doppel, pfad });
  return { name, abl, netz, linie: auf.lagen, v, feinFlaechen: ff, feinK1: Float64Array.from(fein), h1, feld, pfad, schnitt, karte };
}
