// Form zuerst (04.11.2026): Abstand zur gezeichneten Linie.
//
// Vorzeichenbehafteter Abstand zu einem geschlossenen Polygon (gegen den Uhrzeigersinn, innen positiv) mit dem nächsten
// Punkt auf der Linie. Ein Raster über die Strecken macht die Suche örtlich.

import type { V2 } from '../bezier';

export type Naechster = {
  /** Abstand, innen positiv */
  d: number;
  /** nächster Punkt auf der Linie */
  qx: number;
  qy: number;
  /** Strecke i (Punkt i → i + 1) und Anteil t darauf */
  strecke: number;
  t: number;
};

export class Umrissfeld {
  readonly p: readonly V2[];
  /** Innennormale je Strecke */
  readonly sn: Float64Array;
  /** Innennormale je Punkt (Winkelhalbierende der Nachbarstrecken) */
  readonly pn: Float64Array;
  private readonly x0: number;
  private readonly y0: number;
  private readonly c: number;
  private readonly nx: number;
  private readonly ny: number;
  private readonly start: Int32Array;
  private readonly liste: Int32Array;

  constructor(p: readonly V2[], zelle: number) {
    this.p = p;
    const m = p.length;
    this.sn = new Float64Array(2 * m);
    for (let i = 0; i < m; i++) {
      const a = p[i]!;
      const b = p[(i + 1) % m]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      // gegen den Uhrzeigersinn: innen liegt links
      this.sn[2 * i] = -(b.y - a.y) / l;
      this.sn[2 * i + 1] = (b.x - a.x) / l;
    }
    this.pn = new Float64Array(2 * m);
    for (let i = 0; i < m; i++) {
      const j = (i - 1 + m) % m;
      let x = this.sn[2 * i]! + this.sn[2 * j]!;
      let y = this.sn[2 * i + 1]! + this.sn[2 * j + 1]!;
      const l = Math.hypot(x, y);
      if (l < 1e-9) {
        x = this.sn[2 * i]!;
        y = this.sn[2 * i + 1]!;
      } else {
        x /= l;
        y /= l;
      }
      this.pn[2 * i] = x;
      this.pn[2 * i + 1] = y;
    }
    let xMin = Infinity;
    let yMin = Infinity;
    let xMax = -Infinity;
    let yMax = -Infinity;
    for (const q of p) {
      xMin = Math.min(xMin, q.x);
      yMin = Math.min(yMin, q.y);
      xMax = Math.max(xMax, q.x);
      yMax = Math.max(yMax, q.y);
    }
    this.c = zelle;
    this.x0 = xMin - zelle;
    this.y0 = yMin - zelle;
    this.nx = Math.max(1, Math.ceil((xMax - xMin) / zelle) + 2);
    this.ny = Math.max(1, Math.ceil((yMax - yMin) / zelle) + 2);
    const zellen: number[][] = Array.from({ length: this.nx * this.ny }, () => []);
    for (let i = 0; i < m; i++) {
      const a = p[i]!;
      const b = p[(i + 1) % m]!;
      const i0 = this.ix(Math.min(a.x, b.x));
      const i1 = this.ix(Math.max(a.x, b.x));
      const j0 = this.iy(Math.min(a.y, b.y));
      const j1 = this.iy(Math.max(a.y, b.y));
      for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) zellen[j * this.nx + k]!.push(i);
    }
    this.start = new Int32Array(zellen.length + 1);
    let n = 0;
    zellen.forEach((z, i) => {
      this.start[i] = n;
      n += z.length;
    });
    this.start[zellen.length] = n;
    this.liste = new Int32Array(n);
    zellen.forEach((z, i) => this.liste.set(z, this.start[i]!));
  }

  private ix(x: number): number {
    return Math.max(0, Math.min(this.nx - 1, Math.floor((x - this.x0) / this.c)));
  }

  private iy(y: number): number {
    return Math.max(0, Math.min(this.ny - 1, Math.floor((y - this.y0) / this.c)));
  }

  /** Nächster Punkt auf der Linie und vorzeichenbehafteter Abstand. */
  naechster(x: number, y: number, aus: Naechster = { d: 0, qx: 0, qy: 0, strecke: 0, t: 0 }): Naechster {
    const p = this.p;
    const m = p.length;
    const ci = Math.floor((x - this.x0) / this.c);
    const cj = Math.floor((y - this.y0) / this.c);
    // Abstand des Punkts zum Raster, damit die Ringsuche auch außerhalb richtig endet
    const ausserhalb = Math.max(0, this.x0 - x, x - (this.x0 + this.nx * this.c), this.y0 - y, y - (this.y0 + this.ny * this.c));
    let best = Infinity;
    let bs = -1;
    let bt = 0;
    const maxRing = this.nx + this.ny + Math.ceil(ausserhalb / this.c) + 2;
    for (let r = 0; r <= maxRing; r++) {
      const i0 = ci - r;
      const i1 = ci + r;
      const j0 = cj - r;
      const j1 = cj + r;
      for (let j = j0; j <= j1; j++) {
        if (j < 0 || j >= this.ny) continue;
        const rand = j === j0 || j === j1;
        for (let i = i0; i <= i1; i++) {
          if (i < 0 || i >= this.nx) continue;
          if (!rand && i !== i0 && i !== i1) continue;
          const zi = j * this.nx + i;
          for (let q = this.start[zi]!; q < this.start[zi + 1]!; q++) {
            const s = this.liste[q]!;
            const a = p[s]!;
            const b = p[(s + 1) % m]!;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const l2 = dx * dx + dy * dy;
            let t = l2 > 1e-18 ? ((x - a.x) * dx + (y - a.y) * dy) / l2 : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const ex = a.x + t * dx - x;
            const ey = a.y + t * dy - y;
            const d2 = ex * ex + ey * ey;
            if (d2 < best) {
              best = d2;
              bs = s;
              bt = t;
            }
          }
        }
      }
      // alles weiter Entfernte liegt mindestens r Zellen weg
      const sicher = Math.max(0, r * this.c - ausserhalb);
      if (bs >= 0 && best <= sicher * sicher) break;
    }
    const a = p[bs]!;
    const b = p[(bs + 1) % m]!;
    const qx = a.x + bt * (b.x - a.x);
    const qy = a.y + bt * (b.y - a.y);
    let nx: number;
    let ny: number;
    if (bt <= 1e-9) {
      nx = this.pn[2 * bs]!;
      ny = this.pn[2 * bs + 1]!;
    } else if (bt >= 1 - 1e-9) {
      const k = (bs + 1) % m;
      nx = this.pn[2 * k]!;
      ny = this.pn[2 * k + 1]!;
    } else {
      nx = this.sn[2 * bs]!;
      ny = this.sn[2 * bs + 1]!;
    }
    const d = Math.sqrt(best);
    aus.d = (x - qx) * nx + (y - qy) * ny >= 0 ? d : -d;
    aus.qx = qx;
    aus.qy = qy;
    aus.strecke = bs;
    aus.t = bt;
    return aus;
  }
}
