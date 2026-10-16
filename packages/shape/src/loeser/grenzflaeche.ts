// Wesen-Editor 2, Kern (13.10.2026): Käfig so lösen, dass die Grenzfläche durch Zielpunkte geht.
//
// Jeder Käfigpunkt i hat auf jeder Stufe einen Nachfolger mit demselben Index (Punktpunkt). Seine Grenzlage ist Zeile i
// der Grenzmatrix (Halstead/Kass/DeRose: die Grenzlage hängt linear vom Käfig ab). Dazu dürfen beliebige feine Punkte
// (z. B. die Naht der Stufe 3) Ziele auf einer Kurve bekommen; dann wird gewichtet ausgeglichen (Normalgleichungen).
// Die n×n-Matrix wird einmal je Topologie zerlegt; danach ist jeder Zugschritt ein Rückwärtseinsetzen (Plan 4.4).

import type { Kaefig } from '../kaefig/halbkanten';
import type { DuennMatrix } from '../subdivision/matrix';
import { type LU, luLoesen, luZerlegen } from './lu';
import { type NormalSystem, type NormalZeile, normalSystem } from './normalSystem';

export type GrenzLoeser = { n: number; lu: LU };

/** Zerlegung der Teilmatrix (Zeilen und Spalten 0 … n−1 der Grenzmatrix): Grenzlagen der Käfigpunkte = Ziele. */
export function grenzLoeser(grenze: DuennMatrix, n: number): GrenzLoeser {
  const A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let k = grenze.start[i]!; k < grenze.start[i + 1]!; k++) {
      const j = grenze.index[k]!;
      if (j < n) A[i * n + j] = grenze.wert[k]!;
    }
  }
  return { n, lu: luZerlegen(A, n) };
}

/** Käfiglagen, deren Grenzlagen genau die Ziele (3 Werte je Punkt) treffen. */
export function kaefigDurchZiele(l: GrenzLoeser, ziele: Float64Array): Float64Array {
  return luLoesen(l.lu, ziele, 3);
}

/** Bequem: Käfig mit neuen Lagen aus Zielen. */
export function kaefigAnZiele(k: Kaefig, l: GrenzLoeser, ziele: Float64Array): Kaefig {
  return { ...k, xyz: kaefigDurchZiele(l, ziele) };
}

/** Eine Bedingung: feiner Punkt (Zeile der Grenzmatrix) soll mit Gewicht ein Ziel treffen. */
export type Bedingung = { zeile: number; gewicht: number };

export type AusgleichsLoeser = {
  n: number;
  /** dichte Zerlegung (heutiger Weg) */
  lu?: LU;
  /** dünn besetzte Zerlegung mit Glättungsmaß (S2, Schalter `fair`) */
  duenn?: NormalSystem;
  /** Glättung relativ zur Zielform (S2): Zeilen, Anteil `bezug`, Bedingung des Ziels je Käfigpunkt */
  bezug?: { zeilen: readonly NormalZeile[]; anteil: number; ziel: Int32Array };
  bedingungen: Bedingung[];
  /** Zeilen der Grenzmatrix (nur Spalten < n) je Bedingung */
  zeilen: { index: Uint32Array; wert: Float64Array }[];
};

/** Laplace-Glattheit der Käfiglagen: je Punkt x_i − Mittel der Nachbarn (Faltenpunkte nur längs der Falte, Eckpunkte frei). */
export type Glaettung = { kaefig: Kaefig; gewicht: number };

/**
 * Plan S2 (Schalter `fair`): dünn besetzte Normalgleichungen mit Glättungszeilen (Laplace einer feineren Stufe in
 * Käfigpunkten); dieselben Bedingungen wie der dichte Weg. `nachbarn` = Käfiggraph für die Reihenfolge. `bezug` (0…1):
 * Anteil der Glättung, der nur die Abweichung von der Zielform glättet (Ziel der Zeile = Laplace des Käfigs aus den
 * Zielen der Käfigpunkte statt 0) — die Zielform selbst wird dann nicht runder oder kleiner, nur ihr Wellenschlag
 * verschwindet. Braucht je Käfigpunkt i eine Bedingung mit `zeile: i` (sonst wirkt nur der feste Anteil).
 */
export type Glaettemass = { zeilen: readonly NormalZeile[]; nachbarn: readonly (readonly number[])[]; bezug?: number };

/**
 * Normalgleichungen Σ w·aᵀa über alle Bedingungen, einmal zerlegt. Mit `glaettung` kommt je Käfigpunkt die Bedingung
 * „Punkt = Mittel seiner Nachbarn“ (Ziel 0) hinzu: Sie dämpft den Wellenschlag reiner Interpolation, vor allem neben
 * scharfen Falten (einseitige Stützen), und wirkt wie Halstead/Kass/DeRoses Fairness-Term.
 */
export function ausgleichsLoeser(grenze: DuennMatrix, n: number, bedingungen: readonly Bedingung[], glaettung?: Glaettung, glaettemass?: Glaettemass): AusgleichsLoeser {
  if (glaettemass) return duennerAusgleich(grenze, n, bedingungen, glaettemass);
  const N = new Float64Array(n * n);
  if (glaettung && glaettung.gewicht > 0) {
    const k = glaettung.kaefig;
    for (let i = 0; i < Math.min(n, k.n); i++) {
      if (k.vSchaerfe[i]! > 0) continue;
      const alle: number[] = [];
      const scharf: number[] = [];
      for (let q = k.vKStart[i]!; q < k.vKStart[i + 1]!; q++) {
        const e = k.vKanten[q]!;
        const o = k.eA[e] === i ? k.eB[e]! : k.eA[e]!;
        if (o >= n) continue;
        alle.push(o);
        if (k.eSchaerfe[e]! > 0) scharf.push(o);
      }
      const nb = scharf.length >= 2 ? scharf : alle;
      if (nb.length < 2) continue;
      const idx = [i, ...nb];
      const w = [1, ...nb.map(() => -1 / nb.length)];
      for (let a = 0; a < idx.length; a++) {
        const ra = idx[a]! * n;
        const ga = glaettung.gewicht * w[a]!;
        for (let b = 0; b < idx.length; b++) N[ra + idx[b]!]! += ga * w[b]!;
      }
    }
  }
  const zeilen: { index: Uint32Array; wert: Float64Array }[] = [];
  for (const b of bedingungen) {
    const i = b.zeile;
    const idx: number[] = [];
    const w: number[] = [];
    for (let k = grenze.start[i]!; k < grenze.start[i + 1]!; k++) {
      const j = grenze.index[k]!;
      if (j < n) {
        idx.push(j);
        w.push(grenze.wert[k]!);
      }
    }
    const index = Uint32Array.from(idx);
    const wert = Float64Array.from(w);
    zeilen.push({ index, wert });
    for (let p = 0; p < index.length; p++) {
      const rp = index[p]! * n;
      const gp = b.gewicht * wert[p]!;
      for (let q = 0; q < index.length; q++) N[rp + index[q]!]! += gp * wert[q]!;
    }
  }
  return { n, lu: luZerlegen(N, n), bedingungen: [...bedingungen], zeilen };
}

function duennerAusgleich(grenze: DuennMatrix, n: number, bedingungen: readonly Bedingung[], gm: Glaettemass): AusgleichsLoeser {
  const zeilen: { index: Uint32Array; wert: Float64Array }[] = [];
  const alle: NormalZeile[] = [];
  for (const b of bedingungen) {
    const i = b.zeile;
    const idx: number[] = [];
    const w: number[] = [];
    for (let k = grenze.start[i]!; k < grenze.start[i + 1]!; k++) {
      const j = grenze.index[k]!;
      if (j < n) {
        idx.push(j);
        w.push(grenze.wert[k]!);
      }
    }
    const z = { index: Uint32Array.from(idx), wert: Float64Array.from(w) };
    zeilen.push(z);
    alle.push({ ...z, gewicht: b.gewicht });
  }
  for (const z of gm.zeilen) alle.push(z);
  const l: AusgleichsLoeser = { n, duenn: normalSystem(n, alle, gm.nachbarn), bedingungen: [...bedingungen], zeilen };
  if ((gm.bezug ?? 0) > 0 && gm.zeilen.length) {
    const ziel = new Int32Array(n).fill(-1);
    bedingungen.forEach((b, q) => {
      if (b.zeile < n && ziel[b.zeile]! < 0) ziel[b.zeile] = q;
    });
    if (ziel.every((q) => q >= 0)) l.bezug = { zeilen: gm.zeilen, anteil: gm.bezug!, ziel };
  }
  return l;
}

/** Käfiglagen im Ausgleich: `ziele` je Bedingung (3 Werte, Reihenfolge der Bedingungen). */
export function kaefigAusgleich(l: AusgleichsLoeser, ziele: Float64Array): Float64Array {
  const rhs = new Float64Array(3 * l.n);
  for (let b = 0; b < l.bedingungen.length; b++) {
    const g = l.bedingungen[b]!.gewicht;
    const { index, wert } = l.zeilen[b]!;
    const tx = g * ziele[3 * b]!;
    const ty = g * ziele[3 * b + 1]!;
    const tz = g * ziele[3 * b + 2]!;
    for (let p = 0; p < index.length; p++) {
      const j = 3 * index[p]!;
      const a = wert[p]!;
      rhs[j]! += a * tx;
      rhs[j + 1]! += a * ty;
      rhs[j + 2]! += a * tz;
    }
  }
  if (l.bezug) {
    // Σ g·β·Lᵀ(L·T): T = Käfig aus den Zielen der Käfigpunkte (Bezug der Glättung). Ein vorab auf die Ziele gehobener
    // Bezug (T ← T + (Ziel − G·T)) brachte den Wellenschlag der Interpolation zurück (Rex aus der Kugel 31–71°) — verworfen.
    const { zeilen, anteil, ziel } = l.bezug;
    const n = l.n;
    const T = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
      const q = 3 * ziel[i]!;
      T[3 * i] = ziele[q]!;
      T[3 * i + 1] = ziele[q + 1]!;
      T[3 * i + 2] = ziele[q + 2]!;
    }
    for (const z of zeilen) {
      let rx = 0;
      let ry = 0;
      let rz = 0;
      for (let t = 0; t < z.index.length; t++) {
        const j = 3 * z.index[t]!;
        const a = z.wert[t]!;
        rx += a * T[j]!;
        ry += a * T[j + 1]!;
        rz += a * T[j + 2]!;
      }
      const g = z.gewicht * anteil;
      for (let t = 0; t < z.index.length; t++) {
        const j = 3 * z.index[t]!;
        const a = g * z.wert[t]!;
        rhs[j]! += a * rx;
        rhs[j + 1]! += a * ry;
        rhs[j + 2]! += a * rz;
      }
    }
  }
  return l.duenn ? l.duenn.loesen(rhs) : luLoesen(l.lu!, rhs, 3);
}
