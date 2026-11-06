// Form zuerst (05.11.2026), die Krümmung der Haut folgt den Loops (Florian mit Bild, ein Boden mit vier Höckern: „Ich verstehe,
// dass das Mesh sich immer versucht aufzublasen, aber kann es bei sowas erkennen, dass eine Fläche gefordert ist?“). Bis hier
// behielt jeder Punkt beim Ziehen die Krümmung, die er beim Anfassen hatte: Werden die Loops um ein Feld flach, wölbt sich das
// Feld weiter wie ein Stück der Kugel. Jetzt kommt die Krümmung der Felder aus den Loops (Prinzip FiberMesh, Nealen u. a. 2007):
// Jeder Loop trägt die Krümmung der Haut an seinen Proben, die Felder dazwischen sind glatt daraus verteilt (harmonisch), am Rand
// des Bereichs eines Zugs aus der Haut, die stehen bleibt.
//
// Was ein Loop trägt: beim ersten Zug die Krümmung der Haut an ihm (gemessen, längs des Loops geglättet), danach in jedem Zug um
// die Änderung seiner eigenen Krümmung in Richtung der Normale der Haut weitergeschrieben. Ein Loop sagt die Krümmung in seiner
// Richtung; ohne Wissen über die Richtung quer dazu ändert sich die Haut am Loop in allen Richtungen gleich (an Kreuzungen das
// Mittel beider Loops). Die Felder haben so kein Gedächtnis: Sind die Loops um einen Boden am Ende gerade und eben, ist der Boden
// flach, gleich in welcher Reihenfolge gezogen wurde (gemessen: mit der Änderung je Zug allein behielt der Boden die Höcker des
// ersten Zugs, als danach die Arme gerade gezogen wurden).
//
// Knicke sagen nichts über die Rundung der Flächen daneben: Ein harter Loop gibt keine Krümmung weiter, und über ihn hinweg
// verteilt sie sich nicht (ein flacher Boden unter einem runden Rand bleibt flach, die Wand darüber rund); ein Punkt mit Ecke
// misst nichts, und die Messung längs des Loops endet an ihm (sonst würde der Knick als Beule in die Fläche verteilt). Gemessen und
// verworfen: Ein harter Loop, der jeder Seite die Krümmung mit der Normale dieser Seite sagt, schaukelt sich über die erste Reihe
// Dreiecke auf (ein hinausgeschobener harter Ring machte die Kuppen zu flach, Grat 27° statt 15°).
//
// Krümmung der Haut in den Maßen des Lösers: Normalanteil des gleichmäßigen Laplace durch das mittlere Kantenquadrat; auf einer
// Kugel 1/(2R), allgemein die halbe mittlere Krümmung.

import { type NormalSystem, type NormalZeile, normalSystem } from '../loeser/normalSystem';
import type { Bindungen, Haut } from './kurven';

/**
 * Je Bindung die Bindungen ihres Loops davor und dahinter (−K … K, Mitte = die Bindung selbst; −1 jenseits eines offenen Endes),
 * die Härte (0–3), ob dort ein Punkt mit Ecke liegt, und die Krümmung der Haut, die der Loop dort trägt.
 */
export type KruemmungsKetten = { kette: readonly Int32Array[]; haerte: Float64Array; ecke: Uint8Array; wert: Float64Array };

/** Bindungen davor und dahinter, deren Lagen die Krümmung längs des Loops ergeben */
export const KETTE_K = 3;
/** Haut-Krümmung (halbe mittlere Krümmung) je Krümmung längs eines Loops */
const LAMBDA = 0.5;
/** Gewicht, mit dem ein Feld ohne Messung bei seiner Krümmung beim Anfassen bleibt (wirkt nur, wo keine Messung hinreicht) */
const HALT = 1e-6;

type V = [number, number, number];

/** Krümmung je Punkt der Haut (Maß des Lösers, gleichmäßige Gewichte, beide Seiten), mit den Normalen `nor` */
export function hautKruemmung(h: Haut, nor: Float64Array): Float64Array {
  const P = h.pos;
  const out = new Float64Array(h.n);
  for (let i = 0; i < h.n; i++) {
    const nb = h.nachbarn[i]!;
    if (!nb.length) continue;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let e2 = 0;
    for (const j of nb) {
      sx += P[3 * j]!;
      sy += P[3 * j + 1]!;
      sz += P[3 * j + 2]!;
      e2 += (P[3 * j]! - P[3 * i]!) ** 2 + (P[3 * j + 1]! - P[3 * i + 1]!) ** 2 + (P[3 * j + 2]! - P[3 * i + 2]!) ** 2;
    }
    const m = nb.length;
    const k = (P[3 * i]! - sx / m) * nor[3 * i]! + (P[3 * i + 1]! - sy / m) * nor[3 * i + 1]! + (P[3 * i + 2]! - sz / m) * nor[3 * i + 2]!;
    out[i] = k / Math.max(e2 / m, 1e-9);
  }
  return out;
}

/**
 * Krümmungsfeld eines Zugs: einmal angelegt (Haut, Bindungen und Ziele beim Anfassen), je Runde aus den Zielen und den Normalen
 * der Haut. `nr`: Punkt → Unbekannte des Lösers (−1: bleibt), `gew`: Gewichte je Nachbar, `ruhe`: Krümmung je Punkt beim Anfassen
 * (Maß des Lösers).
 */
export class KruemmungsFeld {
  /** Punkt eines Loops → seine messenden Bindungen mit Gewicht (1 − Härte/3) */
  private readonly messend = new Map<number, { j: number; w: number }[]>();
  /** Punkt eines Loops → wie stark er seinen Wert weitergibt (0: hart oder nur Ecken, über ihn fließt nichts) */
  private readonly weiter = new Map<number, number>();
  /** Unbekannte des Felds (freie Punkte, die auf keinem Loop liegen) */
  private readonly frei: Int32Array;
  private readonly nrFeld: Int32Array;
  private readonly sys: NormalSystem | null;
  /** je Bindung (ohne Ecke): Gewichte der Kettenpunkte für die zweite Ableitung (c) und die erste (b), Krümmungsvektor beim Anfassen */
  private readonly gc = new Map<number, Float64Array>();
  private readonly gb = new Map<number, Float64Array>();
  private readonly kap0 = new Map<number, V>();
  /** Änderung je Bindung in der letzten Runde (Maß des Lösers), zum Weiterschreiben am Ende des Zugs */
  readonly aenderung = new Map<number, number>();
  /** je Bindung die größte Krümmung, die die Kette dort auflöst (Maß des Lösers) */
  private readonly grenze = new Map<number, number>();
  /** Punkt der Haut je Bindung (−1: Bindung in einem Dreieck) */
  private readonly bindPunkt: Int32Array;
  readonly zeitZerlegen: number;

  constructor(
    private readonly h: Haut,
    bind: Bindungen,
    private readonly ketten: KruemmungsKetten,
    ziele0: Float64Array,
    nr: Int32Array,
    private readonly gew: readonly Float64Array[],
    private readonly nor0: Float64Array,
    private readonly ruhe: Float64Array,
  ) {
    const n = h.n;
    const m = bind.ecken.length / 3;
    const lage0 = (j: number): V => [ziele0[3 * j]!, ziele0[3 * j + 1]!, ziele0[3 * j + 2]!];
    this.bindPunkt = new Int32Array(m).fill(-1);
    for (let j = 0; j < m; j++) {
      const v = bind.ecken[3 * j]!;
      const k = ketten.kette[j];
      if (bind.ecken[3 * j + 1] !== v || bind.ecken[3 * j + 2] !== v || !k) continue;
      this.bindPunkt[j] = v;
      if (!this.weiter.has(v)) this.weiter.set(v, 0);
      if (ketten.ecke[j]) continue;
      // Ausgleichsparabel längs der Kette (Parameter = Sehnenlänge beim Anfassen), nicht über eine Ecke hinaus
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
      this.gc.set(j, g.c);
      this.gb.set(j, g.b);
      this.kap0.set(j, kruemmungVektor(k, g.c, g.b, ziele0));
      // Auflösung: kein Krümmungsradius unter dem Abstand der Proben (Haut-Krümmung höchstens 1/(2h))
      const h = Math.max(Math.abs(u[mitte - 1] ?? NaN) || 0, Math.abs(u[mitte + 1] ?? NaN) || 0);
      if (h > 1e-9) this.grenze.set(j, 1 / (2 * h));
      // gemessen wird an jedem Loop (auch harten, damit sein Wert stimmt, wenn er weich wird); weiter gibt nur der weiche
      const w = 1 - Math.min(3, Math.max(0, ketten.haerte[j]!)) / 3;
      if (w <= 1e-6 || !Number.isFinite(ketten.wert[j]!)) continue;
      const l = this.messend.get(v);
      if (l) l.push({ j, w });
      else this.messend.set(v, [{ j, w }]);
      this.weiter.set(v, Math.max(this.weiter.get(v)!, w));
    }
    // Feld: freie Punkte ohne Loop, harmonisch mit den Gewichten des Lösers. Ein Nachbar auf einem Loop gibt seinen Wert so stark
    // weiter, wie er misst (der Rest seines Gewichts fällt weg, dort fließt nichts); feste Nachbarn geben ihre Krümmung.
    const nrFeld = new Int32Array(n).fill(-1);
    const frei: number[] = [];
    for (let v = 0; v < n; v++) {
      if (nr[v]! < 0 || this.weiter.has(v)) continue;
      nrFeld[v] = frei.length;
      frei.push(v);
    }
    this.frei = Int32Array.from(frei);
    this.nrFeld = nrFeld;
    const zeilen: NormalZeile[] = [];
    for (const v of frei) {
      const g = gew[v]!;
      const index: number[] = [nrFeld[v]!];
      const wert: number[] = [this.diagonale(v)];
      h.nachbarn[v]!.forEach((w, kk) => {
        if (nrFeld[w]! < 0 || g[kk] === 0) return;
        index.push(nrFeld[w]!);
        wert.push(-g[kk]!);
      });
      zeilen.push({ index, wert, gewicht: 1 });
      zeilen.push({ index: [nrFeld[v]!], wert: [1], gewicht: HALT });
    }
    const t0 = Date.now();
    this.sys = frei.length
      ? normalSystem(
          frei.length,
          zeilen,
          frei.map((v) => h.nachbarn[v]!.filter((w) => nrFeld[w]! >= 0).map((w) => nrFeld[w]!)),
          1e-12,
        )
      : null;
    this.zeitZerlegen = Date.now() - t0;
  }

  /** Diagonale der Zeile eines freien Punkts: 1 weniger die Gewichte, die über Loop-Nachbarn nicht weitergegeben werden */
  private diagonale(v: number): number {
    const g = this.gew[v]!;
    let d = 1;
    this.h.nachbarn[v]!.forEach((w, kk) => {
      const we = this.weiter.get(w);
      if (we !== undefined) d -= g[kk]! * (1 - we);
    });
    return d;
  }

  /**
   * Krümmung je Punkt (Maß des Lösers) für die Ziele `ziele` (3 je Bindung) und die Normalen `nor` der Haut jetzt: an Punkten
   * weicher Loops ihr Wert, in den Feldern daraus verteilt; NaN, wo die Krümmung beim Anfassen gilt (feste Punkte, harte Loops).
   */
  ziel(ziele: Float64Array, nor: Float64Array): Float64Array {
    const h = this.h;
    const out = new Float64Array(h.n).fill(NaN);
    this.aenderung.clear();
    for (const [j, c] of this.gc) {
      const k1 = kruemmungVektor(this.ketten.kette[j]!, c, this.gb.get(j)!, ziele);
      const k0 = this.kap0.get(j)!;
      const p = this.bindPunkt[j]!;
      // Krümmung in Richtung der Normale: −κ·n (nach außen gewölbt positiv), gegen den Anfang mit der Normale von damals
      const d =
        -(k1[0] * nor[3 * p]! + k1[1] * nor[3 * p + 1]! + k1[2] * nor[3 * p + 2]!) +
        (k0[0] * this.nor0[3 * p]! + k0[1] * this.nor0[3 * p + 1]! + k0[2] * this.nor0[3 * p + 2]!);
      // An einer Schlaufe oder Spitze des Loops wird die gemessene Krümmung beliebig groß (die Parabel hat dort kaum Steigung);
      // weitergegeben wird höchstens, was die Proben auflösen. Sonst blähte sich die Haut ins Unendliche (gemessen: 10⁴⁰).
      const w = this.ketten.wert[j]!;
      const g = this.grenze.get(j);
      const neu = w + LAMBDA * d;
      this.aenderung.set(j, g !== undefined && Number.isFinite(w) ? Math.max(-g, Math.min(g, neu)) - w : LAMBDA * d);
    }
    for (const [v, js] of this.messend) {
      let s = 0;
      let sw = 0;
      for (const { j, w } of js) {
        s += w * (this.ketten.wert[j]! + (this.aenderung.get(j) ?? 0));
        sw += w;
      }
      const we = this.weiter.get(v)!;
      // der Punkt selbst: sein Wert, so stark er weitergibt, sonst seine Krümmung beim Anfassen
      out[v] = we * (s / sw) + (1 - we) * this.ruhe[v]!;
    }
    if (!this.sys) return out;
    const nf = this.frei.length;
    // rechte Seite der Zeilen: Werte der Loop-Nachbarn (so weit weitergegeben) und Krümmung der festen Nachbarn
    const b = new Float64Array(nf);
    for (let u = 0; u < nf; u++) {
      const i = this.frei[u]!;
      const g = this.gew[i]!;
      let s = 0;
      h.nachbarn[i]!.forEach((w, kk) => {
        const gk = g[kk]!;
        if (gk === 0 || this.nrFeld[w]! >= 0) return;
        const we = this.weiter.get(w);
        // fester Punkt: seine Krümmung; Loop-Punkt: der weitergegebene Teil seines Werts
        if (we === undefined) s += gk * this.ruhe[w]!;
        else if (we > 0) s += gk * (out[w]! - (1 - we) * this.ruhe[w]!);
      });
      b[u] = s;
    }
    // Normalgleichungen: rechte Seite Aᵀb (Zeile u: Diagonale bei u, −g bei den freien Nachbarn) und der Halt
    const rhs = new Float64Array(nf);
    for (let u = 0; u < nf; u++) {
      const i = this.frei[u]!;
      rhs[u] = rhs[u]! + HALT * this.ruhe[i]!;
      const bu = b[u]!;
      if (bu === 0) continue;
      const g = this.gew[i]!;
      rhs[u] = rhs[u]! + this.diagonale(i) * bu;
      h.nachbarn[i]!.forEach((w, kk) => {
        const q = this.nrFeld[w]!;
        if (q >= 0 && g[kk] !== 0) rhs[q] = rhs[q]! - g[kk]! * bu;
      });
    }
    const c = this.sys.loesenSpalte(rhs);
    for (let u = 0; u < nf; u++) out[this.frei[u]!] = c[u]!;
    return out;
  }
}

/**
 * Gewichte der Ausgleichsparabel X(u) = a + b·u + c·u² durch die Kettenpunkte mit Parameter u (NaN: fehlt): c = Σ γ_d X_d,
 * b = Σ β_d X_d. null, wenn weniger als drei Punkte da sind.
 */
function parabelGewichte(u: Float64Array): { c: Float64Array; b: Float64Array } | null {
  const da = [...u].map((x, d) => (Number.isFinite(x) ? d : -1)).filter((d) => d >= 0);
  if (da.length < 3) return null;
  // M = Σ φ φᵀ, φ = (1, u, u²)
  const M = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const d of da) {
    const phi = [1, u[d]!, u[d]! * u[d]!];
    for (let r = 0; r < 3; r++) for (let s = 0; s < 3; s++) M[3 * r + s] = M[3 * r + s]! + phi[r]! * phi[s]!;
  }
  const inv = invers3(M);
  if (!inv) return null;
  const c = new Float64Array(u.length);
  const b = new Float64Array(u.length);
  for (const d of da) {
    const ud = u[d]!;
    // Zeile 1 bzw. 2 von M⁻¹ · φ
    b[d] = inv[3] + inv[4] * ud + inv[5] * ud * ud;
    c[d] = inv[6] + inv[7] * ud + inv[8] * ud * ud;
  }
  return { c, b };
}

type M3 = [number, number, number, number, number, number, number, number, number];

function invers3(m: readonly number[]): M3 | null {
  const [a, b, c, d, e, f, g, h, i] = m as M3;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!(Math.abs(det) > 1e-12)) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/** Krümmungsvektor der Kette (Lagen X, 3 je Bindung) aus der Parabel: (2c − (2c·b̂) b̂) / |b|² */
function kruemmungVektor(k: Int32Array, gc: Float64Array, gb: Float64Array, X: Float64Array): V {
  let cx = 0;
  let cy = 0;
  let cz = 0;
  let bx = 0;
  let by = 0;
  let bz = 0;
  for (let d = 0; d < k.length; d++) {
    const j = k[d]!;
    if (j < 0 || (gc[d] === 0 && gb[d] === 0)) continue;
    cx += gc[d]! * X[3 * j]!;
    cy += gc[d]! * X[3 * j + 1]!;
    cz += gc[d]! * X[3 * j + 2]!;
    bx += gb[d]! * X[3 * j]!;
    by += gb[d]! * X[3 * j + 1]!;
    bz += gb[d]! * X[3 * j + 2]!;
  }
  const lb2 = bx * bx + by * by + bz * bz;
  if (!(lb2 > 1e-12)) return [0, 0, 0];
  const lb = Math.sqrt(lb2);
  const tx = bx / lb;
  const ty = by / lb;
  const tz = bz / lb;
  const ax = 2 * cx;
  const ay = 2 * cy;
  const az = 2 * cz;
  const at = ax * tx + ay * ty + az * tz;
  return [(ax - at * tx) / lb2, (ay - at * ty) / lb2, (az - at * tz) / lb2];
}
