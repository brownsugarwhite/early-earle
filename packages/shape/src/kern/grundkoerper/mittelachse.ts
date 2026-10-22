// Teil G, G2: Wege im Inneren eines geschlossenen Umrisses (Raster, Dijkstra) — für die Enden der Wirbelsäule (`enden.ts`),
// die Mittelebene des Baums (`ebene.ts`) und die seitlichen Teile (`seitenteil.ts`). Die Mittelachse (Skelett) des Versuchs G2
// ist seit Plan 20.10., V1 entfernt (niemand rief sie mehr). DOM-frei.
import type { V2 } from '../../bezier';

/**
 * Wege im Inneren eines geschlossenen Polygons (Raster, 8er-Nachbarschaft, Dijkstra mit Halde): Weglänge vom Start zu
 * jedem Punkt, gemessen innerhalb der Form (um Biegungen herum). Punkte außerhalb nehmen die nächste innere Zelle.
 */
export function innenWege(poly: readonly V2[], start: V2, zellen = 200): (q: V2) => number {
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
  const W = Math.ceil((x1 - x0) / h) + 4;
  const H = Math.ceil((y1 - y0) / h) + 4;
  const ox = x0 - 2 * h;
  const oy = y0 - 2 * h;
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
  const zelleVon = (q: V2): number => {
    const c = Math.min(W - 1, Math.max(0, Math.floor((q.x - ox) / h)));
    const r = Math.min(H - 1, Math.max(0, Math.floor((q.y - oy) / h)));
    if (innen[r * W + c]) return r * W + c;
    // nächste innere Zelle (Ringsuche)
    for (let rad = 1; rad < Math.max(W, H); rad++)
      for (let dr = -rad; dr <= rad; dr++)
        for (let dc = -rad; dc <= rad; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && cc >= 0 && rr < H && cc < W && innen[rr * W + cc]) return rr * W + cc;
        }
    return -1;
  };
  const d = new Float64Array(W * H).fill(Infinity);
  const s = zelleVon(start);
  if (s >= 0) {
    // binäre Halde über (Abstand, Zelle)
    const heapD: number[] = [];
    const heapI: number[] = [];
    const push = (dd: number, i: number) => {
      heapD.push(dd);
      heapI.push(i);
      let k = heapD.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heapD[p]! <= heapD[k]!) break;
        [heapD[p], heapD[k]] = [heapD[k]!, heapD[p]!];
        [heapI[p], heapI[k]] = [heapI[k]!, heapI[p]!];
        k = p;
      }
    };
    const pop = (): [number, number] => {
      const top: [number, number] = [heapD[0]!, heapI[0]!];
      const ld = heapD.pop()!;
      const li = heapI.pop()!;
      if (heapD.length) {
        heapD[0] = ld;
        heapI[0] = li;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heapD.length && heapD[l]! < heapD[m]!) m = l;
          if (r < heapD.length && heapD[r]! < heapD[m]!) m = r;
          if (m === k) break;
          [heapD[m], heapD[k]] = [heapD[k]!, heapD[m]!];
          [heapI[m], heapI[k]] = [heapI[k]!, heapI[m]!];
          k = m;
        }
      }
      return top;
    };
    d[s] = 0;
    push(0, s);
    while (heapD.length) {
      const [di, i] = pop();
      if (di > d[i]!) continue;
      const r = Math.floor(i / W);
      const c = i - r * W;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= H || cc >= W) continue;
          const j = rr * W + cc;
          if (!innen[j]) continue;
          const nd = di + (dr && dc ? Math.SQRT2 : 1) * h;
          if (nd < d[j]!) {
            d[j] = nd;
            push(nd, j);
          }
        }
    }
  }
  return (q: V2) => {
    const i = zelleVon(q);
    return i < 0 ? Infinity : d[i]!;
  };
}
