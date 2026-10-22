// Raster einer geschlossenen Silhouette (Zellmitten) für das Skelett der Teilerkennung (`skelett.ts`, S4). Herausgelöst aus
// dem Versuch G4 (`teile.ts`), der seit Plan 20.10., V1 entfernt ist; bitgleich. DOM-frei.
import type { V2 } from '../../bezier';

export type Raster = { W: number; H: number; ox: number; oy: number; h: number; innen: Uint8Array };

/** Polygon (geschlossen, Welt) auf ein Raster füllen (Zellmitten). */
export function rastern(poly: readonly V2[], zellen: number, rand = 4): Raster {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of poly) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const h = Math.max(x1 - x0, y1 - y0) / zellen || 1;
  const W = Math.ceil((x1 - x0) / h) + 2 * rand;
  const H = Math.ceil((y1 - y0) / h) + 2 * rand;
  const ox = x0 - rand * h;
  const oy = y0 - rand * h;
  const innen = new Uint8Array(W * H);
  for (let r = 0; r < H; r++) {
    const y = oy + (r + 0.5) * h;
    const xs: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const b = poly[j]!;
      if (a.y > y !== b.y > y) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k]! - ox) / h - 0.5));
      const c1 = Math.min(W - 1, Math.floor((xs[k + 1]! - ox) / h - 0.5));
      for (let c = c0; c <= c1; c++) innen[r * W + c] = 1;
    }
  }
  return { W, H, ox, oy, h, innen };
}
