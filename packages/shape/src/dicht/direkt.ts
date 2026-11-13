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
// Die Gewichte stammen aus der Haut beim Anlegen (intrinsische Delaunay-Triangulierung, `intrinsisch.ts`).

import type { NormalZeile } from '../loeser/normalSystem';
import { normalSystemZerlegt } from '../loeser/zerlegung';
import { type IntrinsischeGewichte, intrinsischeGewichte } from './intrinsisch';
import { type Bindungen, type Haut, hautNormalenMax } from './kurven';

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
};

export type DirektZeiten = { verteilen: number; durchgaenge: number; rest: number; zeilen: number; zerlegen: number; loesen: number };

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
  /** Normalen der Haut beim Anlegen (nach Max) */
  private readonly nor0: Float64Array;
  /** Laplace der Lagen beim Anlegen je Punkt (Σ Gewicht · (Nachbar − Punkt)) */
  private readonly lx0: Float64Array;
  /** Quelle beim Verteilen der Richtung je Punkt (in der Fläche beim Anlegen; null: keine) */
  private readonly quelle: Float64Array | null;
  /** die gemessene und verteilte Wölbung je Punkt (nur mit `woelbung: 'linien'`) */
  readonly woelbung: Float64Array | null = null;
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

  /** Schritt 2: die Lagen aus den Zielen der Bindungen (3 je Bindung) und dem Feld der Normalen; schreibt in die Haut */
  lagenLoesen(ziele: Float64Array, feld: Float64Array): void {
    const t0 = jetzt();
    const { start: S, nb, w } = this.gewichte;
    const h = this.h;
    const n = h.n;
    const fest = this.fest;
    const nr = this.nr;
    const hart = this.hart;
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
        zeile([i, j], [-f * mx, -f * my, -f * mz, f * mx, f * my, f * mz], g, 0);
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
    const t1 = jetzt();
    const N = 3 * this.nFrei;
    const sys = normalSystemZerlegt(N, zeilen, 1e-12);
    const t2 = jetzt();
    const b = new Float64Array(N);
    for (let r = 0; r < zeilen.length; r++) {
      const z = zeilen[r]!;
      const gr = z.gewicht * rechts[r]!;
      if (gr === 0) continue;
      for (let t = 0; t < z.index.length; t++) b[z.index[t]!] = b[z.index[t]!]! + gr * z.wert[t]!;
    }
    const x = sys.loesenSpalte(b);
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
    this.zeiten.zeilen = t1 - t0;
    this.zeiten.zerlegen = t2 - t1;
    this.zeiten.loesen = jetzt() - t2;
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
