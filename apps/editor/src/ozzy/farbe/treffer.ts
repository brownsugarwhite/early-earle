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

/**
 * Etappe 2: viele Strahlen der Kamera auf dieselbe Haut, solange Ansicht und Haut stehen (eine Kurve, die im Bild gelegt wird). Die
 * Dreiecke des Rechennetzes stehen in einem Raster im Bild; ein Bildpunkt prüft nur die seiner Zelle.
 *
 * Zwei Arten zu treffen: `treffer` trifft das Rechennetz selbst (Gewichte und Tiefe im Raum, mit der Perspektive zurückgerechnet).
 * `trefferFein` trifft die glatte Anzeige (wie `strahlAufNetz` über alle ihre Dreiecke, nur schnell): Geprüft werden die feinen
 * Dreiecke der groben, deren Kasten im Bild (mit Rand: Die glatte Fläche liegt etwas neben dem groben Dreieck) den Bildpunkt
 * enthält. So trifft eine Probe dieselbe Fläche wie ein Klick, auch am Rand eines Körperteils.
 */
export class BildTreffer {
  private readonly sx: Float32Array;
  private readonly sy: Float32Array;
  private readonly sw: Float32Array;
  private readonly st: Float32Array;
  private readonly spalten: number;
  private readonly zeilen: number;
  private readonly anfang: Int32Array;
  private readonly liste: Int32Array;
  /** je Dreieck: zeigt es zum Betrachter (1), und sein Kasten im Bild mit Rand (x0, x1, y0, y1) */
  private readonly vorn: Uint8Array;
  private readonly kasten: Float32Array;

  /**
   * `pos`, `index`: das Rechennetz; `zuWelt`: Welt = Lage / f + (mx, my, 0); `vp`: Projektion · Ansicht, `ansicht` allein (Spalten,
   * wie three); `W`, `H`: Größe des Bilds; `auge`: das Auge in der Welt (null: gleichgerichtete Strahlen längs `blick`);
   * `wicklung`: Umlaufsinn der Dreiecke von außen gesehen (1: Ihre Normale zeigt nach außen). `fein`: die glatte Anzeige (Lagen in
   * der Welt, `je` feine Dreiecke je grobem, hintereinander); `zelle`: Kante einer Zelle des Rasters im Bild.
   */
  constructor(
    pos: ArrayLike<number>,
    private readonly index: ArrayLike<number>,
    zuWelt: { f: number; mx: number; my: number },
    vp: ArrayLike<number>,
    private readonly ansicht: ArrayLike<number>,
    W: number,
    H: number,
    auge: V3 | null,
    blick: V3,
    wicklung: number,
    private readonly fein: { pos: ArrayLike<number>; index: ArrayLike<number>; je: number } | null = null,
    private readonly zelle = 16,
  ) {
    const n = pos.length / 3;
    const X = new Float64Array(3 * n);
    this.sx = new Float32Array(n);
    this.sy = new Float32Array(n);
    this.sw = new Float32Array(n);
    this.st = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = pos[3 * i]! / zuWelt.f + zuWelt.mx;
      const y = pos[3 * i + 1]! / zuWelt.f + zuWelt.my;
      const z = pos[3 * i + 2]! / zuWelt.f;
      X[3 * i] = x;
      X[3 * i + 1] = y;
      X[3 * i + 2] = z;
      const w = vp[3]! * x + vp[7]! * y + vp[11]! * z + vp[15]!;
      this.sw[i] = w;
      if (w > 1e-9) {
        this.sx[i] = (((vp[0]! * x + vp[4]! * y + vp[8]! * z + vp[12]!) / w + 1) / 2) * W;
        this.sy[i] = ((1 - (vp[1]! * x + vp[5]! * y + vp[9]! * z + vp[13]!) / w) / 2) * H;
      }
      this.st[i] = -(ansicht[2]! * x + ansicht[6]! * y + ansicht[10]! * z + ansicht[14]!);
    }
    this.spalten = Math.max(1, Math.ceil(W / zelle));
    this.zeilen = Math.max(1, Math.ceil(H / zelle));
    const T = index.length / 3;
    const zahl = new Int32Array(this.spalten * this.zeilen + 1);
    const zellen = new Int32Array(4 * T).fill(-1);
    this.vorn = new Uint8Array(T);
    this.kasten = new Float32Array(4 * T);
    for (let f = 0; f < T; f++) {
      const a = index[3 * f]!;
      const b = index[3 * f + 1]!;
      const c = index[3 * f + 2]!;
      if (!(this.sw[a]! > 1e-9 && this.sw[b]! > 1e-9 && this.sw[c]! > 1e-9)) continue;
      // zeigt es zum Betrachter?
      const ux = X[3 * b]! - X[3 * a]!;
      const uy = X[3 * b + 1]! - X[3 * a + 1]!;
      const uz = X[3 * b + 2]! - X[3 * a + 2]!;
      const vx = X[3 * c]! - X[3 * a]!;
      const vy = X[3 * c + 1]! - X[3 * a + 1]!;
      const vz = X[3 * c + 2]! - X[3 * a + 2]!;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const bx = auge ? X[3 * a]! - auge[0] : blick[0];
      const by = auge ? X[3 * a + 1]! - auge[1] : blick[1];
      const bz = auge ? X[3 * a + 2]! - auge[2] : blick[2];
      const zeigt = wicklung * (nx * bx + ny * by + nz * bz) < 0;
      this.vorn[f] = zeigt ? 1 : 0;
      // (ohne glatte Anzeige zählen nur die Dreiecke, die zum Betrachter zeigen; mit ihr alle: Am Rand eines Körperteils zeigt ein
      // feines Dreieck zum Betrachter, dessen grobes es nicht tut)
      if (!zeigt && !fein) continue;
      let x0 = Math.min(this.sx[a]!, this.sx[b]!, this.sx[c]!);
      let x1 = Math.max(this.sx[a]!, this.sx[b]!, this.sx[c]!);
      let y0 = Math.min(this.sy[a]!, this.sy[b]!, this.sy[c]!);
      let y1 = Math.max(this.sy[a]!, this.sy[b]!, this.sy[c]!);
      if (fein) {
        const rand = 8 + 0.25 * Math.max(x1 - x0, y1 - y0);
        x0 -= rand;
        x1 += rand;
        y0 -= rand;
        y1 += rand;
      }
      this.kasten[4 * f] = x0;
      this.kasten[4 * f + 1] = x1;
      this.kasten[4 * f + 2] = y0;
      this.kasten[4 * f + 3] = y1;
      const i0 = Math.floor(x0 / zelle);
      const i1 = Math.floor(x1 / zelle);
      const j0 = Math.floor(y0 / zelle);
      const j1 = Math.floor(y1 / zelle);
      if (i1 < 0 || j1 < 0 || i0 >= this.spalten || j0 >= this.zeilen) continue;
      const k0 = Math.max(0, i0);
      const k1 = Math.min(this.spalten - 1, i1);
      const l0 = Math.max(0, j0);
      const l1 = Math.min(this.zeilen - 1, j1);
      zellen[4 * f] = k0;
      zellen[4 * f + 1] = k1;
      zellen[4 * f + 2] = l0;
      zellen[4 * f + 3] = l1;
      for (let j = l0; j <= l1; j++) for (let i = k0; i <= k1; i++) zahl[j * this.spalten + i + 1] = zahl[j * this.spalten + i + 1]! + 1;
    }
    for (let i = 1; i < zahl.length; i++) zahl[i] = zahl[i]! + zahl[i - 1]!;
    this.anfang = zahl;
    this.liste = new Int32Array(zahl[zahl.length - 1]!);
    const voll = new Int32Array(this.spalten * this.zeilen);
    for (let f = 0; f < T; f++) {
      if (zellen[4 * f]! < 0) continue;
      for (let j = zellen[4 * f + 2]!; j <= zellen[4 * f + 3]!; j++)
        for (let i = zellen[4 * f]!; i <= zellen[4 * f + 1]!; i++) {
          const z = j * this.spalten + i;
          this.liste[zahl[z]! + voll[z]!] = f;
          voll[z] = voll[z]! + 1;
        }
    }
  }

  /** der vorderste Treffer unter einem Bildpunkt auf dem Rechennetz: das Dreieck, die Gewichte seiner Ecken (im Raum), die Tiefe zum Betrachter */
  treffer(x: number, y: number): { f: number; w0: number; w1: number; w2: number; tiefe: number } | null {
    const i = Math.floor(x / this.zelle);
    const j = Math.floor(y / this.zelle);
    if (i < 0 || j < 0 || i >= this.spalten || j >= this.zeilen) return null;
    const z = j * this.spalten + i;
    const { sx, sy, sw, st, index, liste } = this;
    let best: { f: number; w0: number; w1: number; w2: number; tiefe: number } | null = null;
    for (let q = this.anfang[z]!; q < this.anfang[z + 1]!; q++) {
      const f = liste[q]!;
      if (!this.vorn[f]) continue;
      const a = index[3 * f]!;
      const b = index[3 * f + 1]!;
      const c = index[3 * f + 2]!;
      const x2 = sx[c]!;
      const y2 = sy[c]!;
      const det = (sy[b]! - y2) * (sx[a]! - x2) + (x2 - sx[b]!) * (sy[a]! - y2);
      if (Math.abs(det) < 1e-12) continue;
      const l0 = ((sy[b]! - y2) * (x - x2) + (x2 - sx[b]!) * (y - y2)) / det;
      const l1 = ((y2 - sy[a]!) * (x - x2) + (sx[a]! - x2) * (y - y2)) / det;
      const l2 = 1 - l0 - l1;
      if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
      // im Bild gemessen; im Raum zählt jede Ecke mit dem Kehrwert ihrer Weite
      const q0 = Math.max(0, l0) / sw[a]!;
      const q1 = Math.max(0, l1) / sw[b]!;
      const q2 = Math.max(0, l2) / sw[c]!;
      const su = q0 + q1 + q2;
      if (!(su > 0)) continue;
      const w0 = q0 / su;
      const w1 = q1 / su;
      const w2 = q2 / su;
      const tiefe = w0 * st[a]! + w1 * st[b]! + w2 * st[c]!;
      if (!best || tiefe < best.tiefe) best = { f, w0, w1, w2, tiefe };
    }
    return best;
  }

  /**
   * Der vorderste Treffer des Strahls durch den Bildpunkt (x, y) auf der glatten Anzeige (`o`, `d`: der Strahl in der Welt): das
   * feine Dreieck, die Gewichte seiner Ecken, die Weite längs des Strahls und die Tiefe zum Betrachter. Null ohne glatte Anzeige
   * oder ohne Treffer.
   */
  trefferFein(x: number, y: number, o: V3, d: V3): (FeinTreffer & { tiefe: number }) | null {
    const F = this.fein;
    if (!F) return null;
    const i = Math.floor(x / this.zelle);
    const j = Math.floor(y / this.zelle);
    if (i < 0 || j < 0 || i >= this.spalten || j >= this.zeilen) return null;
    const z = j * this.spalten + i;
    const K = this.kasten;
    const pos = F.pos;
    const index = F.index;
    let bf = -1;
    let bu = 0;
    let bv = 0;
    let bs = Infinity;
    for (let q = this.anfang[z]!; q < this.anfang[z + 1]!; q++) {
      const g = this.liste[q]!;
      if (x < K[4 * g]! || x > K[4 * g + 1]! || y < K[4 * g + 2]! || y > K[4 * g + 3]!) continue;
      for (let f = g * F.je; f < (g + 1) * F.je; f++) {
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
        if (s <= 0 || s >= bs) continue;
        bs = s;
        bf = f;
        bu = u;
        bv = v;
      }
    }
    if (bf < 0) return null;
    const A = this.ansicht;
    const wx = o[0] + bs * d[0];
    const wy = o[1] + bs * d[1];
    const wz = o[2] + bs * d[2];
    return { f: bf, w0: 1 - bu - bv, w1: bu, w2: bv, s: bs, tiefe: -(A[2]! * wx + A[6]! * wy + A[10]! * wz + A[14]!) };
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
