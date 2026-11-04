// Form zuerst (04.11.2026): die größten Kugeln im Seitenumriss.
//
// An jeder Stelle des Umrisses sitzt die größte Kugel, die innen Platz hat (ihre Mitte liegt auf der Mittelachse). Der Körper
// ist die Vereinigung dieser Kugeln: g(x, y) = maxᵢ (Rᵢ² − |(x, y) − cᵢ|²), die Fläche ist z² = g.

import { type Naechster, Umrissfeld } from './abstand';

const leer = (): Naechster => ({ d: 0, qx: 0, qy: 0, strecke: 0, t: 0 });

/**
 * Radius der größten Kugel, die an jedem Umrisspunkt innen Platz hat (schrumpfende Kugel). `tol`: so viel darf die Kugel den
 * abgetasteten Umriss schneiden — die Sehnen zwischen den Abtastpunkten liegen etwas innen, ohne Toleranz schrumpft jede
 * Kugel an der Ecke des Polygons auf null.
 */
export function kugelRadien(feld: Umrissfeld, start: number, rMin: number, tol: number): Float64Array {
  const P = feld.p;
  const m = P.length;
  const R = new Float64Array(m);
  const nb = leer();
  for (let i = 0; i < m; i++) {
    const b = P[i]!;
    const nx = feld.pn[2 * i]!;
    const ny = feld.pn[2 * i + 1]!;
    let r = start;
    for (let it = 0; it < 60; it++) {
      const cx = b.x + r * nx;
      const cy = b.y + r * ny;
      feld.naechster(cx, cy, nb);
      if (Math.hypot(nb.qx - cx, nb.qy - cy) >= r - tol) break;
      // Kugel durch b (tangential) und den näheren Punkt q
      const vx = nb.qx - b.x;
      const vy = nb.qy - b.y;
      const dot = vx * nx + vy * ny;
      if (dot <= 1e-12) break;
      const neu = (vx * vx + vy * vy) / (2 * dot);
      if (!(neu < r)) break;
      r = neu;
    }
    R[i] = Math.max(r, rMin);
  }
  // leicht entlang des Umrisses glätten (Abtastrauschen)
  const tmp = new Float64Array(m);
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < m; i++) tmp[i] = (R[(i - 1 + m) % m]! + 2 * R[i]! + R[(i + 1) % m]!) / 4;
    R.set(tmp);
  }
  return R;
}

/** Die größten Kugeln samt Eimerraster: g an (x, y) und die Kugel, die dort am weitesten reicht. */
export class Kugeln {
  private readonly cx: Float64Array;
  private readonly cy: Float64Array;
  private readonly r: Float64Array;
  private readonly x0: number;
  private readonly y0: number;
  private readonly e: number;
  private readonly nx: number;
  private readonly ny: number;
  private readonly start: Int32Array;
  private readonly liste: Int32Array;
  /** Ergebnis der letzten Abfrage: Mitte und Radius der weitesten Kugel */
  mx = 0;
  my = 0;
  mr = 0;

  constructor(feld: Umrissfeld, R: Float64Array, x0: number, y0: number, x1: number, y1: number, rand: number) {
    const P = feld.p;
    const m = P.length;
    this.cx = new Float64Array(m);
    this.cy = new Float64Array(m);
    this.r = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      this.cx[i] = P[i]!.x + R[i]! * feld.pn[2 * i]!;
      this.cy[i] = P[i]!.y + R[i]! * feld.pn[2 * i + 1]!;
      this.r[i] = R[i]!;
    }
    this.e = Math.max((x1 - x0) / 48, (y1 - y0) / 48, 1e-6);
    this.x0 = x0;
    this.y0 = y0;
    this.nx = Math.ceil((x1 - x0) / this.e) + 1;
    this.ny = Math.ceil((y1 - y0) / this.e) + 1;
    const eimer: number[][] = Array.from({ length: this.nx * this.ny }, () => []);
    for (let i = 0; i < m; i++) {
      const r = R[i]! + rand;
      const i0 = this.ix(this.cx[i]! - r);
      const i1 = this.ix(this.cx[i]! + r);
      const j0 = this.iy(this.cy[i]! - r);
      const j1 = this.iy(this.cy[i]! + r);
      for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) eimer[j * this.nx + k]!.push(i);
    }
    this.start = new Int32Array(eimer.length + 1);
    let n = 0;
    eimer.forEach((z, i) => {
      this.start[i] = n;
      n += z.length;
    });
    this.start[eimer.length] = n;
    this.liste = new Int32Array(n);
    eimer.forEach((z, i) => this.liste.set(z, this.start[i]!));
  }

  private ix(x: number): number {
    return Math.max(0, Math.min(this.nx - 1, Math.floor((x - this.x0) / this.e)));
  }

  private iy(y: number): number {
    return Math.max(0, Math.min(this.ny - 1, Math.floor((y - this.y0) / this.e)));
  }

  /** g an (x, y); Mitte und Radius der weitesten Kugel stehen danach in mx, my, mr. Weit außen: −∞. */
  g(x: number, y: number): number {
    const z = this.iy(y) * this.nx + this.ix(x);
    let best = -Infinity;
    for (let q = this.start[z]!; q < this.start[z + 1]!; q++) {
      const i = this.liste[q]!;
      const dx = x - this.cx[i]!;
      const dy = y - this.cy[i]!;
      const r = this.r[i]!;
      const g = r * r - dx * dx - dy * dy;
      if (g > best) {
        best = g;
        this.mx = this.cx[i]!;
        this.my = this.cy[i]!;
        this.mr = r;
      }
    }
    return best;
  }
}
