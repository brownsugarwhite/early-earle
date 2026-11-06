// Form zuerst (05.11.2026), die Krümmung der Haut folgt den Loops (Florian mit Bild, ein Boden mit vier Höckern: „Ich verstehe,
// dass das Mesh sich immer versucht aufzublasen, aber kann es bei sowas erkennen, dass eine Fläche gefordert ist?“). Bis hier
// behielt jeder Punkt beim Ziehen die Krümmung, die er beim Anfassen hatte: Werden die Loops um ein Feld flach, wölbt sich das
// Feld weiter wie ein Stück der Kugel. Jetzt kommt die Krümmung der Felder aus den Loops (Prinzip FiberMesh, Nealen u. a. 2007):
// Jeder Loop sagt die Krümmung der Haut an seinen Proben, die Felder dazwischen sind glatt daraus verteilt (harmonisch), am Rand
// des Bereichs eines Zugs aus der Haut, die stehen bleibt. Die Felder haben so kein Gedächtnis: Sind die Loops um einen Boden am
// Ende gerade und eben, ist der Boden flach, gleich in welcher Reihenfolge gezogen wurde.
//
// 06.11.: Krümmung mit Richtung (Florian: „jeder Loop sagt nur seine Richtung, quer kommt sie von den Loops, die quer laufen, sonst
// bleibt die Haut, wie sie ist“). Bis hier gab ein Loop seine Krümmung in alle Richtungen weiter: An den fast geraden oder hohlen
// Rändern eines Rüssels oder einer Hammerform sagte das Feld „flach“ oder „hohl“ auch quer dazu, der Querschnitt zog sich zur
// Mittelachse zusammen, bis er sich umstülpte. Jetzt sagt ein Loop an jedem seiner Punkte zweierlei, beides als Tensor im Raum:
// N = t tᵀ (welche Richtung t er bedeckt) und M = κ·t tᵀ (die Krümmung κ längs dieser Richtung). Beide werden harmonisch in die
// Felder verteilt, der Rand des Bereichs gibt die ganze Krümmung der Haut, die stehen bleibt (N = seine Tangentialebene). Je Punkt
// ist die Krümmung N⁻¹M in seiner Tangentialebene: Wo Loops beide Richtungen bedecken (die gekreuzten Arme eines Bodens), kommt sie
// ganz aus ihnen; wo nur eine, kommt sie quer dazu aus den Loops, die quer laufen, so weit sie reichen (ein Ring um einen Rüssel gibt
// M und N längs des Rüssels im selben Maß weiter, also seine Krümmung quer), sonst aus dem Gedächtnis: der Krümmung der Haut beim
// Anfassen, mit Richtung. Bis hier trug jeder Loop seine Krümmung von Zug zu Zug weiter (gemessen beim ersten Zug, dann um die
// Änderung je Zug); jetzt misst er sie in jedem Schritt an sich selbst.
//
// Gerechnet wird im Material, wie es beim Anfassen lag: Die Loops hängen an der Haut, ihre Richtung darin bleibt, auch wenn sich
// alles dreht. Deshalb kommen Richtung und Bedeckung N aus dem Stand beim Anfassen (einmal je Zug gelöst), nur die Krümmung κ aus
// den Zielen jetzt (M, einmal je Schritt). Gemessen und verworfen: alles im Raum, wie es jetzt liegt (Richtungen der Loops jetzt,
// je Punkt mit der Normale und der Drehung in der Fläche gedreht): doppelt so teuer, und wo sich die Haut stark dreht (die Spitze
// eines Überhangs), zeigten Gedächtnis und Kanten nach dem Drehen nicht mehr dorthin, wohin die Loops zeigten.
//
// Die Zahl, die der Löser je Punkt braucht (Normalanteil des Laplace durch das mittlere Kantenquadrat, auf einer Kugel 1/(2R)), ist
// ½·Spur(K·E): K die Krümmung, E die Verteilung der Kanten um den Punkt beim Anfassen (normiert). Das Gedächtnis ist aus den Kanten so
// angepasst, dass es beim Anfassen genau die Zahl des Lösers gibt. An Punkten eines Loops (sie liegen auf Sehnen etwas innerhalb der
// Haut; an ihnen gemessen war die Kugel ein Viertel flacher) gilt das Gedächtnis der Nachbarn, die auf keinem Loop liegen. Gemessen
// und verworfen: nur die Spur (¼·Spur K, ohne die Verteilung der Kanten) — an gestauchten Spitzen robuster, aber ein lang gedehnter
// Rüssel wurde ein breites Paddel (±172 statt ±40), weil die Zahl dort nicht mehr zur Fläche passt; mehr oder weniger Gedächtnis
// (0,005–0,1), eine strengere Auflösungsgrenze (zwei oder drei Probenabstände) und ein Mindestanteil jeder Richtung in E (0,2–0,3)
// änderten nichts Wesentliches. Offen: Wo die Dreiecke stark gestaucht sind (die Spitze eines Überhangs, die Kreuzung einer
// Schlaufe: fast alle Kanten in einer Richtung), sieht der Laplace die Richtung quer dazu nicht; sagen die Loops ihre Krümmung genau
// dort, kann die Fläche sie nicht annehmen und faltet (Überhang 6, ohne Richtung 0). Weg: zu kurze Kanten zusammenlegen.
//
// Knicke sagen nichts über die Rundung der Flächen daneben: Ein harter Loop gibt keine Krümmung weiter, und über ihn hinweg
// verteilt sie sich nicht (ein flacher Boden unter einem runden Rand bleibt flach, die Wand darüber rund); ein Punkt mit Ecke
// misst nichts, und die Messung längs des Loops endet an ihm (sonst würde der Knick als Beule in die Fläche verteilt). Gemessen und
// verworfen: Ein harter Loop, der jeder Seite die Krümmung mit der Normale dieser Seite sagt, schaukelt sich über die erste Reihe
// Dreiecke auf (ein hinausgeschobener harter Ring machte die Kuppen zu flach, Grat 27° statt 15°).

import { type NormalSystem, type NormalZeile, normalSystem } from '../loeser/normalSystem';
import type { Bindungen, Haut } from './kurven';

/**
 * Je Bindung die Bindungen ihres Loops davor und dahinter (−K … K, Mitte = die Bindung selbst; −1 jenseits eines offenen Endes),
 * die Härte (0–3) und ob dort ein Punkt mit Ecke liegt.
 */
export type KruemmungsKetten = { kette: readonly Int32Array[]; haerte: Float64Array; ecke: Uint8Array };

/** Bindungen davor und dahinter, deren Lagen die Krümmung längs des Loops ergeben */
export const KETTE_K = 3;
/** Gewicht, mit dem ein Feld bei seinem Gedächtnis bleibt, wo nichts hinreicht (hält das System lösbar) */
const HALT = 1e-6;
/** Gedächtnis je Punkt, gemessen an der Bedeckung durch die Loops (ein Loop bedeckt seine Richtung mit 1) */
const BLEIBT = 0.02;
/** symmetrischer Tensor im Raum: xx, xy, xz, yy, yz, zz */
const T = 6;

type V = [number, number, number];

/**
 * Krümmungsfeld eines Zugs: einmal angelegt (Haut, Bindungen und Ziele beim Anfassen; dabei die Bedeckung gelöst), je Schritt aus den
 * Zielen (`ziel`). `nr`: Punkt → Unbekannte des Lösers (−1: bleibt), `gew`: Gewichte je Nachbar, `nor0`: Normalen beim Anfassen,
 * `ruhe`: Krümmung je Punkt beim Anfassen (Maß des Lösers).
 */
export class KruemmungsFeld {
  /** Punkt eines Loops → seine messenden Bindungen: Gewicht (1 − Härte/3) und Richtung des Loops beim Anfassen */
  private readonly messend = new Map<number, { j: number; w: number; t: V }[]>();
  /** Punkt eines Loops → wie stark er weitergibt (0: hart oder nur Ecken, über ihn fließt nichts) */
  private readonly weiter = new Map<number, number>();
  /** dasselbe je Punkt (−1: auf keinem Loop) */
  private readonly weiterJe: Float64Array;
  /** Unbekannte des Felds (freie Punkte, die auf keinem Loop liegen) */
  private readonly frei: Int32Array;
  private readonly nrFeld: Int32Array;
  /** Diagonale je Zeile des Felds (1 weniger die Gewichte, die über Loop-Nachbarn nicht weitergegeben werden) */
  private readonly diag: Float64Array;
  private readonly sys: NormalSystem | null;
  /** je Bindung (ohne Ecke): Gewichte der Kettenpunkte für die zweite Ableitung (c) und die erste (b) */
  private readonly gc = new Map<number, Float64Array>();
  private readonly gb = new Map<number, Float64Array>();
  /**
   * je Punkt (wo gebraucht): Basis seiner Tangentialebene beim Anfassen (u, v); darin Gedächtnis, Kanten und Bedeckung (je a, b, c:
   * a·u uᵀ + b·(u vᵀ + v uᵀ) + c·v vᵀ)
   */
  private readonly basis: Float64Array;
  private readonly gedaechtnis: Float64Array;
  private readonly kanten: Float64Array;
  private readonly bedeckung: Float64Array;
  /** je Punkt, der auf keinem Loop liegt (wo gebraucht): Gedächtnis im Raum (Rand des Felds und Halt für M) */
  private readonly rand: Float64Array;
  private readonly hatRand: Uint8Array;
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
    for (let j = 0; j < m; j++) {
      const v = bind.ecken[3 * j]!;
      const k = ketten.kette[j];
      if (bind.ecken[3 * j + 1] !== v || bind.ecken[3 * j + 2] !== v || !k) continue;
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
      // gemessen wird an jedem weichen Loop; ein harter gibt nichts weiter (sein Punkt behält die Krümmung beim Anfassen)
      const w = 1 - Math.min(3, Math.max(0, ketten.haerte[j]!)) / 3;
      const r0 = kruemmungUndRichtung(k, g.c, g.b, ziele0);
      if (w <= 1e-6 || !r0) continue;
      const l = this.messend.get(v);
      if (l) l.push({ j, w, t: r0[1] });
      else this.messend.set(v, [{ j, w, t: r0[1] }]);
      this.weiter.set(v, Math.max(this.weiter.get(v)!, w));
    }
    // Feld: freie Punkte ohne Loop, harmonisch mit den Gewichten des Lösers. Ein Nachbar auf einem Loop gibt seine Quelle so stark
    // weiter, wie er misst (der Rest seines Gewichts fällt weg, dort fließt nichts); feste Nachbarn geben ihre ganze Krümmung.
    const nrFeld = new Int32Array(n).fill(-1);
    const frei: number[] = [];
    for (let v = 0; v < n; v++) {
      if (nr[v]! < 0 || this.weiter.has(v)) continue;
      nrFeld[v] = frei.length;
      frei.push(v);
    }
    this.frei = Int32Array.from(frei);
    this.nrFeld = nrFeld;
    this.weiterJe = new Float64Array(n).fill(-1);
    for (const [v, we] of this.weiter) this.weiterJe[v] = we;
    this.diag = Float64Array.from(frei, (v) => {
      const g = gew[v]!;
      let d = 1;
      h.nachbarn[v]!.forEach((w, kk) => {
        const we = this.weiter.get(w);
        if (we !== undefined) d -= g[kk]! * (1 - we);
      });
      return d;
    });

    // Gedächtnis: wo es gebraucht wird (Feld, sein Rand, Loop-Punkte, die messen, und ihre Nachbarn)
    this.basis = new Float64Array(6 * n);
    this.gedaechtnis = new Float64Array(3 * n);
    this.kanten = new Float64Array(3 * n);
    this.bedeckung = new Float64Array(3 * n);
    this.rand = new Float64Array(T * n);
    this.hatRand = new Uint8Array(n);
    const gemessen = new Uint8Array(n);
    const messen = (v: number) => {
      if (gemessen[v]) return;
      gemessen[v] = 1;
      this.gedaechtnisMessen(v);
    };
    for (const v of frei) {
      messen(v);
      for (const w of h.nachbarn[v]!) messen(w);
    }
    for (const v of this.messend.keys()) {
      messen(v);
      for (const w of h.nachbarn[v]!) messen(w);
    }
    for (let v = 0; v < n; v++) {
      if (!gemessen[v] || this.weiter.has(v)) continue;
      tensorAus(this.basisU(v), this.basisV(v), this.gedaechtnis[3 * v]!, this.gedaechtnis[3 * v + 1]!, this.gedaechtnis[3 * v + 2]!, this.rand, T * v);
      this.hatRand[v] = 1;
    }
    // Loop-Punkte liegen auf Sehnen: ihr Gedächtnis ist das Mittel ihrer Nachbarn, die auf keinem Loop liegen
    for (const v of this.messend.keys()) {
      const S = new Float64Array(T);
      let k = 0;
      for (const w of h.nachbarn[v]!) {
        if (this.weiter.has(w) || !this.hatRand[w]) continue;
        for (let c = 0; c < T; c++) S[c] = S[c]! + this.rand[T * w + c]!;
        k++;
      }
      if (!k) continue;
      for (let c = 0; c < T; c++) S[c] = S[c]! / k;
      inBasis(S, 0, this.basis, 6 * v, this.gedaechtnis, 3 * v);
    }

    const zeilen: NormalZeile[] = [];
    frei.forEach((v, u) => {
      const g = gew[v]!;
      const index: number[] = [u];
      const wert: number[] = [this.diag[u]!];
      h.nachbarn[v]!.forEach((w, kk) => {
        if (nrFeld[w]! < 0 || g[kk] === 0) return;
        index.push(nrFeld[w]!);
        wert.push(-g[kk]!);
      });
      zeilen.push({ index, wert, gewicht: 1 });
      zeilen.push({ index: [u], wert: [1], gewicht: HALT });
    });
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

    // Bedeckung: einmal je Zug (die Richtungen der Loops im Material ändern sich nicht); am Rand und im Halt die Tangentialebene
    const quelleN = new Map<number, Float64Array>();
    for (const [v, js] of this.messend) {
      const q = new Float64Array(T);
      let sw = 0;
      for (const { w, t } of js) {
        tensorAus(t, t, w, 0, 0, q, 0);
        sw += w;
      }
      for (let c = 0; c < T; c++) q[c] = q[c]! / sw;
      quelleN.set(v, q);
    }
    const ebene = new Float64Array(T * n);
    for (let v = 0; v < n; v++) if (this.hatRand[v]) tensorAus(this.basisU(v), this.basisV(v), 1, 0, 1, ebene, T * v);
    this.verteilen(quelleN, ebene, this.bedeckung);
  }

  private basisU(v: number): V {
    return [this.basis[6 * v]!, this.basis[6 * v + 1]!, this.basis[6 * v + 2]!];
  }

  private basisV(v: number): V {
    return [this.basis[6 * v + 3]!, this.basis[6 * v + 4]!, this.basis[6 * v + 5]!];
  }

  /**
   * Ein Tensor harmonisch verteilt (Quellen an den Loop-Punkten, `fest` an festen Punkten ohne Loop und als Halt), je Punkt in seiner
   * Basis nach `out` (a, b, c): in den Feldern die Lösung, an den Loop-Punkten ihre Quelle mit dem Mittel der Nachbarn ohne Loop.
   */
  private verteilen(quellen: ReadonlyMap<number, Float64Array>, fest: Float64Array, out: Float64Array): void {
    const h = this.h;
    const nf = this.frei.length;
    let X: Float64Array | null = null;
    if (this.sys) {
      // rechte Seite der Zeilen: Quellen der Loop-Nachbarn (so weit weitergegeben) und die festen Nachbarn
      const b = new Float64Array(T * nf);
      for (let u = 0; u < nf; u++) {
        const i = this.frei[u]!;
        const g = this.gew[i]!;
        const nb = h.nachbarn[i]!;
        for (let kk = 0; kk < nb.length; kk++) {
          const w = nb[kk]!;
          const gk = g[kk]!;
          if (gk === 0 || this.nrFeld[w]! >= 0) continue;
          const we = this.weiterJe[w]!;
          let q: Float64Array | undefined;
          let f = gk;
          let o = 0;
          if (we < 0) {
            if (!this.hatRand[w]) continue;
            q = fest;
            o = T * w;
          } else if (we > 0) {
            q = quellen.get(w);
            f = gk * we;
          }
          if (!q) continue;
          for (let c = 0; c < T; c++) b[T * u + c] = b[T * u + c]! + f * q[o + c]!;
        }
      }
      // Normalgleichungen: rechte Seite Aᵀb (Zeile u: Diagonale bei u, −g bei den freien Nachbarn) und der Halt
      const rhs = new Float64Array(T * nf);
      for (let u = 0; u < nf; u++) {
        const i = this.frei[u]!;
        const g = this.gew[i]!;
        const d = this.diag[u]!;
        for (let c = 0; c < T; c++) rhs[T * u + c] = rhs[T * u + c]! + HALT * fest[T * i + c]! + d * b[T * u + c]!;
        const nb = h.nachbarn[i]!;
        for (let kk = 0; kk < nb.length; kk++) {
          const q = this.nrFeld[nb[kk]!]!;
          const gk = g[kk]!;
          if (q < 0 || gk === 0) continue;
          for (let c = 0; c < T; c++) rhs[T * q + c] = rhs[T * q + c]! - gk * b[T * u + c]!;
        }
      }
      X = this.sys.loesenSpalten(rhs, T);
      for (let u = 0; u < nf; u++) inBasis(X, T * u, this.basis, 6 * this.frei[u]!, out, 3 * this.frei[u]!);
    }
    const s = new Float64Array(T);
    for (const [v, q] of quellen) {
      s.fill(0);
      let sg = 0;
      const g = this.gew[v]!;
      const nb = h.nachbarn[v]!;
      for (let kk = 0; kk < nb.length; kk++) {
        const w = nb[kk]!;
        if (this.weiterJe[w]! >= 0) continue;
        const gk = g[kk]! || 1e-6;
        const u = this.nrFeld[w]!;
        if (u >= 0 && X) for (let c = 0; c < T; c++) s[c] = s[c]! + gk * X[T * u + c]!;
        else if (this.hatRand[w]) for (let c = 0; c < T; c++) s[c] = s[c]! + gk * fest[T * w + c]!;
        else continue;
        sg += gk;
      }
      for (let c = 0; c < T; c++) s[c] = q[c]! + (sg > 0 ? s[c]! / sg : 0);
      inBasis(s, 0, this.basis, 6 * v, out, 3 * v);
    }
  }

  /**
   * Krümmung der Haut beim Anfassen am Punkt v, mit Richtung: je Kante die Krümmung längs ihrer Richtung (aus ihrer Neigung gegen
   * die Tangentialebene), ein Tensor K = (a, b, c) nach kleinsten Quadraten mit den Gewichten des Lösers × Kantenlänge², dann um ein
   * Vielfaches der Einheit verschoben, bis ½·Spur(K·E) genau die Zahl des Lösers ist (die Gleichungen geben das schon fast).
   */
  private gedaechtnisMessen(v: number): void {
    const P = this.h.pos;
    const nx = this.nor0[3 * v]!;
    const ny = this.nor0[3 * v + 1]!;
    const nz = this.nor0[3 * v + 2]!;
    const [u, w] = tangentialBasis(nx, ny, nz);
    this.basis.set([...u, ...w], 6 * v);
    const g = this.gew[v]!;
    let a00 = 0;
    let a01 = 0;
    let a02 = 0;
    let a11 = 0;
    let a12 = 0;
    let a22 = 0;
    let r0 = 0;
    let r1 = 0;
    let r2 = 0;
    let f0 = 0;
    let f2 = 0;
    let summe = 0;
    let rSumme = 0;
    let eb = 0;
    let e2 = 0;
    this.h.nachbarn[v]!.forEach((q, k) => {
      const gk = g[k]!;
      if (gk === 0) return;
      const ex = P[3 * q]! - P[3 * v]!;
      const ey = P[3 * q + 1]! - P[3 * v + 1]!;
      const ez = P[3 * q + 2]! - P[3 * v + 2]!;
      e2 += gk * (ex * ex + ey * ey + ez * ez);
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
      f0 += wj * p0;
      f2 += wj * p2;
      summe += wj;
      rSumme += wj * kap;
      eb += wj * cu * cv;
    });
    e2 = Math.max(e2, 1e-9);
    let x0 = 0;
    let x1 = 0;
    let x2 = 0;
    if (summe > 0) {
      const eps = 1e-9 * (a00 + a11 + a22);
      const inv = invers3([a00 + eps, a01, a02, a01, a11 + eps, a12, a02, a12, a22 + eps]);
      if (inv) {
        x0 = inv[0] * r0 + inv[1] * r1 + inv[2] * r2;
        x1 = inv[3] * r0 + inv[4] * r1 + inv[5] * r2;
        x2 = inv[6] * r0 + inv[7] * r1 + inv[8] * r2;
      } else {
        x0 = x2 = rSumme / summe;
      }
    }
    // Kanten (Σ g·Länge²·Richtung Richtungᵀ durch das mittlere Kantenquadrat): f0, f2 sind schon Σ w·cu², Σ w·cv²
    const ea = f0 / e2;
    const ebn = eb / e2;
    const ec = f2 / e2;
    // genau die Zahl des Lösers beim Anfassen: ½·Spur(K·E) = Σ w·κ / (2·Kantenquadrat), um δ·Einheit verschoben
    const soll = (0.5 * rSumme) / e2;
    const ist = 0.5 * (x0 * ea + 2 * x1 * ebn + x2 * ec);
    if (ea + ec > 1e-12) {
      const d = (soll - ist) / (0.5 * (ea + ec));
      x0 += d;
      x2 += d;
    }
    this.gedaechtnis.set([x0, x1, x2], 3 * v);
    this.kanten.set([ea, ebn, ec], 3 * v);
  }

  /**
   * Krümmung je Punkt (Maß des Lösers) aus den Zielen `ziele` (3 je Bindung), den Normalen `nor` der Haut jetzt und der Dehnung `sig`
   * aus den Loops: κ = Krümmung der Kette gegen die Normale (nach außen gewölbt positiv), M verteilt, mit der Bedeckung zu K, dann die
   * Zahl. Die Loops sagen die Krümmung, wie sie jetzt sein soll; das Gedächtnis ist die beim Anfassen, mit der Dehnung gestreckt (wie
   * die Haut, die gleichmäßig größer wird). NaN, wo die Krümmung beim Anfassen gilt (feste Punkte, harte Loops, Ecken).
   */
  ziel(ziele: Float64Array, nor: Float64Array, sig: Float64Array): Float64Array {
    const h = this.h;
    const quellen = new Map<number, Float64Array>();
    for (const [v, js] of this.messend) {
      const q = new Float64Array(T);
      let sw = 0;
      for (const { j, w, t } of js) {
        const r = kruemmungUndRichtung(this.ketten.kette[j]!, this.gc.get(j)!, this.gb.get(j)!, ziele);
        let kap = r ? -(r[0][0] * nor[3 * v]! + r[0][1] * nor[3 * v + 1]! + r[0][2] * nor[3 * v + 2]!) : 0;
        // An einer Schlaufe oder Spitze des Loops wird die gemessene Krümmung beliebig groß (die Parabel hat dort kaum Steigung);
        // weitergegeben wird höchstens, was die Proben jetzt auflösen: kein Krümmungsradius unter ihrem Abstand (sonst blähte sich
        // die Haut ins Unendliche, gemessen: 10⁴⁰)
        const hp = probenAbstand(this.ketten.kette[j]!, ziele);
        if (hp > 1e-9) kap = Math.max(-1 / hp, Math.min(1 / hp, kap));
        tensorAus(t, t, w * kap, 0, 0, q, 0);
        sw += w;
      }
      for (let c = 0; c < T; c++) q[c] = q[c]! / sw;
      quellen.set(v, q);
    }
    const M = new Float64Array(3 * h.n);
    this.verteilen(quellen, this.rand, M);
    const out = new Float64Array(h.n).fill(NaN);
    for (const i of this.frei) out[i] = this.zahl(i, M, sig[i]!);
    for (const v of this.messend.keys()) {
      const we = this.weiter.get(v)!;
      out[v] = we * this.zahl(v, M, sig[v]!) + ((1 - we) * this.ruhe[v]!) / sig[v]!;
    }
    return out;
  }

  /**
   * Zahl des Lösers am Punkt i (alles in seiner Basis beim Anfassen): K = symmetrischer Teil von (N + b)⁻¹ (M + b·Gedächtnis / s),
   * dann ½·Spur(K·E). s: Dehnung.
   */
  private zahl(i: number, M: Float64Array, s: number): number {
    const b = BLEIBT / s;
    const A = M[3 * i]! + b * this.gedaechtnis[3 * i]!;
    const B = M[3 * i + 1]! + b * this.gedaechtnis[3 * i + 1]!;
    const C = M[3 * i + 2]! + b * this.gedaechtnis[3 * i + 2]!;
    const p = this.bedeckung[3 * i]! + BLEIBT;
    const q = this.bedeckung[3 * i + 1]!;
    const r = this.bedeckung[3 * i + 2]! + BLEIBT;
    const det = p * r - q * q;
    if (!(det > 1e-18)) return this.ruhe[i]! / s;
    const k11 = (r * A - q * B) / det;
    const k22 = (p * C - q * B) / det;
    const k12 = (0.5 * (r * B - q * C + (p * B - q * A))) / det;
    return 0.5 * (k11 * this.kanten[3 * i]! + 2 * k12 * this.kanten[3 * i + 1]! + k22 * this.kanten[3 * i + 2]!);
  }
}

/** Feste Basis (u, v) der Tangentialebene zur Normale n: u aus der Achse, die am wenigsten in n liegt */
function tangentialBasis(nx: number, ny: number, nz: number): [V, V] {
  const ax = Math.abs(nx);
  const ay = Math.abs(ny);
  const az = Math.abs(nz);
  const a: V = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1];
  const d = a[0] * nx + a[1] * ny + a[2] * nz;
  let ux = a[0] - d * nx;
  let uy = a[1] - d * ny;
  let uz = a[2] - d * nz;
  const l = Math.hypot(ux, uy, uz) || 1;
  ux /= l;
  uy /= l;
  uz /= l;
  return [
    [ux, uy, uz],
    [ny * uz - nz * uy, nz * ux - nx * uz, nx * uy - ny * ux],
  ];
}

/** größter Abstand der Probe in der Mitte der Kette zu ihren Nachbarn (Lagen X, 3 je Bindung) */
function probenAbstand(k: Int32Array, X: Float64Array): number {
  const mi = (k.length - 1) >> 1;
  const a = k[mi]!;
  let hp = 0;
  for (const d of [-1, 1]) {
    const b = k[mi + d];
    if (b === undefined || b < 0) continue;
    hp = Math.max(hp, Math.hypot(X[3 * a]! - X[3 * b]!, X[3 * a + 1]! - X[3 * b + 1]!, X[3 * a + 2]! - X[3 * b + 2]!));
  }
  return hp;
}

/**
 * Tensor im Raum a·u uᵀ + b·(u vᵀ + v uᵀ) + c·v vᵀ zu out ab o addiert (xx, xy, xz, yy, yz, zz). Für einen Loop (κ·t tᵀ) ist
 * u = v = t, b = c = 0.
 */
function tensorAus(u: V, v: V, a: number, b: number, c: number, out: Float64Array, o: number): void {
  out[o] = out[o]! + a * u[0] * u[0] + 2 * b * u[0] * v[0] + c * v[0] * v[0];
  out[o + 1] = out[o + 1]! + a * u[0] * u[1] + b * (u[0] * v[1] + v[0] * u[1]) + c * v[0] * v[1];
  out[o + 2] = out[o + 2]! + a * u[0] * u[2] + b * (u[0] * v[2] + v[0] * u[2]) + c * v[0] * v[2];
  out[o + 3] = out[o + 3]! + a * u[1] * u[1] + 2 * b * u[1] * v[1] + c * v[1] * v[1];
  out[o + 4] = out[o + 4]! + a * u[1] * u[2] + b * (u[1] * v[2] + v[1] * u[2]) + c * v[1] * v[2];
  out[o + 5] = out[o + 5]! + a * u[2] * u[2] + 2 * b * u[2] * v[2] + c * v[2] * v[2];
}

/**
 * (a, b, c) eines Tensors im Raum (6 Werte ab o) in der Basis (u, v) (6 Werte ab ob: u, dann v): uᵀTu, uᵀTv, vᵀTv nach out ab oo
 */
function inBasis(S: Float64Array, o: number, B: Float64Array, ob: number, out: Float64Array, oo: number): void {
  const xx = S[o]!;
  const xy = S[o + 1]!;
  const xz = S[o + 2]!;
  const yy = S[o + 3]!;
  const yz = S[o + 4]!;
  const zz = S[o + 5]!;
  const ux = B[ob]!;
  const uy = B[ob + 1]!;
  const uz = B[ob + 2]!;
  const vx = B[ob + 3]!;
  const vy = B[ob + 4]!;
  const vz = B[ob + 5]!;
  const tvx = xx * vx + xy * vy + xz * vz;
  const tvy = xy * vx + yy * vy + yz * vz;
  const tvz = xz * vx + yz * vy + zz * vz;
  const tux = xx * ux + xy * uy + xz * uz;
  const tuy = xy * ux + yy * uy + yz * uz;
  const tuz = xz * ux + yz * uy + zz * uz;
  out[oo] = ux * tux + uy * tuy + uz * tuz;
  out[oo + 1] = ux * tvx + uy * tvy + uz * tvz;
  out[oo + 2] = vx * tvx + vy * tvy + vz * tvz;
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

/**
 * Krümmungsvektor und Richtung der Kette (Lagen X, 3 je Bindung) aus der Parabel: (2c − (2c·b̂) b̂) / |b|² und b̂; null, wenn die
 * Kette dort keine Steigung hat.
 */
function kruemmungUndRichtung(k: Int32Array, gc: Float64Array, gb: Float64Array, X: Float64Array): [V, V] | null {
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
  if (!(lb2 > 1e-12)) return null;
  const lb = Math.sqrt(lb2);
  const tx = bx / lb;
  const ty = by / lb;
  const tz = bz / lb;
  const ax = 2 * cx;
  const ay = 2 * cy;
  const az = 2 * cz;
  const at = ax * tx + ay * ty + az * tz;
  return [
    [(ax - at * tx) / lb2, (ay - at * ty) / lb2, (az - at * tz) / lb2],
    [tx, ty, tz],
  ];
}
