// Teil G, G2: Mittelachse (Skelett) eines geschlossenen Umrisses auf einem Raster. Der Umriss wird gefüllt, zu einer
// ein Pixel breiten Linie verdünnt (Zhang-Suen), daraus ein Graph; die Hauptachse ist der längste Weg darin (Durchmesser
// des Baums, zwei Breitensuchen mit √2 für Diagonalen). Seitenäste (Brust, Bauch, Flossen) enden an eigenen Endpunkten.
// DOM-frei, ≈ 5–15 ms bei 200 Zellen.
import type { V2 } from '../../bezier';

export type Mittelachse = {
  /** Hauptachse von einem Ende zum anderen (Welt) */
  pfad: V2[];
  /** alle Endpunkte des Skeletts (Welt) und ob sie Enden der Hauptachse sind */
  enden: { p: V2; haupt: boolean }[];
  /** Länge der Hauptachse (Welt) */
  laenge: number;
  /** Zellgröße des Rasters (Welt) */
  zelle: number;
};

/** Mittelachse des Polygons (geschlossen, Welt). null, wenn es zu klein oder entartet ist. */
export function mittelachse(poly: readonly V2[], zellen = 200): Mittelachse | null {
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
  const h = Math.max(x1 - x0, y1 - y0) / zellen;
  if (!(h > 0)) return null;
  const W = Math.ceil((x1 - x0) / h) + 4;
  const H = Math.ceil((y1 - y0) / h) + 4;
  const ox = x0 - 2 * h;
  const oy = y0 - 2 * h;
  const bild = new Uint8Array(W * H);
  // Füllen per Abtastzeile (Mitte der Zelle)
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
      for (let c = c0; c <= c1; c++) bild[r * W + c] = 1;
    }
  }
  // Zhang-Suen-Verdünnung
  const at = (c: number, r: number) => (c < 0 || r < 0 || c >= W || r >= H ? 0 : bild[r * W + c]!);
  let geaendert = true;
  const weg: number[] = [];
  while (geaendert) {
    geaendert = false;
    for (const schritt of [0, 1]) {
      weg.length = 0;
      for (let r = 1; r < H - 1; r++)
        for (let c = 1; c < W - 1; c++) {
          if (!bild[r * W + c]) continue;
          const p2 = at(c, r - 1);
          const p3 = at(c + 1, r - 1);
          const p4 = at(c + 1, r);
          const p5 = at(c + 1, r + 1);
          const p6 = at(c, r + 1);
          const p7 = at(c - 1, r + 1);
          const p8 = at(c - 1, r);
          const p9 = at(c - 1, r - 1);
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const folge = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let A = 0;
          for (let k = 0; k < 8; k++) if (folge[k] === 0 && folge[k + 1] === 1) A++;
          if (A !== 1) continue;
          if (schritt === 0 ? p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0 : p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) continue;
          weg.push(r * W + c);
        }
      if (weg.length) geaendert = true;
      for (const i of weg) bild[i] = 0;
    }
  }
  // Graph der Skelettpixel (8er-Nachbarschaft)
  const pixel: number[] = [];
  for (let i = 0; i < W * H; i++) if (bild[i]) pixel.push(i);
  if (pixel.length < 3) return null;
  const nachbarn = (i: number): number[] => {
    const r = Math.floor(i / W);
    const c = i - r * W;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        if (at(c + dc, r + dr)) out.push((r + dr) * W + c + dc);
      }
    return out;
  };
  const weite = (start: number): { d: Map<number, number>; vor: Map<number, number> } => {
    // Dijkstra mit Gewichten 1/√2 (kleiner Graph, einfache Liste genügt)
    const d = new Map<number, number>([[start, 0]]);
    const vor = new Map<number, number>();
    const offen = [start];
    while (offen.length) {
      let bi = 0;
      for (let k = 1; k < offen.length; k++) if (d.get(offen[k]!)! < d.get(offen[bi]!)!) bi = k;
      const i = offen.splice(bi, 1)[0]!;
      const di = d.get(i)!;
      for (const j of nachbarn(i)) {
        const w = Math.abs(j - i) === 1 || Math.abs(j - i) === W ? 1 : Math.SQRT2;
        if (di + w < (d.get(j) ?? Infinity)) {
          if (!d.has(j)) offen.push(j);
          d.set(j, di + w);
          vor.set(j, i);
        }
      }
    }
    return { d, vor };
  };
  // größte Zusammenhangskomponente: von einem beliebigen Pixel aus der fernste, von dort der fernste
  const fernste = (d: Map<number, number>) => {
    let best = -1;
    let bd = -1;
    for (const [i, v] of d) if (v > bd) {
      bd = v;
      best = i;
    }
    return { i: best, d: bd };
  };
  const a = fernste(weite(pixel[0]!).d).i;
  const w2 = weite(a);
  const b = fernste(w2.d);
  const welt = (i: number): V2 => {
    const r = Math.floor(i / W);
    const c = i - r * W;
    return { x: ox + (c + 0.5) * h, y: oy + (r + 0.5) * h };
  };
  const pfadIdx: number[] = [b.i];
  while (pfadIdx[pfadIdx.length - 1] !== a) pfadIdx.push(w2.vor.get(pfadIdx[pfadIdx.length - 1]!)!);
  const pfad = pfadIdx.map(welt);
  const enden: { p: V2; haupt: boolean }[] = [];
  for (const i of pixel) if (w2.d.has(i) && nachbarn(i).length === 1) enden.push({ p: welt(i), haupt: i === a || i === b.i });
  return { pfad, enden, laenge: b.d * h, zelle: h };
}

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
