// Plan 20.10., V4 „Exakte Umrisse“: Ausgleich mit Gewichten je Achse. Eine Bedingung darf nur einzelne Achsen binden (Lage
// auf dem Top-Umriss nur in z, Tangente in x und z, Ungleichung in den beiden Achsen eines Blatts); dafür drei dünn besetzte
// Zerlegungen (x, y, z), jede mit den Zeilen ihrer Achse. Käfigziele, Glättung (mit Bezug) und Naht wirken in allen dreien.
// Bisher hielt eine Bedingung immer alle drei Achsen, und der Breitenpunkt hielt x und y auf ihrem letzten Wert fest — ein
// Zwang, der erst nach mehreren Durchgängen nachgab. Mit gleichen Gewichten in allen Achsen rechnet der Löser bitgleich wie
// der dünne Ausgleich (`ausgleichsLoeser` mit Glättungsmaß). DOM-frei.

import type { DuennMatrix } from '../subdivision/matrix';
import type { Glaettemass } from './grenzflaeche';
import { type NormalSystem, type NormalZeile, normalSystem } from './normalSystem';

/** Bedingung: dünne Zeile in Käfigpunkten (Grenzlage eines feinen Punkts oder Differenz zweier), Gewicht je Achse. */
export type AchsZeile = { index: ArrayLike<number>; wert: ArrayLike<number>; gewicht: readonly [number, number, number] };

export type AchsenLoeser = {
  n: number;
  achsen: [NormalSystem, NormalSystem, NormalSystem];
  zeilen: readonly AchsZeile[];
  /** Glättung relativ zur Zielform: wie im dünnen Ausgleich (`ziel` = Zeile, die das Ziel des Käfigpunkts trägt, −1 = keine) */
  bezug?: { zeilen: readonly NormalZeile[]; anteil: number; ziel: Int32Array; nachbarn: readonly (readonly number[])[] };
  zeitZerlegen: number;
};

/** Zeile der Grenzmatrix (nur Käfigspalten < n): Grenzlage des feinen Punkts i in Käfigpunkten. */
export function grenzZeile(grenze: DuennMatrix, i: number, n: number): { index: Uint32Array; wert: Float64Array } {
  const idx: number[] = [];
  const w: number[] = [];
  for (let k = grenze.start[i]!; k < grenze.start[i + 1]!; k++) {
    const j = grenze.index[k]!;
    if (j < n) {
      idx.push(j);
      w.push(grenze.wert[k]!);
    }
  }
  return { index: Uint32Array.from(idx), wert: Float64Array.from(w) };
}

/** Differenz zweier Grenzzeilen (a − b), Einträge je Käfigpunkt zusammengefasst. */
export function grenzDifferenz(grenze: DuennMatrix, a: number, b: number, n: number): { index: Uint32Array; wert: Float64Array } {
  const m = new Map<number, number>();
  for (let k = grenze.start[a]!; k < grenze.start[a + 1]!; k++) {
    const j = grenze.index[k]!;
    if (j < n) m.set(j, (m.get(j) ?? 0) + grenze.wert[k]!);
  }
  for (let k = grenze.start[b]!; k < grenze.start[b + 1]!; k++) {
    const j = grenze.index[k]!;
    if (j < n) m.set(j, (m.get(j) ?? 0) - grenze.wert[k]!);
  }
  const idx: number[] = [];
  const w: number[] = [];
  for (const [j, v] of m) {
    if (Math.abs(v) > 1e-15) {
      idx.push(j);
      w.push(v);
    }
  }
  return { index: Uint32Array.from(idx), wert: Float64Array.from(w) };
}

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

function zerlegen(n: number, zeilen: readonly NormalZeile[], nachbarn: readonly (readonly number[])[]): NormalSystem {
  try {
    return normalSystem(n, zeilen, nachbarn);
  } catch {
    // nicht positiv definit (ein Punkt ohne Bedingung in dieser Achse): leicht gedämpft, wie der dünne Ausgleich
    let spur = 0;
    for (const z of zeilen) for (let t = 0; t < z.index.length; t++) spur += z.gewicht * z.wert[t]! * z.wert[t]!;
    return normalSystem(n, zeilen, nachbarn, Math.max(1e-12, (1e-9 * spur) / Math.max(1, n)));
  }
}

/**
 * Drei Zerlegungen (x, y, z): je Achse die Zeilen mit Gewicht > 0 in ihrer Reihenfolge, danach die Glättungszeilen.
 * `zielZeile[i]` = Zeile, deren Ziel das des Käfigpunkts i ist (für die Glättung relativ zur Zielform), −1 = keine.
 */
export function achsenLoeser(n: number, zeilen: readonly AchsZeile[], gm: Glaettemass, zielZeile?: Int32Array): AchsenLoeser {
  const t0 = jetzt();
  const achse = (a: 0 | 1 | 2) => {
    const alle: NormalZeile[] = [];
    for (const z of zeilen) if (z.gewicht[a] > 0) alle.push({ index: z.index, wert: z.wert, gewicht: z.gewicht[a] });
    for (const z of gm.zeilen) alle.push(z);
    return zerlegen(n, alle, gm.nachbarn);
  };
  const achsen: [NormalSystem, NormalSystem, NormalSystem] = [achse(0), achse(1), achse(2)];
  const l: AchsenLoeser = { n, achsen, zeilen, zeitZerlegen: jetzt() - t0 };
  if ((gm.bezug ?? 0) > 0 && gm.zeilen.length && zielZeile) l.bezug = { zeilen: gm.zeilen, anteil: gm.bezug!, ziel: zielZeile, nachbarn: gm.nachbarn };
  return l;
}

/** Käfiglagen (3 je Punkt) für die Ziele der Zeilen (3 Werte je Zeile; Achsen ohne Gewicht zählen nicht). */
export function achsenAusgleich(l: AchsenLoeser, ziele: Float64Array): Float64Array {
  const n = l.n;
  const rhs = [new Float64Array(n), new Float64Array(n), new Float64Array(n)];
  for (let q = 0; q < l.zeilen.length; q++) {
    const { index, wert, gewicht } = l.zeilen[q]!;
    for (let a = 0; a < 3; a++) {
      const g = gewicht[a]!;
      if (!(g > 0)) continue;
      const t = g * ziele[3 * q + a]!;
      const r = rhs[a]!;
      for (let p = 0; p < index.length; p++) r[index[p]!]! += wert[p]! * t;
    }
  }
  if (l.bezug) {
    // Σ g·β·Lᵀ(L·T): T = Käfig aus den Zielen der Käfigpunkte (Punkte ohne Ziel: Mittel der bekannten Nachbarn, Runde für
    // Runde) — wie `kaefigAusgleich`
    const { zeilen, anteil, ziel, nachbarn } = l.bezug;
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
        const j = z.index[t]!;
        const a = g * z.wert[t]!;
        rhs[0]![j]! += a * rx;
        rhs[1]![j]! += a * ry;
        rhs[2]![j]! += a * rz;
      }
    }
  }
  const out = new Float64Array(3 * n);
  for (let a = 0; a < 3; a++) {
    const x = l.achsen[a]!.loesenSpalte(rhs[a]!);
    for (let i = 0; i < n; i++) out[3 * i + a] = x[i]!;
  }
  return out;
}
