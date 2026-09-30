import type { Vec3 } from '../capPatch';
import type { FeatureFrame } from './types';

/** Tangentialrahmen an der Einheitsrichtung `c`: Ost = wachsende Länge, Nord = Ost × Oben. */
export function frameAt(c: Vec3): FeatureFrame {
  const l = Math.hypot(c[0], c[1], c[2]) || 1;
  const cx = c[0] / l;
  const cy = c[1] / l;
  const cz = c[2] / l;
  // d/dLänge von (cos φ cos λ, sin φ, cos φ sin λ) ∝ (−z, 0, x)
  let ex = -cz;
  let ez = cx;
  let el = Math.hypot(ex, ez);
  if (el < 1e-6) {
    ex = 1;
    ez = 0;
    el = 1;
  }
  ex /= el;
  ez /= el;
  // Nord = Ost × Oben
  const nx = 0 * cz - ez * cy;
  const ny = ez * cx - ex * cz;
  const nz = ex * cy - 0 * cx;
  const nl = Math.hypot(nx, ny, nz) || 1;
  return { c: [cx, cy, cz], east: [ex, 0, ez], north: [nx / nl, ny / nl, nz / nl] };
}

/** Richtung zu einem lokalen Versatz (x Ost, y Nord, Welteinheiten) um den Rahmenmittelpunkt (gnomonisch). */
export function offsetDir(f: FeatureFrame, radius: number, x: number, y: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const px = f.c[0] * radius + f.east[0] * x + f.north[0] * y;
  const py = f.c[1] * radius + f.east[1] * x + f.north[1] * y;
  const pz = f.c[2] * radius + f.east[2] * x + f.north[2] * y;
  const l = Math.hypot(px, py, pz) || 1;
  out[0] = px / l;
  out[1] = py / l;
  out[2] = pz / l;
  return out;
}

/**
 * Lokale Koordinaten (x Ost, y Nord, Welteinheiten) einer Einheitsrichtung im Rahmen (Umkehrung von `offsetDir`).
 * Liefert false für Richtungen auf der Rückseite (Winkel ≥ 90°).
 */
export function localOf(f: FeatureFrame, radius: number, dx: number, dy: number, dz: number, out: [number, number]): boolean {
  const w = dx * f.c[0] + dy * f.c[1] + dz * f.c[2];
  if (w <= 1e-3) return false;
  const s = radius / w;
  out[0] = (dx * f.east[0] + dy * f.east[1] + dz * f.east[2]) * s;
  out[1] = (dx * f.north[0] + dy * f.north[1] + dz * f.north[2]) * s;
  return true;
}

/** Punkt im Rahmen (x, y, z über der Kugel am Mittelpunkt) → Planetenraum. */
export function framePoint(f: FeatureFrame, radius: number, x: number, y: number, z: number, out: Vec3 = [0, 0, 0]): Vec3 {
  const r = radius + z;
  out[0] = f.c[0] * r + f.east[0] * x + f.north[0] * y;
  out[1] = f.c[1] * r + f.east[1] * x + f.north[1] * y;
  out[2] = f.c[2] * r + f.east[2] * x + f.north[2] * y;
  return out;
}

/**
 * Höhe (Rahmen-z) eines Geländepunkts: Gelände in Richtung von (x, y) mit Höhe `h` über dem Grundradius, gemessen
 * längs der Rahmen-Normale. Der Rahmen ist flach, die Kugel fällt zum Rand hin ab.
 */
export function groundZ(radius: number, x: number, y: number, h: number): number {
  const cos = radius / Math.sqrt(radius * radius + x * x + y * y);
  return (radius + h) * cos - radius;
}

/**
 * Abstand² eines Punkts p zum Segment ab (3D, Sehnenraum) und Parameter t ∈ [0, 1] des nächsten Punkts. Für kurze
 * Segmente auf der Einheitskugel ist die Sehne ≈ der Bogen.
 */
export function segmentDist2(px: number, py: number, pz: number, a: Vec3, b: Vec3, out: { t: number }): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abz = b[2] - a[2];
  const apx = px - a[0];
  const apy = py - a[1];
  const apz = pz - a[2];
  const ab2 = abx * abx + aby * aby + abz * abz;
  let t = ab2 > 1e-12 ? (apx * abx + apy * aby + apz * abz) / ab2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  out.t = t;
  const dx = apx - abx * t;
  const dy = apy - aby * t;
  const dz = apz - abz * t;
  return dx * dx + dy * dy + dz * dz;
}

// --- Polygone (Grundrisse im Formationsrahmen) --------------------------------------------------------------

export type Poly = Array<[number, number]>;

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

/** Punkt in konvexem oder einfachem Polygon (Strahltest). */
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
