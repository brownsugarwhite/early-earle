// Form zuerst (05.11.2026): Grundteile des Mauls — Abtasten von Linien, Breite einer Lippe, Tiefe aus einem Netz, Abstand von
// einer Lippe längs der Form, Flächennormale. Geteilt vom Schnitt mit zusammenliegenden Lippen (`maul.ts`) und dem mit getrennten
// Kiefern (`kiefer.ts`).

import type { V2 } from '../bezier';
import type { MaulPunkt } from './maul';
import type { Kontur } from './raumlinien';
import { type UmrissPunkt, linienStuecke, punktAufStueck } from './umriss';

export const glatt = (e0: number, e1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export const glattAbl = (e0: number, e1: number, x: number): number => {
  const t = (x - e0) / (e1 - e0);
  return t <= 0 || t >= 1 ? 0 : (6 * t * (1 - t)) / (e1 - e0);
};

/** Die Linie als dichte Polylinie (Abstand ≈ s) mit Bogenlänge je Probe und der Bogenlänge, bei der jeder ihrer Punkte liegt. */
export function abtasten(punkte: readonly UmrissPunkt[], s: number): { p: V2[]; bogen: number[]; knoten: number[] } {
  const p: V2[] = [];
  const st = linienStuecke(punkte);
  const ki = [0];
  st.forEach((k, i) => {
    const grob = Math.hypot(k[1].x - k[0].x, k[1].y - k[0].y) + Math.hypot(k[2].x - k[1].x, k[2].y - k[1].y) + Math.hypot(k[3].x - k[2].x, k[3].y - k[2].y);
    const n = Math.max(2, Math.ceil(grob / s));
    for (let j = i === 0 ? 0 : 1; j <= n; j++) p.push(punktAufStueck(k, j / n));
    ki.push(p.length - 1);
  });
  const bogen = [0];
  for (let i = 1; i < p.length; i++) bogen.push(bogen[i - 1]! + Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y));
  return { p, bogen, knoten: ki.map((i) => bogen[i]!) };
}

/**
 * Breite einer Lippe gegen die Form je Bogenanteil (0 … 1), durch ihre Punkte (`t`: Bogenanteil je Punkt; monoton kubisch,
 * ohne Überschwingen). Der Anfang liegt auf dem Umriss, wo die Form keine Tiefe hat: er nimmt die Breite des zweiten Punkts.
 * Am Mundwinkel treffen sich die Lippen: dort 1.
 */
export function lippenBreite(punkte: readonly MaulPunkt[], t: readonly number[]): (a: number) => number {
  const n = punkte.length;
  const v = punkte.map((q) => Math.max(0.2, Math.min(4, q.b ?? 1)));
  v[n - 1] = 1;
  v[0] = n >= 3 ? v[1]! : 1;
  if (v.every((x) => x === 1)) return () => 1;
  const d: number[] = [];
  for (let k = 0; k + 1 < n; k++) d.push((v[k + 1]! - v[k]!) / Math.max(1e-9, t[k + 1]! - t[k]!));
  const m = v.map((_, k) => (k === 0 ? d[0]! : k === n - 1 ? d[n - 2]! : d[k - 1]! * d[k]! <= 0 ? 0 : (d[k - 1]! + d[k]!) / 2));
  for (let k = 0; k + 1 < n; k++) {
    if (d[k] === 0) {
      m[k] = 0;
      m[k + 1] = 0;
      continue;
    }
    const a = m[k]! / d[k]!;
    const b = m[k + 1]! / d[k]!;
    const q = a * a + b * b;
    if (q > 9) {
      const tau = 3 / Math.sqrt(q);
      m[k] = tau * a * d[k]!;
      m[k + 1] = tau * b * d[k]!;
    }
  }
  return (a: number): number => {
    const x = Math.max(0, Math.min(1, a));
    let k = 0;
    while (k < n - 2 && x > t[k + 1]!) k++;
    const h = t[k + 1]! - t[k]!;
    if (h <= 1e-9) return v[k + 1]!;
    const u = (x - t[k]!) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v[k]! + (u3 - 2 * u2 + u) * h * m[k]! + (-2 * u3 + 3 * u2) * v[k + 1]! + (u3 - u2) * h * m[k + 1]!;
  };
}

/** Kleiner Binärheap für Dijkstra (Schlüssel, Knoten). */
export class Haufen {
  k: number[] = [];
  v: number[] = [];
  rein(k: number, v: number): void {
    this.k.push(k);
    this.v.push(v);
    let i = this.k.length - 1;
    while (i > 0) {
      const e = (i - 1) >> 1;
      if (this.k[e]! <= this.k[i]!) break;
      [this.k[e], this.k[i]] = [this.k[i]!, this.k[e]!];
      [this.v[e], this.v[i]] = [this.v[i]!, this.v[e]!];
      i = e;
    }
  }
  raus(): [number, number] | null {
    if (this.k.length === 0) return null;
    const r: [number, number] = [this.k[0]!, this.v[0]!];
    const lk = this.k.pop()!;
    const lv = this.v.pop()!;
    if (this.k.length > 0) {
      this.k[0] = lk;
      this.v[0] = lv;
      let i = 0;
      for (;;) {
        const a = 2 * i + 1;
        const b = a + 1;
        let m = i;
        if (a < this.k.length && this.k[a]! < this.k[m]!) m = a;
        if (b < this.k.length && this.k[b]! < this.k[m]!) m = b;
        if (m === i) break;
        [this.k[m], this.k[i]] = [this.k[i]!, this.k[m]!];
        [this.v[m], this.v[i]] = [this.v[i]!, this.v[m]!];
        i = m;
      }
    }
    return r;
  }
}

/**
 * Tiefe der Form je Stelle der Seite aus einem fertigen Netz (größtes |z| über der Stelle), für Körper ohne eigene Kontur
 * (alle Ansichten gleichwertig): Dreiecke auf ein Raster der Weite d legen.
 */
export function konturAusNetz(pos: Float32Array, ind: Uint32Array, d: number): Kontur {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let v = 0; v < pos.length / 3; v++) {
    x0 = Math.min(x0, pos[3 * v]!);
    y0 = Math.min(y0, pos[3 * v + 1]!);
    x1 = Math.max(x1, pos[3 * v]!);
    y1 = Math.max(y1, pos[3 * v + 1]!);
  }
  x0 -= 2 * d;
  y0 -= 2 * d;
  const nx = Math.ceil((x1 + 2 * d - x0) / d) + 1;
  const ny = Math.ceil((y1 + 2 * d - y0) / d) + 1;
  const Z = new Float64Array(nx * ny);
  for (let t = 0; t < ind.length; t += 3) {
    const a = ind[t]!;
    const b = ind[t + 1]!;
    const c = ind[t + 2]!;
    const ax = pos[3 * a]!;
    const ay = pos[3 * a + 1]!;
    const bx = pos[3 * b]!;
    const by = pos[3 * b + 1]!;
    const cx = pos[3 * c]!;
    const cy = pos[3 * c + 1]!;
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(det) < 1e-12) continue;
    const za = Math.abs(pos[3 * a + 2]!);
    const zb = Math.abs(pos[3 * b + 2]!);
    const zc = Math.abs(pos[3 * c + 2]!);
    for (let j = Math.ceil((Math.min(ay, by, cy) - y0) / d); j <= Math.floor((Math.max(ay, by, cy) - y0) / d); j++) {
      for (let i = Math.ceil((Math.min(ax, bx, cx) - x0) / d); i <= Math.floor((Math.max(ax, bx, cx) - x0) / d); i++) {
        const x = x0 + i * d;
        const y = y0 + j * d;
        const l0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det;
        const l1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
        const l2 = 1 - l0 - l1;
        if (l0 < -1e-9 || l1 < -1e-9 || l2 < -1e-9) continue;
        Z[j * nx + i] = Math.max(Z[j * nx + i]!, l0 * za + l1 * zb + l2 * zc);
      }
    }
  }
  const leer = new Float64Array(0);
  return { x0, y0, d, nx, ny, frontX: leer, frontZ: leer, topY: leer, topZ: leer, Z };
}

/** Schneidet die Strecke p→q die Polylinie Q? */
export function kreuztLinie(Q: readonly V2[], px: number, py: number, qx: number, qy: number): boolean {
  const rx = qx - px;
  const ry = qy - py;
  for (let k = 0; k + 1 < Q.length; k++) {
    const a = Q[k]!;
    const b = Q[k + 1]!;
    const sx = b.x - a.x;
    const sy = b.y - a.y;
    const nenner = rx * sy - ry * sx;
    if (Math.abs(nenner) < 1e-12) continue;
    const ax = a.x - px;
    const ay = a.y - py;
    const t = (ax * sy - ay * sx) / nenner;
    const w = (ax * ry - ay * rx) / nenner;
    if (t >= 0 && t <= 1 && w >= 0 && w <= 1) return true;
  }
  return false;
}

/**
 * Abstand von der Unterlippe längs der Form, in der Seite: Wege laufen innen (Tiefe > 0) und nie über die Maullinie, also um
 * Lücken der Seite und um den Mundwinkel herum (Dijkstra auf dem Raster der Kontur). `nahe` gibt je Punkt den Abstand zur
 * Linie und ob er unter ihr liegt.
 */
export function unterlippenAbstand(
  k: Kontur,
  Q: readonly V2[],
  nahe: (x: number, y: number) => { d: number; unten: boolean },
  roh = false,
): (x: number, y: number) => number {
  const { nx, ny, d } = k;
  // Rahmen um die Linie: nur darin kann ein Punkt ihr näher als zwei Rasterweiten sein
  let bx0 = Infinity;
  let by0 = Infinity;
  let bx1 = -Infinity;
  let by1 = -Infinity;
  for (const q of Q) {
    bx0 = Math.min(bx0, q.x - 2 * d);
    by0 = Math.min(by0, q.y - 2 * d);
    bx1 = Math.max(bx1, q.x + 2 * d);
    by1 = Math.max(by1, q.y + 2 * d);
  }
  const dist = new Float64Array(nx * ny).fill(Infinity);
  const linieNah = new Uint8Array(nx * ny);
  const innen = (v: number) => k.Z[v]! > 0;
  const h = new Haufen();
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v = j * nx + i;
      if (!innen(v)) continue;
      const q = nahe(k.x0 + i * d, k.y0 + j * d);
      if (q.d < 2 * d) linieNah[v] = 1;
      // Start: Rasterpunkte dicht unter der Linie, mit ihrem Abstand zu ihr
      if (q.unten && q.d < 1.5 * d) {
        dist[v] = q.d;
        h.rein(q.d, v);
      }
    }
  }
  // 16 Nachbarn (mit Rösselsprüngen): das Raster misst fast wie gerade Linien (8 Nachbarn verzerren bis 8 %, und die
  // Verzerrung je Richtung wäre über den Hebel bis zum Mundwinkel eine Falte)
  const S5 = Math.sqrt(5);
  const schritte: [number, number, number][] = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
    [2, 1, S5], [2, -1, S5], [-2, 1, S5], [-2, -1, S5], [1, 2, S5], [1, -2, S5], [-1, 2, S5], [-1, -2, S5],
  ];
  for (let e = h.raus(); e; e = h.raus()) {
    const [w, v] = e;
    if (w > dist[v]!) continue;
    const i = v % nx;
    const j = (v - i) / nx;
    for (const [di, dj, f] of schritte) {
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
      const u = b * nx + a;
      if (!innen(u)) continue;
      // ein Rösselsprung nur, wo auch das Feld dazwischen innen liegt
      if (f > 2 && !innen(j * nx + a) && !innen(b * nx + i)) continue;
      const neu = w + f * d;
      if (neu >= dist[u]!) continue;
      // nie über die Linie
      if ((linieNah[v] || linieNah[u]) && kreuztLinie(Q, k.x0 + i * d, k.y0 + j * d, k.x0 + a * d, k.y0 + b * d)) continue;
      dist[u] = neu;
      h.rein(neu, u);
    }
  }
  // Rasterpunkte außen nahe dem Umriss bekommen den Wert ihres nächsten Punkts innen: Die Haut am Umriss liegt zwischen innen
  // und außen, ohne diese Werte spränge das Feld dort (und eine Lücke bekommt von jeder Seite den Wert ihrer eigenen Seite)
  const naechst = new Int32Array(nx * ny).fill(-1);
  for (let v = 0; v < nx * ny; v++) if (innen(v) && Number.isFinite(dist[v]!)) naechst[v] = v;
  const lage = (v: number): [number, number] => [v % nx, Math.floor(v / nx)];
  for (let runde = 0; runde < 4; runde++) {
    for (let v = 0; v < nx * ny; v++) {
      if (innen(v)) continue;
      const [i, j] = lage(v);
      for (const [di, dj] of schritte) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
        const c = naechst[b * nx + a]!;
        if (c < 0) continue;
        const [ci, cj] = lage(c);
        const neu = (ci - i) ** 2 + (cj - j) ** 2;
        const alt = naechst[v]!;
        if (alt < 0) {
          naechst[v] = c;
          continue;
        }
        const [ai, aj] = lage(alt);
        if (neu < (ai - i) ** 2 + (aj - j) ** 2) naechst[v] = c;
      }
    }
  }
  let wert = new Float64Array(nx * ny).fill(Infinity);
  for (let v = 0; v < nx * ny; v++) if (naechst[v]! >= 0) wert[v] = dist[naechst[v]!]!;
  // leicht glätten: Das Raster misst in Stufen; über den Hebel bis zum Mundwinkel würde jede Stufe eine Falte
  for (let runde = 0; runde < 4; runde++) {
    const neu = wert.slice();
    for (let v = 0; v < nx * ny; v++) {
      if (!Number.isFinite(wert[v]!)) continue;
      const [i, j] = lage(v);
      let summe = 2 * wert[v]!;
      let n = 2;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
        const w = wert[b * nx + a]!;
        if (!Number.isFinite(w)) continue;
        summe += w;
        n++;
      }
      neu[v] = summe / n;
    }
    wert = neu;
  }
  return (x: number, y: number) => {
    // roh: nur das Raster (wer selbst an der Linie überblendet)
    if (!roh && x >= bx0 && x <= bx1 && y >= by0 && y <= by1) {
      const q = nahe(x, y);
      // dicht an der Linie: unten der gerade Abstand zu ihr (Rasterpunkte jenseits der Linie zählen nicht)
      if (q.d < 2 * d) return q.unten ? q.d : Infinity;
    }
    const u = (x - k.x0) / d;
    const v = (y - k.y0) / d;
    const i = Math.floor(u);
    const j = Math.floor(v);
    const t = u - i;
    const s = v - j;
    let summe = 0;
    let gew = 0;
    for (const [a, b, g] of [
      [i, j, (1 - t) * (1 - s)],
      [i + 1, j, t * (1 - s)],
      [i, j + 1, (1 - t) * s],
      [i + 1, j + 1, t * s],
    ] as const) {
      if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
      const w = wert[b * nx + a]!;
      if (!Number.isFinite(w) || g <= 0) continue;
      summe += g * w;
      gew += g;
    }
    // weit außen (oder unerreichbar): dreht nicht mit
    return gew > 1e-6 ? summe / gew : Infinity;
  };
}

export function flaechenNormale(p: readonly number[] | Float32Array, a: number, b: number, c: number): [number, number, number] {
  const abx = p[3 * b]! - p[3 * a]!;
  const aby = p[3 * b + 1]! - p[3 * a + 1]!;
  const abz = p[3 * b + 2]! - p[3 * a + 2]!;
  const acx = p[3 * c]! - p[3 * a]!;
  const acy = p[3 * c + 1]! - p[3 * a + 1]!;
  const acz = p[3 * c + 2]! - p[3 * a + 2]!;
  return [aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx];
}
