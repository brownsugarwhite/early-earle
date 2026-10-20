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
  /**
   * Glättung relativ zur Zielform (S2): Zeilen, Anteil `bezug`, Bedingung des Ziels je Käfigpunkt (−1 = keine; dann aus den
   * Nachbarn gemittelt, `nachbarn` = Käfiggraph)
   */
  bezug?: { zeilen: readonly NormalZeile[]; anteil: number; ziel: Int32Array; nachbarn: readonly (readonly number[])[]; hub?: number };
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
 * verschwindet. Je Käfigpunkt i die Bedingung mit `zeile: i`; fehlt sie einem Punkt, nimmt er das Mittel seiner Nachbarn
 * (Plan 20.10., V0 — vorher fiel dann der ganze Bezug still weg, und die Glättung zog gegen 0, die gemessene Faltenquelle;
 * in den heutigen Bauten kam es nicht vor). Ist die Matrix nicht positiv definit, wird sie leicht gedämpft neu zerlegt
 * (vorher brach der Bau ab).
 */
export type Glaettemass = {
  zeilen: readonly NormalZeile[];
  nachbarn: readonly (readonly number[])[];
  bezug?: number;
  /**
   * Hub des Bezugs (Plan 20.10., V4, Querschnitt aus der Sichthülle): T ← T + hub · (Ziel − Grenzlage(T)) — der Bezug nähert
   * den Käfig an, dessen Grenzfläche die Ziele trifft. Ohne Hub liegt die Fläche in Mulden der Ziele außen und auf Wölbungen
   * innen (Robbe 2,9 px über der Front an der Flanke).
   */
  hub?: number;
};

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
  let duenn: NormalSystem;
  try {
    duenn = normalSystem(n, alle, gm.nachbarn);
  } catch {
    // nicht positiv definit (ein Punkt ohne Bedingung und ohne Glättungszeile): leicht gedämpft, statt den Bau abzubrechen
    let spur = 0;
    for (const z of alle) for (let t = 0; t < z.index.length; t++) spur += z.gewicht * z.wert[t]! * z.wert[t]!;
    duenn = normalSystem(n, alle, gm.nachbarn, Math.max(1e-12, (1e-9 * spur) / Math.max(1, n)));
  }
  const l: AusgleichsLoeser = { n, duenn, bedingungen: [...bedingungen], zeilen };
  if ((gm.bezug ?? 0) > 0 && gm.zeilen.length) {
    const ziel = new Int32Array(n).fill(-1);
    bedingungen.forEach((b, q) => {
      if (b.zeile < n && ziel[b.zeile]! < 0) ziel[b.zeile] = q;
    });
    l.bezug = { zeilen: gm.zeilen, anteil: gm.bezug!, ziel, nachbarn: gm.nachbarn, ...(gm.hub ? { hub: gm.hub } : {}) };
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
    const { zeilen, anteil, ziel, nachbarn } = l.bezug;
    const n = l.n;
    const T = new Float64Array(3 * n);
    const bekannt = new Uint8Array(n);
    let offen = 0;
    for (let i = 0; i < n; i++) {
      if (ziel[i]! < 0) {
        offen++;
        continue;
      }
      const q = 3 * ziel[i]!;
      T[3 * i] = ziele[q]!;
      T[3 * i + 1] = ziele[q + 1]!;
      T[3 * i + 2] = ziele[q + 2]!;
      bekannt[i] = 1;
    }
    // Punkte ohne eigenes Ziel: Mittel der schon bekannten Nachbarn, Runde für Runde nach außen
    for (let runde = 0; offen > 0 && runde < n; runde++) {
      const neu: number[] = [];
      for (let i = 0; i < n; i++) {
        if (bekannt[i]) continue;
        let m = 0;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        for (const j of nachbarn[i] ?? []) {
          if (j >= n || !bekannt[j]) continue;
          m++;
          sx += T[3 * j]!;
          sy += T[3 * j + 1]!;
          sz += T[3 * j + 2]!;
        }
        if (!m) continue;
        T[3 * i] = sx / m;
        T[3 * i + 1] = sy / m;
        T[3 * i + 2] = sz / m;
        neu.push(i);
      }
      if (!neu.length) break;
      for (const i of neu) bekannt[i] = 1;
      offen -= neu.length;
    }
    if (l.bezug.hub) {
      const hub = l.bezug.hub;
      const T0 = T.slice();
      for (let i = 0; i < n; i++) {
        const b = ziel[i]!;
        if (b < 0) continue;
        const { index, wert } = l.zeilen[b]!;
        let gx = 0;
        let gy = 0;
        let gz = 0;
        for (let p = 0; p < index.length; p++) {
          const j = 3 * index[p]!;
          gx += wert[p]! * T0[j]!;
          gy += wert[p]! * T0[j + 1]!;
          gz += wert[p]! * T0[j + 2]!;
        }
        T[3 * i] = T0[3 * i]! + hub * (T0[3 * i]! - gx);
        T[3 * i + 1] = T0[3 * i + 1]! + hub * (T0[3 * i + 1]! - gy);
        T[3 * i + 2] = T0[3 * i + 2]! + hub * (T0[3 * i + 2]! - gz);
      }
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
