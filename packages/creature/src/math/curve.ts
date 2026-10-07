import { add, cross, dist, dot, frameFromTangent, length, normalize, scale, sub, type Vec3 } from './vec';

/**
 * Polylinien-Kurven für Ketten (Hals, Schwanz, Beine, Schlange, Rüssel): Catmull-Rom-Abtastung, Bogenlängen,
 * nächster Punkt und parallel transportierte Rahmen (für den Umfangswinkel der Wirbelsäulen-Koordinaten).
 */
export interface Polyline {
  points: Vec3[];
  /** Radius je Punkt (für Umfang und Kapseln). */
  radii: number[];
  /** Kumulierte Bogenlänge je Punkt, [0] = 0. */
  arc: number[];
  /** Gesamtlänge. */
  total: number;
  /** Tangente je Punkt (Einheit). */
  tangents: Vec3[];
  /** Parallel transportierte Normale je Punkt (Einheit, senkrecht zur Tangente); Winkel 0 = diese Richtung. */
  normals: Vec3[];
}

/** Catmull-Rom (zentripetal vereinfacht, uniform) durch Stützpunkte; `segments` Abtastungen je Abschnitt. */
export function catmullRom(ctrl: readonly Readonly<Vec3>[], segments = 4): Vec3[] {
  if (ctrl.length < 2) return ctrl.map((p) => [p[0], p[1], p[2]] as Vec3);
  const out: Vec3[] = [];
  const n = ctrl.length;
  const P = (i: number): Readonly<Vec3> => ctrl[Math.max(0, Math.min(n - 1, i))]!;
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const steps = i === n - 2 ? segments + 1 : segments;
    for (let s = 0; s < steps; s++) {
      const t = s / segments;
      const t2 = t * t, t3 = t2 * t;
      const q: Vec3 = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        q[c] = 0.5 * (2 * p1[c]! + (-p0[c]! + p2[c]!) * t + (2 * p0[c]! - 5 * p1[c]! + 4 * p2[c]! - p3[c]!) * t2 + (-p0[c]! + 3 * p1[c]! - 3 * p2[c]! + p3[c]!) * t3);
      }
      out.push(q);
    }
  }
  return out;
}

/** Baut die Polylinie mit Bogenlängen, Tangenten und parallel transportierten Normalen; `radii` wird linear mitgeführt. */
export function makePolyline(points: Vec3[], radii: number[], up: Readonly<Vec3> = [0, 1, 0]): Polyline {
  const n = points.length;
  const arc: number[] = [0];
  for (let i = 1; i < n; i++) arc.push(arc[i - 1]! + dist(points[i]!, points[i - 1]!));
  const total = arc[n - 1] ?? 0;
  const tangents: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(n - 1, i + 1)]!;
    const t = sub(b, a);
    tangents.push(length(t) > 1e-9 ? normalize(t) : [0, 0, 1]);
  }
  // Parallel transport: erster Rahmen aus bevorzugtem Oben, danach Minimaldrehung von Tangente zu Tangente.
  const normals: Vec3[] = [];
  let nrm = frameFromTangent(tangents[0]!, up).y;
  normals.push(nrm);
  for (let i = 1; i < n; i++) {
    const t0 = tangents[i - 1]!;
    const t1 = tangents[i]!;
    const axis = cross(t0, t1);
    const s = length(axis);
    const c = dot(t0, t1);
    if (s > 1e-6) {
      // Rodrigues um `axis` mit Winkel acos(c)
      const k = normalize(axis);
      const ang = Math.atan2(s, c);
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      nrm = add(add(scale(nrm, cosA), scale(cross(k, nrm), sinA)), scale(k, dot(k, nrm) * (1 - cosA)));
    }
    // Reorthogonalisieren gegen Drift
    nrm = normalize(sub(nrm, scale(t1, dot(nrm, t1))));
    normals.push(nrm);
  }
  const rr = radii.length === n ? radii.slice() : resampleRadii(radii, n);
  return { points, radii: rr, arc, total, tangents, normals };
}

function resampleRadii(radii: number[], n: number): number[] {
  if (radii.length === 0) return new Array<number>(n).fill(0.1);
  if (radii.length === 1) return new Array<number>(n).fill(radii[0]!);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (radii.length - 1);
    const j = Math.min(radii.length - 2, Math.floor(t));
    const f = t - j;
    out.push(radii[j]! * (1 - f) + radii[j + 1]! * f);
  }
  return out;
}

export interface CurveHit {
  /** Bogenlängenanteil 0…1. */
  s: number;
  point: Vec3;
  tangent: Vec3;
  normal: Vec3;
  radius: number;
  /** Winkel um die Tangente, 0 = Normale (parallel transportiert), −π…π. */
  angle: number;
  /** Abstand des Punkts zur Kurve. */
  d: number;
}

/** Nächster Punkt auf der Polylinie (Segmentprojektion) mit interpoliertem Rahmen und Radius. */
export function nearestOnPolyline(pl: Polyline, p: Readonly<Vec3>): CurveHit {
  const n = pl.points.length;
  let best = Infinity;
  let bi = 0;
  let bt = 0;
  if (n === 1) {
    bi = 0;
    bt = 0;
    best = dist(pl.points[0]!, p);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = pl.points[i]!;
    const b = pl.points[i + 1]!;
    const ab = sub(b, a);
    const l2 = dot(ab, ab) || 1e-12;
    const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
    const q = add(a, scale(ab, t));
    const d = dist(q, p);
    if (d < best) {
      best = d;
      bi = i;
      bt = t;
    }
  }
  const i1 = Math.min(n - 1, bi + 1);
  const a = pl.points[bi]!;
  const b = pl.points[i1]!;
  const point = add(a, scale(sub(b, a), bt));
  const tangent = normalize(add(scale(pl.tangents[bi]!, 1 - bt), scale(pl.tangents[i1]!, bt)));
  let normal = add(scale(pl.normals[bi]!, 1 - bt), scale(pl.normals[i1]!, bt));
  normal = normalize(sub(normal, scale(tangent, dot(normal, tangent))));
  const radius = pl.radii[bi]! * (1 - bt) + pl.radii[i1]! * bt;
  const arc = pl.arc[bi]! + (pl.arc[i1]! - pl.arc[bi]!) * bt;
  const s = pl.total > 1e-9 ? arc / pl.total : 0;
  const rel = sub(p, point);
  const bin = cross(tangent, normal);
  const angle = Math.atan2(dot(rel, bin), dot(rel, normal));
  return { s, point, tangent, normal, radius, angle, d: best };
}
