// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S2: dünn besetzte Normalgleichungen für den Käfig-Ausgleich.
// Statt der dichten n×n-LU (402 Punkte: 3–6 ms; Teile-Käfige mit 1600–3000 Punkten bräuchten Sekunden) wird Σ g·aᵀa aus
// dünnen Zeilen in der Hülle einer Cuthill-McKee-Reihenfolge des Käfiggraphen aufgebaut und mit Cholesky zerlegt. Die
// Zeilen sind Bedingungen an Grenzlagen (Zeilen der Grenzmatrix) und Glättungszeilen (Laplace einer feineren Stufe,
// ausgedrückt in Käfigpunkten). Einmal je Topologie zerlegen, je Zug nur Vorwärts- und Rückwärtseinsetzen. DOM-frei.

import type { Kaefig } from '../kaefig/halbkanten';
import type { DuennMatrix } from '../subdivision/matrix';
import { cuthillMcKee } from './glattLoeser';

export type NormalZeile = { index: ArrayLike<number>; wert: ArrayLike<number>; gewicht: number };

export type NormalSystem = {
  n: number;
  /** Käfiglagen für rechte Seiten (3 Werte je Punkt, verschachtelt) */
  loesen(rhs: Float64Array): Float64Array;
  /** Einträge der Hülle (Größe der Zerlegung) */
  huelle: number;
  zeitAufbau: number;
  zeitZerlegen: number;
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Nachbarlisten der Käfigpunkte über ihre Kanten. */
export function kaefigNachbarlisten(k: Kaefig, n = k.n): number[][] {
  const out: number[][] = Array.from({ length: n }, () => []);
  for (let e = 0; e < k.nE; e++) {
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    if (a < n && b < n) {
      out[a]!.push(b);
      out[b]!.push(a);
    }
  }
  return out;
}

/**
 * Σ g·aᵀa (+ ε auf der Diagonale) für n Unbekannte aus dünnen Zeilen; `nachbarn` (Kopplungsgraph, z. B. Käfigkanten)
 * bestimmt die Reihenfolge, die Hülle folgt aus den Zeilen selbst.
 */
export function normalSystem(n: number, zeilen: readonly NormalZeile[], nachbarn: readonly (readonly number[])[], daempfung = 0): NormalSystem {
  const t0 = jetzt();
  const reihenfolge = cuthillMcKee(nachbarn.map((nb) => nb.filter((j) => j < n)));
  const pos = new Int32Array(n);
  reihenfolge.forEach((k, p) => (pos[k] = p));
  // Hülle: erste Spalte je Zeile (untere Hälfte), aus jeder Bedingung
  const erste = new Int32Array(n);
  for (let p = 0; p < n; p++) erste[p] = p;
  for (const z of zeilen) {
    let lo = Infinity;
    for (let t = 0; t < z.index.length; t++) lo = Math.min(lo, pos[z.index[t]!]!);
    for (let t = 0; t < z.index.length; t++) {
      const p = pos[z.index[t]!]!;
      if (lo < erste[p]!) erste[p] = lo;
    }
  }
  const start = new Int32Array(n + 1);
  for (let p = 0; p < n; p++) start[p + 1] = start[p]! + (p - erste[p]! + 1);
  const H = new Float64Array(start[n]!);
  const at = (i: number, j: number) => start[i]! + (j - erste[i]!);
  const ps: number[] = [];
  const ws: number[] = [];
  for (const z of zeilen) {
    ps.length = 0;
    ws.length = 0;
    for (let t = 0; t < z.index.length; t++) {
      ps.push(pos[z.index[t]!]!);
      ws.push(z.wert[t]!);
    }
    const g = z.gewicht;
    for (let a = 0; a < ps.length; a++) {
      const pa = ps[a]!;
      const ga = g * ws[a]!;
      for (let b = 0; b < ps.length; b++) {
        const pb = ps[b]!;
        if (pb <= pa) H[at(pa, pb)]! += ga * ws[b]!;
      }
    }
  }
  if (daempfung > 0) for (let i = 0; i < n; i++) H[at(i, i)]! += daempfung;
  const t1 = jetzt();
  // Cholesky in der Hülle (Zeile für Zeile)
  for (let i = 0; i < n; i++) {
    const fi = erste[i]!;
    const oi = start[i]! - fi;
    for (let j = fi; j <= i; j++) {
      let s = H[oi + j]!;
      const von = Math.max(fi, erste[j]!);
      const oj = start[j]! - erste[j]!;
      for (let k = von; k < j; k++) s -= H[oi + k]! * H[oj + k]!;
      if (j < i) H[oi + j] = s / H[oj + j]!;
      else {
        if (!(s > 0)) throw new Error(`Normalsystem: nicht positiv definit in Zeile ${i} (${s})`);
        H[oi + i] = Math.sqrt(s);
      }
    }
  }
  const t2 = jetzt();
  const b = new Float64Array(n);
  const loesen = (rhs: Float64Array): Float64Array => {
    const x = new Float64Array(3 * n);
    for (let a = 0; a < 3; a++) {
      for (let p = 0; p < n; p++) b[p] = rhs[3 * reihenfolge[p]! + a]!;
      // L·y = b
      for (let i = 0; i < n; i++) {
        const fi = erste[i]!;
        const oi = start[i]! - fi;
        let s = b[i]!;
        for (let k = fi; k < i; k++) s -= H[oi + k]! * b[k]!;
        b[i] = s / H[oi + i]!;
      }
      // Lᵀ·x = y (spaltenweise)
      for (let i = n - 1; i >= 0; i--) {
        const fi = erste[i]!;
        const oi = start[i]! - fi;
        b[i] = b[i]! / H[oi + i]!;
        const xi = b[i]!;
        for (let k = fi; k < i; k++) b[k] = b[k]! - H[oi + k]! * xi;
      }
      for (let p = 0; p < n; p++) x[3 * reihenfolge[p]! + a] = b[p]!;
    }
    return x;
  };
  return { n, loesen, huelle: start[n]!, zeitAufbau: t1 - t0, zeitZerlegen: t2 - t1 };
}

/**
 * Glättungszeilen (Plan S2: „dünne Platte“ auf einer feineren Stufe): je Punkt p der Stufe s (Lagen = M · Käfig) die
 * Zeile Δp = Mittel der Nachbarn − p, in Käfigpunkten ausgedrückt. An Falten nur längs der Falte (genau zwei scharfe
 * Kanten), an Ecken und Kreuzungen scharfer Kanten keine Zeile — gewollte Kanten bleiben scharf. `gewicht` je Zeile;
 * `kappe`: Zeilen, die Käfigpunkte ab `ab` berühren (innere Kappenpunkte der Röhre), bekommen das `faktor`-fache Gewicht.
 */
export function glaettungsZeilen(stufe: Kaefig, M: DuennMatrix, n: number, gewicht: number, kappe?: { ab: number; faktor: number }): NormalZeile[] {
  const out: NormalZeile[] = [];
  const akku = new Float64Array(n);
  const markiert = new Int32Array(n).fill(-1);
  const aktiv: number[] = [];
  const add = (zeile: number, g: number, lauf: number) => {
    for (let k = M.start[zeile]!; k < M.start[zeile + 1]!; k++) {
      const j = M.index[k]!;
      if (j >= n) continue;
      if (markiert[j] !== lauf) {
        markiert[j] = lauf;
        akku[j] = 0;
        aktiv.push(j);
      }
      akku[j]! += g * M.wert[k]!;
    }
  };
  for (let v = 0; v < stufe.n; v++) {
    if (stufe.vSchaerfe[v]! > 0) continue;
    const alle: number[] = [];
    const scharf: number[] = [];
    for (let q = stufe.vKStart[v]!; q < stufe.vKStart[v + 1]!; q++) {
      const e = stufe.vKanten[q]!;
      const o = stufe.eA[e] === v ? stufe.eB[e]! : stufe.eA[e]!;
      alle.push(o);
      if (stufe.eSchaerfe[e]! > 0) scharf.push(o);
    }
    if (scharf.length > 2 || scharf.length === 1) continue;
    const nb = scharf.length === 2 ? scharf : alle;
    if (nb.length < 2) continue;
    aktiv.length = 0;
    add(v, -1, v);
    for (const o of nb) add(o, 1 / nb.length, v);
    const index: number[] = [];
    const wert: number[] = [];
    for (const j of aktiv) {
      const w = akku[j]!;
      if (Math.abs(w) > 1e-15) {
        index.push(j);
        wert.push(w);
      }
    }
    if (!index.length) continue;
    out.push({ index, wert, gewicht: kappe && index.some((j) => j >= kappe.ab) ? gewicht * kappe.faktor : gewicht });
  }
  return out;
}
