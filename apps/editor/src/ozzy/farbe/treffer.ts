/**
 * Ozzy, Paint-Modus, Etappe 1: Treffer eines Strahls auf der glatten Anzeige der Haut. Gezeichnet und gefüllt wird dort, wo man die
 * Haut sieht: Der Treffer liegt auf der Fläche, die im Bild steht (nicht auf dem gröberen Rechennetz darunter), und wird dann ein Ort
 * im Dreieck des Rechennetzes (`fein.ts`). Ohne three.
 */
import { feinEcken } from './fein';
import type { Netz, Ort, V3 } from './ort';
import { ortIn } from './ort';

/** ein Treffer: das feine Dreieck (Nummer in der Liste der Anzeige), die Gewichte seiner Ecken, die Weite längs des Strahls */
export type FeinTreffer = { f: number; w0: number; w1: number; w2: number; s: number };

/** der vorderste Treffer eines Strahls (Anfang `o`, Richtung `d`) auf einem Netz, über alle Dreiecke (für einen einzelnen Klick) */
export function strahlAufNetz(pos: ArrayLike<number>, index: ArrayLike<number>, o: V3, d: V3): FeinTreffer | null {
  let best: FeinTreffer | null = null;
  const T = index.length / 3;
  for (let f = 0; f < T; f++) {
    const a = 3 * index[3 * f]!;
    const b = 3 * index[3 * f + 1]!;
    const c = 3 * index[3 * f + 2]!;
    const e1x = pos[b]! - pos[a]!;
    const e1y = pos[b + 1]! - pos[a + 1]!;
    const e1z = pos[b + 2]! - pos[a + 2]!;
    const e2x = pos[c]! - pos[a]!;
    const e2y = pos[c + 1]! - pos[a + 1]!;
    const e2z = pos[c + 2]! - pos[a + 2]!;
    const px = d[1] * e2z - d[2] * e2y;
    const py = d[2] * e2x - d[0] * e2z;
    const pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-14) continue;
    const inv = 1 / det;
    const tx = o[0] - pos[a]!;
    const ty = o[1] - pos[a + 1]!;
    const tz = o[2] - pos[a + 2]!;
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < -1e-9 || u > 1 + 1e-9) continue;
    const qx = ty * e1z - tz * e1y;
    const qy = tz * e1x - tx * e1z;
    const qz = tx * e1y - ty * e1x;
    const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < -1e-9 || u + v > 1 + 1e-9) continue;
    const s = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (s <= 0) continue;
    if (!best || s < best.s) best = { f, w0: 1 - u - v, w1: u, w2: v, s };
  }
  return best;
}

/**
 * Viele gleichgerichtete Strahlen auf dasselbe Netz (eine Zeichnung auf einem Blatt: alle längs seiner Achse): Die Dreiecke stehen
 * in einem Raster quer zur Richtung, jeder Strahl prüft nur die seiner Zelle.
 */
export class ParallelTreffer {
  private readonly u: V3;
  private readonly v: V3;
  private readonly zelle: number;
  private readonly raster = new Map<number, number[]>();
  private readonly U: Float64Array;
  private readonly V: Float64Array;
  private readonly W: Float64Array;

  constructor(
    private readonly pos: ArrayLike<number>,
    private readonly index: ArrayLike<number>,
    private readonly d: V3,
  ) {
    // zwei Richtungen quer zum Strahl
    const h: V3 = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const ux = d[1] * h[2] - d[2] * h[1];
    const uy = d[2] * h[0] - d[0] * h[2];
    const uz = d[0] * h[1] - d[1] * h[0];
    const ul = Math.hypot(ux, uy, uz);
    this.u = [ux / ul, uy / ul, uz / ul];
    this.v = [d[1] * this.u[2] - d[2] * this.u[1], d[2] * this.u[0] - d[0] * this.u[2], d[0] * this.u[1] - d[1] * this.u[0]];
    const n = pos.length / 3;
    this.U = new Float64Array(n);
    this.V = new Float64Array(n);
    this.W = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const x = pos[3 * i]!;
      const y = pos[3 * i + 1]!;
      const z = pos[3 * i + 2]!;
      this.U[i] = x * this.u[0] + y * this.u[1] + z * this.u[2];
      this.V[i] = x * this.v[0] + y * this.v[1] + z * this.v[2];
      this.W[i] = x * d[0] + y * d[1] + z * d[2];
    }
    // Zelle: das Anderthalbfache einer mittleren Kante im Bild quer zum Strahl
    const T = index.length / 3;
    let summe = 0;
    let zahl = 0;
    for (let f = 0; f < T; f += Math.max(1, Math.floor(T / 3000))) {
      const a = index[3 * f]!;
      const b = index[3 * f + 1]!;
      summe += Math.hypot(this.U[a]! - this.U[b]!, this.V[a]! - this.V[b]!);
      zahl++;
    }
    this.zelle = Math.max(1e-9, (1.5 * summe) / Math.max(1, zahl));
    const h0 = this.zelle;
    for (let f = 0; f < T; f++) {
      const a = index[3 * f]!;
      const b = index[3 * f + 1]!;
      const c = index[3 * f + 2]!;
      const i0 = Math.floor(Math.min(this.U[a]!, this.U[b]!, this.U[c]!) / h0);
      const i1 = Math.floor(Math.max(this.U[a]!, this.U[b]!, this.U[c]!) / h0);
      const j0 = Math.floor(Math.min(this.V[a]!, this.V[b]!, this.V[c]!) / h0);
      const j1 = Math.floor(Math.max(this.V[a]!, this.V[b]!, this.V[c]!) / h0);
      if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) continue;
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          const s = Math.imul(i, 73856093) ^ Math.imul(j, 19349663);
          const l = this.raster.get(s);
          if (l) l.push(f);
          else this.raster.set(s, [f]);
        }
    }
  }

  /** der vorderste Treffer des Strahls durch `o` (der Erste längs der Richtung) */
  treffer(o: V3): FeinTreffer | null {
    const pu = o[0] * this.u[0] + o[1] * this.u[1] + o[2] * this.u[2];
    const pv = o[0] * this.v[0] + o[1] * this.v[1] + o[2] * this.v[2];
    const l = this.raster.get(Math.imul(Math.floor(pu / this.zelle), 73856093) ^ Math.imul(Math.floor(pv / this.zelle), 19349663));
    if (!l) return null;
    let best: FeinTreffer | null = null;
    const { U, V, W, index } = this;
    for (const f of l) {
      const a = index[3 * f]!;
      const b = index[3 * f + 1]!;
      const c = index[3 * f + 2]!;
      const x0 = U[a]!;
      const y0 = V[a]!;
      const x1 = U[b]!;
      const y1 = V[b]!;
      const x2 = U[c]!;
      const y2 = V[c]!;
      const det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
      if (Math.abs(det) < 1e-18) continue;
      const w0 = ((y1 - y2) * (pu - x2) + (x2 - x1) * (pv - y2)) / det;
      const w1 = ((y2 - y0) * (pu - x2) + (x0 - x2) * (pv - y2)) / det;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-9 || w1 < -1e-9 || w2 < -1e-9) continue;
      const s = w0 * W[a]! + w1 * W[b]! + w2 * W[c]!;
      if (!best || s < best.s) best = { f, w0, w1, w2, s };
    }
    return best;
  }
}

/** aus einem Treffer auf der glatten Anzeige (Stufe `stufen`) der Ort im Dreieck des Rechennetzes */
export function ortAusFein(netz: Netz, stufen: number, tr: FeinTreffer): Ort {
  const je = 4 ** stufen;
  const t = Math.floor(tr.f / je);
  const E = feinEcken(stufen);
  const o = 6 * (tr.f % je);
  const b = tr.w0 * E[o]! + tr.w1 * E[o + 2]! + tr.w2 * E[o + 4]!;
  const c = tr.w0 * E[o + 1]! + tr.w1 * E[o + 3]! + tr.w2 * E[o + 5]!;
  return ortIn(netz, t, 1 - b - c, b, c);
}
