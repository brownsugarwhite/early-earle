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
import { type FeldSpec, feldMitGerademRand, flaechenAbstand, M_MAX } from '../einsatz/feld';
import { ankerVon, type Aufgeschnitten, aufschneiden, type FeinNetz, feinNetz, kantenPfad, linieAufNetz, schnittAufLinie } from '../einsatz/flaeche';
import { type Karte, karteBauen } from '../einsatz/karte';
import { type Verfeinert, verfeinern1 } from '../einsatz/verfeinern';
import { lippeAnpassen } from '../einsatz/lippe';
import { a0Netz, type EinsatzMasse, einsatzLoesen, einsatzMessen, type GeloesterEinsatz, type LoesenOptionen } from '../einsatz/loesen';
import { type EinsatzOptionen, type EinsatzTopologie, einsatzTopologie } from '../einsatz/topologie';
import type { Bauplan } from '../wesen';
import { editorBauen, editorPlan, imAblauf } from './extremMessung';

type V3 = [number, number, number];

export type EinsatzFall = {
  name: string;
  /** Körper ohne Maul (Dokument) und seine Ableitung A0 */
  dok: Dokument;
  abl: Ableitung;
  /** feines Netz von A0 (Stufe 3 = Stufe 2 von K1, gleiche Nummern); mit `schnitt: 'linie'` liegen die Pfadpunkte auf der
   * Linie (`schnittAufLinie`) — das Netz, auf dem Schnitt und Karte stehen */
  netz: FeinNetz;
  /** Maullinie wie gezeichnet (Welt) und auf das feine Netz gelegt (24 je Segment) */
  maulLinie: Linie3;
  linie: V3[];
  /** Lippenziel: die auf die Haut gelegte Linie dicht abgetastet (64 je Segment), bei Bedarf gerechnet und gemerkt */
  lippenZiel: () => V3[];
  /** größter Abstand der gelegten Linie zur Haut (px; Linien entlang der Silhouette bekommen aus der Seite keine Tiefe) */
  hautAbstand: number;
  v: Verfeinert;
  /** Stufe des Feldkäfigs: 1 = K1, 2 = K2 (Standard des Kernrings: zweimal exakt verfeinert, alle Abstände halb so groß) */
  stufe: 1 | 2;
  /** feine Flächen des Feldkäfigs auf Stufe 3 − stufe (Blöcke je Fläche) und ihre Grenzlagen (= Stufe 3 von A0) */
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

type KoerperStand = { dok: Dokument; abl: Ableitung; netz: FeinNetz; v: Verfeinert; fein: Float64Array; ff: number[][]; h1: number; hFeld: number };

/**
 * A0 eines Prüffalls: 'alt' wie bis E1 (`ableiten` mit frisch gewählten Ringen, ohne glatte Haut) oder 'editor' (E2): gebaut
 * wie im Editor für ein neues Wesen — Startkugel, deren Ringe einfrieren, umgeformt zum Prüfkörper (Florians Ablauf), glatte
 * Haut und „Umrisse berühren“ mittel (`editorPlan`), genauer Bau mit Zurückschreiben der Stationen (`editorBauen`); A0 ist die
 * Ableitung des Körpers ohne Pinsel-Deltas (`stand.abl`). `plan` ergänzt den Bauplan (z. B. Querschnitt aus der Hülle).
 */
export type A0Art = { art: 'alt' } | { art: 'editor'; plan?: Partial<Bauplan> };
const koerperMerk = new Map<string, KoerperStand>();

/** Mittlere Kantenlänge eines Käfigs (Median). */
function kantenMedian(k: Verfeinert['kaefig']): number {
  const kanten: number[] = [];
  for (let e = 0; e < k.nE; e++) {
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    kanten.push(Math.hypot(k.xyz[3 * a]! - k.xyz[3 * b]!, k.xyz[3 * a + 1]! - k.xyz[3 * b + 1]!, k.xyz[3 * a + 2]! - k.xyz[3 * b + 2]!));
  }
  kanten.sort((a, b) => a - b);
  return kanten[Math.floor(kanten.length / 2)]!;
}

/**
 * Körperstand je Körperart und Feldstufe (gemerkt; die Fälle teilen ihn, keiner verändert ihn): A0, feines Netz (Stufe 3 von
 * A0), Feldkäfig (K1 oder K2) und seine Unterteilung bis zum feinen Netz (gleiche Nummern).
 */
function koerperStand(art: KoerperArt, stufe: 1 | 2 = 1, a0: A0Art = { art: 'alt' }): KoerperStand {
  const schluessel = `${art}/${stufe}/${JSON.stringify(a0)}`;
  const alt = koerperMerk.get(schluessel);
  if (alt) return alt;
  let dok: Dokument = koerperDokument(art, zufall(1));
  let abl: Ableitung;
  if (a0.art === 'editor') {
    const bau = editorBauen(imAblauf(dok, 'roehre', 'kugel'), { ...editorPlan('roehre'), ...(a0.plan ?? {}) });
    dok = bau.dok;
    abl = bau.stand.abl;
  } else abl = ableiten(dok, { stufen: 3 });
  const netz = feinNetz(abl.fein, feinesNetz(abl).flaechen);
  const v1 = verfeinern1(abl.kaefig);
  const v = stufe === 2 ? verfeinern1(v1.kaefig) : v1;
  const u = unterteilung(v.kaefig, 3 - stufe);
  const fein = anwenden3(u.grenze, v.kaefig.xyz);
  const ff = alleFlaechen(u.stufen[u.stufen.length - 1]!.kaefig);
  const stand = { dok, abl, netz, v, fein, ff, h1: kantenMedian(v1.kaefig), hFeld: kantenMedian(v.kaefig) };
  koerperMerk.set(schluessel, stand);
  return stand;
}

/**
 * Aufbau der Schritte A1–A7 wie am 16.10. (Feld auf K1, Schlitz auf dem Kantenpfad, A0 wie bis E1) — für die Prüfungen des
 * Schleifengitters, bitgleich. Ohne Angabe baut `einsatzFall` den Standard des Kernrings (Plan 21.10.): Feld auf K2, Schlitz
 * genau auf der Linie, A0 wie im Editor (E2).
 */
export const FALL_ALT = { stufe: 1, schnitt: 'pfad' } as const;

/**
 * Einen Fall bis zur Karte bauen; null, wenn die Reihe für diese Lage keine Linie zieht; `fehler` bei einem Bruch.
 * `verlaengerung`: Das Feld misst den Abstand zur Linie samt ihrer Verlängerung über den Mundwinkel hinaus (auf der Haut, in
 * Feldradien), damit hinter dem Mundwinkel so viel Haut im Feld liegt wie über und unter der Lippe. `schnitt`: Schlitz auf dem
 * Kantenpfad (wie A1) oder genau auf der Linie (Pfadpunkte auf die Linie gerückt, E1). `feld`: begradigt (A3) oder kompakt
 * (Band um die Linie, nur Kneifpunkte geschlossen, E1). `kappe`: begradigt nur bis `kappe` Radien (0 = ganz; Standard auf K2
 * 1,5 — das Band um die Linie bleibt erhalten, die Lippenauflösung m folgt seiner Länge). `a0`: A0 wie bis E1 oder wie im
 * Editor (Standard auf K2 seit E2).
 */
export function einsatzFall(art: KoerperArt, anfang: Anfang, form: Form, opt: { verlaengerung?: number; stufe?: 1 | 2; schnitt?: 'pfad' | 'linie'; feld?: 'begradigt' | 'kompakt'; kappe?: number; a0?: A0Art } = {}): EinsatzFall | { name: string; fehler: string } | null {
  const name = `${art}/${anfang}/${form}`;
  const stufe = opt.stufe ?? 2;
  const { dok, abl, netz, v, fein, ff, h1, hFeld } = koerperStand(art, stufe, opt.a0 ?? (stufe === 2 ? { art: 'editor' } : { art: 'alt' }));
  const vorlage = GRUNDKOERPER.includes(art) ? null : vorlageVon(art as 'rex' | 'langhals' | 'robbe');
  const roh = maulLinien(dok, art, maulBezug(art, dok, vorlage), hautAusNetz(abl), anfang, form, 'kurz', 'gleich', zufall(3));
  if ('fehler' in roh) return null;
  // Linie auf die Haut legen wie im Editor nach Teil H (Seitenlage bleibt, Tiefe von der Haut); die Reihe holt die Tiefe nur
  // grob aus dem feinen Netz (Linien bis 13 px neben der Haut)
  const l = { ...roh, oben: linieAufHaut(abl, roh.oben) };
  const auf = linieAufNetz(netz, l.oben);
  const d = flaechenAbstand(fein, ff, v.kaefig.nF, opt.verlaengerung ? [...auf.lagen, ...verlaengern(netz, auf.lagen, opt.verlaengerung * 3 * h1)] : auf.lagen);
  const kappe = opt.kappe ?? (stufe === 2 && opt.feld !== 'kompakt' ? 1.5 : 0);
  const feld = feldMitGerademRand(v.kaefig, d, 3 * h1, hFeld, kappe ? Infinity : stufe === 2 ? 2 * M_MAX : M_MAX, { kompakt: opt.feld === 'kompakt', ...(kappe ? { kappe } : {}) });
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
  const netzS = (opt.schnitt ?? 'linie') === 'linie' ? schnittAufLinie(netz, pfad, auf.lagen).netz : netz;
  const schnitt = aufschneiden(netzS, dreiecke, pfad);
  const karte = karteBauen({ dreiecke: schnitt.dreiecke, punkte: netzS.punkte, nPunkte: netzS.punkte.length / 3, doppel: schnitt.doppel, pfad });
  let ziel: V3[] | null = null;
  const lippenZiel = () => (ziel ??= abtasten3(l.oben, 64) as V3[]);
  return { name, dok, abl, netz: netzS, maulLinie: l.oben, linie: auf.lagen, lippenZiel, hautAbstand, v, stufe, feinFlaechen: ff, feinK1: Float64Array.from(fein), h1: hFeld, feld, feldDreiecke: dreiecke, pfad, schnitt, karte };
}

/**
 * Ablauf des Kernrings an einem Fall (Plan 21.10.): Topologie (Stufe des Felds aus dem Fall, Standard des Kernrings je Stufe),
 * Lippe (A6, Ende „Falte“), Haut lösen (A7) auf der Grenzfläche von Stufe 3 von A0, Maße eine Stufe feiner.
 */
export function einsatzAblauf(f: EinsatzFall, opt: EinsatzOptionen = {}, loesen: LoesenOptionen = {}): { t: EinsatzTopologie; lippe: ReturnType<typeof lippeAnpassen>; g: GeloesterEinsatz; ms: EinsatzMasse } {
  const linie = f.lippenZiel();
  const t = einsatzTopologie(f.v.kaefig, f.feld, f.karte, f.netz, f.schnitt.doppel, { linie, gitter: 'kernring', stufe: f.stufe, feldDreiecke: f.feldDreiecke, ...opt });
  const lippe = lippeAnpassen(linie, t.m, t.lippenAnteile, { ende: t.gitter === 'kernring' ? 'falte' : 'ecke', anfang: t.lippenAnfang });
  const g = einsatzLoesen(t, f.v.kaefig, a0Netz(f.v.kaefig, 3 - f.stufe), lippe.punkte, loesen);
  const ms = einsatzMessen(g, t, f.v.kaefig, f.feld, lippe.punkte);
  return { t, lippe, g, ms };
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
