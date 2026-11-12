// Form zuerst (12.11.2026), Wurstballon. Florian: „Kann sich die Fläche einerseits aufblasen, andererseits die Dicke halten?“ Der Löser
// aus den Kurven (`HautAusKurven`) verteilt je Punkt eine Zahl ohne Richtung: wie stark die Haut an den Linien gewölbt ist. Wird eine
// Fläche länger, trägt sie diese Wölbung auch in die Länge (sie wird breiter und dicker), vorn gezogen bläht sich ein Wulst, und in
// dünnen Hörnern gibt die Breite nach, die keine Linie hält.
//
// Hier sagt jeder weiche Loop an seinen Punkten nur die Wölbung längs seiner eigenen Richtung (κ·t tᵀ, wie die „Krümmung mit Richtung“
// vom 06.11., `KruemmungsFeld`); quer dazu sagen es die Loops, die quer laufen. Beides wird glatt in die Felder verteilt, mit derselben
// Zerlegung wie die Krümmung des Lösers (seinem Vorkonditionierer: keine neue). Wo kein Loop eine Richtung bedeckt, behält die Haut die
// Wölbung, die sie beim Greifen in dieser Richtung hatte: die Dicke bleibt. Je Punkt K = (N + b)⁻¹ (M + b·Gedächtnis); die Zahl des
// Lösers ist ¼·Spur K (nach der Geometrie gibt der Laplace jede Richtung gleich wieder; auf einer Kugel 1/(2R)).
//
// Ergebnis (12.11., nur `?wurst=1` im /editor, kein Knopf): nicht tragfähig.
// - Strange bird, Ohren 70 Bildpunkte hochgezogen: Heute werden sie dicker und rund. Mit dem Wurstballon bleiben sie schlank, werden aber
//   flach mit einem Knick (`docs/progress/editor/wurst-vergleich-ohren-2026-11-12.jpg`).
// - Nicht stabil: Das Aufräumen nach dem Loslassen lief auseinander. Vier Löser nacheinander, je 20 Runden, bewegten die Haut um
//   37,3 → 3,9 → 2,1 → 20,5 Einheiten; heute sind es 15,4 → 0,05 → 0,05 → 0,05.
// - Ursache: Der Löser hält je Punkt nur eine Zahl, die mittlere Wölbung. Die Dicke in einer Richtung kann er nicht halten. Er tauscht
//   Wölbung zwischen den Richtungen, deshalb werden die Ohren flach. Jeder neue Löser übernimmt den getauschten Stand als Gedächtnis, und
//   die Form wandert.
// - Weg (nicht gebaut): Wölbung je Richtung im Löser selbst, zwei Bedingungen je Punkt statt einer.

import type { NormalSystem } from '../loeser/normalSystem';
import {
  type KruemmungsKetten,
  inBasis,
  invers3,
  kruemmungUndRichtung,
  parabelGewichte,
  probenAbstand,
  tangentialBasis,
  tensorAus,
} from './kruemmung';
import type { Bindungen, Haut } from './kurven';

/** symmetrischer Tensor im Raum: xx, xy, xz, yy, yz, zz */
const T = 6;
/** Gewicht des Gedächtnisses gegen die Bedeckung durch die Loops (ein Loop bedeckt seine Richtung mit 1), wie im `KruemmungsFeld` */
const BLEIBT = 0.02;

type V = [number, number, number];

/**
 * Wölbung mit Richtung für einen Zug über die ganze Haut: einmal angelegt (Haut, Bindungen und Ziele beim Greifen), je Runde aus den
 * Zielen (`ziel`). `quelle`, `cFrei`, `cVor`, `halt`: die Quellen, Unbekannten und die Zerlegung der Krümmung des Lösers; `gew`:
 * Gewichte je Nachbar; `nor0`, `kap0`: Normalen und Zahl des Lösers je Punkt beim Greifen.
 */
export class Wurstfeld {
  /** Punkt eines weichen Loops → seine messenden Bindungen und deren Richtung beim Greifen */
  private readonly messend = new Map<number, { j: number; t: V }[]>();
  private readonly gc = new Map<number, Float64Array>();
  private readonly gb = new Map<number, Float64Array>();
  /** Punkte, die auf einem Loop liegen (auch harte und Ecken) */
  private readonly aufLoop: Uint8Array;
  /** je Punkt die Basis der Tangentialebene beim Greifen (u, dann v) */
  private readonly basis: Float64Array;
  /** Gedächtnis je Punkt: die Wölbung beim Greifen (a, b, c in seiner Basis) und dieselbe als Tensor im Raum */
  private readonly gedaechtnis: Float64Array;
  private readonly gedaechtnisRaum: Float64Array;
  /** je Unbekannte: wie weit Loops ihre Richtungen bedecken (a, b, c in der Basis ihres Punkts) */
  private readonly bedeckung: Float64Array;
  /** Zeit für das Anlegen (ms) */
  readonly zeitAnlegen: number;

  constructor(
    private readonly h: Haut,
    bind: Bindungen,
    private readonly ketten: KruemmungsKetten,
    ziele0: Float64Array,
    private readonly quelle: Float64Array,
    private readonly cFrei: Int32Array,
    private readonly cVor: NormalSystem,
    private readonly halt: number,
    gew: readonly Float64Array[],
    nor0: Float64Array,
    kap0: Float64Array,
  ) {
    const t0 = Date.now();
    const n = h.n;
    this.basis = new Float64Array(6 * n);
    this.gedaechtnis = new Float64Array(3 * n);
    this.gedaechtnisRaum = new Float64Array(T * n);
    for (let v = 0; v < n; v++) this.gedaechtnisMessen(v, gew, nor0, kap0[v]!);
    // messende Loop-Punkte: eingesetzt, weich, keine Ecke; Richtung und Parabel längs der Kette beim Greifen
    this.aufLoop = new Uint8Array(n);
    const m = bind.ecken.length / 3;
    const lage0 = (j: number): V => [ziele0[3 * j]!, ziele0[3 * j + 1]!, ziele0[3 * j + 2]!];
    for (let j = 0; j < m; j++) {
      const v = bind.ecken[3 * j]!;
      const k = ketten.kette[j];
      if (bind.ecken[3 * j + 1] !== v || bind.ecken[3 * j + 2] !== v || !k) continue;
      this.aufLoop[v] = 1;
      if (ketten.ecke[j] || ketten.kante[j] || !(quelle[v]! > 0)) continue;
      const u = new Float64Array(k.length).fill(NaN);
      const mitte = (k.length - 1) / 2;
      u[mitte] = 0;
      for (const r of [1, -1]) {
        for (let d = 1; d <= mitte; d++) {
          const a = k[mitte + r * (d - 1)]!;
          const b = k[mitte + r * d]!;
          if (a < 0 || b < 0 || (d > 1 && ketten.ecke[a])) break;
          const pa = lage0(a);
          const pb = lage0(b);
          u[mitte + r * d] = u[mitte + r * (d - 1)]! + r * Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]);
        }
      }
      const g = parabelGewichte(u);
      if (!g) continue;
      const r0 = kruemmungUndRichtung(k, g.c, g.b, ziele0);
      if (!r0) continue;
      this.gc.set(j, g.c);
      this.gb.set(j, g.b);
      const l = this.messend.get(v);
      if (l) l.push({ j, t: r0[1] });
      else this.messend.set(v, [{ j, t: r0[1] }]);
    }
    // Bedeckung: einmal je Zug (die Richtungen der Loops im Material ändern sich nicht); feste Punkte und Halt: die ganze Ebene
    const quellenN = new Map<number, Float64Array>();
    for (const [v, js] of this.messend) {
      const q = new Float64Array(T);
      for (const { t } of js) tensorAus(t, t, 1 / js.length, 0, 0, q, 0);
      quellenN.set(v, q);
    }
    const ebene = new Float64Array(T * n);
    for (let v = 0; v < n; v++) tensorAus(this.basisU(v), this.basisV(v), 1, 0, 1, ebene, T * v);
    const X = this.verteilen(quellenN, ebene);
    this.bedeckung = new Float64Array(3 * cFrei.length);
    for (let u = 0; u < cFrei.length; u++) inBasis(X, T * u, this.basis, 6 * cFrei[u]!, this.bedeckung, 3 * u);
    this.zeitAnlegen = Date.now() - t0;
  }

  private basisU(v: number): V {
    return [this.basis[6 * v]!, this.basis[6 * v + 1]!, this.basis[6 * v + 2]!];
  }

  private basisV(v: number): V {
    return [this.basis[6 * v + 3]!, this.basis[6 * v + 4]!, this.basis[6 * v + 5]!];
  }

  /**
   * Ein Tensor glatt verteilt wie die Krümmung des Lösers (Zeilen seines Vorkonditionierers): Quellen an den messenden Loop-Punkten (so
   * stark, wie sie weitergeben), an festen Punkten `fest`, als Halt `fest` des Punkts selbst. Ergebnis je Unbekannte, 6 Werte im Raum.
   */
  private verteilen(quellen: ReadonlyMap<number, Float64Array>, fest: Float64Array): Float64Array {
    const h = this.h;
    const nc = this.cFrei.length;
    const rhs = new Float64Array(T * nc);
    for (let u = 0; u < nc; u++) {
      const v = this.cFrei[u]!;
      const nb = h.nachbarn[v]!;
      for (const j of nb) {
        const q = this.quelle[j]!;
        if (!(q > 0)) continue;
        let w: Float64Array | undefined;
        let o = 0;
        if (this.aufLoop[j]) w = quellen.get(j);
        else {
          w = fest;
          o = T * j;
        }
        if (!w) continue;
        for (let c = 0; c < T; c++) rhs[T * u + c] = rhs[T * u + c]! + q * w[o + c]!;
      }
      const hn = this.halt * nb.length;
      for (let c = 0; c < T; c++) rhs[T * u + c] = rhs[T * u + c]! + hn * fest[T * v + c]!;
    }
    return this.cVor.loesenSpalten(rhs, T);
  }

  /**
   * Die Zahl des Lösers je Unbekannte (`cFrei`) aus den Zielen `ziele` (3 je Bindung) und den Normalen `nor` der Haut jetzt: Wölbung
   * der Loops längs ihrer Richtung verteilt, mit der Bedeckung und dem Gedächtnis zu K, dann ¼·Spur K.
   */
  ziel(ziele: Float64Array, nor: Float64Array): Float64Array {
    const quellen = new Map<number, Float64Array>();
    for (const [v, js] of this.messend) {
      const q = new Float64Array(T);
      for (const { j, t } of js) {
        const k = this.ketten.kette[j]!;
        const r = kruemmungUndRichtung(k, this.gc.get(j)!, this.gb.get(j)!, ziele);
        let kap = r ? -(r[0][0] * nor[3 * v]! + r[0][1] * nor[3 * v + 1]! + r[0][2] * nor[3 * v + 2]!) : 0;
        // an einer Schlaufe oder Spitze des Loops höchstens, was die Proben auflösen (wie im `KruemmungsFeld`)
        const hp = probenAbstand(k, ziele);
        if (hp > 1e-9) kap = Math.max(-1 / hp, Math.min(1 / hp, kap));
        tensorAus(t, t, kap / js.length, 0, 0, q, 0);
      }
      quellen.set(v, q);
    }
    const X = this.verteilen(quellen, this.gedaechtnisRaum);
    const nc = this.cFrei.length;
    const out = new Float64Array(nc);
    const M = new Float64Array(3);
    for (let u = 0; u < nc; u++) {
      const v = this.cFrei[u]!;
      inBasis(X, T * u, this.basis, 6 * v, M, 0);
      const ga = this.gedaechtnis[3 * v]!;
      const gb = this.gedaechtnis[3 * v + 1]!;
      const gc = this.gedaechtnis[3 * v + 2]!;
      const A = M[0]! + BLEIBT * ga;
      const B = M[1]! + BLEIBT * gb;
      const C = M[2]! + BLEIBT * gc;
      const p = this.bedeckung[3 * u]! + BLEIBT;
      const q = this.bedeckung[3 * u + 1]!;
      const r = this.bedeckung[3 * u + 2]! + BLEIBT;
      const det = p * r - q * q;
      if (!(det > 1e-18)) {
        out[u] = 0.25 * (ga + gc);
        continue;
      }
      out[u] = (0.25 * (r * A - q * B + (p * C - q * B))) / det;
    }
    return out;
  }

  /**
   * Wölbung der Haut beim Greifen am Punkt v, mit Richtung: je Kante die Wölbung längs ihrer Richtung (aus ihrer Neigung gegen die
   * Tangentialebene), K = (a, b, c) nach kleinsten Quadraten (Gewichte × Kantenlänge²), dann um ein Vielfaches der Einheit verschoben,
   * bis ¼·Spur K genau die Zahl des Lösers ist (wie `KruemmungsFeld.gedaechtnisMessen`, im Maß nach der Geometrie).
   */
  private gedaechtnisMessen(v: number, gew: readonly Float64Array[], nor0: Float64Array, soll: number): void {
    const P = this.h.pos;
    const nx = nor0[3 * v]!;
    const ny = nor0[3 * v + 1]!;
    const nz = nor0[3 * v + 2]!;
    const [u, w] = tangentialBasis(nx, ny, nz);
    this.basis.set([...u, ...w], 6 * v);
    const g = gew[v]!;
    let a00 = 0;
    let a01 = 0;
    let a02 = 0;
    let a11 = 0;
    let a12 = 0;
    let a22 = 0;
    let r0 = 0;
    let r1 = 0;
    let r2 = 0;
    this.h.nachbarn[v]!.forEach((q, k) => {
      const gk = g[k]!;
      if (gk === 0) return;
      const ex = P[3 * q]! - P[3 * v]!;
      const ey = P[3 * q + 1]! - P[3 * v + 1]!;
      const ez = P[3 * q + 2]! - P[3 * v + 2]!;
      const en = ex * nx + ey * ny + ez * nz;
      const tx = ex - en * nx;
      const ty = ey - en * ny;
      const tz = ez - en * nz;
      const lt2 = tx * tx + ty * ty + tz * tz;
      if (lt2 < 1e-18) return;
      const lt = Math.sqrt(lt2);
      const cu = (tx * u[0] + ty * u[1] + tz * u[2]) / lt;
      const cv = (tx * w[0] + ty * w[1] + tz * w[2]) / lt;
      const kap = (-2 * en) / lt2;
      const wj = gk * lt2;
      const p0 = cu * cu;
      const p1 = 2 * cu * cv;
      const p2 = cv * cv;
      a00 += wj * p0 * p0;
      a01 += wj * p0 * p1;
      a02 += wj * p0 * p2;
      a11 += wj * p1 * p1;
      a12 += wj * p1 * p2;
      a22 += wj * p2 * p2;
      r0 += wj * kap * p0;
      r1 += wj * kap * p1;
      r2 += wj * kap * p2;
    });
    let x0 = 2 * soll;
    let x1 = 0;
    let x2 = 2 * soll;
    const eps = 1e-9 * (a00 + a11 + a22);
    const inv = a00 + a11 + a22 > 0 ? invers3([a00 + eps, a01, a02, a01, a11 + eps, a12, a02, a12, a22 + eps]) : null;
    if (inv) {
      x0 = inv[0] * r0 + inv[1] * r1 + inv[2] * r2;
      x1 = inv[3] * r0 + inv[4] * r1 + inv[5] * r2;
      x2 = inv[6] * r0 + inv[7] * r1 + inv[8] * r2;
      // genau die Zahl des Lösers beim Greifen: ¼·(a + c) = soll
      const d = 2 * soll - 0.5 * (x0 + x2);
      x0 += d;
      x2 += d;
    }
    this.gedaechtnis.set([x0, x1, x2], 3 * v);
    tensorAus(u, w, x0, x1, x2, this.gedaechtnisRaum, T * v);
  }
}
