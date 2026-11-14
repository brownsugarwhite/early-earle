// Form zuerst (08.11.2026), Beweis „Form unabhängig vom Netz“: Gewichte nach der Geometrie (Laplace–Beltrami mit Kotangens) auf
// einer intrinsischen Delaunay-Triangulierung (Fisher, Springborn, Bobenko, Schröder 2006; Sharp, Soliman, Crane 2019). Dieselben
// Punkte, dieselbe Fläche; nur Kanten, deren Gegenwinkel zusammen über 180° liegen, werden rechnerisch geklappt (die neue Kante läuft
// in der aufgefalteten Raute, ihre Länge aus dem Kosinussatz). Danach ist jedes Gewicht ½ (cot α + cot β) ≥ 0, auch auf gestreckten
// Dreiecken, wie sie beim Ziehen entstehen. Mit geklemmten negativen Gewichten schaukelte sich der Löser am gestreckten Nacken auf.
// Das Netz selbst bleibt unverändert (die Anzeige, die Loops, der Löser der Lagen). Kanten, die `fest` sind (harte Linien), werden nie
// geklappt: Über sie läuft dann keine Kante hinweg.

import type { Haut } from './kurven';

/** Gewichte je Punkt (CSR): Nachbarn, Gewicht ½ (cot α + cot β) ≥ 0, Länge² der intrinsischen Kante; parallele Kanten getrennt */
export type IntrinsischeGewichte = {
  start: Int32Array;
  nb: Int32Array;
  w: Float64Array;
  l2: Float64Array;
  /** geklappte Kanten */
  flips: number;
};

/** Verbindungen des Netzes (Zwilling je Halbkante), gemerkt je Dreiecksliste */
const zwillinge = new WeakMap<Uint32Array, Int32Array>();
function zwillingeVon(h: Haut): Int32Array {
  const g = zwillinge.get(h.tri);
  if (g) return g;
  const T = h.tri;
  const m = T.length;
  const n = h.n;
  // Halbkanten nach (von, zu) sortiert: der Zwilling von a→b ist b→a
  const schl = new Float64Array(m);
  const idx = new Int32Array(m);
  for (let x = 0; x < m; x++) {
    const a = T[x]!;
    const b = T[x - (x % 3) + ((x % 3) + 1) % 3]!;
    schl[x] = Math.min(a, b) * n + Math.max(a, b);
    idx[x] = x;
  }
  idx.sort((p, q) => schl[p]! - schl[q]!);
  const z = new Int32Array(m).fill(-1);
  for (let k = 0; k + 1 < m; k++) {
    const p = idx[k]!;
    const q = idx[k + 1]!;
    if (schl[p] === schl[q] && z[p] === -1 && z[q] === -1) {
      z[p] = q;
      z[q] = p;
      k++;
    }
  }
  zwillinge.set(h.tri, z);
  return z;
}

/**
 * Intrinsische Delaunay-Triangulierung der Haut (Kanten klappen, bis jede Kante Delaunay ist) und die Kotangens-Gewichte darauf.
 * `fest(a, b)`: diese Kante nie klappen.
 */
export function intrinsischeGewichte(h: Haut, fest: ((a: number, b: number) => boolean) | null = null): IntrinsischeGewichte {
  const T = h.tri;
  const P = h.pos;
  const m = T.length;
  const n = h.n;
  const V = Int32Array.from(T);
  const zwilling = Int32Array.from(zwillingeVon(h));
  /** Länge² je Halbkante */
  const Q = new Float64Array(m);
  const fix = new Uint8Array(m);
  for (let x = 0; x < m; x++) {
    const a = V[x]!;
    const b = V[x - (x % 3) + ((x % 3) + 1) % 3]!;
    const dx = P[3 * a]! - P[3 * b]!;
    const dy = P[3 * a + 1]! - P[3 * b + 1]!;
    const dz = P[3 * a + 2]! - P[3 * b + 2]!;
    Q[x] = dx * dx + dy * dy + dz * dz;
    if (fest && fest(a, b)) fix[x] = 1;
  }
  if (fest) for (let x = 0; x < m; x++) if (zwilling[x]! >= 0 && fix[zwilling[x]!]) fix[x] = 1;
  /** Kotangens gegenüber der Halbkante x in ihrem Dreieck (aus den Längen²) */
  const cotX = (x: number): number => {
    const t = x - (x % 3);
    const e = x % 3;
    const C = Q[x]!;
    const A = Q[t + ((e + 1) % 3)]!;
    const B = Q[t + ((e + 2) % 3)]!;
    const s = A + B - C;
    const f = 4 * A * B - s * s;
    return s / Math.sqrt(f > 1e-24 ? f : 1e-24);
  };
  // der Kotangens je Halbkante einmal gerechnet (13.11.; dieselben Werte wie bei jedem einzelnen Aufruf, nach einem Klappen für
  // die sechs Halbkanten der beiden Dreiecke neu): Vorher wurde er je Halbkante dreimal gerechnet, mit je einer Wurzel
  const cot = new Float64Array(m);
  for (let x = 0; x < m; x++) cot[x] = cotX(x);
  const stapel = new Int32Array(m);
  let oben = 0;
  const drin = new Uint8Array(m);
  for (let x = 0; x < m; x++) {
    const g = zwilling[x]!;
    if (g < 0 || g < x) continue;
    stapel[oben++] = x;
    drin[x] = 1;
  }
  let flips = 0;
  const schranke = 20 * m;
  while (oben > 0 && flips < schranke) {
    const x = stapel[--oben]!;
    drin[x] = 0;
    const g = zwilling[x]!;
    if (g < 0 || fix[x]) continue;
    if (cot[x]! + cot[g]! >= -1e-12) continue;
    // Raute: x = a→b im Dreieck (a, b, c), g = b→a im Dreieck (b, a, d)
    const t0 = x - (x % 3);
    const t1 = g - (g % 3);
    const x1 = t0 + ((x % 3) + 1) % 3;
    const x2 = t0 + ((x % 3) + 2) % 3;
    const g1 = t1 + ((g % 3) + 1) % 3;
    const g2 = t1 + ((g % 3) + 2) % 3;
    const a = V[x]!;
    const b = V[x1]!;
    const c = V[x2]!;
    const d = V[g2]!;
    if (c === d) continue;
    const qab = Q[x]!;
    const qbc = Q[x1]!;
    const qca = Q[x2]!;
    const qad = Q[g1]!;
    const qdb = Q[g2]!;
    // aufgefaltet: a = (0, 0), b = (lab, 0), c oberhalb, d unterhalb
    const lab = Math.sqrt(qab);
    const cx = (qab + qca - qbc) / (2 * lab);
    const cy = Math.sqrt(Math.max(0, qca - cx * cx));
    const dx = (qab + qad - qdb) / (2 * lab);
    const dy = -Math.sqrt(Math.max(0, qad - dx * dx));
    const qcd = (cx - dx) * (cx - dx) + (cy - dy) * (cy - dy);
    if (!(qcd > 1e-24)) continue;
    const zg2 = zwilling[g2]!;
    const zx1 = zwilling[x1]!;
    const zg1 = zwilling[g1]!;
    const zx2 = zwilling[x2]!;
    const fg2 = fix[g2]!;
    const fx1 = fix[x1]!;
    const fg1 = fix[g1]!;
    const fx2 = fix[x2]!;
    // neu: Dreieck von x = (d, b, c), Dreieck von g = (a, d, c)
    const setze = (slot: number, von: number, q: number, z: number, f: number) => {
      V[slot] = von;
      Q[slot] = q;
      zwilling[slot] = z;
      fix[slot] = f;
      if (z >= 0) zwilling[z] = slot;
    };
    setze(t0, d, qdb, zg2, fg2);
    setze(t0 + 1, b, qbc, zx1, fx1);
    setze(t0 + 2, c, qcd, t1 + 1, 0);
    setze(t1, a, qad, zg1, fg1);
    setze(t1 + 1, d, qcd, t0 + 2, 0);
    setze(t1 + 2, c, qca, zx2, fx2);
    for (let e = 0; e < 3; e++) {
      cot[t0 + e] = cotX(t0 + e);
      cot[t1 + e] = cotX(t1 + e);
    }
    flips++;
    for (const s of [t0, t0 + 1, t1, t1 + 2]) {
      const z = zwilling[s]!;
      const k = z >= 0 && z < s ? z : s;
      if (!drin[k]) {
        drin[k] = 1;
        stapel[oben++] = k;
      }
    }
  }
  // Gewichte je Halbkante a→b (Eintrag bei a): ½ cot gegenüber aus beiden Dreiecken
  const start = new Int32Array(n + 1);
  for (let x = 0; x < m; x++) start[V[x]! + 1]!++;
  for (let v = 0; v < n; v++) start[v + 1] = start[v + 1]! + start[v]!;
  const nb = new Int32Array(m);
  const w = new Float64Array(m);
  const l2 = new Float64Array(m);
  const fuell = start.slice(0, n);
  for (let x = 0; x < m; x++) {
    const a = V[x]!;
    const g = zwilling[x]!;
    const gewicht = 0.5 * (cot[x]! + (g >= 0 ? cot[g]! : 0));
    const k = fuell[a]!++;
    nb[k] = V[x - (x % 3) + ((x % 3) + 1) % 3]!;
    w[k] = gewicht > 0 ? gewicht : 0;
    l2[k] = Q[x]!;
  }
  return { start, nb, w, l2, flips };
}
