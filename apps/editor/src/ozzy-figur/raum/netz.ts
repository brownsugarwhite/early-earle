// Ozzy im Raum (Beweis 3D): Netz der Figur aus ihrem Abstandsfeld (Surface Nets, grob nach fein), Ecken auf die Fläche gezogen.
// Je Ecke außerdem der Versatz, den sie beim Blick von der Seite als fernes Teil bekommt (Florians ferne Beine und Ohr schauen vor).
import { type Figur3D, figurAbstand } from './koerper';

export interface Netz {
  /** Ecken (X, Y, Z), Körperkoordinaten */
  lagen: Float32Array;
  dreiecke: Uint32Array;
  /** Paar (0 keins, 1 Vorderbeine, 2 Hinterbeine, 3 Ohren), Gewicht der Zugehörigkeit, Seite (−1 rechts, 1 links) je Ecke */
  paar: Float32Array;
  paarW: Float32Array;
  seite: Float32Array;
  /** nächstes Teil je Ecke */
  teil: Uint8Array;
  /** Richtung der Fläche je Ecke (Einheitsvektor, Körperkoordinaten) */
  normalen: Float32Array;
}

export function netzBauen(f: Figur3D, h = 2): Netz {
  const q = f.quader;
  const R = 2 * h;
  const ox = Math.floor((q[0] - R) / h) * h;
  const oy = Math.floor((q[1] - R) / h) * h;
  const oz = Math.floor((q[2] - R) / h) * h;
  const C = 4;
  const nx = Math.ceil((q[3] + R - ox) / h / C) * C + 1;
  const ny = Math.ceil((q[4] + R - oy) / h / C) * C + 1;
  const nz = Math.ceil((q[5] + R - oz) / h / C) * C + 1;
  const id = (i: number, j: number, k: number): number => (k * ny + j) * nx + i;
  const wert = (i: number, j: number, k: number): number => figurAbstand(f, ox + i * h, oy + j * h, oz + k * h);
  // grob: jede C-te Ecke
  const cx = (nx - 1) / C + 1;
  const cy = (ny - 1) / C + 1;
  const cz = (nz - 1) / C + 1;
  const grob = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) grob[(k * cy + j) * cx + i] = wert(i * C, j * C, k * C);
  // fein: Vorzeichen aus der nächsten groben Ecke, nahe der Fläche genau
  const fein = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) fein[id(i, j, k)] = grob[(Math.round(k / C) * cy + Math.round(j / C)) * cx + Math.round(i / C)]! > 0 ? 1e3 : -1e3;
  const nah = C * h * Math.sqrt(3);
  for (let k = 0; k + 1 < cz; k++)
    for (let j = 0; j + 1 < cy; j++)
      for (let i = 0; i + 1 < cx; i++) {
        let lo = Infinity;
        for (let c = 0; c < 8; c++) lo = Math.min(lo, Math.abs(grob[((k + (c >> 2)) * cy + j + ((c >> 1) & 1)) * cx + i + (c & 1)]!));
        if (lo > nah) continue;
        for (let kk = 0; kk <= C; kk++) for (let jj = 0; jj <= C; jj++) for (let ii = 0; ii <= C; ii++) {
          const a = i * C + ii;
          const b = j * C + jj;
          const c = k * C + kk;
          const n = id(a, b, c);
          if (Math.abs(fein[n]!) === 1e3) fein[n] = wert(a, b, c);
        }
      }
  // Surface Nets: eine Ecke je Zelle mit Vorzeichenwechsel
  const ecke = new Map<number, number>();
  const lagen: number[] = [];
  const KANTEN: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float64Array(8);
  for (let k = 0; k + 1 < nz; k++)
    for (let j = 0; j + 1 < ny; j++)
      for (let i = 0; i + 1 < nx; i++) {
        let innen = 0;
        for (let c = 0; c < 8; c++) {
          v[c] = fein[id(i + (c & 1), j + ((c >> 1) & 1), k + (c >> 2))]!;
          if (v[c]! < 0) innen++;
        }
        if (innen === 0 || innen === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [a, b] of KANTEN) {
          if (v[a]! < 0 === v[b]! < 0) continue;
          const t = v[a]! / (v[a]! - v[b]!);
          sx += (a & 1) + ((b & 1) - (a & 1)) * t;
          sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
          sz += (a >> 2) + ((b >> 2) - (a >> 2)) * t;
          n++;
        }
        ecke.set(id(i, j, k), lagen.length / 3);
        lagen.push(ox + (i + sx / n) * h, oy + (j + sy / n) * h, oz + (k + sz / n) * h);
      }
  // Vierecke je Gitterkante mit Vorzeichenwechsel (die vier Zellen um die Kante)
  const dreiecke: number[] = [];
  const quad = (a: number | undefined, b: number | undefined, c: number | undefined, d: number | undefined, umdrehen: boolean): void => {
    if (a === undefined || b === undefined || c === undefined || d === undefined) return;
    if (umdrehen) dreiecke.push(a, c, b, a, d, c);
    else dreiecke.push(a, b, c, a, c, d);
  };
  for (let k = 1; k + 1 < nz; k++)
    for (let j = 1; j + 1 < ny; j++)
      for (let i = 1; i + 1 < nx; i++) {
        const p = fein[id(i, j, k)]! < 0;
        if (p !== fein[id(i + 1, j, k)]! < 0) quad(ecke.get(id(i, j - 1, k - 1)), ecke.get(id(i, j, k - 1)), ecke.get(id(i, j, k)), ecke.get(id(i, j - 1, k)), !p);
        if (p !== fein[id(i, j + 1, k)]! < 0) quad(ecke.get(id(i - 1, j, k - 1)), ecke.get(id(i - 1, j, k)), ecke.get(id(i, j, k)), ecke.get(id(i, j, k - 1)), !p);
        if (p !== fein[id(i, j, k + 1)]! < 0) quad(ecke.get(id(i - 1, j - 1, k)), ecke.get(id(i, j - 1, k)), ecke.get(id(i, j, k)), ecke.get(id(i - 1, j, k)), !p);
      }
  // Ecken auf die Fläche ziehen (Newton längs des Gefälles), Teil und Versatz der fernen Seite je Ecke
  const nE = lagen.length / 3;
  const L = new Float32Array(lagen);
  const paar = new Float32Array(nE);
  const paarW = new Float32Array(nE);
  const seite = new Float32Array(nE);
  const teil = new Uint8Array(nE);
  const normalen = new Float32Array(nE * 3);
  const je = new Float32Array(f.teile.length);
  const e = 0.25;
  for (let n = 0; n < nE; n++) {
    let x = L[3 * n]!;
    let y = L[3 * n + 1]!;
    let z = L[3 * n + 2]!;
    for (let s = 0; s < 3; s++) {
      const d = figurAbstand(f, x, y, z);
      const gx = (figurAbstand(f, x + e, y, z) - figurAbstand(f, x - e, y, z)) / (2 * e);
      const gy = (figurAbstand(f, x, y + e, z) - figurAbstand(f, x, y - e, z)) / (2 * e);
      const gz = (figurAbstand(f, x, y, z + e) - figurAbstand(f, x, y, z - e)) / (2 * e);
      const g2 = gx * gx + gy * gy + gz * gz;
      if (g2 < 1e-6) break;
      const sch = Math.max(-h, Math.min(h, d / g2));
      x -= gx * sch;
      y -= gy * sch;
      z -= gz * sch;
    }
    L[3 * n] = x;
    L[3 * n + 1] = y;
    L[3 * n + 2] = z;
    {
      const gx = figurAbstand(f, x + e, y, z) - figurAbstand(f, x - e, y, z);
      const gy = figurAbstand(f, x, y + e, z) - figurAbstand(f, x, y - e, z);
      const gz = figurAbstand(f, x, y, z + e) - figurAbstand(f, x, y, z - e);
      const gl = Math.hypot(gx, gy, gz) || 1;
      normalen[3 * n] = gx / gl;
      normalen[3 * n + 1] = gy / gl;
      normalen[3 * n + 2] = gz / gl;
    }
    const aus = { teil: -1, je };
    const d0 = figurAbstand(f, x, y, z, aus);
    teil[n] = Math.max(0, aus.teil);
    // Zugehörigkeit zum nächsten Paarteil: weich nach dem Abstand (an der Hüfte geht das Bein in den Körper über)
    let bw = 0;
    for (let i = 0; i < f.teile.length; i++) {
      const t = f.teile[i]!;
      if (!t.paar) continue;
      const w = Math.max(0, 1 - Math.max(0, je[i]! - d0) / 8);
      if (w > bw) {
        bw = w;
        paar[n] = t.paar;
        seite[n] = t.seiteVon;
      }
    }
    // gegen alle Teile in der Nähe gewichtet (wo die Bohne näher ist, folgt die Ecke ihr)
    let summe = 0;
    for (let i = 0; i < f.teile.length; i++) summe += Math.max(0, 1 - Math.max(0, je[i]! - d0) / 8);
    paarW[n] = summe > 0 ? bw / summe : 0;
  }
  return { lagen: L, dreiecke: new Uint32Array(dreiecke), paar, paarW, seite, teil, normalen };
}
