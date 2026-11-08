// Form zuerst (06.11.2026), Beweis B (Florian: „Haut im Einflussbereich bei jedem Zug neu aus den Kurven rechnen (wie FiberMesh,
// gleichmäßiges Netz)“). Der Löser `HautZiele` behält beim Ziehen die Krümmung jedes Punkts, so weit die Loops sie nicht vorgeben
// (Gedächtnis). Vermutet war: Deshalb erzeugt Härte keinen Knick, wirkt nachträglich nicht, und eine gelöschte Linie hinterlässt
// ihre Form. Hier ist die Haut im Bereich die Fläche, die aus den Kurven folgt (FiberMesh, Nealen u. a. 2007, Abschnitt 3.2), in
// Runden, bis sie steht:
// 1. Krümmung c je Punkt (Normalanteil des Laplace durch das Kantenquadrat; auf einer Kugel 1/(2R)) harmonisch verteilt aus den Punkten
//    der Loops (dort gemessen, wie die Haut jetzt ist) und aus dem Rand des Bereichs (die Haut, die stehen bleibt, wie sie beim
//    Anfassen war). Ein Loop gibt so viel weiter, wie er weich ist (1 − Härte/3): Über einen harten fließt nichts, jede Seite rundet
//    sich für sich (scharf: nur die Lage ist fest, C0). Ein Punkt mit Ecke gibt nichts weiter (sein Knick ist keine Rundung).
// 2. Lagen: Laplace = sein Anteil in der Fläche, wie er jetzt ist, + Kantenquadrat · c · Normale; die Loops als Bindungen.
// Die Verteilung der Punkte in der Fläche bleibt, wie sie ist: Nur in Normalenrichtung (wie FiberMesh auf seinem gleichmäßigen Netz)
// ließ auf dem Netz aus Surface Nets die Kugel zusammenfallen (gemessen am 05.11.: Radius 52–157). Gleichmäßig hält das Netz das
// Verdichten nach jedem Zug.
//
// Ergebnis (Prüffälle `kurvenFaelle.ts`, Test `ausKurven.test.ts`, Bilder `docs/progress/editor/form-b-*-2026-11-06.jpg`): Die
// Vermutung stimmt nicht. Eine Kante entsteht, wo die Linien quer über die harte Linie knicken, mit beiden Lösern gleich (Pilz mit
// geknickten Querlinien: Knick 77° mit Gedächtnis, 78° hier, Soll ≈ 78°; Linse 64° bzw. 70°, Soll ≈ 67°). Knicken sie nicht (heute
// knickt eine Ecke von selbst nur die Verschiebung, nicht die Linie), entsteht mit keinem eine Kante (Pilz 10° bzw. 25°, hier mit 34
// umgeklappten Dreiecken). Nachträglich gesetzte Härte und gelöschte Linien wirken mit beiden erst, wenn neu gerechnet wird; eine
// gelöschte Form verschwindet hier ganz (Beule 24 → 0,7), mit Gedächtnis bleibt ein Rest (→ 7). Im Fenster (Bereiche, Stufen,
// Verdichten) besser am Überhang (Knicke über 60° / umgeklappt 28/10 → 4/0) und je Mausbewegung schneller, schlechter, wo wenige
// Linien ein Feld spannen: Unter dem Rand eines Pilzes hängen zwischen den Querlinien Lappen (12 umgeklappt; die Krümmung zwischen
// weit entfernten Linien ist die, die die Linien an sich messen, und das ist die alte), langer Hammer 7/0 → 18/6. Deshalb bleibt
// `HautZiele` der Löser des Fensters; dieser liegt als Vergleich bereit (`LoopZug` mit Art `kurven`, im Fenster `?haut=kurven`).
// Nachtrag (06.11. abends): Die Lappen und der Hammer kamen vom Bereich des Zugs, nicht von diesem Löser. Sein Rand gab die Haut, die
// stehen bleibt, mit ihrer alten Wölbung als Krümmung ins Feld. Über die ganze Haut gelöst (wie FiberMesh; im Fenster jetzt immer
// mit `?haut=kurven`): Pilz mit geknickten Linien sauber (0 umgeklappt), Pilz wie bei Florian mit Kante am harten Rand (34°, heute
// 3°), Überhang 28/10 → 6/0, langer Hammer 7/0 → 0/0, Rüssel 13/0 → 14/0, Boden 0,14 → 0,11; je Mausbewegung 11–23 ms, Zerlegen beim
// Greifen 0,1–0,35 s bei 4 000–7 000 Punkten (wächst mit der Punktzahl).
// Gemessen und verworfen: die Krümmung aus den Kurven, die Verteilung wie beim Anlegen (wie `HautZiele`): Die Haut verknittert
// (Linse und Pilz voller Beulen), weil die gemessene Krümmung an den Loops und die alte Verteilung nicht zueinander passen.
//
// 08.11.2026, Beweis „Form unabhängig vom Netz“ (Florian: „Form unabhängig vom Netz, Kriterien Sprung beim Loslassen höchstens ein
// halber Bildpunkt, je Mausbewegung höchstens 16 ms“): Mit gleichen Gewichten hängt die Form am Netz. Gemessen wird die Krümmung als
// Mittel der Normalkrümmung über die Kantenrichtungen, gewichtet mit der Kantenlänge², und verteilt wird sie nach der Zahl der
// Nachbarn. Auf einem gestreckten Netz (Zug) sieht das Mittel vor allem die langen Kanten. Derselbe Hals auf dem Netz beim Loslassen
// und auf dem verdichteten Netz: bis 6,4 Einheiten anders, Startnetz 12 000 gegen 24 000 Dreiecke 3,6. `geometrie`: Die Krümmung wird
// nach der Geometrie gemessen und verteilt (Laplace–Beltrami, Kotangens auf der intrinsischen Delaunay-Triangulierung, `intrinsisch.ts`;
// dort gibt sie jede Richtung gleich wieder). Die Matrix und die Verteilung der Punkte bleiben die mit gleichen Gewichten (einmal
// zerlegt, hält die Dreiecke gut). Gelöst wird der Unterschied zwischen Soll und gemessener Krümmung, gedämpft; am Ziel stimmt die
// Krümmung nach der Geometrie. Hals: 6,4 → 0,37 (99 % 0,17), zwei feine Netze 0,5. Verworfen (gemessen): Kotangens mit geklemmten
// negativen Gewichten (Hals 3,3, Dreiecke verfallen beim Zug: 14 % statt 5 % stumpfe Kanten); nur messen, gleich verteilen (2,8);
// die Korrektur erst in Normalenrichtung mit dem Operator nach der Geometrie (explodiert auch am Hals).

import type { NormalSystem, NormalZeile } from '../loeser/normalSystem';
import { normalSystemZerlegt } from '../loeser/zerlegung';
import { type IntrinsischeGewichte, intrinsischeGewichte } from './intrinsisch';
import type { KruemmungsKetten } from './kruemmung';
import { type Bindungen, type Haut, type Vermessung, gewichteAus, laengenGewichte, vermessen } from './kurven';

/**
 * Wie die Krümmung gemessen und verteilt wird: `gleich` (Mittel der Nachbarn, bis 08.11.) oder `geometrie` (Laplace–Beltrami auf der
 * intrinsischen Delaunay-Triangulierung; Form unabhängig vom Netz)
 */
export type HautGewichte = 'gleich' | 'geometrie';

/**
 * Eine fertige Zerlegung für einen Löser nach der Geometrie auf diesem Netz (Gewichte der Matrix, Lagen, Vorkonditionierer). Die Matrix
 * bestimmt dort nur, wie schnell der Löser ankommt, nicht wohin; sie darf deshalb von einer früheren Lage stammen (08.11., Verfeinern im
 * Zug: weiterziehen ohne neu zu zerlegen, eine im Hintergrund gerechnete Zerlegung einwechseln).
 */
export type HautVorlage = { gew: Float64Array[]; sys: NormalSystem; cVor: NormalSystem | null };
/** Was ein Löser zerlegen würde: die Gewichte der Matrix und die Systeme (Lagen, Vorkonditionierer) */
export type HautAuftrag = { gew: Float64Array[]; systeme: { n: number; zeilen: NormalZeile[]; daempfung: number }[] };
/** `vorlage`: diese Zerlegung übernehmen; `nurZeilen`: nichts zerlegen, nur `auftrag` füllen (der Löser rechnet dann nicht). Nur nach der Geometrie. */
export type HautOptionen = { vorlage?: HautVorlage; nurZeilen?: boolean };

/** Gewicht, mit dem die Krümmung eines Punkts bei ihrem jetzigen Wert bleibt, wo keine Kurve hinreicht (hält das System lösbar) */
const HALT = 1e-6;
/**
 * Anteil der Korrektur je Runde (`geometrie`), höchstens. Gelöst wird mit der Matrix der gleichen Gewichte; auf gestreckten Dreiecken
 * antwortet die Krümmung nach der Geometrie stärker, als diese Matrix annimmt: Ungedämpft schwang der Hals (das Vorzeichen kippte jede
 * Runde), mit 0,6 für alle Punkte noch der Rüssel, und beim Ziehen hinkte die Haut nach (Ohr: nach dem Zug noch 3,4 Einheiten). Jetzt
 * wird die Korrektur eines Punkts halbiert, wenn sie das Vorzeichen wechselt, sonst wieder angehoben bis zum vollen Schritt.
 */
let DAEMPFUNG = 1;
/** nur für Messreihen: Dämpfung (Obergrenze je Punkt) setzen */
export function daempfungSetzen(b: number): void {
  DAEMPFUNG = b;
}
/** Genauigkeit der verteilten Krümmung je Runde (Rest gegen die rechte Seite); die Runden rechnen sie weiter */
const PCG_GENAU = 1e-3;

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/**
 * Löser der Haut aus den Kurven: einmal zerlegt (Lagen und Krümmung; nur die Punkte im Bereich sind Unbekannte), je Schritt Runden
 * aus Messen, Verteilen der Krümmung und Lösen der Lagen. Gleiche Bindungen und Kantengewichte wie `HautZiele`.
 */
export class HautAusKurven {
  private readonly sys: NormalSystem | null;
  /** Unbekannte → Punkt der Haut */
  private readonly frei: Int32Array;
  /** Punkt der Haut → Unbekannte (−1: bleibt) */
  private readonly nr: Int32Array;
  /** Punkte, deren Laplace-Zeile eine Unbekannte enthält */
  private readonly zeilen: Int32Array;
  /** Bindungen mit einer Unbekannten, ihr Punkt der Haut und ihr Ziel beim Anlegen */
  private readonly js: Int32Array;
  private readonly haut0: Float64Array;
  private readonly ziel0: Float64Array;
  /** Gewichte je Punkt und Nachbar (normiert; über harte Linien kleiner) */
  private readonly gew: Float64Array[];
  /** je Punkt: wie stark er seine Krümmung weitergibt (−1: keine Quelle; Loops 1 − Härte/3, Rand des Bereichs 1) */
  private readonly quelle: Float64Array;
  /** Unbekannte der Krümmung: freie Punkte, die keine Quelle sind */
  private readonly cFrei: Int32Array;
  private readonly cNr: Int32Array;
  /** Diagonale je Zeile der Krümmung (1 weniger das Gewicht, das über Quellen nicht weitergegeben wird) */
  private readonly cDiag: Float64Array;
  private readonly sysC: NormalSystem | null;
  readonly zeitZerlegen: number;
  /** Haut beim Anlegen, vermessen (Krümmung für den Rand des Bereichs) */
  private readonly ruhe: Vermessung;
  /** Krümmung je Punkt im letzten Schritt (zum Messen) */
  letzteKruemmung: Float64Array | null = null;
  private readonly art: HautGewichte;
  /** Kanten harter Linien (längs): werden in der intrinsischen Triangulierung nie geklappt */
  private readonly fest: ((a: number, b: number) => boolean) | null;
  private readonly merken: boolean;
  /** `geometrie`: Vorkonditionierer der Krümmung (Laplace des Netzes), Lösung der letzten Runde, Dämpfung je Punkt */
  private cVor: NormalSystem | null = null;
  /** mit `nurZeilen`: was zu zerlegen wäre */
  auftrag: HautAuftrag | null = null;
  private cWarm: Float64Array | null = null;
  private beta: Float64Array | null = null;
  private dVorher: Float64Array | null = null;

  /** Zeiten je Teil einer Runde, aufsummiert (zum Messen) */
  readonly zeiten = { runden: 0, vermessen: 0, intrinsisch: 0, kruemmung: 0, schritte: 0, loesen: 0 };

  constructor(
    private readonly h: Haut,
    private readonly bind: Bindungen,
    ziele0: Float64Array,
    /** 1 = darf sich bewegen; fehlt: die ganze Haut */
    bereich: Uint8Array | null = null,
    private readonly gewicht = 100,
    /** Gewicht je Kante über eine harte Linie (Schlüssel `kantenSchluessel`); fehlt: 1 */
    kanten: ReadonlyMap<number, number> | null = null,
    /** Ketten der Loops: welche Bindungen Punkte eines eingesetzten Loops sind und wie hart er dort ist */
    ketten: KruemmungsKetten | null = null,
    gewichte: HautGewichte = 'gleich',
    opt: HautOptionen = {},
  ) {
    const n = h.n;
    const P = h.pos;
    const nr = new Int32Array(n).fill(-1);
    const frei: number[] = [];
    for (let v = 0; v < n; v++) {
      if (bereich && !bereich[v]) continue;
      nr[v] = frei.length;
      frei.push(v);
    }
    this.nr = nr;
    this.frei = Int32Array.from(frei);
    this.art = gewichte;
    // nach der Geometrie gewichtet die Matrix nach 1 / Kantenlänge² der Lage beim Anlegen: Auf gestreckten Dreiecken antwortet sie
    // dann in jeder Richtung wie die Krümmung nach der Geometrie (mit gleichen Gewichten längs der Streckung zu schwach: Das Ohr hinkte
    // im Zug 0,75 statt 0,23 nach, der Rüssel auf dem Netz vom Greifen lag 9,2 statt 1,6 neben dem feinen). Am Ziel ändert das nichts.
    const geo = gewichte === 'geometrie';
    this.gew = geo ? (opt.vorlage?.gew ?? laengenGewichte(h, kanten)) : gewichteAus(h, kanten);
    // Punkte harter Linien: Ihr Gewicht über die Linie ist 0; ihre Kanten längs der Linie bleiben in der intrinsischen Triangulierung
    const linie = new Set<number>();
    if (kanten) for (const [k, w] of kanten) if (w === 0) linie.add(Math.floor(k / n));
    this.fest = linie.size
      ? (a, b) => linie.has(a) && linie.has(b) && (kanten!.get(a * n + b) ?? 1) > 0 && (kanten!.get(b * n + a) ?? 1) > 0
      : null;
    // Lagen: Laplace-Zeilen und Bindungen (wie HautZiele)
    const zeilen: NormalZeile[] = [];
    const lapZeilen: number[] = [];
    for (let i = 0; i < n; i++) {
      const nb = h.nachbarn[i]!;
      const g = this.gew[i]!;
      const index: number[] = [];
      const wert: number[] = [];
      if (nr[i]! >= 0) {
        index.push(nr[i]!);
        wert.push(1);
      }
      nb.forEach((j, k) => {
        if (nr[j]! < 0 || g[k] === 0) return;
        index.push(nr[j]!);
        wert.push(-g[k]!);
      });
      if (index.length === 0) continue;
      lapZeilen.push(i);
      zeilen.push({ index, wert, gewicht: 1 });
    }
    this.zeilen = Int32Array.from(lapZeilen);
    const js: number[] = [];
    const m = bind.ecken.length / 3;
    for (let j = 0; j < m; j++) {
      const index: number[] = [];
      const wert: number[] = [];
      for (let e = 0; e < 3; e++) {
        const v = bind.ecken[3 * j + e]!;
        if (nr[v]! < 0 || bind.b[3 * j + e] === 0) continue;
        index.push(nr[v]!);
        wert.push(bind.b[3 * j + e]!);
      }
      if (index.length === 0) continue;
      js.push(j);
      zeilen.push({ index, wert, gewicht });
    }
    this.js = Int32Array.from(js);
    this.haut0 = new Float64Array(3 * js.length);
    this.ziel0 = new Float64Array(3 * js.length);
    js.forEach((j, u) => {
      for (let c = 0; c < 3; c++) this.ziel0[3 * u + c] = ziele0[3 * j + c]!;
      for (let e = 0; e < 3; e++) {
        const v = bind.ecken[3 * j + e]!;
        for (let c = 0; c < 3; c++) this.haut0[3 * u + c] = this.haut0[3 * u + c]! + bind.b[3 * j + e]! * P[3 * v + c]!;
      }
    });
    const t0 = Date.now();
    // über die ganze Haut hängt die Matrix nur am Netz, an den Gewichten und an den Bindungen: gemerkt, damit das nächste Greifen sie
    // nicht noch einmal zerlegt (das Fenster rechnet sie nach jeder Änderung schon vor)
    const merken = bereich === null;
    this.merken = merken;
    if (geo && opt.nurZeilen) this.auftrag = { gew: this.gew, systeme: [{ n: frei.length, zeilen, daempfung: 1e-9 }] };
    this.sys = geo && opt.vorlage ? opt.vorlage.sys : geo && opt.nurZeilen ? null : normalSystemZerlegt(frei.length, zeilen, 1e-9, merken);
    const ruhe = vermessen(h, this.gew);
    // Quellen der Krümmung: Punkte eingesetzter Loops (so weich, wie der Loop dort ist; an einer Kreuzung der härteste; an einer Ecke
    // nichts), die Haut, die stehen bleibt (ganz)
    const quelle = new Float64Array(n).fill(-1);
    if (ketten)
      for (let j = 0; j < m; j++) {
        const v = bind.ecken[3 * j]!;
        if (bind.ecken[3 * j + 1] !== v || bind.ecken[3 * j + 2] !== v || !ketten.kette[j]) continue;
        const w = ketten.ecke[j] || ketten.kante[j] ? 0 : 1;
        quelle[v] = quelle[v]! < 0 ? w : Math.min(quelle[v]!, w);
      }
    for (let v = 0; v < n; v++) if (nr[v]! < 0 && quelle[v]! < 0) quelle[v] = 1;
    this.quelle = quelle;
    const cNr = new Int32Array(n).fill(-1);
    const cFrei: number[] = [];
    for (const v of frei) {
      if (quelle[v]! >= 0) continue;
      cNr[v] = cFrei.length;
      cFrei.push(v);
    }
    this.cNr = cNr;
    this.cFrei = Int32Array.from(cFrei);
    if (gewichte === 'geometrie') {
      // Krümmung beim Anlegen nach der Geometrie (für den Rand des Bereichs), der Vorkonditionierer gleich mit zerlegt (über die ganze
      // Haut gemerkt wie die anderen Systeme; das Fenster rechnet ihn in der Ruhe vor)
      this.ruhe = { ...ruhe, ...this.messenIntrinsisch(intrinsischeGewichte(h, this.fest), ruhe.nor) };
      this.cDiag = new Float64Array(0);
      this.sysC = null;
      if (opt.nurZeilen && this.cFrei.length) this.auftrag!.systeme.push({ n: this.cFrei.length, zeilen: this.vorkonditioniererZeilen(), daempfung: 1e-12 });
      this.cVor = opt.vorlage ? opt.vorlage.cVor : opt.nurZeilen ? null : this.vorkonditionierer();
      this.zeitZerlegen = Date.now() - t0;
      return;
    }
    this.ruhe = ruhe;
    this.cDiag = Float64Array.from(cFrei, (v) => {
      const g = this.gew[v]!;
      let d = 1;
      h.nachbarn[v]!.forEach((w, k) => {
        const q = quelle[w]!;
        if (q >= 0) d -= g[k]! * (1 - q);
      });
      return d;
    });
    const zc: NormalZeile[] = [];
    cFrei.forEach((v, u) => {
      const g = this.gew[v]!;
      const index: number[] = [u];
      const wert: number[] = [this.cDiag[u]!];
      h.nachbarn[v]!.forEach((w, k) => {
        if (cNr[w]! < 0 || g[k] === 0) return;
        index.push(cNr[w]!);
        wert.push(-g[k]!);
      });
      zc.push({ index, wert, gewicht: 1 });
      zc.push({ index: [u], wert: [1], gewicht: HALT });
    });
    this.sysC = cFrei.length ? normalSystemZerlegt(cFrei.length, zc, 1e-12, merken) : null;
    this.zeitZerlegen = Date.now() - t0;
  }

  get anzahl(): number {
    return this.frei.length;
  }

  /**
   * Krümmung je Punkt: an den Punkten im Bereich, die auf keinem Loop liegen, harmonisch aus den Quellen (Loops wie jetzt gemessen,
   * `kap`; der Rand des Bereichs wie beim Anlegen); an Punkten eines Loops ihr eigener Wert, außerhalb des Bereichs der beim Anlegen.
   */
  private kruemmung(kap: Float64Array): Float64Array {
    const h = this.h;
    const c = Float64Array.from(kap);
    for (let v = 0; v < h.n; v++) if (this.nr[v]! < 0) c[v] = this.ruhe.kap[v]!;
    const nc = this.cFrei.length;
    if (!this.sysC || nc === 0) return c;
    const b = new Float64Array(nc);
    for (let u = 0; u < nc; u++) {
      const i = this.cFrei[u]!;
      const g = this.gew[i]!;
      const nb = h.nachbarn[i]!;
      for (let k = 0; k < nb.length; k++) {
        const w = nb[k]!;
        const q = this.quelle[w]!;
        if (q > 0) b[u] = b[u]! + g[k]! * q * c[w]!;
      }
    }
    const rhs = new Float64Array(nc);
    for (let u = 0; u < nc; u++) {
      const i = this.cFrei[u]!;
      const g = this.gew[i]!;
      rhs[u] = rhs[u]! + HALT * kap[i]! + this.cDiag[u]! * b[u]!;
      const nb = h.nachbarn[i]!;
      for (let k = 0; k < nb.length; k++) {
        const q = this.cNr[nb[k]!]!;
        if (q < 0 || g[k] === 0) continue;
        rhs[q] = rhs[q]! - g[k]! * b[u]!;
      }
    }
    const x = this.sysC.loesenSpalte(rhs);
    for (let u = 0; u < nc; u++) c[this.cFrei[u]!] = x[u]!;
    return c;
  }

  /** die fertige Zerlegung dieses Lösers (für einen nächsten auf demselben Netz) */
  get vorlage(): HautVorlage | null {
    return this.sys ? { gew: this.gew, sys: this.sys, cVor: this.cVor } : null;
  }

  /** Vorkonditionierer der Krümmung: der Laplace des Netzes (Gewicht 1 je Kante, Quellen wie `kruemmung`), einmal zerlegt */
  private vorkonditionierer(): NormalSystem | null {
    const nc = this.cFrei.length;
    if (nc === 0) return null;
    return normalSystemZerlegt(nc, this.vorkonditioniererZeilen(), 1e-12, this.merken);
  }

  private vorkonditioniererZeilen(): NormalZeile[] {
    const zeilen: NormalZeile[] = [];
    this.cFrei.forEach((v, u) => {
      const nb = this.h.nachbarn[v]!;
      for (const j of nb) {
        const q = this.quelle[j]!;
        if (q > 0) zeilen.push({ index: [u], wert: [1], gewicht: q });
        else if (q < 0 && this.cNr[j]! > u) zeilen.push({ index: [u, this.cNr[j]!], wert: [1, -1], gewicht: 1 });
      }
      zeilen.push({ index: [u], wert: [1], gewicht: HALT * nb.length });
    });
    return zeilen;
  }

  /** Krümmung je Punkt auf der intrinsischen Delaunay-Triangulierung (wie `vermessen`: Normalanteil durch das mittlere Kantenquadrat) */
  private messenIntrinsisch(ig: IntrinsischeGewichte, nor: Float64Array): { kap: Float64Array; kante2: Float64Array } {
    const h = this.h;
    const P = h.pos;
    const kap = new Float64Array(h.n);
    const kante2 = new Float64Array(h.n).fill(1e-9);
    for (let v = 0; v < h.n; v++) {
      let s = 0;
      let mx = 0;
      let my = 0;
      let mz = 0;
      let e2 = 0;
      for (let k = ig.start[v]!; k < ig.start[v + 1]!; k++) {
        const j = ig.nb[k]!;
        const w = ig.w[k]!;
        s += w;
        mx += w * (P[3 * v]! - P[3 * j]!);
        my += w * (P[3 * v + 1]! - P[3 * j + 1]!);
        mz += w * (P[3 * v + 2]! - P[3 * j + 2]!);
        e2 += w * ig.l2[k]!;
      }
      if (!(s > 1e-12)) continue;
      kante2[v] = Math.max(e2 / s, 1e-9);
      kap[v] = (mx * nor[3 * v]! + my * nor[3 * v + 1]! + mz * nor[3 * v + 2]!) / s / kante2[v]!;
    }
    return { kap, kante2 };
  }

  /**
   * Krümmung harmonisch verteilt mit den intrinsischen Gewichten (Quellen wie `kruemmung`): konjugierte Gradienten auf dem
   * symmetrischen Laplace der intrinsischen Triangulierung, vorkonditioniert mit dem einmal zerlegten Laplace des Netzes, gestartet bei
   * der Lösung der letzten Runde (die Gewichte ändern sich mit der Lage; eine Zerlegung je Runde kostete 60 ms).
   */
  private kruemmungIntrinsisch(kap: Float64Array, ig: IntrinsischeGewichte): Float64Array {
    const h = this.h;
    const c = Float64Array.from(kap);
    for (let v = 0; v < h.n; v++) if (this.nr[v]! < 0) c[v] = this.ruhe.kap[v]!;
    const nc = this.cFrei.length;
    const M = this.cVor;
    if (nc === 0 || !M) return c;
    const { start, nb, w } = ig;
    const diag = new Float64Array(nc);
    const b = new Float64Array(nc);
    for (let u = 0; u < nc; u++) {
      const v = this.cFrei[u]!;
      let s = 0;
      for (let k = start[v]!; k < start[v + 1]!; k++) {
        const j = nb[k]!;
        const g = w[k]!;
        s += g;
        const q = this.quelle[j]!;
        if (q >= 0) {
          diag[u] = diag[u]! + g * q;
          b[u] = b[u]! + g * q * c[j]!;
        } else diag[u] = diag[u]! + g;
      }
      diag[u] = diag[u]! + HALT * s;
      b[u] = b[u]! + HALT * s * kap[v]!;
    }
    const mal = (x: Float64Array, y: Float64Array) => {
      for (let u = 0; u < nc; u++) {
        const v = this.cFrei[u]!;
        let t = diag[u]! * x[u]!;
        for (let k = start[v]!; k < start[v + 1]!; k++) {
          const q = this.cNr[nb[k]!]!;
          if (q >= 0) t -= w[k]! * x[q]!;
        }
        y[u] = t;
      }
    };
    const x = this.cWarm && this.cWarm.length === nc ? Float64Array.from(this.cWarm) : Float64Array.from(this.cFrei, (v) => kap[v]!);
    const r = new Float64Array(nc);
    const Ap = new Float64Array(nc);
    mal(x, Ap);
    let bb = 0;
    for (let u = 0; u < nc; u++) {
      r[u] = b[u]! - Ap[u]!;
      bb += b[u]! * b[u]!;
    }
    const grenze = PCG_GENAU * PCG_GENAU * bb;
    let z = M.loesenSpalte(r);
    const p = Float64Array.from(z);
    let rz = 0;
    for (let u = 0; u < nc; u++) rz += r[u]! * z[u]!;
    let it = 0;
    for (; it < 60; it++) {
      let rr = 0;
      for (let u = 0; u < nc; u++) rr += r[u]! * r[u]!;
      if (rr <= grenze) break;
      mal(p, Ap);
      let pAp = 0;
      for (let u = 0; u < nc; u++) pAp += p[u]! * Ap[u]!;
      if (!(pAp > 0)) break;
      const a = rz / pAp;
      for (let u = 0; u < nc; u++) {
        x[u] = x[u]! + a * p[u]!;
        r[u] = r[u]! - a * Ap[u]!;
      }
      z = M.loesenSpalte(r);
      let rz2 = 0;
      for (let u = 0; u < nc; u++) rz2 += r[u]! * z[u]!;
      const beta = rz2 / rz;
      rz = rz2;
      for (let u = 0; u < nc; u++) p[u] = z[u]! + beta * p[u]!;
    }
    this.zeiten.schritte += it;
    this.cWarm = x;
    for (let u = 0; u < nc; u++) c[this.cFrei[u]!] = x[u]!;
    return c;
  }

  /** `iterationen` Runden zu den Zielen `ziele` (3 je Bindung) */
  schritt(ziele: Float64Array, iterationen = 2): void {
    const h = this.h;
    const P = h.pos;
    const nr = this.nr;
    const nf = this.frei.length;
    for (let it = 0; it < iterationen; it++) {
      const t0 = jetzt();
      const m = vermessen(h, this.gew);
      const t1 = jetzt();
      // nach der Geometrie: gemessen und verteilt auf der intrinsischen Triangulierung der Lage, wie sie jetzt ist
      let geo: { kap: Float64Array; kante2: Float64Array } | null = null;
      let c: Float64Array;
      if (this.art === 'geometrie') {
        const ig = intrinsischeGewichte(h, this.fest);
        geo = this.messenIntrinsisch(ig, m.nor);
        const t2 = jetzt();
        c = this.kruemmungIntrinsisch(geo.kap, ig);
        this.zeiten.intrinsisch += t2 - t1;
        this.zeiten.kruemmung += jetzt() - t2;
        if (!this.beta) {
          this.beta = new Float64Array(h.n).fill(DAEMPFUNG);
          this.dVorher = new Float64Array(h.n);
        }
      } else c = this.kruemmung(m.kap);
      this.zeiten.vermessen += t1 - t0;
      this.letzteKruemmung = c;
      const rhs = new Float64Array(3 * nf);
      for (const i of this.zeilen) {
        const nb = h.nachbarn[i]!;
        const g = this.gew[i]!;
        let k = m.kante2[i]! * c[i]!;
        if (geo) {
          // der Unterschied zwischen Soll und gemessener Krümmung (nach der Geometrie), gedämpft; wechselt er das Vorzeichen, schwingt
          // der Punkt: dort halbiert, sonst wieder hinauf
          const d = geo.kante2[i]! * (c[i]! - geo.kap[i]!);
          const b = d * this.dVorher![i]! < 0 ? Math.max(0.02, 0.5 * this.beta![i]!) : Math.min(DAEMPFUNG, 1.25 * this.beta![i]!);
          this.beta![i] = b;
          this.dVorher![i] = d;
          k = m.kante2[i]! * m.kap[i]! + b * d;
        }
        let dx = m.tang[3 * i]! + k * m.nor[3 * i]!;
        let dy = m.tang[3 * i + 1]! + k * m.nor[3 * i + 1]!;
        let dz = m.tang[3 * i + 2]! + k * m.nor[3 * i + 2]!;
        // was fest bleibt, auf die rechte Seite
        if (nr[i]! < 0) {
          dx -= P[3 * i]!;
          dy -= P[3 * i + 1]!;
          dz -= P[3 * i + 2]!;
        }
        nb.forEach((j, kk) => {
          if (nr[j]! >= 0) return;
          dx += g[kk]! * P[3 * j]!;
          dy += g[kk]! * P[3 * j + 1]!;
          dz += g[kk]! * P[3 * j + 2]!;
        });
        const u = nr[i]!;
        if (u >= 0) {
          rhs[3 * u] = rhs[3 * u]! + dx;
          rhs[3 * u + 1] = rhs[3 * u + 1]! + dy;
          rhs[3 * u + 2] = rhs[3 * u + 2]! + dz;
        }
        nb.forEach((j, kk) => {
          const w = nr[j]!;
          if (w < 0) return;
          rhs[3 * w] = rhs[3 * w]! - g[kk]! * dx;
          rhs[3 * w + 1] = rhs[3 * w + 1]! - g[kk]! * dy;
          rhs[3 * w + 2] = rhs[3 * w + 2]! - g[kk]! * dz;
        });
      }
      const { ecken, b } = this.bind;
      this.js.forEach((j, u) => {
        let zx = this.haut0[3 * u]! + ziele[3 * j]! - this.ziel0[3 * u]!;
        let zy = this.haut0[3 * u + 1]! + ziele[3 * j + 1]! - this.ziel0[3 * u + 1]!;
        let zz = this.haut0[3 * u + 2]! + ziele[3 * j + 2]! - this.ziel0[3 * u + 2]!;
        for (let e = 0; e < 3; e++) {
          const v = ecken[3 * j + e]!;
          if (nr[v]! >= 0) continue;
          const w = b[3 * j + e]!;
          zx -= w * P[3 * v]!;
          zy -= w * P[3 * v + 1]!;
          zz -= w * P[3 * v + 2]!;
        }
        for (let e = 0; e < 3; e++) {
          const v = nr[ecken[3 * j + e]!]!;
          if (v < 0) continue;
          const w = this.gewicht * b[3 * j + e]!;
          rhs[3 * v] = rhs[3 * v]! + w * zx;
          rhs[3 * v + 1] = rhs[3 * v + 1]! + w * zy;
          rhs[3 * v + 2] = rhs[3 * v + 2]! + w * zz;
        }
      });
      const tl = jetzt();
      const x = this.sys!.loesen(rhs);
      this.zeiten.loesen += jetzt() - tl;
      this.zeiten.runden++;
      for (let u = 0; u < nf; u++) {
        const v = this.frei[u]!;
        P[3 * v] = x[3 * u]!;
        P[3 * v + 1] = x[3 * u + 1]!;
        P[3 * v + 2] = x[3 * u + 2]!;
      }
      // genau spiegelgleich halten (wie HautZiele)
      for (let u = 0; u < nf; u++) {
        const v = this.frei[u]!;
        const w = h.spiegel[v]!;
        if (w < 0 || w < v) continue;
        if (w === v) {
          P[3 * v + 2] = 0;
          continue;
        }
        if (nr[w]! < 0) continue;
        const mx = 0.5 * (P[3 * v]! + P[3 * w]!);
        const my = 0.5 * (P[3 * v + 1]! + P[3 * w + 1]!);
        const mz = 0.5 * (P[3 * v + 2]! - P[3 * w + 2]!);
        P[3 * v] = mx;
        P[3 * v + 1] = my;
        P[3 * v + 2] = mz;
        P[3 * w] = mx;
        P[3 * w + 1] = my;
        P[3 * w + 2] = -mz;
      }
    }
  }
}
