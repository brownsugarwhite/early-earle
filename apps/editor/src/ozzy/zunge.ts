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
import type { MaulZunge } from '../form/werk';
import type { HautNetz } from '../anfang/haut';
import type { MaulTasche } from './farbe/maulEbene';
import type { Karte } from './farbe/ort';

/** die Zunge, mit der ein Maul beginnt: bis kurz hinter die unteren Zähne, so breit, wie das Maul es zulässt, mit flacher Rille */
export const ZUNGE_ANFANG: MaulZunge = { laenge: 0.78, breite: 0.74, dicke: 0.075, rille: 0.3 };
/** die Farbe der Zunge, solange sie keine eigene trägt (wie in der Studie) */
export const ZUNGE_FARBE = '#e2607a';

/** Knoten der Kette und Punkte je Ring des Netzes */
export const ZUNGE_KNOTEN = 11;
const M = 14;
/** die Wurzel beginnt bei diesem Anteil der Mittellinie des Bodens (von der Rachenlinie aus) */
const WURZEL_BEI = 0.1;
/** die ersten Knoten sind die Wurzel: Sie sitzen fest am Kiefer */
const WURZEL_KNOTEN = 2;
/** der feste Zeitschritt der Kette (Sekunden) */
const ZUNGE_SCHRITT = 1 / 240;

type Platz = { a: number; b: number; u: number };

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
export function zungePlatz(k: Karte, tasche: MaulTasche & { kiefer: ArrayLike<number> }, werte: MaulZunge): ZungenPlatz | null {
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
  const bei = (reihe: number[], L: number[], s: number): Platz => {
    const ziel = Math.max(0, Math.min(L[L.length - 1]!, s));
    let j = 1;
    while (j < L.length - 1 && L[j]! < ziel) j++;
    return { a: reihe[j - 1]!, b: reihe[j]!, u: Math.max(0, Math.min(1, (ziel - L[j - 1]!) / (L[j]! - L[j - 1]! || 1))) };
  };
  const ort = (p: Platz): [number, number] => [P[3 * p.a]! + p.u * (P[3 * p.b]! - P[3 * p.a]!), P[3 * p.a + 1]! + p.u * (P[3 * p.b + 1]! - P[3 * p.a + 1]!)];
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
  // je Punkt der Mittellinie des Bodens ein Dreieck der Wand daran (für die Richtung vom Boden ins Maul)
  const tri = k.netz.tri;
  const wandBei = (p: Platz): [number, number, number] => {
    for (let t = 0; t < k.T; t++) {
      const e: [number, number, number] = [tri[3 * t]!, tri[3 * t + 1]!, tri[3 * t + 2]!];
      if (!e.includes(p.a) || !e.includes(p.b)) continue;
      const dritter = e.find((v) => v !== p.a && v !== p.b)!;
      if (tasche.innen[dritter] && tasche.kiefer[dritter] !== -1 && P[3 * dritter + 2]! > 0) return e;
    }
    return [p.a, p.b, p.a];
  };
  const bis = Math.max(WURZEL_BEI + 0.1, Math.min(1, werte.laenge));
  const plaetzeBoden: Platz[] = [];
  const plaetzeGaumen: Platz[] = [];
  const wand: [number, number, number][] = [];
  const breite = new Float64Array(K);
  const dicke = new Float64Array(K);
  const orte: [number, number][] = [];
  for (let i = 0; i < K; i++) {
    // (zur Spitze hin stehen die Knoten dichter: So wird sie rund statt abgeschnitten)
    const u = 1 - Math.pow(1 - i / (K - 1), 1.7);
    const s = lang * (WURZEL_BEI + (bis - WURZEL_BEI) * u);
    const p = bei(boden, LB, s);
    plaetzeBoden.push(p);
    plaetzeGaumen.push(bei(gaumen, LG, (s / lang) * LG[LG.length - 1]!));
    wand.push(wandBei(p));
    orte.push(ort(p));
    dicke[i] = Math.max(0, werte.dicke) * lang * (0.75 + 0.4 * Math.sin(Math.PI * Math.pow(u, 0.7))) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 6)));
    breite[i] = Math.min(Math.max(0, werte.breite) * breiteBei(s), 0.42 * lang) * (0.86 + 0.14 * Math.sin(Math.PI * u)) * Math.sqrt(Math.max(0, 1 - Math.pow(u, 5)));
  }
  const stueck = new Float64Array(K - 1);
  for (let i = 0; i + 1 < K; i++) stueck[i] = Math.hypot(orte[i + 1]![0] - orte[i]![0], orte[i + 1]![1] - orte[i]![1]);
  return { boden: plaetzeBoden, gaumen: plaetzeGaumen, wand, spitze: [boden[boden.length - 2]!, boden[boden.length - 1]!], breite, dicke, stueck, lang, rille: Math.max(0, Math.min(0.8, werte.rille)) };
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

  constructor(readonly platz: ZungenPlatz) {}

  get greift(): boolean {
    return this.gegriffen >= 0;
  }

  /** wie dick die Zunge an einem Knoten sein darf: Im fast geschlossenen Maul wird sie flach (1 = ihre ganze Dicke) */
  dickeMass(k: number): number {
    return Math.max(0.02, Math.min(1, this.raum[k]! / (2.6 * this.platz.dicke[k]! + 1e-9)));
  }

  /** die Plätze der Knoten an der Haut mit den Lagen `P` (wie sie gezeigt wird) */
  private zieleLesen(P: ArrayLike<number>): void {
    const pl = this.platz;
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
      this.raum[k] = spalt;
      this.boden[3 * k] = F[0];
      this.boden[3 * k + 1] = F[1];
      this.boden[3 * k + 2] = F[2];
      this.auf[3 * k] = nx;
      this.auf[3 * k + 1] = ny;
      this.auf[3 * k + 2] = 0;
      const h = 0.9 * pl.dicke[k]! * this.dickeMass(k);
      this.ziel[3 * k] = F[0] + nx * h;
      this.ziel[3 * k + 1] = F[1] + ny * h;
      this.ziel[3 * k + 2] = F[2];
    }
  }

  /** die Zunge an ihren Platz legen, ohne Bewegung (neu angelegt, oder die Form hat sich geändert, ohne dass sie nachschwingen soll) */
  setzen(P: ArrayLike<number>): void {
    this.zieleLesen(P);
    this.pos.set(this.ziel);
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
    for (let k = 0; k + 1 < K; k++) l += this.platz.stueck[k]!;
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
    // die Spitze der Lippe und die Richtung des Bodens dort: Davor hat die Zunge keinen Boden mehr
    const [sa, sb] = [3 * pl.spitze[0], 3 * pl.spitze[1]];
    let [tx, ty] = [P[sb]! - P[sa]!, P[sb + 1]! - P[sa + 1]!];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    let weg = 0;
    const vor = new Float64Array(3 * K);
    for (let n = 0; n < N; n++) {
      for (let k = 0; k < K; k++) {
        const u = k / (K - 1);
        // die Feder zum Platz auf dem Unterkiefer: hinten straff, vorn lose (die Spitze schwingt nach)
        const fed = OMEGA * OMEGA * (1.7 - 1.1 * u);
        const i = 3 * k;
        // hängt die Zunge über die Lippe hinaus, zieht sie ihr Gewicht nach unten
        const schwer = -pl.lang * 6 * u;
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
      // Gummi: Die Kette hält ihre Länge weich (gedehnt zieht sie stärker zurück als gestaucht)
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k + 1 < K; k++) {
          const a = 3 * k;
          const b = a + 3;
          const dx = this.pos[b]! - this.pos[a]!;
          const dy = this.pos[b + 1]! - this.pos[a + 1]!;
          const dz = this.pos[b + 2]! - this.pos[a + 2]!;
          const l = Math.hypot(dx, dy, dz) || 1e-9;
          const f = ((l - pl.stueck[k]!) / l) * (l > pl.stueck[k]! ? 0.16 : 0.4);
          const wa = k < WURZEL_KNOTEN || k === this.gegriffen ? 0 : 0.5;
          const wb = k + 1 < WURZEL_KNOTEN || k + 1 === this.gegriffen ? 0 : 0.5;
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
        if (k === this.gegriffen) continue;
        const i = 3 * k;
        if ((this.pos[i]! - P[sb]!) * tx + (this.pos[i + 1]! - P[sb + 1]!) * ty > 0) continue;
        const d = 0.8 * pl.dicke[k]! * this.dickeMass(k);
        const [nx, ny] = [this.auf[i]!, this.auf[i + 1]!];
        const hoehe = (this.pos[i]! - this.boden[i]!) * nx + (this.pos[i + 1]! - this.boden[i + 1]!) * ny;
        const unten = d - hoehe;
        if (unten > 0) {
          this.pos[i]! += nx * unten;
          this.pos[i + 1]! += ny * unten;
        } else {
          const oben = hoehe - (this.raum[k]! - d);
          if (oben > 0 && this.raum[k]! >= 2 * d) {
            this.pos[i]! -= nx * oben;
            this.pos[i + 1]! -= ny * oben;
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
    this.bewegt = weg > pl.lang * 0.004 || this.gegriffen >= 0;
    return this.bewegt;
  }
}

/**
 * Die Zunge als Netz für die Anzeige. `f`, `mitte`: Welt = Werk / f + mitte. `wuchs`: Anteil, zu dem sie schon herausgewachsen
 * ist (0 … 1). Das Netz hat immer dieselben Punkte und Dreiecke.
 */
export function zungeNetz(kette: ZungenKette, f: number, mitte: { x: number; y: number }, wuchs = 1): HautNetz {
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
  for (let k = 0; k < K; k++) {
    const a = Math.max(0, k - 1);
    const b = Math.min(K - 1, k + 1);
    let [tx, ty, tz] = [p[3 * b]! - p[3 * a]!, p[3 * b + 1]! - p[3 * a + 1]!, p[3 * b + 2]! - p[3 * a + 2]!];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    // quer: die Richtung der Mittelebene hinaus (z), quer zur Kette
    let [bx, by, bz] = [-tz * tx, -tz * ty, 1 - tz * tz];
    let bl = Math.hypot(bx, by, bz);
    if (bl < 1e-6) {
      [bx, by, bz] = [0, 1, 0];
      bl = 1;
    }
    bx /= bl;
    by /= bl;
    bz /= bl;
    let [nx, ny, nz] = [ty * bz - tz * by, tz * bx - tx * bz, tx * by - ty * bx];
    // oben ist, wohin der Boden ins Maul zeigt (dort liegt die Rille); mit „oben“ dreht auch „quer“, so bleibt das Netz außen herum
    if (nx * kette.auf[3 * k]! + ny * kette.auf[3 * k + 1]! < 0) {
      [nx, ny, nz] = [-nx, -ny, -nz];
      [bx, by, bz] = [-bx, -by, -bz];
    }
    // gedehnt wird die Zunge dünner (der Rauminhalt bleibt)
    let dehn = 1;
    if (k > 0 && k < K - 1) {
      const l1 = Math.hypot(kette.pos[3 * k]! - kette.pos[3 * k - 3]!, kette.pos[3 * k + 1]! - kette.pos[3 * k - 2]!, kette.pos[3 * k + 2]! - kette.pos[3 * k - 1]!);
      const l2 = Math.hypot(kette.pos[3 * k + 3]! - kette.pos[3 * k]!, kette.pos[3 * k + 4]! - kette.pos[3 * k + 1]!, kette.pos[3 * k + 5]! - kette.pos[3 * k + 2]!);
      dehn = (l1 + l2) / (pl.stueck[k - 1]! + pl.stueck[k]! || 1);
    }
    const q = (1 / Math.sqrt(Math.max(0.35, dehn))) * (0.2 + 0.8 * w0);
    const w = pl.breite[k]! * q;
    const d = pl.dicke[k]! * q * kette.dickeMass(k);
    for (let j = 0; j < M; j++) {
      const phi = (2 * Math.PI * j) / M;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      // oben in der Mitte eine flache Rille
      const rille = s > 0 ? 1 - pl.rille * Math.exp(-(c * c) / 0.07) : 1;
      setzen(k * M + j, p[3 * k]! + bx * c * w + nx * s * d * rille, p[3 * k + 1]! + by * c * w + ny * s * d * rille, p[3 * k + 2]! + bz * c * w + nz * s * d * rille);
    }
  }
  // die Spitze: ein Punkt ein Stück vor dem letzten Ring; die Wurzel: die Mitte des ersten
  const e = 3 * (K - 1);
  let [tx, ty, tz] = [p[e]! - p[e - 3]!, p[e + 1]! - p[e - 2]!, p[e + 2]! - p[e - 1]!];
  const tl = Math.hypot(tx, ty, tz) || 1;
  tx /= tl;
  ty /= tl;
  tz /= tl;
  const vorn = 0.5 * pl.dicke[K - 2]! * w0;
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
