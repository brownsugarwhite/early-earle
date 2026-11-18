// Form zuerst (12.11.2026), Wurstballon. Florian: „Kann sich die Fläche einerseits aufblasen, andererseits die Dicke halten?“ Der Löser
// aus den Kurven (`HautAusKurven`) verteilt je Punkt eine Zahl ohne Richtung: wie stark die Haut an den Linien gewölbt ist. Wird eine
// Fläche länger, trägt sie diese Wölbung auch in die Länge (sie wird breiter und dicker), vorn gezogen bläht sich ein Wulst, und in
// dünnen Hörnern gibt die Breite nach, die keine Linie hält. Eine Haut, die nur die mittlere Wölbung hält, verhält sich wie eine
// Seifenhaut mit Druck: Lange Röhren schnüren sich ein oder bauchen aus (Plateau–Rayleigh). Ein Wurstballon tut das nicht, weil seine
// Haut quer anders gespannt ist als längs.
//
// Hier sagt jeder weiche Loop an seinen Punkten nur die Wölbung längs seiner eigenen Richtung (κ·t tᵀ, wie die „Krümmung mit Richtung“
// vom 06.11., `KruemmungsFeld`); quer dazu sagen es die Loops, die quer laufen. Beides wird glatt in die Felder verteilt, mit derselben
// Zerlegung wie die Krümmung des Lösers (seinem Vorkonditionierer: keine neue). Wo kein Loop eine Richtung bedeckt, behält die Haut die
// Wölbung, die sie beim Greifen in dieser Richtung hatte: die Dicke bleibt. Je Punkt K = (N + b)⁻¹ (M + b·Gedächtnis).
//
// Erster Versuch (12.11. vormittags): K nur als Zahl an den Löser (¼·Spur K). Nicht tragfähig: Die Ohren von strange bird wurden beim
// Verlängern nicht dicker, aber flach mit Knick (`docs/progress/editor/wurst-vergleich-ohren-2026-11-12.jpg`), und die Haut kam nicht
// zur Ruhe (vier Löser nacheinander, je 20 Runden: 37,3 → 3,9 → 2,1 → 20,5 Einheiten; heute 15,4 → 0,05 → 0,05 → 0,05). Der Löser hielt
// nur die mittlere Wölbung und tauschte zwischen den Richtungen. Deshalb hält der Löser jetzt beide Richtungen: je Punkt zwei Zeilen
// statt einer Laplace-Zeile (`HautAusKurven`, `HautOptionen.wurst`); dieses Feld gibt ihnen K.
//
// Beweis (12.11. mittags, `?wurst=1`, kein Knopf), Ergebnis:
// - Strange bird, Ohren 70 Bildpunkte hochgezogen: Die Ohren werden nicht dicker, sie behalten ihre Dicke vom Greifen (sie waren flache
//   Lappen und bleiben schlank; `docs/progress/editor/wurst-beweis-ohren-2026-11-12.jpg`).
// - Die Haut kommt nicht zur Ruhe. Ein Löser, Weg gegen den Start nach 10/40/80/160 Runden: 16,7/18,7/22,2/31,2 Einheiten; heute steht
//   sie nach 20 Runden (0,05). Das Aufräumen nach dem Loslassen bricht ab („lief auseinander“), die Form bleibt dann wie nach dem Zug.
// - Beim Greifen hängt das Fenster bis zu 2 s (eigene Zerlegung, gemessen ohne vorbereitete). Je Runde 20–27 ms (heute ≈ 25).
// - Vermutete Ursache des Kriechens (nicht geprüft): Zwei Zeilen je Punkt lassen sich nicht beide genau erfüllen; der Rest rutscht Runde
//   für Runde seitlich weg, weil die Lage in der Fläche jede Runde neu „wie jetzt“ gilt. Weg: die Lage in der Fläche vom Greifen merken
//   (gedreht mit der Normale), die Zerlegung im Hintergrund vorrechnen.

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
 * Zielen (`tensoren`). `quelle`, `cFrei`, `cVor`, `halt`: die Quellen, Unbekannten und die Zerlegung der Krümmung des Lösers; `gew`:
 * Gewichte je Nachbar; `nor0`, `kap0`: Normalen und Zahl des Lösers je Punkt beim Greifen.
 */
export class Wurstfeld {
  /** Punkt eines weichen Loops → seine messenden Bindungen und deren Richtung beim Greifen */
  private readonly messend = new Map<number, { j: number; t: V }[]>();
  private readonly gc = new Map<number, Float64Array>();
  private readonly gb = new Map<number, Float64Array>();
  /** Punkte, die auf einem Loop liegen (auch harte und Ecken) */
  private readonly aufLoop: Uint8Array;
  /** Punkt → Unbekannte des Felds (−1: keine) */
  private readonly cNr: Int32Array;
  /** je Punkt die Basis der Tangentialebene beim Greifen (u, dann v) */
  private readonly basis: Float64Array;
  /** Gedächtnis je Punkt: die Wölbung beim Greifen (a, b, c in seiner Basis) und dieselbe als Tensor im Raum */
  private readonly gedaechtnis: Float64Array;
  private readonly gedaechtnisRaum: Float64Array;
  /** Bedeckung der messenden Loop-Punkte (Tensor im Raum) und je Unbekannte (im Raum) */
  private readonly quellenN = new Map<number, Float64Array>();
  private readonly bedeckungRaum: Float64Array;
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
    this.cNr = new Int32Array(n).fill(-1);
    cFrei.forEach((v, u) => {
      this.cNr[v] = u;
    });
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
    for (const [v, js] of this.messend) {
      const q = new Float64Array(T);
      for (const { t } of js) tensorAus(t, t, 1 / js.length, 0, 0, q, 0);
      this.quellenN.set(v, q);
    }
    const ebene = new Float64Array(T * n);
    for (let v = 0; v < n; v++) tensorAus(this.basisU(v), this.basisV(v), 1, 0, 1, ebene, T * v);
    this.bedeckungRaum = this.verteilen(this.quellenN, ebene);
    this.zeitAnlegen = Date.now() - t0;
  }

  private basisU(v: number): V {
    return [this.basis[6 * v]!, this.basis[6 * v + 1]!, this.basis[6 * v + 2]!];
  }

  private basisV(v: number): V {
    return [this.basis[6 * v + 3]!, this.basis[6 * v + 4]!, this.basis[6 * v + 5]!];
  }

  /** Basis der Tangentialebene am Punkt v beim Greifen (u, v), in der `tensoren` die Wölbung angibt */
  basisVon(v: number): [V, V] {
    return [this.basisU(v), this.basisV(v)];
  }

  /** Wölbung beim Greifen am Punkt v (a, b, c in seiner Basis) */
  gedaechtnisVon(v: number): [number, number, number] {
    return [this.gedaechtnis[3 * v]!, this.gedaechtnis[3 * v + 1]!, this.gedaechtnis[3 * v + 2]!];
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
   * Die Wölbung K je Punkt (a, b, c in seiner Basis beim Greifen; NaN, wo nichts gilt: harte Loops, Ecken, feste Punkte) aus den Zielen
   * `ziele` (3 je Bindung) und den Normalen `nor` der Haut jetzt: Wölbung der Loops längs ihrer Richtung verteilt, mit der Bedeckung und
   * dem Gedächtnis zu K = (N + b)⁻¹ (M + b·Gedächtnis). An einem messenden Loop-Punkt zählen seine Quelle und das Mittel der Felder um ihn.
   */
  tensoren(ziele: Float64Array, nor: Float64Array): Float64Array {
    const n = this.h.n;
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
    const out = new Float64Array(3 * n).fill(NaN);
    const M = new Float64Array(3);
    const N = new Float64Array(3);
    for (let u = 0; u < this.cFrei.length; u++) {
      const v = this.cFrei[u]!;
      inBasis(X, T * u, this.basis, 6 * v, M, 0);
      inBasis(this.bedeckungRaum, T * u, this.basis, 6 * v, N, 0);
      this.verbinden(v, M, N, out);
    }
    const Ms = new Float64Array(T);
    const Ns = new Float64Array(T);
    for (const [v, qM] of quellen) {
      Ms.set(qM);
      Ns.set(this.quellenN.get(v)!);
      let z = 0;
      const sM = new Float64Array(T);
      const sN = new Float64Array(T);
      for (const w of this.h.nachbarn[v]!) {
        const u = this.cNr[w]!;
        if (u < 0) continue;
        for (let c = 0; c < T; c++) {
          sM[c] = sM[c]! + X[T * u + c]!;
          sN[c] = sN[c]! + this.bedeckungRaum[T * u + c]!;
        }
        z++;
      }
      if (z)
        for (let c = 0; c < T; c++) {
          Ms[c] = Ms[c]! + sM[c]! / z;
          Ns[c] = Ns[c]! + sN[c]! / z;
        }
      inBasis(Ms, 0, this.basis, 6 * v, M, 0);
      inBasis(Ns, 0, this.basis, 6 * v, N, 0);
      this.verbinden(v, M, N, out);
    }
    return out;
  }

  /** K = sym((N + b)⁻¹ (M + b·Gedächtnis)) am Punkt v, alles in seiner Basis, nach `out` */
  private verbinden(v: number, M: Float64Array, N: Float64Array, out: Float64Array): void {
    const ga = this.gedaechtnis[3 * v]!;
    const gb = this.gedaechtnis[3 * v + 1]!;
    const gc = this.gedaechtnis[3 * v + 2]!;
    const A = M[0]! + BLEIBT * ga;
    const B = M[1]! + BLEIBT * gb;
    const C = M[2]! + BLEIBT * gc;
    const p = N[0]! + BLEIBT;
    const q = N[1]!;
    const r = N[2]! + BLEIBT;
    const det = p * r - q * q;
    if (!(det > 1e-18)) {
      out.set([ga, gb, gc], 3 * v);
      return;
    }
    out[3 * v] = (r * A - q * B) / det;
    out[3 * v + 1] = (0.5 * (r * B - q * C + (p * B - q * A))) / det;
    out[3 * v + 2] = (p * C - q * B) / det;
  }

  /**
   * Wölbung der Haut beim Greifen am Punkt v, mit Richtung: je Kante die Wölbung längs ihrer Richtung (aus ihrer Neigung gegen die
   * Tangentialebene), K = (a, b, c) nach kleinsten Quadraten (Gewichte × Kantenlänge²; wie `KruemmungsFeld.gedaechtnisMessen`, ohne
   * Verschiebung: die Zeilen des Lösers messen die Wölbung genauso an den Kanten). Ohne genug Kanten: rund mit der Zahl des Lösers.
   */
  private gedaechtnisMessen(v: number, gew: readonly Float64Array[], nor0: Float64Array, kap: number): void {
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
      const kp = (-2 * en) / lt2;
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
      r0 += wj * kp * p0;
      r1 += wj * kp * p1;
      r2 += wj * kp * p2;
    });
    let x0 = 2 * kap;
    let x1 = 0;
    let x2 = 2 * kap;
    const eps = 1e-9 * (a00 + a11 + a22);
    const inv = a00 + a11 + a22 > 0 ? invers3([a00 + eps, a01, a02, a01, a11 + eps, a12, a02, a12, a22 + eps]) : null;
    if (inv) {
      x0 = inv[0] * r0 + inv[1] * r1 + inv[2] * r2;
      x1 = inv[3] * r0 + inv[4] * r1 + inv[5] * r2;
      x2 = inv[6] * r0 + inv[7] * r1 + inv[8] * r2;
    }
    this.gedaechtnis.set([x0, x1, x2], 3 * v);
    tensorAus(u, w, x0, x1, x2, this.gedaechtnisRaum, T * v);
  }
}
