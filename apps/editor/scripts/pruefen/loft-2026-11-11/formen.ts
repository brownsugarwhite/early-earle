// Loft-Messung (11.11.2026): gesicherte Form laden, Kurven der Loops, Bereiche der Haut.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Haut } from '../../../../../packages/shape/src/dicht/kurven';
import { type Loop, hatPfad, pfadLagen } from '../../../../../packages/shape/src/dicht/loops';
import { type WesenStand, entpacken } from '../../../src/form/ablage';

export const WESEN_ORDNER = fileURLToPath(new URL('../../../../../wesen/', import.meta.url));
export const AUSGABE = fileURLToPath(new URL('../../../pruefen-ausgabe/loft/', import.meta.url));

export type Form = { name: string; st: WesenStand; haut: Haut; loops: Loop[]; kurven: Map<number, Float64Array> };

export function laden(name: string): Form {
  const st = entpacken(new Uint8Array(fs.readFileSync(path.join(WESEN_ORDNER, `${name}.eewesen`))));
  const g = st.grund ?? { haut: st.haut, loops: st.loops };
  const f = g.haut;
  const nachbarn: number[][] = new Array<number[]>(f.n);
  for (let v = 0; v < f.n; v++) nachbarn[v] = Array.from(f.nb.subarray(f.nbStart[v]!, f.nbStart[v + 1]!));
  const haut: Haut = { pos: f.pos, tri: f.tri, n: f.n, nachbarn, spiegel: f.spiegel };
  const kurven = new Map<number, Float64Array>();
  for (const l of g.loops) kurven.set(l.id, Float64Array.from((hatPfad(l) ? pfadLagen(l) : null) ?? l.ruhe));
  fs.mkdirSync(AUSGABE, { recursive: true });
  return { name, st, haut, loops: g.loops, kurven };
}

/** Ausgleichsebene einer Kurve: Mitte und Normale */
export function ebene(L: ArrayLike<number>): { c: [number, number, number]; n: [number, number, number] } {
  const m = L.length / 3;
  const c: [number, number, number] = [0, 0, 0];
  for (let j = 0; j < m; j++) for (let k = 0; k < 3; k++) c[k] += L[3 * j + k]! / m;
  // Normale: Summe der Kreuzprodukte aufeinanderfolgender Speichen (Newell), für den halben Ring samt Spiegelbild in der Mittelebene
  // liegt sie in der Mittelebene
  const n: [number, number, number] = [0, 0, 0];
  for (let j = 0; j + 1 < m; j++) {
    const ax = L[3 * j]! - c[0];
    const ay = L[3 * j + 1]! - c[1];
    const az = L[3 * j + 2]!;
    const bx = L[3 * j + 3]! - c[0];
    const by = L[3 * j + 4]! - c[1];
    const bz = L[3 * j + 5]!;
    n[0] += ay * bz - az * by;
    n[1] += az * bx - ax * bz;
  }
  const l = Math.hypot(n[0], n[1]) || 1;
  return { c: [c[0], c[1], 0], n: [n[0] / l, n[1] / l, 0] };
}

/** Punkte der Haut, die vom Startpunkt aus erreichbar sind, ohne eine der Ebenen zu überschreiten (jede: Mitte, Normale, erlaubt ist die Seite der Normalen) */
export function bereich(h: Haut, start: [number, number, number], ebenen: { c: [number, number, number]; n: [number, number, number] }[]): Uint8Array {
  const P = h.pos;
  const erlaubt = (v: number): boolean => ebenen.every((e) => (P[3 * v]! - e.c[0]) * e.n[0] + (P[3 * v + 1]! - e.c[1]) * e.n[1] + (P[3 * v + 2]! - e.c[2]) * e.n[2] >= 0);
  let s = -1;
  let best = Infinity;
  for (let v = 0; v < h.n; v++) {
    if (!erlaubt(v)) continue;
    const d = Math.hypot(P[3 * v]! - start[0], P[3 * v + 1]! - start[1], P[3 * v + 2]! - start[2]);
    if (d < best) {
      best = d;
      s = v;
    }
  }
  const in_ = new Uint8Array(h.n);
  if (s < 0) return in_;
  const stapel = [s];
  in_[s] = 1;
  while (stapel.length) {
    const v = stapel.pop()!;
    for (const w of h.nachbarn[v]!) if (!in_[w] && erlaubt(w)) {
      in_[w] = 1;
      stapel.push(w);
    }
  }
  return in_;
}

export function flaecheVon(h: Haut, in_?: Uint8Array): number {
  const P = h.pos;
  let A = 0;
  for (let k = 0; k < h.tri.length; k += 3) {
    const a = h.tri[k]!;
    const b = h.tri[k + 1]!;
    const c = h.tri[k + 2]!;
    if (in_ && !(in_[a] && in_[b] && in_[c])) continue;
    const ux = P[3 * b]! - P[3 * a]!;
    const uy = P[3 * b + 1]! - P[3 * a + 1]!;
    const uz = P[3 * b + 2]! - P[3 * a + 2]!;
    const vx = P[3 * c]! - P[3 * a]!;
    const vy = P[3 * c + 1]! - P[3 * a + 1]!;
    const vz = P[3 * c + 2]! - P[3 * a + 2]!;
    A += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
  }
  return A;
}

export const quantil = (a: ArrayLike<number>, q: number): number => {
  const s = Array.from(a).filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))]! : NaN;
};
