// Abstand von Punkten zu einer Dreiecksfläche (Viereck-Fächer), über ein gleichmäßiges Gitter der Dreiecke.
type V3 = [number, number, number];
function punktDreieck(p: V3, a: V3, b: V3, c: V3): number {
  // nach Ericson, Real-Time Collision Detection 5.1.5
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const dot = (u: number[], v: number[]) => u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  const q = (x: number[]) => Math.hypot(p[0] - x[0]!, p[1] - x[1]!, p[2] - x[2]!);
  if (d1 <= 0 && d2 <= 0) return q(a);
  const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  const d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return q(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return q([a[0] + v * ab[0]!, a[1] + v * ab[1]!, a[2] + v * ab[2]!]); }
  const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return q(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return q([a[0] + w * ac[0]!, a[1] + w * ac[1]!, a[2] + w * ac[2]!]); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return q([b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]); }
  const den = 1 / (va + vb + vc);
  const v = vb * den, w = vc * den;
  return q([a[0] + ab[0]! * v + ac[0]! * w, a[1] + ab[1]! * v + ac[1]! * w, a[2] + ab[2]! * v + ac[2]! * w]);
}
export function flaechenAbstand(punkte: readonly V3[], altPunkte: readonly V3[], altFlaechen: readonly (readonly number[])[], h = 0.01): Float64Array {
  const tris: [number, number, number][] = [];
  for (const f of altFlaechen) for (let k = 1; k + 1 < f.length; k++) tris.push([f[0]!, f[k]!, f[k + 1]!]);
  const grid = new Map<string, number[]>();
  const key = (i: number, j: number, k: number) => `${i},${j},${k}`;
  tris.forEach((t, ti) => {
    const a = altPunkte[t[0]]!, b = altPunkte[t[1]]!, c = altPunkte[t[2]]!;
    const lo = [0, 1, 2].map((d) => Math.floor(Math.min(a[d]!, b[d]!, c[d]!) / h));
    const hi = [0, 1, 2].map((d) => Math.floor(Math.max(a[d]!, b[d]!, c[d]!) / h));
    for (let i = lo[0]!; i <= hi[0]!; i++) for (let j = lo[1]!; j <= hi[1]!; j++) for (let k = lo[2]!; k <= hi[2]!; k++) {
      const s = key(i, j, k);
      const l = grid.get(s);
      if (l) l.push(ti); else grid.set(s, [ti]);
    }
  });
  const out = new Float64Array(punkte.length);
  punkte.forEach((p, pi) => {
    const ci = Math.floor(p[0] / h), cj = Math.floor(p[1] / h), ck = Math.floor(p[2] / h);
    let best = Infinity;
    for (let r = 0; r <= 3 && best > r * h; r++) {
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) for (let k = ck - r; k <= ck + r; k++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== r) continue;
        const l = grid.get(key(i, j, k));
        if (!l) continue;
        for (const ti of l) {
          const t = tris[ti]!;
          const d = punktDreieck(p, altPunkte[t[0]]!, altPunkte[t[1]]!, altPunkte[t[2]]!);
          if (d < best) best = d;
        }
      }
    }
    out[pi] = best;
  });
  return out;
}
