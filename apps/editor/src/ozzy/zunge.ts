// Ozzy, die Zunge (Plan „Maul, Zähne, Zunge“, Etappe 6, erste Scheibe, 20.11.2026).
// Florian (Konzept 4.8): Die Zunge liegt auf dem Unterkiefer, so breit, wie das Maul es zulässt, oben mit einer flachen Rille. Sie
// lebt: Bewegt sich der Kiefer, kommt sie mit Verzögerung nach und schwingt aus. Sie ist Gummi: Greifen und Ziehen dehnt sie,
// gedehnt wird sie dünner; losgelassen schnellt sie zurück. Die Wurzel bleibt am Kiefer.
//
// Die Zunge ist eine Kette von Knoten (wie in der Studie, `maulstudie/zunge.ts`). Neu ist, woran sie hängt:
//   - Im Maul als echter Form läuft in der Mittelebene eine Reihe von Punkten des Rechennetzes über den Boden (und eine über den
//     Gaumen): von der Rachenlinie zur Spitze der Lippe. Jeder Knoten der Zunge hat seinen Platz auf der Reihe des Bodens (zwei
//     Punkte des Netzes und der Anteil dazwischen) und geht so von selbst mit der Haut mit, auch wenn die Knochen die Anzeige
//     drehen. Derselbe Platz auf der Reihe des Gaumens sagt, wie viel Raum zwischen den Wänden ist.
//   - Jeder Knoten will an seinen Platz zurück (Feder: hinten straff, vorn lose), die Kette hält ihre Länge weich (Gummi), Boden
//     und Gaumen halten sie im Maul; vor der Lippe hat sie keinen Boden mehr und hängt.
// Die Zunge ist ein Wert am Maul (`werk.MaulZunge`); Platz, Kette und Netz sind abgeleitet. Ohne DOM, ohne three.
//
// Zweite Scheibe (die Linse der Zunge): Vorlagen sind Sätze ihrer Werte (`ZUNGEN_FORMEN`: rund, spitz, gespalten, lang). Dazu zwei
// Werte für ihre Form vorn: `spitz` (sie läuft spitz zu) und `gabel` (sie teilt sich in zwei Zinken: Die letzten Ringe des Netzes
// stehen dort nicht mehr eben, ihre Mitte bleibt zurück). Eine Länge über 1 reicht über die Lippe hinaus: Die Knoten davor
// hängen an der verlängerten Mittellinie des Bodens und haben dort keinen Boden. `zungeGerade` ist die Zunge gerade gelegt
// (für die Linse), `zungenUmriss` ihr Zeichen am Formenring.
//
// Dritte Scheibe (der Rest der Zunge): Sie stößt an, klebt und bleibt liegen.
// - **Anstoßen:** Was im Weg steht, sind Stücke mit runden Enden (`Hindernis`): jeder Zahn, wie er gezeigt wird, und die zwei
//   Lippen als Ketten solcher Stücke (`lippenHindernisse`). Im Maul gehören die Zähne zu Boden und Gaumen (`zaehneMessen`): Ein
//   unterer Zahn unter der Zunge hebt ihren Boden (sie legt sich über ihn), ein oberer über ihr senkt die Decke, ein Zahn neben ihr
//   macht sie schmaler. Ein Knoten, der einem Zahn nur seitlich auswiche, knäuelte die Kette (im Fenster gesehen). Vor der Lippe
//   weichen die Knoten Zähnen und Lippen als runden Körpern aus.
// - **Kleben (ablegen):** Ein Knoten sitzt fest an einem Zahn oder einer Lippe (`ZungenKleben`, ein Wert an der Zunge;
//   `klebenSuchen` findet das Stück unter dem Zeiger, `klebeOrt` den Ort dazu in jedem Bild). Der Rest der Kette hängt daran.
// - **Liegen bleiben:** In der Pose will jeder Knoten nicht an seinen Platz, sondern dorthin, wo er losgelassen wurde (`lage`:
//   längs, hoch, quer an seinem Platz auf dem Unterkiefer, dazu die Längen der Stücke; `ZungenKette.lageJetzt`). Die Lage geht
//   mit dem Unterkiefer mit.
import type { MaulZunge, ZungenKleben } from '../form/werk';
import type { HautNetz } from '../anfang/haut';
import type { MaulTasche } from './farbe/maulEbene';
import type { Karte } from './farbe/ort';

/** die Vorlagen der Zunge: Jede ist ein Satz ihrer Werte (der Formenring der Linse setzt ihn; danach stellt der Drehregler jeden Wert für sich) */
export const ZUNGEN_FORMEN: { name: string; werte: { laenge: number; breite: number; dicke: number; rille: number; spitz: number; gabel: number } }[] = [
  { name: 'Rund', werte: { laenge: 0.78, breite: 0.74, dicke: 0.075, rille: 0.3, spitz: 0, gabel: 0 } },
  { name: 'Spitz', werte: { laenge: 0.84, breite: 0.66, dicke: 0.07, rille: 0.22, spitz: 1, gabel: 0 } },
  // (kürzer als die runde: Die Zinken reichen über ihren letzten Knoten hinaus und sollen im Maul bleiben)
  { name: 'Gespalten', werte: { laenge: 0.74, breite: 0.5, dicke: 0.055, rille: 0.12, spitz: 0.35, gabel: 1 } },
  { name: 'Lang', werte: { laenge: 1.22, breite: 0.68, dicke: 0.07, rille: 0.3, spitz: 0.15, gabel: 0 } },
];
/** die Zunge, mit der ein Maul beginnt (die Vorlage „Rund“): bis kurz hinter die unteren Zähne, so breit, wie das Maul es zulässt, mit flacher Rille */
export const ZUNGE_ANFANG: MaulZunge = { ...ZUNGEN_FORMEN[0]!.werte, form: 0 };
/** so lang darf sie höchstens sein (Anteil der Mittellinie des Bodens; über 1 reicht sie über die Lippe hinaus) */
export const ZUNGE_LAENGE_BIS = 1.35;
/** bis zu diesem Anteil der Mittellinie richtet sich ihre Breite nach dem Maul an ihrer Stelle; weiter vorn bleibt sie so breit wie dort */
const BREIT_NACH_MAUL_BIS = 0.78;
/** vor der Lippe hält sie ihr Platz nur lose: Sie hängt unter ihrem Gewicht durch (Anteil der Feder im Maul) */
const FEDER_DRAUSSEN = 0.25;
/** wie tief die Gabel einer ganz gespaltenen Zunge ist (Anteil ihrer Länge) */
const GABEL_TIEF = 0.26;

const null1 = (x: number | undefined): number => Math.max(0, Math.min(1, x ?? 0));
/**
 * Wie breit und wie dick die Zunge längs ihrer Länge ist (u von 0 an der Wurzel bis 1 an der Spitze), als Anteile ihrer Breite
 * und Dicke: rund, spitz zulaufend (`spitz`) oder vorn breit für zwei Zinken (`gabel`).
 */
export function zungenProfil(werte: { spitz?: number; gabel?: number }, u: number): { breit: number; dick: number } {
  const p = null1(werte.spitz);
  const g = null1(werte.gabel);
  const rund = Math.sqrt(Math.max(0, 1 - Math.pow(u, 5)));
  const spitz = Math.pow(Math.max(0, 1 - Math.pow(u, 1.7)), 0.9);
  const vorn = (rund + (spitz - rund) * p) * (1 - g) + g * (1 - 0.42 * Math.pow(u, 3));
  return {
    breit: (0.86 + 0.14 * Math.sin(Math.PI * u)) * vorn,
    dick: (0.75 + 0.4 * Math.sin(Math.PI * Math.pow(u, 0.7))) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 6))) * (1 - 0.25 * p * u),
  };
}
/** die Farbe der Zunge, solange sie keine eigene trägt (wie in der Studie) */
export const ZUNGE_FARBE = '#e2607a';

/** Knoten der Kette und Punkte je Ring des Netzes */
export const ZUNGE_KNOTEN = 11;
/** so viele Punkte hat jeder Ring ihres Netzes (seit der zweiten Scheibe 20 statt 14: Die Zinken der Gabel brauchen sie) */
export const ZUNGE_RING = 20;
const M = ZUNGE_RING;
/** die Wurzel beginnt bei diesem Anteil der Mittellinie des Bodens (von der Rachenlinie aus) */
const WURZEL_BEI = 0.1;
/** die ersten Knoten sind die Wurzel: Sie sitzen fest am Kiefer */
const WURZEL_KNOTEN = 2;
/** der feste Zeitschritt der Kette (Sekunden) */
const ZUNGE_SCHRITT = 1 / 240;
/** in ihrer Lage der Pose bleibt sie höchstens so viel länger als in Ruhe */
const DEHNUNG_BLEIBT = 1.2;
/** ein Zahn steht „unter“ der Zunge (sie legt sich über ihn), wenn seine Spitze innerhalb dieses Anteils ihrer halben Breite liegt; sonst neben ihr */
const ZAHN_UNTER = 0.85;
/** so steil steigt ihr Boden zu einem Zahn unter ihr höchstens an (Höhe je Länge der Kette) */
const RAMPE = 0.45;
/** schmaler als dieser Anteil ihrer Breite wird sie zwischen Zähnen nicht */
const SCHMAL_BIS = 0.45;
/** die Gabel: wie weit die letzten drei Ringe ausgezogen sind (Anteil ihrer Tiefe) und wie weit ihre Mitte zurückbleibt */
const GABEL_RINGE = [0.25, 0.6, 1];
const GABEL_KERBE = 0.6;

type Platz = { a: number; b: number; u: number };

/**
 * Was der Zunge im Weg steht: ein Stück mit runden Enden von `a` nach `b`, in Einheiten des Werks. Ein Zahn (`nr`: seine Nummer
 * in der Reihe) oder ein Stück einer Lippe (`s0`, `s1`: der Anteil der Länge der Lippe an seinen Enden, von der Spitze zum
 * Mundwinkel).
 */
export type Hindernis = { a: [number, number, number]; b: [number, number, number]; r: number; art: 'zahn' | 'lippe'; unten: boolean; gespiegelt: boolean; nr: number; s0: number; s1: number };
/** so dick ist eine Lippe für die Zunge (Anteil der Mittellinie des Bodens) */
const LIPPE_DICK = 0.012;

export type ZungenPlatz = {
  /** je Knoten sein Platz auf der Mittellinie des Bodens und derselbe auf der des Gaumens (Punkte des Rechennetzes) */
  boden: Platz[];
  gaumen: Platz[];
  /** je Knoten ein Dreieck der Wand des Bodens an seinem Platz (drei Punkte): Seine Normale zeigt vom Boden ins Maul */
  wand: [number, number, number][];
  /** die letzten zwei Punkte der Mittellinie des Bodens: die Spitze der Lippe und der davor (dahinter hat die Zunge keinen Boden) */
  spitze: [number, number];
  /** halbe Breite und halbe Dicke je Knoten und die Länge jedes Stücks der Kette in Ruhe (Einheiten des Werks) */
  breite: Float64Array;
  dicke: Float64Array;
  stueck: Float64Array;
  /** Länge der Mittellinie des Bodens von der Rachenlinie zur Lippe */
  lang: number;
  /** Tiefe der Rille oben (Anteil der Dicke) */
  rille: number;
  /** wie tief sie vorn gespalten ist (Einheiten des Werks; 0: nicht) */
  gabel: number;
  /** je Knoten: Sein Platz liegt vor der Lippe (auf der verlängerten Mittellinie): Dort hat sie weder Boden noch Gaumen */
  draussen: Uint8Array;
};

const K = ZUNGE_KNOTEN;

/** die Punkte der Tasche in der Mittelebene auf einer Wand (`wand`: +1 Boden, −1 Gaumen), von der Rachenlinie zur Spitze der Lippe */
function mittellinie(k: Karte, tasche: MaulTasche & { kiefer: ArrayLike<number> }, wand: number): number[] {
  const P = k.netz.pos;
  const n = k.netz.n;
  let gross = 0;
  for (const v of tasche.lippe) gross = Math.max(gross, Math.abs(P[3 * v]!), Math.abs(P[3 * v + 1]!), Math.abs(P[3 * v + 2]!));
  const eps = 1e-7 * (1 + gross);
  const dabei = new Uint8Array(n);
  for (let v = 0; v < n; v++) {
    if (!tasche.innen[v] || Math.abs(P[3 * v + 2]!) > eps) continue;
    const kf = tasche.kiefer[v]!;
    if (kf === wand || kf === 0) dabei[v] = 1;
  }
  // die Spitze: der Punkt der Lippe in der Mittelebene, der zu dieser Wand gehört
  let start = -1;
  for (const v of tasche.lippe) if (dabei[v] && tasche.kiefer[v] === wand) start = v;
  if (start < 0) return [];
  // Nachbarn in der Mittelebene: Punkte, die sich ein Dreieck teilen
  const nach = new Map<number, number[]>();
  const tri = k.netz.tri;
  const verbinden = (a: number, b: number): void => {
    if (!dabei[a] || !dabei[b]) return;
    const la = nach.get(a) ?? [];
    if (!la.includes(b)) la.push(b);
    nach.set(a, la);
    const lb = nach.get(b) ?? [];
    if (!lb.includes(a)) lb.push(a);
    nach.set(b, lb);
  };
  for (let t = 0; t < k.T; t++) {
    const [a, b, c] = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
    verbinden(a, b);
    verbinden(b, c);
    verbinden(c, a);
  }
  // von der Spitze nach hinten laufen: erst über die Punkte der Wand, zuletzt auf die Rachenlinie
  const reihe = [start];
  const war = new Set([start]);
  for (;;) {
    const v = reihe[reihe.length - 1]!;
    // (auf der Rachenlinie angekommen: Dort endet die Wand)
    if (tasche.kiefer[v] === 0) break;
    const frei = (nach.get(v) ?? []).filter((w) => !war.has(w));
    const weiter = frei.find((w) => tasche.kiefer[w] === wand) ?? frei[0];
    if (weiter === undefined) break;
    reihe.push(weiter);
    war.add(weiter);
  }
  return reihe.reverse();
}

/**
 * Der Platz der Zunge, aus der Tasche gelesen (in der Ruhe der Form). null, wenn das Maul in der Mittelebene keine Reihe von
 * Punkten über Boden und Gaumen hat.
 */
/** der Punkt der Achse, den `abstandQuadrat` zuletzt gefunden hat (ein Feld für alle Aufrufe: Die Kette fragt je Bild viele tausend Mal) */
const ACHSE = new Float64Array(3);
/** Quadrat des Abstands eines Punkts (`P` ab `i`) von der Achse eines Hindernisses; der nächste Punkt der Achse steht danach in `ACHSE` */
function abstandQuadrat(P: ArrayLike<number>, i: number, h: Hindernis): number {
  const vx = h.b[0] - h.a[0];
  const vy = h.b[1] - h.a[1];
  const vz = h.b[2] - h.a[2];
  const wx = P[i]! - h.a[0];
  const wy = P[i + 1]! - h.a[1];
  const wz = P[i + 2]! - h.a[2];
  const vv = vx * vx + vy * vy + vz * vz;
  const u = vv > 1e-18 ? Math.max(0, Math.min(1, (wx * vx + wy * vy + wz * vz) / vv)) : 0;
  const cx = h.a[0] + u * vx;
  const cy = h.a[1] + u * vy;
  const cz = h.a[2] + u * vz;
  ACHSE[0] = cx;
  ACHSE[1] = cy;
  ACHSE[2] = cz;
  return (P[i]! - cx) ** 2 + (P[i + 1]! - cy) ** 2 + (P[i + 2]! - cz) ** 2;
}

/**
 * Was am Maul für jede Zunge gleich ist (gelesen aus der Tasche, in der Ruhelage der Haut): die Mittellinien von Boden und Gaumen
 * mit ihren Längen, wie breit das Maul längs des Bodens ist, und je Stück des Bodens ein Dreieck der Wand daran. Das zu lesen
 * kostet (es geht über alle Dreiecke); der Platz für bestimmte Werte daraus kostet fast nichts (`zungePlatzAuf`).
 */
export type ZungenBoden = {
  P: ArrayLike<number>;
  boden: number[];
  gaumen: number[];
  LB: number[];
  LG: number[];
  lang: number;
  /** je Punkt der Lippe (Hälfte z > 0): seine Stelle längs des Bodens und sein Abstand von der Mittelebene, nach der Stelle sortiert */
  weit: [number, number][];
  /** je Stück des Bodens (`wand[j]`: zwischen `boden[j - 1]` und `boden[j]`) ein Dreieck der Wand daran, sonst null */
  wand: ([number, number, number] | null)[];
  /** die Punkte der zwei Lippen (Hälfte z ≥ 0), jede von der Spitze zum Mundwinkel */
  lippe: { unten: number[]; oben: number[] };
};

export function zungenBoden(k: Karte, tasche: MaulTasche & { kiefer: ArrayLike<number> }): ZungenBoden | null {
  const P = k.netz.pos;
  const boden = mittellinie(k, tasche, 1);
  const gaumen = mittellinie(k, tasche, -1);
  if (boden.length < 2 || gaumen.length < 2) return null;
  const laengen = (reihe: number[]): number[] => {
    const L = [0];
    for (let i = 1; i < reihe.length; i++) {
      const [a, b] = [3 * reihe[i - 1]!, 3 * reihe[i]!];
      L.push(L[i - 1]! + Math.hypot(P[b]! - P[a]!, P[b + 1]! - P[a + 1]!));
    }
    return L;
  };
  const LB = laengen(boden);
  const LG = laengen(gaumen);
  const lang = LB[LB.length - 1]!;
  if (!(lang > 1e-6)) return null;
  // wie breit das Maul längs der Mittellinie ist: je Punkt der Lippe (Hälfte z > 0) die Stelle, die ihm in der Seite am nächsten
  // liegt, und sein Abstand von der Mittelebene
  const weit: [number, number][] = [];
  for (const v of tasche.lippe) {
    const z = Math.abs(P[3 * v + 2]!);
    let best = Infinity;
    let stelle = 0;
    for (let i = 1; i < boden.length; i++) {
      const [a, b] = [3 * boden[i - 1]!, 3 * boden[i]!];
      const [dx, dy] = [P[b]! - P[a]!, P[b + 1]! - P[a + 1]!];
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((P[3 * v]! - P[a]!) * dx + (P[3 * v + 1]! - P[a + 1]!) * dy) / l2));
      const d = Math.hypot(P[3 * v]! - P[a]! - t * dx, P[3 * v + 1]! - P[a + 1]! - t * dy);
      if (d < best) {
        best = d;
        stelle = LB[i - 1]! + t * (LB[i]! - LB[i - 1]!);
      }
    }
    weit.push([stelle, z]);
  }
  weit.sort((p, q) => p[0] - q[0]);
  // je Stück der Mittellinie des Bodens ein Dreieck der Wand daran (für die Richtung vom Boden ins Maul): das erste Dreieck in
  // der Reihenfolge des Netzes, das beide Punkte des Stücks hat und dessen dritter in der Hälfte z > 0 an Boden oder Rachen liegt
  const nr = new Map<number, number>();
  boden.forEach((v, i) => nr.set(v, i));
  const wand: ([number, number, number] | null)[] = boden.map(() => null);
  const tri = k.netz.tri;
  for (let t = 0; t < k.T; t++) {
    const e: [number, number, number] = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
    for (let x = 0; x < 3; x++) {
      const i = nr.get(e[x]!);
      const j = nr.get(e[(x + 1) % 3]!);
      if (i === undefined || j === undefined || Math.abs(i - j) !== 1) continue;
      const stueck = Math.max(i, j);
      if (wand[stueck]) continue;
      const dritter = e[(x + 2) % 3]!;
      if (tasche.innen[dritter] && tasche.kiefer[dritter] !== -1 && P[3 * dritter + 2]! > 0) wand[stueck] = e;
    }
  }
  // die zwei Lippen: die Punkte der Lippe in ihrer Reihenfolge, getrennt nach Kiefer (der Mundwinkel gehört zu beiden), jede von
  // der Spitze (in der Mittelebene) zum Mundwinkel
  const zurSeite = (reihe: number[]): number[] => (reihe.length > 1 && Math.abs(P[3 * reihe[0]! + 2]!) > Math.abs(P[3 * reihe[reihe.length - 1]! + 2]!) ? reihe.reverse() : reihe);
  const lippe = { unten: zurSeite(tasche.lippe.filter((v) => tasche.kiefer[v]! >= 0)), oben: zurSeite(tasche.lippe.filter((v) => tasche.kiefer[v]! <= 0)) };
  return { P, boden, gaumen, LB, LG, lang, weit, wand, lippe };
}

/**
 * Die zwei Lippen als Hindernisse, an der Haut mit den Lagen `P` (wie sie gezeigt wird): je Lippe eine Kette von Stücken, dazu
 * ihr Spiegelbild. `je`: so viele Punkte der Lippe fasst ein Stück zusammen.
 */
export function lippenHindernisse(B: ZungenBoden, P: ArrayLike<number>, je = 2): Hindernis[] {
  const H: Hindernis[] = [];
  const r = LIPPE_DICK * B.lang;
  for (const unten of [true, false]) {
    const reihe = unten ? B.lippe.unten : B.lippe.oben;
    if (reihe.length < 2) continue;
    // die Punkte, die Stücke begrenzen: jeder `je`-te und der letzte
    const ecken: number[] = [];
    for (let i = 0; i < reihe.length; i += je) ecken.push(reihe[i]!);
    if (ecken[ecken.length - 1] !== reihe[reihe.length - 1]) ecken.push(reihe[reihe.length - 1]!);
    const L = [0];
    for (let i = 1; i < ecken.length; i++) {
      const [a, b] = [3 * ecken[i - 1]!, 3 * ecken[i]!];
      L.push(L[i - 1]! + Math.hypot(P[b]! - P[a]!, P[b + 1]! - P[a + 1]!, P[b + 2]! - P[a + 2]!));
    }
    const ganz = L[L.length - 1]! || 1;
    for (let i = 1; i < ecken.length; i++) {
      const [a, b] = [3 * ecken[i - 1]!, 3 * ecken[i]!];
      const [s0, s1] = [L[i - 1]! / ganz, L[i]! / ganz];
      H.push({ a: [P[a]!, P[a + 1]!, P[a + 2]!], b: [P[b]!, P[b + 1]!, P[b + 2]!], r, art: 'lippe', unten, gespiegelt: false, nr: 0, s0, s1 });
      H.push({ a: [P[a]!, P[a + 1]!, -P[a + 2]!], b: [P[b]!, P[b + 1]!, -P[b + 2]!], r, art: 'lippe', unten, gespiegelt: true, nr: 0, s0, s1 });
    }
  }
  return H;
}

/** der Rahmen eines Stücks: längs (von a nach b), quer (die z-Achse, senkrecht dazu gemacht) und das Dritte */
function stueckRahmen(a: readonly number[], b: readonly number[]): [[number, number, number], [number, number, number], [number, number, number]] {
  let e1: [number, number, number] = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
  const l = Math.hypot(e1[0], e1[1], e1[2]);
  e1 = l > 1e-12 ? [e1[0] / l, e1[1] / l, e1[2] / l] : [0, 1, 0];
  const q: [number, number, number] = Math.abs(e1[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const qe = q[0] * e1[0] + q[1] * e1[1] + q[2] * e1[2];
  let e2: [number, number, number] = [q[0] - qe * e1[0], q[1] - qe * e1[1], q[2] - qe * e1[2]];
  const l2 = Math.hypot(e2[0], e2[1], e2[2]) || 1;
  e2 = [e2[0] / l2, e2[1] / l2, e2[2] / l2];
  const e3: [number, number, number] = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  return [e1, e2, e3];
}

/**
 * Das Hindernis unter einem Strahl (vom Auge `o` in Richtung `d`, Länge 1; Einheiten des Werks): das vorderste, an dem der Strahl
 * näher als `nah` vorbeigeht. Zurück: das Stück, wo auf ihm (`u` von a nach b), in welcher Richtung der Strahl daran anliegt und
 * wie weit es vom Auge ist. So wird die Zunge abgelegt: auf dem, worauf man sie loslässt.
 */
export function klebenSuchen(H: readonly Hindernis[], o: readonly number[], d: readonly number[], nah: number): { h: Hindernis; u: number; richtung: [number, number, number]; weit: number } | null {
  let best: { h: Hindernis; u: number; richtung: [number, number, number]; weit: number } | null = null;
  for (const h of H) {
    const v = [h.b[0] - h.a[0], h.b[1] - h.a[1], h.b[2] - h.a[2]];
    const w = [o[0]! - h.a[0], o[1]! - h.a[1], o[2]! - h.a[2]];
    const B = d[0]! * v[0]! + d[1]! * v[1]! + d[2]! * v[2]!;
    const C = v[0]! * v[0]! + v[1]! * v[1]! + v[2]! * v[2]!;
    const D = d[0]! * w[0]! + d[1]! * w[1]! + d[2]! * w[2]!;
    const E = v[0]! * w[0]! + v[1]! * w[1]! + v[2]! * w[2]!;
    const nenner = C - B * B;
    // der Punkt des Stücks, der dem Strahl am nächsten ist, und der Punkt des Strahls dazu
    const u = Math.max(0, Math.min(1, nenner > 1e-12 * (1 + C) ? (E - B * D) / nenner : 0));
    const s = Math.max(0, u * B - D);
    const c = [h.a[0] + u * v[0]!, h.a[1] + u * v[1]!, h.a[2] + u * v[2]!];
    const q = [o[0]! + s * d[0]! - c[0]!, o[1]! + s * d[1]! - c[1]!, o[2]! + s * d[2]! - c[2]!];
    const ab = Math.hypot(q[0]!, q[1]!, q[2]!);
    const reich = h.r + nah;
    if (ab > reich) continue;
    // (so weit vom Auge trifft der Strahl den Körper)
    const weit = s - Math.sqrt(Math.max(0, reich * reich - ab * ab));
    if (best && best.weit <= weit) continue;
    best = { h, u, richtung: ab > 1e-9 ? [q[0]! / ab, q[1]! / ab, q[2]! / ab] : [-d[0]!, -d[1]!, -d[2]!], weit };
  }
  return best;
}

/** aus einem Fund von `klebenSuchen` der Wert für die Zunge: Knoten `k` klebt dort */
export function klebenAn(k: number, f: { h: Hindernis; u: number; richtung: readonly number[] }): ZungenKleben {
  const [e1, e2, e3] = stueckRahmen(f.h.a, f.h.b);
  const r = f.richtung;
  const rund = (x: number): number => Math.round(x * 1000) / 1000;
  const d: [number, number, number] = [rund(r[0]! * e1[0] + r[1]! * e1[1] + r[2]! * e1[2]), rund(r[0]! * e2[0] + r[1]! * e2[1] + r[2]! * e2[2]), rund(r[0]! * e3[0] + r[1]! * e3[1] + r[2]! * e3[2])];
  const t = f.h.art === 'lippe' ? f.h.s0 + f.u * (f.h.s1 - f.h.s0) : f.u;
  return { k, art: f.h.art, unten: f.h.unten, gespiegelt: f.h.gespiegelt, nr: f.h.art === 'zahn' ? f.h.nr : 0, t: rund(t), d };
}

/**
 * Wo ein klebender Knoten jetzt sitzt: an seinem Zahn oder seiner Lippe, wie sie in `H` stehen, um den Radius des Stücks und
 * seinen eigenen (`rk`) von der Achse weg. Null: Das Stück gibt es nicht mehr (der Zahn ist gezogen).
 */
export function klebeOrt(H: readonly Hindernis[], kl: ZungenKleben, rk: number): [number, number, number] | null {
  let h: Hindernis | undefined;
  for (const x of H) {
    if (x.art !== kl.art || x.unten !== kl.unten || x.gespiegelt !== kl.gespiegelt) continue;
    if (kl.art === 'zahn' ? x.nr === kl.nr : kl.t >= x.s0 - 1e-9 && kl.t <= x.s1 + 1e-9) {
      h = x;
      break;
    }
  }
  if (!h) return null;
  const u = h.art === 'lippe' ? Math.max(0, Math.min(1, (kl.t - h.s0) / (h.s1 - h.s0 || 1))) : Math.max(0, Math.min(1, kl.t));
  const [e1, e2, e3] = stueckRahmen(h.a, h.b);
  const ab = h.r + rk;
  const r = [kl.d[0] * e1[0] + kl.d[1] * e2[0] + kl.d[2] * e3[0], kl.d[0] * e1[1] + kl.d[1] * e2[1] + kl.d[2] * e3[1], kl.d[0] * e1[2] + kl.d[1] * e2[2] + kl.d[2] * e3[2]];
  return [h.a[0] + u * (h.b[0] - h.a[0]) + ab * r[0]!, h.a[1] + u * (h.b[1] - h.a[1]) + ab * r[1]!, h.a[2] + u * (h.b[2] - h.a[2]) + ab * r[2]!];
}

/** der Platz einer Zunge mit diesen Werten auf dem Boden eines Mauls (`zungenBoden`) */
export function zungePlatzAuf(B: ZungenBoden, werte: MaulZunge): ZungenPlatz {
  const { P, boden, gaumen, LB, LG, lang, weit } = B;
  // Eine Stelle vor dem Ende der Reihe (vor der Lippe) liegt auf der Verlängerung der Reihe: `u` über 1, gemessen an der Sehne
  // über ihr vorderes Fünftel (ein einzelnes kurzes Stück am Ende gäbe die Richtung zu zufällig vor). `stueck`: in welchem Stück
  // der Reihe sie liegt.
  const bei = (reihe: number[], L: number[], s: number): { platz: Platz; stueck: number } => {
    const ziel = Math.max(0, s);
    const ende = L[L.length - 1]!;
    if (ziel > ende) {
      let j = L.length - 2;
      while (j > 0 && L[j]! > 0.8 * ende) j--;
      const [a, b] = [reihe[j]!, reihe[reihe.length - 1]!];
      const sehne = Math.hypot(P[3 * b]! - P[3 * a]!, P[3 * b + 1]! - P[3 * a + 1]!) || 1;
      return { platz: { a, b, u: 1 + (ziel - ende) / sehne }, stueck: reihe.length - 1 };
    }
    let j = 1;
    while (j < L.length - 1 && L[j]! < ziel) j++;
    return { platz: { a: reihe[j - 1]!, b: reihe[j]!, u: Math.max(0, (ziel - L[j - 1]!) / (L[j]! - L[j - 1]! || 1)) }, stueck: j };
  };
  const ort = (p: Platz): [number, number] => [P[3 * p.a]! + p.u * (P[3 * p.b]! - P[3 * p.a]!), P[3 * p.a + 1]! + p.u * (P[3 * p.b + 1]! - P[3 * p.a + 1]!)];
  const breiteBei = (s: number): number => {
    if (!weit.length) return 0;
    if (s <= weit[0]![0]) return weit[0]![1];
    for (let i = 1; i < weit.length; i++) {
      if (s <= weit[i]![0]) {
        const [a, b] = [weit[i - 1]!, weit[i]!];
        return a[1] + ((s - a[0]) / (b[0] - a[0] || 1)) * (b[1] - a[1]);
      }
    }
    return weit[weit.length - 1]![1];
  };
  const bis = Math.max(WURZEL_BEI + 0.1, Math.min(ZUNGE_LAENGE_BIS, werte.laenge));
  const plaetzeBoden: Platz[] = [];
  const plaetzeGaumen: Platz[] = [];
  const wand: [number, number, number][] = [];
  const breite = new Float64Array(K);
  const dicke = new Float64Array(K);
  const draussen = new Uint8Array(K);
  const orte: [number, number][] = [];
  for (let i = 0; i < K; i++) {
    // (zur Spitze hin stehen die Knoten dichter: So wird sie rund statt abgeschnitten)
    const u = 1 - Math.pow(1 - i / (K - 1), 1.7);
    const s = lang * (WURZEL_BEI + (bis - WURZEL_BEI) * u);
    const { platz: p, stueck } = bei(boden, LB, s);
    plaetzeBoden.push(p);
    plaetzeGaumen.push(bei(gaumen, LG, (s / lang) * LG[LG.length - 1]!).platz);
    draussen[i] = s > lang ? 1 : 0;
    // (vor der Lippe gilt die Wand am letzten Stück des Bodens; ohne Wand sagt die Kette selbst, wo oben ist)
    wand.push(B.wand[stueck] ?? [boden[stueck - 1]!, boden[stueck]!, boden[stueck - 1]!]);
    orte.push(ort(p));
    const profil = zungenProfil(werte, u);
    dicke[i] = Math.max(0, werte.dicke) * lang * profil.dick;
    // so breit, wie das Maul an ihrer Stelle ist. Ganz vorn läuft das Maul auf null zu: Was weiter reicht als bis kurz hinter die
    // Zähne (und über die Lippe hinaus), bleibt so breit, wie das Maul dort ist
    const sBreit = Math.min(s, BREIT_NACH_MAUL_BIS * lang);
    breite[i] = Math.min(Math.max(0, werte.breite) * breiteBei(sBreit), 0.42 * lang) * profil.breit;
  }
  const stueck = new Float64Array(K - 1);
  let kette = 0;
  for (let i = 0; i + 1 < K; i++) {
    stueck[i] = Math.hypot(orte[i + 1]![0] - orte[i]![0], orte[i + 1]![1] - orte[i]![1]);
    kette += stueck[i]!;
  }
  return {
    boden: plaetzeBoden,
    gaumen: plaetzeGaumen,
    wand,
    spitze: [boden[boden.length - 2]!, boden[boden.length - 1]!],
    breite,
    dicke,
    stueck,
    lang,
    rille: Math.max(0, Math.min(0.8, werte.rille)),
    gabel: null1(werte.gabel) * GABEL_TIEF * kette,
    draussen,
  };
}

/** der Platz einer Zunge in einem Maul (null: Dieses Maul hat in der Mitte keinen Boden für sie) */
export function zungePlatz(k: Karte, tasche: MaulTasche & { kiefer: ArrayLike<number> }, werte: MaulZunge): ZungenPlatz | null {
  const B = zungenBoden(k, tasche);
  return B ? zungePlatzAuf(B, werte) : null;
}

type V3 = [number, number, number];
const lage = (P: ArrayLike<number>, p: Platz): V3 => [
  P[3 * p.a]! + p.u * (P[3 * p.b]! - P[3 * p.a]!),
  P[3 * p.a + 1]! + p.u * (P[3 * p.b + 1]! - P[3 * p.a + 1]!),
  P[3 * p.a + 2]! + p.u * (P[3 * p.b + 2]! - P[3 * p.a + 2]!),
];

/**
 * Die Kette der Zunge: Lagen und Tempo ihrer Knoten an der gezeigten Haut (Einheiten des Werks). `schritt` führt sie ein Bild
 * weiter; `greifen`, `ziehen`, `lassen` sind der Griff am Gummi.
 */
export class ZungenKette {
  readonly pos = new Float64Array(3 * K);
  private readonly vel = new Float64Array(3 * K);
  /** je Knoten: sein Platz (Boden plus halbe Dicke), der Boden, die Richtung vom Boden ins Maul, der Raum bis zum Gaumen */
  readonly ziel = new Float64Array(3 * K);
  private readonly boden = new Float64Array(3 * K);
  readonly auf = new Float64Array(3 * K);
  private readonly raum = new Float64Array(K);
  private gegriffen = -1;
  private readonly hand: V3 = [0, 0, 0];
  bewegt = false;
  /** das größte Tempo eines Knotens im letzten Schritt (Einheiten des Werks je Sekunde) und welcher Knoten es hatte */
  tempo = 0;
  schnellster = -1;
  /** Zeit, die noch nicht gerechnet ist (die Kette rechnet in festen Schritten, gleich wie lang ein Bild dauert) */
  private offen = 0;
  /** was im Weg steht (Zähne, Lippen), in Einheiten des Werks: Wer die Kette führt, setzt es vor jedem Schritt */
  hindernisse: readonly Hindernis[] = [];
  /**
   * Die Zähne an jedem Knoten im Maul (`zaehneMessen`): so hoch stehen die unteren unter ihm (über seinem Boden), so tief hängen
   * die oberen über ihm, so breit ist der Gang zwischen den Zähnen neben ihm (halbe Breite).
   */
  private readonly hoch = new Float64Array(K);
  private readonly tief = new Float64Array(K).fill(Infinity);
  private readonly eng = new Float64Array(K).fill(Infinity);
  /** die Zähne mit Länge unter den Hindernissen, und die Spitze der Lippe mit der Richtung des Bodens dort (davor ist „vor der Lippe“) */
  private zaehne: Hindernis[] = [];
  private readonly vorn = new Float64Array(4);
  /** ein Knoten klebt an diesem Ort (je Bild gesetzt): Er sitzt dort fest wie an der Hand */
  klebt: { k: number; ort: readonly number[] } | null = null;
  /**
   * Ihre Lage in der Pose: je Knoten längs, hoch und quer an seinem Platz auf dem Unterkiefer (`lageJetzt`), dann die Längen
   * ihrer Stücke. Mit ihr will jeder Knoten dorthin statt an seinen Platz, und ihr Gewicht zieht nicht.
   */
  lage: readonly number[] | null = null;

  constructor(readonly platz: ZungenPlatz) {}

  get greift(): boolean {
    return this.gegriffen >= 0;
  }
  /** der gegriffene Knoten (−1: keiner) */
  get griff(): number {
    return this.gegriffen;
  }

  /** wie dick die Zunge an einem Knoten sein darf: Im fast geschlossenen Maul wird sie flach (1 = ihre ganze Dicke) */
  dickeMass(k: number): number {
    return Math.max(0.02, Math.min(1, (Math.min(this.raum[k]!, this.tief[k]!) - this.hoch[k]!) / (2.6 * this.platz.dicke[k]! + 1e-9)));
  }
  /** so breit (halbe Breite) darf sie an einem Knoten höchstens sein: der Gang zwischen den Zähnen neben ihr */
  breiteGrenze(k: number): number {
    return this.eng[k]!;
  }
  /** die Maße der Zähne je Knoten (für Proben): Boden gehoben, Decke, Gang, und seine Höhe über seinem Boden */
  get zahnMasse(): { hoch: number[]; tief: number[]; eng: number[]; hoehe: number[]; draussen: boolean[] } {
    const hoehe: number[] = [];
    for (let k = 0; k < K; k++) hoehe.push((this.pos[3 * k]! - this.boden[3 * k]!) * this.auf[3 * k]! + (this.pos[3 * k + 1]! - this.boden[3 * k + 1]!) * this.auf[3 * k + 1]!);
    return { hoch: Array.from(this.hoch), tief: Array.from(this.tief), eng: Array.from(this.eng), hoehe, draussen: Array.from({ length: K }, (_, k) => this.vorDerLippe(k)) };
  }

  /** liegt ein Knoten vor der Lippe (vor ihrer Spitze, in der Richtung des Bodens dort)? Dort hat sie weder Boden noch Gaumen */
  private vorDerLippe(k: number): boolean {
    return (this.pos[3 * k]! - this.vorn[0]!) * this.vorn[2]! + (this.pos[3 * k + 1]! - this.vorn[1]!) * this.vorn[3]! > 0;
  }

  /**
   * Die Zähne an der Kette messen (für die Knoten im Maul). Je Zahn: Liegt die Kette über ihm (seine Spitze steht, von oben
   * gesehen, zwischen zwei Knoten und nicht vor der Spitze der Zunge)? Dann gilt:
   * - unter ihr (seine Spitze liegt innerhalb ihrer Breite dort): Der Boden steigt als flache Rampe zu seiner Spitze an, längs
   *   der Kette nach beiden Seiten (`RAMPE`: so steil höchstens). Die Zunge legt sich schräg auf den Zahn, statt an ihm zu knicken.
   *   Ein steiler Buckel nur am Zahn ließ die Kette nie ruhen: Sie hat die Länge nicht, um darüberzusteigen.
   * - über ihr (ein oberer Zahn): Die Decke sinkt genauso zu seiner Spitze ab.
   * - neben ihr und in ihrer Höhe: Sie wird dort schmaler (der Gang zwischen den Zähnen), längs der Kette auslaufend.
   * `mix`: wie weit die neuen Maße die alten ersetzen (im laufenden Bild die Hälfte: Die Maße hängen an der Lage der Knoten).
   */
  private zaehneMessen(mix = 1): void {
    const pl = this.platz;
    const Z = this.zaehne;
    const p = this.pos;
    const hoch = new Float64Array(K);
    const tief = new Float64Array(K).fill(Infinity);
    const eng = new Float64Array(K).fill(Infinity);
    if (Z.length) {
      // die Stelle jedes Knotens längs der Kette, in ihrer Ruhe gemessen (nicht an den Lagen von jetzt: Sonst hinge jede Rampe an
      // jedem kleinen Rutschen der Knoten)
      const S = new Float64Array(K);
      for (let k = 1; k < K; k++) S[k] = S[k - 1]! + this.stueckRuhe(k - 1);
      for (const h of Z) {
        // Der Punkt der Kette, der der Spitze des Zahns am nächsten liegt, von oben gesehen (ohne die Höhe über dem Boden): auf
        // welchem Stück, wie weit darauf, wie weit quer daneben. Mit der Höhe gemessen sprang dieser Punkt, sobald ein Knoten
        // ein wenig stieg oder sank, und die Kette kam unter einem oberen Zahn nie zur Ruhe.
        let st = -1;
        let su = 0;
        let quer = Infinity;
        let ende = 0;
        for (let k = 0; k + 1 < K; k++) {
          const i = 3 * k;
          const nx = this.auf[i]!;
          const ny = this.auf[i + 1]!;
          let vx = p[i + 3]! - p[i]!;
          let vy = p[i + 4]! - p[i + 1]!;
          const vz = p[i + 5]! - p[i + 2]!;
          const vn = vx * nx + vy * ny;
          vx -= vn * nx;
          vy -= vn * ny;
          let wx = h.b[0] - p[i]!;
          let wy = h.b[1] - p[i + 1]!;
          const wz = h.b[2] - p[i + 2]!;
          const wn = wx * nx + wy * ny;
          wx -= wn * nx;
          wy -= wn * ny;
          const vv = vx * vx + vy * vy + vz * vz;
          if (!(vv > 1e-18)) continue;
          const roh = (wx * vx + wy * vy + wz * vz) / vv;
          const u = Math.max(0, Math.min(1, roh));
          const d = Math.hypot(wx - u * vx, wy - u * vy, wz - u * vz);
          if (d < quer) {
            quer = d;
            st = k;
            su = u;
            ende = roh > 1 ? 1 : roh < 0 ? -1 : 0;
          }
        }
        if (st < 0) continue;
        // Liegt der nächste Punkt am Ende der Kette (ihre Spitze, ihre Wurzel): Steht der Zahn davor (dahinter), liegt sie nicht
        // über ihm. Längs gemessen wird dort an der Richtung des Bodens am Platz des Endknotens: Die steht ruhig. Das letzte Stück
        // der Kette selbst ist kurz und zappelt; an ihm gemessen galt ein Zahn weit vor der Spitze immer wieder als „unter ihr“,
        // und die Zunge wurde in einem fort hochgeworfen.
        if ((ende > 0 && st === K - 2) || (ende < 0 && st === 0)) {
          const ke = ende > 0 ? K - 1 : 0;
          const [fx, fy] = this.bodenRahmen(ke);
          const laengs = ((h.b[0] - p[3 * ke]!) * fx + (h.b[1] - p[3 * ke + 1]!) * fy) * ende;
          if (laengs > h.r) continue;
          quer = Math.abs(h.b[2] - p[3 * ke + 2]!);
        }
        const stelle = S[st]! + su * (S[st + 1]! - S[st]!);
        // ihre halbe Breite an dieser Stelle; die Höhe der Spitze über dem Boden dort und ihre eigene Höhe und halbe Dicke, je
        // zwischen den zwei Knoten des Stücks gemischt (am Platz nur des näheren gemessen, sprang das Maß, sobald der Zahn die
        // Mitte des Stücks überschritt, und die Kette pendelte)
        const w = pl.breite[st]! + (pl.breite[st + 1]! - pl.breite[st]!) * su;
        const an = (kn: number): [number, number, number] => {
          const i = 3 * kn;
          const nx = this.auf[i]!;
          const ny = this.auf[i + 1]!;
          const ha = (h.a[0] - this.boden[i]!) * nx + (h.a[1] - this.boden[i + 1]!) * ny;
          const hb = (h.b[0] - this.boden[i]!) * nx + (h.b[1] - this.boden[i + 1]!) * ny;
          return [h.unten ? Math.max(ha, hb) + h.r : Math.min(ha, hb) - h.r, (p[i]! - this.boden[i]!) * nx + (p[i + 1]! - this.boden[i + 1]!) * ny, 0.8 * pl.dicke[kn]! * this.dickeMass(kn)];
        };
        const [A, B] = [an(st), an(st + 1)];
        const spitze = A[0] + (B[0] - A[0]) * su;
        const hoehe = A[1] + (B[1] - A[1]) * su;
        const d = Math.max(1e-9, A[2] + (B[2] - A[2]) * su);
        const unter = quer < Math.max(ZAHN_UNTER * w, h.r);
        // (ein Zahn neben ihr macht sie schmaler, soweit er in ihre Höhe reicht: weich über ihre halbe Dicke, nicht mit einem Schlag)
        const reicht = Math.max(0, Math.min(1, (h.unten ? spitze - (hoehe - d) : hoehe + d - spitze) / d));
        for (let k = WURZEL_KNOTEN; k < K; k++) {
          const weit = Math.max(0, Math.abs(S[k]! - stelle) - h.r);
          if (unter) {
            if (h.unten) hoch[k] = Math.max(hoch[k]!, spitze - RAMPE * weit);
            else tief[k] = Math.min(tief[k]!, spitze + RAMPE * weit);
          } else if (reicht > 0) eng[k] = Math.min(eng[k]!, quer - h.r + weit + (1 - reicht) * pl.breite[k]!);
        }
      }
    }
    for (let k = 0; k < K; k++) {
      // (nur im Maul; und der Boden steigt nie so weit, dass unter dem Gaumen kein Platz mehr für sie bliebe)
      const innen = k >= WURZEL_KNOTEN && !this.vorDerLippe(k);
      const h = innen ? Math.max(0, Math.min(hoch[k]!, this.raum[k]! - 0.8 * pl.dicke[k]!)) : 0;
      // (nachgeführt wird nur, was sich merklich geändert hat: Jede Änderung versetzt die Knoten, und die Maße hängen an ihrer Lage.
      // Ohne diese Schwelle zitterte die Kette unter einem oberen Zahn für immer, um Zehntel einer Einheit)
      const schwelle = mix < 1 ? 0.003 * pl.lang : 0;
      const nach = (alt: number, neu: number): number => (!Number.isFinite(alt) || !Number.isFinite(neu) ? neu : Math.abs(neu - alt) < schwelle ? alt : alt + (neu - alt) * mix);
      this.hoch[k] = nach(this.hoch[k]!, h);
      this.tief[k] = nach(this.tief[k]!, innen ? tief[k]! : Infinity);
      this.eng[k] = nach(this.eng[k]!, innen ? eng[k]! : Infinity);
    }
  }

  /** die Plätze der Knoten an der Haut mit den Lagen `P` (wie sie gezeigt wird) */
  private zieleLesen(P: ArrayLike<number>): void {
    const pl = this.platz;
    // die Spitze der Lippe und die Richtung des Bodens dort: Davor hat die Zunge keinen Boden mehr
    {
      const [sa, sb] = [3 * pl.spitze[0], 3 * pl.spitze[1]];
      const [tx, ty] = [P[sb]! - P[sa]!, P[sb + 1]! - P[sa + 1]!];
      const tl = Math.hypot(tx, ty) || 1;
      this.vorn[0] = P[sb]!;
      this.vorn[1] = P[sb + 1]!;
      this.vorn[2] = tx / tl;
      this.vorn[3] = ty / tl;
    }
    this.zaehne = this.hindernisse.filter((h) => h.art === 'zahn' && h.r > 1e-9);
    for (let k = 0; k < K; k++) {
      const F = lage(P, pl.boden[k]!);
      const G = lage(P, pl.gaumen[k]!);
      const w = pl.wand[k]!;
      // vom Boden ins Maul: die Normale der Wand, in der Mittelebene (so steht die Zunge auch im geschlossenen Maul richtig herum)
      const [a, b, c] = [3 * w[0], 3 * w[1], 3 * w[2]];
      let nx = (P[b + 1]! - P[a + 1]!) * (P[c + 2]! - P[a + 2]!) - (P[b + 2]! - P[a + 2]!) * (P[c + 1]! - P[a + 1]!);
      let ny = (P[b + 2]! - P[a + 2]!) * (P[c]! - P[a]!) - (P[b]! - P[a]!) * (P[c + 2]! - P[a + 2]!);
      let l = Math.hypot(nx, ny);
      const spalt = Math.hypot(G[0] - F[0], G[1] - F[1], G[2] - F[2]);
      const [gx, gy] = [G[0] - F[0], G[1] - F[1]];
      const gl = Math.hypot(gx, gy);
      if (gl > 0.05 * pl.lang || (l < 1e-12 && gl > 0)) {
        // weit offen sagt der Gaumen selbst, wo oben ist
        nx = gx;
        ny = gy;
        l = gl;
      } else if (l < 1e-12) {
        nx = 0;
        ny = 1;
        l = 1;
      } else if (gl > 1e-9 * pl.lang && gx * nx + gy * ny < 0) {
        // (die Wand ist andersherum gespeichert: zum Gaumen hin drehen)
        nx = -nx;
        ny = -ny;
      }
      nx /= l;
      ny /= l;
      // (vor der Lippe ist kein Gaumen: Dort hat sie ihre ganze Dicke)
      this.raum[k] = pl.draussen[k] ? 1e9 : spalt;
      this.boden[3 * k] = F[0];
      this.boden[3 * k + 1] = F[1];
      this.boden[3 * k + 2] = F[2];
      this.auf[3 * k] = nx;
      this.auf[3 * k + 1] = ny;
      this.auf[3 * k + 2] = 0;
      // (ihr Platz liegt über den Zähnen, die unter ihr stehen)
      const h = 0.9 * pl.dicke[k]! * this.dickeMass(k) + this.hoch[k]!;
      this.ziel[3 * k] = F[0] + nx * h;
      this.ziel[3 * k + 1] = F[1] + ny * h;
      this.ziel[3 * k + 2] = F[2];
    }
    // in der Pose: dorthin, wo sie losgelassen wurde (an ihrem Platz auf dem Unterkiefer gemessen: Sie geht mit ihm mit)
    const L = this.lage;
    if (L && L.length >= 4 * K - 1) {
      // (die Wurzel bleibt an ihrem Platz am Kiefer)
      for (let k = WURZEL_KNOTEN; k < K; k++) {
        const [tx, ty, nx, ny] = this.bodenRahmen(k);
        this.ziel[3 * k] = this.boden[3 * k]! + tx * L[3 * k]! + nx * L[3 * k + 1]!;
        this.ziel[3 * k + 1] = this.boden[3 * k + 1]! + ty * L[3 * k]! + ny * L[3 * k + 1]!;
        this.ziel[3 * k + 2] = L[3 * k + 2]!;
      }
    }
  }

  /**
   * Der Rahmen des Bodens am Platz eines Knotens, in der Mittelebene: längs (von seinem Nachbarn hinten zu dem vorn) und hoch
   * (quer dazu, ins Maul). Er hängt nur am Unterkiefer, nicht daran, wie weit das Maul offen steht.
   */
  private bodenRahmen(k: number): [number, number, number, number] {
    const [a, b] = [3 * Math.max(0, k - 1), 3 * Math.min(K - 1, k + 1)];
    let tx = this.boden[b]! - this.boden[a]!;
    let ty = this.boden[b + 1]! - this.boden[a + 1]!;
    const l = Math.hypot(tx, ty);
    if (l > 1e-12) {
      tx /= l;
      ty /= l;
    } else {
      tx = this.auf[3 * k + 1]!;
      ty = -this.auf[3 * k]!;
    }
    let [nx, ny] = [-ty, tx];
    if (nx * this.auf[3 * k]! + ny * this.auf[3 * k + 1]! < 0) {
      nx = -nx;
      ny = -ny;
    }
    return [tx, ty, nx, ny];
  }

  /**
   * Ihre Lage für die Pose, aus dem, wie sie jetzt liegt: je Knoten längs, hoch und quer an seinem Platz auf dem Unterkiefer,
   * dann die Längen ihrer Stücke. Als `lage` gesetzt, ruht sie so. Ihre Form bleibt (die Bahn, auf der sie liegt), die Dehnung
   * nicht: Länger als `DEHNUNG_BLEIBT` mal ihre Länge in Ruhe bleibt sie nicht, sie zieht sich längs ihrer Bahn zusammen (ein
   * auf das Zweieinhalbfache gezogenes Band blieb sonst als dünner Streifen stehen: im Fenster gesehen). Die Knoten verteilen
   * sich längs der Bahn wie in Ruhe.
   */
  lageJetzt(): number[] {
    const pl = this.platz;
    const rund = (x: number): number => Math.round(x * 1000) / 1000;
    const S = [0];
    for (let k = 1; k < K; k++) S.push(S[k - 1]! + Math.hypot(this.pos[3 * k]! - this.pos[3 * k - 3]!, this.pos[3 * k + 1]! - this.pos[3 * k - 2]!, this.pos[3 * k + 2]! - this.pos[3 * k - 1]!));
    let natur = 0;
    for (let k = 0; k + 1 < K; k++) natur += pl.stueck[k]!;
    const bleibt = Math.min(S[K - 1]!, DEHNUNG_BLEIBT * natur);
    const orte: V3[] = [];
    let bis = 0;
    let j = 0;
    for (let k = 0; k < K; k++) {
      const s = natur > 0 ? (bis / natur) * bleibt : 0;
      while (j < K - 2 && S[j + 1]! < s) j++;
      const u = Math.max(0, Math.min(1, (s - S[j]!) / (S[j + 1]! - S[j]! || 1)));
      orte.push([0, 1, 2].map((x) => this.pos[3 * j + x]! + u * (this.pos[3 * j + 3 + x]! - this.pos[3 * j + x]!)) as V3);
      if (k + 1 < K) bis += pl.stueck[k]!;
    }
    const L: number[] = [];
    for (let k = 0; k < K; k++) {
      const [tx, ty, nx, ny] = this.bodenRahmen(k);
      const dx = orte[k]![0] - this.boden[3 * k]!;
      const dy = orte[k]![1] - this.boden[3 * k + 1]!;
      L.push(rund(dx * tx + dy * ty), rund(dx * nx + dy * ny), rund(orte[k]![2]));
    }
    for (let k = 0; k + 1 < K; k++) L.push(rund(Math.hypot(orte[k + 1]![0] - orte[k]![0], orte[k + 1]![1] - orte[k]![1], orte[k + 1]![2] - orte[k]![2])));
    return L;
  }
  /** die Länge eines Stücks in Ruhe: in der Pose die, mit der sie losgelassen wurde */
  private stueckRuhe(k: number): number {
    const L = this.lage;
    return L && L.length >= 4 * K - 1 ? L[3 * K + k]! : this.platz.stueck[k]!;
  }
  /** wie nah ein Knoten einem Hindernis kommt (unter null: Er steckt darin); für Proben */
  get engster(): number {
    let e = Infinity;
    for (let k = WURZEL_KNOTEN; k < K; k++) {
      if (k === this.gegriffen || k === this.klebt?.k) continue;
      const rk = 0.8 * this.platz.dicke[k]! * this.dickeMass(k);
      for (const h of this.hindernisse) {
        if (!(h.r > 1e-9)) continue;
        e = Math.min(e, Math.sqrt(abstandQuadrat(this.pos, 3 * k, h)) - h.r - rk);
      }
    }
    return e;
  }

  /** die Zunge an ihren Platz legen, ohne Bewegung (neu angelegt, oder die Form hat sich geändert, ohne dass sie nachschwingen soll) */
  setzen(P: ArrayLike<number>): void {
    this.zieleLesen(P);
    this.pos.set(this.ziel);
    // (stehen Zähne unter ihr, liegt sie gleich darüber: einmal messen, dann gelten die Plätze)
    if (this.zaehne.length) {
      this.zaehneMessen();
      this.zieleLesen(P);
      this.pos.set(this.ziel);
    }
    this.vel.fill(0);
    this.offen = 0;
    this.bewegt = false;
  }

  /**
   * Lagen, Tempo und Griff einer Kette übernehmen, die bisher lief (ihr Platz wurde neu gelesen, etwa nach einem Schritt oder
   * einem Netzwechsel): Die Zunge schwingt weiter, statt an den neuen Platz zu springen.
   */
  uebernehmen(alt: ZungenKette): void {
    this.pos.set(alt.pos);
    this.vel.set(alt.vel);
    // (auch die Maße der Zähne: Sonst läge sie ein Bild lang halb in den Zähnen, über denen sie liegt)
    this.hoch.set(alt.hoch);
    this.tief.set(alt.tief);
    this.eng.set(alt.eng);
    this.offen = alt.offen;
    this.gegriffen = alt.gegriffen;
    this.hand[0] = alt.hand[0];
    this.hand[1] = alt.hand[1];
    this.hand[2] = alt.hand[2];
    this.bewegt = true;
  }

  /** der Knoten, der einem Ort am nächsten liegt (die Wurzel ist fest und zählt nicht) */
  naechster(p: readonly number[]): number {
    let best = WURZEL_KNOTEN;
    let d = Infinity;
    for (let k = WURZEL_KNOTEN; k < K; k++) {
      const q = Math.hypot(this.pos[3 * k]! - p[0]!, this.pos[3 * k + 1]! - p[1]!, this.pos[3 * k + 2]! - p[2]!);
      if (q < d) {
        d = q;
        best = k;
      }
    }
    return best;
  }
  ort(k: number): V3 {
    return [this.pos[3 * k]!, this.pos[3 * k + 1]!, this.pos[3 * k + 2]!];
  }
  greifen(k: number): void {
    this.gegriffen = Math.max(WURZEL_KNOTEN, Math.min(K - 1, k));
    const o = this.ort(this.gegriffen);
    this.hand[0] = o[0];
    this.hand[1] = o[1];
    this.hand[2] = o[2];
  }
  ziehen(p: readonly number[]): void {
    this.hand[0] = p[0]!;
    this.hand[1] = p[1]!;
    this.hand[2] = p[2]!;
  }
  lassen(): void {
    this.gegriffen = -1;
  }

  /** Länge der Kette jetzt und in Ruhe */
  get laenge(): number {
    let l = 0;
    for (let k = 0; k + 1 < K; k++) l += Math.hypot(this.pos[3 * k + 3]! - this.pos[3 * k]!, this.pos[3 * k + 4]! - this.pos[3 * k + 1]!, this.pos[3 * k + 5]! - this.pos[3 * k + 2]!);
    return l;
  }
  get ruheLaenge(): number {
    let l = 0;
    for (let k = 0; k + 1 < K; k++) l += this.stueckRuhe(k);
    return l;
  }
  /** wie weit die Spitze von ihrem Platz ist */
  get spitzeAb(): number {
    const e = 3 * (K - 1);
    return Math.hypot(this.pos[e]! - this.ziel[e]!, this.pos[e + 1]! - this.ziel[e + 1]!, this.pos[e + 2]! - this.ziel[e + 2]!);
  }

  /**
   * Ein Bild weiter, an der Haut mit den Lagen `P` (wie sie gezeigt wird). Zurück: ob sich die Zunge noch bewegt.
   */
  schritt(dt: number, P: ArrayLike<number>): boolean {
    const pl = this.platz;
    this.zieleLesen(P);
    // Feste Schritte von 1/240 s: Mit Schritten, die von der Dauer des Bilds abhängen, hat die Kette je Bild eine etwas andere
    // Ruhelage und zittert für immer (im Fenster gemessen: die Spitze 6 bis 19 Einheiten je Sekunde, bei ungleichen Bildzeiten)
    const h = ZUNGE_SCHRITT;
    this.offen += Math.max(0, Math.min(dt, 1 / 15));
    const N = Math.min(16, Math.floor(this.offen / h + 1e-9));
    this.offen -= N * h;
    if (N === 0) return this.bewegt;
    const OMEGA = 2 * Math.PI * 3.1;
    const DAEMPF = 2 * 0.2 * OMEGA;
    let weg = 0;
    const vor = new Float64Array(3 * K);
    // Die Zähne an jedem Knoten, wie er zuletzt lag: einmal je Bild und nur zur Hälfte nachgeführt. In jedem der festen Schritte
    // neu gemessen, pendelte die Kette für immer (ein Knoten am Hang eines Zahns rutscht, sein Boden ändert sich, er rutscht zurück)
    if (this.zaehne.length || this.hoch.some((x) => x !== 0) || this.tief.some((x) => x !== Infinity) || this.eng.some((x) => x !== Infinity)) this.zaehneMessen(0.5);
    const inLage = !!this.lage && this.lage.length >= 4 * K - 1;
    const klK = this.klebt && this.klebt.k !== this.gegriffen ? this.klebt.k : -1;
    // nur die Hindernisse, an die die Kette überhaupt reichen kann (um ihre Mitte, so weit sie gedehnt ist)
    const nah: Hindernis[] = [];
    if (this.hindernisse.length) {
      const m = 3 * Math.floor(K / 2);
      const reich = this.laenge + pl.lang * 0.2;
      for (const h of this.hindernisse) {
        if (!(h.r > 1e-9)) continue;
        const d = Math.hypot((h.a[0] + h.b[0]) / 2 - this.pos[m]!, (h.a[1] + h.b[1]) / 2 - this.pos[m + 1]!, (h.a[2] + h.b[2]) / 2 - this.pos[m + 2]!);
        if (d < reich + h.r + Math.hypot(h.b[0] - h.a[0], h.b[1] - h.a[1], h.b[2] - h.a[2]) / 2) nah.push(h);
      }
    }
    for (let n = 0; n < N; n++) {
      for (let k = 0; k < K; k++) {
        const u = k / (K - 1);
        // die Feder zum Platz auf dem Unterkiefer: hinten straff, vorn lose (die Spitze schwingt nach)
        // (was vor einer Klebestelle liegt, hängt nur noch an ihr: Zöge sein Platz im Maul daran, faltete sich die Spitze zurück)
        const fed = klK >= 0 && k > klK ? 0 : OMEGA * OMEGA * (1.7 - 1.1 * u) * (pl.draussen[k] && !inLage ? FEDER_DRAUSSEN : 1);
        const i = 3 * k;
        // hängt die Zunge über die Lippe hinaus, zieht sie ihr Gewicht nach unten (in ihrer Lage der Pose nicht: Die ist gesetzt)
        const schwer = inLage ? 0 : -pl.lang * 6 * u;
        this.vel[i]! += (fed * (this.ziel[i]! - this.pos[i]!) - DAEMPF * this.vel[i]!) * h;
        this.vel[i + 1]! += (fed * (this.ziel[i + 1]! - this.pos[i + 1]!) - DAEMPF * this.vel[i + 1]! + schwer) * h;
        this.vel[i + 2]! += (fed * (this.ziel[i + 2]! - this.pos[i + 2]!) - DAEMPF * this.vel[i + 2]!) * h;
      }
      vor.set(this.pos);
      for (let i = 0; i < 3 * K; i++) this.pos[i]! += this.vel[i]! * h;
      // die Wurzel sitzt fest am Unterkiefer
      for (let i = 0; i < 3 * WURZEL_KNOTEN; i++) this.pos[i] = this.ziel[i]!;
      if (this.gegriffen >= 0) {
        const g = 3 * this.gegriffen;
        this.pos[g] = this.hand[0];
        this.pos[g + 1] = this.hand[1];
        this.pos[g + 2] = this.hand[2];
      }
      // der klebende Knoten sitzt an seinem Ort (die Hand geht vor: Wer ihn greift, zieht ihn ab)
      if (klK >= 0) {
        const o = this.klebt!.ort;
        this.pos[3 * klK] = o[0]!;
        this.pos[3 * klK + 1] = o[1]!;
        this.pos[3 * klK + 2] = o[2]!;
      }
      // Gummi: Die Kette hält ihre Länge weich (gedehnt zieht sie stärker zurück als gestaucht)
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k + 1 < K; k++) {
          const a = 3 * k;
          const b = a + 3;
          const dx = this.pos[b]! - this.pos[a]!;
          const dy = this.pos[b + 1]! - this.pos[a + 1]!;
          const dz = this.pos[b + 2]! - this.pos[a + 2]!;
          const l = Math.hypot(dx, dy, dz) || 1e-9;
          const ruhe = this.stueckRuhe(k);
          const f = ((l - ruhe) / l) * (l > ruhe ? 0.16 : 0.4);
          const wa = k < WURZEL_KNOTEN || k === this.gegriffen || k === klK ? 0 : 0.5;
          const wb = k + 1 < WURZEL_KNOTEN || k + 1 === this.gegriffen || k + 1 === klK ? 0 : 0.5;
          const sum = wa + wb || 1;
          this.pos[a]! += (dx * f * wa) / sum;
          this.pos[a + 1]! += (dy * f * wa) / sum;
          this.pos[a + 2]! += (dz * f * wa) / sum;
          this.pos[b]! -= (dx * f * wb) / sum;
          this.pos[b + 1]! -= (dy * f * wb) / sum;
          this.pos[b + 2]! -= (dz * f * wb) / sum;
        }
      }
      // Boden und Gaumen halten sie im Maul (wo das Maul ist: hinter der Spitze der Lippe)
      for (let k = WURZEL_KNOTEN; k < K; k++) {
        if (k === this.gegriffen || k === klK) continue;
        const i = 3 * k;
        const draussen = this.vorDerLippe(k);
        // vor der Lippe: Zähne und Lippen als runde Körper. Wo sie stehen, ist kein Platz für sie
        if (draussen && nah.length) {
          const rk = 0.8 * pl.dicke[k]! * this.dickeMass(k);
          for (const h of nah) {
            const d2 = abstandQuadrat(this.pos, i, h);
            const soll = h.r + rk;
            if (d2 >= soll * soll) continue;
            const d = Math.sqrt(d2);
            // weg vom Körper, um das, was sie in ihm steckt. Der Stoß nimmt ihr nur das Tempo in den Körper hinein, er gibt ihr
            // keines (siehe unten bei Boden und Decke)
            const [ex, ey, ez] = d > 1e-9 ? [(this.pos[i]! - ACHSE[0]!) / d, (this.pos[i + 1]! - ACHSE[1]!) / d, (this.pos[i + 2]! - ACHSE[2]!) / d] : [this.auf[i]!, this.auf[i + 1]!, 0];
            const tief = soll - d;
            const a = (this.pos[i]! - vor[i]!) * ex + (this.pos[i + 1]! - vor[i + 1]!) * ey + (this.pos[i + 2]! - vor[i + 2]!) * ez;
            const ohne = a + tief - Math.max(0, a);
            this.pos[i]! += ex * tief;
            this.pos[i + 1]! += ey * tief;
            this.pos[i + 2]! += ez * tief;
            vor[i]! += ex * ohne;
            vor[i + 1]! += ey * ohne;
            vor[i + 2]! += ez * ohne;
          }
        }
        if (draussen) continue;
        // im Maul: Boden und Gaumen, dazu die Zähne unter und über ihr
        const d = 0.8 * pl.dicke[k]! * this.dickeMass(k);
        const [nx, ny] = [this.auf[i]!, this.auf[i + 1]!];
        const hoehe = (this.pos[i]! - this.boden[i]!) * nx + (this.pos[i + 1]! - this.boden[i + 1]!) * ny;
        // Wo Zähne den Boden heben oder die Decke senken, nimmt der Stoß ihr nur das Tempo in den Zahn hinein und gibt ihr keines
        // (ihr Ort von vorher rückt so weit mit): Ändert sich das Maß der Zähne, höbe der Boden sie sonst mit einem Ruck und würfe
        // sie durchs Maul (im Fenster gesehen). Am Boden und Gaumen selbst bleibt es wie bisher: Bewegt sich der Kiefer, nimmt er
        // sie mit Schwung mit.
        const gehoben = this.hoch[k]!;
        const unten = gehoben + d - hoehe;
        if (unten > 0) {
          // (der Teil, den der Boden selbst schiebt, und was vom Weg dieses Schritts nach oben zeigte)
          const boden = Math.max(0, d - hoehe);
          const a = (this.pos[i]! - vor[i]!) * nx + (this.pos[i + 1]! - vor[i + 1]!) * ny;
          const ohne = a + unten - Math.max(0, a + boden);
          this.pos[i]! += nx * unten;
          this.pos[i + 1]! += ny * unten;
          vor[i]! += nx * ohne;
          vor[i + 1]! += ny * ohne;
        } else {
          const decke = Math.min(this.raum[k]!, this.tief[k]!);
          const oben = hoehe - (decke - d);
          if (oben > 0 && decke - gehoben >= 2 * d) {
            const gaumen = Math.max(0, hoehe - (this.raum[k]! - d));
            const a = -((this.pos[i]! - vor[i]!) * nx + (this.pos[i + 1]! - vor[i + 1]!) * ny);
            const ohne = a + oben - Math.max(0, a + gaumen);
            this.pos[i]! -= nx * oben;
            this.pos[i + 1]! -= ny * oben;
            vor[i]! -= nx * ohne;
            vor[i + 1]! -= ny * ohne;
          }
        }
      }
      for (let i = 0; i < 3 * K; i++) {
        this.vel[i] = (this.pos[i]! - vor[i]!) / h;
        // (die Wurzel wird geführt, sie zählt nicht als eigene Bewegung)
        if (i >= 3 * WURZEL_KNOTEN && Math.abs(this.vel[i]!) > weg) {
          weg = Math.abs(this.vel[i]!);
          this.schnellster = Math.floor(i / 3);
        }
      }
    }
    this.tempo = weg;
    // (in Ruhe hält ihr Gewicht die Spitze ein Stück neben ihrem Platz: Ruhe heißt, dass sich nichts mehr bewegt)
    // (die Schwelle: sechs Tausendstel der Mundlänge je Sekunde. Liegt sie an Zähnen, kriecht sie noch mit rund vier Tausendsteln
    // nach, im Fenster gemessen; darunter soll Ozzy keine Bilder mehr rechnen)
    this.bewegt = weg > pl.lang * 0.006 || this.gegriffen >= 0;
    return this.bewegt;
  }
}

/** was das Netz von einer Zunge braucht: die Lagen ihrer Knoten, wo je Knoten oben ist, ihre Maße und wie dick sie sein darf */
export type ZungenLage = {
  pos: ArrayLike<number>;
  auf: ArrayLike<number>;
  platz: Pick<ZungenPlatz, 'breite' | 'dicke' | 'stueck' | 'rille' | 'gabel'>;
  dickeMass(k: number): number;
  /** so breit (halbe Breite) darf sie an einem Knoten höchstens sein (fehlt: frei) */
  breiteGrenze?(k: number): number;
};

/**
 * Die Zunge gerade gelegt, ohne Maul (für die Linse): ihre Knoten längs +x von der Wurzel bei null, oben ist +y. Dasselbe Netz
 * wie im Maul, in den Einheiten ihres Platzes.
 */
export function zungeGerade(platz: Pick<ZungenPlatz, 'breite' | 'dicke' | 'stueck' | 'rille' | 'gabel'>): HautNetz {
  const pos = new Float64Array(3 * K);
  const auf = new Float64Array(3 * K);
  let x = 0;
  for (let k = 0; k < K; k++) {
    pos[3 * k] = x;
    auf[3 * k + 1] = 1;
    x += platz.stueck[k] ?? 0;
  }
  return zungeNetz({ pos, auf, platz, dickeMass: () => 1 }, 1, { x: 0, y: 0 });
}

/**
 * Das Zeichen einer Vorlage für den Formenring der Linse: die Zunge von oben als Pfad, die Wurzel bei (0, 0), die Spitze nach
 * oben (−y); `mass`: so hoch ist eine Zunge der Länge 1.
 */
export function zungenUmriss(werte: { laenge: number; breite: number; spitz?: number; gabel?: number }, mass: number): string {
  const n = 18;
  const hoch = mass * werte.laenge;
  const breit = 0.4 * mass * werte.breite;
  const g = null1(werte.gabel);
  const links: string[] = [];
  const rechts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const w = breit * zungenProfil(werte, u).breit;
    const y = -hoch * u;
    links.push(`${(-w).toFixed(2)},${y.toFixed(2)}`);
    rechts.unshift(`${w.toFixed(2)},${y.toFixed(2)}`);
  }
  // gespalten: zwei Zinken vor dem Ende, dazwischen die Kerbe
  const w1 = breit * zungenProfil(werte, 1).breit;
  const zinken = g > 0.02 ? `L${(-1.1 * w1).toFixed(2)},${(-hoch - g * 0.24 * hoch).toFixed(2)}L0,${(-hoch + g * 0.2 * hoch).toFixed(2)}L${(1.1 * w1).toFixed(2)},${(-hoch - g * 0.24 * hoch).toFixed(2)}` : '';
  return `M${links.join('L')}${zinken}L${rechts.join('L')}Z`;
}

/**
 * Die Zunge als Netz für die Anzeige. `f`, `mitte`: Welt = Werk / f + mitte. `wuchs`: Anteil, zu dem sie schon herausgewachsen
 * ist (0 … 1). Das Netz hat immer dieselben Punkte und Dreiecke.
 */
export function zungeNetz(kette: ZungenLage, f: number, mitte: { x: number; y: number }, wuchs = 1): HautNetz {
  const pl = kette.platz;
  const N = K * M + 2;
  const I = 3 * (2 * (K - 1) * M + 2 * M);
  const netz: HautNetz = { pos: new Float32Array(3 * N), normal: new Float32Array(3 * N), index: new Uint32Array(I), hoehe: new Float32Array(N).fill(0.3), seite: new Float32Array(N), blatt: new Float32Array(2 * N), sicht: new Float32Array(N).fill(1), dehnung: new Float32Array(N).fill(1) };
  const w0 = Math.max(0, Math.min(1, wuchs));
  // (beim Herauswachsen: von der Wurzel aus, und so dick, wie sie schon lang ist)
  const p = new Float64Array(3 * K);
  for (let i = 0; i < 3 * K; i++) p[i] = kette.pos[i % 3]! + (kette.pos[i]! - kette.pos[i % 3]!) * w0;
  const setzen = (v: number, x: number, y: number, z: number): void => {
    netz.pos[3 * v] = x / f + mitte.x;
    netz.pos[3 * v + 1] = y / f + mitte.y;
    netz.pos[3 * v + 2] = z / f;
    netz.blatt[2 * v] = netz.pos[3 * v]!;
    netz.blatt[2 * v + 1] = netz.pos[3 * v + 1]!;
  };
  // Der Rahmen jedes Rings: längs die Richtung der Kette; quer am ersten Ring die Richtung aus der Mittelebene hinaus (z), von
  // Ring zu Ring mitgeführt (nur so weit gedreht, wie die Kette sich dreht). Je Ring neu aus z bestimmt, verdrehte sich das Band,
  // sobald die Zunge zur Seite zeigt (in ihrer Lage der Pose, abgelegt): im Fenster gesehen.
  let [qx, qy, qz] = [0, 0, 1];
  for (let k = 0; k < K; k++) {
    const a = Math.max(0, k - 1);
    const b = Math.min(K - 1, k + 1);
    let [tx, ty, tz] = [p[3 * b]! - p[3 * a]!, p[3 * b + 1]! - p[3 * a + 1]!, p[3 * b + 2]! - p[3 * a + 2]!];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    const qt = qx * tx + qy * ty + qz * tz;
    let [bx, by, bz] = [qx - qt * tx, qy - qt * ty, qz - qt * tz];
    let bl = Math.hypot(bx, by, bz);
    if (bl < 1e-6) {
      // (die Kette läuft genau längs der Richtung von eben: irgendeine Richtung quer zu ihr)
      const [hx, hy, hz] = Math.abs(ty) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const ht = hx * tx + hy * ty + hz * tz;
      [bx, by, bz] = [hx - ht * tx, hy - ht * ty, hz - ht * tz];
      bl = Math.hypot(bx, by, bz) || 1;
    }
    bx /= bl;
    by /= bl;
    bz /= bl;
    let [nx, ny, nz] = [ty * bz - tz * by, tz * bx - tx * bz, tx * by - ty * bx];
    // oben ist, wohin der Boden ins Maul zeigt (dort liegt die Rille): an der Wurzel festgelegt; mit „oben“ dreht auch „quer“, so
    // bleibt das Netz außen herum
    if (k === 0 && nx * kette.auf[0]! + ny * kette.auf[1]! < 0) {
      [nx, ny, nz] = [-nx, -ny, -nz];
      [bx, by, bz] = [-bx, -by, -bz];
    }
    [qx, qy, qz] = [bx, by, bz];
    // gedehnt wird die Zunge dünner (der Rauminhalt bleibt)
    let dehn = 1;
    if (k > 0 && k < K - 1) {
      const l1 = Math.hypot(kette.pos[3 * k]! - kette.pos[3 * k - 3]!, kette.pos[3 * k + 1]! - kette.pos[3 * k - 2]!, kette.pos[3 * k + 2]! - kette.pos[3 * k - 1]!);
      const l2 = Math.hypot(kette.pos[3 * k + 3]! - kette.pos[3 * k]!, kette.pos[3 * k + 4]! - kette.pos[3 * k + 1]!, kette.pos[3 * k + 5]! - kette.pos[3 * k + 2]!);
      dehn = (l1 + l2) / (pl.stueck[k - 1]! + pl.stueck[k]! || 1);
    }
    const q = (1 / Math.sqrt(Math.max(0.35, dehn))) * (0.2 + 0.8 * w0);
    // (zwischen Zähnen so breit wie der Gang, aber nie schmaler als knapp ihre halbe Breite; weich das kleinere von beiden, damit
    // ihr Umriss dort keine Ecke bekommt, wo der Gang enger wird als sie)
    const frei = pl.breite[k]! * q;
    const gang = Math.max(kette.breiteGrenze?.(k) ?? Infinity, SCHMAL_BIS * frei);
    const w = !(frei > 1e-12) ? 0 : Number.isFinite(gang) ? Math.pow(Math.pow(frei, -4) + Math.pow(Math.max(gang, 1e-9), -4), -0.25) : frei;
    const d = pl.dicke[k]! * q * kette.dickeMass(k);
    // gespalten: Die letzten drei Ringe stehen nicht mehr eben. Zwischen Mitte und Rand läuft jeder nach vorn aus (die Zinken), in
    // der Mitte bleibt er zurück (die Kerbe)
    const gabel = k >= K - 3 ? pl.gabel * GABEL_RINGE[k - (K - 3)]! * w0 : 0;
    for (let j = 0; j < M; j++) {
      const phi = (2 * Math.PI * j) / M;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      // oben in der Mitte eine flache Rille
      const rille = s > 0 ? 1 - pl.rille * Math.exp(-(c * c) / 0.07) : 1;
      // (ein Zinken: am höchsten bei gut der halben Breite, zum Rand und zur Mitte hin fällt er ab; die Kerbe: schmal um die Mitte)
      const zinke = Math.max(0, 1 - Math.pow((Math.abs(c) - 0.56) / 0.42, 2));
      const vor = gabel > 0 ? gabel * (zinke * Math.sqrt(zinke) - GABEL_KERBE * Math.exp(-(c * c) / 0.05)) : 0;
      setzen(k * M + j, p[3 * k]! + bx * c * w + nx * s * d * rille + tx * vor, p[3 * k + 1]! + by * c * w + ny * s * d * rille + ty * vor, p[3 * k + 2]! + bz * c * w + nz * s * d * rille + tz * vor);
    }
  }
  // die Spitze: ein Punkt ein Stück vor dem letzten Ring; die Wurzel: die Mitte des ersten
  const e = 3 * (K - 1);
  let [tx, ty, tz] = [p[e]! - p[e - 3]!, p[e + 1]! - p[e - 2]!, p[e + 2]! - p[e - 1]!];
  const tl = Math.hypot(tx, ty, tz) || 1;
  tx /= tl;
  ty /= tl;
  tz /= tl;
  // (an einer gespaltenen Zunge sitzt dieser Punkt in der Kerbe)
  const vorn = (pl.gabel > 0 ? -GABEL_KERBE * pl.gabel : 0.5 * pl.dicke[K - 2]!) * w0;
  const spitze = K * M;
  const wurzel = K * M + 1;
  setzen(spitze, p[e]! + tx * vorn, p[e + 1]! + ty * vorn, p[e + 2]! + tz * vorn);
  setzen(wurzel, p[0]!, p[1]!, p[2]!);
  let i = 0;
  for (let k = 0; k + 1 < K; k++) {
    for (let j = 0; j < M; j++) {
      const a = k * M + j;
      const b = k * M + ((j + 1) % M);
      netz.index[i++] = a;
      netz.index[i++] = b;
      netz.index[i++] = a + M;
      netz.index[i++] = b;
      netz.index[i++] = b + M;
      netz.index[i++] = a + M;
    }
  }
  for (let j = 0; j < M; j++) {
    netz.index[i++] = (K - 1) * M + j;
    netz.index[i++] = (K - 1) * M + ((j + 1) % M);
    netz.index[i++] = spitze;
    netz.index[i++] = (j + 1) % M;
    netz.index[i++] = j;
    netz.index[i++] = wurzel;
  }
  // Normalen: je Punkt die Summe der Flächennormalen seiner Dreiecke
  const nor = netz.normal;
  for (let t = 0; t < netz.index.length; t += 3) {
    const [a, b, c] = [3 * netz.index[t]!, 3 * netz.index[t + 1]!, 3 * netz.index[t + 2]!];
    const [ux, uy, uz] = [netz.pos[b]! - netz.pos[a]!, netz.pos[b + 1]! - netz.pos[a + 1]!, netz.pos[b + 2]! - netz.pos[a + 2]!];
    const [vx, vy, vz] = [netz.pos[c]! - netz.pos[a]!, netz.pos[c + 1]! - netz.pos[a + 1]!, netz.pos[c + 2]! - netz.pos[a + 2]!];
    const [x, y, z] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    for (const v of [a, b, c]) {
      nor[v]! += x;
      nor[v + 1]! += y;
      nor[v + 2]! += z;
    }
  }
  for (let v = 0; v < N; v++) {
    const l = Math.hypot(nor[3 * v]!, nor[3 * v + 1]!, nor[3 * v + 2]!) || 1;
    nor[3 * v]! /= l;
    nor[3 * v + 1]! /= l;
    nor[3 * v + 2]! /= l;
  }
  return netz;
}
