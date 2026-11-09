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
import { KETTE_K, type KruemmungsKetten } from './kruemmung';
import { type Bindungen, type Haut, type Vermessung, gewichteAus, hautNormalenMax, laengenGewichte, vermessen } from './kurven';

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
export type HautOptionen = { vorlage?: HautVorlage; nurZeilen?: boolean; richtung?: boolean };

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
/**
 * nur für Messreihen (Löser-Schritt Teil 1, 08.11. abends): `fest` = volle Schritte ohne Anpassung je Punkt; `quellenFest` = die Krümmung
 * an den Linien bleibt die beim Anlegen gemessene (statt jede Runde an der Haut gemessen). Damit gezeigt: Nicht die Matrix bremst den
 * Löser, sondern die Messung an den Linien (Planseite „Kurven als Wahrheit“, Abschnitt 12).
 */
const MESSREIHE: {
  fest: boolean;
  quellenFest: boolean;
  linienZeile: 'richtung' | 'alt';
  seiteRadius: number;
  seiteSchritt: number;
  seiteFest: boolean;
  seiteSoll: number;
  maxNormalen: boolean;
  seiteNeigung: 'frei' | 'fest';
  g1Gewicht: number;
} = {
  fest: false,
  quellenFest: false,
  linienZeile: 'richtung',
  /** Richtung an den Linien: Umgebung je Seite, in mittleren Kantenlängen */
  seiteRadius: 3,
  /** Richtung an den Linien: Anteil des neu gemessenen Seitenwerts je Runde (1 = ganz) */
  seiteSchritt: 1,
  /** Richtung an den Linien: die Seitenwerte der ersten Runde behalten (Gegenprobe) */
  seiteFest: false,
  /** Richtung an den Linien: > 0 = jede Seite bekommt diesen Wert statt des gemessenen (Gegenprobe) */
  seiteSoll: 0,
  /** Richtung an den Linien: Normalen nach Max im Maß des Lösers */
  maxNormalen: true,
  /** Richtung an den Linien: je Seite die Neigung gegen die vorgegebene Ebene mit anpassen (`frei`) oder nicht (`fest`, wirkt dann über die Messung) */
  seiteNeigung: 'frei',
  /** Richtung an den Linien: Gewicht der Zeilen, die die Punkte neben der Linie auf die vorgegebene Ebene ziehen */
  g1Gewicht: 10,
};
export function messreiheSetzen(o: Partial<typeof MESSREIHE>): void {
  Object.assign(MESSREIHE, o);
}
/**
 * Krümmung je Seite an den Linienpunkten (Richtung an den Linien): je Linienpunkt seine Achsen in der Ebene senkrecht zur
 * vorgegebenen Normale (t längs der Linie, w quer), die Winkel der Nachbarn auf den Linien (trennen die Seiten, aufsteigend) und je
 * Seite ihr Wert; dazu das Mittel der Seiten.
 */
type Seiten = {
  je: Map<number, { t: [number, number, number]; w: [number, number, number]; tw: number[]; werte: Float64Array; neigung: Float64Array }>;
  mittel: Map<number, number>;
};

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
  /**
   * Richtung an den Linien (09.11., Beweis „Linien mit Richtung“): je Punkt der Haut die Normale, die das Liniennetz dort vorgibt (3 je
   * Punkt, NaN: keine), von außen vor jedem Schritt gesetzt. An diesen Punkten wird die Krümmung je Seite der Linie mit der vorgegebenen
   * Normale gemessen, und jede Seite verteilt ihren eigenen Wert in ihr Feld (Schneider & Kobbelt 2001: die Fläche braucht an ihren
   * Rändern Lage und Normale, dann ist sie eindeutig). Fehlt sie: wie bisher (nur `gleich`).
   */
  richtung: Float64Array | null = null;
  /** je Linienpunkt: seine Nachbarn auf den Linien durch ihn, paarweise (davor, dahinter) je Loop */
  private readonly linienNachbarn = new Map<number, [number, number][]>();
  /** Punkte neben einer Linie (mit `richtung` beim Anlegen): ihre Linienpunkte */
  private readonly ersteReihe = new Map<number, number[]>();
  /** mittlere Kantenlänge beim Anlegen (Maß für die Umgebung je Seite) */
  private readonly mk: number;
  /** Seitenwerte der letzten Runde (für `seiteSchritt` < 1) */
  private seitenVorher: Seiten | null = null;
  private seitenErst: Seiten | null = null;

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
    let kl = 0;
    let kz = 0;
    for (let v = 0; v < n; v++)
      for (const j of h.nachbarn[v]!) {
        if (j < v) continue;
        kl += Math.hypot(P[3 * j]! - P[3 * v]!, P[3 * j + 1]! - P[3 * v + 1]!, P[3 * j + 2]! - P[3 * v + 2]!);
        kz++;
      }
    this.mk = kz ? kl / kz : 1;
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
    if (ketten)
      for (let j = 0; j < m; j++) {
        const v = bind.ecken[3 * j]!;
        const k = ketten.kette[j];
        if (!k || bind.ecken[3 * j + 1] !== v || bind.ecken[3 * j + 2] !== v) continue;
        const a = k[KETTE_K - 1]!;
        const b = k[KETTE_K + 1]!;
        if (a < 0 || b < 0) continue;
        const paar: [number, number] = [bind.ecken[3 * a]!, bind.ecken[3 * b]!];
        const liste = this.linienNachbarn.get(v);
        if (liste) liste.push(paar);
        else this.linienNachbarn.set(v, [paar]);
      }
    // Richtung an den Linien: je Punkt neben einer Linie eine Zeile, die ihn auf die vorgegebene Ebene der Linie zieht (Ziel je Runde)
    if (opt.richtung)
      for (const v of this.linienNachbarn.keys())
        for (const j of h.nachbarn[v]!) {
          if (nr[j]! < 0 || this.linienNachbarn.has(j)) continue;
          const a = this.ersteReihe.get(j);
          if (a) {
            if (!a.includes(v)) a.push(v);
            continue;
          }
          this.ersteReihe.set(j, [v]);
          zeilen.push({ index: [nr[j]!], wert: [1], gewicht: MESSREIHE.g1Gewicht });
        }
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
   * Krümmung je Seite an den Linienpunkten mit Richtung. Die Nachbarn auf den Linien trennen die Seiten (Sektoren in der Ebene
   * senkrecht zur vorgegebenen Normale n). Je Seite wird über die Punkte dieser Seite bis zum Abstand `SEITE_RADIUS` · mittlere Kante
   * (über die Fläche gesucht, nie über eine Linie hinweg; die Linien selbst gehören zu beiden Seiten) eine Höhe über der Ebene
   * h = −½ (A u² + 2B u w + C w²) angepasst, ohne Neigung (die Normale ist vorgegeben); ihr Wert (A + C)/4 ist im Maß des Lösers
   * (Kugel: 1/(2R)). Liegt die Haut einer Seite schräg zur vorgegebenen Normale, misst diese Seite eine andere Krümmung, und ihr Feld
   * biegt die Haut zurück. Nur die direkten Nachbarn waren zu wenig: Auf einer eingesetzten Linie haben die Punkte 4–6 Nachbarn und
   * zum Teil sehr kurze Kanten, gemessen lag eine Seite bis zum 260-Fachen daneben. Liefert je Linienpunkt den Wert für jeden Nachbarn
   * (den seiner Seite) und das Mittel der Seiten.
   */
  private seitenMessen(rn: Float64Array): Seiten {
    const h = this.h;
    const P = h.pos;
    const je = new Map<number, { t: [number, number, number]; w: [number, number, number]; tw: number[]; werte: Float64Array; neigung: Float64Array }>();
    const mittel = new Map<number, number>();
    const rad = MESSREIHE.seiteRadius * this.mk;
    const rad2 = rad * rad;
    const istLinie = (x: number) => this.linienNachbarn.has(x) || this.quelle[x]! >= 0;
    const besucht = new Int32Array(h.n).fill(-1);
    let marke = 0;
    for (const [v, paare] of this.linienNachbarn) {
      const nx = rn[3 * v]!;
      if (Number.isNaN(nx)) continue;
      const ny = rn[3 * v + 1]!;
      const nz = rn[3 * v + 2]!;
      // Achsen in der Ebene senkrecht zu n: t längs der ersten Linie, w = n × t
      const [a0, b0] = paare[0]!;
      let tx = P[3 * b0]! - P[3 * a0]!;
      let ty = P[3 * b0 + 1]! - P[3 * a0 + 1]!;
      let tz = P[3 * b0 + 2]! - P[3 * a0 + 2]!;
      const tn = tx * nx + ty * ny + tz * nz;
      tx -= tn * nx;
      ty -= tn * ny;
      tz -= tn * nz;
      const tl = Math.hypot(tx, ty, tz);
      if (tl < 1e-12) continue;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      const wx = ny * tz - nz * ty;
      const wy = nz * tx - nx * tz;
      const wz = nx * ty - ny * tx;
      const vx = P[3 * v]!;
      const vy = P[3 * v + 1]!;
      const vz = P[3 * v + 2]!;
      const winkel = (j: number) => {
        const dx = P[3 * j]! - vx;
        const dy = P[3 * j + 1]! - vy;
        const dz = P[3 * j + 2]! - vz;
        return Math.atan2(dx * wx + dy * wy + dz * wz, dx * tx + dy * ty + dz * tz);
      };
      const trenner = new Set<number>();
      for (const [a, b] of paare) {
        trenner.add(a);
        trenner.add(b);
      }
      const tw = [...trenner].map(winkel).sort((x, y) => x - y);
      const nb = h.nachbarn[v]!;
      const sektor = nb.map((j) => {
        if (istLinie(j)) return -1;
        const a = winkel(j);
        let s = tw.length - 1;
        for (let q = 0; q < tw.length; q++) if (tw[q]! <= a) s = q;
        return s;
      });
      // Punkte auf den Linien durch v bis zum Abstand (gehören zu jeder Seite)
      const linie: number[] = [];
      for (const [a, b] of paare)
        for (const start of [a, b]) {
          let vor = v;
          let x = start;
          for (let k = 0; k < 64; k++) {
            const dx = P[3 * x]! - vx;
            const dy = P[3 * x + 1]! - vy;
            const dz = P[3 * x + 2]! - vz;
            if (dx * dx + dy * dy + dz * dz > rad2) break;
            linie.push(x);
            const weiter = this.linienNachbarn.get(x)?.find(([p, q]) => p === vor || q === vor);
            if (!weiter) break;
            const nach = weiter[0] === vor ? weiter[1] : weiter[0];
            vor = x;
            x = nach;
            if (x === v) break;
          }
        }
      const werte = new Float64Array(tw.length).fill(Number.NaN);
      const neigung = new Float64Array(2 * tw.length);
      let summe = 0;
      let zahl = 0;
      for (let s = 0; s < tw.length; s++) {
        // Punkte dieser Seite: über die Fläche ab den Nachbarn im Sektor, nicht über Linien hinweg
        marke++;
        besucht[v] = marke;
        const schlange: number[] = [];
        for (let k = 0; k < nb.length; k++)
          if (sektor[k] === s) {
            schlange.push(nb[k]!);
            besucht[nb[k]!] = marke;
          }
        if (schlange.length === 0) continue;
        // Höhe h = n·(q − p) = α u + β w − ½ (A u² + 2B u w + C w²); mit `seiteNeigung` fest ohne α, β
        const frei = MESSREIHE.seiteNeigung === 'frei';
        const k = frei ? 5 : 3;
        const M = new Float64Array(k * k);
        const r = new Float64Array(k);
        const z = new Float64Array(k);
        let anz = 0;
        const dazu = (j: number) => {
          const dx = P[3 * j]! - vx;
          const dy = P[3 * j + 1]! - vy;
          const dz = P[3 * j + 2]! - vz;
          const q2 = dx * dx + dy * dy + dz * dz;
          if (q2 > rad2) return false;
          const u = dx * tx + dy * ty + dz * tz;
          const w = dx * wx + dy * wy + dz * wz;
          const hh = dx * nx + dy * ny + dz * nz;
          const g = (1 - q2 / rad2) ** 2;
          z[0] = -0.5 * u * u;
          z[1] = -u * w;
          z[2] = -0.5 * w * w;
          if (frei) {
            z[3] = u;
            z[4] = w;
          }
          for (let p2 = 0; p2 < k; p2++) {
            r[p2] = r[p2]! + g * z[p2]! * hh;
            for (let q = 0; q < k; q++) M[p2 * k + q] = M[p2 * k + q]! + g * z[p2]! * z[q]!;
          }
          anz++;
          return true;
        };
        for (const x of linie) dazu(x);
        for (let i = 0; i < schlange.length; i++) {
          const x = schlange[i]!;
          if (!dazu(x) || istLinie(x)) continue;
          for (const y of h.nachbarn[x]!) {
            if (besucht[y] === marke) continue;
            besucht[y] = marke;
            schlange.push(y);
          }
        }
        if (anz < k + 1) continue;
        const loes = gauss(M, r, k);
        if (!loes) continue;
        const wert = (loes[0]! + loes[2]!) / 4;
        werte[s] = wert;
        if (frei) {
          neigung[2 * s] = loes[3]!;
          neigung[2 * s + 1] = loes[4]!;
        }
        summe += wert;
        zahl++;
      }
      if (zahl === 0) continue;
      if (MESSREIHE.seiteSoll > 0) {
        werte.fill(MESSREIHE.seiteSoll);
        summe = MESSREIHE.seiteSoll * zahl;
      }
      je.set(v, { t: [tx, ty, tz], w: [wx, wy, wz], tw, werte, neigung });
      mittel.set(v, summe / zahl);
    }
    return { je, mittel };
  }

  /** Seite des Linienpunkts j, auf der der Punkt v liegt (nach dem Winkel in der Ebene von j); fehlt: −1 */
  private seitenSektor(seiten: Seiten, j: number, v: number): number {
    const e = seiten.je.get(j);
    if (!e) return -1;
    const P = this.h.pos;
    const dx = P[3 * v]! - P[3 * j]!;
    const dy = P[3 * v + 1]! - P[3 * j + 1]!;
    const dz = P[3 * v + 2]! - P[3 * j + 2]!;
    const a = Math.atan2(dx * e.w[0] + dy * e.w[1] + dz * e.w[2], dx * e.t[0] + dy * e.t[1] + dz * e.t[2]);
    let s = e.tw.length - 1;
    for (let q = 0; q < e.tw.length; q++) if (e.tw[q]! <= a) s = q;
    return s;
  }

  /** Wert der Seite des Linienpunkts j, auf der der Punkt v liegt; fehlt: undefined */
  private seitenWert(seiten: Seiten, j: number, v: number): number | undefined {
    const s = this.seitenSektor(seiten, j, v);
    if (s < 0) return undefined;
    const x = seiten.je.get(j)!.werte[s]!;
    return Number.isNaN(x) ? seiten.mittel.get(j) : x;
  }

  /**
   * Krümmung je Punkt: an den Punkten im Bereich, die auf keinem Loop liegen, harmonisch aus den Quellen (Loops wie jetzt gemessen,
   * `kap`; der Rand des Bereichs wie beim Anlegen); an Punkten eines Loops ihr eigener Wert, außerhalb des Bereichs der beim Anlegen.
   */
  private kruemmung(
    kap: Float64Array,
    seiten: Seiten | null = null,
  ): Float64Array {
    const h = this.h;
    const c = Float64Array.from(kap);
    if (seiten) for (const [v, w] of seiten.mittel) c[v] = w;
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
        if (q > 0) b[u] = b[u]! + g[k]! * q * ((seiten ? this.seitenWert(seiten, w, i) : undefined) ?? c[w]!);
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
  private kruemmungIntrinsisch(kap: Float64Array, ig: IntrinsischeGewichte, seiten: Seiten | null = null): Float64Array {
    const h = this.h;
    const c = Float64Array.from(kap);
    for (let v = 0; v < h.n; v++) if (this.nr[v]! < 0 || (MESSREIHE.quellenFest && this.quelle[v]! >= 0)) c[v] = this.ruhe.kap[v]!;
    if (seiten) for (const [v, w] of seiten.mittel) c[v] = w;
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
          b[u] = b[u]! + g * q * ((seiten ? this.seitenWert(seiten, j, v) : undefined) ?? c[j]!);
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
      // mit Richtung an den Linien: Normalen nach Max (sonst misst das Maß im Inneren die Krümmung zu flach, und die genaue Messung an
      // den Linien passt nicht dazu: die Haut bläht sich auf)
      const m = vermessen(h, this.gew, this.richtung && MESSREIHE.maxNormalen ? hautNormalenMax(h) : undefined);
      const t1 = jetzt();
      // nach der Geometrie: gemessen und verteilt auf der intrinsischen Triangulierung der Lage, wie sie jetzt ist
      let geo: { kap: Float64Array; kante2: Float64Array } | null = null;
      let c: Float64Array;
      let seiten: Seiten | null = null;
      if (this.art === 'geometrie') {
        const ig = intrinsischeGewichte(h, this.fest);
        geo = this.messenIntrinsisch(ig, m.nor);
        const t2 = jetzt();
        seiten = this.richtung ? this.seitenMessen(this.richtung) : null;
        c = this.kruemmungIntrinsisch(geo.kap, ig, seiten);
        this.zeiten.intrinsisch += t2 - t1;
        this.zeiten.kruemmung += jetzt() - t2;
        if (!this.beta) {
          this.beta = new Float64Array(h.n).fill(DAEMPFUNG);
          this.dVorher = new Float64Array(h.n);
        }
      } else {
        seiten = this.richtung ? (MESSREIHE.seiteFest && this.seitenErst ? this.seitenErst : this.seitenMessen(this.richtung)) : null;
        if (seiten && !this.seitenErst) this.seitenErst = seiten;
        const sch = MESSREIHE.seiteSchritt;
        if (seiten && sch < 1 && this.seitenVorher)
          for (const [v, e] of seiten.je) {
            const alt = this.seitenVorher.je.get(v);
            if (!alt || alt.werte.length !== e.werte.length) continue;
            for (let q = 0; q < e.werte.length; q++) e.werte[q] = alt.werte[q]! + sch * (e.werte[q]! - alt.werte[q]!);
          }
        if (seiten) this.seitenVorher = seiten;
        c = this.kruemmung(m.kap, seiten);
      }
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
          const b = MESSREIHE.fest ? DAEMPFUNG : d * this.dVorher![i]! < 0 ? Math.max(0.02, 0.5 * this.beta![i]!) : Math.min(DAEMPFUNG, 1.25 * this.beta![i]!);
          this.beta![i] = b;
          this.dVorher![i] = d;
          k = m.kante2[i]! * m.kap[i]! + b * d;
        }
        let nx = m.nor[3 * i]!;
        let ny = m.nor[3 * i + 1]!;
        let nz = m.nor[3 * i + 2]!;
        let tx = m.tang[3 * i]!;
        let ty = m.tang[3 * i + 1]!;
        let tz = m.tang[3 * i + 2]!;
        // Linienpunkt mit Richtung: Laplace längs der vorgegebenen Normale, so tief wie das Mittel der Seiten
        if (seiten?.mittel.has(i) && MESSREIHE.linienZeile === 'richtung') {
          const rn = this.richtung!;
          nx = rn[3 * i]!;
          ny = rn[3 * i + 1]!;
          nz = rn[3 * i + 2]!;
          const s = tx * nx + ty * ny + tz * nz;
          tx -= s * nx;
          ty -= s * ny;
          tz -= s * nz;
        }
        let dx = tx + k * nx;
        let dy = ty + k * ny;
        let dz = tz + k * nz;
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
      // Richtung an den Linien: die Punkte neben einer Linie ohne ihre Neigung gegen die vorgegebene Ebene (je Seite angepasst),
      // mit dem Linienpunkt mitgeführt; ohne Messung bleiben sie, wo sie sind
      if (this.ersteReihe.size) {
        const zielV = new Map<number, number>();
        this.js.forEach((j, u) => {
          const v = ecken[3 * j]!;
          if (ecken[3 * j + 1] === v && ecken[3 * j + 2] === v) zielV.set(v, u);
        });
        const zielBei = (v: number, c: number) => {
          const u = zielV.get(v);
          if (u === undefined) return P[3 * v + c]!;
          return this.haut0[3 * u + c]! + ziele[3 * this.js[u]! + c]! - this.ziel0[3 * u + c]!;
        };
        const gG = MESSREIHE.g1Gewicht;
        const rn = this.richtung;
        for (const [j, vs] of this.ersteReihe) {
          let sx = 0;
          let sy = 0;
          let sz = 0;
          let k = 0;
          if (seiten && rn)
            for (const v of vs) {
              const e = seiten.je.get(v);
              if (!e) continue;
              const s = this.seitenSektor(seiten, v, j);
              if (s < 0) continue;
              const dx = P[3 * j]! - P[3 * v]!;
              const dy = P[3 * j + 1]! - P[3 * v + 1]!;
              const dz = P[3 * j + 2]! - P[3 * v + 2]!;
              const u = dx * e.t[0] + dy * e.t[1] + dz * e.t[2];
              const w = dx * e.w[0] + dy * e.w[1] + dz * e.w[2];
              const neig = e.neigung[2 * s]! * u + e.neigung[2 * s + 1]! * w;
              sx += P[3 * j]! + zielBei(v, 0) - P[3 * v]! - neig * rn[3 * v]!;
              sy += P[3 * j + 1]! + zielBei(v, 1) - P[3 * v + 1]! - neig * rn[3 * v + 1]!;
              sz += P[3 * j + 2]! + zielBei(v, 2) - P[3 * v + 2]! - neig * rn[3 * v + 2]!;
              k++;
            }
          const q = nr[j]!;
          if (k === 0) {
            rhs[3 * q] = rhs[3 * q]! + gG * P[3 * j]!;
            rhs[3 * q + 1] = rhs[3 * q + 1]! + gG * P[3 * j + 1]!;
            rhs[3 * q + 2] = rhs[3 * q + 2]! + gG * P[3 * j + 2]!;
          } else {
            rhs[3 * q] = rhs[3 * q]! + (gG * sx) / k;
            rhs[3 * q + 1] = rhs[3 * q + 1]! + (gG * sy) / k;
            rhs[3 * q + 2] = rhs[3 * q + 2]! + (gG * sz) / k;
          }
        }
      }
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

/** Lineares System k × k (Zeilen in M) mit Pivotsuche lösen; singulär: null */
function gauss(M: Float64Array, r: Float64Array, k: number): Float64Array | null {
  const A = Float64Array.from(M);
  const x = Float64Array.from(r);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let i = c + 1; i < k; i++) if (Math.abs(A[i * k + c]!) > Math.abs(A[p * k + c]!)) p = i;
    if (!(Math.abs(A[p * k + c]!) > 1e-30)) return null;
    if (p !== c) {
      for (let j = 0; j < k; j++) {
        const t = A[c * k + j]!;
        A[c * k + j] = A[p * k + j]!;
        A[p * k + j] = t;
      }
      const t = x[c]!;
      x[c] = x[p]!;
      x[p] = t;
    }
    for (let i = c + 1; i < k; i++) {
      const f = A[i * k + c]! / A[c * k + c]!;
      if (f === 0) continue;
      for (let j = c; j < k; j++) A[i * k + j] = A[i * k + j]! - f * A[c * k + j]!;
      x[i] = x[i]! - f * x[c]!;
    }
  }
  for (let i = k - 1; i >= 0; i--) {
    let t = x[i]!;
    for (let j = i + 1; j < k; j++) t -= A[i * k + j]! * x[j]!;
    x[i] = t / A[i * k + i]!;
  }
  return x;
}
