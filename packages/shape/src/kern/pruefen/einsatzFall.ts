// Teil A (Plan „Maul als Einsatz“): ein Prüffall des Einsatzes von A0 bis zur Karte (Körper × Anfang × Form), gemeinsam für
// die Tests von A4 an und die Bilderskripte. A0 mit drei Stufen, Linie aus der Zufallsreihe (kurz, Kiefer gleich), Feld auf
// der ersten exakten Verfeinerung K1 (Radius 3 Kanten), Kantenpfad und Schnitt auf dem feinen Netz, Karte. DOM-frei.
import type { Dokument, Linie3 } from '../../dokument';
import type { Ableitung } from '../ableiten';
import { ableiten } from '../ableiten';
import { lippeAnHaut } from '../../lippeHaut';
import { abtasten3, linieDurch } from '../../versuch/linie3d';
import { hautZ } from '../netz/pruefen';
import { feinesNetz, hautAusNetz } from '../pruefstand';
import { GRUNDKOERPER, type KoerperArt, koerperDokument, vorlageVon } from './koerper';
import { type Anfang, type Form, maulBezug, maulLinien } from './linien';
import { zufall } from './zufall';
import { alleFlaechen } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { type FeldSpec, feldMitGerademRand, flaechenAbstand } from '../einsatz/feld';
import { ankerVon, type Aufgeschnitten, aufschneiden, type FeinNetz, feinNetz, kantenPfad, linieAufNetz } from '../einsatz/flaeche';
import { type Karte, karteBauen } from '../einsatz/karte';
import { type Verfeinert, verfeinern1 } from '../einsatz/verfeinern';

type V3 = [number, number, number];

export type EinsatzFall = {
  name: string;
  /** Körper ohne Maul (Dokument) und seine Ableitung A0 */
  dok: Dokument;
  abl: Ableitung;
  /** feines Netz von A0 (Stufe 3 = Stufe 2 von K1, gleiche Nummern) */
  netz: FeinNetz;
  /** Maullinie wie gezeichnet (Welt) und auf das feine Netz gelegt (24 je Segment) */
  maulLinie: Linie3;
  linie: V3[];
  /** Lippenziel: die auf die Haut gelegte Linie dicht abgetastet (64 je Segment), bei Bedarf gerechnet und gemerkt */
  lippenZiel: () => V3[];
  /** größter Abstand der gelegten Linie zur Haut (px; Linien entlang der Silhouette bekommen aus der Seite keine Tiefe) */
  hautAbstand: number;
  v: Verfeinert;
  /** feine Flächen von K1 auf Stufe 2 (Blöcke je Fläche von K1) und ihre Grenzlagen */
  feinFlaechen: number[][];
  feinK1: Float64Array;
  h1: number;
  feld: FeldSpec & { radius: number };
  /** feine Dreiecke der rechten Hälfte von M (Indizes in `netz.dreiecke`) */
  feldDreiecke: number[];
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

type KoerperStand = { dok: ReturnType<typeof koerperDokument>; abl: Ableitung; netz: FeinNetz; v: Verfeinert; fein: Float64Array; ff: number[][]; h1: number };
const koerperMerk = new Map<KoerperArt, KoerperStand>();

/** Körperstand je Körperart (gemerkt; die Fälle teilen ihn, keiner verändert ihn): A0, feines Netz, K1 und seine Stufe 2. */
function koerperStand(art: KoerperArt): KoerperStand {
  const alt = koerperMerk.get(art);
  if (alt) return alt;
  const dok = koerperDokument(art, zufall(1));
  const abl = ableiten(dok, { stufen: 3 });
  const netz = feinNetz(abl.fein, feinesNetz(abl).flaechen);
  const v = verfeinern1(abl.kaefig);
  const u = unterteilung(v.kaefig, 2);
  const fein = anwenden3(u.grenze, v.kaefig.xyz);
  const ff = alleFlaechen(u.stufen[u.stufen.length - 1]!.kaefig);
  const kanten: number[] = [];
  for (let e = 0; e < v.kaefig.nE; e++) {
    const a = v.kaefig.eA[e]!;
    const b = v.kaefig.eB[e]!;
    kanten.push(Math.hypot(v.kaefig.xyz[3 * a]! - v.kaefig.xyz[3 * b]!, v.kaefig.xyz[3 * a + 1]! - v.kaefig.xyz[3 * b + 1]!, v.kaefig.xyz[3 * a + 2]! - v.kaefig.xyz[3 * b + 2]!));
  }
  kanten.sort((a, b) => a - b);
  const stand = { dok, abl, netz, v, fein, ff, h1: kanten[Math.floor(kanten.length / 2)]! };
  koerperMerk.set(art, stand);
  return stand;
}

/**
 * Einen Fall bis zur Karte bauen; null, wenn die Reihe für diese Lage keine Linie zieht; `fehler` bei einem Bruch.
 * `verlaengerung`: Das Feld misst den Abstand zur Linie samt ihrer Verlängerung über den Mundwinkel hinaus (auf der Haut, in
 * Feldradien), damit hinter dem Mundwinkel so viel Haut im Feld liegt wie über und unter der Lippe.
 */
export function einsatzFall(art: KoerperArt, anfang: Anfang, form: Form, opt: { verlaengerung?: number } = {}): EinsatzFall | { name: string; fehler: string } | null {
  const name = `${art}/${anfang}/${form}`;
  const { dok, abl, netz, v, fein, ff, h1 } = koerperStand(art);
  const vorlage = GRUNDKOERPER.includes(art) ? null : vorlageVon(art as 'rex' | 'langhals' | 'robbe');
  const roh = maulLinien(dok, art, maulBezug(art, dok, vorlage), hautAusNetz(abl), anfang, form, 'kurz', 'gleich', zufall(3));
  if ('fehler' in roh) return null;
  // Linie auf die Haut legen wie im Editor nach Teil H (Seitenlage bleibt, Tiefe von der Haut); die Reihe holt die Tiefe nur
  // grob aus dem feinen Netz (Linien bis 13 px neben der Haut)
  const l = { ...roh, oben: linieAufHaut(abl, roh.oben) };
  const auf = linieAufNetz(netz, l.oben);
  const d = flaechenAbstand(fein, ff, v.kaefig.nF, opt.verlaengerung ? [...auf.lagen, ...verlaengern(netz, auf.lagen, opt.verlaengerung * 3 * h1)] : auf.lagen);
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
  let hautAbstand = 0;
  for (const p of abtasten3(l.oben, 32) as V3[]) hautAbstand = Math.max(hautAbstand, ankerVon(netz, p).abstand * 461);
  const pfad = kantenPfad(netz, dreiecke, auf.lagen);
  if (pfad.length < 2) return { name, fehler: 'kein Pfad' };
  const schnitt = aufschneiden(netz, dreiecke, pfad);
  const karte = karteBauen({ dreiecke: schnitt.dreiecke, punkte: netz.punkte, nPunkte: netz.punkte.length / 3, doppel: schnitt.doppel, pfad });
  let ziel: V3[] | null = null;
  const lippenZiel = () => (ziel ??= abtasten3(l.oben, 64) as V3[]);
  return { name, dok, abl, netz, maulLinie: l.oben, linie: auf.lagen, lippenZiel, hautAbstand, v, feinFlaechen: ff, feinK1: Float64Array.from(fein), h1, feld, feldDreiecke: dreiecke, pfad, schnitt, karte };
}

/** Verlängerung einer Linie über ihr Ende hinaus auf der Haut: Schritte in der letzten Richtung, je Schritt auf das Netz gelegt. */
function verlaengern(netz: FeinNetz, linie: readonly V3[], laenge: number, schritte = 16): V3[] {
  const n = linie.length;
  const a = linie[Math.max(0, n - 4)]!;
  let p = linie[n - 1]!;
  let r: V3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const out: V3[] = [];
  for (let i = 0; i < schritte; i++) {
    const l = Math.hypot(...r) || 1;
    const q = ankerVon(netz, [p[0] + (r[0] / l) * (laenge / schritte), p[1] + (r[1] / l) * (laenge / schritte), p[2] + (r[2] / l) * (laenge / schritte)]).lage;
    r = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    p = q;
    out.push(q);
  }
  return out;
}

/**
 * Linie auf die Haut legen (Teil H: Seitenlage bleibt, Tiefe von der Haut): 16 Punkte gleichmäßig nach der Seitenlänge, Tiefe
 * je Punkt per Strahl auf Stufe 4 (`hautZ`, außerhalb der Silhouette die alte Tiefe), Anfang auf der Naht, glatt durch die
 * Punkte geführt; `lippeAnHaut` legt die Tiefengriffe zwischen den Knoten auf die Haut und macht den Anfang rund. Mit wenigen
 * Knoten folgt eine kubische Tiefe einer stark gebogenen Haut nicht (bis 6 px daneben), mit 16 Knoten schon.
 */
export function linieAufHaut(abl: Ableitung, linie: Linie3, knoten = 16): Linie3 {
  const proben = abtasten3(linie, 48) as V3[];
  const s = [0];
  for (let i = 1; i < proben.length; i++) s.push(s[i - 1]! + Math.hypot(proben[i]![0] - proben[i - 1]![0], proben[i]![1] - proben[i - 1]![1]));
  const L = s[s.length - 1]!;
  const pts: V3[] = [];
  for (let k = 0; k < knoten; k++) {
    const ziel = (k / (knoten - 1)) * L;
    let i = 0;
    while (i + 2 < proben.length && s[i + 1]! < ziel) i++;
    const t = s[i + 1]! > s[i]! ? Math.min(1, Math.max(0, (ziel - s[i]!) / (s[i + 1]! - s[i]!))) : 0;
    const a = proben[i]!;
    const b = proben[i + 1]!;
    const x = a[0] + t * (b[0] - a[0]);
    const y = a[1] + t * (b[1] - a[1]);
    const z = k === 0 ? 0 : (hautZ(abl, x, y) ?? a[2] + t * (b[2] - a[2]));
    pts.push([x, y, z]);
  }
  return lippeAnHaut(linieDurch(pts), (x, y) => hautZ(abl, x, y));
}
