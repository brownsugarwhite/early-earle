// Wesen-Editor 2, Phase 1 / M3: Pinsel auf Käfigpunkten (Plan 4.3). Die Pinsel verändern nicht das feine Netz, sondern
// Käfigpunkte der Vorlage; die Versätze (Deltas) stehen im Dokument (rechte Hälfte oder Naht) und werden nach der
// Ableitung auf den Käfig addiert, gespiegelt für die linke Hälfte. Topologie und Griffe bleiben gültig, das Ergebnis ist
// immer eine glatte Subdivision-Fläche. Hier die DOM-freie Mathe: Spiegelpartner, Deltas anwenden, Gewichte, Normalen,
// Nachbarn (für Glätten).

import type { KaefigDelta } from '../dokument';
import { mitLagen } from '../kaefig/halbkanten';
import { anwenden3 } from '../subdivision/matrix';
import type { Ableitung } from './ableiten';

type V3 = [number, number, number];

/** Spiegelpartner je Punkt (x, y, −z) für die ersten n0 Punkte; Nahtpunkte sind ihr eigener Partner, −1 ohne Partner. */
export function spiegelIndex(xyz: ArrayLike<number>, n0: number, eps = 1e-6): Int32Array {
  const out = new Int32Array(n0).fill(-1);
  const schluessel = (x: number, y: number, z: number) => `${Math.round(x / eps)}:${Math.round(y / eps)}:${Math.round(z / eps)}`;
  const karte = new Map<string, number>();
  for (let p = 0; p < n0; p++) karte.set(schluessel(xyz[3 * p]!, xyz[3 * p + 1]!, xyz[3 * p + 2]!), p);
  for (let p = 0; p < n0; p++) {
    const z = xyz[3 * p + 2]!;
    if (Math.abs(z) < eps) {
      out[p] = p;
      continue;
    }
    const q = karte.get(schluessel(xyz[3 * p]!, xyz[3 * p + 1]!, -z));
    out[p] = q ?? -1;
  }
  return out;
}

/**
 * Deltas auf den abgeleiteten Käfig addieren: je Delta der Punkt selbst und sein Spiegelpartner (z negiert); auf der
 * Naht wird z zu 0 gezwungen. Liefert eine Kopie der Ableitung mit neuen Käfiglagen und neu ausgewertetem feinen Netz.
 */
/** Deltas (× Faktor) auf Lagen addieren: Punkt und Spiegelpartner (z negiert), Nahtpunkte ohne z. */
export function deltasAddieren(xyz: Float64Array, spiegel: Int32Array, deltas: readonly KaefigDelta[], faktor = 1): void {
  for (const { punkt: p, d } of deltas) {
    if (p < 0 || p >= spiegel.length) continue;
    const q = spiegel[p]!;
    const naht = q === p;
    xyz[3 * p] = xyz[3 * p]! + faktor * d[0];
    xyz[3 * p + 1] = xyz[3 * p + 1]! + faktor * d[1];
    if (!naht) xyz[3 * p + 2] = xyz[3 * p + 2]! + faktor * d[2];
    if (q >= 0 && !naht) {
      xyz[3 * q] = xyz[3 * q]! + faktor * d[0];
      xyz[3 * q + 1] = xyz[3 * q + 1]! + faktor * d[1];
      xyz[3 * q + 2] = xyz[3 * q + 2]! - faktor * d[2];
    }
  }
}

/**
 * Deltas der Grundform auf die Vorlagenpunkte (p < n0) des abgeleiteten Käfigs addieren (gespiegelt, Naht bei z = 0);
 * Kopie der Ableitung mit neuen Käfiglagen und neu ausgewertetem feinen Netz. Mit `alle` auch Maul-/Beinpunkte
 * (Posen: gelten nur für die aktuelle Maultopologie).
 */
export function deltasAnwenden<T extends Ableitung>(abl: T, deltas: readonly KaefigDelta[], alle = false): T {
  if (!deltas.length) return abl;
  const n0 = alle ? abl.kaefig.n : Math.min(abl.vorlage.kaefig.n, abl.kaefig.n);
  const xyz = new Float64Array(abl.kaefig.xyz);
  deltasAddieren(xyz, spiegelIndex(abl.kaefig.xyz, n0), deltas);
  return { ...abl, kaefig: mitLagen(abl.kaefig, xyz), fein: anwenden3(abl.unterteilung.grenze, xyz) };
}

/** Abfall des Pinsels: 1 in der Mitte, 0 am Rand, glatt (1 − (d/r)²)². */
export const abfall = (d: number, r: number): number => {
  const t = d / r;
  if (t >= 1) return 0;
  const u = 1 - t * t;
  return u * u;
};

/**
 * Gewichte eines Pinselstrichs für die Vorlagenpunkte (p < n0): Abstand zur Mitte und zu ihrem Spiegelbild (der Pinsel
 * wirkt immer gespiegelt), beide Gewichte getrennt (das zweite gilt für den gespiegelten Versatz).
 */
export function pinselGewichte(xyz: ArrayLike<number>, n0: number, mitte: V3, radius: number): { punkt: number; w: number; wSpiegel: number }[] {
  const out: { punkt: number; w: number; wSpiegel: number }[] = [];
  for (let p = 0; p < n0; p++) {
    const x = xyz[3 * p]!;
    const y = xyz[3 * p + 1]!;
    const z = xyz[3 * p + 2]!;
    const w = abfall(Math.hypot(x - mitte[0], y - mitte[1], z - mitte[2]), radius);
    const wSpiegel = abfall(Math.hypot(x - mitte[0], y - mitte[1], z + mitte[2]), radius);
    if (w > 0 || wSpiegel > 0) out.push({ punkt: p, w, wSpiegel });
  }
  return out;
}

/** Punktnormalen eines Käfigs (Mittel der Flächennormalen, Newell), für die ersten n Punkte. */
export function kaefigNormalen(xyz: ArrayLike<number>, fStart: ArrayLike<number>, fVerts: ArrayLike<number>, n: number): Float64Array {
  const out = new Float64Array(3 * n);
  const nF = fStart.length - 1;
  for (let f = 0; f < nF; f++) {
    const a = fStart[f]!;
    const b = fStart[f + 1]!;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let h = a; h < b; h++) {
      const i = fVerts[h]!;
      const j = fVerts[h + 1 < b ? h + 1 : a]!;
      nx += (xyz[3 * i + 1]! - xyz[3 * j + 1]!) * (xyz[3 * i + 2]! + xyz[3 * j + 2]!);
      ny += (xyz[3 * i + 2]! - xyz[3 * j + 2]!) * (xyz[3 * i]! + xyz[3 * j]!);
      nz += (xyz[3 * i]! - xyz[3 * j]!) * (xyz[3 * i + 1]! + xyz[3 * j + 1]!);
    }
    for (let h = a; h < b; h++) {
      const i = fVerts[h]!;
      if (i >= n) continue;
      out[3 * i] = out[3 * i]! + nx;
      out[3 * i + 1] = out[3 * i + 1]! + ny;
      out[3 * i + 2] = out[3 * i + 2]! + nz;
    }
  }
  for (let i = 0; i < n; i++) {
    const l = Math.hypot(out[3 * i]!, out[3 * i + 1]!, out[3 * i + 2]!) || 1;
    out[3 * i] = out[3 * i]! / l;
    out[3 * i + 1] = out[3 * i + 1]! / l;
    out[3 * i + 2] = out[3 * i + 2]! / l;
  }
  return out;
}

/** Nachbarn je Punkt (über Flächenkanten), für die ersten n Punkte. */
export function kaefigNachbarn(fStart: ArrayLike<number>, fVerts: ArrayLike<number>, n: number): number[][] {
  const out: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  const nF = fStart.length - 1;
  for (let f = 0; f < nF; f++) {
    const a = fStart[f]!;
    const b = fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const i = fVerts[h]!;
      const j = fVerts[h + 1 < b ? h + 1 : a]!;
      if (i < n) out[i]!.add(j);
      if (j < n) out[j]!.add(i);
    }
  }
  return out.map((s) => [...s]);
}

/** Deltas als Karte (Punkt → Versatz) und zurück als Liste ohne Nullen. */
export function deltaKarte(deltas: readonly KaefigDelta[] | undefined): Map<number, V3> {
  const m = new Map<number, V3>();
  for (const { punkt, d } of deltas ?? []) m.set(punkt, [d[0], d[1], d[2]]);
  return m;
}
export function deltaListe(karte: Map<number, V3>, eps = 1e-9): KaefigDelta[] {
  const out: KaefigDelta[] = [];
  for (const [punkt, d] of karte) if (Math.abs(d[0]) > eps || Math.abs(d[1]) > eps || Math.abs(d[2]) > eps) out.push({ punkt, d: [d[0], d[1], d[2]] });
  return out.sort((a, b) => a.punkt - b.punkt);
}
