// Genauer Zug (Plan `docs/plans/2026-10-20-genauer-zug.md`): Der Pinsel „Ziehen“ verschiebt Käfigpunkte mit Abfall; die
// Haut folgt dem Zeiger dabei nur zum Teil, weil die Käfigpunkte neben der Fläche liegen und Catmull–Clark sie mittelt
// (ein Punkt bewegt seine eigene Grenzlage nur zu 16/36, auf einer scharfen Kante zu 4/6). Die Haut ist linear im Käfig
// (feine Lagen = Grenzmatrix · Käfig): Der getroffene Hautpunkt ist eine feste Mischung der Käfigpunkte (Stencil), ein
// Pinselversatz D bewegt ihn um A·D (3 × 3). Mit D = A⁻¹·d landet er genau dort, wohin der Zeiger zieht; Radius und Abfall
// des Pinsels bleiben, nur die Stärke stimmt. DOM-frei.

import type { DuennMatrix } from '../subdivision/matrix';

type V3 = [number, number, number];
/** 3 × 3-Matrix, zeilenweise */
export type M3 = [number, number, number, number, number, number, number, number, number];

/**
 * Grundlage des gezeigten Körpers: Grenzmatrix (feine Lagen ← Käfig) und die feinen Flächen in der Reihenfolge, in der
 * `zuDreiecken` sie in Dreiecke zerlegt (Fächer f[0], f[i], f[i+1] je Fläche).
 */
export type ZugGrundlage = { grenze: DuennMatrix; flaechen: readonly (readonly number[])[] };

/** Hautpunkt als Mischung der Käfigpunkte: p = Σ gewichte[k] · X[punkte[k]] (Summe der Gewichte 1). */
export type Stencil = { punkte: Uint32Array; gewichte: Float64Array };

const faecherMerk = new WeakMap<readonly (readonly number[])[], Uint32Array>();

/** Erstes Dreieck je feiner Fläche (letzter Eintrag = Zahl der Dreiecke), gemerkt je Flächenliste. */
function faecherStart(flaechen: readonly (readonly number[])[]): Uint32Array {
  let s = faecherMerk.get(flaechen);
  if (!s) {
    s = new Uint32Array(flaechen.length + 1);
    for (let f = 0; f < flaechen.length; f++) s[f + 1] = s[f]! + Math.max(0, flaechen[f]!.length - 2);
    faecherMerk.set(flaechen, s);
  }
  return s;
}

/** Zahl der Körperdreiecke der Grundlage (zum Abgleich mit dem gezeigten Netz). */
export function grundlageDreiecke(g: ZugGrundlage): number {
  const s = faecherStart(g.flaechen);
  return s[s.length - 1]!;
}

/** Feine Fläche des Körperdreiecks (Fächer-Reihenfolge), −1 außerhalb des Körpers (angesetzte Teile, Klingen). */
export function flaecheVonDreieck(g: ZugGrundlage, dreieck: number): number {
  const start = faecherStart(g.flaechen);
  const nF = g.flaechen.length;
  if (!Number.isInteger(dreieck) || dreieck < 0 || dreieck >= start[nF]!) return -1;
  // Fläche mit start[f] ≤ dreieck < start[f + 1]
  let lo = 0;
  let hi = nF - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (start[m]! <= dreieck) lo = m;
    else hi = m - 1;
  }
  return lo;
}

/**
 * Stencil des Hautpunkts im Körperdreieck `dreieck` mit baryzentrischen Gewichten (zu den drei Ecken in Fächer-Reihenfolge).
 * null, wenn das Dreieck nicht zum Körper der Grundlage gehört (angesetzte Teile, Klingen).
 */
export function trefferStencil(g: ZugGrundlage, dreieck: number, bary: readonly [number, number, number]): Stencil | null {
  const fi = flaecheVonDreieck(g, dreieck);
  if (fi < 0) return null;
  const f = g.flaechen[fi]!;
  const i = dreieck - faecherStart(g.flaechen)[fi]! + 1;
  const ecken = [f[0]!, f[i]!, f[i + 1]!];
  const summe = new Map<number, number>();
  const M = g.grenze;
  for (let k = 0; k < 3; k++) {
    const b = bary[k]!;
    if (b === 0) continue;
    const z = ecken[k]!;
    for (let h = M.start[z]!; h < M.start[z + 1]!; h++) {
      const j = M.index[h]!;
      summe.set(j, (summe.get(j) ?? 0) + b * M.wert[h]!);
    }
  }
  const punkte = Uint32Array.from([...summe.keys()].sort((a, b) => a - b));
  const gewichte = Float64Array.from(punkte, (j) => summe.get(j)!);
  return { punkte, gewichte };
}

/** Baryzentrische Gewichte von p im Dreieck (a, b, c), auf die Dreiecksebene projiziert. */
export function baryzentrisch(p: readonly number[], a: readonly number[], b: readonly number[], c: readonly number[]): [number, number, number] {
  const v0 = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
  const v1 = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!];
  const v2 = [p[0]! - a[0]!, p[1]! - a[1]!, p[2]! - a[2]!];
  const d00 = v0[0]! * v0[0]! + v0[1]! * v0[1]! + v0[2]! * v0[2]!;
  const d01 = v0[0]! * v1[0]! + v0[1]! * v1[1]! + v0[2]! * v1[2]!;
  const d11 = v1[0]! * v1[0]! + v1[1]! * v1[1]! + v1[2]! * v1[2]!;
  const d20 = v2[0]! * v0[0]! + v2[1]! * v0[1]! + v2[2]! * v0[2]!;
  const d21 = v2[0]! * v1[0]! + v2[1]! * v1[1]! + v2[2]! * v1[2]!;
  const n = d00 * d11 - d01 * d01;
  if (Math.abs(n) < 1e-30) return [1, 0, 0];
  const v = (d11 * d20 - d01 * d21) / n;
  const w = (d00 * d21 - d01 * d20) / n;
  return [1 - v - w, v, w];
}

/** Lage des Hautpunkts für Käfiglagen xyz. */
export function stencilLage(st: Stencil, xyz: ArrayLike<number>): V3 {
  const p: V3 = [0, 0, 0];
  for (let k = 0; k < st.punkte.length; k++) {
    const j = st.punkte[k]!;
    const g = st.gewichte[k]!;
    p[0] += g * xyz[3 * j]!;
    p[1] += g * xyz[3 * j + 1]!;
    p[2] += g * xyz[3 * j + 2]!;
  }
  return p;
}

/**
 * Verstärkung A = Σ cᵢ · Wᵢ: Bewegt ein Pinselversatz D jeden Käfigpunkt i um Wᵢ · D, wandert der Hautpunkt um A · D.
 * `wirkung` liefert Wᵢ (zeilenweise) oder null für Punkte, die sich nicht bewegen.
 */
export function verstaerkung(st: Stencil, wirkung: (punkt: number) => M3 | null): M3 {
  const A: M3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < st.punkte.length; k++) {
    const W = wirkung(st.punkte[k]!);
    if (!W) continue;
    const c = st.gewichte[k]!;
    for (let e = 0; e < 9; e++) A[e] = A[e]! + c * W[e]!;
  }
  return A;
}

/**
 * Wirkung des gespiegelten Pinsels in der Grundform (`pinselZeiger`): Gewicht w zum Treffer und ws zu seinem Spiegelbild,
 * ΔX = w · D + ws · M · D mit M = diag(1, 1, −1). Auf der Naht ist w = ws, z bleibt 0.
 */
export function spiegelWirkung(w: number, ws: number): M3 | null {
  if (w <= 0 && ws <= 0) return null;
  return [w + ws, 0, 0, 0, w + ws, 0, 0, 0, w - ws];
}

/**
 * Wirkung des Pinsels in einer Pose (`poseSchreiben`): Der posierte Zuwachs w · D eines Punkts wird mit seiner Drehung R
 * in die Ruhe gedreht, dort gespiegelt und mit der Drehung des Partners wieder posiert. Ein Punkt j mit Partner j' wandert
 * so um (wⱼ · I + wⱼ' · Rⱼ M Rⱼ'ᵀ) · D, ein Nahtpunkt um 2 wⱼ · Rⱼ P Rⱼᵀ · D (P = diag(1, 1, 0)). `dreh` = je Punkt R
 * zeilenweise (posiert = R · Ruhe).
 */
export function poseWirkung(dreh: ArrayLike<number>, j: number, partner: number, w: number, wPartner: number): M3 | null {
  const R = (i: number, r: number, c: number) => dreh[9 * i + 3 * r + c]!;
  if (partner === j) {
    if (w <= 0) return null;
    const out: M3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    // 2w · R P Rᵀ: P lässt die z-Spalte weg
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[3 * r + c] = 2 * w * (R(j, r, 0) * R(j, c, 0) + R(j, r, 1) * R(j, c, 1));
    return out;
  }
  if (w <= 0 && wPartner <= 0) return null;
  const out: M3 = [w, 0, 0, 0, w, 0, 0, 0, w];
  if (wPartner > 0 && partner >= 0) {
    // wPartner · Rⱼ M Rⱼ'ᵀ
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += R(j, r, k) * (k === 2 ? -1 : 1) * R(partner, c, k);
        out[3 * r + c] = out[3 * r + c]! + wPartner * s;
      }
  }
  return out;
}

export type GenauerVersatz = {
  /** Pinselversatz, der den Hautpunkt um d bewegt (so weit der Körper kann) */
  D: V3;
  /** tatsächliche Bewegung des Hautpunkts A · D */
  bewegung: V3;
  /** |A · D − d| */
  rest: number;
  /** eine Richtung war zu schwach (Radius klein gegen den Käfig) und wurde auf `grenze` begrenzt */
  begrenzt: boolean;
  /** eine Richtung kann der Körper hier gar nicht (z auf der Mittelnaht) und bleibt stehen */
  gesperrt: boolean;
};

/** A · v */
function mal(A: M3, v: readonly number[]): V3 {
  return [A[0] * v[0]! + A[1] * v[1]! + A[2] * v[2]!, A[3] * v[0]! + A[4] * v[1]! + A[5] * v[2]!, A[6] * v[0]! + A[7] * v[1]! + A[8] * v[2]!];
}

/** Eigenzerlegung einer symmetrischen 3 × 3-Matrix (Jacobi): Eigenwerte und Eigenvektoren (Spalten von V, zeilenweise). */
function eigenSym(S: M3): { werte: V3; V: M3 } {
  const a = [...S] as M3;
  const V: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (let runde = 0; runde < 50; runde++) {
    let p = 0;
    let q = 1;
    let gross = Math.abs(a[1]);
    if (Math.abs(a[2]) > gross) {
      gross = Math.abs(a[2]);
      p = 0;
      q = 2;
    }
    if (Math.abs(a[5]) > gross) {
      gross = Math.abs(a[5]);
      p = 1;
      q = 2;
    }
    if (gross < 1e-15 * (Math.abs(a[0]) + Math.abs(a[4]) + Math.abs(a[8]) + 1e-300)) break;
    const app = a[3 * p + p]!;
    const aqq = a[3 * q + q]!;
    const apq = a[3 * p + q]!;
    const theta = (aqq - app) / (2 * apq);
    const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;
    // a ← Jᵀ a J mit J = Drehung in (p, q)
    for (let k = 0; k < 3; k++) {
      const akp = a[3 * k + p]!;
      const akq = a[3 * k + q]!;
      a[3 * k + p] = c * akp - s * akq;
      a[3 * k + q] = s * akp + c * akq;
    }
    for (let k = 0; k < 3; k++) {
      const apk = a[3 * p + k]!;
      const aqk = a[3 * q + k]!;
      a[3 * p + k] = c * apk - s * aqk;
      a[3 * q + k] = s * apk + c * aqk;
    }
    for (let k = 0; k < 3; k++) {
      const vkp = V[3 * k + p]!;
      const vkq = V[3 * k + q]!;
      V[3 * k + p] = c * vkp - s * vkq;
      V[3 * k + q] = s * vkp + c * vkq;
    }
  }
  return { werte: [a[0], a[4], a[8]], V };
}

/**
 * Pinselversatz D, mit dem der Hautpunkt genau um d wandert: D = A⁺ · d über die Singulärwerte von A. Richtungen mit
 * Singulärwert unter `aus` · σmax kann der Körper nicht (z auf der Naht) — sie bleiben stehen; Richtungen unter `grenze`
 * würden die Käfigpunkte vervielfachen — sie werden höchstens um 1/`grenze` verstärkt (Hinweis „begrenzt“).
 */
export function genauerVersatz(A: M3, d: readonly number[], opt: { grenze?: number; aus?: number } = {}): GenauerVersatz {
  const grenze = opt.grenze ?? 0.25;
  const aus = opt.aus ?? 0.02;
  // AᵀA = V Σ² Vᵀ; A⁺ d = V Σ⁻² Vᵀ Aᵀ d (Σ⁻² nur für zulässige Richtungen)
  const AtA: M3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) AtA[3 * r + c] = A[r]! * A[c]! + A[3 + r]! * A[3 + c]! + A[6 + r]! * A[6 + c]!;
  const { werte, V } = eigenSym(AtA);
  const sigma = werte.map((l) => Math.sqrt(Math.max(0, l))) as V3;
  const sMax = Math.max(...sigma);
  const Atd: V3 = [A[0] * d[0]! + A[3] * d[1]! + A[6] * d[2]!, A[1] * d[0]! + A[4] * d[1]! + A[7] * d[2]!, A[2] * d[0]! + A[5] * d[1]! + A[8] * d[2]!];
  const D: V3 = [0, 0, 0];
  let begrenzt = false;
  let gesperrt = false;
  for (let k = 0; k < 3; k++) {
    const s = sigma[k]!;
    const v: V3 = [V[k]!, V[3 + k]!, V[6 + k]!];
    const proj = v[0] * Atd[0] + v[1] * Atd[1] + v[2] * Atd[2];
    if (s <= aus * sMax || s < 1e-12) {
      if (Math.abs(proj) > 1e-15) gesperrt = true;
      continue;
    }
    // genau: proj / s² (die Bewegung längs u_k ist dann genau die Komponente von d); begrenzt: höchstens 1/grenze-fach
    let faktor = 1 / (s * s);
    if (s < grenze) {
      faktor = 1 / (s * grenze);
      begrenzt = true;
    }
    for (let e = 0; e < 3; e++) D[e] = D[e]! + v[e]! * proj * faktor;
  }
  const bewegung = mal(A, D);
  const rest = Math.hypot(bewegung[0] - d[0]!, bewegung[1] - d[1]!, bewegung[2] - d[2]!);
  return { D, bewegung, rest, begrenzt, gesperrt };
}
