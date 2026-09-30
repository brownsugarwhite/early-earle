import type { LocalGround, P2, P3, Prism, PrismCap, PrismSurface, WallSpec } from './types';

/** Shore samples of pools and islands (directions around the centre). */
export const SHORE_SAMPLES = 24;

/** Sink of every foot below the lowest ground under it (nothing floats, the terrain never shows a gap). */
export const FOOT_SINK = 0.6;

export const TAU = Math.PI * 2;

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smooth01(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Direction (unit xz) at angle `a` (from +x toward +z). */
export function dirAt(a: number): P2 {
  return [Math.cos(a), Math.sin(a)];
}

/** Irregular polygon (counter-clockwise seen from above, i.e. angle from +x toward +z … see `ccw`). */
export function blobPolygon(cx: number, cz: number, r: number, n: number, rand: () => number, wobble = 0.12, phase = rand() * TAU): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU + (rand() - 0.5) * (TAU / n) * 0.35;
    const rr = r * (1 + (rand() - 0.5) * 2 * wobble);
    out.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
  }
  return ccw(out);
}

/** Signed area in the (x, z) plane (positive = counter-clockwise with x right and z down the page, i.e. a → +z). */
export function signedArea(poly: readonly P2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a * 0.5;
}

/**
 * Orients a polygon so that its vertices run with increasing angle (from +x toward +z), which is clockwise seen from
 * above (+y) in a right-handed frame — the renderer derives the winding from the outward normals, so only the
 * consistency matters.
 */
export function ccw(poly: P2[]): P2[] {
  return signedArea(poly) < 0 ? poly.reverse() : poly;
}

export function centroid(poly: readonly P2[]): P2 {
  let x = 0;
  let z = 0;
  for (const p of poly) {
    x += p[0];
    z += p[1];
  }
  return [x / poly.length, z / poly.length];
}

/** Largest distance of a vertex from the centroid. */
export function polyRadius(poly: readonly P2[]): number {
  const [cx, cz] = centroid(poly);
  let r = 0;
  for (const p of poly) r = Math.max(r, Math.hypot(p[0] - cx, p[1] - cz));
  return r;
}

/** Scales a polygon about its centroid (and optionally shifts it). */
export function scalePoly(poly: readonly P2[], s: number, dx = 0, dz = 0): P2[] {
  const [cx, cz] = centroid(poly);
  return poly.map(([x, z]) => [cx + (x - cx) * s + dx, cz + (z - cz) * s + dz] as P2);
}

export function pointInPolygon(x: number, z: number, poly: readonly P2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from (x, z) to the polygon's boundary. */
export function distanceToEdges(x: number, z: number, poly: readonly P2[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const l2 = ex * ex + ez * ez || 1;
    const t = clamp(((x - a[0]) * ex + (z - a[1]) * ez) / l2, 0, 1);
    best = Math.min(best, Math.hypot(x - (a[0] + ex * t), z - (a[1] + ez * t)));
  }
  return best;
}

/** Lowest ground under a polygon (vertices, edge midpoints and centroid). */
export function lowestGround(poly: readonly P2[], ground: LocalGround): number {
  let lo = Infinity;
  const [cx, cz] = centroid(poly);
  lo = Math.min(lo, ground(cx, cz));
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    lo = Math.min(lo, ground(a[0], a[1]), ground((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5));
  }
  return lo;
}

/** Highest ground under a polygon. */
export function highestGround(poly: readonly P2[], ground: LocalGround): number {
  let hi = -Infinity;
  const [cx, cz] = centroid(poly);
  hi = Math.max(hi, ground(cx, cz));
  for (const p of poly) hi = Math.max(hi, ground(p[0], p[1]));
  return hi;
}

export interface PrismOptions {
  taper?: number;
  topShift?: P2;
  tilt?: P2;
  apex?: number;
  apexOffset?: P2;
  jag?: number[];
  cap?: PrismCap;
  surface?: PrismSurface;
  variant?: number;
  /** Explicit foot height (default: lowest ground under the foot − FOOT_SINK). */
  y0?: number;
}

/** A prism from a foot polygon: foot sunk under the lowest ground, top at `y1`, optional taper/tilt/apex. */
export function prism(base: P2[], y1: number, role: string, ground: LocalGround, o: PrismOptions = {}): Prism {
  const b = ccw(base);
  const top = scalePoly(b, o.taper ?? 1, o.topShift?.[0] ?? 0, o.topShift?.[1] ?? 0);
  const y0 = o.y0 ?? Math.min(lowestGround(b, ground), y1) - FOOT_SINK;
  return {
    base: b,
    top,
    y0,
    y1,
    tilt: o.tilt ?? [0, 0],
    apex: o.apex ?? 0,
    apexOffset: o.apexOffset ?? [0, 0],
    jag: o.jag ?? [],
    surface: o.surface ?? 'basalt',
    cap: o.cap ?? 'moss',
    role,
    variant: o.variant ?? 0,
  };
}

/** Top height of a prism at (x, z) (tilt included, jag and apex ignored). */
export function prismTopAt(p: Prism, x: number, z: number): number {
  const [cx, cz] = centroid(p.top);
  return p.y1 + p.tilt[0] * (x - cx) + p.tilt[1] * (z - cz);
}

/** Highest point of a prism (tilt, jag and apex included). */
export function prismPeak(p: Prism): number {
  let hi = -Infinity;
  p.top.forEach(([x, z], i) => {
    hi = Math.max(hi, prismTopAt(p, x, z) + (p.jag[i] ?? 0));
  });
  return Math.max(hi, p.y1) + p.apex;
}

/** Unit direction of a wall's foot line (from → to) and its length. */
export function wallAxis(w: WallSpec): { ux: number; uz: number; length: number } {
  const dx = w.to[0] - w.from[0];
  const dz = w.to[1] - w.from[1];
  const length = Math.hypot(dx, dz) || 1;
  return { ux: dx / length, uz: dz / length, length };
}

/**
 * A point of a tracery wall (local): `s` along the foot line, `h` above the wall's floor, `side` −1 (inner face) …
 * +1 (outer face, along `normal`); the lean shifts it outward with the height.
 */
export function wallPoint(w: WallSpec, s: number, h: number, side: number): P3 {
  const { ux, uz } = wallAxis(w);
  const off = side * w.depth * 0.5 + w.lean * h;
  return [w.from[0] + ux * s + w.normal[0] * off, w.y + h, w.from[1] + uz * s + w.normal[1] * off];
}

/** Every outline point of a wall on both faces (local) — bounds, clearance and shadow checks. */
export function wallCorners(w: WallSpec): P3[] {
  const out: P3[] = [];
  for (const [s, h] of w.outline) out.push(wallPoint(w, s, h, -1), wallPoint(w, s, h, 1));
  return out;
}

/** Rotates a local (x, z) by `yaw` (local +z → (sin yaw, cos yaw)). */
export function rotateXZ(x: number, z: number, yaw: number): P2 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x * c + z * s, -x * s + z * c];
}

export function add3(a: P3, b: P3): P3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Arc length of a polyline (xz only when `flat`). */
export function polylineLength(path: readonly P3[], flat = false): number {
  let l = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    l += flat ? Math.hypot(b[0] - a[0], b[2] - a[2]) : Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  return l;
}

/** Wobbly shore radius factor of a pool/pond in direction `a` (linear between the samples). */
export function shoreAt(shore: readonly number[], a: number): number {
  const n = shore.length;
  if (n === 0) return 1;
  let t = ((a / TAU) % 1) * n;
  if (t < 0) t += n;
  const i = Math.floor(t);
  const f = t - i;
  return lerp(shore[i % n]!, shore[(i + 1) % n]!, f);
}

/** Smooth wobbly shore factors (1st–3rd harmonics), mean 1. */
export function wobblyShore(rand: () => number, amount = 0.14, n = 24): number[] {
  const a1 = amount * (0.4 + rand() * 0.6);
  const a2 = amount * (0.3 + rand() * 0.5);
  const a3 = amount * (0.1 + rand() * 0.3);
  const p1 = rand() * TAU;
  const p2 = rand() * TAU;
  const p3 = rand() * TAU;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    out.push(1 + a1 * Math.cos(a + p1) + a2 * Math.cos(2 * a + p2) + a3 * Math.cos(3 * a + p3));
  }
  return out;
}

/** Smooth union field of circles (> 0 inside), polynomial smooth max of `r − d`. */
export function pondField(ponds: ReadonlyArray<readonly [number, number, number]>, blend: number, x: number, z: number): number {
  let f = -Infinity;
  for (const [cx, cz, r] of ponds) {
    const v = r - Math.hypot(x - cx, z - cz);
    if (f === -Infinity) {
      f = v;
      continue;
    }
    // smooth max (union)
    const h = Math.max(blend - Math.abs(f - v), 0) / blend;
    f = Math.max(f, v) + h * h * blend * 0.25;
  }
  return f;
}
