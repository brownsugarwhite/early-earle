import { clamp, lerp, rotate, smax, smin, type Quat, type Vec3 } from '../math/vec';

/**
 * Implizite Szene eines Wesens: eine Liste von Primitiven, die weich vereinigt (Körper, Hals, Kopf, Beine, Schwanz …)
 * oder weich abgezogen werden (Maulhöhle, Augenhöhlen). Jedes Primitiv kennt sein **Teil** (Knochen) für Gewichte und
 * seine **Region** (Haut, Lippe, Rachen, Höhle) für Materialmasken. Dieselbe Mathematik läuft im Renderer als TSL.
 */

export const REGION = { haut: 0, lippe: 1, rachen: 2, hoehle: 3, keratin: 4 } as const;
export type Region = (typeof REGION)[keyof typeof REGION];

interface PrimBase {
  /** Knochen-/Teilindex für Gewichte und Deskriptoren. */
  part: number;
  /** Blendradius der weichen Vereinigung bzw. Subtraktion. */
  k: number;
  region: Region;
  op: 'union' | 'subtract';
  /** Optionaler Name (Debug, Tests). */
  name?: string;
}

/** Rundkegel: Kapsel mit zwei Radien. */
export interface CapsulePrim extends PrimBase {
  kind: 'capsule';
  a: Vec3;
  b: Vec3;
  ra: number;
  rb: number;
}

/** Ellipsoid, optional gedreht und zum gerundeten Quader hin verwürfelt. */
export interface EllipsoidPrim extends PrimBase {
  kind: 'ellipsoid';
  c: Vec3;
  r: Vec3;
  q?: Quat;
  kubik?: number;
}

/**
 * Rotationskörper aus einem 2D-Profil (Polygon in der (q, y)-Ebene, q = Radialmaß ≥ 0, y = Höhe), anisotrop in x/z,
 * mit Superellipsen-Querschnitt (n = 2 rund … 8 würfelig), Scherung (Neigung) und Kantenrundung.
 */
export interface RevolvePrim extends PrimBase {
  kind: 'revolve';
  /** Geschlossenes Profilpolygon, spiegelsymmetrisch um q = 0 (volle Breite), gegen den Uhrzeigersinn. */
  profile: Array<[number, number]>;
  c: Vec3;
  sx: number;
  sz: number;
  /** Superellipsen-Exponent (2 = Kreis). */
  n: number;
  /** z-Versatz je Höheneinheit (vornüber > 0). */
  shear: number;
  round: number;
}

/** Freies Primitiv (z. B. Maulhöhle) mit eigener Abstandsfunktion und Hüllquader. */
export interface CustomPrim extends PrimBase {
  kind: 'custom';
  eval: (p: Readonly<Vec3>) => number;
  bounds: { min: Vec3; max: Vec3 };
}

export type Prim = CapsulePrim | EllipsoidPrim | RevolvePrim | CustomPrim;

export interface SdfScene {
  prims: Prim[];
}

const dot2 = (x: number, y: number, z: number): number => x * x + y * y + z * z;

/** Exakter Abstand zum Rundkegel (Quilez). */
export function sdRoundCone(p: Readonly<Vec3>, a: Readonly<Vec3>, b: Readonly<Vec3>, r1: number, r2: number): number {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  if (l2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]) - Math.max(r1, r2);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = p[0] - a[0], pay = p[1] - a[1], paz = p[2] - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const x2 = dot2(pax * l2 - bax * y, pay * l2 - bay * y, paz * l2 - baz * y);
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

/** Ellipsoid-Näherung (Quilez), im lokalen Raum. */
export function sdEllipsoidLocal(x: number, y: number, z: number, r: Readonly<Vec3>): number {
  const k0 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  const k1 = Math.hypot(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]));
  return k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
}

/** Gerundeter Quader im lokalen Raum. */
export function sdRoundBoxLocal(x: number, y: number, z: number, b: Readonly<Vec3>, round: number): number {
  const qx = Math.abs(x) - b[0], qy = Math.abs(y) - b[1], qz = Math.abs(z) - b[2];
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qy, qz), 0) - round;
}

export function sdEllipsoid(p: Readonly<Vec3>, prim: EllipsoidPrim): number {
  let x = p[0] - prim.c[0], y = p[1] - prim.c[1], z = p[2] - prim.c[2];
  if (prim.q) {
    // in den lokalen Raum drehen (inverse Rotation)
    const v = rotate([-prim.q[0], -prim.q[1], -prim.q[2], prim.q[3]], [x, y, z]);
    x = v[0];
    y = v[1];
    z = v[2];
  }
  const d = sdEllipsoidLocal(x, y, z, prim.r);
  const kubik = prim.kubik ?? 0;
  if (kubik <= 0) return d;
  const rho = 0.35 * Math.min(prim.r[0], prim.r[1], prim.r[2]);
  const b: Vec3 = [prim.r[0] - rho, prim.r[1] - rho, prim.r[2] - rho];
  return lerp(d, sdRoundBoxLocal(x, y, z, b, rho), kubik);
}

/** Vorzeichenbehafteter Abstand zum geschlossenen 2D-Polygon (Quilez), negativ innen. */
export function sdPolygon2(poly: ReadonlyArray<readonly [number, number]>, px: number, py: number): number {
  const n = poly.length;
  let d = Infinity;
  let s = 1;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [ax, ay] = poly[i]!;
    const [bx, by] = poly[j]!;
    const ex = bx - ax, ey = by - ay;
    const wx = px - ax, wy = py - ay;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-12), 0, 1);
    const bxp = wx - ex * t, byp = wy - ey * t;
    d = Math.min(d, bxp * bxp + byp * byp);
    const c1 = py >= ay, c2 = py < by, c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

export function sdRevolve(p: Readonly<Vec3>, prim: RevolvePrim): number {
  const y = p[1] - prim.c[1];
  const x = p[0] - prim.c[0];
  const z = p[2] - prim.c[2] - prim.shear * y;
  const sm = Math.sqrt(prim.sx * prim.sz);
  let q: number;
  if (prim.n <= 2.001) q = Math.hypot(x / prim.sx, z / prim.sz) * sm;
  else {
    const ax = Math.abs(x / prim.sx), az = Math.abs(z / prim.sz);
    q = Math.pow(Math.pow(ax, prim.n) + Math.pow(az, prim.n), 1 / prim.n) * sm;
  }
  return sdPolygon2(prim.profile, q, y) - prim.round;
}

export function sdPrim(p: Readonly<Vec3>, prim: Prim): number {
  switch (prim.kind) {
    case 'capsule':
      return sdRoundCone(p, prim.a, prim.b, prim.ra, prim.rb);
    case 'ellipsoid':
      return sdEllipsoid(p, prim);
    case 'revolve':
      return sdRevolve(p, prim);
    case 'custom':
      return prim.eval(p);
  }
}

/** Gesamtabstand der Szene: weiche Vereinigung aller `union`-Primitive, dann weiche Subtraktion der `subtract`. */
export function evalScene(scene: SdfScene, p: Readonly<Vec3>): number {
  let d = 1e9;
  const prims = scene.prims;
  for (let i = 0; i < prims.length; i++) {
    const pr = prims[i]!;
    if (pr.op !== 'union') continue;
    d = smin(d, sdPrim(p, pr), pr.k);
  }
  for (let i = 0; i < prims.length; i++) {
    const pr = prims[i]!;
    if (pr.op !== 'subtract') continue;
    d = smax(d, -sdPrim(p, pr), pr.k);
  }
  return d;
}

export interface SceneSample {
  d: number;
  /** Abstand der reinen Vereinigung (ohne Subtraktionen). */
  dUnion: number;
  /** Kleinster Abstand zu einer Subtraktion (negativ = innerhalb einer Höhle). */
  dSubtract: number;
  /** Index der nächsten Subtraktion oder −1. */
  nearestSubtract: number;
  /** Abstand je Primitiv (Index wie `scene.prims`). */
  per: Float64Array;
}

/** Wie `evalScene`, zusätzlich mit allen Einzelabständen (für Gewichte, Regionen, Teilzuordnung). */
export function evalSceneDetailed(scene: SdfScene, p: Readonly<Vec3>, out?: SceneSample): SceneSample {
  const prims = scene.prims;
  const per = out?.per && out.per.length === prims.length ? out.per : new Float64Array(prims.length);
  let dU = 1e9;
  let dS = 1e9;
  let nearestSubtract = -1;
  for (let i = 0; i < prims.length; i++) {
    const pr = prims[i]!;
    const di = sdPrim(p, pr);
    per[i] = di;
    if (pr.op === 'union') dU = smin(dU, di, pr.k);
    else if (di < dS) {
      dS = di;
      nearestSubtract = i;
    }
  }
  let d = dU;
  for (let i = 0; i < prims.length; i++) {
    const pr = prims[i]!;
    if (pr.op !== 'subtract') continue;
    d = smax(d, -per[i]!, pr.k);
  }
  const res = out ?? ({ d, dUnion: dU, dSubtract: dS, nearestSubtract, per } as SceneSample);
  res.d = d;
  res.dUnion = dU;
  res.dSubtract = dS;
  res.nearestSubtract = nearestSubtract;
  res.per = per;
  return res;
}

/** Gradient per zentraler Differenz (Normale = normalize(grad)). */
export function sceneGradient(scene: SdfScene, p: Readonly<Vec3>, e: number, out: Vec3): Vec3 {
  const px: Vec3 = [p[0] + e, p[1], p[2]];
  const mx: Vec3 = [p[0] - e, p[1], p[2]];
  const py: Vec3 = [p[0], p[1] + e, p[2]];
  const my: Vec3 = [p[0], p[1] - e, p[2]];
  const pz: Vec3 = [p[0], p[1], p[2] + e];
  const mz: Vec3 = [p[0], p[1], p[2] - e];
  out[0] = (evalScene(scene, px) - evalScene(scene, mx)) / (2 * e);
  out[1] = (evalScene(scene, py) - evalScene(scene, my)) / (2 * e);
  out[2] = (evalScene(scene, pz) - evalScene(scene, mz)) / (2 * e);
  return out;
}

/** Hüllquader eines Primitivs (grob, mit Blendrand). */
export function primBounds(prim: Prim): { min: Vec3; max: Vec3 } {
  switch (prim.kind) {
    case 'capsule': {
      const r = Math.max(prim.ra, prim.rb);
      return {
        min: [Math.min(prim.a[0], prim.b[0]) - r, Math.min(prim.a[1], prim.b[1]) - r, Math.min(prim.a[2], prim.b[2]) - r],
        max: [Math.max(prim.a[0], prim.b[0]) + r, Math.max(prim.a[1], prim.b[1]) + r, Math.max(prim.a[2], prim.b[2]) + r],
      };
    }
    case 'ellipsoid': {
      const r = Math.max(prim.r[0], prim.r[1], prim.r[2]);
      return { min: [prim.c[0] - r, prim.c[1] - r, prim.c[2] - r], max: [prim.c[0] + r, prim.c[1] + r, prim.c[2] + r] };
    }
    case 'revolve': {
      let qmax = 0, ymin = Infinity, ymax = -Infinity;
      for (const [q, y] of prim.profile) {
        qmax = Math.max(qmax, Math.abs(q));
        ymin = Math.min(ymin, y);
        ymax = Math.max(ymax, y);
      }
      const sm = Math.sqrt(prim.sx * prim.sz);
      const rx = (qmax / sm) * prim.sx + prim.round;
      const rz = (qmax / sm) * prim.sz + prim.round + Math.abs(prim.shear) * Math.max(Math.abs(ymin), Math.abs(ymax));
      return { min: [prim.c[0] - rx, prim.c[1] + ymin - prim.round, prim.c[2] - rz], max: [prim.c[0] + rx, prim.c[1] + ymax + prim.round, prim.c[2] + rz] };
    }
    case 'custom':
      return prim.bounds;
  }
}

/** Hüllquader der Vereinigung (Subtraktionen vergrößern nichts). */
export function sceneBounds(scene: SdfScene): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const pr of scene.prims) {
    if (pr.op !== 'union') continue;
    const b = primBounds(pr);
    for (let c = 0; c < 3; c++) {
      min[c] = Math.min(min[c]!, b.min[c]! - pr.k * 0.5);
      max[c] = Math.max(max[c]!, b.max[c]! + pr.k * 0.5);
    }
  }
  return { min, max };
}
