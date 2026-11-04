// Form zuerst (04.11.2026): runder Körper aus dem Seitenumriss.
//
// Florian zeichnet die Seite und sieht sofort eine runde Form, so rund wie möglich. Jeder Querschnitt ist ein Kreis: An jeder
// Stelle des Umrisses sitzt die größte Kugel, die innen Platz hat (ihre Mitte liegt auf der Mittelachse), und der Körper ist
// die Vereinigung dieser Kugeln. Ein Kreis wird eine Kugel, ein Streifen eine Röhre, ein Oval ein Ei, ein Hals bleibt so
// dünn, wie er gezeichnet ist. Von der Seite gesehen ist die Vereinigung der Kugeln genau die gezeichnete Fläche.
//
// Als Formel (Seite in x/y, Tiefe z): g(x, y) = maxᵢ (Rᵢ² − |(x, y) − cᵢ|²), die Fläche ist die Nullstelle von F = z² − g.
// Nahe jeder Stelle ist sie ein Stück der Kugel, die dort am weitesten reicht; am Umriss steht sie senkrecht, die beiden
// Hälften gehen glatt ineinander über. Vernetzt wird mit Surface Nets auf einem Raster, so dicht wie gewünscht; danach liegen
// die Punkte genau auf der Fläche, und die Normalen sind die Normalen der Kugel. Keine Topologie wird vorab festgelegt.

import type { V2 } from '../bezier';
import { type Naechster, Umrissfeld } from './abstand';
import { type UmrissPunkt, polygonFlaeche, umrissAbtasten } from './umriss';

export type DichtesNetz = {
  positionen: Float32Array;
  normalen: Float32Array;
  indizes: Uint32Array;
  /** Rasterweite des Netzes */
  zelle: number;
  /** abgetasteter Umriss (gegen den Uhrzeigersinn) */
  umriss: V2[];
};

export type RundOptionen = {
  /** gewünschte Dreieckszahl (ungefähr; Surface Nets geben etwa das 1,5-Fache); Standard 40 000 */
  dreiecke?: number;
  /** feste Rasterweite statt der Dreieckszahl */
  zelle?: number;
};

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

/** Die größten Kugeln samt Eimerraster: g(x, y) = maxᵢ (Rᵢ² − |(x, y) − cᵢ|²) und die Kugel, die dort am weitesten reicht. */
class Kugeln {
  private readonly cx: Float64Array;
  private readonly cy: Float64Array;
  private readonly r2: Float64Array;
  private readonly x0: number;
  private readonly y0: number;
  private readonly e: number;
  private readonly nx: number;
  private readonly ny: number;
  private readonly start: Int32Array;
  private readonly liste: Int32Array;
  /** Ergebnis der letzten Abfrage: Mitte der weitesten Kugel */
  mx = 0;
  my = 0;

  constructor(feld: Umrissfeld, R: Float64Array, x0: number, y0: number, x1: number, y1: number, rand: number) {
    const P = feld.p;
    const m = P.length;
    this.cx = new Float64Array(m);
    this.cy = new Float64Array(m);
    this.r2 = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      this.cx[i] = P[i]!.x + R[i]! * feld.pn[2 * i]!;
      this.cy[i] = P[i]!.y + R[i]! * feld.pn[2 * i + 1]!;
      this.r2[i] = R[i]! * R[i]!;
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

  /** g an (x, y); die Mitte der weitesten Kugel steht danach in mx, my. Weit außen: −∞. */
  g(x: number, y: number): number {
    const z = this.iy(y) * this.nx + this.ix(x);
    let best = -Infinity;
    for (let q = this.start[z]!; q < this.start[z + 1]!; q++) {
      const i = this.liste[q]!;
      const dx = x - this.cx[i]!;
      const dy = y - this.cy[i]!;
      const g = this.r2[i]! - dx * dx - dy * dy;
      if (g > best) {
        best = g;
        this.mx = this.cx[i]!;
        this.my = this.cy[i]!;
      }
    }
    return best;
  }
}

/** Runder Körper aus dem Seitenumriss (Punkte in Weltkoordinaten, y nach oben). */
export function rundAusSeite(punkte: readonly UmrissPunkt[], opt: RundOptionen = {}): DichtesNetz {
  // Rasterweite aus der Fläche: Oberfläche runder Körper ≈ 4 × Seitenfläche, zwei Dreiecke je Rasterzelle
  const grob = umrissAbtasten(punkte, 4).punkte;
  const flaeche = Math.max(polygonFlaeche(grob), 1);
  const zelle = Math.max(0.25, opt.zelle ?? Math.sqrt((4 * flaeche) / ((opt.dreiecke ?? 40000) / 2)));
  const { punkte: P } = umrissAbtasten(punkte, zelle / 2);
  const feld = new Umrissfeld(P, 2 * zelle);

  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  for (const q of P) {
    xMin = Math.min(xMin, q.x);
    yMin = Math.min(yMin, q.y);
    xMax = Math.max(xMax, q.x);
    yMax = Math.max(yMax, q.y);
  }
  const diag = Math.hypot(xMax - xMin, yMax - yMin);
  const R = kugelRadien(feld, diag, 0.75 * zelle, 0.05 * zelle);

  // Spalten des Rasters: g je (x, y)
  const rand = 2 * zelle;
  const x0 = xMin - rand;
  const y0 = yMin - rand;
  const nx = Math.ceil((xMax - xMin + 2 * rand) / zelle) + 1;
  const ny = Math.ceil((yMax - yMin + 2 * rand) / zelle) + 1;
  const kugeln = new Kugeln(feld, R, x0, y0, x0 + (nx - 1) * zelle, y0 + (ny - 1) * zelle, 3 * zelle);
  const G = new Float64Array(nx * ny);
  let gMax = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const g = kugeln.g(x0 + i * zelle, y0 + j * zelle);
      // weit außen kennt keine Kugel den Punkt: sicher außen
      G[j * nx + i] = g === -Infinity ? -1e12 : g;
      if (g > gMax) gMax = g;
    }
  }

  // Surface Nets auf einem in z spiegelgleichen Raster (keine Ebene bei z = 0)
  const zMax = Math.sqrt(gMax) + 2 * zelle;
  const nz = 2 * Math.ceil(zMax / zelle) + 2;
  const kc = (nz - 1) / 2;
  const zk = (k: number) => (k - kc) * zelle;
  const F = (i: number, j: number, k: number) => {
    const z = zk(k);
    return z * z - G[j * nx + i]!;
  };
  const nxC = nx - 1;
  const nyC = ny - 1;
  const zellId = (i: number, j: number, k: number) => i + nxC * (j + nyC * k);
  const punktVon = new Map<number, number>();
  const pos: number[] = [];
  const zellen: number[] = [];
  const ecke = new Float64Array(8);
  const ECKEN = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ] as const;
  const KANTEN = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ] as const;
  const zelleSetzen = (i: number, j: number, k: number) => {
    let neg = 0;
    for (let c = 0; c < 8; c++) {
      const e = ECKEN[c]!;
      const f = F(i + e[0], j + e[1], k + e[2]);
      ecke[c] = f;
      if (f < 0) neg++;
    }
    if (neg === 0 || neg === 8) return;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let n = 0;
    for (const [a, b] of KANTEN) {
      const fa = ecke[a]!;
      const fb = ecke[b]!;
      if (fa < 0 === fb < 0) continue;
      const t = fa / (fa - fb);
      const ea = ECKEN[a]!;
      const eb = ECKEN[b]!;
      sx += ea[0] + t * (eb[0] - ea[0]);
      sy += ea[1] + t * (eb[1] - ea[1]);
      sz += ea[2] + t * (eb[2] - ea[2]);
      n++;
    }
    punktVon.set(zellId(i, j, k), pos.length / 3);
    pos.push(x0 + (i + sx / n) * zelle, y0 + (j + sy / n) * zelle, zk(k) + (sz / n) * zelle);
    zellen.push(i, j, k);
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const g00 = G[j * nx + i]!;
      const g10 = G[j * nx + i + 1]!;
      const g01 = G[(j + 1) * nx + i]!;
      const g11 = G[(j + 1) * nx + i + 1]!;
      const gHi = Math.max(g00, g10, g01, g11);
      if (gHi <= 0) continue;
      const gLo = Math.min(g00, g10, g01, g11);
      const zHi = Math.sqrt(gHi);
      const zLo = gLo > 0 ? Math.sqrt(gLo) : 0;
      const lo = (z: number) => Math.max(0, Math.floor(z / zelle + kc - 1) - 1);
      const hi = (z: number) => Math.min(nz - 2, Math.ceil(z / zelle + kc) + 1);
      const aA = lo(-zHi);
      const aB = hi(-zLo);
      const bA = lo(zLo);
      const bB = hi(zHi);
      if (bA <= aB + 1) {
        for (let k = aA; k <= bB; k++) zelleSetzen(i, j, k);
      } else {
        for (let k = aA; k <= aB; k++) zelleSetzen(i, j, k);
        for (let k = bA; k <= bB; k++) zelleSetzen(i, j, k);
      }
    }
  }

  // Vierecke je Rasterkante mit Vorzeichenwechsel, geteilt an der kürzeren Diagonale
  const ind: number[] = [];
  const viereck = (a: number | undefined, b: number | undefined, c: number | undefined, d: number | undefined) => {
    if (a === undefined || b === undefined || c === undefined || d === undefined) return;
    const dist = (u: number, v: number) => Math.hypot(pos[3 * u]! - pos[3 * v]!, pos[3 * u + 1]! - pos[3 * v + 1]!, pos[3 * u + 2]! - pos[3 * v + 2]!);
    if (dist(a, c) <= dist(b, d)) ind.push(a, b, c, a, c, d);
    else ind.push(a, b, d, b, c, d);
  };
  const p = (i: number, j: number, k: number) => punktVon.get(zellId(i, j, k));
  for (let v = 0; v < zellen.length / 3; v++) {
    const i = zellen[3 * v]!;
    const j = zellen[3 * v + 1]!;
    const k = zellen[3 * v + 2]!;
    const f0 = F(i, j, k) < 0;
    if (j >= 1 && k >= 1 && f0 !== F(i + 1, j, k) < 0) viereck(p(i, j - 1, k - 1), p(i, j, k - 1), p(i, j, k), p(i, j - 1, k));
    if (i >= 1 && k >= 1 && f0 !== F(i, j + 1, k) < 0) viereck(p(i - 1, j, k - 1), p(i, j, k - 1), p(i, j, k), p(i - 1, j, k));
    if (i >= 1 && j >= 1 && f0 !== F(i, j, k + 1) < 0) viereck(p(i - 1, j - 1, k), p(i, j - 1, k), p(i, j, k), p(i - 1, j, k));
  }

  // Punkte genau auf die Fläche: auf die Kugel, die dort am weitesten reicht; Normale = Normale dieser Kugel
  const n = pos.length / 3;
  const positionen = new Float32Array(pos);
  const normalen = new Float32Array(3 * n);
  for (let v = 0; v < n; v++) {
    let x = positionen[3 * v]!;
    let y = positionen[3 * v + 1]!;
    let z = positionen[3 * v + 2]!;
    for (let it = 0; it < 4; it++) {
      const g = kugeln.g(x, y);
      if (g === -Infinity) break;
      // F = |(x, y, z) − (m, 0)|² − R²; Newton längs ∇F = 2 ((x, y) − m, z)
      const gx = 2 * (x - kugeln.mx);
      const gy = 2 * (y - kugeln.my);
      const gz = 2 * z;
      const f = z * z - g;
      const gg = gx * gx + gy * gy + gz * gz;
      if (gg < 1e-18) break;
      let s = f / gg;
      const schritt = Math.abs(s) * Math.sqrt(gg);
      if (schritt > zelle) s *= zelle / schritt;
      x -= s * gx;
      y -= s * gy;
      z -= s * gz;
    }
    kugeln.g(x, y);
    const ax = x - kugeln.mx;
    const ay = y - kugeln.my;
    const l = Math.hypot(ax, ay, z) || 1;
    positionen[3 * v] = x;
    positionen[3 * v + 1] = y;
    positionen[3 * v + 2] = z;
    normalen[3 * v] = ax / l;
    normalen[3 * v + 1] = ay / l;
    normalen[3 * v + 2] = z / l;
  }

  // Dreiecke nach außen drehen
  const indizes = new Uint32Array(ind);
  for (let t = 0; t < indizes.length; t += 3) {
    const a = indizes[t]!;
    const b = indizes[t + 1]!;
    const c = indizes[t + 2]!;
    const abx = positionen[3 * b]! - positionen[3 * a]!;
    const aby = positionen[3 * b + 1]! - positionen[3 * a + 1]!;
    const abz = positionen[3 * b + 2]! - positionen[3 * a + 2]!;
    const acx = positionen[3 * c]! - positionen[3 * a]!;
    const acy = positionen[3 * c + 1]! - positionen[3 * a + 1]!;
    const acz = positionen[3 * c + 2]! - positionen[3 * a + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    const sx = normalen[3 * a]! + normalen[3 * b]! + normalen[3 * c]!;
    const sy = normalen[3 * a + 1]! + normalen[3 * b + 1]! + normalen[3 * c + 1]!;
    const sz = normalen[3 * a + 2]! + normalen[3 * b + 2]! + normalen[3 * c + 2]!;
    if (fx * sx + fy * sy + fz * sz < 0) {
      indizes[t + 1] = c;
      indizes[t + 2] = b;
    }
  }
  return { positionen, normalen, indizes, zelle, umriss: P };
}
