// Ozzy im Raum (Beweis 3D, Plan docs/plans/2026-11-19-ozzy-figur-3d.md): ebene Gitter aus Florians Formen. Füllen (Maske) und
// Abstandsfeld mit Vorzeichen (innen negativ), ohne DOM.
import { abflachen, type Form } from '../form';

/** Gitter in der Ebene: Zelle (i, j) hat ihre Mitte bei (x0 + (i + ½)·s, y0 + (j + ½)·s) */
export interface Gitter {
  x0: number;
  y0: number;
  s: number;
  b: number;
  h: number;
}

export function gitterUm(kasten: [number, number, number, number], s: number, rand: number): Gitter {
  const x0 = Math.floor((kasten[0] - rand) / s) * s;
  const y0 = Math.floor((kasten[1] - rand) / s) * s;
  return { x0, y0, s, b: Math.ceil((kasten[2] + rand - x0) / s), h: Math.ceil((kasten[3] + rand - y0) / s) };
}

/** Form als geschlossener Linienzug [x0, y0, x1, y1, …] */
export function linienzug(f: Form, fein = 4): number[] {
  return abflachen(f, (q) => q, fein);
}

/** Zellen, deren Mitte in einem der Linienzüge liegt (je Linienzug Umlaufzahl ungleich 0, dann vereinigt: Teile mit
 * verschiedenem Umlaufsinn heben sich nicht auf) */
export function fuellen(zuege: number[][], g: Gitter): Uint8Array {
  const m = new Uint8Array(g.b * g.h);
  const kreuz: { x: number; w: number }[] = [];
  for (const z of zuege) {
    const n = z.length / 2;
    let ymin = Infinity;
    let ymax = -Infinity;
    for (let k = 0; k < n; k++) {
      ymin = Math.min(ymin, z[2 * k + 1]!);
      ymax = Math.max(ymax, z[2 * k + 1]!);
    }
    const j0 = Math.max(0, Math.floor((ymin - g.y0) / g.s - 0.5));
    const j1 = Math.min(g.h - 1, Math.ceil((ymax - g.y0) / g.s - 0.5));
    for (let j = j0; j <= j1; j++) {
      const y = g.y0 + (j + 0.5) * g.s;
      kreuz.length = 0;
      for (let k = 0; k < n; k++) {
        const ax = z[2 * k]!;
        const ay = z[2 * k + 1]!;
        const bx = z[(2 * k + 2) % z.length]!;
        const by = z[(2 * k + 3) % z.length]!;
        if (ay <= y === by <= y) continue;
        kreuz.push({ x: ax + ((y - ay) / (by - ay)) * (bx - ax), w: by > ay ? 1 : -1 });
      }
      kreuz.sort((a, b) => a.x - b.x);
      let w = 0;
      for (let k = 0; k + 1 < kreuz.length; k++) {
        w += kreuz[k]!.w;
        if (w === 0) continue;
        const i0 = Math.max(0, Math.ceil((kreuz[k]!.x - g.x0) / g.s - 0.5));
        const i1 = Math.min(g.b - 1, Math.floor((kreuz[k + 1]!.x - g.x0) / g.s - 0.5));
        for (let i = i0; i <= i1; i++) m[j * g.b + i] = 1;
      }
    }
  }
  return m;
}

/** quadrierte euklidische Abstandstransformation in einer Zeile (Felzenszwalb und Huttenlocher) */
function edt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    d[q] = (q - v[k]!) * (q - v[k]!) + f[v[k]!]!;
  }
}

/** quadrierter Abstand jeder Zelle zur nächsten Zelle mit ziel[i] = 1 (in Zellen) */
function edt(ziel: Uint8Array, b: number, h: number): Float64Array {
  const GROSS = 1e20;
  const out = new Float64Array(b * h);
  const n = Math.max(b, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let i = 0; i < b; i++) {
    for (let j = 0; j < h; j++) f[j] = ziel[j * b + i] ? 0 : GROSS;
    edt1(f, h, d, v, z);
    for (let j = 0; j < h; j++) out[j * b + i] = d[j]!;
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < b; i++) f[i] = out[j * b + i]!;
    edt1(f, b, d, v, z);
    for (let i = 0; i < b; i++) out[j * b + i] = d[i]!;
  }
  return out;
}

/** Abstandsfeld mit Vorzeichen (Einheiten der Formen, innen negativ) einer Maske */
export function abstandsfeld(m: Uint8Array, g: Gitter): Float32Array {
  const aussen = edt(m, g.b, g.h);
  const inv = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) inv[i] = m[i] ? 0 : 1;
  const innen = edt(inv, g.b, g.h);
  const out = new Float32Array(m.length);
  for (let i = 0; i < m.length; i++) out[i] = (m[i] ? -(Math.sqrt(innen[i]!) - 0.5) : Math.sqrt(aussen[i]!) - 0.5) * g.s;
  return out;
}

/** Wert eines Felds an (x, y), bilinear; außerhalb des Gitters der Randwert plus Abstand zum Gitter */
export function lesen(feld: Float32Array, g: Gitter, x: number, y: number): number {
  const fx = (x - g.x0) / g.s - 0.5;
  const fy = (y - g.y0) / g.s - 0.5;
  const cx = Math.max(0, Math.min(g.b - 1.001, fx));
  const cy = Math.max(0, Math.min(g.h - 1.001, fy));
  const i = Math.floor(cx);
  const j = Math.floor(cy);
  const tx = cx - i;
  const ty = cy - j;
  const a = feld[j * g.b + i]!;
  const b = feld[j * g.b + i + 1]!;
  const c = feld[(j + 1) * g.b + i]!;
  const d = feld[(j + 1) * g.b + i + 1]!;
  const w = a + (b - a) * tx + (c + (d - c) * tx - (a + (b - a) * tx)) * ty;
  return w + Math.hypot((fx - cx) * g.s, (fy - cy) * g.s);
}
