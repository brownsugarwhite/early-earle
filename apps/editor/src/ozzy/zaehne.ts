// Ozzy, die Zähne (Plan „Maul, Zähne, Zunge“, Etappe 5, erste Scheibe, 20.11.2026).
// Florian (Konzept 4.6): Zähne sprießen aus dem Zahnfleisch, gleichmäßig verteilt, spiegelgleich, vorn größer, unten ein Zahn
// weniger als oben; jeder hängt starr an seinem Kiefer; innen wird ein Zahn nie länger als der Spalt zwischen den Kiefern.
//
// Die Zähne sind Werte am Maul (`werk.MaulZaehne`: je Reihe Anzahl, Größe, Neigung, Verlauf, Reichweite, Sitz, Vorlage), keine
// Punkte der Form. Wo jeder Zahn sitzt, wird aus der Tasche gelesen:
//   - Eine Reihe läuft auf der Höhenlinie „Abstand von der Lippe = Sitz“ ihrer Wand (Gaumen oder Boden), von der Spitze nach
//     hinten; gerechnet wird die Hälfte z ≥ 0, die andere ist ihr Spiegelbild.
//   - Ein Zahn hängt an zwei Orten dieser Linie (je ein Dreieck des Rechennetzes mit Gewichten) und einem Anteil dazwischen: So geht
//     er mit der Haut mit, auch wenn die Knochen die Anzeige drehen, ohne dass etwas nachgeführt wird.
//   - Sein Rahmen: x längs des Zahnfleischs, y aus der Wand ins Maul (die Normale der Haut), z zur Lippe.
// Die Zahnformen sind die der Studie (`maulstudie/zahn.ts`). Gezeigt werden die Zähne als ein Netz neben der Haut (`zaehneNetz`).
//
// Zweite Scheibe (die Linse): `zaehnePaar` stellt beide Reihen zusammen (dieselbe Teilung, unten ein Zahn weniger),
// `sitzGrenzen` sagt, zwischen welchen Werten der Sitz etwas ändert, `formNetzGemischt` ist eine Vorlage auf dem Weg zur nächsten.
//
// Dritte Scheibe (einzelne Zähne): Eine Reihe kann für einzelne Zähne eigene Werte tragen (`ZahnReihe.eigen`: gerückt, eigene
// Vorlage, eigene Größe, gezogen). `zahnPlaetze` liest sie mit; `zahnRahmen` gibt Ort und Richtungen eines Zahns an der gezeigten
// Haut (zum Rücken im Bild), `eigenSetzen` schreibt eigene Werte, `partner` nennt das Spiegelbild.
//
// Vierte Scheibe (Zähne außen): Ein Sitz unter null steht vor der Lippe. Der Zahn hängt dann weiter an der Wand seines Kiefers
// (an der Linie dicht hinter der Lippe), sein Fuß ist aber längs der Wand über die Lippe hinaus versetzt (`ZahnPlatz.vor`): Er
// steht außen neben der Lippe, zeigt wie alle zum anderen Kiefer und behält seine Länge, auch wenn das Maul zu ist
// (`ZahnPlatz.aussen`, `zaehneNetz`).
// Ohne DOM.
import type { MaulZaehne, ZahnEigen, ZahnReihe } from '../form/werk';
import { ZAHN_FORMEN, type ZahnForm, mischen, zahnNetz } from '../maulstudie/zahn';
import type { HautNetz } from '../anfang/haut';
import { type MaulTasche, hoehenlinie, taschenFeld, zahnfleischBreit } from './farbe/maulEbene';
import type { Karte, Ort } from './farbe/ort';

/**
 * Beide Reihen zusammen stellen: oben `anzahl` Zähne, unten einer weniger, und die untere Reihe reicht um so viel weniger weit
 * nach hinten, dass beide dieselbe Teilung haben (unten `bis` = oben `bis` · (anzahl − 1) / anzahl: ein halber Zahn je Seite).
 * Dann hat eine Reihe einen Zahn an der Spitze und die andere dort eine Lücke: Die unteren Zähne stehen in den Lücken der oberen.
 * Alle übrigen Werte jeder Reihe bleiben. Das gilt nur, solange beide Reihen so zusammen gestellt werden.
 */
export function zaehnePaar(z: MaulZaehne, anzahl: number): MaulZaehne {
  const n = Math.max(1, Math.round(anzahl));
  return { ...z, oben: mitAnzahl(z.oben, n), unten: { ...mitAnzahl(z.unten, n - 1), bis: (z.oben.bis * (n - 1)) / n } };
}
/** eine Reihe mit anderer Anzahl: Was einzelne Zähne eigen hatten, fällt (ihre Nummern meinen dann andere Zähne) */
export function mitAnzahl(r: ZahnReihe, anzahl: number): ZahnReihe {
  const n = Math.max(0, Math.round(anzahl));
  if (n === r.anzahl) return r;
  const { eigen: _weg, ...rest } = r;
  void _weg;
  return { ...rest, anzahl: n };
}
/** das Spiegelbild des Zahns i einer Reihe (der Zahn an der Spitze einer ungeraden Reihe ist sein eigenes) */
export const partner = (r: ZahnReihe, i: number): number => r.anzahl - 1 - i;
/**
 * Eigene Werte für einzelne Zähne einer Reihe setzen (`f` bekommt, was der Zahn bisher eigen hat, und gibt, was er haben soll;
 * leer: nichts Eigenes mehr). Die Reihe und ihr `eigen` sind danach neue Objekte.
 */
export function eigenSetzen(r: ZahnReihe, zaehne: readonly number[], f: (e: ZahnEigen) => ZahnEigen): ZahnReihe {
  const eigen: Record<number, ZahnEigen> = { ...r.eigen };
  for (const i of new Set(zaehne)) {
    if (!(i >= 0 && i < r.anzahl)) continue;
    const e = f({ ...eigen[i] });
    if (Object.keys(e).length) eigen[i] = e;
    else delete eigen[i];
  }
  const { eigen: _alt, ...rest } = r;
  void _alt;
  return Object.keys(eigen).length ? { ...rest, eigen } : rest;
}

const REIHE_ANFANG: ZahnReihe = { anzahl: 12, groesse: 0.92, neigung: 0.12, verlauf: 0.45, bis: 0.86, sitz: 0.5, form: 0 };
/** die Zähne, mit denen ein Maul beginnt: oben zwölf, unten elf (in den Lücken der oberen: `zaehnePaar`), Vorlage „Tropfen“ */
export const ZAEHNE_ANFANG: MaulZaehne = zaehnePaar({ oben: REIHE_ANFANG, unten: REIHE_ANFANG }, 12);

/**
 * Der Sitz (Abstand von der Lippe in Breiten des Zahnfleischs): Die Linie in der Wand, an der ein Zahn hängt, liegt mindestens
 * `SITZ_MIN` hinter der Lippe und höchstens bei diesem Anteil der Tiefe der Tasche. Ein kleinerer Sitz versetzt den Fuß von dort
 * längs der Wand zur Lippe hin und über sie hinaus: unter null steht der Zahn außen, höchstens `SITZ_AUSSEN` weit („höchstens ein
 * Stück vor der Lippe“).
 */
const SITZ_MIN = 0.15;
const SITZ_TIEF = 0.66;
export const SITZ_AUSSEN = -1.2;
/** zwischen diesen Werten liegt der eigene Faktor der Größe eines Zahns */
export const FAKTOR_MIN = 0.3;
export const FAKTOR_MAX = 3.2;
type TaschenFeld = NonNullable<ReturnType<typeof taschenFeld>>;
/** zwischen welchen Werten der Sitz einer Reihe in dieser Tasche etwas ändert (außerhalb hält `zahnPlaetze` ihn fest); `feld`: schon gerechnet */
export function sitzGrenzen(k: Karte, tasche: MaulTasche, feld: TaschenFeld | null = taschenFeld(k, tasche)): { min: number; max: number } | null {
  if (!feld) return null;
  const breit = zahnfleischBreit(tasche, feld.dMax);
  return breit > 1e-9 ? { min: SITZ_AUSSEN, max: Math.max(SITZ_MIN, (SITZ_TIEF * feld.dMax) / breit) } : null;
}

/** der Platz eines Zahns: an zwei Orten der Wand (Hälfte z ≥ 0) und dem Anteil dazwischen */
export type ZahnPlatz = {
  a: Ort;
  b: Ort;
  u: number;
  /** am Unterkiefer (sonst am Oberkiefer) */
  unten: boolean;
  /** das Spiegelbild dieses Platzes (bei z ≤ 0) */
  gespiegelt: boolean;
  /** Maß des Zahns (Breite eines Platzes mal Größe und Verlauf), Einheiten des Werks */
  mass: number;
  /** Abstand vom Scharnier in der Seite (für den Platz zwischen den Kiefern) */
  r: number;
  /** zur Lippe hin liegt die Richtung n × x (+1) oder ihr Gegenteil (−1) */
  lippe: 1 | -1;
  /** seine Reihe */
  reihe: ZahnReihe;
  /** wie weit vorn er steht (1 an der Spitze, 0 am hinteren Ende der Reihe): danach sprießt er */
  vorn: number;
  /** seine Nummer in der Reihe (0 … anzahl − 1, von einem hinteren Ende um die Spitze zum anderen) */
  i: number;
  /** seine Vorlage: die eigene oder die der Reihe */
  form: number;
  /** wie weit er gegen seinen Platz in der Reihe gerückt steht (im Maul festgehalten): längs nach hinten (Anteil der Reichweite) und zur Tiefe (Breiten des Zahnfleischs) */
  ds: number;
  dz: number;
  /** die Maße dazu: Reichweite seiner Reihe und Breite des Zahnfleischs (Einheiten des Werks) */
  lang: number;
  breit: number;
  /** so weit ist sein Fuß von seinen zwei Orten aus längs der Wand zur Lippe hin versetzt (Einheiten des Werks; 0: Er steht auf seiner Linie) */
  vor: number;
  /** so weit steht er vor der Lippe (Einheiten des Werks; 0: im Maul) */
  aussen: number;
};

const lage = (P: ArrayLike<number>, o: Ort): [number, number, number] => [
  o.w[0] * P[3 * o.e[0]]! + o.w[1] * P[3 * o.e[1]]! + o.w[2] * P[3 * o.e[2]]!,
  o.w[0] * P[3 * o.e[0] + 1]! + o.w[1] * P[3 * o.e[1] + 1]! + o.w[2] * P[3 * o.e[2] + 1]!,
  o.w[0] * P[3 * o.e[0] + 2]! + o.w[1] * P[3 * o.e[1] + 2]! + o.w[2] * P[3 * o.e[2] + 2]!,
];

/**
 * Die Plätze aller Zähne, aus der Tasche gelesen (in der Ruhe der Form). `C`: das Scharnier in der Seite. Leer, wenn sich die
 * Reihen in der Tasche nicht ziehen lassen. `feld`: das Feld der Tasche, wenn es schon gerechnet ist (es hängt nur an Netz und
 * Tasche, nicht an den Werten der Zähne).
 */
export function zahnPlaetze(
  k: Karte,
  tasche: MaulTasche & { kiefer: ArrayLike<number> },
  C: { x: number; y: number },
  zaehne: MaulZaehne,
  feld: TaschenFeld | null = taschenFeld(k, tasche),
): ZahnPlatz[] {
  if (!feld) return [];
  const P = k.netz.pos;
  const breit = zahnfleischBreit(tasche, feld.dMax);
  const aus: ZahnPlatz[] = [];
  /** auf welcher Wand ein Ort liegt: der Kiefer seiner Ecke mit dem größten Gewicht, die einem Kiefer gehört (0: keiner) */
  const wandVon = (o: Ort): number => {
    let best = 0;
    let gewicht = -1;
    for (let i = 0; i < 3; i++) {
      const kf = tasche.kiefer[o.e[i]!]!;
      if (kf !== 0 && o.w[i]! > gewicht) {
        gewicht = o.w[i]!;
        best = kf;
      }
    }
    return best;
  };
  for (const unten of [false, true]) {
    const reihe = unten ? zaehne.unten : zaehne.oben;
    if (!(reihe.anzahl >= 1)) continue;
    const wand = unten ? 1 : -1;
    /**
     * Die Linie eines Sitzes auf dieser Wand, von der Spitze (in der Mittelebene) nach hinten: die Höhenlinie des Abstands von der
     * Lippe (mindestens ein Stück hinter der Lippe, höchstens zwei Drittel der Tiefe der Tasche). Je Höhe einmal gerechnet.
     */
    type Linie = { teil: Ort[]; orte: [number, number, number][]; L: number[]; ganz: number; sitz: number };
    const linien = new Map<number, Linie | null>();
    const linieBei = (sitz: number): Linie | null => {
      const hoehe = Math.max(SITZ_MIN * breit, Math.min(sitz * breit, SITZ_TIEF * feld.dMax));
      const schl = Math.round(hoehe * 1e4);
      const da = linien.get(schl);
      if (da !== undefined) return da;
      let fertig: Linie | null = null;
      const linie = hoehenlinie(k, feld.d, feld.wand, hoehe);
      let teil = linie && linie.length >= 4 ? linie.filter((o) => wandVon(o) === wand) : [];
      if (teil.length >= 3) {
        const z = (o: Ort): number => Math.abs(lage(P, o)[2]);
        if (z(teil[0]!) > z(teil[teil.length - 1]!)) teil = [...teil].reverse();
        const orte = teil.map((o) => lage(P, o));
        const L = [0];
        for (let i = 1; i < orte.length; i++) L.push(L[i - 1]! + Math.hypot(orte[i]![0] - orte[i - 1]![0], orte[i]![1] - orte[i - 1]![1], orte[i]![2] - orte[i - 1]![2]));
        fertig = { teil, orte, L, ganz: L[L.length - 1]!, sitz: breit > 1e-9 ? hoehe / breit : sitz };
      }
      linien.set(schl, fertig);
      return fertig;
    };
    /** der Sitz, wie er gilt: nicht tiefer als die Tasche es zulässt, nicht weiter vor der Lippe als `SITZ_AUSSEN` */
    const sitzTief = breit > 1e-9 ? Math.max(SITZ_MIN, (SITZ_TIEF * feld.dMax) / breit) : SITZ_MIN;
    const sitzGilt = (sitz: number): number => Math.max(SITZ_AUSSEN, Math.min(sitzTief, sitz));
    const basis = linieBei(reihe.sitz);
    if (!basis) continue;
    const sitzReihe = sitzGilt(reihe.sitz);
    const lang = basis.ganz * Math.max(0.1, Math.min(1, reihe.bis));
    if (!(lang > 1e-6)) continue;
    const platz = Math.min((2 * lang) / reihe.anzahl, 0.34 * tasche.lang);
    for (let i = 0; i < reihe.anzahl; i++) {
      const eigen = reihe.eigen?.[i];
      // (ein gezogener Zahn: Dort ist eine Lücke)
      if (eigen?.weg) continue;
      // längs der ganzen Reihe (vom einen hinteren Ende um die Spitze zum anderen): l; bei l = lang steht die Spitze
      const l = (2 * lang * (i + 0.5)) / reihe.anzahl;
      const gespiegelt = l > lang + 1e-9;
      const regel = Math.abs(lang - l);
      // ein gerückter Zahn: auf der Linie seines eigenen Sitzes, so weit von der Spitze wie sein Platz plus sein Versatz; er bleibt
      // auf seiner Wand (zwischen Spitze und hinterem Ende). Ein Sitz vor der Linie dicht an der Lippe versetzt nur den Fuß.
      const sitz = sitzGilt(reihe.sitz + (eigen?.dz ?? 0));
      const linie = (eigen?.dz ? linieBei(sitz) : null) ?? basis;
      const vonSpitze = Math.max(0, Math.min(linie.ganz, regel + (eigen?.ds ?? 0) * lang));
      const { teil, orte, L } = linie;
      let j = 1;
      while (j < L.length - 1 && L[j]! < vonSpitze) j++;
      const u = Math.max(0, Math.min(1, (vonSpitze - L[j - 1]!) / (L[j]! - L[j - 1]! || 1)));
      const a = teil[j - 1]!;
      const b = teil[j]!;
      const pa = orte[j - 1]!;
      const pb = orte[j]!;
      const ort: [number, number, number] = [pa[0] + u * (pb[0] - pa[0]), pa[1] + u * (pb[1] - pa[1]), pa[2] + u * (pb[2] - pa[2])];
      // zur Lippe: gegen das Gefälle des Abstands im Dreieck von a
      const n = normale(P, a);
      const x = richtung(pa, pb);
      const quer = kreuz(n, x);
      const e0: [number, number, number] = [P[3 * a.e[0]]!, P[3 * a.e[0] + 1]!, P[3 * a.e[0] + 2]!];
      let steig = 0;
      for (let q = 1; q < 3; q++) {
        const v = a.e[q]!;
        steig += (feld.d[v]! - feld.d[a.e[0]]!) * ((P[3 * v]! - e0[0]) * quer[0] + (P[3 * v + 1]! - e0[1]) * quer[1] + (P[3 * v + 2]! - e0[2]) * quer[2]);
      }
      // (Größe und Sprießen richten sich nach seinem Platz in der Reihe, nicht danach, wohin er gerückt ist)
      const vorn = 1 - regel / lang;
      aus.push({
        a,
        b,
        u,
        unten,
        gespiegelt,
        mass: platz * reihe.groesse * (1 - Math.max(0, Math.min(0.9, reihe.verlauf)) * (1 - vorn)) * Math.max(FAKTOR_MIN, Math.min(FAKTOR_MAX, eigen?.faktor ?? 1)),
        r: Math.hypot(ort[0] - C.x, ort[1] - C.y),
        lippe: steig <= 0 ? 1 : -1,
        reihe,
        vorn,
        i,
        form: vorlageNr(eigen?.form ?? reihe.form),
        ds: (vonSpitze - regel) / lang,
        dz: sitz - sitzReihe,
        lang,
        breit,
        vor: Math.max(0, linie.sitz - sitz) * breit,
        aussen: Math.max(0, -sitz) * breit,
      });
    }
  }
  return aus;
}

const richtung = (a: readonly number[], b: readonly number[]): [number, number, number] => {
  const d: [number, number, number] = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  return [d[0] / l, d[1] / l, d[2] / l];
};
const kreuz = (a: readonly number[], b: readonly number[]): [number, number, number] => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
/** die Normale des Dreiecks eines Orts (aus der Form heraus: in der Tasche also ins Maul) */
function normale(P: ArrayLike<number>, o: Ort): [number, number, number] {
  const [a, b, c] = [3 * o.e[0], 3 * o.e[1], 3 * o.e[2]];
  const n = kreuz([P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!], [P[c]! - P[a]!, P[c + 1]! - P[a + 1]!, P[c + 2]! - P[a + 2]!]);
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Ort und Richtungen eines Platzes an der Haut mit den Lagen `P`, auf der Hälfte z ≥ 0: x längs des Zahnfleischs nach hinten, n aus der Wand ins Maul, zl in der Wand zur Lippe */
function rahmenRoh(q: ZahnPlatz, P: ArrayLike<number>): { ort: [number, number, number]; x: [number, number, number]; n: [number, number, number]; zl: [number, number, number] } {
  const pa = lage(P, q.a);
  const pb = lage(P, q.b);
  const ort: [number, number, number] = [pa[0] + q.u * (pb[0] - pa[0]), pa[1] + q.u * (pb[1] - pa[1]), pa[2] + q.u * (pb[2] - pa[2])];
  const n = normale(P, q.a);
  let x = richtung(pa, pb);
  const xn = x[0] * n[0] + x[1] * n[1] + x[2] * n[2];
  x = richtung([0, 0, 0], [x[0] - xn * n[0], x[1] - xn * n[1], x[2] - xn * n[2]]);
  const zl0 = kreuz(n, x);
  const zl: [number, number, number] = [q.lippe * zl0[0], q.lippe * zl0[1], q.lippe * zl0[2]];
  // (ein Sitz dicht an oder vor der Lippe: Der Fuß steht von seiner Linie aus längs der Wand zur Lippe hin versetzt)
  if (q.vor > 0) {
    ort[0] += q.vor * zl[0];
    ort[1] += q.vor * zl[1];
    ort[2] += q.vor * zl[2];
  }
  return { ort, x, n, zl };
}
/**
 * Ort und Richtungen eines Zahns, wie er steht (ein Spiegelbild bei z ≤ 0), an der Haut mit den Lagen `P` (in Einheiten des
 * Werks): sein Fuß, die Richtung längs des Zahnfleischs nach hinten, die aus der Wand ins Maul und die in der Wand zur Lippe.
 */
export function zahnRahmen(q: ZahnPlatz, P: ArrayLike<number>): { ort: [number, number, number]; x: [number, number, number]; n: [number, number, number]; zl: [number, number, number] } {
  const r = rahmenRoh(q, P);
  if (!q.gespiegelt) return r;
  const m = (v: [number, number, number]): [number, number, number] => [v[0], v[1], -v[2]];
  return { ort: m(r.ort), x: m(r.x), n: m(r.n), zl: m(r.zl) };
}

/** das Netz eines Zahns (ohne Wurzel): Lagen, Normalen, Dreiecke und die Länge seiner Krone. Jede Form hat gleich viele Punkte und Dreiecke */
export type FormNetz = { pos: Float32Array; nor: Float32Array; idx: Uint32Array; laenge: number; tiefe: number };
function netzAus(f: ZahnForm): FormNetz {
  const geo = zahnNetz(f, false);
  geo.computeVertexNormals();
  const index = geo.getIndex();
  const g = {
    pos: Float32Array.from(geo.getAttribute('position').array),
    nor: Float32Array.from(geo.getAttribute('normal').array),
    idx: index ? Uint32Array.from(index.array) : Uint32Array.from({ length: geo.getAttribute('position').count }, (_, q) => q),
    laenge: f.laenge,
    tiefe: f.tiefe,
  };
  geo.dispose();
  return g;
}
/** die Vorlage mit dieser Nummer (festgehalten im Bereich der Vorlagen) */
export const vorlageNr = (nr: number): number => Math.max(0, Math.min(ZAHN_FORMEN.length - 1, Math.round(nr)));
/** das Netz einer Vorlage, einmal gebaut */
const formNetze = new Map<number, FormNetz>();
function formNetz(nr: number): FormNetz {
  const i = vorlageNr(nr);
  let g = formNetze.get(i);
  if (!g) {
    g = netzAus(ZAHN_FORMEN[i]!.form);
    formNetze.set(i, g);
  }
  return g;
}
/** die Form zwischen zwei Vorlagen (t von 0 bis 1): für den weichen Wechsel am Formenring */
export const formGemischt = (von: number, nach: number, t: number): ZahnForm => mischen(ZAHN_FORMEN[vorlageNr(von)]!.form, ZAHN_FORMEN[vorlageNr(nach)]!.form, Math.max(0, Math.min(1, t)));
/** ihr Netz (nicht gemerkt: je Bild des Wechsels einmal gebaut) */
export const formNetzGemischt = (von: number, nach: number, t: number): FormNetz => netzAus(formGemischt(von, nach, t));

/** ein Zahn als Körper, an dem etwas anstößt (die Zunge): ein Stück mit runden Enden vom Fuß bis kurz unter die Spitze */
export type ZahnKapsel = { a: [number, number, number]; b: [number, number, number]; r: number; unten: boolean; i: number; gespiegelt: boolean };
/**
 * Die Zähne als Körper, so lang und so dick, wie `zaehneNetz` sie mit denselben Angaben zeigt (in Einheiten des Werks). Ein Zahn,
 * der gerade keine Länge hat (das Maul ist zu), hat Radius null: Er steht dann nur für seinen Fuß.
 */
export function zahnKapseln(plaetze: readonly ZahnPlatz[], P: ArrayLike<number>, spalt: (r: number) => number, wuchs: (vorn: number) => number, formVon?: (q: ZahnPlatz) => FormNetz | null): ZahnKapsel[] {
  return plaetze.map((q) => {
    const g = formVon?.(q) ?? formNetz(q.form);
    const { ort, n, zl } = rahmenRoh(q, P);
    const c = Math.cos(q.reihe.neigung);
    const s = Math.sin(q.reihe.neigung);
    const Y: [number, number, number] = [n[0] * c + zl[0] * s, n[1] * c + zl[1] * s, n[2] * c + zl[2] * s];
    const { lam, dick } = zahnLaenge(q, g, spalt, wuchs);
    const lang = g.laenge * q.mass * lam;
    const r = 0.42 * g.tiefe * dick;
    // (die Achse reicht bis einen Radius unter die Spitze: Die Kappe endet dort, wo der Zahn endet)
    const achse = Math.max(lang - r, 1e-6 * (1 + q.mass));
    const sz = q.gespiegelt ? -1 : 1;
    return { a: [ort[0], ort[1], ort[2] * sz], b: [ort[0] + Y[0] * achse, ort[1] + Y[1] * achse, (ort[2] + Y[2] * achse) * sz], r, unten: q.unten, i: q.i, gespiegelt: q.gespiegelt };
  });
}
/** wie lang (Anteil seiner ganzen Länge) und wie dick (Maß quer) ein Zahn gerade gezeigt wird */
function zahnLaenge(q: ZahnPlatz, g: FormNetz, spalt: (r: number) => number, wuchs: (vorn: number) => number): { lam: number; dick: number } {
  // die Länge: im Maul nie länger als der Spalt der Kiefer dort (zu: null); vor der Lippe behält der Zahn seine Länge (ganz,
  // sobald er um seine halbe Tiefe draußen steht); und so weit, wie er schon gesprossen ist
  const w = Math.max(0, Math.min(1, wuchs(q.vorn)));
  const voll = g.laenge * q.mass;
  const imMaul = voll > 1e-9 ? Math.max(0, Math.min(1, (0.92 * spalt(q.r)) / voll)) : 0;
  const frei = q.aussen > 0 ? Math.min(1, q.aussen / Math.max(1e-9, 0.5 * g.tiefe * q.mass)) : 0;
  const lam = w * (imMaul + (1 - imMaul) * frei);
  return { lam, dick: q.mass * (0.35 + 0.65 * w) * (lam > 0 ? 1 : 0) };
}

/**
 * Die Zähne als Netz für die Anzeige, an der gezeigten Haut. `P`: die Lagen des Rechennetzes, wie sie gezeigt werden (mit den
 * Knochen gedreht), in Einheiten des Werks; Welt = Werk / `f` + `mitte`. `spalt(r)`: so weit stehen die Kiefer im Abstand r vom
 * Scharnier auseinander (ein Zahn innen wird nie länger; zu steckt er im Maul). `wuchs(vorn)`: Anteil, zu dem ein Zahn schon
 * gesprossen ist (0 … 1). Das Netz hat immer dieselben Punkte und Dreiecke, solange sich die Plätze nicht ändern. `formVon`:
 * das Netz eines Zahns, wenn es nicht das seiner Vorlage ist (während die Vorlage wechselt; null: das der Vorlage).
 */
export function zaehneNetz(
  plaetze: readonly ZahnPlatz[],
  P: ArrayLike<number>,
  f: number,
  mitte: { x: number; y: number },
  spalt: (r: number) => number,
  wuchs: (vorn: number) => number,
  ziel?: HautNetz | null,
  formVon?: (q: ZahnPlatz) => FormNetz | null,
): HautNetz | null {
  if (!plaetze.length) return null;
  const netze = plaetze.map((q) => formVon?.(q) ?? formNetz(q.form));
  let N = 0;
  let I = 0;
  for (const g of netze) {
    N += g.pos.length / 3;
    I += g.idx.length;
  }
  const netz: HautNetz =
    ziel && ziel.pos.length === 3 * N && ziel.index.length === I
      ? ziel
      : { pos: new Float32Array(3 * N), normal: new Float32Array(3 * N), index: new Uint32Array(I), hoehe: new Float32Array(N), seite: new Float32Array(N), blatt: new Float32Array(2 * N), sicht: new Float32Array(N).fill(1), dehnung: new Float32Array(N).fill(1) };
  let v0 = 0;
  let i0 = 0;
  for (let nr = 0; nr < plaetze.length; nr++) {
    const q = plaetze[nr]!;
    const g = netze[nr]!;
    // x längs des Zahnfleischs (in der Wand), z zur Lippe, y ins Maul; um `neigung` nach außen geneigt
    const { ort, x, n, zl } = rahmenRoh(q, P);
    const c = Math.cos(q.reihe.neigung);
    const s = Math.sin(q.reihe.neigung);
    const Y: [number, number, number] = [n[0] * c + zl[0] * s, n[1] * c + zl[1] * s, n[2] * c + zl[2] * s];
    const Z: [number, number, number] = [zl[0] * c - n[0] * s, zl[1] * c - n[1] * s, zl[2] * c - n[2] * s];
    const { lam, dick } = zahnLaenge(q, g, spalt, wuchs);
    const sz = q.gespiegelt ? -1 : 1;
    const k = g.pos.length / 3;
    for (let i = 0; i < k; i++) {
      const lx = g.pos[3 * i]! * dick;
      const ly = g.pos[3 * i + 1]! * q.mass * lam;
      const lz = g.pos[3 * i + 2]! * dick;
      const wx = ort[0] + lx * x[0] + ly * Y[0] + lz * Z[0];
      const wy = ort[1] + lx * x[1] + ly * Y[1] + lz * Z[1];
      const wz = (ort[2] + lx * x[2] + ly * Y[2] + lz * Z[2]) * sz;
      const v = v0 + i;
      netz.pos[3 * v] = wx / f + mitte.x;
      netz.pos[3 * v + 1] = wy / f + mitte.y;
      netz.pos[3 * v + 2] = wz / f;
      // (die Normale: quer zur Länge gestaucht, wenn der Zahn kürzer steht)
      const nx = g.nor[3 * i]!;
      const ny = g.nor[3 * i + 1]! * (lam > 0.05 ? 1 / lam : 0);
      const nz = g.nor[3 * i + 2]!;
      let ax = nx * x[0] + ny * Y[0] + nz * Z[0];
      let ay = nx * x[1] + ny * Y[1] + nz * Z[1];
      let az = (nx * x[2] + ny * Y[2] + nz * Z[2]) * sz;
      const al = Math.hypot(ax, ay, az) || 1;
      ax /= al;
      ay /= al;
      az /= al;
      netz.normal[3 * v] = ax;
      netz.normal[3 * v + 1] = ay;
      netz.normal[3 * v + 2] = az;
      netz.hoehe[v] = 0.3;
      netz.blatt[2 * v] = netz.pos[3 * v]!;
      netz.blatt[2 * v + 1] = netz.pos[3 * v + 1]!;
    }
    // (am Spiegelbild läuft jedes Dreieck andersherum)
    for (let i = 0; i < g.idx.length; i += 3) {
      netz.index[i0 + i] = v0 + g.idx[i]!;
      netz.index[i0 + i + 1] = v0 + g.idx[i + (q.gespiegelt ? 2 : 1)]!;
      netz.index[i0 + i + 2] = v0 + g.idx[i + (q.gespiegelt ? 1 : 2)]!;
    }
    v0 += k;
    i0 += g.idx.length;
  }
  return netz;
}
