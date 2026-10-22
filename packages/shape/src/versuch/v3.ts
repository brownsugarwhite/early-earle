// VERSUCH (12.10.2026): kleine 3D-Vektorhilfen für Maul, Kiefer und Zähne.

import type { V3 } from './catmullClark';

export const plus3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const minus3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mal3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const punkt3 = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const kreuz3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const laenge3 = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const abstand3 = (a: V3, b: V3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const spiegelZ = (a: V3): V3 => [a[0], a[1], -a[2]];

export function normiert3(a: V3): V3 {
  const l = laenge3(a);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
}

export function mittel3(pts: readonly V3[]): V3 {
  const s: V3 = [0, 0, 0];
  for (const p of pts) {
    s[0] += p[0];
    s[1] += p[1];
    s[2] += p[2];
  }
  return mal3(s, 1 / Math.max(1, pts.length));
}

/** Länge eines Polygonzugs. */
export function zugLaenge(pts: readonly V3[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += abstand3(pts[i - 1]!, pts[i]!);
  return l;
}

/** Punkt bei Bogenlängen-Anteil s ∈ [0, 1] auf einem Polygonzug. */
export function zugPunkt(pts: readonly V3[], s: number): V3 {
  if (pts.length === 1) return [...pts[0]!] as V3;
  const ziel = Math.min(1, Math.max(0, s)) * zugLaenge(pts);
  let l = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = abstand3(pts[i - 1]!, pts[i]!);
    if (l + d >= ziel || i === pts.length - 1) return lerp3(pts[i - 1]!, pts[i]!, d > 1e-12 ? Math.min(1, (ziel - l) / d) : 0);
    l += d;
  }
  return [...pts[pts.length - 1]!] as V3;
}

/** n + 1 Punkte gleichmäßig nach Bogenlänge. */
export function zugAbtasten(pts: readonly V3[], n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) out.push(zugPunkt(pts, i / n));
  return out;
}

/** Rotation als Matrix (Zeilen) und Drehung eines Punkts. */
export type M3 = [V3, V3, V3];
export const drehe = (R: M3, p: V3): V3 => [punkt3(R[0], p), punkt3(R[1], p), punkt3(R[2], p)];

/** Drehmatrix um die Achse u (normiert) um den Winkel w (Rodrigues). */
export function achsDrehung(u: V3, w: number): M3 {
  const c = Math.cos(w);
  const s = Math.sin(w);
  const k = 1 - c;
  const [x, y, z] = u;
  return [
    [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
    [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
    [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
  ];
}
