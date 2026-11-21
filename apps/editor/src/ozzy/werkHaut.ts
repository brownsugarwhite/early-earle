/**
 * Die Haut des Werks in Ozzy (Phase 3). Die glatte Anzeige ist dieselbe wie im Prüffenster `kurven.html` (`glattAnlegen` und
 * `glattZeigen` in `kurven.ts`, mit `GlattPlan`; bei Änderungen dort hier nachziehen): Jede Kante bekommt einen Punkt auf ihrer
 * gewölbten Kante, auf einer Linie in der Mitte ihres Pfadstücks. Dazu je Punkt die Werte der Seifenhaut (`HautNetz`), der Umriss je
 * Achse und der Pfad der Linie der Mitte. Gerechnet wird in Einheiten des Werks; Ozzy rechnet in seine Welt um (Welt = Werk / f +
 * Mitte). An der Rechnung des Werks ändert dieses Modul nichts (Florian, 16.11.): Es liest nur.
 */
import { kanteBei } from '@ee/shape/dicht';
import type { HautNetz } from '../anfang/haut';
import { GlattPlan, type LinienKante } from '../form/glattPlan';
import { FLUSS_DAUER } from './werkBlatt';
import * as werk from '../form/werk';

/** so oft (ms) wird der Umriss höchstens neu gerechnet, während sich die Haut bewegt (S3); das letzte Bild bekommt den genauen */
const UMRISS_MS = 50;
/** Glätten der Normalen der Anzeige (wie `GLATT_RUHE` im Prüffenster, Standard 3) */
const GLATT_RUHE = 3;
/** unter dieser Abweichung von 1 gilt die Dehnung als ausgeklungen (die Farbe der Seifenhaut ändert sich darunter nicht mehr sichtbar) */
const DEHNUNG_AUS = 0.01;
/**
 * Stufen nach der Größe im Bild (A3, 17.11.): so viele, dass eine lange Kante der feinen Dreiecke (neun Zehntel sind kürzer) rund
 * `KANTE_ZIEL` Gerätepunkte lang ist. Bei der jetzigen Zahl bleibt es, solange sie zwischen `KANTE_AB` und `KANTE_BIS` liegt (das Band
 * ist breiter als eine Stufe, nichts flattert an der Grenze). Gemessen an „strange bird“ in gewöhnlicher Größe (lange Kante des
 * Rechennetzes 10,5 Gerätepunkte): zwei Stufen statt einer (feine Kante 2,6 statt 5,2 Gerätepunkte) kosteten die Grafikkarte 4,4 ms
 * je Bild und den Prozessor im Zug 2,5 ms, das Bild war gleich (57 dB). Die Schattierung hängt nicht an den Stufen (die Normalen
 * kommen von den Rechenpunkten), nur Umriss und Wölbung. Nah heran gibt es mehr Stufen als bisher, so weit die Zahl der Dreiecke es
 * erlaubt (`GLATT_HOECHSTENS` in der Ruhe, `GLATT_IM_ZUG` solange sich die Haut ändert).
 */
const KANTE_ZIEL = 5;
const KANTE_AB = 3.3;
const KANTE_BIS = 7.6;
const STUFEN_HOECHSTENS = 4;
/** der Bereich der Dehnung, den die Seifenhaut als Farbe zeigt (ihr Shader begrenzt auf 0,55 bis 6) */
const DEHNUNG_AB = 0.5;
const DEHNUNG_BIS = 6.5;

type Plan = {
  index: Uint32Array;
  quelle: Int32Array;
  kenn: string;
  plan: GlattPlan;
  kanten: LinienKante[];
  wo: Map<number, number[]>;
  lagen: Float64Array;
  pfade: Float64Array;
  /** Lage im Blatt je Punkt der Anzeige (für die Muster) und Fläche je Punkt als Bezug der Dehnung */
  blattX: Float32Array;
  blattY: Float32Array;
  bezug: Float64Array;
  flaeche: Float64Array;
  dehnung: Float32Array;
  /** eine lange Kante des Netzes der Anzeige (neun Zehntel sind kürzer), Einheiten des Werks: der Maßstab für die Stufen */
  kante: number;
};

/** woher Muster und Dehnung beim Netzwechsel kommen: das Netz der Anzeige davor (Lagen im Werk, Dreiecke) mit beidem je Punkt */
type Quelle = { lagen: Float64Array; index: Uint32Array; blattX: Float32Array; blattY: Float32Array; dehnung: Float32Array };

/**
 * Jeder Punkt des Plans nimmt Muster und Dehnung von der Stelle der Quelle, die ihm am nächsten liegt: aus dem Dreieck dort, zwischen
 * dessen Ecken gemischt. So bleiben beide stetig. (Bis zum 17.11. vom nächsten Punkt: Das gab Stufen, und die Dünnschichtfarbe der
 * Seifenhaut zeigte jede Stufe als Scherbe.) Der Bezug der Dehnung folgt daraus; die Fläche vorher rechnen.
 */
function uebernehmen(p: Plan, q: Quelle): void {
  const L = p.lagen;
  const N = p.quelle.length;
  const suche = dreieckSuche(q.lagen, q.index);
  const T = TREFFER;
  for (let d = 0; d < N; d++) {
    suche(L[3 * d]!, L[3 * d + 1]!, L[3 * d + 2]!);
    p.blattX[d] = T.wa * q.blattX[T.a]! + T.wb * q.blattX[T.b]! + T.wc * q.blattX[T.c]!;
    p.blattY[d] = T.wa * q.blattY[T.a]! + T.wb * q.blattY[T.b]! + T.wc * q.blattY[T.c]!;
    const de = Math.max(0.05, T.wa * q.dehnung[T.a]! + T.wb * q.dehnung[T.b]! + T.wc * q.dehnung[T.c]!);
    p.bezug[d] = p.flaeche[d]! / de;
    p.dehnung[d] = de;
  }
}

/** der nächste Ort auf einem Netz: die Ecken seines Dreiecks, ihre Gewichte, der Abstand im Quadrat (von `dreieckSuche` überschrieben) */
const TREFFER = { a: 0, b: 0, c: 0, wa: 1, wb: 0, wc: 0, d2: Infinity };

/** Der nächste Ort auf dem Dreieck (ia, ib, ic) zum Punkt (Ericson, Real-Time Collision Detection, 5.1.5); nach `TREFFER`, wenn näher */
function dreieckPruefen(Q: Float64Array, ia: number, ib: number, ic: number, px: number, py: number, pz: number): void {
  const ax = Q[3 * ia]!;
  const ay = Q[3 * ia + 1]!;
  const az = Q[3 * ia + 2]!;
  const abx = Q[3 * ib]! - ax;
  const aby = Q[3 * ib + 1]! - ay;
  const abz = Q[3 * ib + 2]! - az;
  const acx = Q[3 * ic]! - ax;
  const acy = Q[3 * ic + 1]! - ay;
  const acz = Q[3 * ic + 2]! - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  let wb = 0;
  let wc = 0;
  if (!(d1 <= 0 && d2 <= 0)) {
    const d3 = d1 - (abx * abx + aby * aby + abz * abz);
    const d4 = d2 - (acx * abx + acy * aby + acz * abz);
    if (d3 >= 0 && d4 <= d3) wb = 1;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) wb = d1 / (d1 - d3);
      else {
        const d5 = d1 - (abx * acx + aby * acy + abz * acz);
        const d6 = d2 - (acx * acx + acy * acy + acz * acz);
        if (d6 >= 0 && d5 <= d6) wc = 1;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) wc = d2 / (d2 - d6);
          else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              wc = (d4 - d3) / (d4 - d3 + (d5 - d6));
              wb = 1 - wc;
            } else {
              const den = va + vb + vc;
              // (ein Dreieck ohne Fläche: seine erste Ecke)
              if (Math.abs(den) > 1e-300) {
                wb = vb / den;
                wc = vc / den;
              }
            }
          }
        }
      }
    }
  }
  if (!(wb >= 0 && wc >= 0 && wb + wc <= 1 + 1e-9)) {
    wb = 0;
    wc = 0;
  }
  const dx = apx - wb * abx - wc * acx;
  const dy = apy - wb * aby - wc * acy;
  const dz = apz - wb * abz - wc * acz;
  const dd = dx * dx + dy * dy + dz * dz;
  if (dd < TREFFER.d2) {
    TREFFER.d2 = dd;
    TREFFER.a = ia;
    TREFFER.b = ib;
    TREFFER.c = ic;
    TREFFER.wa = 1 - wb - wc;
    TREFFER.wb = wb;
    TREFFER.wc = wc;
  }
}

/**
 * Der nächste Ort auf einem Dreiecksnetz, über ein Gitter (Zelle: die anderthalbfache mittlere Kante; jedes Dreieck steht in allen
 * Zellen, die sein Kasten berührt). Gesucht wird in wachsenden Schalen um die Zelle des Punkts, bis nichts Näheres mehr außerhalb
 * liegen kann: Liegt der Punkt fast auf dem Netz (der gewöhnliche Fall beim Netzwechsel), genügt meist die eigene Zelle. Für das
 * Weiterreichen beim Netzwechsel (einmal je Wechsel, nicht je Bild). Das Ergebnis steht in `TREFFER`.
 */
function dreieckSuche(Q: Float64Array, I: Uint32Array): (x: number, y: number, z: number) => void {
  const T = I.length / 3;
  let summe = 0;
  let zahl = 0;
  for (let t = 0; t < T; t += Math.max(1, Math.floor(T / 2000))) {
    const a = 3 * I[3 * t]!;
    const b = 3 * I[3 * t + 1]!;
    summe += Math.hypot(Q[a]! - Q[b]!, Q[a + 1]! - Q[b + 1]!, Q[a + 2]! - Q[b + 2]!);
    zahl++;
  }
  const h = Math.max(1e-6, (1.5 * summe) / Math.max(1, zahl));
  const schl = (i: number, j: number, k: number): number => Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791);
  const gitter = new Map<number, number[]>();
  for (let t = 0; t < T; t++) {
    const a = 3 * I[3 * t]!;
    const b = 3 * I[3 * t + 1]!;
    const c = 3 * I[3 * t + 2]!;
    const i0 = Math.floor(Math.min(Q[a]!, Q[b]!, Q[c]!) / h);
    const i1 = Math.floor(Math.max(Q[a]!, Q[b]!, Q[c]!) / h);
    const j0 = Math.floor(Math.min(Q[a + 1]!, Q[b + 1]!, Q[c + 1]!) / h);
    const j1 = Math.floor(Math.max(Q[a + 1]!, Q[b + 1]!, Q[c + 1]!) / h);
    const k0 = Math.floor(Math.min(Q[a + 2]!, Q[b + 2]!, Q[c + 2]!) / h);
    const k1 = Math.floor(Math.max(Q[a + 2]!, Q[b + 2]!, Q[c + 2]!) / h);
    // (ein entartet großes Dreieck steht nicht in Hunderten Zellen: Es bleibt dem Durchgang über alle)
    if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > 64) continue;
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++)
        for (let k = k0; k <= k1; k++) {
          const s = schl(i, j, k);
          const l = gitter.get(s);
          if (l) l.push(t);
          else gitter.set(s, [t]);
        }
  }
  const marke = new Uint32Array(T);
  let lauf = 0;
  return (x, y, z) => {
    lauf++;
    TREFFER.d2 = Infinity;
    const ci = Math.floor(x / h);
    const cj = Math.floor(y / h);
    const ck = Math.floor(z / h);
    // so weit ist nach der eigenen Zelle in jede Richtung sicher gesucht
    const rand = Math.min(x - ci * h, (ci + 1) * h - x, y - cj * h, (cj + 1) * h - y, z - ck * h, (ck + 1) * h - z);
    for (let r = 0; r <= 6; r++) {
      for (let i = ci - r; i <= ci + r; i++)
        for (let j = cj - r; j <= cj + r; j++)
          for (let k = ck - r; k <= ck + r; k++) {
            if (r > 0 && Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== r) continue;
            const l = gitter.get(schl(i, j, k));
            if (!l) continue;
            for (const t of l) {
              if (marke[t] === lauf) continue;
              marke[t] = lauf;
              dreieckPruefen(Q, I[3 * t]!, I[3 * t + 1]!, I[3 * t + 2]!, x, y, z);
            }
          }
      const sicher = Math.max(0, rand) + r * h;
      if (TREFFER.d2 <= sicher * sicher) return;
    }
    // weit weg vom Netz (oder nur entartete Dreiecke in der Nähe): alle
    for (let t = 0; t < T; t++) if (marke[t] !== lauf) dreieckPruefen(Q, I[3 * t]!, I[3 * t + 1]!, I[3 * t + 2]!, x, y, z);
  };
}

/** Eine lange Kante eines Netzes: Neun Zehntel der Kanten (aus einer Stichprobe der Dreiecke) sind kürzer */
function langeKante(L: Float64Array, I: Uint32Array): number {
  const T = I.length / 3;
  const laengen: number[] = [];
  for (let t = 0; t < T; t += Math.max(1, Math.floor(T / 1500))) {
    for (let e = 0; e < 3; e++) {
      const a = 3 * I[3 * t + e]!;
      const b = 3 * I[3 * t + ((e + 1) % 3)]!;
      laengen.push(Math.hypot(L[a]! - L[b]!, L[a + 1]! - L[b + 1]!, L[a + 2]! - L[b + 2]!));
    }
  }
  laengen.sort((x, y) => x - y);
  return laengen.length ? laengen[Math.floor(0.9 * (laengen.length - 1))]! : 0;
}

/** Schlüssel einer Linienkante: Loop, Probe, Spiegelhälfte (wie `glattOrt` im Prüffenster) */
const ort = (li: number, j: number, sp: boolean): number => (li * 1_000_000 + j) * 2 + (sp ? 1 : 0);
// (ohne „Pose oder Grundform“, seit dem 21.11.: Der Plan hängt am Netz und daran, welche Linien genau auf ihrem Pfad liegen; beides
// steht hier und in den Feldern der Teilung. So bleibt er beim Betreten und Verlassen der Pose derselbe.)
const kennJetzt = (): string => werk.loops.map((l) => `${l.id}.${l.proben.length}.${werk.exakt(l) ? 1 : 0}`).join(',');

export class WerkHaut {
  private static zaehler = 0;
  /** eindeutig je Anzeige (für Zwischenspeicher, die mehrere Anzeigen kennen: der Verbund der Objekte) */
  readonly kennung = ++WerkHaut.zaehler;
  /** Werk-Einheiten je Pixel der Welt und die Mitte der Form in der Welt */
  f = 1;
  mitte = { x: 0, y: 0 };
  /** das Netz für die Seifenhaut (in der Welt); neu, wenn sich die Zahl der Punkte ändert */
  netz: HautNetz | null = null;
  /** Stufen und Dauer der letzten Rechnung; wann sich die Haut zuletzt bewegt hat */
  stufen = 0;
  ms = 0;
  geaendert = 0;
  /** zählt jede neue Lage der Anzeige (für Zwischenspeicher, die an der Haut hängen: Umriss) */
  version = 0;
  /** im letzten Rechnen hat sich nur die Dehnung geändert (die Lage der Haut war dieselbe): nur sie neu hochladen */
  nurDehnung = false;
  /** Clipping: In der gezeigten Haut reicht eine Hälfte über die Spiegelebene (`netz.seite` sagt, wo); die Anzeige schneidet dort ab */
  spiegelSchnitt = false;
  private seiteGrob: Float32Array | null = null;
  /**
   * Das Spiegelbild einer freien Form als Anzeige (18.11., „Spiegel an“ an einem ganzen Objekt): `zeigeNetz` ist dann das Netz samt
   * seinem Spiegelbild an der Ebene z = 0 (doppelt so viele Punkte, die zweite Hälfte gespiegelt, ihre Dreiecke andersherum). Gerechnet
   * wird nur das eine (`netz`).
   */
  spiegelbild = false;
  private doppelt: { von: HautNetz; netz: HautNetz; version: number; dehnung: number } | null = null;
  /** zählt, wenn sich nur die Dehnung geändert hat (für das doppelte Netz) */
  private dehnungNr = 0;
  /** das Netz, das gezeigt wird: `netz`, mit `spiegelbild` samt seinem Spiegelbild */
  get zeigeNetz(): HautNetz | null {
    const n = this.netz;
    if (!n || !this.spiegelbild) return n;
    const N = n.pos.length / 3;
    const I = n.index.length;
    let d = this.doppelt;
    if (!d || d.von !== n || d.netz.pos.length !== 6 * N || d.netz.index.length !== 2 * I) {
      const index = new Uint32Array(2 * I);
      index.set(n.index);
      for (let i = 0; i < I; i += 3) {
        index[I + i] = n.index[i]! + N;
        index[I + i + 1] = n.index[i + 2]! + N;
        index[I + i + 2] = n.index[i + 1]! + N;
      }
      d = {
        von: n,
        netz: { pos: new Float32Array(6 * N), normal: new Float32Array(6 * N), index, hoehe: new Float32Array(2 * N), seite: new Float32Array(2 * N), blatt: new Float32Array(4 * N), dehnung: new Float32Array(2 * N), sicht: new Float32Array(2 * N) },
        version: -1,
        dehnung: -1,
      };
      this.doppelt = d;
    }
    const z = d.netz;
    if (d.version !== this.version) {
      d.version = this.version;
      d.dehnung = -1;
      z.pos.set(n.pos);
      z.normal.set(n.normal);
      for (let v = 0; v < N; v++) {
        z.pos[3 * (N + v)] = n.pos[3 * v]!;
        z.pos[3 * (N + v) + 1] = n.pos[3 * v + 1]!;
        z.pos[3 * (N + v) + 2] = -n.pos[3 * v + 2]!;
        z.normal[3 * (N + v)] = n.normal[3 * v]!;
        z.normal[3 * (N + v) + 1] = n.normal[3 * v + 1]!;
        z.normal[3 * (N + v) + 2] = -n.normal[3 * v + 2]!;
      }
      z.hoehe.set(n.hoehe);
      z.hoehe.set(n.hoehe, N);
      z.blatt.set(n.blatt);
      z.blatt.set(n.blatt, 2 * N);
      z.sicht.set(n.sicht);
      z.sicht.set(n.sicht, N);
      // (die Seite für den Schnitt an der Spiegelebene: das Spiegelbild trägt die andere)
      z.seite.set(n.seite);
      for (let v = 0; v < N; v++) z.seite[N + v] = -n.seite[v]!;
    }
    if (d.dehnung !== this.dehnungNr) {
      d.dehnung = this.dehnungNr;
      z.dehnung.set(n.dehnung);
      z.dehnung.set(n.dehnung, N);
    }
    return z;
  }
  private letzte: { plan: Plan; voll: boolean; lagen: Float64Array } | null = null;
  private umrissSpeicher = new Map<number, { version: number; netz: HautNetz | null; seg: Float32Array; t: number }>();
  /** ein Umriss ist älter als die Haut (im Zug höchstens alle `UMRISS_MS` neu): Die Anzeige braucht noch ein Bild */
  umrissVeraltet = false;
  private p: Plan | null = null;
  /** der Plan vor dem letzten Netzwechsel (für das Weiterreichen von Muster und Dehnung) */
  private alt: Plan | null = null;
  /** Bezug der Muster für diese Form (Mitte und Halbmesser im Blatt), fest, solange es dieselbe Form ist */
  private blattBezug: { cx: number; cy: number; r: number } | null = null;
  /** beim nächsten Rechnen: Muster und Dehnung von der Blase der Studie übernehmen (die Übergabe beim Aufblasen) */
  private blase: { bezug: { cx: number; cy: number; r: number }; dehnung: Float32Array } | null = null;
  /**
   * Während der Übergabe von der Blase: ihre Dehnung je Punkt der Anzeige beim Übernehmen. Solange die Haut von der Blase in die Form
   * schnalzt, läuft die Dehnung von diesem Wert auf 1 (die Farben kommen an, wenn die Form ankommt); erst danach zeigt sie wieder, wie
   * sich die Fläche ändert. (Gegen die Fläche gemessen, zeigte sie beim Schnalzen den Unterschied zwischen Blase und Form: bei einer
   * geladenen Form ein fleckiges Muster, das sekundenlang nachklang.)
   */
  private uebergabeDe: Float32Array | null = null;
  /** so weit ist die Dehnung noch von 1 entfernt (größter Betrag über die Rechenpunkte); 0: ausgeklungen */
  dehnungRest = 0;
  /**
   * A3: so viele Gerätepunkte ist eine Einheit des Werks im Bild lang (Ozzy setzt es je Bild: die größte Ansicht, die die Haut
   * zeigt); 0: unbekannt, dann höchstens zwei Stufen wie bis zum 17.11.
   */
  bildMass = 0;
  /** Arbeitsfelder für Muster je feinem Punkt (wiederverwendet) */
  /** B3: Plan und Stufen des gezeigten Netzes, und seine Kanten des Rechennetzes (erst gerechnet, wenn jemand sie braucht) */
  private netzVon: { plan: GlattPlan; stufen: number } | null = null;
  private netzKantenSpeicher: { plan: GlattPlan; stufen: number; kanten: Uint32Array } | null = null;
  private mischX: Float32Array | undefined;
  private mischY: Float32Array | undefined;
  private kanten: { index: Uint32Array; liste: Int32Array } | null = null;

  /** Neues Netz im Werk (nach `geometrieNeu`): Der Plan wird beim nächsten Rechnen neu angelegt */
  topologieNeu(): void {
    // der alte Plan bleibt bis zum neuen: Muster und Dehnung gehen an derselben Stelle weiter (S2, kein Sprung beim Netzwechsel)
    if (this.p) this.alt = this.p;
    this.p = null;
  }

  /**
   * Die Übergabe von der Blase (S2): Beim nächsten Rechnen bekommt die Haut das Muster und die Dehnung der Blase, damit die Seifenhaut
   * an der Übergabe gleich aussieht. Das Muster der Blase ist die Lage ihrer flachen Haut im Blatt (um `cx`, `cy`, geteilt durch `r`;
   * hier in Einheiten des Werks): Jeder Punkt der Form bekommt dieselbe Funktion seiner eigenen Lage, das ist überall stetig. Die
   * Dehnung kommt je Rechenpunkt (Ozzy mischt sie mit der Zuordnung der Übergabe aus den drei Punkten der Blase dort). Bis zum 17.11.
   * nahm jeder Punkt beides vom nächsten Punkt der Blase: Bei einer geladenen Form, die anders liegt als ihre Blase, gab das Scherben.
   */
  vonBlase(bezug: { cx: number; cy: number; r: number }, dehnung: Float32Array): void {
    this.blase = { bezug, dehnung };
  }

  /**
   * B3 (17.11.): die Kanten des Rechennetzes auf der gezeigten Haut, als Paare ihrer Punkte (über die Mittelpunkte der Verfeinerung:
   * Sie liegen auf der gewölbten Fläche); null, solange nichts gezeigt wird. Dieselbe Liste, solange Netz und Stufen dieselben sind.
   */
  netzKanten(): Uint32Array | null {
    const v = this.netzVon;
    if (!v || !this.netz) return null;
    const sp = this.netzKantenSpeicher;
    if (sp && sp.plan === v.plan && sp.stufen === v.stufen) return sp.kanten;
    const kanten = v.plan.netzKanten(v.stufen);
    this.netzKantenSpeicher = { plan: v.plan, stufen: v.stufen, kanten };
    return kanten;
  }

  /**
   * B4: die Haut vor ⌘Z: die gezeigten Lagen ihrer Punkte (`lagen`, je Punkt der Anzeige); für das Netz danach: wo jeder seiner
   * Punkte beginnt (`start`, einmal je Netz bestimmt, `flussStart`); wie lange sie schon fließt (s)
   */
  private fluss: { lagen: Float64Array; start: Float64Array | null; plan: Plan | null; t: number } | null = null;
  /**
   * B4 (17.11.): ⌘Z fließt zurück, auch die Haut (bis dahin sprang sie, während die Linien glitten): merkt die gezeigte Haut von jetzt
   * (auch mitten im Fließen); in den nächsten Bildern gleitet jeder Punkt von seinem Ort davor an seinen neuen, so lange und so wie
   * die Linien (`werkBlatt.rueckfluss`). Geblendet werden die Punkte der Rechnung, die glatte Fläche wird wie immer daraus gerechnet:
   * So fließt sie auch, wenn ⌘Z das Netz ändert (schon ein kleiner Zug verdichtet es).
   */
  rueckfluss(): void {
    const g = this.p;
    if (!g || !this.netz || !(FLUSS_DAUER > 0)) {
      this.fluss = null;
      return;
    }
    this.fluss = { lagen: Float64Array.from(g.lagen), start: null, plan: null, t: 0 };
  }
  /**
   * B4: wo jeder Punkt des Netzes von jetzt (`g`, Lagen `L`) beginnt, damit die Haut aussieht wie vorher. Die Netze davor und danach
   * haben keine gemeinsamen Nummern (schon ein kleiner Zug verdichtet und ordnet neu; gemessen: Punkte gleicher Nummer liegen im Mittel
   * ein Fünftel der Form auseinander). Deshalb als Höhenfeld über der Haut von jetzt: Jeder Punkt der Haut von vorher sucht den
   * nächsten Ort auf der Haut von jetzt und gibt seinen Abstand dorthin an die Ecken des Dreiecks dort; Punkte ohne Treffer nehmen
   * das Mittel ihrer Nachbarn, zweimal geglättet. (Umgekehrt, vom Netz von jetzt aus den nächsten Ort auf der Haut von vorher zu
   * suchen, trifft eine herausgezogene Spitze nicht: Die Haut begann dann schon fast am Ziel, mit welligem Rand.)
   */
  private flussStart(F: NonNullable<WerkHaut['fluss']>, g: Plan, L: Float64Array): Float64Array {
    const N = g.quelle.length;
    const I = g.plan.index(0);
    const summe = new Float64Array(3 * N);
    const gew = new Float64Array(N);
    const suche = dreieckSuche(L, I);
    const T = TREFFER;
    const A = F.lagen;
    for (let o = 0; o + 2 < A.length; o += 3) {
      suche(A[o]!, A[o + 1]!, A[o + 2]!);
      for (const [v, w] of [[T.a, T.wa], [T.b, T.wb], [T.c, T.wc]] as const) {
        if (!(w > 1e-9)) continue;
        for (let x = 0; x < 3; x++) summe[3 * v + x] = summe[3 * v + x]! + w * (A[o + x]! - (T.wa * L[3 * T.a + x]! + T.wb * L[3 * T.b + x]! + T.wc * L[3 * T.c + x]!));
        gew[v] = gew[v]! + w;
      }
    }
    const feld = new Float64Array(3 * N);
    const da = new Uint8Array(N);
    for (let v = 0; v < N; v++) {
      if (!(gew[v]! > 1e-6)) continue;
      da[v] = 1;
      for (let x = 0; x < 3; x++) feld[3 * v + x] = summe[3 * v + x]! / gew[v]!;
    }
    // Punkte ohne Treffer: das Mittel ihrer Nachbarn, die schon einen Wert haben (höchstens acht Runden nach außen)
    const nach = new Float64Array(3 * N);
    const zahl = new Float64Array(N);
    const runde = (nur: boolean, anteil: number): boolean => {
      nach.fill(0);
      zahl.fill(0);
      for (let t = 0; t + 2 < I.length; t += 3) {
        for (let k = 0; k < 3; k++) {
          const a = I[t + k]!;
          const b = I[t + ((k + 1) % 3)]!;
          for (const [u, v] of [[a, b], [b, a]] as const) {
            if (!da[u] || (nur && da[v])) continue;
            for (let x = 0; x < 3; x++) nach[3 * v + x] = nach[3 * v + x]! + feld[3 * u + x]!;
            zahl[v] = zahl[v]! + 1;
          }
        }
      }
      let neu = false;
      for (let v = 0; v < N; v++) {
        if (!(zahl[v]! > 0) || (nur && da[v])) continue;
        for (let x = 0; x < 3; x++) feld[3 * v + x] = feld[3 * v + x]! * (1 - anteil) + (nach[3 * v + x]! / zahl[v]!) * anteil;
        if (!da[v]) neu = true;
      }
      if (nur) for (let v = 0; v < N; v++) if (zahl[v]! > 0) da[v] = 1;
      return neu;
    };
    for (let k = 0; k < 8 && runde(true, 1); k++);
    runde(false, 0.5);
    runde(false, 0.5);
    const st = new Float64Array(L.length);
    for (let i = 0; i < L.length; i++) st[i] = L[i]! + feld[i]!;
    return st;
  }
  /** das nächste `rechnen` rechnet ganz, auch wenn die Haut liegt wie zuletzt (das Clipping wurde umgeschaltet: `spiegelSeite`) */
  ganzNeu(): void {
    this.letzte = null;
  }

  /**
   * Clipping (18.11.): die Seite je feinem Punkt für den Schnitt an der Spiegelebene (`HautWerte.spiegelSchnitt`). Gesetzt nur an den
   * Dreiecken, in denen ein Punkt einer Hälfte gerade hinter der Ebene liegt (dort trifft sie ihr Spiegelbild und endet); überall
   * sonst 0, dort wird nie geschnitten. Mit einem Schnitt überall (wie im Prüffenster) blieb längs der Mitte ein feiner Streifen frei
   * (Florian, 18.11.: „beim solid ist immer diese mittellinie“): Die glatte Anzeige schwingt dicht an der Mitte um die Ebene.
   */
  private spiegelSeite(g: Plan, stufen: number, z: HautNetz): void {
    // (verschmolzen: die Seite der Hälfte jedes Punkts; frei mit Spiegelbild: die Seite, auf der die Form liegt)
    const S = werk.G.clipping ? werk.clipSeiten() : null;
    const N = g.quelle.length;
    const L = g.lagen;
    let da = false;
    // (erst ab derselben Weite, ab der beim Loslassen eine Naht entsteht: Dicht an einer Kante in der Mitte liegt ein Punkt schon
    // einmal um Haaresbreite hinter der Ebene, dort ist nichts zu schneiden)
    if (S && werk.ueberDerMitte()) da = true;
    if (!da || !S) {
      if (this.spiegelSchnitt) z.seite.fill(0);
      this.spiegelSchnitt = false;
      return;
    }
    const grob = this.seiteGrob && this.seiteGrob.length === N ? this.seiteGrob : (this.seiteGrob = new Float32Array(N));
    grob.fill(0);
    const I = g.index;
    for (let t = 0; t < I.length; t += 3) {
      let hinter = false;
      for (let e = 0; e < 3; e++) {
        const d = I[t + e]!;
        const sv = S.von(g.quelle[d]!);
        if (sv !== 0 && sv * L[3 * d + 2]! < 0) hinter = true;
      }
      if (!hinter) continue;
      for (let e = 0; e < 3; e++) {
        const d = I[t + e]!;
        grob[d] = S.von(g.quelle[d]!);
      }
    }
    z.seite.set(g.plan.weiterreichen(stufen, grob));
    this.spiegelSchnitt = true;
  }

  /**
   * Etappe 5 (der Verbund): dieselbe Haut auf einer gröberen Stufe. Die Verfeinerung hängt neue Punkte nur an (die alten bleiben, wo
   * sie sind, mit denselben Normalen und Werten): Die ersten `punkte` Punkte des gezeigten Netzes mit den Dreiecken `index` sind die
   * Haut auf der Stufe `stufe` (höchstens die gezeigte). null: noch kein Netz.
   */
  netzAufStufe(stufe: number): { punkte: number; index: Uint32Array; stufe: number } | null {
    const v = this.netzVon;
    if (!v || !this.netz) return null;
    const k = Math.max(0, Math.min(v.stufen, Math.round(stufe)));
    return { punkte: v.plan.punkte(k), index: v.plan.index(k), stufe: k };
  }

  /** die feinste Stufe des gezeigten Netzes mit höchstens so vielen Dreiecken (wenigstens das Netz der Rechnung selbst) */
  stufeMitHoechstens(dreiecke: number): number {
    const v = this.netzVon;
    if (!v) return 0;
    let k = v.stufen;
    while (k > 0 && v.plan.index(k).length / 3 > dreiecke) k--;
    return k;
  }

  /** B4: fließt die Haut gerade zurück */
  get fliesst(): boolean {
    return this.fluss !== null;
  }

  /** eine neue Form (aus der Silhouette, geladen, neu): Muster und Dehnung beginnen von vorn */
  neueForm(): void {
    this.blattBezug = null;
    this.alt = null;
    this.p = null;
  }

  private anlegen(I: Uint32Array): Plan {
    const haut = werk.haut;
    const n = haut.n;
    const quelle = werk.anzeigeQuelle;
    const N = quelle.length;
    const skin = (a: number, b: number): number => (a < b ? a * n + b : b * n + a);
    // Kanten der Haut auf Linien mit Pfad: von welcher Probe zu welcher, ob hart
    const linie = new Map<number, { schluessel: number; von: number; hart: boolean }>();
    werk.loops.forEach((l, li) => {
      if (!werk.exakt(l) || !l.proben.every((q) => q.ecken[0] === q.ecken[1] && q.ecken[1] === q.ecken[2])) return;
      const hd = kanteBei(l, werk.loops);
      const kette = l.proben.map((q) => q.ecken[0]);
      const m = kette.length;
      for (let j = 0; j < (l.art === 'ring' ? m - 1 : m); j++) {
        const k = (j + 1) % m;
        const hart = hd[j] === 1 && hd[k] === 1;
        for (const sp of l.art === 'mitte' ? [false] : [false, true]) {
          const a = sp ? haut.spiegel[kette[j]!]! : kette[j]!;
          const b = sp ? haut.spiegel[kette[k]!]! : kette[k]!;
          if (a < 0 || b < 0 || a === b) continue;
          const s = skin(a, b);
          if (linie.has(s)) continue;
          linie.set(s, { schluessel: ort(li, j, sp), von: a, hart });
        }
      }
    });
    const kanten: LinienKante[] = [];
    const wo = new Map<number, number[]>();
    const gesehen = new Set<number>();
    if (linie.size)
      for (let t = 0; t < I.length; t += 3)
        for (let e = 0; e < 3; e++) {
          const da = I[t + e]!;
          const db = I[t + ((e + 1) % 3)]!;
          const qa = quelle[da]!;
          const qb = quelle[db]!;
          const eintrag = linie.get(skin(qa, qb));
          if (!eintrag) continue;
          const s = da < db ? da * N + db : db * N + da;
          if (gesehen.has(s)) continue;
          gesehen.add(s);
          const liste = wo.get(eintrag.schluessel);
          if (liste) liste.push(kanten.length);
          else wo.set(eintrag.schluessel, [kanten.length]);
          kanten.push(qa === eintrag.von ? { a: da, b: db, hart: eintrag.hart } : { a: db, b: da, hart: eintrag.hart });
        }
    const fest = new Uint8Array(N);
    for (let d = 0; d < N; d++) fest[d] = werk.anzeigeKante[d]! > 0 ? 1 : 0;
    const p: Plan = {
      index: I,
      quelle,
      kenn: kennJetzt(),
      plan: new GlattPlan(I, N, fest, kanten),
      kanten,
      wo,
      lagen: new Float64Array(3 * N),
      pfade: new Float64Array(12 * kanten.length),
      blattX: new Float32Array(N),
      blattY: new Float32Array(N),
      bezug: new Float64Array(N),
      flaeche: new Float64Array(N),
      dehnung: new Float32Array(N).fill(1),
      kante: 0,
    };
    // Lage im Blatt und Bezug der Dehnung: aus dem Plan davor an derselben Stelle (Netzwechsel), sonst die Haut, wie sie jetzt ist
    this.lagenLesen(p, null);
    p.kante = langeKante(p.lagen, I);
    this.bezugSetzen(p, this.alt ?? this.p);
    this.alt = null;
    return p;
  }

  /** die Lagen der Punkte der Anzeige (aus der Haut oder aus vorgegebenen Lagen der Rechenpunkte) */
  private lagenLesen(p: Plan, vorgabe: Float64Array | null): void {
    const P = vorgabe ?? werk.haut.pos;
    const L = p.lagen;
    for (let d = 0; d < p.quelle.length; d++) {
      const q = 3 * p.quelle[d]!;
      L[3 * d] = P[q]!;
      L[3 * d + 1] = P[q + 1]!;
      L[3 * d + 2] = P[q + 2]!;
    }
  }

  /** Fläche je Punkt der Anzeige (ein Drittel seiner Dreiecke) */
  private flaecheRechnen(p: Plan): void {
    const L = p.lagen;
    const I = p.index;
    const A = p.flaeche;
    A.fill(0);
    for (let t = 0; t < I.length; t += 3) {
      const a = 3 * I[t]!;
      const b = 3 * I[t + 1]!;
      const c = 3 * I[t + 2]!;
      const ux = L[b]! - L[a]!;
      const uy = L[b + 1]! - L[a + 1]!;
      const uz = L[b + 2]! - L[a + 2]!;
      const vx = L[c]! - L[a]!;
      const vy = L[c + 1]! - L[a + 1]!;
      const vz = L[c + 2]! - L[a + 2]!;
      const f = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 6;
      A[I[t]!] = A[I[t]!]! + f;
      A[I[t + 1]!] = A[I[t + 1]!]! + f;
      A[I[t + 2]!] = A[I[t + 2]!]! + f;
    }
  }

  /**
   * Bezug der Farben (Lage im Blatt für die Muster, Fläche je Punkt für die Dehnung). Gibt es einen Plan davor (Netzwechsel), nimmt
   * jeder Punkt Muster und Dehnung vom nächsten Punkt des alten Plans: An derselben Stelle bleibt alles, wie es war (S2; vorher
   * begannen beide neu, Muster nach dem Kasten der Form von jetzt, Dehnung 1, und die Haut sprang). Sonst: die Haut, wie sie jetzt ist,
   * mit einem Bezug der Muster, der für diese Form fest bleibt.
   */
  private bezugSetzen(p: Plan, alt: Plan | null): void {
    const L = p.lagen;
    const N = p.quelle.length;
    this.flaecheRechnen(p);
    if (alt && alt.lagen.length >= 3) {
      uebernehmen(p, alt);
      return;
    }
    if (!this.blattBezug) {
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (let d = 0; d < N; d++) {
        x0 = Math.min(x0, L[3 * d]!);
        x1 = Math.max(x1, L[3 * d]!);
        y0 = Math.min(y0, L[3 * d + 1]!);
        y1 = Math.max(y1, L[3 * d + 1]!);
      }
      this.blattBezug = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: Math.max(1e-6, (x1 - x0) / 2, (y1 - y0) / 2) };
    }
    const { cx, cy, r } = this.blattBezug;
    for (let d = 0; d < N; d++) {
      p.blattX[d] = (L[3 * d]! - cx) / r;
      p.blattY[d] = (L[3 * d + 1]! - cy) / r;
    }
    p.bezug.set(p.flaeche);
  }

  /**
   * Die glatte Anzeige rechnen und ins Netz der Seifenhaut legen. `vorgabe`: Lagen der Rechenpunkte (3 je Punkt der Haut des Werks)
   * statt der Haut, wie sie ist (die Übergabe von der Blase). `voll`: die Stufen der Ruhe. `dt`, `beruhigen`: Der Bezug der Dehnung
   * folgt der Fläche mit dieser Zeitkonstante (s; 0: gar nicht). `angekommen`: mit `vorgabe`, wie weit die Haut von der Blase in der
   * Form ist (0 … 1): Die Dehnung der Blase läuft damit auf 1. Zurück: Ist das Netz neu (andere Zahl der Punkte)?
   */
  rechnen(vorgabe: Float64Array | null, voll: boolean, dt = 0, beruhigen = 0, angekommen = 1): boolean {
    const I = werk.anzeigeIndex;
    if (!this.p || this.p.index !== I || this.p.quelle !== werk.anzeigeQuelle || this.p.kenn !== kennJetzt()) this.p = this.anlegen(I);
    const g = this.p;
    const t0 = performance.now();
    this.lagenLesen(g, vorgabe);
    const L = g.lagen;
    // die Übergabe von der Blase: Muster und Dehnung an derselben Stelle wie auf der Blase
    if (this.blase) {
      const B = this.blase;
      this.blase = null;
      if (B.dehnung.length === werk.haut.n) {
        this.blattBezug = B.bezug;
        const { cx, cy, r } = B.bezug;
        // die Lage im Muster aus der Lage in der Form (nicht aus der Lage auf der Blase, die `vorgabe` jetzt gibt)
        const P = werk.haut.pos;
        this.flaecheRechnen(g);
        const de0 = new Float32Array(g.quelle.length);
        for (let d = 0; d < g.quelle.length; d++) {
          const q = g.quelle[d]!;
          g.blattX[d] = (P[3 * q]! - cx) / r;
          g.blattY[d] = (P[3 * q + 1]! - cy) / r;
          const de = Math.min(DEHNUNG_BIS, Math.max(DEHNUNG_AB, B.dehnung[q]!));
          de0[d] = de;
          g.bezug[d] = g.flaeche[d]! / de;
          g.dehnung[d] = de;
        }
        this.uebergabeDe = de0;
        this.letzte = null;
      }
    }
    // B4: nach ⌘Z fließt die Haut zurück: Jeder Punkt beginnt an der Stelle der Haut von vorher, die ihm am nächsten liegt
    const F = this.fluss;
    if (F && vorgabe) this.fluss = null;
    else if (F) {
      if (F.plan !== g || !F.start || F.start.length !== L.length) {
        F.start = this.flussStart(F, g, L);
        F.plan = g;
      }
      F.t += Math.max(0, dt);
      const u = F.t / FLUSS_DAUER;
      if (!(u < 1)) this.fluss = null;
      else {
        const w = Math.pow(1 - u, 3);
        const st = F.start;
        for (let i = 0; i < L.length; i++) L[i] = L[i]! + (st[i]! - L[i]!) * w;
      }
    }
    // Liegt die Haut genau wie beim letzten Mal, klingt nur die Dehnung nach (S3: vorher jedes Bild die ganze glatte Anzeige neu, rund
    // 5 ms, 2,5 s lang nach jedem Handgriff): kein neues Glätten, kein neuer Umriss, nur die Dehnung
    const v = this.letzte;
    // Zeigt sie dieselbe Lage schon feiner, als jetzt verlangt ist (zuletzt für die Ruhe gerechnet, verlangt ist die Stufe für den
    // Zug), bleibt sie fein. Sonst pendelt die Anzeige in der Ruhe zwischen zwei Stufen, wo die Ruhe eine Stufe mehr erlaubt als der
    // Zug: `glattInRuhe` lässt voll rechnen, das nächste Bild (die Dehnung klingt noch aus) rechnet wieder gröber, und so fort, ohne
    // jede Eingabe. Gemessen am 20.11. an „teat firefish“ mit Maul (23 380 Dreiecke) ab dreifacher Vergrößerung: 13-mal in 4 s voll
    // neu, jedes Mal ein Bild von rund 100 ms.
    const vollJetzt = voll || (!!v && v.voll);
    // (nicht, solange die Haut nach ⌘Z zurückfließt: Dann ändert sich die gezeigte Lage in jedem Bild)
    if (!vorgabe && !this.fluss && this.netz && v && v.plan === g && v.voll === vollJetzt && v.lagen.length === L.length && this.stufenFuer(g, vollJetzt) === this.stufen) {
      let gleich = true;
      for (let i = 0; i < L.length; i++)
        if (L[i] !== v.lagen[i]) {
          gleich = false;
          break;
        }
      if (gleich) {
        this.dehnungFolgen(g, dt, beruhigen, true);
        g.plan.mischen(this.stufen, g.dehnung, this.netz.dehnung);
        this.dehnungNr++;
        this.nurDehnung = true;
        this.ms = performance.now() - t0;
        return false;
      }
    }
    this.nurDehnung = false;
    // Pfadstücke: erst jede Linienkante gerade, dann die Stücke der Loops, an die Punkte der Haut gelegt, wie sie gerade sind
    const K = g.pfade;
    g.kanten.forEach((k, i) => {
      for (let x = 0; x < 3; x++) {
        const a = L[3 * k.a + x]!;
        const b = L[3 * k.b + x]!;
        K[12 * i + x] = a;
        K[12 * i + 3 + x] = a + (b - a) / 3;
        K[12 * i + 6 + x] = b - (b - a) / 3;
        K[12 * i + 9 + x] = b;
      }
    });
    const stufen = this.stufenFuer(g, voll);
    if (g.kanten.length && stufen > 0)
      werk.loops.forEach((l, li) => {
        const stuecke = werk.pfadStuecke(l, li);
        if (!stuecke) return;
        for (const e of stuecke)
          for (const sp of l.art === 'mitte' ? [0] : [0, 1]) {
            const plaetze = g.wo.get(ort(li, e.ja, sp === 1));
            if (!plaetze) continue;
            const c = e.k.map((q) => [q.x, q.y, sp ? -q.z : q.z] as const);
            for (const i of plaetze) {
              const k = g.kanten[i]!;
              for (let x = 0; x < 3; x++) {
                K[12 * i + 3 + x] = c[1]![x]! + (L[3 * k.a + x]! - c[0]![x]!);
                K[12 * i + 6 + x] = c[2]![x]! + (L[3 * k.b + x]! - c[3]![x]!);
              }
            }
          }
      });
    const fein = g.plan.rechnen(L, K, stufen, GLATT_RUHE);
    const index = g.plan.index(stufen);
    this.netzVon = { plan: g.plan, stufen };
    // Dehnung je Punkt der Anzeige (der Bezug folgt langsam), weitergereicht in die feinen Punkte
    this.flaecheRechnen(g);
    const de0 = this.uebergabeDe;
    if (vorgabe && de0 && de0.length === g.dehnung.length) {
      // die Übergabe von der Blase: ihre Dehnung läuft auf 1, während die Haut in die Form schnalzt; der Bezug geht mit
      const a = Math.min(1, Math.max(0, angekommen));
      let rest = 0;
      for (let d = 0; d < de0.length; d++) {
        const de = 1 + (de0[d]! - 1) * (1 - a);
        g.dehnung[d] = de;
        g.bezug[d] = g.flaeche[d]! / de;
        rest = Math.max(rest, Math.abs(de - 1));
      }
      this.dehnungRest = rest;
    } else {
      if (!vorgabe) this.uebergabeDe = null;
      this.dehnungFolgen(g, dt, beruhigen, false);
    }
    const n = fein.pos.length / 3;
    let neu = false;
    if (!this.netz || this.netz.pos.length !== fein.pos.length || this.netz.index !== index) {
      this.netz = {
        pos: new Float32Array(3 * n),
        normal: new Float32Array(3 * n),
        index,
        hoehe: new Float32Array(n),
        seite: new Float32Array(n),
        blatt: new Float32Array(2 * n),
        dehnung: new Float32Array(n),
        sicht: new Float32Array(n).fill(1),
      };
      neu = true;
    }
    const z = this.netz;
    const f = this.f;
    let zMax = 1e-6;
    for (let v = 0; v < n; v++) zMax = Math.max(zMax, Math.abs(fein.pos[3 * v + 2]!));
    // Muster und Dehnung stetig auf die feinen Punkte (A2, 17.11.: vorher kopierte jeder neue Punkt ein Ende seiner Kante)
    const bx = (this.mischX = g.plan.mischen(stufen, g.blattX, this.mischX));
    const by = (this.mischY = g.plan.mischen(stufen, g.blattY, this.mischY));
    g.plan.mischen(stufen, g.dehnung, z.dehnung);
    for (let v = 0; v < n; v++) {
      const wz = fein.pos[3 * v + 2]!;
      z.pos[3 * v] = fein.pos[3 * v]! / f + this.mitte.x;
      z.pos[3 * v + 1] = fein.pos[3 * v + 1]! / f + this.mitte.y;
      z.pos[3 * v + 2] = wz / f;
      z.hoehe[v] = Math.abs(wz) / zMax;
      z.blatt[2 * v] = bx[v]!;
      z.blatt[2 * v + 1] = by[v]!;
    }
    z.normal.set(fein.nor);
    this.dehnungNr++;
    this.spiegelSeite(g, stufen, z);
    this.stufen = stufen;
    this.ms = performance.now() - t0;
    if (!voll) this.geaendert = performance.now();
    this.version++;
    if (!vorgabe) {
      if (!this.letzte || this.letzte.lagen.length !== L.length) this.letzte = { plan: g, voll, lagen: Float64Array.from(L) };
      else {
        this.letzte.plan = g;
        this.letzte.voll = voll;
        this.letzte.lagen.set(L);
      }
    } else this.letzte = null;
    return neu;
  }

  /**
   * Dehnung je Punkt der Anzeige: Fläche gegen ihren Bezug; der Bezug folgt der Fläche mit der Zeitkonstante `beruhigen` (s; 0: gar
   * nicht). `ausklingen`: Steht die Haut und ist die Dehnung fast weg, endet sie genau bei 1 (dann braucht es kein Bild mehr).
   */
  private dehnungFolgen(g: Plan, dt: number, beruhigen: number, ausklingen: boolean): void {
    const k = dt > 0 && beruhigen > 0 ? 1 - Math.exp(-dt / beruhigen) : 0;
    let rest = 0;
    for (let d = 0; d < g.flaeche.length; d++) {
      if (k > 0) g.bezug[d] = g.bezug[d]! + (g.flaeche[d]! - g.bezug[d]!) * k;
      let de = g.flaeche[d]! / Math.max(1e-9, g.bezug[d]!);
      // nur so weit geführt, wie die Farbe sie zeigt: Was darüber hinausginge, sähe man nicht, es klänge aber noch lange nach
      if (de < DEHNUNG_AB) {
        de = DEHNUNG_AB;
        g.bezug[d] = g.flaeche[d]! / de;
      } else if (de > DEHNUNG_BIS) {
        de = DEHNUNG_BIS;
        g.bezug[d] = g.flaeche[d]! / de;
      }
      g.dehnung[d] = de;
      const r = Math.abs(de - 1);
      if (r > rest) rest = r;
    }
    if (ausklingen && rest < DEHNUNG_AUS) {
      g.bezug.set(g.flaeche);
      g.dehnung.fill(1);
      rest = 0;
    }
    this.dehnungRest = rest;
  }

  /**
   * Für Proben: Dehnung und Muster je Punkt der Anzeige (Spannweiten; wie viele Punkte mehr als 5 % gedehnt oder gestaucht sind), dazu
   * die Stufen der Anzeige und wie lang eine lange Kante des Netzes im Bild ist (Gerätepunkte, ohne Stufen)
   */
  musterStand(): { punkte: number; deMin: number; deMax: number; gedehnt: number; rest: number; blatt: [number, number, number, number]; stufen: number; kanteImBild: number } | null {
    const g = this.p;
    if (!g) return null;
    let deMin = Infinity;
    let deMax = -Infinity;
    let gedehnt = 0;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let d = 0; d < g.dehnung.length; d++) {
      const de = g.dehnung[d]!;
      deMin = Math.min(deMin, de);
      deMax = Math.max(deMax, de);
      if (Math.abs(de - 1) > 0.05) gedehnt++;
      x0 = Math.min(x0, g.blattX[d]!);
      x1 = Math.max(x1, g.blattX[d]!);
      y0 = Math.min(y0, g.blattY[d]!);
      y1 = Math.max(y1, g.blattY[d]!);
    }
    return { punkte: g.dehnung.length, deMin, deMax, gedehnt, rest: this.dehnungRest, blatt: [x0, x1, y0, y1], stufen: this.stufen, kanteImBild: g.kante * this.bildMass };
  }

  /**
   * So viele Stufen bekommt die Anzeige jetzt: nach der Größe im Bild (`bildMass`), begrenzt durch die Zahl der Dreiecke (`voll`: in
   * der Ruhe; sonst die Grenze, solange sich die Haut ändert). `?fein=<n>` legt sie fest.
   */
  private stufenFuer(g: Plan, voll: boolean): number {
    if (werk.FEIN >= 0) return werk.FEIN;
    const dreiecke = g.index.length / 3;
    const grenze = voll ? werk.GLATT_HOECHSTENS : werk.GLATT_IM_ZUG;
    let hoechstens = 0;
    while (hoechstens < STUFEN_HOECHSTENS && 4 ** (hoechstens + 1) * dreiecke <= grenze) hoechstens++;
    if (!(this.bildMass > 0) || !(g.kante > 0)) return Math.min(hoechstens, 2);
    const kante = g.kante * this.bildMass;
    let s = this.stufen;
    const fein = kante / 2 ** s;
    if (fein > KANTE_BIS || fein < KANTE_AB) s = Math.round(Math.log2(kante / KANTE_ZIEL));
    return Math.max(0, Math.min(hoechstens, s));
  }

  /** Lassen sich in der Ruhe mehr Stufen zeigen? */
  feinerMoeglich(): boolean {
    return !!this.p && this.stufen < this.stufenFuer(this.p, true);
  }

  /** Passt die Zahl der Stufen nicht mehr zur Größe im Bild (nach Zoomen oder einem Wechsel der Ansicht)? Dann neu rechnen. */
  stufenWechsel(): boolean {
    const v = this.letzte;
    return !!this.p && !!this.netz && !!v && this.stufenFuer(this.p, v.voll) !== this.stufen;
  }

  /** Umriss der glatten Anzeige von einer Achse (0 = x, Front; 1 = y, Top; 2 = z, Seite): Strecken in der Welt, je 6 Zahlen */
  umriss(achse: 0 | 1 | 2, eilig = false): Float32Array {
    // nur neu, wenn sich die Haut seit dem letzten Mal bewegt hat (S3: vorher jedes Bild aus dem feinen Netz); während sich die Haut
    // bewegt (`eilig`) höchstens alle UMRISS_MS, und dann ist er veraltet, bis das nächste Bild ihn holt
    const alt = this.umrissSpeicher.get(achse);
    if (alt && alt.version === this.version && alt.netz === this.netz) return alt.seg;
    const jetzt = performance.now();
    if (alt && eilig && alt.netz === this.netz && jetzt - alt.t < UMRISS_MS) {
      this.umrissVeraltet = true;
      return alt.seg;
    }
    // Front und Top in einem Durchgang (dieselben Dreiecke, dieselben Kanten)
    const beide = achse !== 2 ? this.umrissRechnen([0, 1]) : this.umrissRechnen([2]);
    beide.forEach((seg, k) => this.umrissSpeicher.set(achse !== 2 ? k : 2, { version: this.version, netz: this.netz, seg, t: jetzt }));
    return this.umrissSpeicher.get(achse)!.seg;
  }

  private umrissRechnen(achsen: (0 | 1 | 2)[]): Float32Array[] {
    // (samt Spiegelbild, wenn es gezeigt wird)
    const z = this.zeigeNetz;
    if (!z) return achsen.map(() => new Float32Array(0));
    const I = z.index;
    const P = z.pos;
    if (!this.kanten || this.kanten.index !== I) {
      const karte = new Map<number, number>();
      const liste: number[] = [];
      const m = P.length / 3;
      for (let t = 0; t < I.length / 3; t++)
        for (let k = 0; k < 3; k++) {
          const a = I[t * 3 + k]!;
          const b = I[t * 3 + ((k + 1) % 3)]!;
          const s = Math.min(a, b) * m + Math.max(a, b);
          const vorher = karte.get(s);
          if (vorher === undefined) {
            karte.set(s, liste.length / 4);
            liste.push(a, b, t, -1);
          } else liste[vorher * 4 + 3] = t;
        }
      this.kanten = { index: I, liste: Int32Array.from(liste) };
    }
    const nT = I.length / 3;
    // je Dreieck ein Bit je Achse: zeigt seine Fläche zur Achse hin
    const bits = new Uint8Array(nT);
    for (let t = 0; t < nT; t++) {
      const a = I[t * 3]! * 3;
      const b = I[t * 3 + 1]! * 3;
      const c = I[t * 3 + 2]! * 3;
      const ux = P[b]! - P[a]!;
      const uy = P[b + 1]! - P[a + 1]!;
      const uz = P[b + 2]! - P[a + 2]!;
      const vx = P[c]! - P[a]!;
      const vy = P[c + 1]! - P[a + 1]!;
      const vz = P[c + 2]! - P[a + 2]!;
      bits[t] = (uy * vz - uz * vy > 0 ? 1 : 0) | (uz * vx - ux * vz > 0 ? 2 : 0) | (ux * vy - uy * vx > 0 ? 4 : 0);
    }
    const ausListen: number[][] = achsen.map(() => []);
    const masken = achsen.map((x) => 1 << x);
    const K = this.kanten.liste;
    for (let e = 0; e < K.length; e += 4) {
      const t2 = K[e + 3]!;
      if (t2 < 0) continue;
      const wechsel = bits[K[e + 2]!]! ^ bits[t2]!;
      if (!wechsel) continue;
      const a = K[e]! * 3;
      const b = K[e + 1]! * 3;
      for (let k = 0; k < achsen.length; k++) if (wechsel & masken[k]!) ausListen[k]!.push(P[a]!, P[a + 1]!, P[a + 2]!, P[b]!, P[b + 1]!, P[b + 2]!);
    }
    return ausListen.map((l) => Float32Array.from(l));
  }

  /** Ausdehnung der Haut des Werks in der Welt, um die Mitte (für den Raum) */
  masse(): { rx: number; ry: number; tiefe: number } {
    const P = werk.haut.pos;
    let rx = 0;
    let ry = 0;
    let tiefe = 0;
    for (let i = 0; i < P.length; i += 3) {
      rx = Math.max(rx, Math.abs(P[i]! / this.f));
      ry = Math.max(ry, Math.abs(P[i + 1]! / this.f));
      tiefe = Math.max(tiefe, Math.abs(P[i + 2]! / this.f));
    }
    return { rx, ry, tiefe };
  }
}

/** Die Linie der Mitte (die Silhouette im Werk), wenn es sie gibt */
export function mitteLinie(): { l: (typeof werk.loops)[number]; li: number } | null {
  const li = werk.loops.findIndex((l) => l.art === 'mitte');
  return li < 0 ? null : { l: werk.loops[li]!, li };
}

/**
 * Pfad und Punkte der Linie der Mitte in der Welt (z = 0), wie das Prüffenster sie zeichnet (`pfadKurven`: im Zug die Punkte des Zugs
 * und seine Griffe). `schritte` Abtastungen je Stück. Zurück: Lagen des Pfads (x, y je Paar) und der sichtbaren Punkte mit ihrer Nummer.
 */
export function mittePfad(f: number, mx: number, my: number, schritte = 16): { pfad: number[]; punkte: { i: number; x: number; y: number }[] } | null {
  const m = mitteLinie();
  if (!m) return null;
  const { l, li } = m;
  const P = l.punkte;
  const n = P.length;
  if (n < 2 || !P.every((p) => p.ein && p.aus)) return null;
  const zug = werk.zug;
  const neu = zug ? zug.griffeNeu[li] : null;
  const lage = (p: (typeof P)[number]): { x: number; y: number } => (zug && !zug.griff ? p.cur : p.ref);
  const pfad: number[] = [];
  for (let i = 0; i < n; i++) {
    const A = P[i]!;
    const E = P[(i + 1) % n]!;
    const a = lage(A);
    const e = lage(E);
    const ga = neu?.[i]?.aus ?? A.aus!;
    const gb = neu?.[(i + 1) % n]?.ein ?? E.ein!;
    const c1 = { x: a.x + ga.x, y: a.y + ga.y };
    const c2 = { x: e.x + gb.x, y: e.y + gb.y };
    for (let j = 0; j < schritte; j++) {
      const t = j / schritte;
      const u = 1 - t;
      const b0 = u * u * u;
      const b1 = 3 * u * u * t;
      const b2 = 3 * u * t * t;
      const b3 = t * t * t;
      pfad.push((b0 * a.x + b1 * c1.x + b2 * c2.x + b3 * e.x) / f + mx, (b0 * a.y + b1 * c1.y + b2 * c2.y + b3 * e.y) / f + my);
    }
  }
  const punkte = P.map((p, i) => ({ i, p }))
    .filter(({ p }) => !p.vonSelbst)
    .map(({ i, p }) => ({ i, x: lage(p).x / f + mx, y: lage(p).y / f + my }));
  return { pfad, punkte };
}
