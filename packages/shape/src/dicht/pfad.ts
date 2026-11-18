// Form zuerst (06.11.2026), Teil A „Linien als Bézier-Pfade“ (Florian: „Ja, fang mit A an: Linien als Bézier-Pfade mit echten
// Griffen, dann Stift P“; Plan Abschnitt 7 in docs/plans/2026-11-06-kurven-als-wahrheit.md): die Rechnung eines Bézier-Stücks, ohne
// Haut und ohne Loops.
//
// Ein Stück läuft von P0 nach P3; seine Griffe sind Vektoren vom Punkt aus, `a` an P0 nach vorn, `b` an P3 nach hinten:
// B(t) = (1 − t)³ P0 + 3(1 − t)² t (P0 + a) + 3(1 − t) t² (P3 + b) + t³ P3.

import type { V3 } from './kurven';

const plus = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const minus = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mal = (a: V3, f: number): V3 => ({ x: f * a.x, y: f * a.y, z: f * a.z });
const lerp = (a: V3, b: V3, t: number): V3 => ({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), z: a.z + t * (b.z - a.z) });
const skalar = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const laenge = (a: V3): number => Math.hypot(a.x, a.y, a.z);

/** Bernstein-Gewichte dritten Grades bei t */
export function bernstein(t: number): [number, number, number, number] {
  const u = 1 - t;
  return [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
}

/** Lage des Stücks bei t */
export function stueckPunkt(P0: V3, a: V3, b: V3, P3: V3, t: number): V3 {
  const [b0, b1, b2, b3] = bernstein(t);
  return {
    x: (b0 + b1) * P0.x + b1 * a.x + b2 * b.x + (b2 + b3) * P3.x,
    y: (b0 + b1) * P0.y + b1 * a.y + b2 * b.y + (b2 + b3) * P3.y,
    z: (b0 + b1) * P0.z + b1 * a.z + b2 * b.z + (b2 + b3) * P3.z,
  };
}

/** Erste und zweite Ableitung des Stücks bei t */
function ableitungen(P0: V3, a: V3, b: V3, P3: V3, t: number): { d1: V3; d2: V3 } {
  const C1 = plus(P0, a);
  const C2 = plus(P3, b);
  const u = 1 - t;
  const q0 = minus(C1, P0);
  const q1 = minus(C2, C1);
  const q2 = minus(P3, C2);
  const d1 = plus(plus(mal(q0, 3 * u * u), mal(q1, 6 * u * t)), mal(q2, 3 * t * t));
  const d2 = plus(mal(minus(q1, q0), 6 * u), mal(minus(q2, q1), 6 * t));
  return { d1, d2 };
}

/**
 * Stelle des Punkts auf dem Stück, der q am nächsten liegt (Newton ab t0, in [0, 1]): Wo eine Linie neben ihrem Pfad liegt, ist das
 * der Ort quer zur Linie, nicht der bei gleicher Bogenlänge (dort lag sie bis 7 Einheiten längs daneben).
 */
export function stueckNaechstes(P0: V3, a: V3, b: V3, P3: V3, q: V3, t0: number): number {
  let t = Math.max(0, Math.min(1, t0));
  for (let k = 0; k < 12; k++) {
    const r = minus(stueckPunkt(P0, a, b, P3, t), q);
    const { d1, d2 } = ableitungen(P0, a, b, P3, t);
    const f1 = skalar(d1, r);
    const n2 = skalar(d1, d1);
    const f2 = n2 + skalar(d2, r);
    const dt = (f2 > 1e-12 * Math.max(1, n2) ? f1 / f2 : f1 / (n2 || 1)) || 0;
    const neu = Math.max(0, Math.min(1, t - dt));
    if (Math.abs(neu - t) < 1e-12) return neu;
    t = neu;
  }
  return t;
}

/**
 * Das Stück bei t teilen (de Casteljau): Die beiden Hälften zusammen sind genau das alte Stück. Ergebnis: der Griff an P0 für die
 * erste Hälfte, der neue Punkt F mit seinen Griffen (`ein` zurück, `aus` nach vorn) und der Griff an P3 für die zweite.
 */
export function stueckTeilen(P0: V3, a: V3, b: V3, P3: V3, t: number): { a1: V3; F: V3; ein: V3; aus: V3; b2: V3 } {
  const C1 = plus(P0, a);
  const C2 = plus(P3, b);
  const A = lerp(P0, C1, t);
  const B = lerp(C1, C2, t);
  const C = lerp(C2, P3, t);
  const D = lerp(A, B, t);
  const E = lerp(B, C, t);
  const F = lerp(D, E, t);
  return { a1: minus(A, P0), F, ein: minus(D, F), aus: minus(E, F), b2: minus(C, P3) };
}

/**
 * Griffe eines Stücks mit festen Enden nach kleinsten Quadraten: Es soll bei den Parametern `t` durch die Lagen `q` gehen. Mit
 * `richtung` (je Griff eine Einheitsrichtung oder null) nur die Längen, nie kleiner als null (wie Illustrator beim Löschen eines
 * Punkts: Die Griffe der Nachbarn behalten ihre Richtung). Zu wenige Lagen oder ein entartetes System: ein Drittel der Sehne.
 */
export function stueckAnpassen(
  P0: V3,
  P3: V3,
  t: ArrayLike<number>,
  q: readonly V3[],
  richtung?: readonly [V3 | null, V3 | null],
): { a: V3; b: V3 } {
  const sehne = minus(P3, P0);
  const notfall = { a: mal(sehne, 1 / 3), b: mal(sehne, -1 / 3) };
  // Rest nach den Enden: q − (B0 + B1) P0 − (B2 + B3) P3 bei festen Richtungen, q − B0 P0 − B3 P3 frei
  let s11 = 0;
  let s12 = 0;
  let s22 = 0;
  for (let j = 0; j < q.length; j++) {
    const [, b1, b2] = bernstein(t[j]!);
    s11 += b1 * b1;
    s12 += b1 * b2;
    s22 += b2 * b2;
  }
  const ru = richtung?.[0] ?? null;
  const rw = richtung?.[1] ?? null;
  if (ru && rw) {
    // Längen α, β: Σ |α B1 u + β B2 w − r|²
    const uw = skalar(ru, rw);
    let r1 = 0;
    let r2 = 0;
    for (let j = 0; j < q.length; j++) {
      const [b0, b1, b2, b3] = bernstein(t[j]!);
      const r = minus(q[j]!, plus(mal(P0, b0 + b1), mal(P3, b2 + b3)));
      r1 += b1 * skalar(ru, r);
      r2 += b2 * skalar(rw, r);
    }
    const det = s11 * s22 - s12 * s12 * uw * uw;
    if (q.length < 2 || !(Math.abs(det) > 1e-12 * Math.max(1e-30, s11 * s22))) {
      const l = laenge(sehne) / 3;
      return { a: mal(ru, l), b: mal(rw, l) };
    }
    let al = (s22 * r1 - s12 * uw * r2) / det;
    let be = (s11 * r2 - s12 * uw * r1) / det;
    // eine Länge unter null: sie auf null, die andere allein
    if (al < 0 || be < 0) {
      if (al < 0) {
        al = 0;
        be = s22 > 1e-30 ? Math.max(0, r2 / s22) : 0;
      } else {
        be = 0;
        al = s11 > 1e-30 ? Math.max(0, r1 / s11) : 0;
      }
    }
    return { a: mal(ru, al), b: mal(rw, be) };
  }
  // frei: C1, C2 je Koordinate aus demselben 2 × 2-System
  const det = s11 * s22 - s12 * s12;
  if (q.length < 2 || !(Math.abs(det) > 1e-12 * Math.max(1e-30, s11 * s22))) return notfall;
  let R1 = { x: 0, y: 0, z: 0 };
  let R2 = { x: 0, y: 0, z: 0 };
  for (let j = 0; j < q.length; j++) {
    const [b0, b1, b2, b3] = bernstein(t[j]!);
    const r = minus(q[j]!, plus(mal(P0, b0), mal(P3, b3)));
    R1 = plus(R1, mal(r, b1));
    R2 = plus(R2, mal(r, b2));
  }
  const C1 = mal(minus(mal(R1, s22), mal(R2, s12)), 1 / det);
  const C2 = mal(minus(mal(R2, s11), mal(R1, s12)), 1 / det);
  return { a: minus(C1, P0), b: minus(C2, P3) };
}
