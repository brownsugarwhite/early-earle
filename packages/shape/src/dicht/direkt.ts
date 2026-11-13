// Plan vom 12.11.2026, Schritt 3: Beweis „Haut direkt aus den Linien“ (Weg A). Nur Kern, nichts davon rechnet im Fenster.
// Probe und Bilder: `apps/editor/scripts/pruefen/form-direkt.ts`; Bericht: `docs/research/2026-11-13-beweis-haut-direkt.md`.
//
// Die heutige Rechnung (`ausKurven.ts`) kennt je Punkt nur, wie stark die Haut gewölbt ist, ohne Richtung, und liest das an den
// Linien an der Haut selbst ab. Hier gehen Normalen ein, und die Lagen folgen daraus in einer Lösung:
//
// 1. **Richtung verteilen** (`richtungVerteilen`). Jeder Punkt der Haut bekommt eine Normale: an den Linien die gegebene
//    (`linienRichtung`), dazwischen so gleichmäßig wie möglich (jede Normale ist das gewichtete Mittel ihrer Nachbarn, auf
//    Länge 1 gebracht; Gewichte nach der Geometrie). Auf Länge 1 gebracht wird in jedem Durchgang, nicht erst am Ende: Je
//    Komponente gemittelt und danach normiert (Stanko u. a. 2016) läge das Feld über einer Kugel, die nur die Mittellinie hat,
//    ganz in der Mittelebene. Der Start (die Normalen der Haut, wie sie ist) entscheidet, auf welcher Seite die Haut liegt.
// 2. **Lagen** (`lagenLoesen`). Gesucht ist die Fläche durch die Linien, die diese Normalen hat. Je Kante steht eine Zeile: Die
//    Kante steht senkrecht auf dem Mittel der Normalen ihrer beiden Enden. Für zwei Punkte auf einem Kreis oder einer Kugel gilt
//    das genau; es ist dieselbe Aussage wie „Laplace der Lagen = Wölbung mal Normale“, nur dass die Wölbung nicht an der alten
//    Haut gemessen wird, sondern mit den neuen Lagen in der Gleichung steht. Deshalb bleibt keine alte Dicke stehen. Wo die
//    Punkte in der Fläche liegen, sagen zwei weitere Zeilen je Punkt: Der Anteil des Laplace in der Fläche bleibt, wie er beim
//    Anlegen war (Gewichte nach der Geometrie beim Anlegen; so bleibt dichtes Netz dicht, und nichts kriecht). Ein lineares
//    Ausgleichsproblem; solange die Normalen dieselben sind, ist auch die Matrix dieselbe.
//
// **Befund vom 13.11.2026** (Zahlen und Bilder im Bericht):
// - Schritt 2 für sich trägt. Aus den Normalen der Haut und den Linien kommt jede geprüfte Form zurück (Kapsel 0,7, Florians
//   Formen im Mittel 0,1 bis 0,15 Einheiten, keine neue umgestülpte Stelle). Zieht man die Linien, folgt die Haut in einer
//   Lösung: Ein Schlauch behält gestreckt seine Dicke (−0,1 %), das Horn am „strange bird“ auch (heute +10 bis +16 %), hin
//   und zurück gibt bitgleich dieselbe Haut. Die Normalen müssen dabei ein gemerkter Stand sein: Liest man sie nach jedem
//   Rechnen neu von der Haut, kriecht die Fläche jedes Mal um 0,5 bis 1 Einheit.
// - Schritt 1 trägt nicht. Normalen, die so verteilt sind, gehören zu einer Fläche mit überall gleicher Wölbung (Ruh und Vilms
//   1970). Kugel und Schlauch zwischen Ringen sind solche Flächen und bleiben genau. Ein Schlauch mit runder Kappe ist keine:
//   Halten ihn nur die Profillinien, wird das Ende keilförmig (bis 12,7 von 50 Einheiten daneben), ein Rüssel aus zwei
//   Profillinien wird flach (Breite zu Höhe 0,36) und stülpt sich um.
// - Die Richtung aus dem Liniennetz (`linienRichtung`) stimmt an der Kugel auf 0,5°, an Florians Formen nicht: gegen die
//   Normalen der Haut je Linie im Mittel bis 15° (eine 39°), an einzelnen Stellen bis 68°. Als Wahrheit genommen, ändert sie
//   seine Formen stark (bis 69 Einheiten) und stülpt 80 bis 110 Dreiecke um.
// - `woelbung: 'linien'` und `'haut'` sind Versuche dazu, woher beim Verteilen die fehlende Angabe kommen kann (die Wölbung an
//   den Linien an der Haut gemessen bzw. überall die der Haut). An der Kapsel: ohne 12,7, von den Linien 6,1, von der Haut 0,8.
//
// **Zweiter Beweis „B“ (13.11.2026, Probe `form-direkt-b.ts`):** Schritt 2 als Werkzeug für fertige Haut. Dazu `stand` (die
// Haut beim Anlegen ist genau die Lösung für unbewegte Linien; die Normalen werden jedes Mal von der Haut gelesen),
// `linienDrehung` und `normalenDrehen` (dreht eine Linie, drehen die Normalen der Haut mit) und `lagenNachfuehren` (dieselbe
// Aufgabe ohne neu zu zerlegen). Gemessen: Anfassen und hin und zurück auf 10⁻⁷, Horn um 30° gebogen ohne neue Knicke, Dicke
// bis auf 1 bis 5 % gehalten (heute 6 bis 16 %). Neue Haut runden kann es nicht, und die heutige Rechnung lässt sich dafür
// nicht auf einen Teil der Haut beschränken: kein Ersatz für sie.
//
// Die Gewichte stammen aus der Haut beim Anlegen (intrinsische Delaunay-Triangulierung, `intrinsisch.ts`).

import type { NormalSystem, NormalZeile } from '../loeser/normalSystem';
import { normalSystemZerlegt } from '../loeser/zerlegung';
import { type IntrinsischeGewichte, intrinsischeGewichte } from './intrinsisch';
import { type Bindungen, type Haut, hautNormalenMax } from './kurven';
import type { BindungsPlan, Loop } from './loops';

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = (): number => (uhr ? uhr.now() : Date.now());

export type DirektOptionen = {
  /** Gewicht der Zeilen, die die Punkte in der Fläche verteilen, gegen die Zeilen der Kanten (Standard 1) */
  verteilen?: number;
  /** Durchgänge beim Verteilen der Richtung, höchstens (Standard 20 000) */
  durchgaenge?: number;
  /** das Verteilen endet, wenn sich in einem Durchgang keine Normale um mehr dreht (Bogenmaß, Standard 1e-6) */
  genau?: number;
  /** Überrelaxation beim Verteilen (1 = Gauß-Seidel; Standard 1,7) */
  omega?: number;
  /** Punkte auf einer harten Linie (Kante an): Über sie wird keine Richtung verteilt, jede Seite verlässt die Linie für sich */
  hart?: Uint8Array | null;
  /** Gewicht einer Bindung, die nicht auf einem Punkt der Haut liegt (Standard 100) */
  bindung?: number;
  /**
   * Woher beim Verteilen der Richtung die Wölbung kommt (Kopf der Datei, Befund): `keine` = zwischen den Linien überall gleich
   * (Standard); `linien` = an den Linien wie an der Haut beim Anlegen gemessen, dazwischen gleichmäßig verteilt; `haut` =
   * überall wie die Haut beim Anlegen (die Haut behält ihre Form, so weit die Linien sie nicht ändern).
   */
  woelbung?: 'keine' | 'linien' | 'haut';
  /**
   * Fester Stand (zweiter Beweis, 13.11.): Die Haut, wie sie beim Anlegen ist, ist genau die Lösung für unbewegte Linien und die
   * Normalen der Haut. Was die Zeilen der Kanten an ihr nicht erfüllen, bleibt als rechte Seite stehen (je Kante ihr Anteil längs
   * des Mittels der Normalen). Dann bewegt sich beim Anfassen und beim neuen Anlegen nichts, und die Normalen müssen kein eigener
   * gemerkter Stand sein: Sie werden jedes Mal von der Haut gelesen.
   */
  stand?: boolean;
};

export type DirektZeiten = { verteilen: number; durchgaenge: number; rest: number; zeilen: number; zerlegen: number; loesen: number };

/**
 * Feste Felder für das Nachführen je Bild: die Kanten mit ihren Gewichten und ihrem Stand, je Bild ihr Mittel der Normalen; je Punkt
 * die Summe seiner Gewichte und der Anteil des Laplace in der Fläche beim Anlegen; die losen Bindungen; Arbeitsfelder.
 */
type Schnell = {
  kI: Int32Array;
  kJ: Int32Array;
  kG: Float64Array;
  kF: Float64Array;
  /** 1: die Normale dieses Endes zählt nicht (Punkt einer harten Linie) */
  kHi: Uint8Array;
  kHj: Uint8Array;
  kR: Float64Array;
  kM: Float64Array;
  W: Float64Array;
  T0: Float64Array;
  T: Float64Array;
  feld: Float64Array;
  /** Drehvektor je Punkt vom letzten `drehungSetzen` (null: keine Drehung) */
  omega: Float64Array | null;
  /** lose Bindungen: Nummer der Bindung */
  lose: Int32Array;
  x: Float64Array;
  r: Float64Array;
  z: Float64Array;
  p: Float64Array;
  Ap: Float64Array;
  kurz: Float64Array;
};
/** Verteilen einer Drehung: Nummer je freiem Punkt (−1: gegeben), die zerlegte Matrix, die Kanten zu gegebenen Punkten */
type Drehsystem = { maske: Uint8Array; nr: Int32Array; n: number; sys: NormalSystem; rI: Int32Array; rJ: Int32Array; rG: Float64Array };

/**
 * Haut direkt aus den Linien. Einmal angelegt (Gewichte aus der Haut, wie sie ist), dann je Stand der Linien `rechnen`: Richtung
 * verteilen, Lagen lösen. Bindungen auf einem Punkt der Haut (eingesetzte Linien) halten ihn genau; andere gehen als Zeilen ein.
 */
export class HautDirekt {
  readonly gewichte: IntrinsischeGewichte;
  /** je Punkt die Bindung, die ihn hält, oder −1 */
  private readonly fest: Int32Array;
  /** je Punkt seine Nummer unter den freien Punkten oder −1 */
  private readonly nr: Int32Array;
  private readonly nFrei: number;
  private readonly hart: Uint8Array | null;
  private readonly opt: Required<Omit<DirektOptionen, 'hart'>>;
  /** fester Stand: je Kante (Eintrag der Gewichte, Nachbar > Punkt) ihr Anteil längs des Mittels der Normalen beim Anlegen */
  private readonly versatz: Float64Array | null = null;
  /** Normalen der Haut beim Anlegen (nach Max) */
  private readonly nor0: Float64Array;
  /** Laplace der Lagen beim Anlegen je Punkt (Σ Gewicht · (Nachbar − Punkt)) */
  private readonly lx0: Float64Array;
  /** Quelle beim Verteilen der Richtung je Punkt (in der Fläche beim Anlegen; null: keine) */
  private readonly quelle: Float64Array | null;
  /** die gemessene und verteilte Wölbung je Punkt (nur mit `woelbung: 'linien'`) */
  readonly woelbung: Float64Array | null = null;
  /** die Zerlegung des letzten `lagenLoesen` (Vorkonditionierer für `lagenNachfuehren`) */
  private system: NormalSystem | null = null;
  /** feste Felder für das Nachführen je Bild (`bereiten`) */
  private schnell: Schnell | null = null;
  /** die Matrix, die eine Drehung der Linien über die Haut verteilt (einmal zerlegt je Satz von Linienpunkten) */
  private drehen: Drehsystem | null = null;
  /** das Feld der Normalen der letzten Rechnung (Start der nächsten) */
  feld: Float64Array | null = null;
  readonly zeiten: DirektZeiten = { verteilen: 0, durchgaenge: 0, rest: 0, zeilen: 0, zerlegen: 0, loesen: 0 };

  constructor(
    private readonly h: Haut,
    private readonly bind: Bindungen,
    opt: DirektOptionen = {},
  ) {
    this.opt = {
      verteilen: opt.verteilen ?? 1,
      durchgaenge: opt.durchgaenge ?? 20000,
      genau: opt.genau ?? 1e-6,
      omega: opt.omega ?? 1.7,
      bindung: opt.bindung ?? 100,
      woelbung: opt.woelbung ?? 'keine',
      stand: opt.stand ?? false,
    };
    this.hart = opt.hart ?? null;
    this.gewichte = intrinsischeGewichte(h);
    const n = h.n;
    this.fest = new Int32Array(n).fill(-1);
    const m = bind.ecken.length / 3;
    for (let j = 0; j < m; j++) {
      const v = bind.ecken[3 * j]!;
      if (bind.ecken[3 * j + 1] !== v || bind.ecken[3 * j + 2] !== v) continue;
      if (this.fest[v]! < 0) this.fest[v] = j;
    }
    this.nr = new Int32Array(n).fill(-1);
    let k = 0;
    for (let v = 0; v < n; v++) if (this.fest[v]! < 0) this.nr[v] = k++;
    this.nFrei = k;
    this.nor0 = hautNormalenMax(h);
    const { start: S, nb, w } = this.gewichte;
    const P = h.pos;
    this.lx0 = new Float64Array(3 * n);
    for (let i = 0; i < n; i++)
      for (let q = S[i]!; q < S[i + 1]!; q++) {
        const j = nb[q]!;
        const g = w[q]!;
        for (let c = 0; c < 3; c++) this.lx0[3 * i + c] = this.lx0[3 * i + c]! + g * (P[3 * j + c]! - P[3 * i + c]!);
      }
    this.quelle = null;
    const N0 = this.nor0;
    if (this.opt.stand) {
      const V = new Float64Array(nb.length);
      const hart = this.hart;
      for (let i = 0; i < n; i++)
        for (let q = S[i]!; q < S[i + 1]!; q++) {
          const j = nb[q]!;
          if (j <= i) continue;
          const hi = hart ? hart[i]! : 0;
          const hj = hart ? hart[j]! : 0;
          if (hi && hj) continue;
          const f = hi || hj ? 1 : 0.5;
          let r = 0;
          for (let c = 0; c < 3; c++) r += f * ((hi ? 0 : N0[3 * i + c]!) + (hj ? 0 : N0[3 * j + c]!)) * (P[3 * j + c]! - P[3 * i + c]!);
          V[q] = r;
        }
      this.versatz = V;
    }
    if (this.opt.woelbung === 'haut') {
      // Quelle = was dem gewichteten Mittel der Nachbarnormalen fehlt, damit die Normalen der Haut stehen bleiben
      const s = new Float64Array(3 * n);
      for (let i = 0; i < n; i++) {
        let sx = 0;
        let sy = 0;
        let sz = 0;
        for (let q = S[i]!; q < S[i + 1]!; q++) {
          const j = nb[q]!;
          if (j === i || (this.hart && this.hart[j])) continue;
          const g = w[q]!;
          sx += g * N0[3 * j]!;
          sy += g * N0[3 * j + 1]!;
          sz += g * N0[3 * j + 2]!;
        }
        const d = sx * N0[3 * i]! + sy * N0[3 * i + 1]! + sz * N0[3 * i + 2]!;
        s[3 * i] = -(sx - d * N0[3 * i]!);
        s[3 * i + 1] = -(sy - d * N0[3 * i + 1]!);
        s[3 * i + 2] = -(sz - d * N0[3 * i + 2]!);
      }
      this.quelle = s;
    } else if (this.opt.woelbung === 'linien') {
      // Wölbung H an den Punkten der Linien messen (Laplace der Lagen längs der Normale, durch die Fläche des Punkts; auf der
      // Kugel 1/R, auf dem Schlauch 1/(2r)), dazwischen gleichmäßig verteilen, und ihr Gefälle ist die Quelle: Wo die Wölbung
      // längs der Haut zunimmt, drehen die Normalen dorthin schneller (Laplace der Normale in der Fläche = 2 · Gefälle von H).
      const H = new Float64Array(n);
      const anLinie = new Uint8Array(n);
      // gemessen wird je Dreieck an den Normalen der Haut (H = ½ · Divergenz der Normale; für Normalen, die im Dreieck linear
      // laufen, genau, auch auf schmalen Dreiecken) und je Punkt über seine Dreiecke nach Fläche gemittelt. Der Laplace der
      // Lagen je Punkt streute an den schmalen Dreiecken neben eingesetzten Linien von −2 bis 55 (Soll 10, Schlauch).
      {
        const T = h.tri;
        const summe = new Float64Array(n);
        const flaeche = new Float64Array(n);
        for (let t = 0; t < T.length; t += 3) {
          const a = T[t]!;
          const b = T[t + 1]!;
          const c = T[t + 2]!;
          const ux = P[3 * b]! - P[3 * a]!;
          const uy = P[3 * b + 1]! - P[3 * a + 1]!;
          const uz = P[3 * b + 2]! - P[3 * a + 2]!;
          const vx = P[3 * c]! - P[3 * a]!;
          const vy = P[3 * c + 1]! - P[3 * a + 1]!;
          const vz = P[3 * c + 2]! - P[3 * a + 2]!;
          const nx = uy * vz - uz * vy;
          const ny = uz * vx - ux * vz;
          const nz = ux * vy - uy * vx;
          const nn = nx * nx + ny * ny + nz * nz;
          if (!(nn > 1e-24)) continue;
          // Steigung der Hutfunktion einer Ecke = (n × Gegenkante) / |n|², n die Dreiecksnormale mit Länge 2 · Fläche
          // Gegenkanten: zu a: c − b = v − u, zu b: a − c = −v, zu c: b − a = u
          let div = 0;
          for (const [k, ex, ey, ez] of [
            [a, vx - ux, vy - uy, vz - uz],
            [b, -vx, -vy, -vz],
            [c, ux, uy, uz],
          ] as const) {
            const gx = ny * ez - nz * ey;
            const gy = nz * ex - nx * ez;
            const gz = nx * ey - ny * ex;
            div += (N0[3 * k]! * gx + N0[3 * k + 1]! * gy + N0[3 * k + 2]! * gz) / nn;
          }
          const A = 0.5 * Math.sqrt(nn);
          for (const k of [a, b, c]) {
            summe[k] = summe[k]! + A * 0.5 * div;
            flaeche[k] = flaeche[k]! + A;
          }
        }
        for (let i = 0; i < n; i++) {
          if (this.fest[i]! < 0 || (this.hart && this.hart[i]) || !(flaeche[i]! > 0)) continue;
          H[i] = summe[i]! / flaeche[i]!;
          anLinie[i] = 1;
        }
      }
      // Start zwischen den Linien: das Mittel der gemessenen Werte
      let m = 0;
      let mz = 0;
      for (let i = 0; i < n; i++)
        if (anLinie[i]) {
          m += H[i]!;
          mz++;
        }
      m = mz ? m / mz : 0;
      for (let i = 0; i < n; i++) if (!anLinie[i]) H[i] = m;
      let weg = Infinity;
      for (let d = 0; d < this.opt.durchgaenge && weg > 1e-9 * Math.max(1e-9, Math.abs(m)); d++) {
        weg = 0;
        for (let i = 0; i < n; i++) {
          if (anLinie[i] || (this.hart && this.hart[i])) continue;
          let su = 0;
          let W = 0;
          for (let q = S[i]!; q < S[i + 1]!; q++) {
            const j = nb[q]!;
            if (j === i || (this.hart && this.hart[j])) continue;
            su += w[q]! * H[j]!;
            W += w[q]!;
          }
          if (!(W > 0)) continue;
          const neu = H[i]! + this.opt.omega * (su / W - H[i]!);
          weg = Math.max(weg, Math.abs(neu - H[i]!));
          H[i] = neu;
        }
      }
      (this as { woelbung: Float64Array | null }).woelbung = H;
      // Gefälle je Dreieck, auf die Punkte verteilt (je Ecke ein Drittel der Dreiecksfläche): Quelle = −2 · Fläche · Gefälle
      const s = new Float64Array(3 * n);
      const T = h.tri;
      for (let t = 0; t < T.length; t += 3) {
        const a = T[t]!;
        const b = T[t + 1]!;
        const c = T[t + 2]!;
        const ux = P[3 * b]! - P[3 * a]!;
        const uy = P[3 * b + 1]! - P[3 * a + 1]!;
        const uz = P[3 * b + 2]! - P[3 * a + 2]!;
        const vx = P[3 * c]! - P[3 * a]!;
        const vy = P[3 * c + 1]! - P[3 * a + 1]!;
        const vz = P[3 * c + 2]! - P[3 * a + 2]!;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const nn = nx * nx + ny * ny + nz * nz;
        if (!(nn > 1e-24)) continue;
        // Gefälle · 2 · Fläche = N × (H_a · (c − b) + H_b · (a − c) + H_c · (b − a)), N die Einheitsnormale; |n| = 2 · Fläche
        const ex = H[a]! * (vx - ux) + H[b]! * -vx + H[c]! * ux;
        const ey = H[a]! * (vy - uy) + H[b]! * -vy + H[c]! * uy;
        const ez = H[a]! * (vz - uz) + H[b]! * -vz + H[c]! * uz;
        const l = Math.sqrt(nn);
        // (N × e) = Gefälle · 2 · Fläche; je Ecke Fläche/3 · Gefälle = (N × e) / 6; Quelle = −2 · das
        const gx = (ny * ez - nz * ey) / l;
        const gy = (nz * ex - nx * ez) / l;
        const gz = (nx * ey - ny * ex) / l;
        for (const v of [a, b, c]) {
          s[3 * v] = s[3 * v]! - gx / 3;
          s[3 * v + 1] = s[3 * v + 1]! - gy / 3;
          s[3 * v + 2] = s[3 * v + 2]! - gz / 3;
        }
      }
      this.quelle = s;
    }
  }

  /**
   * Schritt 1: die Richtung der Linien (`richtung`, 3 je Punkt, NaN: keine) über die Haut verteilen. `start`: Normalen, von
   * denen aus verteilt wird (3 je Punkt). Zurück kommt das Feld (3 je Punkt, Länge 1).
   */
  richtungVerteilen(richtung: Float64Array, start: Float64Array): Float64Array {
    const t0 = jetzt();
    const { start: S, nb, w } = this.gewichte;
    const n = this.h.n;
    const sp = this.h.spiegel;
    const hart = this.hart;
    const f = Float64Array.from(start);
    const gegeben = new Uint8Array(n);
    for (let v = 0; v < n; v++) {
      if (Number.isFinite(richtung[3 * v]!) && !(hart && hart[v])) {
        f[3 * v] = richtung[3 * v]!;
        f[3 * v + 1] = richtung[3 * v + 1]!;
        f[3 * v + 2] = richtung[3 * v + 2]!;
        gegeben[v] = 1;
      }
      const l = Math.hypot(f[3 * v]!, f[3 * v + 1]!, f[3 * v + 2]!) || 1;
      f[3 * v] = f[3 * v]! / l;
      f[3 * v + 1] = f[3 * v + 1]! / l;
      f[3 * v + 2] = f[3 * v + 2]! / l;
    }
    const om = this.opt.omega;
    const Q = this.quelle;
    const N0 = this.nor0;
    let d = 0;
    let weg = Infinity;
    for (; d < this.opt.durchgaenge && weg > this.opt.genau; d++) {
      weg = 0;
      for (let v = 0; v < n; v++) {
        if (gegeben[v] || (hart && hart[v])) continue;
        const p = sp[v]!;
        // ein Paar ist eine Unbekannte: gerechnet wird der Punkt mit der kleineren Nummer, der Partner ist sein Spiegelbild
        if (p >= 0 && p < v && !gegeben[p] && !(hart && hart[p])) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        for (let q = S[v]!; q < S[v + 1]!; q++) {
          const j = nb[q]!;
          if (j === v || (hart && hart[j])) continue;
          const g = w[q]!;
          sx += g * f[3 * j]!;
          sy += g * f[3 * j + 1]!;
          sz += g * f[3 * j + 2]!;
        }
        if (Q) {
          // die Quelle liegt in der Fläche beim Anlegen: mit der Normale mitgedreht (kürzeste Drehung von der alten zur jetzigen)
          const q0 = Q[3 * v]!;
          const q1 = Q[3 * v + 1]!;
          const q2 = Q[3 * v + 2]!;
          const c = N0[3 * v]! * f[3 * v]! + N0[3 * v + 1]! * f[3 * v + 1]! + N0[3 * v + 2]! * f[3 * v + 2]!;
          const k = c > -0.999 ? (q0 * f[3 * v]! + q1 * f[3 * v + 1]! + q2 * f[3 * v + 2]!) / (1 + c) : 0;
          sx += q0 - k * (N0[3 * v]! + f[3 * v]!);
          sy += q1 - k * (N0[3 * v + 1]! + f[3 * v + 1]!);
          sz += q2 - k * (N0[3 * v + 2]! + f[3 * v + 2]!);
        }
        if (p === v) sz = 0;
        let l = Math.hypot(sx, sy, sz);
        if (!(l > 1e-12)) continue;
        const ax = f[3 * v]!;
        const ay = f[3 * v + 1]!;
        const az = f[3 * v + 2]!;
        let x = ax + om * (sx / l - ax);
        let y = ay + om * (sy / l - ay);
        let z = az + om * (sz / l - az);
        l = Math.hypot(x, y, z);
        if (!(l > 1e-9)) {
          // die Überrelaxation hat die Normale durch null geschickt: der einfache Schritt
          l = Math.hypot(sx, sy, sz);
          x = sx;
          y = sy;
          z = sz;
        }
        x /= l;
        y /= l;
        z /= l;
        weg = Math.max(weg, Math.hypot(x - ax, y - ay, z - az));
        f[3 * v] = x;
        f[3 * v + 1] = y;
        f[3 * v + 2] = z;
        if (p >= 0 && p !== v && !gegeben[p]) {
          f[3 * p] = x;
          f[3 * p + 1] = y;
          f[3 * p + 2] = -z;
        }
      }
    }
    this.zeiten.verteilen = jetzt() - t0;
    this.zeiten.durchgaenge = d;
    this.zeiten.rest = weg;
    return f;
  }

  /**
   * Die Drehung der Linien über die Haut verteilen und die Normalen der Haut beim Anlegen mitdrehen. `drehung`: Drehvektor je Punkt
   * (Achse mal Winkel, 3 je Punkt; NaN: keiner), an den Punkten der Linien aus `linienDrehung`. Dazwischen wird jede Komponente
   * gleichmäßig verteilt (Gewichte nach der Geometrie). Ohne Drehung kommen die Normalen der Haut zurück.
   */
  normalenDrehen(drehung: Float64Array): Float64Array {
    const { start: S, nb, w } = this.gewichte;
    const n = this.h.n;
    const sp = this.h.spiegel;
    const o = new Float64Array(3 * n);
    const gegeben = new Uint8Array(n);
    let irgend = false;
    for (let v = 0; v < n; v++)
      if (Number.isFinite(drehung[3 * v]!)) {
        gegeben[v] = 1;
        for (let c = 0; c < 3; c++) {
          o[3 * v + c] = drehung[3 * v + c]!;
          if (o[3 * v + c] !== 0) irgend = true;
        }
      }
    if (irgend) {
      const om = this.opt.omega;
      let weg = Infinity;
      for (let d = 0; d < this.opt.durchgaenge && weg > 1e-7; d++) {
        weg = 0;
        for (let v = 0; v < n; v++) {
          if (gegeben[v]) continue;
          const p = sp[v]!;
          if (p >= 0 && p < v && !gegeben[p]) continue;
          let sx = 0;
          let sy = 0;
          let sz = 0;
          let W = 0;
          for (let q = S[v]!; q < S[v + 1]!; q++) {
            const j = nb[q]!;
            if (j === v) continue;
            const g = w[q]!;
            sx += g * o[3 * j]!;
            sy += g * o[3 * j + 1]!;
            sz += g * o[3 * j + 2]!;
            W += g;
          }
          if (!(W > 0)) continue;
          // auf der Mittelebene dreht aus Symmetrie nur etwas um die Achse quer zu ihr
          let x = p === v ? 0 : o[3 * v]! + om * (sx / W - o[3 * v]!);
          let y = p === v ? 0 : o[3 * v + 1]! + om * (sy / W - o[3 * v + 1]!);
          const z = o[3 * v + 2]! + om * (sz / W - o[3 * v + 2]!);
          if (!Number.isFinite(x + y + z)) {
            x = 0;
            y = 0;
          }
          weg = Math.max(weg, Math.abs(x - o[3 * v]!), Math.abs(y - o[3 * v + 1]!), Math.abs(z - o[3 * v + 2]!));
          o[3 * v] = x;
          o[3 * v + 1] = y;
          o[3 * v + 2] = z;
          // das Spiegelbild einer Drehung: dieselbe um die gespiegelte Achse, andersherum
          if (p >= 0 && p !== v && !gegeben[p]) {
            o[3 * p] = -x;
            o[3 * p + 1] = -y;
            o[3 * p + 2] = z;
          }
        }
      }
    }
    const N0 = this.nor0;
    const f = new Float64Array(3 * n);
    for (let v = 0; v < n; v++) {
      const ax = o[3 * v]!;
      const ay = o[3 * v + 1]!;
      const az = o[3 * v + 2]!;
      const th = Math.hypot(ax, ay, az);
      const x = N0[3 * v]!;
      const y = N0[3 * v + 1]!;
      const z = N0[3 * v + 2]!;
      if (!(th > 1e-12)) {
        f[3 * v] = x;
        f[3 * v + 1] = y;
        f[3 * v + 2] = z;
        continue;
      }
      // Rodrigues: v cos θ + (k × v) sin θ + k (k · v)(1 − cos θ)
      const kx = ax / th;
      const ky = ay / th;
      const kz = az / th;
      const c = Math.cos(th);
      const si = Math.sin(th);
      const kv = kx * x + ky * y + kz * z;
      f[3 * v] = x * c + (ky * z - kz * y) * si + kx * kv * (1 - c);
      f[3 * v + 1] = y * c + (kz * x - kx * z) * si + ky * kv * (1 - c);
      f[3 * v + 2] = z * c + (kx * y - ky * x) * si + kz * kv * (1 - c);
    }
    return f;
  }

  /** Schritt 2: die Lagen aus den Zielen der Bindungen (3 je Bindung) und dem Feld der Normalen; schreibt in die Haut */
  lagenLoesen(ziele: Float64Array, feld: Float64Array): void {
    const t0 = jetzt();
    const { zeilen, rechts } = this.zeilenBauen(ziele, feld);
    const t1 = jetzt();
    const N = 3 * this.nFrei;
    const sys = normalSystemZerlegt(N, zeilen, 1e-12);
    this.system = sys;
    const t2 = jetzt();
    this.schreiben(ziele, sys.loesenSpalte(this.rechteSeite(zeilen, rechts)));
    this.zeiten.zeilen = t1 - t0;
    this.zeiten.zerlegen = t2 - t1;
    this.zeiten.loesen = jetzt() - t2;
  }

  /**
   * Dieselbe Aufgabe wie `lagenLoesen`, ohne neu zu zerlegen (zweiter Beweis, 13.11.): Drehen die Normalen mit den Linien, ändert
   * sich die Matrix mit jedem Bild. Hier wird mit der Zerlegung des letzten `lagenLoesen` als Vorkonditionierer nachgeführt
   * (konjugierte Gradienten, Start sind die Lagen der Haut, wie sie ist). Zurück kommt, wie viele Schritte es brauchte, bis der Rest
   * unter `genau` mal der rechten Seite lag (höchstens `hoechstens`).
   */
  lagenNachfuehren(ziele: Float64Array, feld: Float64Array, genau = 1e-6, hoechstens = 80): number {
    const sys = this.system;
    if (!sys) throw new Error('HautDirekt: vor dem Nachführen einmal `lagenLoesen`');
    const { zeilen, rechts } = this.zeilenBauen(ziele, feld);
    const N = 3 * this.nFrei;
    const b = this.rechteSeite(zeilen, rechts);
    /** Matrix mal Vektor: Σ Gewicht · Zeile · (Zeile · x) */
    const mal = (x: Float64Array): Float64Array => {
      const y = new Float64Array(N);
      for (const z of zeilen) {
        let t = 0;
        for (let k = 0; k < z.index.length; k++) t += z.wert[k]! * x[z.index[k]!]!;
        t *= z.gewicht;
        if (t === 0) continue;
        for (let k = 0; k < z.index.length; k++) y[z.index[k]!] = y[z.index[k]!]! + t * z.wert[k]!;
      }
      return y;
    };
    const x = new Float64Array(N);
    const P = this.h.pos;
    for (let v = 0; v < this.h.n; v++) {
      const k = this.nr[v]!;
      if (k < 0) continue;
      x[3 * k] = P[3 * v]!;
      x[3 * k + 1] = P[3 * v + 1]!;
      x[3 * k + 2] = P[3 * v + 2]!;
    }
    const Ax = mal(x);
    const r = Float64Array.from(b, (q, i) => q - Ax[i]!);
    let bb = 0;
    for (let i = 0; i < N; i++) bb += b[i]! * b[i]!;
    const ziel = genau * genau * Math.max(bb, 1e-300);
    let z = sys.loesenSpalte(r);
    const p = Float64Array.from(z);
    let rz = 0;
    for (let i = 0; i < N; i++) rz += r[i]! * z[i]!;
    let it = 0;
    for (; it < hoechstens; it++) {
      let rr = 0;
      for (let i = 0; i < N; i++) rr += r[i]! * r[i]!;
      if (rr <= ziel) break;
      const Ap = mal(p);
      let pAp = 0;
      for (let i = 0; i < N; i++) pAp += p[i]! * Ap[i]!;
      if (!(pAp > 0)) break;
      const a = rz / pAp;
      for (let i = 0; i < N; i++) {
        x[i] = x[i]! + a * p[i]!;
        r[i] = r[i]! - a * Ap[i]!;
      }
      z = sys.loesenSpalte(r);
      let rzNeu = 0;
      for (let i = 0; i < N; i++) rzNeu += r[i]! * z[i]!;
      const be = rzNeu / rz;
      rz = rzNeu;
      for (let i = 0; i < N; i++) p[i] = z[i]! + be * p[i]!;
    }
    this.schreiben(ziele, x);
    return it;
  }

  // ---------- Nachführen je Bild ohne Aufbau (Einbau ins Fenster, 13.11.) ----------
  // Dieselbe Aufgabe wie `lagenLoesen`, aber die Zeilen stehen als feste Felder (je Bild werden nur die Normalen eingesetzt), die
  // Drehung der Linien wird mit einer einmal zerlegten Matrix verteilt, und nachgeführt wird in wenigen Schritten mit der
  // Zerlegung vom Anlegen als Vorkonditionierer. Gemessen am zweiten Beweis: je Bild 80 ms mit Aufbau der Zeilen (7 600 Punkte).

  /**
   * Einmal je Anfassen: die Zerlegung für die Normalen der Haut und die festen Felder; die Haut wird dabei nicht angefasst.
   * `ziele`: die Ziele der Bindungen, wie die Linien jetzt liegen.
   */
  bereiten(ziele: Float64Array): void {
    // nur zerlegen, nichts lösen: Die Haut bleibt bitgleich, wie sie ist (gelöst käme sie auf 10⁻⁷ genau zurück; im Fenster galt
    // der Stand danach als geändert, und der Hintergrund begann immer wieder von vorn)
    this.system = normalSystemZerlegt(3 * this.nFrei, this.zeilenBauen(ziele, this.nor0).zeilen, 1e-12);
    const { start: S, nb, w } = this.gewichte;
    const h = this.h;
    const n = h.n;
    const fest = this.fest;
    const hart = this.hart;
    const V = this.versatz;
    const kI: number[] = [];
    const kJ: number[] = [];
    const kG: number[] = [];
    const kF: number[] = [];
    const kHi: number[] = [];
    const kHj: number[] = [];
    const kR: number[] = [];
    const W = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      for (let q = S[i]!; q < S[i + 1]!; q++) {
        const j = nb[q]!;
        const g = w[q]!;
        if (j === i || !(g > 0)) continue;
        W[i] = W[i]! + g;
        if (j < i || (fest[i]! >= 0 && fest[j]! >= 0)) continue;
        const hi = hart ? hart[i]! : 0;
        const hj = hart ? hart[j]! : 0;
        if (hi && hj) continue;
        kI.push(i);
        kJ.push(j);
        kG.push(g);
        kF.push(hi || hj ? 1 : 0.5);
        kHi.push(hi);
        kHj.push(hj);
        kR.push(V ? V[q]! : 0);
      }
    }
    const N0 = this.nor0;
    const L0 = this.lx0;
    const T0 = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      const d = L0[3 * i]! * N0[3 * i]! + L0[3 * i + 1]! * N0[3 * i + 1]! + L0[3 * i + 2]! * N0[3 * i + 2]!;
      for (let c = 0; c < 3; c++) T0[3 * i + c] = L0[3 * i + c]! - d * N0[3 * i + c]!;
    }
    const lose: number[] = [];
    const m = this.bind.ecken.length / 3;
    for (let j = 0; j < m; j++) {
      const e0 = this.bind.ecken[3 * j]!;
      if (this.bind.ecken[3 * j + 1] !== e0 || this.bind.ecken[3 * j + 2] !== e0) lose.push(j);
    }
    const feld = Float64Array.from(N0);
    this.schnell = {
      kI: Int32Array.from(kI),
      kJ: Int32Array.from(kJ),
      kG: Float64Array.from(kG),
      kF: Float64Array.from(kF),
      kHi: Uint8Array.from(kHi),
      kHj: Uint8Array.from(kHj),
      kR: Float64Array.from(kR),
      kM: new Float64Array(3 * kI.length),
      W,
      T0,
      T: Float64Array.from(T0),
      feld,
      omega: null,
      lose: Int32Array.from(lose),
      x: new Float64Array(3 * n),
      r: new Float64Array(3 * n),
      z: new Float64Array(3 * n),
      p: new Float64Array(3 * n),
      Ap: new Float64Array(3 * n),
      kurz: new Float64Array(3 * this.nFrei),
    };
    this.normalenEinsetzen();
  }

  /** je Kante das Mittel der Normalen ihrer Enden aus dem Feld von jetzt */
  private normalenEinsetzen(): void {
    const sn = this.schnell!;
    const { kI, kJ, kF, kHi, kHj, kM, feld } = sn;
    for (let e = 0; e < kI.length; e++) {
      const i = 3 * kI[e]!;
      const j = 3 * kJ[e]!;
      const f = kF[e]!;
      const a = kHi[e] ? 0 : 1;
      const b = kHj[e] ? 0 : 1;
      kM[3 * e] = f * (a * feld[i]! + b * feld[j]!);
      kM[3 * e + 1] = f * (a * feld[i + 1]! + b * feld[j + 1]!);
      kM[3 * e + 2] = f * (a * feld[i + 2]! + b * feld[j + 2]!);
    }
  }

  /**
   * Die Matrix, die eine Drehung der Linien über die Haut verteilt, für die Punkte, an denen `drehung` gegeben ist (nicht NaN):
   * Unbekannte sind die übrigen Punkte; je Kante eine Zeile (Nachbar − Punkt) mit ihrem Gewicht, das gibt genau den Laplace der
   * freien Punkte. Einmal zerlegt, solange die gegebenen Punkte dieselben sind.
   */
  private drehsystem(drehung: Float64Array): Drehsystem {
    const n = this.h.n;
    const alt = this.drehen;
    if (alt) {
      let gleich = true;
      for (let v = 0; v < n && gleich; v++) if ((drehung[3 * v] === drehung[3 * v] ? 1 : 0) !== alt.maske[v]) gleich = false;
      if (gleich) return alt;
    }
    const { start: S, nb, w } = this.gewichte;
    const maske = new Uint8Array(n);
    const nr = new Int32Array(n).fill(-1);
    let k = 0;
    for (let v = 0; v < n; v++) {
      if (drehung[3 * v] === drehung[3 * v]) maske[v] = 1;
      else nr[v] = k++;
    }
    const zeilen: NormalZeile[] = [];
    const rI: number[] = [];
    const rJ: number[] = [];
    const rG: number[] = [];
    for (let i = 0; i < n; i++)
      for (let q = S[i]!; q < S[i + 1]!; q++) {
        const j = nb[q]!;
        const g = w[q]!;
        if (j <= i || !(g > 0)) continue;
        if (maske[i] && maske[j]) continue;
        if (!maske[i] && !maske[j]) zeilen.push({ index: [nr[i]!, nr[j]!], wert: [-1, 1], gewicht: g });
        else {
          const frei = maske[i] ? j : i;
          const geg = maske[i] ? i : j;
          zeilen.push({ index: [nr[frei]!], wert: [1], gewicht: g });
          rI.push(nr[frei]!);
          rJ.push(geg);
          rG.push(g);
        }
      }
    const ds: Drehsystem = { maske, nr, n: k, sys: normalSystemZerlegt(k, zeilen, 1e-12), rI: Int32Array.from(rI), rJ: Int32Array.from(rJ), rG: Float64Array.from(rG) };
    this.drehen = ds;
    return ds;
  }

  /** die Matrix zum Verteilen der Drehung schon beim Anlegen zerlegen (`muster`: Drehvektoren mit NaN, wo keiner gegeben sein wird) */
  drehungBereiten(muster: Float64Array): void {
    let irgend = false;
    for (let v = 0; v < this.h.n && !irgend; v++) if (muster[3 * v] === muster[3 * v]) irgend = true;
    if (irgend) this.drehsystem(muster);
  }

  /**
   * Die Drehung der Linien für das nächste Nachführen setzen (Drehvektor je Punkt, NaN: keiner; null: keine Drehung): über die Haut
   * verteilt (genau, mit einer einmal zerlegten Matrix), die Normalen der Haut und der Anteil in der Fläche drehen mit.
   */
  drehungSetzen(drehung: Float64Array | null): void {
    const sn = this.schnell;
    if (!sn) throw new Error('HautDirekt: vor `drehungSetzen` einmal `bereiten`');
    const n = this.h.n;
    const N0 = this.nor0;
    const { feld, T, T0 } = sn;
    let irgend = false;
    if (drehung) for (let k = 0; k < drehung.length && !irgend; k++) if (drehung[k]! !== 0 && drehung[k] === drehung[k]) irgend = true;
    if (!drehung || !irgend) {
      feld.set(N0);
      T.set(T0);
      sn.omega = null;
      this.normalenEinsetzen();
      return;
    }
    const om = (sn.omega ??= new Float64Array(3 * n));
    const ds = this.drehsystem(drehung);
    const b = new Float64Array(3 * ds.n);
    for (let e = 0; e < ds.rI.length; e++) {
      const a = 3 * ds.rI[e]!;
      const j = 3 * ds.rJ[e]!;
      const g = ds.rG[e]!;
      b[a] = b[a]! + g * drehung[j]!;
      b[a + 1] = b[a + 1]! + g * drehung[j + 1]!;
      b[a + 2] = b[a + 2]! + g * drehung[j + 2]!;
    }
    const o = ds.sys.loesenSpalten(b, 3);
    const sp = this.h.spiegel;
    for (let v = 0; v < n; v++) {
      const k = ds.nr[v]!;
      let ax = k < 0 ? drehung[3 * v]! : o[3 * k]!;
      let ay = k < 0 ? drehung[3 * v + 1]! : o[3 * k + 1]!;
      const az = k < 0 ? drehung[3 * v + 2]! : o[3 * k + 2]!;
      // auf der Mittelebene dreht aus Symmetrie nur etwas um die Achse quer zu ihr
      if (sp[v] === v) {
        ax = 0;
        ay = 0;
      }
      om[3 * v] = ax;
      om[3 * v + 1] = ay;
      om[3 * v + 2] = az;
      const th = Math.hypot(ax, ay, az);
      const x = N0[3 * v]!;
      const y = N0[3 * v + 1]!;
      const z = N0[3 * v + 2]!;
      let fx = x;
      let fy = y;
      let fz = z;
      if (th > 1e-12) {
        const kx = ax / th;
        const ky = ay / th;
        const kz = az / th;
        const c = Math.cos(th);
        const si = Math.sin(th);
        const kv = kx * x + ky * y + kz * z;
        fx = x * c + (ky * z - kz * y) * si + kx * kv * (1 - c);
        fy = y * c + (kz * x - kx * z) * si + ky * kv * (1 - c);
        fz = z * c + (kx * y - ky * x) * si + kz * kv * (1 - c);
      }
      feld[3 * v] = fx;
      feld[3 * v + 1] = fy;
      feld[3 * v + 2] = fz;
      // der Anteil in der Fläche geht mit der Normale mit (kürzeste Drehung von der alten zur neuen, wie in `zeilenBauen`)
      const cs = x * fx + y * fy + z * fz;
      const t0 = T0[3 * v]!;
      const t1 = T0[3 * v + 1]!;
      const t2 = T0[3 * v + 2]!;
      if (cs > -0.999) {
        const kk = (t0 * fx + t1 * fy + t2 * fz) / (1 + cs);
        T[3 * v] = t0 - kk * (x + fx);
        T[3 * v + 1] = t1 - kk * (y + fy);
        T[3 * v + 2] = t2 - kk * (z + fz);
      } else {
        T[3 * v] = t0;
        T[3 * v + 1] = t1;
        T[3 * v + 2] = t2;
      }
    }
    this.normalenEinsetzen();
  }

  /**
   * Matrix mal Lagen (3 je Punkt der Haut, feste Punkte mit ihrer Lage) der Aufgabe von jetzt; `konst`: abzüglich der rechten Seite
   * (dann ist das Ergebnis das Gefälle). Einträge fester Punkte sind danach 0.
   */
  private anwenden(x: Float64Array, konst: boolean, ziele: Float64Array | null, aus: Float64Array): void {
    const sn = this.schnell!;
    const { kI, kJ, kG, kR, kM, W, T, feld, lose } = sn;
    const { start: S, nb, w } = this.gewichte;
    const n = this.h.n;
    const fest = this.fest;
    aus.fill(0);
    for (let e = 0; e < kI.length; e++) {
      const i = 3 * kI[e]!;
      const j = 3 * kJ[e]!;
      const mx = kM[3 * e]!;
      const my = kM[3 * e + 1]!;
      const mz = kM[3 * e + 2]!;
      let t = mx * (x[j]! - x[i]!) + my * (x[j + 1]! - x[i + 1]!) + mz * (x[j + 2]! - x[i + 2]!);
      if (konst) t -= kR[e]!;
      t *= kG[e]!;
      aus[j] = aus[j]! + t * mx;
      aus[j + 1] = aus[j + 1]! + t * my;
      aus[j + 2] = aus[j + 2]! + t * mz;
      aus[i] = aus[i]! - t * mx;
      aus[i + 1] = aus[i + 1]! - t * my;
      aus[i + 2] = aus[i + 2]! - t * mz;
    }
    const gt = this.opt.verteilen;
    for (let i = 0; i < n; i++) {
      const Wi = W[i]!;
      if (fest[i]! >= 0 || !(Wi > 0)) continue;
      let sx = -Wi * x[3 * i]!;
      let sy = -Wi * x[3 * i + 1]!;
      let sz = -Wi * x[3 * i + 2]!;
      for (let q = S[i]!; q < S[i + 1]!; q++) {
        const j = nb[q]!;
        const g = w[q]!;
        if (j === i || !(g > 0)) continue;
        sx += g * x[3 * j]!;
        sy += g * x[3 * j + 1]!;
        sz += g * x[3 * j + 2]!;
      }
      const d = sx * feld[3 * i]! + sy * feld[3 * i + 1]! + sz * feld[3 * i + 2]!;
      sx -= d * feld[3 * i]!;
      sy -= d * feld[3 * i + 1]!;
      sz -= d * feld[3 * i + 2]!;
      if (konst) {
        sx -= T[3 * i]!;
        sy -= T[3 * i + 1]!;
        sz -= T[3 * i + 2]!;
      }
      const f = gt / Wi;
      sx *= f;
      sy *= f;
      sz *= f;
      for (let q = S[i]!; q < S[i + 1]!; q++) {
        const j = nb[q]!;
        const g = w[q]!;
        if (j === i || !(g > 0)) continue;
        aus[3 * j] = aus[3 * j]! + g * sx;
        aus[3 * j + 1] = aus[3 * j + 1]! + g * sy;
        aus[3 * j + 2] = aus[3 * j + 2]! + g * sz;
      }
      aus[3 * i] = aus[3 * i]! - Wi * sx;
      aus[3 * i + 1] = aus[3 * i + 1]! - Wi * sy;
      aus[3 * i + 2] = aus[3 * i + 2]! - Wi * sz;
    }
    const gb = this.opt.bindung;
    for (let u = 0; u < lose.length; u++) {
      const j = lose[u]!;
      for (let c = 0; c < 3; c++) {
        let t = konst && ziele ? -ziele[3 * j + c]! : 0;
        for (let e = 0; e < 3; e++) t += this.bind.b[3 * j + e]! * x[3 * this.bind.ecken[3 * j + e]! + c]!;
        t *= gb;
        for (let e = 0; e < 3; e++) {
          const v = 3 * this.bind.ecken[3 * j + e]! + c;
          aus[v] = aus[v]! + t * this.bind.b[3 * j + e]!;
        }
      }
    }
    for (let v = 0; v < n; v++)
      if (fest[v]! >= 0) {
        aus[3 * v] = 0;
        aus[3 * v + 1] = 0;
        aus[3 * v + 2] = 0;
      }
  }

  /**
   * Vorkonditionierer: mit der Zerlegung vom Anlegen lösen, `r` (3 je Punkt) → `z` (3 je Punkt, feste Punkte 0). Sind die Normalen
   * gedreht, wird je Punkt zurückgedreht, gelöst und wieder hingedreht: Dreht alles um dieselbe Drehung, ist die gedrehte Aufgabe
   * genau die vom Anlegen in gedrehten Achsen; dreht es von Punkt zu Punkt etwas anders, stimmt das bis auf diesen Unterschied.
   * Ohne das kam das Nachführen bei 25° je Runde nur um ein Viertel näher (gemessen an der Kugel mit drei Loops).
   */
  private vorkonditionieren(r: Float64Array, z: Float64Array): void {
    const sn = this.schnell!;
    const nr = this.nr;
    const n = this.h.n;
    const kurz = sn.kurz;
    const om = sn.omega;
    for (let v = 0; v < n; v++) {
      const k = nr[v]!;
      if (k < 0) continue;
      if (om) drehe(r, 3 * v, om, 3 * v, -1, kurz, 3 * k);
      else {
        kurz[3 * k] = r[3 * v]!;
        kurz[3 * k + 1] = r[3 * v + 1]!;
        kurz[3 * k + 2] = r[3 * v + 2]!;
      }
    }
    const y = this.system!.loesenSpalte(kurz);
    for (let v = 0; v < n; v++) {
      const k = nr[v]!;
      if (k < 0) {
        z[3 * v] = 0;
        z[3 * v + 1] = 0;
        z[3 * v + 2] = 0;
      } else if (om) drehe(y, 3 * k, om, 3 * v, 1, z, 3 * v);
      else {
        z[3 * v] = y[3 * k]!;
        z[3 * v + 1] = y[3 * k + 1]!;
        z[3 * v + 2] = y[3 * k + 2]!;
      }
    }
  }

  /**
   * Die Haut zu den Zielen nachführen: höchstens `schritte` Schritte (konjugierte Gradienten von den Lagen der Haut aus, mit der
   * Zerlegung vom Anlegen). Zurück kommt der Rest danach, bezogen auf die rechte Seite (0: gelöst). Die Normalen sind die vom
   * letzten `drehungSetzen` (ohne: die der Haut beim Anlegen).
   */
  nachfuehrenSchnell(ziele: Float64Array, schritte: number): number {
    const sn = this.schnell;
    if (!sn || !this.system) throw new Error('HautDirekt: vor dem Nachführen einmal `bereiten`');
    const { x, r, z, p, Ap } = sn;
    const h = this.h;
    const n = h.n;
    const N = 3 * n;
    const fest = this.fest;
    const P = h.pos;
    for (let v = 0; v < n; v++) {
      const fj = fest[v]!;
      if (fj >= 0) {
        x[3 * v] = ziele[3 * fj]!;
        x[3 * v + 1] = ziele[3 * fj + 1]!;
        x[3 * v + 2] = ziele[3 * fj + 2]!;
      } else {
        x[3 * v] = P[3 * v]!;
        x[3 * v + 1] = P[3 * v + 1]!;
        x[3 * v + 2] = P[3 * v + 2]!;
      }
    }
    // Rest = −Gefälle; bezogen wird er auf das Gefälle ohne die Lagen der freien Punkte (die rechte Seite)
    this.anwenden(x, true, ziele, r);
    let rr = 0;
    for (let i = 0; i < N; i++) {
      r[i] = -r[i]!;
      rr += r[i]! * r[i]!;
    }
    this.vorkonditionieren(r, z);
    p.set(z);
    let rz = 0;
    for (let i = 0; i < N; i++) rz += r[i]! * z[i]!;
    const rr0 = rr;
    for (let it = 0; it < schritte && rr > 1e-24 && rz > 0; it++) {
      this.anwenden(p, false, null, Ap);
      let pAp = 0;
      for (let i = 0; i < N; i++) pAp += p[i]! * Ap[i]!;
      if (!(pAp > 0)) break;
      const a = rz / pAp;
      rr = 0;
      for (let i = 0; i < N; i++) {
        x[i] = x[i]! + a * p[i]!;
        r[i] = r[i]! - a * Ap[i]!;
        rr += r[i]! * r[i]!;
      }
      if (it + 1 >= schritte) break;
      this.vorkonditionieren(r, z);
      let rzNeu = 0;
      for (let i = 0; i < N; i++) rzNeu += r[i]! * z[i]!;
      const be = rzNeu / rz;
      rz = rzNeu;
      for (let i = 0; i < N; i++) p[i] = z[i]! + be * p[i]!;
    }
    // in die Haut schreiben, spiegelgleich genau
    const sp = h.spiegel;
    P.set(x);
    for (let v = 0; v < n; v++) {
      const q = sp[v]!;
      if (q < 0 || fest[v]! >= 0) continue;
      if (q === v) P[3 * v + 2] = 0;
      else if (q > v && fest[q]! < 0) {
        const x0 = (P[3 * v]! + P[3 * q]!) / 2;
        const y0 = (P[3 * v + 1]! + P[3 * q + 1]!) / 2;
        const z0 = (P[3 * v + 2]! - P[3 * q + 2]!) / 2;
        P[3 * v] = x0;
        P[3 * v + 1] = y0;
        P[3 * v + 2] = z0;
        P[3 * q] = x0;
        P[3 * q + 1] = y0;
        P[3 * q + 2] = -z0;
      }
    }
    return rr0 > 0 ? Math.sqrt(rr / rr0) : 0;
  }

  /** wie viele Punkte der Haut frei sind (nicht von einer Linie gehalten) */
  get freie(): number {
    return this.nFrei;
  }

  /** rechte Seite der Normalgleichungen: Σ Gewicht · rechts · Zeile */
  private rechteSeite(zeilen: readonly NormalZeile[], rechts: readonly number[]): Float64Array {
    const b = new Float64Array(3 * this.nFrei);
    for (let r = 0; r < zeilen.length; r++) {
      const z = zeilen[r]!;
      const gr = z.gewicht * rechts[r]!;
      if (gr === 0) continue;
      for (let t = 0; t < z.index.length; t++) b[z.index[t]!] = b[z.index[t]!]! + gr * z.wert[t]!;
    }
    return b;
  }

  /** die Lösung in die Haut schreiben: feste Punkte auf ihr Ziel, freie aus `x`; spiegelgleich genau */
  private schreiben(ziele: Float64Array, x: Float64Array): void {
    const h = this.h;
    const n = h.n;
    const fest = this.fest;
    const nr = this.nr;
    const P = h.pos;
    for (let v = 0; v < n; v++) {
      const fj = fest[v]!;
      if (fj >= 0) {
        P[3 * v] = ziele[3 * fj]!;
        P[3 * v + 1] = ziele[3 * fj + 1]!;
        P[3 * v + 2] = ziele[3 * fj + 2]!;
      } else {
        const k = 3 * nr[v]!;
        P[3 * v] = x[k]!;
        P[3 * v + 1] = x[k + 1]!;
        P[3 * v + 2] = x[k + 2]!;
      }
    }
    // spiegelgleich bis auf Rundung: genau machen
    const sp = h.spiegel;
    for (let v = 0; v < n; v++) {
      const p = sp[v]!;
      if (p < 0 || fest[v]! >= 0) continue;
      if (p === v) P[3 * v + 2] = 0;
      else if (p > v && fest[p]! < 0) {
        const x0 = (P[3 * v]! + P[3 * p]!) / 2;
        const y0 = (P[3 * v + 1]! + P[3 * p + 1]!) / 2;
        const z0 = (P[3 * v + 2]! - P[3 * p + 2]!) / 2;
        P[3 * v] = x0;
        P[3 * v + 1] = y0;
        P[3 * v + 2] = z0;
        P[3 * p] = x0;
        P[3 * p + 1] = y0;
        P[3 * p + 2] = -z0;
      }
    }
  }

  /** die Zeilen der Aufgabe (Kanten, Verteilung in der Fläche, lose Bindungen) und ihre rechten Seiten */
  private zeilenBauen(ziele: Float64Array, feld: Float64Array): { zeilen: NormalZeile[]; rechts: number[] } {
    const { start: S, nb, w } = this.gewichte;
    const h = this.h;
    const n = h.n;
    const fest = this.fest;
    const nr = this.nr;
    const hart = this.hart;
    const V = this.versatz;
    const zeilen: NormalZeile[] = [];
    const rechts: number[] = [];
    /** eine Zeile Σ koeff · Lage = konst über Punkte der Haut; feste Punkte wandern mit ihrem Ziel auf die rechte Seite */
    const zeile = (punkte: readonly number[], koeff: readonly number[], gewicht: number, konst: number): void => {
      let r = konst;
      const index: number[] = [];
      const wert: number[] = [];
      for (let q = 0; q < punkte.length; q++) {
        const v = punkte[q]!;
        const fj = fest[v]!;
        for (let c = 0; c < 3; c++) {
          const k = koeff[3 * q + c]!;
          if (k === 0) continue;
          if (fj >= 0) r -= k * ziele[3 * fj + c]!;
          else {
            index.push(3 * nr[v]! + c);
            wert.push(k);
          }
        }
      }
      if (index.length === 0) return;
      zeilen.push({ index, wert, gewicht });
      rechts.push(r);
    };
    // je Kante: senkrecht auf dem Mittel der Normalen ihrer Enden (an einer harten Linie: auf der Normale des anderen Endes)
    for (let i = 0; i < n; i++) {
      for (let q = S[i]!; q < S[i + 1]!; q++) {
        const j = nb[q]!;
        if (j <= i) continue;
        const g = w[q]!;
        if (!(g > 0)) continue;
        if (fest[i]! >= 0 && fest[j]! >= 0) continue;
        const hi = hart ? hart[i]! : 0;
        const hj = hart ? hart[j]! : 0;
        if (hi && hj) continue;
        const mx = (hi ? 0 : feld[3 * i]!) + (hj ? 0 : feld[3 * j]!);
        const my = (hi ? 0 : feld[3 * i + 1]!) + (hj ? 0 : feld[3 * j + 1]!);
        const mz = (hi ? 0 : feld[3 * i + 2]!) + (hj ? 0 : feld[3 * j + 2]!);
        const f = hi || hj ? 1 : 0.5;
        zeile([i, j], [-f * mx, -f * my, -f * mz, f * mx, f * my, f * mz], g, V ? V[q]! : 0);
      }
    }
    // je freiem Punkt: in der Fläche im gewichteten Mittel seiner Nachbarn (zwei Richtungen senkrecht zu seiner Normale)
    const gt = this.opt.verteilen;
    const N0 = this.nor0;
    const L0 = this.lx0;
    const dazu = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      if (fest[i]! >= 0) continue;
      dazu.clear();
      let W = 0;
      for (let q = S[i]!; q < S[i + 1]!; q++) {
        const j = nb[q]!;
        const g = w[q]!;
        if (j === i || !(g > 0)) continue;
        dazu.set(j, (dazu.get(j) ?? 0) + g);
        W += g;
      }
      if (!(W > 0)) continue;
      // zwei Achsen senkrecht zur Normale beim Anlegen …
      const mx = N0[3 * i]!;
      const my = N0[3 * i + 1]!;
      const mz = N0[3 * i + 2]!;
      let ax = Math.abs(mx) < 0.6 ? 1 : 0;
      let ay = ax ? 0 : 1;
      let az = 0;
      const s = ax * mx + ay * my;
      ax -= s * mx;
      ay -= s * my;
      az -= s * mz;
      const la = Math.hypot(ax, ay, az);
      ax /= la;
      ay /= la;
      az /= la;
      const bx = my * az - mz * ay;
      const by = mz * ax - mx * az;
      const bz = mx * ay - my * ax;
      // … und mit der Normale mitgedreht (kürzeste Drehung von der alten zur neuen)
      const nx = feld[3 * i]!;
      const ny = feld[3 * i + 1]!;
      const nz = feld[3 * i + 2]!;
      const cs = mx * nx + my * ny + mz * nz;
      const dreh = (x: number, y: number, z: number): [number, number, number] => {
        if (!(cs > -0.999)) return [x, y, z];
        const k = (x * nx + y * ny + z * nz) / (1 + cs);
        return [x - k * (mx + nx), y - k * (my + ny), z - k * (mz + nz)];
      };
      const punkte = [i, ...dazu.keys()];
      for (const [e0, e1] of [
        [[ax, ay, az], dreh(ax, ay, az)],
        [[bx, by, bz], dreh(bx, by, bz)],
      ] as const) {
        const [ex, ey, ez] = e1;
        const koeff = [-W * ex, -W * ey, -W * ez];
        for (const g of dazu.values()) koeff.push(g * ex, g * ey, g * ez);
        // wie beim Anlegen: Der Anteil des Laplace in der Fläche bleibt, wie er war
        zeile(punkte, koeff, gt / W, e0[0] * L0[3 * i]! + e0[1] * L0[3 * i + 1]! + e0[2] * L0[3 * i + 2]!);
      }
    }
    // Bindungen, die nicht auf einem Punkt liegen
    const m = this.bind.ecken.length / 3;
    for (let j = 0; j < m; j++) {
      const e0 = this.bind.ecken[3 * j]!;
      const e1 = this.bind.ecken[3 * j + 1]!;
      const e2 = this.bind.ecken[3 * j + 2]!;
      if (e0 === e1 && e1 === e2) continue;
      for (let c = 0; c < 3; c++) {
        const koeff = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let e = 0; e < 3; e++) koeff[3 * e + c] = this.bind.b[3 * j + e]!;
        zeile([e0, e1, e2], koeff, this.opt.bindung, ziele[3 * j + c]!);
      }
    }
    return { zeilen, rechts };
  }

  /**
   * Beide Schritte: `richtung` je Punkt (NaN: keine), `ziele` je Bindung, `start`: Normalen, von denen aus verteilt wird (fehlt:
   * das Feld der letzten Rechnung).
   */
  rechnen(ziele: Float64Array, richtung: Float64Array, start?: Float64Array): void {
    const s = start ?? this.feld;
    if (!s) throw new Error('HautDirekt: beim ersten Rechnen braucht es Normalen als Start');
    this.feld = this.richtungVerteilen(richtung, s);
    this.lagenLoesen(ziele, this.feld);
  }
}

/** den Vektor `a[ia…]` um den Drehvektor `o[io…]` drehen (`vz` = −1: zurück) und nach `aus[ib…]` schreiben (Rodrigues) */
function drehe(a: Float64Array, ia: number, o: Float64Array, io: number, vz: number, aus: Float64Array, ib: number): void {
  const x = a[ia]!;
  const y = a[ia + 1]!;
  const z = a[ia + 2]!;
  const ax = o[io]!;
  const ay = o[io + 1]!;
  const az = o[io + 2]!;
  const th = Math.hypot(ax, ay, az);
  if (!(th > 1e-12)) {
    aus[ib] = x;
    aus[ib + 1] = y;
    aus[ib + 2] = z;
    return;
  }
  const kx = ax / th;
  const ky = ay / th;
  const kz = az / th;
  const c = Math.cos(th);
  const si = vz * Math.sin(th);
  const kv = (kx * x + ky * y + kz * z) * (1 - c);
  aus[ib] = x * c + (ky * z - kz * y) * si + kx * kv;
  aus[ib + 1] = y * c + (kz * x - kx * z) * si + ky * kv;
  aus[ib + 2] = z * c + (kx * y - ky * x) * si + kz * kv;
}

type V3 = [number, number, number];

/**
 * Wie sich jede Linie an ihren Punkten gedreht hat: Drehvektor (Achse mal Winkel) je Punkt der Haut auf einer Linie (3 je Punkt,
 * NaN: keiner). Das Dreibein eines Linienpunkts ist seine Tangente, die Richtung aus dem Liniennetz (`linienRichtung`) und ihr
 * Kreuzprodukt; die Drehung führt das Dreibein der alten Lagen in das der neuen. Die Richtung aus dem Liniennetz trifft die Haut
 * an Florians Formen nicht genau (Kopf der Datei); hier geht nur ein, wie sie sich ändert. Liegen mehrere Linien auf einem Punkt
 * (Kreuzung), wird gemittelt.
 */
export function linienDrehung(
  h: Haut,
  loops: readonly Loop[],
  plan: BindungsPlan,
  lagenAlt: readonly Float64Array[],
  lagenNeu: readonly Float64Array[],
  richtungAlt: Float64Array,
  richtungNeu: Float64Array,
): Float64Array {
  const aus = new Float64Array(3 * h.n).fill(Number.NaN);
  const zahl = new Uint16Array(h.n);
  const m = plan.loop.length;
  const tangente = (l: Loop, L: Float64Array, i: number, gespiegelt: boolean): V3 => {
    const n = l.proben.length;
    const p = (k: number): V3 => {
      let q = k;
      let sp = false;
      if (l.art === 'ring') {
        // über das Ende eines Rings geht es in seiner Spiegelhälfte weiter
        if (q < 0) {
          q = Math.min(-q, n - 1);
          sp = true;
        } else if (q > n - 1) {
          q = Math.max(2 * (n - 1) - q, 0);
          sp = true;
        }
      } else q = ((q % n) + n) % n;
      return [L[3 * q]!, L[3 * q + 1]!, sp ? -L[3 * q + 2]! : L[3 * q + 2]!];
    };
    const a = p(i - 1);
    const b = p(i + 1);
    const t: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    if (gespiegelt) t[2] = -t[2];
    const len = Math.hypot(t[0], t[1], t[2]);
    return len > 1e-12 ? [t[0] / len, t[1] / len, t[2] / len] : [0, 0, 0];
  };
  /** Dreibein (Spalten t, d, t × d) aus Tangente und Richtung; null, wenn eines fehlt */
  const dreibein = (t: V3, R: Float64Array, v: number): [V3, V3, V3] | null => {
    if (!Number.isFinite(R[3 * v]!) || (t[0] === 0 && t[1] === 0 && t[2] === 0)) return null;
    const s = R[3 * v]! * t[0] + R[3 * v + 1]! * t[1] + R[3 * v + 2]! * t[2];
    const d: V3 = [R[3 * v]! - s * t[0], R[3 * v + 1]! - s * t[1], R[3 * v + 2]! - s * t[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    if (!(len > 1e-6)) return null;
    d[0] /= len;
    d[1] /= len;
    d[2] /= len;
    return [t, d, [t[1] * d[2] - t[2] * d[1], t[2] * d[0] - t[0] * d[2], t[0] * d[1] - t[1] * d[0]]];
  };
  for (let j = 0; j < m; j++) {
    const e = plan.bind.ecken;
    const v = e[3 * j]!;
    if (e[3 * j + 1] !== v || e[3 * j + 2] !== v) continue;
    const li = plan.loop[j]!;
    const l = loops[li]!;
    const sp = plan.spiegel[j] === 1;
    const A = dreibein(tangente(l, lagenAlt[li]!, plan.probe[j]!, sp), richtungAlt, v);
    const B = dreibein(tangente(l, lagenNeu[li]!, plan.probe[j]!, sp), richtungNeu, v);
    if (!A || !B) continue;
    // Drehung = B · Aᵀ (Summe der dyadischen Produkte der Achsen); ihr Drehvektor aus dem schiefen Teil
    let spur = 0;
    const R: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let k = 0; k < 3; k++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) R[3 * r + c] = R[3 * r + c]! + B[k]![r]! * A[k]![c]!;
    spur = R[0]! + R[4]! + R[8]!;
    const wx = R[7]! - R[5]!;
    const wy = R[2]! - R[6]!;
    const wz = R[3]! - R[1]!;
    const sin2 = Math.hypot(wx, wy, wz);
    const th = Math.atan2(sin2 / 2, (spur - 1) / 2);
    const f = sin2 > 1e-12 ? th / sin2 : 0.5;
    if (zahl[v] === 0) {
      aus[3 * v] = 0;
      aus[3 * v + 1] = 0;
      aus[3 * v + 2] = 0;
    }
    aus[3 * v] = aus[3 * v]! + f * wx;
    aus[3 * v + 1] = aus[3 * v + 1]! + f * wy;
    aus[3 * v + 2] = aus[3 * v + 2]! + f * wz;
    zahl[v] = zahl[v]! + 1;
  }
  for (let v = 0; v < h.n; v++)
    if (zahl[v]! > 1) {
      aus[3 * v] = aus[3 * v]! / zahl[v]!;
      aus[3 * v + 1] = aus[3 * v + 1]! / zahl[v]!;
      aus[3 * v + 2] = aus[3 * v + 2]! / zahl[v]!;
    }
  return aus;
}
