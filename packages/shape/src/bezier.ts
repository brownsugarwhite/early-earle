// Kubische Bézier-Mathematik in 2D: Auswerten, Teilen (De Casteljau), Länge, nächster Punkt.
// Alle Funktionen sind rein und DOM-frei; Koordinaten in Kachel-Einheiten (1 = Kachelkante).

export type V2 = { x: number; y: number };

/** Kubisches Segment: Start, zwei Kontrollpunkte, Ende (absolute Koordinaten). */
export type Kubik = readonly [V2, V2, V2, V2];

export const v2 = (x: number, y: number): V2 => ({ x, y });
export const plus = (a: V2, b: V2): V2 => ({ x: a.x + b.x, y: a.y + b.y });
export const minus = (a: V2, b: V2): V2 => ({ x: a.x - b.x, y: a.y - b.y });
export const mal = (a: V2, s: number): V2 => ({ x: a.x * s, y: a.y * s });
export const lerp = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const laengeV = (a: V2): number => Math.hypot(a.x, a.y);
export const abstand = (a: V2, b: V2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const punktprodukt = (a: V2, b: V2): number => a.x * b.x + a.y * b.y;

export function normiert(a: V2): V2 {
  const l = laengeV(a);
  return l > 1e-12 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
}

export function punktAuf(k: Kubik, t: number): V2 {
  const [p0, p1, p2, p3] = k;
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const c = 3 * s * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

export function ableitung(k: Kubik, t: number): V2 {
  const [p0, p1, p2, p3] = k;
  const s = 1 - t;
  const a = 3 * s * s;
  const b = 6 * s * t;
  const c = 3 * t * t;
  return {
    x: a * (p1.x - p0.x) + b * (p2.x - p1.x) + c * (p3.x - p2.x),
    y: a * (p1.y - p0.y) + b * (p2.y - p1.y) + c * (p3.y - p2.y),
  };
}

/** De Casteljau: teilt das Segment bei t in zwei formgleiche Segmente. */
export function teilen(k: Kubik, t: number): [Kubik, Kubik] {
  const [p0, p1, p2, p3] = k;
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  const m = lerp(d, e, t);
  return [
    [p0, a, d, m],
    [m, e, c, p3],
  ];
}

/** Gleichmäßig im Parameter abgetastet, n ≥ 1 Teilstücke (n + 1 Punkte). */
export function abtasten(k: Kubik, n: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) out.push(punktAuf(k, i / n));
  return out;
}

/** Bogenlänge per Gauß-Legendre (8 Stützstellen, für Editor-Kurven genau genug). */
const GL_T = [0.0198550717512319, 0.1016667612931866, 0.2372337950418355, 0.4082826787521751, 0.5917173212478249, 0.7627662049581645, 0.8983332387068134, 0.9801449282487681];
const GL_W = [0.0506142681451881, 0.1111905172266872, 0.1568533229389436, 0.1813418916891810, 0.1813418916891810, 0.1568533229389436, 0.1111905172266872, 0.0506142681451881];

export function bogenlaenge(k: Kubik): number {
  let s = 0;
  for (let i = 0; i < GL_T.length; i++) s += GL_W[i]! * laengeV(ableitung(k, GL_T[i]!));
  return s;
}

export type Treffer = { t: number; punkt: V2; abstand: number };

/** Nächster Punkt auf dem Segment: grobes Abtasten, dann Verfeinern per Newton auf (B(t) − p)·B'(t). */
export function naechsterAufKubik(k: Kubik, p: V2, grob = 24): Treffer {
  let bestT = 0;
  let bestD = Infinity;
  for (let i = 0; i <= grob; i++) {
    const t = i / grob;
    const d = abstand(punktAuf(k, t), p);
    if (d < bestD) {
      bestD = d;
      bestT = t;
    }
  }
  let t = bestT;
  for (let it = 0; it < 6; it++) {
    const q = minus(punktAuf(k, t), p);
    const d1 = ableitung(k, t);
    // zweite Ableitung numerisch reicht hier
    const h = 1e-4;
    const d1b = ableitung(k, Math.min(1, t + h));
    const d2 = mal(minus(d1b, d1), 1 / h);
    const f = punktprodukt(q, d1);
    const fp = punktprodukt(d1, d1) + punktprodukt(q, d2);
    if (Math.abs(fp) < 1e-12) break;
    t = Math.min(1, Math.max(0, t - f / fp));
  }
  const punkt = punktAuf(k, t);
  const d = abstand(punkt, p);
  return d <= bestD ? { t, punkt, abstand: d } : { t: bestT, punkt: punktAuf(k, bestT), abstand: bestD };
}
