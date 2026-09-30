import type { CatalogEntry } from '@ee/genome';

/**
 * Setzkasten-Raster (reine Geometrie, testbar): ein Kasten je Zone, die Fächer so unregelmäßig wie in einem echten
 * Setzkasten. Hochformat: Zeilen = Stufen 1 → 12 von oben nach unten, jede Zeile in so viele Fächer geteilt, wie es
 * Arten auf der Stufe gibt (1–8); ab fünf Arten wird die Zeile ein zweistöckiger Block (4 × 2 bei acht). Querformat:
 * gespiegelt — Spalten = Stufen von links nach rechts, die Arten übereinander.
 *
 * Koordinaten in Kasten-Einheiten: u nach rechts, v nach unten (im 3D: x und z, der Kasten liegt flach).
 */
export type CaseOrientation = 'portrait' | 'landscape';

export interface CaseCell {
  entry: CatalogEntry;
  /** Oben links (u, v) und Größe. */
  u: number;
  v: number;
  w: number;
  h: number;
}

export interface CaseBand {
  tier: number;
  u: number;
  v: number;
  w: number;
  h: number;
}

export interface CaseLayout {
  orientation: CaseOrientation;
  /** Außenmaß des Inhalts (ohne Rahmen). */
  width: number;
  height: number;
  cells: CaseCell[];
  bands: CaseBand[];
}

/** Breite (Hochformat) bzw. Höhe (Querformat) eines Kastens. */
export const CASE_SPAN = 4;
/** Tiefe eines Stockwerks (eine Fachreihe). */
export const CASE_ROW = 1;

/** Teilt n Arten auf höchstens zwei Stockwerke: ≤ 4 → eins, sonst oben ⌈n/2⌉, unten ⌊n/2⌋ (8 → 4 × 2). */
export function storeys(n: number): number[] {
  if (n <= 4) return [n];
  return [Math.ceil(n / 2), Math.floor(n / 2)];
}

export function layoutCase(entries: readonly CatalogEntry[], orientation: CaseOrientation): CaseLayout {
  const tiers = [...new Set(entries.map((e) => e.tier))].sort((a, b) => a - b);
  const cells: CaseCell[] = [];
  const bands: CaseBand[] = [];
  let along = 0;
  for (const tier of tiers) {
    const row = entries.filter((e) => e.tier === tier);
    const floors = storeys(row.length);
    const depth = floors.length * CASE_ROW;
    let k = 0;
    floors.forEach((count, f) => {
      const size = CASE_SPAN / count;
      for (let i = 0; i < count; i++) {
        const entry = row[k++]!;
        if (orientation === 'portrait') cells.push({ entry, u: i * size, v: along + f * CASE_ROW, w: size, h: CASE_ROW });
        else cells.push({ entry, u: along + f * CASE_ROW, v: i * size, w: CASE_ROW, h: size });
      }
    });
    if (orientation === 'portrait') bands.push({ tier, u: 0, v: along, w: CASE_SPAN, h: depth });
    else bands.push({ tier, u: along, v: 0, w: depth, h: CASE_SPAN });
    along += depth;
  }
  return orientation === 'portrait' ? { orientation, width: CASE_SPAN, height: along, cells, bands } : { orientation, width: along, height: CASE_SPAN, cells, bands };
}

/** Wände eines Kastens: alle Fachkanten ohne Doppel (Kasten-Einheiten), jede als Strecke mit Richtung. */
export interface CaseWall {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Außenwand (Rahmen). */
  outer: boolean;
}

export function caseWalls(layout: CaseLayout): CaseWall[] {
  const key = (a: number, b: number, c: number, d: number) => `${a.toFixed(3)},${b.toFixed(3)},${c.toFixed(3)},${d.toFixed(3)}`;
  const seen = new Map<string, CaseWall>();
  const eps = 1e-6;
  const add = (u0: number, v0: number, u1: number, v1: number) => {
    const outer = (Math.abs(u0 - u1) < eps && (Math.abs(u0) < eps || Math.abs(u0 - layout.width) < eps)) || (Math.abs(v0 - v1) < eps && (Math.abs(v0) < eps || Math.abs(v0 - layout.height) < eps));
    const k = key(u0, v0, u1, v1);
    if (!seen.has(k)) seen.set(k, { u0, v0, u1, v1, outer });
  };
  for (const c of layout.cells) {
    add(c.u, c.v, c.u + c.w, c.v); // top
    add(c.u, c.v + c.h, c.u + c.w, c.v + c.h); // bottom
    add(c.u, c.v, c.u, c.v + c.h); // left
    add(c.u + c.w, c.v, c.u + c.w, c.v + c.h); // right
  }
  return [...seen.values()];
}
