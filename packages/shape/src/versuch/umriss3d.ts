// VERSUCH (12.10.2026 mittags): Umriss eines Netzes in einer Ansicht. Die Dreiecke werden in ein feines Raster
// projiziert, der Rand wird verfolgt (Marching Squares). Für den Fressen-Tab: Der Körper folgt dem Kiefer, die Ansichten
// zeigen seinen geöffneten Umriss – mit der Maulöffnung als Kerbe, wie in Florians Bögen (Florian 12.10.: „Die Kiefer
// müssen wirklich mit dem Shape verbunden sein“).

import type { V2 } from '../bezier';
import type { Netz, V3 } from './catmullClark';

export type Ansicht3 = 'seite' | 'front' | 'top';

const proj = (p: V3, a: Ansicht3): V2 => (a === 'seite' ? { x: p[0], y: p[1] } : a === 'front' ? { x: p[2], y: p[1] } : { x: p[0], y: p[2] });

/**
 * Umrisslinien (geschlossene Polygonzüge in Ansichtskoordinaten) der Projektion; der längste zuerst. `zellen` = Raster
 * über die größere Ausdehnung (Genauigkeit ≈ halbe Zelle).
 */
export function umrissAusNetz(netz: Netz, ansicht: Ansicht3, zellen = 360): V2[][] {
  const pts = netz.punkte.map((p) => proj(p, ansicht));
  if (!pts.length) return [];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  const h = Math.max(x1 - x0, y1 - y0, 1e-6) / zellen;
  // zwei Zellen Rand, damit jede Linie geschlossen ist
  x0 -= 2 * h;
  y0 -= 2 * h;
  const W = Math.ceil((x1 - x0) / h) + 3;
  const H = Math.ceil((y1 - y0) / h) + 3;
  const voll = new Uint8Array(W * H);
  // Rasterpunkt (i, j) liegt bei (x0 + i·h, y0 + j·h); gefüllt, wenn er in einem projizierten Dreieck liegt
  const dreieck = (a: V2, b: V2, c: V2) => {
    const iMin = Math.max(0, Math.ceil((Math.min(a.x, b.x, c.x) - x0) / h));
    const iMax = Math.min(W - 1, Math.floor((Math.max(a.x, b.x, c.x) - x0) / h));
    const jMin = Math.max(0, Math.ceil((Math.min(a.y, b.y, c.y) - y0) / h));
    const jMax = Math.min(H - 1, Math.floor((Math.max(a.y, b.y, c.y) - y0) / h));
    const flaeche = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(flaeche) < 1e-18) return;
    const s = Math.sign(flaeche);
    for (let j = jMin; j <= jMax; j++) {
      const y = y0 + j * h;
      for (let i = iMin; i <= iMax; i++) {
        const x = x0 + i * h;
        const e0 = s * ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x));
        const e1 = s * ((c.x - b.x) * (y - b.y) - (c.y - b.y) * (x - b.x));
        const e2 = s * ((a.x - c.x) * (y - c.y) - (a.y - c.y) * (x - c.x));
        if (e0 >= -1e-12 && e1 >= -1e-12 && e2 >= -1e-12) voll[j * W + i] = 1;
      }
    }
  };
  for (const f of netz.flaechen) for (let k = 1; k + 1 < f.length; k++) dreieck(pts[f[0]!]!, pts[f[k]!]!, pts[f[k + 1]!]!);

  // Marching Squares: Kantenpunkte auf halber Strecke, Stücke über ihre Enden zu Zügen verbinden
  const schluessel = (i: number, j: number, r: 0 | 1) => (j * W + i) * 2 + r; // r = 0: waagerechte Kante (i → i+1), 1: senkrechte
  const punktVon = (k: number): V2 => {
    const r = k % 2;
    const c = (k - r) / 2;
    const i = c % W;
    const j = (c - i) / W;
    return r === 0 ? { x: x0 + (i + 0.5) * h, y: y0 + j * h } : { x: x0 + i * h, y: y0 + (j + 0.5) * h };
  };
  const nachbarn = new Map<number, number[]>();
  const verbinde = (a: number, b: number) => {
    (nachbarn.get(a) ?? nachbarn.set(a, []).get(a)!).push(b);
    (nachbarn.get(b) ?? nachbarn.set(b, []).get(b)!).push(a);
  };
  const v = (i: number, j: number) => voll[j * W + i]!;
  for (let j = 0; j + 1 < H; j++) {
    for (let i = 0; i + 1 < W; i++) {
      const fall = v(i, j) | (v(i + 1, j) << 1) | (v(i + 1, j + 1) << 2) | (v(i, j + 1) << 3);
      if (fall === 0 || fall === 15) continue;
      const u = schluessel(i, j, 0); // unten
      const o = schluessel(i, j + 1, 0); // oben
      const l = schluessel(i, j, 1); // links
      const r = schluessel(i + 1, j, 1); // rechts
      switch (fall) {
        case 1:
        case 14:
          verbinde(l, u);
          break;
        case 2:
        case 13:
          verbinde(u, r);
          break;
        case 3:
        case 12:
          verbinde(l, r);
          break;
        case 4:
        case 11:
          verbinde(r, o);
          break;
        case 6:
        case 9:
          verbinde(u, o);
          break;
        case 7:
        case 8:
          verbinde(l, o);
          break;
        case 5:
          verbinde(l, o);
          verbinde(u, r);
          break;
        case 10:
          verbinde(l, u);
          verbinde(r, o);
          break;
      }
    }
  }
  const besucht = new Set<number>();
  const zuege: V2[][] = [];
  for (const start of nachbarn.keys()) {
    if (besucht.has(start)) continue;
    const zug: V2[] = [];
    let vorher = -1;
    let jetzt = start;
    while (!besucht.has(jetzt)) {
      besucht.add(jetzt);
      zug.push(punktVon(jetzt));
      const weiter = (nachbarn.get(jetzt) ?? []).find((n) => n !== vorher && !besucht.has(n));
      if (weiter === undefined) break;
      vorher = jetzt;
      jetzt = weiter;
    }
    if (zug.length >= 8) {
      // glätten, dann auf höchstens ~400 Punkte ausdünnen (für die Anzeige reicht das)
      const g = glaetten(zug);
      const schritt = Math.max(1, Math.ceil(g.length / 400));
      zuege.push(schritt === 1 ? g : g.filter((_, i) => i % schritt === 0));
    }
  }
  return zuege.sort((a, b) => b.length - a.length);
}

/** Treppen der Rasterung glätten (zwei Mittelungen, geschlossener Zug). */
function glaetten(z: V2[]): V2[] {
  let a = z;
  for (let it = 0; it < 2; it++) {
    const n = a.length;
    a = a.map((p, i) => {
      const q = a[(i + n - 1) % n]!;
      const r = a[(i + 1) % n]!;
      return { x: (q.x + 2 * p.x + r.x) / 4, y: (q.y + 2 * p.y + r.y) / 4 };
    });
  }
  return a;
}
