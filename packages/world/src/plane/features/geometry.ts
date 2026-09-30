/**
 * Geometrie-Helfer der Geländemerkmale auf der Ebene: lokale Rahmen sind achsparallel (a = x, b = z um den
 * Mittelpunkt), Höhen sind absolute Geländehöhen (keine Kugel mehr, die zum Rand hin abfällt).
 */

export type Poly = Array<[number, number]>;

/** Mittelpunkt eines Merkmals in der Ebene. */
export interface PlaneFrame {
  cx: number;
  cz: number;
}

/** Abstand² eines Punkts (px, pz) zum Segment a→b und Parameter t ∈ [0, 1] des nächsten Punkts. */
export function segmentDist2(px: number, pz: number, ax: number, az: number, bx: number, bz: number, out: { t: number }): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const ab2 = abx * abx + abz * abz;
  let t = ab2 > 1e-12 ? (apx * abx + apz * abz) / ab2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  out.t = t;
  const dx = apx - abx * t;
  const dz = apz - abz * t;
  return dx * dx + dz * dz;
}

/** Regelmäßiges n-Eck (Radius r, Drehung rot) um (cx, cy), gegen den Uhrzeigersinn. */
export function regularPolygon(cx: number, cy: number, r: number, n: number, rot: number): Poly {
  const out: Poly = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Flächenschwerpunkt (bei entarteten Polygonen: Mittel der Ecken). */
export function centroid(poly: Poly): [number, number] {
  let a = 0;
  let x = 0;
  let y = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    const cr = p[0] * q[1] - q[0] * p[1];
    a += cr;
    x += (p[0] + q[0]) * cr;
    y += (p[1] + q[1]) * cr;
  }
  if (Math.abs(a) < 1e-9) {
    let sx = 0;
    let sy = 0;
    for (const p of poly) {
      sx += p[0];
      sy += p[1];
    }
    return [sx / Math.max(1, n), sy / Math.max(1, n)];
  }
  return [x / (3 * a), y / (3 * a)];
}

/** Fläche (positiv bei Gegen-Uhrzeigersinn). */
export function polygonArea(poly: Poly): number {
  let a = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a * 0.5;
}

/** Punkt in einfachem Polygon (Strahltest). */
export function pointInPolygon(poly: Poly, x: number, y: number): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1] || 1e-12) + a[0]) inside = !inside;
  }
  return inside;
}

/** Abstand eines Punkts zum Polygonrand (≥ 0). */
export function distanceToPolygonEdge(poly: Poly, x: number, y: number): number {
  let best = Infinity;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const l2 = abx * abx + aby * aby;
    let t = l2 > 1e-12 ? ((x - a[0]) * abx + (y - a[1]) * aby) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (a[0] + abx * t);
    const dy = y - (a[1] + aby * t);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
